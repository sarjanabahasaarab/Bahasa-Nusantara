/* SPDX-License-Identifier: Apache-2.0 */
#include "scheduler.h"
static nusantara_os_task_t *find_mut(nusantara_os_scheduler_t *s,uint64_t id) {
 size_t i;for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;++i)
  if(s->tasks[i].state!=NUSANTARA_OS_TASK_UNUSED&&s->tasks[i].id==id)return &s->tasks[i];
 return NULL;
}
const nusantara_os_task_t *nusantara_os_scheduler_find(const nusantara_os_scheduler_t *s,uint64_t id) {
 size_t i;if(!s||id==0u)return NULL;
 for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;++i)
  if(s->tasks[i].state!=NUSANTARA_OS_TASK_UNUSED&&s->tasks[i].id==id)return &s->tasks[i];
 return NULL;
}
void nusantara_os_scheduler_init(nusantara_os_scheduler_t *s) {
 size_t i;if(!s)return;
 for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;++i){
  s->tasks[i].id=0u;s->tasks[i].saved_stack_pointer=0u;s->tasks[i].architecture_context=NULL;
  s->tasks[i].quantum=0u;s->tasks[i].remaining=0u;s->tasks[i].state=NUSANTARA_OS_TASK_UNUSED;
  s->tasks[i].base_priority=0u;s->tasks[i].effective_priority=0u;
 }
 s->count=0u;s->current=0u;s->next_id=1u;s->has_current=0u;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_add(nusantara_os_scheduler_t *s,uintptr_t sp,void *ctx,uint32_t q,uint64_t *id) {
 size_t i;if(!s||!id||sp==0u)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;
 if(q==0u)q=NUSANTARA_OS_SCHEDULER_DEFAULT_QUANTUM;
 for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;++i)if(s->tasks[i].state==NUSANTARA_OS_TASK_UNUSED){
  uint64_t n;if(s->next_id==0u)return NUSANTARA_OS_SCHEDULER_FULL;n=s->next_id++;
  s->tasks[i].id=n;s->tasks[i].saved_stack_pointer=sp;s->tasks[i].architecture_context=ctx;
  s->tasks[i].quantum=q;s->tasks[i].remaining=q;s->tasks[i].state=NUSANTARA_OS_TASK_READY;
  s->tasks[i].base_priority=0u;s->tasks[i].effective_priority=0u;
  ++s->count;*id=n;return NUSANTARA_OS_SCHEDULER_OK;
 }
 return NUSANTARA_OS_SCHEDULER_FULL;
}
static nusantara_os_task_t *choose_next(nusantara_os_scheduler_t *s) {
 size_t off,start=s->has_current?(s->current+1u)%NUSANTARA_OS_SCHEDULER_MAX_TASKS:0u;
 nusantara_os_task_t *best=NULL;size_t best_i=0u;
 for(off=0;off<NUSANTARA_OS_SCHEDULER_MAX_TASKS;++off){
  size_t i=(start+off)%NUSANTARA_OS_SCHEDULER_MAX_TASKS;nusantara_os_task_t *t=&s->tasks[i];
  if(t->state==NUSANTARA_OS_TASK_READY&&(!best||t->effective_priority>best->effective_priority)){best=t;best_i=i;}
 }
 if(s->has_current&&s->current<NUSANTARA_OS_SCHEDULER_MAX_TASKS&&s->tasks[s->current].state==NUSANTARA_OS_TASK_RUNNING){
  nusantara_os_task_t *cur=&s->tasks[s->current];
  if(!best||cur->effective_priority>best->effective_priority){cur->remaining=cur->quantum;return cur;}
 }
 if(!best)return NULL;
 if(s->has_current&&s->current<NUSANTARA_OS_SCHEDULER_MAX_TASKS&&s->tasks[s->current].state==NUSANTARA_OS_TASK_RUNNING)s->tasks[s->current].state=NUSANTARA_OS_TASK_READY;
 s->current=best_i;s->has_current=1u;best->state=NUSANTARA_OS_TASK_RUNNING;best->remaining=best->quantum;return best;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_schedule(nusantara_os_scheduler_t *s,nusantara_os_task_t **next) {
 nusantara_os_task_t *t;if(!s||!next)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;
 t=choose_next(s);if(!t){*next=NULL;return NUSANTARA_OS_SCHEDULER_NO_RUNNABLE_TASK;}*next=t;return NUSANTARA_OS_SCHEDULER_OK;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_tick(nusantara_os_scheduler_t *s,nusantara_os_task_t **next) {
 if(!s||!next)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;
 if(!s->has_current||s->current>=NUSANTARA_OS_SCHEDULER_MAX_TASKS||s->tasks[s->current].state!=NUSANTARA_OS_TASK_RUNNING)return nusantara_os_scheduler_schedule(s,next);
 if(s->tasks[s->current].remaining>0u)--s->tasks[s->current].remaining;
 if(s->tasks[s->current].remaining==0u)return nusantara_os_scheduler_schedule(s,next);
 *next=&s->tasks[s->current];return NUSANTARA_OS_SCHEDULER_OK;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_block(nusantara_os_scheduler_t *s,uint64_t id) {
 nusantara_os_task_t*t;if(!s)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;t=find_mut(s,id);
 if(!t)return NUSANTARA_OS_SCHEDULER_NOT_FOUND;
 if(t->state!=NUSANTARA_OS_TASK_READY&&t->state!=NUSANTARA_OS_TASK_RUNNING)return NUSANTARA_OS_SCHEDULER_INVALID_STATE;
 t->state=NUSANTARA_OS_TASK_BLOCKED;return NUSANTARA_OS_SCHEDULER_OK;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_unblock(nusantara_os_scheduler_t *s,uint64_t id) {
 nusantara_os_task_t*t;if(!s)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;t=find_mut(s,id);
 if(!t)return NUSANTARA_OS_SCHEDULER_NOT_FOUND;
 if(t->state!=NUSANTARA_OS_TASK_BLOCKED)return NUSANTARA_OS_SCHEDULER_INVALID_STATE;
 t->state=NUSANTARA_OS_TASK_READY;t->remaining=t->quantum;return NUSANTARA_OS_SCHEDULER_OK;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_terminate(nusantara_os_scheduler_t *s,uint64_t id) {
 nusantara_os_task_t*t;if(!s)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;t=find_mut(s,id);
 if(!t)return NUSANTARA_OS_SCHEDULER_NOT_FOUND;
 if(t->state==NUSANTARA_OS_TASK_TERMINATED)return NUSANTARA_OS_SCHEDULER_INVALID_STATE;
 t->state=NUSANTARA_OS_TASK_TERMINATED;if(s->count>0u)--s->count;return NUSANTARA_OS_SCHEDULER_OK;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_set_priority(nusantara_os_scheduler_t *s,uint64_t id,uint32_t p) {
 nusantara_os_task_t*t;if(!s||!id)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;t=find_mut(s,id);
 if(!t)return NUSANTARA_OS_SCHEDULER_NOT_FOUND;
 t->base_priority=p;t->effective_priority=p;return NUSANTARA_OS_SCHEDULER_OK;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_set_effective_priority(nusantara_os_scheduler_t *s,uint64_t id,uint32_t p) {
 nusantara_os_task_t*t;if(!s||!id)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;t=find_mut(s,id);
 if(!t)return NUSANTARA_OS_SCHEDULER_NOT_FOUND;
 t->effective_priority=p;return NUSANTARA_OS_SCHEDULER_OK;
}
nusantara_os_scheduler_status_t nusantara_os_scheduler_reset_effective_priorities(nusantara_os_scheduler_t *s) {
 size_t i;if(!s)return NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT;
 for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;++i)if(s->tasks[i].state!=NUSANTARA_OS_TASK_UNUSED)s->tasks[i].effective_priority=s->tasks[i].base_priority;
 return NUSANTARA_OS_SCHEDULER_OK;
}

