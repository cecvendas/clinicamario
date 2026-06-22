window.Modal={
  open(title,body,footer='',size=''){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal ${size}"><div class="modal-title">${title}<button class="modal-x" onclick="Modal.close()">×</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}</div></div>`},
  close(){document.getElementById('modal-root').innerHTML=''},
  confirm(msg,cb){if(confirm(msg))cb&&cb()}
};



/* =========================================================
   ZERO V7.1 — Modais não fecham sozinhos
   Regra global:
   - Não fecha ao clicar fora/backdrop.
   - Não fecha no ESC.
   - Fecha somente em Salvar, Cancelar ou X.
========================================================= */
(function(){
  if(window.__ModalStaticGuardV71) return;
  window.__ModalStaticGuardV71=true;

  document.addEventListener('click',function(ev){
    const modal=document.querySelector('.modal,.cm-modal,.modal-dialog,[role="dialog"]');
    const overlay=document.querySelector('.modal-overlay,.modal-backdrop,.cm-modal-overlay,.overlay');
    const clickedOverlay = overlay && ev.target===overlay;
    const clickedModalBackdrop = modal && ev.target===modal && (
      modal.classList.contains('modal') ||
      modal.classList.contains('modal-overlay') ||
      modal.classList.contains('cm-modal')
    );

    if(clickedOverlay || clickedModalBackdrop){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      return false;
    }
  },true);

  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape'){
      const hasModal=document.querySelector('.modal,.cm-modal,.modal-overlay,.modal-backdrop,[role="dialog"]');
      if(hasModal){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        return false;
      }
    }
  },true);

  const patchModal=()=>{
    if(!window.Modal || Modal.__staticGuardV71) return;
    Modal.__staticGuardV71=true;

    const oldOpen=Modal.open?.bind(Modal);
    if(oldOpen){
      Modal.open=function(){
        const ret=oldOpen(...arguments);
        setTimeout(()=>{
          document.querySelectorAll('.modal,.cm-modal,.modal-overlay,.modal-backdrop,[role="dialog"]').forEach(m=>{
            m.setAttribute('data-static-modal','true');
          });
        },20);
        return ret;
      };
    }
  };

  patchModal();
  document.addEventListener('DOMContentLoaded',patchModal);
  setTimeout(patchModal,100);
})();




/* =========================================================
   ZERO V9.6 — Modais estáveis / troca atômica
   Correção:
   - Ao abrir um modal novo, remove imediatamente o anterior.
   - Não deixa o modal anterior aparecer por alguns milissegundos.
   - Remove animações/transições que causavam "piscada".
========================================================= */
(function(){
  if(!window.Modal || Modal.__stableOpenV96) return;
  Modal.__stableOpenV96=true;

  Modal.open = function(title, body, footer='', size=''){
    const root=document.getElementById('modal-root');
    if(!root) return;

    // some imediatamente com qualquer modal anterior
    root.classList.add('modal-switching-v96');
    root.innerHTML='';

    const html=`<div class="modal-backdrop stable-modal-backdrop-v96" data-static-modal="true">
      <div class="modal ${size||''} stable-modal-v96" data-static-modal="true" role="dialog" aria-modal="true">
        <div class="modal-title">${title}<button type="button" class="modal-x" onclick="Modal.close()">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer?`<div class="modal-footer">${footer}</div>`:''}
      </div>
    </div>`;

    root.insertAdjacentHTML('beforeend',html);

    // reativa visibilidade já com o modal novo pronto
    requestAnimationFrame(()=>root.classList.remove('modal-switching-v96'));
  };

  Modal.close = function(){
    const root=document.getElementById('modal-root');
    if(root) root.innerHTML='';
  };
})();




/* =========================================================
   ZERO V9.9 — Modais estáveis em todos os perfis
   Regra:
   - Admin, Médico, Recepção e Financeiro usam o mesmo fluxo de modal.
   - Ao abrir modal, congela ajustes de menu/rota por alguns ms.
   - Remove modal antigo antes de construir o novo.
   - Não deixa título/corpo antigo aparecer.
   - Mantém o modal aberto até Salvar/Cancelar/X.
========================================================= */
(function(){
  if(!window.Modal) window.Modal={};
  if(Modal.__todosPerfisStableV99) return;
  Modal.__todosPerfisStableV99=true;

  Modal._opened=false;
  Modal._switching=false;
  Modal._lastOpenAt=0;

  Modal.isOpen=function(){
    return !!document.querySelector('#modal-root .modal,#modal-root .modal-backdrop');
  };

  Modal.freezeLayout=function(ms=180){
    document.body.classList.add('modal-open-v99','modal-freeze-v99');
    window.__CM_MODAL_FREEZE_UNTIL__=Date.now()+ms;
    clearTimeout(window.__CM_MODAL_FREEZE_TIMER_V99__);
    window.__CM_MODAL_FREEZE_TIMER_V99__=setTimeout(()=>{
      document.body.classList.remove('modal-freeze-v99');
    },ms);
  };

  Modal.open=function(title,body,footer='',size=''){
    const root=document.getElementById('modal-root');
    if(!root) return;

    this._switching=true;
    this._opened=true;
    this._lastOpenAt=Date.now();
    this.freezeLayout(220);

    root.classList.add('modal-switching-v99');
    root.innerHTML='';

    const html=`<div class="modal-backdrop stable-modal-backdrop-v99" data-static-modal="true">
      <div class="modal ${size||''} stable-modal-v99" data-static-modal="true" role="dialog" aria-modal="true">
        <div class="modal-title">${title}<button type="button" class="modal-x" onclick="Modal.close()">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer?`<div class="modal-footer">${footer}</div>`:''}
      </div>
    </div>`;

    root.insertAdjacentHTML('beforeend',html);

    requestAnimationFrame(()=>{
      root.classList.remove('modal-switching-v99','modal-switching-v96','modal-switching-v97');
      this._switching=false;
      document.body.classList.add('modal-open-v99');
      document.querySelectorAll('#modal-root .modal,#modal-root .modal-backdrop').forEach(m=>{
        m.setAttribute('data-static-modal','true');
      });
    });

    return false;
  };

  Modal.close=function(){
    const root=document.getElementById('modal-root');
    if(root) root.innerHTML='';
    this._opened=false;
    this._switching=false;
    document.body.classList.remove('modal-open-v99','modal-freeze-v99');
    return false;
  };

  // Impede backdrop/ESC de fechar e também evita propagação que causava rerender em alguns perfis.
  document.addEventListener('click',function(ev){
    const root=document.getElementById('modal-root');
    if(!root || !root.innerHTML) return;

    const backdrop=ev.target.classList && ev.target.classList.contains('modal-backdrop');
    if(backdrop){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      return false;
    }
  },true);

  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape' && Modal.isOpen()){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      return false;
    }
  },true);
})();




/* =========================================================
   ZERO V12.9 — Estabilização geral de TODOS os modais
   Objetivo:
   - Visualizar paciente sem piscar.
   - Visualizar profissional sem piscar.
   - Editar profissional sem piscar.
   - Demais modais abrem prontos, sem mostrar montagem/campos desalinhando.
========================================================= */
(function(){
  if(!window.Modal) window.Modal={};
  if(Modal.__estabilizacaoGeralV129) return;
  Modal.__estabilizacaoGeralV129=true;

  Modal._stableTimerV129=null;

  Modal.estabilizarAtualV129=function(ms=150){
    const root=document.getElementById('modal-root');
    if(!root) return;

    clearTimeout(this._stableTimerV129);
    root.classList.add('modal-stabilizing-v129');
    document.body.classList.add('modal-stabilizing-body-v129');

    const modal=root.querySelector('.modal');
    if(modal){
      modal.style.transition='none';
      modal.style.animation='none';
      modal.style.willChange='auto';
    }

    const liberar=()=>{
      root.classList.remove('modal-stabilizing-v129','modal-switching-v96','modal-switching-v97','modal-switching-v99');
      document.body.classList.remove('modal-stabilizing-body-v129','modal-freeze-v99');
      const m=root.querySelector('.modal');
      if(m){
        m.classList.add('modal-ready-v129');
        m.style.transition='';
        m.style.animation='';
      }
    };

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        this._stableTimerV129=setTimeout(liberar,ms);
      });
    });
  };

  Modal.open=function(title,body,footer='',size=''){
    const root=document.getElementById('modal-root');
    if(!root) return false;

    clearTimeout(this._stableTimerV129);

    this._opened=true;
    this._switching=true;
    this._lastOpenAt=Date.now();

    document.body.classList.add('modal-open-v99','modal-stabilizing-body-v129');
    root.classList.add('modal-stabilizing-v129');
    root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99');

    // troca atômica: monta tudo em fragmento e só depois coloca no root
    const sizeClass=String(size||'').trim();
    const footerHtml=footer?`<div class="modal-footer">${footer}</div>`:'';
    const html=`<div class="modal-backdrop stable-modal-backdrop-v129" data-static-modal="true">
      <div class="modal ${sizeClass} stable-modal-v129" data-static-modal="true" role="dialog" aria-modal="true">
        <div class="modal-title">${title}<button type="button" class="modal-x" onclick="Modal.close()">×</button></div>
        <div class="modal-body">${body}</div>
        ${footerHtml}
      </div>
    </div>`;

    root.innerHTML=html;

    // Todo botão no rodapé fica sempre clicável e sem submit acidental.
    root.querySelectorAll('.modal-footer button,.modal-title button').forEach(b=>{
      if(!b.getAttribute('type')) b.setAttribute('type','button');
    });

    this.estabilizarAtualV129(150);
    return false;
  };

  Modal.close=function(){
    const root=document.getElementById('modal-root');
    clearTimeout(this._stableTimerV129);
    if(root){
      root.classList.remove('modal-stabilizing-v129','modal-switching-v96','modal-switching-v97','modal-switching-v99');
      root.innerHTML='';
    }
    this._opened=false;
    this._switching=false;
    document.body.classList.remove('modal-open-v99','modal-freeze-v99','modal-stabilizing-body-v129');
    return false;
  };

  // Se algum módulo mexer no corpo do modal depois de abrir, segura oculto e mostra pronto.
  const root=document.getElementById('modal-root');
  if(root && !root.__observerModalV129){
    root.__observerModalV129=true;
    const obs=new MutationObserver(()=>{
      if(root.innerHTML && root.querySelector('.modal')){
        root.querySelectorAll('.modal-footer button,.modal-title button').forEach(b=>{
          if(!b.getAttribute('type')) b.setAttribute('type','button');
        });
      }
    });
    obs.observe(root,{childList:true,subtree:true});
  }

  // Impede clique no fundo e ESC de dispararem fechamento/re-render.
  document.addEventListener('click',function(ev){
    const root=document.getElementById('modal-root');
    if(!root || !root.innerHTML) return;
    if(ev.target && ev.target.classList && ev.target.classList.contains('modal-backdrop')){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      return false;
    }
  },true);

  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape' && document.querySelector('#modal-root .modal')){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      return false;
    }
  },true);
})();




/* =========================================================
   ZERO V13.3 — Modais clínicos empilhados e sem piscar
   - Mantém Registrar Consulta atrás quando abre Receita/Exames/Atestado/Laudo.
   - Mantém Receita atrás quando abre + Medicamento.
   - Mantém Medicamento atrás quando abre Periodicidade.
   - Não esconde a tela toda durante abertura de submodal.
========================================================= */
(function(){
  if(!window.Modal) window.Modal={};
  if(Modal.__clinicoStackSemPiscarV133) return;
  Modal.__clinicoStackSemPiscarV133=true;

  Modal.stackContextV133='';
  Modal.stackOpenV133=false;

  Modal.topLayerV133=function(){
    const root=document.getElementById('modal-root');
    if(!root) return null;
    const layers=root.querySelectorAll(':scope > .modal-backdrop');
    return layers.length ? layers[layers.length-1] : null;
  };

  Modal.syncZV133=function(){
    const root=document.getElementById('modal-root');
    if(!root) return;
    const layers=Array.from(root.querySelectorAll(':scope > .modal-backdrop'));
    layers.forEach((layer,i)=>{
      layer.classList.add('modal-layer-v133');
      layer.style.zIndex=String(1000+(i*20));
      const m=layer.querySelector('.modal');
      if(m){
        m.style.transition='none';
        m.style.animation='none';
      }
    });
  };

  Modal.open=function(title,body,footer='',size=''){
    const root=document.getElementById('modal-root');
    if(!root) return false;

    const context=this.stackContextV133 || '';
    const shouldStack=!!this.stackOpenV133 && !!root.querySelector(':scope > .modal-backdrop');

    document.body.classList.add('modal-open-v99');
    document.body.classList.remove('modal-stabilizing-body-v129','modal-freeze-v99');
    root.classList.remove('modal-stabilizing-v129','modal-switching-v96','modal-switching-v97','modal-switching-v99');

    const html=`<div class="modal-backdrop stable-modal-backdrop-v133 modal-layer-v133" data-static-modal="true" data-context="${context}">
      <div class="modal ${String(size||'').trim()} stable-modal-v133 modal-ready-v129" data-static-modal="true" role="dialog" aria-modal="true">
        <div class="modal-title">${title}<button type="button" class="modal-x" onclick="Modal.close()">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer?`<div class="modal-footer">${footer}</div>`:''}
      </div>
    </div>`;

    if(shouldStack){
      const current=this.topLayerV133();
      if(current){
        current.classList.add('modal-under-v133');
        current.setAttribute('aria-hidden','true');
      }
      root.insertAdjacentHTML('beforeend',html);
    }else{
      root.innerHTML=html;
    }

    root.querySelectorAll('.modal-footer button,.modal-title button').forEach(b=>{
      if(!b.getAttribute('type')) b.setAttribute('type','button');
    });

    this.syncZV133();
    this.stackOpenV133=false;
    this.stackContextV133='';
    return false;
  };

  Modal.close=function(){
    const root=document.getElementById('modal-root');
    if(!root) return false;

    const layers=Array.from(root.querySelectorAll(':scope > .modal-backdrop'));
    if(layers.length>1){
      const top=layers[layers.length-1];
      top.remove();

      const novoTop=this.topLayerV133();
      if(novoTop){
        novoTop.classList.remove('modal-under-v133');
        novoTop.removeAttribute('aria-hidden');
        if(window.RegistrarConsulta){
          RegistrarConsulta.__modalInternoV113=novoTop.getAttribute('data-context')||'';
        }
      }
      this.syncZV133();
      document.body.classList.add('modal-open-v99');
      return false;
    }

    root.innerHTML='';
    document.body.classList.remove('modal-open-v99','modal-freeze-v99','modal-stabilizing-body-v129');
    return false;
  };
})();


/* =========================================================
   ZERO V13.4 — Modal root sem troca visual
========================================================= */
(function(){
  if(!window.Modal || Modal.__stableRootV134) return;
  Modal.__stableRootV134=true;
  const oldClose=Modal.close?.bind(Modal);
  Modal.close=function(){
    const ret=oldClose ? oldClose() : false;
    const root=document.getElementById('modal-root');
    if(root) root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
    document.body.classList.add('modal-open-v99');
    setTimeout(()=>{
      if(!root || !root.querySelector('.modal-backdrop')) document.body.classList.remove('modal-open-v99');
    },0);
    return ret;
  };
})();




/* =========================================================
   ZERO V13.5 — Núcleo definitivo: submodal clínico sem piscar
   Regra:
   - Quando já existe Registrar Consulta/Receita/Medicamento aberto,
     o próximo modal clínico é EMPILHADO, nunca substitui o root.
   - Não usa classe que esconde modal.
   - Não limpa a tela inteira.
========================================================= */
(function(){
  if(!window.Modal) window.Modal={};
  if(Modal.__stackClinicoZeroPiscarV135) return;
  Modal.__stackClinicoZeroPiscarV135=true;

  Modal.__appendNextV135=false;
  Modal.__contextNextV135='';

  Modal.rootV135=function(){ return document.getElementById('modal-root'); };

  Modal.layersV135=function(){
    const root=this.rootV135();
    return root ? Array.from(root.querySelectorAll(':scope > .modal-backdrop')) : [];
  };

  Modal.topLayerV135=function(){
    const arr=this.layersV135();
    return arr.length ? arr[arr.length-1] : null;
  };

  Modal.setNextStackV135=function(ctx=''){
    this.__appendNextV135=true;
    this.__contextNextV135=ctx||'clinico';
  };

  Modal.syncLayersV135=function(){
    const layers=this.layersV135();
    layers.forEach((layer,i)=>{
      layer.classList.add('modal-layer-v135');
      layer.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
      layer.style.zIndex=String(1000+(i*30));
      layer.style.opacity='1';
      layer.style.visibility='visible';
      layer.style.display='flex';
      layer.style.pointerEvents=(i===layers.length-1)?'auto':'none';

      const modal=layer.querySelector('.modal');
      if(modal){
        modal.classList.add('modal-ready-v135');
        modal.style.opacity='1';
        modal.style.visibility='visible';
        modal.style.transition='none';
        modal.style.animation='none';
      }
    });

    const root=this.rootV135();
    if(root){
      root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
      root.style.visibility='visible';
      root.style.opacity='1';
    }

    if(layers.length) document.body.classList.add('modal-open-v99','modal-clinico-stack-v135');
    else document.body.classList.remove('modal-open-v99','modal-clinico-stack-v135');
    document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');
  };

  Modal.open=function(title,body,footer='',size=''){
    const root=this.rootV135();
    if(!root) return false;

    const hasLayer=!!this.topLayerV135();
    const mustAppend=!!this.__appendNextV135 || !!(window.RegistrarConsulta && RegistrarConsulta.__clinicoStackAtivoV135);
    const ctx=this.__contextNextV135 || (window.RegistrarConsulta && RegistrarConsulta.__modalInternoV113) || 'modal';

    const html=`<div class="modal-backdrop modal-layer-v135" data-static-modal="true" data-context="${String(ctx).replace(/"/g,'&quot;')}">
      <div class="modal ${String(size||'').trim()} modal-ready-v135" data-static-modal="true" role="dialog" aria-modal="true">
        <div class="modal-title">${title}<button type="button" class="modal-x" onclick="Modal.close()">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer?`<div class="modal-footer">${footer}</div>`:''}
      </div>
    </div>`;

    if(hasLayer && mustAppend){
      root.insertAdjacentHTML('beforeend',html);
    }else{
      root.innerHTML=html;
    }

    root.querySelectorAll('.modal-footer button,.modal-title button,.modal-body button').forEach(b=>{
      if(!b.getAttribute('type')) b.setAttribute('type','button');
    });

    this.__appendNextV135=false;
    this.__contextNextV135='';
    this.syncLayersV135();

    requestAnimationFrame(()=>this.syncLayersV135());
    setTimeout(()=>this.syncLayersV135(),30);
    return false;
  };

  Modal.close=function(){
    const root=this.rootV135();
    if(!root) return false;

    const layers=this.layersV135();
    if(layers.length>1){
      layers[layers.length-1].remove();
      this.syncLayersV135();

      const top=this.topLayerV135();
      const ctx=top ? (top.getAttribute('data-context')||'') : '';
      if(window.RegistrarConsulta) RegistrarConsulta.__modalInternoV113=ctx;
      return false;
    }

    root.innerHTML='';
    this.__appendNextV135=false;
    this.__contextNextV135='';
    this.syncLayersV135();
    return false;
  };

  // Bloqueia fechamento por clique fora / ESC para não gerar render/piscada.
  document.addEventListener('click',function(ev){
    if(ev.target && ev.target.classList && ev.target.classList.contains('modal-backdrop')){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      return false;
    }
  },true);

  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape' && document.querySelector('#modal-root .modal-backdrop')){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      return false;
    }
  },true);
})();




/* =========================================================
   ZERO V13.7 — Fechamento correto de submodais
   Regra:
   - Se existe mais de uma camada, X/Cancelar fecha só a camada de cima.
   - Registrar Consulta nunca fecha ao fechar Receita/Exame/Laudo/Atestado.
   - Receita nunca fecha ao fechar + Medicamento.
   - Medicamento nunca fecha ao fechar Periodicidade.
========================================================= */
(function(){
  if(!window.Modal || Modal.__fechamentoCamadasV137) return;
  Modal.__fechamentoCamadasV137=true;

  Modal.layersV137=function(){
    const root=document.getElementById('modal-root');
    return root ? Array.from(root.querySelectorAll(':scope > .modal-backdrop')) : [];
  };

  Modal.syncV137=function(){
    const layers=this.layersV137();
    layers.forEach((layer,i)=>{
      layer.classList.add('modal-layer-v137');
      layer.style.zIndex=String(1000+(i*30));
      layer.style.opacity='1';
      layer.style.visibility='visible';
      layer.style.display='flex';
      layer.style.pointerEvents=(i===layers.length-1)?'auto':'none';
      const m=layer.querySelector('.modal');
      if(m){
        m.style.opacity='1';
        m.style.visibility='visible';
        m.style.transition='none';
        m.style.animation='none';
      }
    });
    const root=document.getElementById('modal-root');
    if(root){
      root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
      root.style.opacity='1';
      root.style.visibility='visible';
    }
    document.body.classList.toggle('modal-open-v99',layers.length>0);
    document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');
  };

  const oldOpenV137=Modal.open?.bind(Modal);
  Modal.open=function(title,body,footer='',size=''){
    const root=document.getElementById('modal-root');
    if(!root) return false;

    const stack=!!(this.__appendNextV135 || this.stackOpenV133 || this.__appendNextV137);
    const has=this.layersV137().length>0;
    const ctx=this.__contextNextV135 || this.stackContextV133 || this.__contextNextV137 || (window.RegistrarConsulta?.__modalInternoV113||'modal');

    if(stack && has){
      const html=`<div class="modal-backdrop modal-layer-v137" data-static-modal="true" data-context="${String(ctx).replace(/"/g,'&quot;')}">
        <div class="modal ${String(size||'').trim()}" data-static-modal="true" role="dialog" aria-modal="true">
          <div class="modal-title">${title}<button type="button" class="modal-x" onclick="Modal.close()">×</button></div>
          <div class="modal-body">${body}</div>
          ${footer?`<div class="modal-footer">${footer}</div>`:''}
        </div>
      </div>`;
      root.insertAdjacentHTML('beforeend',html);
      root.querySelectorAll('.modal-footer button,.modal-title button,.modal-body button').forEach(b=>{
        if(!b.getAttribute('type')) b.setAttribute('type','button');
      });
      this.__appendNextV135=false;
      this.stackOpenV133=false;
      this.__appendNextV137=false;
      this.__contextNextV135='';
      this.stackContextV133='';
      this.__contextNextV137='';
      this.syncV137();
      requestAnimationFrame(()=>this.syncV137());
      return false;
    }

    const ret=oldOpenV137 ? oldOpenV137(title,body,footer,size) : false;
    this.syncV137();
    return ret;
  };

  Modal.close=function(){
    const root=document.getElementById('modal-root');
    if(!root) return false;

    const layers=this.layersV137();
    if(layers.length>1){
      layers[layers.length-1].remove();
      this.syncV137();
      const novoTop=this.layersV137().slice(-1)[0];
      if(window.RegistrarConsulta && novoTop){
        RegistrarConsulta.__modalInternoV113=novoTop.getAttribute('data-context')||'';
      }
      return false;
    }

    root.innerHTML='';
    this.syncV137();
    return false;
  };

  Modal.closeTopV137=function(){
    return this.close();
  };
})();
