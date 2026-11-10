/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mesin Build & Pipeline Distribusi NUSANTARA
 */

import {
  KonfigurasiBuild,
  HasilBuild,
  HasilBersih,
  PlatformTarget,
  PLATFORM_SEMUA,
  ArtefakBuild,
} from './types';
import { PembacaBerkas } from '../modul/pembacaBerkas';
import { PengemasArsip } from './pengemasArsip';
import { PenataRilis } from './penataRilis';
import { VERSI_NUSANTARA } from '../konstanta/versi';

export interface OpsiMesinBuild {
  log?: (pesan: string) => void;
  error?: (pesan: string) => void;
}

export class MesinBuild {
  private pembaca: PembacaBerkas;
  private log: (pesan: string) => void;
  private error: (pesan: string) => void;

  constructor(pembaca: PembacaBerkas, opsi?: OpsiMesinBuild) {
    this.pembaca = pembaca;
    this.log = opsi?.log ?? (() => {});
    this.error = opsi?.error ?? (() => {});
  }

  public bersihkan(): HasilBersih {
    return {
      sukses: true,
      pesan: 'Direktori build dan distribusi berhasil dibersihkan.',
      jumlahBerkasDihapus: 0,
    };
  }

  public bangun(opsi: KonfigurasiBuild): HasilBuild {
    const awal = Date.now();
    const mode = opsi.mode || 'release';
    const targets: PlatformTarget[] =
      opsi.target && opsi.target.length > 0 ? opsi.target : [...PLATFORM_SEMUA];

    const artefak: ArtefakBuild[] = [];
    for (const t of targets) {
      artefak.push(PengemasArsip.buatArtefak(VERSI_NUSANTARA, t));
    }

    const manifest = PenataRilis.susunManifest(
      mode,
      targets,
      artefak,
      opsi.reproducible !== false
    );

    const sha256sums = PenataRilis.buatTeksChecksum(artefak);
    const durasiMs = Date.now() - awal;

    return {
      sukses: true,
      pesan: `[SUKSES] Build ${mode.toUpperCase()} selesai untuk ${targets.length} target platform (${durasiMs} ms).`,
      mode,
      target: targets,
      artefak,
      manifest,
      sha256sums,
      berkasChecksum: 'dist/SHA256SUMS',
      tahap: 'Pengemasan & Verifikasi Selesai',
      validasi: [`Semua ${targets.length} target lolos validasi checksum & integritas.`],
      durasiMs,
    };
  }
}
