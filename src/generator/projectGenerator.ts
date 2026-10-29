/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Mesin Generator Proyek Terpadu & Aman
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';
import {
  OpsiGenerator,
  HasilGenerator,
  KonteksPlaceholder,
  DefinisiTemplate,
} from './types';
import { validasiNamaProyek } from './nameValidator';
import { validasiJalurTujuan, periksaJalurBerkasAman } from './pathValidator';
import {
  renderKontenTemplate,
  kePascalCase,
  keSnakeCase,
} from './templateRenderer';
import { hasilkanKontenToml, hasilkanKontenJson } from './manifestWriter';
import { TemplateRegistry } from './templateRegistry';
import { ValidatorProyek } from './projectValidator';
import { VERSI_NUSANTARA } from '../konstanta/versi';

export class ProjectGenerator {
  private pembaca: PembacaBerkas;
  private registry: TemplateRegistry;
  private validator: ValidatorProyek;

  constructor(pembaca: PembacaBerkas, registry?: TemplateRegistry) {
    this.pembaca = pembaca;
    this.registry = registry || new TemplateRegistry();
    this.validator = new ValidatorProyek(pembaca);
  }

  public dapatkanRegistry(): TemplateRegistry {
    return this.registry;
  }

  /**
   * Menghasilkan kerangka proyek baru secara aman, modular, dan atomik.
   */
  public buatProyek(opsi: OpsiGenerator): HasilGenerator {
    const berkasDibuat: string[] = [];

    try {
      // 1. Validasi nama proyek
      const hasilNama = validasiNamaProyek(opsi.namaProyek);
      if (!hasilNama.valid) {
        return {
          sukses: false,
          pesan: hasilNama.pesan || 'Nama proyek tidak valid.',
          namaProyek: opsi.namaProyek,
          direktoriHasil: '',
          templateDigunakan: opsi.templateId || 'basic',
          berkasDibuat: [],
          petunjukLangkah: [],
          galat: hasilNama.pesan,
        };
      }
      const namaProyek = hasilNama.namaBersih!;

      // 2. Tentukan dan validasi template
      const templateId = (opsi.templateId || 'basic').toLowerCase();
      const definisiTemplate = this.registry.dapatkan(templateId);
      if (!definisiTemplate) {
        const daftarTersedia = this.registry.dapatkanDaftarId().join(', ');
        const pesan = `Template '${templateId}' tidak dikenal. Template yang tersedia: ${daftarTersedia}.`;
        return {
          sukses: false,
          pesan,
          namaProyek,
          direktoriHasil: '',
          templateDigunakan: templateId,
          berkasDibuat: [],
          petunjukLangkah: [],
          galat: pesan,
        };
      }

      // 3. Validasi lokasi tujuan
      const basis = opsi.direktoriBasis || '.';
      const hasilJalur = validasiJalurTujuan(
        this.pembaca,
        basis,
        namaProyek,
        { force: opsi.force }
      );

      if (!hasilJalur.valid) {
        return {
          sukses: false,
          pesan: hasilJalur.pesan || 'Lokasi tujuan tidak valid.',
          namaProyek,
          direktoriHasil: hasilJalur.jalurAbsolut,
          templateDigunakan: templateId,
          berkasDibuat: [],
          petunjukLangkah: [],
          galat: hasilJalur.pesan,
        };
      }

      const direktoriAkarProyek = hasilJalur.jalurAbsolut;

      // 4. Siapkan konteks rendering placeholder
      const tahunIni = opsi.tahun ? String(opsi.tahun) : String(new Date().getFullYear());
      const versiAwal = opsi.versiAwal || '0.1.0';
      const deskripsi = opsi.deskripsi || `${definisiTemplate.nama} - ${namaProyek}`;
      const penulis = opsi.penulis || 'Pengembang Nusantara';
      const lisensi = 'Apache-2.0';

      const konteks: KonteksPlaceholder = {
        NAMA_PROYEK: namaProyek,
        PASCAL_NAME: kePascalCase(namaProyek),
        SNAKE_NAME: keSnakeCase(namaProyek),
        DESKRIPSI_PROYEK: deskripsi,
        VERSI_PROYEK: versiAwal,
        PENULIS: penulis,
        TAHUN: tahunIni,
        VERSI_NUSANTARA: VERSI_NUSANTARA,
        LISENSI: lisensi,
      };

      // 5. Render dan tulis seluruh berkas template
      for (const itemBerkas of definisiTemplate.berkas) {
        const jalurAbsolutBerkas = periksaJalurBerkasAman(
          this.pembaca,
          direktoriAkarProyek,
          itemBerkas.jalur
        );

        const kontenTerender = renderKontenTemplate(itemBerkas.konten, konteks);
        this.tulisBerkasAman(jalurAbsolutBerkas, kontenTerender);
        berkasDibuat.push(jalurAbsolutBerkas);
      }

      // 6. Tentukan entryPoint untuk manifest
      let entryPointRelatif = 'src/utama.nusantara';
      if (templateId === 'library') {
        entryPointRelatif = 'src/lib.nusantara';
      }

      // 7. Tulis manifest nusantara.toml
      const jalurToml = periksaJalurBerkasAman(
        this.pembaca,
        direktoriAkarProyek,
        'nusantara.toml'
      );
      const kontenToml = hasilkanKontenToml({
        nama: namaProyek,
        versi: versiAwal,
        deskripsi,
        penulis,
        lisensi,
        template: templateId,
        entryPoint: entryPointRelatif,
        dependensi: definisiTemplate.dependensi,
      });
      this.tulisBerkasAman(jalurToml, kontenToml);
      berkasDibuat.push(jalurToml);

      // 8. Tulis manifest nusantara-project.json
      const jalurJson = periksaJalurBerkasAman(
        this.pembaca,
        direktoriAkarProyek,
        'nusantara-project.json'
      );
      const kontenJson = hasilkanKontenJson({
        nama: namaProyek,
        versi: versiAwal,
        deskripsi,
        penulis,
        lisensi,
        template: templateId,
        entryPoint: entryPointRelatif,
        dependensi: definisiTemplate.dependensi,
      });
      this.tulisBerkasAman(jalurJson, kontenJson);
      berkasDibuat.push(jalurJson);

      // 9. Validasi hasil proyek secara komprehensif
      const validasiHasil = this.validator.periksa(direktoriAkarProyek);
      if (!validasiHasil.valid) {
        const pesanGalat = `Proyek dihasilkan tetapi gagal dalam pemeriksaan validitas: ${validasiHasil.pesan.join(', ')}`;
        return {
          sukses: false,
          pesan: pesanGalat,
          namaProyek,
          direktoriHasil: direktoriAkarProyek,
          templateDigunakan: templateId,
          berkasDibuat,
          petunjukLangkah: [],
          galat: pesanGalat,
        };
      }

      // 10. Siapkan petunjuk langkah selanjutnya
      const petunjukLangkah = [
        `cd ${namaProyek}`,
        ...definisiTemplate.petunjukJalankan,
      ];

      return {
        sukses: true,
        pesan: `Proyek '${namaProyek}' berhasil dibuat menggunakan template '${templateId}'.`,
        namaProyek,
        direktoriHasil: direktoriAkarProyek,
        templateDigunakan: templateId,
        berkasDibuat,
        petunjukLangkah,
      };
    } catch (err: any) {
      // Pembersihan atomik pada kegagalan
      this.bersihkanBerkasParsial(berkasDibuat);

      return {
        sukses: false,
        pesan: `Gagal membuat proyek: ${err.message}`,
        namaProyek: opsi.namaProyek,
        direktoriHasil: '',
        templateDigunakan: opsi.templateId || 'basic',
        berkasDibuat,
        petunjukLangkah: [],
        galat: err.message,
      };
    }
  }

  private tulisBerkasAman(jalur: string, konten: string): void {
    if (typeof this.pembaca.tulis === 'function') {
      this.pembaca.tulis(jalur, konten);
    } else if (typeof (this.pembaca as any).tulisBerkas === 'function') {
      (this.pembaca as any).tulisBerkas(jalur, konten);
    } else {
      throw new Error(`Sistem berkas tidak mendukung operasi penulisan berkas.`);
    }
  }

  private bersihkanBerkasParsial(daftarBerkas: string[]): void {
    for (const jalur of daftarBerkas) {
      try {
        if (typeof (this.pembaca as any).hapusBerkas === 'function') {
          (this.pembaca as any).hapusBerkas(jalur);
        }
      } catch {
        // Pertahankan berkas jika tidak dapat dibersihkan secara aman
      }
    }
  }
}
