"""
Tests for the local TTS smoke test and package installation verification.

These tests validate that sherpa-onnx and qwen-tts are properly installed
and that the smoke test script functions correctly.
"""

import subprocess
import sys
import os

import pytest


def _run_smoke_test():
    """Helper to run the smoke test script and return the CompletedProcess."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return subprocess.run(
        [sys.executable, "tts_service/smoke_test.py"],
        capture_output=True,
        text=True,
        cwd=project_root,
        timeout=60,
    )


class TestCoreDependencies:
    """Verify that core TTS Python packages are importable."""

    def test_sherpa_onnx_importable(self):
        """sherpa_onnx should be importable and expose TTS classes."""
        import sherpa_onnx

        assert hasattr(sherpa_onnx, "__version__")
        assert hasattr(sherpa_onnx, "OfflineTts")
        assert hasattr(sherpa_onnx, "OfflineTtsModelConfig")
        assert hasattr(sherpa_onnx, "OfflineTtsConfig")

    def test_qwen_tts_importable(self):
        """qwen_tts should be importable and expose model classes."""
        import qwen_tts

        assert hasattr(qwen_tts, "Qwen3TTSModel")
        assert hasattr(qwen_tts, "Qwen3TTSTokenizer")

    def test_numpy_importable(self):
        """numpy should be importable for audio array operations."""
        import numpy

        assert hasattr(numpy, "__version__")

    def test_soundfile_importable(self):
        """soundfile should be importable for WAV file I/O."""
        import soundfile

        assert hasattr(soundfile, "__version__")

    def test_fastapi_importable(self):
        """fastapi should be importable for the TTS service endpoint."""
        import fastapi

        assert hasattr(fastapi, "__version__")


class TestOptionalDependencies:
    """Verify optional GPU-accelerated packages (informational, not required)."""

    def test_onnxruntime_importable(self):
        """onnxruntime should be available (pulled in by qwen-tts)."""
        import onnxruntime

        assert hasattr(onnxruntime, "__version__")


class TestSmokeTestScript:
    """Verify that the smoke_test.py script runs and exits correctly."""

    def test_smoke_test_exits_zero(self):
        """The smoke test script should exit with code 0 when deps are installed."""
        result = _run_smoke_test()
        assert result.returncode == 0, (
            f"Smoke test failed with exit code {result.returncode}.\n"
            f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
        assert "Core installation verified" in result.stdout

    def test_smoke_test_checks_sherpa_onnx(self):
        """Smoke test output should confirm sherpa-onnx is importable."""
        result = _run_smoke_test()
        assert "sherpa-onnx imported successfully" in result.stdout

    def test_smoke_test_checks_qwen_tts(self):
        """Smoke test output should confirm qwen-tts is importable."""
        result = _run_smoke_test()
        assert "qwen-tts imported successfully" in result.stdout
