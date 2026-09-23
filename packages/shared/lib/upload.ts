export interface UploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Uploads an image to Cloudinary through the API route. Returns the secure
 * URL, or throws with a human-readable message on failure.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "reviews");

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Upload failed. Please try again.");
  }
  return json;
}
