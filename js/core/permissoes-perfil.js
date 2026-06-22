/* =========================================================
   ZERO V8.0 — Permissões reais por perfil OFFLINE
   Perfis:
   - administrador/admin
   - medico/médico
   - recepcao/recepção
   - financeiro
========================================================= */
(function(){
  window.PermissoesPerfil = {
    perfis:{
      admin:{
        label:'Administrador',
        routes:[
          'inicio','atendimento','pacientes','prontuario','profissionais',
          'agenda','agendaProcedimentos','financeiro','relatorios','backup',
          'lgpd','auditoria','auditoriaSistema','supabase','storage','configuracoes'
        ],
        actions:['*']
      },

      administrador:{ alias:'admin' },

      medico:{
        label:'Médico',
        routes:[
          'inicio','atendimento','pacientes','prontuario',
          'agenda','agendaProcedimentos','relatorios'
        ],
        actions:[
          'paciente_ver','paciente_editar_basico',
          'prontuario_ver','prontuario_registrar','prontuario_editar',
          'receita_criar','receita_editar','receita_imprimir',
          'atestado_criar','atestado_editar','atestado_imprimir',
          'laudo_criar','laudo_editar','laudo_imprimir',
          'exame_pedir','exame_anexar','exame_visualizar','exame_imprimir',
          'agenda_ver','agenda_atender','agenda_imprimir',
          'relatorio_clinico_ver'
        ]
      },

      médico:{ alias:'medico' },

      recepcao:{
        label:'Recepção',
        routes:[
          'inicio','atendimento','pacientes',
          'agenda','agendaProcedimentos'
        ],
        actions:[
          'paciente_ver','paciente_criar','paciente_editar_basico',
          'agenda_ver','agenda_criar','agenda_editar','agenda_cancelar','agenda_confirmar','agenda_imprimir',
          'fila_ver','fila_criar','fila_encaminhar',
          'exame_visualizar'
        ]
      },

      recepção:{ alias:'recepcao' },

      financeiro:{
        label:'Financeiro',
        routes:[
          'inicio','financeiro','relatorios'
        ],
        actions:[
          'financeiro_ver','financeiro_criar','financeiro_editar','financeiro_excluir',
          'financeiro_exportar','relatorio_financeiro_ver'
        ]
      }
    },

    normalizePerfil(perfil){
      let p=String(perfil||'admin').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if(p==='administrador') p='admin';
      if(p==='recepcionista') p='recepcao';
      return p || 'admin';
    },

    currentUser(){
      try{
        return window.Security?.currentUser?.() ||
               window.Auth?.currentUser?.() ||
               window.currentUser ||
               JSON.parse(localStorage.getItem('session')||'{}') ||
               JSON.parse(localStorage.getItem('usuarioLogado')||'{}') ||
               {};
      }catch(e){
        return {};
      }
    },

    currentPerfil(){
      const u=this.currentUser();
      return this.normalizePerfil(u.perfil || u.role || u.tipo || u.cargo || 'admin');
    },

    perfilConfig(perfil=''){
      let p=this.normalizePerfil(perfil||this.currentPerfil());
      let cfg=this.perfis[p] || this.perfis.admin;
      if(cfg.alias) cfg=this.perfis[cfg.alias];
      return cfg || this.perfis.admin;
    },

    canRoute(route, perfil=''){
      route=String(route||'').trim();
      const cfg=this.perfilConfig(perfil||this.currentPerfil());
      return cfg.routes.includes(route);
    },

    canAction(action, perfil=''){
      const cfg=this.perfilConfig(perfil||this.currentPerfil());
      return cfg.actions.includes('*') || cfg.actions.includes(action);
    },

    requireRoute(route, msg=''){
      if(this.canRoute(route)) return true;
      this.log('acesso_bloqueado_rota', `Tentou acessar ${route}`);
      if(window.Utils?.toast) Utils.toast(msg || 'Seu perfil não tem permissão para acessar este menu.');
      return false;
    },

    requireAction(action, msg=''){
      if(this.canAction(action)) return true;
      this.log('acao_bloqueada', `Tentou executar ${action}`);
      if(window.Utils?.toast) Utils.toast(msg || 'Seu perfil não tem permissão para esta ação.');
      return false;
    },

    log(acao, detalhe=''){
      try{
        if(window.LGPDOffline?.audit) LGPDOffline.audit(acao, detalhe);
        else if(window.Security?.audit) Security.audit(acao, detalhe);
      }catch(e){}
    },

    applyMenuVisibility(){
      const perfil=this.currentPerfil();
      document.querySelectorAll('[data-route]').forEach(el=>{
        const route=el.getAttribute('data-route');
        const can=this.canRoute(route, perfil);
        el.style.display=can ? '' : 'none';
        el.dataset.permissionHidden = can ? '0' : '1';
      });
    },

    patchRouter(){
      if(!window.Router || Router.__perfilPatchV80) return;
      Router.__perfilPatchV80=true;
      const oldGo=Router.go.bind(Router);

      Router.go=(route)=>{
        if(!this.requireRoute(route)) return;
        const ret=oldGo(route);
        setTimeout(()=>this.applyMenuVisibility(),40);
        return ret;
      };
    },

    patchActions(){
      if(this.__actionsPatchV80) return;
      this.__actionsPatchV80=true;

      document.addEventListener('click',(ev)=>{
        const el=ev.target.closest('button,a,[onclick]');
        if(!el) return;

        const text=(el.innerText||el.title||el.getAttribute('aria-label')||'').toLowerCase();
        const oc=String(el.getAttribute('onclick')||'').toLowerCase();

        const checks=[
          [oc.includes('financeiro.') || text.includes('financeiro'), 'financeiro_editar', 'Seu perfil não pode alterar financeiro.'],
          [(text.includes('export') || text.includes('backup') || oc.includes('export') || oc.includes('backup')) && !oc.includes('agenda'), 'financeiro_exportar', 'Seu perfil não pode exportar/backup.'],
          [(text.includes('registrar consulta') || oc.includes('registrarconsulta') || oc.includes('prontuario')) && (text.includes('salvar') || text.includes('registrar') || oc.includes('save')), 'prontuario_registrar', 'Seu perfil não pode registrar prontuário.']
        ];

        for(const [cond, action, msg] of checks){
          if(cond && !this.canAction(action)){
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            this.requireAction(action,msg);
            return false;
          }
        }
      }, true);
    },

    init(){
      this.patchRouter();
      this.patchActions();
      this.applyMenuVisibility();
    }
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>PermissoesPerfil.init(),100));
  setTimeout(()=>{try{PermissoesPerfil.init();}catch(e){}},400);
})();


/* ZERO V8.1 — Permissões sem piscar menu */
(function(){
  if(!window.PermissoesPerfil || PermissoesPerfil.__semPiscarV81) return;
  PermissoesPerfil.__semPiscarV81=true;
  PermissoesPerfil._lastMenuSignature='';

  PermissoesPerfil.applyMenuVisibility = function(force=false){
    const perfil=this.currentPerfil();
    const routes=[...document.querySelectorAll('[data-route]')].map(el=>el.getAttribute('data-route')||'').join('|');
    const sig=perfil+'::'+routes;
    if(!force && sig===this._lastMenuSignature) return;
    this._lastMenuSignature=sig;

    document.querySelectorAll('[data-route]').forEach(el=>{
      const route=el.getAttribute('data-route');
      const can=this.canRoute(route, perfil);
      const hidden=el.dataset.permissionHidden === '1';

      if(can && hidden){
        el.dataset.permissionHidden='0';
        el.classList.remove('route-hidden-v81');
        el.style.removeProperty('display');
      }else if(!can && !hidden){
        el.dataset.permissionHidden='1';
        el.classList.add('route-hidden-v81');
        el.style.display='none';
      }
    });
  };

  setTimeout(()=>PermissoesPerfil.applyMenuVisibility(true),100);
})();




/* =========================================================
   ZERO V8.5 — Ajuste permissões rotas críticas
========================================================= */
(function(){
  if(!window.PermissoesPerfil || PermissoesPerfil.__rotasCriticasV85) return;
  PermissoesPerfil.__rotasCriticasV85=true;

  const oldPerfilConfig=PermissoesPerfil.perfilConfig.bind(PermissoesPerfil);
  PermissoesPerfil.perfilConfig=function(perfil=''){
    const cfg=oldPerfilConfig(perfil);
    const p=this.normalizePerfil(perfil||this.currentPerfil());

    if(p==='admin'){
      ['pacientes','backup','storage','lgpd','supabase','configuracoes','auditoria','auditoriaSistema'].forEach(r=>{
        if(!cfg.routes.includes(r)) cfg.routes.push(r);
      });
      if(!cfg.actions.includes('*')) cfg.actions.push('*');
    }

    if(p==='recepcao'){
      ['pacientes','agenda','agendaProcedimentos','atendimento','inicio'].forEach(r=>{
        if(!cfg.routes.includes(r)) cfg.routes.push(r);
      });
    }

    if(p==='medico'){
      ['pacientes','prontuario','agenda','agendaProcedimentos','atendimento','inicio'].forEach(r=>{
        if(!cfg.routes.includes(r)) cfg.routes.push(r);
      });
    }

    return cfg;
  };

  setTimeout(()=>this?.applyMenuVisibility?.(true),80);
})();




/* =========================================================
   ZERO V9.5 — Menu lateral somente com acessos do perfil
   Regra:
   - Médico: só menus clínicos permitidos.
   - Recepção: só recepção/pacientes/agenda/fila.
   - Financeiro: só financeiro/relatórios/início.
   - Administrador: tudo.
========================================================= */
(function(){
  if(!window.PermissoesPerfil) window.PermissoesPerfil={};
  if(PermissoesPerfil.__menusPorPerfilV95) return;
  PermissoesPerfil.__menusPorPerfilV95=true;

  PermissoesPerfil.routesPorPerfilV95 = {
    admin:[
      'inicio','atendimento','pacientes','prontuario','profissionais',
      'agenda','agendaProcedimentos','financeiro','relatorios','backup',
      'lgpd','auditoria','auditoriaSistema','supabase','storage','configuracoes'
    ],
    medico:[
      'inicio','atendimento','pacientes','prontuario',
      'agenda','agendaProcedimentos','relatorios'
    ],
    recepcao:[
      'inicio','atendimento','pacientes',
      'agenda','agendaProcedimentos'
    ],
    financeiro:[
      'inicio','financeiro','relatorios'
    ]
  };

  PermissoesPerfil.normalizePerfil = function(perfil){
    let p=String(perfil||'admin').trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(p==='administrador') p='admin';
    if(p==='recepcionista') p='recepcao';
    if(p==='medico') p='medico';
    if(p==='recepcao') p='recepcao';
    if(p==='financeiro') p='financeiro';
    return p || 'admin';
  };

  PermissoesPerfil.currentUser = function(){
    try{
      return window.Auth?.current ||
             window.Security?.currentUser?.() ||
             window.currentUser ||
             JSON.parse(sessionStorage.getItem('CM_USER')||'{}') ||
             JSON.parse(localStorage.getItem('currentUser')||'{}') ||
             {};
    }catch(e){
      return {};
    }
  };

  PermissoesPerfil.currentPerfil = function(){
    const u=this.currentUser();
    return this.normalizePerfil(u.perfil || u.role || u.tipo || u.cargo || 'admin');
  };

  PermissoesPerfil.canRoute = function(route, perfil=''){
    route=String(route||'').trim();
    const p=this.normalizePerfil(perfil || this.currentPerfil());
    const allowed=this.routesPorPerfilV95[p] || this.routesPorPerfilV95.admin;
    return allowed.includes(route);
  };

  PermissoesPerfil.applyMenuVisibility = function(force=true){
    const perfil=this.currentPerfil();

    document.querySelectorAll('[data-route]').forEach(el=>{
      const route=el.getAttribute('data-route');
      const can=this.canRoute(route,perfil);

      if(can){
        el.dataset.permissionHidden='0';
        el.classList.remove('route-hidden-v81','route-hidden-v95');
        el.style.removeProperty('display');
        el.removeAttribute('aria-hidden');
      }else{
        el.dataset.permissionHidden='1';
        el.classList.add('route-hidden-v95');
        el.style.setProperty('display','none','important');
        el.setAttribute('aria-hidden','true');
      }
    });

    // Se o menu atual ficou proibido para o perfil, volta para início.
    try{
      const current=window.Router?.current || '';
      if(current && current!=='inicio' && !this.canRoute(current,perfil)){
        Router.go('inicio');
      }
    }catch(e){}
  };

  PermissoesPerfil.requireRoute = function(route,msg=''){
    if(this.canRoute(route)) return true;
    try{
      if(window.LGPDOffline?.audit) LGPDOffline.audit('acesso_bloqueado_rota','Tentou acessar '+route);
      else if(window.Security?.audit) Security.audit('acesso_bloqueado_rota','Tentou acessar '+route);
    }catch(e){}
    if(window.Utils?.toast) Utils.toast(msg || 'Seu perfil não tem permissão para acessar este menu.');
    return false;
  };

  // Reforça Router para bloquear rota direta.
  if(window.Router && Router.go && !Router.__menusPorPerfilV95){
    Router.__menusPorPerfilV95=true;
    const oldGo=Router.go.bind(Router);
    Router.go=function(route){
      route=String(route||'').replace(/\\'/g,'').replace(/'/g,'').trim();
      if(window.PermissoesPerfil && !PermissoesPerfil.requireRoute(route)) return;
      const ret=oldGo(route);
      requestAnimationFrame(()=>PermissoesPerfil.applyMenuVisibility(true));
      setTimeout(()=>PermissoesPerfil.applyMenuVisibility(true),80);
      return ret;
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>PermissoesPerfil.applyMenuVisibility(true),80);
    setTimeout(()=>PermissoesPerfil.applyMenuVisibility(true),300);
  });

  setTimeout(()=>PermissoesPerfil.applyMenuVisibility(true),400);
})();




/* =========================================================
   ZERO V9.9 — Permissões não mexem no menu enquanto modal abre
   Corrige diferença de estabilidade entre admin/médico/recepção/financeiro.
========================================================= */
(function(){
  if(!window.PermissoesPerfil || PermissoesPerfil.__modalAwareV99) return;
  PermissoesPerfil.__modalAwareV99=true;

  const oldApply=PermissoesPerfil.applyMenuVisibility?.bind(PermissoesPerfil);
  PermissoesPerfil.applyMenuVisibility=function(force=false){
    if(window.Modal && Modal.isOpen && Modal.isOpen()){
      const freezeUntil=window.__CM_MODAL_FREEZE_UNTIL__||0;
      if(Date.now()<freezeUntil && !force){
        return;
      }
    }
    return oldApply ? oldApply(force) : undefined;
  };

  const oldRequire=PermissoesPerfil.requireRoute?.bind(PermissoesPerfil);
  PermissoesPerfil.requireRoute=function(route,msg=''){
    if(window.Modal && Modal.isOpen && Modal.isOpen()){
      // não deixa cliques/propagações durante modal abrirem/trocarem rota por acidente
      const allowed=this.canRoute ? this.canRoute(route) : true;
      return allowed;
    }
    return oldRequire ? oldRequire(route,msg) : true;
  };
})();




/* =========================================================
   ZERO V10.3 — Relatórios somente Administrador e Financeiro
========================================================= */
(function(){
  if(!window.PermissoesPerfil) window.PermissoesPerfil={};
  if(PermissoesPerfil.__relatoriosAdminFinanceiroV103) return;
  PermissoesPerfil.__relatoriosAdminFinanceiroV103=true;

  const baseRoutes={
    admin:[
      'inicio','atendimento','pacientes','prontuario','profissionais',
      'agenda','agendaProcedimentos','financeiro','relatorios','backup',
      'lgpd','auditoria','auditoriaSistema','supabase','storage','configuracoes'
    ],
    medico:[
      'inicio','atendimento','pacientes','prontuario',
      'agenda','agendaProcedimentos'
    ],
    recepcao:[
      'inicio','atendimento','pacientes',
      'agenda','agendaProcedimentos'
    ],
    financeiro:[
      'inicio','financeiro','relatorios'
    ]
  };

  PermissoesPerfil.routesPorPerfilV95=baseRoutes;
  PermissoesPerfil.routesPorPerfilV103=baseRoutes;

  PermissoesPerfil.canRoute=function(route,perfil=''){
    route=String(route||'').trim();
    const p=this.normalizePerfil ? this.normalizePerfil(perfil||this.currentPerfil()) : String(perfil||'admin');
    const allowed=(this.routesPorPerfilV103[p]||this.routesPorPerfilV103.admin);
    return allowed.includes(route);
  };

  setTimeout(()=>PermissoesPerfil.applyMenuVisibility && PermissoesPerfil.applyMenuVisibility(true),80);
})();
