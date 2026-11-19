/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NUSANTARA Phase 40 — Android App Bundle builder backed by the Android Gradle Plugin.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { ArtefakHasilDistribusi, KonfigurasiDistribusiLengkap } from '../types';
import { AndroidManifestManager } from './AndroidManifestManager';

export interface HasilBuildAAB {
  sukses: boolean;
  artefak?: ArtefakHasilDistribusi;
  pesan: string;
  daftarPeringatan: string[];
  daftarGalat: string[];
}

export class AABBuilder {
  public static bangunAAB(konfig: KonfigurasiDistribusiLengkap, apakahRelease: boolean = true): HasilBuildAAB {
    const daftarPeringatan: string[] = [];
    const daftarGalat: string[] = [];
    const cekManifes = AndroidManifestManager.validasiManifes(konfig);
    if (!cekManifes.valid) return { sukses: false, pesan: 'Validasi manifes AAB gagal.', daftarPeringatan, daftarGalat: cekManifes.masalah };

    const root = process.cwd();
    const projectDir = process.env.NUSANTARA_ANDROID_PROJECT_DIR || path.join(root, 'native', 'android');
    const gradle = process.env.GRADLE_BIN || 'gradle';
    const variant = apakahRelease ? 'Release' : 'Debug';
    const output = path.join(projectDir, 'app', 'build', 'outputs', 'bundle', apakahRelease ? 'release' : 'debug', 'app-' + (apakahRelease ? 'release' : 'debug') + '.aab');
    try {
      if (!fs.existsSync(path.join(projectDir, 'settings.gradle'))) throw new Error('Proyek Android Gradle native tidak ditemukan: ' + projectDir);
      if (apakahRelease) {
        const ks = konfig.android.signing;
        const storePassword = ks.storePasswordEnv ? process.env[ks.storePasswordEnv] : undefined;
        const keyPassword = ks.keyPasswordEnv ? process.env[ks.keyPasswordEnv] : undefined;
        if (ks.keystorePath && ks.keyAlias && storePassword && keyPassword) {
          process.env.NUSANTARA_ANDROID_KEYSTORE = path.resolve(ks.keystorePath);
          process.env.NUSANTARA_ANDROID_KEY_ALIAS = ks.keyAlias;
          process.env.NUSANTARA_ANDROID_STORE_PASSWORD = storePassword;
          process.env.NUSANTARA_ANDROID_KEY_PASSWORD = keyPassword;
        } else {
          daftarPeringatan.push('AAB native dibangun tanpa signing release; tidak boleh diunggah ke Google Play sebelum signing diverifikasi.');
        }
      }
      execFileSync(gradle, ['--no-daemon', '-p', projectDir, ':app:bundle' + variant, '-PapplicationId=' + konfig.aplikasi.id], { stdio: 'pipe', timeout: 12 * 60 * 1000, env: process.env });
      if (!fs.existsSync(output)) throw new Error('Gradle selesai tetapi AAB output tidak ditemukan: ' + output);
      const listing = execFileSync('unzip', ['-Z1', output], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split(/\r?\n/);
      if (!listing.includes('BundleConfig.pb') || !listing.some((x) => /^base\/dex\/classes(\\d+)?\\.dex$/.test(x)) || !listing.includes('base/manifest/AndroidManifest.xml')) {
        throw new Error('AAB tidak memiliki BundleConfig.pb, DEX, atau base manifest native.');
      }
      const bytes = fs.readFileSync(output);
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      const artefak: ArtefakHasilDistribusi = {
        platform: 'android', format: 'aab', tipeBuild: apakahRelease ? 'release' : 'debug',
        namaBerkas: path.basename(output), jalurLokal: output,
        ukuranBytes: bytes.length, sha256,
        apakahDitandatangani: Boolean(process.env.NUSANTARA_ANDROID_KEYSTORE),
        skemaSignature: process.env.NUSANTARA_ANDROID_KEYSTORE ? 'Gradle release signing' : 'unsigned',
        waktuDibuat: new Date().toISOString(),
      };
      return { sukses: true, artefak, pesan: 'AAB native Gradle berhasil dibuat dan struktur bundle diverifikasi.', daftarPeringatan, daftarGalat };
    } catch (err: any) {
      daftarGalat.push(String(err?.message || err));
      return { sukses: false, pesan: 'Build AAB native gagal atau toolchain tidak tersedia. Tidak ada AAB sintetis yang dibuat.', daftarPeringatan, daftarGalat };
    }
  }
}
