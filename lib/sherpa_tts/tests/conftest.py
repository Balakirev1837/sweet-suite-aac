"""
Shared fixtures for SherpaTTS integration tests.

Provides TestClient instances with a mocked TTS model injected through
the application lifespan, enabling full HTTP-level integration testing
without a real GPU or model weights.
"""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# Ensure project root is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

#: Sample rate used by the fake TTS model.
FAKE_SAMPLE_RATE: int = 24000


def _make_fake_audio(
    duration_sec: float = 1.0,
    sample_rate: int = FAKE_SAMPLE_RATE,
    seed: int = 42,
) -> np.ndarray:
    """Generate a deterministic fake audio signal for testing.

    Args:
        duration_sec: Length of audio in seconds.
        sample_rate: Samples per second.
        seed: Random seed for reproducibility.

    Returns:
        1-D float32 numpy array of audio samples.
    """
    rng = np.random.RandomState(seed)
    n = int(duration_sec * sample_rate)
    return rng.uniform(-0.5, 0.5, n).astype(np.float32)


@pytest.fixture()
def fake_audio() -> np.ndarray:
    """Return a deterministic 1-second fake audio array at 24 kHz."""
    return _make_fake_audio()


@pytest.fixture()
def mock_model(fake_audio: np.ndarray) -> MagicMock:
    """Create a MagicMock TTS model that returns fake audio.

    The mock's ``generate_custom_voice`` method returns a tuple of
    ``(list[audio_array], sample_rate)`` matching the real model API.

    Returns:
        Configured MagicMock instance.
    """
    model = MagicMock()
    model.generate_custom_voice.return_value = ([fake_audio], FAKE_SAMPLE_RATE)
    return model


@pytest.fixture()
def client_with_model(mock_model: MagicMock):
    """Provide a TestClient with the mocked model loaded via lifespan.

    Patches ``lib.sherpa_tts.server.load_model`` so that the application
    lifespan injects *mock_model* instead of loading real Qwen3-TTS weights.
    All endpoints behave as if the model is ready.

    Yields:
        Tuple of ``(TestClient, mock_model)`` so tests can assert on
        call arguments.
    """
    from fastapi.testclient import TestClient

    with patch("lib.sherpa_tts.server.load_model", return_value=mock_model):
        from lib.sherpa_tts.server import create_app

        app = create_app()
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c, mock_model
