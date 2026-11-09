/**
 * Target Configuration for Nusantara Kernel (x86_64-unknown-none-elf).
 */

export interface KernelTargetConfig {
  readonly triple: string;
  readonly architecture: 'x86_64';
  readonly os: 'none';
  readonly env: 'elf';
  readonly codeModel: 'kernel' | 'small' | 'large';
  readonly abi: 'sysv64';
  readonly compilerFlags: readonly string[];
  readonly linkerFlags: readonly string[];
  readonly features: {
    readonly redZone: boolean; // must be false for kernel
    readonly sse: boolean;
    readonly mmx: boolean;
    readonly avx: boolean;
    readonly softFloat: boolean;
  };
}

export const X86_64_KERNEL_TARGET: KernelTargetConfig = {
  triple: 'x86_64-unknown-none-elf',
  architecture: 'x86_64',
  os: 'none',
  env: 'elf',
  codeModel: 'kernel',
  abi: 'sysv64',
  compilerFlags: [
    '-ffreestanding',
    '-nostdlib',
    '-mno-red-zone',
    '-mcmodel=kernel',
    '-mno-mmx',
    '-mno-sse',
    '-mno-sse2',
    '-fno-pic',
    '-fno-pie',
    '-fno-stack-protector',
    '-fno-omit-frame-pointer',
    '-fno-builtin',
  ],
  linkerFlags: [
    '-nostdlib',
    '-static',
    '-z',
    'max-page-size=0x1000',
    '-T',
    'target/kernel/x86_64/linker.ld',
  ],
  features: {
    redZone: false,
    sse: false,
    mmx: false,
    avx: false,
    softFloat: true,
  },
};

export function getKernelTargetConfig(target = 'nusantara-x86_64-kernel'): KernelTargetConfig {
  if (target === 'nusantara-x86_64-kernel' || target === 'x86_64-kernel' || target === 'x86_64-unknown-none-elf') {
    return X86_64_KERNEL_TARGET;
  }
  throw new Error(`Target kernel tidak didukung: ${target}. Gunakan 'nusantara-x86_64-kernel'`);
}
