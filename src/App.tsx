/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  Terminal,
  Copy,
  Check,
  GitBranch,
  Layers,
  BookOpen,
  Cpu,
  ShieldCheck,
  Code2,
  AlertTriangle,
  Network,
  Play,
  CheckCircle2,
  Calculator,
  Repeat,
  Split,
  Workflow,
  Boxes,
  Package,
  Library,
  Bug,
  AlertOctagon,
  Sparkles,
  Search,
  Wrench,
  Compass,
} from 'lucide-react';
import {
  BERKAS_REPOSITORI,
  DAFTAR_PRESEDENSI_OPERATOR,
  DAFTAR_GLOSARIUM,
  DAFTAR_FASE_ROADMAP,
  DAFTAR_TIPE_MATRIKS_PHASE9,
  BerkasRepo
} from './data/berkasRepositori';
import { Lexer } from './lexer/lexer';
import { JenisToken } from './lexer/jenisToken';
import { Parser } from './parser/parser';
import { ASTPrinter } from './parser/astPrinter';
import { Interpreter } from './interpreter/interpreter';
import { PenulisOutputBuffer } from './interpreter/outputWriter';
import { PemeriksaTipe } from './tipe/pemeriksaTipe';
import { PembacaBerkasMemori, ResolverModul, PemuatModul } from './modul';
import { PengelolaPaket, NusantaraCLI, LocalRegistry } from './paket';
import { KATALOG_MODUL_STANDAR, dapatkanDaftarNamaModulStandar } from './stdlib';
import {
  MesinDiagnostik,
  mesinDiagnostikDefault,
  KodeGalat,
  METADATA_KODE_GALAT,
  KategoriDiagnostik,
  Diagnostik,
  formatDiagnostikKeJSON,
} from './diagnostik';
import {
  formatKode,
  formatAman,
  PemeriksaProyek,
  LinterNUSANTARA,
} from './toolchain';
import {
  ServerBahasaNUSANTARA,
  ManajerDokumen,
  LayananDiagnostik,
  LayananKompleksi,
  LayananHover,
  LayananDefinisi,
  LayananSimbol,
  DiagnostikLSP,
  ItemKompleksiLSP,
  HoverLSP,
  LokasiLSP,
  PosisiLSP,
  SimbolDokumenLSP,
} from './language-server';

export default function App() {
  const [activeTab, setActiveTab] = useState<'lsp' | 'toolchain' | 'diagnostik' | 'stdlib' | 'paket' | 'struktur-data' | 'fungsi' | 'perulangan' | 'percabangan' | 'operator' | 'tipe' | 'ast' | 'token' | 'panduan' | 'berkas' | 'roadmap' | 'git'>('lsp');
  const [selectedFile, setSelectedFile] = useState<BerkasRepo>(BERKAS_REPOSITORI[0]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [playgroundCode, setPlaygroundCode] = useState<string>(
    `program DemonstrasiStrukturData

mulai
    // 1. Koleksi Daftar (List berindeks 0)
    angka : daftar = [10, 20, 30, 40]
    tampilkan("Daftar angka:", angka)
    tampilkan("Elemen angka[0]:", angka[0])
    tampilkan("Elemen angka[3]:", angka[3])
    tampilkan("Panjang daftar:", panjang(angka))

    // Mutasi elemen daftar
    angka[1] = 99
    tampilkan("Setelah mutasi angka[1] = 99:", angka)

    // 2. Koleksi Peta (Map Asosiatif Kunci-Nilai)
    siswa : peta = {"nama": "Ayu", "umur": 20, "jurusan": "Informatika"}
    tampilkan("\nPeta siswa:", siswa)
    tampilkan("Nama siswa:", siswa["nama"])
    tampilkan("Umur siswa:", siswa["umur"])

    // Pembaruan dan penambahan entri peta
    siswa["umur"] = 21
    siswa["kota"] = "Bandung"
    tampilkan("Setelah diperbarui:", siswa)
    tampilkan("Jumlah entri peta:", panjang(siswa))

    // 3. Koleksi Bersarang (Matriks 2D)
    matriks : daftar = [[1, 2], [3, 4]]
    tampilkan("\nElemen matriks[1][0]:", matriks[1][0])

    // 4. Kesetaraan Struktur Data (Deep Equality)
    daftarA : daftar = [1, 2, 3]
    daftarB : daftar = [1, 2, 3]
    tampilkan("Apakah daftarA == daftarB?", daftarA == daftarB)
selesai`
  );
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('Semua');

  // Virtual in-memory filesystem untuk Package Manager & Module Playground
  const virtualFS = useMemo(() => {
    const fs = new PembacaBerkasMemori();
    fs.tulisBerkas(
      '/proyek/nusantara.toml',
      `[nusantara]\nnama = "aplikasi_contoh"\nversi = "1.0.0"\ndeskripsi = "Proyek percontohan ekosistem package manager NUSANTARA"\nlisensi = "Apache-2.0"\npenulis = "Tim Nusantara"\n\n[dependensi]\nmatematika = "^1.2.0"\ngeometri = "0.5.0"\n`
    );
    fs.tulisBerkas(
      '/katalog/matematika/nusantara.toml',
      `[nusantara]\nnama = "matematika"\nversi = "1.2.3"\ndeskripsi = "Pustaka fungsi matematika dasar dan aljabar"\nlisensi = "MIT"\n\n[dependensi]\n`
    );
    fs.tulisBerkas(
      '/katalog/matematika/src/matematika.nusantara',
      `modul matematika\n\nekspor fungsi tambah(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a + b\nselesai\n\nekspor fungsi kali(a: bilangan, b: bilangan): bilangan\nmulai\n    kembalikan a * b\nselesai\n\nekspor fungsi kuadrat(n: bilangan): bilangan\nmulai\n    kembalikan n * n\nselesai\n`
    );
    fs.tulisBerkas(
      '/katalog/geometri/nusantara.toml',
      `[nusantara]\nnama = "geometri"\nversi = "0.5.0"\ndeskripsi = "Pustaka geometri bidang datar"\nlisensi = "MIT"\n\n[dependensi]\n`
    );
    fs.tulisBerkas(
      '/katalog/geometri/src/geometri.nusantara',
      `modul geometri\n\nekspor fungsi luasPersegi(sisi: bilangan): bilangan\nmulai\n    kembalikan sisi * sisi\nselesai\n`
    );

    const reg = new LocalRegistry(fs, ['/katalog']);
    const pengelola = new PengelolaPaket({
      pembacaBerkas: fs,
      direktoriProyek: '/proyek',
      registry: reg,
    });
    pengelola.pasang();

    return fs;
  }, []);

  // State Riwayat CLI Nusantara
  const [cliHistory, setCliHistory] = useState<Array<{ cmd: string; out: string[]; success: boolean }>>([
    {
      cmd: 'nusantara info',
      out: [
        'Informasi Paket NUSANTARA:',
        '',
        '  Nama             : aplikasi_contoh',
        '  Versi            : 1.0.0',
        '  Deskripsi        : Proyek percontohan ekosistem package manager NUSANTARA',
        '  Lisensi          : Apache-2.0',
        '  Jml Dependensi   : 2',
        '  Lokasi Proyek    : /proyek',
      ],
      success: true,
    },
    {
      cmd: 'nusantara daftar',
      out: [
        'Dependency proyek:',
        '',
        '  matematika       ^1.2.0     (terpasang: 1.2.3)',
        '  geometri         0.5.0      (terpasang: 0.5.0)',
      ],
      success: true,
    },
  ]);
  const [cliInput, setCliInput] = useState<string>('');

  const handleRunCli = (commandString: string) => {
    const bersih = commandString.trim();
    if (!bersih) return;

    const parts = bersih.split(/\s+/);
    const args = parts[0]?.toLowerCase() === 'nusantara' ? parts.slice(1) : parts;

    const outLines: string[] = [];
    const errLines: string[] = [];

    const reg = new LocalRegistry(virtualFS, ['/katalog']);
    const pengelola = new PengelolaPaket({
      pembacaBerkas: virtualFS,
      direktoriProyek: '/proyek',
      registry: reg,
    });

    const cli = new NusantaraCLI({
      pengelola,
      penulisLog: m => outLines.push(m),
      penulisGalat: m => errLines.push(m),
    });

    const kode = cli.jalankan(args);
    const combined = errLines.length > 0 ? errLines : outLines;

    setCliHistory(prev => [
      ...prev,
      {
        cmd: bersih.startsWith('nusantara') ? bersih : `nusantara ${bersih}`,
        out: combined,
        success: kode === 0,
      },
    ]);
    setCliInput('');
  };

  // 1. Eksekusi Lexer
  const { tokens } = useMemo(() => {
    const l = new Lexer(playgroundCode, { sertakanBarisBaru: false });
    const { token } = l.tokenisasi();
    return { tokens: token };
  }, [playgroundCode]);

  // 2. Eksekusi Parser (Phase 7-16)
  const { ast, astString, parserErrors } = useMemo(() => {
    try {
      const p = new Parser(playgroundCode);
      const parsedAst = p.parse();
      const treeText = ASTPrinter.cetak(parsedAst);
      return {
        ast: parsedAst,
        astString: treeText,
        parserErrors: p.dapatkanDaftarGalat(),
      };
    } catch (e: any) {
      return {
        ast: null,
        astString: '',
        parserErrors: [e],
      };
    }
  }, [playgroundCode]);

  // 3. Eksekusi Type Checker (Phase 9-16)
  const { typeErrors } = useMemo(() => {
    if (!ast) return { typeErrors: [] };
    try {
      const resolver = new ResolverModul(virtualFS, { direktoriAkarProyek: '/proyek' });
      const pemuat = new PemuatModul(resolver, virtualFS);
      const checker = new PemeriksaTipe(pemuat);
      return { typeErrors: checker.periksa(ast) };
    } catch (e: any) {
      return { typeErrors: [e] };
    }
  }, [ast, virtualFS]);

  // 4. Eksekusi Interpreter (Phase 8-16 dengan Resolver & Pemuat Modul)
  const { runOutput, runtimeError } = useMemo(() => {
    try {
      const buffer = new PenulisOutputBuffer();
      const resolver = new ResolverModul(virtualFS, { direktoriAkarProyek: '/proyek' });
      const pemuat = new PemuatModul(resolver, virtualFS);
      const interp = new Interpreter(buffer, {
        pemuatModul: pemuat,
        direktoriBasis: '/proyek',
      });
      interp.jalankanKode(playgroundCode, '/proyek');
      return {
        runOutput: buffer.dapatkanSeluruhTeks(),
        runtimeError: null,
      };
    } catch (e: any) {
      return {
        runOutput: [],
        runtimeError: e.message || String(e),
      };
    }
  }, [playgroundCode, virtualFS]);

  const handleCopy = (teks: string, label: string) => {
    navigator.clipboard.writeText(teks);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const kategoriBerkas = useMemo(() => {
    const unik = Array.from(new Set(BERKAS_REPOSITORI.map(b => b.kategori)));
    return ['Semua', ...unik];
  }, []);

  const berkasTerfilter = useMemo(() => {
    if (activeFilterCategory === 'Semua') return BERKAS_REPOSITORI;
    return BERKAS_REPOSITORI.filter(b => b.kategori === activeFilterCategory);
  }, [activeFilterCategory]);

  // --- PHASE 18: SISTEM ERROR & DIAGNOSTIK STATE ---
  const PRESET_ERROR = useMemo(() => [
    {
      id: 'syntax_unexpected',
      nama: '1. Sintaks: Ekspresi Tidak Lengkap (NUS-PAR-002)',
      kategori: 'Sintaks',
      kode: `program ContohErrorSintaks
mulai
    angka : bilangan = 10 +
selesai`,
    },
    {
      id: 'type_mismatch',
      nama: '2. Tipe: Ketidakcocokan Tipe Data (NUS-TYP-001)',
      kategori: 'Tipe',
      kode: `program ContohErrorTipe
mulai
    jumlah : bilangan = "seratus"
    tampilkan("Jumlah:", jumlah)
selesai`,
    },
    {
      id: 'typo_suggestion',
      nama: '3. Nama: Saltik Fungsi & Saran Cerdas (NUS-NAM-002)',
      kategori: 'Nama',
      kode: `program ContohTypo
mulai
    // Typo: tampilkann seharusnya tampilkan
    tampilkann("Halo dari NUSANTARA!")
selesai`,
    },
    {
      id: 'runtime_divzero',
      nama: '4. Runtime: Pembagian Nol & Stack Trace (NUS-RUN-001)',
      kategori: 'Runtime',
      kode: `fungsi bagi(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a / b
selesai

fungsi kalkulasi(n : bilangan) : bilangan
mulai
    kembalikan bagi(n, 0)
selesai

program UjiStackTrace
mulai
    hasil : bilangan = kalkulasi(100)
    tampilkan("Hasil:", hasil)
selesai`,
    },
    {
      id: 'runtime_recursion',
      nama: '5. Runtime: Batas Rekursi Terlampaui (NUS-RUN-003)',
      kategori: 'Runtime',
      kode: `fungsi rekursi(x : bilangan) : bilangan
mulai
    kembalikan rekursi(x + 1)
selesai

program RekursiBatas
mulai
    rekursi(1)
selesai`,
    },
    {
      id: 'index_out_of_bounds',
      nama: '6. Indeks: Indeks Daftar di Luar Batas (NUS-IDX-001)',
      kategori: 'Indeks',
      kode: `program BatasIndeks
mulai
    angka : daftar = [10, 20, 30]
    tampilkan(angka[99])
selesai`,
    },
    {
      id: 'valid_code',
      nama: '7. Kode Valid: Program Tanpa Kesalahan',
      kategori: 'Valid',
      kode: `fungsi kuadrat(x : bilangan) : bilangan
mulai
    kembalikan x * x
selesai

program ProgramValid
mulai
    angka : bilangan = 12
    hasil : bilangan = kuadrat(angka)
    tampilkan("Hasil kuadrat dari 12 adalah:", hasil)
selesai`,
    },
  ], []);

  const [selectedErrorPreset, setSelectedErrorPreset] = useState<string>('syntax_unexpected');
  const [diagnosticCode, setDiagnosticCode] = useState<string>(PRESET_ERROR[0].kode);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    sukses: boolean;
    diagnostik?: Diagnostik;
    output?: string[];
    waktuEksekusi?: number;
  } | null>(null);
  const [jsonViewActive, setJsonViewActive] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('Semua');

  const jalankanDiagnostik = (hanyaPeriksa: boolean = false) => {
    const awal = performance.now();
    try {
      const parser = new Parser(diagnosticCode);
      const ast = parser.parse();
      const galatParser = parser.dapatkanDaftarGalat();
      if (galatParser.length > 0) {
        throw galatParser[0];
      }

      const pemeriksa = new PemeriksaTipe();
      const galatTipe = pemeriksa.periksa(ast);
      if (galatTipe.length > 0) {
        throw galatTipe[0];
      }

      if (hanyaPeriksa) {
        setDiagnosticResult({
          sukses: true,
          output: ['[✓ VALID] Sintaks dan tipe kode sah dan valid tanpa kesalahan.'],
          waktuEksekusi: Math.round((performance.now() - awal) * 100) / 100,
        });
        return;
      }

      const buffer = new PenulisOutputBuffer();
      const interpreter = new Interpreter(buffer);
      interpreter.interpretasikan(ast);

      setDiagnosticResult({
        sukses: true,
        output: buffer.dapatkanSeluruhTeks(),
        waktuEksekusi: Math.round((performance.now() - awal) * 100) / 100,
      });
    } catch (err: any) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber: diagnosticCode,
        namaBerkas: 'utama.nusantara',
        kandidatSimbol: ['tampilkan', 'masukan', 'panjang', 'bagi', 'kalkulasi', 'kuadrat', 'rekursi', 'angka', 'hasil', 'jumlah'],
      });
      setDiagnosticResult({
        sukses: false,
        diagnostik: diag,
        waktuEksekusi: Math.round((performance.now() - awal) * 100) / 100,
      });
    }
  };

  const katalogKodeTerfilter = useMemo(() => {
    const semua = Object.values(METADATA_KODE_GALAT);
    return semua.filter(item => {
      const cocokKategori = catalogCategoryFilter === 'Semua' || item.kategori.toLowerCase() === catalogCategoryFilter.toLowerCase();
      const cocokCari = !catalogSearch.trim() ||
        item.kode.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.judul.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.penjelasan.toLowerCase().includes(catalogSearch.toLowerCase());
      return cocokKategori && cocokCari;
    });
  }, [catalogCategoryFilter, catalogSearch]);

  // --- STATE & METODE TOOLCHAIN & FORMATTER (PHASE 19) ---
  const PRESET_TOOLCHAIN = useMemo(() => [
    {
      id: 'fungsi_kotor',
      nama: '1. Fungsi & Alur Berserakan',
      kategori: 'Format',
      kode: `// Menghitung diskon belanja
fungsi  hitungDiskon( harga:bilangan,persen:desimal ):bilangan
mulai
// Rumus diskon
variabel  potongan:desimal = harga*persen
kembalikan harga-potongan
selesai

program  KatalogToko
mulai
variabel  total:bilangan = hitungDiskon( 150000,0.20 ) // diskon 20%
jika total<100000 maka
tampilkan( "Murah Sekali" )
selain
tampilkan( "Harga Standar" )
akhir
selesai`,
    },
    {
      id: 'koleksi_peta',
      nama: '2. Koleksi & Peta Campur Aduk',
      kategori: 'Koleksi',
      kode: `program DemoKoleksi
mulai
variabel angka:daftar=[ 10,20,30,40 ]
variabel data:peta={ "id":1,"nama":"NUSANTARA","aktif":benar }
tampilkan( angka[0],data["nama"] )
selesai`,
    },
    {
      id: 'linter_warning',
      nama: '3. Peringatan Linter (NUS-W001 s/d W003)',
      kategori: 'Linter',
      kode: `fungsi tesLinter( nilai:bilangan ):bilangan
mulai
    variabel tidakTerpakai:bilangan = 42
    jika nilai == nilai maka
        kembalikan nilai * 2
        tampilkan("Kode ini tidak akan pernah dieksekusi!")
    akhir
    kembalikan 0
selesai

program LinterDemo
mulai
    variabel hasil:bilangan = tesLinter(10)
    tampilkan(hasil)
selesai`,
    },
    {
      id: 'preservasi_string',
      nama: '4. Preservasi String & Escape Sequence',
      kategori: 'String',
      kode: `program DemoString
mulai
    variabel judul:teks="Bahasa     NUSANTARA     v0.19.0"
    variabel formatLolos:teks="Baris 1\\nBaris 2\\tKolom 2\\"Petik\\""
    tampilkan(judul)
    tampilkan(formatLolos)
selesai`,
    },
  ], []);

  const [selectedToolchainPreset, setSelectedToolchainPreset] = useState<string>('fungsi_kotor');
  const [toolchainCode, setToolchainCode] = useState<string>(PRESET_TOOLCHAIN[0].kode);
  const [toolchainFormatted, setToolchainFormatted] = useState<string>('');
  const [toolchainStatus, setToolchainStatus] = useState<{
    sukses: boolean;
    pesan: string;
    peringatan?: Diagnostik[];
    galat?: Diagnostik[];
    idempoten?: boolean;
    waktu?: number;
  } | null>(null);

  const jalankanFormatUI = () => {
    const awal = performance.now();
    const res = formatAman(toolchainCode);
    const durasi = Math.round((performance.now() - awal) * 100) / 100;
    if (res.sukses && res.hasil) {
      setToolchainFormatted(res.hasil);
      const res2 = formatAman(res.hasil);
      const idempoten = res2.sukses && res2.hasil === res.hasil;
      setToolchainStatus({
        sukses: true,
        pesan: res.apakahBerubah ? 'Kode berhasil diformat rapi sesuai standar resmi NUSANTARA.' : 'Kode sudah dalam format standar resmi.',
        idempoten,
        waktu: durasi,
      });
    } else {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(res.galat, {
        kodeSumber: toolchainCode,
        namaBerkas: 'editor.nusantara',
      });
      setToolchainStatus({
        sukses: false,
        pesan: 'Pemformatan dibatalkan (Safety Check) karena ditemukan kesalahan sintaksis pada kode sumber.',
        galat: [diag],
        waktu: durasi,
      });
    }
  };

  const jalankanCekUI = () => {
    const awal = performance.now();
    const fs = new PembacaBerkasMemori({
      '/editor.nusantara': toolchainCode,
    });
    const pemeriksa = new PemeriksaProyek(fs);
    const res = pemeriksa.periksaBerkas('/editor.nusantara');
    const durasi = Math.round((performance.now() - awal) * 100) / 100;

    setToolchainStatus({
      sukses: res.sukses,
      pesan: res.sukses
        ? res.peringatan.length > 0
          ? `[✓ VALID] Pemeriksaan selesai dengan ${res.peringatan.length} peringatan. Tidak ditemukan kesalahan fatal.`
          : '[✓ VALID] Kode sah dan valid. Tidak ditemukan kesalahan.'
        : 'Ditemukan kesalahan pada kode sumber.',
      peringatan: res.peringatan,
      galat: res.galat,
      waktu: durasi,
    });
  };

  // --- STATE & METODE LANGUAGE SERVER & DEVELOPER TOOLS (PHASE 20) ---
  const PRESET_LSP = useMemo(() => [
    {
      id: 'lengkap',
      nama: '1. Fitur Penuh: Fungsi, Variabel, Modul & Stdlib',
      kategori: 'Lengkap',
      kode: `modul Utama

gunakan "utilitas" sebagai util

konstanta PI: desimal = 3.14159
variabel judul: teks = "Sistem Pengukur Lingkaran"

fungsi hitungKeliling(radius: desimal): desimal
mulai
    kembalikan 2.0 * PI * radius
selesai

fungsi prosesData(r: desimal): bilangan
mulai
    keliling: desimal = hitungKeliling(r)
    luasGanda: desimal = util.kaliDua(r)
    panjangTeks: bilangan = teks.panjang(judul)
    tampilkan("Hasil:", keliling, luasGanda)
    kembalikan 1
selesai

program ProgramUtama
mulai
    status: bilangan = prosesData(7.5)
    tampilkan("Selesai status:", status)
selesai`,
    },
    {
      id: 'diagnostik_realtime',
      nama: '2. Real-Time Diagnostik: Deteksi Galat & Linter',
      kategori: 'Diagnostik',
      kode: `modul UjiGalat

fungsi cobaGalat(): bilangan
mulai
    variabel variabelTakTerpakai: bilangan = 100
    jika benar maka
        kembalikan 10
        tampilkan("Kode ini tak terjangkau!")
    akhir
    kembalikan 0
selesai

program ProgramGalat
mulai
    // Galat sintaks tak lengkap:
    angka = 50 + 
selesai`,
    },
    {
      id: 'navigasi_definisi',
      nama: '3. Go-To-Definition Lintas Berkas & Modul',
      kategori: 'Navigasi',
      kode: `modul Navigasi

gunakan "utilitas" sebagai util

fungsi jalankanPerhitungan(): bilangan
mulai
    faktor: bilangan = util.faktorSkala
    hasil: bilangan = util.kaliDua(15)
    kembalikan hasil * faktor
selesai

program DemoNavigasi
mulai
    total: bilangan = jalankanPerhitungan()
    tampilkan("Total:", total)
selesai`,
    },
    {
      id: 'autokompleksi_kata_kunci',
      nama: '4. Autokompleksi Kata Kunci & Stdlib',
      kategori: 'Kompleksi',
      kode: `modul Kompleksi

program DemoKompleksi
mulai
    // Ketik kode atau arahkan kursor ke sini
    teks.
selesai`,
    },
  ], []);

  const [selectedLspPreset, setSelectedLspPreset] = useState<string>('lengkap');
  const [lspCode, setLspCode] = useState<string>(PRESET_LSP[0].kode);
  const [lspCursorPos, setLspCursorPos] = useState<PosisiLSP>({ line: 13, character: 18 });
  const [lspSubTab, setLspSubTab] = useState<'studio' | 'simbol' | 'protokol' | 'vscode'>('studio');

  // Virtual Project Filesystem for LSP
  const lspVirtualFs = useMemo(() => {
    return new PembacaBerkasMemori({
      '/proyek/nusantara.toml': `[nusantara]\nnama = "aplikasi-lsp"\nversi = "0.20.0"\ndeskripsi = "Proyek demonstrasi Language Server Protocol NUSANTARA"\n`,
      '/proyek/src/utilitas.nusantara': `modul utilitas\n\nekspor konstanta faktorSkala: bilangan = 2\n\nekspor fungsi kaliDua(n: bilangan): bilangan\nmulai\n    kembalikan n * 2\nselesai\n`,
      '/proyek/src/utama.nusantara': lspCode,
    });
  }, [lspCode]);

  const lspDocManager = useMemo(() => new ManajerDokumen(), []);
  const lspUri = 'file:///proyek/src/utama.nusantara';

  // Sinkronisasi dokumen LSP
  const lspDokumen = useMemo(() => {
    return lspDocManager.bukaDokumen(lspUri, 'nusantara', 1, lspCode);
  }, [lspDocManager, lspCode]);

  // Layanan Real-time LSP
  const lspDiagnostics = useMemo(() => {
    const layanan = new LayananDiagnostik();
    const res = layanan.analisisDokumen(lspDokumen);
    return res.diagnostik;
  }, [lspDokumen]);

  const lspHover = useMemo(() => {
    const layanan = new LayananHover();
    return layanan.dapatkanHover(lspDokumen, lspCursorPos, lspDokumen.astCache);
  }, [lspDokumen, lspCursorPos]);

  const lspCompletions = useMemo(() => {
    const layanan = new LayananKompleksi();
    return layanan.dapatkanKompleksi(lspDokumen, lspCursorPos);
  }, [lspDokumen, lspCursorPos]);

  const lspDefinition = useMemo(() => {
    const layanan = new LayananDefinisi(lspDocManager, lspVirtualFs, '/proyek');
    return layanan.dapatkanDefinisi(lspDokumen, lspCursorPos, lspDokumen.astCache);
  }, [lspDocManager, lspVirtualFs, lspDokumen, lspCursorPos]);

  const lspSymbols = useMemo(() => {
    const layanan = new LayananSimbol();
    return layanan.dapatkanSimbolDokumen(lspDokumen);
  }, [lspDokumen]);

  // Simulasi pesan protokol JSON-RPC 2.0
  const lspJsonRpcSample = useMemo(() => {
    return [
      {
        arah: 'Klien ➔ Server (Request)',
        metode: 'initialize',
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            processId: 1042,
            rootUri: 'file:///proyek',
            capabilities: {
              textDocument: {
                completion: { snippetSupport: true },
                hover: { contentFormat: ['markdown', 'plaintext'] },
                definition: { linkSupport: true },
              },
            },
          },
        }, null, 2),
      },
      {
        arah: 'Server ➔ Klien (Response)',
        metode: 'initialize Result',
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            capabilities: {
              textDocumentSync: 1,
              completionProvider: { triggerCharacters: ['.', ':'] },
              hoverProvider: true,
              definitionProvider: true,
              documentSymbolProvider: true,
              workspaceSymbolProvider: true,
            },
            serverInfo: {
              name: 'nusantara-language-server',
              version: '0.20.0',
            },
          },
        }, null, 2),
      },
      {
        arah: 'Klien ➔ Server (Notification)',
        metode: 'textDocument/didChange',
        json: JSON.stringify({
          jsonrpc: '2.0',
          method: 'textDocument/didChange',
          params: {
            textDocument: { uri: lspUri, version: 1 },
            contentChanges: [{ text: `${lspCode.slice(0, 80)}...` }],
          },
        }, null, 2),
      },
      {
        arah: 'Server ➔ Klien (Notification)',
        metode: 'textDocument/publishDiagnostics',
        json: JSON.stringify({
          jsonrpc: '2.0',
          method: 'textDocument/publishDiagnostics',
          params: {
            uri: lspUri,
            diagnostics: lspDiagnostics.map((d: DiagnostikLSP) => ({
              range: d.range,
              severity: d.severity,
              code: d.code,
              source: d.source,
              message: d.message,
            })),
          },
        }, null, 2),
      },
      {
        arah: 'Klien ➔ Server (Request)',
        metode: 'textDocument/hover',
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'textDocument/hover',
          params: {
            textDocument: { uri: lspUri },
            position: { line: lspCursorPos.line, character: lspCursorPos.character },
          },
        }, null, 2),
      },
      {
        arah: 'Server ➔ Klien (Response)',
        metode: 'textDocument/hover Result',
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          result: lspHover,
        }, null, 2),
      },
    ];
  }, [lspDiagnostics, lspHover, lspCursorPos, lspCode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* 1. TOP HEADER / APP BAR */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-amber-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-rose-950/40">
              ID
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-white text-base">NUSANTARA</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Phase 20 (v0.20.0)
                </span>
              </div>
              <p className="text-xs text-slate-400">Bahasa Pemrograman Indonesia</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button
              onClick={() => setActiveTab('lsp')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'lsp' ? 'text-sky-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              Language Server (Phase 20)
            </button>
            <button
              onClick={() => setActiveTab('toolchain')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'toolchain' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Wrench className="w-4 h-4 text-emerald-400" />
              Toolchain (Phase 19)
            </button>
            <button
              onClick={() => setActiveTab('diagnostik')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'diagnostik' ? 'text-red-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Bug className="w-4 h-4 text-red-400" />
              Diagnostik (Phase 18)
            </button>
            <button
              onClick={() => setActiveTab('stdlib')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'stdlib' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Library className="w-4 h-4" />
              Stdlib (Phase 17)
            </button>
            <button
              onClick={() => setActiveTab('paket')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'paket' ? 'text-amber-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Package className="w-4 h-4" />
              Paket (Phase 16)
            </button>
            <button
              onClick={() => setActiveTab('struktur-data')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'struktur-data' ? 'text-rose-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Boxes className="w-4 h-4" />
              Struktur Data (Phase 14)
            </button>
            <button
              onClick={() => setActiveTab('fungsi')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'fungsi' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Workflow className="w-4 h-4" />
              Fungsi (Phase 13)
            </button>
            <button
              onClick={() => setActiveTab('perulangan')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'perulangan' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Repeat className="w-4 h-4" />
              Perulangan (Phase 12)
            </button>
            <button
              onClick={() => setActiveTab('percabangan')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'percabangan' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Split className="w-4 h-4" />
              Percabangan (Phase 11)
            </button>
            <button
              onClick={() => setActiveTab('operator')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'operator' ? 'text-amber-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Operator (Phase 10)
            </button>
            <button
              onClick={() => setActiveTab('tipe')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tipe' ? 'text-purple-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Sistem Tipe (Phase 9)
            </button>
            <button
              onClick={() => setActiveTab('ast')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ast' ? 'text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              <Network className="w-4 h-4" />
              Pohon AST
            </button>
            <button
              onClick={() => setActiveTab('token')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'token' ? 'text-teal-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Cpu className="w-4 h-4" />
              Token
            </button>
            <button
              onClick={() => setActiveTab('berkas')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'berkas' ? 'text-white font-semibold' : 'text-slate-400'
              }`}
            >
              <Folder className="w-4 h-4" />
              Berkas
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'roadmap' ? 'text-white font-semibold' : 'text-slate-400'
              }`}
            >
              <Layers className="w-4 h-4" />
              Roadmap
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCopy('git commit -m "feat: add nusantara language server and developer tools"', 'commit-p20')}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {copiedText === 'commit-p20' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Terminal className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedText === 'commit-p20' ? 'Tersalin' : 'Salin Pesan Komit'}</span>
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-white bg-sky-700/80 rounded-lg whitespace-nowrap border border-sky-500/40">
              v0.20.0
            </span>
          </div>
        </div>
      </header>

      {/* 2. HERO STATEMENT & METADATA */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-4 tracking-wide font-mono">
            <span className="text-sky-400 font-bold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">Milestone v0.20.0</span>
            <span aria-hidden="true">·</span>
            <span className="text-white font-medium">Phase 20: Language Server Protocol &amp; Developer Tools NUSANTARA</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-300 font-mono">LSP JSON-RPC 2.0 · Real-Time Diagnostics · Autocomplete · Hover · Go-To-Definition · VS Code</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">170+ Berkas Valid (333 Uji Lulus 100%)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-4xl leading-tight">
            Language Server NUSANTARA: Real-Time Diagnostic, Autokompleksi, Hover &amp; Navigasi Definisi.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
            Bahasa pemrograman NUSANTARA kini dilengkapi fondasi resmi Language Server Protocol (<code className="text-sky-300 font-mono font-semibold">LSP JSON-RPC 2.0 stdio</code>): real-time diagnostic terintegrasi lexer/parser/checker/linter, autokompleksi kata kunci dan pustaka standar, hover tooltip cerdas, go-to-definition lokal &amp; lintas modul, hierarki simbol dokumen, serta fondasi ekstensi VS Code.
          </p>

          <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 max-w-3xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-sky-300">Arsitektur Language Server:</span> Editor/IDE ➔ <code className="text-white">JSON-RPC Stdio</code> ➔ <code className="text-white">NUSANTARA Language Server</code> ➔ <code className="text-white">Manajer Dokumen In-Memory</code> ➔ <code className="text-white">Lexer / Parser / AST / Tipe / Simbol</code> ➔ <code className="text-white">Real-Time Diagnostics &amp; Completion</code>.
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6 overflow-x-auto text-sm">
          <button
            onClick={() => setActiveTab('lsp')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'lsp' ? 'bg-sky-950 text-sky-200 border border-sky-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Language Server (Phase 20)</span>
          </button>
          <button
            onClick={() => setActiveTab('toolchain')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'toolchain' ? 'bg-emerald-950 text-emerald-200 border border-emerald-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-emerald-400" />
            <span>Toolchain &amp; Formatter (Phase 19)</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostik')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'diagnostik' ? 'bg-red-950 text-red-200 border border-red-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bug className="w-4 h-4 text-red-400" />
            <span>Sistem Error &amp; Debugging (Phase 18)</span>
          </button>
          <button
            onClick={() => setActiveTab('stdlib')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'stdlib' ? 'bg-cyan-950 text-cyan-200 border border-cyan-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Library className="w-4 h-4 text-cyan-400" />
            <span>Standard Library (Phase 17)</span>
          </button>
          <button
            onClick={() => setActiveTab('paket')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'paket' ? 'bg-amber-950 text-amber-200 border border-amber-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>Package Manager (Phase 16)</span>
          </button>
          <button
            onClick={() => setActiveTab('struktur-data')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'struktur-data' ? 'bg-rose-950 text-rose-200 border border-rose-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-rose-400" />
            <span>Struktur Data (Phase 14)</span>
          </button>
          <button
            onClick={() => setActiveTab('fungsi')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'fungsi' ? 'bg-indigo-950 text-indigo-200 border border-indigo-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Workflow className="w-4 h-4 text-indigo-400" />
            <span>Fungsi &amp; Rekursi (Phase 13)</span>
          </button>
          <button
            onClick={() => setActiveTab('perulangan')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'perulangan' ? 'bg-emerald-950 text-emerald-200 border border-emerald-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Repeat className="w-4 h-4 text-emerald-400" />
            <span>Perulangan (Phase 12)</span>
          </button>
          <button
            onClick={() => setActiveTab('percabangan')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'percabangan' ? 'bg-cyan-950 text-cyan-200 border border-cyan-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Split className="w-4 h-4 text-cyan-400" />
            <span>Percabangan (Phase 11)</span>
          </button>
          <button
            onClick={() => setActiveTab('operator')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'operator' ? 'bg-amber-950 text-amber-200 border border-amber-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>Tabel Operator (Phase 10)</span>
          </button>
          <button
            onClick={() => setActiveTab('tipe')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'tipe' ? 'bg-purple-950 text-purple-200 border border-purple-700/60 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>Sistem Tipe (Phase 9)</span>
          </button>
          <button
            onClick={() => setActiveTab('ast')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'ast' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Pohon AST</span>
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'token' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4 text-teal-400" />
            <span>Token Lexer ({tokens.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('panduan')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'panduan' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-rose-400" />
            <span>Panduan &amp; Glosarium</span>
          </button>
          <button
            onClick={() => setActiveTab('berkas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'berkas' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Folder className="w-4 h-4 text-amber-400" />
            <span>Berkas Repositori ({BERKAS_REPOSITORI.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'roadmap' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Peta Jalan 36 Fase</span>
          </button>
        </div>

        {/* TAB 00: LANGUAGE SERVER & DEVELOPER TOOLS (PHASE 20) */}
        {activeTab === 'lsp' && (
          <div className="space-y-6">
            {/* Header Ringkasan LSP */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white tracking-wide">
                        Language Server &amp; Developer Tools NUSANTARA
                      </h2>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        v0.20.0 Resmi
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Fondasi resmi Language Server Protocol (LSP JSON-RPC 2.0 stdio): real-time diagnostics, autokompleksi, hover tooltip, navigasi definisi lintas berkas, simbol dokumen AST, dan fondasi ekstensi editor VS Code.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-800/80 text-sky-300 text-xs font-mono font-medium flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>nusantara bahasa-server</span>
                  </div>
                </div>
              </div>

              {/* Sub-Navigasi LSP */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-1 text-xs">
                <button
                  onClick={() => setLspSubTab('studio')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    lspSubTab === 'studio' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Studio Interaktif (Hover, Kompleksi, Navigasi)</span>
                </button>
                <button
                  onClick={() => setLspSubTab('simbol')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    lspSubTab === 'simbol' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Hierarki Simbol Dokumen ({lspSymbols.length})</span>
                </button>
                <button
                  onClick={() => setLspSubTab('protokol')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    lspSubTab === 'protokol' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspektur JSON-RPC 2.0</span>
                </button>
                <button
                  onClick={() => setLspSubTab('vscode')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    lspSubTab === 'vscode' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Ekstensi VS Code &amp; Panduan Stdio</span>
                </button>
              </div>

              {/* 4 Pilar Fitur LSP */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-medium text-slate-400">Real-Time Diagnostik</div>
                  <div className="text-lg font-bold text-white mt-1">
                    {lspDiagnostics.length === 0 ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 0 Galat
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> {lspDiagnostics.length} Isu
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Lexer, Parser, Tipe, &amp; Linter</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-medium text-slate-400">Autokompleksi</div>
                  <div className="text-lg font-bold text-sky-400 mt-1">{lspCompletions.items.length} Usulan</div>
                  <div className="text-[10px] text-sky-400/90 mt-0.5">Kata Kunci, Simbol, Stdlib</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-medium text-slate-400">Hover &amp; Definisi</div>
                  <div className="text-lg font-bold text-indigo-400 mt-1">
                    {lspHover ? 'Aktif' : 'Menunggu Kursor'}
                  </div>
                  <div className="text-[10px] text-indigo-400/90 mt-0.5">Tipe data &amp; signature</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-medium text-slate-400">Standar Protokol</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">LSP v3.17</div>
                  <div className="text-[10px] text-emerald-400/90 mt-0.5">JSON-RPC 2.0 Framed Stdio</div>
                </div>
              </div>
            </div>

            {/* SUB-VIEW 1: STUDIO INTERAKTIF LSP */}
            {lspSubTab === 'studio' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* KOLOM KIRI: EDITOR DOKUMEN & KONTROL KURSOR (6 Kolom) */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-sky-400" />
                        <span className="text-sm font-bold text-white">Dokumen Aktif LSP (In-Memory)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">file:///proyek/src/utama.nusantara</span>
                    </div>

                    {/* Preset Skenario LSP */}
                    <div className="mb-3">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                        Pilih Skenario Demonstrasi LSP:
                      </label>
                      <select
                        value={selectedLspPreset}
                        onChange={(e) => {
                          const target = PRESET_LSP.find(p => p.id === e.target.value);
                          if (target) {
                            setSelectedLspPreset(target.id);
                            setLspCode(target.kode);
                            if (target.id === 'lengkap') {
                              setLspCursorPos({ line: 13, character: 18 });
                            } else if (target.id === 'diagnostik_realtime') {
                              setLspCursorPos({ line: 14, character: 14 });
                            } else if (target.id === 'navigasi_definisi') {
                              setLspCursorPos({ line: 7, character: 25 });
                            } else {
                              setLspCursorPos({ line: 6, character: 9 });
                            }
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
                      >
                        {PRESET_LSP.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Area Teks Editor */}
                    <div className="relative">
                      <textarea
                        value={lspCode}
                        onChange={(e) => setLspCode(e.target.value)}
                        onSelect={(e) => {
                          const ta = e.target as HTMLTextAreaElement;
                          const selStart = ta.selectionStart;
                          const lines = lspCode.slice(0, selStart).split('\n');
                          const baris = lines.length - 1;
                          const karakter = lines[lines.length - 1].length;
                          setLspCursorPos({ line: baris, character: karakter });
                        }}
                        rows={16}
                        className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 leading-relaxed resize-y selection:bg-sky-600/40"
                        placeholder="Ketik kode NUSANTARA di sini..."
                      />
                    </div>

                    {/* Pengatur Posisi Kursor & Lokasi Cepat */}
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">Posisi Kursor LSP:</span>
                          <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-mono text-[11px]">
                            Baris {lspCursorPos.line + 1}, Kolom {lspCursorPos.character + 1}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          (0-indexed: line={lspCursorPos.line}, character={lspCursorPos.character})
                        </div>
                      </div>

                      {/* Tombol Lompat Cepat ke Simbol Tertentu */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400">Lompat Kursor ke:</span>
                        <button
                          onClick={() => setLspCursorPos({ line: 4, character: 12 })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded font-mono transition-colors"
                        >
                          PI (Brs 5)
                        </button>
                        <button
                          onClick={() => setLspCursorPos({ line: 5, character: 11 })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded font-mono transition-colors"
                        >
                          judul (Brs 6)
                        </button>
                        <button
                          onClick={() => setLspCursorPos({ line: 7, character: 12 })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded font-mono transition-colors"
                        >
                          hitungKeliling (Brs 8)
                        </button>
                        <button
                          onClick={() => setLspCursorPos({ line: 14, character: 22 })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded font-mono transition-colors"
                        >
                          util.kaliDua (Brs 15)
                        </button>
                        <button
                          onClick={() => setLspCursorPos({ line: 15, character: 24 })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded font-mono transition-colors"
                        >
                          teks.panjang (Brs 16)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Panel Virtual Filesystem Proyek */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-xs">
                    <div className="flex items-center gap-2 mb-2.5 font-bold text-white">
                      <Folder className="w-4 h-4 text-amber-400" />
                      <span>Workspace Virtual Proyek (/proyek)</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-amber-300">📄 /proyek/nusantara.toml</span>
                        <span className="text-slate-500">Manifest Proyek</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-sky-300">📄 /proyek/src/utilitas.nusantara</span>
                        <span className="text-slate-500">Modul utilitas (ekspor kaliDua, faktorSkala)</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-emerald-300 font-semibold">📄 /proyek/src/utama.nusantara</span>
                        <span className="text-emerald-400">Aktif di Memory LSP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KOLOM KANAN: RESPONS LAYANAN BAHASA LSP (6 Kolom) */}
                <div className="lg:col-span-6 space-y-4">
                  {/* KARTU 1: HOVER INFORMATION (textDocument/hover) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <span className="text-sm font-bold text-white">Hover Information (textDocument/hover)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                        LSP Hover
                      </span>
                    </div>

                    {lspHover ? (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="text-xs font-mono text-sky-300 whitespace-pre-wrap leading-relaxed">
                          {typeof lspHover.contents === 'string'
                            ? lspHover.contents
                            : Array.isArray(lspHover.contents)
                              ? lspHover.contents.map(c => typeof c === 'string' ? c : c.value).join('\n\n')
                              : (lspHover.contents as any)?.value || ''}
                        </div>
                        {lspHover.range && (
                          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                            Rentang Token: Baris {lspHover.range.start.line + 1}, Kolom {lspHover.range.start.character + 1} s/d Kolom {lspHover.range.end.character + 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-400 italic">
                        Tidak ada informasi hover pada posisi kursor saat ini (Baris {lspCursorPos.line + 1}, Kolom {lspCursorPos.character + 1}). Klik salah satu tombol "Lompat Kursor ke" di sebelah kiri untuk melihat tooltip hover.
                      </div>
                    )}
                  </div>

                  {/* KARTU 2: GO TO DEFINITION (textDocument/definition) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-bold text-white">Go-To-Definition (textDocument/definition)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                        LSP Definition
                      </span>
                    </div>

                    {lspDefinition ? (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Definisi Ditemukan!</span>
                        </div>
                        <div className="font-mono text-slate-300 text-[11px] break-all bg-slate-900 p-2 rounded border border-slate-800">
                          URI: {lspDefinition.uri}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Lokasi Deklarasi: <span className="text-white font-mono">Baris {lspDefinition.range.start.line + 1}, Kolom {lspDefinition.range.start.character + 1}</span>
                        </div>
                        {lspDefinition.uri.includes('utilitas.nusantara') && (
                          <div className="text-[11px] text-sky-400 bg-sky-950/40 p-2 rounded border border-sky-800/60">
                            ★ Navigasi Lintas Berkas: Terhubung langsung ke berkas modul eksternal <code className="text-white font-mono">utilitas.nusantara</code>!
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-400 italic">
                        Kursor tidak mengarah pada simbol dengan definisi deklarasi (misal: panggil fungsi, akses variabel, atau impor modul).
                      </div>
                    )}
                  </div>

                  {/* KARTU 3: AUTOCOMPLETE & SUGGESTIONS (textDocument/completion) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-white">Autocomplete (textDocument/completion)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                        {lspCompletions.items.length} Simbol
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {lspCompletions.items.slice(0, 10).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-slate-300 uppercase font-mono">
                              {item.kind === 3 ? 'Fungsi' : item.kind === 6 ? 'Variabel' : item.kind === 9 ? 'Modul' : item.kind === 14 ? 'Keyword' : item.kind === 21 ? 'Tetap' : 'Simbol'}
                            </span>
                            <span className="font-mono font-bold text-white truncate">{item.label}</span>
                            {item.detail && <span className="text-[11px] text-slate-400 truncate">{item.detail}</span>}
                          </div>
                          {item.insertText && item.insertText !== item.label && (
                            <span className="text-[10px] font-mono text-sky-400 shrink-0 bg-sky-950/50 px-1.5 py-0.5 rounded">
                              snippet
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KARTU 4: REAL-TIME DIAGNOSTICS (textDocument/publishDiagnostics) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-bold text-white">Real-Time Diagnostics (textDocument/publishDiagnostics)</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        lspDiagnostics.length === 0
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {lspDiagnostics.length} Temuan
                      </span>
                    </div>

                    {lspDiagnostics.length === 0 ? (
                      <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>[✓ BERSIH] Tidak ada kesalahan sintaks, tipe, atau peringatan linter pada dokumen ini.</span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {lspDiagnostics.map((diag: DiagnostikLSP, idx: number) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                              diag.severity === 1
                                ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                                : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                                {diag.code}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                Baris {diag.range.start.line + 1}, Kolom {diag.range.start.character + 1}
                              </span>
                            </div>
                            <div className="text-xs leading-relaxed font-medium">
                              {diag.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: POHON SIMBOL DOKUMEN (textDocument/documentSymbol) */}
            {lspSubTab === 'simbol' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Network className="w-5 h-5 text-sky-400" />
                      <span>Hierarki Simbol Dokumen (Outline AST)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Representasi hierarki fungsi, variabel, konstanta, dan program yang dikenali editor melalui request <code className="text-sky-300">textDocument/documentSymbol</code>.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    Total: {lspSymbols.length} Simbol Teratas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lspSymbols.map((sym, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-950 text-sky-300 border border-sky-800 uppercase font-mono">
                            {sym.kind === 2 ? 'Modul' : sym.kind === 12 ? 'Fungsi' : sym.kind === 13 ? 'Variabel' : sym.kind === 14 ? 'Tetap' : 'Program'}
                          </span>
                          <span className="font-bold text-white font-mono text-sm">{sym.name}</span>
                        </div>
                        {sym.detail && (
                          <span className="text-xs text-slate-400 font-mono">{sym.detail}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Cakupan: Baris {sym.range.start.line + 1} s/d {sym.range.end.line + 1}
                      </div>
                      {sym.children && sym.children.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800 pl-3 border-l-2 border-sky-500/40 space-y-1">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Simbol Anak:</div>
                          {sym.children.map((child, cIdx) => (
                            <div key={cIdx} className="text-xs font-mono flex items-center justify-between text-slate-300">
                              <span>• {child.name}</span>
                              <span className="text-[10px] text-slate-500">{child.detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: INSPEKTUR PROTOKOL JSON-RPC 2.0 */}
            {lspSubTab === 'protokol' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-emerald-400" />
                      <span>Inspektur Aliran Pesan JSON-RPC 2.0 (LSP Wire)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Paket framed stdio nyata yang dikirimkan antara editor (klien) dan server bahasa NUSANTARA sesuai standar LSP v3.17.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Content-Length Framed
                  </span>
                </div>

                <div className="space-y-3">
                  {lspJsonRpcSample.map((msg, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-300 font-mono">{msg.arah}</span>
                        <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {msg.metode}
                        </span>
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-900/90 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                        {`Content-Length: ${new TextEncoder().encode(msg.json).length}\r\n\r\n${msg.json}`}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-VIEW 4: EKSTENSI VS CODE & PANDUAN PENGEMBANG */}
            {lspSubTab === 'vscode' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-cyan-400" />
                    <span>Fondasi Ekstensi VS Code &amp; Perintah CLI Server</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Direktori <code className="text-white">editors/vscode/</code> telah disiapkan lengkap dengan manifest ekstensi, language configuration, dan TextMate grammar untuk pewarnaan sintaks.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                      1. Menjalankan Server Bahasa di Terminal
                    </div>
                    <div className="p-3 rounded bg-slate-900 font-mono text-xs text-slate-300 border border-slate-800 space-y-1">
                      <div className="text-emerald-400"># Menjalankan server via stdio untuk editor apa pun:</div>
                      <div>nusantara bahasa-server</div>
                      <div className="text-slate-500 mt-1"># atau alias pendek:</div>
                      <div>nusantara lsp</div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Server secara ketat tidak pernah mencetak log ke <code className="text-white">stdout</code> demi menjaga integritas framing JSON-RPC. Semua log diagnostik internal dialirkan ke <code className="text-white">stderr</code>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      2. Struktur Ekstensi Editor VS Code
                    </div>
                    <div className="p-3 rounded bg-slate-900 font-mono text-xs text-slate-300 border border-slate-800 space-y-1">
                      <div>editors/vscode/</div>
                      <div className="text-slate-400 pl-4">├── package.json</div>
                      <div className="text-slate-400 pl-4">├── language-configuration.json</div>
                      <div className="text-slate-400 pl-4">├── syntaxes/nusantara.tmLanguage.json</div>
                      <div className="text-slate-400 pl-4">└── src/extension.ts</div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Ekstensi otomatis mengaitkan ekstensi berkas <code className="text-white">.nusantara</code> dengan bahasa <code className="text-white">nusantara</code>, mengaktifkan bracket matching, auto-closing pairs, dan meluncurkan client LSP.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-white">Konfigurasi Editor Neovim (nvim-lspconfig):</div>
                  <pre className="p-3 rounded bg-slate-900 font-mono text-xs text-slate-300 border border-slate-800 overflow-x-auto leading-relaxed">
{`local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.nusantara then
  configs.nusantara = {
    default_config = {
      cmd = { 'nusantara', 'bahasa-server' },
      filetypes = { 'nusantara' },
      root_dir = lspconfig.util.root_pattern('nusantara.toml', '.git'),
      settings = {},
    },
  }
end
lspconfig.nusantara.setup({})`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 0: TOOLCHAIN & FORMATTER NUSANTARA (PHASE 19) */}
        {activeTab === 'toolchain' && (
          <div className="space-y-6">
            {/* Header Ringkasan Toolchain */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white tracking-wide">
                        Toolchain &amp; Formatter Resmi NUSANTARA
                      </h2>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        v0.19.0 Resmi
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Tooling terpadu: Formatter AST murni (<code className="text-emerald-300">nusantara format</code>), Pemeriksa kode &amp; proyek (<code className="text-cyan-300">nusantara cek</code>), Linter ringan (<code className="text-amber-300">NUS-W001..W004</code>), preservasi komentar sebaris, dan re-parse safety check.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={jalankanFormatUI}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Format Kode (AST)</span>
                  </button>
                  <button
                    onClick={jalankanCekUI}
                    className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Periksa (nusantara cek)</span>
                  </button>
                </div>
              </div>

              {/* Grid 4 Statistik Pilar Toolchain */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Metode Pretty-Print</div>
                  <div className="text-xl font-bold text-white mt-1">AST Murni</div>
                  <div className="text-[10px] text-emerald-400/90 mt-0.5">Bukan manipulasi teks biasa</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Sifat Formatter</div>
                  <div className="text-xl font-bold text-white mt-1">Idempoten</div>
                  <div className="text-[10px] text-cyan-400/90 mt-0.5">format(A) ≡ format(format(A))</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Protokol Keamanan</div>
                  <div className="text-xl font-bold text-white mt-1">Safety Check</div>
                  <div className="text-[10px] text-amber-400/90 mt-0.5">Re-parse AST sebelum tulis</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Linter &amp; Diagnostic</div>
                  <div className="text-xl font-bold text-white mt-1">NUS-W001..4</div>
                  <div className="text-[10px] text-indigo-400/90 mt-0.5">Variabel &amp; unreachable code</div>
                </div>
              </div>
            </div>

            {/* STUDIO FORMATTER & CHECKER INTERAKTIF */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* KOLOM KIRI: EDITOR KODE SUMBER ASLI (6 Kolom) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">Kode Sumber Asli (Sebelum Diformat)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">editor.nusantara</span>
                  </div>

                  {/* Preset Skenario Formatter & Linter */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                      Pilih Contoh Skenario:
                    </label>
                    <select
                      value={selectedToolchainPreset}
                      onChange={(e) => {
                        const target = PRESET_TOOLCHAIN.find(p => p.id === e.target.value);
                        if (target) {
                          setSelectedToolchainPreset(target.id);
                          setToolchainCode(target.kode);
                          setToolchainFormatted('');
                          setToolchainStatus(null);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      {PRESET_TOOLCHAIN.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <textarea
                      value={toolchainCode}
                      onChange={(e) => setToolchainCode(e.target.value)}
                      rows={15}
                      className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
                      placeholder="Ketik atau tempel kode NUSANTARA di sini..."
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                    <div className="text-[11px] text-slate-400">
                      Baris: {toolchainCode.split('\n').length} | Karakter: {toolchainCode.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={jalankanFormatUI}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/30"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Format Kode</span>
                      </button>
                      <button
                        onClick={jalankanCekUI}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Cek Kode</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: HASIL FORMATTER & DIAGNOSTIK (6 Kolom) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl min-h-[490px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white">Hasil Toolchain &amp; Formatter Resmi</span>
                      </div>

                      {toolchainFormatted && (
                        <button
                          onClick={() => handleCopy(toolchainFormatted, 'copy-formatted')}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-700"
                        >
                          {copiedText === 'copy-formatted' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedText === 'copy-formatted' ? 'Tersalin' : 'Salin Hasil'}</span>
                        </button>
                      )}
                    </div>

                    {/* Status Eksekusi */}
                    {toolchainStatus && (
                      <div
                        className={`p-3.5 rounded-xl border mb-3 text-xs flex items-start gap-2.5 ${
                          toolchainStatus.sukses
                            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                        }`}
                      >
                        {toolchainStatus.sukses ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-bold">{toolchainStatus.pesan}</div>
                          {toolchainStatus.idempoten !== undefined && (
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                              <span>Idempotensi: <strong className="text-emerald-300">Terverifikasi (100% Deterministik)</strong></span>
                              <span>·</span>
                              <span>Durasi: {toolchainStatus.waktu} ms</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Kartu Peringatan Linter (Jika Ada) */}
                    {toolchainStatus?.peringatan && toolchainStatus.peringatan.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Peringatan Linter NUSANTARA ({toolchainStatus.peringatan.length}):</span>
                        </div>
                        {toolchainStatus.peringatan.map((warn, wIdx) => (
                          <div key={wIdx} className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-[10px]">
                                {warn.kode}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {warn.lokasi ? `Baris ${warn.lokasi.baris}, Kolom ${warn.lokasi.kolom}` : 'Lokasi Berkas'}
                              </span>
                            </div>
                            <div className="text-slate-200 font-medium">{warn.pesan}</div>
                            {warn.saran && (
                              <div className="text-[11px] text-emerald-400/90 flex items-start gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{warn.saran}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Kotak Kode Terformat / Placeholder */}
                    {toolchainFormatted ? (
                      <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto max-h-[360px] leading-relaxed">
                        <pre>{toolchainFormatted}</pre>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800/60 h-64">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2.5 text-slate-500">
                          <Wrench className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-400">Hasil Format Belum Dijalankan</p>
                        <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                          Klik &ldquo;Format Kode (AST)&rdquo; untuk merapikan kode atau &ldquo;Periksa (nusantara cek)&rdquo; untuk validasi statis.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span>Standar Formatter: 4 Spasi, Idempoten, Preservasi String &amp; Komentar</span>
                    <span>Status: Siap Produksi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SIMULATOR COMMAND LINE TOOLCHAIN (CLI) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Simulator Perintah CLI: <code className="text-emerald-400 font-mono">nusantara format</code> &amp; <code className="text-cyan-400 font-mono">nusantara cek</code>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Perintah Toolchain:</span>
                  <button
                    onClick={() => handleRunCli('format file.nusantara')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-800 transition-colors cursor-pointer"
                  >
                    format file.nusantara
                  </button>
                  <button
                    onClick={() => handleRunCli('format --cek file.nusantara')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    format --cek
                  </button>
                  <button
                    onClick={() => handleRunCli('format --tulis file.nusantara')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    format --tulis
                  </button>
                  <button
                    onClick={() => handleRunCli('cek')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-800 transition-colors cursor-pointer"
                  >
                    nusantara cek
                  </button>
                  <button
                    onClick={() => handleRunCli('cek file.nusantara')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    cek file.nusantara
                  </button>
                  <button
                    onClick={() => handleRunCli('bantuan')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    nusantara bantuan
                  </button>
                </div>
              </div>

              {/* Terminal View */}
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-200 h-56 overflow-y-auto border border-slate-800/80 space-y-3 shadow-inner">
                <div className="text-slate-400">
                  # Terminal Terpadu NUSANTARA Toolchain v0.19.0
                  <br />
                  # Ketik atau klik tombol di atas untuk menjalankan perintah formatter dan checker resmi.
                </div>
                {cliHistory.slice(-5).map((entry, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-emerald-400 flex items-center gap-1.5">
                      <span className="text-slate-500">$</span>
                      <span>{entry.cmd}</span>
                    </div>
                    <pre className="text-slate-300 whitespace-pre-wrap pl-3 border-l-2 border-slate-800 text-[11px] leading-relaxed">
                      {entry.out.join('\n')}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 0: SISTEM ERROR & DEBUGGING (PHASE 18) */}
        {activeTab === 'diagnostik' && (
          <div className="space-y-6">
            {/* Header Ringkasan Sistem Error */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
                    <Bug className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white tracking-wide">
                        Sistem Error &amp; Debugging NUSANTARA
                      </h2>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        v0.18.0 Resmi
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Arsitektur penanganan kesalahan modern berbahasa Indonesia: 12 kategori terstruktur, kode unik <code className="text-rose-300">NUS-xxx-yyy</code>, cuplikan kode visual caret (<code className="text-rose-300">^^^^</code>), rekomendasi saltik Levenshtein, dan pelacakan tumpukan frame komprehensif.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => jalankanDiagnostik(false)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Jalankan &amp; Analisis</span>
                  </button>
                  <button
                    onClick={() => jalankanDiagnostik(true)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Periksa (Check)</span>
                  </button>
                </div>
              </div>

              {/* Grid 4 Statistik Pilar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Klasifikasi Kategori</div>
                  <div className="text-xl font-bold text-white mt-1">12 Kategori</div>
                  <div className="text-[10px] text-rose-400/90 mt-0.5">Lexer, Parser, Tipe, Runtime, Modul, Paket...</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Kode Galat Terdaftar</div>
                  <div className="text-xl font-bold text-white mt-1">35+ Kode Unik</div>
                  <div className="text-[10px] text-amber-400/90 mt-0.5">Format standar NUS-xxx-yyy stabil</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Saran Cerdas (Typo)</div>
                  <div className="text-xl font-bold text-white mt-1">Levenshtein</div>
                  <div className="text-[10px] text-emerald-400/90 mt-0.5">Inferensi kandidat simbol terdekat</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400">Format Diagnostik</div>
                  <div className="text-xl font-bold text-white mt-1">ANSI &amp; JSON</div>
                  <div className="text-[10px] text-cyan-400/90 mt-0.5">Dukungan penuh tooling CLI &amp; IDE/LSP</div>
                </div>
              </div>
            </div>

            {/* STUDIO DIAGNOSTIK & PLAYGROUND KESALAHAN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* KOLOM KIRI: EDITOR & PRESET (5 Kolom) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-rose-400" />
                      <span className="text-sm font-bold text-white">Kode Sumber Program</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">utama.nusantara</span>
                  </div>

                  {/* Pilihan Preset Skenario Error */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                      Pilih Skenario Kesalahan Percontohan:
                    </label>
                    <select
                      value={selectedErrorPreset}
                      onChange={(e) => {
                        const target = PRESET_ERROR.find(p => p.id === e.target.value);
                        if (target) {
                          setSelectedErrorPreset(target.id);
                          setDiagnosticCode(target.kode);
                          setDiagnosticResult(null);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-medium"
                    >
                      {PRESET_ERROR.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <textarea
                      value={diagnosticCode}
                      onChange={(e) => setDiagnosticCode(e.target.value)}
                      rows={14}
                      className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 leading-relaxed resize-y"
                      placeholder="Tulis kode program NUSANTARA di sini..."
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                    <div className="text-[11px] text-slate-400">
                      Baris: {diagnosticCode.split('\n').length} | Karakter: {diagnosticCode.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => jalankanDiagnostik(false)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/30"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Eksekusi</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: INSPEKSI HASIL DIAGNOSTIK (7 Kolom) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl min-h-[460px] flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                      <span className="text-sm font-bold text-white">Inspeksi &amp; Umpan Balik Diagnostik</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setJsonViewActive(prev => !prev)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                          jsonViewActive
                            ? 'bg-rose-950 text-rose-300 border-rose-700/60'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {jsonViewActive ? 'Tampilan Format Teks' : 'Tampilan Format JSON (IDE)'}
                      </button>
                    </div>
                  </div>

                  {!diagnosticResult ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
                        <Bug className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-medium text-slate-400">Belum Ada Analisis Berjalan</p>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Klik tombol &ldquo;Jalankan &amp; Analisis&rdquo; atau &ldquo;Periksa (Check)&rdquo; untuk menguji kode dan melihat visualisasi diagnostik lengkap.
                      </p>
                    </div>
                  ) : jsonViewActive ? (
                    /* Tampilan JSON */
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Payload JSON Standar Language Server:</span>
                        <button
                          onClick={() => handleCopy(
                            diagnosticResult.diagnostik
                              ? formatDiagnostikKeJSON(diagnosticResult.diagnostik)
                              : JSON.stringify({ sukses: true, output: diagnosticResult.output }, null, 2),
                            'json-diag'
                          )}
                          className="hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText === 'json-diag' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedText === 'json-diag' ? 'Tersalin' : 'Salin JSON'}</span>
                        </button>
                      </div>
                      <pre className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-auto max-h-[420px] leading-relaxed">
                        {diagnosticResult.diagnostik
                          ? formatDiagnostikKeJSON(diagnosticResult.diagnostik)
                          : JSON.stringify({ sukses: true, output: diagnosticResult.output, waktuMs: diagnosticResult.waktuEksekusi }, null, 2)}
                      </pre>
                    </div>
                  ) : diagnosticResult.sukses ? (
                    /* Hasil Sukses */
                    <div className="space-y-4 flex-1">
                      <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-emerald-300">Program Berhasil Dieksekusi Tanpa Galat</div>
                          <div className="text-xs text-emerald-400/80 mt-0.5">
                            Sintaks sah, sistem tipe terpenuhi, dan runtime berjalan sukses dalam {diagnosticResult.waktuEksekusi}ms.
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                        <div className="text-xs font-semibold text-slate-400 mb-2 font-mono flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Keluaran Terminal (Console Output):</span>
                        </div>
                        {diagnosticResult.output && diagnosticResult.output.length > 0 ? (
                          <div className="space-y-1 font-mono text-xs text-slate-200">
                            {diagnosticResult.output.map((baris, idx) => (
                              <div key={idx} className="leading-relaxed">{baris}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 font-mono italic">
                            (Program selesai tanpa mencetak teks ke layar)
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Hasil Error Terperinci */
                    <div className="space-y-4 flex-1">
                      {/* Banner Error Header */}
                      <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 shadow-inner">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                              {diagnosticResult.diagnostik?.kode}
                            </span>
                            <span className="text-xs font-bold text-rose-200">
                              Kesalahan {diagnosticResult.diagnostik?.kategori}
                            </span>
                          </div>
                          {diagnosticResult.diagnostik?.lokasi && (
                            <span className="text-xs font-mono text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                              {diagnosticResult.diagnostik.lokasi.berkas ? `${diagnosticResult.diagnostik.lokasi.berkas}:` : ''}
                              {diagnosticResult.diagnostik.lokasi.baris}:{diagnosticResult.diagnostik.lokasi.kolom}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-sm font-bold text-white">
                          {diagnosticResult.diagnostik?.pesan}
                        </div>
                      </div>

                      {/* Source Snippet dengan Visual Caret (^^^^) */}
                      {diagnosticResult.diagnostik?.potonganKode && (
                        <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/90 font-mono text-xs">
                          <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider font-sans font-semibold">
                            Cuplikan Lokasi Masalah:
                          </div>
                          <div className="text-slate-300 flex items-start gap-2">
                            <span className="text-slate-500 select-none">{diagnosticResult.diagnostik.potonganKode.nomorBaris} |</span>
                            <span className="overflow-x-auto">{diagnosticResult.diagnostik.potonganKode.teksBaris}</span>
                          </div>
                          <div className="text-rose-400 font-bold flex items-start gap-2 mt-0.5 select-none">
                            <span className="text-slate-800 select-none">{' '.repeat(String(diagnosticResult.diagnostik.potonganKode.nomorBaris).length)} |</span>
                            <span className="whitespace-pre overflow-x-auto text-rose-400 font-bold">
                              {diagnosticResult.diagnostik.potonganKode.teksCaret}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Saran Rekomendasi Cerdas */}
                      {diagnosticResult.diagnostik?.saran && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-emerald-300 leading-relaxed">
                            <span className="font-bold text-emerald-200">Saran Perbaikan: </span>
                            {diagnosticResult.diagnostik.saran}
                          </div>
                        </div>
                      )}

                      {/* Jejak Tumpukan Pemanggilan (Stack Trace) */}
                      {diagnosticResult.diagnostik?.jejakTumpukan && diagnosticResult.diagnostik.jejakTumpukan.length > 0 && (
                        <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800">
                          <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
                            <Network className="w-3.5 h-3.5 text-blue-400" />
                            <span>Jejak Pemanggilan Tumpukan (Stack Trace):</span>
                          </div>
                          <div className="space-y-1.5">
                            {diagnosticResult.diagnostik.jejakTumpukan.map((bingkai, bIdx) => (
                              <div
                                key={bIdx}
                                className="flex flex-wrap items-center justify-between text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800/80 font-mono"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-bold">{bIdx + 1}.</span>
                                  <span className="text-blue-300 font-semibold">{bingkai.namaFungsi}()</span>
                                  {bingkai.namaModul && (
                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                      modul: {bingkai.namaModul}
                                    </span>
                                  )}
                                  {bingkai.namaPaket && (
                                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
                                      paket: {bingkai.namaPaket}
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  {bingkai.lokasi ? `${bingkai.lokasi.berkas || 'program'}:${bingkai.lokasi.baris}:${bingkai.lokasi.kolom}` : 'lokasi tumpukan'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KATALOG KODE ERROR RESMI (BROWSABLE REFERENCE) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-rose-400" />
                    <span>Katalog &amp; Glosarium Kode Error Resmi NUSANTARA</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftar lengkap kode galat standar yang stabil, terdokumentasi, dan dapat diuji.
                  </p>
                </div>

                {/* Pencarian Kode */}
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cari kode atau kata kunci..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Filter Kategori */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 text-xs">
                {['Semua', 'Lexer', 'Sintaks', 'Tipe', 'Nama', 'Modul', 'Paket', 'Runtime', 'Indeks', 'Berkas', 'Konversi', 'Internal'].map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setCatalogCategoryFilter(kat)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      catalogCategoryFilter === kat
                        ? 'bg-rose-950 text-rose-200 border border-rose-700/60 font-semibold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>

              {/* Grid Kartu Kode Galat */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
                {katalogKodeTerfilter.map((item) => (
                  <div
                    key={item.kode}
                    className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/50">
                          {item.kode}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {item.kategori}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mb-1">
                        {item.judul}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {item.penjelasan}
                      </p>
                    </div>

                    {item.saranStandar && (
                      <div className="mt-2 pt-2 border-t border-slate-900 text-[10px] text-emerald-400/90 leading-normal flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item.saranStandar}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: STANDARD LIBRARY NUSANTARA (PHASE 17) */}
        {activeTab === 'stdlib' && (
          <div className="space-y-6">
            {/* Header Ringkasan Standard Library */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
                    <Library className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white tracking-wide">
                        Standard Library NUSANTARA (<code className="text-cyan-400 font-mono">stdlib</code>)
                      </h2>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        v0.17.0 Resmi
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Kumpulan 8 modul resmi bawaan bahasa NUSANTARA: <code className="text-cyan-300">teks</code>, <code className="text-cyan-300">matematika</code>, <code className="text-cyan-300">konversi</code>, <code className="text-cyan-300">waktu</code>, <code className="text-cyan-300">acak</code>, <code className="text-cyan-300">koleksi</code>, <code className="text-cyan-300">berkas</code> (Sandbox), dan <code className="text-cyan-300">sistem</code>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiPustakaStandar\n\ngunakan "teks" sebagai teks\ngunakan "matematika" sebagai mtk\ngunakan "waktu" sebagai waktu\ngunakan "acak" sebagai acak\ngunakan "koleksi" sebagai kol\ngunakan "sistem" sebagai sys\n\nmulai\n    tampilkan("=== PUSTAKA STANDAR NUSANTARA (v0.17.0) ===")\n    tampilkan("Versi Sistem:", sys.versi())\n    tampilkan("Waktu Sekarang:", waktu.sekarang())\n    tampilkan("PI:", mtk.PI)\n    tampilkan("Teks Kapital:", teks.kapital("nusantara"))\n    tampilkan("Acak 1..100:", acak.bilangan(1, 100))\n    daftarUrut : daftar = kol.urutkan([40, 10, 30, 20])\n    tampilkan("Koleksi Terurut:", daftarUrut)\nselesai`
                      );
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/80 border border-cyan-800 hover:bg-cyan-900 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Muat Kode Demo di Editor</span>
                  </button>
                  <button
                    onClick={() => handleCopy('gunakan "matematika" sebagai mtk', 'copy-mtk')}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {copiedText === 'copy-mtk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Salin Sintaks Impor</span>
                  </button>
                </div>
              </div>

              {/* Ringkasan 4 Pilar Standard Library */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 font-medium">Jumlah Modul Resmi</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">8 Modul</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">teks, mtk, konv, wkt, acak, kol, berkas, sys</div>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 font-medium">Dukungan Sistem Tipe</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">100% Statis</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Validasi parameter &amp; kembalian</div>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 font-medium">Keamanan I/O Berkas</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">Sandbox Penuh</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Isolasi direktori &amp; anti-traversal</div>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 font-medium">Target Versi Bahasa</div>
                  <div className="text-xl font-bold text-indigo-400 mt-1">v0.17.0</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">22/22 Uji Lulus Otomatis</div>
                </div>
              </div>
            </div>

            {/* Grid 8 Modul Standar Resmi */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  Katalog 8 Modul Standar Resmi NUSANTARA
                </h3>
                <span className="text-xs text-slate-400 font-mono">Dapat diimpor langsung tanpa instalasi paket</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. TEKS */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-cyan-300">teks</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">9 Fungsi</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Manipulasi string: panjang, potong, gabung, cari, kapital, kecil, pangkas, berisi, ganti.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-cyan-400">teks.kapital</span>(s: teks) : teks</div>
                      <div><span className="text-cyan-400">teks.potong</span>(s, mulai, akhir)</div>
                      <div><span className="text-cyan-400">teks.cari</span>(s, target) : bilangan</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulTeks\ngunakan "teks" sebagai teks\n\nmulai\n    s : teks = "nusantara jaya"\n    tampilkan("Asli:", s)\n    tampilkan("Kapital:", teks.kapital(s))\n    tampilkan("Panjang:", teks.panjang(s))\n    tampilkan("Potongan (0..9):", teks.potong(s, 0, 9))\n    tampilkan("Berisi 'jaya':", teks.berisi(s, "jaya"))\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Teks
                  </button>
                </div>

                {/* 2. MATEMATIKA */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-emerald-300">matematika</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">8 Fn + PI/E</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Kalkulasi numerik: PI, E, absolut, bulat, lantai, plafon, pangkat, akar, min, maks.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-emerald-400">mtk.PI</span> : desimal</div>
                      <div><span className="text-emerald-400">mtk.pangkat</span>(a, b) : bilangan</div>
                      <div><span className="text-emerald-400">mtk.maksimum</span>(a, b) : numerik</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulMatematika\ngunakan "matematika" sebagai mtk\n\nmulai\n    tampilkan("Konstanta PI:", mtk.PI)\n    tampilkan("Konstanta E:", mtk.E)\n    tampilkan("Maksimum (45, 90):", mtk.maksimum(45, 90))\n    tampilkan("Pangkat 3^4:", mtk.pangkat(3, 4))\n    tampilkan("Akar 144:", mtk.akar(144))\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Matematika
                  </button>
                </div>

                {/* 3. KONVERSI */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-amber-300">konversi</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">5 Fungsi</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Konversi tipe data eksplisit dan aman: keTeks, keBilangan, keDesimal, keBulat, keLogika.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-amber-400">konv.keTeks</span>(val) : teks</div>
                      <div><span className="text-amber-400">konv.keBilangan</span>(s) : bilangan</div>
                      <div><span className="text-amber-400">konv.keBulat</span>(x) : bilangan</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulKonversi\nimpor { keTeks, keBilangan, keDesimal } dari "konversi"\n\nmulai\n    angka : bilangan = keBilangan("456")\n    des : desimal = keDesimal("3.14159")\n    tulisan : teks = keTeks(angka + 10)\n    tampilkan("Hasil konversi:", tulisan)\n    tampilkan("Desimal:", des)\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Konversi
                  </button>
                </div>

                {/* 4. WAKTU */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-indigo-300">waktu</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">7 Fungsi</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Akses waktu host: sekarang, tanggal, jam, menit, detik, timestamp ms, format.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-indigo-400">waktu.sekarang</span>() : teks</div>
                      <div><span className="text-indigo-400">waktu.tanggal</span>() : teks</div>
                      <div><span className="text-indigo-400">waktu.timestamp</span>() : bilangan</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulWaktu\ngunakan "waktu" sebagai wkt\n\nmulai\n    tampilkan("Waktu Sekarang:", wkt.sekarang())\n    tampilkan("Tanggal Sekarang:", wkt.tanggal())\n    tampilkan("Jam:", wkt.jam())\n    tampilkan("Timestamp (ms):", wkt.timestamp())\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Waktu
                  </button>
                </div>

                {/* 5. ACAK */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-purple-300">acak</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">3 Fungsi</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Pembangkit pseudorandom: desimal [0..1), bilangan rentang [min..maks], pilih acak daftar.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-purple-400">acak.desimal</span>() : desimal</div>
                      <div><span className="text-purple-400">acak.bilangan</span>(min, maks)</div>
                      <div><span className="text-purple-400">acak.pilih</span>(daftar) : apapun</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulAcak\ngunakan "acak" sebagai acak\n\nmulai\n    dadu : bilangan = acak.bilangan(1, 6)\n    tampilkan("Lemparan Dadu (1..6):", dadu)\n    warnaPilihan : teks = acak.pilih(["Merah", "Putih", "Emas"])\n    tampilkan("Warna Terpilih:", warnaPilihan)\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-purple-300 bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Acak
                  </button>
                </div>

                {/* 6. KOLEKSI */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-rose-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-rose-300">koleksi</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">8 Fungsi</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Operasi tingkat lanjut daftar &amp; peta: panjang, kosong, berisi, cari, balik, urutkan, gabung, iris.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-rose-400">kol.urutkan</span>(d: daftar) : daftar</div>
                      <div><span className="text-rose-400">kol.balik</span>(d: daftar) : daftar</div>
                      <div><span className="text-rose-400">kol.berisi</span>(d, item) : logika</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulKoleksi\ngunakan "koleksi" sebagai kol\n\nmulai\n    daftarAwal : daftar = [50, 10, 40, 20]\n    tampilkan("Asli:", daftarAwal)\n    tampilkan("Terurut:", kol.urutkan(daftarAwal))\n    tampilkan("Terbalik:", kol.balik(daftarAwal))\n    tampilkan("Ada 40?:", kol.berisi(daftarAwal, 40))\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Koleksi
                  </button>
                </div>

                {/* 7. BERKAS (SANDBOX) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-yellow-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-yellow-300">berkas</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Sandbox 8 Fn</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      I/O teks terisolasi sandbox: ada, baca, tulis, tambah, ukuran, buatDirektori, daftarDirektori.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-yellow-400">file.tulis</span>(jalur, isi) : logika</div>
                      <div><span className="text-yellow-400">file.baca</span>(jalur) : teks</div>
                      <div><span className="text-yellow-400">file.ukuran</span>(jalur) : bilangan</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulBerkas\ngunakan "berkas" sebagai file\n\nmulai\n    file.tulis("catatan.txt", "Pustaka Standar NUSANTARA Berhasil Terpasang")\n    file.tambah("catatan.txt", "\\nStatus: Stabil dan Aman")\n    tampilkan("Isi berkas:", file.baca("catatan.txt"))\n    tampilkan("Ukuran (byte):", file.ukuran("catatan.txt"))\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-yellow-300 bg-yellow-950/60 hover:bg-yellow-900 border border-yellow-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Berkas
                  </button>
                </div>

                {/* 8. SISTEM */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-mono font-bold text-sm text-blue-300">sistem</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">7 Fn + VERSI</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Lingkungan runtime: VERSI, versi, platform, arsitektur, argumen, ambilEnv, waktuOperasi, keluar.
                    </p>
                    <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div><span className="text-blue-400">sys.VERSI</span> : teks</div>
                      <div><span className="text-blue-400">sys.platform</span>() : teks</div>
                      <div><span className="text-blue-400">sys.argumen</span>() : daftar</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPlaygroundCode(
                        `program UjiModulSistem\ngunakan "sistem" sebagai sys\n\nmulai\n    tampilkan("Versi Resmi:", sys.versi())\n    tampilkan("Platform Host:", sys.platform())\n    tampilkan("Arsitektur CPU:", sys.arsitektur())\n    tampilkan("Waktu Operasi (detik):", sys.waktuOperasi())\nselesai`
                      );
                    }}
                    className="w-full py-1.5 text-xs font-medium text-blue-300 bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Buka Contoh Sistem
                  </button>
                </div>
              </div>
            </div>

            {/* Arsitektur Sandbox & Keamanan Filesystem */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Arsitektur Keamanan Filesystem Sandbox NUSANTARA
                  </h3>
                  <p className="text-xs text-slate-400">
                    Modul berkas dirancang aman dengan perlindungan isolasi jalur dan pencegahan path traversal.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pembatasan Direktori Basis</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Setiap operasi berkas dikunci ke direktori proyek lokal. Akses di luar batas proyek secara otomatis dinormalisasi atau ditolak.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pencegahan Serangan Traversal</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Eskalasi jalur melalui segmen berulang <code className="text-rose-400">../</code> dibatasi ketat dan memicu galat runtime keamanan.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Proteksi Berkas Kritis Host</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Daftar hitam berkas sensitif (<code className="text-amber-300">/etc/shadow</code>, <code className="text-amber-300">.env</code>, konfigurasi OS) diblokir secara preventif.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 0: PACKAGE MANAGER NUSANTARA (PHASE 16) */}
        {activeTab === 'paket' && (
          <div className="space-y-6">
            {/* Header Ringkasan Paket */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white tracking-wide">
                        Package Manager NUSANTARA (<code className="text-amber-400 font-mono">nusantara</code>)
                      </h2>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        v0.16.0 Resmi
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Fondasi manajemen dependensi, manifest <code className="text-rose-300">nusantara.toml</code>, berkas kunci reproduktif <code className="text-emerald-300">nusantara.lock</code>, dan integrasi modul langsung.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab('struktur-data')}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Code2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Buka Editor Kode</span>
                  </button>
                  <button
                    onClick={() => handleCopy('nusantara pasang', 'cli-pasang')}
                    className="px-3.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/80 border border-amber-800 hover:bg-amber-900 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {copiedText === 'cli-pasang' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-amber-400" />}
                    <span>nusantara pasang</span>
                  </button>
                </div>
              </div>

              {/* Status Keamanan & Fondasi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-xs">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-slate-400 text-[11px]">Siklus Dependensi</div>
                  <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Bebas Siklus (DFS)
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-slate-400 text-[11px]">Resolusi Versi</div>
                  <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SemVer 2.0.0 Terpenuhi
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-slate-400 text-[11px]">Integritas Paket</div>
                  <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SHA-256 Checksum
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-slate-400 text-[11px]">Keamanan Jalur</div>
                  <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Anti-Path Traversal
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal CLI Interaktif */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Simulator Terminal Baris Perintah: <code className="text-amber-400 font-mono">nusantara</code>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Perintah Cepat:</span>
                  <button
                    onClick={() => handleRunCli('info')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    nusantara info
                  </button>
                  <button
                    onClick={() => handleRunCli('daftar')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    nusantara daftar
                  </button>
                  <button
                    onClick={() => handleRunCli('pasang')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-amber-950/70 hover:bg-amber-900 text-amber-300 rounded border border-amber-800 transition-colors cursor-pointer"
                  >
                    nusantara pasang
                  </button>
                  <button
                    onClick={() => handleRunCli('pasang --terkunci')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    --terkunci
                  </button>
                  <button
                    onClick={() => handleRunCli('perbarui')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    nusantara perbarui
                  </button>
                  <button
                    onClick={() => handleRunCli('buat projek_baru')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    nusantara buat
                  </button>
                  <button
                    onClick={() => handleRunCli('bantuan')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
                  >
                    nusantara bantuan
                  </button>
                </div>
              </div>

              {/* Layar Terminal */}
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-200 h-64 overflow-y-auto border border-slate-800/80 space-y-3 shadow-inner">
                {cliHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-amber-400 flex items-center gap-1 font-semibold">
                      <span>$</span>
                      <span>{item.cmd}</span>
                    </div>
                    <div
                      className={`whitespace-pre-wrap pl-3 leading-relaxed ${
                        item.success ? 'text-slate-300' : 'text-rose-400 font-semibold'
                      }`}
                    >
                      {item.out.join('\n')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Baris Perintah */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleRunCli(cliInput);
                }}
                className="mt-3 flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-amber-400 font-mono text-xs font-bold">$ nusantara</span>
                  <input
                    type="text"
                    value={cliInput}
                    onChange={e => setCliInput(e.target.value)}
                    placeholder="pasang | daftar | info | buat <nama> | hapus <nama> | perbarui | bantuan"
                    className="w-full pl-28 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors cursor-pointer shadow-md"
                >
                  Jalankan
                </button>
              </form>
            </div>

            {/* Kartu Berkas: nusantara.toml & nusantara.lock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manifest nusantara.toml */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-slate-200 font-mono">nusantara.toml</span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-semibold border border-rose-500/30">
                      Manifest Resmi
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(
                        `[nusantara]\nnama = "aplikasi_contoh"\nversi = "1.0.0"\ndeskripsi = "Proyek percontohan ekosistem package manager NUSANTARA"\nlisensi = "Apache-2.0"\npenulis = "Tim Nusantara"\n\n[dependensi]\nmatematika = "^1.2.0"\ngeometri = "0.5.0"`,
                        'toml-code'
                      )
                    }
                    className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                    title="Salin TOML"
                  >
                    {copiedText === 'toml-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto flex-1 border border-slate-800/80 leading-relaxed">
                  <span className="text-amber-400 font-bold">[nusantara]</span><br />
                  <span className="text-slate-400">nama</span> = <span className="text-emerald-300">"aplikasi_contoh"</span><br />
                  <span className="text-slate-400">versi</span> = <span className="text-emerald-300">"1.0.0"</span><br />
                  <span className="text-slate-400">deskripsi</span> = <span className="text-emerald-300">"Proyek percontohan ekosistem package manager NUSANTARA"</span><br />
                  <span className="text-slate-400">lisensi</span> = <span className="text-emerald-300">"Apache-2.0"</span><br />
                  <span className="text-slate-400">penulis</span> = <span className="text-emerald-300">"Tim Nusantara"</span><br /><br />
                  <span className="text-amber-400 font-bold">[dependensi]</span><br />
                  <span className="text-slate-400">matematika</span> = <span className="text-cyan-300">"^1.2.0"</span><br />
                  <span className="text-slate-400">geometri</span> = <span className="text-cyan-300">"0.5.0"</span>
                </div>
              </div>

              {/* Lockfile nusantara.lock */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 font-mono">nusantara.lock</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                      Berkas Kunci
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(
                        `# Berkas Kunci Dependensi NUSANTARA (nusantara.lock)\nversi_format = 1\n\n[[paket]]\nnama = "matematika"\nversi = "1.2.3"\nsumber = "registri:matematika@1.2.3"\nintegritas = "sha256-4b2a8f..."\n\n[[paket]]\nnama = "geometri"\nversi = "0.5.0"\nsumber = "registri:geometri@0.5.0"\nintegritas = "sha256-9e1c3d..."`,
                        'lock-code'
                      )
                    }
                    className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                    title="Salin Lockfile"
                  >
                    {copiedText === 'lock-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto flex-1 border border-slate-800/80 leading-relaxed">
                  <span className="text-slate-500"># Berkas Kunci Dependensi NUSANTARA</span><br />
                  <span className="text-slate-500"># Dihasilkan otomatis oleh 'nusantara pasang'</span><br /><br />
                  <span className="text-slate-400">versi_format</span> = <span className="text-amber-300">1</span><br /><br />
                  <span className="text-purple-400 font-bold">[[paket]]</span><br />
                  <span className="text-slate-400">nama</span> = <span className="text-emerald-300">"matematika"</span><br />
                  <span className="text-slate-400">versi</span> = <span className="text-emerald-300">"1.2.3"</span><br />
                  <span className="text-slate-400">sumber</span> = <span className="text-cyan-300">"registri:matematika@1.2.3"</span><br />
                  <span className="text-slate-400">integritas</span> = <span className="text-amber-200">"sha256-4b2a8f90c..."</span><br /><br />
                  <span className="text-purple-400 font-bold">[[paket]]</span><br />
                  <span className="text-slate-400">nama</span> = <span className="text-emerald-300">"geometri"</span><br />
                  <span className="text-slate-400">versi</span> = <span className="text-emerald-300">"0.5.0"</span><br />
                  <span className="text-slate-400">sumber</span> = <span className="text-cyan-300">"registri:geometri@0.5.0"</span><br />
                  <span className="text-slate-400">integritas</span> = <span className="text-amber-200">"sha256-9e1c3d11b..."</span>
                </div>
              </div>
            </div>

            {/* Pohon Graf Dependensi & Verifikasi Uji */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Graf Dependensi &amp; Rekapitulasi Rangkaian Uji (Phase 16)
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  31 Pengujian LULUS 100%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-amber-400" />
                    Struktur Dependensi Fisik
                  </div>
                  <pre className="font-mono text-[11px] text-slate-400 leading-relaxed">
{`proyek/
├── nusantara.toml
├── nusantara.lock
├── src/
│   └── utama.nusantara
└── .nusantara/
    └── paket/
        ├── matematika/ (1.2.3)
        └── geometri/   (0.5.0)`}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Validasi Keamanan &amp; Siklus
                  </div>
                  <ul className="space-y-1.5 text-slate-400">
                    <li className="flex items-center gap-1.5 text-emerald-300">
                      <Check className="w-3.5 h-3.5" /> Deteksi Siklus Melingkar (DFS)
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-300">
                      <Check className="w-3.5 h-3.5" /> Validasi Konflik Versi (SemVer)
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-300">
                      <Check className="w-3.5 h-3.5" /> Isolasi Path Traversal (..)
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-300">
                      <Check className="w-3.5 h-3.5" /> Tanpa Script Instalasi Sembarangan
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Integrasi Modul (Phase 15 + 16)
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Setelah paket dipasang, <code className="text-slate-200">ResolverModul</code> secara otomatis menemukan berkas di <code className="text-amber-300">.nusantara/paket/</code> tanpa modul loader kedua. Kode program dapat langsung menggunakan instruksi <code className="text-cyan-300">gunakan &lt;paket&gt;</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: PLAYGROUND INTERAKTIF (STRUKTUR DATA, FUNGSI, PERULANGAN, PERCABANGAN, TIPE) */}
        {(activeTab === 'struktur-data' || activeTab === 'fungsi' || activeTab === 'perulangan' || activeTab === 'percabangan' || activeTab === 'tipe') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Editor Kode Sumber */}
              <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-[700px]">
                <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Editor Interaktif .nusantara
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() =>
                        setPlaygroundCode(
                          `program DemonstrasiDaftar\nmulai\n    // Koleksi terurut terindeks (0-indexed)\n    angka : daftar = [10, 20, 30, 40]\n    tampilkan("Elemen awal:", angka)\n    tampilkan("angka[0] =", angka[0])\n    tampilkan("angka[3] =", angka[3])\n    angka[1] = 99\n    tampilkan("Setelah mutasi angka[1] = 99:", angka)\n    tampilkan("Panjang daftar:", panjang(angka))\nselesai`
                        )
                      }
                      className="px-2 py-1 text-[11px] font-medium bg-rose-950/70 text-rose-300 hover:text-white border border-rose-800/60 rounded transition-colors cursor-pointer"
                    >
                      Daftar &amp; Mutasi
                    </button>

                    <button
                      onClick={() =>
                        setPlaygroundCode(
                          `program DemonstrasiPeta\nmulai\n    // Koleksi asosiatif kunci-nilai\n    siswa : peta = {"nama": "Ayu", "umur": 20, "jurusan": "Informatika"}\n    tampilkan("Nama siswa:", siswa["nama"])\n    tampilkan("Umur siswa:", siswa["umur"])\n\n    // Mutasi dan penambahan kunci baru\n    siswa["umur"] = 21\n    siswa["kota"] = "Bandung"\n    tampilkan("Peta setelah diperbarui:", siswa)\n    tampilkan("Jumlah entri:", panjang(siswa))\nselesai`
                        )
                      }
                      className="px-2 py-1 text-[11px] font-medium bg-amber-950/70 text-amber-300 hover:text-white border border-amber-800/60 rounded transition-colors cursor-pointer"
                    >
                      Peta &amp; Kunci
                    </button>

                    <button
                      onClick={() =>
                        setPlaygroundCode(
                          `program FungsiDanKoleksi\n\nfungsi hitungTotal(data : daftar) : bilangan\nmulai\n    total : bilangan = 0\n    n : bilangan = panjang(data)\n    untuk i dari 0 sampai n - 1 lakukan\n        total = total + data[i]\n    akhir\n    kembalikan total\nselesai\n\nmulai\n    skor : daftar = [10, 20, 30, 40]\n    hasil : bilangan = hitungTotal(skor)\n    tampilkan("Total skor daftar:", hasil)\nselesai`
                        )
                      }
                      className="px-2 py-1 text-[11px] font-medium bg-indigo-950/70 text-indigo-300 hover:text-white border border-indigo-800/60 rounded transition-colors cursor-pointer"
                    >
                      Fungsi &amp; Daftar
                    </button>

                    <button
                      onClick={() =>
                        setPlaygroundCode(
                          `program RekursiFaktorial\n\nfungsi faktorial(n : bilangan) : bilangan\nmulai\n    jika n <= 1 maka\n        kembalikan 1\n    akhir\n    kembalikan n * faktorial(n - 1)\nselesai\n\nmulai\n    untuk i dari 1 sampai 6 lakukan\n        tampilkan("Faktorial " + i + " = " + faktorial(i))\n    akhir\nselesai`
                        )
                      }
                      className="px-2 py-1 text-[11px] font-medium bg-purple-950/70 text-purple-300 hover:text-white border border-purple-800/60 rounded transition-colors cursor-pointer"
                    >
                      Rekursi
                    </button>

                    <button
                      onClick={() =>
                        setPlaygroundCode(
                          `program DemonstrasiPaketModul\n\n// Menggunakan dependensi paket yang terpasang di .nusantara/paket/\ngunakan matematika\ngunakan geometri\n\nvariabel luas : bilangan = geometri.luasPersegi(15)\nvariabel kali : bilangan = matematika.kali(10, 20)\nvariabel kuadrat : bilangan = matematika.kuadrat(8)\n\nmulai\n    tampilkan("Luas Persegi (geometri):", luas)\n    tampilkan("Hasil Kali (matematika):", kali)\n    tampilkan("Hasil Kuadrat (matematika):", kuadrat)\n    tampilkan("Status: Paket berhasil dimuat dari .nusantara/paket/!")\nselesai`
                        )
                      }
                      className="px-2 py-1 text-[11px] font-medium bg-amber-950/70 text-amber-300 hover:text-white border border-amber-800/60 rounded transition-colors cursor-pointer"
                    >
                      Paket &amp; Modul (P16)
                    </button>

                    <button
                      onClick={() =>
                        setPlaygroundCode(
                          `program DemonstrasiStandardLibrary\n\n// Memuat modul pustaka standar resmi NUSANTARA (Phase 17)\ngunakan "teks" sebagai teks\ngunakan "matematika" sebagai mtk\ngunakan "waktu" sebagai waktu\ngunakan "acak" sebagai acak\ngunakan "koleksi" sebagai kol\ngunakan "sistem" sebagai sys\n\nmulai\n    tampilkan("=== STANDARD LIBRARY NUSANTARA (v0.17.0) ===")\n    \n    // 1. Modul teks\n    kata : teks = teks.kapital("nusantara")\n    tampilkan("Modul teks (kapital):", kata)\n    tampilkan("Modul teks (potong):", teks.potong(kata, 0, 4))\n    \n    // 2. Modul matematika\n    tampilkan("Modul mtk (PI):", mtk.PI)\n    tampilkan("Modul mtk (maksimum 42, 100):", mtk.maksimum(42, 100))\n    tampilkan("Modul mtk (pangkat 2^8):", mtk.pangkat(2, 8))\n    \n    // 3. Modul waktu & sistem\n    tampilkan("Waktu Sekarang:", waktu.sekarang())\n    tampilkan("Versi Bahasa:", sys.versi())\n    tampilkan("Platform Host:", sys.platform())\n    \n    // 4. Modul koleksi & acak\n    daftarAngka : daftar = [50, 10, 40, 20]\n    tampilkan("Koleksi Terurut:", kol.urutkan(daftarAngka))\n    tampilkan("Bilangan Acak (1-100):", acak.bilangan(1, 100))\nselesai`
                        )
                      }
                      className="px-2 py-1 text-[11px] font-medium bg-cyan-950/70 text-cyan-300 hover:text-white border border-cyan-800/60 rounded transition-colors cursor-pointer"
                    >
                      Stdlib (P17)
                    </button>
                  </div>
                </div>

                <textarea
                  value={playgroundCode}
                  onChange={e => setPlaygroundCode(e.target.value)}
                  className="flex-1 w-full bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm p-4 rounded-lg border border-slate-800 focus:outline-none focus:border-rose-500/60 resize-none leading-relaxed"
                  placeholder="Ketik kode NUSANTARA di sini..."
                  spellCheck={false}
                />

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>{playgroundCode.split('\n').length} baris kode</span>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>Evaluasi otomatis saat mengetik</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Luaran Program Real-time */}
              <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-[700px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Terminal Keluaran Eksekusi
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(runOutput.join('\n'), 'terminal')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedText === 'terminal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'terminal' ? 'Tersalin' : 'Salin Luaran'}</span>
                  </button>
                </div>

                {/* Galat Parser jika ada */}
                {parserErrors.length > 0 && (
                  <div className="mb-3 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-mono space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Galat Sintaksis (Parser):
                    </div>
                    {parserErrors.map((err, idx) => (
                      <div key={idx} className="text-[11px] pl-5">
                        • {err.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Galat Tipe Statis jika ada */}
                {typeErrors.length > 0 && (
                  <div className="mb-3 p-3 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-200 text-xs font-mono space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-purple-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Galat Sistem Tipe (Type Checker):
                    </div>
                    {typeErrors.map((err, idx) => (
                      <div key={idx} className="text-[11px] pl-5">
                        • {err.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Galat Runtime jika ada */}
                {runtimeError && (
                  <div className="mb-3 p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Galat Eksekusi Runtime:
                    </div>
                    <div className="text-[11px] pl-5">• {runtimeError}</div>
                  </div>
                )}

                {/* Layar Output Bersih */}
                <div className="flex-1 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs sm:text-sm overflow-auto text-emerald-400 space-y-1 leading-relaxed">
                  <div className="text-slate-500 text-xs pb-2 border-b border-slate-800 flex items-center justify-between">
                    <span>--- HASIL EKSEKUSI PROGRAM ---</span>
                    <span>{runOutput.length} Baris Output</span>
                  </div>

                  {runOutput.length === 0 && !runtimeError ? (
                    <div className="text-slate-600 italic py-4 text-center">
                      (Program dieksekusi tanpa menghasilkan output teks)
                    </div>
                  ) : (
                    runOutput.map((line, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-600 select-none w-6 text-right">{idx + 1}</span>
                        <span>{line}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Interpreter AST Aktif</span>
                  </div>
                  <span className="font-mono text-rose-400">daftar · peta · indeks · panjang</span>
                </div>
              </div>
            </div>

            {/* Referensi Cepat Sintaks Struktur Data */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-rose-400" />
                <span>Referensi Singkat Sintaks Struktur Data NUSANTARA (Phase 14)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800">
                  <div className="font-bold text-rose-300 mb-2 font-mono">1. Koleksi Daftar (0-Indexed)</div>
                  <pre className="text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`angka : daftar = [10, 20, 30]
pertama = angka[0]   // 10
angka[1] = 99        // [10, 99, 30]
matriks = [[1, 2], [3, 4]]`}
                  </pre>
                  <p className="mt-2 text-slate-400 text-[11px]">
                    Koleksi berurutan dinamis berbasis indeks 0. Akses di luar batas memicu <code className="text-rose-300">BATAS_INDEKS_TERLAMPAUI</code>.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800">
                  <div className="font-bold text-amber-300 mb-2 font-mono">2. Koleksi Peta (Asosiatif)</div>
                  <pre className="text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`siswa : peta = {"nama": "Ayu", "umur": 20}
tampilkan(siswa["nama"])
siswa["umur"] = 21
siswa["asal"] = "Nusantara"`}
                  </pre>
                  <p className="mt-2 text-slate-400 text-[11px]">
                    Pasangan kunci-nilai teks. Memperbarui kunci yang ada atau menambahkan entri baru. Kunci hilang memicu <code className="text-amber-300">KUNCI_TIDAK_DITEMUKAN</code>.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800">
                  <div className="font-bold text-cyan-300 mb-2 font-mono">3. Fungsi panjang() &amp; Aturan tetap</div>
                  <pre className="text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`n : bilangan = panjang(angka)
tetap konstan : daftar = [1, 2]
// konstan[0] = 5 // DITOLAK
// [1, 2] == [1, 2] // benar`}
                  </pre>
                  <p className="mt-2 text-slate-400 text-[11px]">
                    Fungsi bawaan <code className="text-cyan-300">panjang()</code> mengukur elemen, operator <code className="text-indigo-300">==</code> membandingkan rekursif mendalam, dan variabel <code className="text-emerald-300">tetap</code> dilindungi dari mutasi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POHON AST */}
        {activeTab === 'ast' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Visualisasi Pohon Sintaksis Abstrak (AST)</h2>
              </div>
              <button
                onClick={() => handleCopy(astString, 'ast')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedText === 'ast' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText === 'ast' ? 'Tersalin' : 'Salin Teks AST'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 overflow-auto max-h-[600px] leading-relaxed">
              {astString || '// AST tidak tersedia karena terdapat galat sintaksis.'}
            </pre>
          </div>
        )}

        {/* TAB 3: TOKEN LEXER */}
        {activeTab === 'token' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Daftar Token Leksikal ({tokens.length} Token)</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Jenis Token</th>
                    <th className="py-2.5 px-3">Nilai (Lexeme)</th>
                    <th className="py-2.5 px-3">Lokasi (Baris : Kolom)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tokens.map((tok, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 text-teal-300 font-semibold">{tok.jenis}</td>
                      <td className="py-2 px-3 text-amber-200">
                        {tok.nilai === '\n' ? '\\n' : JSON.stringify(tok.nilai)}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {tok.baris}:{tok.kolom}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TABEL OPERATOR */}
        {activeTab === 'operator' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Tabel 8 Tingkat Presedensi &amp; Asosiatif Operator NUSANTARA</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                    <th className="py-3 px-4 font-semibold">Tingkat</th>
                    <th className="py-3 px-4 font-semibold">Simbol</th>
                    <th className="py-3 px-4 font-semibold">Nama / Klasifikasi</th>
                    <th className="py-3 px-4 font-semibold">Arah Asosiatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {DAFTAR_PRESEDENSI_OPERATOR.map(op => (
                    <tr key={op.tingkat} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">{op.tingkat}</td>
                      <td className="py-3 px-4 font-mono text-emerald-300 font-bold">{op.simbol}</td>
                      <td className="py-3 px-4 text-slate-200">{op.nama}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{op.asosiasi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TABEL SISTEM TIPE */}
        {activeTab === 'tipe' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Matriks Taksonomi Tipe Data Resmi NUSANTARA (Phase 9 &amp; 14)</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                    <th className="py-3 px-4 font-semibold">Nama Tipe</th>
                    <th className="py-3 px-4 font-semibold">Klasifikasi</th>
                    <th className="py-3 px-4 font-semibold">Contoh Nilai</th>
                    <th className="py-3 px-4 font-semibold">Status Kesiapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {DAFTAR_TIPE_MATRIKS_PHASE9.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">{item.tipe}</td>
                      <td className="py-3 px-4 text-slate-300">{item.kategori}</td>
                      <td className="py-3 px-4 font-mono text-emerald-300">{item.contoh}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.status === 'Lengkap' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: PANDUAN & GLOSARIUM */}
        {activeTab === 'panduan' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DAFTAR_GLOSARIUM.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-rose-300 font-mono text-sm">{item.lokal}</span>
                    <span className="text-xs text-slate-500 italic">({item.asing})</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.ket}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: BERKAS REPOSITORI */}
        {activeTab === 'berkas' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-[700px]">
              <div className="pb-3 mb-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Filter Kategori
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {kategoriBerkas.map((kat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveFilterCategory(kat)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        activeFilterCategory === kat ? 'bg-rose-600 text-white font-semibold' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {berkasTerfilter.map((berkas, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedFile(berkas)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      selectedFile.jalur === berkas.jalur
                        ? 'bg-rose-950/80 border border-rose-800 text-rose-200 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{berkas.nama}</div>
                      <div className="text-[10px] text-slate-500 truncate">{berkas.jalur}</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 font-mono">
                      {berkas.bahasa}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-8 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-[700px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedFile.nama}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedFile.jalur}</p>
                </div>

                <button
                  onClick={() => handleCopy(selectedFile.konten, 'berkas')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedText === 'berkas' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'berkas' ? 'Tersalin' : 'Salin Isi'}</span>
                </button>
              </div>

              <pre className="flex-1 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 overflow-auto whitespace-pre-wrap leading-relaxed">
                {selectedFile.konten}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 8: ROADMAP 36 FASE */}
        {activeTab === 'roadmap' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">Peta Jalan (Roadmap) 36 Fase NUSANTARA</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Milestone Aktif: Phase 14 (v0.14.0)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                    <th className="py-2.5 px-3">Fase</th>
                    <th className="py-2.5 px-3">Nama Milestone</th>
                    <th className="py-2.5 px-3">Target Versi</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {DAFTAR_FASE_ROADMAP.map(item => (
                    <tr
                      key={item.fase}
                      className={item.fase === 14 ? 'bg-rose-950/30' : 'hover:bg-slate-900/40'}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">Phase {item.fase}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">{item.nama}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{item.versi}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.kategori}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.status === 'Selesai'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : item.status === 'Berikutnya'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 4. FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>NUSANTARA Programming Language · Phase 16 (v0.16.0)</span>
          </div>
          <div>Dilindungi di bawah Lisensi Apache 2.0</div>
        </div>
      </footer>
    </div>
  );
}
