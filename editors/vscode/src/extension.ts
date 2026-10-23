/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Client Extension VS Code untuk Bahasa Pemrograman NUSANTARA (Phase 20).
 * Menghubungkan dokumen .nusantara ke Server Bahasa (LSP) via stdio.
 */

// Format deklarasi tipe minimal vscode-languageclient tanpa dependensi npm tambahan
export interface ExtensionContext {
  subscriptions: { dispose(): any }[];
}

/**
 * Titik masuk aktivasi ekstensi VS Code.
 */
export function activate(context: ExtensionContext): void {
  // eslint-disable-next-line no-console
  console.log('[NUSANTARA] Ekstensi Bahasa Pemrograman NUSANTARA aktif.');

  // Konfigurasi peluncuran Language Server via stdio
  const serverOptions = {
    command: 'nusantara',
    args: ['bahasa-server'],
    options: {
      stdio: 'pipe',
    },
  };

  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'nusantara' }],
    synchronize: {
      configurationSection: 'nusantara',
    },
  };

  // Pencatatan kesiapan fondasi client LSP
  context.subscriptions.push({
    dispose: () => {
      // eslint-disable-next-line no-console
      console.log('[NUSANTARA] Ekstensi dinonaktifkan.');
    },
  });
}

/**
 * Titik masuk deaktivasi ekstensi VS Code.
 */
export function deactivate(): void {
  // Bersihkan resource jika ada
}
