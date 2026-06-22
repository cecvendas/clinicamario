/* ZERO V8.7 — Storage provider corrigido */
(function(){
  window.STORAGE_PROVIDER=window.STORAGE_PROVIDER||'local';

  window.ClinicaStorage={
    defaultConfig(){
      return {
        id:'STORAGE_CONFIG',
        provider:window.STORAGE_PROVIDER||'local',
        bucket:'clinica',
        supabaseUrl:'',
        supabaseAnonKey:'',
        r2PublicBaseUrl:'',
        r2WorkerUrl:'',
        salvarUrlCompleta:false
      };
    },

    init(){
      if(!Store.get('STORAGE_CONFIG').length){
        Store.set('STORAGE_CONFIG',[this.defaultConfig()]);
      }else{
        Store.set('STORAGE_CONFIG',[Object.assign(this.defaultConfig(),Store.get('STORAGE_CONFIG')[0]||{})]);
      }
    },

    cfg(){
      this.init();
      return Object.assign(this.defaultConfig(),Store.get('STORAGE_CONFIG')[0]||{});
    },

    saveCfg(cfg){
      Store.set('STORAGE_CONFIG',[Object.assign(this.defaultConfig(),cfg||{})]);
      window.STORAGE_PROVIDER=this.cfg().provider;
    },

    sanitizeName(nome){
      const ext=String(nome||'arquivo').split('.').pop();
      const base=String(nome||'arquivo')
        .replace(/\.[^/.]+$/,'')
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-zA-Z0-9_-]+/g,'_')
        .replace(/_+/g,'_')
        .replace(/^_|_$/g,'')
        .slice(0,80) || 'arquivo';
      return `${base}.${ext}`.toLowerCase();
    },

    caminhoPaciente(pacienteId,arquivo,pasta='documentos'){
      const nome=this.sanitizeName(arquivo?.name||arquivo||'arquivo');
      const stamp=new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
      return `pacientes/${pacienteId}/${pasta}/${stamp}_${nome}`;
    },

    async fileToDataURL(file){
      return await new Promise((ok,fail)=>{
        const r=new FileReader();
        r.onload=()=>ok(r.result);
        r.onerror=fail;
        r.readAsDataURL(file);
      });
    },

    async supabaseClient(){
      const cfg=this.cfg();
      if(!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('Supabase não configurado.');
      if(window.supabase?.createClient && !window.__clinicaSupabaseClient){
        window.__clinicaSupabaseClient=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
      }
      if(!window.__clinicaSupabaseClient) throw new Error('Biblioteca Supabase não carregada.');
      return window.__clinicaSupabaseClient;
    },

    async uploadArquivo(pacienteId,arquivo,meta={}){
      const cfg=this.cfg();
      const pasta=meta.pasta||meta.categoria||'documentos';
      const caminho=meta.caminho||this.caminhoPaciente(pacienteId,arquivo,pasta);
      const registro={
        id:meta.id||Utils.id('ARQ'),
        paciente_id:pacienteId,
        pacId:pacienteId,
        nome_arquivo:arquivo.name,
        nome:arquivo.name,
        caminho,
        tipo:arquivo.type||meta.tipo||'',
        tamanho:arquivo.size||0,
        categoria:pasta,
        origem:meta.origem||'',
        criadoEm:new Date().toISOString(),
        provider:cfg.provider
      };

      if(cfg.provider==='supabase'){
        const supa=await this.supabaseClient();
        const up=await supa.storage.from(cfg.bucket||'clinica').upload(caminho,arquivo,{upsert:false,contentType:arquivo.type||undefined});
        if(up.error) throw up.error;
        const row={paciente_id:pacienteId,nome_arquivo:arquivo.name,caminho,tipo:arquivo.type||'',tamanho:arquivo.size||0,categoria:pasta,origem:meta.origem||''};
        const db=await supa.from('arquivos').insert(row);
        if(db.error) console.warn('Arquivo subiu, mas tabela arquivos não inseriu:',db.error);
        Store.upsert('ARQUIVOS',registro);
        return registro;
      }

      if(cfg.provider==='r2') throw new Error('Provider R2 ainda não ativado. Estrutura já está pronta.');

      registro.dataUrl=await this.fileToDataURL(arquivo);
      Store.upsert('ARQUIVOS',registro);
      return registro;
    },

    async gerarUrl(caminho){
      const cfg=this.cfg();
      if(!caminho) return '';
      caminho=this.normalizarCaminho(caminho);

      if(cfg.provider==='supabase'){
        const supa=await this.supabaseClient();
        const r=await supa.storage.from(cfg.bucket||'clinica').createSignedUrl(caminho,3600);
        if(r.error) throw r.error;
        return r.data.signedUrl;
      }

      if(cfg.provider==='r2'){
        if(cfg.r2PublicBaseUrl) return cfg.r2PublicBaseUrl.replace(/\/$/,'')+'/'+caminho;
        if(cfg.r2WorkerUrl){
          const res=await fetch(cfg.r2WorkerUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caminho})});
          return (await res.json()).url;
        }
        throw new Error('R2 não configurado.');
      }

      const arq=Store.get('ARQUIVOS').find(a=>a.caminho===caminho) ||
                Store.get('EXAMES_ARQUIVOS').find(a=>a.caminho===caminho || a.url===caminho || a.dataUrl===caminho);
      return arq?.dataUrl || arq?.url || caminho;
    },

    async abrirArquivo(caminho){
      try{
        const url=await this.gerarUrl(caminho);
        if(!url) return Utils.toast('Arquivo não encontrado.');
        window.open(url,'_blank');
      }catch(e){
        console.error(e);
        Utils.toast('Falha ao abrir arquivo: '+(e.message||e));
      }
    },

    normalizarCaminho(valor){
      let v=String(valor||'').trim();
      let idx=v.indexOf('/clinica/');
      if(idx>=0) v=v.slice(idx+9);

      let marker='/object/public/clinica/';
      let i=v.indexOf(marker);
      if(i>=0) v=v.slice(i+marker.length);

      marker='/object/sign/clinica/';
      i=v.indexOf(marker);
      if(i>=0) v=v.slice(i+marker.length).split('?')[0];

      return v.replace(/^clinica\//,'');
    },

    normalizarRegistroArquivo(item){
      if(!item || typeof item!=='object') return item;
      if(item.url && !item.caminho) item.caminho=this.normalizarCaminho(item.url);
      if(item.signedUrl) delete item.signedUrl;
      if(item.publicUrl){
        item.caminho=item.caminho || this.normalizarCaminho(item.publicUrl);
        delete item.publicUrl;
      }
      return item;
    },

    async listarPaciente(pacienteId){
      return Store.get('ARQUIVOS').filter(a=>String(a.paciente_id||a.pacId)===String(pacienteId));
    },

    renderConfig(){
      this.init();
      const cfg=this.cfg();
      document.getElementById('content').innerHTML=`<div class="fin-toolbar">
        <div>
          <h2 style="margin:0;">☁️ Storage / Supabase</h2>
          <div style="color:#64748b;margin-top:4px;">Preparado para Supabase agora e R2 no futuro, sem salvar URL completa.</div>
        </div>
      </div>

      <div class="lgpd-alert">Regra segura: salvar apenas o caminho relativo, exemplo <strong>pacientes/10/exames/exame.pdf</strong>.</div>

      <div class="lgpd-card">
        <div class="lgpd-card-title">Configuração</div>
        <div class="form-grid doc-modal-original">
          <div class="f-col"><label>Provider</label><select id="st-provider"><option value="local">Local/offline atual</option><option value="supabase">Supabase Storage</option><option value="r2">Cloudflare R2 futuro</option></select></div>
          <div class="f-col"><label>Bucket</label><input id="st-bucket" value="${Utils.esc(cfg.bucket||'clinica')}"></div>
          <div class="f-col f-full"><label>Supabase URL</label><input id="st-url" value="${Utils.esc(cfg.supabaseUrl||'')}" placeholder="https://seuprojeto.supabase.co"></div>
          <div class="f-col f-full"><label>Supabase anon key</label><input id="st-key" value="${Utils.esc(cfg.supabaseAnonKey||'')}" placeholder="sua chave anon/public"></div>
          <div class="f-col f-full"><label>R2 public base URL futuro</label><input id="st-r2base" value="${Utils.esc(cfg.r2PublicBaseUrl||'')}"></div>
          <div class="f-col f-full"><label>R2 Worker URL futuro</label><input id="st-r2worker" value="${Utils.esc(cfg.r2WorkerUrl||'')}"></div>
        </div>
        <div class="row right">
          <button class="btn btn-outline" onclick="ClinicaStorage.testarCaminho()">Testar caminho</button>
          <button class="btn btn-blue" onclick="ClinicaStorage.salvarConfigTela()">Salvar configuração</button>
        </div>
      </div>

      <div class="lgpd-card">
        <div class="lgpd-card-title">SQL Supabase sugerido</div>
        <pre style="white-space:pre-wrap;background:#0f172a;color:#e5e7eb;border-radius:12px;padding:14px;overflow:auto;">${Utils.esc(this.sqlSupabase())}</pre>
      </div>`;

      setTimeout(()=>{const el=document.getElementById('st-provider'); if(el) el.value=cfg.provider||'local';},30);
    },

    salvarConfigTela(){
      const cfg=this.cfg();
      cfg.provider=document.getElementById('st-provider').value;
      cfg.bucket=document.getElementById('st-bucket').value.trim()||'clinica';
      cfg.supabaseUrl=document.getElementById('st-url').value.trim();
      cfg.supabaseAnonKey=document.getElementById('st-key').value.trim();
      cfg.r2PublicBaseUrl=document.getElementById('st-r2base').value.trim();
      cfg.r2WorkerUrl=document.getElementById('st-r2worker').value.trim();
      this.saveCfg(cfg);
      Utils.toast('Configuração de storage salva.');
    },

    testarCaminho(){
      alert('Exemplo de caminho salvo no banco:\\n\\n'+this.caminhoPaciente(10,{name:'exame.pdf'},'exames')+'\\n\\nNão salva URL completa.');
    },

    sqlSupabase(){
      return `-- Bucket no Supabase Storage: clinica

create table if not exists public.arquivos (
  id uuid primary key default gen_random_uuid(),
  paciente_id text not null,
  nome_arquivo text not null,
  caminho text not null,
  tipo text,
  tamanho bigint,
  categoria text,
  origem text,
  created_at timestamptz default now()
);

create index if not exists arquivos_paciente_id_idx
on public.arquivos (paciente_id);

-- salvar em caminho apenas: pacientes/10/exames/exame.pdf
-- nunca salvar URL completa.`;
    }
  };

  window.uploadArquivo=(...args)=>ClinicaStorage.uploadArquivo(...args);
  window.gerarUrl=(...args)=>ClinicaStorage.gerarUrl(...args);
  window.abrirArquivo=(...args)=>ClinicaStorage.abrirArquivo(...args);

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>ClinicaStorage.init(),200));
  setTimeout(()=>{try{ClinicaStorage.init();}catch(e){}},500);
})();
