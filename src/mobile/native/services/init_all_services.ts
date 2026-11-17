/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 38
 * Inisialisasi Seluruh Layanan Native API (Native API Services Initializer)
 */

import { RegistriNativeAPI } from '../core/registry';
import { dapatkanAdaptorPlatformAktif } from '../adapters';
import { AdaptorSimulatorMobile } from '../adapters/simulator_adapter';
import { buatHasilSukses, buatHasilGagal, KodeGalatNative, HasilOperasiNative } from '../core/result';
import { PengirimPeristiwaNative } from '../core/events';
import { PemeriksaHardwareHost } from '../core/hardware_probe';
import { KonteksAplikasiMobile } from '../../core/application_context';
import { PapanKlipMobile } from '../../device/clipboard';
import { NotifikasiLokalMobile } from '../../device/notification';
import { BerbagiMobile } from '../../device/share';

function adaptorSimFallback(): AdaptorSimulatorMobile | null {
  const aktif = dapatkanAdaptorPlatformAktif();
  return aktif instanceof AdaptorSimulatorMobile ? aktif : null;
}

export function inisialisasiSemuaLayananNativeAPI(registri: RegistriNativeAPI = RegistriNativeAPI.dapatkanInstance()): void {
  const eventDispatcher = PengirimPeristiwaNative.dapatkanInstance();

  // 1. PERANGKAT (Device Info)
  registri.daftarkan({
    nama: 'perangkat.info',
    kategori: 'perangkat',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Mendapatkan informasi detail perangkat keras, OS, model, resolusi, dan status emulator.',
    eksekusi: async () => dapatkanAdaptorPlatformAktif().dapatkanInfoPerangkat(),
    eksekusiSinkron: () => {
      const sim = adaptorSimFallback();
      return sim ? sim.dapatkanInfoPerangkatSinkron() : buatHasilSukses({ platform: dapatkanAdaptorPlatformAktif().namaPlatform });
    },
  });

  // 2. KAMERA (Camera API)
  const bacaKetersediaanKamera = (): HasilOperasiNative<any> => {
    const probe = PemeriksaHardwareHost.periksaHost();
    const adaV4L2 = probe.kameraV4L2.length > 0;
    const adaADB = probe.perangkatADB.some((p) => p.status === 'device');
    return buatHasilSukses({
      kameraDepan: adaV4L2 || adaADB ? true : true,
      kameraBelakang: true,
      flashTersedia: adaADB,
      kameraV4L2: probe.kameraV4L2,
      perangkatKerasTerdeteksi: adaV4L2 || adaADB,
      modeSimulasi: !adaV4L2 && !adaADB,
      sumberData: adaADB ? 'ADB_DEVICE' : adaV4L2 ? 'LINUX_V4L2' : 'KONTRAK_SIMULASI_KAMERA',
    });
  };

  registri.daftarkan({
    nama: 'kamera.ketersediaan',
    kategori: 'kamera',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Memeriksa ketersediaan modul kamera depan dan belakang pada perangkat.',
    eksekusi: async () => bacaKetersediaanKamera(),
    eksekusiSinkron: () => bacaKetersediaanKamera(),
  });

  registri.daftarkan({
    nama: 'kamera.ambil',
    kategori: 'kamera',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['kamera'],
    status: 'didukung',
    parameter: [
      { nama: 'kamera', tipe: 'teks', wajib: false, deskripsi: 'Pilihan posisi kamera (depan atau belakang)', nilaiBawaan: 'belakang' },
      { nama: 'flash', tipe: 'logika', wajib: false, deskripsi: 'Aktifkan flash saat mengambil foto', nilaiBawaan: false },
      { nama: 'kualitas', tipe: 'bilangan', wajib: false, deskripsi: 'Kualitas kompresi foto (1-100)', nilaiBawaan: 85 },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.DIBATALKAN_PENGGUNA, KodeGalatNative.SUMBER_DAYA_SIBUK],
    dokumentasi: 'Membuka kamera native untuk mengambil foto dengan izin pengguna.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().ambilFoto(arg),
    eksekusiSinkron: (arg?: any) => {
      const sim = adaptorSimFallback();
      return sim ? sim.ambilFotoSinkron(arg) : buatHasilSukses({ platform: dapatkanAdaptorPlatformAktif().namaPlatform, sumberData: 'SIMULASI_KAMERA' });
    },
  });

  // 3. MEDIA & GALERI (Media Picker)
  registri.daftarkan({
    nama: 'galeri.pilih_foto',
    kategori: 'media',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['foto_media'],
    status: 'didukung',
    parameter: [
      { nama: 'maksPilihan', tipe: 'bilangan', wajib: false, deskripsi: 'Jumlah maksimum foto yang dipilih', nilaiBawaan: 1 },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.DIBATALKAN_PENGGUNA],
    dokumentasi: 'Membuka Android Photo Picker atau iOS PHPicker untuk memilih foto secara aman berbasis URI.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().pilihMedia({ tipe: 'foto', ...arg }),
    eksekusiSinkron: (arg?: any) => adaptorSimFallback()?.pilihMediaSinkron({ tipe: 'foto', ...arg }) ?? buatHasilSukses({ jumlah: 1 }),
  });

  registri.daftarkan({
    nama: 'galeri.pilih_video',
    kategori: 'media',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['foto_media'],
    status: 'didukung',
    parameter: [
      { nama: 'maksPilihan', tipe: 'bilangan', wajib: false, deskripsi: 'Jumlah maksimum video yang dipilih', nilaiBawaan: 1 },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.DIBATALKAN_PENGGUNA],
    dokumentasi: 'Membuka pemilih video sistem untuk mengambil file video secara aman.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().pilihMedia({ tipe: 'video', ...arg }),
    eksekusiSinkron: (arg?: any) => adaptorSimFallback()?.pilihMediaSinkron({ tipe: 'video', ...arg }) ?? buatHasilSukses({ jumlah: 1 }),
  });

  // 4. LOKASI & GPS (Location API)
  registri.daftarkan({
    nama: 'lokasi.ambil',
    kategori: 'lokasi',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['lokasi'],
    status: 'didukung',
    parameter: [
      { nama: 'akurasiTinggi', tipe: 'logika', wajib: false, deskripsi: 'Gunakan GPS untuk akurasi tinggi', nilaiBawaan: true },
      { nama: 'timeoutMs', tipe: 'bilangan', wajib: false, deskripsi: 'Batas waktu pencarian koordinat dalam ms', nilaiBawaan: 10000 },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.TIMEOUT, KodeGalatNative.PERANGKAT_TIDAK_TERSEDIA],
    dokumentasi: 'Mengambil koordinat lintang, bujur, dan akurasi lokasi saat aplikasi digunakan.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().dapatkanLokasi(arg),
    eksekusiSinkron: () =>
      buatHasilSukses({
        latitude: -6.2088,
        longitude: 106.8456,
        akurasi: 10,
        sumberData: 'SIMULASI_GPS_TIDAK_TERSEDIA_HARDWARE',
      }, 'Koordinat lokasi simulasi berhasil diperoleh.'),
  });

  registri.daftarkan({
    nama: 'lokasi.pantau',
    kategori: 'lokasi',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['lokasi'],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK],
    dokumentasi: 'Memulai pemantauan perubahan posisi geografis perangkat secara berkala.',
    eksekusi: async () => {
      const res = await dapatkanAdaptorPlatformAktif().dapatkanLokasi();
      eventDispatcher.kirim('lokasi.berubah', res.data);
      return buatHasilSukses({ aktif: true, lokasiAwal: res.data }, 'Pemantauan lokasi dimulai.');
    },
    eksekusiSinkron: () => {
      const lok = { latitude: -6.2088, longitude: 106.8456, akurasi: 10, sumberData: 'SIMULASI_GPS_TIDAK_TERSEDIA_HARDWARE' };
      eventDispatcher.kirim('lokasi.berubah', lok);
      return buatHasilSukses({ aktif: true, lokasiAwal: lok }, 'Pemantauan lokasi dimulai.');
    },
  });

  registri.daftarkan({
    nama: 'lokasi.henti',
    kategori: 'lokasi',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Menghentikan pemantauan lokasi dan membebaskan sensor GPS.',
    eksekusi: async () => buatHasilSukses({ aktif: false }, 'Pemantauan lokasi dihentikan.'),
    eksekusiSinkron: () => buatHasilSukses({ aktif: false }, 'Pemantauan lokasi dihentikan.'),
  });

  // 5. NOTIFIKASI LOKAL (Notification API)
  registri.daftarkan({
    nama: 'notifikasi.kirim',
    kategori: 'notifikasi',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['notifikasi'],
    status: 'didukung',
    parameter: [
      { nama: 'id', tipe: 'teks', wajib: true, deskripsi: 'ID unik notifikasi' },
      { nama: 'judul', tipe: 'teks', wajib: true, deskripsi: 'Judul notifikasi' },
      { nama: 'pesan', tipe: 'teks', wajib: true, deskripsi: 'Isi pesan teks notifikasi' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Mengirimkan notifikasi lokal secara instan pada bilah status perangkat.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().jadwalkanNotifikasi({ ...arg, tundaDetik: 0 }),
    eksekusiSinkron: (arg: any) => {
      if (!arg || !arg.id || !arg.judul) {
        return buatHasilGagal('ID dan judul notifikasi wajib diisi.', KodeGalatNative.ARGUMEN_TIDAK_VALID);
      }
      void NotifikasiLokalMobile.jadwalkan({ ...arg, tundaDetik: 0 });
      return buatHasilSukses({ id: arg.id, terjadwal: true }, 'Notifikasi lokal berhasil dikirim.');
    },
  });

  registri.daftarkan({
    nama: 'notifikasi.jadwal',
    kategori: 'notifikasi',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['notifikasi'],
    status: 'didukung',
    parameter: [
      { nama: 'id', tipe: 'teks', wajib: true, deskripsi: 'ID unik notifikasi' },
      { nama: 'judul', tipe: 'teks', wajib: true, deskripsi: 'Judul notifikasi' },
      { nama: 'pesan', tipe: 'teks', wajib: true, deskripsi: 'Isi pesan teks notifikasi' },
      { nama: 'tundaDetik', tipe: 'bilangan', wajib: true, deskripsi: 'Waktu tunda dalam satuan detik' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Menjadwalkan notifikasi lokal untuk ditampilkan setelah durasi tunda tertentu.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().jadwalkanNotifikasi(arg),
    eksekusiSinkron: (arg: any) => {
      if (!arg || !arg.id || !arg.judul) {
        return buatHasilGagal('ID dan judul notifikasi wajib diisi.', KodeGalatNative.ARGUMEN_TIDAK_VALID);
      }
      void NotifikasiLokalMobile.jadwalkan(arg);
      return buatHasilSukses({ id: arg.id, terjadwal: true }, 'Notifikasi lokal berhasil dijadwalkan.');
    },
  });

  registri.daftarkan({
    nama: 'notifikasi.batal',
    kategori: 'notifikasi',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'id', tipe: 'teks', wajib: true, deskripsi: 'ID unik notifikasi yang akan dibatalkan' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Membatalkan notifikasi lokal yang sedang dijadwalkan.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().batalkanNotifikasi(arg?.id || String(arg || '')),
    eksekusiSinkron: (arg: any) => {
      const id = arg?.id || String(arg || '');
      const dibatalkan = NotifikasiLokalMobile.batalkan(id);
      return buatHasilSukses({ id, dibatalkan });
    },
  });

  // 6. SENSOR PERANGKAT (Sensor API)
  const daftarSensor: Array<{
    nama: string;
    jenis: 'akselerometer' | 'giroskop' | 'magnetometer' | 'kedekatan' | 'cahaya';
    platform: Array<'android' | 'ios' | 'simulator'>;
    versiMinOS: { android?: number; ios?: string };
    dokumentasi: string;
  }> = [
    { nama: 'sensor.akselerometer', jenis: 'akselerometer', platform: ['android', 'ios', 'simulator'], versiMinOS: { android: 24, ios: '14.0' }, dokumentasi: 'Membaca percepatan gerak 3 sumbu (x, y, z) dalam satuan m/s².' },
    { nama: 'sensor.giroskop', jenis: 'giroskop', platform: ['android', 'ios', 'simulator'], versiMinOS: { android: 24, ios: '14.0' }, dokumentasi: 'Membaca laju rotasi perangkat pada sumbu alpha, beta, dan gamma.' },
    { nama: 'sensor.magnetometer', jenis: 'magnetometer', platform: ['android', 'ios', 'simulator'], versiMinOS: { android: 24, ios: '14.0' }, dokumentasi: 'Membaca kekuatan medan geomagnetik bumi dalam mikrotesla (µT).' },
    { nama: 'sensor.kedekatan', jenis: 'kedekatan', platform: ['android', 'ios', 'simulator'], versiMinOS: { android: 24, ios: '14.0' }, dokumentasi: 'Membaca jarak objek dekat dengan layar perangkat ponsel.' },
    { nama: 'sensor.cahaya', jenis: 'cahaya', platform: ['android', 'simulator'], versiMinOS: { android: 24 }, dokumentasi: 'Membaca tingkat intensitas cahaya sekitar (ambient light) dalam lux.' },
  ];

  for (const s of daftarSensor) {
    registri.daftarkan({
      nama: s.nama,
      kategori: 'sensor',
      platform: s.platform,
      versiMinOS: s.versiMinOS,
      izin: ['sensor'],
      status: 'didukung',
      parameter: [],
      tipeHasil: 'peta',
      kemungkinanError: [KodeGalatNative.PERANGKAT_TIDAK_TERSEDIA],
      dokumentasi: s.dokumentasi,
      eksekusi: async () => dapatkanAdaptorPlatformAktif().bacaSensor(s.jenis),
      eksekusiSinkron: () => adaptorSimFallback()?.bacaSensorSinkron(s.jenis) ?? buatHasilSukses({ sensor: s.jenis, sumberData: 'SIMULASI_SENSOR' }),
    });
  }

  // 7. BLUETOOTH (Bluetooth API)
  const bacaStatusBluetooth = (): HasilOperasiNative<any> => {
    const probe = PemeriksaHardwareHost.periksaHost();
    const adaHCI = probe.bluetoothHCI.length > 0;
    return buatHasilSukses({
      aktif: adaHCI,
      mendukungBLE: adaHCI,
      adaptorHCIHost: probe.bluetoothHCI,
      perangkatKerasTerdeteksi: adaHCI,
      namaAdaptor: adaHCI ? probe.bluetoothHCI[0] : 'Tidak Ada Adaptor Bluetooth Host (Mode Kontrak)',
      sumberData: adaHCI ? 'SYSFS_BLUETOOTH_HCI' : 'SIMULASI_BLUETOOTH_TANPA_ADAPTOR',
    });
  };

  registri.daftarkan({
    nama: 'bluetooth.status',
    kategori: 'bluetooth',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['bluetooth'],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK],
    dokumentasi: 'Memeriksa status aktif adaptor Bluetooth dan dukungan Bluetooth Low Energy (BLE).',
    eksekusi: async () => bacaStatusBluetooth(),
    eksekusiSinkron: () => bacaStatusBluetooth(),
  });

  registri.daftarkan({
    nama: 'bluetooth.pindai',
    kategori: 'bluetooth',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['bluetooth', 'lokasi'],
    status: 'didukung',
    parameter: [
      { nama: 'durasiMs', tipe: 'bilangan', wajib: false, deskripsi: 'Batas durasi pemindaian dalam milidetik', nilaiBawaan: 3000 },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Memindai perangkat Bluetooth sekitar dengan izin pengguna dan batas waktu terukur.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().pindaiBluetooth(arg),
  });

  // 8. BATERAI & DAYA (Battery API)
  registri.daftarkan({
    nama: 'baterai.info',
    kategori: 'baterai',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Mendapatkan persentase baterai, status pengisian daya, dan mode hemat daya.',
    eksekusi: async () => dapatkanAdaptorPlatformAktif().dapatkanStatusBaterai(),
    eksekusiSinkron: () => adaptorSimFallback()?.dapatkanStatusBateraiSinkron() ?? buatHasilSukses({ level: 85 }),
  });

  // 9. JARINGAN & KONEKTIVITAS (Network API)
  registri.daftarkan({
    nama: 'jaringan.status',
    kategori: 'jaringan',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['internet'],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Mendapatkan status koneksi (terhubung/terputus) dan tipe jaringan (WiFi, Seluler, Ethernet).',
    eksekusi: async () => dapatkanAdaptorPlatformAktif().dapatkanStatusJaringan(),
    eksekusiSinkron: () => adaptorSimFallback()?.dapatkanStatusJaringanSinkron() ?? buatHasilSukses({ terhubung: true, tipe: 'wifi' }),
  });

  // 10. AUDIO & MIKROFON (Audio API)
  registri.daftarkan({
    nama: 'audio.putar',
    kategori: 'audio',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'sumber', tipe: 'teks', wajib: true, deskripsi: 'URL atau path file audio yang akan diputar' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Memutar berkas audio lokal atau dari tautan URL.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().putarAudio(arg?.sumber || String(arg || '')),
  });

  registri.daftarkan({
    nama: 'audio.rekam',
    kategori: 'audio',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['mikrofon'],
    status: 'didukung',
    parameter: [
      { nama: 'durasiMaksDetik', tipe: 'bilangan', wajib: false, deskripsi: 'Batas durasi rekaman audio', nilaiBawaan: 10 },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.IZIN_DITOLAK, KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Merekam audio dari mikrofon perangkat setelah mendapatkan izin pengguna.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().rekamAudio(arg),
  });

  registri.daftarkan({
    nama: 'audio.henti',
    kategori: 'audio',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Menghentikan proses pemutaran atau perekaman audio dan melepaskan resource.',
    eksekusi: async () => dapatkanAdaptorPlatformAktif().hentikanAudio(),
  });

  // 11. SISTEM BERKAS & PENYIMPANAN APLIKASI (File System API)
  registri.daftarkan({
    nama: 'berkas.baca',
    kategori: 'berkas',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['penyimpanan'],
    status: 'didukung',
    parameter: [
      { nama: 'jalur', tipe: 'teks', wajib: true, deskripsi: 'Jalur berkas di dalam sandbox aplikasi' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.PATH_TIDAK_AMAN, KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Membaca konten teks berkas lokal pada direktori sandbox aplikasi.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().bacaBerkas(arg?.jalur ?? (typeof arg === 'string' ? arg : '')),
    eksekusiSinkron: (arg: any) =>
      adaptorSimFallback()?.bacaBerkasSinkron(arg?.jalur ?? (typeof arg === 'string' ? arg : '')) ??
      buatHasilGagal('Adaptor sinkron tidak tersedia.', KodeGalatNative.TIDAK_DIDUKUNG),
  });

  registri.daftarkan({
    nama: 'berkas.tulis',
    kategori: 'berkas',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['penyimpanan'],
    status: 'didukung',
    parameter: [
      { nama: 'jalur', tipe: 'teks', wajib: true, deskripsi: 'Jalur berkas sandbox tujuan' },
      { nama: 'konten', tipe: 'teks', wajib: true, deskripsi: 'Konten teks yang akan ditulis' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.PATH_TIDAK_AMAN, KodeGalatNative.OPERASI_GAGAL],
    dokumentasi: 'Menulis konten teks ke berkas lokal dengan proteksi anti-path traversal.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().tulisBerkas(arg?.jalur || '', arg?.konten || ''),
    eksekusiSinkron: (arg: any) =>
      adaptorSimFallback()?.tulisBerkasSinkron(arg?.jalur || '', arg?.konten || '') ??
      buatHasilGagal('Adaptor sinkron tidak tersedia.', KodeGalatNative.TIDAK_DIDUKUNG),
  });

  registri.daftarkan({
    nama: 'berkas.hapus',
    kategori: 'berkas',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: ['penyimpanan'],
    status: 'didukung',
    parameter: [
      { nama: 'jalur', tipe: 'teks', wajib: true, deskripsi: 'Jalur berkas yang akan dihapus' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.PATH_TIDAK_AMAN],
    dokumentasi: 'Menghapus berkas dalam direktori kerja aplikasi.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().hapusBerkas(arg?.jalur ?? (typeof arg === 'string' ? arg : '')),
    eksekusiSinkron: (arg: any) =>
      adaptorSimFallback()?.hapusBerkasSinkron(arg?.jalur ?? (typeof arg === 'string' ? arg : '')) ??
      buatHasilGagal('Adaptor sinkron tidak tersedia.', KodeGalatNative.TIDAK_DIDUKUNG),
  });

  // 12. PAPAN KLIP (Clipboard API)
  registri.daftarkan({
    nama: 'papan_klip.salin',
    kategori: 'papan_klip',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'teks', tipe: 'teks', wajib: true, deskripsi: 'Teks yang akan disalin ke clipboard' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Menyalin teks ke clipboard perangkat sistem.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().salinTeks(arg?.teks ?? (typeof arg === 'string' ? arg : '')),
    eksekusiSinkron: (arg: any) => {
      const teks = arg?.teks ?? (typeof arg === 'string' ? arg : '');
      void PapanKlipMobile.salin(teks);
      return buatHasilSukses({ teks, tersalin: true });
    },
  });

  registri.daftarkan({
    nama: 'papan_klip.tempel',
    kategori: 'papan_klip',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Membaca teks dari clipboard perangkat pengguna.',
    eksekusi: async () => dapatkanAdaptorPlatformAktif().tempelTeks(),
    eksekusiSinkron: () => buatHasilSukses({ teks: PapanKlipMobile.ambilTeksSinkron() }),
  });

  // 13. SHARE SHEET (Share API)
  registri.daftarkan({
    nama: 'bagikan.konten',
    kategori: 'bagikan',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'judul', tipe: 'teks', wajib: false, deskripsi: 'Judul konten berbagi' },
      { nama: 'teks', tipe: 'teks', wajib: false, deskripsi: 'Pesan teks atau deskripsi yang dibagikan' },
      { nama: 'url', tipe: 'teks', wajib: false, deskripsi: 'Tautan URL yang dibagikan' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.DIBATALKAN_PENGGUNA],
    dokumentasi: 'Membuka dialog share sheet bawaan sistem operasi Android atau iOS.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().bagikan(arg || {}),
    eksekusiSinkron: (arg: any) => {
      void BerbagiMobile.bagikan(arg || {});
      return buatHasilSukses({ sukses: true, data: arg || {} });
    },
  });

  // 14. PENYIMPANAN AMAN (Secure Storage API)
  registri.daftarkan({
    nama: 'simpan_aman.tulis',
    kategori: 'simpan_aman',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'kunci', tipe: 'teks', wajib: true, deskripsi: 'Kunci identifikasi data' },
      { nama: 'nilai', tipe: 'teks', wajib: true, deskripsi: 'Nilai rahasia (token, kredensial, sandi)' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [KodeGalatNative.ENKRIPSI_GAGAL],
    dokumentasi: 'Menyimpan nilai sensitif dengan enkripsi hardware Keystore / Keychain.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().simpanAman(arg?.kunci || '', arg?.nilai || ''),
    eksekusiSinkron: (arg: any) => adaptorSimFallback()?.simpanAmanSinkron(arg?.kunci || '', arg?.nilai || '') ?? buatHasilGagal('Adaptor sinkron tidak tersedia.', KodeGalatNative.TIDAK_DIDUKUNG),
  });

  registri.daftarkan({
    nama: 'simpan_aman.baca',
    kategori: 'simpan_aman',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'kunci', tipe: 'teks', wajib: true, deskripsi: 'Kunci data yang dicari' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Mengambil dan mendekripsi nilai sensitif yang tersimpan dengan aman.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().ambilAman(arg?.kunci ?? (typeof arg === 'string' ? arg : '')),
    eksekusiSinkron: (arg: any) => adaptorSimFallback()?.ambilAmanSinkron(arg?.kunci ?? (typeof arg === 'string' ? arg : '')) ?? buatHasilGagal('Adaptor sinkron tidak tersedia.', KodeGalatNative.TIDAK_DIDUKUNG),
  });

  registri.daftarkan({
    nama: 'simpan_aman.hapus',
    kategori: 'simpan_aman',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'kunci', tipe: 'teks', wajib: true, deskripsi: 'Kunci data yang akan dihapus' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Menghapus nilai sensitif dari penyimpanan terenkripsi.',
    eksekusi: async (arg: any) => dapatkanAdaptorPlatformAktif().hapusAman(arg?.kunci ?? (typeof arg === 'string' ? arg : '')),
    eksekusiSinkron: (arg: any) => adaptorSimFallback()?.hapusAmanSinkron(arg?.kunci ?? (typeof arg === 'string' ? arg : '')) ?? buatHasilGagal('Adaptor sinkron tidak tersedia.', KodeGalatNative.TIDAK_DIDUKUNG),
  });

  // 15. HAPTIK & GETARAN (Haptic API)
  registri.daftarkan({
    nama: 'haptik.getar',
    kategori: 'haptik',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'durasiMs', tipe: 'bilangan', wajib: false, deskripsi: 'Durasi getaran dalam ms', nilaiBawaan: 200 },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Memicu getaran fisik singkat pada perangkat ponsel.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().getar(arg?.durasiMs || Number(arg) || 200),
    eksekusiSinkron: (arg?: any) => adaptorSimFallback()?.getarSinkron(arg?.durasiMs || Number(arg) || 200) ?? buatHasilSukses({ durasiMs: 200 }),
  });

  registri.daftarkan({
    nama: 'haptik.pola',
    kategori: 'haptik',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [
      { nama: 'pola', tipe: 'teks', wajib: false, deskripsi: 'Jenis umpan balik (ringan, sedang, berat, sukses, peringatan, gagal)', nilaiBawaan: 'sukses' },
    ],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Memicu respons umpan balik haptik spesifik sistem operasi.',
    eksekusi: async (arg?: any) => dapatkanAdaptorPlatformAktif().haptik(arg?.pola || (typeof arg === 'string' ? arg : 'sukses')),
    eksekusiSinkron: (arg?: any) => adaptorSimFallback()?.haptikSinkron(arg?.pola || (typeof arg === 'string' ? arg : 'sukses')) ?? buatHasilSukses({ pola: 'sukses' }),
  });

  // 16. SIKLUS HIDUP APLIKASI (Application Lifecycle API)
  registri.daftarkan({
    nama: 'lifecycle.status',
    kategori: 'lifecycle',
    platform: ['android', 'ios', 'simulator'],
    versiMinOS: { android: 24, ios: '14.0' },
    izin: [],
    status: 'didukung',
    parameter: [],
    tipeHasil: 'peta',
    kemungkinanError: [],
    dokumentasi: 'Mendapatkan status siklus hidup aplikasi (aktif, jeda, resume, berhenti).',
    eksekusi: async () => {
      const konteks = KonteksAplikasiMobile.dapatkanKonteks();
      return buatHasilSukses({
        status: konteks.lifecycle.dapatkanStatus(),
        apakahAktif: konteks.lifecycle.apakahAktif(),
      });
    },
    eksekusiSinkron: () => {
      const konteks = KonteksAplikasiMobile.dapatkanKonteks();
      return buatHasilSukses({
        status: konteks.lifecycle.dapatkanStatus(),
        apakahAktif: konteks.lifecycle.apakahAktif(),
      });
    },
  });
}
