import json
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests

logger = logging.getLogger(__name__)

# High-impact sermon, podcast, and teaching keywords
SERMON_KEYWORDS = {
    # Inspiration & Faith
    "faith", "believe", "power", "truth", "transform", "change", "listen", "remember",
    "secret", "key", "purpose", "destiny", "greatness", "breakthrough", "freedom",
    "victory", "overcome", "strength", "courage", "wisdom", "promise", "glory",
    # Spiritual & Biblical
    "god", "jesus", "christ", "lord", "holy", "spirit", "prayer", "pray", "amen",
    "hallelujah", "scripture", "bible", "chapter", "verse", "testimony", "prophetic",
    "anointing", "revival", "deliverance", "salvation", "miracle", "worship", "praise",
    "covenant", "kingdom", "blessing", "calling", "father", "son", "gospel", "eternity",
    "grace", "love", "heart", "soul", "peace", "hope", "light", "word", "church", "believer"
}

PODCAST_KEYWORDS = {
    # Engagement, hooks, debate & insights
    "mistake", "secret", "lesson", "realize", "actually", "truth", "problem", "solution",
    "story", "funny", "crazy", "unbelievable", "interview", "advice", "career", "money",
    "success", "failure", "habits", "psychology", "mindset", "perspective", "hack",
    "strategy", "rules", "never", "always", "why", "how", "what", "question", "answer",
    "insight", "business", "growth", "moment", "difference", "experience", "listen"
}

HOOK_STARTERS = (
    "if you", "the reason", "the biggest", "most people", "i want you", "listen to",
    "here is", "here's", "do not", "don't", "never", "always", "every time",
    "when you", "scripture says", "the bible says", "god said", "in the book",
    "let me tell", "the secret", "why do", "how do", "what if", "write this down",
    "let this sink in", "remember this", "take note", "the key is"
)

CLIMAX_MARKERS = (
    "write this down", "listen to me", "take notes", "the secret is", "the key is",
    "the problem is", "the solution is", "let this sink in", "here is the truth",
    "this is why", "remember this", "the bible says", "scripture declares",
    "in the book of", "in chapter", "in verse", "god is saying", "the lord told",
    "breakthrough", "miracle", "anointing", "never forget", "pay attention",
    "the most important", "number one", "first of all", "in conclusion", "finally",
    "this changed my life", "i dare you", "the turning point"
)

def format_time_label(seconds: float) -> str:
    """
    Formats seconds into clean timeline format: MM:SS or H:MM:SS
    """
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hrs > 0:
        return f"{hrs}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

# Backwards compatible alias
POWER_KEYWORDS = SERMON_KEYWORDS

def clean_title_from_text(text: str) -> str:
    """
    Extracts a punchy 3-7 word title from a segment of text.
    """
    cleaned = re.sub(r'[\r\n]+', ' ', text).strip()
    sentences = re.split(r'[.!?]+', cleaned)
    first_sentence = sentences[0].strip() if sentences else cleaned

    words = first_sentence.split()
    if len(words) <= 7:
        title = " ".join(words)
    else:
        title = " ".join(words[:6]) + "..."
    return title.title() if title else "Key Teaching Highlight"

def detect_highlights_rule_based(
    transcript: Dict[str, Any],
    min_duration: float = 8.0,
    max_duration: float = 60.0,
    target_count: int = 5,
    lab_mode: str = "sermon",
    timeline_strategy: str = "timeline_balanced"
) -> List[Dict[str, Any]]:
    """
    Timeline-Aware Highlight Extractor for long videos (e.g. 30min, 1 hour, 2 hours).
    Analyzes speech cadence, keyword density, sentence boundaries, and emotional climax markers.
    When timeline_strategy="timeline_balanced", partitions the full 2-hour timeline into sectors
    to ensure key moments are captured from the beginning, middle, climax, and ending.
    """
    segments = transcript.get("segments", [])
    if not segments:
        return []

    active_keywords = PODCAST_KEYWORDS if lab_mode == "podcast" else SERMON_KEYWORDS
    total_duration = transcript.get("duration", 0.0)
    candidates = []

    # Build sliding windows of consecutive segments
    n = len(segments)
    for i in range(n):
        accumulated_text = []
        start_time = segments[i]["start"]

        for j in range(i, n):
            seg = segments[j]
            accumulated_text.append(seg["text"])
            end_time = seg["end"]
            duration = end_time - start_time

            if duration < min_duration:
                continue
            if duration > max_duration:
                break

            full_text = " ".join(accumulated_text).strip()
            words_list = re.findall(r'\b[a-zA-Z]+\b', full_text.lower())
            word_count = len(words_list)
            if word_count == 0:
                continue

            # 1. Speech Cadence Score (words per second)
            wps = word_count / duration if duration > 0 else 0
            cadence_score = max(0, 100 - abs(wps - 2.6) * 35)

            # 2. Power Keyword Density Score
            power_matches = [w for w in words_list if w in active_keywords]
            keyword_density = len(power_matches) / word_count
            keyword_score = min(100, keyword_density * 450)

            # 3. Complete Thought / Punctuation Boundary Bonus
            starts_clean = full_text[0].isupper() if full_text else False
            ends_clean = full_text[-1] in ".!?" if full_text else False
            boundary_bonus = 25 if (starts_clean and ends_clean) else 5

            # 4. Opening Hook Bonus
            text_lower = full_text.lower()
            has_hook = any(text_lower.startswith(h) for h in HOOK_STARTERS)
            hook_bonus = 15 if has_hook else 0

            # 5. Climax / Revelation Peak Marker Bonus
            has_climax = any(m in text_lower for m in CLIMAX_MARKERS)
            climax_bonus = 18 if has_climax else 0

            # 6. Question-Answer Dynamic Bonus
            has_question = "?" in full_text
            question_bonus = 10 if has_question else 0

            # Total Composite Score
            final_score = int(
                (cadence_score * 0.25) +
                (keyword_score * 0.35) +
                (boundary_bonus * 0.5) +
                hook_bonus +
                climax_bonus +
                question_bonus
            )
            final_score = min(99, max(55, final_score))

            reason_tags = []
            if has_hook:
                reason_tags.append("High-retention opening hook")
            if has_climax:
                reason_tags.append("Key revelation & conviction marker")
            if has_question:
                reason_tags.append("Engaging Q&A delivery")
            if len(power_matches) > 0:
                lab_tag = "Sermon themes" if lab_mode == "sermon" else "Podcast insights"
                reason_tags.append(f"{lab_tag} ({', '.join(set(power_matches[:3]))})")
            if starts_clean and ends_clean:
                reason_tags.append("Complete thought delivery")
            if 2.0 <= wps <= 3.5:
                reason_tags.append("Optimal shorts pacing")

            reason = " • ".join(reason_tags) if reason_tags else "High speech density and clear pacing"

            candidates.append({
                "id": f"hl_{i}_{j}",
                "title": clean_title_from_text(full_text),
                "start_time": round(start_time, 2),
                "end_time": round(end_time, 2),
                "duration": round(duration, 2),
                "score": final_score,
                "reason": reason,
                "text": full_text,
                "method": "rule_based"
            })

    # Sort all candidates by score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)

    # TIMELINE PARTITIONING FOR LONG VIDEOS (e.g. 30min, 1hr, 2hr sermons/podcasts):
    # Ensures the K shorts are intelligently distributed across the full narrative journey:
    # (Beginning Hook -> Core Teachings -> Mid Climax -> Breakthrough -> Concluding Call)
    if timeline_strategy == "timeline_balanced" and total_duration > 180.0 and target_count > 1:
        sector_duration = total_duration / target_count
        selected = []

        for s in range(target_count):
            sec_start = s * sector_duration
            sec_end = (s + 1) * sector_duration

            # Find candidates whose center falls in this sector
            sector_candidates = [
                c for c in candidates
                if sec_start <= ((c["start_time"] + c["end_time"]) / 2) < sec_end
            ]
            sector_candidates.sort(key=lambda x: x["score"], reverse=True)

            chosen = None
            for cand in sector_candidates:
                # Check overlap against already chosen clips
                overlap = False
                for existing in selected:
                    inter_start = max(cand["start_time"], existing["start_time"])
                    inter_end = min(cand["end_time"], existing["end_time"])
                    if inter_end > inter_start: # STRICT ZERO SCENE REPETITION
                        overlap = True
                        break
                if not overlap:
                    chosen = cand
                    break

            if chosen:
                time_lbl = format_time_label(chosen["start_time"])
                part_num = s + 1
                if s == 0:
                    phase = "Opening Hook"
                elif s == target_count - 1:
                    phase = "Closing Takeaway"
                elif s == target_count // 2:
                    phase = "Climax Breakthrough"
                else:
                    phase = f"Key Insight #{part_num}"

                clean_t = chosen["title"].replace("...", "")
                chosen["title"] = f"[Part {part_num} • {time_lbl}] {clean_t}"
                chosen["timeline_phase"] = phase
                chosen["reason"] = f"{phase} at {time_lbl} • {chosen['reason']}"
                selected.append(chosen)

        # If any sector lacked candidates (e.g. silence or musical intro), fill from remaining global pool
        if len(selected) < target_count:
            for cand in candidates:
                if len(selected) >= target_count:
                    break
                overlap = False
                for existing in selected:
                    inter_start = max(cand["start_time"], existing["start_time"])
                    inter_end = min(cand["end_time"], existing["end_time"])
                    if inter_end > inter_start: # STRICT ZERO SCENE REPETITION
                        overlap = True
                        break
                if not overlap:
                    time_lbl = format_time_label(cand["start_time"])
                    cand["title"] = f"[Key Place • {time_lbl}] {cand['title'].replace('...', '')}"
                    selected.append(cand)

        # Sort chronologically so clips flow in natural order
        selected.sort(key=lambda x: x["start_time"])
        return selected

    # Standard deduplication for short videos or pure peak mode:
    selected = []
    for cand in candidates:
        overlap = False
        for s in selected:
            inter_start = max(cand["start_time"], s["start_time"])
            inter_end = min(cand["end_time"], s["end_time"])
            if inter_end > inter_start: # STRICT ZERO SCENE REPETITION
                overlap = True
                break
        if not overlap:
            time_lbl = format_time_label(cand["start_time"])
            cand["title"] = f"[{time_lbl}] {cand['title'].replace('...', '')}"
            selected.append(cand)
            if len(selected) >= target_count:
                break

    if not selected and candidates:
        selected = candidates[:target_count]

    return selected

def detect_highlights_gemini(
    transcript: Dict[str, Any],
    api_key: str,
    target_count: int = 4,
    preferred_model: str = "gemini-2.5-pro",
    min_duration: float = 15.0,
    max_duration: float = 60.0,
    lab_mode: str = "sermon",
    timeline_strategy: str = "timeline_balanced"
) -> Optional[List[Dict[str, Any]]]:
    """
    Calls Google Gemini Pro API (e.g. gemini-2.5-pro, gemini-1.5-pro, gemini-2.5-flash, gemini-2.0-flash)
    to identify high-retention viral moments, hooks, and teaching climaxes.
    Supports customizable durations from 15s shorts up to 2m 30s / 3m long-reels and sermons.
    Falls back gracefully across top models or to the timeline-balanced rule engine if needed.
    """
    if not api_key or not api_key.strip():
        return None

    segments = transcript.get("segments", [])
    if not segments:
        return None

    # Format transcript with timestamps for prompt
    transcript_text = "\n".join([
        f"[{seg['start']}s - {seg['end']}s]: {seg['text']}"
        for seg in segments
    ])

    min_desc = f"{int(min_duration)}s" if min_duration < 60 else f"{round(min_duration/60, 1)}m ({int(min_duration)}s)"
    max_desc = f"{int(max_duration)}s" if max_duration < 60 else f"{round(max_duration/60, 1)}m ({int(max_duration)}s)"

    prompt = f"""You are a master social media producer and video editor specializing in virality, audience retention, and clip curation for TikTok, YouTube Shorts, and Instagram Reels.
Analyze this timestamped speech transcript and identify exactly {target_count} magnetic, viral-worthy clips.

CRITICAL DURATION CONSTRAINTS:
- Minimum Clip Duration: {int(min_duration)} seconds ({min_desc})
- Maximum Clip Duration: {int(max_duration)} seconds ({max_desc})
- Every clip duration (end_time - start_time) MUST be between {int(min_duration)} and {int(max_duration)} seconds.
- For longer limits (e.g. 2 min - 2.5 min / 120s - 150s), curate a complete, unbroken narrative arc or deep revelation that fills the target length naturally without padding.

CONTENT & TIMELINE GUIDELINES:
1. STRICT ZERO SCENE REPETITION: Every short MUST be 100% unique footage and speech. NO TWO CLIPS MAY OVERLAP OR REPEAT THE SAME SCENE, SENTENCE, OR TIMESTAMPS. If Clip 1 covers [0.0s - 150.0s], Clip 2 MUST be completely outside that range (e.g. [151.0s - 300.0s]).
2. Timeline Distribution: When the recording is long (e.g., 30m, 1 hour, or 2hr 30m sermon), distribute the {target_count} clips across the entire sermon timeline (Opening Hook -> Theological Foundation -> Climax Revelation -> Deliverance/Prayer -> Closing Takeaway) without repeating any scenes.
2. Strong Opening Hook: The first 3 to 5 seconds must grab instant curiosity, challenge, or emotional resonance.
3. Complete Thought & Sentence Boundaries: Start cleanly at the beginning of a sentence and conclude on a clear resolution, punchline, or conviction. NEVER cut mid-sentence.
4. Virality Score (75-99): Reflect hook intensity, emotional payoff, and watch-time retention.
5. Catchy Title: 3 to 7 words with high click-through appeal.

Transcript:
{transcript_text}

Return strictly a valid JSON array:
[
  {{
    "title": "Punchy Viral Title Here",
    "start_time": 0.0,
    "end_time": {round(max_duration, 1)},
    "score": 96,
    "reason": "Why this specific moment grabs immediate retention and delivers a complete message",
    "text": "Exact spoken text in this range"
  }}
]
"""

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.35
        }
    }

    # Model priority: preferred model -> modern Gemini Flash / Flash-Lite / Pro models -> legacy models
    models_to_try = [
        preferred_model if preferred_model else "gemini-flash-lite-latest",
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-3.1-pro-preview",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-2.0-flash"
    ]
    seen = set()
    ordered_models = [m for m in models_to_try if not (m in seen or seen.add(m))]

    for model_name in ordered_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key.strip()}"
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code != 200:
                logger.warning(f"Gemini model {model_name} returned status {response.status_code}: {response.text}")
                continue

            result_data = response.json()
            candidates_raw = result_data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(candidates_raw)

            if not isinstance(parsed, list):
                continue

            formatted = []
            for i, item in enumerate(parsed):
                start = float(item.get("start_time", 0.0))
                end = float(item.get("end_time", start + 15.0))
                formatted.append({
                    "id": f"gemini_pro_{i}",
                    "title": item.get("title", f"Highlight {i+1}"),
                    "start_time": round(start, 2),
                    "end_time": round(end, 2),
                    "duration": round(end - start, 2),
                    "score": int(item.get("score", 95)),
                    "reason": item.get("reason", f"Curated by Gemini ({model_name}) for peak viral retention"),
                    "text": item.get("text", ""),
                    "method": f"gemini_{model_name}"
                })
            return formatted

        except Exception as e:
            logger.warning(f"Gemini API attempt with {model_name} failed: {e}")
            continue

    return None


def enforce_zero_scene_repetition(candidates: List[Dict[str, Any]], target_count: int = 10, min_gap_seconds: float = 0.5) -> List[Dict[str, Any]]:
    """
    CRITICAL NON-REPETITION ENGINE:
    Enforces 100% unique scenes across all generated shorts.
    Guarantees that no two clips share ANY overlapping video frames, audio, or speech.
    """
    if not candidates:
        return []

    # Sort by score descending to prioritize the highest quality hooks
    sorted_pool = sorted(candidates, key=lambda x: x.get("score", 90), reverse=True)
    non_repeating: List[Dict[str, Any]] = []

    for cand in sorted_pool:
        c_start = float(cand["start_time"])
        c_end = float(cand["end_time"])

        # Check if this candidate overlaps ANY existing selected clip
        is_repeated = False
        for chosen in non_repeating:
            ch_start = float(chosen["start_time"])
            ch_end = float(chosen["end_time"])

            # Overlap check with optional safety gap
            if max(c_start, ch_start) < min(c_end, ch_end) + min_gap_seconds:
                is_repeated = True
                break

        if not is_repeated:
            non_repeating.append(cand)
            if len(non_repeating) >= target_count:
                break

    # Re-sort chronologically for smooth timeline delivery
    non_repeating.sort(key=lambda x: float(x["start_time"]))
    return non_repeating

def extract_video_highlights(
    transcript: Dict[str, Any],
    api_key: Optional[str] = None,
    min_duration: float = 8.0,
    max_duration: float = 60.0,
    target_count: int = 5,
    lab_mode: str = "sermon",
    timeline_strategy: str = "timeline_balanced",
    preferred_model: str = "gemini-2.5-pro"
) -> List[Dict[str, Any]]:
    """
    Main entry point: tries Gemini AI if key is present; always falls back
    to the rule-based engine if absent or upon error.
    """
    if api_key:
        ai_highlights = detect_highlights_gemini(
            transcript,
            api_key,
            target_count=target_count,
            preferred_model=preferred_model,
            min_duration=min_duration,
            max_duration=max_duration,
            lab_mode=lab_mode,
            timeline_strategy=timeline_strategy
        )
        if ai_highlights and len(ai_highlights) > 0:
            # Enforce STRICT ZERO SCENE REPETITION on AI outputs
            clean_ai = enforce_zero_scene_repetition(ai_highlights, target_count=target_count)
            if len(clean_ai) >= target_count:
                return clean_ai
            # If AI returned overlapping clips, supplement with unique rule-based clips to hit target_count
            rule_clips = detect_highlights_rule_based(
                transcript,
                min_duration=min_duration,
                max_duration=max_duration,
                target_count=target_count,
                lab_mode=lab_mode,
                timeline_strategy=timeline_strategy
            )
            for r in rule_clips:
                if len(clean_ai) >= target_count:
                    break
                overlap = False
                for ex in clean_ai:
                    if max(r["start_time"], ex["start_time"]) < min(r["end_time"], ex["end_time"]):
                        overlap = True
                        break
                if not overlap:
                    clean_ai.append(r)
            clean_ai.sort(key=lambda x: x["start_time"])
            return clean_ai

    return detect_highlights_rule_based(
        transcript,
        min_duration=min_duration,
        max_duration=max_duration,
        target_count=target_count,
        lab_mode=lab_mode,
        timeline_strategy=timeline_strategy
    )
