window.Relatorios={
  tab:'geral',

  money(v){
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  },

  dataIsoBR(dataBR){
    if(!dataBR) return '';
    if(String(dataBR).includes('-')) return dataBR;
    const m=String(dataBR).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return `${m[3]}-${m[2]}-${m[1]}`;
    return dataBR;
  },

  brFromInput(v){
    if(!v) return '';
    if(v.includes('/')) return v;
    const [y,m,d]=v.split('-');
    return `${d}/${m}/${y}`;
  },

  dataValor(d){
    const iso=this.dataIsoBR(d);
    const t=Date.parse(iso+'T12:00:00');
    return isNaN(t)?0:t;
  },

  periodoDefault(){
    const hoje=new Date();
    const inicio=new Date(hoje.getFullYear(),hoje.getMonth(),1);
    const iso=d=>d.toISOString().slice(0,10);
    return {inicio:iso(inicio),fim:iso(hoje)};
  },

  filtroAtual(){
    const def=this.periodoDefault();
    const inicio=document.getElementById('rel-inicio')?.value || def.inicio;
    const fim=document.getElementById('rel-fim')?.value || def.fim;
    const prof=document.getElementById('rel-prof')?.value || '';
    return {inicio,fim,prof};
  },

  dentroPeriodo(data,inicio,fim){
    const v=this.dataValor(data);
    const i=Date.parse(inicio+'T00:00:00')||0;
    const f=Date.parse(fim+'T23:59:59')||9999999999999;
    return v>=i && v<=f;
  },

  render(tab=''){
    if(tab) this.tab=tab;
    const def=this.periodoDefault();

    document.getElementById('content').innerHTML=`<div class="rel-toolbar">
      <div>
        <h2 style="margin:0;">📊 Relatórios</h2>
        <div style="color:#64748b;margin-top:4px;">Relatórios gerenciais, clínicos, financeiros e operacionais da clínica.</div>
      </div>
      <div class="row">
        <button class="btn btn-outline" onclick="Relatorios.exportarJSON()">Exportar JSON</button>
        <button class="btn btn-blue" onclick="Relatorios.imprimir()">🖨️ Imprimir relatório</button>
      </div>
    </div>

    <div class="rel-tabs">
      ${[
        ['geral','Geral'],
        ['atendimentos','Atendimentos'],
        ['pacientes','Pacientes'],
        ['financeiro','Financeiro'],
        ['documentos','Documentos'],
        ['profissionais','Profissionais'],
        ['auditoria','Auditoria']
      ].map(t=>`<button class="${this.tab===t[0]?'active':''}" onclick="Relatorios.render('${t[0]}')">${t[1]}</button>`).join('')}
    </div>

    <div class="rel-filtros">
      <div><label>Data inicial</label><input id="rel-inicio" type="date" value="${def.inicio}" onchange="Relatorios.atualizar()"></div>
      <div><label>Data final</label><input id="rel-fim" type="date" value="${def.fim}" onchange="Relatorios.atualizar()"></div>
      <div><label>Profissional</label><select id="rel-prof" onchange="Relatorios.atualizar()"><option value="">Todos</option>${Store.get('PROFISSIONAIS').map(p=>`<option>${Utils.esc(p.nome)}</option>`).join('')}</select></div>
      <button class="btn btn-outline" onclick="Relatorios.periodoHoje()">Hoje</button>
      <button class="btn btn-outline" onclick="Relatorios.periodoMes()">Mês atual</button>
      <button class="btn btn-outline" onclick="Relatorios.periodoAno()">Ano</button>
    </div>

    <div id="relatorios-body">${this.renderTab()}</div>`;
  },

  atualizar(){
    document.getElementById('relatorios-body').innerHTML=this.renderTab();
  },

  periodoHoje(){
    const h=new Date().toISOString().slice(0,10);
    document.getElementById('rel-inicio').value=h;
    document.getElementById('rel-fim').value=h;
    this.atualizar();
  },

  periodoMes(){
    const hoje=new Date();
    document.getElementById('rel-inicio').value=new Date(hoje.getFullYear(),hoje.getMonth(),1).toISOString().slice(0,10);
    document.getElementById('rel-fim').value=hoje.toISOString().slice(0,10);
    this.atualizar();
  },

  periodoAno(){
    const hoje=new Date();
    document.getElementById('rel-inicio').value=`${hoje.getFullYear()}-01-01`;
    document.getElementById('rel-fim').value=hoje.toISOString().slice(0,10);
    this.atualizar();
  },

  renderTab(){
    if(this.tab==='atendimentos') return this.renderAtendimentos();
    if(this.tab==='pacientes') return this.renderPacientes();
    if(this.tab==='financeiro') return this.renderFinanceiro();
    if(this.tab==='documentos') return this.renderDocumentos();
    if(this.tab==='profissionais') return this.renderProfissionais();
    if(this.tab==='auditoria') return this.renderAuditoria();
    return this.renderGeral();
  },

  dadosBase(){
    const f=this.filtroAtual();
    const profFiltro=f.prof;

    const historico=Store.get('HISTORICO').filter(h=>
      this.dentroPeriodo(h.data||h.criadoEm,f.inicio,f.fim) &&
      (!profFiltro || String(h.medico||'')===profFiltro)
    );

    const atendimentos=Store.get('ATENDIMENTOS').filter(a=>
      this.dentroPeriodo(a.data||a.criadoEm,f.inicio,f.fim) &&
      (!profFiltro || String(a.profissional||'')===profFiltro)
    );

    const receitas=Store.get('FIN_RECEITAS').filter(r=>this.dentroPeriodo(r.vencimento||r.data||r.criadoEm,f.inicio,f.fim));
    const despesas=Store.get('FIN_DESPESAS').filter(d=>this.dentroPeriodo(d.vencimento||d.data||d.criadoEm,f.inicio,f.fim));

    const docs={
      receitas:Store.get('RECEITAS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim)),
      atestados:Store.get('ATESTADOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim)),
      laudos:Store.get('LAUDOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim)),
      pedidos:Store.get('EXAMES_PEDIDOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim)),
      anexos:Store.get('EXAMES_ARQUIVOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim))
    };

    return {f,historico,atendimentos,receitas,despesas,docs};
  },

  renderGeral(){
    const d=this.dadosBase();
    const pacientes=Store.get('PACIENTES');
    const receita=d.receitas.reduce((s,x)=>s+Number(x.valor||0),0);
    const despesa=d.despesas.reduce((s,x)=>s+Number(x.valor||0),0);
    const docsTotal=Object.values(d.docs).reduce((s,a)=>s+a.length,0);

    return `<div class="rel-kpis">
      <div class="rel-kpi"><div class="label">Atendimentos</div><div class="value">${d.historico.length}</div></div>
      <div class="rel-kpi"><div class="label">Pacientes ativos</div><div class="value">${pacientes.filter(p=>p.ativo!==false).length}</div></div>
      <div class="rel-kpi"><div class="label">Receita</div><div class="value" style="color:#047857">${this.money(receita)}</div></div>
      <div class="rel-kpi"><div class="label">Resultado</div><div class="value" style="color:${receita-despesa>=0?'#1d4ed8':'#b91c1c'}">${this.money(receita-despesa)}</div></div>
    </div>

    <div class="rel-grid">
      <div class="rel-card">
        <div class="rel-card-title">📈 Atendimentos por dia</div>
        ${this.graficoPorDia(d.historico,'data')}
      </div>
      <div class="rel-card">
        <div class="rel-card-title">📌 Resumo do período</div>
        <div class="fin-dre-row"><span>Documentos emitidos</span><strong>${docsTotal}</strong></div>
        <div class="fin-dre-row"><span>Receitas emitidas</span><strong>${d.docs.receitas.length}</strong></div>
        <div class="fin-dre-row"><span>Atestados emitidos</span><strong>${d.docs.atestados.length}</strong></div>
        <div class="fin-dre-row"><span>Pedidos de exames</span><strong>${d.docs.pedidos.length}</strong></div>
        <p style="color:#64748b;margin-top:12px;">Relatório consolidado de produção, pacientes, documentos e financeiro.</p>
      </div>
    </div>

    <div class="rel-card">
      <div class="rel-card-title">Últimos atendimentos</div>
      ${this.tabelaAtendimentos(d.historico.slice(0,15))}
    </div>`;
  },

  renderAtendimentos(){
    const d=this.dadosBase();
    const finalizados=d.atendimentos.filter(a=>a.status==='Finalizado'||a.status==='Realizado').length;
    const aguardando=d.atendimentos.filter(a=>a.status==='Aguardando').length;
    const emAt=d.atendimentos.filter(a=>a.status==='Em atendimento').length;
    return `<div class="rel-kpis">
      <div class="rel-kpi"><div class="label">Consultas registradas</div><div class="value">${d.historico.length}</div></div>
      <div class="rel-kpi"><div class="label">Finalizados</div><div class="value">${finalizados}</div></div>
      <div class="rel-kpi"><div class="label">Aguardando</div><div class="value">${aguardando}</div></div>
      <div class="rel-kpi"><div class="label">Em atendimento</div><div class="value">${emAt}</div></div>
    </div>
    <div class="rel-grid">
      <div class="rel-card"><div class="rel-card-title">Atendimentos por dia</div>${this.graficoPorDia(d.historico,'data')}</div>
      <div class="rel-card"><div class="rel-card-title">Por profissional</div>${this.tabelaAgrupada(this.agrupar(d.historico,'medico'),'Profissional')}</div>
    </div>
    <div class="rel-card"><div class="rel-card-title">Lista de atendimentos</div>${this.tabelaAtendimentos(d.historico)}</div>`;
  },

  renderPacientes(){
    const pacientes=Store.get('PACIENTES');
    const ativos=pacientes.filter(p=>p.ativo!==false);
    const inativos=pacientes.filter(p=>p.ativo===false);
    const convenios=this.agrupar(pacientes,'convenio');

    return `<div class="rel-kpis">
      <div class="rel-kpi"><div class="label">Total cadastrados</div><div class="value">${pacientes.length}</div></div>
      <div class="rel-kpi"><div class="label">Ativos</div><div class="value">${ativos.length}</div></div>
      <div class="rel-kpi"><div class="label">Inativos</div><div class="value">${inativos.length}</div></div>
      <div class="rel-kpi"><div class="label">Convênios</div><div class="value">${Object.keys(convenios).filter(Boolean).length}</div></div>
    </div>

    <div class="rel-grid">
      <div class="rel-card"><div class="rel-card-title">Pacientes por convênio</div>${this.tabelaAgrupada(convenios,'Convênio')}</div>
      <div class="rel-card"><div class="rel-card-title">Pacientes por status</div>${this.tabelaAgrupada({Ativos:ativos.length,Inativos:inativos.length},'Status')}</div>
    </div>

    <div class="rel-card"><div class="rel-card-title">Lista de pacientes</div>${this.tabelaPacientes(pacientes)}</div>`;
  },

  renderFinanceiro(){
    const d=this.dadosBase();
    const receita=d.receitas.reduce((s,x)=>s+Number(x.valor||0),0);
    const despesa=d.despesas.reduce((s,x)=>s+Number(x.valor||0),0);
    const pend=d.receitas.concat(d.despesas).filter(x=>x.status!=='Pago').reduce((s,x)=>s+Number(x.valor||0),0);
    return `<div class="rel-kpis">
      <div class="rel-kpi"><div class="label">Receitas</div><div class="value" style="color:#047857">${this.money(receita)}</div></div>
      <div class="rel-kpi"><div class="label">Despesas</div><div class="value" style="color:#b91c1c">${this.money(despesa)}</div></div>
      <div class="rel-kpi"><div class="label">Resultado</div><div class="value">${this.money(receita-despesa)}</div></div>
      <div class="rel-kpi"><div class="label">Pendentes</div><div class="value" style="color:#92400e">${this.money(pend)}</div></div>
    </div>

    <div class="rel-grid">
      <div class="rel-card"><div class="rel-card-title">Receitas x Despesas</div>${this.graficoFinanceiro(d.receitas,d.despesas)}</div>
      <div class="rel-card"><div class="rel-card-title">DRE resumido</div>
        <div class="fin-dre-row"><span>Receita Bruta</span><strong>${this.money(receita)}</strong></div>
        <div class="fin-dre-row"><span>Despesas</span><strong>-${this.money(despesa)}</strong></div>
        <div class="fin-dre-row"><span>Margem</span><strong>${receita?(((receita-despesa)/receita)*100).toFixed(1):'0.0'}%</strong></div>
        <div class="fin-dre-row total"><span>Lucro Líquido</span><strong>${this.money(receita-despesa)}</strong></div>
      </div>
    </div>

    <div class="rel-card"><div class="rel-card-title">Lançamentos financeiros</div>${this.tabelaFinanceira(d.receitas,d.despesas)}</div>`;
  },

  renderDocumentos(){
    const d=this.dadosBase();
    const total=Object.values(d.docs).reduce((s,a)=>s+a.length,0);
    return `<div class="rel-kpis">
      <div class="rel-kpi"><div class="label">Total documentos</div><div class="value">${total}</div></div>
      <div class="rel-kpi"><div class="label">Receitas</div><div class="value">${d.docs.receitas.length}</div></div>
      <div class="rel-kpi"><div class="label">Atestados</div><div class="value">${d.docs.atestados.length}</div></div>
      <div class="rel-kpi"><div class="label">Exames</div><div class="value">${d.docs.pedidos.length+d.docs.anexos.length}</div></div>
    </div>

    <div class="rel-grid">
      <div class="rel-card"><div class="rel-card-title">Documentos por tipo</div>${this.tabelaAgrupada({
        Receitas:d.docs.receitas.length,
        Atestados:d.docs.atestados.length,
        Laudos:d.docs.laudos.length,
        'Pedidos de exames':d.docs.pedidos.length,
        'Exames anexados':d.docs.anexos.length
      },'Tipo')}</div>
      <div class="rel-card"><div class="rel-card-title">Gráfico</div>${this.graficoMap({
        Receitas:d.docs.receitas.length,
        Atestados:d.docs.atestados.length,
        Laudos:d.docs.laudos.length,
        Pedidos:d.docs.pedidos.length,
        Anexos:d.docs.anexos.length
      })}</div>
    </div>
    <div class="rel-card"><div class="rel-card-title">Últimos documentos</div>${this.tabelaDocumentos(d.docs)}</div>`;
  },

  renderProfissionais(){
    const profs=Store.get('PROFISSIONAIS');
    const hist=Store.get('HISTORICO');
    const porProf=this.agrupar(hist,'medico');
    return `<div class="rel-kpis">
      <div class="rel-kpi"><div class="label">Profissionais</div><div class="value">${profs.length}</div></div>
      <div class="rel-kpi"><div class="label">Ativos</div><div class="value">${profs.filter(p=>p.ativo!==false).length}</div></div>
      <div class="rel-kpi"><div class="label">Com login</div><div class="value">${profs.filter(p=>p.login).length}</div></div>
      <div class="rel-kpi"><div class="label">Atendimentos</div><div class="value">${hist.length}</div></div>
    </div>
    <div class="rel-grid">
      <div class="rel-card"><div class="rel-card-title">Produção por profissional</div>${this.tabelaAgrupada(porProf,'Profissional')}</div>
      <div class="rel-card"><div class="rel-card-title">Profissionais cadastrados</div>${this.tabelaProfissionais(profs)}</div>
    </div>`;
  },

  renderAuditoria(){
    const logs=Store.get('AUDITORIA');
    const neg=logs.filter(l=>String(l.acao||'').includes('denied')||String(l.acao||'').includes('bloqueado'));
    const logins=logs.filter(l=>String(l.acao||'').includes('login'));
    return `<div class="rel-kpis">
      <div class="rel-kpi"><div class="label">Logs</div><div class="value">${logs.length}</div></div>
      <div class="rel-kpi"><div class="label">Logins</div><div class="value">${logins.length}</div></div>
      <div class="rel-kpi"><div class="label">Acessos bloqueados</div><div class="value">${neg.length}</div></div>
      <div class="rel-kpi"><div class="label">Usuários</div><div class="value">${Store.get('USUARIOS').length}</div></div>
    </div>
    <div class="rel-card"><div class="rel-card-title">Últimos logs</div>${this.tabelaLogs(logs.slice(-100).reverse())}</div>`;
  },

  agrupar(list,campo){
    const out={};
    list.forEach(x=>{
      const k=x[campo]||'Não informado';
      out[k]=(out[k]||0)+1;
    });
    return out;
  },

  tabelaAgrupada(map,label){
    const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);
    if(!arr.length) return `<div class="fin-empty">Sem dados.</div>`;
    return `<table class="sv-table"><thead><tr><th>${label}</th><th>Total</th></tr></thead><tbody>${arr.map(([k,v])=>`<tr><td>${Utils.esc(k||'Não informado')}</td><td><strong>${v}</strong></td></tr>`).join('')}</tbody></table>`;
  },

  graficoMap(map){
    const arr=Object.entries(map);
    const max=Math.max(1,...arr.map(x=>x[1]));
    if(!arr.some(x=>x[1]>0)) return `<div class="fin-empty">Sem dados para gráfico.</div>`;
    return `<div class="rel-chart">${arr.map(([k,v])=>`<div class="rel-bar-wrap"><div class="rel-bar" style="height:${Math.max(4,(v/max)*180)}px"></div><div class="rel-bar-label">${Utils.esc(k)}</div></div>`).join('')}</div>`;
  },

  graficoPorDia(list,campo){
    const map={};
    list.forEach(x=>{ const k=x[campo]||'Sem data'; map[k]=(map[k]||0)+1; });
    const arr=Object.entries(map).sort((a,b)=>this.dataValor(a[0])-this.dataValor(b[0])).slice(-10);
    const max=Math.max(1,...arr.map(x=>x[1]));
    if(!arr.length) return `<div class="fin-empty">Sem dados para gráfico.</div>`;
    return `<div class="rel-chart">${arr.map(([k,v])=>`<div class="rel-bar-wrap"><div class="rel-bar green" style="height:${Math.max(4,(v/max)*180)}px"></div><div class="rel-bar-label">${Utils.esc(k.slice(0,5))}</div></div>`).join('')}</div>`;
  },

  graficoFinanceiro(receitas,despesas){
    const rec=receitas.reduce((s,x)=>s+Number(x.valor||0),0);
    const des=despesas.reduce((s,x)=>s+Number(x.valor||0),0);
    const max=Math.max(1,rec,des);
    return `<div class="rel-chart">
      <div class="rel-bar-wrap"><div class="rel-bar green" style="height:${Math.max(4,(rec/max)*180)}px"></div><div class="rel-bar-label">Receitas</div></div>
      <div class="rel-bar-wrap"><div class="rel-bar red" style="height:${Math.max(4,(des/max)*180)}px"></div><div class="rel-bar-label">Despesas</div></div>
    </div>`;
  },

  tabelaAtendimentos(list){
    if(!list.length) return `<div class="fin-empty">Nenhum atendimento.</div>`;
    return `<table class="sv-table"><thead><tr><th>Data</th><th>Paciente</th><th>Profissional</th><th>Tipo</th><th>CID</th></tr></thead><tbody>${list.map(h=>{
      const p=Store.get('PACIENTES').find(x=>x.id===h.pacId||x.id===h.pacienteId)||{};
      return `<tr><td>${Utils.esc(h.data||'')}</td><td>${Utils.esc(p.nome||h.paciente||'')}</td><td>${Utils.esc(h.medico||'')}</td><td>${Utils.esc(h.tipo||h.tipoAtendimento||'Consulta')}</td><td>${Utils.esc(h.cid||'')}</td></tr>`;
    }).join('')}</tbody></table>`;
  },

  tabelaPacientes(list){
    if(!list.length) return `<div class="fin-empty">Nenhum paciente.</div>`;
    return `<table class="sv-table"><thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Convênio</th><th>Status</th></tr></thead><tbody>${list.map(p=>`<tr><td>${Utils.esc(p.nome||'')}</td><td>${Utils.esc(p.cpf||'')}</td><td>${Utils.esc(p.telefone||p.tel||'')}</td><td>${Utils.esc(p.convenio||'')}</td><td><span class="rel-status ${p.ativo!==false?'rel-ok':'rel-danger'}">${p.ativo!==false?'Ativo':'Inativo'}</span></td></tr>`).join('')}</tbody></table>`;
  },

  tabelaFinanceira(receitas,despesas){
    const list=[...receitas.map(x=>({...x,tipo:'Receita'})),...despesas.map(x=>({...x,tipo:'Despesa'}))].sort((a,b)=>this.dataValor(b.vencimento)-this.dataValor(a.vencimento));
    if(!list.length) return `<div class="fin-empty">Nenhum lançamento.</div>`;
    return `<table class="sv-table"><thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>${list.map(x=>`<tr><td><span class="rel-status ${x.tipo==='Receita'?'rel-ok':'rel-danger'}">${x.tipo}</span></td><td>${Utils.esc(x.descricao||'')}</td><td>${Utils.esc(x.categoria||'')}</td><td>${Utils.esc(x.vencimento||'')}</td><td>${this.money(x.valor)}</td><td>${Utils.esc(x.status||'Pendente')}</td></tr>`).join('')}</tbody></table>`;
  },

  tabelaDocumentos(docs){
    const all=[
      ...docs.receitas.map(x=>({...x,tipo:'Receita'})),
      ...docs.atestados.map(x=>({...x,tipo:'Atestado'})),
      ...docs.laudos.map(x=>({...x,tipo:'Laudo'})),
      ...docs.pedidos.map(x=>({...x,tipo:'Pedido de exames'})),
      ...docs.anexos.map(x=>({...x,tipo:'Exame anexado'}))
    ].sort((a,b)=>this.dataValor(b.data||b.criadoEm)-this.dataValor(a.data||a.criadoEm));
    if(!all.length) return `<div class="fin-empty">Nenhum documento.</div>`;
    return `<table class="sv-table"><thead><tr><th>Data</th><th>Tipo</th><th>Paciente</th><th>Resumo</th></tr></thead><tbody>${all.map(x=>{
      const p=Store.get('PACIENTES').find(p=>p.id===x.pacId||p.id===x.pacienteId)||{};
      return `<tr><td>${Utils.esc(x.data||'')}</td><td>${Utils.esc(x.tipo)}</td><td>${Utils.esc(p.nome||'')}</td><td>${Utils.esc(x.titulo||x.nome||x.exames||x.tipo||'')}</td></tr>`;
    }).join('')}</tbody></table>`;
  },

  tabelaProfissionais(list){
    if(!list.length) return `<div class="fin-empty">Nenhum profissional.</div>`;
    return `<table class="sv-table"><thead><tr><th>Nome</th><th>Perfil</th><th>Conselho</th><th>Status</th></tr></thead><tbody>${list.map(p=>`<tr><td>${Utils.esc(p.nome||'')}</td><td>${Utils.esc(p.perfil||'')}</td><td>${Utils.esc(p.crm||p.conselho||'')}</td><td><span class="rel-status ${p.ativo!==false?'rel-ok':'rel-danger'}">${p.ativo!==false?'Ativo':'Inativo'}</span></td></tr>`).join('')}</tbody></table>`;
  },

  tabelaLogs(list){
    if(!list.length) return `<div class="fin-empty">Nenhum log.</div>`;
    return `<table class="sv-table"><thead><tr><th>Data</th><th>Usuário</th><th>Perfil</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>${list.map(l=>`<tr><td>${Utils.esc(l.dataHora||'')}</td><td>${Utils.esc(l.usuario||'')}</td><td>${Utils.esc(l.perfil||'')}</td><td>${Utils.esc(l.acao||'')}</td><td>${Utils.esc(l.detalhe||'')}</td></tr>`).join('')}</tbody></table>`;
  },

  htmlPrint(){
    const cfg=(window.Pacientes && Pacientes._cabecalhoOriginalPrint) ? Pacientes._cabecalhoOriginalPrint('RELATÓRIO GERENCIAL') : '<h1>RELATÓRIO GERENCIAL</h1>';
    const body=document.getElementById('relatorios-body')?.innerHTML || '';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:0;font-size:12px}
        .print-header-imagem{border-bottom:1px solid #d1d5db;padding-bottom:12px;margin-bottom:18px;text-align:left;display:flex;gap:12px;align-items:flex-start}
        .print-header-imagem.sem-logo{display:block}
        .print-logo-salva{width:62px;height:62px;flex:0 0 62px;border-radius:8px;overflow:hidden}
        .print-logo-salva img{width:100%;height:100%;object-fit:contain}
        .print-header-imagem h1{font-size:20px;margin:0 0 8px;font-weight:800}
        .print-header-imagem div{font-size:10.5px;line-height:1.45;color:#374151}
        .rel-tabs,.rel-filtros,.rel-toolbar .row,button{display:none!important}
        .rel-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
        .rel-kpi,.rel-card{border:1px solid #dbe4ee;border-radius:10px;padding:10px;margin-bottom:12px;box-shadow:none}
        .rel-kpi .label{font-size:10px;color:#64748b;font-weight:bold;text-transform:uppercase}
        .rel-kpi .value{font-size:18px;font-weight:bold}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #dbe4ee;padding:6px;text-align:left}
        th{background:#f8fafc}
        .rel-chart{display:none}
        @page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}
      
        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style></head><body class="print-documento-clinico">${cfg}<h2>${Utils.esc(this.tituloTab())}</h2>${body}</body></html>`;
  },

  tituloTab(){
    const map={geral:'Relatório Geral',atendimentos:'Relatório de Atendimentos',pacientes:'Relatório de Pacientes',financeiro:'Relatório Financeiro',documentos:'Relatório de Documentos',profissionais:'Relatório de Profissionais',auditoria:'Relatório de Auditoria'};
    return map[this.tab]||'Relatório';
  },

  imprimir(){
    const html=this.htmlPrint();
    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(window.ClinicaPrintMargins?ClinicaPrintMargins.apply(html):html);
    iframe.contentWindow.document.close();
    setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){} setTimeout(()=>iframe.remove(),1500)},250);
  },

  exportarJSON(){
    const data={tipo:this.tab,filtro:this.filtroAtual(),dados:this.dadosBase(),geradoEm:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='relatorio_'+this.tab+'_'+Date.now()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    if(window.Security) Security.audit('relatorio_export','Exportou relatório '+this.tab);
  }
};



/* =========================================================
   ZERO V5.7 — Relatórios por Convênio/Plano e Tipo de Pagamento
========================================================= */
(function(){
  if(!window.Relatorios) return;

  Relatorios.conveniosDisponiveis = function(){
    return [...new Set(Store.get('PACIENTES').map(p=>p.convenio||p.plano||'').filter(Boolean))].sort();
  };

  Relatorios.pagamentosDisponiveis = function(){
    const all=[
      ...Store.get('FIN_RECEITAS').map(x=>x.forma||x.formaPagamento||''),
      ...Store.get('FIN_DESPESAS').map(x=>x.forma||x.formaPagamento||'')
    ].filter(Boolean);
    const base=['Dinheiro','Pix','Cartão de débito','Cartão de crédito','Boleto','Transferência'];
    return [...new Set([...base,...all])].sort();
  };

  Relatorios.filtroAtual = function(){
    const def=this.periodoDefault();
    const inicio=document.getElementById('rel-inicio')?.value || def.inicio;
    const fim=document.getElementById('rel-fim')?.value || def.fim;
    const prof=document.getElementById('rel-prof')?.value || '';
    const convenio=document.getElementById('rel-convenio')?.value || '';
    const pagamento=document.getElementById('rel-pagamento')?.value || '';
    return {inicio,fim,prof,convenio,pagamento};
  };

  const oldRenderV57Rel = Relatorios.render.bind(Relatorios);
  Relatorios.render = function(tab=''){
    if(tab) this.tab=tab;
    const def=this.periodoDefault();
    const convenios=this.conveniosDisponiveis();
    const pags=this.pagamentosDisponiveis();

    document.getElementById('content').innerHTML=`<div class="rel-toolbar">
      <div>
        <h2 style="margin:0;">📊 Relatórios</h2>
        <div style="color:#64748b;margin-top:4px;">Relatórios gerenciais, clínicos, financeiros e operacionais da clínica.</div>
      </div>
      <div class="row">
        <button class="btn btn-outline" onclick="Relatorios.exportarCSV()">Exportar CSV</button>
        <button class="btn btn-blue" onclick="Relatorios.imprimir()">🖨️ Imprimir relatório</button>
      </div>
    </div>

    <div class="rel-tabs">
      ${[
        ['geral','Geral'],
        ['atendimentos','Atendimentos'],
        ['pacientes','Pacientes'],
        ['financeiro','Financeiro'],
        ['documentos','Documentos'],
        ['profissionais','Profissionais'],
        ['auditoria','Auditoria']
      ].map(t=>`<button class="${this.tab===t[0]?'active':''}" onclick="Relatorios.render('${t[0]}')">${t[1]}</button>`).join('')}
    </div>

    <div class="rel-filtros">
      <div><label>Data inicial</label><input id="rel-inicio" type="date" value="${def.inicio}" onchange="Relatorios.atualizar()"></div>
      <div><label>Data final</label><input id="rel-fim" type="date" value="${def.fim}" onchange="Relatorios.atualizar()"></div>
      <div><label>Profissional</label><select id="rel-prof" onchange="Relatorios.atualizar()"><option value="">Todos</option>${Store.get('PROFISSIONAIS').map(p=>`<option>${Utils.esc(p.nome)}</option>`).join('')}</select></div>
      <div class="rel-filter-wide"><label>Convênio / Plano</label><select id="rel-convenio" onchange="Relatorios.atualizar()"><option value="">Todos</option>${convenios.map(c=>`<option>${Utils.esc(c)}</option>`).join('')}</select></div>
      <div class="rel-filter-wide"><label>Tipo de pagamento</label><select id="rel-pagamento" onchange="Relatorios.atualizar()"><option value="">Todos</option>${pags.map(p=>`<option>${Utils.esc(p)}</option>`).join('')}</select></div>
      <button class="btn btn-outline" onclick="Relatorios.periodoHoje()">Hoje</button>
      <button class="btn btn-outline" onclick="Relatorios.periodoMes()">Mês atual</button>
      <button class="btn btn-outline" onclick="Relatorios.periodoAno()">Ano</button>
    </div>

    <div id="relatorios-body">${this.renderTab()}</div>`;
  };

  Relatorios.pacientePassaConvenio = function(pacId, convenio){
    if(!convenio) return true;
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    if(!p) return false;
    return String(p.convenio||p.plano||'')===String(convenio);
  };

  Relatorios.movPassaPagamento = function(item,pagamento){
    if(!pagamento) return true;
    return String(item.forma||item.formaPagamento||'')===String(pagamento);
  };

  Relatorios.dadosBase = function(){
    const f=this.filtroAtual();
    const profFiltro=f.prof;
    const convFiltro=f.convenio;
    const pagFiltro=f.pagamento;

    const historico=Store.get('HISTORICO').filter(h=>
      this.dentroPeriodo(h.data||h.criadoEm,f.inicio,f.fim) &&
      (!profFiltro || String(h.medico||'')===profFiltro) &&
      this.pacientePassaConvenio(h.pacId||h.pacienteId,convFiltro)
    );

    const atendimentos=Store.get('ATENDIMENTOS').filter(a=>
      this.dentroPeriodo(a.data||a.criadoEm,f.inicio,f.fim) &&
      (!profFiltro || String(a.profissional||'')===profFiltro) &&
      this.pacientePassaConvenio(a.pacId||a.pacienteId,convFiltro)
    );

    const receitas=Store.get('FIN_RECEITAS').filter(r=>
      this.dentroPeriodo(r.vencimento||r.data||r.criadoEm,f.inicio,f.fim) &&
      this.movPassaPagamento(r,pagFiltro)
    );

    const despesas=Store.get('FIN_DESPESAS').filter(d=>
      this.dentroPeriodo(d.vencimento||d.data||d.criadoEm,f.inicio,f.fim) &&
      this.movPassaPagamento(d,pagFiltro)
    );

    const docs={
      receitas:Store.get('RECEITAS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim) && this.pacientePassaConvenio(x.pacId||x.pacienteId,convFiltro)),
      atestados:Store.get('ATESTADOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim) && this.pacientePassaConvenio(x.pacId||x.pacienteId,convFiltro)),
      laudos:Store.get('LAUDOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim) && this.pacientePassaConvenio(x.pacId||x.pacienteId,convFiltro)),
      pedidos:Store.get('EXAMES_PEDIDOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim) && this.pacientePassaConvenio(x.pacId||x.pacienteId,convFiltro)),
      anexos:Store.get('EXAMES_ARQUIVOS').filter(x=>this.dentroPeriodo(x.data||x.criadoEm,f.inicio,f.fim) && this.pacientePassaConvenio(x.pacId||x.pacienteId,convFiltro))
    };

    return {f,historico,atendimentos,receitas,despesas,docs};
  };

  const oldRenderFinanceiroV57 = Relatorios.renderFinanceiro.bind(Relatorios);
  Relatorios.renderFinanceiro = function(){
    const html=oldRenderFinanceiroV57();
    const f=this.filtroAtual();
    const chips=[
      f.convenio?`<span class="rel-filter-chip">Convênio/Plano: ${Utils.esc(f.convenio)}</span>`:'',
      f.pagamento?`<span class="rel-filter-chip">Pagamento: ${Utils.esc(f.pagamento)}</span>`:''
    ].filter(Boolean).join('');
    return chips ? `<div style="margin-bottom:10px;">${chips}</div>${html}` : html;
  };

  Relatorios.csvEscape = function(v){
    const s=String(v ?? '');
    return `"${s.replace(/"/g,'""')}"`;
  };

  Relatorios.exportarCSV = function(){
    const d=this.dadosBase();
    let linhas=[['Relatório',this.tituloTab()],['Início',d.f.inicio],['Fim',d.f.fim],['Profissional',d.f.prof],['Convênio/Plano',d.f.convenio],['Pagamento',d.f.pagamento],[]];

    if(this.tab==='financeiro'){
      linhas.push(['Tipo','Descrição','Categoria','Vencimento','Valor','Status','Pagamento']);
      [...d.receitas.map(x=>({...x,tipo:'Receita'})),...d.despesas.map(x=>({...x,tipo:'Despesa'}))].forEach(x=>{
        linhas.push([x.tipo,x.descricao||'',x.categoria||'',x.vencimento||'',Number(x.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2}),x.status||'',x.forma||x.formaPagamento||'']);
      });
    }else if(this.tab==='pacientes'){
      linhas.push(['Nome','CPF','Telefone','Convênio/Plano','Status']);
      Store.get('PACIENTES').filter(p=>!d.f.convenio || String(p.convenio||p.plano||'')===String(d.f.convenio)).forEach(p=>{
        linhas.push([p.nome||'',p.cpf||'',p.telefone||p.tel||'',p.convenio||p.plano||'',p.ativo!==false?'Ativo':'Inativo']);
      });
    }else{
      linhas.push(['Data','Paciente','Profissional','Tipo','CID']);
      d.historico.forEach(h=>{
        const p=Store.get('PACIENTES').find(x=>x.id===h.pacId||x.id===h.pacienteId)||{};
        linhas.push([h.data||'',p.nome||h.paciente||'',h.medico||'',h.tipo||h.tipoAtendimento||'',h.cid||'']);
      });
    }

    const csv=linhas.map(l=>l.map(v=>this.csvEscape(v)).join(';')).join('\n');
    const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='relatorio_'+this.tab+'_'+Date.now()+'.csv';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    if(window.Security) Security.audit('relatorio_export_csv','Exportou relatório CSV '+this.tab);
  };

  const oldHtmlPrintV57 = Relatorios.htmlPrint.bind(Relatorios);
  Relatorios.htmlPrint = function(){
    let html=oldHtmlPrintV57();
    const f=this.filtroAtual();
    const filtroHtml=`<div style="border:1px solid #dbe4ee;background:#f8fafc;border-radius:8px;padding:8px;margin:10px 0 14px;font-size:11px;">
      <strong>Filtros:</strong>
      Período: ${Utils.esc(f.inicio)} até ${Utils.esc(f.fim)}
      ${f.prof?` • Profissional: ${Utils.esc(f.prof)}`:''}
      ${f.convenio?` • Convênio/Plano: ${Utils.esc(f.convenio)}`:''}
      ${f.pagamento?` • Pagamento: ${Utils.esc(f.pagamento)}`:''}
    </div>`;
    html=html.replace(`<h2>${Utils.esc(this.tituloTab())}</h2>`, `<h2>${Utils.esc(this.tituloTab())}</h2>${filtroHtml}`);
    return html;
  };

  // Mantém exportarJSON só para compatibilidade, mas o botão agora usa CSV.
  Relatorios.exportarJSON = function(){
    this.exportarCSV();
  };
})();




/* =========================================================
   ZERO V5.8 — Filtros Convênio/Pagamento sempre visíveis
   e relatórios sem cortar lateral/final
========================================================= */
(function(){
  if(!window.Relatorios) return;

  Relatorios.render = function(tab=''){
    if(tab) this.tab=tab;
    const def=this.periodoDefault();
    const convenios=this.conveniosDisponiveis ? this.conveniosDisponiveis() : [...new Set(Store.get('PACIENTES').map(p=>p.convenio||p.plano||'').filter(Boolean))].sort();
    const pags=this.pagamentosDisponiveis ? this.pagamentosDisponiveis() : ['Dinheiro','Pix','Cartão de débito','Cartão de crédito','Boleto','Transferência'];

    document.getElementById('content').innerHTML=`<div class="rel-toolbar">
      <div>
        <h2 style="margin:0;">📊 Relatórios</h2>
        <div style="color:#64748b;margin-top:4px;">Relatórios gerenciais, clínicos, financeiros e operacionais da clínica.</div>
      </div>
      <div class="row">
        <button class="btn btn-outline" onclick="Relatorios.exportarCSV()">Exportar CSV</button>
        <button class="btn btn-blue" onclick="Relatorios.imprimir()">🖨️ Imprimir relatório</button>
      </div>
    </div>

    <div class="rel-tabs">
      ${[
        ['geral','Geral'],
        ['atendimentos','Atendimentos'],
        ['pacientes','Pacientes'],
        ['financeiro','Financeiro'],
        ['documentos','Documentos'],
        ['profissionais','Profissionais'],
        ['auditoria','Auditoria']
      ].map(t=>`<button class="${this.tab===t[0]?'active':''}" onclick="Relatorios.render('${t[0]}')">${t[1]}</button>`).join('')}
    </div>

    <div class="rel-filtros">
      <div><label>Data inicial</label><input id="rel-inicio" type="date" value="${def.inicio}" onchange="Relatorios.atualizar()"></div>
      <div><label>Data final</label><input id="rel-fim" type="date" value="${def.fim}" onchange="Relatorios.atualizar()"></div>
      <div><label>Profissional</label><select id="rel-prof" onchange="Relatorios.atualizar()"><option value="">Todos</option>${Store.get('PROFISSIONAIS').map(p=>`<option>${Utils.esc(p.nome)}</option>`).join('')}</select></div>
      <div><label>Convênio / Plano</label><select id="rel-convenio" onchange="Relatorios.atualizar()"><option value="">Todos</option>${convenios.map(c=>`<option>${Utils.esc(c)}</option>`).join('')}</select></div>
      <div><label>Tipo de pagamento</label><select id="rel-pagamento" onchange="Relatorios.atualizar()"><option value="">Todos</option>${pags.map(p=>`<option>${Utils.esc(p)}</option>`).join('')}</select></div>
      <div class="rel-filter-actions">
        <button class="btn btn-outline" onclick="Relatorios.periodoHoje()">Hoje</button>
        <button class="btn btn-outline" onclick="Relatorios.periodoMes()">Mês atual</button>
        <button class="btn btn-outline" onclick="Relatorios.periodoAno()">Ano</button>
      </div>
    </div>

    <div id="relatorios-body">${this.renderTab()}</div>`;
  };

  Relatorios.tabelaProfissionais = function(list){
    if(!list.length) return `<div class="fin-empty">Nenhum profissional.</div>`;
    return `<div class="rel-table-wrap"><table class="sv-table">
      <thead><tr><th>Nome</th><th>Perfil</th><th>Conselho</th><th>Status</th></tr></thead>
      <tbody>${list.map(p=>`<tr>
        <td>${Utils.esc(p.nome||'')}</td>
        <td>${Utils.esc(p.perfil||'')}</td>
        <td>${Utils.esc(p.crm||p.conselho||'')}</td>
        <td><span class="rel-status ${p.ativo!==false?'rel-ok':'rel-danger'}">${p.ativo!==false?'Ativo':'Inativo'}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  };

  Relatorios.tabelaAgrupada = function(map,label){
    const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);
    if(!arr.length) return `<div class="fin-empty">Sem dados.</div>`;
    return `<div class="rel-table-wrap"><table class="sv-table">
      <thead><tr><th>${label}</th><th>Total</th></tr></thead>
      <tbody>${arr.map(([k,v])=>`<tr><td>${Utils.esc(k||'Não informado')}</td><td><strong>${v}</strong></td></tr>`).join('')}</tbody>
    </table></div>`;
  };

  const oldAtualizarV58 = Relatorios.atualizar.bind(Relatorios);
  Relatorios.atualizar = function(){
    oldAtualizarV58();
    setTimeout(()=>{
      const body=document.getElementById('relatorios-body');
      if(body && !body.querySelector('.global-bottom-space')){
        body.insertAdjacentHTML('beforeend','<div class="global-bottom-space"></div>');
      }
    },30);
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
