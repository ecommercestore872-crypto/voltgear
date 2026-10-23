/** Keep file payloads below the hosting request ceiling, including multipart overhead. */
export const ADMIN_UPLOAD_MAX_BYTES = 4_000_000;
export const ADMIN_UPLOAD_MAX_PIXELS = 40_000_000;

type ImageKind = "jpeg" | "png" | "webp" | "gif" | "avif" | "heic" | "heif";
export type AdminUploadImage = { kind: ImageKind; mimeType: string; requiresConversion: boolean };

const formats: Record<string, { kind: ImageKind; mimeType: string }> = {
  jpg: { kind: "jpeg", mimeType: "image/jpeg" },
  jpeg: { kind: "jpeg", mimeType: "image/jpeg" },
  png: { kind: "png", mimeType: "image/png" },
  webp: { kind: "webp", mimeType: "image/webp" },
  gif: { kind: "gif", mimeType: "image/gif" },
  avif: { kind: "avif", mimeType: "image/avif" },
  heic: { kind: "heic", mimeType: "image/heic" },
  heif: { kind: "heif", mimeType: "image/heif" },
};

/** Metadata gate only: a browser MIME type and filename are not proof of file contents. */
export function validateAdminUploadMetadata(file: Pick<File, "name" | "type" | "size">): AdminUploadImage {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error("Choose a non-empty image file.");
  if (file.size > ADMIN_UPLOAD_MAX_BYTES) throw new Error("Images must be 4 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const format = formats[extension];
  if (!format) throw new Error("Use a JPEG, PNG, WebP, GIF, AVIF, HEIC or HEIF image.");
  // Some phone/browser combinations omit MIME metadata; byte validation still applies.
  const mimeType = file.type.toLowerCase();
  if (mimeType && mimeType !== format.mimeType) throw new Error("The image type does not match its filename.");
  return { ...format, requiresConversion: format.kind === "heic" || format.kind === "heif" };
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** Header consistency only. The server must also decode raster images before storing them. */
export function validateAdminUploadSignature(bytes: Uint8Array, image: AdminUploadImage): void {
  let matches = false;
  switch (image.kind) {
    case "jpeg": matches = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; break;
    case "png": matches = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte); break;
    case "gif": matches = ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6)); break;
    case "webp": matches = ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP"; break;
    default: {
      // ISO-BMFF ftyp box: major brand, minor version, then compatible brands.
      if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") break;
      const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
      if (boxSize < 16 || boxSize > bytes.length || boxSize > 4096 || boxSize % 4 !== 0) break;
      const brands = [ascii(bytes, 8, 4)];
      for (let offset = 16; offset < boxSize; offset += 4) brands.push(ascii(bytes, offset, 4));
      const avif = brands.some((brand) => brand === "avif" || brand === "avis");
      const heic = brands.some((brand) => ["heic", "heix", "hevc", "hevx"].includes(brand));
      matches = image.kind === "avif" ? avif : !avif && (heic || (image.kind === "heif" && brands.includes("mif1")));
    }
  }
  if (!matches) throw new Error("The image contents do not match its file type.");
}

export function adminUploadFolder(value: unknown, fallback: string): string {
  const folder = value === null || value === "" ? fallback : value;
  if (typeof folder !== "string" || folder.length > 120 ||
      !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)) {
    throw new Error("Choose a valid upload folder.");
  }
  return folder;
}

export function isAdminUploadUrl(value: unknown): value is string {
  if (typeof value !== "string" || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}
