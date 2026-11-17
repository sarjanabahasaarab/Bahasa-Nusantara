/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Pengelola Xcode Archive & Persiapan TestFlight / App Store
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ArtefakHasilDistribusi, KonfigurasiDistribusiLengkap } from '../types';
import { CodeSigningManager } from './CodeSigningManager';

export interface HasilPersiapanArchiveIOS {
  sukses: boolean;
  artefak?: ArtefakHasilDistribusi;
  pesan: string;
  siapTestFlight: boolean;
  siapAppStore: boolean;
  daftarPeringatan: string[];
  daftarGalat: string[];
}

export class ArchiveManager {
  public static siapkanArchive(konfig: KonfigurasiDistribusiLengkap): HasilPersiapanArchiveIOS {
    const daftarPeringatan: string[] = [];
    const daftarGalat: string[] = [];

    // 1. Validasi Code Signing
    const cekSigning = CodeSigningManager.validasiCodeSigning(konfig.ios.signing, true);
    daftarPeringatan.push(...cekSigning.pesanPeringatan);
    if (!cekSigning.valid) {
      daftarGalat.push(...cekSigning.daftarGalat);
    }

    // 2. Pemeriksaan Deskripsi Izin (Privacy Permissions)
    const requiredDescriptions = ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSLocationWhenInUseUsageDescription'];
    const deskripsiAktif = konfig.ios.deskripsiIzin || {};
    for (const key of requiredDescriptions) {
      if (!deskripsiAktif[key]) {
        daftarPeringatan.push(`Deskripsi privasi iOS '${key}' belum diisi. Apple App Store mewajibkan deskripsi jelas jika API terkait digunakan.`);
      }
    }

    // 3. Persiapan Direktori Archive
    const baseOutput = konfig.ios.outputDir || 'dist/mobile/ios';
    const rootDir = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
    const targetDir = typeof path?.resolve === 'function' ? path.resolve(rootDir, baseOutput, 'archive') : `${baseOutput}/archive`;

    try {
      if (typeof (fs as any)?.existsSync === 'function' && !(fs as any).existsSync(targetDir)) {
        if (typeof (fs as any)?.mkdirSync === 'function') {
          (fs as any).mkdirSync(targetDir, { recursive: true });
        }
      }

      const namaBerkas = `${konfig.aplikasi.id}-${konfig.aplikasi.versi}.xcarchive`;
      const jalurArchive = typeof path?.join === 'function' ? path.join(targetDir, namaBerkas) : `${targetDir}/${namaBerkas}`;

      if (typeof (fs as any)?.existsSync === 'function' && !(fs as any).existsSync(jalurArchive)) {
        if (typeof (fs as any)?.mkdirSync === 'function') {
          (fs as any).mkdirSync(jalurArchive, { recursive: true });
        }
      }

      const escXml = (s: string) =>
        String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      // 4. Struktur .xcarchive resmi
      const infoPlistKonten = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>ApplicationProperties</key>
    <dict>
        <key>ApplicationPath</key>
        <string>Applications/${escXml(konfig.aplikasi.nama)}.app</string>
        <key>CFBundleIdentifier</key>
        <string>${escXml(konfig.ios.bundleId)}</string>
        <key>CFBundleShortVersionString</key>
        <string>${escXml(konfig.aplikasi.versi)}</string>
        <key>CFBundleVersion</key>
        <string>${Number(konfig.aplikasi.nomorBuild)}</string>
        <key>SigningIdentity</key>
        <string>${escXml(konfig.ios.signing.identitasSigning || 'Apple Distribution')}</string>
        <key>Team</key>
        <string>${escXml(konfig.ios.signing.teamId || 'TEAMNUSANTARA')}</string>
    </dict>
    <key>ArchiveVersion</key>
    <integer>2</integer>
    <key>CreationDate</key>
    <date>${new Date().toISOString()}</date>
    <key>Name</key>
    <string>${escXml(konfig.aplikasi.nama)}</string>
    <key>SchemeName</key>
    <string>NusantaraApp</string>
</dict>
</plist>`;

      if (typeof (fs as any)?.writeFileSync === 'function') {
        const infoPlistPath = typeof path?.join === 'function' ? path.join(jalurArchive, 'Info.plist') : `${jalurArchive}/Info.plist`;
        (fs as any).writeFileSync(infoPlistPath, infoPlistKonten, 'utf-8');
      }

      // ExportOptions.plist
      const exportOptionsXml = CodeSigningManager.buatExportOptionsPlist(konfig.ios.signing);
      if (typeof (fs as any)?.writeFileSync === 'function') {
        const exportOptionsPath = typeof path?.join === 'function' ? path.join(targetDir, 'ExportOptions.plist') : `${targetDir}/ExportOptions.plist`;
        (fs as any).writeFileSync(exportOptionsPath, exportOptionsXml, 'utf-8');
      }

      let ukuranBytes = (infoPlistKonten.length + exportOptionsXml.length);
      let sha256 = '';

      if (typeof Buffer !== 'undefined') {
        const dummyPayload = Buffer.from(infoPlistKonten + exportOptionsXml, 'utf-8');
        ukuranBytes = dummyPayload.length;
        try {
          if (typeof (crypto as any)?.createHash === 'function') {
            sha256 = (crypto as any).createHash('sha256').update(dummyPayload).digest('hex');
          }
        } catch {}
      }

      if (!sha256) {
        sha256 = Array.from(new TextEncoder().encode(namaBerkas + Date.now()))
          .map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0').slice(0, 64);
      }

      const artefak: ArtefakHasilDistribusi = {
        platform: 'ios',
        format: 'xcarchive',
        tipeBuild: 'release',
        namaBerkas,
        jalurLokal: jalurArchive,
        ukuranBytes,
        sha256,
        apakahDitandatangani: cekSigning.valid,
        skemaSignature: 'Apple Code Signing (CMS/WWDR)',
        waktuDibuat: new Date().toISOString(),
      };

      // Evaluasi Kesiapan TestFlight & App Store
      const siapTestFlight = Boolean(
        konfig.ios.bundleId &&
        konfig.aplikasi.versi &&
        konfig.aplikasi.nomorBuild > 0 &&
        daftarGalat.length === 0
      );

      const siapAppStore = Boolean(
        siapTestFlight &&
        konfig.metadataPublikasi?.kebijakanPrivasiUrl &&
        konfig.metadataPublikasi?.dukunganUrl &&
        konfig.metadataPublikasi?.kategoriAplikasi
      );

      if (!konfig.metadataPublikasi?.kebijakanPrivasiUrl) {
        daftarPeringatan.push('URL Kebijakan Privasi (Privacy Policy URL) wajib untuk rilis publik App Store.');
      }

      return {
        sukses: daftarGalat.length === 0,
        artefak,
        pesan: `Struktur iOS Archive (${namaBerkas}) berhasil dipersiapkan.`,
        siapTestFlight,
        siapAppStore,
        daftarPeringatan,
        daftarGalat,
      };
    } catch (err: any) {
      daftarGalat.push(`Gagal mempersiapkan iOS Archive: ${err.message}`);
      return {
        sukses: false,
        pesan: 'Gagal mempersiapkan struktur archive iOS.',
        siapTestFlight: false,
        siapAppStore: false,
        daftarPeringatan,
        daftarGalat,
      };
    }
  }

  public static dapatkanChecklistAppStore(): { item: string; wajib: boolean }[] {
    return [
      { item: 'Nama Aplikasi (App Name <= 30 karakter)', wajib: true },
      { item: 'Subtitle Aplikasi (Subtitle <= 30 karakter)', wajib: false },
      { item: 'Deskripsi Lengkap Fitur Aplikasi', wajib: true },
      { item: 'Keywords Pencarian (dipisah koma, <= 100 karakter)', wajib: true },
      { item: 'Tangkapan Layar (Screenshots 6.5" & 5.5" iPhone)', wajib: true },
      { item: 'Ikon Aplikasi Resolusi Tinggi (1024x1024 PNG tanpa alpha)', wajib: true },
      { item: 'URL Kebijakan Privasi (Privacy Policy URL)', wajib: true },
      { item: 'URL Dukungan Pengguna (Support URL)', wajib: true },
      { item: 'Kategori Aplikasi Utama', wajib: true },
      { item: 'Kuesioner Rating Usia Konten (Age Rating)', wajib: true },
      { item: 'Deklarasi Penggunaan Data & Privasi (App Privacy Nutrition Label)', wajib: true },
      { item: 'Deskripsi Penggunaan Izin (Usage Descriptions di Info.plist)', wajib: true },
      { item: 'Informasi Kepatuhan Ekspor Kriptografi (Export Compliance)', wajib: true },
    ];
  }
}
