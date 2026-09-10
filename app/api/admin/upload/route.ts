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
  const ext = (file.name.split(".").pop() || "bin").replace(
    /[^a-zA-Z0-9]/g,
    "",
  );
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage
    .from("product-images")
    .upload(path, buffer, {
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
    const stored = await uploadToStorage(
      file,
      folder.replace(/[^a-zA-Z0-9/_-]/g, "") || "admin",
    );
    return NextResponse.json(stored);
  } catch (error) {
    console.error("[admin/upload] Storage failed", error);
    return NextResponse.json(
      { error: "Upload failed. Check Cloudinary or Storage settings." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url") || searchParams.get("publicId");

  if (!urlParam) {
    return NextResponse.json({ error: "Missing url or publicId parameter" }, { status: 400 });
  }

  try {
    // 1. Check if it's a Supabase storage URL
    if (urlParam.includes("/storage/v1/object/public/product-images/")) {
      const path = urlParam.split("/storage/v1/object/public/product-images/")[1];
      if (path) {
        const client = getServiceClient();
        const { error } = await client.storage.from("product-images").remove([path]);
        if (error) {
          console.error("[admin/upload DELETE] Supabase remove error", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, deleted: path });
      }
    }

    // 2. Check if Cloudinary is configured, and try deleting from Cloudinary
    const cloudinaryReady =
      isConfigured(CLOUDINARY_CLOUD_NAME) &&
      isConfigured(CLOUDINARY_API_KEY) &&
      isConfigured(CLOUDINARY_API_SECRET);

    if (cloudinaryReady) {
      let publicId = urlParam;
      // Extract public_id if a full Cloudinary URL was passed
      if (urlParam.includes("res.cloudinary.com")) {
        const parts = urlParam.split("/upload/");
        if (parts.length > 1) {
          // Remove version number if present (e.g. v1234567/)
          let pathPart = parts[1];
          if (pathPart.match(/^v\d+\//)) {
            pathPart = pathPart.replace(/^v\d+\//, "");
          }
          // Remove file extension
          publicId = pathPart.split(".")[0];
        }
      }

      const result = await cloudinary.uploader.destroy(publicId);
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: true, message: "URL not recognized for explicit deletion" });
  } catch (error: any) {
    console.error("[admin/upload DELETE] failed", error);
    return NextResponse.json({ error: error.message || "Failed to delete asset" }, { status: 500 });
  }
}

