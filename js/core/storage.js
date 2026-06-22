window.Store={
  keys:['PACIENTES','PROFISSIONAIS','HISTORICO','RECEITAS','ATESTADOS','LAUDOS','EXAMES_PEDIDOS','EXAMES_ARQUIVOS','SINAIS_VITAIS','ATENDIMENTOS','USUARIOS','AUDITORIA','CONFIG_CLINICA','FIN_RECEITAS','FIN_DESPESAS','FIN_CAIXA','FIN_CATEGORIAS','FIN_PAGAMENTOS','FIN_COMISSOES','AGENDA_MEDICA','AGENDA_BLOQUEIOS','AGENDA_CONFIG','AGENDA_PROCEDIMENTOS','LGPD_CONFIG','LGPD_LOGS','LGPD_CONSENTIMENTOS','LGPD_ACESSOS_PACIENTES','LGPD_EXPORTACOES','ARQUIVOS','STORAGE_CONFIG','SUPABASE_CONFIG'],
  get(key){try{let a=JSON.parse(localStorage.getItem(key)||localStorage.getItem(key+'_MS')||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}},
  set(key,arr){arr=Array.isArray(arr)?arr:[];localStorage.setItem(key,JSON.stringify(arr));localStorage.setItem(key+'_MS',JSON.stringify(arr));window[key]=arr;return arr},
  upsert(key,item){let a=this.get(key);let id=String(item.id||'');let i=a.findIndex(x=>String(x.id)===id);if(i>=0)a[i]=item;else a.push(item);this.set(key,a);return item},
  remove(key,id){let a=this.get(key).filter(x=>String(x.id)!==String(id));this.set(key,a)},
  seed(){
    if(!this.get('USUARIOS').length)this.set('USUARIOS',[{id:'U001',login:'admin',senha:'admin',nome:'Administrador',perfil:'admin'}]);
    if(!this.get('PROFISSIONAIS').length)this.set('PROFISSIONAIS',[{id:'P001',nome:'Dr. Roberto Souza',tipoConselho:'CRM',ufConselho:'MS',numeroConselho:'12345'}]);
  },
  exportAll(){let o={};this.keys.forEach(k=>o[k]=this.get(k));return o},
  importAll(o){this.keys.forEach(k=>{if(Array.isArray(o[k]))this.set(k,o[k])})}
};

/* ZERO V7.8 — garantir profissional do atendimento nos documentos clínicos */
(function(){
  if(!window.ClinicaDocProfissionalPatchV78) window.ClinicaDocProfissionalPatchV78={};

  const attachProf=function(item){
    try{
      if(!item || typeof item!=='object') return item;
      if(!window.ClinicaProfissionalDocumento) return item;

      const prof=ClinicaProfissionalDocumento.resolve(item,{allowLoggedFallback:false});
      if(prof){
        item.profissionalId = item.profissionalId || item.medicoId || prof.id || '';
        item.medicoId = item.medicoId || item.profissionalId || prof.id || '';
        item.profissional = item.profissional || item.medico || prof.nome || '';
        item.medico = item.medico || item.profissional || prof.nome || '';
        item.conselho = item.conselho || item.crm || ClinicaProfissionalDocumento.conselhoTexto(prof) || '';
        item.crm = item.crm || item.conselho || ClinicaProfissionalDocumento.conselhoTexto(prof) || '';
      }
      return item;
    }catch(e){return item;}
  };

  if(window.Store && !Store.__profDocPatchV78){
    Store.__profDocPatchV78=true;
    const oldUpsert=Store.upsert?.bind(Store);
    if(oldUpsert){
      Store.upsert=function(key,item){
        const k=String(key||'').toUpperCase();
        if(['RECEITAS','ATESTADOS','LAUDOS','EXAMES_PEDIDOS','PEDIDOS_EXAMES','HISTORICO'].includes(k)){
          item=attachProf(item);
        }
        return oldUpsert(key,item);
      };
    }
  }
})();

/* ZERO V8.2 — normaliza caminhos de arquivos */
(function(){
 if(!window.Store||Store.__storagePathPatchV82)return; Store.__storagePathPatchV82=true;
 const old=Store.upsert?.bind(Store);
 if(old){Store.upsert=function(key,item){
   const k=String(key||'').toUpperCase();
   if(['ARQUIVOS','EXAMES_ARQUIVOS','RECEITAS','ATESTADOS','LAUDOS','EXAMES_PEDIDOS','PEDIDOS_EXAMES'].includes(k)&&window.ClinicaStorage&&item){
     item=ClinicaStorage.normalizarRegistroArquivo(item);
   }
   return old(key,item);
 }}
})();
