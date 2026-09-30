// Node has no requestAnimationFrame. Expo Router's SDK 58 web SSR
// flushUIQueue uses it and crashes `expo start` (ReferenceError).
if (globalThis.requestAnimationFrame == null) {
  globalThis.requestAnimationFrame = (cb) =>
    setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
