import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/crud-helpers";
import {
  storeUpload,
  deleteMediaFile,
  detectImageType,
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage";

/**
 * Admin-only image upload (Supabase-Storage admin-write equivalent).
 * multipart/form-data with a "file" field. Validates MIME, magic bytes and size.
 */
export async function POST(request: NextRequest) {
  return withAdmin(async () => {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` },
        { status: 413 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Magic-byte verification (never trust declared MIME alone)
    const detectedType = detectImageType(bytes);
    if (!detectedType || !ALLOWED_IMAGE_TYPES[detectedType]) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP and GIF images are allowed." },
        { status: 415 }
      );
    }

    const url = await storeUpload(bytes, detectedType);
    return NextResponse.json({ url }, { status: 201 });
  });
}

/**
 * Admin-only media deletion.
 * Body: { url: "/api/media/2026/10/xxx.jpg" }
 */
export async function DELETE(request: NextRequest) {
  return withAdmin(async () => {
    let body: { url?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const url = typeof body.url === "string" ? body.url : "";
    if (!url.startsWith("/api/media/")) {
      return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });
    }
    const deleted = await deleteMediaFile(url);
    return NextResponse.json({ success: deleted });
  });
}
