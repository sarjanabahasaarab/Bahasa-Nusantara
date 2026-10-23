/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KATALOG_MODUL_STANDAR } from '../../stdlib';
import {
  NodeProgram,
  NodeDeklarasiFungsi,
  NodeDeklarasiVariabel,
  NodeDeklarasiTetap,
  PernyataanAST,
  JenisNodeAST,
} from '../../parser/ast';
import { DokumenTeks } from '../documents/manajerDokumen';
import { HoverLSP, PosisiLSP } from '../protocol/types';

/**
 * Glosarium Ringkas Kata Kunci untuk Tooltip Hover Bahasa NUSANTARA.
 */
const DOKUMENTASI_KATA_KUNCI: Record<string, string> = {
  program: '**program**: Mendeklarasikan nama unit program utama aplikasi NUSANTARA.',
  mulai: '**mulai**: Menandai awal blok instruksi program atau tubuh fungsi.',
  selesai: '**selesai**: Menandai akhir blok instruksi program atau tubuh fungsi.',
  variabel: '**variabel**: Mendeklarasikan variabel dapat-ubah (mutable) dengan anotasi tipe statis.',
  tetap: '**tetap**: Mendeklarasikan konstanta tak-terubahkan (immutable) bernilai kekal.',
  fungsi: '**fungsi**: Mendeklarasikan fungsi dapat-dipanggil dengan daftar parameter dan tipe kembalian.',
  kembalikan: '**kembalikan**: Mengembalikan nilai dari fungsi ke pemanggil dan menghentikan eksekusi tubuh fungsi.',
  jika: '**jika**: Memulai struktur percabangan berbasis kondisi logika kebenaran.',
  maka: '**maka**: Menandai blok yang dieksekusi apabila kondisi percabangan bernilai `benar`.',
  selain: '**selain**: Menandai blok alternatif yang dieksekusi apabila kondisi bernilai `salah`.',
  akhir: '**akhir**: Menutup blok struktur percabangan `jika`.',
  selama: '**selama**: Memulai struktur perulangan berbasis kondisi logika (while loop).',
  untuk: '**untuk**: Memulai perulangan iterasi rentang bilangan numerik `dari ... sampai ...`.',
  dari: '**dari**: Menentukan nilai awal batas bawah pada perulangan `untuk`.',
  sampai: '**sampai**: Menentukan nilai akhir batas atas pada perulangan `untuk`.',
  lakukan: '**lakukan**: Memulai blok instruksi tubuh perulangan `selama` atau `untuk`.',
  hentikan: '**hentikan**: Menghentikan paksa perulangan iterasi saat ini (break).',
  lanjutkan: '**lanjutkan**: Melompati sisa instruksi dan melanjutkan ke iterasi perulangan berikutnya (continue).',
  modul: '**modul**: Mendeklarasikan nama modul berkas pustaka.',
  gunakan: '**gunakan**: Mengimpor modul eksternal atau modul standar ke dalam berkas aktif.',
  ekspor: '**ekspor**: Mengekspor fungsi, variabel, atau tipe agar dapat diakses oleh modul lain.',
  sebagai: '**sebagai**: Memberikan nama alias lokal untuk modul yang diimpor.',
  benar: '**benar**: Nilai kebenaran logika positif (true).',
  salah: '**salah**: Nilai kebenaran logika negatif (false).',
  kosong: '**kosong**: Nilai ketiadaan eksplisit (null / none).',
};

/**
 * Layanan Hover Tooltip Bahasa NUSANTARA.
 */
export class LayananHover {
  /**
   * Menghasilkan informasi hover pada posisi kursor.
   */
  public dapatkanHover(
    dokumen: DokumenTeks,
    posisi: PosisiLSP,
    program?: NodeProgram
  ): HoverLSP | null {
    const barisTeks = this.ambilBarisTeks(dokumen.konten, posisi.line);
    if (!barisTeks) return null;

    // Ambil kata dan token di sekitar kursor
    const tokenInfo = this.ekstrakTokenDiKursor(barisTeks, posisi.character);
    if (!tokenInfo) return null;

    const { kata, kataSebelumTitik } = tokenInfo;

    // 1. Cek apakah ini akses anggota modul: <modul>.<anggota>
    if (kataSebelumTitik) {
      let namaModul = kataSebelumTitik;
      // Cek alias modul di deklarasi impor
      if (program && program.daftarImpor) {
        for (const imp of program.daftarImpor) {
          if (imp.aliasModul === kataSebelumTitik) {
            namaModul = imp.sumberModul;
            break;
          }
        }
      }

      const metaModul = KATALOG_MODUL_STANDAR[namaModul];
      if (metaModul && metaModul.simbolEkspor.has(kata)) {
        const info = metaModul.simbolEkspor.get(kata)!;
        const isFungsi = info.kategori === 'fungsi' || (info as any).jenis === 'fungsi';
        const signature = isFungsi
          ? `${kataSebelumTitik}.${kata}(${(info.parameter || []).map(p => `${p.nama}: ${p.tipe}`).join(', ')}): ${info.tipeKembalian || 'kosong'}`
          : `${kataSebelumTitik}.${kata}: ${info.tipeData || 'sembarang'}`;

        return {
          contents: {
            kind: 'markdown',
            value: [
              `\`\`\`nusantara\n${signature}\n\`\`\``,
              `*Anggota Modul Standar:* \`${namaModul}\``,
              (info as any).deskripsi ? `\n\n${(info as any).deskripsi}` : '',
            ].join('\n'),
          },
        };
      }
    }

    // 2. Cek apakah simbol adalah nama Modul Standar
    if (KATALOG_MODUL_STANDAR[kata]) {
      const meta = KATALOG_MODUL_STANDAR[kata];
      const daftarFungsi = Array.from(meta.simbolEkspor.keys()).slice(0, 8).join(', ');
      return {
        contents: {
          kind: 'markdown',
          value: [
            `\`\`\`nusantara\nmodul "${kata}"\n\`\`\``,
            `**Modul Standar Resmi NUSANTARA**`,
            `\n${meta.deskripsi}`,
            `\n\n*Ekspor:* \`${daftarFungsi}...\``,
          ].join('\n'),
        },
      };
    }

    // 3. Cek apakah simbol adalah Fungsi Bawaan Bahasa
    if (kata === 'tampilkan') {
      return {
        contents: {
          kind: 'markdown',
          value: '```nusantara\nfungsi tampilkan(...nilai: sembarang): kosong\n```\n*Fungsi Bawaan*: Mencetak satu atau beberapa nilai ke konsol standar diikuti baris baru.',
        },
      };
    }
    if (kata === 'masukan') {
      return {
        contents: {
          kind: 'markdown',
          value: '```nusantara\nfungsi masukan(petunjuk?: teks): teks\n```\n*Fungsi Bawaan*: Menampilkan petunjuk ke pengguna dan membaca sebaris teks dari konsol.',
        },
      };
    }
    if (kata === 'panjang') {
      return {
        contents: {
          kind: 'markdown',
          value: '```nusantara\nfungsi panjang(target: teks | daftar | peta): bilangan\n```\n*Fungsi Bawaan*: Menghitung panjang karakter teks, jumlah elemen daftar, atau jumlah entri pasangan peta.',
        },
      };
    }

    // 4. Cek apakah simbol didefinisikan dalam AST Dokumen
    if (program) {
      // Cek apakah fungsi pengguna
      if (program.daftarFungsi) {
        for (const fn of program.daftarFungsi) {
          if (fn.nama === kata) {
            const params = fn.parameter.map(p => `${p.nama}: ${p.tipeData}`).join(', ');
            return {
              contents: {
                kind: 'markdown',
                value: [
                  `\`\`\`nusantara\nfungsi ${fn.nama}(${params}): ${fn.tipeKembalian || 'kosong'}\n\`\`\``,
                  `*Fungsi Pengguna* (dideklarasikan pada baris ${fn.posisi.awal.baris})`,
                ].join('\n'),
              },
            };
          }

          // Cek parameter fungsi jika kursor ada di dalam fungsi
          if (this.apakahPosisiDiDalamRentang(posisi, fn.posisi)) {
            for (const param of fn.parameter) {
              if (param.nama === kata) {
                return {
                  contents: {
                    kind: 'markdown',
                    value: `\`\`\`nusantara\n(parameter) ${param.nama}: ${param.tipeData}\n\`\`\`\nParameter fungsi \`${fn.nama}\``,
                  },
                };
              }
            }

            // Cek variabel lokal fungsi
            const varLokal = this.cariVariabelDiPernyataan(fn.tubuh, kata);
            if (varLokal) {
              return {
                contents: {
                  kind: 'markdown',
                  value: `\`\`\`nusantara\n(${varLokal.jenis}) ${varLokal.nama}: ${varLokal.tipe}\n\`\`\`\nVariabel lokal fungsi \`${fn.nama}\` (baris ${varLokal.baris})`,
                },
              };
            }
          }
        }
      }

      // Cek variabel tingkat program / tubuh utama
      if (program.tubuhUtama) {
        const varUtama = this.cariVariabelDiPernyataan(program.tubuhUtama, kata);
        if (varUtama) {
          return {
            contents: {
              kind: 'markdown',
              value: `\`\`\`nusantara\n(${varUtama.jenis}) ${varUtama.nama}: ${varUtama.tipe}\n\`\`\`\nVariabel program \`${program.namaProgram || 'utama'}\` (baris ${varUtama.baris})`,
            },
          };
        }
      }
    }

    // 5. Cek apakah kata kunci resmi
    if (DOKUMENTASI_KATA_KUNCI[kata]) {
      return {
        contents: {
          kind: 'markdown',
          value: DOKUMENTASI_KATA_KUNCI[kata],
        },
      };
    }

    return null;
  }

  private cariVariabelDiPernyataan(
    daftar: PernyataanAST[],
    nama: string
  ): { nama: string; tipe: string; jenis: string; baris: number } | null {
    for (const stmt of daftar) {
      if (stmt.jenis === JenisNodeAST.DEKLARASI_VARIABEL) {
        const v = stmt as NodeDeklarasiVariabel;
        if (v.nama === nama) {
          return { nama: v.nama, tipe: v.tipeData, jenis: 'variabel', baris: v.posisi.awal.baris };
        }
      } else if (stmt.jenis === JenisNodeAST.DEKLARASI_TETAP) {
        const t = stmt as NodeDeklarasiTetap;
        if (t.nama === nama) {
          return { nama: t.nama, tipe: t.tipeData, jenis: 'tetap (konstanta)', baris: t.posisi.awal.baris };
        }
      }
    }
    return null;
  }

  private ambilBarisTeks(konten: string, nomorBaris: number): string {
    const baris = konten.split('\n');
    return baris[nomorBaris] || '';
  }

  private ekstrakTokenDiKursor(
    barisTeks: string,
    kolom: number
  ): { kata: string; kataSebelumTitik?: string } | null {
    if (kolom > barisTeks.length) kolom = barisTeks.length;

    // Cari batas kata identifier di sekitar kolom kursor
    let awal = kolom;
    let akhir = kolom;

    const regexKarakter = /[a-zA-Z0-9_]/;

    // Geser ke belakang
    while (awal > 0 && regexKarakter.test(barisTeks[awal - 1])) {
      awal--;
    }
    // Geser ke depan
    while (akhir < barisTeks.length && regexKarakter.test(barisTeks[akhir])) {
      akhir++;
    }

    if (awal === akhir) return null;

    const kata = barisTeks.substring(awal, akhir);

    // Cek apakah ada awalan titik sebelum kata ini: <target>.<kata>
    let kataSebelumTitik: string | undefined;
    if (awal > 0 && barisTeks[awal - 1] === '.') {
      let awalModul = awal - 1;
      while (awalModul > 0 && regexKarakter.test(barisTeks[awalModul - 1])) {
        awalModul--;
      }
      kataSebelumTitik = barisTeks.substring(awalModul, awal - 1).trim();
    }

    return { kata, kataSebelumTitik };
  }

  private apakahPosisiDiDalamRentang(posisi: PosisiLSP, rentang: any): boolean {
    if (!rentang || !rentang.awal || !rentang.akhir) return false;
    const barisKursor = posisi.line + 1;
    return barisKursor >= rentang.awal.baris && barisKursor <= rentang.akhir.baris;
  }
}
