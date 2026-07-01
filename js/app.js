window.Atendimento={
  hoje(){ return Utils.today(); },

  lista(){
    return Store.get('ATENDIMENTOS').sort((a,b)=>{
      const ta=Date.parse(a.criadoEm||a.iniciadoEm||a.finalizadoEm||'')||0;
      const tb=Date.parse(b.criadoEm||b.iniciadoEm||b.finalizadoEm||'')||0;
      return tb-ta;
    });
  },

  doPaciente(pacId){
    return this.lista().find(a =>
      String(a.pacId)===String(pacId) &&
      (a.status==='Aguardando' || a.status==='Em atendimento')
    );
  },

  emAtendimento(pacId){
    return this.lista().find(a => String(a.pacId)===String(pacId) && a.status==='Em atendimento');
  },

  aguardando(){ return this.lista().filter(a=>a.status==='Aguardando'); },
  emAtendimentoLista(){ return this.lista().filter(a=>a.status==='Em atendimento'); },
  finalizadosHoje(){ return this.lista().filter(a=>a.status==='Finalizado' && a.data===this.hoje()); },

  colocarNaFila(pacId,tipo='Consulta',obs=''){
    const p=Store.get('PACIENTES').find(x=>x.id===pacId);
    if(!p) return Utils.toast('Paciente não encontrado.');

    const existente=this.doPaciente(pacId);
    if(existente){
      Utils.toast('Paciente já está na fila ou em atendimento.');
      Router.go('atendimento');
      return;
    }

    const prof = (window.ClinicaProfissionalDocumento && ClinicaProfissionalDocumento.resolve(item||doc||r||receita||atestado||laudo||pedido||exame||hist||{})) || {};
    const item={
      id:Utils.id('ATD'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome,
      profissionalId:prof.id||'',
      profissional:prof.nome||'',
      tipo:tipo||'Consulta',
      obs:obs||'',
      status:'Aguardando',
      data:this.hoje(),
      hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',item);
    Utils.toast('Paciente colocado na fila.');
    Router.go('atendimento');
  },

  modalEncaixe(){
    const pacientes=Store.get('PACIENTES').filter(p=>p.ativo!==false).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
    Modal.open('➕ Encaixe / Atendimento avulso',`
      <div class="cm-section">
        <div class="cm-section-title">👤 Paciente</div>
        <div class="cm-form-grid">
          <div class="span-4">
            <label>Paciente</label>
            <select id="enc-pac">
              <option value="">Selecione o paciente</option>
              ${pacientes.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)} ${p.cpf?`- ${Utils.esc(p.cpf)}`:''}</option>`).join('')}
            </select>
          </div>
          <div class="span-2">
            <label>Tipo de atendimento</label>
            <select id="enc-tipo">
              <option>Consulta</option>
              <option>Retorno</option>
              <option>Encaixe</option>
              <option>Procedimento</option>
            </select>
          </div>
          <div class="span-2">
            <label>Profissional</label>
            <input value="${Utils.esc((Profissionais.atual()||{}).nome||'')}" disabled>
          </div>
          <div class="span-4">
            <label>Observação / Queixa</label>
            <textarea id="enc-obs" rows="3" placeholder="Observação do encaixe ou atendimento"></textarea>
          </div>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-blue" onclick="Atendimento.salvarEncaixeModal()">Colocar na fila</button>
    `,'lg');
  },

  salvarEncaixeModal(){
    const pacId=document.getElementById('enc-pac').value;
    const tipo=document.getElementById('enc-tipo').value;
    const obs=document.getElementById('enc-obs').value;
    if(!pacId) return Utils.toast('Selecione o paciente.');
    Modal.close();
    this.colocarNaFila(pacId,tipo,obs);
  },

  iniciar(id){
    const item=this.lista().find(x=>x.id===id);
    if(!item) return Utils.toast('Atendimento não encontrado.');

    item.status='Em atendimento';
    item.iniciadoEm=new Date().toISOString();
    item.horaInicio=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    Store.upsert('ATENDIMENTOS',item);

    Prontuario.abrir(item.pacId,'historico');
    setTimeout(()=>RegistrarConsulta.open(item.pacId,item.id),80);
  },

  finalizar(pacId,histId){
    const item=this.emAtendimento(pacId);
    if(!item) return;

    item.status='Finalizado';
    item.histId=histId||item.histId||'';
    item.finalizadoEm=new Date().toISOString();
    item.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    Store.upsert('ATENDIMENTOS',item);
  },

  cancelar(id){
    const item=this.lista().find(x=>x.id===id);
    if(!item) return;
    if(!confirm('Remover este paciente da fila?')) return;
    item.status='Cancelado';
    item.canceladoEm=new Date().toISOString();
    Store.upsert('ATENDIMENTOS',item);
    Utils.toast('Paciente removido da fila.');
    Router.go('atendimento');
  },

  historicoDiaPaciente(pacId){
    const hoje=this.hoje();
    const hist=Store.get('HISTORICO').filter(h =>
      (h.pacId===pacId || h.pacienteId===pacId) && h.data===hoje
    ).sort((a,b)=>(Date.parse(b.criadoEm||'')||0)-(Date.parse(a.criadoEm||'')||0));

    const atds=this.lista().filter(a=>a.pacId===pacId && a.data===hoje);
    return {hist,atds};
  },

  verHistoricoDia(pacId){
    const p=Store.get('PACIENTES').find(x=>x.id===pacId);
    if(!p) return Utils.toast('Paciente não encontrado.');

    const {hist}=this.historicoDiaPaciente(pacId);

    Modal.open('📅 Atendimentos do dia',`
      <div class="cm-section">
        <div class="cm-section-title">👤 ${Utils.esc(p.nome)}</div>
        <div class="cm-view-grid">
          <div class="cm-view-item"><strong>Data</strong><span>${this.hoje()}</span></div>
          <div class="cm-view-item"><strong>CPF</strong><span>${Utils.esc(p.cpf||'—')}</span></div>
          <div class="cm-view-item"><strong>Total no dia</strong><span>${hist.length}</span></div>
        </div>
      </div>

      <div class="hist-dia-box">
        <div class="hist-dia-title">Histórico do dia</div>
        ${hist.length?hist.map(h=>`<div class="hist-dia-item">
          <div><strong>Consulta — ${Utils.esc(h.data||'')}</strong> ${h.medico?`| ${Utils.esc(h.medico)}`:''}</div>
          <div class="row right" style="margin-top:8px;">
            <button class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${p.id}','historico');Modal.close()">Abrir no prontuário</button>
            <button class="btn btn-sm btn-blue" onclick="Prontuario.paciente=Store.get('PACIENTES').find(x=>x.id==='${p.id}');Prontuario.verAnamneseCompleta('${h.id}')">Ver anamnese</button>
          </div>
        </div>`).join(''):`<div class="inicio-empty">Nenhum histórico salvo para este paciente hoje.</div>`}
      </div>
    `,`<button class="btn btn-blue" onclick="Modal.close()">Fechar</button>`,'lg');
  }
};

window.App={
  init(){
    Store.seed();
    Auth.init();
  },

  dataExtenso(){
    const d=new Date();
    return d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  },

  money(v){
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
  },

  kpi(icon, num, label, cls='blue', trend=''){
    return `<div class="zero-kpi-card">
      <div class="zero-kpi-ico ${cls}">${icon}</div>
      <div>
        <div class="zero-kpi-num">${num}</div>
        <div class="zero-kpi-label">${label}</div>
        ${trend?`<div class="zero-kpi-trend">${trend}</div>`:''}
      </div>
    </div>`;
  },

  kpiSmall(icon, num, label, cls='blue'){
    return `<div class="zero-kpi-card small-row">
      <div class="zero-kpi-ico ${cls}">${icon}</div>
      <div>
        <div class="zero-kpi-num">${num}</div>
        <div class="zero-kpi-label">${label}</div>
      </div>
    </div>`;
  },

  statusBadge(st){
    const cls=st==='Em atendimento'?'fila-em-atendimento':st==='Finalizado'?'fila-finalizado':'fila-aguardando';
    return `<span class="fila-status ${cls}">${st}</span>`;
  },

  renderInicio(){
    const user=(Auth.current&&Auth.current.nome)||'Administrador';
    const pacientes=Store.get('PACIENTES').filter(p=>p.ativo!==false);
    const aguardando=Atendimento.aguardando();
    const emAtendimento=Atendimento.emAtendimentoLista();
    const finalizados=Atendimento.finalizadosHoje();
    const consultasHoje=Store.get('HISTORICO').filter(h=>h.data===Utils.today()).length;
    const receitaDia=4750; // placeholder visual como original; financeiro entra depois.
    const notificacoes=0;
    const fila=aguardando.concat(emAtendimento);

    document.getElementById('content').innerHTML=`
      <h1 class="zero-page-title">Olá, ${Utils.esc(user)}! 👋</h1>
      <div class="zero-page-sub">${this.dataExtenso()}</div>

      <div class="zero-kpi-grid">
        ${this.kpi('🗓️', consultasHoje, 'Consultas hoje', 'blue', '↑ 2 vs ontem')}
        ${this.kpi('✅', finalizados.length, 'Realizadas', 'green')}
        ${this.kpi('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${this.kpi('💰', this.money(receitaDia), 'Receita do dia', 'yellow', '↑ 12%')}
        ${this.kpi('👥', pacientes.length, 'Pacientes ativos', 'purple')}
      </div>

      ${this.kpiSmall('🔔', notificacoes, 'Notificações', 'red')}

      <div class="zero-home-lower">
        <div class="zero-panel">
          <div class="zero-panel-head">
            <div class="zero-panel-title">🗓️ Fila de hoje</div>
            <button class="zero-link" onclick="Router.go('atendimento')">Atender →</button>
          </div>
          <div class="zero-panel-body">
            ${fila.length?`
              <table class="zero-table">
                <tbody>
                  ${fila.slice(0,4).map(a=>`<tr>
                    <td><strong>${Utils.esc(a.paciente||'')}</strong><div class="doc-sub">${Utils.esc(a.tipo||'Consulta')}</div></td>
                    <td>${this.statusBadge(a.status)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            `:`<div class="zero-muted-center">Nenhum paciente presente na fila de hoje.</div>`}
          </div>
        </div>

        <div class="zero-panel">
          <div class="zero-panel-head">
            <div class="zero-panel-title">🔔 Notificações</div>
          </div>
          <div class="zero-panel-body">
            <div class="zero-muted-center">Nenhuma notificação no momento.</div>
          </div>
        </div>
      </div>
    `;
  },

  renderAtendimento(){
    const aguardando=Atendimento.aguardando();
    const emAtendimento=Atendimento.emAtendimentoLista();
    const finalizados=Atendimento.finalizadosHoje();
    const ativos=aguardando.concat(emAtendimento);

    document.getElementById('content').innerHTML=`
      <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
      <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

      <div class="zero-fila-kpis">
        ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
        ${this.kpiSmall('✅', finalizados.length, 'Finalizados hoje', 'green')}
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Fila atual</div>
          <button class="zero-pill-btn" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
        </div>
        <div class="zero-wide-body">
          ${ativos.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${ativos.map(a=>`<tr>
                  <td>${Utils.esc(a.horaInicio||a.hora||'—')}</td>
                  <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                  <td>${Utils.esc(a.tipo||'Consulta')}</td>
                  <td>${this.statusBadge(a.status)}</td>
                  <td>
                    <div class="row right">
                      ${a.status==='Aguardando'?`<button class="btn btn-sm btn-blue" onclick="Atendimento.iniciar('${a.id}')">Atender</button>`:''}
                      ${a.status==='Em atendimento'?`<button class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${a.pacId}','${a.id}')">Registrar Consulta</button>`:''}
                      <button class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${a.pacId}')">Prontuário</button>
                      ${a.status==='Aguardando'?`<button class="btn btn-sm btn-red" onclick="Atendimento.cancelar('${a.id}')">Tirar da fila</button>`:''}
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
        </div>
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Atendidos hoje</div>
        </div>
        <div class="zero-wide-body">
          ${finalizados.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Profissional</th>
                  <th>Tipo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${finalizados.map(a=>`<tr class="zero-atendido-click" onclick="Atendimento.verHistoricoDia('${a.pacId}')">
                  <td>${Utils.esc(a.horaFim||'—')}</td>
                  <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                  <td>${Utils.esc(a.profissional||'—')}</td>
                  <td>${Utils.esc(a.tipo||'Consulta')}</td>
                  <td>${this.statusBadge('Finalizado')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
        </div>
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded',()=>App.init());


/* ZERO V3.1 — proteção da fila por perfil */
(function(){
  if(!window.Atendimento || Atendimento.__perfilProtegido) return;
  Atendimento.__perfilProtegido=true;

  const oldModal=Atendimento.modalEncaixe.bind(Atendimento);
  Atendimento.modalEncaixe=function(){
    if(window.Security && !Security.require('atendimento','Seu perfil não pode adicionar atendimento.')) return;
    return oldModal();
  };

  const oldIniciar=Atendimento.iniciar.bind(Atendimento);
  Atendimento.iniciar=function(id){
    if(window.Security && !Security.canRegistrarConsulta()){
      Utils.toast('Somente Médico ou Administrador pode iniciar atendimento clínico.');
      return;
    }
    return oldIniciar(id);
  };

  const oldRenderInicio=App.renderInicio.bind(App);
  App.renderInicio=function(){
    oldRenderInicio();
    if(window.Security && !Security.can('atendimento')){
      document.querySelectorAll('button').forEach(btn=>{
        const oc=String(btn.getAttribute('onclick')||'');
        if(oc.includes("Router.go('atendimento')")) btn.style.display='none';
      });
    }
  };

  const oldRenderAtendimento=App.renderAtendimento.bind(App);
  App.renderAtendimento=function(){
    if(window.Security && !Security.require('atendimento','Seu perfil não acessa Fila de Atendimento.')) return;
    oldRenderAtendimento();
    if(window.Security && !Security.canRegistrarConsulta()){
      document.querySelectorAll('button').forEach(btn=>{
        const oc=String(btn.getAttribute('onclick')||'');
        if(oc.includes('Atendimento.iniciar') || oc.includes('RegistrarConsulta.open') || oc.includes('Prontuario.abrir')){
          btn.style.display='none';
        }
      });
    }
  };
})();




/* =========================================================
   ZERO V3.9 — Ajuste botões da Fila
========================================================= */
(function(){
  if(!window.App || !window.Atendimento) return;

  const oldRenderAtendimentoV39 = App.renderAtendimento.bind(App);
  App.renderAtendimento = function(){
    oldRenderAtendimentoV39();

    // Segurança visual: se algum botão Registrar aparecer fora de Em atendimento, remove.
    document.querySelectorAll('tr').forEach(tr=>{
      const statusTxt=(tr.innerText||'').toLowerCase();
      if(!statusTxt.includes('em atendimento')){
        tr.querySelectorAll('button').forEach(btn=>{
          const oc=String(btn.getAttribute('onclick')||'');
          const tx=(btn.innerText||'').toLowerCase();
          if(oc.includes('RegistrarConsulta.open') || tx.includes('registrar consulta')){
            btn.style.display='none';
          }
        });
      }
    });
  };
})();




/* =========================================================
   ZERO V4.0 — Botão Registrar Consulta removido da tela
   A consulta abre pelo Atender; se já estiver em atendimento, aparece Continuar.
========================================================= */
(function(){
  if(!window.App || !window.Atendimento) return;

  const oldRenderAtendimentoV40 = App.renderAtendimento.bind(App);
  App.renderAtendimento = function(){
    oldRenderAtendimentoV40();

    document.querySelectorAll('button').forEach(btn=>{
      const oc=String(btn.getAttribute('onclick')||'');
      const tx=(btn.innerText||'').trim().toLowerCase();

      if(oc.includes('RegistrarConsulta.open') || tx.includes('registrar consulta')){
        btn.innerHTML='Continuar atendimento';
        btn.classList.remove('btn-green');
        btn.classList.add('btn-blue');
      }
    });
  };
})();




/* ZERO V5.5 — Respiro global após renderizações do App */
(function(){
  if(!window.App || App.__respiroGlobalV55) return;
  App.__respiroGlobalV55=true;

  const aplicar=()=>{ if(window.Router && Router.aplicarRespiroGlobal) Router.aplicarRespiroGlobal(); };

  ['renderInicio','renderAtendimento'].forEach(fn=>{
    if(typeof App[fn]==='function'){
      const old=App[fn].bind(App);
      App[fn]=function(){
        const ret=old();
        setTimeout(aplicar,60);
        return ret;
      };
    }
  });
})();




/* ZERO V7.6 — reaplica rolagem do menu após telas iniciais/login */
(function(){
  function scrollMenu(){
    const sidebar=document.querySelector('.sidebar,.cm-sidebar,#sidebar,aside');
    if(!sidebar) return;
    sidebar.style.height='100vh';
    sidebar.style.maxHeight='100vh';
    sidebar.style.minHeight='100vh';
    sidebar.style.overflowY='auto';
    sidebar.style.overflowX='hidden';
    sidebar.style.display='block';
    sidebar.querySelectorAll('nav,.nav,.nav-menu,.menu-lateral,.side-menu').forEach(n=>{
      n.style.overflow='visible';
      n.style.maxHeight='none';
      n.style.height='auto';
    });
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(scrollMenu,200));
  setInterval(scrollMenu,1500);
})();




/* ZERO V7.7 — garante scroll do menu após login */
(function(){
  if(window.__AppMenuScrollV77) return;
  window.__AppMenuScrollV77=true;

  function aplicar(){
    const sidebar=document.querySelector('.sidebar,.cm-sidebar,#sidebar,aside.sidebar,aside.cm-sidebar,.app-sidebar,.side,aside');
    if(!sidebar) return;

    sidebar.style.height='100vh';
    sidebar.style.maxHeight='100vh';
    sidebar.style.overflow='hidden';
    sidebar.style.display='flex';
    sidebar.style.flexDirection='column';

    const nav=sidebar.querySelector('nav,.nav,.nav-menu,.menu-lateral,.side-menu,.sidebar-menu,.menu-items,.menu,.cm-menu-scroll-v77');
    if(nav){
      nav.style.flex='1 1 auto';
      nav.style.minHeight='0';
      nav.style.overflowY='auto';
      nav.style.overflowX='hidden';
    }

    const main=document.querySelector('main,.main,.content-wrap,#main,.app-content,.content,#content-wrapper');
    if(main){
      main.style.height='100vh';
      main.style.overflowY='auto';
    }
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(aplicar,300));
  setTimeout(aplicar,500);
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


/* ZERO V7.9 — botões LGPD paciente */
(function(){
  if(window.__LGPDPacienteBtnV79) return;
  window.__LGPDPacienteBtnV79=true;

  function addButtons(){
    if(!window.LGPDOffline) return;
    const content=document.getElementById('content');
    if(!content || content.querySelector('#lgpd-paciente-acoes')) return;

    const isPac=/paciente|prontu/i.test(content.innerText||'');
    if(!isPac) return;

    const btn=document.createElement('div');
    btn.id='lgpd-paciente-acoes';
    btn.className='lgpd-alert';
    btn.innerHTML=`🔐 LGPD: registre consentimento do paciente quando necessário.
      <button class="btn btn-sm btn-blue" style="margin-left:8px;" onclick="LGPDOffline.audit('lgpd_aviso_paciente','Visualizou aviso LGPD na tela do paciente');Utils.toast('Use o menu LGPD para acompanhar consentimentos e logs.')">Registrar/acompanhar</button>`;
    content.insertBefore(btn, content.firstChild);
  }

  const oldGo=window.Router && Router.go ? Router.go.bind(Router) : null;
  if(oldGo && !Router.__lgpdPacienteBtnV79){
    Router.__lgpdPacienteBtnV79=true;
    Router.go=function(r){
      const ret=oldGo(r);
      setTimeout(addButtons,100);
      return ret;
    };
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


/* ZERO V8.1 — remove aviso LGPD que causava piscar */
(function(){
  if(window.__RemoveLGPDPacienteAvisoV81) return;
  window.__RemoveLGPDPacienteAvisoV81=true;
  function removeAviso(){
    document.querySelectorAll('#lgpd-paciente-acoes,.lgpd-alert').forEach(el=>{
      const txt=(el.innerText||'').toLowerCase();
      if(txt.includes('registre consentimento') || txt.includes('registrar/acompanhar')){
        el.remove();
      }
    });
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(removeAviso,50));
  setTimeout(removeAviso,200);
})();




/* =========================================================
   ZERO V8.9 — Modal Encaixe/Atendimento Avulso igual Agendamento
   - Mesmo padrão visual do modal Nova Consulta.
   - Paciente com busca por nome/CPF.
   - Médico/profissional.
   - Data, horário inicial, duração.
   - Convênio.
   - Tipo da consulta: Consulta/Retorno.
   - Atendimento: Presencial/Virtual.
   - Valor.
   - Queixa/Motivo.
   - Observação.
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__encaixeAgendamentoV89) return;
  Atendimento.__encaixeAgendamentoV89=true;

  Atendimento.pacientesEncaixeLista=function(){
    try{
      return (Store.get('PACIENTES')||[])
        .filter(p=>p && p.ativo!==false && p.status!=='Inativo' && p.status!=='Desativado')
        .sort((a,b)=>String(a.nome||a.nomeCompleto||'').localeCompare(String(b.nome||b.nomeCompleto||''),'pt-BR'));
    }catch(e){return [];}
  };

  Atendimento.profissionaisEncaixeLista=function(){
    try{
      return (Store.get('PROFISSIONAIS')||[])
        .filter(p=>p && p.ativo!==false && p.status!=='Inativo' && p.status!=='Desativado')
        .sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
    }catch(e){return [];}
  };

  Atendimento.nomePacienteEncaixe=function(p){
    return p?.nome || p?.nomeCompleto || p?.paciente || 'Paciente sem nome';
  };

  Atendimento.docPacienteEncaixe=function(p){
    return [p?.cpf,p?.telefone,p?.celular,p?.convenio||p?.plano].filter(Boolean).join(' • ');
  };

  Atendimento.buscarPacienteEncaixe=function(mostrarTodos=false){
    const input=document.getElementById('enc-paciente-busca');
    const box=document.getElementById('enc-paciente-results');
    if(!input || !box) return;

    const q=Utils.norm(input.value||'');
    let list=this.pacientesEncaixeLista();

    if(q){
      list=list.filter(p=>Utils.norm([p.nome,p.nomeCompleto,p.cpf,p.telefone,p.celular,p.convenio,p.plano].join(' ')).includes(q));
    }else if(!mostrarTodos){
      box.style.display='none';
      box.innerHTML='';
      return;
    }

    list=list.slice(0,30);
    if(!list.length){
      box.innerHTML='<button type="button" class="ag-paciente-empty">Nenhum paciente encontrado</button>';
      box.style.display='block';
      return;
    }

    box.innerHTML=list.map(p=>`
      <button type="button" onclick="Atendimento.selecionarPacienteEncaixe('${p.id}')">
        ${Utils.esc(Atendimento.nomePacienteEncaixe(p))}
        <div class="doc-sub">${Utils.esc(Atendimento.docPacienteEncaixe(p))}</div>
      </button>
    `).join('');
    box.style.display='block';
  };

  Atendimento.selecionarPacienteEncaixe=function(id){
    const p=this.pacientesEncaixeLista().find(x=>String(x.id)===String(id));
    if(!p) return;

    document.getElementById('enc-paciente-id').value=p.id;
    document.getElementById('enc-paciente-busca').value=this.nomePacienteEncaixe(p);

    const convenio=document.getElementById('enc-convenio');
    if(convenio) convenio.value=p.convenio || p.plano || '';

    const box=document.getElementById('enc-paciente-results');
    if(box){
      box.innerHTML='';
      box.style.display='none';
    }
  };

  Atendimento.hojeISO=function(){
    return new Date().toISOString().slice(0,10);
  };

  Atendimento.horaAtual=function(){
    return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  };

  Atendimento.modalEncaixe=function(){
    const profs=this.profissionaisEncaixeLista();
    const profAtual=(window.Profissionais && Profissionais.atual && Profissionais.atual()) || profs[0] || {};

    Modal.open('➕ Encaixe / Atendimento avulso',`
      <div class="ag-modal-grid-original">
        <div class="full ag-paciente-sugestoes">
          <label>Paciente * <span class="ag-modal-title-note">(busque por nome ou CPF)</span></label>
          <input id="enc-paciente-id" type="hidden" value="">
          <input id="enc-paciente-busca" placeholder="Digite o nome ou CPF do paciente" autocomplete="off" onfocus="Atendimento.buscarPacienteEncaixe(true)" oninput="Atendimento.buscarPacienteEncaixe(false)">
          <div id="enc-paciente-results" class="ag-paciente-results"></div>
        </div>

        <div class="full">
          <label>Médico / Profissional *</label>
          <select id="enc-prof">
            ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}${p.especialidade?' — '+Utils.esc(p.especialidade):''}</option>`).join('')}
          </select>
        </div>

        <div>
          <label>Data *</label>
          <input id="enc-data" type="date" value="${this.hojeISO()}">
        </div>

        <div>
          <label>Horário inicial *</label>
          <input id="enc-hora" type="time" value="${this.horaAtual()}">
        </div>

        <div>
          <label>Duração *</label>
          <select id="enc-duracao">
            <option value="30">30 minutos</option>
            <option value="45">45 minutos</option>
            <option value="60">60 minutos</option>
            <option value="90">90 minutos</option>
            <option value="120">120 minutos</option>
          </select>
        </div>

        <div>
          <label>Convênio</label>
          <input id="enc-convenio" placeholder="Selecione o paciente">
        </div>

        <div>
          <label>Tipo da consulta</label>
          <select id="enc-tipo-consulta">
            <option>Consulta</option>
            <option>Retorno</option>
          </select>
        </div>

        <div>
          <label>Atendimento</label>
          <select id="enc-modalidade">
            <option>Presencial</option>
            <option>Virtual</option>
          </select>
        </div>

        <div>
          <label>Valor da consulta</label>
          <input id="enc-valor" placeholder="R$ 0,00">
        </div>

        <div>
          <label>Status</label>
          <select id="enc-status">
            <option>Aguardando</option>
            <option>Agendado</option>
            <option>Confirmado</option>
          </select>
        </div>

        <div class="full">
          <label>Queixa / Motivo</label>
          <input id="enc-motivo" placeholder="Ex. Dor, retorno, avaliação...">
        </div>

        <div class="full">
          <label>Observação</label>
          <input id="enc-obs" placeholder="Ex: paciente chegou sem agendamento...">
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-blue" onclick="Atendimento.salvarEncaixeModal()">Colocar na fila</button>
    `,'lg');

    setTimeout(()=>{
      const sel=document.getElementById('enc-prof');
      if(sel && profAtual.id) sel.value=profAtual.id;
    },40);
  };

  Atendimento.parseMoney=function(v){
    return Number(String(v||'').replace(/[R$\\s.]/g,'').replace(',','.')) || 0;
  };

  Atendimento.salvarEncaixeModal=function(){
    const pacId=document.getElementById('enc-paciente-id')?.value || '';
    const busca=document.getElementById('enc-paciente-busca');
    if(!pacId && busca && busca.value){
      const q=Utils.norm(busca.value);
      const p=this.pacientesEncaixeLista().find(x=>Utils.norm(this.nomePacienteEncaixe(x))===q || Utils.norm(x.cpf||'')===q);
      if(p) this.selecionarPacienteEncaixe(p.id);
    }

    const finalPacId=document.getElementById('enc-paciente-id')?.value || '';
    if(!finalPacId){
      Utils.toast('Selecione um paciente da lista.');
      if(busca){
        busca.focus();
        this.buscarPacienteEncaixe(true);
      }
      return;
    }

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(finalPacId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const existente=this.doPaciente(finalPacId);
    if(existente){
      Utils.toast('Paciente já está na fila ou em atendimento.');
      Modal.close();
      Router.go('atendimento');
      return;
    }

    const profId=document.getElementById('enc-prof')?.value || '';
    const prof=Store.get('PROFISSIONAIS').find(x=>String(x.id)===String(profId)) || {};
    const tipoConsulta=document.getElementById('enc-tipo-consulta')?.value || 'Consulta';
    const modalidade=document.getElementById('enc-modalidade')?.value || 'Presencial';
    const motivo=document.getElementById('enc-motivo')?.value || '';
    const obs=document.getElementById('enc-obs')?.value || '';

    const item={
      id:Utils.id('ATD'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome||p.nomeCompleto||'',
      profissionalId:prof.id||'',
      profissional:prof.nome||'',
      tipo:tipoConsulta,
      tipoConsulta:tipoConsulta,
      modalidade:modalidade,
      procedimento:motivo,
      obs:obs,
      status:document.getElementById('enc-status')?.value || 'Aguardando',
      data:Utils.today(),
      dataAgenda:document.getElementById('enc-data')?.value || this.hojeISO(),
      hora:document.getElementById('enc-hora')?.value || this.horaAtual(),
      duracao:Number(document.getElementById('enc-duracao')?.value||30),
      convenio:document.getElementById('enc-convenio')?.value || p.convenio || p.plano || '',
      valorPrevisto:this.parseMoney(document.getElementById('enc-valor')?.value || ''),
      origem:'encaixe_atendimento_avulso',
      criadoEm:new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',item);
    Modal.close();
    Utils.toast('Paciente colocado na fila.');
    Router.go('atendimento');
  };
})();




/* =========================================================
   ZERO V10.2 — Fila atual mostra Tipo, Profissional e Status corretos
   Correção:
   - Tipo na fila atual mostra Consulta, Retorno ou Procedimento.
   - Profissional mostra o profissional agendado.
   - Status aparece na coluna própria.
   - Se veio da agenda, busca origemAgendaId para completar dados.
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__filaTipoProfStatusV102) return;
  Atendimento.__filaTipoProfStatusV102=true;

  Atendimento.agendaOrigemV102=function(a){
    if(!a) return {};
    const agendaId=a.origemAgendaId || a.agendaId || a.atendimentoAgendaId || '';
    if(!agendaId) return {};
    return (Store.get('AGENDA_MEDICA')||[]).find(x=>String(x.id)===String(agendaId)) || {};
  };

  Atendimento.tipoFilaV102=function(a){
    const ag=this.agendaOrigemV102(a);
    const raw=String(a.tipoConsulta || ag.tipoConsulta || a.tipo || ag.tipo || 'Consulta').trim().toLowerCase();

    if(raw.includes('proced')) return 'Procedimento';
    if(raw.includes('retorno')) return 'Retorno';
    return 'Consulta';
  };

  Atendimento.profissionalFilaV102=function(a){
    const ag=this.agendaOrigemV102(a);
    const profId=a.profissionalId || ag.profissionalId || a.medicoId || ag.medicoId || '';
    const prof=Store.get('PROFISSIONAIS').find(p=>String(p.id)===String(profId)) || {};
    return a.profissional || ag.profissional || a.medico || ag.medico || prof.nome || '—';
  };

  Atendimento.statusFilaV102=function(a){
    return a.status || this.agendaOrigemV102(a).status || 'Aguardando';
  };
})();

/* ZERO V10.2 — Render Fila atual corrigida */
(function(){
  if(!window.App || App.__filaTipoProfStatusV102) return;
  App.__filaTipoProfStatusV102=true;

  App.renderAtendimento=function(){
    const aguardando=Atendimento.aguardando();
    const emAtendimento=Atendimento.emAtendimentoLista();
    const finalizados=Atendimento.finalizadosHoje();
    const ativos=aguardando.concat(emAtendimento);

    document.getElementById('content').innerHTML=`
      <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
      <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

      <div class="zero-fila-kpis">
        ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
        ${this.kpiSmall('✅', finalizados.length, 'Finalizados hoje', 'green')}
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Fila atual</div>
          <button class="btn btn-blue" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
        </div>
        <div class="zero-wide-body">
          ${ativos.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${ativos.map(a=>`
                  <tr>
                    <td>
                      <strong>${Utils.esc(a.paciente||'')}</strong>
                      <div class="doc-sub">${Utils.esc(a.convenio||'')}</div>
                    </td>
                    <td>
                      <span class="fila-tipo-badge tipo-${Utils.norm(Atendimento.tipoFilaV102(a))}">
                        ${Utils.esc(Atendimento.tipoFilaV102(a))}
                      </span>
                    </td>
                    <td>
                      <strong>${Utils.esc(Atendimento.profissionalFilaV102(a))}</strong>
                    </td>
                    <td>${this.statusBadge(Atendimento.statusFilaV102(a))}</td>
                    <td>
                      <div class="row gap">
                        ${a.status==='Aguardando'?`<button class="btn btn-sm btn-blue" onclick="Atendimento.iniciar('${a.id}')">Atender</button>`:''}
                        ${a.status==='Em atendimento'?`<button class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${a.pacId}','${a.id}')">Registrar Consulta</button>`:''}
                        <button class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${a.pacId}')">Prontuário</button>
                        ${a.status==='Aguardando'?`<button class="btn btn-sm btn-red" onclick="Atendimento.cancelar('${a.id}')">Tirar da fila</button>`:''}
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
        </div>
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Atendidos hoje</div>
        </div>
        <div class="zero-wide-body">
          ${finalizados.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${finalizados.map(a=>`<tr class="zero-atendido-click" onclick="Atendimento.verHistoricoDia('${a.pacId}')">
                  <td>${Utils.esc(a.horaFim||'—')}</td>
                  <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                  <td>${Utils.esc(Atendimento.tipoFilaV102(a))}</td>
                  <td>${Utils.esc(Atendimento.profissionalFilaV102(a))}</td>
                  <td>${this.statusBadge('Finalizado')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
        </div>
      </div>
    `;
  };
})();




/* =========================================================
   ZERO V10.4 — Menu lateral separado: Fila de Atendimento
   Foi restaurado o item próprio no menu lateral, sem depender da tela Início.
   A rota interna continua "atendimento".
========================================================= */
(function(){
  if(window.__FilaAtendimentoMenuLateralV104) return;
  window.__FilaAtendimentoMenuLateralV104=true;

  function garantirMenuFila(){
    const nav=document.querySelector('#sidebar .nav, aside .nav, .cm-sidebar .nav');
    if(!nav) return;

    let btn=nav.querySelector('[data-route="atendimento"]');
    if(!btn){
      const inicio=nav.querySelector('[data-route="inicio"]');
      btn=document.createElement('button');
      btn.setAttribute('data-route','atendimento');
      btn.setAttribute('onclick',"Router.go('atendimento')");
      btn.innerHTML='🩺 <span>Fila de Atendimento</span>';
      if(inicio && inicio.nextSibling) nav.insertBefore(btn,inicio.nextSibling);
      else nav.insertBefore(btn,nav.firstChild);
    }else{
      btn.innerHTML='🩺 <span>Fila de Atendimento</span>';
      btn.setAttribute('onclick',"Router.go('atendimento')");
    }
    btn.setAttribute('title','Fila de Atendimento');

    try{ window.PermissoesPerfil?.applyMenuVisibility(true); }catch(e){}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    garantirMenuFila();
    setTimeout(garantirMenuFila,80);
    setTimeout(garantirMenuFila,350);
  });

  const oldRenderAtendimento=window.App && App.renderAtendimento ? App.renderAtendimento.bind(App) : null;
  if(oldRenderAtendimento && !App.__filaAtendimentoTituloV104){
    App.__filaAtendimentoTituloV104=true;
    App.renderAtendimento=function(){
      const ret=oldRenderAtendimento();
      const title=document.querySelector('#content .zero-page-title');
      if(title) title.textContent='🩺 Fila de Atendimento';
      garantirMenuFila();
      return ret;
    };
  }
})();




/* =========================================================
   ZERO V10.5 — Ícone Agenda Procedimentos diferente da Fila
   Fila de Atendimento permanece 🩺
   Agenda Procedimentos passa para 🧪
========================================================= */
(function(){
  if(window.__IconeAgendaProcedimentosV105) return;
  window.__IconeAgendaProcedimentosV105=true;

  function ajustarIconeAgendaProcedimentos(){
    document.querySelectorAll('[data-route="agendaProcedimentos"]').forEach(btn=>{
      btn.setAttribute('title','Agenda Procedimentos');
      if(btn.innerHTML.includes('Agenda Procedimentos')){
        btn.innerHTML='🧪 <span>Agenda Procedimentos</span>';
      }
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ajustarIconeAgendaProcedimentos();
    setTimeout(ajustarIconeAgendaProcedimentos,100);
    setTimeout(ajustarIconeAgendaProcedimentos,400);
  });

  const oldInit=window.App && App.init ? App.init.bind(App) : null;
  if(oldInit && !App.__iconeAgendaProcedimentosV105){
    App.__iconeAgendaProcedimentosV105=true;
    App.init=function(){
      const ret=oldInit();
      setTimeout(ajustarIconeAgendaProcedimentos,80);
      return ret;
    };
  }
})();




/* =========================================================
   ZERO V11.6 — Fila: Não aguardou + aparece em Atendidos hoje
   - Ações da fila têm botão "Não aguardou".
   - Status fica "Não aguardou".
   - Sai da Fila atual.
   - Aparece em Atendidos hoje com status próprio.
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__naoAguardouV116) return;
  Atendimento.__naoAguardouV116=true;

  Atendimento.naoAguardou=function(id){
    const item=this.lista().find(x=>String(x.id)===String(id));
    if(!item) return Utils.toast('Atendimento não encontrado.');

    const ok=confirm('Marcar paciente como "Não aguardou" e tirar da fila atual?');
    if(!ok) return;

    item.status='Não aguardou';
    item.naoAguardouEm=new Date().toISOString();
    item.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    item.finalizadoEm=item.naoAguardouEm;
    Store.upsert('ATENDIMENTOS',item);

    if(item.origemAgendaId){
      const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status='Não aguardou';
        ag.atendimentoId=item.id;
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }

    Utils.toast('Paciente marcado como Não aguardou.');
    Router.go('atendimento');
  };

  const oldFinalizadosHoje=Atendimento.finalizadosHoje?.bind(Atendimento);
  Atendimento.finalizadosHoje=function(){
    return this.lista().filter(a=>
      (a.status==='Finalizado' || a.status==='Não aguardou' || a.status==='Cancelado') &&
      (a.data===this.hoje() || String(a.finalizadoEm||a.naoAguardouEm||a.canceladoEm||'').slice(0,10)===new Date().toISOString().slice(0,10))
    );
  };

  const oldStatusBadge=window.App?.statusBadge?.bind(App);
  if(window.App){
    App.statusBadge=function(st){
      if(st==='Não aguardou') return `<span class="fila-status fila-nao-aguardou">Não aguardou</span>`;
      if(st==='Cancelado') return `<span class="fila-status fila-cancelado">Cancelado</span>`;
      return oldStatusBadge ? oldStatusBadge(st) : `<span class="fila-status">${Utils.esc(st||'')}</span>`;
    };

    App.renderAtendimento=function(){
      const aguardando=Atendimento.aguardando();
      const emAtendimento=Atendimento.emAtendimentoLista();
      const finalizados=Atendimento.finalizadosHoje();
      const ativos=aguardando.concat(emAtendimento);

      document.getElementById('content').innerHTML=`
        <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
        <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

        <div class="zero-fila-kpis">
          ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
          ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
          ${this.kpiSmall('✅', finalizados.length, 'Atendidos / saídas hoje', 'green')}
        </div>

        <div class="zero-wide-panel">
          <div class="zero-wide-head">
            <div class="zero-wide-title">Fila atual</div>
            <button class="btn btn-blue" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
          </div>
          <div class="zero-wide-body">
            ${ativos.length?`
              <table class="zero-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Tipo</th>
                    <th>Profissional</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${ativos.map(a=>`
                    <tr>
                      <td>
                        <strong>${Utils.esc(a.paciente||'')}</strong>
                        <div class="doc-sub">${Utils.esc(a.convenio||'')}</div>
                      </td>
                      <td>
                        <span class="fila-tipo-badge tipo-${Utils.norm(Atendimento.tipoFilaV102 ? Atendimento.tipoFilaV102(a) : (a.tipo||'Consulta'))}">
                          ${Utils.esc(Atendimento.tipoFilaV102 ? Atendimento.tipoFilaV102(a) : (a.tipo||'Consulta'))}
                        </span>
                      </td>
                      <td><strong>${Utils.esc(Atendimento.profissionalFilaV102 ? Atendimento.profissionalFilaV102(a) : (a.profissional||'—'))}</strong></td>
                      <td>${this.statusBadge(Atendimento.statusFilaV102 ? Atendimento.statusFilaV102(a) : a.status)}</td>
                      <td>
                        <div class="row gap">
                          ${a.status==='Aguardando'?`<button class="btn btn-sm btn-blue" onclick="Atendimento.iniciar('${a.id}')">Atender</button>`:''}
                          ${a.status==='Em atendimento'?`<button class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${a.pacId}','${a.id}')">Registrar Consulta</button>`:''}
                          <button class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${a.pacId}')">Prontuário</button>
                          ${a.status==='Aguardando'?`<button class="btn btn-sm btn-orange" onclick="Atendimento.naoAguardou('${a.id}')">Não aguardou</button>`:''}
                          ${a.status==='Aguardando'?`<button class="btn btn-sm btn-red" onclick="Atendimento.cancelar('${a.id}')">Tirar da fila</button>`:''}
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
          </div>
        </div>

        <div class="zero-wide-panel">
          <div class="zero-wide-head">
            <div class="zero-wide-title">Atendidos hoje</div>
          </div>
          <div class="zero-wide-body">
            ${finalizados.length?`
              <table class="zero-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>Tipo</th>
                    <th>Profissional</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${finalizados.map(a=>`<tr class="zero-atendido-click" onclick="Atendimento.verHistoricoDia('${a.pacId}')">
                    <td>${Utils.esc(a.horaFim||'—')}</td>
                    <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                    <td>${Utils.esc(Atendimento.tipoFilaV102 ? Atendimento.tipoFilaV102(a) : (a.tipo||'Consulta'))}</td>
                    <td>${Utils.esc(Atendimento.profissionalFilaV102 ? Atendimento.profissionalFilaV102(a) : (a.profissional||'—'))}</td>
                    <td>${this.statusBadge(a.status||'Finalizado')}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
          </div>
        </div>
      `;
    };
  }
})();




/* =========================================================
   ZERO V12.4 — Fila: horário agendado e horário de chegada
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__horariosFilaV124) return;
  Atendimento.__horariosFilaV124=true;

  Atendimento.horaAgendadaV124=function(a){
    return a.horaAgendada||a.horaAgenda||a.agendaHora||a.hora||'—';
  };

  Atendimento.horaChegadaV124=function(a){
    return a.horaChegada||a.chegouHora||a.horaEntrada||a.horaInicio||a.hora||'—';
  };

  const oldColocarV124=Atendimento.colocarNaFila?.bind(Atendimento);
  Atendimento.colocarNaFila=function(pacId,tipo='Consulta',obs=''){
    const ret=oldColocarV124 ? oldColocarV124(pacId,tipo,obs) : undefined;
    try{
      const item=(Store.get('ATENDIMENTOS')||[])
        .filter(a=>String(a.pacId||a.pacienteId)===String(pacId))
        .sort((a,b)=>(Date.parse(b.criadoEm||'')||0)-(Date.parse(a.criadoEm||'')||0))[0];
      if(item && !item.horaChegada){
        item.horaChegada=item.hora||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        item.encaixe=true;
        Store.upsert('ATENDIMENTOS',item);
      }
    }catch(e){}
    return ret;
  };

  if(window.App){
    App.renderAtendimento=function(){
      const aguardando=Atendimento.aguardando();
      const emAtendimento=Atendimento.emAtendimentoLista();
      const finalizados=Atendimento.finalizadosHoje();
      const ativos=aguardando.concat(emAtendimento);

      document.getElementById('content').innerHTML=`
        <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
        <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

        <div class="zero-fila-kpis">
          ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
          ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
          ${this.kpiSmall('✅', finalizados.length, 'Atendidos / saídas hoje', 'green')}
        </div>

        <div class="zero-wide-panel">
          <div class="zero-wide-head">
            <div class="zero-wide-title">Fila atual</div>
            <button class="btn btn-blue" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
          </div>
          <div class="zero-wide-body">
            ${ativos.length?`
              <table class="zero-table">
                <thead>
                  <tr>
                    <th>Agendado</th>
                    <th>Chegada</th>
                    <th>Paciente</th>
                    <th>Tipo</th>
                    <th>Profissional</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${ativos.map(a=>`
                    <tr>
                      <td>${Utils.esc(a.encaixe?'Encaixe':Atendimento.horaAgendadaV124(a))}</td>
                      <td>${Utils.esc(Atendimento.horaChegadaV124(a))}</td>
                      <td><strong>${Utils.esc(a.paciente||'')}</strong><div class="doc-sub">${Utils.esc(a.convenio||'')}</div></td>
                      <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                      <td><strong>${Utils.esc(a.profissional||'—')}</strong></td>
                      <td>${this.statusBadge(a.status)}</td>
                      <td>
                        <div class="row gap">
                          ${a.status==='Aguardando'?`<button class="btn btn-sm btn-blue" onclick="Atendimento.iniciar('${a.id}')">Atender</button>`:''}
                          ${a.status==='Em atendimento'?`<button class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${a.pacId}','${a.id}')">Registrar Consulta</button>`:''}
                          <button class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${a.pacId}')">Prontuário</button>
                          ${a.status==='Aguardando'?`<button class="btn btn-sm btn-orange" onclick="Atendimento.naoAguardou('${a.id}')">Não aguardou</button>`:''}
                          ${a.status==='Aguardando'?`<button class="btn btn-sm btn-red" onclick="Atendimento.cancelar('${a.id}')">Tirar da fila</button>`:''}
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
          </div>
        </div>

        <div class="zero-wide-panel">
          <div class="zero-wide-head"><div class="zero-wide-title">Atendidos hoje</div></div>
          <div class="zero-wide-body">
            ${finalizados.length?`
              <table class="zero-table">
                <thead><tr><th>Hora</th><th>Paciente</th><th>Tipo</th><th>Profissional</th><th>Status</th></tr></thead>
                <tbody>
                  ${finalizados.map(a=>`<tr class="zero-atendido-click" onclick="Atendimento.verHistoricoDia('${a.pacId}')">
                    <td>${Utils.esc(a.horaFim||'—')}</td>
                    <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                    <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                    <td>${Utils.esc(a.profissional||'—')}</td>
                    <td>${this.statusBadge(a.status||'Finalizado')}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
          </div>
        </div>
      `;
    };
  }
})();




/* =========================================================
   ZERO V12.5 — Atender abre Registrar Consulta estável
   Correções:
   - Ao clicar em Atender na fila, não troca para prontuário antes.
   - Abre direto o modal Registrar Consulta, sem piscar a tela inteira.
   - A lista/fila só atualiza depois, sem re-render visual antes do modal.
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__atenderEstavelV125) return;
  Atendimento.__atenderEstavelV125=true;

  Atendimento.iniciar=function(id){
    const item=this.lista().find(x=>String(x.id)===String(id));
    if(!item) return Utils.toast('Atendimento não encontrado.');

    document.body.classList.add('fila-atender-stable-v125');

    item.status='Em atendimento';
    item.iniciadoEm=item.iniciadoEm||new Date().toISOString();
    item.horaInicio=item.horaInicio||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    item.horaChegada=item.horaChegada||item.chegouHora||item.hora||item.horaInicio;
    Store.upsert('ATENDIMENTOS',item);

    // Abre direto o modal, sem Prontuario.abrir antes para evitar piscar tela.
    if(window.RegistrarConsulta?.open){
      requestAnimationFrame(()=>{
        RegistrarConsulta.open(item.pacId,item.id);
        requestAnimationFrame(()=>document.body.classList.remove('fila-atender-stable-v125'));
      });
    }else{
      document.body.classList.remove('fila-atender-stable-v125');
      Router.go('atendimento');
    }
  };
})();




/* =========================================================
   ZERO V12.6 — Encaixe/Atendimento avulso alimenta/remove financeiro
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__financeiroEncaixeV126) return;
  Atendimento.__financeiroEncaixeV126=true;

  Atendimento.parseMoneyV126=function(v){
    if(typeof v==='number') return v;
    let s=String(v||'').trim();
    if(!s) return 0;
    s=s.replace(/[R$\s.]/g,'').replace(',','.');
    return Number(s)||0;
  };

  const oldModalEncaixeV126=Atendimento.modalEncaixe?.bind(Atendimento);
  Atendimento.modalEncaixe=function(){
    const ret=oldModalEncaixeV126 ? oldModalEncaixeV126() : undefined;
    setTimeout(()=>{
      const obs=document.getElementById('enc-obs');
      if(obs && !document.getElementById('enc-valor')){
        const div=document.createElement('div');
        div.className='span-2';
        div.innerHTML=`<label>Valor da consulta</label><input id="enc-valor" placeholder="R$ 0,00">`;
        obs.closest('.span-4')?.insertAdjacentElement('beforebegin',div);
      }
    },40);
    return ret;
  };

  Atendimento.salvarEncaixeModal=function(){
    const pacId=document.getElementById('enc-pac').value;
    const tipo=document.getElementById('enc-tipo').value;
    const obs=document.getElementById('enc-obs').value;
    const valor=this.parseMoneyV126(document.getElementById('enc-valor')?.value||'');
    if(!pacId) return Utils.toast('Selecione o paciente.');

    const p=Store.get('PACIENTES').find(x=>x.id===pacId);
    if(!p) return Utils.toast('Paciente não encontrado.');

    const prof=window.Profissionais?.atual ? (Profissionais.atual()||{}) : {};
    const agora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

    const item={
      id:Utils.id('ATD'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome,
      profissionalId:prof.id||'',
      profissional:prof.nome||'',
      tipo:tipo||'Consulta',
      tipoConsulta:tipo||'Consulta',
      obs:obs||'',
      status:'Aguardando',
      data:this.hoje(),
      hora:agora,
      horaChegada:agora,
      encaixe:true,
      valorPrevisto:valor,
      origem:'encaixe_atendimento_avulso',
      criadoEm:new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',item);
    if(window.Financeiro?.upsertReceitaAutomaticaV126){
      Financeiro.upsertReceitaAutomaticaV126('encaixe',item);
    }

    Modal.close();
    Utils.toast('Paciente colocado na fila.');
    Router.go('atendimento');
  };

  const oldCancelarV126=Atendimento.cancelar?.bind(Atendimento);
  Atendimento.cancelar=function(id){
    if(window.Financeiro?.removerReceitaAutomaticaV126){
      Financeiro.removerReceitaAutomaticaV126('encaixe',id);
    }
    return oldCancelarV126 ? oldCancelarV126(id) : undefined;
  };

  const oldNaoAguardouV126=Atendimento.naoAguardou?.bind(Atendimento);
  if(oldNaoAguardouV126){
    Atendimento.naoAguardou=function(id){
      if(window.Financeiro?.removerReceitaAutomaticaV126){
        Financeiro.removerReceitaAutomaticaV126('encaixe',id);
      }
      return oldNaoAguardouV126(id);
    };
  }
})();




/* =========================================================
   ZERO V13.2 — Colocar na fila corrigido
   Correções:
   - Encaixe / Atendimento avulso volta a colocar na fila.
   - Botão "Colocar na fila" fica protegido contra submit/duplo clique.
   - Remove dependência de funções antigas com erro.
   - Mantém integração com Financeiro quando houver valor.
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__colocarFilaFixV132) return;
  Atendimento.__colocarFilaFixV132=true;

  Atendimento.horaAtualV132=function(){
    return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  };

  Atendimento.parseMoneyV132=function(v){
    if(typeof v==='number') return v;
    let s=String(v||'').trim();
    if(!s) return 0;
    s=s.replace(/[R$\s.]/g,'').replace(',','.');
    return Number(s)||0;
  };

  Atendimento.colocarNaFila=function(pacId,tipo='Consulta',obs='',extra={}){
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const existente=(Store.get('ATENDIMENTOS')||[]).find(a=>
      String(a.pacId||a.pacienteId)===String(pacId) &&
      (a.status==='Aguardando'||a.status==='Em atendimento')
    );
    if(existente){
      Utils.toast('Paciente já está na fila ou em atendimento.');
      Router.go('atendimento');
      return false;
    }

    const prof=window.Profissionais?.atual ? (Profissionais.atual()||{}) : {};
    const agora=this.horaAtualV132();

    const item={
      id:extra.id||Utils.id('ATD'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome||'',
      profissionalId:extra.profissionalId||prof.id||'',
      profissional:extra.profissional||prof.nome||'',
      tipo:tipo||'Consulta',
      tipoConsulta:tipo||'Consulta',
      obs:obs||extra.obs||'',
      queixa:extra.queixa||obs||'',
      status:'Aguardando',
      data:extra.data||this.hoje(),
      hora:extra.hora||agora,
      horaAgendada:extra.horaAgendada||extra.hora||'',
      horaChegada:extra.horaChegada||agora,
      encaixe:extra.encaixe!==false,
      valorPrevisto:Number(extra.valorPrevisto||0),
      origem:extra.origem||'encaixe_atendimento_avulso',
      origemAgendaId:extra.origemAgendaId||'',
      criadoEm:extra.criadoEm||new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',item);

    if(item.valorPrevisto && window.Financeiro?.upsertReceitaAutomaticaV126){
      Financeiro.upsertReceitaAutomaticaV126(item.origemAgendaId?'agenda':'encaixe',item);
    }

    Utils.toast('Paciente colocado na fila.');
    Router.go('atendimento');
    return true;
  };

  Atendimento.modalEncaixe=function(){
    const pacientes=Store.get('PACIENTES').filter(p=>p.ativo!==false).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
    const prof=window.Profissionais?.atual ? (Profissionais.atual()||{}) : {};

    Modal.open('➕ Encaixe / Atendimento avulso',`
      <div class="cm-section">
        <div class="cm-section-title">👤 Paciente</div>
        <div class="cm-form-grid">
          <div class="span-4">
            <label>Paciente</label>
            <select id="enc-pac">
              <option value="">Selecione o paciente</option>
              ${pacientes.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)} ${p.cpf?`- ${Utils.esc(p.cpf)}`:''}</option>`).join('')}
            </select>
          </div>

          <div class="span-2">
            <label>Tipo de atendimento</label>
            <select id="enc-tipo">
              <option>Consulta</option>
              <option>Retorno</option>
              <option>Encaixe</option>
              <option>Procedimento</option>
              <option>Urgência</option>
              <option>Emergência</option>
            </select>
          </div>

          <div class="span-2">
            <label>Profissional</label>
            <input id="enc-profissional" value="${Utils.esc(prof.nome||'')}" disabled>
          </div>

          <div class="span-2">
            <label>Valor da consulta</label>
            <input id="enc-valor" placeholder="R$ 0,00">
          </div>

          <div class="span-4">
            <label>Observação / Queixa</label>
            <textarea id="enc-obs" rows="3" placeholder="Observação do encaixe ou atendimento"></textarea>
          </div>
        </div>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      <button type="button" class="btn btn-blue" id="btn-colocar-fila-v132" onclick="Atendimento.salvarEncaixeModal()">Colocar na fila</button>
    `,'lg');

    setTimeout(()=>{
      const btn=document.getElementById('btn-colocar-fila-v132');
      if(btn){
        btn.onclick=function(ev){
          if(ev){ev.preventDefault();ev.stopPropagation();}
          return Atendimento.salvarEncaixeModal();
        };
      }
    },50);
  };

  Atendimento.salvarEncaixeModal=function(){
    const btn=document.getElementById('btn-colocar-fila-v132');
    if(btn){
      btn.disabled=true;
      btn.textContent='Colocando...';
    }

    try{
      const pacId=document.getElementById('enc-pac')?.value||'';
      const tipo=document.getElementById('enc-tipo')?.value||'Consulta';
      const obs=document.getElementById('enc-obs')?.value||'';
      const valor=this.parseMoneyV132(document.getElementById('enc-valor')?.value||'');

      if(!pacId){
        if(btn){btn.disabled=false;btn.textContent='Colocar na fila';}
        return Utils.toast('Selecione o paciente.');
      }

      Modal.close();
      return this.colocarNaFila(pacId,tipo,obs,{valorPrevisto:valor,encaixe:true,origem:'encaixe_atendimento_avulso'});
    }catch(e){
      console.error('Erro ao colocar na fila V13.2',e);
      if(btn){btn.disabled=false;btn.textContent='Colocar na fila';}
      Utils.toast('Erro ao colocar na fila.');
      return false;
    }
  };
})();




/* =========================================================
   ZERO V13.6 — Fila de Atendimento com ações completas
   Restaura as ações que existiam na fila:
   - Atender
   - Registrar Consulta
   - Prontuário
   - Histórico hoje
   - Não aguardou
   - Tirar da fila
========================================================= */
(function(){
  if(!window.App || !window.Atendimento || App.__filaAcoesCompletasV136) return;
  App.__filaAcoesCompletasV136=true;

  Atendimento.horaAgendadaV136=function(a){
    if(a.encaixe) return 'Encaixe';
    return a.horaAgendada||a.horaAgenda||a.agendaHora||a.hora||'—';
  };

  Atendimento.horaChegadaV136=function(a){
    return a.horaChegada||a.chegouHora||a.horaEntrada||a.horaInicio||a.hora||'—';
  };

  if(!Atendimento.naoAguardou){
    Atendimento.naoAguardou=function(id){
      const item=this.lista().find(x=>String(x.id)===String(id));
      if(!item) return Utils.toast('Atendimento não encontrado.');
      item.status='Não aguardou';
      item.naoAguardouEm=new Date().toISOString();
      item.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      Store.upsert('ATENDIMENTOS',item);
      if(item.origemAgendaId){
        const ag=Store.get('AGENDA_MEDICA').find(a=>String(a.id)===String(item.origemAgendaId));
        if(ag){
          ag.status='Não aguardou';
          Store.upsert('AGENDA_MEDICA',ag);
        }
      }
      Utils.toast('Marcado como não aguardou.');
      Router.go('atendimento');
    };
  }

  const oldFinalizadosHojeV136=Atendimento.finalizadosHoje?.bind(Atendimento);
  Atendimento.finalizadosHoje=function(){
    const hoje=this.hoje();
    return this.lista().filter(a=>['Finalizado','Não aguardou','Cancelado'].includes(a.status) && a.data===hoje);
  };

  App.acoesFilaV136=function(a){
    return `<div class="fila-actions-v136">
      ${a.status==='Aguardando'?`<button class="btn btn-sm btn-blue" onclick="Atendimento.iniciar('${a.id}')">Atender</button>`:''}
      ${a.status==='Em atendimento'?`<button class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${a.pacId||a.pacienteId}','${a.id}')">Registrar Consulta</button>`:''}
      <button class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${a.pacId||a.pacienteId}')">Prontuário</button>
      <button class="btn btn-sm btn-outline" onclick="Atendimento.verHistoricoDia('${a.pacId||a.pacienteId}')">Histórico hoje</button>
      ${a.status==='Aguardando'?`<button class="btn btn-sm btn-orange" onclick="Atendimento.naoAguardou('${a.id}')">Não aguardou</button>`:''}
      ${a.status==='Aguardando'?`<button class="btn btn-sm btn-red" onclick="Atendimento.cancelar('${a.id}')">Tirar da fila</button>`:''}
    </div>`;
  };

  App.renderAtendimento=function(){
    const aguardando=Atendimento.aguardando();
    const emAtendimento=Atendimento.emAtendimentoLista();
    const finalizados=Atendimento.finalizadosHoje();
    const ativos=aguardando.concat(emAtendimento);

    document.getElementById('content').innerHTML=`
      <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
      <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

      <div class="zero-fila-kpis">
        ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
        ${this.kpiSmall('✅', finalizados.length, 'Atendidos / saídas hoje', 'green')}
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Fila atual</div>
          <button class="btn btn-blue" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
        </div>
        <div class="zero-wide-body">
          ${ativos.length?`
            <table class="zero-table fila-table-v136">
              <thead>
                <tr>
                  <th>Agendado</th>
                  <th>Chegada</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                  <th style="min-width:360px;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${ativos.map(a=>`
                  <tr>
                    <td>${Utils.esc(Atendimento.horaAgendadaV136(a))}</td>
                    <td>${Utils.esc(Atendimento.horaChegadaV136(a))}</td>
                    <td>
                      <strong>${Utils.esc(a.paciente||'')}</strong>
                      ${a.obs?`<div class="doc-sub">${Utils.esc(a.obs)}</div>`:''}
                    </td>
                    <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                    <td>${Utils.esc(a.profissional||'—')}</td>
                    <td>${this.statusBadge(a.status)}</td>
                    <td>${this.acoesFilaV136(a)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
        </div>
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head"><div class="zero-wide-title">Atendidos hoje</div></div>
        <div class="zero-wide-body">
          ${finalizados.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${finalizados.map(a=>`<tr class="zero-atendido-click" onclick="Atendimento.verHistoricoDia('${a.pacId||a.pacienteId}')">
                  <td>${Utils.esc(a.horaFim||a.horaChegada||'—')}</td>
                  <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                  <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                  <td>${Utils.esc(a.profissional||'—')}</td>
                  <td>${this.statusBadge(a.status||'Finalizado')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
        </div>
      </div>
    `;
  };
})();




/* =========================================================
   ZERO V13.8 — Fila: ações iguais ao original do print
   Ações corretas:
   - Registrar Consulta
   - Prontuário
   - Histórico hoje
   Remove:
   - Tirar da fila
   - Não aguardou
   - Atender separado
========================================================= */
(function(){
  if(!window.App || !window.Atendimento || App.__filaAcoesOriginalPrintV138) return;
  App.__filaAcoesOriginalPrintV138=true;

  Atendimento.horaAgendadaV138=function(a){
    if(a.encaixe) return 'Encaixe';
    return a.horaAgendada||a.horaAgenda||a.agendaHora||a.hora||'—';
  };

  Atendimento.horaChegadaV138=function(a){
    return a.horaChegada||a.chegouHora||a.horaEntrada||a.horaInicio||a.hora||'—';
  };

  App.acoesFilaV138=function(a){
    const pacId=a.pacId||a.pacienteId||'';
    return `<div class="fila-actions-original-v138">
      <button class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${pacId}','${a.id}')">Registrar Consulta</button>
      <button class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${pacId}')">Prontuário</button>
      <button class="btn btn-sm btn-outline" onclick="Atendimento.verHistoricoDia('${pacId}')">Histórico hoje</button>
    </div>`;
  };

  App.renderAtendimento=function(){
    const aguardando=Atendimento.aguardando();
    const emAtendimento=Atendimento.emAtendimentoLista();
    const finalizados=Atendimento.finalizadosHoje ? Atendimento.finalizadosHoje() : [];
    const ativos=aguardando.concat(emAtendimento);

    document.getElementById('content').innerHTML=`
      <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
      <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

      <div class="zero-fila-kpis">
        ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
        ${this.kpiSmall('✅', finalizados.length, 'Atendidos hoje', 'green')}
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Fila atual</div>
          <button class="btn btn-blue" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
        </div>
        <div class="zero-wide-body">
          ${ativos.length?`
            <table class="zero-table fila-table-v138">
              <thead>
                <tr>
                  <th>Agendado</th>
                  <th>Chegada</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                  <th class="acoes-col-v138">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${ativos.map(a=>`
                  <tr>
                    <td>${Utils.esc(Atendimento.horaAgendadaV138(a))}</td>
                    <td>${Utils.esc(Atendimento.horaChegadaV138(a))}</td>
                    <td>
                      <strong>${Utils.esc(a.paciente||'')}</strong>
                      ${a.obs?`<div class="doc-sub">${Utils.esc(a.obs)}</div>`:''}
                    </td>
                    <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                    <td>${Utils.esc(a.profissional||'—')}</td>
                    <td>${this.statusBadge(a.status)}</td>
                    <td>${this.acoesFilaV138(a)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
        </div>
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head"><div class="zero-wide-title">Atendidos hoje</div></div>
        <div class="zero-wide-body">
          ${finalizados.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${finalizados.map(a=>`<tr class="zero-atendido-click" onclick="Atendimento.verHistoricoDia('${a.pacId||a.pacienteId}')">
                  <td>${Utils.esc(a.horaFim||a.horaChegada||'—')}</td>
                  <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                  <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                  <td>${Utils.esc(a.profissional||'—')}</td>
                  <td>${this.statusBadge(a.status||'Finalizado')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
        </div>
      </div>
    `;
  };
})();




/* =========================================================
   ZERO V14.0 — Fila: somente as 3 ações originais
   Correção final:
   - Remove qualquer ação antiga que tenha ficado no JS.
   - A coluna Ações mostra somente:
     Registrar Consulta, Prontuário, Histórico hoje.
========================================================= */
(function(){
  if(!window.App || !window.Atendimento || App.__filaSomenteAcoesOriginaisV140) return;
  App.__filaSomenteAcoesOriginaisV140=true;

  Atendimento.horaAgendadaV140=function(a){
    if(a.encaixe) return 'Encaixe';
    return a.horaAgendada||a.horaAgenda||a.agendaHora||a.hora||'—';
  };

  Atendimento.horaChegadaV140=function(a){
    return a.horaChegada||a.chegouHora||a.horaEntrada||a.horaInicio||a.hora||'—';
  };

  App.acoesFilaV140=function(a){
    const pacId=a.pacId||a.pacienteId||'';
    return `<div class="fila-actions-original-v140">
      <button type="button" class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${pacId}','${a.id}')">Registrar Consulta</button>
      <button type="button" class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${pacId}')">Prontuário</button>
      <button type="button" class="btn btn-sm btn-outline" onclick="Atendimento.verHistoricoDia('${pacId}')">Histórico hoje</button>
    </div>`;
  };

  App.renderFilaOriginalV140=function(){
    const aguardando=Atendimento.aguardando ? Atendimento.aguardando() : [];
    const emAtendimento=Atendimento.emAtendimentoLista ? Atendimento.emAtendimentoLista() : [];
    const finalizados=Atendimento.finalizadosHoje ? Atendimento.finalizadosHoje() : [];
    const ativos=aguardando.concat(emAtendimento);

    const content=document.getElementById('content');
    if(!content) return;

    content.innerHTML=`
      <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
      <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

      <div class="zero-fila-kpis">
        ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
        ${this.kpiSmall('✅', finalizados.length, 'Atendidos hoje', 'green')}
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Fila atual</div>
          <button type="button" class="btn btn-blue" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
        </div>
        <div class="zero-wide-body">
          ${ativos.length?`
            <table class="zero-table fila-table-v140">
              <thead>
                <tr>
                  <th>Agendado</th>
                  <th>Chegada</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                  <th class="acoes-col-v140">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${ativos.map(a=>`
                  <tr>
                    <td>${Utils.esc(Atendimento.horaAgendadaV140(a))}</td>
                    <td>${Utils.esc(Atendimento.horaChegadaV140(a))}</td>
                    <td>
                      <strong>${Utils.esc(a.paciente||'')}</strong>
                      ${a.obs?`<div class="doc-sub">${Utils.esc(a.obs)}</div>`:''}
                    </td>
                    <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                    <td>${Utils.esc(a.profissional||'—')}</td>
                    <td>${this.statusBadge(a.status)}</td>
                    <td>${this.acoesFilaV140(a)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
        </div>
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head"><div class="zero-wide-title">Atendidos hoje</div></div>
        <div class="zero-wide-body">
          ${finalizados.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${finalizados.map(a=>`<tr class="zero-atendido-click" onclick="Atendimento.verHistoricoDia('${a.pacId||a.pacienteId}')">
                  <td>${Utils.esc(a.horaFim||a.horaChegada||'—')}</td>
                  <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                  <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                  <td>${Utils.esc(a.profissional||'—')}</td>
                  <td>${this.statusBadge(a.status||'Finalizado')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
        </div>
      </div>
    `;
  };

  App.renderAtendimento=function(){ return this.renderFilaOriginalV140(); };
  App.renderFilaAtendimento=function(){ return this.renderFilaOriginalV140(); };
  App.renderFila=function(){ return this.renderFilaOriginalV140(); };

  // Limpeza de qualquer botão antigo se alguma rotina atrasada mexer na tela.
  App.limparAcoesAntigasFilaV140=function(){
    document.querySelectorAll('.fila-actions-v136 button,.fila-actions-original-v138 button,.fila-actions-original-v140 button').forEach(btn=>{
      const t=String(btn.textContent||'').trim().toLowerCase();
      if(t.includes('tirar da fila') || t.includes('não aguardou') || t.includes('nao aguardou') || t==='atender'){
        btn.remove();
      }
    });
  };

  setInterval(()=>App.limparAcoesAntigasFilaV140 && App.limparAcoesAntigasFilaV140(),800);
})();




/* =========================================================
   ZERO V14.1 — Fila: ações certas
   Ações na fila:
   - Registrar Consulta
   - Prontuário
   - Tirar da fila
   - Não aguardou
   Sem botão Atender separado.
========================================================= */
(function(){
  if(!window.App || !window.Atendimento || App.__filaAcoesCertasV141) return;
  App.__filaAcoesCertasV141=true;

  Atendimento.horaAgendadaV141=function(a){
    if(a.encaixe) return 'Encaixe';
    return a.horaAgendada||a.horaAgenda||a.agendaHora||a.hora||'—';
  };

  Atendimento.horaChegadaV141=function(a){
    return a.horaChegada||a.chegouHora||a.horaEntrada||a.horaInicio||a.hora||'—';
  };

  Atendimento.removerDaFilaV141=function(id){
    const item=(this.lista ? this.lista() : Store.get('ATENDIMENTOS')).find(x=>String(x.id)===String(id));
    if(!item) return Utils.toast('Atendimento não encontrado.');

    item.status='Cancelado';
    item.canceladoEm=new Date().toISOString();
    item.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    Store.upsert('ATENDIMENTOS',item);

    if(item.origemAgendaId){
      const ag=Store.get('AGENDA_MEDICA').find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status='Agendado';
        ag.atendimentoId='';
        ag.chegouEm='';
        ag.horaChegada='';
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }

    Utils.toast('Paciente retirado da fila.');
    if(window.App && App.renderAtendimento) App.renderAtendimento();
  };

  Atendimento.naoAguardou=function(id){
    const item=(this.lista ? this.lista() : Store.get('ATENDIMENTOS')).find(x=>String(x.id)===String(id));
    if(!item) return Utils.toast('Atendimento não encontrado.');

    item.status='Não aguardou';
    item.naoAguardouEm=new Date().toISOString();
    item.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    Store.upsert('ATENDIMENTOS',item);

    if(item.origemAgendaId){
      const ag=Store.get('AGENDA_MEDICA').find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status='Não aguardou';
        ag.atendimentoId='';
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }

    Utils.toast('Paciente marcado como Não aguardou.');
    if(window.App && App.renderAtendimento) App.renderAtendimento();
  };

  Atendimento.finalizadosHoje=function(){
    const hoje=this.hoje ? this.hoje() : Utils.today();
    return (this.lista ? this.lista() : Store.get('ATENDIMENTOS')).filter(a=>
      ['Finalizado','Não aguardou','Cancelado'].includes(a.status) && a.data===hoje
    );
  };

  App.acoesFilaV141=function(a){
    const pacId=a.pacId||a.pacienteId||'';
    return `<div class="fila-actions-certas-v141">
      <button type="button" class="btn btn-sm btn-green" onclick="RegistrarConsulta.open('${pacId}','${a.id}')">Registrar Consulta</button>
      <button type="button" class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${pacId}')">Prontuário</button>
      <button type="button" class="btn btn-sm btn-red" onclick="Atendimento.removerDaFilaV141('${a.id}')">Tirar da fila</button>
      <button type="button" class="btn btn-sm btn-orange" onclick="Atendimento.naoAguardou('${a.id}')">Não aguardou</button>
    </div>`;
  };

  App.renderFilaV141=function(){
    const aguardando=Atendimento.aguardando ? Atendimento.aguardando() : [];
    const emAtendimento=Atendimento.emAtendimentoLista ? Atendimento.emAtendimentoLista() : [];
    const finalizados=Atendimento.finalizadosHoje ? Atendimento.finalizadosHoje() : [];
    const ativos=aguardando.concat(emAtendimento);

    const content=document.getElementById('content');
    if(!content) return;

    content.innerHTML=`
      <h1 class="zero-page-title">🩺 Fila de Atendimento</h1>
      <div class="zero-page-sub">Pacientes presentes aguardando atendimento hoje.</div>

      <div class="zero-fila-kpis">
        ${this.kpiSmall('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${this.kpiSmall('🩺', emAtendimento.length, 'Em atendimento', 'blue')}
        ${this.kpiSmall('✅', finalizados.length, 'Atendidos / saídas hoje', 'green')}
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head">
          <div class="zero-wide-title">Fila atual</div>
          <button type="button" class="btn btn-blue" onclick="Atendimento.modalEncaixe()">+ Encaixe / Atendimento avulso</button>
        </div>
        <div class="zero-wide-body">
          ${ativos.length?`
            <table class="zero-table fila-table-v141">
              <thead>
                <tr>
                  <th>Agendado</th>
                  <th>Chegada</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                  <th class="acoes-col-v141">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${ativos.map(a=>`
                  <tr>
                    <td>${Utils.esc(Atendimento.horaAgendadaV141(a))}</td>
                    <td>${Utils.esc(Atendimento.horaChegadaV141(a))}</td>
                    <td>
                      <strong>${Utils.esc(a.paciente||'')}</strong>
                      ${a.obs?`<div class="doc-sub">${Utils.esc(a.obs)}</div>`:''}
                    </td>
                    <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                    <td>${Utils.esc(a.profissional||'—')}</td>
                    <td>${this.statusBadge(a.status)}</td>
                    <td>${this.acoesFilaV141(a)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum paciente na fila de atendimento.</div>`}
        </div>
      </div>

      <div class="zero-wide-panel">
        <div class="zero-wide-head"><div class="zero-wide-title">Atendidos / saídas hoje</div></div>
        <div class="zero-wide-body">
          ${finalizados.length?`
            <table class="zero-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${finalizados.map(a=>`<tr>
                  <td>${Utils.esc(a.horaFim||a.horaChegada||'—')}</td>
                  <td><strong>${Utils.esc(a.paciente||'')}</strong></td>
                  <td>${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</td>
                  <td>${Utils.esc(a.profissional||'—')}</td>
                  <td>${this.statusBadge(a.status||'Finalizado')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `:`<div class="zero-empty-strong">Nenhum atendimento finalizado hoje.</div>`}
        </div>
      </div>
    `;
  };

  App.renderAtendimento=function(){ return this.renderFilaV141(); };
  App.renderFilaAtendimento=function(){ return this.renderFilaV141(); };
  App.renderFila=function(){ return this.renderFilaV141(); };

  // impede sobras da versão anterior: remove "Histórico hoje" e "Atender" separado se algum render antigo rodar.
  App.limparFilaAcoesErradasV141=function(){
    document.querySelectorAll('#content button').forEach(btn=>{
      const t=String(btn.textContent||'').trim().toLowerCase();
      if(t==='histórico hoje' || t==='historico hoje' || t==='atender'){
        btn.remove();
      }
    });
  };

  setInterval(()=>App.limparFilaAcoesErradasV141 && App.limparFilaAcoesErradasV141(),700);
})();




/* =========================================================
   ZERO V16.0 — Registrar Consulta abre corretamente pela fila
   Correções:
   - Botão Registrar Consulta coloca o atendimento em "Em atendimento" antes de abrir.
   - Funciona para registros com pacId ou pacienteId.
   - Corrige abertura quando veio da agenda médica/procedimentos.
   - Não mexe nas ações da fila além do botão Registrar Consulta.
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__registrarConsultaFixV160) return;
  Atendimento.__registrarConsultaFixV160=true;

  Atendimento.idPacienteV160=function(a){
    return a?.pacId || a?.pacienteId || a?.idPaciente || '';
  };

  Atendimento.encontrarPorIdV160=function(id){
    return (Store.get('ATENDIMENTOS')||[]).find(a=>String(a.id)===String(id)) || null;
  };

  Atendimento.encontrarAtivoPacienteV160=function(pacId){
    return (Store.get('ATENDIMENTOS')||[]).find(a=>
      String(a.pacId||a.pacienteId||'')===String(pacId) &&
      ['Aguardando','Em atendimento'].includes(a.status||'')
    ) || null;
  };

  Atendimento.doPaciente=function(pacId){
    return this.encontrarAtivoPacienteV160(pacId);
  };

  Atendimento.emAtendimento=function(pacId){
    return (Store.get('ATENDIMENTOS')||[]).find(a=>
      String(a.pacId||a.pacienteId||'')===String(pacId) &&
      a.status==='Em atendimento'
    ) || null;
  };

  Atendimento.prepararRegistrarConsultaV160=function(atendimentoId='',pacId=''){
    let item=atendimentoId ? this.encontrarPorIdV160(atendimentoId) : null;
    if(!item && pacId) item=this.encontrarAtivoPacienteV160(pacId);

    if(!item && pacId){
      const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
      if(!p) return null;
      item={
        id:Utils.id('ATD'),
        pacId:p.id,
        pacienteId:p.id,
        paciente:p.nome||p.nomeCompleto||'',
        tipo:'Consulta',
        tipoConsulta:'Consulta',
        status:'Aguardando',
        data:this.hoje ? this.hoje() : Utils.today(),
        hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
        criadoEm:new Date().toISOString()
      };
    }

    if(!item) return null;

    const pid=this.idPacienteV160(item);
    if(pid){
      item.pacId=pid;
      item.pacienteId=pid;
    }

    if(item.status!=='Em atendimento'){
      item.status='Em atendimento';
      item.iniciadoEm=item.iniciadoEm||new Date().toISOString();
      item.horaInicio=item.horaInicio||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    }

    Store.upsert('ATENDIMENTOS',item);

    if(item.origemAgendaId){
      const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status='Em atendimento';
        ag.atendimentoId=item.id;
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }

    return item;
  };

  Atendimento.registrarConsultaV160=function(atendimentoId){
    const item=this.prepararRegistrarConsultaV160(atendimentoId,'');
    if(!item) return Utils.toast('Atendimento não encontrado.');

    const pacId=this.idPacienteV160(item);
    if(!pacId) return Utils.toast('Paciente do atendimento não encontrado.');

    if(window.RegistrarConsulta?.open){
      return RegistrarConsulta.open(pacId,item.id);
    }

    Utils.toast('Módulo Registrar Consulta não encontrado.');
    return false;
  };

  const oldIniciarV160=this.iniciar?.bind(this);
  Atendimento.iniciar=function(id){
    const item=this.prepararRegistrarConsultaV160(id,'');
    if(!item){
      return oldIniciarV160 ? oldIniciarV160(id) : Utils.toast('Atendimento não encontrado.');
    }
    const pacId=this.idPacienteV160(item);
    if(window.Prontuario?.abrir) Prontuario.abrir(pacId,'historico');
    setTimeout(()=>{ if(window.RegistrarConsulta?.open) RegistrarConsulta.open(pacId,item.id); },80);
    return true;
  };

  if(window.App){
    App.acoesFilaV141=function(a){
      const pacId=a.pacId||a.pacienteId||'';
      return `<div class="fila-actions-certas-v141">
        <button type="button" class="btn btn-sm btn-green" onclick="Atendimento.registrarConsultaV160('${a.id}')">Registrar Consulta</button>
        <button type="button" class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${pacId}')">Prontuário</button>
        <button type="button" class="btn btn-sm btn-red" onclick="Atendimento.removerDaFilaV141('${a.id}')">Tirar da fila</button>
        <button type="button" class="btn btn-sm btn-orange" onclick="Atendimento.naoAguardou('${a.id}')">Não aguardou</button>
      </div>`;
    };
  }
})();




/* =========================================================
   ZERO V16.1 — Registrar Consulta: botão da fila abre sem travar
   Correções:
   - Padroniza pacId/pacienteId antes de abrir.
   - Coloca o atendimento em Em atendimento.
   - Botão Registrar Consulta chama função única segura.
========================================================= */
(function(){
  if(!window.Atendimento || Atendimento.__registrarConsultaSeguroV161) return;
  Atendimento.__registrarConsultaSeguroV161=true;

  Atendimento.normalizarAtendimentoV161=function(a){
    if(!a) return null;
    const pid=a.pacId||a.pacienteId||a.idPaciente||'';
    if(pid){
      a.pacId=pid;
      a.pacienteId=pid;
    }
    if(!a.data) a.data=this.hoje ? this.hoje() : Utils.today();
    if(!a.criadoEm) a.criadoEm=new Date().toISOString();
    return a;
  };

  Atendimento.abrirRegistrarConsultaSeguroV161=function(id,pacId=''){
    let item=(Store.get('ATENDIMENTOS')||[]).find(a=>String(a.id)===String(id))||null;

    if(!item && pacId){
      item=(Store.get('ATENDIMENTOS')||[]).find(a=>
        String(a.pacId||a.pacienteId||'')===String(pacId) &&
        ['Aguardando','Em atendimento'].includes(a.status||'')
      )||null;
    }

    if(!item && pacId){
      const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
      if(p){
        item={
          id:Utils.id('ATD'),
          pacId:p.id,
          pacienteId:p.id,
          paciente:p.nome||p.nomeCompleto||'',
          tipo:'Consulta',
          tipoConsulta:'Consulta',
          status:'Aguardando',
          data:this.hoje ? this.hoje() : Utils.today(),
          hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
          criadoEm:new Date().toISOString()
        };
      }
    }

    if(!item) return Utils.toast('Atendimento não encontrado.');

    this.normalizarAtendimentoV161(item);
    item.status='Em atendimento';
    item.iniciadoEm=item.iniciadoEm||new Date().toISOString();
    item.horaInicio=item.horaInicio||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    Store.upsert('ATENDIMENTOS',item);

    if(item.origemAgendaId){
      const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status='Em atendimento';
        ag.atendimentoId=item.id;
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }

    const pid=item.pacId||item.pacienteId||pacId;
    if(!pid) return Utils.toast('Paciente do atendimento não encontrado.');

    if(window.RegistrarConsulta?.open){
      return RegistrarConsulta.open(pid,item.id);
    }

    Utils.toast('Registrar Consulta não carregou.');
    return false;
  };

  Atendimento.iniciar=function(id){
    return this.abrirRegistrarConsultaSeguroV161(id,'');
  };

  Atendimento.registrarConsultaV160=function(id){
    return this.abrirRegistrarConsultaSeguroV161(id,'');
  };

  if(window.App){
    App.acoesFilaV141=function(a){
      const pacId=a.pacId||a.pacienteId||'';
      return `<div class="fila-actions-certas-v141">
        <button type="button" class="btn btn-sm btn-green" onclick="Atendimento.abrirRegistrarConsultaSeguroV161('${a.id}','${pacId}')">Registrar Consulta</button>
        <button type="button" class="btn btn-sm btn-outline" onclick="Prontuario.abrir('${pacId}')">Prontuário</button>
        <button type="button" class="btn btn-sm btn-red" onclick="Atendimento.removerDaFilaV141('${a.id}')">Tirar da fila</button>
        <button type="button" class="btn btn-sm btn-orange" onclick="Atendimento.naoAguardou('${a.id}')">Não aguardou</button>
      </div>`;
    };
  }
})();




/* =========================================================
   ZERO V18.5 — Início seguro para não deixar tela em branco
========================================================= */
(function(){
  if(!window.App || App.__inicioSeguroV185) return;
  App.__inicioSeguroV185=true;

  App.safeListV185=function(key){
    try{
      const v=Store.get(key);
      return Array.isArray(v)?v:[];
    }catch(e){ return []; }
  };

  App.renderInicioSeguroV185=function(){
    const content=document.getElementById('content');
    if(!content) return false;

    let pacientes=[], aguardando=[], emAtendimento=[], finalizados=[], consultasHoje=0, fila=[];
    try{ pacientes=this.safeListV185('PACIENTES').filter(p=>p.ativo!==false); }catch(e){}
    try{ aguardando=window.Atendimento?.aguardando ? Atendimento.aguardando() : []; }catch(e){ aguardando=[]; }
    try{ emAtendimento=window.Atendimento?.emAtendimentoLista ? Atendimento.emAtendimentoLista() : []; }catch(e){ emAtendimento=[]; }
    try{ finalizados=window.Atendimento?.finalizadosHoje ? Atendimento.finalizadosHoje() : []; }catch(e){ finalizados=[]; }
    try{ consultasHoje=this.safeListV185('HISTORICO').filter(h=>h.data===Utils.today()).length; }catch(e){}
    fila=[...aguardando,...emAtendimento];

    const user=(window.Auth?.current?.nome || window.Auth?.current?.login || 'Usuário');
    const kpi=this.kpi ? this.kpi.bind(this) : ((ico,num,label)=>`<div class="zero-kpi-card"><div class="zero-kpi-num">${num}</div><div class="zero-kpi-label">${label}</div></div>`);
    const kpiSmall=this.kpiSmall ? this.kpiSmall.bind(this) : ((ico,num,label)=>`<div class="zero-kpi-card small-row"><div class="zero-kpi-num">${num}</div><div class="zero-kpi-label">${label}</div></div>`);
    const status=this.statusBadge ? this.statusBadge.bind(this) : (s=>`<span class="fila-status">${Utils.esc(s||'')}</span>`);

    content.innerHTML=`
      <h1 class="zero-page-title">Olá, ${Utils.esc(user)}! 👋</h1>
      <div class="zero-page-sub">${this.dataExtenso ? this.dataExtenso() : new Date().toLocaleDateString('pt-BR')}</div>

      <div class="zero-kpi-grid">
        ${kpi('🗓️', consultasHoje, 'Consultas hoje', 'blue')}
        ${kpi('✅', finalizados.length, 'Realizadas', 'green')}
        ${kpi('⏳', aguardando.length, 'Aguardando', 'orange')}
        ${kpi('👥', pacientes.length, 'Pacientes ativos', 'purple')}
      </div>

      ${kpiSmall('🔔', 0, 'Notificações', 'red')}

      <div class="zero-home-lower">
        <div class="zero-panel">
          <div class="zero-panel-head">
            <div class="zero-panel-title">🗓️ Fila de hoje</div>
            <button class="zero-link" onclick="Router.go('atendimento')">Atender →</button>
          </div>
          <div class="zero-panel-body">
            ${fila.length?`
              <table class="zero-table">
                <tbody>
                  ${fila.slice(0,4).map(a=>`<tr>
                    <td><strong>${Utils.esc(a.paciente||'')}</strong><div class="doc-sub">${Utils.esc(a.tipoConsulta||a.tipo||'Consulta')}</div></td>
                    <td>${status(a.status)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            `:`<div class="zero-muted-center">Nenhum paciente presente na fila de hoje.</div>`}
          </div>
        </div>

        <div class="zero-panel">
          <div class="zero-panel-head"><div class="zero-panel-title">Atalhos</div></div>
          <div class="zero-panel-body">
            <div class="menus-atalhos-v185">
              <button class="btn btn-outline" onclick="Router.go('pacientes')">Pacientes</button>
              <button class="btn btn-outline" onclick="Router.go('agenda')">Agenda Médica</button>
              <button class="btn btn-outline" onclick="Router.go('agendaProcedimentos')">Agenda Procedimentos</button>
              <button class="btn btn-outline" onclick="Router.go('atendimento')">Fila</button>
            </div>
          </div>
        </div>
      </div>`;
    return true;
  };

  const oldRenderInicioV185=App.renderInicio?.bind(App);
  App.renderInicio=function(){
    try{
      const ret=oldRenderInicioV185 ? oldRenderInicioV185() : null;
      const content=document.getElementById('content');
      if(!content || !String(content.innerHTML||'').trim()){
        return this.renderInicioSeguroV185();
      }
      return ret;
    }catch(e){
      console.error('Falha no Início, usando render seguro V18.5',e);
      return this.renderInicioSeguroV185();
    }
  };
})();
