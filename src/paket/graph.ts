/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apakahKompatibel } from './semver';

export interface PermintaanVersi {
  peminta: string;
  batasan: string;
}

export interface KonflikVersi {
  namaPaket: string;
  permintaan: PermintaanVersi[];
}

export interface SimpulDependensi {
  nama: string;
  versi: string;
  sumber: string;
  dependensi: Record<string, string>; // nama -> batasan versi
}

export class GalatKetergantunganMelingkar extends Error {
  public readonly rantai: string[];

  constructor(rantai: string[]) {
    const teksRantai = rantai.join('\n→ ');
    super(`Kesalahan dependency:\n\nterdeteksi dependency melingkar:\n\n${teksRantai}`);
    this.name = 'GalatKetergantunganMelingkar';
    this.rantai = rantai;
  }
}

export class GalatKonflikVersi extends Error {
  public readonly namaPaket: string;
  public readonly batasanList: string[];

  constructor(namaPaket: string, batasanList: string[]) {
    const daftar = batasanList.join('\n');
    super(
      `Kesalahan dependency:\n\nversi package '${namaPaket}' tidak dapat memenuhi\nsemua kebutuhan dependency.\n\nDibutuhkan:\n${daftar}`
    );
    this.name = 'GalatKonflikVersi';
    this.namaPaket = namaPaket;
    this.batasanList = batasanList;
  }
}

/**
 * Graf Dependensi untuk mengelola relasi antar-paket, mendeteksi siklus, dan memvalidasi konflik versi.
 */
export class GrafDependensi {
  private readonly simpul = new Map<string, SimpulDependensi>();
  private readonly permintaanVersi = new Map<string, PermintaanVersi[]>();

  public tambahSimpul(data: SimpulDependensi): void {
    this.simpul.set(data.nama, data);

    for (const [depNama, batasan] of Object.entries(data.dependensi)) {
      if (!this.permintaanVersi.has(depNama)) {
        this.permintaanVersi.set(depNama, []);
      }
      this.permintaanVersi.get(depNama)!.push({
        peminta: data.nama,
        batasan,
      });
    }
  }

  public dapatkanSimpul(nama: string): SimpulDependensi | undefined {
    return this.simpul.get(nama);
  }

  public dapatkanSemuaSimpul(): ReadonlyMap<string, SimpulDependensi> {
    return this.simpul;
  }

  /**
   * Mendeteksi siklus dependensi (A → B → C → A) menggunakan algoritma DFS.
   * Mengembalikan rantai siklus jika ditemukan, atau null jika asiklik.
   */
  public deteksiSiklus(akarAwal?: string): string[] | null {
    const dikunjungi = new Set<string>();
    const tumpukanAktif = new Set<string>();
    const jalur: string[] = [];

    const dfs = (saatIni: string): string[] | null => {
      dikunjungi.add(saatIni);
      tumpukanAktif.add(saatIni);
      jalur.push(saatIni);

      const simpulData = this.simpul.get(saatIni);
      if (simpulData) {
        for (const depNama of Object.keys(simpulData.dependensi)) {
          if (!dikunjungi.has(depNama)) {
            const hasil = dfs(depNama);
            if (hasil) return hasil;
          } else if (tumpukanAktif.has(depNama)) {
            // Ditemukan siklus!
            const idx = jalur.indexOf(depNama);
            const siklus = jalur.slice(idx);
            siklus.push(depNama);
            return siklus;
          }
        }
      }

      jalur.pop();
      tumpukanAktif.delete(saatIni);
      return null;
    };

    if (akarAwal && this.simpul.has(akarAwal)) {
      const siklus = dfs(akarAwal);
      if (siklus) return siklus;
    }

    for (const nama of this.simpul.keys()) {
      if (!dikunjungi.has(nama)) {
        const siklus = dfs(nama);
        if (siklus) return siklus;
      }
    }

    return null;
  }

  /**
   * Memvalidasi apakah seluruh permintaan versi untuk setiap paket saling kompatibel.
   */
  public deteksiKonflikVersi(): KonflikVersi[] {
    const daftarKonflik: KonflikVersi[] = [];

    for (const [namaPaket, daftarMinta] of this.permintaanVersi) {
      if (daftarMinta.length <= 1) continue;

      const simpulPaket = this.simpul.get(namaPaket);
      if (!simpulPaket) continue;

      // Periksa apakah versi paket saat ini memenuhi seluruh batasan
      const batasanTidakPuas: string[] = [];
      for (const req of daftarMinta) {
        if (!apakahKompatibel(simpulPaket.versi, req.batasan)) {
          batasanTidakPuas.push(req.batasan);
        }
      }

      if (batasanTidakPuas.length > 0) {
        daftarKonflik.push({
          namaPaket,
          permintaan: daftarMinta,
        });
      }
    }

    return daftarKonflik;
  }

  /**
   * Menghasilkan urutan instalasi/pemuatan topologis (dependency first).
   */
  public urutanTopologis(): string[] {
    const siklus = this.deteksiSiklus();
    if (siklus) {
      throw new GalatKetergantunganMelingkar(siklus);
    }

    const hasil: string[] = [];
    const dikunjungi = new Set<string>();

    const kunjungi = (nama: string) => {
      if (dikunjungi.has(nama)) return;
      dikunjungi.add(nama);

      const simpulData = this.simpul.get(nama);
      if (simpulData) {
        for (const depNama of Object.keys(simpulData.dependensi)) {
          kunjungi(depNama);
        }
      }
      hasil.push(nama);
    };

    for (const nama of this.simpul.keys()) {
      kunjungi(nama);
    }

    return hasil;
  }
}
