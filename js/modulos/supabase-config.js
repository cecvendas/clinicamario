window.SupabaseConfig={
  get(){
    try{
      const saved=JSON.parse(localStorage.getItem('SUPABASE_CONFIG_LOCAL')||'{}');
      window.SUPABASE_CONFIG=Object.assign(window.SUPABASE_CONFIG||{},saved);
    }catch(e){}
    return window.SUPABASE_CONFIG||{url:'',anonKey:'',enabled:false};
  },

  set(cfg){
    window.SUPABASE_CONFIG=Object.assign(window.SUPABASE_CONFIG||{},cfg);
    localStorage.setItem('SUPABASE_CONFIG_LOCAL',JSON.stringify(window.SUPABASE_CONFIG));
  },

  statusHtml(){
    const c=this.get();
    const on=!!(c.enabled && c.url && c.anonKey);
    return `<span class="supabase-status ${on?'supabase-on':'supabase-off'}">${on?'● Configurado / Ativo':'● Desativado / Não configurado'}</span>`;
  },

  render(){
    const c=this.get();
    document.getElementById('content').innerHTML=`<div class="card">
      <div class="supabase-toolbar">
        <div>
          <h3>Supabase</h3>
          <p style="color:#64748b;margin-top:4px">Base preparada para nuvem. Preencha os dados quando for conectar o projeto.</p>
        </div>
        ${this.statusHtml()}
      </div>

      <div class="supabase-grid">
        <div>
          <div class="cm-section">
            <div class="cm-section-title">🟢 Configuração</div>
            <label>Project URL</label>
            <input id="sb-url" value="${Utils.esc(c.url||'')}" placeholder="https://xxxx.supabase.co">

            <label>Anon Key</label>
            <textarea id="sb-key" rows="5" placeholder="cole a anon key">${Utils.esc(c.anonKey||'')}</textarea>

            <label>Status</label>
            <select id="sb-enabled">
              <option value="false">Desativado</option>
              <option value="true">Ativado</option>
            </select>

            <div class="row right" style="margin-top:12px;">
              <button class="btn btn-outline" onclick="SupabaseConfig.testar()">Testar conexão</button>
              <button class="btn btn-blue" onclick="SupabaseConfig.salvar()">Salvar configuração</button>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">🔄 Sincronização</div>
            <p style="color:#64748b;font-size:13px;">Nesta etapa a sincronização é manual para evitar perda de dados. Depois ativamos automático.</p>
            <div class="row">
              <button class="btn btn-blue" onclick="SupabaseConfig.syncLocal()">Enviar local → Supabase</button>
            </div>
          </div>
        </div>

        <div>
          <div class="cm-section">
            <div class="cm-section-title">🧱 SQL base</div>
            <p style="color:#64748b;font-size:13px;">Arquivo incluído no pacote:</p>
            <div class="supabase-code">sql/supabase_schema.sql

Execute este arquivo no SQL Editor do Supabase antes de ativar a sincronização.

Tabelas preparadas:
- pacientes
- profissionais
- usuarios
- historico
- receitas
- atestados
- laudos
- exames_pedidos
- exames_arquivos
- sinais_vitais
- atendimentos
- auditoria</div>
          </div>
        </div>
      </div>
    </div>`;

    setTimeout(()=>{document.getElementById('sb-enabled').value=String(!!c.enabled)},30);
  },

  salvar(){
    this.set({
      url:document.getElementById('sb-url').value.trim(),
      anonKey:document.getElementById('sb-key').value.trim(),
      enabled:document.getElementById('sb-enabled').value==='true'
    });
    if(window.Security) Security.audit('supabase_config','Salvou configuração Supabase');
    Utils.toast('Configuração Supabase salva.');
    this.render();
  },

  async testar(){
    this.salvar();
    if(!window.SupabaseBase || !SupabaseBase.enabled()){
      Utils.toast('Supabase não está configurado/ativo.');
      return;
    }

    try{
      await SupabaseBase.request('/rest/v1/');
      Utils.toast('Conexão Supabase respondeu.');
      if(window.Security) Security.audit('supabase_test','Testou conexão Supabase');
    }catch(e){
      console.error(e);
      Utils.toast('Falha ao testar Supabase. Confira URL/Anon Key e tabelas.');
    }
  },

  async syncLocal(){
    this.salvar();
    if(!window.SupabaseBase || !SupabaseBase.enabled()){
      Utils.toast('Supabase não está configurado/ativo.');
      return;
    }

    if(!confirm('Enviar dados locais para o Supabase?')) return;

    try{
      await SupabaseBase.sincronizarLocalParaSupabase();
      if(window.Security) Security.audit('supabase_sync','Sincronizou local para Supabase');
    }catch(e){
      console.error(e);
      Utils.toast('Falha na sincronização com Supabase.');
    }
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
