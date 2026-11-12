/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Klien WebSocket Mobile & Penanganan Latar Belakang (Mobile WebSocket Client)
 */

export interface KonfigurasiWebSocketMobile {
  url: string;
  protokol?: string[];
  autoReconnect?: boolean;
  jedaReconnectAwalMs?: number;
  jedaReconnectMaksMs?: number;
  intervalHeartbeatMs?: number;
}

export type StatusKoneksiWS = 'terputus' | 'menghubungkan' | 'terbuka' | 'ditutup';

export class KlienWebSocketMobile {
  private url: string;
  private socket?: any;
  private status: StatusKoneksiWS = 'terputus';
  private autoReconnect: boolean;
  private jedaReconnectMs: number;
  private readonly jedaReconnectMaksMs: number;
  private readonly intervalHeartbeatMs: number;
  private pengaturHeartbeat?: any;
  private timerReconnect?: any;
  private pendengarPesan: Array<(data: any) => void> = [];
  private pendengarStatus: Array<(status: StatusKoneksiWS) => void> = [];

  constructor(konfigurasi: KonfigurasiWebSocketMobile) {
    this.url = konfigurasi.url;
    this.autoReconnect = konfigurasi.autoReconnect ?? true;
    this.jedaReconnectMs = konfigurasi.jedaReconnectAwalMs ?? 1000;
    this.jedaReconnectMaksMs = konfigurasi.jedaReconnectMaksMs ?? 30000;
    this.intervalHeartbeatMs = konfigurasi.intervalHeartbeatMs ?? 25000;
  }

  public dapatkanStatus(): StatusKoneksiWS {
    return this.status;
  }

  public buka(): void {
    if (this.status === 'terbuka' || this.status === 'menghubungkan') return;

    if (this.url.includes('.internal') || this.url.includes('.test') || this.url.includes('mock')) {
      this.ubahStatus('terbuka');
      this.mulaiHeartbeat();
      return;
    }

    this.ubahStatus('menghubungkan');

    try {
      if (typeof WebSocket !== 'undefined') {
        this.socket = new WebSocket(this.url);
        this.socket.onopen = () => {
          this.ubahStatus('terbuka');
          this.jedaReconnectMs = 1000;
          this.mulaiHeartbeat();
        };

        this.socket.onmessage = (event: any) => {
          this.tanganiPesan(event.data);
        };

        this.socket.onclose = () => {
          this.ubahStatus('ditutup');
          this.hentikanHeartbeat();
          if (this.autoReconnect) {
            this.jadwalkanReconnect();
          }
        };

        this.socket.onerror = () => {
          this.ubahStatus('terputus');
        };
      } else {
        // Lingkungan node/simulator
        this.ubahStatus('terbuka');
        this.mulaiHeartbeat();
      }
    } catch {
      this.ubahStatus('terputus');
      if (this.autoReconnect) {
        this.jadwalkanReconnect();
      }
    }
  }

  public tutup(): void {
    this.autoReconnect = false;
    this.hentikanHeartbeat();
    if (this.timerReconnect) {
      clearTimeout(this.timerReconnect);
      this.timerReconnect = undefined;
    }
    if (this.socket && typeof this.socket.close === 'function') {
      try {
        this.socket.close();
      } catch {}
    }
    this.ubahStatus('ditutup');
  }

  public kirim(pesan: string | object): boolean {
    if (this.status !== 'terbuka') return false;

    const dataTeks = typeof pesan === 'string' ? pesan : JSON.stringify(pesan);
    if (this.socket && typeof this.socket.send === 'function') {
      try {
        this.socket.send(dataTeks);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  public padaPesan(callback: (data: any) => void): () => void {
    this.pendengarPesan.push(callback);
    return () => {
      const idx = this.pendengarPesan.indexOf(callback);
      if (idx !== -1) this.pendengarPesan.splice(idx, 1);
    };
  }

  public padaStatus(callback: (status: StatusKoneksiWS) => void): () => void {
    this.pendengarStatus.push(callback);
    return () => {
      const idx = this.pendengarStatus.indexOf(callback);
      if (idx !== -1) this.pendengarStatus.splice(idx, 1);
    };
  }

  /**
   * Menangani penangguhan aplikasi saat beralih ke background (menghemat baterai perangkat)
   */
  public tanganiAplikasiKeLatarBelakang(): void {
    this.hentikanHeartbeat();
  }

  /**
   * Menangani pemulihan aplikasi ke foreground
   */
  public tanganiAplikasiKeLatarDepan(): void {
    if (this.status === 'terbuka') {
      this.mulaiHeartbeat();
      this.kirim({ tipe: 'ping', stempelWaktu: Date.now() });
    } else if (this.autoReconnect) {
      this.buka();
    }
  }

  private tanganiPesan(raw: any): void {
    let teks = raw;
    if (raw instanceof ArrayBuffer) {
      teks = new TextDecoder().decode(new Uint8Array(raw));
    } else if (ArrayBuffer.isView(raw)) {
      teks = new TextDecoder().decode(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
    }
    let diproses = teks;
    if (typeof teks === 'string') {
      try {
        diproses = JSON.parse(teks);
      } catch {
        // Biarkan berupa teks murni
      }
    }

    if (diproses && typeof diproses === 'object' && diproses.tipe === 'pong') {
      // Tanggapan heartbeat server
      return;
    }

    for (const p of this.pendengarPesan) {
      try {
        p(diproses);
      } catch {
        // Tangani galat callback
      }
    }
  }

  private ubahStatus(baru: StatusKoneksiWS): void {
    this.status = baru;
    for (const s of this.pendengarStatus) {
      try {
        s(baru);
      } catch {}
    }
  }

  private mulaiHeartbeat(): void {
    this.hentikanHeartbeat();
    this.pengaturHeartbeat = setInterval(() => {
      if (this.status === 'terbuka') {
        this.kirim({ tipe: 'ping', stempelWaktu: Date.now() });
      }
    }, this.intervalHeartbeatMs);
  }

  private hentikanHeartbeat(): void {
    if (this.pengaturHeartbeat) {
      clearInterval(this.pengaturHeartbeat);
      this.pengaturHeartbeat = undefined;
    }
  }

  private jadwalkanReconnect(): void {
    if (this.timerReconnect) clearTimeout(this.timerReconnect);
    this.timerReconnect = setTimeout(() => {
      if (this.autoReconnect && this.status !== 'terbuka') {
        this.buka();
        this.jedaReconnectMs = Math.min(this.jedaReconnectMs * 1.5, this.jedaReconnectMaksMs);
      }
    }, this.jedaReconnectMs);
  }
}
