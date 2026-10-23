/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Representasi Posisi dalam Dokumen Teks (0-indexed) sesuai spesifikasi LSP.
 */
export interface PosisiLSP {
  /** Baris ke-n (0-based) */
  line: number;
  /** Karakter/kolom ke-n dalam baris (0-based) */
  character: number;
}

/**
 * Rentang Posisi Awal dan Akhir dalam Dokumen Teks sesuai spesifikasi LSP.
 */
export interface RentangLSP {
  start: PosisiLSP;
  end: PosisiLSP;
}

/**
 * Lokasi berkas dan rentang posisi (Location) sesuai spesifikasi LSP.
 */
export interface LokasiLSP {
  uri: string;
  range: RentangLSP;
}

/**
 * Tingkat Keparahan Diagnostik LSP.
 */
export enum TingkatKeparahanDiagnostikLSP {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

/**
 * Objek Diagnostik LSP untuk dikirimkan melalui textDocument/publishDiagnostics.
 */
export interface DiagnostikLSP {
  range: RentangLSP;
  severity: TingkatKeparahanDiagnostikLSP;
  code?: string | number;
  source?: string;
  message: string;
  tags?: number[];
  relatedInformation?: Array<{
    location: LokasiLSP;
    message: string;
  }>;
}

/**
 * Parameter notifikasi textDocument/publishDiagnostics.
 */
export interface ParameterPublikasiDiagnostikLSP {
  uri: string;
  version?: number;
  diagnostics: DiagnostikLSP[];
}

/**
 * Metadata dan teks dokumen saat dibuka (textDocument/didOpen).
 */
export interface ItemDokumenTeksLSP {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

export interface PengidentifikasiDokumenTeksLSP {
  uri: string;
}

export interface PengidentifikasiDokumenTeksBerversiLSP extends PengidentifikasiDokumenTeksLSP {
  version: number;
}

/**
 * Peristiwa perubahan dokumen teks (textDocument/didChange).
 */
export interface PeristiwaPerubahanKontenDokumenLSP {
  range?: RentangLSP;
  rangeLength?: number;
  text: string;
}

export interface ParameterPerubahanDokumenLSP {
  textDocument: PengidentifikasiDokumenTeksBerversiLSP;
  contentChanges: PeristiwaPerubahanKontenDokumenLSP[];
}

/**
 * Jenis Simbol Completion LSP.
 */
export enum JenisKompleksiLSP {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export enum FormatTeksSisipanLSP {
  PlainText = 1,
  Snippet = 2,
}

export interface KontenMarkupLSP {
  kind: 'plaintext' | 'markdown';
  value: string;
}

export interface ItemKompleksiLSP {
  label: string;
  kind?: JenisKompleksiLSP;
  detail?: string;
  documentation?: string | KontenMarkupLSP;
  deprecated?: boolean;
  preselect?: boolean;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: FormatTeksSisipanLSP;
}

export interface DaftarKompleksiLSP {
  isIncomplete: boolean;
  items: ItemKompleksiLSP[];
}

export interface ParameterPosisiDokumenTeksLSP {
  textDocument: PengidentifikasiDokumenTeksLSP;
  position: PosisiLSP;
}

export interface KonteksKompleksiLSP {
  triggerKind: number;
  triggerCharacter?: string;
}

export interface ParameterKompleksiLSP extends ParameterPosisiDokumenTeksLSP {
  context?: KonteksKompleksiLSP;
}

/**
 * Respons Hover LSP.
 */
export interface HoverLSP {
  contents: KontenMarkupLSP | string | Array<KontenMarkupLSP | string>;
  range?: RentangLSP;
}

/**
 * Jenis Simbol Dokumen LSP.
 */
export enum JenisSimbolLSP {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

export interface SimbolDokumenLSP {
  name: string;
  detail?: string;
  kind: JenisSimbolLSP;
  tags?: number[];
  deprecated?: boolean;
  range: RentangLSP;
  selectionRange: RentangLSP;
  children?: SimbolDokumenLSP[];
}

export interface InformasiSimbolLSP {
  name: string;
  kind: JenisSimbolLSP;
  tags?: number[];
  deprecated?: boolean;
  location: LokasiLSP;
  containerName?: string;
}

export interface ParameterSimbolWorkspaceLSP {
  query: string;
}

/**
 * Parameter dan Hasil Inisialisasi LSP.
 */
export interface KemampuanKlienLSP {
  workspace?: any;
  textDocument?: any;
}

export interface ParameterInisialisasiLSP {
  processId: number | null;
  rootPath?: string | null;
  rootUri: string | null;
  initializationOptions?: any;
  capabilities: KemampuanKlienLSP;
  trace?: 'off' | 'messages' | 'verbose';
  workspaceFolders?: Array<{
    uri: string;
    name: string;
  }> | null;
}

export interface KemampuanServerLSP {
  textDocumentSync?: {
    openClose: boolean;
    change: number; // 1 = Full, 2 = Incremental
  };
  completionProvider?: {
    resolveProvider?: boolean;
    triggerCharacters?: string[];
  };
  hoverProvider?: boolean;
  definitionProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
}

export interface InfoServerLSP {
  name: string;
  version: string;
}

export interface HasilInisialisasiLSP {
  capabilities: KemampuanServerLSP;
  serverInfo?: InfoServerLSP;
}
