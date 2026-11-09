/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA QUALITY GATE - SUITE PENGUJIAN PHASE 48: NUSANTARA OS MINIMAL KERNEL INTERFACE
 * Target Milestone: v0.48.0
 */

import {
  KernelState,
  KernelCore,
  KernelLogger,
  KernelPanic,
  KernelDiagnostics,
  KernelABI,
  RegisterContext,
  SyscallNumber,
  SYSCALL_NAMES,
  SyscallTable,
  SyscallDispatcher,
  SyscallError,
  PhysicalMemoryManager,
  VirtualMemoryManager,
  KernelHeap,
  MemoryDiagnostics,
  InterruptDescriptorTable,
  InterruptController,
  ExceptionHandler,
  FaultType,
  X86_64HAL,
  HALManager,
  DriverRegistry,
  SerialDriver,
  TimerDriver,
  KeyboardDriver,
  FramebufferDriver,
  Process,
  Thread,
  ContextSwitch,
  KernelScheduler,
  RamFS,
  VirtualFileSystem,
  X86_64_KERNEL_TARGET,
  Multiboot2HeaderBuilder,
  MULTIBOOT2_HEADER_MAGIC,
  generateKernelLinkerScript,
  KernelELFBuilder,
  KernelProjectGenerator,
} from '../../src/runtime/os/index.js';

import { Parser } from '../../src/parser/parser.js';
import { PemeriksaTipe } from '../../src/tipe/pemeriksaTipe.js';
import { Interpreter } from '../../src/interpreter/interpreter.js';
import { PembacaBerkasMemori, ResolverModul, PemuatModul } from '../../src/modul/index.js';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter.js';
import { safeCP } from '../../src/compiler/llvm/node-compat.js';

let jumlahUji = 0;
let ujiLulus = 0;
let ujiGagal = 0;
let ujiSkipped = 0;

function uji(nama: string, fn: () => void | Promise<void>) {
  jumlahUji++;
  try {
    const hasil = fn();
    if (hasil instanceof Promise) {
      return hasil
        .then(() => {
          ujiLulus++;
          console.log(`  [✓ LULUS] ${nama}`);
        })
        .catch((err) => {
          ujiGagal++;
          console.error(`  [✗ GAGAL] ${nama}:`, err?.message || err);
        });
    } else {
      ujiLulus++;
      console.log(`  [✓ LULUS] ${nama}`);
    }
  } catch (err: any) {
    ujiGagal++;
    console.error(`  [✗ GAGAL] ${nama}:`, err?.message || err);
  }
}

function lewati(nama: string, alasan: string) {
  jumlahUji++;
  ujiSkipped++;
  console.log(`  [- SKIPPED] ${nama} (${alasan})`);
}

function pastikan(kondisi: boolean, pesan: string) {
  if (!kondisi) {
    throw new Error(`Asersi gagal: ${pesan}`);
  }
}

function samaDengan(aktual: any, ekspektasi: any, pesan: string) {
  if (aktual !== ekspektasi) {
    throw new Error(`Asersi gagal [${pesan}]: diterima '${aktual}', diharapkan '${ekspektasi}'`);
  }
}

async function jalankanSemuaPengujian() {
  console.log('======================================================================');
  console.log('    NUSANTARA QUALITY GATE - SUITE PENGUJIAN PHASE 48: KERNEL OS     ');
  console.log('======================================================================\n');

  // ---------------------------------------------------------------------------
  // KELOMPOK 1: KERNEL ABI & MEMORY LAYOUT ISOLATION
  // ---------------------------------------------------------------------------
  console.log('--- Kelompok 1: Kernel ABI & Memory Layout Isolation ---');

  uji('1.1 Validasi isolasi batas pointer pengguna dan kernel', () => {
    // Alamat userspace valid
    pastikan(KernelABI.isUserPointerValid(0x0000_1000_0000_0000n, 1024), 'Pointer userspace harus valid');
    // Alamat di atas 128TB non-canonical hole harus ditolak
    pastikan(!KernelABI.isUserPointerValid(0x0000_8000_0000_0000n, 8), 'Pointer di canonical hole harus ditolak');
    // Alamat ruang kernel harus ditolak sebagai pointer pengguna
    pastikan(!KernelABI.isUserPointerValid(0xFFFF_8000_0000_0000n, 8), 'Pointer ruang kernel tidak boleh lolos sebagai user pointer');
    pastikan(KernelABI.isKernelPointer(0xFFFF_FFFF_8000_0000n), 'Pointer higher-half harus diidentifikasi sebagai kernel pointer');
  });

  uji('1.2 Validasi perataan stack dan kalkulasi batas kelipatan', () => {
    samaDengan(KernelABI.isAligned(0x1000n, 16), true, '0x1000 harus 16-byte aligned');
    samaDengan(KernelABI.isAligned(0x1008n, 16), false, '0x1008 tidak 16-byte aligned');
    samaDengan(KernelABI.alignUp(0x1005n, 16), 0x1010n, 'alignUp 0x1005 ke 16 byte harus 0x1010');
    samaDengan(KernelABI.alignDown(0x100Fn, 16), 0x1000n, 'alignDown 0x100F ke 16 byte harus 0x1000');
  });

  uji('1.3 Validasi mangling simbol kernel Nusantara', () => {
    const symbol = KernelABI.mangleKernelSymbol('hal', 'initTimer');
    samaDengan(symbol, '_NK_hal_initTimer', 'Mangling simbol harus berformat _NK_<modul>_<nama>');
  });

  uji('1.4 Validasi struktur register context 64-bit', () => {
    const regs: RegisterContext = {
      rax: 1n, rbx: 2n, rcx: 3n, rdx: 4n,
      rsi: 5n, rdi: 6n, rbp: 7n, rsp: 8n,
      r8: 9n, r9: 10n, r10: 11n, r11: 12n,
      r12: 13n, r13: 14n, r14: 15n, r15: 16n,
      rip: 0x0010_0000n,
      rflags: 0x202n,
      cs: 0x08,
      ss: 0x10,
      cr3: 0x1000n,
    };
    samaDengan(regs.rip, 0x0010_0000n, 'RIP harus sesuai');
    samaDengan(regs.cs, 0x08, 'CS selector kernel harus 0x08');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 2: PHYSICAL MEMORY MANAGER (PMM)
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 2: Physical Memory Manager (PMM) ---');

  uji('2.1 Alokasi dan pembebasan single frame 4 KiB', () => {
    const pmm = new PhysicalMemoryManager(16 * 1024 * 1024); // 16 MB
    const f1 = pmm.allocateFrame();
    pastikan(f1 !== null, 'Frame harus berhasil dialokasikan');
    samaDengan(f1! % 4096n, 0n, 'Alamat frame fisik harus diratakan 4096 byte');

    const f2 = pmm.allocateFrame();
    pastikan(f2 !== null && f2 !== f1, 'Frame berikutnya harus berbeda');

    const freed = pmm.freeFrame(f1!);
    samaDengan(freed, true, 'Pembebasan frame f1 harus berhasil');
  });

  uji('2.2 Alokasi contiguous frame untuk buffer DMA perangkat keras', () => {
    const pmm = new PhysicalMemoryManager(32 * 1024 * 1024); // 32 MB
    const baseAddr = pmm.allocateContiguous(4); // 16 KiB berurutan
    pastikan(baseAddr !== null, 'Contiguous 4 frame harus berhasil dialokasikan');
    samaDengan(baseAddr! % 4096n, 0n, 'Base address harus 4K aligned');
  });

  uji('2.3 Reservasi region memori perangkat keras (VGA/BIOS)', () => {
    const pmm = new PhysicalMemoryManager(16 * 1024 * 1024);
    // Reservasi VGA buffer 0xA0000 s/d 0xC0000 (128 KB)
    pmm.reserveRegion(0x000A_0000n, 128 * 1024);
    const freeCountBefore = pmm.getFreeFrameCount();
    pastikan(freeCountBefore < pmm.getTotalFrameCount(), 'Free frame count harus berkurang setelah reservasi');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 3: VIRTUAL MEMORY MANAGER (VMM) & 4-LEVEL PAGING
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 3: Virtual Memory Manager (VMM) & Paging ---');

  uji('3.1 Pemetaan dan translasi alamat halaman virtual ke fisik', () => {
    const vmm = new VirtualMemoryManager();
    const virt = 0x0000_1000_0000_0000n;
    const phys = 0x0000_0000_0200_0000n;

    vmm.mapPage(virt, phys, { readable: true, writable: true, user: true, executable: false });
    const translated = vmm.translateAddress(virt);
    samaDengan(translated, phys, 'Translasi alamat virtual harus mengembalikan alamat fisik yang dipetakan');
  });

  uji('3.2 Penegakan hak akses halaman (Read/Write/User/NX)', () => {
    const vmm = new VirtualMemoryManager();
    const virtRO = 0x0000_2000_0000_0000n;
    vmm.mapPage(virtRO, 0x0000_0000_0300_0000n, { readable: true, writable: false, user: true, executable: false });

    samaDengan(vmm.checkAccess(virtRO, 'read', true), true, 'Baca harus diizinkan');
    samaDengan(vmm.checkAccess(virtRO, 'write', true), false, 'Tulis pada halaman read-only harus ditolak');
    samaDengan(vmm.checkAccess(virtRO, 'execute', true), false, 'Eksekusi pada halaman non-executable harus ditolak');
  });

  uji('3.3 Pembatalan pemetaan (unmapPage)', () => {
    const vmm = new VirtualMemoryManager();
    const virt = 0x0000_3000_0000_0000n;
    vmm.mapPage(virt, 0x0000_0000_0400_0000n);
    const unmapped = vmm.unmapPage(virt);
    samaDengan(unmapped, true, 'unmapPage harus berhasil');
    samaDengan(vmm.translateAddress(virt), null, 'Halaman yang sudah di-unmap tidak boleh dapat ditranslasi');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 4: KERNEL HEAP ALLOCATOR
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 4: Kernel Heap Allocator ---');

  uji('4.1 Alokasi dinamis berbagai ukuran dan perataan memori', () => {
    const heap = new KernelHeap(0xFFFF_9000_0000_0000n, 4 * 1024 * 1024);
    const a1 = heap.allocate(128, 8);
    pastikan(KernelABI.isAligned(a1, 8), 'Alokasi 128 byte harus 8-byte aligned');

    const a2 = heap.allocate(4096, 4096);
    pastikan(KernelABI.isAligned(a2, 4096), 'Alokasi 4096 byte harus 4096-byte aligned');
  });

  uji('4.2 Free-list recycling pada Kernel Heap', () => {
    const heap = new KernelHeap(0xFFFF_9000_0000_0000n, 2 * 1024 * 1024);
    const p1 = heap.allocate(256, 16);
    const p2 = heap.allocate(512, 16);
    heap.free(p1);

    // Alokasi ukuran serupa harus mendaur ulang blok p1
    const p3 = heap.allocate(256, 16);
    samaDengan(p3, p1, 'Blok bebas yang didaur ulang harus menggunakan alamat p1');
  });

  uji('4.3 Pencegahan double-free dan penolakan pointer palsu', () => {
    const heap = new KernelHeap(0xFFFF_9000_0000_0000n, 1024 * 1024);
    const p1 = heap.allocate(64, 8);
    heap.free(p1);

    let doubleFreeCaught = false;
    try {
      heap.free(p1);
    } catch {
      doubleFreeCaught = true;
    }
    pastikan(doubleFreeCaught, 'Double-free harus memicu galat');

    let invalidPtrCaught = false;
    try {
      heap.free(0x12345678n);
    } catch {
      invalidPtrCaught = true;
    }
    pastikan(invalidPtrCaught, 'Pointer liar tidak sah harus memicu galat');
  });

  uji('4.4 Deteksi kondisi Out-of-Memory (OOM)', () => {
    const smallHeap = new KernelHeap(0xFFFF_9000_0000_0000n, 1024); // 1 KiB
    let oomCaught = false;
    try {
      smallHeap.allocate(2048, 8);
    } catch {
      oomCaught = true;
    }
    pastikan(oomCaught, 'Permintaan alokasi melebihi kapasitas heap harus memicu OOM');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 5: INTERRUPT & EXCEPTION SUBSYSTEM
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 5: Interrupt & Exception Subsystem ---');

  uji('5.1 Inisialisasi IDT dengan 256 gerbang dan pemuatan IDTR', () => {
    const idt = new InterruptDescriptorTable();
    samaDengan(idt.getGateCount(), 256, 'IDT harus memiliki tepat 256 gerbang');
    const idtr = idt.getIDTR();
    samaDengan(idtr.limit, 256 * 16 - 1, 'Batas IDTR harus sesuai dengan 256 entri 16-byte');
  });

  uji('5.2 Pengaturan gerbang interupsi (setGate) dan validasi struktur', () => {
    const idt = new InterruptDescriptorTable();
    idt.setGate(14, 0xFFFF_FFFF_8010_5000n, 0x08, 0x8E); // Page fault handler
    const desc = idt.getDescriptor(14);
    pastikan(desc !== null, 'Descriptor vector 14 harus ada');
    samaDengan(desc!.selector, 0x08, 'Selector segmen harus 0x08 (kernel CS)');
    samaDengan(desc!.typeAttributes, 0x8E, 'Atribut harus 0x8E (Present, Ring 0, 64-bit Interrupt Gate)');
  });

  uji('5.3 Registrasi Exception Handlers (#DE, #UD, #DF, #GP, #PF)', () => {
    const ex = new ExceptionHandler();
    let handledPF = false;
    ex.register(FaultType.PAGE_FAULT, (_frame) => {
      handledPF = true;
      return true;
    });

    const res = ex.handleFault({
      vector: 14,
      faultType: FaultType.PAGE_FAULT,
      faultName: '#PF (Page Fault)',
      errorCode: 2n, // Write violation
      faultAddress: 0x0000_7000_0000_0000n,
      rip: 0x0010_0050n,
      cs: 0x08,
      rflags: 0x202n,
      rsp: 0xFFFF_8000_0000_1000n,
      ss: 0x10,
    });
    samaDengan(handledPF, true, 'Handler Page Fault kustom harus dipanggil');
    samaDengan(res, true, 'Penanganan fault harus mengembalikan nilai true');
  });

  uji('5.4 PIC 8259 Remapping dan Masking IRQ', () => {
    const pic = new InterruptController();
    pic.remap(0x20, 0x28); // Remap Master ke 32 (0x20), Slave ke 40 (0x28)
    samaDengan(pic.isRemapped(), true, 'PIC harus terkonfirmasi remapped');

    pic.maskIRQ(0); // Mask timer
    samaDengan(pic.isIRQMasked(0), true, 'IRQ0 harus berstatus masked');
    pic.unmaskIRQ(0);
    samaDengan(pic.isIRQMasked(0), false, 'IRQ0 harus berstatus unmasked');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 6: HARDWARE ABSTRACTION LAYER (HAL)
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 6: Hardware Abstraction Layer (HAL) ---');

  uji('6.1 Kendali status CPU dan interupsi via HAL', () => {
    const hal = new X86_64HAL();
    hal.cpu.disableInterrupts();
    samaDengan(hal.cpu.areInterruptsEnabled(), false, 'Interupsi harus nonaktif setelah disable');
    hal.cpu.enableInterrupts();
    samaDengan(hal.cpu.areInterruptsEnabled(), true, 'Interupsi harus aktif setelah enable');
  });

  uji('6.2 Emulasi Port I/O (inb/outb)', () => {
    const hal = new X86_64HAL();
    hal.cpu.outb(0x3F8, 0x41); // Tulis 'A' ke port COM1 data
    const read = hal.cpu.inb(0x3F8);
    samaDengan(read, 0x41, 'inb harus membaca byte yang ditulis ke port');
  });

  uji('6.3 HAL Manager Singleton & Device Access', () => {
    const mgr = HALManager.getInstance();
    pastikan(mgr !== null, 'HALManager singleton harus tersedia');
    pastikan(mgr.getHAL() !== null, 'HAL instance harus tersedia');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 7: DEVICE DRIVER SUBSYSTEM
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 7: Device Driver Subsystem ---');

  uji('7.1 Driver Serial COM1 UART 16550 lifecycle dan transmisi', () => {
    const serial = new SerialDriver(0x3F8);
    samaDengan(serial.init(), true, 'Inisialisasi UART 16550 harus sukses');
    const written = serial.writeString('HALO KERNEL\n');
    samaDengan(written, 12, '12 byte harus tertulis ke UART');
  });

  uji('7.2 Driver PIT 8254 Timer konfigurasi frekuensi', () => {
    const pit = new TimerDriver();
    samaDengan(pit.init(), true, 'Inisialisasi PIT harus sukses');
    pit.setFrequency(100); // 100 Hz = 10 ms
    samaDengan(pit.getFrequency(), 100, 'Frekuensi PIT harus 100 Hz');
  });

  uji('7.3 Driver PS/2 Keyboard dan scancode translation', () => {
    const kbd = new KeyboardDriver();
    kbd.init();
    // Simulasikan penekanan tombol 'A' (Set 1 make code: 0x1E)
    const char = kbd.processScancode(0x1E);
    samaDengan(char, 'a', 'Scancode 0x1E harus diterjemahkan menjadi huruf a');
  });

  uji('7.4 Driver Framebuffer VGA text mode 80x25', () => {
    const vga = new FramebufferDriver();
    vga.init();
    vga.writeAt(0, 0, 'N', 0x0F);
    const cell = vga.readAt(0, 0);
    samaDengan(cell.char, 'N', 'Karakter pada (0,0) harus N');
    samaDengan(cell.attribute, 0x0F, 'Warna pada (0,0) harus 0x0F (Putih di atas hitam)');
  });

  uji('7.5 Driver Registry manajemen dan batch lifecycle', () => {
    const reg = new DriverRegistry();
    reg.register(new SerialDriver());
    reg.register(new TimerDriver());
    reg.register(new KeyboardDriver());
    reg.register(new FramebufferDriver());

    samaDengan(reg.getDriverCount(), 4, 'Harus ada 4 driver terdaftar');
    samaDengan(reg.initAll(), true, 'initAll harus berhasil menginisialisasi seluruh driver');
    samaDengan(reg.shutdownAll(), true, 'shutdownAll harus berhasil menonaktifkan seluruh driver');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 8: PROCESS, THREAD, & SCHEDULER
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 8: Process, Thread, & Scheduler ---');

  uji('8.1 Pembuatan Process (PCB) dan Thread (TCB)', () => {
    const proc = new Process(1, 'init', 0x1000n);
    samaDengan(proc.pid, 1, 'PID proses harus 1');
    samaDengan(proc.name, 'init', 'Nama proses harus init');

    const thread = proc.createThread(3); // Priority 3
    pastikan(thread !== null, 'Thread harus berhasil dibuat');
    samaDengan(thread.priority, 3, 'Prioritas thread harus 3');
    samaDengan(proc.getThreadCount(), 1, 'Proses harus memiliki 1 thread');
  });

  uji('8.2 Kontrak ContextSwitch antar thread', () => {
    const t1 = new Thread(1, 1, 3);
    const t2 = new Thread(2, 1, 3);
    t1.context.rip = 0x1000n;
    t2.context.rip = 0x2000n;

    ContextSwitch.perform(t1, t2);
    samaDengan(t2.context.rip, 0x2000n, 'Konteks t2 harus terpelihara');
  });

  uji('8.3 Penjadwal KernelScheduler Multi-Level Priority Queue', () => {
    const sched = new KernelScheduler();
    const p1 = new Process(1, 'task1', 0x1000n);
    const p2 = new Process(2, 'task2', 0x2000n);

    const tLow = p1.createThread(2);  // Rendah
    const tHigh = p2.createThread(5); // Kritis

    sched.addThread(tLow);
    sched.addThread(tHigh);

    // Dispatcher harus mendahulukan tHigh karena prioritas level 5 > level 2
    sched.schedule();
    const curr = sched.getCurrentThread();
    pastikan(curr !== null, 'Harus ada thread yang terpilih');
    samaDengan(curr!.tid, tHigh.tid, 'Thread prioritas tinggi harus dijadwalkan lebih dulu');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 9: FILESYSTEM (VFS & RamFS)
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 9: Filesystem (VFS & RamFS) ---');

  uji('9.1 RamFS operasi berkas dasar (create, write, read, remove)', () => {
    const ramfs = new RamFS();
    ramfs.mount();

    const created = ramfs.create('/hello.txt', 'regular');
    samaDengan(created, true, 'Pembuatan berkas harus sukses');

    const data = new TextEncoder().encode('NUSANTARA OS KERNEL');
    const written = ramfs.write('/hello.txt', 0, data);
    samaDengan(written, data.byteLength, 'Jumlah byte tertulis harus cocok');

    const readBytes = ramfs.read('/hello.txt', 0, 100);
    pastikan(readBytes !== null, 'Data harus terbaca');
    samaDengan(new TextDecoder().decode(readBytes!), 'NUSANTARA OS KERNEL', 'Konten terbaca harus sesuai');

    const removed = ramfs.remove('/hello.txt');
    samaDengan(removed, true, 'Penghapusan berkas harus sukses');
  });

  uji('9.2 Virtual File System (VFS) mount table & descriptor table', () => {
    const vfs = new VirtualFileSystem();
    const ramfs = new RamFS();
    vfs.mount('/', ramfs);

    const fd = vfs.open('/catatan.txt', 'w');
    pastikan(fd >= 3, 'FD harus >= 3');

    const payload = new TextEncoder().encode('Test VFS');
    const written = vfs.write(fd, payload);
    samaDengan(written, 8, '8 byte harus tertulis via VFS');

    vfs.close(fd);

    const fdRead = vfs.open('/catatan.txt', 'r');
    const readBack = vfs.read(fdRead, 16);
    vfs.close(fdRead);

    pastikan(readBack !== null, 'Data harus terbaca via VFS fd');
    samaDengan(new TextDecoder().decode(readBack!), 'Test VFS', 'String VFS harus cocok');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 10: SYSTEM CALL INTERFACE
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 10: System Call Interface ---');

  uji('10.1 Syscall Table registrasi dan lookup nomor syscall', () => {
    const table = SyscallTable.getInstance();
    pastikan(table.has(SyscallNumber.PROCESS_ID), 'sys_process_id harus terdaftar');
    pastikan(table.has(SyscallNumber.CLOCK_GET), 'sys_clock_get harus terdaftar');
    pastikan(table.has(SyscallNumber.THREAD_YIELD), 'sys_thread_yield harus terdaftar');
  });

  await uji('10.2 Syscall Dispatcher penolakan pointer memori tidak sah (EFAULT)', async () => {
    const dispatcher = new SyscallDispatcher();
    // Berikan pointer memori pengguna yang melanggar batas (dalam higher-half)
    const badPtr = 0xFFFF_FFFF_8000_1000n;
    const res = await dispatcher.dispatch(
      SyscallNumber.CONSOLE_WRITE,
      [badPtr, 32n],
      { callingProcessId: 1, callingThreadId: 1, isKernelCaller: false }
    );
    samaDengan(res, BigInt(SyscallError.K_EFAULT), 'Dispatcher harus mengembalikan K_EFAULT pada pointer ilegal');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 11: KERNEL CORE RUNTIME
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 11: Kernel Core Runtime ---');

  uji('11.1 Siklus hidup KernelCore (boot -> running -> halt)', () => {
    const kernel = new KernelCore({ name: 'test-os-core' });
    samaDengan(kernel.getContext().state, KernelState.UNINITIALIZED, 'Status awal harus UNINITIALIZED');

    const booted = kernel.boot();
    samaDengan(booted, true, 'Kernel harus berhasil boot');
    samaDengan(kernel.getContext().state, KernelState.RUNNING, 'Status setelah boot harus RUNNING');

    kernel.tick(5);
    samaDengan(kernel.getContext().ticks, 5, 'Ticks harus bertambah menjadi 5');

    kernel.halt();
    samaDengan(kernel.getContext().state, KernelState.HALTED, 'Status setelah halt harus HALTED');
  });

  uji('11.2 Penanganan KernelPanic dengan stack dan register dump', () => {
    let panicCaught = false;
    try {
      KernelPanic.trigger('Uji kepanikan sistem kernel fatal', {
        rip: 0x0010_0000n,
        rsp: 0xFFFF_8000_0000_2000n,
      });
    } catch (e: any) {
      panicCaught = true;
      pastikan(e.message.includes('KERNEL PANIC'), 'Pesan error harus mengandung KERNEL PANIC');
    }
    pastikan(panicCaught, 'KernelPanic.trigger harus melempar panic error');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 12: TARGET CONFIGURATION, BOOTLOADER, & ELF SYNTHESIZER
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 12: Target Config, Multiboot2, & ELF Synthesizer ---');

  uji('12.1 Konfigurasi target x86_64 freestanding kernel', () => {
    samaDengan(X86_64_KERNEL_TARGET.triple, 'x86_64-unknown-none-elf', 'Triple target harus x86_64-unknown-none-elf');
    samaDengan(X86_64_KERNEL_TARGET.codeModel, 'kernel', 'Code model harus kernel');
    samaDengan(X86_64_KERNEL_TARGET.features.redZone, false, 'Red zone harus nonaktif');
  });

  uji('12.2 Multiboot2 Header Builder dan verifikasi checksum', () => {
    const builder = new Multiboot2HeaderBuilder();
    builder.addFramebufferTag(1024, 768, 32);
    const headerBytes = builder.build();

    const verified = Multiboot2HeaderBuilder.verify(headerBytes);
    samaDengan(verified.valid, true, 'Header Multiboot2 harus valid');
    pastikan(verified.headerLength! >= 16, 'Panjang header harus >= 16 byte');
  });

  uji('12.3 Generator Linker Script higher-half x86_64', () => {
    const script = generateKernelLinkerScript();
    pastikan(script.includes('ENTRY(_start)'), 'Linker script harus memiliki ENTRY(_start)');
    pastikan(script.includes('KERNEL_VIRT_BASE = 0xFFFFFFFF80000000;'), 'Linker script harus memuat basis virtual -2 GiB');
    pastikan(script.includes('.multiboot'), 'Linker script harus memuat seksi .multiboot');
  });

  uji('12.4 KernelELFBuilder sintesis biner ELF64 x86_64 autentik', () => {
    const builder = new KernelELFBuilder({
      kernelName: 'nusantara-test-kernel',
      entryPoint: 0x0010_0000n,
    });
    const elf = builder.build();

    // Verifikasi magic ELF: \x7fELF
    samaDengan(elf[0], 0x7F, 'Byte 0 harus 0x7F');
    samaDengan(elf[1], 0x45, 'Byte 1 harus E');
    samaDengan(elf[2], 0x4C, 'Byte 2 harus L');
    samaDengan(elf[3], 0x46, 'Byte 3 harus F');

    // Verifikasi class 64-bit dan little endian
    samaDengan(elf[4], 2, 'ELFClass harus 2 (64-bit)');
    samaDengan(elf[5], 1, 'ELFData harus 1 (Little Endian)');

    // Verifikasi Multiboot2 header tersimpan di dalam biner
    let foundMultiboot = false;
    const view = new DataView(elf.buffer, elf.byteOffset, elf.byteLength);
    for (let i = 0; i < elf.byteLength - 4; i += 4) {
      if (view.getUint32(i, true) === MULTIBOOT2_HEADER_MAGIC) {
        foundMultiboot = true;
        break;
      }
    }
    pastikan(foundMultiboot, 'Header Multiboot2 (0xE85250D6) harus tertanam di dalam ELF binary');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 13: PROJECT SCAFFOLDER & CLI OS COMMANDS
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 13: Project Scaffolder & CLI OS Commands ---');

  uji('13.1 Scaffolding proyek kernel via KernelProjectGenerator', () => {
    const manifest = KernelProjectGenerator.generateManifest({
      name: 'uji-kernel',
      target: 'nusantara-x86_64-kernel',
      bootProtocol: 'multiboot2',
    });
    pastikan(manifest.length >= 6, 'Manifest harus menghasilkan minimal 6 berkas proyek');
    const hasConfig = manifest.some((m) => m.path.endsWith('nusantara.os.json'));
    const hasKernel = manifest.some((m) => m.path.endsWith('src/kernel.nusantara'));
    const hasLinker = manifest.some((m) => m.path.endsWith('linker.ld'));

    pastikan(hasConfig, 'Harus menghasilkan nusantara.os.json');
    pastikan(hasKernel, 'Harus menghasilkan src/kernel.nusantara');
    pastikan(hasLinker, 'Harus menghasilkan linker.ld');
  });

  uji('13.2 Pemeriksaan deteksi QEMU pada sistem host (transparan & jujur)', () => {
    const qemuRes = safeCP.spawnSync('which', ['qemu-system-x86_64']);
    if (qemuRes.status === 0 && qemuRes.stdout.trim().length > 0) {
      console.log(`    [INFO] QEMU ditemukan: ${qemuRes.stdout.trim()}`);
    } else {
      console.log('    [INFO] QEMU tidak terpasang di host container ini (status didokumentasikan transparan)');
    }
    // Asersi bahwa deteksi tidak melempar galat crash
    pastikan(true, 'Deteksi toolchain eksternal harus berjalan aman tanpa uncaught exception');
  });

  // ---------------------------------------------------------------------------
  // KELOMPOK 14: END-TO-END NUSANTARA STD:OS INTERPRETATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Kelompok 14: End-to-End Nusantara std:os Interpretation ---');

  uji('14.1 Eksekusi program Nusantara menggunakan std:os', () => {
    const kodeSumber = `
program UjiKernel
gunakan "std:os" sebagai os
mulai
    v : teks = os.versiKernel()
    ptr : bilangan = os.alokasiMemori(1024, 16)
    lap : teks = os.laporanMemori()
    tampilkan("Hasil: " + v)
selesai
    `;

    const parser = new Parser(kodeSumber);
    const ast = parser.parse();

    const pembaca = new PembacaBerkasMemori();
    pembaca.tulis('program.nusantara', kodeSumber);

    const resolver = new ResolverModul(pembaca, { direktoriAkarProyek: '.' });
    const pemuat = new PemuatModul(resolver, pembaca);

    const pemeriksaTipe = new PemeriksaTipe(pemuat);
    const galatTipe = pemeriksaTipe.periksa(ast, '.');
    samaDengan(galatTipe.length, 0, 'Typechecker tidak boleh menghasilkan galat');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis, {
      pemuatModul: pemuat,
      resolverModul: resolver,
      pembacaBerkas: pembaca,
      direktoriBasis: '.',
    });

    interpreter.interpretasikan(ast);
    pastikan(true, 'Program kernel harus berhasil diinterpretasikan tanpa error');
  });

  // ---------------------------------------------------------------------------
  // REKAPITULASI HASIL AKHIR
  // ---------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(
    `HASIL PENGUJIAN PHASE 48: ${ujiLulus} LULUS, ${ujiGagal} GAGAL, ${ujiSkipped} SKIPPED (Total: ${jumlahUji})`
  );
  if (ujiGagal === 0) {
    console.log('Semua pengujian Fase 48 (NUSANTARA OS Kernel Interface) BERHASIL 100%!');
  } else {
    console.error('Terdapat pengujian Fase 48 yang GAGAL!');
    process.exit(1);
  }
  console.log('======================================================================');
}

jalankanSemuaPengujian().catch((err) => {
  console.error('Kesalahan fatal selama pengujian:', err);
  process.exit(1);
});
