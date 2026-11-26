import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Load Haar cascades safely with multi-angle support (frontal, alt2, and profile)
_face_cascade = None
_alt2_cascade = None
_profile_cascade = None

try:
    if hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
        _front_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _alt2_path = cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
        _prof_path = cv2.data.haarcascades + "haarcascade_profileface.xml"
        
        _face_cascade = cv2.CascadeClassifier(_front_path)
        _alt2_cascade = cv2.CascadeClassifier(_alt2_path)
        _profile_cascade = cv2.CascadeClassifier(_prof_path)
    elif hasattr(cv2, 'CascadeClassifier'):
        _face_cascade = cv2.CascadeClassifier()
except Exception as e:
    logger.warning(f"Could not load Haar cascade classifiers: {e}")
    _face_cascade = None


def analyze_speaker_face_tracking(
    video_path: Path,
    start_time: float,
    end_time: float,
    sample_interval: float = 0.5,
    target_w: int = 1080,
    target_h: int = 1920,
    crop_x_percent: Optional[float] = None,
    framing_mode: str = "smart_face"
) -> Dict[str, Any]:
    """
    Advanced Multi-Speaker & Active Speaker Auto-Centering System.
    
    1. Scans video frames with high-accuracy CLAHE-enhanced multi-cascade detection.
    2. Multi-cascade detection (frontal, alt2, profile, and flipped profile)
       tracks speakers even when turning their head sideways or in wide stage shots.
    3. Measures mouth movement / optical motion energy across detected faces
       to prioritize the active human speaker over audience or stage props.
    4. Automatically filters out bottom-third audience heads and top corner logos.
    5. Dynamically tracks speaker movement across stage with smooth cinematic pans.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        logger.warning(f"Could not open video {video_path} for face tracking.")
        return {"mode": "fallback_center", "crop_x": None, "crop_x_percent": 50.0, "detections_count": 0}

    total_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Calculate 9:16 crop box in source dimensions
    crop_h = orig_h
    crop_w = int(orig_h * 9 / 16)
    
    # Ensure crop_w is even for FFmpeg
    if crop_w % 2 != 0:
        crop_w -= 1

    max_x = max(0, orig_w - crop_w)
    fallback_center_x = max_x // 2
    if fallback_center_x % 2 != 0:
        fallback_center_x -= 1

    # If video is already vertical or narrower than 9:16
    if orig_w <= crop_w:
        cap.release()
        return {
            "mode": "fit_native",
            "orig_w": orig_w,
            "orig_h": orig_h,
            "crop_w": orig_w,
            "crop_h": orig_h,
            "crop_x": 0,
            "crop_x_percent": 50.0,
            "speaker_center_x": orig_w // 2,
            "detections_count": 0,
            "speaker_count": 1,
            "filter_crop": f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd"
        }

    # Only apply explicit manual crop override if the user explicitly chose manual crop
    if crop_x_percent is not None and framing_mode in ("crop", "manual"):
        cap.release()
        pct = max(0.0, min(100.0, float(crop_x_percent)))
        user_crop_x = int(max_x * (pct / 100.0))
        if user_crop_x % 2 != 0:
            user_crop_x -= 1
        user_crop_x = max(0, min(max_x, user_crop_x))
        speaker_cx = user_crop_x + (crop_w // 2)
        logger.info(f"Using manual user-specified framing: {pct}% -> crop_x={user_crop_x}px")
        return {
            "mode": "manual_framing",
            "orig_w": orig_w,
            "orig_h": orig_h,
            "crop_w": crop_w,
            "crop_h": crop_h,
            "crop_x": user_crop_x,
            "crop_x_percent": pct,
            "speaker_center_x": speaker_cx,
            "detections_count": 0,
            "speaker_count": 1,
            "filter_crop": f"crop={crop_w}:{crop_h}:{user_crop_x}:0,scale={target_w}:{target_h}:flags=lanczos+accurate_rnd"
        }

    duration = max(0.5, end_time - start_time)
    # Sample keyframes across clip duration (up to 24 samples for smooth motion tracking)
    eff_interval = max(sample_interval, duration / 24.0)
    num_samples = int(duration / eff_interval) + 1
    sample_times = [min(end_time, start_time + i * eff_interval) for i in range(num_samples)]

    # High-accuracy 960px scan width + CLAHE ensures faces in stage lighting/distance are recognized
    scale_factor = 960.0 / max(1, orig_w)
    small_w = 960
    small_h = max(360, int(orig_h * scale_factor))
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    # Raw observations: list of {rel_t, faces: [{center_x, y, w, h, mouth_motion, score}]}
    observations: List[Dict[str, Any]] = []
    motion_centers: List[int] = []

    try:
        for t in sample_times:
            rel_t = round(t - start_time, 2)
            frame_num = int(t * total_fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            small_gray = cv2.resize(gray, (small_w, small_h), interpolation=cv2.INTER_AREA)
            eq_small = clahe.apply(small_gray)

            # Sample secondary frame 0.12s later to measure mouth & body motion dynamics
            t2 = min(end_time, t + 0.12)
            frame_num2 = int(t2 * total_fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num2)
            ret2, frame2 = cap.read()
            if ret2 and frame2 is not None:
                gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
                small_gray2 = cv2.resize(gray2, (small_w, small_h), interpolation=cv2.INTER_AREA)
            else:
                small_gray2 = small_gray

            # Compute full frame motion centroid (reliable backup when speaker is in deep shadow)
            frame_diff = cv2.absdiff(small_gray, small_gray2)
            _, diff_thresh = cv2.threshold(frame_diff, 18, 255, cv2.THRESH_BINARY)
            # Mask out audience/camera movement in bottom 30%
            diff_thresh[int(small_h * 0.70):, :] = 0
            m = cv2.moments(diff_thresh)
            if m["m00"] > 100:
                mcx = int((m["m10"] / m["m00"]) / scale_factor)
                motion_centers.append(mcx)

            # Multi-angle face candidate collection with CLAHE enhancement
            raw_candidates: List[Tuple[int, int, int, int, str]] = []

            # 1. Frontal cascade default
            if _face_cascade is not None:
                f1 = _face_cascade.detectMultiScale(
                    eq_small,
                    scaleFactor=1.06,
                    minNeighbors=3,
                    minSize=(int(small_h * 0.05), int(small_h * 0.05))
                )
                for (fx, fy, fw, fh) in f1:
                    raw_candidates.append((fx, fy, fw, fh, "frontal"))

            # 2. Alt2 cascade (if frontal missed)
            if len(raw_candidates) == 0 and _alt2_cascade is not None:
                f2 = _alt2_cascade.detectMultiScale(
                    eq_small,
                    scaleFactor=1.06,
                    minNeighbors=3,
                    minSize=(int(small_h * 0.05), int(small_h * 0.05))
                )
                for (fx, fy, fw, fh) in f2:
                    raw_candidates.append((fx, fy, fw, fh, "alt2"))

            # 3. Profile cascade (left profile & flipped right profile)
            if _profile_cascade is not None:
                f_prof = _profile_cascade.detectMultiScale(
                    eq_small,
                    scaleFactor=1.06,
                    minNeighbors=3,
                    minSize=(int(small_h * 0.05), int(small_h * 0.05))
                )
                for (fx, fy, fw, fh) in f_prof:
                    raw_candidates.append((fx, fy, fw, fh, "profile_left"))

                flipped_eq = cv2.flip(eq_small, 1)
                f_prof_flip = _profile_cascade.detectMultiScale(
                    flipped_eq,
                    scaleFactor=1.06,
                    minNeighbors=3,
                    minSize=(int(small_h * 0.05), int(small_h * 0.05))
                )
                for (fx, fy, fw, fh) in f_prof_flip:
                    orig_fx = small_w - (fx + fw)
                    raw_candidates.append((orig_fx, fy, fw, fh, "profile_right"))

            frame_faces = []
            for (fx, fy, fw, fh, model_name) in raw_candidates:
                # Map back to original coordinates
                orig_face_cx = int((fx + (fw // 2)) / scale_factor)
                orig_face_cy = int((fy + (fh // 2)) / scale_factor)
                orig_face_w = int(fw / scale_factor)
                orig_face_h = int(fh / scale_factor)

                # Audience filter: discard faces detected in bottom 35% of the frame (seated audience/hands)
                if orig_face_cy > orig_h * 0.65:
                    continue
                # Watermark/Logo filter: discard extreme top 5%
                if orig_face_cy < orig_h * 0.05:
                    continue

                # Measure mouth/facial motion energy
                mouth_y1 = min(small_h - 1, fy + int(fh * 0.50))
                mouth_y2 = min(small_h, fy + fh)
                mouth_x1 = max(0, fx + int(fw * 0.15))
                mouth_x2 = min(small_w, fx + int(fw * 0.85))

                motion_energy = 0.0
                if mouth_y2 > mouth_y1 and mouth_x2 > mouth_x1:
                    m1 = small_gray[mouth_y1:mouth_y2, mouth_x1:mouth_x2]
                    m2 = small_gray2[mouth_y1:mouth_y2, mouth_x1:mouth_x2]
                    if m1.shape == m2.shape and m1.size > 0:
                        diff = cv2.absdiff(m1, m2)
                        motion_energy = float(np.mean(diff))

                # Vertical positioning factor: favor upper 15%-55% (natural speaker head height)
                vertical_factor = 1.0 - abs(orig_face_cy - (orig_h * 0.35)) / (orig_h * 0.35)
                vertical_factor = max(0.2, min(1.3, vertical_factor))

                # Score: motion energy + size + vertical centrality
                score = (motion_energy * 3.0) + (fw * fh / (small_w * small_h) * 20.0 * vertical_factor)

                frame_faces.append({
                    "center_x": orig_face_cx,
                    "center_y": orig_face_cy,
                    "w": orig_face_w,
                    "h": orig_face_h,
                    "mouth_motion": motion_energy,
                    "score": score,
                    "model": model_name
                })

            if frame_faces:
                observations.append({
                    "rel_t": rel_t,
                    "faces": frame_faces
                })
    except Exception as e:
        logger.error(f"Error during speaker face tracking scan: {e}")
    finally:
        cap.release()

    # -------------------------------------------------------------------------
    # FALLBACK: If no faces were detected, check optical motion centroid
    # -------------------------------------------------------------------------
    if not observations:
        if motion_centers:
            median_motion_x = int(np.median(motion_centers))
            ideal_crop_x = max(0, min(max_x, median_motion_x - (crop_w // 2)))
            if ideal_crop_x % 2 != 0:
                ideal_crop_x -= 1
            computed_percent = round((ideal_crop_x / max(1, max_x)) * 100.0, 1)
            logger.info(f"Face tracking: using optical motion centroid @ X={median_motion_x} (crop_x={ideal_crop_x}).")
            return {
                "mode": "motion_center",
                "orig_w": orig_w,
                "orig_h": orig_h,
                "crop_w": crop_w,
                "crop_h": crop_h,
                "crop_x": ideal_crop_x,
                "crop_x_percent": computed_percent,
                "speaker_center_x": median_motion_x,
                "detections_count": 0,
                "speaker_count": 1,
                "filter_crop": f"crop={crop_w}:{crop_h}:{ideal_crop_x}:0,scale={target_w}:{target_h}:flags=lanczos+accurate_rnd"
            }

        logger.info("Face tracking: no faces or motion detected. Using fallback center crop.")
        return {
            "mode": "standard_center",
            "orig_w": orig_w,
            "orig_h": orig_h,
            "crop_w": crop_w,
            "crop_h": crop_h,
            "crop_x": fallback_center_x,
            "crop_x_percent": 50.0,
            "speaker_center_x": orig_w // 2,
            "detections_count": 0,
            "speaker_count": 0,
            "filter_crop": f"crop={crop_w}:{crop_h}:{fallback_center_x}:0,scale={target_w}:{target_h}:flags=lanczos+accurate_rnd"
        }

    # -------------------------------------------------------------------------
    # Spatial Clustering: Check if there are 2 distinct speakers in scene
    # -------------------------------------------------------------------------
    all_face_centers = [f["center_x"] for obs in observations for f in obs["faces"]]
    min_dist_between_speakers = orig_w * 0.16

    left_cluster = [x for x in all_face_centers if x < orig_w * 0.50]
    right_cluster = [x for x in all_face_centers if x >= orig_w * 0.50]

    is_two_speaker_scene = False
    speaker_candidates: List[int] = []

    if left_cluster and right_cluster:
        median_left = int(np.median(left_cluster))
        median_right = int(np.median(right_cluster))
        if (median_right - median_left) >= min_dist_between_speakers:
            obs_with_two = sum(1 for obs in observations if len(obs["faces"]) >= 2)
            if obs_with_two >= max(2, len(observations) * 0.25):
                is_two_speaker_scene = True
                speaker_candidates = [median_left, median_right]
                logger.info(
                    f"Multi-speaker scene detected! Person A @ X={median_left}, Person B @ X={median_right} "
                    f"(separation: {median_right - median_left}px)."
                )

    def build_crop_expr(timeline: List[Dict[str, Any]], default_x: int) -> str:
        if not timeline:
            return str(default_x)
        if len(timeline) == 1:
            return str(timeline[0]["x"])

        expr = str(timeline[-1]["x"])
        for seg in reversed(timeline[:-1]):
            t_end = seg["t_end"]
            x_val = seg["x"]
            if "next_x" in seg and "pan_duration" in seg:
                p_dur = seg["pan_duration"]
                p_start = t_end
                p_end = p_start + p_dur
                x_next = seg["next_x"]
                pan_calc = f"({x_val}+({x_next}-{x_val})*(t-{p_start:.2f})/{p_dur:.2f})"
                expr = f"if(lt(t,{p_start:.2f}),{x_val},if(lt(t,{p_end:.2f}),{pan_calc},{expr}))"
            else:
                expr = f"if(lt(t,{t_end:.2f}),{x_val},{expr})"
        return expr

    # -------------------------------------------------------------------------
    # SINGLE SPEAKER SCENE: Smart Centering & Dynamic Trajectory Smoothing
    # -------------------------------------------------------------------------
    if not is_two_speaker_scene:
        keyframe_obs = []
        for obs in observations:
            primary_face = max(obs["faces"], key=lambda f: f.get("score", 0.0))
            fcx = primary_face["center_x"]
            cx = max(0, min(max_x, fcx - (crop_w // 2)))
            if cx % 2 != 0:
                cx -= 1
            keyframe_obs.append({
                "rel_t": obs["rel_t"],
                "face_x": fcx,
                "crop_x": cx,
                "score": primary_face.get("score", 0.0)
            })

        all_xs = [k["crop_x"] for k in keyframe_obs]
        median_speaker_x = int(np.median([k["face_x"] for k in keyframe_obs]))
        ideal_crop_x = max(0, min(max_x, median_speaker_x - (crop_w // 2)))
        if ideal_crop_x % 2 != 0:
            ideal_crop_x -= 1

        x_spread = max(all_xs) - min(all_xs) if all_xs else 0
        computed_percent = round((ideal_crop_x / max(1, max_x)) * 100.0, 1)

        # Dynamic Camera Tracking: If speaker moves > 6% of frame width across keyframes,
        # generate piecewise smooth cinematic pans!
        if x_spread > (orig_w * 0.06) and len(keyframe_obs) >= 3:
            min_dwell = 1.4
            smoothed_timeline: List[Dict[str, Any]] = []
            curr_x = keyframe_obs[0]["crop_x"]
            seg_start = 0.0

            for i in range(1, len(keyframe_obs)):
                t = keyframe_obs[i]["rel_t"]
                k_x = keyframe_obs[i]["crop_x"]
                if abs(k_x - curr_x) > (orig_w * 0.05):
                    if (t - seg_start) >= min_dwell:
                        smoothed_timeline.append({
                            "t_start": seg_start,
                            "t_end": t,
                            "x": curr_x
                        })
                        curr_x = k_x
                        seg_start = t

            smoothed_timeline.append({
                "t_start": seg_start,
                "t_end": round(duration, 2),
                "x": curr_x
            })

            pan_dur = 0.75
            for i in range(len(smoothed_timeline) - 1):
                seg = smoothed_timeline[i]
                next_seg = smoothed_timeline[i + 1]
                if seg["x"] != next_seg["x"]:
                    seg["pan_duration"] = pan_dur
                    seg["next_x"] = next_seg["x"]

            dynamic_x_expr = build_crop_expr(smoothed_timeline, ideal_crop_x)
            filter_expr = f"crop={crop_w}:{crop_h}:'{dynamic_x_expr}':0,scale={target_w}:{target_h}:flags=lanczos+accurate_rnd"
            logger.info(f"Single speaker tracking: dynamic cinematic pan across {len(smoothed_timeline)} segments (spread={x_spread}px).")

            return {
                "mode": "dynamic_pan",
                "speaker_count": 1,
                "orig_w": orig_w,
                "orig_h": orig_h,
                "crop_w": crop_w,
                "crop_h": crop_h,
                "crop_x": ideal_crop_x,
                "crop_x_percent": computed_percent,
                "speaker_center_x": median_speaker_x,
                "fallback_center_x": fallback_center_x,
                "detections_count": len(keyframe_obs),
                "keyframe_crops": [{"t": k["rel_t"], "x": k["crop_x"], "crop_x_percent": round((k["crop_x"] / max(1, max_x)) * 100, 1)} for k in keyframe_obs],
                "filter_crop": filter_expr
            }

        filter_expr = f"crop={crop_w}:{crop_h}:{ideal_crop_x}:0,scale={target_w}:{target_h}:flags=lanczos+accurate_rnd"
        logger.info(f"Single speaker tracking: centered at speaker X={median_speaker_x} (crop_x={ideal_crop_x}, {computed_percent}%).")

        return {
            "mode": "smart_center",
            "speaker_count": 1,
            "orig_w": orig_w,
            "orig_h": orig_h,
            "crop_w": crop_w,
            "crop_h": crop_h,
            "crop_x": ideal_crop_x,
            "crop_x_percent": computed_percent,
            "speaker_center_x": median_speaker_x,
            "fallback_center_x": fallback_center_x,
            "detections_count": len(keyframe_obs),
            "keyframe_crops": [{"t": k["rel_t"], "x": k["crop_x"], "crop_x_percent": round((k["crop_x"] / max(1, max_x)) * 100, 1)} for k in keyframe_obs],
            "filter_crop": filter_expr
        }

    # -------------------------------------------------------------------------
    # MULTI-SPEAKER SCENE: Active Speaker Detection & Dynamic Centering
    # -------------------------------------------------------------------------
    spk_A_x, spk_B_x = speaker_candidates[0], speaker_candidates[1]
    
    crop_x_A = max(0, min(max_x, spk_A_x - (crop_w // 2)))
    if crop_x_A % 2 != 0:
        crop_x_A -= 1
        
    crop_x_B = max(0, min(max_x, spk_B_x - (crop_w // 2)))
    if crop_x_B % 2 != 0:
        crop_x_B -= 1

    active_speaker_history: List[Tuple[float, int]] = []
    current_active = 0

    for obs in observations:
        t = obs["rel_t"]
        faces = obs["faces"]

        motion_A = 0.0
        motion_B = 0.0

        for f in faces:
            dist_to_A = abs(f["center_x"] - spk_A_x)
            dist_to_B = abs(f["center_x"] - spk_B_x)
            if dist_to_A < dist_to_B:
                motion_A = max(motion_A, f.get("mouth_motion", 0.0))
            else:
                motion_B = max(motion_B, f.get("mouth_motion", 0.0))

        if motion_A > (motion_B * 1.35) and motion_A > 2.0:
            current_active = 0
        elif motion_B > (motion_A * 1.35) and motion_B > 2.0:
            current_active = 1

        active_speaker_history.append((t, current_active))

    min_dwell = 1.4
    smoothed_timeline: List[Dict[str, Any]] = []

    if active_speaker_history:
        curr_speaker = active_speaker_history[0][1]
        seg_start = 0.0

        for i in range(1, len(active_speaker_history)):
            t, spk = active_speaker_history[i]
            if spk != curr_speaker:
                if (t - seg_start) >= min_dwell:
                    smoothed_timeline.append({
                        "speaker": curr_speaker,
                        "t_start": seg_start,
                        "t_end": t,
                        "x": crop_x_A if curr_speaker == 0 else crop_x_B
                    })
                    curr_speaker = spk
                    seg_start = t

        smoothed_timeline.append({
            "speaker": curr_speaker,
            "t_start": seg_start,
            "t_end": duration,
            "x": crop_x_A if curr_speaker == 0 else crop_x_B
        })
    else:
        smoothed_timeline.append({
            "speaker": 0,
            "t_start": 0.0,
            "t_end": duration,
            "x": crop_x_A
        })

    pan_dur = 0.65
    for i in range(len(smoothed_timeline) - 1):
        seg = smoothed_timeline[i]
        next_seg = smoothed_timeline[i + 1]
        if seg["x"] != next_seg["x"]:
            seg["pan_duration"] = pan_dur
            seg["next_x"] = next_seg["x"]

    dynamic_x_expr = build_crop_expr(smoothed_timeline, crop_x_A)
    switches_count = max(0, len(smoothed_timeline) - 1)
    logger.info(
        f"Multi-speaker active director complete: {switches_count} speaker transitions across {duration:.1f}s."
    )

    filter_expr = f"crop={crop_w}:{crop_h}:'{dynamic_x_expr}':0,scale={target_w}:{target_h}:flags=lanczos+accurate_rnd"
    computed_percent = round((crop_x_A / max(1, max_x)) * 100.0, 1)

    return {
        "mode": "multi_speaker_director",
        "speaker_count": 2,
        "speakers": [
            {"label": "Speaker 1 (Left)", "face_center_x": spk_A_x, "crop_x": crop_x_A},
            {"label": "Speaker 2 (Right)", "face_center_x": spk_B_x, "crop_x": crop_x_B}
        ],
        "switches_count": switches_count,
        "orig_w": orig_w,
        "orig_h": orig_h,
        "crop_w": crop_w,
        "crop_h": crop_h,
        "crop_x": crop_x_A,
        "crop_x_percent": computed_percent,
        "speaker_center_x": spk_A_x,
        "fallback_center_x": fallback_center_x,
        "detections_count": len(all_face_centers),
        "filter_crop": filter_expr
    }
