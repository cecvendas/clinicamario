window.Documentos={
  temp:[],
  start(pacId,consId){this.temp=[];this.pacId=pacId;this.consId=consId},
  add(tipo,item){item=Utils.clone(item);item.id=item.id||Utils.id('TMP');item.tipoDoc=tipo;item.pacId=this.pacId;item.consultaId=this.consId;let i=this.temp.findIndex(x=>x.id===item.id);if(i>=0)this.temp[i]=item;else this.temp.push(item);RegistrarConsulta.renderCards()},
  remove(id){this.temp=this.temp.filter(x=>x.id!==id);RegistrarConsulta.renderCards()},
  get(id){return this.temp.find(x=>x.id===id)},
  cards(){if(!this.temp.length)return `<div id="docs-temp"></div>`;return `<div id="docs-temp" class="card"><div class="row between"><strong>📎 Documentos salvos neste registro</strong><span class="badge">${this.temp.length} item(ns)</span></div><div class="grid" style="margin-top:12px">${this.temp.map(d=>this.card(d)).join('')}</div></div>`},
  resumo(d){if(d.tipoDoc==='Receita')return (d.medicamentos||[]).map(m=>m.nome).join(', ');if(d.tipoDoc==='Atestado')return d.tipo+' '+(d.dias?d.dias+' dia(s)':'');if(d.tipoDoc==='Laudo')return d.titulo||'Laudo';if(d.tipoDoc==='Pedido de Exames')return d.exames||'';if(d.tipoDoc==='Exame anexado')return d.nome||d.filename||'Anexo';return ''},
  card(d){return `<div class="doc-card"><div><div class="doc-title">${this.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</div><div class="doc-sub">${Utils.esc(this.resumo(d))}</div></div><div class="doc-actions"><button class="btn btn-sm btn-outline" onclick="Documentos.view('${d.id}')">👁️</button><button class="btn btn-sm btn-blue" onclick="Documentos.print('${d.id}')">🖨️</button><button class="btn btn-sm btn-outline" onclick="Documentos.edit('${d.id}')">✏️</button><button class="btn btn-sm btn-red" onclick="Documentos.remove('${d.id}')">🗑️</button></div></div>`},
  icon(t){return t==='Receita'?'💊':t==='Atestado'?'📄':t==='Laudo'?'🧾':t==='Pedido de Exames'?'🔬':'📎'},
  edit(id){let d=this.get(id);if(!d)return;if(d.tipoDoc==='Receita')RegistrarConsulta.modalReceita(d);if(d.tipoDoc==='Atestado')RegistrarConsulta.modalAtestado(d);if(d.tipoDoc==='Laudo')RegistrarConsulta.modalLaudo(d);if(d.tipoDoc==='Pedido de Exames')RegistrarConsulta.modalPedido(d);if(d.tipoDoc==='Exame anexado')Utils.toast('Para trocar anexo, exclua e anexe novamente')},
  view(id){let d=this.get(id);if(!d)return;Modal.open(d.tipoDoc,`<pre style="white-space:pre-wrap">${Utils.esc(JSON.stringify(d,null,2))}</pre>`,`<button class="btn btn-blue" onclick="Modal.close()">Fechar</button>`)},
  print(id){let d=this.get(id);if(d)Impressao.print(d)},
  consolidate(pacId,consId,histId){
    const prof = (window.ClinicaProfissionalDocumento && ClinicaProfissionalDocumento.resolve(item||doc||r||receita||atestado||laudo||pedido||exame||hist||{})) || {};const conselho=Profissionais.conselho(prof);
    const saved=this.temp.map(d=>{let item=Utils.clone(d);item.pacId=pacId;item.pacienteId=pacId;item.consultaId=consId;item.histId=histId;item.data=item.data||Utils.today();item.medico=prof.nome||'';item.conselho=conselho||'';delete item.tipoDoc;
      if(d.tipoDoc==='Receita'){item.id=item.id.startsWith('TMP')?Utils.id('R'):item.id;Store.upsert('RECEITAS',item)}
      if(d.tipoDoc==='Atestado'){item.id=item.id.startsWith('TMP')?Utils.id('AT'):item.id;Store.upsert('ATESTADOS',item)}
      if(d.tipoDoc==='Laudo'){item.id=item.id.startsWith('TMP')?Utils.id('LD'):item.id;Store.upsert('LAUDOS',item)}
      if(d.tipoDoc==='Pedido de Exames'){item.id=item.id.startsWith('TMP')?Utils.id('PE'):item.id;Store.upsert('EXAMES_PEDIDOS',item)}
      if(d.tipoDoc==='Exame anexado'){item.id=item.id.startsWith('TMP')?Utils.id('EX'):item.id;Store.upsert('EXAMES_ARQUIVOS',item)}
      return {...item,tipoDoc:d.tipoDoc};
    });
    return saved;
  }
};

/* ZERO V1.7 — normalização de anexos de exame */
(function(){
  const oldConsolidate = Documentos.consolidate.bind(Documentos);
  Documentos.consolidate = function(pacId, consId, histId){
    const saved = oldConsolidate(pacId, consId, histId);
    try{
      const anexos = Store.get('EXAMES_ARQUIVOS').map(x=>{
        x.pacId = x.pacId || x.pacienteId || pacId;
        x.pacienteId = x.pacienteId || x.pacId;
        x.tipoDoc = x.tipoDoc || 'Exame anexado';
        x.dataUrl = x.dataUrl || x.base64 || x.conteudo || x.arquivo || '';
        return x;
      });
      Store.set('EXAMES_ARQUIVOS', anexos);
    }catch(e){}
    return saved;
  };
})();




/* ZERO V3.4 — visualização dos cards do registro sem JSON bruto */
(function(){
  if(!window.Documentos) return;
  Documentos.view = function(id){
    const d=this.get(id);
    if(!d) return;
    let corpo='';
    if(d.tipoDoc==='Receita'){
      corpo=`<div class="doc-original-banner doc-banner-green">Receita salva neste atendimento</div>
        ${(d.medicamentos||[]).map((m,i)=>`<div class="doc-med-item"><div><div class="doc-med-title">${i+1}. ${Utils.esc(m.nome||'Medicamento')}</div><div class="doc-med-sub">${Utils.esc([m.formula,m.quantidade,m.via,m.posologia,m.duracao,m.orientacao].filter(Boolean).join(' • '))}</div></div></div>`).join('')}
        ${d.obs?`<p><strong>Orientações:</strong> ${Utils.esc(d.obs)}</p>`:''}`;
    }else if(d.tipoDoc==='Atestado'){
      corpo=`<p><strong>Tipo:</strong> ${Utils.esc(d.tipo||'Atestado')}</p>
      <p><strong>Dias:</strong> ${Utils.esc(d.dias||'—')}</p>
      <p><strong>CID:</strong> ${Utils.esc(d.cid||'—')}</p>
      <p><strong>Texto/Motivo:</strong><br>${Utils.esc(d.texto||d.motivo||'—')}</p>`;
    }else if(d.tipoDoc==='Laudo'){
      corpo=`<p><strong>Título:</strong> ${Utils.esc(d.titulo||'Laudo médico')}</p>
      <p><strong>CID:</strong> ${Utils.esc(d.cid||'—')}</p>
      <p><strong>Laudo:</strong><br>${Utils.esc(d.texto||'—')}</p>`;
    }else if(d.tipoDoc==='Pedido de Exames'){
      corpo=`<p><strong>Exames:</strong></p><div style="white-space:pre-wrap">${Utils.esc(d.exames||'—')}</div>${d.obs?`<p><strong>Obs:</strong><br>${Utils.esc(d.obs)}</p>`:''}`;
    }else{
      corpo=`<p><strong>Arquivo:</strong> ${Utils.esc(d.nome||d.filename||'Exame anexado')}</p>`;
    }
    Modal.open(d.tipoDoc,`<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;line-height:1.6;">${corpo}</div>`,`<button class="btn btn-blue" onclick="RegistrarConsulta.restoreMainModal ? RegistrarConsulta.restoreMainModal() : Modal.close()">Fechar</button>`);
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




/* =========================================================
   ZERO V10.6 — Consolidar documentos/anexos sem erro
   Corrige variáveis inexistentes e salva anexos/documentos do atendimento.
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__consolidateFixV106) return;
  Documentos.__consolidateFixV106=true;

  Documentos.profissionalDocumentoV106=function(){
    try{
      if(window.RegistrarConsulta?.profissionalAtualAtendimentoV106){
        return RegistrarConsulta.profissionalAtualAtendimentoV106() || {};
      }
      if(window.Profissionais?.atual) return Profissionais.atual()||{};
    }catch(e){}
    return {};
  };

  Documentos.consolidate=function(pacId,consId,histId){
    const prof=this.profissionalDocumentoV106();
    const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');

    const saved=(this.temp||[]).map(d=>{
      let item=Utils.clone(d);
      item.pacId=pacId;
      item.pacienteId=pacId;
      item.consultaId=consId;
      item.histId=histId;
      item.data=item.data||Utils.today();
      item.profissionalId=item.profissionalId||prof.id||'';
      item.profissional=item.profissional||prof.nome||'';
      item.medico=item.medico||prof.nome||'';
      item.conselho=item.conselho||conselho||'';
      item.crm=item.crm||conselho||'';

      const tipoDoc=d.tipoDoc||item.tipoDoc||'Documento';
      delete item.tipoDoc;

      if(tipoDoc==='Receita'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('R'):(item.id||Utils.id('R'));
        Store.upsert('RECEITAS',item);
      }else if(tipoDoc==='Atestado'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('AT'):(item.id||Utils.id('AT'));
        Store.upsert('ATESTADOS',item);
      }else if(tipoDoc==='Laudo'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('LD'):(item.id||Utils.id('LD'));
        Store.upsert('LAUDOS',item);
      }else if(tipoDoc==='Pedido de Exames'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('PE'):(item.id||Utils.id('PE'));
        Store.upsert('EXAMES_PEDIDOS',item);
      }else if(tipoDoc==='Exame anexado'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('EX'):(item.id||Utils.id('EX'));
        item.tipo='Exame anexado';
        item.dataUrl=item.dataUrl||item.base64||item.conteudo||item.arquivo||'';
        Store.upsert('EXAMES_ARQUIVOS',item);
      }

      return {...item,tipoDoc};
    });

    return saved;
  };
})();




/* =========================================================
   ZERO V10.7 — Documentos do Registrar Consulta em seus menus
   Regra:
   - Continua vinculado ao atendimento/histórico.
   - Também salva cada item no seu módulo/menu próprio:
     Receita -> RECEITAS
     Atestado Médico -> ATESTADOS
     Laudo Médico -> LAUDOS
     Solicitação/Pedido de Exames -> EXAMES_PEDIDOS
     Arquivo/Exame anexado -> EXAMES_ARQUIVOS
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__cadaMenuV107) return;
  Documentos.__cadaMenuV107=true;

  Documentos.normalizarTipoDocV107=function(tipo){
    const t=String(tipo||'').toLowerCase();
    if(t.includes('receita')) return 'Receita';
    if(t.includes('atestado') || t.includes('documento')) return 'Atestado';
    if(t.includes('laudo')) return 'Laudo';
    if(t.includes('pedido') || t.includes('solicita') || t.includes('exames')) return 'Pedido de Exames';
    if(t.includes('anex')) return 'Exame anexado';
    return tipo||'Documento';
  };

  Documentos.salvarNoMenuProprioV107=function(tipoDoc,item){
    tipoDoc=this.normalizarTipoDocV107(tipoDoc);
    const out=Utils.clone(item||{});

    if(tipoDoc==='Receita'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('R'):(out.id||Utils.id('R'));
      out.tipoDoc='Receita';
      Store.upsert('RECEITAS',out);
      return {...out,tipoDoc:'Receita'};
    }

    if(tipoDoc==='Atestado'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('AT'):(out.id||Utils.id('AT'));
      out.tipoDoc='Atestado';
      out.tipoDocumento=out.tipoDocumento||'Atestado';
      Store.upsert('ATESTADOS',out);
      return {...out,tipoDoc:'Atestado'};
    }

    if(tipoDoc==='Laudo'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('LD'):(out.id||Utils.id('LD'));
      out.tipoDoc='Laudo';
      Store.upsert('LAUDOS',out);
      return {...out,tipoDoc:'Laudo'};
    }

    if(tipoDoc==='Pedido de Exames'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('PE'):(out.id||Utils.id('PE'));
      out.tipoDoc='Pedido de Exames';
      Store.upsert('EXAMES_PEDIDOS',out);
      return {...out,tipoDoc:'Pedido de Exames'};
    }

    if(tipoDoc==='Exame anexado'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('EX'):(out.id||Utils.id('EX'));
      out.tipoDoc='Exame anexado';
      out.tipo='Exame anexado';
      out.dataUrl=out.dataUrl||out.base64||out.conteudo||out.arquivo||'';
      Store.upsert('EXAMES_ARQUIVOS',out);
      return {...out,tipoDoc:'Exame anexado'};
    }

    return {...out,tipoDoc};
  };

  Documentos.consolidate=function(pacId,consId,histId){
    const prof=RegistrarConsulta?.profissionalAtualAtendimentoV106 ? RegistrarConsulta.profissionalAtualAtendimentoV106() : (window.Profissionais?.atual ? Profissionais.atual() : {});
    const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof?.conselho||prof?.crm||'');

    const saved=(this.temp||[]).map(d=>{
      const tipoDoc=this.normalizarTipoDocV107(d.tipoDoc||d.tipoDocumento||d.tipo);
      let item=Utils.clone(d);

      item.pacId=pacId;
      item.pacienteId=pacId;
      item.consultaId=consId;
      item.histId=histId;
      item.data=item.data||Utils.today();
      item.profissionalId=item.profissionalId||prof?.id||'';
      item.profissional=item.profissional||prof?.nome||'';
      item.medico=item.medico||prof?.nome||'';
      item.conselho=item.conselho||conselho||'';
      item.crm=item.crm||conselho||'';

      // Salva no menu/módulo correto e retorna também para o histórico.
      return this.salvarNoMenuProprioV107(tipoDoc,item);
    });

    return saved;
  };
})();




/* =========================================================
   ZERO V10.8 — Documentos temporários protegidos no Registrar Consulta
   - Documentos.add nunca limpa os anteriores.
   - Cards são renderizados imediatamente quando o modal principal está aberto.
   - Consolidate salva tudo que estiver em temp ou backup.
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__tempProtegidoV108) return;
  Documentos.__tempProtegidoV108=true;

  Documentos.backupTempV108=function(){
    try{
      this.tempBackupV108=Utils.clone(this.temp||[]);
      if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=Utils.clone(this.temp||[]);
    }catch(e){
      this.tempBackupV108=[...(this.temp||[])];
      if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=[...(this.temp||[])];
    }
  };

  const oldStartV108=Documentos.start?.bind(Documentos);
  Documentos.start=function(pacId,consId){
    this.temp=[];
    this.tempBackupV108=[];
    this.pacId=pacId;
    this.consId=consId;
    if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=[];
  };

  Documentos.add=function(tipo,item){
    item=Utils.clone(item||{});
    item.id=item.id||Utils.id('TMP');
    item.tipoDoc=tipo;
    item.pacId=item.pacId||this.pacId||window.RegistrarConsulta?.pac?.id||'';
    item.pacienteId=item.pacienteId||item.pacId;
    item.consultaId=item.consultaId||this.consId||window.RegistrarConsulta?.consId||'';

    if(!Array.isArray(this.temp)) this.temp=[];
    const i=this.temp.findIndex(x=>String(x.id)===String(item.id));
    if(i>=0) this.temp[i]=item;
    else this.temp.push(item);

    this.backupTempV108();

    try{
      if(window.RegistrarConsulta?.renderCards) RegistrarConsulta.renderCards();
    }catch(e){}

    return item;
  };

  Documentos.remove=function(id){
    this.temp=(this.temp||[]).filter(x=>String(x.id)!==String(id));
    this.backupTempV108();
    try{ RegistrarConsulta.renderCards(); }catch(e){}
  };

  const oldConsolidateV108=Documentos.consolidate?.bind(Documentos);
  Documentos.consolidate=function(pacId,consId,histId){
    if((!this.temp || !this.temp.length) && this.tempBackupV108 && this.tempBackupV108.length){
      try{ this.temp=Utils.clone(this.tempBackupV108); }
      catch(e){ this.temp=[...this.tempBackupV108]; }
    }
    if((!this.temp || !this.temp.length) && window.RegistrarConsulta?.docsBackupV108?.length){
      try{ this.temp=Utils.clone(RegistrarConsulta.docsBackupV108); }
      catch(e){ this.temp=[...RegistrarConsulta.docsBackupV108]; }
    }
    return oldConsolidateV108 ? oldConsolidateV108(pacId,consId,histId) : [];
  };
})();




/* =========================================================
   ZERO V11.0 — Documentos.add rápido e consolidate robusto
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__v110Robusto) return;
  Documentos.__v110Robusto=true;

  Documentos.add=function(tipo,item){
    item=Utils.clone(item||{});
    item.id=item.id||Utils.id('TMP');
    item.tipoDoc=tipo;
    item.pacId=item.pacId||this.pacId||window.RegistrarConsulta?.pac?.id||'';
    item.pacienteId=item.pacienteId||item.pacId;
    item.consultaId=item.consultaId||this.consId||window.RegistrarConsulta?.consId||'';

    if(!Array.isArray(this.temp)) this.temp=[];
    const i=this.temp.findIndex(x=>String(x.id)===String(item.id));
    if(i>=0) this.temp[i]=item;
    else this.temp.push(item);

    try{ this.tempBackupV108=Utils.clone(this.temp); }catch(e){ this.tempBackupV108=[...this.temp]; }
    try{ if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=Utils.clone(this.temp); }catch(e){}

    if(window.RegistrarConsulta?.renderCards) RegistrarConsulta.renderCards();
    return item;
  };

  Documentos.consolidate=function(pacId,consId,histId){
    if((!this.temp || !this.temp.length) && this.tempBackupV108?.length){
      try{ this.temp=Utils.clone(this.tempBackupV108); }catch(e){ this.temp=[...this.tempBackupV108]; }
    }
    if((!this.temp || !this.temp.length) && window.RegistrarConsulta?.docsBackupV108?.length){
      try{ this.temp=Utils.clone(RegistrarConsulta.docsBackupV108); }catch(e){ this.temp=[...RegistrarConsulta.docsBackupV108]; }
    }

    const prof=(window.RegistrarConsulta?.profissionalAtualAtendimentoV109 && RegistrarConsulta.profissionalAtualAtendimentoV109()) || {};
    const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');

    return (this.temp||[]).map(d=>{
      const tipoDoc=d.tipoDoc||'Documento';
      let item=Utils.clone(d);
      item.pacId=pacId;
      item.pacienteId=pacId;
      item.consultaId=consId;
      item.histId=histId;
      item.data=item.data||Utils.today();
      item.profissionalId=item.profissionalId||prof.id||'';
      item.profissional=item.profissional||prof.nome||'';
      item.medico=item.medico||prof.nome||'';
      item.conselho=item.conselho||conselho||'';
      item.crm=item.crm||conselho||'';

      if(tipoDoc==='Receita'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('R'):(item.id||Utils.id('R'));
        Store.upsert('RECEITAS',item);
      }else if(tipoDoc==='Atestado'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('AT'):(item.id||Utils.id('AT'));
        Store.upsert('ATESTADOS',item);
      }else if(tipoDoc==='Laudo'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('LD'):(item.id||Utils.id('LD'));
        Store.upsert('LAUDOS',item);
      }else if(tipoDoc==='Pedido de Exames'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('PE'):(item.id||Utils.id('PE'));
        Store.upsert('EXAMES_PEDIDOS',item);
      }else if(tipoDoc==='Exame anexado'){
        item.id=String(item.id||'').startsWith('TMP')?Utils.id('EX'):(item.id||Utils.id('EX'));
        item.tipo='Exame anexado';
        item.dataUrl=item.dataUrl||item.base64||item.conteudo||item.arquivo||'';
        Store.upsert('EXAMES_ARQUIVOS',item);
      }
      return {...item,tipoDoc};
    });
  };
})();




/* =========================================================
   ZERO V14.4 — Exames: temp e salvamento final robustos
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__examesSelecionarAnexarV144) return;
  Documentos.__examesSelecionarAnexarV144=true;

  Documentos.tipoNormalV144=function(tipo){
    const t=String(tipo||'').toLowerCase();
    if(t.includes('receita')) return 'Receita';
    if(t.includes('atestado')) return 'Atestado';
    if(t.includes('laudo')) return 'Laudo';
    if(t.includes('pedido') || t.includes('solicita')) return 'Pedido de Exames';
    if(t.includes('anex') || t.includes('arquivo') || t==='exame') return 'Exame anexado';
    return tipo||'Documento';
  };

  Documentos.add=function(tipo,item){
    item=Utils.clone(item||{});
    tipo=this.tipoNormalV144(tipo||item.tipoDoc||item.tipo);
    item.id=item.id || Utils.id(tipo==='Pedido de Exames'?'TMP_PE':tipo==='Exame anexado'?'TMP_EX':'TMP');
    item.tipoDoc=tipo;
    item.tipo=tipo;
    item.pacId=item.pacId||this.pacId||window.RegistrarConsulta?.pac?.id||'';
    item.pacienteId=item.pacienteId||item.pacId;
    item.consultaId=item.consultaId||this.consId||window.RegistrarConsulta?.consId||'';
    item.data=item.data||Utils.today();
    item.criadoEm=item.criadoEm||new Date().toISOString();

    if(!Array.isArray(this.temp)) this.temp=[];

    const i=this.temp.findIndex(x=>String(x.id)===String(item.id));
    if(i>=0) this.temp[i]=item;
    else this.temp.push(item);

    try{ this.tempBackupV108=Utils.clone(this.temp); }catch(e){ this.tempBackupV108=[...this.temp]; }
    try{ if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=Utils.clone(this.temp); }catch(e){}

    try{ if(window.RegistrarConsulta?.renderCards) RegistrarConsulta.renderCards(); }catch(e){}
    return item;
  };

  Documentos.remove=function(id){
    this.temp=(this.temp||[]).filter(x=>String(x.id)!==String(id));
    try{ this.tempBackupV108=Utils.clone(this.temp); }catch(e){ this.tempBackupV108=[...this.temp]; }
    try{ if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=Utils.clone(this.temp); }catch(e){}
    try{ if(window.RegistrarConsulta?.renderCards) RegistrarConsulta.renderCards(); }catch(e){}
  };

  Documentos.cards=function(){
    const docs=this.temp||[];
    return docs.map(d=>{
      const tipo=this.tipoNormalV144(d.tipoDoc||d.tipo);
      const resumo=tipo==='Pedido de Exames'
        ? (d.examesSelecionados?.join(', ') || String(d.exames||'').split(/\n/).filter(Boolean).slice(0,3).join(', ') || 'Pedido de exames')
        : tipo==='Exame anexado'
          ? (d.nome||d.filename||'Exame anexado')
          : tipo==='Receita'
            ? ((d.medicamentos||[]).map(m=>m.nome).filter(Boolean).join(', ') || 'Receita médica')
            : (d.titulo||d.tipo||tipo);
      return `<div class="doc-temp-card-v144">
        <div class="doc-temp-main-v144">
          <strong>${Documentos.icon ? Documentos.icon(tipo) : '📄'} ${Utils.esc(tipo)}</strong>
          <div class="doc-sub">${Utils.esc(resumo)}</div>
        </div>
        <div class="doc-actions">
          <button type="button" class="btn btn-sm btn-red" onclick="Documentos.remove('${d.id}')">Excluir</button>
        </div>
      </div>`;
    }).join('');
  };

  Documentos.salvarNoMenuV144=function(tipoDoc,item){
    const tipo=this.tipoNormalV144(tipoDoc||item.tipoDoc||item.tipo);
    const out=Utils.clone(item||{});
    delete out.tipoDoc;
    out.tipo=tipo;
    out.data=out.data||Utils.today();

    if(tipo==='Receita'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('R'):(out.id||Utils.id('R'));
      Store.upsert('RECEITAS',out);
      return {...out,tipoDoc:'Receita'};
    }
    if(tipo==='Atestado'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('AT'):(out.id||Utils.id('AT'));
      Store.upsert('ATESTADOS',out);
      return {...out,tipoDoc:'Atestado'};
    }
    if(tipo==='Laudo'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('L'):(out.id||Utils.id('L'));
      Store.upsert('LAUDOS',out);
      return {...out,tipoDoc:'Laudo'};
    }
    if(tipo==='Pedido de Exames'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('PE'):(out.id||Utils.id('PE'));
      out.exames=out.exames||out.lista||'';
      Store.upsert('EXAMES_PEDIDOS',out);
      return {...out,tipoDoc:'Pedido de Exames'};
    }
    if(tipo==='Exame anexado'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('EX'):(out.id||Utils.id('EX'));
      out.dataUrl=out.dataUrl||out.base64||out.conteudo||out.arquivo||'';
      Store.upsert('EXAMES_ARQUIVOS',out);
      return {...out,tipoDoc:'Exame anexado'};
    }
    return {...out,tipoDoc:tipo};
  };

  Documentos.consolidate=function(pacId,consId,histId){
    let temp=this.temp||[];
    if((!temp.length) && this.tempBackupV108?.length) temp=this.tempBackupV108;
    if((!temp.length) && window.RegistrarConsulta?.docsBackupV108?.length) temp=RegistrarConsulta.docsBackupV108;

    const prof=(window.RegistrarConsulta?.profissionalAtualAtendimentoV109 && RegistrarConsulta.profissionalAtualAtendimentoV109()) ||
      (window.RegistrarConsulta?.profissionalAtualAtendimentoV106 && RegistrarConsulta.profissionalAtualAtendimentoV106()) ||
      (window.Profissionais?.atual ? Profissionais.atual() : {}) || {};
    const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');

    const saved=(temp||[]).map(d=>{
      const item=Utils.clone(d);
      item.pacId=pacId;
      item.pacienteId=pacId;
      item.consultaId=consId;
      item.histId=histId;
      item.data=item.data||Utils.today();
      item.profissionalId=item.profissionalId||prof.id||'';
      item.profissional=item.profissional||prof.nome||'';
      item.medico=item.medico||prof.nome||'';
      item.conselho=item.conselho||conselho||'';
      item.crm=item.crm||conselho||'';
      return this.salvarNoMenuV144(d.tipoDoc||d.tipo,item);
    });

    this.temp=[];
    this.tempBackupV108=[];
    if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=[];
    return saved;
  };
})();




/* =========================================================
   ZERO V14.6 — Exames salvam no menu Exames no ato
   - Pedido de Exames salvo no Registrar Consulta já entra em EXAMES_PEDIDOS.
   - Exame anexado já entra em EXAMES_ARQUIVOS.
   - Mantém também nos cards temporários do atendimento.
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__examesSalvamNoMenuV146) return;
  Documentos.__examesSalvamNoMenuV146=true;

  const oldAddV146=Documentos.add?.bind(Documentos);

  Documentos.tipoNormalV146=function(tipo){
    const t=String(tipo||'').toLowerCase();
    if(t.includes('pedido') || t.includes('solicita')) return 'Pedido de Exames';
    if(t.includes('anex') || t.includes('arquivo') || t==='exame') return 'Exame anexado';
    if(t.includes('receita')) return 'Receita';
    if(t.includes('atestado')) return 'Atestado';
    if(t.includes('laudo')) return 'Laudo';
    return tipo||'Documento';
  };

  Documentos.add=function(tipo,item){
    tipo=this.tipoNormalV146(tipo||item?.tipoDoc||item?.tipo);
    item=Utils.clone(item||{});
    item.tipoDoc=tipo;
    item.tipo=tipo;
    item.pacId=item.pacId||this.pacId||window.RegistrarConsulta?.pac?.id||'';
    item.pacienteId=item.pacienteId||item.pacId;
    item.consultaId=item.consultaId||this.consId||window.RegistrarConsulta?.consId||'';
    item.data=item.data||Utils.today();
    item.criadoEm=item.criadoEm||new Date().toISOString();

    if(tipo==='Pedido de Exames'){
      item.id=(!item.id || String(item.id).startsWith('TMP')) ? Utils.id('PE') : item.id;
      item.exames=item.exames||item.lista||'';
      Store.upsert('EXAMES_PEDIDOS',Utils.clone(item));
    }

    if(tipo==='Exame anexado'){
      item.id=(!item.id || String(item.id).startsWith('TMP')) ? Utils.id('EX') : item.id;
      item.nome=item.nome||item.filename||'Exame anexado';
      item.filename=item.filename||item.nome;
      item.dataUrl=item.dataUrl||item.base64||item.conteudo||item.arquivo||'';
      item.arquivo=item.arquivo||item.dataUrl||'';
      Store.upsert('EXAMES_ARQUIVOS',Utils.clone(item));
    }

    const saved=oldAddV146 ? oldAddV146(tipo,item) : item;

    try{
      if(!Array.isArray(this.temp)) this.temp=[];
      const i=this.temp.findIndex(x=>String(x.id)===String(item.id));
      if(i>=0) this.temp[i]=item;
      else if(!this.temp.some(x=>String(x.id)===String(item.id))) this.temp.push(item);
      this.tempBackupV108=Utils.clone(this.temp);
      if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=Utils.clone(this.temp);
    }catch(e){}

    try{ if(window.RegistrarConsulta?.renderCards) RegistrarConsulta.renderCards(); }catch(e){}
    return saved||item;
  };
})();




/* =========================================================
   ZERO V16.4 — Cards temporários do atendimento com todos os botões
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__cardsComBotoesV164) return;
  Documentos.__cardsComBotoesV164=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };

  Documentos.tipoCardV164=function(d){
    const t=String(d?.tipoDoc||d?.tipo||'').toLowerCase();
    if(t.includes('receita')) return 'Receita';
    if(t.includes('atestado') || t.includes('comparecimento')) return 'Atestado';
    if(t.includes('laudo')) return 'Laudo';
    if(t.includes('pedido')) return 'Pedido de Exames';
    if(t.includes('anex') || t.includes('arquivo')) return 'Exame anexado';
    return d?.tipoDoc||d?.tipo||'Documento';
  };

  Documentos.docsTempV164=function(){
    const out=[];
    const add=(arr)=>Array.isArray(arr)&&arr.forEach(d=>{ if(d && !out.some(x=>String(x.id)===String(d.id))) out.push(d); });
    add(this.temp||[]); add(this.tempBackupV108||[]); add(window.RegistrarConsulta?.docsBackupV108||[]);
    this.temp=clone(out)||[];
    this.tempBackupV108=clone(out)||[];
    if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=clone(out)||[];
    return out;
  };

  Documentos.resumoCardV164=function(d){
    const tipo=this.tipoCardV164(d);
    if(tipo==='Receita') return (d.medicamentos||[]).map(m=>m.nome).filter(Boolean).join(', ') || 'Receita médica';
    if(tipo==='Atestado') return d.texto||d.motivo||d.tipo||'Atestado médico';
    if(tipo==='Laudo') return d.titulo||d.texto||'Laudo médico';
    if(tipo==='Pedido de Exames') return (d.examesSelecionados||[]).join(', ') || String(d.exames||d.lista||'Pedido de exames').split(/\n+/).filter(Boolean).slice(0,3).join(', ');
    if(tipo==='Exame anexado') return d.nome||d.filename||d.arquivoNome||'Arquivo anexado';
    return d.titulo||d.nome||tipo;
  };

  Documentos.findTempV164=function(id){
    return this.docsTempV164().find(d=>String(d.id)===String(id))||null;
  };

  Documentos.visualizarTempV164=function(id){
    const d=this.findTempV164(id);
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipo=this.tipoCardV164(d);
    let html='';
    if(tipo==='Receita'){
      html=`<div class="doc-view-v164"><h3>Receita</h3>${(d.medicamentos||[]).map((m,i)=>`<div class="doc-view-item"><strong>${i+1}. ${esc(m.nome||'Medicamento')}</strong><br>${esc([m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao,m.quantidade,m.via,m.dose,m.periodicidadeTexto,m.duracao,m.orientacao].filter(Boolean).join(' • '))}</div>`).join('')}${d.obs?`<p>${esc(d.obs)}</p>`:''}</div>`;
    }else if(tipo==='Atestado'){
      html=`<div class="doc-view-v164"><h3>${esc(d.tipo||'Atestado')}</h3><div style="white-space:pre-wrap">${esc(d.texto||d.motivo||'')}</div>${d.obs?`<p>${esc(d.obs)}</p>`:''}</div>`;
    }else if(tipo==='Laudo'){
      html=`<div class="doc-view-v164"><h3>${esc(d.titulo||'Laudo')}</h3><div style="white-space:pre-wrap">${esc(d.texto||d.descricao||d.conclusao||'')}</div></div>`;
    }else if(tipo==='Pedido de Exames'){
      html=`<div class="doc-view-v164"><h3>Pedido de Exames</h3><div style="white-space:pre-wrap">${esc(d.exames||d.lista||'')}</div>${d.obs?`<p>${esc(d.obs)}</p>`:''}</div>`;
    }else{
      const data=d.dataUrl||d.arquivo||d.conteudo||'';
      const nome=d.nome||d.filename||'Arquivo';
      if(String(data).startsWith('data:image')) html=`<div class="doc-view-v164"><h3>${esc(nome)}</h3><img src="${data}" style="max-width:100%;border-radius:12px"></div>`;
      else if(String(data).startsWith('data:application/pdf')) html=`<div class="doc-view-v164"><h3>${esc(nome)}</h3><iframe src="${data}" style="width:100%;height:70vh;border:0"></iframe></div>`;
      else html=`<div class="doc-view-v164"><h3>${esc(nome)}</h3><p>Arquivo anexado ao atendimento.</p></div>`;
    }
    Modal.open('👁️ Visualizar documento',html,`<button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV164 ? RegistrarConsulta.voltarRegistroDepoisDocV164() : Modal.close()">Voltar</button><button type="button" class="btn btn-blue" onclick="Documentos.imprimirTempV164('${id}')">Imprimir/Abrir</button>`,'lg');
    return true;
  };

  Documentos.imprimirTempV164=function(id){
    const d=this.findTempV164(id);
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipo=this.tipoCardV164(d);
    if(tipo==='Exame anexado'){
      const data=d.dataUrl||d.arquivo||d.conteudo||'';
      if(data){ const w=window.open('','_blank'); if(w){ w.document.write(`<iframe src="${data}" style="width:100%;height:100vh;border:0"></iframe>`); w.document.close(); } return true; }
    }
    if(window.Impressao?.print) return Impressao.print({...d,tipoDoc:tipo});
    return this.visualizarTempV164(id);
  };

  Documentos.editarTempV164=function(id){
    const d=this.findTempV164(id);
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipo=this.tipoCardV164(d);
    this.remove(id);
    if(tipo==='Receita' && RegistrarConsulta.modalReceita) return RegistrarConsulta.modalReceita(d);
    if(tipo==='Atestado' && RegistrarConsulta.modalAtestado) return RegistrarConsulta.modalAtestado(d);
    if(tipo==='Laudo' && RegistrarConsulta.modalLaudo) return RegistrarConsulta.modalLaudo(d);
    if(tipo==='Pedido de Exames' && RegistrarConsulta.modalPedido) return RegistrarConsulta.modalPedido(d);
    Utils.toast('Este tipo de documento não possui edição.');
  };

  const oldRemoveV164=Documentos.remove?.bind(Documentos);
  Documentos.remove=function(id){
    if(oldRemoveV164) oldRemoveV164(id);
    this.temp=(this.temp||[]).filter(x=>String(x.id)!==String(id));
    this.tempBackupV108=(this.tempBackupV108||[]).filter(x=>String(x.id)!==String(id));
    if(window.RegistrarConsulta){
      RegistrarConsulta.docsBackupV108=(RegistrarConsulta.docsBackupV108||[]).filter(x=>String(x.id)!==String(id));
      try{ RegistrarConsulta.renderCards && RegistrarConsulta.renderCards(); }catch(e){}
    }
  };

  Documentos.cards=function(){
    const docs=this.docsTempV164();
    return docs.map(d=>{
      const tipo=this.tipoCardV164(d);
      const resumo=this.resumoCardV164(d);
      const isAnexo=tipo==='Exame anexado';
      return `<div class="doc-temp-card-v164">
        <div class="doc-temp-main-v164">
          <strong>${this.icon ? this.icon(tipo) : '📄'} ${esc(tipo)}</strong>
          <div class="doc-sub">${esc(resumo)}</div>
        </div>
        <div class="doc-actions doc-actions-v164">
          <button type="button" class="btn btn-sm btn-outline" onclick="Documentos.visualizarTempV164('${d.id}')">Visualizar</button>
          <button type="button" class="btn btn-sm btn-blue" onclick="Documentos.imprimirTempV164('${d.id}')">Imprimir/Abrir</button>
          ${isAnexo?'':`<button type="button" class="btn btn-sm btn-outline" onclick="Documentos.editarTempV164('${d.id}')">Editar</button>`}
          <button type="button" class="btn btn-sm btn-red" onclick="Documentos.remove('${d.id}')">Excluir</button>
        </div>
      </div>`;
    }).join('');
  };
})();




/* =========================================================
   ZERO V16.5 — Cards temporários com ícones + Receita 2 impressões
   Correções:
   - Cards dos documentos do atendimento ficam só com ícones.
   - Receita tem impressão normal e controle especial.
   - Mantém Visualizar, Editar e Excluir.
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__cardsIconesReceitaPrintV165) return;
  Documentos.__cardsIconesReceitaPrintV165=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };

  Documentos.tipoCardV165=function(d){
    const t=String(d?.tipoDoc||d?.tipo||'').toLowerCase();
    if(t.includes('receita')) return 'Receita';
    if(t.includes('atestado') || t.includes('comparecimento')) return 'Atestado';
    if(t.includes('laudo')) return 'Laudo';
    if(t.includes('pedido')) return 'Pedido de Exames';
    if(t.includes('anex') || t.includes('arquivo')) return 'Exame anexado';
    return d?.tipoDoc||d?.tipo||'Documento';
  };

  Documentos.docsTempV165=function(){
    const out=[];
    const add=(arr)=>Array.isArray(arr)&&arr.forEach(d=>{
      if(d && !out.some(x=>String(x.id)===String(d.id))) out.push(d);
    });
    add(this.temp||[]);
    add(this.tempBackupV108||[]);
    add(window.RegistrarConsulta?.docsBackupV108||[]);
    try{ this.temp=clone(out)||[]; }catch(e){ this.temp=out; }
    try{ this.tempBackupV108=clone(out)||[]; }catch(e){ this.tempBackupV108=out; }
    if(window.RegistrarConsulta){
      try{ RegistrarConsulta.docsBackupV108=clone(out)||[]; }catch(e){ RegistrarConsulta.docsBackupV108=out; }
    }
    return out;
  };

  Documentos.findTempV165=function(id){
    return this.docsTempV165().find(d=>String(d.id)===String(id))||null;
  };

  Documentos.resumoCardV165=function(d){
    const tipo=this.tipoCardV165(d);
    if(tipo==='Receita') return (d.medicamentos||[]).map(m=>m.nome).filter(Boolean).join(', ') || 'Receita médica';
    if(tipo==='Atestado') return d.texto||d.motivo||d.tipo||'Atestado médico';
    if(tipo==='Laudo') return d.titulo||d.texto||'Laudo médico';
    if(tipo==='Pedido de Exames') return (d.examesSelecionados||[]).join(', ') || String(d.exames||d.lista||'Pedido de exames').split(/\n+/).filter(Boolean).slice(0,3).join(', ');
    if(tipo==='Exame anexado') return d.nome||d.filename||d.arquivoNome||'Arquivo anexado';
    return d.titulo||d.nome||tipo;
  };

  Documentos.imprimirReceitaTempV165=function(id,tipoPrint='receita'){
    const d=this.findTempV165(id) || (this.findTempV164 && this.findTempV164(id));
    if(!d) return Utils.toast('Receita não encontrada.');
    const item={
      ...d,
      tipoDoc:'Receita',
      tipo:'Receita',
      tipoPrint:tipoPrint,
      controleEspecial:tipoPrint==='receita-controle'
    };
    if(window.Impressao?.print) return Impressao.print(item);
    return Utils.toast('Impressão não encontrada.');
  };

  Documentos.imprimirTempV165=function(id){
    const d=this.findTempV165(id) || (this.findTempV164 && this.findTempV164(id));
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipo=this.tipoCardV165(d);

    if(tipo==='Receita') return this.imprimirReceitaTempV165(id,'receita');

    if(tipo==='Exame anexado'){
      const data=d.dataUrl||d.arquivo||d.conteudo||'';
      if(data){
        const w=window.open('','_blank');
        if(w){
          w.document.write(`<iframe src="${data}" style="width:100%;height:100vh;border:0"></iframe>`);
          w.document.close();
        }
        return true;
      }
    }

    if(window.Impressao?.print) return Impressao.print({...d,tipoDoc:tipo});
    if(this.visualizarTempV164) return this.visualizarTempV164(id);
    return false;
  };

  const oldRemoveV165=Documentos.remove?.bind(Documentos);
  Documentos.remove=function(id){
    if(oldRemoveV165) oldRemoveV165(id);
    this.temp=(this.temp||[]).filter(x=>String(x.id)!==String(id));
    this.tempBackupV108=(this.tempBackupV108||[]).filter(x=>String(x.id)!==String(id));
    if(window.RegistrarConsulta){
      RegistrarConsulta.docsBackupV108=(RegistrarConsulta.docsBackupV108||[]).filter(x=>String(x.id)!==String(id));
      try{ RegistrarConsulta.renderCards && RegistrarConsulta.renderCards(); }catch(e){}
    }
  };

  Documentos.cards=function(){
    const docs=this.docsTempV165();
    return docs.map(d=>{
      const tipo=this.tipoCardV165(d);
      const resumo=this.resumoCardV165(d);
      const isAnexo=tipo==='Exame anexado';
      const isReceita=tipo==='Receita';
      return `<div class="doc-temp-card-v164 doc-temp-card-v165">
        <div class="doc-temp-main-v164">
          <strong>${this.icon ? this.icon(tipo) : '📄'} ${esc(tipo)}</strong>
          <div class="doc-sub">${esc(resumo)}</div>
        </div>
        <div class="doc-actions doc-actions-v164 doc-actions-icons-v165">
          <button type="button" class="btn btn-sm btn-outline doc-icon-btn-v165" title="Visualizar" aria-label="Visualizar" onclick="Documentos.visualizarTempV164('${d.id}')">👁️</button>
          <button type="button" class="btn btn-sm btn-blue doc-icon-btn-v165" title="Imprimir receita normal" aria-label="Imprimir receita normal" onclick="${isReceita?`Documentos.imprimirReceitaTempV165('${d.id}','receita')`:`Documentos.imprimirTempV165('${d.id}')`}">🖨️</button>
          ${isReceita?`<button type="button" class="btn btn-sm btn-purple doc-icon-btn-v165" title="Imprimir controle especial" aria-label="Imprimir controle especial" onclick="Documentos.imprimirReceitaTempV165('${d.id}','receita-controle')">🧾</button>`:''}
          ${isAnexo?'':`<button type="button" class="btn btn-sm btn-outline doc-icon-btn-v165" title="Editar" aria-label="Editar" onclick="Documentos.editarTempV164('${d.id}')">✏️</button>`}
          <button type="button" class="btn btn-sm btn-red doc-icon-btn-v165" title="Excluir" aria-label="Excluir" onclick="Documentos.remove('${d.id}')">🗑️</button>
        </div>
      </div>`;
    }).join('');
  };
})();




/* =========================================================
   ZERO V16.7 — Editar documentos sem remover antes de salvar
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__editarSemRemoverV167) return;
  Documentos.__editarSemRemoverV167=true;

  Documentos.findTempV167=function(id){
    const pools=[
      this.temp||[],
      this.tempBackupV108||[],
      window.RegistrarConsulta?.docsBackupV108||[]
    ];
    for(const arr of pools){
      const d=(arr||[]).find(x=>String(x.id)===String(id));
      if(d) return d;
    }
    return this.findTempV165 ? this.findTempV165(id) : (this.findTempV164 ? this.findTempV164(id) : null);
  };

  Documentos.editarTempV164=function(id){
    const d=this.findTempV167(id);
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipo=(this.tipoCardV165 ? this.tipoCardV165(d) : (this.tipoCardV164 ? this.tipoCardV164(d) : (d.tipoDoc||d.tipo||'')));

    // Não remove aqui. O salvar com o mesmo ID substitui o card.
    if(tipo==='Receita' && window.RegistrarConsulta?.modalReceita) return RegistrarConsulta.modalReceita(d);
    if(tipo==='Atestado' && window.RegistrarConsulta?.modalAtestado) return RegistrarConsulta.modalAtestado(d);
    if(tipo==='Laudo' && window.RegistrarConsulta?.modalLaudo) return RegistrarConsulta.modalLaudo(d);
    if(tipo==='Pedido de Exames' && window.RegistrarConsulta?.modalPedido) return RegistrarConsulta.modalPedido(d);

    Utils.toast('Este tipo de documento não possui edição.');
    return false;
  };

  Documentos.edit=function(id){
    return this.editarTempV164(id);
  };
})();




/* =========================================================
   ZERO V17.0 — Visualizar cards/anexos sem fechar Registrar Consulta
   Correções:
   - Visualizar dos cards do atendimento abre em camada própria.
   - X fecha só a visualização, não fecha Registrar Consulta.
   - Anexo não abre mais tela branca: imagem abre como imagem, PDF em iframe/blob.
   - Mantém os cards com ícones e Receita com 2 impressões.
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__visualizarCardsAnexosFixV170) return;
  Documentos.__visualizarCardsAnexosFixV170=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');

  Documentos._viewerUrlsV170=[];

  Documentos.fecharViewerV170=function(){
    const el=document.getElementById('doc-viewer-layer-v170');
    if(el) el.remove();
    try{
      (this._viewerUrlsV170||[]).forEach(u=>URL.revokeObjectURL(u));
      this._viewerUrlsV170=[];
    }catch(e){}
    return false;
  };

  Documentos.mimeDocV170=function(d){
    return String(d?.mime||d?.tipoArquivo||d?.contentType||d?.arquivoTipo||'').toLowerCase();
  };

  Documentos.nomeDocV170=function(d){
    return d?.nome||d?.filename||d?.arquivoNome||d?.nomeArquivo||d?.titulo||'Arquivo';
  };

  Documentos.dataDocV170=function(d){
    let data=d?.dataUrl||d?.arquivo||d?.conteudo||d?.base64||d?.url||d?.src||'';
    if(!data) return '';
    data=String(data);
    if(data.startsWith('data:') || data.startsWith('blob:') || data.startsWith('http')) return data;

    const mime=this.mimeDocV170(d) || (String(this.nomeDocV170(d)).toLowerCase().endsWith('.pdf')?'application/pdf':'application/octet-stream');
    // aceita base64 puro
    if(/^[A-Za-z0-9+/=\s]+$/.test(data) && data.length>80){
      return `data:${mime};base64,${data.replace(/\s+/g,'')}`;
    }
    return data;
  };

  Documentos.blobUrlV170=function(dataUrl){
    try{
      if(!dataUrl || !String(dataUrl).startsWith('data:')) return dataUrl||'';
      const parts=String(dataUrl).split(',');
      const meta=parts[0]||'';
      const b64=parts.slice(1).join(',');
      const mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';
      const bin=atob(b64);
      const len=bin.length;
      const bytes=new Uint8Array(len);
      for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
      this._viewerUrlsV170.push(url);
      return url;
    }catch(e){
      console.warn('Falha ao gerar blob do anexo',e);
      return dataUrl;
    }
  };

  Documentos.tipoTempV170=function(d){
    if(this.tipoCardV165) return this.tipoCardV165(d);
    if(this.tipoCardV164) return this.tipoCardV164(d);
    return d?.tipoDoc||d?.tipo||'Documento';
  };

  Documentos.findTempSeguroV170=function(id){
    const pools=[
      this.temp||[],
      this.tempBackupV108||[],
      window.RegistrarConsulta?.docsBackupV108||[]
    ];
    for(const arr of pools){
      const d=(arr||[]).find(x=>String(x.id)===String(id));
      if(d) return d;
    }
    if(this.findTempV167) return this.findTempV167(id);
    if(this.findTempV165) return this.findTempV165(id);
    if(this.findTempV164) return this.findTempV164(id);
    return null;
  };

  Documentos.conteudoDocV170=function(d,tipo){
    const tipoLower=String(tipo||'').toLowerCase();

    if(tipoLower.includes('anex')){
      const data=this.dataDocV170(d);
      const nome=this.nomeDocV170(d);
      const mime=this.mimeDocV170(d);
      const nomeLower=String(nome||'').toLowerCase();
      const isImg=(mime && mime.startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(nomeLower) || String(data).startsWith('data:image/');
      const isPdf=(mime.includes('pdf')) || nomeLower.endsWith('.pdf') || String(data).startsWith('data:application/pdf');

      if(data && isImg){
        return `<div class="doc-viewer-file-title-v170">${esc(nome)}</div>
          <div class="doc-viewer-img-wrap-v170"><img src="${data}" alt="${esc(nome)}"></div>`;
      }

      if(data && isPdf){
        const url=this.blobUrlV170(data);
        return `<div class="doc-viewer-file-title-v170">${esc(nome)}</div>
          <iframe class="doc-viewer-frame-v170" src="${url}" title="${esc(nome)}"></iframe>
          <div class="doc-viewer-open-row-v170">
            <button type="button" class="btn btn-blue" onclick="Documentos.abrirArquivoViewerV170('${String(d.id).replace(/'/g,'')}')">Abrir em nova aba</button>
          </div>`;
      }

      if(data){
        const url=this.blobUrlV170(data);
        return `<div class="doc-viewer-empty-v170">
          <div class="ico">📎</div>
          <strong>${esc(nome)}</strong>
          <p>Arquivo anexado. Este tipo pode não abrir direto dentro do visualizador.</p>
          <button type="button" class="btn btn-blue" onclick="window.open('${url}','_blank')">Abrir arquivo</button>
        </div>`;
      }

      return `<div class="doc-viewer-empty-v170">
        <div class="ico">⚠️</div>
        <strong>${esc(nome)}</strong>
        <p>O card do anexo existe, mas o conteúdo do arquivo ainda não foi encontrado no registro.</p>
      </div>`;
    }

    if(tipoLower.includes('receita')){
      const meds=Array.isArray(d.medicamentos)?d.medicamentos:[];
      return `<div class="doc-viewer-box-v170">
        <h3>Receita Médica</h3>
        ${meds.length?meds.map((m,i)=>`<div class="doc-viewer-med-v170">
          <strong>${i+1}. ${esc(m.nome||'Medicamento')}</strong>
          <div>${esc([m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao,m.quantidade,m.via,m.dose,m.periodicidadeTexto,m.duracao].filter(Boolean).join(' • '))}</div>
          ${m.orientacao?`<small>${esc(m.orientacao)}</small>`:''}
        </div>`).join(''):'<p>Nenhum medicamento informado.</p>'}
        ${d.obs||d.orientacao?`<h4>Orientações</h4><div style="white-space:pre-wrap">${esc(d.obs||d.orientacao)}</div>`:''}
      </div>`;
    }

    if(tipoLower.includes('pedido')){
      return `<div class="doc-viewer-box-v170">
        <h3>Pedido de Exames</h3>
        <div style="white-space:pre-wrap">${esc(d.exames||d.lista||'—')}</div>
        ${d.obs?`<h4>Observações</h4><div style="white-space:pre-wrap">${esc(d.obs)}</div>`:''}
      </div>`;
    }

    if(tipoLower.includes('atestado')){
      return `<div class="doc-viewer-box-v170">
        <h3>${esc(d.tipo||'Atestado Médico')}</h3>
        <div style="white-space:pre-wrap">${esc(d.texto||d.motivo||'—')}</div>
        ${d.dias?`<p><strong>Dias:</strong> ${esc(d.dias)}</p>`:''}
        ${d.cid?`<p><strong>CID:</strong> ${esc(d.cid)}</p>`:''}
      </div>`;
    }

    if(tipoLower.includes('laudo')){
      return `<div class="doc-viewer-box-v170">
        <h3>${esc(d.titulo||'Laudo Médico')}</h3>
        ${d.cid?`<p><strong>CID:</strong> ${esc(d.cid)}</p>`:''}
        <div style="white-space:pre-wrap">${esc(d.texto||d.descricao||d.conclusao||'—')}</div>
      </div>`;
    }

    return `<div class="doc-viewer-box-v170"><pre>${esc(JSON.stringify(d,null,2))}</pre></div>`;
  };

  Documentos.abrirViewerCamadaV170=function(titulo,html,footer=''){
    this.fecharViewerV170();

    const layer=document.createElement('div');
    layer.id='doc-viewer-layer-v170';
    layer.innerHTML=`<div class="doc-viewer-backdrop-v170"></div>
      <div class="doc-viewer-modal-v170">
        <div class="doc-viewer-head-v170">
          <strong>${esc(titulo)}</strong>
          <button type="button" class="doc-viewer-x-v170" onclick="Documentos.fecharViewerV170()">×</button>
        </div>
        <div class="doc-viewer-body-v170">${html}</div>
        <div class="doc-viewer-footer-v170">
          ${footer}
          <button type="button" class="btn btn-ghost" onclick="Documentos.fecharViewerV170()">Fechar</button>
        </div>
      </div>`;

    document.body.appendChild(layer);
    return true;
  };

  Documentos.visualizarTempV164=function(id){
    const d=this.findTempSeguroV170(id);
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipo=this.tipoTempV170(d);
    const html=this.conteudoDocV170(d,tipo);
    const footer=`<button type="button" class="btn btn-blue" onclick="Documentos.imprimirTempV165 ? Documentos.imprimirTempV165('${id}') : Documentos.imprimirTempV164('${id}')">Imprimir/Abrir</button>`;
    return this.abrirViewerCamadaV170(`👁️ ${tipo}`,html,footer);
  };

  Documentos.abrirArquivoViewerV170=function(id){
    const d=this.findTempSeguroV170(id);
    if(!d) return Utils.toast('Arquivo não encontrado.');
    const data=this.dataDocV170(d);
    if(!data) return Utils.toast('Conteúdo do arquivo não encontrado.');
    const url=this.blobUrlV170(data);
    window.open(url,'_blank');
    return true;
  };
})();




/* =========================================================
   ZERO V17.1 — PDF/anexo sem branco + só consolida no menu ao salvar consulta
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__pdfAnexoSalvarFinalV171) return;
  Documentos.__pdfAnexoSalvarFinalV171=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };

  Documentos.extMimeV171=function(d){
    const nome=String(d?.nome||d?.filename||d?.arquivoNome||'').toLowerCase();
    let mime=String(d?.mime||d?.tipoArquivo||d?.contentType||d?.arquivoTipo||'').toLowerCase();
    if(!mime || mime==='application/octet-stream'){
      if(nome.endsWith('.pdf')) mime='application/pdf';
      else if(/\.(jpg|jpeg)$/i.test(nome)) mime='image/jpeg';
      else if(nome.endsWith('.png')) mime='image/png';
      else if(nome.endsWith('.gif')) mime='image/gif';
      else if(nome.endsWith('.webp')) mime='image/webp';
    }
    return mime || 'application/octet-stream';
  };

  Documentos.dataDocV170=function(d){
    const imediato=d?.blobUrl||d?.objectUrl||d?.urlSessao||'';
    if(imediato) return String(imediato);

    let data=d?.dataUrl||d?.conteudo||'';
    if(!data && String(d?.arquivo||'').startsWith('data:')) data=d.arquivo;
    if(!data && /^https?:|^blob:/.test(String(d?.arquivo||''))) data=d.arquivo;
    if(!data && d?.base64) data=d.base64;
    if(!data && d?.url) data=d.url;
    if(!data) return '';

    data=String(data);
    if(data.startsWith('data:') || data.startsWith('blob:') || data.startsWith('http')) return data;

    if(/^[A-Za-z0-9+/=\s]+$/.test(data) && data.length>80){
      return `data:${this.extMimeV171(d)};base64,${data.replace(/\s+/g,'')}`;
    }
    return data;
  };

  Documentos.blobUrlV171=function(dataUrl,mimePreferido=''){
    try{
      if(!dataUrl) return '';
      dataUrl=String(dataUrl);
      if(dataUrl.startsWith('blob:') || dataUrl.startsWith('http')) return dataUrl;
      if(!dataUrl.startsWith('data:')) return dataUrl;

      const parts=dataUrl.split(',');
      const meta=parts[0]||'';
      const b64=parts.slice(1).join(',');
      const mime=mimePreferido || (meta.match(/data:([^;]+)/)||[])[1] || 'application/octet-stream';
      const bin=atob(b64);
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
      if(!this._viewerUrlsV170) this._viewerUrlsV170=[];
      this._viewerUrlsV170.push(url);
      return url;
    }catch(e){
      console.warn('Falha ao abrir anexo',e);
      return dataUrl;
    }
  };

  Documentos.urlAbrirAnexoV171=function(d){
    const mime=this.extMimeV171(d);
    const data=this.dataDocV170(d);
    if(!data) return '';
    const preferido=mime.includes('pdf') ? 'application/pdf' : mime;
    return data.startsWith('data:') ? this.blobUrlV171(data,preferido) : data;
  };

  Documentos.conteudoDocV170=function(d,tipo){
    const tipoLower=String(tipo||'').toLowerCase();

    if(tipoLower.includes('anex')){
      const nome=d?.nome||d?.filename||d?.arquivoNome||'Arquivo anexado';
      const mime=this.extMimeV171(d);
      const data=this.dataDocV170(d);
      const url=this.urlAbrirAnexoV171(d);
      const nomeLower=String(nome).toLowerCase();
      const isImg=mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(nomeLower) || String(data).startsWith('data:image/');
      const isPdf=mime.includes('pdf') || nomeLower.endsWith('.pdf') || String(data).startsWith('data:application/pdf');

      if(data && isImg){
        return `<div class="doc-viewer-file-title-v170">${esc(nome)}</div>
          <div class="doc-viewer-img-wrap-v170"><img src="${url||data}" alt="${esc(nome)}"></div>`;
      }

      if(data && isPdf){
        return `<div class="doc-viewer-file-title-v170">${esc(nome)}</div>
          <div class="doc-pdf-actions-v171">
            <button type="button" class="btn btn-blue" onclick="Documentos.abrirArquivoViewerV170('${String(d.id).replace(/'/g,'')}')">Abrir PDF</button>
            <button type="button" class="btn btn-outline" onclick="Documentos.baixarArquivoV171('${String(d.id).replace(/'/g,'')}')">Baixar PDF</button>
          </div>
          <object class="doc-viewer-frame-v170 doc-viewer-object-v171" data="${url}" type="application/pdf">
            <iframe class="doc-viewer-frame-v170" src="${url}" title="${esc(nome)}"></iframe>
          </object>
          <div class="doc-viewer-help-v171">Se o navegador não renderizar o PDF acima, use o botão <strong>Abrir PDF</strong>.</div>`;
      }

      if(data){
        return `<div class="doc-viewer-empty-v170">
          <div class="ico">📎</div>
          <strong>${esc(nome)}</strong>
          <p>Arquivo anexado.</p>
          <button type="button" class="btn btn-blue" onclick="Documentos.abrirArquivoViewerV170('${String(d.id).replace(/'/g,'')}')">Abrir arquivo</button>
        </div>`;
      }

      return `<div class="doc-viewer-empty-v170">
        <div class="ico">⏳</div>
        <strong>${esc(nome)}</strong>
        <p>O arquivo ainda está carregando. Aguarde alguns segundos e clique em visualizar novamente.</p>
      </div>`;
    }

    if(tipoLower.includes('receita')){
      const meds=Array.isArray(d.medicamentos)?d.medicamentos:[];
      return `<div class="doc-viewer-box-v170"><h3>Receita Médica</h3>
        ${meds.length?meds.map((m,i)=>`<div class="doc-viewer-med-v170"><strong>${i+1}. ${esc(m.nome||'Medicamento')}</strong><div>${esc([m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao,m.quantidade,m.via,m.dose,m.periodicidadeTexto,m.duracao].filter(Boolean).join(' • '))}</div></div>`).join(''):'<p>Nenhum medicamento informado.</p>'}
        ${d.obs||d.orientacao?`<h4>Orientações</h4><div style="white-space:pre-wrap">${esc(d.obs||d.orientacao)}</div>`:''}
      </div>`;
    }

    if(tipoLower.includes('pedido')){
      return `<div class="doc-viewer-box-v170"><h3>Pedido de Exames</h3><div style="white-space:pre-wrap">${esc(d.exames||d.lista||'—')}</div>${d.obs?`<h4>Observações</h4><div style="white-space:pre-wrap">${esc(d.obs)}</div>`:''}</div>`;
    }

    if(tipoLower.includes('atestado')){
      return `<div class="doc-viewer-box-v170"><h3>${esc(d.tipo||'Atestado Médico')}</h3><div style="white-space:pre-wrap">${esc(d.texto||d.motivo||'—')}</div>${d.dias?`<p><strong>Dias:</strong> ${esc(d.dias)}</p>`:''}${d.cid?`<p><strong>CID:</strong> ${esc(d.cid)}</p>`:''}</div>`;
    }

    if(tipoLower.includes('laudo')){
      return `<div class="doc-viewer-box-v170"><h3>${esc(d.titulo||'Laudo Médico')}</h3>${d.cid?`<p><strong>CID:</strong> ${esc(d.cid)}</p>`:''}<div style="white-space:pre-wrap">${esc(d.texto||d.descricao||d.conclusao||'—')}</div></div>`;
    }

    return `<div class="doc-viewer-box-v170"><pre>${esc(JSON.stringify(d,null,2))}</pre></div>`;
  };

  Documentos.abrirArquivoViewerV170=function(id){
    const d=(this.findTempSeguroV170&&this.findTempSeguroV170(id)) || (this.findTempV167&&this.findTempV167(id)) || (this.findTempV165&&this.findTempV165(id)) || null;
    if(!d) return Utils.toast('Arquivo não encontrado.');
    const url=this.urlAbrirAnexoV171(d);
    if(!url) return Utils.toast('Arquivo ainda carregando. Tente novamente em alguns segundos.');
    window.open(url,'_blank');
    return true;
  };

  Documentos.baixarArquivoV171=function(id){
    const d=(this.findTempSeguroV170&&this.findTempSeguroV170(id)) || (this.findTempV167&&this.findTempV167(id)) || (this.findTempV165&&this.findTempV165(id)) || null;
    if(!d) return Utils.toast('Arquivo não encontrado.');
    const url=this.urlAbrirAnexoV171(d);
    if(!url) return Utils.toast('Arquivo ainda carregando. Tente novamente em alguns segundos.');
    const a=document.createElement('a');
    a.href=url;
    a.download=d.nome||d.filename||d.arquivoNome||'arquivo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  };

  Documentos.imprimirTempV165=function(id){
    const d=(this.findTempSeguroV170&&this.findTempSeguroV170(id)) || (this.findTempV165&&this.findTempV165(id)) || (this.findTempV164&&this.findTempV164(id));
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipo=this.tipoCardV165 ? this.tipoCardV165(d) : (this.tipoCardV164 ? this.tipoCardV164(d) : d.tipoDoc||d.tipo||'Documento');

    if(tipo==='Receita' && this.imprimirReceitaTempV165) return this.imprimirReceitaTempV165(id,'receita');

    if(tipo==='Exame anexado'){
      const url=this.urlAbrirAnexoV171(d);
      if(!url) return Utils.toast('Arquivo ainda carregando. Tente novamente em alguns segundos.');
      window.open(url,'_blank');
      return true;
    }

    if(window.Impressao?.print) return Impressao.print({...d,tipoDoc:tipo});
    return this.visualizarTempV164 ? this.visualizarTempV164(id) : false;
  };

  Documentos.imprimirTempV164=function(id){
    return this.imprimirTempV165(id);
  };

  // A partir desta versão, Documentos.add não salva no menu no ato.
  Documentos.add=function(tipo,item){
    item=clone(item||{});
    tipo=this.tipoCardV165 ? this.tipoCardV165({...item,tipoDoc:tipo||item.tipoDoc||item.tipo}) : (tipo||item.tipoDoc||item.tipo||'Documento');
    item.id=item.id||Utils.id('TMP');
    item.tipoDoc=tipo;
    item.tipo=tipo;
    item.pacId=item.pacId||this.pacId||window.RegistrarConsulta?.pac?.id||'';
    item.pacienteId=item.pacienteId||item.pacId;
    item.consultaId=item.consultaId||this.consId||window.RegistrarConsulta?.consId||'';
    item.data=item.data||Utils.today();
    item.criadoEm=item.criadoEm||new Date().toISOString();
    item.temporarioRegistrarConsulta=true;
    item.salvoNoMenu=false;

    if(!Array.isArray(this.temp)) this.temp=[];
    const i=this.temp.findIndex(x=>String(x.id)===String(item.id));
    if(i>=0) this.temp[i]=item;
    else this.temp.push(item);

    this.tempBackupV108=clone(this.temp)||[];
    if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=clone(this.temp)||[];

    try{ if(window.RegistrarConsulta?.renderCards) RegistrarConsulta.renderCards(); }catch(e){}
    return item;
  };

  Documentos.salvarNoMenuFinalV171=function(tipo,item){
    tipo=this.tipoCardV165 ? this.tipoCardV165({...item,tipoDoc:tipo||item.tipoDoc||item.tipo}) : (tipo||item.tipoDoc||item.tipo||'Documento');
    const out=clone(item)||{};
    out.tipoDoc=tipo;
    out.tipo=tipo;
    out.salvoNoMenu=true;
    delete out.temporarioRegistrarConsulta;
    delete out._fileObject;
    // blobUrl é só da sessão; dataUrl/conteudo é que fica salvo.
    delete out.blobUrl; delete out.objectUrl; delete out.urlSessao;

    if(tipo==='Receita'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('R'):(out.id||Utils.id('R'));
      Store.upsert('RECEITAS',out);
      return {...out,tipoDoc:'Receita'};
    }
    if(tipo==='Atestado'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('AT'):(out.id||Utils.id('AT'));
      Store.upsert('ATESTADOS',out);
      return {...out,tipoDoc:'Atestado'};
    }
    if(tipo==='Laudo'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('LD'):(out.id||Utils.id('LD'));
      Store.upsert('LAUDOS',out);
      return {...out,tipoDoc:'Laudo'};
    }
    if(tipo==='Pedido de Exames'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('PE'):(out.id||Utils.id('PE'));
      out.exames=out.exames||out.lista||'';
      Store.upsert('EXAMES_PEDIDOS',out);
      return {...out,tipoDoc:'Pedido de Exames'};
    }
    if(tipo==='Exame anexado'){
      out.id=String(out.id||'').startsWith('TMP')?Utils.id('EX'):(out.id||Utils.id('EX'));
      out.nome=out.nome||out.filename||out.arquivoNome||'Arquivo anexado';
      out.filename=out.filename||out.nome;
      out.mime=this.extMimeV171(out);
      out.tipoArquivo=out.tipoArquivo||out.mime;
      out.contentType=out.contentType||out.mime;
      out.dataUrl=out.dataUrl||out.conteudo||'';
      out.conteudo=out.conteudo||out.dataUrl||'';
      out.arquivo=out.dataUrl||out.conteudo||'';
      Store.upsert('EXAMES_ARQUIVOS',out);
      return {...out,tipoDoc:'Exame anexado'};
    }

    return {...out,tipoDoc:tipo};
  };

  Documentos.consolidate=function(pacId,consId,histId){
    let temp=this.temp||[];
    if(!temp.length && this.tempBackupV108?.length) temp=this.tempBackupV108;
    if(!temp.length && window.RegistrarConsulta?.docsBackupV108?.length) temp=RegistrarConsulta.docsBackupV108;

    const prof=(window.RegistrarConsulta?.profissionalAtualAtendimentoV109 && RegistrarConsulta.profissionalAtualAtendimentoV109()) ||
      (window.RegistrarConsulta?.profissionalAtualAtendimentoV106 && RegistrarConsulta.profissionalAtualAtendimentoV106()) ||
      (window.Profissionais?.atual ? Profissionais.atual() : {}) || {};
    const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');

    const saved=(temp||[]).map(d=>{
      const item=clone(d)||{};
      item.pacId=pacId;
      item.pacienteId=pacId;
      item.consultaId=consId;
      item.histId=histId;
      item.data=item.data||Utils.today();
      item.profissionalId=item.profissionalId||prof.id||'';
      item.profissional=item.profissional||prof.nome||'';
      item.medico=item.medico||prof.nome||'';
      item.conselho=item.conselho||conselho||'';
      item.crm=item.crm||conselho||'';
      return this.salvarNoMenuFinalV171(item.tipoDoc||item.tipo,item);
    });

    this.temp=[];
    this.tempBackupV108=[];
    if(window.RegistrarConsulta) RegistrarConsulta.docsBackupV108=[];
    return saved;
  };
})();




/* =========================================================
   ZERO V17.3 — Visualizador de Laudo sem CID
========================================================= */
(function(){
  if(!window.Documentos || Documentos.__laudoSemCidViewerV173) return;
  Documentos.__laudoSemCidViewerV173=true;

  const oldConteudoV173=Documentos.conteudoDocV170?.bind(Documentos);
  Documentos.conteudoDocV170=function(d,tipo){
    const tipoLower=String(tipo||d?.tipoDoc||d?.tipo||'').toLowerCase();
    if(tipoLower.includes('laudo')){
      const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
      return `<div class="doc-viewer-box-v170">
        <h3>${esc(d.titulo||'Laudo Médico')}</h3>
        <div style="white-space:pre-wrap">${esc(d.texto||d.descricao||d.conclusao||'—')}</div>
      </div>`;
    }
    return oldConteudoV173 ? oldConteudoV173(d,tipo) : '';
  };
})();
