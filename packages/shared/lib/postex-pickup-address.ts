/** Server-only PostEx merchant pickup address lookup (read-only). */

export type PostExPickupAddressSafe = {
  contactPersonName: string | null;
  cityName: string | null;
  address: string | null;
  addressCode: string | null;
  phone1: string | null;
  phone2: string | null;
};

export type PostExPickupAddressResponse = {
  success: boolean;
  statusCode: string | null;
  statusMessage: string | null;
  pickupAddresses: PostExPickupAddressSafe[];
  upstreamHttpStatus?: number;
  error?: string;
  message?: string;
};

type PostExPickupAddressInternal = PostExPickupAddressResponse & {
  httpStatus?: number;
};

export function resolvePostExMerchantAddressUrl(
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  const base = (env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(/\/$/, "");
  return `${base}/services/integration/api/order/v1/get-merchant-address`;
}

function readPostExToken(): string {
  const token = process.env.POSTEX_API_TOKEN;
  return token ? token.trim() : "";
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function parsePostExBodyFields(body: unknown): {
  statusCode: string | null;
  statusMessage: string | null;
  message: string | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { statusCode: null, statusMessage: null, message: null, error: null };
  }
  const record = body as Record<string, unknown>;
  return {
    statusCode: asNullableString(record.statusCode),
    statusMessage: asNullableString(record.statusMessage),
    message: asNullableString(record.message),
    error: asNullableString(record.error),
  };
}

function mapPickupAddressRow(row: unknown): PostExPickupAddressSafe | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    contactPersonName: asNullableString(r.contactPersonName ?? r.contact_person_name),
    cityName: asNullableString(r.cityName ?? r.city_name),
    address: asNullableString(r.address),
    addressCode: asNullableString(
      r.addressCode ?? r.address_code ?? r.pickupAddressCode ?? r.pickup_address_code,
    ),
    phone1: asNullableString(r.phone1 ?? r.phone_1),
    phone2: asNullableString(r.phone2 ?? r.phone_2),
  };
}

/** Extract merchant pickup rows without returning the raw PostEx payload. */
export function mapPickupAddressesFromPostExBody(body: unknown): PostExPickupAddressSafe[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const buckets = [
    record.dist,
    record.data,
    record.pickupAddresses,
    record.merchantAddresses,
    record.addresses,
  ];
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    return bucket
      .map((row) => mapPickupAddressRow(row))
      .filter((row): row is PostExPickupAddressSafe => row != null);
  }
  return [];
}

function tokenMissingFailure(): PostExPickupAddressInternal {
  return {
    success: false,
    statusCode: null,
    statusMessage: null,
    pickupAddresses: [],
    upstreamHttpStatus: 503,
    error: "POSTEX_API_TOKEN is not configured on the server.",
    httpStatus: 503,
  };
}

function failureFromPostExResponse(
  res: Response,
  body: unknown,
): PostExPickupAddressInternal {
  const fields = parsePostExBodyFields(body);
  const fallback = `PostEx HTTP ${res.status}`;

  return {
    success: false,
    upstreamHttpStatus: res.status,
    statusCode: fields.statusCode,
    statusMessage: fields.statusMessage,
    pickupAddresses: mapPickupAddressesFromPostExBody(body),
    ...(fields.message ? { message: fields.message } : {}),
    error: fields.error || fields.statusMessage || fields.message || fallback,
    httpStatus: res.ok ? 502 : res.status,
  };
}

/**
 * Calls PostEx get-merchant-address. Never returns or logs the API token.
 */
export async function runPostExPickupAddressLookup(): Promise<PostExPickupAddressInternal> {
  const token = readPostExToken();
  if (!token) return tokenMissingFailure();

  const url = resolvePostExMerchantAddressUrl();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { token },
      cache: "no-store",
    });
  } catch {
    return {
      success: false,
      statusCode: null,
      statusMessage: null,
      pickupAddresses: [],
      upstreamHttpStatus: 502,
      error: "Could not reach PostEx API (network error).",
      httpStatus: 502,
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      success: false,
      upstreamHttpStatus: res.status,
      statusCode: null,
      statusMessage: null,
      pickupAddresses: [],
      error: "PostEx returned a non-JSON response.",
      httpStatus: res.ok ? 502 : res.status,
    };
  }

  const fields = parsePostExBodyFields(body);
  const postexOk = fields.statusCode === "200" || fields.statusCode === "201";

  if (!res.ok || !postexOk) {
    return failureFromPostExResponse(res, body);
  }

  return {
    success: true,
    statusCode: fields.statusCode,
    statusMessage: fields.statusMessage,
    pickupAddresses: mapPickupAddressesFromPostExBody(body),
  };
}
