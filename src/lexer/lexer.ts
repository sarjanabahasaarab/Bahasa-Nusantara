/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber, klonaPosisi } from './posisi';
import { JenisToken, Token, buatToken } from './jenisToken';
import { periksaKataKunci } from './keyword';
import {
  GalatLexer,
  buatGalatKarakterIlegal,
  buatGalatTeksTidakDitutup,
  buatGalatKarakterTidakDitutup,
  buatGalatAngkaTidakValid,
  buatGalatUrutanLolosTidakValid,
} from './galat';

export interface OpsiLexer {
  /** Apakah menyertakan token pemisah BARIS_BARU dalam aliran token (default: true) */
  sertakanBarisBaru?: boolean;
  /** Apakah melempar exception saat menemukan karakter tak dikenal (default: false, dicatat ke array galat) */
  lemparGalat?: boolean;
}

/**
 * Penganalisis Leksikal (Lexer) Resmi Bahasa NUSANTARA (Phase 6).
 * Membaca kode sumber teks UTF-8 dan mengubahnya menjadi rangkaian token terstruktur.
 */
export class Lexer {
  private readonly sumber: string;
  private readonly panjang: number;
  private readonly opsi: Required<OpsiLexer>;

  private posisiSaatIni: PosisiSumber;
  private daftarGalat: GalatLexer[] = [];

  constructor(sumber: string, opsi?: OpsiLexer) {
    this.sumber = sumber;
    this.panjang = sumber.length;
    this.opsi = {
      sertakanBarisBaru: opsi?.sertakanBarisBaru ?? true,
      lemparGalat: opsi?.lemparGalat ?? false,
    };
    this.posisiSaatIni = {
      baris: 1,
      kolom: 1,
      indeks: 0,
    };
  }

  /**
   * Mengambil seluruh daftar galat yang ditemukan selama proses tokenisasi.
   */
  public dapatkanDaftarGalat(): ReadonlyArray<GalatLexer> {
    return this.daftarGalat;
  }

  /**
   * Melakukan pemindaian keseluruhan kode sumber dan menghasilkan array Token lengkap.
   */
  public tokenisasi(): { token: Token[]; galat: GalatLexer[] } {
    const hasil: Token[] = [];
    let tok: Token;

    do {
      tok = this.bacaTokenBerikutnya();
      hasil.push(tok);
    } while (tok.jenis !== JenisToken.EOF);

    return {
      token: hasil,
      galat: [...this.daftarGalat],
    };
  }

  /**
   * Membaca satu token berikutnya dari aliran kode sumber.
   */
  public bacaTokenBerikutnya(): Token {
    this.lewatiSpasiDanKomentar();

    if (this.sudahSelesai()) {
      const pos = klonaPosisi(this.posisiSaatIni);
      return buatToken(JenisToken.EOF, '', pos, pos);
    }

    const c = this.karakterSekarang();
    const posAwal = klonaPosisi(this.posisiSaatIni);

    // 1. Baris Baru (\n)
    if (c === '\n') {
      this.maju();
      if (this.opsi.sertakanBarisBaru) {
        return buatToken(JenisToken.BARIS_BARU, '\n', posAwal, klonaPosisi(this.posisiSaatIni));
      }
      return this.bacaTokenBerikutnya();
    }

    // 2. Pemisah & Tanda Baca (Satu Karakter)
    switch (c) {
      case '(':
        this.maju();
        return buatToken(JenisToken.KURUNG_BUKA, '(', posAwal, klonaPosisi(this.posisiSaatIni));
      case ')':
        this.maju();
        return buatToken(JenisToken.KURUNG_TUTUP, ')', posAwal, klonaPosisi(this.posisiSaatIni));
      case '[':
        this.maju();
        return buatToken(JenisToken.SIKU_BUKA, '[', posAwal, klonaPosisi(this.posisiSaatIni));
      case ']':
        this.maju();
        return buatToken(JenisToken.SIKU_TUTUP, ']', posAwal, klonaPosisi(this.posisiSaatIni));
      case '{':
        this.maju();
        return buatToken(JenisToken.KURAWAL_BUKA, '{', posAwal, klonaPosisi(this.posisiSaatIni));
      case '}':
        this.maju();
        return buatToken(JenisToken.KURAWAL_TUTUP, '}', posAwal, klonaPosisi(this.posisiSaatIni));
      case ',':
        this.maju();
        return buatToken(JenisToken.KOMA, ',', posAwal, klonaPosisi(this.posisiSaatIni));
      case ':':
        this.maju();
        return buatToken(JenisToken.TITIK_DUA, ':', posAwal, klonaPosisi(this.posisiSaatIni));
      case '.':
        this.maju();
        return buatToken(JenisToken.TITIK, '.', posAwal, klonaPosisi(this.posisiSaatIni));
      case '+':
        this.maju();
        return buatToken(JenisToken.OP_TAMBAH, '+', posAwal, klonaPosisi(this.posisiSaatIni));
      case '-':
        this.maju();
        return buatToken(JenisToken.OP_KURANG, '-', posAwal, klonaPosisi(this.posisiSaatIni));
      case '*':
        this.maju();
        return buatToken(JenisToken.OP_KALI, '*', posAwal, klonaPosisi(this.posisiSaatIni));
      case '/':
        // Komentar sudah ditangani di lewatiSpasiDanKomentar, jadi ini murni operator bagi
        this.maju();
        return buatToken(JenisToken.OP_BAGI, '/', posAwal, klonaPosisi(this.posisiSaatIni));
      case '%':
        this.maju();
        return buatToken(JenisToken.OP_MODULO, '%', posAwal, klonaPosisi(this.posisiSaatIni));
      case '=':
        this.maju();
        if (this.karakterSekarang() === '=') {
          this.maju();
          return buatToken(JenisToken.OP_KESETARAAN, '==', posAwal, klonaPosisi(this.posisiSaatIni));
        }
        return buatToken(JenisToken.OP_SAMA_DENGAN, '=', posAwal, klonaPosisi(this.posisiSaatIni));
      case '!':
        this.maju();
        if (this.karakterSekarang() === '=') {
          this.maju();
          return buatToken(JenisToken.OP_KETIDAKSAMAAN, '!=', posAwal, klonaPosisi(this.posisiSaatIni));
        }
        return this.tanganiKarakterIlegal('!', posAwal);
      case '<':
        this.maju();
        if (this.karakterSekarang() === '=') {
          this.maju();
          return buatToken(JenisToken.OP_LEBIH_KECIL_SAMA, '<=', posAwal, klonaPosisi(this.posisiSaatIni));
        }
        return buatToken(JenisToken.OP_LEBIH_KECIL, '<', posAwal, klonaPosisi(this.posisiSaatIni));
      case '>':
        this.maju();
        if (this.karakterSekarang() === '=') {
          this.maju();
          return buatToken(JenisToken.OP_LEBIH_BESAR_SAMA, '>=', posAwal, klonaPosisi(this.posisiSaatIni));
        }
        return buatToken(JenisToken.OP_LEBIH_BESAR, '>', posAwal, klonaPosisi(this.posisiSaatIni));
      case '"':
        return this.bacaLiteralTeks(posAwal);
      case "'":
        return this.bacaLiteralKarakter(posAwal);
    }

    // 3. Literal Angka (Bilangan Bulat & Desimal)
    if (this.apakahDigit(c)) {
      return this.bacaLiteralAngka(posAwal);
    }

    // 4. Pengidentifikasi (Identifier) & Kata Kunci (Keyword)
    if (this.apakahAwalPengidentifikasi(c)) {
      return this.bacaPengidentifikasiAtauKataKunci(posAwal);
    }

    // 5. Karakter Tak Dikenal / Ilegal
    const karakterIlegal = c;
    this.maju();
    return this.tanganiKarakterIlegal(karakterIlegal, posAwal);
  }

  // --- PEMBACAAN LITERAL & TOKENS ---

  private bacaLiteralTeks(posAwal: PosisiSumber): Token {
    this.maju(); // Lewati tanda kutip pembuka "
    let nilai = '';

    while (!this.sudahSelesai() && this.karakterSekarang() !== '"') {
      const c = this.karakterSekarang();

      if (c === '\n') {
        const galat = buatGalatTeksTidakDitutup(posAwal, this.dapatkanBarisTeks(posAwal.baris));
        this.catatGalat(galat);
        return buatToken(JenisToken.ILEGAL, nilai, posAwal, klonaPosisi(this.posisiSaatIni));
      }

      if (c === '\\') {
        this.maju();
        if (this.sudahSelesai()) break;
        const lolos = this.karakterSekarang();
        switch (lolos) {
          case 'n': nilai += '\n'; break;
          case 't': nilai += '\t'; break;
          case 'r': nilai += '\r'; break;
          case '"': nilai += '"'; break;
          case '\\': nilai += '\\'; break;
          default: {
            const galat = buatGalatUrutanLolosTidakValid(lolos, klonaPosisi(this.posisiSaatIni));
            this.catatGalat(galat);
            nilai += '\\' + lolos;
            break;
          }
        }
        this.maju();
      } else {
        nilai += c;
        this.maju();
      }
    }

    if (this.sudahSelesai() && this.karakterSekarang() !== '"') {
      const galat = buatGalatTeksTidakDitutup(posAwal, this.dapatkanBarisTeks(posAwal.baris));
      this.catatGalat(galat);
      return buatToken(JenisToken.ILEGAL, nilai, posAwal, klonaPosisi(this.posisiSaatIni));
    }

    this.maju(); // Lewati tanda kutip penutup "
    return buatToken(JenisToken.LITERAL_TEKS, nilai, posAwal, klonaPosisi(this.posisiSaatIni));
  }

  private bacaLiteralKarakter(posAwal: PosisiSumber): Token {
    this.maju(); // Lewati kutip tunggal pembuka '
    let nilai = '';

    if (!this.sudahSelesai() && this.karakterSekarang() !== "'") {
      nilai += this.karakterSekarang();
      this.maju();
    }

    if (this.karakterSekarang() !== "'") {
      const galat = buatGalatKarakterTidakDitutup(posAwal, this.dapatkanBarisTeks(posAwal.baris));
      this.catatGalat(galat);
      return buatToken(JenisToken.ILEGAL, nilai, posAwal, klonaPosisi(this.posisiSaatIni));
    }

    this.maju(); // Lewati kutip tunggal penutup '
    return buatToken(JenisToken.LITERAL_KARAKTER, nilai, posAwal, klonaPosisi(this.posisiSaatIni));
  }

  private bacaLiteralAngka(posAwal: PosisiSumber): Token {
    let teksAngka = '';
    let jumlahTitik = 0;

    while (!this.sudahSelesai()) {
      const c = this.karakterSekarang();
      if (this.apakahDigit(c)) {
        teksAngka += c;
        this.maju();
      } else if (c === '.') {
        // Lihat karakter setelah titik
        const karakterBerikutnya = this.karakterBerikutnya();
        if (this.apakahDigit(karakterBerikutnya)) {
          teksAngka += '.';
          jumlahTitik++;
          this.maju();
        } else {
          // Jika titik diikuti selain angka, hentikan pembacaan angka (titik adalah token terpisah)
          break;
        }
      } else {
        break;
      }
    }

    // Periksa apakah format angka valid (tidak memiliki lebih dari 1 titik desimal)
    if (jumlahTitik > 1) {
      const galat = buatGalatAngkaTidakValid(teksAngka, posAwal, this.dapatkanBarisTeks(posAwal.baris));
      this.catatGalat(galat);
      return buatToken(JenisToken.ILEGAL, teksAngka, posAwal, klonaPosisi(this.posisiSaatIni));
    }

    const jenis = jumlahTitik === 1 ? JenisToken.LITERAL_DESIMAL : JenisToken.LITERAL_BILANGAN;
    return buatToken(jenis, teksAngka, posAwal, klonaPosisi(this.posisiSaatIni));
  }

  private bacaPengidentifikasiAtauKataKunci(posAwal: PosisiSumber): Token {
    let nama = '';

    while (!this.sudahSelesai() && this.apakahKarakterPengidentifikasi(this.karakterSekarang())) {
      nama += this.karakterSekarang();
      this.maju();
    }

    // Periksa apakah kata kunci
    const jenisKataKunci = periksaKataKunci(nama);
    if (jenisKataKunci) {
      return buatToken(jenisKataKunci, nama, posAwal, klonaPosisi(this.posisiSaatIni));
    }

    return buatToken(JenisToken.IDENTIFIER, nama, posAwal, klonaPosisi(this.posisiSaatIni));
  }

  private tanganiKarakterIlegal(c: string, pos: PosisiSumber): Token {
    const galat = buatGalatKarakterIlegal(c, pos, this.dapatkanBarisTeks(pos.baris));
    this.catatGalat(galat);
    return buatToken(JenisToken.ILEGAL, c, pos, klonaPosisi(this.posisiSaatIni));
  }

  private catatGalat(galat: GalatLexer): void {
    this.daftarGalat.push(galat);
    if (this.opsi.lemparGalat) {
      throw galat;
    }
  }

  // --- PEMBANTU PEMINDAIAN KARAKTER ---

  private lewatiSpasiDanKomentar(): void {
    while (!this.sudahSelesai()) {
      const c = this.karakterSekarang();

      // Lewati spasi, tab horizontal, carriage return
      if (c === ' ' || c === '\t' || c === '\r') {
        this.maju();
        continue;
      }

      // Lewati komentar satu baris //
      if (c === '/' && this.karakterBerikutnya() === '/') {
        // Lewati sampai ujung baris atau EOF
        while (!this.sudahSelesai() && this.karakterSekarang() !== '\n') {
          this.maju();
        }
        continue;
      }

      break;
    }
  }

  private karakterSekarang(): string {
    if (this.sudahSelesai()) return '\0';
    return this.sumber[this.posisiSaatIni.indeks];
  }

  private karakterBerikutnya(): string {
    const indeksBerikutnya = this.posisiSaatIni.indeks + 1;
    if (indeksBerikutnya >= this.panjang) return '\0';
    return this.sumber[indeksBerikutnya];
  }

  private maju(): void {
    if (this.sudahSelesai()) return;

    const c = this.sumber[this.posisiSaatIni.indeks];
    this.posisiSaatIni.indeks++;

    if (c === '\n') {
      this.posisiSaatIni.baris++;
      this.posisiSaatIni.kolom = 1;
    } else {
      this.posisiSaatIni.kolom++;
    }
  }

  private sudahSelesai(): boolean {
    return this.posisiSaatIni.indeks >= this.panjang;
  }

  private apakahDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private apakahAwalPengidentifikasi(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private apakahKarakterPengidentifikasi(c: string): boolean {
    return this.apakahAwalPengidentifikasi(c) || this.apakahDigit(c);
  }

  private dapatkanBarisTeks(nomorBaris: number): string | undefined {
    const barisArr = this.sumber.split('\n');
    return barisArr[nomorBaris - 1];
  }
}
