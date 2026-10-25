/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Studio Interaktif Debugger & Profiler Bahasa NUSANTARA (Phase 25)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  CornerDownRight,
  CornerUpLeft,
  Square,
  Bug,
  Activity,
  Cpu,
  Layers,
  Eye,
  List,
  Terminal,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Code2,
} from 'lucide-react';
import { PenelusurNUSANTARA } from '../debugger/penelusur';
import { SesiDebug } from '../debugger/sesiDebug';
import { ProfilerNUSANTARA } from '../debugger/profiler';
import { Breakpoint, BingkaiDebug, InfoVariabelDebug, EkspresiPantau, LaporanProfil } from '../debugger/types';

interface ContohProgram {
  nama: string;
  deskripsi: string;
  kode: string;
  breakpointDefault: number[];
}

const DAFTAR_CONTOH: ContohProgram[] = [
  {
    nama: '1. Rekursi Faktorial',
    deskripsi: 'Penelusuran tumpukan panggilan (call stack) bersarang dan variabel lokal fungsi.',
    breakpointDefault: [7, 14],
    kode: `program DemoFaktorial

fungsi hitung_faktorial(n: bilangan) : bilangan
mulai
    jika n <= 1 maka
        kembalikan 1
    selain
        hasil_sub : bilangan = hitung_faktorial(n - 1)
        kembalikan n * hasil_sub
    akhir
selesai

mulai
    angka : bilangan = 4
    tampilkan("Menghitung faktorial untuk angka:", angka)
    hasil : bilangan = hitung_faktorial(angka)
    tampilkan("Hasil faktorial:", hasil)
selesai`,
  },
  {
    nama: '2. Perulangan & Titik Henti',
    deskripsi: 'Inspeksi mutasi variabel dalam loop dan evaluasi ekspresi pantau (watch).',
    breakpointDefault: [8],
    kode: `program DemoPerulangan

mulai
    total : bilangan = 0
    i : bilangan = 1

    selama i <= 5 lakukan
        total = total + (i * 2)
        tampilkan("Iterasi i =", i, "total =", total)
        i = i + 1
    akhir

    tampilkan("Hasil akhir total:", total)
selesai`,
  },
  {
    nama: '3. Profiler Kinerja Fungsi',
    deskripsi: 'Pengukuran waktu eksekusi total, waktu mandiri (self-time), dan frekuensi pemanggilan.',
    breakpointDefault: [],
    kode: `program DemoProfiler

fungsi proses_berat(kali: bilangan) : bilangan
mulai
    hitung : bilangan = 0
    k : bilangan = 1
    selama k <= kali lakukan
        hitung = hitung + 1
        k = k + 1
    akhir
    kembalikan hitung
selesai

fungsi pembungkus_tugas(n: bilangan) : bilangan
mulai
    res : bilangan = proses_berat(n * 200)
    kembalikan res
selesai

mulai
    tampilkan("Memulai pengujian kinerja profiler...")
    idx : bilangan = 1
    selama idx <= 3 lakukan
        hasil : bilangan = pembungkus_tugas(idx)
        idx = idx + 1
    akhir
    tampilkan("Pengujian selesai.")
selesai`,
  },
  {
    nama: '4. Galat Runtime & Diagnostik',
    deskripsi: 'Inspeksi keadaan runtime dan call stack saat terjadi galat eksekusi.',
    breakpointDefault: [7],
    kode: `program DemoGalatRuntime

fungsi bagi_dua(a: bilangan, b: bilangan) : bilangan
mulai
    jika b == 0 maka
        tampilkan("Peringatan: pembagi bernilai nol!")
    akhir
    hasil : bilangan = a / b
    kembalikan hasil
selesai

mulai
    pembilang : bilangan = 100
    penyebut : bilangan = 0
    tampilkan("Mencoba pembagian...")
    res : bilangan = bagi_dua(pembilang, penyebut)
    tampilkan("Hasil:", res)
selesai`,
  },
];

export function StudioDebugger() {
  const [contohTerpilih, setContohTerpilih] = useState<number>(0);
  const [kodeSumber, setKodeSumber] = useState<string>(DAFTAR_CONTOH[0].kode);
  const [tabAktif, setTabAktif] = useState<'variabel' | 'stack' | 'watch' | 'breakpoints' | 'profiler' | 'output'>('variabel');
  const [inputWatch, setInputWatch] = useState<string>('');
  const [inputKondisiBP, setInputKondisiBP] = useState<string>('');
  const [laporanProfil, setLaporanProfil] = useState<LaporanProfil | null>(null);
  const [sedangProfil, setSedangProfil] = useState<boolean>(false);
  const [salinSukses, setSalinSukses] = useState<boolean>(false);

  // Debugger instance
  const penelusur = useMemo(() => new PenelusurNUSANTARA(), []);
  const [sesi, setSesi] = useState<SesiDebug | null>(null);
  const [statusDebug, setStatusDebug] = useState<string>('created');
  const [barisAktif, setBarisAktif] = useState<number>(1);
  const [daftarBP, setDaftarBP] = useState<Breakpoint[]>([]);

  // Inisialisasi contoh program
  useEffect(() => {
    muatContoh(0);
  }, []);

  const muatContoh = (idx: number) => {
    setContohTerpilih(idx);
    const contoh = DAFTAR_CONTOH[idx];
    setKodeSumber(contoh.kode);
    penelusur.dapatkanPengelolaBreakpoint().bersihkan();

    const sesiBaru = penelusur.buatSesi({
      berkas: `${contoh.nama.toLowerCase().replace(/[^a-z0-9]/g, '_')}.nusantara`,
      sumber: contoh.kode,
    });

    for (const b of contoh.breakpointDefault) {
      sesiBaru.tambahBreakpoint(b);
    }

    setSesi(sesiBaru);
    setStatusDebug(sesiBaru.status);
    setBarisAktif(1);
    setDaftarBP(sesiBaru.pengelolaBreakpoint.dapatkanSemua());
    setLaporanProfil(null);
  };

  const perbaruiTampilanSesi = (s: SesiDebug) => {
    setSesi(s);
    setStatusDebug(s.status);
    setBarisAktif(s.barisSaatIni);
    setDaftarBP(s.pengelolaBreakpoint.dapatkanSemua());
  };

  // Kontrol Debugger
  const handleMulaiAtauLanjut = () => {
    if (!sesi || sesi.status === 'finished' || sesi.status === 'terminated' || sesi.status === 'failed') {
      const sesiBaru = penelusur.buatSesi({
        berkas: 'program.nusantara',
        sumber: kodeSumber,
      });
      // Salin breakpoint lama
      for (const bp of daftarBP) {
        sesiBaru.tambahBreakpoint(bp.baris, { kondisi: bp.kondisi });
      }

      penelusur.pasangPenanganJeda((s, alasan) => {
        perbaruiTampilanSesi(s);
        // Pada UI, jeda berhenti dan menunggu klik tombol
        return 'continue';
      });

      penelusur.jalankan(sesiBaru);
      perbaruiTampilanSesi(sesiBaru);
    } else {
      // Sesi sedang aktif, jalankan lanjutan
      penelusur.jalankan(sesi);
      perbaruiTampilanSesi(sesi);
    }
  };

  const handleLangkahTunggal = (aksi: 'step_into' | 'step_over' | 'step_out') => {
    if (!sesi || sesi.status === 'finished' || sesi.status === 'terminated') {
      const sesiBaru = penelusur.buatSesi({
        berkas: 'program.nusantara',
        sumber: kodeSumber,
      });
      for (const bp of daftarBP) {
        sesiBaru.tambahBreakpoint(bp.baris, { kondisi: bp.kondisi });
      }

      let pertama = true;
      penelusur.pasangPenanganJeda((s) => {
        perbaruiTampilanSesi(s);
        if (pertama) {
          pertama = false;
          return aksi;
        }
        return 'continue';
      });

      penelusur.jalankan(sesiBaru);
      perbaruiTampilanSesi(sesiBaru);
    }
  };

  const handleReset = () => {
    if (sesi) {
      const sesiBaru = penelusur.buatSesi({
        berkas: sesi.berkasSumber,
        sumber: kodeSumber,
      });
      for (const bp of daftarBP) {
        sesiBaru.tambahBreakpoint(bp.baris, { kondisi: bp.kondisi });
      }
      perbaruiTampilanSesi(sesiBaru);
    }
  };

  const toggleBreakpoint = (nomorBaris: number) => {
    if (!sesi) return;
    const bpAda = sesi.pengelolaBreakpoint.temukanBreakpoint(sesi.berkasSumber, nomorBaris);
    if (bpAda) {
      sesi.hapusBreakpoint(bpAda.id);
    } else {
      sesi.tambahBreakpoint(nomorBaris, { kondisi: inputKondisiBP || undefined });
    }
    setDaftarBP(sesi.pengelolaBreakpoint.dapatkanSemua());
  };

  const handleTambahWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWatch.trim() || !sesi) return;
    sesi.tambahPantau(inputWatch.trim());
    setInputWatch('');
    perbaruiTampilanSesi(sesi);
  };

  const handleJalankanProfiler = () => {
    setSedangProfil(true);
    setTimeout(() => {
      const prof = new ProfilerNUSANTARA(true);
      prof.aktifkan('program.nusantara');

      try {
        const { Interpreter } = require('../interpreter/interpreter');
        const { PenulisOutputBuffer } = require('../interpreter/outputWriter');
        const buf = new PenulisOutputBuffer();
        const interp = new Interpreter(buf, { profiler: prof });
        interp.jalankanKode(kodeSumber);
        const lap = prof.buatLaporan('program.nusantara');
        setLaporanProfil(lap);
        setTabAktif('profiler');
      } catch (err: any) {
        const lap = prof.buatLaporan('program.nusantara');
        setLaporanProfil(lap);
        setTabAktif('profiler');
      } finally {
        setSedangProfil(false);
      }
    }, 50);
  };

  const salinJSONProfil = () => {
    if (!laporanProfil) return;
    navigator.clipboard.writeText(JSON.stringify(laporanProfil, null, 2));
    setSalinSukses(true);
    setTimeout(() => setSalinSukses(false), 2000);
  };

  // Baris-baris kode sumber untuk editor
  const barisKode = useMemo(() => kodeSumber.split('\n'), [kodeSumber]);

  // Variabel lokal & global
  const variabelLokal = useMemo(() => {
    if (!sesi) return [];
    return Array.from(sesi.dapatkanVariabelLokal().entries());
  }, [sesi, barisAktif]);

  const variabelGlobal = useMemo(() => {
    if (!sesi) return [];
    return Array.from(sesi.dapatkanVariabelGlobal().entries());
  }, [sesi, barisAktif]);

  return (
    <div className="space-y-6">
      {/* Header Studio */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Studio Debugger & Profiler NUSANTARA
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  v0.25.0
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Source Location Tracking, Breakpoint Foundation, Stepping, Call Stack, Variabel & Profiling Eksekusi
              </p>
            </div>
          </div>
        </div>

        {/* Pemilih Contoh Program */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 px-2 font-medium">Contoh:</span>
          {DAFTAR_CONTOH.map((c, idx) => (
            <button
              key={idx}
              onClick={() => muatContoh(idx)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                contohTerpilih === idx
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {c.nama.split('.')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar Kontrol Debugger */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-xl">
        <div className="flex items-center gap-2">
          {/* Tombol Mulai / Lanjut */}
          <button
            onClick={handleMulaiAtauLanjut}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
            title="Lanjutkan eksekusi hingga breakpoint berikutnya (continue)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{statusDebug === 'paused' ? 'Lanjutkan (F5)' : 'Mulai Debug (F5)'}</span>
          </button>

          {/* Tombol Step Over */}
          <button
            onClick={() => handleLangkahTunggal('step_over')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
            title="Langkah lewati pemanggilan fungsi (step-over / F10)"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Lewati (Next)</span>
          </button>

          {/* Tombol Step In */}
          <button
            onClick={() => handleLangkahTunggal('step_into')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
            title="Langkah masuk ke dalam fungsi (step-in / F11)"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Masuk (Step In)</span>
          </button>

          {/* Tombol Step Out */}
          <button
            onClick={() => handleLangkahTunggal('step_out')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
            title="Langkah keluar dari fungsi saat ini (step-out / Shift+F11)"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
            <span>Keluar (Step Out)</span>
          </button>

          {/* Tombol Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition"
            title="Reset ulang sesi debugger"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Tombol Profiler */}
          <button
            onClick={handleJalankanProfiler}
            disabled={sedangProfil}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition shadow-sm ml-2"
            title="Jalankan profiling eksekusi dan ukur waktu fungsi"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{sedangProfil ? 'Mengukur...' : 'Profil Kinerja'}</span>
          </button>
        </div>

        {/* Status Sesi Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Status:</span>
          <span
            className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold uppercase ${
              statusDebug === 'paused'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : statusDebug === 'running'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                : statusDebug === 'finished'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : statusDebug === 'failed'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {statusDebug}
          </span>
          {sesi && (
            <span className="text-slate-500 font-mono text-xs">
              Baris: {barisAktif}
            </span>
          )}
        </div>
      </div>

      {/* Workspace Grid: Source Editor (Kiri) + Panel Inspeksi (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Kode Sumber dengan Penanda Breakpoint */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>{sesi?.berkasSumber || 'program.nusantara'}</span>
              <span className="text-slate-500">({barisKode.length} baris)</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Klik nomor baris untuk pasang titik henti (●)
            </div>
          </div>

          {/* Area Kode Sumber */}
          <div className="p-4 bg-slate-950/40 font-mono text-xs overflow-x-auto flex-1 select-none">
            {barisKode.map((teks, i) => {
              const noBaris = i + 1;
              const apakahBP = daftarBP.some(b => b.baris === noBaris && b.aktif);
              const apakahBarisAktif = statusDebug === 'paused' && barisAktif === noBaris;

              return (
                <div
                  key={noBaris}
                  className={`flex items-center gap-3 py-0.5 px-2 rounded transition-colors ${
                    apakahBarisAktif
                      ? 'bg-amber-500/20 text-amber-200 border-l-2 border-amber-400'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Penanda Arrow Saat Jeda */}
                  <div className="w-3 text-center">
                    {apakahBarisAktif ? (
                      <span className="text-amber-400 font-bold">➔</span>
                    ) : (
                      <span className="text-transparent">·</span>
                    )}
                  </div>

                  {/* Tombol Nomor Baris & Breakpoint */}
                  <button
                    onClick={() => toggleBreakpoint(noBaris)}
                    className="flex items-center gap-1.5 w-10 text-right text-slate-500 hover:text-rose-400 transition"
                    title={`Klik untuk pasang/lepas breakpoint pada baris ${noBaris}`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full inline-block ${
                        apakahBP ? 'bg-rose-500 shadow-sm shadow-rose-500/50' : 'bg-transparent'
                      }`}
                    />
                    <span className="font-mono text-slate-400">{String(noBaris).padStart(2, ' ')}</span>
                  </button>

                  {/* Teks Baris Kode */}
                  <pre className="text-slate-200 font-mono select-text whitespace-pre flex-1">
                    {teks || ' '}
                  </pre>
                </div>
              );
            })}
          </div>

          {/* Info Breakpoint Terpasang Footer */}
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Titik Henti Terpasang: {daftarBP.length} lokasi</span>
            <span>Mode Eksekusi: Deterministic Single-Thread</span>
          </div>
        </div>

        {/* Panel Inspeksi Kanan (Tabs) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
          {/* Header Tab Panel */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/70 p-1 gap-1 overflow-x-auto">
            <button
              onClick={() => setTabAktif('variabel')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                tabAktif === 'variabel'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Variabel</span>
            </button>

            <button
              onClick={() => setTabAktif('stack')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                tabAktif === 'stack'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Call Stack ({sesi?.tumpukanBingkai.length || 0})</span>
            </button>

            <button
              onClick={() => setTabAktif('watch')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                tabAktif === 'watch'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Pantau ({sesi?.daftarEkspresiPantau.length || 0})</span>
            </button>

            <button
              onClick={() => setTabAktif('breakpoints')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                tabAktif === 'breakpoints'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Breakpoints ({daftarBP.length})</span>
            </button>

            <button
              onClick={() => setTabAktif('profiler')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                tabAktif === 'profiler'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Profiler</span>
            </button>

            <button
              onClick={() => setTabAktif('output')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                tabAktif === 'output'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Keluaran</span>
            </button>
          </div>

          {/* Isi Konten Tab */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[460px]">
            {/* TAB 1: VARIABEL */}
            {tabAktif === 'variabel' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Variabel Lokal (Bingkai #{sesi?.indeksBingkaiAktif || 0})
                  </h3>
                  {variabelLokal.length === 0 ? (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                      Tidak ada variabel lokal yang terdefinisi pada lingkup saat ini.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60 bg-slate-950/40 rounded-xl border border-slate-800/60 overflow-hidden font-mono text-xs">
                      {variabelLokal.map(([nama, v]) => (
                        <div key={nama} className="p-2.5 flex items-center justify-between hover:bg-slate-800/30">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-indigo-300">{nama}</span>
                            <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">
                              {v.tipe}
                            </span>
                            {v.tetap && (
                              <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded">
                                tetap
                              </span>
                            )}
                          </div>
                          <span className="text-emerald-400 font-semibold">{v.formatTeks}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {variabelGlobal.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Variabel Global
                    </h3>
                    <div className="divide-y divide-slate-800/60 bg-slate-950/40 rounded-xl border border-slate-800/60 overflow-hidden font-mono text-xs">
                      {variabelGlobal.map(([nama, v]) => (
                        <div key={nama} className="p-2.5 flex items-center justify-between hover:bg-slate-800/30">
                          <span className="text-slate-300">{nama}</span>
                          <span className="text-slate-400">{v.formatTeks}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CALL STACK */}
            {tabAktif === 'stack' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Jejak Tumpukan Panggilan
                </h3>
                {(!sesi || sesi.tumpukanBingkai.length === 0) ? (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    Tumpukan panggilan kosong. Jalankan program untuk mengamati call stack.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sesi.tumpukanBingkai.map((frame, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          sesi.pilihBingkai(frame.indeks);
                          perbaruiTampilanSesi(sesi);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                          sesi.indeksBingkaiAktif === frame.indeks
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="font-mono text-xs">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span className="text-indigo-400">#{frame.indeks}</span>
                            <span>{frame.namaFungsi}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {frame.berkas} : baris {frame.baris}, kolom {frame.kolom}
                          </div>
                        </div>
                        {sesi.indeksBingkaiAktif === frame.indeks && (
                          <span className="text-[10px] font-semibold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                            Aktif
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: WATCH EXPRESSIONS */}
            {tabAktif === 'watch' && (
              <div className="space-y-4">
                <form onSubmit={handleTambahWatch} className="flex gap-2">
                  <input
                    type="text"
                    value={inputWatch}
                    onChange={(e) => setInputWatch(e.target.value)}
                    placeholder="Tambah ekspresi pantau (e.g. angka + 10)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pantau</span>
                  </button>
                </form>

                {(!sesi || sesi.daftarEkspresiPantau.length === 0) ? (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    Belum ada ekspresi pantau. Masukkan ekspresi di atas untuk mengevaluasi saat program dijeda.
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-xs">
                    {sesi.daftarEkspresiPantau.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <div className="text-slate-300 font-medium">{p.ekspresi}</div>
                          <div className="text-xs mt-1">
                            {p.status === 'sukses' ? (
                              <span className="text-emerald-400 font-bold">{p.nilai} ({p.tipe})</span>
                            ) : p.status === 'galat' ? (
                              <span className="text-rose-400 text-[11px]">{p.galat}</span>
                            ) : (
                              <span className="text-slate-500">Belum dievaluasi</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            sesi.hapusPantau(p.id);
                            perbaruiTampilanSesi(sesi);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: BREAKPOINTS */}
            {tabAktif === 'breakpoints' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Daftar titik henti aktif pada kode sumber:
                </div>
                {daftarBP.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    Tidak ada breakpoint yang terpasang. Klik nomor baris pada editor untuk menambahkan.
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-xs">
                    {daftarBP.map((bp) => (
                      <div
                        key={bp.id}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <div>
                            <div className="text-slate-200 font-bold">
                              Baris {bp.baris} (ID #{bp.id})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Hit: {bp.jumlahHit} kali {bp.kondisi && `• Kondisi: ${bp.kondisi}`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            sesi?.hapusBreakpoint(bp.id);
                            setDaftarBP(sesi?.pengelolaBreakpoint.dapatkanSemua() || []);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Hapus breakpoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: PROFILER */}
            {tabAktif === 'profiler' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Laporan Profiling Eksekusi
                  </h3>
                  {laporanProfil && (
                    <button
                      onClick={salinJSONProfil}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {salinSukses ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{salinSukses ? 'Disalin!' : 'Salin JSON'}</span>
                    </button>
                  )}
                </div>

                {!laporanProfil ? (
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center">
                    <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 mb-3">
                      Profiler mengukur waktu total, waktu mandiri (self-time), dan penggunaan memori menggunakan timer monotonik berpresisi tinggi.
                    </p>
                    <button
                      onClick={handleJalankanProfiler}
                      disabled={sedangProfil}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition shadow-sm"
                    >
                      {sedangProfil ? 'Sedang Mengukur...' : 'Jalankan Profiler Sekarang'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {/* Ringkasan Durasi & Memori */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="text-[10px] text-slate-500">Durasi Eksekusi</div>
                        <div className="text-base font-bold text-emerald-400">
                          {laporanProfil.durasiTotalMs.toFixed(2)} ms
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="text-[10px] text-slate-500">Total Panggilan</div>
                        <div className="text-base font-bold text-indigo-400">
                          {laporanProfil.jumlahPanggilanTotal} kali
                        </div>
                      </div>
                    </div>

                    {/* Tabel Fungsi */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                            <th className="p-2">Fungsi</th>
                            <th className="p-2 text-right">Hit</th>
                            <th className="p-2 text-right">Mandiri</th>
                            <th className="p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {laporanProfil.daftarFungsi.map((f, i) => (
                            <tr key={i} className="hover:bg-slate-800/30">
                              <td className="p-2 font-medium text-slate-200">{f.namaFungsi}</td>
                              <td className="p-2 text-right text-slate-400">{f.jumlahPanggilan}</td>
                              <td className="p-2 text-right text-purple-400 font-semibold">{f.waktuMandiriMs.toFixed(2)} ms</td>
                              <td className="p-2 text-right text-emerald-400">{f.waktuTotalMs.toFixed(2)} ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Info Memori */}
                    <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{laporanProfil.memori.formatTeks || laporanProfil.memori.pesan}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: OUTPUT KONSOL */}
            {tabAktif === 'output' && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Keluaran Program & Jejak Peristiwa
                </h3>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 min-h-[160px] whitespace-pre-wrap">
                  {sesi && sesi.outputEksekusi.length > 0 ? (
                    sesi.outputEksekusi.join('\n')
                  ) : (
                    <span className="text-slate-600 italic">Belum ada keluaran dari eksekusi program.</span>
                  )}
                </div>

                {sesi && sesi.galatTerakhir && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-mono">
                    <div className="font-bold mb-1">Galat Runtime:</div>
                    <div>{sesi.galatTerakhir.message}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
