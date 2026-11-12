/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 38
 * Suite Pengujian Komprehensif: Integrasi Native API & Perangkat Mobile
 * Target Versi: v0.38.0
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  RegistriNativeAPI,
  PengelolaKemampuanPerangkat,
  PengirimPeristiwaNative,
  KodeGalatNative,
  AdaptorSimulatorMobile,
  AdaptorAndroidMobile,
  AdaptorIOSMobile,
  PemeriksaHardwareHost,
  GeneratorPluginPerangkatNative,
  dapatkanAdaptorPlatformAktif,
  tetapkanAdaptorPlatform,
} from '../../src/mobile/native';
import { KonteksAplikasiMobile } from '../../src/mobile/core/application_context';
import { MobileCLI } from '../../src/mobile/cli/mobile_cli';
import { Interpreter } from '../../src/interpreter/interpreter';
import { KATALOG_MODUL_STANDAR } from '../../src/stdlib';

let jumlahBerhasil = 0;
let jumlahGagal = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

async function uji(nama: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  [✓ LULUS] ${nama}`);
    jumlahBerhasil++;
  } catch (err: any) {
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`     Pesan Galat: ${err?.message || err}`);
    if (err?.stack) {
      console.error(`     Jejak Stack:\n${err.stack.split('\n').slice(1, 4).join('\n')}`);
    }
    jumlahGagal++;
  }
}

async function jalankanSemuaPengujianFase38(): Promise<void> {
  console.log('======================================================================');
  console.log('PENGUJIAN KOMPREHENSIF FASE 38: NUSANTARA MOBILE NATIVE API INTEGRATION');
  console.log('Target Versi Bahasa: v0.38.0 (Fase 38)');
  console.log('======================================================================');

  // 1. Registri Native API & Metadata
  console.log('\n[1] Registri Native API & Manajemen Metadata');

  await uji('1.1 Inisialisasi Registri & Kelengkapan API Terdaftar', () => {
    const registri = RegistriNativeAPI.dapatkanInstance();
    const semua = registri.dapatkanSemua();
    pastikan(semua.length >= 20, `Jumlah API terdaftar harus >= 20 (Ditemukan: ${semua.length})`);

    const daftarNama = semua.map((a) => a.nama);
    pastikan(daftarNama.includes('perangkat.info'), 'Harus menyertakan perangkat.info');
    pastikan(daftarNama.includes('kamera.ambil'), 'Harus menyertakan kamera.ambil');
    pastikan(daftarNama.includes('galeri.pilih_foto'), 'Harus menyertakan galeri.pilih_foto');
    pastikan(daftarNama.includes('lokasi.ambil'), 'Harus menyertakan lokasi.ambil');
    pastikan(daftarNama.includes('notifikasi.jadwal'), 'Harus menyertakan notifikasi.jadwal');
    pastikan(daftarNama.includes('sensor.akselerometer'), 'Harus menyertakan sensor.akselerometer');
    pastikan(daftarNama.includes('bluetooth.status'), 'Harus menyertakan bluetooth.status');
    pastikan(daftarNama.includes('baterai.info'), 'Harus menyertakan baterai.info');
    pastikan(daftarNama.includes('jaringan.status'), 'Harus menyertakan jaringan.status');
    pastikan(daftarNama.includes('simpan_aman.tulis'), 'Harus menyertakan simpan_aman.tulis');
    pastikan(daftarNama.includes('haptik.getar'), 'Harus menyertakan haptik.getar');
  });

  await uji('1.2 Pengambilan Metadata API & Filter Kategori', () => {
    const registri = RegistriNativeAPI.dapatkanInstance();
    const apiKamera = registri.dapatkan('kamera.ambil');
    pastikan(apiKamera !== undefined, 'Metadata kamera.ambil harus ditemukan');
    pastikan(apiKamera!.kategori === 'kamera', 'Kategori kamera.ambil harus kamera');
    pastikan(apiKamera!.izin.includes('kamera'), 'kamera.ambil harus membutuhkan izin kamera');

    const daftarSensor = registri.dapatkanBerdasarkanKategori('sensor');
    pastikan(daftarSensor.length >= 4, `Jumlah API sensor harus >= 4 (Ditemukan: ${daftarSensor.length})`);
  });

  // 2. Device Capability Manager
  console.log('\n[2] Pengelola Kemampuan Perangkat (Device Capability Manager)');

  await uji('2.1 Deteksi Fitur Hardware & OS', () => {
    const manager = PengelolaKemampuanPerangkat.dapatkanInstance();
    const kemampuan = manager.dapatkanKemampuan();

    pastikan(kemampuan.kamera.tersedia === true, 'Kamera harus terdeteksi');
    pastikan(kemampuan.sensor.akselerometer === true, 'Akselerometer harus terdeteksi');
    pastikan(kemampuan.konektivitas.wifi === true, 'WiFi harus terdeteksi');
    pastikan(kemampuan.keamanan.penyimpananAman === true, 'Secure storage harus terdeteksi');
    pastikan(kemampuan.sistem.arsitektur.length > 0, 'Arsitektur CPU harus terdeteksi');

    pastikan(manager.apakahMendukung('kamera.tersedia'), 'apakahMendukung kamera.tersedia');
    pastikan(manager.apakahMendukung('sensor.akselerometer'), 'apakahMendukung sensor.akselerometer');
    pastikan(!manager.apakahMendukung('fitur_fiktif.tidak_ada'), 'Fitur fiktif harus bernilai false');
  });

  // 3. Event Dispatcher Native
  console.log('\n[3] Pengirim Peristiwa Native (Native Event Dispatcher)');

  await uji('3.1 Mekanisme Langganan & Pengiriman Peristiwa', () => {
    const dispatcher = PengirimPeristiwaNative.dapatkanInstance();
    const diterima: any[] = [];

    const lepas = dispatcher.langganan('sensor.uji', (data) => {
      diterima.push(data);
    });

    dispatcher.kirim('sensor.uji', { nilai: 42 });
    dispatcher.kirim('sensor.uji', { nilai: 100 });
    pastikan(diterima.length === 2, 'Harus menerima 2 peristiwa');
    pastikan(diterima[0].nilai === 42 && diterima[1].nilai === 100, 'Payload peristiwa harus cocok');

    lepas();
    dispatcher.kirim('sensor.uji', { nilai: 200 });
    pastikan(diterima.length === 2, 'Setelah lepas langganan, peristiwa baru tidak boleh diterima');
  });

  // 4. Manajemen Perizinan & Penegakan Keamanan
  console.log('\n[4] Pengelola Perizinan & Penegakan Keamanan (Permission Enforcement)');

  await uji('4.1 Penegakan Izin pada Registri Native API', async () => {
    const registri = RegistriNativeAPI.dapatkanInstance();
    const konteks = KonteksAplikasiMobile.dapatkanKonteks();

    // 1. Cabut izin kamera
    konteks.pengelolaIzin.cabutIzin('kamera');
    pastikan(!konteks.pengelolaIzin.apakahDiberikan('kamera'), 'Izin kamera harus ditolak');

    // 2. Pemanggilan kamera.ambil harus gagal dengan status izin_ditolak
    const hasilDitolak = await registri.panggil('kamera.ambil');
    pastikan(!hasilDitolak.sukses, 'Operasi harus gagal saat izin ditolak');
    pastikan(hasilDitolak.status === 'izin_ditolak', 'Status hasil harus izin_ditolak');
    pastikan(hasilDitolak.kodeGalat === KodeGalatNative.IZIN_DITOLAK, 'Kode galat harus IZIN_DITOLAK');

    // 3. Berikan izin kembali
    konteks.pengelolaIzin.tetapkanStatusIzin('kamera', 'diberikan');
    const hasilDiizinkan = await registri.panggil('kamera.ambil');
    pastikan(hasilDiizinkan.sukses, 'Operasi harus sukses setelah izin diberikan');
    pastikan(hasilDiizinkan.data.uri.length > 0, 'Harus mengembalikan URI foto');
  });

  // 5. Adaptor Platform (Simulator, Android, iOS)
  console.log('\n[5] Adaptor Platform Native (Simulator, Android, iOS)');

  await uji('5.1 Eksekusi Adaptor Simulator Mobile', async () => {
    const sim = new AdaptorSimulatorMobile();
    const info = await sim.dapatkanInfoPerangkat();
    pastikan(info.sukses, 'Info perangkat simulator sukses');
    pastikan(info.data.tipePerangkat === 'simulator', 'Tipe perangkat simulator');

    const bat = await sim.dapatkanStatusBaterai();
    pastikan(bat.sukses && bat.data.level >= 0, 'Status baterai simulator valid');

    const lok = await sim.dapatkanLokasi();
    pastikan(lok.sukses && lok.data.latitude !== undefined, 'Koordinat lokasi simulator valid');
  });

  await uji('5.2 Eksekusi Adaptor Android Mobile', async () => {
    const android = new AdaptorAndroidMobile();
    const info = await android.dapatkanInfoPerangkat();
    pastikan(info.sukses, 'Info perangkat Android sukses');
    pastikan(info.data.platform === 'android', 'Platform harus android');
    pastikan(info.data.levelAPI === 34, 'Level API Android 34');

    const foto = await android.ambilFoto();
    pastikan(foto.sukses, 'Ambil foto Android sukses');
    pastikan(foto.data.kontrakAndroid.includes('TakePicture'), 'Menggunakan kontrak TakePicture');
  });

  await uji('5.3 Eksekusi Adaptor iOS Mobile', async () => {
    const ios = new AdaptorIOSMobile();
    const info = await ios.dapatkanInfoPerangkat();
    pastikan(info.sukses, 'Info perangkat iOS sukses');
    pastikan(info.data.platform === 'ios', 'Platform harus ios');
    pastikan(info.data.frameworks.includes('AVFoundation'), 'Framework iOS AVFoundation');

    const foto = await ios.ambilFoto();
    pastikan(foto.sukses, 'Ambil foto iOS sukses');
    pastikan(foto.data.format === 'image/heic', 'Format foto iOS HEIC');
  });

  // 6. Pengujian Layanan API Sensor, Audio, Berkas, dan Keamanan
  console.log('\n[6] Layanan Sensor, Audio, Sistem Berkas, dan Secure Storage');

  await uji('6.1 Pembacaan Multi-Sensor & Verifikasi Satuan', async () => {
    const registri = RegistriNativeAPI.dapatkanInstance();

    const resAcc = await registri.panggil('sensor.akselerometer');
    pastikan(resAcc.sukses && resAcc.data.y !== undefined, 'Akselerometer mengembalikan 3 sumbu');

    const resGyr = await registri.panggil('sensor.giroskop');
    pastikan(resGyr.sukses && resGyr.data.beta !== undefined, 'Giroskop mengembalikan laju rotasi');

    const resMag = await registri.panggil('sensor.magnetometer');
    pastikan(resMag.sukses && resMag.data.x !== undefined, 'Magnetometer mengembalikan medan geomagnetik');
  });

  await uji('6.2 Proteksi Anti-Path Traversal pada Sistem Berkas', async () => {
    const registri = RegistriNativeAPI.dapatkanInstance();

    // 1. Tulis berkas aman
    const resTulis = await registri.panggil('berkas.tulis', { jalur: 'data_aman.txt', konten: 'Halo Nusantara' });
    pastikan(resTulis.sukses, 'Penulisan berkas aman harus berhasil');

    // 2. Percobaan path traversal harus ditolak
    const resTraversal = await registri.panggil('berkas.baca', { jalur: '../../etc/passwd' });
    pastikan(!resTraversal.sukses, 'Percobaan path traversal harus gagal');
    pastikan(resTraversal.kodeGalat === KodeGalatNative.PATH_TIDAK_AMAN, 'Kode galat harus PATH_TIDAK_AMAN');
  });

  await uji('6.3 Penyimpanan Aman AES-256 (Keystore / Keychain)', async () => {
    const registri = RegistriNativeAPI.dapatkanInstance();

    const kunci = 'token_auth_fase38';
    const nilai = 'super_secret_jwt_token_2026';

    const simpan = await registri.panggil('simpan_aman.tulis', { kunci, nilai });
    pastikan(simpan.sukses, 'Penyimpanan aman harus berhasil');

    const baca = await registri.panggil('simpan_aman.baca', { kunci });
    pastikan(baca.sukses && baca.data.nilai === nilai, 'Dekripsi nilai aman harus cocok dengan aslinya');

    const hapus = await registri.panggil('simpan_aman.hapus', { kunci });
    pastikan(hapus.sukses, 'Penghapusan nilai aman harus berhasil');
  });

  // 7. CLI Nusantara Mobile Native Commands
  console.log('\n[7] Integrasi Subperintah CLI Nusantara Mobile');

  await uji('7.1 Eksekusi nusantara mobile api daftar', () => {
    const kode = MobileCLI.jalankan(['api', 'daftar']);
    pastikan(kode === 0, 'nusantara mobile api daftar harus sukses (exit code 0)');
  });

  await uji('7.2 Eksekusi nusantara mobile api periksa [nama]', () => {
    const kode = MobileCLI.jalankan(['api', 'periksa', 'kamera.ambil']);
    pastikan(kode === 0, 'nusantara mobile api periksa kamera.ambil harus sukses');
  });

  await uji('7.3 Eksekusi nusantara mobile permission daftar & device info', () => {
    const kodePerm = MobileCLI.jalankan(['permission', 'daftar']);
    pastikan(kodePerm === 0, 'nusantara mobile permission daftar harus sukses');

    const kodeDev = MobileCLI.jalankan(['device', 'info']);
    pastikan(kodeDev === 0, 'nusantara mobile device info harus sukses');
  });

  // 8. Integrasi Standard Library std:mobile & Program Nyata
  console.log('\n[8] Integrasi Standard Library & Eksekusi Contoh Nyata .nusantara');

  await uji('8.1 Simbol Ekspor std:mobile Menyertakan Native API Baru', () => {
    const modulMobile = KATALOG_MODUL_STANDAR['mobile'];
    pastikan(modulMobile !== undefined, 'Modul mobile harus terdaftar');
    pastikan(modulMobile.simbolEkspor.has('panggilNative'), 'Harus mengekspor panggilNative');
    pastikan(modulMobile.simbolEkspor.has('daftarNativeAPI'), 'Harus mengekspor daftarNativeAPI');
    pastikan(modulMobile.simbolEkspor.has('periksaNativeAPI'), 'Harus mengekspor periksaNativeAPI');
    pastikan(modulMobile.simbolEkspor.has('dapatkanKemampuanPerangkat'), 'Harus mengekspor dapatkanKemampuanPerangkat');
  });

  await uji('8.2 Eksekusi Skrip contoh/mobile/device_explorer/device_explorer.nusantara', async () => {
    const jalurBerkas = path.resolve(process.cwd(), 'contoh/mobile/device_explorer/device_explorer.nusantara');
    pastikan(fs.existsSync(jalurBerkas), 'Berkas device_explorer.nusantara harus ada');

    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');
    const interpreter = new Interpreter();
    await interpreter.jalankanKode(kodeSumber);
  });

  // 9. Probe Hardware Host Nyata, Sandbox Disk I/O, & Codegen Plugin Native
  console.log('\n[9] Probe Hardware Host Nyata, Disk Sandbox I/O, & Plugin Native');

  await uji('9.1 PemeriksaHardwareHost membaca telemetri OS & status ADB secara jujur', async () => {
    const probe = PemeriksaHardwareHost.periksaHost();
    pastikan(probe.nodeRuntime === true, 'Harus berjalan di Node runtime');
    pastikan(probe.arsitektur.length > 0, 'Arsitektur host harus terdeteksi');
    pastikan(probe.memoriTotalMB > 0, 'Memori total host harus > 0 MB');
    pastikan(probe.jaringan.sumber === 'OS_NETWORK_INTERFACES', 'Harus membaca interface jaringan OS nyata');
    pastikan(probe.jaringan.antarmukaAktif.length > 0, 'Harus mendeteksi setidaknya antarmuka loopback OS');

    const sim = new AdaptorSimulatorMobile();
    const info = await sim.dapatkanInfoPerangkat();
    pastikan(info.data.sumberData === 'HOST_OS_REAL', 'Info perangkat harus menyertakan provenance HOST_OS_REAL');
    const net = await sim.dapatkanStatusJaringan();
    pastikan(net.data.sumberData === 'OS_NETWORK_INTERFACES', 'Status jaringan harus berasal dari OS_NETWORK_INTERFACES');
  });

  await uji('9.2 Sistem Berkas Sandbox Disk Nyata (Tulis -> Baca -> Hapus & Anti-Traversal)', async () => {
    const tmpSandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-p38-sandbox-'));
    try {
      const adapter = new AdaptorSimulatorMobile(tmpSandbox);
      const konten = 'Data Persisten Nusantara Phase 38\nBaris 2';

      const w = await adapter.tulisBerkas('sub/catatan.txt', konten);
      pastikan(w.sukses && w.data.sumberData === 'DISK_SANDBOX_REAL', 'Harus menulis berkas nyata ke disk');
      pastikan(fs.existsSync(path.join(tmpSandbox, 'sub/catatan.txt')), 'Berkas fisik harus ada di disk');

      const r = await adapter.bacaBerkas('sub/catatan.txt');
      pastikan(r.sukses && r.data.konten === konten, 'Isi berkas bacaan disk harus identik');

      const d = await adapter.hapusBerkas('sub/catatan.txt');
      pastikan(d.sukses && d.data.terhapus === true, 'Berkas fisik harus terhapus');
      pastikan(!fs.existsSync(path.join(tmpSandbox, 'sub/catatan.txt')), 'Berkas harus hilang dari disk');

      const trav = await adapter.bacaBerkas('../rahasia.txt');
      pastikan(!trav.sukses && trav.kodeGalat === KodeGalatNative.PATH_TIDAK_AMAN, 'Traversal ../ harus ditolak');
      const absTrav = await adapter.tulisBerkas('/etc/shadow', 'x');
      pastikan(!absTrav.sukses && absTrav.kodeGalat === KodeGalatNative.PATH_TIDAK_AMAN, 'Path absolut harus ditolak');
    } finally {
      fs.rmSync(tmpSandbox, { recursive: true, force: true });
    }
  });

  await uji('9.3 Codegen Plugin Perangkat Kotlin Android & Swift iOS + Output CLI build', () => {
    const kt = GeneratorPluginPerangkatNative.hasilkanPluginAndroid('id.nusantara.uji38');
    pastikan(kt.includes('class NusantaraDeviceApiPlugin'), 'Harus menghasilkan kelas Kotlin NusantaraDeviceApiPlugin');
    pastikan(kt.includes('SensorManager') && kt.includes('BatteryManager') && kt.includes('ConnectivityManager'), 'Plugin Kotlin harus mengikat API Android nyata');
    pastikan(!kt.includes('${undefined'), 'Tidak boleh ada interpolasi rusak di template Kotlin');

    const swift = GeneratorPluginPerangkatNative.hasilkanPluginIOS('id.nusantara.uji38');
    pastikan(swift.includes('final class NusantaraDeviceApiPlugin'), 'Harus menghasilkan kelas Swift NusantaraDeviceApiPlugin');
    pastikan(swift.includes('CMMotionManager') && swift.includes('NWPathMonitor') && swift.includes('CLLocationManager'), 'Plugin Swift harus mengikat framework iOS nyata');

    const outTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-p38-build-'));
    try {
      const codeA = MobileCLI.jalankan(['build', 'android', `--out=${outTmp}/android`]);
      const codeI = MobileCLI.jalankan(['build', 'ios', `--out=${outTmp}/ios`]);
      pastikan(codeA === 0 && codeI === 0, 'CLI build android/ios harus sukses');
      pastikan(
        fs.existsSync(path.join(outTmp, 'android/android/app/src/main/java/id/nusantara/app/NusantaraDeviceApiPlugin.kt')),
        'CLI build android harus memancarkan NusantaraDeviceApiPlugin.kt'
      );
      pastikan(
        fs.existsSync(path.join(outTmp, 'ios/ios/NusantaraApp/NusantaraDeviceApiPlugin.swift')),
        'CLI build ios harus memancarkan NusantaraDeviceApiPlugin.swift'
      );
    } finally {
      fs.rmSync(outTmp, { recursive: true, force: true });
    }
  });

  // Ringkasan Akhir
  console.log('======================================================================');
  console.log(`HASIL PENGUJIAN FASE 38: ${jumlahBerhasil}/${jumlahBerhasil + jumlahGagal} LULUS`);
  if (jumlahGagal > 0) {
    console.error('Pengujian Fase 38 GAGAL!');
    process.exit(1);
  } else {
    console.log('Semua pengujian Fase 38 BERHASIL 100%!');
  }
}

jalankanSemuaPengujianFase38().catch((err) => {
  console.error('Kegagalan fatal saat menjalankan suite pengujian Fase 38:', err);
  process.exit(1);
});
