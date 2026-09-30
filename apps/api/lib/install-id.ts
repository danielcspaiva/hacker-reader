/** UUID v4, the only install id format the app generates. */
const INSTALL_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Lower-cased id when `value` is a strict UUID v4, otherwise null. */
export function parseInstallId(value: string | undefined): string | null {
  if (value === undefined) return null;
  const id = value.toLowerCase();
  return INSTALL_ID_PATTERN.test(id) ? id : null;
}

/** The install id from `Authorization: Bearer <installId>`, or null. */
export function parseBearerInstallId(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer (\S+)$/i.exec(header.trim());
  return parseInstallId(match?.[1]);
}
