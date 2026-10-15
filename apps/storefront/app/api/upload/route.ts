import { withShopApiObservability } from "@/lib/shop-api-observability";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from "@/lib/cloudinary";
import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";
import { isDemoRequest } from "@/lib/demo";
import {
  hasExpectedImageSignature,
  REVIEW_UPLOAD_MAX_BYTES,
  REVIEW_UPLOAD_TYPES,
} from "@/lib/upload-rules";

function isConfigured(value: string | undefined): boolean {
  return !!value && !value.startsWith("your-");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadLimiter = createMemoryRateLimiter({
  limit: 8,
  windowMs: 60_000,
  maxKeys: 5_000,
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

async function POSTHandler(request: Request) {
  try {
    const ip = clientIp(request);
    if (!uploadLimiter.take({ ip })) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a minute and try again." },
        { status: 429 },
      );
    }

    if (isDemoRequest(request)) {
      return NextResponse.json(
        { error: "Image uploads are disabled in practice mode." },
        { status: 403 },
      );
    }

    if (
      !isConfigured(CLOUDINARY_CLOUD_NAME) ||
      !isConfigured(CLOUDINARY_API_KEY) ||
      !isConfigured(CLOUDINARY_API_SECRET)
    ) {
      return NextResponse.json(
        { error: "Cloudinary credentials are not configured on the server." },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Send the image as the 'file' field." },
        { status: 400 },
      );
    }

    const mimeType = file.type || "";
    if (!REVIEW_UPLOAD_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, or WebP images are allowed." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > REVIEW_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedImageSignature(buffer, mimeType)) {
      return NextResponse.json(
        { error: "The file content does not match its image type." },
        { status: 400 },
      );
    }
    const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      // The public endpoint is dedicated to review evidence. Client input can
      // never select a different Cloudinary folder or paid transformation.
      folder: "reviews",
      resource_type: "image",
      transformation: {
        quality: "auto",
        fetch_format: "auto",
      },
    });

    return NextResponse.json({
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      backgroundRemoved: false,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Please check the file and try again." },
      { status: 500 },
    );
  }
}

export const POST = withShopApiObservability("POST /api/upload", POSTHandler);
