window.Configuracoes={
  padrao(){
    return {
      nomeClinica:'Clínica Mário',
      tituloImpressao:'PRONTUÁRIO MÉDICO ELETRÔNICO',
      profissional:'',
      especialidade:'',
      conselho:'',
      endereco:'',
      whatsapp:'',
      instagram:'',
      email:'',
      logo:''
    };
  },

  get(){
    const arr=Store.get('CONFIG_CLINICA');
    return Object.assign(this.padrao(), arr[0]||{});
  },

  set(cfg){
    cfg.id='CONFIG_PRINCIPAL';
    Store.set('CONFIG_CLINICA',[cfg]);
  },

  render(){
    const c=this.get();
    document.getElementById('content').innerHTML=`<div class="card">
      <h3>Configurações da Clínica</h3>
      <p style="color:#64748b;margin-top:4px">Esses dados aparecem no cabeçalho das impressões.</p>

      <div class="cm-section">
        <div class="cm-section-title">🏥 Cabeçalho das impressões</div>
        <div class="cm-form-grid">
          <div class="span-2">
            <label>Nome da clínica</label>
            <input id="cfg-nomeClinica" value="${Utils.esc(c.nomeClinica||'')}">
          </div>
          <div class="span-2">
            <label>Título da impressão</label>
            <input id="cfg-tituloImpressao" value="${Utils.esc(c.tituloImpressao||'PRONTUÁRIO MÉDICO ELETRÔNICO')}">
          </div>

          <div class="span-2">
            <label>Profissional / Responsável técnico</label>
            <input id="cfg-profissional" value="${Utils.esc(c.profissional||'')}" placeholder="Ex.: Dr. Nome do profissional">
          </div>
          <div class="span-2">
            <label>Especialidade / Área</label>
            <input id="cfg-especialidade" value="${Utils.esc(c.especialidade||'')}">
          </div>

          <div class="span-2">
            <label>Conselho / CRM</label>
            <input id="cfg-conselho" value="${Utils.esc(c.conselho||'')}" placeholder="Ex.: CRM-MS 12345">
          </div>
          <div class="span-2">
            <label>WhatsApp</label>
            <input id="cfg-whatsapp" value="${Utils.esc(c.whatsapp||'')}">
          </div>

          <div class="span-4">
            <label>Endereço</label>
            <input id="cfg-endereco" value="${Utils.esc(c.endereco||'')}">
          </div>

          <div class="span-2">
            <label>Instagram / @</label>
            <input id="cfg-instagram" value="${Utils.esc(c.instagram||'')}">
          </div>
          <div class="span-2">
            <label>E-mail</label>
            <input id="cfg-email" value="${Utils.esc(c.email||'')}">
          </div>

          <div class="span-4">
            <label>Logo da impressão</label>
            <input type="hidden" id="cfg-logo" value="${Utils.esc(c.logo||'')}">
            <input type="file" accept="image/*" onchange="Configuracoes.logoFile(event)">
            <img id="cfg-logo-preview" class="config-logo-preview" src="${Utils.esc(c.logo||'assets/logo-clinica-mario.svg')}">
            <div class="config-help">Se deixar vazio, usa a logo padrão. Para sair igual ao original, cadastre aqui os dados corretos da clínica/profissional.</div>
          </div>
        </div>
      </div>

      <div class="row right">
        <button class="btn btn-outline" onclick="Configuracoes.limparLogo()">Remover logo</button>
        <button class="btn btn-blue" onclick="Configuracoes.salvar()">Salvar configurações</button>
      </div>
    </div>`;
  },

  logoFile(ev){
    const f=ev.target.files && ev.target.files[0];
    if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      document.getElementById('cfg-logo').value=r.result;
      document.getElementById('cfg-logo-preview').src=r.result;
    };
    r.readAsDataURL(f);
  },

  limparLogo(){
    document.getElementById('cfg-logo').value='';
    document.getElementById('cfg-logo-preview').src='assets/logo-clinica-mario.svg';
  },

  salvar(){
    const cfg={
      id:'CONFIG_PRINCIPAL',
      nomeClinica:document.getElementById('cfg-nomeClinica').value.trim(),
      tituloImpressao:document.getElementById('cfg-tituloImpressao').value.trim(),
      profissional:document.getElementById('cfg-profissional').value.trim(),
      especialidade:document.getElementById('cfg-especialidade').value.trim(),
      conselho:document.getElementById('cfg-conselho').value.trim(),
      endereco:document.getElementById('cfg-endereco').value.trim(),
      whatsapp:document.getElementById('cfg-whatsapp').value.trim(),
      instagram:document.getElementById('cfg-instagram').value.trim(),
      email:document.getElementById('cfg-email').value.trim(),
      logo:document.getElementById('cfg-logo').value.trim()
    };
    this.set(cfg);
    if(window.Security) Security.audit('config_cabecalho','Atualizou dados do cabeçalho de impressão');
    Utils.toast('Configurações salvas.');
    this.render();
  }
};



/* =========================================================
   ZERO V5.0 — Remover logo de verdade
========================================================= */
(function(){
  if(!window.Configuracoes) return;

  const oldGetV50 = Configuracoes.get.bind(Configuracoes);
  Configuracoes.get = function(){
    const c=oldGetV50();
    c.logoRemovida = !!c.logoRemovida;
    return c;
  };

  Configuracoes.limparLogo = function(){
    const logo=document.getElementById('cfg-logo');
    const prev=document.getElementById('cfg-logo-preview');

    if(logo) logo.value='';

    let flag=document.getElementById('cfg-logo-removida');
    if(!flag){
      flag=document.createElement('input');
      flag.type='hidden';
      flag.id='cfg-logo-removida';
      document.querySelector('.modal-body, #content')?.appendChild(flag);
    }
    flag.value='true';

    if(prev){
      prev.removeAttribute('src');
      prev.style.display='none';
      if(!document.getElementById('cfg-logo-empty')){
        prev.insertAdjacentHTML('afterend','<div id="cfg-logo-empty" class="config-logo-empty">Sem logo</div>');
      }
    }

    Utils.toast('Logo removida. Clique em Salvar configurações.');
  };

  const oldLogoFileV50 = Configuracoes.logoFile.bind(Configuracoes);
  Configuracoes.logoFile = function(ev){
    const flag=document.getElementById('cfg-logo-removida');
    if(flag) flag.value='false';
    const empty=document.getElementById('cfg-logo-empty');
    if(empty) empty.remove();
    const prev=document.getElementById('cfg-logo-preview');
    if(prev) prev.style.display='block';
    return oldLogoFileV50(ev);
  };

  Configuracoes.salvar = function(){
    const cfg={
      id:'CONFIG_PRINCIPAL',
      nomeClinica:document.getElementById('cfg-nomeClinica')?.value.trim()||'',
      tituloImpressao:document.getElementById('cfg-tituloImpressao')?.value.trim()||'',
      profissional:document.getElementById('cfg-profissional')?.value.trim()||'',
      especialidade:document.getElementById('cfg-especialidade')?.value.trim()||'',
      conselho:document.getElementById('cfg-conselho')?.value.trim()||'',
      endereco:document.getElementById('cfg-endereco')?.value.trim()||'',
      whatsapp:document.getElementById('cfg-whatsapp')?.value.trim()||'',
      instagram:document.getElementById('cfg-instagram')?.value.trim()||'',
      email:document.getElementById('cfg-email')?.value.trim()||'',
      logo:document.getElementById('cfg-logo')?.value.trim()||'',
      logoRemovida:document.getElementById('cfg-logo-removida')?.value==='true'
    };
    this.set(cfg);
    if(window.Security) Security.audit('config_cabecalho','Atualizou dados do cabeçalho de impressão');
    Utils.toast('Configurações salvas.');
    this.render();
  };

  const oldRenderV50 = Configuracoes.render.bind(Configuracoes);
  Configuracoes.render = function(){
    oldRenderV50();
    setTimeout(()=>{
      const c=this.get();
      const logo=document.getElementById('cfg-logo');
      const prev=document.getElementById('cfg-logo-preview');

      if(!document.getElementById('cfg-logo-removida')){
        const h=document.createElement('input');
        h.type='hidden';
        h.id='cfg-logo-removida';
        h.value=String(!!c.logoRemovida);
        document.getElementById('cfg-logo')?.insertAdjacentElement('afterend',h);
      }

      if(c.logoRemovida || !c.logo){
        if(logo) logo.value='';
        if(prev){
          prev.removeAttribute('src');
          prev.style.display='none';
          if(!document.getElementById('cfg-logo-empty')){
            prev.insertAdjacentHTML('afterend','<div id="cfg-logo-empty" class="config-logo-empty">Sem logo</div>');
          }
        }
      }
    },60);
  };
})();


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
