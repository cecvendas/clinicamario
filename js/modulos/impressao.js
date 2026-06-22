window.Impressao={
  profHtml(d){
    let p=Profissionais.atual();
    let nome=d.medico||p.nome||'';
    let cons=d.conselho||Profissionais.conselho(p)||'';
    return `<div style="text-align:center;margin-top:60px">
      <div style="border-top:1px solid #111;width:52mm;margin:0 auto 5px"></div>
      <div><strong>${Utils.esc(nome)}</strong></div>
      <div style="font-size:12px">${Utils.esc(cons)}</div>
    </div>`;
  },
  base(title,body){
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${Utils.esc(title)}</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:0;color:#111;font-size:13px;line-height:1.65}
    .head{border-bottom:2px solid #dbe4ee;margin-bottom:22px;padding-bottom:10px}h1{font-size:20px;text-transform:uppercase;margin:0;color:#0f172a}
    h3{font-size:14px;margin:18px 0 10px}.info{width:100%;border-collapse:collapse;margin:14px 0 20px}.info td{border:1px solid #ddd;background:#fafafa;padding:7px 8px}
    .med{border:1px solid #9ca3af;border-radius:6px;margin:9px 0 11px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
    .medh{display:flex;justify-content:space-between;gap:8px;padding:7px 8px;font-size:12px;line-height:1.25}.medn{flex:1;min-width:0;padding-right:8px}.medq{text-align:right;min-width:120px;white-space:nowrap}.sep{height:1px;background:#bbb}.medb{padding:7px 8px 8px;font-size:11px;line-height:1.35}.texto{margin-top:36px;font-size:15px;line-height:2;text-align:justify;min-height:260px}
    @media print{body{padding:0}@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}}
    
        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style></head><body class="print-documento-clinico">${body}</body></html>`;
  },
  paciente(id){return Store.get('PACIENTES').find(p=>p.id===id)||{}},
  imprimirHtml(html){
    const old=document.getElementById('__cm_print_iframe__'); if(old) old.remove();
    const iframe=document.createElement('iframe');
    iframe.id='__cm_print_iframe__';
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    const doc=iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    const limpar=()=>{setTimeout(()=>{try{iframe.remove()}catch(e){} window.removeEventListener('focus',limpar)},350)};
    iframe.onload=function(){
      setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print()}catch(e){Utils.toast('Não foi possível abrir a impressão.');limpar()}},180);
    };
    window.addEventListener('focus',limpar);
    setTimeout(limpar,12000);
  },
  print(d){
    d=Utils.clone(d);
    let tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';
    let p=this.paciente(d.pacId||d.pacienteId);
    if(tipo==='Exame anexado' && d.dataUrl){const w=window.open(d.dataUrl,'_blank');if(!w)Utils.toast('Pop-up bloqueado.');return}
    let body=`<div class="head"><h1>${Utils.esc(tipo)}</h1></div><table class="info"><tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td></tr><tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr></table>`;
    if(tipo==='Receita'){
      body+=`<h3>Prescrição:</h3>${(d.medicamentos||[]).map((m,i)=>{const titulo=[m.nome,m.formula].filter(Boolean).join(' ');const continuo=Utils.norm([m.duracao,m.orientacao,m.obs].join(' ')).includes('continuo');return `<div class="med"><div class="medh"><div class="medn"><strong>${i+1}. ${Utils.esc(titulo)}${continuo?' — USO CONTÍNUO':''}</strong></div><div class="medq"><strong>${Utils.esc(m.quantidade||m.quantidadeSolicitada||'')}</strong></div></div><div class="sep"></div><div class="medb">${m.via?`Via: ${Utils.esc(m.via)} `:''}${Utils.esc(m.posologia||m.freq||'')}${m.duracao?`<div>Durante ${Utils.esc(m.duracao)}</div>`:''}${m.orientacao?`<div>Orientação: ${Utils.esc(m.orientacao)}</div>`:''}</div></div>`}).join('')}${d.obs?`<p><strong>Orientações:</strong> ${Utils.esc(d.obs)}</p>`:''}`;
    }else if(tipo==='Atestado'){
      body+=`<div class="texto">Atesto para os devidos fins que o(a) paciente ${Utils.esc(p.nome||'—')} foi avaliado(a). ${d.dias?`Necessita de ${Utils.esc(d.dias)} dia(s) de afastamento.`:''} ${Utils.esc(d.texto||d.motivo||'')}</div>`;
    }else if(tipo==='Laudo'){
      body+=`<div class="texto"><h3>${Utils.esc(d.titulo||'Laudo')}</h3><p>${Utils.esc(d.texto||'')}</p></div>`;
    }else if(tipo==='Pedido de Exames'){
      body+=`<h3>Exames solicitados:</h3><div style="white-space:pre-wrap">${Utils.esc(d.exames||'')}</div>${d.obs?`<p>${Utils.esc(d.obs)}</p>`:''}`;
    }
    body+=this.profHtml(d);
    this.imprimirHtml(this.base(tipo,body));
  }
};

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
   ZERO V9.4 — Impressões puxam paciente do documento/modal
   - Se pacId não encontrar no cadastro, usa pacienteNome/pacienteCpf/etc.
   - Corrige impressões feitas direto pelo modal.
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__pacienteDocFixV94) return;
  Impressao.__pacienteDocFixV94=true;

  Impressao.pacienteDocumentoV94=function(d){
    const p=this.paciente(d.pacId||d.pacienteId) || {};
    return {
      ...p,
      id:p.id||d.pacId||d.pacienteId||'',
      nome:p.nome||p.nomeCompleto||d.pacienteNome||d.paciente||'',
      cpf:p.cpf||d.pacienteCpf||'',
      nascimento:p.nascimento||p.dataNascimento||p.nasc||d.pacienteNascimento||'',
      telefone:p.telefone||p.celular||p.tel||d.pacienteTelefone||'',
      convenio:p.convenio||p.plano||d.pacienteConvenio||''
    };
  };

  const oldPrintV94=Impressao.print?.bind(Impressao);
  Impressao.print=function(d){
    d=Utils.clone(d||{});
    let tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';
    let p=this.pacienteDocumentoV94(d);

    if(tipo==='Exame anexado' && d.dataUrl){
      const w=window.open(d.dataUrl,'_blank');
      if(!w) Utils.toast('Pop-up bloqueado.');
      return;
    }

    let body=`<div class="head"><h1>${Utils.esc(tipo)}</h1></div>
    <table class="info">
      <tr>
        <td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td>
        <td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td>
      </tr>
      <tr>
        <td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||'—')}</td>
        <td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td>
      </tr>
      <tr>
        <td><strong>Telefone:</strong> ${Utils.esc(p.telefone||'—')}</td>
        <td><strong>Convênio/Plano:</strong> ${Utils.esc(p.convenio||'—')}</td>
      </tr>
    </table>`;

    if(tipo==='Receita'){
      body+=`<h3>Prescrição:</h3>${(d.medicamentos||[]).map((m,i)=>{
        const titulo=[m.nome,m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao].filter(Boolean).join(' ');
        const continuo=!!m.usoContinuo || Utils.norm([m.duracao,m.orientacao,m.obs,m.periodicidadeTexto].join(' ')).includes('continuo');
        return `<div class="med"><div class="medh"><div class="medn"><strong>${i+1}. ${Utils.esc(titulo)}${continuo?' — USO CONTÍNUO':''}</strong></div><div class="medq"><strong>${Utils.esc(m.quantidade||m.quantidadeSolicitada||'')}</strong></div></div><div class="sep"></div><div class="medb">${m.via?`Via: ${Utils.esc(m.via)} `:''}${Utils.esc(m.posologia||m.periodicidadeTexto||m.freq||'')}${m.duracao?`<div>Durante ${Utils.esc(m.duracao)}</div>`:''}${m.orientacao?`<div>Orientação: ${Utils.esc(m.orientacao)}</div>`:''}</div></div>`;
      }).join('')}${d.obs?`<p><strong>Orientações:</strong> ${Utils.esc(d.obs)}</p>`:''}`;
    }else if(tipo==='Atestado' || String(tipo).toLowerCase().includes('atestado')){
      body+=`<div class="texto">Atesto para os devidos fins que o(a) paciente ${Utils.esc(p.nome||'—')} foi avaliado(a). ${d.dias?`Necessita de ${Utils.esc(d.dias)} dia(s) de afastamento.`:''} ${Utils.esc(d.texto||d.motivo||'')}</div>`;
    }else if(tipo==='Laudo' || String(tipo).toLowerCase().includes('laudo')){
      body+=`<div class="texto"><h3>${Utils.esc(d.titulo||'Laudo')}</h3><p>${Utils.esc(d.texto||d.descricao||'')}</p></div>`;
    }else if(tipo==='Pedido de Exames' || String(tipo).toLowerCase().includes('exame')){
      body+=`<h3>Exames solicitados:</h3><div style="white-space:pre-wrap">${Utils.esc(d.exames||'')}</div>${d.obs?`<p>${Utils.esc(d.obs)}</p>`:''}`;
    }

    body+=this.profHtml(d);
    this.imprimirHtml(this.base(tipo,body));
  };
})();




/* =========================================================
   ZERO V9.6 — Impressões por modal com paciente correto
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__pacienteModalV96) return;
  Impressao.__pacienteModalV96=true;

  Impressao.pacienteDocumentoV96=function(d){
    const p=this.paciente(d.pacId||d.pacienteId)||{};
    return {
      ...p,
      id:p.id||d.pacId||d.pacienteId||'',
      nome:p.nome||p.nomeCompleto||d.pacienteNome||d.paciente||'',
      cpf:p.cpf||d.pacienteCpf||'',
      nascimento:p.nascimento||p.dataNascimento||p.nasc||d.pacienteNascimento||'',
      telefone:p.telefone||p.celular||p.tel||d.pacienteTelefone||'',
      convenio:p.convenio||p.plano||d.pacienteConvenio||''
    };
  };

  Impressao.print=function(d){
    d=Utils.clone(d||{});
    let tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';
    let p=this.pacienteDocumentoV96(d);

    if(tipo==='Exame anexado' && d.dataUrl){
      const w=window.open(d.dataUrl,'_blank');
      if(!w) Utils.toast('Pop-up bloqueado.');
      return;
    }

    let body=`<div class="head"><h1>${Utils.esc(tipo)}</h1></div>
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td></tr>
        <tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr>
        <tr><td><strong>Telefone:</strong> ${Utils.esc(p.telefone||'—')}</td><td><strong>Convênio/Plano:</strong> ${Utils.esc(p.convenio||'—')}</td></tr>
      </table>`;

    if(tipo==='Receita'){
      body+=`<h3>Prescrição:</h3>${(d.medicamentos||[]).map((m,i)=>{
        const titulo=[m.nome,m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao].filter(Boolean).join(' ');
        const continuo=!!m.usoContinuo || Utils.norm([m.duracao,m.orientacao,m.obs,m.periodicidadeTexto].join(' ')).includes('continuo');
        return `<div class="med"><div class="medh"><div class="medn"><strong>${i+1}. ${Utils.esc(titulo)}${continuo?' — USO CONTÍNUO':''}</strong></div><div class="medq"><strong>${Utils.esc(m.quantidade||m.quantidadeSolicitada||'')}</strong></div></div><div class="sep"></div><div class="medb">${m.via?`Via: ${Utils.esc(m.via)} `:''}${Utils.esc(m.posologia||m.periodicidadeTexto||m.freq||'')}${m.duracao?`<div>Durante ${Utils.esc(m.duracao)}</div>`:''}${m.orientacao?`<div>Orientação: ${Utils.esc(m.orientacao)}</div>`:''}</div></div>`;
      }).join('')}${d.obs?`<p><strong>Orientações:</strong> ${Utils.esc(d.obs)}</p>`:''}`;
    }else if(tipo==='Atestado' || String(tipo).toLowerCase().includes('atestado')){
      body+=`<div class="texto">Atesto para os devidos fins que o(a) paciente ${Utils.esc(p.nome||'—')} foi avaliado(a). ${d.dias?`Necessita de ${Utils.esc(d.dias)} dia(s) de afastamento.`:''} ${Utils.esc(d.texto||d.motivo||'')}</div>`;
    }else if(tipo==='Laudo' || String(tipo).toLowerCase().includes('laudo')){
      body+=`<div class="texto"><h3>${Utils.esc(d.titulo||'Laudo')}</h3><p>${Utils.esc(d.texto||d.descricao||'')}</p></div>`;
    }else if(tipo==='Pedido de Exames' || String(tipo).toLowerCase().includes('exame')){
      body+=`<h3>Exames solicitados:</h3><div style="white-space:pre-wrap">${Utils.esc(d.exames||'')}</div>${d.obs?`<p>${Utils.esc(d.obs)}</p>`:''}`;
    }

    body+=this.profHtml(d);
    this.imprimirHtml(this.base(tipo,body));
  };
})();




/* ZERO V9.8 — Impressão do atestado usa texto salvo */
(function(){
  if(!window.Impressao || Impressao.__atestadoTextoV98) return;
  Impressao.__atestadoTextoV98=true;

  const oldPrint=Impressao.print?.bind(Impressao);
  Impressao.print=function(d){
    d=Utils.clone(d||{});
    const tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';

    if(!(tipo==='Atestado' || String(tipo).toLowerCase().includes('atestado'))){
      return oldPrint(d);
    }

    const p=this.pacienteDocumentoV96 ? this.pacienteDocumentoV96(d) : (this.paciente(d.pacId||d.pacienteId)||{});
    let body=`<div class="head"><h1>${Utils.esc(tipo)}</h1></div>
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||d.pacienteNome||d.paciente||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||d.pacienteCpf||'—')}</td></tr>
        <tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||d.pacienteNascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr>
        <tr><td><strong>Telefone:</strong> ${Utils.esc(p.telefone||d.pacienteTelefone||'—')}</td><td><strong>Convênio/Plano:</strong> ${Utils.esc(p.convenio||d.pacienteConvenio||'—')}</td></tr>
      </table>`;

    body+=`<div class="texto" style="white-space:pre-wrap">${Utils.esc(d.texto||d.motivo||'')}</div>`;
    if(d.cid) body+=`<p><strong>CID-10:</strong> ${Utils.esc(d.cid)}</p>`;
    if(d.obs) body+=`<p><strong>Observações:</strong> ${Utils.esc(d.obs)}</p>`;
    body+=this.profHtml(d);
    this.imprimirHtml(this.base(tipo,body));
  };
})();




/* =========================================================
   ZERO V10.0 — Impressão do Atestado usa texto exato do modal
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__atestadoTextoExatoV100) return;
  Impressao.__atestadoTextoExatoV100=true;

  const oldPrint=Impressao.print?.bind(Impressao);

  Impressao.print=function(d){
    d=Utils.clone(d||{});
    const tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';

    if(!(tipo==='Atestado' || String(tipo).toLowerCase().includes('atestado'))){
      return oldPrint(d);
    }

    const p=this.pacienteDocumentoV96 ? this.pacienteDocumentoV96(d) : (this.paciente(d.pacId||d.pacienteId)||{});

    let body=`<div class="head"><h1>Atestado Médico</h1></div>
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||d.pacienteNome||d.paciente||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||d.pacienteCpf||'—')}</td></tr>
        <tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||d.pacienteNascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr>
        <tr><td><strong>Telefone:</strong> ${Utils.esc(p.telefone||d.pacienteTelefone||'—')}</td><td><strong>Convênio/Plano:</strong> ${Utils.esc(p.convenio||d.pacienteConvenio||'—')}</td></tr>
      </table>`;

    body+=`<div class="texto" style="white-space:pre-wrap">${Utils.esc(d.texto||d.motivo||'')}</div>`;

    if(d.cid) body+=`<p><strong>CID-10:</strong> ${Utils.esc(d.cid)}</p>`;
    if(d.obs) body+=`<p><strong>Observações:</strong> ${Utils.esc(d.obs)}</p>`;

    body+=this.profHtml(d);
    this.imprimirHtml(this.base('Atestado Médico',body));
  };
})();




/* =========================================================
   ZERO V11.2 — Impressão Receita normal e Controle Especial
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__receitaControleV112) return;
  Impressao.__receitaControleV112=true;

  Impressao.pacienteDocPrintV112=function(d){
    if(this.pacienteDocumentoV96) return this.pacienteDocumentoV96(d);
    const p=this.paciente?.(d.pacId||d.pacienteId)||{};
    return {
      nome:p.nome||d.pacienteNome||d.paciente||'—',
      cpf:p.cpf||d.pacienteCpf||'—',
      nascimento:p.nascimento||d.pacienteNascimento||'—',
      telefone:p.telefone||d.pacienteTelefone||'—',
      convenio:p.convenio||d.pacienteConvenio||'—'
    };
  };

  Impressao.htmlMedicamentosReceitaV112=function(d){
    return `<h3>Prescrição:</h3>${(d.medicamentos||[]).map((m,i)=>{
      const titulo=[m.nome,m.formula,m.formaFarmaceutica,m.apresentacao].filter(Boolean).join(' ');
      const textoCont=[m.duracao,m.orientacao,m.obs,m.posologia,m.frequencia,m.periodicidadeTexto].join(' ');
      const continuo=Utils.norm(textoCont).includes('continuo');
      return `<div class="med">
        <div class="medh">
          <div class="medn"><strong>${i+1}. ${Utils.esc(titulo)}${continuo?' — USO CONTÍNUO':''}</strong></div>
          <div class="medq"><strong>${Utils.esc(m.quantidade||m.quantidadeSolicitada||'')}</strong></div>
        </div>
        <div class="sep"></div>
        <div class="medb">
          ${m.via?`Via: ${Utils.esc(m.via)} `:''}${Utils.esc(m.posologia||m.freq||m.frequencia||m.periodicidadeTexto||'')}
          ${m.duracao?`<div>Durante ${Utils.esc(m.duracao)}</div>`:''}
          ${m.orientacao?`<div>Orientação: ${Utils.esc(m.orientacao)}</div>`:''}
        </div>
      </div>`;
    }).join('')}${d.obs?`<p><strong>Orientações:</strong> ${Utils.esc(d.obs)}</p>`:''}`;
  };

  Impressao.printReceitaControleV112=function(d){
    const p=this.pacienteDocPrintV112(d);
    const via=(n)=>`
      <div class="page">
        <div class="head"><h1>Receituário de Controle Especial</h1><div><strong>${n}ª via</strong></div></div>
        <table class="info">
          <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td></tr>
          <tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr>
          <tr><td><strong>Telefone:</strong> ${Utils.esc(p.telefone||'—')}</td><td><strong>Convênio/Plano:</strong> ${Utils.esc(p.convenio||'—')}</td></tr>
        </table>
        ${this.htmlMedicamentosReceitaV112(d)}
        ${this.profHtml(d)}
      </div>`;
    const body=`${via(1)}<div class="page-break"></div>${via(2)}`;
    this.imprimirHtml(this.base('Receituário de Controle Especial',body)+`<style>.page-break{page-break-before:always}.page{min-height:98vh}</style>`);
  };

  const oldPrint=Impressao.print?.bind(Impressao);
  Impressao.print=function(d){
    d=Utils.clone(d||{});
    const tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';
    if(tipo==='Receita' && d.tipoPrint==='receita-controle'){
      return this.printReceitaControleV112(d);
    }
    if(tipo==='Receita'){
      const p=this.pacienteDocPrintV112(d);
      let body=`<div class="head"><h1>Receita Médica</h1></div>
        <table class="info">
          <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td></tr>
          <tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr>
          <tr><td><strong>Telefone:</strong> ${Utils.esc(p.telefone||'—')}</td><td><strong>Convênio/Plano:</strong> ${Utils.esc(p.convenio||'—')}</td></tr>
        </table>`;
      body+=this.htmlMedicamentosReceitaV112(d);
      body+=this.profHtml(d);
      return this.imprimirHtml(this.base('Receita Médica',body));
    }
    return oldPrint(d);
  };
})();




/* =========================================================
   ZERO V12.1 — Impressão respeita assinatura profissional ativa/desativada
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__assinaturaToggleV121) return;
  Impressao.__assinaturaToggleV121=true;

  Impressao.profissionalDaImpressaoV121=function(d={}){
    const profs=Store.get('PROFISSIONAIS')||[];
    let p=null;

    if(d.profissionalId) p=profs.find(x=>String(x.id)===String(d.profissionalId));
    if(!p && d.medico) p=profs.find(x=>String(x.nome||'')===String(d.medico));
    if(!p && d.profissional) p=profs.find(x=>String(x.nome||'')===String(d.profissional));
    if(!p && window.Profissionais?.atual) p=Profissionais.atual();

    return p||{};
  };

  Impressao.profHtml=function(d={}){
    const p=this.profissionalDaImpressaoV121(d);
    if(p && p.assinaturaAtiva===false) return '';

    const nome=d.assinatura || p.assinatura || p.nomeAssinatura || d.medico || d.profissional || p.nome || '';
    const cons=d.conselho || d.crm || (window.Profissionais?.conselho ? Profissionais.conselho(p) : (p.conselho||''));

    if(!String(nome||'').trim() && !String(cons||'').trim()) return '';

    return `<div class="assinatura-medico" style="text-align:center;margin-top:60px">
      <div style="border-top:1px solid #111;width:52mm;margin:0 auto 5px"></div>
      <div><strong>${Utils.esc(nome)}</strong></div>
      <div style="font-size:12px">${Utils.esc(cons)}</div>
    </div>`;
  };
})();




/* =========================================================
   ZERO V12.4 — Impressões: sem Convênio/Plano, com CID
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__semConvenioComCidV124) return;
  Impressao.__semConvenioComCidV124=true;

  Impressao.infoPacienteCidV124=function(d={},titulo='Documento'){
    const p=this.pacienteDocPrintV112 ? this.pacienteDocPrintV112(d) : (this.paciente(d.pacId||d.pacienteId)||{});
    return `<div class="head"><h1>${Utils.esc(titulo)}</h1></div>
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||d.paciente||d.pacienteNome||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||d.pacienteCpf||'—')}</td></tr>
        <tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||d.pacienteNascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr>
        <tr><td colspan="2"><strong>CID:</strong> ${Utils.esc(d.cid||d.cid10||'—')}</td></tr>
      </table>`;
  };

  const oldPrintV124=Impressao.print?.bind(Impressao);
  Impressao.print=function(d){
    d=Utils.clone(d||{});
    const tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';

    if(tipo==='Exame anexado' && d.dataUrl){
      const w=window.open(d.dataUrl,'_blank'); if(!w)Utils.toast('Pop-up bloqueado.'); return;
    }

    if(tipo==='Receita' && d.tipoPrint==='receita-controle' && this.printReceitaControleV112){
      const via=(n)=>`<div class="page">
        ${this.infoPacienteCidV124(d,`Receituário de Controle Especial — ${n}ª via`)}
        ${this.htmlMedicamentosReceitaV112 ? this.htmlMedicamentosReceitaV112(d) : ''}
        ${this.profHtml(d)}
      </div>`;
      return this.imprimirHtml(this.base('Receituário de Controle Especial',`${via(1)}<div class="page-break"></div>${via(2)}`)+`<style>.page-break{page-break-before:always}.page{min-height:98vh}</style>`);
    }

    if(tipo==='Receita'){
      let body=this.infoPacienteCidV124(d,'Receita Médica');
      body+=this.htmlMedicamentosReceitaV112 ? this.htmlMedicamentosReceitaV112(d) : '';
      body+=this.profHtml(d);
      return this.imprimirHtml(this.base('Receita Médica',body));
    }

    if(tipo==='Atestado'){
      let body=this.infoPacienteCidV124(d,'Atestado');
      body+=`<div class="texto">${Utils.esc(d.texto||d.motivo||'').replace(/\n/g,'<br>')}</div>`;
      body+=this.profHtml(d);
      return this.imprimirHtml(this.base('Atestado',body));
    }

    if(tipo==='Laudo'){
      let body=this.infoPacienteCidV124(d,'Laudo');
      body+=`<div class="texto"><h3>${Utils.esc(d.titulo||'Laudo')}</h3><p>${Utils.esc(d.texto||'').replace(/\n/g,'<br>')}</p></div>`;
      body+=this.profHtml(d);
      return this.imprimirHtml(this.base('Laudo',body));
    }

    if(tipo==='Pedido de Exames'){
      let body=this.infoPacienteCidV124(d,'Pedido de Exames');
      body+=`<h3>Exames solicitados:</h3><div style="white-space:pre-wrap">${Utils.esc(d.exames||'')}</div>${d.obs?`<p>${Utils.esc(d.obs)}</p>`:''}`;
      body+=this.profHtml(d);
      return this.imprimirHtml(this.base('Pedido de Exames',body));
    }

    return oldPrintV124(d);
  };
})();


/* =========================================================
   ZERO V13.4 — Impressão de receita sem CID
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__receitaSemCidV134) return;
  Impressao.__receitaSemCidV134=true;

  Impressao.infoPacienteReceitaSemCidV134=function(d={},titulo='Receita Médica'){
    const p=this.pacienteDocPrintV112 ? this.pacienteDocPrintV112(d) : (this.paciente(d.pacId||d.pacienteId)||{});
    return `<div class="head"><h1>${Utils.esc(titulo)}</h1></div>
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||d.paciente||d.pacienteNome||'—')}</td><td><strong>CPF:</strong> ${Utils.esc(p.cpf||d.pacienteCpf||'—')}</td></tr>
        <tr><td><strong>Nascimento:</strong> ${Utils.esc(p.nascimento||d.pacienteNascimento||'—')}</td><td><strong>Data:</strong> ${Utils.esc(d.data||Utils.today())}</td></tr>
      </table>`;
  };

  const oldPrintV134=Impressao.print?.bind(Impressao);
  Impressao.print=function(d){
    d=Utils.clone(d||{});
    const tipo=d.tipoDoc||d.tipoDocumento||d.tipo||'Documento';
    if(tipo==='Receita' && d.tipoPrint==='receita-controle'){
      const via=(n)=>`<div class="page">${this.infoPacienteReceitaSemCidV134(d,`Receituário de Controle Especial — ${n}ª via`)}${this.htmlMedicamentosReceitaV112?this.htmlMedicamentosReceitaV112(d):''}${this.profHtml(d)}</div>`;
      return this.imprimirHtml(this.base('Receituário de Controle Especial',`${via(1)}<div class="page-break"></div>${via(2)}`)+`<style>.page-break{page-break-before:always}.page{min-height:98vh}</style>`);
    }
    if(tipo==='Receita'){
      let body=this.infoPacienteReceitaSemCidV134(d,'Receita Médica');
      body+=this.htmlMedicamentosReceitaV112?this.htmlMedicamentosReceitaV112(d):'';
      body+=this.profHtml(d);
      return this.imprimirHtml(this.base('Receita Médica',body));
    }
    return oldPrintV134(d);
  };
})();



/* =========================================================
   ZERO V19.4 — Receita impressa sem palavra "Personalizado"
   Correção:
   - Se a periodicidade for Personalizado, a impressão mostra só o texto digitado.
   - Remove "Personalizado:" / "Personalizado -" / "Personalizado" da receita impressa.
   - Mantém a frequência personalizada, exemplo: "1X POR SEMANA".
========================================================= */
(function(){
  if(!window.Impressao || Impressao.__receitaSemPersonalizadoPrintV194) return;
  Impressao.__receitaSemPersonalizadoPrintV194=true;

  Impressao.limparPersonalizadoReceitaV194=function(v){
    let s=String(v||'').trim();
    if(!s) return '';

    s=s
      .replace(/\bPersonalizado\s*[:：]\s*/gi,'')
      .replace(/\bPersonalizado\s*[-–—]\s*/gi,'')
      .replace(/\s*[-–—]\s*Personalizado\b/gi,'')
      .replace(/\bPersonalizado\b/gi,'')
      .replace(/\s+[:：]\s+/g,' ')
      .replace(/\s*[-–—]\s*[-–—]\s*/g,' - ')
      .replace(/\s{2,}/g,' ')
      .replace(/\s+([,.;:])/g,'$1')
      .replace(/^\s*[-–—:]\s*/,'')
      .replace(/\s*[-–—:]\s*$/,'')
      .trim();

    return s;
  };

  Impressao.textoFrequenciaReceitaV194=function(m={}){
    const candidatos=[
      m.posologia,
      m.freqPersonalizada,
      m.frequenciaPersonalizada,
      m.periodicidadePersonalizada,
      m.periodicidadeTexto,
      m.periodicidadesTexto,
      m.freq,
      m.frequencia,
      m.periodicidade
    ].filter(v=>String(v||'').trim());

    let texto=candidatos[0]||'';

    // Se o valor principal for só "Personalizado", usa o texto personalizado.
    if(/^personalizado$/i.test(String(texto).trim())){
      texto=m.freqPersonalizada || m.frequenciaPersonalizada || m.periodicidadePersonalizada || m.periodicidadeTexto || m.periodicidadesTexto || '';
    }

    return this.limparPersonalizadoReceitaV194(texto);
  };

  Impressao.htmlMedicamentosReceitaV112=function(d){
    return `<h3>Prescrição:</h3>${(d.medicamentos||[]).map((m,i)=>{
      const titulo=[m.nome,m.formula,m.formaFarmaceutica,m.apresentacao].filter(Boolean).join(' ');
      const frequencia=this.textoFrequenciaReceitaV194(m);
      const duracao=this.limparPersonalizadoReceitaV194(m.duracao||'');
      const orientacao=this.limparPersonalizadoReceitaV194(m.orientacao||'');
      const obs=this.limparPersonalizadoReceitaV194(m.obs||'');
      const textoCont=[duracao,orientacao,obs,frequencia,m.periodicidadeTexto,m.periodicidadesTexto].join(' ');
      const continuo=Utils.norm(textoCont).includes('continuo');

      return `<div class="med">
        <div class="medh">
          <div class="medn"><strong>${i+1}. ${Utils.esc(titulo)}${continuo?' — USO CONTÍNUO':''}</strong></div>
          <div class="medq"><strong>${Utils.esc(m.quantidade||m.quantidadeSolicitada||'')}</strong></div>
        </div>
        <div class="sep"></div>
        <div class="medb">
          ${m.via?`Via: ${Utils.esc(this.limparPersonalizadoReceitaV194(m.via))} `:''}${Utils.esc(frequencia)}
          ${duracao?`<div>Durante ${Utils.esc(duracao)}</div>`:''}
          ${orientacao?`<div>Orientação: ${Utils.esc(orientacao)}</div>`:''}
        </div>
      </div>`;
    }).join('')}${d.obs?`<p><strong>Orientações:</strong> ${Utils.esc(this.limparPersonalizadoReceitaV194(d.obs))}</p>`:''}`;
  };
})();
