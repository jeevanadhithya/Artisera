#!/usr/bin/env python3
"""
Artisera CV Worker API Service
FastAPI microservice for AI-powered studio image enhancement
"""

import os
import io
import base64
import requests
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from worker import process_craft_image, HAS_REMBG, HAS_OPENCV
except ImportError:
    from .worker import process_craft_image, HAS_REMBG, HAS_OPENCV

app = FastAPI(
    title="Artisera CV Worker",
    description="Computer Vision microservice for marginalized artisan craft studio photography",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EnhanceRequest(BaseModel):
    image_url: Optional[str] = Field(None, description="Direct URL to source product image")
    image_base64: Optional[str] = Field(None, description="Base64-encoded image data")
    background_style: Optional[str] = Field("warm_ivory", description="Studio backdrop: warm_ivory, pure_white, earth_neutral, transparent")
    add_shadow: Optional[bool] = Field(True, description="Synthesize soft ambient drop shadow")
    aspect_ratio: Optional[str] = Field("1:1", description="1:1, 4:5, 16:9, or original")
    max_dimension: Optional[int] = Field(1200, description="Max dimension in pixels")
    quality: Optional[int] = Field(92, description="Output JPEG compression quality")


class EnhanceResponse(BaseModel):
    success: bool
    mime_type: str
    width: int
    height: int
    background_style: str
    aspect_ratio: str
    shadow_applied: bool
    engine: str
    image_base64: str


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "artisera-cv-worker",
        "version": "1.0.0",
        "capabilities": {
            "rembg_u2net": HAS_REMBG,
            "opencv": HAS_OPENCV,
            "background_styles": ["warm_ivory", "pure_white", "earth_neutral", "transparent"],
            "aspect_ratios": ["1:1", "4:5", "16:9", "original"],
            "shadow_synthesis": True,
            "contrast_clahe": True
        }
    }


@app.post("/enhance", response_model=EnhanceResponse)
def enhance_image(req: EnhanceRequest):
    input_bytes = None

    if req.image_base64:
        try:
            # Handle potential data URL prefix
            b64_data = req.image_base64
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            input_bytes = base64.b64decode(b64_data)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 payload: {e}")
    elif req.image_url:
        try:
            resp = requests.get(req.image_url, timeout=15)
            resp.raise_for_status()
            input_bytes = resp.content
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to fetch image from URL: {e}")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either image_url or image_base64 must be provided.")

    try:
        result = process_craft_image(
            input_bytes=input_bytes,
            background_style=req.background_style or "warm_ivory",
            add_shadow=req.add_shadow if req.add_shadow is not None else True,
            aspect_ratio=req.aspect_ratio or "1:1",
            max_dimension=req.max_dimension or 1200,
            quality=req.quality or 92
        )

        encoded_output = base64.b64encode(result["bytes"]).decode("utf-8")

        return EnhanceResponse(
            success=True,
            mime_type=result["mime_type"],
            width=result["width"],
            height=result["height"],
            background_style=result["background_style"],
            aspect_ratio=result["aspect_ratio"],
            shadow_applied=result["shadow_applied"],
            engine=result["engine"],
            image_base64=f"data:{result['mime_type']};base64,{encoded_output}"
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Enhancement error: {e}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
