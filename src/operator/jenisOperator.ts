/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Taksonomi Kategori Operator Bahasa NUSANTARA (Phase 10).
 */
export enum KategoriOperator {
  PENGELOMPOKAN = 'PENGELOMPOKAN',
  UNARI = 'UNARI',
  ARITMATIKA_MULTIPLIKATIF = 'ARITMATIKA_MULTIPLIKATIF',
  ARITMATIKA_ADITIF = 'ARITMATIKA_ADITIF',
  PERBANDINGAN_RELASIONAL = 'PERBANDINGAN_RELASIONAL',
  PERBANDINGAN_KESETARAAN = 'PERBANDINGAN_KESETARAAN',
  LOGIKA_KONJUNGSI = 'LOGIKA_KONJUNGSI',
  LOGIKA_DISJUNGSI = 'LOGIKA_DISJUNGSI',
}

/**
 * Arah Asosiasi Operator (Associativity).
 */
export enum ArahAsosiasi {
  KIRI_KE_KANAN = 'KIRI_KE_KANAN',
  KANAN_KE_KIRI = 'KANAN_KE_KIRI',
}

/**
 * Definisi Metadata Lengkap untuk Setiap Operator NUSANTARA.
 */
export interface DefinisiOperator {
  simbol: string;
  nama: string;
  tingkatPresedensi: number; // 1 (tertinggi) sampai 8 (terendah)
  asosiasi: ArahAsosiasi;
  kategori: KategoriOperator;
  apakahBiner: boolean;
  apakahUnari: boolean;
  deskripsi: string;
}

/**
 * Tabel 8 Tingkat Presedensi Resmi Bahasa NUSANTARA (Sesuai Spesifikasi Phase 4).
 * 1 (Tertinggi) -> 8 (Terendah)
 */
export const TABEL_PRESEDENSI_OPERATOR: Record<string, DefinisiOperator> = {
  // Tingkat 2: Negasi & Tanda Unari (Kanan ke Kiri)
  'tidak': {
    simbol: 'tidak',
    nama: 'Negasi Logika',
    tingkatPresedensi: 2,
    asosiasi: ArahAsosiasi.KANAN_KE_KIRI,
    kategori: KategoriOperator.UNARI,
    apakahBiner: false,
    apakahUnari: true,
    deskripsi: 'Membalikkan nilai kebenaran logika (benar -> salah, salah -> benar)',
  },
  '-unari': {
    simbol: '-',
    nama: 'Negasi Numerik Unari',
    tingkatPresedensi: 2,
    asosiasi: ArahAsosiasi.KANAN_KE_KIRI,
    kategori: KategoriOperator.UNARI,
    apakahBiner: false,
    apakahUnari: true,
    deskripsi: 'Membalikkan tanda positif/negatif bilangan atau desimal',
  },

  // Tingkat 3: Multiplikatif (Kiri ke Kanan)
  '*': {
    simbol: '*',
    nama: 'Perkalian',
    tingkatPresedensi: 3,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.ARITMATIKA_MULTIPLIKATIF,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Mengalikan dua operan numerik',
  },
  '/': {
    simbol: '/',
    nama: 'Pembagian',
    tingkatPresedensi: 3,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.ARITMATIKA_MULTIPLIKATIF,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Membagi operan kiri dengan operan kanan (menghasilkan desimal)',
  },
  '%': {
    simbol: '%',
    nama: 'Modulo (Sisa Bagi)',
    tingkatPresedensi: 3,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.ARITMATIKA_MULTIPLIKATIF,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Menghitung sisa hasil bagi antara dua bilangan bulat',
  },

  // Tingkat 4: Aditif (Kiri ke Kanan)
  '+': {
    simbol: '+',
    nama: 'Penjumlahan / Penggabungan Teks',
    tingkatPresedensi: 4,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.ARITMATIKA_ADITIF,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Menjumlahkan dua angka atau menggabungkan dua teks',
  },
  '-': {
    simbol: '-',
    nama: 'Pengurangan',
    tingkatPresedensi: 4,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.ARITMATIKA_ADITIF,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Mengurangkan operan kanan dari operan kiri',
  },

  // Tingkat 5: Perbandingan Relasional (Kiri ke Kanan)
  '<': {
    simbol: '<',
    nama: 'Kurang Dari',
    tingkatPresedensi: 5,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.PERBANDINGAN_RELASIONAL,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Memeriksa apakah operan kiri lebih kecil dari operan kanan',
  },
  '<=': {
    simbol: '<=',
    nama: 'Kurang Dari Atau Sama Dengan',
    tingkatPresedensi: 5,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.PERBANDINGAN_RELASIONAL,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Memeriksa apakah operan kiri lebih kecil atau sama dengan operan kanan',
  },
  '>': {
    simbol: '>',
    nama: 'Lebih Dari',
    tingkatPresedensi: 5,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.PERBANDINGAN_RELASIONAL,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Memeriksa apakah operan kiri lebih besar dari operan kanan',
  },
  '>=': {
    simbol: '>=',
    nama: 'Lebih Dari Atau Sama Dengan',
    tingkatPresedensi: 5,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.PERBANDINGAN_RELASIONAL,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Memeriksa apakah operan kiri lebih besar atau sama dengan operan kanan',
  },

  // Tingkat 6: Perbandingan Kesetaraan (Kiri ke Kanan)
  '==': {
    simbol: '==',
    nama: 'Sama Dengan (Kesetaraan Nilai)',
    tingkatPresedensi: 6,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.PERBANDINGAN_KESETARAAN,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Memeriksa kesetaraan nilai antara dua operan',
  },
  '!=': {
    simbol: '!=',
    nama: 'Tidak Sama Dengan (Ketidaksamaan Nilai)',
    tingkatPresedensi: 6,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.PERBANDINGAN_KESETARAAN,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Memeriksa ketidaksamaan nilai antara dua operan',
  },

  // Tingkat 7: Logika Konjungsi AND (Kiri ke Kanan)
  'dan': {
    simbol: 'dan',
    nama: 'Konjungsi Logika (AND)',
    tingkatPresedensi: 7,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.LOGIKA_KONJUNGSI,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Menghasilkan benar jika kedua operan bernilai benar (mendukung hubung singkat)',
  },

  // Tingkat 8: Logika Disjungsi OR (Kiri ke Kanan)
  'atau': {
    simbol: 'atau',
    nama: 'Disjungsi Logika (OR)',
    tingkatPresedensi: 8,
    asosiasi: ArahAsosiasi.KIRI_KE_KANAN,
    kategori: KategoriOperator.LOGIKA_DISJUNGSI,
    apakahBiner: true,
    apakahUnari: false,
    deskripsi: 'Menghasilkan benar jika salah satu atau kedua operan bernilai benar (mendukung hubung singkat)',
  },
};

/**
 * Mendapatkan informasi metadata operator.
 */
export function dapatkanMetadataOperator(op: string, unari: boolean = false): DefinisiOperator | null {
  if (unari && op === '-') {
    return TABEL_PRESEDENSI_OPERATOR['-unari'] || null;
  }
  return TABEL_PRESEDENSI_OPERATOR[op] || null;
}

/**
 * Memeriksa apakah suatu string merupakan operator yang valid dalam bahasa NUSANTARA.
 */
export function apakahOperatorValid(op: string): boolean {
  return op in TABEL_PRESEDENSI_OPERATOR || op === '-unari';
}
