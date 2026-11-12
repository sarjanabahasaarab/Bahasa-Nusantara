/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modul Kompatibilitas Node.js & Browser untuk LLVM Backend & AOT
 * Mencegah evaluasi atau eksternalisasi child_process / fs di lingkungan peramban (browser).
 */

const isNode =
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  Boolean(process?.versions?.node);

declare const require: ((id: string) => any) | undefined;

function getRuntimeNodeModule<T = any>(moduleName: string): T | null {
  if (!isNode) return null;
  try {
    if (typeof require === 'function') {
      return require(moduleName);
    }
    const proc = (globalThis as any).process;
    if (proc && typeof proc.getBuiltinModule === 'function') {
      return proc.getBuiltinModule(moduleName);
    }
    if (proc && proc.mainModule && typeof proc.mainModule.require === 'function') {
      return proc.mainModule.require(moduleName);
    }
  } catch {
    return null;
  }
  return null;
}

export const safeCP = {
  spawnSync(
    command: string,
    args: string[] = [],
    options: any = {}
  ): { status: number | null; stdout: string; stderr: string; error?: Error } {
    const cp = getRuntimeNodeModule('child_process');
    if (!cp || typeof cp.spawnSync !== 'function') {
      return {
        status: 1,
        stdout: '',
        stderr: 'child_process tidak didukung pada lingkungan peramban (browser).',
        error: new Error('child_process not available'),
      };
    }
    const res = cp.spawnSync(command, args, options);
    return {
      status: res.status ?? (res.error ? 1 : 0),
      stdout: res.stdout ? res.stdout.toString() : '',
      stderr: res.stderr ? res.stderr.toString() : '',
      error: res.error,
    };
  },

  execFileSync(command: string, args: string[] = [], options: any = {}): string {
    const cp = getRuntimeNodeModule('child_process');
    if (!cp || typeof cp.execFileSync !== 'function') {
      throw new Error('child_process tidak didukung pada lingkungan peramban (browser).');
    }
    const res = cp.execFileSync(command, args, options);
    return res ? res.toString() : '';
  },
};

export const safeFS = {
  writeFileSync(filePath: string, data: string | Uint8Array, encoding?: any): void {
    const fs = getRuntimeNodeModule('fs');
    if (fs && typeof fs.writeFileSync === 'function') {
      if (data instanceof Uint8Array && (encoding === undefined || encoding === null)) {
        fs.writeFileSync(filePath, data);
      } else {
        fs.writeFileSync(filePath, data, encoding ?? 'utf-8');
      }
    }
  },

  readFileSync(filePath: string, encoding: any = 'utf-8'): string {
    const fs = getRuntimeNodeModule('fs');
    if (fs && typeof fs.readFileSync === 'function') {
      return fs.readFileSync(filePath, encoding);
    }
    return '';
  },

  existsSync(filePath: string): boolean {
    const fs = getRuntimeNodeModule('fs');
    if (fs && typeof fs.existsSync === 'function') {
      return fs.existsSync(filePath);
    }
    return false;
  },

  mkdirSync(dirPath: string, options: any = { recursive: true }): void {
    const fs = getRuntimeNodeModule('fs');
    if (fs && typeof fs.mkdirSync === 'function') {
      fs.mkdirSync(dirPath, options);
    }
  },

  mkdtempSync(prefix: string): string {
    const fs = getRuntimeNodeModule('fs');
    if (fs && typeof fs.mkdtempSync === 'function') {
      return fs.mkdtempSync(prefix);
    }
    return `${prefix}${Date.now()}`;
  },

  rmSync(targetPath: string, options: any = { recursive: true, force: true }): void {
    const fs = getRuntimeNodeModule('fs');
    if (fs && typeof fs.rmSync === 'function') {
      fs.rmSync(targetPath, options);
    }
  },
};

export const safeOS = {
  tmpdir(): string {
    const os = getRuntimeNodeModule('os');
    if (os && typeof os.tmpdir === 'function') {
      return os.tmpdir();
    }
    return '/tmp';
  },

  platform(): string {
    const os = getRuntimeNodeModule('os');
    if (os && typeof os.platform === 'function') {
      return os.platform();
    }
    return 'unknown';
  },

  arch(): string {
    const os = getRuntimeNodeModule('os');
    if (os && typeof os.arch === 'function') {
      return os.arch();
    }
    return 'unknown';
  },
};

export const safePath = {
  join(...parts: string[]): string {
    const path = getRuntimeNodeModule('path');
    if (path && typeof path.join === 'function') {
      return path.join(...parts);
    }
    return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
  },

  resolve(...parts: string[]): string {
    const path = getRuntimeNodeModule('path');
    if (path && typeof path.resolve === 'function') {
      return path.resolve(...parts);
    }
    return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
  },

  dirname(filePath: string): string {
    const path = getRuntimeNodeModule('path');
    if (path && typeof path.dirname === 'function') {
      return path.dirname(filePath);
    }
    const idx = filePath.lastIndexOf('/');
    return idx === -1 ? '.' : filePath.slice(0, idx);
  },

  basename(filePath: string, ext?: string): string {
    const path = getRuntimeNodeModule('path');
    if (path && typeof path.basename === 'function') {
      return path.basename(filePath, ext);
    }
    let base = filePath.split(/[/\\]/).pop() || '';
    if (ext && base.endsWith(ext)) {
      base = base.slice(0, -ext.length);
    }
    return base;
  },

  extname(filePath: string): string {
    const path = getRuntimeNodeModule('path');
    if (path && typeof path.extname === 'function') {
      return path.extname(filePath);
    }
    const dotIdx = filePath.lastIndexOf('.');
    return dotIdx === -1 ? '' : filePath.slice(dotIdx);
  },
};
