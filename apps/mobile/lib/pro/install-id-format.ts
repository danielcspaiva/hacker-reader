/** UUID v4, the only install id format the app generates and the API accepts. */
const INSTALL_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isInstallId(value: string | null): value is string {
  return value !== null && INSTALL_ID_PATTERN.test(value);
}
