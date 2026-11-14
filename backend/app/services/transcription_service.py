import json
import logging
from pathlib import Path
from typing import Dict, Any, Callable, Optional

from app.config import MODELS_DIR, TRANSCRIPTS_DIR

logger = logging.getLogger(__name__)

# Cache model instances in memory
_LOADED_MODELS: Dict[str, Any] = {}

def get_whisper_model(model_size: str = "tiny"):
    from faster_whisper import WhisperModel
    global _LOADED_MODELS
    if model_size not in _LOADED_MODELS:
        logger.info(f"Loading faster-whisper model '{model_size}' with multithreading...")
        import os
        cpu_count = os.cpu_count() or 4
        _LOADED_MODELS[model_size] = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8",
            download_root=str(MODELS_DIR),
            cpu_threads=cpu_count,
            num_workers=2
        )
    return _LOADED_MODELS[model_size]

def transcribe_audio_file(
    audio_path: Path,
    model_size: str = "tiny",
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Dict[str, Any]:
    """
    Transcribes audio into structured JSON with word-level timestamps.
    Optimized for high-speed CPU inference with greedy search (beam_size=1) and VAD filtering.
    """
    if progress_callback:
        progress_callback(5, f"Initializing {model_size} faster-whisper model...")

    model = get_whisper_model(model_size)

    if progress_callback:
        progress_callback(15, "Transcribing speech & detecting voice timestamps...")

    # Fast greedy search (beam_size=1) + VAD silence skipping: 3x-4x faster than beam_size=5
    segments_gen, info = model.transcribe(
        str(audio_path),
        beam_size=1,
        best_of=1,
        temperature=0.0,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    total_duration = info.duration if info.duration and info.duration > 0 else 1.0
    segments_list = []

    for i, seg in enumerate(segments_gen):
        seg_data = {
            "id": i,
            "seek": seg.seek,
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg.text.strip(),
            "words": [
                {
                    "word": w.word.strip(),
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "probability": round(w.probability, 3)
                }
                for w in (seg.words or [])
            ]
        }
        segments_list.append(seg_data)

        if progress_callback:
            pct = 15 + int((seg.end / total_duration) * 80)
            pct = min(95, max(15, pct))
            progress_callback(pct, f"Transcribing ({int(seg.end)}s / {int(total_duration)}s)...")

    result = {
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration": round(info.duration, 3),
        "total_segments": len(segments_list),
        "segments": segments_list
    }

    if progress_callback:
        progress_callback(100, "Transcription completed!")

    return result
