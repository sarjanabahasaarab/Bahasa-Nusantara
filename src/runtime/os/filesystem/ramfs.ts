/**
 * RamFS - Implementasi In-Memory Filesystem untuk Kernel Nusantara.
 */

import {
  DirectoryEntry,
  FileMetadata,
  FileType,
  IFileSystem,
} from './types.js';

interface RamFSNode {
  inode: number;
  name: string;
  type: FileType;
  permissions: number;
  createdAt: number;
  modifiedAt: number;
  data: Uint8Array; // data untuk regular file
  children: Map<string, RamFSNode>; // untuk directory
}

export class RamFS implements IFileSystem {
  readonly name = 'ramfs';
  readonly rootPath: string;

  private mounted = false;
  private nextInode = 1;
  private root: RamFSNode;

  constructor(rootPath = '/') {
    this.rootPath = this.normalizePath(rootPath);
    this.root = {
      inode: this.nextInode++,
      name: '',
      type: 'directory',
      permissions: 0o755,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      data: new Uint8Array(0),
      children: new Map(),
    };
  }

  mount(): boolean {
    this.mounted = true;
    return true;
  }

  unmount(): boolean {
    this.mounted = false;
    return true;
  }

  isMounted(): boolean {
    return this.mounted;
  }

  private normalizePath(p: string): string {
    const segments = p.split('/').filter((s) => s.length > 0 && s !== '.');
    const resolved: string[] = [];
    for (const seg of segments) {
      if (seg === '..') {
        if (resolved.length > 0) resolved.pop();
      } else {
        resolved.push(seg);
      }
    }
    return '/' + resolved.join('/');
  }

  private findNode(path: string): RamFSNode | null {
    const norm = this.normalizePath(path);
    if (norm === '/' || norm === '') return this.root;

    const parts = norm.split('/').filter(Boolean);
    let curr = this.root;

    for (const part of parts) {
      if (curr.type !== 'directory') return null;
      const child = curr.children.get(part);
      if (!child) return null;
      curr = child;
    }
    return curr;
  }

  private findParentNode(path: string): { parent: RamFSNode; basename: string } | null {
    const norm = this.normalizePath(path);
    if (norm === '/' || norm === '') return null;

    const parts = norm.split('/').filter(Boolean);
    const basename = parts.pop()!;
    let curr = this.root;

    for (const part of parts) {
      if (curr.type !== 'directory') return null;
      const child = curr.children.get(part);
      if (!child) return null;
      curr = child;
    }
    return { parent: curr, basename };
  }

  lookup(path: string): FileMetadata | null {
    const node = this.findNode(path);
    if (!node) return null;
    return {
      inode: node.inode,
      name: node.name,
      type: node.type,
      size: node.type === 'directory' ? node.children.size : node.data.byteLength,
      permissions: node.permissions,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
    };
  }

  stat(path: string): FileMetadata | null {
    return this.lookup(path);
  }

  create(path: string, type: FileType, permissions = 0o644): boolean {
    const loc = this.findParentNode(path);
    if (!loc) return false;
    if (loc.parent.type !== 'directory') return false;
    if (loc.parent.children.has(loc.basename)) return false; // Berkas sudah ada

    const now = Date.now();
    const node: RamFSNode = {
      inode: this.nextInode++,
      name: loc.basename,
      type,
      permissions,
      createdAt: now,
      modifiedAt: now,
      data: new Uint8Array(0),
      children: new Map(),
    };
    loc.parent.children.set(loc.basename, node);
    loc.parent.modifiedAt = now;
    return true;
  }

  read(path: string, offset: number, length: number): Uint8Array | null {
    const node = this.findNode(path);
    if (!node || node.type !== 'regular') return null;

    if (offset >= node.data.byteLength) {
      return new Uint8Array(0);
    }
    const end = Math.min(node.data.byteLength, offset + length);
    return node.data.slice(offset, end);
  }

  write(path: string, offset: number, data: Uint8Array): number {
    let node = this.findNode(path);
    if (!node) {
      // Buat berkas baru secara otomatis
      if (!this.create(path, 'regular')) return -1;
      node = this.findNode(path);
      if (!node) return -1;
    }

    if (node.type !== 'regular') return -1;

    const reqSize = offset + data.byteLength;
    if (reqSize > node.data.byteLength) {
      const newData = new Uint8Array(reqSize);
      newData.set(node.data, 0);
      node.data = newData;
    }

    node.data.set(data, offset);
    node.modifiedAt = Date.now();
    return data.byteLength;
  }

  remove(path: string): boolean {
    const loc = this.findParentNode(path);
    if (!loc) return false;
    const target = loc.parent.children.get(loc.basename);
    if (!target) return false;

    // Jika direktori, pastikan kosong
    if (target.type === 'directory' && target.children.size > 0) {
      return false;
    }

    loc.parent.children.delete(loc.basename);
    loc.parent.modifiedAt = Date.now();
    return true;
  }

  readdir(path: string): DirectoryEntry[] | null {
    const node = this.findNode(path);
    if (!node || node.type !== 'directory') return null;

    const entries: DirectoryEntry[] = [];
    for (const child of node.children.values()) {
      entries.push({
        name: child.name,
        inode: child.inode,
        type: child.type,
        size: child.type === 'directory' ? child.children.size : child.data.byteLength,
      });
    }
    return entries;
  }
}
