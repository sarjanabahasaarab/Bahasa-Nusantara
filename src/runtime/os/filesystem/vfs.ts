/**
 * VirtualFileSystem (VFS) - Abstraksi Sistem Berkas Kernel Nusantara.
 */

import {
  DirectoryEntry,
  FileDescriptor,
  FileMetadata,
  FileMode,
  FileType,
  IFileSystem,
  OpenFileHandle,
} from './types.js';

export interface MountPoint {
  prefix: string;
  fs: IFileSystem;
}

export class VirtualFileSystem {
  private mounts: MountPoint[] = [];
  private openFiles: Map<FileDescriptor, OpenFileHandle> = new Map();
  private nextFd: FileDescriptor = 3; // 0: stdin, 1: stdout, 2: stderr

  constructor() {}

  /**
   * Daftarkan (mount) sistem berkas ke path tertentu.
   */
  mount(prefix: string, fs: IFileSystem): boolean {
    const norm = this.normalize(prefix);
    // Cek apakah sudah terdaftar
    const existing = this.mounts.find((m) => m.prefix === norm);
    if (existing) return false;

    if (!fs.isMounted()) {
      fs.mount();
    }
    this.mounts.push({ prefix: norm, fs });
    // Urutkan mount points berdasarkan panjang prefix terbalik (longest match first)
    this.mounts.sort((a, b) => b.prefix.length - a.prefix.length);
    return true;
  }

  unmount(prefix: string): boolean {
    const norm = this.normalize(prefix);
    const idx = this.mounts.findIndex((m) => m.prefix === norm);
    if (idx === -1) return false;

    const [removed] = this.mounts.splice(idx, 1);
    removed.fs.unmount();
    return true;
  }

  getMounts(): readonly MountPoint[] {
    return [...this.mounts];
  }

  normalize(path: string): string {
    const parts = path.split('/').filter((p) => p.length > 0 && p !== '.');
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        if (resolved.length > 0) resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    return '/' + resolved.join('/');
  }

  /**
   * Cari filesystem dan relpath yang cocok dengan path yang diberikan.
   */
  resolve(path: string): { fs: IFileSystem; relPath: string } | null {
    const norm = this.normalize(path);
    for (const mount of this.mounts) {
      if (norm === mount.prefix) {
        return { fs: mount.fs, relPath: '/' };
      }
      if (mount.prefix === '/' && norm.startsWith('/')) {
        return { fs: mount.fs, relPath: norm };
      }
      if (norm.startsWith(mount.prefix + '/')) {
        const sub = norm.slice(mount.prefix.length);
        return { fs: mount.fs, relPath: sub.startsWith('/') ? sub : '/' + sub };
      }
    }
    return null;
  }

  open(path: string, mode: FileMode = 'r'): FileDescriptor {
    const res = this.resolve(path);
    if (!res) return -1;

    let meta = res.fs.lookup(res.relPath);
    if (!meta) {
      if (mode === 'w' || mode === 'rw' || mode === 'a') {
        const created = res.fs.create(res.relPath, 'regular');
        if (!created) return -1;
        meta = res.fs.lookup(res.relPath);
      } else {
        return -1; // Berkas tidak ditemukan
      }
    }

    const fd = this.nextFd++;
    const initialOffset = mode === 'a' ? (meta ? meta.size : 0) : 0;

    const handle: OpenFileHandle = {
      fd,
      path: this.normalize(path),
      mode,
      fs: res.fs,
      offset: initialOffset,
    };

    this.openFiles.set(fd, handle);
    return fd;
  }

  close(fd: FileDescriptor): boolean {
    if (!this.openFiles.has(fd)) return false;
    this.openFiles.delete(fd);
    return true;
  }

  read(fd: FileDescriptor, length: number): Uint8Array | null {
    const handle = this.openFiles.get(fd);
    if (!handle) return null;
    if (handle.mode === 'w') return null; // Write-only

    const res = this.resolve(handle.path);
    if (!res) return null;

    const chunk = res.fs.read(res.relPath, handle.offset, length);
    if (chunk) {
      handle.offset += chunk.byteLength;
    }
    return chunk;
  }

  write(fd: FileDescriptor, data: Uint8Array): number {
    const handle = this.openFiles.get(fd);
    if (!handle) return -1;
    if (handle.mode === 'r') return -1; // Read-only

    const res = this.resolve(handle.path);
    if (!res) return -1;

    const written = res.fs.write(res.relPath, handle.offset, data);
    if (written > 0) {
      handle.offset += written;
    }
    return written;
  }

  seek(fd: FileDescriptor, offset: number, whence: 'set' | 'cur' | 'end'): number {
    const handle = this.openFiles.get(fd);
    if (!handle) return -1;

    const res = this.resolve(handle.path);
    if (!res) return -1;

    const meta = res.fs.lookup(res.relPath);
    const size = meta ? meta.size : 0;

    let target = handle.offset;
    if (whence === 'set') target = offset;
    else if (whence === 'cur') target = handle.offset + offset;
    else if (whence === 'end') target = size + offset;

    if (target < 0) return -1;
    handle.offset = target;
    return handle.offset;
  }

  stat(path: string): FileMetadata | null {
    const res = this.resolve(path);
    if (!res) return null;
    return res.fs.stat(res.relPath);
  }

  mkdir(path: string, permissions = 0o755): boolean {
    const res = this.resolve(path);
    if (!res) return false;
    return res.fs.create(res.relPath, 'directory', permissions);
  }

  unlink(path: string): boolean {
    const res = this.resolve(path);
    if (!res) return false;
    return res.fs.remove(res.relPath);
  }

  readdir(path: string): DirectoryEntry[] | null {
    const res = this.resolve(path);
    if (!res) return null;
    return res.fs.readdir(res.relPath);
  }

  getOpenHandlesCount(): number {
    return this.openFiles.size;
  }
}
