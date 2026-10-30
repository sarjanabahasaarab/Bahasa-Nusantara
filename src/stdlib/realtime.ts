/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Real-Time Events & Background Processing (Phase 34)
 * Modul Standar: realtime (alias: event, antrean, queue)
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatTeks,
  buatKosong,
  buatPeta,
  NilaiFungsiBawaan,
  NilaiPeta,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import { BusPeristiwa } from '../realtime/event/eventBus';
import { AntreanTugasMemori } from '../realtime/background/taskQueue';
import { PekerjaLatarBelakang } from '../realtime/background/worker';
import { buatTugas } from '../realtime/background/task';
import {
  konversiKeNilaiRuntime,
  konversiDariNilaiRuntime,
} from './basisdata';
import { Interpreter } from '../interpreter/interpreter';

export const simbolEksporRealtime: Map<string, InfoSimbolModul> = new Map([
  [
    'buatBusPeristiwa',
    {
      nama: 'buatBusPeristiwa',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'peta',
    },
  ],
  [
    'terbitkanEvent',
    {
      nama: 'terbitkanEvent',
      kategori: 'fungsi',
      parameter: [
        { nama: 'bus', tipe: 'peta' },
        { nama: 'jenis', tipe: 'teks' },
        { nama: 'payload', tipe: 'peta' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'dengarkanEvent',
    {
      nama: 'dengarkanEvent',
      kategori: 'fungsi',
      parameter: [
        { nama: 'bus', tipe: 'peta' },
        { nama: 'jenis', tipe: 'teks' },
        { nama: 'penangan', tipe: 'fungsi' },
      ],
      tipeKembalian: 'kosong',
    },
  ],
  [
    'buatAntrean',
    {
      nama: 'buatAntrean',
      kategori: 'fungsi',
      parameter: [
        { nama: 'namaAntrean', tipe: 'teks' },
        { nama: 'kapasitas', tipe: 'bilangan' },
      ],
      minParameter: 0,
      tipeKembalian: 'peta',
    },
  ],
  [
    'tambahTugas',
    {
      nama: 'tambahTugas',
      kategori: 'fungsi',
      parameter: [
        { nama: 'antrean', tipe: 'peta' },
        { nama: 'namaTugas', tipe: 'teks' },
        { nama: 'payload', tipe: 'peta' },
      ],
      tipeKembalian: 'teks',
    },
  ],
  [
    'buatPekerja',
    {
      nama: 'buatPekerja',
      kategori: 'fungsi',
      parameter: [{ nama: 'antrean', tipe: 'peta' }],
      tipeKembalian: 'peta',
    },
  ],
  [
    'prosesSatuTugas',
    {
      nama: 'prosesSatuTugas',
      kategori: 'fungsi',
      parameter: [{ nama: 'pekerja', tipe: 'peta' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'statistikAntrean',
    {
      nama: 'statistikAntrean',
      kategori: 'fungsi',
      parameter: [{ nama: 'antrean', tipe: 'peta' }],
      tipeKembalian: 'peta',
    },
  ],
]);

function bungkusBusPeristiwa(bus: BusPeristiwa): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();

  anggota.set('terbitkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'terbitkan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Metode 'terbitkan' membutuhkan jenis peristiwa (teks) dan payload."
        );
      }
      const jenis = args[0].nilai;
      const payload = konversiDariNilaiRuntime(args[1]);
      const res = bus.terbitkanSinkron(jenis, payload);
      return buatTeks(res.id);
    },
  });

  anggota.set('dengarkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dengarkan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (
        args.length < 2 ||
        args[0].jenis !== JenisNilaiRuntime.TEKS ||
        (args[1].jenis !== JenisNilaiRuntime.FUNGSI_BAWAAN &&
          args[1].jenis !== JenisNilaiRuntime.FUNGSI)
      ) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Metode 'dengarkan' membutuhkan nama jenis (teks) dan callback fungsi."
        );
      }
      const jenis = args[0].nilai;
      const fn = args[1];

      bus.dengarkan(jenis, (ev) => {
        const payloadRt = konversiKeNilaiRuntime(ev.payload);
        Interpreter.panggilFungsiAktif(fn, [payloadRt, buatTeks(ev.id)]);
      });

      return buatKosong();
    },
  });

  const peta = buatPeta(anggota);
  (peta as any).__bus = bus;
  return peta;
}

function bungkusAntreanTugas(antrean: AntreanTugasMemori): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();

  anggota.set('tambah', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambah',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Metode 'tambah' membutuhkan nama tugas (teks) dan payload (peta)."
        );
      }
      const nama = args[0].nilai;
      const payload = konversiDariNilaiRuntime(args[1]);
      const prioritas =
        args.length > 2 && args[2].jenis === JenisNilaiRuntime.BILANGAN
          ? args[2].nilai
          : 0;
      const tugas = buatTugas(nama, payload, { prioritas });
      antrean.tambah(tugas);
      return buatTeks(tugas.id);
    },
  });

  anggota.set('panjang', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'panjang',
    eksekusi: () => buatBilangan(antrean.panjang()),
  });

  anggota.set('statistik', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'statistik',
    eksekusi: () => {
      const s = antrean.dapatkanStatistik();
      const map = new Map<string, NilaiRuntime>();
      map.set('total', buatBilangan(s.totalTugas));
      map.set('totalTugas', buatBilangan(s.totalTugas));
      map.set('menunggu', buatBilangan(s.menunggu));
      map.set('sedangBerjalan', buatBilangan(s.sedangBerjalan));
      map.set('selesai', buatBilangan(s.selesai));
      map.set('gagal', buatBilangan(s.gagal));
      map.set('dibatalkan', buatBilangan(s.dibatalkan));
      return buatPeta(map);
    },
  });

  const peta = buatPeta(anggota);
  (peta as any).__antrean = antrean;
  return peta;
}

function bungkusPekerja(pekerja: PekerjaLatarBelakang): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();

  anggota.set('daftarkanPenangan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'daftarkanPenangan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (
        args.length < 2 ||
        args[0].jenis !== JenisNilaiRuntime.TEKS ||
        (args[1].jenis !== JenisNilaiRuntime.FUNGSI_BAWAAN &&
          args[1].jenis !== JenisNilaiRuntime.FUNGSI)
      ) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Metode 'daftarkanPenangan' membutuhkan nama tugas (teks) dan fungsi callback penangan."
        );
      }
      const nama = args[0].nilai;
      const fn = args[1];

      pekerja.daftarkanPenangan(nama, async (tugas) => {
        const payloadRt = konversiKeNilaiRuntime(tugas.payload);
        const resRt = Interpreter.panggilFungsiAktif(fn, [payloadRt]);
        return konversiDariNilaiRuntime(resRt);
      });

      return buatKosong();
    },
  });

  anggota.set('prosesSatu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'prosesSatu',
    eksekusi: () => {
      pekerja.prosesSatu();
      return buatLogika(true);
    },
  });

  const peta = buatPeta(anggota);
  (peta as any).__pekerja = pekerja;
  return peta;
}

export function buatEksporRealtime(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  ekspor.set('buatBusPeristiwa', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatBusPeristiwa',
    eksekusi: () => {
      const bus = new BusPeristiwa();
      return bungkusBusPeristiwa(bus);
    },
  });

  ekspor.set('terbitkanEvent', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'terbitkanEvent',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 3 || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'terbitkanEvent' membutuhkan bus, jenis teks, dan payload."
        );
      }
      const bus: BusPeristiwa = (args[0] as any).__bus;
      if (!bus) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Argumen bus tidak valid (harus hasil dari buatBusPeristiwa())."
        );
      }
      const jenis = args[1].nilai;
      const payload = konversiDariNilaiRuntime(args[2]);
      const ev = bus.terbitkanSinkron(jenis, payload);
      return buatTeks(ev.id);
    },
  });

  ekspor.set('dengarkanEvent', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dengarkanEvent',
    eksekusi: (args: NilaiRuntime[]) => {
      if (
        args.length < 3 ||
        args[1].jenis !== JenisNilaiRuntime.TEKS ||
        (args[2].jenis !== JenisNilaiRuntime.FUNGSI_BAWAAN &&
          args[2].jenis !== JenisNilaiRuntime.FUNGSI)
      ) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'dengarkanEvent' membutuhkan bus, jenis teks, dan penangan fungsi."
        );
      }
      const bus: BusPeristiwa = (args[0] as any).__bus;
      if (!bus) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Argumen bus tidak valid."
        );
      }
      const jenis = args[1].nilai;
      const fn = args[2];

      bus.dengarkan(jenis, (ev) => {
        const payloadRt = konversiKeNilaiRuntime(ev.payload);
        Interpreter.panggilFungsiAktif(fn, [payloadRt, buatTeks(ev.id)]);
      });

      return buatKosong();
    },
  });

  ekspor.set('buatAntrean', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatAntrean',
    eksekusi: (args: NilaiRuntime[]) => {
      let kapasitas = 10000;
      if (args && args.length > 0) {
        for (const arg of args) {
          if (arg.jenis === JenisNilaiRuntime.BILANGAN) {
            kapasitas = arg.nilai;
            break;
          }
        }
      }
      const q = new AntreanTugasMemori({ kapasitasMaksimum: kapasitas });
      return bungkusAntreanTugas(q);
    },
  });

  ekspor.set('tambahTugas', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambahTugas',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 3 || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'tambahTugas' membutuhkan antrean, nama tugas (teks), dan payload."
        );
      }
      const q: AntreanTugasMemori = (args[0] as any).__antrean;
      if (!q) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Argumen antrean tidak valid (harus hasil dari buatAntrean())."
        );
      }
      const nama = args[1].nilai;
      const payload = konversiDariNilaiRuntime(args[2]);
      const t = buatTugas(nama, payload);
      q.tambah(t);
      return buatTeks(t.id);
    },
  });

  ekspor.set('buatPekerja', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatPekerja',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'buatPekerja' membutuhkan antrean."
        );
      }
      const q: AntreanTugasMemori = (args[0] as any).__antrean;
      if (!q) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Argumen antrean tidak valid."
        );
      }
      const pekerja = new PekerjaLatarBelakang(q);
      return bungkusPekerja(pekerja);
    },
  });

  ekspor.set('prosesSatuTugas', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'prosesSatuTugas',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'prosesSatuTugas' membutuhkan pekerja."
        );
      }
      const p: PekerjaLatarBelakang = (args[0] as any).__pekerja;
      if (!p) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Argumen pekerja tidak valid."
        );
      }
      let hasil = false;
      p.prosesSatu().then((h) => {
        hasil = h;
      });
      return buatLogika(true);
    },
  });

  ekspor.set('statistikAntrean', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'statistikAntrean',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Fungsi 'statistikAntrean' membutuhkan antrean."
        );
      }
      const q: AntreanTugasMemori = (args[0] as any).__antrean;
      if (!q) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          "Argumen antrean tidak valid."
        );
      }
      const stat = q.dapatkanStatistik();
      return konversiKeNilaiRuntime(stat);
    },
  });

  return ekspor;
}
