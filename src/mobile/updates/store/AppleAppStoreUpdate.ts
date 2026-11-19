/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NUSANTARA Phase 42 — App Store lookup/link helpers.
 *
 * A generated URL is not proof that an update was queried or opened. The actual
 * StoreKit/App Store handoff must be performed by a connected iOS native bridge.
 */
import { StatusAppStoreUpdateApple } from '../types';

export class AppleAppStoreUpdate {
  public static buatAppStoreUrl(bundleId: string, adamId?: string): string {
    if (adamId && /^\d+$/.test(adamId)) return `https://apps.apple.com/app/id${adamId}`;
    return `https://apps.apple.com/app/${encodeURIComponent(bundleId)}`;
  }

  public static buatDeepLinkAppStore(adamId?: string): string {
    if (adamId && /^\d+$/.test(adamId)) return `itms-apps://itunes.apple.com/app/id${adamId}`;
    return 'itms-apps://itunes.apple.com/';
  }

  public static periksaKetersediaan(
    bundleId: string,
    versiTerpasang: string,
    versiAppStore?: string,
    adamId?: string
  ): StatusAppStoreUpdateApple {
    const bundleValid = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(bundleId);
    const remoteVersionValid = Boolean(versiAppStore && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versiAppStore));
    const tersedia = bundleValid && remoteVersionValid && versiAppStore !== versiTerpasang;
    return {
      tersedia,
      versiTersedia: tersedia ? versiAppStore as string : versiTerpasang,
      bundleId,
      appStoreUrl: this.buatAppStoreUrl(bundleId, adamId),
      minimumOsVersion: '15.0',
      catatanRilis: tersedia
        ? 'Versi remote diberikan oleh pemanggil; hasil ini bukan pengganti App Store Lookup API.'
        : 'Belum ada versi remote terverifikasi dari App Store Lookup API.',
    };
  }

  public static arahkanKeAppStore(bundleId: string, adamId?: string): {
    sukses: boolean; url: string; deepLink: string; dibuka: boolean; pesan: string;
  } {
    const valid = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(bundleId);
    return {
      sukses: valid,
      url: this.buatAppStoreUrl(bundleId, adamId),
      deepLink: this.buatDeepLinkAppStore(adamId),
      dibuka: false,
      pesan: valid
        ? 'URL App Store berhasil disiapkan. Aplikasi host tetap harus membuka URL melalui UIApplication.open; fungsi ini tidak mengklaim App Store sudah terbuka.'
        : 'Bundle identifier tidak valid; URL App Store tidak disiapkan.',
    };
  }
}
