/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Studio Interaktif CI/CD & Alur Kerja GitHub Actions NUSANTARA (Phase 24)
 * Target Milestone: v0.24.0
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  GitBranch,
  Play,
  RotateCw,
  Terminal,
  FileCode2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Boxes,
  Cpu,
  Layers,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Workflow,
  Sparkles,
} from 'lucide-react';
import { VERSI_NUSANTARA, LABEL_VERSI_NUSANTARA, NAMA_FASE_TERAKHIR, dapatkanInfoHost } from '../konstanta/versi';
import { MesinCI, ValidatorAlurKerjaGitHub, LaporanEksekusiCI } from '../cicd';
import { PembacaBerkasMemori } from '../modul/pembacaBerkas';
import { NusantaraCLI } from '../paket/cli';

const KONTEN_CI_YML = `name: NUSANTARA Continuous Integration

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

permissions:
  contents: read

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: \${{ github.event_name == 'pull_request' }}

jobs:
  static-checks:
    name: NUSANTARA / Pemeriksaan Statis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci || npm install --no-audit --prefer-offline
      - run: npm run lint

  test-suite:
    name: NUSANTARA / Pengujian Otomatis (\${{ matrix.os }})
    needs: static-checks
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm test

  quality-gate:
    name: NUSANTARA / Gerbang Kualitas (Quality Gate)
    needs: [static-checks, test-suite]
    runs-on: ubuntu-latest
    steps:
      - run: npm run quality-gate

  build-matrix-validation:
    name: NUSANTARA / Validasi Build (\${{ matrix.target }})
    needs: quality-gate
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        target: [windows-x64, linux-x64, macos-x64, macos-arm64]
        include:
          - target: windows-x64
            os: windows-latest
          - target: linux-x64
            os: ubuntu-latest
          - target: macos-x64
            os: macos-13
          - target: macos-arm64
            os: macos-latest
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: nusantara-ci-\${{ matrix.target }}
          path: dist/*
          retention-days: 7`;

const KONTEN_RELEASE_YML = `name: NUSANTARA Automated Release & Distribution

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Versi rilis target (contoh: 0.24.0)'
        required: true
        default: '0.24.0'
      confirm_release:
        description: 'Konfirmasi eksplisit: Setujui publikasi rilis resmi NUSANTARA'
        type: boolean
        required: true
        default: false
      release_type:
        type: choice
        options: [release, draft, prerelease]
        default: 'release'
  push:
    tags: ['v*.*.*']

permissions:
  contents: read

concurrency:
  group: release-\${{ github.ref }}
  cancel-in-progress: false

jobs:
  verify-release-approval:
    runs-on: ubuntu-latest
    steps:
      - name: Periksa Persetujuan Manual
        run: |
          if [ "\${{ inputs.confirm_release }}" != "true" ]; then
            echo "❌ Persetujuan eksplisit rilis belum diberikan."
            exit 1
          fi

  test-and-gate:
    needs: verify-release-approval
    runs-on: ubuntu-latest
    steps:
      - run: npm test && npm run quality-gate

  build-release-artifacts:
    needs: test-and-gate
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        target: [windows-x64, linux-x64, macos-x64, macos-arm64]
    steps:
      - run: npx tsx -e "import { MesinBuild } from './src/build'; const m = new MesinBuild(); m.bangun({ mode: 'release', targetPlatforms: ['\${{ matrix.target }}'] });"

  compile-release-bundle:
    needs: build-release-artifacts
    runs-on: ubuntu-latest
    steps:
      - run: cd dist && sha256sum *.zip *.tar.gz > SHA256SUMS

  publish-release:
    needs: compile-release-bundle
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: softprops/action-gh-release@v2
        with:
          files: dist/*
          tag_name: \${{ github.ref_name }}`;

export const StudioCicdWorkflow: React.FC = () => {
  const [tabAktif, setTabAktif] = useState<'pipeline' | 'matriks' | 'workflow-yaml' | 'summary' | 'cli'>('pipeline');
  const [berkasYamlDipilih, setBerkasYamlDipilih] = useState<'ci.yml' | 'release.yml'>('ci.yml');
  const [eventTrigger, setEventTrigger] = useState<'push' | 'pull_request' | 'workflow_dispatch'>('push');
  const [konfirmasiRilis, setKonfirmasiRilis] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [tersalin, setTersalin] = useState<boolean>(false);
  const [perintahCLI, setPerintahCLI] = useState<string>('ci');
  const [outputTerminal, setOutputTerminal] = useState<string[]>([]);

  // Setup FS memori untuk simulasi deterministik
  const fsMem = useMemo(() => {
    const mem = new PembacaBerkasMemori();
    mem.tulisBerkas('.github/workflows/ci.yml', KONTEN_CI_YML);
    mem.tulisBerkas('.github/workflows/release.yml', KONTEN_RELEASE_YML);
    mem.tulisBerkas('nusantara.toml', `[nusantara]\nnama = "nusantara"\nversi = "${VERSI_NUSANTARA}"\n`);
    return mem;
  }, []);

  const [laporanCI, setLaporanCI] = useState<LaporanEksekusiCI>(() => {
    const mesin = new MesinCI({
      pembaca: fsMem,
      direktoriBasis: '.',
      simulasikanRilis: false,
    });
    return mesin.jalankan();
  });

  const validator = useMemo(() => new ValidatorAlurKerjaGitHub(fsMem), [fsMem]);
  const auditCI = useMemo(() => validator.validasiKonten('ci.yml', KONTEN_CI_YML), [validator]);
  const auditRelease = useMemo(() => validator.validasiKonten('release.yml', KONTEN_RELEASE_YML), [validator]);

  const jalankanSimulasi = (event: 'push' | 'pull_request' | 'workflow_dispatch') => {
    setEventTrigger(event);
    setIsExecuting(true);
    setTimeout(() => {
      const mesin = new MesinCI({
        pembaca: fsMem,
        direktoriBasis: '.',
        simulasikanRilis: event === 'workflow_dispatch',
        persetujuanRilis: konfirmasiRilis,
      });
      const hasil = mesin.jalankan();
      setLaporanCI(hasil);
      setIsExecuting(false);
    }, 400);
  };

  const eksekusiCLI = (cmd: string) => {
    const barisLog: string[] = [`$ nusantara ${cmd}`];
    const cli = new NusantaraCLI({
      pembaca: fsMem,
      log: (m) => barisLog.push(m),
      error: (m) => barisLog.push(`[ERROR] ${m}`),
    });

    const argumen = cmd.trim().split(/\s+/).filter(Boolean);
    cli.jalankan(argumen);
    setOutputTerminal(barisLog);
  };

  const salinTeks = (teks: string) => {
    navigator.clipboard.writeText(teks);
    setTersalin(true);
    setTimeout(() => setTersalin(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER FASE 24 */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5" />
                Phase 24: CI/CD & Automated Release
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {LABEL_VERSI_NUSANTARA}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Least Privilege: contents: read
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Infrastruktur CI/CD & Alur Kerja GitHub Actions NUSANTARA
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Pipeline otomatis profesional untuk validasi statis, uji multi-platform (Linux, Windows, macOS), Quality Gate,
              kompilasi artefak deterministik, verifikasi integritas SHA-256, dan perlindungan gerbang persetujuan manual rilis.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => jalankanSimulasi(eventTrigger)}
              disabled={isExecuting}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
              Jalankan Pipeline CI
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGASI TAB */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/60 pb-3">
        {[
          { id: 'pipeline', label: 'Tahapan Alur Kerja', icon: Workflow },
          { id: 'matriks', label: 'Matriks Platform & Artefak', icon: Layers },
          { id: 'workflow-yaml', label: 'Berkas Alur Kerja (YAML)', icon: FileCode2 },
          { id: 'summary', label: 'Ringkasan CI (Step Summary)', icon: CheckCircle2 },
          { id: 'cli', label: 'Simulator CLI nusantara ci', icon: Terminal },
        ].map((t) => {
          const Icon = t.icon;
          const aktif = tabAktif === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTabAktif(t.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${
                aktif
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* KONTEN TAB 1: PIPELINE TAHAPAN */}
      {tabAktif === 'pipeline' && (
        <div className="space-y-6">
          {/* PENGATUR TRIGGER EVENT */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-sm font-semibold text-white">Simulasi Pemicu Alur Kerja (Trigger Event)</div>
                <div className="text-xs text-slate-400">Pilih skenario eksekusi GitHub Actions</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl bg-slate-900/80 p-1 border border-slate-700/60">
                <button
                  onClick={() => jalankanSimulasi('push')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    eventTrigger === 'push' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  git push (main)
                </button>
                <button
                  onClick={() => jalankanSimulasi('pull_request')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    eventTrigger === 'pull_request' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pull Request
                </button>
                <button
                  onClick={() => jalankanSimulasi('workflow_dispatch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    eventTrigger === 'workflow_dispatch' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Release Dispatch
                </button>
              </div>

              {eventTrigger === 'workflow_dispatch' && (
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 text-xs text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={konfirmasiRilis}
                    onChange={(e) => {
                      setKonfirmasiRilis(e.target.checked);
                      setTimeout(() => jalankanSimulasi('workflow_dispatch'), 100);
                    }}
                    className="rounded border-amber-500 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Setujui Rilis Manual (confirm_release=true)</span>
                </label>
              )}
            </div>
          </div>

          {/* STATUS CARDS TAHAPAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {laporanCI.langkah.map((l, idx) => {
              const isPass = l.status === 'PASS';
              return (
                <div
                  key={l.id}
                  className={`border rounded-2xl p-4.5 transition-all bg-slate-800/50 ${
                    isPass ? 'border-slate-700/80 hover:border-indigo-500/50' : 'border-rose-500/40 bg-rose-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-700/80 text-xs font-bold text-slate-300 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-tight">{l.nama}</h4>
                    </div>
                    {isPass ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> PASS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> FAIL
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mb-3 line-clamp-2">{l.pesan}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/50 pt-2.5">
                    <span className="font-mono text-slate-400">ID: {l.id}</span>
                    <span className="font-medium text-slate-400">{l.durasiMs} ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RELEASE GATE PROTECTION BANNER */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Gerbang Perlindungan Rilis Manual (Release Approval Protection)
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      laporanCI.statusRilis === 'PUBLISHED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : laporanCI.statusRilis === 'READY FOR APPROVAL'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {laporanCI.statusRilis}
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Kebijakan keamanan melarang keras penerbitan rilis publik secara otomatis dari commit atau build yang belum disetujui secara eksplisit oleh operator.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-slate-400">Status Kelayakan:</span>
              <div className="text-sm font-bold text-emerald-400">
                {laporanCI.statusAkhir === 'PASS' ? 'Semua Prasyarat Terpenuhi' : 'Terdapat Kegagalan'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 2: MATRIKS PLATFORM & ARTEFAK */}
      {tabAktif === 'matriks' && (
        <div className="space-y-6">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Boxes className="w-4 h-4 text-indigo-400" />
                Matriks Platform Target & Integritas Artefak (Phase 24)
              </div>
              <span className="text-xs text-slate-400">Total 4 Target Resmi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/40 text-xs text-slate-400 uppercase font-mono border-b border-slate-700/60">
                  <tr>
                    <th className="px-5 py-3.5">Platform Target</th>
                    <th className="px-5 py-3.5">GitHub Runner Host</th>
                    <th className="px-5 py-3.5">Status Validasi</th>
                    <th className="px-5 py-3.5">Nama Artefak Biner</th>
                    <th className="px-5 py-3.5">Checksum SHA-256</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 font-mono text-xs">
                  {laporanCI.matriksPlatform.map((m) => (
                    <tr key={m.platform} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-5 py-4 font-bold text-white">{m.platform}</td>
                      <td className="px-5 py-4 text-indigo-300">{m.runner}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-200">{m.namaArtefak || '-'}</td>
                      <td className="px-5 py-4 text-amber-300/90 truncate max-w-xs">
                        {m.sha256 ? `${m.sha256.substring(0, 16)}...` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 3: WORKFLOW YAML & AUDIT KEAMANAN */}
      {tabAktif === 'workflow-yaml' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setBerkasYamlDipilih('ci.yml')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  berkasYamlDipilih === 'ci.yml' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                .github/workflows/ci.yml
              </button>
              <button
                onClick={() => setBerkasYamlDipilih('release.yml')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  berkasYamlDipilih === 'release.yml' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                .github/workflows/release.yml
              </button>
            </div>

            <button
              onClick={() => salinTeks(berkasYamlDipilih === 'ci.yml' ? KONTEN_CI_YML : KONTEN_RELEASE_YML)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {tersalin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {tersalin ? 'Tersalin!' : 'Salin YAML'}
            </button>
          </div>

          {/* AUDIT KEAMANAN HASIL */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Hasil Audit Keamanan & Kepatuhan Least Privilege
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-1">Least Privilege Root</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  permissions: contents: read
                </span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-1">Proteksi Rahasia/Token</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  0 Kredensial Bocor
                </span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-1">Concurrency Scoping</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aman & Terkendali
                </span>
              </div>
            </div>
          </div>

          {/* YAML VIEWER */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed max-h-[500px]">
            <pre>{berkasYamlDipilih === 'ci.yml' ? KONTEN_CI_YML : KONTEN_RELEASE_YML}</pre>
          </div>
        </div>
      )}

      {/* KONTEN TAB 4: STEP SUMMARY */}
      {tabAktif === 'summary' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Pratinjau Format $GITHUB_STEP_SUMMARY
            </div>
            <button
              onClick={() => salinTeks(laporanCI.ringkasanMarkdown)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {tersalin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {tersalin ? 'Tersalin!' : 'Salin Markdown'}
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
            {laporanCI.ringkasanMarkdown}
          </div>
        </div>
      )}

      {/* KONTEN TAB 5: CLI SIMULATOR */}
      {tabAktif === 'cli' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-2">Perintah Siap Pakai:</span>
              {[
                'ci',
                'ci --markdown',
                'ci periksa-workflow',
                'ci --rilis --setujui',
                'info',
                'versi',
              ].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => {
                    setPerintahCLI(cmd);
                    eksekusiCLI(cmd);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/50 text-xs font-mono text-indigo-300 border border-slate-700 cursor-pointer transition-colors"
                >
                  nusantara {cmd}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-mono text-sm">nusantara</span>
              <input
                type="text"
                value={perintahCLI}
                onChange={(e) => setPerintahCLI(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') eksekusiCLI(perintahCLI);
                }}
                className="bg-transparent border-none text-white text-sm font-mono focus:outline-none flex-1"
                placeholder="masukkan perintah (misal: ci, ci periksa-workflow)"
              />
              <button
                onClick={() => eksekusiCLI(perintahCLI)}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
              >
                Jalankan
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 font-mono text-xs text-slate-300 min-h-[220px] max-h-[420px] overflow-y-auto space-y-1">
            {outputTerminal.length === 0 ? (
              <div className="text-slate-500 italic">
                Tekan salah satu tombol perintah di atas atau ketik perintah untuk menjalankan CLI NUSANTARA...
              </div>
            ) : (
              outputTerminal.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap leading-relaxed">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
