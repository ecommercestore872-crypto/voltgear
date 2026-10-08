import { withShopApiObservability } from "@/lib/shop-api-observability";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from "@/lib/cloudinary";
import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";

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

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const REVIEW_UPLOAD_FOLDER = "ecommerce-store/reviews";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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
    const removeBackground = formData.get("removeBackground") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Send the image as the 'file' field." },
        { status: 400 },
      );
    }

    const mimeType = file.type || "";
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, or GIF images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    if (removeBackground) {
      return NextResponse.json(
        { error: "Background removal is not available for review photos." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
    try {
      metadata = await sharp(buffer, {
        failOn: "error",
        limitInputPixels: MAX_PIXELS,
      }).metadata();
    } catch {
      return NextResponse.json(
        { error: "The uploaded file is not a valid supported image." },
        { status: 400 },
      );
    }
    const expectedMime =
      metadata.format === "jpeg"
        ? "image/jpeg"
        : metadata.format === "png"
          ? "image/png"
          : metadata.format === "webp"
            ? "image/webp"
            : metadata.format === "gif"
              ? "image/gif"
              : null;
    if (
      !expectedMime ||
      expectedMime !== mimeType ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_PIXELS ||
      (metadata.pages ?? 1) > 60
    ) {
      return NextResponse.json(
        { error: "The uploaded image format or dimensions are not supported." },
        { status: 400 },
      );
    }
    const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: REVIEW_UPLOAD_FOLDER,
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
