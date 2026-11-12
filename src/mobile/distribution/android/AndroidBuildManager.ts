/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Pengelola Build dan Distribusi Android Terpadu
 */

import { KonfigurasiDistribusiLengkap } from '../types';
import { APKBuilder, HasilBuildAPK } from './APKBuilder';
import { AABBuilder, HasilBuildAAB } from './AABBuilder';
import { AndroidSigningManager, HasilValidasiSigningAndroid } from './AndroidSigning';
import { muatModulNode, apakahNodeRuntime } from '../../../gui/platform/node_bridge';

export interface InfoLingkunganAndroidDistribusi {
  androidHome?: string;
  adaJdk: boolean;
  versiJdk?: string;
  adaGradle: boolean;
  adaAapt2?: boolean;
  adaD8?: boolean;
  adaApksigner?: boolean;
  adaZipalign?: boolean;
  adaKeytool?: boolean;
  siapBuildNative: boolean;
  catatan: string[];
}

function cekBinerHost(bin: string, args: string[] = ['--version']): { ada: boolean; output: string } {
  if (!apakahNodeRuntime()) return { ada: false, output: '' };
  const cp = muatModulNode<any>('child_process');
  if (!cp || typeof cp.spawnSync !== 'function') return { ada: false, output: '' };
  try {
    const res = cp.spawnSync(bin, args, { timeout: 2000, stdio: 'pipe', encoding: 'utf-8' });
    return { ada: !res.error && res.status === 0, output: String(res.stdout || res.stderr || '').trim() };
  } catch {
    return { ada: false, output: '' };
  }
}

export class AndroidDistributionManager {
  public static periksaLingkungan(): InfoLingkunganAndroidDistribusi {
    const env = typeof process !== 'undefined' && process.env ? process.env : {};
    const androidHome = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
    const probeJavac = cekBinerHost('javac', ['-version']);
    const probeGradle = cekBinerHost('gradle', ['--version']);
    const probeKeytool = cekBinerHost('keytool', ['-help']);
    const adaAapt2 = cekBinerHost('aapt2', ['version']).ada;
    const adaD8 = cekBinerHost('d8', ['--version']).ada;
    const adaApksigner = cekBinerHost('apksigner', ['--version']).ada;
    const adaZipalign = cekBinerHost('zipalign', ['-h']).ada;

    const adaJdk = Boolean(env.JAVA_HOME || probeJavac.ada);
    const versiJdk = probeJavac.output || (env.JAVA_HOME ? 'JDK (JAVA_HOME)' : undefined);
    const adaGradle = Boolean(env.GRADLE_HOME || probeGradle.ada);
    const siapBuildNative = Boolean(androidHome && adaJdk && (adaGradle || (adaAapt2 && adaD8)));

    const catatan: string[] = [];
    if (!androidHome) {
      catatan.push('Variabel ANDROID_HOME / ANDROID_SDK_ROOT belum dikonfigurasi di host.');
    } else {
      catatan.push(`Android SDK terdeteksi di: ${androidHome}`);
    }

    if (!adaJdk) {
      catatan.push('JDK (JAVA_HOME) belum terdeteksi. Gunakan OpenJDK 17 atau lebih baru.');
    } else {
      catatan.push(`Java JDK terdeteksi${versiJdk ? `: ${versiJdk}` : '.'}`);
    }

    if (!siapBuildNative) {
      catatan.push('Build native APK dibatasi ke engine bundling internal Nusantara (Standalone Package Builder).');
    }

    return {
      androidHome,
      adaJdk,
      versiJdk,
      adaGradle,
      adaAapt2,
      adaD8,
      adaApksigner,
      adaZipalign,
      adaKeytool: probeKeytool.ada,
      siapBuildNative,
      catatan,
    };
  }

  public static bangunDebugAPK(konfig: KonfigurasiDistribusiLengkap): HasilBuildAPK {
    return APKBuilder.bangunAPK(konfig, 'debug');
  }

  public static bangunReleaseAPK(konfig: KonfigurasiDistribusiLengkap): HasilBuildAPK {
    return APKBuilder.bangunAPK(konfig, 'release');
  }

  public static bangunReleaseAAB(konfig: KonfigurasiDistribusiLengkap): HasilBuildAAB {
    return AABBuilder.bangunAAB(konfig, true);
  }

  public static validasiSigning(konfig: KonfigurasiDistribusiLengkap, apakahRelease: boolean = true): HasilValidasiSigningAndroid {
    return AndroidSigningManager.validasiSigning(konfig.android.signing, apakahRelease);
  }
}
