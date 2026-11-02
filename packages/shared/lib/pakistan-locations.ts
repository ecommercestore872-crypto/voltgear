/**
 * Authoritative internal Pakistan location model for checkout.
 * Courier spelling/codes are mapped separately (e.g. PostEx operational cities).
 * Based on PBS administrative regions (provinces + ICT + AJK + GB).
 */

export type PakistanRegionCode =
  | "PB"
  | "SD"
  | "KP"
  | "BA"
  | "ICT"
  | "AJK"
  | "GB";

export type PakistanRegion = {
  code: PakistanRegionCode;
  label: string;
};

export type PakistanCity = {
  id: string;
  label: string;
  region: PakistanRegionCode;
  /** Optional courier alias when spelling differs from customer label. */
  courierCityCode?: string;
  courierServiceable: boolean;
};

export const PAKISTAN_REGIONS: readonly PakistanRegion[] = [
  { code: "PB", label: "Punjab" },
  { code: "SD", label: "Sindh" },
  { code: "KP", label: "Khyber Pakhtunkhwa" },
  { code: "BA", label: "Balochistan" },
  { code: "ICT", label: "Islamabad Capital Territory" },
  { code: "AJK", label: "Azad Jammu & Kashmir" },
  { code: "GB", label: "Gilgit-Baltistan" },
] as const;

/** Major delivery cities — expand via courier sync rather than hardcoding forever. */
export const PAKISTAN_CITIES: readonly PakistanCity[] = [
  // Punjab
  { id: "lahore", label: "Lahore", region: "PB", courierServiceable: true },
  { id: "rawalpindi", label: "Rawalpindi", region: "PB", courierServiceable: true },
  { id: "faisalabad", label: "Faisalabad", region: "PB", courierServiceable: true },
  { id: "multan", label: "Multan", region: "PB", courierServiceable: true },
  { id: "gujranwala", label: "Gujranwala", region: "PB", courierServiceable: true },
  { id: "sialkot", label: "Sialkot", region: "PB", courierServiceable: true },
  { id: "bahawalpur", label: "Bahawalpur", region: "PB", courierServiceable: true },
  { id: "sargodha", label: "Sargodha", region: "PB", courierServiceable: true },
  { id: "gujrat", label: "Gujrat", region: "PB", courierServiceable: true },
  { id: "sahiwal", label: "Sahiwal", region: "PB", courierServiceable: true },
  { id: "jhelum", label: "Jhelum", region: "PB", courierServiceable: true },
  { id: "okara", label: "Okara", region: "PB", courierServiceable: true },
  { id: "sheikhupura", label: "Sheikhupura", region: "PB", courierServiceable: true },
  { id: "rahim-yar-khan", label: "Rahim Yar Khan", region: "PB", courierServiceable: true },
  { id: "dg-khan", label: "Dera Ghazi Khan", region: "PB", courierServiceable: true },
  // Sindh
  { id: "karachi", label: "Karachi", region: "SD", courierServiceable: true },
  { id: "hyderabad", label: "Hyderabad", region: "SD", courierServiceable: true },
  { id: "sukkur", label: "Sukkur", region: "SD", courierServiceable: true },
  { id: "larkana", label: "Larkana", region: "SD", courierServiceable: true },
  { id: "mirpurkhas", label: "Mirpur Khas", region: "SD", courierServiceable: true },
  { id: "nawabshah", label: "Nawabshah", region: "SD", courierServiceable: true },
  // KP
  { id: "peshawar", label: "Peshawar", region: "KP", courierServiceable: true },
  { id: "abbottabad", label: "Abbottabad", region: "KP", courierServiceable: true },
  { id: "mardan", label: "Mardan", region: "KP", courierServiceable: true },
  { id: "swat", label: "Swat", region: "KP", courierServiceable: true },
  { id: "kohat", label: "Kohat", region: "KP", courierServiceable: true },
  { id: "charsadda", label: "Charsadda", region: "KP", courierServiceable: true },
  // Balochistan
  { id: "quetta", label: "Quetta", region: "BA", courierServiceable: true },
  { id: "gwadar", label: "Gwadar", region: "BA", courierServiceable: true },
  { id: "turbat", label: "Turbat", region: "BA", courierServiceable: true },
  { id: "khuzdar", label: "Khuzdar", region: "BA", courierServiceable: true },
  // ICT
  { id: "islamabad", label: "Islamabad", region: "ICT", courierServiceable: true },
  // AJK
  { id: "muzaffarabad", label: "Muzaffarabad", region: "AJK", courierServiceable: true },
  { id: "mirpur-ajk", label: "Mirpur", region: "AJK", courierServiceable: true },
  // GB
  { id: "gilgit", label: "Gilgit", region: "GB", courierServiceable: true },
  { id: "skardu", label: "Skardu", region: "GB", courierServiceable: true },
] as const;

export function isPakistanRegionCode(value: unknown): value is PakistanRegionCode {
  return (
    typeof value === "string" &&
    PAKISTAN_REGIONS.some((r) => r.code === value)
  );
}

export function citiesForRegion(region: PakistanRegionCode): PakistanCity[] {
  return PAKISTAN_CITIES.filter((c) => c.region === region);
}

export function findCityById(cityId: string): PakistanCity | undefined {
  const needle = cityId.trim().toLowerCase();
  return PAKISTAN_CITIES.find((c) => c.id === needle);
}

export function findCityByLabel(label: string): PakistanCity | undefined {
  const needle = label.trim().toLowerCase();
  return PAKISTAN_CITIES.find((c) => c.label.toLowerCase() === needle);
}

export function resolveCheckoutLocation(input: {
  province?: string;
  city?: string;
  cityId?: string;
}):
  | {
      ok: true;
      province: PakistanRegionCode;
      cityId: string;
      cityLabel: string;
      courierCityCode?: string;
      courierServiceable: boolean;
    }
  | { ok: false; error: string } {
  const provinceRaw = (input.province ?? "").trim().toUpperCase();
  if (!isPakistanRegionCode(provinceRaw)) {
    return { ok: false, error: "Please select your province / region." };
  }

  const byId = input.cityId ? findCityById(input.cityId) : undefined;
  const byLabel = input.city ? findCityByLabel(input.city) : undefined;
  const city = byId ?? byLabel;
  if (!city) {
    return {
      ok: false,
      error: "Please select a delivery city from the list.",
    };
  }
  if (city.region !== provinceRaw) {
    return {
      ok: false,
      error: "City does not match the selected province.",
    };
  }
  if (!city.courierServiceable) {
    return {
      ok: false,
      error:
        "We cannot deliver COD to that city yet. Pick another city or contact support.",
    };
  }

  return {
    ok: true,
    province: provinceRaw,
    cityId: city.id,
    cityLabel: city.label,
    courierCityCode: city.courierCityCode,
    courierServiceable: city.courierServiceable,
  };
}

/** Flat labels for legacy datalists / migrations. */
export function pakistanCityLabels(): string[] {
  return PAKISTAN_CITIES.map((c) => c.label);
}
