/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Klasifikasi Galat HTTP & Pembersihan Data Sensitif (Credential Redaction)
 */

export class GalatHTTP extends Error {
  public readonly kode: string;
  public readonly rincian?: any;
  public readonly url?: string;

  constructor(pesan: string, kode: string = 'GALAT_HTTP', rincian?: any, url?: string) {
    // Bersihkan data rahasia dari pesan dan rincian sebelum disimpan
    const pesanAman = GalatHTTP.bersihkanDataSensitif(pesan);
    super(pesanAman);
    this.name = this.constructor.name;
    this.kode = kode;
    this.rincian = rincian ? GalatHTTP.bersihkanObjekSensitif(rincian) : undefined;
    this.url = url ? GalatHTTP.bersihkanUrlSensitif(url) : undefined;
  }

  public get pesan(): string {
    return this.message;
  }

  /**
   * Menghapus kata sandi, token, dan kunci rahasia dari string teks.
   */
  public static bersihkanDataSensitif(teks: string): string {
    if (!teks || typeof teks !== 'string') return '';

    return teks
      // Basic auth: user:pass@
      .replace(/(https?:\/\/)([^:@\s]+):([^@\s]+)@/gi, '$1$2:***@')
      // Bearer token
      .replace(/(Bearer\s+)[A-Za-z0-9_\-\.+=/]+/gi, '$1***')
      // Basic auth base64
      .replace(/(Basic\s+)[A-Za-z0-9+/=]+/gi, '$1***')
      // Query parameters: apiKey, api_key, token, secret, password
      .replace(/([?&](?:api[_-]?key|token|access[_-]?token|secret|password|auth)=)[^&]+/gi, '$1***');
  }

  /**
   * Menghilangkan kredensial sensitif dari URL.
   */
  public static bersihkanUrlSensitif(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      if (u.password) {
        u.password = '***';
      }
      for (const k of Array.from(u.searchParams.keys())) {
        if (/api[_-]?key|token|secret|password|auth/i.test(k)) {
          u.searchParams.set(k, '***');
        }
      }
      return u.toString();
    } catch {
      return GalatHTTP.bersihkanDataSensitif(urlStr);
    }
  }

  /**
   * Rekursif membersihkan field sensitif pada objek / header.
   */
  public static bersihkanObjekSensitif(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') {
      return typeof obj === 'string' ? GalatHTTP.bersihkanDataSensitif(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => GalatHTTP.bersihkanObjekSensitif(item));
    }

    const hasil: Record<string, any> = {};
    const kunciSensitif = [
      'authorization',
      'proxy-authorization',
      'x-api-key',
      'api-key',
      'apikey',
      'cookie',
      'set-cookie',
      'password',
      'katasandi',
      'token',
      'secret',
      'client_secret',
      'refreshtoken',
      'refresh_token',
    ];

    for (const [k, v] of Object.entries(obj)) {
      if (kunciSensitif.includes(k.toLowerCase())) {
        hasil[k] = '***';
      } else {
        hasil[k] = GalatHTTP.bersihkanObjekSensitif(v);
      }
    }
    return hasil;
  }
}

export class GalatJaringanHTTP extends GalatHTTP {
  constructor(pesan: string, rincian?: any, url?: string) {
    super(pesan, 'GALAT_JARINGAN', rincian, url);
  }
}

export class GalatTimeoutHTTP extends GalatHTTP {
  constructor(pesan: string, rincian?: any, url?: string) {
    super(pesan, 'GALAT_TIMEOUT', rincian, url);
  }
}

export class GalatTLSHTTP extends GalatHTTP {
  constructor(pesan: string, rincian?: any, url?: string) {
    super(pesan, 'GALAT_TLS', rincian, url);
  }
}

export class GalatStatusHTTP extends GalatHTTP {
  public readonly status: number;
  public readonly tubuhRespon?: string;

  constructor(status: number, statusTeks: string, tubuh?: string, url?: string) {
    super(
      `Permintaan HTTP gagal dengan kode status ${status} (${statusTeks})`,
      'GALAT_STATUS_HTTP',
      { status, statusTeks },
      url
    );
    this.status = status;
    this.tubuhRespon = tubuh;
  }
}

export class GalatSerialisasiHTTP extends GalatHTTP {
  constructor(pesan: string, rincian?: any) {
    super(pesan, 'GALAT_SERIALISASI', rincian);
  }
}

export class GalatAutentikasiHTTP extends GalatHTTP {
  constructor(pesan: string, rincian?: any, url?: string) {
    super(pesan, 'GALAT_AUTENTIKASI', rincian, url);
  }
}

export class GalatTransferBerkasHTTP extends GalatHTTP {
  constructor(pesan: string, rincian?: any, url?: string) {
    super(pesan, 'GALAT_TRANSFER_BERKAS', rincian, url);
  }
}

export class GalatWebhookHTTP extends GalatHTTP {
  constructor(pesan: string, rincian?: any) {
    super(pesan, 'GALAT_WEBHOOK', rincian);
  }
}
