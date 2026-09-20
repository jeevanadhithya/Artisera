# Artisera Python CV Worker Microservice

AI-Powered Computer Vision & Photographic Studio Enhancement for Traditional Indian Handicrafts.

## Capabilities
- **Background Removal**: U²-Net deep learning segmentation via `rembg`, with OpenCV GrabCut fallback.
- **Studio Backdrop Compositing**:
  - `warm_ivory` (`#F7F3EA` - Artisera brand signature)
  - `pure_white` (`#FFFFFF` - E-commerce marketplace standard)
  - `earth_neutral` (`#EAE6DF` - Raw craft organic tone)
  - `transparent` (alpha PNG for flyers and print)
- **Studio Shadow Synthesis**: Soft Gaussian contact & ambient grounding shadow preventing floating cutout effects.
- **Aspect Ratio Formatting**: `1:1`, `4:5`, `16:9`, `original`.

## Local Development
```bash
cd Artisera_Backend/python_worker
pip install -r requirements.txt
python app.py
```
Service starts at `http://localhost:8001`.

## Docker Deployment
```bash
docker build -t artisera-cv-worker .
docker run -p 8001:8001 artisera-cv-worker
```
Set `CV_WORKER_URL=http://localhost:8001` in your Node.js backend `.env`.
If the CV worker is not running, the Node.js backend seamlessly falls back to its built-in Sharp enhancement pipeline without failing.
