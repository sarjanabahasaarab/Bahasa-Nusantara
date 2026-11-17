/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Penyedia Rahasia & Penyamaran Kredensial Aman (Secret Provider & Credential Masker)
 */

export class SecretProvider {
  /**
   * Mengambil rahasia dari environment variables secara aman.
   */
  public static ambilDariEnv(namaVariabel?: string): string | undefined {
    if (!namaVariabel) return undefined;
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[namaVariabel];
      return val && val.trim().length > 0 ? val.trim() : undefined;
    }
    return undefined;
  }

  /**
   * Menyamarkan kredensial sensitif untuk log, laporan, dan tampilan UI.
   * Contoh: "my-secret-key-12345" -> "my***45"
   * Private key PEM -> "-----BEGIN PRIVATE KEY-----\n[DIRAHASIAKAN]\n-----END PRIVATE KEY-----"
   */
  public static samarkan(teks?: string, panjangTampilAwal: number = 2, panjangTampilAkhir: number = 2): string {
    if (!teks || teks.trim().length === 0) return '(kosong)';

    const bersih = teks.trim();

    // Jika berupa berkas kunci PEM/PKCS8/EC/OPENSSH
    if (/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/.test(bersih)) {
      return '-----BEGIN PRIVATE KEY-----\n[KUNCI PRIVAT DISEMIRINGKAN / DIRAHASIAKAN]\n-----END PRIVATE KEY-----';
    }

    // Jika berupa JSON Service Account
    if (bersih.startsWith('{') && bersih.includes('"private_key"')) {
      try {
        const obj = JSON.parse(bersih);
        return JSON.stringify(
          {
            type: obj.type || 'service_account',
            project_id: obj.project_id || '***',
            client_email: SecretProvider.samarkanEmail(obj.client_email),
            private_key: '[DIRAHASIAKAN]',
          },
          null,
          2
        );
      } catch {
        return '{"type":"service_account","private_key":"[DIRAHASIAKAN]"}';
      }
    }

    // String pendek
    if (bersih.length <= 6) {
      return '******';
    }

    const awal = bersih.slice(0, panjangTampilAwal);
    const akhir = bersih.slice(-panjangTampilAkhir);
    const bintang = '*'.repeat(Math.max(4, Math.min(12, bersih.length - (panjangTampilAwal + panjangTampilAkhir))));
    return `${awal}${bintang}${akhir}`;
  }

  /**
   * Menyamarkan alamat email akun layanan.
   * Contoh: "nusantara-play@project-id.iam.gserviceaccount.com" -> "nu***@project-id.iam.gserviceaccount.com"
   */
  public static samarkanEmail(email?: string): string {
    if (!email || !email.includes('@')) return '(email tidak sah)';
    const [user, domain] = email.split('@');
    if (user.length <= 3) {
      return `${user.slice(0, 1)}***@${domain}`;
    }
    return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
  }

  /**
   * Membersihkan teks log dari kemungkinan kebocoran token atau private key.
   */
  public static bersihkanLogDariRahasia(log: string): string {
    if (!log) return '';
    let hasil = log;

    // Bersihkan pola PEM private key
    hasil = hasil.replace(
      /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
      '[PEM PRIVATE KEY DIRAHASIAKAN]'
    );

    // Bersihkan pola Bearer / X-Auth-Token
    hasil = hasil.replace(/Bearer\s+([A-Za-z0-9\-_=.]+)/gi, 'Bearer [TOKEN_DIRAHASIAKAN]');
    hasil = hasil.replace(/([?&](?:token|key|secret|api_key)=)[^&\s]+/gi, '$1[DIRAHASIAKAN]');

    // Bersihkan pola password / secret JSON
    hasil = hasil.replace(
      /"(password|storePass|keyPass|private_key|apiSecret|client_secret)"\s*:\s*"[^"]+"/gi,
      '"$1":"[DIRAHASIAKAN]"'
    );

    return hasil;
  }
}
