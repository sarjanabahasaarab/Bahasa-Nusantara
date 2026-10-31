/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - GUI Framework & Desktop Application (Phase 36)
 * Modul Standar: gui (alias: antarmuka, desktop, ui)
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
import { Interpreter } from '../interpreter/interpreter';
import {
  AplikasiGUI,
  JendelaGUI,
  Widget,
  LabelWidget,
  TombolWidget,
  InputTeksWidget,
  AreaTeksWidget,
  KotakCentangWidget,
  TombolRadioWidget,
  PilihanDropdownWidget,
  DaftarWidget,
  TabelWidget,
  GambarWidget,
  IndikatorProgresWidget,
  SliderWidget,
  TabWidget,
  WadahWidget,
  BarisLayout,
  KolomLayout,
  GridLayout,
  StackLayout,
  WadahGulirWidget,
  BilahMenu,
  Menu,
  ItemMenu,
  pengelolaTemaGlobal,
  PengelolaDialogGUI,
  PengelolaFormGUI,
  NamaTemaGUI,
  JenisPeristiwaGUI,
} from '../gui';
import { konversiKeNilaiRuntime, konversiDariNilaiRuntime } from './basisdata';

export const simbolEksporGUI: Map<string, InfoSimbolModul> = new Map([
  [
    'buatAplikasi',
    {
      nama: 'buatAplikasi',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatJendela',
    {
      nama: 'buatJendela',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 1,
    },
  ],
  [
    'buatLabel',
    {
      nama: 'buatLabel',
      kategori: 'fungsi',
      parameter: [
        { nama: 'teks', tipe: 'teks' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'buatTombol',
    {
      nama: 'buatTombol',
      kategori: 'fungsi',
      parameter: [
        { nama: 'teks', tipe: 'teks' },
        { nama: 'saatKlik', tipe: 'fungsi' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'buatInputTeks',
    {
      nama: 'buatInputTeks',
      kategori: 'fungsi',
      parameter: [
        { nama: 'placeholder', tipe: 'teks' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatAreaTeks',
    {
      nama: 'buatAreaTeks',
      kategori: 'fungsi',
      parameter: [
        { nama: 'placeholder', tipe: 'teks' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatKotakCentang',
    {
      nama: 'buatKotakCentang',
      kategori: 'fungsi',
      parameter: [
        { nama: 'label', tipe: 'teks' },
        { nama: 'dicentang', tipe: 'logika' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'buatTombolRadio',
    {
      nama: 'buatTombolRadio',
      kategori: 'fungsi',
      parameter: [
        { nama: 'label', tipe: 'teks' },
        { nama: 'nilai', tipe: 'teks' },
        { nama: 'grup', tipe: 'teks' },
      ],
      tipeKembalian: 'peta',
      minParameter: 3,
    },
  ],
  [
    'buatPilihan',
    {
      nama: 'buatPilihan',
      kategori: 'fungsi',
      parameter: [
        { nama: 'daftarPilihan', tipe: 'daftar' },
        { nama: 'terpilih', tipe: 'teks' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatDaftar',
    {
      nama: 'buatDaftar',
      kategori: 'fungsi',
      parameter: [
        { nama: 'item', tipe: 'daftar' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatTabel',
    {
      nama: 'buatTabel',
      kategori: 'fungsi',
      parameter: [
        { nama: 'kolom', tipe: 'daftar' },
        { nama: 'baris', tipe: 'daftar' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'buatGambar',
    {
      nama: 'buatGambar',
      kategori: 'fungsi',
      parameter: [
        { nama: 'jalur', tipe: 'teks' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'buatProgres',
    {
      nama: 'buatProgres',
      kategori: 'fungsi',
      parameter: [
        { nama: 'nilai', tipe: 'bilangan' },
        { nama: 'maksimum', tipe: 'bilangan' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatSlider',
    {
      nama: 'buatSlider',
      kategori: 'fungsi',
      parameter: [
        { nama: 'min', tipe: 'bilangan' },
        { nama: 'maks', tipe: 'bilangan' },
        { nama: 'nilai', tipe: 'bilangan' },
      ],
      tipeKembalian: 'peta',
      minParameter: 2,
      variadik: true,
    },
  ],
  [
    'buatTab',
    {
      nama: 'buatTab',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatWadah',
    {
      nama: 'buatWadah',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatBaris',
    {
      nama: 'buatBaris',
      kategori: 'fungsi',
      parameter: [
        { nama: 'anak', tipe: 'daftar' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatKolom',
    {
      nama: 'buatKolom',
      kategori: 'fungsi',
      parameter: [
        { nama: 'anak', tipe: 'daftar' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatGrid',
    {
      nama: 'buatGrid',
      kategori: 'fungsi',
      parameter: [
        { nama: 'jumlahKolom', tipe: 'bilangan' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatStack',
    {
      nama: 'buatStack',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatGulir',
    {
      nama: 'buatGulir',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'buatBilahMenu',
    {
      nama: 'buatBilahMenu',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'peta',
    },
  ],
  [
    'buatMenu',
    {
      nama: 'buatMenu',
      kategori: 'fungsi',
      parameter: [{ nama: 'label', tipe: 'teks' }],
      tipeKembalian: 'peta',
    },
  ],
  [
    'buatItemMenu',
    {
      nama: 'buatItemMenu',
      kategori: 'fungsi',
      parameter: [
        { nama: 'label', tipe: 'teks' },
        { nama: 'aksi', tipe: 'fungsi' },
        { nama: 'shortcut', tipe: 'teks' },
      ],
      tipeKembalian: 'peta',
      minParameter: 1,
      variadik: true,
    },
  ],
  [
    'buatPemisahMenu',
    {
      nama: 'buatPemisahMenu',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'peta',
    },
  ],
  [
    'tampilkanPesan',
    {
      nama: 'tampilkanPesan',
      kategori: 'fungsi',
      parameter: [
        { nama: 'judul', tipe: 'teks' },
        { nama: 'pesan', tipe: 'teks' },
        { nama: 'tipe', tipe: 'teks' },
      ],
      tipeKembalian: 'kosong',
      minParameter: 2,
      variadik: true,
    },
  ],
  [
    'tampilkanKonfirmasi',
    {
      nama: 'tampilkanKonfirmasi',
      kategori: 'fungsi',
      parameter: [
        { nama: 'judul', tipe: 'teks' },
        { nama: 'pesan', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
      minParameter: 2,
    },
  ],
  [
    'bukaBerkas',
    {
      nama: 'bukaBerkas',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'simpanBerkas',
    {
      nama: 'simpanBerkas',
      kategori: 'fungsi',
      parameter: [{ nama: 'opsi', tipe: 'peta' }],
      tipeKembalian: 'peta',
      minParameter: 0,
      variadik: true,
    },
  ],
  [
    'aturTema',
    {
      nama: 'aturTema',
      kategori: 'fungsi',
      parameter: [{ nama: 'tema', tipe: 'teks' }],
      tipeKembalian: 'kosong',
    },
  ],
  [
    'dapatkanTema',
    {
      nama: 'dapatkanTema',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
  [
    'buatFormValidator',
    {
      nama: 'buatFormValidator',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'peta',
    },
  ],
]);

/**
 * Bungkus objek Widget ke objek NilaiPeta NUSANTARA
 */
export function bungkusWidget(widget: Widget): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();

  anggota.set('id', buatTeks(widget.id));
  anggota.set('jenis', buatTeks(widget.jenis));
  anggota.set('aktif', buatLogika(widget.aktif));
  anggota.set('terlihat', buatLogika(widget.terlihat));

  // Simpan ref internal
  const peta = buatPeta(anggota);
  (peta as any).__widget = widget;

  anggota.set('tambahAnak', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambahAnak',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length === 0 || !args[0] || !(args[0] as any).__widget) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_TIDAK_VALID, 'tambahAnak membutuhkan objek widget yang valid');
      }
      const anak = (args[0] as any).__widget as Widget;
      widget.tambahAnak(anak);
      return peta;
    },
  });

  anggota.set('setAktif', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setAktif',
    eksekusi: (args: NilaiRuntime[]) => {
      const status = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
      widget.setAktif(status);
      anggota.set('aktif', buatLogika(widget.aktif));
      return peta;
    },
  });

  anggota.set('setTerlihat', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setTerlihat',
    eksekusi: (args: NilaiRuntime[]) => {
      const status = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
      widget.setTerlihat(status);
      anggota.set('terlihat', buatLogika(widget.terlihat));
      return peta;
    },
  });

  anggota.set('setGaya', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setGaya',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const gayaData = konversiDariNilaiRuntime(args[0]);
        widget.setGaya(gayaData);
      }
      return peta;
    },
  });

  anggota.set('pasang', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pasang',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_TIDAK_VALID, "Metode 'pasang' membutuhkan nama peristiwa (teks) dan fungsi penangan.");
      }
      const jenisPeristiwa = args[0].nilai as JenisPeristiwaGUI;
      const fn = args[1];

      widget.pasang(jenisPeristiwa, (peristiwa) => {
        const argPeristiwa = buatPeta(
          new Map<string, NilaiRuntime>([
            ['idWidget', buatTeks(peristiwa.idWidget)],
            ['jenis', buatTeks(peristiwa.jenis)],
            ['stempelWaktu', buatBilangan(peristiwa.stempelWaktu)],
            ['nilaiTeks', buatTeks(peristiwa.nilaiTeks || '')],
            ['nilaiAngka', buatBilangan(peristiwa.nilaiAngka ?? 0)],
            ['nilaiLogika', buatLogika(peristiwa.nilaiLogika ?? false)],
            ['kunciKeyboard', buatTeks(peristiwa.kunciKeyboard || '')],
          ])
        );
        Interpreter.panggilFungsiAktif(fn, [argPeristiwa]);
      });

      return buatKosong();
    },
  });

  anggota.set('picu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'picu',
    eksekusi: (args: NilaiRuntime[]) => {
      const jenis = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? (args[0].nilai as JenisPeristiwaGUI) : 'klik';
      const data = args.length > 1 ? konversiDariNilaiRuntime(args[1]) : undefined;
      widget.picu(jenis, data);
      return buatKosong();
    },
  });

  anggota.set('serialisasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'serialisasi',
    eksekusi: () => {
      return konversiKeNilaiRuntime(widget.serialisasi());
    },
  });

  // Metode spesifik widget
  if (widget instanceof LabelWidget) {
    anggota.set('setTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setTeks',
      eksekusi: (args: NilaiRuntime[]) => {
        const t = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0] ? (args[0] as any).nilai : '');
        widget.setTeks(t);
        return peta;
      },
    });
    anggota.set('getTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getTeks',
      eksekusi: () => buatTeks(widget.getTeks()),
    });
  } else if (widget instanceof TombolWidget) {
    anggota.set('setTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setTeks',
      eksekusi: (args: NilaiRuntime[]) => {
        const t = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0] ? (args[0] as any).nilai : '');
        widget.setTeks(t);
        return peta;
      },
    });
    anggota.set('getTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getTeks',
      eksekusi: () => buatTeks(widget.getTeks()),
    });
  } else if (widget instanceof InputTeksWidget) {
    anggota.set('setNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setNilai',
      eksekusi: (args: NilaiRuntime[]) => {
        const t = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0] ? (args[0] as any).nilai : '');
        widget.setNilai(t);
        return peta;
      },
    });
    anggota.set('getNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getNilai',
      eksekusi: () => buatTeks(widget.getNilai()),
    });
    anggota.set('bersihkan', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'bersihkan',
      eksekusi: () => {
        widget.bersihkan();
        return peta;
      },
    });
  } else if (widget instanceof AreaTeksWidget) {
    anggota.set('setNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setNilai',
      eksekusi: (args: NilaiRuntime[]) => {
        const t = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0] ? (args[0] as any).nilai : '');
        widget.setNilai(t);
        return peta;
      },
    });
    anggota.set('getNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getNilai',
      eksekusi: () => buatTeks(widget.getNilai()),
    });
    anggota.set('tambahBaris', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tambahBaris',
      eksekusi: (args: NilaiRuntime[]) => {
        const b = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0] ? (args[0] as any).nilai : '');
        widget.tambahBaris(b);
        return peta;
      },
    });
  } else if (widget instanceof KotakCentangWidget) {
    anggota.set('setCentang', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setCentang',
      eksekusi: (args: NilaiRuntime[]) => {
        const c = args[0]?.jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
        widget.setCentang(c);
        return peta;
      },
    });
    anggota.set('isCentang', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'isCentang',
      eksekusi: () => buatLogika(widget.isCentang()),
    });
  } else if (widget instanceof PilihanDropdownWidget) {
    anggota.set('setTerpilih', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setTerpilih',
      eksekusi: (args: NilaiRuntime[]) => {
        const v = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
        widget.setTerpilih(v);
        return peta;
      },
    });
    anggota.set('getTerpilih', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getTerpilih',
      eksekusi: () => buatTeks(widget.getTerpilih() || ''),
    });
    anggota.set('tambahOpsi', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tambahOpsi',
      eksekusi: (args: NilaiRuntime[]) => {
        const label = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
        const nilai = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : label;
        widget.tambahOpsi(label, nilai);
        return peta;
      },
    });
  } else if (widget instanceof TabelWidget) {
    anggota.set('tambahBaris', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tambahBaris',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
          widget.tambahBaris(konversiDariNilaiRuntime(args[0]));
        }
        return peta;
      },
    });
    anggota.set('setData', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setData',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
          widget.setData(konversiDariNilaiRuntime(args[0]));
        }
        return peta;
      },
    });
    anggota.set('getData', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getData',
      eksekusi: () => konversiKeNilaiRuntime(widget.getData()),
    });
  } else if (widget instanceof DaftarWidget) {
    anggota.set('tambahItem', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tambahItem',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0) {
          widget.tambahItem(konversiDariNilaiRuntime(args[0]));
        }
        return peta;
      },
    });
    anggota.set('getData', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getData',
      eksekusi: () => konversiKeNilaiRuntime(widget.getData()),
    });
  } else if (widget instanceof IndikatorProgresWidget) {
    anggota.set('setNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setNilai',
      eksekusi: (args: NilaiRuntime[]) => {
        const v = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
        widget.setNilai(v);
        return peta;
      },
    });
    anggota.set('getNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getNilai',
      eksekusi: () => buatBilangan(widget.getNilai()),
    });
  } else if (widget instanceof SliderWidget) {
    anggota.set('setNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setNilai',
      eksekusi: (args: NilaiRuntime[]) => {
        const v = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
        widget.setNilai(v);
        return peta;
      },
    });
    anggota.set('getNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'getNilai',
      eksekusi: () => buatBilangan(widget.getNilai()),
    });
  } else if (widget instanceof TabWidget) {
    anggota.set('tambahTab', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tambahTab',
      eksekusi: (args: NilaiRuntime[]) => {
        const judul = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'Tab';
        const kontenWidget = (args[1] as any)?.__widget as Widget;
        if (kontenWidget) {
          widget.tambahTab(judul, kontenWidget);
        }
        return peta;
      },
    });
    anggota.set('pilihTab', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'pilihTab',
      eksekusi: (args: NilaiRuntime[]) => {
        const idx = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
        widget.pilihTab(idx);
        return peta;
      },
    });
  }

  return peta;
}

/**
 * Bungkus objek JendelaGUI ke objek NilaiPeta NUSANTARA
 */
export function bungkusJendela(jendela: JendelaGUI): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();

  anggota.set('id', buatTeks(jendela.id));
  anggota.set('judul', buatTeks(jendela.judul));
  anggota.set('lebar', buatBilangan(jendela.lebar));
  anggota.set('tinggi', buatBilangan(jendela.tinggi));

  const peta = buatPeta(anggota);
  (peta as any).__jendela = jendela;

  anggota.set('setKonten', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setKonten',
    eksekusi: (args: NilaiRuntime[]) => {
      const widget = (args[0] as any)?.__widget as Widget;
      if (!widget) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_TIDAK_VALID, 'setKonten membutuhkan objek widget yang valid');
      }
      jendela.setKonten(widget);
      return peta;
    },
  });

  anggota.set('setJudul', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setJudul',
    eksekusi: (args: NilaiRuntime[]) => {
      const j = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      jendela.setJudul(j);
      anggota.set('judul', buatTeks(jendela.judul));
      return peta;
    },
  });

  anggota.set('setBilahMenu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setBilahMenu',
    eksekusi: (args: NilaiRuntime[]) => {
      const menu = (args[0] as any)?.__bilahMenu as BilahMenu;
      if (menu) {
        jendela.setBilahMenu(menu);
      }
      return peta;
    },
  });

  anggota.set('ubahUkuran', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ubahUkuran',
    eksekusi: (args: NilaiRuntime[]) => {
      const l = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : jendela.lebar;
      const t = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : jendela.tinggi;
      jendela.ubahUkuran(l, t);
      anggota.set('lebar', buatBilangan(jendela.lebar));
      anggota.set('tinggi', buatBilangan(jendela.tinggi));
      return peta;
    },
  });

  anggota.set('maksimalkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'maksimalkan',
    eksekusi: () => {
      jendela.maksimalkan();
      return peta;
    },
  });

  anggota.set('minimalkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'minimalkan',
    eksekusi: () => {
      jendela.minimalkan();
      return peta;
    },
  });

  anggota.set('tutup', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tutup',
    eksekusi: () => {
      jendela.tutup();
      return buatKosong();
    },
  });

  anggota.set('serialisasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'serialisasi',
    eksekusi: () => {
      return konversiKeNilaiRuntime(jendela.serialisasi());
    },
  });

  anggota.set('pasang', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pasang',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_TIDAK_VALID, "Metode 'pasang' pada jendela membutuhkan tipe peristiwa dan fungsi.");
      }
      const jenis = args[0].nilai as JenisPeristiwaGUI;
      const fn = args[1];

      jendela.pasang(jenis, (peristiwa) => {
        const argPeristiwa = buatPeta(
          new Map<string, NilaiRuntime>([
            ['idWidget', buatTeks(peristiwa.idWidget)],
            ['jenis', buatTeks(peristiwa.jenis)],
            ['stempelWaktu', buatBilangan(peristiwa.stempelWaktu)],
          ])
        );
        Interpreter.panggilFungsiAktif(fn, [argPeristiwa]);
      });

      return buatKosong();
    },
  });

  return peta;
}

/**
 * Bungkus objek AplikasiGUI ke objek NilaiPeta NUSANTARA
 */
export function bungkusAplikasi(aplikasi: AplikasiGUI): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();

  anggota.set('id', buatTeks(aplikasi.konfigurasi.idAplikasi));
  anggota.set('nama', buatTeks(aplikasi.konfigurasi.namaAplikasi));

  const peta = buatPeta(anggota);
  (peta as any).__aplikasi = aplikasi;

  anggota.set('buatJendela', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatJendela',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[0]) : {};
      const jendela = aplikasi.buatJendela({
        judul: opsi.judul || 'Jendela Nusantara',
        lebar: opsi.lebar ?? 800,
        tinggi: opsi.tinggi ?? 600,
        ...opsi,
      });
      return bungkusJendela(jendela);
    },
  });

  anggota.set('setTema', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setTema',
    eksekusi: (args: NilaiRuntime[]) => {
      const tema = args[0]?.jenis === JenisNilaiRuntime.TEKS ? (args[0].nilai as NamaTemaGUI) : 'terang';
      aplikasi.setTema(tema);
      return peta;
    },
  });

  anggota.set('jalankan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'jalankan',
    eksekusi: () => {
      aplikasi.jalankan();
      return buatKosong();
    },
  });

  anggota.set('berhenti', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'berhenti',
    eksekusi: () => {
      aplikasi.berhenti();
      return buatKosong();
    },
  });

  anggota.set('hancurkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hancurkan',
    eksekusi: () => {
      aplikasi.hancurkan();
      return buatKosong();
    },
  });

  return peta;
}

/**
 * Buat NilaiRuntime ekspor resmi untuk modul `gui`
 */
export function buatEksporGUI(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  ekspor.set('buatAplikasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatAplikasi',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[0]) : {};
      const app = new AplikasiGUI({
        idAplikasi: opsi.id || 'id.nusantara.aplikasi',
        namaAplikasi: opsi.nama || 'Aplikasi Nusantara',
        ...opsi,
      });
      return bungkusAplikasi(app);
    },
  });

  ekspor.set('buatJendela', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatJendela',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[0]) : {};
      const jendela = new JendelaGUI({
        judul: opsi.judul || 'Jendela Nusantara',
        lebar: opsi.lebar ?? 800,
        tinggi: opsi.tinggi ?? 600,
        ...opsi,
      });
      return bungkusJendela(jendela);
    },
  });

  ekspor.set('buatLabel', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatLabel',
    eksekusi: (args: NilaiRuntime[]) => {
      const teks = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0] ? (args[0] as any).nilai : '');
      const opsi = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
      const label = new LabelWidget(teks, opsi.id, opsi.gaya);
      if (opsi.ukuranFont) label.setUkuranFont(opsi.ukuranFont);
      if (opsi.warna) label.setWarna(opsi.warna);
      if (opsi.perataan) label.setPerataan(opsi.perataan);
      return bungkusWidget(label);
    },
  });

  ekspor.set('buatTombol', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTombol',
    eksekusi: (args: NilaiRuntime[]) => {
      const teks = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0] ? (args[0] as any).nilai : '');
      const saatKlik = args.length > 1 ? args[1] : undefined;
      const opsi = args.length > 2 && args[2].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[2]) : {};
      const tombol = new TombolWidget(teks, opsi.id, opsi.gaya);
      if (opsi.ikon) tombol.setIkon(opsi.ikon);
      if (opsi.varian) tombol.setVarian(opsi.varian);
      if (saatKlik && (saatKlik.jenis === JenisNilaiRuntime.FUNGSI_BAWAAN || saatKlik.jenis === JenisNilaiRuntime.FUNGSI)) {
        tombol.pasang('klik', (evt) => {
          Interpreter.panggilFungsiAktif(saatKlik, [
            buatPeta(
              new Map<string, NilaiRuntime>([
                ['idWidget', buatTeks(evt.idWidget)],
                ['jenis', buatTeks(evt.jenis)],
              ])
            ),
          ]);
        });
      }
      return bungkusWidget(tombol);
    },
  });

  ekspor.set('buatInputTeks', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatInputTeks',
    eksekusi: (args: NilaiRuntime[]) => {
      const placeholder = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const opsi = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
      const input = new InputTeksWidget(placeholder, opsi.nilaiAwal || '', opsi.id, opsi.gaya);
      if (opsi.kataSandi) input.setKataSandi(true);
      if (opsi.wajib) input.setWajib(true);
      if (opsi.hanyaBaca) input.setHanyaBaca(true);
      return bungkusWidget(input);
    },
  });

  ekspor.set('buatAreaTeks', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatAreaTeks',
    eksekusi: (args: NilaiRuntime[]) => {
      const placeholder = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const opsi = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
      const area = new AreaTeksWidget(placeholder, opsi.nilaiAwal || '', opsi.baris || 4, opsi.id, opsi.gaya);
      return bungkusWidget(area);
    },
  });

  ekspor.set('buatKotakCentang', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKotakCentang',
    eksekusi: (args: NilaiRuntime[]) => {
      const label = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const dicentang = args[1]?.jenis === JenisNilaiRuntime.LOGIKA ? args[1].nilai : false;
      const opsi = args.length > 2 && args[2].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[2]) : {};
      const cb = new KotakCentangWidget(label, dicentang, opsi.id, opsi.gaya);
      return bungkusWidget(cb);
    },
  });

  ekspor.set('buatTombolRadio', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTombolRadio',
    eksekusi: (args: NilaiRuntime[]) => {
      const label = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const nilai = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const grup = args[2]?.jenis === JenisNilaiRuntime.TEKS ? args[2].nilai : 'default';
      const radio = new TombolRadioWidget(label, nilai, grup);
      return bungkusWidget(radio);
    },
  });

  ekspor.set('buatPilihan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatPilihan',
    eksekusi: (args: NilaiRuntime[]) => {
      const rawOpsi = args[0]?.jenis === JenisNilaiRuntime.DAFTAR ? konversiDariNilaiRuntime(args[0]) : [];
      const terpilih = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : undefined;
      const opts = rawOpsi.map((o: any) => (typeof o === 'string' ? { label: o, nilai: o } : o));
      const p = new PilihanDropdownWidget(opts, terpilih);
      return bungkusWidget(p);
    },
  });

  ekspor.set('buatDaftar', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatDaftar',
    eksekusi: (args: NilaiRuntime[]) => {
      const item = args[0]?.jenis === JenisNilaiRuntime.DAFTAR ? konversiDariNilaiRuntime(args[0]) : [];
      const d = new DaftarWidget(item);
      return bungkusWidget(d);
    },
  });

  ekspor.set('buatTabel', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTabel',
    eksekusi: (args: NilaiRuntime[]) => {
      const rawKolom = args[0]?.jenis === JenisNilaiRuntime.DAFTAR ? konversiDariNilaiRuntime(args[0]) : [];
      const rawBaris = args.length > 1 && args[1].jenis === JenisNilaiRuntime.DAFTAR ? konversiDariNilaiRuntime(args[1]) : [];
      const kolom = rawKolom.map((k: any) => (typeof k === 'string' ? { id: k, judul: k } : k));
      const tabel = new TabelWidget(kolom, rawBaris);
      return bungkusWidget(tabel);
    },
  });

  ekspor.set('buatGambar', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatGambar',
    eksekusi: (args: NilaiRuntime[]) => {
      const jalur = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const opsi = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
      const img = new GambarWidget(jalur, opsi.lebar, opsi.tinggi, opsi.teksAlt);
      return bungkusWidget(img);
    },
  });

  ekspor.set('buatProgres', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatProgres',
    eksekusi: (args: NilaiRuntime[]) => {
      const n = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
      const m = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 100;
      const p = new IndikatorProgresWidget(n, m);
      return bungkusWidget(p);
    },
  });

  ekspor.set('buatSlider', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatSlider',
    eksekusi: (args: NilaiRuntime[]) => {
      const min = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
      const maks = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 100;
      const n = args[2]?.jenis === JenisNilaiRuntime.BILANGAN ? args[2].nilai : min;
      const s = new SliderWidget(min, maks, n);
      return bungkusWidget(s);
    },
  });

  ekspor.set('buatTab', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTab',
    eksekusi: () => {
      const t = new TabWidget();
      return bungkusWidget(t);
    },
  });

  ekspor.set('buatWadah', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatWadah',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[0]) : {};
      const w = new WadahWidget(opsi.id, opsi.gaya);
      return bungkusWidget(w);
    },
  });

  ekspor.set('buatBaris', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatBaris',
    eksekusi: (args: NilaiRuntime[]) => {
      const rawAnak = args[0]?.jenis === JenisNilaiRuntime.DAFTAR ? args[0].elemen : [];
      const opsi = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
      const baris = new BarisLayout(opsi.jarak ?? 8, opsi.perataan ?? 'awal', opsi.id, opsi.gaya);
      for (const item of rawAnak) {
        if ((item as any)?.__widget) {
          baris.tambahAnak((item as any).__widget);
        }
      }
      return bungkusWidget(baris);
    },
  });

  ekspor.set('buatKolom', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKolom',
    eksekusi: (args: NilaiRuntime[]) => {
      const rawAnak = args[0]?.jenis === JenisNilaiRuntime.DAFTAR ? args[0].elemen : [];
      const opsi = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
      const kolom = new KolomLayout(opsi.jarak ?? 8, opsi.perataan ?? 'awal', opsi.id, opsi.gaya);
      for (const item of rawAnak) {
        if ((item as any)?.__widget) {
          kolom.tambahAnak((item as any).__widget);
        }
      }
      return bungkusWidget(kolom);
    },
  });

  ekspor.set('buatGrid', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatGrid',
    eksekusi: (args: NilaiRuntime[]) => {
      const cols = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 2;
      const g = new GridLayout(cols);
      return bungkusWidget(g);
    },
  });

  ekspor.set('buatStack', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatStack',
    eksekusi: () => {
      const s = new StackLayout();
      return bungkusWidget(s);
    },
  });

  ekspor.set('buatGulir', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatGulir',
    eksekusi: () => {
      const g = new WadahGulirWidget();
      return bungkusWidget(g);
    },
  });

  ekspor.set('buatBilahMenu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatBilahMenu',
    eksekusi: () => {
      const bm = new BilahMenu();
      const petaMenu = buatPeta(new Map<string, NilaiRuntime>());
      (petaMenu as any).__bilahMenu = bm;
      petaMenu.nilai.set('tambahMenu', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'tambahMenu',
        eksekusi: (args: NilaiRuntime[]) => {
          const menu = (args[0] as any)?.__menu as Menu;
          if (menu) {
            bm.tambahMenu(menu);
          }
          return petaMenu;
        },
      });
      return petaMenu;
    },
  });

  ekspor.set('buatMenu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatMenu',
    eksekusi: (args: NilaiRuntime[]) => {
      const label = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'Menu';
      const m = new Menu(label);
      const petaMenu = buatPeta(new Map<string, NilaiRuntime>());
      (petaMenu as any).__menu = m;
      petaMenu.nilai.set('tambahItem', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'tambahItem',
        eksekusi: (args: NilaiRuntime[]) => {
          const itm = (args[0] as any)?.__itemMenu as ItemMenu;
          if (itm) {
            m.tambahItem(itm);
          }
          return petaMenu;
        },
      });
      return petaMenu;
    },
  });

  ekspor.set('buatItemMenu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatItemMenu',
    eksekusi: (args: NilaiRuntime[]) => {
      const label = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const aksi = args.length > 1 ? args[1] : undefined;
      const shortcut = args.length > 2 && args[2].jenis === JenisNilaiRuntime.TEKS ? args[2].nilai : undefined;
      const fnAksi = aksi && (aksi.jenis === JenisNilaiRuntime.FUNGSI || aksi.jenis === JenisNilaiRuntime.FUNGSI_BAWAAN)
        ? () => { Interpreter.panggilFungsiAktif(aksi, []); }
        : undefined;

      const item = new ItemMenu(label, fnAksi, shortcut);
      const petaItem = buatPeta(new Map<string, NilaiRuntime>());
      (petaItem as any).__itemMenu = item;
      return petaItem;
    },
  });

  ekspor.set('buatPemisahMenu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatPemisahMenu',
    eksekusi: () => {
      const pemisah = ItemMenu.buatPemisah();
      const petaItem = buatPeta(new Map<string, NilaiRuntime>());
      (petaItem as any).__itemMenu = pemisah;
      return petaItem;
    },
  });

  const dialogManager = new PengelolaDialogGUI();

  ekspor.set('tampilkanPesan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tampilkanPesan',
    eksekusi: (args: NilaiRuntime[]) => {
      const judul = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'Pemberitahuan';
      const pesan = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const tipe = args.length > 2 && args[2].jenis === JenisNilaiRuntime.TEKS ? (args[2].nilai as any) : 'info';
      dialogManager.tampilkanPesan({ judul, pesan, tipe });
      return buatKosong();
    },
  });

  ekspor.set('tampilkanKonfirmasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tampilkanKonfirmasi',
    eksekusi: (args: NilaiRuntime[]) => {
      const judul = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'Konfirmasi';
      const pesan = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      return buatLogika(dialogManager.tampilkanKonfirmasi({ judul, pesan }));
    },
  });

  ekspor.set('bukaBerkas', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bukaBerkas',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[0]) : {};
      const hasil = dialogManager.bukaDialogBerkas(opsi);
      return konversiKeNilaiRuntime(hasil);
    },
  });

  ekspor.set('simpanBerkas', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'simpanBerkas',
    eksekusi: (args: NilaiRuntime[]) => {
      const opsi = args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[0]) : {};
      const hasil = dialogManager.simpanDialogBerkas(opsi);
      return konversiKeNilaiRuntime(hasil);
    },
  });

  ekspor.set('aturTema', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'aturTema',
    eksekusi: (args: NilaiRuntime[]) => {
      const tema = args[0]?.jenis === JenisNilaiRuntime.TEKS ? (args[0].nilai as NamaTemaGUI) : 'terang';
      pengelolaTemaGlobal.setTema(tema);
      return buatKosong();
    },
  });

  ekspor.set('dapatkanTema', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanTema',
    eksekusi: () => buatTeks(pengelolaTemaGlobal.getTemaSaatIni().nama),
  });

  ekspor.set('buatFormValidator', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatFormValidator',
    eksekusi: () => {
      const fv = new PengelolaFormGUI();
      const p = buatPeta(new Map<string, NilaiRuntime>());
      p.nilai.set('tambahAturan', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'tambahAturan',
        eksekusi: (args: NilaiRuntime[]) => {
          const field = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
          const aturan = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
          fv.tambahAturan(field, aturan);
          return p;
        },
      });
      p.nilai.set('validasi', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'validasi',
        eksekusi: (args: NilaiRuntime[]) => {
          const data = args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[0]) : {};
          const hasil = fv.validasi(data);
          return konversiKeNilaiRuntime(hasil);
        },
      });
      return p;
    },
  });

  return ekspor;
}
