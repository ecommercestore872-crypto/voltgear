import locationData from "./pakistan-locations-data.json";

/**
 * Search suggestions derived from Open Admin Data's Pakistan tehsil names
 * (CC-BY-4.0, revision e2beaf0cfc3f3f5d83b80c0e45715003a3fd2ee7),
 * with major city names added where the administrative unit uses another name.
 * These are geographic suggestions, never a promise of PostEx delivery.
 */
export const PAKISTAN_PROVINCES = [
  { code: "punjab", label: "Punjab" },
  { code: "sindh", label: "Sindh" },
  { code: "khyber-pakhtunkhwa", label: "Khyber Pakhtunkhwa (KPK)" },
  { code: "balochistan", label: "Balochistan" },
  { code: "islamabad-capital-territory", label: "Islamabad Capital Territory" },
  { code: "azad-jammu-kashmir", label: "Azad Jammu & Kashmir" },
  { code: "gilgit-baltistan", label: "Gilgit-Baltistan" },
] as const;

export type PakistanProvinceCode = (typeof PAKISTAN_PROVINCES)[number]["code"];
export type PakistanCityServiceability = "postex_listed" | "manual_review";

export type PakistanCity = {
  name: string;
  provinceCode: PakistanProvinceCode;
  aliases: readonly string[];
  serviceability: PakistanCityServiceability;
  postExCityName?: string;
};

const CITY_ALIASES: Partial<Record<PakistanProvinceCode, Record<string, readonly string[]>>> = {
  punjab: {
    Faisalabad: ["FSD", "Lyallpur"],
    Rawalpindi: ["Pindi", "RWP"],
    Sargodha: ["Sargoda"],
    Sheikhupura: ["Sheikhupura City"],
    Sialkot: ["Sial Kot"],
  },
  sindh: {
    Karachi: ["KHI", "Karachi City"],
    Hyderabad: ["Hyder Abad"],
    Umerkot: ["Umar Kot"],
  },
  "khyber-pakhtunkhwa": {
    Peshawar: ["Peshawer"],
  },
  balochistan: {
    Quetta: ["Qta"],
  },
  "islamabad-capital-territory": {
    Islamabad: ["ISB"],
  },
  "azad-jammu-kashmir": {
    Muzaffarabad: ["Muzaffar Abad"],
  },
};

function searchKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, "");
}

const cityRecords = Object.fromEntries(
  PAKISTAN_PROVINCES.map(({ code }) => [
    code,
    locationData.cities[code].map((name) => ({
      name,
      provinceCode: code,
      aliases: CITY_ALIASES[code]?.[name] ?? [],
      serviceability: "manual_review" as const,
    })),
  ]),
) as Record<PakistanProvinceCode, PakistanCity[]>;

export function normalizePakistanProvinceCode(raw: string | null | undefined): PakistanProvinceCode | null {
  const key = searchKey(raw?.trim() ?? "");
  if (!key) return null;
  const province = PAKISTAN_PROVINCES.find(
    (entry) => searchKey(entry.code) === key || searchKey(entry.label) === key,
  );
  if (province) return province.code;
  if (key === "kpk" || key === "kp" || key === "khyberpakhtunkhwa") return "khyber-pakhtunkhwa";
  if (key === "ict" || key === "islamabad") return "islamabad-capital-territory";
  if (key === "ajk" || key === "azadkashmir") return "azad-jammu-kashmir";
  if (key === "gb" || key === "gilgitbaltistan") return "gilgit-baltistan";
  return null;
}

export function pakistanProvinceLabel(raw: string | null | undefined): string | null {
  const code = normalizePakistanProvinceCode(raw);
  return PAKISTAN_PROVINCES.find((entry) => entry.code === code)?.label ?? null;
}

export function getCitiesForProvince(rawProvince: string | null | undefined): readonly PakistanCity[] {
  const code = normalizePakistanProvinceCode(rawProvince);
  return code ? cityRecords[code] : [];
}

export function searchPakistanCities(
  rawProvince: string | null | undefined,
  query: string,
  limit = 50,
): readonly PakistanCity[] {
  const cities = getCitiesForProvince(rawProvince);
  const key = searchKey(query);
  if (!key) return cities.slice(0, Math.max(0, limit));
  const matches = cities.filter(
    (city) =>
      searchKey(city.name).includes(key) ||
      city.aliases.some((alias) => searchKey(alias).includes(key)),
  );
  const score = (city: PakistanCity): number => {
    const name = searchKey(city.name);
    const aliases = city.aliases.map(searchKey);
    if (name === key) return 5;
    if (aliases.includes(key)) return 4;
    if (name.startsWith(key)) return 3;
    if (aliases.some((alias) => alias.startsWith(key))) return 2;
    return 1;
  };
  return matches
    .sort((a, b) => score(b) - score(a))
    .slice(0, Math.max(0, limit));
}

function findCity(provinceCode: PakistanProvinceCode, rawCity: string): PakistanCity | undefined {
  const key = searchKey(rawCity);
  return cityRecords[provinceCode].find(
    (city) => searchKey(city.name) === key || city.aliases.some((alias) => searchKey(alias) === key),
  );
}

/** Resolve a city against the courier's current list; stale local suggestions never mark coverage. */
export function resolvePostExListedCity(
  rawCity: string,
  operationalCities: readonly string[],
  province?: string | null,
): string | null {
  const code = normalizePakistanProvinceCode(province);
  const canonical = code ? findCity(code, rawCity)?.name : undefined;
  const keys = new Set([searchKey(rawCity), canonical ? searchKey(canonical) : ""]);
  return operationalCities.find((city) => keys.has(searchKey(city)))?.trim() || null;
}

export type PakistanDeliveryLocationResult =
  | {
      ok: true;
      provinceCode: PakistanProvinceCode;
      provinceLabel: string;
      city: string;
      serviceability: PakistanCityServiceability;
      postExCityName?: string;
    }
  | { ok: false; field: "province" | "city"; error: string };

/** Unlisted towns are accepted for manual review, not represented as courier-confirmed. */
export function validatePakistanDeliveryLocation(
  province: string | null | undefined,
  city: string | null | undefined,
  operationalCities: readonly string[] = [],
): PakistanDeliveryLocationResult {
  const code = normalizePakistanProvinceCode(province);
  if (!code) {
    return { ok: false, field: "province", error: "Select a province or region." };
  }
  const name = city?.trim().replace(/\s+/g, " ") ?? "";
  if (name.length < 2 || name.length > 80 || !/[\p{L}]/u.test(name) || /[\p{C}<>]/u.test(name) || /^other city\b/i.test(name)) {
    return { ok: false, field: "city", error: "Enter a valid city or town name." };
  }
  const canonical = findCity(code, name)?.name ?? name;
  const postExCityName = resolvePostExListedCity(canonical, operationalCities, code);
  const provinceLabel = pakistanProvinceLabel(code)!;
  return {
    ok: true,
    provinceCode: code,
    provinceLabel,
    city: canonical,
    serviceability: postExCityName ? "postex_listed" : "manual_review",
    ...(postExCityName ? { postExCityName } : {}),
  };
}
