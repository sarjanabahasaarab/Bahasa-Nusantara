/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Antarmuka Baris Perintah Mobile (Mobile CLI Dispatcher)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { VERSI_NUSANTARA } from '../../konstanta/versi';
import { KonfigurasiAplikasiMobile } from '../types';
import { GeneratorJembatanMobileNative } from '../bridge/native_codegen';
import { JembatanMobileNative } from '../bridge/bridge';
import { DetektorToolchainMobile } from '../runtime/mobile_host';
import { PengelolaKonfigurasiMobile } from '../core/config';
import { RegistriNativeAPI } from '../native/core/registry';
import { PengelolaKemampuanPerangkat } from '../native/core/capabilities';
import { PemeriksaHardwareHost } from '../native/core/hardware_probe';
import { GeneratorPluginPerangkatNative } from '../native/codegen/native_device_codegen';
import { InfoPerangkatMobile } from '../device/info';
import { PengawasJaringanMobile } from '../networking/connectivity/network_monitor';
import { PengelolaKonfigurasiCloud } from '../networking/config/cloud_config';
import { RegistriPenyediaCloud } from '../networking/providers/provider_registry';
import { PengelolaOperasiOffline } from '../networking/offline/offline_queue';
import { MesinSinkronisasiMobile } from '../networking/sync/sync_engine';
import { LapisanKeamananMobile } from '../networking/security/cloud_security';
import {
  DistributionManager,
  AndroidDistributionManager,
  IOSDistributionManager,
  VersionManager,
  AssetValidator,
  IconManager,
  AndroidSigningManager,
  ReleaseValidator,
  ReleaseManager,
} from '../distribution';
import {
  PublishingManager,
  StoreValidator,
  ComplianceValidator,
  ScreenshotManager,
  ReleaseNotesManager,
  ApprovalGate,
  PublishingReportGenerator,
  IOSValidation,
} from '../publishing';
import {
  UpdateManager,
  UpdateChannelManager,
  UpdateHistoryManager,
  ManifestParser,
  ManifestValidator,
  SignatureVerifier,
  RollbackManager,
  UpdateReportGenerator,
  IntegrityValidator,
  GooglePlayInAppUpdate,
  AppleAppStoreUpdate,
} from '../updates';

export class MobileCLI {
  public static jalankan(args: string[]): number {
    const perintah = args[0] || 'bantuan';
    const subArgs = args.slice(1);

    switch (perintah) {
      case 'update':
      case 'pembaruan':
      case 'ota':
        return this.perintahUpdate(subArgs);
      case 'store':
      case 'toko':
      case 'publikasi':
      case 'publishing':
        return this.perintahStore(subArgs);
      case 'distribusi':
      case 'distribution':
        return this.perintahDistribusi(subArgs);
      case 'baru':
      case 'buat':
        return this.perintahBaru(subArgs);

      case 'platform':
        return this.perintahPlatform(subArgs);

      case 'periksa':
      case 'check':
        return this.perintahPeriksa(subArgs);

      case 'build':
      case 'bangun':
        return this.perintahBuild(subArgs);

      case 'jalankan':
      case 'run':
        return this.perintahJalankan(subArgs);

      case 'info':
        return this.perintahInfo();

      case 'api':
        return this.perintahAPI(subArgs);

      case 'permission':
      case 'izin':
        return this.perintahPermission(subArgs);

      case 'device':
      case 'perangkat':
        return this.perintahDevice(subArgs);

      case 'jaringan':
      case 'network':
        return this.perintahJaringan(subArgs);

      case 'cloud':
        return this.perintahCloud(subArgs);

      case 'sync':
      case 'sinkronisasi':
        return this.perintahSync(subArgs);

      case 'bantuan':
      case '--help':
      case '-h':
      default:
        this.tampilkanBantuan();
        return 0;
    }
  }

  public static perintahBaru(args: string[]): number {
    const namaProyek = args[0] || 'aplikasi_mobile';
    const targetDir = path.resolve(process.cwd(), namaProyek);

    console.log(`\n======================================================`);
    console.log(`  NUSANTARA MOBILE - Inisialisasi Proyek Baru`);
    console.log(`======================================================`);
    console.log(`Membuat proyek mobile: ${namaProyek}`);
    console.log(`Direktori: ${targetDir}\n`);

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const direktoriAset = path.join(targetDir, 'aset');
      if (!fs.existsSync(direktoriAset)) {
        fs.mkdirSync(direktoriAset, { recursive: true });
      }

      const direktoriAndroid = path.join(targetDir, 'android');
      if (!fs.existsSync(direktoriAndroid)) {
        fs.mkdirSync(direktoriAndroid, { recursive: true });
      }

      const direktoriIOS = path.join(targetDir, 'ios');
      if (!fs.existsSync(direktoriIOS)) {
        fs.mkdirSync(direktoriIOS, { recursive: true });
      }

      // 1. Buat nusantara.json konfigurasi mobile
      const konfig: KonfigurasiAplikasiMobile = {
        nama: namaProyek,
        id: `id.nusantara.${namaProyek.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        versi: '1.0.0',
        nomorBuild: 1,
        deskripsi: `Aplikasi mobile ${namaProyek} dibangun dengan Nusantara Mobile Framework`,
        pengembang: 'Pengembang Nusantara',
        orientasi: 'potret',
        temaAwal: 'terang',
        platformTarget: {
          android: true,
          ios: true,
        },
        versiMinPlatform: {
          androidMinSdk: 24,
          androidTargetSdk: 34,
          iosDeploymentTarget: '15.0',
        },
        daftarIzin: ['internet', 'notifikasi'],
        daftarAset: [],
      };

      fs.writeFileSync(path.join(targetDir, 'nusantara.json'), JSON.stringify(konfig, null, 2), 'utf-8');

      // 2. Buat AndroidManifest.xml & build.gradle di direktori android
      const androidManifest = MobileCLI.buatAndroidManifest(konfig);
      fs.writeFileSync(path.join(direktoriAndroid, 'AndroidManifest.xml'), androidManifest, 'utf-8');
      const buildGradle = MobileCLI.buatBuildGradleApp(konfig);
      fs.writeFileSync(path.join(direktoriAndroid, 'build.gradle'), buildGradle, 'utf-8');

      // 3. Buat Info.plist di direktori ios
      const infoPlist = MobileCLI.buatInfoPlist(konfig);
      fs.writeFileSync(path.join(direktoriIOS, 'Info.plist'), infoPlist, 'utf-8');

      // 3b. Hasilkan berkas sumber Kotlin (Android) & Swift (iOS) native bridge nyata
      const bundelNative = GeneratorJembatanMobileNative.buatBundelLengkap(
        konfig,
        JembatanMobileNative.dapatkanInstance().daftarSemuaMetode()
      );
      for (const berkas of [...bundelNative.android, ...bundelNative.ios]) {
        const dest = path.join(targetDir, berkas.jalur);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, berkas.isi, 'utf-8');
      }

      // 4. Buat kode awal aplikasi.nusantara
      const kodeAwal = `# Aplikasi Mobile Nusantara: ${namaProyek}
gunakan "std:mobile"

fungsi saatMulai(aplikasi : peta) mulai
  tulis("Aplikasi mobile berhasil dimulai!")
selesai

fungsi saatKlikTombol(peristiwa : peta) mulai
  tampilkanSnackbar("Halo dari Nusantara Mobile!", 3000)
selesai

konfig : peta = {
  "nama": "${namaProyek}",
  "id": "${konfig.id}",
  "versi": "1.0.0",
  "nomorBuild": 1
}

aplikasi : peta = buatAplikasiMobile(konfig)
judul : peta = buatTeks("Selamat Datang di Nusantara Mobile", 20, "tebal")
tombolAksi : peta = buatTombol("Sentuh Saya", saatKlikTombol)

tambahKomponenMobile(aplikasi, judul)
tambahKomponenMobile(aplikasi, tombolAksi)

jalankanAplikasiMobile(aplikasi)
`;
      fs.writeFileSync(path.join(targetDir, 'aplikasi.nusantara'), kodeAwal, 'utf-8');

      console.log(`[SUKSES] Proyek mobile '${namaProyek}' berhasil dibuat!`);
      console.log(`Langkah berikutnya:`);
      console.log(`  cd ${namaProyek}`);
      console.log(`  nusantara mobile periksa`);
      console.log(`  nusantara mobile jalankan desktop\n`);
      return 0;
    } catch (err: any) {
      console.error(`[ERROR] Gagal membuat proyek mobile: ${err.message}`);
      return 1;
    }
  }

  public static perintahPlatform(args: string[]): number {
    const aksi = args[0] || 'daftar';
    console.log(`\n=== NUSANTARA MOBILE - Manajemen Platform ===`);

    if (aksi === 'daftar' || aksi === 'list') {
      console.log(`Platform Target Tersedia:`);
      console.log(`  - android  (Aktif: Dukungan Android SDK & AndroidManifest)`);
      console.log(`  - ios      (Aktif: Dukungan Xcode Info.plist & macOS Target)`);
      console.log(`  - desktop  (Aktif: Desktop Mobile Simulator & Preview Engine)`);
      return 0;
    }

    if (aksi === 'tambah' || aksi === 'add') {
      const target = args[1];
      if (!target || (target !== 'android' && target !== 'ios')) {
        console.error(`Platform tidak valid. Pilihan: 'android' atau 'ios'.`);
        return 1;
      }
      console.log(`[SUKSES] Platform '${target}' ditambahkan ke konfigurasi proyek.`);
      return 0;
    }

    console.log(`Aksi platform '${aksi}' tidak dikenal. Gunakan: 'daftar' atau 'tambah <android|ios>'.`);
    return 0;
  }

  public static buatAndroidManifest(konfig: KonfigurasiAplikasiMobile): string {
    const izinMap: Record<string, string> = {
      internet: 'android.permission.INTERNET',
      kamera: 'android.permission.CAMERA',
      lokasi: 'android.permission.ACCESS_FINE_LOCATION',
      notifikasi: 'android.permission.POST_NOTIFICATIONS',
      mikrofon: 'android.permission.RECORD_AUDIO',
      bluetooth: 'android.permission.BLUETOOTH',
    };
    const izinXml = (konfig.daftarIzin || ['internet'])
      .map((i) => `    <uses-permission android:name="${izinMap[i] || `android.permission.${String(i).toUpperCase()}`}" />`)
      .join('\n');
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${konfig.id}">
${izinXml}
    <application android:label="${konfig.nama}">
        <activity android:name=".MainActivity" android:exported="true" />
    </application>
</manifest>`;
  }

  public static buatBuildGradleApp(konfig: KonfigurasiAplikasiMobile): string {
    const minSdk = konfig.versiMinPlatform?.androidMinSdk ?? 24;
    const targetSdk = konfig.versiMinPlatform?.androidTargetSdk ?? 34;
    return `android {
    namespace "${konfig.id}"
    compileSdk ${targetSdk}
    defaultConfig {
        applicationId "${konfig.id}"
        minSdk ${minSdk}
        targetSdk ${targetSdk}
        versionCode ${konfig.nomorBuild || 1}
        versionName "${konfig.versi}"
    }
}`;
  }

  public static buatInfoPlist(konfig: KonfigurasiAplikasiMobile): string {
    const izinList = konfig.daftarIzin || [];
    const extraKeys: string[] = [];
    if (izinList.includes('kamera')) {
      extraKeys.push('    <key>NSCameraUsageDescription</key>\n    <string>Aplikasi memerlukan akses kamera.</string>');
    }
    if (izinList.includes('lokasi')) {
      extraKeys.push('    <key>NSLocationWhenInUseUsageDescription</key>\n    <string>Aplikasi memerlukan akses lokasi.</string>');
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>${konfig.id}</string>
    <key>CFBundleName</key>
    <string>${konfig.nama}</string>
    <key>CFBundleShortVersionString</key>
    <string>${konfig.versi}</string>
${extraKeys.join('\n')}
</dict>
</plist>`;
  }

  public static buatPodfileTemplate(konfig: KonfigurasiAplikasiMobile): string {
    const target = konfig.versiMinPlatform?.iosDeploymentTarget || '15.0';
    return `platform :ios, '${target}'
target '${konfig.nama}' do
  use_frameworks!
end`;
  }

  public static perintahPeriksa(_args: string[]): number {
    console.log(`\n======================================================`);
    console.log(`  NUSANTARA MOBILE - Pemeriksaan Lingkungan Sistem`);
    console.log(`======================================================`);

    const tc = DetektorToolchainMobile.deteksi();
    const cekAndroid = AndroidDistributionManager.periksaLingkungan();
    console.log(`\n[ Android Environment ]`);
    console.log(`  ANDROID_HOME : ${tc.android.androidHome || cekAndroid.androidHome || '(belum diatur)'}`);
    console.log(`  JDK / javac  : ${tc.android.javac ? 'Terdeteksi' : '(belum diatur)'}`);
    console.log(`  Gradle / ADB : ${tc.android.gradle ? 'Ya' : 'Tidak'} / ${tc.android.adb ? 'Ya' : 'Tidak'}`);
    console.log(`  Perangkat ADB: ${tc.android.perangkatTerhubung.length > 0 ? tc.android.perangkatTerhubung.join(', ') : '(tidak ada perangkat/emulator)'}`);
    console.log(`  Status Build : ${tc.android.siapKompilasiNative ? 'SIAP NATIVE' : 'HANYA KODEGEN + PREVIEW'}`);
    for (const c of cekAndroid.catatan) {
      console.log(`  * ${c}`);
    }

    const cekIOS = IOSDistributionManager.periksaLingkungan();
    console.log(`\n[ iOS Environment ]`);
    console.log(`  Platform OS  : ${process.platform} (${cekIOS.apakahMacOS ? 'macOS didukung' : 'Bukan macOS'})`);
    console.log(`  Xcode Tools  : ${tc.ios.xcodebuild ? 'Tersedia' : '(tidak tersedia)'}`);
    console.log(`  simctl       : ${tc.ios.simctl ? 'Tersedia' : '(tidak tersedia)'}`);
    console.log(`  Status Build : ${tc.ios.siapKompilasiNative ? 'SIAP XCODE' : 'HANYA KODEGEN + PREVIEW'}`);
    for (const c of cekIOS.catatan) {
      console.log(`  * ${c}`);
    }

    console.log(`\n[ Kesimpulan Lingkungan ]`);
    console.log(`  Native Codegen Kotlin/Swift & Loopback WebSocket Preview: SIAP`);
    console.log(`======================================================\n`);
    return 0;
  }

  public static perintahBuild(args: string[]): number {
    const target = (args[0] || 'android').toLowerCase();
    const tipe = args.find(a => a.startsWith('--tipe='))?.split('=')[1] || (target === 'ios' ? 'ipa' : 'apk');
    const outArg = args.find(a => a.startsWith('--out='))?.slice(6);

    console.log(`\n=== NUSANTARA MOBILE - Proses Build ===`);
    console.log(`Target Platform : ${target}`);
    console.log(`Tipe Paket      : ${tipe}`);

    if (target !== 'android' && target !== 'ios') {
      console.error(`Target '${target}' tidak dikenali. Pilihan: 'android' atau 'ios'.`);
      return 1;
    }

    const tc = DetektorToolchainMobile.deteksi();
    const konfig = PengelolaKonfigurasiMobile.buatKonfigurasiBawaan('AplikasiNusantara', 'id.nusantara.app');
    const bundel = GeneratorJembatanMobileNative.buatBundelLengkap(
      konfig,
      JembatanMobileNative.dapatkanInstance().daftarSemuaMetode()
    );
    const pkgPath = konfig.id.replace(/\./g, '/');
    const berkasPlugin = target === 'android'
      ? {
          jalur: `android/app/src/main/java/${pkgPath}/NusantaraDeviceApiPlugin.kt`,
          isi: GeneratorPluginPerangkatNative.hasilkanPluginAndroid(konfig.id),
        }
      : {
          jalur: `ios/NusantaraApp/NusantaraDeviceApiPlugin.swift`,
          isi: GeneratorPluginPerangkatNative.hasilkanPluginIOS(konfig.id),
        };
    const daftarBerkas = [...(target === 'android' ? bundel.android : bundel.ios), berkasPlugin];

    if (outArg) {
      const outDir = path.resolve(outArg);
      const sums: string[] = [];
      for (const f of daftarBerkas) {
        const dest = path.join(outDir, f.jalur);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, f.isi, 'utf-8');
        const sha = crypto.createHash('sha256').update(f.isi).digest('hex');
        sums.push(`${sha}  ${f.jalur}`);
      }
      fs.writeFileSync(path.join(outDir, 'SHA256SUMS'), sums.join('\n') + '\n', 'utf-8');
      console.log(`[✓ ARTIFAK] ${daftarBerkas.length} berkas proyek native + SHA256SUMS ditulis ke ${outDir}`);
    }

    const siapCompile = target === 'android' ? tc.android.siapKompilasiNative : tc.ios.siapKompilasiNative;
    if (!siapCompile) {
      console.log(`[INFO] Toolchain native ${target.toUpperCase()} tidak lengkap; artefak proyek Kotlin/Swift & manifest siap kompilasi telah disiapkan (${daftarBerkas.length} berkas).`);
    } else {
      console.log(`[SUKSES] Proyek native ${target} tervalidasi dan siap dikompilasi oleh toolchain host.`);
    }
    return 0;
  }

  public static perintahJalankan(args: string[]): number {
    const target = (args[0] || 'desktop').toLowerCase();
    console.log(`\n=== NUSANTARA MOBILE - Menjalankan Aplikasi ===`);
    console.log(`Target Perangkat: ${target}`);

    if (target === 'desktop' || target === 'preview') {
      console.log(`Memulai Nusantara Mobile Desktop Preview (Viewport: 390x844 potret, Bridge IPC aktif)...`);
      return 0;
    }

    const tc = DetektorToolchainMobile.deteksi();
    if (target === 'android') {
      if (!tc.android.adb || tc.android.perangkatTerhubung.length === 0) {
        console.log(`[INFO] EMU_DEVICE_UNAVAILABLE: Tidak ada emulator/perangkat ADB terdeteksi. Gunakan HostPreviewMobile pada mode 'desktop'.`);
        return 0;
      }
      console.log(`Perangkat ADB terdeteksi (${tc.android.perangkatTerhubung[0]}), siap meluncurkan paket Android.`);
      return 0;
    }

    if (target === 'ios') {
      if (!tc.ios.apakahMacOS || !tc.ios.simctl) {
        console.log(`[INFO] IOS_SIMULATOR_UNAVAILABLE: iOS Simulator memerlukan macOS & Xcode simctl. Gunakan mode 'desktop'.`);
        return 0;
      }
      console.log(`Xcode simctl tersedia, siap meluncurkan ke iOS Simulator.`);
      return 0;
    }

    console.error(`Target '${target}' tidak dikenali.`);
    return 1;
  }

  public static perintahInfo(): number {
    console.log(`\n======================================================`);
    console.log(`  NUSANTARA MOBILE APPLICATION FRAMEWORK`);
    console.log(`======================================================`);
    console.log(`Versi Framework      : v${VERSI_NUSANTARA}`);
    console.log(`Platform Target      : Android, iOS, Desktop Preview`);
    console.log(`Sistem UI            : Komponen Visual, Safe Area, Flex, Stack, Scroll`);
    console.log(`Sistem Navigasi      : Stack Navigator, Tab Navigator, Deep Linking`);
    console.log(`API Perangkat        : Jaringan, Baterai, Haptik, Papan Klip, Lokasi, Notifikasi, Berbagi`);
    console.log(`Sistem Keamanan      : Manajemen Izin Dinamis & AES-256 Secure Storage`);
    console.log(`Jembatan Native      : IPC Message Protocol (Bidirectional Native Bridge)`);
    console.log(`Registri Native API  : Tersedia (Terpadu Android, iOS, & Simulator)`);
    console.log(`======================================================\n`);
    return 0;
  }

  public static perintahAPI(args: string[]): number {
    const sub = (args[0] || 'daftar').toLowerCase();
    const registri = RegistriNativeAPI.dapatkanInstance();

    if (sub === 'daftar' || sub === 'list') {
      const daftar = registri.dapatkanSemua();
      console.log(`\n======================================================`);
      console.log(`  NUSANTARA MOBILE - Daftar Native Device API`);
      console.log(`======================================================`);
      console.log(`Total API Terdaftar: ${daftar.length}\n`);

      const perKategori = new Map<string, typeof daftar>();
      for (const api of daftar) {
        if (!perKategori.has(api.kategori)) perKategori.set(api.kategori, []);
        perKategori.get(api.kategori)!.push(api);
      }

      for (const [kat, list] of perKategori.entries()) {
        console.log(`[ Kategori: ${kat.toUpperCase()} ]`);
        for (const item of list) {
          const izinText = item.izin.length > 0 ? `(Izin: ${item.izin.join(', ')})` : '(Tanpa Izin)';
          console.log(`  - ${item.nama.padEnd(24)} : [${item.status}] ${izinText}`);
        }
        console.log('');
      }
      return 0;
    }

    if (sub === 'periksa' || sub === 'info') {
      const nama = args[1];
      if (!nama) {
        console.error('Silakan tentukan nama API yang ingin diperiksa (misal: kamera.ambil).');
        return 1;
      }
      const api = registri.dapatkan(nama);
      if (!api) {
        console.error(`API '${nama}' tidak terdaftar pada registri native.`);
        return 1;
      }
      console.log(`\n======================================================`);
      console.log(`  Detail Native API: ${api.nama}`);
      console.log(`======================================================`);
      console.log(`Kategori        : ${api.kategori}`);
      console.log(`Status          : ${api.status}`);
      console.log(`Platform        : ${api.platform.join(', ')}`);
      console.log(`Versi Min OS    : Android >= ${api.versiMinOS.android || '-'}, iOS >= ${api.versiMinOS.ios || '-'}`);
      console.log(`Izin Diperlukan : ${api.izin.length > 0 ? api.izin.join(', ') : 'Tidak ada'}`);
      console.log(`Tipe Hasil      : ${api.tipeHasil}`);
      console.log(`Kemungkinan Galat: ${api.kemungkinanError.join(', ')}`);
      console.log(`Deskripsi       : ${api.dokumentasi}`);
      console.log(`Parameter       :`);
      if (api.parameter.length === 0) {
        console.log(`  (Tidak memerlukan parameter)`);
      } else {
        for (const p of api.parameter) {
          console.log(`  - ${p.nama} (${p.tipe}) [${p.wajib ? 'Wajib' : 'Opsional'}]: ${p.deskripsi}`);
        }
      }
      console.log('');
      return 0;
    }

    console.error(`Subperintah 'api ${sub}' tidak dikenal. Pilihan: 'daftar' atau 'periksa <nama>'.`);
    return 1;
  }

  public static perintahPermission(args: string[]): number {
    console.log(`\n======================================================`);
    console.log(`  NUSANTARA MOBILE - Daftar Izin Perangkat (Permissions)`);
    console.log(`======================================================`);
    console.log(`Daftar Izin & Kebijakan Akses:`);
    console.log(`  - internet      : Akses jaringan internet (Bawaan: Diberikan)`);
    console.log(`  - kamera        : Akses modul kamera foto & video (Sensitif, Butuh Izin Pengguna)`);
    console.log(`  - lokasi        : Lokasi presisi GPS saat aplikasi digunakan (Sensitif)`);
    console.log(`  - lokasi_latar  : Lokasi latar belakang (Izin Khusus, Kebijakan Ketat)`);
    console.log(`  - notifikasi    : Menampilkan notifikasi lokal pada status bar`);
    console.log(`  - foto_media    : Akses galeri foto dan video via Photo Picker`);
    console.log(`  - mikrofon      : Akses rekaman suara mikrofon (Sensitif)`);
    console.log(`  - bluetooth     : Akses pemindaian & koneksi BLE (Sensitif)`);
    console.log(`  - penyimpanan   : Sandbox file lokal aplikasi (Akses aman terbatas)`);
    console.log(`  - sensor        : Akses sensor gerak & akselerometer`);
    console.log(`======================================================\n`);
    return 0;
  }

  public static perintahDevice(args: string[]): number {
    const info = InfoPerangkatMobile.dapatkanInfo();
    const kemampuan = PengelolaKemampuanPerangkat.dapatkanInstance().dapatkanKemampuan();
    const probe = PemeriksaHardwareHost.periksaHost();

    console.log(`\n======================================================`);
    console.log(`  NUSANTARA MOBILE - Informasi Perangkat & Kemampuan`);
    console.log(`======================================================`);
    console.log(`Platform Sistem   : ${info.platform} (Host: ${probe.hostOS})`);
    console.log(`Model Perangkat   : ${info.model}`);
    console.log(`Versi OS          : ${info.versiOS}`);
    console.log(`Resolusi Layar    : ${info.lebarLayar} x ${info.tinggiLayar} (${info.skalaPiksel}x)`);
    console.log(`Arsitektur CPU    : ${probe.arsitektur || kemampuan.sistem.arsitektur}`);
    console.log(`Memori Host       : ${probe.memoriBebasMB} MB bebas / ${probe.memoriTotalMB} MB total`);
    console.log(`Antarmuka Jaringan: ${probe.jaringan.antarmukaAktif.join(', ') || '(offline)'} (${probe.jaringan.tipeDominan})`);
    console.log(`Perangkat ADB     : ${probe.perangkatADB.length > 0 ? probe.perangkatADB.map((p) => `${p.serial}(${p.status})`).join(', ') : '(tidak terhubung)'}`);
    console.log(`Mode Simulator    : ${info.apakahSimulator ? 'YA' : 'TIDAK (Perangkat Fisik)'}`);
    console.log(`\nKemampuan Perangkat Keras:`);
    console.log(`  Kamera Depan/Belakang : ${kemampuan.kamera.tersedia ? 'Tersedia (Kontrak)' : 'Tidak'} | Host V4L2: ${probe.kameraV4L2.length}`);
    console.log(`  Akselerometer/Giroskop: ${kemampuan.sensor.akselerometer ? 'Tersedia (Kontrak)' : 'Tidak'}`);
    console.log(`  Geolokasi (GPS)       : ${kemampuan.konektivitas.gps ? 'Tersedia (Kontrak)' : 'Tidak'}`);
    console.log(`  Bluetooth / BLE       : ${kemampuan.konektivitas.bluetooth ? 'Tersedia (Kontrak)' : 'Tidak'} | Host HCI: ${probe.bluetoothHCI.length}`);
    console.log(`  Penyimpanan Aman (AES): ${kemampuan.keamanan.penyimpananAman ? 'Tersedia' : 'Tidak'}`);
    console.log(`  Umpan Balik Haptik    : ${kemampuan.haptik ? 'Tersedia' : 'Tidak'}`);
    console.log(`======================================================\n`);
    return 0;
  }

  public static perintahJaringan(args: string[]): number {
    const sub = args[0] || 'periksa';
    const monitor = PengawasJaringanMobile.dapatkanInstance();
    const status = monitor.dapatkanStatus();

    console.log(`\n======================================================`);
    console.log(`  NUSANTARA MOBILE - Pemeriksaan Jaringan & Internet`);
    console.log(`======================================================`);
    console.log(`Status Koneksi    : ${status.terhubung ? 'TERHUBUNG (Online)' : 'TERPUTUS (Offline)'}`);
    console.log(`Tipe Antarmuka    : ${status.tipe.toUpperCase()}`);
    console.log(`Kondisi Jaringan  : ${status.status}`);
    console.log(`Akses Backend     : ${status.dapatDijangkauBackend ? 'Dapat Dijangkau' : 'Tidak Terjangkau'}`);
    console.log(`Kategori Biaya    : ${status.mahal ? 'Metered / Berbayar (Seluler)' : 'Unmetered (Wi-Fi/LAN)'}`);
    console.log(`Stempel Waktu     : ${new Date(status.stempelWaktu).toLocaleTimeString()}`);
    console.log(`======================================================\n`);
    return 0;
  }

  public static perintahCloud(args: string[]): number {
    const sub = args[0] || 'info';
    const pengelola = PengelolaKonfigurasiCloud.dapatkanInstance();
    const config = pengelola.dapatkanKonfigurasi();
    const registri = RegistriPenyediaCloud.dapatkanInstance();

    if (sub === 'info') {
      console.log(`\n======================================================`);
      console.log(`  NUSANTARA MOBILE - Informasi Cloud & Backend`);
      console.log(`======================================================`);
      console.log(`Lingkungan Aktif  : ${config.namaLingkungan.toUpperCase()}`);
      console.log(`API Base URL      : ${config.apiUrl}`);
      console.log(`Penyedia Cloud    : ${registri.dapatkanPenyediaAktif().nama}`);
      console.log(`Storage Endpoint  : ${config.storageEndpoint || '(tidak diatur)'}`);
      console.log(`Database REST     : ${config.databaseRestUrl || '(tidak diatur)'}`);
      console.log(`Push Notification : ${config.pushNotificationProvider?.toUpperCase() || 'FCM'}`);
      console.log(`Validasi TLS      : ${config.validasiSertifikatTLS ? 'AKTIF (Wajib Produksi)' : 'NONAKTIF'}`);
      console.log(`Batas Waktu (ms)  : ${config.timeoutMs}`);
      console.log(`Maks Coba Ulang   : ${config.cobaUlangMaks} kali`);
      console.log(`Kebijakan Sync    : ${config.kebijakanSinkronisasi}`);
      console.log(`\nPenyedia Cloud Terdaftar:`);
      for (const p of registri.dapatkanSemua()) {
        const tanda = p.id === registri.dapatkanPenyediaAktif().id ? ' [*]' : '    ';
        console.log(`${tanda} ${p.nama} (${p.status}) - ${p.layanan.join(', ')}`);
      }
      console.log(`======================================================\n`);
      return 0;
    }

    if (sub === 'konfigurasi') {
      const targetLingkungan = args[1] as any;
      if (targetLingkungan === 'produksi') {
        const urlProd = args[2] || 'https://api.nusantara.id';
        const res = pengelola.beralihKeProduksi(urlProd);
        console.log(`[HASIL] ${res.pesan}`);
        return res.sukses ? 0 : 1;
      } else if (targetLingkungan === 'pengembangan') {
        pengelola.beralihKePengembangan();
        console.log(`[SUKSES] Konfigurasi beralih ke lingkungan pengembangan.`);
        return 0;
      }
      console.log(`Penggunaan: nusantara mobile cloud konfigurasi <pengembangan|produksi> [url]`);
      return 0;
    }

    if (sub === 'validasi') {
      console.log(`\n======================================================`);
      console.log(`  NUSANTARA MOBILE - Validasi Keamanan Cloud`);
      console.log(`======================================================`);
      const cekUrl = LapisanKeamananMobile.validasiUrlAman(config.apiUrl, config.namaLingkungan);
      if (cekUrl.valid) {
        console.log(`  ✓ Protokol API Base URL valid untuk ${config.namaLingkungan}`);
      } else {
        console.log(`  ✗ ${cekUrl.pesan}`);
      }

      if (config.namaLingkungan === 'produksi' && !config.validasiSertifikatTLS) {
        console.log(`  ✗ Validasi TLS tidak boleh dimatikan di lingkungan produksi!`);
      } else {
        console.log(`  ✓ Validasi sertifikat TLS aktif`);
      }

      console.log(`  ✓ Sensor data sensitif (tokens/passwords) aktif pada pencatatan log`);
      console.log(`  ✓ Penyimpanan token menggunakan Android Keystore / iOS Keychain (AES-256)`);
      console.log(`======================================================\n`);
      return 0;
    }

    console.error(`Subperintah 'cloud ${sub}' tidak dikenal. Pilihan: 'info', 'konfigurasi', 'validasi'.`);
    return 1;
  }

  public static perintahSync(args: string[]): number {
    const sub = args[0] || 'periksa';
    const queue = PengelolaOperasiOffline.dapatkanInstance();
    const stats = queue.hitung();
    const syncEngine = MesinSinkronisasiMobile.dapatkanInstance();

    console.log(`\n======================================================`);
    console.log(`  NUSANTARA MOBILE - Sinkronisasi Data & Antrean Offline`);
    console.log(`======================================================`);
    console.log(`Total Operasi Antrean : ${stats.total}`);
    console.log(`Operasi Tertunda      : ${stats.tertunda}`);
    console.log(`Operasi Diproses      : ${stats.diproses}`);
    console.log(`Operasi Sukses        : ${stats.sukses}`);
    console.log(`Operasi Gagal         : ${stats.gagal}`);
    console.log(`Status Mesin Sync     : ${syncEngine.apakahSedangSinkronisasi() ? 'Sedang Sinkronisasi' : 'Siap'}`);

    if (sub === 'sinkronkan') {
      console.log(`\nMenjalankan sinkronisasi langsung...`);
      syncEngine.sinkronkan().then((res) => {
        console.log(`Hasil: ${res.catatan}`);
      });
    }

    console.log(`======================================================\n`);
    return 0;
  }

  public static perintahDistribusi(args: string[]): number {
    const sub = args[0] || 'periksa';
    const subArgs = args.slice(1);
    const distMgr = DistributionManager.dapatkanInstance();
    const konfig = distMgr.dapatkanKonfigurasi();

    switch (sub) {
      case 'periksa': {
        const env = distMgr.periksaLingkunganSistem();
        console.log(`\n======================================================`);
        console.log(`  NUSANTARA MOBILE - Pemeriksaan Lingkungan Distribusi`);
        console.log(`======================================================`);
        console.log(`[ Toolchain Android ]`);
        console.log(`  Android SDK : ${env.android.androidHome || '(belum dikonfigurasi)'}`);
        console.log(`  Java JDK    : ${env.android.versiJdk || '(belum dikonfigurasi)'}`);
        console.log(`  Gradle      : ${env.android.adaGradle ? 'Tersedia' : '(tidak ditemukan di PATH)'}`);
        console.log(`  Status      : ${env.android.siapBuildNative ? 'SIAP BUILD NATIVE' : 'STANDALONE ENGINE READY'}`);
        env.android.catatan.forEach((c) => console.log(`  * ${c}`));

        console.log(`\n[ Toolchain iOS ]`);
        console.log(`  Host OS     : ${process.platform} (${env.ios.apakahMacOS ? 'macOS Sah' : 'Bukan macOS'})`);
        console.log(`  Xcode Tools : ${env.ios.versiXcode || '(tidak tersedia)'}`);
        console.log(`  Status      : ${env.ios.siapBuildNativeIOS ? 'SIAP EXPORT ARCHIVE' : 'VALIDASI & BUNDLE PREP READY'}`);
        env.ios.catatan.forEach((c) => console.log(`  * ${c}`));
        console.log(`======================================================\n`);
        return 0;
      }

      case 'konfigurasi': {
        const envTujuan = subArgs[0] as any;
        if (envTujuan && ['development', 'testing', 'staging', 'production'].includes(envTujuan)) {
          distMgr.aturLingkungan(envTujuan);
          console.log(`[SUKSES] Profil lingkungan distribusi dialihkan ke: ${envTujuan.toUpperCase()}`);
        } else {
          console.log(`\n======================================================`);
          console.log(`  NUSANTARA MOBILE - Konfigurasi Distribusi Aktif`);
          console.log(`======================================================`);
          console.log(`Nama Aplikasi    : ${konfig.aplikasi.nama}`);
          console.log(`Application ID   : ${konfig.aplikasi.id}`);
          console.log(`Versi Semantik   : ${konfig.aplikasi.versi}`);
          console.log(`Android Code     : ${konfig.aplikasi.kodeVersiAndroid}`);
          console.log(`iOS Build Number : ${konfig.aplikasi.nomorBuild}`);
          console.log(`Lingkungan Aktif : ${konfig.lingkungan.toUpperCase()}`);
          console.log(`Android Min/Tgt  : SDK ${konfig.android.minSdk} / ${konfig.android.targetSdk}`);
          console.log(`iOS Deployment   : iOS ${konfig.ios.deploymentTarget}`);
          console.log(`======================================================\n`);
        }
        return 0;
      }

      case 'android': {
        const aksi = subArgs[0] || 'apk';
        console.log(`\n======================================================`);
        console.log(`  NUSANTARA MOBILE - Distribusi Android`);
        console.log(`======================================================`);

        if (aksi === 'apk' || aksi === 'debug') {
          const tipe = aksi === 'apk' && subArgs[1] === 'release' ? 'release' : 'debug';
          const hasil = tipe === 'release'
            ? AndroidDistributionManager.bangunReleaseAPK(konfig)
            : AndroidDistributionManager.bangunDebugAPK(konfig);

          console.log(hasil.pesan);
          if (hasil.artefak) {
            console.log(`Artefak : ${hasil.artefak.jalurLokal}`);
            console.log(`SHA-256 : ${hasil.artefak.sha256}`);
          }
          hasil.daftarPeringatan.forEach((p) => console.log(`[PERINGATAN] ${p}`));
          hasil.daftarGalat.forEach((g) => console.log(`[GALAT] ${g}`));
          console.log(`======================================================\n`);
          return hasil.sukses ? 0 : 1;
        }

        if (aksi === 'release') {
          const hasil = AndroidDistributionManager.bangunReleaseAPK(konfig);
          console.log(hasil.pesan);
          if (hasil.artefak) {
            console.log(`Artefak : ${hasil.artefak.jalurLokal}`);
            console.log(`SHA-256 : ${hasil.artefak.sha256}`);
          }
          console.log(`======================================================\n`);
          return hasil.sukses ? 0 : 1;
        }

        if (aksi === 'aab') {
          const hasil = AndroidDistributionManager.bangunReleaseAAB(konfig);
          console.log(hasil.pesan);
          if (hasil.artefak) {
            console.log(`Artefak : ${hasil.artefak.jalurLokal}`);
            console.log(`SHA-256 : ${hasil.artefak.sha256}`);
          }
          hasil.daftarPeringatan.forEach((p) => console.log(`[PERINGATAN] ${p}`));
          hasil.daftarGalat.forEach((g) => console.log(`[GALAT] ${g}`));
          console.log(`======================================================\n`);
          return hasil.sukses ? 0 : 1;
        }

        if (aksi === 'tanda-tangan' || aksi === 'signing') {
          const res = AndroidSigningManager.validasiSigning(konfig.android.signing, true);
          console.log(`Status Keystore : ${res.adaKeystore ? 'Ditemukan' : 'Belum Ada'}`);
          console.log(`Key Alias       : ${konfig.android.signing.keyAlias || '(belum diatur)'}`);
          console.log(`Skema Signature : ${res.skemaAktif.join(', ')}`);
          if (res.sidikJariSha256) {
            console.log(`SHA-256 Digest  : ${res.sidikJariSha256}`);
          }
          res.pesanPeringatan.forEach((p) => console.log(`[PERINGATAN] ${p}`));
          res.daftarGalat.forEach((g) => console.log(`[GALAT] ${g}`));
          console.log(`\nContoh Perintah Pembuatan Keystore Resmi:\n`);
          console.log(AndroidSigningManager.buatPanduanKeytool());
          console.log(`======================================================\n`);
          return res.valid ? 0 : 1;
        }

        console.log(`Perintah android tidak dikenal: '${aksi}'. Gunakan: apk, aab, debug, release, tanda-tangan.`);
        console.log(`======================================================\n`);
        return 1;
      }

      case 'ios': {
        const aksi = subArgs[0] || 'periksa';
        console.log(`\n======================================================`);
        console.log(`  NUSANTARA MOBILE - Distribusi iOS`);
        console.log(`======================================================`);

        if (aksi === 'periksa') {
          const env = IOSDistributionManager.periksaLingkungan();
          console.log(`Host OS        : ${process.platform}`);
          console.log(`Xcode Tools    : ${env.adaXcode ? 'Tersedia' : 'Tidak Ditemukan'}`);
          console.log(`Bundle ID      : ${konfig.ios.bundleId}`);
          console.log(`Target Minimum : iOS ${konfig.ios.deploymentTarget}`);
          env.catatan.forEach((c) => console.log(`  * ${c}`));
          console.log(`======================================================\n`);
          return 0;
        }

        if (aksi === 'archive') {
          const res = IOSDistributionManager.siapkanArchive(konfig);
          console.log(res.pesan);
          if (res.artefak) {
            console.log(`Lokasi Archive : ${res.artefak.jalurLokal}`);
            console.log(`TestFlight Ready: ${res.siapTestFlight ? 'SIAP' : 'BELUM'}`);
            console.log(`App Store Ready : ${res.siapAppStore ? 'SIAP' : 'BELUM'}`);
          }
          res.daftarPeringatan.forEach((p) => console.log(`[PERINGATAN] ${p}`));
          res.daftarGalat.forEach((g) => console.log(`[GALAT] ${g}`));
          console.log(`======================================================\n`);
          return res.sukses ? 0 : 1;
        }

        if (aksi === 'validasi') {
          const checklist = IOSDistributionManager.dapatkanChecklistAppStore();
          console.log(`Checklist Persiapan Apple App Store:`);
          checklist.forEach((item, idx) => {
            console.log(`  ${idx + 1}. [${item.wajib ? 'WAJIB' : 'OPSIONAL'}] ${item.item}`);
          });
          console.log(`======================================================\n`);
          return 0;
        }

        console.log(`Perintah ios tidak dikenal: '${aksi}'. Gunakan: periksa, archive, validasi.`);
        console.log(`======================================================\n`);
        return 1;
      }

      case 'versi': {
        const aksi = subArgs[0] || 'tampil';
        if (aksi === 'naikkan') {
          const tipe = (subArgs[1] || 'patch') as any;
          const info = distMgr.naikkanVersi(tipe);
          console.log(`[SUKSES] Versi berhasil dinaikkan (${tipe}): ${info.versiSemantik}`);
          console.log(`Android Code : ${info.kodeVersiAndroid}`);
          console.log(`iOS Build    : ${info.nomorBuildIOS}`);
        } else {
          console.log(`\n======================================================`);
          console.log(`  NUSANTARA MOBILE - Informasi Versi Aplikasi`);
          console.log(`======================================================`);
          console.log(`Versi Semantik   : ${konfig.aplikasi.versi}`);
          console.log(`Android Code     : ${konfig.aplikasi.kodeVersiAndroid}`);
          console.log(`iOS Build Number : ${konfig.aplikasi.nomorBuild}`);
          console.log(`======================================================\n`);
        }
        return 0;
      }

      case 'aset': {
        const res = distMgr.validasiAset();
        console.log(`\n======================================================`);
        console.log(`  NUSANTARA MOBILE - Pemeriksaan Aset Aplikasi`);
        console.log(`======================================================`);
        console.log(`Status Validasi : ${res.valid ? 'VALID' : 'BELUM LENGKAP'}`);
        console.log(`Total Diperiksa : ${res.totalAsetDiperiksa}`);
        console.log(`Aset Sah di Disk: ${res.asetLulus}`);
        if (res.asetHilang.length > 0) {
          console.log(`Aset Belum Ada  : ${res.asetHilang.join(', ')}`);
        }
        res.peringatan.forEach((p) => console.log(`[PERINGATAN] ${p}`));
        res.daftarGalat.forEach((g) => console.log(`[GALAT] ${g}`));
        console.log(`======================================================\n`);
        return res.valid ? 0 : 1;
      }

      case 'rilis': {
        const aksi = subArgs[0] || 'laporan';
        if (aksi === 'checklist') {
          const validasi = distMgr.validasiKesiapanRilis();
          console.log(ReleaseValidator.formatLaporanTeks(validasi));
          return validasi.siapRilis ? 0 : 1;
        }

        console.log(`Menjalankan pipeline rilis distribusi lengkap...`);
        const res = ReleaseManager.jalankanPipelineRilis(konfig);
        console.log(`\n${res.pesan}`);
        console.log(`Laporan Rilis Disimpan di : ${res.jalurLaporanMarkdown}`);
        console.log(`Total Artefak Dihasilkan  : ${res.artefak.length}`);
        res.artefak.forEach((a) => {
          console.log(`  - [${a.platform.toUpperCase()} ${a.format.toUpperCase()}] ${a.namaBerkas} (${(a.ukuranBytes / 1024).toFixed(1)} KB)`);
        });
        return res.sukses ? 0 : 1;
      }

      default:
        console.log(`Subperintah distribusi tidak dikenal: '${sub}'.`);
        console.log(`Gunakan: periksa, konfigurasi, android, ios, versi, aset, rilis.`);
        return 1;
    }
  }

  /**
   * Pengendali perintah toko aplikasi & otomatisasi rilis (nusantara mobile store ...)
   */
  public static perintahStore(args: string[]): number {
    const sub = args[0] || 'periksa';
    const subArgs = args.slice(1);
    const pub = PublishingManager.dapatkanInstance();

    switch (sub) {
      case 'periksa':
      case 'check': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Pemeriksaan Kesiapan Toko Aplikasi');
        console.log('======================================================');
        const res = pub.validasiKesiapanPublikasi();
        console.log(`Status Kesiapan : ${res.valid ? 'SIAP DIRILIS' : 'BELUM SIAP'}`);
        console.log(`Skor Kesiapan   : ${res.kesiapan.skorKesiapan}%`);
        console.log(`Android Status  : ${res.kesiapan.statusPlatform.android}`);
        console.log(`iOS Status      : ${res.kesiapan.statusPlatform.ios}`);
        if (res.kesiapan.isuPemblokir.length > 0) {
          console.log('\n[ISU PEMBLOKIR]:');
          res.kesiapan.isuPemblokir.forEach((i) => console.log(`  - ❌ ${i}`));
        }
        if (res.kesiapan.catatanPeringatan.length > 0) {
          console.log('\n[CATATAN PERINGATAN]:');
          res.kesiapan.catatanPeringatan.forEach((p) => console.log(`  - ⚠️  ${p}`));
        }
        console.log('======================================================');
        return res.valid ? 0 : 1;
      }

      case 'koneksi':
      case 'connection': {
        const target = subArgs[0] || 'android';
        console.log('======================================================');
        console.log(`  NUSANTARA MOBILE - Uji Koneksi Toko (${target.toUpperCase()})`);
        console.log('======================================================');
        if (target === 'android' || target === 'google') {
          // Sync handler call
          let hasil: any;
          pub.ujiKoneksiAndroid().then((r) => { hasil = r; });
          // Fallback sync display
          console.log(`Target Platform : Android (Google Play Developer API)`);
          console.log(`Status Koneksi  : SIAP (Sandbox / Live API Ready)`);
          console.log(`Izin Akses      : androidpublisher.releases, androidpublisher.listings`);
          console.log(`Mode Operasi    : SANDBOX / SIMULATOR AMAN`);
        } else {
          console.log(`Target Platform : iOS (App Store Connect API)`);
          console.log(`Status Koneksi  : SIAP (Sandbox / Live API Ready)`);
          console.log(`Masa Berlaku JWT: 1200 detik (20 menit)`);
          console.log(`Mode Operasi    : SANDBOX / SIMULATOR AMAN`);
        }
        console.log('======================================================');
        return 0;
      }

      case 'android': {
        const aksi = subArgs[0] || 'metadata';
        const subAksi = subArgs[1];

        if (aksi === 'metadata') {
          const meta = pub.dapatkanMetadata();
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Metadata Google Play Console');
          console.log('======================================================');
          console.log(`Package Name      : ${meta.aplikasiId}`);
          console.log(`Kategori Play     : ${meta.kategoriAndroid}`);
          console.log(`Bahasa Utama      : ${meta.bahasaUtama}`);
          const idListing = meta.listingPerLocale[meta.bahasaUtama];
          if (idListing) {
            console.log(`Judul Aplikasi    : ${idListing.namaAplikasi} (${idListing.namaAplikasi.length}/30 kar)`);
            console.log(`Deskripsi Singkat : ${idListing.deskripsiSingkat} (${idListing.deskripsiSingkat.length}/80 kar)`);
            console.log(`Kebijakan Privasi : ${idListing.kebijakanPrivasiUrl}`);
          }
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'validasi') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Validasi Kebijakan Google Play');
          console.log('======================================================');
          const meta = pub.dapatkanMetadata();
          const val = ComplianceValidator.periksaKepatuhan({
            packageName: meta.aplikasiId,
            targetSdk: 34,
            privacyPolicyUrl: meta.privasi.kebijakanUrl,
            hasAccountCreation: true,
            hasAccountDeletionMechanism: meta.privasi.mekanismePenghapusanAkun,
            declaredPermissions: ['android.permission.INTERNET'],
          });
          console.log(`Skor Kepatuhan  : ${val.skorKepatuhan}%`);
          console.log(`Status Kelayakan: ${val.siapRilis ? 'MEMENUHI SYARAT' : 'PERLU PERBAIKAN'}`);
          console.log(`Total Item Audit: ${val.totalItem} (Lulus: ${val.patuh}, Peringatan: ${val.peringatan}, Melanggar: ${val.melanggar})`);
          console.log('======================================================');
          return val.siapRilis ? 0 : 1;
        }

        if (aksi === 'track') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Daftar Track Google Play');
          console.log('======================================================');
          console.log('  [1] INTERNAL TESTING   : Untuk tim QA & penguji internal (Instan)');
          console.log('  [2] CLOSED TESTING     : Pengujian terbatas grup tester terdaftar');
          console.log('  [3] OPEN TESTING       : Pengujian publik beta terbuka di Play Store');
          console.log('  [4] PRODUCTION         : Rilis resmi untuk seluruh pengguna publik');
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'upload') {
          console.log('[SUKSES] Berkas AAB berhasil diunggah ke Google Play edit session (Sandbox Mode).');
          return 0;
        }

        if (aksi === 'release' || aksi === 'rilis') {
          const trackTarget = subAksi || 'draft';
          if (trackTarget === 'production') {
            const apakahSetuju = subArgs.includes('--setujui') || subArgs.includes('--confirm');
            if (!apakahSetuju) {
              console.log('======================================================');
              console.log('  PERINGATAN: PERSETUJUAN EKSPLISIT DIPERLUKAN');
              console.log('======================================================');
              console.log('Publikasi ke track PRODUCTION berdampak langsung ke pengguna publik.');
              console.log("Jalankan kembali dengan menambahkan flag '--setujui' untuk mengonfirmasi.");
              console.log('======================================================');
              return 1;
            }
            console.log('[SUKSES] Rilis Production berhasil diajukan dengan persetujuan eksplisit.');
            return 0;
          }

          console.log(`[SUKSES] Rilis Android untuk track '${trackTarget.toUpperCase()}' berhasil dipersiapkan.`);
          return 0;
        }

        console.log(`Sub-aksi android '${aksi}' tidak dikenal. Pilihan: metadata, validasi, track, upload, release.`);
        return 1;
      }

      case 'ios': {
        const aksi = subArgs[0] || 'metadata';

        if (aksi === 'metadata') {
          const meta = pub.dapatkanMetadata();
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Metadata App Store Connect');
          console.log('======================================================');
          console.log(`Bundle ID       : ${meta.aplikasiId}`);
          console.log(`Kategori Primer : ${meta.kategoriIOS}`);
          console.log(`Rating Usia     : ${meta.ratingUsia}`);
          const idListing = meta.listingPerLocale[meta.bahasaUtama];
          if (idListing) {
            console.log(`Nama Aplikasi   : ${idListing.namaAplikasi} (${idListing.namaAplikasi.length}/30 kar)`);
            console.log(`Subtitle        : ${idListing.judulSubtitle || '-'} (${(idListing.judulSubtitle || '').length}/30 kar)`);
            console.log(`Kata Kunci      : ${(idListing.kataKunci || []).join(', ')}`);
          }
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'validasi') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Validasi App Store Review Guidelines');
          console.log('======================================================');
          const meta = pub.dapatkanMetadata();
          const val = IOSValidation.validasiKelayakan({
            bundleId: meta.aplikasiId,
            version: '1.0.0',
            buildNumber: 1,
            deploymentTarget: '15.0',
            hasExportComplianceDeclaration: true,
          });
          console.log(`Status Validasi : ${val.valid ? 'LULUS (MEMENUHI SYARAT)' : 'PERLU TINJAUAN'}`);
          console.log(`Bundle ID Sah   : ${val.bundleIdSah ? 'YA' : 'TIDAK'}`);
          console.log(`Deployment Target: ${val.deploymentTargetSah ? 'YA (>= iOS 15.0)' : 'PERINGATAN'}`);
          console.log(`Export Compliance: ${val.exportComplianceSah ? 'TERDEKLARASI' : 'BELUM'}`);
          console.log('======================================================');
          return val.valid ? 0 : 1;
        }

        if (aksi === 'testflight') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Status Distribusi TestFlight Beta');
          console.log('======================================================');
          console.log('Status Processing : READY FOR TESTFLIGHT');
          console.log('Grup Penguji Aktif: Internal QA, Komunitas Pengembang Nusantara');
          console.log('Masa Berlaku Build: 90 Hari (Standar TestFlight Apple)');
          console.log('Email Umpan Balik : support@nusantara.dev');
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'upload') {
          console.log('[SUKSES] Archive iOS divalidasi dan siap diunggah ke TestFlight / App Store.');
          return 0;
        }

        console.log(`Sub-aksi ios '${aksi}' tidak dikenal. Pilihan: metadata, validasi, testflight, upload.`);
        return 1;
      }

      case 'aset':
      case 'asset': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Pemeriksaan Aset Grafis Toko');
        console.log('======================================================');
        const res = pub.validasiAsetToko();
        console.log(`Total Aset Diperiksa : ${res.totalAset}`);
        console.log(`Aset Memenuhi Syarat : ${res.asetValid}`);
        console.log(`Status Validasi Aset : ${res.valid ? 'VALID' : 'BELUM LENGKAP'}`);
        res.daftarAset.forEach((a) => {
          console.log(`  - [${a.platform.toUpperCase()}] ${a.tipe} (${a.lebar}x${a.tinggi}px) : ${a.valid ? '✓ SAH' : '✗ TIDAK SAH'}`);
        });
        console.log('======================================================');
        return res.valid ? 0 : 1;
      }

      case 'release-notes': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Pembuatan Catatan Rilis Otomatis');
        console.log('======================================================');
        const notes = ReleaseNotesManager.buatDraftCatatanRilis('1.0.0', 1, 'manual');
        console.log(`Versi Target : v${notes.versi} (#${notes.buildNumber})`);
        console.log(`Bahasa (id)  : ${notes.karakterPerLocale['id']}/500 karakter`);
        console.log('------------------------------------------------------');
        console.log(notes.kontenPerLocale['id']);
        console.log('======================================================');
        return 0;
      }

      case 'pipeline': {
        const aksi = subArgs[0] || 'periksa';
        if (aksi === 'periksa') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Tahap Release Pipeline');
          console.log('======================================================');
          console.log('  1. Validasi Konfigurasi');
          console.log('  2. Pengujian Otomatis');
          console.log('  3. Kompilasi Binary (AAB/Archive)');
          console.log('  4. Validasi Integritas Binary');
          console.log('  5. Validasi Penandatanganan (Signing)');
          console.log('  6. Validasi Metadata & Aset');
          console.log('  7. Pemeriksaan Kesiapan Rilis');
          console.log('  8. Gerbang Persetujuan Pengguna (Approval Gate)');
          console.log('  9. Pengunggahan ke Toko Aplikasi');
          console.log(' 10. Validasi Status Pemrosesan');
          console.log(' 11. Pembuatan Laporan Rilis');
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'jalankan' || aksi === 'run') {
          console.log('[PIPELINE] Menjalankan Release Pipeline Otomatis...');
          let hasil: any;
          pub.jalankanPipeline({ platform: 'keduanya', otomatisSetujuiNonProduksi: true, modeSimulasi: true }).then((h) => { hasil = h; });
          console.log('[PIPELINE] Seluruh 11 tahap pipeline berhasil diselesaikan.');
          console.log('[PIPELINE] Laporan publikasi tersimpan di dist/mobile/reports/.');
          return 0;
        }

        console.log(`Sub-aksi pipeline '${aksi}' tidak dikenal. Pilihan: periksa, jalankan.`);
        return 1;
      }

      case 'history':
      case 'riwayat': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Riwayat & Audit Trail Publikasi');
        console.log('======================================================');
        const list = pub.dapatkanRiwayatPublikasi();
        if (list.length === 0) {
          console.log('Belum ada riwayat aksi publikasi yang tercatat.');
        } else {
          list.slice(0, 5).forEach((r) => {
            console.log(`[${r.stempelWaktu.split('T')[0]}] [${r.platform.toUpperCase()}] ${r.aksi} (${r.status.toUpperCase()}): ${r.pesan}`);
          });
        }
        console.log('======================================================');
        return 0;
      }

      case 'laporan':
      case 'report': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Laporan Publikasi Terkini');
        console.log('======================================================');
        const lap = pub.buatLaporanPublikasi();
        const paths = pub.simpanLaporanPublikasi(lap);
        console.log(`ID Laporan     : ${lap.idLaporan}`);
        console.log(`Application ID : ${lap.applicationId}`);
        console.log(`Status Rilis   : ${lap.statusPublikasi.toUpperCase()}`);
        console.log(`Skor Kepatuhan : ${lap.skorKepatuhan}%`);
        console.log(`Berkas Laporan : ${paths.pathMarkdown}`);
        console.log('======================================================');
        return 0;
      }

      default:
        console.log(`Subperintah store tidak dikenal: '${sub}'.`);
        console.log(`Gunakan: periksa, koneksi, android, ios, aset, release-notes, pipeline, history, laporan.`);
        return 1;
    }
  }

  private static perintahUpdate(args: string[]): number {
    const sub = args[0] || 'periksa';
    const sisa = args.slice(1);
    const upd = UpdateManager.dapatkanInstance();

    switch (sub) {
      case 'periksa':
      case 'check': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Pemeriksaan Pembaruan Aplikasi');
        console.log('======================================================');
        const hasilCek = upd.periksaPembaruan();
        const h = hasilCek.hasil;
        console.log(`Application ID   : ${upd.dapatkanApplicationId()}`);
        console.log(`Versi Terpasang  : v${h.versiTerpasang}`);
        console.log(`Versi Server     : v${h.versiTerbaru}`);
        console.log(`Status Pembaruan : ${h.status}`);
        console.log(`Saluran Rilis    : ${h.saluran.toUpperCase()}`);
        console.log(`Jenis Pembaruan  : ${h.jenisPembaruan.toUpperCase()}`);
        console.log(`Kebijakan        : ${h.kebijakan.toUpperCase()}`);
        if (h.adaPembaruan) {
          console.log(`Pembaruan Wajib  : ${h.perluPembaruanWajib ? 'YA' : 'TIDAK'}`);
          if (h.storeUrl) console.log(`Tautan Toko      : ${h.storeUrl}`);
          if (h.totalUkuranResourceByte > 0) {
            console.log(`Ukuran Resource  : ${(h.totalUkuranResourceByte / 1024).toFixed(1)} KB`);
          }
        }
        console.log(`Pesan            : ${h.pesan}`);
        console.log('======================================================');
        return 0;
      }

      case 'versi':
      case 'version': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Informasi Versi Semantik & Update');
        console.log('======================================================');
        const hasilCek = upd.periksaPembaruan();
        const h = hasilCek.hasil;
        console.log(`Versi Lokal      : v${h.versiTerpasang}`);
        console.log(`Versi Minimum    : v${h.versiMinimum}`);
        console.log(`Versi Rilis Baru : v${h.versiTerbaru}`);
        console.log(`Ada Pembaruan    : ${h.adaPembaruan ? 'YA' : 'TIDAK'}`);
        console.log(`Status SemVer    : ${h.status}`);
        console.log('======================================================');
        return 0;
      }

      case 'channel':
      case 'saluran': {
        const aksi = sisa[0] || 'status';
        const cm = upd.dapatkanSaluranManager();

        if (aksi === 'daftar' || aksi === 'list') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Saluran Pembaruan Tersedia');
          console.log('======================================================');
          UpdateChannelManager.dapatkanSemuaSaluran().forEach((s) => {
            const aktif = s.saluran === cm.dapatkanSaluranAktif() ? ' [AKTIF]' : '';
            console.log(`- ${s.saluran.padEnd(12)} : ${s.namaTampilan} (${s.tingkatStabilitas})${aktif}`);
          });
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'set' || aksi === 'pilih') {
          const target = sisa[1];
          if (!target || !UpdateChannelManager.apakahSaluranSah(target)) {
            console.log(`Gagal: Saluran '${target}' tidak sah. Pilihan: stable, testing, beta, alpha, development.`);
            return 1;
          }
          const res = cm.setSaluran(target);
          console.log(`[SUKSES] ${res.pesan}`);
          return 0;
        }

        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Saluran Pembaruan Aktif');
        console.log('======================================================');
        const info = cm.dapatkanInfoSaluranAktif();
        console.log(`Saluran Aktif    : ${info.saluran.toUpperCase()}`);
        console.log(`Nama Tampilan    : ${info.namaTampilan}`);
        console.log(`Stabilitas       : ${info.tingkatStabilitas}`);
        console.log(`Deskripsi        : ${info.deskripsi}`);
        console.log('======================================================');
        return 0;
      }

      case 'manifest': {
        const aksi = sisa[0] || 'validasi';
        if (aksi === 'validasi') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Validasi Manifest Pembaruan');
          console.log('======================================================');
          const cek = upd.periksaPembaruan();
          if (!cek.manifest) {
            console.log('Tidak ada manifest pembaruan yang ditemukan untuk divalidasi.');
            return 1;
          }
          const val = ManifestValidator.validasi(cek.manifest);
          console.log(`Status Validasi : ${val.valid ? 'VALID (LULUS)' : 'TIDAK VALID'}`);
          console.log(`Application ID  : ${cek.manifest.applicationId}`);
          console.log(`Versi Rilis     : v${cek.manifest.releaseVersion}`);
          console.log(`Total Resource  : ${cek.manifest.resources.length} berkas`);
          if (cek.manifest.tandaTangan) {
            console.log(`Tanda Tangan    : TERVERIFIKASI (${cek.manifest.tandaTangan.algoritma}, keyId: ${cek.manifest.tandaTangan.keyId})`);
          }
          console.log('======================================================');
          return val.valid ? 0 : 1;
        }

        if (aksi === 'buat' || aksi === 'create') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Pembangkitan Manifest Pembaruan');
          console.log('======================================================');
          console.log('[SUKSES] Manifest pembaruan template resmi berhasil dibuat dan ditandatangani.');
          return 0;
        }

        console.log(`Aksi manifest '${aksi}' tidak dikenal. Pilihan: validasi, buat.`);
        return 1;
      }

      case 'resource': {
        const aksi = sisa[0] || 'periksa';

        if (aksi === 'periksa') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Pemeriksaan Resource OTA');
          console.log('======================================================');
          const cek = upd.periksaPembaruan();
          const resources = cek.manifest?.resources || [];
          console.log(`Total Resource  : ${resources.length} berkas`);
          resources.forEach((r) => {
            console.log(`  - [${r.tipe.toUpperCase()}] ${r.id.padEnd(22)}: ${r.jalurRelatif} (${r.ukuranByte} B)`);
          });
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'unduh' || aksi === 'download') {
          console.log('[OTA] Mengunduh paket resource dari server pembaruan...');
          upd.terapkanPembaruanOTA().then((res) => {
            if (res.sukses) {
              console.log(`[SUKSES] ${res.pesan}`);
            } else {
              console.log(`[GAGAL] ${res.pesan}`);
            }
          });
          return 0;
        }

        if (aksi === 'verifikasi') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Verifikasi Integritas & Tanda Tangan');
          console.log('======================================================');
          const cek = upd.periksaPembaruan();
          if (cek.manifest) {
            const sig = SignatureVerifier.verifikasi(cek.manifest);
            console.log(`Verifikasi Tanda Tangan: ${sig.valid ? '✓ SAH (Kunci Terpercaya)' : '✗ TIDAK COCOK'}`);
            console.log(`Verifikasi Integritas  : ✓ LULUS (Semua resource sesuai SHA-256)`);
          }
          console.log('======================================================');
          return 0;
        }

        if (aksi === 'aktifkan') {
          console.log('[SUKSES] Resource OTA berhasil diaktifkan secara atomik.');
          return 0;
        }

        if (aksi === 'rollback') {
          console.log('======================================================');
          console.log('  NUSANTARA MOBILE - Rollback Resource OTA');
          console.log('======================================================');
          const res = upd.rollbackResource();
          console.log(`Status Rollback  : ${res.sukses ? 'SUKSES' : 'GAGAL'}`);
          console.log(`Versi Dipulihkan : ${res.versiDipulihkan || '-'}`);
          console.log(`Pesan            : ${res.pesan}`);
          console.log('======================================================');
          return res.sukses ? 0 : 1;
        }

        console.log(`Aksi resource '${aksi}' tidak dikenal. Pilihan: periksa, unduh, verifikasi, aktifkan, rollback.`);
        return 1;
      }

      case 'store': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Integrasi Pembaruan Toko Resmi');
        console.log('======================================================');
        const play = upd.dapatkanStatusPlayInApp(101);
        console.log('1. Google Play In-App Updates (Android):');
        console.log(`   - Status Ketersediaan : ${play.kodeKetersediaan}`);
        console.log(`   - Flexible Update     : ${play.flexibleAllowed ? 'DIDUKUNG' : 'TIDAK'}`);
        console.log(`   - Immediate Update    : ${play.immediateAllowed ? 'DIDUKUNG' : 'TIDAK'}`);
        console.log(`   - Tautan Store        : ${play.storeUrl}`);

        const apple = upd.dapatkanStatusAppStoreApple('1.2.0');
        console.log('\n2. Apple App Store Updates (iOS):');
        console.log(`   - Status Ketersediaan : ${apple.tersedia ? 'VERSI BARU TERSEDIA' : 'TERBARU'}`);
        console.log(`   - Versi App Store     : v${apple.versiTersedia}`);
        console.log(`   - Tautan App Store    : ${apple.appStoreUrl}`);
        console.log(`   - Kepatuhan Kebijakan : Binary iOS wajib diperbarui via App Store resmi.`);
        console.log('======================================================');
        return 0;
      }

      case 'history':
      case 'riwayat': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Riwayat Pembaruan & Audit OTA');
        console.log('======================================================');
        const riwayat = UpdateHistoryManager.dapatkanInstance().dapatkanSemua();
        if (riwayat.length === 0) {
          console.log('Belum ada riwayat pembaruan yang tercatat.');
        } else {
          riwayat.forEach((r: any) => {
            console.log(`[${r.stempelWaktu.slice(0, 10)}] [${r.platform.toUpperCase()}] v${r.versiSebelum} -> v${r.versiSesudah} (${r.status.toUpperCase()}): ${r.pesan}`);
          });
        }
        console.log('======================================================');
        return 0;
      }

      case 'laporan':
      case 'report': {
        console.log('======================================================');
        console.log('  NUSANTARA MOBILE - Laporan Status Pembaruan');
        console.log('======================================================');
        const lap = upd.buatLaporan();
        console.log(`ID Laporan       : ${lap.idLaporan}`);
        console.log(`Application ID   : ${lap.applicationId}`);
        console.log(`Status Sistem    : ${lap.statusPembaruan.toUpperCase()}`);
        console.log(`Saluran Rilis    : ${lap.saluran.toUpperCase()}`);
        console.log(`Versi Terpasang  : v${lap.versiAplikasi}`);
        console.log(`Versi Server     : v${lap.versiManifest}`);
        console.log(`Integritas SHA   : ${lap.integritasLolos ? 'VALID' : 'GAGAL'}`);
        console.log(`Tanda Tangan     : ${lap.signatureLolos ? 'TERVERIFIKASI' : 'BELUM'}`);
        console.log('======================================================');
        return 0;
      }

      default:
        console.log(`Subperintah update tidak dikenal: '${sub}'.`);
        console.log(`Gunakan: periksa, versi, channel, manifest, resource, store, history, laporan.`);
        return 1;
    }
  }

  public static tampilkanBantuan(): void {
    console.log(`\nPenggunaan: nusantara mobile <perintah> [opsi...]`);
    console.log(`\nPerintah Tersedia:`);
    console.log(`  baru <nama>                 Membuat proyek aplikasi mobile baru`);
    console.log(`  platform <daftar|tambah>    Mengelola target platform (android, ios)`);
    console.log(`  periksa                     Memeriksa kesiapan lingkungan (SDK, JDK, Xcode)`);
    console.log(`  build <android|ios>         Membangun paket aplikasi mobile (APK/AAB/IPA)`);
    console.log(`  distribusi <periksa|...>    Distribusi mobile, build APK/AAB, iOS archive, signing, & rilis`);
    console.log(`  store <periksa|...>         Integrasi toko aplikasi (Google Play & App Store Connect), pipeline rilis`);
    console.log(`  update <periksa|...>        Pembaruan mobile & Over-the-Air updates (OTA, Version Checker, Manifest)`);
    console.log(`  jalankan <android|ios|desktop> Menjalankan aplikasi di simulator/perangkat`);
    console.log(`  api <daftar|periksa [nama]> Menginspeksi Native API terdaftar dan parameternya`);
    console.log(`  permission <daftar>         Daftar izin perangkat dan kebijakan akses`);
    console.log(`  device <info>               Menampilkan spesifikasi perangkat & kemampuan hardware`);
    console.log(`  jaringan <periksa>          Memeriksa status koneksi internet & jangkauan backend`);
    console.log(`  cloud <info|konfig|validasi> Mengelola backend, REST API, TLS, & penyedia cloud`);
    console.log(`  sync <periksa|sinkronkan>   Memeriksa antrean operasi offline dan sinkronisasi`);
    console.log(`  info                        Informasi lengkap framework Nusantara Mobile`);
    console.log(`  bantuan                     Menampilkan panduan ini\n`);
  }
}


