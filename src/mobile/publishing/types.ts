/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Definisi Tipe Data Mobile App Store Integration & Automated Release
 */

// =============================================================================
// GOOGLE PLAY CONSOLE & DEVELOPER API TYPES
// =============================================================================

export type GooglePlayTrack = 'internal' | 'closed' | 'open' | 'production';

export type StatusRilisPlay = 'draft' | 'inProgress' | 'halted' | 'completed';

export interface KonfigurasiGooglePlay {
  applicationId: string;
  packageName: string;
  serviceAccountEmail?: string;
  serviceAccountKeyEnv?: string; // Variabel env untuk service account JSON/Key (Anti-hardcode)
  serviceAccountKeyPath?: string; // Path berkas lokal yang dikecualikan dari Git
  defaultTrack: GooglePlayTrack;
  autoCommitEdit: boolean;
  userFraction?: number; // Persentase peluncuran bertahap (0.01 - 1.0)
  inAppUpdatePriority?: number; // 0 - 5
  endpointApi?: string; // Override base URL API Google Play (untuk server pengujian / proxy)
  bearerTokenAkses?: string; // Token OAuth2 Bearer eksplisit untuk sesi aktif
  kunciPrivatPem?: string; // Kunci privat RSA PEM untuk RS256 Service Account JWT assertion
}

export interface StatusKoneksiGooglePlay {
  terhubung: boolean;
  emailAkunLayanan?: string;
  packageName: string;
  izinAkses: string[];
  waktuPemeriksaan: string;
  pesan: string;
  modeSandbox: boolean;
}

export interface InfoRilisTrackPlay {
  track: GooglePlayTrack;
  name: string;
  versionCodes: number[];
  status: StatusRilisPlay;
  userFraction?: number;
  releaseNotes: Record<string, string>; // locale -> release note
  updateTime?: string;
}

export interface HasilUploadPlay {
  sukses: boolean;
  versionCode: number;
  sha256: string;
  ukuranBytes: number;
  track: GooglePlayTrack;
  editId?: string;
  pesan: string;
  waktuUpload: string;
  modeSandbox: boolean;
}

// =============================================================================
// APP STORE CONNECT & TESTFLIGHT TYPES
// =============================================================================

export type StatusBuildASC =
  | 'processing'
  | 'processed'
  | 'ready_for_testflight'
  | 'ready_for_review'
  | 'in_review'
  | 'approved'
  | 'rejected';

export interface KonfigurasiAppStoreConnect {
  issuerId?: string;
  keyId?: string;
  privateKeyEnv?: string; // Variabel env untuk AuthKey_*.p8
  privateKeyPath?: string; // Path berkas lokal aman
  appStoreConnectAppId?: string;
  bundleId: string;
  defaultChannel: 'testflight' | 'appstore';
  endpointApi?: string; // Override base URL App Store Connect API (untuk server pengujian / proxy)
  kunciPrivatPem?: string; // Kunci privat EC P-256 PEM (.p8) untuk penandatanganan ES256 JWT nyata
}

export interface StatusKoneksiASC {
  terhubung: boolean;
  issuerId?: string;
  keyId?: string;
  bundleId: string;
  masaBerlakuTokenDetik: number;
  waktuPemeriksaan: string;
  pesan: string;
  modeSandbox: boolean;
}

export interface InformasiBetaTestFlight {
  buildVersion: string;
  buildNumber: number;
  statusProcessing: StatusBuildASC;
  catatanBeta: Record<string, string>; // locale -> apa yang perlu diuji
  emailKontakUmpanBalik?: string;
  grupPenguji: string[];
  eksternalTersedia: boolean;
  tanggalKedaluwarsa?: string; // 90 hari batas TestFlight
}

export interface HasilUploadASC {
  sukses: boolean;
  bundleId: string;
  versi: string;
  buildNumber: number;
  ukuranBytes: number;
  sha256: string;
  uploadTool: 'altool' | 'transporter' | 'simulator_bridge';
  pesan: string;
  waktuUpload: string;
  modeSandbox: boolean;
}

// =============================================================================
// STORE METADATA & LOCALIZATION TYPES
// =============================================================================

export type BahasaListing = 'id' | 'en' | 'ms' | 'ar' | 'ja' | 'zh' | 'es';

export interface MetadataListingLocale {
  locale: BahasaListing;
  namaAplikasi: string; // Batas: Android 30 char, iOS 30 char
  judulSubtitle?: string; // Batas: iOS 30 char
  deskripsiSingkat: string; // Batas: Android 80 char
  deskripsiLengkap: string; // Batas: Android 4000 char, iOS 4000 char
  kataKunci?: string[]; // Batas: iOS 100 char total dipisah koma
  catatanRilis: string; // Batas: 500 char
  kebijakanPrivasiUrl: string;
  dukunganUrl: string;
  pemasaranUrl?: string;
}

export interface InformasiKontakToko {
  namaPengembang: string;
  emailDukungan: string;
  nomorTelepon?: string;
  situsWebResmi: string;
  alamatFisikPengembang?: string;
}

export interface KebijakanPrivasiToko {
  kebijakanUrl: string;
  mengumpulkanDataPribadi: boolean;
  kategoriData: string[];
  tujuanPenggunaan: string[];
  berbagiPihakKetiga: boolean;
  mekanismePenghapusanAkun: boolean;
  urlPenghapusanAkun?: string;
}

export interface MetadataTokoLengkap {
  aplikasiId: string;
  kategoriAndroid: string;
  kategoriIOS: string;
  ratingUsia: '4+' | '9+' | '12+' | '17+' | 'Semua Umur' | 'Remaja';
  bahasaUtama: BahasaListing;
  listingPerLocale: Record<string, MetadataListingLocale>;
  kontak: InformasiKontakToko;
  privasi: KebijakanPrivasiToko;
}

// =============================================================================
// STORE ASSET & SCREENSHOT TYPES
// =============================================================================

export type TipeAsetToko =
  | 'ikon_aplikasi'
  | 'grafik_fitur_android'
  | 'screenshot_ponsel_android'
  | 'screenshot_tablet_7_android'
  | 'screenshot_tablet_10_android'
  | 'screenshot_iphone_6_7'
  | 'screenshot_iphone_6_5'
  | 'screenshot_iphone_5_5'
  | 'screenshot_ipad_pro_12_9';

export interface SpesifikasiAsetToko {
  tipe: TipeAsetToko;
  platform: 'android' | 'ios';
  lebarMin: number;
  lebarMax: number;
  tinggiMin: number;
  tinggiMax: number;
  rasioDiperlukan?: string;
  formatDidukung: ('png' | 'jpeg')[];
  ukuranMaksKb: number;
  wajib: boolean;
  deskripsi: string;
}

export interface BerkasAsetToko {
  tipe: TipeAsetToko;
  platform: 'android' | 'ios';
  locale: BahasaListing;
  jalurBerkas: string;
  lebar: number;
  tinggi: number;
  ukuranKb: number;
  format: 'png' | 'jpeg';
  valid: boolean;
  pesanValidasi: string[];
}

export interface HasilValidasiAsetToko {
  valid: boolean;
  totalAset: number;
  asetValid: number;
  asetTidakValid: number;
  asetWajibKurang: TipeAsetToko[];
  daftarAset: BerkasAsetToko[];
  pesanPeringatan: string[];
  daftarGalat: string[];
}

// =============================================================================
// RELEASE NOTES TYPES
// =============================================================================

export type SumberCatatanRilis = 'changelog' | 'git' | 'manual';

export interface CatatanRilisVersi {
  versi: string;
  buildNumber: number;
  tanggalRilis: string;
  sumber: SumberCatatanRilis;
  kontenPerLocale: Record<string, string>;
  karakterPerLocale: Record<string, number>;
  valid: boolean;
  pesanValidasi: string[];
}

// =============================================================================
// RELEASE PIPELINE & AUTOMATION TYPES
// =============================================================================

export type TahapPipeline =
  | 'validasi_konfigurasi'
  | 'pengujian'
  | 'kompilasi_binary'
  | 'validasi_binary'
  | 'validasi_signing'
  | 'validasi_metadata'
  | 'pemeriksaan_kesiapan'
  | 'persetujuan_pengguna'
  | 'upload_toko'
  | 'validasi_status'
  | 'laporan_rilis';

export type StatusTahapPipeline =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'requires_approval';

export interface LaporanTahapPipeline {
  tahap: TahapPipeline;
  nama: string;
  deskripsi: string;
  status: StatusTahapPipeline;
  waktuMulai?: string;
  waktuSelesai?: string;
  durasiMs: number;
  pesan: string;
  detail?: Record<string, any>;
  daftarGalat: string[];
  daftarPeringatan: string[];
}

export interface OpsiPipelineRilis {
  platform: 'android' | 'ios' | 'keduanya';
  trackAndroid?: GooglePlayTrack;
  channelIOS?: 'testflight' | 'appstore';
  lewatiPengujian?: boolean;
  hanyaValidasi?: boolean;
  modeSimulasi?: boolean;
  otomatisSetujuiNonProduksi?: boolean;
}

export interface HasilEksekusiPipeline {
  idPipeline: string;
  platform: 'android' | 'ios' | 'keduanya';
  sukses: boolean;
  statusAkhir: 'berhasil' | 'gagal' | 'dihentikan' | 'menunggu_persetujuan';
  tahapSelesai: number;
  totalTahap: number;
  daftarTahap: LaporanTahapPipeline[];
  membutuhkanPersetujuan: boolean;
  permintaanPersetujuan?: PermintaanPersetujuanRilis;
  ringkasan: string;
  waktuMulai: string;
  waktuSelesai: string;
  durasiTotalMs: number;
}

// =============================================================================
// RELEASE APPROVAL WORKFLOW TYPES
// =============================================================================

export type TipeAksiPersetujuan =
  | 'upload_binary'
  | 'buat_rilis_draft'
  | 'luncurkan_rilis_testing'
  | 'luncurkan_rilis_produksi'
  | 'ubah_metadata_publik'
  | 'kirim_peninjauan_store';

export interface PermintaanPersetujuanRilis {
  id: string;
  tipeAksi: TipeAksiPersetujuan;
  namaAplikasi: string;
  platform: 'android' | 'ios';
  versi: string;
  versionCodeAtauBuild: number;
  trackAtauChannel: string;
  berkasBinary: string;
  ukuranBinaryKb: number;
  sha256Binary: string;
  tujuanDistribusi: string;
  dampakTindakan: string;
  akunTokoTujuan: string;
  metadataBerubah: Record<string, string>;
  tanggalDibuat: string;
  status: 'menunggu' | 'disetujui' | 'ditolak';
  disetujuiOleh?: string;
  waktuKeputusan?: string;
  catatanPenolakan?: string;
}

// =============================================================================
// STORE COMPLIANCE & READINESS TYPES
// =============================================================================

export interface ItemPemeriksaanKepatuhan {
  kode: string;
  kategori: 'kebijakan_konten' | 'privasi_data' | 'keamanan' | 'izin_sensitif' | 'kualitas_teknis';
  platform: 'android' | 'ios' | 'keduanya';
  judul: string;
  penjelasan: string;
  status: 'patuh' | 'peringatan' | 'melanggar' | 'tidak_berlaku';
  referensiDokumentasi: string;
  rekomendasi?: string;
}

export interface LaporanKepatuhanToko {
  skorKepatuhan: number; // 0 - 100
  totalItem: number;
  patuh: number;
  peringatan: number;
  melanggar: number;
  siapRilis: boolean;
  daftarPemeriksaan: ItemPemeriksaanKepatuhan[];
  kesimpulan: string;
}

// =============================================================================
// PUBLISHING HISTORY & REPORT TYPES
// =============================================================================

export interface EntriRiwayatPublikasi {
  id: string;
  stempelWaktu: string;
  platform: 'android' | 'ios';
  versi: string;
  versionCode: number;
  trackAtauChannel: string;
  status: 'sukses' | 'gagal' | 'dibatalkan' | 'draft' | 'meninjau' | 'disetujui' | 'ditolak';
  aksi: string;
  namaBerkas: string;
  sha256: string;
  akunTarget: string;
  pesan: string;
  eksekutor: string;
  modeSandbox: boolean;
}

export interface LaporanPublikasiLengkap {
  idLaporan: string;
  namaProyek: string;
  applicationId: string;
  platform: 'android' | 'ios' | 'keduanya';
  versi: string;
  buildNumber: number;
  berkasBinary: {
    android?: string;
    ios?: string;
  };
  trackAtauChannel: string;
  akunTujuanMasked: string;
  statusPublikasi:
    | 'belum_dimulai'
    | 'validasi_berhasil'
    | 'siap_diunggah'
    | 'upload_berhasil'
    | 'sedang_diproses'
    | 'menunggu_peninjauan'
    | 'disetujui'
    | 'ditolak'
    | 'dirilis'
    | 'gagal';
  skorKepatuhan: number;
  daftarPeringatan: string[];
  daftarGalat: string[];
  tindakanLanjutan: string[];
  stempelWaktu: string;
  modeSandbox: boolean;
}
