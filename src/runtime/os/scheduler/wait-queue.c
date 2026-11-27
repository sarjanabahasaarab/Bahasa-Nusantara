/* SPDX-License-Identifier: Apache-2.0 */
#include "wait-queue.h"
void nusantara_os_wait_queue_init(nusantara_os_wait_queue_t *q,uintptr_t channel){
 size_t i;if(!q)return;q->channel=channel;q->count=0u;
 for(i=0;i<NUSANTARA_OS_WAIT_QUEUE_MAX_WAITERS;i++)q->waiters[i]=0u;
}
static size_t find_waiter(const nusantara_os_wait_queue_t *q,uint64_t id){
 size_t i;for(i=0;i<q->count;i++)if(q->waiters[i]==id)return i;return q->count;
}
nusantara_os_wait_queue_status_t nusantara_os_wait_queue_sleep(nusantara_os_wait_queue_t *q,nusantara_os_scheduler_t *s,uint64_t id){
 const nusantara_os_task_t *task;
 if(!q||!s||!id||!q->channel)return NUSANTARA_OS_WAIT_QUEUE_INVALID_ARGUMENT;
 if(q->count>=NUSANTARA_OS_WAIT_QUEUE_MAX_WAITERS)return NUSANTARA_OS_WAIT_QUEUE_FULL;
 if(find_waiter(q,id)!=q->count)return NUSANTARA_OS_WAIT_QUEUE_INVALID_STATE;
 task=nusantara_os_scheduler_find(s,id);
 if(!task||(task->state!=NUSANTARA_OS_TASK_READY&&task->state!=NUSANTARA_OS_TASK_RUNNING))return NUSANTARA_OS_WAIT_QUEUE_INVALID_STATE;
 if(nusantara_os_scheduler_block(s,id)!=NUSANTARA_OS_SCHEDULER_OK)return NUSANTARA_OS_WAIT_QUEUE_INVALID_STATE;
 q->waiters[q->count++]=id;return NUSANTARA_OS_WAIT_QUEUE_OK;
}
nusantara_os_wait_queue_status_t nusantara_os_wait_queue_wake_one(nusantara_os_wait_queue_t *q,nusantara_os_scheduler_t *s,uint64_t *id){
 size_t i;uint64_t selected;
 if(!q||!s||!id)return NUSANTARA_OS_WAIT_QUEUE_INVALID_ARGUMENT;
 if(!q->count)return NUSANTARA_OS_WAIT_QUEUE_NOT_FOUND;
 selected=q->waiters[0];
 if(nusantara_os_scheduler_unblock(s,selected)!=NUSANTARA_OS_SCHEDULER_OK)return NUSANTARA_OS_WAIT_QUEUE_INVALID_STATE;
 for(i=1;i<q->count;i++)q->waiters[i-1]=q->waiters[i];
 q->waiters[--q->count]=0u;*id=selected;return NUSANTARA_OS_WAIT_QUEUE_OK;
}
nusantara_os_wait_queue_status_t nusantara_os_wait_queue_wake_all(nusantara_os_wait_queue_t *q,nusantara_os_scheduler_t *s,uint64_t *ids,size_t capacity,size_t *woken){
 size_t i,n;
 if(!q||!s||!woken||(capacity&&!ids))return NUSANTARA_OS_WAIT_QUEUE_INVALID_ARGUMENT;
 if(capacity<q->count)return NUSANTARA_OS_WAIT_QUEUE_FULL;
 n=q->count;
 for(i=0;i<n;i++)if(nusantara_os_scheduler_find(s,q->waiters[i])==NULL||nusantara_os_scheduler_find(s,q->waiters[i])->state!=NUSANTARA_OS_TASK_BLOCKED)return NUSANTARA_OS_WAIT_QUEUE_INVALID_STATE;
 for(i=0;i<n;i++){(void)nusantara_os_scheduler_unblock(s,q->waiters[i]);if(ids)ids[i]=q->waiters[i];}
 for(i=0;i<NUSANTARA_OS_WAIT_QUEUE_MAX_WAITERS;i++)q->waiters[i]=0u;
 q->count=0u;*woken=n;return NUSANTARA_OS_WAIT_QUEUE_OK;
}
