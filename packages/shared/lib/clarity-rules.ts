export function shouldLoadClarity(input: {
  id?: string | null;
  isAdmin: boolean;
  host: string;
}): boolean {
  const id = (input.id ?? "").trim();
  if (!id || input.isAdmin) return false;
  const host = input.host.split(":")[0]?.toLowerCase() ?? "";
  if (!host || host === "localhost" || host === "127.0.0.1") return false;
  return true;
}
