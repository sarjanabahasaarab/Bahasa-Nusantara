/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - ELF64 User Mode Application Loader
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { AddressSpace, UserRegionType } from '../memory/address-space';
import { PagePermissions, PAGE_SIZE } from '../memory/types';
import { KernelABI } from '../abi/kernel-abi';

export interface ELFProgramHeader {
  type: number;       // p_type (PT_LOAD = 1)
  flags: number;      // p_flags (PF_X=1, PF_W=2, PF_R=4)
  offset: bigint;     // p_offset
  vaddr: bigint;      // p_vaddr
  paddr: bigint;      // p_paddr
  filesz: bigint;     // p_filesz
  memsz: bigint;      // p_memsz
  align: bigint;      // p_align
}

export interface LoadedUserProgram {
  entryPoint: bigint;
  segmentCount: number;
  totalMappedBytes: number;
  dataBase?: bigint;
  bssBase?: bigint;
  bssSizeBytes?: number;
}

export class ELF64UserLoader {
  // ELF Constants
  public static readonly ELF_MAGIC = 0x464C457F; // \x7FELF
  public static readonly ELFCLASS64 = 2;
  public static readonly ELFDATA2LSB = 1;
  public static readonly EM_X86_64 = 0x3E;
  public static readonly ET_EXEC = 2;
  public static readonly ET_DYN = 3;
  public static readonly PT_LOAD = 1;

  public static readonly PF_X = 1;
  public static readonly PF_W = 2;
  public static readonly PF_R = 4;

  /**
   * Memvalidasi dan memuat biner ELF64 pengguna ke dalam AddressSpace proses yang terisolasi.
   */
  public static load(
    elfBytes: Uint8Array,
    addressSpace: AddressSpace
  ): { success: boolean; program?: LoadedUserProgram; error?: string } {
    if (elfBytes.length < 64) {
      return { success: false, error: 'Ukuran berkas ELF terlalu kecil (< 64 bytes)' };
    }

    const view = new DataView(elfBytes.buffer, elfBytes.byteOffset, elfBytes.byteLength);

    // 1. Validasi Magic Header (\x7FELF)
    const magic = view.getUint32(0, true);
    if (magic !== this.ELF_MAGIC) {
      return { success: false, error: `Magic ELF tidak sah: 0x${magic.toString(16)}` };
    }

    // 2. Validasi Kelas 64-bit dan Endianness
    const elfClass = elfBytes[4];
    if (elfClass !== this.ELFCLASS64) {
      return { success: false, error: `Hanya ELF 64-bit yang didukung (ditemukan class: ${elfClass})` };
    }

    const endianness = elfBytes[5];
    if (endianness !== this.ELFDATA2LSB) {
      return { success: false, error: 'Hanya Little-Endian yang didukung pada x86_64' };
    }

    // 3. Validasi Tipe Berkas (ET_EXEC atau ET_DYN)
    const eType = view.getUint16(16, true);
    if (eType !== this.ET_EXEC && eType !== this.ET_DYN) {
      return { success: false, error: `Tipe berkas ELF tidak didukung (e_type: ${eType})` };
    }

    // 4. Validasi Arsitektur Mesin (x86_64)
    const machine = view.getUint16(18, true);
    if (machine !== this.EM_X86_64) {
      return { success: false, error: `Arsitektur mesin tidak sah (e_machine: ${machine})` };
    }

    // 5. Validasi Entry Point (Harus berada di ruang pengguna kanonikal)
    const entryPoint = view.getBigUint64(24, true);
    if (!KernelABI.isUserPointer(entryPoint) || entryPoint < KernelABI.MEMORY_LAYOUT.userSpaceStart) {
      return {
        success: false,
        error: `Entry point di luar batas aman ruang pengguna: 0x${entryPoint.toString(16)}`,
      };
    }

    // 6. Baca Program Headers
    const phoff = Number(view.getBigUint64(32, true));
    const phentsize = view.getUint16(54, true);
    const phnum = view.getUint16(56, true);

    if (phentsize < 56 || phoff + phnum * phentsize > elfBytes.length) {
      return { success: false, error: 'Tabel Program Header berada di luar batas biner ELF' };
    }

    let loadedSegments = 0;
    let totalMappedBytes = 0;
    let bssBase: bigint | undefined;
    let bssSize = 0;

    for (let i = 0; i < phnum; i++) {
      const phOffset = phoff + i * phentsize;
      const pType = view.getUint32(phOffset + 0, true);
      const pFlags = view.getUint32(phOffset + 4, true);
      const pFileOffset = view.getBigUint64(phOffset + 8, true);
      const pVaddr = view.getBigUint64(phOffset + 16, true);
      const pFilesz = view.getBigUint64(phOffset + 32, true);
      const pMemsz = view.getBigUint64(phOffset + 40, true);
      const pAlign = view.getBigUint64(phOffset + 48, true);

      // Hanya proses segmen PT_LOAD
      if (pType !== this.PT_LOAD) {
        continue;
      }

      // Validasi keamanan: segmen tidak boleh menyentuh memori kernel atau halaman NULL
      if (!KernelABI.isUserPointer(pVaddr) || pVaddr < KernelABI.MEMORY_LAYOUT.userSpaceStart) {
        return {
          success: false,
          error: `Segmen PT_LOAD #${i} menargetkan alamat terlarang: 0x${pVaddr.toString(16)}`,
        };
      }

      const segmentEnd = pVaddr + pMemsz;
      // Cek integer overflow
      if (segmentEnd < pVaddr) {
        return {
          success: false,
          error: `Integer overflow terdeteksi pada batas segmen #${i}: p_vaddr + p_memsz`,
        };
      }

      if (!KernelABI.isUserPointer(segmentEnd)) {
        return {
          success: false,
          error: `Segmen PT_LOAD #${i} melintasi batas ruang pengguna: 0x${segmentEnd.toString(16)}`,
        };
      }

      // Validasi batas ukuran berkas biner
      if (pFileOffset + pFilesz > BigInt(elfBytes.length)) {
        return {
          success: false,
          error: `Segmen PT_LOAD #${i} offset berkas (${pFileOffset} + ${pFilesz}) melebihi ukuran biner (${elfBytes.length})`,
        };
      }

      if (pFilesz > pMemsz) {
        return {
          success: false,
          error: `p_filesz (${pFilesz}) lebih besar daripada p_memsz (${pMemsz}) pada segmen #${i}`,
        };
      }

      // Validasi Alignment (p_align harus kelipatan dua dan valid)
      if (pAlign > 1n) {
        if ((pAlign & (pAlign - 1n)) !== 0n) {
          return {
            success: false,
            error: `p_align (${pAlign}) bukan merupakan perpangkatan 2 pada segmen #${i}`,
          };
        }
      }

      // Penegakan Prinsip Keamanan W^X (Write XOR Execute):
      // Segmen pengguna tidak diizinkan memiliki izin tulis dan eksekusi secara simultan
      if ((pFlags & this.PF_W) !== 0 && (pFlags & this.PF_X) !== 0) {
        return {
          success: false,
          error: `Pelanggaran W^X pada segmen #${i}: segmen tidak boleh sekaligus Writable dan Executable`,
        };
      }

      // Deteksi Tumpang Tindih Segmen (Segment Overlap):
      for (const existing of addressSpace.getAllRegions()) {
        const existStart = existing.virtualAddress;
        const existEnd = existStart + BigInt(existing.sizeBytes);
        if (pVaddr < existEnd && segmentEnd > existStart) {
          return {
            success: false,
            error: `Tumpang tindih segmen terdeteksi antara segmen #${i} (0x${pVaddr.toString(16)}) dan region ${existing.id} (0x${existStart.toString(16)})`,
          };
        }
      }

      // Konversi p_flags (PF_R, PF_W, PF_X) ke PagePermissions
      let perms: PagePermissions = PagePermissions.USER;
      if ((pFlags & this.PF_R) !== 0) perms |= PagePermissions.READ;
      if ((pFlags & this.PF_W) !== 0) perms |= PagePermissions.WRITE;
      if ((pFlags & this.PF_X) !== 0) perms |= PagePermissions.EXECUTE;

      // Petakan halaman virtual segmen ke address space proses
      const startPage = pVaddr & ~BigInt(PAGE_SIZE - 1);
      const endPage = (segmentEnd + BigInt(PAGE_SIZE - 1)) & ~BigInt(PAGE_SIZE - 1);

      for (let page = startPage; page < endPage; page += BigInt(PAGE_SIZE)) {
        addressSpace.allocateAndMapUserPage(page, perms);
        totalMappedBytes += PAGE_SIZE;
      }

      // Tangani segmen BSS jika memsz > filesz
      if (pMemsz > pFilesz) {
        bssBase = pVaddr + pFilesz;
        bssSize = Number(pMemsz - pFilesz);
      }

      // Daftarkan ke region memori proses
      const isExec = (pFlags & this.PF_X) !== 0;
      const isWrite = (pFlags & this.PF_W) !== 0;
      const regionType = isExec
        ? UserRegionType.TEXT
        : isWrite
        ? UserRegionType.DATA
        : UserRegionType.RODATA;

      addressSpace.addRegion({
        id: `elf_seg_${i}`,
        type: regionType,
        virtualAddress: pVaddr,
        sizeBytes: Number(pMemsz),
        permissions: perms,
        isShared: false,
        name: `PT_LOAD_${regionType}`,
      });

      loadedSegments++;
    }

    if (loadedSegments === 0) {
      return { success: false, error: 'Tidak ditemukan segmen PT_LOAD yang valid dalam berkas ELF' };
    }

    return {
      success: true,
      program: {
        entryPoint,
        segmentCount: loadedSegments,
        totalMappedBytes,
        bssBase,
        bssSizeBytes: bssSize,
      },
    };
  }
}
