/* SPDX-License-Identifier: Apache-2.0
 * Phase 123: two independent ELF processes alternate in EL0 under QEMU.
 */
#include <stddef.h>
#include <stdint.h>
#include "process-bootstrap.h"
#include "process-scheduler.h"
#include "process-syscall-adapter.h"
#include "user-memory.h"
#include "mmu-control.h"

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
static nusantara_arm64_process_syscall_adapter_t syscall_adapter;
static uint8_t elf_a[ELF_BYTES], elf_b[ELF_BYTES];
typedef struct phase124_idle_context {
    nusantara_arm64_exception_frame_t frame;
    uint64_t scratch[2];
} phase124_idle_context_t;
static _Alignas(16) phase124_idle_context_t idle_context;
static uint64_t task_a_id, task_b_id;
static unsigned writes_a, writes_b;
static int marker_a_ok, marker_b_ok;

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

static void make_elf(uint8_t *b,const char *message,size_t message_len,uint16_t marker) {
    size_t i;
    uint32_t code[18]={
        UINT32_C(0xd2800028),UINT32_C(0xd2a00800),UINT32_C(0xf2820000),
        UINT32_C(0xd2800121),UINT32_C(0xd4000001),
        UINT32_C(0xd2820209),UINT32_C(0xf2a00809),UINT32_C(0xd280000a),
        UINT32_C(0xf900012a),UINT32_C(0xd2800068),UINT32_C(0xd4000001),
        UINT32_C(0xd2800028),UINT32_C(0xd2a00800),UINT32_C(0xf2820000),
        UINT32_C(0xd2800121),UINT32_C(0xd4000001),
        UINT32_C(0xd2800048),UINT32_C(0xd4000001)
    };
    code[7]=UINT32_C(0xd280000a)|((uint32_t)marker<<5);
    for(i=0;i<ELF_BYTES;i++)b[i]=0u;
    b[0]=0x7fu;b[1]='E';b[2]='L';b[3]='F';b[4]=2u;b[5]=1u;b[6]=1u;
    put16(b+16,2u);put16(b+18,183u);put32(b+20,1u);
    put64(b+24,USER_ENTRY);put64(b+32,64u);
    put16(b+52,64u);put16(b+54,56u);put16(b+56,2u);
    put32(b+64,1u);put32(b+68,5u);
    put64(b+72,0x1000u);put64(b+80,USER_ENTRY);put64(b+88,USER_ENTRY);
    put64(b+96,sizeof(code));put64(b+104,sizeof(code));put64(b+112,0x1000u);
    put32(b+0x1000u+0u,code[0]);
    put32(b+0x1000u+4u,code[1]);
    put32(b+0x1000u+8u,code[2]);
    put32(b+0x1000u+12u,code[3]);
    put32(b+0x1000u+16u,code[4]);
    put32(b+0x1000u+20u,code[5]);
    put32(b+0x1000u+24u,code[6]);
    put32(b+0x1000u+28u,code[7]);
    put32(b+0x1000u+32u,code[8]);
    put32(b+0x1000u+36u,code[9]);
    put32(b+0x1000u+40u,code[10]);
    put32(b+0x1000u+44u,code[11]);
    put32(b+0x1000u+48u,code[12]);
    put32(b+0x1000u+52u,code[13]);
    put32(b+0x1000u+56u,code[14]);
    put32(b+0x1000u+60u,code[15]);
    put32(b+0x1000u+64u,code[16]);
    put32(b+0x1000u+68u,code[17]);
    put32(b+120,1u);put32(b+124,6u);
    put64(b+128,0x2000u);put64(b+136,USER_DATA);put64(b+144,USER_DATA);
    put64(b+152,message_len);put64(b+160,message_len);put64(b+168,0x1000u);
    for(i=0;i<message_len;i++)b[0x2000u+i]=(uint8_t)message[i];
}
static int map_kernel(nusantara_arm64_address_space_t *space) {
    uint64_t off;
    for(off=0;off<KERNEL_BYTES;off+=4096u)
        if(!nusantara_arm64_mmu_map_page(&space->mmu,KERNEL_BASE+off,
             KERNEL_BASE+off,NUSANTARA_ARM64_PAGE_KERNEL_RW,1))return 0;
    if(!nusantara_arm64_mmu_map_page(&space->mmu,UART_BASE,UART_BASE,
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
static int validate_active(void *ctx,uintptr_t address,size_t length) {
    nusantara_arm64_address_space_manager_t *m=
        (nusantara_arm64_address_space_manager_t *)ctx;
    if(m==0||m->active==0)return 0;
    return nusantara_arm64_user_memory_validate(
        m->active,address,length,NUSANTARA_ARM64_USER_MEMORY_READ);
}
static int64_t write_active(void *ctx,uintptr_t address,size_t length) {
    nusantara_arm64_address_space_manager_t *m=
        (nusantara_arm64_address_space_manager_t *)ctx;
    const char *p=(const char *)address;size_t i;
    if(m->active==&process_a.address_space){
        ++writes_a;
        if(writes_a==2u){
            if(*(volatile uint64_t *)(uintptr_t)(USER_DATA+16u)!=UINT64_C(0xA123))
                return NUSANTARA_ARM64_SYSCALL_EFAULT;
            marker_a_ok=1;
        }
    } else if(m->active==&process_b.address_space){
        ++writes_b;
        if(writes_b==2u){
            if(*(volatile uint64_t *)(uintptr_t)(USER_DATA+16u)!=UINT64_C(0xB456))
                return NUSANTARA_ARM64_SYSCALL_EFAULT;
            marker_b_ok=1;
        }
    } else return NUSANTARA_ARM64_SYSCALL_EFAULT;
    for(i=0;i<length;i++)uart_putc(p[i]);
    uart_putc('\r');uart_putc('\n');
    return (int64_t)length;
}
static void phase124_idle(void) {
    if(nusantara_arm64_process_scheduler_reap(&process_scheduler,task_a_id)!=
       NUSANTARA_ARM64_PROCESS_SCHEDULER_OK||
       nusantara_arm64_process_scheduler_reap(&process_scheduler,task_b_id)!=
       NUSANTARA_ARM64_PROCESS_SCHEDULER_OK){
        uart_puts("NUSANTARA_PHASE124_FAIL_REAP\r\n");halt();
    }
    if(writes_a!=2u||writes_b!=2u||!marker_a_ok||!marker_b_ok){
        uart_puts("NUSANTARA_PHASE124_FAIL_COUNTS\r\n");halt();
    }
    uart_puts("NUSANTARA_PHASE124_PRIVATE_DATA_PERSISTS_ACROSS_YIELD\r\n");
    uart_puts("NUSANTARA_PHASE124_A_YIELD_TO_B_OK\r\n");
    uart_puts("NUSANTARA_PHASE124_B_YIELD_TO_A_OK\r\n");
    uart_puts("NUSANTARA_PHASE124_EXIT_AND_REAP_OK\r\n");
    uart_puts("NUSANTARA_PHASE124_PASS\r\n");
    halt();
}
void phase124_main(uintptr_t dtb) {
    const nusantara_arm64_address_space_ops_t page_ops={
        page_allocate,page_resolve,page_release,install_root
    };
    nusantara_arm64_user_syscall_ops_t syscall_ops={
        &manager,validate_active,write_active,0,0,0,0
    };
    nusantara_os_task_t *task_a=0,*task_b=0,*first=0;
    nusantara_arm64_exception_frame_t *first_frame=0;
    size_t i;
    (void)dtb;
    uart_puts("NUSANTARA_PHASE124_BOOT\r\n");
    make_elf(elf_a,"PROCESS-A",9u,UINT16_C(0xA123));
    make_elf(elf_b,"PROCESS-B",9u,UINT16_C(0xB456));
    if(!nusantara_arm64_install_exception_vectors()||
       !nusantara_arm64_address_space_manager_init(&manager,&page_ops,0)){
        uart_puts("NUSANTARA_PHASE124_FAIL_INIT\r\n");halt();
    }
    if(nusantara_arm64_address_space_create(&manager,&kernel_space,1u)!=
       NUSANTARA_ARM64_AS_OK||!map_kernel(&kernel_space)){
        uart_puts("NUSANTARA_PHASE124_FAIL_KERNEL\r\n");halt();
    }
    if(nusantara_arm64_process_bootstrap_create(&manager,&process_a,10u,
       elf_a,sizeof(elf_a),USER_STACK_TOP,2u,0u,USER_ENTRY,
       kernel_stack_a,sizeof(kernel_stack_a))!=NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK||
       nusantara_arm64_process_bootstrap_create(&manager,&process_b,20u,
       elf_b,sizeof(elf_b),USER_STACK_TOP,2u,0u,USER_ENTRY,
       kernel_stack_b,sizeof(kernel_stack_b))!=NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK||
       !map_kernel(&process_a.address_space)||!map_kernel(&process_b.address_space)){
        uart_puts("NUSANTARA_PHASE124_FAIL_ELF_CREATE\r\n");halt();
    }
    nusantara_os_scheduler_init(&task_scheduler);
    if(nusantara_os_scheduler_add(&task_scheduler,(uintptr_t)process_a.initial_frame,
       0,1u,&task_a_id)!=NUSANTARA_OS_SCHEDULER_OK||
       nusantara_os_scheduler_add(&task_scheduler,(uintptr_t)process_b.initial_frame,
       0,1u,&task_b_id)!=NUSANTARA_OS_SCHEDULER_OK){
        uart_puts("NUSANTARA_PHASE124_FAIL_TASK_ADD\r\n");halt();
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
        uart_puts("NUSANTARA_PHASE124_FAIL_SCHEDULER\r\n");halt();
    }
    idle_context.frame.elr_el1=(uint64_t)(uintptr_t)phase124_idle;
    idle_context.frame.spsr_el1=NUSANTARA_ARM64_SPSR_EL1H_MASKED;
    if(!nusantara_arm64_process_syscall_adapter_init(&syscall_adapter,
       &process_scheduler,&syscall_ops,&idle_context.frame)||
       !nusantara_arm64_user_syscall_init(&syscall_ops)||
       nusantara_arm64_process_scheduler_start(&process_scheduler,&first_frame)!=
         NUSANTARA_ARM64_PROCESS_SCHEDULER_OK||
       first_frame!=process_a.initial_frame||
       !nusantara_arm64_mmu_enable_el1(process_a.address_space.root_physical)){
        uart_puts("NUSANTARA_PHASE124_FAIL_START\r\n");halt();
    }
    (void)first;
    uart_puts("NUSANTARA_PHASE124_ERET_TO_EL0\r\n");
    nusantara_arm64_exception_start_first_task((uintptr_t)first_frame);
    uart_puts("NUSANTARA_PHASE124_FAIL_ERET_RETURNED\r\n");halt();
}
