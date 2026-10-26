/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Komponen Studio Ekosistem Paket & Registri NUSANTARA (Phase 22)
 * Target Versi: v0.22.0
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Terminal,
  Layers,
  ShieldCheck,
  Download,
  Upload,
  BookOpen,
  Boxes,
  Copy,
  Check,
  Play,
  RotateCcw,
  GitBranch,
  Database,
  Lock,
  RefreshCw,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  PengelolaPaket,
  NusantaraCLI,
  RegistriLokal,
  ValidatorPaket,
  buatArsipPaket,
  uraiArsipPaket,
  buatManifestAwal,
  tulisManifest,
} from '../paket';
import { PembacaBerkasMemori } from '../modul';

export function StudioEkosistemPaket() {
  const [subTab, setSubTab] = useState<'katalog' | 'validator' | 'arsip' | 'dependensi' | 'cache' | 'cli'>('dependensi');
  const [kueriCari, setKueriCari] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [namaDepInput, setNamaDepInput] = useState('matematika-ekstra');
  const [versiDepInput, setVersiDepInput] = useState('^1.0.0');
  const [apakahTerkunci, setApakahTerkunci] = useState(false);
  const [laporanAudit, setLaporanAudit] = useState<any>(null);
  const [renderCounter, setRenderCounter] = useState(0);

  // Inisialisasi memori filesystem dan registri lokal terpadu
  const { memori, registri, pengelola, cli } = useMemo(() => {
    const mem = new PembacaBerkasMemori();
    const reg = new RegistriLokal({
      pembacaBerkas: mem,
      direktoriBasis: '/registri-resmi',
    });

    // Seed official packages
    const m1 = buatManifestAwal('matematika-ekstra', {
      versi: '1.0.0',
      deskripsi: 'Paket matematika ekstensi untuk kalkulasi aljabar dan numerik.',
      lisensi: 'MIT',
      penulis: 'Tim Pengembang Nusantara',
    });
    m1.nusantara.kata_kunci = ['matematika', 'aljabar', 'numerik'];
    reg.terbitkan(
      buatArsipPaket(m1, {
        'nusantara.toml': tulisManifest(m1),
        'src/matematika-ekstra.nusantara':
          'fungsi kuadrat(x: bilangan): bilangan\nmulai\n    kembalikan x * x\nselesai\n',
        'README.md': '# matematika-ekstra\nPaket matematika tingkat lanjut.',
      })
    );

    const m2 = buatManifestAwal('utilitas-string', {
      versi: '1.0.0',
      deskripsi: 'Paket utilitas manipulasi teks dan string tingkat lanjut.',
      lisensi: 'Apache-2.0',
      penulis: 'Tim Komunitas Nusantara',
    });
    m2.nusantara.kata_kunci = ['string', 'teks', 'utilitas'];
    reg.terbitkan(
      buatArsipPaket(m2, {
        'nusantara.toml': tulisManifest(m2),
        'src/utilitas-string.nusantara':
          'fungsi bungkus_kutip(s: teks): teks\nmulai\n    kembalikan "\'" + s + "\'"\nselesai\n',
        'README.md': '# utilitas-string\nManipulasi teks.',
      })
    );

    const p = new PengelolaPaket({
      direktoriProyek: '/workspace/proyekku',
      pembacaBerkas: mem,
      registriLokal: reg,
    });

    mem.tulisBerkas(
      '/workspace/proyekku/nusantara.toml',
      `[nusantara]
nama = "proyekku"
versi = "0.1.0"
deskripsi = "Aplikasi utama"
lisensi = "MIT"

[dependensi]
`
    );

    const c = new NusantaraCLI({
      pembaca: mem,
      pengelola: p,
    });

    return { memori: mem, registri: reg, pengelola: p, cli: c };
  }, []);

  // Hasil pencarian registri
  const hasilKatalog = useMemo(() => {
    return registri.cari(kueriCari);
  }, [registri, kueriCari]);

  // State untuk Paket Validator Studio
  const [editorManifest, setEditorManifest] = useState(
    `[nusantara]
nama = "paket-kreatif"
versi = "1.0.0"
deskripsi = "Paket contoh baru untuk ekosistem NUSANTARA"
lisensi = "MIT"
penulis = "Developer Nusantara"
kata_kunci = ["utilitas", "demo"]

[dependensi]
`
  );

  const [editorKode, setEditorKode] = useState(
    `// Berkas: src/paket-kreatif.nusantara
fungsi sapa(nama: teks): teks
mulai
    kembalikan "Halo, " + nama + "!"
selesai
`
  );

  const [editorUji, setEditorUji] = useState(
    `// Berkas: tests/paket.uji.nusantara
pastikan_sama(1 + 1, 2)
pastikan_benar(benar)
`
  );

  const [laporanValidasi, setLaporanValidasi] = useState<any>(null);
  const [pesanAksi, setPesanAksi] = useState<{ tipe: 'sukses' | 'galat' | 'info'; teks: string } | null>(null);

  // State untuk CLI Terminal
  const [perintahInput, setPerintahInput] = useState('nusantara paket cari matematika');
  const [riwayatCLI, setRiwayatCLI] = useState<Array<{ cmd: string; out: string; status: number }>>([
    {
      cmd: 'nusantara versi',
      out: 'NUSANTARA Package Ecosystem & Registry, Testing Framework, Language Server & Toolchain (nusantara) v0.22.0 (fondasi v0.21.0, v0.20.0, v0.19.0)',
      status: 0,
    },
  ]);

  const handleCopy = (teks: string, label: string) => {
    navigator.clipboard?.writeText(teks);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const jalankanValidasi = () => {
    try {
      memori.tulisBerkas('/workspace/studio/nusantara.toml', editorManifest);
      memori.tulisBerkas('/workspace/studio/src/utama.nusantara', editorKode);
      memori.tulisBerkas('/workspace/studio/tests/uji.uji.nusantara', editorUji);
      memori.tulisBerkas('/workspace/studio/README.md', '# Paket Kreatif\nDokumentasi demo.');

      const validator = new ValidatorPaket(memori);
      const lap = validator.validasi('/workspace/studio');
      setLaporanValidasi(lap);
      if (lap.valid) {
        setPesanAksi({ tipe: 'sukses', teks: `Paket '${lap.nama}@${lap.versi}' memenuhi seluruh kriteria kelayakan rilis!` });
      } else {
        setPesanAksi({ tipe: 'galat', teks: `Validasi gagal dengan ${lap.daftarGalat.length} kesalahan.` });
      }
    } catch (err: any) {
      setPesanAksi({ tipe: 'galat', teks: `Kesalahan saat validasi: ${err.message}` });
    }
  };

  const bangunDanTerbitkan = () => {
    try {
      jalankanValidasi();
      const validator = new ValidatorPaket(memori);
      const lap = validator.validasi('/workspace/studio');
      if (!lap.valid) {
        setPesanAksi({ tipe: 'galat', teks: 'Tidak dapat menerbitkan: perbaiki kesalahan validasi terlebih dahulu.' });
        return;
      }

      const hasil = pengelola.terbitkan('/workspace/studio');
      setPesanAksi({
        tipe: 'sukses',
        teks: `Rilis Immutable Berhasil! Paket '${hasil.nama}@${hasil.versi}' tersimpan di registri dengan Checksum SHA-256: ${hasil.checksum.slice(0, 24)}...`,
      });
    } catch (err: any) {
      setPesanAksi({ tipe: 'galat', teks: err.message });
    }
  };

  const eksekusiCLI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!perintahInput.trim()) return;

    const baris = perintahInput.trim();
    const parts = baris.replace(/^nusantara\s+/, '').split(/\s+/);
    const logs: string[] = [];

    const simCLI = new NusantaraCLI({
      pembaca: memori,
      pengelola: pengelola,
      penulisLog: msg => logs.push(msg),
      penulisGalat: msg => logs.push(`[GALAT] ${msg}`),
    });

    const status = simCLI.jalankan(parts);
    setRiwayatCLI(prev => [
      ...prev,
      {
        cmd: baris,
        out: logs.join('\n') || (status === 0 ? '[Operasi selesai tanpa output]' : '[Operasi gagal]'),
        status,
      },
    ]);
  };

  const handleTambahDependensi = () => {
    try {
      const res = pengelola.tambah(namaDepInput, versiDepInput);
      setPesanAksi({ tipe: 'sukses', teks: res.pesan });
      setRenderCounter(c => c + 1);
    } catch (err: any) {
      setPesanAksi({ tipe: 'galat', teks: err.message });
    }
  };

  const handleHapusDependensi = (nama: string) => {
    try {
      const res = pengelola.hapus(nama);
      setPesanAksi({ tipe: 'sukses', teks: res.pesan });
      setRenderCounter(c => c + 1);
    } catch (err: any) {
      setPesanAksi({ tipe: 'galat', teks: err.message });
    }
  };

  const handlePasangDependensi = () => {
    try {
      const res = pengelola.pasang({ terkunci: apakahTerkunci });
      setPesanAksi({ tipe: 'sukses', teks: res.pesan });
      setRenderCounter(c => c + 1);
    } catch (err: any) {
      setPesanAksi({ tipe: 'galat', teks: err.message });
    }
  };

  const handleJalankanAudit = () => {
    try {
      const res = pengelola.audit();
      setLaporanAudit(res);
      if (res.aman) {
        setPesanAksi({ tipe: 'sukses', teks: 'Audit Keamanan & Integritas: SEMUA DEPENDENSI & LOCKFILE VALID!' });
      } else {
        setPesanAksi({ tipe: 'galat', teks: `Audit Keamanan: Ditemukan ${res.temuan.length} temuan!` });
      }
    } catch (err: any) {
      setPesanAksi({ tipe: 'galat', teks: err.message });
    }
  };

  const handleBersihkanCache = () => {
    try {
      const res = pengelola.bersihkanCache();
      setPesanAksi({ tipe: 'sukses', teks: res.pesan });
      setRenderCounter(c => c + 1);
    } catch (err: any) {
      setPesanAksi({ tipe: 'galat', teks: err.message });
    }
  };

  const daftarDependensiProyek = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = renderCounter;
    try {
      return pengelola.daftar();
    } catch {
      return [];
    }
  }, [pengelola, renderCounter]);

  const pohonDependensiTeks = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = renderCounter;
    try {
      return pengelola.dapatkanPohonDependensi();
    } catch (e: any) {
      return `(Gagal menghasilkan pohon: ${e.message})`;
    }
  }, [pengelola, renderCounter]);

  const entriCacheSemua = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = renderCounter;
    try {
      return pengelola.dapatkanManajerCache().dapatkanSemuaEntri();
    } catch {
      return [];
    }
  }, [pengelola, renderCounter]);

  const totalUkuranCacheByte = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = renderCounter;
    try {
      return pengelola.dapatkanManajerCache().hitungTotalUkuranCache();
    } catch {
      return 0;
    }
  }, [pengelola, renderCounter]);

  return (
    <div className="space-y-6">
      {/* 1. Header Ringkasan Ekosistem Paket & Registri */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Ekosistem Paket &amp; Dependency Management NUSANTARA
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  v0.27.0 Resmi
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sistem ekosistem paket dan resolusi dependensi profesional: manifest <code className="text-violet-300">nusantara.toml</code>, semver constraint, graph dependency resolver, lockfile <code className="text-violet-300">nusantara.lock</code>, cache offline terdistribusi, registri lokal, dan CLI.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-violet-950/60 border border-violet-800/80 text-violet-300 text-xs font-mono font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>nusantara pasang</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-violet-950/60 border border-violet-800/80 text-violet-300 text-xs font-mono font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>nusantara audit</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigasi Ekosistem */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-1 text-xs">
          <button
            onClick={() => setSubTab('dependensi')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'dependensi' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Pohon &amp; Manajemen Dependensi</span>
          </button>
          <button
            onClick={() => setSubTab('cache')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'cache' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sistem Cache Paket Offline</span>
          </button>
          <button
            onClick={() => setSubTab('katalog')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'katalog' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Katalog Registri &amp; Pencarian</span>
          </button>
          <button
            onClick={() => setSubTab('validator')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'validator' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Studio Validasi &amp; Penerbitan</span>
          </button>
          <button
            onClick={() => setSubTab('arsip')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'arsip' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Inspektur Bundle Arsip (.npk)</span>
          </button>
          <button
            onClick={() => setSubTab('cli')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'cli' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Simulasi Terminal Baris Perintah (CLI)</span>
          </button>
        </div>
      </div>

      {/* NOTIFIKASI PESAN AKSI */}
      {pesanAksi && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            pesanAksi.tipe === 'sukses'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : pesanAksi.tipe === 'galat'
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-blue-950/40 border-blue-800 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {pesanAksi.tipe === 'sukses' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {pesanAksi.tipe === 'galat' && <XCircle className="w-4 h-4 text-rose-400" />}
            {pesanAksi.tipe === 'info' && <AlertTriangle className="w-4 h-4 text-blue-400" />}
            <span className="font-medium">{pesanAksi.teks}</span>
          </div>
          <button
            onClick={() => setPesanAksi(null)}
            className="text-slate-400 hover:text-white cursor-pointer px-2 py-0.5 rounded text-[11px]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* SUB-TAB 1: POHON & MANAJEMEN DEPENDENSI (PHASE 27) */}
      {subTab === 'dependensi' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-violet-400" />
                  Manajemen Dependensi Proyek &amp; Graf Resolusi (Phase 27)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisasi graf pohon dependensi, deteksi siklus otomatis, audit konflik versi, dan lockfile reproduktif.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleJalankanAudit}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                  <span>Audit Keamanan &amp; Hash</span>
                </button>
                <button
                  onClick={handlePasangDependensi}
                  className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Pasang Semua Dependensi</span>
                </button>
              </div>
            </div>

            {/* Form Tambah Dependensi */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-violet-400" />
                Tambah Dependensi Baru (<code className="text-violet-300 font-mono">nusantara tambah &lt;nama&gt; [&lt;batasan&gt;]</code>)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-[11px] text-slate-400 mb-1">Nama Paket</label>
                  <input
                    type="text"
                    value={namaDepInput}
                    onChange={e => setNamaDepInput(e.target.value)}
                    placeholder="misal: matematika-ekstra"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">Batasan SemVer</label>
                  <input
                    type="text"
                    value={versiDepInput}
                    onChange={e => setVersiDepInput(e.target.value)}
                    placeholder="misal: ^1.0.0, ~1.2.0, *"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    onClick={handleTambahDependensi}
                    className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan &amp; Pasang</span>
                  </button>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="terkunciCheck"
                  checked={apakahTerkunci}
                  onChange={e => setApakahTerkunci(e.target.checked)}
                  className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="terkunciCheck" className="text-[11px] text-slate-400 flex items-center gap-1 cursor-pointer">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Mode Instalasi Terkunci Reproduktif (<code className="text-violet-300 font-mono">--terkunci</code>, verifikasi integritas lockfile)
                </label>
              </div>
            </div>

            {/* Grid 2 Kolom: Daftar Dependensi & Pohon Visual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kolom Kiri: Tabel Dependensi Proyek */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300">
                    Dependensi Terdaftar ({daftarDependensiProyek.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">nusantara.toml</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  {daftarDependensiProyek.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Belum ada dependensi. Tambahkan dependensi pertama Anda di atas.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80">
                      {daftarDependensiProyek.map(dep => (
                        <div key={dep.nama} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono">{dep.nama}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800/60 font-mono">
                                {dep.batasan}
                              </span>
                              {dep.terpasang && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                                  ✓ terpasang {dep.versiTerpasang ? `(v${dep.versiTerpasang})` : ''}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                              sumber: {dep.sumber}
                            </span>
                          </div>

                          <button
                            onClick={() => handleHapusDependensi(dep.nama)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition-colors cursor-pointer"
                            title={`Hapus ${dep.nama}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Pohon Visual Graf Dependensi */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                    Pohon Dependensi Konsol (<code className="text-emerald-300 font-mono">nusantara pohon</code>)
                  </h4>
                  <button
                    onClick={() => handleCopy(pohonDependensiTeks, 'pohon')}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedText === 'pohon' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto min-h-[140px]">
                  <pre className="whitespace-pre">{pohonDependensiTeks}</pre>
                </div>
              </div>
            </div>

            {/* Laporan Audit Keamanan Jika Ada */}
            {laporanAudit && (
              <div className={`p-4 rounded-xl border ${laporanAudit.aman ? 'bg-emerald-950/30 border-emerald-800/80' : 'bg-rose-950/30 border-rose-800/80'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${laporanAudit.aman ? 'text-emerald-400' : 'text-rose-400'}`} />
                    Laporan Audit Dependensi &amp; Integritas Lockfile
                  </h4>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${laporanAudit.aman ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {laporanAudit.aman ? 'STATUS: AMAN & TERVERIFIKASI' : 'STATUS: TEMUAN MASALAH'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Paket</span>
                    <span className="font-bold text-white">{laporanAudit.totalPaket}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Siklus Melingkar</span>
                    <span className={`font-bold ${laporanAudit.adaSiklus ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {laporanAudit.adaSiklus ? 'Terdeteksi' : 'Bersih'}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Konflik Versi</span>
                    <span className={`font-bold ${laporanAudit.konflikVersi.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {laporanAudit.konflikVersi.length} konflik
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Integritas Hash</span>
                    <span className={`font-bold ${laporanAudit.integritasLockValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {laporanAudit.integritasLockValid ? 'Valid' : 'Gagal'}
                    </span>
                  </div>
                </div>

                {laporanAudit.temuan.length > 0 && (
                  <div className="mt-2 text-xs space-y-1">
                    <span className="font-bold text-slate-300 block">Temuan:</span>
                    {laporanAudit.temuan.map((t: string, idx: number) => (
                      <p key={idx} className="text-rose-300 font-mono text-[11px] pl-3 border-l-2 border-rose-600">
                        • {t}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SISTEM CACHE PAKET OFFLINE (PHASE 27) */}
      {subTab === 'cache' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-violet-400" />
                  Sistem Cache Paket Terdistribusi &amp; Offline (Phase 27)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cache deterministik lokal untuk instalasi cepat tanpa jaringan dan verifikasi integritas checksum SHA-256 otomatis.
                </p>
              </div>

              <button
                onClick={handleBersihkanCache}
                className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-rose-800/60 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Cache Paket</span>
              </button>
            </div>

            {/* Statistik Cache */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Total Paket Tercache</span>
                <p className="text-2xl font-bold text-white font-mono">{entriCacheSemua.length}</p>
                <p className="text-xs text-slate-500">Paket siap digunakan untuk instalasi offline.</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Ukuran Cache Disk</span>
                <p className="text-2xl font-bold text-white font-mono">{(totalUkuranCacheByte / 1024).toFixed(1)} KB</p>
                <p className="text-xs text-slate-500">{totalUkuranCacheByte} byte total payload tersimpan.</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Proteksi Integritas</span>
                <p className="text-2xl font-bold text-white font-mono">SHA-256</p>
                <p className="text-xs text-slate-500">Deteksi manipulasi data berkas otomatis.</p>
              </div>
            </div>

            {/* Tabel Daftar Paket dalam Cache */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300">
                Daftar Paket dalam Cache Lokal (~/.nusantara/cache)
              </h4>
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                {entriCacheSemua.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Cache paket kosong. Jalankan 'nusantara pasang' atau 'nusantara tambah' untuk memuat dependensi ke dalam cache lokal.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {entriCacheSemua.map(entri => (
                      <div key={`${entri.nama}@${entri.versi}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{entri.nama}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800/60 font-mono">
                              v{entri.versi}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {entri.jumlahBerkas} berkas ({entri.ukuranByte} B)
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">
                            SHA-256: {entri.checksumSha256}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Disimpan: {new Date(entri.waktuDisimpan).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUB-TAB 3: KATALOG REGISTRI & PENCARIAN */}
      {subTab === 'katalog' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-violet-400" />
                  Eksplorasi Registri Paket Resmi
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cari dan telaah paket terdaftar, versi rilis, lisensi, dan integritas kriptografis SHA-256.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={kueriCari}
                  onChange={e => setKueriCari(e.target.value)}
                  placeholder="Cari paket (misal: matematika)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            {hasilKatalog.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Tidak ada paket yang cocok dengan kueri '{kueriCari}'.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasilKatalog.map(item => {
                  const meta = registri.dapatkanMetadata(item.nama);
                  const versiInfo = meta?.daftarVersi[item.versi];
                  return (
                    <div
                      key={item.nama}
                      className="bg-slate-950/80 border border-slate-800/90 hover:border-violet-600/60 rounded-xl p-5 transition-all shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base tracking-wide font-mono">
                              {item.nama}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold font-mono">
                              v{item.versi}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.lisensi || 'MIT'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.deskripsi}
                        </p>

                        {item.kata_kunci && item.kata_kunci.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.kata_kunci.map(k => (
                              <span
                                key={k}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono"
                              >
                                #{k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{versiInfo?.checksum?.slice(0, 18)}...</span>
                        </div>
                        <button
                          onClick={() => handleCopy(`nusantara paket pasang ${item.nama}`, item.nama)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedText === item.nama ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Pasang</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUB-TAB 2: STUDIO VALIDASI & PENERBITAN */}
      {subTab === 'validator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-violet-400" />
                  Editor Berkas Paket (nusantara.toml &amp; Sumber)
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Workspace Terisolasi</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono mb-1 font-semibold">1. Manifest Paket (nusantara.toml):</label>
                  <textarea
                    value={editorManifest}
                    onChange={e => setEditorManifest(e.target.value)}
                    rows={7}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1 font-semibold">2. Kode Sumber (src/utama.nusantara):</label>
                  <textarea
                    value={editorKode}
                    onChange={e => setEditorKode(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1 font-semibold">3. Pengujian Paket (tests/uji.uji.nusantara):</label>
                  <textarea
                    value={editorUji}
                    onChange={e => setEditorUji(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={jalankanValidasi}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Validasi Paket (nusantara paket cek)</span>
                </button>
                <button
                  onClick={bangunDanTerbitkan}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Bangun &amp; Terbitkan (Rilis Immutable)</span>
                </button>
              </div>

              {pesanAksi && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    pesanAksi.tipe === 'sukses'
                      ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-200'
                      : pesanAksi.tipe === 'galat'
                      ? 'bg-red-950/70 border-red-700/60 text-red-200'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  {pesanAksi.tipe === 'sukses' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <p className="leading-relaxed">{pesanAksi.teks}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Laporan Kelayakan Rilis
                </h3>
                {laporanValidasi && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      laporanValidasi.valid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}
                  >
                    {laporanValidasi.valid ? 'Lolos Verifikasi' : 'Ditolak'}
                  </span>
                )}
              </div>

              {!laporanValidasi ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Klik tombol <strong>Validasi Paket</strong> untuk memulai inspeksi 5 lapis kelayakan rilis.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nama Paket:</span>
                      <span className="text-white font-semibold">{laporanValidasi.nama}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Versi SemVer:</span>
                      <span className="text-white font-semibold">v{laporanValidasi.versi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Berkas Sumber:</span>
                      <span className="text-white">{laporanValidasi.totalBerkasSumber} berkas</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hasil Pemeriksaan 5 Lapis:</h4>
                    {laporanValidasi.daftarPemeriksaan.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          p.status === 'LULUS'
                            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                            : 'bg-red-950/30 border-red-800/40 text-red-300'
                        }`}
                      >
                        {p.status === 'LULUS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-white text-[11px]">{p.nama}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.pesan}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {laporanValidasi.daftarGalat.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs space-y-1">
                      <p className="font-bold">Daftar Galat Fatal:</p>
                      {laporanValidasi.daftarGalat.map((g: string, i: number) => (
                        <p key={i} className="text-[11px] text-red-300">• {g}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 3: INSPEKTUR BUNDLE ARSIP (.NPK) */}
      {subTab === 'arsip' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              Struktur Format Bundle Arsip (.npk)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Bundle arsip paket NUSANTARA (<code className="text-violet-300">nusantara-npk-v1</code>) memuat metadata deterministik, pemetaan isi berkas terurut, dan tanda tangan hash kriptografis SHA-256.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Protokol Format</span>
              <p className="text-sm font-bold text-white font-mono">nusantara-npk-v1</p>
              <p className="text-xs text-slate-400">Header terstandarisasi dengan identitas paket, versi, dan lisensi.</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Integritas Checksum</span>
              <p className="text-sm font-bold text-white font-mono">SHA-256</p>
              <p className="text-xs text-slate-400">Hash 64 karakter heksadesimal deterministik dari isi berkas terurut.</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Proteksi Keamanan</span>
              <p className="text-sm font-bold text-white font-mono">Anti-Traversal</p>
              <p className="text-xs text-slate-400">Penolakan keras path traversal (..), null byte (\0), dan jalur absolut.</p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 font-mono">Contoh Skema Bundle JSON Serial:</h4>
            <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
{`{
  "header": {
    "format": "nusantara-npk-v1",
    "nama": "matematika-ekstra",
    "versi": "1.0.0",
    "deskripsi": "Paket matematika ekstensi untuk bahasa NUSANTARA",
    "lisensi": "MIT",
    "totalBerkas": 3,
    "checksum": "sha256-9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  },
  "berkas": {
    "README.md": "# matematika-ekstra\\n...",
    "nusantara.toml": "[nusantara]\\nnama = \\"matematika-ekstra\\"\\n...",
    "src/matematika-ekstra.nusantara": "fungsi kuadrat(x: bilangan): bilangan..."
  }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 4: SIMULASI CLI */}
      {subTab === 'cli' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet-400" />
              Simulasi Antarmuka Baris Perintah (CLI NUSANTARA)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Uji coba langsung perintah paket: <code className="text-violet-300">nusantara versi</code>, <code className="text-violet-300">nusantara paket cari &lt;nama&gt;</code>, <code className="text-violet-300">nusantara paket info &lt;nama&gt;</code>, <code className="text-violet-300">nusantara paket cek</code>, dll.
            </p>
          </div>

          <form onSubmit={eksekusiCLI} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs font-mono text-violet-400">$</span>
              <input
                type="text"
                value={perintahInput}
                onChange={e => setPerintahInput(e.target.value)}
                placeholder="nusantara paket cari matematika"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Jalankan</span>
            </button>
          </form>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 max-h-96 overflow-y-auto font-mono text-xs">
            {riwayatCLI.map((item, idx) => (
              <div key={idx} className="space-y-1.5 border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <span className="text-violet-400 font-bold">$</span>
                  <span className="text-white font-semibold">{item.cmd}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${item.status === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    exit {item.status}
                  </span>
                </div>
                <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed text-[11px] pl-3 border-l-2 border-slate-800">
                  {item.out}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudioEkosistemPaket;
