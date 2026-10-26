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
import { GrafDependensi, GalatKetergantunganMelingkar, GalatKonflikVersi, HasilAuditKeamanan } from './graph';
import { PackageRegistry, LocalRegistry } from './registry';
import { validasiNamaPaket, periksaKeamananJalurLokal } from './keamanan';
import { apakahKompatibel, uraiVersi, bandingkanVersi } from './semver';
import {
  buatArsipPaket,
  uraiArsipPaket,
  ekstrakArsipPaket,
  ArsipPaketData,
  apakahHarusDiabaikan,
} from './arsip';
import { ValidatorPaket, LaporanValidasiPaket } from './validasi';
import {
  AntarmukaRegistri,
  RegistriLokal,
  HasilPencarianPaket,
  MetadataPaketRegistri,
  HasilPenerbitanPaket,
} from './registri';
import { ManajerCachePaket, EntriCachePaket } from './cache';

export interface OpsiPengelolaPaket {
  direktoriProyek?: string;
  pembacaBerkas?: PembacaBerkas;
  registry?: PackageRegistry;
  registriLokal?: RegistriLokal;
  cache?: ManajerCachePaket;
  direktoriCache?: string;
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
  private readonly cache: ManajerCachePaket;
  private registriLokal: RegistriLokal;

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

    this.registriLokal =
      opsi?.registriLokal ||
      new RegistriLokal({
        pembacaBerkas: this.pembaca,
        direktoriBasis: this.pembaca.gabungJalur(this.direktoriProyek, 'registri'),
      });

    this.cache =
      opsi?.cache ||
      new ManajerCachePaket(
        this.pembaca,
        opsi?.direktoriCache || this.pembaca.gabungJalur(this.direktoriProyek, '.nusantara', 'cache')
      );
  }

  public dapatkanRegistriLokal(): RegistriLokal {
    return this.registriLokal;
  }

  public dapatkanManajerCache(): ManajerCachePaket {
    return this.cache;
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

  public dapatkanPembaca(): PembacaBerkas {
    return this.pembaca;
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
   * Menginstal dependensi proyek: nusantara pasang [--terkunci] [--lewati-cache]
   */
  public pasang(opsi?: { terkunci?: boolean; lewatiCache?: boolean }): HasilEksekusiCLI {
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
      const entriKunciSebelumnya = lockSebelumnya?.paket.find(p => p.nama === namaDep);

      if (opsi?.terkunci && !entriKunciSebelumnya && !(typeof nilaiDep === 'object' && nilaiDep.path)) {
        throw new Error(
          `Dependensi '${namaDep}' tidak terdaftar pada berkas 'nusantara.lock' saat opsi '--terkunci' digunakan.`
        );
      }

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

        const metaRegistri = this.registriLokal ? this.registriLokal.dapatkanMetadata(namaDep) : null;
        const info = this.registry ? this.registry.dapatkanInfo(namaDep) : null;

        if (opsi?.terkunci && entriKunciSebelumnya) {
          versiTerpilih = entriKunciSebelumnya.versi;
          sumberTerpilih = entriKunciSebelumnya.sumber;
        } else {
          if (!metaRegistri && !info) {
            throw new Error(
              `Kesalahan dependency:\npaket '${namaDep}' versi '${batasanVersi}' tidak ditemukan pada registri lokal atau direktori paket.`
            );
          }

          // Cari versi yang kompatibel
          const daftarVersi = metaRegistri
            ? Object.keys(metaRegistri.daftarVersi)
            : Object.keys(info!.daftarVersi);

          const kandidatVersi = daftarVersi.sort((a, b) => {
            try {
              return bandingkanVersi(uraiVersi(b), uraiVersi(a));
            } catch {
              return b.localeCompare(a);
            }
          });

          const cocok = kandidatVersi.find(v => apakahKompatibel(v, batasanVersi));
          if (!cocok) {
            throw new Error(
              `Kesalahan dependency:\nversi package '${namaDep}' tidak dapat memenuhi kebutuhan dependency '${batasanVersi}'.`
            );
          }

          versiTerpilih = cocok;
          sumberTerpilih = `registri:${namaDep}@${versiTerpilih}`;
        }

        // Cek cache terlebih dahulu (jika tidak dilewati)
        const checksumHarapan = entriKunciSebelumnya?.integritas;
        if (!opsi?.lewatiCache && this.cache.apakahAda(namaDep, versiTerpilih, checksumHarapan)) {
          const hasilCache = this.cache.ambil(namaDep, versiTerpilih, checksumHarapan);
          if (hasilCache.ditemukan && hasilCache.integritasValid && hasilCache.berkas) {
            berkasPaket = hasilCache.berkas;
            if (berkasPaket['nusantara.toml']) {
              manifestDep = bacaManifest(berkasPaket['nusantara.toml']);
            }
          }
        }

        // Ambil dari registry jika belum ada dari cache
        if (Object.keys(berkasPaket).length === 0) {
          if (metaRegistri && metaRegistri.daftarVersi[versiTerpilih]) {
            const arsip = this.registriLokal.unduh(namaDep, versiTerpilih);
            berkasPaket = arsip.berkas;
          } else if (info) {
            berkasPaket = this.registry.ambilBerkasPaket(namaDep, versiTerpilih);
          }

          if (berkasPaket['nusantara.toml']) {
            manifestDep = bacaManifest(berkasPaket['nusantara.toml']);
          }
          // Simpan ke cache untuk instalasi mendatang
          try {
            this.cache.simpan(namaDep, versiTerpilih, berkasPaket, checksumHarapan);
          } catch {
            // Abaikan kesalahan penulisan cache
          }
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

      // Verifikasi integritas dengan lockfile jika dalam mode terkunci
      if (opsi?.terkunci && entriKunciSebelumnya && entriKunciSebelumnya.integritas) {
        if (entriKunciSebelumnya.integritas !== hash) {
          throw new Error(
            `Verifikasi integritas GAGAL untuk paket '${namaDep}@${versiTerpilih}'.\n` +
            `Hash diharapkan (nusantara.lock): ${entriKunciSebelumnya.integritas}\n` +
            `Hash aktual terpasang           : ${hash}`
          );
        }
      }

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

    // 4. Perbarui atau tulis berkas nusantara.lock (jika tidak dalam mode terkunci yang identik)
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
   * Menambahkan dependensi baru ke proyek: nusantara tambah <nama> [<batasan>]
   */
  public tambah(
    namaPaket: string,
    batasanVersi?: string,
    opsi?: { path?: string }
  ): HasilEksekusiCLI {
    validasiNamaPaket(namaPaket);

    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(`Berkas 'nusantara.toml' tidak ditemukan di ${this.direktoriProyek}.`);
    }

    const manifest = bacaManifest(this.pembaca.baca(jalurManifest));

    if (opsi?.path) {
      manifest.dependensi[namaPaket] = { path: opsi.path };
    } else {
      manifest.dependensi[namaPaket] = batasanVersi || '^1.0.0';
    }

    this.tulisBerkasAman(jalurManifest, tulisManifest(manifest));

    // Pasang dependensi secara langsung
    const hasilPasang = this.pasang();

    return {
      sukses: true,
      pesan: `Dependensi '${namaPaket}' (${typeof manifest.dependensi[namaPaket] === 'string' ? manifest.dependensi[namaPaket] : JSON.stringify(manifest.dependensi[namaPaket])}) berhasil ditambahkan ke nusantara.toml.`,
      data: {
        nama: namaPaket,
        dependensi: manifest.dependensi[namaPaket],
        hasilPasang,
      },
    };
  }

  /**
   * Mengosongkan cache lokal ekosistem paket NUSANTARA: nusantara bersihkan-cache
   */
  public bersihkanCache(): HasilEksekusiCLI {
    const hasil = this.cache.bersihkanSemua();
    return {
      sukses: true,
      pesan: `Cache paket NUSANTARA berhasil dibersihkan (${hasil.jumlahDihapus} paket, ${hasil.ukuranByte} byte dihapus).`,
      data: hasil,
    };
  }

  /**
   * Menghasilkan representasi visual pohon dependensi proyek: nusantara pohon (Phase 27).
   */
  public dapatkanPohonDependensi(akarAwal?: string): string {
    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(`Berkas 'nusantara.toml' tidak ditemukan.`);
    }

    const manifest = bacaManifest(this.pembaca.baca(jalurManifest));
    const graf = new GrafDependensi();

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

    const jalurLock = this.dapatkanJalurLock();
    if (this.pembaca.apakahAda(jalurLock)) {
      try {
        const lock = bacaLock(this.pembaca.baca(jalurLock));
        for (const p of lock.paket) {
          graf.tambahSimpul({
            nama: p.nama,
            versi: p.versi,
            sumber: p.sumber,
            dependensi: p.dependensi || {},
          });
        }
      } catch {
        // Abaikan jika lock rusak
      }
    }

    return graf.formatPohon(akarAwal || manifest.nusantara.nama);
  }

  /**
   * Melakukan audit keamanan dependensi, integritas lockfile, dan cache proyek (Phase 27).
   */
  public audit(): HasilAuditKeamanan & { integritasLockValid: boolean; galatIntegritas: string[] } {
    const jalurManifest = this.dapatkanJalurManifest();
    if (!this.pembaca.apakahAda(jalurManifest)) {
      throw new Error(`Berkas 'nusantara.toml' tidak ditemukan.`);
    }

    const manifest = bacaManifest(this.pembaca.baca(jalurManifest));
    const graf = new GrafDependensi();

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

    const jalurLock = this.dapatkanJalurLock();
    const galatIntegritas: string[] = [];
    let integritasLockValid = true;

    if (this.pembaca.apakahAda(jalurLock)) {
      try {
        const lock = bacaLock(this.pembaca.baca(jalurLock));
        const dirPaket = this.dapatkanDirektoriPaket();

        for (const p of lock.paket) {
          graf.tambahSimpul({
            nama: p.nama,
            versi: p.versi,
            sumber: p.sumber,
            dependensi: p.dependensi || {},
          });

          // Verifikasi integritas direktori fisik paket
          const jalurFisik = this.pembaca.gabungJalur(dirPaket, p.nama);
          if (this.pembaca.apakahAda(jalurFisik)) {
            const berkas = this.kumpulkanSemuaBerkasDirektori(jalurFisik);
            let ringkasan = '';
            for (const [, isi] of Object.entries(berkas)) {
              ringkasan += isi;
            }
            const hashAktual = hitungChecksum(ringkasan || `${p.nama}@${p.versi}`);
            if (p.integritas && p.integritas !== hashAktual) {
              integritasLockValid = false;
              galatIntegritas.push(
                `Paket '${p.nama}@${p.versi}' tidak cocok dengan nusantara.lock (diharapkan: ${p.integritas}, aktual: ${hashAktual})`
              );
            }
          }
        }
      } catch (e: any) {
        integritasLockValid = false;
        galatIntegritas.push(`Gagal membaca lockfile: ${e.message}`);
      }
    }

    const hasilAuditGraf = graf.auditKeamanan();
    const temuanGabungan = [...hasilAuditGraf.temuan, ...galatIntegritas];

    return {
      ...hasilAuditGraf,
      aman: hasilAuditGraf.aman && integritasLockValid,
      integritasLockValid,
      galatIntegritas,
      temuan: temuanGabungan,
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
  // PHASE 22 — PACKAGE ECOSYSTEM & REGISTRY EXTENSIONS
  // ==========================================================================

  /**
   * Memeriksa dan memvalidasi kelayakan paket: nusantara paket cek
   */
  public cek(direktoriSasaran?: string): LaporanValidasiPaket {
    const target = direktoriSasaran
      ? this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(direktoriSasaran))
      : this.direktoriProyek;
    const validator = new ValidatorPaket(this.pembaca);
    return validator.validasi(target);
  }

  /**
   * Membangun berkas arsip paket (.npk): nusantara paket bangun
   */
  public bangun(
    direktoriSasaran?: string,
    opsi?: { jalurKeluaran?: string; lewatiUji?: boolean } | string
  ): ArsipPaketData {
    const target = direktoriSasaran
      ? this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(direktoriSasaran))
      : this.direktoriProyek;

    const opsiObj = typeof opsi === 'string' ? { jalurKeluaran: opsi } : opsi;

    if (!opsiObj?.lewatiUji) {
      const laporan = this.cek(target);
      if (!laporan.valid) {
        throw new Error(
          `Validasi paket '${laporan.nama}' gagal. Tidak dapat membangun arsip release:\n` +
            laporan.daftarGalat.map(g => `  • ${g}`).join('\n')
        );
      }
    }

    const jalurManifest = this.pembaca.gabungJalur(target, 'nusantara.toml');
    const manifest = bacaManifest(this.pembaca.baca(jalurManifest));
    const daftarBerkas = this.kumpulkanSemuaBerkasDirektori(target);

    const arsip = buatArsipPaket(manifest, daftarBerkas);

    // Tulis arsip ke .nusantara/dist/<nama>-<versi>.npk atau jalur yang ditentukan
    let jalurArsipKeluar = '';
    if (opsiObj?.jalurKeluaran) {
      jalurArsipKeluar = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(opsiObj.jalurKeluaran));
      if (!jalurArsipKeluar.endsWith('.npk')) {
        jalurArsipKeluar = this.pembaca.gabungJalur(
          jalurArsipKeluar,
          `${manifest.nusantara.nama}-${manifest.nusantara.versi}.npk`
        );
      }
    } else {
      jalurArsipKeluar = this.pembaca.gabungJalur(
        target,
        '.nusantara',
        'dist',
        `${manifest.nusantara.nama}-${manifest.nusantara.versi}.npk`
      );
    }

    this.tulisBerkasAman(jalurArsipKeluar, arsip.kontenSerial);
    return arsip;
  }

  /**
   * Menerbitkan paket ke registri: nusantara paket terbit
   */
  public terbitkan(
    direktoriSasaran?: string,
    opsi?: { registriTarget?: AntarmukaRegistri; token?: string; lewatiUji?: boolean }
  ): HasilPenerbitanPaket {
    const target = direktoriSasaran
      ? this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(direktoriSasaran))
      : this.direktoriProyek;

    const arsip = this.bangun(target, { lewatiUji: opsi?.lewatiUji });
    const registri = opsi?.registriTarget || this.dapatkanRegistriLokal();
    return (registri as any).terbitkan(arsip, { token: opsi?.token }) as HasilPenerbitanPaket;
  }

  /**
   * Mencari paket di registri: nusantara paket cari <kueri>
   */
  public cari(
    kueri: string,
    registriTarget?: AntarmukaRegistri
  ): HasilPencarianPaket[] {
    const registri = registriTarget || this.dapatkanRegistriLokal();
    return (registri as any).cari(kueri) as HasilPencarianPaket[];
  }

  /**
   * Menampilkan informasi paket dari registri: nusantara paket info <nama>
   */
  public infoPaketRegistri(
    nama: string,
    registriTarget?: AntarmukaRegistri
  ): MetadataPaketRegistri | null {
    const registri = registriTarget || this.dapatkanRegistriLokal();
    return (registri as any).dapatkanMetadata(nama) as MetadataPaketRegistri | null;
  }

  /**
   * Memasang paket dari registri atau jalur paket lokal ke proyek saat ini: nusantara paket pasang <nama>
   */
  public pasangPaket(
    namaAtauJalur: string,
    opsi?: { versi?: string; batasan?: string; registri?: AntarmukaRegistri; offline?: boolean }
  ): HasilEksekusiCLI {
    const registri = opsi?.registri || this.dapatkanRegistriLokal();
    const namaPaket = namaAtauJalur.trim();

    // 1. Cek apakah nama berupa direktori paket lokal
    const apakahJalur =
      namaPaket.startsWith('./') ||
      namaPaket.startsWith('../') ||
      namaPaket.startsWith('/') ||
      namaPaket.includes('/');
    if (apakahJalur && this.pembaca.apakahAda(this.pembaca.gabungJalur(namaPaket, 'nusantara.toml'))) {
      const manifestPath = this.pembaca.gabungJalur(namaPaket, 'nusantara.toml');
      const manifestLokal = bacaManifest(this.pembaca.baca(manifestPath));
      const jalurManifest = this.dapatkanJalurManifest();
      if (this.pembaca.apakahAda(jalurManifest)) {
        const manifestProyek = bacaManifest(this.pembaca.baca(jalurManifest));
        manifestProyek.dependensi[manifestLokal.nusantara.nama] = { path: namaPaket };
        this.tulisBerkasAman(jalurManifest, tulisManifest(manifestProyek));
      }
      return this.pasang();
    }

    // 2. Ambil dari Registri (atau Offline Cache)
    validasiNamaPaket(namaPaket);
    const meta = (registri as any).dapatkanMetadata(namaPaket) as MetadataPaketRegistri | null;
    if (!meta) {
      throw new Error(
        `Paket '${namaPaket}' tidak ditemukan di registri ${registri.nama}.\nGunakan 'nusantara paket cari ${namaPaket}' untuk menemukan paket yang relevan.`
      );
    }

    // Pilih versi terbaik yang sesuai dengan batasan
    const batasan = opsi?.batasan || '*';
    const daftarVersi = Object.keys(meta.daftarVersi).sort((a, b) => {
      try {
        return bandingkanVersi(uraiVersi(b), uraiVersi(a));
      } catch {
        return b.localeCompare(a);
      }
    });

    const versiTerpilih = daftarVersi.find(v => apakahKompatibel(v, batasan));
    if (!versiTerpilih) {
      throw new Error(
        `Tidak ada versi paket '${namaPaket}' yang memenuhi batasan '${batasan}'.\nVersi tersedia: ${daftarVersi.join(', ')}`
      );
    }

    const infoVersi = meta.daftarVersi[versiTerpilih];
    const jalurCache = this.pembaca.gabungJalur(
      this.direktoriProyek,
      '.nusantara',
      'cache',
      'paket',
      `${namaPaket}-${versiTerpilih}-${infoVersi.checksum.slice(0, 12)}`
    );

    let arsip: ArsipPaketData;
    if (opsi?.offline && this.pembaca.apakahAda(this.pembaca.gabungJalur(jalurCache, 'nusantara.toml'))) {
      // Pasang dari cache lokal (Mode Offline)
      const daftarBerkasCache = this.kumpulkanSemuaBerkasDirektori(jalurCache);
      const manifestCache = bacaManifest(this.pembaca.baca(this.pembaca.gabungJalur(jalurCache, 'nusantara.toml')));
      arsip = buatArsipPaket(manifestCache, daftarBerkasCache);
    } else {
      // Unduh dari registri
      arsip = (registri as any).unduh(namaPaket, versiTerpilih) as ArsipPaketData;

      // Verifikasi Integritas SHA-256
      if (infoVersi.checksum && arsip.checksum !== infoVersi.checksum) {
        throw new Error(
          `Verifikasi integritas paket '${namaPaket}@${versiTerpilih}' GAGAL!\n` +
            `Checksum yang diharapkan: ${infoVersi.checksum}\n` +
            `Checksum yang diterima  : ${arsip.checksum}`
        );
      }

      // Simpan salinan ke cache offline
      ekstrakArsipPaket(arsip, this.pembaca, jalurCache);
    }

    // Ekstrak berkas paket ke direktori proyek .nusantara/paket/<nama>/
    const dirTujuan = this.pembaca.gabungJalur(this.dapatkanDirektoriPaket(), namaPaket);
    this.hapusDirektoriRekursif(dirTujuan);
    ekstrakArsipPaket(arsip, this.pembaca, dirTujuan);

    // Perbarui manifest nusantara.toml jika ada
    const jalurManifest = this.dapatkanJalurManifest();
    if (this.pembaca.apakahAda(jalurManifest)) {
      try {
        const manifestProyek = bacaManifest(this.pembaca.baca(jalurManifest));
        manifestProyek.dependensi[namaPaket] = `^${versiTerpilih}`;
        this.tulisBerkasAman(jalurManifest, tulisManifest(manifestProyek));
      } catch {
        // Abaikan jika manifest belum ada
      }
    }

    // Perbarui lockfile nusantara.lock
    const jalurLock = this.dapatkanJalurLock();
    let lock: BerkasKunci = { versi_format: 1, paket: [] };
    if (this.pembaca.apakahAda(jalurLock)) {
      try {
        lock = bacaLock(this.pembaca.baca(jalurLock));
      } catch {
        lock = { versi_format: 1, paket: [] };
      }
    }

    // Hapus entri lama jika ada dan tambahkan yang baru
    lock.paket = lock.paket.filter(p => p.nama !== namaPaket);
    lock.paket.push({
      nama: namaPaket,
      versi: versiTerpilih,
      sumber: `registri:${registri.nama}`,
      integritas: arsip.checksum,
      dependensi: infoVersi.dependensi,
    });
    this.tulisBerkasAman(jalurLock, tulisLock(lock));

    return {
      sukses: true,
      pesan: `Paket '${namaPaket}@${versiTerpilih}' berhasil dipasang dari registri ${registri.nama}.`,
      data: {
        nama: namaPaket,
        versi: versiTerpilih,
        checksum: arsip.checksum,
        lokasi: dirTujuan,
      },
    };
  }

  private kumpulkanSemuaBerkasDirektori(direktori: string): Record<string, string> {
    const hasil: Record<string, string> = {};
    const normDir = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(direktori));

    if (typeof (this.pembaca as any).dapatkanSemuaBerkas === 'function') {
      const semua = (this.pembaca as any).dapatkanSemuaBerkas() as Map<string, string>;
      for (const [jalur, konten] of semua.entries()) {
        const normJalur = this.pembaca.normalisasiJalur(jalur);
        if (normJalur.startsWith(normDir === '/' ? '/' : normDir + '/')) {
          const relatif = normJalur.slice(normDir.length + 1).replace(/^[/\\]+/, '');
          if (!apakahHarusDiabaikan(relatif)) {
            hasil[relatif] = konten;
          }
        }
      }
      return hasil;
    }

    // Fallback pindai disk fisik rekursif
    const pindai = (subDir: string) => {
      let entri: string[] = [];
      if (typeof (this.pembaca as any).daftarDirektori === 'function') {
        try {
          entri = (this.pembaca as any).daftarDirektori(subDir) || [];
        } catch {
          entri = [];
        }
      }

      for (const item of entri) {
        if (apakahHarusDiabaikan(item)) continue;
        const lengkap = this.pembaca.gabungJalur(subDir, item);
        const isDir =
          typeof (this.pembaca as any).apakahDirektori === 'function'
            ? (this.pembaca as any).apakahDirektori(lengkap)
            : false;

        if (isDir) {
          pindai(lengkap);
        } else {
          const relatif = lengkap.slice(normDir.length + 1).replace(/^[/\\]+/, '');
          if (!apakahHarusDiabaikan(relatif)) {
            hasil[relatif] = this.pembaca.baca(lengkap);
          }
        }
      }
    };

    pindai(normDir);
    return hasil;
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
