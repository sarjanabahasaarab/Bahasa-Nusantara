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
      this.urlBasis = opsi.replace(/\/+$/, '');
      this.waktuTungguMs = 5000;
    } else {
      this.urlBasis = (opsi?.urlBasis || 'https://paket.nusantara.lang/api/v1').replace(/\/+$/, '');
      this.token = opsi?.token;
      this.waktuTungguMs = opsi?.waktuTungguMs || 5000;
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

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.buatHeader(),
      });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new GalatRegistri(`Gagal mengambil metadata paket '${nama}' (HTTP ${res.status}: ${res.statusText}).`);
      }

      return (await res.json()) as MetadataPaketRegistri;
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

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.buatHeader(),
      });

      if (!res.ok) {
        throw new GalatRegistri(`Pencarian registri daring gagal (HTTP ${res.status}).`);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : data.hasil || [];
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

      const res = await fetch(endpoint, {
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

      const res = await fetch(endpoint, {
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
      return uraiArsipPaket(teksArsip);
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
