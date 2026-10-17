'use client';

import React, { useState } from 'react';

interface FileUploadFieldProps {
  label: string;
  kind: string;
  applicationId: string;
  required?: boolean;
  description?: string;
  existingFile?: { id: string; original_name: string; size_bytes: number; url?: string } | null;
  onUploaded: (fileId: string) => void;
  accept?: string;
  maxSizeMb?: number;
}

async function compressImageIfNeeded(file: File, targetMaxBytes = 300 * 1024): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/') || file.size <= targetMaxBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const tryQuality = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              if (blob.size <= targetMaxBytes || q <= 0.4) {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                tryQuality(q - 0.15);
              }
            },
            'image/jpeg',
            q
          );
        };

        tryQuality(0.85);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function FileUploadField({
  label,
  kind,
  applicationId,
  required = true,
  description,
  existingFile,
  onUploaded,
  accept = 'application/pdf,image/jpeg,image/png',
  maxSizeMb = 2,
}: FileUploadFieldProps) {
  const [file, setFile] = useState(existingFile || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > maxSizeMb * 1024 * 1024) {
      setError(`File size exceeds maximum limit of ${maxSizeMb} MB`);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // Client-side photo compression (Part 5 Item 2: target <= 300 KB)
      const fileToUpload =
        kind === 'photo' || selectedFile.type.startsWith('image/')
          ? await compressImageIfNeeded(selectedFile, 300 * 1024)
          : selectedFile;

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('kind', kind);

      const res = await fetch(`/api/applications/${applicationId}/files`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setIsUploading(false);

      if (!res.ok) {
        setError(data.error?.message || 'Failed to upload document');
      } else {
        setFile(data.file);
        onUploaded(data.file.id);
      }
    } catch {
      setIsUploading(false);
      setError('An error occurred during file upload');
    }
  };

  return (
    <div className="border border-gray-300 p-3 bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
        <div>
          <span className="font-bold text-sm text-gray-800">
            {label} {required && <span className="text-red-600">*</span>}
          </span>
          {description && <div className="text-xs text-gray-500">{description}</div>}
        </div>
        <div className="text-[11px] text-gray-500 font-mono">Max: {maxSizeMb} MB (PDF, JPG, PNG)</div>
      </div>

      {file ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-emerald-700 font-bold">✓ Uploaded:</span>
            <span className="font-mono text-gray-700 truncate">{file.original_name}</span>
            <span className="text-gray-500 text-[10px]">({Math.round(file.size_bytes / 1024)} KB)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#AC3D47] font-semibold underline hover:text-[#8D323A]"
            >
              Preview
            </a>
            <label className="text-xs text-red-700 font-semibold cursor-pointer hover:underline">
              Replace
              <input
                type="file"
                accept={accept}
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <input
            type="file"
            accept={accept}
            onChange={handleUpload}
            disabled={isUploading}
            className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-[#AC3D47] file:text-white hover:file:bg-[#8D323A] cursor-pointer"
          />
          {isUploading && <div className="text-xs text-[#AC3D47] font-semibold mt-1">Uploading document...</div>}
        </div>
      )}

      {error && <div className="mt-1.5 text-xs text-red-600 font-medium">{error}</div>}
    </div>
  );
}
