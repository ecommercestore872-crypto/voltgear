import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_FOLDER,
} from "@/lib/cloudinary";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isConfigured(value: string | undefined): boolean {
  return !!value && !value.startsWith("your-");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

async function uploadToStorage(file: File, folder: string) {
  const client = getServiceClient();
  const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage.from("product-images").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  const { data } = client.storage.from("product-images").getPublicUrl(path);
  return { secureUrl: data.publicUrl, publicId: path };
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = (formData.get("folder") as string) || CLOUDINARY_FOLDER;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const isVideo = (file.type || "").startsWith("video/");
  const cloudinaryReady =
    isConfigured(CLOUDINARY_CLOUD_NAME) &&
    isConfigured(CLOUDINARY_API_KEY) &&
    isConfigured(CLOUDINARY_API_SECRET);

  if (cloudinaryReady) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "application/octet-stream";
      const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(base64, {
        folder,
        resource_type: isVideo ? "video" : "image",
        format: isVideo ? undefined : "jpg",
      });
      return NextResponse.json({
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      console.error("[admin/upload] Cloudinary failed, trying Storage", error);
    }
  }

  try {
    const stored = await uploadToStorage(file, folder.replace(/[^a-zA-Z0-9/_-]/g, "") || "admin");
    return NextResponse.json(stored);
  } catch (error) {
    console.error("[admin/upload] Storage failed", error);
    return NextResponse.json(
      { error: "Upload failed. Check Cloudinary or Storage settings." },
      { status: 500 }
    );
  }
}
