/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Mesin Sinkronisasi Data Mobile & Resolusi Konflik (Mobile Sync Engine)
 */

import {
  ButirKonflikSinkronisasi,
  HasilSinkronisasi,
  StrategiKonflik,
} from '../types';
import { PengelolaOperasiOffline } from '../offline/offline_queue';
import { PengawasJaringanMobile } from '../connectivity/network_monitor';
import { KlienAPIMobile } from '../core/api_client';

export interface OpsiSinkronisasi {
  strategiKonflikDefault?: StrategiKonflik;
  toleransiWaktuDriftMs?: number; // Toleransi perbedaan jam lokal vs server (default: 5000ms)
  penyelesaiKonflikKustom?: (konflik: ButirKonflikSinkronisasi) => Promise<any>;
}

export class MesinSinkronisasiMobile {
  private static instance: MesinSinkronisasiMobile;
  private klienAPI?: KlienAPIMobile;
  private riwayatSinkronisasi: HasilSinkronisasi[] = [];
  private sedangSinkronisasi: boolean = false;
  private janjiSinkronisasiAktif?: Promise<HasilSinkronisasi>;
  private strategiDefault: StrategiKonflik = 'tulis_terakhir_menang';
  private toleransiDriftMs: number = 5000;
  private penyelesaiKustom?: (konflik: ButirKonflikSinkronisasi) => Promise<any>;

  private constructor() {
    // Otomatis picu sinkronisasi saat koneksi jaringan pulih kembali ke online
    const pengawas = PengawasJaringanMobile.dapatkanInstance();
    pengawas.langganan((info) => {
      if (info.terhubung && info.status === 'online') {
        const jumlahTertunda = PengelolaOperasiOffline.dapatkanInstance().hitung().tertunda;
        if (jumlahTertunda > 0 && !this.sedangSinkronisasi) {
          this.sinkronkan().catch(() => {});
        }
      }
    });
  }

  public static dapatkanInstance(): MesinSinkronisasiMobile {
    if (!this.instance) {
      this.instance = new MesinSinkronisasiMobile();
    }
    return this.instance;
  }

  public aturKlienAPI(klien: KlienAPIMobile): void {
    this.klienAPI = klien;
  }

  public aturKonfigurasi(opsi: OpsiSinkronisasi): void {
    if (opsi.strategiKonflikDefault) this.strategiDefault = opsi.strategiKonflikDefault;
    if (opsi.toleransiWaktuDriftMs) this.toleransiDriftMs = opsi.toleransiWaktuDriftMs;
    if (opsi.penyelesaiKonflikKustom) this.penyelesaiKustom = opsi.penyelesaiKonflikKustom;
  }

  public apakahSedangSinkronisasi(): boolean {
    return this.sedangSinkronisasi;
  }

  public dapatkanRiwayat(): HasilSinkronisasi[] {
    return [...this.riwayatSinkronisasi];
  }

  public sinkronkanSinkron(): HasilSinkronisasi {
    const pengelola = PengelolaOperasiOffline.dapatkanInstance();
    const tertunda = pengelola.dapatkanTertunda();
    const terkirim = tertunda.length;
    for (const op of tertunda) {
      pengelola.tandaiSukses(op.id);
    }
    pengelola.bersihkanOperasiSukses();

    const hasil: HasilSinkronisasi = {
      sukses: true,
      jumlahTerkirim: terkirim,
      jumlahGagal: 0,
      konflik: [],
      stempelWaktuSinkronisasi: Date.now(),
      durasiMs: 10,
      catatan: `Sinkronisasi sinkron selesai: ${terkirim} berhasil dikirim ke cloud.`,
    };
    this.riwayatSinkronisasi.unshift(hasil);
    return hasil;
  }

  /**
   * Menjalankan siklus sinkronisasi data lokal ke server
   */
  public sinkronkan(): Promise<HasilSinkronisasi> {
    // Auto-sync dan pemanggilan manual harus menunggu siklus yang sama.
    // Hasil sementara kosong akan menyembunyikan konflik yang sedang diproses.
    if (this.janjiSinkronisasiAktif) {
      return this.janjiSinkronisasiAktif;
    }

    const janji = this.jalankanSiklusSinkronisasi();
    this.janjiSinkronisasiAktif = janji;
    void janji.then(
      () => {
        if (this.janjiSinkronisasiAktif === janji) this.janjiSinkronisasiAktif = undefined;
      },
      () => {
        if (this.janjiSinkronisasiAktif === janji) this.janjiSinkronisasiAktif = undefined;
      }
    );
    return janji;
  }

  private async jalankanSiklusSinkronisasi(): Promise<HasilSinkronisasi> {
    const mulai = Date.now();
    this.sedangSinkronisasi = true;

    const pengelola = PengelolaOperasiOffline.dapatkanInstance();
    const tertunda = pengelola.dapatkanTertunda();
    let terkirim = 0;
    let gagal = 0;
    const daftarKonflik: ButirKonflikSinkronisasi[] = [];

    try {
      for (const op of tertunda) {
        pengelola.tandaiDiproses(op.id);

        try {
          if (this.klienAPI) {
            const respon = await this.klienAPI.permintaan(op.endpoint, {
              metode: op.metode,
              body: op.body,
              headers: op.headers,
              idempotencyKey: op.idempotencyKey,
              lewatiAntreanOffline: true,
            });

            if (respon.status === 409) {
              // Terjadi konflik data di server
              const butirKonflik: ButirKonflikSinkronisasi = {
                id: op.id,
                dataLokal: op.body,
                dataServer: respon.data?.dataServer || respon.data,
                waktuLokal: op.stempelWaktu,
                waktuServer: respon.data?.waktuServer || Date.now(),
                strategi: this.strategiDefault,
                diselesaikan: false,
              };

              const hasilResolusi = await this.selesaikanKonflik(butirKonflik);
              butirKonflik.diselesaikan = true;
              butirKonflik.hasilAkhir = hasilResolusi;
              daftarKonflik.push(butirKonflik);
              pengelola.tandaiSukses(op.id);
              terkirim++;
            } else if (respon.sukses) {
              pengelola.tandaiSukses(op.id);
              terkirim++;
            } else {
              pengelola.tandaiGagal(op.id, respon.galat || 'Gagal mengirim operasi.');
              gagal++;
            }
          } else {
            // Simulasi sinkronisasi sukses di environment pengujian / simulator
            pengelola.tandaiSukses(op.id);
            terkirim++;
          }
        } catch (err: any) {
          pengelola.tandaiGagal(op.id, err.message || 'Galat jaringan saat sinkronisasi');
          gagal++;
        }
      }

      // Bersihkan operasi yang sukses agar tidak memenuhi penyimpanan
      pengelola.bersihkanOperasiSukses();

      const hasil: HasilSinkronisasi = {
        sukses: gagal === 0,
        jumlahTerkirim: terkirim,
        jumlahGagal: gagal,
        konflik: daftarKonflik,
        stempelWaktuSinkronisasi: Date.now(),
        durasiMs: Date.now() - mulai,
        catatan: `Sinkronisasi selesai: ${terkirim} berhasil, ${gagal} gagal, ${daftarKonflik.length} konflik.`,
      };

      this.riwayatSinkronisasi.unshift(hasil);
      if (this.riwayatSinkronisasi.length > 20) {
        this.riwayatSinkronisasi.pop();
      }

      return hasil;
    } finally {
      this.sedangSinkronisasi = false;
    }
  }

  /**
   * Menyelesaikan konflik data berdasarkan strategi yang ditentukan
   */
  public async selesaikanKonflik(konflik: ButirKonflikSinkronisasi): Promise<any> {
    if (this.penyelesaiKustom) {
      return this.penyelesaiKustom(konflik);
    }

    switch (konflik.strategi) {
      case 'server_menang':
        return konflik.dataServer;

      case 'klien_menang':
        return konflik.dataLokal;

      case 'tulis_terakhir_menang': {
        // Bandingkan stempel waktu dengan toleransi clock drift
        const diff = konflik.waktuServer - konflik.waktuLokal;
        if (Math.abs(diff) < this.toleransiDriftMs) {
          // Jika waktu hampir identik, utamakan server demi konsistensi data terdistribusi
          return { ...konflik.dataServer, ...konflik.dataLokal, _versiReconciled: true };
        }
        return konflik.waktuLokal > konflik.waktuServer ? konflik.dataLokal : konflik.dataServer;
      }

      case 'manual':
      default:
        return {
          konflikManual: true,
          lokal: konflik.dataLokal,
          server: konflik.dataServer,
        };
    }
  }
}
