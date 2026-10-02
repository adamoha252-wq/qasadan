"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Image picker with upload, preview, replace, manual URL entry and remove.
 * Uploads go to /api/admin/upload (admin-only, validated).
 */
export function ImageUpload({
  label,
  value,
  onChange,
  id,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  id: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Network error during upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${id}-upload`}>{label}</Label>

      <div className="flex flex-wrap items-start gap-4">
        {/* Preview */}
        {value ? (
          <div className="relative">
            { }
            <img
              src={value}
              alt={`${label} preview`}
              className="h-24 w-32 rounded-lg border border-slate-200 object-cover"
            />
            <button
              type="button"
              onClick={async () => {
                // Only delete files we host; external URLs are just cleared
                if (value.startsWith("/api/media/")) {
                  await fetch("/api/admin/upload", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: value }),
                  }).catch(() => {});
                }
                onChange("");
              }}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            id={`${id}-upload`}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-500 transition-colors hover:border-cyan-400 hover:text-cyan-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            aria-label={`Upload ${label.toLowerCase()}`}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-cyan-600" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : "Upload image"}
          </button>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="flex gap-2">
            {value && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="h-8 border-navy-200 text-navy-700"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Replace
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput((s) => !s)}
              className="h-8 gap-1.5 px-2 text-slate-500"
              aria-expanded={showUrlInput}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              URL
            </Button>
          </div>
          {hint && <p className="text-xs text-slate-400">{hint}</p>}
          {showUrlInput && (
            <Input
              aria-label={`${label} URL`}
              placeholder="https://example.com/image.jpg"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-64 text-xs"
            />
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
