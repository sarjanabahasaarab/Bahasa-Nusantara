/* SPDX-License-Identifier: Apache-2.0 */
#include "scheduler.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
int main(void) {
 nusantara_os_scheduler_t s;
 nusantara_os_task_t *next=NULL;
 const nusantara_os_task_t *low_task,*high_task;
 uint64_t low=0u,high=0u;
 nusantara_os_scheduler_init(&s);
 assert(s.total_ticks==0u&&s.context_switches==0u&&s.total_preemptions==0u);
 assert(nusantara_os_scheduler_add(&s,0x1000u,NULL,8u,&low)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x2000u,NULL,8u,&high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_set_priority(&s,low,1u)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_set_priority(&s,high,7u)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 assert(next->dispatches==1u&&next->cpu_ticks==0u);
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 assert(s.total_ticks==1u&&next->cpu_ticks==1u);
 /* A higher-priority task becoming ready is accounted as involuntary preemption. */
 assert(nusantara_os_scheduler_block(&s,high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==low);
 assert(nusantara_os_scheduler_unblock(&s,high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 low_task=nusantara_os_scheduler_find(&s,low);
 high_task=nusantara_os_scheduler_find(&s,high);
 assert(low_task&&low_task->preemptions==1u);
 assert(high_task&&high_task->dispatches==2u);
 assert(s.total_preemptions==1u);
 assert(s.context_switches==2u);
 assert(s.total_ticks==2u);
 /* Counters are monotonic and saturate rather than wrapping. */
 s.total_ticks=UINT64_MAX;
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK);
 assert(s.total_ticks==UINT64_MAX);
 puts("Phase 131: scheduler accounting contract tests passed");
 return 0;
}
