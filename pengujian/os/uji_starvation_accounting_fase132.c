/* SPDX-License-Identifier: Apache-2.0 */
#include "scheduler.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
int main(void) {
 nusantara_os_scheduler_t s;
 nusantara_os_task_t *next=NULL;
 const nusantara_os_task_t *low_task;
 uint64_t low=0u,high=0u;
 nusantara_os_scheduler_init(&s);
 assert(nusantara_os_scheduler_add(&s,0x1000u,NULL,8u,&low)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x2000u,NULL,8u,&high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_set_priority(&s,low,1u)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_set_priority(&s,high,8u)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 /* Low-priority READY task accumulates wait ticks while high-priority task runs. */
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==high);
 low_task=nusantara_os_scheduler_find(&s,low);
 assert(low_task&&low_task->ready_wait_ticks==3u);
 assert(low_task->ready_wait_events==0u&&low_task->max_ready_wait_ticks==0u);
 /* Once the running task blocks, dispatch records the completed wait interval. */
 assert(nusantara_os_scheduler_block(&s,high)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK&&next->id==low);
 low_task=nusantara_os_scheduler_find(&s,low);
 assert(low_task->ready_wait_ticks==0u);
 assert(low_task->ready_wait_events==1u&&low_task->max_ready_wait_ticks==3u);
 /* Counter saturation is deterministic and never wraps. */
 s.tasks[(size_t)(low_task-s.tasks)].ready_wait_ticks=UINT64_MAX;
 assert(nusantara_os_scheduler_tick(&s,&next)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_find(&s,low)->ready_wait_ticks==UINT64_MAX);
 puts("Phase 132: starvation accounting contract tests passed");
 return 0;
}
