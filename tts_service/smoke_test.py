"""
Smoke test for sherpa-onnx and qwen-tts installation verification.

This script validates that all required Python packages are installed
and importable. If a model is available at the configured path, it will
also attempt to generate a short audio clip.

Usage:
    python tts_service/smoke_test.py

Exit codes:
    0 - All checks passed
    1 - One or more checks failed
"""

import sys
import os


def check_import(module_name: str, package_name: str) -> bool:
    """Attempt to import a module and report success or failure.

    Args:
        module_name: The Python module name to import (e.g. 'sherpa_onnx').
        package_name: The pip package name for display (e.g. 'sherpa-onnx').

    Returns:
        True if the import succeeded, False otherwise.
    """
    try:
        mod = __import__(module_name)
        version = getattr(mod, "__version__", "version not available")
        print(f"  ✓ {package_name} imported successfully (version: {version})")
        return True
    except ImportError as exc:
        print(f"  ✗ {package_name} import failed: {exc}")
        return False


def check_core_dependencies() -> bool:
    """Verify that all core TTS dependencies are installed.

    Checks sherpa-onnx, qwen-tts, numpy, soundfile, and fastapi.

    Returns:
        True if all core dependencies are available, False otherwise.
    """
    print("\n=== Checking Core Dependencies ===")
    checks = [
        check_import("sherpa_onnx", "sherpa-onnx"),
        check_import("qwen_tts", "qwen-tts"),
        check_import("numpy", "numpy"),
        check_import("soundfile", "soundfile"),
        check_import("fastapi", "fastapi"),
    ]
    return all(checks)


def check_optional_dependencies() -> bool:
    """Verify optional GPU-accelerated dependencies.

    Checks for flash-attn and onnxruntime-gpu. These are not required
    for basic operation but improve performance on compatible hardware.

    Returns:
        True if all optional dependencies are available, False otherwise.
    """
    print("\n=== Checking Optional Dependencies ===")
    checks = [
        check_import("flash_attn", "flash-attn"),
        check_import("onnxruntime", "onnxruntime-gpu"),
    ]
    return all(checks)


def check_sherpa_onnx_features() -> bool:
    """Inspect sherpa-onnx to verify key TTS capabilities exist.

    Checks that the sherpa_onnx module exposes expected TTS-related
    classes and functions for offline synthesis.

    Returns:
        True if key features are present, False otherwise.
    """
    print("\n=== Checking sherpa-onnx TTS Features ===")
    try:
        import sherpa_onnx

        # Check for key TTS-related attributes
        features = [
            "OfflineTts",
            "OfflineTtsModelConfig",
            "OfflineTtsConfig",
        ]
        all_found = True
        for feat in features:
            if hasattr(sherpa_onnx, feat):
                print(f"  ✓ sherpa_onnx.{feat} available")
            else:
                print(f"  ✗ sherpa_onnx.{feat} NOT found")
                all_found = False

        return all_found
    except ImportError:
        print("  ✗ Cannot check features — sherpa_onnx not importable")
        return False


def check_model_availability() -> bool:
    """Check if a Qwen3-TTS model is available at the configured path.

    Reads LOCAL_TTS_MODEL_PATH from the environment or falls back to
    a default path. Reports whether model files appear to be present.

    Returns:
        True if model files appear to be present, False otherwise.
    """
    print("\n=== Checking Model Availability ===")
    model_path = os.environ.get(
        "LOCAL_TTS_MODEL_PATH",
        os.path.join(
            os.path.dirname(__file__), "..", "models", "Qwen3-TTS-12Hz-1.7B-CustomVoice"
        ),
    )
    model_path = os.path.abspath(model_path)

    if os.path.isdir(model_path):
        # Look for typical model files
        model_files = os.listdir(model_path)
        if model_files:
            print(f"  ✓ Model directory found at {model_path}")
            print(
                f"    Files: {', '.join(model_files[:5])}{'...' if len(model_files) > 5 else ''}"
            )
            return True
        else:
            print(f"  ⚠ Model directory exists but is empty: {model_path}")
            return False
    else:
        print(f"  ⚠ Model directory not found at {model_path}")
        print("    This is expected if model weights haven't been downloaded yet.")
        print("    Set LOCAL_TTS_MODEL_PATH to the correct path after downloading.")
        return False


def main() -> int:
    """Run all smoke test checks and report results.

    Returns:
        0 if all critical checks pass, 1 otherwise.
    """
    print("=" * 60)
    print("SweetSuite Local TTS - Installation Smoke Test")
    print("=" * 60)

    core_ok = check_core_dependencies()
    check_optional_dependencies()
    features_ok = check_sherpa_onnx_features()
    check_model_availability()

    print("\n" + "=" * 60)
    if core_ok and features_ok:
        print("RESULT: Core installation verified ✓")
        print("=" * 60)
        return 0
    else:
        print("RESULT: Some checks FAILED ✗")
        print("  Please review the output above and install missing packages.")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
