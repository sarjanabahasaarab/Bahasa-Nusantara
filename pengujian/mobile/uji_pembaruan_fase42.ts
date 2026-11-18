/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Berkas Pengujian Komprehensif: Mobile App Update System & Over-the-Air Updates (OTA)
 * Target Versi: v0.42.0
 */

import {
  VersionChecker,
  UpdatePolicyManager,
  UpdateChannelManager,
  CompatibilityManager,
  ManifestValidator,
  ManifestParser,
  HashValidator,
  TrustManager,
  SignatureVerifier,
  UpdateSecurityPolicy,
  IntegrityValidator,
  DownloadManager,
  ActivationManager,
  RollbackManager,
  UpdateStateManager,
  UpdateHistoryManager,
  GooglePlayInAppUpdate,
  AppleAppStoreUpdate,
  UpdateRegistry,
  UpdateReportGenerator,
  UpdateManager,
  ManifestPembaruan,
} from '../../src/mobile/updates';
import * as http from 'http';
import { MobileCLI } from '../../src/mobile/cli/mobile_cli';
import { Lexer } from '../../src/lexer/lexer';
import { Parser } from '../../src/parser/parser';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { PembacaBerkasMemori, ResolverModul, PemuatModul } from '../../src/modul';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>) {
  totalUji++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          ujiBerhasil++;
          console.log(`  ✓ [LULUS] ${nama}`);
        })
        .catch((err) => {
          ujiGagal++;
          console.error(`  ✗ [GAGAL] ${nama}:`, err.message || err);
        });
    } else {
      ujiBerhasil++;
      console.log(`  ✓ [LULUS] ${nama}`);
      return Promise.resolve();
    }
  } catch (err: any) {
    ujiGagal++;
    console.error(`  ✗ [GAGAL] ${nama}:`, err.message || err);
    return Promise.resolve();
  }
}

function tegas(kondisi: boolean, pesan: string) {
  if (!kondisi) {
    throw new Error(`Penegasan Gagal: ${pesan}`);
  }
}

async function jalankanSemuaPengujian() {
  console.log('\n======================================================================');
  console.log('  PENGUJIAN RESMI NUSANTARA PHASE 42 - MOBILE UPDATE & OTA (v0.42.0)');
  console.log('======================================================================\n');

  // --- 1. VersionChecker & SemVer ---
  console.log('[KELOMPOK 1] VersionChecker & Semantic Versioning');
  await uji('Urai SemVer valid, prerelease, dan build metadata', () => {
    const s1 = VersionChecker.uraiSemver('1.2.3');
    tegas(s1 !== null && s1.major === 1 && s1.minor === 2 && s1.patch === 3, 'SemVer standard gagal');

    const s2 = VersionChecker.uraiSemver('v2.0.0-beta.1+build.42');
    tegas(s2 !== null && s2.major === 2 && s2.prerelease === 'beta.1', 'SemVer v-prefix & prerelease gagal');

    const sInvalid = VersionChecker.uraiSemver('invalid.ver.sion');
    tegas(sInvalid === null, 'SemVer tidak valid harus null');
  });

  await uji('Bandingkan SemVer (Mayor, Minor, Patch, Prerelease)', () => {
    tegas(VersionChecker.bandingkan('1.0.0', '1.0.0') === 0, 'Sama harus 0');
    tegas(VersionChecker.bandingkan('1.0.1', '1.0.0') === 1, 'Patch lebih tinggi harus 1');
    tegas(VersionChecker.bandingkan('1.0.0', '1.1.0') === -1, 'Minor lebih rendah harus -1');
    tegas(VersionChecker.bandingkan('2.0.0', '1.9.9') === 1, 'Mayor lebih tinggi harus 1');
    tegas(VersionChecker.bandingkan('1.0.0', '1.0.0-beta') === 1, 'Release harus lebih tinggi dari prerelease');
  });

  await uji('Evaluasi batas versi minimum (apakahMemenuhiMinimum)', () => {
    tegas(VersionChecker.apakahMemenuhiMinimum('1.2.0', '1.0.0') === true, '1.2.0 memenuhi min 1.0.0');
    tegas(VersionChecker.apakahMemenuhiMinimum('0.9.5', '1.0.0') === false, '0.9.5 tidak memenuhi min 1.0.0');
    tegas(VersionChecker.isBelowMinimum('0.9.5', '1.0.0') === true, 'isBelowMinimum harus true');
    tegas(VersionChecker.diff('1.0.0', '1.1.0') === 'minor', 'diff minor harus tepat');
  });

  // --- 2. Manifest Schema & Security Validation ---
  console.log('\n[KELOMPOK 2] Manifest Parser, Schema & Security Validator');
  const validManifest: ManifestPembaruan = {
    schemaVersion: 1,
    applicationId: 'id.nusantara.demo',
    platform: 'android',
    channel: 'stable',
    releaseVersion: '0.42.0',
    minimumSupportedVersion: '0.40.0',
    updateType: 'ota_resource',
    policy: 'disarankan',
    releaseDate: '2026-11-03T00:00:00.000Z',
    revision: 1,
    releaseNotes: { id: 'Catatan rilis OTA Bahasa Indonesia' },
    resources: [
      {
        id: 'tema-gelap',
        tipe: 'theme',
        jalurRelatif: 'assets/themes/garuda_dark.json',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        ukuranByte: 4096,
      },
    ],
  };

  await uji('Validasi skema manifest standar (LULUS)', () => {
    const hasil = ManifestValidator.validasi(validManifest);
    tegas(hasil.valid, `Manifest harus valid: ${hasil.pesanGalat.join(', ')}`);
  });

  await uji('Tolak manifest dengan applicationId tidak valid', () => {
    const rusak = { ...validManifest, applicationId: 'invalid_app_id' };
    const hasil = ManifestValidator.validasi(rusak);
    tegas(!hasil.valid, 'Application ID tanpa format reverse-DNS harus ditolak');
  });

  await uji('Pertahanan Keamanan: Tolak ekstensi terlarang (.dex, .so, .apk)', () => {
    const exploitManifest: ManifestPembaruan = {
      ...validManifest,
      resources: [
        {
          id: 'payload-bahaya',
          tipe: 'content',
          jalurRelatif: 'assets/payload.dex',
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          ukuranByte: 1024,
        },
      ],
    };
    const hasil = ManifestValidator.validasi(exploitManifest);
    tegas(!hasil.valid, 'File executable .dex harus ditolak oleh validator manifest');
  });

  await uji('Pertahanan Keamanan: Deteksi dan tolak Path Traversal (../)', () => {
    tegas(UpdateSecurityPolicy.apakahMengandungPathTraversal('../etc/passwd') === true, 'Path traversal ../ harus terdeteksi');
    tegas(UpdateSecurityPolicy.apakahMengandungPathTraversal('assets/themes/ok.json') === false, 'Path normal tidak boleh terdeteksi traversal');
  });

  // --- 3. Digital Signature & Trust Manager ---
  console.log('\n[KELOMPOK 3] Tanda Tangan Digital & Trust Manager');
  await uji('TrustManager memuat root keys dan menolak kunci tidak terdaftar', () => {
    const tm = TrustManager.dapatkanInstance();
    tegas(tm.apakahKunciDipercaya('nusantara-root-release-2026') === true, 'Root key 2026 harus dipercaya');
    tegas(tm.apakahKunciDipercaya('kunci-penyerang-palsu') === false, 'Kunci tidak terdaftar harus ditolak');
  });

  await uji('Pembuatan dan verifikasi Tanda Tangan Digital Kanonikal', () => {
    const signed = SignatureVerifier.tandaTangani(validManifest, 'nusantara-root-release-2026');
    tegas(signed.tandaTangan !== undefined, 'Tanda tangan harus ditambahkan ke manifest');

    const verif = SignatureVerifier.verifikasi(signed);
    tegas(verif.valid === true, `Verifikasi tanda tangan harus valid: ${verif.pesan}`);
  });

  await uji('Deteksi Pemalsuan Manifest (Tamper Detection)', () => {
    const signed = SignatureVerifier.tandaTangani(validManifest, 'nusantara-root-release-2026');
    // Palsukan isi manifest setelah ditandatangani
    const dipalsukan = { ...signed, releaseVersion: '0.99.0-hacked' };
    const verif = SignatureVerifier.verifikasi(dipalsukan);
    tegas(verif.valid === false, 'Manifest yang dimodifikasi setelah penandatanganan harus ditolak');
  });

  // --- 4. HashValidator & Integrity ---
  console.log('\n[KELOMPOK 4] HashValidator SHA-256 & Integritas Resource');
  await uji('HashValidator FIPS 180-4 SHA-256 menghasilkan digest yang tepat', () => {
    const digest = HashValidator.sha256Teks('nusantara');
    tegas(typeof digest === 'string' && digest.length === 64, 'SHA-256 digest harus 64 karakter hex');
  });

  await uji('Integritas resource: Verifikasi file cocok vs rusak', () => {
    const kontenAsli = '{"tema": "garuda-dark", "warna": "#0f172a"}';
    const hashAsli = HashValidator.sha256Teks(kontenAsli);

    const hasilValid = IntegrityValidator.verifikasiKonten(
      'assets/themes/garuda.json',
      kontenAsli,
      hashAsli,
      kontenAsli.length
    );
    tegas(hasilValid.valid === true, 'Resource dengan hash cocok harus valid');

    const hasilRusak = IntegrityValidator.verifikasiKonten(
      'assets/themes/garuda.json',
      kontenAsli + ' TAMBAHAN RUSAK',
      hashAsli,
      kontenAsli.length
    );
    tegas(hasilRusak.valid === false, 'Resource dengan hash berbeda harus ditolak');
  });

  // --- 5. Activation & Rollback ---
  console.log('\n[KELOMPOK 5] Atomic Activation & Rollback Manager');
  await uji('Aktivasi resource OTA secara aman dengan pencadangan', () => {
    const am = ActivationManager.dapatkanInstance();
    const hasil = am.aktifkanResource(
      '0.42.0',
      [
        {
          id: 'garuda-theme',
          tipe: 'theme',
          jalurRelatif: 'assets/themes/garuda.json',
          sha256: 'abc123hash',
          ukuranByte: 1024,
        },
      ],
      'android'
    );
    tegas(hasil.sukses === true, 'Aktivasi resource harus berhasil');
    tegas(hasil.versiAktif === '0.42.0', 'Versi aktif harus berubah ke 0.42.0');
  });

  await uji('Rollback resource memulihkan versi sebelumnya', () => {
    const rm = RollbackManager.dapatkanInstance();
    const res = rm.eksekusiRollback('android');
    tegas(res.sukses === true, `Rollback harus berhasil: ${res.pesan}`);
  });

  // --- 6. Store Updates Bridges ---
  console.log('\n[KELOMPOK 6] Integrasi Toko Aplikasi (Google Play & Apple App Store)');
  await uji('Google Play In-App Updates simulasi ketersediaan dan mode', () => {
    const st = GooglePlayInAppUpdate.periksaKetersediaan('id.nusantara.demo', 100, 102);
    tegas(st.tersedia === true, 'Pembaruan Play Store harus terdeteksi');
    tegas(st.flexibleAllowed === true && st.immediateAllowed === true, 'Kedua mode harus diizinkan');
  });

  await uji('Apple App Store Update bridge menghasilkan deep link resmi', () => {
    const st = AppleAppStoreUpdate.periksaKetersediaan('id.nusantara.demo', '1.0.0', '1.1.0');
    tegas(st.tersedia === true, 'Pembaruan App Store harus terdeteksi');
    tegas(st.appStoreUrl.startsWith('https://apps.apple.com/app/'), 'URL App Store resmi harus dihasilkan');
  });

  // --- 7. UpdateManager Facade & Laporan ---
  console.log('\n[KELOMPOK 7] UpdateManager Facade & Laporan');
  await uji('UpdateManager memeriksa versi dan menghasilkan laporan Markdown', () => {
    const um = UpdateManager.dapatkanInstance();
    um.konfigurasiAplikasi('id.nusantara.demo', '0.41.0', 'android');

    const lap = um.buatLaporan();
    tegas(lap.applicationId === 'id.nusantara.demo', 'Laporan applicationId harus sesuai');

    const md = UpdateReportGenerator.formatKeMarkdown(lap);
    tegas(md.includes('# LAPORAN PEMBARUAN APLIKASI & OTA (NUSANTARA)'), 'Markdown header harus ada');
    tegas(md.includes('id.nusantara.demo'), 'Markdown harus mencantumkan ID aplikasi');
  });

  // --- 8. Mobile CLI Dispatcher ---
  console.log('\n[KELOMPOK 8] CLI Dispatcher: nusantara mobile update');
  await uji('CLI update versi & periksa', () => {
    const exit1 = MobileCLI.jalankan(['update', 'versi']);
    tegas(exit1 === 0, 'CLI update versi harus exit 0');

    const exit2 = MobileCLI.jalankan(['update', 'periksa']);
    tegas(exit2 === 0, 'CLI update periksa harus exit 0');
  });

  await uji('CLI update channel & store', () => {
    const exit1 = MobileCLI.jalankan(['update', 'channel', 'beta']);
    tegas(exit1 === 0, 'CLI update channel beta harus exit 0');

    const exit2 = MobileCLI.jalankan(['update', 'store']);
    tegas(exit2 === 0, 'CLI update store harus exit 0');
  });

  await uji('CLI update laporan & history', () => {
    const exit1 = MobileCLI.jalankan(['update', 'laporan']);
    tegas(exit1 === 0, 'CLI update laporan harus exit 0');

    const exit2 = MobileCLI.jalankan(['update', 'history']);
    tegas(exit2 === 0, 'CLI update history harus exit 0');
  });

  // --- 9. Standard Library std:mobile Integration ---
  console.log('\n[KELOMPOK 9] Eksekusi Program .nusantara dengan std:mobile');
  await uji('Program .nusantara memanggil periksaPembaruanMobile & dapatkanStatusPembaruanMobile', () => {
    const kodeNusantara = `
gunakan "std:mobile" sebagai seluler

program UjiPembaruanMobile
mulai
    status : peta = seluler.dapatkanStatusPembaruanMobile()
    tampilkan("Status Pembaruan Awal:", status["status"])

    hasil : peta = seluler.periksaPembaruanMobile("id.nusantara.aplikasi", "0.41.0", "android")
    tampilkan("Ada Pembaruan?", hasil["adaPembaruan"])
    tampilkan("Versi Terbaru:", hasil["versiTerbaru"])

    rb : peta = seluler.rollbackPembaruanResourceMobile("android")
    tampilkan("Hasil Rollback Sukses?", rb["sukses"])
selesai
`;
    const bufferOutput = new PenulisOutputBuffer();
    const interpreter = new Interpreter(bufferOutput);
    interpreter.jalankanKode(kodeNusantara);

    const logs = bufferOutput.dapatkanSeluruhTeks().join('\n');
    tegas(logs.includes('Ada Pembaruan?'), 'Harus mencetak status pembaruan');
    tegas(logs.includes('Hasil Rollback Sukses?'), 'Harus mencetak hasil rollback');
  });

  // --- 10. Real Asymmetric Ed25519 & Live Loopback HTTP OTA Integration ---
  console.log('\n[KELOMPOK 10] Kriptografi Ed25519 Nyata & Unduhan OTA Server HTTP Loopback');
  await uji('Ed25519 asimetris nyata (PKCS#8 & SPKI PEM) menandatangani, memverifikasi, dan menolak pemalsuan', () => {
    const { kunciPublikPem, kunciPrivatPem, fingerprintHex } = SignatureVerifier.buatPasanganKunciEd25519();
    const attackerKeys = SignatureVerifier.buatPasanganKunciEd25519();

    const tm = TrustManager.dapatkanInstance();
    const keyId = 'nusantara-ed25519-live-test-2026';
    tm.daftarkanKunci({
      keyId,
      algoritma: 'Ed25519',
      kunciPublikHex: fingerprintHex,
      kunciPublikPem,
      deskripsi: 'Ed25519 Ephemeral Test Public Key',
      tanggalDibuat: new Date().toISOString(),
      aktif: true,
    });

    const signed = SignatureVerifier.tandaTangani(validManifest, keyId, kunciPrivatPem, 'Ed25519');
    const ok = SignatureVerifier.verifikasi(signed);
    tegas(ok.valid === true, `Ed25519 PEM verification must succeed: ${ok.pesan}`);
    tegas(ok.modeKripto === 'ASYMMETRIC_PEM_CRYPTO', `Expected ASYMMETRIC_PEM_CRYPTO, got ${ok.modeKripto}`);

    const forged = SignatureVerifier.tandaTangani(validManifest, keyId, attackerKeys.kunciPrivatPem, 'Ed25519');
    const bad = SignatureVerifier.verifikasi(forged);
    tegas(bad.valid === false, 'Signature signed with attacker private key must be rejected');
  });

  await uji('Unduhan manifest & payload OTA penuh melalui server HTTP loopback nyata + aktivasi & rollback', async () => {
    const { kunciPublikPem, kunciPrivatPem, fingerprintHex } = SignatureVerifier.buatPasanganKunciEd25519();
    const keyId = 'nusantara-ota-http-ed25519-2026';
    TrustManager.dapatkanInstance().daftarkanKunci({
      keyId,
      algoritma: 'Ed25519',
      kunciPublikHex: fingerprintHex,
      kunciPublikPem,
      deskripsi: 'Loopback HTTP OTA Test Key',
      tanggalDibuat: new Date().toISOString(),
      aktif: true,
    });

    const payloadBytes = new TextEncoder().encode(JSON.stringify({
      tema: 'Garuda v2 Loopback',
      primer: '#dc2626',
      aksen: '#facc15',
    }));
    const payloadSha = HashValidator.hitungSHA256(payloadBytes);
    let serveCorrupted = false;
    let baseUrl = '';

    const server = http.createServer((req, res) => {
      if (req.url === '/manifest.json') {
        const raw: ManifestPembaruan = {
          schemaVersion: 1,
          applicationId: 'id.nusantara.ota.live',
          platform: 'android',
          channel: 'stable',
          releaseVersion: '0.42.5',
          minimumSupportedVersion: '0.40.0',
          updateType: 'ota_resource',
          policy: 'disarankan',
          releaseDate: new Date().toISOString(),
          revision: 5,
          releaseNotes: { id: 'Rilis OTA HTTP loopback nyata' },
          resources: [
            {
              id: 'tema-garuda-v2',
              tipe: 'theme',
              jalurRelatif: 'assets/themes/garuda_v2.json',
              url: `${baseUrl}/assets/themes/garuda_v2.json`,
              sha256: payloadSha,
              ukuranByte: payloadBytes.byteLength,
            },
          ],
        };
        const signed = SignatureVerifier.tandaTangani(raw, keyId, kunciPrivatPem, 'Ed25519');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(signed));
        return;
      }

      if (req.url === '/assets/themes/garuda_v2.json') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        if (serveCorrupted) {
          res.end('CORRUPTED_TAMPERED_PAYLOAD_BYTES');
        } else {
          res.end(Buffer.from(payloadBytes));
        }
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;

    try {
      const um = UpdateManager.dapatkanInstance();
      um.konfigurasiAplikasi('id.nusantara.ota.live', '0.42.0', 'android');

      const cek = await um.periksaPembaruanJarakJauh(`${baseUrl}/manifest.json`);
      tegas(cek.sukses === true, `Remote HTTP manifest check failed: ${cek.pesan}`);
      tegas(cek.signatureValid === true, 'Remote Ed25519 signature must validate');
      tegas(Boolean(cek.manifest), 'Remote manifest must be returned');

      // 1. Uji penolakan payload rusak (SHA-256 mismatch atas HTTP)
      serveCorrupted = true;
      const gagalRusak = await um.terapkanManifestOTA(cek.manifest!);
      tegas(gagalRusak.sukses === false, 'Corrupted HTTP OTA payload must fail SHA-256 verification');

      // 2. Uji unduhan & aktivasi HTTP nyata yang valid
      serveCorrupted = false;
      const suksesOta = await um.terapkanManifestOTA(cek.manifest!);
      tegas(suksesOta.sukses === true, `Valid HTTP OTA activation failed: ${suksesOta.pesan}`);
      tegas(um.dapatkanVersiTerpasang() === '0.42.5', 'Installed version must update to 0.42.5');

      const aktif = ActivationManager.dapatkanInstance().bacaResource('assets/themes/garuda_v2.json');
      tegas(aktif instanceof Uint8Array && aktif.byteLength === payloadBytes.byteLength, 'Activated payload bytes must match HTTP response');

      // 3. Uji rollback ke versi sebelumnya & verifikasi pemulihan file/versi nyata
      const rb = um.rollbackResource();
      tegas(rb.sukses === true, `Rollback after live OTA failed: ${rb.pesan}`);
      tegas(um.dapatkanVersiTerpasang() === '0.42.0', `Expected version restored to 0.42.0, got ${um.dapatkanVersiTerpasang()}`);
      tegas(ActivationManager.dapatkanInstance().dapatkanVersiAktif() === '0.42.0', 'ActivationManager active version must be restored to 0.42.0');
      tegas(ActivationManager.dapatkanInstance().bacaResource('assets/themes/garuda_v2.json') === undefined, 'Rolled-back OTA resource must be removed');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // --- 11. Security Hardening, Anti-Downgrade/Replay, Expired Manifest & Health-Check Auto-Rollback ---
  console.log('\n[KELOMPOK 11] Audit Keamanan URL, Anti-Downgrade/Replay, Kedaluwarsa & Health-Check Auto-Rollback');
  await uji('UpdateSecurityPolicy menolak subdomain spoofing HTTP, kredensial tertanam, NUL byte & encoded traversal', () => {
    tegas(UpdateSecurityPolicy.validasiURL('http://localhost.evil.com/manifest.json').valid === false, 'Subdomain spoofing http://localhost.evil.com must be rejected');
    tegas(UpdateSecurityPolicy.validasiURL('https://user:pass@cdn.nusantara.id/m.json').valid === false, 'Embedded URL credentials must be rejected');
    tegas(UpdateSecurityPolicy.validasiURL('http://127.0.0.1:8080/m.json').valid === true, 'Loopback HTTP IP must remain allowed for local dev');
    tegas(UpdateSecurityPolicy.validasiURL('https://cdn.nusantara.id/m.json').valid === true, 'HTTPS CDN URL must be allowed');
    tegas(UpdateSecurityPolicy.periksaPathTraversal('assets/ok.json\0.txt').valid === false, 'NUL byte path must be rejected');
    tegas(UpdateSecurityPolicy.periksaPathTraversal('assets/%2e%2e/secret.json').valid === false, 'URL-encoded traversal %2e%2e must be rejected');
  });

  await uji('UpdateManager menolak applicationId berbeda, downgrade versi, replay revisi, dan manifest kedaluwarsa', async () => {
    const { kunciPublikPem, kunciPrivatPem, fingerprintHex } = SignatureVerifier.buatPasanganKunciEd25519();
    const keyId = 'nusantara-ota-hardening-2026';
    TrustManager.dapatkanInstance().daftarkanKunci({
      keyId,
      algoritma: 'Ed25519',
      kunciPublikHex: fingerprintHex,
      kunciPublikPem,
      deskripsi: 'Hardening Test Key',
      tanggalDibuat: new Date().toISOString(),
      aktif: true,
    });

    const content = Buffer.from(JSON.stringify({ ok: true }));
    const sha256 = HashValidator.hitungSHA256(content);
    let currentContent = content;

    const srv = http.createServer((req, res) => {
      if (req.url === '/res.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(currentContent);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
    const { port } = srv.address() as { port: number };
    const resUrl = `http://127.0.0.1:${port}/res.json`;

    try {
      const um = UpdateManager.dapatkanInstance();
      um.konfigurasiAplikasi('id.nusantara.secure', '1.2.0', 'android', 3);

      const baseManifest = (overrides: Partial<ManifestPembaruan>): ManifestPembaruan =>
        SignatureVerifier.tandaTangani(
          {
            schemaVersion: 1,
            applicationId: 'id.nusantara.secure',
            platform: 'android',
            channel: 'stable',
            releaseVersion: '1.3.0',
            minimumSupportedVersion: '1.0.0',
            updateType: 'ota_resource',
            policy: 'disarankan',
            releaseDate: new Date().toISOString(),
            revision: 1,
            releaseNotes: { id: 'Hardening test' },
            resources: [
              {
                id: 'cfg-main',
                tipe: 'config',
                jalurRelatif: 'config/app.json',
                url: resUrl,
                sha256,
                ukuranByte: content.byteLength,
              },
            ],
            ...overrides,
          },
          keyId,
          kunciPrivatPem,
          'Ed25519'
        );

      const wrongApp = await um.terapkanManifestOTA(baseManifest({ applicationId: 'id.penyerang.palsu' }));
      tegas(wrongApp.sukses === false, 'Mismatched applicationId must be rejected');

      const downgrade = await um.terapkanManifestOTA(baseManifest({ releaseVersion: '1.1.9' }));
      tegas(downgrade.sukses === false && downgrade.pesan.includes('anti-downgrade'), 'Downgrade to 1.1.9 must be rejected');

      const replay = await um.terapkanManifestOTA(baseManifest({ releaseVersion: '1.2.0', revision: 3 }));
      tegas(replay.sukses === false && replay.pesan.includes('anti-replay'), 'Same version & revision replay must be rejected');

      const expired = await um.terapkanManifestOTA(
        baseManifest({ releaseVersion: '1.3.0', expirationDate: '2020-01-01T00:00:00.000Z' })
      );
      tegas(expired.sukses === false, 'Expired manifest must be rejected by OTAResourceManager');

      // Test aktivasiDenganHealthCheck rollback otomatis saat health check gagal
      const unhealthy = await um.aktivasiDenganHealthCheck(
        baseManifest({ releaseVersion: '1.3.0', revision: 1 }),
        async () => {
          const aktif = ActivationManager.dapatkanInstance().bacaResource('config/app.json');
          tegas(aktif instanceof Uint8Array, 'Resource must be staged during health check');
          return false; // Simulasikan crash/kegagalan pasca-aktivasi
        }
      );
      tegas(unhealthy.sukses === false && unhealthy.rolledBack === true, 'Failed health check must trigger automatic rollback');
      tegas(um.dapatkanVersiTerpasang() === '1.2.0', `Expected version rolled back to 1.2.0, got ${um.dapatkanVersiTerpasang()}`);
      tegas(ActivationManager.dapatkanInstance().bacaResource('config/app.json') === undefined, 'Rolled-back config/app.json must be removed');
    } finally {
      await new Promise<void>((r) => srv.close(() => r()));
    }
  });

  // --- 12. Pra-CI Hardening: Key Revocation, Key Rotation, Interrupted OTA Download & Post-Rollback Replay Guard ---
  console.log('\n[KELOMPOK 12] Pencabutan Kunci, Rotasi Kunci Multi-Generasi, Unduhan Terputus & Anti-Replay Pasca-Rollback');
  await uji('TrustManager.cabutKunci menolak manifest bertanda tangan kunci dicabut & mendukung rotasi Ed25519 multi-generasi', async () => {
    const gen1 = SignatureVerifier.buatPasanganKunciEd25519();
    const gen2 = SignatureVerifier.buatPasanganKunciEd25519();
    const gen3 = SignatureVerifier.buatPasanganKunciEd25519();

    const k1 = 'nusantara-rotasi-gen1';
    const k2 = 'nusantara-rotasi-gen2';
    const k3 = 'nusantara-rotasi-gen3';
    const tm = TrustManager.dapatkanInstance();

    tm.daftarkanKunci({ keyId: k1, algoritma: 'Ed25519', kunciPublikHex: gen1.fingerprintHex, kunciPublikPem: gen1.kunciPublikPem, deskripsi: 'Gen 1', tanggalDibuat: new Date().toISOString(), aktif: true });
    tm.daftarkanKunci({ keyId: k2, algoritma: 'Ed25519', kunciPublikHex: gen2.fingerprintHex, kunciPublikPem: gen2.kunciPublikPem, deskripsi: 'Gen 2', tanggalDibuat: new Date().toISOString(), aktif: true });
    tm.daftarkanKunci({ keyId: k3, algoritma: 'Ed25519', kunciPublikHex: gen3.fingerprintHex, kunciPublikPem: gen3.kunciPublikPem, deskripsi: 'Gen 3', tanggalDibuat: new Date().toISOString(), aktif: true });

    const payload = Buffer.from(JSON.stringify({ gen: 'rotasi-test' }));
    const sha = HashValidator.hitungSHA256(payload);
    const srv = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
    });
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
    const { port } = srv.address() as { port: number };
    const url = `http://127.0.0.1:${port}/r.json`;

    try {
      const um = UpdateManager.dapatkanInstance();
      um.konfigurasiAplikasi('id.nusantara.rotasi', '1.9.0', 'android', 1);

      const mkManifest = (ver: string, rev: number, kid: string, priv: string): ManifestPembaruan =>
        SignatureVerifier.tandaTangani(
          {
            schemaVersion: 1,
            applicationId: 'id.nusantara.rotasi',
            platform: 'android',
            channel: 'stable',
            releaseVersion: ver,
            minimumSupportedVersion: '1.0.0',
            updateType: 'ota_resource',
            policy: 'disarankan',
            releaseDate: new Date().toISOString(),
            revision: rev,
            releaseNotes: { id: `Rilis ${ver}` },
            resources: [{ id: 'cfg', tipe: 'config', jalurRelatif: 'config/rot.json', url, sha256: sha, ukuranByte: payload.byteLength }],
          },
          kid,
          priv,
          'Ed25519'
        );

      // 1. Terapkan dengan generasi 1 -> sukses
      const mGen1 = mkManifest('2.0.0', 1, k1, gen1.kunciPrivatPem);
      const r1 = await um.terapkanManifestOTA(mGen1);
      tegas(r1.sukses === true, `Rilis Gen-1 harus berhasil: ${r1.pesan}`);

      // 2. Cabut Gen-1 -> verifikasi langsung & pembaruan memakai Gen-1 wajib ditolak
      tegas(tm.cabutKunci(k1) === true, 'cabutKunci harus mengembalikan true untuk kunci terdaftar');
      tegas(tm.apakahKunciDipercaya(k1) === false, 'Gen-1 yang dicabut tidak boleh dipercaya lagi');
      const mGen1AfterRevoke = mkManifest('2.0.1', 1, k1, gen1.kunciPrivatPem);
      const sigRevoked = SignatureVerifier.verifikasi(mGen1AfterRevoke);
      tegas(sigRevoked.valid === false && sigRevoked.alasan === 'UNTRUSTED_KEY_ID', 'SignatureVerifier wajib menolak kunci yang dicabut');
      const r1Blocked = await um.terapkanManifestOTA(mGen1AfterRevoke);
      tegas(r1Blocked.sukses === false, 'UpdateManager wajib menolak paket dari kunci Gen-1 yang dicabut');

      // 3. Terapkan rilis baru dengan Gen-2 pasca-rotasi -> sukses
      const r2 = await um.terapkanManifestOTA(mkManifest('2.1.0', 1, k2, gen2.kunciPrivatPem));
      tegas(r2.sukses === true && um.dapatkanVersiTerpasang() === '2.1.0', 'Rotasi ke Gen-2 harus berhasil');

      // 4. Rotasi berikutnya ke Gen-3 & pencabutan Gen-2 -> Gen-2 ditolak, Gen-3 sukses
      tegas(tm.cabutKunci(k2) === true, 'Gen-2 harus berhasil dicabut');
      const r2Blocked = await um.terapkanManifestOTA(mkManifest('2.2.0', 1, k2, gen2.kunciPrivatPem));
      tegas(r2Blocked.sukses === false, 'Kunci Gen-2 yang dicabut tidak boleh dipakai lagi');

      const r3 = await um.terapkanManifestOTA(mkManifest('2.2.0', 2, k3, gen3.kunciPrivatPem));
      tegas(r3.sukses === true && um.dapatkanVersiTerpasang() === '2.2.0', `Rotasi ke Gen-3 harus berhasil: ${r3.pesan}`);

      // 5. Health check gagal pada 2.3.0 -> rollback ke 2.2.0 rev 2 + blokir replay 2.2.0 rev <= 2 & downgrade 2.1.0
      const fail230 = await um.aktivasiDenganHealthCheck(
        mkManifest('2.3.0', 1, k3, gen3.kunciPrivatPem),
        () => false
      );
      tegas(fail230.sukses === false && fail230.rolledBack === true, 'Health check gagal harus memicu rollback ke 2.2.0');
      tegas(um.dapatkanVersiTerpasang() === '2.2.0', 'Versi pasca-rollback harus 2.2.0');

      const replayRev1 = await um.terapkanManifestOTA(mkManifest('2.2.0', 1, k3, gen3.kunciPrivatPem));
      tegas(replayRev1.sukses === false && replayRev1.pesan.includes('anti-replay'), 'Replay revisi 1 setelah rollback ke 2.2.0 (rev 2) wajib ditolak');

      const replayOldVer = await um.terapkanManifestOTA(mkManifest('2.1.0', 1, k3, gen3.kunciPrivatPem));
      tegas(replayOldVer.sukses === false && replayOldVer.pesan.includes('anti-downgrade'), 'Downgrade ke 2.1.0 setelah rollback ke 2.2.0 wajib ditolak');
    } finally {
      await new Promise<void>((r) => srv.close(() => r()));
    }
  });

  await uji('Penanganan koneksi HTTP OTA terputus di tengah transfer dan penolakan unduhan parsial tanpa merusak state aktif', async () => {
    const keys = SignatureVerifier.buatPasanganKunciEd25519();
    const kid = 'nusantara-ota-interrupted-2026';
    TrustManager.dapatkanInstance().daftarkanKunci({
      keyId: kid,
      algoritma: 'Ed25519',
      kunciPublikHex: keys.fingerprintHex,
      kunciPublikPem: keys.kunciPublikPem,
      deskripsi: 'Interrupted Transfer Key',
      tanggalDibuat: new Date().toISOString(),
      aktif: true,
    });

    const fullPayload = Buffer.from(JSON.stringify({ konfigurasi: 'utuh', baris: 'A'.repeat(2048) }));
    const fullSha = HashValidator.hitungSHA256(fullPayload);
    let mode: 'abort' | 'partial' = 'abort';

    const srv = http.createServer((req, res) => {
      if (mode === 'abort') {
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(fullPayload.byteLength),
        });
        res.write(fullPayload.subarray(0, 256));
        setTimeout(() => req.socket.destroy(), 10);
        return;
      }
      // Mode partial: akhiri respons hanya setengah tanpa mengirim sisa bytes
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(fullPayload.subarray(0, 512));
    });
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
    const { port } = srv.address() as { port: number };

    try {
      const um = UpdateManager.dapatkanInstance();
      um.konfigurasiAplikasi('id.nusantara.interrupted', '3.0.0', 'android', 1);

      // Siapkan state baseline v3.0.0
      ActivationManager.dapatkanInstance().aktifkanAtomik(
        '3.0.0',
        new Map([['config/stabil.json', JSON.stringify({ versi: '3.0.0', aman: true })]])
      );

      const mTarget = SignatureVerifier.tandaTangani(
        {
          schemaVersion: 1,
          applicationId: 'id.nusantara.interrupted',
          platform: 'android',
          channel: 'stable',
          releaseVersion: '3.1.0',
          minimumSupportedVersion: '3.0.0',
          updateType: 'ota_resource',
          policy: 'disarankan',
          releaseDate: new Date().toISOString(),
          revision: 1,
          releaseNotes: { id: 'Rilis uji putus jaringan' },
          resources: [
            {
              id: 'cfg-large',
              tipe: 'config',
              jalurRelatif: 'config/baru_rusak.json',
              url: `http://127.0.0.1:${port}/bundle.json`,
              sha256: fullSha,
              ukuranByte: fullPayload.byteLength,
            },
          ],
        },
        kid,
        keys.kunciPrivatPem,
        'Ed25519'
      );

      // A. Putus koneksi TCP mid-stream
      mode = 'abort';
      const abortRes = await um.terapkanManifestOTA(mTarget);
      tegas(abortRes.sukses === false, 'Unduhan HTTP yang terputus soket mid-stream wajib gagal');
      tegas(um.dapatkanStateManager().dapatkanStatus() === 'failed', `Status harus failed setelah putus, aktual=${um.dapatkanStateManager().dapatkanStatus()}`);
      tegas(um.dapatkanVersiTerpasang() === '3.0.0', 'Versi terpasang tidak boleh berubah pasca putus koneksi');
      tegas(ActivationManager.dapatkanInstance().bacaResource('config/baru_rusak.json') === undefined, 'Resource tidak lengkap tidak boleh diaktifkan');
      tegas(ActivationManager.dapatkanInstance().bacaResource('config/stabil.json') !== undefined, 'Resource stabil lama harus tetap utuh');

      // B. Unduhan parsial terpotong -> wajib ditolak IntegrityValidator
      mode = 'partial';
      const partialRes = await um.terapkanManifestOTA(mTarget);
      tegas(partialRes.sukses === false, 'Artefak OTA parsial (512B dari 2KB+) wajib ditolak');
      tegas(um.dapatkanVersiTerpasang() === '3.0.0', 'Versi terpasang tetap 3.0.0 pasca penolakan paket parsial');
      tegas(ActivationManager.dapatkanInstance().bacaResource('config/baru_rusak.json') === undefined, 'Paket parsial tidak boleh masuk ActivationManager');
    } finally {
      await new Promise<void>((r) => srv.close(() => r()));
    }
  });

  console.log('\n======================================================================');
  console.log(`  HASIL PENGUJIAN PHASE 42: ${ujiBerhasil} LULUS, ${ujiGagal} GAGAL (Total: ${totalUji})`);
  console.log('======================================================================\n');

  if (ujiGagal > 0) {
    process.exit(1);
  }
}

jalankanSemuaPengujian().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
