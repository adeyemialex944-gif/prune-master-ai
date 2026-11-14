import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Load Haar cascade once
_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_face_cascade = cv2.CascadeClassifier(_cascade_path)


def analyze_speaker_face_tracking(
    video_path: Path,
    start_time: float,
    end_time: float,
    sample_interval: float = 0.5,
    target_w: int = 1080,
    target_h: int = 1920
) -> Dict[str, Any]:
    """
    Advanced Multi-Speaker & Active Speaker Auto-Centering System.
    
    1. Scans video frames at fine intervals using downscaled OpenCV detection.
    2. Measures mouth movement / optical motion energy across detected faces.
    3. Detects if the scene contains 2 people (e.g. podcasts, interviews, sermons).
    4. Automatically identifies who is actively speaking at any point in time.
    5. Dynamically centers the 9:16 vertical frame on whoever is currently speaking,
       with smooth cinematic camera pans when the speaker changes!
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        logger.warning(f"Could not open video {video_path} for face tracking.")
        return {"mode": "fallback_center", "crop_x": None, "detections_count": 0}

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
            "detections_count": 0,
            "speaker_count": 1,
            "filter_crop": f"scale={target_w}:{target_h}"
        }

    duration = max(0.5, end_time - start_time)
    num_samples = int(duration / sample_interval) + 1
    sample_times = [min(end_time, start_time + i * sample_interval) for i in range(num_samples)]

    scale_factor = 480.0 / max(1, orig_w)
    small_w = 480
    small_h = max(270, int(orig_h * scale_factor))

    # Raw observations: list of {rel_t, faces: [{center_x, y, w, h, mouth_motion}]}
    observations: List[Dict[str, Any]] = []

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

            # Sample secondary frame 0.12s later to measure mouth motion dynamics
            t2 = min(end_time, t + 0.12)
            frame_num2 = int(t2 * total_fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num2)
            ret2, frame2 = cap.read()
            if ret2 and frame2 is not None:
                gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
                small_gray2 = cv2.resize(gray2, (small_w, small_h), interpolation=cv2.INTER_AREA)
            else:
                small_gray2 = small_gray

            # Detect faces on downscaled frame
            detected_faces = _face_cascade.detectMultiScale(
                small_gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(int(small_h * 0.08), int(small_h * 0.08))
            )

            frame_faces = []
            for (fx, fy, fw, fh) in detected_faces:
                # Map back to original coordinate system
                orig_face_cx = int((fx + (fw // 2)) / scale_factor)
                orig_face_w = int(fw / scale_factor)
                orig_face_h = int(fh / scale_factor)

                # Extract mouth bounding box in small_gray
                mouth_y1 = min(small_h - 1, fy + int(fh * 0.62))
                mouth_y2 = min(small_h, fy + fh)
                mouth_x1 = max(0, fx + int(fw * 0.22))
                mouth_x2 = min(small_w, fx + int(fw * 0.78))

                motion_energy = 0.0
                if mouth_y2 > mouth_y1 and mouth_x2 > mouth_x1:
                    m1 = small_gray[mouth_y1:mouth_y2, mouth_x1:mouth_x2]
                    m2 = small_gray2[mouth_y1:mouth_y2, mouth_x1:mouth_x2]
                    if m1.shape == m2.shape and m1.size > 0:
                        diff = cv2.absdiff(m1, m2)
                        motion_energy = float(np.mean(diff))

                frame_faces.append({
                    "center_x": orig_face_cx,
                    "w": orig_face_w,
                    "h": orig_face_h,
                    "mouth_motion": motion_energy
                })

            if frame_faces:
                observations.append({
                    "rel_t": rel_t,
                    "faces": frame_faces
                })
    except Exception as e:
        logger.error(f"Error during multi-speaker face tracking scan: {e}")
    finally:
        cap.release()

    if not observations:
        logger.info("Face tracking: no faces detected. Using fallback center crop.")
        return {
            "mode": "standard_center",
            "orig_w": orig_w,
            "orig_h": orig_h,
            "crop_w": crop_w,
            "crop_h": crop_h,
            "crop_x": fallback_center_x,
            "detections_count": 0,
            "speaker_count": 0,
            "filter_crop": f"crop={crop_w}:{crop_h}:{fallback_center_x}:0,scale={target_w}:{target_h}"
        }

    # -------------------------------------------------------------------------
    # Spatial Clustering: Determine if there are 2 people in the short
    # -------------------------------------------------------------------------
    all_face_centers = [f["center_x"] for obs in observations for f in obs["faces"]]
    min_dist_between_speakers = orig_w * 0.16

    # Look for two distinct spatial clusters along horizontal axis
    left_cluster = [x for x in all_face_centers if x < orig_w * 0.50]
    right_cluster = [x for x in all_face_centers if x >= orig_w * 0.50]

    is_two_speaker_scene = False
    speaker_candidates: List[int] = []

    if left_cluster and right_cluster:
        median_left = int(np.median(left_cluster))
        median_right = int(np.median(right_cluster))
        if (median_right - median_left) >= min_dist_between_speakers:
            # Check representation in observations
            obs_with_two = sum(1 for obs in observations if len(obs["faces"]) >= 2)
            if obs_with_two >= max(2, len(observations) * 0.20):
                is_two_speaker_scene = True
                speaker_candidates = [median_left, median_right]
                logger.info(
                    f"Multi-speaker scene detected! Person A @ X={median_left}, Person B @ X={median_right} "
                    f"(separation: {median_right - median_left}px)."
                )

    # -------------------------------------------------------------------------
    # SINGLE SPEAKER SCENE: Standard smart centering or subtle tracking
    # -------------------------------------------------------------------------
    if not is_two_speaker_scene:
        # Convert detected face centers to crop offsets
        crop_x_values = []
        for obs in observations:
            primary_face = max(obs["faces"], key=lambda f: f["w"] * f["h"])
            ideal_crop_x = primary_face["center_x"] - (crop_w // 2)
            clamped_crop_x = max(0, min(max_x, ideal_crop_x))
            if clamped_crop_x % 2 != 0:
                clamped_crop_x -= 1
            crop_x_values.append((obs["rel_t"], clamped_crop_x))

        x_coords = [x for _, x in crop_x_values]
        median_crop_x = int(np.median(x_coords))
        if median_crop_x % 2 != 0:
            median_crop_x -= 1

        start_x = crop_x_values[0][1]
        end_x = crop_x_values[-1][1]
        movement_dist = abs(end_x - start_x)

        if movement_dist > (orig_w * 0.14) and len(crop_x_values) >= 3:
            logger.info(f"Single speaker tracking: camera smooth pan ({movement_dist}px movement).")
            filter_expr = (
                f"crop={crop_w}:{crop_h}:"
                f"'min(max({start_x}+({end_x}-{start_x})*t/{duration:.2f},0),{max_x})':0,"
                f"scale={target_w}:{target_h}"
            )
            mode = "smart_pan"
        else:
            logger.info(f"Single speaker tracking: locked center at X={median_crop_x}.")
            filter_expr = f"crop={crop_w}:{crop_h}:{median_crop_x}:0,scale={target_w}:{target_h}"
            mode = "smart_center"

        return {
            "mode": mode,
            "speaker_count": 1,
            "orig_w": orig_w,
            "orig_h": orig_h,
            "crop_w": crop_w,
            "crop_h": crop_h,
            "crop_x": median_crop_x,
            "fallback_center_x": fallback_center_x,
            "detections_count": len(all_face_centers),
            "filter_crop": filter_expr
        }

    # -------------------------------------------------------------------------
    # MULTI-SPEAKER SCENE: Active Speaker Detection & Dynamic Centering
    # -------------------------------------------------------------------------
    spk_A_x, spk_B_x = speaker_candidates[0], speaker_candidates[1]
    
    # Calculate crop center offsets for each speaker
    crop_x_A = max(0, min(max_x, spk_A_x - (crop_w // 2)))
    if crop_x_A % 2 != 0:
        crop_x_A -= 1
        
    crop_x_B = max(0, min(max_x, spk_B_x - (crop_w // 2)))
    if crop_x_B % 2 != 0:
        crop_x_B -= 1

    # Classify active speaker at each observation timestamp
    active_speaker_history: List[Tuple[float, int]] = []  # (rel_t, speaker_index: 0 or 1)
    current_active = 0

    for obs in observations:
        t = obs["rel_t"]
        faces = obs["faces"]

        motion_A = 0.0
        motion_B = 0.0

        for f in faces:
            # Assign face to candidate A or B based on proximity
            dist_to_A = abs(f["center_x"] - spk_A_x)
            dist_to_B = abs(f["center_x"] - spk_B_x)
            if dist_to_A < dist_to_B:
                motion_A = max(motion_A, f.get("mouth_motion", 0.0))
            else:
                motion_B = max(motion_B, f.get("mouth_motion", 0.0))

        # Check who has noticeably higher speech/lip motion
        if motion_A > (motion_B * 1.35) and motion_A > 2.0:
            current_active = 0
        elif motion_B > (motion_A * 1.35) and motion_B > 2.0:
            current_active = 1
        # Else retain previous active speaker to prevent micro-flickering

        active_speaker_history.append((t, current_active))

    # Apply temporal smoothing / minimum dwell time (at least 1.4s per speaker)
    min_dwell = 1.4
    smoothed_timeline: List[Dict[str, Any]] = []

    if active_speaker_history:
        curr_speaker = active_speaker_history[0][1]
        seg_start = 0.0

        for i in range(1, len(active_speaker_history)):
            t, spk = active_speaker_history[i]
            if spk != curr_speaker:
                # Check if current segment satisfies minimum dwell
                if (t - seg_start) >= min_dwell:
                    smoothed_timeline.append({
                        "speaker": curr_speaker,
                        "t_start": seg_start,
                        "t_end": t,
                        "x": crop_x_A if curr_speaker == 0 else crop_x_B
                    })
                    curr_speaker = spk
                    seg_start = t

        # Append final segment
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

    # Add smooth pan transitions (0.6s) between speaker cuts
    pan_dur = 0.65
    for i in range(len(smoothed_timeline) - 1):
        seg = smoothed_timeline[i]
        next_seg = smoothed_timeline[i + 1]
        if seg["x"] != next_seg["x"]:
            # Adjust segment end to include camera pan
            seg["pan_duration"] = pan_dur
            seg["next_x"] = next_seg["x"]

    # Construct the piecewise FFmpeg dynamic crop expression
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

    dynamic_x_expr = build_crop_expr(smoothed_timeline, crop_x_A)
    switches_count = max(0, len(smoothed_timeline) - 1)
    logger.info(
        f"Multi-speaker active director complete: {switches_count} speaker transitions across {duration:.1f}s."
    )

    filter_expr = f"crop={crop_w}:{crop_h}:'{dynamic_x_expr}':0,scale={target_w}:{target_h}"

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
        "fallback_center_x": fallback_center_x,
        "detections_count": len(all_face_centers),
        "filter_crop": filter_expr
    }
