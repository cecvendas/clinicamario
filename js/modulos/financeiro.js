window.Financeiro={
  tab:'dashboard',

  init(){
    if(!Store.get('FIN_CATEGORIAS').length){
      Store.set('FIN_CATEGORIAS',[
        {id:'CAT_R_CONS',tipo:'receita',nome:'Consultas'},
        {id:'CAT_R_PROC',tipo:'receita',nome:'Procedimentos'},
        {id:'CAT_R_EXA',tipo:'receita',nome:'Exames'},
        {id:'CAT_D_PESS',tipo:'despesa',nome:'Pessoal'},
        {id:'CAT_D_ADM',tipo:'despesa',nome:'Administrativo'},
        {id:'CAT_D_COM',tipo:'despesa',nome:'Comercial'},
        {id:'CAT_D_FOR',tipo:'despesa',nome:'Fornecedores'},
        {id:'CAT_D_FIN',tipo:'despesa',nome:'Financeiro'}
      ]);
    }
  },

  money(v){
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  },

  parseMoney(v){
    if(typeof v==='number') return v;
    let s=String(v||'').trim();
    if(!s) return 0;
    s=s.replace(/[R$\s.]/g,'').replace(',','.');
    return Number(s)||0;
  },

  today(){ return Utils.today(); },

  dataIsoBR(dataBR){
    if(!dataBR) return '';
    if(dataBR.includes('-')) return dataBR;
    const m=String(dataBR).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return `${m[3]}-${m[2]}-${m[1]}`;
    return dataBR;
  },

  brFromInput(v){
    if(!v) return Utils.today();
    if(v.includes('/')) return v;
    const [y,m,d]=v.split('-');
    return `${d}/${m}/${y}`;
  },

  mesKey(data){
    const iso=this.dataIsoBR(data||Utils.today());
    const d=new Date(iso+'T12:00:00');
    if(isNaN(d.getTime())) return 'Sem data';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  },

  listAll(){
    return [
      ...Store.get('FIN_RECEITAS').map(x=>({...x,tipoMov:'receita'})),
      ...Store.get('FIN_DESPESAS').map(x=>({...x,tipoMov:'despesa'}))
    ].sort((a,b)=> (Date.parse(this.dataIsoBR(b.vencimento||b.data)+'T12:00:00')||0) - (Date.parse(this.dataIsoBR(a.vencimento||a.data)+'T12:00:00')||0));
  },

  status(item){
    if(item.status==='Pago') return 'Pago';
    const venc=this.dataIsoBR(item.vencimento||item.data);
    const hoje=this.dataIsoBR(Utils.today());
    return venc && venc < hoje ? 'Vencido' : 'Pendente';
  },

  render(tab=''){
    this.init();
    if(tab) this.tab=tab;

    document.getElementById('content').innerHTML=`<div class="fin-toolbar">
      <div>
        <h2 style="margin:0;">💰 Financeiro</h2>
        <div style="color:#64748b;margin-top:4px;">Controle financeiro da clínica: receitas, despesas, caixa, DRE e comissões.</div>
      </div>
      <div class="row">
        <button class="btn btn-green" onclick="Financeiro.modalReceita()">+ Receita</button>
        <button class="btn btn-red" onclick="Financeiro.modalDespesa()">+ Despesa</button>
        <button class="btn btn-outline" onclick="Financeiro.exportar()">Exportar</button>
      </div>
    </div>

    <div class="fin-tabs">
      ${[
        ['dashboard','Dashboard'],
        ['receitas','Receitas'],
        ['despesas','Despesas'],
        ['caixa','Caixa'],
        ['dre','DRE'],
        ['comissoes','Comissões'],
        ['categorias','Categorias']
      ].map(t=>`<button class="${this.tab===t[0]?'active':''}" onclick="Financeiro.render('${t[0]}')">${t[1]}</button>`).join('')}
    </div>

    <div id="financeiro-body">${this.renderTab()}</div>`;
  },

  renderTab(){
    if(this.tab==='receitas') return this.renderLista('receita');
    if(this.tab==='despesas') return this.renderLista('despesa');
    if(this.tab==='caixa') return this.renderCaixa();
    if(this.tab==='dre') return this.renderDRE();
    if(this.tab==='comissoes') return this.renderComissoes();
    if(this.tab==='categorias') return this.renderCategorias();
    return this.renderDashboard();
  },

  resumo(){
    const movs=this.listAll();
    const receita=movs.filter(x=>x.tipoMov==='receita').reduce((s,x)=>s+Number(x.valor||0),0);
    const despesa=movs.filter(x=>x.tipoMov==='despesa').reduce((s,x)=>s+Number(x.valor||0),0);
    const recebido=movs.filter(x=>x.tipoMov==='receita'&&this.status(x)==='Pago').reduce((s,x)=>s+Number(x.valor||0),0);
    const pago=movs.filter(x=>x.tipoMov==='despesa'&&this.status(x)==='Pago').reduce((s,x)=>s+Number(x.valor||0),0);
    const pend=movs.filter(x=>this.status(x)!=='Pago').reduce((s,x)=>s+Number(x.valor||0),0);
    return {receita,despesa,saldo:receita-despesa,caixa:recebido-pago,pend};
  },

  renderDashboard(){
    const r=this.resumo();
    const movs=this.listAll();
    const ult=movs.slice(0,8);

    return `<div class="fin-kpis">
      <div class="fin-kpi receita"><div class="label">Receitas</div><div class="value">${this.money(r.receita)}</div></div>
      <div class="fin-kpi despesa"><div class="label">Despesas</div><div class="value">${this.money(r.despesa)}</div></div>
      <div class="fin-kpi saldo"><div class="label">Resultado</div><div class="value">${this.money(r.saldo)}</div></div>
      <div class="fin-kpi pendente"><div class="label">Pendentes</div><div class="value">${this.money(r.pend)}</div></div>
    </div>

    <div class="fin-grid">
      <div class="fin-card">
        <div class="fin-card-title">📊 Receitas x Despesas por mês</div>
        ${this.graficoMensal()}
      </div>
      <div class="fin-card">
        <div class="fin-card-title">📌 Resumo inteligente</div>
        <div class="fin-dre-row"><span>Caixa disponível</span><strong>${this.money(r.caixa)}</strong></div>
        <div class="fin-dre-row"><span>Margem</span><strong>${r.receita?((r.saldo/r.receita)*100).toFixed(1):'0.0'}%</strong></div>
        <div class="fin-dre-row"><span>Status</span><strong>${r.saldo>=0?'Saudável':'Atenção'}</strong></div>
        <p style="color:#64748b;margin-top:12px;">${r.saldo>=0?'Receitas acima das despesas no período.':'Despesas acima das receitas. Verifique categorias e vencimentos.'}</p>
      </div>
    </div>

    <div class="fin-card" style="margin-top:16px;">
      <div class="fin-card-title">Últimos lançamentos</div>
      ${this.tabelaMovs(ult)}
    </div>`;
  },

  graficoMensal(){
    const movs=this.listAll();
    const meses=[...new Set(movs.map(m=>this.mesKey(m.vencimento||m.data)))].slice(0,6).reverse();
    const data=meses.map(m=>{
      const rec=movs.filter(x=>this.mesKey(x.vencimento||x.data)===m && x.tipoMov==='receita').reduce((s,x)=>s+x.valor,0);
      const des=movs.filter(x=>this.mesKey(x.vencimento||x.data)===m && x.tipoMov==='despesa').reduce((s,x)=>s+x.valor,0);
      return {m,rec,des};
    });
    const max=Math.max(1,...data.flatMap(x=>[x.rec,x.des]));
    if(!data.length) return `<div class="fin-empty">Sem dados para gráfico.</div>`;
    return `<div class="fin-chart">
      ${data.map(x=>`<div class="fin-bar-wrap">
        <div class="fin-bar" title="Receita ${this.money(x.rec)}" style="height:${Math.max(4,(x.rec/max)*160)}px"></div>
        <div class="fin-bar despesa" title="Despesa ${this.money(x.des)}" style="height:${Math.max(4,(x.des/max)*160)}px"></div>
        <div class="fin-bar-label">${x.m}</div>
      </div>`).join('')}
    </div>`;
  },

  renderLista(tipo){
    const title=tipo==='receita'?'Receitas':'Despesas';
    const list=Store.get(tipo==='receita'?'FIN_RECEITAS':'FIN_DESPESAS').sort((a,b)=>this._dateVal(b.vencimento)-this._dateVal(a.vencimento));
    return `<div class="fin-card">
      <div class="fin-card-title">
        <span>${tipo==='receita'?'🟢':'🔴'} ${title}</span>
        <button class="btn ${tipo==='receita'?'btn-green':'btn-red'}" onclick="Financeiro.${tipo==='receita'?'modalReceita':'modalDespesa'}()">+ ${tipo==='receita'?'Receita':'Despesa'}</button>
      </div>
      <div class="fin-filter-row">
        <input id="fin-busca-${tipo}" placeholder="Buscar..." oninput="Financeiro.filtrarTabela('${tipo}')">
        <select id="fin-status-${tipo}" onchange="Financeiro.filtrarTabela('${tipo}')">
          <option value="">Todos status</option><option>Pago</option><option>Pendente</option><option>Vencido</option>
        </select>
      </div>
      <div id="fin-list-${tipo}">${this.tabelaMovs(list,tipo)}</div>
    </div>`;
  },

  filtrarTabela(tipo){
    const key=tipo==='receita'?'FIN_RECEITAS':'FIN_DESPESAS';
    const busca=Utils.norm(document.getElementById('fin-busca-'+tipo)?.value||'');
    const st=document.getElementById('fin-status-'+tipo)?.value||'';
    const list=Store.get(key).filter(x=>{
      const hay=Utils.norm([x.descricao,x.categoria,x.cliente,x.fornecedor,x.obs].join(' '));
      return (!busca||hay.includes(busca)) && (!st||this.status(x)===st);
    });
    document.getElementById('fin-list-'+tipo).innerHTML=this.tabelaMovs(list,tipo);
  },

  tabelaMovs(list,tipoForce=''){
    if(!list.length) return `<div class="fin-empty">Nenhum lançamento.</div>`;
    return `<div class="sv-table-wrap"><table class="sv-table">
      <thead><tr><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(x=>{
        const tipo=tipoForce || x.tipoMov || (Store.get('FIN_RECEITAS').find(r=>r.id===x.id)?'receita':'despesa');
        const st=this.status(x);
        return `<tr>
          <td><strong>${Utils.esc(x.descricao||'')}</strong><div class="doc-sub">${Utils.esc(x.cliente||x.fornecedor||x.obs||'')}</div></td>
          <td>${Utils.esc(x.categoria||'')}</td>
          <td>${Utils.esc(x.vencimento||x.data||'')}</td>
          <td><strong>${this.money(x.valor)}</strong></td>
          <td><span class="fin-status ${st==='Pago'?'fin-pago':st==='Vencido'?'fin-vencido':'fin-pendente'}">${st}</span></td>
          <td><div class="row right">
            ${st!=='Pago'?`<button class="btn btn-sm btn-green" onclick="Financeiro.baixar('${tipo}','${x.id}')">Baixar</button>`:''}
            <button class="btn btn-sm btn-outline" onclick="Financeiro.${tipo==='receita'?'modalReceita':'modalDespesa'}('${x.id}')">Editar</button>
            <button class="btn btn-sm btn-red" onclick="Financeiro.remover('${tipo}','${x.id}')">Excluir</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  },

  _dateVal(d){ return Date.parse(this.dataIsoBR(d)+'T12:00:00')||0; },

  categorias(tipo){
    return Store.get('FIN_CATEGORIAS').filter(c=>c.tipo===tipo);
  },

  modalReceita(id=''){
    const item=Store.get('FIN_RECEITAS').find(x=>x.id===id)||{};
    Modal.open(id?'Editar Receita':'Nova Receita',`
      <div class="form-grid doc-modal-original">
        <div class="f-col f-full"><label>Descrição</label><input id="fin-desc" value="${Utils.esc(item.descricao||'')}"></div>
        <div class="f-col"><label>Cliente/Paciente</label><input id="fin-cliente" value="${Utils.esc(item.cliente||'')}"></div>
        <div class="f-col"><label>Categoria</label><select id="fin-cat">${this.categorias('receita').map(c=>`<option>${Utils.esc(c.nome)}</option>`).join('')}</select></div>
        <div class="f-col"><label>Valor</label><input id="fin-valor" value="${item.valor?this.money(item.valor):''}" placeholder="R$ 0,00"></div>
        <div class="f-col"><label>Vencimento</label><input id="fin-venc" type="date" value="${this.dataIsoBR(item.vencimento||Utils.today())}"></div>
        <div class="f-col"><label>Status</label><select id="fin-status"><option>Pendente</option><option>Pago</option></select></div>
        <div class="f-col"><label>Forma de pagamento</label><select id="fin-forma"><option>Dinheiro</option><option>Pix</option><option>Cartão de débito</option><option>Cartão de crédito</option><option>Boleto</option><option>Transferência</option></select></div>
        <div class="f-col"><label>Parcelas</label><input id="fin-parcelas" type="number" min="1" value="${item.parcelas||1}"></div>
        <div class="f-col f-full"><label>Observações</label><textarea id="fin-obs">${Utils.esc(item.obs||'')}</textarea></div>
      </div>
    `,`<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button><button class="btn btn-green" onclick="Financeiro.saveReceita('${id}')">Salvar Receita</button>`,'lg');
    setTimeout(()=>{document.getElementById('fin-cat').value=item.categoria||'Consultas';document.getElementById('fin-status').value=item.status||'Pendente';document.getElementById('fin-forma').value=item.forma||'Dinheiro';},30);
  },

  saveReceita(id=''){
    const parcelas=Math.max(1,Number(document.getElementById('fin-parcelas').value||1));
    const base={
      id:id||Utils.id('REC'),
      descricao:document.getElementById('fin-desc').value.trim(),
      cliente:document.getElementById('fin-cliente').value.trim(),
      categoria:document.getElementById('fin-cat').value,
      valor:this.parseMoney(document.getElementById('fin-valor').value),
      vencimento:this.brFromInput(document.getElementById('fin-venc').value),
      status:document.getElementById('fin-status').value,
      forma:document.getElementById('fin-forma').value,
      parcelas,
      obs:document.getElementById('fin-obs').value,
      criadoEm:new Date().toISOString()
    };
    if(!base.descricao||!base.valor) return Utils.toast('Preencha descrição e valor.');
    if(id||parcelas===1){
      Store.upsert('FIN_RECEITAS',base);
    }else{
      const valorParcela=base.valor/parcelas;
      for(let i=1;i<=parcelas;i++){
        const d=new Date(this.dataIsoBR(base.vencimento)+'T12:00:00');
        d.setMonth(d.getMonth()+i-1);
        Store.upsert('FIN_RECEITAS',{...base,id:Utils.id('REC'),descricao:`${base.descricao} (${i}/${parcelas})`,valor:valorParcela,vencimento:this.brFromInput(d.toISOString().slice(0,10)),parcela:i});
      }
    }
    Modal.close(); this.render('receitas'); Utils.toast('Receita salva.');
  },

  modalDespesa(id=''){
    const item=Store.get('FIN_DESPESAS').find(x=>x.id===id)||{};
    Modal.open(id?'Editar Despesa':'Nova Despesa',`
      <div class="form-grid doc-modal-original">
        <div class="f-col f-full"><label>Descrição</label><input id="fin-desc" value="${Utils.esc(item.descricao||'')}"></div>
        <div class="f-col"><label>Fornecedor</label><input id="fin-fornecedor" value="${Utils.esc(item.fornecedor||'')}"></div>
        <div class="f-col"><label>Categoria</label><select id="fin-cat">${this.categorias('despesa').map(c=>`<option>${Utils.esc(c.nome)}</option>`).join('')}</select></div>
        <div class="f-col"><label>Valor</label><input id="fin-valor" value="${item.valor?this.money(item.valor):''}" placeholder="R$ 0,00"></div>
        <div class="f-col"><label>Vencimento</label><input id="fin-venc" type="date" value="${this.dataIsoBR(item.vencimento||Utils.today())}"></div>
        <div class="f-col"><label>Status</label><select id="fin-status"><option>Pendente</option><option>Pago</option></select></div>
        <div class="f-col"><label>Centro de custo</label><input id="fin-centro" value="${Utils.esc(item.centro||'')}"></div>
        <div class="f-col"><label>Parcelas</label><input id="fin-parcelas" type="number" min="1" value="${item.parcelas||1}"></div>
        <div class="f-col f-full"><label>Observações</label><textarea id="fin-obs">${Utils.esc(item.obs||'')}</textarea></div>
      </div>
    `,`<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button><button class="btn btn-red" onclick="Financeiro.saveDespesa('${id}')">Salvar Despesa</button>`,'lg');
    setTimeout(()=>{document.getElementById('fin-cat').value=item.categoria||'Administrativo';document.getElementById('fin-status').value=item.status||'Pendente';},30);
  },

  saveDespesa(id=''){
    const parcelas=Math.max(1,Number(document.getElementById('fin-parcelas').value||1));
    const base={
      id:id||Utils.id('DES'),
      descricao:document.getElementById('fin-desc').value.trim(),
      fornecedor:document.getElementById('fin-fornecedor').value.trim(),
      categoria:document.getElementById('fin-cat').value,
      valor:this.parseMoney(document.getElementById('fin-valor').value),
      vencimento:this.brFromInput(document.getElementById('fin-venc').value),
      status:document.getElementById('fin-status').value,
      centro:document.getElementById('fin-centro').value.trim(),
      parcelas,
      obs:document.getElementById('fin-obs').value,
      criadoEm:new Date().toISOString()
    };
    if(!base.descricao||!base.valor) return Utils.toast('Preencha descrição e valor.');
    if(id||parcelas===1){
      Store.upsert('FIN_DESPESAS',base);
    }else{
      const valorParcela=base.valor/parcelas;
      for(let i=1;i<=parcelas;i++){
        const d=new Date(this.dataIsoBR(base.vencimento)+'T12:00:00');
        d.setMonth(d.getMonth()+i-1);
        Store.upsert('FIN_DESPESAS',{...base,id:Utils.id('DES'),descricao:`${base.descricao} (${i}/${parcelas})`,valor:valorParcela,vencimento:this.brFromInput(d.toISOString().slice(0,10)),parcela:i});
      }
    }
    Modal.close(); this.render('despesas'); Utils.toast('Despesa salva.');
  },

  baixar(tipo,id){
    const key=tipo==='receita'?'FIN_RECEITAS':'FIN_DESPESAS';
    const item=Store.get(key).find(x=>x.id===id);
    if(!item) return;
    item.status='Pago';
    item.dataPagamento=Utils.today();
    Store.upsert(key,item);
    Store.upsert('FIN_CAIXA',{id:Utils.id('CX'),tipo,descricao:item.descricao,valor:item.valor,data:Utils.today(),origemId:id,criadoEm:new Date().toISOString()});
    Utils.toast('Baixado no caixa.');
    this.render(this.tab);
  },

  remover(tipo,id){
    if(!confirm('Excluir lançamento?')) return;
    const key=tipo==='receita'?'FIN_RECEITAS':'FIN_DESPESAS';
    Store.set(key,Store.get(key).filter(x=>x.id!==id));
    this.render(this.tab);
  },

  renderCaixa(){
    const list=Store.get('FIN_CAIXA').sort((a,b)=>this._dateVal(b.data)-this._dateVal(a.data));
    const saldo=list.reduce((s,x)=>s+(x.tipo==='receita'?x.valor:-x.valor),0);
    return `<div class="fin-kpis"><div class="fin-kpi saldo"><div class="label">Saldo de Caixa</div><div class="value">${this.money(saldo)}</div></div></div>
    <div class="fin-card"><div class="fin-card-title">Movimentação do caixa</div>${list.length?`<table class="sv-table"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${list.map(x=>`<tr><td>${Utils.esc(x.data)}</td><td><span class="fin-status ${x.tipo==='receita'?'fin-receita':'fin-despesa'}">${x.tipo}</span></td><td>${Utils.esc(x.descricao)}</td><td>${this.money(x.valor)}</td></tr>`).join('')}</tbody></table>`:`<div class="fin-empty">Nenhuma movimentação no caixa.</div>`}</div>`;
  },

  renderDRE(){
    const movs=this.listAll();
    const receita=movs.filter(x=>x.tipoMov==='receita').reduce((s,x)=>s+x.valor,0);
    const despesas=movs.filter(x=>x.tipoMov==='despesa').reduce((s,x)=>s+x.valor,0);
    const pessoal=movs.filter(x=>x.tipoMov==='despesa'&&x.categoria==='Pessoal').reduce((s,x)=>s+x.valor,0);
    const adm=movs.filter(x=>x.tipoMov==='despesa'&&x.categoria==='Administrativo').reduce((s,x)=>s+x.valor,0);
    const comercial=movs.filter(x=>x.tipoMov==='despesa'&&x.categoria==='Comercial').reduce((s,x)=>s+x.valor,0);
    const financeiro=movs.filter(x=>x.tipoMov==='despesa'&&x.categoria==='Financeiro').reduce((s,x)=>s+x.valor,0);
    const lucro=receita-despesas;
    return `<div class="fin-card">
      <div class="fin-card-title">DRE — Demonstrativo de Resultado</div>
      <div class="fin-dre-row"><span>Receita Bruta</span><strong class="pos">${this.money(receita)}</strong></div>
      <div class="fin-dre-row"><span>Receita Líquida</span><strong class="pos">${this.money(receita)}</strong></div>
      <div class="fin-dre-row"><span>Margem Bruta</span><strong>${receita?((lucro/receita)*100).toFixed(1):'0.0'}%</strong></div>
      <div class="fin-dre-row"><span>Pessoal</span><strong class="neg">-${this.money(pessoal)}</strong></div>
      <div class="fin-dre-row"><span>Administrativo</span><strong class="neg">-${this.money(adm)}</strong></div>
      <div class="fin-dre-row"><span>Comercial</span><strong class="neg">-${this.money(comercial)}</strong></div>
      <div class="fin-dre-row"><span>Financeiro</span><strong class="neg">-${this.money(financeiro)}</strong></div>
      <div class="fin-dre-row total"><span>Lucro Líquido</span><strong class="${lucro>=0?'pos':'neg'}">${this.money(lucro)}</strong></div>
    </div>`;
  },

  renderComissoes(){
    const rec=Store.get('FIN_RECEITAS');
    const coms=Store.get('FIN_COMISSOES');
    const total=coms.reduce((s,x)=>s+x.valor,0);
    return `<div class="fin-card">
      <div class="fin-card-title"><span>Comissões</span><button class="btn btn-blue" onclick="Financeiro.modalComissao()">+ Comissão</button></div>
      <div class="fin-kpis"><div class="fin-kpi"><div class="label">Total de Comissões</div><div class="value">${this.money(total)}</div></div></div>
      ${coms.length?`<table class="sv-table"><thead><tr><th>Vendedor/Profissional</th><th>Base</th><th>%</th><th>Valor</th><th>Data</th></tr></thead><tbody>${coms.map(c=>`<tr><td>${Utils.esc(c.profissional)}</td><td>${this.money(c.base)}</td><td>${c.percentual}%</td><td>${this.money(c.valor)}</td><td>${Utils.esc(c.data)}</td></tr>`).join('')}</tbody></table>`:`<div class="fin-empty">Nenhuma comissão cadastrada.</div>`}
    </div>`;
  },

  modalComissao(){
    const profs=Store.get('PROFISSIONAIS').filter(p=>p.ativo!==false);
    Modal.open('Nova Comissão',`
      <div class="form-grid doc-modal-original">
        <div class="f-col"><label>Profissional</label><select id="com-prof">${profs.map(p=>`<option>${Utils.esc(p.nome)}</option>`).join('')}</select></div>
        <div class="f-col"><label>Base de cálculo</label><input id="com-base" placeholder="R$ 0,00"></div>
        <div class="f-col"><label>Percentual %</label><input id="com-perc" type="number" value="10"></div>
        <div class="f-col"><label>Data</label><input id="com-data" type="date" value="${this.dataIsoBR(Utils.today())}"></div>
      </div>
    `,`<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button><button class="btn btn-blue" onclick="Financeiro.saveComissao()">Salvar</button>`);
  },

  saveComissao(){
    const base=this.parseMoney(document.getElementById('com-base').value);
    const perc=Number(document.getElementById('com-perc').value||0);
    Store.upsert('FIN_COMISSOES',{id:Utils.id('COM'),profissional:document.getElementById('com-prof').value,base,percentual:perc,valor:base*(perc/100),data:this.brFromInput(document.getElementById('com-data').value),criadoEm:new Date().toISOString()});
    Modal.close(); this.render('comissoes');
  },

  renderCategorias(){
    const cats=Store.get('FIN_CATEGORIAS');
    return `<div class="fin-card">
      <div class="fin-card-title"><span>Categorias</span><button class="btn btn-blue" onclick="Financeiro.modalCategoria()">+ Categoria</button></div>
      <table class="sv-table"><thead><tr><th>Nome</th><th>Tipo</th><th></th></tr></thead><tbody>${cats.map(c=>`<tr><td>${Utils.esc(c.nome)}</td><td><span class="fin-status ${c.tipo==='receita'?'fin-receita':'fin-despesa'}">${c.tipo}</span></td><td><button class="btn btn-sm btn-red" onclick="Financeiro.removeCategoria('${c.id}')">Excluir</button></td></tr>`).join('')}</tbody></table>
    </div>`;
  },

  modalCategoria(){
    Modal.open('Nova Categoria',`<label>Nome</label><input id="cat-nome"><label>Tipo</label><select id="cat-tipo"><option value="receita">Receita</option><option value="despesa">Despesa</option></select>`,`<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button><button class="btn btn-blue" onclick="Financeiro.saveCategoria()">Salvar</button>`);
  },

  saveCategoria(){
    const nome=document.getElementById('cat-nome').value.trim();
    if(!nome) return;
    Store.upsert('FIN_CATEGORIAS',{id:Utils.id('CAT'),nome,tipo:document.getElementById('cat-tipo').value});
    Modal.close(); this.render('categorias');
  },

  removeCategoria(id){
    Store.set('FIN_CATEGORIAS',Store.get('FIN_CATEGORIAS').filter(c=>c.id!==id));
    this.render('categorias');
  },

  exportar(){
    const data={
      receitas:Store.get('FIN_RECEITAS'),
      despesas:Store.get('FIN_DESPESAS'),
      caixa:Store.get('FIN_CAIXA'),
      categorias:Store.get('FIN_CATEGORIAS'),
      comissoes:Store.get('FIN_COMISSOES')
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='financeiro_clinica_mario_'+Date.now()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
};



/* =========================================================
   ZERO V5.3 — Botões de ação no final da linha/tabela
========================================================= */
(function(){
  if(!window.Financeiro) return;

  Financeiro.tabelaMovs = function(list,tipoForce=''){
    if(!list.length) return `<div class="fin-empty">Nenhum lançamento.</div>`;

    return `<div class="sv-table-wrap"><table class="sv-table">
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Vencimento</th>
          <th>Valor</th>
          <th>Status</th>
          <th class="fin-actions-col">Ações</th>
        </tr>
      </thead>
      <tbody>${list.map(x=>{
        const tipo=tipoForce || x.tipoMov || (Store.get('FIN_RECEITAS').find(r=>r.id===x.id)?'receita':'despesa');
        const st=this.status(x);
        return `<tr>
          <td><strong>${Utils.esc(x.descricao||'')}</strong><div class="doc-sub">${Utils.esc(x.cliente||x.fornecedor||x.obs||'')}</div></td>
          <td>${Utils.esc(x.categoria||'')}</td>
          <td>${Utils.esc(x.vencimento||x.data||'')}</td>
          <td><strong>${this.money(x.valor)}</strong></td>
          <td><span class="fin-status ${st==='Pago'?'fin-pago':st==='Vencido'?'fin-vencido':'fin-pendente'}">${st}</span></td>
          <td class="fin-actions-col">
            <div class="fin-actions">
              ${st!=='Pago'?`<button class="btn btn-sm btn-green" onclick="Financeiro.baixar('${tipo}','${x.id}')">Baixar</button>`:''}
              <button class="btn btn-sm btn-outline" onclick="Financeiro.${tipo==='receita'?'modalReceita':'modalDespesa'}('${x.id}')">Editar</button>
              <button class="btn btn-sm btn-red" onclick="Financeiro.remover('${tipo}','${x.id}')">Excluir</button>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  };

  Financeiro.renderCategorias = function(){
    const cats=Store.get('FIN_CATEGORIAS');

    return `<div class="fin-card">
      <div class="fin-card-title">
        <span>Categorias</span>
        <button class="btn btn-blue" onclick="Financeiro.modalCategoria()">+ Categoria</button>
      </div>

      <table class="sv-table fin-categorias-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th class="fin-actions-col">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${cats.map(c=>`<tr>
            <td>${Utils.esc(c.nome)}</td>
            <td><span class="fin-status ${c.tipo==='receita'?'fin-receita':'fin-despesa'}">${c.tipo}</span></td>
            <td class="fin-actions-col">
              <div class="fin-actions">
                <button class="btn btn-sm btn-outline" onclick="Financeiro.modalCategoriaEditar('${c.id}')">Editar</button>
                <button class="btn btn-sm btn-red" onclick="Financeiro.removeCategoria('${c.id}')">Excluir</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  };

  Financeiro.modalCategoriaEditar = function(id){
    const c=Store.get('FIN_CATEGORIAS').find(x=>x.id===id);
    if(!c) return Utils.toast('Categoria não encontrada.');

    Modal.open('Editar Categoria',`
      <label>Nome</label>
      <input id="cat-nome" value="${Utils.esc(c.nome||'')}">
      <label>Tipo</label>
      <select id="cat-tipo">
        <option value="receita">Receita</option>
        <option value="despesa">Despesa</option>
      </select>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-blue" onclick="Financeiro.saveCategoria('${id}')">Salvar</button>
    `);

    setTimeout(()=>{document.getElementById('cat-tipo').value=c.tipo||'receita';},30);
  };

  Financeiro.saveCategoria = function(id=''){
    const nome=document.getElementById('cat-nome').value.trim();
    if(!nome) return Utils.toast('Informe o nome da categoria.');

    const item={
      id:id||Utils.id('CAT'),
      nome,
      tipo:document.getElementById('cat-tipo').value
    };

    Store.upsert('FIN_CATEGORIAS',item);
    Modal.close();
    this.render('categorias');
  };
})();




/* =========================================================
   ZERO V5.4 — Ajuste de final/rodapé do Financeiro
========================================================= */
(function(){
  if(!window.Financeiro || Financeiro.__finalVisivelV54) return;
  Financeiro.__finalVisivelV54=true;

  const oldRenderV54 = Financeiro.render.bind(Financeiro);
  Financeiro.render = function(tab=''){
    oldRenderV54(tab);

    setTimeout(()=>{
      const body=document.getElementById('financeiro-body');
      if(body && !body.querySelector('.fin-dashboard-bottom-space')){
        body.insertAdjacentHTML('beforeend','<div class="fin-dashboard-bottom-space"></div>');
      }

      const main=document.querySelector('main,.main,.content-wrap,#main,.app-content');
      if(main){
        main.style.scrollPaddingBottom='120px';
      }
    },40);
  };
})();




/* =========================================================
   ZERO V5.7 — Exportar Financeiro em PDF ou CSV
========================================================= */
(function(){
  if(!window.Financeiro) return;

  const oldRenderV57 = Financeiro.render.bind(Financeiro);
  Financeiro.render = function(tab=''){
    oldRenderV57(tab);

    setTimeout(()=>{
      document.querySelectorAll('button').forEach(btn=>{
        const txt=(btn.innerText||'').trim().toLowerCase();
        const oc=String(btn.getAttribute('onclick')||'');
        if(txt==='exportar' && oc.includes('Financeiro.exportar')){
          btn.outerHTML=`<div class="export-menu-inline">
            <button class="btn btn-outline" onclick="Financeiro.exportarCSV()">Exportar CSV</button>
            <button class="btn btn-blue" onclick="Financeiro.exportarPDF()">Exportar PDF</button>
          </div>`;
        }
      });
    },40);
  };

  Financeiro.csvEscape = function(v){
    const s=String(v ?? '');
    return `"${s.replace(/"/g,'""')}"`;
  };

  Financeiro.exportarCSV = function(){
    const movs=this.listAll();
    const linhas=[
      ['Tipo','Descrição','Categoria','Cliente/Fornecedor','Vencimento','Valor','Status','Forma de pagamento','Observações']
    ];

    movs.forEach(x=>{
      linhas.push([
        x.tipoMov==='receita'?'Receita':'Despesa',
        x.descricao||'',
        x.categoria||'',
        x.cliente||x.fornecedor||'',
        x.vencimento||x.data||'',
        Number(x.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
        this.status(x),
        x.forma||x.formaPagamento||'',
        x.obs||''
      ]);
    });

    const csv=linhas.map(l=>l.map(v=>this.csvEscape(v)).join(';')).join('\n');
    const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='financeiro_clinica_mario_'+Date.now()+'.csv';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    if(window.Security) Security.audit('financeiro_export_csv','Exportou financeiro CSV');
  };

  Financeiro.htmlRelatorioPDF = function(){
    const movs=this.listAll();
    const r=this.resumo();
    const cab=(window.Pacientes && Pacientes._cabecalhoOriginalPrint) ? Pacientes._cabecalhoOriginalPrint('RELATÓRIO FINANCEIRO') : '<h1>RELATÓRIO FINANCEIRO</h1>';

    return `<!doctype html><html><head><meta charset="utf-8"><title>Relatório Financeiro</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:0;font-size:12px}
      .print-header-imagem{border-bottom:1px solid #d1d5db;padding-bottom:12px;margin-bottom:18px;text-align:left;display:flex;gap:12px;align-items:flex-start}
      .print-header-imagem.sem-logo{display:block}
      .print-logo-salva{width:62px;height:62px;flex:0 0 62px;border-radius:8px;overflow:hidden}
      .print-logo-salva img{width:100%;height:100%;object-fit:contain}
      .print-header-imagem h1{font-size:20px;margin:0 0 8px;font-weight:800}
      .print-header-imagem div{font-size:10.5px;line-height:1.45;color:#374151}
      h2{font-size:16px;margin:16px 0 10px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
      .kpi{border:1px solid #dbe4ee;border-radius:8px;padding:10px}
      .kpi span{display:block;color:#64748b;font-size:10px;font-weight:bold;text-transform:uppercase}
      .kpi strong{display:block;font-size:16px;margin-top:5px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #dbe4ee;padding:6px;text-align:left;vertical-align:top}
      th{background:#f8fafc}
      .pos{color:#047857}.neg{color:#b91c1c}
      @page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}
    
        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style></head><body class="print-documento-clinico">
      ${cab}
      <h2>Resumo financeiro</h2>
      <div class="kpis">
        <div class="kpi"><span>Receitas</span><strong class="pos">${this.money(r.receita)}</strong></div>
        <div class="kpi"><span>Despesas</span><strong class="neg">${this.money(r.despesa)}</strong></div>
        <div class="kpi"><span>Resultado</span><strong>${this.money(r.saldo)}</strong></div>
        <div class="kpi"><span>Pendentes</span><strong>${this.money(r.pend)}</strong></div>
      </div>
      <h2>Lançamentos</h2>
      <table>
        <thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th></tr></thead>
        <tbody>${movs.map(x=>`<tr>
          <td>${x.tipoMov==='receita'?'Receita':'Despesa'}</td>
          <td>${Utils.esc(x.descricao||'')}</td>
          <td>${Utils.esc(x.categoria||'')}</td>
          <td>${Utils.esc(x.vencimento||x.data||'')}</td>
          <td>${this.money(x.valor)}</td>
          <td>${this.status(x)}</td>
          <td>${Utils.esc(x.forma||x.formaPagamento||'')}</td>
        </tr>`).join('')}</tbody>
      </table>
    </body></html>`;
  };

  Financeiro.exportarPDF = function(){
    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(this.htmlRelatorioPDF());
    iframe.contentWindow.document.close();
    setTimeout(()=>{
      try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){}
      setTimeout(()=>iframe.remove(),1500);
    },250);
    if(window.Security) Security.audit('financeiro_export_pdf','Exportou financeiro PDF/impressão');
  };

  // Mantém compatibilidade com botão antigo, mas agora abre PDF em vez de JSON.
  Financeiro.exportar = function(){
    this.exportarPDF();
  };
})();




/* =========================================================
   ZERO V7.3 — Financeiro sem piscar botões
   Correção:
   versões anteriores trocavam o botão Exportar depois da tela abrir
   usando setTimeout. Isso fazia os botões piscarem ao mudar de aba/menu.
   Agora o toolbar já nasce pronto, sem substituição posterior.
========================================================= */
(function(){
  if(!window.Financeiro) return;

  Financeiro.render = function(tab=''){
    this.init();
    if(tab) this.tab=tab;

    const body=document.getElementById('content');
    if(!body) return;

    body.innerHTML=`<div class="fin-toolbar">
      <div>
        <h2 style="margin:0;">💰 Financeiro</h2>
        <div style="color:#64748b;margin-top:4px;">Controle financeiro da clínica: receitas, despesas, caixa, DRE e comissões.</div>
      </div>

      <div class="row">
        <button class="btn btn-green" onclick="Financeiro.modalReceita()">+ Receita</button>
        <button class="btn btn-red" onclick="Financeiro.modalDespesa()">+ Despesa</button>
        <div class="export-menu-inline">
          <button class="btn btn-outline" onclick="Financeiro.exportarCSV()">Exportar CSV</button>
          <button class="btn btn-blue" onclick="Financeiro.exportarPDF()">Exportar PDF</button>
        </div>
      </div>
    </div>

    <div class="fin-tabs">
      ${[
        ['dashboard','Dashboard'],
        ['receitas','Receitas'],
        ['despesas','Despesas'],
        ['caixa','Caixa'],
        ['dre','DRE'],
        ['comissoes','Comissões'],
        ['categorias','Categorias']
      ].map(t=>`<button class="${this.tab===t[0]?'active':''}" onclick="Financeiro.render('${t[0]}')">${t[1]}</button>`).join('')}
    </div>

    <div id="financeiro-body">${this.renderTab()}</div>`;

    const finBody=document.getElementById('financeiro-body');
    if(finBody && !finBody.querySelector('.fin-dashboard-bottom-space')){
      finBody.insertAdjacentHTML('beforeend','<div class="fin-dashboard-bottom-space"></div>');
    }
  };

  // Garante que não exista mais troca tardia de botão Exportar.
  Financeiro.__semPiscarV73 = true;
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




/* =========================================================
   ZERO V8.3 — Exportação financeira Excel .xlsx
========================================================= */
(function(){
  if(!window.Financeiro || Financeiro.__excelV83) return;
  Financeiro.__excelV83=true;

  Financeiro.exportarExcel = function(){
    try{
      const receitas=Store.get('FIN_RECEITAS')||[];
      const despesas=Store.get('FIN_DESPESAS')||[];
      const wb=XLSX.utils.book_new();

      const rec=receitas.map(r=>({
        Data:r.data||r.vencimento||'',
        Descrição:r.descricao||r.nome||'',
        Categoria:r.categoria||r.grupo||'',
        Paciente:r.paciente||'',
        Valor:Number(r.valor||0),
        Status:r.status||''
      }));

      const des=despesas.map(d=>({
        Data:d.data||d.vencimento||'',
        Descrição:d.descricao||d.nome||'',
        Categoria:d.categoria||d.grupo||'',
        Fornecedor:d.fornecedor||'',
        Valor:Number(d.valor||0),
        Status:d.status||''
      }));

      const totalReceitas=rec.reduce((s,x)=>s+(Number(x.Valor)||0),0);
      const totalDespesas=des.reduce((s,x)=>s+(Number(x.Valor)||0),0);

      const resumo=[
        {Indicador:'Receitas',Valor:totalReceitas},
        {Indicador:'Despesas',Valor:totalDespesas},
        {Indicador:'Saldo',Valor:totalReceitas-totalDespesas}
      ];

      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(resumo),'Resumo');
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rec),'Receitas');
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(des),'Despesas');

      XLSX.writeFile(wb,'financeiro_clinica_mario_'+Date.now()+'.xlsx');
      Utils.toast('Financeiro exportado em Excel.');
      if(window.Security) Security.audit('financeiro_export_excel','Exportou financeiro Excel');
      if(window.LGPDOffline) LGPDOffline.audit('financeiro_export_excel','Exportou financeiro Excel');
    }catch(e){
      console.error(e);
      Utils.toast('Falha ao exportar Excel. Verifique a internet para carregar a biblioteca XLSX.');
    }
  };

  const oldRender=Financeiro.render?.bind(Financeiro);
  if(oldRender && !Financeiro.__renderExcelBtnV83){
    Financeiro.__renderExcelBtnV83=true;
    Financeiro.render=function(tab=''){
      const ret=oldRender(tab);
      setTimeout(()=>{
        const tb=document.querySelector('.fin-toolbar .row');
        if(tb && !tb.querySelector('[data-fin-excel]')){
          tb.insertAdjacentHTML('beforeend','<button data-fin-excel class="btn btn-outline" onclick="Financeiro.exportarExcel()">Exportar Excel</button>');
        }
      },30);
      return ret;
    };
  }
})();




/* =========================================================
   ZERO V8.9 — Financeiro sem piscar botões
   - Evita inserir botões com setTimeout repetidas vezes.
   - Mantém barra de ações estável.
========================================================= */
(function(){
  if(!window.Financeiro || Financeiro.__semPiscarV89) return;
  Financeiro.__semPiscarV89=true;

  Financeiro._toolbarStableV89=function(){
    const tb=document.querySelector('.fin-toolbar .row');
    if(!tb) return;

    // Remove duplicados criados por versões anteriores.
    const seen={};
    [...tb.querySelectorAll('button')].forEach(btn=>{
      const key=(btn.innerText||'').trim().toLowerCase();
      if(seen[key]){
        btn.remove();
      }else{
        seen[key]=true;
      }
      btn.style.transition='none';
      btn.style.animation='none';
    });

    // Garante Excel apenas uma vez.
    if(typeof Financeiro.exportarExcel==='function' && ![...tb.querySelectorAll('button')].some(b=>(b.innerText||'').toLowerCase().includes('excel'))){
      tb.insertAdjacentHTML('beforeend','<button data-fin-excel class="btn btn-outline" onclick="Financeiro.exportarExcel()">Exportar Excel</button>');
    }
  };

  const oldRender=Financeiro.render?.bind(Financeiro);
  if(oldRender){
    Financeiro.render=function(tab=''){
      const ret=oldRender(tab);
      requestAnimationFrame(()=>Financeiro._toolbarStableV89());
      return ret;
    };
  }

  document.addEventListener('click',function(ev){
    const el=ev.target.closest('.fin-tabs button,[onclick*="Financeiro.render"]');
    if(el) requestAnimationFrame(()=>Financeiro._toolbarStableV89());
  },true);
})();




/* =========================================================
   ZERO V12.6 — Integração Agenda/Encaixe com Financeiro
   Regras:
   - Agendamento com valor cria/atualiza receita financeira automática.
   - Encaixe/Atendimento avulso com valor cria/atualiza receita financeira.
   - Cancelar/excluir consulta/agendamento remove a receita automática.
   - Tirar da fila/cancelar encaixe remove a receita automática.
========================================================= */
(function(){
  if(!window.Financeiro || Financeiro.__agendaEncaixeIntegradoV126) return;
  Financeiro.__agendaEncaixeIntegradoV126=true;

  Financeiro.receitaOrigemIdV126=function(origem,tipoId){
    return `REC_${origem}_${tipoId}`;
  };

  Financeiro.removerReceitaAutomaticaV126=function(origem,tipoId){
    const rid=this.receitaOrigemIdV126(origem,tipoId);
    let list=Store.get('FIN_RECEITAS')||[];
    list=list.filter(r=>
      String(r.id)!==String(rid) &&
      !(String(r.origem||'')===String(origem) && String(r.origemId||'')===String(tipoId))
    );
    Store.set('FIN_RECEITAS',list);
  };

  Financeiro.upsertReceitaAutomaticaV126=function(origem,item){
    const valor=Number(item.valorPrevisto||item.valorConsulta||item.valor||0);
    const origemId=item.id;
    if(!origemId) return;
    if(!valor){
      this.removerReceitaAutomaticaV126(origem,origemId);
      return;
    }

    const rid=this.receitaOrigemIdV126(origem,origemId);
    const descricao=origem==='agenda'
      ? `Consulta agendada - ${item.paciente||'Paciente'}`
      : `Encaixe / atendimento avulso - ${item.paciente||'Paciente'}`;

    const rec={
      id:rid,
      origem,
      origemId,
      agendaId:origem==='agenda'?origemId:(item.origemAgendaId||''),
      atendimentoId:origem==='encaixe'?origemId:(item.atendimentoId||''),
      descricao,
      cliente:item.paciente||'',
      pacienteId:item.pacienteId||item.pacId||'',
      categoria:'Consultas',
      valor,
      vencimento:item.data||Utils.today(),
      status:item.statusFinanceiro||'Pendente',
      forma:item.formaPagamento||'Dinheiro',
      parcelas:1,
      obs:`Gerado automaticamente pelo ${origem==='agenda'?'agendamento':'encaixe/atendimento avulso'}.`,
      automatico:true,
      criadoEm:item.criadoEm||new Date().toISOString(),
      atualizadoEm:new Date().toISOString()
    };

    Store.upsert('FIN_RECEITAS',rec);
  };
})();
