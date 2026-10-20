/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas, PembacaBerkasMemori, PembacaBerkasNode } from '../modul/pembacaBerkas';
import {
  ManifestPaket,
  bacaManifest,
  tulisManifest,
  buatManifestAwal,
  MetadataPaketNusantara,
  NilaiDependensi,
} from './manifest';
import { BerkasKunci, EntriPaketKunci, bacaLock, tulisLock, hitungChecksum } from './lockfile';
import { GrafDependensi, GalatKetergantunganMelingkar, GalatKonflikVersi } from './graph';
import { PackageRegistry, LocalRegistry } from './registry';
import { validasiNamaPaket, periksaKeamananJalurLokal } from './keamanan';
import { apakahKompatibel, uraiVersi, bandingkanVersi } from './semver';

export interface OpsiPengelolaPaket {
  direktoriProyek?: string;
  pembacaBerkas?: PembacaBerkas;
  registry?: PackageRegistry;
}

export interface HasilEksekusiCLI {
  sukses: boolean;
  pesan: string;
  data?: any;
}

export interface InfoPaketRingkas {
  nama: string;
  versi: string;
  deskripsi: string;
  lisensi: string;
  jumlahDependensi: number;
  lokasiProyek: string;
}

export interface ItemDaftarDependensi {
  nama: string;
  batasan: string;
  versiTerpasang?: string;
  terpasang: boolean;
  sumber: string;
}

/**
 * Mesin Pengelola Paket NUSANTARA (Phase 16).
 */
export class PengelolaPaket {
  private readonly pembaca: PembacaBerkas;
  private readonly direktoriProyek: string;
  private readonly registry: PackageRegistry;

  constructor(opsi?: OpsiPengelolaPaket) {
    this.pembaca =
      opsi?.pembacaBerkas ||
      (typeof window !== 'undefined' ? new PembacaBerkasMemori() : new PembacaBerkasNode());

    const dirAkar =
      opsi?.direktoriProyek ||
      (typeof process !== 'undefined' && process.cwd ? process.cwd() : '/proyek');
    this.direktoriProyek = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(dirAkar));

    this.registry =
      opsi?.registry ||
      new LocalRegistry(this.pembaca, [
        this.pembaca.gabungJalur(this.direktoriProyek, 'paket'),
        this.pembaca.gabungJalur(this.direktoriProyek, 'packages'),
        '/proyek/paket',
        '/proyek/packages',
      ]);
  }

  public dapatkanDirektoriProyek(): string {
    return this.direktoriProyek;
  }

  public dapatkanDirektoriPaket(): string {
    return this.pembaca.gabungJalur(this.direktoriProyek, '.nusantara', 'paket');
  }

  public dapatkanJalurManifest(): string {
    return this.pembaca.gabungJalur(this.direktoriProyek, 'nusantara.toml');
  }

  public dapatkanJalurLock(): string {
    return this.pembaca.gabungJalur(this.direktoriProyek, 'nusantara.lock');
  }

  /**
   * Membuat paket proyek baru: nusantara buat <nama>
   */
  public buat(namaProyek: string, direktoriSasaran?: string): HasilEksekusiCLI {
    validasiNamaPaket(namaProyek);

    const dirTarget = direktoriSasaran
      ? this.pembaca.jalurAbsolut(direktoriSasaran)
      : this.pembaca.gabungJalur(this.direktoriProyek, namaProyek);

    const manifestTarget = this.pembaca.gabungJalur(dirTarget, 'nusantara.toml');

    if (this.pembaca.apakahAda(manifestTarget)) {
      throw new Error(`Direktori atau proyek '${namaProyek}' sudah memiliki nusantara.toml.`);
    }

    // 1. Tulis nusantara.toml
    const manifestAwal = buatManifestAwal(namaProyek, {
      versi: '0.1.0',
      deskripsi: `Paket ${namaProyek} untuk ekosistem bahasa NUSANTARA`,
      lisensi: 'Apache-2.0',
    });
    this.tulisBerkasAman(manifestTarget, tulisManifest(manifestAwal));

    // 2. Tulis src/utama.nusantara
    const berkasUtama = this.pembaca.gabungJalur(dirTarget, 'src', 'utama.nusantara');
    const kodeUtama = `// Titik Masuk Utama Paket ${namaProyek}\nprogram Utama\n\nmulai\n    tampilkan("Halo dari paket ${namaProyek}!")\nselesai\n`;
    this.tulisBerkasAman(berkasUtama, kodeUtama);

    // 3. Tulis README.md
    const berkasReadme = this.pembaca.gabungJalur(dirTarget, 'README.md');
    const kontenReadme = `# ${namaProyek}\n\nPaket resmi bahasa pemrograman NUSANTARA.\n\n## Penggunaan\n\`\`\`nusantara\ngunakan ${namaProyek}\n\`\`\`\n`;
    this.tulisBerkasAman(berkasReadme, kontenReadme);

    return {
      sukses: true,
      pesan: `Paket NUSANTARA '${namaProyek}' berhasil dibuat di ${dirTarget}.`,
      data: { jalur: dirTarget, nama: namaProyek },
    };
  }

  /**
   * Menginstal dependensi proyek: nusantara pasang [--terkunci]
   */
  public pasang(opsi?: { terkunci?: boolean }): HasilEksekusiCLI {
    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(
        `Berkas 'nusantara.toml' tidak ditemukan di ${this.direktoriProyek}. Jalankan 'nusantara buat <nama>' terlebih dahulu.`
      );
    }

    const kontenManifest = this.pembaca.baca(jalurManifest);
    const manifest = bacaManifest(kontenManifest);

    const jalurLock = this.dapatkanJalurLock();
    let lockSebelumnya: BerkasKunci | null = null;
    if (this.pembaca.apakahAda(jalurLock)) {
      try {
        lockSebelumnya = bacaLock(this.pembaca.baca(jalurLock));
      } catch {
        lockSebelumnya = null;
      }
    }

    if (opsi?.terkunci) {
      if (!lockSebelumnya) {
        throw new Error(
          `Opsi '--terkunci' digunakan namun berkas 'nusantara.lock' tidak ditemukan atau rusak.`
        );
      }
    }

    const graf = new GrafDependensi();

    // Simpul akar: proyek utama
    const depAkarString: Record<string, string> = {};
    for (const [depNama, depVal] of Object.entries(manifest.dependensi)) {
      depAkarString[depNama] = typeof depVal === 'string' ? depVal : depVal.versi || '*';
    }

    graf.tambahSimpul({
      nama: manifest.nusantara.nama,
      versi: manifest.nusantara.versi,
      sumber: 'akar',
      dependensi: depAkarString,
    });

    const entriKunciHasil: EntriPaketKunci[] = [];
    const dirInstalasiPaket = this.dapatkanDirektoriPaket();

    // Resolusi rekursif seluruh dependensi
    const daftarDiproses = new Set<string>();
    const antrean = Object.entries(manifest.dependensi);

    while (antrean.length > 0) {
      const [namaDep, nilaiDep] = antrean.shift()!;
      if (daftarDiproses.has(namaDep)) continue;
      daftarDiproses.add(namaDep);

      let versiTerpilih = '';
      let sumberTerpilih = '';
      let berkasPaket: Record<string, string> = {};
      let manifestDep: ManifestPaket | null = null;

      if (typeof nilaiDep === 'object' && nilaiDep.path) {
        // Dependensi jalur lokal
        const jalurAman = periksaKeamananJalurLokal(
          this.pembaca,
          nilaiDep.path,
          this.direktoriProyek
        );

        const manifestDepPath = this.pembaca.gabungJalur(jalurAman, 'nusantara.toml');
        if (!this.pembaca.apakahAda(manifestDepPath)) {
          throw new Error(
            `Dependensi lokal '${namaDep}' di jalur '${nilaiDep.path}' tidak memiliki 'nusantara.toml'.`
          );
        }

        const rawManifest = this.pembaca.baca(manifestDepPath);
        manifestDep = bacaManifest(rawManifest);
        versiTerpilih = manifestDep.nusantara.versi;
        sumberTerpilih = `path:${nilaiDep.path}`;

        // Kumpulkan berkas modul dari jalur lokal
        berkasPaket['nusantara.toml'] = rawManifest;
        const kandidat = [
          this.pembaca.gabungJalur(jalurAman, 'src', `${namaDep}.nusantara`),
          this.pembaca.gabungJalur(jalurAman, `${namaDep}.nusantara`),
          this.pembaca.gabungJalur(jalurAman, 'src', 'utama.nusantara'),
          this.pembaca.gabungJalur(jalurAman, 'modul.nusantara'),
        ];
        for (const k of kandidat) {
          if (this.pembaca.apakahAda(k)) {
            const rel = k.slice(jalurAman.length + 1).replace(/\\/g, '/');
            berkasPaket[rel] = this.pembaca.baca(k);
          }
        }
      } else {
        // Dependensi versi melalui Registry
        const batasanVersi = typeof nilaiDep === 'string' ? nilaiDep : nilaiDep.versi || '*';
        const info = this.registry.dapatkanInfo(namaDep);

        if (!info) {
          throw new Error(
            `Kesalahan dependency:\npaket '${namaDep}' versi '${batasanVersi}' tidak ditemukan pada registri lokal atau direktori paket.`
          );
        }

        // Cari versi yang kompatibel
        const kandidatVersi = Object.keys(info.daftarVersi).sort((a, b) => {
          return bandingkanVersi(uraiVersi(b), uraiVersi(a));
        });

        const cocok = kandidatVersi.find(v => apakahKompatibel(v, batasanVersi));
        if (!cocok) {
          throw new Error(
            `Kesalahan dependency:\nversi package '${namaDep}' tidak dapat memenuhi kebutuhan dependency '${batasanVersi}'.`
          );
        }

        versiTerpilih = cocok;
        sumberTerpilih = `registri:${namaDep}@${versiTerpilih}`;
        berkasPaket = this.registry.ambilBerkasPaket(namaDep, versiTerpilih);

        if (berkasPaket['nusantara.toml']) {
          manifestDep = bacaManifest(berkasPaket['nusantara.toml']);
        }
      }

      // Bangun entri simpul dependensi pada graf
      const subDependensi: Record<string, string> = {};
      if (manifestDep) {
        for (const [subNama, subVal] of Object.entries(manifestDep.dependensi)) {
          const subConstraint = typeof subVal === 'string' ? subVal : subVal.versi || '*';
          subDependensi[subNama] = subConstraint;
          if (!daftarDiproses.has(subNama)) {
            antrean.push([subNama, subVal]);
          }
        }
      }

      graf.tambahSimpul({
        nama: namaDep,
        versi: versiTerpilih,
        sumber: sumberTerpilih,
        dependensi: subDependensi,
      });

      // Simpan/salin berkas ke .nusantara/paket/<namaDep>/
      const targetDirPaket = this.pembaca.gabungJalur(dirInstalasiPaket, namaDep);
      let ringkasanKonten = '';
      for (const [namaFile, isi] of Object.entries(berkasPaket)) {
        this.tulisBerkasAman(this.pembaca.gabungJalur(targetDirPaket, namaFile), isi);
        ringkasanKonten += isi;
      }

      const hash = hitungChecksum(ringkasanKonten || `${namaDep}@${versiTerpilih}`);

      entriKunciHasil.push({
        nama: namaDep,
        versi: versiTerpilih,
        sumber: sumberTerpilih,
        integritas: hash,
        dependensi: Object.keys(subDependensi).length > 0 ? subDependensi : undefined,
      });
    }

    // 2. Deteksi Siklus (Circular Dependency)
    const siklus = graf.deteksiSiklus(manifest.nusantara.nama);
    if (siklus) {
      throw new GalatKetergantunganMelingkar(siklus);
    }

    // 3. Deteksi Konflik Versi (Version Conflicts)
    const konflik = graf.deteksiKonflikVersi();
    if (konflik.length > 0) {
      const k = konflik[0];
      const batasanList = k.permintaan.map(p => `${p.batasan} (dibutuhkan oleh ${p.peminta})`);
      throw new GalatKonflikVersi(k.namaPaket, batasanList);
    }

    // 4. Perbarui atau tulis berkas nusantara.lock
    const berkasLockBaru: BerkasKunci = {
      versi_format: 1,
      paket: entriKunciHasil,
    };
    this.tulisBerkasAman(jalurLock, tulisLock(berkasLockBaru));

    return {
      sukses: true,
      pesan: `Berhasil memasang ${entriKunciHasil.length} dependensi. Berkas 'nusantara.lock' telah diperbarui.`,
      data: { paket: entriKunciHasil },
    };
  }

  /**
   * Menghapus dependensi dari proyek: nusantara hapus <nama>
   */
  public hapus(namaPaket: string): HasilEksekusiCLI {
    validasiNamaPaket(namaPaket);

    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(`Berkas 'nusantara.toml' tidak ditemukan.`);
    }

    const manifest = bacaManifest(this.pembaca.baca(jalurManifest));

    if (!manifest.dependensi[namaPaket]) {
      throw new Error(
        `Paket '${namaPaket}' tidak terdaftar sebagai dependensi dalam nusantara.toml.`
      );
    }

    // Periksa apakah dependensi lain masih membutuhkan paket ini
    const jalurLock = this.dapatkanJalurLock();
    if (this.pembaca.apakahAda(jalurLock)) {
      const lock = bacaLock(this.pembaca.baca(jalurLock));
      const pemintaList: string[] = [];
      for (const p of lock.paket) {
        if (p.nama !== namaPaket && p.dependensi && p.dependensi[namaPaket]) {
          pemintaList.push(p.nama);
        }
      }
      if (pemintaList.length > 0) {
        throw new Error(
          `Paket '${namaPaket}' tidak dapat dihapus karena masih dibutuhkan oleh dependensi lain: ${pemintaList.join(', ')}.`
        );
      }
    }

    // Hapus dari manifest
    delete manifest.dependensi[namaPaket];
    this.tulisBerkasAman(jalurManifest, tulisManifest(manifest));

    // Hapus berkas paket dari .nusantara/paket/<namaPaket>/
    const dirPaket = this.pembaca.gabungJalur(this.dapatkanDirektoriPaket(), namaPaket);
    this.hapusDirektoriRekursif(dirPaket);

    // Pasang ulang untuk meregenerasi lockfile secara bersih
    this.pasang();

    return {
      sukses: true,
      pesan: `Paket '${namaPaket}' berhasil dihapus dari proyek dan dependensi.`,
      data: { nama: namaPaket },
    };
  }

  /**
   * Memperbarui dependensi: nusantara perbarui [<nama>]
   */
  public perbarui(namaPaket?: string): HasilEksekusiCLI {
    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(`Berkas 'nusantara.toml' tidak ditemukan.`);
    }

    if (namaPaket) {
      validasiNamaPaket(namaPaket);
    }

    // Eksekusi ulang pasang tanpa flag terkunci untuk menyelesaikan versi terbaru yang kompatibel
    return this.pasang({ terkunci: false });
  }

  /**
   * Menampilkan daftar dependensi proyek: nusantara daftar
   */
  public daftar(): ItemDaftarDependensi[] {
    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(`Berkas 'nusantara.toml' tidak ditemukan.`);
    }

    const manifest = bacaManifest(this.pembaca.baca(jalurManifest));
    const jalurLock = this.dapatkanJalurLock();
    let lock: BerkasKunci | null = null;
    if (this.pembaca.apakahAda(jalurLock)) {
      try {
        lock = bacaLock(this.pembaca.baca(jalurLock));
      } catch {
        lock = null;
      }
    }

    const hasil: ItemDaftarDependensi[] = [];
    const dirPaket = this.dapatkanDirektoriPaket();

    for (const [depNama, depVal] of Object.entries(manifest.dependensi)) {
      const batasan = typeof depVal === 'string' ? depVal : depVal.versi || depVal.path || '*';
      const entriLock = lock?.paket.find(p => p.nama === depNama);
      const jalurFisik = this.pembaca.gabungJalur(dirPaket, depNama);
      const terpasang = this.pembaca.apakahAda(this.pembaca.gabungJalur(jalurFisik, 'nusantara.toml')) ||
        (typeof depVal === 'object' && !!depVal.path);

      hasil.push({
        nama: depNama,
        batasan,
        versiTerpasang: entriLock?.versi,
        terpasang,
        sumber: entriLock?.sumber || (typeof depVal === 'object' && depVal.path ? `path:${depVal.path}` : 'registri'),
      });
    }

    return hasil;
  }

  /**
   * Menampilkan informasi paket: nusantara info
   */
  public info(): InfoPaketRingkas {
    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(`Berkas 'nusantara.toml' tidak ditemukan di ${this.direktoriProyek}.`);
    }

    const manifest = bacaManifest(this.pembaca.baca(jalurManifest));

    return {
      nama: manifest.nusantara.nama,
      versi: manifest.nusantara.versi,
      deskripsi: manifest.nusantara.deskripsi,
      lisensi: manifest.nusantara.lisensi,
      jumlahDependensi: Object.keys(manifest.dependensi).length,
      lokasiProyek: this.direktoriProyek,
    };
  }

  // ==========================================================================
  // METODE PEMBANTU SISTEM BERKAS
  // ==========================================================================

  private tulisBerkasAman(jalur: string, konten: string): void {
    if (this.pembaca instanceof PembacaBerkasMemori) {
      this.pembaca.tulisBerkas(jalur, konten);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = typeof window === 'undefined' ? require('fs') : null;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = typeof window === 'undefined' ? require('path') : null;
      if (fs && path) {
        const dir = path.dirname(jalur);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(jalur, konten, 'utf-8');
      }
    } catch {
      // Lewati jika bundler browser
    }
  }

  private hapusDirektoriRekursif(jalur: string): void {
    if (this.pembaca instanceof PembacaBerkasMemori) {
      this.pembaca.hapusBerkas(jalur);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = typeof window === 'undefined' ? require('fs') : null;
      if (fs && fs.existsSync(jalur)) {
        fs.rmSync(jalur, { recursive: true, force: true });
      }
    } catch {
      // Lewati jika bundler browser
    }
  }
}
