import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import satori from 'satori';
import { html } from 'satori-html';
import sharp, { type Sharp } from 'sharp';
import { cached, hashOf } from './disk-cache';
import { formatDay, type Lang } from './i18n';

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = 64;

// Terminal palette (the dark values of tokens.css, checked by og-palette.test.ts)
export const PALETTE = { bg: '#0f0f0f', ink: '#f1f1f1', muted: '#9a9a9a', faint: '#757575', line: '#2d2d2d', accent: '#a1ecf7' } as const;
const { bg: BG, ink: INK, muted: MUTED, faint: FAINT, line: LINE, accent: ACCENT } = PALETTE;

type PostCard = { kind: 'post'; title: string; meta: string; tags: string[] };
type DefaultCard = { kind: 'default'; title: string };
export type OgInput = PostCard | DefaultCard;

const DEFAULT_TITLE: Record<Lang, string> = {
  pt: 'Front-end, AI e carreira em tech',
  en: 'Front-end, AI and career in tech',
};

const PHOTO = resolve('src/assets/images/fernandoadms.jpg');
const PHOTO_SIDE = { width: 419, height: HEIGHT }; // 420px column minus its 1px left border

const nodeRequire = createRequire(import.meta.url);
const fontFile = (pkg: string, file: string) => readFile(nodeRequire.resolve(`@fontsource/${pkg}/files/${file}`));

// Loaded once per build; satori needs static (non-variable) woff files
const fonts = Promise.all([
  fontFile('geist', 'geist-latin-600-normal.woff'),
  fontFile('geist-mono', 'geist-mono-latin-400-normal.woff'),
]).then(([sans, mono]) => [
  { name: 'Geist', data: sans, weight: 600 as const, style: 'normal' as const },
  { name: 'Geist Mono', data: mono, weight: 400 as const, style: 'normal' as const },
]);

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Satori cannot draw emoji without an emoji font
const stripEmoji = (text: string): string =>
  text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/‍|️|⃣/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const TITLE_SIZES = [72, 64, 56, 48];
const CHAR_WIDTH = 0.5; // average glyph width in em for Geist 600 with -0.052em tracking
const TITLE_WIDTH = WIDTH - PADDING * 2;

/** Estimated wrapped line count of a title at a font size, breaking on spaces like the renderer. */
export function countLines(title: string, size: number): number {
  const perLine = Math.floor(TITLE_WIDTH / (size * CHAR_WIDTH));
  let lines = 1;
  let used = 0;
  for (const word of title.split(' ')) {
    const needed = used === 0 ? word.length : used + 1 + word.length;
    if (needed > perLine && used > 0) {
      lines += 1;
      used = word.length;
    } else {
      used = needed;
    }
  }
  return lines;
}

// The two largest sizes stay at 3 lines so the block never crowds the header and the author row
const maxLinesFor = (size: number): number => (size >= 64 ? 3 : 4);

/** Largest size whose estimated wrap fits; the smallest size otherwise. */
export const fitTitleSize = (title: string): number =>
  TITLE_SIZES.find((size) => countLines(title, size) <= maxLinesFor(size)) ?? TITLE_SIZES[TITLE_SIZES.length - 1];

const toDataUri = (buffer: Buffer, type: string): string => `data:${type};base64,${buffer.toString('base64')}`;

// Outline of `fa` in Geist Mono 700 (240px, letter-spacing -0.1em): the mark needs no font
const FA_PATH =
  'M80.2 241L47.8 241L47.8 138.3L15.4 138.3L15.4 112.4L47.8 112.4L47.8 108.8Q47.8 89.3 57 80Q66.2 70.6 86.2 70.6L86.2 70.6L128.6 70.6L128.6 96.5L93.6 96.5Q86.6 96.5 83.4 99.8Q80.2 103 80.2 109L80.2 109L80.2 112.4L127.7 112.4L127.7 138.3L80.2 138.3L80.2 241ZM173.8 243.9L173.8 243.9Q162 243.9 152.2 239.6Q142.3 235.2 136.7 227.1Q131 218.9 131 207.6L131 207.6Q131 191.3 141.5 182.2Q151.9 173.1 170.2 169.2L170.2 169.2L208.8 160.8Q208.8 148.6 203.9 142.1Q199 135.6 187.9 135.6L187.9 135.6Q178.3 135.6 173 140.4Q167.8 145.2 166.1 153.2L166.1 153.2L132.5 151.2Q136.1 132.3 150.6 120.9Q165.1 109.5 187.4 109.5L187.4 109.5Q215.3 109.5 228.4 123.5Q241.4 137.6 241.4 162.8L241.4 162.8L241.4 208.1Q241.4 212.9 243.1 214.7Q244.8 216.5 248.2 216.5L248.2 216.5L253.4 216.5L253.4 241Q252 241.2 248.6 241.6Q245.3 242 241.7 242L241.7 242Q232.1 242 225.4 238.6Q218.6 235.2 215.3 228.8L215.3 228.8Q213.4 225.6 212.4 221.8L212.4 221.8Q211 225.4 208.3 228.8L208.3 228.8Q203 236 194.2 239.9Q185.3 243.9 173.8 243.9ZM180.5 219.4L180.5 219.4Q189.6 219.4 195.8 216.2Q202.1 212.9 205.4 206.6Q208.8 200.2 208.8 191.6L208.8 191.6L208.8 183.9L180.2 190.1Q171.6 192 168 195.6Q164.4 199.2 164.4 206L164.4 206Q164.4 212.2 168.5 215.8Q172.6 219.4 180.5 219.4Z ';

// The 44px `ff_` tile of the card header, drawn at the board's 20px glyph scale
const MARK = toDataUri(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect x=".5" y=".5" width="43" height="43" rx="9.5" fill="none" stroke="${LINE}"/><path transform="translate(6.6 9) scale(.0833)" fill="${INK}" d="${FA_PATH}"/><rect x="27.5" y="26.7" width="8" height="2.5" rx=".5" fill="${ACCENT}"/></svg>`,
  ),
  'image/svg+xml',
);

const grayscale = (input: Sharp, contrast: number): Sharp =>
  input.grayscale().linear(contrast, 255 * (0.5 - 0.5 * contrast));

// Satori has no blend modes or filters: tint the photo here (grayscale, cyan multiply, left fade, scanlines)
async function photoSide(): Promise<string> {
  const { width, height } = PHOTO_SIDE;
  const cover = Math.round(HEIGHT); // the 800px square scaled to the column height, cropped at object-position 40%
  const left = Math.round((cover - width) * 0.4);
  const base = await grayscale(sharp(PHOTO).resize(cover, cover).extract({ left, top: 0, width, height }), 1.15)
    .png()
    .toBuffer();
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="f" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${BG}"/><stop offset=".3" stop-color="${BG}" stop-opacity="0"/></linearGradient><pattern id="s" width="3" height="3" patternUnits="userSpaceOnUse"><rect y="2" width="3" height="1" fill="${BG}" fill-opacity=".22"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#f)"/><rect width="${width}" height="${height}" fill="url(#s)"/></svg>`;
  const tinted = await sharp(base)
    .composite([
      { input: { create: { width, height, channels: 3, background: ACCENT } }, blend: 'multiply' },
      { input: Buffer.from(overlay) },
    ])
    .png()
    .toBuffer();
  return toDataUri(tinted, 'image/png');
}

async function avatar(): Promise<string> {
  const buffer = await grayscale(sharp(PHOTO).resize(136, 136), 1.1).png().toBuffer();
  return toDataUri(buffer, 'image/png');
}

// Both images are constant across cards; compute once per build
const photoPromise = photoSide();
const avatarPromise = avatar();

const header = (path: string, aside: string): string => `
  <div style="display:flex;justify-content:space-between;align-items:center;font-family:'Geist Mono';font-size:22px;color:${MUTED}">
    <div style="display:flex;align-items:center;gap:12px"><img src="${MARK}" style="width:44px;height:44px" /><div style="display:flex;color:${INK}"><span style="color:${ACCENT}">~/</span>fernandoadms${path ? `<span style="color:${FAINT}">${path}</span>` : ''}</div></div>
    ${aside}
  </div>`;

const title = (text: string, size: number): string =>
  `<div style="display:block;font-size:${size}px;line-height:${size <= 56 ? 1.08 : 1.02};font-weight:600;letter-spacing:-0.052em">${escapeHtml(text)}</div>`;

// Satori cannot mix text and inline spans in one block, so the headline is a wrapping row of words with the accent cursor on the last one
const cursorTitle = (text: string, size: number): string => {
  const words = text.split(' ').map((word) => escapeHtml(word));
  const last = words.pop();
  const items = [...words.map((word) => `<div style="display:flex">${word}</div>`), `<div style="display:flex">${last}<span style="color:${ACCENT}">_</span></div>`];
  return `<div style="display:flex;flex-wrap:wrap;column-gap:${size * 0.21}px;font-size:${size}px;line-height:1;font-weight:600;letter-spacing:-0.052em">${items.join('')}</div>`;
};

async function defaultMarkup(text: string): Promise<string> {
  return `
    <div style="display:flex;width:${WIDTH}px;height:${HEIGHT}px;background:${BG};color:${INK};font-family:'Geist'">
      <div style="display:flex;flex-direction:column;flex:1;padding:${PADDING}px;gap:28px">
        <div style="display:flex;align-items:center;gap:12px;font-family:'Geist Mono';font-size:24px"><img src="${MARK}" style="width:44px;height:44px" /><div style="display:flex"><span style="color:${ACCENT}">~/</span>fernandoadms</div></div>
        ${cursorTitle(text, 76)}
        <div style="display:flex;justify-content:space-between;margin-top:auto;font-family:'Geist Mono';font-size:22px;color:${MUTED}"><div style="display:flex">Fernando Alves · Software Engineer</div><div style="display:flex;color:${ACCENT}">fernandoadms.dev</div></div>
      </div>
      <div style="display:flex;width:420px;height:${HEIGHT}px;border-left:1px solid ${LINE}"><img src="${await photoPromise}" style="width:${PHOTO_SIDE.width}px;height:${PHOTO_SIDE.height}px" /></div>
    </div>`;
}

async function postMarkup({ title: text, meta, tags }: PostCard): Promise<string> {
  const size = fitTitleSize(text);
  const tagLine = tags.map((tag) => `#${escapeHtml(tag)}`).join(' ');
  return `
    <div style="display:flex;flex-direction:column;width:${WIDTH}px;height:${HEIGHT}px;padding:${PADDING}px;gap:28px;background:${BG};color:${INK};font-family:'Geist'">
      <div style="display:flex;position:absolute;left:0;top:0;width:${WIDTH}px;height:6px;background:${ACCENT}"></div>
      ${header('/blog', `<div style="display:flex">${escapeHtml(meta)}</div>`)}
      <div style="display:flex;margin-top:24px">${title(text, size)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">
        <div style="display:flex;align-items:center;gap:16px">
          <img src="${await avatarPromise}" style="width:68px;height:68px;border-radius:50%;border:2px solid ${LINE}" />
          <div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;font-size:24px;font-weight:600">Fernando Alves</div><div style="display:flex;font-family:'Geist Mono';font-size:18px;color:${MUTED}">fernandoadms.dev</div></div>
        </div>
        <div style="display:flex;font-family:'Geist Mono';font-size:20px;color:${ACCENT}">${tagLine}</div>
      </div>
    </div>`;
}

const CACHE_DIR = resolve('node_modules/.cache/og');

// Any change to the template, the pinned dependencies or the photo invalidates every card
const sourceHash = Promise.all([
  readFile(resolve('src/lib/og.ts')),
  readFile(resolve('pnpm-lock.yaml')).catch(() => Buffer.alloc(0)),
  readFile(PHOTO),
]).then((sources) => hashOf(...sources));

/** Renders a card, reusing the JPEG of an identical earlier build (rendering is about 160ms per card). */
export async function renderOgImage(input: OgInput): Promise<Buffer> {
  return cached(CACHE_DIR, hashOf(await sourceHash, JSON.stringify(input)), () => renderOgImageUncached(input));
}

async function renderOgImageUncached(input: OgInput): Promise<Buffer> {
  const markup = html(
    input.kind === 'post'
      ? await postMarkup({ ...input, title: stripEmoji(input.title), meta: stripEmoji(input.meta) })
      : await defaultMarkup(stripEmoji(input.title)),
  );

  // satori-html returns a hast-like VNode that satori accepts at runtime but types as its own element shape
  const svg = await satori(markup as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: await fonts,
  });

  return sharp(Buffer.from(svg)).flatten({ background: BG }).jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
}

/** Static paths for every post card of a language plus the site card. */
export type OgPath = { params: { slug: string }; props: { input: OgInput } };

export async function getOgPaths(lang: Lang): Promise<OgPath[]> {
  // Loaded lazily: `astro:content` only exists inside Astro, which keeps the pure helpers above unit-testable
  const [{ render }, { getPosts }] = await Promise.all([import('astro:content'), import('./posts')]);
  const posts = await getPosts(lang);
  const cards = await Promise.all(
    posts.map(async (post) => {
      // Same source as the post page, so the card and the page always agree on the minutes
      const { remarkPluginFrontmatter } = await render(post);
      const minutes = Number(remarkPluginFrontmatter.minutesRead ?? 1);
      return {
        params: { slug: post.id },
        props: {
          input: {
            kind: 'post' as const,
            title: post.data.title,
            meta: `${formatDay(post.data.date, lang)} · ${minutes} min`,
            tags: post.data.tags.slice(0, 3),
          } satisfies OgInput,
        },
      };
    }),
  );
  return [...cards, { params: { slug: 'default' }, props: { input: { kind: 'default' as const, title: DEFAULT_TITLE[lang] } satisfies OgInput } }];
}

export const ogResponse = async (input: OgInput): Promise<Response> =>
  new Response(new Uint8Array(await renderOgImage(input)), { headers: { 'Content-Type': 'image/jpeg' } });
