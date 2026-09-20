import io
import os
import time
import base64
import logging
from typing import List, Optional
from contextlib import asynccontextmanager

import cv2
import numpy as np
import torch
from torchvision import transforms
from PIL import Image, ImageEnhance, ImageOps

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from transformers import AutoModelForImageSegmentation


# ==============================================================================
# 1. LOGGING & CONFIGURATION
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger("artisera-image-ai")


# ==============================================================================
# MODEL CONFIGURATION
# ==============================================================================

MODEL_ID = "ZhengPeng7/BiRefNet_HR"


# ==============================================================================
# IMAGE LIMITS
# ==============================================================================

MAX_IMAGE_SIZE_BYTES = int(
    os.getenv(
        "MAX_IMAGE_SIZE_BYTES",
        25 * 1024 * 1024
    )
)

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


# ==============================================================================
# CORS
# ==============================================================================

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "*"
).split(",")


# ==============================================================================
# RUNTIME STATE
# ==============================================================================

state = {
    "model": None,
    "device": "cpu",
    "use_fp16": False,
    "transform": None,
    "gpu_name": None,
    "is_ready": False,
}


# ==============================================================================
# 2. MODEL INITIALIZATION
# ==============================================================================

def init_model():
    """
    Load BiRefNet-HR once when FastAPI starts.

    GPU:
        CUDA + FP16

    CPU:
        CPU + FP32

    IMPORTANT:
    CPU inference explicitly forces the complete model to float32.
    This prevents:
        Input type (float) and bias type (c10::Half)
        should be the same
    """

    logger.info("[Artisera] Detecting compute hardware...")

    if torch.cuda.is_available():
        device = "cuda"
        use_fp16 = True
        gpu_name = torch.cuda.get_device_name(0)

        logger.info(
            f"[Artisera] CUDA device detected: "
            f"{gpu_name} (Using FP16)"
        )

    else:
        device = "cpu"
        use_fp16 = False
        gpu_name = None

        logger.info(
            "[Artisera] No CUDA GPU detected. "
            "Running on CPU (Float32)"
        )

    logger.info(
        f"[Artisera] Loading model '{MODEL_ID}'..."
    )

    try:

        # ------------------------------------------------------------------
        # GPU
        # ------------------------------------------------------------------

        if use_fp16:

            model = AutoModelForImageSegmentation.from_pretrained(
                MODEL_ID,
                torch_dtype=torch.float16,
                trust_remote_code=True,
            )

            model = model.to("cuda")

        # ------------------------------------------------------------------
        # CPU
        # ------------------------------------------------------------------

        else:

            model = AutoModelForImageSegmentation.from_pretrained(
                MODEL_ID,
                trust_remote_code=True,
            )

            # CRITICAL CPU FIX
            #
            # BiRefNet-HR may contain FP16 parameters/biases.
            # CPU input is float32.
            #
            # Force ALL model parameters and buffers to FP32.
            model = model.float()

            model = model.to("cpu")

        # ------------------------------------------------------------------
        # Evaluation mode
        # ------------------------------------------------------------------

        model.eval()

        state["model"] = model
        state["device"] = device
        state["use_fp16"] = use_fp16
        state["gpu_name"] = gpu_name
        state["is_ready"] = True

        logger.info(
            f"[Artisera] Model '{MODEL_ID}' "
            f"successfully loaded into memory on "
            f"{device.upper()}."
        )

        # ------------------------------------------------------------------
        # Debug dtype information
        # ------------------------------------------------------------------

        first_param_dtype = None

        for param in model.parameters():
            first_param_dtype = param.dtype
            break

        logger.info(
            f"[Artisera] Model parameter dtype: "
            f"{first_param_dtype}"
        )

        logger.info(
            f"[Artisera] Device: {device}"
        )

        logger.info(
            f"[Artisera] FP16 enabled: {use_fp16}"
        )

    except Exception as e:

        logger.error(
            f"[Artisera] Failed to load model "
            f"{MODEL_ID}: {str(e)}",
            exc_info=True,
        )

        state["is_ready"] = False

        raise RuntimeError(
            f"Model initialization failed: {e}"
        )

    # ==========================================================================
    # IMAGE PREPROCESSING
    # ==========================================================================

    target_dim = int(os.getenv("INFERENCE_SIZE", "768" if device == "cpu" else "1024"))
    logger.info(f"[Artisera] Configuring BiRefNet inference size: {target_dim}x{target_dim} on {device.upper()}")

    state["transform"] = transforms.Compose([
        transforms.Resize(
            (target_dim, target_dim)
        ),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[
                0.485,
                0.456,
                0.406
            ],
            std=[
                0.229,
                0.224,
                0.225
            ],
        ),
    ])

    logger.info(
        "[Artisera] Image preprocessing pipeline ready."
    )


# ==============================================================================
# FASTAPI LIFESPAN
# ==============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    init_model()

    yield

    if state["device"] == "cuda":

        torch.cuda.empty_cache()

    logger.info(
        "[Artisera] Microservice shutdown complete."
    )


# ==============================================================================
# 3. FASTAPI APPLICATION
# ==============================================================================

app = FastAPI(
    title="Artisera AI Image Enhancement Service",
    description=(
        "BiRefNet-HR based artisan product "
        "background segmentation and image enhancement"
    ),
    version="1.0.1",
    lifespan=lifespan,
)


# ==============================================================================
# CORS
# ==============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        CORS_ORIGINS
        if CORS_ORIGINS != ["*"]
        else ["*"]
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# 4. IMAGE PREPROCESSING
# ==============================================================================

def preprocess_image_for_birefnet(
    image: Image.Image,
    device: str,
    use_fp16: bool
) -> torch.Tensor:

    transform = state["transform"]

    tensor = transform(
        image
    ).unsqueeze(0)

    # Move to CPU/GPU
    tensor = tensor.to(device)

    # GPU only
    #
    # CPU must remain float32.
    if use_fp16:
        tensor = tensor.half()
    else:
        tensor = tensor.float()

    return tensor


# ==============================================================================
# 5. SEGMENTATION INFERENCE
# ==============================================================================

def run_segmentation_inference(
    image: Image.Image
) -> np.ndarray:

    model = state["model"]
    device = state["device"]
    use_fp16 = state["use_fp16"]

    if model is None or not state["is_ready"]:

        raise RuntimeError(
            "Segmentation model is not ready."
        )

    orig_w, orig_h = image.size

    # Prepare input
    input_tensor = preprocess_image_for_birefnet(
        image,
        device,
        use_fp16
    )

    # ------------------------------------------------------------------
    # Safety check
    # ------------------------------------------------------------------

    if device == "cpu":

        input_tensor = input_tensor.float()

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    with torch.inference_mode():

        preds = model(
            input_tensor
        )

        # BiRefNet normally returns multiple outputs.
        # The last prediction is used as the fine mask.

        if isinstance(
            preds,
            (list, tuple)
        ):

            pred = preds[-1]

        else:

            pred = preds

        # Sigmoid -> probability
        pred = torch.sigmoid(pred)

        # Remove batch/channel dimensions
        mask_tensor = (
            pred
            .squeeze()
            .float()
            .cpu()
        )

        mask_np = mask_tensor.numpy()

    # ------------------------------------------------------------------
    # Cleanup tensors
    # ------------------------------------------------------------------

    del input_tensor
    del preds
    del pred
    del mask_tensor

    if device == "cuda":

        torch.cuda.empty_cache()

    # ------------------------------------------------------------------
    # Resize mask to original image
    # ------------------------------------------------------------------

    mask_full = cv2.resize(
        mask_np,
        (orig_w, orig_h),
        interpolation=cv2.INTER_LINEAR
    )

    mask_full = np.clip(
        mask_full,
        0.0,
        1.0
    )

    return mask_full


# ==============================================================================
# 6. MASK REFINEMENT
# ==============================================================================

def refine_product_mask(
    mask: np.ndarray
) -> np.ndarray:

    """
    Conservative edge refinement.

    Does not intentionally remove product details.
    """

    mask_u8 = (
        mask * 255.0
    ).astype(
        np.uint8
    )

    # Small kernel
    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (3, 3)
    )

    # Conservative closing
    mask_cleaned = cv2.morphologyEx(
        mask_u8,
        cv2.MORPH_CLOSE,
        kernel,
        iterations=1
    )

    # Small blur for smooth edges
    mask_blurred = cv2.GaussianBlur(
        mask_cleaned,
        (3, 3),
        0
    )

    return mask_blurred


# ==============================================================================
# 7. IMAGE ENHANCEMENT
# ==============================================================================

def apply_conservative_enhancement(
    image: Image.Image
) -> Image.Image:

    """
    Conservative ecommerce enhancement.

    Does NOT generate or repaint the product.
    """

    # ------------------------------------------------------------------
    # Brightness
    # ------------------------------------------------------------------

    enhancer_b = ImageEnhance.Brightness(
        image
    )

    image = enhancer_b.enhance(
        1.03
    )

    # ------------------------------------------------------------------
    # Contrast
    # ------------------------------------------------------------------

    enhancer_c = ImageEnhance.Contrast(
        image
    )

    image = enhancer_c.enhance(
        1.05
    )

    # ------------------------------------------------------------------
    # Color
    # ------------------------------------------------------------------

    enhancer_col = ImageEnhance.Color(
        image
    )

    image = enhancer_col.enhance(
        1.02
    )

    # ------------------------------------------------------------------
    # Sharpness
    # ------------------------------------------------------------------

    enhancer_s = ImageEnhance.Sharpness(
        image
    )

    image = enhancer_s.enhance(
        1.10
    )

    return image


# ==============================================================================
# 8. WHITE BACKGROUND COMPOSITING
# ==============================================================================

def composite_on_white_background(
    orig_image: Image.Image,
    refined_mask: np.ndarray
) -> Image.Image:

    orig_w, orig_h = orig_image.size

    # ------------------------------------------------------------------
    # Product RGBA
    # ------------------------------------------------------------------

    r, g, b = orig_image.split()

    alpha_img = Image.fromarray(
        refined_mask,
        mode="L"
    )

    rgba_product = Image.merge(
        "RGBA",
        (
            r,
            g,
            b,
            alpha_img
        )
    )

    # ------------------------------------------------------------------
    # White studio background
    # ------------------------------------------------------------------

    white_bg = Image.new(
        "RGBA",
        (orig_w, orig_h),
        (255, 255, 255, 255)
    )

    # ------------------------------------------------------------------
    # Composite
    # ------------------------------------------------------------------

    composited = Image.alpha_composite(
        white_bg,
        rgba_product
    )

    final_rgb = composited.convert(
        "RGB"
    )

    # ------------------------------------------------------------------
    # Conservative enhancement
    # ------------------------------------------------------------------

    enhanced_final = apply_conservative_enhancement(
        final_rgb
    )

    return enhanced_final


# ==============================================================================
# 9. PROCESS SINGLE IMAGE
# ==============================================================================

def process_single_image(
    image_bytes: bytes,
    filename: str
) -> dict:

    t_start = time.time()

    logger.info(
        f"[Artisera] Processing image: {filename}"
    )

    # ==========================================================================
    # Decode image
    # ==========================================================================

    try:

        pil_img = Image.open(
            io.BytesIO(image_bytes)
        )

        # Correct phone camera orientation
        pil_img = ImageOps.exif_transpose(
            pil_img
        )

        # RGB
        orig_image = pil_img.convert(
            "RGB"
        )

    except Exception as e:

        logger.error(
            f"[Artisera] Failed to decode image "
            f"'{filename}': {str(e)}"
        )

        raise ValueError(
            f"Invalid or corrupted image format "
            f"for {filename}"
        )

    # ==========================================================================
    # Segmentation
    # ==========================================================================

    t_seg_start = time.time()

    raw_mask = run_segmentation_inference(
        orig_image
    )

    t_seg = (
        time.time()
        - t_seg_start
    )

    # ==========================================================================
    # Refinement + Enhancement
    # ==========================================================================

    t_enh_start = time.time()

    refined_mask = refine_product_mask(
        raw_mask
    )

    final_image = composite_on_white_background(
        orig_image,
        refined_mask
    )

    t_enh = (
        time.time()
        - t_enh_start
    )

    # ==========================================================================
    # PNG output
    # ==========================================================================

    output_buffer = io.BytesIO()

    final_image.save(
        output_buffer,
        format="PNG",
        optimize=True
    )

    png_bytes = output_buffer.getvalue()

    b64_str = base64.b64encode(
        png_bytes
    ).decode(
        "utf-8"
    )

    # ==========================================================================
    # Timing
    # ==========================================================================

    t_total = (
        time.time()
        - t_start
    )

    logger.info(
        f"[Artisera] "
        f"Segmentation: {t_seg:.2f}s | "
        f"Enhancement: {t_enh:.2f}s | "
        f"Total: {t_total:.2f}s | "
        f"File: {filename}"
    )

    return {
        "filename": filename,
        "image_base64": b64_str,
        "content_type": "image/png",
        "processing_time_sec": round(
            t_total,
            3
        ),
        "dimensions": {
            "width": orig_image.width,
            "height": orig_image.height,
        },
    }


# ==============================================================================
# 10. RESPONSE MODELS
# ==============================================================================

class ProcessedImageItem(BaseModel):

    filename: str

    image_base64: str

    content_type: str = "image/png"


class Base64EnhanceRequest(BaseModel):
    image_base64: str
    filename: Optional[str] = "craft.jpg"
    background_style: Optional[str] = "warm_ivory"
    add_shadow: Optional[bool] = True


class EnhanceResponse(BaseModel):

    success: bool

    count: int

    images: List[ProcessedImageItem]


class HealthResponse(BaseModel):

    status: str

    service: str


class GpuResponse(BaseModel):

    device: str

    cuda_available: bool

    gpu_name: Optional[str] = None

    model: str


# ==============================================================================
# 11. HEALTH ENDPOINT
# ==============================================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Monitoring"]
)
async def health_check():

    return {
        "status": (
            "ok"
            if state["is_ready"]
            else "loading"
        ),
        "service": "artisera-image-ai",
    }


# ==============================================================================
# 12. GPU / CPU STATUS
# ==============================================================================

@app.get(
    "/gpu",
    response_model=GpuResponse,
    tags=["Monitoring"]
)
async def gpu_status():

    return {
        "device": state["device"],
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": state["gpu_name"],
        "model": MODEL_ID,
    }


# ==============================================================================
# 13. IMAGE ENHANCEMENT API
# ==============================================================================

@app.post(
    "/enhance",
    response_model=EnhanceResponse,
    tags=["Enhancement"]
)
async def enhance_images(
    images: Optional[List[UploadFile]] = File(None),
    image: Optional[UploadFile] = File(None),
):
    # Consolidate single and multiple uploads
    all_files: List[UploadFile] = []
    if images:
        all_files.extend(images)
    if image:
        all_files.append(image)

    # ==========================================================================
    # Validate request
    # ==========================================================================

    if not all_files:
        raise HTTPException(
            status_code=400,
            detail="No images provided. Please provide 'image' or 'images'."
        )

    if not state["is_ready"]:

        raise HTTPException(
            status_code=503,
            detail=(
                "AI model is still initializing. "
                "Please retry in a few seconds."
            )
        )

    results: List[ProcessedImageItem] = []

    # ==========================================================================
    # Process images sequentially
    # ==========================================================================

    for upload_file in all_files:

        filename = os.path.basename(
            upload_file.filename
            or "product.jpg"
        )

        # ----------------------------------------------------------------------
        # File extension
        # ----------------------------------------------------------------------

        ext = os.path.splitext(
            filename
        )[1].lower()

        mime = upload_file.content_type

        valid_extension = (
            ext in ALLOWED_EXTENSIONS
        )

        valid_mime = (
            mime in ALLOWED_MIME_TYPES
        )

        if not valid_extension and not valid_mime:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported file type for "
                    f"'{filename}'. "
                    f"Allowed: JPG, JPEG, PNG, WEBP."
                )
            )

        try:

            # ------------------------------------------------------------------
            # Read file
            # ------------------------------------------------------------------

            content = await upload_file.read()

            if not content:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Uploaded file "
                        f"'{filename}' is empty."
                    )
                )

            # ------------------------------------------------------------------
            # Size check
            # ------------------------------------------------------------------

            if len(content) > MAX_IMAGE_SIZE_BYTES:

                raise HTTPException(
                    status_code=413,
                    detail=(
                        f"File '{filename}' exceeds "
                        f"maximum allowed size of "
                        f"{MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB."
                    )
                )

            # ------------------------------------------------------------------
            # Process
            # ------------------------------------------------------------------

            processed_data = process_single_image(
                content,
                filename
            )

            results.append(
                ProcessedImageItem(
                    filename=processed_data[
                        "filename"
                    ],
                    image_base64=processed_data[
                        "image_base64"
                    ],
                    content_type=processed_data[
                        "content_type"
                    ],
                )
            )

        except HTTPException:

            raise

        except ValueError as e:

            logger.warning(
                f"[Artisera] Image validation "
                f"failure for '{filename}': {e}"
            )

            raise HTTPException(
                status_code=400,
                detail=str(e)
            )

        except Exception as e:

            logger.error(
                f"[Artisera] Inference pipeline "
                f"failure on '{filename}': {str(e)}",
                exc_info=True,
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "An error occurred while "
                    "processing the artisan image."
                )
            )

        finally:

            await upload_file.close()

    # ==========================================================================
    # Response
    # ==========================================================================

    return {
        "success": True,
        "count": len(results),
        "images": results,
    }


@app.post(
    "/enhance-base64",
    tags=["Enhancement"]
)
async def enhance_base64_endpoint(
    payload: Base64EnhanceRequest
):
    """
    Direct Base64 JSON Enhancement endpoint for Mobile & Cloud integration.
    """
    if not state["is_ready"]:
        raise HTTPException(
            status_code=503,
            detail="AI model is still initializing. Please retry in a few seconds."
        )

    clean_b64 = payload.image_base64.split(",")[1] if "," in payload.image_base64 else payload.image_base64
    try:
        raw_bytes = base64.b64decode(clean_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 string: {e}")

    result = process_single_image(raw_bytes, payload.filename or "craft.jpg")
    return {
        "success": True,
        "image_base64": result["image_base64"],
        "enhanced_image": result["image_base64"],
        "count": 1,
        "images": [result]
    }


# ==============================================================================
# 14. WEB INTERFACE
# ==============================================================================

@app.get(
    "/",
    response_class=HTMLResponse,
    tags=["UI"]
)
async def serve_index():

    index_path = os.path.join(
        os.path.dirname(__file__),
        "index.html"
    )

    if not os.path.exists(index_path):

        return HTMLResponse(
            content=(
                "<h1>Artisera AI Image Studio</h1>"
                "<p>index.html not found.</p>"
            ),
            status_code=404,
        )

    return FileResponse(
        index_path,
        media_type="text/html"
    )


# ==============================================================================
# 15. DIRECT EXECUTION
# ==============================================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )
PY