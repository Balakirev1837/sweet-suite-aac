# Local TTS Setup Guide

## Overview

SweetSuite supports local text-to-speech using [Qwen3-TTS](https://huggingface.co/collections/Qwen/qwen3-tts-67f70565f5e6f23d9bb29a6d) models running through [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx). This provides fully offline, privacy-preserving voice synthesis — critical for AAC users who need reliable communication without internet dependency.

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **GPU** | CUDA-compatible with bfloat16 support (e.g., RTX 3060) | RTX 4070 or better |
| **VRAM** | ~4 GB (for 1.7B model, fp16) | 8 GB+ (for comfortable headroom) |
| **RAM** | 8 GB | 16 GB+ |
| **Disk** | ~4 GB for model weights | SSD recommended |

> **Note:** CPU-only inference is possible but significantly slower and not recommended for real-time AAC use.

## Conda Environment Setup (Python 3.12 recommended)

```bash
# Create and activate the environment
conda create -n sweetsuite-tts python=3.12 -y
conda activate sweetsuite-tts

# Install core TTS dependencies
pip install -r requirements.txt

# (Optional) Install GPU-accelerated dependencies
pip install -r requirements-optional.txt
```

## Verifying Installation

Run the smoke test to verify sherpa-onnx and qwen-tts are installed correctly:

```bash
python tts_service/smoke_test.py
```

This will check that all required packages are importable and, if a model is available, generate a short test audio clip.

## Environment Variables

Add these to your `.env` file (see `.env.example` for reference):

```
# Local TTS Configuration
LOCAL_TTS_ENABLED=true
LOCAL_TTS_MODEL_PATH=./models/Qwen3-TTS-12Hz-1.7B-CustomVoice
LOCAL_TTS_DEVICE=cuda                    # "cuda" for GPU, "cpu" for CPU fallback
LOCAL_TTS_HOST=0.0.0.0
LOCAL_TTS_PORT=5002
```

## Model Weights

Model weights need to be downloaded separately (see the model download task). Place them in the directory specified by `LOCAL_TTS_MODEL_PATH`.

## Architecture

```
User text input
    → FastAPI service (tts_service/)
        → Qwen3-TTS model generates speech tokens
        → sherpa-onnx synthesizes audio waveform
    → WAV/PCM audio response
```

The local TTS service exposes the same `/api/tts` endpoint format that the existing `OpensourceAdapter` in `lib/llm_voice/opensource_adapter.rb` expects, so switching to local TTS requires only changing the `OPENSOURCE_TTS_BASE_URL` environment variable.

## Troubleshooting

### CUDA out of memory
- Try reducing batch size or using fp16/bf16 precision
- Ensure no other GPU processes are running (`nvidia-smi`)
- Consider using the smaller model variant if available

### flash-attn installation fails
- Ensure CUDA toolkit is installed and `nvcc` is on PATH
- flash-attn is optional; the system falls back to standard attention
- Check compatibility: flash-attn requires compute capability >= 8.0 (Ampere+)

### sherpa-onnx import error
- Verify installation: `python -c "import sherpa_onnx; print(sherpa_onnx.__version__)"`
- On some systems you may need `sherpa-onnx` built from source for GPU support
