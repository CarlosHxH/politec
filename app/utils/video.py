import base64
from typing import Any, Dict, List, Optional

import cv2


def _parse_timestamp_to_seconds(timestamp: Optional[str]) -> Optional[float]:
    """
    Converts HH:MM:SS:MS strings to seconds (float).
    Returns None if parsing fails.
    """
    if not timestamp or not isinstance(timestamp, str):
        return None

    parts = timestamp.split(":")
    if len(parts) != 4:
        return None

    try:
        hours, minutes, seconds, millis = [int(part) for part in parts]
    except ValueError:
        return None

    total_seconds = hours * 3600 + minutes * 60 + seconds + (millis / 1000.0)
    return total_seconds


def extract_frame_base64(video_path: str, timestamp: Optional[str]) -> Optional[str]:
    """
    Extracts a single frame from the given video at the provided timestamp and returns it as base64.
    Falls back to the middle frame when the timestamp cannot be parsed.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    # Determine target frame index
    seconds = _parse_timestamp_to_seconds(timestamp)
    if seconds is not None:
        frame_index = int(seconds * fps)
    else:
        frame_index = total_frames // 2

    frame_index = max(0, min(max(total_frames - 1, 0), frame_index))

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    success, frame = cap.read()

    if not success:
        cap.release()
        return None

    success, buffer = cv2.imencode(".jpg", frame)
    cap.release()

    if not success:
        return None

    return base64.b64encode(buffer.tobytes()).decode("utf-8")


def enrich_with_best_frame_images(data: Any, video_path: str) -> Any:
    """
    Given the structured response from the AI, attach base64 best-frame previews
    for each parent and child entry.
    """
    if not data:
        return data

    def process_item(item: Dict[str, Any]) -> None:
        if not isinstance(item, dict):
            return

        image_b64 = extract_frame_base64(video_path, item.get("melhor_frame"))
        if image_b64:
            item["imagem"] = image_b64

        children: Optional[List[Dict[str, Any]]] = item.get("caracteristicas")
        if children:
            for child in children:
                process_item(child)

    if isinstance(data, list):
        for entry in data:
            process_item(entry)
    elif isinstance(data, dict):
        process_item(data)

    return data

