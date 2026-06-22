/* =========================================================
   ZERO V7.9 — LGPD OFFLINE
   O que dá para fazer offline:
   - controle local de privacidade
   - logs locais de acesso/impressão/exportação
   - consentimento do paciente
   - bloqueio simples por perfil
   - modo privacidade/ocultar dados
   - alerta de sessão
   - aviso de risco do armazenamento local
========================================================= */
window.LGPDOffline = {
  defaultConfig(){
    return {
      id:'LGPD_CONFIG',
      modoPrivacidade:false,
      logAcessoPaciente:true,
      logImpressao:true,
      logExportacao:true,
      exigirMotivoAcesso:false,
      alertaLocalStorage:true,
      sessaoMinutos:60,
      perfisProntuario:['admin','medico'],
      perfisFinanceiro:['admin','financeiro'],
      perfisBackup:['admin'],
      perfisRelatorios:['admin','financeiro']
    };
  },

  init(){
    if(!Store.get('LGPD_CONFIG').length){
      Store.set('LGPD_CONFIG',[this.defaultConfig()]);
    }else{
      Store.set('LGPD_CONFIG',[Object.assign(this.defaultConfig(), Store.get('LGPD_CONFIG')[0]||{})]);
    }
    this.aplicarModoPrivacidade();
    this.patchAuditoria();
    this.patchPrintExport();
    this.patchPacienteAccess();
    this.patchSession();
    this.showLocalStorageWarning();
  },

  cfg(){
    this.initSafe();
    return Object.assign(this.defaultConfig(), Store.get('LGPD_CONFIG')[0]||{});
  },

  initSafe(){
    if(!Store.get('LGPD_CONFIG').length){
      Store.set('LGPD_CONFIG',[this.defaultConfig()]);
    }
  },

  saveCfg(cfg){
    Store.set('LGPD_CONFIG',[Object.assign(this.defaultConfig(), cfg||{})]);
    this.aplicarModoPrivacidade();
  },

  user(){
    try{
      return window.Security?.currentUser?.() || window.Auth?.currentUser?.() || window.currentUser || JSON.parse(localStorage.getItem('session')||'{}') || {};
    }catch(e){
      return {};
    }
  },

  perfil(){
    const u=this.user();
    return String(u.perfil || u.role || u.tipo || 'admin').toLowerCase();
  },

  usuarioNome(){
    const u=this.user();
    return u.nome || u.name || u.login || u.email || 'usuário local';
  },

  audit(acao, detalhe='', extra={}){
    const item={
      id:Utils.id('LGPD'),
      dataHora:new Date().toLocaleString('pt-BR'),
      iso:new Date().toISOString(),
      usuario:this.usuarioNome(),
      perfil:this.perfil(),
      acao,
      detalhe,
      extra
    };
    Store.upsert('LGPD_LOGS', item);
    try{
      if(window.Security && Security.audit) Security.audit('lgpd_'+acao, detalhe);
    }catch(e){}
    return item;
  },

  aplicarModoPrivacidade(){
    const cfg=this.cfg();
    document.body.classList.toggle('lgpd-mask', !!cfg.modoPrivacidade);
  },

  togglePrivacidade(){
    const cfg=this.cfg();
    cfg.modoPrivacidade=!cfg.modoPrivacidade;
    this.saveCfg(cfg);
    Utils.toast(cfg.modoPrivacidade?'Modo privacidade ativado.':'Modo privacidade desativado.');
    this.audit('modo_privacidade', cfg.modoPrivacidade?'ativou':'desativou');
  },

  canAccess(area){
    const cfg=this.cfg();
    const perfil=this.perfil();
    const map={
      prontuario:cfg.perfisProntuario,
      financeiro:cfg.perfisFinanceiro,
      backup:cfg.perfisBackup,
      relatorios:cfg.perfisRelatorios
    };
    return (map[area]||['admin']).includes(perfil);
  },

  requireAccess(area, msg){
    if(this.canAccess(area)) return true;
    Utils.toast(msg || 'Acesso bloqueado pela regra LGPD/perfil.');
    this.audit('acesso_bloqueado', area);
    return false;
  },

  patchAuditoria(){
    if(this.__auditPatched) return;
    this.__auditPatched=true;

    const oldGo=window.Router && Router.go ? Router.go.bind(Router) : null;
    if(oldGo && !Router.__lgpdPatchedV79){
      Router.__lgpdPatchedV79=true;
      Router.go=(r)=>{
        const route=String(r||'');
        if(route==='prontuario' && !this.requireAccess('prontuario','Seu perfil não pode acessar prontuário.')) return;
        if(route==='financeiro' && !this.requireAccess('financeiro','Seu perfil não pode acessar financeiro.')) return;
        if(route==='backup' && !this.requireAccess('backup','Seu perfil não pode acessar backup/exportação.')) return;
        if(route==='relatorios' && !this.requireAccess('relatorios','Seu perfil não pode acessar relatórios.')) return;
        this.audit('navegacao', 'Acessou menu '+route);
        return oldGo(r);
      };
    }
  },

  patchPacienteAccess(){
    if(this.__pacientePatch) return;
    this.__pacientePatch=true;

    // Loga clique em botões/rotas de paciente/prontuário como acesso local.
    document.addEventListener('click',(ev)=>{
      const el=ev.target.closest('button,a,[onclick]');
      if(!el) return;
      const txt=(el.innerText||el.title||el.getAttribute('aria-label')||'').toLowerCase();
      const oc=String(el.getAttribute('onclick')||'').toLowerCase();

      if(txt.includes('prontu') || oc.includes('prontuario') || oc.includes('prontuário')){
        if(this.cfg().logAcessoPaciente){
          this.audit('acesso_prontuario','Abriu/solicitou prontuário');
        }
      }

      if(txt.includes('paciente') || oc.includes('paciente')){
        if(this.cfg().logAcessoPaciente){
          this.audit('acesso_paciente','Acessou paciente');
        }
      }
    }, true);
  },

  patchPrintExport(){
    if(this.__printPatch) return;
    this.__printPatch=true;

    const oldPrint=window.print?.bind(window);
    if(oldPrint){
      window.print=()=>{
        if(this.cfg().logImpressao) this.audit('impressao','Executou impressão no sistema');
        return oldPrint();
      };
    }

    document.addEventListener('click',(ev)=>{
      const el=ev.target.closest('button,a');
      if(!el) return;
      const txt=(el.innerText||el.title||el.getAttribute('aria-label')||'').toLowerCase();
      const oc=String(el.getAttribute('onclick')||'').toLowerCase();

      if(txt.includes('imprimir') || oc.includes('print') || oc.includes('imprimir')){
        if(this.cfg().logImpressao) this.audit('impressao_botao','Clicou em imprimir/exportar impressão');
      }

      if(txt.includes('export') || txt.includes('backup') || txt.includes('csv') || txt.includes('pdf') || oc.includes('export') || oc.includes('backup')){
        if(this.cfg().logExportacao) this.audit('exportacao','Clicou em exportação/backup/PDF/CSV');
      }
    }, true);
  },

  patchSession(){
    if(this.__sessionPatch) return;
    this.__sessionPatch=true;
    let last=Date.now();

    ['click','keydown','mousemove','touchstart'].forEach(e=>document.addEventListener(e,()=>{last=Date.now();}, {passive:true}));

    setInterval(()=>{
      const mins=Number(this.cfg().sessaoMinutos||60);
      if(mins<=0) return;
      const diff=(Date.now()-last)/60000;
      if(diff>=mins){
        this.audit('sessao_inativa','Sessão local ficou inativa por '+mins+' minutos');
        const banner=this.ensureBanner();
        banner.style.display='block';
      }
    }, 60000);
  },

  ensureBanner(){
    let b=document.getElementById('lgpd-privacy-banner');
    if(b) return b;
    b=document.createElement('div');
    b.id='lgpd-privacy-banner';
    b.className='lgpd-privacy-banner';
    b.innerHTML=`<strong>Aviso LGPD</strong>
      <div>Sessão local ficou inativa. Recomenda-se sair do sistema se o computador for compartilhado.</div>
      <button class="btn btn-blue" onclick="document.getElementById('lgpd-privacy-banner').style.display='none'">Continuar</button>`;
    document.body.appendChild(b);
    return b;
  },

  showLocalStorageWarning(){
    const cfg=this.cfg();
    if(!cfg.alertaLocalStorage || localStorage.getItem('LGPD_LOCAL_WARNING_OK')==='1') return;

    setTimeout(()=>{
      if(!document.body) return;
      const b=document.createElement('div');
      b.className='lgpd-privacy-banner';
      b.style.display='block';
      b.innerHTML=`<strong>Uso offline/local</strong>
        <div>Este sistema ainda salva dados localmente neste navegador. Para produção real da clínica, o ideal é banco online seguro.</div>
        <button class="btn btn-blue" type="button">Entendi</button>`;
      b.querySelector('button').onclick=()=>{
        localStorage.setItem('LGPD_LOCAL_WARNING_OK','1');
        b.remove();
      };
      document.body.appendChild(b);
    }, 1200);
  },

  consentimentoPaciente(pacId){
    return Store.get('LGPD_CONSENTIMENTOS').find(c=>String(c.pacId)===String(pacId));
  },

  registrarConsentimento(pacId, nome='', texto=''){
    const item={
      id:Utils.id('CONS'),
      pacId,
      paciente:nome,
      texto:texto||'Paciente/representante ciente do tratamento de dados pessoais e dados sensíveis para finalidade de atendimento em saúde.',
      aceito:true,
      dataHora:new Date().toLocaleString('pt-BR'),
      iso:new Date().toISOString(),
      usuario:this.usuarioNome()
    };
    Store.upsert('LGPD_CONSENTIMENTOS', item);
    this.audit('consentimento','Registrou consentimento LGPD para paciente '+(nome||pacId));
    Utils.toast('Consentimento LGPD registrado.');
    return item;
  },

  render(){
    const cfg=this.cfg();
    const logs=Store.get('LGPD_LOGS').slice().sort((a,b)=>String(b.iso).localeCompare(String(a.iso))).slice(0,150);
    const cons=Store.get('LGPD_CONSENTIMENTOS').slice().sort((a,b)=>String(b.iso).localeCompare(String(a.iso))).slice(0,80);

    document.getElementById('content').innerHTML=`<div class="fin-toolbar">
      <div>
        <h2 style="margin:0;">🔐 LGPD / Segurança Offline</h2>
        <div style="color:#64748b;margin-top:4px;">Controles possíveis enquanto o sistema ainda está offline/local.</div>
      </div>
      <div class="row">
        <button class="btn btn-outline" onclick="LGPDOffline.togglePrivacidade()">Modo privacidade</button>
        <button class="btn btn-blue" onclick="LGPDOffline.exportLogs()">Exportar logs</button>
      </div>
    </div>

    <div class="lgpd-danger">
      Atenção: esta é uma camada LGPD offline. Ajuda nos testes e no controle local, mas não substitui banco online seguro, autenticação real e regras de servidor.
    </div>

    <div class="lgpd-grid">
      <div class="lgpd-card">
        <div class="lgpd-card-title">Privacidade</div>
        <div class="lgpd-switch-row"><span>Modo ocultar dados sensíveis</span><input type="checkbox" ${cfg.modoPrivacidade?'checked':''} onchange="LGPDOffline.setConfig('modoPrivacidade',this.checked)"></div>
        <div class="lgpd-switch-row"><span>Alerta de armazenamento local</span><input type="checkbox" ${cfg.alertaLocalStorage?'checked':''} onchange="LGPDOffline.setConfig('alertaLocalStorage',this.checked)"></div>
      </div>

      <div class="lgpd-card">
        <div class="lgpd-card-title">Logs</div>
        <div class="lgpd-switch-row"><span>Log de acesso a paciente</span><input type="checkbox" ${cfg.logAcessoPaciente?'checked':''} onchange="LGPDOffline.setConfig('logAcessoPaciente',this.checked)"></div>
        <div class="lgpd-switch-row"><span>Log de impressão</span><input type="checkbox" ${cfg.logImpressao?'checked':''} onchange="LGPDOffline.setConfig('logImpressao',this.checked)"></div>
        <div class="lgpd-switch-row"><span>Log de exportação/backup</span><input type="checkbox" ${cfg.logExportacao?'checked':''} onchange="LGPDOffline.setConfig('logExportacao',this.checked)"></div>
      </div>

      <div class="lgpd-card">
        <div class="lgpd-card-title">Sessão</div>
        <label>Alerta de inatividade em minutos</label>
        <input type="number" min="0" id="lgpd-sessao" value="${cfg.sessaoMinutos}" onchange="LGPDOffline.setConfig('sessaoMinutos',Number(this.value||0))">
        <div class="doc-sub" style="margin-top:8px;">0 desativa o alerta local.</div>
      </div>
    </div>

    <div class="lgpd-card">
      <div class="lgpd-card-title">
        <span>Logs LGPD locais</span>
        <span class="lgpd-badge">${logs.length} registros recentes</span>
      </div>
      ${logs.length?`<div class="sv-table-wrap"><table class="sv-table">
        <thead><tr><th>Data</th><th>Usuário</th><th>Perfil</th><th>Ação</th><th>Detalhe</th></tr></thead>
        <tbody>${logs.map(l=>`<tr><td>${Utils.esc(l.dataHora||'')}</td><td>${Utils.esc(l.usuario||'')}</td><td>${Utils.esc(l.perfil||'')}</td><td>${Utils.esc(l.acao||'')}</td><td>${Utils.esc(l.detalhe||'')}</td></tr>`).join('')}</tbody>
      </table></div>`:`<div class="fin-empty">Nenhum log LGPD ainda.</div>`}
    </div>

    <div class="lgpd-card">
      <div class="lgpd-card-title">
        <span>Consentimentos LGPD</span>
        <span class="lgpd-badge">${cons.length} registros</span>
      </div>
      ${cons.length?`<div class="sv-table-wrap"><table class="sv-table">
        <thead><tr><th>Data</th><th>Paciente</th><th>Usuário</th><th>Texto</th></tr></thead>
        <tbody>${cons.map(c=>`<tr><td>${Utils.esc(c.dataHora||'')}</td><td>${Utils.esc(c.paciente||c.pacId||'')}</td><td>${Utils.esc(c.usuario||'')}</td><td>${Utils.esc(c.texto||'')}</td></tr>`).join('')}</tbody>
      </table></div>`:`<div class="fin-empty">Nenhum consentimento registrado.</div>`}
    </div>`;
  },

  setConfig(key,val){
    const cfg=this.cfg();
    cfg[key]=val;
    this.saveCfg(cfg);
    this.audit('config_lgpd','Alterou '+key);
    Utils.toast('Configuração LGPD salva.');
  },

  exportLogs(){
    const data={
      config:this.cfg(),
      logs:Store.get('LGPD_LOGS'),
      consentimentos:Store.get('LGPD_CONSENTIMENTOS'),
      exportadoEm:new Date().toISOString(),
      usuario:this.usuarioNome()
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='lgpd_logs_clinica_mario_'+Date.now()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    this.audit('exportacao_lgpd','Exportou logs LGPD');
  }
};

document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>LGPDOffline.init(),300));
setTimeout(()=>{try{LGPDOffline.init();}catch(e){}},600);




/* ZERO V8.0 — LGPD usa permissões reais por perfil */
(function(){
  if(!window.LGPDOffline || LGPDOffline.__perfilV80) return;
  LGPDOffline.__perfilV80=true;

  LGPDOffline.canAccess = function(area){
    const routeMap={
      prontuario:'prontuario',
      financeiro:'financeiro',
      backup:'backup',
      relatorios:'relatorios',
      lgpd:'lgpd'
    };
    const route=routeMap[area]||area;
    return window.PermissoesPerfil ? PermissoesPerfil.canRoute(route) : true;
  };

  const oldRender=LGPDOffline.render?.bind(LGPDOffline);
  if(oldRender){
    LGPDOffline.render=function(){
      if(window.PermissoesPerfil && !PermissoesPerfil.canRoute('lgpd')){
        Utils.toast('Seu perfil não tem permissão para LGPD.');
        return;
      }
      return oldRender();
    };
  }
})();


/* ZERO V8.1 — LGPD sem aviso injetado no paciente */
(function(){
  if(!window.LGPDOffline || LGPDOffline.__semAvisoPacienteV81) return;
  LGPDOffline.__semAvisoPacienteV81=true;

  LGPDOffline.removerAvisoPaciente = function(){
    document.querySelectorAll('#lgpd-paciente-acoes,.lgpd-alert').forEach(el=>{
      const txt=(el.innerText||'').toLowerCase();
      if(txt.includes('registre consentimento') || txt.includes('registrar/acompanhar')){
        el.remove();
      }
    });
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>LGPDOffline.removerAvisoPaciente(),50));
  setTimeout(()=>LGPDOffline.removerAvisoPaciente(),200);
})();




/* =========================================================
   ZERO V8.8 — Modo Privacidade funcionando + indicador
   Correção:
   - Botão Modo privacidade agora alterna ativo/desativado.
   - Mostra indicador fixo no topo.
   - Atualiza checkbox no menu LGPD.
========================================================= */
(function(){
  if(!window.LGPDOffline || LGPDOffline.__privacidadeFixV88) return;
  LGPDOffline.__privacidadeFixV88=true;

  LGPDOffline.cfg = function(){
    if(!Store.get('LGPD_CONFIG').length){
      Store.set('LGPD_CONFIG',[this.defaultConfig()]);
    }
    return Object.assign(this.defaultConfig(), Store.get('LGPD_CONFIG')[0]||{});
  };

  LGPDOffline.saveCfg = function(cfg){
    Store.set('LGPD_CONFIG',[Object.assign(this.defaultConfig(), cfg||{})]);
    this.aplicarModoPrivacidade();
    this.renderIndicadorPrivacidade();
  };

  LGPDOffline.aplicarModoPrivacidade = function(){
    const ativo=!!this.cfg().modoPrivacidade;
    document.body.classList.toggle('lgpd-mask', ativo);
    document.documentElement.classList.toggle('lgpd-mask', ativo);
    this.renderIndicadorPrivacidade();
  };

  LGPDOffline.togglePrivacidade = function(){
    const cfg=this.cfg();
    cfg.modoPrivacidade=!cfg.modoPrivacidade;
    this.saveCfg(cfg);

    const chk=document.querySelector('#lgpd-modo-privacidade,#lgpd-privacidade-check,input[onchange*="modoPrivacidade"]');
    if(chk) chk.checked=cfg.modoPrivacidade;

    Utils.toast(cfg.modoPrivacidade?'Modo privacidade ATIVO.':'Modo privacidade DESATIVADO.');
    this.audit('modo_privacidade', cfg.modoPrivacidade?'ativou':'desativou');
  };

  LGPDOffline.setConfig = function(key,val){
    const cfg=this.cfg();
    cfg[key]=val;
    this.saveCfg(cfg);
    this.audit('config_lgpd','Alterou '+key);
    Utils.toast('Configuração LGPD salva.');
  };

  LGPDOffline.renderIndicadorPrivacidade = function(){
    let el=document.getElementById('lgpd-privacy-status-v88');
    if(!el){
      el=document.createElement('button');
      el.id='lgpd-privacy-status-v88';
      el.type='button';
      el.onclick=()=>LGPDOffline.togglePrivacidade();
      document.body.appendChild(el);
    }

    const ativo=!!this.cfg().modoPrivacidade;
    el.className='lgpd-privacy-status-v88 '+(ativo?'ativo':'inativo');
    el.innerHTML=ativo?'🔐 Privacidade ATIVA':'🔓 Privacidade DESATIVADA';
    el.title='Clique para ativar/desativar modo privacidade';
  };

  const oldRender=LGPDOffline.render?.bind(LGPDOffline);
  if(oldRender && !LGPDOffline.__renderPrivacidadeFixV88){
    LGPDOffline.__renderPrivacidadeFixV88=true;
    LGPDOffline.render=function(){
      const ret=oldRender();
      setTimeout(()=>{
        const chk=document.querySelector('input[onchange*="modoPrivacidade"]');
        if(chk){
          chk.id='lgpd-modo-privacidade';
          chk.checked=!!LGPDOffline.cfg().modoPrivacidade;
        }
        LGPDOffline.aplicarModoPrivacidade();
      },40);
      return ret;
    };
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>LGPDOffline.aplicarModoPrivacidade(),150));
  setTimeout(()=>{try{LGPDOffline.aplicarModoPrivacidade();}catch(e){}},500);
})();
