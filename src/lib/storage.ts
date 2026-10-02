import "server-only";
import path from "path";
import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { generateId } from "@/lib/auth/password";

/**
 * Local file storage — the Supabase-Storage-equivalent layer.
 *
 * "Buckets":
 *   storage/uploads/  → public read (served via /api/media/*), admin-only write
 *
 * Security model:
 *   - Uploads: only through requireAdmin-guarded API (validated MIME + magic bytes + size)
 *   - Serving: path-traversal-proof, images only, immutable caching
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

/** Stores an uploaded image and returns its public URL (/api/media/...). */
export async function storeUpload(bytes: Uint8Array, mimeType: string): Promise<string> {
  const spec = ALLOWED_IMAGE_TYPES[mimeType];
  if (!spec) throw new Error("Unsupported image type");

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.join(UPLOAD_ROOT, String(now.getFullYear()), month);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${spec.ext}`;
  await writeFile(path.join(dir, filename), bytes);

  return `/api/media/${now.getFullYear()}/${month}/${filename}`;
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
