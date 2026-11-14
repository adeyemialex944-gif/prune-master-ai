import json
import logging
import os
import re
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable

from app.config import FFMPEG_BIN, TEMP_DIR, CLIPS_DIR
from app.services.face_tracker_service import analyze_speaker_face_tracking

logger = logging.getLogger(__name__)

RESOLUTIONS_BY_ASPECT = {
    "9:16": {
        "4k": {"width": 2160, "height": 3840, "fontsize": 136, "margin_v": 720},
        "1080p": {"width": 1080, "height": 1920, "fontsize": 68, "margin_v": 360},
        "720p": {"width": 720, "height": 1280, "fontsize": 46, "margin_v": 240},
        "480p": {"width": 480, "height": 854, "fontsize": 32, "margin_v": 160}
    },
    "16:9": {
        "4k": {"width": 3840, "height": 2160, "fontsize": 108, "margin_v": 200},
        "1080p": {"width": 1920, "height": 1080, "fontsize": 54, "margin_v": 100},
        "720p": {"width": 1280, "height": 720, "fontsize": 38, "margin_v": 70},
        "480p": {"width": 854, "height": 480, "fontsize": 26, "margin_v": 45}
    },
    "1:1": {
        "4k": {"width": 2160, "height": 2160, "fontsize": 116, "margin_v": 320},
        "1080p": {"width": 1080, "height": 1080, "fontsize": 58, "margin_v": 160},
        "720p": {"width": 720, "height": 720, "fontsize": 40, "margin_v": 110},
        "480p": {"width": 480, "height": 480, "fontsize": 28, "margin_v": 75}
    }
}

RESOLUTIONS = RESOLUTIONS_BY_ASPECT["9:16"]

def get_resolution_config(resolution: str = "1080p", aspect_ratio: str = "9:16") -> dict:
    if "16:9" in str(aspect_ratio):
        aspect = "16:9"
    elif "1:1" in str(aspect_ratio):
        aspect = "1:1"
    else:
        aspect = "9:16"
    res_dict = RESOLUTIONS_BY_ASPECT.get(aspect, RESOLUTIONS_BY_ASPECT["9:16"])
    return res_dict.get(resolution.lower(), res_dict["1080p"])

def format_ass_time(seconds: float) -> str:
    """
    Formats seconds into ASS format: H:MM:SS.cc (centiseconds)
    """
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        centis = 99
    return f"{hrs}:{mins:02d}:{secs:02d}.{centis:02d}"

def generate_ass_subtitle_file(
    transcript: Dict[str, Any],
    clip_start: float,
    clip_end: float,
    output_ass_path: Path,
    style_name: str = "default",
    resolution: str = "1080p",
    aspect_ratio: str = "9:16",
    text_position: str = "center",
    font_size_scale: float = 1.0,
    custom_overlays: Optional[List[Dict[str, Any]]] = None,
    edited_segments: Optional[List[Dict[str, Any]]] = None,
    watermark: bool = False,
    watermark_text: str = "ClipMaster AI"
) -> bool:
    """
    Generates an Advanced SubStation Alpha (.ass) subtitle file specifically styled
    for vertical 9:16 reels or widescreen 16:9 videos.
    Supports adjustable vertical positioning, scalable font sizing, segment erasure,
    and custom text overlays placed or burned into the video.
    """
    res_cfg = get_resolution_config(resolution, aspect_ratio)
    play_res_x = res_cfg["width"]
    play_res_y = res_cfg["height"]
    font_size = res_cfg["fontsize"]
    margin_v = res_cfg["margin_v"]

    # Use edited segments if provided by the user, otherwise raw transcript segments
    raw_segments = edited_segments if edited_segments is not None else transcript.get("segments", [])

    # Filter out erased segments (allowing users to erase words/segments from burned video)
    segments = [
        seg for seg in raw_segments
        if not seg.get("erased", False) and str(seg.get("text", "")).strip() != ""
    ]
    
    # 1. Extract all words falling inside the clip window
    clip_words = []
    clip_dur = max(0.1, clip_end - clip_start)

    for seg in segments:
        seg_text = seg.get("text", "").strip()
        if not seg_text:
            continue

        seg_words = seg.get("words", [])

        # Check if segment falls within the clip window [clip_start, clip_end]
        raw_s_start = float(seg.get("start", 0.0))
        raw_s_end = float(seg.get("end", raw_s_start + 1.0))
        abs_s_start = float(seg.get("abs_start", raw_s_start))
        abs_s_end = float(seg.get("abs_end", raw_s_end))

        if abs_s_end <= clip_start or abs_s_start >= clip_end:
            continue

        seg_rel_start = max(0.0, abs_s_start - clip_start)
        seg_rel_end = min(clip_dur, abs_s_end - clip_start)

        # Check if user edited the segment text
        words_joined = " ".join([w.get("word", "") for w in seg_words]).strip() if seg_words else ""
        text_was_edited = bool(words_joined and words_joined.lower() != seg_text.lower())

        if seg_words and not text_was_edited:
            for w in seg_words:
                w_raw_start = float(w.get("start", 0.0))
                w_raw_end = float(w.get("end", w_raw_start + 0.2))
                w_abs_start = float(w.get("abs_start", w_raw_start))
                w_abs_end = float(w.get("abs_end", w_raw_end))
                w_str = w.get("word", "").strip()
                if not w_str:
                    continue

                if w_abs_end <= clip_start or w_abs_start >= clip_end:
                    continue

                w_rel_start = max(0.0, w_abs_start - clip_start)
                w_rel_end = min(clip_dur, max(w_rel_start + 0.1, w_abs_end - clip_start))
                clip_words.append({
                    "word": w_str,
                    "start": round(w_rel_start, 2),
                    "end": round(w_rel_end, 2)
                })
        elif seg_text:
            # Re-synthesize words across the segment range if edited or no word timestamps
            split_words = seg_text.split()
            if split_words:
                total_span = max(0.4, seg_rel_end - seg_rel_start)
                word_dur = total_span / len(split_words)
                for idx, sw in enumerate(split_words):
                    ws = seg_rel_start + idx * word_dur
                    we = min(seg_rel_end, ws + word_dur)
                    clip_words.append({
                        "word": sw,
                        "start": round(ws, 2),
                        "end": round(we, 2)
                    })

    # Determine if single-word or phrase rendering
    is_word_by_word = (
        style_name in ("word_red", "word_yellow", "word_white", "default")
        or style_name.startswith("word_")
    )

    # Style configuration based on style_name
    outline_width = 6 if play_res_y >= 1920 else 4 if play_res_y >= 1280 else 3
    font_name = "Arial Black" if is_word_by_word else "Arial"

    if style_name in ("word_red", "default"):
        primary_color = "&H000000FF"     # Pure Red
        outline_color = "&H00FFFFFF"     # Pure White outline
        shadow_color = "&H70000000"      # Soft drop shadow
        outline_width = 10 if play_res_y >= 1920 else 7 if play_res_y >= 1280 else 5
        font_size = int(font_size * 1.35)
        margin_v = int(play_res_y * 0.38)
    elif style_name == "word_yellow":
        primary_color = "&H0000FFFF"     # Vibrant Yellow
        outline_color = "&H00000000"     # Pure Black outline
        shadow_color = "&H80000000"
        outline_width = 8 if play_res_y >= 1920 else 5 if play_res_y >= 1280 else 4
        font_size = int(font_size * 1.25)
        margin_v = int(play_res_y * 0.38)
    elif style_name == "word_white":
        primary_color = "&H00FFFFFF"     # Crisp White
        outline_color = "&H00000000"     # Pure Black outline
        shadow_color = "&H80000000"
        outline_width = 8 if play_res_y >= 1920 else 5 if play_res_y >= 1280 else 4
        font_size = int(font_size * 1.25)
        margin_v = int(play_res_y * 0.38)
    elif style_name in ("purple_pop", "phrase_purple"):
        primary_color = "&H00FFFFFF"
        outline_color = "&H0050186E"     # Deep Purple outline
        shadow_color = "&H80000000"
    elif style_name in ("clean_white", "phrase_white"):
        primary_color = "&H00FFFFFF"
        outline_color = "&H00151515"
        shadow_color = "&H80000000"
    else:
        # Default phrase yellow
        primary_color = "&H0000FFFF"
        outline_color = "&H00000000"
        shadow_color = "&H80000000"

    # Apply customizable vertical positioning (Top, Center, Bottom, or % from top)
    pos_str = str(text_position).strip().lower()
    if pos_str == "top":
        margin_v = int(play_res_y * 0.78)
    elif pos_str == "bottom":
        margin_v = int(play_res_y * 0.12)
    elif pos_str == "center":
        margin_v = int(play_res_y * 0.42)
    else:
        try:
            pct_from_top = float(pos_str.replace("%", "").strip())
            margin_v = int(play_res_y * max(0.08, min(0.92, (100.0 - pct_from_top) / 100.0)))
        except Exception:
            margin_v = int(play_res_y * 0.42)

    # Apply customizable font size scale factor (e.g. 0.8x to 2.0x)
    try:
        scale_factor = max(0.5, min(2.5, float(font_size_scale)))
    except Exception:
        scale_factor = 1.0
    font_size = int(font_size * scale_factor)
    outline_width = max(2, int(outline_width * (0.8 + 0.2 * scale_factor)))

    # Build dialogue lines: word-by-word (1 word at a time) or short phrases
    dialogue_lines = []
    if clip_words and is_word_by_word:
        # Render exactly one single word at a time
        for i in range(len(clip_words)):
            w = clip_words[i]
            w_text = w["word"].strip()
            if not w_text:
                continue

            c_start = w["start"]
            # Smooth transition to the next word so there is no flickering black gap
            if i + 1 < len(clip_words):
                next_start = clip_words[i + 1]["start"]
                if next_start > c_start and (next_start - w["end"]) < 0.35:
                    c_end = min(c_start + 1.2, next_start)
                else:
                    c_end = max(w["end"], c_start + 0.18)
            else:
                c_end = max(w["end"], c_start + 0.3)

            # Ensure minimum visibility duration (at least 0.18s)
            if c_end - c_start < 0.18:
                c_end = c_start + 0.18

            # Clean trailing punctuation and capitalize first letter
            clean_w = w_text.strip(" ,.?!:;\"'()[]{}")
            display_word = clean_w if clean_w else w_text
            if display_word and display_word[0].islower():
                display_word = display_word[0].upper() + display_word[1:]

            start_str = format_ass_time(c_start)
            end_str = format_ass_time(c_end)
            pos_x = play_res_x // 2
            pos_y = play_res_y - margin_v
            # Lock vertical center with \an5\pos to completely eliminate vertical bouncing / jumping up and down
            dialogue_lines.append(
                f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{{\\an5\\pos({pos_x},{pos_y})}}{display_word}"
            )
    elif clip_words:
        # Group words into short 3-4 word rhythmic chunks
        chunk_size = 4
        pos_x = play_res_x // 2
        pos_y = play_res_y - margin_v
        for i in range(0, len(clip_words), chunk_size):
            chunk = clip_words[i:i + chunk_size]
            c_start = chunk[0]["start"]
            c_end = chunk[-1]["end"]
            c_text = " ".join([w["word"] for w in chunk])

            if c_text and not c_text[0].isupper():
                c_text = c_text[0].upper() + c_text[1:]

            start_str = format_ass_time(c_start)
            end_str = format_ass_time(c_end)
            dialogue_lines.append(
                f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{{\\an5\\pos({pos_x},{pos_y})}}{c_text}"
            )
    else:
        # Fallback to segment slices
        pos_x = play_res_x // 2
        pos_y = play_res_y - margin_v
        for seg in segments:
            s_start = seg.get("start", 0.0)
            s_end = seg.get("end", 0.0)
            if s_end > clip_start and s_start < clip_end:
                rel_start = max(0.0, s_start - clip_start)
                rel_end = max(rel_start + 0.5, min(clip_end - clip_start, s_end - clip_start))
                start_str = format_ass_time(rel_start)
                end_str = format_ass_time(rel_end)
                s_text = seg.get("text", "").strip()
                dialogue_lines.append(
                    f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{{\\an5\\pos({pos_x},{pos_y})}}{s_text}"
                )

    # 3. Burn Custom Text Overlays (Headlines, Callouts, Titles, Watermarks)
    if custom_overlays:
        COLOR_HEX = {
            "white": "&H00FFFFFF&",
            "yellow": "&H0000FFFF&",
            "red": "&H000000FF&",
            "cyan": "&H00FFFF00&",
            "green": "&H0000FF00&",
            "purple": "&H00D02090&",
            "black": "&H00000000&"
        }
        for o in custom_overlays:
            if o.get("burn") is False or o.get("erased") is True:
                continue
            o_text = str(o.get("text", "")).strip()
            if not o_text:
                continue

            raw_o_start = float(o.get("start_time", 0.0))
            raw_o_end = float(o.get("end_time", clip_end))
            if raw_o_start >= clip_start:
                o_start = max(0.0, raw_o_start - clip_start)
                o_end = min(clip_end - clip_start, raw_o_end - clip_start)
            else:
                o_start = max(0.0, raw_o_start)
                o_end = min(clip_end - clip_start, raw_o_end)
            if o_end <= o_start:
                o_end = max(o_start + 0.5, clip_end - clip_start)

            pct_y = float(o.get("position_y", 20))
            pos_y = int(play_res_y * (pct_y / 100.0))

            pos_x_mode = str(o.get("position_x", "center")).lower()
            if pos_x_mode == "left":
                pos_x = int(play_res_x * 0.12)
                an = 4
            elif pos_x_mode == "right":
                pos_x = int(play_res_x * 0.88)
                an = 6
            else:
                pos_x = play_res_x // 2
                an = 5

            base_fs = int(o.get("font_size", 48))
            # Scale proportionally to resolution
            fs = max(24, int(base_fs * (play_res_y / 1920.0) * 1.6))
            col_key = str(o.get("color", "yellow")).lower()
            col_hex = COLOR_HEX.get(col_key, "&H0000FFFF&")

            start_str = format_ass_time(o_start)
            end_str = format_ass_time(o_end)
            dialogue_lines.append(
                f"Dialogue: 1,{start_str},{end_str},Default,,0,0,0,,{{\\an{an}\\pos({pos_x},{pos_y})\\fs{fs}\\bord7\\shad3\\c{col_hex}}}{o_text}"
            )

    # 4. Burn Custom or Platform Watermark if requested
    if watermark:
        wm_text = str(watermark_text or "ClipMaster AI").strip()
        if wm_text:
            pos_x = int(play_res_x * 0.5)
            pos_y = int(play_res_y * 0.94)  # 6% from bottom edge
            fs = max(18, int(26 * (play_res_y / 1920.0)))
            clip_dur = max(0.1, clip_end - clip_start)
            dialogue_lines.append(
                f"Dialogue: 2,0:00:00.00,{format_ass_time(clip_dur)},Default,,0,0,0,,{{\\an5\\pos({pos_x},{pos_y})\\fs{fs}\\bord3\\shad1\\c&H50FFFFFF&\\alpha&H60&}}{wm_text}"
            )

    ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {play_res_x}
PlayResY: {play_res_y}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},&H000000FF,{outline_color},{shadow_color},-1,0,0,0,100,100,1,0,1,{outline_width},3,5,60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(dialogue_lines) + "\n"

    try:
        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)
        return True
    except Exception as e:
        logger.error(f"Failed to write ASS subtitle file: {e}")
        return False

def render_vertical_clip(
    source_video_path: Path,
    output_clip_path: Path,
    start_time: float,
    end_time: float,
    framing_mode: str = "blur", # "blur" or "crop" or "smart_face" or "fit"
    subtitle_ass_path: Optional[Path] = None,
    progress_callback: Optional[Callable[[int, str], None]] = None,
    resolution: str = "1080p",
    burn_captions: bool = True,
    aspect_ratio: str = "9:16",
    volume_level: float = 1.0,
    vocal_boost: bool = False,
    transition: str = "none"
) -> bool:
    """
    Renders a clip (9:16 vertical or 16:9 widescreen) using FFmpeg with framing
    and burns high-impact ASS captions directly onto the video.
    """
    duration = end_time - start_time
    if duration <= 0:
        raise ValueError("Invalid duration: end_time must be greater than start_time")

    res_cfg = get_resolution_config(resolution, aspect_ratio)
    target_w = res_cfg["width"]
    target_h = res_cfg["height"]
    is_16_9 = "16:9" in str(aspect_ratio)
    is_1_1 = "1:1" in str(aspect_ratio)
    aspect_label = "16:9 Widescreen" if is_16_9 else ("1:1 Square" if is_1_1 else "9:16 Vertical")

    if progress_callback:
        progress_callback(10, f"Building {aspect_label} filtergraph ({target_w}x{target_h})...")

    ffmpeg_bin = FFMPEG_BIN or "ffmpeg"

    # 1. Build video filter chain based on aspect ratio
    # PERFORMANCE OPTIMIZATION: For blurred backgrounds, we downsample the background layer
    # to a compact canvas (e.g. 1/4th resolution), apply a smooth blur, and scale back up.
    # This reduces heavy boxblur pixel computations by over 90% and accelerates rendering by 6x-10x!
    bg_w = max(180, target_w // 4)
    bg_h = max(180, target_h // 4)

    if is_16_9:
        if framing_mode == "crop":
            filtergraph = f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h}"
        elif framing_mode == "fit":
            filtergraph = f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2"
        else:
            # High-performance blurred background for 16:9
            filtergraph = (
                f"[0:v]split=2[bg_in][fg_in];"
                f"[bg_in]scale={bg_w}:{bg_h}:force_original_aspect_ratio=increase,crop={bg_w}:{bg_h},boxblur=4:1,scale={target_w}:{target_h}[bg];"
                f"[fg_in]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
            )
    elif is_1_1:
        if framing_mode == "crop":
            filtergraph = f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h}"
        elif framing_mode == "fit":
            filtergraph = f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2"
        else:
            # High-performance blurred background for 1:1 square
            filtergraph = (
                f"[0:v]split=2[bg_in][fg_in];"
                f"[bg_in]scale={bg_w}:{bg_h}:force_original_aspect_ratio=increase,crop={bg_w}:{bg_h},boxblur=4:1,scale={target_w}:{target_h}[bg];"
                f"[fg_in]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
            )
    else:
        # 9:16 Vertical video
        if framing_mode in ("smart_face", "face_tracking", "autotrack"):
            if progress_callback:
                progress_callback(12, "Scanning speaker face coordinates & calculating smart center...")
            face_info = analyze_speaker_face_tracking(
                source_video_path,
                start_time,
                end_time,
                target_w=target_w,
                target_h=target_h
            )
            filtergraph = face_info.get(
                "filter_crop",
                f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h}"
            )
        elif framing_mode == "crop":
            # Scale to fill target_w x target_h and crop the center
            filtergraph = f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h}"
        else:
            # High-performance blurred background for 9:16 vertical
            filtergraph = (
                f"[0:v]split=2[bg_in][fg_in];"
                f"[bg_in]scale={bg_w}:{bg_h}:force_original_aspect_ratio=increase,crop={bg_w}:{bg_h},boxblur=4:1,scale={target_w}:{target_h}[bg];"
                f"[fg_in]scale={target_w}:-2[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
            )

    # 2. Add subtitle burning filter if enabled and provided
    if burn_captions and subtitle_ass_path and subtitle_ass_path.exists():
        # Clean path for FFmpeg filter on Windows: replace backslashes with forward slashes
        clean_sub_path = str(subtitle_ass_path).replace("\\", "/")
        # Escape colon for Windows drive letter: C:/ -> C\\:/
        clean_sub_path = clean_sub_path.replace(":", "\\:")
        filtergraph += f",subtitles='{clean_sub_path}'"

    # 3. Add video transitions (Fade to black / smooth dissolve)
    trans_mode = str(transition or "none").lower()
    if trans_mode in ("fade", "fade_black", "fade_to_black"):
        fade_dur = min(0.4, max(0.15, duration / 6.0))
        out_start = max(0.1, duration - fade_dur)
        filtergraph += f",fade=t=in:st=0:d={fade_dur:.2f},fade=t=out:st={out_start:.2f}:d={fade_dur:.2f}"

    # 4. Audio filters: Volume adjustment and Vocal Clarity Normalization
    af_filters = []
    try:
        vol_num = float(volume_level)
        if abs(vol_num - 1.0) > 0.05:
            vol_safe = max(0.0, min(3.0, vol_num))
            af_filters.append(f"volume={vol_safe:.2f}")
    except Exception:
        pass

    if vocal_boost:
        af_filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")

    # Ultra-HD Quality vs Standard
    is_4k = str(resolution).lower() == "4k"
    crf_val = "18" if is_4k else "22"
    preset_val = "fast" if is_4k else "veryfast"

    cmd = [
        ffmpeg_bin,
        "-y",
        "-threads", "0",
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", str(source_video_path),
        "-filter_complex", filtergraph,
        "-c:v", "libx264",
        "-preset", preset_val,
        "-crf", crf_val,
        "-pix_fmt", "yuv420p"
    ]

    if af_filters:
        cmd.extend(["-af", ", ".join(af_filters)])

    cmd.extend([
        "-c:a", "aac",
        "-b:a", "256k" if is_4k else "192k",
        "-movflags", "+faststart",
        str(output_clip_path)
    ])

    if progress_callback:
        progress_callback(25, f"Encoding {aspect_label} video and burning captions...")

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        # Parse FFmpeg progress
        time_pattern = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")
        while True:
            line = process.stderr.readline()
            if not line and process.poll() is not None:
                break
            if line:
                match = time_pattern.search(line)
                if match:
                    hours, mins, secs = match.groups()
                    current_secs = int(hours) * 3600 + int(mins) * 60 + float(secs)
                    pct = 25 + int((current_secs / duration) * 70)
                    pct = min(96, max(25, pct))
                    if progress_callback:
                        progress_callback(pct, f"Rendering {aspect_label} frames ({int(current_secs)}s / {int(duration)}s)...")

        process.wait()

        if process.returncode != 0:
            err_output = process.stderr.read()
            logger.error(f"FFmpeg render failed: {err_output}")
            return False

        if progress_callback:
            progress_callback(100, f"{aspect_label} clip ready!")

        return output_clip_path.exists() and output_clip_path.stat().st_size > 0

    except Exception as e:
        logger.error(f"Render process error: {e}")
        return False

# Backward-compatible alias
render_clip = render_vertical_clip
