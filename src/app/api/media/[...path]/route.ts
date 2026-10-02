import { NextRequest, NextResponse } from "next/server";
import { resolveMediaPath, readMediaFile } from "@/lib/storage";
import { stat } from "fs/promises";

/**
 * Public media serving (Supabase-Storage public-bucket equivalent).
 * Reads only from storage/uploads, blocks traversal, images only,
 * immutable caching (filenames are unique UUIDs).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const urlPath = `/api/media/${segments.join("/")}`;

  const resolved = resolveMediaPath(urlPath);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const statInfo = await stat(resolved.absPath);
    if (!statInfo.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = await readMediaFile(resolved.absPath);

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": resolved.contentType,
        "Content-Length": String(statInfo.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
