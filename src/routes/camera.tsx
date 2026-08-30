import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { X, Zap, ScanLine, Sparkles, Upload, Loader2, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import bambooFallback from '@/assets/product-bamboo.jpg';

export const Route = createFileRoute('/camera')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      productId: (search['productId'] as string) || '',
    };
  },
  component: CameraView,
});

type CameraStep = 'capture' | 'preview' | 'enhance_prompt' | 'enhancing' | 'comparison';

function CameraView() {
  const { productId } = Route.useSearch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Flow State
  const [currentStep, setCurrentStep] = useState<CameraStep>('capture');
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Image result urls
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string | null>(null);

  const startCamera = async (mode: 'user' | 'environment') => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn('Video play failed:', e));
        };
      }
      setStreamActive(true);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err) {
      console.warn('Camera access failed or denied:', err);
      setCameraError('Camera access is unavailable. Please upload a photo from your gallery.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    if (currentStep === 'capture') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, currentStep]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const capturePhoto = () => {
    if (videoRef.current && streamActive) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'craft_capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setCurrentStep('preview');
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCurrentStep('preview');
      stopCamera();
    }
  };

  const handleUploadOriginal = async () => {
    if (!selectedFile || !productId) return;
    setLoading(true);
    try {
      const res = await api.uploadImage<any>(productId, selectedFile);
      setOriginalImageUrl(res.image_url);
      setCurrentStep('enhance_prompt');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Image upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!productId) return;
    setCurrentStep('enhancing');
    try {
      const res = await api.enhanceImage<any>(productId, selectedFile || undefined);
      setEnhancedImageUrl(res.enhanced_image_url);
      setOriginalImageUrl(res.original_image_url || res.image_url);
      setCurrentStep('comparison');
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error('AI Enhancement failed. Using original photo.');
      navigate({
        to: '/review',
        search: { productId }
      });
    }
  };

  const handleChooseImage = async (useEnhanced: boolean) => {
    if (!productId) return;
    setLoading(true);
    try {
      const selectedUrl = useEnhanced ? enhancedImageUrl : originalImageUrl;
      await api.put(`/products/${productId}/catalog`, {
        image_url: selectedUrl
      });
      
      toast.success(useEnhanced ? 'Enhanced photo added to catalog!' : 'Original photo saved.');
      navigate({
        to: '/review',
        search: { productId }
      });
    } catch (error) {
      console.error('Failed to save selected image choice:', error);
      // Fallback
      navigate({
        to: '/review',
        search: { productId }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame chrome={false}>
      <div className="relative min-h-screen bg-foreground overflow-hidden flex flex-col justify-between text-background">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* 1. CAPTURE / TAKING PHOTO STEP */}
        {currentStep === 'capture' && (
          <>
            {streamActive ? (
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                <HelpCircle className="h-12 w-12 text-neutral-700 animate-pulse" />
              </div>
            )}

            <div className="relative flex min-h-screen flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/60 z-10">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <Link
                  to="/add"
                  aria-label="Close camera"
                  className="grid h-11 w-11 place-items-center rounded-full bg-foreground/30 text-background backdrop-blur-sm hover:bg-foreground/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </Link>
                <p className="flex items-center gap-1.5 rounded-full bg-foreground/30 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-background backdrop-blur-sm">
                  <ScanLine className="h-4 w-4 text-ai animate-pulse" /> 1: PHOTO CAPTURE
                </p>
                <button
                  onClick={triggerFileSelect}
                  className="grid h-11 w-11 place-items-center rounded-full bg-foreground/30 text-background backdrop-blur-sm hover:bg-foreground/50 transition-colors"
                >
                  <Upload className="h-5 w-5" />
                </button>
              </div>

              {/* Hints */}
              <div className="mx-auto max-w-[20rem] rounded-2xl bg-black/60 p-4 border border-white/5 space-y-2 backdrop-blur-md">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary text-center">Photography Tips</p>
                <ul className="text-[10px] space-y-1 text-neutral-300 list-disc list-inside">
                  <li>Place your product in good, bright light.</li>
                  <li>Keep the product centered in the frame.</li>
                  <li>Use a clean, uncluttered background if possible.</li>
                </ul>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div className="flex justify-center gap-3">
                  {streamActive && (
                    <button
                      onClick={toggleFacingMode}
                      className="flex items-center gap-1.5 rounded-full bg-foreground/45 px-4 py-2 text-xs font-bold text-background backdrop-blur-sm hover:bg-foreground/60"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Switch Camera
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-3xl bg-black/45 px-6 py-4 backdrop-blur-lg border border-white/5">
                  <span 
                    onClick={triggerFileSelect}
                    className="h-11 w-11 overflow-hidden rounded-lg border border-background/40 cursor-pointer bg-neutral-800 flex items-center justify-center"
                  >
                    <Upload className="h-5 w-5 text-neutral-400" />
                  </span>

                  <button
                    onClick={streamActive ? capturePhoto : triggerFileSelect}
                    className="h-16 w-16 rounded-full border-4 border-background bg-background hover:bg-background/90 active:scale-95 transition-all shadow-lg"
                  />

                  <span className="h-11 w-11 rounded-full bg-foreground/30 flex items-center justify-center opacity-40">
                    <Zap className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 2. PREVIEW STEP */}
        {currentStep === 'preview' && (
          <>
            <img
              src={previewUrl || bambooFallback}
              alt="Preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="relative flex min-h-screen flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentStep('capture')}
                  className="grid h-11 w-11 place-items-center rounded-full bg-foreground/30 text-background backdrop-blur-sm"
                >
                  <X className="h-5 w-5" />
                </button>
                <span className="text-[11px] font-extrabold tracking-wide uppercase px-3 py-1.5 rounded-full bg-foreground/30 backdrop-blur-sm">
                  Review Photo
                </span>
                <span className="w-11" />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUploadOriginal}
                  disabled={loading}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/95 shadow-lg"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Use This Photo'}
                </button>
                <button
                  onClick={() => setCurrentStep('capture')}
                  disabled={loading}
                  className="w-full py-3 bg-foreground/35 text-background font-semibold rounded-2xl hover:bg-foreground/50 border border-white/10"
                >
                  Retake Photo
                </button>
              </div>
            </div>
          </>
        )}

        {/* 3. ENHANCE PROMPT STEP */}
        {currentStep === 'enhance_prompt' && (
          <div className="flex-1 flex flex-col justify-center items-center p-6 bg-neutral-900 text-center space-y-6">
            <div className="h-20 w-20 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center text-primary animate-bounce">
              <Sparkles className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-extrabold">Improve Product Photo?</h2>
              <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                Artisera's AI Image Studio can automatically clean clutter, remove backgrounds, adjust lighting, and crop the image to make it look professional.
              </p>
            </div>
            <div className="w-full space-y-3 pt-4">
              <button
                onClick={handleEnhance}
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                <Sparkles className="h-5 w-5" /> Improve Product Photo
              </button>
              <button
                onClick={() => {
                  navigate({
                    to: '/review',
                    search: { productId }
                  });
                }}
                className="w-full py-3 bg-neutral-800 text-neutral-300 font-semibold rounded-2xl hover:bg-neutral-700"
              >
                Keep Original Photo
              </button>
            </div>
          </div>
        )}

        {/* 4. ENHANCING LOADER */}
        {currentStep === 'enhancing' && (
          <div className="flex-1 flex flex-col justify-center items-center p-6 bg-neutral-950 text-center space-y-5">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-bold">AI Image Studio</h3>
              <p className="text-sm text-primary font-semibold animate-pulse">Cleaning your product photo...</p>
              <p className="text-xs text-neutral-500 max-w-xs leading-normal">
                Removing background clutter, balancing lighting, and centering your craft. This takes about 3 seconds.
              </p>
            </div>
          </div>
        )}

        {/* 5. BEFORE / AFTER COMPARISON */}
        {currentStep === 'comparison' && (
          <div className="flex-1 flex flex-col justify-between p-4 bg-neutral-900">
            <div className="text-center pt-2">
              <h3 className="font-display text-lg font-extrabold flex justify-center items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> AI Photo Studio Result
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">Select the best option for your catalog listing</p>
            </div>

            {/* Comparison cards */}
            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Before (Original)</span>
                <div className="aspect-[4/5] rounded-xl overflow-hidden border border-neutral-700 bg-neutral-850">
                  <img
                    src={originalImageUrl || bambooFallback}
                    alt="Original"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">After (Enhanced)</span>
                <div className="aspect-[4/5] rounded-xl overflow-hidden border border-primary/30 bg-neutral-850 ring-2 ring-primary/20">
                  <img
                    src={enhancedImageUrl || bambooFallback}
                    alt="Enhanced"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Selection actions */}
            <div className="space-y-3 pb-2">
              <button
                onClick={() => handleChooseImage(true)}
                disabled={loading}
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/95 shadow-md"
              >
                <CheckCircle2 className="h-5 w-5" /> Use Enhanced Photo
              </button>
              <button
                onClick={() => handleChooseImage(false)}
                disabled={loading}
                className="w-full py-3 bg-neutral-800 text-neutral-300 font-semibold rounded-2xl hover:bg-neutral-700"
              >
                Keep Original Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
