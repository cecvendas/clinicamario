window.Security={
  matrix:{
    admin:['inicio','atendimento','pacientes','prontuario','profissionais','backup','financeiro','relatorios','agenda','agendaProcedimentos','auditoria','auditoriaSistema','supabase','storage','lgpd','configuracoes'],
    administrador:['inicio','atendimento','pacientes','prontuario','profissionais','backup','financeiro','relatorios','agenda','agendaProcedimentos','auditoria','auditoriaSistema','supabase','storage','lgpd','configuracoes'],
    medico:['inicio','atendimento','pacientes','prontuario','agenda','agendaProcedimentos','relatorios'],
    recepcao:['inicio','atendimento','pacientes','agenda','agendaProcedimentos'],
    financeiro:['inicio','financeiro','relatorios']
  },

  currentUser(){
    try{
      return (window.Auth && Auth.current) ||
             window.currentUser ||
             JSON.parse(localStorage.getItem('session')||'{}') ||
             {};
    }catch(e){ return {}; }
  },

  normalizePerfil(perfil){
    let p=String(perfil||'admin').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(p==='administrador') p='admin';
    if(p==='recepcionista') p='recepcao';
    return p || 'admin';
  },

  perfil(){
    return this.normalizePerfil(this.currentUser().perfil || this.currentUser().role || this.currentUser().tipo || 'admin');
  },

  can(resource){
    if(window.PermissoesPerfil && typeof PermissoesPerfil.canRoute==='function'){
      return PermissoesPerfil.canRoute(resource);
    }
    const perfil=this.perfil();
    return (this.matrix[perfil]||this.matrix.admin).includes(resource);
  },

  canAccess(route){
    return this.can(route);
  },

  require(resource,msg='Acesso bloqueado para este perfil.'){
    if(this.can(resource)) return true;
    if(window.Utils?.toast) Utils.toast(msg);
    this.audit('access_denied',`${resource} bloqueado para perfil ${this.perfil()}`);
    return false;
  },

  canProntuario(){
    return this.can('prontuario');
  },

  canRegistrarConsulta(){
    return ['admin','medico'].includes(this.perfil());
  },

  canManageProfessionals(){
    return this.perfil()==='admin';
  },

  audit(action,detail=''){
    try{
      const logs=Store.get('AUDITORIA');
      const u=this.currentUser();
      logs.push({
        id:Utils.id('AUD'),
        dataHora:new Date().toISOString(),
        usuario:u.nome||u.login||u.email||'Sistema',
        perfil:u.perfil||u.role||'',
        acao:action,
        detalhe:detail
      });
      Store.set('AUDITORIA',logs.slice(-1000));
    }catch(e){}
  },

  applyMenu(){
    try{
      if(window.PermissoesPerfil) return PermissoesPerfil.applyMenuVisibility(false);
      document.querySelectorAll('.nav button,[data-route]').forEach(btn=>{
        const r=btn.dataset.route;
        if(!r) return;
        btn.style.display=this.can(r)?'':'none';
      });
    }catch(e){}
  },

  protectRoute(route){
    const rotasProtegidas=['prontuario','profissionais','backup','auditoria','supabase','storage','auditoriaSistema','lgpd','configuracoes','pacientes','atendimento','financeiro','relatorios','agenda','agendaProcedimentos'];
    if(rotasProtegidas.includes(route)) return this.require(route,'Seu perfil não tem acesso a este menu.');
    return true;
  }
};

/* ZERO V8.7 — Security limpo para corrigir travamento dos módulos */
(function(){
  if(window.Security) Security.__cleanV87=true;
})();




/* ZERO V9.5 — Security usa menus por perfil */
(function(){
  if(!window.Security) window.Security={};
  if(Security.__menusPorPerfilV95) return;
  Security.__menusPorPerfilV95=true;

  Security.canAccess=function(route){
    if(window.PermissoesPerfil) return PermissoesPerfil.canRoute(route);
    return true;
  };

  Security.can=function(route){
    return this.canAccess(route);
  };

  Security.require=function(route,msg){
    if(this.canAccess(route)) return true;
    try{ this.audit && this.audit('acesso_bloqueado','Rota: '+route); }catch(e){}
    if(window.Utils?.toast) Utils.toast(msg || 'Seu perfil não tem permissão para acessar esta área.');
    return false;
  };

  Security.applyMenu=function(){
    if(window.PermissoesPerfil) return PermissoesPerfil.applyMenuVisibility(true);
  };
})();




/* ZERO V10.3 — Security Relatórios admin/financeiro */
(function(){
  if(!window.Security) window.Security={};
  if(Security.__relatoriosAdminFinanceiroV103) return;
  Security.__relatoriosAdminFinanceiroV103=true;

  Security.canAccess=function(route){
    if(window.PermissoesPerfil) return PermissoesPerfil.canRoute(route);
    return true;
  };
  Security.can=function(route){return this.canAccess(route);};
})();
