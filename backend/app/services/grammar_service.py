"""
Grammar and Syntax Normalization Service for Video Transcripts and Captions.

Provides intelligent English grammar, syntax, capitalization, punctuation,
proper noun correction, stutter cleanup, and word-level timestamp preservation
for video captions and subtitles.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Comprehensive Dictionary of Common Proper Nouns & Speech-to-Text Corrections
# -----------------------------------------------------------------------------
PROPER_NOUNS_MAP = {
    # Biblical & Religious Figures / Books
    r"\bgod\b": "God",
    r"\bgod's\b": "God's",
    r"\bjesus\b": "Jesus",
    r"\bjesus's\b": "Jesus'",
    r"\bjesus'\b": "Jesus'",
    r"\bchrist\b": "Christ",
    r"\bchrist's\b": "Christ's",
    r"\bholy spirit\b": "Holy Spirit",
    r"\bholy ghost\b": "Holy Ghost",
    r"\bbible\b": "Bible",
    r"\bscripture\b": "Scripture",
    r"\bscriptures\b": "Scriptures",
    r"\bgenesis\b": "Genesis",
    r"\bexodus\b": "Exodus",
    r"\bpsalms\b": "Psalms",
    r"\bpsalm\b": "Psalm",
    r"\besther\b": "Esther",
    r"\bmordecai\b": "Mordecai",
    r"\bmordecai's\b": "Mordecai's",
    r"\bhaman\b": "Haman",
    r"\bhaman's\b": "Haman's",
    r"\bhayman\b": "Haman",
    r"\bheyman\b": "Haman",
    r"\bagagite\b": "Agagite",
    r"\bking ahasuerus\b": "King Ahasuerus",
    r"\bahasuerus\b": "Ahasuerus",
    r"\bapostle\b": "Apostle",
    r"\bpastor\b": "Pastor",
    r"\bevangelist\b": "Evangelist",
    r"\bprophet\b": "Prophet",

    # Nature, Story & Character Names (e.g. from Baobab & Animated shorts)
    r"\bbayobob\b": "baobab",
    r"\bbaobob\b": "baobab",
    r"\bbayobob tree\b": "baobab tree",
    r"\bzalumi\b": "Zalumi",
    r"\bketo\b": "Keto",
    r"\bleyla\b": "Leyla",
    r"\btommy\b": "Tommy",

    # Days, Months & Common Acronyms
    r"\bmonday\b": "Monday",
    r"\btuesday\b": "Tuesday",
    r"\bwednesday\b": "Wednesday",
    r"\bthursday\b": "Thursday",
    r"\bfriday\b": "Friday",
    r"\bsaturday\b": "Saturday",
    r"\bsunday\b": "Sunday",
    r"\bjanuary\b": "January",
    r"\bfebruary\b": "February",
    r"\bmarch\b": "March",
    r"\bapril\b": "April",
    r"\bmay\b": "May",
    r"\bjune\b": "June",
    r"\bjuly\b": "July",
    r"\baugust\b": "August",
    r"\bseptember\b": "September",
    r"\boctober\b": "October",
    r"\bnovember\b": "November",
    r"\bdecember\b": "December",
    r"\byoutube\b": "YouTube",
    r"\btiktok\b": "TikTok",
    r"\binstagram\b": "Instagram"
}

# -----------------------------------------------------------------------------
# English Contractions & Grammatical Normalization Rules
# -----------------------------------------------------------------------------
CONTRACTIONS_MAP = {
    r"\bdont\b": "don't",
    r"\bcant\b": "can't",
    r"\bwont\b": "won't",
    r"\bdidnt\b": "didn't",
    r"\bdoesnt\b": "doesn't",
    r"\bisnt\b": "isn't",
    r"\barent\b": "aren't",
    r"\bwasnt\b": "wasn't",
    r"\bwerent\b": "weren't",
    r"\bhavent\b": "haven't",
    r"\bhasnt\b": "hasn't",
    r"\bhadnt\b": "hadn't",
    r"\bcouldnt\b": "couldn't",
    r"\bwouldnt\b": "wouldn't",
    r"\bshouldnt\b": "shouldn't",
    r"\byoure\b": "you're",
    r"\btheyre\b": "they're",
    r"\bthats\b": "that's",
    r"\bwhats\b": "what's",
    r"\btheres\b": "there's",
    r"\bwheres\b": "where's",
    r"\bhows\b": "how's",
    r"\bwhos\b": "who's",
    r"\blets\b(?=\s+(?:go|do|make|see|take|get|have|try|talk|check|start|look|hear))": "let's"
}

# Common spoken English syntax errors
SPOKEN_SYNTAX_FIXES = [
    (re.compile(r"\bcould\s+of\b", re.IGNORECASE), "could have"),
    (re.compile(r"\bwould\s+of\b", re.IGNORECASE), "would have"),
    (re.compile(r"\bshould\s+of\b", re.IGNORECASE), "should have"),
    (re.compile(r"\bmight\s+of\b", re.IGNORECASE), "might have"),
    (re.compile(r"\bmust\s+of\b", re.IGNORECASE), "must have"),
    (re.compile(r"\bis\s+suppose\s+to\b", re.IGNORECASE), "is supposed to"),
    (re.compile(r"\bwas\s+suppose\s+to\b", re.IGNORECASE), "was supposed to"),
    (re.compile(r"\bare\s+suppose\s+to\b", re.IGNORECASE), "are supposed to"),
    (re.compile(r"\bwere\s+suppose\s+to\b", re.IGNORECASE), "were supposed to"),
    (re.compile(r"\buse\s+to\b(?=\s+(?:be|do|have|go|live|see|make|say|take|get))", re.IGNORECASE), "used to"),
    (re.compile(r"\bsunlights\b", re.IGNORECASE), "sunlight")
]

# Stutter / duplicate consecutive words pattern
STUTTER_REGEX = re.compile(
    r"\b(the|to|and|you|in|of|that|is|it|for|we|a|an|on|at|by|with|from|as|or|if|so|my|your|his|her|their|our)\s+\1\b",
    re.IGNORECASE
)


def fix_word_casing_glitches(text: str) -> str:
    """
    Fixes mid-word casing errors produced by Whisper (e.g. "isn'T" -> "isn't", "Isn'T" -> "Isn't", "ThaT" -> "That").
    """
    def _fix_match(m):
        w = m.group(0)
        # e.g. Isn'T -> Isn't, isn'T -> isn't
        if "'" in w:
            parts = w.split("'")
            prefix = parts[0]
            if prefix[0].isupper():
                clean_prefix = prefix[0].upper() + prefix[1:].lower()
            else:
                clean_prefix = prefix.lower()
            return clean_prefix + "'" + parts[1].lower()
        # Word with random interior capital: ThaT -> That, HEre -> Here
        if len(w) > 2 and w[0].isupper() and not w.isupper():
            return w.capitalize()
        return w

    text = re.sub(r"\b[A-Za-z]+'[A-Za-z]+\b", _fix_match, text)
    return text


def fix_pronoun_i(text: str) -> str:
    """
    Ensures first-person pronoun 'I' is always capitalized (e.g. i -> I, i'm -> I'm, i've -> I've).
    """
    text = re.sub(r"\bi\b", "I", text)
    text = re.sub(r"\bi'm\b", "I'm", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi've\b", "I've", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi'd\b", "I'd", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi'll\b", "I'll", text, flags=re.IGNORECASE)
    text = re.sub(r"\bim\b", "I'm", text, flags=re.IGNORECASE)
    text = re.sub(r"\bive\b", "I've", text, flags=re.IGNORECASE)
    return text


def clean_punctuation_and_spacing(text: str) -> str:
    """
    Cleans duplicated punctuation, spaces before punctuation, and trailing broken artifacts.
    """
    # Remove leading spaces before punctuation
    text = re.sub(r"\s+([,.:;?!])", r"\1", text)
    # Deduplicate punctuation (e.g. ,, -> , or .. -> .)
    text = re.sub(r",+", ",", text)
    text = re.sub(r"\.{2,}", "...", text)  # allow ellipsis
    text = re.sub(r"\?{2,}", "?", text)
    text = re.sub(r"!{2,}", "!", text)
    # Ensure space after punctuation (unless trailing or inside number/abbreviation)
    text = re.sub(r"([,;:?!])([A-Za-z0-9])", r"\1 \2", text)
    # Clean multiple spaces
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def capitalize_sentences(text: str) -> str:
    """
    Ensures every sentence starts with a capital letter.
    """
    if not text:
        return text

    # Split by sentence end boundaries: . ? !
    parts = re.split(r"([.?!]\s+)", text)
    out = []
    for i in range(0, len(parts), 2):
        chunk = parts[i]
        if chunk:
            # Capitalize first alpha char
            for idx, ch in enumerate(chunk):
                if ch.isalpha():
                    chunk = chunk[:idx] + ch.upper() + chunk[idx + 1:]
                    break
        out.append(chunk)
        if i + 1 < len(parts):
            out.append(parts[i + 1])
    return "".join(out)


def polish_sentence_grammar(text: str) -> str:
    """
    Applies comprehensive English grammar, syntax, and punctuation normalization
    to a sentence or subtitle line.
    """
    if not text or not text.strip():
        return text

    cleaned = text.strip()

    # 1. Fix stutter repetitions (e.g. "the the" -> "the")
    cleaned = STUTTER_REGEX.sub(r"\1", cleaned)

    # 2. Fix casing glitches (e.g. "Isn'T" -> "Isn't")
    cleaned = fix_word_casing_glitches(cleaned)

    # 3. Fix pronoun I
    cleaned = fix_pronoun_i(cleaned)

    # 4. Spoken syntax errors (e.g. "could of" -> "could have")
    for pattern, repl in SPOKEN_SYNTAX_FIXES:
        cleaned = pattern.sub(repl, cleaned)

    # 5. Contractions normalization
    for pattern, repl in CONTRACTIONS_MAP.items():
        cleaned = re.sub(pattern, repl, cleaned, flags=re.IGNORECASE)

    # 6. Proper nouns & biblical names
    for pattern, repl in PROPER_NOUNS_MAP.items():
        cleaned = re.sub(pattern, repl, cleaned, flags=re.IGNORECASE)

    # 7. Clean punctuation & spacing
    cleaned = clean_punctuation_and_spacing(cleaned)

    # 8. Sentence capitalization
    cleaned = capitalize_sentences(cleaned)

    # 9. Interrogative terminal punctuation:
    # If the text starts with a question word or ends with a tag question, ensure it ends with '?'
    first_word_match = re.match(r"^([A-Za-z]+)", cleaned)
    is_question = False
    if first_word_match:
        fw = first_word_match.group(1).lower()
        if fw in ("who", "what", "where", "when", "why", "how", "is", "are", "can", "could", "would", "do", "does", "did", "have", "has", "shall", "should", "will"):
            is_question = True

    # Tag questions at end of sentence (e.g. ", isn't it", ", right", ", don't you")
    tag_match = re.search(r",\s*(?:isn't|aren't|wasn't|weren't|don't|doesn't|didn't|can't|won't|is|are|right)\s+[a-zA-Z]+[.?]?$", cleaned, re.IGNORECASE)
    if tag_match or re.search(r",\s*right[.?]?$", cleaned, re.IGNORECASE):
        is_question = True

    if is_question:
        if cleaned.endswith((".", "!", ":", ";", ",")):
            cleaned = cleaned[:-1] + "?"
        elif not cleaned.endswith("?"):
            cleaned += "?"

    return cleaned


def polish_transcript_segments(
    segments: List[Dict[str, Any]],
    gemini_api_key: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Polishes a list of transcript segments while strictly preserving word-level
    start and end timestamps for animated word-pop and karaoke captions.
    
    Returns:
        (polished_segments, statistics)
    """
    if not segments:
        return [], {"segments_count": 0, "words_count": 0, "corrections_made": 0}

    total_corrections = 0
    total_words = 0
    polished_segments = []

    for seg in segments:
        orig_text = seg.get("text", "")
        polished_text = polish_sentence_grammar(orig_text)

        if polished_text != orig_text:
            total_corrections += 1

        # Polish word-level tokens while retaining timestamps
        orig_words = seg.get("words", [])
        total_words += len(orig_words)
        polished_words = []

        if orig_words:
            for w in orig_words:
                w_text = w.get("word", "")
                # Clean word individually
                cw = polish_sentence_grammar(w_text)
                
                # Copy word dict to prevent side-effects
                new_w = dict(w)
                new_w["word"] = cw
                polished_words.append(new_w)
        else:
            # If no word-level array exists, generate evenly spaced word timestamps from segment duration
            seg_start = float(seg.get("start", 0.0))
            seg_end = float(seg.get("end", seg_start + 1.0))
            words_in_text = polished_text.split()
            if words_in_text:
                step = (seg_end - seg_start) / max(1, len(words_in_text))
                for idx, wt in enumerate(words_in_text):
                    w_s = round(seg_start + idx * step, 2)
                    w_e = round(seg_start + (idx + 1) * step, 2)
                    polished_words.append({
                        "word": wt,
                        "start": w_s,
                        "end": w_e
                    })

        new_seg = dict(seg)
        new_seg["text"] = polished_text
        new_seg["words"] = polished_words
        polished_segments.append(new_seg)

    stats = {
        "segments_count": len(polished_segments),
        "words_count": total_words,
        "corrections_made": total_corrections
    }
    logger.info(f"Polished {len(polished_segments)} transcript segments ({total_corrections} segments corrected).")
    return polished_segments, stats
