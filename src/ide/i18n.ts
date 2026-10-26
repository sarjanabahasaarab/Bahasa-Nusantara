/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistem Lokalisasi & Bahasa Antarmuka IDE NUSANTARA (Phase 26)
 * Mendukung Bahasa Indonesia (id) dan English (en).
 */

import { BahasaAntarmuka } from './types';

export const KAMUS_TERJEMAHAN = {
  id: {
    // Navigasi & Panel Utama
    'nav.explorer': 'Penjelajah Proyek',
    'nav.search': 'Pencarian Berkas',
    'nav.debugger': 'Penelusur (Debugger)',
    'nav.profiler': 'Pengukur Kinerja (Profiler)',
    'nav.packages': 'Manajer Paket',
    'nav.docs': 'Dokumentasi',
    'nav.settings': 'Pengaturan',

    // Bilah Aksi Editor
    'editor.run': 'Jalankan Program',
    'editor.debug': 'Mulai Penelusuran',
    'editor.stop': 'Hentikan Proses',
    'editor.format': 'Format Dokumen',
    'editor.save': 'Simpan',
    'editor.saveAll': 'Simpan Semua',
    'editor.find': 'Cari',
    'editor.replace': 'Ganti',
    'editor.commandPalette': 'Palet Perintah',
    'editor.noFileOpen': 'Tidak ada berkas yang terbuka',
    'editor.openHint': 'Pilih berkas dari penjelajah proyek atau tekan Ctrl+P untuk membuka.',

    // Penjelajah Proyek
    'explorer.title': 'PROYEK NUSANTARA',
    'explorer.newFile': 'Berkas Baru',
    'explorer.newFolder': 'Folder Baru',
    'explorer.refresh': 'Segarkan',
    'explorer.delete': 'Hapus',
    'explorer.rename': 'Ganti Nama',
    'explorer.confirmDelete': 'Apakah Anda yakin ingin menghapus "{name}"? Tindakan ini tidak dapat dibatalkan.',
    'explorer.cancel': 'Batal',
    'explorer.confirm': 'Hapus Permanen',
    'explorer.fileNamePrompt': 'Masukkan nama berkas baru (contoh: modul.nusantara):',
    'explorer.folderNamePrompt': 'Masukkan nama folder baru:',
    'explorer.renamePrompt': 'Masukkan nama baru untuk "{name}":',

    // Panel Bawah
    'panel.problems': 'Masalah (Problems)',
    'panel.output': 'Keluaran (Output)',
    'panel.terminal': 'Terminal',
    'panel.debugConsole': 'Konsol Debug',
    'panel.profilerReport': 'Laporan Profiler',
    'panel.clear': 'Bersihkan',
    'panel.noProblems': 'Tidak ada masalah atau kesalahan sintaksis terdeteksi.',

    // Debugger Panel
    'debug.title': 'PANEL PENELUSUR',
    'debug.variables': 'Variabel',
    'debug.locals': 'Lokal',
    'debug.globals': 'Global',
    'debug.watch': 'Ekspresi Pantau',
    'debug.callStack': 'Tumpukan Panggilan (Call Stack)',
    'debug.breakpoints': 'Titik Henti (Breakpoints)',
    'debug.evalPrompt': 'Evaluasi ekspresi NUSANTARA (contoh: x + 10)...',
    'debug.addWatchPrompt': 'Tambah ekspresi pantau baru...',
    'debug.noVariables': 'Program tidak sedang dijeda. Mulai debugging untuk inspeksi variabel.',
    'debug.noStack': 'Tidak ada bingkai tumpukan aktif.',
    'debug.noBreakpoints': 'Belum ada titik henti terpasang. Klik gutter di samping nomor baris.',
    'debug.continue': 'Lanjutkan (F5)',
    'debug.pause': 'Jeda',
    'debug.stepOver': 'Langkah Lewati (F10)',
    'debug.stepInto': 'Langkah Masuk (F11)',
    'debug.stepOut': 'Langkah Keluar (Shift+F11)',
    'debug.restart': 'Mulai Ulang',

    // Profiler Panel
    'profiler.title': 'PROFILER EKSEKUSI',
    'profiler.runBenchmark': 'Mulai Profiling',
    'profiler.function': 'Fungsi',
    'profiler.calls': 'Panggilan',
    'profiler.totalTime': 'Waktu Total (ms)',
    'profiler.selfTime': 'Waktu Mandiri (ms)',
    'profiler.avgTime': 'Rata-rata (ms)',
    'profiler.percent': 'Beban (%)',
    'profiler.memory': 'Penggunaan Memori Heap',
    'profiler.exportJson': 'Ekspor JSON',
    'profiler.noData': 'Belum ada data profil. Klik "Mulai Profiling" untuk mengukur kinerja kode.',

    // Pencarian
    'search.title': 'PENCARIAN PROYEK',
    'search.placeholder': 'Cari teks di seluruh berkas proyek...',
    'search.results': 'Ditemukan {count} hasil di {files} berkas',
    'search.noResults': 'Tidak ada hasil yang cocok dengan kueri.',
    'search.filter': 'Saring berkas (*.nusantara)...',

    // Pengaturan
    'settings.title': 'PENGATURAN IDE',
    'settings.editorGroup': 'Editor Kode',
    'settings.fontSize': 'Ukuran Font (px)',
    'settings.tabSize': 'Ukuran Tab (spasi)',
    'settings.wordWrap': 'Bungkus Baris (Word Wrap)',
    'settings.minimap': 'Peta Mini (Minimap)',
    'settings.autoSave': 'Simpan Otomatis Saat Sunting',
    'settings.formatOnSave': 'Format Dokumen Saat Simpan',
    'settings.languageGroup': 'Layanan Bahasa (Language Server)',
    'settings.lspEnabled': 'Aktifkan Language Server Protocol (LSP)',
    'settings.liveDiagnostics': 'Diagnostik Masalah Waktu Nyata',
    'settings.autoComplete': 'Pelengkapan Otomatis (Autocomplete)',
    'settings.hover': 'Penjelasan Saat Kursor Mengambang (Hover)',
    'settings.appearanceGroup': 'Tampilan & Bahasa',
    'settings.theme': 'Tema Antarmuka',
    'settings.themeDark': 'Gelap (Dark)',
    'settings.themeLight': 'Terang (Light)',
    'settings.themeSystem': 'Sistem (System)',
    'settings.language': 'Bahasa Antarmuka',

    // Status Bar
    'status.ready': 'Siap',
    'status.running': 'Mengeksekusi program...',
    'status.debugging': 'Sedang menelusuri (Paused)',
    'status.profiling': 'Mengukur profil performa...',
    'status.saving': 'Menyimpan berkas...',
    'status.formatted': 'Dokumen berhasil diformat',
    'status.line': 'Brs',
    'status.column': 'Kol',
    'status.utf8': 'UTF-8',
    'status.lang': 'NUSANTARA',
    'status.lspReady': 'LSP Aktif',
  },

  en: {
    // Navigation & Main Panels
    'nav.explorer': 'Project Explorer',
    'nav.search': 'Search in Files',
    'nav.debugger': 'Debugger',
    'nav.profiler': 'Profiler',
    'nav.packages': 'Package Manager',
    'nav.docs': 'Documentation',
    'nav.settings': 'Settings',

    // Editor Action Bar
    'editor.run': 'Run Program',
    'editor.debug': 'Start Debugging',
    'editor.stop': 'Stop Process',
    'editor.format': 'Format Document',
    'editor.save': 'Save',
    'editor.saveAll': 'Save All',
    'editor.find': 'Find',
    'editor.replace': 'Replace',
    'editor.commandPalette': 'Command Palette',
    'editor.noFileOpen': 'No file open',
    'editor.openHint': 'Select a file from the explorer or press Ctrl+P to open.',

    // Project Explorer
    'explorer.title': 'NUSANTARA PROJECT',
    'explorer.newFile': 'New File',
    'explorer.newFolder': 'New Folder',
    'explorer.refresh': 'Refresh',
    'explorer.delete': 'Delete',
    'explorer.rename': 'Rename',
    'explorer.confirmDelete': 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    'explorer.cancel': 'Cancel',
    'explorer.confirm': 'Permanently Delete',
    'explorer.fileNamePrompt': 'Enter new file name (e.g. module.nusantara):',
    'explorer.folderNamePrompt': 'Enter new folder name:',
    'explorer.renamePrompt': 'Enter new name for "{name}":',

    // Bottom Panel
    'panel.problems': 'Problems',
    'panel.output': 'Output',
    'panel.terminal': 'Terminal',
    'panel.debugConsole': 'Debug Console',
    'panel.profilerReport': 'Profiler Report',
    'panel.clear': 'Clear',
    'panel.noProblems': 'No problems or syntax errors detected.',

    // Debugger Panel
    'debug.title': 'DEBUGGER PANEL',
    'debug.variables': 'Variables',
    'debug.locals': 'Locals',
    'debug.globals': 'Globals',
    'debug.watch': 'Watch Expressions',
    'debug.callStack': 'Call Stack',
    'debug.breakpoints': 'Breakpoints',
    'debug.evalPrompt': 'Evaluate NUSANTARA expression (e.g. x + 10)...',
    'debug.addWatchPrompt': 'Add new watch expression...',
    'debug.noVariables': 'Program is not paused. Start debugging to inspect variables.',
    'debug.noStack': 'No active call frames.',
    'debug.noBreakpoints': 'No breakpoints set. Click the editor gutter next to line numbers.',
    'debug.continue': 'Continue (F5)',
    'debug.pause': 'Pause',
    'debug.stepOver': 'Step Over (F10)',
    'debug.stepInto': 'Step Into (F11)',
    'debug.stepOut': 'Step Out (Shift+F11)',
    'debug.restart': 'Restart',

    // Profiler Panel
    'profiler.title': 'EXECUTION PROFILER',
    'profiler.runBenchmark': 'Start Profiling',
    'profiler.function': 'Function',
    'profiler.calls': 'Calls',
    'profiler.totalTime': 'Total Time (ms)',
    'profiler.selfTime': 'Self Time (ms)',
    'profiler.avgTime': 'Average (ms)',
    'profiler.percent': 'Load (%)',
    'profiler.memory': 'Heap Memory Usage',
    'profiler.exportJson': 'Export JSON',
    'profiler.noData': 'No profile data yet. Click "Start Profiling" to measure execution performance.',

    // Search
    'search.title': 'PROJECT SEARCH',
    'search.placeholder': 'Search text across project files...',
    'search.results': 'Found {count} results in {files} files',
    'search.noResults': 'No results matching query.',
    'search.filter': 'Filter files (*.nusantara)...',

    // Settings
    'settings.title': 'IDE SETTINGS',
    'settings.editorGroup': 'Code Editor',
    'settings.fontSize': 'Font Size (px)',
    'settings.tabSize': 'Tab Size (spaces)',
    'settings.wordWrap': 'Word Wrap',
    'settings.minimap': 'Minimap',
    'settings.autoSave': 'Auto Save on Edit',
    'settings.formatOnSave': 'Format Document on Save',
    'settings.languageGroup': 'Language Services (LSP)',
    'settings.lspEnabled': 'Enable Language Server Protocol (LSP)',
    'settings.liveDiagnostics': 'Real-time Live Diagnostics',
    'settings.autoComplete': 'Autocompletion',
    'settings.hover': 'Hover Tooltips',
    'settings.appearanceGroup': 'Appearance & Language',
    'settings.theme': 'Interface Theme',
    'settings.themeDark': 'Dark',
    'settings.themeLight': 'Light',
    'settings.themeSystem': 'System',
    'settings.language': 'Interface Language',

    // Status Bar
    'status.ready': 'Ready',
    'status.running': 'Running program...',
    'status.debugging': 'Debugging (Paused)',
    'status.profiling': 'Measuring performance...',
    'status.saving': 'Saving file...',
    'status.formatted': 'Document formatted successfully',
    'status.line': 'Ln',
    'status.column': 'Col',
    'status.utf8': 'UTF-8',
    'status.lang': 'NUSANTARA',
    'status.lspReady': 'LSP Active',
  },
};

export function terjemahkan(
  kunci: keyof typeof KAMUS_TERJEMAHAN['id'] | (string & {}),
  bahasa: BahasaAntarmuka = 'id',
  parameter?: Record<string, string | number>
): string {
  const kamus = (KAMUS_TERJEMAHAN[bahasa] || KAMUS_TERJEMAHAN.id) as Record<string, string>;
  let teks = kamus[kunci] || (KAMUS_TERJEMAHAN.id as Record<string, string>)[kunci] || String(kunci);

  if (parameter) {
    for (const [k, v] of Object.entries(parameter)) {
      teks = teks.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return teks;
}
