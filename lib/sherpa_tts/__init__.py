"""
SherpaTTS - Local Qwen3-TTS Inference Service

Provides a FastAPI-based HTTP API for text-to-speech synthesis using the
Qwen3-TTS-12Hz-1.7B-CustomVoice model. Runs fully offline with no external
API dependencies.

Usage:
    python -m lib.sherpa_tts.server

Environment Variables:
    SHERPA_TTS_HOST: Bind address (default: localhost)
    SHERPA_TTS_PORT: Bind port (default: 5003)
    QWEN3_TTS_MODEL_PATH: Path to model weights (default: ./models/Qwen3-TTS-12Hz-1.7B-CustomVoice)
    SHERPA_TTS_DEVICE: Torch device string (default: cuda:0, falls back to cpu)
    SHERPA_TTS_TOKEN: Shared-secret for request authentication. When set,
        all endpoints except /health require an X-SherpaTTS-Token header
        that matches this value. Leave empty to disable auth.
"""

__version__ = "0.1.0"
