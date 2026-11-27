/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "process-scheduler.h"
nusantara_arm64_address_space_status_t nusantara_arm64_process_bootstrap_destroy(
 nusantara_arm64_address_space_manager_t *manager,nusantara_arm64_process_bootstrap_t *process){
 (void)manager;(void)process;return NUSANTARA_ARM64_AS_OK;
}
static uint64_t active_root;
static int install_root(void *ctx,uint64_t root){(void)ctx;active_root=root;return 1;}
static int allocate_page(void *ctx,uint64_t *pa,uint64_t **alias){(void)ctx;(void)pa;(void)alias;return 0;}
static int resolve_page(void *ctx,uint64_t pa,uint64_t **alias){(void)ctx;(void)pa;(void)alias;return 0;}
static void release_page(void *ctx,uint64_t pa){(void)ctx;(void)pa;}
int main(void){
 nusantara_os_scheduler_t sched;nusantara_arm64_address_space_manager_t spaces;
 nusantara_arm64_address_space_ops_t ops={allocate_page,resolve_page,release_page,install_root};
 nusantara_arm64_process_scheduler_t ps={0};
 nusantara_arm64_process_task_t ba={0},bb={0};
 nusantara_arm64_process_bootstrap_t a={0},b={0};
 _Alignas(16) nusantara_arm64_exception_frame_t fa,fb;
 nusantara_arm64_exception_frame_t *selected=0;
 nusantara_os_task_t *ta=0,*tb=0,*next=0;uint64_t ia=0,ib=0;size_t i;
 nusantara_os_scheduler_init(&sched);
 assert(nusantara_arm64_address_space_manager_init(&spaces,&ops,0));
 a.address_space.manager=&spaces;a.address_space.id=1;a.address_space.root_physical=0x1000;a.address_space.initialized=1;
 a.initial_frame=&fa;a.initialized=1;
 b.address_space.manager=&spaces;b.address_space.id=2;b.address_space.root_physical=0x2000;b.address_space.initialized=1;
 b.initial_frame=&fb;b.initialized=1;
 spaces.spaces[0]=&a.address_space;spaces.spaces[1]=&b.address_space;spaces.count=2;
 assert(nusantara_os_scheduler_add(&sched,(uintptr_t)&fa,0,1,&ia)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&sched,(uintptr_t)&fb,0,1,&ib)==NUSANTARA_OS_SCHEDULER_OK);
 for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;i++){if(sched.tasks[i].id==ia)ta=&sched.tasks[i];if(sched.tasks[i].id==ib)tb=&sched.tasks[i];}
 assert(ta&&tb);
 assert(nusantara_arm64_process_scheduler_init(&ps,&sched,&spaces,0x3000)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(nusantara_arm64_process_scheduler_attach(&ps,ta,&ba,&a)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(nusantara_arm64_process_scheduler_attach(&ps,tb,&bb,&b)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(nusantara_arm64_process_scheduler_start(&ps,&selected)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(selected==&fa&&active_root==0x1000);
 /* Simulate timer tick rotation and the IRQ-side process activation callback. */
 assert(nusantara_arm64_process_scheduler_save_frame(&ps,&fa)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_tick(&sched,&next)==NUSANTARA_OS_SCHEDULER_OK);
 assert(next==tb);
 assert(nusantara_arm64_process_scheduler_activate_task(&ps,next,&selected)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(selected==&fb&&active_root==0x2000);
 assert(nusantara_arm64_process_scheduler_save_frame(&ps,&fb)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_tick(&sched,&next)==NUSANTARA_OS_SCHEDULER_OK);
 assert(next==ta);
 assert(nusantara_arm64_process_scheduler_activate_task(&ps,next,&selected)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(selected==&fa&&active_root==0x1000);
 assert(nusantara_arm64_process_scheduler_yield(&ps,&fa,&selected)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(selected==&fb&&active_root==0x2000);
 assert(nusantara_arm64_process_scheduler_exit(&ps,&fb,7,&selected)==NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
 assert(selected==&fa&&active_root==0x1000&&bb.exited&&bb.exit_status==7);
 puts("Phase 120 ARM64 process scheduler contract: PASS");return 0;
}
