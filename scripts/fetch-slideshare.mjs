/**
 * Download SlideShare deck images and assemble them into self-hosted PDFs.
 *
 * Usage: node scripts/fetch-slideshare.mjs
 * Output: public/slides/<name>.pdf
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'public', 'slides');
mkdirSync(OUT_DIR, { recursive: true });

const DECKS = [
  { out: 'working-abroad-v2', base: 'ver2-211103125431', name: 'Ver-2', count: 52 },
  { out: 'gatech-mooc-story', base: 'mooc-140119161159-phpapp01', name: 'Mooc', count: 21 },
  { out: 'working-abroad', base: 'random-111218011326-phpapp01', name: 'slide', count: 37 },
  { out: 'online-course', base: 'onlinecourse-130325220258-phpapp01', name: 'Online-course', count: 29 },
  { out: 'web-dev-adventure', base: 'k-130802162221-phpapp01', name: 'K', count: 13 },
];

const SIZES = [2048, 638, 320];

async function fetchImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 500 ? buf : null;
}

for (const deck of DECKS) {
  console.log(`\n== ${deck.out} (${deck.count} slides) ==`);
  const pdf = await PDFDocument.create();
  let usedSize = null;
  for (let i = 1; i <= deck.count; i++) {
    let buf = null;
    // stick with the first size that works to keep the deck consistent
    const sizes = usedSize ? [usedSize, ...SIZES.filter((s) => s !== usedSize)] : SIZES;
    for (const size of sizes) {
      const url = `https://image.slidesharecdn.com/${deck.base}/85/${deck.name}-${i}-${size}.jpg`;
      buf = await fetchImage(url);
      if (buf) {
        if (!usedSize) usedSize = size;
        if (size !== usedSize) console.log(`  slide ${i}: fell back to ${size}px`);
        break;
      }
    }
    if (!buf) {
      console.error(`  !! slide ${i}: all sizes failed — aborting deck`);
      process.exitCode = 1;
      break;
    }
    const img = await pdf.embedJpg(buf);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    if (i % 10 === 0) console.log(`  ${i}/${deck.count}`);
  }
  if (pdf.getPageCount() === deck.count) {
    const bytes = await pdf.save();
    const file = join(OUT_DIR, `${deck.out}.pdf`);
    writeFileSync(file, bytes);
    console.log(`  ✓ ${file} (${(bytes.length / 1024 / 1024).toFixed(1)} MB, ${usedSize}px)`);
  }
}
