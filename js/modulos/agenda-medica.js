window.AgendaMedica={
  modoAgenda:'consulta',
  mesesBR:['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],

  init(){
    if(!Store.get('AGENDA_CONFIG').length){
      Store.set('AGENDA_CONFIG',[this.defaultConfig()]);
    }else{
      const cfg=Object.assign(this.defaultConfig(),Store.get('AGENDA_CONFIG')[0]||{});
      cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});
      cfg.horariosSemana=Object.assign(this.defaultConfig().horariosSemana,cfg.horariosSemana||{});
      cfg.mesesBloqueados=cfg.mesesBloqueados||[];
      Store.set('AGENDA_CONFIG',[cfg]);
    }
  },

  defaultColors(){
    return {
      vago:'#eff6ff',
      consulta:'#2563eb',
      procedimento:'#059669',
      bloqueio:'#64748b',
      aguardando:'#d97706',
      confirmado:'#16a34a',
      atendido:'#2563eb',
      cancelado:'#dc2626'
    };
  },

  defaultConfig(){
    return {
      id:'CFG_AGENDA',
      inicio:'07:00',
      fim:'18:00',
      intervalo:30,
      intervaloProcedimento:15,
      mostrarConfirmacao:true,
      mesesBloqueados:[],
      cores:this.defaultColors(),
      horariosSemana:{
        0:{ativo:false,inicio:'07:00',fim:'12:00'},
        1:{ativo:true,inicio:'07:00',fim:'18:00'},
        2:{ativo:true,inicio:'07:00',fim:'18:00'},
        3:{ativo:true,inicio:'07:00',fim:'18:00'},
        4:{ativo:true,inicio:'07:00',fim:'18:00'},
        5:{ativo:true,inicio:'07:00',fim:'18:00'},
        6:{ativo:false,inicio:'07:00',fim:'12:00'}
      }
    };
  },

  cfg(){
    this.init();
    return Store.get('AGENDA_CONFIG')[0]||this.defaultConfig();
  },

  saveCfg(cfg){
    cfg=Object.assign(this.defaultConfig(),cfg||{});
    cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});
    cfg.horariosSemana=Object.assign(this.defaultConfig().horariosSemana,cfg.horariosSemana||{});
    cfg.mesesBloqueados=cfg.mesesBloqueados||[];
    Store.set('AGENDA_CONFIG',[cfg]);
  },

  hojeISO(){return new Date().toISOString().slice(0,10);},

  brFromInput(v){
    if(!v) return Utils.today();
    if(String(v).includes('/')) return v;
    const [y,m,d]=String(v).split('-');
    return `${d}/${m}/${y}`;
  },

  isoFromBR(v){
    if(!v) return '';
    if(String(v).includes('-')) return v;
    const m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m?`${m[3]}-${m[2]}-${m[1]}`:v;
  },

  minutos(h){
    const [a,b]=String(h||'00:00').split(':').map(Number);
    return (a||0)*60+(b||0);
  },

  hora(min){
    return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
  },

  horaFim(hora,duracao){
    return this.hora(this.minutos(hora)+Number(duracao||30));
  },

  intervalosSobrepoem(aIni,aFim,bIni,bFim){
    return this.minutos(aIni)<this.minutos(bFim) && this.minutos(aFim)>this.minutos(bIni);
  },

  profissionais(){
    return Store.get('PROFISSIONAIS').filter(p=>p.ativo!==false);
  },

  pacientes(){
    return Store.get('PACIENTES').filter(p=>p.ativo!==false);
  },

  agendamentos(){
    return Store.get('AGENDA_MEDICA');
  },

  bloqueios(){
    return Store.get('AGENDA_BLOQUEIOS');
  },

  renderConsultaRoute(){
    this.modoAgenda='consulta';
    this.render();
  },

  renderProcedimentosRoute(){
    this.modoAgenda='procedimento';
    this.render();
  },

  isProcedimentosRoute(){
    return this.modoAgenda==='procedimento';
  },

  tipoAtual(){
    return this.isProcedimentosRoute()?'procedimento':'consulta';
  },

  tituloAgendaAtual(){
    return this.isProcedimentosRoute()?'Agenda Procedimentos':'Agenda Médica';
  },

  intervaloAtual(){
    const cfg=this.cfg();
    return this.isProcedimentosRoute()?Number(cfg.intervaloProcedimento||15):Number(cfg.intervalo||30);
  },

  profAtualId(){
    const sel=document.getElementById('ag-prof')?.value;
    if(sel) return sel;
    return this.profissionais()[0]?.id||'';
  },

  filtro(){
    return {
      data:document.getElementById('ag-data')?.value||this.hojeISO(),
      prof:document.getElementById('ag-prof')?.value||this.profAtualId(),
      tipo:this.tipoAtual()
    };
  },

  diaSemanaConfig(iso){
    const d=new Date(iso+'T12:00:00');
    return this.cfg().horariosSemana?.[d.getDay()]||{ativo:true,inicio:'07:00',fim:'18:00'};
  },

  mesBloqueado(iso,profId){
    const d=new Date(iso+'T12:00:00');
    const mes=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const keys=this.cfg().mesesBloqueados||[];
    return keys.includes(`${profId||'todos'}|${mes}`)||keys.includes(`todos|${mes}`);
  },

  slotsDia(iso){
    const cfg=this.cfg();
    const diaCfg=this.diaSemanaConfig(iso);
    const profId=this.profAtualId();
    if(this.mesBloqueado(iso,profId)||diaCfg.ativo===false) return [];
    const inicio=diaCfg.inicio||cfg.inicio||'07:00';
    const fim=diaCfg.fim||cfg.fim||'18:00';
    const step=this.intervaloAtual();
    const out=[];
    for(let m=this.minutos(inicio);m<=this.minutos(fim);m+=step) out.push(this.hora(m));
    return out;
  },

  vagasDia(iso){
    const profId=this.profAtualId();
    const tipo=this.tipoAtual();
    const slots=this.slotsDia(iso);
    if(!slots.length) return 0;

    let livres=0;
    slots.forEach(h=>{
      const fim=this.horaFim(h,this.intervaloAtual());
      const bloqueado=this.bloqueios().some(b=>this.isoFromBR(b.data)===iso && (!b.profissionalId||b.profissionalId===profId) && b.horaInicio<=h && b.horaFim>h);
      const ocupado=this.agendamentos().some(a=>
        this.isoFromBR(a.data)===iso &&
        a.profissionalId===profId &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,fim)
      );
      if(!bloqueado && !ocupado) livres++;
    });
    return livres;
  },

  classeVagas(vagas){
    if(vagas<=0) return 'vagas-zero';
    if(vagas<=5) return 'vagas-poucas';
    return 'vagas-ok';
  },

  selecionarDia(iso){
    const el=document.getElementById('ag-data');
    if(el) el.value=iso;
    this.render();
  },

  mudarMes(delta){
    const d=new Date((document.getElementById('ag-data')?.value||this.hojeISO())+'T12:00:00');
    d.setMonth(d.getMonth()+delta);
    d.setDate(1);
    const el=document.getElementById('ag-data');
    if(el) el.value=d.toISOString().slice(0,10);
    this.render();
  },

  renderCalendario(){
    const f=this.filtro();
    const base=new Date(f.data+'T12:00:00');
    const ano=base.getFullYear(), mes=base.getMonth();
    const first=new Date(ano,mes,1);
    const start=new Date(first);
    start.setDate(first.getDate()-first.getDay());

    let cells='';
    for(let i=0;i<42;i++){
      const d=new Date(start);
      d.setDate(start.getDate()+i);
      const iso=d.toISOString().slice(0,10);
      const inMonth=d.getMonth()===mes;
      const vagas=inMonth?this.vagasDia(iso):0;
      cells+=`<div class="ag-cal-day ${inMonth?'in-month':''} ${inMonth?this.classeVagas(vagas):''} ${iso===f.data?'selected':''}" onclick="AgendaMedica.selecionarDia('${iso}')"><span class="ag-day-num">${d.getDate()}</span></div>`;
    }

    return `<div class="ag-print-calendar">
      <div class="ag-cal-head">
        <button class="ag-cal-nav" onclick="AgendaMedica.mudarMes(-1)">‹</button>
        <div>${this.mesesBR[mes]} de ${ano}</div>
        <button class="ag-cal-nav" onclick="AgendaMedica.mudarMes(1)">›</button>
      </div>
      <div class="ag-cal-week"><div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div></div>
      <div class="ag-cal-grid">${cells}</div>
      <div class="ag-legend" style="margin-top:14px;">
        <span><i style="background:#dbeafe;border:1px solid #2563eb"></i> Vago</span>
        <span><i style="background:#fef3c7;border:1px solid #f59e0b"></i> 5 vagas ou menos</span>
        <span><i style="background:#fee2e2;border:1px solid #ef4444"></i> Sem vagas</span>
      </div>
    </div>`;
  },

  render(){
    this.init();
    const oldData=document.getElementById('ag-data')?.value;
    const oldProf=document.getElementById('ag-prof')?.value;
    const data=oldData||this.hojeISO();
    const prof=oldProf||this.profissionais()[0]?.id||'';
    const isProc=this.isProcedimentosRoute();

    document.getElementById('content').innerHTML=`<div class="ag-print-layout">
      <input id="ag-data" type="date" value="${data}" style="display:none">
      ${this.renderCalendario()}
      <div class="ag-print-main">
        <div class="ag-print-main-head">
          <div class="ag-print-title-row">
            <div>
              <h2>${isProc?'🩺':'⌂'} ${this.tituloAgendaAtual()} — ${this.brFromInput(data)}
                <span class="ag-route-badge ${isProc?'procedimento':'consulta'}">${isProc?'Procedimentos':'Consultas médicas'}</span>
              </h2>
              <div style="color:#64748b;margin-top:4px;">${isProc?'Agenda separada para procedimentos.':'Agenda separada para consultas médicas.'}</div>
            </div>
          </div>
          <div class="ag-print-controls">
            <select id="ag-prof" onchange="AgendaMedica.render()">
              ${this.profissionais().map(p=>`<option value="${p.id}" ${prof===p.id?'selected':''}>${Utils.esc(p.nome)}${p.especialidade?' — '+Utils.esc(p.especialidade):''}</option>`).join('')}
            </select>
            <button class="btn btn-ghost" onclick="AgendaMedica.modalConfigOriginal()">⚙️ Configuração</button>
            <button class="btn btn-outline" onclick="AgendaMedica.imprimirAgenda()">🖨️ Imprimir</button>
          </div>
          <div class="ag-legend">
            <span><i style="background:#2563eb"></i> Consulta</span>
            <span><i style="background:#059669"></i> Procedimento</span>
            <span><i style="background:#64748b"></i> Bloqueio</span>
          </div>
        </div>
        ${this.renderSlots()}
      </div>
    </div>`;
  },

  renderSlots(){
    const f=this.filtro();
    const profId=f.prof;
    const tipo=f.tipo;
    const slots=this.slotsDia(f.data);
    const isProc=this.isProcedimentosRoute();

    if(!slots.length){
      return `<div class="ag-slots-wrap"><div class="ag-slot-print bloqueado"><div class="ag-slot-time">—</div><div class="ag-slot-info"><strong>Agenda bloqueada</strong><span>Este dia ou mês está bloqueado para atendimento.</span></div><div></div></div></div>`;
    }

    return `<div class="ag-slots-wrap">${slots.map(h=>{
      const slotFim=this.horaFim(h,this.intervaloAtual());
      const bloqueio=this.bloqueios().find(b=>this.isoFromBR(b.data)===f.data && (!b.profissionalId||b.profissionalId===profId) && b.horaInicio<=h && b.horaFim>h);

      if(bloqueio){
        return `<div class="ag-slot-print bloqueado">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>${Utils.esc(bloqueio.motivo||'Horário indisponível')}</span></div>
          <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalBloqueio('${bloqueio.id}')">Editar</button></div>
        </div>`;
      }

      const cruzado=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data &&
        a.profissionalId===profId &&
        (a.tipo||'consulta')!==tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );

      if(cruzado){
        const p=Store.get('PACIENTES').find(x=>x.id===cruzado.pacienteId)||{};
        return `<div class="ag-slot-print bloqueado-cruzado">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>Ocupado na ${cruzado.tipo==='procedimento'?'Agenda Procedimentos':'Agenda Médica'}${p.nome?' por '+Utils.esc(p.nome):''}</span></div>
          <div></div>
        </div>`;
      }

      const ag=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data &&
        a.profissionalId===profId &&
        (a.tipo||'consulta')===tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );

      if(ag){
        const p=Store.get('PACIENTES').find(x=>x.id===ag.pacienteId)||{};
        return `<div class="ag-slot-print ocupado ${isProc?'procedimento':''}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info">
            <strong>${Utils.esc((this.nomeComIdadeV184 ? this.nomeComIdadeV184(ag,p) : '') || p.nome || ag.paciente || 'Paciente')}</strong>
            <span>Tel: ${Utils.esc(p.telefone||p.tel||'')} • ${Utils.esc(ag.tipoConsulta||'Consulta')} • ${Utils.esc(ag.modalidade||'Presencial')}</span>
            <div class="ag-slot-extra"><span class="ag-mini-tag">${Utils.esc(ag.status||'Agendado')}</span>${ag.convenio?`<span class="ag-mini-tag">${Utils.esc(ag.convenio)}</span>`:''}</div>
          </div>
          <div class="ag-slot-actions">
            <button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.enviarFila('${ag.id}')">Chegou</button>
            <button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.modalAgendamento('${ag.id}')">Editar</button>
            <button class="ag-round-btn ag-cancelar-btn" onclick="AgendaMedica.cancelar('${ag.id}')">Cancelar</button>
          </div>
        </div>`;
      }

      return `<div class="ag-slot-print">
        <div class="ag-slot-time">${h}</div>
        <div class="ag-slot-info"><strong>Vago</strong><span>Horário disponível</span></div>
        <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalAgendamento('', '${f.data}', '${h}')">${isProc?'Agendar procedimento':'Agendar'}</button></div>
      </div>`;
    }).join('')}</div>`;
  },

  duracoes(){
    return this.isProcedimentosRoute()?[15,30,45,60,90,120]:[30,45,60,90,120];
  },

  horariosDisponiveisModal(dataIso){
    const old=document.getElementById('ag-data')?.value;
    const el=document.getElementById('ag-data');
    if(el) el.value=dataIso;
    const slots=this.slotsDia(dataIso);
    if(el && old) el.value=old;
    return slots;
  },

  parseMoney(v){
    return Number(String(v||'').replace(/[R$\s.]/g,'').replace(',','.'))||0;
  },

  buscarPacienteAgenda(){
    const q=Utils.norm(document.getElementById('ag-m-paciente-busca')?.value||'');
    const box=document.getElementById('ag-paciente-results');
    if(!box) return;
    if(!q){box.style.display='none';box.innerHTML='';return;}
    const list=this.pacientes().filter(p=>Utils.norm([p.nome,p.cpf,p.telefone,p.tel].join(' ')).includes(q)).slice(0,8);
    box.innerHTML=list.map(p=>`<button type="button" onclick="AgendaMedica.selecionarPacienteAgenda('${p.id}')">${Utils.esc(p.nome)}<div class="doc-sub">${Utils.esc(p.cpf||'')} ${Utils.esc(p.telefone||p.tel||'')}</div></button>`).join('') || `<button type="button">Nenhum paciente encontrado</button>`;
    box.style.display='block';
  },

  selecionarPacienteAgenda(id){
    const p=this.pacientes().find(x=>x.id===id);
    if(!p) return;
    document.getElementById('ag-m-paciente-id').value=p.id;
    document.getElementById('ag-m-paciente-busca').value=p.nome;
    document.getElementById('ag-m-convenio').value=p.convenio||p.plano||'';
    const box=document.getElementById('ag-paciente-results');
    if(box) box.style.display='none';
  },

  modalAgendamento(id='',data='',hora=''){
    const item=this.agendamentos().find(a=>a.id===id)||{};
    const tipo=item.tipo||this.tipoAtual();
    const isProc=tipo==='procedimento';
    const pac=Store.get('PACIENTES').find(p=>p.id===item.pacienteId)||{};
    const dataIso=this.isoFromBR(item.data)||data||this.filtro().data||this.hojeISO();
    const horarios=this.horariosDisponiveisModal(dataIso);
    const duracao=item.duracao||(isProc?15:30);

    Modal.open(id?(isProc?'Editar Procedimento':'Editar Consulta'):(isProc?'Novo Procedimento':'Nova Consulta'),`
      <div class="ag-modal-grid-original">
        <div class="full ag-paciente-sugestoes">
          <label>Paciente * <span class="ag-modal-title-note">(busque por nome ou CPF)</span></label>
          <input id="ag-m-paciente-id" type="hidden" value="${Utils.esc(item.pacienteId||'')}">
          <input id="ag-m-paciente-busca" value="${Utils.esc(pac.nome||item.paciente||'')}" placeholder="Digite o nome ou CPF do paciente" oninput="AgendaMedica.buscarPacienteAgenda()">
          <div id="ag-paciente-results" class="ag-paciente-results"></div>
        </div>
        <div class="full">
          <label>Médico *</label>
          <select id="ag-m-prof">${this.profissionais().map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}${p.especialidade?' — '+Utils.esc(p.especialidade):''}</option>`).join('')}</select>
        </div>
        <div><label>Data *</label><input id="ag-m-data" type="date" value="${dataIso}" onchange="AgendaMedica.atualizarHorariosModal()"></div>
        <div><label>Horário inicial *</label><select id="ag-m-hora">${horarios.map(h=>`<option value="${h}">${h}</option>`).join('')}</select></div>
        <div><label>Duração *</label><select id="ag-m-duracao">${this.duracoes().map(d=>`<option value="${d}">${d} minutos</option>`).join('')}</select></div>
        <div><label>Convênio</label><input id="ag-m-convenio" value="${Utils.esc(item.convenio||pac.convenio||pac.plano||'')}" placeholder="Selecione o paciente"></div>
        <div><label>Tipo da consulta</label><select id="ag-m-tipo-consulta"><option>Consulta</option><option>Retorno</option></select></div>
        <div><label>Atendimento</label><select id="ag-m-modalidade"><option>Presencial</option><option>Virtual</option></select></div>
        <div><label>${isProc?'Valor do procedimento':'Valor da consulta'}</label><input id="ag-m-valor" value="${item.valorPrevisto?Number(item.valorPrevisto).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):''}" placeholder="R$ 0,00"></div>
        <div><label>Status</label><select id="ag-m-status"><option>Agendado</option><option>Aguardando</option><option>Confirmado</option><option>Atendido</option><option>Faltou</option><option>Cancelado</option></select></div>
        <div class="full"><label>${isProc?'Procedimento / Motivo':'Queixa / Motivo'}</label><input id="ag-m-proc" value="${Utils.esc(item.procedimento||'')}" placeholder="${isProc?'Ex. Limpeza, curativo, procedimento...':'Ex. Dor de cabeça frequente...'}"></div>
        <div class="full"><label>Observação</label><input id="ag-m-obs" value="${Utils.esc(item.obs||'')}" placeholder="Ex: paciente prefere atendimento no fim da manhã..."></div>
        <input id="ag-m-tipo" type="hidden" value="${tipo}">
      </div>
    `,`<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>${id?`<button class="btn btn-outline" onclick="AgendaMedica.enviarFila('${id}')">Chegou / enviar para fila</button>`:''}<button class="btn btn-blue" onclick="AgendaMedica.saveAgendamento('${id}')">Salvar</button>`,'lg');

    setTimeout(()=>{
      document.getElementById('ag-m-prof').value=item.profissionalId||this.profAtualId()||'';
      document.getElementById('ag-m-hora').value=item.hora||hora||horarios[0]||'07:00';
      document.getElementById('ag-m-duracao').value=String(duracao);
      document.getElementById('ag-m-status').value=item.status||'Agendado';
      document.getElementById('ag-m-modalidade').value=item.modalidade||'Presencial';
      document.getElementById('ag-m-tipo-consulta').value=item.tipoConsulta||'Consulta';
    },30);
  },

  atualizarHorariosModal(){
    const dataIso=document.getElementById('ag-m-data')?.value||this.hojeISO();
    const sel=document.getElementById('ag-m-hora');
    if(!sel) return;
    const atual=sel.value;
    const horarios=this.horariosDisponiveisModal(dataIso);
    sel.innerHTML=horarios.map(h=>`<option value="${h}">${h}</option>`).join('');
    if(horarios.includes(atual)) sel.value=atual;
  },

  saveAgendamento(id=''){
    const pacienteId=document.getElementById('ag-m-paciente-id').value;
    const profissionalId=document.getElementById('ag-m-prof').value;
    if(!pacienteId||!profissionalId) return Utils.toast('Informe paciente e médico.');

    const p=Store.get('PACIENTES').find(x=>x.id===pacienteId)||{};
    const prof=Store.get('PROFISSIONAIS').find(x=>x.id===profissionalId)||{};
    const tipo=document.getElementById('ag-m-tipo').value||this.tipoAtual();

    const item={
      id:id||Utils.id('AG'),
      data:this.brFromInput(document.getElementById('ag-m-data').value),
      hora:document.getElementById('ag-m-hora').value,
      duracao:Number(document.getElementById('ag-m-duracao').value||((tipo==='procedimento')?15:30)),
      pacienteId,
      paciente:p.nome||'',
      profissionalId,
      profissional:prof.nome||'',
      tipo,
      procedimento:document.getElementById('ag-m-proc').value.trim(),
      modalidade:document.getElementById('ag-m-modalidade').value,
      tipoConsulta:document.getElementById('ag-m-tipo-consulta').value,
      status:document.getElementById('ag-m-status').value,
      convenio:document.getElementById('ag-m-convenio').value.trim()||p.convenio||p.plano||'',
      valorPrevisto:this.parseMoney(document.getElementById('ag-m-valor').value),
      obs:document.getElementById('ag-m-obs').value,
      criadoEm:id?(this.agendamentos().find(a=>a.id===id)?.criadoEm||new Date().toISOString()):new Date().toISOString()
    };

    Store.upsert('AGENDA_MEDICA',item);
    Modal.close();
    this.render();
    Utils.toast(tipo==='procedimento'?'Procedimento salvo.':'Consulta salva.');
  },

  cancelar(id){
    const a=this.agendamentos().find(x=>x.id===id);
    if(!a) return;
    a.status='Cancelado';
    Store.upsert('AGENDA_MEDICA',a);
    this.render();
  },

  enviarFila(id){
    const a=this.agendamentos().find(x=>x.id===id);
    if(!a) return Utils.toast('Agendamento não encontrado.');
    const p=Store.get('PACIENTES').find(x=>x.id===a.pacienteId);
    if(!p) return Utils.toast('Paciente não encontrado.');
    const ja=Store.get('ATENDIMENTOS').find(x=>String(x.pacId)===String(p.id) && (x.status==='Aguardando'||x.status==='Em atendimento'));
    if(ja) return Utils.toast('Paciente já está na fila.');

    Store.upsert('ATENDIMENTOS',{
      id:Utils.id('AT'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome,
      data:Utils.today(),
      hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      status:'Aguardando',
      tipo:a.tipo==='procedimento'?'Procedimento':'Consulta',
      procedimento:a.procedimento||'',
      modalidade:a.modalidade||'Presencial',
      tipoConsulta:a.tipoConsulta||'Consulta',
      profissionalId:a.profissionalId,
      profissional:a.profissional,
      origemAgendaId:a.id,
      convenio:a.convenio||'',
      valorPrevisto:a.valorPrevisto||0,
      criadoEm:new Date().toISOString()
    });
    a.status='Aguardando';
    Store.upsert('AGENDA_MEDICA',a);
    Utils.toast('Paciente enviado para fila.');
    this.render();
  },

  modalBloqueio(id=''){
    const item=this.bloqueios().find(b=>b.id===id)||{};
    Modal.open(id?'Editar Bloqueio':'Bloquear Horário',`
      <div class="form-grid doc-modal-original">
        <div class="f-col"><label>Data</label><input id="bl-data" type="date" value="${this.isoFromBR(item.data)||this.filtro().data||this.hojeISO()}"></div>
        <div class="f-col"><label>Profissional</label><select id="bl-prof"><option value="">Todos</option>${this.profissionais().map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}</select></div>
        <div class="f-col"><label>Início</label><input id="bl-inicio" type="time" value="${item.horaInicio||'08:00'}"></div>
        <div class="f-col"><label>Fim</label><input id="bl-fim" type="time" value="${item.horaFim||'09:00'}"></div>
        <div class="f-col f-full"><label>Motivo</label><input id="bl-motivo" value="${Utils.esc(item.motivo||'')}" placeholder="Férias, reunião, almoço..."></div>
      </div>
    `,`<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button><button class="btn btn-blue" onclick="AgendaMedica.saveBloqueio('${id}')">Salvar bloqueio</button>`,'lg');
    setTimeout(()=>{document.getElementById('bl-prof').value=item.profissionalId||'';},30);
  },

  saveBloqueio(id=''){
    const item={
      id:id||Utils.id('BL'),
      data:this.brFromInput(document.getElementById('bl-data').value),
      profissionalId:document.getElementById('bl-prof').value,
      horaInicio:document.getElementById('bl-inicio').value||'00:00',
      horaFim:document.getElementById('bl-fim').value||'23:59',
      motivo:document.getElementById('bl-motivo').value||'Bloqueado',
      criadoEm:new Date().toISOString()
    };
    Store.upsert('AGENDA_BLOQUEIOS',item);
    Modal.close();
    this.render();
  },

  modalConfigOriginal(){
    const cfg=this.cfg();
    const profs=this.profissionais();
    const mesAtual=this.filtro().data.slice(0,7);
    Modal.open('⚙️ Configurações da agenda',`
      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div><label>Profissional</label><select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()"><option value="todos">Todos os profissionais</option>${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}</select></div>
            <div><label>Mês</label><input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()"></div>
            <button class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
            <button class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
          </div>
          <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
        </div>
      </div>
      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div><label>Profissional</label><select id="cfg-bl-prof"><option value="">Selecione</option>${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}</select></div>
            <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
            <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
            <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
          </div>
          <div class="ag-config-grid three" style="margin-top:12px;">
            <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
            <button class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
            <button class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
          </div>
        </div>
      </div>
      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">⏰ Horários semanais</div>
        <div class="ag-config-card-body">
          <div id="cfg-horarios-semana" class="ag-week-hours"></div>
          <div class="row right" style="margin-top:12px;"><button class="btn btn-blue" onclick="AgendaMedica.salvarHorariosSemanaOriginal()">Salvar horários</button></div>
        </div>
      </div>
      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🎨 Cores da agenda</div>
        <div class="ag-config-card-body">
          <div class="ag-color-grid">
            ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`<div class="ag-color-item"><label>${l}</label><input type="color" id="cor-${k}" value="${cfg.cores?.[k]||'#2563eb'}"></div>`).join('')}
          </div>
          <div class="row right" style="margin-top:14px;"><button class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button><button class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button></div>
        </div>
      </div>
    `,`<button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>`,'lg');
    setTimeout(()=>{this.renderHorariosSemanaOriginal();this.atualizarStatusMesConfig();},50);
  },

  atualizarStatusMesConfig(){
    const st=document.getElementById('cfg-bloq-status-mes');
    const mes=document.getElementById('cfg-bloq-mes')?.value;
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';
    if(!st||!mes) return;
    const b=(this.cfg().mesesBloqueados||[]).includes(`${prof}|${mes}`)||(this.cfg().mesesBloqueados||[]).includes(`todos|${mes}`);
    st.innerHTML=b?'<span class="ag-month-blocked">Mês bloqueado</span>':'<span class="ag-month-open">Mês desbloqueado</span>';
  },

  bloquearMesOriginal(){
    const cfg=this.cfg();
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';
    const mes=document.getElementById('cfg-bloq-mes')?.value;
    if(!mes) return Utils.toast('Informe o mês.');
    cfg.mesesBloqueados=cfg.mesesBloqueados||[];
    const key=`${prof}|${mes}`;
    if(!cfg.mesesBloqueados.includes(key)) cfg.mesesBloqueados.push(key);
    this.saveCfg(cfg);
    Utils.toast('Mês bloqueado.');
    this.atualizarStatusMesConfig();
    this.render();
  },

  desbloquearMesOriginal(){
    const cfg=this.cfg();
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';
    const mes=document.getElementById('cfg-bloq-mes')?.value;
    if(!mes) return Utils.toast('Informe o mês.');
    cfg.mesesBloqueados=(cfg.mesesBloqueados||[]).filter(k=>k!==`${prof}|${mes}` && k!==`todos|${mes}`);
    this.saveCfg(cfg);
    Utils.toast('Mês desbloqueado.');
    this.atualizarStatusMesConfig();
    this.render();
  },

  bloquearPeriodoOriginal(){
    const prof=document.getElementById('cfg-bl-prof').value;
    const data=document.getElementById('cfg-bl-data').value;
    if(!prof||!data) return Utils.toast('Informe profissional e data.');
    Store.upsert('AGENDA_BLOQUEIOS',{
      id:Utils.id('BL'),
      data:this.brFromInput(data),
      profissionalId:prof,
      horaInicio:document.getElementById('cfg-bl-inicio').value||'00:00',
      horaFim:document.getElementById('cfg-bl-fim').value||'23:59',
      motivo:document.getElementById('cfg-bl-motivo').value||'Bloqueado',
      criadoEm:new Date().toISOString()
    });
    Utils.toast('Bloqueio salvo.');
    Modal.close();
    this.render();
  },

  desbloquearPeriodoOriginal(){
    const prof=document.getElementById('cfg-bl-prof').value;
    const data=this.brFromInput(document.getElementById('cfg-bl-data').value);
    Store.set('AGENDA_BLOQUEIOS',this.bloqueios().filter(b=>!(b.profissionalId===prof && b.data===data)));
    Utils.toast('Bloqueio removido.');
    Modal.close();
    this.render();
  },

  renderHorariosSemanaOriginal(){
    const cfg=this.cfg();
    const dias=[['0','Domingo'],['1','Segunda'],['2','Terça'],['3','Quarta'],['4','Quinta'],['5','Sexta'],['6','Sábado']];
    const box=document.getElementById('cfg-horarios-semana');
    if(!box) return;
    box.innerHTML=dias.map(([k,n])=>{
      const h=cfg.horariosSemana?.[k]||{ativo:!['0','6'].includes(k),inicio:'07:00',fim:'18:00'};
      return `<div class="ag-week-row"><strong>${n}</strong><label><input type="checkbox" id="sem-ativo-${k}" ${h.ativo!==false?'checked':''}> Atende</label><input type="time" id="sem-inicio-${k}" value="${h.inicio||'07:00'}"><input type="time" id="sem-fim-${k}" value="${h.fim||'18:00'}"></div>`;
    }).join('');
  },

  salvarHorariosSemanaOriginal(){
    const cfg=this.cfg();
    ['0','1','2','3','4','5','6'].forEach(k=>{
      cfg.horariosSemana[k]={
        ativo:document.getElementById('sem-ativo-'+k)?.checked,
        inicio:document.getElementById('sem-inicio-'+k)?.value||'07:00',
        fim:document.getElementById('sem-fim-'+k)?.value||'18:00'
      };
    });
    this.saveCfg(cfg);
    Utils.toast('Horários salvos.');
    Modal.close();
    this.render();
  },

  salvarCoresOriginal(){
    const cfg=this.cfg();
    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });
    this.saveCfg(cfg);
    Utils.toast('Cores salvas.');
    Modal.close();
    this.render();
  },

  restaurarCoresOriginal(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);
    Utils.toast('Cores restauradas.');
    Modal.close();
    this.render();
  },

  profissionalSelecionadoAgenda(){
    const id=this.profAtualId();
    return Store.get('PROFISSIONAIS').find(p=>p.id===id)||{};
  },

  imprimirAgenda(){
    const f=this.filtro();
    const prof=this.profissionalSelecionadoAgenda();
    const tipo=this.tipoAtual();
    const slots=this.slotsDia(f.data);
    const rows=slots.map(h=>`<tr><td>${h}</td><td></td><td></td><td>Vago</td></tr>`).join('');
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Agenda</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f8fafc}</style></head><body><h1>${tipo==='procedimento'?'AGENDA DE PROCEDIMENTOS':'AGENDA MÉDICA'}</h1><p><strong>Profissional:</strong> ${Utils.esc(prof.nome||'')}</p><p><strong>Data:</strong> ${Utils.esc(this.brFromInput(f.data))}</p><table><thead><tr><th>Horário</th><th>Paciente</th><th>Telefone</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();iframe.contentWindow.document.write(html);iframe.contentWindow.document.close();
    setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){} setTimeout(()=>iframe.remove(),1500)},250);
  }
};



/* =========================================================
   ZERO V7.1 — Modal configuração agenda 100% estável
   - Status mês bloqueado/desbloqueado aparece imediatamente.
   - Bloquear/desbloquear mês NÃO fecha modal e NÃO renderiza a tela inteira.
   - Renderização da agenda fica para depois de Salvar/Fechar.
========================================================= */
(function(){
  if(!window.AgendaMedica) return;

  AgendaMedica.modalConfigOriginal = function(){
    const cfg=this.cfg();
    const profs=this.profissionais();
    const mesAtual=this.filtro().data.slice(0,7);

    Modal.open('⚙️ Configurações da agenda',`
      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()">
                <option value="todos">Todos os profissionais</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Mês</label>
              <input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()">
            </div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
          </div>
          <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
        </div>
      </div>

      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bl-prof">
                <option value="">Selecione</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}
              </select>
            </div>
            <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
            <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
            <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
          </div>

          <div class="ag-config-grid three" style="margin-top:12px;">
            <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
          </div>
        </div>
      </div>

      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">⏰ Horários semanais</div>
        <div class="ag-config-card-body">
          <div id="cfg-horarios-semana" class="ag-week-hours"></div>
          <div class="row right" style="margin-top:12px;">
            <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarHorariosSemanaOriginal()">Salvar horários</button>
          </div>
        </div>
      </div>

      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🎨 Cores da agenda</div>
        <div class="ag-config-card-body">
          <div class="ag-color-grid">
            ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`<div class="ag-color-item"><label>${l}</label><input type="color" id="cor-${k}" value="${cfg.cores?.[k]||'#2563eb'}"></div>`).join('')}
          </div>
          <div class="row right" style="margin-top:14px;">
            <button type="button" class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button>
            <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button>
          </div>
        </div>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="AgendaMedica.cancelarConfigAgenda()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarConfigAgendaFechar()">Salvar</button>
    `,'lg');

    this.renderHorariosSemanaOriginal();
    this.atualizarStatusMesConfig();
    this.marcarModalConfiguracaoAberto();
  };

  AgendaMedica.marcarModalConfiguracaoAberto = function(){
    const modal=document.querySelector('.modal,.modal-overlay,.modal-backdrop,.cm-modal');
    if(modal) modal.setAttribute('data-static-modal','true');
  };

  AgendaMedica.atualizarStatusMesConfig = function(){
    const st=document.getElementById('cfg-bloq-status-mes');
    const mes=document.getElementById('cfg-bloq-mes')?.value;
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';

    if(!st || !mes) return;

    const cfg=this.cfg();
    const bloqueados=cfg.mesesBloqueados||[];
    const bloqueado=bloqueados.includes(`${prof}|${mes}`) || bloqueados.includes(`todos|${mes}`);

    st.innerHTML=bloqueado
      ? '<span class="ag-month-blocked">Mês bloqueado</span>'
      : '<span class="ag-month-open">Mês desbloqueado</span>';
  };

  AgendaMedica.bloquearMesOriginal = function(){
    const cfg=this.cfg();
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';
    const mes=document.getElementById('cfg-bloq-mes')?.value;

    if(!mes) return Utils.toast('Informe o mês.');

    cfg.mesesBloqueados=cfg.mesesBloqueados||[];
    const key=`${prof}|${mes}`;
    if(!cfg.mesesBloqueados.includes(key)) cfg.mesesBloqueados.push(key);

    this.saveCfg(cfg);
    this.atualizarStatusMesConfig();
    Utils.toast('Mês bloqueado.');
  };

  AgendaMedica.desbloquearMesOriginal = function(){
    const cfg=this.cfg();
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';
    const mes=document.getElementById('cfg-bloq-mes')?.value;

    if(!mes) return Utils.toast('Informe o mês.');

    cfg.mesesBloqueados=(cfg.mesesBloqueados||[]).filter(k=>k!==`${prof}|${mes}` && k!==`todos|${mes}`);

    this.saveCfg(cfg);
    this.atualizarStatusMesConfig();
    Utils.toast('Mês desbloqueado.');
  };

  AgendaMedica.bloquearPeriodoOriginal = function(){
    const prof=document.getElementById('cfg-bl-prof')?.value;
    const data=document.getElementById('cfg-bl-data')?.value;
    if(!prof || !data) return Utils.toast('Informe profissional e data.');

    Store.upsert('AGENDA_BLOQUEIOS',{
      id:Utils.id('BL'),
      data:this.brFromInput(data),
      profissionalId:prof,
      horaInicio:document.getElementById('cfg-bl-inicio')?.value||'00:00',
      horaFim:document.getElementById('cfg-bl-fim')?.value||'23:59',
      motivo:document.getElementById('cfg-bl-motivo')?.value||'Bloqueado',
      criadoEm:new Date().toISOString()
    });

    Utils.toast('Bloqueio salvo.');
  };

  AgendaMedica.desbloquearPeriodoOriginal = function(){
    const prof=document.getElementById('cfg-bl-prof')?.value;
    const data=this.brFromInput(document.getElementById('cfg-bl-data')?.value);
    if(!prof || !data) return Utils.toast('Informe profissional e data.');

    Store.set('AGENDA_BLOQUEIOS',this.bloqueios().filter(b=>!(b.profissionalId===prof && b.data===data)));
    Utils.toast('Bloqueio removido.');
  };

  AgendaMedica.salvarHorariosSemanaOriginal = function(){
    const cfg=this.cfg();
    ['0','1','2','3','4','5','6'].forEach(k=>{
      cfg.horariosSemana[k]={
        ativo:document.getElementById('sem-ativo-'+k)?.checked,
        inicio:document.getElementById('sem-inicio-'+k)?.value||'07:00',
        fim:document.getElementById('sem-fim-'+k)?.value||'18:00'
      };
    });
    this.saveCfg(cfg);
    Utils.toast('Horários salvos.');
  };

  AgendaMedica.salvarCoresOriginal = function(){
    const cfg=this.cfg();
    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });
    this.saveCfg(cfg);
    Utils.toast('Cores salvas.');
  };

  AgendaMedica.restaurarCoresOriginal = function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);
    Utils.toast('Cores restauradas.');
    this.modalConfigOriginal();
  };

  AgendaMedica.salvarConfigAgendaFechar = function(){
    Modal.close();
    this.render();
  };

  AgendaMedica.cancelarConfigAgenda = function(){
    Modal.close();
    this.render();
  };
})();




/* =========================================================
   ZERO V8.4 — Modal Nova Consulta / Novo Procedimento
   Correção:
   - Lista/busca de pacientes volta a puxar PACIENTES corretamente.
   - Aceita variações de campos: nome, nomeCompleto, cpf, telefone, celular.
   - Mostra todos os pacientes ao focar no campo.
   - Funciona em Nova Consulta e Novo Procedimento.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__pacientesModalFixV84) return;
  AgendaMedica.__pacientesModalFixV84=true;

  AgendaMedica.pacientesAgendaLista = function(){
    try{
      const lista=(Store.get('PACIENTES')||[])
        .filter(p=>p && p.ativo!==false && p.status!=='Inativo' && p.status!=='Desativado')
        .sort((a,b)=>String(a.nome||a.nomeCompleto||'').localeCompare(String(b.nome||b.nomeCompleto||''),'pt-BR'));
      return lista;
    }catch(e){
      return [];
    }
  };

  AgendaMedica.nomePacienteAgenda = function(p){
    return p?.nome || p?.nomeCompleto || p?.paciente || 'Paciente sem nome';
  };

  AgendaMedica.docPacienteAgenda = function(p){
    return [p?.cpf, p?.telefone, p?.celular, p?.convenio || p?.plano]
      .filter(Boolean)
      .join(' • ');
  };

  AgendaMedica.buscarPacienteAgenda = function(mostrarTodos=false){
    const input=document.getElementById('ag-m-paciente-busca');
    const box=document.getElementById('ag-paciente-results');
    if(!input || !box) return;

    const q=Utils.norm(input.value||'');
    let list=this.pacientesAgendaLista();

    if(q){
      list=list.filter(p=>{
        const alvo=Utils.norm([
          p.nome,
          p.nomeCompleto,
          p.cpf,
          p.telefone,
          p.celular,
          p.convenio,
          p.plano
        ].join(' '));
        return alvo.includes(q);
      });
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
      <button type="button" onclick="AgendaMedica.selecionarPacienteAgenda('${p.id}')">
        ${Utils.esc(this.nomePacienteAgenda(p))}
        <div class="doc-sub">${Utils.esc(this.docPacienteAgenda(p))}</div>
      </button>
    `).join('');
    box.style.display='block';
  };

  AgendaMedica.selecionarPacienteAgenda = function(id){
    const p=this.pacientesAgendaLista().find(x=>String(x.id)===String(id));
    if(!p) return;

    const nome=this.nomePacienteAgenda(p);
    const inputId=document.getElementById('ag-m-paciente-id');
    const inputBusca=document.getElementById('ag-m-paciente-busca');
    const convenio=document.getElementById('ag-m-convenio');

    if(inputId) inputId.value=p.id;
    if(inputBusca) inputBusca.value=nome;
    if(convenio) convenio.value=p.convenio || p.plano || '';

    const box=document.getElementById('ag-paciente-results');
    if(box){
      box.innerHTML='';
      box.style.display='none';
    }
  };

  AgendaMedica.prepararCampoPacienteModal = function(item={}){
    const paciente=Store.get('PACIENTES').find(p=>String(p.id)===String(item.pacienteId||item.pacId||'')) || {};
    const inputId=document.getElementById('ag-m-paciente-id');
    const inputBusca=document.getElementById('ag-m-paciente-busca');
    const box=document.getElementById('ag-paciente-results');

    if(inputId) inputId.value=item.pacienteId || item.pacId || '';
    if(inputBusca){
      
    }
  };

  const oldModalAgendamentoV84 = AgendaMedica.modalAgendamento?.bind(AgendaMedica);

  if(oldModalAgendamentoV84){
    AgendaMedica.modalAgendamento = function(id='',data='',hora=''){
      const ret=oldModalAgendamentoV84(id,data,hora);

      setTimeout(()=>{
        const item=this.agendamentos().find(a=>String(a.id)===String(id)) || {};
        const paciente=Store.get('PACIENTES').find(p=>String(p.id)===String(item.pacienteId||item.pacId||'')) || {};

        let inputId=document.getElementById('ag-m-paciente-id');
        let inputBusca=document.getElementById('ag-m-paciente-busca');
        let box=document.getElementById('ag-paciente-results');

        // Se por alguma versão antiga o modal criou um select, converte para busca.
        const select=document.getElementById('ag-m-paciente');
        if(select && !inputBusca){
          const wrap=select.closest('.full,.f-full,.f-col,div') || select.parentElement;
          if(wrap){
            wrap.classList.add('ag-paciente-sugestoes');
            wrap.innerHTML=`
              <label>Paciente * <span class="ag-modal-title-note">(busque por nome ou CPF)</span></label>
              <input id="ag-m-paciente-id" type="hidden" value="${Utils.esc(item.pacienteId||item.pacId||'')}">
              <input id="ag-m-paciente-busca" value="${Utils.esc(this.nomePacienteAgenda(paciente)||item.paciente||'')}" placeholder="Digite o nome ou CPF do paciente" autocomplete="off" onfocus="AgendaMedica.buscarPacienteAgenda(true)" oninput="AgendaMedica.buscarPacienteAgenda(false)">
              <div id="ag-paciente-results" class="ag-paciente-results"></div>
            `;
          }
        }

        inputId=document.getElementById('ag-m-paciente-id');
        inputBusca=document.getElementById('ag-m-paciente-busca');
        box=document.getElementById('ag-paciente-results');

        if(inputBusca){
          inputBusca.setAttribute('autocomplete','off');
          inputBusca.onfocus=()=>AgendaMedica.buscarPacienteAgenda(true);
          inputBusca.oninput=()=>AgendaMedica.buscarPacienteAgenda(false);
          inputBusca.onkeydown=(ev)=>{
            if(ev.key==='Escape' && box){
              box.style.display='none';
            }
          };

          if(item.pacienteId || item.pacId){
            inputBusca.value=this.nomePacienteAgenda(paciente) || item.paciente || '';
          }
        }

        if(inputId && (item.pacienteId || item.pacId)){
          inputId.value=item.pacienteId || item.pacId;
        }

        if(box){
          box.style.display='none';
        }
      },80);

      return ret;
    };
  }

  const oldSaveAgendamentoV84 = AgendaMedica.saveAgendamento?.bind(AgendaMedica);

  if(oldSaveAgendamentoV84){
    AgendaMedica.saveAgendamento = function(id=''){
      const inputId=document.getElementById('ag-m-paciente-id');
      const busca=document.getElementById('ag-m-paciente-busca');

      // Se usuário digitou o nome exato mas não clicou na sugestão, seleciona automaticamente.
      if(inputId && !inputId.value && busca && busca.value){
        const q=Utils.norm(busca.value);
        const p=this.pacientesAgendaLista().find(x=>Utils.norm(this.nomePacienteAgenda(x))===q || Utils.norm(x.cpf||'')===q);
        if(p){
          inputId.value=p.id;
          busca.value=this.nomePacienteAgenda(p);
        }
      }

      if(inputId && !inputId.value){
        Utils.toast('Selecione um paciente da lista.');
        if(busca){
          busca.focus();
          this.buscarPacienteAgenda(true);
        }
        return;
      }

      return oldSaveAgendamentoV84(id);
    };
  }

})();




/* =========================================================
   ZERO V10.1 — Agenda: Procedimento + Chegou/Fila corrigidos
   Correções:
   - Modal Nova Consulta / Novo Procedimento agora tem opção Procedimento.
   - Quando está na Agenda Procedimentos, já vem selecionado Procedimento.
   - Botão Chegou funciona, ativa o agendamento, manda para fila e mostra Atender/Fila.
   - Evita duplicidade se paciente já estiver na fila.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__procedimentoChegouFixV101) return;
  AgendaMedica.__procedimentoChegouFixV101=true;

  AgendaMedica.tipoConsultaOptionsV101=function(valorAtual='', isProc=false){
    const opts=isProc
      ? ['Procedimento','Consulta','Retorno']
      : ['Consulta','Retorno','Procedimento'];

    const atual=valorAtual || (isProc?'Procedimento':'Consulta');
    return opts.map(o=>`<option value="${Utils.esc(o)}" ${String(atual)===o?'selected':''}>${Utils.esc(o)}</option>`).join('');
  };

  AgendaMedica.statusAgendaActionsV101=function(ag){
    const st=ag.status||'Agendado';
    if(st==='Aguardando'){
      return `<button class="ag-round-btn ag-atender-btn" onclick="AgendaMedica.abrirFilaAtendimentoV101('${ag.id}')">Na fila / Atender</button>
              <button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.modalAgendamento('${ag.id}')">Editar</button>`;
    }
    if(st==='Em atendimento'){
      return `<button class="ag-round-btn ag-atender-btn" onclick="AgendaMedica.abrirFilaAtendimentoV101('${ag.id}')">Em atendimento</button>`;
    }
    if(st==='Atendido'){
      return `<button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.modalAgendamento('${ag.id}')">Ver</button>`;
    }
    return `<button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.enviarFila('${ag.id}')">Chegou</button>
            <button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.modalAgendamento('${ag.id}')">Editar</button>
            <button class="ag-round-btn ag-cancelar-btn" onclick="AgendaMedica.cancelar('${ag.id}')">Cancelar</button>`;
  };

  // Render slots corrigido para trocar botões após "Chegou".
  if(AgendaMedica.renderSlots){
    AgendaMedica.renderSlots=function(){
      const f=this.filtro();
      const profId=f.prof;
      const tipo=f.tipo;
      const slots=this.slotsDia(f.data);
      const isProc=this.isProcedimentosRoute();

      if(!slots.length){
        return `<div class="ag-slots-wrap"><div class="ag-slot-print bloqueado"><div class="ag-slot-time">—</div><div class="ag-slot-info"><strong>Agenda bloqueada</strong><span>Este dia ou mês está bloqueado para atendimento.</span></div><div></div></div></div>`;
      }

      return `<div class="ag-slots-wrap">${slots.map(h=>{
        const slotFim=this.horaFim(h,this.intervaloAtual());
        const bloqueio=this.bloqueios().find(b=>this.isoFromBR(b.data)===f.data && (!b.profissionalId||b.profissionalId===profId) && b.horaInicio<=h && b.horaFim>h);

        if(bloqueio){
          return `<div class="ag-slot-print bloqueado">
            <div class="ag-slot-time">${h}</div>
            <div class="ag-slot-info"><strong>Bloqueado</strong><span>${Utils.esc(bloqueio.motivo||'Horário indisponível')}</span></div>
            <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalBloqueio('${bloqueio.id}')">Editar</button></div>
          </div>`;
        }

        const cruzado=this.agendamentos().find(a=>
          this.isoFromBR(a.data)===f.data &&
          a.profissionalId===profId &&
          (a.tipo||'consulta')!==tipo &&
          !['Cancelado','Faltou'].includes(a.status||'') &&
          this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
        );

        if(cruzado){
          const p=Store.get('PACIENTES').find(x=>x.id===cruzado.pacienteId)||{};
          return `<div class="ag-slot-print bloqueado-cruzado">
            <div class="ag-slot-time">${h}</div>
            <div class="ag-slot-info"><strong>Bloqueado</strong><span>Ocupado na ${cruzado.tipo==='procedimento'?'Agenda Procedimentos':'Agenda Médica'}${p.nome?' por '+Utils.esc(p.nome):''}</span></div>
            <div></div>
          </div>`;
        }

        const ag=this.agendamentos().find(a=>
          this.isoFromBR(a.data)===f.data &&
          a.profissionalId===profId &&
          (a.tipo||'consulta')===tipo &&
          !['Cancelado','Faltou'].includes(a.status||'') &&
          this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
        );

        if(ag){
          const p=Store.get('PACIENTES').find(x=>x.id===ag.pacienteId)||{};
          return `<div class="ag-slot-print ocupado ${isProc?'procedimento':''} status-${Utils.norm(ag.status||'agendado')}">
            <div class="ag-slot-time">${h}</div>
            <div class="ag-slot-info">
              <strong>${Utils.esc((this.nomeComIdadeV184 ? this.nomeComIdadeV184(ag,p) : '') || p.nome || ag.paciente || 'Paciente')}</strong>
              <span>Tel: ${Utils.esc(p.telefone||p.tel||'')} • ${Utils.esc(ag.tipoConsulta||((ag.tipo==='procedimento')?'Procedimento':'Consulta'))} • ${Utils.esc(ag.modalidade||'Presencial')}</span>
              <div class="ag-slot-extra"><span class="ag-mini-tag">${Utils.esc(ag.status||'Agendado')}</span>${ag.convenio?`<span class="ag-mini-tag">${Utils.esc(ag.convenio)}</span>`:''}</div>
            </div>
            <div class="ag-slot-actions">
              ${this.statusAgendaActionsV101(ag)}
            </div>
          </div>`;
        }

        return `<div class="ag-slot-print">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Vago</strong><span>Horário disponível</span></div>
          <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalAgendamento('', '${f.data}', '${h}')">${isProc?'Agendar procedimento':'Agendar'}</button></div>
        </div>`;
      }).join('')}</div>`;
    };
  }

  // Modal novo/editar com opção Procedimento no tipo de consulta.
  AgendaMedica.modalAgendamento=function(id='',data='',hora=''){
    const item=this.agendamentos().find(a=>String(a.id)===String(id))||{};
    const tipo=item.tipo||this.tipoAtual();
    const isProc=tipo==='procedimento';
    const pac=Store.get('PACIENTES').find(p=>String(p.id)===String(item.pacienteId))||{};
    const dataIso=this.isoFromBR(item.data)||data||this.filtro().data||this.hojeISO();
    const horarios=this.horariosDisponiveisModal(dataIso);
    const duracao=item.duracao||(isProc?15:30);
    const profissionais=this.profissionais();

    Modal.open(id?(isProc?'Editar Procedimento':'Editar Consulta'):(isProc?'Novo Procedimento':'Nova Consulta'),`
      <div class="ag-modal-grid-original">
        <div class="full ag-paciente-sugestoes">
          <label>Paciente * <span class="ag-modal-title-note">(busque por nome ou CPF)</span></label>
          <input id="ag-m-paciente-id" type="hidden" value="${Utils.esc(item.pacienteId||'')}">
          <input id="ag-m-paciente-busca" value="${Utils.esc(pac.nome||item.paciente||'')}" placeholder="Digite o nome ou CPF do paciente" autocomplete="off" onfocus="AgendaMedica.buscarPacienteAgenda(true)" oninput="AgendaMedica.buscarPacienteAgenda(false)">
          <div id="ag-paciente-results" class="ag-paciente-results"></div>
        </div>

        <div class="full">
          <label>Médico / Profissional *</label>
          <select id="ag-m-prof">${profissionais.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}${p.especialidade?' — '+Utils.esc(p.especialidade):''}</option>`).join('')}</select>
        </div>

        <div><label>Data *</label><input id="ag-m-data" type="date" value="${dataIso}" onchange="AgendaMedica.atualizarHorariosModal()"></div>
        <div><label>Horário inicial *</label><select id="ag-m-hora">${horarios.map(h=>`<option value="${h}">${h}</option>`).join('')}</select></div>
        <div><label>Duração *</label><select id="ag-m-duracao">${this.duracoes().map(d=>`<option value="${d}">${d} minutos</option>`).join('')}</select></div>

        <div><label>Convênio</label><input id="ag-m-convenio" value="${Utils.esc(item.convenio||pac.convenio||pac.plano||'')}" placeholder="Selecione o paciente"></div>

        <div>
          <label>Tipo da consulta</label>
          <select id="ag-m-tipo-consulta" onchange="AgendaMedica.sincronizarTipoConsultaV101()">
            ${this.tipoConsultaOptionsV101(item.tipoConsulta,isProc)}
          </select>
        </div>

        <div><label>Atendimento</label><select id="ag-m-modalidade"><option>Presencial</option><option>Virtual</option></select></div>
        <div><label>${isProc?'Valor do procedimento':'Valor da consulta'}</label><input id="ag-m-valor" value="${item.valorPrevisto?Number(item.valorPrevisto).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):''}" placeholder="R$ 0,00"></div>
        <div><label>Status</label><select id="ag-m-status"><option>Agendado</option><option>Aguardando</option><option>Confirmado</option><option>Atendido</option><option>Faltou</option><option>Cancelado</option></select></div>
        <div class="full"><label>${isProc?'Procedimento / Motivo':'Queixa / Motivo'}</label><input id="ag-m-proc" value="${Utils.esc(item.procedimento||'')}" placeholder="${isProc?'Ex. Limpeza, curativo, procedimento...':'Ex. Dor de cabeça frequente...'}"></div>
        <div class="full"><label>Observação</label><input id="ag-m-obs" value="${Utils.esc(item.obs||'')}" placeholder="Ex: paciente prefere atendimento no fim da manhã..."></div>

        <input id="ag-m-tipo" type="hidden" value="${tipo}">
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      ${id?`<button class="btn btn-outline" onclick="AgendaMedica.enviarFila('${id}')">Chegou / enviar para fila</button>`:''}
      <button class="btn btn-blue" onclick="AgendaMedica.saveAgendamento('${id}')">Salvar</button>
    `,'lg');

    setTimeout(()=>{
      const set=(idv,val)=>{const el=document.getElementById(idv); if(el) el.value=val;};
      set('ag-m-prof',item.profissionalId||this.profAtualId()||'');
      set('ag-m-hora',item.hora||hora||horarios[0]||'07:00');
      set('ag-m-duracao',String(duracao));
      set('ag-m-status',item.status||'Agendado');
      set('ag-m-modalidade',item.modalidade||'Presencial');
      set('ag-m-tipo-consulta',item.tipoConsulta||(isProc?'Procedimento':'Consulta'));
      this.sincronizarTipoConsultaV101();
    },30);
  };

  AgendaMedica.sincronizarTipoConsultaV101=function(){
    const sel=document.getElementById('ag-m-tipo-consulta');
    const tipoHidden=document.getElementById('ag-m-tipo');
    if(!sel || !tipoHidden) return;
    if(String(sel.value).toLowerCase()==='procedimento'){
      tipoHidden.value='procedimento';
    }else if(!tipoHidden.value){
      tipoHidden.value=this.tipoAtual();
    }
  };

  AgendaMedica.saveAgendamento=function(id=''){
    const pacienteId=document.getElementById('ag-m-paciente-id')?.value||'';
    const profissionalId=document.getElementById('ag-m-prof')?.value||'';
    if(!pacienteId||!profissionalId) return Utils.toast('Informe paciente e médico/profissional.');

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacienteId))||{};
    const prof=Store.get('PROFISSIONAIS').find(x=>String(x.id)===String(profissionalId))||{};
    const tipoConsulta=document.getElementById('ag-m-tipo-consulta')?.value||'Consulta';
    const tipo=String(tipoConsulta).toLowerCase()==='procedimento' ? 'procedimento' : (document.getElementById('ag-m-tipo')?.value||this.tipoAtual());

    const item={
      id:id||Utils.id('AG'),
      data:this.brFromInput(document.getElementById('ag-m-data').value),
      hora:document.getElementById('ag-m-hora').value,
      duracao:Number(document.getElementById('ag-m-duracao').value||((tipo==='procedimento')?15:30)),
      pacienteId,
      paciente:p.nome||p.nomeCompleto||'',
      profissionalId,
      profissional:prof.nome||'',
      tipo,
      procedimento:document.getElementById('ag-m-proc').value.trim(),
      modalidade:document.getElementById('ag-m-modalidade').value,
      tipoConsulta:tipoConsulta,
      status:document.getElementById('ag-m-status').value,
      convenio:document.getElementById('ag-m-convenio').value.trim()||p.convenio||p.plano||'',
      valorPrevisto:this.parseMoney(document.getElementById('ag-m-valor').value),
      obs:document.getElementById('ag-m-obs').value,
      criadoEm:id?(this.agendamentos().find(a=>String(a.id)===String(id))?.criadoEm||new Date().toISOString()):new Date().toISOString()
    };

    Store.upsert('AGENDA_MEDICA',item);
    Modal.close();
    this.render();
    Utils.toast(tipo==='procedimento'?'Procedimento salvo.':'Consulta salva.');
  };

  AgendaMedica.enviarFila=function(id){
    const a=this.agendamentos().find(x=>String(x.id)===String(id));
    if(!a) return Utils.toast('Agendamento não encontrado.');

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(a.pacienteId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const ativo=['Aguardando','Em atendimento'];
    const ja=Store.get('ATENDIMENTOS').find(x=>
      String(x.pacId||x.pacienteId)===String(p.id) &&
      ativo.includes(x.status||'')
    );

    let atendimentoId=ja?.id||Utils.id('ATD');
    const atendimento={
      ...(ja||{}),
      id:atendimentoId,
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome||p.nomeCompleto||'',
      data:Utils.today(),
      hora:ja?.hora||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      status:ja?.status||'Aguardando',
      tipo:a.tipo==='procedimento'?'Procedimento':'Consulta',
      procedimento:a.procedimento||'',
      modalidade:a.modalidade||'Presencial',
      tipoConsulta:a.tipoConsulta||(a.tipo==='procedimento'?'Procedimento':'Consulta'),
      profissionalId:a.profissionalId||'',
      profissional:a.profissional||'',
      origemAgendaId:a.id,
      convenio:a.convenio||p.convenio||p.plano||'',
      valorPrevisto:a.valorPrevisto||0,
      obs:a.obs||'',
      criadoEm:ja?.criadoEm||new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',atendimento);

    a.status=atendimento.status;
    a.chegouEm=new Date().toISOString();
    a.atendimentoId=atendimento.id;
    Store.upsert('AGENDA_MEDICA',a);

    Utils.toast(ja?'Paciente já estava na fila.':'Paciente enviado para fila.');

    try{
      Modal.close();
    }catch(e){}

    this.render();
  };

  AgendaMedica.abrirFilaAtendimentoV101=function(agendaId){
    const a=this.agendamentos().find(x=>String(x.id)===String(agendaId));
    if(a && (!a.atendimentoId || !Store.get('ATENDIMENTOS').find(x=>String(x.id)===String(a.atendimentoId)))){
      this.enviarFila(agendaId);
    }
    Router.go('atendimento');
  };
})();




/* =========================================================
   ZERO V10.2 — Enviar para fila preserva Tipo, Profissional e Status
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__filaTipoProfStatusV102) return;
  AgendaMedica.__filaTipoProfStatusV102=true;

  AgendaMedica.enviarFila=function(id){
    const a=this.agendamentos().find(x=>String(x.id)===String(id));
    if(!a) return Utils.toast('Agendamento não encontrado.');

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(a.pacienteId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const ativo=['Aguardando','Em atendimento'];
    const ja=Store.get('ATENDIMENTOS').find(x=>
      String(x.pacId||x.pacienteId)===String(p.id) &&
      ativo.includes(x.status||'')
    );

    const tipoFila = String(a.tipoConsulta||'').toLowerCase().includes('proced')
      ? 'Procedimento'
      : (String(a.tipoConsulta||'').toLowerCase().includes('retorno') ? 'Retorno' : (a.tipo==='procedimento'?'Procedimento':'Consulta'));

    const atendimento={
      ...(ja||{}),
      id:ja?.id||Utils.id('ATD'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome||p.nomeCompleto||'',
      data:Utils.today(),
      hora:ja?.hora||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      status:ja?.status||'Aguardando',
      tipo:tipoFila,
      tipoConsulta:tipoFila,
      procedimento:a.procedimento||'',
      modalidade:a.modalidade||'Presencial',
      profissionalId:a.profissionalId||'',
      profissional:a.profissional||'',
      origemAgendaId:a.id,
      agendaId:a.id,
      convenio:a.convenio||p.convenio||p.plano||'',
      valorPrevisto:a.valorPrevisto||0,
      obs:a.obs||'',
      criadoEm:ja?.criadoEm||new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',atendimento);

    a.status=atendimento.status;
    a.tipoConsulta=tipoFila;
    a.chegouEm=new Date().toISOString();
    a.atendimentoId=atendimento.id;
    Store.upsert('AGENDA_MEDICA',a);

    Utils.toast(ja?'Paciente já estava na fila.':'Paciente enviado para fila.');
    try{ Modal.close(); }catch(e){}
    this.render();
  };
})();




/* =========================================================
   ZERO V11.7 — Agenda puxa horários do profissional selecionado
   - diaSemanaConfig agora usa PROFISSIONAIS[profId].horariosSemana.
   - Se o profissional não tiver horário cadastrado, usa o padrão.
   - Configuração global deixa de mandar nos horários semanais.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__horariosPorProfissionalV117) return;
  AgendaMedica.__horariosPorProfissionalV117=true;

  AgendaMedica.horariosPadraoProfV117=function(){
    if(window.Profissionais?.horariosPadraoV117) return Profissionais.horariosPadraoV117();
    return {
      0:{ativo:false,inicio:'07:00',fim:'12:00'},
      1:{ativo:true,inicio:'07:00',fim:'18:00'},
      2:{ativo:true,inicio:'07:00',fim:'18:00'},
      3:{ativo:true,inicio:'07:00',fim:'18:00'},
      4:{ativo:true,inicio:'07:00',fim:'18:00'},
      5:{ativo:true,inicio:'07:00',fim:'18:00'},
      6:{ativo:false,inicio:'07:00',fim:'12:00'}
    };
  };

  AgendaMedica.profissionalPorIdV117=function(id){
    return (Store.get('PROFISSIONAIS')||[]).find(p=>String(p.id)===String(id)) || null;
  };

  AgendaMedica.horariosDoProfissionalV117=function(profId){
    const prof=this.profissionalPorIdV117(profId||this.profAtualId());
    let h=Utils.clone(prof?.horariosSemana||prof?.horarios||{});
    const pad=this.horariosPadraoProfV117();
    Object.keys(pad).forEach(k=>{
      h[k]=Object.assign({},pad[k],h[k]||{});
      h[k].ativo = h[k].ativo!==false && String(h[k].ativo)!=='false';
      h[k].inicio = h[k].inicio || pad[k].inicio;
      h[k].fim = h[k].fim || pad[k].fim;
    });
    return h;
  };

  AgendaMedica.diaSemanaConfig=function(iso){
    const d=new Date(iso+'T12:00:00');
    const profId=this.profAtualId();
    const h=this.horariosDoProfissionalV117(profId);
    return h[d.getDay()] || {ativo:false,inicio:'07:00',fim:'18:00'};
  };

  const oldRender=AgendaMedica.render?.bind(AgendaMedica);
  AgendaMedica.render=function(){
    const ret=oldRender ? oldRender() : undefined;
    setTimeout(()=>{
      const profId=this.profAtualId();
      const prof=this.profissionalPorIdV117(profId);
      const box=document.querySelector('.ag-legend');
      if(box && prof && !document.querySelector('.ag-prof-horario-info-v117')){
        const h=this.horariosDoProfissionalV117(profId);
        const dias=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((n,i)=>`${n}: ${h[i].ativo?`${h[i].inicio}-${h[i].fim}`:'Fechado'}`).join(' • ');
        box.insertAdjacentHTML('afterend',`<div class="ag-prof-horario-info-v117"><strong>Horário de ${Utils.esc(prof.nome||'profissional')}:</strong> ${Utils.esc(dias)}</div>`);
      }
    },30);
    return ret;
  };

  const oldConfig=AgendaMedica.modalConfigOriginal?.bind(AgendaMedica);
  AgendaMedica.modalConfigOriginal=function(){
    const ret=oldConfig ? oldConfig() : undefined;
    setTimeout(()=>{
      const cards=document.querySelectorAll('.ag-config-modal-card');
      cards.forEach(card=>{
        const txt=card.textContent||'';
        if(txt.includes('Horários semanais') || txt.includes('Horarios semanais') || txt.includes('horários semanais')){
          card.style.display='none';
        }
      });
      const body=document.querySelector('#modal-root .modal-body');
      if(body && !document.querySelector('.ag-config-prof-msg-v117')){
        body.insertAdjacentHTML('afterbegin',`
          <div class="ag-config-prof-msg-v117">
            Os horários semanais agora ficam no cadastro de cada profissional.
            Vá em <strong>Profissionais</strong> → editar profissional → <strong>Horários da agenda deste profissional</strong>.
          </div>
        `);
      }
    },60);
    return ret;
  };
})();




/* =========================================================
   ZERO V12.2 — Agendas estáveis e sem bloco de horário do profissional
   Correções:
   - Remove o aviso "Horário de Dr..." da Agenda Médica e Agenda Procedimentos.
   - Entrada nos menus de agenda fica estabilizada, sem piscar.
   - Renderiza escondido por um instante e só mostra quando terminou.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__agendasEstaveisV122) return;
  AgendaMedica.__agendasEstaveisV122=true;

  AgendaMedica.removerInfoHorarioProfissionalV122=function(){
    try{
      document.querySelectorAll('.ag-prof-horario-info-v117,.ag-config-prof-msg-v117').forEach(el=>el.remove());
    }catch(e){}
  };

  const oldRenderV122=AgendaMedica.render?.bind(AgendaMedica);
  AgendaMedica.render=function(){
    document.body.classList.add('agenda-rendering-stable-v122');

    const ret=oldRenderV122 ? oldRenderV122(...arguments) : undefined;

    // remove imediatamente e depois dos setTimeout antigos que adicionavam esse bloco.
    this.removerInfoHorarioProfissionalV122();
    setTimeout(()=>this.removerInfoHorarioProfissionalV122(),35);
    setTimeout(()=>this.removerInfoHorarioProfissionalV122(),90);

    requestAnimationFrame(()=>{
      this.removerInfoHorarioProfissionalV122();
      requestAnimationFrame(()=>{
        this.removerInfoHorarioProfissionalV122();
        document.body.classList.remove('agenda-rendering-stable-v122');
      });
    });

    return ret;
  };

  AgendaMedica.renderConsultaRoute=function(){
    document.body.classList.add('agenda-rendering-stable-v122');
    this.modoAgenda='consulta';
    return this.render();
  };

  AgendaMedica.renderProcedimentosRoute=function(){
    document.body.classList.add('agenda-rendering-stable-v122');
    this.modoAgenda='procedimento';
    return this.render();
  };

  // Na configuração da agenda também não precisa aparecer o aviso antigo sobre horários.
  const oldConfigV122=AgendaMedica.modalConfigOriginal?.bind(AgendaMedica);
  if(oldConfigV122 && !oldConfigV122.__semInfoHorarioV122){
    const wrapped=function(){
      const ret=oldConfigV122(...arguments);
      setTimeout(()=>this.removerInfoHorarioProfissionalV122(),20);
      setTimeout(()=>this.removerInfoHorarioProfissionalV122(),80);
      return ret;
    };
    wrapped.__semInfoHorarioV122=true;
    AgendaMedica.modalConfigOriginal=wrapped;
  }
})();




/* =========================================================
   ZERO V12.4 — Agenda: valor no card do agendamento
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__valorCardV124) return;
  AgendaMedica.__valorCardV124=true;

  AgendaMedica.formatMoneyV124=function(v){
    const n=Number(v||0);
    if(!n) return '';
    return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  };

  AgendaMedica.aplicarValorNosCardsV124=function(){
    const f=this.filtro();
    document.querySelectorAll('.ag-slot-print.ocupado').forEach(card=>{
      if(card.querySelector('.ag-valor-card-v124')) return;
      const h=card.querySelector('.ag-slot-time')?.textContent?.trim();
      const ag=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data &&
        a.profissionalId===f.prof &&
        (a.tipo||'consulta')===f.tipo &&
        a.hora===h
      );
      const valor=this.formatMoneyV124(ag?.valorPrevisto||ag?.valorConsulta||ag?.valor);
      if(!valor) return;
      const extra=card.querySelector('.ag-slot-extra')||card.querySelector('.ag-slot-info');
      extra?.insertAdjacentHTML('beforeend',`<span class="ag-mini-tag ag-valor-card-v124">Valor: ${Utils.esc(valor)}</span>`);
    });
  };

  const oldRenderV124=AgendaMedica.render?.bind(AgendaMedica);
  AgendaMedica.render=function(){
    const ret=oldRenderV124 ? oldRenderV124(...arguments) : undefined;
    setTimeout(()=>this.aplicarValorNosCardsV124(),60);
    return ret;
  };
})();




/* =========================================================
   ZERO V12.5 — Chegou / enviar para fila sem piscar a agenda
   Correções:
   - Ao clicar Chegou, não renderiza a tela toda antes de estabilizar.
   - Atualiza só os dados e o card visual do botão clicado.
   - Evita piscada na Agenda Médica e Agenda Procedimentos.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__chegouEstavelV125) return;
  AgendaMedica.__chegouEstavelV125=true;

  AgendaMedica.marcarCardChegouV125=function(id){
    const btn=document.querySelector(`button[onclick*="AgendaMedica.enviarFila('${id}')"],button[onclick*='AgendaMedica.enviarFila("${id}")']`);
    const card=btn?.closest('.ag-slot-print');
    if(card){
      card.classList.add('ag-chegou-estavel-v125');
      const tag=card.querySelector('.ag-mini-tag');
      if(tag) tag.textContent='Aguardando';
      if(btn){
        btn.textContent='Na fila';
        btn.disabled=true;
        btn.classList.add('disabled');
      }
    }
  };

  AgendaMedica.enviarFila=function(id){
    const a=this.agendamentos().find(x=>String(x.id)===String(id));
    if(!a) return Utils.toast('Agendamento não encontrado.');

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(a.pacienteId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const ja=Store.get('ATENDIMENTOS').find(x=>
      String(x.pacId||x.pacienteId)===String(p.id) &&
      (x.status==='Aguardando'||x.status==='Em atendimento')
    );
    if(ja) return Utils.toast('Paciente já está na fila.');

    document.body.classList.add('agenda-chegou-stable-v125');

    const agora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const item={
      id:Utils.id('AT'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome,
      data:Utils.today(),
      hora:a.hora||agora,
      horaAgendada:a.hora||'',
      horaChegada:agora,
      chegouHora:agora,
      profissionalId:a.profissionalId||'',
      profissional:a.profissional||'',
      tipo:a.tipoConsulta||a.tipo||'Consulta',
      tipoConsulta:a.tipoConsulta||a.tipo||'Consulta',
      origem:a.tipo||'consulta',
      origemAgendaId:a.id,
      status:'Aguardando',
      convenio:a.convenio||p.convenio||p.plano||'',
      procedimento:a.procedimento||'',
      queixa:a.procedimento||'',
      obs:a.obs||'',
      valorPrevisto:a.valorPrevisto||0,
      criadoEm:new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',item);

    a.status='Aguardando';
    a.atendimentoId=item.id;
    a.chegouEm=new Date().toISOString();
    a.horaChegada=agora;
    Store.upsert('AGENDA_MEDICA',a);

    this.marcarCardChegouV125(id);

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        document.body.classList.remove('agenda-chegou-stable-v125');
      });
    });

    Utils.toast('Paciente enviado para fila.');
  };
})();




/* =========================================================
   ZERO V12.6 — Agenda alimenta/remove financeiro
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__financeiroAgendaV126) return;
  AgendaMedica.__financeiroAgendaV126=true;

  const oldSaveV126=AgendaMedica.saveAgendamento?.bind(AgendaMedica);
  AgendaMedica.saveAgendamento=function(id=''){
    const ret=oldSaveV126 ? oldSaveV126(id) : undefined;

    try{
      const lista=Store.get('AGENDA_MEDICA')||[];
      let item=null;
      if(id) item=lista.find(a=>String(a.id)===String(id));
      if(!item){
        item=lista.slice().sort((a,b)=>(Date.parse(b.criadoEm||'')||0)-(Date.parse(a.criadoEm||'')||0))[0];
      }
      if(item && window.Financeiro?.upsertReceitaAutomaticaV126){
        Financeiro.upsertReceitaAutomaticaV126('agenda',item);
      }
    }catch(e){console.warn('Financeiro agenda V12.6',e);}

    return ret;
  };

  const oldCancelarV126=AgendaMedica.cancelar?.bind(AgendaMedica);
  AgendaMedica.cancelar=function(id){
    if(window.Financeiro?.removerReceitaAutomaticaV126){
      Financeiro.removerReceitaAutomaticaV126('agenda',id);
    }
    return oldCancelarV126 ? oldCancelarV126(id) : undefined;
  };

  AgendaMedica.excluirAgendamentoV126=function(id){
    if(!confirm('Excluir este agendamento e remover a receita automática do financeiro?')) return;
    if(window.Financeiro?.removerReceitaAutomaticaV126){
      Financeiro.removerReceitaAutomaticaV126('agenda',id);
    }
    Store.set('AGENDA_MEDICA',(Store.get('AGENDA_MEDICA')||[]).filter(a=>String(a.id)!==String(id)));
    Utils.toast('Agendamento excluído e financeiro atualizado.');
    this.render();
  };
})();




/* =========================================================
   ZERO V12.7 — Troca de datas nas agendas sem piscar
   Correções:
   - Mudar data na Agenda Médica não esconde mais a tela.
   - Mudar data na Agenda de Procedimentos não esconde mais a tela.
   - Remove o efeito antigo que deixava #content invisível durante render.
   - Mantém altura da agenda durante a troca para não dar "pulo".
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__datasSemPiscarV127) return;
  AgendaMedica.__datasSemPiscarV127=true;

  AgendaMedica.prepararRenderSemPiscarV127=function(){
    const content=document.getElementById('content');
    if(content){
      content.classList.add('agenda-content-stable-v127');
      const h=content.offsetHeight||0;
      if(h>200) content.style.minHeight=h+'px';
    }
    document.body.classList.remove('agenda-rendering-stable-v122');
    document.body.classList.add('agenda-no-blink-v127');
  };

  AgendaMedica.finalizarRenderSemPiscarV127=function(){
    document.body.classList.remove('agenda-rendering-stable-v122');
    document.body.classList.remove('agenda-chegou-stable-v125');
    document.body.classList.remove('agenda-no-blink-v127');

    const content=document.getElementById('content');
    if(content){
      content.classList.add('agenda-content-stable-v127');
      setTimeout(()=>{ content.style.minHeight=''; },120);
    }

    if(this.removerInfoHorarioProfissionalV122) this.removerInfoHorarioProfissionalV122();
  };

  const oldRenderV127=AgendaMedica.render?.bind(AgendaMedica);
  AgendaMedica.render=function(){
    this.prepararRenderSemPiscarV127();

    const ret=oldRenderV127 ? oldRenderV127(...arguments) : undefined;

    // O patch antigo V12.2 adicionava classe que escondia #content.
    // Remove imediatamente e nos próximos frames.
    this.finalizarRenderSemPiscarV127();
    requestAnimationFrame(()=>this.finalizarRenderSemPiscarV127());
    setTimeout(()=>this.finalizarRenderSemPiscarV127(),35);
    setTimeout(()=>this.finalizarRenderSemPiscarV127(),90);

    return ret;
  };

  AgendaMedica.selecionarDia=function(iso){
    const el=document.getElementById('ag-data');
    if(el) el.value=iso;
    return this.render();
  };

  AgendaMedica.mudarMes=function(delta){
    const d=new Date((document.getElementById('ag-data')?.value||this.hojeISO())+'T12:00:00');
    d.setMonth(d.getMonth()+delta);
    d.setDate(1);
    const el=document.getElementById('ag-data');
    if(el) el.value=d.toISOString().slice(0,10);
    return this.render();
  };

  AgendaMedica.renderConsultaRoute=function(){
    this.modoAgenda='consulta';
    return this.render();
  };

  AgendaMedica.renderProcedimentosRoute=function(){
    this.modoAgenda='procedimento';
    return this.render();
  };
})();




/* =========================================================
   ZERO V12.8 — Botão Salvar Nova Consulta corrigido
   Correções:
   - Salvar Nova Consulta volta a funcionar.
   - Salvar Novo Procedimento também fica protegido.
   - Não depende da cadeia antiga de wrappers.
   - Integra Financeiro quando houver valor.
   - Renderiza agenda depois de salvar sem piscar.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__salvarNovaConsultaFixV128) return;
  AgendaMedica.__salvarNovaConsultaFixV128=true;

  AgendaMedica.getValV128=function(id){
    return (document.getElementById(id)?.value||'').trim();
  };

  AgendaMedica.parseMoneyV128=function(v){
    if(typeof v==='number') return v;
    let s=String(v||'').trim();
    if(!s) return 0;
    s=s.replace(/[R$\s.]/g,'').replace(',','.');
    return Number(s)||0;
  };

  AgendaMedica.saveAgendamento=function(id=''){
    try{
      const pacienteId=this.getValV128('ag-m-paciente-id');
      const profissionalId=this.getValV128('ag-m-prof');

      if(!pacienteId) return Utils.toast('Informe o paciente.');
      if(!profissionalId) return Utils.toast('Informe o profissional.');

      const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacienteId))||{};
      const prof=Store.get('PROFISSIONAIS').find(x=>String(x.id)===String(profissionalId))||{};
      const antigo=id ? (this.agendamentos().find(a=>String(a.id)===String(id))||{}) : {};
      const tipo=this.getValV128('ag-m-tipo') || this.tipoAtual();

      const item={
        ...antigo,
        id:id||Utils.id('AG'),
        data:this.brFromInput(this.getValV128('ag-m-data') || this.filtro().data || this.hojeISO()),
        hora:this.getValV128('ag-m-hora') || '07:00',
        duracao:Number(this.getValV128('ag-m-duracao')||((tipo==='procedimento')?15:30)),
        pacienteId,
        paciente:p.nome||antigo.paciente||'',
        profissionalId,
        profissional:prof.nome||antigo.profissional||'',
        tipo,
        procedimento:this.getValV128('ag-m-proc'),
        modalidade:this.getValV128('ag-m-modalidade') || 'Presencial',
        tipoConsulta:this.getValV128('ag-m-tipo-consulta') || (tipo==='procedimento'?'Procedimento':'Consulta'),
        status:this.getValV128('ag-m-status') || 'Agendado',
        convenio:this.getValV128('ag-m-convenio') || p.convenio || p.plano || '',
        valorPrevisto:this.parseMoneyV128(this.getValV128('ag-m-valor')),
        obs:this.getValV128('ag-m-obs'),
        criadoEm:antigo.criadoEm||new Date().toISOString(),
        atualizadoEm:new Date().toISOString()
      };

      Store.upsert('AGENDA_MEDICA',item);

      if(window.Financeiro?.upsertReceitaAutomaticaV126){
        Financeiro.upsertReceitaAutomaticaV126('agenda',item);
      }

      Modal.close();
      this.render();
      Utils.toast(tipo==='procedimento'?'Procedimento salvo.':'Consulta salva.');
      return true;

    }catch(err){
      console.error('Erro ao salvar agendamento V12.8:',err);
      Utils.toast('Erro ao salvar consulta. Verifique os campos e tente novamente.');
      return false;
    }
  };

  // Reforça o botão do modal caso algum HTML antigo tenha ficado sem type/button correto.
  const oldModalV128=AgendaMedica.modalAgendamento?.bind(AgendaMedica);
  if(oldModalV128 && !oldModalV128.__fixSalvarV128){
    const wrapped=function(){
      const ret=oldModalV128(...arguments);
      setTimeout(()=>{
        const footer=document.querySelector('#modal-root .modal-footer');
        if(footer){
          footer.querySelectorAll('button').forEach(b=>b.setAttribute('type','button'));
          const salvar=Array.from(footer.querySelectorAll('button')).find(b=>String(b.textContent||'').trim()==='Salvar');
          if(salvar){
            const id=arguments[0]||'';
            salvar.onclick=function(ev){
              if(ev){ev.preventDefault();ev.stopPropagation();}
              return AgendaMedica.saveAgendamento(id);
            };
          }
        }
      },40);
      return ret;
    };
    wrapped.__fixSalvarV128=true;
    AgendaMedica.modalAgendamento=wrapped;
  }
})();




/* =========================================================
   ZERO V13.2 — Chegou / enviar para fila corrigido
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__chegouFilaFixV132) return;
  AgendaMedica.__chegouFilaFixV132=true;

  AgendaMedica.enviarFila=function(id){
    const a=this.agendamentos().find(x=>String(x.id)===String(id));
    if(!a) return Utils.toast('Agendamento não encontrado.');

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(a.pacienteId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const ja=(Store.get('ATENDIMENTOS')||[]).find(x=>
      String(x.pacId||x.pacienteId)===String(p.id) &&
      (x.status==='Aguardando'||x.status==='Em atendimento')
    );
    if(ja) return Utils.toast('Paciente já está na fila.');

    const agora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

    const item={
      id:Utils.id('AT'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome||'',
      data:Utils.today(),
      hora:a.hora||agora,
      horaAgendada:a.hora||'',
      horaChegada:agora,
      chegouHora:agora,
      profissionalId:a.profissionalId||'',
      profissional:a.profissional||'',
      tipo:a.tipoConsulta||a.tipo||'Consulta',
      tipoConsulta:a.tipoConsulta||a.tipo||'Consulta',
      origem:a.tipo||'consulta',
      origemAgendaId:a.id,
      status:'Aguardando',
      convenio:a.convenio||p.convenio||p.plano||'',
      procedimento:a.procedimento||'',
      queixa:a.procedimento||'',
      obs:a.obs||'',
      valorPrevisto:a.valorPrevisto||0,
      criadoEm:new Date().toISOString()
    };

    Store.upsert('ATENDIMENTOS',item);

    a.status='Aguardando';
    a.atendimentoId=item.id;
    a.chegouEm=new Date().toISOString();
    a.horaChegada=agora;
    Store.upsert('AGENDA_MEDICA',a);

    if(item.valorPrevisto && window.Financeiro?.upsertReceitaAutomaticaV126){
      Financeiro.upsertReceitaAutomaticaV126('agenda',a);
    }

    if(this.marcarCardChegouV125) this.marcarCardChegouV125(id);
    else this.render();

    Utils.toast('Paciente enviado para fila.');
    return true;
  };
})();


/* =========================================================
   ZERO V13.4 — Agenda: cores aplicadas + Chegou robusto
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__coresChegouV134) return;
  AgendaMedica.__coresChegouV134=true;

  AgendaMedica.slotStyleV134=function(chave){
    const cfg=this.cfg();
    const cor=(cfg.cores&&cfg.cores[chave]) || this.defaultColors()[chave] || '#e2e8f0';
    const hex=String(cor||'').replace('#','');
    const rgb=hex.length===3
      ? [parseInt(hex[0]+hex[0],16),parseInt(hex[1]+hex[1],16),parseInt(hex[2]+hex[2],16)]
      : [parseInt(hex.slice(0,2),16)||37,parseInt(hex.slice(2,4),16)||99,parseInt(hex.slice(4,6),16)||235];
    const lum=((rgb[0]*299)+(rgb[1]*587)+(rgb[2]*114))/1000;
    const text=lum<145?'#ffffff':'#0f172a';
    const bg=lum<145?`linear-gradient(135deg, ${cor}, ${cor}dd)`:`linear-gradient(135deg, ${cor}22, ${cor}14)`;
    const border=cor;
    return `background:${bg};border-color:${border};color:${text};`;
  };

  AgendaMedica.renderSlots=function(){
    const f=this.filtro();
    const profId=f.prof;
    const tipo=f.tipo;
    const slots=this.slotsDia(f.data);
    const isProc=this.isProcedimentosRoute();

    if(!slots.length){
      return `<div class="ag-slots-wrap"><div class="ag-slot-print bloqueado" style="${this.slotStyleV134('bloqueio')}"><div class="ag-slot-time">—</div><div class="ag-slot-info"><strong>Agenda bloqueada</strong><span>Este dia ou mês está bloqueado para atendimento.</span></div><div></div></div></div>`;
    }

    return `<div class="ag-slots-wrap">${slots.map(h=>{
      const slotFim=this.horaFim(h,this.intervaloAtual());
      const bloqueio=this.bloqueios().find(b=>this.isoFromBR(b.data)===f.data && (!b.profissionalId||b.profissionalId===profId) && b.horaInicio<=h && b.horaFim>h);
      if(bloqueio){
        return `<div class="ag-slot-print bloqueado" style="${this.slotStyleV134('bloqueio')}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>${Utils.esc(bloqueio.motivo||'Horário indisponível')}</span></div>
          <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalBloqueio('${bloqueio.id}')">Editar</button></div>
        </div>`;
      }

      const cruzado=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data && a.profissionalId===profId && (a.tipo||'consulta')!==tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );
      if(cruzado){
        const p=Store.get('PACIENTES').find(x=>x.id===cruzado.pacienteId)||{};
        return `<div class="ag-slot-print bloqueado-cruzado" style="${this.slotStyleV134('bloqueio')}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>Ocupado na ${(cruzado.tipo==='procedimento'?'Agenda Procedimentos':'Agenda Médica')}${p.nome?' por '+Utils.esc(p.nome):''}</span></div>
          <div></div>
        </div>`;
      }

      const ag=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data && a.profissionalId===profId && (a.tipo||'consulta')===tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );
      if(ag){
        const p=Store.get('PACIENTES').find(x=>x.id===ag.pacienteId)||{};
        const chaveStatus=(String(ag.status||'Agendado').toLowerCase().includes('atend')?'atendido':String(ag.status||'').toLowerCase().includes('aguard')?'aguardando':String(ag.status||'').toLowerCase().includes('confirm')?'confirmado':(ag.tipoConsulta||'').toLowerCase().includes('proced')?'procedimento':'consulta');
        return `<div class="ag-slot-print ocupado ${isProc?'procedimento':''}" style="${this.slotStyleV134(chaveStatus)}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info">
            <strong>${Utils.esc((this.nomeComIdadeV184 ? this.nomeComIdadeV184(ag,p) : '') || p.nome || ag.paciente || 'Paciente')}</strong>
            <span>Tel: ${Utils.esc(p.telefone||p.tel||'')} • ${Utils.esc(ag.tipoConsulta||'Consulta')} • ${Utils.esc(ag.modalidade||'Presencial')}</span>
            <div class="ag-slot-extra"><span class="ag-mini-tag">${Utils.esc(ag.status||'Agendado')}</span>${ag.convenio?`<span class="ag-mini-tag">${Utils.esc(ag.convenio)}</span>`:''}${ag.valorPrevisto?`<span class="ag-mini-tag">R$ ${Utils.money(ag.valorPrevisto)}</span>`:''}</div>
          </div>
          <div class="ag-slot-actions">
            ${(ag.status==='Aguardando'||ag.atendimentoId)?`<button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.abrirFilaAgenda('${ag.atendimentoId||''}')">Fila</button><button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.abrirAtenderAgenda('${ag.atendimentoId||''}','${ag.pacienteId||''}')">Atender</button>`:`<button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.enviarFila('${ag.id}')">Chegou</button>`}
            <button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.modalAgendamento('${ag.id}')">Editar</button>
            <button class="ag-round-btn ag-cancelar-btn" onclick="AgendaMedica.cancelar('${ag.id}')">Cancelar</button>
          </div>
        </div>`;
      }

      return `<div class="ag-slot-print" style="${this.slotStyleV134('vago')}">
        <div class="ag-slot-time">${h}</div>
        <div class="ag-slot-info"><strong>Vago</strong><span>Horário disponível</span></div>
        <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalAgendamento('', '${f.data}', '${h}')">${isProc?'Agendar procedimento':'Agendar'}</button></div>
      </div>`;
    }).join('')}</div>`;
  };

  AgendaMedica.abrirFilaAgenda=function(){
    if(window.Router) Router.go('fila-atendimento');
  };
  AgendaMedica.abrirAtenderAgenda=function(atendimentoId,pacId){
    const at=(Store.get('ATENDIMENTOS')||[]).find(x=>String(x.id)===String(atendimentoId));
    const pid=pacId || at?.pacId || at?.pacienteId || '';
    if(!pid) return Utils.toast('Atendimento ainda não encontrado na fila.');
    if(window.RegistrarConsulta?.open) return RegistrarConsulta.open(pid, atendimentoId||at?.id||'');
  };

  AgendaMedica.salvarCoresOriginal=function(){
    const cfg=this.cfg();
    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });
    this.saveCfg(cfg);
    Utils.toast('Cores salvas.');
    Modal.close();
    setTimeout(()=>this.render(),10);
  };

  AgendaMedica.enviarFila=function(id){
    const a=this.agendamentos().find(x=>String(x.id)===String(id));
    if(!a) return Utils.toast('Agendamento não encontrado.');
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(a.pacienteId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    let item=(Store.get('ATENDIMENTOS')||[]).find(x=>String(x.origemAgendaId||'')===String(a.id));
    const agora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    if(!item){
      item={
        id:Utils.id('AT'),
        pacId:p.id,pacienteId:p.id,paciente:p.nome||'',
        data:Utils.today(),hora:a.hora||agora,horaAgendada:a.hora||'',horaChegada:agora,chegouHora:agora,
        profissionalId:a.profissionalId||'',profissional:a.profissional||'',
        tipo:a.tipoConsulta||a.tipo||'Consulta',tipoConsulta:a.tipoConsulta||a.tipo||'Consulta',
        origem:a.tipo||'consulta',origemAgendaId:a.id,status:'Aguardando',
        convenio:a.convenio||p.convenio||p.plano||'',procedimento:a.procedimento||'',queixa:a.procedimento||'',obs:a.obs||'',valorPrevisto:a.valorPrevisto||0,criadoEm:new Date().toISOString()
      };
    }else{
      item.status='Aguardando';
      item.horaChegada=item.horaChegada||agora;
      item.chegouHora=item.chegouHora||agora;
    }
    Store.upsert('ATENDIMENTOS',item);
    a.status='Aguardando';
    a.atendimentoId=item.id;
    a.chegouEm=new Date().toISOString();
    a.horaChegada=agora;
    Store.upsert('AGENDA_MEDICA',a);
    if(item.valorPrevisto && window.Financeiro?.upsertReceitaAutomaticaV126){ Financeiro.upsertReceitaAutomaticaV126('agenda',a); }
    Utils.toast('Paciente enviado para fila.');
    setTimeout(()=>this.render(),10);
    return true;
  };
})();




/* =========================================================
   ZERO V13.9 — Agenda: configuração sem piscar + cards legíveis
   Correções:
   - Configurações da agenda abrem sem piscar.
   - Cards de consulta/procedimento não ficam com texto branco.
   - Cores configuradas continuam aparecendo no sistema, mas como faixa/borda,
     não pintando todo o texto do card.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__agendaConfigCardsFixV139) return;
  AgendaMedica.__agendaConfigCardsFixV139=true;

  AgendaMedica.corAgendaV139=function(chave){
    const cfg=this.cfg ? this.cfg() : {};
    const defaults=this.defaultColors ? this.defaultColors() : {};
    return (cfg.cores&&cfg.cores[chave]) || defaults[chave] || '#2563eb';
  };

  // Substitui o estilo herdado da v13.4 que podia deixar texto branco.
  AgendaMedica.slotStyleV134=function(chave){
    const cor=this.corAgendaV139(chave);
    return `--ag-accent:${cor};background:#ffffff;border-color:#e2e8f0;border-left:7px solid ${cor};color:#0f172a;`;
  };

  AgendaMedica.aplicarCardsLegiveisV139=function(){
    document.querySelectorAll('.ag-slot-print').forEach(card=>{
      card.style.color='#0f172a';
      card.querySelectorAll('.ag-slot-time,.ag-slot-info,.ag-slot-info strong,.ag-slot-info span,.ag-slot-extra,.ag-mini-tag').forEach(el=>{
        el.style.color='#0f172a';
      });
    });
  };

  const oldRenderV139=AgendaMedica.render?.bind(AgendaMedica);
  if(oldRenderV139 && !oldRenderV139.__cardsLegiveisV139){
    const wrapped=function(){
      const ret=oldRenderV139(...arguments);
      requestAnimationFrame(()=>this.aplicarCardsLegiveisV139());
      setTimeout(()=>this.aplicarCardsLegiveisV139(),60);
      return ret;
    };
    wrapped.__cardsLegiveisV139=true;
    AgendaMedica.render=wrapped;
  }

  const oldModalConfigV139=AgendaMedica.modalConfigOriginal?.bind(AgendaMedica);
  if(oldModalConfigV139 && !oldModalConfigV139.__semPiscarV139){
    const wrapped=function(){
      document.body.classList.add('agenda-config-no-blink-v139');
      const root=document.getElementById('modal-root');
      if(root){
        root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
        root.style.visibility='visible';
        root.style.opacity='1';
      }

      const ret=oldModalConfigV139(...arguments);

      const estabilizar=()=>{
        const r=document.getElementById('modal-root');
        if(r){
          r.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
          r.style.visibility='visible';
          r.style.opacity='1';
          r.querySelectorAll('.modal,.modal-backdrop').forEach(m=>{
            m.style.transition='none';
            m.style.animation='none';
            m.style.opacity='1';
            m.style.visibility='visible';
          });
        }
        document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');
        document.body.classList.add('modal-open-v99');
        if(window.Modal?.syncV137) Modal.syncV137();
        if(window.Modal?.syncLayersV135) Modal.syncLayersV135();
      };

      requestAnimationFrame(estabilizar);
      setTimeout(estabilizar,25);
      setTimeout(()=>{
        estabilizar();
        document.body.classList.remove('agenda-config-no-blink-v139');
      },160);

      return ret;
    };
    wrapped.__semPiscarV139=true;
    AgendaMedica.modalConfigOriginal=wrapped;
  }

  // Cores salvam, aparecem imediatamente e não deixam cards brancos.
  AgendaMedica.salvarCoresOriginal=function(){
    const cfg=this.cfg();
    if(!cfg.cores) cfg.cores=this.defaultColors();

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });

    this.saveCfg(cfg);
    Utils.toast('Cores salvas.');

    // Não força tela branca nem troca visual: só fecha o modal e renderiza estável.
    Modal.close();
    document.body.classList.add('agenda-config-no-blink-v139');
    setTimeout(()=>{
      this.render();
      this.aplicarCardsLegiveisV139();
      document.body.classList.remove('agenda-config-no-blink-v139');
    },20);

    return true;
  };

  AgendaMedica.restaurarCoresOriginal=function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);
    Utils.toast('Cores restauradas.');
    Modal.close();
    document.body.classList.add('agenda-config-no-blink-v139');
    setTimeout(()=>{
      this.render();
      this.aplicarCardsLegiveisV139();
      document.body.classList.remove('agenda-config-no-blink-v139');
    },20);
    return true;
  };

  setTimeout(()=>AgendaMedica.aplicarCardsLegiveisV139(),120);
})();




/* =========================================================
   ZERO V14.2 — Cards da agenda de volta ao visual original
   Correção:
   - Remove faixa/borda lateral criada na V13.9.
   - Volta cards de Consulta e Procedimento para as classes originais:
     .ag-slot-print, .ocupado, .procedimento, .bloqueado.
   - Mantém o salvamento das cores nas configurações, mas não altera
     o visual original dos cards.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__cardsOriginaisV142) return;
  AgendaMedica.__cardsOriginaisV142=true;

  // Desativa o estilo inline de cor da V13.9/V13.4.
  AgendaMedica.slotStyleV134=function(){ return ''; };
  AgendaMedica.slotStyleV139=function(){ return ''; };
  AgendaMedica.aplicarCardsLegiveisV139=function(){ return true; };

  AgendaMedica.renderSlots=function(){
    const f=this.filtro();
    const profId=f.prof;
    const tipo=f.tipo;
    const slots=this.slotsDia(f.data);
    const isProc=this.isProcedimentosRoute();

    if(!slots.length){
      return `<div class="ag-slots-wrap"><div class="ag-slot-print bloqueado"><div class="ag-slot-time">—</div><div class="ag-slot-info"><strong>Agenda bloqueada</strong><span>Este dia ou mês está bloqueado para atendimento.</span></div><div></div></div></div>`;
    }

    return `<div class="ag-slots-wrap">${slots.map(h=>{
      const slotFim=this.horaFim(h,this.intervaloAtual());
      const bloqueio=this.bloqueios().find(b=>this.isoFromBR(b.data)===f.data && (!b.profissionalId||b.profissionalId===profId) && b.horaInicio<=h && b.horaFim>h);

      if(bloqueio){
        return `<div class="ag-slot-print bloqueado">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>${Utils.esc(bloqueio.motivo||'Horário indisponível')}</span></div>
          <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalBloqueio('${bloqueio.id}')">Editar</button></div>
        </div>`;
      }

      const cruzado=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data &&
        a.profissionalId===profId &&
        (a.tipo||'consulta')!==tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );

      if(cruzado){
        const p=Store.get('PACIENTES').find(x=>x.id===cruzado.pacienteId)||{};
        return `<div class="ag-slot-print bloqueado-cruzado">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>Ocupado na ${cruzado.tipo==='procedimento'?'Agenda Procedimentos':'Agenda Médica'}${p.nome?' por '+Utils.esc(p.nome):''}</span></div>
          <div></div>
        </div>`;
      }

      const ag=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data &&
        a.profissionalId===profId &&
        (a.tipo||'consulta')===tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );

      if(ag){
        const p=Store.get('PACIENTES').find(x=>x.id===ag.pacienteId)||{};
        const naFila=(ag.status==='Aguardando'||!!ag.atendimentoId);
        return `<div class="ag-slot-print ocupado ${isProc?'procedimento':''}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info">
            <strong>${Utils.esc((this.nomeComIdadeV184 ? this.nomeComIdadeV184(ag,p) : '') || p.nome || ag.paciente || 'Paciente')}</strong>
            <span>Tel: ${Utils.esc(p.telefone||p.tel||'')} • ${Utils.esc(ag.tipoConsulta||'Consulta')} • ${Utils.esc(ag.modalidade||'Presencial')}</span>
            <div class="ag-slot-extra"><span class="ag-mini-tag">${Utils.esc(ag.status||'Agendado')}</span>${ag.convenio?`<span class="ag-mini-tag">${Utils.esc(ag.convenio)}</span>`:''}${ag.valorPrevisto?`<span class="ag-mini-tag">R$ ${Utils.money(ag.valorPrevisto)}</span>`:''}</div>
          </div>
          <div class="ag-slot-actions">
            ${naFila?`<button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.abrirFilaAgenda && AgendaMedica.abrirFilaAgenda('${ag.atendimentoId||''}')">Fila</button><button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.abrirAtenderAgenda && AgendaMedica.abrirAtenderAgenda('${ag.atendimentoId||''}','${ag.pacienteId||''}')">Atender</button>`:`<button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.enviarFila('${ag.id}')">Chegou</button>`}
            <button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.modalAgendamento('${ag.id}')">Editar</button>
            <button class="ag-round-btn ag-cancelar-btn" onclick="AgendaMedica.cancelar('${ag.id}')">Cancelar</button>
          </div>
        </div>`;
      }

      return `<div class="ag-slot-print">
        <div class="ag-slot-time">${h}</div>
        <div class="ag-slot-info"><strong>Vago</strong><span>Horário disponível</span></div>
        <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalAgendamento('', '${f.data}', '${h}')">${isProc?'Agendar procedimento':'Agendar'}</button></div>
      </div>`;
    }).join('')}</div>`;
  };
})();




/* =========================================================
   ZERO V14.7 — Configuração da Agenda estável definitiva
   Correção:
   - Configurar agenda NÃO usa mais o Modal geral.
   - Abre em overlay próprio, sem trocar #modal-root e sem renderizar a tela por baixo.
   - Bloquear/desbloquear mês não fecha e não pisca.
   - Bloquear/desbloquear período não fecha e não pisca.
   - Salvar horários não fecha e não pisca.
   - Salvar/restaurar cores não fecha e não pisca.
   - Cancelar fecha somente a configuração.
   - Salvar fecha a configuração e renderiza a agenda só uma vez.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__configAgendaEstavelV147) return;
  AgendaMedica.__configAgendaEstavelV147=true;

  AgendaMedica.configRootV147=function(){
    let root=document.getElementById('agenda-config-root-v147');
    if(!root){
      root=document.createElement('div');
      root.id='agenda-config-root-v147';
      document.body.appendChild(root);
    }
    return root;
  };

  AgendaMedica.configAbertaV147=function(){
    return !!document.querySelector('#agenda-config-root-v147 .ag-config-backdrop-v147');
  };

  AgendaMedica.modalConfigOriginal=function(){
    const cfg=this.cfg();
    if(!cfg.cores) cfg.cores=this.defaultColors();
    if(!cfg.horariosSemana) cfg.horariosSemana=this.defaultConfig().horariosSemana;

    const profs=this.profissionais();
    const mesAtual=(this.filtro().data||this.hojeISO()).slice(0,7);
    const root=this.configRootV147();

    document.body.classList.add('agenda-config-open-v147');
    document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');

    root.innerHTML=`<div class="ag-config-backdrop-v147" data-static-modal="true">
      <div class="ag-config-modal-v147" role="dialog" aria-modal="true">
        <div class="ag-config-title-v147">
          <span>⚙️ Configurações da agenda</span>
          <button type="button" class="modal-x" onclick="AgendaMedica.cancelarConfigAgenda()">×</button>
        </div>

        <div class="ag-config-body-v147">
          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
            <div class="ag-config-card-body">
              <div class="ag-config-grid">
                <div>
                  <label>Profissional</label>
                  <select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()">
                    <option value="todos">Todos os profissionais</option>
                    ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label>Mês</label>
                  <input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()">
                </div>
                <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
                <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
              </div>
              <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
            </div>
          </div>

          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
            <div class="ag-config-card-body">
              <div class="ag-config-grid">
                <div>
                  <label>Profissional</label>
                  <select id="cfg-bl-prof">
                    <option value="">Selecione</option>
                    ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}
                  </select>
                </div>
                <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
                <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
                <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
              </div>

              <div class="ag-config-grid three" style="margin-top:12px;">
                <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
                <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
                <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
              </div>
            </div>
          </div>

          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">⏰ Horários semanais</div>
            <div class="ag-config-card-body">
              <div id="cfg-horarios-semana" class="ag-week-hours"></div>
              <div class="row right" style="margin-top:12px;">
                <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarHorariosSemanaOriginal()">Salvar horários</button>
              </div>
            </div>
          </div>

          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">🎨 Cores da agenda</div>
            <div class="ag-config-card-body">
              <div class="ag-color-grid">
                ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`
                  <div class="ag-color-item">
                    <label>${l}</label>
                    <input type="color" id="cor-${k}" value="${cfg.cores?.[k]||this.defaultColors()[k]||'#2563eb'}">
                  </div>`).join('')}
              </div>
              <div class="row right" style="margin-top:14px;">
                <button type="button" class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button>
                <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button>
              </div>
            </div>
          </div>
        </div>

        <div class="ag-config-footer-v147">
          <button type="button" class="btn btn-ghost" onclick="AgendaMedica.cancelarConfigAgenda()">Cancelar</button>
          <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarConfigAgendaFechar()">Salvar</button>
        </div>
      </div>
    </div>`;

    this.renderHorariosSemanaOriginal();
    this.atualizarStatusMesConfig();

    requestAnimationFrame(()=>document.body.classList.add('agenda-config-ready-v147'));
    return false;
  };

  AgendaMedica.fecharConfigAgendaV147=function(renderizar=false){
    const root=document.getElementById('agenda-config-root-v147');
    if(root) root.innerHTML='';
    document.body.classList.remove('agenda-config-open-v147','agenda-config-ready-v147');

    if(renderizar){
      requestAnimationFrame(()=>{
        this.render();
        setTimeout(()=>{ try{ this.render(); }catch(e){} },20);
      });
    }
    return false;
  };

  AgendaMedica.cancelarConfigAgenda=function(){
    return this.fecharConfigAgendaV147(false);
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    this.salvarHorariosSemanaOriginal(false);
    this.salvarCoresOriginal(false);
    Utils.toast('Configurações salvas.');
    return this.fecharConfigAgendaV147(true);
  };

  AgendaMedica.atualizarStatusMesConfig=function(){
    const st=document.getElementById('cfg-bloq-status-mes');
    const mes=document.getElementById('cfg-bloq-mes')?.value;
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';

    if(!st || !mes) return;

    const cfg=this.cfg();
    const bloqueados=cfg.mesesBloqueados||[];
    const bloqueado=bloqueados.includes(`${prof}|${mes}`) || bloqueados.includes(`todos|${mes}`);

    st.innerHTML=bloqueado
      ? '<span class="ag-month-blocked">Mês bloqueado</span>'
      : '<span class="ag-month-open">Mês desbloqueado</span>';
  };

  AgendaMedica.bloquearMesOriginal=function(){
    const cfg=this.cfg();
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';
    const mes=document.getElementById('cfg-bloq-mes')?.value;

    if(!mes) return Utils.toast('Informe o mês.');

    cfg.mesesBloqueados=cfg.mesesBloqueados||[];
    const key=`${prof}|${mes}`;
    if(!cfg.mesesBloqueados.includes(key)) cfg.mesesBloqueados.push(key);

    this.saveCfg(cfg);
    this.atualizarStatusMesConfig();
    Utils.toast('Mês bloqueado.');
    return false;
  };

  AgendaMedica.desbloquearMesOriginal=function(){
    const cfg=this.cfg();
    const prof=document.getElementById('cfg-bloq-prof')?.value||'todos';
    const mes=document.getElementById('cfg-bloq-mes')?.value;

    if(!mes) return Utils.toast('Informe o mês.');

    cfg.mesesBloqueados=(cfg.mesesBloqueados||[]).filter(k=>k!==`${prof}|${mes}` && !(prof==='todos' && k===`todos|${mes}`));
    if(prof!=='todos') cfg.mesesBloqueados=cfg.mesesBloqueados.filter(k=>k!==`todos|${mes}`);

    this.saveCfg(cfg);
    this.atualizarStatusMesConfig();
    Utils.toast('Mês desbloqueado.');
    return false;
  };

  AgendaMedica.bloquearPeriodoOriginal=function(){
    const prof=document.getElementById('cfg-bl-prof')?.value;
    const data=document.getElementById('cfg-bl-data')?.value;

    if(!prof || !data) return Utils.toast('Informe profissional e data.');

    Store.upsert('AGENDA_BLOQUEIOS',{
      id:Utils.id('BL'),
      data:this.brFromInput(data),
      profissionalId:prof,
      horaInicio:document.getElementById('cfg-bl-inicio')?.value||'00:00',
      horaFim:document.getElementById('cfg-bl-fim')?.value||'23:59',
      motivo:document.getElementById('cfg-bl-motivo')?.value||'Bloqueado',
      criadoEm:new Date().toISOString()
    });

    Utils.toast('Bloqueio salvo.');
    return false;
  };

  AgendaMedica.desbloquearPeriodoOriginal=function(){
    const prof=document.getElementById('cfg-bl-prof')?.value;
    const data=this.brFromInput(document.getElementById('cfg-bl-data')?.value);

    if(!prof || !data) return Utils.toast('Informe profissional e data.');

    Store.set('AGENDA_BLOQUEIOS',this.bloqueios().filter(b=>!(b.profissionalId===prof && b.data===data)));
    Utils.toast('Bloqueio removido.');
    return false;
  };

  AgendaMedica.salvarHorariosSemanaOriginal=function(mostrarToast=true){
    const cfg=this.cfg();
    if(!cfg.horariosSemana) cfg.horariosSemana=this.defaultConfig().horariosSemana;

    ['0','1','2','3','4','5','6'].forEach(k=>{
      cfg.horariosSemana[k]={
        ativo:document.getElementById('sem-ativo-'+k)?.checked,
        inicio:document.getElementById('sem-inicio-'+k)?.value||'07:00',
        fim:document.getElementById('sem-fim-'+k)?.value||'18:00'
      };
    });

    this.saveCfg(cfg);
    if(mostrarToast) Utils.toast('Horários salvos.');
    return false;
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.cfg();
    if(!cfg.cores) cfg.cores=this.defaultColors();

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });

    this.saveCfg(cfg);
    if(mostrarToast) Utils.toast('Cores salvas.');
    return false;
  };

  AgendaMedica.restaurarCoresOriginal=function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);

    Object.entries(cfg.cores).forEach(([k,v])=>{
      const el=document.getElementById('cor-'+k);
      if(el) el.value=v;
    });

    Utils.toast('Cores restauradas.');
    return false;
  };

  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape' && AgendaMedica.configAbertaV147 && AgendaMedica.configAbertaV147()){
      ev.preventDefault();
      ev.stopPropagation();
      AgendaMedica.cancelarConfigAgenda();
    }
  },true);
})();




/* =========================================================
   ZERO V15.1 — Configuração da agenda sem Horários semanais + cores funcionando
   Correções:
   - Remove Horários semanais do modal Configurar agenda.
   - Salvar cores grava de verdade na configuração.
   - Salvar cores não fecha e não pisca.
   - Salvar final grava cores e fecha estável.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__configSemHorariosCoresV151) return;
  AgendaMedica.__configSemHorariosCoresV151=true;

  AgendaMedica.configRootV151=function(){
    let root=document.getElementById('agenda-config-root-v147') || document.getElementById('agenda-config-root-v151');
    if(!root){
      root=document.createElement('div');
      root.id='agenda-config-root-v151';
      document.body.appendChild(root);
    }
    return root;
  };

  AgendaMedica.modalConfigOriginal=function(){
    const cfg=this.cfg();
    if(!cfg.cores) cfg.cores=this.defaultColors();

    const profs=this.profissionais();
    const mesAtual=(this.filtro().data||this.hojeISO()).slice(0,7);
    const root=this.configRootV151();

    document.body.classList.add('agenda-config-open-v147','agenda-config-open-v151');
    document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');

    root.innerHTML=`<div class="ag-config-backdrop-v147" data-static-modal="true">
      <div class="ag-config-modal-v147" role="dialog" aria-modal="true">
        <div class="ag-config-title-v147">
          <span>⚙️ Configurações da agenda</span>
          <button type="button" class="modal-x" onclick="AgendaMedica.cancelarConfigAgenda()">×</button>
        </div>

        <div class="ag-config-body-v147">
          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
            <div class="ag-config-card-body">
              <div class="ag-config-grid">
                <div>
                  <label>Profissional</label>
                  <select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()">
                    <option value="todos">Todos os profissionais</option>
                    ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label>Mês</label>
                  <input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()">
                </div>
                <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
                <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
              </div>
              <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
            </div>
          </div>

          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
            <div class="ag-config-card-body">
              <div class="ag-config-grid">
                <div>
                  <label>Profissional</label>
                  <select id="cfg-bl-prof">
                    <option value="">Selecione</option>
                    ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)}</option>`).join('')}
                  </select>
                </div>
                <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
                <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
                <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
              </div>

              <div class="ag-config-grid three" style="margin-top:12px;">
                <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
                <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
                <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
              </div>
            </div>
          </div>

          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">🎨 Cores da agenda</div>
            <div class="ag-config-card-body">
              <div class="ag-color-grid">
                ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`
                  <div class="ag-color-item">
                    <label>${l}</label>
                    <input type="color" id="cor-${k}" value="${cfg.cores?.[k]||this.defaultColors()[k]||'#2563eb'}">
                  </div>`).join('')}
              </div>
              <div class="row right" style="margin-top:14px;">
                <button type="button" class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button>
                <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button>
              </div>
            </div>
          </div>
        </div>

        <div class="ag-config-footer-v147">
          <button type="button" class="btn btn-ghost" onclick="AgendaMedica.cancelarConfigAgenda()">Cancelar</button>
          <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarConfigAgendaFechar()">Salvar</button>
        </div>
      </div>
    </div>`;

    this.atualizarStatusMesConfig();
    requestAnimationFrame(()=>document.body.classList.add('agenda-config-ready-v147','agenda-config-ready-v151'));
    return false;
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.cfg();
    cfg.cores=cfg.cores||this.defaultColors();

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });

    this.saveCfg(cfg);

    // reforço direto no Store para impedir perda por wrappers antigos
    try{
      const atual=Store.get('AGENDA_CONFIG')||{};
      atual.cores=cfg.cores;
      Store.set('AGENDA_CONFIG',atual);
    }catch(e){}

    if(mostrarToast) Utils.toast('Cores salvas.');
    return false;
  };

  AgendaMedica.restaurarCoresOriginal=function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);
    try{
      const atual=Store.get('AGENDA_CONFIG')||{};
      atual.cores=cfg.cores;
      Store.set('AGENDA_CONFIG',atual);
    }catch(e){}

    Object.entries(cfg.cores).forEach(([k,v])=>{
      const el=document.getElementById('cor-'+k);
      if(el) el.value=v;
    });

    Utils.toast('Cores restauradas.');
    return false;
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    this.salvarCoresOriginal(false);
    Utils.toast('Configurações salvas.');
    return this.fecharConfigAgendaV147 ? this.fecharConfigAgendaV147(true) : (document.getElementById('agenda-config-root-v147')||document.getElementById('agenda-config-root-v151'))?.replaceChildren();
  };
})();




/* =========================================================
   ZERO V15.2 — Botão Configuração abre sempre
   Correção:
   - Intercepta o clique no botão Configuração antes de qualquer onclick antigo.
   - Usa função segura independente.
   - Mantém sem Horários semanais.
   - Salvar cores grava e permanece aberto.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__configBotaoAbreV152) return;
  AgendaMedica.__configBotaoAbreV152=true;

  AgendaMedica.configRootV152=function(){
    let root=document.getElementById('agenda-config-root-v152');
    if(!root){
      root=document.createElement('div');
      root.id='agenda-config-root-v152';
      document.body.appendChild(root);
    }
    return root;
  };

  AgendaMedica.safeCfgV152=function(){
    let cfg={};
    try{ cfg=this.cfg ? (this.cfg()||{}) : (Store.get('AGENDA_CONFIG')||{}); }catch(e){ cfg=Store.get('AGENDA_CONFIG')||{}; }
    if(!cfg.cores) cfg.cores=this.defaultColors ? this.defaultColors() : {
      vago:'#ffffff',consulta:'#2563eb',procedimento:'#059669',bloqueio:'#64748b',
      aguardando:'#f59e0b',confirmado:'#0ea5e9',atendido:'#22c55e',cancelado:'#ef4444'
    };
    return cfg;
  };

  AgendaMedica.safeProfsV152=function(){
    try{ return this.profissionais ? (this.profissionais()||[]) : Store.get('PROFISSIONAIS'); }
    catch(e){ return Store.get('PROFISSIONAIS')||[]; }
  };

  AgendaMedica.safeMesAtualV152=function(){
    try{
      const f=this.filtro ? this.filtro() : {};
      return String(f.data||this.hojeISO?.()||new Date().toISOString().slice(0,10)).slice(0,7);
    }catch(e){
      return new Date().toISOString().slice(0,7);
    }
  };

  AgendaMedica.abrirConfiguracaoV152=function(){
    const cfg=this.safeCfgV152();
    const profs=this.safeProfsV152();
    const mesAtual=this.safeMesAtualV152();
    const root=this.configRootV152();

    document.body.classList.add('agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152');
    document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');

    root.innerHTML=`<div class="ag-config-backdrop-v147 ag-config-backdrop-v152" data-static-modal="true">
      <div class="ag-config-modal-v147 ag-config-modal-v152" role="dialog" aria-modal="true">
        <div class="ag-config-title-v147">
          <span>⚙️ Configurações da agenda</span>
          <button type="button" class="modal-x" onclick="AgendaMedica.fecharConfiguracaoV152(false)">×</button>
        </div>

        <div class="ag-config-body-v147">
          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
            <div class="ag-config-card-body">
              <div class="ag-config-grid">
                <div>
                  <label>Profissional</label>
                  <select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()">
                    <option value="todos">Todos os profissionais</option>
                    ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label>Mês</label>
                  <input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()">
                </div>
                <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
                <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
              </div>
              <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
            </div>
          </div>

          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
            <div class="ag-config-card-body">
              <div class="ag-config-grid">
                <div>
                  <label>Profissional</label>
                  <select id="cfg-bl-prof">
                    <option value="">Selecione</option>
                    ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
                  </select>
                </div>
                <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
                <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
                <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
              </div>

              <div class="ag-config-grid three" style="margin-top:12px;">
                <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
                <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
                <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
              </div>
            </div>
          </div>

          <div class="ag-config-modal-card">
            <div class="ag-config-card-title">🎨 Cores da agenda</div>
            <div class="ag-config-card-body">
              <div class="ag-color-grid">
                ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`
                  <div class="ag-color-item">
                    <label>${l}</label>
                    <input type="color" id="cor-${k}" value="${cfg.cores?.[k]||'#2563eb'}">
                  </div>`).join('')}
              </div>
              <div class="row right" style="margin-top:14px;">
                <button type="button" class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button>
                <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button>
              </div>
            </div>
          </div>
        </div>

        <div class="ag-config-footer-v147">
          <button type="button" class="btn btn-ghost" onclick="AgendaMedica.fecharConfiguracaoV152(false)">Cancelar</button>
          <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarConfigAgendaFechar()">Salvar</button>
        </div>
      </div>
    </div>`;

    try{ this.atualizarStatusMesConfig(); }catch(e){}
    return false;
  };

  AgendaMedica.fecharConfiguracaoV152=function(renderizar=false){
    const root=document.getElementById('agenda-config-root-v152');
    if(root) root.innerHTML='';
    document.body.classList.remove('agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152','agenda-config-ready-v147','agenda-config-ready-v151');
    if(renderizar){
      requestAnimationFrame(()=>{ try{ this.render(); }catch(e){} });
    }
    return false;
  };

  AgendaMedica.modalConfigOriginal=function(){
    return this.abrirConfiguracaoV152();
  };
  AgendaMedica.modalConfig=function(){ return this.abrirConfiguracaoV152(); };
  AgendaMedica.abrirConfig=function(){ return this.abrirConfiguracaoV152(); };
  AgendaMedica.abrirConfiguracao=function(){ return this.abrirConfiguracaoV152(); };

  AgendaMedica.cancelarConfigAgenda=function(){
    return this.fecharConfiguracaoV152(false);
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.safeCfgV152();
    cfg.cores=cfg.cores||{};

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });

    try{ this.saveCfg ? this.saveCfg(cfg) : Store.set('AGENDA_CONFIG',cfg); }catch(e){}
    try{
      const atual=Store.get('AGENDA_CONFIG')||{};
      atual.cores=cfg.cores;
      Store.set('AGENDA_CONFIG',atual);
    }catch(e){}

    if(mostrarToast) Utils.toast('Cores salvas.');
    return false;
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    this.salvarCoresOriginal(false);
    Utils.toast('Configurações salvas.');
    return this.fecharConfiguracaoV152(true);
  };

  // Captura o clique antes do onclick antigo, para o botão nunca ficar morto.
  document.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('button');
    if(!btn) return;
    const txt=String(btn.textContent||'').toLowerCase();
    const onclick=String(btn.getAttribute('onclick')||'').toLowerCase();
    if(txt.includes('configuração') || txt.includes('configuracao') || onclick.includes('modalconfig')){
      if(btn.closest('#agenda-config-root-v152')) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      AgendaMedica.abrirConfiguracaoV152();
      return false;
    }
  },true);
})();




/* =========================================================
   ZERO V15.3 — Impressão da Agenda puxa os dados dos agendamentos
   Correção:
   - Imprimir Agenda Médica não sai mais tudo como Vago.
   - Imprimir Agenda Procedimentos não sai mais tudo como Vago.
   - Puxa paciente, telefone, procedimento/consulta, convênio e status.
   - Usa o mesmo profissional, data e tipo da tela aberta.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__impressaoAgendaDadosV153) return;
  AgendaMedica.__impressaoAgendaDadosV153=true;

  AgendaMedica.pacienteAgendaPrintV153=function(ag){
    const pid=ag?.pacienteId || ag?.pacId || ag?.idPaciente || '';
    return Store.get('PACIENTES').find(p=>String(p.id)===String(pid)) || {};
  };

  AgendaMedica.telefonePacientePrintV153=function(ag,p){
    return p.telefone || p.tel || p.celular || p.whatsapp || ag.telefone || ag.tel || ag.celular || '';
  };

  AgendaMedica.nomePacientePrintV153=function(ag,p){
    return p.nome || p.nomeCompleto || ag.paciente || ag.pacienteNome || ag.nomePaciente || '';
  };

  AgendaMedica.profissionalPrintV153=function(){
    const f=this.filtro ? this.filtro() : {};
    const id=f.prof || this.profAtualId?.() || document.getElementById('ag-prof')?.value || '';
    return Store.get('PROFISSIONAIS').find(p=>String(p.id)===String(id)) || {};
  };

  AgendaMedica.agendamentoNoHorarioPrintV153=function(h){
    const f=this.filtro();
    const profId=f.prof || this.profAtualId?.() || document.getElementById('ag-prof')?.value || '';
    const tipo=f.tipo || this.tipoAtual();
    const slotFim=this.horaFim(h,this.intervaloAtual ? this.intervaloAtual() : 30);

    return this.agendamentos().find(a=>{
      const dataOk=this.isoFromBR(a.data)===f.data;
      const profOk=String(a.profissionalId||a.profId||'')===String(profId);
      const tipoOk=String(a.tipo||'consulta')===String(tipo);
      const status=String(a.status||'');
      const ativo=!['Cancelado','Faltou'].includes(status);
      const inicio=a.hora || a.horaInicio || '';
      const fim=this.horaFim(inicio,a.duracao || (tipo==='procedimento'?15:30));
      return dataOk && profOk && tipoOk && ativo && this.intervalosSobrepoem(inicio,fim,h,slotFim);
    }) || null;
  };

  AgendaMedica.escapePrintV153=function(v){
    return (window.Utils && Utils.esc) ? Utils.esc(v||'') : String(v||'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  };

  AgendaMedica.imprimirAgenda=function(){
    const f=this.filtro();
    const prof=this.profissionalPrintV153();
    const tipo=f.tipo || this.tipoAtual();
    const isProc=tipo==='procedimento';
    const slots=this.slotsDia(f.data);

    const rows=slots.map(h=>{
      const ag=this.agendamentoNoHorarioPrintV153(h);

      if(!ag){
        return `<tr class="vaga">
          <td>${this.escapePrintV153(h)}</td>
          <td></td>
          <td></td>
          <td></td>
          <td>Vago</td>
        </tr>`;
      }

      const p=this.pacienteAgendaPrintV153(ag);
      const nome=this.nomePacientePrintV153(ag,p);
      const telefone=this.telefonePacientePrintV153(ag,p);
      const desc=isProc
        ? (ag.procedimento || ag.tipoConsulta || ag.motivo || ag.obs || 'Procedimento')
        : (ag.tipoConsulta || ag.procedimento || ag.motivo || ag.obs || 'Consulta');
      const status=ag.status || 'Agendado';
      const convenio=ag.convenio || p.convenio || p.plano || '';

      return `<tr class="ocupado">
        <td>${this.escapePrintV153(ag.hora||h)}</td>
        <td><strong>${this.escapePrintV153(nome)}</strong>${convenio?`<br><small>${this.escapePrintV153(convenio)}</small>`:''}</td>
        <td>${this.escapePrintV153(telefone)}</td>
        <td>${this.escapePrintV153(desc)}</td>
        <td>${this.escapePrintV153(status)}</td>
      </tr>`;
    }).join('');

    const dataBR=this.brFromInput ? this.brFromInput(f.data) : f.data;
    const titulo=isProc?'AGENDA DE PROCEDIMENTOS':'AGENDA MÉDICA';

    const html=`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${this.escapePrintV153(titulo)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;padding:22px;color:#0f172a}
  h1{font-size:22px;margin:0 0 8px;text-align:center}
  .meta{display:flex;justify-content:space-between;gap:12px;margin:12px 0 18px;font-size:13px}
  .meta div{border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;flex:1;background:#f8fafc}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #dbe3ef;padding:8px;text-align:left;vertical-align:top}
  th{background:#eef2ff;color:#0f172a}
  tr.ocupado td{background:#fff}
  tr.vaga td{color:#64748b;background:#f8fafc}
  small{color:#475569}
  @media print{body{padding:10mm}.no-print{display:none}}
</style>
</head>
<body>
  <h1>${this.escapePrintV153(titulo)}</h1>
  <div class="meta">
    <div><strong>Profissional:</strong><br>${this.escapePrintV153(prof.nome||'')}</div>
    <div><strong>Data:</strong><br>${this.escapePrintV153(dataBR)}</div>
    <div><strong>Tipo:</strong><br>${isProc?'Procedimentos':'Consultas médicas'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:85px">Horário</th>
        <th>Paciente</th>
        <th style="width:140px">Telefone</th>
        <th>${isProc?'Procedimento':'Consulta / Motivo'}</th>
        <th style="width:115px">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    setTimeout(()=>{
      try{
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }catch(e){}
      setTimeout(()=>iframe.remove(),1500);
    },300);

    return true;
  };
})();




/* =========================================================
   ZERO V15.4 — Configuração da Agenda no modal original + impressão com bloqueios
   Correções:
   - Configurar agenda volta para o modal original do sistema.
   - Remove o overlay próprio que quebrou a configuração.
   - Sem Horários semanais na configuração da agenda.
   - Salvar cores funciona no modal original.
   - Impressão mostra horários bloqueados com motivo.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__configOriginalPrintBloqueiosV154) return;
  AgendaMedica.__configOriginalPrintBloqueiosV154=true;

  AgendaMedica.limparConfigRootV154=function(){
    ['agenda-config-root-v147','agenda-config-root-v151','agenda-config-root-v152'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='';
    });
    document.body.classList.remove(
      'agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152',
      'agenda-config-ready-v147','agenda-config-ready-v151'
    );
  };

  AgendaMedica.modalConfigOriginal=function(){
    this.limparConfigRootV154();

    const cfg=this.cfg();
    if(!cfg.cores) cfg.cores=this.defaultColors();

    const profs=this.profissionais();
    const mesAtual=(this.filtro().data||this.hojeISO()).slice(0,7);

    Modal.open('⚙️ Configurações da agenda',`
      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()">
                <option value="todos">Todos os profissionais</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Mês</label>
              <input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()">
            </div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
          </div>
          <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
        </div>
      </div>

      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bl-prof">
                <option value="">Selecione</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
              </select>
            </div>
            <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
            <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
            <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
          </div>

          <div class="ag-config-grid three" style="margin-top:12px;">
            <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
          </div>
        </div>
      </div>

      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🎨 Cores da agenda</div>
        <div class="ag-config-card-body">
          <div class="ag-color-grid">
            ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`
              <div class="ag-color-item">
                <label>${l}</label>
                <input type="color" id="cor-${k}" value="${cfg.cores?.[k]||this.defaultColors()[k]||'#2563eb'}">
              </div>`).join('')}
          </div>
          <div class="row right" style="margin-top:14px;">
            <button type="button" class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button>
            <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button>
          </div>
        </div>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="AgendaMedica.cancelarConfigAgenda()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarConfigAgendaFechar()">Salvar</button>
    `,'lg');

    setTimeout(()=>this.atualizarStatusMesConfig(),30);
    return false;
  };

  AgendaMedica.modalConfig=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfig=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfiguracao=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfiguracaoV152=function(){ return this.modalConfigOriginal(); };

  AgendaMedica.cancelarConfigAgenda=function(){
    Modal.close();
    return false;
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    this.salvarCoresOriginal(false);
    Modal.close();
    setTimeout(()=>{ try{ this.render(); }catch(e){} },20);
    Utils.toast('Configurações salvas.');
    return false;
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.cfg();
    cfg.cores=cfg.cores||this.defaultColors();

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el) cfg.cores[k]=el.value;
    });

    this.saveCfg(cfg);
    try{
      const atual=Store.get('AGENDA_CONFIG')||{};
      atual.cores=cfg.cores;
      Store.set('AGENDA_CONFIG',atual);
    }catch(e){}

    if(mostrarToast) Utils.toast('Cores salvas.');
    return false;
  };

  AgendaMedica.restaurarCoresOriginal=function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);
    try{
      const atual=Store.get('AGENDA_CONFIG')||{};
      atual.cores=cfg.cores;
      Store.set('AGENDA_CONFIG',atual);
    }catch(e){}

    Object.entries(cfg.cores).forEach(([k,v])=>{
      const el=document.getElementById('cor-'+k);
      if(el) el.value=v;
    });

    Utils.toast('Cores restauradas.');
    return false;
  };

  AgendaMedica.bloqueioNoHorarioPrintV154=function(h){
    const f=this.filtro();
    const profId=f.prof || this.profAtualId?.() || document.getElementById('ag-prof')?.value || '';
    const slotFim=this.horaFim(h,this.intervaloAtual ? this.intervaloAtual() : 30);

    return this.bloqueios().find(b=>{
      const dataOk=this.isoFromBR(b.data)===f.data;
      const profOk=!b.profissionalId || String(b.profissionalId)===String(profId);
      const inicio=b.horaInicio || '00:00';
      const fim=b.horaFim || '23:59';
      return dataOk && profOk && this.intervalosSobrepoem(inicio,fim,h,slotFim);
    }) || null;
  };

  AgendaMedica.imprimirAgenda=function(){
    const f=this.filtro();
    const prof=this.profissionalPrintV153 ? this.profissionalPrintV153() : (Store.get('PROFISSIONAIS').find(p=>String(p.id)===String(f.prof))||{});
    const tipo=f.tipo || this.tipoAtual();
    const isProc=tipo==='procedimento';
    const slots=this.slotsDia(f.data);

    const rows=slots.map(h=>{
      const bloqueio=this.bloqueioNoHorarioPrintV154(h);
      if(bloqueio){
        return `<tr class="bloqueado">
          <td>${Utils.esc(h)}</td>
          <td colspan="3"><strong>Bloqueado</strong><br>${Utils.esc(bloqueio.motivo||'Horário indisponível')}</td>
          <td>Bloqueado</td>
        </tr>`;
      }

      const ag=this.agendamentoNoHorarioPrintV153 ? this.agendamentoNoHorarioPrintV153(h) : null;
      if(!ag){
        return `<tr class="vaga">
          <td>${Utils.esc(h)}</td>
          <td></td>
          <td></td>
          <td></td>
          <td>Vago</td>
        </tr>`;
      }

      const p=this.pacienteAgendaPrintV153 ? this.pacienteAgendaPrintV153(ag) : (Store.get('PACIENTES').find(p=>String(p.id)===String(ag.pacienteId))||{});
      const nome=this.nomePacientePrintV153 ? this.nomePacientePrintV153(ag,p) : (p.nome||ag.paciente||'');
      const telefone=this.telefonePacientePrintV153 ? this.telefonePacientePrintV153(ag,p) : (p.telefone||p.tel||ag.telefone||'');
      const desc=isProc
        ? (ag.procedimento || ag.tipoConsulta || ag.motivo || ag.obs || 'Procedimento')
        : (ag.tipoConsulta || ag.procedimento || ag.motivo || ag.obs || 'Consulta');
      const status=ag.status || 'Agendado';
      const convenio=ag.convenio || p.convenio || p.plano || '';

      return `<tr class="ocupado">
        <td>${Utils.esc(ag.hora||h)}</td>
        <td><strong>${Utils.esc(nome)}</strong>${convenio?`<br><small>${Utils.esc(convenio)}</small>`:''}</td>
        <td>${Utils.esc(telefone)}</td>
        <td>${Utils.esc(desc)}</td>
        <td>${Utils.esc(status)}</td>
      </tr>`;
    }).join('');

    const dataBR=this.brFromInput ? this.brFromInput(f.data) : f.data;
    const titulo=isProc?'AGENDA DE PROCEDIMENTOS':'AGENDA MÉDICA';

    const html=`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${Utils.esc(titulo)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;padding:22px;color:#0f172a}
  h1{font-size:22px;margin:0 0 8px;text-align:center}
  .meta{display:flex;justify-content:space-between;gap:12px;margin:12px 0 18px;font-size:13px}
  .meta div{border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;flex:1;background:#f8fafc}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #dbe3ef;padding:8px;text-align:left;vertical-align:top}
  th{background:#eef2ff;color:#0f172a}
  tr.ocupado td{background:#fff}
  tr.vaga td{color:#64748b;background:#f8fafc}
  tr.bloqueado td{background:#fee2e2;color:#7f1d1d}
  small{color:#475569}
  @media print{body{padding:10mm}.no-print{display:none}}
</style>
</head>
<body>
  <h1>${Utils.esc(titulo)}</h1>
  <div class="meta">
    <div><strong>Profissional:</strong><br>${Utils.esc(prof.nome||'')}</div>
    <div><strong>Data:</strong><br>${Utils.esc(dataBR)}</div>
    <div><strong>Tipo:</strong><br>${isProc?'Procedimentos':'Consultas médicas'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:85px">Horário</th>
        <th>Paciente / Bloqueio</th>
        <th style="width:140px">Telefone</th>
        <th>${isProc?'Procedimento':'Consulta / Motivo'}</th>
        <th style="width:115px">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    setTimeout(()=>{
      try{
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }catch(e){}
      setTimeout(()=>iframe.remove(),1500);
    },300);

    return true;
  };
})();




/* =========================================================
   ZERO V15.5 — Salvar cores da agenda aplica na tela de verdade
   Correção:
   - Botão Salvar cores fecha o modal original.
   - Grava em AGENDA_CONFIG corretamente.
   - Renderiza a agenda depois de salvar.
   - Aplica as cores nos cards e na legenda.
   - Não mexe nos horários semanais nem no fluxo do modal original.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__salvarCoresAplicaV155) return;
  AgendaMedica.__salvarCoresAplicaV155=true;

  AgendaMedica.hexToRgbV155=function(hex){
    hex=String(hex||'').replace('#','').trim();
    if(hex.length===3) hex=hex.split('').map(x=>x+x).join('');
    return {
      r:parseInt(hex.slice(0,2),16)||0,
      g:parseInt(hex.slice(2,4),16)||0,
      b:parseInt(hex.slice(4,6),16)||0
    };
  };

  AgendaMedica.corSuaveV155=function(hex,alpha=.14){
    const c=this.hexToRgbV155(hex);
    return `rgba(${c.r},${c.g},${c.b},${alpha})`;
  };

  AgendaMedica.corCardV155=function(chave){
    const cfg=this.cfg();
    const cores=Object.assign(this.defaultColors(),cfg.cores||{});
    const cor=cores[chave]||this.defaultColors()[chave]||'#2563eb';
    return `--ag-card-bg:${this.corSuaveV155(cor,.14)};--ag-card-border:${cor};`;
  };

  AgendaMedica.chaveStatusCorV155=function(ag){
    const st=String(ag?.status||'').toLowerCase();
    if(st.includes('aguard')) return 'aguardando';
    if(st.includes('confirm')) return 'confirmado';
    if(st.includes('atend')) return 'atendido';
    if(st.includes('cancel') || st.includes('falt')) return 'cancelado';
    if(String(ag?.tipo||'').toLowerCase()==='procedimento') return 'procedimento';
    return 'consulta';
  };

  AgendaMedica.renderLegendaAgendaV155=function(){
    const cfg=this.cfg();
    const cores=Object.assign(this.defaultColors(),cfg.cores||{});
    return `<div class="ag-legend">
      <span><i style="background:${cores.consulta}"></i> Consulta</span>
      <span><i style="background:${cores.procedimento}"></i> Procedimento</span>
      <span><i style="background:${cores.bloqueio}"></i> Bloqueio</span>
      <span><i style="background:${cores.aguardando}"></i> Aguardando</span>
      <span><i style="background:${cores.confirmado}"></i> Confirmado</span>
      <span><i style="background:${cores.atendido}"></i> Atendido</span>
      <span><i style="background:${cores.cancelado}"></i> Cancelado/Faltou</span>
    </div>`;
  };

  AgendaMedica.render=function(){
    this.init();
    const oldData=document.getElementById('ag-data')?.value;
    const oldProf=document.getElementById('ag-prof')?.value;
    const data=oldData||this.hojeISO();
    const prof=oldProf||this.profissionais()[0]?.id||'';
    const isProc=this.isProcedimentosRoute();

    document.getElementById('content').innerHTML=`<div class="ag-print-layout">
      <input id="ag-data" type="date" value="${data}" style="display:none">
      ${this.renderCalendario()}
      <div class="ag-print-main">
        <div class="ag-print-main-head">
          <div class="ag-print-title-row">
            <div>
              <h2>${isProc?'🩺':'⌂'} ${this.tituloAgendaAtual()} — ${this.brFromInput(data)}
                <span class="ag-route-badge ${isProc?'procedimento':'consulta'}">${isProc?'Procedimentos':'Consultas médicas'}</span>
              </h2>
              <div style="color:#64748b;margin-top:4px;">${isProc?'Agenda separada para procedimentos.':'Agenda separada para consultas médicas.'}</div>
            </div>
          </div>
          <div class="ag-print-controls">
            <select id="ag-prof" onchange="AgendaMedica.render()">
              ${this.profissionais().map(p=>`<option value="${p.id}" ${prof===p.id?'selected':''}>${Utils.esc(p.nome)}${p.especialidade?' — '+Utils.esc(p.especialidade):''}</option>`).join('')}
            </select>
            <button class="btn btn-ghost" onclick="AgendaMedica.modalConfigOriginal()">⚙️ Configuração</button>
            <button class="btn btn-outline" onclick="AgendaMedica.imprimirAgenda()">🖨️ Imprimir</button>
          </div>
          ${this.renderLegendaAgendaV155()}
        </div>
        ${this.renderSlots()}
      </div>
    </div>`;
  };

  AgendaMedica.renderSlots=function(){
    const f=this.filtro();
    const profId=f.prof;
    const tipo=f.tipo;
    const slots=this.slotsDia(f.data);
    const isProc=this.isProcedimentosRoute();

    if(!slots.length){
      return `<div class="ag-slots-wrap"><div class="ag-slot-print bloqueado ag-color-card-v155" style="${this.corCardV155('bloqueio')}"><div class="ag-slot-time">—</div><div class="ag-slot-info"><strong>Agenda bloqueada</strong><span>Este dia ou mês está bloqueado para atendimento.</span></div><div></div></div></div>`;
    }

    return `<div class="ag-slots-wrap">${slots.map(h=>{
      const slotFim=this.horaFim(h,this.intervaloAtual());
      const bloqueio=this.bloqueios().find(b=>this.isoFromBR(b.data)===f.data && (!b.profissionalId||b.profissionalId===profId) && b.horaInicio<=h && b.horaFim>h);

      if(bloqueio){
        return `<div class="ag-slot-print bloqueado ag-color-card-v155" style="${this.corCardV155('bloqueio')}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>${Utils.esc(bloqueio.motivo||'Horário indisponível')}</span></div>
          <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalBloqueio('${bloqueio.id}')">Editar</button></div>
        </div>`;
      }

      const cruzado=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data &&
        a.profissionalId===profId &&
        (a.tipo||'consulta')!==tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );

      if(cruzado){
        const p=Store.get('PACIENTES').find(x=>x.id===cruzado.pacienteId)||{};
        return `<div class="ag-slot-print bloqueado-cruzado ag-color-card-v155" style="${this.corCardV155('bloqueio')}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info"><strong>Bloqueado</strong><span>Ocupado na ${cruzado.tipo==='procedimento'?'Agenda Procedimentos':'Agenda Médica'}${p.nome?' por '+Utils.esc(p.nome):''}</span></div>
          <div></div>
        </div>`;
      }

      const ag=this.agendamentos().find(a=>
        this.isoFromBR(a.data)===f.data &&
        a.profissionalId===profId &&
        (a.tipo||'consulta')===tipo &&
        !['Cancelado','Faltou'].includes(a.status||'') &&
        this.intervalosSobrepoem(a.hora,this.horaFim(a.hora,a.duracao||((a.tipo==='procedimento')?15:30)),h,slotFim)
      );

      if(ag){
        const p=Store.get('PACIENTES').find(x=>x.id===ag.pacienteId)||{};
        const naFila=(ag.status==='Aguardando'||!!ag.atendimentoId);
        const chave=this.chaveStatusCorV155(ag);
        return `<div class="ag-slot-print ocupado ${isProc?'procedimento':''} status-${Utils.norm(ag.status||'agendado')} ag-color-card-v155" style="${this.corCardV155(chave)}">
          <div class="ag-slot-time">${h}</div>
          <div class="ag-slot-info">
            <strong>${Utils.esc((this.nomeComIdadeV184 ? this.nomeComIdadeV184(ag,p) : '') || p.nome || ag.paciente || 'Paciente')}</strong>
            <span>Tel: ${Utils.esc(p.telefone||p.tel||'')} • ${Utils.esc(ag.tipoConsulta||((ag.tipo==='procedimento')?'Procedimento':'Consulta'))} • ${Utils.esc(ag.modalidade||'Presencial')}</span>
            <div class="ag-slot-extra"><span class="ag-mini-tag">${Utils.esc(ag.status||'Agendado')}</span>${ag.convenio?`<span class="ag-mini-tag">${Utils.esc(ag.convenio)}</span>`:''}${ag.valorPrevisto?`<span class="ag-mini-tag">R$ ${Utils.money(ag.valorPrevisto)}</span>`:''}</div>
          </div>
          <div class="ag-slot-actions">
            ${typeof this.statusAgendaActionsV101==='function' ? this.statusAgendaActionsV101(ag) : (naFila?`<button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.abrirFilaAgenda && AgendaMedica.abrirFilaAgenda('${ag.atendimentoId||''}')">Fila</button><button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.abrirAtenderAgenda && AgendaMedica.abrirAtenderAgenda('${ag.atendimentoId||''}','${ag.pacienteId||''}')">Atender</button>`:`<button class="ag-round-btn ag-chegou-btn" onclick="AgendaMedica.enviarFila('${ag.id}')">Chegou</button><button class="ag-round-btn ag-editar-btn" onclick="AgendaMedica.modalAgendamento('${ag.id}')">Editar</button><button class="ag-round-btn ag-cancelar-btn" onclick="AgendaMedica.cancelar('${ag.id}')">Cancelar</button>`)}
          </div>
        </div>`;
      }

      return `<div class="ag-slot-print ag-color-card-v155" style="${this.corCardV155('vago')}">
        <div class="ag-slot-time">${h}</div>
        <div class="ag-slot-info"><strong>Vago</strong><span>Horário disponível</span></div>
        <div class="ag-slot-actions"><button class="ag-round-btn" onclick="AgendaMedica.modalAgendamento('', '${f.data}', '${h}')">${isProc?'Agendar procedimento':'Agendar'}</button></div>
      </div>`;
    }).join('')}</div>`;
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.cfg();
    cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el && el.value) cfg.cores[k]=el.value;
    });

    this.saveCfg(cfg);

    // confirmação real no storage correto
    const salvo=this.cfg();
    salvo.cores=Object.assign(this.defaultColors(),salvo.cores||{},cfg.cores);
    this.saveCfg(salvo);

    Modal.close();
    setTimeout(()=>{ try{ this.render(); }catch(e){ console.error(e); } },30);

    Utils.toast('Cores salvas e aplicadas.');
    return false;
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    const temCores=document.getElementById('cor-consulta');
    if(temCores) this.salvarCoresOriginal(false);
    else Modal.close();
    setTimeout(()=>{ try{ this.render(); }catch(e){} },30);
    Utils.toast('Configurações salvas.');
    return false;
  };
})();




/* =========================================================
   ZERO V15.6 — Configuração original real + impressão mostra bloqueios
   Correções:
   - Configuração da agenda volta para Modal.open original.
   - Não abre mais overlay/custom root.
   - Sem Horários semanais na configuração.
   - Salvar cores salva, fecha o modal e aplica na agenda.
   - Impressão mostra bloqueio de horário/período/dia/mês com motivo.
   - Mantém paciente/telefone/status na impressão.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__configOriginalPrintBloqueiosRealV156) return;
  AgendaMedica.__configOriginalPrintBloqueiosRealV156=true;

  AgendaMedica.limparOverlaysConfigV156=function(){
    ['agenda-config-root-v147','agenda-config-root-v151','agenda-config-root-v152'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='';
    });
    document.body.classList.remove(
      'agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152',
      'agenda-config-ready-v147','agenda-config-ready-v151'
    );
  };

  AgendaMedica.modalConfigOriginal=function(){
    this.limparOverlaysConfigV156();

    const cfg=this.cfg();
    cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});

    const profs=this.profissionais();
    const mesAtual=(this.filtro().data||this.hojeISO()).slice(0,7);

    Modal.open('⚙️ Configurações da agenda',`
      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()">
                <option value="todos">Todos os profissionais</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Mês</label>
              <input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()">
            </div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
          </div>
          <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
        </div>
      </div>

      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bl-prof">
                <option value="">Selecione</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
              </select>
            </div>
            <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
            <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
            <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
          </div>

          <div class="ag-config-grid three" style="margin-top:12px;">
            <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
          </div>
        </div>
      </div>

      <div class="ag-config-modal-card">
        <div class="ag-config-card-title">🎨 Cores da agenda</div>
        <div class="ag-config-card-body">
          <div class="ag-color-grid">
            ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`
              <div class="ag-color-item">
                <label>${l}</label>
                <input type="color" id="cor-${k}" value="${cfg.cores[k]||this.defaultColors()[k]||'#2563eb'}">
              </div>`).join('')}
          </div>
          <div class="row right" style="margin-top:14px;">
            <button type="button" class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button>
            <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button>
          </div>
        </div>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="AgendaMedica.cancelarConfigAgenda()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarConfigAgendaFechar()">Salvar</button>
    `,'lg');

    setTimeout(()=>{ try{ this.atualizarStatusMesConfig(); }catch(e){} },30);
    return false;
  };

  AgendaMedica.modalConfig=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfig=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfiguracao=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfiguracaoV152=function(){ return this.modalConfigOriginal(); };

  AgendaMedica.cancelarConfigAgenda=function(){
    Modal.close();
    return false;
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.cfg();
    cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el && el.value) cfg.cores[k]=el.value;
    });

    this.saveCfg(cfg);

    const salvo=this.cfg();
    salvo.cores=Object.assign(this.defaultColors(),salvo.cores||{},cfg.cores);
    this.saveCfg(salvo);

    Modal.close();
    setTimeout(()=>{ try{ this.render(); }catch(e){ console.error(e); } },30);

    Utils.toast('Cores salvas e aplicadas.');
    return false;
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    if(document.getElementById('cor-consulta')){
      return this.salvarCoresOriginal(true);
    }
    Modal.close();
    setTimeout(()=>{ try{ this.render(); }catch(e){} },30);
    Utils.toast('Configurações salvas.');
    return false;
  };

  AgendaMedica.restaurarCoresOriginal=function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);

    Object.entries(cfg.cores).forEach(([k,v])=>{
      const el=document.getElementById('cor-'+k);
      if(el) el.value=v;
    });

    Modal.close();
    setTimeout(()=>{ try{ this.render(); }catch(e){} },30);
    Utils.toast('Cores restauradas.');
    return false;
  };

  AgendaMedica.dataBloqueioV156=function(b){
    return this.isoFromBR(b.data||b.dia||b.dataBloqueio||b.date||'');
  };

  AgendaMedica.profBloqueioOkV156=function(b,profId){
    const p=b.profissionalId||b.profId||b.profissional||b.medicoId||'';
    return !p || String(p)==='todos' || String(p)==='all' || String(p)===String(profId);
  };

  AgendaMedica.inicioBloqueioV156=function(b){
    return b.horaInicio||b.inicio||b.hora||b.horario||b.start||'00:00';
  };

  AgendaMedica.fimBloqueioV156=function(b){
    return b.horaFim||b.fim||b.horaFinal||b.horarioFim||b.end||'23:59';
  };

  AgendaMedica.motivoBloqueioV156=function(b,def='Horário indisponível'){
    return b.motivo||b.observacao||b.obs||b.descricao||b.nome||b.titulo||def;
  };

  AgendaMedica.bloqueioNoHorarioPrintV156=function(h){
    const f=this.filtro();
    const profId=f.prof || this.profAtualId?.() || document.getElementById('ag-prof')?.value || '';
    const slotFim=this.horaFim(h,this.intervaloAtual ? this.intervaloAtual() : 30);

    return this.bloqueios().find(b=>{
      const dataOk=this.dataBloqueioV156(b)===f.data;
      const profOk=this.profBloqueioOkV156(b,profId);
      const diaInteiro=b.diaInteiro===true || String(b.tipo||b.tipoBloqueio||'').toLowerCase().includes('dia');
      if(dataOk && profOk && diaInteiro) return true;

      const inicio=this.inicioBloqueioV156(b);
      const fim=this.fimBloqueioV156(b);
      return dataOk && profOk && this.intervalosSobrepoem(inicio,fim,h,slotFim);
    }) || null;
  };

  AgendaMedica.linhasBloqueioGeralPrintV156=function(){
    const f=this.filtro();
    const profId=f.prof || this.profAtualId?.() || document.getElementById('ag-prof')?.value || '';
    const cfg=this.cfg();

    if(this.mesBloqueado && this.mesBloqueado(f.data,profId)){
      const d=new Date(f.data+'T12:00:00');
      const mes=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      return `<tr class="bloqueado">
        <td>—</td>
        <td colspan="3"><strong>Mês bloqueado</strong><br>${Utils.esc(mes)}</td>
        <td>Bloqueado</td>
      </tr>`;
    }

    const diaCfg=this.diaSemanaConfig ? this.diaSemanaConfig(f.data) : null;
    if(diaCfg && diaCfg.ativo===false){
      return `<tr class="bloqueado">
        <td>—</td>
        <td colspan="3"><strong>Dia fechado</strong><br>Sem atendimento configurado para este dia.</td>
        <td>Bloqueado</td>
      </tr>`;
    }

    const bloqueiosDia=this.bloqueios().filter(b=>this.dataBloqueioV156(b)===f.data && this.profBloqueioOkV156(b,profId));
    if(bloqueiosDia.length){
      return bloqueiosDia.map(b=>`<tr class="bloqueado">
        <td>${Utils.esc(this.inicioBloqueioV156(b))} - ${Utils.esc(this.fimBloqueioV156(b))}</td>
        <td colspan="3"><strong>Bloqueado</strong><br>${Utils.esc(this.motivoBloqueioV156(b))}</td>
        <td>Bloqueado</td>
      </tr>`).join('');
    }

    return `<tr class="vaga"><td>—</td><td colspan="4">Nenhum horário para imprimir.</td></tr>`;
  };

  AgendaMedica.imprimirAgenda=function(){
    const f=this.filtro();
    const prof=this.profissionalPrintV153 ? this.profissionalPrintV153() : (Store.get('PROFISSIONAIS').find(p=>String(p.id)===String(f.prof))||{});
    const tipo=f.tipo || this.tipoAtual();
    const isProc=tipo==='procedimento';
    const slots=this.slotsDia(f.data);

    const rows=(slots.length?slots.map(h=>{
      const bloqueio=this.bloqueioNoHorarioPrintV156(h);
      if(bloqueio){
        return `<tr class="bloqueado">
          <td>${Utils.esc(h)}</td>
          <td colspan="3"><strong>Bloqueado</strong><br>${Utils.esc(this.motivoBloqueioV156(bloqueio))}</td>
          <td>Bloqueado</td>
        </tr>`;
      }

      const ag=this.agendamentoNoHorarioPrintV153 ? this.agendamentoNoHorarioPrintV153(h) : null;
      if(!ag){
        return `<tr class="vaga">
          <td>${Utils.esc(h)}</td>
          <td></td>
          <td></td>
          <td></td>
          <td>Vago</td>
        </tr>`;
      }

      const p=this.pacienteAgendaPrintV153 ? this.pacienteAgendaPrintV153(ag) : (Store.get('PACIENTES').find(p=>String(p.id)===String(ag.pacienteId))||{});
      const nome=this.nomePacientePrintV153 ? this.nomePacientePrintV153(ag,p) : (p.nome||ag.paciente||'');
      const telefone=this.telefonePacientePrintV153 ? this.telefonePacientePrintV153(ag,p) : (p.telefone||p.tel||ag.telefone||'');
      const desc=isProc
        ? (ag.procedimento || ag.tipoConsulta || ag.motivo || ag.obs || 'Procedimento')
        : (ag.tipoConsulta || ag.procedimento || ag.motivo || ag.obs || 'Consulta');
      const status=ag.status || 'Agendado';
      const convenio=ag.convenio || p.convenio || p.plano || '';

      return `<tr class="ocupado">
        <td>${Utils.esc(ag.hora||h)}</td>
        <td><strong>${Utils.esc(nome)}</strong>${convenio?`<br><small>${Utils.esc(convenio)}</small>`:''}</td>
        <td>${Utils.esc(telefone)}</td>
        <td>${Utils.esc(desc)}</td>
        <td>${Utils.esc(status)}</td>
      </tr>`;
    }).join(''):this.linhasBloqueioGeralPrintV156());

    const dataBR=this.brFromInput ? this.brFromInput(f.data) : f.data;
    const titulo=isProc?'AGENDA DE PROCEDIMENTOS':'AGENDA MÉDICA';

    const html=`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${Utils.esc(titulo)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;padding:22px;color:#0f172a}
  h1{font-size:22px;margin:0 0 8px;text-align:center}
  .meta{display:flex;justify-content:space-between;gap:12px;margin:12px 0 18px;font-size:13px}
  .meta div{border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;flex:1;background:#f8fafc}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #dbe3ef;padding:8px;text-align:left;vertical-align:top}
  th{background:#eef2ff;color:#0f172a}
  tr.ocupado td{background:#fff}
  tr.vaga td{color:#64748b;background:#f8fafc}
  tr.bloqueado td{background:#fee2e2;color:#7f1d1d}
  small{color:#475569}
  @media print{body{padding:10mm}.no-print{display:none}}
</style>
</head>
<body>
  <h1>${Utils.esc(titulo)}</h1>
  <div class="meta">
    <div><strong>Profissional:</strong><br>${Utils.esc(prof.nome||'')}</div>
    <div><strong>Data:</strong><br>${Utils.esc(dataBR)}</div>
    <div><strong>Tipo:</strong><br>${isProc?'Procedimentos':'Consultas médicas'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:85px">Horário</th>
        <th>Paciente / Bloqueio</th>
        <th style="width:140px">Telefone</th>
        <th>${isProc?'Procedimento':'Consulta / Motivo'}</th>
        <th style="width:115px">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    setTimeout(()=>{
      try{
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }catch(e){}
      setTimeout(()=>iframe.remove(),1500);
    },300);

    return true;
  };
})();




/* =========================================================
   ZERO V15.7 — Salvar cores NÃO fecha modal; aplicar no Salvar final
   Correções:
   - Botão "Salvar cores" não fecha mais o modal.
   - Mostra mensagem "Cores salvas".
   - Grava as cores no AGENDA_CONFIG imediatamente.
   - A agenda só é renderizada/aplicada ao clicar no botão Salvar do modal.
   - Mantém o modal Configuração original.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__salvarCoresSemFecharV157) return;
  AgendaMedica.__salvarCoresSemFecharV157=true;

  AgendaMedica.lerCoresTelaV157=function(){
    const cfg=this.cfg();
    cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el && el.value) cfg.cores[k]=el.value;
    });

    return cfg;
  };

  AgendaMedica.mensagemCoresSalvasV157=function(texto){
    let msg=document.getElementById('cfg-cores-salvo-msg-v157');
    const alvo=document.querySelector('.ag-color-grid')?.parentElement;

    if(!msg && alvo){
      msg=document.createElement('div');
      msg.id='cfg-cores-salvo-msg-v157';
      msg.className='cfg-cores-salvo-msg-v157';
      alvo.appendChild(msg);
    }

    if(msg){
      msg.textContent=texto||'Cores salvas. Clique em Salvar para aplicar na agenda.';
      msg.style.display='block';
    }

    Utils.toast(texto||'Cores salvas. Clique em Salvar para aplicar na agenda.');
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.lerCoresTelaV157();

    this.saveCfg(cfg);

    // reforça no storage correto, sem fechar modal e sem renderizar a agenda agora
    try{
      const salvo=this.cfg();
      salvo.cores=Object.assign(this.defaultColors(),salvo.cores||{},cfg.cores);
      this.saveCfg(salvo);
    }catch(e){}

    if(mostrarToast!==false){
      this.mensagemCoresSalvasV157('Cores salvas. Clique em Salvar para aplicar na agenda.');
    }

    return false;
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    // Confirma tudo que está na tela, inclusive cores, e aí aplica no sistema
    if(document.getElementById('cor-consulta')){
      this.salvarCoresOriginal(false);
    }

    Modal.close();

    setTimeout(()=>{
      try{ this.render(); }catch(e){ console.error(e); }
    },30);

    Utils.toast('Configurações salvas e aplicadas.');
    return false;
  };

  AgendaMedica.restaurarCoresOriginal=function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);

    Object.entries(cfg.cores).forEach(([k,v])=>{
      const el=document.getElementById('cor-'+k);
      if(el) el.value=v;
    });

    this.mensagemCoresSalvasV157('Cores restauradas. Clique em Salvar para aplicar na agenda.');
    return false;
  };
})();




/* =========================================================
   ZERO V15.8 — Configurar agenda estável no modal original
   Correções:
   - Mantém Modal.open original do sistema.
   - Não usa overlay/root customizado.
   - Abre sem piscar.
   - Não renderiza agenda enquanto o modal está aberto.
   - Salvar cores não fecha o modal.
   - Salvar final aplica e fecha.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__configAgendaEstavelOriginalV158) return;
  AgendaMedica.__configAgendaEstavelOriginalV158=true;

  AgendaMedica.estabilizarModalConfigV158=function(){
    document.body.classList.add('agenda-config-estavel-v158');

    const root=document.getElementById('modal-root');
    if(root){
      root.classList.add('agenda-config-root-estavel-v158');
      root.querySelectorAll('.modal,.modal-box,.modal-content,.modal-backdrop,.cm-modal,.modal-body').forEach(el=>{
        el.classList.add('agenda-config-modal-estavel-v158');
        el.style.animation='none';
        el.style.transition='none';
        el.style.opacity='1';
        el.style.visibility='visible';
        el.style.transform='none';
      });
    }

    const modal=document.querySelector('#modal-root .modal,#modal-root .modal-box,#modal-root .cm-modal');
    if(modal) modal.setAttribute('data-agenda-config','true');
  };

  AgendaMedica.htmlConfigAgendaV158=function(){
    const cfg=this.cfg();
    cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});

    const profs=this.profissionais();
    const mesAtual=(this.filtro().data||this.hojeISO()).slice(0,7);

    return `
      <div class="ag-config-modal-card agenda-config-card-v158">
        <div class="ag-config-card-title">📅 Bloquear / desbloquear mês</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bloq-prof" onchange="AgendaMedica.atualizarStatusMesConfig()">
                <option value="todos">Todos os profissionais</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Mês</label>
              <input id="cfg-bloq-mes" type="month" value="${mesAtual}" onchange="AgendaMedica.atualizarStatusMesConfig()">
            </div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearMesOriginal()">Bloquear mês</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearMesOriginal()">Desbloquear mês</button>
          </div>
          <div id="cfg-bloq-status-mes" style="margin-top:10px;font-weight:1000;"></div>
        </div>
      </div>

      <div class="ag-config-modal-card agenda-config-card-v158">
        <div class="ag-config-card-title">🔒 Bloquear dia / período / horário</div>
        <div class="ag-config-card-body">
          <div class="ag-config-grid">
            <div>
              <label>Profissional</label>
              <select id="cfg-bl-prof">
                <option value="">Selecione</option>
                ${profs.map(p=>`<option value="${p.id}">${Utils.esc(p.nome||'')}</option>`).join('')}
              </select>
            </div>
            <div><label>Data</label><input id="cfg-bl-data" type="date"></div>
            <div><label>Início</label><input id="cfg-bl-inicio" type="time"></div>
            <div><label>Fim</label><input id="cfg-bl-fim" type="time"></div>
          </div>

          <div class="ag-config-grid three" style="margin-top:12px;">
            <div><label>Motivo</label><input id="cfg-bl-motivo" placeholder="Férias, reunião, almoço..."></div>
            <button type="button" class="btn btn-red" onclick="AgendaMedica.bloquearPeriodoOriginal()">Bloquear</button>
            <button type="button" class="btn btn-green" onclick="AgendaMedica.desbloquearPeriodoOriginal()">Desbloquear</button>
          </div>
        </div>
      </div>

      <div class="ag-config-modal-card agenda-config-card-v158">
        <div class="ag-config-card-title">🎨 Cores da agenda</div>
        <div class="ag-config-card-body">
          <div class="ag-color-grid">
            ${[['vago','Horário vago'],['consulta','Consulta'],['procedimento','Procedimento'],['bloqueio','Bloqueio'],['aguardando','Aguardando'],['confirmado','Confirmado'],['atendido','Atendido'],['cancelado','Cancelado/Faltou']].map(([k,l])=>`
              <div class="ag-color-item">
                <label>${l}</label>
                <input type="color" id="cor-${k}" value="${cfg.cores[k]||this.defaultColors()[k]||'#2563eb'}">
              </div>`).join('')}
          </div>
          <div class="row right" style="margin-top:14px;">
            <button type="button" class="btn btn-outline" onclick="AgendaMedica.restaurarCoresOriginal()">Restaurar cores</button>
            <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarCoresOriginal()">Salvar cores</button>
          </div>
        </div>
      </div>`;
  };

  AgendaMedica.modalConfigOriginal=function(){
    // limpa os overlays antigos, mas mantém o modal original do sistema
    ['agenda-config-root-v147','agenda-config-root-v151','agenda-config-root-v152'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='';
    });
    document.body.classList.remove(
      'agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152',
      'agenda-config-ready-v147','agenda-config-ready-v151'
    );
    document.body.classList.add('agenda-config-opening-v158');

    Modal.open('⚙️ Configurações da agenda',
      this.htmlConfigAgendaV158(),
      `<button type="button" class="btn btn-ghost" onclick="AgendaMedica.cancelarConfigAgenda()">Cancelar</button>
       <button type="button" class="btn btn-blue" onclick="AgendaMedica.salvarConfigAgendaFechar()">Salvar</button>`,
      'lg'
    );

    this.estabilizarModalConfigV158();
    requestAnimationFrame(()=>{
      this.estabilizarModalConfigV158();
      try{ this.atualizarStatusMesConfig(); }catch(e){}
      document.body.classList.remove('agenda-config-opening-v158');
    });

    setTimeout(()=>{
      this.estabilizarModalConfigV158();
      try{ this.atualizarStatusMesConfig(); }catch(e){}
      document.body.classList.remove('agenda-config-opening-v158');
    },50);

    return false;
  };

  AgendaMedica.modalConfig=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfig=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfiguracao=function(){ return this.modalConfigOriginal(); };
  AgendaMedica.abrirConfiguracaoV152=function(){ return this.modalConfigOriginal(); };

  AgendaMedica.cancelarConfigAgenda=function(){
    document.body.classList.remove('agenda-config-estavel-v158','agenda-config-opening-v158');
    Modal.close();
    return false;
  };

  AgendaMedica.salvarCoresOriginal=function(mostrarToast=true){
    const cfg=this.lerCoresTelaV157 ? this.lerCoresTelaV157() : this.cfg();
    cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});

    ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
      const el=document.getElementById('cor-'+k);
      if(el && el.value) cfg.cores[k]=el.value;
    });

    this.saveCfg(cfg);

    if(this.mensagemCoresSalvasV157){
      this.mensagemCoresSalvasV157('Cores salvas. Clique em Salvar para aplicar na agenda.');
    }else{
      Utils.toast('Cores salvas. Clique em Salvar para aplicar na agenda.');
    }

    this.estabilizarModalConfigV158();
    return false;
  };

  AgendaMedica.salvarConfigAgendaFechar=function(){
    if(document.getElementById('cor-consulta')){
      // grava as cores, mas não fecha por essa função
      const cfg=this.cfg();
      cfg.cores=Object.assign(this.defaultColors(),cfg.cores||{});
      ['vago','consulta','procedimento','bloqueio','aguardando','confirmado','atendido','cancelado'].forEach(k=>{
        const el=document.getElementById('cor-'+k);
        if(el && el.value) cfg.cores[k]=el.value;
      });
      this.saveCfg(cfg);
    }

    document.body.classList.remove('agenda-config-estavel-v158','agenda-config-opening-v158');
    Modal.close();

    setTimeout(()=>{
      try{ this.render(); }catch(e){ console.error(e); }
    },30);

    Utils.toast('Configurações salvas e aplicadas.');
    return false;
  };

  AgendaMedica.restaurarCoresOriginal=function(){
    const cfg=this.cfg();
    cfg.cores=this.defaultColors();
    this.saveCfg(cfg);

    Object.entries(cfg.cores).forEach(([k,v])=>{
      const el=document.getElementById('cor-'+k);
      if(el) el.value=v;
    });

    if(this.mensagemCoresSalvasV157){
      this.mensagemCoresSalvasV157('Cores restauradas. Clique em Salvar para aplicar na agenda.');
    }else{
      Utils.toast('Cores restauradas. Clique em Salvar para aplicar na agenda.');
    }

    this.estabilizarModalConfigV158();
    return false;
  };
})();




/* =========================================================
   ZERO V15.9 — Impressão Agenda Procedimentos mostra vagas bloqueadas
   Correções:
   - Na impressão da Agenda Procedimentos aparece bloqueio direto.
   - Na impressão aparece bloqueio cruzado: ocupado na Agenda Médica.
   - Na impressão da Agenda Médica aparece bloqueio cruzado: ocupado em Procedimentos.
   - Mantém paciente/telefone/status dos agendados.
   - Não altera o modal Configurar Agenda.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__printProcedimentosBloqueiosV159) return;
  AgendaMedica.__printProcedimentosBloqueiosV159=true;

  AgendaMedica.agendamentoCruzadoNoHorarioPrintV159=function(h){
    const f=this.filtro();
    const profId=f.prof || this.profAtualId?.() || document.getElementById('ag-prof')?.value || '';
    const tipoAtual=f.tipo || this.tipoAtual();
    const slotFim=this.horaFim(h,this.intervaloAtual ? this.intervaloAtual() : 30);

    return this.agendamentos().find(a=>{
      const dataOk=this.isoFromBR(a.data)===f.data;
      const profOk=String(a.profissionalId||a.profId||'')===String(profId);
      const tipoAg=String(a.tipo||'consulta');
      const tipoCruzado=tipoAg!==String(tipoAtual);
      const status=String(a.status||'');
      const ativo=!['Cancelado','Faltou'].includes(status);
      const inicio=a.hora || a.horaInicio || '';
      const fim=this.horaFim(inicio,a.duracao || (tipoAg==='procedimento'?15:30));
      return dataOk && profOk && tipoCruzado && ativo && this.intervalosSobrepoem(inicio,fim,h,slotFim);
    }) || null;
  };

  AgendaMedica.linhaBloqueioCruzadoPrintV159=function(h,ag){
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(ag.pacienteId))||{};
    const origem=String(ag.tipo||'consulta')==='procedimento' ? 'Agenda Procedimentos' : 'Agenda Médica';
    const nome=p.nome || ag.paciente || ag.pacienteNome || '';
    const motivo=`Ocupado na ${origem}${nome?' por '+nome:''}`;
    return `<tr class="bloqueado">
      <td>${Utils.esc(h)}</td>
      <td colspan="3"><strong>Bloqueado</strong><br>${Utils.esc(motivo)}</td>
      <td>Bloqueado</td>
    </tr>`;
  };

  AgendaMedica.imprimirAgenda=function(){
    const f=this.filtro();
    const prof=this.profissionalPrintV153 ? this.profissionalPrintV153() : (Store.get('PROFISSIONAIS').find(p=>String(p.id)===String(f.prof))||{});
    const tipo=f.tipo || this.tipoAtual();
    const isProc=tipo==='procedimento';
    const slots=this.slotsDia(f.data);

    const rows=(slots.length?slots.map(h=>{
      const bloqueio=this.bloqueioNoHorarioPrintV156 ? this.bloqueioNoHorarioPrintV156(h) : (this.bloqueioNoHorarioPrintV154 ? this.bloqueioNoHorarioPrintV154(h) : null);
      if(bloqueio){
        const motivo=this.motivoBloqueioV156 ? this.motivoBloqueioV156(bloqueio) : (bloqueio.motivo||'Horário indisponível');
        return `<tr class="bloqueado">
          <td>${Utils.esc(h)}</td>
          <td colspan="3"><strong>Bloqueado</strong><br>${Utils.esc(motivo)}</td>
          <td>Bloqueado</td>
        </tr>`;
      }

      const cruzado=this.agendamentoCruzadoNoHorarioPrintV159(h);
      if(cruzado){
        return this.linhaBloqueioCruzadoPrintV159(h,cruzado);
      }

      const ag=this.agendamentoNoHorarioPrintV153 ? this.agendamentoNoHorarioPrintV153(h) : null;
      if(!ag){
        return `<tr class="vaga">
          <td>${Utils.esc(h)}</td>
          <td></td>
          <td></td>
          <td></td>
          <td>Vago</td>
        </tr>`;
      }

      const p=this.pacienteAgendaPrintV153 ? this.pacienteAgendaPrintV153(ag) : (Store.get('PACIENTES').find(p=>String(p.id)===String(ag.pacienteId))||{});
      const nome=this.nomePacientePrintV153 ? this.nomePacientePrintV153(ag,p) : (p.nome||ag.paciente||'');
      const telefone=this.telefonePacientePrintV153 ? this.telefonePacientePrintV153(ag,p) : (p.telefone||p.tel||ag.telefone||'');
      const desc=isProc
        ? (ag.procedimento || ag.tipoConsulta || ag.motivo || ag.obs || 'Procedimento')
        : (ag.tipoConsulta || ag.procedimento || ag.motivo || ag.obs || 'Consulta');
      const status=ag.status || 'Agendado';
      const convenio=ag.convenio || p.convenio || p.plano || '';

      return `<tr class="ocupado">
        <td>${Utils.esc(ag.hora||h)}</td>
        <td><strong>${Utils.esc(nome)}</strong>${convenio?`<br><small>${Utils.esc(convenio)}</small>`:''}</td>
        <td>${Utils.esc(telefone)}</td>
        <td>${Utils.esc(desc)}</td>
        <td>${Utils.esc(status)}</td>
      </tr>`;
    }).join(''):(this.linhasBloqueioGeralPrintV156 ? this.linhasBloqueioGeralPrintV156() : `<tr class="vaga"><td>—</td><td colspan="4">Nenhum horário para imprimir.</td></tr>`));

    const dataBR=this.brFromInput ? this.brFromInput(f.data) : f.data;
    const titulo=isProc?'AGENDA DE PROCEDIMENTOS':'AGENDA MÉDICA';

    const html=`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${Utils.esc(titulo)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;padding:22px;color:#0f172a}
  h1{font-size:22px;margin:0 0 8px;text-align:center}
  .meta{display:flex;justify-content:space-between;gap:12px;margin:12px 0 18px;font-size:13px}
  .meta div{border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;flex:1;background:#f8fafc}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #dbe3ef;padding:8px;text-align:left;vertical-align:top}
  th{background:#eef2ff;color:#0f172a}
  tr.ocupado td{background:#fff}
  tr.vaga td{color:#64748b;background:#f8fafc}
  tr.bloqueado td{background:#fee2e2;color:#7f1d1d}
  small{color:#475569}
  @media print{body{padding:10mm}.no-print{display:none}}
</style>
</head>
<body>
  <h1>${Utils.esc(titulo)}</h1>
  <div class="meta">
    <div><strong>Profissional:</strong><br>${Utils.esc(prof.nome||'')}</div>
    <div><strong>Data:</strong><br>${Utils.esc(dataBR)}</div>
    <div><strong>Tipo:</strong><br>${isProc?'Procedimentos':'Consultas médicas'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:85px">Horário</th>
        <th>Paciente / Bloqueio</th>
        <th style="width:140px">Telefone</th>
        <th>${isProc?'Procedimento':'Consulta / Motivo'}</th>
        <th style="width:115px">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    setTimeout(()=>{
      try{
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }catch(e){}
      setTimeout(()=>iframe.remove(),1500);
    },300);

    return true;
  };
})();




/* =========================================================
   ZERO V16.0 — Atender pela agenda abre Registrar Consulta
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__registrarConsultaAgendaFixV160) return;
  AgendaMedica.__registrarConsultaAgendaFixV160=true;

  AgendaMedica.abrirAtenderAgenda=function(atendimentoId,pacId){
    let at=(Store.get('ATENDIMENTOS')||[]).find(x=>String(x.id)===String(atendimentoId));
    const pid=pacId || at?.pacId || at?.pacienteId || '';

    if(!at && atendimentoId){
      at=(Store.get('ATENDIMENTOS')||[]).find(x=>String(x.origemAgendaId||'')===String(atendimentoId));
    }

    if(window.Atendimento?.prepararRegistrarConsultaV160){
      at=Atendimento.prepararRegistrarConsultaV160(at?.id||atendimentoId||'',pid) || at;
    }

    const finalPid=pid || at?.pacId || at?.pacienteId || '';
    if(!finalPid) return Utils.toast('Atendimento ainda não encontrado na fila.');

    if(window.RegistrarConsulta?.open){
      return RegistrarConsulta.open(finalPid,at?.id||atendimentoId||'');
    }

    Utils.toast('Módulo Registrar Consulta não encontrado.');
    return false;
  };
})();




/* =========================================================
   ZERO V16.1 — Agenda abre Registrar Consulta estável
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__registrarConsultaAgendaSeguroV161) return;
  AgendaMedica.__registrarConsultaAgendaSeguroV161=true;

  AgendaMedica.abrirAtenderAgenda=function(atendimentoId,pacId){
    let at=(Store.get('ATENDIMENTOS')||[]).find(x=>String(x.id)===String(atendimentoId))||null;
    if(!at && atendimentoId){
      at=(Store.get('ATENDIMENTOS')||[]).find(x=>String(x.origemAgendaId||'')===String(atendimentoId))||null;
    }

    const pid=pacId || at?.pacId || at?.pacienteId || '';
    if(window.Atendimento?.abrirRegistrarConsultaSeguroV161){
      return Atendimento.abrirRegistrarConsultaSeguroV161(at?.id||atendimentoId||'',pid);
    }

    if(window.RegistrarConsulta?.open && pid){
      return RegistrarConsulta.open(pid,at?.id||atendimentoId||'');
    }

    Utils.toast('Atendimento ainda não encontrado na fila.');
    return false;
  };
})();




/* =========================================================
   ZERO V17.5 — Agenda respeita agenda do profissional
   - Agenda Médica mostra profissionais de consulta/ambas.
   - Agenda Procedimentos mostra profissionais de procedimentos/ambas.
   - Profissionais antigos sem configuração continuam aparecendo nas duas.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__filtraProfPorAgendaV175) return;
  AgendaMedica.__filtraProfPorAgendaV175=true;

  AgendaMedica.agendaTipoProfissionalV175=function(p={}){
    let v=String(p.agendaTipo||p.agendaAtendimento||p.tipoAgenda||p.agenda||'').trim().toLowerCase();
    if(!v){
      const med=p.atendeAgendaMedica!==false && p.atendeConsulta!==false && p.atendeAgendaConsulta!==false;
      const proc=p.atendeAgendaProcedimentos!==false && p.atendeProcedimento!==false && p.atendeAgendaProcedimento!==false;
      if(med && proc) return 'ambas';
      if(proc) return 'procedimento';
      if(med) return 'consulta';
      return 'ambas';
    }
    if(['ambas','ambos','todos','todas','consulta_procedimento','medica_procedimento'].includes(v)) return 'ambas';
    if(['procedimento','procedimentos','agendaprocedimentos','agenda_procedimentos'].includes(v)) return 'procedimento';
    if(['consulta','consultas','medica','médica','agenda','agenda_medica','agenda médica'].includes(v)) return 'consulta';
    return 'ambas';
  };

  AgendaMedica.profissionais=function(){
    const ativos=(Store.get('PROFISSIONAIS')||[]).filter(p=>p.ativo!==false);
    const isProc=this.isProcedimentosRoute ? this.isProcedimentosRoute() : this.modoAgenda==='procedimento';
    const filtered=ativos.filter(p=>{
      const t=this.agendaTipoProfissionalV175(p);
      return isProc ? (t==='ambas'||t==='procedimento') : (t==='ambas'||t==='consulta');
    });
    // segurança para não deixar agenda vazia por cadastro antigo/incompleto
    return filtered.length ? filtered : ativos;
  };
})();




/* =========================================================
   ZERO V17.6 — Agenda filtra profissional pela escolha salva
   Correção:
   - Se escolheu Somente agenda médica, não aparece em Procedimentos.
   - Se escolheu Somente agenda procedimentos, não aparece em Agenda Médica.
   - Só profissionais sem configuração antiga continuam em ambas.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__filtraProfPorAgendaSalvaV176) return;
  AgendaMedica.__filtraProfPorAgendaSalvaV176=true;

  AgendaMedica.profTemConfigAgendaV176=function(p={}){
    return ['agendaTipo','agendaAtendimento','tipoAgenda','agenda','atendeAgendaMedica','atendeConsulta','atendeAgendaConsulta','atendeAgendaProcedimentos','atendeProcedimento','atendeAgendaProcedimento']
      .some(k=>Object.prototype.hasOwnProperty.call(p,k));
  };

  AgendaMedica.agendaTipoProfissionalV176=function(p={}){
    let v=String(p.agendaTipo||p.agendaAtendimento||p.tipoAgenda||p.agenda||'').trim().toLowerCase();

    if(!v){
      if(!this.profTemConfigAgendaV176(p)) return 'ambas';
      const med=p.atendeAgendaMedica===true || p.atendeConsulta===true || p.atendeAgendaConsulta===true;
      const proc=p.atendeAgendaProcedimentos===true || p.atendeProcedimento===true || p.atendeAgendaProcedimento===true;
      if(med && proc) return 'ambas';
      if(proc) return 'procedimento';
      if(med) return 'consulta';
      return 'ambas';
    }

    if(['ambas','ambos','todos','todas','consulta_procedimento','medica_procedimento'].includes(v)) return 'ambas';
    if(['procedimento','procedimentos','agendaprocedimentos','agenda_procedimentos','agenda procedimentos'].includes(v)) return 'procedimento';
    if(['consulta','consultas','medica','médica','agenda','agenda_medica','agenda médica'].includes(v)) return 'consulta';
    return 'ambas';
  };

  AgendaMedica.profissionais=function(){
    const ativos=(Store.get('PROFISSIONAIS')||[]).filter(p=>p.ativo!==false);
    const isProc=this.isProcedimentosRoute ? this.isProcedimentosRoute() : this.modoAgenda==='procedimento';

    return ativos.filter(p=>{
      const t=this.agendaTipoProfissionalV176(p);
      return isProc ? (t==='ambas'||t==='procedimento') : (t==='ambas'||t==='consulta');
    });
  };

  const oldRenderV176=AgendaMedica.render?.bind(AgendaMedica);
  AgendaMedica.render=function(){
    const oldProf=document.getElementById('ag-prof')?.value||'';
    const ret=oldRenderV176 ? oldRenderV176(...arguments) : undefined;

    setTimeout(()=>{
      const sel=document.getElementById('ag-prof');
      if(!sel) return;
      const valid=[...sel.options].some(o=>String(o.value)===String(oldProf));
      if(oldProf && valid) sel.value=oldProf;
      if(!sel.value && sel.options.length) sel.value=sel.options[0].value;
    },0);

    return ret;
  };
})();




/* =========================================================
   ZERO V17.7 — Desbloquear mês atualiza na hora
   Correções:
   - Ao desbloquear mês, a agenda atualiza imediatamente.
   - Não precisa sair do mês e voltar.
   - "Todos os profissionais" remove todos os bloqueios daquele mês.
   - Status do modal muda na hora para Mês desbloqueado.
   - Mantém o modal Configuração aberto.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__desbloquearMesAtualizaV177) return;
  AgendaMedica.__desbloquearMesAtualizaV177=true;

  AgendaMedica.mesSelecionadoConfigV177=function(){
    return document.getElementById('cfg-bloq-mes')?.value || (this.filtro().data||this.hojeISO()).slice(0,7);
  };

  AgendaMedica.profSelecionadoConfigV177=function(){
    return document.getElementById('cfg-bloq-prof')?.value || 'todos';
  };

  AgendaMedica.normalizarMesesBloqueadosV177=function(cfg){
    cfg.mesesBloqueados=Array.from(new Set((cfg.mesesBloqueados||[]).filter(Boolean).map(String)));
    return cfg;
  };

  AgendaMedica.mesBloqueadoConfigV177=function(prof,mes){
    const cfg=this.cfg();
    const keys=cfg.mesesBloqueados||[];
    if(prof==='todos'){
      return keys.some(k=>String(k).endsWith('|'+mes));
    }
    return keys.includes(`${prof}|${mes}`) || keys.includes(`todos|${mes}`);
  };

  AgendaMedica.atualizarStatusMesConfig=function(){
    const st=document.getElementById('cfg-bloq-status-mes');
    const mes=this.mesSelecionadoConfigV177();
    const prof=this.profSelecionadoConfigV177();

    if(!st || !mes) return;

    const bloqueado=this.mesBloqueadoConfigV177(prof,mes);

    st.innerHTML=bloqueado
      ? '<span class="ag-month-blocked">Mês bloqueado</span>'
      : '<span class="ag-month-open">Mês desbloqueado</span>';
  };

  AgendaMedica.aplicarMesNaTelaV177=function(mes){
    const dataEl=document.getElementById('ag-data');
    if(!dataEl || !mes) return;

    const atual=String(dataEl.value||'');
    if(!atual || atual.slice(0,7)!==mes){
      dataEl.value=mes+'-01';
    }
  };

  AgendaMedica.atualizarAgendaSemFecharConfigV177=function(mes){
    try{ this.aplicarMesNaTelaV177(mes); }catch(e){}
    try{ this.atualizarStatusMesConfig(); }catch(e){}

    const cfgRootAberto=!!(
      document.getElementById('modal-root')?.innerHTML ||
      document.getElementById('agenda-config-root-v147')?.innerHTML ||
      document.getElementById('agenda-config-root-v151')?.innerHTML ||
      document.getElementById('agenda-config-root-v152')?.innerHTML
    );

    requestAnimationFrame(()=>{
      try{
        this.render();
      }catch(e){
        console.warn('Falha ao atualizar agenda após bloqueio/desbloqueio',e);
      }

      requestAnimationFrame(()=>{
        try{ this.aplicarMesNaTelaV177(mes); }catch(e){}
        try{ this.atualizarStatusMesConfig(); }catch(e){}
        if(cfgRootAberto) document.body.classList.add('agenda-config-estavel-v158');
      });
    });
  };

  AgendaMedica.bloquearMesOriginal=function(){
    const cfg=this.normalizarMesesBloqueadosV177(this.cfg());
    const prof=this.profSelecionadoConfigV177();
    const mes=this.mesSelecionadoConfigV177();

    if(!mes) return Utils.toast('Informe o mês.');

    if(prof==='todos'){
      // bloqueio global: limpa bloqueios individuais do mesmo mês para não deixar conflito
      cfg.mesesBloqueados=(cfg.mesesBloqueados||[]).filter(k=>!String(k).endsWith('|'+mes));
      cfg.mesesBloqueados.push(`todos|${mes}`);
    }else{
      const key=`${prof}|${mes}`;
      if(!cfg.mesesBloqueados.includes(key)) cfg.mesesBloqueados.push(key);
    }

    this.saveCfg(this.normalizarMesesBloqueadosV177(cfg));
    this.atualizarAgendaSemFecharConfigV177(mes);
    Utils.toast('Mês bloqueado.');
    return false;
  };

  AgendaMedica.desbloquearMesOriginal=function(){
    const cfg=this.normalizarMesesBloqueadosV177(this.cfg());
    const prof=this.profSelecionadoConfigV177();
    const mes=this.mesSelecionadoConfigV177();

    if(!mes) return Utils.toast('Informe o mês.');

    if(prof==='todos'){
      // quando está em Todos, desbloqueia o mês inteiro, inclusive bloqueios individuais antigos
      cfg.mesesBloqueados=(cfg.mesesBloqueados||[]).filter(k=>!String(k).endsWith('|'+mes));
    }else{
      // quando é profissional específico, remove o específico e o global que também prendia esse profissional
      cfg.mesesBloqueados=(cfg.mesesBloqueados||[]).filter(k=>k!==`${prof}|${mes}` && k!==`todos|${mes}`);
    }

    this.saveCfg(this.normalizarMesesBloqueadosV177(cfg));
    this.atualizarAgendaSemFecharConfigV177(mes);
    Utils.toast('Mês desbloqueado.');
    return false;
  };

  const oldDesbloquearPeriodoV177=AgendaMedica.desbloquearPeriodoOriginal?.bind(AgendaMedica);
  AgendaMedica.desbloquearPeriodoOriginal=function(){
    const data=document.getElementById('cfg-bl-data')?.value || '';
    const ret=oldDesbloquearPeriodoV177 ? oldDesbloquearPeriodoV177(...arguments) : false;
    const mes=(data || this.filtro().data || this.hojeISO()).slice(0,7);
    this.atualizarAgendaSemFecharConfigV177(mes);
    return ret;
  };

  const oldBloquearPeriodoV177=AgendaMedica.bloquearPeriodoOriginal?.bind(AgendaMedica);
  AgendaMedica.bloquearPeriodoOriginal=function(){
    const data=document.getElementById('cfg-bl-data')?.value || '';
    const ret=oldBloquearPeriodoV177 ? oldBloquearPeriodoV177(...arguments) : false;
    const mes=(data || this.filtro().data || this.hojeISO()).slice(0,7);
    this.atualizarAgendaSemFecharConfigV177(mes);
    return ret;
  };
})();




/* =========================================================
   ZERO V18.4 — Menus corrigidos + idade na agenda sem quebrar render
   Correção:
   - Não sobrescreve renderSlots da agenda.
   - Apenas aplica a idade depois que a agenda renderiza.
   - Evita erro que travava acesso aos menus.
========================================================= */
(function(){
  if(!window.AgendaMedica || AgendaMedica.__menusFixIdadeAgendaSeguroV184) return;
  AgendaMedica.__menusFixIdadeAgendaSeguroV184=true;

  AgendaMedica.dataPacienteV184=function(p={}){
    return p.nascimento || p.nasc || p.dataNascimento || p.dtNascimento || p.data_nascimento || '';
  };

  AgendaMedica.idadePacienteV184=function(p={}){
    const raw=this.dataPacienteV184(p);
    if(!raw) return '';
    let d,m,a;
    const s=String(raw).trim();

    if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){
      [d,m,a]=s.slice(0,10).split('/').map(Number);
    }else if(/^\d{4}-\d{2}-\d{2}/.test(s)){
      [a,m,d]=s.slice(0,10).split('-').map(Number);
    }else{
      const dt=new Date(s);
      if(isNaN(dt.getTime())) return '';
      d=dt.getDate();
      m=dt.getMonth()+1;
      a=dt.getFullYear();
    }

    if(!a || !m || !d) return '';
    const hoje=new Date();
    let idade=hoje.getFullYear()-a;
    const mes=hoje.getMonth()+1;
    const dia=hoje.getDate();
    if(mes<m || (mes===m && dia<d)) idade--;
    if(idade<0 || idade>130) return '';
    return `${idade} anos`;
  };

  AgendaMedica.nomeComIdadeV184=function(ag={},p={}){
    const nome=p.nome || p.nomeCompleto || ag.paciente || ag.nomePaciente || '';
    if(!nome) return '';
    const idade=this.idadePacienteV184(p);
    return idade ? `${nome} — ${idade}` : nome;
  };

  AgendaMedica.aplicarIdadeNosCardsV184=function(){
    try{
      const pacientes=Store.get('PACIENTES')||[];
      const ags=this.agendamentos ? (this.agendamentos()||[]) : [];
      const f=this.filtro ? this.filtro() : {};
      const dataAtual=f.data || '';

      document.querySelectorAll('.ag-slot-print.ocupado').forEach(card=>{
        const hora=card.querySelector('.ag-slot-time')?.textContent?.trim()||'';
        const strong=card.querySelector('.ag-slot-info strong');
        if(!strong || !hora) return;

        const nomeAtual=String(strong.textContent||'').replace(/\s+—\s+\d+\s+anos\s*$/,'').trim();
        let ag=ags.find(a=>{
          const dataOk=!dataAtual || (this.isoFromBR ? this.isoFromBR(a.data)===dataAtual : true);
          return dataOk && String(a.hora||'').trim()===hora && String(a.paciente||a.nomePaciente||'').trim()===nomeAtual;
        });

        if(!ag){
          ag=ags.find(a=>{
            const dataOk=!dataAtual || (this.isoFromBR ? this.isoFromBR(a.data)===dataAtual : true);
            return dataOk && String(a.hora||'').trim()===hora;
          });
        }

        if(!ag) return;
        const p=pacientes.find(x=>String(x.id)===String(ag.pacienteId))||{};
        const nomeIdade=this.nomeComIdadeV184(ag,p);
        if(nomeIdade) strong.textContent=nomeIdade;
      });
    }catch(e){
      console.warn('Falha ao aplicar idade nos agendamentos', e);
    }
  };

  const oldRenderV184=AgendaMedica.render?.bind(AgendaMedica);
  if(oldRenderV184){
    AgendaMedica.render=function(){
      const ret=oldRenderV184(...arguments);
      setTimeout(()=>this.aplicarIdadeNosCardsV184(),30);
      setTimeout(()=>this.aplicarIdadeNosCardsV184(),120);
      return ret;
    };
  }

  const oldSelecionarDiaV184=AgendaMedica.selecionarDia?.bind(AgendaMedica);
  if(oldSelecionarDiaV184){
    AgendaMedica.selecionarDia=function(){
      const ret=oldSelecionarDiaV184(...arguments);
      setTimeout(()=>this.aplicarIdadeNosCardsV184(),60);
      return ret;
    };
  }

  const oldNomePrintV184=AgendaMedica.nomePacientePrintV153?.bind(AgendaMedica);
  AgendaMedica.nomePacientePrintV153=function(ag={},p={}){
    return this.nomeComIdadeV184(ag,p) || (oldNomePrintV184 ? oldNomePrintV184(ag,p) : (p.nome||ag.paciente||''));
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>AgendaMedica.aplicarIdadeNosCardsV184 && AgendaMedica.aplicarIdadeNosCardsV184(),300));
})();
