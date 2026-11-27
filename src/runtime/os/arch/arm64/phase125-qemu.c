/* SPDX-License-Identifier: Apache-2.0
 * Phase 125: EL0 process address spaces switch on real GICv3 timer IRQs.
 */
#include <stddef.h>
#include <stdint.h>
#include "process-bootstrap.h"
#include "process-scheduler.h"
#include "mmu-control.h"
#include "gicv3.h"
#include "generic_timer.h"
#include "irq-runtime.h"
#include "irq-scheduler.h"

#define UART_BASE UINT64_C(0x09000000)
#define KERNEL_BASE UINT64_C(0x40000000)
#define KERNEL_BYTES UINT64_C(0x00200000)
#define USER_ENTRY UINT64_C(0x00400000)
#define USER_DATA UINT64_C(0x00401000)
#define USER_STACK_TOP UINT64_C(0x7fff0000)
#define PAGE_COUNT 128u
#define ELF_BYTES 0x2100u

static _Alignas(4096) uint8_t page_pool[PAGE_COUNT][4096];
static uint8_t page_used[PAGE_COUNT];
static _Alignas(16) uint8_t kernel_stack_a[8192], kernel_stack_b[8192];
static nusantara_arm64_address_space_manager_t manager;
static nusantara_arm64_address_space_t kernel_space;
static nusantara_arm64_process_bootstrap_t process_a, process_b;
static nusantara_arm64_process_task_t binding_a, binding_b;
static nusantara_arm64_process_scheduler_t process_scheduler;
static nusantara_os_scheduler_t task_scheduler;
static uint8_t elf_a[ELF_BYTES], elf_b[ELF_BYTES];
static uint64_t task_a_id, task_b_id;
static nusantara_gicv3_t gic;
static nusantara_arm64_generic_timer_t timer;
static nusantara_gicv3_cpu_interface_t cpu_interface;
static nusantara_arm64_irq_runtime_t irq_runtime;
static nusantara_arm64_irq_scheduler_t irq_scheduler;
static volatile unsigned timer_switches;
static volatile unsigned marker_a_seen, marker_b_seen;
#define PHASE125_GICD_BASE ((uintptr_t)0x08000000u)
#define PHASE125_GICR_BASE ((uintptr_t)0x080a0000u)
#define PHASE125_TIMER_PPI 30u
#define PHASE125_TIMER_INTERVAL_MS 5u

extern void nusantara_arm64_exception_start_first_task(uintptr_t frame_pointer);

static void uart_putc(char c) {
    volatile uint32_t *fr=(volatile uint32_t *)(uintptr_t)(UART_BASE+0x18u);
    volatile uint32_t *dr=(volatile uint32_t *)(uintptr_t)UART_BASE;
    while((*fr&(1u<<5))!=0u) { }
    *dr=(uint32_t)(uint8_t)c;
}
static void uart_puts(const char *s) { while(*s) uart_putc(*s++); }
static void halt(void) {
    __asm__ volatile("msr daifset, #0xf" ::: "memory");
    for(;;) __asm__ volatile("wfe");
}
static int page_allocate(void *ctx,uint64_t *pa,uint64_t **alias) {
    size_t i,j; (void)ctx;
    if(pa==0||alias==0)return 0;
    for(i=0;i<PAGE_COUNT;i++)if(!page_used[i]){
        page_used[i]=1u;
        for(j=0;j<4096u;j++)page_pool[i][j]=0u;
        *pa=(uint64_t)(uintptr_t)page_pool[i];
        *alias=(uint64_t *)(void *)page_pool[i];return 1;
    }
    return 0;
}
static int page_resolve(void *ctx,uint64_t pa,uint64_t **alias) {
    size_t i;(void)ctx;if(alias==0)return 0;
    for(i=0;i<PAGE_COUNT;i++)if(page_used[i]&&(uint64_t)(uintptr_t)page_pool[i]==pa){
        *alias=(uint64_t *)(void *)page_pool[i];return 1;
    }
    return 0;
}
static void page_release(void *ctx,uint64_t pa) {
    size_t i;(void)ctx;
    for(i=0;i<PAGE_COUNT;i++)if(page_used[i]&&(uint64_t)(uintptr_t)page_pool[i]==pa){
        page_used[i]=0u;return;
    }
}
static int install_root(void *ctx,uint64_t root) {
    (void)ctx;return nusantara_arm64_mmu_install_ttbr0(root);
}
static void put16(uint8_t *p,uint16_t v){p[0]=(uint8_t)v;p[1]=(uint8_t)(v>>8);}
static void put32(uint8_t *p,uint32_t v){p[0]=(uint8_t)v;p[1]=(uint8_t)(v>>8);p[2]=(uint8_t)(v>>16);p[3]=(uint8_t)(v>>24);}
static void put64(uint8_t *p,uint64_t v){put32(p,(uint32_t)v);put32(p+4,(uint32_t)(v>>32));}

static void make_elf(uint8_t *b,uint16_t marker) {
    const uint32_t code[5]={
        UINT32_C(0xd2820209),UINT32_C(0xf2a00809),
        UINT32_C(0xd280000a),UINT32_C(0xf900012a),
        UINT32_C(0x14000000)
    };
    size_t i;
    for(i=0;i<ELF_BYTES;i++)b[i]=0u;
    b[0]=0x7fu;b[1]='E';b[2]='L';b[3]='F';b[4]=2u;b[5]=1u;b[6]=1u;
    put16(b+16,2u);put16(b+18,183u);put32(b+20,1u);
    put64(b+24,USER_ENTRY);put64(b+32,64u);
    put16(b+52,64u);put16(b+54,56u);put16(b+56,2u);
    put32(b+64,1u);put32(b+68,5u);
    put64(b+72,0x1000u);put64(b+80,USER_ENTRY);put64(b+88,USER_ENTRY);
    put64(b+96,sizeof(code));put64(b+104,sizeof(code));put64(b+112,0x1000u);
    for(i=0;i<4u;i++)put32(b+0x1000u+i*4u,code[i]);
    put32(b+0x1000u+16u,code[4]);
    put32(b+120,1u);put32(b+124,6u);
    put64(b+128,0x2000u);put64(b+136,USER_DATA);put64(b+144,USER_DATA);
    put64(b+152,32u);put64(b+160,32u);put64(b+168,0x1000u);
    put32(b+0x2000u+16u,(uint32_t)marker);
}
static int map_kernel(nusantara_arm64_address_space_t *space) {
    uint64_t off;
    for(off=0;off<KERNEL_BYTES;off+=4096u)
        if(!nusantara_arm64_mmu_map_page(&space->mmu,KERNEL_BASE+off,
             KERNEL_BASE+off,NUSANTARA_ARM64_PAGE_KERNEL_RW,1))return 0;
    if(!nusantara_arm64_mmu_map_page(&space->mmu,UART_BASE,UART_BASE,
          NUSANTARA_ARM64_PAGE_KERNEL_RW,0))return 0;
    for(off=0;off<0x10000u;off+=4096u)
        if(!nusantara_arm64_mmu_map_page(&space->mmu,
             UINT64_C(0x08000000)+off,UINT64_C(0x08000000)+off,
             NUSANTARA_ARM64_PAGE_KERNEL_RW,0))return 0;
    for(off=0;off<0x10000u;off+=4096u)
        if(!nusantara_arm64_mmu_map_page(&space->mmu,
             UINT64_C(0x080a0000)+off,UINT64_C(0x080a0000)+off,
             NUSANTARA_ARM64_PAGE_KERNEL_RW,0))return 0;
    {
        uint64_t *entries=space->mmu.root.entries;
        const unsigned shifts[3]={39u,30u,21u};unsigned level;
        for(level=0;level<3u;level++){
            uint64_t d=entries[(UART_BASE>>shifts[level])&0x1ffu];
            nusantara_arm64_page_table_t child;
            child.entries=0;child.physical_address=d&NUSANTARA_ARM64_PA_MASK;
            if((d&3u)!=NUSANTARA_ARM64_DESC_TABLE_PAGE||
               !space->mmu.allocate_table(space->mmu.allocator_context,&child)||
               child.entries==0)return 0;
            entries=child.entries;
        }
        entries[(UART_BASE>>12)&0x1ffu]=
          (entries[(UART_BASE>>12)&0x1ffu]&~(UINT64_C(7)<<2))|(UINT64_C(1)<<2);
    }
    return 1;
}
static void phase125_success(void) {
    uart_puts("NUSANTARA_PHASE125_TIMER_PREEMPTION_OK\\r\\n");
    uart_puts("NUSANTARA_PHASE125_ADDRESS_SPACE_SWITCH_OK\\r\\n");
    uart_puts("NUSANTARA_PHASE125_PASS\\r\\n");
    halt();
}
static void task_selected(void *context,const nusantara_os_task_t *task) {
    (void)context;
    if(task==0)return;
    ++timer_switches;
    if(manager.active==&process_a.address_space &&
       *(volatile uint64_t *)(uintptr_t)(USER_DATA+16u)==UINT64_C(0xA123))
        ++marker_a_seen;
    if(manager.active==&process_b.address_space &&
       *(volatile uint64_t *)(uintptr_t)(USER_DATA+16u)==UINT64_C(0xB456))
        ++marker_b_seen;
    if(timer_switches>=8u && marker_a_seen>=2u && marker_b_seen>=2u)
        phase125_success();
}
static uint32_t mmio_read32(void *ctx,uintptr_t a){(void)ctx;return *(volatile uint32_t *)a;}
static void mmio_write32(void *ctx,uintptr_t a,uint32_t v){(void)ctx;*(volatile uint32_t *)a=v;}
static uint64_t mmio_read64(void *ctx,uintptr_t a){(void)ctx;return *(volatile uint64_t *)a;}
static void mmio_write64(void *ctx,uintptr_t a,uint64_t v){(void)ctx;*(volatile uint64_t *)a=v;}
static void platform_barrier(void *ctx){(void)ctx;__asm__ volatile("dsb sy\\n\\tisb":::"memory");}
static uint64_t timer_read_frequency(void *ctx){uint64_t v;(void)ctx;__asm__ volatile("mrs %0,cntfrq_el0":"=r"(v));return v;}
static uint64_t timer_read_counter(void *ctx){uint64_t v;(void)ctx;__asm__ volatile("mrs %0,cntpct_el0":"=r"(v));return v;}
static uint32_t timer_read_control(void *ctx){uint64_t v;(void)ctx;__asm__ volatile("mrs %0,cntp_ctl_el0":"=r"(v));return (uint32_t)v;}
static void timer_write_tval(void *ctx,int32_t v){(void)ctx;__asm__ volatile("msr cntp_tval_el0,%0"::"r"((uint64_t)(int64_t)v):"memory");}
static void timer_write_control(void *ctx,uint32_t v){(void)ctx;__asm__ volatile("msr cntp_ctl_el0,%0"::"r"((uint64_t)v):"memory");}
static void platform_isb(void *ctx){(void)ctx;__asm__ volatile("isb":::"memory");}
static void cpu_write_sre(void *ctx,uint64_t v){(void)ctx;__asm__ volatile("msr ICC_SRE_EL1,%0\\n\\tisb"::"r"(v):"memory");}
static void cpu_write_pmr(void *ctx,uint64_t v){(void)ctx;__asm__ volatile("msr ICC_PMR_EL1,%0\\n\\tisb"::"r"(v):"memory");}
static void cpu_write_bpr1(void *ctx,uint64_t v){(void)ctx;__asm__ volatile("msr ICC_BPR1_EL1,%0\\n\\tisb"::"r"(v):"memory");}
static void cpu_write_igrpen1(void *ctx,uint64_t v){(void)ctx;__asm__ volatile("msr ICC_IGRPEN1_EL1,%0\\n\\tisb"::"r"(v):"memory");}
static uint32_t cpu_read_iar1(void *ctx){uint64_t v;(void)ctx;__asm__ volatile("mrs %0,ICC_IAR1_EL1":"=r"(v));return (uint32_t)v;}
static void cpu_write_eoir1(void *ctx,uint32_t v){(void)ctx;__asm__ volatile("msr ICC_EOIR1_EL1,%0\\n\\tisb"::"r"((uint64_t)v):"memory");}
void phase125_main(uintptr_t dtb) {
    const nusantara_arm64_address_space_ops_t page_ops={
        page_allocate,page_resolve,page_release,install_root
    };
    const nusantara_gicv3_mmio_t mmio={0,mmio_read32,mmio_write32,mmio_read64,mmio_write64,platform_barrier};
    const nusantara_arm64_timer_io_t timer_io={0,timer_read_frequency,timer_read_counter,
        timer_read_control,timer_write_tval,timer_write_control,platform_isb};
    nusantara_os_task_t *task_a=0,*task_b=0;
    nusantara_arm64_exception_frame_t *first_frame=0;
    size_t i;
    (void)dtb;
    uart_puts("NUSANTARA_PHASE125_BOOT\r\n");
    make_elf(elf_a,UINT16_C(0xA123));
    make_elf(elf_b,UINT16_C(0xB456));
    if(!nusantara_arm64_install_exception_vectors()||
       !nusantara_arm64_address_space_manager_init(&manager,&page_ops,0)){
        uart_puts("NUSANTARA_PHASE125_FAIL_INIT\r\n");halt();
    }
    if(nusantara_arm64_address_space_create(&manager,&kernel_space,1u)!=
       NUSANTARA_ARM64_AS_OK||!map_kernel(&kernel_space)){
        uart_puts("NUSANTARA_PHASE125_FAIL_KERNEL\r\n");halt();
    }
    if(nusantara_arm64_process_bootstrap_create(&manager,&process_a,10u,
       elf_a,sizeof(elf_a),USER_STACK_TOP,2u,0u,USER_ENTRY,
       kernel_stack_a,sizeof(kernel_stack_a))!=NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK||
       nusantara_arm64_process_bootstrap_create(&manager,&process_b,20u,
       elf_b,sizeof(elf_b),USER_STACK_TOP,2u,0u,USER_ENTRY,
       kernel_stack_b,sizeof(kernel_stack_b))!=NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK||
       !map_kernel(&process_a.address_space)||!map_kernel(&process_b.address_space)){
        uart_puts("NUSANTARA_PHASE125_FAIL_ELF_CREATE\r\n");halt();
    }
    if(nusantara_gicv3_distributor_init(&gic,&mmio,PHASE125_GICD_BASE,100000u)!=NUSANTARA_GICV3_OK||
       nusantara_gicv3_redistributor_wake(&gic,PHASE125_GICR_BASE)!=NUSANTARA_GICV3_OK){
        uart_puts("NUSANTARA_PHASE125_FAIL_GIC_INIT\\r\\n");halt();
    }
    cpu_interface.context=0;
    cpu_interface.write_sre_el1=cpu_write_sre;
    cpu_interface.write_pmr_el1=cpu_write_pmr;
    cpu_interface.write_bpr1_el1=cpu_write_bpr1;
    cpu_interface.write_igrpen1_el1=cpu_write_igrpen1;
    cpu_interface.read_iar1_el1=cpu_read_iar1;
    cpu_interface.write_eoir1_el1=cpu_write_eoir1;
    cpu_interface.isb=platform_isb;
    if(nusantara_gicv3_cpu_interface_enable(&gic,&cpu_interface)!=NUSANTARA_GICV3_OK||
       nusantara_gicv3_enable_ppi(&gic,PHASE125_TIMER_PPI)!=NUSANTARA_GICV3_OK||
       nusantara_arm64_timer_init(&timer,&timer_io)!=NUSANTARA_ARM64_TIMER_OK){
        uart_puts("NUSANTARA_PHASE125_FAIL_TIMER_INIT\\r\\n");halt();
    }
    nusantara_os_scheduler_init(&task_scheduler);
    if(nusantara_os_scheduler_add(&task_scheduler,(uintptr_t)process_a.initial_frame,
       0,1u,&task_a_id)!=NUSANTARA_OS_SCHEDULER_OK||
       nusantara_os_scheduler_add(&task_scheduler,(uintptr_t)process_b.initial_frame,
       0,1u,&task_b_id)!=NUSANTARA_OS_SCHEDULER_OK){
        uart_puts("NUSANTARA_PHASE125_FAIL_TASK_ADD\r\n");halt();
    }
    for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;i++){
        if(task_scheduler.tasks[i].id==task_a_id)task_a=&task_scheduler.tasks[i];
        if(task_scheduler.tasks[i].id==task_b_id)task_b=&task_scheduler.tasks[i];
    }
    if(task_a==0||task_b==0||
       nusantara_arm64_process_scheduler_init(&process_scheduler,&task_scheduler,
          &manager,kernel_space.root_physical)!=NUSANTARA_ARM64_PROCESS_SCHEDULER_OK||
       nusantara_arm64_process_scheduler_attach(&process_scheduler,task_a,
          &binding_a,&process_a)!=NUSANTARA_ARM64_PROCESS_SCHEDULER_OK||
       nusantara_arm64_process_scheduler_attach(&process_scheduler,task_b,
          &binding_b,&process_b)!=NUSANTARA_ARM64_PROCESS_SCHEDULER_OK){
        uart_puts("NUSANTARA_PHASE125_FAIL_SCHEDULER\r\n");halt();
    }
    idle_context.frame.elr_el1=(uint64_t)(uintptr_t)phase125_idle;
    idle_context.frame.spsr_el1=NUSANTARA_ARM64_SPSR_EL1H_MASKED;
    if(nusantara_arm64_process_scheduler_start(&process_scheduler,&first_frame)!=
         NUSANTARA_ARM64_PROCESS_SCHEDULER_OK||
       first_frame!=process_a.initial_frame||
       !nusantara_arm64_mmu_enable_el1(process_a.address_space.root_physical)){
        uart_puts("NUSANTARA_PHASE125_FAIL_START\r\n");halt();
    }
    (void)first;
    uart_puts("NUSANTARA_PHASE125_ERET_TO_EL0\r\n");
    nusantara_arm64_exception_start_first_task((uintptr_t)first_frame);
    uart_puts("NUSANTARA_PHASE125_FAIL_ERET_RETURNED\r\n");halt();
}
