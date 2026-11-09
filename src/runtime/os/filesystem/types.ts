/**
 * Definisi tipe dan antarmuka untuk Sistem Berkas Kernel Nusantara (VFS & RamFS).
 */

export type FileDescriptor = number;

export type FileMode = 'r' | 'w' | 'rw' | 'a';

export type FileType = 'regular' | 'directory' | 'character_device';

export interface FileMetadata {
  readonly inode: number;
  readonly name: string;
  readonly type: FileType;
  size: number;
  permissions: number; // e.g. 0o755
  createdAt: number;
  modifiedAt: number;
}

export interface DirectoryEntry {
  readonly name: string;
  readonly inode: number;
  readonly type: FileType;
  readonly size: number;
}

export interface IFileSystem {
  readonly name: string;
  readonly rootPath: string;

  mount(): boolean;
  unmount(): boolean;
  isMounted(): boolean;

  lookup(path: string): FileMetadata | null;
  create(path: string, type: FileType, permissions?: number): boolean;
  read(path: string, offset: number, length: number): Uint8Array | null;
  write(path: string, offset: number, data: Uint8Array): number;
  remove(path: string): boolean;
  readdir(path: string): DirectoryEntry[] | null;
  stat(path: string): FileMetadata | null;
}

export interface OpenFileHandle {
  readonly fd: FileDescriptor;
  readonly path: string;
  readonly mode: FileMode;
  readonly fs: IFileSystem;
  offset: number;
}
