/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS Minimal Kernel Interface (Phase 48)
 * Modul Standar: os (alias: kernel, sistem_operasi)
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatTeks,
  buatPeta,
  NilaiFungsiBawaan,
} from '../interpreter/nilai.js';
import { InfoSimbolModul } from '../modul/jenisModul.js';
import { KernelCore } from '../runtime/os/kernel/kernel-core.js';
import { KernelHeap } from '../runtime/os/memory/kernel-heap.js';
import { VirtualFileSystem } from '../runtime/os/filesystem/vfs.js';
import { RamFS } from '../runtime/os/filesystem/ramfs.js';

function buatFungsi(nama: string, eksekusi: (argumen: NilaiRuntime[]) => NilaiRuntime): NilaiFungsiBawaan {
  return {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama,
    eksekusi,
  };
}

// Global kernel instance untuk stdlib
let kernelInstance: KernelCore | null = null;
let heapInstance: KernelHeap | null = null;
let vfsInstance: VirtualFileSystem | null = null;

function dapatkanKernel(): KernelCore {
  if (!kernelInstance) {
    kernelInstance = new KernelCore({ name: 'nusantara-os' });
    kernelInstance.boot();
  }
  return kernelInstance;
}

function dapatkanHeap(): KernelHeap {
  if (!heapInstance) {
    heapInstance = new KernelHeap();
  }
  return heapInstance;
}

function dapatkanVFS(): VirtualFileSystem {
  if (!vfsInstance) {
    vfsInstance = new VirtualFileSystem();
    const ram = new RamFS('/');
    vfsInstance.mount('/', ram);
  }
  return vfsInstance;
}

export const simbolEksporOS: Map<string, InfoSimbolModul> = new Map([
  ['versiKernel', { nama: 'versiKernel', kategori: 'fungsi', parameter: [], tipeKembalian: 'teks', minParameter: 0 }],
  ['statusKernel', { nama: 'statusKernel', kategori: 'fungsi', parameter: [], tipeKembalian: 'peta', minParameter: 0 }],
  ['alokasiMemori', { nama: 'alokasiMemori', kategori: 'fungsi', parameter: [{ nama: 'ukuran', tipe: 'bilangan' }, { nama: 'perataan', tipe: 'bilangan' }], tipeKembalian: 'bilangan', minParameter: 1, variadik: true }],
  ['bebaskanMemori', { nama: 'bebaskanMemori', kategori: 'fungsi', parameter: [{ nama: 'pointer', tipe: 'bilangan' }], tipeKembalian: 'logika', minParameter: 1 }],
  ['laporanMemori', { nama: 'laporanMemori', kategori: 'fungsi', parameter: [], tipeKembalian: 'teks', minParameter: 0 }],
  ['tulisKonsol', { nama: 'tulisKonsol', kategori: 'fungsi', parameter: [{ nama: 'pesan', tipe: 'teks' }], tipeKembalian: 'bilangan', minParameter: 1 }],
  ['dapatkanPid', { nama: 'dapatkanPid', kategori: 'fungsi', parameter: [], tipeKembalian: 'bilangan', minParameter: 0 }],
  ['yieldThread', { nama: 'yieldThread', kategori: 'fungsi', parameter: [], tipeKembalian: 'logika', minParameter: 0 }],
  ['bukaBerkas', { nama: 'bukaBerkas', kategori: 'fungsi', parameter: [{ nama: 'jalur', tipe: 'teks' }, { nama: 'mode', tipe: 'teks' }], tipeKembalian: 'bilangan', minParameter: 1, variadik: true }],
  ['bacaBerkas', { nama: 'bacaBerkas', kategori: 'fungsi', parameter: [{ nama: 'fd', tipe: 'bilangan' }, { nama: 'panjang', tipe: 'bilangan' }], tipeKembalian: 'teks', minParameter: 1, variadik: true }],
  ['tulisBerkas', { nama: 'tulisBerkas', kategori: 'fungsi', parameter: [{ nama: 'fd', tipe: 'bilangan' }, { nama: 'konten', tipe: 'teks' }], tipeKembalian: 'bilangan', minParameter: 2 }],
  ['tutupBerkas', { nama: 'tutupBerkas', kategori: 'fungsi', parameter: [{ nama: 'fd', tipe: 'bilangan' }], tipeKembalian: 'logika', minParameter: 1 }],
]);

export function buatEksporOS(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  ekspor.set(
    'versiKernel',
    buatFungsi('versiKernel', () => buatTeks('0.48.0'))
  );

  ekspor.set(
    'statusKernel',
    buatFungsi('statusKernel', () => {
      const k = dapatkanKernel();
      const ctx = k.getContext();
      const peta = new Map<string, NilaiRuntime>();
      peta.set('state', buatTeks(ctx.state));
      peta.set('ticks', buatBilangan(ctx.ticks));
      peta.set('processCount', buatBilangan(k.getScheduler().getProcessCount()));
      peta.set('threadCount', buatBilangan(k.getScheduler().getThreadCount()));
      peta.set('heapAllocated', buatBilangan(k.getHeap().getAllocatedBytes()));
      peta.set('heapFree', buatBilangan(k.getHeap().getFreeBytes()));
      return buatPeta(peta);
    })
  );

  ekspor.set(
    'alokasiMemori',
    buatFungsi('alokasiMemori', (args) => {
      const ukuran = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 1024;
      const perataan = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 8;
      const heap = dapatkanHeap();
      try {
        const addr = heap.allocate(ukuran, perataan);
        return buatBilangan(Number(addr & 0xFFFFFFFFn));
      } catch {
        return buatBilangan(-1);
      }
    })
  );

  ekspor.set(
    'bebaskanMemori',
    buatFungsi('bebaskanMemori', (args) => {
      const ptr = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : 0;
      const heap = dapatkanHeap();
      try {
        // Cek address cocok
        const addr = heap.getHeapStart() + BigInt(ptr);
        const ok = heap.free(addr);
        return buatLogika(ok);
      } catch {
        return buatLogika(false);
      }
    })
  );

  ekspor.set(
    'laporanMemori',
    buatFungsi('laporanMemori', () => {
      const heap = dapatkanHeap();
      const info = `Kernel Heap: Terpakai=${heap.getAllocatedBytes()} bytes, Bebas=${heap.getFreeBytes()} bytes, Alokasi Aktif=${heap.getActiveAllocationCount()}`;
      return buatTeks(info);
    })
  );

  ekspor.set(
    'tulisKonsol',
    buatFungsi('tulisKonsol', (args) => {
      const pesan = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : String(args[0]?.jenis ?? '');
      // Tulis ke KernelLogger
      dapatkanKernel().getLogger().info(pesan);
      return buatBilangan(pesan.length);
    })
  );

  ekspor.set(
    'dapatkanPid',
    buatFungsi('dapatkanPid', () => {
      const cur = dapatkanKernel().getScheduler().getCurrentThread();
      return buatBilangan(cur ? cur.processId : 0);
    })
  );

  ekspor.set(
    'yieldThread',
    buatFungsi('yieldThread', () => {
      dapatkanKernel().getScheduler().yield();
      return buatLogika(true);
    })
  );

  ekspor.set(
    'bukaBerkas',
    buatFungsi('bukaBerkas', (args) => {
      const jalur = args[0]?.jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : '/berkas.txt';
      const mode = (args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : 'r') as 'r' | 'w' | 'rw' | 'a';
      const fd = dapatkanVFS().open(jalur, mode);
      return buatBilangan(fd);
    })
  );

  ekspor.set(
    'bacaBerkas',
    buatFungsi('bacaBerkas', (args) => {
      const fd = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : -1;
      const len = args[1]?.jenis === JenisNilaiRuntime.BILANGAN ? args[1].nilai : 1024;
      const data = dapatkanVFS().read(fd, len);
      if (!data) return buatTeks('');
      const str = new TextDecoder().decode(data);
      return buatTeks(str);
    })
  );

  ekspor.set(
    'tulisBerkas',
    buatFungsi('tulisBerkas', (args) => {
      const fd = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : -1;
      const str = args[1]?.jenis === JenisNilaiRuntime.TEKS ? args[1].nilai : '';
      const data = new TextEncoder().encode(str);
      const written = dapatkanVFS().write(fd, data);
      return buatBilangan(written);
    })
  );

  ekspor.set(
    'tutupBerkas',
    buatFungsi('tutupBerkas', (args) => {
      const fd = args[0]?.jenis === JenisNilaiRuntime.BILANGAN ? args[0].nilai : -1;
      const ok = dapatkanVFS().close(fd);
      return buatLogika(ok);
    })
  );

  return ekspor;
}
