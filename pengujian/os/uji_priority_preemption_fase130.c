/* SPDX-License-Identifier: Apache-2.0 */
#include "scheduler.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
int main(void) {
 nusantara_os_scheduler_t s;nusantara_os_task_t *next=NULL;
 uint64_t low=0u,high=0u;
 unsigned i;
 nusantara_os_scheduler_init(&s);
 assert(nusantara_os_scheduler_add(&s,0x1000u,NULL,10u,&low)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_set_priority(&s,low,1u)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==low);
 assert(nusantara_os_scheduler_add(&s,0x2000u,NULL,10u,&high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_set_priority(&s,high,8u)==NUSANTARA_OS_SCHEDULER_OK);
 /* A higher-priority task becoming READY preempts before the current quantum expires. */
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 assert(nusantara_os_scheduler_find(&s,low)->state==NUSANTARA_OS_TASK_READY);
 /* Blocking the high-priority task lets the lower-priority task resume. */
 assert(nusantara_os_scheduler_block(&s,high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==low);
 assert(nusantara_os_scheduler_unblock(&s,high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 /* Priority inheritance may boost the current owner above a READY waiter. */
 assert(nusantara_os_scheduler_block(&s,high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==low);
 assert(nusantara_os_scheduler_set_effective_priority(&s,low,9u)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_unblock(&s,high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==low);
 /* Equal effective priorities retain round-robin behavior at quantum expiry. */
 assert(nusantara_os_scheduler_set_effective_priority(&s,high,9u)==NUSANTARA_OS_SCHEDULER_OK);
 for(i=0;i<10u;++i)assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK);
 assert(next->id==high);
 puts("Phase 130: priority preemption contract tests passed");
 return 0;
}
