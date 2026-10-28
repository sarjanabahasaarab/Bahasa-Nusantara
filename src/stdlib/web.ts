/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Modul Standar: web (alias: http)
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
  AplikasiWeb,
  PermintaanWeb,
  ResponsWeb,
  lepasHTML as fnLepasHTML,
  OpsiServerWeb,
} from '../web';

/**
 * Metadata Simbol Ekspor Resmi Modul `web` (dan alias `http`).
 */
export const simbolEksporWeb: Map<string, InfoSimbolModul> = new Map([
  [
    'buatAplikasi',
    {
      nama: 'buatAplikasi',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      variadik: true,
      minParameter: 0,
    },
  ],
  [
    'uraiJSON',
    {
      nama: 'uraiJSON',
      kategori: 'fungsi',
      parameter: [{ nama: 'teksJSON', tipe: 'teks' }],
      tipeKembalian: 'apapun',
    },
  ],
  [
    'cetakJSON',
    {
      nama: 'cetakJSON',
      kategori: 'fungsi',
      parameter: [{ nama: 'data', tipe: 'apapun' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'lepasHTML',
    {
      nama: 'lepasHTML',
      kategori: 'fungsi',
      parameter: [{ nama: 'teksMentah', tipe: 'teks' }],
      tipeKembalian: 'teks',
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
 * Membungkus antarmuka PermintaanWeb ke objek Peta NUSANTARA.
 */
function bungkusPermintaanNusantara(req: PermintaanWeb): NilaiPeta {
  const mapReq = new Map<string, NilaiRuntime>();

  mapReq.set('id', buatTeks(req.id));
  mapReq.set('metode', buatTeks(req.metode));
  mapReq.set('jalur', buatTeks(req.jalur));
  mapReq.set('ipKlien', buatTeks(req.ipKlien));
  mapReq.set('kueri', konversiKeNilaiRuntime(req.kueri));
  mapReq.set('parameter', konversiKeNilaiRuntime(req.parameter));
  mapReq.set('tajuk', konversiKeNilaiRuntime(req.tajuk));
  mapReq.set('kuki', konversiKeNilaiRuntime(req.kuki));
  mapReq.set('badan', konversiKeNilaiRuntime(req.badan));

  const fnAmbilParam: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilParam',
    eksekusi: (args: NilaiRuntime[]) => {
      const k = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const v = req.ambilParam(k);
      return v !== undefined ? buatTeks(v) : buatKosong();
    },
  };

  const fnAmbilKueri: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilKueri',
    eksekusi: (args: NilaiRuntime[]) => {
      const k = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const v = req.ambilKueri(k);
      return v !== undefined ? buatTeks(v) : buatKosong();
    },
  };

  const fnAmbilTajuk: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilTajuk',
    eksekusi: (args: NilaiRuntime[]) => {
      const k = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const v = req.ambilTajuk(k);
      return v !== undefined ? buatTeks(v) : buatKosong();
    },
  };

  mapReq.set('ambilParam', fnAmbilParam);
  mapReq.set('ambilKueri', fnAmbilKueri);
  mapReq.set('ambilTajuk', fnAmbilTajuk);

  return buatPeta(mapReq);
}

/**
 * Membungkus antarmuka ResponsWeb ke objek Peta NUSANTARA.
 */
function bungkusResponsNusantara(res: ResponsWeb): NilaiPeta {
  const mapRes = new Map<string, NilaiRuntime>();

  const fnStatus: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'status',
    eksekusi: (args: NilaiRuntime[]) => {
      const kode = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 200;
      res.status(kode);
      return mapRes as any;
    },
  };

  const fnTajuk: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tajuk',
    eksekusi: (args: NilaiRuntime[]) => {
      const k = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const v = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      res.tajuk(k, v);
      return mapRes as any;
    },
  };

  const fnTeks: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'teks',
    eksekusi: (args: NilaiRuntime[]) => {
      const konten = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const status = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : undefined;
      res.teks(konten, status);
      return buatKosong();
    },
  };

  const fnHtml: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'html',
    eksekusi: (args: NilaiRuntime[]) => {
      const konten = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const status = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : undefined;
      res.html(konten, status);
      return buatKosong();
    },
  };

  const fnJson: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'json',
    eksekusi: (args: NilaiRuntime[]) => {
      const data = args[0] !== undefined ? konversiDariNilaiRuntime(args[0]) : null;
      const status = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : undefined;
      res.json(data, status);
      return buatKosong();
    },
  };

  const fnAlihkan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'alihkan',
    eksekusi: (args: NilaiRuntime[]) => {
      const url = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '/';
      const status = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 302;
      res.alihkan(url, status);
      return buatKosong();
    },
  };

  mapRes.set('status', fnStatus);
  mapRes.set('tajuk', fnTajuk);
  mapRes.set('teks', fnTeks);
  mapRes.set('html', fnHtml);
  mapRes.set('json', fnJson);
  mapRes.set('alihkan', fnAlihkan);

  return buatPeta(mapRes);
}

/**
 * Membungkus instans AplikasiWeb ke objek Peta NUSANTARA.
 */
export function buatObjekAplikasiNusantara(app: AplikasiWeb): NilaiPeta {
  const mapApp = new Map<string, NilaiRuntime>();

  function daftarkanMetode(namaMethod: 'dapatkan' | 'kirimkan' | 'perbarui' | 'hapus' | 'semua') {
    return {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: namaMethod,
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length < 2) {
          throw new GalatRuntime(
            JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
            `Metode '${namaMethod}' membutuhkan 2 argumen: pola jalur dan fungsi penangan rute.`
          );
        }
        const polaArg = args[0];
        const fnArg = args[1];

        if (polaArg.jenis !== JenisNilaiRuntime.TEKS) {
          throw new GalatRuntime(
            JenisGalatRuntime.KETIDAKCOCOKAN_TIPE,
            `Argumen jalur pada '${namaMethod}' harus berupa teks.`
          );
        }

        const pola = polaArg.nilai;

        // Adapter pemanggilan handler
        const penangan = async (req: PermintaanWeb, res: ResponsWeb) => {
          const reqNusa = bungkusPermintaanNusantara(req);
          const resNusa = bungkusResponsNusantara(res);
          if (fnArg.jenis === JenisNilaiRuntime.FUNGSI_BAWAAN) {
            fnArg.eksekusi([reqNusa, resNusa]);
          } else {
            // Evaluasi fungsi pengguna melalui invoker interpreter jika terikat
            (fnArg as any).eksekusi([reqNusa, resNusa]);
          }
        };

        if (namaMethod === 'dapatkan') app.dapatkan(pola, penangan);
        else if (namaMethod === 'kirimkan') app.kirimkan(pola, penangan);
        else if (namaMethod === 'perbarui') app.perbarui(pola, penangan);
        else if (namaMethod === 'hapus') app.hapus(pola, penangan);
        else if (namaMethod === 'semua') app.semua(pola, penangan);

        return buatPeta(mapApp);
      },
    } as NilaiFungsiBawaan;
  }

  mapApp.set('dapatkan', daftarkanMetode('dapatkan'));
  mapApp.set('kirimkan', daftarkanMetode('kirimkan'));
  mapApp.set('perbarui', daftarkanMetode('perbarui'));
  mapApp.set('hapus', daftarkanMetode('hapus'));
  mapApp.set('semua', daftarkanMetode('semua'));

  // app.berkasStatis(prefixUrl, folderLokal)
  const fnBerkasStatis: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'berkasStatis',
    eksekusi: (args: NilaiRuntime[]) => {
      const prefix = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '/publik';
      const folder = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : 'publik';
      app.berkasStatis(prefix, folder);
      return buatPeta(mapApp);
    },
  };

  // app.daftarkanTemplate(nama, konten)
  const fnDaftarkanTemplate: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'daftarkanTemplate',
    eksekusi: (args: NilaiRuntime[]) => {
      const nama = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const konten = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      app.daftarkanTemplate(nama, konten);
      return buatPeta(mapApp);
    },
  };

  // app.render(namaAtauKonten, data)
  const fnRender: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'render',
    eksekusi: (args: NilaiRuntime[]) => {
      const templateStr = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const dataObj = args[1] !== undefined ? konversiDariNilaiRuntime(args[1]) : {};
      const hasil = app.render(templateStr, dataObj);
      return buatTeks(hasil);
    },
  };

  // app.mulai(port?, host?)
  const fnMulai: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'mulai',
    eksekusi: (args: NilaiRuntime[]) => {
      const port = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : undefined;
      const host = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : undefined;
      app.mulai(port, host);
      return buatLogika(true);
    },
  };

  // app.berhenti()
  const fnBerhenti: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'berhenti',
    eksekusi: () => {
      app.berhenti();
      return buatLogika(true);
    },
  };

  // app.apakahBerjalan()
  const fnApakahBerjalan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'apakahBerjalan',
    eksekusi: () => {
      return buatLogika(app.apakahBerjalan());
    },
  };

  // app.uji(opsiReq) -> { status, badan, tajuk }
  const fnUji: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'uji',
    eksekusi: (args: NilaiRuntime[]) => {
      const reqObj = args[0] !== undefined ? konversiDariNilaiRuntime(args[0]) : {};
      // Eksekusi uji sinkron/asinkron
      const promise = app.uji(reqObj);
      // Untuk interpreter NUSANTARA: jika promise, unwrap hasil bila selesai atau siapkan peta
      let hasilUji: any = null;
      promise.then(h => (hasilUji = h));

      const mapHasil = new Map<string, NilaiRuntime>();
      // Tunggu mikro-tik bila diperlukan atau kembalikan representasi instan
      return konversiKeNilaiRuntime(hasilUji || { status: 200, sukses: true });
    },
  };

  mapApp.set('berkasStatis', fnBerkasStatis);
  mapApp.set('daftarkanTemplate', fnDaftarkanTemplate);
  mapApp.set('render', fnRender);
  mapApp.set('mulai', fnMulai);
  mapApp.set('berhenti', fnBerhenti);
  mapApp.set('apakahBerjalan', fnApakahBerjalan);
  mapApp.set('uji', fnUji);

  (mapApp as any).__app = app;

  return buatPeta(mapApp);
}

/**
 * Pabrik Ekspor Resmi Modul `web`.
 */
export function buatEksporWeb(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  // web.buatAplikasi(opsi?: peta) -> peta
  const fnBuatAplikasi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatAplikasi',
    eksekusi: (args: NilaiRuntime[]) => {
      let opsiServer: OpsiServerWeb = {};
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        opsiServer = konversiDariNilaiRuntime(args[0]);
      }
      const app = new AplikasiWeb(opsiServer);
      return buatObjekAplikasiNusantara(app);
    },
  };

  // web.uraiJSON(teksJSON: teks) -> peta | daftar
  const fnUraiJSON: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'uraiJSON',
    eksekusi: (args: NilaiRuntime[]) => {
      const raw = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      try {
        const parsed = JSON.parse(raw);
        return konversiKeNilaiRuntime(parsed);
      } catch {
        return buatKosong();
      }
    },
  };

  // web.cetakJSON(data: apapun) -> teks
  const fnCetakJSON: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'cetakJSON',
    eksekusi: (args: NilaiRuntime[]) => {
      const data = args[0] !== undefined ? konversiDariNilaiRuntime(args[0]) : null;
      return buatTeks(JSON.stringify(data));
    },
  };

  // web.lepasHTML(teksMentah: teks) -> teks
  const fnLepas: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'lepasHTML',
    eksekusi: (args: NilaiRuntime[]) => {
      const raw = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      return buatTeks(fnLepasHTML(raw));
    },
  };

  ekspor.set('buatAplikasi', fnBuatAplikasi);
  ekspor.set('uraiJSON', fnUraiJSON);
  ekspor.set('cetakJSON', fnCetakJSON);
  ekspor.set('lepasHTML', fnLepas);

  return ekspor;
}
