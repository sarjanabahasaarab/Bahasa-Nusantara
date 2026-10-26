/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Studio IDE NUSANTARA — Phase 26 (Developer Tools & IDE Foundation)
 * Target Milestone: v0.26.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  Search,
  Bug,
  Activity,
  Package,
  BookOpen,
  Settings,
  Play,
  Square,
  Wrench,
  Save,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Terminal as TerminalIcon,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Copy,
  Check,
  Split,
  Sliders,
  Sparkles,
  Minimize2,
} from 'lucide-react';

import {
  SimpulBerkas,
  TabEditor,
  HasilPencarianBerkas,
  StatusEksekusiIDE,
  LogKeluaranIDE,
  BarisTokenHighlight,
  PengaturanIDE,
  TemaIDE,
  BahasaAntarmuka,
  ItemKompleksiLSP,
  InfoHoverLSP,
} from '../../ide/types';
import { Diagnostik, TingkatDiagnostik } from '../../diagnostik';
import { ManajerRuangKerja } from '../../ide/workspaceManager';
import { sorotSintaksisNUSANTARA } from '../../ide/highlighter';
import { JembatanLSP } from '../../ide/lspBridge';
import { PelariProsesIDE } from '../../ide/runner';
import { TerminalTerintegrasi, EntriTerminal } from '../../ide/terminalRunner';
import { ManajerPengaturanIDE } from '../../ide/settingsManager';
import { RegistriPerintahIDE } from '../../ide/commandRegistry';
import { terjemahkan } from '../../ide/i18n';
import { VERSI_NUSANTARA } from '../../konstanta/versi';

export const StudioIDE: React.FC = () => {
  // 1. Manajer Core
  const workspaceRef = useRef<ManajerRuangKerja>(new ManajerRuangKerja());
  const lspRef = useRef<JembatanLSP>(new JembatanLSP());
  const runnerRef = useRef<PelariProsesIDE>(new PelariProsesIDE());
  const terminalRef = useRef<TerminalTerintegrasi>(new TerminalTerintegrasi(workspaceRef.current));
  const settingsMgrRef = useRef<ManajerPengaturanIDE>(new ManajerPengaturanIDE());
  const commandRegRef = useRef<RegistriPerintahIDE>(new RegistriPerintahIDE());

  // 2. State Pengaturan
  const [pengaturan, setPengaturan] = useState<PengaturanIDE>(settingsMgrRef.current.dapatkan());
  const bahasaUI = pengaturan.tampilan.bahasa;
  const t = (kunci: any, param?: Record<string, string | number>) => terjemahkan(kunci, bahasaUI, param);

  // 3. State Navigasi & Sidebar
  type TabSidebar = 'explorer' | 'search' | 'debug' | 'profiler' | 'packages' | 'docs' | 'settings';
  const [tabSidebar, setTabSidebar] = useState<TabSidebar>('explorer');
  const [tampilkanSidebar, setTampilkanSidebar] = useState<boolean>(true);

  // 4. State Workspace & File Tree
  const [pohonBerkas, setPohonBerkas] = useState<SimpulBerkas>(workspaceRef.current.dapatkanStrukturPohon());
  const [folderTerbuka, setFolderTerbuka] = useState<Set<string>>(new Set(['/proyek', '/proyek/src', '/proyek/pengujian']));
  const [berkasDipilih, setBerkasDipilih] = useState<string>('/proyek/src/utama.nusantara');

  // 5. State Editor & Tabs
  const [tabTerbuka, setTabTerbuka] = useState<TabEditor[]>([
    {
      id: 'tab-utama',
      jalurBerkas: '/proyek/src/utama.nusantara',
      namaBerkas: 'utama.nusantara',
      konten: workspaceRef.current.bacaBerkas('/proyek/src/utama.nusantara'),
      kontenTersimpan: workspaceRef.current.bacaBerkas('/proyek/src/utama.nusantara'),
      apakahKotor: false,
      barisCursor: 1,
      kolomCursor: 1,
      riwayatUndo: [],
      riwayatRedo: [],
      waktuBuka: Date.now(),
    },
  ]);
  const [indeksTabAktif, setIndeksTabAktif] = useState<number>(0);

  // 6. Breakpoint (Jalur -> Baris[])
  const [breakpoints, setBreakpoints] = useState<Map<string, number[]>>(new Map([['/proyek/src/utama.nusantara', [5]]]));

  // 7. Diagnostics (LSP)
  const [daftarDiagnostik, setDaftarDiagnostik] = useState<Diagnostik[]>([]);

  // 8. Panel Bawah (Problems, Output, Terminal, Debug Console, Profiler)
  type TabBawah = 'problems' | 'output' | 'terminal' | 'debugConsole' | 'profiler';
  const [tabBawah, setTabBawah] = useState<TabBawah>('output');
  const [tampilkanPanelBawah, setTampilkanPanelBawah] = useState<boolean>(true);

  // 9. Output & Execution State
  const [statusEksekusi, setStatusEksekusi] = useState<StatusEksekusiIDE>('idle');
  const [daftarLog, setDaftarLog] = useState<LogKeluaranIDE[]>([]);
  const [durasiTerakhir, setDurasiTerakhir] = useState<number | null>(null);

  // 10. Profiler Result
  const [laporanProfil, setLaporanProfil] = useState<any | null>(null);

  // 11. Terminal Interactive State
  const [daftarEntriTerminal, setDaftarEntriTerminal] = useState<EntriTerminal[]>(terminalRef.current.dapatkanEntri());
  const [inputTerminal, setInputTerminal] = useState<string>('');

  // 12. Search in Files State
  const [kueriCari, setKueriCari] = useState<string>('');
  const [hasilCari, setHasilCari] = useState<HasilPencarianBerkas[]>([]);

  // 13. Command Palette Modal State
  const [bukaPalette, setBukaPalette] = useState<boolean>(false);
  const [kueriPalette, setKueriPalette] = useState<string>('');

  // 14. Find & Replace in Editor State
  const [bukaFindReplace, setBukaFindReplace] = useState<boolean>(false);
  const [teksCariEditor, setTeksCariEditor] = useState<string>('');
  const [teksGantiEditor, setTeksGantiEditor] = useState<string>('');

  // 15. Autocomplete & Hover Tooltip State
  const [daftarKompleksi, setDaftarKompleksi] = useState<ItemKompleksiLSP[]>([]);
  const [infoHover, setInfoHover] = useState<InfoHoverLSP | undefined>(undefined);

  // 16. Modal Dialogs (New file, rename, delete)
  const [dialogAksi, setDialogAksi] = useState<{
    tipe: 'buatBerkas' | 'buatFolder' | 'gantiNama' | 'hapus';
    jalurTarget: string;
    namaInput: string;
  } | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Tab aktif saat ini
  const tabAktif = tabTerbuka[indeksTabAktif] || null;

  // Sinkronisasi pendengar pengaturan
  useEffect(() => {
    const unsub = settingsMgrRef.current.berlangganan((baru) => {
      setPengaturan(baru);
    });
    return () => unsub();
  }, []);

  // Update diagnostics saat tab aktif berubah / diedit
  useEffect(() => {
    if (!tabAktif) return;
    if (pengaturan.bahasa.lspAktif && tabAktif.jalurBerkas.endsWith('.nusantara')) {
      const diag = lspRef.current.dapatkanDiagnostik(tabAktif.jalurBerkas, tabAktif.konten);
      setDaftarDiagnostik(diag);
    } else {
      setDaftarDiagnostik([]);
    }
  }, [tabAktif?.jalurBerkas, tabAktif?.konten, pengaturan.bahasa.lspAktif]);

  // Scroll otomatis terminal
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [daftarEntriTerminal]);

  // Syntax highlighting untuk tab aktif
  const barisTokenAktif: BarisTokenHighlight[] = useMemo(() => {
    if (!tabAktif) return [];
    if (tabAktif.jalurBerkas.endsWith('.nusantara')) {
      return sorotSintaksisNUSANTARA(tabAktif.konten);
    }
    // Plain text split
    return tabAktif.konten.split('\n').map((teks, idx) => ({
      nomorBaris: idx + 1,
      tokenList: [{ teks: teks || ' ', kelasCss: 'text-slate-300' }],
    }));
  }, [tabAktif?.konten, tabAktif?.jalurBerkas]);

  // Operasi File & Workspace
  const muatUlangPohon = () => {
    setPohonBerkas(workspaceRef.current.dapatkanStrukturPohon());
  };

  const bukaBerkas = (jalur: string) => {
    if (!workspaceRef.current.apakahAda(jalur)) return;
    setBerkasDipilih(jalur);
    const indeksAda = tabTerbuka.findIndex((t) => t.jalurBerkas === jalur);
    if (indeksAda >= 0) {
      setIndeksTabAktif(indeksAda);
    } else {
      const konten = workspaceRef.current.bacaBerkas(jalur);
      const nama = jalur.split('/').pop() || jalur;
      const tabBaru: TabEditor = {
        id: `tab-${Date.now()}`,
        jalurBerkas: jalur,
        namaBerkas: nama,
        konten,
        kontenTersimpan: konten,
        apakahKotor: false,
        barisCursor: 1,
        kolomCursor: 1,
        riwayatUndo: [],
        riwayatRedo: [],
        waktuBuka: Date.now(),
      };
      setTabTerbuka([...tabTerbuka, tabBaru]);
      setIndeksTabAktif(tabTerbuka.length);
    }
  };

  const tutupTab = (e: React.MouseEvent, indeks: number) => {
    e.stopPropagation();
    const tabTarget = tabTerbuka[indeks];
    if (tabTarget.apakahKotor) {
      if (!window.confirm(t('editor.unsavedChanges' as any) || 'Ada perubahan belum tersimpan. Lanjutkan menutup?')) return;
    }
    const sisa = tabTerbuka.filter((_, i) => i !== indeks);
    setTabTerbuka(sisa);
    if (indeksTabAktif >= sisa.length) {
      setIndeksTabAktif(Math.max(0, sisa.length - 1));
    }
  };

  const ubahKontenTab = (kontenBaru: string) => {
    if (!tabAktif) return;
    const diperbarui = [...tabTerbuka];
    diperbarui[indeksTabAktif] = {
      ...tabAktif,
      konten: kontenBaru,
      apakahKotor: kontenBaru !== tabAktif.kontenTersimpan,
    };
    setTabTerbuka(diperbarui);
  };

  const simpanBerkasAktif = () => {
    if (!tabAktif) return;
    let kontenUntukDisimpan = tabAktif.konten;
    if (pengaturan.editor.formatSaatSimpan && tabAktif.jalurBerkas.endsWith('.nusantara')) {
      const resFormat = lspRef.current.formatDokumen(tabAktif.konten, pengaturan.editor.ukuranTab);
      if (resFormat.berhasil) {
        kontenUntukDisimpan = resFormat.hasil;
      }
    }
    workspaceRef.current.simpanBerkas(tabAktif.jalurBerkas, kontenUntukDisimpan);
    const diperbarui = [...tabTerbuka];
    diperbarui[indeksTabAktif] = {
      ...tabAktif,
      konten: kontenUntukDisimpan,
      kontenTersimpan: kontenUntukDisimpan,
      apakahKotor: false,
    };
    setTabTerbuka(diperbarui);
    muatUlangPohon();
  };

  const simpanSemuaBerkas = () => {
    for (const tab of tabTerbuka) {
      workspaceRef.current.simpanBerkas(tab.jalurBerkas, tab.konten);
    }
    setTabTerbuka(
      tabTerbuka.map((tab) => ({
        ...tab,
        kontenTersimpan: tab.konten,
        apakahKotor: false,
      }))
    );
    muatUlangPohon();
  };

  const formatDokumenAktif = () => {
    if (!tabAktif || !tabAktif.jalurBerkas.endsWith('.nusantara')) return;
    const resFormat = lspRef.current.formatDokumen(tabAktif.konten, pengaturan.editor.ukuranTab);
    if (resFormat.berhasil) {
      ubahKontenTab(resFormat.hasil);
    }
  };

  // Toggle Breakpoint di gutter
  const toggleBreakpoint = (nomorBaris: number) => {
    if (!tabAktif) return;
    const jalur = tabAktif.jalurBerkas;
    const petaBaru = new Map(breakpoints);
    const daftar = petaBaru.get(jalur) || [];
    if (daftar.includes(nomorBaris)) {
      petaBaru.set(jalur, daftar.filter((b) => b !== nomorBaris));
    } else {
      petaBaru.set(jalur, [...daftar, nomorBaris].sort((a, b) => a - b));
    }
    setBreakpoints(petaBaru);
  };

  // Run Project
  const jalankanProyek = () => {
    if (!tabAktif) return;
    simpanBerkasAktif();
    setTabBawah('output');
    setTampilkanPanelBawah(true);
    runnerRef.current.bersihkanLog();

    const hasil = runnerRef.current.jalankanProgram(
      tabAktif.jalurBerkas,
      tabAktif.konten,
      workspaceRef.current.dapatkanDirektoriAkar()
    );
    setStatusEksekusi(hasil.status);
    setDaftarLog(hasil.keluaran);
    setDurasiTerakhir(hasil.durasiMs);
  };

  // Debug Project
  const debugProyek = () => {
    if (!tabAktif) return;
    simpanBerkasAktif();
    setTabBawah('debugConsole');
    setTampilkanPanelBawah(true);
    runnerRef.current.bersihkanLog();

    const bpList = (breakpoints.get(tabAktif.jalurBerkas) || []).map((b) => ({ baris: b }));
    const hasil = runnerRef.current.jalankanDebug(
      tabAktif.jalurBerkas,
      tabAktif.konten,
      bpList
    );
    setStatusEksekusi(hasil.status);
    setDaftarLog(hasil.keluaran);
    setDurasiTerakhir(hasil.durasiMs);
  };

  // Profiler Project
  const profilProyek = () => {
    if (!tabAktif) return;
    simpanBerkasAktif();
    setTabBawah('profiler');
    setTampilkanPanelBawah(true);
    runnerRef.current.bersihkanLog();

    const hasil = runnerRef.current.jalankanProfiler(tabAktif.jalurBerkas, tabAktif.konten);
    setStatusEksekusi(hasil.status);
    setDaftarLog(hasil.keluaran);
    setLaporanProfil(hasil.laporanProfil || null);
    setDurasiTerakhir(hasil.durasiMs);
  };

  // Hentikan Proses
  const hentikanProses = () => {
    runnerRef.current.hentikan();
    setStatusEksekusi(runnerRef.current.dapatkanStatus());
    setDaftarLog(runnerRef.current.dapatkanDaftarLog());
  };

  // Eksekusi Perintah Terminal
  const kirimPerintahTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTerminal.trim()) return;
    const perintah = inputTerminal;
    setInputTerminal('');

    terminalRef.current.eksekusiPerintah(perintah);
    setDaftarEntriTerminal(terminalRef.current.dapatkanEntri());
    muatUlangPohon();
  };

  // Cari di berkas
  const tanganiPencarian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kueriCari.trim()) {
      setHasilCari([]);
      return;
    }
    const res = workspaceRef.current.cariDalamBerkas(kueriCari);
    setHasilCari(res);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const tanganiKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S: Simpan
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          simpanSemuaBerkas();
        } else {
          simpanBerkasAktif();
        }
        return;
      }

      // Ctrl+Shift+P / Cmd+Shift+P: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setBukaPalette((prev) => !prev);
        return;
      }

      // Ctrl+F / Cmd+F: Find
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault();
        setBukaFindReplace(true);
        return;
      }

      // F5: Run
      if (e.key === 'F5' && !e.shiftKey) {
        e.preventDefault();
        jalankanProyek();
        return;
      }

      // Shift+F5: Debug
      if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        debugProyek();
        return;
      }

      // F9: Toggle breakpoint baris aktif
      if (e.key === 'F9' && tabAktif) {
        e.preventDefault();
        toggleBreakpoint(tabAktif.barisCursor);
        return;
      }

      // Escape: Tutup dialogs/palette
      if (e.key === 'Escape') {
        setBukaPalette(false);
        setBukaFindReplace(false);
        setInfoHover(undefined);
      }
    };

    window.addEventListener('keydown', tanganiKeyDown);
    return () => window.removeEventListener('keydown', tanganiKeyDown);
  }, [tabAktif, tabTerbuka, breakpoints]);

  // Tracking Kursor & Selection
  const tanganiPilihKursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (!tabAktif) return;
    const target = e.currentTarget;
    const pos = target.selectionStart;
    const barisSebelum = target.value.substring(0, pos).split('\n');
    const baris = barisSebelum.length;
    const kolom = barisSebelum[barisSebelum.length - 1].length + 1;

    const diperbarui = [...tabTerbuka];
    diperbarui[indeksTabAktif] = {
      ...tabAktif,
      barisCursor: baris,
      kolomCursor: kolom,
    };
    setTabTerbuka(diperbarui);

    // Dapatkan hover & completion LSP
    if (tabAktif.jalurBerkas.endsWith('.nusantara')) {
      const hover = lspRef.current.dapatkanHover(tabAktif.jalurBerkas, baris, kolom, tabAktif.konten);
      setInfoHover(hover);

      const comp = lspRef.current.dapatkanKompleksi(tabAktif.jalurBerkas, baris, kolom, tabAktif.konten);
      setDaftarKompleksi(comp.slice(0, 10));
    }
  };

  // Navigasi ke diagnostik
  const lompatKeDiagnostik = (d: Diagnostik) => {
    if (!tabAktif) return;
    const barisTarget = d.lokasi?.baris || 1;
    const kolomTarget = d.lokasi?.kolom || 1;

    if (textareaRef.current) {
      const baris = tabAktif.konten.split('\n');
      let offset = 0;
      for (let i = 0; i < Math.min(barisTarget - 1, baris.length); i++) {
        offset += baris[i].length + 1;
      }
      offset += Math.max(0, kolomTarget - 1);
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(offset, offset);
    }
  };

  // Render Folder Tree Rekursif
  const renderPohon = (simpul: SimpulBerkas, kedalaman: number = 0) => {
    const terbuka = folderTerbuka.has(simpul.jalur);
    const dipilih = berkasDipilih === simpul.jalur;

    if (simpul.apakahDirektori) {
      return (
        <div key={simpul.jalur}>
          <div
            onClick={() => {
              const baru = new Set(folderTerbuka);
              if (terbuka) baru.delete(simpul.jalur);
              else baru.add(simpul.jalur);
              setFolderTerbuka(baru);
            }}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer select-none rounded hover:bg-slate-800/60 ${
              dipilih ? 'bg-indigo-950/60 text-indigo-300' : 'text-slate-300'
            }`}
            style={{ paddingLeft: `${kedalaman * 14 + 8}px` }}
          >
            {terbuka ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium truncate">{simpul.nama}</span>
          </div>

          {terbuka && simpul.anak && (
            <div>{simpul.anak.map((a) => renderPohon(a, kedalaman + 1))}</div>
          )}
        </div>
      );
    }

    const adalahNusantara = simpul.nama.endsWith('.nusantara');
    const adalahConfig = simpul.nama.endsWith('.toml');

    return (
      <div
        key={simpul.jalur}
        onClick={() => bukaBerkas(simpul.jalur)}
        className={`group flex items-center justify-between px-2 py-1 text-xs cursor-pointer select-none rounded transition-colors ${
          dipilih ? 'bg-indigo-950/80 text-indigo-200 font-semibold' : 'text-slate-300 hover:bg-slate-800/50'
        }`}
        style={{ paddingLeft: `${kedalaman * 14 + 20}px` }}
      >
        <div className="flex items-center gap-1.5 truncate">
          {adalahNusantara ? (
            <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : adalahConfig ? (
            <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className="truncate">{simpul.nama}</span>
        </div>

        {/* Action icons hover */}
        <div className="hidden group-hover:flex items-center gap-1 text-slate-400">
          <button
            title={t('explorer.rename')}
            onClick={(e) => {
              e.stopPropagation();
              setDialogAksi({
                tipe: 'gantiNama',
                jalurTarget: simpul.jalur,
                namaInput: simpul.nama,
              });
            }}
            className="hover:text-amber-300 p-0.5"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            title={t('explorer.delete')}
            onClick={(e) => {
              e.stopPropagation();
              setDialogAksi({
                tipe: 'hapus',
                jalurTarget: simpul.jalur,
                namaInput: simpul.nama,
              });
            }}
            className="hover:text-rose-400 p-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] min-h-[640px] bg-slate-950 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-2xl relative font-sans">
      {/* 1. TOP MENU & ACTION BAR */}
      <header className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700/60">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xs font-bold tracking-wide text-slate-200 uppercase">
              NUSANTARA IDE <span className="text-emerald-400 font-mono">v{VERSI_NUSANTARA}</span>
            </h1>
          </div>

          {/* Quick Execution Toolbar */}
          <div className="flex items-center gap-1">
            <button
              onClick={jalankanProyek}
              disabled={statusEksekusi === 'running'}
              title={`${t('editor.run')} (F5)`}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-emerald-700/30 text-emerald-300 hover:bg-emerald-700/50 border border-emerald-600/40 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-300" />
              <span>{t('editor.run')}</span>
            </button>

            <button
              onClick={debugProyek}
              disabled={statusEksekusi === 'running'}
              title={`${t('editor.debug')} (Shift+F5)`}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-indigo-700/30 text-indigo-300 hover:bg-indigo-700/50 border border-indigo-600/40 transition disabled:opacity-50 cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>{t('editor.debug')}</span>
            </button>

            <button
              onClick={profilProyek}
              disabled={statusEksekusi === 'running'}
              title={t('nav.profiler')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-purple-700/30 text-purple-300 hover:bg-purple-700/50 border border-purple-600/40 transition disabled:opacity-50 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t('nav.profiler')}</span>
            </button>

            {statusEksekusi === 'running' && (
              <button
                onClick={hentikanProses}
                title={t('editor.stop')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-rose-900/40 text-rose-300 hover:bg-rose-900/60 border border-rose-600/40 transition cursor-pointer"
              >
                <Square className="w-3 h-3 fill-rose-400" />
                <span>{t('editor.stop')}</span>
              </button>
            )}

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              onClick={formatDokumenAktif}
              title={`${t('editor.format')} (Shift+Alt+F)`}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              <Wrench className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">{t('editor.format')}</span>
            </button>

            <button
              onClick={simpanBerkasAktif}
              title={`${t('editor.save')} (Ctrl+S)`}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              <Save className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">{t('editor.save')}</span>
            </button>
          </div>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-2">
          {/* Command Palette Button */}
          <button
            onClick={() => setBukaPalette(true)}
            title="Command Palette (Ctrl+Shift+P)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px] text-slate-400">Ctrl+Shift+P</span>
          </button>

          {/* Language Switch */}
          <button
            onClick={() => {
              const ganti: BahasaAntarmuka = bahasaUI === 'id' ? 'en' : 'id';
              settingsMgrRef.current.setBahasa(ganti);
            }}
            title="Switch Language"
            className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
          >
            {bahasaUI.toUpperCase()}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (Icon Strip) */}
        <aside className="w-12 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-2 shrink-0 select-none justify-between">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                if (tabSidebar === 'explorer' && tampilkanSidebar) setTampilkanSidebar(false);
                else {
                  setTabSidebar('explorer');
                  setTampilkanSidebar(true);
                }
              }}
              title={t('nav.explorer')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tabSidebar === 'explorer' && tampilkanSidebar ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Folder className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (tabSidebar === 'search' && tampilkanSidebar) setTampilkanSidebar(false);
                else {
                  setTabSidebar('search');
                  setTampilkanSidebar(true);
                }
              }}
              title={t('nav.search')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tabSidebar === 'search' && tampilkanSidebar ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (tabSidebar === 'debug' && tampilkanSidebar) setTampilkanSidebar(false);
                else {
                  setTabSidebar('debug');
                  setTampilkanSidebar(true);
                }
              }}
              title={t('nav.debugger')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tabSidebar === 'debug' && tampilkanSidebar ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bug className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (tabSidebar === 'profiler' && tampilkanSidebar) setTampilkanSidebar(false);
                else {
                  setTabSidebar('profiler');
                  setTampilkanSidebar(true);
                }
              }}
              title={t('nav.profiler')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tabSidebar === 'profiler' && tampilkanSidebar ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (tabSidebar === 'packages' && tampilkanSidebar) setTampilkanSidebar(false);
                else {
                  setTabSidebar('packages');
                  setTampilkanSidebar(true);
                }
              }}
              title={t('nav.packages')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tabSidebar === 'packages' && tampilkanSidebar ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                if (tabSidebar === 'docs' && tampilkanSidebar) setTampilkanSidebar(false);
                else {
                  setTabSidebar('docs');
                  setTampilkanSidebar(true);
                }
              }}
              title={t('nav.docs')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tabSidebar === 'docs' && tampilkanSidebar ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (tabSidebar === 'settings' && tampilkanSidebar) setTampilkanSidebar(false);
                else {
                  setTabSidebar('settings');
                  setTampilkanSidebar(true);
                }
              }}
              title={t('nav.settings')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tabSidebar === 'settings' && tampilkanSidebar ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Sidebar Panel Drawer */}
        {tampilkanSidebar && (
          <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 select-none overflow-hidden">
            {/* Explorer Drawer */}
            {tabSidebar === 'explorer' && (
              <div className="flex-1 flex flex-col h-full">
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                    {t('explorer.title')}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() =>
                        setDialogAksi({
                          tipe: 'buatBerkas',
                          jalurTarget: '/proyek/src',
                          namaInput: 'baru.nusantara',
                        })
                      }
                      title={t('explorer.newFile')}
                      className="hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDialogAksi({
                          tipe: 'buatFolder',
                          jalurTarget: '/proyek',
                          namaInput: 'folder_baru',
                        })
                      }
                      title={t('explorer.newFolder')}
                      className="hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={muatUlangPohon}
                      title={t('explorer.refresh')}
                      className="hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2 px-1">
                  {renderPohon(pohonBerkas)}
                </div>
              </div>
            )}

            {/* Search Drawer */}
            {tabSidebar === 'search' && (
              <div className="flex-1 flex flex-col h-full p-3">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300 mb-2">
                  {t('nav.search')}
                </span>
                <form onSubmit={tanganiPencarian} className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('search.placeholder' as any) || 'Cari teks dalam proyek...'}
                      value={kueriCari}
                      onChange={(e) => setKueriCari(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button type="submit" className="absolute right-2 top-2 text-slate-400 hover:text-white">
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2">
                  <div className="text-[11px] text-slate-400">
                    {hasilCari.length} hasil ditemukan
                  </div>
                  {hasilCari.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        bukaBerkas(item.jalurBerkas);
                      }}
                      className="p-2 rounded bg-slate-950/60 border border-slate-800 hover:border-indigo-600/50 cursor-pointer text-xs"
                    >
                      <div className="font-semibold text-indigo-300 truncate">{item.jalurBerkas}</div>
                      <div className="text-[11px] text-slate-400">Baris {item.baris}:{item.kolom}</div>
                      <div className="font-mono text-[11px] text-slate-300 truncate bg-slate-900/80 px-1 py-0.5 rounded mt-1">
                        {item.cuplikanTeks}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Drawer */}
            {tabSidebar === 'debug' && (
              <div className="flex-1 flex flex-col h-full p-3 space-y-3 overflow-y-auto">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  {t('debug.title')}
                </span>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                    <span>{t('debug.breakpoints')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Array.from(breakpoints.values()).flat().length} aktif
                    </span>
                  </div>
                  {Array.from(breakpoints.entries()).map(([jalur, barisList]) => (
                    <div key={jalur} className="text-[11px] text-slate-300">
                      <div className="font-mono text-[10px] text-slate-400 truncate">{jalur}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {barisList.map((b) => (
                          <span
                            key={b}
                            onClick={() => toggleBreakpoint(b)}
                            className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 cursor-pointer hover:bg-rose-900"
                          >
                            Baris {b} ×
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <div className="font-semibold text-slate-200">{t('debug.callStack')}</div>
                  <div className="text-[11px] text-slate-400 italic">
                    {statusEksekusi === 'paused'
                      ? 'Bingkai tumpukan aktif: frame 0 (utama)'
                      : 'Debugger tidak sedang dalam posisi jeda.'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <div className="font-semibold text-slate-200">{t('debug.variables')}</div>
                  <div className="text-[11px] text-slate-400 italic">
                    Variabel lokal dan pemantau akan muncul saat breakpoint tercapai.
                  </div>
                </div>
              </div>
            )}

            {/* Profiler Drawer */}
            {tabSidebar === 'profiler' && (
              <div className="flex-1 flex flex-col h-full p-3 space-y-3 overflow-y-auto">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  {t('nav.profiler')}
                </span>
                <button
                  onClick={profilProyek}
                  className="w-full py-1.5 text-xs font-medium rounded bg-purple-700/40 text-purple-200 border border-purple-600/50 hover:bg-purple-700/60 cursor-pointer"
                >
                  Jalankan Profiling Baru
                </button>
                {laporanProfil ? (
                  <div className="text-xs space-y-2">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Total Waktu:</div>
                      <div className="text-emerald-400 font-mono font-bold">
                        {laporanProfil.waktuTotalMs ?? 0} ms
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Fungsi Terprofil:</div>
                      <div className="text-slate-200 font-mono">
                        {laporanProfil.fungsi?.length || 0} fungsi
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Belum ada data profil. Jalankan profiler untuk melihat eksekusi dan alokasi memori.
                  </div>
                )}
              </div>
            )}

            {/* Packages Drawer */}
            {tabSidebar === 'packages' && (
              <div className="flex-1 flex flex-col h-full p-3 space-y-3 overflow-y-auto">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  {t('nav.packages')} (Phase 27)
                </span>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-amber-300">nusantara.toml &amp; nusantara.lock</div>
                  <div className="text-[11px] text-slate-400">
                    Ekosistem paket dan dependency management resmi NUSANTARA v{VERSI_NUSANTARA}.
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      onClick={() => bukaBerkas('/proyek/nusantara.toml')}
                      className="w-full text-left px-2.5 py-1 text-[11px] rounded bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/60 cursor-pointer flex items-center justify-between"
                    >
                      <span>Buka nusantara.toml</span>
                      <span className="text-[10px] text-slate-500 font-mono">manifest</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!workspaceRef.current.apakahAda('/proyek/nusantara.lock')) {
                          workspaceRef.current.simpanBerkas(
                            '/proyek/nusantara.lock',
                            '# Berkas kunci dependensi resmi NUSANTARA v0.27.0\nversi_format = 1\n'
                          );
                        }
                        bukaBerkas('/proyek/nusantara.lock');
                      }}
                      className="w-full text-left px-2.5 py-1 text-[11px] rounded bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/60 cursor-pointer flex items-center justify-between"
                    >
                      <span>Buka nusantara.lock</span>
                      <span className="text-[10px] text-slate-500 font-mono">lockfile</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <span className="font-semibold text-slate-300 text-[11px] block">Perintah Terminal Terpadu:</span>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        setTabBawah('terminal');
                        setTampilkanPanelBawah(true);
                        terminalRef.current.eksekusiPerintah('nusantara pasang');
                        setDaftarEntriTerminal(terminalRef.current.dapatkanEntri());
                        muatUlangPohon();
                      }}
                      className="w-full text-left px-2.5 py-1 text-[11px] rounded bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 border border-violet-800/50 cursor-pointer"
                    >
                      $ nusantara pasang
                    </button>
                    <button
                      onClick={() => {
                        setTabBawah('terminal');
                        setTampilkanPanelBawah(true);
                        terminalRef.current.eksekusiPerintah('nusantara audit');
                        setDaftarEntriTerminal(terminalRef.current.dapatkanEntri());
                        muatUlangPohon();
                      }}
                      className="w-full text-left px-2.5 py-1 text-[11px] rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 cursor-pointer"
                    >
                      $ nusantara audit
                    </button>
                    <button
                      onClick={() => {
                        setTabBawah('terminal');
                        setTampilkanPanelBawah(true);
                        terminalRef.current.eksekusiPerintah('nusantara pohon');
                        setDaftarEntriTerminal(terminalRef.current.dapatkanEntri());
                        muatUlangPohon();
                      }}
                      className="w-full text-left px-2.5 py-1 text-[11px] rounded bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-800/50 cursor-pointer"
                    >
                      $ nusantara pohon
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Documentation Drawer */}
            {tabSidebar === 'docs' && (
              <div className="flex-1 flex flex-col h-full p-3 space-y-3 overflow-y-auto">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  {t('nav.docs')}
                </span>
                <div className="space-y-1.5 text-xs">
                  <button
                    onClick={() => bukaBerkas('/proyek/docs/panduan.md')}
                    className="w-full text-left p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer"
                  >
                    📖 Panduan Proyek
                  </button>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="font-semibold text-slate-300">Dokumentasi Standar:</div>
                    <div>• Tipe: bilangan, desimal, teks, boolean, daftar, peta</div>
                    <div>• Kontrol: jika-maka-selain, untuk, selama</div>
                    <div>• Modul: impor & ekspor fungsi</div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Drawer */}
            {tabSidebar === 'settings' && (
              <div className="flex-1 flex flex-col h-full p-3 space-y-3 overflow-y-auto text-xs">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  {t('nav.settings')}
                </span>

                <div className="space-y-1">
                  <label className="text-slate-400">Bahasa Antarmuka (Language)</label>
                  <select
                    value={pengaturan.tampilan.bahasa}
                    onChange={(e) => settingsMgrRef.current.setBahasa(e.target.value as BahasaAntarmuka)}
                    className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Tema Warna</label>
                  <select
                    value={pengaturan.tampilan.tema}
                    onChange={(e) => settingsMgrRef.current.setTema(e.target.value as TemaIDE)}
                    className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="dark">Gelap (Dark)</option>
                    <option value="light">Terang (Light)</option>
                    <option value="system">Sistem (System)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Ukuran Font: {pengaturan.editor.ukuranFont}px</label>
                  <input
                    type="range"
                    min="12"
                    max="22"
                    value={pengaturan.editor.ukuranFont}
                    onChange={(e) => settingsMgrRef.current.setUkuranFont(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => settingsMgrRef.current.resetKeBawaan()}
                    className="w-full py-1 text-[11px] rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900 cursor-pointer"
                  >
                    Reset ke Pengaturan Awal
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* 3. CENTER / MAIN EDITOR AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
          {/* Editor Tab Bar */}
          <div className="h-9 bg-slate-900/80 border-b border-slate-800 flex items-center px-1 overflow-x-auto shrink-0 select-none">
            {tabTerbuka.map((tab, idx) => {
              const aktif = idx === indeksTabAktif;
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setIndeksTabAktif(idx);
                    setBerkasDipilih(tab.jalurBerkas);
                  }}
                  className={`group flex items-center gap-2 px-3 py-1.5 text-xs border-r border-slate-800 cursor-pointer rounded-t transition-colors ${
                    aktif
                      ? 'bg-slate-950 text-indigo-300 border-t-2 border-t-indigo-500 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[140px]">{tab.namaBerkas}</span>
                  {tab.apakahKotor && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  <button
                    onClick={(e) => tutupTab(e, idx)}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 opacity-60 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Breadcrumb Bar & Find/Replace Header */}
          <div className="h-7 bg-slate-925 px-3 border-b border-slate-850 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-1 truncate font-mono">
              <span>proyek</span>
              <span>/</span>
              <span className="text-slate-200">{tabAktif?.jalurBerkas.replace('/proyek/', '') || 'tidak ada berkas'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setBukaFindReplace(!bukaFindReplace)}
                className="hover:text-slate-200 cursor-pointer text-[10px] px-1.5 py-0.5 rounded bg-slate-800"
              >
                Ctrl+F
              </button>
            </div>
          </div>

          {/* In-Editor Find & Replace Toolbar */}
          {bukaFindReplace && (
            <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-2 text-xs shrink-0 select-none">
              <input
                type="text"
                placeholder="Cari..."
                value={teksCariEditor}
                onChange={(e) => setTeksCariEditor(e.target.value)}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 w-44"
              />
              <input
                type="text"
                placeholder="Ganti dengan..."
                value={teksGantiEditor}
                onChange={(e) => setTeksGantiEditor(e.target.value)}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 w-44"
              />
              <button
                onClick={() => {
                  if (!tabAktif || !teksCariEditor) return;
                  const baru = tabAktif.konten.replace(new RegExp(teksCariEditor, 'g'), teksGantiEditor);
                  ubahKontenTab(baru);
                }}
                className="px-2 py-1 rounded bg-indigo-700 text-white hover:bg-indigo-600 cursor-pointer"
              >
                Ganti Semua
              </button>
              <button
                onClick={() => setBukaFindReplace(false)}
                className="p-1 hover:text-white text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Code Editor View (Split Gutter + Textarea / Highlighting) */}
          <div className="flex-1 flex overflow-hidden relative">
            {tabAktif ? (
              <div className="flex-1 flex overflow-auto relative font-mono" style={{ fontSize: `${pengaturan.editor.ukuranFont}px` }}>
                {/* Breakpoint & Line Number Gutter */}
                <div className="w-14 bg-slate-900/60 border-r border-slate-800 py-3 select-none shrink-0 flex flex-col text-right pr-2">
                  {barisTokenAktif.map((baris) => {
                    const noBaris = baris.nomorBaris;
                    const memilikiBp = (breakpoints.get(tabAktif.jalurBerkas) || []).includes(noBaris);
                    return (
                      <div
                        key={noBaris}
                        onClick={() => toggleBreakpoint(noBaris)}
                        className="group flex items-center justify-between h-6 px-1 cursor-pointer hover:bg-slate-800/80 rounded"
                      >
                        <span className="w-2.5 h-2.5 flex items-center justify-center">
                          {memilikiBp ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-rose-500/0 group-hover:bg-rose-500/30" />
                          )}
                        </span>
                        <span className="text-slate-500 text-[11px] leading-6">{noBaris}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Editor Textarea with Realtime Lexer Token Rendering Background */}
                <div className="flex-1 relative h-full">
                  {/* Backdrop Highlighted Tokens (Layer Belakang) */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 p-3 pointer-events-none whitespace-pre font-mono leading-6 overflow-hidden text-transparent select-none"
                  >
                    {barisTokenAktif.map((baris) => (
                      <div key={baris.nomorBaris} className="h-6">
                        {baris.tokenList.map((tItem, idx) => (
                          <span key={idx} className={tItem.kelasCss}>
                            {tItem.teks}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Foreground Editable Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={tabAktif.konten}
                    onChange={(e) => ubahKontenTab(e.target.value)}
                    onSelect={tanganiPilihKursor}
                    onKeyUp={tanganiPilihKursor}
                    onClick={tanganiPilihKursor}
                    spellCheck={false}
                    className="w-full h-full p-3 font-mono leading-6 bg-transparent text-slate-100 caret-emerald-400 focus:outline-none resize-none overflow-auto relative z-10 selection:bg-indigo-900/60"
                  />
                </div>

                {/* Hover Tooltip Popup (LSP) */}
                {infoHover && (
                  <div className="absolute top-10 right-10 max-w-sm p-2.5 rounded-lg bg-slate-900 border border-indigo-500/50 shadow-xl z-20 text-xs">
                    <div className="font-bold text-indigo-300 font-mono mb-1">Informasi Simbol (LSP)</div>
                    <div className="text-slate-300 whitespace-pre-wrap">{infoHover.isi}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <FileCode className="w-12 h-12 mb-3 text-slate-700" />
                <p className="text-sm">Pilih berkas dari Penjelajah Proyek untuk mulai menyunting.</p>
              </div>
            )}
          </div>

          {/* 4. BOTTOM PANEL (Problems, Output, Terminal, Debug Console, Profiler) */}
          {tampilkanPanelBawah && (
            <div className="h-56 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0">
              {/* Tab Header Panel Bawah */}
              <div className="h-8 bg-slate-850 px-3 border-b border-slate-800 flex items-center justify-between select-none">
                <div className="flex items-center gap-4 text-xs font-medium">
                  <button
                    onClick={() => setTabBawah('problems')}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      tabBawah === 'problems' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-0.5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('panel.problems')}</span>
                    {daftarDiagnostik.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 text-[10px] rounded-full border border-rose-800">
                        {daftarDiagnostik.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setTabBawah('output')}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      tabBawah === 'output' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-0.5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('panel.output')}</span>
                  </button>

                  <button
                    onClick={() => setTabBawah('terminal')}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      tabBawah === 'terminal' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-0.5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('panel.terminal')}</span>
                  </button>

                  <button
                    onClick={() => setTabBawah('debugConsole')}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      tabBawah === 'debugConsole' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-0.5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('panel.debugConsole')}</span>
                  </button>

                  <button
                    onClick={() => setTabBawah('profiler')}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      tabBawah === 'profiler' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-0.5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t('panel.profilerReport')}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTampilkanPanelBawah(false)}
                    title="Tutup Panel Bawah"
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Isi Panel Bawah */}
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                {/* 1. Problems */}
                {tabBawah === 'problems' && (
                  <div className="space-y-1.5">
                    {daftarDiagnostik.length === 0 ? (
                      <div className="text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('panel.noProblems')}</span>
                      </div>
                    ) : (
                      daftarDiagnostik.map((diag, idx) => (
                        <div
                          key={idx}
                          onClick={() => lompatKeDiagnostik(diag)}
                          className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-800/80 cursor-pointer text-slate-200"
                        >
                          {diag.tingkat === TingkatDiagnostik.KESALAHAN ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          ) : diag.tingkat === TingkatDiagnostik.PERINGATAN ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="font-semibold">{diag.pesan}</span>
                            {diag.lokasi && (
                              <span className="text-slate-400 ml-2 font-mono text-[11px]">
                                [Baris {diag.lokasi.baris}:{diag.lokasi.kolom}]
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. Output */}
                {tabBawah === 'output' && (
                  <div className="flex flex-col h-full justify-between">
                    <div className="space-y-1 overflow-y-auto">
                      {daftarLog.length === 0 ? (
                        <div className="text-slate-500 italic">Keluaran program akan tampil di sini setelah dijalankan.</div>
                      ) : (
                        daftarLog.map((item) => (
                          <div
                            key={item.id}
                            className={`leading-5 ${
                              item.aliran === 'stderr'
                                ? 'text-rose-400'
                                : item.aliran === 'info'
                                ? 'text-cyan-400'
                                : 'text-slate-200'
                            }`}
                          >
                            [{item.waktu}] {item.pesan}
                          </div>
                        ))
                      )}
                    </div>
                    {durasiTerakhir !== null && (
                      <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex items-center gap-4">
                        <span>Durasi: <strong className="text-emerald-400">{durasiTerakhir.toFixed(1)} ms</strong></span>
                        <span>Status: <strong className="text-indigo-400">{statusEksekusi}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Integrated Terminal */}
                {tabBawah === 'terminal' && (
                  <div className="flex flex-col h-full justify-between">
                    <div className="space-y-1 overflow-y-auto">
                      {daftarEntriTerminal.map((item) => (
                        <div
                          key={item.id}
                          className={`leading-5 whitespace-pre-wrap ${
                            item.tipe === 'perintah'
                              ? 'text-emerald-400 font-bold'
                              : item.tipe === 'galat'
                              ? 'text-rose-400'
                              : item.tipe === 'sistem'
                              ? 'text-cyan-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {item.teks}
                        </div>
                      ))}
                      <div ref={terminalBottomRef} />
                    </div>

                    <form onSubmit={kirimPerintahTerminal} className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-800">
                      <span className="text-emerald-400 font-bold">$</span>
                      <input
                        type="text"
                        value={inputTerminal}
                        onChange={(e) => setInputTerminal(e.target.value)}
                        placeholder="nusantara jalankan src/utama.nusantara / bantuan / bersih ..."
                        className="flex-1 bg-transparent text-slate-100 focus:outline-none font-mono"
                      />
                    </form>
                  </div>
                )}

                {/* 4. Debug Console */}
                {tabBawah === 'debugConsole' && (
                  <div className="space-y-1">
                    <div className="text-slate-400 italic mb-2">
                      Evaluator Ekspresi Penelusur NUSANTARA (Phase 25).
                    </div>
                    <div className="text-slate-300">
                      Status Penelusur: <strong className="text-indigo-400">{statusEksekusi}</strong>
                    </div>
                  </div>
                )}

                {/* 5. Profiler Report */}
                {tabBawah === 'profiler' && (
                  <div className="space-y-2">
                    {laporanProfil ? (
                      <div>
                        <div className="text-slate-300 font-bold mb-2">
                          Ringkasan Eksekusi Profiler: Total {laporanProfil.waktuTotalMs ?? 0} ms
                        </div>
                        <div className="space-y-1">
                          {(laporanProfil.fungsi || []).map((f: any, idx: number) => (
                            <div key={idx} className="p-1.5 rounded bg-slate-950 flex justify-between border border-slate-800">
                              <span className="text-indigo-300 font-bold">{f.nama}</span>
                              <span className="text-slate-400">Panggilan: {f.panggilan} | Waktu: {f.totalWaktuMs} ms</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">Belum ada data profil terkumpul. Tekan tombol Profiler di bilah atas untuk memulai.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. STATUS BAR */}
          <footer className="h-6 bg-indigo-950 border-t border-indigo-900/60 flex items-center justify-between px-3 text-[11px] text-indigo-200 select-none shrink-0 font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                NUSANTARA IDE Foundation
              </span>
              <span>
                Baris: <strong>{tabAktif?.barisCursor || 1}</strong>, Kolom: <strong>{tabAktif?.kolomCursor || 1}</strong>
              </span>
              <span>UTF-8</span>
              <span>LF</span>
            </div>

            <div className="flex items-center gap-4">
              <span>{tabAktif?.jalurBerkas.endsWith('.nusantara') ? 'Bahasa NUSANTARA' : 'Plain Text'}</span>
              <span>LSP: {pengaturan.bahasa.lspAktif ? 'Aktif' : 'Nonaktif'}</span>
              <span>v{VERSI_NUSANTARA}</span>
            </div>
          </footer>
        </main>
      </div>

      {/* 6. MODAL: COMMAND PALETTE */}
      {bukaPalette && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-start justify-center pt-16">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Ketik nama perintah atau pintasan..."
                value={kueriPalette}
                onChange={(e) => setKueriPalette(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 focus:outline-none"
              />
              <button onClick={() => setBukaPalette(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {commandRegRef.current.cari(kueriPalette).map((cmd) => (
                <div
                  key={cmd.id}
                  onClick={() => {
                    setBukaPalette(false);
                    if (cmd.id === 'proyek.jalankan') jalankanProyek();
                    else if (cmd.id === 'proyek.debug') debugProyek();
                    else if (cmd.id === 'proyek.profiler') profilProyek();
                    else if (cmd.id === 'editor.format') formatDokumenAktif();
                    else if (cmd.id === 'file.simpan') simpanBerkasAktif();
                    else if (cmd.id === 'file.simpanSemua') simpanSemuaBerkas();
                    else if (cmd.id === 'tampilan.terminal') {
                      setTabBawah('terminal');
                      setTampilkanPanelBawah(true);
                    }
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{t(cmd.judul)}</span>
                    {cmd.kategori && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {cmd.kategori}
                      </span>
                    )}
                  </div>
                  {cmd.pintasan && (
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      {cmd.pintasan}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: FILE ACTION (New file, New folder, Rename, Delete) */}
      {dialogAksi && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              {dialogAksi.tipe === 'buatBerkas' && t('explorer.newFile')}
              {dialogAksi.tipe === 'buatFolder' && t('explorer.newFolder')}
              {dialogAksi.tipe === 'gantiNama' && t('explorer.rename')}
              {dialogAksi.tipe === 'hapus' && t('explorer.delete')}
            </h3>

            {dialogAksi.tipe === 'hapus' ? (
              <p className="text-xs text-rose-300">
                {t('explorer.confirmDelete', { name: dialogAksi.namaInput })}
              </p>
            ) : (
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Nama Entitas:</label>
                <input
                  type="text"
                  autoFocus
                  value={dialogAksi.namaInput}
                  onChange={(e) => setDialogAksi({ ...dialogAksi, namaInput: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogAksi(null)}
                className="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                {t('explorer.cancel')}
              </button>
              <button
                onClick={() => {
                  const d = dialogAksi;
                  if (d.tipe === 'buatBerkas') {
                    const jalurBaru = `${d.jalurTarget}/${d.namaInput}`.replace(/\/+/g, '/');
                    workspaceRef.current.buatBerkas(jalurBaru, '// Berkas baru NUSANTARA\n');
                    bukaBerkas(jalurBaru);
                  } else if (d.tipe === 'buatFolder') {
                    const jalurBaru = `${d.jalurTarget}/${d.namaInput}`.replace(/\/+/g, '/');
                    workspaceRef.current.buatFolder(jalurBaru);
                  } else if (d.tipe === 'gantiNama') {
                    const bagian = d.jalurTarget.split('/');
                    bagian.pop();
                    const jalurBaru = `${bagian.join('/')}/${d.namaInput}`.replace(/\/+/g, '/');
                    workspaceRef.current.gantiNama(d.jalurTarget, jalurBaru);
                  } else if (d.tipe === 'hapus') {
                    workspaceRef.current.hapus(d.jalurTarget);
                    setTabTerbuka(tabTerbuka.filter((tab) => tab.jalurBerkas !== d.jalurTarget));
                  }
                  muatUlangPohon();
                  setDialogAksi(null);
                }}
                className="px-3 py-1.5 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
              >
                {t('explorer.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioIDE;
