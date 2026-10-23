/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Menghitung jarak Levenshtein antara dua string.
 * Mengembalikan jumlah minimum operasi (penyisipan, penghapusan, penggantian)
 * yang diperlukan untuk mengubah string a menjadi string b.
 */
export function hitungJarakLevenshtein(a: string, b: string): number {
  const sa = a.toLowerCase();
  const sb = b.toLowerCase();

  const m = sa.length;
  const n = sb.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Optimasi alokasi memori menggunakan dua baris matriks
  let barisSebelum = Array.from({ length: n + 1 }, (_, i) => i);
  let barisSekarang = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    barisSekarang[0] = i;
    for (let j = 1; j <= n; j++) {
      const biaya = sa[i - 1] === sb[j - 1] ? 0 : 1;
      barisSekarang[j] = Math.min(
        barisSebelum[j] + 1, // Penghapusan
        barisSekarang[j - 1] + 1, // Penyisipan
        barisSebelum[j - 1] + biaya // Penggantian
      );
    }
    const temp = barisSebelum;
    barisSebelum = barisSekarang;
    barisSekarang = temp;
  }

  return barisSebelum[n];
}

/**
 * Mencari kandidat nama yang paling mirip berdasarkan jarak Levenshtein.
 * Hanya mengembalikan saran jika tingkat keyakinan cukup tinggi (jarak <= batas).
 */
export function cariSaranTerdekat(
  namaDicari: string,
  daftarKandidat: string[],
  batasMaksimalJarak: number = 3
): string | undefined {
  if (!namaDicari || daftarKandidat.length === 0) {
    return undefined;
  }

  const target = namaDicari.trim().toLowerCase();
  let jarakTerbaik = Infinity;
  let kandidatTerbaik: string | undefined = undefined;

  for (const kandidat of daftarKandidat) {
    if (!kandidat || kandidat === namaDicari) continue;

    // Batasi pencarian jika perbedaan panjang string terlalu ekstrem
    const selisihPanjang = Math.abs(kandidat.length - target.length);
    if (selisihPanjang > batasMaksimalJarak) continue;

    const jarak = hitungJarakLevenshtein(target, kandidat);

    // Rasio toleransi: untuk kata pendek (< 4 huruf), batas maksimal jarak adalah 1
    const batasEfektif = target.length <= 3 ? 1 : batasMaksimalJarak;

    if (jarak <= batasEfektif && jarak < jarakTerbaik) {
      jarakTerbaik = jarak;
      kandidatTerbaik = kandidat;
    }
  }

  return kandidatTerbaik;
}

/**
 * Menghasilkan pesan saran ramah berbahasa Indonesia jika ditemukan kemiripan nama.
 */
export function buatPesanSaran(
  namaDicari: string,
  daftarKandidat: string[]
): string | undefined {
  const saran = cariSaranTerdekat(namaDicari, daftarKandidat);
  if (saran) {
    return `Mungkin yang Anda maksud: '${saran}'?`;
  }
  return undefined;
}
