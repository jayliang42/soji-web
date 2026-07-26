import { NextRequest, NextResponse } from "next/server";
import {
  getContentImageExtension,
  validateContentImage,
  type ContentImageMimeType
} from "@/lib/content-image-validation";
import { reportOperationalError } from "@/lib/observability";
import { getPublisherContext } from "@/lib/publisher";

const CONTENT_MEDIA_BUCKET = "content-media";
function buildContentMediaPath({
  mimeType,
  userId
}: {
  mimeType: ContentImageMimeType;
  userId: string;
}) {
  const day = new Date().toISOString().slice(0, 10);
  const extension = getContentImageExtension(mimeType);
  return `content/${userId}/${day}/${crypto.randomUUID()}.${extension}`;
}

export async function POST(request: NextRequest) {
  const context = await getPublisherContext();
  if ("error" in context) {
    return context.error;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { ok: false, reason: "invalid_upload_request" },
      { status: 400 }
    );
  }
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, reason: "missing_file" },
      { status: 400 }
    );
  }

  const validation = await validateContentImage(file);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, reason: validation.reason },
      { status: 400 }
    );
  }

  const path = buildContentMediaPath({
    mimeType: validation.mimeType,
    userId: context.user.id
  });

  const { data, error } = await context.supabase.storage
    .from(CONTENT_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    });

  if (error || !data) {
    await reportOperationalError("admin.content_image.upload_failed", error, {
      path,
      userId: context.user.id
    });
    return NextResponse.json(
      { ok: false, reason: "upload_failed" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl }
  } = context.supabase.storage.from(CONTENT_MEDIA_BUCKET).getPublicUrl(data.path);

  return NextResponse.json({
    ok: true,
    path: data.path,
    url: publicUrl
  });
}
