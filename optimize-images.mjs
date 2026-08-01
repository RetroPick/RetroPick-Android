// Batch convert PNG market images ke WebP + resize icon yang oversized.
// Jalankan: node scripts/optimize-images.mjs
import sharp from "sharp";
import { readdirSync, statSync, unlinkSync } from "fs";
import path from "path";

const IMAGES_DIR = path.join(process.cwd(), "public/images");
const WEBP_QUALITY = 82; // sweet spot: visual nyaris identik, size jauh lebih kecil

// Icon-icon yang kegedean (928KB) — resize ke ukuran wajar buat app icon/logo.
const ICON_TARGETS = [
  { file: "public/icon.png", maxSize: 512 },
  { file: "public/apple-icon.png", maxSize: 512 },
  { file: "public/LOGO-BARU1.png", maxSize: 512 },
  { file: "public/logo-aplikasi.png", maxSize: 512 },
];

function walk(dir) {
  let results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.png$/i.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

async function convertMarketImages() {
  const pngFiles = walk(IMAGES_DIR);
  let totalBefore = 0;
  let totalAfter = 0;

  console.log(`Ketemu ${pngFiles.length} file PNG di public/images/\n`);

  for (const file of pngFiles) {
    const before = statSync(file).size;
    const outFile = file.replace(/\.png$/i, ".webp");

    await sharp(file).webp({ quality: WEBP_QUALITY }).toFile(outFile);

    const after = statSync(outFile).size;
    totalBefore += before;
    totalAfter += after;

    console.log(
      `${path.relative(process.cwd(), file)}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`
    );

    // Hapus PNG lama SETELAH konfirmasi WebP-nya kebentuk.
    // Referensi di kode (retropick-data.ts / classifier) perlu diupdate manual
    // ke ekstensi .webp -- lihat catatan di akhir script.
    unlinkSync(file);
  }

  console.log(
    `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(2)}MB -> ${(totalAfter / 1024 / 1024).toFixed(2)}MB (hemat ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%)`
  );
}

async function resizeIcons() {
  console.log("\n--- Resize icon/logo oversized ---");
  for (const { file, maxSize } of ICON_TARGETS) {
    try {
      const before = statSync(file).size;
      const buffer = await sharp(file)
        .resize(maxSize, maxSize, { fit: "inside" })
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();
      await sharp(buffer).toFile(file + ".tmp");
      unlinkSync(file);
      const { renameSync } = await import("fs");
      renameSync(file + ".tmp", file);
      const after = statSync(file).size;
      console.log(`${file}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
    } catch (err) {
      console.warn(`Skip ${file}: ${err.message}`);
    }
  }
}

await convertMarketImages();
await resizeIcons();

console.log(
  "\n⚠️  PENTING: file .png di public/images/ udah dihapus & diganti .webp." +
    "\nCek referensi path gambar di lib/retropick-data.ts / lib/polymarket-service.ts" +
    "\n(kalau ada hardcoded path '.png' buat entity image, ganti ke '.webp')."
);
