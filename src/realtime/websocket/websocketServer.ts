/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Server WebSocket Resmi NUSANTARA (Handshake, Keamanan Origin, & Integrasi Event)
 */

import * as http from 'node:http';
import { WebSocketServer, WebSocket as WSSocket } from 'ws';
import { KonfigurasiWebSocket, PesanWebSocket, ProfilPenggunaWS } from '../types';
import { PengelolaKoneksiWebSocket, KoneksiKlienImpl } from './connectionManager';
import { PengelolaRuang } from '../channels/roomManager';
import { BusPeristiwa } from '../event/eventBus';

export class ServerWebSocketNUSANTARA {
  private wss: WebSocketServer | null = null;
  private readonly pengelolaKoneksi: PengelolaKoneksiWebSocket;
  public readonly pengelolaRuang: PengelolaRuang;
  public readonly busPeristiwa: BusPeristiwa;
  private serverHttpEksternal: http.Server | null = null;
  private sedangBerjalan: boolean = false;

  constructor(
    private readonly konfigurasi: KonfigurasiWebSocket = {},
    busPeristiwa?: BusPeristiwa
  ) {
    this.busPeristiwa = busPeristiwa || new BusPeristiwa();
    this.pengelolaRuang = new PengelolaRuang({
      otorisasi: konfigurasi.otorisasiRuang,
    });
    this.pengelolaKoneksi = new PengelolaKoneksiWebSocket(konfigurasi);
  }

  public apakahAktif(): boolean {
    return this.sedangBerjalan;
  }

  public jumlahKoneksi(): number {
    return this.pengelolaKoneksi.hitung();
  }

  /**
   * Menjalankan server WebSocket mandiri pada port dan host tertentu.
   */
  public async mulai(port: number = 8080, host: string = '127.0.0.1'): Promise<{ port: number; host: string }> {
    if (this.sedangBerjalan) {
      return { port, host };
    }

    return new Promise((resolve, reject) => {
      try {
        const batasUkuran = this.konfigurasi.batasUkuranPesanBytes || 1048576; // 1 MB

        this.wss = new WebSocketServer({
          port,
          host,
          path: this.konfigurasi.jalur || '/ws',
          maxPayload: batasUkuran,
          verifyClient: (info, callback) => {
            this.verifikasiKlien(info, callback);
          },
        });

        this.wss.on('listening', () => {
          this.sedangBerjalan = true;
          this.siapkanPenanganSoket();
          resolve({ port, host });
        });

        this.wss.on('error', (err) => {
          this.sedangBerjalan = false;
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Mengaitkan server WebSocket ke server HTTP yang sudah berjalan (misal: dari Web Framework).
   */
  public pasangKeServerHTTP(serverHttp: http.Server): void {
    if (this.sedangBerjalan) return;

    this.serverHttpEksternal = serverHttp;
    const batasUkuran = this.konfigurasi.batasUkuranPesanBytes || 1048576;

    this.wss = new WebSocketServer({
      server: serverHttp,
      path: this.konfigurasi.jalur || '/ws',
      maxPayload: batasUkuran,
      verifyClient: (info, callback) => {
        this.verifikasiKlien(info, callback);
      },
    });

    this.sedangBerjalan = true;
    this.siapkanPenanganSoket();
  }

  /**
   * Menghentikan server WebSocket dan memutus seluruh koneksi aktif secara bersih.
   */
  public async tutup(): Promise<void> {
    if (!this.sedangBerjalan || !this.wss) {
      return;
    }

    return new Promise((resolve) => {
      this.pengelolaKoneksi.bersihkan();

      this.wss!.close(() => {
        this.sedangBerjalan = false;
        this.wss = null;
        resolve();
      });
    });
  }

  /**
   * Menyiarkan pesan ke seluruh klien aktif yang tersambung.
   */
  public siarkan(pesan: any, kecualikanKoneksiId?: string): number {
    return this.pengelolaRuang.siarkanKeSemua(
      this.pengelolaKoneksi.dapatkanSemua(),
      pesan,
      kecualikanKoneksiId
    );
  }

  /**
   * Mengirim pesan khusus ke ruang tertentu.
   */
  public kirimKeRuang(namaRuang: string, pesan: any, kecualikanKoneksiId?: string): number {
    return this.pengelolaRuang.kirimKeRuang(namaRuang, pesan, kecualikanKoneksiId);
  }

  /**
   * Validasi asal origin klien berdasarkan konfigurasi whitelist.
   */
  public validasiOrigin(origin: string): boolean {
    const daftar = this.konfigurasi.asalDiizinkan || (this.konfigurasi as any).originDiizinkan;
    if (!daftar || daftar.length === 0) return true;
    return daftar.some((a: string) => a === '*' || a.toLowerCase() === origin.toLowerCase());
  }

  /**
   * Validasi ukuran pesan terhadap batas maksimal yang diizinkan.
   */
  public validasiUkuranPesan(ukuranByte: number): boolean {
    const batas = this.konfigurasi.batasUkuranPesanBytes || (this.konfigurasi as any).maksUkuranPesanByte || 1048576;
    return ukuranByte <= batas;
  }

  /**
   * Mengirim pesan langsung ke koneksi tertentu berdasarkan ID.
   */
  public kirimKeKoneksi(idKoneksi: string, pesan: any): boolean {
    const k = this.pengelolaKoneksi.dapatkan(idKoneksi);
    if (!k || k.status !== 'terbuka') return false;

    const data = typeof pesan === 'string' ? pesan : JSON.stringify(pesan);
    k.kirim(data);
    return true;
  }

  private verifikasiKlien(
    info: { origin: string; secure: boolean; req: http.IncomingMessage },
    callback: (res: boolean, code?: number, message?: string) => void
  ): void {
    // 1. Batas koneksi maksimal
    const batasKoneksi = this.konfigurasi.batasKoneksiMaksimal || 1000;
    if (this.pengelolaKoneksi.hitung() >= batasKoneksi) {
      callback(false, 503, 'Batas koneksi server telah tercapai');
      return;
    }

    // 2. Verifikasi Origin jika didefinisikan
    if (this.konfigurasi.asalDiizinkan && this.konfigurasi.asalDiizinkan.length > 0) {
      const asal = info.origin || info.req.headers['origin'];
      if (!asal) {
        callback(false, 403, 'Tajuk Origin wajib disertakan');
        return;
      }
      const cocok = this.konfigurasi.asalDiizinkan.some((a) => {
        return a === '*' || a.toLowerCase() === (asal as string).toLowerCase();
      });
      if (!cocok) {
        callback(false, 403, 'Origin tidak diizinkan oleh kebijakan keamanan');
        return;
      }
    }

    callback(true);
  }

  private siapkanPenanganSoket(): void {
    if (!this.wss) return;

    this.wss.on('connection', async (rawSocket: WSSocket, req: http.IncomingMessage) => {
      const ip = (req.socket.remoteAddress || '127.0.0.1').replace(/^.*:/, '');

      // Autentikasi koneksi jika autentikator dikonfigurasi
      let profil: ProfilPenggunaWS | undefined;
      if (this.konfigurasi.autentikator) {
        try {
          const authHeader = req.headers['authorization'] || '';
          const token = authHeader.replace(/^Bearer\s+/i, '') || (req.headers['sec-websocket-protocol'] as string) || '';
          const headersRecord: Record<string, string> = {};
          for (const [k, v] of Object.entries(req.headers)) {
            if (v) headersRecord[k] = Array.isArray(v) ? v.join(', ') : v;
          }

          const hasilAuth = await this.konfigurasi.autentikator(token, headersRecord);
          if (!hasilAuth) {
            rawSocket.close(4001, 'Autentikasi gagal atau token tidak sah');
            return;
          }
          profil = hasilAuth;
        } catch {
          rawSocket.close(4001, 'Kesalahan pada proses autentikasi');
          return;
        }
      }

      const koneksi = this.pengelolaKoneksi.daftarkan(rawSocket, ip, profil);

      // Terbitkan event lokal
      this.busPeristiwa.terbitkan('ws:koneksi_baru', {
        idKoneksi: koneksi.id,
        ip: koneksi.ipKlien,
        profil: koneksi.profil,
      });

      // Tangani Pong
      rawSocket.on('pong', () => {
        koneksi.sentuhAktivitas();
      });

      // Tangani Pesan Masuk
      rawSocket.on('message', async (data: Buffer | string, isBinary: boolean) => {
        koneksi.sentuhAktivitas();

        if (!koneksi.periksaRateLimit()) {
          koneksi.kirim(JSON.stringify({
            tipe: 'sistem',
            pesan: 'Batas laju pesan terlampaui (Rate limit exceeded)',
            stempelWaktu: Date.now(),
          }));
          return;
        }

        if (isBinary) {
          this.busPeristiwa.terbitkan('ws:pesan_biner', {
            idKoneksi: koneksi.id,
            ukuran: data.length,
          });
          return;
        }

        const teks = data.toString('utf-8');
        try {
          const pesanObj: PesanWebSocket = JSON.parse(teks);

          // Penanganan gabung ruang
          if (pesanObj.tipe === 'sistem' && pesanObj.acara === 'gabung_ruang' && pesanObj.ruang) {
            const sukses = await this.pengelolaRuang.gabungRuang(koneksi, pesanObj.ruang);
            koneksi.kirim(JSON.stringify({
              tipe: 'sistem',
              acara: 'respon_gabung',
              ruang: pesanObj.ruang,
              sukses,
            }));
            return;
          }

          // Penanganan keluar ruang
          if (pesanObj.tipe === 'sistem' && pesanObj.acara === 'keluar_ruang' && pesanObj.ruang) {
            const sukses = this.pengelolaRuang.keluarRuang(koneksi, pesanObj.ruang);
            koneksi.kirim(JSON.stringify({
              tipe: 'sistem',
              acara: 'respon_keluar',
              ruang: pesanObj.ruang,
              sukses,
            }));
            return;
          }

          // Teruskan sebagai event ke bus peristiwa
          await this.busPeristiwa.terbitkan('ws:pesan', {
            idKoneksi: koneksi.id,
            pesan: pesanObj,
            profil: koneksi.profil,
          });
        } catch {
          // Pesan teks biasa bukan JSON
          await this.busPeristiwa.terbitkan('ws:pesan_teks', {
            idKoneksi: koneksi.id,
            teks,
          });
        }
      });

      // Tangani Tutup
      rawSocket.on('close', () => {
        this.pengelolaRuang.keluarDariSemuaRuang(koneksi);
        this.pengelolaKoneksi.hapus(koneksi.id);
        this.busPeristiwa.terbitkan('ws:koneksi_putus', {
          idKoneksi: koneksi.id,
        });
      });

      // Tangani Galat Soket
      rawSocket.on('error', (err) => {
        this.busPeristiwa.terbitkan('ws:galat', {
          idKoneksi: koneksi.id,
          pesan: err.message,
        });
      });
    });
  }
}
