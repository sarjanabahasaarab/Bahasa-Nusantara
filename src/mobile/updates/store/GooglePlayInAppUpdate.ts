/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NUSANTARA Phase 42 — Google Play Core adapter contract.
 *
 * This TypeScript layer does not invoke Play Core. It never invents a remote
 * version or reports an update flow as started without a connected native bridge.
 */
import { StatusInAppUpdateGooglePlay } from '../types';
export type TipeAlurUpdatePlay = 'FLEXIBLE' | 'IMMEDIATE';

export class GooglePlayInAppUpdate {
  public static periksaKetersediaan(
    applicationId: string,
    versionCodeTerpasang: number,
    versionCodeTerbaru?: number
  ): StatusInAppUpdateGooglePlay {
    const valid = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(applicationId) &&
      Number.isSafeInteger(versionCodeTerpasang) && versionCodeTerpasang >= 1 &&
      Number.isSafeInteger(versionCodeTerbaru) && (versionCodeTerbaru as number) >= 1;
    const tersedia = valid && (versionCodeTerbaru as number) > versionCodeTerpasang;
    return {
      tersedia,
      kodeKetersediaan: tersedia ? 'UPDATE_AVAILABLE' : 'UPDATE_NOT_AVAILABLE',
      versiTersedia: tersedia ? versionCodeTerbaru as number : versionCodeTerpasang,
      staleDays: 0,
      immediateAllowed: false,
      flexibleAllowed: false,
      storeUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(applicationId)}`,
    };
  }

  public static mulaiAlurUpdate(applicationId: string, tipeAlur: TipeAlurUpdatePlay): {
    sukses: boolean; tipe: TipeAlurUpdatePlay; pesan: string; storeUrl: string;
  } {
    return {
      sukses: false,
      tipe: tipeAlur,
      pesan: 'Alur belum dimulai: integrasi Android Play Core native belum dipasang. URL toko hanya referensi dan bukan bukti update berjalan.',
      storeUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(applicationId)}`,
    };
  }

  public static selesaikanFlexibleUpdate(): { sukses: boolean; pesan: string } {
    return {
      sukses: false,
      pesan: 'Update Flexible tidak dapat diselesaikan karena callback install completion dari Google Play Core belum terhubung.',
    };
  }
}
