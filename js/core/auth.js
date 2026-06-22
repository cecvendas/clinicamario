window.Auth={
  current:null,

  init(){
    Store.seed();

    let users = Store.get('USUARIOS');
    if(!users.find(u => String(u.login).toLowerCase() === 'admin')){
      users.push({
        id:'U001',
        login:'admin',
        senha:'admin',
        nome:'Administrador',
        perfil:'admin'
      });
      Store.set('USUARIOS', users);
    }

    const s=sessionStorage.getItem('CM_USER');
    if(s){
      try{
        this.current=JSON.parse(s);
        this.showApp();
        return;
      }catch(e){
        sessionStorage.removeItem('CM_USER');
      }
    }

    this.showLogin();
  },

  login(ev){
    if(ev && ev.preventDefault) ev.preventDefault();

    const u = String((document.getElementById('lu') || document.getElementById('login-user'))?.value || '').trim();
    const p = String((document.getElementById('lp') || document.getElementById('login-pass'))?.value || '').trim();

    if(!u || !p){
      Utils.toast('Informe usuário e senha.');
      return false;
    }

    let users = Store.get('USUARIOS');
    let user = users.find(x =>
      String(x.login || x.usuario || x.email || '').toLowerCase() === u.toLowerCase() &&
      String(x.senha || x.password || '') === p
    );

    if(!user && u.toLowerCase() === 'admin' && p === 'admin'){
      user = {
        id:'U001',
        login:'admin',
        senha:'admin',
        nome:'Administrador',
        perfil:'admin'
      };
      Store.upsert('USUARIOS', user);
    }

    if(!user){
      Utils.toast('Login ou senha incorretos.');
      return false;
    }

    this.current=user;
    sessionStorage.setItem('CM_USER',JSON.stringify(user));
    this.showApp();
    return false;
  },

  logout(){
    sessionStorage.removeItem('CM_USER');
    location.reload();
  },

  showLogin(){
    const login = document.getElementById('login-page');
    const app = document.getElementById('app-shell');

    if(login){
      login.classList.remove('hidden');
      login.style.display='flex';
    }

    if(app){
      app.classList.add('hidden');
      app.classList.add('app-hidden');
      app.style.display='none';
    }
  },

  showApp(){
    const login = document.getElementById('login-page');
    const app = document.getElementById('app-shell');

    if(login){
      login.classList.add('hidden');
      login.style.display='none';
    }

    if(app){
      app.classList.remove('hidden');
      app.classList.remove('app-hidden');
      app.style.display='flex';
    }

    const label = document.getElementById('user-label');
    if(label) label.textContent=this.current.nome||this.current.login||'Usuário';

    Router.go('inicio');
  }
};

window.doLogin = function(ev){ return Auth.login(ev); };
window.login = function(ev){ return Auth.login(ev); };
window.entrar = function(ev){ return Auth.login(ev); };
window.fazerLogin = function(ev){ return Auth.login(ev); };
window.validarLogin = function(ev){ return Auth.login(ev); };


/* ZERO V3.1 — auditoria e perfis */
(function(){
  if(!window.Auth || Auth.__perfilProtegido) return;
  Auth.__perfilProtegido=true;

  const oldShowApp=Auth.showApp.bind(Auth);
  Auth.showApp=function(){
    oldShowApp();
    if(window.Security){
      Security.audit('login','Login no sistema');
      setTimeout(()=>Security.applyMenu(),80);
    }
  };

  const oldLogout=Auth.logout.bind(Auth);
  Auth.logout=function(){
    if(window.Security) Security.audit('logout','Logout do sistema');
    return oldLogout();
  };
})();




/* =========================================================
   ZERO V3.8 — Botão Sair / Logout original
========================================================= */
(function(){
  if(!window.Auth) return;

  Auth.logout = function(){
    try{
      if(window.Security) Security.audit('logout','Logout pelo botão Sair');
    }catch(e){}

    try{
      localStorage.removeItem('CM_AUTH');
      localStorage.removeItem('AUTH_USER');
      localStorage.removeItem('currentUser');
      sessionStorage.clear();
    }catch(e){}

    Auth.current=null;

    const app=document.getElementById('app');
    const login=document.getElementById('login-screen') || document.getElementById('loginScreen') || document.querySelector('.login-screen');

    if(app) app.style.display='none';
    if(login) login.style.display='flex';

    if(typeof Auth.showLogin==='function'){
      try{ Auth.showLogin(); }catch(e){}
    }

    Utils.toast('Sessão encerrada.');
  };
})();




/* =========================================================
   ZERO V9.1 — Botão Sair corrigido
   - Limpa todos os dados de sessão usados pelas versões anteriores.
   - Não apaga dados da clínica/localStorage de cadastro.
   - Fecha modal aberto.
   - Volta para a tela de login sem depender de reload.
   - Também funciona se clicar em qualquer botão com texto Sair/Logout.
========================================================= */
(function(){
  if(!window.Auth || Auth.__logoutFixV91) return;
  Auth.__logoutFixV91=true;

  Auth.logout = function(){
    try{
      if(window.Security && Security.audit) Security.audit('logout','Logout pelo botão Sair');
      if(window.LGPDOffline && LGPDOffline.audit) LGPDOffline.audit('logout','Logout pelo botão Sair');
    }catch(e){}

    try{
      sessionStorage.removeItem('CM_USER');
      sessionStorage.removeItem('AUTH_USER');
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('usuarioLogado');
      sessionStorage.removeItem('session');
      sessionStorage.clear();

      localStorage.removeItem('CM_AUTH');
      localStorage.removeItem('AUTH_USER');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('session');
    }catch(e){}

    try{
      window.currentUser=null;
      Auth.current=null;
    }catch(e){}

    try{
      if(window.Modal && Modal.close) Modal.close();
    }catch(e){}

    const login =
      document.getElementById('login-page') ||
      document.getElementById('login-screen') ||
      document.getElementById('loginScreen') ||
      document.querySelector('.login-page,.login-screen');

    const app =
      document.getElementById('app-shell') ||
      document.getElementById('app') ||
      document.querySelector('.app-shell,.app,.layout');

    if(app){
      app.classList.add('hidden');
      app.classList.add('app-hidden');
      app.style.display='none';
    }

    if(login){
      login.classList.remove('hidden');
      login.classList.remove('app-hidden');
      login.style.display='flex';
    }

    const lu=document.getElementById('lu') || document.getElementById('login-user');
    const lp=document.getElementById('lp') || document.getElementById('login-pass');
    if(lu) lu.value='';
    if(lp) lp.value='';
    if(lu) setTimeout(()=>lu.focus(),50);

    try{ Utils.toast('Sessão encerrada.'); }catch(e){}

    return false;
  };

  // Captura clique em Sair/Logout mesmo se algum onclick antigo falhar.
  document.addEventListener('click',function(ev){
    const btn=ev.target.closest('button,a');
    if(!btn) return;

    const txt=(btn.innerText||btn.title||btn.getAttribute('aria-label')||'').toLowerCase();
    const oc=String(btn.getAttribute('onclick')||'').toLowerCase();

    if(txt.includes('sair') || txt.includes('logout') || oc.includes('auth.logout')){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      Auth.logout();
      return false;
    }
  },true);
})();




/* =========================================================
   ZERO V9.2 — Logout lateral definitivo
   - Botão lateral Sair com ID explícito.
   - forceLogout(event) usado direto no onclick.
   - Escuta também pointerdown/mousedown/click para garantir.
   - Não depende de recarregar página.
========================================================= */
(function(){
  if(!window.Auth) window.Auth={};
  if(Auth.__logoutLateralDefinitivoV92) return;
  Auth.__logoutLateralDefinitivoV92=true;

  Auth._limparSessaoV92 = function(){
    try{
      sessionStorage.removeItem('CM_USER');
      sessionStorage.removeItem('AUTH_USER');
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('usuarioLogado');
      sessionStorage.removeItem('session');
      sessionStorage.clear();

      localStorage.removeItem('CM_AUTH');
      localStorage.removeItem('AUTH_USER');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('session');
    }catch(e){}

    try{
      window.currentUser=null;
      Auth.current=null;
    }catch(e){}
  };

  Auth._mostrarLoginV92 = function(){
    const login =
      document.getElementById('login-page') ||
      document.getElementById('login-screen') ||
      document.getElementById('loginScreen') ||
      document.querySelector('.login-page,.login-screen');

    const app =
      document.getElementById('app-shell') ||
      document.getElementById('app') ||
      document.querySelector('.app-shell');

    const modalRoot=document.getElementById('modal-root');
    if(modalRoot) modalRoot.innerHTML='';

    if(app){
      app.classList.add('hidden');
      app.classList.add('app-hidden');
      app.style.setProperty('display','none','important');
    }

    if(login){
      login.classList.remove('hidden');
      login.classList.remove('app-hidden');
      login.style.setProperty('display','flex','important');
    }

    document.body.classList.remove('logged-in');
    document.body.classList.add('logged-out');

    const lu=document.getElementById('lu') || document.getElementById('login-user');
    const lp=document.getElementById('lp') || document.getElementById('login-pass');
    if(lu) lu.value='';
    if(lp) lp.value='';
    if(lu) setTimeout(()=>lu.focus(),80);
  };

  Auth.forceLogout = function(ev){
    if(ev){
      try{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      }catch(e){}
    }

    try{
      if(window.Security && Security.audit) Security.audit('logout','Logout pelo botão Sair lateral/topo');
      if(window.LGPDOffline && LGPDOffline.audit) LGPDOffline.audit('logout','Logout pelo botão Sair lateral/topo');
    }catch(e){}

    this._limparSessaoV92();
    this._mostrarLoginV92();

    try{ Utils.toast('Sessão encerrada.'); }catch(e){}

    return false;
  };

  Auth.logout = function(ev){
    return Auth.forceLogout(ev);
  };

  function isLogoutTarget(el){
    if(!el) return false;
    const btn=el.closest ? el.closest('#btn-logout-lateral,#btn-logout-topo,.logout-trigger,.cm-logout-btn,button,a') : null;
    if(!btn) return false;

    if(btn.id==='btn-logout-lateral' || btn.id==='btn-logout-topo') return true;
    if(btn.classList && (btn.classList.contains('logout-trigger') || btn.classList.contains('cm-logout-btn'))) return true;

    const txt=(btn.innerText||btn.title||btn.getAttribute('aria-label')||'').toLowerCase();
    const oc=String(btn.getAttribute('onclick')||'').toLowerCase();

    return txt.includes('sair') || txt.includes('logout') || oc.includes('auth.logout') || oc.includes('auth.forcelogout');
  }

  ['pointerdown','mousedown','click','touchstart'].forEach(evt=>{
    document.addEventListener(evt,function(ev){
      if(isLogoutTarget(ev.target)){
        Auth.forceLogout(ev);
        return false;
      }
    },true);
  });

  // Garante evento direto após render/login
  Auth.bindLogoutButtonsV92 = function(){
    ['btn-logout-lateral','btn-logout-topo'].forEach(id=>{
      const btn=document.getElementById(id);
      if(btn && !btn.__logoutBoundV92){
        btn.__logoutBoundV92=true;
        btn.addEventListener('click',function(ev){ return Auth.forceLogout(ev); },true);
        btn.addEventListener('pointerdown',function(ev){ return Auth.forceLogout(ev); },true);
      }
    });
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(Auth.bindLogoutButtonsV92,200));
  setTimeout(Auth.bindLogoutButtonsV92,500);
  setInterval(Auth.bindLogoutButtonsV92,2000);
})();




/* =========================================================
   ZERO V9.3 — Login funcionando depois do logout
   Problema:
   - O logout V9.2 colocava classes/estilos de logged-out e escondia o app.
   - Depois do novo login, algumas classes/estilos não eram removidos.
   Correção:
   - showApp limpa estado de logout.
   - login sempre chama showApp limpo.
   - logout limpa sessão sem travar novo acesso.
========================================================= */
(function(){
  if(!window.Auth || Auth.__loginAposLogoutFixV93) return;
  Auth.__loginAposLogoutFixV93=true;

  Auth._clearLoginStateV93 = function(){
    document.body.classList.remove('logged-out');
    document.body.classList.add('logged-in');

    const login =
      document.getElementById('login-page') ||
      document.getElementById('login-screen') ||
      document.getElementById('loginScreen') ||
      document.querySelector('.login-page,.login-screen');

    const app =
      document.getElementById('app-shell') ||
      document.querySelector('.app-shell');

    if(login){
      login.classList.add('hidden');
      login.classList.add('app-hidden');
      login.style.setProperty('display','none','important');
    }

    if(app){
      app.classList.remove('hidden');
      app.classList.remove('app-hidden');
      app.style.removeProperty('display');
      app.style.setProperty('display','flex','important');
    }
  };

  Auth._showLoginStateV93 = function(){
    document.body.classList.remove('logged-in');
    document.body.classList.add('logged-out');

    const login =
      document.getElementById('login-page') ||
      document.getElementById('login-screen') ||
      document.getElementById('loginScreen') ||
      document.querySelector('.login-page,.login-screen');

    const app =
      document.getElementById('app-shell') ||
      document.querySelector('.app-shell');

    if(app){
      app.classList.add('hidden');
      app.classList.add('app-hidden');
      app.style.setProperty('display','none','important');
    }

    if(login){
      login.classList.remove('hidden');
      login.classList.remove('app-hidden');
      login.style.removeProperty('display');
      login.style.setProperty('display','flex','important');
    }
  };

  Auth.showApp = function(){
    this._clearLoginStateV93();

    const label=document.getElementById('user-label');
    if(label && this.current){
      label.textContent=this.current.nome || this.current.login || 'Usuário';
    }

    try{
      if(window.Security){
        Security.audit('login','Login no sistema');
        setTimeout(()=>Security.applyMenu && Security.applyMenu(),80);
      }
    }catch(e){}

    try{
      if(window.PermissoesPerfil){
        setTimeout(()=>PermissoesPerfil.applyMenuVisibility(true),100);
      }
    }catch(e){}

    try{
      Router.go('inicio');
    }catch(e){
      console.error(e);
    }
  };

  Auth.showLogin = function(){
    this._showLoginStateV93();
  };

  Auth.login = function(ev){
    if(ev && ev.preventDefault) ev.preventDefault();

    const u = String((document.getElementById('lu') || document.getElementById('login-user'))?.value || '').trim();
    const p = String((document.getElementById('lp') || document.getElementById('login-pass'))?.value || '').trim();

    if(!u || !p){
      Utils.toast('Informe usuário e senha.');
      return false;
    }

    let users = Store.get('USUARIOS');
    let user = users.find(x =>
      String(x.login || x.usuario || x.email || '').toLowerCase() === u.toLowerCase() &&
      String(x.senha || x.password || '') === p
    );

    if(!user && u.toLowerCase()==='admin' && p==='admin'){
      user={id:'U001',login:'admin',senha:'admin',nome:'Administrador',perfil:'admin'};
      Store.upsert('USUARIOS',user);
    }

    if(!user){
      Utils.toast('Login ou senha incorretos.');
      return false;
    }

    this.current=user;
    window.currentUser=user;

    try{
      sessionStorage.setItem('CM_USER',JSON.stringify(user));
    }catch(e){}

    this.showApp();
    return false;
  };

  Auth.forceLogout = function(ev){
    if(ev){
      try{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      }catch(e){}
    }

    try{
      if(window.Security && Security.audit) Security.audit('logout','Logout pelo botão Sair');
      if(window.LGPDOffline && LGPDOffline.audit) LGPDOffline.audit('logout','Logout pelo botão Sair');
    }catch(e){}

    try{
      sessionStorage.removeItem('CM_USER');
      sessionStorage.removeItem('AUTH_USER');
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('usuarioLogado');
      sessionStorage.removeItem('session');
      sessionStorage.clear();

      localStorage.removeItem('CM_AUTH');
      localStorage.removeItem('AUTH_USER');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('session');
    }catch(e){}

    this.current=null;
    window.currentUser=null;

    try{
      if(window.Modal && Modal.close) Modal.close();
      const modalRoot=document.getElementById('modal-root');
      if(modalRoot) modalRoot.innerHTML='';
    }catch(e){}

    this.showLogin();

    const lu=document.getElementById('lu') || document.getElementById('login-user');
    const lp=document.getElementById('lp') || document.getElementById('login-pass');
    if(lu) lu.value='';
    if(lp) lp.value='';
    if(lu) setTimeout(()=>lu.focus(),80);

    try{ Utils.toast('Sessão encerrada.'); }catch(e){}
    return false;
  };

  Auth.logout = function(ev){
    return Auth.forceLogout(ev);
  };

  // Reaplica eventos nos botões depois de logar/deslogar.
  Auth.bindLogoutButtonsV93 = function(){
    document.querySelectorAll('#btn-logout-lateral,#btn-logout-topo,.logout-trigger,.cm-logout-btn,button[onclick*="Auth.logout"],button[onclick*="Auth.forceLogout"]').forEach(btn=>{
      if(btn.__logoutBoundV93) return;
      btn.__logoutBoundV93=true;
      btn.addEventListener('click',ev=>Auth.forceLogout(ev),true);
      btn.addEventListener('pointerdown',ev=>Auth.forceLogout(ev),true);
    });
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>Auth.bindLogoutButtonsV93(),200));
  setTimeout(()=>Auth.bindLogoutButtonsV93(),500);
  setInterval(()=>Auth.bindLogoutButtonsV93(),2000);
})();




/* ZERO V9.5 — Aplica menu correto após login */
(function(){
  if(!window.Auth || Auth.__applyMenuPerfilV95) return;
  Auth.__applyMenuPerfilV95=true;

  const oldShowApp=Auth.showApp?.bind(Auth);
  Auth.showApp=function(){
    const ret=oldShowApp ? oldShowApp() : undefined;

    setTimeout(()=>{
      try{
        if(window.PermissoesPerfil) PermissoesPerfil.applyMenuVisibility(true);
        else if(window.Security?.applyMenu) Security.applyMenu();
      }catch(e){}
    },40);

    setTimeout(()=>{
      try{
        if(window.PermissoesPerfil) PermissoesPerfil.applyMenuVisibility(true);
      }catch(e){}
    },180);

    return ret;
  };

  const oldLogin=Auth.login?.bind(Auth);
  Auth.login=function(ev){
    const ret=oldLogin ? oldLogin(ev) : false;
    setTimeout(()=>{
      try{ window.PermissoesPerfil?.applyMenuVisibility(true); }catch(e){}
    },80);
    return ret;
  };
})();




/* =========================================================
   ZERO V9.8 — Login estável
   Correção:
   - Ao fazer login, evita piscar entre login/app/início.
   - Mostra o app somente depois de aplicar menu/perfil e preparar a tela.
   - Remove transições durante a entrada.
========================================================= */
(function(){
  if(!window.Auth || Auth.__loginEstavelV98) return;
  Auth.__loginEstavelV98=true;

  Auth.showAppStableV98=function(){
    const login =
      document.getElementById('login-page') ||
      document.getElementById('login-screen') ||
      document.getElementById('loginScreen') ||
      document.querySelector('.login-page,.login-screen');

    const app =
      document.getElementById('app-shell') ||
      document.querySelector('.app-shell');

    document.body.classList.add('app-login-switching-v98');

    if(login){
      login.classList.add('hidden');
      login.classList.add('app-hidden');
      login.style.setProperty('display','none','important');
    }

    if(app){
      app.classList.remove('hidden','app-hidden');
      app.style.setProperty('display','flex','important');
      app.style.visibility='hidden';
    }

    const label=document.getElementById('user-label');
    if(label && this.current) label.textContent=this.current.nome||this.current.login||'Usuário';

    document.body.classList.remove('logged-out');
    document.body.classList.add('logged-in');

    try{
      if(window.PermissoesPerfil) PermissoesPerfil.applyMenuVisibility(true);
      else if(window.Security?.applyMenu) Security.applyMenu();
    }catch(e){}

    try{
      if(window.Router){
        Router.go('inicio');
      }
    }catch(e){console.error(e);}

    requestAnimationFrame(()=>{
      try{
        if(window.PermissoesPerfil) PermissoesPerfil.applyMenuVisibility(true);
      }catch(e){}

      if(app) app.style.visibility='visible';
      document.body.classList.remove('app-login-switching-v98');

      try{
        if(window.Security?.audit) Security.audit('login','Login no sistema');
      }catch(e){}
    });
  };

  Auth.showApp=function(){
    return this.showAppStableV98();
  };

  Auth.login=function(ev){
    if(ev && ev.preventDefault) ev.preventDefault();

    const u=String((document.getElementById('lu')||document.getElementById('login-user'))?.value||'').trim();
    const p=String((document.getElementById('lp')||document.getElementById('login-pass'))?.value||'').trim();

    if(!u || !p){
      Utils.toast('Informe usuário e senha.');
      return false;
    }

    let users=Store.get('USUARIOS');
    let user=users.find(x =>
      String(x.login||x.usuario||x.email||'').toLowerCase()===u.toLowerCase() &&
      String(x.senha||x.password||'')===p
    );

    if(!user && u.toLowerCase()==='admin' && p==='admin'){
      user={id:'U001',login:'admin',senha:'admin',nome:'Administrador',perfil:'admin'};
      Store.upsert('USUARIOS',user);
    }

    if(!user){
      Utils.toast('Login ou senha incorretos.');
      return false;
    }

    this.current=user;
    window.currentUser=user;

    try{ sessionStorage.setItem('CM_USER',JSON.stringify(user)); }catch(e){}

    this.showAppStableV98();
    return false;
  };
})();




/* ZERO V9.9 — login/menu não interfere em modais */
(function(){
  if(!window.Auth || Auth.__modalAwareV99) return;
  Auth.__modalAwareV99=true;

  const oldShowApp=Auth.showApp?.bind(Auth);
  Auth.showApp=function(){
    const ret=oldShowApp ? oldShowApp() : undefined;
    setTimeout(()=>{
      try{
        if(!(window.Modal && Modal.isOpen && Modal.isOpen())){
          window.PermissoesPerfil?.applyMenuVisibility(true);
        }
      }catch(e){}
    },220);
    return ret;
  };
})();




/* ZERO V19.5 — Reaplica LGPD corretamente no login/logout */
(function(){
  if(!window.Auth || Auth.__lgpdSoAdminLogadoV195) return;
  Auth.__lgpdSoAdminLogadoV195=true;

  const oldShowAppV195=Auth.showApp?.bind(Auth);
  Auth.showApp=function(){
    const ret=oldShowAppV195 ? oldShowAppV195(...arguments) : undefined;
    setTimeout(()=>{
      try{ window.LGPDOffline?.aplicarModoPrivacidade && LGPDOffline.aplicarModoPrivacidade(); }catch(e){}
      try{ window.LGPDOffline?.renderIndicadorPrivacidade && LGPDOffline.renderIndicadorPrivacidade(); }catch(e){}
    },120);
    return ret;
  };

  const oldLogoutV195=(Auth.forceLogout || Auth.logout)?.bind(Auth);
  Auth.forceLogout=function(ev){
    try{ window.LGPDOffline?.removerIndicadorPrivacidadeV195 && LGPDOffline.removerIndicadorPrivacidadeV195(); }catch(e){}
    try{
      document.body.classList.remove('lgpd-mask');
      document.documentElement.classList.remove('lgpd-mask');
    }catch(e){}
    return oldLogoutV195 ? oldLogoutV195(ev) : false;
  };

  Auth.logout=function(ev){
    return Auth.forceLogout(ev);
  };
})();
