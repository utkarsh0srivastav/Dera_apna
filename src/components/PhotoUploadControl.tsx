import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { compressAndValidateImage } from '../utils/imageCompression';

interface PhotoUploadControlProps {
  label: string;
  cameraLabel: string;
  galleryLabel: string;
  onUploadOptimizedFile: (
    file: File,
    meta: {
      originalBytes: number;
      compressedBytes: number;
      width: number;
      height: number;
      setStage: (stage: 'Uploading...' | 'Saving...') => void;
    }
  ) => Promise<string | void>;
  onRemovePhoto?: () => void;
  initialPreviewUrl?: string;
  disabled?: boolean;
}

/**
 * Reusable Camera + Gallery/File Upload Component (Sections 30, 39, 44, 45, 46, 83, 84)
 * - Provides ONLY CAMERA and GALLERY / FILE options (no manual URL input)
 * - Supports live WebRTC camera capture where available or native mobile camera input
 * - Automatically validates and compresses images toward ~200 KB – 250 KB before upload
 * - Shows exact progress states: Optimizing... -> Uploading... -> Saving... -> Uploaded successfully
 */
export const PhotoUploadControl: React.FC<PhotoUploadControlProps> = ({
  label,
  cameraLabel,
  galleryLabel,
  onUploadOptimizedFile,
  onRemovePhoto,
  initialPreviewUrl,
  disabled = false,
}) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [processingStage, setProcessingStage] = useState<
    'Optimizing...' | 'Uploading...' | 'Saving...' | null
  >(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl || null);
  const [sizeInfo, setSizeInfo] = useState<{
    originalKb: number;
    compressedKb: number;
    width: number;
    height: number;
  } | null>(null);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const processing = processingStage !== null;

  const processSelectedFile = async (rawFile: File) => {
    setProcessingStage('Optimizing...');
    setStatusMsg(null);
    let localObjUrl: string | null = null;
    try {
      const optimized = await compressAndValidateImage(rawFile);
      localObjUrl = URL.createObjectURL(optimized.file);
      const origKb = Math.max(1, Math.round(optimized.originalBytes / 1024));
      const compKb = Math.max(1, Math.round(optimized.compressedBytes / 1024));

      setProcessingStage('Uploading...');
      const uploadedResult = await onUploadOptimizedFile(optimized.file, {
        originalBytes: optimized.originalBytes,
        compressedBytes: optimized.compressedBytes,
        width: optimized.width,
        height: optimized.height,
        setStage: (stage) => setProcessingStage(stage),
      });

      setProcessingStage('Saving...');
      const finalPreview =
        typeof uploadedResult === 'string' && uploadedResult.trim().length > 0
          ? uploadedResult
          : localObjUrl;

      setPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:') && prev !== finalPreview) {
          URL.revokeObjectURL(prev);
        }
        return finalPreview;
      });
      setSizeInfo({
        originalKb: origKb,
        compressedKb: compKb,
        width: optimized.width,
        height: optimized.height,
      });
      setStatusMsg({
        type: 'success',
        text: `Uploaded successfully (${origKb} KB → ${compKb} KB, ${optimized.width}×${optimized.height}px)`,
      });
    } catch (err) {
      if (localObjUrl) {
        URL.revokeObjectURL(localObjUrl);
      }
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setSizeInfo(null);
      onRemovePhoto?.();
      setStatusMsg({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Photo upload is currently unavailable. Please contact the administrator.',
      });
    } finally {
      setProcessingStage(null);
    }
  };

  const handleOpenCamera = async () => {
    setStatusMsg(null);
    // On mobile devices with touch capture support, or if getUserMedia is unavailable, use capture input
    const isMobileTouch = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileTouch || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setMediaStream(stream);
      setLiveCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => null);
        }
      }, 50);
    } catch {
      setStatusMsg({
        type: 'error',
        text: 'Camera permission denied or camera unavailable on this device. Opening file selector fallback.',
      });
      cameraInputRef.current?.click();
    }
  };

  const stopLiveCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setLiveCameraOpen(false);
  };

  const handleCaptureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopLiveCamera();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );
    if (!blob) return;
    const capturedFile = new File([blob], `camera_${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    await processSelectedFile(capturedFile);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* CAMERA Button */}
        <button
          type="button"
          disabled={disabled || processing}
          onClick={handleOpenCamera}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          <span>{processingStage || cameraLabel}</span>
        </button>

        {/* GALLERY / FILE Button */}
        <button
          type="button"
          disabled={disabled || processing}
          onClick={() => {
            setStatusMsg(null);
            galleryInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4" />
          <span>{processingStage || galleryLabel}</span>
        </button>

        {/* Hidden Camera Input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) await processSelectedFile(file);
          }}
        />

        {/* Hidden Gallery/File Input */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) await processSelectedFile(file);
          }}
        />
      </div>

      {previewUrl && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <img
            src={previewUrl}
            alt="Uploaded photo preview"
            className="w-20 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
          />
          <div className="text-[11px] text-slate-600 dark:text-slate-300 flex-1 min-w-0">
            <div className="font-semibold text-slate-900 dark:text-white truncate">
              {sizeInfo
                ? `Optimized JPEG (${sizeInfo.compressedKb} KB)`
                : 'Uploaded Photo Ready'}
            </div>
            {sizeInfo && (
              <div>
                Original: {sizeInfo.originalKb} KB • {sizeInfo.width}×{sizeInfo.height}px
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
              }
              setPreviewUrl(null);
              setSizeInfo(null);
              setStatusMsg(null);
              onRemovePhoto?.();
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            Remove / Retake
          </button>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
            statusMsg.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Live WebRTC Camera Modal */}
      {liveCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {cameraLabel} — Take Photo
              </span>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl bg-black aspect-video object-cover"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={stopLiveCamera}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              >
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
