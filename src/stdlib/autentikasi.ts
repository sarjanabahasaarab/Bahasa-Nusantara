/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Modul Standar: autentikasi (alias: auth, std:autentikasi, std:auth)
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatTeks,
  buatKosong,
  buatDaftar,
  buatPeta,
  NilaiFungsiBawaan,
  NilaiPeta,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import {
  LayananAutentikasi,
  PengelolaPassword,
  ManajerRBAC,
  OpsiAutentikasi,
} from '../autentikasi';
import { AdaptorBasisdata } from '../database/jenis';

/**
 * Metadata Simbol Ekspor Resmi Modul `autentikasi` (dan alias `auth`).
 */
export const simbolEksporAutentikasi: Map<string, InfoSimbolModul> = new Map([
  [
    'hashPassword',
    {
      nama: 'hashPassword',
      kategori: 'fungsi',
      parameter: [{ nama: 'password', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'verifikasiPassword',
    {
      nama: 'verifikasiPassword',
      kategori: 'fungsi',
      parameter: [
        { nama: 'password', tipe: 'teks' },
        { nama: 'hashTersimpan', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'buatLayanan',
    {
      nama: 'buatLayanan',
      kategori: 'fungsi',
      parameter: [
        { nama: 'koneksiDb', tipe: 'peta' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'apakahTerautentikasi',
    {
      nama: 'apakahTerautentikasi',
      kategori: 'fungsi',
      parameter: [{ nama: 'req', tipe: 'peta' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'dapatkanPenggunaSaatIni',
    {
      nama: 'dapatkanPenggunaSaatIni',
      kategori: 'fungsi',
      parameter: [{ nama: 'req', tipe: 'peta' }],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'apakahAdmin',
    {
      nama: 'apakahAdmin',
      kategori: 'fungsi',
      parameter: [{ nama: 'pengguna', tipe: 'peta' }],
      tipeKembalian: 'logika',
    },
  ],
]);

function konversiKeNilaiRuntime(val: any): NilaiRuntime {
  if (val === null || val === undefined) {
    return buatKosong();
  }
  if (typeof val === 'boolean') {
    return buatLogika(val);
  }
  if (typeof val === 'number') {
    return buatBilangan(val);
  }
  if (typeof val === 'string') {
    return buatTeks(val);
  }
  if (Array.isArray(val)) {
    return buatDaftar(val.map(konversiKeNilaiRuntime));
  }
  if (typeof val === 'object') {
    const peta = new Map<string, NilaiRuntime>();
    for (const [k, v] of Object.entries(val)) {
      peta.set(k, konversiKeNilaiRuntime(v));
    }
    return buatPeta(peta);
  }
  return buatTeks(String(val));
}

function konversiDariNilaiRuntime(nilai: NilaiRuntime): any {
  switch (nilai.jenis) {
    case JenisNilaiRuntime.TEKS:
    case JenisNilaiRuntime.KARAKTER:
      return nilai.nilai;
    case JenisNilaiRuntime.BILANGAN:
    case JenisNilaiRuntime.DESIMAL:
      return nilai.nilai;
    case JenisNilaiRuntime.LOGIKA:
      return nilai.nilai;
    case JenisNilaiRuntime.KOSONG:
      return null;
    case JenisNilaiRuntime.DAFTAR:
      return nilai.elemen.map(konversiDariNilaiRuntime);
    case JenisNilaiRuntime.PETA: {
      const obj: Record<string, any> = {};
      nilai.nilai.forEach((val, k) => {
        obj[k] = konversiDariNilaiRuntime(val);
      });
      return obj;
    }
    default:
      return null;
  }
}

/**
 * Membungkus instans LayananAutentikasi menjadi objek Peta NUSANTARA.
 */
export function bungkusLayananAutentikasiNusantara(layanan: LayananAutentikasi): NilaiPeta {
  const mapLayanan = new Map<string, NilaiRuntime>();

  // layanan.inisialisasiSkema()
  const fnInisialisasiSkema: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'inisialisasiSkema',
    eksekusi: () => {
      layanan.inisialisasiSkema();
      return buatLogika(true);
    },
  };

  // layanan.registrasi(username, email, password, role?) -> peta
  const fnRegistrasi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'registrasi',
    eksekusi: (args: NilaiRuntime[]) => {
      const username = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const email = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const password = args[2]?.jenis === JenisNilaiRuntime.TEKS ? args[2].nilai : '';
      const role = args[3]?.jenis === JenisNilaiRuntime.TEKS ? args[3].nilai : 'pengguna';

      const hasil = layanan.registrasi(username, email, password, role);
      return konversiKeNilaiRuntime(hasil);
    },
  };

  // layanan.login(pengenal, password, ipKlien?) -> peta
  const fnLogin: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'login',
    eksekusi: (args: NilaiRuntime[]) => {
      const pengenal = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const password = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const ip = args[2]?.jenis === JenisNilaiRuntime.TEKS ? args[2].nilai : undefined;

      try {
        const hasil = layanan.login(pengenal, password, ip);
        return konversiKeNilaiRuntime(hasil);
      } catch (err: any) {
        return konversiKeNilaiRuntime({
          sukses: false,
          pesanGalat: err.message,
        });
      }
    },
  };

  // layanan.logout(tokenSesi) -> logika
  const fnLogout: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'logout',
    eksekusi: (args: NilaiRuntime[]) => {
      const token = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const sukses = layanan.logout(token);
      return buatLogika(sukses);
    },
  };

  // layanan.ubahPassword(penggunaId, passLama, passBaru) -> logika
  const fnUbahPassword: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ubahPassword',
    eksekusi: (args: NilaiRuntime[]) => {
      const id = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
      const passLama = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const passBaru = args[2]?.jenis === JenisNilaiRuntime.TEKS ? args[2].nilai : '';

      try {
        const sukses = layanan.ubahPassword(id, passLama, passBaru);
        return buatLogika(sukses);
      } catch {
        return buatLogika(false);
      }
    },
  };

  // layanan.validasiSesi(token: teks) -> peta | kosong
  const fnValidasiSesi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'validasiSesi',
    eksekusi: (args: NilaiRuntime[]) => {
      const token = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const sesi = layanan.validasiSesi(token);
      if (!sesi) return buatKosong();
      return konversiKeNilaiRuntime(sesi);
    },
  };

  // layanan.rotasiSesi(token: teks) -> peta
  const fnRotasiSesi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'rotasiSesi',
    eksekusi: (args: NilaiRuntime[]) => {
      const token = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      try {
        const sesiBaru = layanan.rotasiSesi(token);
        return konversiKeNilaiRuntime(sesiBaru);
      } catch {
        return buatKosong();
      }
    },
  };

  mapLayanan.set('inisialisasiSkema', fnInisialisasiSkema);
  mapLayanan.set('registrasi', fnRegistrasi);
  mapLayanan.set('daftar', fnRegistrasi);
  mapLayanan.set('login', fnLogin);
  mapLayanan.set('masuk', fnLogin);
  mapLayanan.set('logout', fnLogout);
  mapLayanan.set('keluar', fnLogout);
  mapLayanan.set('ubahPassword', fnUbahPassword);
  mapLayanan.set('validasiSesi', fnValidasiSesi);
  mapLayanan.set('rotasiSesi', fnRotasiSesi);

  (mapLayanan as any).__layanan = layanan;

  return buatPeta(mapLayanan);
}

/**
 * Pabrik Ekspor Resmi Modul `autentikasi`.
 */
export function buatEksporAutentikasi(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();
  const pengelolaPassword = new PengelolaPassword();

  // autentikasi.hashPassword(password: teks) -> teks
  const fnHash: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hashPassword',
    eksekusi: (args: NilaiRuntime[]) => {
      const pass = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      return buatTeks(pengelolaPassword.hash(pass));
    },
  };

  // autentikasi.verifikasiPassword(password: teks, hash: teks) -> logika
  const fnVerifikasi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'verifikasiPassword',
    eksekusi: (args: NilaiRuntime[]) => {
      const pass = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const hash = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      return buatLogika(pengelolaPassword.verifikasi(pass, hash));
    },
  };

  // autentikasi.buatLayanan(koneksiDb: peta, opsi?: peta) -> peta
  const fnBuatLayanan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatLayanan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'buatLayanan' membutuhkan koneksi basis data sebagai argumen pertama."
        );
      }

      const koneksiArg = args[0];
      const adaptor: AdaptorBasisdata =
        (koneksiArg as any)?.__adaptor ||
        (koneksiArg as any)?.nilai?.__adaptor;
      if (!adaptor) {
        throw new GalatRuntime(
          JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
          'Objek koneksi basis data tidak valid atau bukan instans basisdata NUSANTARA.'
        );
      }

      let opsi: OpsiAutentikasi = {};
      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA) {
        opsi = konversiDariNilaiRuntime(args[1]);
      }

      const layanan = new LayananAutentikasi(adaptor, opsi);
      return bungkusLayananAutentikasiNusantara(layanan);
    },
  };

  // autentikasi.apakahTerautentikasi(req: peta) -> logika
  const fnApakahTerautentikasi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahTerautentikasi',
    eksekusi: (args: NilaiRuntime[]) => {
      const reqArg = args[0];
      if (reqArg && reqArg.jenis === JenisNilaiRuntime.PETA) {
        const pengguna = reqArg.nilai.get('pengguna');
        return buatLogika(pengguna !== undefined && pengguna.jenis !== JenisNilaiRuntime.KOSONG);
      }
      return buatLogika(false);
    },
  };

  // autentikasi.dapatkanPenggunaSaatIni(req: peta) -> peta | kosong
  const fnDapatkanPengguna: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanPenggunaSaatIni',
    eksekusi: (args: NilaiRuntime[]) => {
      const reqArg = args[0];
      if (reqArg && reqArg.jenis === JenisNilaiRuntime.PETA) {
        const pengguna = reqArg.nilai.get('pengguna');
        return pengguna ?? buatKosong();
      }
      return buatKosong();
    },
  };

  // autentikasi.apakahAdmin(pengguna: peta) -> logika
  const fnApakahAdmin: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahAdmin',
    eksekusi: (args: NilaiRuntime[]) => {
      const p = args[0];
      if (p && p.jenis === JenisNilaiRuntime.PETA) {
        const peran = p.nilai.get('peran') || p.nilai.get('role');
        if (peran && peran.jenis === JenisNilaiRuntime.TEKS) {
          return buatLogika(peran.nilai === 'admin' || peran.nilai === 'administrator');
        }
      }
      return buatLogika(false);
    },
  };

  ekspor.set('hashPassword', fnHash);
  ekspor.set('verifikasiPassword', fnVerifikasi);
  ekspor.set('buatLayanan', fnBuatLayanan);
  ekspor.set('apakahTerautentikasi', fnApakahTerautentikasi);
  ekspor.set('dapatkanPenggunaSaatIni', fnDapatkanPengguna);
  ekspor.set('apakahAdmin', fnApakahAdmin);

  return ekspor;
}
