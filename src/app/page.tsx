"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrivacyNotice } from "@/components/PrivacyNotice";
import { ResultPanel } from "@/components/ResultPanel";
import { StatusPanel } from "@/components/StatusPanel";
import { StepIndicator } from "@/components/StepIndicator";
import { UploadCard } from "@/components/UploadCard";

type UploadKey = "customer" | "top" | "bottom";

type UploadAsset = {
  file: File;
  previewUrl: string;
};

type Profile = {
  height: string;
  weight: string;
  usualSize: string;
  bodyShape: string;
  fitPreference: string;
};

type GenerationState = {
  phase: "idle" | "processing" | "done";
  progress: number;
  message: string;
};

type ResultState = {
  generatedAt: string;
  insights: { label: string; value: string }[];
};

const INITIAL_PROFILE: Profile = {
  height: "",
  weight: "",
  usualSize: "",
  bodyShape: "",
  fitPreference: "",
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function Home() {
  const [uploads, setUploads] = useState<Record<UploadKey, UploadAsset | null>>({
    customer: null,
    top: null,
    bottom: null,
  });
  const [errors, setErrors] = useState<Record<UploadKey, string | null>>({
    customer: null,
    top: null,
    bottom: null,
  });
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [generation, setGeneration] = useState<GenerationState>({
    phase: "idle",
    progress: 0,
    message: "Ready when you are.",
  });
  const [result, setResult] = useState<ResultState | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const uploadsRef = useRef(uploads);

  const hasRequiredUploads = Boolean(uploads.customer && uploads.top && uploads.bottom);
  const hasProfileValues = Object.values(profile).some(Boolean);

  const activeStep = useMemo(() => {
    if (generation.phase !== "idle") {
      return 4;
    }
    if (!hasRequiredUploads) {
      return 1;
    }
    if (!hasProfileValues) {
      return 2;
    }
    return 3;
  }, [generation.phase, hasProfileValues, hasRequiredUploads]);

  const clearPendingTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    return () => {
      clearPendingTimers();
      Object.values(uploadsRef.current).forEach((asset) => {
        if (asset?.previewUrl) {
          URL.revokeObjectURL(asset.previewUrl);
        }
      });
    };
  }, []);

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      return "Please upload a PNG, JPG, or WEBP image.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "Image is too large. Please keep files under 10MB.";
    }
    return null;
  };

  const updateUpload = (key: UploadKey, file: File) => {
    const validationError = validateFile(file);

    if (validationError) {
      setErrors((prev) => ({ ...prev, [key]: validationError }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setUploads((prev) => {
      const previousAsset = prev[key];
      if (previousAsset?.previewUrl) {
        URL.revokeObjectURL(previousAsset.previewUrl);
      }

      return {
        ...prev,
        [key]: {
          file,
          previewUrl,
        },
      };
    });

    setErrors((prev) => ({ ...prev, [key]: null }));
    setGeneration({ phase: "idle", progress: 0, message: "Ready when you are." });
    setResult(null);
    clearPendingTimers();
  };

  const removeUpload = (key: UploadKey) => {
    setUploads((prev) => {
      const asset = prev[key];
      if (asset?.previewUrl) {
        URL.revokeObjectURL(asset.previewUrl);
      }
      return { ...prev, [key]: null };
    });
    setErrors((prev) => ({ ...prev, [key]: null }));
    setGeneration({ phase: "idle", progress: 0, message: "Ready when you are." });
    setResult(null);
    clearPendingTimers();
  };

  const resetSession = () => {
    clearPendingTimers();
    setUploads((prev) => {
      Object.values(prev).forEach((asset) => {
        if (asset?.previewUrl) {
          URL.revokeObjectURL(asset.previewUrl);
        }
      });
      return { customer: null, top: null, bottom: null };
    });
    setErrors({ customer: null, top: null, bottom: null });
    setProfile(INITIAL_PROFILE);
    setGeneration({ phase: "idle", progress: 0, message: "Ready when you are." });
    setResult(null);
  };

  const startGeneration = () => {
    if (!hasRequiredUploads) {
      setErrors((prev) => ({
        ...prev,
        customer: uploads.customer ? prev.customer : "Customer image is required.",
        top: uploads.top ? prev.top : "Top image is required.",
        bottom: uploads.bottom ? prev.bottom : "Bottom image is required.",
      }));
      return;
    }

    clearPendingTimers();
    setGeneration({ phase: "processing", progress: 6, message: "Preparing a secure local preview..." });
    setResult(null);

    const phases = [
      { progress: 24, message: "Balancing tone and lighting..." },
      { progress: 53, message: "Aligning top and bottom with body silhouette..." },
      { progress: 79, message: "Estimating fit across shoulders, waist, and length..." },
      { progress: 96, message: "Finalizing mock output..." },
    ];

    phases.forEach((phase, index) => {
      const timeoutId = window.setTimeout(() => {
        setGeneration({ phase: "processing", progress: phase.progress, message: phase.message });
      }, (index + 1) * 900);
      timeoutsRef.current.push(timeoutId);
    });

    const finalTimeoutId = window.setTimeout(() => {
      const fitPreference = profile.fitPreference || "balanced";
      setGeneration({ phase: "done", progress: 100, message: "Mock preview ready." });
      setResult({
        generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        insights: [
          { label: "Shoulders", value: "Natural alignment with room to move" },
          { label: "Waist", value: fitPreference === "relaxed" ? "Relaxed drape" : "Clean contour" },
          { label: "Length", value: "Top and pants proportions look balanced" },
          { label: "Overall fit", value: `Best match: ${fitPreference} profile` },
        ],
      });
    }, 4600);
    timeoutsRef.current.push(finalTimeoutId);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="rounded-3xl bg-zinc-950 p-6 text-zinc-100 shadow-lg sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Fashion Agent</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Private virtual try-on studio</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
            Upload your photo, top, and pants to preview style and fit in a secure local mock workflow before connecting a production AI backend.
          </p>
        </header>

        <PrivacyNotice />

        <StepIndicator
          activeStep={activeStep}
          steps={["Upload", "Profile", "Review", "Generate"]}
        />

        <section className="grid gap-4 lg:grid-cols-3">
          <UploadCard
            id="customer"
            title="Customer photo"
            description="Front-facing full body or half body image"
            captureMode="user"
            previewUrl={uploads.customer?.previewUrl ?? null}
            fileName={uploads.customer?.file.name ?? null}
            error={errors.customer}
            onSelect={(file) => updateUpload("customer", file)}
            onRemove={() => removeUpload("customer")}
          />
          <UploadCard
            id="top"
            title="Shirt / top"
            description="Flat lay or product shot"
            captureMode="environment"
            previewUrl={uploads.top?.previewUrl ?? null}
            fileName={uploads.top?.file.name ?? null}
            error={errors.top}
            onSelect={(file) => updateUpload("top", file)}
            onRemove={() => removeUpload("top")}
          />
          <UploadCard
            id="bottom"
            title="Pants / bottom"
            description="Flat lay or product shot"
            captureMode="environment"
            previewUrl={uploads.bottom?.previewUrl ?? null}
            fileName={uploads.bottom?.file.name ?? null}
            error={errors.bottom}
            onSelect={(file) => updateUpload("bottom", file)}
            onRemove={() => removeUpload("bottom")}
          />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Profile details (optional)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add profile information to refine fit notes for this local mock preview.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { key: "height", label: "Height", placeholder: "e.g. 172 cm" },
              { key: "weight", label: "Weight", placeholder: "e.g. 68 kg" },
              { key: "usualSize", label: "Usual size", placeholder: "e.g. M / 32" },
              { key: "bodyShape", label: "Body shape", placeholder: "e.g. Athletic" },
              { key: "fitPreference", label: "Fit preference", placeholder: "e.g. Relaxed" },
            ].map((field) => (
              <label key={field.key} className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">{field.label}</span>
                <input
                  type="text"
                  value={profile[field.key as keyof Profile]}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Review before generation</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Customer</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{uploads.customer?.file.name ?? "Not added"}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Top</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{uploads.top?.file.name ?? "Not added"}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Bottom</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{uploads.bottom?.file.name ?? "Not added"}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Fit preference</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{profile.fitPreference || "Balanced"}</p>
            </article>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startGeneration}
              disabled={generation.phase === "processing"}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {generation.phase === "processing" ? "Generating..." : "Start mock try-on"}
            </button>
            <button
              type="button"
              onClick={resetSession}
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              Reset session
            </button>
          </div>
        </section>

        {generation.phase === "processing" && (
          <StatusPanel progress={generation.progress} message={generation.message} />
        )}

        {generation.phase === "done" && result && (
          <ResultPanel
            generatedAt={result.generatedAt}
            insights={result.insights}
            previewUrl={uploads.customer?.previewUrl ?? null}
          />
        )}
      </div>
    </main>
  );
}
