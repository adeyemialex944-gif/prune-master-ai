import json
import re
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

# Niche keywords mapping for smart hashtag generation
KEYWORD_TAGS = {
    "faith": ["#faith", "#faithwalk", "#believe", "#trustgod", "#prayer"],
    "god": ["#godisgood", "#trustgod", "#wordofgod", "#blessed", "#grace"],
    "jesus": ["#jesus", "#jesussaves", "#gospel", "#christ", "#faith"],
    "mountain": ["#faithmovesmountains", "#breakthrough", "#overcome", "#miracle"],
    "prayer": ["#powerofprayer", "#prayertime", "#answeredprayer", "#praying"],
    "hope": ["#hope", "#encouragement", "#dontgiveup", "#strength"],
    "peace": ["#peaceofmind", "#innerpeace", "#rest", "#calm"],
    "purpose": ["#purpose", "#destiny", "#calling", "#motivation", "#focus"],
    "love": ["#loveunconditionally", "#kindness", "#compassion", "#grace"],
    "leadership": ["#leadership", "#wisdom", "#growthmindset", "#success"],
    "wisdom": ["#wordsofwisdom", "#truth", "#realtalk", "#insight"],
    "mindset": ["#mindsetshift", "#discipline", "#inspiration", "#lifelessons"],
    "healing": ["#healing", "#wholeness", "#restoration", "#restored"],
    "church": ["#sermon", "#churchonline", "#christianity", "#sundaymessage"],
}

DEFAULT_HASHTAGS = [
    "#shorts", "#reels", "#tiktok", "#viral", "#fyp",
    "#sermonclips", "#podcastclips", "#inspiration", "#motivation", "#dailywisdom"
]

CTA_TEMPLATES = [
    "📌 Save this reminder for when you need it most.",
    "👉 Share this message with someone who needs encouragement today!",
    "💬 Drop an 'AMEN' below if you receive this word today!",
    "❤️ Double-tap if this spoke directly to your heart.",
    "🔔 Follow for daily wisdom, sermon highlights, and inspiration."
]

def generate_offline_metadata(title: str, text: str) -> Dict[str, Any]:
    """
    100% Offline Rule-Based Social Media Metadata Generator.
    Analyzes spoken text, extracts themes, and generates multi-platform posts.
    """
    clean_text = text.strip() if text else title
    words = re.findall(r"\b[a-zA-Z]{3,}\b", clean_text.lower())
    
    # Extract matching niche hashtags
    matched_tags = []
    for w in set(words):
        if w in KEYWORD_TAGS:
            matched_tags.extend(KEYWORD_TAGS[w])
    
    # Deduplicate while preserving order
    seen = set()
    unique_tags = []
    for t in matched_tags + DEFAULT_HASHTAGS:
        if t.lower() not in seen:
            seen.add(t.lower())
            unique_tags.append(t)
    
    selected_tags = unique_tags[:12]
    tags_string = " ".join(selected_tags)
    
    # Extract punchy summary or key quote
    sentences = [s.strip() for s in re.split(r"[.!?]+", clean_text) if s.strip()]
    key_quote = sentences[0] if sentences else title
    if len(key_quote) > 120:
        key_quote = key_quote[:117] + "..."
    
    # Generate 4 high-converting Title variants
    hook_titles = [
        title,
        f"You need to hear this: \"{key_quote}\"",
        f"The truth about {words[0].capitalize() if words else 'this'} that changes everything",
        f"Stop scrolling and listen to this message 👇"
    ]
    
    # Platform-tailored descriptions
    youtube_description = f"""🔥 {title}

"{clean_text}"

{CTA_TEMPLATES[0]}

Subscribe for more life-changing sermon highlights, teachings, and daily wisdom!

{tags_string}
""".strip()

    reels_description = f"""✨ "{key_quote}"

{clean_text}

{CTA_TEMPLATES[1]}

{tags_string}
""".strip()

    tiktok_description = f"""{title} 💡 "{key_quote}" {CTA_TEMPLATES[2]} {tags_string}""".strip()

    facebook_description = f"""🔥 {title}

"{clean_text}"

👉 {CTA_TEMPLATES[1]}

{tags_string}
""".strip()

    x_post = f"""{hook_titles[0]}

"{key_quote}"

{CTA_TEMPLATES[4]}

#ClipMaster #Viral {selected_tags[0] if selected_tags else '#Trending'}""".strip()

    return {
        "source": "rule_based_offline",
        "key_quote": key_quote,
        "title_variations": hook_titles,
        "hashtags": selected_tags,
        "hashtags_string": tags_string,
        "platforms": {
            "youtube": {
                "name": "YouTube Shorts",
                "title": hook_titles[0],
                "description": youtube_description,
                "character_count": len(youtube_description)
            },
            "tiktok": {
                "name": "TikTok",
                "title": hook_titles[2],
                "description": tiktok_description,
                "character_count": len(tiktok_description)
            },
            "instagram": {
                "name": "Instagram Reels",
                "title": hook_titles[1],
                "description": reels_description,
                "character_count": len(reels_description)
            },
            "facebook": {
                "name": "Facebook Reels & Feed",
                "title": hook_titles[0],
                "description": facebook_description,
                "character_count": len(facebook_description)
            },
            "x": {
                "name": "X (Twitter)",
                "title": hook_titles[0],
                "description": x_post,
                "character_count": len(x_post)
            }
        },
        "call_to_action_options": CTA_TEMPLATES
    }


def generate_gemini_metadata(title: str, text: str, api_key: str) -> Optional[Dict[str, Any]]:
    """
    Enhanced Social Media Post Kit using Google Gemini API (if user provides key in Settings).
    Only sends the transcript snippet; never video or audio files.
    """
    if not api_key:
        return None
        
    prompt = f"""You are a world-class social media copywriter for viral short-form video (TikTok, Instagram Reels, YouTube Shorts).
Analyze this sermon/teaching snippet:
Title: {title}
Transcript text: "{text}"

Generate an JSON object strictly matching this schema:
{{
  "key_quote": "A 1-sentence memorable punchy quote from the text",
  "title_variations": [
    "Hook title 1 (high curiosity)",
    "Hook title 2 (dramatic question)",
    "Hook title 3 (bold statement)",
    "Hook title 4 (short & punchy)"
  ],
  "hashtags": ["#tag1", "#tag2", ... up to 10 relevant hashtags],
  "hashtags_string": "#tag1 #tag2 ...",
  "platforms": {{
    "youtube": {{
      "name": "YouTube Shorts",
      "title": "Best YouTube Short Title",
      "description": "Engaging description with call to action and hashtags"
    }},
    "tiktok": {{
      "name": "TikTok",
      "title": "Best TikTok Title",
      "description": "High retention TikTok caption with hashtags"
    }},
    "instagram": {{
      "name": "Instagram Reels",
      "title": "Best Reels Title",
      "description": "Emotional, relatable caption for Instagram with hashtags"
    }},
    "facebook": {{
      "name": "Facebook Reels & Feed",
      "title": "Best Facebook Title",
      "description": "Engaging Facebook caption prompting discussions and shares"
    }},
    "x": {{
      "name": "X (Twitter)",
      "title": "Best X Hook",
      "description": "Punchy post under 280 characters with hashtags"
    }}
  }},
  "call_to_action_options": [
    "CTA 1",
    "CTA 2",
    "CTA 3"
  ]
}}
Return ONLY valid JSON. No markdown backticks, no explanations.
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4}
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            result = json.loads(response.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if candidates:
                raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                raw_text = re.sub(r"^```json\s*", "", raw_text, flags=re.MULTILINE)
                raw_text = re.sub(r"^```\s*", "", raw_text, flags=re.MULTILINE)
                parsed = json.loads(raw_text.strip())
                parsed["source"] = "gemini_ai"
                return parsed
    except Exception as e:
        print(f"[metadata_service] Gemini API call error: {e}. Falling back to rule-based.")
        return None
    return None


def get_clip_social_metadata(title: str, text: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entrypoint: tries Gemini AI if key is present, otherwise returns robust offline metadata.
    """
    if api_key and api_key.strip():
        gemini_res = generate_gemini_metadata(title, text, api_key.strip())
        if gemini_res:
            return gemini_res
    return generate_offline_metadata(title, text)
