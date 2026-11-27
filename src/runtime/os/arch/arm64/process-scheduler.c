/* SPDX-License-Identifier: Apache-2.0 */
#include "process-scheduler.h"
static int managed(const nusantara_os_scheduler_t *s,const nusantara_os_task_t *t){
 size_t i;if(!s||!t)return 0;
 for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;i++)if(&s->tasks[i]==t)return 1;
 return 0;
}
static nusantara_arm64_process_task_t *binding(nusantara_os_task_t *t){
 nusantara_arm64_process_task_t *b;
 if(!t||!t->architecture_context)return 0;
 b=(nusantara_arm64_process_task_t*)t->architecture_context;
 return b->attached?b:0;
}
static nusantara_arm64_process_scheduler_status_t activate(
 nusantara_arm64_process_scheduler_t *s,nusantara_os_task_t *t,
 nusantara_arm64_exception_frame_t **out){
 nusantara_arm64_process_task_t *b; nusantara_arm64_process_bootstrap_t *p;
 if(!managed(s->scheduler,t)||t->state!=NUSANTARA_OS_TASK_RUNNING)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 b=binding(t);if(!b||b->exited||!b->process)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 p=b->process;
 if(!p->initialized||!p->initial_frame||
    ((uintptr_t)p->initial_frame&15u)||
    t->saved_stack_pointer!=(uintptr_t)p->initial_frame)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 if(nusantara_arm64_address_space_switch(s->address_spaces,&p->address_space)!=NUSANTARA_ARM64_AS_OK)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_ADDRESS_SPACE_FAILURE;
 *out=p->initial_frame;return NUSANTARA_ARM64_PROCESS_SCHEDULER_OK;
}
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_init(
 nusantara_arm64_process_scheduler_t *s,nusantara_os_scheduler_t *sched,
 nusantara_arm64_address_space_manager_t *spaces,uint64_t kernel_root){
 if(!s||!sched||!spaces||!spaces->ops.install_root||!kernel_root||
    (kernel_root&(NUSANTARA_ARM64_PAGE_SIZE-1u)))
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT;
 s->scheduler=sched;s->address_spaces=spaces;s->kernel_root_physical=kernel_root;
 s->initialized=1u;return NUSANTARA_ARM64_PROCESS_SCHEDULER_OK;
}
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_attach(
 nusantara_arm64_process_scheduler_t *s,nusantara_os_task_t *t,
 nusantara_arm64_process_task_t *b,nusantara_arm64_process_bootstrap_t *p){
 if(!s||!s->initialized||!managed(s->scheduler,t)||!b||!p)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT;
 if((t->state!=NUSANTARA_OS_TASK_READY&&t->state!=NUSANTARA_OS_TASK_RUNNING)||
    t->architecture_context||b->attached||!p->initialized||!p->initial_frame||
    ((uintptr_t)p->initial_frame&15u)||!p->address_space.initialized||
    p->address_space.manager!=s->address_spaces||
    t->saved_stack_pointer!=(uintptr_t)p->initial_frame)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 b->process=p;b->exit_status=0;b->exited=0;b->attached=1;
 t->architecture_context=b;return NUSANTARA_ARM64_PROCESS_SCHEDULER_OK;
}
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_save_frame(
 nusantara_arm64_process_scheduler_t *s,nusantara_arm64_exception_frame_t *f){
 nusantara_os_task_t *t;nusantara_arm64_process_task_t *b;
 if(!s||!s->initialized||!f||((uintptr_t)f&15u))
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT;
 if(!s->scheduler->has_current||s->scheduler->current>=NUSANTARA_OS_SCHEDULER_MAX_TASKS)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 t=&s->scheduler->tasks[s->scheduler->current];
 if(t->state!=NUSANTARA_OS_TASK_RUNNING||(b=binding(t))==0)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 t->saved_stack_pointer=(uintptr_t)f;b->process->initial_frame=f;
 return NUSANTARA_ARM64_PROCESS_SCHEDULER_OK;
}
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_start(
 nusantara_arm64_process_scheduler_t *s,nusantara_arm64_exception_frame_t **out){
 nusantara_os_task_t *next=0;
 if(!s||!s->initialized||!out)return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT;
 if(nusantara_os_scheduler_schedule(s->scheduler,&next)!=NUSANTARA_OS_SCHEDULER_OK)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_NO_RUNNABLE;
 return activate(s,next,out);
}
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_yield(
 nusantara_arm64_process_scheduler_t *s,nusantara_arm64_exception_frame_t *frame,
 nusantara_arm64_exception_frame_t **out){
 nusantara_os_task_t *next=0;
 nusantara_arm64_process_scheduler_status_t st;
 if(!out)return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT;
 st=nusantara_arm64_process_scheduler_save_frame(s,frame);
 if(st!=NUSANTARA_ARM64_PROCESS_SCHEDULER_OK)return st;
 if(nusantara_os_scheduler_schedule(s->scheduler,&next)!=NUSANTARA_OS_SCHEDULER_OK)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_NO_RUNNABLE;
 return activate(s,next,out);
}
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_exit(
 nusantara_arm64_process_scheduler_t *s,nusantara_arm64_exception_frame_t *frame,
 int64_t code,nusantara_arm64_exception_frame_t **out){
 nusantara_os_task_t *current,*next=0;nusantara_arm64_process_task_t *b;
 nusantara_arm64_process_scheduler_status_t st;
 if(!s||!s->initialized||!out)return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT;
 st=nusantara_arm64_process_scheduler_save_frame(s,frame);
 if(st!=NUSANTARA_ARM64_PROCESS_SCHEDULER_OK)return st;
 current=&s->scheduler->tasks[s->scheduler->current];b=binding(current);
 b->exit_status=code;b->exited=1u;
 if(nusantara_os_scheduler_terminate(s->scheduler,current->id)!=NUSANTARA_OS_SCHEDULER_OK)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 if(nusantara_os_scheduler_schedule(s->scheduler,&next)!=NUSANTARA_OS_SCHEDULER_OK){
  if(nusantara_arm64_address_space_deactivate(s->address_spaces,s->kernel_root_physical)!=NUSANTARA_ARM64_AS_OK)
   return NUSANTARA_ARM64_PROCESS_SCHEDULER_ADDRESS_SPACE_FAILURE;
  *out=0;return NUSANTARA_ARM64_PROCESS_SCHEDULER_NO_RUNNABLE;
 }
 return activate(s,next,out);
}
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_reap(
 nusantara_arm64_process_scheduler_t *s,uint64_t id){
 size_t i;nusantara_os_task_t *t=0;nusantara_arm64_process_task_t *b;
 if(!s||!s->initialized||!id)return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT;
 for(i=0;i<NUSANTARA_OS_SCHEDULER_MAX_TASKS;i++)
  if(s->scheduler->tasks[i].id==id&&s->scheduler->tasks[i].state!=NUSANTARA_OS_TASK_UNUSED){t=&s->scheduler->tasks[i];break;}
 if(!t||t->state!=NUSANTARA_OS_TASK_TERMINATED||(b=binding(t))==0||!b->exited)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 if(s->address_spaces->active==&b->process->address_space)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE;
 if(nusantara_arm64_process_bootstrap_destroy(s->address_spaces,b->process)!=NUSANTARA_ARM64_AS_OK)
  return NUSANTARA_ARM64_PROCESS_SCHEDULER_ADDRESS_SPACE_FAILURE;
 b->process=0;b->attached=0;b->exited=0;t->architecture_context=0;t->saved_stack_pointer=0;
 return NUSANTARA_ARM64_PROCESS_SCHEDULER_OK;
}
