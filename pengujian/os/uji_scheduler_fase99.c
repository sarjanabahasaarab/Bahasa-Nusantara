/* SPDX-License-Identifier: Apache-2.0 */
#include "scheduler.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
int main(void){
 nusantara_os_scheduler_t s;nusantara_os_task_t*n=NULL;uint64_t a=0,b=0,c=0;
 nusantara_os_scheduler_init(&s);
 assert(nusantara_os_scheduler_schedule(&s,&n)==NUSANTARA_OS_SCHEDULER_NO_RUNNABLE_TASK);
 assert(nusantara_os_scheduler_add(&s,0x1000u,(void*)(uintptr_t)1u,2u,&a)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x2000u,(void*)(uintptr_t)2u,2u,&b)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x3000u,(void*)(uintptr_t)3u,1u,&c)==NUSANTARA_OS_SCHEDULER_OK);
 assert(a!=b&&b!=c&&a!=c&&s.count==3u);
 assert(nusantara_os_scheduler_schedule(&s,&n)==NUSANTARA_OS_SCHEDULER_OK&&n->id==a);
 assert(nusantara_os_scheduler_tick(&s,&n)==NUSANTARA_OS_SCHEDULER_OK&&n->id==a);
 assert(nusantara_os_scheduler_tick(&s,&n)==NUSANTARA_OS_SCHEDULER_OK&&n->id==b);
 assert(nusantara_os_scheduler_block(&s,b)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&n)==NUSANTARA_OS_SCHEDULER_OK&&n->id==c);
 assert(nusantara_os_scheduler_unblock(&s,b)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_terminate(&s,c)==NUSANTARA_OS_SCHEDULER_OK&&s.count==2u);
 assert(nusantara_os_scheduler_schedule(&s,&n)==NUSANTARA_OS_SCHEDULER_OK&&n->id==a);
 assert(nusantara_os_scheduler_block(&s,a)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&n)==NUSANTARA_OS_SCHEDULER_OK&&n->id==b);
 assert(nusantara_os_scheduler_terminate(&s,b)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_block(&s,b)==NUSANTARA_OS_SCHEDULER_INVALID_STATE);
 assert(nusantara_os_scheduler_unblock(&s,a)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_terminate(&s,a)==NUSANTARA_OS_SCHEDULER_OK&&s.count==0u);
 assert(nusantara_os_scheduler_schedule(&s,&n)==NUSANTARA_OS_SCHEDULER_NO_RUNNABLE_TASK);
 assert(nusantara_os_scheduler_add(&s,0u,NULL,1u,&a)==NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT);
 assert(nusantara_os_scheduler_find(&s,999u)==NULL);
 puts("Phase 99: scheduler contract tests passed");return 0;
}
