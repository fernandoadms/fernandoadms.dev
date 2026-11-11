// Regenerates the raster brand icons from the vector mark. Usage: node scripts/build-icons.mjs
// public/favicon.svg is the source of truth for the mark: the `fa` glyphs are outlines of Geist Mono 700 (240px, letter-spacing -0.1em), so no font is needed at render time.
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const BG = '#0f0f0f';
const ACCENT = '#a1ecf7';
const SIZE = 512;

const GLYPHS =
  'M80.2 241L47.8 241L47.8 138.3L15.4 138.3L15.4 112.4L47.8 112.4L47.8 108.8Q47.8 89.3 57 80Q66.2 70.6 86.2 70.6L86.2 70.6L128.6 70.6L128.6 96.5L93.6 96.5Q86.6 96.5 83.4 99.8Q80.2 103 80.2 109L80.2 109L80.2 112.4L127.7 112.4L127.7 138.3L80.2 138.3L80.2 241ZM173.8 243.9L173.8 243.9Q162 243.9 152.2 239.6Q142.3 235.2 136.7 227.1Q131 218.9 131 207.6L131 207.6Q131 191.3 141.5 182.2Q151.9 173.1 170.2 169.2L170.2 169.2L208.8 160.8Q208.8 148.6 203.9 142.1Q199 135.6 187.9 135.6L187.9 135.6Q178.3 135.6 173 140.4Q167.8 145.2 166.1 153.2L166.1 153.2L132.5 151.2Q136.1 132.3 150.6 120.9Q165.1 109.5 187.4 109.5L187.4 109.5Q215.3 109.5 228.4 123.5Q241.4 137.6 241.4 162.8L241.4 162.8L241.4 208.1Q241.4 212.9 243.1 214.7Q244.8 216.5 248.2 216.5L248.2 216.5L253.4 216.5L253.4 241Q252 241.2 248.6 241.6Q245.3 242 241.7 242L241.7 242Q232.1 242 225.4 238.6Q218.6 235.2 215.3 228.8L215.3 228.8Q213.4 225.6 212.4 221.8L212.4 221.8Q211 225.4 208.3 228.8L208.3 228.8Q203 236 194.2 239.9Q185.3 243.9 173.8 243.9ZM180.5 219.4L180.5 219.4Q189.6 219.4 195.8 216.2Q202.1 212.9 205.4 206.6Q208.8 200.2 208.8 191.6L208.8 191.6L208.8 183.9L180.2 190.1Q171.6 192 168 195.6Q164.4 199.2 164.4 206L164.4 206Q164.4 212.2 168.5 215.8Q172.6 219.4 180.5 219.4Z ';

// `radius` 0 gives a full-bleed square (apple-touch-icon); scanlines only on the large icon
const mark = ({ radius, scanlines }) => {
  const lines = scanlines
    ? `<defs><pattern id="s" width="8" height="8" patternUnits="userSpaceOnUse"><rect y="6" width="8" height="2" fill="${ACCENT}" fill-opacity=".05"/></pattern></defs><rect width="${SIZE}" height="${SIZE}" fill="url(#s)"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><clipPath id="c"><rect width="${SIZE}" height="${SIZE}" rx="${radius}"/></clipPath><g clip-path="url(#c)"><rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>${lines}<path transform="translate(80 88)" fill="#f1f1f1" d="${GLYPHS}"/><rect x="331" y="300" width="96" height="30" rx="6" fill="${ACCENT}"/></g></svg>`;
};

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: (72 * size) / SIZE })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

// PNG-in-ICO container (supported by every browser that still asks for /favicon.ico)
const ico = (images) => {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
};

const rounded = mark({ radius: 112, scanlines: false });
await writeFile('public/favicon.svg', `${rounded}\n`);
await writeFile('public/icon-512.png', await png(mark({ radius: 112, scanlines: true }), 512));
await writeFile('public/apple-touch-icon.png', await png(mark({ radius: 0, scanlines: false }), 180));
await writeFile(
  'public/favicon.ico',
  ico(await Promise.all([32, 16].map(async (size) => ({ size, data: await png(rounded, size) })))),
);
