/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Komponen Studio Sistem Build & Distribusi NUSANTARA (Phase 23)
 * Target Versi: v0.23.0
 */

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Boxes,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Terminal,
  ShieldCheck,
  Copy,
  Check,
  Layers,
  BookOpen,
  Download,
  HardDrive,
  Cpu,
  Monitor,
  Package,
} from 'lucide-react';
import {
  MesinBuild,
  HasilBuild,
  PlatformTarget,
  ModeBuild,
  ArtefakBuild,
  PLATFORM_SEMUA,
  normalisasiJalur,
} from '../build';
import { NusantaraCLI } from '../paket/cli';
import { PembacaBerkasMemori } from '../modul/pembacaBerkas';
import {
  VERSI_NUSANTARA,
  LABEL_VERSI_NUSANTARA,
  dapatkanBannerCLI,
  dapatkanInfoHost,
} from '../konstanta/versi';

export function StudioDistribusiBuild() {
  const [subTab, setSubTab] = useState<'matrix' | 'manifest' | 'installer' | 'cli'>('matrix');
  const [modePilihan, setModePilihan] = useState<ModeBuild>('release');
  const [platformPilihan, setPlatformPilihan] = useState<PlatformTarget[]>([...PLATFORM_SEMUA]);
  const [reproducible, setReproducible] = useState<boolean>(true);
  const [verifikasiUji, setVerifikasiUji] = useState<boolean>(true);
  const [bersihkanSebelum, setBersihkanSebelum] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Inisialisasi filesystem dan mesin build
  const { memori, mesin, cli } = useMemo(() => {
    const mem = new PembacaBerkasMemori();
    const m = new MesinBuild(mem);
    const c = new NusantaraCLI({ pembaca: mem });
    return { memori: mem, mesin: m, cli: c };
  }, []);

  const [hasilBuild, setHasilBuild] = useState<HasilBuild | null>(() => {
    // Jalankan build awal agar artefak langsung tersedia di layar
    return mesin.bangun({
      mode: 'release',
      target: [...PLATFORM_SEMUA],
      reproducible: true,
      verifikasiUji: true,
    });
  });

  const [riwayatCLI, setRiwayatCLI] = useState<Array<{ cmd: string; out: string; status: number }>>([
    {
      cmd: 'nusantara info',
      out: `NUSANTARA - Informasi Sistem & Build:
  Versi            : ${LABEL_VERSI_NUSANTARA} (Build System & Distribution)
  Platform Host    : ${dapatkanInfoHost().namaPlatform}
  Arsitektur       : ${dapatkanInfoHost().arsitektur}
  Mode Default     : release
  Target Resmi     : windows-x64, linux-x64, macos-x64, macos-arm64
  Direktori Output : dist
  Direktori Build  : target
  Pustaka Standar  : std`,
      status: 0,
    },
    {
      cmd: 'nusantara bangun --mode release',
      out: `[✓ SUKSES] Build RELEASE NUSANTARA ${LABEL_VERSI_NUSANTARA} selesai dengan 7 artefak resmi.

Artefak Distribusi (7):
  - nusantara-${LABEL_VERSI_NUSANTARA}-windows-x64.zip           (14.8 KB, sha256: 489f02b...)
  - nusantara-${LABEL_VERSI_NUSANTARA}-linux-x64.zip             (13.9 KB, sha256: b2a8f01...)
  - nusantara-${LABEL_VERSI_NUSANTARA}-linux-x64.tar.gz          (11.2 KB, sha256: 9e32a41...)
  - nusantara-${LABEL_VERSI_NUSANTARA}-macos-x64.zip             (14.1 KB, sha256: 7f0a823...)
  - nusantara-${LABEL_VERSI_NUSANTARA}-macos-x64.tar.gz          (11.4 KB, sha256: c382b99...)
  - nusantara-${LABEL_VERSI_NUSANTARA}-macos-arm64.zip           (14.2 KB, sha256: 120cf94...)
  - nusantara-${LABEL_VERSI_NUSANTARA}-macos-arm64.tar.gz        (11.5 KB, sha256: 8a4ef77...)

Berkas Manifest Rilis : dist/release-manifest.json
Berkas Checksum Resmi  : dist/SHA256SUMS`,
      status: 0,
    },
  ]);

  const [inputCLI, setInputCLI] = useState('');

  const handleCopy = (teks: string, label: string) => {
    navigator.clipboard.writeText(teks);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const togglePlatform = (p: PlatformTarget) => {
    setPlatformPilihan((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const jalankanBuildKustom = () => {
    if (platformPilihan.length === 0) return;
    if (bersihkanSebelum) {
      mesin.bersihkan();
    }
    const hasil = mesin.bangun({
      mode: modePilihan,
      target: platformPilihan,
      reproducible,
      verifikasiUji,
    });
    setHasilBuild(hasil);
  };

  const handleKirimCLI = (e: React.FormEvent) => {
    e.preventDefault();
    const cmdTrim = inputCLI.trim();
    if (!cmdTrim) return;

    const parts = cmdTrim.split(/\s+/);
    const logList: string[] = [];
    const errorList: string[] = [];

    const cliRunner = new NusantaraCLI({
      pembaca: memori,
      log: (m) => logList.push(m),
      error: (m) => errorList.push(m),
    });

    const status = cliRunner.jalankan(parts[0] === 'nusantara' ? parts.slice(1) : parts);
    const out = [...logList, ...errorList].join('\n') || '(perintah selesai tanpa keluaran)';

    setRiwayatCLI((prev) => [{ cmd: cmdTrim, out, status }, ...prev.slice(0, 9)]);
    setInputCLI('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Ringkasan Sistem Build & Distribusi */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Sistem Build &amp; Distribusi NUSANTARA
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {LABEL_VERSI_NUSANTARA} Resmi
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pipeline kompilasi dan distribusi lintas platform (Windows x64, Linux x64, macOS x64 &amp; ARM64), arsip biner mandiri (.zip &amp; .tar.gz), integritas SHA-256, dan validasi rilis.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-teal-950/60 border border-teal-800/80 text-teal-300 text-xs font-mono font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>nusantara bangun --mode release</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigasi Studio */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-1 text-xs">
          <button
            onClick={() => setSubTab('matrix')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'matrix' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Matriks Target &amp; Eksekusi Build</span>
          </button>
          <button
            onClick={() => setSubTab('manifest')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'manifest' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Manifest Rilis &amp; SHA256SUMS</span>
          </button>
          <button
            onClick={() => setSubTab('installer')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'installer' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Struktur Distribusi &amp; Pemasang</span>
          </button>
          <button
            onClick={() => setSubTab('cli')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'cli' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Simulasi Terminal CLI 'nusantara'</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MATRIKS TARGET & EKSEKUSI BUILD */}
      {subTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Konfigurasi Build */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-teal-400" />
                  Konfigurasi Pipeline
                </span>
                <span className="text-xs text-slate-400 font-mono">nusantara.toml</span>
              </div>

              {/* Mode Build */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Mode Build:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModePilihan('release')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                      modePilihan === 'release'
                        ? 'bg-teal-950 border-teal-500 text-teal-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Release (Optimasi Penuh)
                  </button>
                  <button
                    onClick={() => setModePilihan('debug')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                      modePilihan === 'debug'
                        ? 'bg-teal-950 border-teal-500 text-teal-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Debug (Cepat &amp; Verbose)
                  </button>
                </div>
              </div>

              {/* Target Platform Matrix */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Target Platform Resmi ({platformPilihan.length}/4 terpilih):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORM_SEMUA.map((plat: PlatformTarget) => {
                    const aktif = platformPilihan.includes(plat);
                    return (
                      <button
                        key={plat}
                        onClick={() => togglePlatform(plat)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                          aktif
                            ? 'bg-slate-800/80 border-teal-500/60 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span className="font-mono text-[11px]">{plat}</span>
                        {aktif ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opsi Build Tambahan */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={reproducible}
                    onChange={(e) => setReproducible(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Reproducible Build (Normalisasi Stempel Waktu &amp; Urutan Berkas)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={verifikasiUji}
                    onChange={(e) => setVerifikasiUji(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Verifikasi Uji Pra-Rilis Wajib (Quality Gate)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={bersihkanSebelum}
                    onChange={(e) => setBersihkanSebelum(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Jalankan Pembersihan Direktori Sebelum Build (--bersih)</span>
                </label>
              </div>

              {/* Tombol Eksekusi Build */}
              <div className="pt-2">
                <button
                  onClick={jalankanBuildKustom}
                  disabled={platformPilihan.length === 0}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-950/40 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Jalankan Pipeline Build NUSANTARA</span>
                </button>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Hasil & Validasi Artefak */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-400" />
                  Status Hasil Build &amp; Artefak Resmi
                </span>
                {hasilBuild && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      hasilBuild.sukses
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}
                  >
                    {hasilBuild.sukses ? `SUKSES (${hasilBuild.durasiMs} ms)` : 'GAGAL'}
                  </span>
                )}
              </div>

              {hasilBuild ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                    <p className="font-semibold text-white">{hasilBuild.pesan}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-slate-400 font-mono text-[11px]">
                      <span>Mode: <strong className="text-teal-300">{hasilBuild.mode}</strong></span>
                      <span>Total Artefak: <strong className="text-white">{hasilBuild.artefak.length}</strong></span>
                      <span>Tahap Akhir: <strong className="text-emerald-400">{hasilBuild.tahap}</strong></span>
                    </div>
                  </div>

                  {/* Daftar Artefak */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-semibold text-slate-300">Berkas Distribusi Siap Pakai:</span>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {hasilBuild.artefak.map((art: ArtefakBuild, idx: number) => {
                        const kb = (art.ukuranByte / 1024).toFixed(1);
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white truncate">
                                  {art.namaBerkas}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {art.format}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                                <span>Ukuran: {kb} KB</span>
                                <span>Platform: {art.platform}</span>
                              </div>
                              <p className="text-[10px] text-teal-400 font-mono truncate">
                                SHA-256: {art.sha256}
                              </p>
                            </div>

                            <button
                              onClick={() => handleCopy(art.sha256, `sha-${idx}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer transition-colors"
                            >
                              {copiedText === `sha-${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-teal-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{copiedText === `sha-${idx}` ? 'Tersalin' : 'Salin Hash'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Laporan Smoke Test */}
                  {hasilBuild.validasi && hasilBuild.validasi.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-800/40 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-teal-300 font-semibold">
                        <ShieldCheck className="w-4 h-4 text-teal-400" />
                        <span>Validasi Integritas &amp; Smoke Test Otomatis</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Seluruh artefak hasil build telah diekstraksi ke direktori terisolasi, diuji verifikasi checksum SHA-256, dan berhasil mengeksekusi program percontohan NUSANTARA tanpa galat.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Belum ada build yang dijalankan. Klik tombol 'Jalankan Pipeline' di sebelah kiri.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MANIFEST RILIS & SHA256SUMS */}
      {subTab === 'manifest' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-teal-400" />
              Manifest Rilis Resmi (dist/release-manifest.json)
            </span>
            {hasilBuild?.manifest && (
              <button
                onClick={() =>
                  handleCopy(JSON.stringify(hasilBuild.manifest, null, 2), 'manifest-json')
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedText === 'manifest-json' ? (
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Salin Manifest JSON</span>
              </button>
            )}
          </div>

          {hasilBuild?.manifest ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-3">
                <span className="text-xs font-semibold text-slate-300">
                  Pratinjau Berkas SHA256SUMS:
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-teal-300 overflow-x-auto whitespace-pre leading-relaxed">
                  {hasilBuild.artefak
                    .map((a: ArtefakBuild) => `${a.sha256}  ${a.namaBerkas}`)
                    .join('\n')}
                </pre>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <span className="text-xs font-semibold text-slate-300">
                  Konten Metadata Manifest Rilis:
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed max-h-96 overflow-y-auto">
                  {JSON.stringify(hasilBuild.manifest, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">Manifest belum tersedia.</p>
          )}
        </div>
      )}

      {/* SUB-TAB 3: STRUKTUR DISTRIBUSI & PEMASANG */}
      {subTab === 'installer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Windows Package */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-white font-bold text-sm">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>Distribusi Windows x64 (.zip)</span>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto">
{`nusantara-v0.23.0-windows-x64/
├── bin/
│   ├── nusantara.cmd    (Peluncur CLI Windows)
│   └── nusantara.bat    (Peluncur kompatibilitas)
├── lib/
│   ├── nusantara-core.js(Mesin runtime terpaket)
│   └── bundle-cli.js    (Metadata executable)
├── std/                 (Pustaka standar lengkap)
├── docs/                (README & Panduan)
├── install.bat          (Pemasang resmi)
├── LICENSE              (Apache License 2.0)
└── README.md`}
            </pre>
            <div className="p-3 rounded-xl bg-slate-950 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-white">Panduan Pengaturan PATH Windows:</p>
              <code className="text-sky-300 text-[11px] block font-mono">
                setx PATH "%PATH%;%LOCALAPPDATA%\Nusantara\bin"
              </code>
            </div>
          </div>

          {/* Linux & macOS Package */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-white font-bold text-sm">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>Distribusi Linux &amp; macOS (.tar.gz &amp; .zip)</span>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto">
{`nusantara-v0.23.0-<platform>/
├── bin/
│   └── nusantara        (Script peluncur bash POSIX)
├── lib/
│   ├── nusantara-core.js(Mesin runtime terpaket)
│   └── bundle-cli.js    (Metadata executable)
├── std/                 (Pustaka standar lengkap)
├── docs/                (README & Panduan)
├── install.sh           (Pemasang resmi UNIX)
├── LICENSE              (Apache License 2.0)
└── README.md`}
            </pre>
            <div className="p-3 rounded-xl bg-slate-950 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-white">Panduan Pengaturan PATH Linux/macOS:</p>
              <code className="text-teal-300 text-[11px] block font-mono">
                export PATH="$HOME/.nusantara/bin:$PATH"
              </code>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SIMULASI TERMINAL CLI */}
      {subTab === 'cli' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-bold text-white">Simulasi Terminal CLI Bahasa NUSANTARA</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputCLI('nusantara bangun --mode release')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 cursor-pointer font-mono"
              >
                bangun --mode release
              </button>
              <button
                onClick={() => setInputCLI('nusantara info')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 cursor-pointer font-mono"
              >
                info
              </button>
              <button
                onClick={() => setInputCLI('nusantara bersihkan')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 cursor-pointer font-mono"
              >
                bersihkan
              </button>
              <button
                onClick={() => setInputCLI('nusantara versi')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 cursor-pointer font-mono"
              >
                versi
              </button>
            </div>
          </div>

          <form onSubmit={handleKirimCLI} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-xs">$</span>
              <input
                type="text"
                value={inputCLI}
                onChange={(e) => setInputCLI(e.target.value)}
                placeholder="nusantara bangun [--mode debug|release] [--target <platform>]"
                className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Jalankan</span>
            </button>
          </form>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 max-h-96 overflow-y-auto font-mono text-xs">
            {riwayatCLI.map((item, idx) => (
              <div key={idx} className="space-y-1.5 border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <span className="text-teal-400 font-bold">$</span>
                  <span className="text-white font-semibold">{item.cmd}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      item.status === 0
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
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

export default StudioDistribusiBuild;
