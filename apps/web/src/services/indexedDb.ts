import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project } from '@pixellift/types';
export type LocalProject = Project & { originalImageData: string; processedImageData?: string | null; maskData?: string | null; favorite?: boolean };
interface PixeliftDB extends DBSchema { projects: { key: string; value: LocalProject; indexes: { 'by-date': string; 'by-status': string } } }
let dbPromise: Promise<IDBPDatabase<PixeliftDB>> | null = null;
function getDB() {
  if (!dbPromise) dbPromise = openDB<PixeliftDB>('pixellift_lite_db', 1, { upgrade(db) {
    if (!db.objectStoreNames.contains('projects')) { const store = db.createObjectStore('projects', { keyPath: 'id' }); store.createIndex('by-date', 'createdAt'); store.createIndex('by-status', 'status'); }
  } }).catch(error => { dbPromise = null; throw error; });
  return dbPromise;
}
const changed = () => window.dispatchEvent(new Event('pl:projects-changed'));

async function remote(path:string,method='GET',body?:unknown) {
 const token=localStorage.getItem('pixellift_token');
 if(!token)throw Error('Sesi berakhir. Masuk kembali untuk mengakses proyek akun.');
 const response=await fetch('/api/projects'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Proyek belum tersimpan di server. Coba lagi.');
 return data;
}
const syncs=new Map<string,Promise<void>>();
async function importLegacy(owner:string) {
 if(syncs.has(owner))return syncs.get(owner)!;
 const job=(async()=>{
  const db=await getDB();
  for(const project of await db.getAll('projects')) {
   if(project.userId!==owner||(project as any).serverSynced)continue;
   const response=await remote('/?scope=mine&search='+encodeURIComponent(project.name)+'&limit=100');
   if(!response.data.some((p:LocalProject)=>p.id===project.id))await remote('/sync/'+project.id,'PUT',syncBody(project));
   await db.put('projects',{...project,serverSynced:true} as LocalProject);
  }
 })();
 syncs.set(owner,job);try{await job;}finally{syncs.delete(owner);}
}
function syncBody(p:LocalProject) {return {id:p.id,name:p.name,originalImageUrl:p.originalImageData||p.originalImageUrl,processedImageUrl:p.processedImageData||p.processedImageUrl||null,thumbnailUrl:p.thumbnailUrl,format:p.format,width:p.width,height:p.height,status:p.status,settings:p.settings,maskData:p.maskData,favorite:p.favorite};}

export const localProjectStorage = {
  async saveProject(project: LocalProject) {
    try {
     if(project.userId && project.userId !== 'local_user') {
      const saved=await remote('/sync/'+project.id,'PUT',syncBody(project));
      const result={...project,...saved,serverSynced:true};
      try {await (await getDB()).put('projects',result);}catch {}
      changed();return result;
     }
     const db=await getDB();await db.put('projects',project);changed();return project;
    }
    catch(error) { if(project.userId && project.userId !== 'local_user')throw error; throw new Error('Proyek belum tersimpan. Penyimpanan browser penuh atau tidak tersedia. Unduh gambar lalu kosongkan ruang penyimpanan.'); }
  },
  async getAllProjects(owner = 'local_user') {
    if(owner !== 'local_user') {
     await importLegacy(owner);const projects:LocalProject[]=[];
     let page=1,totalPages=1;
     do {const result=await remote('/?scope=mine&limit=100&page='+page);projects.push(...result.data);totalPages=result.pagination.totalPages;page++;}while(page<=totalPages);
     return projects.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    }
    const db = await getDB();
    return (await db.getAll('projects')).filter(p => (p.userId || 'local_user') === owner).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getProject(id: string, owner = 'local_user') {
    if(owner !== 'local_user') {await importLegacy(owner);return remote('/'+encodeURIComponent(id));}
    const db = await getDB(), p = await db.get('projects', id);
    return p && (p.userId || 'local_user') === owner ? p : null;
  },
  async updateProject(id: string, updates: Partial<Pick<LocalProject, 'name' | 'favorite' | 'status'>>, owner = 'local_user') {
    const p = await this.getProject(id, owner); if (!p) throw new Error('Proyek tidak ditemukan.');
    return this.saveProject({ ...p, ...updates, updatedAt: new Date().toISOString() });
  },
  async deleteProject(id: string, owner = 'local_user') { return this.deleteProjects([id], owner); },
  async deleteProjects(ids: string[], owner = 'local_user') {
    if(owner !== 'local_user') {
     for(const id of ids) {await remote('/'+encodeURIComponent(id),'DELETE');await (await getDB()).delete('projects',id);}
     changed();return;
    }
    const db = await getDB(), tx = db.transaction('projects', 'readwrite');
    for (const id of ids) { const p = await tx.store.get(id); if (p && (p.userId || 'local_user') === owner) await tx.store.delete(id); }
    await tx.done; changed();
  },
  async clearAllProjects(owner = 'local_user') { const projects = await this.getAllProjects(owner); await this.deleteProjects(projects.map(p => p.id), owner); },
  async duplicateProject(id: string, owner = 'local_user') {
    const p = await this.getProject(id, owner); if (!p) throw new Error('Proyek tidak ditemukan.');
    const now = new Date().toISOString();
    return this.saveProject({ ...p, id: 'proj_' + crypto.randomUUID(), name: p.name + ' (Salinan)', createdAt: now, updatedAt: now });
  },
};
