/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Pengelola Cookie (Cookie Jar) In-Memory
 */

import { CookieItem } from '../types';

export class PengelolaCookie {
  private cookies: Map<string, CookieItem> = new Map();

  /**
   * Mengurai header Set-Cookie dari server dan menyimpannya.
   */
  public prosesSetCookie(headerSetCookie: string | string[], urlPermintaan: string): void {
    const daftarHeader = Array.isArray(headerSetCookie) ? headerSetCookie : [headerSetCookie];
    const urlObj = new URL(urlPermintaan);

    for (const raw of daftarHeader) {
      if (!raw || typeof raw !== 'string') continue;
      const parsed = this.uraiSetCookie(raw, urlObj);
      if (parsed) {
        const kunci = `${parsed.domain || urlObj.hostname}:${parsed.jalur || '/'}:${parsed.nama}`;
        // Jika Max-Age=0 atau masa kedaluwarsa sudah lewat, hapus cookie
        if (parsed.kedaluwarsa && parsed.kedaluwarsa.getTime() <= Date.now()) {
          this.cookies.delete(kunci);
        } else {
          this.cookies.set(kunci, parsed);
        }
      }
    }
  }

  /**
   * Menyusun header Cookie yang cocok untuk dikirim ke target URL.
   */
  public dapatkanHeaderCookie(urlTarget: string): string | undefined {
    const urlObj = new URL(urlTarget);
    const sekarang = Date.now();
    const cookieCocok: string[] = [];

    for (const [kunci, item] of this.cookies.entries()) {
      // 1. Cek kedaluwarsa
      if (item.kedaluwarsa && item.kedaluwarsa.getTime() <= sekarang) {
        this.cookies.delete(kunci);
        continue;
      }

      // 2. Cek domain matching
      if (!this.apakahDomainCocok(urlObj.hostname, item.domain)) {
        continue;
      }

      // 3. Cek path matching
      if (!this.apakahJalurCocok(urlObj.pathname, item.jalur)) {
        continue;
      }

      // 4. Cek secure flag jika protokol bukan HTTPS
      if (item.aman && urlObj.protocol !== 'https:') {
        continue;
      }

      cookieCocok.push(`${item.nama}=${item.nilai}`);
    }

    return cookieCocok.length > 0 ? cookieCocok.join('; ') : undefined;
  }

  public dapatkanCookieString(urlTarget: string): string {
    return this.dapatkanHeaderCookie(urlTarget) || '';
  }

  public dapatkanSemua(): CookieItem[] {
    return Array.from(this.cookies.values());
  }

  public bersihkan(): void {
    this.cookies.clear();
  }

  private uraiSetCookie(raw: string, urlObj: URL): CookieItem | null {
    const bagian = raw.split(';').map((s) => s.trim());
    if (bagian.length === 0 || !bagian[0].includes('=')) return null;

    const [nama, ...sisa] = bagian[0].split('=');
    const namaBersih = nama.trim();
    const nilaiBersih = sisa.join('=').trim();

    if (!namaBersih) return null;

    const item: CookieItem = {
      nama: namaBersih,
      nilai: nilaiBersih,
      domain: urlObj.hostname,
      jalur: '/',
      aman: false,
      hanyaHttp: false,
    };

    for (let i = 1; i < bagian.length; i++) {
      const segmen = bagian[i];
      const [kunciRaw, ...valRaw] = segmen.split('=');
      const kunci = kunciRaw.trim().toLowerCase();
      const nilai = valRaw.join('=').trim();

      if (kunci === 'domain') {
        item.domain = nilai.startsWith('.') ? nilai.slice(1).toLowerCase() : nilai.toLowerCase();
      } else if (kunci === 'path') {
        item.jalur = nilai.startsWith('/') ? nilai : `/${nilai}`;
      } else if (kunci === 'expires') {
        const d = new Date(nilai);
        if (!isNaN(d.getTime())) {
          item.kedaluwarsa = d;
        }
      } else if (kunci === 'max-age') {
        const dtk = parseInt(nilai, 10);
        if (!isNaN(dtk)) {
          item.maksUsiaDetik = dtk;
          item.kedaluwarsa = new Date(Date.now() + dtk * 1000);
        }
      } else if (kunci === 'secure') {
        item.aman = true;
      } else if (kunci === 'httponly') {
        item.hanyaHttp = true;
      } else if (kunci === 'samesite') {
        const lower = nilai.toLowerCase();
        if (lower === 'strict') item.sameSite = 'Strict';
        else if (lower === 'lax') item.sameSite = 'Lax';
        else if (lower === 'none') item.sameSite = 'None';
      }
    }

    return item;
  }

  private apakahDomainCocok(hostname: string, domainCookie?: string): boolean {
    if (!domainCookie) return true;
    const h = hostname.toLowerCase();
    const d = domainCookie.toLowerCase();
    if (h === d) return true;
    // Subdomain matching
    return h.endsWith(`.${d}`);
  }

  private apakahJalurCocok(pathname: string, jalurCookie?: string): boolean {
    if (!jalurCookie || jalurCookie === '/') return true;
    const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const j = jalurCookie.startsWith('/') ? jalurCookie : `/${jalurCookie}`;
    return p.startsWith(j);
  }
}

export { PengelolaCookie as PenyimpanCookieMemori };
