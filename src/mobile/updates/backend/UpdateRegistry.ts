/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Registri Rilis & Manifest Server Backend (Update Registry)
 */

import { ManifestPembaruan, SaluranPembaruan, PlatformMobile } from '../types';

export class UpdateRegistry {
  private static instance: UpdateRegistry;
  private manifestStore: Map<string, ManifestPembaruan> = new Map(); // key: `${appId}:${platform}:${channel}`

  private constructor() {
    // No built-in manifest: releases must be registered with a verified signature.
  }

  public static dapatkanInstance(): UpdateRegistry {
    if (!UpdateRegistry.instance) {
      UpdateRegistry.instance = new UpdateRegistry();
    }
    return UpdateRegistry.instance;
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
