/* SPDX-License-Identifier: Apache-2.0 */
#include "process.h"
static nusantara_os_process_t *find_mut(nusantara_os_process_manager_t *m,uint64_t pid) {
 size_t i;for(i=0;i<NUSANTARA_OS_PROCESS_MAX;++i)
  if(m->processes[i].state!=NUSANTARA_OS_PROCESS_UNUSED&&m->processes[i].pid==pid)return &m->processes[i];
 return NULL;
}
const nusantara_os_process_t *nusantara_os_process_find(const nusantara_os_process_manager_t *m,uint64_t pid) {
 size_t i;if(!m||pid==0u)return NULL;
 for(i=0;i<NUSANTARA_OS_PROCESS_MAX;++i)
  if(m->processes[i].state!=NUSANTARA_OS_PROCESS_UNUSED&&m->processes[i].pid==pid)return &m->processes[i];
 return NULL;
}
void nusantara_os_process_manager_init(nusantara_os_process_manager_t *m) {
 size_t i;if(!m)return;
 for(i=0;i<NUSANTARA_OS_PROCESS_MAX;++i){
  m->processes[i].pid=0u;m->processes[i].parent_pid=0u;
  m->processes[i].scheduler_task_id=0u;m->processes[i].page_table_root=0u;
  m->processes[i].exit_code=0;m->processes[i].kind=(nusantara_os_process_kind_t)0;
  m->processes[i].state=NUSANTARA_OS_PROCESS_UNUSED;
 }
 m->count=0u;m->next_pid=1u;
}
nusantara_os_process_status_t nusantara_os_process_create(
 nusantara_os_process_manager_t *m,uint64_t parent,uint64_t task,uint64_t root,
 nusantara_os_process_kind_t kind,uint64_t *pid) {
 size_t i;uint64_t new_pid;
 if(!m||!pid||task==0u)return NUSANTARA_OS_PROCESS_INVALID_ARGUMENT;
 if(kind!=NUSANTARA_OS_PROCESS_USER&&kind!=NUSANTARA_OS_PROCESS_KERNEL)return NUSANTARA_OS_PROCESS_INVALID_ARGUMENT;
 if(root==0u||(root&(NUSANTARA_OS_PROCESS_PAGE_SIZE-1u))!=0u||root>=NUSANTARA_OS_PROCESS_PHYSICAL_LIMIT)
  return NUSANTARA_OS_PROCESS_INVALID_ADDRESS_SPACE;
 if(parent!=0u){const nusantara_os_process_t *p=nusantara_os_process_find(m,parent);if(!p||p->state==NUSANTARA_OS_PROCESS_EXITED)return NUSANTARA_OS_PROCESS_INVALID_PARENT;}
 if(m->next_pid==0u)return NUSANTARA_OS_PROCESS_FULL;
 for(i=0;i<NUSANTARA_OS_PROCESS_MAX;++i)if(m->processes[i].state==NUSANTARA_OS_PROCESS_UNUSED) {
  new_pid=m->next_pid++;
  m->processes[i].pid=new_pid;m->processes[i].parent_pid=parent;
  m->processes[i].scheduler_task_id=task;m->processes[i].page_table_root=root;
  m->processes[i].exit_code=0;m->processes[i].kind=kind;
  m->processes[i].state=NUSANTARA_OS_PROCESS_CREATED;
  ++m->count;*pid=new_pid;return NUSANTARA_OS_PROCESS_OK;
 }
 return NUSANTARA_OS_PROCESS_FULL;
}
nusantara_os_process_status_t nusantara_os_process_mark_ready(nusantara_os_process_manager_t *m,uint64_t pid) {
 nusantara_os_process_t*p;if(!m)return NUSANTARA_OS_PROCESS_INVALID_ARGUMENT;p=find_mut(m,pid);
 if(!p)return NUSANTARA_OS_PROCESS_NOT_FOUND;
 if(p->state!=NUSANTARA_OS_PROCESS_CREATED)return NUSANTARA_OS_PROCESS_INVALID_STATE;
 p->state=NUSANTARA_OS_PROCESS_READY;return NUSANTARA_OS_PROCESS_OK;
}
nusantara_os_process_status_t nusantara_os_process_mark_running(nusantara_os_process_manager_t *m,uint64_t pid) {
 nusantara_os_process_t*p;if(!m)return NUSANTARA_OS_PROCESS_INVALID_ARGUMENT;p=find_mut(m,pid);
 if(!p)return NUSANTARA_OS_PROCESS_NOT_FOUND;
 if(p->state!=NUSANTARA_OS_PROCESS_READY)return NUSANTARA_OS_PROCESS_INVALID_STATE;
 p->state=NUSANTARA_OS_PROCESS_RUNNING;return NUSANTARA_OS_PROCESS_OK;
}
nusantara_os_process_status_t nusantara_os_process_block(nusantara_os_process_manager_t *m,uint64_t pid) {
 nusantara_os_process_t*p;if(!m)return NUSANTARA_OS_PROCESS_INVALID_ARGUMENT;p=find_mut(m,pid);
 if(!p)return NUSANTARA_OS_PROCESS_NOT_FOUND;
 if(p->state!=NUSANTARA_OS_PROCESS_RUNNING&&p->state!=NUSANTARA_OS_PROCESS_READY)return NUSANTARA_OS_PROCESS_INVALID_STATE;
 p->state=NUSANTARA_OS_PROCESS_BLOCKED;return NUSANTARA_OS_PROCESS_OK;
}
nusantara_os_process_status_t nusantara_os_process_resume(nusantara_os_process_manager_t *m,uint64_t pid) {
 nusantara_os_process_t*p;if(!m)return NUSANTARA_OS_PROCESS_INVALID_ARGUMENT;p=find_mut(m,pid);
 if(!p)return NUSANTARA_OS_PROCESS_NOT_FOUND;
 if(p->state!=NUSANTARA_OS_PROCESS_BLOCKED)return NUSANTARA_OS_PROCESS_INVALID_STATE;
 p->state=NUSANTARA_OS_PROCESS_READY;return NUSANTARA_OS_PROCESS_OK;
}
nusantara_os_process_status_t nusantara_os_process_exit(nusantara_os_process_manager_t *m,uint64_t pid,int32_t code) {
 nusantara_os_process_t*p;if(!m)return NUSANTARA_OS_PROCESS_INVALID_ARGUMENT;p=find_mut(m,pid);
 if(!p)return NUSANTARA_OS_PROCESS_NOT_FOUND;
 if(p->state==NUSANTARA_OS_PROCESS_EXITED)return NUSANTARA_OS_PROCESS_INVALID_STATE;
 p->exit_code=code;p->state=NUSANTARA_OS_PROCESS_EXITED;if(m->count>0u)--m->count;
 return NUSANTARA_OS_PROCESS_OK;
}
