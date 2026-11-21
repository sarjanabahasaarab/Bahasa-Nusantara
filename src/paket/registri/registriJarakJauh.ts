/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArsipPaketData, uraiArsipPaket } from '../arsip';
import { validasiNamaPaket } from '../keamanan';
import {
  AntarmukaRegistri,
  MetadataPaketRegistri,
  MetadataVersiPaket,
  HasilPencarianPaket,
  HasilPenerbitanPaket,
  GalatRegistri,
  GalatImmutabilitasPaket,
} from './types';

export interface OpsiRegistriJarakJauh {
  urlBasis?: string;
  token?: string;
  waktuTungguMs?: number;
}

/**
 * Klien Registri Jarak Jauh (Remote Registry Client Foundation) NUSANTARA (Phase 22).
 * Menyediakan fondasi komunikasi API REST standar ke registry server resmi.
 */
export class RegistriJarakJauh implements AntarmukaRegistri {
  public readonly nama: string = 'registri-jarak-jauh';
  public readonly urlBasis: string;
  private readonly token?: string;
  private readonly waktuTungguMs: number;

  constructor(opsi?: OpsiRegistriJarakJauh | string) {
    if (typeof opsi === 'string') {
      this.urlBasis = this.normalisasiUrlBasis(opsi);
      this.waktuTungguMs = 5000;
    } else {
      this.urlBasis = this.normalisasiUrlBasis(opsi?.urlBasis || 'https://paket.nusantara.lang/api/v1');
      this.token = opsi?.token;
      const timeout = opsi?.waktuTungguMs ?? 5000;
      this.waktuTungguMs = Number.isFinite(timeout) && timeout > 0
        ? Math.min(120_000, Math.max(1, Math.floor(timeout)))
        : 5000;
    }
  }

  private normalisasiUrlBasis(nilai: string): string {
    let url: URL;
    try {
      url = new URL(nilai);
    } catch {
      throw new GalatRegistri('URL basis registri harus berupa URL absolut yang valid.');
    }
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new GalatRegistri('URL basis registri hanya boleh menggunakan HTTP(S), tanpa kredensial, query, atau fragment.');
    }
    return url.toString().replace(/\/+$/, '');
  }

  private async kirimPermintaan(endpoint: string, init: RequestInit): Promise<Response> {
    if (typeof fetch === 'undefined') {
      throw new Error('Lingkungan eksekusi tidak menyediakan fungsi fetch HTTP.');
    }
    if (typeof AbortController === 'undefined') {
      throw new Error('Lingkungan eksekusi tidak mendukung pembatalan permintaan HTTP.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.waktuTungguMs);
    try {
      return await this.kirimPermintaan(endpoint, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (controller.signal.aborted) {
        throw new Error(`Permintaan registri melewati batas waktu ${this.waktuTungguMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Mengambil metadata paket dari endpoint GET /paket/:nama
   */
  public async dapatkanMetadata(nama: string): Promise<MetadataPaketRegistri | null> {
    validasiNamaPaket(nama);
    const endpoint = `${this.urlBasis}/paket/${encodeURIComponent(nama)}`;

    try {
      if (typeof fetch === 'undefined') {
        throw new Error('Lingkungan eksekusi tidak menyediakan fungsi fetch HTTP.');
      }

      const res = await this.kirimPermintaan(endpoint, {
        method: 'GET',
        headers: this.buatHeader(),
      });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new GalatRegistri(`Gagal mengambil metadata paket '${nama}' (HTTP ${res.status}: ${res.statusText}).`);
      }

      const data = await res.json();
      if (
        !data ||
        typeof data !== 'object' ||
        data.nama !== nama ||
        !data.daftarVersi ||
        typeof data.daftarVersi !== 'object' ||
        Array.isArray(data.daftarVersi) ||
        typeof data.versiTerbaru !== 'string' ||
        !Object.prototype.hasOwnProperty.call(data.daftarVersi, data.versiTerbaru)
      ) {
        throw new GalatRegistri(`Metadata paket '${nama}' dari registri memiliki format tidak valid.`);
      }
      for (const [versi, info] of Object.entries(data.daftarVersi) as [string, any][]) {
        if (
          !info ||
          typeof info !== 'object' ||
          info.versi !== versi ||
          typeof info.checksum !== 'string' ||
          !/^sha256-[a-f0-9]{64}$/i.test(info.checksum) ||
          info.namaBerkasArsip !== `${nama}-${versi}.npk` ||
          typeof info.ukuranByte !== 'number' ||
          !Number.isSafeInteger(info.ukuranByte) ||
          info.ukuranByte < 0
        ) {
          throw new GalatRegistri(`Metadata versi '${versi}' paket '${nama}' tidak valid.`);
        }
      }
      return data as MetadataPaketRegistri;
    } catch (err: any) {
      if (err instanceof GalatRegistri) throw err;
      throw new GalatRegistri(
        `Koneksi ke registri daring (${this.urlBasis}) gagal saat mengambil paket '${nama}': ${err.message}`
      );
    }
  }

  /**
   * Mengambil detail versi tertentu dari endpoint GET /paket/:nama/:versi
   */
  public async dapatkanVersi(nama: string, versi: string): Promise<MetadataVersiPaket | null> {
    const meta = await this.dapatkanMetadata(nama);
    if (!meta) return null;
    return meta.daftarVersi[versi] || null;
  }

  /**
   * Mencari paket dari endpoint GET /paket?q=<kueri>
   */
  public async cari(kueri: string): Promise<HasilPencarianPaket[]> {
    const endpoint = `${this.urlBasis}/paket?q=${encodeURIComponent(kueri.trim())}`;

    try {
      if (typeof fetch === 'undefined') {
        throw new Error('Fungsi fetch HTTP tidak tersedia.');
      }

      const res = await this.kirimPermintaan(endpoint, {
        method: 'GET',
        headers: this.buatHeader(),
      });

      if (!res.ok) {
        throw new GalatRegistri(`Pencarian registri daring gagal (HTTP ${res.status}).`);
      }

      const data = await res.json();
      const hasil = Array.isArray(data) ? data : data?.hasil;
      if (!Array.isArray(hasil)) {
        throw new GalatRegistri('Respons pencarian registri memiliki format yang tidak valid.');
      }
      return hasil.filter((item: any) =>
        item &&
        typeof item.nama === 'string' &&
        typeof item.versi === 'string' &&
        typeof item.deskripsi === 'string' &&
        typeof item.lisensi === 'string' &&
        typeof item.skorRelevansi === 'number' &&
        Number.isFinite(item.skorRelevansi)
      );
    } catch (err: any) {
      if (err instanceof GalatRegistri) throw err;
      throw new GalatRegistri(`Gagal menghubungi registri daring untuk pencarian: ${err.message}`);
    }
  }

  /**
   * Menerbitkan arsip paket ke endpoint POST /paket
   */
  public async terbitkan(
    arsip: ArsipPaketData,
    opsi?: { token?: string }
  ): Promise<HasilPenerbitanPaket> {
    const arsipTerverifikasi = uraiArsipPaket(arsip.kontenSerial);
    if (
      arsipTerverifikasi.header.nama !== arsip.header?.nama ||
      arsipTerverifikasi.header.versi !== arsip.header?.versi ||
      arsipTerverifikasi.checksum !== arsip.checksum
    ) {
      throw new GalatRegistri('Objek arsip tidak konsisten dengan konten serial yang diverifikasi.');
    }
    arsip = arsipTerverifikasi;
    const tokenAktif = opsi?.token || this.token;
    if (!tokenAktif) {
      throw new GalatRegistri(
        `Autentikasi ditolak: Token registri diperlukan untuk mempublikasikan paket ke registri daring.\nSilakan gunakan flag --token atau atur variabel lingkungan NUSANTARA_TOKEN.`
      );
    }

    const endpoint = `${this.urlBasis}/paket`;

    try {
      if (typeof fetch === 'undefined') {
        throw new Error('Fungsi fetch HTTP tidak tersedia.');
      }

      const res = await this.kirimPermintaan(endpoint, {
        method: 'POST',
        headers: {
          ...this.buatHeader(),
          'Authorization': `Bearer ${tokenAktif}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          header: arsip.header,
          checksum: arsip.checksum,
          arsip: arsip.kontenSerial,
        }),
      });

      if (res.status === 409) {
        throw new GalatImmutabilitasPaket(arsip.header.nama, arsip.header.versi);
      }

      if (!res.ok) {
        const pesanGalat = await res.text().catch(() => res.statusText);
        throw new GalatRegistri(`Publikasi ke registri daring gagal (HTTP ${res.status}): ${pesanGalat}`);
      }

      return {
        sukses: true,
        nama: arsip.header.nama,
        versi: arsip.header.versi,
        checksum: arsip.checksum,
        pesan: `Paket '${arsip.header.nama}@${arsip.header.versi}' berhasil dipublikasikan ke registri daring ${this.urlBasis}.`,
      };
    } catch (err: any) {
      if (err instanceof GalatImmutabilitasPaket || err instanceof GalatRegistri) throw err;
      throw new GalatRegistri(`Koneksi jaringan ke registri daring gagal: ${err.message}`);
    }
  }

  /**
   * Mengunduh arsip paket dari endpoint GET /paket/:nama/:versi/unduh
   */
  public async unduh(nama: string, versi: string): Promise<ArsipPaketData> {
    const endpoint = `${this.urlBasis}/paket/${encodeURIComponent(nama)}/${encodeURIComponent(versi)}/unduh`;

    try {
      if (typeof fetch === 'undefined') {
        throw new Error('Fungsi fetch HTTP tidak tersedia.');
      }

      const res = await this.kirimPermintaan(endpoint, {
        method: 'GET',
        headers: this.buatHeader(),
      });

      if (res.status === 404) {
        throw new GalatRegistri(`Paket '${nama}@${versi}' tidak ditemukan di registri daring.`);
      }

      if (!res.ok) {
        throw new GalatRegistri(`Gagal mengunduh paket '${nama}@${versi}' (HTTP ${res.status}).`);
      }

      const teksArsip = await res.text();
      const arsip = uraiArsipPaket(teksArsip);
      if (arsip.header.nama !== nama || arsip.header.versi !== versi) {
        throw new GalatRegistri('Arsip unduhan tidak cocok dengan nama dan versi yang diminta.');
      }
      return arsip;
    } catch (err: any) {
      if (err instanceof GalatRegistri) throw err;
      throw new GalatRegistri(`Gagal mengunduh paket dari registri daring: ${err.message}`);
    }
  }

  public verifikasiIntegritas(arsip: ArsipPaketData, checksumDiharapkan: string): boolean {
    return arsip.checksum === checksumDiharapkan;
  }

  private buatHeader(): Record<string, string> {
    const header: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Nusantara-CLI/0.22.0',
    };
    if (this.token) {
      header['Authorization'] = `Bearer ${this.token}`;
    }
    return header;
  }
}
