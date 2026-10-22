"use client";

import Image from "next/image";
import { useRef, useState } from "react";

interface UploadCardProps {
  id: string;
  title: string;
  description: string;
  captureMode: "user" | "environment";
  previewUrl: string | null;
  fileName: string | null;
  error: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

export function UploadCard({
  id,
  title,
  description,
  captureMode,
  previewUrl,
  fileName,
  error,
  onSelect,
  onRemove,
}: UploadCardProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      onSelect(file);
    }
  };

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <p className="text-sm text-zinc-600">{description}</p>
        </div>
        {previewUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Remove
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={`${title} upload zone`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            pickerRef.current?.click();
          }
        }}
        className={`group flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center transition ${
          isDragging
            ? "border-zinc-900 bg-zinc-100"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
        }`}
      >
        {previewUrl ? (
          <div className="w-full space-y-2">
            <Image
              src={previewUrl}
              alt={`${title} preview`}
              width={640}
              height={480}
              unoptimized
              className="mx-auto aspect-[4/5] max-h-64 w-auto rounded-xl object-cover"
            />
            <p className="truncate text-xs text-zinc-500">{fileName}</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-800">Drop image here</p>
            <p className="mt-1 text-xs text-zinc-500">PNG, JPG, WEBP · up to 10MB</p>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Choose image
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Capture photo
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <input
        ref={pickerRef}
        id={`${id}-picker`}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <input
        ref={cameraRef}
        id={`${id}-camera`}
        type="file"
        accept="image/*"
        capture={captureMode}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </section>
  );
}
