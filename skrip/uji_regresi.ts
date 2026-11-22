/**
 * Menjalankan seluruh fixture regresi Bahasa NUSANTARA (.uji.nusantara).
 * Suite ini melengkapi pengujian TypeScript dan memastikan program contoh
 * yang ditulis dalam bahasa NUSANTARA benar-benar diparse, diperiksa, dan dijalankan.
 */
import { PelariUji } from '../src/testing';

const runner = new PelariUji({
  timeoutMs: 5000,
  hentikanSaatGagal: false,
});

const hasil = runner.jalankanSinkron('tests/regression');

console.log('\n=== PENGUJIAN REGRESI BAHASA NUSANTARA ===');
console.log(
  `Berkas: ${hasil.berkasTotal} | Lulus: ${hasil.berkasLulus} | Gagal: ${hasil.berkasGagal}`
);
console.log(
  `Kasus: ${hasil.totalUji ?? hasil.total} | Lulus: ${hasil.lulus} | Gagal: ${hasil.gagal} | Galat: ${hasil.galat}`
);

for (const berkas of hasil.daftarBerkas) {
  console.log(`[${berkas.sukses ? 'LULUS' : 'GAGAL'}] ${berkas.jalurBerkas}`);
  if (!berkas.sukses) {
    for (const item of berkas.daftarHasil) {
      if (['gagal', 'galat', 'GAGAL', 'GALAT'].includes(String(item.status))) {
        console.error(`  - ${item.pesan || berkas.galatFatal || 'Kegagalan tanpa rincian'}`);
      }
    }
  }
}

if (hasil.berkasTotal === 0 || hasil.berkasGagal > 0 || hasil.gagal > 0 || hasil.galat > 0) {
  console.error('[GAGAL] Pengujian regresi Bahasa NUSANTARA tidak lulus.');
  process.exitCode = 1;
} else {
  console.log('[LULUS] Seluruh fixture regresi Bahasa NUSANTARA berhasil dijalankan.');
}
