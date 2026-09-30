// Generates the alternate app icons (1024x1024, opaque) and their Android
// foreground layers from the default icon artwork (assets/images/ybook.png).
// Run: pnpm --filter mobile generate-alt-icons   (output is committed)
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "assets/images/ybook.png");
const OUT = join(root, "assets/images/alt-icons");
const SIZE = 1024;
const MARK = 640; // longest side of the mark inside the icon
const ANDROID = 432; // adaptive icon layer; the mark stays in the 66% safe zone

// Palette tokens from docs/design-language.md (constants/colors.ts), as RGB.
const INK = [0x1f, 0x1b, 0x16];
const CREAM = [0xf3, 0xed, 0xe3];
const PAPER = [0xf4, 0xf0, 0xec];
const CHARCOAL = [0x17, 0x13, 0x0f];
const HN_ORANGE = [0xff, 0x66, 0x00];

const hex = (rgb) =>
  `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));

async function loadBook() {
  const { data, info } = await sharp(SOURCE)
    .trim({ threshold: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Rebuilds an RGBA buffer pixel by pixel; `fn(r, g, b, a)` returns [r, g, b, a]. */
function recolor(book, fn) {
  const out = Buffer.alloc(book.data.length);
  for (let i = 0; i < book.data.length; i += 4) {
    const [r, g, b, a] = fn(
      book.data[i],
      book.data[i + 1],
      book.data[i + 2],
      book.data[i + 3]
    );
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = a;
  }
  return { ...book, data: out };
}

const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
// 0 for the orange covers, 1 for the cream Y and pages (anti-aliased between).
const creamness = (r, g, b) =>
  Math.min(1, Math.max(0, (luma(r, g, b) - 0.6) / 0.2));

async function toMark(book, size) {
  return sharp(book.data, {
    raw: { width: book.width, height: book.height, channels: 4 },
  })
    .resize(size, size, { fit: "inside" })
    .png()
    .toBuffer();
}

/** Centers `mark` on a transparent `canvas`-sized layer, optionally with a soft shadow. */
async function layer(mark, canvas, shadow) {
  const { width, height } = await sharp(mark).metadata();
  const left = Math.round((canvas - width) / 2);
  const top = Math.round((canvas - height) / 2);
  const parts = [];
  if (shadow) {
    const blurred = await sharp(mark)
      .tint({ r: 0, g: 0, b: 0 })
      .linear([1, 1, 1, shadow], [0, 0, 0, 0])
      .blur(canvas / 60)
      .toBuffer();
    parts.push({ input: blurred, left, top: top + Math.round(canvas / 100) });
  }
  parts.push({ input: mark, left, top });
  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(parts)
    .png()
    .toBuffer();
}

function gradient(from, to) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(from)}"/><stop offset="1" stop-color="${hex(to)}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  );
}

async function write(name, background, markLayer, androidLayer) {
  // iOS app icons must be opaque: flatten and drop the alpha channel.
  await sharp(background)
    .composite([{ input: markLayer }])
    .flatten({ background: hex(PAPER) })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, `${name}.png`));
  await sharp(androidLayer)
    .resize(ANDROID, ANDROID)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, `${name}-foreground.png`));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const book = await loadBook();
  const fg = async (mark, shadow) => layer(mark, SIZE, shadow);

  // Midnight: the book on warm charcoal (the app's dark surfaces).
  const original = await toMark(book, MARK);
  await write(
    "midnight",
    await sharp(gradient(mix(CHARCOAL, CREAM, 0.1), CHARCOAL))
      .png()
      .toBuffer(),
    await fg(original, 0.5),
    await fg(original)
  );

  // Paper: the book on the warm page grey (light surfaces).
  await write(
    "paper",
    await sharp(gradient(mix(PAPER, [255, 255, 255], 0.5), PAPER))
      .png()
      .toBuffer(),
    await fg(original, 0.22),
    await fg(original)
  );

  // Mono: a one-ink book on cream, the Y and the pages knocked out.
  const mono = await toMark(
    recolor(book, (r, g, b, a) => {
      const c = creamness(r, g, b);
      return [...mix(INK, CREAM, c), a];
    }),
    MARK
  );
  await write(
    "mono",
    await sharp(gradient(mix(CREAM, [255, 255, 255], 0.3), CREAM))
      .png()
      .toBuffer(),
    await fg(mono, 0.12),
    await fg(mono)
  );

  // Classic: HN's #FF6600 square with a white Y cut from the book's cover.
  const yRegion = {
    left: Math.round(book.width * 0.3),
    top: Math.round(book.height * 0.38),
    width: Math.round(book.width * 0.45),
    height: Math.round(book.height * 0.45),
  };
  const yOnly = recolor(book, (r, g, b, a) => [
    255,
    255,
    255,
    Math.round(a * creamness(r, g, b)),
  ]);
  const yCrop = await sharp(yOnly.data, {
    raw: { width: book.width, height: book.height, channels: 4 },
  })
    .extract(yRegion)
    .png()
    .toBuffer();
  const yPng = await sharp(yCrop)
    .trim({ threshold: 1 })
    .resize(Math.round(SIZE * 0.44), Math.round(SIZE * 0.44), { fit: "inside" })
    .png()
    .toBuffer();
  await write(
    "classic",
    await sharp({
      create: {
        width: SIZE,
        height: SIZE,
        channels: 4,
        background: hex(HN_ORANGE),
      },
    })
      .png()
      .toBuffer(),
    await fg(yPng),
    await fg(yPng)
  );
}

await main();
