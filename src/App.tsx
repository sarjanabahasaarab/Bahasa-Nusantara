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
  Boxes
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'struktur-data' | 'fungsi' | 'perulangan' | 'percabangan' | 'operator' | 'tipe' | 'ast' | 'token' | 'panduan' | 'berkas' | 'roadmap' | 'git'>('struktur-data');
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

  // 1. Eksekusi Lexer
  const { tokens } = useMemo(() => {
    const l = new Lexer(playgroundCode, { sertakanBarisBaru: false });
    const { token } = l.tokenisasi();
    return { tokens: token };
  }, [playgroundCode]);

  // 2. Eksekusi Parser (Phase 7-14)
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

  // 3. Eksekusi Type Checker (Phase 9-14)
  const { typeErrors } = useMemo(() => {
    if (!ast) return { typeErrors: [] };
    const checker = new PemeriksaTipe();
    return { typeErrors: checker.periksa(ast) };
  }, [ast]);

  // 4. Eksekusi Interpreter (Phase 8-14)
  const { runOutput, runtimeError } = useMemo(() => {
    try {
      const buffer = new PenulisOutputBuffer();
      const interp = new Interpreter(buffer);
      interp.jalankanKode(playgroundCode);
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
  }, [playgroundCode]);

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
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Phase 14
                </span>
              </div>
              <p className="text-xs text-slate-400">Bahasa Pemrograman Indonesia</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
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
              onClick={() => handleCopy('git commit -m "feat: implement nusantara data structures"', 'commit-p14')}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {copiedText === 'commit-p14' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedText === 'commit-p14' ? 'Tersalin' : 'Salin Pesan Komit'}</span>
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-white bg-rose-700/80 rounded-lg whitespace-nowrap border border-rose-500/40">
              v0.14.0
            </span>
          </div>
        </div>
      </header>

      {/* 2. HERO STATEMENT & METADATA */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-4 tracking-wide font-mono">
            <span className="text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">Milestone v0.14.0</span>
            <span aria-hidden="true">·</span>
            <span className="text-white font-medium">Phase 14: Struktur Data (Daftar &amp; Peta) NUSANTARA</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-300 font-mono">daftar · peta · indeks [0] · mutasi · panjang · kesetaraan ==</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">154 Berkas Valid (216 Uji Lulus 100%)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-4xl leading-tight">
            Struktur Data Dasar: Koleksi <span className="text-rose-400 font-mono">daftar</span> &amp; <span className="text-amber-400 font-mono">peta</span> Terintegrasi.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
            Bahasa pemrograman NUSANTARA kini mendukung koleksi data berurutan terindeks (<code className="text-rose-300 font-mono font-semibold">daftar</code>) berbasis 0, koleksi pasangan kunci-nilai (<code className="text-amber-300 font-mono font-semibold">peta</code>), mutasi elemen, perlindungan mutabilitas konstanta <code className="text-emerald-300 font-mono font-semibold">tetap</code>, fungsi bawaan <code className="text-cyan-300 font-mono font-semibold">panjang()</code>, serta kesetaraan struktural mendalam (<code className="text-indigo-300 font-mono font-semibold">==</code>).
          </p>

          <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 max-w-3xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-rose-300">Pipa Kompilasi Lengkap:</span> Kode sumber NUSANTARA melewati tahapan Lexer ➔ Parser (AST NodeLiteralDaftar, NodeLiteralPeta, NodeAksesIndeks, NodePenugasanIndeks) ➔ Pemeriksa Tipe (Validasi indeks bulat, kunci teks, perlindungan tetap) ➔ Interpreter dengan semantik referensi, batas indeks aman, dan rekursi deep equality.
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6 overflow-x-auto text-sm">
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
            <span>Berkas Repositori (154)</span>
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
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>NUSANTARA Programming Language · Phase 14 (v0.14.0)</span>
          </div>
          <div>Dilindungi di bawah Lisensi Apache 2.0</div>
        </div>
      </footer>
    </div>
  );
}
