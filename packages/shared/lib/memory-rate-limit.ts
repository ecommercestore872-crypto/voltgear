type RateLimiterInput = {
  ip?: string;
  sid?: string;
};

type RateLimiterConfig = {
  limit: number;
  windowMs: number;
  maxKeys: number;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createMemoryRateLimiter(config: RateLimiterConfig) {
  const buckets = new Map<string, number[]>();
  const keyOrder: string[] = [];

  function resolveKey(input: RateLimiterInput): string | null {
    const ip = asNonEmptyString(input.ip);
    if (ip) return `ip:${ip}`;
    const sid = asNonEmptyString(input.sid);
    if (sid) return `sid:${sid}`;
    return null;
  }

  function evictOldestIfNeeded() {
    while (buckets.size >= config.maxKeys && keyOrder.length > 0) {
      const oldestKey = keyOrder.shift();
      if (oldestKey) {
        buckets.delete(oldestKey);
      }
    }
  }

  function prune(timestamps: number[], now: number): number[] {
    const cutoff = now - config.windowMs;
    return timestamps.filter((timestamp) => timestamp > cutoff);
  }

  return {
    take(input: RateLimiterInput): boolean {
      const key = resolveKey(input);
      if (!key) {
        return true;
      }

      const now = Date.now();
      let timestamps = buckets.get(key);

      if (!timestamps) {
        evictOldestIfNeeded();
        timestamps = [];
        buckets.set(key, timestamps);
        keyOrder.push(key);
      }

      timestamps = prune(timestamps, now);

      if (timestamps.length >= config.limit) {
        buckets.set(key, timestamps);
        return false;
      }

      timestamps.push(now);
      buckets.set(key, timestamps);
      return true;
    },
  };
}
