/* SPDX-License-Identifier: Apache-2.0
 * Phase 118: run an ELF payload through the standard EL0 write/exit ABI.
 */
#include <stddef.h>
#include <stdint.h>
#include "process-bootstrap.h"
#include "user-syscall.h"
#include "user-memory.h"
#include "mmu-control.h"

#define UART_BASE UINT64_C(0x09000000)
#define KERNEL_BASE UINT64_C(0x40000000)
#define KERNEL_BYTES UINT64_C(0x00200000)
#define USER_ENTRY UINT64_C(0x00400000)
#define USER_DATA UINT64_C(0x00401000)
#define USER_STACK_TOP UINT64_C(0x7fff0000)
#define USER_STACK_PAGES 2u
#define PAGE_COUNT 64u
#define ELF_BYTES 0x2100u

static const char user_message[]="NUSANTARA EL0 WRITE SYSCALL OK\r\n";
static _Alignas(4096) uint8_t page_pool[PAGE_COUNT][4096];
static uint8_t page_used[PAGE_COUNT];
static _Alignas(16) uint8_t kernel_stack[8192];
static nusantara_arm64_address_space_manager_t manager;
static nusantara_arm64_address_space_t kernel_space;
static nusantara_arm64_process_bootstrap_t process;
static uint8_t elf_image[ELF_BYTES];
static size_t write_count;
static size_t rejected_count;

extern void nusantara_arm64_exception_start_first_task(uintptr_t frame_pointer);

static void uart_putc(char c)
{
    volatile uint32_t *fr=(volatile uint32_t *)(uintptr_t)(UART_BASE+0x18u);
    volatile uint32_t *dr=(volatile uint32_t *)(uintptr_t)(UART_BASE+0x00u);
    while((*fr&(1u<<5))!=0u) { }
    *dr=(uint32_t)(uint8_t)c;
}
static void uart_puts(const char *s) { while(*s) uart_putc(*s++); }
static void halt(void)
{
    __asm__ volatile("msr daifset, #0xf" ::: "memory");
    for(;;) __asm__ volatile("wfe");
}
static int page_allocate(void *ctx,uint64_t *pa,uint64_t **alias)
{
    size_t i,j; (void)ctx;
    if(pa==0 || alias==0) return 0;
    for(i=0;i<PAGE_COUNT;i++) if(!page_used[i]) {
        page_used[i]=1u;
        for(j=0;j<4096u;j++) page_pool[i][j]=0u;
        *pa=(uint64_t)(uintptr_t)page_pool[i];
        *alias=(uint64_t *)(void *)page_pool[i];
        return 1;
    }
    return 0;
}
static int page_resolve(void *ctx,uint64_t pa,uint64_t **alias)
{
    size_t i; (void)ctx;
    if(alias==0) return 0;
    for(i=0;i<PAGE_COUNT;i++)
        if(page_used[i] && (uint64_t)(uintptr_t)page_pool[i]==pa) {
            *alias=(uint64_t *)(void *)page_pool[i]; return 1;
        }
    return 0;
}
static void page_release(void *ctx,uint64_t pa)
{
    size_t i; (void)ctx;
    for(i=0;i<PAGE_COUNT;i++)
        if(page_used[i] && (uint64_t)(uintptr_t)page_pool[i]==pa) {
            page_used[i]=0u; return;
        }
}
static int install_root(void *ctx,uint64_t root)
{ (void)ctx; return nusantara_arm64_mmu_install_ttbr0(root); }
static size_t active_pages(void)
{
    size_t i,n=0u;
    for(i=0;i<PAGE_COUNT;i++) if(page_used[i]) ++n;
    return n;
}
static void put16(uint8_t *p,uint16_t v)
{ p[0]=(uint8_t)v; p[1]=(uint8_t)(v>>8); }
static void put32(uint8_t *p,uint32_t v)
{ p[0]=(uint8_t)v; p[1]=(uint8_t)(v>>8); p[2]=(uint8_t)(v>>16); p[3]=(uint8_t)(v>>24); }
static void put64(uint8_t *p,uint64_t v)
{ put32(p,(uint32_t)v); put32(p+4,(uint32_t)(v>>32)); }

static void make_elf(void)
{
    uint8_t *b=elf_image;
    size_t i;
    const uint32_t code[13]={
        UINT32_C(0xd2800028), /* movz x8, #1: write */
        UINT32_C(0xd2a00800), /* movz x0, #0x40, lsl #16 */
        UINT32_C(0xf2840000), /* movk x0, #0x2000 => unmapped 0x402000 */
        UINT32_C(0xd2800021), /* movz x1, #1 */
        UINT32_C(0xd4000001), /* invalid pointer must return EFAULT */
        UINT32_C(0xd2800028), /* movz x8, #1: write */
        UINT32_C(0xd2a00800), /* movz x0, #0x40, lsl #16 */
        UINT32_C(0xf2820000), /* movk x0, #0x1000 => 0x401000 */
        UINT32_C(0xd2800401), /* movz x1, #32 */
        UINT32_C(0xd4000001), /* valid write */
        UINT32_C(0xd2800048), /* movz x8, #2: exit */
        UINT32_C(0xd2800000), /* movz x0, #0: status */
        UINT32_C(0xd4000001)  /* svc #0 */
    };
    for(i=0;i<ELF_BYTES;i++) b[i]=0u;
    b[0]=0x7fu; b[1]='E'; b[2]='L'; b[3]='F';
    b[4]=2u; b[5]=1u; b[6]=1u;
    put16(b+16,2u); put16(b+18,183u); put32(b+20,1u);
    put64(b+24,USER_ENTRY); put64(b+32,64u);
    put16(b+52,64u); put16(b+54,56u); put16(b+56,2u);
    /* RX code PT_LOAD */
    put32(b+64,1u); put32(b+68,5u);
    put64(b+72,0x1000u); put64(b+80,USER_ENTRY);
    put64(b+88,USER_ENTRY); put64(b+96,sizeof(code));
    put64(b+104,sizeof(code)); put64(b+112,0x1000u);
    for(i=0;i<13u;i++) put32(b+0x1000u+i*4u,code[i]);
    /* Read-only user data PT_LOAD */
    put32(b+120,1u); put32(b+124,4u);
    put64(b+128,0x2000u); put64(b+136,USER_DATA);
    put64(b+144,USER_DATA); put64(b+152,sizeof(user_message)-1u);
    put64(b+160,sizeof(user_message)-1u); put64(b+168,0x1000u);
    for(i=0;i<sizeof(user_message)-1u;i++)
        b[0x2000u+i]=(uint8_t)user_message[i];
}

static int map_kernel(nusantara_arm64_address_space_t *space)
{
    uint64_t off;
    for(off=0u;off<KERNEL_BYTES;off+=4096u)
        if(!nusantara_arm64_mmu_map_page(&space->mmu,
             KERNEL_BASE+off,KERNEL_BASE+off,
             NUSANTARA_ARM64_PAGE_KERNEL_RW,1))
            return 0;
    if(!nusantara_arm64_mmu_map_page(&space->mmu,UART_BASE,UART_BASE,
          NUSANTARA_ARM64_PAGE_KERNEL_RW,0))
        return 0;
    {
        uint64_t *entries=space->mmu.root.entries;
        const unsigned shifts[3]={39u,30u,21u};
        unsigned level;
        for(level=0;level<3u;level++) {
            uint64_t d=entries[(UART_BASE>>shifts[level])&0x1ffu];
            nusantara_arm64_page_table_t child;
            child.entries=0; child.physical_address=d&NUSANTARA_ARM64_PA_MASK;
            if((d&3u)!=NUSANTARA_ARM64_DESC_TABLE_PAGE ||
               !space->mmu.allocate_table(space->mmu.allocator_context,&child) ||
               child.entries==0) return 0;
            entries=child.entries;
        }
        entries[(UART_BASE>>12)&0x1ffu]=
            (entries[(UART_BASE>>12)&0x1ffu]&~(UINT64_C(7)<<2))|
            (UINT64_C(1)<<2);
    }
    return 1;
}

static int validate_user_range(void *ctx,uintptr_t address,size_t length)
{
    int valid;
    (void)ctx;
    valid=nusantara_arm64_user_memory_validate(
        &process.address_space,address,length,NUSANTARA_ARM64_USER_MEMORY_READ);
    if(!valid) ++rejected_count;
    return valid;
}
static int64_t write_user(void *ctx,uintptr_t address,size_t length)
{
    const char *p=(const char *)address;
    size_t i; (void)ctx;
    for(i=0u;i<length;i++) uart_putc(p[i]);
    ++write_count;
    return (int64_t)length;
}
static int64_t yield_user(void *ctx) { (void)ctx; return 0; }

static int64_t exit_user(void *ctx,int status)
{
    (void)ctx;
    if(status!=0 || write_count!=1u || rejected_count!=1u) {
        uart_puts("NUSANTARA_PHASE119_FAIL_SYSCALL_RESULT\r\n");
        halt();
    }
    if(nusantara_arm64_address_space_switch(&manager,&kernel_space)!=
       NUSANTARA_ARM64_AS_OK) {
        uart_puts("NUSANTARA_PHASE119_FAIL_KERNEL_ADDRESS_SPACE\r\n");
        halt();
    }
    if(nusantara_arm64_process_bootstrap_destroy(&manager,&process)!=
       NUSANTARA_ARM64_AS_OK) {
        uart_puts("NUSANTARA_PHASE119_FAIL_PROCESS_RECLAIM\r\n");
        halt();
    }
    if(active_pages()!=kernel_space.table_page_count) {
        uart_puts("NUSANTARA_PHASE119_FAIL_FRAME_LEAK\r\n");
        halt();
    }
    uart_puts("NUSANTARA_PHASE119_INVALID_POINTER_REJECTED\r\n");
    uart_puts("NUSANTARA_PHASE119_WRITE_SYSCALL_OK\r\n");
    uart_puts("NUSANTARA_PHASE119_EXIT_SYSCALL_OK\r\n");
    uart_puts("NUSANTARA_PHASE119_PROCESS_RECLAIMED\r\n");
    uart_puts("NUSANTARA_PHASE119_PASS\r\n");
    halt();
    return status;
}

void phase118_main(uintptr_t dtb)
{
    const nusantara_arm64_address_space_ops_t page_ops={
        page_allocate,page_resolve,page_release,install_root
    };
    const nusantara_arm64_user_syscall_ops_t syscall_ops={
        0,validate_user_range,write_user,exit_user,yield_user
    };
    (void)dtb;
    uart_puts("NUSANTARA_PHASE119_BOOT\r\n");
    make_elf();
    if(!nusantara_arm64_install_exception_vectors() ||
       !nusantara_arm64_address_space_manager_init(&manager,&page_ops,0)) {
        uart_puts("NUSANTARA_PHASE119_FAIL_INIT\r\n"); halt();
    }
    if(nusantara_arm64_address_space_create(&manager,&kernel_space,1u)!=
       NUSANTARA_ARM64_AS_OK || !map_kernel(&kernel_space)) {
        uart_puts("NUSANTARA_PHASE119_FAIL_KERNEL_MAP\r\n"); halt();
    }
    if(nusantara_arm64_process_bootstrap_create(
        &manager,&process,2u,elf_image,0x2000u+sizeof(user_message)-1u,
        USER_STACK_TOP,USER_STACK_PAGES,0u,USER_ENTRY,
        kernel_stack,sizeof(kernel_stack))!=NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK) {
        uart_puts("NUSANTARA_PHASE119_FAIL_ELF_BOOTSTRAP\r\n"); halt();
    }
    if(!map_kernel(&process.address_space) ||
       !nusantara_arm64_user_syscall_init(&syscall_ops) ||
       nusantara_arm64_address_space_switch(&manager,&process.address_space)!=
           NUSANTARA_ARM64_AS_OK ||
       !nusantara_arm64_mmu_enable_el1(process.address_space.root_physical)) {
        uart_puts("NUSANTARA_PHASE119_FAIL_MMU_OR_SYSCALL_INIT\r\n"); halt();
    }
    uart_puts("NUSANTARA_PHASE119_ERET_TO_EL0\r\n");
    nusantara_arm64_exception_start_first_task((uintptr_t)process.initial_frame);
    uart_puts("NUSANTARA_PHASE119_FAIL_ERET_RETURNED\r\n");
    halt();
}
