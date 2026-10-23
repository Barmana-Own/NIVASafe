"""Fast trust-boundary tests; no model, image data or network is required."""

import base64
import hashlib
import json
import pathlib
import tempfile
import types
import unittest

import rula_pose_worker as worker


class WorkerBoundaryTests(unittest.TestCase):
    def request(self, **image_overrides):
        image = {"mimeType": "image/png", "base64": base64.b64encode(worker.PNG_SIGNATURE).decode(),
                 "width": 768, "height": 512}
        image.update(image_overrides)
        return {"protocol": worker.PROTOCOL, "requestId": "test-request-1", "image": image}

    def test_accepts_bounded_png_envelope(self):
        request_id, payload, width, height = worker.parse_request(json.dumps(self.request()).encode())
        self.assertEqual((request_id, payload, width, height), ("test-request-1", worker.PNG_SIGNATURE, 768, 512))

    def test_rejects_unexpected_input_fields_and_protocol(self):
        for request in (dict(self.request(), path="C:/private.png"), dict(self.request(), protocol="v0")):
            with self.subTest(request=request), self.assertRaises(worker.WorkerInputError):
                worker.parse_request(json.dumps(request).encode())

    def test_rejects_boolean_negative_and_oversized_dimensions(self):
        for value in (True, -1, 0, 16_385, 1.25, "768"):
            with self.subTest(value=value), self.assertRaises(worker.WorkerInputError):
                worker.parse_request(json.dumps(self.request(width=value)).encode())

    def test_preserves_large_valid_dimensions_but_enforces_pixel_budget(self):
        self.assertEqual(worker.parse_request(json.dumps(self.request(width=16_384, height=1024)).encode())[2:], (16_384, 1024))
        with self.assertRaises(worker.WorkerInputError):
            worker.parse_request(json.dumps(self.request(width=6000, height=4001)).encode())

    def test_rejects_non_png_and_invalid_base64(self):
        for fields in ({"mimeType": "image/jpeg"}, {"base64": "**"}, {"base64": base64.b64encode(b"JPEG").decode()}):
            with self.subTest(fields=fields), self.assertRaises(worker.WorkerInputError):
                worker.parse_request(json.dumps(self.request(**fields)).encode())

    def test_rejects_unbounded_input_and_bad_request_ids(self):
        with self.assertRaises(worker.WorkerInputError):
            worker.parse_request(b" " * (worker.MAX_INPUT_BYTES + 1))
        request = dict(self.request(), requestId="unsafe\nrequest")
        with self.assertRaises(worker.WorkerInputError):
            worker.parse_request(json.dumps(request).encode())

    def test_model_requires_absolute_path_and_exact_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            model = pathlib.Path(directory) / "model.task"
            model.write_bytes(b"trusted-test-model")
            digest = hashlib.sha256(model.read_bytes()).hexdigest()
            self.assertEqual(worker.verify_model(str(model), digest), model)
            with self.assertRaises(worker.WorkerInputError):
                worker.verify_model(str(model), "0" * 64)
            with self.assertRaises(worker.WorkerInputError):
                worker.verify_model("relative-model.task", digest)

    def test_retains_visibility_instead_of_inventing_hidden_points(self):
        point = types.SimpleNamespace(x=0.4, y=0.6, visibility=0.1, presence=0.95)
        self.assertEqual(worker.normalized_landmark("left_wrist", point),
                         {"name": "left_wrist", "x": 0.4, "y": 0.6, "visibility": 0.1, "presence": 0.95})

    def test_out_of_frame_and_non_finite_points_are_omitted_not_clamped(self):
        for x in (-0.01, 1.01, float("nan"), float("inf")):
            with self.subTest(x=x):
                self.assertIsNone(worker.normalized_landmark("right_wrist", types.SimpleNamespace(x=x, y=0.5, visibility=0.9, presence=0.9)))

    def test_native_landmarks_have_no_fabricated_neck_or_head_center(self):
        self.assertEqual(len(set(worker.LANDMARK_NAMES)), 33)
        self.assertNotIn("neck", worker.LANDMARK_NAMES)
        self.assertNotIn("head", worker.LANDMARK_NAMES)


if __name__ == "__main__":
    unittest.main()
