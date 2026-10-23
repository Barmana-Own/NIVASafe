# Local RULA pose worker

The worker locates native body landmarks with MediaPipe Pose Landmarker Full on CPU. It reads one bounded PNG request from stdin and emits one JSON response. It does not save image files, download models, call an external inference service, produce RULA scores, or synthesize missing anatomy.

Use a dedicated Python 3.12 AMD64 runtime on Windows. Install the complete pinned wheel set:

```powershell
python -m pip install --require-hashes --only-binary=:all: -r requirements.lock
python -m pip check
python -m unittest discover -s . -p 'test_*.py'
```

For an offline installation, add `--no-index --find-links <verified-wheel-directory>`. All packages, including transitive dependencies, are pinned to the hashes of the verified Windows wheel profile.

Provision the official model identified in `pose-model-manifest.json` before serving traffic. Keep the worker/model in the immutable backend release, preserve the Apache license notice, and restrict write access. Set the TypeScript adapter's absolute Python, worker and model paths and expected model SHA-256. Never select these paths from request data.

Enforce an outbound Windows Firewall deny rule for the dedicated Python executable. The pinned MediaPipe release predates the current usage-logging API; the worker rejects other versions. Review the vendor's current privacy terms and network behavior before any runtime upgrade. No consent or vendor-routing controls in the API may be bypassed by selecting this worker.

The adapter enforces current authorization, timeout, concurrency and output limits. Low-confidence/hidden landmarks remain unavailable downstream. Multiple people require subject selection or abstention. The output is an estimate that requires assessment review; it is not a certified biomechanical measurement.

The model and runtime license sources, model hash and native landmark semantics are recorded in the model manifest and [official guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python).
