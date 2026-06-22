/* =========================================================
   BASE SUPABASE — PREPARAÇÃO
   Nesta etapa o sistema continua funcionando localStorage.
   Quando preencher URL e ANON_KEY, dá para ativar a sincronização depois.
========================================================= */
window.SUPABASE_CONFIG={
  url:'',
  anonKey:'',
  enabled:false
};

window.SupabaseBase={
  enabled(){
    return !!(window.SUPABASE_CONFIG && SUPABASE_CONFIG.enabled && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
  },

  async request(path,options={}){
    if(!this.enabled()) throw new Error('Supabase não configurado.');
    const url=SUPABASE_CONFIG.url.replace(/\/$/,'') + path;
    const headers=Object.assign({
      apikey:SUPABASE_CONFIG.anonKey,
      Authorization:'Bearer '+SUPABASE_CONFIG.anonKey,
      'Content-Type':'application/json'
    },options.headers||{});

    const res=await fetch(url,Object.assign({},options,{headers}));
    if(!res.ok) throw new Error(await res.text());
    return res.status===204?null:res.json();
  },

  async listarTabela(tabela){
    return this.request(`/rest/v1/${tabela}?select=*`);
  },

  async salvarTabela(tabela,item){
    return this.request(`/rest/v1/${tabela}`,{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify({id:item.id,data:item,updated_at:new Date().toISOString()})
    });
  },

  async sincronizarLocalParaSupabase(){
    if(!this.enabled()) return Utils.toast('Supabase ainda não configurado.');
    const map={
      PACIENTES:'pacientes',
      PROFISSIONAIS:'profissionais',
      HISTORICO:'historico',
      RECEITAS:'receitas',
      ATESTADOS:'atestados',
      LAUDOS:'laudos',
      EXAMES_PEDIDOS:'exames_pedidos',
      EXAMES_ARQUIVOS:'exames_arquivos',
      SINAIS_VITAIS:'sinais_vitais',
      ATENDIMENTOS:'atendimentos',
      USUARIOS:'usuarios',
      AUDITORIA:'auditoria'
    };

    for(const key of Object.keys(map)){
      const lista=Store.get(key);
      for(const item of lista){
        await this.salvarTabela(map[key],item);
      }
    }

    Utils.toast('Sincronização local → Supabase concluída.');
  }
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
