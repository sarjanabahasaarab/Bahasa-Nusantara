/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parse as uraiTOML, stringify as cetakTOML } from 'smol-toml';
import { uraiVersi, apakahVersiValid } from './semver';
import { validasiNamaPaket } from './keamanan';

export interface SpesifikasiDependensi {
  versi?: string;
  path?: string;
}

export type NilaiDependensi = string | SpesifikasiDependensi;

export interface MetadataPaketNusantara {
  nama: string;
  versi: string;
  deskripsi: string;
  lisensi: string;
  penulis?: string | string[];
  repository?: string;
  homepage?: string;
  kata_kunci?: string[];
}

export interface ManifestPaket {
  nusantara: MetadataPaketNusantara;
  dependensi: Record<string, NilaiDependensi>;
}

export class GalatManifest extends Error {
  constructor(pesan: string) {
    super(`Kesalahan manifest paket (nusantara.toml):\n${pesan}`);
    this.name = 'GalatManifest';
  }
}

/**
 * Mengurai string TOML menjadi objek ManifestPaket terstruktur dan tervalidasi.
 */
export function bacaManifest(kontenTOML: string): ManifestPaket {
  let dataMentah: any;
  try {
    dataMentah = uraiTOML(kontenTOML);
  } catch (err: any) {
    throw new GalatManifest(`Sintaks TOML tidak valid: ${err.message}`);
  }

  if (!dataMentah || typeof dataMentah !== 'object') {
    throw new GalatManifest(`Format berkas nusantara.toml kosong atau tidak valid.`);
  }

  // 1. Validasi bagian [nusantara]
  const nusantara = dataMentah.nusantara;
  if (!nusantara || typeof nusantara !== 'object') {
    throw new GalatManifest(
      `Bagian '[nusantara]' tidak ditemukan. Berkas manifest wajib menyertakan tabel '[nusantara]'.`
    );
  }

  // Validasi atribut wajib
  if (typeof nusantara.nama !== 'string' || !nusantara.nama.trim()) {
    throw new GalatManifest(`Atribut 'nama' pada '[nusantara]' wajib diisi dengan teks valid.`);
  }
  validasiNamaPaket(nusantara.nama);

  if (typeof nusantara.versi !== 'string' || !nusantara.versi.trim()) {
    throw new GalatManifest(`Atribut 'versi' pada '[nusantara]' wajib diisi.`);
  }
  if (!apakahVersiValid(nusantara.versi)) {
    throw new GalatManifest(
      `Versi '${nusantara.versi}' tidak memenuhi kaidah Semantic Versioning (MAJOR.MINOR.PATCH).`
    );
  }

  if (typeof nusantara.deskripsi !== 'string') {
    throw new GalatManifest(`Atribut 'deskripsi' pada '[nusantara]' wajib berupa teks.`);
  }

  if (typeof nusantara.lisensi !== 'string' || !nusantara.lisensi.trim()) {
    throw new GalatManifest(`Atribut 'lisensi' pada '[nusantara]' wajib diisi (misal: MIT, Apache-2.0).`);
  }

  // 2. Validasi bagian [dependensi]
  const dependensiMentah = dataMentah.dependensi || {};
  if (typeof dependensiMentah !== 'object') {
    throw new GalatManifest(`Bagian '[dependensi]' harus berupa tabel pasangan kunci-nilai.`);
  }

  const dependensiBersih: Record<string, NilaiDependensi> = {};
  for (const [namaDep, nilaiDep] of Object.entries(dependensiMentah)) {
    validasiNamaPaket(namaDep);

    if (typeof nilaiDep === 'string') {
      dependensiBersih[namaDep] = nilaiDep.trim();
    } else if (nilaiDep && typeof nilaiDep === 'object') {
      const spec = nilaiDep as Record<string, any>;
      const itemBersih: SpesifikasiDependensi = {};
      if (spec.versi !== undefined) {
        if (typeof spec.versi !== 'string') {
          throw new GalatManifest(`Atribut 'versi' pada dependensi '${namaDep}' harus berupa teks.`);
        }
        itemBersih.versi = spec.versi.trim();
      }
      if (spec.path !== undefined) {
        if (typeof spec.path !== 'string') {
          throw new GalatManifest(`Atribut 'path' pada dependensi '${namaDep}' harus berupa teks.`);
        }
        itemBersih.path = spec.path.trim();
      }
      if (!itemBersih.versi && !itemBersih.path) {
        throw new GalatManifest(
          `Dependensi '${namaDep}' harus menyertakan versi atau path yang valid.`
        );
      }
      dependensiBersih[namaDep] = itemBersih;
    } else {
      throw new GalatManifest(
        `Nilai dependensi untuk '${namaDep}' tidak valid. Harus berupa string versi atau tabel { path = "..." }.`
      );
    }
  }

  return {
    nusantara: {
      nama: nusantara.nama.trim(),
      versi: nusantara.versi.trim(),
      deskripsi: nusantara.deskripsi.trim(),
      lisensi: nusantara.lisensi.trim(),
      penulis: nusantara.penulis,
      repository: nusantara.repository,
      homepage: nusantara.homepage,
      kata_kunci: Array.isArray(nusantara.kata_kunci) ? nusantara.kata_kunci : undefined,
    },
    dependensi: dependensiBersih,
  };
}

/**
 * Mengubah objek ManifestPaket kembali menjadi teks TOML yang bersih dan terformat rapi.
 */
export function tulisManifest(manifest: ManifestPaket): string {
  const objekTOML: Record<string, any> = {
    nusantara: {
      nama: manifest.nusantara.nama,
      versi: manifest.nusantara.versi,
      deskripsi: manifest.nusantara.deskripsi,
      lisensi: manifest.nusantara.lisensi,
    },
  };

  if (manifest.nusantara.penulis) objekTOML.nusantara.penulis = manifest.nusantara.penulis;
  if (manifest.nusantara.repository) objekTOML.nusantara.repository = manifest.nusantara.repository;
  if (manifest.nusantara.homepage) objekTOML.nusantara.homepage = manifest.nusantara.homepage;
  if (manifest.nusantara.kata_kunci) objekTOML.nusantara.kata_kunci = manifest.nusantara.kata_kunci;

  if (Object.keys(manifest.dependensi).length > 0) {
    objekTOML.dependensi = manifest.dependensi;
  } else {
    objekTOML.dependensi = {};
  }

  return cetakTOML(objekTOML);
}

/**
 * Membuat manifest awal standar untuk proyek baru.
 */
export function buatManifestAwal(
  nama: string,
  opsi?: Partial<MetadataPaketNusantara>
): ManifestPaket {
  validasiNamaPaket(nama);
  return {
    nusantara: {
      nama,
      versi: opsi?.versi || '0.1.0',
      deskripsi: opsi?.deskripsi || `Paket ${nama} untuk ekosistem bahasa NUSANTARA`,
      lisensi: opsi?.lisensi || 'Apache-2.0',
      penulis: opsi?.penulis || 'Pengembang Nusantara',
    },
    dependensi: {},
  };
}
