/**
 * Import Blogger (Blogspot) posts from an Atom feed XML into Astro content markdown.
 *
 * Usage: node scripts/import-blogger.mjs <feed.xml> [<feed2.xml> ...]
 *
 * - Writes markdown files to src/content/blog/<yyyy-mm-dd>-<slug>.md
 * - Downloads post images (blogger/googleusercontent) to public/blog-images/<slug>/
 *   and rewrites the references. Failed downloads keep the original remote URL.
 * - Keeps iframes (SlideShare/YouTube embeds) as raw HTML.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import TurndownService from 'turndown';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'src', 'content', 'blog');
const IMG_DIR = join(root, 'public', 'blog-images');

const feedFiles = process.argv.slice(2);
if (feedFiles.length === 0) {
  console.error('Usage: node scripts/import-blogger.mjs <feed.xml> [...]');
  process.exit(1);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Blogger feeds contain huge amounts of escaped HTML; fast-xml-parser's
  // entity-expansion guard trips on them, so decode entities ourselves.
  processEntities: false,
});

function decodeEntities(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.keep(['iframe', 'embed', 'object', 'table']);

/** Collect entries from all feed files, dedup by entry id. */
const entries = new Map();
for (const file of feedFiles) {
  const xml = readFileSync(file, 'utf8');
  const doc = parser.parse(xml);
  const feed = doc.feed;
  if (!feed) continue;
  const list = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
  for (const e of list) entries.set(e.id, e);
}
console.log(`Found ${entries.size} posts`);

const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

function slugFromUrl(url, title, date) {
  try {
    const path = new URL(url).pathname; // /2015/12/2015.html
    const name = path.split('/').pop().replace(/\.html$/, '');
    if (name && name !== 'blog-post') return name;
  } catch {}
  // fallback: transliterate-ish from title or date
  const t = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return t || `post-${date}`;
}

function firstText(html, len = 160) {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > len ? text.slice(0, len).trim() + '…' : text;
}

const IMG_HOST = /(blogspot\.com|googleusercontent\.com|blogblog\.com|bp\.blogspot)/i;

async function downloadImage(url, destDir, index) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (blog migration; contact: hakhyun.2023@gmail.com)' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) throw new Error('too small');
    const ct = res.headers.get('content-type') || '';
    let ext = '.jpg';
    if (ct.includes('png')) ext = '.png';
    else if (ct.includes('gif')) ext = '.gif';
    else if (ct.includes('webp')) ext = '.webp';
    else if (ct.includes('jpeg')) ext = '.jpg';
    else {
      const m = url.match(/\.(jpe?g|png|gif|webp)(\?|$)/i);
      if (m) ext = '.' + m[1].toLowerCase().replace('jpeg', 'jpg');
    }
    mkdirSync(destDir, { recursive: true });
    const name = `img-${String(index).padStart(2, '0')}${ext}`;
    writeFileSync(join(destDir, name), buf);
    return name;
  } catch (err) {
    console.warn(`  ! image failed (${err.message}): ${url.slice(0, 100)}`);
    return null;
  }
}

mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
for (const e of entries.values()) {
  const title = decodeEntities(typeof e.title === 'object' ? e.title['#text'] : e.title);
  const published = e.published; // ISO
  const date = published.slice(0, 10);
  const links = asArray(e.link);
  const alt = links.find((l) => l['@_rel'] === 'alternate');
  const originalUrl = alt ? alt['@_href'] : '';
  const labels = asArray(e.category)
    .filter((c) => (c['@_scheme'] || '').includes('ns#'))
    .map((c) => c['@_term'])
    .filter(Boolean);
  let html = decodeEntities(typeof e.content === 'object' ? e.content['#text'] : e.content || '');

  const slug = slugFromUrl(originalUrl, title, date);
  const fileSlug = `${date}-${slug}`;

  // Download images and rewrite references (also unwrap blogger lightbox links).
  const imgDest = join(IMG_DIR, fileSlug);
  const imgUrls = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
  let i = 0;
  for (const url of imgUrls) {
    if (!IMG_HOST.test(url)) continue;
    i += 1;
    // request the original-size variant (replace /sNNN/ size segment with /s1600/)
    const bigUrl = url.replace(/\/s\d+(-[a-z]+)?\//, '/s1600/');
    const name = (await downloadImage(bigUrl, imgDest, i)) || (await downloadImage(url, imgDest, i));
    if (name) {
      const local = `/blog-images/${fileSlug}/${name}`;
      html = html.replaceAll(url, local);
    }
  }
  // Unwrap <a href="...googleusercontent..."><img src="/blog-images/..."></a> lightbox wrappers
  html = html.replace(
    /<a[^>]+href="https?:\/\/[^"]*(?:googleusercontent|blogspot)[^"]*"[^>]*>(\s*<img[^>]+>\s*)<\/a>/gi,
    '$1'
  );

  // avoid mixed-content blocking on the HTTPS site (old SlideShare/YouTube embeds)
  html = html.replaceAll('src="http://', 'src="https://');

  let md = turndown.turndown(html);

  const fm = [
    '---',
    `title: ${JSON.stringify(String(title ?? '(untitled)'))}`,
    `pubDate: ${published}`,
    `description: ${JSON.stringify(firstText(html))}`,
    labels.length ? `tags: ${JSON.stringify(labels)}` : null,
    `originalUrl: ${JSON.stringify(originalUrl)}`,
    '---',
    '',
  ]
    .filter((x) => x !== null)
    .join('\n');

  const outFile = join(OUT_DIR, `${fileSlug}.md`);
  if (existsSync(outFile)) console.warn(`  ! overwriting ${outFile}`);
  writeFileSync(outFile, fm + md + '\n');
  written += 1;
  console.log(`✓ ${date} ${title}`);
}
console.log(`\nWrote ${written} markdown files to src/content/blog/`);
