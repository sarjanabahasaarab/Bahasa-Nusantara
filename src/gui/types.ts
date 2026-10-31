/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Definisi Tipe Data & Kontrak GUI Framework & Desktop Application
 */

export type JenisPeristiwaGUI =
  | 'klik'
  | 'klik_ganda'
  | 'teks_berubah'
  | 'nilai_berubah'
  | 'seleksi_berubah'
  | 'fokus'
  | 'blur'
  | 'tombol_ditekan'
  | 'tombol_dilepas'
  | 'mouse_masuk'
  | 'mouse_keluar'
  | 'jendela_ubah_ukuran'
  | 'jendela_ditutup'
  | 'jendela_diminimalkan'
  | 'jendela_dimaksimalkan';

export interface DataPeristiwaGUI<T = any> {
  idWidget: string;
  jenis: JenisPeristiwaGUI;
  stempelWaktu: number;
  data?: T;
  nilaiTeks?: string;
  nilaiAngka?: number;
  nilaiLogika?: boolean;
  kunciKeyboard?: string;
  posisiX?: number;
  posisiY?: number;
  dibatalkan?: boolean;
}

export type PenanganPeristiwaGUI<T = any> = (peristiwa: DataPeristiwaGUI<T>) => void | Promise<void>;

export type JenisWidget =
  | 'label'
  | 'tombol'
  | 'input_teks'
  | 'area_teks'
  | 'kotak_centang'
  | 'tombol_radio'
  | 'pilihan'
  | 'daftar'
  | 'tabel'
  | 'gambar'
  | 'progres'
  | 'slider'
  | 'tab'
  | 'wadah'
  | 'baris'
  | 'kolom'
  | 'grid'
  | 'stack'
  | 'gulir';

export type PerataanTeks = 'kiri' | 'tengah' | 'kanan' | 'rata_kanan_kiri';

export type ArahLayout = 'horizontal' | 'vertikal';

export type PerataanLayout = 'awal' | 'tengah' | 'akhir' | 'renggang' | 'sama_rata';

export type StatusJendela = 'normal' | 'diminimalkan' | 'dimaksimalkan' | 'layar_penuh' | 'tersembunyi';

export type NamaTemaGUI = 'terang' | 'gelap' | 'sistem' | 'kontras_tinggi';

export interface SkemaWarnaGUI {
  nama: NamaTemaGUI;
  latarBelakang: string;
  latarKomponen: string;
  latarKomponenHover: string;
  latarKomponenAktif: string;
  teksUtama: string;
  teksSekunder: string;
  teksMuted: string;
  primer: string;
  primerHover: string;
  primerTeks: string;
  sekunder: string;
  aksen: string;
  border: string;
  borderFokus: string;
  sukses: string;
  peringatan: string;
  bahaya: string;
  indikatorFokus: string;
}

export interface GayaWidget {
  lebar?: number | string;
  tinggi?: number | string;
  lebarMin?: number;
  tinggiMin?: number;
  lebarMaks?: number;
  tinggiMaks?: number;
  padding?: number | [number, number] | [number, number, number, number];
  margin?: number | [number, number] | [number, number, number, number];
  warnaTeks?: string;
  warnaLatar?: string;
  warnaBorder?: string;
  ketebalanBorder?: number;
  radiusSudut?: number;
  ukuranFont?: number;
  beratFont?: 'normal' | 'tebal' | 'tipis';
  perataanTeks?: PerataanTeks;
  tampak?: boolean;
  dapatDiakses?: boolean;
  flex?: number;
  gap?: number;
}

export interface KonfigurasiAplikasiGUI {
  idAplikasi: string;
  namaAplikasi: string;
  versi?: string;
  organisasi?: string;
  temaAwal?: NamaTemaGUI;
  tutupOtomatisSaatJendelaTerakhirTutup?: boolean;
}

export interface KonfigurasiJendelaGUI {
  id?: string;
  judul: string;
  lebar?: number;
  tinggi?: number;
  lebarMin?: number;
  tinggiMin?: number;
  lebarMaks?: number;
  tinggiMaks?: number;
  posisiX?: number;
  posisiY?: number;
  dapatDiubahUkuran?: boolean;
  modal?: boolean;
  selaluDiAtas?: boolean;
  ikon?: string;
  tengahLayar?: boolean;
}

export interface OpsiPesanDialog {
  judul: string;
  pesan: string;
  tipe?: 'info' | 'peringatan' | 'galat' | 'sukses';
  teksTombol?: string;
}

export interface OpsiKonfirmasiDialog {
  judul: string;
  pesan: string;
  teksYa?: string;
  teksTidak?: string;
  tipe?: 'tanya' | 'peringatan' | 'bahaya';
}

export interface OpsiDialogBerkas {
  judul?: string;
  direktoriAwal?: string;
  namaBerkasBawaan?: string;
  filterEkstensi?: Array<{ nama: string; ekstensi: string[] }>;
  banyakBerkas?: boolean;
}

export interface HasilDialogBerkas {
  dibatalkan: boolean;
  jalurBerkas?: string;
  daftarJalurBerkas?: string[];
}

export interface ItemMenuDefinisi {
  id: string;
  label: string;
  shortcut?: string;
  ikon?: string;
  nonaktif?: boolean;
  tercentang?: boolean;
  pemisah?: boolean;
  submenu?: ItemMenuDefinisi[];
  aksi?: () => void;
}

export interface KolomTabelDefinisi {
  id: string;
  judul: string;
  lebar?: number;
  perataan?: PerataanTeks;
  dapatDiurutkan?: boolean;
}

export interface OpsiValidasiForm {
  wajib?: boolean;
  panjangMin?: number;
  panjangMaks?: number;
  nilaiMin?: number;
  nilaiMaks?: number;
  polaRegex?: RegExp;
  pesanKustom?: string;
}

export interface HasilValidasiForm {
  sah: boolean;
  daftarGalat: Array<{ idField: string; pesan: string }>;
}
