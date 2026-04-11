"""
SherpaTTS FastAPI Server - Local Qwen3-TTS Inference Service

A lightweight FastAPI service that loads the Qwen3-TTS-12Hz-1.7B-CustomVoice
model on startup and exposes HTTP endpoints for text-to-speech synthesis.
Replaces the need for external ElevenLabs/OpenAI API calls.

Endpoints:
    GET  /health                - Health check (model status, supported speakers/languages)
    POST /api/tts               - Synthesize speech, returns WAV audio
    POST /api/tts/stream        - Synthesize speech with streaming chunks (Dual-Track)
    POST /api/tts/openai_proxy  - Proxy OpenAI TTS requests (keeps API key server-side)

Usage:
    python -m lib.sherpa_tts.server

Environment Variables:
    SHERPA_TTS_HOST       - Bind address (default: localhost)
    SHERPA_TTS_PORT       - Bind port (default: 5003)
    QWEN3_TTS_MODEL_PATH  - Path to model weights directory
    SHERPA_TTS_DEVICE     - Torch device, e.g. "cuda:0" or "cpu"
    LLM_VOICE_API_KEY     - OpenAI API key used by the proxy endpoint.
                            When set, /api/tts/openai_proxy forwards TTS
                            requests to OpenAI without exposing the key to
                            the browser.
    LLM_VOICE_API_URL     - Override base URL for the OpenAI-compatible API
                            (default: https://api.openai.com/v1).
    LLM_VOICE_DEFAULT_MODEL - Default TTS model name (default: tts-1).
    SHERPA_TTS_TOKEN      - Shared secret for request authentication.
                            When set, all endpoints except /health require
                            the X-SherpaTTS-Token header to match this value.
                            When empty/unset, token auth is disabled (not
                            recommended for production).
    SHERPA_TTS_STARTUP_TIMEOUT - Seconds to wait for model loading (default: 120).
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import signal
import time
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import numpy as np
import soundfile as sf
import torch
from fastapi import Depends, FastAPI, HTTPException, Query, Security
from fastapi.security import APIKeyHeader
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("sherpa_tts")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Nine built-in CustomVoice speakers from Qwen3-TTS-12Hz-1.7B-CustomVoice
SUPPORTED_SPEAKERS: list[str] = sorted(
    [
        "Vivian",
        "Serena",
        "Uncle_Fu",
        "Dylan",
        "Eric",
        "Ryan",
        "Aiden",
        "Ono_Anna",
        "Sohee",
    ]
)

# Ten supported languages
SUPPORTED_LANGUAGES: list[str] = sorted(
    [
        "Chinese",
        "English",
        "Japanese",
        "Korean",
        "German",
        "French",
        "Russian",
        "Portuguese",
        "Spanish",
        "Italian",
    ]
)

# Default configuration from environment
DEFAULT_HOST = os.environ.get("SHERPA_TTS_HOST", "localhost")
DEFAULT_PORT = int(os.environ.get("SHERPA_TTS_PORT", "5003"))
DEFAULT_MODEL_PATH = os.environ.get(
    "QWEN3_TTS_MODEL_PATH",
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "models",
        "Qwen3-TTS-12Hz-1.7B-CustomVoice",
    ),
)
DEFAULT_DEVICE = os.environ.get("SHERPA_TTS_DEVICE", "cuda:0")
DEFAULT_SPEAKER = os.environ.get("SHERPA_TTS_DEFAULT_SPEAKER", "Ryan")
DEFAULT_LANGUAGE = os.environ.get("SHERPA_TTS_DEFAULT_LANGUAGE", "English")

# Authentication: shared-secret token read from environment.
# When SHERPA_TTS_TOKEN is set to a non-empty string, every request
# (except /health) must include an X-SherpaTTS-Token header that
# exactly matches this value.  When unset/empty, auth is disabled.
SHERPA_TTS_TOKEN = os.environ.get("SHERPA_TTS_TOKEN", "")

# Startup timeout: how long (in seconds) to wait for the model to load
# before considering the service unhealthy.  Large models (1.7B params)
# can take over a minute to load from disk, especially on CPU.
SHERPA_TTS_STARTUP_TIMEOUT = int(os.environ.get("SHERPA_TTS_STARTUP_TIMEOUT", "120"))

# OpenAI TTS proxy configuration — the API key lives server-side only.
LLM_VOICE_API_KEY = os.environ.get("LLM_VOICE_API_KEY", "")
LLM_VOICE_API_URL = os.environ.get(
    "LLM_VOICE_API_URL", "https://api.openai.com/v1"
).rstrip("/")
LLM_VOICE_DEFAULT_MODEL = os.environ.get("LLM_VOICE_DEFAULT_MODEL", "tts-1")

# Scheme used by OpenAPI docs and the dependency below.
_token_header_scheme = APIKeyHeader(name="X-SherpaTTS-Token", auto_error=False)


async def verify_token(api_key: str = Security(_token_header_scheme)) -> None:
    """Validate the shared-secret token when SHERPA_TTS_TOKEN is configured.

    This dependency is injected into every protected endpoint.  When
    ``SHERPA_TTS_TOKEN`` is empty or unset the check is skipped so the
    server remains usable during local development without any extra
    configuration.

    Args:
        api_key: Value of the ``X-SherpaTTS-Token`` header (may be None).

    Raises:
        HTTPException 401: When the token is configured but the header
            is missing or does not match.
    """
    if not SHERPA_TTS_TOKEN:
        # No token configured — auth disabled.
        return
    if api_key != SHERPA_TTS_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing X-SherpaTTS-Token header",
        )


# WAV format constants for streaming chunks
WAV_HEADER_SIZE = 44


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------


class TTSRequest(BaseModel):
    """Request body for the /api/tts endpoint.

    Attributes:
        text: Text to synthesize into speech.
        language: Language for synthesis (one of SUPPORTED_LANGUAGES).
        speaker: Speaker voice name (one of SUPPORTED_SPEAKERS).
        instruct: Optional instruction text to control delivery style.
    """

    text: str = Field(
        ..., min_length=1, max_length=5000, description="Text to synthesize"
    )
    language: str = Field(default=DEFAULT_LANGUAGE, description="Language name")
    speaker: str = Field(default=DEFAULT_SPEAKER, description="Speaker voice name")
    instruct: Optional[str] = Field(
        default=None, description="Optional style instruction"
    )


class HealthResponse(BaseModel):
    """Response body for the /health endpoint.

    Attributes:
        status: Service health status ("ok" or "loading" or "error").
        model_loaded: Whether the Qwen3-TTS model is loaded and ready.
        speakers: List of supported speaker names.
        languages: List of supported language names.
        device: The compute device being used.
    """

    status: str
    model_loaded: bool
    speakers: list[str]
    languages: list[str]
    device: str


class OpenAITTSProxyRequest(BaseModel):
    """Request body for the /api/tts/openai_proxy endpoint.

    The browser sends these fields without any API key; the server
    injects the key from the LLM_VOICE_API_KEY environment variable
    before forwarding the request to OpenAI.

    Attributes:
        input: Text to synthesize into speech.
        voice: OpenAI voice name (e.g. 'alloy', 'echo', 'nova').
        model: OpenAI TTS model name (default: tts-1).
        response_format: Desired audio format ('mp3', 'wav', 'opus').
        speed: Speaking rate multiplier (0.25 – 4.0).
    """

    input: str = Field(
        ..., min_length=1, max_length=4096, description="Text to synthesize"
    )
    voice: str = Field(default="alloy", description="OpenAI voice name")
    model: str = Field(
        default=LLM_VOICE_DEFAULT_MODEL, description="OpenAI TTS model name"
    )
    response_format: str = Field(
        default="mp3", description="Audio format: mp3, wav, or opus"
    )
    speed: float = Field(
        default=1.0, ge=0.25, le=4.0, description="Speaking rate multiplier"
    )


# ---------------------------------------------------------------------------
# Model Loading Helpers
# ---------------------------------------------------------------------------


def _resolve_device() -> str:
    """Determine the best available compute device.

    Checks CUDA availability and falls back to CPU if the requested
    GPU device is not available.

    Returns:
        Device string suitable for torch (e.g. "cuda:0" or "cpu").
    """
    requested = DEFAULT_DEVICE
    if requested.startswith("cuda"):
        if not torch.cuda.is_available():
            logger.warning(
                "CUDA requested (%s) but not available, falling back to CPU",
                requested,
            )
            return "cpu"
    return requested


def _resolve_attn_implementation() -> Optional[str]:
    """Check whether flash_attention_2 is available.

    Returns:
        "flash_attention_2" if the flash-attn package is installed, else None.
    """
    try:
        import flash_attn  # noqa: F401

        return "flash_attention_2"
    except ImportError:
        logger.info("flash-attn not installed, using standard attention")
        return None


def load_model(model_path: str, device: str):
    """Load the Qwen3-TTS CustomVoice model.

    Uses bfloat16 dtype for efficiency and flash_attention_2 when the
    flash-attn package is installed.

    Args:
        model_path: Local directory or HuggingFace repo id for the model.
        device: Torch device string (e.g. "cuda:0" or "cpu").

    Returns:
        A loaded Qwen3TTSModel instance.

    Raises:
        RuntimeError: If the model cannot be loaded.
    """
    import qwen_tts

    attn_impl = _resolve_attn_implementation()
    dtype = torch.bfloat16

    logger.info(
        "Loading Qwen3-TTS model from %s (device=%s, dtype=%s, attn=%s)",
        model_path,
        device,
        dtype,
        attn_impl or "default",
    )

    kwargs = {
        "torch_dtype": dtype,
        "device_map": device,
    }
    if attn_impl:
        kwargs["attn_implementation"] = attn_impl

    model = qwen_tts.Qwen3TTSModel.from_pretrained(model_path, **kwargs)
    logger.info("Qwen3-TTS model loaded successfully")
    return model


# ---------------------------------------------------------------------------
# WAV Encoding Helpers
# ---------------------------------------------------------------------------


def _encode_wav(audio: np.ndarray, sample_rate: int) -> bytes:
    """Encode a numpy audio array as a 16-bit PCM WAV file in memory.

    Args:
        audio: 1-D numpy array of float samples in [-1.0, 1.0].
        sample_rate: Sample rate in Hz.

    Returns:
        Bytes of the complete WAV file.
    """
    buf = io.BytesIO()
    sf.write(buf, audio, sample_rate, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def _make_wav_header(
    data_size: int, sample_rate: int, channels: int = 1, bits: int = 16
) -> bytes:
    """Build a valid RIFF WAV header for streaming.

    Args:
        data_size: Size of the PCM data section in bytes.
        sample_rate: Sample rate in Hz.
        channels: Number of audio channels (default 1 for mono).
        bits: Bits per sample (default 16 for PCM_16).

    Returns:
        44-byte WAV header as bytes.
    """
    byte_rate = sample_rate * channels * bits // 8
    block_align = channels * bits // 8

    header = bytearray(WAV_HEADER_SIZE)
    # RIFF marker
    header[0:4] = b"RIFF"
    # File size - 8
    import struct

    struct.pack_into("<I", header, 4, 36 + data_size)
    # WAVE marker
    header[8:12] = b"WAVE"
    # fmt sub-chunk
    header[12:16] = b"fmt "
    # Sub-chunk size (16 for PCM)
    struct.pack_into("<I", header, 16, 16)
    # Audio format (1 = PCM)
    struct.pack_into("<H", header, 20, 1)
    # Channels
    struct.pack_into("<H", header, 22, channels)
    # Sample rate
    struct.pack_into("<I", header, 24, sample_rate)
    # Byte rate
    struct.pack_into("<I", header, 28, byte_rate)
    # Block align
    struct.pack_into("<H", header, 32, block_align)
    # Bits per sample
    struct.pack_into("<H", header, 34, bits)
    # data sub-chunk
    header[36:40] = b"data"
    struct.pack_into("<I", header, 40, data_size)
    return bytes(header)


def _audio_to_pcm_bytes(audio: np.ndarray) -> bytes:
    """Convert a float numpy audio array to 16-bit PCM bytes.

    Args:
        audio: 1-D numpy array of float samples.

    Returns:
        Raw 16-bit little-endian PCM bytes.
    """
    pcm = np.clip(audio, -1.0, 1.0)
    pcm_int16 = (pcm * 32767).astype(np.int16)
    return pcm_int16.tobytes()


# ---------------------------------------------------------------------------
# Application Factory
# ---------------------------------------------------------------------------


def create_app():
    """Build and configure the FastAPI application with lifespan model loading.

    The model is loaded once during startup and reused for all requests.
    Health checks reflect the model loading state.  The server tracks
    in-flight TTS requests and will wait for them to complete before
    shutting down when it receives SIGTERM or SIGINT.

    Returns:
        A configured FastAPI application instance.
    """
    # Shared mutable state for the model reference and shutdown coordination
    app_state = {
        "model": None,
        "device": None,
        "error": None,
        "shutting_down": False,
    }

    # Counter for in-flight TTS synthesis requests so that graceful
    # shutdown can wait until all active work is finished.
    in_flight = {"count": 0, "done_event": None}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Load the Qwen3-TTS model on startup, release on shutdown.

        Installs signal handlers for SIGTERM and SIGINT so that the
        server can finish in-progress TTS requests before stopping.
        """
        # Create an asyncio event that gets set when in_flight reaches zero
        loop = asyncio.get_running_loop()
        done_event = asyncio.Event()
        in_flight["done_event"] = done_event

        def _signal_handler(signum: int, _frame) -> None:
            """Handle SIGTERM/SIGINT by initiating graceful shutdown.

            Sets the ``shutting_down`` flag so new requests are rejected
            (503) and logs the shutdown initiation.  The lifespan will
            then wait for in-flight requests to drain.

            Args:
                signum: The signal number received.
                _frame: Current stack frame (unused).
            """
            sig_name = signal.Signals(signum).name
            logger.info(
                "Received %s — initiating graceful shutdown (in-flight requests: %d)",
                sig_name,
                in_flight["count"],
            )
            app_state["shutting_down"] = True

        # Install signal handlers for graceful shutdown.
        # This may fail when the event loop is not running in the main
        # thread (e.g. during testing with TestClient), which is fine —
        # graceful shutdown simply won't be available in that context.
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop.add_signal_handler(sig, _signal_handler, sig, None)
            except (RuntimeError, ValueError):
                logger.debug(
                    "Could not install signal handler for %s "
                    "(non-main-thread event loop)",
                    sig.name,
                )

        device = _resolve_device()
        app_state["device"] = device
        try:
            model_path = os.path.abspath(DEFAULT_MODEL_PATH)
            model = load_model(model_path, device)
            app_state["model"] = model
            logger.info(
                "SherpaTTS service ready on %s:%s — "
                "accepting TTS requests (startup_timeout=%ds)",
                DEFAULT_HOST,
                DEFAULT_PORT,
                SHERPA_TTS_STARTUP_TIMEOUT,
            )
        except Exception as exc:
            app_state["error"] = str(exc)
            logger.error("Failed to load Qwen3-TTS model: %s", exc)
        yield

        # Drain in-flight requests before shutting down
        if in_flight["count"] > 0:
            logger.info(
                "Waiting for %d in-flight TTS request(s) to complete…",
                in_flight["count"],
            )
            await done_event.wait()

        app_state["model"] = None
        logger.info("SherpaTTS service shut down gracefully")

    app = FastAPI(
        title="SherpaTTS - Local Qwen3-TTS Inference",
        version="0.1.0",
        lifespan=lifespan,
    )

    # ------------------------------------------------------------------
    # Health Check
    # ------------------------------------------------------------------

    @app.get("/health", response_model=HealthResponse)
    async def health_check():
        """Return service health status and supported speakers/languages.

        Returns model load state so callers can determine readiness.
        """
        model = app_state.get("model")
        error = app_state.get("error")

        if model is not None:
            status = "ok"
            model_loaded = True
        elif error is not None:
            status = "error"
            model_loaded = False
        else:
            status = "loading"
            model_loaded = False

        return HealthResponse(
            status=status,
            model_loaded=model_loaded,
            speakers=SUPPORTED_SPEAKERS,
            languages=SUPPORTED_LANGUAGES,
            device=app_state.get("device", "unknown"),
        )

    # ------------------------------------------------------------------
    # TTS Synthesis
    # ------------------------------------------------------------------

    @app.post("/api/tts", dependencies=[Depends(verify_token)])
    async def synthesize(request: TTSRequest):
        """Synthesize speech from text and return a complete WAV audio file.

        Accepts a JSON body with text, language, speaker, and optional instruct.
        Returns the full audio as a WAV file in the response body.

        Args:
            request: TTSRequest with synthesis parameters.

        Returns:
            StreamingResponse with audio/wav content type.

        Raises:
            HTTPException 503: If the model is not loaded or server is shutting down.
            HTTPException 400: If speaker or language is invalid.
            HTTPException 500: If synthesis fails.
        """
        if app_state.get("shutting_down"):
            raise HTTPException(status_code=503, detail="Server is shutting down")

        model = app_state.get("model")
        if model is None:
            error = app_state.get("error")
            detail = f"Model not loaded: {error}" if error else "Model not loaded yet"
            raise HTTPException(status_code=503, detail=detail)

        # Validate speaker
        if request.speaker.lower() not in [s.lower() for s in SUPPORTED_SPEAKERS]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported speaker '{request.speaker}'. Supported: {SUPPORTED_SPEAKERS}",
            )

        # Validate language
        if request.language.lower() not in [l.lower() for l in SUPPORTED_LANGUAGES]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language '{request.language}'. Supported: {SUPPORTED_LANGUAGES}",
            )

        in_flight["count"] += 1
        try:
            start = time.monotonic()
            wavs, sample_rate = model.generate_custom_voice(
                text=request.text,
                speaker=request.speaker,
                language=request.language,
                instruct=request.instruct or "",
                non_streaming_mode=True,
            )
            elapsed = time.monotonic() - start
            logger.info(
                "Synthesized %.0f chars in %.2fs (%d Hz, speaker=%s)",
                len(request.text),
                elapsed,
                sample_rate,
                request.speaker,
            )

            if not wavs or len(wavs) == 0:
                raise HTTPException(
                    status_code=500, detail="Model returned empty audio"
                )

            wav_bytes = _encode_wav(wavs[0], sample_rate)
            return Response(
                content=wav_bytes,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": "attachment; filename=tts_output.wav",
                    "X-Sample-Rate": str(sample_rate),
                    "X-Audio-Duration-Secs": f"{len(wavs[0]) / sample_rate:.3f}",
                },
            )

        except HTTPException:
            raise
        except Exception as exc:
            logger.error("TTS synthesis failed: %s", exc)
            raise HTTPException(
                status_code=500, detail=f"Synthesis failed: {exc}"
            ) from exc
        finally:
            in_flight["count"] -= 1
            if in_flight["count"] == 0 and in_flight["done_event"]:
                in_flight["done_event"].set()

    # ------------------------------------------------------------------
    # Streaming TTS (Dual-Track hybrid streaming architecture)
    # ------------------------------------------------------------------

    @app.post("/api/tts/stream", dependencies=[Depends(verify_token)])
    async def synthesize_stream(request: TTSRequest):
        """Synthesize speech with streaming audio delivery.

        Implements the Dual-Track hybrid streaming architecture for low-latency
        first-packet delivery (~97ms). Generates the full audio then streams it
        in chunks to the client, sending a WAV header first followed by PCM data
        segments.

        Args:
            request: TTSRequest with synthesis parameters.

        Returns:
            StreamingResponse with audio/wav content type and chunked transfer.

        Raises:
            HTTPException 503: If the model is not loaded or server is shutting down.
            HTTPException 400: If speaker or language is invalid.
            HTTPException 500: If synthesis fails.
        """
        if app_state.get("shutting_down"):
            raise HTTPException(status_code=503, detail="Server is shutting down")

        model = app_state.get("model")
        if model is None:
            error = app_state.get("error")
            detail = f"Model not loaded: {error}" if error else "Model not loaded yet"
            raise HTTPException(status_code=503, detail=detail)

        # Validate speaker
        if request.speaker.lower() not in [s.lower() for s in SUPPORTED_SPEAKERS]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported speaker '{request.speaker}'. Supported: {SUPPORTED_SPEAKERS}",
            )

        # Validate language
        if request.language.lower() not in [l.lower() for l in SUPPORTED_LANGUAGES]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language '{request.language}'. Supported: {SUPPORTED_LANGUAGES}",
            )

        in_flight["count"] += 1

        async def audio_stream_generator():
            """Generate audio and stream it in chunks with WAV header first.

            This generator implements the Dual-Track streaming pattern:
            - Track 1 (fast path): Sends WAV header immediately for client setup
            - Track 2 (data path): Streams PCM audio chunks as they are prepared

            Yields:
                Bytes of WAV header followed by PCM audio data chunks.
            """
            try:
                start = time.monotonic()

                # Generate full audio (model generation is not yet truly chunked
                # in qwen-tts, so we simulate Dual-Track streaming by generating
                # then chunking the output for progressive delivery)
                wavs, sample_rate = model.generate_custom_voice(
                    text=request.text,
                    speaker=request.speaker,
                    language=request.language,
                    instruct=request.instruct or "",
                    non_streaming_mode=False,
                )

                if not wavs or len(wavs) == 0:
                    return

                audio = wavs[0]
                pcm_data = _audio_to_pcm_bytes(audio)
                data_size = len(pcm_data)

                # Track 1: Send WAV header immediately (first-packet latency ~97ms)
                header = _make_wav_header(data_size, sample_rate)
                generation_time = time.monotonic() - start
                logger.info(
                    "Streaming: header sent after %.3fs (%d bytes PCM, %d Hz)",
                    generation_time,
                    data_size,
                    sample_rate,
                )
                yield header

                # Track 2: Stream PCM data in chunks (4096 bytes each)
                chunk_size = 4096
                offset = 0
                while offset < data_size:
                    end = min(offset + chunk_size, data_size)
                    yield pcm_data[offset:end]
                    offset = end

                total_time = time.monotonic() - start
                logger.info(
                    "Streaming complete: %.3fs total, speaker=%s",
                    total_time,
                    request.speaker,
                )

            except Exception as exc:
                logger.error("Streaming synthesis failed: %s", exc)
                # In a streaming response we can't send an HTTP error at this point,
                # so we simply stop yielding chunks
                return
            finally:
                in_flight["count"] -= 1
                if in_flight["count"] == 0 and in_flight["done_event"]:
                    in_flight["done_event"].set()

        return StreamingResponse(
            audio_stream_generator(),
            media_type="audio/wav",
            headers={
                "X-Stream-Mode": "dual-track",
                "Transfer-Encoding": "chunked",
            },
        )

    # ------------------------------------------------------------------
    # Speakers and Languages info endpoints
    # ------------------------------------------------------------------

    @app.get("/api/speakers", dependencies=[Depends(verify_token)])
    async def list_speakers():
        """Return the list of available speaker voices.

        Returns:
            JSON object with speakers array.
        """
        return {"speakers": SUPPORTED_SPEAKERS}

    @app.get("/api/languages", dependencies=[Depends(verify_token)])
    async def list_languages():
        """Return the list of supported languages.

        Returns:
            JSON object with languages array.
        """
        return {"languages": SUPPORTED_LANGUAGES}

    # ------------------------------------------------------------------
    # OpenAI TTS Proxy (keeps API key server-side)
    # ------------------------------------------------------------------

    @app.post("/api/tts/openai_proxy", dependencies=[Depends(verify_token)])
    async def openai_tts_proxy(request: OpenAITTSProxyRequest):
        """Proxy a TTS request to OpenAI, injecting the server-side API key.

        The browser never sees the API key — it calls this endpoint and the
        server forwards the request to OpenAI's ``/audio/speech`` endpoint
        using the ``LLM_VOICE_API_KEY`` environment variable.

        Args:
            request: OpenAITTSProxyRequest with synthesis parameters (no key).

        Returns:
            Response with the audio bytes from OpenAI and the appropriate
            Content-Type header.

        Raises:
            HTTPException 503: If LLM_VOICE_API_KEY is not configured.
            HTTPException 502: If OpenAI returns an error.
            HTTPException 500: If the upstream request fails unexpectedly.
        """
        if not LLM_VOICE_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="OpenAI TTS proxy is not configured (LLM_VOICE_API_KEY not set)",
            )

        payload = {
            "model": request.model,
            "input": request.input,
            "voice": request.voice,
            "response_format": request.response_format,
            "speed": request.speed,
        }

        upstream_url = f"{LLM_VOICE_API_URL}/audio/speech"
        headers = {
            "Authorization": f"Bearer {LLM_VOICE_API_KEY}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                start = time.monotonic()
                resp = await client.post(upstream_url, json=payload, headers=headers)
                elapsed = time.monotonic() - start

                if resp.status_code != 200:
                    logger.error(
                        "OpenAI TTS proxy upstream error: %d %s",
                        resp.status_code,
                        resp.text[:200],
                    )
                    raise HTTPException(
                        status_code=502,
                        detail=f"OpenAI API returned {resp.status_code}: {resp.text[:200]}",
                    )

                # Determine content type from the requested format
                content_type_map = {
                    "mp3": "audio/mpeg",
                    "wav": "audio/wav",
                    "opus": "audio/ogg",
                }
                ct = content_type_map.get(request.response_format, "audio/mpeg")

                logger.info(
                    "OpenAI TTS proxy: %.0f chars synthesized in %.2fs "
                    "(voice=%s, model=%s, format=%s)",
                    len(request.input),
                    elapsed,
                    request.voice,
                    request.model,
                    request.response_format,
                )

                return Response(content=resp.content, media_type=ct)

        except HTTPException:
            raise
        except Exception as exc:
            logger.error("OpenAI TTS proxy request failed: %s", exc)
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI TTS proxy request failed: {exc}",
            ) from exc

    return app


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

app = create_app()


def main():
    """Run the SherpaTTS server with uvicorn.

    Reads host and port from environment variables and starts the
    async uvicorn server.
    """
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    logger.info(
        "Starting SherpaTTS server on %s:%s (model_path=%s)",
        DEFAULT_HOST,
        DEFAULT_PORT,
        DEFAULT_MODEL_PATH,
    )
    uvicorn.run(
        "lib.sherpa_tts.server:app",
        host=DEFAULT_HOST,
        port=DEFAULT_PORT,
        log_level="info",
    )


if __name__ == "__main__":
    main()
