/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Menjalankan seluruh regresi bahasa NUSANTARA yang disimpan di tests/regression.
 */
import { PelariUji } from '../../src/testing';

const pelari = new PelariUji({
  timeoutMs: 10000,
  hentikanSaatGagal: false,
});
const hasil = pelari.jalankanSinkron('tests/regression');

console.log('\n=== REGRESSION SUITE: tests/regression ===');
for (const berkas of hasil.daftarBerkas) {
  console.log(`[${berkas.sukses ? 'LULUS' : 'GAGAL'}] ${berkas.jalurBerkas}`);
  for (const uji of berkas.daftarHasil) {
    if (uji.status !== 'lulus') {
      console.error(`  - ${uji.status}: ${uji.nama}: ${uji.pesan || 'tanpa pesan'}`);
    }
  }
}
console.log(`Total berkas: ${hasil.berkasTotal}; lulus: ${hasil.berkasLulus}; gagal: ${hasil.berkasGagal}`);
console.log(`Total penegasan: ${hasil.totalUji}; lulus: ${hasil.lulus}; gagal: ${hasil.gagal}`);

if (hasil.gagal > 0 || hasil.berkasGagal > 0) {
  process.exit(1);
}
