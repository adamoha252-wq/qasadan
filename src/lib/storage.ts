import "server-only";
import path from "path";
import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { generateId } from "@/lib/auth/password";

/**
 * Media storage layer with two interchangeable backends:
 *
 *   1. Supabase Storage (production / serverless) — enabled by setting
 *      SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (MEDIA_BUCKET optional, default "uploads").
 *   2. Local disk (sandbox/dev) — storage/uploads/, served via /api/media/*.
 *
 * Security model (both backends):
 *   - Uploads: only through requireAdmin-guarded API (validated MIME + magic bytes + size)
 *   - Serving: public read of image objects only; immutable caching
 *   - Deletion: admin-only, same guarded API
 */

export const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES: Record<string, { ext: string; label: string }> = {
  "image/jpeg": { ext: "jpg", label: "JPEG" },
  "image/png": { ext: "png", label: "PNG" },
  "image/webp": { ext: "webp", label: "WebP" },
  "image/gif": { ext: "gif", label: "GIF" },
};

/** Magic-byte sniffing — never trust the client-supplied Content-Type alone. */
export function detectImageType(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  // GIF: GIF87a / GIF89a
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

/** Returns the Supabase Storage backend config, or null when not configured (→ local disk). */
function cloudConfig(): { url: string; key: string; bucket: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key && /^https?:\/\//.test(url)) {
    return { url, key, bucket: process.env.MEDIA_BUCKET?.trim() || "uploads" };
  }
  return null;
}

/** Diagnostics helper — which backend is active for this server. */
export function storageMode(): "supabase" | "local" {
  return cloudConfig() ? "supabase" : "local";
}

/** True when the URL is a media object this storage layer manages (local or cloud). */
export function isValidMediaUrl(url: string): boolean {
  if (url.startsWith("/api/media/")) return resolveMediaPath(url) !== null;
  const cloud = cloudConfig();
  if (cloud) {
    return url.startsWith(`${cloud.url}/storage/v1/object/public/${cloud.bucket}/`);
  }
  return false;
}

/** Extracts the object path from a Supabase public media URL, or null. */
function cloudObjectPath(url: string): string | null {
  const cloud = cloudConfig();
  if (!cloud) return null;
  const prefix = `${cloud.url}/storage/v1/object/public/${cloud.bucket}/`;
  if (!url.startsWith(prefix)) return null;
  const rel = url.slice(prefix.length);
  if (!rel || rel.includes("..") || rel.includes("\\") || rel.includes("//")) return null;
  if (!/^[a-zA-Z0-9._\/-]+$/.test(rel)) return null;
  return rel;
}

/** Stores an uploaded image and returns its public URL (Supabase URL or /api/media/...). */
export async function storeUpload(bytes: Uint8Array, mimeType: string): Promise<string> {
  const spec = ALLOWED_IMAGE_TYPES[mimeType];
  if (!spec) throw new Error("Unsupported image type");

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const objectPath = `${now.getFullYear()}/${month}/${randomUUID()}.${spec.ext}`;

  const cloud = cloudConfig();
  if (cloud) {
    // Supabase Storage REST upload (service key bypasses RLS; this module is server-only).
    // Both headers required: legacy JWTs and new sb_secret_ keys work with this pattern.
    const res = await fetch(
      `${cloud.url}/storage/v1/object/${cloud.bucket}/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: cloud.key,
          Authorization: `Bearer ${cloud.key}`,
          "Content-Type": mimeType,
          "x-upsert": "false",
        },
        body: bytes as unknown as BodyInit,
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase Storage upload failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return `${cloud.url}/storage/v1/object/public/${cloud.bucket}/${objectPath}`;
  }

  // Local disk backend
  const dir = path.join(UPLOAD_ROOT, String(now.getFullYear()), month);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, path.basename(objectPath)), bytes);

  return `/api/media/${now.getFullYear()}/${month}/${path.basename(objectPath)}`;
}

/**
 * Resolves a media URL path to an absolute file path — safely.
 * Returns null on traversal attempts or non-image extensions.
 */
export function resolveMediaPath(urlPath: string): { absPath: string; contentType: string } | null {
  // Expect: /api/media/<year>/<month>/<file>
  const prefix = "/api/media/";
  if (!urlPath.startsWith(prefix)) return null;
  const rel = urlPath.slice(prefix.length);

  // Reject anything suspicious
  if (rel.includes("..") || rel.includes("\\") || rel.startsWith("/")) return null;
  const parts = rel.split("/");
  if (parts.length !== 3) return null;
  if (!parts.every((p) => /^[a-zA-Z0-9._-]+$/.test(p))) return null;

  const ext = parts[2].split(".").pop()?.toLowerCase() || "";
  const contentType = EXT_CONTENT_TYPE[ext];
  if (!contentType) return null;

  const absPath = path.resolve(UPLOAD_ROOT, ...parts);
  // Belt and braces: resolved path must remain inside UPLOAD_ROOT
  if (!absPath.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) return null;

  return { absPath, contentType };
}

/** Reads a stored media file. */
export async function readMediaFile(absPath: string): Promise<Buffer> {
  return readFile(absPath);
}

/** Deletes a stored media file by its public URL (admin-only callers). */
export async function deleteMediaFile(urlPath: string): Promise<boolean> {
  // Cloud object? → Supabase Storage delete
  const cloudObject = cloudObjectPath(urlPath);
  if (cloudObject) {
    const cloud = cloudConfig()!;
    const res = await fetch(
      `${cloud.url}/storage/v1/object/${cloud.bucket}/${cloudObject}`,
      {
        method: "DELETE",
        headers: {
          apikey: cloud.key,
          Authorization: `Bearer ${cloud.key}`,
        },
      }
    );
    return res.ok;
  }

  // Otherwise: local disk file
  const resolved = resolveMediaPath(urlPath);
  if (!resolved) return false;
  try {
    await unlink(resolved.absPath);
    return true;
  } catch {
    return false;
  }
}

/** Test helper: generates an id (unused placeholder for parity). */
export const storageId = generateId;
