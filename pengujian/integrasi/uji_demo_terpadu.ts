/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CROSS-PLATFORM DEMO — Pengujian End-to-End Terpadu (Phase 23 & Phase 36–42)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as http from 'node:http';
import * as crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { NusantaraCLI } from '../../src/paket/cli';
import { PembacaBerkasNode } from '../../src/modul/pembacaBerkas';
import { validasiIntegritasBundelArtefak } from '../../src/cicd';

// Phase 36 — Desktop GUI
import {
  AplikasiGUI,
  LabelWidget,
  TombolWidget,
  KolomLayout,
  AdaptorHeadlessGUI,
  PerenderDesktop,
  PengemasAplikasiDesktop,
} from '../../src/gui';

// Phase 37–42 — Mobile Ecosystem
import {
  AplikasiMobile,
  TeksMobile,
  TombolMobile,
  TataLetakVertikalMobile,
  PenyimpananAmanMobile,
  GeneratorPluginPerangkatNative,
  KlienAPIMobile,
  KlienAutentikasiMobile,
  PengawasJaringanMobile,
  PengelolaOperasiOffline,
  MesinSinkronisasiMobile,
  KlienWebSocketMobile,
  APKBuilder,
  AABBuilder,
  ArchiveManager,
  BuildValidator,
  PengelolaKonfigurasiDistribusi,
  KonfigurasiDistribusiLengkap,
  GooglePlayClient,
  AppStoreConnectClient,
  ApprovalGate,
  PublishingReportGenerator,
  UpdateManager,
  SignatureVerifier,
  TrustManager,
  HashValidator,
  ActivationManager,
  ManifestPembaruan,
} from '../../src/mobile';

let totalUji = 0;
let lulus = 0;
let gagal = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) throw new Error(pesan);
}

async function ujiLangkah(nama: string, fn: () => void | Promise<void>): Promise<void> {
  totalUji++;
  try {
    await fn();
    lulus++;
    console.log(`  ✓ [LULUS] ${nama}`);
  } catch (err: any) {
    gagal++;
    console.error(`  ✗ [GAGAL] ${nama}: ${err?.message || err}`);
  }
}

async function jalankanDemoTerpadu(): Promise<void> {
  console.log('\n======================================================================');
  console.log('  NUSANTARA CROSS-PLATFORM DEMO — E2E INTEGRATION (PHASE 23 & 36–42)');
  console.log('======================================================================\n');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-cross-demo-'));
  const artifactsDir = path.resolve('artifacts/demo-terpadu');
  fs.rmSync(artifactsDir, { recursive: true, force: true });
  fs.mkdirSync(artifactsDir, { recursive: true });

  interface SpecArtefakDemo {
    nama: string;
    sumberAbsolut: string;
    jalurRelatifTujuan: string;
    jenisArtefak: string;
    kategoriBuild: 'runtime-output' | 'archive-bundle' | 'structural';
    statusValidasi: string;
    nativeBinary: boolean;
    catatan: string;
  }
  const daftarSalin: SpecArtefakDemo[] = [];

  try {
    // 1. Bahasa & Runtime: Eksekusi demo_terpadu.nusantara
    await ujiLangkah('1. Eksekusi skrip demo_terpadu.nusantara (std:gui + std:mobile + native + publishing + OTA)', async () => {
      const skripPath = path.resolve('contoh/cross_platform_demo/demo_terpadu.nusantara');
      const kode = fs.readFileSync(skripPath, 'utf-8');
      const out = new PenulisOutputBuffer();
      const interp = new Interpreter(out);
      await interp.jalankanKode(kode);

      const teks = out.dapatkanSeluruhTeks().join('\n');
      pastikan(teks.includes('=== MEMULAI NUSANTARA CROSS-PLATFORM DEMO ==='), 'Header demo harus tercetak');
      pastikan(teks.includes('Desktop UI Siap: NUSANTARA Console v0.50.0'), 'Jendela desktop GUI harus dibuat');
      pastikan(teks.includes('Mobile App Berjalan: NUSANTARA Mobile Client'), 'Aplikasi mobile harus berjalan');
      pastikan(teks.includes('Status Native Tersimpan: sukses'), 'PenyimpananAman & panggilNative harus berhasil');
      pastikan(teks.includes('=== SELESAI NUSANTARA CROSS-PLATFORM DEMO ==='), 'Demo skrip harus selesai bersih');
      PenyimpananAmanMobile.hapus('demo_device_status');
    });

    // 2. Phase 23 + Phase 36: Render Desktop BMP, Kemas Bundel Desktop, & Bangun Distribusi CLI Phase 23
    await ujiLangkah('2. Phase 23 & 36: Render GUI headless BMP + pengemasan desktop SHA256SUMS + CLI bangun release', async () => {
      const adaptor = new AdaptorHeadlessGUI();
      const appGui = new AplikasiGUI(
        { idAplikasi: 'id.nusantara.crossdemo', namaAplikasi: 'NUSANTARA Cross Console', versi: '0.50.0', temaAwal: 'gelap' },
        adaptor
      );
      const jendela = appGui.buatJendela({ judul: 'NUSANTARA Cross Console', lebar: 640, tinggi: 400 });
      const kol = new KolomLayout(8);
      kol.tambahAnak(new LabelWidget('Dashboard Terpadu NUSANTARA'));
      kol.tambahAnak(new TombolWidget('Sinkronisasi'));
      jendela.setKonten(kol);

      const perender = new PerenderDesktop();
      const fb = perender.renderKeFramebuffer(jendela);
      const bmpBytes = fb.eksporBMP();
      pastikan(bmpBytes[0] === 0x42 && bmpBytes[1] === 0x4d, 'Output PerenderDesktop harus BMP valid (BM)');

      const dirDesktop = path.join(tmpRoot, 'desktop-pkg');
      const pengemas = new PengemasAplikasiDesktop();
      const pkt = pengemas.kemas({
        konfig: { idAplikasi: 'id.nusantara.crossdemo', namaAplikasi: 'NUSANTARA Cross Console', versi: '0.50.0' },
        jendelaUtama: jendela,
        target: 'linux',
        direktoriKeluaran: dirDesktop,
      });
      pastikan(pkt.sukses && pengemas.verifikasiBundel(pkt.direktoriBundel).valid, 'Bundel desktop harus lolos SHA256SUMS');

      const dirDist = path.join(tmpRoot, 'p23-dist');
      const logs: string[] = [];
      const cli = new NusantaraCLI({ pembaca: new PembacaBerkasNode(), log: (m) => logs.push(m) });
      const code = cli.jalankan(['bangun', '--mode', 'release', '--target', 'linux-x64', '--out', dirDist, '--json']);
      pastikan(code === 0, 'CLI nusantara bangun harus exit 0');
      const jsonOut = JSON.parse(logs.join('\n'));
      pastikan(jsonOut.sukses === true && jsonOut.artefak.length === 2, 'Distribusi Phase 23 harus menghasilkan .zip & .tar.gz');

      const bmpPath = path.join(tmpRoot, 'preview-desktop.bmp');
      fs.writeFileSync(bmpPath, bmpBytes);
      daftarSalin.push(
        {
          nama: 'preview-desktop.bmp',
          sumberAbsolut: bmpPath,
          jalurRelatifTujuan: 'desktop/preview-desktop.bmp',
          jenisArtefak: 'desktop-raster-bmp',
          kategoriBuild: 'runtime-output',
          statusValidasi: 'VERIFIED_BMP_HEADER',
          nativeBinary: false,
          catatan: 'Raster BMP framebuffer software headless (Phase 36); bukan window fisik X11/Win32/Cocoa.',
        },
        {
          nama: 'bundle-SHA256SUMS',
          sumberAbsolut: path.join(pkt.direktoriBundel, 'SHA256SUMS'),
          jalurRelatifTujuan: 'desktop/bundle/SHA256SUMS',
          jenisArtefak: 'desktop-bundle-checksums',
          kategoriBuild: 'runtime-output',
          statusValidasi: 'VERIFIED_SHA256',
          nativeBinary: false,
          catatan: 'Daftar checksum SHA-256 berkas bundel desktop Phase 36.',
        }
      );
      for (const berkasBundel of pkt.daftarBerkas) {
        const sumberAbsolut = path.isAbsolute(berkasBundel)
          ? berkasBundel
          : path.join(pkt.direktoriBundel, berkasBundel);
        const relBundel = path.relative(pkt.direktoriBundel, sumberAbsolut).replace(/\\/g, '/');
        if (relBundel === 'SHA256SUMS') continue;
        daftarSalin.push({
          nama: path.basename(sumberAbsolut),
          sumberAbsolut,
          jalurRelatifTujuan: `desktop/bundle/${relBundel}`,
          jenisArtefak: 'desktop-bundle-file',
          kategoriBuild: 'runtime-output',
          statusValidasi: 'VERIFIED_BUNDLE_MEMBER',
          nativeBinary: false,
          catatan: 'Berkas bundel aplikasi desktop (Phase 36).',
        });
      }
      for (const artP23 of jsonOut.artefak as Array<{ format: string; namaBerkas: string; jalurKeluaran: string }>) {
        daftarSalin.push({
          nama: artP23.namaBerkas,
          sumberAbsolut: artP23.jalurKeluaran,
          jalurRelatifTujuan: `phase23-dist/${artP23.namaBerkas}`,
          jenisArtefak: `phase23-cli-${artP23.format}`,
          kategoriBuild: 'archive-bundle',
          statusValidasi: 'VERIFIED_ARCHIVE',
          nativeBinary: false,
          catatan: 'Arsip rilis CLI nusantara bangun (Phase 23 JS bundle; kompilasi native ELF/PE/Mach-O memerlukan Clang/LLD).',
        });
      }
      await appGui.berhenti();
    });

    // 3. Phase 37 & 38: Mobile App, AES-256-GCM Storage & Native Kotlin/Swift Codegen
    await ujiLangkah('3. Phase 37 & 38: Mobile lifecycle, AES-256-GCM storage, & plugin Kotlin/Swift', async () => {
      const mobile = new AplikasiMobile({
        id: 'id.nusantara.crossdemo',
        nama: 'Cross Demo Mobile',
        versi: '1.0.0',
        nomorBuild: 10,
      });
      const kol = new TataLetakVertikalMobile({ jarakAntarItem: 8 });
      kol.tambahAnak(new TeksMobile('Cross Demo'));
      kol.tambahAnak(new TombolMobile('Kirim'));
      mobile.tambahKomponenAkar(kol);
      await mobile.jalankan();

      const encStore = new PenyimpananAmanMobile('cross-demo-master-key');
      await encStore.simpan('token_cloud', 'rahasia_cross_demo_2026');
      const cipher = encStore.dapatkanCiphertextMentah('token_cloud');
      pastikan(Boolean(cipher && cipher.startsWith('v2:')), 'PenyimpananAmanMobile harus memakai AES-256-GCM v2');
      pastikan((await encStore.ambil('token_cloud')) === 'rahasia_cross_demo_2026', 'Dekripsi harus mengembalikan nilai asli');

      const kt = GeneratorPluginPerangkatNative.hasilkanPluginAndroid('id.nusantara.crossdemo');
      const swift = GeneratorPluginPerangkatNative.hasilkanPluginIOS('id.nusantara.crossdemo');
      pastikan(kt.includes('package id.nusantara.crossdemo'), 'Plugin Kotlin harus bertarget id.nusantara.crossdemo');
      pastikan(swift.includes('id.nusantara.crossdemo'), 'Plugin Swift harus menyertakan bundle ID');
      await mobile.berhenti();
    });

    // 4. Phase 39: Loopback HTTP REST Auth + Offline Queue + Live WebSocket
    await ujiLangkah('4. Phase 39: Loopback HTTP REST + Offline Queue Sync + Live WebSocket', async () => {
      const dbItems: Record<string, any> = {};
      const tokenSesi = 'jwt_loopback_demo_39';

      const httpSrv = http.createServer((req, res) => {
        const u = new URL(req.url || '/', 'http://127.0.0.1');
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          const body = raw ? JSON.parse(raw) : {};
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'POST' && u.pathname === '/auth/masuk') {
            res.end(JSON.stringify({ accessToken: tokenSesi, refreshToken: 'ref_demo', pengguna: { id: 'demo1' } }));
            return;
          }
          if (req.method === 'POST' && u.pathname === '/sync/item') {
            if (req.headers.authorization !== `Bearer ${tokenSesi}`) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }
            dbItems[body.id] = body;
            res.statusCode = 201;
            res.end(JSON.stringify({ ok: true, id: body.id }));
            return;
          }
          res.statusCode = 404;
          res.end('{}');
        });
      });
      await new Promise<void>((r) => httpSrv.listen(0, '127.0.0.1', () => r()));
      const httpPort = (httpSrv.address() as any).port;

      const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 });
      await new Promise<void>((r) => wss.once('listening', () => r()));
      const wsPort = (wss.address() as any).port;
      wss.on('connection', (ws) => {
        ws.on('message', (msg) => {
          const parsed = JSON.parse(String(msg));
          ws.send(JSON.stringify({ tipe: 'pong_demo', isi: parsed.isi }));
        });
      });

      const queueFile = path.join(tmpRoot, 'offline_q.json');
      const net = PengawasJaringanMobile.dapatkanInstance();
      const antrean = PengelolaOperasiOffline.dapatkanInstance();
      antrean.reset();
      antrean.aturJalurPersistensi(queueFile);

      try {
        const api = new KlienAPIMobile({ baseUrl: `http://127.0.0.1:${httpPort}` });
        const auth = new KlienAutentikasiMobile({ apiClient: api });
        auth.keluar();
        const login = await auth.masuk('demo@nusantara.id', 'Sandi123!');
        pastikan(login.sukses && auth.dapatkanTokenAkses() === tokenSesi, 'Login REST loopback harus sukses');

        // Simulasikan offline -> antre ke disk -> online -> sinkronkan
        net.perbaruiStatusFisik(false, 'tidak_ada', false);
        const queued = await api.kirim('/sync/item', { id: 'demo_row_1', nama: 'Item Cross Demo' });
        pastikan(queued.status === 202 && fs.existsSync(queueFile), 'Operasi offline harus masuk antrean disk');

        const sync = MesinSinkronisasiMobile.dapatkanInstance();
        sync.aturKlienAPI(api);
        net.perbaruiStatusFisik(true, 'wifi', false);
        await new Promise((r) => setTimeout(r, 80));
        if (antrean.hitung().tertunda > 0) await sync.sinkronkan();
        pastikan(dbItems['demo_row_1']?.nama === 'Item Cross Demo', 'Data offline harus tersinkronkan ke server loopback');

        // Rekam snapshot berkas antrean offline disk untuk inspeksi artefak
        const queueSnapshot = path.join(tmpRoot, 'offline_q_snapshot.json');
        fs.writeFileSync(
          queueSnapshot,
          JSON.stringify(
            {
              persistedQueuePath: path.basename(queueFile),
              syncedItem: dbItems['demo_row_1'],
              pendingAfterSync: antrean.hitung().tertunda,
              recordedAt: new Date().toISOString(),
            },
            null,
            2
          ),
          'utf-8'
        );
        daftarSalin.push({
          nama: 'offline_q_snapshot.json',
          sumberAbsolut: queueSnapshot,
          jalurRelatifTujuan: 'networking/offline_q_snapshot.json',
          jenisArtefak: 'offline-sync-evidence-json',
          kategoriBuild: 'runtime-output',
          statusValidasi: 'VERIFIED_LOOPBACK_SYNC',
          nativeBinary: false,
          catatan: 'Bukti transisi antrean disk offline -> sinkronisasi HTTP server loopback (Phase 39).',
        });

        const wsClient = new KlienWebSocketMobile({ url: `ws://127.0.0.1:${wsPort}`, autoReconnect: false, intervalHeartbeatMs: 60000 });
        try {
          const wsReply = await new Promise<any>((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('Timeout WS demo')), 3000);
            wsClient.padaPesan((d) => { clearTimeout(t); resolve(d); });
            wsClient.padaStatus((s) => { if (s === 'terbuka') wsClient.kirim({ isi: 'halo_cross_demo' }); });
            wsClient.buka();
          });
          pastikan(wsReply.tipe === 'pong_demo' && wsReply.isi === 'halo_cross_demo', 'WS echo harus diterima');
        } finally {
          wsClient.tutup();
        }
      } finally {
        antrean.aturJalurPersistensi(undefined);
        antrean.reset();
        await new Promise<void>((r) => wss.close(() => r()));
        await new Promise<void>((r) => httpSrv.close(() => r()));
      }
    });

    // 5. Phase 40 & 41: Bangun Android AAB + iOS xcarchive & Publikasikan ke Loopback Store API dengan JWT RS256/ES256
    await ujiLangkah('5. Phase 40 & 41: Bangun Android AAB + iOS .xcarchive, verifikasi SHA256SUMS & unggah RS256/ES256', async () => {
      const distOut = path.join(tmpRoot, 'mobile-dist');
      const tmpKeystore = path.join(tmpRoot, 'demo-release.jks');
      fs.writeFileSync(tmpKeystore, 'NUSANTARA_TEST_KEYSTORE_PLACEHOLDER');
      const dasar = PengelolaKonfigurasiDistribusi.dapatkanInstance().buatKonfigurasiDefault();
      const konfigDist: KonfigurasiDistribusiLengkap = {
        ...dasar,
        aplikasi: {
          ...dasar.aplikasi,
          id: 'id.nusantara.crossdemo',
          nama: 'Cross Demo',
          versi: '1.0.0',
          nomorBuild: 10,
          kodeVersiAndroid: 10,
        },
        android: {
          ...dasar.android,
          targetSdk: 35,
          outputDir: path.join(distOut, 'android'),
          signing: {
            ...dasar.android.signing,
            keystorePath: tmpKeystore,
            keyAlias: 'demo_key',
            storePasswordEnv: 'NUSANTARA_KS_PASS',
            keyPasswordEnv: 'NUSANTARA_KEY_PASS',
            skemaSigning: ['v2', 'v3'],
          },
        },
        ios: {
          ...dasar.ios,
          bundleId: 'id.nusantara.crossdemo',
          outputDir: path.join(distOut, 'ios'),
          signing: {
            ...dasar.ios.signing,
            bundleIdentifier: 'id.nusantara.crossdemo',
            teamId: 'TEAM12345',
            metodeEkspor: 'app-store',
            identitasSigning: 'Apple Distribution: Demo',
          },
        },
      };

      const apk = APKBuilder.bangunAPK(konfigDist, 'release');
      const aab = AABBuilder.bangunAAB(konfigDist, true);
      const iosArc = ArchiveManager.siapkanArchive(konfigDist);
      pastikan(
        apk.sukses && Boolean(apk.artefak) && aab.sukses && Boolean(aab.artefak) && iosArc.sukses && Boolean(iosArc.artefak),
        `Artefak APK(${apk.daftarGalat.join(',')}), AAB(${aab.daftarGalat.join(',')}), .xcarchive(${iosArc.daftarGalat.join(',')}) harus terbuat`
      );
      const aabPathForUpload = aab.artefak!.jalurLokal;

      pastikan(BuildValidator.validasiArtefak(apk.artefak!).valid, 'APK harus lolos validasi PKZIP & SHA-256');
      pastikan(BuildValidator.validasiArtefak(aab.artefak!).valid, 'AAB harus lolos validasi PKZIP & SHA-256');
      pastikan(BuildValidator.validasiArtefak(iosArc.artefak!).valid, 'iOS .xcarchive harus lolos validasi direktori & Info.plist');

      const sums = BuildValidator.buatSha256Sums([apk.artefak!, aab.artefak!]);
      pastikan(BuildValidator.verifikasiSha256Sums(sums, path.dirname(apk.artefak!.jalurLokal)).valid, 'SHA256SUMS Android harus terverifikasi di disk');
      const androidSumsPath = path.join(path.dirname(apk.artefak!.jalurLokal), 'SHA256SUMS');
      fs.writeFileSync(androidSumsPath, sums, 'utf-8');

      daftarSalin.push(
        {
          nama: path.basename(apk.artefak!.jalurLokal),
          sumberAbsolut: apk.artefak!.jalurLokal,
          jalurRelatifTujuan: `mobile/android/${path.basename(apk.artefak!.jalurLokal)}`,
          jenisArtefak: 'structural-pkzip-apk-container',
          kategoriBuild: 'structural',
          statusValidasi: 'VERIFIED_STRUCTURAL_PKZIP_CRC32',
          nativeBinary: false,
          catatan: 'Kontainer PKZIP APK struktural (AndroidManifest.xml, NUSANTARA.json, CERT.SF) TANPA classes.dex/AAPT2; bukan APK terkompilasi Android SDK.',
        },
        {
          nama: path.basename(aab.artefak!.jalurLokal),
          sumberAbsolut: aab.artefak!.jalurLokal,
          jalurRelatifTujuan: `mobile/android/${path.basename(aab.artefak!.jalurLokal)}`,
          jenisArtefak: 'structural-pkzip-aab-container',
          kategoriBuild: 'structural',
          statusValidasi: 'VERIFIED_STRUCTURAL_PKZIP_CRC32',
          nativeBinary: false,
          catatan: 'Kontainer PKZIP AAB struktural TANPA protobuf bundletool/classes.dex; bukan AAB terkompilasi Android SDK.',
        },
        {
          nama: 'android-SHA256SUMS',
          sumberAbsolut: androidSumsPath,
          jalurRelatifTujuan: 'mobile/android/SHA256SUMS',
          jenisArtefak: 'mobile-android-checksums',
          kategoriBuild: 'structural',
          statusValidasi: 'VERIFIED_SHA256',
          nativeBinary: false,
          catatan: 'Checksum SHA-256 artefak kontainer Android demo.',
        },
        {
          nama: 'Info.plist',
          sumberAbsolut: path.join(iosArc.artefak!.jalurLokal, 'Info.plist'),
          jalurRelatifTujuan: 'mobile/ios/CrossDemo.xcarchive/Info.plist',
          jenisArtefak: 'structural-ios-xcarchive-plist',
          kategoriBuild: 'structural',
          statusValidasi: 'VERIFIED_STRUCTURAL_PLIST_ONLY',
          nativeBinary: false,
          catatan: 'Direktori .xcarchive struktural (Info.plist saja, TANPA biner Mach-O dan BUKAN .ipa); kompilasi .ipa memerlukan macOS + Xcode.',
        },
        {
          nama: 'ExportOptions.plist',
          sumberAbsolut: path.join(path.dirname(iosArc.artefak!.jalurLokal), 'ExportOptions.plist'),
          jalurRelatifTujuan: 'mobile/ios/ExportOptions.plist',
          jenisArtefak: 'structural-ios-export-options',
          kategoriBuild: 'structural',
          statusValidasi: 'VERIFIED_STRUCTURAL_EXPORT_OPTIONS_ONLY',
          nativeBinary: false,
          catatan: 'Konfigurasi ekspor Xcode untuk dokumentasi; bukan bukti xcodebuild, code signing, atau ekspor IPA berhasil.',
        }
      );

      // Phase 41: Loopback Store API dengan RS256 & ES256 nyata
      const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const rsaPub = rsa.publicKey.export({ type: 'spki', format: 'pem' }) as string;
      const rsaPriv = rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
      const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
      const ecPub = ec.publicKey.export({ type: 'spki', format: 'pem' }) as string;
      const ecPriv = ec.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

      const storeSrv = http.createServer((req, res) => {
        const u = (req.url || '/').split('?')[0];
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          const token = String(req.headers.authorization || '').replace(/^Bearer\s+/, '');
          if (u.startsWith('/play/')) {
            if (token !== 'loopback-demo-access-token') { res.statusCode = 401; res.end('{}'); return; }
            if (req.method === 'POST' && u === '/play/id.nusantara.crossdemo/edits') { res.end(JSON.stringify({ id: 'edit_demo_1' })); return; }
            if (req.method === 'POST' && u.endsWith('/bundles')) { res.end(JSON.stringify({ versionCode: 10 })); return; }
            if (req.method === 'PUT' && u.endsWith('/tracks/internal')) { res.end(JSON.stringify({ track: 'internal' })); return; }
            if (req.method === 'POST' && u.endsWith(':commit')) { res.end(JSON.stringify({ committed: true })); return; }
          }
          if (u.startsWith('/asc/')) {
            const v = AppStoreConnectClient.verifikasiJWTES256(token, ecPub);
            if (!v.valid) { res.statusCode = 401; res.end('{}'); return; }
            if (req.method === 'GET' && u === '/asc/apps') { res.end(JSON.stringify({ data: [{ id: 'demo_app' }] })); return; }
          }
          res.statusCode = 404;
          res.end('{}');
        });
      });
      await new Promise<void>((r) => storeSrv.listen(0, '127.0.0.1', () => r()));
      const storePort = (storeSrv.address() as any).port;

      try {
        const gp = new GooglePlayClient({
          applicationId: 'id.nusantara.crossdemo',
          packageName: 'id.nusantara.crossdemo',
          defaultTrack: 'internal',
          endpointApi: `http://127.0.0.1:${storePort}/play`,
          // Token dummy eksplisit hanya untuk menguji REST loopback; bukan kredensial produksi.
          bearerTokenAkses: 'loopback-demo-access-token',
          kunciPrivatPem: rsaPriv,
          autoCommitEdit: false,
        });
        const assertionUji = gp.buatAssertionJWTRS256(
          rsaPriv,
          'https://oauth2.googleapis.com/token',
          'demo-service-account@nusantara.invalid'
        );
        const verifikasiAssertion = GooglePlayClient.verifikasiAssertionJWTRS256(
          assertionUji,
          rsaPub,
          'https://oauth2.googleapis.com/token'
        );
        pastikan(verifikasiAssertion.valid, 'JWT assertion RS256 harus lolos verifikasi kriptografis sebelum uji REST loopback');
        const ed = await gp.buatEdit(false);
        const up = await gp.unggahAAB(aabPathForUpload, 10, aab.artefak!.sha256, fs.statSync(aabPathForUpload).size, 'internal', false);
        const cm = await gp.commitEdit(false);
        pastikan(ed.sukses && up.sukses && cm.sukses, 'Siklus edit -> upload AAB -> commit Google Play loopback harus sukses');

        const asc = new AppStoreConnectClient({
          bundleId: 'id.nusantara.crossdemo',
          defaultChannel: 'testflight',
          endpointApi: `http://127.0.0.1:${storePort}/asc`,
          kunciPrivatPem: ecPriv,
        });
        const verifAsc = await asc.verifikasiAksesAPIHttp();
        pastikan(verifAsc.sukses && verifAsc.statusHTTP === 200, 'Verifikasi ES256 JWT App Store Connect loopback harus sukses');

        // Approval gate & laporan publikasi
        const gate = ApprovalGate.dapatkanInstance();
        const reqApr = gate.buatPermintaan({
          tipeAksi: 'luncurkan_rilis_produksi',
          namaAplikasi: 'Cross Demo',
          platform: 'android',
          versi: '1.0.0',
          versionCodeAtauBuild: 10,
          trackAtauChannel: 'production',
          berkasBinary: aabPathForUpload,
          ukuranBinaryKb: Math.round(aab.artefak!.ukuranBytes / 1024),
          sha256Binary: aab.artefak!.sha256,
          tujuanDistribusi: 'Google Play Production',
          dampakTindakan: 'Publikasi rilis lintas platform',
          akunTokoTujuan: 'demo***@nusantara.id',
        });
        pastikan(gate.dapatkanPermintaan(reqApr.id)?.status === 'menunggu', 'Permintaan persetujuan produksi tidak boleh auto-approved sebelum setujui()');
        pastikan(gate.setujui(reqApr.id, 'Operator Demo') && gate.dapatkanRiwayat()[0]?.status === 'disetujui', 'ApprovalGate wajib menyetujui hanya pasca setujui()');

        const repMd = PublishingReportGenerator.formatKeMarkdown({
          idLaporan: 'lap_cross_demo',
          stempelWaktu: new Date().toISOString(),
          namaProyek: 'Cross Demo',
          applicationId: 'id.nusantara.crossdemo',
          platform: 'android',
          versi: '1.0.0',
          buildNumber: 10,
          trackAtauChannel: 'internal',
          akunTujuanMasked: 'demo***@nusantara.id',
          modeSandbox: true,
          berkasBinary: { android: aabPathForUpload },
          daftarPeringatan: [],
          daftarGalat: [],
          tindakanLanjutan: ['Pantau metrik rilis internal'],
          skorKepatuhan: 100,
          statusPublikasi: 'siap_diunggah',
        });
        pastikan(repMd.includes('LAPORAN PUBLIKASI RILIS APLIKASI'), 'Laporan Markdown publikasi harus terbuat');
        const repMdPath = path.join(tmpRoot, 'publishing-report.md');
        fs.writeFileSync(repMdPath, repMd, 'utf-8');
        daftarSalin.push({
          nama: 'publishing-report.md',
          sumberAbsolut: repMdPath,
          jalurRelatifTujuan: 'publishing/publishing-report.md',
          jenisArtefak: 'store-publishing-report-md',
          kategoriBuild: 'runtime-output',
          statusValidasi: 'VERIFIED_SANDBOX_LOOPBACK',
          nativeBinary: false,
          catatan: 'Laporan kepatuhan publikasi loopback RS256/ES256 & ApprovalGate (Phase 41).',
        });
      } finally {
        await new Promise<void>((r) => storeSrv.close(() => r()));
      }
    });

    // 6. Phase 42: OTA Ed25519 Signed Update + Health-Check Auto-Rollback
    await ujiLangkah('6. Phase 42: Unduhan OTA HTTP bertanda tangan Ed25519 + aktivasi & auto-rollback health check', async () => {
      const { kunciPublikPem, kunciPrivatPem, fingerprintHex } = SignatureVerifier.buatPasanganKunciEd25519();
      const keyId = 'nusantara-crossdemo-ota-2026';
      TrustManager.dapatkanInstance().daftarkanKunci({
        keyId,
        algoritma: 'Ed25519',
        kunciPublikHex: fingerprintHex,
        kunciPublikPem,
        deskripsi: 'Cross Demo OTA Key',
        tanggalDibuat: new Date().toISOString(),
        aktif: true,
      });

      const payloadTheme = Buffer.from(JSON.stringify({ tema: 'Nusantara Batik Dark', v: 2 }));
      const shaTheme = HashValidator.hitungSHA256(payloadTheme);
      let baseUrl = '';

      const otaSrv = http.createServer((req, res) => {
        if (req.url === '/manifest.json') {
          const raw: ManifestPembaruan = {
            schemaVersion: 1,
            applicationId: 'id.nusantara.crossdemo',
            platform: 'android',
            channel: 'stable',
            releaseVersion: '1.1.0',
            minimumSupportedVersion: '1.0.0',
            updateType: 'ota_resource',
            policy: 'disarankan',
            releaseDate: new Date().toISOString(),
            revision: 1,
            releaseNotes: { id: 'Tema Batik v2' },
            resources: [
              {
                id: 'batik-theme',
                tipe: 'theme',
                jalurRelatif: 'assets/themes/batik_v2.json',
                url: `${baseUrl}/assets/themes/batik_v2.json`,
                sha256: shaTheme,
                ukuranByte: payloadTheme.byteLength,
              },
            ],
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(SignatureVerifier.tandaTangani(raw, keyId, kunciPrivatPem, 'Ed25519')));
          return;
        }
        if (req.url === '/assets/themes/batik_v2.json') {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
          res.end(payloadTheme);
          return;
        }
        res.writeHead(404);
        res.end();
      });

      await new Promise<void>((r) => otaSrv.listen(0, '127.0.0.1', () => r()));
      baseUrl = `http://127.0.0.1:${(otaSrv.address() as any).port}`;

      try {
        const um = UpdateManager.dapatkanInstance();
        um.konfigurasiAplikasi('id.nusantara.crossdemo', '1.0.0', 'android');
        const cek = await um.periksaPembaruanJarakJauh(`${baseUrl}/manifest.json`);
        pastikan(cek.sukses && cek.signatureValid && Boolean(cek.manifest), 'Manifest OTA Ed25519 jarak jauh harus terverifikasi');

        // Aktivasi sukses dengan health check positif
        const sehat = await um.aktivasiDenganHealthCheck(cek.manifest!, () => {
          return ActivationManager.dapatkanInstance().bacaResource('assets/themes/batik_v2.json') instanceof Uint8Array;
        });
        pastikan(sehat.sukses && !sehat.rolledBack && um.dapatkanVersiTerpasang() === '1.1.0', 'OTA harus aktif pada versi 1.1.0');

        // Aktivasi pembaruan 1.2.0 yang gagal health check -> auto-rollback ke 1.1.0
        const brokenManifest = SignatureVerifier.tandaTangani(
          {
            ...cek.manifest!,
            releaseVersion: '1.2.0',
            revision: 1,
            resources: [
              {
                id: 'batik-theme-v3',
                tipe: 'theme',
                jalurRelatif: 'assets/themes/batik_v3_rusak.json',
                url: `${baseUrl}/assets/themes/batik_v2.json`,
                sha256: shaTheme,
                ukuranByte: payloadTheme.byteLength,
              },
            ],
          },
          keyId,
          kunciPrivatPem,
          'Ed25519'
        );
        const gagal = await um.aktivasiDenganHealthCheck(brokenManifest, () => false);
        pastikan(!gagal.sukses && gagal.rolledBack, 'Health check gagal harus memicu auto-rollback');
        pastikan(um.dapatkanVersiTerpasang() === '1.1.0', 'Versi harus pulih ke 1.1.0');
        pastikan(ActivationManager.dapatkanInstance().bacaResource('assets/themes/batik_v3_rusak.json') === undefined, 'Resource OTA gagal harus bersih pasca-rollback');

        const otaManifestPath = path.join(tmpRoot, 'manifest-ota-signed.json');
        const otaPayloadPath = path.join(tmpRoot, 'batik_v2.json');
        fs.writeFileSync(otaManifestPath, JSON.stringify(cek.manifest!, null, 2), 'utf-8');
        fs.writeFileSync(otaPayloadPath, payloadTheme);
        daftarSalin.push(
          {
            nama: 'manifest-ota-signed.json',
            sumberAbsolut: otaManifestPath,
            jalurRelatifTujuan: 'ota/manifest-ota-signed.json',
            jenisArtefak: 'ota-ed25519-manifest-json',
            kategoriBuild: 'runtime-output',
            statusValidasi: 'VERIFIED_ED25519_SIGNATURE',
            nativeBinary: false,
            catatan: 'Manifest OTA bertanda tangan Ed25519 (tanpa kunci privat) hasil demo Phase 42.',
          },
          {
            nama: 'batik_v2.json',
            sumberAbsolut: otaPayloadPath,
            jalurRelatifTujuan: 'ota/batik_v2.json',
            jenisArtefak: 'ota-resource-payload',
            kategoriBuild: 'runtime-output',
            statusValidasi: 'VERIFIED_SHA256_PAYLOAD',
            nativeBinary: false,
            catatan: 'Payload resource OTA terverifikasi SHA-256 via server loopback.',
          }
        );
      } finally {
        await new Promise<void>((r) => otaSrv.close(() => r()));
      }
    });

    // 7. Persistensi, Manifest & Verifikasi Integritas SHA-256 ke artifacts/demo-terpadu/
    await ujiLangkah('7. Persistensi & verifikasi integritas SHA256SUMS + manifest.json ke artifacts/demo-terpadu/', () => {
      pastikan(daftarSalin.length >= 10, `Minimal 10 artefak demo harus terkumpul, aktual=${daftarSalin.length}`);
      const entriManifest: Array<Record<string, any>> = [];
      const barisSha: string[] = [];

      for (const spec of daftarSalin) {
        if (!fs.existsSync(spec.sumberAbsolut)) {
          throw new Error(`Sumber artefak hilang sebelum penyalinan: ${spec.sumberAbsolut}`);
        }
        const srcBuf = fs.readFileSync(spec.sumberAbsolut);
        const destAbs = path.join(artifactsDir, spec.jalurRelatifTujuan);
        fs.mkdirSync(path.dirname(destAbs), { recursive: true });
        fs.writeFileSync(destAbs, srcBuf);

        if (!fs.existsSync(destAbs)) {
          throw new Error(`Penyalinan artefak ke '${destAbs}' gagal.`);
        }
        const destBuf = fs.readFileSync(destAbs);
        const srcSha = crypto.createHash('sha256').update(srcBuf).digest('hex');
        const destSha = crypto.createHash('sha256').update(destBuf).digest('hex');
        if (srcSha !== destSha || destBuf.byteLength !== srcBuf.byteLength) {
          throw new Error(`Hash/ukuran artefak tidak cocok setelah penyalinan untuk '${spec.jalurRelatifTujuan}'.`);
        }

        barisSha.push(`${destSha}  ${spec.jalurRelatifTujuan}`);
        entriManifest.push({
          nama: spec.nama,
          jalurRelatif: spec.jalurRelatifTujuan,
          ukuranByte: destBuf.byteLength,
          sha256: destSha,
          jenisArtefak: spec.jenisArtefak,
          kategoriBuild: spec.kategoriBuild,
          nativeBinary: spec.nativeBinary,
          statusValidasi: spec.statusValidasi,
          catatan: spec.catatan,
        });
      }

      const sumsPath = path.join(artifactsDir, 'SHA256SUMS');
      const manifestPath = path.join(artifactsDir, 'manifest.json');
      fs.writeFileSync(sumsPath, barisSha.join('\n') + '\n', 'utf-8');
      fs.writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            totalArtefak: entriManifest.length,
            peringatanKeterbatasan:
              'Artefak Android (.apk/.aab) adalah kontainer PKZIP struktural tanpa classes.dex/AAPT2, dan .xcarchive hanya berisi Info.plist tanpa biner Mach-O maupun .ipa. Build native memerlukan Android SDK & macOS/Xcode.',
            artefak: entriManifest,
          },
          null,
          2
        ),
        'utf-8'
      );

      // Verifikasi ulang SHA256SUMS langsung dari disk tujuan + anti-traversal, anti-yatim, kejujuran struktural
      const lines = fs.readFileSync(sumsPath, 'utf-8').trim().split('\n');
      pastikan(lines.length === entriManifest.length, 'Jumlah baris SHA256SUMS harus sama dengan manifest');
      for (const line of lines) {
        const [expectedHash, rel] = line.split(/\s{2}/);
        const actualBuf = fs.readFileSync(path.join(artifactsDir, rel));
        const actualHash = crypto.createHash('sha256').update(actualBuf).digest('hex');
        pastikan(actualHash === expectedHash, `Checksum mismatch di disk untuk ${rel}`);
      }
      pastikan(fs.existsSync(manifestPath) && fs.existsSync(sumsPath), 'manifest.json dan SHA256SUMS harus tersimpan di disk');

      const hasilValidasiKetat = validasiIntegritasBundelArtefak(artifactsDir, {
        strictStructuralSeparation: true,
        minimumArtifacts: 20,
      });
      pastikan(
        hasilValidasiKetat.valid,
        `Validasi ketat integritas artefak gagal: ${hasilValidasiKetat.temuan.map((t) => `${t.kode}:${t.pesan}`).join(' | ')}`
      );
      pastikan(hasilValidasiKetat.jumlahNativeBinary === 0, 'Demo kontainer tidak boleh mengklaim nativeBinary=true');
      pastikan(hasilValidasiKetat.jumlahStruktural >= 4, 'Minimal 4 artefak mobile harus bertanda kategoriBuild=structural');
    });
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log('\n======================================================================');
  console.log(`  HASIL DEMO TERPADU (E2E): ${lulus}/${totalUji} LULUS (${gagal} GAGAL)`);
  console.log('======================================================================\n');
  if (gagal > 0) process.exit(1);
}

jalankanDemoTerpadu().catch((err) => {
  console.error('Galat fatal Demo Terpadu:', err);
  process.exit(1);
});
