import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { isAdminRequest } from "@/lib/admin";
import {
  CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_FOLDER,
} from "@/lib/cloudinary";
import {
  ADMIN_UPLOAD_MAX_BYTES, ADMIN_UPLOAD_MAX_PIXELS, adminUploadFolder,
  isAdminUploadUrl, validateAdminUploadMetadata, validateAdminUploadSignature,
} from "@/lib/admin-upload-rules";
import { getServiceClient } from "@/lib/supabase/server";
import { isDefiniteStorageRejection, UncertainStorageUploadError } from "@/lib/admin-upload-outcome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isConfigured(value: string | undefined): boolean {
  return !!value && !value.startsWith("your-");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET,
});

async function uploadToStorage(file: File, buffer: Buffer, folder: string, mimeType: string) {
  const client = getServiceClient();
  const ext = file.name.split(".").pop()!.toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  let result;
  try {
    result = await client.storage.from("product-images").upload(path, buffer, {
      contentType: mimeType, upsert: false,
    });
  } catch { throw new UncertainStorageUploadError(); }
  if (!result || typeof result !== "object" || !("error" in result)) {
    throw new UncertainStorageUploadError();
  }
  if (result.error) {
    if (isDefiniteStorageRejection(result.error)) throw new Error("Storage rejected upload");
    throw new UncertainStorageUploadError();
  }
  // Bytes have committed. A malformed URL/response must not invite a blind retry.
  try {
    const { data } = client.storage.from("product-images").getPublicUrl(path);
    if (!isAdminUploadUrl(data?.publicUrl)) throw new UncertainStorageUploadError();
    return { secureUrl: data.publicUrl, publicId: path };
  } catch { throw new UncertainStorageUploadError(); }
}

async function POSTHandler(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Early transport check is advisory; File.size is checked after parsing too.
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > ADMIN_UPLOAD_MAX_BYTES + 256_000) {
    return NextResponse.json({ error: "Images must be 4 MB or smaller." }, { status: 413 });
  }
  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: "Provide a valid image upload." }, { status: 400 }); }
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  let image: ReturnType<typeof validateAdminUploadMetadata>;
  let folder: string;
  try {
    image = validateAdminUploadMetadata(file);
    folder = adminUploadFolder(formData.get("folder"), CLOUDINARY_FOLDER);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid image." }, {
      status: file.size > ADMIN_UPLOAD_MAX_BYTES ? 413 : 400,
    });
  }
  let buffer: Buffer;
  let dimensions: { width?: number; height?: number } = {};
  try {
    buffer = Buffer.from(await file.arrayBuffer());
    validateAdminUploadSignature(buffer, image);
    if (!image.requiresConversion) {
      const decoder = sharp(buffer, { animated: true, limitInputPixels: ADMIN_UPLOAD_MAX_PIXELS, failOn: "warning" });
      const metadata = await decoder.metadata();
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > ADMIN_UPLOAD_MAX_PIXELS) {
        throw new Error("Invalid image dimensions");
      }
      // Unlike metadata/header checks, stats forces decoding. Do not alter stored bytes or animation.
      await decoder.stats();
      dimensions = { width: metadata.width, height: metadata.pageHeight ?? metadata.height };
    }
  } catch {
    return NextResponse.json({ error: "The image could not be read safely. Export a valid image and try again." }, { status: 400 });
  }

  const cloudinaryReady = isConfigured(CLOUDINARY_CLOUD_NAME) && isConfigured(CLOUDINARY_API_KEY) && isConfigured(CLOUDINARY_API_SECRET);
  if (cloudinaryReady) {
    let result;
    let completed = false;
    try {
      const options: UploadApiOptions = { folder, resource_type: "image" };
      if (image.requiresConversion) options.format = "webp";
      result = await cloudinary.uploader.upload(`data:${image.mimeType};base64,${buffer.toString("base64")}`, options);
      completed = true;
    } catch (error) {
      const providerCode = error && typeof error === "object" && "http_code" in error ? error.http_code : undefined;
      // A timeout/network/5xx result may have persisted the upload already.
      // Only an explicit rejection is safe to send to a second storage provider.
      if (typeof providerCode !== "number" || ![400, 401, 403, 404, 413, 415, 420, 429].includes(providerCode)) {
        return NextResponse.json({ error: "Upload outcome is uncertain. Check the media provider before retrying." }, { status: 502 });
      }
      console.error("[admin/upload] Cloudinary rejected the upload");
    }
    if (completed) {
      if (!result || !isAdminUploadUrl(result.secure_url) || typeof result.public_id !== "string" || !result.public_id.trim() ||
          !Number.isSafeInteger(result.width) || result.width <= 0 || !Number.isSafeInteger(result.height) || result.height <= 0 ||
          result.width * result.height > ADMIN_UPLOAD_MAX_PIXELS || (image.requiresConversion && result.format !== "webp")) {
        // A provider may already have stored an asset. Do not automatically create a second copy.
        return NextResponse.json({ error: "Upload returned an invalid response. Check the media provider before retrying." }, { status: 502 });
      }
      return NextResponse.json({ publicId: result.public_id, secureUrl: result.secure_url, width: result.width, height: result.height });
    }
  }
  if (image.requiresConversion) {
    return NextResponse.json({ error: "HEIC/HEIF requires the image conversion provider. Export JPEG, PNG or WebP and try again." }, { status: 503 });
  }
  try { return NextResponse.json({ ...await uploadToStorage(file, buffer, folder, image.mimeType), ...dimensions }); }
  catch (error) {
    if (error instanceof UncertainStorageUploadError) {
      return NextResponse.json({ error: "Upload outcome is uncertain. Check Storage before retrying." }, { status: 502 });
    }
    console.error("[admin/upload] Storage upload unavailable");
    return NextResponse.json({ error: "Upload failed. Check Cloudinary or Storage settings." }, { status: 503 });
  }
}

async function DELETEHandler(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    error: "Removing media only unlinks it from the form. Permanent deletion is disabled until reference-safe cleanup is available.",
  }, { status: 409 });
}

export const POST = withAdminApiObservability("POST /api/admin/upload", POSTHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/upload", DELETEHandler);
