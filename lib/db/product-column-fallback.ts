const COLUMN_IN_MESSAGE = /(?:Could not find the '|column )['"]?([a-zA-Z0-9_]+)['"]?(?:' column| of )/;

export function missingSchemaColumn(
  error: { code?: string; message?: string } | null | undefined
): string | null {
  const message = error?.message ?? "";
  const match = message.match(COLUMN_IN_MESSAGE);
  if (!match) return null;
  if (error?.code === "PGRST204" || error?.code === "42703" || /schema cache/i.test(message)) {
    return match[1];
  }
  return match[1];
}

export function omitColumn<T extends Record<string, unknown>>(row: T, column: string): T {
  const next = { ...row };
  delete next[column];
  return next;
}
