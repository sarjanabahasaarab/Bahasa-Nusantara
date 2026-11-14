/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA ADVANCED LINKER - Linker Manager Terpadu
 * Target Milestone: Phase 45 (v0.45.0)
 */

import { LLVMToolchainManager, LLVMToolchainStatus } from '../llvm/toolchain-manager';
import { TargetPlatformInfo, TargetTripleManager } from '../llvm/target-triple';
import { DependencyInspector } from './dependency-inspector';
import { DynamicLinker } from './dynamic-linker';
import { LibraryManager } from './library-manager';
import { LinkerDiagnosticsManager } from './linker-diagnostics';
import { RelocationManager } from './relocation-manager';
import { LinkingExecutionResult, StaticLinker } from './static-linker';
import { SymbolResolver } from './symbol-resolver';
import { SymbolTable } from './symbol-table';

export interface LinkerOptions {
  objectFiles: string[];
  outputExecutable: string;
  isStatic?: boolean;
  sharedLibraries?: string[];
  staticLibraries?: string[];
  libraryPaths?: string[];
  noDefaultLibraries?: boolean;
  debug?: boolean;
  strip?: boolean;
  sysroot?: string;
  targetTriple?: string;
  customToolchainPath?: string;
}

export class LinkerManager {
  public readonly toolchain: LLVMToolchainStatus;
  public readonly targetInfo: TargetPlatformInfo;
  public readonly diag: LinkerDiagnosticsManager;
  public readonly symbolTable: SymbolTable;
  public readonly symbolResolver: SymbolResolver;
  public readonly relocationManager: RelocationManager;
  public readonly libraryManager: LibraryManager;
  public readonly dependencyInspector: DependencyInspector;
  public readonly staticLinker: StaticLinker;
  public readonly dynamicLinker: DynamicLinker;

  constructor(options: { targetTriple?: string; customToolchainPath?: string } = {}) {
    const tm = new LLVMToolchainManager(options.customToolchainPath);
    this.toolchain = tm.detect();
    this.targetInfo = TargetTripleManager.resolve(options.targetTriple);
    this.diag = new LinkerDiagnosticsManager();
    this.symbolTable = new SymbolTable('NusantaraLinkerSymbolTable');
    this.symbolResolver = new SymbolResolver(this.diag);
    this.relocationManager = new RelocationManager(this.diag);
    this.libraryManager = new LibraryManager(this.diag);
    this.dependencyInspector = new DependencyInspector(this.diag);
    this.staticLinker = new StaticLinker(this.toolchain, this.targetInfo, this.diag);
    this.dynamicLinker = new DynamicLinker(this.toolchain, this.targetInfo, this.diag);
  }

  public link(options: LinkerOptions): LinkingExecutionResult {
    if (options.isStatic) {
      return this.staticLinker.linkStatic({
        objectFiles: options.objectFiles,
        outputExecutable: options.outputExecutable,
        staticLibraries: options.staticLibraries,
        libraryPaths: options.libraryPaths,
        noDefaultLibraries: options.noDefaultLibraries,
        debug: options.debug,
        strip: options.strip,
        sysroot: options.sysroot,
      });
    } else {
      return this.dynamicLinker.linkDynamic({
        objectFiles: options.objectFiles,
        outputExecutable: options.outputExecutable,
        sharedLibraries: options.sharedLibraries,
        libraryPaths: options.libraryPaths,
        debug: options.debug,
        strip: options.strip,
        sysroot: options.sysroot,
      });
    }
  }
}
