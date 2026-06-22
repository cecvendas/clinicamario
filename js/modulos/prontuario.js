window.Prontuario={
  paciente:null,
  tab:'historico',
  _blobUrls:[],

  renderBusca(){
    const pacs=Pacientes.list();
    document.getElementById('content').innerHTML=`<div class="card">
      <h3>Selecionar paciente</h3>
      <table class="table">
        <thead><tr><th>Nome</th><th>CPF</th><th></th></tr></thead>
        <tbody>${pacs.map(p=>`<tr>
          <td>${Utils.esc(p.nome)}</td>
          <td>${Utils.esc(p.cpf||'')}</td>
          <td><button class="btn btn-blue btn-sm" onclick="Prontuario.abrir('${p.id}')">Abrir Prontuário</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  },

  abrir(pacId,tab='historico'){
    this.paciente=Store.get('PACIENTES').find(p=>p.id===pacId);
    this.tab=tab;
    Router.route='pacientes';
    document.getElementById('page-title').textContent='Prontuário';
    document.getElementById('page-subtitle').textContent='Histórico do paciente';
    this.render();
  },

  docs(key){
    return Store.get(key).filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id);
  },

  findDoc(tipo,id){
    id=String(id||'');
    const keys={
      'Receita':'RECEITAS',
      'Atestado':'ATESTADOS',
      'Laudo':'LAUDOS',
      'Pedido de Exames':'EXAMES_PEDIDOS',
      'Exame anexado':'EXAMES_ARQUIVOS'
    };

    if(keys[tipo]){
      const d=Store.get(keys[tipo]).find(x=>String(x.id)===id);
      if(d) return {...d,tipoDoc:tipo};
    }

    const h=Store.get('HISTORICO');
    for(const item of h){
      const docs=(item.documentos||item.documentosAtendimento||[]);
      const d=docs.find(x=>String(x.id)===id && String(x.tipoDoc||x.tipoDocumento||x.tipo||'')===tipo);
      if(d) return {...d,tipoDoc:tipo};
    }

    return null;
  },

  dataUrlToBlobUrl(dataUrl){
    if(!dataUrl) return '';
    if(!String(dataUrl).startsWith('data:')) return dataUrl;

    try{
      const parts=String(dataUrl).split(',');
      const meta=parts[0]||'';
      const b64=parts.slice(1).join(',');
      const mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';
      const bin=atob(b64);
      const len=bin.length;
      const bytes=new Uint8Array(len);
      for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i);
      const blob=new Blob([bytes],{type:mime});
      const url=URL.createObjectURL(blob);
      this._blobUrls.push(url);
      return url;
    }catch(e){
      console.error('Falha ao converter exame para Blob URL',e);
      return dataUrl;
    }
  },

  limparBlobUrls(){
    try{
      this._blobUrls.forEach(u=>URL.revokeObjectURL(u));
      this._blobUrls=[];
    }catch(e){}
  },

  pacienteAtualDoc(d){
    return Store.get('PACIENTES').find(p=>p.id===(d.pacId||d.pacienteId)) || this.paciente || {};
  },

  htmlDoc(tipo,d){
    const p=this.pacienteAtualDoc(d);

    if(tipo==='Pedido de Exames'){
      return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;line-height:1.6;">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px;font-size:13px;color:#475569;">
          <div><strong>Paciente:</strong><br>${Utils.esc(p.nome||'—')}</div>
          <div><strong>Data:</strong><br>${Utils.esc(d.data||'—')}</div>
          <div><strong>Médico:</strong><br>${Utils.esc(d.medico||'—')}</div>
          <div><strong>ID:</strong><br>${Utils.esc(d.id||'—')}</div>
        </div>
        <h3 style="margin:0 0 8px;color:#0f172a;">Exames solicitados</h3>
        <div style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;font-size:15px;">${Utils.esc(d.exames||d.lista||'—')}</div>
        ${d.obs?`<h3 style="margin:16px 0 8px;color:#0f172a;">Observações</h3><div style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">${Utils.esc(d.obs)}</div>`:''}
      </div>`;
    }

    if(tipo==='Receita'){
      return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;">
        <p><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</p>
        <p><strong>Data:</strong> ${Utils.esc(d.data||'—')}</p>
        <h3>Medicamentos</h3>
        ${(d.medicamentos||[]).map((m,i)=>`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin:8px 0;">
          <strong>${i+1}. ${Utils.esc(m.nome||m.principio||'Medicamento')}</strong>
          <div>${Utils.esc(m.posologia||m.freq||m.frequencia||'')}</div>
          ${m.quantidade?`<div><strong>Qtd:</strong> ${Utils.esc(m.quantidade)}</div>`:''}
          ${m.duracao?`<div><strong>Duração:</strong> ${Utils.esc(m.duracao)}</div>`:''}
        </div>`).join('')}
        ${d.obs?`<p><strong>Obs:</strong> ${Utils.esc(d.obs)}</p>`:''}
      </div>`;
    }

    if(tipo==='Atestado'){
      return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;line-height:1.7;">
        <p><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</p>
        <p><strong>Tipo:</strong> ${Utils.esc(d.tipo||'Atestado')}</p>
        ${d.dias?`<p><strong>Dias:</strong> ${Utils.esc(d.dias)}</p>`:''}
        ${d.cid?`<p><strong>CID:</strong> ${Utils.esc(d.cid)}</p>`:''}
        <p style="white-space:pre-wrap;">${Utils.esc(d.texto||d.motivo||'')}</p>
      </div>`;
    }

    if(tipo==='Laudo'){
      return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;line-height:1.7;">
        <p><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</p>
        <h3>${Utils.esc(d.titulo||'Laudo médico')}</h3>
        ${d.cid?`<p><strong>CID:</strong> ${Utils.esc(d.cid)}</p>`:''}
        <p style="white-space:pre-wrap;">${Utils.esc(d.texto||d.descricao||d.conclusao||'')}</p>
      </div>`;
    }

    return `<pre style="white-space:pre-wrap;margin:0;font-family:inherit;">${Utils.esc(JSON.stringify(d,null,2))}</pre>`;
  },

  visualizarDoc(tipo,id){
    const d=this.findDoc(tipo,id);
    if(!d) return Utils.toast('Documento não encontrado.');

    if(tipo==='Exame anexado'){
      return this.visualizarExame(id);
    }

    Modal.open(tipo,this.htmlDoc(tipo,d),`<button class="btn btn-ghost" onclick="Modal.close()">Fechar</button><button class="btn btn-blue" onclick="Prontuario.imprimirDoc('${tipo}','${id}')">Imprimir</button>`,'lg');
  },

  imprimirDoc(tipo,id){
    const d=this.findDoc(tipo,id);
    if(!d) return Utils.toast('Documento não encontrado.');
    Impressao.print(d);
  },

  visualizarExame(id){
    this.limparBlobUrls();

    const d=this.findDoc('Exame anexado',id);
    if(!d) return Utils.toast('Exame não encontrado.');

    const nome=Utils.esc(d.nome||d.nome_arquivo||d.filename||'Exame anexado');
    const raw=d.dataUrl||d.url||d.base64||d.conteudo||d.arquivo||'';
    const src=this.dataUrlToBlobUrl(raw);
    const mime=String(d.mime||d.mime_type||'').toLowerCase() || String(raw).slice(0,80).toLowerCase();

    if(!src){
      return Modal.open('🔬 Exame / Anexo',`
        <p><strong>Arquivo:</strong> ${nome}</p>
        <p>Este anexo não possui arquivo salvo para visualização.</p>
        ${d.obs?`<p><strong>Obs:</strong> ${Utils.esc(d.obs)}</p>`:''}
      `,`<button class="btn btn-blue" onclick="Modal.close()">Fechar</button>`);
    }

    let corpo='';
    if(mime.includes('image') || String(raw).startsWith('data:image')){
      corpo=`<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:12px;text-align:center;">
        <img src="${src}" style="max-width:100%;max-height:74vh;border-radius:10px;display:block;margin:0 auto;background:#fff;">
      </div>`;
    }else if(mime.includes('pdf') || String(raw).startsWith('data:application/pdf')){
      corpo=`<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:10px;">
        <iframe src="${src}#toolbar=1&navpanes=0&view=FitH" style="width:100%;height:78vh;border:0;border-radius:10px;background:#fff;"></iframe>
      </div>`;
    }else{
      corpo=`<p><strong>Arquivo:</strong> ${nome}</p>
      <button class="btn btn-blue" onclick="Prontuario.abrirArquivoExame('${id}')">Abrir arquivo</button>`;
    }

    Modal.open('🔬 Visualizar Exame',`
      <div style="font-size:13px;color:#64748b;margin-bottom:10px;">${nome}</div>
      ${corpo}
    `,`<button class="btn btn-ghost" onclick="Modal.close();Prontuario.limparBlobUrls()">Fechar</button><button class="btn btn-blue" onclick="Prontuario.abrirArquivoExame('${id}')">Abrir em nova aba</button>`,'lg');
  },

  abrirArquivoExame(id){
    const d=this.findDoc('Exame anexado',id);
    if(!d) return Utils.toast('Exame não encontrado.');

    const raw=d.dataUrl||d.url||d.base64||d.conteudo||d.arquivo||'';
    if(!raw) return Utils.toast('Arquivo do exame não encontrado.');

    const src=this.dataUrlToBlobUrl(raw);
    const w=window.open(src,'_blank');
    if(!w) Utils.toast('Pop-up bloqueado. Permita pop-ups para abrir o exame.');
  },

  render(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>${Utils.esc(p.nome)}</h3>
          <div class="doc-sub">CPF: ${Utils.esc(p.cpf||'—')} • Nascimento: ${Utils.esc(p.nascimento||'—')} • Convênio: ${Utils.esc(p.convenio||'—')}</div>
        </div>
        <button class="btn btn-blue" onclick="RegistrarConsulta.open('${p.id}')">+ Registrar Consulta</button>
      </div>
    </div>
    <div class="tabs">
      ${['historico','receitas','atestados','laudos','exames'].map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
    </div>
    <div>${this.renderTab()}</div>`;
  },

  renderTab(){
    if(this.tab==='historico')return this.renderHistorico();
    if(this.tab==='receitas')return this.renderDocs('RECEITAS','Receita');
    if(this.tab==='atestados')return this.renderDocs('ATESTADOS','Atestado');
    if(this.tab==='laudos')return this.renderDocs('LAUDOS','Laudo');
    if(this.tab==='exames')return this.renderExames();
  },

  renderHistorico(){
    let h=Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id).reverse();

    return h.length?h.map(x=>`<div class="card">
      <div class="row between"><strong>Consulta — ${x.data}</strong><span>${Utils.esc(x.medico||'')}</span></div>
      <p><strong>Evolução:</strong> ${Utils.esc(x.evolucao||'')}</p>
      <p><strong>Conduta:</strong> ${Utils.esc(x.conduta||'')}</p>
      <div class="grid">
        ${(x.documentos||[]).map(d=>`
          <div class="doc-card">
            <div>
              <div class="doc-title">${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</div>
              <div class="doc-sub">${Utils.esc(Documentos.resumo(d))}</div>
            </div>
            <div class="doc-actions">
              <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
              <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`).join(''):`<div class="card">Nenhum histórico.</div>`;
  },

  renderDocs(key,tipo){
    let list=this.docs(key).reverse();
    return list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(tipo)} ${tipo} — ${d.data||''}</strong>
          <div class="doc-sub">${Utils.esc(Documentos.resumo({...d,tipoDoc:tipo}))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${tipo}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${tipo}','${d.id}')">🖨️ Imprimir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum documento.</div>`;
  },

  renderExames(){
    let pedidos=this.docs('EXAMES_PEDIDOS').map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    let anexos=this.docs('EXAMES_ARQUIVOS').map(x=>({...x,tipoDoc:'Exame anexado'}));
    let list=pedidos.concat(anexos).reverse();

    return `<div class="card">
      <div class="row between"><strong>Exames do paciente</strong><span class="badge">${list.length}</span></div>
    </div>
    ${list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</strong>
          <div class="doc-sub">${Utils.esc(Documentos.resumo(d))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir/Abrir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum exame.</div>`}`;
  }
};



/* =========================================================
   ZERO V1.9 — visualizador de exames estilo original
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.fecharVisualizadorExame = function(){
    const el=document.getElementById('cm-exame-viewer');
    if(el) el.remove();
    if(typeof this.limparBlobUrls==='function') this.limparBlobUrls();
  };

  Prontuario.visualizarExame = function(id){
    this.limparBlobUrls && this.limparBlobUrls();

    const d=this.findDoc('Exame anexado',id);
    if(!d) return Utils.toast('Exame não encontrado.');

    const nome=Utils.esc(d.nome||d.nome_arquivo||d.filename||'Exame anexado');
    const raw=d.dataUrl||d.url||d.base64||d.conteudo||d.arquivo||'';
    const src=this.dataUrlToBlobUrl ? this.dataUrlToBlobUrl(raw) : raw;
    const mime=String(d.mime||d.mime_type||'').toLowerCase() || String(raw).slice(0,80).toLowerCase();

    if(!src){
      Modal.open('🔬 Exame / Anexo',`
        <p><strong>Arquivo:</strong> ${nome}</p>
        <p>Este anexo não possui arquivo salvo para visualização.</p>
        ${d.obs?`<p><strong>Obs:</strong> ${Utils.esc(d.obs)}</p>`:''}
      `,`<button class="btn btn-blue" onclick="Modal.close()">Fechar</button>`);
      return;
    }

    const old=document.getElementById('cm-exame-viewer');
    if(old) old.remove();

    let viewer='';
    if(mime.includes('image') || String(raw).startsWith('data:image')){
      viewer=`<img class="cm-exame-img" src="${src}" alt="${nome}">`;
    }else if(mime.includes('pdf') || String(raw).startsWith('data:application/pdf')){
      viewer=`<iframe class="cm-exame-frame" src="${src}#toolbar=1&navpanes=0&scrollbar=1&view=FitH"></iframe>`;
    }else{
      viewer=`<div style="text-align:center;padding:30px;">
        <p><strong>Arquivo:</strong> ${nome}</p>
        <button class="btn btn-blue" onclick="Prontuario.abrirArquivoExame('${id}')">Abrir arquivo</button>
      </div>`;
    }

    const div=document.createElement('div');
    div.id='cm-exame-viewer';
    div.className='cm-exame-view-backdrop';
    div.innerHTML=`
      <div class="cm-exame-view-modal">
        <div class="cm-exame-view-header">
          <div style="min-width:0;">
            <div class="cm-exame-view-title">🔬 Visualizar Exame</div>
            <div class="cm-exame-view-file">${nome}</div>
          </div>
          <button class="cm-exame-view-close" onclick="Prontuario.fecharVisualizadorExame()">×</button>
        </div>
        <div class="cm-exame-view-body">
          <div class="cm-exame-toolbar">
            <button class="btn btn-outline btn-sm" onclick="Prontuario.abrirArquivoExame('${id}')">Abrir em nova aba</button>
            <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('Exame anexado','${id}')">Imprimir</button>
          </div>
          <div class="cm-exame-frame-wrap">
            ${viewer}
          </div>
        </div>
      </div>
    `;

    div.addEventListener('click', function(ev){
      if(ev.target===div) Prontuario.fecharVisualizadorExame();
    });

    document.body.appendChild(div);
  };

  Prontuario.imprimirDoc = function(tipo,id){
    const d=this.findDoc(tipo,id);
    if(!d) return Utils.toast('Documento não encontrado.');

    if(tipo==='Exame anexado'){
      const raw=d.dataUrl||d.url||d.base64||d.conteudo||d.arquivo||'';
      if(!raw) return Utils.toast('Arquivo do exame não encontrado.');
      const src=this.dataUrlToBlobUrl ? this.dataUrlToBlobUrl(raw) : raw;
      const w=window.open(src,'_blank');
      if(!w) return Utils.toast('Pop-up bloqueado. Permita pop-ups para imprimir o exame.');
      setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} },700);
      return;
    }

    Impressao.print(d);
  };
})();




/* =========================================================
   ZERO V2.2 — ordem nova->antiga e histórico com sinais vitais
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.dateValue = function(d){
    if(!d) return 0;
    if(d.criadoEm){
      const t=Date.parse(d.criadoEm);
      if(!isNaN(t)) return t;
    }
    const s=String(d.data||'');
    const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
    const t=Date.parse(s);
    return isNaN(t)?0:t;
  };

  Prontuario.sortDesc = function(list){
    return (list||[]).slice().sort((a,b)=>this.dateValue(b)-this.dateValue(a));
  };

  Prontuario.sinaisHtml = function(sv){
    sv=sv||{};
    const itens=[
      ['PA',sv.pa],
      ['FC',sv.fc],
      ['FR',sv.fr],
      ['Temp.',sv.temp],
      ['SpO₂',sv.spo2],
      ['Peso',sv.peso],
      ['Altura',sv.altura],
      ['Glicemia',sv.glicemia]
    ].filter(x=>String(x[1]||'').trim());

    if(!itens.length) return '';

    return `<div class="cm-section" style="margin-top:10px;">
      <div class="cm-section-title">❤️ Sinais vitais</div>
      <div class="vitais-grid">
        ${itens.map(([l,v])=>`<div class="vital-mini"><strong>${Utils.esc(l)}</strong><span>${Utils.esc(v)}</span></div>`).join('')}
      </div>
    </div>`;
  };

  Prontuario.tipoDoc = function(d){
    const t=String(d.tipoDoc||d.tipoDocumento||d.tipo||'Documento');
    const n=Utils.norm(t);
    if(n.includes('receita')) return 'Receita';
    if(n.includes('atestado')||n.includes('comparecimento')) return 'Atestado';
    if(n.includes('laudo')) return 'Laudo';
    if(n.includes('pedido')) return 'Pedido de Exames';
    if(n.includes('anex')||n==='exame') return 'Exame anexado';
    return t;
  };

  Prontuario.resumoDoc = function(d){
    const tipo=this.tipoDoc(d);
    if(tipo==='Receita') return (d.medicamentos||[]).map(m=>m.nome||m.principio||m.medicamento).filter(Boolean).join(', ') || 'Receita médica';
    if(tipo==='Atestado') return [d.tipo||'Atestado', d.dias?`${d.dias} dia(s)`:'' , d.texto||d.motivo||''].filter(Boolean).join(' • ');
    if(tipo==='Laudo') return d.titulo||d.texto||d.descricao||'Laudo médico';
    if(tipo==='Pedido de Exames') return d.exames||d.lista||'Pedido de exames';
    if(tipo==='Exame anexado') return d.nome||d.filename||d.nome_arquivo||'Exame anexado';
    return 'Documento';
  };

  Prontuario.renderHistorico = function(){
    let h=this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));

    return h.length?h.map(x=>{
      const docs=(x.documentos||x.documentosAtendimento||[]).map(d=>({...d,tipoDoc:this.tipoDoc(d)}));
      return `<div class="hist-card">
        <div class="hist-head">
          <div class="hist-title">Consulta — ${Utils.esc(x.data||'')}</div>
          <div class="hist-medico">${Utils.esc(x.medico||'')}</div>
        </div>

        ${this.sinaisHtml(x.sinaisVitais)}

        <div class="hist-block"><strong>Evolução:</strong><br>${Utils.esc(x.evolucao||'—')}</div>
        <div class="hist-block"><strong>Conduta:</strong><br>${Utils.esc(x.conduta||'—')}</div>
        ${x.obs?`<div class="hist-block"><strong>Observações:</strong><br>${Utils.esc(x.obs)}</div>`:''}

        ${docs.length?`<div style="margin-top:12px;">
          <strong>Documentos do atendimento</strong>
          ${docs.map(d=>`
            <div class="hist-doc">
              <div class="hist-doc-main">
                <div class="hist-doc-title">${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</div>
                <div class="hist-doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
              </div>
              <div class="doc-actions">
                <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
                <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir</button>
              </div>
            </div>
          `).join('')}
        </div>`:''}
      </div>`;
    }).join(''):`<div class="card">Nenhum histórico.</div>`;
  };

  Prontuario.renderDocs = function(key,tipo){
    let list=this.sortDesc(this.docs(key));
    return list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(tipo)} ${tipo} — ${d.data||''}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc({...d,tipoDoc:tipo}))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${tipo}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${tipo}','${d.id}')">🖨️ Imprimir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum documento.</div>`;
  };

  Prontuario.renderExames = function(){
    let pedidos=this.docs('EXAMES_PEDIDOS').map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    let anexos=this.docs('EXAMES_ARQUIVOS').map(x=>({...x,tipoDoc:'Exame anexado'}));
    let list=this.sortDesc(pedidos.concat(anexos));

    return `<div class="card">
      <div class="row between"><strong>Exames do paciente</strong><span class="badge">${list.length}</span></div>
    </div>
    ${list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)} — ${Utils.esc(d.data||'')}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir/Abrir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum exame.</div>`}`;
  };

})();




/* =========================================================
   ZERO V2.3 — prontuário com menu Sinais Vitais e Histórico no padrão original
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.tabs = ['historico','sinais','receitas','atestados','laudos','exames'];

  Prontuario.tabLabel = function(t){
    return {
      historico:'Histórico',
      sinais:'Sinais Vitais',
      receitas:'Receitas',
      atestados:'Atestados',
      laudos:'Laudos',
      exames:'Exames'
    }[t] || t;
  };

  Prontuario.dateValue = function(d){
    if(!d) return 0;
    if(d.criadoEm){
      const t=Date.parse(d.criadoEm);
      if(!isNaN(t)) return t;
    }
    const s=String(d.data||'');
    const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
    const t=Date.parse(s);
    return isNaN(t)?0:t;
  };

  Prontuario.sortDesc = function(list){
    return (list||[]).slice().sort((a,b)=>this.dateValue(b)-this.dateValue(a));
  };

  Prontuario.tipoDoc = function(d){
    const t=String(d.tipoDoc||d.tipoDocumento||d.tipo||'Documento');
    const n=Utils.norm(t);
    if(n.includes('receita')) return 'Receita';
    if(n.includes('atestado')||n.includes('comparecimento')) return 'Atestado';
    if(n.includes('laudo')) return 'Laudo';
    if(n.includes('pedido')) return 'Pedido de Exames';
    if(n.includes('anex')||n==='exame') return 'Exame anexado';
    return t;
  };

  Prontuario.resumoDoc = function(d){
    const tipo=this.tipoDoc(d);
    if(tipo==='Receita') return (d.medicamentos||[]).map(m=>m.nome||m.principio||m.medicamento).filter(Boolean).join(', ') || 'Receita médica';
    if(tipo==='Atestado') return [d.tipo||'Atestado', d.dias?`${d.dias} dia(s)`:'' , d.texto||d.motivo||''].filter(Boolean).join(' • ');
    if(tipo==='Laudo') return d.titulo||d.texto||d.descricao||'Laudo médico';
    if(tipo==='Pedido de Exames') return d.exames||d.lista||'Pedido de exames';
    if(tipo==='Exame anexado') return d.nome||d.filename||d.nome_arquivo||'Exame anexado';
    return 'Documento';
  };

  Prontuario.hasSinais = function(sv){
    return sv && Object.values(sv).some(v=>String(v||'').trim());
  };

  Prontuario.sinaisGrid = function(sv){
    sv=sv||{};
    const itens=[
      ['PA',sv.pa],
      ['FC',sv.fc],
      ['FR',sv.fr],
      ['Temperatura',sv.temp],
      ['Saturação',sv.spo2],
      ['Peso',sv.peso],
      ['Altura',sv.altura],
      ['Glicemia',sv.glicemia]
    ].filter(x=>String(x[1]||'').trim());

    if(!itens.length) return '<div class="sinais-empty">Sem sinais vitais registrados neste atendimento.</div>';

    return `<div class="sinais-page-grid">
      ${itens.map(([l,v])=>`<div class="sinais-page-card"><strong>${Utils.esc(l)}</strong><span>${Utils.esc(v)}</span></div>`).join('')}
    </div>`;
  };

  Prontuario.render = function(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>${Utils.esc(p.nome)}</h3>
          <div class="doc-sub">CPF: ${Utils.esc(p.cpf||'—')} • Nascimento: ${Utils.esc(p.nascimento||'—')} • Convênio: ${Utils.esc(p.convenio||'—')}</div>
        </div>
        <button class="btn btn-blue" onclick="RegistrarConsulta.open('${p.id}')">+ Registrar Consulta</button>
      </div>
    </div>

    <div class="pront-menu">
      ${this.tabs.map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${this.tabLabel(t)}</button>`).join('')}
    </div>

    <div>${this.renderTab()}</div>`;
  };

  Prontuario.renderTab = function(){
    if(this.tab==='historico')return this.renderHistorico();
    if(this.tab==='sinais')return this.renderSinaisVitais();
    if(this.tab==='receitas')return this.renderDocs('RECEITAS','Receita');
    if(this.tab==='atestados')return this.renderDocs('ATESTADOS','Atestado');
    if(this.tab==='laudos')return this.renderDocs('LAUDOS','Laudo');
    if(this.tab==='exames')return this.renderExames();
    return this.renderHistorico();
  };

  Prontuario.renderHistorico = function(){
    let h=this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));

    return h.length?h.map(x=>{
      const docs=(x.documentos||x.documentosAtendimento||[]).map(d=>({...d,tipoDoc:this.tipoDoc(d)}));

      return `<div class="hist-original-card">
        <div class="hist-original-head">
          <div class="hist-original-title">Consulta — ${Utils.esc(x.data||'')}</div>
          <div class="hist-original-medico">${Utils.esc(x.medico||'')}</div>
        </div>

        <div class="hist-original-line"><strong>Evolução:</strong> ${Utils.esc(x.evolucao||'—')}</div>
        <div class="hist-original-line"><strong>Conduta:</strong> ${Utils.esc(x.conduta||'—')}</div>
        ${x.obs?`<div class="hist-original-line"><strong>Observações:</strong> ${Utils.esc(x.obs)}</div>`:''}

        ${docs.length?`<div class="hist-original-docs">
          ${docs.map(d=>`
            <div class="hist-original-doc">
              <div>
                <div class="hist-original-doc-title">${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</div>
                <div class="hist-original-doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
              </div>
              <div class="doc-actions">
                <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
                <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir</button>
              </div>
            </div>
          `).join('')}
        </div>`:''}
      </div>`;
    }).join(''):`<div class="card">Nenhum histórico.</div>`;
  };

  Prontuario.renderSinaisVitais = function(){
    let h=this.sortDesc(Store.get('HISTORICO').filter(x=>
      (x.pacId===this.paciente.id||x.pacienteId===this.paciente.id) && this.hasSinais(x.sinaisVitais)
    ));

    return `<div class="card">
      <div class="row between">
        <div>
          <h3>Sinais Vitais</h3>
          <p style="color:#64748b;margin-top:4px">Registros de sinais vitais lançados durante os atendimentos.</p>
        </div>
        <span class="badge">${h.length} registro(s)</span>
      </div>
    </div>
    ${h.length?h.map(x=>`<div class="hist-original-card">
      <div class="hist-original-head">
        <div class="hist-original-title">Sinais Vitais — ${Utils.esc(x.data||'')}</div>
        <div class="hist-original-medico">${Utils.esc(x.medico||'')}</div>
      </div>
      ${this.sinaisGrid(x.sinaisVitais)}
    </div>`).join(''):`<div class="card">Nenhum sinal vital registrado.</div>`}`;
  };

  Prontuario.renderDocs = function(key,tipo){
    let list=this.sortDesc(this.docs(key));
    return list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(tipo)} ${tipo} — ${d.data||''}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc({...d,tipoDoc:tipo}))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${tipo}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${tipo}','${d.id}')">🖨️ Imprimir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum documento.</div>`;
  };

  Prontuario.renderExames = function(){
    let pedidos=this.docs('EXAMES_PEDIDOS').map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    let anexos=this.docs('EXAMES_ARQUIVOS').map(x=>({...x,tipoDoc:'Exame anexado'}));
    let list=this.sortDesc(pedidos.concat(anexos));

    return `<div class="card">
      <div class="row between"><strong>Exames do paciente</strong><span class="badge">${list.length}</span></div>
    </div>
    ${list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)} — ${Utils.esc(d.data||'')}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir/Abrir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum exame.</div>`}`;
  };

})();




/* =========================================================
   ZERO V2.4 — PRONTUÁRIO ORIGINAL FINAL
   Histórico: timeline limpa + botão ver anamnese completa.
   Sinais Vitais: formulário + cards do último registro + tabela.
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.tabs = ['historico','sinais','receitas','atestados','laudos','exames'];

  Prontuario.tabLabel = function(t){
    return {
      historico:'Histórico',
      sinais:'Sinais Vitais',
      receitas:'Receitas',
      atestados:'Atestados',
      laudos:'Laudos',
      exames:'Exames'
    }[t] || t;
  };

  Prontuario.dateValue = function(d){
    if(!d) return 0;
    if(d.criadoEm){
      const t=Date.parse(d.criadoEm);
      if(!isNaN(t)) return t;
    }
    if(d.dataHora){
      const t=Date.parse(d.dataHora);
      if(!isNaN(t)) return t;
    }
    const s=String(d.data||'');
    const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12,0,0).getTime();
    const t=Date.parse(s);
    return isNaN(t)?0:t;
  };

  Prontuario.sortDesc = function(list){
    return (list||[]).slice().sort((a,b)=>this.dateValue(b)-this.dateValue(a));
  };

  Prontuario.tipoDoc = function(d){
    const t=String(d.tipoDoc||d.tipoDocumento||d.tipo||'Documento');
    const n=Utils.norm(t);
    if(n.includes('receita')) return 'Receita';
    if(n.includes('atestado')||n.includes('comparecimento')) return 'Atestado';
    if(n.includes('laudo')) return 'Laudo';
    if(n.includes('pedido')) return 'Pedido de Exames';
    if(n.includes('anex')||n==='exame') return 'Exame anexado';
    return t;
  };

  Prontuario.resumoDoc = function(d){
    const tipo=this.tipoDoc(d);
    if(tipo==='Receita') return (d.medicamentos||[]).map(m=>m.nome||m.principio||m.medicamento).filter(Boolean).join(', ') || 'Receita médica';
    if(tipo==='Atestado') return [d.tipo||'Atestado', d.dias?`${d.dias} dia(s)`:'' , d.texto||d.motivo||''].filter(Boolean).join(' • ');
    if(tipo==='Laudo') return d.titulo||d.texto||d.descricao||'Laudo médico';
    if(tipo==='Pedido de Exames') return d.exames||d.lista||'Pedido de exames';
    if(tipo==='Exame anexado') return d.nome||d.filename||d.nome_arquivo||'Exame anexado';
    return 'Documento';
  };

  Prontuario.render = function(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>${Utils.esc(p.nome)}</h3>
          <div class="doc-sub">CPF: ${Utils.esc(p.cpf||'—')} • Nascimento: ${Utils.esc(p.nascimento||'—')} • Convênio: ${Utils.esc(p.convenio||'—')}</div>
        </div>
        <button class="btn btn-blue" onclick="RegistrarConsulta.open('${p.id}')">+ Registrar Consulta</button>
      </div>
    </div>

    <div class="pront-menu">
      ${this.tabs.map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${this.tabLabel(t)}</button>`).join('')}
    </div>

    <div>${this.renderTab()}</div>`;
  };

  Prontuario.renderTab = function(){
    if(this.tab==='historico')return this.renderHistorico();
    if(this.tab==='sinais')return this.renderSinaisVitais();
    if(this.tab==='receitas')return this.renderDocs('RECEITAS','Receita');
    if(this.tab==='atestados')return this.renderDocs('ATESTADOS','Atestado');
    if(this.tab==='laudos')return this.renderDocs('LAUDOS','Laudo');
    if(this.tab==='exames')return this.renderExames();
    return this.renderHistorico();
  };

  Prontuario.historicosPaciente = function(){
    return this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));
  };

  Prontuario.findHistorico = function(id){
    return Store.get('HISTORICO').find(x=>String(x.id)===String(id));
  };

  Prontuario.renderHistorico = function(){
    const h=this.historicosPaciente();

    if(!h.length){
      return `<div class="timeline-empty">
        <div class="ico">📋</div>
        <strong>Nenhum atendimento registrado para este paciente.</strong>
        <div>Clique em "+ Registrar Consulta" para adicionar o primeiro registro.</div>
      </div>`;
    }

    return `<div class="timeline-wrap">
      ${h.map(x=>{
        const docs=(x.documentos||x.documentosAtendimento||[]).map(d=>({...d,tipoDoc:this.tipoDoc(d)}));
        return `<div class="timeline-item">
          <div class="timeline-head">
            <div>
              <div class="timeline-title">🩺 Consulta</div>
              <div class="timeline-meta">${Utils.esc(x.data||'')} ${x.hora?`• ${Utils.esc(x.hora)}`:''} ${x.medico?`| ${Utils.esc(x.medico)}`:''}</div>
              <div class="timeline-status">● Atendimento registrado</div>
            </div>
            <div class="timeline-actions">
              <button class="btn btn-sm btn-outline" onclick="Prontuario.verAnamneseCompleta('${x.id}')">📋 Ver anamnese completa</button>
              <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirAtendimento('${x.id}')">🖨️ Imprimir</button>
            </div>
          </div>

          ${docs.length?`<div class="hist-original-docs">
            ${docs.map(d=>`
              <div class="hist-original-doc">
                <div>
                  <div class="hist-original-doc-title">${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</div>
                  <div class="hist-original-doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
                </div>
                <div class="doc-actions">
                  <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
                  <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir</button>
                </div>
              </div>
            `).join('')}
          </div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  };

  Prontuario.verAnamneseCompleta = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    const docs=(h.documentos||h.documentosAtendimento||[]).map(d=>({...d,tipoDoc:this.tipoDoc(d)}));

    Modal.open('📋 Anamnese Completa',`
      <div class="anamnese-detail-grid">
        <div class="anamnese-block">
          <strong>Data</strong>
          ${Utils.esc(h.data||'—')}
        </div>
        <div class="anamnese-block">
          <strong>Médico</strong>
          ${Utils.esc(h.medico||'—')}
        </div>
        <div class="anamnese-block full">
          <strong>Evolução / Anamnese</strong>
          <div style="white-space:pre-wrap">${Utils.esc(h.evolucao||'—')}</div>
        </div>
        <div class="anamnese-block full">
          <strong>Conduta</strong>
          <div style="white-space:pre-wrap">${Utils.esc(h.conduta||'—')}</div>
        </div>
        ${h.obs?`<div class="anamnese-block full"><strong>Observações</strong><div style="white-space:pre-wrap">${Utils.esc(h.obs)}</div></div>`:''}
      </div>

      ${docs.length?`<div class="cm-section" style="margin-top:14px;">
        <div class="cm-section-title">📎 Documentos do atendimento</div>
        ${docs.map(d=>`
          <div class="hist-original-doc">
            <div>
              <div class="hist-original-doc-title">${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</div>
              <div class="hist-original-doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
            </div>
            <div class="doc-actions">
              <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">Visualizar</button>
              <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">Imprimir</button>
            </div>
          </div>
        `).join('')}
      </div>`:''}
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-blue" onclick="Prontuario.imprimirAtendimento('${h.id}')">Imprimir atendimento</button>
    `,'lg');
  };

  Prontuario.imprimirAtendimento = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    const p=this.paciente || Store.get('PACIENTES').find(x=>x.id===h.pacId||x.id===h.pacienteId) || {};
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Atendimento</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111;padding:0;line-height:1.65}
        h1{font-size:20px;text-transform:uppercase;border-bottom:2px solid #dbe4ee;padding-bottom:10px}
        .info{width:100%;border-collapse:collapse;margin:16px 0}
        .info td{border:1px solid #ddd;padding:8px;background:#fafafa}
        .block{margin-top:18px}
        .block strong{display:block;margin-bottom:5px}
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}}
      
        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style></head><body class="print-documento-clinico">
      <h1>Atendimento / Anamnese</h1>
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>Data:</strong> ${Utils.esc(h.data||'—')}</td></tr>
        <tr><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td><td><strong>Médico:</strong> ${Utils.esc(h.medico||'—')}</td></tr>
      </table>
      <div class="block"><strong>Evolução / Anamnese</strong><div>${Utils.esc(h.evolucao||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="block"><strong>Conduta</strong><div>${Utils.esc(h.conduta||'—').replace(/\n/g,'<br>')}</div></div>
      ${h.obs?`<div class="block"><strong>Observações</strong><div>${Utils.esc(h.obs).replace(/\n/g,'<br>')}</div></div>`:''}
      </body></html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(window.ClinicaPrintMargins?ClinicaPrintMargins.apply(html):html);
    iframe.contentWindow.document.close();
    setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){} setTimeout(()=>iframe.remove(),1500)},250);
  };

  Prontuario.sinaisRegistros = function(){
    const direto=Store.get('SINAIS_VITAIS').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id);
    const antigos=Store.get('HISTORICO').filter(x=>
      (x.pacId===this.paciente.id||x.pacienteId===this.paciente.id) &&
      x.sinaisVitais &&
      Object.values(x.sinaisVitais).some(v=>String(v||'').trim())
    ).map(x=>({
      id:'SVH_'+x.id,
      pacId:x.pacId||x.pacienteId,
      pacienteId:x.pacienteId||x.pacId,
      data:x.data,
      dataHora:x.criadoEm||'',
      medico:x.medico||'',
      obs:'',
      ...x.sinaisVitais
    }));

    return this.sortDesc(direto.concat(antigos));
  };

  Prontuario.calcIMC = function(peso,altura){
    const p=parseFloat(String(peso||'').replace(',','.'));
    const a=parseFloat(String(altura||'').replace(',','.'));
    if(!p||!a) return '';
    return (p/(a*a)).toFixed(1).replace('.',',');
  };

  Prontuario.salvarSinaisVitais = function(){
    const prof = (window.ClinicaProfissionalDocumento && ClinicaProfissionalDocumento.resolve(item||doc||r||receita||atestado||laudo||pedido||exame||hist||{})) || {};
    const peso=document.getElementById('sv-peso-tab').value.trim();
    const altura=document.getElementById('sv-altura-tab').value.trim();

    const sv={
      id:Utils.id('SV'),
      pacId:this.paciente.id,
      pacienteId:this.paciente.id,
      data:Utils.today(),
      dataHora:new Date().toISOString(),
      medico:prof.nome||'',
      pa:document.getElementById('sv-pa-tab').value.trim(),
      fc:document.getElementById('sv-fc-tab').value.trim(),
      fr:document.getElementById('sv-fr-tab').value.trim(),
      temp:document.getElementById('sv-temp-tab').value.trim(),
      peso:peso,
      altura:altura,
      circAbd:document.getElementById('sv-circ-tab').value.trim(),
      imc:document.getElementById('sv-imc-tab').value.trim() || this.calcIMC(peso,altura),
      spo2:document.getElementById('sv-spo2-tab').value.trim(),
      hgt:document.getElementById('sv-hgt-tab').value.trim(),
      obs:document.getElementById('sv-obs-tab').value.trim()
    };

    const temValor=['pa','fc','fr','temp','peso','altura','circAbd','imc','spo2','hgt','obs'].some(k=>String(sv[k]||'').trim());
    if(!temValor) return Utils.toast('Informe ao menos um sinal vital.');

    Store.upsert('SINAIS_VITAIS',sv);
    Utils.toast('Sinais vitais salvos.');
    this.abrir(this.paciente.id,'sinais');
  };

  Prontuario.atualizarIMCForm = function(){
    const peso=document.getElementById('sv-peso-tab')?.value||'';
    const altura=document.getElementById('sv-altura-tab')?.value||'';
    const imc=this.calcIMC(peso,altura);
    const el=document.getElementById('sv-imc-tab');
    if(el) el.value=imc;
  };

  Prontuario.renderSinaisVitais = function(){
    const regs=this.sinaisRegistros();
    const ult=regs[0];

    return `<div class="card">
      <div class="row between">
        <div>
          <h3>Registrar Sinais Vitais</h3>
          <p style="color:#64748b;margin-top:4px">Registre sinais vitais separados do histórico de atendimento.</p>
        </div>
      </div>

      <div class="cm-form-grid" style="margin-top:12px;">
        <div><label>Pressão Arterial (mmHg)</label><input id="sv-pa-tab" placeholder="120/80"></div>
        <div><label>FC — Freq. Cardíaca (bpm)</label><input id="sv-fc-tab" placeholder="80"></div>
        <div><label>FR — Freq. Respiratória (irpm)</label><input id="sv-fr-tab" placeholder="18"></div>
        <div><label>Temperatura (°C)</label><input id="sv-temp-tab" placeholder="36,5"></div>
        <div><label>Peso (kg)</label><input id="sv-peso-tab" placeholder="70" oninput="Prontuario.atualizarIMCForm()"></div>
        <div><label>Altura (m)</label><input id="sv-altura-tab" placeholder="1,70" oninput="Prontuario.atualizarIMCForm()"></div>
        <div><label>Circ. Abdominal (cm)</label><input id="sv-circ-tab" placeholder="90"></div>
        <div><label>IMC</label><input id="sv-imc-tab" placeholder="automático"></div>
        <div><label>SpO₂ (%)</label><input id="sv-spo2-tab" placeholder="98"></div>
        <div><label>HGT — Glicemia (mg/dL)</label><input id="sv-hgt-tab" placeholder="95"></div>
        <div class="span-2"><label>Observações</label><input id="sv-obs-tab" placeholder="Observações"></div>
      </div>

      <div class="sv-form-actions">
        <button class="btn btn-blue" onclick="Prontuario.salvarSinaisVitais()">💾 Salvar Sinais Vitais</button>
      </div>
    </div>

    ${ult?`<div class="card">
      <h3>Último registro</h3>
      <div class="sv-last-grid" style="margin-top:12px;">
        ${this.svCard('Pressão Arterial',ult.pa,'mmHg')}
        ${this.svCard('Freq. Cardíaca',ult.fc,'bpm')}
        ${this.svCard('Temperatura',ult.temp,'°C')}
        ${this.svCard('SpO₂',ult.spo2,'%')}
        ${this.svCard('Peso',ult.peso,'kg')}
        ${this.svCard('Circ. Abdominal',ult.circAbd,'cm')}
        ${this.svCard('IMC',ult.imc,'')}
        ${this.svCard('HGT',ult.hgt,'mg/dL')}
      </div>
    </div>`:''}

    <div class="card">
      <div class="row between">
        <h3>Histórico de Sinais Vitais</h3>
        <span class="badge">${regs.length} registro(s)</span>
      </div>
      <div class="sv-table-wrap" style="margin-top:12px;">
        <table class="sv-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>PA</th>
              <th>FC</th>
              <th>Temp</th>
              <th>SpO₂</th>
              <th>Peso</th>
              <th>Altura</th>
              <th>Circ. Abd.</th>
              <th>IMC</th>
              <th>HGT</th>
              <th>Médico</th>
            </tr>
          </thead>
          <tbody>
            ${regs.length?regs.map(r=>`<tr>
              <td>${Utils.esc(this.svDataHora(r))}</td>
              <td>${Utils.esc(r.pa||'—')}</td>
              <td>${Utils.esc(r.fc||'—')}</td>
              <td>${Utils.esc(r.temp||'—')}</td>
              <td>${Utils.esc(r.spo2||'—')}</td>
              <td>${Utils.esc(r.peso||'—')}</td>
              <td>${Utils.esc(r.altura||'—')}</td>
              <td>${Utils.esc(r.circAbd||'—')}</td>
              <td>${Utils.esc(r.imc||'—')}</td>
              <td>${Utils.esc(r.hgt||r.glicemia||'—')}</td>
              <td>${Utils.esc(r.medico||'—')}</td>
            </tr>`).join(''):`<tr><td colspan="11">Nenhum sinal vital registrado.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
  };

  Prontuario.svCard = function(label,value,unit){
    return `<div class="sv-card">
      <div class="label">${Utils.esc(label)}</div>
      <div class="value">${Utils.esc(value||'—')}${value&&unit?`<span class="unit">${Utils.esc(unit)}</span>`:''}</div>
    </div>`;
  };

  Prontuario.svDataHora = function(r){
    if(r.dataHora){
      const d=new Date(r.dataHora);
      if(!isNaN(d.getTime())) return d.toLocaleString('pt-BR');
    }
    return r.data||'—';
  };

  Prontuario.renderDocs = function(key,tipo){
    let list=this.sortDesc(this.docs(key));
    return list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(tipo)} ${tipo} — ${d.data||''}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc({...d,tipoDoc:tipo}))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${tipo}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${tipo}','${d.id}')">🖨️ Imprimir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum documento.</div>`;
  };

  Prontuario.renderExames = function(){
    let pedidos=this.docs('EXAMES_PEDIDOS').map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    let anexos=this.docs('EXAMES_ARQUIVOS').map(x=>({...x,tipoDoc:'Exame anexado'}));
    let list=this.sortDesc(pedidos.concat(anexos));

    return `<div class="card">
      <div class="row between"><strong>Exames do paciente</strong><span class="badge">${list.length}</span></div>
    </div>
    ${list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)} — ${Utils.esc(d.data||'')}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir/Abrir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum exame.</div>`}`;
  };

})();




/* =========================================================
   ZERO V2.5 — Histórico só com dados da consulta
   Documentos ficam somente nos menus correspondentes.
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.renderHistorico = function(){
    const h=this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));

    if(!h.length){
      return `<div class="timeline-empty">
        <div class="ico">📋</div>
        <strong>Nenhum atendimento registrado para este paciente.</strong>
        <div>Clique em "+ Registrar Consulta" para adicionar o primeiro registro.</div>
      </div>`;
    }

    return h.map(x=>`<div class="hist-clean-card">
      <div class="hist-clean-head">
        <div class="hist-clean-title">Consulta — ${Utils.esc(x.data||'')}</div>
        <div class="hist-clean-medico">${Utils.esc(x.medico||'')}</div>
      </div>

      <div class="hist-clean-line"><strong>Evolução:</strong> ${Utils.esc(x.evolucao||'')}</div>
      <div class="hist-clean-line"><strong>Conduta:</strong> ${Utils.esc(x.conduta||'')}</div>
      ${x.obs?`<div class="hist-clean-line"><strong>Observações:</strong> ${Utils.esc(x.obs)}</div>`:''}

      <div class="hist-clean-actions">
        <button class="btn btn-sm btn-outline" onclick="Prontuario.verAnamneseCompleta('${x.id}')">📋 Ver anamnese completa</button>
        <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirAtendimento('${x.id}')">🖨️ Imprimir</button>
      </div>
    </div>`).join('');
  };

  Prontuario.verAnamneseCompleta = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    Modal.open('📋 Anamnese Completa',`
      <div class="anamnese-detail-grid">
        <div class="anamnese-block">
          <strong>Data</strong>
          ${Utils.esc(h.data||'—')}
        </div>
        <div class="anamnese-block">
          <strong>Médico</strong>
          ${Utils.esc(h.medico||'—')}
        </div>
        <div class="anamnese-block full">
          <strong>Evolução / Anamnese</strong>
          <div style="white-space:pre-wrap">${Utils.esc(h.evolucao||'—')}</div>
        </div>
        <div class="anamnese-block full">
          <strong>Conduta</strong>
          <div style="white-space:pre-wrap">${Utils.esc(h.conduta||'—')}</div>
        </div>
        ${h.obs?`<div class="anamnese-block full"><strong>Observações</strong><div style="white-space:pre-wrap">${Utils.esc(h.obs)}</div></div>`:''}
      </div>
      <div style="margin-top:12px;color:#64748b;font-size:13px;">
        Os documentos deste atendimento ficam nos menus próprios: Receitas, Atestados, Laudos e Exames.
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-blue" onclick="Prontuario.imprimirAtendimento('${h.id}')">Imprimir atendimento</button>
    `,'lg');
  };
})();




/* =========================================================
   ZERO V2.6 — Histórico só mostra Consulta, Data e Profissional
   Evolução/Conduta/Observações aparecem apenas em Ver anamnese completa.
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.renderHistorico = function(){
    const h=this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));

    if(!h.length){
      return `<div class="timeline-empty">
        <div class="ico">📋</div>
        <strong>Nenhum atendimento registrado para este paciente.</strong>
        <div>Clique em "+ Registrar Consulta" para adicionar o primeiro registro.</div>
      </div>`;
    }

    return h.map(x=>`<div class="hist-consulta-card">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">🩺 Consulta</div>
          <div class="hist-consulta-meta">
            ${Utils.esc(x.data||'—')} ${x.hora?`• ${Utils.esc(x.hora)}`:''}
            ${x.medico?` | ${Utils.esc(x.medico)}`:''}
          </div>
        </div>

        <div class="hist-consulta-actions">
          <button class="btn btn-sm btn-outline" onclick="Prontuario.verAnamneseCompleta('${x.id}')">📋 Ver anamnese completa</button>
          <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirAtendimento('${x.id}')">🖨️ Imprimir</button>
        </div>
      </div>
    </div>`).join('');
  };

  Prontuario.verAnamneseCompleta = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    Modal.open('📋 Anamnese Completa',`
      <div class="anamnese-detail-grid">
        <div class="anamnese-block">
          <strong>Data</strong>
          ${Utils.esc(h.data||'—')}
        </div>
        <div class="anamnese-block">
          <strong>Profissional</strong>
          ${Utils.esc(h.medico||'—')}
        </div>
        <div class="anamnese-block full">
          <strong>Evolução / Anamnese</strong>
          <div style="white-space:pre-wrap">${Utils.esc(h.evolucao||'—')}</div>
        </div>
        <div class="anamnese-block full">
          <strong>Conduta</strong>
          <div style="white-space:pre-wrap">${Utils.esc(h.conduta||'—')}</div>
        </div>
        ${h.obs?`<div class="anamnese-block full"><strong>Observações</strong><div style="white-space:pre-wrap">${Utils.esc(h.obs)}</div></div>`:''}
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-blue" onclick="Prontuario.imprimirAtendimento('${h.id}')">Imprimir atendimento</button>
    `,'lg');
  };
})();




/* =========================================================
   ZERO V2.7 — Registrar Consulta somente em atendimento
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.botaoRegistrarConsulta = function(p){
    const at = window.Atendimento && Atendimento.emAtendimento(p.id);
    if(at){
      return `<button class="btn btn-blue" onclick="RegistrarConsulta.open('${p.id}','${at.id}')">+ Registrar Consulta</button>`;
    }
    return `<button class="btn btn-outline" onclick="Utils.toast('Paciente precisa estar em atendimento para registrar consulta. Coloque pela tela Início.')">Registrar Consulta bloqueado</button>`;
  };

  const renderAnterior = Prontuario.render;
  Prontuario.render = function(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>${Utils.esc(p.nome)}</h3>
          <div class="doc-sub">CPF: ${Utils.esc(p.cpf||'—')} • Nascimento: ${Utils.esc(p.nascimento||'—')} • Convênio: ${Utils.esc(p.convenio||'—')}</div>
        </div>
        ${this.botaoRegistrarConsulta(p)}
      </div>
      ${!(window.Atendimento && Atendimento.emAtendimento(p.id))?`<div class="registro-bloqueado" style="margin-top:12px;">Para registrar consulta, coloque o paciente na fila pelo menu Início e clique em Atender.</div>`:''}
    </div>

    <div class="pront-menu">
      ${this.tabs.map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${this.tabLabel(t)}</button>`).join('')}
    </div>

    <div>${this.renderTab()}</div>`;
  };
})();


/* ZERO V3.1 — proteção de prontuário por perfil */
(function(){
  if(!window.Prontuario || Prontuario.__perfilProtegido) return;
  Prontuario.__perfilProtegido=true;
  const oldAbrir=Prontuario.abrir.bind(Prontuario);
  Prontuario.abrir=function(pacId,tab='historico'){
    if(window.Security && !Security.canProntuario()){
      Utils.toast('Seu perfil não tem acesso ao prontuário eletrônico.');
      if(window.Security) Security.audit('prontuario_bloqueado','Tentativa de abrir prontuário');
      return;
    }
    return oldAbrir(pacId,tab);
  };

  const oldBotao=Prontuario.botaoRegistrarConsulta ? Prontuario.botaoRegistrarConsulta.bind(Prontuario) : null;
  Prontuario.botaoRegistrarConsulta=function(p){
    if(window.Security && !Security.canRegistrarConsulta()){
      return `<button class="btn btn-outline" onclick="Utils.toast('Somente Médico ou Administrador pode registrar consulta.')">Registrar Consulta bloqueado</button>`;
    }
    return oldBotao ? oldBotao(p) : '';
  };
})();




/* =========================================================
   ZERO V3.3 — Ver anamnese completa com campos originais
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.blocoAnamnese = function(titulo, conteudo){
    return `<div class="anamnese-block full"><strong>${Utils.esc(titulo)}</strong><div style="white-space:pre-wrap">${Utils.esc(conteudo||'—')}</div></div>`;
  };

  Prontuario.formatarAnamneseOriginal = function(a){
    if(!a) return '';
    const linhas = [];
    const join = arr => Array.isArray(arr)&&arr.length ? arr.join(', ') : '';
    linhas.push(this.blocoAnamnese('1. Queixa Principal (QP)', [
      a.qp?.motivo ? `Motivo: ${a.qp.motivo}` : '',
      a.qp?.inicio ? `Quando começou: ${a.qp.inicio}` : ''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('2. História da Doença Atual (HDA)', [
      a.hda?.inicio ? `Início: ${a.hda.inicio}` : '',
      a.hda?.evolucao ? `Evolução: ${a.hda.evolucao}` : '',
      a.hda?.sintomas ? `Sintomas: ${a.hda.sintomas}` : '',
      a.hda?.tratamentos ? `Tratamentos prévios: ${a.hda.tratamentos}` : ''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('3. História Patológica Pregressa', [
      join(a.hpp?.selecionados) ? `Selecionados: ${join(a.hpp.selecionados)}` : '',
      a.hpp?.doencas ? `Doenças: ${a.hpp.doencas}` : '',
      a.hpp?.cirurgias ? `Cirurgias: ${a.hpp.cirurgias}` : '',
      a.hpp?.hospitalizacoes ? `Hospitalizações: ${a.hpp.hospitalizacoes}` : '',
      a.hpp?.medicamentosCronicos ? `Medicamentos crônicos: ${a.hpp.medicamentosCronicos}` : ''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('4. História Familiar', [
      join(a.historiaFamiliar?.selecionados) ? `Selecionados: ${join(a.historiaFamiliar.selecionados)}` : '',
      a.historiaFamiliar?.outros ? `Outros: ${a.historiaFamiliar.outros}` : ''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('5. História Social e Estilo de Vida', [
      a.social?.alimentacao ? `Alimentação: ${a.social.alimentacao}` : '',
      a.social?.atividadeFisica ? `Atividade física: ${a.social.atividadeFisica}` : '',
      a.social?.tabagismo ? `Tabagismo: ${a.social.tabagismo} ${a.social.tabagismoDetalhe||''}` : '',
      a.social?.etilismo ? `Etilismo: ${a.social.etilismo} ${a.social.etilismoDetalhe||''}` : '',
      a.social?.sono ? `Sono: ${a.social.sono}` : '',
      a.social?.estresse ? `Estresse: ${a.social.estresse}` : ''
    ].filter(Boolean).join('\n')));

    const rs=a.revisaoSistemas||{};
    linhas.push(this.blocoAnamnese('6. Revisão de Sistemas com foco endócrino', [
      join(rs.geral)?`Geral: ${join(rs.geral)}`:'',
      join(rs.metabolico)?`Metabólico: ${join(rs.metabolico)}`:'',
      join(rs.tireoide)?`Tireoide: ${join(rs.tireoide)}`:'',
      join(rs.adrenal)?`Adrenal: ${join(rs.adrenal)}`:'',
      join(rs.hipofise)?`Hipófise: ${join(rs.hipofise)}`:'',
      join(rs.gonadas)?`Gônadas: ${join(rs.gonadas)}`:'',
      join(rs.paratireoide)?`Paratireoide/Metabolismo Ósseo: ${join(rs.paratireoide)}`:'',
      rs.observacoes?`Observações: ${rs.observacoes}`:''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('6.1 Exame Físico', a.exameFisico||''));

    const meds=(a.medicacoes?.lista||[]).map(m=>[m.nome,m.dose,m.frequencia].filter(Boolean).join(' - ')).join('\n');
    linhas.push(this.blocoAnamnese('7. Medicações em Uso', [
      meds,
      a.medicacoes?.aderencia ? `Uso correto/aderência: ${a.medicacoes.aderencia}` : '',
      a.medicacoes?.suplementos ? `Suplementos/fitoterápicos: ${a.medicacoes.suplementos}` : ''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('8. Alergias', [
      a.alergias?.medicamentosa ? `Alergia medicamentosa: ${a.alergias.medicamentosa} ${a.alergias.medicamentosas||''}` : '',
      a.alergias?.alimentar ? `Alergia alimentar: ${a.alergias.alimentar} ${a.alergias.alimentares||''}` : ''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('9. Exames Anteriores', [
      a.examesAnteriores?.laboratoriaisImagem ? `Laboratoriais e imagem: ${a.examesAnteriores.laboratoriaisImagem}` : '',
      a.examesAnteriores?.avaliacao ? `Avaliação: ${a.examesAnteriores.avaliacao}` : ''
    ].filter(Boolean).join('\n')));

    linhas.push(this.blocoAnamnese('10. Hipótese Diagnóstica', a.hipoteseDiagnostica||''));
    linhas.push(this.blocoAnamnese('11. Conduta', a.conduta||''));
    return linhas.join('');
  };

  Prontuario.verAnamneseCompleta = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    const conteudoOriginal = h.anamneseCompleta ? this.formatarAnamneseOriginal(h.anamneseCompleta) : '';

    Modal.open('📋 Anamnese Completa',`
      <div class="anamnese-detail-grid">
        <div class="anamnese-block">
          <strong>Data</strong>
          ${Utils.esc(h.data||'—')} ${Utils.esc(h.hora||'')}
        </div>
        <div class="anamnese-block">
          <strong>Profissional</strong>
          ${Utils.esc(h.medico||'—')}
        </div>
        <div class="anamnese-block">
          <strong>Tipo</strong>
          ${Utils.esc(h.tipo||h.tipoAtendimento||'Consulta')}
        </div>
        <div class="anamnese-block">
          <strong>CID-10</strong>
          ${Utils.esc(h.cid||'—')}
        </div>
        ${conteudoOriginal || `
          <div class="anamnese-block full"><strong>Evolução / Anamnese</strong><div style="white-space:pre-wrap">${Utils.esc(h.evolucao||h.S||'—')}</div></div>
          <div class="anamnese-block full"><strong>Objetivo / Exame físico</strong><div style="white-space:pre-wrap">${Utils.esc(h.O||h.obs||'—')}</div></div>
          <div class="anamnese-block full"><strong>Avaliação</strong><div style="white-space:pre-wrap">${Utils.esc(h.A||'—')}</div></div>
          <div class="anamnese-block full"><strong>Conduta</strong><div style="white-space:pre-wrap">${Utils.esc(h.conduta||h.P||'—')}</div></div>
        `}
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-blue" onclick="Prontuario.imprimirAtendimento('${h.id}')">Imprimir atendimento</button>
    `,'lg');
  };
})();




/* =========================================================
   ZERO V3.4 — Upload dentro do menu Exames
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.uploadExamesMenu = function(ev){
    const files=Array.from(ev.target.files||[]);
    if(!files.length || !this.paciente) return;

    let pending=files.length;
    files.forEach(f=>{
      const done=(dataUrl='')=>{
        const prof = (window.ClinicaProfissionalDocumento && ClinicaProfissionalDocumento.resolve(item||doc||r||receita||atestado||laudo||pedido||exame||hist||{})) || {};
        const item={
          id:Utils.id('EX'),
          pacId:this.paciente.id,
          pacienteId:this.paciente.id,
          data:Utils.today(),
          hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
          medico:prof.nome||'',
          nome:f.name,
          filename:f.name,
          tipo:String(f.type||'').includes('pdf') || f.name.toLowerCase().endsWith('.pdf') ? 'pdf':'img',
          mime:f.type||'',
          obs:'Anexado pelo menu Exames do prontuário',
          laudo:'Anexado pelo menu Exames do prontuário',
          dataUrl
        };
        Store.upsert('EXAMES_ARQUIVOS',item);
        pending--;
        if(pending<=0){
          Utils.toast('Exame(s) anexado(s).');
          this.abrir(this.paciente.id,'exames');
        }
      };
      const r=new FileReader();
      r.onload=()=>done(r.result);
      r.onerror=()=>done('');
      r.readAsDataURL(f);
    });

    try{ev.target.value=''}catch(e){}
  };

  Prontuario.renderExames = function(){
    let pedidos=this.docs('EXAMES_PEDIDOS').map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    let anexos=this.docs('EXAMES_ARQUIVOS').map(x=>({...x,tipoDoc:'Exame anexado'}));
    let list=this.sortDesc(pedidos.concat(anexos));

    return `<div class="card">
      <div class="row between">
        <div>
          <strong>Exames do paciente</strong>
          <div class="doc-sub">Pedidos de exames e arquivos anexados.</div>
        </div>
        <span class="badge">${list.length}</span>
      </div>
    </div>

    <div class="card">
      <div class="exames-upload-original" onclick="document.getElementById('upload-exames-menu-prontuario')?.click()">
        <div class="exames-upload-icon">📎</div>
        <div class="exames-upload-title">Clique para anexar exames</div>
        <div class="exames-upload-sub">PDF e imagens</div>
        <button type="button" class="btn btn-blue btn-sm">Selecionar arquivo</button>
        <input id="upload-exames-menu-prontuario" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*" multiple style="display:none" onchange="Prontuario.uploadExamesMenu(event)">
      </div>
    </div>

    ${list.length?list.map(d=>`<div class="card">
      <div class="row between">
        <div>
          <strong>${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)} — ${Utils.esc(d.data||'')}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir/Abrir</button>
        </div>
      </div>
    </div>`).join(''):`<div class="card">Nenhum exame.</div>`}`;
  };
})();




/* =========================================================
   ZERO V3.9 — Registrar só em atendimento + Paciente completo
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.botaoRegistrarConsulta = function(p){
    const at = window.Atendimento && Atendimento.emAtendimento(p.id);
    if(at && (!window.Security || Security.canRegistrarConsulta())){
      return `<button class="btn btn-blue" onclick="RegistrarConsulta.open('${p.id}','${at.id}')">+ Registrar Consulta</button>`;
    }
    return '';
  };

  Prontuario.botaoPacienteCompleto = function(p){
    return `<button class="btn btn-outline" onclick="Pacientes.visualizar('${p.id}')">👤 Paciente completo</button>`;
  };

  Prontuario.render = function(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    const btnRegistrar=this.botaoRegistrarConsulta(p);

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>${Utils.esc(p.nome)}</h3>
          <div class="doc-sub">CPF: ${Utils.esc(p.cpf||'—')} • Nascimento: ${Utils.esc(p.nascimento||'—')} • Convênio: ${Utils.esc(p.convenio||'—')}</div>
        </div>
        <div class="prontuario-top-actions">
          ${this.botaoPacienteCompleto(p)}
          ${btnRegistrar}
        </div>
      </div>
    </div>

    <div class="pront-menu">
      ${this.tabs.map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${this.tabLabel(t)}</button>`).join('')}
    </div>

    <div>${this.renderTab()}</div>`;
  };
})();




/* =========================================================
   ZERO V4.0 — Prontuário igual original: sem botão Registrar Consulta
   O registro abre somente pelo botão Atender da Fila.
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.botaoRegistrarConsulta = function(p){
    return '';
  };

  Prontuario.render = function(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>${Utils.esc(p.nome)}</h3>
          <div class="doc-sub">CPF: ${Utils.esc(p.cpf||'—')} • Nascimento: ${Utils.esc(p.nascimento||'—')} • Convênio: ${Utils.esc(p.convenio||'—')}</div>
        </div>
        <div class="prontuario-top-actions">
          <button class="btn btn-outline" onclick="Pacientes.visualizar('${p.id}')">👤 Paciente completo</button>
        </div>
      </div>
    </div>

    <div class="pront-menu">
      ${this.tabs.map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${this.tabLabel(t)}</button>`).join('')}
    </div>

    <div>${this.renderTab()}</div>`;
  };
})();




/* =========================================================
   ZERO V4.1 — Paciente completo = download/upload do paciente
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.coletarPacienteCompleto = function(pacId){
    const filtro = x => String(x.pacId||x.pacienteId||'')===String(pacId);
    return {
      __tipo:'PACIENTE_COMPLETO_CLINICA_MARIO',
      __versao:'Zero V4.1',
      exportadoEm:new Date().toISOString(),
      paciente:Store.get('PACIENTES').find(p=>String(p.id)===String(pacId)) || null,
      historico:Store.get('HISTORICO').filter(filtro),
      receitas:Store.get('RECEITAS').filter(filtro),
      atestados:Store.get('ATESTADOS').filter(filtro),
      laudos:Store.get('LAUDOS').filter(filtro),
      examesPedidos:Store.get('EXAMES_PEDIDOS').filter(filtro),
      examesArquivos:Store.get('EXAMES_ARQUIVOS').filter(filtro),
      sinaisVitais:Store.get('SINAIS_VITAIS').filter(filtro),
      atendimentos:Store.get('ATENDIMENTOS').filter(filtro)
    };
  };

  Prontuario.baixarPacienteCompleto = function(pacId){
    const data=this.coletarPacienteCompleto(pacId);
    if(!data.paciente) return Utils.toast('Paciente não encontrado.');

    const safe=String(data.paciente.nome||'paciente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`paciente_completo_${safe}_${Date.now()}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    if(window.Security) Security.audit('paciente_completo_export',`Exportou paciente completo ${data.paciente.nome||pacId}`);
    Utils.toast('Paciente completo exportado.');
  };

  Prontuario.uploadPacienteCompleto = function(ev,pacIdAtual=''){
    const f=ev.target.files && ev.target.files[0];
    if(!f) return;

    const r=new FileReader();
    r.onload=()=>{
      try{
        const data=JSON.parse(r.result);
        if(data.__tipo!=='PACIENTE_COMPLETO_CLINICA_MARIO' || !data.paciente){
          Utils.toast('Arquivo de paciente completo inválido.');
          return;
        }

        if(!confirm('Importar paciente completo? Isso adicionará/atualizará o paciente e seus registros.')) return;

        const upsertMany=(key,arr)=>{
          (arr||[]).forEach(item=>Store.upsert(key,item));
        };

        Store.upsert('PACIENTES',data.paciente);
        upsertMany('HISTORICO',data.historico);
        upsertMany('RECEITAS',data.receitas);
        upsertMany('ATESTADOS',data.atestados);
        upsertMany('LAUDOS',data.laudos);
        upsertMany('EXAMES_PEDIDOS',data.examesPedidos);
        upsertMany('EXAMES_ARQUIVOS',data.examesArquivos);
        upsertMany('SINAIS_VITAIS',data.sinaisVitais);
        upsertMany('ATENDIMENTOS',data.atendimentos);

        if(window.Security) Security.audit('paciente_completo_import',`Importou paciente completo ${data.paciente.nome||data.paciente.id}`);
        Utils.toast('Paciente completo importado.');

        Modal.close();
        this.abrir(data.paciente.id,'historico');
      }catch(e){
        console.error(e);
        Utils.toast('Não foi possível importar este paciente completo.');
      }
    };
    r.readAsText(f);
    try{ev.target.value=''}catch(e){}
  };

  Prontuario.modalPacienteCompleto = function(pacId){
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const data=this.coletarPacienteCompleto(pacId);
    Modal.open('👤 Paciente completo',`
      <div class="doc-original-banner doc-banner-blue">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong>
      </div>

      <div class="cm-view-grid" style="margin-bottom:14px;">
        <div class="cm-view-item"><strong>Histórico</strong><span>${data.historico.length}</span></div>
        <div class="cm-view-item"><strong>Receitas</strong><span>${data.receitas.length}</span></div>
        <div class="cm-view-item"><strong>Atestados</strong><span>${data.atestados.length}</span></div>
        <div class="cm-view-item"><strong>Laudos</strong><span>${data.laudos.length}</span></div>
        <div class="cm-view-item"><strong>Exames</strong><span>${data.examesPedidos.length + data.examesArquivos.length}</span></div>
        <div class="cm-view-item"><strong>Sinais vitais</strong><span>${data.sinaisVitais.length}</span></div>
      </div>

      <div class="paciente-completo-actions">
        <div class="paciente-completo-card" onclick="Prontuario.baixarPacienteCompleto('${p.id}')">
          <strong>⬇️ Baixar paciente completo</strong>
          <span>Exporta cadastro, prontuário, documentos, exames e sinais vitais.</span>
        </div>

        <div class="paciente-completo-card" onclick="document.getElementById('pc-upload-json')?.click()">
          <strong>⬆️ Importar paciente completo</strong>
          <span>Importa arquivo JSON de paciente completo.</span>
        </div>

        <div class="paciente-completo-card" onclick="Pacientes.visualizar('${p.id}')">
          <strong>👁️ Ver cadastro</strong>
          <span>Visualizar dados cadastrais do paciente.</span>
        </div>
      </div>

      <input id="pc-upload-json" type="file" accept=".json,application/json" style="display:none" onchange="Prontuario.uploadPacienteCompleto(event,'${p.id}')">
    `,`<button class="btn btn-blue" onclick="Modal.close()">Fechar</button>`,'lg');
  };

  Prontuario.render = function(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>${Utils.esc(p.nome)}</h3>
          <div class="doc-sub">CPF: ${Utils.esc(p.cpf||'—')} • Nascimento: ${Utils.esc(p.nascimento||'—')} • Convênio: ${Utils.esc(p.convenio||'—')}</div>
        </div>
        <div class="prontuario-top-actions">
          <button class="btn btn-outline" onclick="Prontuario.modalPacienteCompleto('${p.id}')">👤 Paciente completo</button>
        </div>
      </div>
    </div>

    <div class="pront-menu">
      ${this.tabs.map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${this.tabLabel(t)}</button>`).join('')}
    </div>

    <div>${this.renderTab()}</div>`;
  };
})();




/* =========================================================
   ZERO V4.3 — Prontuário original com botão Imprimir Prontuário
========================================================= */
(function(){
  if(!window.Prontuario || !window.Pacientes) return;

  Prontuario.iniciaisPaciente = function(p){
    return String(p.nome||'P').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  };

  Prontuario.ultimoSinalVital = function(pacId){
    return Store.get('SINAIS_VITAIS').filter(s=>String(s.pacId||s.pacienteId||'')===String(pacId))
      .sort((a,b)=>(Date.parse(b.dataHora||b.criadoEm||'')||0)-(Date.parse(a.dataHora||a.criadoEm||'')||0))[0];
  };

  Prontuario.imprimirProntuario = function(pacId){
    if(window.Pacientes && typeof Pacientes.imprimirRegistroCompleto==='function'){
      Pacientes.imprimirRegistroCompleto(pacId);
    }else{
      Utils.toast('Impressão do prontuário não encontrada.');
    }
  };

  Prontuario.render = function(){
    const p=this.paciente;
    if(!p) return this.renderBusca();

    const sv=this.ultimoSinalVital(p.id);
    document.getElementById('content').innerHTML=`<div class="pront-original-head">
      <div class="row">
        <button class="pront-back" onclick="Router.go('pacientes')">← Voltar</button>
        <h2 style="margin:0;">📋 Prontuário Eletrônico</h2>
      </div>
      <button class="pront-print-btn" onclick="Prontuario.imprimirProntuario('${p.id}')">🖨️ Imprimir Prontuário</button>
    </div>

    <div class="pront-patient-banner">
      <div class="pront-info-main">
        <div class="pront-avatar">${Utils.esc(this.iniciaisPaciente(p))}</div>
        <div>
          <div class="pront-info-name">${Utils.esc(p.nome||'')}</div>
          <div class="pront-info-lines">
            CPF: ${Utils.esc(p.cpf||'—')} &nbsp;|&nbsp; Nasc: ${Utils.esc(p.nascimento||p.nasc||'—')} &nbsp;|&nbsp; ${Utils.esc(p.sexo||'—')} &nbsp;|&nbsp; ☎ ${Utils.esc(p.telefone||p.tel||'—')}<br>
            ✉ ${Utils.esc(p.email||'—')} &nbsp;|&nbsp; 🩸 ${Utils.esc(p.sangue||'—')} &nbsp;|&nbsp; ${Utils.esc(p.convenio||'—')}<br>
            ⚠ ${Utils.esc(p.comorbidades||p.obs||'Sem comorbidades')}
          </div>
        </div>
      </div>

      ${sv?`<div class="pront-vitals-card">
        <strong>Últimos sinais vitais</strong><br>
        PA: <strong>${Utils.esc(sv.pa||'—')}</strong> &nbsp; FC: <strong>${Utils.esc(sv.fc||'—')} bpm</strong><br>
        SpO₂: <strong>${Utils.esc(sv.spo2||'—')}%</strong> &nbsp; Temp: <strong>${Utils.esc(sv.temp||'—')}°C</strong><br>
        ${Utils.esc(sv.data||'')}
      </div>`:''}
    </div>

    <div class="pront-menu">
      ${this.tabs.map(t=>`<button class="${this.tab===t?'active':''}" onclick="Prontuario.abrir('${p.id}','${t}')">${this.tabLabel(t)}</button>`).join('')}
    </div>

    <div>${this.renderTab()}</div>`;
  };
})();




/* ZERO V4.4 — impressão do prontuário com cabeçalho original */
(function(){
  if(!window.Prontuario) return;
  Prontuario.imprimirProntuario = function(pacId){
    if(window.Pacientes && typeof Pacientes.imprimirRegistroCompleto==='function'){
      Pacientes.imprimirRegistroCompleto(pacId);
    }else{
      Utils.toast('Impressão do prontuário não encontrada.');
    }
  };
})();




/* =========================================================
   ZERO V4.4 — Cabeçalho original na impressão por atendimento
========================================================= */
(function(){
  if(!window.Prontuario) return;

  Prontuario.cabecalhoOriginalAtendimento = function(titulo='ATENDIMENTO / ANAMNESE'){
    if(window.Pacientes && Pacientes._cabecalhoOriginalPrint){
      return Pacientes._cabecalhoOriginalPrint(titulo);
    }
    return `<h1>${Utils.esc(titulo)}</h1>`;
  };

  Prontuario.imprimirAtendimento = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    const p=this.paciente || Store.get('PACIENTES').find(x=>x.id===h.pacId||x.id===h.pacienteId) || {};
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Atendimento</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111;padding:0;line-height:1.65;font-size:12.5px}
        .print-header-original{display:flex;gap:18px;align-items:flex-start;border-bottom:2px solid #d1d5db;padding-bottom:14px;margin-bottom:18px}
        .print-logo-box{width:62px;height:62px;background:#222;border-radius:10px;color:#fff;display:grid;place-items:center;font-weight:bold;font-size:13px;flex:0 0 auto;overflow:hidden}
        .print-logo-box img{width:100%;height:100%;object-fit:cover}
        .print-clinic-info h1{font-size:18px;margin:0 0 6px;color:#111827;text-transform:uppercase}
        .print-clinic-info div{font-size:10.5px;line-height:1.45;color:#374151}
        .info{width:100%;border-collapse:collapse;margin:16px 0}
        .info td{border:1px solid #ddd;padding:8px;background:#fafafa}
        .block{margin-top:18px;page-break-inside:avoid}
        .block strong{display:block;margin-bottom:5px}
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}}
      
        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style></head><body class="print-documento-clinico">
      ${this.cabecalhoOriginalAtendimento('ATENDIMENTO / ANAMNESE')}
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>Data:</strong> ${Utils.esc(h.data||'—')} ${Utils.esc(h.hora||'')}</td></tr>
        <tr><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td><td><strong>Profissional:</strong> ${Utils.esc(h.medico||'—')}</td></tr>
        <tr><td><strong>Convênio:</strong> ${Utils.esc(p.convenio||'—')}</td><td><strong>CID:</strong> ${Utils.esc(h.cid||'—')}</td></tr>
      </table>
      <div class="block"><strong>Evolução / Anamnese</strong><div>${Utils.esc(h.evolucao||h.S||'—').replace(/\n/g,'<br>')}</div></div>
      ${h.O||h.obs?`<div class="block"><strong>Objetivo / Observações</strong><div>${Utils.esc(h.O||h.obs).replace(/\n/g,'<br>')}</div></div>`:''}
      ${h.A?`<div class="block"><strong>Avaliação</strong><div>${Utils.esc(h.A).replace(/\n/g,'<br>')}</div></div>`:''}
      <div class="block"><strong>Conduta</strong><div>${Utils.esc(h.conduta||h.P||'—').replace(/\n/g,'<br>')}</div></div>
      </body></html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(window.ClinicaPrintMargins?ClinicaPrintMargins.apply(html):html);
    iframe.contentWindow.document.close();
    setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){} setTimeout(()=>iframe.remove(),1500)},250);
  };
})();




/* ZERO V4.6 — Cabeçalho configurável também na impressão por atendimento */
(function(){
  if(!window.Prontuario) return;

  Prontuario.cabecalhoOriginalAtendimento = function(titulo='ATENDIMENTO / ANAMNESE'){
    if(window.Pacientes && Pacientes._cabecalhoOriginalPrint){
      return Pacientes._cabecalhoOriginalPrint(titulo);
    }
    return `<h1>${Utils.esc(titulo)}</h1>`;
  };
})();




/* ZERO V4.7 — Impressão por atendimento com cabeçalho igual à imagem */
(function(){
  if(!window.Prontuario) return;

  Prontuario.cabecalhoOriginalAtendimento = function(titulo='ATENDIMENTO / ANAMNESE'){
    if(window.Pacientes && Pacientes._cabecalhoOriginalPrint){
      // Na imagem enviada o título permanece PRONTUÁRIO MÉDICO ELETRÔNICO.
      return Pacientes._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO');
    }
    return `<div class="print-header-imagem"><h1>PRONTUÁRIO MÉDICO ELETRÔNICO</h1></div>`;
  };

  const oldPrintAtendimentoV47 = Prontuario.imprimirAtendimento ? Prontuario.imprimirAtendimento.bind(Prontuario) : null;

  Prontuario.imprimirAtendimento = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    const p=this.paciente || Store.get('PACIENTES').find(x=>x.id===h.pacId||x.id===h.pacienteId) || {};
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Atendimento</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111;padding:0;line-height:1.55;font-size:12.5px}
        .print-header-imagem{border-bottom:1px solid #d1d5db;padding-bottom:12px;margin-bottom:18px;text-align:left}
        .print-header-imagem h1{font-size:20px;margin:0 0 8px;color:#111827;font-weight:800;text-transform:uppercase;letter-spacing:-.2px}
        .print-header-imagem div{font-size:10.5px;line-height:1.45;color:#374151;margin:1px 0}
        .print-header-imagem strong{color:#111827}
        .info{width:100%;border-collapse:collapse;margin:16px 0}
        .info td{border:1px solid #ddd;padding:8px;background:#fafafa}
        .block{margin-top:18px;page-break-inside:avoid}
        .block strong{display:block;margin-bottom:5px}
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}}
      
        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style></head><body class="print-documento-clinico">
      ${this.cabecalhoOriginalAtendimento('PRONTUÁRIO MÉDICO ELETRÔNICO')}
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>Data:</strong> ${Utils.esc(h.data||'—')} ${Utils.esc(h.hora||'')}</td></tr>
        <tr><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td><td><strong>Profissional:</strong> ${Utils.esc(h.medico||'—')}</td></tr>
        <tr><td><strong>Convênio:</strong> ${Utils.esc(p.convenio||'—')}</td><td><strong>CID:</strong> ${Utils.esc(h.cid||'—')}</td></tr>
      </table>
      <div class="block"><strong>Evolução / Anamnese</strong><div>${Utils.esc(h.evolucao||h.S||'—').replace(/\n/g,'<br>')}</div></div>
      ${h.O||h.obs?`<div class="block"><strong>Objetivo / Observações</strong><div>${Utils.esc(h.O||h.obs).replace(/\n/g,'<br>')}</div></div>`:''}
      ${h.A?`<div class="block"><strong>Avaliação</strong><div>${Utils.esc(h.A).replace(/\n/g,'<br>')}</div></div>`:''}
      <div class="block"><strong>Conduta</strong><div>${Utils.esc(h.conduta||h.P||'—').replace(/\n/g,'<br>')}</div></div>
      </body></html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(window.ClinicaPrintMargins?ClinicaPrintMargins.apply(html):html);
    iframe.contentWindow.document.close();
    setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){} setTimeout(()=>iframe.remove(),1500)},250);
  };
})();




/* ZERO V5.1 — Logo também na impressão por atendimento */
(function(){
  if(!window.Prontuario) return;

  Prontuario.cabecalhoOriginalAtendimento = function(titulo='PRONTUÁRIO MÉDICO ELETRÔNICO'){
    if(window.Pacientes && Pacientes._cabecalhoOriginalPrint){
      return Pacientes._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO');
    }
    return `<div class="print-header-imagem sem-logo"><div class="print-header-texto"><h1>PRONTUÁRIO MÉDICO ELETRÔNICO</h1></div></div>`;
  };

  Prontuario.imprimirAtendimento = function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    const p=this.paciente || Store.get('PACIENTES').find(x=>x.id===h.pacId||x.id===h.pacienteId) || {};
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Atendimento</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111;padding:0;line-height:1.55;font-size:12.5px}
        .print-header-imagem{border-bottom:1px solid #d1d5db;padding-bottom:12px;margin-bottom:18px;text-align:left;display:flex;align-items:flex-start;gap:12px}
        .print-header-imagem.sem-logo{display:block}
        .print-logo-salva{width:62px;height:62px;flex:0 0 62px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .print-logo-salva img{width:100%;height:100%;object-fit:contain;display:block}
        .print-header-texto{min-width:0}
        .print-header-imagem h1{font-size:20px;margin:0 0 8px;color:#111827;font-weight:800;text-transform:uppercase;letter-spacing:-.2px}
        .print-header-imagem div{font-size:10.5px;line-height:1.45;color:#374151;margin:1px 0}
        .print-header-imagem strong{color:#111827}
        .info{width:100%;border-collapse:collapse;margin:16px 0}
        .info td{border:1px solid #ddd;padding:8px;background:#fafafa}
        .block{margin-top:18px;page-break-inside:avoid}
        .block strong{display:block;margin-bottom:5px}
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}}
      
        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style></head><body class="print-documento-clinico">
      ${this.cabecalhoOriginalAtendimento('PRONTUÁRIO MÉDICO ELETRÔNICO')}
      <table class="info">
        <tr><td><strong>Paciente:</strong> ${Utils.esc(p.nome||'—')}</td><td><strong>Data:</strong> ${Utils.esc(h.data||'—')} ${Utils.esc(h.hora||'')}</td></tr>
        <tr><td><strong>CPF:</strong> ${Utils.esc(p.cpf||'—')}</td><td><strong>Profissional:</strong> ${Utils.esc(h.medico||'—')}</td></tr>
        <tr><td><strong>Convênio:</strong> ${Utils.esc(p.convenio||'—')}</td><td><strong>CID:</strong> ${Utils.esc(h.cid||'—')}</td></tr>
      </table>
      <div class="block"><strong>Evolução / Anamnese</strong><div>${Utils.esc(h.evolucao||h.S||'—').replace(/\n/g,'<br>')}</div></div>
      ${h.O||h.obs?`<div class="block"><strong>Objetivo / Observações</strong><div>${Utils.esc(h.O||h.obs).replace(/\n/g,'<br>')}</div></div>`:''}
      ${h.A?`<div class="block"><strong>Avaliação</strong><div>${Utils.esc(h.A).replace(/\n/g,'<br>')}</div></div>`:''}
      <div class="block"><strong>Conduta</strong><div>${Utils.esc(h.conduta||h.P||'—').replace(/\n/g,'<br>')}</div></div>
      </body></html>`;

    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(window.ClinicaPrintMargins?ClinicaPrintMargins.apply(html):html);
    iframe.contentWindow.document.close();
    setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){} setTimeout(()=>iframe.remove(),1500)},250);
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




/* =========================================================
   ZERO V12.4 — Sinais vitais salvam e histórico mostra tipo correto
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__ajustesClinicosV124) return;
  Prontuario.__ajustesClinicosV124=true;

  Prontuario.salvarSinaisVitais=function(){
    const peso=document.getElementById('sv-peso-tab')?.value.trim()||'';
    const altura=document.getElementById('sv-altura-tab')?.value.trim()||'';
    const sv={
      id:Utils.id('SV'),
      pacId:this.paciente.id,
      pacienteId:this.paciente.id,
      data:Utils.today(),
      dataHora:new Date().toISOString(),
      medico:(window.Profissionais?.atual?.()||{}).nome||'',
      pa:document.getElementById('sv-pa-tab')?.value.trim()||'',
      fc:document.getElementById('sv-fc-tab')?.value.trim()||'',
      fr:document.getElementById('sv-fr-tab')?.value.trim()||'',
      temp:document.getElementById('sv-temp-tab')?.value.trim()||'',
      peso:peso,
      altura:altura,
      circAbd:document.getElementById('sv-circ-tab')?.value.trim()||'',
      imc:document.getElementById('sv-imc-tab')?.value.trim() || this.calcIMC(peso,altura),
      spo2:document.getElementById('sv-spo2-tab')?.value.trim()||'',
      hgt:document.getElementById('sv-hgt-tab')?.value.trim()||'',
      obs:document.getElementById('sv-obs-tab')?.value.trim()||''
    };
    const temValor=['pa','fc','fr','temp','peso','altura','circAbd','imc','spo2','hgt','obs'].some(k=>String(sv[k]||'').trim());
    if(!temValor) return Utils.toast('Informe ao menos um sinal vital.');
    Store.upsert('SINAIS_VITAIS',sv);
    Utils.toast('Sinais vitais salvos.');
    this.abrir(this.paciente.id,'sinais');
  };

  Prontuario.labelHistoricoV124=function(h){
    const t=String(h.tituloHistorico||h.tipoAtendimento||h.tipoConsulta||h.tipo||'Consulta').toLowerCase();
    if(t.includes('proced')) return 'Procedimento';
    if(t.includes('emerg')) return 'Emergência';
    if(t.includes('urg')) return 'Urgência';
    if(t.includes('retorno')) return 'Retorno';
    return 'Consulta';
  };

  Prontuario.renderHistorico=function(){
    let h=this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));

    return h.length?h.map(x=>{
      const docs=(x.documentos||x.documentosAtendimento||[]).map(d=>({...d,tipoDoc:this.tipoDoc(d)}));
      const titulo=this.labelHistoricoV124(x);
      return `<div class="hist-card">
        <div class="hist-head">
          <div class="hist-title">${Utils.esc(titulo)} — ${Utils.esc(x.data||'')}</div>
          <div class="hist-medico">${Utils.esc(x.medico||x.profissional||'')}</div>
        </div>

        ${this.sinaisHtml(x.sinaisVitais)}

        ${x.queixaMotivo||x.motivo?`<div class="hist-block"><strong>Queixa/Motivo:</strong><br>${Utils.esc(x.queixaMotivo||x.motivo||'').replace(/\n/g,'<br>')}</div>`:''}
        <div class="hist-block"><strong>Evolução:</strong><br>${Utils.esc(x.evolucao||x.S||'—').replace(/\n/g,'<br>')}</div>
        <div class="hist-block"><strong>Conduta:</strong><br>${Utils.esc(x.conduta||x.P||'—').replace(/\n/g,'<br>')}</div>
        ${x.obs?`<div class="hist-block"><strong>Observações:</strong><br>${Utils.esc(x.obs).replace(/\n/g,'<br>')}</div>`:''}

        ${docs.length?`<div style="margin-top:12px;">
          <strong>Documentos do atendimento</strong>
          ${docs.map(d=>`
            <div class="hist-doc">
              <div class="hist-doc-main">
                <div class="hist-doc-title">${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)}</div>
                <div class="hist-doc-sub">${Utils.esc(this.resumoDoc(d))}</div>
              </div>
              <div class="doc-actions">
                <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
                <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir/Abrir</button>
              </div>
            </div>`).join('')}
        </div>`:''}
      </div>`;
    }).join(''):`<div class="card">Nenhum histórico registrado.</div>`;
  };
})();


/* =========================================================
   ZERO V13.4 — Prontuário: histórico compacto original + receitas com controle especial
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__historicoReceitasV134) return;
  Prontuario.__historicoReceitasV134=true;

  Prontuario.labelHistoricoCompactoV134=function(h){
    const t=String(h.tituloHistorico||h.tipoAtendimento||h.tipoConsulta||h.tipo||'Consulta').toLowerCase();
    if(t.includes('proced')) return 'Procedimento';
    if(t.includes('retorno')) return 'Retorno';
    if(t.includes('emerg')||t.includes('urg')) return 'Emergência';
    return 'Consulta';
  };

  Prontuario.renderHistorico=function(){
    const h=this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));
    if(!h.length) return `<div class="card">Nenhum histórico registrado.</div>`;
    return h.map(x=>`<div class="hist-original-card-v134">
      <div class="hist-original-main-v134">
        <div class="hist-original-date-v134">${Utils.esc(x.data||'—')}${x.hora?` • ${Utils.esc(x.hora)}`:''}</div>
        <div class="hist-original-type-v134">${Utils.esc(this.labelHistoricoCompactoV134(x))}</div>
        <div class="hist-original-cid-v134">CID: ${Utils.esc(x.cid||x.cid10||'—')}</div>
      </div>
      <div class="hist-original-actions-v134">
        <button class="btn btn-sm btn-outline" onclick="Prontuario.verAnamneseCompleta('${x.id}')">👁️ Visualizar</button>
        <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirAtendimento('${x.id}')">🖨️ Imprimir</button>
      </div>
    </div>`).join('');
  };

  Prontuario.imprimirDocControleEspecialV134=function(id){
    const d=this.findDoc('Receita',id)||this.findDoc('RECEITAS',id);
    if(!d) return Utils.toast('Receita não encontrada.');
    const item=Object.assign({},d,{tipoDoc:'Receita',tipoPrint:'receita-controle'});
    return Impressao.print(item);
  };

  Prontuario.renderDocs=function(key,tipo){
    let list=this.sortDesc(this.docs(key));
    if(!list.length) return `<div class="card">Nenhum documento.</div>`;
    return list.map(d=>`<div class="card">
      <div class="row between" style="gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <strong>${Documentos.icon(tipo)} ${tipo} — ${d.data||''}</strong>
          <div class="doc-sub">${Utils.esc(this.resumoDoc({...d,tipoDoc:tipo}))}</div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${tipo}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${tipo}','${d.id}')">🖨️ Imprimir</button>
          ${tipo==='Receita'?`<button class="btn btn-purple btn-sm" onclick="Prontuario.imprimirDocControleEspecialV134('${d.id}')">🧾 Imprimir controle especial</button>`:''}
        </div>
      </div>
    </div>`).join('');
  };
})();




/* =========================================================
   ZERO V13.6 — Histórico visual original
   Volta para o visual original do menu Histórico:
   - card no estilo hist-consulta-card
   - tipo do atendimento no título
   - data/hora/profissional na linha de meta
   - CID visível
   - botões de ação à direita
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__historicoOriginalVisualV136) return;
  Prontuario.__historicoOriginalVisualV136=true;

  Prontuario.tipoHistoricoOriginalV136=function(h){
    const t=String(h.tituloHistorico||h.tipoAtendimento||h.tipoConsulta||h.tipo||'Consulta').toLowerCase();
    if(t.includes('proced')) return 'Procedimento';
    if(t.includes('retorno')) return 'Retorno';
    if(t.includes('emerg')) return 'Emergência';
    if(t.includes('urg')) return 'Urgência';
    return 'Consulta';
  };

  Prontuario.iconeHistoricoV136=function(tipo){
    const t=String(tipo||'').toLowerCase();
    if(t.includes('proced')) return '🧰';
    if(t.includes('emerg')||t.includes('urg')) return '🚨';
    if(t.includes('retorno')) return '↩️';
    return '🩺';
  };

  Prontuario.renderHistorico=function(){
    const h=this.sortDesc(Store.get('HISTORICO').filter(x=>x.pacId===this.paciente.id||x.pacienteId===this.paciente.id));

    if(!h.length){
      return `<div class="timeline-empty">
        <div class="ico">📋</div>
        <strong>Nenhum atendimento registrado para este paciente.</strong>
        <div>Clique em "+ Registrar Consulta" para adicionar o primeiro registro.</div>
      </div>`;
    }

    return h.map(x=>{
      const tipo=this.tipoHistoricoOriginalV136(x);
      const ico=this.iconeHistoricoV136(tipo);
      const cid=x.cid||x.cid10||'—';
      const prof=x.medico||x.profissional||'—';
      const data=[x.data||'—',x.hora||''].filter(Boolean).join(' • ');

      return `<div class="hist-consulta-card hist-original-visual-v136">
        <div class="hist-consulta-head">
          <div class="hist-consulta-main">
            <div class="hist-consulta-title">${ico} ${Utils.esc(tipo)}</div>
            <div class="hist-consulta-meta">
              ${Utils.esc(data)}
              ${prof?` | ${Utils.esc(prof)}`:''}
            </div>
            <div class="hist-consulta-cid-v136">
              <strong>CID:</strong> ${Utils.esc(cid)}
            </div>
          </div>

          <div class="hist-consulta-actions">
            <button class="btn btn-sm btn-outline" onclick="Prontuario.verAnamneseCompleta('${x.id}')">📋 Ver anamnese completa</button>
            <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirAtendimento('${x.id}')">🖨️ Imprimir</button>
          </div>
        </div>
      </div>`;
    }).join('');
  };
})();




/* =========================================================
   ZERO V14.3 — Menus de documentos compactos iguais ao histórico
   - Só mostra tipo/data/CID e botões.
   - Detalhes aparecem apenas em Visualizar.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__menusCompactosV143) return;
  Prontuario.__menusCompactosV143=true;

  Prontuario.cardDocCompactoV143=function(tipo,d){
    const cid=d.cid||d.cid10||'—';
    return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">${Documentos.icon(tipo)} ${Utils.esc(tipo)}</div>
          <div class="hist-consulta-meta">${Utils.esc(d.data||'—')}</div>
          ${tipo==='Receita'?'':`<div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(cid)}</div>`}
        </div>
        <div class="hist-consulta-actions">
          <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${tipo}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${tipo}','${d.id}')">🖨️ Imprimir</button>
          ${tipo==='Receita'?`<button class="btn btn-sm btn-purple" onclick="Prontuario.imprimirDocControleEspecialV134 && Prontuario.imprimirDocControleEspecialV134('${d.id}')">🧾 Controle especial</button>`:''}
        </div>
      </div>
    </div>`;
  };

  Prontuario.renderDocs=function(key,tipo){
    const list=this.sortDesc(this.docs(key));
    return list.length ? list.map(d=>this.cardDocCompactoV143(tipo,d)).join('') : `<div class="card">Nenhum documento.</div>`;
  };

  Prontuario.renderExames=function(){
    const pedidos=this.docs('EXAMES_PEDIDOS').map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    const anexos=this.docs('EXAMES_ARQUIVOS').map(x=>({...x,tipoDoc:'Exame anexado'}));
    const list=this.sortDesc(pedidos.concat(anexos));
    return list.length ? list.map(d=>this.cardDocCompactoV143(d.tipoDoc,d)).join('') : `<div class="card">Nenhum exame.</div>`;
  };
})();




/* =========================================================
   ZERO V14.4 — Visualizar exames anexados e pedidos robusto
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__examesVisualizarV144) return;
  Prontuario.__examesVisualizarV144=true;

  const oldFindDocV144=Prontuario.findDoc?.bind(Prontuario);
  Prontuario.findDoc=function(tipo,id){
    const t=String(tipo||'').toLowerCase();
    if(t.includes('pedido')){
      return Store.get('EXAMES_PEDIDOS').find(x=>String(x.id)===String(id));
    }
    if(t.includes('anex') || t==='exame'){
      return Store.get('EXAMES_ARQUIVOS').find(x=>String(x.id)===String(id));
    }
    return oldFindDocV144 ? oldFindDocV144(tipo,id) : null;
  };

  const oldVisualizarDocV144=Prontuario.visualizarDoc?.bind(Prontuario);
  Prontuario.visualizarDoc=function(tipo,id){
    const d=this.findDoc(tipo,id);
    if(!d) return Utils.toast('Documento não encontrado.');

    const t=String(tipo||d.tipoDoc||d.tipo||'').toLowerCase();
    if(t.includes('anex') || t==='exame anexado'){
      if(d.dataUrl||d.arquivo||d.url){
        return this.abrirVisualizadorExame ? this.abrirVisualizadorExame(d) : window.open(d.dataUrl||d.arquivo||d.url,'_blank');
      }
    }
    return oldVisualizarDocV144 ? oldVisualizarDocV144(tipo,id) : Modal.open(tipo||'Documento',`<pre>${Utils.esc(JSON.stringify(d,null,2))}</pre>`,`<button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>`,'lg');
  };
})();




/* =========================================================
   ZERO V14.5 — Menu Exames: volta botão Anexar Exame
   Correção:
   - O menu Exames volta a ter botão de anexar exame.
   - Anexo salva direto em EXAMES_ARQUIVOS do paciente.
   - Mantém o visual compacto igual ao Histórico.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__menuExamesAnexarV145) return;
  Prontuario.__menuExamesAnexarV145=true;

  Prontuario.anexarExamePacienteV145=function(){
    const input=document.getElementById('prontuario-exame-anexo-v145');
    if(input) input.click();
  };

  Prontuario.salvarAnexoExamePacienteV145=function(ev){
    const input=ev?.target || document.getElementById('prontuario-exame-anexo-v145');
    const files=Array.from(input?.files||[]);
    if(!files.length) return false;

    const p=this.paciente||this.pac||{};
    let pendentes=files.length;

    const done=()=>{
      pendentes--;
      if(pendentes<=0){
        if(input) input.value='';
        Utils.toast(`${files.length} exame(s) anexado(s).`);
        this.renderTab && this.renderTab('exames');
      }
    };

    files.forEach(file=>{
      const salvar=(dataUrl='')=>{
        const doc={
          id:Utils.id('EX'),
          pacId:p.id||'',
          pacienteId:p.id||'',
          paciente:p.nome||p.nomeCompleto||'',
          pacienteNome:p.nome||p.nomeCompleto||'',
          nome:file.name,
          filename:file.name,
          tipo:'Exame anexado',
          tipoDoc:'Exame anexado',
          mime:file.type||'',
          tipoArquivo:file.type||'',
          tamanho:file.size||0,
          dataUrl:dataUrl||'',
          arquivo:dataUrl||'',
          data:Utils.today(),
          criadoEm:new Date().toISOString()
        };
        Store.upsert('EXAMES_ARQUIVOS',doc);
        done();
      };

      if(window.FileReader){
        const r=new FileReader();
        r.onload=()=>salvar(r.result||'');
        r.onerror=()=>salvar('');
        r.readAsDataURL(file);
      }else{
        salvar('');
      }
    });

    return true;
  };

  Prontuario.renderExames=function(){
    const pedidos=this.docs('EXAMES_PEDIDOS').map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    const anexos=this.docs('EXAMES_ARQUIVOS').map(x=>({...x,tipoDoc:'Exame anexado'}));
    const list=this.sortDesc(pedidos.concat(anexos));

    return `<div class="menu-exames-toolbar-v145">
      <button type="button" class="btn btn-blue" onclick="Prontuario.anexarExamePacienteV145()">📎 Anexar exame</button>
      <input id="prontuario-exame-anexo-v145" type="file" multiple accept=".pdf,image/*,.jpg,.jpeg,.png,.webp,.doc,.docx" style="display:none" onchange="Prontuario.salvarAnexoExamePacienteV145(event)">
    </div>
    ${list.length ? list.map(d=>this.cardDocCompactoV143 ? this.cardDocCompactoV143(d.tipoDoc,d) : `
      <div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143">
        <div class="hist-consulta-head">
          <div class="hist-consulta-main">
            <div class="hist-consulta-title">🧪 ${Utils.esc(d.tipoDoc)}</div>
            <div class="hist-consulta-meta">${Utils.esc(d.data||'—')}</div>
            <div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(d.cid||'—')}</div>
          </div>
          <div class="hist-consulta-actions">
            <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
            <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir</button>
          </div>
        </div>
      </div>`).join('') : `<div class="card">Nenhum exame.</div>`}`;
  };
})();




/* =========================================================
   ZERO V14.6 — Menu Exames volta ao jeito original e salva corretamente
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__menuExamesOriginalSalvarV146) return;
  Prontuario.__menuExamesOriginalSalvarV146=true;

  Prontuario.uploadExamesMenu=function(ev){
    const files=Array.from(ev?.target?.files||[]);
    if(!files.length || !this.paciente) return false;

    const p=this.paciente;
    let pending=files.length;

    const fim=()=>{
      pending--;
      if(pending<=0){
        try{ if(ev.target) ev.target.value=''; }catch(e){}
        Utils.toast('Exame(s) anexado(s).');
        this.abrir(p.id,'exames');
      }
    };

    files.forEach(file=>{
      const salvar=(dataUrl='')=>{
        const prof=(window.Profissionais?.atual ? Profissionais.atual() : {}) || {};
        const item={
          id:Utils.id('EX'),
          pacId:p.id,
          pacienteId:p.id,
          paciente:p.nome||p.nomeCompleto||'',
          pacienteNome:p.nome||p.nomeCompleto||'',
          data:Utils.today(),
          hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
          profissionalId:prof.id||'',
          profissional:prof.nome||'',
          medico:prof.nome||'',
          nome:file.name,
          filename:file.name,
          tipo:'Exame anexado',
          tipoDoc:'Exame anexado',
          mime:file.type||'',
          tipoArquivo:file.type||'',
          tamanho:file.size||0,
          obs:'Anexado pelo menu Exames do prontuário',
          laudo:'Anexado pelo menu Exames do prontuário',
          dataUrl:dataUrl||'',
          arquivo:dataUrl||''
        };
        Store.upsert('EXAMES_ARQUIVOS',item);
        fim();
      };

      if(window.FileReader){
        const r=new FileReader();
        r.onload=()=>salvar(r.result||'');
        r.onerror=()=>salvar('');
        r.readAsDataURL(file);
      }else{
        salvar('');
      }
    });

    return true;
  };

  Prontuario.docsExamesV146=function(){
    const pid=String(this.paciente?.id||'');
    const match=x=>String(x.pacId||x.pacienteId||'')===pid;
    const pedidos=Store.get('EXAMES_PEDIDOS').filter(match).map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    const anexos=Store.get('EXAMES_ARQUIVOS').filter(match).map(x=>({...x,tipoDoc:'Exame anexado'}));

    // inclui temporários do atendimento atual, se forem do mesmo paciente, sem duplicar
    const temp=(window.Documentos?.temp||[]).filter(x=>{
      const t=String(x.tipoDoc||x.tipo||'').toLowerCase();
      return (t.includes('pedido')||t.includes('anex')) && String(x.pacId||x.pacienteId||pid)===pid;
    }).map(x=>({...x,tipoDoc:String(x.tipoDoc||x.tipo||'').toLowerCase().includes('anex')?'Exame anexado':'Pedido de Exames'}));

    const map=new Map();
    pedidos.concat(anexos,temp).forEach(x=>map.set(String(x.id),x));
    return this.sortDesc(Array.from(map.values()));
  };

  Prontuario.renderExames=function(){
    const list=this.docsExamesV146();

    return `<div class="card">
      <div class="row between">
        <div>
          <strong>Exames do paciente</strong>
          <div class="doc-sub">Pedidos de exames e arquivos anexados.</div>
        </div>
        <span class="badge">${list.length}</span>
      </div>
    </div>

    <div class="card">
      <div class="exames-upload-original" onclick="document.getElementById('upload-exames-menu-prontuario')?.click()">
        <div class="exames-upload-icon">📎</div>
        <div class="exames-upload-title">Clique para anexar exames</div>
        <div class="exames-upload-sub">PDF e imagens</div>
        <button type="button" class="btn btn-blue btn-sm">Selecionar arquivo</button>
        <input id="upload-exames-menu-prontuario" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*" multiple style="display:none" onchange="Prontuario.uploadExamesMenu(event)">
      </div>
    </div>

    ${list.length?list.map(d=>{
      if(this.cardDocCompactoV143){
        return this.cardDocCompactoV143(d.tipoDoc,d);
      }
      return `<div class="card">
        <div class="row between">
          <div>
            <strong>${Documentos.icon(d.tipoDoc)} ${Utils.esc(d.tipoDoc)} — ${Utils.esc(d.data||'')}</strong>
            <div class="doc-sub">${Utils.esc(this.resumoDoc ? this.resumoDoc(d) : (d.nome||d.filename||d.exames||''))}</div>
          </div>
          <div class="doc-actions">
            <button class="btn btn-outline btn-sm" onclick="Prontuario.visualizarDoc('${d.tipoDoc}','${d.id}')">👁️ Visualizar</button>
            <button class="btn btn-blue btn-sm" onclick="Prontuario.imprimirDoc('${d.tipoDoc}','${d.id}')">🖨️ Imprimir/Abrir</button>
          </div>
        </div>
      </div>`;
    }).join(''):`<div class="card">Nenhum exame.</div>`}`;
  };
})();




/* =========================================================
   ZERO V14.8 — Menu Exames: visual original + visualizar anexos sem tela branca
   Correções:
   - Card do exame fica compacto igual ao print.
   - Visualizar exame anexado abre modal com imagem/PDF.
   - Se for DOC/DOCX ou arquivo não pré-visualizável, mostra botão baixar.
   - Imprimir/Abrir de exame anexado não abre tela branca.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__examesVisualizadorAnexoV148) return;
  Prontuario.__examesVisualizadorAnexoV148=true;

  Prontuario.docDataUrlV148=function(d){
    return d?.dataUrl || d?.arquivo || d?.base64 || d?.conteudo || d?.url || '';
  };

  Prontuario.docMimeV148=function(d){
    const nome=String(d?.nome||d?.filename||'').toLowerCase();
    const mime=String(d?.mime||d?.tipoArquivo||'').toLowerCase();

    if(mime) return mime;
    if(nome.endsWith('.pdf')) return 'application/pdf';
    if(nome.endsWith('.png')) return 'image/png';
    if(nome.endsWith('.jpg') || nome.endsWith('.jpeg')) return 'image/jpeg';
    if(nome.endsWith('.webp')) return 'image/webp';
    if(nome.endsWith('.gif')) return 'image/gif';
    if(nome.endsWith('.doc')) return 'application/msword';
    if(nome.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return '';
  };

  Prontuario.exameEhImagemV148=function(d){
    const mime=this.docMimeV148(d);
    const data=this.docDataUrlV148(d);
    return mime.startsWith('image/') || data.startsWith('data:image/');
  };

  Prontuario.exameEhPdfV148=function(d){
    const mime=this.docMimeV148(d);
    const data=this.docDataUrlV148(d);
    const nome=String(d?.nome||d?.filename||'').toLowerCase();
    return mime.includes('pdf') || data.startsWith('data:application/pdf') || nome.endsWith('.pdf');
  };

  Prontuario.nomeArquivoV148=function(d){
    return d?.nome || d?.filename || 'exame-anexado';
  };

  Prontuario.baixarExameV148=function(id){
    const d=Store.get('EXAMES_ARQUIVOS').find(x=>String(x.id)===String(id));
    if(!d) return Utils.toast('Exame não encontrado.');

    const data=this.docDataUrlV148(d);
    if(!data) return Utils.toast('Arquivo não possui conteúdo salvo.');

    const a=document.createElement('a');
    a.href=data;
    a.download=this.nomeArquivoV148(d);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  Prontuario.imprimirAnexoExameV148=function(id){
    const d=Store.get('EXAMES_ARQUIVOS').find(x=>String(x.id)===String(id));
    if(!d) return Utils.toast('Exame não encontrado.');

    const data=this.docDataUrlV148(d);
    if(!data) return Utils.toast('Arquivo não possui conteúdo salvo.');

    if(this.exameEhImagemV148(d)){
      const w=window.open('','_blank');
      if(!w) return this.abrirVisualizadorExameV148(d);
      w.document.write(`<html><head><title>${Utils.esc(this.nomeArquivoV148(d))}</title></head><body style="margin:0;text-align:center"><img src="${data}" style="max-width:100%;height:auto"></body></html>`);
      w.document.close();
      setTimeout(()=>{try{w.focus();w.print();}catch(e){}},300);
      return true;
    }

    if(this.exameEhPdfV148(d)){
      const w=window.open('','_blank');
      if(!w) return this.abrirVisualizadorExameV148(d);
      w.document.write(`<html><head><title>${Utils.esc(this.nomeArquivoV148(d))}</title></head><body style="margin:0"><iframe src="${data}" style="width:100%;height:100vh;border:0"></iframe></body></html>`);
      w.document.close();
      return true;
    }

    return this.baixarExameV148(id);
  };

  Prontuario.abrirVisualizadorExameV148=function(d){
    const data=this.docDataUrlV148(d);
    const nome=this.nomeArquivoV148(d);
    const mime=this.docMimeV148(d);

    let conteudo='';
    if(data && this.exameEhImagemV148(d)){
      conteudo=`<div class="exame-viewer-v148"><img src="${data}" alt="${Utils.esc(nome)}"></div>`;
    }else if(data && this.exameEhPdfV148(d)){
      conteudo=`<div class="exame-viewer-v148 pdf"><iframe src="${data}" title="${Utils.esc(nome)}"></iframe></div>`;
    }else if(data){
      conteudo=`<div class="exame-download-box-v148">
        <div class="ico">📎</div>
        <strong>${Utils.esc(nome)}</strong>
        <div class="doc-sub">${Utils.esc(mime||'Arquivo anexado')}</div>
        <p>Este tipo de arquivo não abre direto no visualizador. Use o botão abaixo para baixar/abrir.</p>
        <button class="btn btn-blue" onclick="Prontuario.baixarExameV148('${d.id}')">Baixar / Abrir arquivo</button>
      </div>`;
    }else{
      conteudo=`<div class="exame-download-box-v148">
        <div class="ico">⚠️</div>
        <strong>${Utils.esc(nome)}</strong>
        <p>Este anexo foi encontrado no menu, mas o conteúdo do arquivo não está salvo no registro.</p>
      </div>`;
    }

    Modal.open('👁️ Visualizar exame',`
      <div class="doc-original-banner doc-banner-blue">
        Arquivo: <strong>${Utils.esc(nome)}</strong> &nbsp;|&nbsp; Data: ${Utils.esc(d.data||'—')}
      </div>
      ${conteudo}
    `,`
      ${data?`<button class="btn btn-outline" onclick="Prontuario.baixarExameV148('${d.id}')">Baixar</button>`:''}
      ${data?`<button class="btn btn-blue" onclick="Prontuario.imprimirAnexoExameV148('${d.id}')">Imprimir/Abrir</button>`:''}
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
    `,'xl');

    return true;
  };

  const oldFindDocV148=Prontuario.findDoc?.bind(Prontuario);
  Prontuario.findDoc=function(tipo,id){
    const t=String(tipo||'').toLowerCase();
    if(t.includes('pedido')){
      return Store.get('EXAMES_PEDIDOS').find(x=>String(x.id)===String(id));
    }
    if(t.includes('anex') || t==='exame' || t.includes('arquivo')){
      return Store.get('EXAMES_ARQUIVOS').find(x=>String(x.id)===String(id));
    }
    return oldFindDocV148 ? oldFindDocV148(tipo,id) : null;
  };

  const oldVisualizarDocV148=Prontuario.visualizarDoc?.bind(Prontuario);
  Prontuario.visualizarDoc=function(tipo,id){
    const d=this.findDoc(tipo,id);
    if(!d) return Utils.toast('Documento não encontrado.');

    const t=String(tipo||d.tipoDoc||d.tipo||'').toLowerCase();
    if(t.includes('anex') || t==='exame anexado' || t.includes('arquivo')){
      return this.abrirVisualizadorExameV148(d);
    }

    return oldVisualizarDocV148 ? oldVisualizarDocV148(tipo,id) : false;
  };

  const oldImprimirDocV148=Prontuario.imprimirDoc?.bind(Prontuario);
  Prontuario.imprimirDoc=function(tipo,id){
    const d=this.findDoc(tipo,id);
    const t=String(tipo||d?.tipoDoc||d?.tipo||'').toLowerCase();

    if(d && (t.includes('anex') || t==='exame anexado' || t.includes('arquivo'))){
      return this.imprimirAnexoExameV148(id);
    }

    return oldImprimirDocV148 ? oldImprimirDocV148(tipo,id) : false;
  };

  Prontuario.cardDocCompactoV143=function(tipo,d){
    const cid=d.cid||d.cid10||'—';
    return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">${Documentos.icon(tipo)} ${Utils.esc(tipo)}</div>
          <div class="hist-consulta-meta">${Utils.esc(d.data||'—')}</div>
          ${tipo==='Receita'?'':`<div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(cid)}</div>`}
        </div>
        <div class="hist-consulta-actions">
          <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${tipo}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${tipo}','${d.id}')">🖨️ Imprimir</button>
          ${tipo==='Receita'?`<button class="btn btn-sm btn-purple" onclick="Prontuario.imprimirDocControleEspecialV134 && Prontuario.imprimirDocControleEspecialV134('${d.id}')">🧾 Controle especial</button>`:''}
        </div>
      </div>
    </div>`;
  };
})();




/* =========================================================
   ZERO V14.9 — Menu Exames: visualizar sem branco + excluir anexo
   Correções:
   - Volta o botão Excluir para Exame anexado.
   - Excluir remove de EXAMES_ARQUIVOS e atualiza o menu Exames.
   - Visualizar anexo continua abrindo imagem/PDF no modal.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__examesExcluirAnexosV149) return;
  Prontuario.__examesExcluirAnexosV149=true;

  Prontuario.excluirAnexoExameV149=function(id){
    const lista=Store.get('EXAMES_ARQUIVOS')||[];
    const existe=lista.find(x=>String(x.id)===String(id));
    if(!existe) return Utils.toast('Anexo não encontrado.');

    if(!confirm('Excluir este anexo de exame?')) return false;

    Store.set('EXAMES_ARQUIVOS',lista.filter(x=>String(x.id)!==String(id)));

    // remove também de documentos temporários, se existir aberto em atendimento
    if(window.Documentos && Array.isArray(Documentos.temp)){
      Documentos.temp=Documentos.temp.filter(x=>String(x.id)!==String(id));
      try{ Documentos.tempBackupV108=Utils.clone(Documentos.temp); }catch(e){}
    }
    if(window.RegistrarConsulta && Array.isArray(RegistrarConsulta.docsBackupV108)){
      RegistrarConsulta.docsBackupV108=RegistrarConsulta.docsBackupV108.filter(x=>String(x.id)!==String(id));
    }

    Utils.toast('Anexo excluído.');
    this.abrir(this.paciente.id,'exames');
    return true;
  };

  Prontuario.cardDocCompactoV143=function(tipo,d){
    const cid=d.cid||d.cid10||'—';
    const tipoTxt=String(tipo||d.tipoDoc||d.tipo||'');
    const ehAnexo=tipoTxt.toLowerCase().includes('anex');

    return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">${Documentos.icon(tipoTxt)} ${Utils.esc(tipoTxt)}</div>
          <div class="hist-consulta-meta">${Utils.esc(d.data||'—')}</div>
          ${tipoTxt==='Receita'?'':`<div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(cid)}</div>`}
        </div>
        <div class="hist-consulta-actions">
          <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${tipoTxt}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${tipoTxt}','${d.id}')">🖨️ Imprimir</button>
          ${ehAnexo?`<button class="btn btn-sm btn-red" onclick="Prontuario.excluirAnexoExameV149('${d.id}')">Excluir</button>`:''}
          ${tipoTxt==='Receita'?`<button class="btn btn-sm btn-purple" onclick="Prontuario.imprimirDocControleEspecialV134 && Prontuario.imprimirDocControleEspecialV134('${d.id}')">🧾 Controle especial</button>`:''}
        </div>
      </div>
    </div>`;
  };

  // reforça o menu Exames: card compacto + upload original + botão excluir no anexo
  Prontuario.renderExames=function(){
    const pid=String(this.paciente?.id||'');
    const match=x=>String(x.pacId||x.pacienteId||'')===pid;

    const pedidos=Store.get('EXAMES_PEDIDOS').filter(match).map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    const anexos=Store.get('EXAMES_ARQUIVOS').filter(match).map(x=>({...x,tipoDoc:'Exame anexado'}));

    const list=this.sortDesc(pedidos.concat(anexos));

    return `<div class="card">
      <div class="row between">
        <div>
          <strong>Exames do paciente</strong>
          <div class="doc-sub">Pedidos de exames e arquivos anexados.</div>
        </div>
        <span class="badge">${list.length}</span>
      </div>
    </div>

    <div class="card">
      <div class="exames-upload-original" onclick="document.getElementById('upload-exames-menu-prontuario')?.click()">
        <div class="exames-upload-icon">📎</div>
        <div class="exames-upload-title">Clique para anexar exames</div>
        <div class="exames-upload-sub">PDF e imagens</div>
        <button type="button" class="btn btn-blue btn-sm">Selecionar arquivo</button>
        <input id="upload-exames-menu-prontuario" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,.doc,.docx" multiple style="display:none" onchange="Prontuario.uploadExamesMenu(event)">
      </div>
    </div>

    ${list.length?list.map(d=>this.cardDocCompactoV143(d.tipoDoc,d)).join(''):`<div class="card">Nenhum exame.</div>`}`;
  };
})();




/* =========================================================
   ZERO V15.0 — Menu Exames: card de anexo mostra arquivo/tipo
   Correção:
   - Exame anexado NÃO mostra CID.
   - Exame anexado mostra nome do arquivo.
   - Exame anexado mostra se é PDF, Imagem ou Arquivo.
   - Mantém Visualizar / Imprimir / Excluir.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__examesCardArquivoTipoV150) return;
  Prontuario.__examesCardArquivoTipoV150=true;

  Prontuario.tipoArquivoExameV150=function(d){
    const nome=String(d?.nome||d?.filename||'').toLowerCase();
    const mime=String(d?.mime||d?.tipoArquivo||'').toLowerCase();
    const tipo=String(d?.tipoOriginal||d?.tipoArquivoOriginal||d?.tipo||'').toLowerCase();
    const data=String(d?.dataUrl||d?.arquivo||'').toLowerCase();

    if(mime.includes('pdf') || nome.endsWith('.pdf') || data.startsWith('data:application/pdf') || tipo==='pdf') return 'PDF';
    if(mime.startsWith('image/') || nome.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/) || data.startsWith('data:image/') || tipo==='img' || tipo==='imagem') return 'Imagem';
    if(nome.endsWith('.doc') || nome.endsWith('.docx') || mime.includes('word')) return 'Documento';
    return 'Arquivo';
  };

  Prontuario.nomeArquivoExameV150=function(d){
    return d?.nome || d?.filename || d?.arquivoNome || d?.titulo || 'Arquivo anexado';
  };

  Prontuario.cardDocCompactoV143=function(tipo,d){
    const tipoTxt=String(tipo||d.tipoDoc||d.tipo||'');
    const ehAnexo=tipoTxt.toLowerCase().includes('anex');

    if(ehAnexo){
      const nome=this.nomeArquivoExameV150(d);
      const tipoArq=this.tipoArquivoExameV150(d);

      return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143">
        <div class="hist-consulta-head">
          <div class="hist-consulta-main">
            <div class="hist-consulta-title">${Documentos.icon(tipoTxt)} ${Utils.esc(tipoTxt)}</div>
            <div class="hist-consulta-meta">${Utils.esc(d.data||'—')}</div>
            <div class="exame-file-info-v150">
              <strong>Arquivo:</strong> ${Utils.esc(nome)}
              <span class="exame-file-badge-v150">${Utils.esc(tipoArq)}</span>
            </div>
          </div>
          <div class="hist-consulta-actions">
            <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${tipoTxt}','${d.id}')">👁️ Visualizar</button>
            <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${tipoTxt}','${d.id}')">🖨️ Imprimir</button>
            <button class="btn btn-sm btn-red" onclick="Prontuario.excluirAnexoExameV149('${d.id}')">Excluir</button>
          </div>
        </div>
      </div>`;
    }

    const cid=d.cid||d.cid10||'—';
    return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">${Documentos.icon(tipoTxt)} ${Utils.esc(tipoTxt)}</div>
          <div class="hist-consulta-meta">${Utils.esc(d.data||'—')}</div>
          ${tipoTxt==='Receita'?'':`<div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(cid)}</div>`}
        </div>
        <div class="hist-consulta-actions">
          <button class="btn btn-sm btn-outline" onclick="Prontuario.visualizarDoc('${tipoTxt}','${d.id}')">👁️ Visualizar</button>
          <button class="btn btn-sm btn-blue" onclick="Prontuario.imprimirDoc('${tipoTxt}','${d.id}')">🖨️ Imprimir</button>
          ${tipoTxt==='Receita'?`<button class="btn btn-sm btn-purple" onclick="Prontuario.imprimirDocControleEspecialV134 && Prontuario.imprimirDocControleEspecialV134('${d.id}')">🧾 Controle especial</button>`:''}
        </div>
      </div>
    </div>`;
  };
})();




/* =========================================================
   ZERO V16.1 — IMC automático desde o primeiro cadastro de sinais vitais
   Correções:
   - IMC calcula automaticamente ao digitar peso e altura.
   - Aceita altura em metros (1,70) ou centímetros (170).
   - Salvar sinais vitais sempre recalcula o IMC antes de gravar.
   - O campo IMC fica automático/read-only para não salvar vazio.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__imcAutomaticoV161) return;
  Prontuario.__imcAutomaticoV161=true;

  Prontuario.numeroBRV161=function(v){
    let s=String(v||'').trim();
    if(!s) return 0;
    s=s.replace(/[^\d,.-]/g,'').replace(',','.');
    return parseFloat(s)||0;
  };

  Prontuario.calcIMC=function(peso,altura){
    const p=this.numeroBRV161 ? this.numeroBRV161(peso) : parseFloat(String(peso||'').replace(',','.'));
    let a=this.numeroBRV161 ? this.numeroBRV161(altura) : parseFloat(String(altura||'').replace(',','.'));
    if(a>3) a=a/100; // altura digitada em cm
    if(!p || !a) return '';
    return (p/(a*a)).toFixed(1).replace('.',',');
  };

  Prontuario.atualizarIMCForm=function(){
    const peso=document.getElementById('sv-peso-tab')?.value||'';
    const altura=document.getElementById('sv-altura-tab')?.value||'';
    const imc=this.calcIMC(peso,altura);
    const el=document.getElementById('sv-imc-tab');
    if(el){
      el.value=imc;
      el.readOnly=true;
      el.placeholder='automático';
    }
    return imc;
  };

  const oldRenderSinaisVitaisV161=Prontuario.renderSinaisVitais?.bind(Prontuario);
  Prontuario.renderSinaisVitais=function(){
    const html=oldRenderSinaisVitaisV161 ? oldRenderSinaisVitaisV161() : '';
    setTimeout(()=>{
      const peso=document.getElementById('sv-peso-tab');
      const altura=document.getElementById('sv-altura-tab');
      const imc=document.getElementById('sv-imc-tab');
      if(imc){
        imc.readOnly=true;
        imc.placeholder='automático';
      }
      if(peso) peso.setAttribute('oninput','Prontuario.atualizarIMCForm()');
      if(altura) altura.setAttribute('oninput','Prontuario.atualizarIMCForm()');
      this.atualizarIMCForm();
    },40);
    return html;
  };

  Prontuario.salvarSinaisVitais=function(){
    const prof=(window.Profissionais?.atual?.()||{});
    const peso=document.getElementById('sv-peso-tab')?.value.trim()||'';
    const altura=document.getElementById('sv-altura-tab')?.value.trim()||'';
    const imc=this.calcIMC(peso,altura);
    const imcEl=document.getElementById('sv-imc-tab');
    if(imcEl) imcEl.value=imc;

    const sv={
      id:Utils.id('SV'),
      pacId:this.paciente.id,
      pacienteId:this.paciente.id,
      data:Utils.today(),
      dataHora:new Date().toISOString(),
      medico:prof.nome||'',
      pa:document.getElementById('sv-pa-tab')?.value.trim()||'',
      fc:document.getElementById('sv-fc-tab')?.value.trim()||'',
      fr:document.getElementById('sv-fr-tab')?.value.trim()||'',
      temp:document.getElementById('sv-temp-tab')?.value.trim()||'',
      peso,
      altura,
      circAbd:document.getElementById('sv-circ-tab')?.value.trim()||'',
      imc,
      spo2:document.getElementById('sv-spo2-tab')?.value.trim()||'',
      hgt:document.getElementById('sv-hgt-tab')?.value.trim()||'',
      obs:document.getElementById('sv-obs-tab')?.value.trim()||''
    };

    const temValor=['pa','fc','fr','temp','peso','altura','circAbd','imc','spo2','hgt','obs'].some(k=>String(sv[k]||'').trim());
    if(!temValor) return Utils.toast('Informe ao menos um sinal vital.');

    if((peso && altura) && !imc){
      return Utils.toast('Confira peso e altura para calcular o IMC.');
    }

    Store.upsert('SINAIS_VITAIS',sv);
    Utils.toast('Sinais vitais salvos.');
    this.abrir(this.paciente.id,'sinais');
    return true;
  };
})();




/* =========================================================
   ZERO V16.3 — Selecionar arquivo salva de verdade no menu Exames
   Correções:
   - Botão Selecionar arquivo do menu Exames volta a salvar.
   - Salva PDF/imagem/documento em EXAMES_ARQUIVOS com dataUrl/arquivo.
   - Atualiza a lista após anexar.
   - Mantém Visualizar / Imprimir / Excluir.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__selecionarArquivoSalvarV163) return;
  Prontuario.__selecionarArquivoSalvarV163=true;

  Prontuario.pacienteUploadExamesV163=function(){
    if(this.paciente?.id) return this.paciente;
    const pid=document.querySelector('[data-paciente-id]')?.getAttribute('data-paciente-id') || '';
    if(pid) return Store.get('PACIENTES').find(p=>String(p.id)===String(pid)) || null;
    return null;
  };

  Prontuario.tipoAnexoV163=function(file){
    const nome=String(file?.name||'').toLowerCase();
    const mime=String(file?.type||'').toLowerCase();
    if(mime.includes('pdf') || nome.endsWith('.pdf')) return 'PDF';
    if(mime.startsWith('image/') || nome.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/)) return 'Imagem';
    if(nome.endsWith('.doc') || nome.endsWith('.docx') || mime.includes('word')) return 'Documento';
    return 'Arquivo';
  };

  Prontuario.salvarArquivoExameV163=function(file,dataUrl='',paciente=null){
    const p=paciente || this.pacienteUploadExamesV163();
    if(!p?.id) return false;

    const prof=(window.Profissionais?.atual ? (Profissionais.atual()||{}) : {}) || {};
    const item={
      id:Utils.id('EX'),
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      data:Utils.today(),
      hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:new Date().toISOString(),
      profissionalId:prof.id||'',
      profissional:prof.nome||'',
      medico:prof.nome||'',
      nome:file?.name||'arquivo',
      filename:file?.name||'arquivo',
      arquivoNome:file?.name||'arquivo',
      tipo:'Exame anexado',
      tipoDoc:'Exame anexado',
      tipoArquivo:file?.type||'',
      mime:file?.type||'',
      tamanho:file?.size||0,
      tipoArquivoOriginal:this.tipoAnexoV163(file),
      obs:'Anexado pelo menu Exames do prontuário',
      laudo:'Anexado pelo menu Exames do prontuário',
      dataUrl:dataUrl||'',
      arquivo:dataUrl||'',
      conteudo:dataUrl||''
    };

    Store.upsert('EXAMES_ARQUIVOS',item);
    return item;
  };

  Prontuario.uploadExamesMenu=function(ev){
    ev?.preventDefault?.();
    ev?.stopPropagation?.();

    const input=ev?.target || document.getElementById('upload-exames-menu-prontuario');
    const files=Array.from(input?.files||[]);
    const p=this.pacienteUploadExamesV163();

    if(!p?.id){
      Utils.toast('Paciente não encontrado para anexar arquivo.');
      return false;
    }

    if(!files.length){
      Utils.toast('Selecione ao menos um arquivo.');
      return false;
    }

    let pendentes=files.length;
    let salvos=0;

    const finalizar=()=>{
      pendentes--;
      if(pendentes<=0){
        try{ if(input) input.value=''; }catch(e){}
        Utils.toast(`${salvos} arquivo(s) salvo(s) em Exames.`);
        this.paciente=p;
        this.abrir(p.id,'exames');
      }
    };

    files.forEach(file=>{
      const salvar=(dataUrl='')=>{
        try{
          const item=this.salvarArquivoExameV163(file,dataUrl,p);
          if(item) salvos++;
        }catch(e){
          console.error('Erro ao salvar exame anexado',e);
          Utils.toast('Erro ao salvar um arquivo. Verifique o tamanho do arquivo.');
        }
        finalizar();
      };

      if(window.FileReader){
        const r=new FileReader();
        r.onload=()=>salvar(r.result||'');
        r.onerror=()=>salvar('');
        r.readAsDataURL(file);
      }else{
        salvar('');
      }
    });

    return true;
  };

  Prontuario.docsExamesV163=function(){
    const pid=String(this.paciente?.id||'');
    const match=x=>String(x.pacId||x.pacienteId||'')===pid;
    const pedidos=Store.get('EXAMES_PEDIDOS').filter(match).map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    const anexos=Store.get('EXAMES_ARQUIVOS').filter(match).map(x=>({...x,tipoDoc:'Exame anexado'}));

    const temp=(window.Documentos?.temp||[]).filter(x=>{
      const t=String(x.tipoDoc||x.tipo||'').toLowerCase();
      return (t.includes('pedido')||t.includes('anex')) && String(x.pacId||x.pacienteId||pid)===pid;
    }).map(x=>({...x,tipoDoc:String(x.tipoDoc||x.tipo||'').toLowerCase().includes('anex')?'Exame anexado':'Pedido de Exames'}));

    const map=new Map();
    pedidos.concat(anexos,temp).forEach(x=>map.set(String(x.id),x));
    return this.sortDesc(Array.from(map.values()));
  };

  Prontuario.renderExames=function(){
    const list=this.docsExamesV163();

    return `<div class="card">
      <div class="row between">
        <div>
          <strong>Exames do paciente</strong>
          <div class="doc-sub">Pedidos de exames e arquivos anexados.</div>
        </div>
        <span class="badge">${list.length}</span>
      </div>
    </div>

    <div class="card">
      <div class="exames-upload-original" onclick="document.getElementById('upload-exames-menu-prontuario')?.click()">
        <div class="exames-upload-icon">📎</div>
        <div class="exames-upload-title">Clique para anexar exames</div>
        <div class="exames-upload-sub">PDF e imagens</div>
        <button type="button" class="btn btn-blue btn-sm" onclick="event.stopPropagation();document.getElementById('upload-exames-menu-prontuario')?.click()">Selecionar arquivo</button>
        <input id="upload-exames-menu-prontuario" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,.doc,.docx,application/pdf" multiple style="display:none" onchange="Prontuario.uploadExamesMenu(event)">
      </div>
    </div>

    ${list.length?list.map(d=>this.cardDocCompactoV143(d.tipoDoc,d)).join(''):`<div class="card">Nenhum exame.</div>`}`;
  };

  document.addEventListener('change',function(ev){
    const el=ev.target;
    if(el && el.id==='upload-exames-menu-prontuario'){
      ev.stopPropagation();
      Prontuario.uploadExamesMenu(ev);
    }
  },true);
})();




/* =========================================================
   ZERO V16.5 — Cards salvos no prontuário com ícones + Receita 2 impressões
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__cardsIconesReceitaPrintV165) return;
  Prontuario.__cardsIconesReceitaPrintV165=true;

  Prontuario.imprimirDocReceitaNormalV165=function(id){
    const d=this.findDoc('Receita',id)||this.findDoc('RECEITAS',id);
    if(!d) return Utils.toast('Receita não encontrada.');
    return Impressao.print({...d,tipoDoc:'Receita',tipo:'Receita',tipoPrint:'receita',controleEspecial:false});
  };

  Prontuario.imprimirDocControleEspecialV165=function(id){
    const d=this.findDoc('Receita',id)||this.findDoc('RECEITAS',id);
    if(!d) return Utils.toast('Receita não encontrada.');
    return Impressao.print({...d,tipoDoc:'Receita',tipo:'Receita',tipoPrint:'receita-controle',controleEspecial:true});
  };

  Prontuario.cardDocCompactoV143=function(tipo,d){
    const tipoTxt=String(tipo||d.tipoDoc||d.tipo||'Documento');
    const tipoLower=tipoTxt.toLowerCase();
    const ehAnexo=tipoLower.includes('anex');
    const ehReceita=tipoTxt==='Receita' || tipoLower.includes('receita');
    const cid=d.cid||d.cid10||'—';

    let extra='';
    if(ehAnexo && this.tipoArquivoExameV150){
      extra=`<div class="exame-file-info-v150"><span>${Utils.esc(d.nome||d.filename||'Arquivo anexado')}</span><span class="exame-file-badge-v150">${Utils.esc(this.tipoArquivoExameV150(d))}</span></div>`;
    }else if(!ehReceita){
      extra=`<div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(cid)}</div>`;
    }

    return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">${Documentos.icon(tipoTxt)} ${Utils.esc(tipoTxt)}</div>
          <div class="hist-consulta-meta">${Utils.esc(d.data||'—')}</div>
          ${extra}
        </div>
        <div class="hist-consulta-actions doc-actions-icons-v165">
          <button class="btn btn-sm btn-outline doc-icon-btn-v165" title="Visualizar" aria-label="Visualizar" onclick="Prontuario.visualizarDoc('${tipoTxt}','${d.id}')">👁️</button>
          <button class="btn btn-sm btn-blue doc-icon-btn-v165" title="${ehReceita?'Imprimir receita normal':'Imprimir/Abrir'}" aria-label="${ehReceita?'Imprimir receita normal':'Imprimir/Abrir'}" onclick="${ehReceita?`Prontuario.imprimirDocReceitaNormalV165('${d.id}')`:`Prontuario.imprimirDoc('${tipoTxt}','${d.id}')`}">🖨️</button>
          ${ehReceita?`<button class="btn btn-sm btn-purple doc-icon-btn-v165" title="Imprimir controle especial" aria-label="Imprimir controle especial" onclick="Prontuario.imprimirDocControleEspecialV165('${d.id}')">🧾</button>`:''}
          ${ehAnexo?`<button class="btn btn-sm btn-red doc-icon-btn-v165" title="Excluir" aria-label="Excluir" onclick="Prontuario.excluirAnexoExameV149 && Prontuario.excluirAnexoExameV149('${d.id}')">🗑️</button>`:''}
        </div>
      </div>
    </div>`;
  };
})();




/* =========================================================
   ZERO V17.0 — Visualizar anexos salvos sem tela branca
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__visualizarAnexosSemBrancoV170) return;
  Prontuario.__visualizarAnexosSemBrancoV170=true;

  Prontuario.visualizarDoc=function(tipo,id){
    const d=this.findDoc ? this.findDoc(tipo,id) : null;
    if(!d) return Utils.toast('Documento não encontrado.');
    const tipoTxt=String(tipo||d.tipoDoc||d.tipo||'Documento');

    // Usa o visualizador seguro em camada própria para anexos e documentos salvos.
    if(window.Documentos && Documentos.abrirViewerCamadaV170 && Documentos.conteudoDocV170){
      const html=Documentos.conteudoDocV170(d,tipoTxt);
      const footer=`<button type="button" class="btn btn-blue" onclick="Prontuario.imprimirDoc('${tipoTxt}','${id}')">Imprimir/Abrir</button>`;
      return Documentos.abrirViewerCamadaV170(`👁️ ${tipoTxt}`,html,footer);
    }

    Utils.toast('Visualizador não encontrado.');
    return false;
  };
})();




/* =========================================================
   ZERO V17.1 — Menu Exames mostra só o que já foi salvo
   Regra:
   - Anexos/documentos feitos dentro de Registrar Consulta só aparecem no menu Exames
     depois de salvar o Registrar Consulta.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__menuExamesSomenteSalvosV171) return;
  Prontuario.__menuExamesSomenteSalvosV171=true;

  Prontuario.docsExamesV163=function(){
    const pid=String(this.paciente?.id||'');
    const match=x=>String(x.pacId||x.pacienteId||'')===pid;
    const pedidos=Store.get('EXAMES_PEDIDOS').filter(match).map(x=>({...x,tipoDoc:'Pedido de Exames'}));
    const anexos=Store.get('EXAMES_ARQUIVOS').filter(match).map(x=>({...x,tipoDoc:'Exame anexado'}));
    const map=new Map();
    pedidos.concat(anexos).forEach(x=>map.set(String(x.id),x));
    return this.sortDesc(Array.from(map.values()));
  };
})();




/* =========================================================
   ZERO V17.2 — Menus Receitas / Atestados / Laudos com data e profissional
   Regra:
   - Card mostra o tipo do documento.
   - Mostra data de criação/emissão.
   - Mostra profissional que emitiu.
   - Mantém cards compactos e botões por ícones.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__menusDocsDataProfV172) return;
  Prontuario.__menusDocsDataProfV172=true;

  Prontuario.dataBRDocV172=function(v){
    if(!v) return '';
    const s=String(v);
    if(/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}/.test(s)){
      const [y,m,d]=s.slice(0,10).split('-');
      return `${d}/${m}/${y}`;
    }
    const dt=new Date(s);
    if(!isNaN(dt.getTime())) return dt.toLocaleDateString('pt-BR');
    return s;
  };

  Prontuario.docHistoricoV172=function(d){
    const h=Store.get('HISTORICO')||[];
    const id=String(d?.histId||d?.historicoId||'');
    const cons=String(d?.consultaId||d?.atendimentoId||'');
    if(id){
      const found=h.find(x=>String(x.id)===id);
      if(found) return found;
    }
    if(cons){
      const found=h.find(x=>String(x.consultaId||x.atendimentoId||'')===cons);
      if(found) return found;
    }
    return null;
  };

  Prontuario.dataDocMenuV172=function(d){
    const h=this.docHistoricoV172(d)||{};
    return this.dataBRDocV172(d?.data||d?.dataEmissao||d?.criadoEm||d?.createdAt||d?.dataHora||h.data||h.criadoEm) || '—';
  };

  Prontuario.profissionalDocMenuV172=function(d){
    const h=this.docHistoricoV172(d)||{};
    return d?.profissional || d?.medico || d?.profissionalNome || d?.medicoNome ||
      d?.emitidoPor || d?.usuario || h.medico || h.profissional || '—';
  };

  Prontuario.tipoDocMenuV172=function(tipo,d){
    const t=String(tipo||d?.tipoDoc||d?.tipo||'Documento').toLowerCase();
    if(t.includes('receita')) return 'Receita';
    if(t.includes('atestado') || t.includes('comparecimento')) return 'Atestado';
    if(t.includes('laudo')) return 'Laudo';
    if(t.includes('pedido')) return 'Pedido de Exames';
    if(t.includes('anex')) return 'Exame anexado';
    return tipo||d?.tipoDoc||d?.tipo||'Documento';
  };

  Prontuario.cardDocCompactoV143=function(tipo,d){
    const tipoTxt=this.tipoDocMenuV172(tipo,d);
    const tipoLower=String(tipoTxt).toLowerCase();
    const ehAnexo=tipoLower.includes('anex');
    const ehReceita=tipoLower.includes('receita');
    const data=this.dataDocMenuV172(d);
    const prof=this.profissionalDocMenuV172(d);
    const cid=d.cid||d.cid10||'—';

    let extra='';
    if(ehAnexo && this.tipoArquivoExameV150){
      extra=`<div class="exame-file-info-v150"><span>${Utils.esc(d.nome||d.filename||'Arquivo anexado')}</span><span class="exame-file-badge-v150">${Utils.esc(this.tipoArquivoExameV150(d))}</span></div>`;
    }else if(tipoTxt==='Receita' || tipoTxt==='Atestado' || tipoTxt==='Laudo'){
      extra=`<div class="doc-menu-meta-v172">
        <span>📅 ${Utils.esc(data)}</span>
        <span>👨‍⚕️ ${Utils.esc(prof)}</span>
      </div>`;
      if(tipoTxt!=='Receita' && cid && cid!=='—'){
        extra+=`<div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(cid)}</div>`;
      }
    }else{
      extra=`<div class="hist-consulta-meta">${Utils.esc(data)}</div>`;
      if(!ehReceita) extra+=`<div class="hist-consulta-cid-v136"><strong>CID:</strong> ${Utils.esc(cid)}</div>`;
    }

    return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143 doc-menu-card-v172">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">${Documentos.icon(tipoTxt)} ${Utils.esc(tipoTxt)}</div>
          ${extra}
        </div>
        <div class="hist-consulta-actions doc-actions-icons-v165">
          <button class="btn btn-sm btn-outline doc-icon-btn-v165" title="Visualizar" aria-label="Visualizar" onclick="Prontuario.visualizarDoc('${tipoTxt}','${d.id}')">👁️</button>
          <button class="btn btn-sm btn-blue doc-icon-btn-v165" title="${ehReceita?'Imprimir receita normal':'Imprimir/Abrir'}" aria-label="${ehReceita?'Imprimir receita normal':'Imprimir/Abrir'}" onclick="${ehReceita?`Prontuario.imprimirDocReceitaNormalV165('${d.id}')`:`Prontuario.imprimirDoc('${tipoTxt}','${d.id}')`}">🖨️</button>
          ${ehReceita?`<button class="btn btn-sm btn-purple doc-icon-btn-v165" title="Imprimir controle especial" aria-label="Imprimir controle especial" onclick="Prontuario.imprimirDocControleEspecialV165('${d.id}')">🧾</button>`:''}
          ${ehAnexo?`<button class="btn btn-sm btn-red doc-icon-btn-v165" title="Excluir" aria-label="Excluir" onclick="Prontuario.excluirAnexoExameV149 && Prontuario.excluirAnexoExameV149('${d.id}')">🗑️</button>`:''}
        </div>
      </div>
    </div>`;
  };

  Prontuario.renderDocs=function(key,tipo){
    const list=this.sortDesc(this.docs(key));
    return list.length ? list.map(d=>this.cardDocCompactoV143(tipo,d)).join('') : `<div class="card">Nenhum documento.</div>`;
  };
})();




/* =========================================================
   ZERO V17.3 — Cards de documentos sem CID em Receitas/Atestados/Laudos
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__cardsDocsSemCidV173) return;
  Prontuario.__cardsDocsSemCidV173=true;

  Prontuario.cardDocCompactoV143=function(tipo,d){
    const tipoTxt=this.tipoDocMenuV172 ? this.tipoDocMenuV172(tipo,d) : (tipo||d.tipoDoc||d.tipo||'Documento');
    const tipoLower=String(tipoTxt).toLowerCase();
    const ehAnexo=tipoLower.includes('anex');
    const ehReceita=tipoLower.includes('receita');
    const ehDocClinico=['Receita','Atestado','Laudo'].includes(tipoTxt);
    const data=this.dataDocMenuV172 ? this.dataDocMenuV172(d) : (d.data||'—');
    const prof=this.profissionalDocMenuV172 ? this.profissionalDocMenuV172(d) : (d.profissional||d.medico||'—');

    let extra='';
    if(ehAnexo && this.tipoArquivoExameV150){
      extra=`<div class="exame-file-info-v150"><span>${Utils.esc(d.nome||d.filename||'Arquivo anexado')}</span><span class="exame-file-badge-v150">${Utils.esc(this.tipoArquivoExameV150(d))}</span></div>`;
    }else if(ehDocClinico){
      extra=`<div class="doc-menu-meta-v172">
        <span>📅 ${Utils.esc(data)}</span>
        <span>👨‍⚕️ ${Utils.esc(prof)}</span>
      </div>`;
    }else{
      extra=`<div class="hist-consulta-meta">${Utils.esc(data)}</div>`;
    }

    return `<div class="hist-consulta-card hist-original-visual-v136 doc-compact-v143 doc-menu-card-v172">
      <div class="hist-consulta-head">
        <div class="hist-consulta-main">
          <div class="hist-consulta-title">${Documentos.icon(tipoTxt)} ${Utils.esc(tipoTxt)}</div>
          ${extra}
        </div>
        <div class="hist-consulta-actions doc-actions-icons-v165">
          <button class="btn btn-sm btn-outline doc-icon-btn-v165" title="Visualizar" aria-label="Visualizar" onclick="Prontuario.visualizarDoc('${tipoTxt}','${d.id}')">👁️</button>
          <button class="btn btn-sm btn-blue doc-icon-btn-v165" title="${ehReceita?'Imprimir receita normal':'Imprimir/Abrir'}" aria-label="${ehReceita?'Imprimir receita normal':'Imprimir/Abrir'}" onclick="${ehReceita?`Prontuario.imprimirDocReceitaNormalV165('${d.id}')`:`Prontuario.imprimirDoc('${tipoTxt}','${d.id}')`}">🖨️</button>
          ${ehReceita?`<button class="btn btn-sm btn-purple doc-icon-btn-v165" title="Imprimir controle especial" aria-label="Imprimir controle especial" onclick="Prontuario.imprimirDocControleEspecialV165('${d.id}')">🧾</button>`:''}
          ${ehAnexo?`<button class="btn btn-sm btn-red doc-icon-btn-v165" title="Excluir" aria-label="Excluir" onclick="Prontuario.excluirAnexoExameV149 && Prontuario.excluirAnexoExameV149('${d.id}')">🗑️</button>`:''}
        </div>
      </div>
    </div>`;
  };

  Prontuario.renderDocs=function(key,tipo){
    const list=this.sortDesc(this.docs(key));
    return list.length ? list.map(d=>this.cardDocCompactoV143(tipo,d)).join('') : `<div class="card">Nenhum documento.</div>`;
  };
})();




/* =========================================================
   ZERO V18.0 — Visualizar atendimento por tipo sem misturar campos
   Correções:
   - Procedimento mostra apenas campos de procedimento.
   - Queixa/Motivo e Observação do agendamento aparecem separados.
   - Objetivo/Exame físico não usa queixa/observação como fallback.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__verAtendimentoPorTipoV180) return;
  Prontuario.__verAtendimentoPorTipoV180=true;

  Prontuario.ehProcedimentoHistoricoV180=function(h){
    const t=String(h?.tipo||h?.tipoAtendimento||h?.tipoConsulta||h?.origem||'').toLowerCase();
    return t.includes('proced');
  };

  Prontuario.blocoV180=function(t,html){
    return `<div class="anamnese-block full"><strong>${Utils.esc(t)}</strong><div style="white-space:pre-wrap">${Utils.esc(html||'—')}</div></div>`;
  };

  Prontuario.verAnamneseCompleta=function(histId){
    const h=this.findHistorico(histId);
    if(!h) return Utils.toast('Atendimento não encontrado.');

    const tipo=h.tipo||h.tipoAtendimento||h.tipoConsulta||'Consulta';
    const procedimento=this.ehProcedimentoHistoricoV180(h);
    const queixa=h.queixaMotivo||h.queixa||h.motivo||'';
    const obsAg=h.observacaoAtendimento||h.observacaoGeral||'';

    let conteudo='';
    if(procedimento){
      conteudo=[
        queixa?this.blocoV180('Queixa / Motivo do agendamento',queixa):'',
        obsAg?this.blocoV180('Observação do agendamento',obsAg):'',
        this.blocoV180('Procedimento realizado',h.procedimentoRealizado||h.S||h.evolucao||''),
        this.blocoV180('Materiais utilizados',h.materiais||h.O||''),
        this.blocoV180('Intercorrências',h.intercorrencias||h.A||''),
        this.blocoV180('Observações / evolução procedural',h.evolucaoProcedural||h.P||h.conduta||'')
      ].filter(Boolean).join('');
    }else{
      conteudo = h.anamneseCompleta && this.formatarAnamneseOriginal
        ? this.formatarAnamneseOriginal(h.anamneseCompleta)
        : [
            queixa?this.blocoV180('Queixa / Motivo do agendamento',queixa):'',
            obsAg?this.blocoV180('Observação do agendamento',obsAg):'',
            this.blocoV180('Evolução / Anamnese',h.evolucao||h.S||''),
            this.blocoV180('Objetivo / Exame físico',h.O||''),
            this.blocoV180('Avaliação',h.A||''),
            this.blocoV180('Conduta',h.conduta||h.P||'')
          ].filter(Boolean).join('');
    }

    Modal.open('📋 Anamnese Completa',`
      <div class="anamnese-detail-grid">
        <div class="anamnese-block">
          <strong>Data</strong>
          ${Utils.esc(h.data||'—')} ${Utils.esc(h.hora||'')}
        </div>
        <div class="anamnese-block">
          <strong>Profissional</strong>
          ${Utils.esc(h.medico||h.profissional||'—')}
        </div>
        <div class="anamnese-block">
          <strong>Tipo</strong>
          ${Utils.esc(tipo)}
        </div>
        <div class="anamnese-block">
          <strong>CID-10</strong>
          ${Utils.esc(h.cid||'—')}
        </div>
        ${conteudo}
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-blue" onclick="Prontuario.imprimirAtendimento('${h.id}')">Imprimir atendimento</button>
    `,'lg');
  };
})();




/* =========================================================
   ZERO V18.2 — Idade no cabeçalho do paciente
   Correção:
   - Mostra idade junto com nascimento no cabeçalho azul do prontuário.
   - Calcula por data de nascimento dd/mm/aaaa ou aaaa-mm-dd.
========================================================= */
(function(){
  if(!window.Prontuario || Prontuario.__idadeCabecalhoPacienteV182) return;
  Prontuario.__idadeCabecalhoPacienteV182=true;

  Prontuario.idadePacienteV182=function(p={}){
    const raw=String(p.nascimento||p.nasc||p.dataNascimento||'').trim();
    if(!raw) return '';

    let dia,mes,ano;
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(raw)){
      [dia,mes,ano]=raw.split('/').map(Number);
    }else if(/^\d{4}-\d{2}-\d{2}/.test(raw)){
      [ano,mes,dia]=raw.slice(0,10).split('-').map(Number);
    }else{
      return '';
    }

    if(!ano || !mes || !dia) return '';
    const nasc=new Date(ano,mes-1,dia);
    if(isNaN(nasc.getTime())) return '';

    const hoje=new Date();
    let idade=hoje.getFullYear()-nasc.getFullYear();
    const aindaNaoFez=(hoje.getMonth()<nasc.getMonth()) || (hoje.getMonth()===nasc.getMonth() && hoje.getDate()<nasc.getDate());
    if(aindaNaoFez) idade--;
    if(idade<0 || idade>130) return '';
    return `${idade} ano${idade===1?'':'s'}`;
  };

  Prontuario.aplicarIdadeCabecalhoV182=function(){
    const p=this.paciente||{};
    const idade=this.idadePacienteV182(p);
    if(!idade) return;

    const line=document.querySelector('.pront-patient-banner .pront-info-lines');
    if(!line || String(line.innerHTML||'').includes('Idade:')) return;

    const html=line.innerHTML;
    const novo=html.replace(/(Nasc:\s*[^&<]+)(\s*&nbsp;\s*\|\s*&nbsp;)/i,`$1 &nbsp;|&nbsp; <span class="pront-idade-v182">Idade: ${idade}</span>$2`);
    if(novo!==html) line.innerHTML=novo;
    else line.insertAdjacentHTML('beforeend',`<br><span class="pront-idade-v182">🎂 Idade: ${idade}</span>`);
  };

  const oldRenderV182=Prontuario.render?.bind(Prontuario);
  Prontuario.render=function(){
    const ret=oldRenderV182 ? oldRenderV182(...arguments) : undefined;
    try{ this.aplicarIdadeCabecalhoV182(); }catch(e){}
    setTimeout(()=>{ try{ this.aplicarIdadeCabecalhoV182(); }catch(e){} },30);
    return ret;
  };
})();
