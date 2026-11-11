/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA QUALITY GATE — SUITE 46: PROCESS ISOLATION & USER MODE (PHASE 50)
 *
 * Pengujian komprehensif untuk membuktikan:
 * 1. Struktur Segment Descriptor x86_64 GDT Ring 0 (CS 0x08, SS 0x10) & Ring 3 (CS 0x23, SS 0x1B).
 * 2. Task State Segment (TSS) 64-bit dan peralihan stack kernel (RSP0).
 * 3. Isolasi Address Space per-proses dengan PML4/CR3 mandiri dan proteksi W^X / NX.
 * 4. Pemuat ELF64 aplikasi pengguna (ET_EXEC, PT_LOAD, validasi entry point & batas kanonikal).
 * 5. Alokasi User Stack dan perataan 16-byte System V AMD64 ABI.
 * 6. Keamanan pointer pengguna (copy_from_user, copy_to_user, penolakan injeksi alamat kernel).
 * 7. Dispatcher system call pada konteks User Mode (RAX, RDI, RSI, RDX, R10).
 * 8. Penanganan exception User Mode: Page fault & GPF menghentikan proses tanpa kernel panic.
 * 9. Inter-Process Communication (IPC): Antrean pesan, Pipe terarah, dan Shared Memory berizin.
 * 10. Emisi dan pembuktian seluruh serial sentinel Phase 50.
 */

import {
  AddressSpace,
  UserRegionType,
  PagePermissions,
  GDT64Manager,
  SegmentSelector,
  UserPointerSecurity,
  UserSecurityError,
  ELF64UserLoader,
  UserStack,
  PrivilegeManager,
  ProcessManager,
  ProcessState,
  ThreadState,
  ProcessFaultHandler,
  KernelMessageQueue,
  KernelPipe,
  SharedMemoryManager,
  UserELFBuilder,
  KernelABI,
  SyscallDispatcher,
  SyscallTable,
  SyscallNumber,
  FaultType,
  X86BootstrapEncoder,
  QEMURunner,
} from '../../src/runtime/os';
import { VERSI_NUSANTARA } from '../../src/konstanta/versi';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>): Promise<void> {
  totalUji++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      totalLulus++;
      console.log(`  [✓ LULUS] ${nama}`);
    })
    .catch((err: any) => {
      totalGagal++;
      console.error(`  [✗ GAGAL] ${nama}`);
      console.error(`            ${err?.message || err}`);
      if (err?.stack) {
        console.error(`            ${err.stack.split('\n').slice(1, 3).join('\n')}`);
      }
    });
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(`Penegasan gagal: ${pesan}`);
  }
}

async function main(): Promise<void> {
  console.log('======================================================================');
  console.log(`  NUSANTARA QUALITY GATE — SUITE 46: PROCESS ISOLATION & USER MODE (F50)`);
  console.log(`  Target Milestone : v${VERSI_NUSANTARA} (Phase 50)`);
  console.log('======================================================================\n');

  // =========================================================================
  // KELOMPOK 1: GDT 64-BIT, TSS, & PRIVILEGE SELECTORS (RING 0 & RING 3)
  // =========================================================================
  console.log('--- Kelompok 1: GDT 64-bit, TSS, & Privilege Selectors ---');

  await uji('1.1 Selector segmen GDT membedakan Ring 0 dan Ring 3 secara tepat', () => {
    pastikan((SegmentSelector.KERNEL_CODE & 3) === 0, 'Kernel CS harus memiliki RPL 0');
    pastikan((SegmentSelector.KERNEL_DATA & 3) === 0, 'Kernel SS harus memiliki RPL 0');
    pastikan((SegmentSelector.USER_CODE & 3) === 3, 'User CS harus memiliki RPL 3 (0x23)');
    pastikan((SegmentSelector.USER_DATA & 3) === 3, 'User SS harus memiliki RPL 3 (0x1B)');
    pastikan(SegmentSelector.USER_CODE === 0x23, 'User CS selector harus bernilai tepat 0x23 (0x20|3)');
    pastikan(SegmentSelector.USER_DATA === 0x1B, 'User SS selector harus bernilai tepat 0x1B (0x18|3)');

    pastikan(GDT64Manager.validateSelector(0x08, 0), '0x08 adalah Kernel Code yang valid');
    pastikan(GDT64Manager.validateSelector(0x23, 3), '0x23 adalah User Code yang valid');
    pastikan(!GDT64Manager.validateSelector(0x23, 0), '0x23 tidak boleh diterima sebagai Ring 0');
  });

  await uji('1.2 Task State Segment (TSS) 64-bit mengonfigurasi RSP0 dan IST', () => {
    const gdtMgr = GDT64Manager.getInstance();
    const kernelStack = 0xFFFF_8000_2000_4000n;
    gdtMgr.setKernelStack(kernelStack);
    pastikan(gdtMgr.getKernelStack() === kernelStack, 'TSS.RSP0 harus tersimpan konsisten');

    const istDoubleFault = 0xFFFF_8000_2000_8000n;
    gdtMgr.setIST(1, istDoubleFault);
    pastikan(gdtMgr.tss.ist1 === istDoubleFault, 'TSS.IST1 harus tersimpan konsisten');
    pastikan(gdtMgr.tss.ioMapBase >= 104, 'I/O Permission Bitmap harus memblokir akses I/O langsung di Ring 3');

    const gdtBytes = gdtMgr.rebuildGDT();
    pastikan(gdtBytes.length === 56, 'GDT dengan TSS 64-bit harus berukuran 56 bytes (7 slot 8-byte)');
  });

  // =========================================================================
  // KELOMPOK 2: PER-PROCESS ADDRESS SPACE & HARDWARE MEMORY ISOLATION
  // =========================================================================
  console.log('\n--- Kelompok 2: Per-Process Address Space & Memory Isolation ---');

  await uji('2.1 Setiap proses memiliki Page Table PML4/CR3 terisolasi', () => {
    AddressSpace.resetCr3Counter();
    const as1 = new AddressSpace();
    const as2 = new AddressSpace();

    pastikan(as1.cr3 !== as2.cr3, 'CR3 antara dua AddressSpace harus berbeda');
    pastikan(as1.pml4Address === as1.cr3, 'pml4Address harus identik dengan CR3');

    // Kedua proses memetakan alamat virtual yang sama (0x00400000) ke frame fisik berbeda
    as1.mapPage(0x0040_0000n, 0x0100_0000n, PagePermissions.USER_READ_WRITE, true);
    as2.mapPage(0x0040_0000n, 0x0200_0000n, PagePermissions.USER_READ_WRITE, true);

    const trans1 = as1.translate(0x0040_0000n);
    const trans2 = as2.translate(0x0040_0000n);

    pastikan(trans1 === 0x0100_0000n, 'Alamat fisik proses 1 harus 0x01000000');
    pastikan(trans2 === 0x0200_0000n, 'Alamat fisik proses 2 harus 0x02000000');
    pastikan(trans1 !== trans2, 'Memori fisik antara kedua proses harus terisolasi penuh');
  });

  await uji('2.2 Validasi alamat kanonikal x86_64 (48-bit sign-extended)', () => {
    pastikan(AddressSpace.isCanonical(0x0000_0000_0040_0000n), 'Alamat pengguna lower-half harus kanonikal');
    pastikan(AddressSpace.isCanonical(0x0000_7FFF_FFFF_FFFFn), 'Batas atas ruang pengguna harus kanonikal');
    pastikan(AddressSpace.isCanonical(0xFFFF_8000_0000_0000n), 'Batas bawah ruang kernel higher-half harus kanonikal');
    pastikan(AddressSpace.isCanonical(0xFFFF_FFFF_8000_0000n), 'Kernel base -2GB harus kanonikal');

    // Non-canonical address hole: 0x0000800000000000 .. 0xFFFF7FFFFFFFFFFF
    pastikan(!AddressSpace.isCanonical(0x0000_8000_0000_0000n), 'Alamat non-kanonikal harus ditolak');
    pastikan(!AddressSpace.isCanonical(0x1234_5678_9ABC_DEF0n), 'Alamat bit sembarangan harus ditolak');
  });

  await uji('2.3 Penolakan akses Ring 3 ke Halaman Supervisor (Privilege Check)', () => {
    const as = new AddressSpace();
    // Memetakan alamat kernel (U/S = 0, isUserAccessible = false)
    as.mapPage(KernelABI.MEMORY_LAYOUT.kernelSpaceStart, 0x0010_0000n, PagePermissions.READ_WRITE, false);

    // Cek akses dari Ring 3 (isUserMode = true)
    const checkUser = as.checkAccess(KernelABI.MEMORY_LAYOUT.kernelSpaceStart, 'READ', true);
    pastikan(!checkUser.allowed, 'Ring 3 dilarang membaca halaman supervisor kernel');
    pastikan(checkUser.faultReason === 'SUPERVISOR_PRIVILEGE_VIOLATION', 'Alasan penolakan harus SUPERVISOR_PRIVILEGE_VIOLATION');

    // Cek akses dari Ring 0 (isUserMode = false)
    const checkKernel = as.checkAccess(KernelABI.MEMORY_LAYOUT.kernelSpaceStart, 'READ', false);
    pastikan(checkKernel.allowed, 'Ring 0 harus diizinkan mengakses halaman supervisor');
  });

  await uji('2.4 Penegakan proteksi Write Protection dan No-Execute (NX)', () => {
    const as = new AddressSpace();
    // Halaman Read-Only
    as.mapPage(0x0040_0000n, 0x0020_0000n, PagePermissions.READ, true);
    const writeCheck = as.checkAccess(0x0040_0000n, 'WRITE', true);
    pastikan(!writeCheck.allowed, 'Penulisan ke halaman Read-Only harus ditolak');
    pastikan(writeCheck.faultReason === 'WRITE_PROTECTION_VIOLATION', 'Harus memicu WRITE_PROTECTION_VIOLATION');

    // Halaman Data (No-Execute)
    as.mapPage(0x0060_0000n, 0x0030_0000n, PagePermissions.READ | PagePermissions.WRITE, true);
    const execCheck = as.checkAccess(0x0060_0000n, 'EXECUTE', true);
    pastikan(!execCheck.allowed, 'Eksekusi halaman data tanpa izin eksekusi harus ditolak');
    pastikan(execCheck.faultReason === 'NO_EXECUTE_VIOLATION', 'Harus memicu NO_EXECUTE_VIOLATION');
  });

  // =========================================================================
  // KELOMPOK 3: USER POINTER SECURITY & COPY_FROM/TO_USER
  // =========================================================================
  console.log('\n--- Kelompok 3: User Pointer Security & Bounds Checking ---');

  await uji('3.1 Penolakan pointer NULL dan Halaman Perlindungan Nol (< 64KB)', () => {
    const nullCheck = UserPointerSecurity.validateUserAddress(0n, false);
    pastikan(!nullCheck.valid, 'Pointer NULL 0x0 harus ditolak');
    pastikan(nullCheck.error === UserSecurityError.NULL_POINTER, 'Galat harus NULL_POINTER');

    const lowCheck = UserPointerSecurity.validateUserAddress(0x500n, false);
    pastikan(!lowCheck.valid, 'Alamat di halaman 0 (< 64KB) harus ditolak');
  });

  await uji('3.2 Pencegahan Injeksi Alamat Memori Kernel (EFAULT)', () => {
    // Alamat higher-half kernel
    const kernelAddr = 0xFFFF_8000_0000_1000n;
    const check = UserPointerSecurity.validateUserAddress(kernelAddr, false);
    pastikan(!check.valid, 'Alamat kernel harus ditolak saat dipanggil sebagai pointer pengguna');
    pastikan(check.error === UserSecurityError.KERNEL_SPACE_INJECTION, 'Galat harus KERNEL_SPACE_INJECTION');

    const bufCheck = UserPointerSecurity.validateUserBuffer(0x0000_7FFF_FFFF_F000n, 8192, false);
    pastikan(!bufCheck.valid, 'Buffer pengguna yang melintasi batas ke ruang kernel harus ditolak');
  });

  await uji('3.3 Pengoperasian copyFromUser dan copyToUser yang aman', () => {
    const kernelBuffer = new Uint8Array(16);
    const mockMemory = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const mockReader = (_addr: bigint, _len: number) => mockMemory;

    const okCopy = UserPointerSecurity.copyFromUser(
      kernelBuffer,
      0x0040_1000n,
      16,
      undefined,
      mockReader
    );
    pastikan(okCopy, 'copyFromUser dengan pointer pengguna yang valid harus sukses');
    pastikan(kernelBuffer[0] === 1 && kernelBuffer[15] === 16, 'Data harus tersalin dengan benar');

    // copyFromUser dengan alamat kernel harus langsung gagal tanpa memanggil reader
    const badCopy = UserPointerSecurity.copyFromUser(
      kernelBuffer,
      0xFFFF_8000_0000_0000n,
      16,
      undefined,
      mockReader
    );
    pastikan(!badCopy, 'copyFromUser dengan alamat kernel harus gagal');
  });

  // =========================================================================
  // KELOMPOK 4: ELF64 USER APPLICATION LOADER
  // =========================================================================
  console.log('\n--- Kelompok 4: ELF64 User Application Loader ---');

  await uji('4.1 Memuat biner ELF64 pengguna (PT_LOAD) ke dalam AddressSpace', () => {
    const userElf = UserELFBuilder.build({
      entryPoint: 0x0000_0000_0040_0000n,
      programName: 'test_hello',
    });

    const as = new AddressSpace();
    const result = ELF64UserLoader.load(userElf, as);

    pastikan(result.success, 'Pemuatan ELF64 pengguna harus berhasil');
    pastikan(result.program !== undefined, 'Program yang dimuat tidak boleh undefined');
    pastikan(result.program!.entryPoint === 0x0040_0000n, 'Entry point harus sesuai biner (0x400000)');
    pastikan(result.program!.segmentCount >= 1, 'Minimal 1 segmen PT_LOAD harus dimuat');

    // Pastikan halaman entry point terpetakan di address space dengan izin eksekusi
    const entryPerms = as.getPermissions(0x0040_0000n);
    pastikan(entryPerms !== null, 'Halaman entry point harus terpetakan');
    pastikan((entryPerms! & PagePermissions.EXECUTE) !== 0, 'Halaman kode harus memiliki izin eksekusi');
    pastikan((entryPerms! & PagePermissions.USER) !== 0, 'Halaman kode harus memiliki izin akses pengguna');
  });

  await uji('4.2 Penolakan biner ELF non-64-bit atau dengan target alamat kernel', () => {
    // Buat biner rusak dengan entry point kernel
    const badElf = UserELFBuilder.build({
      entryPoint: 0xFFFF_8000_0000_0000n, // Alamat kernel!
    });
    const as = new AddressSpace();
    const result = ELF64UserLoader.load(badElf, as);
    pastikan(!result.success, 'ELF dengan entry point kernel harus ditolak');
  });

  // =========================================================================
  // KELOMPOK 5: USER STACK & SYSTEM V AMD64 ABI ALIGNMENT
  // =========================================================================
  console.log('\n--- Kelompok 5: User Stack & System V AMD64 ABI Alignment ---');

  await uji('5.1 Alokasi User Stack dan pembentukan Initial Frame rata 16-byte', () => {
    const as = new AddressSpace();
    const ustack = new UserStack(as, { stackSizeBytes: 64 * 1024 });

    pastikan(ustack.stackTop === UserStack.DEFAULT_STACK_TOP, 'Top of stack harus sesuai default');
    pastikan(ustack.sizeBytes === 64 * 1024, 'Ukuran stack harus 64 KB');

    const initialRsp = ustack.setupInitialFrame(['aplikasi', '--verbose']);
    pastikan((initialRsp & 15n) === 0n, 'RSP awal sebelum pemanggilan fungsi harus rata 16-byte (RSP % 16 == 0)');
    pastikan(ustack.isRspValid(initialRsp), 'RSP awal harus berada dalam rentang stack yang sah');

    // Guard page di bawah stack harus tidak terpetakan (Page Fault jika overflow)
    const guardCheck = as.checkAccess(ustack.guardPageAddress, 'WRITE', true);
    pastikan(!guardCheck.allowed, 'Guard page di bawah stack harus tidak terpetakan');
  });

  // =========================================================================
  // KELOMPOK 6: PRIVILEGE TRANSITION (RING 0 <-> RING 3) & STACK SWITCHING
  // =========================================================================
  console.log('\n--- Kelompok 6: CPU Privilege Transition & Register Preparation ---');

  await uji('6.1 Menyiapkan register transisi User Mode (IRETQ / SYSRET Frame)', () => {
    const entry = 0x0040_0000n;
    const userRsp = 0x0000_7FFF_FFFF_E000n;
    const kernelStackRsp0 = 0xFFFF_8000_1000_4000n;

    const regs = PrivilegeManager.prepareUserModeTransition(entry, userRsp, kernelStackRsp0);

    pastikan(regs.cs === SegmentSelector.USER_CODE, 'CS harus bernilai User Code (0x23)');
    pastikan(regs.ss === SegmentSelector.USER_DATA, 'SS harus bernilai User Data (0x1B)');
    pastikan(regs.rip === entry, 'RIP harus menunjuk ke user entry point');
    pastikan(regs.rsp === userRsp, 'RSP harus menunjuk ke user stack pointer');
    pastikan((regs.rflags & 0x200n) !== 0n, 'Interrupt Flag (IF) harus aktif (bit 9 = 1)');
    pastikan(PrivilegeManager.isUserMode(regs), 'Helper isUserMode harus mengembalikan true');

    // Pastikan TSS RSP0 diperbarui ke kernel stack
    const tssRsp0 = GDT64Manager.getInstance().getKernelStack();
    pastikan(tssRsp0 === kernelStackRsp0, 'TSS.RSP0 harus disinkronkan ke kernel stack thread');
  });

  // =========================================================================
  // KELOMPOK 7: PROCESS LIFECYCLE & PROCESS CONTROL BLOCK (PCB)
  // =========================================================================
  console.log('\n--- Kelompok 7: Process Lifecycle & PCB/TCB Management ---');

  await uji('7.1 Siklus hidup proses (CREATED -> READY -> RUNNING -> ZOMBIE/TERMINATED)', async () => {
    ProcessManager.resetInstance();
    const pm = ProcessManager.getInstance();

    const proc = pm.process_create('user_calc', 0, false);
    pastikan(proc.state === ProcessState.CREATED, 'State awal harus CREATED');
    pastikan(!proc.isKernelProcess, 'Bukan proses kernel');

    const thread = proc.createThread(0x0040_0000n, 3, true);
    pastikan(thread.isUserMode, 'Thread pengguna harus ditandai isUserMode');
    pastikan(thread.registers.cs === SegmentSelector.USER_CODE, 'Thread pengguna harus memiliki CS 0x23');

    pm.process_start(proc.pid);
    pastikan(proc.state === ProcessState.READY, 'Setelah start, proses harus READY');

    pm.process_exit(proc.pid, 42);
    pastikan(proc.exitCode === 42, 'Exit code harus 42');
    pastikan(proc.state === ProcessState.ZOMBIE || proc.state === ProcessState.TERMINATED, 'Proses harus ZOMBIE/TERMINATED');
  });

  // =========================================================================
  // KELOMPOK 8: SYSTEM CALL DISPATCHER DI USER MODE
  // =========================================================================
  console.log('\n--- Kelompok 8: System Call Dispatcher & Validation ---');

  await uji('8.1 Eksekusi System Call sys_process_id dan sys_process_exit', async () => {
    const table = SyscallTable.getInstance();
    const dispatcher = new SyscallDispatcher(table);

    const ctx = {
      callingProcessId: 7,
      callingThreadId: 1,
      isKernelCaller: false, // Dari user mode
      addressSpace: new AddressSpace(),
    };

    // sys_process_id (ID: 2)
    const pidResult = await dispatcher.dispatch(SyscallNumber.PROCESS_ID, [], ctx);
    pastikan(pidResult === 7n, 'sys_process_id harus mengembalikan PID pemanggil (7)');

    // sys_process_exit (ID: 1, exit_code: 0)
    const exitResult = await dispatcher.dispatch(SyscallNumber.PROCESS_EXIT, [0n], ctx);
    pastikan(exitResult === 0n, 'sys_process_exit harus mengembalikan 0');
  });

  // =========================================================================
  // KELOMPOK 9: PROCESS FAULT HANDLING (RING 3 ISOLATION GUARD)
  // =========================================================================
  console.log('\n--- Kelompok 9: Process Fault Handling & Isolation Guard ---');

  await uji('9.1 Fault User Mode (Ring 3) menghentikan proses TANPA memicu KernelPanic', () => {
    ProcessManager.resetInstance();
    const pm = ProcessManager.getInstance();
    const proc = pm.process_create('bad_app', 0, false);
    pm.process_start(proc.pid);

    ProcessFaultHandler.clearDiagnostics();

    // Simulasikan Page Fault (#PF) yang terjadi saat eksekusi Ring 3 (CS=0x23)
    const frame = {
      faultType: FaultType.PAGE_FAULT,
      errorCode: 4n, // User mode fault
      cr2FaultAddress: 0xDEADBEEFn,
      registers: {
        cs: SegmentSelector.USER_CODE, // 0x23
        rip: 0x0040_1234n,
        rsp: 0x0000_7FFF_FFFF_E000n,
      },
    };

    const handled = ProcessFaultHandler.handleException(frame, proc.pid);
    pastikan(handled, 'Fault Ring 3 harus ditangani dengan sukses tanpa KernelPanic');

    const diags = ProcessFaultHandler.getDiagnostics();
    pastikan(diags.length === 1, 'Diagnostik fault harus dicatat');
    pastikan(diags[0].pid === proc.pid, 'PID pelaku harus sesuai');
    pastikan(diags[0].actionTaken === 'PROCESS_TERMINATED', 'Tindakan harus PROCESS_TERMINATED');

    const lookup = pm.process_lookup(proc.pid);
    pastikan(lookup?.state === ProcessState.TERMINATED, 'Proses pengguna bermasalah harus diterminasi');
  });

  // =========================================================================
  // KELOMPOK 10: INTER-PROCESS COMMUNICATION (IPC)
  // =========================================================================
  console.log('\n--- Kelompok 10: Inter-Process Communication (IPC) ---');

  await uji('10.1 Antrean Pesan (KernelMessageQueue) antar-proses', () => {
    const queue = new KernelMessageQueue('q_main', 1);
    const sendRes = queue.send(1, 2, 'GREETING', 'Halo dari Proses 1');
    pastikan(sendRes.success, 'Kirim pesan harus berhasil');
    pastikan(queue.getMessageCount() === 1, 'Jumlah pesan antrean harus 1');

    const received = queue.receive(2);
    pastikan(received !== null, 'Penerima PID 2 harus menerima pesan');
    pastikan(received!.payload === 'Halo dari Proses 1', 'Isi payload pesan harus cocok');
  });

  await uji('10.2 Pipa Aliran Byte Terarah (KernelPipe)', () => {
    const pipe = new KernelPipe('pipe_1', 1, 2);
    const data = new TextEncoder().encode('Pipa Data Nusantara');
    const writeRes = pipe.write(2, data); // Penulis PID 2
    pastikan(writeRes.bytesWritten === data.length, 'Data harus tertulis penuh ke pipe');

    const readBytes = pipe.read(1, 64); // Pembaca PID 1
    const readStr = new TextDecoder().decode(readBytes);
    pastikan(readStr === 'Pipa Data Nusantara', 'Data yang dibaca dari pipe harus sesuai');
  });

  await uji('10.3 Manajemen Memori Bersama Berizin (SharedMemoryManager)', () => {
    const shm = SharedMemoryManager.getInstance();
    const regId = 'shm_app_data';
    const okCreate = shm.createRegion(regId, 1, 4096);
    pastikan(okCreate, 'Pembuatan region memori bersama harus sukses');

    // Beri izin kepada PID 2
    shm.grantAccess(regId, 1, 2);

    const as2 = new AddressSpace();
    const okAttach = shm.attach(regId, 2, as2, 0x0070_0000n);
    pastikan(okAttach, 'Proses berizin harus dapat melakukan attach shared memory');

    // Proses tanpa izin (PID 3) harus ditolak
    const as3 = new AddressSpace();
    const badAttach = shm.attach(regId, 3, as3, 0x0070_0000n);
    pastikan(!badAttach, 'Proses tanpa izin harus ditolak saat attach shared memory');
  });

  // =========================================================================
  // KELOMPOK 11: SERIAL SENTINEL & BOOTSTRAP USER MODE VERIFICATION
  // =========================================================================
  console.log('\n--- Kelompok 11: Serial Sentinel & Bootstrap Verification ---');

  await uji('11.1 X86BootstrapEncoder menghasilkan seluruh sentinel wajib Phase 50', () => {
    const bootBin = X86BootstrapEncoder.generateBootstrapBinary();
    const text = new TextDecoder().decode(bootBin.codeBytes);

    pastikan(text.includes('NUSANTARA_KERNEL_BOOT_OK'), 'Biner bootstrap harus memuat NUSANTARA_KERNEL_BOOT_OK');
    pastikan(text.includes('NUSANTARA_USERMODE_ENTERED'), 'Biner bootstrap harus memuat NUSANTARA_USERMODE_ENTERED');
    pastikan(text.includes('HELLO FROM NUSANTARA USER MODE'), 'Biner bootstrap harus memuat HELLO FROM NUSANTARA USER MODE');
    pastikan(text.includes('NUSANTARA_SYSCALL_OK'), 'Biner bootstrap harus memuat NUSANTARA_SYSCALL_OK');
    pastikan(text.includes('NUSANTARA_PROCESS_EXIT_OK'), 'Biner bootstrap harus memuat NUSANTARA_PROCESS_EXIT_OK');
    pastikan(text.includes('NUSANTARA_PROCESS_ISOLATION_OK'), 'Biner bootstrap harus memuat NUSANTARA_PROCESS_ISOLATION_OK');
    pastikan(text.includes('NUSANTARA_USERMODE_TEST_PASS'), 'Biner bootstrap harus memuat NUSANTARA_USERMODE_TEST_PASS');
  });

  await uji('11.2 QEMURunner mengenali seluruh 16 tahapan diagnostik Fase 49 & 50', () => {
    pastikan(QEMURunner.STAGES.length === 16, 'QEMURunner harus mendefinisikan 16 tahapan diagnostik serial');
    pastikan(QEMURunner.STAGES.includes('NUSANTARA_USERMODE_ENTERED'), 'Harus menyertakan NUSANTARA_USERMODE_ENTERED');
    pastikan(QEMURunner.STAGES.includes('NUSANTARA_USERMODE_TEST_PASS'), 'Harus menyertakan NUSANTARA_USERMODE_TEST_PASS');
  });

  console.log('\n======================================================================');
  console.log(`HASIL PENGUJIAN PHASE 50: ${totalLulus} LULUS, ${totalGagal} GAGAL (Total: ${totalUji})`);
  if (totalGagal === 0) {
    console.log('Semua pengujian Fase 50 (Process Isolation & User Mode) BERHASIL 100%!');
  }
  console.log('======================================================================\n');

  if (totalGagal > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Kegagalan fatal pada runner pengujian Phase 50:', err);
  process.exit(1);
});
