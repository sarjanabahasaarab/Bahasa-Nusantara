/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Penata Berkas Rilis & Checksum SHA256SUMS
 */

import { ManifestRilis, ArtefakBuild, ModeBuild, PlatformTarget } from './types';
import { VERSI_NUSANTARA, LABEL_VERSI_NUSANTARA } from '../konstanta/versi';

export class PenataRilis {
  public static susunManifest(
    mode: ModeBuild,
    targets: PlatformTarget[],
    artefak: ArtefakBuild[],
    reproducible: boolean = true
  ): ManifestRilis {
    return {
      versi: VERSI_NUSANTARA,
      labelVersi: LABEL_VERSI_NUSANTARA,
      waktuBuild: new Date().toISOString(),
      mode,
      targetPlatforms: targets,
      artefak,
      checksumFile: 'dist/SHA256SUMS',
      reproducible,
    };
  }

  public static buatTeksChecksum(artefak: ArtefakBuild[]): string {
    return (
      artefak
        .map(a => `${a.sha256}  ${a.namaBerkas}`)
        .join('\n') + '\n'
    );
  }
}
