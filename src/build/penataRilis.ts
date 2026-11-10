/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Penata Rilis & Generator Manifest Distribusi (Phase 23)
 */

import { ArtefakBuild, ManifestRilis, ModeBuild } from './types';
import { VERSI_NUSANTARA, LABEL_VERSI_NUSANTARA } from '../konstanta/versi';

export class PenataRilis {
  public static buatManifestRilis(
    arg1: ArtefakBuild[] | string,
    arg2?: boolean | ModeBuild,
    arg3?: ArtefakBuild[]
  ): ManifestRilis {
    let versi = VERSI_NUSANTARA;
    let mode: ModeBuild = 'release';
    let artefak: ArtefakBuild[] = [];
    let reproducible = true;

    if (typeof arg1 === 'string') {
      versi = arg1;
      mode = (arg2 as ModeBuild) || 'release';
      artefak = arg3 || [];
    } else {
      artefak = arg1;
      reproducible = typeof arg2 === 'boolean' ? arg2 : true;
    }

    const totalUkuran = artefak.reduce((sum, a) => sum + (a.ukuranByte || 0), 0);
    const now = new Date().toISOString();
    return {
      versi,
      labelVersi: LABEL_VERSI_NUSANTARA,
      mode,
      tanggalRilis: now,
      waktuDibuat: now,
      artefak,
      totalUkuranByte: totalUkuran,
      reproducible,
    };
  }

  public static buatTeksChecksum(artefak: ArtefakBuild[]): string {
    return artefak.map((a) => `${a.sha256}  ${a.namaBerkas}`).join('\n') + '\n';
  }
}
