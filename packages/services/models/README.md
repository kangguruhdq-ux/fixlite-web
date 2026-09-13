Model: U2Net, original trained general-purpose foreground segmentation weights.
Source: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx
Upstream implementation and model license: https://github.com/xuebinqin/U-2-Net (Apache-2.0).
Preprocessing reference: https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2net.py
Run `npm run setup:model` from the repository root. The installer verifies the upstream MD5 checksum before using downloaded weights.
Inference runs locally on the API server via ONNX Runtime CPU. No simulated output, heuristic fallback, or remote image upload.
The model works best on prominent foreground subjects; ambiguous scenes may require manual refinement.
