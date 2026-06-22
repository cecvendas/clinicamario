window.Router={
  route:'inicio',

  go(r){
    if(window.Security && !Security.protectRoute(r)) return;
    this.route=r;
    document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.route===r));
    const map={
      inicio:['Início','Resumo geral'],
      pacientes:['Pacientes','Cadastro, busca e prontuário'],
      profissionais:['Profissionais','Cadastro e conselho profissional'],
      prontuario:['Prontuário','Histórico do paciente'],
      financeiro:['Financeiro','Controle financeiro da clínica'], relatorios:['Relatórios','Relatórios gerenciais da clínica'], agenda:['Agenda Médica','Consultas médicas'], agendaProcedimentos:['Agenda Procedimentos','Agenda separada de procedimentos'], backup:['Backup / Importação','Exportar e importar dados'], atendimento:['Fila / Atendimento','Pacientes presentes aguardando atendimento hoje.'], auditoria:['Logs / Auditoria','Registro de acessos, bloqueios e ações do sistema'], supabase:['Supabase','Configuração e preparação para nuvem'], auditoriaSistema:['Auditoria Sistema','Verificação de segurança, perfis e proteções'], storage:['Storage / Supabase','Arquivos em Supabase/R2'], lgpd:['LGPD / Segurança','Controles offline de privacidade'], configuracoes:['Configurações','Dados da clínica e cabeçalho das impressões']
    };
    document.getElementById('page-title').textContent=map[r]?.[0]||r;
    document.getElementById('page-subtitle').textContent=map[r]?.[1]||'';

    if(r==='inicio')App.renderInicio();
    if(r==='pacientes')Pacientes.render();
    if(r==='profissionais')Profissionais.render();
    if(r==='prontuario')Prontuario.renderBusca();
    if(r==='financeiro')Financeiro.render();
    if(r==='relatorios')Relatorios.render();
    if(r==='agenda')AgendaMedica.renderConsultaRoute();
    if(r==='agendaProcedimentos')AgendaMedica.renderProcedimentosRoute();
    if(r==='storage')ClinicaStorage.renderConfig();
    if(r==='lgpd')LGPDOffline.render();
    if(r==='backup')Backup.render();
    if(r==='atendimento')App.renderAtendimento();
    if(r==='auditoria')Auditoria.render();
    if(r==='supabase')SupabaseConfig.render();
    if(r==='auditoriaSistema')AuditoriaSistema.render();
    if(r==='configuracoes')Configuracoes.render();

    setTimeout(()=>{this.applySidebarSize(); if(window.Security) Security.applyMenu();},30);
  },

  applySidebarSize(){
    const sb=document.getElementById('sidebar');
    if(!sb) return;

    const collapsed=sb.classList.contains('collapsed');
    const w=collapsed?'76px':'260px';

    sb.classList.add('cm-sidebar');
    sb.style.setProperty('width',w,'important');
    sb.style.setProperty('min-width',w,'important');
    sb.style.setProperty('max-width',w,'important');
    sb.style.setProperty('flex-basis',w,'important');
    sb.style.setProperty('flex-grow','0','important');
    sb.style.setProperty('flex-shrink','0','important');
    sb.style.setProperty('overflow','hidden','important');

    sb.querySelectorAll('.nav span').forEach(s=>{
      s.style.setProperty('display',collapsed?'none':'','important');
    });

    sb.querySelectorAll('.nav button').forEach(b=>{
      b.style.setProperty('justify-content',collapsed?'center':'','important');
      b.style.setProperty('padding-left',collapsed?'8px':'','important');
      b.style.setProperty('padding-right',collapsed?'8px':'','important');
      b.style.setProperty('gap',collapsed?'0':'10px','important');
    });
  },

  toggleSidebar(){
    const sb=document.getElementById('sidebar');
    if(!sb) return;
    sb.classList.toggle('collapsed');
    this.applySidebarSize();
  }
};

document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>Router.applySidebarSize(),100));


/* ZERO V4.9 — garante menu lateral fixo após navegação */
(function(){
  if(!window.Router || Router.__menuFixoV49) return;
  Router.__menuFixoV49=true;

  Router.fixarMenuLateral=function(){
    const sidebar=document.querySelector('.sidebar,.cm-sidebar,#sidebar,aside');
    const main=document.querySelector('main,.main,.content-wrap,#main,.app-content');
    const app=document.getElementById('app') || document.querySelector('.app,.layout,.app-shell,.main-layout');

    if(app){
      app.style.height='100vh';
      app.style.minHeight='100vh';
      app.style.overflow='hidden';
      app.style.display='flex';
    }

    if(sidebar){
      sidebar.style.height='100vh';
      sidebar.style.maxHeight='100vh';
      sidebar.style.overflow='hidden';
      sidebar.style.display='flex';
      sidebar.style.flexDirection='column';

      const nav=sidebar.querySelector('nav,.nav');
      if(nav){
        nav.style.flex='1 1 auto';
        nav.style.minHeight='0';
        nav.style.overflowY='auto';
        nav.style.overflowX='hidden';
      }
    }

    if(main){
      main.style.height='100vh';
      main.style.maxHeight='100vh';
      main.style.overflowY='auto';
      main.style.overflowX='hidden';
      main.style.flex='1 1 auto';
      main.style.minWidth='0';
    }

    document.body.style.overflow='hidden';
  };

  const oldGo=Router.go.bind(Router);
  Router.go=function(r){
    const ret=oldGo(r);
    setTimeout(()=>Router.fixarMenuLateral(),40);
    return ret;
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>Router.fixarMenuLateral(),80));
})();




/* =========================================================
   ZERO V5.5 — Respiro de rodapé global em todos os menus
========================================================= */
(function(){
  if(!window.Router || Router.__respiroGlobalV55) return;
  Router.__respiroGlobalV55=true;

  Router.aplicarRespiroGlobal=function(){
    const content=document.getElementById('content');
    if(!content) return;

    let spacer=document.getElementById('global-bottom-space');
    if(!spacer){
      spacer=document.createElement('div');
      spacer.id='global-bottom-space';
      spacer.className='global-bottom-space';
      content.appendChild(spacer);
    }else{
      content.appendChild(spacer);
    }

    const main=document.querySelector('main,.main,.content-wrap,#main,.app-content');
    if(main){
      main.style.scrollPaddingBottom='150px';
    }
  };

  const oldGoV55=Router.go.bind(Router);
  Router.go=function(r){
    const ret=oldGoV55(r);
    setTimeout(()=>Router.aplicarRespiroGlobal(),60);
    return ret;
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>Router.aplicarRespiroGlobal(),120));
})();




/* =========================================================
   ZERO V7.5 — Garante barra de navegação no menu lateral
========================================================= */
(function(){
  if(window.__MenuLateralScrollV75) return;
  window.__MenuLateralScrollV75=true;

  function aplicarMenuLateralScroll(){
    const sidebar=document.querySelector('.sidebar,.cm-sidebar,#sidebar,aside');
    if(!sidebar) return;

    let nav=sidebar.querySelector('nav,.nav,.nav-menu,.menu-lateral,.side-menu');

    /* Se não existir nav explícito, cria comportamento no bloco que contém os botões */
    if(!nav){
      const buttons=Array.from(sidebar.querySelectorAll('button[data-route],a[data-route],button'));
      if(buttons.length){
        nav=buttons[0].parentElement;
        if(nav) nav.classList.add('side-menu');
      }
    }

    sidebar.style.height='100vh';
    sidebar.style.maxHeight='100vh';
    sidebar.style.overflow='hidden';
    sidebar.style.display='flex';
    sidebar.style.flexDirection='column';
    sidebar.style.position='sticky';
    sidebar.style.top='0';

    if(nav){
      nav.style.flex='1 1 auto';
      nav.style.minHeight='0';
      nav.style.overflowY='auto';
      nav.style.overflowX='hidden';
      nav.style.paddingRight='6px';
      nav.style.scrollbarWidth='auto';
    }
  }

  const oldGo=window.Router && Router.go ? Router.go.bind(Router) : null;
  if(oldGo && !Router.__menuScrollPatchedV75){
    Router.__menuScrollPatchedV75=true;
    Router.go=function(r){
      const ret=oldGo(r);
      setTimeout(aplicarMenuLateralScroll,30);
      return ret;
    };
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(aplicarMenuLateralScroll,80));
  setTimeout(aplicarMenuLateralScroll,120);
})();




/* =========================================================
   ZERO V7.6 — Força rolagem no menu lateral inteiro
========================================================= */
(function(){
  if(window.__MenuLateralScrollV76) return;
  window.__MenuLateralScrollV76=true;

  function aplicarScrollSidebarInteiro(){
    const sidebars=document.querySelectorAll('.sidebar,.cm-sidebar,#sidebar,aside.sidebar,aside.cm-sidebar,aside');
    sidebars.forEach(sidebar=>{
      sidebar.style.height='100vh';
      sidebar.style.maxHeight='100vh';
      sidebar.style.minHeight='100vh';
      sidebar.style.overflowY='auto';
      sidebar.style.overflowX='hidden';
      sidebar.style.position='sticky';
      sidebar.style.top='0';
      sidebar.style.display='block';
      sidebar.style.paddingBottom='28px';
      sidebar.style.scrollbarWidth='auto';

      sidebar.querySelectorAll('nav,.nav,.nav-menu,.menu-lateral,.side-menu').forEach(nav=>{
        nav.style.overflow='visible';
        nav.style.maxHeight='none';
        nav.style.height='auto';
        nav.style.minHeight='auto';
        nav.style.flex='none';
      });

      sidebar.querySelectorAll('.cm-logout-area,.sidebar-footer,.menu-footer,.logout-area').forEach(foot=>{
        foot.style.position='static';
        foot.style.marginTop='18px';
        foot.style.paddingBottom='22px';
        foot.style.flex='none';
      });
    });

    const main=document.querySelector('main,.main,.content-wrap,#main,.app-content');
    if(main){
      main.style.height='100vh';
      main.style.maxHeight='100vh';
      main.style.overflowY='auto';
      main.style.overflowX='hidden';
    }

    const app=document.getElementById('app') || document.querySelector('.app,.layout,.app-shell,.main-layout');
    if(app){
      app.style.height='100vh';
      app.style.maxHeight='100vh';
      app.style.overflow='hidden';
    }

    document.body.style.overflow='hidden';
  }

  const oldGo = window.Router && Router.go ? Router.go.bind(Router) : null;
  if(oldGo && !Router.__menuScrollInteiroPatchedV76){
    Router.__menuScrollInteiroPatchedV76=true;
    Router.go=function(r){
      const ret=oldGo(r);
      setTimeout(aplicarScrollSidebarInteiro,30);
      setTimeout(aplicarScrollSidebarInteiro,180);
      return ret;
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(aplicarScrollSidebarInteiro,50);
    setTimeout(aplicarScrollSidebarInteiro,250);
  });

  setTimeout(aplicarScrollSidebarInteiro,80);
  setTimeout(aplicarScrollSidebarInteiro,300);
})();




/* =========================================================
   ZERO V7.7 — Scroll do menu lateral colapsado
   Cria/garante uma área de scroll para os ícones, mantendo o logout acessível.
========================================================= */
(function(){
  if(window.__MenuLateralScrollV77) return;
  window.__MenuLateralScrollV77=true;

  function isLogoutEl(el){
    const t=(el.innerText||el.title||el.getAttribute('aria-label')||'').toLowerCase();
    const html=(el.outerHTML||'').toLowerCase();
    return t.includes('sair') || t.includes('logout') || html.includes('logout') || html.includes('sair');
  }

  function isHamburgerEl(el){
    const t=(el.innerText||el.title||el.getAttribute('aria-label')||'').toLowerCase().trim();
    return t==='☰' || t==='☷' || t==='≡' || t.includes('menu') || el.className.toString().toLowerCase().includes('toggle');
  }

  function aplicar(){
    const sidebar=document.querySelector('.sidebar,.cm-sidebar,#sidebar,aside.sidebar,aside.cm-sidebar,.app-sidebar,.side,aside');
    if(!sidebar) return;

    sidebar.style.height='100vh';
    sidebar.style.maxHeight='100vh';
    sidebar.style.minHeight='100vh';
    sidebar.style.overflow='hidden';
    sidebar.style.display='flex';
    sidebar.style.flexDirection='column';
    sidebar.style.position='sticky';
    sidebar.style.top='0';

    let nav=sidebar.querySelector('nav,.nav,.nav-menu,.menu-lateral,.side-menu,.sidebar-menu,.menu-items,.menu');

    // Se não houver nav real, cria um wrapper de scroll e move só botões/links de rota para dentro.
    if(!nav){
      let existing=sidebar.querySelector('.cm-menu-scroll-v77');
      if(existing){
        nav=existing;
      }else{
        const items=Array.from(sidebar.children);
        const scroll=document.createElement('div');
        scroll.className='cm-menu-scroll-v77';

        const toMove=[];
        items.forEach(child=>{
          const hasRoute=child.matches?.('button[data-route],a[data-route]') || child.querySelector?.('button[data-route],a[data-route]');
          const isLogout=isLogoutEl(child);
          const isHamb=isHamburgerEl(child);
          if(hasRoute && !isLogout && !isHamb) toMove.push(child);
        });

        if(toMove.length){
          sidebar.insertBefore(scroll, toMove[0]);
          toMove.forEach(el=>scroll.appendChild(el));
          nav=scroll;
        }
      }
    }

    if(nav){
      nav.classList.add('cm-menu-scroll-v77');
      nav.style.flex='1 1 auto';
      nav.style.minHeight='0';
      nav.style.overflowY='auto';
      nav.style.overflowX='hidden';
      nav.style.paddingRight='5px';
      nav.style.paddingBottom='18px';
      nav.style.scrollbarWidth='thin';
    }

    // Encontra logout e deixa fora do scroll, no final fixo e acessível.
    const all=Array.from(sidebar.querySelectorAll('button,a,div'));
    const logout=all.find(isLogoutEl);
    if(logout){
      let logoutWrap=logout.closest('.cm-logout-area,.sidebar-footer,.menu-footer,.logout-area') || logout.parentElement;
      if(logoutWrap && logoutWrap !== sidebar && logoutWrap.parentElement !== sidebar && !logoutWrap.matches('nav,.nav,.cm-menu-scroll-v77')){
        logoutWrap=logout;
      }

      if(logoutWrap && logoutWrap !== sidebar){
        logoutWrap.classList.add('cm-logout-area');
        if(logoutWrap.parentElement !== sidebar){
          sidebar.appendChild(logoutWrap);
        }else{
          sidebar.appendChild(logoutWrap);
        }
        logoutWrap.style.flex='0 0 auto';
        logoutWrap.style.position='static';
        logoutWrap.style.marginTop='8px';
        logoutWrap.style.paddingTop='8px';
        logoutWrap.style.paddingBottom='10px';
      }
    }

    // Área principal independente
    const main=document.querySelector('main,.main,.content-wrap,#main,.app-content,.content,#content-wrapper');
    if(main){
      main.style.height='100vh';
      main.style.maxHeight='100vh';
      main.style.overflowY='auto';
      main.style.overflowX='hidden';
    }

    const app=document.getElementById('app') || document.querySelector('.app,.layout,.app-shell,.main-layout');
    if(app){
      app.style.height='100vh';
      app.style.maxHeight='100vh';
      app.style.overflow='hidden';
    }

    document.documentElement.style.height='100%';
    document.body.style.height='100%';
    document.body.style.overflow='hidden';
  }

  const oldGo=window.Router && Router.go ? Router.go.bind(Router) : null;
  if(oldGo && !Router.__menuScrollV77){
    Router.__menuScrollV77=true;
    Router.go=function(r){
      const ret=oldGo(r);
      setTimeout(aplicar,20);
      setTimeout(aplicar,150);
      return ret;
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(aplicar,40);
    setTimeout(aplicar,200);
    setTimeout(aplicar,600);
  });

  window.addEventListener('resize',()=>setTimeout(aplicar,40));

  // Reaplica quando o menu colapsa/expande ou após login.
  const obs=new MutationObserver(()=>setTimeout(aplicar,30));
  document.addEventListener('DOMContentLoaded',()=>{
    const app=document.body;
    if(app) obs.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  });

  setTimeout(aplicar,60);
  setTimeout(aplicar,250);
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


/* ZERO V8.0 — perfis profissionais */
(function(){
  if(!window.Profissionais || Profissionais.__perfisV80) return;
  Profissionais.__perfisV80=true;

  Profissionais.perfisDisponiveis = [
    ['admin','Administrador'],
    ['medico','Médico'],
    ['recepcao','Recepção'],
    ['financeiro','Financeiro']
  ];

  Profissionais.aplicarSelectPerfis = function(){
    const selects=[...document.querySelectorAll('select')].filter(s=>{
      const id=(s.id||'').toLowerCase();
      const name=(s.name||'').toLowerCase();
      const label=(s.closest('.f-col,div')?.innerText||'').toLowerCase();
      return id.includes('perfil') || name.includes('perfil') || label.includes('perfil');
    });

    selects.forEach(sel=>{
      const atual=sel.value || 'medico';
      sel.innerHTML=this.perfisDisponiveis.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
      sel.value=['admin','medico','recepcao','financeiro'].includes(atual) ? atual : 'medico';
    });
  };

  ['modal','modalProfissional','editar','novo','abrirModal'].forEach(fn=>{
    if(typeof Profissionais[fn]==='function' && !Profissionais[fn].__perfilPatch){
      const old=Profissionais[fn].bind(Profissionais);
      Profissionais[fn]=function(){
        const ret=old(...arguments);
        setTimeout(()=>Profissionais.aplicarSelectPerfis(),60);
        return ret;
      };
      Profissionais[fn].__perfilPatch=true;
    }
  });

  document.addEventListener('click',()=>setTimeout(()=>Profissionais.aplicarSelectPerfis(),80),true);
})();


/* ZERO V8.1 — Estabilização global de menus */
(function(){
  if(window.__MenusEstaveisV81) return;
  window.__MenusEstaveisV81=true;

  function estabilizar(){
    try{
      if(window.PermissoesPerfil) PermissoesPerfil.applyMenuVisibility(false);
      if(window.LGPDOffline?.removerAvisoPaciente) LGPDOffline.removerAvisoPaciente();
    }catch(e){}
  }

  const oldGo = window.Router && Router.go ? Router.go.bind(Router) : null;
  if(oldGo && !Router.__menusEstaveisV81){
    Router.__menusEstaveisV81=true;
    Router.go=function(r){
      const ret=oldGo(r);
      requestAnimationFrame(estabilizar);
      return ret;
    };
  }

  document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(estabilizar));
})();




/* =========================================================
   ZERO V8.5 — Rota estável para Pacientes / Backup / Storage
========================================================= */
(function(){
  if(!window.Router || Router.__rotasCriticasV85) return;
  Router.__rotasCriticasV85=true;

  const oldGo=Router.go.bind(Router);

  Router.go=function(route){
    // Corrige storage mesmo se algum onclick antigo passou string escapada
    route=String(route||'').replace(/\\'/g,'').replace(/'/g,'').trim();

    // Permissão direta para rotas críticas conforme perfil.
    if(window.PermissoesPerfil && !PermissoesPerfil.canRoute(route)){
      Utils.toast('Seu perfil não tem permissão para acessar este menu.');
      try{ LGPDOffline?.audit('acesso_bloqueado_rota','Tentou acessar '+route); }catch(e){}
      return;
    }

    const ret=oldGo(route);

    // Garante render se algum wrapper antigo não chamou o módulo
    setTimeout(()=>{
      if(route==='pacientes' && window.Pacientes && document.getElementById('content')){
        const txt=document.getElementById('content').innerText||'';
        if(!txt.includes('Paciente') && typeof Pacientes.render==='function') Pacientes.render();
      }

      if(route==='backup' && window.Backup && typeof Backup.render==='function'){
        const txt=document.getElementById('content')?.innerText||'';
        if(!txt.includes('Exportar backup')) Backup.render();
      }

      if(route==='storage' && window.ClinicaStorage && typeof ClinicaStorage.renderConfig==='function'){
        const txt=document.getElementById('content')?.innerText||'';
        if(!txt.includes('Storage / Supabase')) ClinicaStorage.renderConfig();
      }

      if(window.PermissoesPerfil) PermissoesPerfil.applyMenuVisibility(false);
    },40);

    return ret;
  };
})();




/* =========================================================
   ZERO V8.6 — Conteúdo das rotas Pacientes / Storage
   Correção:
   - Algumas rotas abriam só o cabeçalho porque o router original
     trocava o título, mas não chamava o render do módulo.
   - Agora, para pacientes e storage, o render do módulo é chamado
     diretamente e sempre.
========================================================= */
(function(){
  if(!window.Router || Router.__conteudoRotasV86) return;
  Router.__conteudoRotasV86=true;

  const oldGo=Router.go.bind(Router);

  Router.go=function(route){
    route=String(route||'').replace(/\\'/g,'').replace(/'/g,'').trim();

    if(window.PermissoesPerfil && !PermissoesPerfil.canRoute(route)){
      Utils.toast('Seu perfil não tem permissão para acessar este menu.');
      try{ LGPDOffline?.audit('acesso_bloqueado_rota','Tentou acessar '+route); }catch(e){}
      return;
    }

    // Pacientes: força render real do módulo
    if(route==='pacientes'){
      this.current='pacientes';
      try{
        document.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-route')==='pacientes'));
      }catch(e){}

      if(window.Pacientes && typeof Pacientes.render==='function'){
        Pacientes.render();
      }else if(window.Pacientes && typeof Pacientes.lista==='function'){
        Pacientes.lista();
      }else{
        document.getElementById('content').innerHTML='<div class="card"><h3>Pacientes</h3><p>Módulo de pacientes não encontrado.</p></div>';
      }

      setTimeout(()=>window.PermissoesPerfil?.applyMenuVisibility(false),20);
      return;
    }

    // Storage: força render real da configuração storage
    if(route==='storage'){
      this.current='storage';
      try{
        document.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-route')==='storage'));
      }catch(e){}

      if(window.ClinicaStorage && typeof ClinicaStorage.renderConfig==='function'){
        ClinicaStorage.renderConfig();
      }else{
        document.getElementById('content').innerHTML='<div class="card"><h3>Storage / Supabase</h3><p>Módulo Storage não carregado.</p></div>';
      }

      setTimeout(()=>window.PermissoesPerfil?.applyMenuVisibility(false),20);
      return;
    }

    const ret=oldGo(route);

    setTimeout(()=>{
      if(route==='backup' && window.Backup && typeof Backup.render==='function'){
        const txt=document.getElementById('content')?.innerText||'';
        if(!txt.includes('Exportar backup ZIP')) Backup.render();
      }
      if(window.PermissoesPerfil) PermissoesPerfil.applyMenuVisibility(false);
    },40);

    return ret;
  };
})();




/* =========================================================
   ZERO V8.7 — Rotas Pacientes / Storage após corrigir módulos
========================================================= */
(function(){
  if(!window.Router || Router.__fixModulosV87) return;
  Router.__fixModulosV87=true;

  const oldGo=Router.go.bind(Router);

  Router.go=function(route){
    route=String(route||'').replace(/\\'/g,'').replace(/'/g,'').trim();

    if(window.PermissoesPerfil && !PermissoesPerfil.canRoute(route)){
      Utils.toast('Seu perfil não tem permissão para acessar este menu.');
      try{ LGPDOffline?.audit('acesso_bloqueado_rota','Tentou acessar '+route); }catch(e){}
      return;
    }

    if(route==='pacientes'){
      this.current='pacientes';
      document.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-route')==='pacientes'));
      if(window.Pacientes && typeof Pacientes.render==='function') Pacientes.render();
      else document.getElementById('content').innerHTML='<div class="card"><h3>Pacientes</h3><p>O módulo ainda está carregando. Atualize a página e tente novamente.</p></div>';
      setTimeout(()=>window.PermissoesPerfil?.applyMenuVisibility(false),30);
      return;
    }

    if(route==='storage'){
      this.current='storage';
      document.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-route')==='storage'));
      if(window.ClinicaStorage && typeof ClinicaStorage.renderConfig==='function') ClinicaStorage.renderConfig();
      else document.getElementById('content').innerHTML='<div class="card"><h3>Storage / Supabase</h3><p>O módulo ainda está carregando. Atualize a página e tente novamente.</p></div>';
      setTimeout(()=>window.PermissoesPerfil?.applyMenuVisibility(false),30);
      return;
    }

    return oldGo(route);
  };
})();




/* =========================================================
   ZERO V9.9 — Router consciente de modal
   Evita que perfil médico/recepção/financeiro re-renderize a tela por trás
   durante abertura de modal, causando piscada.
========================================================= */
(function(){
  if(!window.Router || Router.__modalAwareV99) return;
  Router.__modalAwareV99=true;

  const oldGo=Router.go.bind(Router);
  Router.go=function(route){
    route=String(route||'').replace(/\\'/g,'').replace(/'/g,'').trim();

    if(window.Modal && Modal.isOpen && Modal.isOpen()){
      const freezeUntil=window.__CM_MODAL_FREEZE_UNTIL__||0;
      if(Date.now()<freezeUntil && route===this.current){
        return false;
      }
    }

    const ret=oldGo(route);
    requestAnimationFrame(()=>{
      try{
        if(!(window.Modal && Modal.isOpen && Modal.isOpen())){
          window.PermissoesPerfil?.applyMenuVisibility(false);
        }
      }catch(e){}
    });
    return ret;
  };
})();




/* =========================================================
   ZERO V18.5 — Acesso aos menus corrigido
   Correções:
   - Um erro em um menu não trava mais os outros.
   - Se o conteúdo ficar vazio, renderiza fallback seguro.
   - Clique nos botões do menu lateral é reforçado por listener direto.
========================================================= */
(function(){
  if(!window.Router || Router.__menusAcessoCorrigidoV185) return;
  Router.__menusAcessoCorrigidoV185=true;

  Router.titulosV185={
    inicio:['Início','Sistema limpo reconstruído por módulos'],
    atendimento:['Fila / Atendimento','Pacientes presentes aguardando atendimento hoje.'],
    financeiro:['Financeiro','Controle financeiro da clínica'],
    relatorios:['Relatórios','Relatórios gerenciais da clínica'],
    agenda:['Agenda Médica','Consultas médicas'],
    agendaProcedimentos:['Agenda Procedimentos','Agenda separada de procedimentos'],
    pacientes:['Pacientes','Cadastro, busca e prontuário'],
    profissionais:['Profissionais','Cadastro e conselho profissional'],
    backup:['Backup / Importação','Exportar e importar dados'],
    storage:['Storage / Supabase','Arquivos em Supabase/R2'],
    lgpd:['LGPD / Segurança','Controles offline de privacidade'],
    auditoria:['Logs / Auditoria','Registro de acessos, bloqueios e ações do sistema'],
    auditoriaSistema:['Auditoria Sistema','Verificação de segurança, perfis e proteções'],
    supabase:['Supabase','Configuração e preparação para nuvem'],
    configuracoes:['Configurações','Dados da clínica e cabeçalho das impressões'],
    prontuario:['Prontuário','Histórico do paciente']
  };

  Router.setTituloV185=function(route){
    const t=this.titulosV185[route]||[route,''];
    const title=document.getElementById('page-title');
    const sub=document.getElementById('page-subtitle');
    if(title) title.textContent=t[0];
    if(sub) sub.textContent=t[1];
  };

  Router.setActiveV185=function(route){
    document.querySelectorAll('[data-route]').forEach(b=>{
      b.classList.toggle('active',String(b.getAttribute('data-route'))===String(route));
    });
  };

  Router.renderFallbackV185=function(route,msg=''){
    const content=document.getElementById('content');
    if(!content) return;
    const titulo=(this.titulosV185[route]||[route])[0]||route;
    content.innerHTML=`<div class="card menu-fallback-v185">
      <h3>${Utils.esc(titulo)}</h3>
      <p>${Utils.esc(msg||'Menu carregado. Se o conteúdo não aparecer, atualize a página e tente novamente.')}</p>
    </div>`;
  };

  Router.renderRouteV185=function(route){
    const content=document.getElementById('content');
    if(content) content.innerHTML='';

    if(route==='inicio') return App.renderInicio();
    if(route==='atendimento') return App.renderAtendimento();
    if(route==='financeiro') return Financeiro.render();
    if(route==='relatorios') return Relatorios.render();
    if(route==='agenda') return AgendaMedica.renderConsultaRoute();
    if(route==='agendaProcedimentos') return AgendaMedica.renderProcedimentosRoute();
    if(route==='pacientes') return Pacientes.render();
    if(route==='profissionais') return Profissionais.render();
    if(route==='backup') return Backup.render();
    if(route==='storage') return ClinicaStorage.renderConfig();
    if(route==='lgpd') return LGPDOffline.render();
    if(route==='auditoria') return Auditoria.render();
    if(route==='auditoriaSistema') return AuditoriaSistema.render();
    if(route==='supabase') return SupabaseConfig.render();
    if(route==='configuracoes') return Configuracoes.render();
    if(route==='prontuario') return Prontuario.renderBusca();

    return this.renderFallbackV185(route,'Menu não encontrado.');
  };

  Router.go=function(route){
    route=String(route||'inicio').replace(/\\'/g,'').replace(/'/g,'').trim()||'inicio';

    try{
      if(window.PermissoesPerfil && !PermissoesPerfil.canRoute(route)){
        Utils.toast('Seu perfil não tem permissão para acessar este menu.');
        return false;
      }
    }catch(e){}

    this.route=route;
    this.current=route;
    this.setTituloV185(route);
    this.setActiveV185(route);

    try{
      this.renderRouteV185(route);
    }catch(e){
      console.error('Erro ao abrir menu '+route,e);
      this.renderFallbackV185(route,'O menu encontrou um erro de carregamento, mas o sistema continua acessível.');
    }

    setTimeout(()=>{
      try{
        const content=document.getElementById('content');
        if(content && !String(content.innerHTML||'').trim()){
          if(route==='inicio' && window.App?.renderInicioSeguroV185) App.renderInicioSeguroV185();
          else this.renderFallbackV185(route);
        }
      }catch(e){}
      try{ this.applySidebarSize && this.applySidebarSize(); }catch(e){}
      try{ window.Security?.applyMenu && Security.applyMenu(); }catch(e){}
      try{ window.PermissoesPerfil?.applyMenuVisibility && PermissoesPerfil.applyMenuVisibility(false); }catch(e){}
    },80);

    return true;
  };

  document.addEventListener('click',function(ev){
    const btn=ev.target && ev.target.closest ? ev.target.closest('[data-route]') : null;
    if(!btn) return;
    const route=btn.getAttribute('data-route');
    if(!route) return;
    ev.preventDefault();
    ev.stopPropagation();
    try{ Router.go(route); }catch(e){ console.error(e); }
    return false;
  },true);

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{
      const content=document.getElementById('content');
      if(content && !String(content.innerHTML||'').trim() && window.Auth?.current){
        Router.go(Router.current||Router.route||'inicio');
      }
    },350);
  });
})();
