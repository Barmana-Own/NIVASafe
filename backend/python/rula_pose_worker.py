"""One local CPU pose inference. Image bytes enter through stdin and never persist.

The TypeScript adapter owns authorization, process timeout and concurrency.
Only the pinned local MediaPipe runtime and a hash-verified local model are used.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import importlib.metadata
import io
import json
import math
import pathlib
import re
import sys
import warnings

PROTOCOL = "nivasafe-rula-pose-v1"
MEDIAPIPE_VERSION = "0.10.32"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_INPUT_BYTES = 14 * 1024 * 1024
MAX_IMAGE_SIDE = 16_384
MAX_IMAGE_PIXELS = 24_000_000
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
LANDMARK_NAMES = (
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer", "left_ear",
    "right_ear", "mouth_left", "mouth_right", "left_shoulder",
    "right_shoulder", "left_elbow", "right_elbow", "left_wrist",
    "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip",
    "right_hip", "left_knee", "right_knee", "left_ankle",
    "right_ankle", "left_heel", "right_heel", "left_foot_index",
    "right_foot_index",
)


class WorkerInputError(ValueError):
    """The request is invalid; messages are fixed codes, never image contents."""


def require_keys(value: object, expected: set[str]) -> dict:
    if not isinstance(value, dict) or set(value) != expected:
        raise WorkerInputError("INVALID_ENVELOPE")
    return value


def parse_request(data: bytes) -> tuple[str, bytes, int, int]:
    if not data or len(data) > MAX_INPUT_BYTES:
        raise WorkerInputError("INPUT_SIZE_LIMIT")
    try:
        request = json.loads(data)
    except (ValueError, UnicodeDecodeError):
        raise WorkerInputError("INVALID_JSON") from None
    require_keys(request, {"protocol", "requestId", "image"})
    request_id = request["requestId"]
    if request["protocol"] != PROTOCOL or not isinstance(request_id, str):
        raise WorkerInputError("INVALID_PROTOCOL")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", request_id):
        raise WorkerInputError("INVALID_REQUEST_ID")
    image = require_keys(request["image"], {"mimeType", "base64", "width", "height"})
    width, height = image["width"], image["height"]
    if any(type(side) is not int or not 1 <= side <= MAX_IMAGE_SIDE for side in (width, height)):
        raise WorkerInputError("INVALID_DIMENSIONS")
    if width * height > MAX_IMAGE_PIXELS:
        raise WorkerInputError("IMAGE_PIXEL_LIMIT")
    encoded = image["base64"]
    if image["mimeType"] != "image/png" or not isinstance(encoded, str):
        raise WorkerInputError("INVALID_IMAGE_TYPE")
    if len(encoded) > (MAX_IMAGE_BYTES + 2) // 3 * 4:
        raise WorkerInputError("IMAGE_SIZE_LIMIT")
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise WorkerInputError("INVALID_BASE64") from None
    if len(image_bytes) > MAX_IMAGE_BYTES or not image_bytes.startswith(PNG_SIGNATURE):
        raise WorkerInputError("INVALID_PNG")
    return request_id, image_bytes, width, height


def verify_model(model_path: str, expected_sha256: str) -> pathlib.Path:
    path = pathlib.Path(model_path)
    if not path.is_absolute() or not re.fullmatch(r"[0-9a-fA-F]{64}", expected_sha256):
        raise WorkerInputError("INVALID_MODEL_CONFIG")
    if not path.is_file() or not 1 <= path.stat().st_size <= 64 * 1024 * 1024:
        raise WorkerInputError("INVALID_MODEL_FILE")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected_sha256.lower():
        raise WorkerInputError("MODEL_HASH_MISMATCH")
    return path


def normalized_landmark(name: str, point: object) -> dict | None:
    values = (point.x, point.y, point.visibility, point.presence)
    if any(not isinstance(value, (int, float)) or not math.isfinite(value) for value in values):
        return None
    if any(not 0 <= value <= 1 for value in values):
        # An out-of-frame prediction is missing; moving it onto an edge would
        # create a false anatomical observation.
        return None
    return dict(zip(("name", "x", "y", "visibility", "presence"), (name, *values)))


def infer(image_bytes: bytes, width: int, height: int, model_path: pathlib.Path) -> list[dict]:
    # Reject accidental upgrades to runtimes that introduce usage logging.
    if importlib.metadata.version("mediapipe") != MEDIAPIPE_VERSION:
        raise WorkerInputError("UNSUPPORTED_RUNTIME_VERSION")
    import numpy as np
    import mediapipe as mp
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(image_bytes)) as image:
            if image.format != "PNG" or image.size != (width, height) or getattr(image, "n_frames", 1) != 1:
                raise WorkerInputError("IMAGE_DIMENSION_MISMATCH")
            rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path), delegate=mp.tasks.BaseOptions.Delegate.CPU),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_poses=2,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        output_segmentation_masks=False,
    )
    with mp.tasks.vision.PoseLandmarker.create_from_options(options) as detector:
        result = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    poses = []
    for pose in result.pose_landmarks:
        if len(pose) != len(LANDMARK_NAMES):
            raise WorkerInputError("INVALID_MODEL_OUTPUT")
        landmarks = [normalized_landmark(name, point) for name, point in zip(LANDMARK_NAMES, pose)]
        poses.append({"landmarks": [point for point in landmarks if point is not None]})
    return poses


def main() -> int:
    parser = argparse.ArgumentParser(description="Local RULA pose inference")
    parser.add_argument("--model", required=True)
    parser.add_argument("--model-sha256", required=True)
    args = parser.parse_args()
    try:
        request_id, image_bytes, width, height = parse_request(sys.stdin.buffer.read(MAX_INPUT_BYTES + 1))
        model_path = verify_model(args.model, args.model_sha256)
        poses = infer(image_bytes, width, height, model_path)
        response = {"protocol": PROTOCOL, "requestId": request_id, "width": width, "height": height,
                    "modelSha256": args.model_sha256.lower(), "poses": poses}
        sys.stdout.write(json.dumps(response, separators=(",", ":"), allow_nan=False))
        return 0
    except WorkerInputError as error:
        sys.stderr.write(f"rula_pose_worker: {error}\n")
    except Exception:
        # Native diagnostics remain on bounded stderr at the adapter; neither
        # payloads, local paths nor Python tracebacks are returned to a user.
        sys.stderr.write("rula_pose_worker: INFERENCE_FAILED\n")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
