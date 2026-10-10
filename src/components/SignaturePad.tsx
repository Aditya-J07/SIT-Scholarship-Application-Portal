'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  label: string;
  kind: 'sig_student' | 'sig_parent';
  applicationId: string;
  existingUrl?: string;
  onUploaded: (fileId: string) => void;
}

export default function SignaturePad({
  label,
  kind,
  applicationId,
  existingUrl,
  onUploaded,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingUrl) {
      setPreviewUrl(existingUrl);
    }
  }, [existingUrl]);

  // Setup canvas drawing context
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setErrorMessage(null);
  };

  const handleSaveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      setErrorMessage('Please draw your signature before saving');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Create a clean white background canvas to avoid black transparency issues in PDF
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
      }

      tempCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append('file', blob, `${kind}.png`);
        formData.append('kind', kind);

        const res = await fetch(`/api/applications/${applicationId}/files`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        setIsSubmitting(false);

        if (!res.ok) {
          setErrorMessage(data.error?.message || 'Failed to save signature');
        } else {
          setPreviewUrl(data.file.url);
          onUploaded(data.file.id);
        }
      }, 'image/png');
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Failed to save signature');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 350 * 1024) {
      setErrorMessage('Signature file must be under 300 KB');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);

      const res = await fetch(`/api/applications/${applicationId}/files`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        setErrorMessage(data.error?.message || 'Failed to upload signature');
      } else {
        setPreviewUrl(data.file.url);
        onUploaded(data.file.id);
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Upload failed');
    }
  };

  return (
    <div className="border border-gray-300 p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-gray-800">{label}</label>
        <div className="inline-flex text-xs border border-gray-300">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`px-3 py-1 font-semibold ${
              mode === 'draw' ? 'bg-[#AC3D47] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Draw on Screen
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1 font-semibold ${
              mode === 'upload' ? 'bg-[#AC3D47] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {previewUrl && (
        <div className="mb-3 p-2 bg-gray-50 border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-700">✓ Signature Captured:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={`${label} Preview`} className="h-10 border border-gray-300 bg-white px-2 object-contain" />
          </div>
          <span className="text-[11px] text-gray-500">Ready for PDF submission</span>
        </div>
      )}

      {mode === 'draw' ? (
        <div>
          <div className="border-2 border-dashed border-gray-300 bg-white relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={140}
              className="w-full h-36 touch-none cursor-crosshair block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && !previewUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-gray-400">
                Sign inside this box with finger or mouse
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs text-gray-600 border border-gray-300 px-3 py-1 hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSaveDrawing}
              disabled={isSubmitting || !hasDrawn}
              className="gov-btn gov-btn-primary text-xs py-1 px-4 min-h-[32px] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Apply Signature'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="border-2 border-dashed border-gray-300 p-4 text-center bg-gray-50">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileUpload}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-[#AC3D47] file:text-white hover:file:bg-[#8D323A]"
            />
            <p className="text-[11px] text-gray-500 mt-2">
              Upload clear photo or scan of signature on white paper (PNG or JPG, max 300 KB)
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 text-xs text-red-600 font-semibold">{errorMessage}</div>
      )}
    </div>
  );
}
