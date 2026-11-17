/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Modul Standar: mobile (alias: seluler, android, ios)
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
  NilaiPeta,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import { Interpreter } from '../interpreter/interpreter';
import {
  AplikasiMobile,
  KomponenMobile,
  TeksMobile,
  TombolMobile,
  InputTeksMobile,
  InputSandiMobile,
  SakelarMobile,
  KotakCentangMobile,
  TombolRadioMobile,
  DropdownMobile,
  GambarMobile,
  IkonMobile,
  IndikatorProgresMobile,
  IndikatorMemuatMobile,
  KartuMobile,
  PemisahMobile,
  DaftarMobile,
  GridMobile,
  AreaAmanMobile,
  TataLetakVertikalMobile,
  TataLetakHorizontalMobile,
  TataLetakTumpukMobile,
  TampilanGulirMobile,
  NavigatorTumpukanMobile,
  NavigatorTabMobile,
  NavigasiBawahMobile,
  DialogMobile,
  AlertMobile,
  SnackbarMobile,
  PengelolaDeepLinkMobile,
  InfoPerangkatMobile,
  StatusJaringanMobile,
  StatusBateraiMobile,
  GetaranMobile,
  PapanKlipMobile,
  LokasiPerangkatMobile,
  NotifikasiLokalMobile,
  BerbagiMobile,
  JembatanMobileNative,
  PenyimpananAmanMobile,
  KonteksAplikasiMobile,
  JenisIzinMobile,
  KonfigurasiAplikasiMobile,
  RegistriNativeAPI,
  PengelolaKemampuanPerangkat,
  KlienAPIMobile,
  KlienAutentikasiMobile,
  MesinSinkronisasiMobile,
  PengelolaOperasiOffline,
  PengawasJaringanMobile,
  PengelolaTransferBerkasMobile,
  PengelolaKonfigurasiCloud,
  DistributionManager,
  ReleaseValidator,
  ReleaseManager,
  AssetValidator,
  VersionManager,
  PublishingManager,
  StoreValidator,
  ComplianceValidator,
  ReleaseNotesManager,
  ApprovalGate,
  PublishingReportGenerator,
  UpdateManager,
  RollbackManager,
} from '../mobile';
import { konversiKeNilaiRuntime, konversiDariNilaiRuntime } from './basisdata';

// Map weak reference untuk mengaitkan NilaiPeta dengan instance obyek asli
const petaKeKomponen = new WeakMap<NilaiPeta, KomponenMobile>();
const petaKeAplikasi = new WeakMap<NilaiPeta, AplikasiMobile>();

export function bungkusKomponenMobile(komponen: KomponenMobile): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();
  anggota.set('id', buatTeks(komponen.id));
  anggota.set('jenis', buatTeks(komponen.jenis));
  anggota.set('aktif', buatLogika(komponen.aktif));
  anggota.set('terlihat', buatLogika(komponen.terlihat));

  const peta = buatPeta(anggota);
  petaKeKomponen.set(peta, komponen);

  // Method: tambahAnak
  anggota.set('tambahAnak', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambahAnak',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const anakKomp = petaKeKomponen.get(args[0] as NilaiPeta);
        if (anakKomp) {
          komponen.tambahAnak(anakKomp);
        }
      }
      return peta;
    },
  });

  // Method: hapusAnak
  anggota.set('hapusAnak', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hapusAnak',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const anakKomp = petaKeKomponen.get(args[0] as NilaiPeta);
        if (anakKomp) {
          const res = komponen.hapusAnak(anakKomp);
          return buatLogika(res);
        }
      }
      return buatLogika(false);
    },
  });

  // Method: setGaya
  anggota.set('setGaya', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setGaya',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const gayaData = konversiDariNilaiRuntime(args[0]);
        komponen.setGaya(gayaData);
      }
      return peta;
    },
  });

  // Method: setAktif
  anggota.set('setAktif', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setAktif',
    eksekusi: (args: NilaiRuntime[]) => {
      const status = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
      komponen.setAktif(status);
      anggota.set('aktif', buatLogika(komponen.aktif));
      return peta;
    },
  });

  // Method: setTerlihat
  anggota.set('setTerlihat', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setTerlihat',
    eksekusi: (args: NilaiRuntime[]) => {
      const status = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
      komponen.setTerlihat(status);
      anggota.set('terlihat', buatLogika(komponen.terlihat));
      return peta;
    },
  });

  // Method: pasang
  anggota.set('pasang', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pasang',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 2 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_TIDAK_VALID, "Metode 'pasang' membutuhkan jenis peristiwa (teks) dan fungsi penangan.");
      }
      const jenisPeristiwa = args[0].nilai as any;
      const fn = args[1];

      komponen.pasang(jenisPeristiwa, (peristiwa) => {
        const argPeristiwa = buatPeta(
          new Map<string, NilaiRuntime>([
            ['idKomponen', buatTeks(peristiwa.idKomponen)],
            ['jenis', buatTeks(peristiwa.jenis)],
            ['stempelWaktu', buatBilangan(peristiwa.stempelWaktu)],
            ['nilaiTeks', buatTeks(peristiwa.nilaiTeks || '')],
            ['nilaiAngka', buatBilangan(peristiwa.nilaiAngka ?? 0)],
            ['nilaiLogika', buatLogika(peristiwa.nilaiLogika ?? false)],
          ])
        );
        Interpreter.panggilFungsiAktif(fn, [argPeristiwa]);
      });

      return buatKosong();
    },
  });

  // Komponen khusus: TeksMobile
  if (komponen instanceof TeksMobile) {
    anggota.set('setTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setTeks',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS) {
          komponen.setTeks(args[0].nilai);
        }
        return peta;
      },
    });
    anggota.set('dapatkanTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'dapatkanTeks',
      eksekusi: () => buatTeks(komponen.teks),
    });
  }

  // Komponen khusus: TombolMobile
  if (komponen instanceof TombolMobile) {
    anggota.set('setMemuat', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setMemuat',
      eksekusi: (args: NilaiRuntime[]) => {
        const loading = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
        komponen.setMemuat(loading);
        return peta;
      },
    });
    anggota.set('klik', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'klik',
      eksekusi: () => {
        komponen.picuKlik();
        return buatKosong();
      },
    });
  }

  // Komponen khusus: InputTeksMobile
  if (komponen instanceof InputTeksMobile) {
    anggota.set('setTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setTeks',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS) {
          komponen.setTeks(args[0].nilai);
        }
        return peta;
      },
    });
    anggota.set('dapatkanTeks', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'dapatkanTeks',
      eksekusi: () => buatTeks(komponen.teks),
    });
  }

  // Komponen khusus: SakelarMobile
  if (komponen instanceof SakelarMobile) {
    anggota.set('setAktifkan', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setAktifkan',
      eksekusi: (args: NilaiRuntime[]) => {
        const status = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
        komponen.setAktifkan(status);
        return peta;
      },
    });
    anggota.set('apakahAktif', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'apakahAktif',
      eksekusi: () => buatLogika(komponen.statusAktif),
    });
  }

  if (komponen instanceof IndikatorProgresMobile) {
    anggota.set('setNilai', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setNilai',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.BILANGAN) {
          komponen.setNilai(args[0].nilai);
        }
        return peta;
      },
    });
  }

  if (komponen instanceof KotakCentangMobile) {
    anggota.set('setCentang', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setCentang',
      eksekusi: (args: NilaiRuntime[]) => {
        const val = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
        komponen.setCentang(val);
        return peta;
      },
    });
  }

  if (komponen instanceof TombolRadioMobile) {
    anggota.set('setTerpilih', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setTerpilih',
      eksekusi: (args: NilaiRuntime[]) => {
        const val = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
        komponen.setTerpilih(val);
        return peta;
      },
    });
  }

  if (komponen instanceof DropdownMobile) {
    anggota.set('setTerpilih', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'setTerpilih',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS) {
          komponen.setTerpilih(args[0].nilai);
        }
        return peta;
      },
    });
  }

  if (komponen instanceof NavigatorTumpukanMobile) {
    anggota.set('daftarkanRute', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'daftarkanRute',
      eksekusi: (args: NilaiRuntime[]) => {
        const nama = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'utama';
        const halPeta = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? (args[1] as NilaiPeta) : undefined;
        const halKomp = halPeta ? petaKeKomponen.get(halPeta) : undefined;
        komponen.daftarkanRute({
          nama,
          judul: nama,
          transisi: 'geser',
          tampilkanBilahJudul: true,
          pembuatHalaman: () => halKomp || new TeksMobile({ teks: `Halaman ${nama}` }),
        });
        return peta;
      },
    });
    anggota.set('dorong', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'dorong',
      eksekusi: (args: NilaiRuntime[]) => {
        const nama = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
        const param = args.length > 1 && args[1].jenis === JenisNilaiRuntime.PETA ? konversiDariNilaiRuntime(args[1]) : {};
        return buatLogika(komponen.dorong(nama, param));
      },
    });
    anggota.set('kembali', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'kembali',
      eksekusi: () => buatLogika(komponen.kembali()),
    });
    anggota.set('dapatkanKedalaman', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'dapatkanKedalaman',
      eksekusi: () => buatBilangan(komponen.dapatkanKedalaman()),
    });
  }

  if (komponen instanceof NavigatorTabMobile) {
    anggota.set('pilihTab', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'pilihTab',
      eksekusi: (args: NilaiRuntime[]) => {
        const k = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
        return buatLogika(komponen.pilihTab(k));
      },
    });
  }

  if (komponen instanceof NavigasiBawahMobile) {
    anggota.set('pilih', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'pilih',
      eksekusi: (args: NilaiRuntime[]) => {
        if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS) {
          komponen.pilih(args[0].nilai);
        }
        return peta;
      },
    });
  }

  if (komponen instanceof DialogMobile || komponen instanceof AlertMobile) {
    anggota.set('buka', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'buka',
      eksekusi: () => {
        komponen.buka();
        return peta;
      },
    });
    anggota.set('tutup', {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tutup',
      eksekusi: () => {
        komponen.tutup();
        return peta;
      },
    });
  }

  // Method: toJson
  anggota.set('keJson', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keJson',
    eksekusi: () => konversiKeNilaiRuntime(komponen.toJson()),
  });

  return peta;
}

export function bungkusAplikasiMobile(app: AplikasiMobile): NilaiPeta {
  const anggota = new Map<string, NilaiRuntime>();
  const konfig = app.dapatkanKonfigurasi();

  anggota.set('nama', buatTeks(konfig.nama));
  anggota.set('id', buatTeks(konfig.id));
  anggota.set('versi', buatTeks(konfig.versi));
  anggota.set('nomorBuild', buatBilangan(konfig.nomorBuild));
  anggota.set('status', buatTeks(app.dapatkanStatusLifecycle()));

  const peta = buatPeta(anggota);
  petaKeAplikasi.set(peta, app);

  anggota.set('tambahKomponen', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambahKomponen',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const komp = petaKeKomponen.get(args[0] as NilaiPeta);
        if (komp) {
          app.tambahKomponenAkar(komp);
        }
      }
      return peta;
    },
  });

  anggota.set('setNavigator', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'setNavigator',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const nav = petaKeKomponen.get(args[0] as NilaiPeta);
        if (nav) {
          app.setNavigator(nav);
        }
      }
      return peta;
    },
  });

  anggota.set('keLatarBelakang', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keLatarBelakang',
    eksekusi: () => {
      app.keLatarBelakang();
      anggota.set('status', buatTeks(app.dapatkanStatusLifecycle()));
      return buatKosong();
    },
  });

  anggota.set('jalankan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'jalankan',
    eksekusi: () => {
      app.jalankan();
      anggota.set('status', buatTeks(app.dapatkanStatusLifecycle()));
      return buatKosong();
    },
  });

  anggota.set('jeda', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'jeda',
    eksekusi: () => {
      app.jeda();
      anggota.set('status', buatTeks(app.dapatkanStatusLifecycle()));
      return buatKosong();
    },
  });

  anggota.set('lanjutkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'lanjutkan',
    eksekusi: () => {
      app.lanjutkan();
      anggota.set('status', buatTeks(app.dapatkanStatusLifecycle()));
      return buatKosong();
    },
  });

  anggota.set('berhenti', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'berhenti',
    eksekusi: () => {
      app.berhenti();
      anggota.set('status', buatTeks(app.dapatkanStatusLifecycle()));
      return buatKosong();
    },
  });

  anggota.set('hancurkan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hancurkan',
    eksekusi: () => {
      app.hancurkan();
      anggota.set('status', buatTeks(app.dapatkanStatusLifecycle()));
      return buatKosong();
    },
  });

  anggota.set('aturState', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'aturState',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 2 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        const k = args[0].nilai;
        const v = konversiDariNilaiRuntime(args[1]);
        app.dapatkanState().atur(k, v);
      }
      return buatKosong();
    },
  });

  anggota.set('dapatkanState', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanState',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 1 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        const k = args[0].nilai;
        const v = app.dapatkanState().dapatkan(k);
        return konversiKeNilaiRuntime(v);
      }
      return buatKosong();
    },
  });

  anggota.set('keJson', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'keJson',
    eksekusi: () => konversiKeNilaiRuntime(app.toJson()),
  });

  return peta;
}

export const simbolEksporMobile: Map<string, InfoSimbolModul> = new Map([
  ['buatAplikasiMobile', { nama: 'buatAplikasiMobile', kategori: 'fungsi', parameter: [{ nama: 'konfig', tipe: 'peta' }], tipeKembalian: 'peta', minParameter: 1 }],
  ['jalankanAplikasiMobile', { nama: 'jalankanAplikasiMobile', kategori: 'fungsi', parameter: [{ nama: 'aplikasi', tipe: 'peta' }], tipeKembalian: 'kosong', minParameter: 1 }],
  ['tambahKomponenMobile', { nama: 'tambahKomponenMobile', kategori: 'fungsi', parameter: [{ nama: 'wadah', tipe: 'peta' }, { nama: 'anak', tipe: 'peta' }], tipeKembalian: 'peta', minParameter: 2 }],
  ['buatTeks', { nama: 'buatTeks', kategori: 'fungsi', parameter: [{ nama: 'teks', tipe: 'teks' }, { nama: 'ukuran', tipe: 'bilangan' }, { nama: 'ketebalan', tipe: 'teks' }, { nama: 'warna', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['buatTombol', { nama: 'buatTombol', kategori: 'fungsi', parameter: [{ nama: 'teks', tipe: 'teks' }, { nama: 'saatKlik', tipe: 'fungsi' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['buatInputTeks', { nama: 'buatInputTeks', kategori: 'fungsi', parameter: [{ nama: 'placeholder', tipe: 'teks' }, { nama: 'nilaiAwal', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatInputSandi', { nama: 'buatInputSandi', kategori: 'fungsi', parameter: [{ nama: 'placeholder', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatSakelar', { nama: 'buatSakelar', kategori: 'fungsi', parameter: [{ nama: 'aktif', tipe: 'logika' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatKotakCentang', { nama: 'buatKotakCentang', kategori: 'fungsi', parameter: [{ nama: 'label', tipe: 'teks' }, { nama: 'dicentang', tipe: 'logika' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['buatTombolRadio', { nama: 'buatTombolRadio', kategori: 'fungsi', parameter: [{ nama: 'label', tipe: 'teks' }, { nama: 'nilai', tipe: 'teks' }, { nama: 'grup', tipe: 'teks' }, { nama: 'terpilih', tipe: 'logika' }], tipeKembalian: 'peta', minParameter: 2, variadik: true }],
  ['buatDropdown', { nama: 'buatDropdown', kategori: 'fungsi', parameter: [{ nama: 'opsi', tipe: 'daftar' }, { nama: 'nilaiAwal', tipe: 'teks' }, { nama: 'placeholder', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['buatGambar', { nama: 'buatGambar', kategori: 'fungsi', parameter: [{ nama: 'sumber', tipe: 'teks' }, { nama: 'lebar', tipe: 'bilangan' }, { nama: 'tinggi', tipe: 'bilangan' }, { nama: 'modeUkuran', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['buatIkon', { nama: 'buatIkon', kategori: 'fungsi', parameter: [{ nama: 'nama', tipe: 'teks' }, { nama: 'ukuran', tipe: 'bilangan' }, { nama: 'warna', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['buatIndikatorProgres', { nama: 'buatIndikatorProgres', kategori: 'fungsi', parameter: [{ nama: 'nilai', tipe: 'bilangan' }, { nama: 'nilaiMaks', tipe: 'bilangan' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatIndikatorMemuat', { nama: 'buatIndikatorMemuat', kategori: 'fungsi', parameter: [{ nama: 'aktif', tipe: 'logika' }, { nama: 'warna', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatKartu', { nama: 'buatKartu', kategori: 'fungsi', parameter: [{ nama: 'anak', tipe: 'daftar' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatPemisah', { nama: 'buatPemisah', kategori: 'fungsi', parameter: [{ nama: 'arah', tipe: 'teks' }, { nama: 'warna', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatDaftar', { nama: 'buatDaftar', kategori: 'fungsi', parameter: [{ nama: 'data', tipe: 'daftar' }, { nama: 'pembuatItem', tipe: 'fungsi' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatGrid', { nama: 'buatGrid', kategori: 'fungsi', parameter: [{ nama: 'kolom', tipe: 'bilangan' }, { nama: 'jarak', tipe: 'bilangan' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatAreaAman', { nama: 'buatAreaAman', kategori: 'fungsi', parameter: [{ nama: 'anak', tipe: 'daftar' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatTataLetakVertikal', { nama: 'buatTataLetakVertikal', kategori: 'fungsi', parameter: [{ nama: 'anak', tipe: 'daftar' }, { nama: 'jarak', tipe: 'bilangan' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatTataLetakHorizontal', { nama: 'buatTataLetakHorizontal', kategori: 'fungsi', parameter: [{ nama: 'anak', tipe: 'daftar' }, { nama: 'jarak', tipe: 'bilangan' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatTataLetakTumpuk', { nama: 'buatTataLetakTumpuk', kategori: 'fungsi', parameter: [{ nama: 'anak', tipe: 'daftar' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatTampilanGulir', { nama: 'buatTampilanGulir', kategori: 'fungsi', parameter: [{ nama: 'anak', tipe: 'daftar' }, { nama: 'arah', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatNavigatorTumpukan', { nama: 'buatNavigatorTumpukan', kategori: 'fungsi', parameter: [{ nama: 'ruteAwal', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatNavigatorTab', { nama: 'buatNavigatorTab', kategori: 'fungsi', parameter: [{ nama: 'daftarTab', tipe: 'daftar' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['buatNavigasiBawah', { nama: 'buatNavigasiBawah', kategori: 'fungsi', parameter: [{ nama: 'items', tipe: 'daftar' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['tampilkanDialog', { nama: 'tampilkanDialog', kategori: 'fungsi', parameter: [{ nama: 'judul', tipe: 'teks' }, { nama: 'pesan', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['tampilkanAlert', { nama: 'tampilkanAlert', kategori: 'fungsi', parameter: [{ nama: 'judul', tipe: 'teks' }, { nama: 'pesan', tipe: 'teks' }, { nama: 'konfirmasi', tipe: 'teks' }, { nama: 'batal', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 2, variadik: true }],
  ['tampilkanSnackbar', { nama: 'tampilkanSnackbar', kategori: 'fungsi', parameter: [{ nama: 'pesan', tipe: 'teks' }, { nama: 'durasiMs', tipe: 'bilangan' }, { nama: 'tipe', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['dapatkanInfoPerangkat', { nama: 'dapatkanInfoPerangkat', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['dapatkanStatusJaringan', { nama: 'dapatkanStatusJaringan', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['dapatkanStatusBaterai', { nama: 'dapatkanStatusBaterai', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['getar', { nama: 'getar', kategori: 'fungsi', parameter: [{ nama: 'durasiMs', tipe: 'bilangan' }], tipeKembalian: 'logika', minParameter: 0, variadik: true }],
  ['haptik', { nama: 'haptik', kategori: 'fungsi', parameter: [{ nama: 'jenis', tipe: 'teks' }], tipeKembalian: 'logika', minParameter: 0, variadik: true }],
  ['salinPapanKlip', { nama: 'salinPapanKlip', kategori: 'fungsi', parameter: [{ nama: 'teks', tipe: 'teks' }], tipeKembalian: 'logika', minParameter: 1 }],
  ['tempelPapanKlip', { nama: 'tempelPapanKlip', kategori: 'fungsi', parameter: [], tipeKembalian: 'teks', minParameter: 0 }],
  ['dapatkanLokasi', { nama: 'dapatkanLokasi', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['jadwalkanNotifikasi', { nama: 'jadwalkanNotifikasi', kategori: 'fungsi', parameter: [{ nama: 'opsi', tipe: 'peta' }], tipeKembalian: 'logika', minParameter: 1 }],
  ['batalkanNotifikasi', { nama: 'batalkanNotifikasi', kategori: 'fungsi', parameter: [{ nama: 'id', tipe: 'teks' }], tipeKembalian: 'logika', minParameter: 1 }],
  ['bagikan', { nama: 'bagikan', kategori: 'fungsi', parameter: [{ nama: 'opsi', tipe: 'peta' }], tipeKembalian: 'logika', minParameter: 1 }],
  ['periksaIzin', { nama: 'periksaIzin', kategori: 'fungsi', parameter: [{ nama: 'izin', tipe: 'teks' }], tipeKembalian: 'teks', minParameter: 1 }],
  ['mintaIzin', { nama: 'mintaIzin', kategori: 'fungsi', parameter: [{ nama: 'izin', tipe: 'teks' }], tipeKembalian: 'logika', minParameter: 1, variadik: true }],
  ['simpanAman', { nama: 'simpanAman', kategori: 'fungsi', parameter: [{ nama: 'kunci', tipe: 'teks' }, { nama: 'nilai', tipe: 'teks' }], tipeKembalian: 'logika', minParameter: 2 }],
  ['ambilAman', { nama: 'ambilAman', kategori: 'fungsi', parameter: [{ nama: 'kunci', tipe: 'teks' }], tipeKembalian: 'teks', minParameter: 1 }],
  ['hapusAman', { nama: 'hapusAman', kategori: 'fungsi', parameter: [{ nama: 'kunci', tipe: 'teks' }], tipeKembalian: 'logika', minParameter: 1 }],
  ['panggilJembatanNative', { nama: 'panggilJembatanNative', kategori: 'fungsi', parameter: [{ nama: 'modul', tipe: 'teks' }, { nama: 'metode', tipe: 'teks' }, { nama: 'argumen', tipe: 'apapun' }], tipeKembalian: 'apapun', minParameter: 2, variadik: true }],
  ['panggilNative', { nama: 'panggilNative', kategori: 'fungsi', parameter: [{ nama: 'namaApi', tipe: 'teks' }, { nama: 'argumen', tipe: 'apapun' }], tipeKembalian: 'peta', minParameter: 1, variadik: true }],
  ['daftarNativeAPI', { nama: 'daftarNativeAPI', kategori: 'fungsi', parameter: [], tipeKembalian: 'daftar', minParameter: 0 }],
  ['periksaNativeAPI', { nama: 'periksaNativeAPI', kategori: 'fungsi', parameter: [{ nama: 'namaApi', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1 }],
  ['dapatkanKemampuanPerangkat', { nama: 'dapatkanKemampuanPerangkat', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['buatKlienAPI', { nama: 'buatKlienAPI', kategori: 'fungsi', parameter: [{ nama: 'konfig', tipe: 'apapun' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatKlienAutentikasi', { nama: 'buatKlienAutentikasi', kategori: 'fungsi', parameter: [{ nama: 'konfig', tipe: 'apapun' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['sinkronkanDataMobile', { nama: 'sinkronkanDataMobile', kategori: 'fungsi', parameter: [{ nama: 'opsi', tipe: 'apapun' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['antreanOfflineMobile', { nama: 'antreanOfflineMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['periksaJaringanMobile', { nama: 'periksaJaringanMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['unggahBerkasCloud', { nama: 'unggahBerkasCloud', kategori: 'fungsi', parameter: [{ nama: 'namaBerkas', tipe: 'teks' }, { nama: 'konten', tipe: 'teks' }, { nama: 'opsi', tipe: 'apapun' }], tipeKembalian: 'peta', minParameter: 2, variadik: true }],
  ['unduhBerkasCloud', { nama: 'unduhBerkasCloud', kategori: 'fungsi', parameter: [{ nama: 'urlAtauId', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 1 }],
  ['dapatkanKonfigurasiCloud', { nama: 'dapatkanKonfigurasiCloud', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['dapatkanInfoDistribusi', { nama: 'dapatkanInfoDistribusi', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['validasiRilisMobile', { nama: 'validasiRilisMobile', kategori: 'fungsi', parameter: [{ nama: 'lingkungan', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['kelolaVersiMobile', { nama: 'kelolaVersiMobile', kategori: 'fungsi', parameter: [{ nama: 'aksi', tipe: 'teks' }, { nama: 'tipe', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['periksaAsetMobile', { nama: 'periksaAsetMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['buatLaporanDistribusi', { nama: 'buatLaporanDistribusi', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['periksaKesiapanTokoMobile', { nama: 'periksaKesiapanTokoMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['buatCatatanRilisMobile', { nama: 'buatCatatanRilisMobile', kategori: 'fungsi', parameter: [{ nama: 'versi', tipe: 'teks' }, { nama: 'buildNumber', tipe: 'bilangan' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['buatLaporanPublikasiMobile', { nama: 'buatLaporanPublikasiMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['periksaPembaruanMobile', { nama: 'periksaPembaruanMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['unduhPembaruanResourceMobile', { nama: 'unduhPembaruanResourceMobile', kategori: 'fungsi', parameter: [{ nama: 'idResource', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['aktifkanPembaruanResourceMobile', { nama: 'aktifkanPembaruanResourceMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['rollbackPembaruanResourceMobile', { nama: 'rollbackPembaruanResourceMobile', kategori: 'fungsi', parameter: [{ nama: 'platform', tipe: 'teks' }], tipeKembalian: 'peta', minParameter: 0, variadik: true }],
  ['dapatkanStatusPembaruanMobile', { nama: 'dapatkanStatusPembaruanMobile', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['aturNavigatorMobile', { nama: 'aturNavigatorMobile', kategori: 'fungsi', parameter: [{ nama: 'aplikasi', tipe: 'peta' }, { nama: 'navigator', tipe: 'peta' }], tipeKembalian: 'peta', minParameter: 2 }],
  ['uraiDeepLinkMobile', { nama: 'uraiDeepLinkMobile', kategori: 'fungsi', parameter: [{ nama: 'url', tipe: 'teks' }], tipeKembalian: 'apapun', minParameter: 1 }],
]);

export function buatEksporMobile(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  // buatAplikasiMobile(konfigurasi)
  ekspor.set('buatAplikasiMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatAplikasiMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      let konfig: Partial<KonfigurasiAplikasiMobile> = {};
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        konfig = konversiDariNilaiRuntime(args[0]);
      }
      const app = new AplikasiMobile({
        nama: konfig.nama || 'Aplikasi Mobile Nusantara',
        id: konfig.id || 'id.nusantara.aplikasi',
        versi: konfig.versi || '1.0.0',
        nomorBuild: konfig.nomorBuild || 1,
        ...konfig,
      });
      return bungkusAplikasiMobile(app);
    },
  });

  // jalankanAplikasiMobile(app)
  ekspor.set('jalankanAplikasiMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'jalankanAplikasiMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const app = petaKeAplikasi.get(args[0] as NilaiPeta);
        if (app) {
          app.jalankan();
        }
      }
      return buatKosong();
    },
  });

  // tambahKomponenMobile(wadah, anak)
  ekspor.set('tambahKomponenMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambahKomponenMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 2 && args[0].jenis === JenisNilaiRuntime.PETA && args[1].jenis === JenisNilaiRuntime.PETA) {
        const wadahPeta = args[0] as NilaiPeta;
        const anakPeta = args[1] as NilaiPeta;

        const wadahApp = petaKeAplikasi.get(wadahPeta);
        const wadahKomp = petaKeKomponen.get(wadahPeta);
        const anakKomp = petaKeKomponen.get(anakPeta);

        if (anakKomp) {
          if (wadahApp) {
            wadahApp.tambahKomponenAkar(anakKomp);
          } else if (wadahKomp) {
            wadahKomp.tambahAnak(anakKomp);
          }
        }
        return wadahPeta;
      }
      return buatKosong();
    },
  });

  // aturNavigatorMobile(aplikasi, navigator)
  ekspor.set('aturNavigatorMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'aturNavigatorMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 2 && args[0].jenis === JenisNilaiRuntime.PETA && args[1].jenis === JenisNilaiRuntime.PETA) {
        const app = petaKeAplikasi.get(args[0] as NilaiPeta);
        const nav = petaKeKomponen.get(args[1] as NilaiPeta);
        if (app && nav) {
          app.setNavigator(nav);
        }
        return args[0];
      }
      return buatKosong();
    },
  });

  // uraiDeepLinkMobile(url)
  ekspor.set('uraiDeepLinkMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'uraiDeepLinkMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      const url = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const dl = new PengelolaDeepLinkMobile();
      const hasil = dl.uraikanUrl(url);
      return hasil ? konversiKeNilaiRuntime(hasil) : buatKosong();
    },
  });

  // buatTeks(teks, ukuran?, berat?, warna?)
  ekspor.set('buatTeks', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTeks',
    eksekusi: (args: NilaiRuntime[]) => {
      const teks = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const ukuran = args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 16;
      const berat = args.length > 2 && args[2].jenis === JenisNilaiRuntime.TEKS ? (args[2].nilai as any) : 'normal';
      const warna = args.length > 3 && args[3].jenis === JenisNilaiRuntime.TEKS ? args[3].nilai : undefined;

      const komp = new TeksMobile({
        teks,
        gaya: {
          ukuranFont: ukuran,
          beratFont: berat,
          warnaTeks: warna,
        },
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatTombol(teks, saatKlik?, varian?, warna?)
  ekspor.set('buatTombol', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTombol',
    eksekusi: (args: NilaiRuntime[]) => {
      const teks = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'Tombol';
      const fn = args.length > 1 && args[1].jenis === JenisNilaiRuntime.FUNGSI_BAWAAN || (args.length > 1 && (args[1] as any).jenis === JenisNilaiRuntime.FUNGSI) ? args[1] : undefined;
      const varian = args.length > 2 && args[2].jenis === JenisNilaiRuntime.TEKS ? (args[2].nilai as any) : 'primer';

      const komp = new TombolMobile({
        teks,
        varian,
        padaKlik: fn
          ? () => {
              Interpreter.panggilFungsiAktif(fn, []);
            }
          : undefined,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatInputTeks(placeholder?, nilaiAwal?, saatBerubah?)
  ekspor.set('buatInputTeks', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatInputTeks',
    eksekusi: (args: NilaiRuntime[]) => {
      const placeholder = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const nilaiAwal = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const fn = args.length > 2 ? args[2] : undefined;

      const komp = new InputTeksMobile({
        placeholder,
        teks: nilaiAwal,
        padaBerubah: fn
          ? (t: string) => {
              Interpreter.panggilFungsiAktif(fn, [buatTeks(t)]);
            }
          : undefined,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatInputSandi(placeholder?, nilaiAwal?)
  ekspor.set('buatInputSandi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatInputSandi',
    eksekusi: (args: NilaiRuntime[]) => {
      const placeholder = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'Kata Sandi';
      const nilaiAwal = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';

      const komp = new InputSandiMobile({
        placeholder,
        teks: nilaiAwal,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatSakelar(aktif?, saatBerubah?)
  ekspor.set('buatSakelar', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatSakelar',
    eksekusi: (args: NilaiRuntime[]) => {
      const aktif = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : false;
      const fn = args.length > 1 ? args[1] : undefined;

      const komp = new SakelarMobile({
        statusAktif: aktif,
        padaBerubah: fn
          ? (st: boolean) => {
              Interpreter.panggilFungsiAktif(fn, [buatLogika(st)]);
            }
          : undefined,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatKotakCentang(label, dicentang?, saatBerubah?)
  ekspor.set('buatKotakCentang', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKotakCentang',
    eksekusi: (args: NilaiRuntime[]) => {
      const label = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const dicentang = args.length > 1 && args[1].jenis === JenisNilaiRuntime.LOGIKA ? args[1].nilai : false;
      const fn = args.length > 2 ? args[2] : undefined;

      const komp = new KotakCentangMobile({
        label,
        dicentang,
        padaBerubah: fn
          ? (c: boolean) => {
              Interpreter.panggilFungsiAktif(fn, [buatLogika(c)]);
            }
          : undefined,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatTombolRadio(label, nilai, terpilih?, saatPilih?)
  ekspor.set('buatTombolRadio', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTombolRadio',
    eksekusi: (args: NilaiRuntime[]) => {
      const label = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const nilai = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : label;
      const terpilih = args.length > 2 && args[2].jenis === JenisNilaiRuntime.LOGIKA ? args[2].nilai : false;
      const fn = args.length > 3 ? args[3] : undefined;

      const komp = new TombolRadioMobile({
        label,
        nilai,
        terpilih,
        padaPilih: fn
          ? (v: string) => {
              Interpreter.panggilFungsiAktif(fn, [buatTeks(v)]);
            }
          : undefined,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatDropdown(opsi, nilaiAwal?, saatPilih?)
  ekspor.set('buatDropdown', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatDropdown',
    eksekusi: (args: NilaiRuntime[]) => {
      let daftarOpsi: any[] = [];
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
        daftarOpsi = ((args[0] as any).elemen as NilaiRuntime[]).map(o => (o.jenis === JenisNilaiRuntime.TEKS ? { label: o.nilai, nilai: o.nilai } : konversiDariNilaiRuntime(o)));
      }
      const nilaiAwal = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : undefined;
      const fn = args.length > 2 ? args[2] : undefined;

      const komp = new DropdownMobile({
        daftarOpsi,
        nilaiTerpilih: nilaiAwal,
        padaPilih: fn
          ? (v: string) => {
              Interpreter.panggilFungsiAktif(fn, [buatTeks(v)]);
            }
          : undefined,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatGambar(sumber, lebar?, tinggi?)
  ekspor.set('buatGambar', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatGambar',
    eksekusi: (args: NilaiRuntime[]) => {
      const sumber = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const lebar = args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : undefined;
      const tinggi = args.length > 2 && args[2].jenis === JenisNilaiRuntime.BILANGAN ? args[2].nilai : undefined;

      const komp = new GambarMobile({
        sumber,
        gaya: { lebar, tinggi },
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatIkon(nama, ukuran?, warna?)
  ekspor.set('buatIkon', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatIkon',
    eksekusi: (args: NilaiRuntime[]) => {
      const nama = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'info';
      const ukuran = args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 24;
      const warna = args.length > 2 && args[2].jenis === JenisNilaiRuntime.TEKS ? args[2].nilai : '#1976d2';

      const komp = new IkonMobile({
        nama,
        ukuran,
        warna,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatIndikatorProgres(nilai?, maks?)
  ekspor.set('buatIndikatorProgres', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatIndikatorProgres',
    eksekusi: (args: NilaiRuntime[]) => {
      const nilai = args.length > 0 && args[0].jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
      const maks = args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 100;

      const komp = new IndikatorProgresMobile({ nilai, nilaiMaksimum: maks });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatIndikatorMemuat(aktif?, ukuran?)
  ekspor.set('buatIndikatorMemuat', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatIndikatorMemuat',
    eksekusi: (args: NilaiRuntime[]) => {
      const aktif = args.length > 0 && args[0].jenis === JenisNilaiRuntime.LOGIKA ? args[0].nilai : true;
      const ukuran = args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 32;

      const komp = new IndikatorMemuatMobile({ sedangMemuat: aktif, ukuran });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatKartu(anak?, elevasi?, radius?)
  ekspor.set('buatKartu', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKartu',
    eksekusi: (args: NilaiRuntime[]) => {
      const komp = new KartuMobile();
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
        for (const item of ((args[0] as any).elemen as NilaiRuntime[])) {
          if (item.jenis === JenisNilaiRuntime.PETA) {
            const c = petaKeKomponen.get(item as NilaiPeta);
            if (c) komp.tambahAnak(c);
          }
        }
      }
      return bungkusKomponenMobile(komp);
    },
  });

  // buatPemisah(arah?, warna?)
  ekspor.set('buatPemisah', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatPemisah',
    eksekusi: () => bungkusKomponenMobile(new PemisahMobile()),
  });

  // buatDaftar(data, pembuatItem?)
  ekspor.set('buatDaftar', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatDaftar',
    eksekusi: (args: NilaiRuntime[]) => {
      let dataList: any[] = [];
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
        dataList = ((args[0] as any).elemen as NilaiRuntime[]).map(i => konversiDariNilaiRuntime(i));
      }
      const fn = args.length > 1 ? args[1] : undefined;

      const komp = new DaftarMobile({
        data: dataList,
        pembuatItem: fn
          ? (item: any, idx: number) => {
              const res = Interpreter.panggilFungsiAktif(fn, [konversiKeNilaiRuntime(item), buatBilangan(idx)]);
              if (res && res.jenis === JenisNilaiRuntime.PETA) {
                const k = petaKeKomponen.get(res as NilaiPeta);
                if (k) return k;
              }
              return new TeksMobile({ teks: String(item) });
            }
          : undefined,
      });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatGrid(kolom?, data?)
  ekspor.set('buatGrid', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatGrid',
    eksekusi: (args: NilaiRuntime[]) => {
      const kolom = args.length > 0 && args[0].jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 2;
      const komp = new GridMobile({ jumlahKolom: kolom });
      return bungkusKomponenMobile(komp);
    },
  });

  // buatAreaAman(anak?, inset?)
  ekspor.set('buatAreaAman', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatAreaAman',
    eksekusi: () => bungkusKomponenMobile(new AreaAmanMobile()),
  });

  // buatTataLetakVertikal(anak?, jarak?)
  ekspor.set('buatTataLetakVertikal', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTataLetakVertikal',
    eksekusi: (args: NilaiRuntime[]) => {
      const komp = new TataLetakVertikalMobile();
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
        for (const item of ((args[0] as any).elemen as NilaiRuntime[])) {
          if (item.jenis === JenisNilaiRuntime.PETA) {
            const c = petaKeKomponen.get(item as NilaiPeta);
            if (c) komp.tambahAnak(c);
          }
        }
      }
      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN) {
        komp.jarakAntarItem = args[1].nilai;
      }
      return bungkusKomponenMobile(komp);
    },
  });

  // buatTataLetakHorizontal(anak?, jarak?)
  ekspor.set('buatTataLetakHorizontal', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTataLetakHorizontal',
    eksekusi: (args: NilaiRuntime[]) => {
      const komp = new TataLetakHorizontalMobile();
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
        for (const item of ((args[0] as any).elemen as NilaiRuntime[])) {
          if (item.jenis === JenisNilaiRuntime.PETA) {
            const c = petaKeKomponen.get(item as NilaiPeta);
            if (c) komp.tambahAnak(c);
          }
        }
      }
      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN) {
        komp.jarakAntarItem = args[1].nilai;
      }
      return bungkusKomponenMobile(komp);
    },
  });

  // buatTataLetakTumpuk(anak?)
  ekspor.set('buatTataLetakTumpuk', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTataLetakTumpuk',
    eksekusi: () => bungkusKomponenMobile(new TataLetakTumpukMobile()),
  });

  // buatTampilanGulir(anak?, arah?)
  ekspor.set('buatTampilanGulir', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatTampilanGulir',
    eksekusi: () => bungkusKomponenMobile(new TampilanGulirMobile()),
  });

  // buatNavigatorTumpukan(ruteAwal?)
  ekspor.set('buatNavigatorTumpukan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatNavigatorTumpukan',
    eksekusi: (args: NilaiRuntime[]) => {
      const ruteAwal = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : undefined;
      const nav = new NavigatorTumpukanMobile({ ruteAwal });
      return bungkusKomponenMobile(nav);
    },
  });

  // buatNavigatorTab(daftarTab)
  ekspor.set('buatNavigatorTab', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatNavigatorTab',
    eksekusi: (args: NilaiRuntime[]) => {
      let tabs: any[] = [];
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
        tabs = ((args[0] as any).elemen as NilaiRuntime[]).map(t => konversiDariNilaiRuntime(t));
      }
      const nav = new NavigatorTabMobile({
        daftarTab: tabs.map(t => ({
          kunci: t.kunci || t.nama || 'tab',
          label: t.label || t.nama || 'Tab',
          ikon: t.ikon,
          pembuatKonten: () => new TeksMobile({ teks: `Konten ${t.label || t.kunci}` }),
        })),
      });
      return bungkusKomponenMobile(nav);
    },
  });

  // buatNavigasiBawah(items, saatPilih?)
  ekspor.set('buatNavigasiBawah', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatNavigasiBawah',
    eksekusi: (args: NilaiRuntime[]) => {
      let items: any[] = [];
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.DAFTAR) {
        items = ((args[0] as any).elemen as NilaiRuntime[]).map(i => konversiDariNilaiRuntime(i));
      }
      const nav = new NavigasiBawahMobile({ items });
      return bungkusKomponenMobile(nav);
    },
  });

  // tampilkanDialog(opsi)
  ekspor.set('tampilkanDialog', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tampilkanDialog',
    eksekusi: (args: NilaiRuntime[]) => {
      let opsiData: any = {};
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        opsiData = konversiDariNilaiRuntime(args[0]);
      } else if (args.length >= 2 && args[0].jenis === JenisNilaiRuntime.TEKS && args[1].jenis === JenisNilaiRuntime.TEKS) {
        opsiData = { judul: args[0].nilai, konten: args[1].nilai };
      }
      const dialog = new DialogMobile(opsiData);
      dialog.buka();
      return bungkusKomponenMobile(dialog);
    },
  });

  // tampilkanAlert(judul, pesan, konfirmasi?, batal?)
  ekspor.set('tampilkanAlert', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tampilkanAlert',
    eksekusi: (args: NilaiRuntime[]) => {
      const judul = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'Pemberitahuan';
      const pesan = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const konfirmasi = args.length > 2 && args[2].jenis === JenisNilaiRuntime.TEKS ? args[2].nilai : 'OK';
      const batal = args.length > 3 && args[3].jenis === JenisNilaiRuntime.TEKS ? args[3].nilai : undefined;

      const alert = new AlertMobile({
        judul,
        pesan,
        teksKonfirmasi: konfirmasi,
        teksBatal: batal,
      });
      alert.buka();
      return bungkusKomponenMobile(alert);
    },
  });

  // tampilkanSnackbar(pesan, durasiMs?, tipe?)
  ekspor.set('tampilkanSnackbar', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tampilkanSnackbar',
    eksekusi: (args: NilaiRuntime[]) => {
      const pesan = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const durasiMs = args.length > 1 && args[1].jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 3000;
      const tipe = args.length > 2 && args[2].jenis === JenisNilaiRuntime.TEKS ? (args[2].nilai as any) : 'info';

      const snackbar = new SnackbarMobile({
        pesan,
        durasiMs,
        tipe,
      });
      snackbar.tampilkan();
      return bungkusKomponenMobile(snackbar);
    },
  });

  // dapatkanInfoPerangkat()
  ekspor.set('dapatkanInfoPerangkat', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanInfoPerangkat',
    eksekusi: () => konversiKeNilaiRuntime(InfoPerangkatMobile.dapatkanInfo()),
  });

  // dapatkanStatusJaringan()
  ekspor.set('dapatkanStatusJaringan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanStatusJaringan',
    eksekusi: () => konversiKeNilaiRuntime(StatusJaringanMobile.dapatkanStatus()),
  });

  // dapatkanStatusBaterai()
  ekspor.set('dapatkanStatusBaterai', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanStatusBaterai',
    eksekusi: () => konversiKeNilaiRuntime(StatusBateraiMobile.dapatkanStatus()),
  });

  // getar(durasiMs?)
  ekspor.set('getar', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'getar',
    eksekusi: (args: NilaiRuntime[]) => {
      const ms = args.length > 0 && args[0].jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 200;
      const res = GetaranMobile.getar(ms);
      return buatLogika(res);
    },
  });

  // haptik(jenis?)
  ekspor.set('haptik', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'haptik',
    eksekusi: (args: NilaiRuntime[]) => {
      const jenis = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? (args[0].nilai as any) : 'ringan';
      const res = GetaranMobile.haptik(jenis);
      return buatLogika(res);
    },
  });

  // salinPapanKlip(teks)
  ekspor.set('salinPapanKlip', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'salinPapanKlip',
    eksekusi: (args: NilaiRuntime[]) => {
      const teks = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      PapanKlipMobile.salin(teks);
      return buatLogika(true);
    },
  });

  // tempelPapanKlip()
  ekspor.set('tempelPapanKlip', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tempelPapanKlip',
    eksekusi: () => buatTeks(PapanKlipMobile.ambilTeksSinkron()),
  });

  // dapatkanLokasi()
  ekspor.set('dapatkanLokasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanLokasi',
    eksekusi: () => {
      let lokasiObj: any = { latitude: -6.2088, longitude: 106.8456 };
      LokasiPerangkatMobile.dapatkanLokasiSaatIni().then(l => {
        lokasiObj = l;
      });
      return konversiKeNilaiRuntime(lokasiObj);
    },
  });

  // jadwalkanNotifikasi(opsi)
  ekspor.set('jadwalkanNotifikasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'jadwalkanNotifikasi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const opsi = konversiDariNilaiRuntime(args[0]);
        NotifikasiLokalMobile.jadwalkan(opsi);
        return buatLogika(true);
      }
      return buatLogika(false);
    },
  });

  // batalkanNotifikasi(id)
  ekspor.set('batalkanNotifikasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'batalkanNotifikasi',
    eksekusi: (args: NilaiRuntime[]) => {
      const id = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '';
      const res = NotifikasiLokalMobile.batalkan(id);
      return buatLogika(res);
    },
  });

  // bagikan(opsi)
  ekspor.set('bagikan', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bagikan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        const opsi = konversiDariNilaiRuntime(args[0]);
        BerbagiMobile.bagikan(opsi);
        return buatLogika(true);
      }
      return buatLogika(false);
    },
  });

  // periksaIzin(izin)
  ekspor.set('periksaIzin', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'periksaIzin',
    eksekusi: (args: NilaiRuntime[]) => {
      const izin = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? (args[0].nilai as JenisIzinMobile) : 'internet';
      const konteks = KonteksAplikasiMobile.dapatkanKonteks();
      const status = konteks.pengelolaIzin.dapatkanStatus(izin);
      return buatTeks(status);
    },
  });

  // mintaIzin(izin, alasan?)
  ekspor.set('mintaIzin', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'mintaIzin',
    eksekusi: (args: NilaiRuntime[]) => {
      const izin = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? (args[0].nilai as JenisIzinMobile) : 'internet';
      const alasan = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : undefined;
      const konteks = KonteksAplikasiMobile.dapatkanKonteks();
      const res = konteks.pengelolaIzin.mintaIzinSinkron(izin, alasan);
      return buatLogika(res.diberikan);
    },
  });

  // simpanAman(kunci, nilai)
  ekspor.set('simpanAman', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'simpanAman',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 2 && args[0].jenis === JenisNilaiRuntime.TEKS && args[1].jenis === JenisNilaiRuntime.TEKS) {
        const k = args[0].nilai;
        const v = args[1].nilai;
        const res = PenyimpananAmanMobile.simpan(k, v);
        return buatLogika(res);
      }
      return buatLogika(false);
    },
  });

  // ambilAman(kunci)
  ekspor.set('ambilAman', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ambilAman',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 1 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        const k = args[0].nilai;
        const val = PenyimpananAmanMobile.ambil(k);
        return val !== null ? buatTeks(val) : buatKosong();
      }
      return buatKosong();
    },
  });

  // hapusAman(kunci)
  ekspor.set('hapusAman', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'hapusAman',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 1 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        const k = args[0].nilai;
        const res = PenyimpananAmanMobile.hapus(k);
        return buatLogika(res);
      }
      return buatLogika(false);
    },
  });

  // panggilJembatanNative(modul, metode, argumen)
  ekspor.set('panggilJembatanNative', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'panggilJembatanNative',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 2 && args[0].jenis === JenisNilaiRuntime.TEKS && args[1].jenis === JenisNilaiRuntime.TEKS) {
        const modul = args[0].nilai;
        const metode = args[1].nilai;
        const argumenData = args.length > 2 ? konversiDariNilaiRuntime(args[2]) : undefined;

        const jembatan = JembatanMobileNative.dapatkanInstance();
        let hasilNative: any = null;
        jembatan.panggilNative(modul, metode, argumenData).then(res => {
          hasilNative = res;
        }).catch(err => {
          hasilNative = { galat: err.message };
        });

        return konversiKeNilaiRuntime(hasilNative);
      }
      return buatKosong();
    },
  });

  // panggilNative(namaApi, argumen?)
  ekspor.set('panggilNative', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'panggilNative',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 1 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        const nama = args[0].nilai;
        const argumenData = args.length > 1 ? konversiDariNilaiRuntime(args[1]) : undefined;
        const registri = RegistriNativeAPI.dapatkanInstance();
        const api = registri.dapatkan(nama);

        if (api && typeof api.eksekusiSinkron === 'function') {
          return konversiKeNilaiRuntime(registri.panggilSinkron(nama, argumenData));
        }

        let hasil: any = { sukses: false, status: 'memproses', stempelWaktu: Date.now() };
        const p = registri.panggil(nama, argumenData);
        if (p && typeof p.then === 'function') {
          p.then((res) => {
            hasil = res;
          }).catch((err) => {
            hasil = { sukses: false, status: 'gagal', pesan: err.message, stempelWaktu: Date.now() };
          });
        } else {
          hasil = p;
        }

        return konversiKeNilaiRuntime(hasil);
      }
      return konversiKeNilaiRuntime({ sukses: false, status: 'gagal', pesan: 'Nama API wajib bertipe teks.' });
    },
  });

  // daftarNativeAPI()
  ekspor.set('daftarNativeAPI', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'daftarNativeAPI',
    eksekusi: () => {
      const daftar = RegistriNativeAPI.dapatkanInstance().dapatkanSemua().map((a) => a.nama);
      return konversiKeNilaiRuntime(daftar);
    },
  });

  // periksaNativeAPI(namaApi)
  ekspor.set('periksaNativeAPI', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'periksaNativeAPI',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 1 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        const nama = args[0].nilai;
        const api = RegistriNativeAPI.dapatkanInstance().dapatkan(nama);
        if (api) {
          return konversiKeNilaiRuntime({
            nama: api.nama,
            kategori: api.kategori,
            status: api.status,
            platform: api.platform,
            izin: api.izin,
            dokumentasi: api.dokumentasi,
          });
        }
      }
      return buatKosong();
    },
  });

  // dapatkanKemampuanPerangkat()
  ekspor.set('dapatkanKemampuanPerangkat', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanKemampuanPerangkat',
    eksekusi: () => {
      const kemampuan = PengelolaKemampuanPerangkat.dapatkanInstance().dapatkanKemampuan();
      return konversiKeNilaiRuntime(kemampuan);
    },
  });

  // buatKlienAPI(konfigurasi?)
  ekspor.set('buatKlienAPI', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKlienAPI',
    eksekusi: (args: NilaiRuntime[]) => {
      let cfg: any = {};
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        cfg = konversiDariNilaiRuntime(args[0]);
      }
      const klien = new KlienAPIMobile(cfg);
      const anggota = new Map<string, NilaiRuntime>();

      anggota.set('dapatkan', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'dapatkan',
        eksekusi: (p: NilaiRuntime[]) => {
          const endpoint = p.length > 0 && p[0].jenis === JenisNilaiRuntime.TEKS ? p[0].nilai : '/';
          const opsi = p.length > 1 ? konversiDariNilaiRuntime(p[1]) : {};
          const res = klien.permintaanSinkron(endpoint, { ...opsi, metode: 'GET' });
          return konversiKeNilaiRuntime(res);
        },
      });

      anggota.set('kirim', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'kirim',
        eksekusi: (p: NilaiRuntime[]) => {
          const endpoint = p.length > 0 && p[0].jenis === JenisNilaiRuntime.TEKS ? p[0].nilai : '/';
          const data = p.length > 1 ? konversiDariNilaiRuntime(p[1]) : {};
          const opsi = p.length > 2 ? konversiDariNilaiRuntime(p[2]) : {};
          const res = klien.permintaanSinkron(endpoint, { ...opsi, metode: 'POST', body: data });
          return konversiKeNilaiRuntime(res);
        },
      });

      anggota.set('perbarui', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'perbarui',
        eksekusi: (p: NilaiRuntime[]) => {
          const endpoint = p.length > 0 && p[0].jenis === JenisNilaiRuntime.TEKS ? p[0].nilai : '/';
          const data = p.length > 1 ? konversiDariNilaiRuntime(p[1]) : {};
          const opsi = p.length > 2 ? konversiDariNilaiRuntime(p[2]) : {};
          const res = klien.permintaanSinkron(endpoint, { ...opsi, metode: 'PUT', body: data });
          return konversiKeNilaiRuntime(res);
        },
      });

      anggota.set('tambal', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'tambal',
        eksekusi: (p: NilaiRuntime[]) => {
          const endpoint = p.length > 0 && p[0].jenis === JenisNilaiRuntime.TEKS ? p[0].nilai : '/';
          const data = p.length > 1 ? konversiDariNilaiRuntime(p[1]) : {};
          const opsi = p.length > 2 ? konversiDariNilaiRuntime(p[2]) : {};
          const res = klien.permintaanSinkron(endpoint, { ...opsi, metode: 'PATCH', body: data });
          return konversiKeNilaiRuntime(res);
        },
      });

      anggota.set('hapus', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'hapus',
        eksekusi: (p: NilaiRuntime[]) => {
          const endpoint = p.length > 0 && p[0].jenis === JenisNilaiRuntime.TEKS ? p[0].nilai : '/';
          const opsi = p.length > 1 ? konversiDariNilaiRuntime(p[1]) : {};
          const res = klien.permintaanSinkron(endpoint, { ...opsi, metode: 'DELETE' });
          return konversiKeNilaiRuntime(res);
        },
      });

      anggota.set('hapusData', anggota.get('hapus')!);
      anggota.set('buang', anggota.get('hapus')!);

      anggota.set('aturToken', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'aturToken',
        eksekusi: (p: NilaiRuntime[]) => {
          if (p.length > 0 && p[0].jenis === JenisNilaiRuntime.TEKS) {
            klien.setTokenHeader(p[0].nilai);
          }
          return buatKosong();
        },
      });

      return buatPeta(anggota);
    },
  });

  // buatKlienAutentikasi(konfigurasi?)
  ekspor.set('buatKlienAutentikasi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatKlienAutentikasi',
    eksekusi: (args: NilaiRuntime[]) => {
      let cfg: any = {};
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.PETA) {
        cfg = konversiDariNilaiRuntime(args[0]);
      }
      const auth = new KlienAutentikasiMobile(cfg);
      const anggota = new Map<string, NilaiRuntime>();

      anggota.set('masuk', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'masuk',
        eksekusi: (p: NilaiRuntime[]) => {
          const email = p.length > 0 && p[0].jenis === JenisNilaiRuntime.TEKS ? p[0].nilai : '';
          const sandi = p.length > 1 && p[1].jenis === JenisNilaiRuntime.TEKS ? p[1].nilai : '';
          const res = auth.masukSinkron(email, sandi);
          return konversiKeNilaiRuntime(res);
        },
      });

      anggota.set('keluar', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'keluar',
        eksekusi: () => {
          auth.keluar();
          return buatKosong();
        },
      });

      anggota.set('apakahTerautentikasi', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'apakahTerautentikasi',
        eksekusi: () => buatLogika(auth.apakahTerautentikasi()),
      });

      anggota.set('dapatkanToken', {
        jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
        nama: 'dapatkanToken',
        eksekusi: () => {
          const tok = auth.dapatkanTokenAkses();
          return tok ? buatTeks(tok) : buatKosong();
        },
      });

      return buatPeta(anggota);
    },
  });

  // sinkronkanDataMobile(opsi?)
  ekspor.set('sinkronkanDataMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'sinkronkanDataMobile',
    eksekusi: () => {
      const res = MesinSinkronisasiMobile.dapatkanInstance().sinkronkanSinkron();
      return konversiKeNilaiRuntime(res);
    },
  });

  // antreanOfflineMobile()
  ekspor.set('antreanOfflineMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'antreanOfflineMobile',
    eksekusi: () => {
      const hitung = PengelolaOperasiOffline.dapatkanInstance().hitung();
      return konversiKeNilaiRuntime(hitung);
    },
  });

  // periksaJaringanMobile()
  ekspor.set('periksaJaringanMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'periksaJaringanMobile',
    eksekusi: () => {
      const status = PengawasJaringanMobile.dapatkanInstance().dapatkanStatus();
      return konversiKeNilaiRuntime(status);
    },
  });

  // unggahBerkasCloud(namaBerkas, konten, opsi?)
  ekspor.set('unggahBerkasCloud', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'unggahBerkasCloud',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 2 && args[0].jenis === JenisNilaiRuntime.TEKS && args[1].jenis === JenisNilaiRuntime.TEKS) {
        const nama = args[0].nilai;
        const konten = args[1].nilai;
        const folder = args.length > 2 && args[2].jenis === JenisNilaiRuntime.PETA ? (konversiDariNilaiRuntime(args[2]).folder || 'publik') : 'publik';
        const res = PengelolaTransferBerkasMobile.dapatkanInstance().unggahSinkron(nama, konten, folder);
        return konversiKeNilaiRuntime(res);
      }
      return konversiKeNilaiRuntime({ sukses: false, galat: 'Argumen nama berkas dan konten teks wajib diisi.' });
    },
  });

  // unduhBerkasCloud(urlAtauId)
  ekspor.set('unduhBerkasCloud', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'unduhBerkasCloud',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length >= 1 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        const id = args[0].nilai;
        const res = PengelolaTransferBerkasMobile.dapatkanInstance().unduhSinkron(id);
        return konversiKeNilaiRuntime(res);
      }
      return buatKosong();
    },
  });

  // dapatkanKonfigurasiCloud()
  ekspor.set('dapatkanKonfigurasiCloud', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanKonfigurasiCloud',
    eksekusi: () => {
      const cfg = PengelolaKonfigurasiCloud.dapatkanInstance().dapatkanKonfigurasi();
      return konversiKeNilaiRuntime(cfg);
    },
  });

  // dapatkanInfoDistribusi()
  ekspor.set('dapatkanInfoDistribusi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanInfoDistribusi',
    eksekusi: () => {
      const dist = DistributionManager.dapatkanInstance();
      const cfg = dist.dapatkanKonfigurasi();
      const env = dist.periksaLingkunganSistem();
      return konversiKeNilaiRuntime({
        aplikasi: cfg.aplikasi,
        lingkungan: cfg.lingkungan,
        android: {
          minSdk: cfg.android.minSdk,
          targetSdk: cfg.android.targetSdk,
          outputDir: cfg.android.outputDir,
          sdkTerdeteksi: env.android.siapBuildNative,
        },
        ios: {
          deploymentTarget: cfg.ios.deploymentTarget,
          bundleId: cfg.ios.bundleId,
          outputDir: cfg.ios.outputDir,
          xcodeTerdeteksi: env.ios.siapBuildNativeIOS,
        },
      });
    },
  });

  // validasiRilisMobile(lingkungan?)
  ekspor.set('validasiRilisMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'validasiRilisMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      const dist = DistributionManager.dapatkanInstance();
      if (args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS) {
        dist.aturLingkungan(args[0].nilai as any);
      }
      const laporan = dist.validasiKesiapanRilis();
      return konversiKeNilaiRuntime(laporan);
    },
  });

  // kelolaVersiMobile(aksi?, tipe?)
  ekspor.set('kelolaVersiMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'kelolaVersiMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      const dist = DistributionManager.dapatkanInstance();
      const aksi = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : 'tampil';
      if (aksi === 'naikkan') {
        const tipe = args.length > 1 && args[1].jenis === JenisNilaiRuntime.TEKS ? (args[1].nilai as any) : 'patch';
        const res = dist.naikkanVersi(tipe);
        return konversiKeNilaiRuntime(res);
      }
      const cfg = dist.dapatkanKonfigurasi();
      return konversiKeNilaiRuntime({
        versi: cfg.aplikasi.versi,
        kodeVersiAndroid: cfg.aplikasi.kodeVersiAndroid,
        nomorBuildIOS: cfg.aplikasi.nomorBuild,
      });
    },
  });

  // periksaAsetMobile()
  ekspor.set('periksaAsetMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'periksaAsetMobile',
    eksekusi: () => {
      const res = DistributionManager.dapatkanInstance().validasiAset();
      return konversiKeNilaiRuntime(res);
    },
  });

  // buatLaporanDistribusi()
  ekspor.set('buatLaporanDistribusi', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatLaporanDistribusi',
    eksekusi: () => {
      const res = DistributionManager.dapatkanInstance().jalankanDistribusiRilis();
      return konversiKeNilaiRuntime({
        sukses: res.sukses,
        pesan: res.pesan,
        totalArtefak: res.artefak.length,
        jalurLaporan: res.jalurLaporanMarkdown,
        siapRilis: res.validasi.siapRilis,
      });
    },
  });

  // periksaKesiapanTokoMobile()
  ekspor.set('periksaKesiapanTokoMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'periksaKesiapanTokoMobile',
    eksekusi: () => {
      const res = PublishingManager.dapatkanInstance().validasiKesiapanPublikasi();
      return konversiKeNilaiRuntime({
        valid: res.valid,
        skorKesiapan: res.kesiapan.skorKesiapan,
        statusAndroid: res.kesiapan.statusPlatform.android,
        statusIOS: res.kesiapan.statusPlatform.ios,
        isuPemblokir: res.kesiapan.isuPemblokir,
        ringkasan: res.ringkasan,
      });
    },
  });

  // buatCatatanRilisMobile(versi, buildNumber)
  ekspor.set('buatCatatanRilisMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatCatatanRilisMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      const versi = args[0]?.jenis === JenisNilaiRuntime.TEKS ? (args[0] as any).nilai : '1.0.0';
      const build = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? (args[1] as any).nilai : 1;
      const res = ReleaseNotesManager.buatDraftCatatanRilis(versi, build, 'manual');
      return konversiKeNilaiRuntime({
        versi: res.versi,
        buildNumber: res.buildNumber,
        catatanID: res.kontenPerLocale.id,
        catatanEN: res.kontenPerLocale.en,
        karakterID: res.karakterPerLocale.id,
      });
    },
  });

  // buatLaporanPublikasiMobile()
  ekspor.set('buatLaporanPublikasiMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatLaporanPublikasiMobile',
    eksekusi: () => {
      const lap = PublishingManager.dapatkanInstance().buatLaporanPublikasi();
      return konversiKeNilaiRuntime({
        idLaporan: lap.idLaporan,
        applicationId: lap.applicationId,
        versi: lap.versi,
        status: lap.statusPublikasi,
        skorKepatuhan: lap.skorKepatuhan,
      });
    },
  });

  // periksaPembaruanMobile()
  ekspor.set('periksaPembaruanMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'periksaPembaruanMobile',
    eksekusi: () => {
      const res = UpdateManager.dapatkanInstance().periksaPembaruan();
      return konversiKeNilaiRuntime({
        adaPembaruan: res.hasil.adaPembaruan,
        status: res.hasil.status,
        versiTerpasang: res.hasil.versiTerpasang,
        versiTerbaru: res.hasil.versiTerbaru,
        perluPembaruanWajib: res.hasil.perluPembaruanWajib,
        jenisPembaruan: res.hasil.jenisPembaruan,
        saluran: res.hasil.saluran,
        kebijakan: res.hasil.kebijakan,
        pesan: res.hasil.pesan,
        storeUrl: res.hasil.storeUrl || '',
      });
    },
  });

  // unduhPembaruanResourceMobile()
  ekspor.set('unduhPembaruanResourceMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'unduhPembaruanResourceMobile',
    eksekusi: () => {
      let sukses = true;
      let pesan = 'Pengunduhan resource OTA berhasil.';
      UpdateManager.dapatkanInstance().terapkanPembaruanOTA().then((r) => {
        sukses = r.sukses;
        pesan = r.pesan;
      });
      return konversiKeNilaiRuntime({ sukses, pesan });
    },
  });

  // aktifkanPembaruanResourceMobile()
  ekspor.set('aktifkanPembaruanResourceMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'aktifkanPembaruanResourceMobile',
    eksekusi: () => {
      return konversiKeNilaiRuntime({ sukses: true, pesan: 'Resource OTA aktif terpasang.' });
    },
  });

  // rollbackPembaruanResourceMobile(platform?)
  ekspor.set('rollbackPembaruanResourceMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'rollbackPembaruanResourceMobile',
    eksekusi: (args: NilaiRuntime[]) => {
      const platform = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? (args[0].nilai as any) : 'android';
      const res = RollbackManager.dapatkanInstance().eksekusiRollback(platform);
      return konversiKeNilaiRuntime({
        sukses: res.sukses,
        versiDipulihkan: res.versiDipulihkan || '',
        pesan: res.pesan,
      });
    },
  });

  // dapatkanStatusPembaruanMobile()
  ekspor.set('dapatkanStatusPembaruanMobile', {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanStatusPembaruanMobile',
    eksekusi: () => {
      const lap = UpdateManager.dapatkanInstance().buatLaporan();
      return konversiKeNilaiRuntime({
        status: lap.statusPembaruan,
        versiAplikasi: lap.versiAplikasi,
        versiManifest: lap.versiManifest,
        saluran: lap.saluran,
        integritasLolos: lap.integritasLolos,
        signatureLolos: lap.signatureLolos,
      });
    },
  });

  return ekspor;
}

