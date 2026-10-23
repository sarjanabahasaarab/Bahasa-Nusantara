/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServerBahasaNUSANTARA } from './server';
import { PembacaBingkaiLSP, formatPesanBingkaiLSP } from './protocol/jsonrpc';
import { PembacaBerkasNode } from '../modul/pembacaBerkas';

/**
 * Menjalankan Server Bahasa NUSANTARA melalui aliran Standard Input/Output (stdio).
 * Digunakan oleh editor seperti VS Code, Neovim, Emacs, dan IntelliJ melalui LSP client.
 */
export function jalankanServerBahasaStdio(): void {
  const pembacaBerkas = new PembacaBerkasNode();
  const pembacaBingkai = new PembacaBingkaiLSP();

  const server = new ServerBahasaNUSANTARA({
    pembacaBerkas,
    direktoriKerja: process.cwd(),
    pengirimPesan: (pesanKeluar) => {
      const bingkai = formatPesanBingkaiLSP(pesanKeluar);
      process.stdout.write(bingkai);
    },
    pencatatLog: (level, pesan) => {
      process.stderr.write(`[NUSANTARA-LSP ${level}] ${pesan}\n`);
    },
  });

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', async (chunk: string) => {
    const daftarPesan = pembacaBingkai.prosesPotongan(chunk);
    for (const pesan of daftarPesan) {
      const balasan = await server.tanganiPesan(pesan);
      if (balasan) {
        const bingkaiBalasan = formatPesanBingkaiLSP(balasan);
        process.stdout.write(bingkaiBalasan);
      }
    }
  });

  process.stdin.on('end', () => {
    process.stderr.write('[NUSANTARA-LSP INFO] Stdin terputus. Server keluar.\n');
  });
}
