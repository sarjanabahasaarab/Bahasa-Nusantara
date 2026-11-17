/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Validator Sertifikat & Penandatanganan (Signing Validator)
 */

import { KonfigurasiSigningAndroid, KonfigurasiSigningIOS } from '../types';
import { AndroidSigningManager } from '../android/AndroidSigning';
import { CodeSigningManager } from '../ios/CodeSigningManager';

export class SigningValidator {
  public static validasiSigningAndroid(konfig: KonfigurasiSigningAndroid, apakahRelease: boolean = true) {
    return AndroidSigningManager.validasiSigning(konfig, apakahRelease);
  }

  public static validasiSigningIOS(konfig: KonfigurasiSigningIOS, apakahRelease: boolean = true) {
    return CodeSigningManager.validasiCodeSigning(konfig, apakahRelease);
  }

  public static periksaKeamananKredensial(teksKonten: string): { aman: boolean; temuanRahasia: string[] } {
    const temuanRahasia: string[] = [];
    // Pola umum kredensial sensitif (tidak mengenai *Env seperti storePasswordEnv)
    const polaSensitif = [
      /\bpassword\s*[:=]\s*["']([^"']{3,})["']/i,
      /\bstorePassword\s*[:=]\s*["']([^"']{3,})["']/i,
      /\bkeyPassword\s*[:=]\s*["']([^"']{3,})["']/i,
      /\bkeystorePassword\s*[:=]\s*["']([^"']{3,})["']/i,
      /\bapiSecret\s*[:=]\s*["']([^"']{3,})["']/i,
      /\bclient_secret\s*[:=]\s*["']([^"']{3,})["']/i,
      /private_key/i,
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    ];

    for (const pola of polaSensitif) {
      if (pola.test(teksKonten)) {
        temuanRahasia.push(`Pola kata sandi/kunci privat terdeteksi dalam konten teks: ${pola}`);
      }
    }

    return {
      aman: temuanRahasia.length === 0,
      temuanRahasia,
    };
  }
}
