/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Manajer Distribusi TestFlight iOS (TestFlight Distribution Manager)
 */

import { AppStoreConnectClient } from './AppStoreConnectClient';
import { InformasiBetaTestFlight, StatusBuildASC } from '../types';

export class TestFlightManager {
  private client: AppStoreConnectClient;
  private buildBetaPeta: Map<string, InformasiBetaTestFlight> = new Map();

  constructor(client: AppStoreConnectClient) {
    this.client = client;
  }

  /**
   * Menyiapkan konfigurasi rilis beta TestFlight untuk build tertentu.
   */
  public async siapkanRilisBeta(opsi: {
    buildVersion: string;
    buildNumber: number;
    catatanBeta: Record<string, string>;
    emailKontak?: string;
    grupPenguji?: string[];
    aktifkanEksternal?: boolean;
  }): Promise<{ sukses: boolean; infoBeta: InformasiBetaTestFlight; pesan: string }> {
    const key = `${opsi.buildVersion}_${opsi.buildNumber}`;

    // Hitung tanggal kedaluwarsa TestFlight (90 hari dari hari ini)
    const tanggalExp = new Date();
    tanggalExp.setDate(tanggalExp.getDate() + 90);

    const infoBeta: InformasiBetaTestFlight = {
      buildVersion: opsi.buildVersion,
      buildNumber: opsi.buildNumber,
      statusProcessing: 'processing',
      catatanBeta: opsi.catatanBeta,
      emailKontakUmpanBalik: opsi.emailKontak || 'support@nusantara.dev',
      grupPenguji: opsi.grupPenguji || ['Internal QA', 'Komunitas Pengembang Nusantara'],
      // Flag permintaan bukan bukti bahwa Apple telah menyetujui build untuk pengujian eksternal.
      eksternalTersedia: false,
      tanggalKedaluwarsa: tanggalExp.toISOString().split('T')[0],
    };

    this.buildBetaPeta.set(key, infoBeta);

    return {
      sukses: true,
      infoBeta,
      pesan: `Konfigurasi beta v${opsi.buildVersion} (#${opsi.buildNumber}) disimpan. Distribusi tetap menunggu pemrosesan dan konfirmasi App Store Connect.`,
    };
  }

  public dapatkanInfoBeta(versi: string, buildNumber: number): InformasiBetaTestFlight | undefined {
    return this.buildBetaPeta.get(`${versi}_${buildNumber}`);
  }

  public dapatkanSemuaBuildBeta(): InformasiBetaTestFlight[] {
    return Array.from(this.buildBetaPeta.values());
  }
}
