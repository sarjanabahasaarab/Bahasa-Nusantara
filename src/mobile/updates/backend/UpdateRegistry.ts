/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Registri Rilis & Manifest Server Backend (Update Registry)
 */

import { ManifestPembaruan, SaluranPembaruan, PlatformMobile } from '../types';
import { SignatureVerifier } from '../security/SignatureVerifier';

export class UpdateRegistry {
  private static instance: UpdateRegistry;
  private manifestStore: Map<string, ManifestPembaruan> = new Map(); // key: `${appId}:${platform}:${channel}`

  private constructor() {
    this.inisialisasiManifestDefault();
  }

  public static dapatkanInstance(): UpdateRegistry {
    if (!UpdateRegistry.instance) {
      UpdateRegistry.instance = new UpdateRegistry();
    }
    return UpdateRegistry.instance;
  }

  private inisialisasiManifestDefault(): void {
    const rawManifest: ManifestPembaruan = {
      schemaVersion: 1,
      applicationId: 'id.nusantara.aplikasi',
      platform: 'keduanya',
      channel: 'stable',
      releaseVersion: '1.2.0',
      minimumSupportedVersion: '1.0.0',
      updateType: 'ota_resource',
      policy: 'disarankan',
      releaseDate: '2026-11-03',
      expirationDate: '2027-11-03',
      revision: 1,
      storeUrl: {
        googlePlay: 'https://play.google.com/store/apps/details?id=id.nusantara.aplikasi',
        appStore: 'https://apps.apple.com/app/id.nusantara.aplikasi',
      },
      releaseNotes: {
        id: 'Pembaruan tema visual Garuda Dark dan perbaikan performa sistem lokalisasi.',
        en: 'Garuda Dark visual theme update and performance enhancements.',
      },
      resources: [
        {
          id: 'theme-garuda-dark',
          tipe: 'theme',
          jalurRelatif: 'themes/garuda-dark.json',
          sha256: 'a127a941ef584d9444b0e50f0270a6a06df52b61f4fa96901842410a8bc011ef',
          ukuranByte: 130,
        },
        {
          id: 'locale-id-v1.2.0',
          tipe: 'localization',
          jalurRelatif: 'locales/id.json',
          sha256: '9211c6d86db49f5786448a6096236aa5d8e7804473b64c8dcf7a5fb1231a5460',
          ukuranByte: 132,
        },
      ],
    };

    // Tandatangani dengan kunci resmi
    const signed = SignatureVerifier.tandaTangani(
      rawManifest,
      'nusantara-ota-root-2026',
      undefined,
      'Ed25519'
    );

    this.daftarkanManifest(signed);
  }

  public daftarkanManifest(manifest: ManifestPembaruan): void {
    const k = this.buatKunci(manifest.applicationId, manifest.platform, manifest.channel);
    this.manifestStore.set(k, manifest);
  }

  public ambilManifest(
    applicationId: string,
    platform: PlatformMobile | 'keduanya',
    channel: SaluranPembaruan
  ): ManifestPembaruan | undefined {
    let m = this.manifestStore.get(this.buatKunci(applicationId, platform, channel));
    if (!m && platform !== 'keduanya') {
      m = this.manifestStore.get(this.buatKunci(applicationId, 'keduanya', channel));
    }
    return m;
  }

  private buatKunci(appId: string, platform: string, channel: string): string {
    return `${appId}:${platform}:${channel}`;
  }
}
