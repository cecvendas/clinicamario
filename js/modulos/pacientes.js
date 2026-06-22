window.Pacientes={
  list(){
    return Store.get('PACIENTES').sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  },

  ativoLabel(p){
    return p.ativo===false ? '<span class="badge status-inativo">Inativo</span>' : '<span class="badge status-ativo">Ativo</span>';
  },

  render(){
    const lista=this.list();
    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>Pacientes</h3>
          <p style="color:#64748b;margin-top:4px">O prontuário é aberto pelo cadastro do paciente.</p>
        </div>
        <button class="btn btn-blue" onclick="Pacientes.modal()">+ Novo Paciente</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
            <th>Nascimento</th>
            <th>Convênio</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${lista.map(p=>`<tr>
          <td>${Utils.esc(p.nome)}</td>
          <td>${Utils.esc(p.cpf||'')}</td>
          <td>${Utils.esc(p.nascimento||'')}</td>
          <td>${Utils.esc(p.convenio||'')}</td>
          <td>${this.ativoLabel(p)}</td>
          <td>
            <div class="row right">
              <button class="btn btn-sm btn-outline" onclick="Pacientes.visualizar('${p.id}')">👁️ Visualizar</button>
              <button class="btn btn-sm btn-outline" onclick="Pacientes.modal('${p.id}')">✏️ Editar</button>
              <button class="btn btn-sm btn-blue" onclick="Prontuario.abrir('${p.id}')">📋 Prontuário</button>
            </div>
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  },

  modal(id=''){
    const p=this.list().find(x=>x.id===id)||{};
    const titulo=id?'Editar Cadastro do Paciente':'Novo Cadastro de Paciente';

    Modal.open(titulo,`
      <div class="cm-section">
        <div class="cm-section-title">👤 Dados do Paciente</div>
        <div class="cm-form-grid">
          <div class="span-3">
            <label>Nome completo</label>
            <input id="pac-nome" value="${Utils.esc(p.nome||'')}" placeholder="Nome completo do paciente">
          </div>
          <div>
            <label>Status</label>
            <select id="pac-ativo">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div>
            <label>CPF</label>
            <input id="pac-cpf" value="${Utils.esc(p.cpf||'')}" placeholder="000.000.000-00">
          </div>
          <div>
            <label>RG</label>
            <input id="pac-rg" value="${Utils.esc(p.rg||'')}">
          </div>
          <div>
            <label>Nascimento</label>
            <input id="pac-nasc" value="${Utils.esc(p.nascimento||p.nasc||'')}" placeholder="dd/mm/aaaa">
          </div>
          <div>
            <label>Sexo</label>
            <select id="pac-sexo">
              <option value="">Selecione</option>
              <option>Feminino</option>
              <option>Masculino</option>
              <option>Outro</option>
            </select>
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">📞 Contato</div>
        <div class="cm-form-grid">
          <div>
            <label>Telefone</label>
            <input id="pac-tel" value="${Utils.esc(p.telefone||p.tel||'')}">
          </div>
          <div>
            <label>WhatsApp</label>
            <input id="pac-whats" value="${Utils.esc(p.whatsapp||'')}">
          </div>
          <div class="span-2">
            <label>E-mail</label>
            <input id="pac-email" value="${Utils.esc(p.email||'')}">
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">🏠 Endereço</div>
        <div class="cm-form-grid">
          <div class="span-3">
            <label>Endereço</label>
            <input id="pac-end" value="${Utils.esc(p.endereco||'')}">
          </div>
          <div>
            <label>Número</label>
            <input id="pac-numero" value="${Utils.esc(p.numero||'')}">
          </div>
          <div>
            <label>Bairro</label>
            <input id="pac-bairro" value="${Utils.esc(p.bairro||'')}">
          </div>
          <div>
            <label>Cidade</label>
            <input id="pac-cidade" value="${Utils.esc(p.cidade||'Campo Grande')}">
          </div>
          <div>
            <label>UF</label>
            <input id="pac-uf" value="${Utils.esc(p.uf||'MS')}">
          </div>
          <div>
            <label>CEP</label>
            <input id="pac-cep" value="${Utils.esc(p.cep||'')}">
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">💳 Convênio / Responsável</div>
        <div class="cm-form-grid">
          <div class="span-2">
            <label>Convênio</label>
            <input id="pac-conv" value="${Utils.esc(p.convenio||'')}">
          </div>
          <div class="span-2">
            <label>Número da carteirinha</label>
            <input id="pac-carteirinha" value="${Utils.esc(p.carteirinha||'')}">
          </div>
          <div class="span-2">
            <label>Responsável</label>
            <input id="pac-responsavel" value="${Utils.esc(p.responsavel||'')}">
          </div>
          <div class="span-2">
            <label>Telefone do responsável</label>
            <input id="pac-resp-tel" value="${Utils.esc(p.responsavelTelefone||'')}">
          </div>
          <div class="span-4">
            <label>Observações</label>
            <textarea id="pac-obs" rows="3">${Utils.esc(p.obs||'')}</textarea>
          </div>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      ${id?`<button class="btn btn-outline" onclick="Pacientes.visualizar('${id}')">Visualizar</button>`:''}
      <button class="btn btn-blue" onclick="Pacientes.save('${id}')">Salvar Cadastro</button>
    `,'lg');

    setTimeout(()=>{
      const sexo=document.getElementById('pac-sexo');
      if(sexo) sexo.value=p.sexo||'';
      const ativo=document.getElementById('pac-ativo');
      if(ativo) ativo.value=String(p.ativo!==false);
    },30);
  },

  save(id=''){
    let lista=this.list();
    let p=id?lista.find(x=>x.id===id):{id:Utils.id('PAC')};

    p.nome=document.getElementById('pac-nome').value.trim();
    p.ativo=document.getElementById('pac-ativo').value==='true';
    p.cpf=document.getElementById('pac-cpf').value.trim();
    p.rg=document.getElementById('pac-rg').value.trim();
    p.nascimento=document.getElementById('pac-nasc').value.trim();
    p.nasc=p.nascimento;
    p.sexo=document.getElementById('pac-sexo').value;
    p.telefone=document.getElementById('pac-tel').value.trim();
    p.tel=p.telefone;
    p.whatsapp=document.getElementById('pac-whats').value.trim();
    p.email=document.getElementById('pac-email').value.trim();
    p.endereco=document.getElementById('pac-end').value.trim();
    p.numero=document.getElementById('pac-numero').value.trim();
    p.bairro=document.getElementById('pac-bairro').value.trim();
    p.cidade=document.getElementById('pac-cidade').value.trim();
    p.uf=document.getElementById('pac-uf').value.trim().toUpperCase();
    p.cep=document.getElementById('pac-cep').value.trim();
    p.convenio=document.getElementById('pac-conv').value.trim();
    p.carteirinha=document.getElementById('pac-carteirinha').value.trim();
    p.responsavel=document.getElementById('pac-responsavel').value.trim();
    p.responsavelTelefone=document.getElementById('pac-resp-tel').value.trim();
    p.obs=document.getElementById('pac-obs').value.trim();

    if(!p.nome) return Utils.toast('Informe o nome do paciente.');

    Store.upsert('PACIENTES',p);
    Modal.close();
    this.render();
    Utils.toast('Cadastro do paciente salvo.');
  },

  visualizar(id){
    const p=this.list().find(x=>x.id===id);
    if(!p) return Utils.toast('Paciente não encontrado.');

    Modal.open('👁️ Cadastro do Paciente',`
      <div class="cm-section">
        <div class="cm-section-title">👤 Dados principais</div>
        <div class="cm-view-grid">
          ${this.viewItem('Nome',p.nome)}
          ${this.viewItem('Status',p.ativo===false?'Inativo':'Ativo')}
          ${this.viewItem('CPF',p.cpf)}
          ${this.viewItem('RG',p.rg)}
          ${this.viewItem('Nascimento',p.nascimento||p.nasc)}
          ${this.viewItem('Sexo',p.sexo)}
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">📞 Contato</div>
        <div class="cm-view-grid">
          ${this.viewItem('Telefone',p.telefone||p.tel)}
          ${this.viewItem('WhatsApp',p.whatsapp)}
          ${this.viewItem('E-mail',p.email)}
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">🏠 Endereço</div>
        <div class="cm-view-grid">
          ${this.viewItem('Endereço',p.endereco)}
          ${this.viewItem('Número',p.numero)}
          ${this.viewItem('Bairro',p.bairro)}
          ${this.viewItem('Cidade',p.cidade)}
          ${this.viewItem('UF',p.uf)}
          ${this.viewItem('CEP',p.cep)}
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">💳 Convênio / Responsável</div>
        <div class="cm-view-grid">
          ${this.viewItem('Convênio',p.convenio)}
          ${this.viewItem('Carteirinha',p.carteirinha)}
          ${this.viewItem('Responsável',p.responsavel)}
          ${this.viewItem('Telefone responsável',p.responsavelTelefone)}
        </div>
        ${p.obs?`<div class="cm-view-item" style="margin-top:10px;"><strong>Observações</strong><span>${Utils.esc(p.obs)}</span></div>`:''}
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-outline" onclick="Pacientes.modal('${p.id}')">Editar Cadastro</button>
      <button class="btn btn-blue" onclick="Modal.close();Prontuario.abrir('${p.id}')">Abrir Prontuário</button>
    `,'lg');
  },

  viewItem(label,value){
    return `<div class="cm-view-item"><strong>${Utils.esc(label)}</strong><span>${Utils.esc(value||'—')}</span></div>`;
  }
};

/* ZERO V3.1 — esconder prontuário para perfil sem acesso */
(function(){
  if(!window.Pacientes || Pacientes.__perfilProtegido) return;
  Pacientes.__perfilProtegido=true;
  const oldRender=Pacientes.render.bind(Pacientes);
  Pacientes.render=function(){
    oldRender();
    if(window.Security && !Security.canProntuario()){
      document.querySelectorAll('button').forEach(btn=>{
        const oc=String(btn.getAttribute('onclick')||'');
        if(oc.includes('Prontuario.abrir')) btn.style.display='none';
      });
    }
  };
})();




/* =========================================================
   ZERO V4.2 — Menu Pacientes com:
   - Imprimir registro completo
   - Baixar paciente completo
   - Importar paciente completo
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes._printEsc = function(v){
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  Pacientes._br = function(v){
    return this._printEsc(v||'').replace(/\n/g,'<br>');
  };

  Pacientes._dataValor = function(d){
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

  Pacientes._sortDesc = function(arr){
    return (arr||[]).slice().sort((a,b)=>this._dataValor(b)-this._dataValor(a));
  };

  Pacientes._docsPaciente = function(pacId){
    const filtro=x=>String(x.pacId||x.pacienteId||'')===String(pacId);
    return {
      historico:this._sortDesc(Store.get('HISTORICO').filter(filtro)),
      receitas:this._sortDesc(Store.get('RECEITAS').filter(filtro)),
      atestados:this._sortDesc(Store.get('ATESTADOS').filter(filtro)),
      laudos:this._sortDesc(Store.get('LAUDOS').filter(filtro)),
      pedidos:this._sortDesc(Store.get('EXAMES_PEDIDOS').filter(filtro)),
      anexos:this._sortDesc(Store.get('EXAMES_ARQUIVOS').filter(filtro)),
      sinais:this._sortDesc(Store.get('SINAIS_VITAIS').filter(filtro)),
      atendimentos:this._sortDesc(Store.get('ATENDIMENTOS').filter(filtro))
    };
  };

  Pacientes.coletarPacienteCompleto = function(pacId){
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    const d=this._docsPaciente(pacId);
    return {
      __tipo:'PACIENTE_COMPLETO_CLINICA_MARIO',
      __versao:'Zero V4.2',
      exportadoEm:new Date().toISOString(),
      paciente:p||null,
      historico:d.historico,
      receitas:d.receitas,
      atestados:d.atestados,
      laudos:d.laudos,
      examesPedidos:d.pedidos,
      examesArquivos:d.anexos,
      sinaisVitais:d.sinais,
      atendimentos:d.atendimentos
    };
  };

  Pacientes.nomeArquivoPaciente = function(p){
    return String(p.nome||'paciente')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase();
  };

  Pacientes.baixarPacienteCompleto = function(pacId){
    const data=this.coletarPacienteCompleto(pacId);
    if(!data.paciente) return Utils.toast('Paciente não encontrado.');

    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`paciente_completo_${this.nomeArquivoPaciente(data.paciente)}_${Date.now()}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);

    if(window.Security) Security.audit('paciente_completo_export',`Exportou paciente completo ${data.paciente.nome||pacId}`);
    Utils.toast('Paciente completo baixado.');
  };

  Pacientes.importarPacienteCompleto = function(ev){
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
        this.render();
      }catch(e){
        console.error(e);
        Utils.toast('Não foi possível importar este paciente completo.');
      }
    };
    r.readAsText(f);
    try{ev.target.value=''}catch(e){}
  };

  Pacientes._infoLinha = function(label,valor){
    return `<tr><td class="lbl">${this._printEsc(label)}</td><td>${this._printEsc(valor||'—')}</td></tr>`;
  };

  Pacientes._medicamentosHtml = function(meds){
    meds=meds||[];
    if(!meds.length) return '<div class="empty">Sem medicamentos registrados.</div>';
    return `<ol>${meds.map(m=>`<li><strong>${this._printEsc(m.nome||m.medicamento||'Medicamento')}</strong><br>
      ${this._printEsc([m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao,m.via,m.dose,m.posologia,m.periodicidadeTexto,m.duracao,m.quantidade,m.usoContinuo?'USO CONTÍNUO':'',m.orientacao].filter(Boolean).join(' • '))}
    </li>`).join('')}</ol>`;
  };

  Pacientes._sinaisHtml = function(s){
    const itens=[
      ['PA',s.pa],['FC',s.fc],['FR',s.fr],['Temperatura',s.temp],['SpO₂',s.spo2],
      ['Peso',s.peso],['Altura',s.altura],['Circ. abd.',s.circAbd],['IMC',s.imc],['HGT',s.hgt||s.glicemia]
    ].filter(x=>String(x[1]||'').trim());
    if(!itens.length) return '<div class="empty">Sem valores preenchidos.</div>';
    return `<table class="mini"><tbody>${itens.map(([l,v])=>`<tr><td class="lbl">${this._printEsc(l)}</td><td>${this._printEsc(v)}</td></tr>`).join('')}</tbody></table>`;
  };

  Pacientes.htmlRegistroCompleto = function(pacId){
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    if(!p) return '';

    const d=this._docsPaciente(pacId);
    const emitido=new Date().toLocaleString('pt-BR');

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Registro completo - ${this._printEsc(p.nome||'Paciente')}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#fff;font-size:12.5px;line-height:1.5}
  .page{padding:30px 42px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a56db;padding-bottom:14px;margin-bottom:18px}
  .brand h1{margin:0;font-size:20px;color:#0f172a;text-transform:uppercase}
  .brand div{color:#64748b;margin-top:3px}
  .doc-title{text-align:right}
  .doc-title h2{margin:0;font-size:18px;color:#1a56db;text-transform:uppercase}
  .doc-title div{color:#64748b;margin-top:4px}
  .section{margin-top:18px;page-break-inside:avoid}
  .section h3{font-size:15px;color:#0f172a;margin:0 0 8px;border-left:5px solid #1a56db;padding:6px 0 6px 9px;background:#eef6ff}
  table{width:100%;border-collapse:collapse}
  td,th{border:1px solid #dbe4ee;padding:7px 8px;vertical-align:top}
  th{background:#f8fafc;text-align:left;color:#334155}
  .lbl{width:170px;background:#f8fafc;color:#475569;font-weight:bold}
  .card{border:1px solid #dbe4ee;border-radius:8px;padding:10px;margin:8px 0;page-break-inside:avoid}
  .card-title{font-weight:bold;color:#0f172a;font-size:13px;margin-bottom:5px}
  .muted{color:#64748b}
  .empty{color:#94a3b8;font-style:italic;padding:6px 0}
  .mini td{padding:5px 7px}
  .assinatura{margin-top:38px;text-align:center;page-break-inside:avoid}
  .linha{border-top:1px solid #111827;width:320px;margin:0 auto 6px}
  @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}.page{padding:0}.no-print{display:none!important}}

        /* ZERO V7.4 margem documentos */
        @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}.print-footer,.assinatura,.assinatura-medico{page-break-inside:avoid}}
        
</style>
</head>
<body class="print-documento-clinico">
<div class="page">
  <div class="header">
    <div class="brand">
      <h1>Clínica Mário</h1>
      <div>Registro completo do paciente</div>
    </div>
    <div class="doc-title">
      <h2>Prontuário / Registro completo</h2>
      <div>Emitido em: ${this._printEsc(emitido)}</div>
    </div>
  </div>

  <div class="section">
    <h3>Dados do paciente</h3>
    <table><tbody>
      ${this._infoLinha('Nome',p.nome)}
      ${this._infoLinha('CPF',p.cpf)}
      ${this._infoLinha('RG',p.rg)}
      ${this._infoLinha('Nascimento',p.nascimento||p.nasc)}
      ${this._infoLinha('Sexo',p.sexo)}
      ${this._infoLinha('Telefone',p.telefone||p.tel)}
      ${this._infoLinha('WhatsApp',p.whatsapp)}
      ${this._infoLinha('E-mail',p.email)}
      ${this._infoLinha('Convênio',p.convenio)}
      ${this._infoLinha('Carteirinha',p.carteirinha)}
      ${this._infoLinha('Endereço',[p.endereco,p.numero,p.bairro,p.cidade,p.uf,p.cep].filter(Boolean).join(', '))}
      ${this._infoLinha('Responsável',p.responsavel)}
      ${this._infoLinha('Telefone responsável',p.responsavelTelefone)}
      ${this._infoLinha('Observações',p.obs)}
    </tbody></table>
  </div>

  <div class="section">
    <h3>Histórico de atendimentos</h3>
    ${d.historico.length?d.historico.map(h=>`<div class="card">
      <div class="card-title">Consulta — ${this._printEsc(h.data||'')} ${this._printEsc(h.hora||'')} ${h.medico?`| ${this._printEsc(h.medico)}`:''}</div>
      ${h.tipo||h.tipoAtendimento?`<div><strong>Tipo:</strong> ${this._printEsc(h.tipo||h.tipoAtendimento)}</div>`:''}
      ${h.cid?`<div><strong>CID:</strong> ${this._printEsc(h.cid)}</div>`:''}
      <div><strong>Evolução / Anamnese:</strong><br>${this._br(h.evolucao||h.S||'')}</div>
      ${h.O||h.obs?`<div><strong>Objetivo / Observações:</strong><br>${this._br(h.O||h.obs)}</div>`:''}
      ${h.A?`<div><strong>Avaliação:</strong><br>${this._br(h.A)}</div>`:''}
      <div><strong>Conduta:</strong><br>${this._br(h.conduta||h.P||'')}</div>
    </div>`).join(''):'<div class="empty">Nenhum atendimento registrado.</div>'}
  </div>

  <div class="section">
    <h3>Sinais vitais</h3>
    ${d.sinais.length?d.sinais.map(s=>`<div class="card">
      <div class="card-title">${this._printEsc(s.data||'')} ${s.medico?`| ${this._printEsc(s.medico)}`:''}</div>
      ${this._sinaisHtml(s)}
      ${s.obs?`<div><strong>Observações:</strong> ${this._printEsc(s.obs)}</div>`:''}
    </div>`).join(''):'<div class="empty">Nenhum sinal vital registrado.</div>'}
  </div>

  <div class="section">
    <h3>Receitas</h3>
    ${d.receitas.length?d.receitas.map(r=>`<div class="card">
      <div class="card-title">Receita — ${this._printEsc(r.data||'')} ${r.medico?`| ${this._printEsc(r.medico)}`:''}</div>
      ${this._medicamentosHtml(r.medicamentos)}
      ${r.obs||r.orientacao?`<div><strong>Orientações:</strong><br>${this._br(r.obs||r.orientacao)}</div>`:''}
    </div>`).join(''):'<div class="empty">Nenhuma receita registrada.</div>'}
  </div>

  <div class="section">
    <h3>Atestados / Declarações</h3>
    ${d.atestados.length?d.atestados.map(a=>`<div class="card">
      <div class="card-title">${this._printEsc(a.tipo||'Atestado')} — ${this._printEsc(a.data||'')} ${a.medico?`| ${this._printEsc(a.medico)}`:''}</div>
      ${a.dias?`<div><strong>Dias:</strong> ${this._printEsc(a.dias)}</div>`:''}
      ${a.cid?`<div><strong>CID:</strong> ${this._printEsc(a.cid)}</div>`:''}
      ${a.horaChegada||a.horaSaida?`<div><strong>Horário:</strong> ${this._printEsc(a.horaChegada||'')} às ${this._printEsc(a.horaSaida||a.hora||'')}</div>`:''}
      ${a.periodo?`<div><strong>Período:</strong> ${this._printEsc(a.periodo)}</div>`:''}
      <div><strong>Motivo / Observação:</strong><br>${this._br(a.motivo||a.texto||'')}</div>
      ${a.obs?`<div><strong>Observações adicionais:</strong><br>${this._br(a.obs)}</div>`:''}
    </div>`).join(''):'<div class="empty">Nenhum atestado registrado.</div>'}
  </div>

  <div class="section">
    <h3>Laudos</h3>
    ${d.laudos.length?d.laudos.map(l=>`<div class="card">
      <div class="card-title">${this._printEsc(l.titulo||'Laudo médico')} — ${this._printEsc(l.data||'')} ${l.medico?`| ${this._printEsc(l.medico)}`:''}</div>
      ${l.cid?`<div><strong>CID:</strong> ${this._printEsc(l.cid)}</div>`:''}
      <div>${this._br(l.texto||l.descricao||l.conclusao||'')}</div>
    </div>`).join(''):'<div class="empty">Nenhum laudo registrado.</div>'}
  </div>

  <div class="section">
    <h3>Pedidos de exames</h3>
    ${d.pedidos.length?d.pedidos.map(e=>`<div class="card">
      <div class="card-title">Pedido — ${this._printEsc(e.data||'')} ${e.medico?`| ${this._printEsc(e.medico)}`:''}</div>
      <div><strong>Exames:</strong><br>${this._br(e.exames||'')}</div>
      ${e.obs||e.hipotese?`<div><strong>Hipótese / Observação:</strong><br>${this._br(e.obs||e.hipotese)}</div>`:''}
    </div>`).join(''):'<div class="empty">Nenhum pedido de exame registrado.</div>'}
  </div>

  <div class="section">
    <h3>Exames anexados</h3>
    ${d.anexos.length?d.anexos.map(e=>`<div class="card">
      <div class="card-title">${this._printEsc(e.nome||e.filename||'Exame anexado')} — ${this._printEsc(e.data||'')}</div>
      ${e.obs?`<div><strong>Observação:</strong> ${this._printEsc(e.obs)}</div>`:''}
      <div class="muted">Arquivo anexado ao prontuário.</div>
    </div>`).join(''):'<div class="empty">Nenhum exame anexado.</div>'}
  </div>

  <div class="assinatura">
    <div class="linha"></div>
    <div>Assinatura / Carimbo do profissional</div>
  </div>
</div>
</body>
</html>`;
  };

  Pacientes.imprimirRegistroCompleto = function(pacId){
    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const html=this.htmlRegistroCompleto(pacId);
    const iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(window.ClinicaPrintMargins?ClinicaPrintMargins.apply(html):html);
    iframe.contentWindow.document.close();

    if(window.Security) Security.audit('paciente_registro_completo_print',`Imprimiu registro completo ${p.nome||pacId}`);

    setTimeout(()=>{
      try{ iframe.contentWindow.focus(); iframe.contentWindow.print(); }catch(e){}
      setTimeout(()=>iframe.remove(),1500);
    },300);
  };

  Pacientes.render = function(){
    const lista=this.list();
    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>Pacientes</h3>
          <p style="color:#64748b;margin-top:4px">Cadastro de pacientes, registro completo, impressão e importação/exportação individual.</p>
        </div>
        <div class="pac-top-actions">
          <button class="btn btn-outline" onclick="document.getElementById('paciente-completo-upload-menu')?.click()">⬆️ Importar paciente completo</button>
          <button class="btn btn-blue" onclick="Pacientes.modal()">+ Novo Paciente</button>
          <input id="paciente-completo-upload-menu" type="file" accept=".json,application/json" style="display:none" onchange="Pacientes.importarPacienteCompleto(event)">
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
            <th>Nascimento</th>
            <th>Convênio</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${lista.map(p=>`<tr>
          <td>${Utils.esc(p.nome)}</td>
          <td>${Utils.esc(p.cpf||'')}</td>
          <td>${Utils.esc(p.nascimento||'')}</td>
          <td>${Utils.esc(p.convenio||'')}</td>
          <td>${this.ativoLabel(p)}</td>
          <td>
            <div class="pac-reg-actions">
              <button class="btn btn-sm btn-outline" onclick="Pacientes.visualizar('${p.id}')">👁️ Visualizar</button>
              <button class="btn btn-sm btn-registro-completo" onclick="Pacientes.imprimirRegistroCompleto('${p.id}')">🖨️ Registro completo</button>
              <button class="btn btn-sm btn-outline" onclick="Pacientes.baixarPacienteCompleto('${p.id}')">⬇️ Baixar</button>
              <button class="btn btn-sm btn-outline" onclick="Pacientes.modal('${p.id}')">✏️ Editar</button>
              ${(!window.Security || Security.canProntuario())?`<button class="btn btn-sm btn-blue" onclick="Prontuario.abrir('${p.id}')">📋 Prontuário</button>`:''}
            </div>
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  };

  const oldVisualizarV42 = Pacientes.visualizar.bind(Pacientes);
  Pacientes.visualizar = function(id){
    oldVisualizarV42(id);
    setTimeout(()=>{
      const footer=document.querySelector('.modal-footer');
      if(footer && !footer.querySelector('.btn-registro-completo')){
        footer.insertAdjacentHTML('afterbegin',`
          <button class="btn btn-registro-completo" onclick="Pacientes.imprimirRegistroCompleto('${id}')">🖨️ Registro completo</button>
          <button class="btn btn-outline" onclick="Pacientes.baixarPacienteCompleto('${id}')">⬇️ Baixar paciente</button>
        `);
      }
    },50);
  };
})();




/* =========================================================
   ZERO V4.3 — Paciente Completo igual original no menu Pacientes
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes.exportarPacienteCompletoZip = function(pacId){
    if(!pacId) return Utils.toast('Selecione o paciente.');
    const data=this.coletarPacienteCompleto(pacId);
    if(!data.paciente) return Utils.toast('Paciente não encontrado.');

    const nome=this.nomeArquivoPaciente ? this.nomeArquivoPaciente(data.paciente) : String(data.paciente.nome||'paciente').replace(/\W+/g,'_').toLowerCase();
    const files={};
    files['paciente_completo.json']=JSON.stringify(data,null,2);
    files['LEIA-ME.txt']=[
      'Paciente completo - Clínica Mário',
      '',
      'Paciente: '+(data.paciente.nome||''),
      'Exportado em: '+new Date().toLocaleString('pt-BR'),
      '',
      'Este ZIP contém cadastro, prontuário, documentos, exames e sinais vitais do paciente.'
    ].join('\n');

    let blob;
    if(window.Backup && typeof Backup.criarZip==='function'){
      blob=Backup.criarZip(files);
    }else{
      blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    }

    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`paciente_completo_${nome}_${Date.now()}.${(window.Backup&&Backup.criarZip)?'zip':'json'}`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);

    if(window.Security) Security.audit('paciente_completo_export_zip',`Exportou paciente completo ZIP ${data.paciente.nome||pacId}`);
    Utils.toast('Paciente completo exportado.');
  };

  Pacientes.importarPacienteCompletoArquivo = function(ev){
    const f=ev.target.files && ev.target.files[0];
    if(!f) return;

    if(f.name.toLowerCase().endsWith('.zip')){
      const r=new FileReader();
      r.onload=()=>{
        try{
          if(!window.Backup || typeof Backup.lerZip!=='function'){
            Utils.toast('Importação ZIP não disponível.');
            return;
          }
          const files=Backup.lerZip(new Uint8Array(r.result));
          const key=Object.keys(files).find(k=>k.toLowerCase().endsWith('paciente_completo.json') || k.toLowerCase().endsWith('backup_completo.json'));
          if(!key) return Utils.toast('ZIP inválido: paciente_completo.json não encontrado.');
          this.aplicarPacienteCompleto(JSON.parse(files[key]));
        }catch(e){
          console.error(e);
          Utils.toast('Não foi possível importar este ZIP.');
        }
      };
      r.readAsArrayBuffer(f);
    }else{
      const r=new FileReader();
      r.onload=()=>{
        try{ this.aplicarPacienteCompleto(JSON.parse(r.result)); }
        catch(e){ console.error(e); Utils.toast('Arquivo inválido.'); }
      };
      r.readAsText(f);
    }

    try{ev.target.value=''}catch(e){}
  };

  Pacientes.aplicarPacienteCompleto = function(data){
    if(data.__tipo!=='PACIENTE_COMPLETO_CLINICA_MARIO' || !data.paciente){
      Utils.toast('Arquivo de paciente completo inválido.');
      return;
    }

    if(!confirm('Importar paciente completo? Isso adicionará/atualizará o paciente e seus registros.')) return;

    const upsertMany=(key,arr)=>{ (arr||[]).forEach(item=>Store.upsert(key,item)); };
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
    this.render();
  };

  Pacientes.modalPacienteCompleto = function(){
    const pacientes=this.list();
    Modal.open('📦 Paciente Completo',`
      <div class="paciente-completo-modal-section" style="border-top:0;margin-top:0;">
        <div style="font-weight:1000;color:#1d4ed8;margin-bottom:10px;">⬇️ Exportar paciente completo</div>
        <label>Paciente</label>
        <select id="pc-export-paciente">
          <option value="">Selecione o paciente</option>
          ${pacientes.map(p=>`<option value="${p.id}">${Utils.esc(p.nome)} ${p.cpf?`- ${Utils.esc(p.cpf)}`:''}</option>`).join('')}
        </select>
        <button class="paciente-completo-big-btn paciente-completo-export" style="margin-top:14px;" onclick="Pacientes.exportarPacienteCompletoZip(document.getElementById('pc-export-paciente').value)">📦 Exportar paciente completo ZIP</button>
      </div>

      <div class="paciente-completo-modal-section">
        <div style="font-weight:1000;color:#1d4ed8;margin-bottom:10px;">⬆️ Importar paciente completo</div>
        <button class="paciente-completo-big-btn paciente-completo-import" onclick="document.getElementById('pc-import-file')?.click()">📤 Importar paciente completo</button>
        <input id="pc-import-file" type="file" accept=".zip,.json,application/json,application/zip" style="display:none" onchange="Pacientes.importarPacienteCompletoArquivo(event)">
      </div>
    `,`<button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>`,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title) title.innerHTML=`📦 Paciente Completo <button class="modal-x" onclick="Modal.close()">×</button>`;
    },30);
  };

  Pacientes.render = function(){
    const lista=this.list();
    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>Pacientes</h3>
          <p style="color:#64748b;margin-top:4px">${lista.filter(p=>p.ativo!==false).length} ativos de ${lista.length} cadastrados</p>
        </div>
      </div>

      <div class="row" style="margin-top:12px;gap:10px;align-items:flex-start;">
        <div style="flex:1;min-width:260px;">
          <input id="pac-busca" placeholder="🔍 Buscar paciente por nome, CPF, convênio ou plano..." oninput="Pacientes.renderTabelaFiltrada()">
          <div style="font-size:12px;color:#64748b;margin-top:8px;">Digite qualquer parte do nome, CPF, convênio ou plano do paciente.</div>
        </div>
        <select id="pac-status-filter" style="width:190px" onchange="Pacientes.renderTabelaFiltrada()">
          <option value="">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <button class="btn btn-blue" onclick="Pacientes.modal()">+ Novo Paciente</button>
        <button class="btn btn-outline" onclick="Pacientes.modalPacienteCompleto()">📦 Paciente Completo</button>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:auto;">
      <table class="table">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>CPF</th>
            <th>Nascimento</th>
            <th>Telefone</th>
            <th>Convênio</th>
            <th>Sangue</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="pac-tbody"></tbody>
      </table>
    </div>`;
    this.renderTabelaFiltrada();
  };

  Pacientes.renderTabelaFiltrada = function(){
    const busca=Utils.norm(document.getElementById('pac-busca')?.value||'');
    const st=document.getElementById('pac-status-filter')?.value||'';
    let lista=this.list().filter(p=>{
      const texto=Utils.norm([p.nome,p.cpf,p.convenio,p.plano,p.email,p.telefone].join(' '));
      const ativo=p.ativo!==false;
      return (!busca || texto.includes(busca)) && (!st || (st==='ativo'?ativo:!ativo));
    });

    const tbody=document.getElementById('pac-tbody');
    if(!tbody) return;

    tbody.innerHTML=lista.map(p=>{
      const iniciais=String(p.nome||'P').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
      return `<tr>
        <td>
          <div style="display:flex;gap:10px;align-items:center;">
            <div style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#0f8b8d;color:#fff;font-weight:1000;">${Utils.esc(iniciais)}</div>
            <div>
              <strong>${Utils.esc(p.nome)}</strong>
              <div class="doc-sub">${Utils.esc(p.email||'')}</div>
            </div>
          </div>
        </td>
        <td>${Utils.esc(p.cpf||'')}</td>
        <td>${Utils.esc(p.nascimento||p.nasc||'')}</td>
        <td>${Utils.esc(p.telefone||p.tel||'')}</td>
        <td>${p.convenio?`<span class="badge">${Utils.esc(p.convenio)}</span>`:'—'}</td>
        <td>${p.sangue?`<span class="badge" style="background:#fee2e2;color:#991b1b;">${Utils.esc(p.sangue)}</span>`:'—'}</td>
        <td>${this.ativoLabel(p)}</td>
        <td>
          <div class="pac-reg-actions">
            <button class="btn btn-sm btn-outline" onclick="Pacientes.visualizar('${p.id}')">👁️ Ver</button>
            <button class="btn btn-sm btn-outline" onclick="Pacientes.modal('${p.id}')">✏️</button>
            ${(!window.Security || Security.canProntuario())?`<button class="btn btn-sm btn-blue" onclick="Prontuario.abrir('${p.id}')">📋</button>`:''}
            <button class="btn btn-sm btn-registro-completo" onclick="Pacientes.imprimirRegistroCompleto('${p.id}')">🖨️</button>
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="8">Nenhum paciente encontrado.</td></tr>`;
  };
})();




/* =========================================================
   ZERO V4.4 — Sem botão imprimir na tela Pacientes + cabeçalho original
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes._profissionalCabecalhoPrint = function(){
    const prof=(window.Profissionais && Profissionais.atual && Profissionais.atual()) || {};
    const conselho=(window.Profissionais && Profissionais.conselho && Profissionais.conselho(prof)) || prof.conselho || 'CRM-MS 10862';
    return {
      nome: prof.nome || 'Dr. Mário Sérgio Correa',
      especialidade: prof.especialidade || 'Saúde Hormonal e Metabólica',
      conselho: conselho,
      endereco: prof.endereco || 'R. José Pereira, 447 - Jardim Bela Vista, Campo Grande - MS, 79003-050',
      whatsapp: prof.whatsapp || prof.telefone || '(67) 98167-8265',
      email: prof.email || 'drmariocorrea',
      logo: prof.logo || ''
    };
  };

  Pacientes._cabecalhoOriginalPrint = function(titulo='PRONTUÁRIO MÉDICO ELETRÔNICO'){
    const p=this._profissionalCabecalhoPrint();
    return `<div class="print-header-original">
      <div class="print-logo-box">${p.logo?`<img src="${this._printEsc(p.logo)}">`:'MS'}</div>
      <div class="print-clinic-info">
        <h1>${this._printEsc(titulo)}</h1>
        <div><strong>${this._printEsc(p.nome)}</strong></div>
        <div>${this._printEsc(p.especialidade)} ${p.conselho?`• ${this._printEsc(p.conselho)}`:''}</div>
        <div>${this._printEsc(p.endereco)}</div>
        <div>WhatsApp: ${this._printEsc(p.whatsapp)} ${p.email?`• @${this._printEsc(String(p.email).replace(/^@/,''))}`:''}</div>
        <div>Impresso em: ${this._printEsc(new Date().toLocaleString('pt-BR'))}</div>
      </div>
    </div>`;
  };

  const oldHtmlRegistroCompletoV44 = Pacientes.htmlRegistroCompleto.bind(Pacientes);
  Pacientes.htmlRegistroCompleto = function(pacId){
    let html=oldHtmlRegistroCompletoV44(pacId);
    if(!html) return html;

    html=html.replace(
      /<div class="header">[\s\S]*?<\/div>\s*<div class="section">\s*<h3>Dados do paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );
    /* ZERO V8.7: bloco de estilo quebrado removido para o módulo carregar corretamente. */

    return html;
  };

  // Recria a tabela de pacientes sem o botão/impressão por paciente.
  Pacientes.renderTabelaFiltrada = function(){
    const busca=Utils.norm(document.getElementById('pac-busca')?.value||'');
    const st=document.getElementById('pac-status-filter')?.value||'';
    let lista=this.list().filter(p=>{
      const texto=Utils.norm([p.nome,p.cpf,p.convenio,p.plano,p.email,p.telefone].join(' '));
      const ativo=p.ativo!==false;
      return (!busca || texto.includes(busca)) && (!st || (st==='ativo'?ativo:!ativo));
    });

    const tbody=document.getElementById('pac-tbody');
    if(!tbody) return;

    tbody.innerHTML=lista.map(p=>{
      const iniciais=String(p.nome||'P').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
      return `<tr>
        <td>
          <div style="display:flex;gap:10px;align-items:center;">
            <div style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#0f8b8d;color:#fff;font-weight:1000;">${Utils.esc(iniciais)}</div>
            <div>
              <strong>${Utils.esc(p.nome)}</strong>
              <div class="doc-sub">${Utils.esc(p.email||'')}</div>
            </div>
          </div>
        </td>
        <td>${Utils.esc(p.cpf||'')}</td>
        <td>${Utils.esc(p.nascimento||p.nasc||'')}</td>
        <td>${Utils.esc(p.telefone||p.tel||'')}</td>
        <td>${p.convenio?`<span class="badge">${Utils.esc(p.convenio)}</span>`:'—'}</td>
        <td>${p.sangue?`<span class="badge" style="background:#fee2e2;color:#991b1b;">${Utils.esc(p.sangue)}</span>`:'—'}</td>
        <td>${this.ativoLabel(p)}</td>
        <td>
          <div class="pac-reg-actions">
            <button class="btn btn-sm btn-outline" onclick="Pacientes.visualizar('${p.id}')">👁️ Ver</button>
            <button class="btn btn-sm btn-outline" onclick="Pacientes.modal('${p.id}')">✏️</button>
            ${(!window.Security || Security.canProntuario())?`<button class="btn btn-sm btn-blue" onclick="Prontuario.abrir('${p.id}')">📋</button>`:''}
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="8">Nenhum paciente encontrado.</td></tr>`;
  };

  // Remove botão "registro completo" da visualização do paciente. A impressão fica no Prontuário.
  const oldVisualizarV44 = Pacientes.visualizar.bind(Pacientes);
  Pacientes.visualizar = function(id){
    oldVisualizarV44(id);
    setTimeout(()=>{
      document.querySelectorAll('.modal-footer button').forEach(btn=>{
        const txt=(btn.innerText||'').toLowerCase();
        if(txt.includes('registro completo') || txt.includes('imprimir')){
          btn.remove();
        }
      });
    },60);
  };
})();




/* =========================================================
   ZERO V4.5 — Logo aparece na impressão
   Motivo: antes a impressão só usava prof.logo se estivesse salvo no cadastro.
   Agora usa assets/logo-clinica-mario.svg como fallback.
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes.logoPrintSrc = function(){
    const prof=(window.Profissionais && Profissionais.atual && Profissionais.atual()) || {};
    return prof.logo || prof.logoUrl || prof.logoDataUrl || 'assets/logo-clinica-mario.svg';
  };

  Pacientes._cabecalhoOriginalPrint = function(titulo='PRONTUÁRIO MÉDICO ELETRÔNICO'){
    const p=this._profissionalCabecalhoPrint ? this._profissionalCabecalhoPrint() : {
      nome:'Dr. Mário Sérgio Correa',
      especialidade:'Saúde Hormonal e Metabólica',
      conselho:'CRM-MS 10862',
      endereco:'R. José Pereira, 447 - Jardim Bela Vista, Campo Grande - MS, 79003-050',
      whatsapp:'(67) 98167-8265',
      email:'drmariocorrea'
    };

    const logo=this.logoPrintSrc();

    return `<div class="print-header-original">
      <div class="print-logo-box"><img src="${this._printEsc(logo)}" alt="Logo"></div>
      <div class="print-clinic-info">
        <h1>${this._printEsc(titulo)}</h1>
        <div><strong>${this._printEsc(p.nome)}</strong></div>
        <div>${this._printEsc(p.especialidade)} ${p.conselho?`• ${this._printEsc(p.conselho)}`:''}</div>
        <div>${this._printEsc(p.endereco)}</div>
        <div>WhatsApp: ${this._printEsc(p.whatsapp)} ${p.email?`• @${this._printEsc(String(p.email).replace(/^@/,''))}`:''}</div>
        <div>Impresso em: ${this._printEsc(new Date().toLocaleString('pt-BR'))}</div>
      </div>
    </div>`;
  };

  // Reaplica o cabeçalho no html do registro completo, pois versões anteriores podem ter mantido o fallback "MS".
  const oldHtmlV45 = Pacientes.htmlRegistroCompleto.bind(Pacientes);
  Pacientes.htmlRegistroCompleto = function(pacId){
    let html=oldHtmlV45(pacId);
    if(!html) return html;

    html=html.replace(
      /<div class="print-header-original">[\s\S]*?<\/div>\s*<\/div>\s*<div class="section">\s*<h3>👤 Dados do Paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );

    html=html.replace(
      /<div class="header">[\s\S]*?<\/div>\s*<div class="section">\s*<h3>Dados do paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );

    if(!html.includes('.print-logo-box img')){
    /* ZERO V8.7: bloco de estilo quebrado removido para o módulo carregar corretamente. */
    }
    return html;
  };
})();




/* =========================================================
   ZERO V4.6 — Cabeçalho usa Configurações, sem dados fixos errados
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes._configCabecalho = function(){
    const cfg=(window.Configuracoes && Configuracoes.get && Configuracoes.get()) || {};
    const prof=(window.Profissionais && Profissionais.atual && Profissionais.atual()) || {};
    const conselho=(window.Profissionais && Profissionais.conselho && Profissionais.conselho(prof)) || prof.conselho || '';

    return {
      nomeClinica: cfg.nomeClinica || 'Clínica Mário',
      titulo: cfg.tituloImpressao || 'PRONTUÁRIO MÉDICO ELETRÔNICO',
      profissional: cfg.profissional || prof.nome || '',
      especialidade: cfg.especialidade || prof.especialidade || '',
      conselho: cfg.conselho || conselho || '',
      endereco: cfg.endereco || prof.endereco || '',
      whatsapp: cfg.whatsapp || prof.whatsapp || prof.telefone || '',
      instagram: cfg.instagram || '',
      email: cfg.email || prof.email || '',
      logo: cfg.logo || prof.logo || prof.logoUrl || prof.logoDataUrl || 'assets/logo-clinica-mario.svg'
    };
  };

  Pacientes._profissionalCabecalhoPrint = function(){
    const c=this._configCabecalho();
    return {
      nome:c.profissional || c.nomeClinica,
      especialidade:c.especialidade,
      conselho:c.conselho,
      endereco:c.endereco,
      whatsapp:c.whatsapp,
      email:c.instagram || c.email,
      logo:c.logo
    };
  };

  Pacientes.logoPrintSrc = function(){
    return this._configCabecalho().logo || 'assets/logo-clinica-mario.svg';
  };

  Pacientes._cabecalhoOriginalPrint = function(titulo=''){
    const c=this._configCabecalho();
    const tituloFinal=titulo || c.titulo || 'PRONTUÁRIO MÉDICO ELETRÔNICO';
    const linhaNome=c.profissional || c.nomeClinica || 'Clínica Mário';
    const contato=[
      c.whatsapp ? 'WhatsApp: '+c.whatsapp : '',
      c.instagram ? '@'+String(c.instagram).replace(/^@/,'') : '',
      c.email && !c.instagram ? c.email : ''
    ].filter(Boolean).join(' • ');

    return `<div class="print-header-original">
      <div class="print-logo-box"><img src="${this._printEsc(c.logo||'assets/logo-clinica-mario.svg')}" alt="Logo"></div>
      <div class="print-clinic-info">
        <h1>${this._printEsc(tituloFinal)}</h1>
        <div><strong>${this._printEsc(linhaNome)}</strong></div>
        ${(c.especialidade||c.conselho)?`<div>${this._printEsc([c.especialidade,c.conselho].filter(Boolean).join(' • '))}</div>`:''}
        ${c.endereco?`<div>${this._printEsc(c.endereco)}</div>`:''}
        ${contato?`<div>${this._printEsc(contato)}</div>`:''}
        <div>Impresso em: ${this._printEsc(new Date().toLocaleString('pt-BR'))}</div>
      </div>
    </div>`;
  };

  const oldHtmlV46=Pacientes.htmlRegistroCompleto.bind(Pacientes);
  Pacientes.htmlRegistroCompleto=function(pacId){
    let html=oldHtmlV46(pacId);
    if(!html) return html;

    html=html.replace(
      /<div class="print-header-original">[\s\S]*?<\/div>\s*<\/div>\s*<div class="section">\s*<h3>👤 Dados do Paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );
    html=html.replace(
      /<div class="header">[\s\S]*?<\/div>\s*<div class="section">\s*<h3>Dados do paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );
    /* ZERO V8.7: bloco de estilo quebrado removido para o módulo carregar corretamente. */
    return html;
  };
})();




/* =========================================================
   ZERO V4.7 — Cabeçalho exatamente como a imagem enviada
   Sem quadro/logo lateral. Texto no topo esquerdo:
   PRONTUÁRIO MÉDICO ELETRÔNICO
   Profissional
   Especialidade + CRM
   Endereço
   WhatsApp + @
   Impresso em
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes._configCabecalhoImagem = function(){
    const cfg=(window.Configuracoes && Configuracoes.get && Configuracoes.get()) || {};
    const prof=(window.Profissionais && Profissionais.atual && Profissionais.atual()) || {};
    const conselho=(window.Profissionais && Profissionais.conselho && Profissionais.conselho(prof)) || prof.conselho || '';

    return {
      titulo: cfg.tituloImpressao || 'PRONTUÁRIO MÉDICO ELETRÔNICO',
      profissional: cfg.profissional || prof.nome || '',
      especialidade: cfg.especialidade || prof.especialidade || '',
      conselho: cfg.conselho || conselho || '',
      endereco: cfg.endereco || prof.endereco || '',
      whatsapp: cfg.whatsapp || prof.whatsapp || prof.telefone || '',
      instagram: cfg.instagram || '',
      email: cfg.email || prof.email || ''
    };
  };

  Pacientes._cabecalhoOriginalPrint = function(titulo=''){
    const c=this._configCabecalhoImagem();
    const tituloFinal=titulo || c.titulo || 'PRONTUÁRIO MÉDICO ELETRÔNICO';

    const linhaEspecialidade = [c.especialidade, c.conselho].filter(Boolean).join(' • ');
    const contato = [
      c.whatsapp ? 'WhatsApp: '+c.whatsapp : '',
      c.instagram ? '@'+String(c.instagram).replace(/^@/,'') : '',
      (!c.instagram && c.email) ? c.email : ''
    ].filter(Boolean).join(' • ');

    return `<div class="print-header-imagem">
      <h1>${this._printEsc(tituloFinal)}</h1>
      ${c.profissional?`<div><strong>${this._printEsc(c.profissional)}</strong></div>`:''}
      ${linhaEspecialidade?`<div>${this._printEsc(linhaEspecialidade)}</div>`:''}
      ${c.endereco?`<div>${this._printEsc(c.endereco)}</div>`:''}
      ${contato?`<div>${this._printEsc(contato)}</div>`:''}
      <div>Impresso em: ${this._printEsc(new Date().toLocaleString('pt-BR'))}</div>
    </div>`;
  };

  const oldHtmlV47 = Pacientes.htmlRegistroCompleto.bind(Pacientes);
  Pacientes.htmlRegistroCompleto = function(pacId){
    let html=oldHtmlV47(pacId);
    if(!html) return html;

    html=html.replace(
      /<div class="print-header-original">[\s\S]*?<\/div>\s*<\/div>\s*<div class="section">\s*<h3>👤 Dados do Paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );

    html=html.replace(
      /<div class="header">[\s\S]*?<\/div>\s*<div class="section">\s*<h3>Dados do paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );

    // Remove CSS antigo de logo, e injeta o estilo igual ao print enviado.
    /* ZERO V8.7: bloco de estilo quebrado removido para o módulo carregar corretamente. */
    return html;
  };
})();




/* ZERO V5.0 — Se logo removida, não usar fallback em nenhuma impressão */
(function(){
  if(!window.Pacientes) return;

  const oldConfigCabecalhoV50 = Pacientes._configCabecalhoImagem ? Pacientes._configCabecalhoImagem.bind(Pacientes) : null;
  if(oldConfigCabecalhoV50){
    Pacientes._configCabecalhoImagem = function(){
      const c=oldConfigCabecalhoV50();
      const cfg=(window.Configuracoes && Configuracoes.get && Configuracoes.get()) || {};
      if(cfg.logoRemovida){
        c.logo='';
      }
      return c;
    };
  }

  const oldConfigCabecalhoFullV50 = Pacientes._configCabecalho ? Pacientes._configCabecalho.bind(Pacientes) : null;
  if(oldConfigCabecalhoFullV50){
    Pacientes._configCabecalho = function(){
      const c=oldConfigCabecalhoFullV50();
      const cfg=(window.Configuracoes && Configuracoes.get && Configuracoes.get()) || {};
      if(cfg.logoRemovida){
        c.logo='';
      }
      return c;
    };
  }

  Pacientes.logoPrintSrc = function(){
    const cfg=(window.Configuracoes && Configuracoes.get && Configuracoes.get()) || {};
    if(cfg.logoRemovida) return '';
    return cfg.logo || '';
  };
})();




/* =========================================================
   ZERO V5.1 — Logo salva aparece nos cabeçalhos
   - Se Configurações tiver logo: mostra no cabeçalho.
   - Se clicar Remover logo: não mostra.
   - Se não tiver logo: fica cabeçalho só texto.
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes._configCabecalhoImagem = function(){
    const cfg=(window.Configuracoes && Configuracoes.get && Configuracoes.get()) || {};
    const prof=(window.Profissionais && Profissionais.atual && Profissionais.atual()) || {};
    const conselho=(window.Profissionais && Profissionais.conselho && Profissionais.conselho(prof)) || prof.conselho || '';

    let logo = '';
    if(!cfg.logoRemovida){
      logo = cfg.logo || prof.logo || prof.logoDataUrl || prof.logoUrl || '';
    }

    return {
      titulo: cfg.tituloImpressao || 'PRONTUÁRIO MÉDICO ELETRÔNICO',
      profissional: cfg.profissional || prof.nome || '',
      especialidade: cfg.especialidade || prof.especialidade || '',
      conselho: cfg.conselho || conselho || '',
      endereco: cfg.endereco || prof.endereco || '',
      whatsapp: cfg.whatsapp || prof.whatsapp || prof.telefone || '',
      instagram: cfg.instagram || '',
      email: cfg.email || prof.email || '',
      logo: logo,
      logoRemovida: !!cfg.logoRemovida
    };
  };

  Pacientes._cabecalhoOriginalPrint = function(titulo=''){
    const c=this._configCabecalhoImagem();
    const tituloFinal=titulo || c.titulo || 'PRONTUÁRIO MÉDICO ELETRÔNICO';

    const linhaEspecialidade = [c.especialidade, c.conselho].filter(Boolean).join(' • ');
    const contato = [
      c.whatsapp ? 'WhatsApp: '+c.whatsapp : '',
      c.instagram ? '@'+String(c.instagram).replace(/^@/,'') : '',
      (!c.instagram && c.email) ? c.email : ''
    ].filter(Boolean).join(' • ');

    return `<div class="print-header-imagem ${c.logo?'com-logo':'sem-logo'}">
      ${c.logo?`<div class="print-logo-salva"><img src="${this._printEsc(c.logo)}" alt="Logo"></div>`:''}
      <div class="print-header-texto">
        <h1>${this._printEsc(tituloFinal)}</h1>
        ${c.profissional?`<div><strong>${this._printEsc(c.profissional)}</strong></div>`:''}
        ${linhaEspecialidade?`<div>${this._printEsc(linhaEspecialidade)}</div>`:''}
        ${c.endereco?`<div>${this._printEsc(c.endereco)}</div>`:''}
        ${contato?`<div>${this._printEsc(contato)}</div>`:''}
        <div>Impresso em: ${this._printEsc(new Date().toLocaleString('pt-BR'))}</div>
      </div>
    </div>`;
  };

  const oldHtmlV51 = Pacientes.htmlRegistroCompleto.bind(Pacientes);
  Pacientes.htmlRegistroCompleto = function(pacId){
    let html=oldHtmlV51(pacId);
    if(!html) return html;

    html=html.replace(
      /<div class="print-header-imagem[\s\S]*?<\/div>\s*<\/div>\s*<div class="section">\s*<h3>👤 Dados do Paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );

    html=html.replace(
      /<div class="print-header-original">[\s\S]*?<\/div>\s*<\/div>\s*<div class="section">\s*<h3>👤 Dados do Paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );

    html=html.replace(
      /<div class="header">[\s\S]*?<\/div>\s*<div class="section">\s*<h3>Dados do paciente<\/h3>/,
      `${this._cabecalhoOriginalPrint('PRONTUÁRIO MÉDICO ELETRÔNICO')}\n\n  <div class="section">\n    <h3>👤 Dados do Paciente</h3>`
    );
    /* ZERO V8.7: bloco de estilo quebrado removido para o módulo carregar corretamente. */
    return html;
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
   ZERO V8.6 — Render Pacientes estável
   Caso alguma correção anterior deixe apenas o cabeçalho,
   monta uma lista básica funcional com ações existentes.
========================================================= */
(function(){
  if(!window.Pacientes || Pacientes.__renderEstavelV86) return;
  Pacientes.__renderEstavelV86=true;

  Pacientes._renderOriginalV86 = Pacientes.render ? Pacientes.render.bind(Pacientes) : null;

  Pacientes.render = function(){
    let ok=false;

    if(this._renderOriginalV86){
      try{
        this._renderOriginalV86();
        const content=document.getElementById('content');
        const txt=content?.innerText||'';
        // Se renderizou só cabeçalho/título, complementa com fallback.
        ok = txt.includes('Buscar paciente') || txt.includes('Novo Paciente') || txt.includes('Paciente Completo') || txt.includes('PACIENTE');
      }catch(e){
        console.error(e);
      }
    }

    if(ok) return;

    const pacientes=(Store.get('PACIENTES')||[])
      .slice()
      .sort((a,b)=>String(a.nome||a.nomeCompleto||'').localeCompare(String(b.nome||b.nomeCompleto||''),'pt-BR'));

    const html=`<div class="pacientes-page">
      <div class="card">
        <div class="row" style="justify-content:space-between;gap:12px;align-items:center;">
          <div style="flex:1;">
            <input id="pac-busca-v86" placeholder="🔍 Buscar paciente por nome, CPF, convênio ou plano..." oninput="Pacientes.filtrarTabelaV86()" style="width:100%;">
            <div class="doc-sub" style="margin-top:8px;">Digite qualquer parte do nome, CPF, convênio ou plano do paciente.</div>
          </div>
          <button class="btn btn-blue" onclick="Pacientes.modalNovo ? Pacientes.modalNovo() : (Pacientes.novo ? Pacientes.novo() : Utils.toast('Cadastro não encontrado'))">+ Novo Paciente</button>
          <button class="btn btn-outline" onclick="Pacientes.pacienteCompleto ? Pacientes.pacienteCompleto() : (Pacientes.modalPacienteCompleto ? Pacientes.modalPacienteCompleto() : Utils.toast('Paciente completo não encontrado'))">📦 Paciente Completo</button>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="sv-table-wrap">
          <table class="sv-table" id="pac-tabela-v86">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>CPF</th>
                <th>Nascimento</th>
                <th>Telefone</th>
                <th>Convênio</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${pacientes.map(p=>{
                const nome=p.nome||p.nomeCompleto||'Paciente';
                const status=p.ativo===false||p.status==='Inativo'?'Inativo':'Ativo';
                return `<tr data-paciente-row data-search="${Utils.esc([nome,p.cpf,p.telefone,p.celular,p.convenio,p.plano,status].join(' ').toLowerCase())}">
                  <td><strong>${Utils.esc(nome)}</strong><div class="doc-sub">${Utils.esc(p.email||'')}</div></td>
                  <td>${Utils.esc(p.cpf||'')}</td>
                  <td>${Utils.esc(p.nascimento||p.dataNascimento||'')}</td>
                  <td>${Utils.esc(p.telefone||p.celular||'')}</td>
                  <td>${Utils.esc(p.convenio||p.plano||'')}</td>
                  <td><span class="lgpd-badge">${Utils.esc(status)}</span></td>
                  <td>
                    <button class="btn btn-sm btn-ghost" onclick="Pacientes.ver ? Pacientes.ver('${p.id}') : (Pacientes.visualizar ? Pacientes.visualizar('${p.id}') : Utils.toast('Visualização não encontrada'))">👁 Ver</button>
                    <button class="btn btn-sm btn-outline" onclick="Pacientes.editar ? Pacientes.editar('${p.id}') : Utils.toast('Edição não encontrada')">✏️</button>
                    <button class="btn btn-sm btn-blue" onclick="Router.go('prontuario'); setTimeout(()=>{ if(window.Prontuario?.abrir) Prontuario.abrir('${p.id}') },80)">📋</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

    const el=document.getElementById('content');
    if(el) el.innerHTML=html;
  };

  Pacientes.filtrarTabelaV86 = function(){
    const q=String(document.getElementById('pac-busca-v86')?.value||'').toLowerCase();
    document.querySelectorAll('[data-paciente-row]').forEach(tr=>{
      tr.style.display=(tr.dataset.search||'').includes(q)?'':'none';
    });
  };
})();




/* =========================================================
   ZERO V8.7 — Pacientes carregando corretamente
   - Garante window.Pacientes ativo.
   - Se o render original falhar, mostra lista funcional.
========================================================= */
(function(){
  if(!window.Pacientes) return;

  Pacientes.__fallbackRenderV87 = function(){
    const pacientes=(Store.get('PACIENTES')||[])
      .slice()
      .sort((a,b)=>String(a.nome||a.nomeCompleto||'').localeCompare(String(b.nome||b.nomeCompleto||''),'pt-BR'));

    const rows=pacientes.map(p=>{
      const nome=p.nome||p.nomeCompleto||'Paciente';
      const status=p.ativo===false||p.status==='Inativo'?'Inativo':'Ativo';
      return `<tr data-paciente-row data-search="${Utils.esc([nome,p.cpf,p.telefone,p.celular,p.convenio,p.plano,status].join(' ').toLowerCase())}">
        <td><strong>${Utils.esc(nome)}</strong><div class="doc-sub">${Utils.esc(p.email||'')}</div></td>
        <td>${Utils.esc(p.cpf||'')}</td>
        <td>${Utils.esc(p.nascimento||p.dataNascimento||p.nasc||'')}</td>
        <td>${Utils.esc(p.telefone||p.celular||p.tel||'')}</td>
        <td>${Utils.esc(p.convenio||p.plano||'')}</td>
        <td><span class="lgpd-badge">${Utils.esc(status)}</span></td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="Pacientes.visualizar ? Pacientes.visualizar('${p.id}') : Utils.toast('Visualização não encontrada')">👁 Ver</button>
          <button class="btn btn-sm btn-outline" onclick="Pacientes.modal ? Pacientes.modal('${p.id}') : (Pacientes.editar ? Pacientes.editar('${p.id}') : Utils.toast('Edição não encontrada'))">✏️</button>
          <button class="btn btn-sm btn-blue" onclick="window.Prontuario ? Prontuario.abrir('${p.id}') : Router.go('prontuario')">📋</button>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="7">Nenhum paciente cadastrado.</td></tr>`;

    document.getElementById('content').innerHTML=`<div class="pacientes-page">
      <div class="card">
        <div class="row" style="justify-content:space-between;gap:12px;align-items:center;">
          <div style="flex:1;">
            <input id="pac-busca-v87" placeholder="🔍 Buscar paciente por nome, CPF, convênio ou plano..." oninput="Pacientes.filtrarTabelaV87()" style="width:100%;">
            <div class="doc-sub" style="margin-top:8px;">Digite qualquer parte do nome, CPF, convênio ou plano do paciente.</div>
          </div>
          <button class="btn btn-blue" onclick="Pacientes.modal ? Pacientes.modal() : Utils.toast('Cadastro não encontrado')">+ Novo Paciente</button>
          <button class="btn btn-outline" onclick="Pacientes.pacienteCompleto ? Pacientes.pacienteCompleto() : (Pacientes.modalPacienteCompleto ? Pacientes.modalPacienteCompleto() : Utils.toast('Paciente completo não encontrado'))">📦 Paciente Completo</button>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="sv-table-wrap">
          <table class="sv-table" id="pac-tabela-v87">
            <thead>
              <tr>
                <th>Paciente</th><th>CPF</th><th>Nascimento</th><th>Telefone</th><th>Convênio</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  };

  Pacientes.filtrarTabelaV87 = function(){
    const q=String(document.getElementById('pac-busca-v87')?.value||'').toLowerCase();
    document.querySelectorAll('[data-paciente-row]').forEach(tr=>{
      tr.style.display=(tr.dataset.search||'').includes(q)?'':'none';
    });
  };

  const oldRenderV87 = Pacientes.render ? Pacientes.render.bind(Pacientes) : null;
  Pacientes.render = function(){
    if(oldRenderV87){
      try{
        oldRenderV87();
        const txt=document.getElementById('content')?.innerText||'';
        if(txt.includes('Pacientes') && (txt.includes('Novo Paciente') || txt.includes('Buscar') || txt.includes('CPF'))) return;
      }catch(e){
        console.error('Render original de pacientes falhou:',e);
      }
    }
    return this.__fallbackRenderV87();
  };
})();




/* =========================================================
   ZERO V18.7 — Máscara automática CPF e Nascimento no Paciente
   Correções:
   - Digitar 13101987 vira 13/10/1987.
   - Digitar 37838657865 vira 378.386.578-65.
   - Funciona digitando, colando e ao salvar.
   - Mantém cadastro original do paciente.
========================================================= */
(function(){
  if(!window.Pacientes || Pacientes.__mascaraCpfNascimentoV187) return;
  Pacientes.__mascaraCpfNascimentoV187=true;

  Pacientes.digitosV187=function(v){
    return String(v||'').replace(/\D/g,'');
  };

  Pacientes.formatarCPFV187=function(v){
    const d=this.digitosV187(v).slice(0,11);
    if(!d) return '';
    if(d.length<=3) return d;
    if(d.length<=6) return d.replace(/(\d{3})(\d+)/,'$1.$2');
    if(d.length<=9) return d.replace(/(\d{3})(\d{3})(\d+)/,'$1.$2.$3');
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
  };

  Pacientes.formatarNascimentoV187=function(v){
    let s=String(v||'').trim();
    if(!s) return '';

    // Se já veio em aaaa-mm-dd, converte para dd/mm/aaaa.
    if(/^\d{4}-\d{2}-\d{2}/.test(s)){
      const [a,m,d]=s.slice(0,10).split('-');
      return `${d}/${m}/${a}`;
    }

    const d=this.digitosV187(s).slice(0,8);
    if(!d) return '';
    if(d.length<=2) return d;
    if(d.length<=4) return d.replace(/(\d{2})(\d+)/,'$1/$2');
    return d.replace(/(\d{2})(\d{2})(\d{1,4})/,'$1/$2/$3');
  };

  Pacientes.normalizarNascimentoFinalV187=function(v){
    const f=this.formatarNascimentoV187(v);
    const d=this.digitosV187(f);
    if(d.length!==8) return f;

    const dia=Number(d.slice(0,2));
    const mes=Number(d.slice(2,4));
    const ano=Number(d.slice(4,8));
    if(dia<1 || dia>31 || mes<1 || mes>12 || ano<1900 || ano>2100) return f;
    return `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}`;
  };

  Pacientes.aplicarMascaraCampoPacienteV187=function(){
    const cpf=document.getElementById('pac-cpf');
    const nasc=document.getElementById('pac-nasc') || document.getElementById('pac-nascimento');

    if(cpf && !cpf.__maskCpfV187){
      cpf.__maskCpfV187=true;
      cpf.setAttribute('inputmode','numeric');
      cpf.setAttribute('maxlength','14');
      cpf.setAttribute('placeholder','000.000.000-00');
      const fn=()=>{ cpf.value=this.formatarCPFV187(cpf.value); };
      cpf.addEventListener('input',fn);
      cpf.addEventListener('paste',()=>setTimeout(fn,0));
      cpf.addEventListener('blur',fn);
      fn();
    }

    if(nasc && !nasc.__maskNascV187){
      nasc.__maskNascV187=true;
      nasc.setAttribute('inputmode','numeric');
      nasc.setAttribute('maxlength','10');
      nasc.setAttribute('placeholder','dd/mm/aaaa');
      const fn=()=>{ nasc.value=this.formatarNascimentoV187(nasc.value); };
      const blur=()=>{ nasc.value=this.normalizarNascimentoFinalV187(nasc.value); };
      nasc.addEventListener('input',fn);
      nasc.addEventListener('paste',()=>setTimeout(fn,0));
      nasc.addEventListener('blur',blur);
      fn();
    }
  };

  const oldModalV187=Pacientes.modal?.bind(Pacientes);
  if(oldModalV187){
    Pacientes.modal=function(id=''){
      const ret=oldModalV187(id);
      setTimeout(()=>this.aplicarMascaraCampoPacienteV187(),30);
      setTimeout(()=>this.aplicarMascaraCampoPacienteV187(),120);
      return ret;
    };
  }

  const oldSaveV187=Pacientes.save?.bind(Pacientes);
  if(oldSaveV187){
    Pacientes.save=function(id=''){
      const cpf=document.getElementById('pac-cpf');
      const nasc=document.getElementById('pac-nasc') || document.getElementById('pac-nascimento');
      if(cpf) cpf.value=this.formatarCPFV187(cpf.value);
      if(nasc) nasc.value=this.normalizarNascimentoFinalV187(nasc.value);
      return oldSaveV187(id);
    };
  }

  // Segurança para modais montados por versões antigas ou fallback.
  document.addEventListener('input',function(ev){
    const el=ev.target;
    if(!el || !el.id) return;
    if(el.id==='pac-cpf') el.value=Pacientes.formatarCPFV187(el.value);
    if(el.id==='pac-nasc' || el.id==='pac-nascimento') el.value=Pacientes.formatarNascimentoV187(el.value);
  },true);

  document.addEventListener('blur',function(ev){
    const el=ev.target;
    if(!el || !el.id) return;
    if(el.id==='pac-cpf') el.value=Pacientes.formatarCPFV187(el.value);
    if(el.id==='pac-nasc' || el.id==='pac-nascimento') el.value=Pacientes.normalizarNascimentoFinalV187(el.value);
  },true);
})();




/* =========================================================
   ZERO V18.8 — Paciente: tipo sanguíneo + máscaras de contato
   Correções:
   - Volta campo Tipo sanguíneo no Novo/Editar Paciente.
   - Salva tipo sanguíneo no cadastro.
   - Visualizar Cadastro mostra Tipo sanguíneo.
   - Telefone, WhatsApp e telefone do responsável formatam automático.
   - CPF e nascimento continuam formatando.
========================================================= */
(function(){
  if(!window.Pacientes || Pacientes.__sangueContatoMascaraV188) return;
  Pacientes.__sangueContatoMascaraV188=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');

  Pacientes.valorSangueV188=function(p={}){
    return p.tipoSanguineo || p.tipoSangue || p.sangue || p.grupoSanguineo || '';
  };

  Pacientes.formatarTelefoneV188=function(v){
    const d=String(v||'').replace(/\D/g,'').slice(0,11);
    if(!d) return '';
    if(d.length<=2) return d;
    if(d.length<=6) return d.replace(/(\d{2})(\d+)/,'($1) $2');
    if(d.length<=10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').replace(/-$/,'');
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3').replace(/-$/,'');
  };

  Pacientes.inputTelefoneV188=function(el){
    if(!el || el.__maskTelV188) return;
    el.__maskTelV188=true;
    el.setAttribute('inputmode','numeric');
    el.setAttribute('maxlength','15');
    el.setAttribute('placeholder','(00) 00000-0000');
    const fn=()=>{ el.value=Pacientes.formatarTelefoneV188(el.value); };
    el.addEventListener('input',fn);
    el.addEventListener('paste',()=>setTimeout(fn,0));
    el.addEventListener('blur',fn);
    fn();
  };

  Pacientes.inserirTipoSanguineoV188=function(p={}){
    if(document.getElementById('pac-tipo-sangue')) return;

    const sexo=document.getElementById('pac-sexo');
    const grid=sexo?.closest('.cm-form-grid') || document.querySelector('#modal-root .cm-form-grid');
    if(!grid) return;

    const wrap=document.createElement('div');
    wrap.className='pac-sangue-field-v188';
    wrap.innerHTML=`<label>Tipo sanguíneo</label>
      <select id="pac-tipo-sangue">
        <option value="">Selecione</option>
        <option>A+</option>
        <option>A-</option>
        <option>B+</option>
        <option>B-</option>
        <option>AB+</option>
        <option>AB-</option>
        <option>O+</option>
        <option>O-</option>
        <option>Não informado</option>
      </select>`;

    const sexoBox=sexo?.closest('div');
    if(sexoBox && sexoBox.parentElement===grid) sexoBox.insertAdjacentElement('afterend',wrap);
    else grid.appendChild(wrap);

    const sel=document.getElementById('pac-tipo-sangue');
    if(sel) sel.value=this.valorSangueV188(p);
  };

  Pacientes.aplicarCamposPacienteV188=function(p={}){
    try{ this.aplicarMascaraCampoPacienteV187 && this.aplicarMascaraCampoPacienteV187(); }catch(e){}

    this.inserirTipoSanguineoV188(p);

    this.inputTelefoneV188(document.getElementById('pac-tel'));
    this.inputTelefoneV188(document.getElementById('pac-whats'));
    this.inputTelefoneV188(document.getElementById('pac-resp-tel'));

    const cpf=document.getElementById('pac-cpf');
    const nasc=document.getElementById('pac-nasc') || document.getElementById('pac-nascimento');
    if(cpf && this.formatarCPFV187) cpf.value=this.formatarCPFV187(cpf.value);
    if(nasc && this.formatarNascimentoV187) nasc.value=this.formatarNascimentoV187(nasc.value);
  };

  const oldModalV188=Pacientes.modal?.bind(Pacientes);
  if(oldModalV188){
    Pacientes.modal=function(id=''){
      const p=this.list().find(x=>String(x.id)===String(id))||{};
      const ret=oldModalV188(id);
      setTimeout(()=>this.aplicarCamposPacienteV188(p),20);
      setTimeout(()=>this.aplicarCamposPacienteV188(p),100);
      setTimeout(()=>this.aplicarCamposPacienteV188(p),250);
      return ret;
    };
  }

  const oldSaveV188=Pacientes.save?.bind(Pacientes);
  if(oldSaveV188){
    Pacientes.save=function(id=''){
      const nome=(document.getElementById('pac-nome')?.value||'').trim();
      const cpfEl=document.getElementById('pac-cpf');
      const nascEl=document.getElementById('pac-nasc') || document.getElementById('pac-nascimento');
      const telEl=document.getElementById('pac-tel');
      const whatsEl=document.getElementById('pac-whats');
      const respEl=document.getElementById('pac-resp-tel');
      const sangue=document.getElementById('pac-tipo-sangue')?.value||'';

      if(cpfEl && this.formatarCPFV187) cpfEl.value=this.formatarCPFV187(cpfEl.value);
      if(nascEl && this.normalizarNascimentoFinalV187) nascEl.value=this.normalizarNascimentoFinalV187(nascEl.value);
      if(telEl) telEl.value=this.formatarTelefoneV188(telEl.value);
      if(whatsEl) whatsEl.value=this.formatarTelefoneV188(whatsEl.value);
      if(respEl) respEl.value=this.formatarTelefoneV188(respEl.value);

      const cpfVal=cpfEl?.value||'';

      const ret=oldSaveV188(id);

      try{
        const lista=Store.get('PACIENTES')||[];
        let p=null;
        if(id) p=lista.find(x=>String(x.id)===String(id));
        if(!p && cpfVal) p=[...lista].reverse().find(x=>String(x.cpf||'')===String(cpfVal));
        if(!p && nome) p=[...lista].reverse().find(x=>String(x.nome||x.nomeCompleto||'')===String(nome));

        if(p){
          p.tipoSanguineo=sangue;
          p.tipoSangue=sangue;
          p.sangue=sangue;
          p.grupoSanguineo=sangue;
          p.cpf=cpfVal || p.cpf || '';
          p.nascimento=nascEl?.value || p.nascimento || p.nasc || '';
          p.nasc=p.nascimento;
          p.dataNascimento=p.nascimento;
          p.telefone=telEl?.value || p.telefone || p.tel || '';
          p.tel=p.telefone;
          p.whatsapp=whatsEl?.value || p.whatsapp || '';
          p.responsavelTelefone=respEl?.value || p.responsavelTelefone || '';
          Store.upsert('PACIENTES',p);
          setTimeout(()=>{ try{ this.render && this.render(); }catch(e){} },30);
        }
      }catch(e){
        console.warn('Falha ao salvar tipo sanguíneo/contato do paciente',e);
      }

      return ret;
    };
  }

  Pacientes.visualizar=function(id){
    const p=this.list().find(x=>String(x.id)===String(id));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const tel=this.formatarTelefoneV188(p.telefone||p.tel||'');
    const whats=this.formatarTelefoneV188(p.whatsapp||'');
    const resp=this.formatarTelefoneV188(p.responsavelTelefone||'');

    Modal.open('👁️ Cadastro do Paciente',`
      <div class="cm-section">
        <div class="cm-section-title">👤 Dados principais</div>
        <div class="cm-view-grid">
          ${this.viewItem('Nome',p.nome||p.nomeCompleto)}
          ${this.viewItem('Status',p.ativo===false?'Inativo':'Ativo')}
          ${this.viewItem('CPF',this.formatarCPFV187?this.formatarCPFV187(p.cpf||''):p.cpf)}
          ${this.viewItem('RG',p.rg)}
          ${this.viewItem('Nascimento',this.normalizarNascimentoFinalV187?this.normalizarNascimentoFinalV187(p.nascimento||p.nasc||p.dataNascimento||''):(p.nascimento||p.nasc||p.dataNascimento))}
          ${this.viewItem('Sexo',p.sexo)}
          ${this.viewItem('Tipo sanguíneo',this.valorSangueV188(p))}
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">📞 Contato</div>
        <div class="cm-view-grid">
          ${this.viewItem('Telefone',tel)}
          ${this.viewItem('WhatsApp',whats)}
          ${this.viewItem('E-mail',p.email)}
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">🏠 Endereço</div>
        <div class="cm-view-grid">
          ${this.viewItem('Endereço',p.endereco)}
          ${this.viewItem('Número',p.numero)}
          ${this.viewItem('Bairro',p.bairro)}
          ${this.viewItem('Cidade',p.cidade)}
          ${this.viewItem('UF',p.uf)}
          ${this.viewItem('CEP',p.cep)}
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">💳 Convênio / Responsável</div>
        <div class="cm-view-grid">
          ${this.viewItem('Convênio',p.convenio)}
          ${this.viewItem('Carteirinha',p.carteirinha)}
          ${this.viewItem('Responsável',p.responsavel)}
          ${this.viewItem('Telefone responsável',resp)}
        </div>
        ${p.obs?`<div class="cm-view-item" style="margin-top:10px;"><strong>Observações</strong><span>${esc(p.obs)}</span></div>`:''}
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-outline" onclick="Pacientes.modal('${p.id}')">Editar Cadastro</button>
      <button class="btn btn-blue" onclick="Modal.close();Prontuario.abrir('${p.id}')">Abrir Prontuário</button>
    `,'lg');
  };

  Pacientes.ver=function(id){ return this.visualizar(id); };
  Pacientes.editar=function(id){ return this.modal(id); };

  // Segurança para modais montados por versões antigas.
  document.addEventListener('input',function(ev){
    const el=ev.target;
    if(!el || !el.id) return;
    if(['pac-tel','pac-whats','pac-resp-tel'].includes(el.id)){
      el.value=Pacientes.formatarTelefoneV188(el.value);
    }
  },true);

  document.addEventListener('blur',function(ev){
    const el=ev.target;
    if(!el || !el.id) return;
    if(['pac-tel','pac-whats','pac-resp-tel'].includes(el.id)){
      el.value=Pacientes.formatarTelefoneV188(el.value);
    }
  },true);
})();




/* =========================================================
   ZERO V18.9 — Visualizar Paciente: contato/email dentro do grid
   Correções:
   - E-mail grande quebra linha e não sai do card.
   - Telefone/WhatsApp seguem no grid.
========================================================= */
(function(){
  if(!window.Pacientes || Pacientes.__gridEmailContatoV189) return;
  Pacientes.__gridEmailContatoV189=true;

  const oldViewItemV189=Pacientes.viewItem?.bind(Pacientes);
  Pacientes.viewItem=function(label,value){
    const lbl=String(label||'');
    const cls=lbl.toLowerCase().includes('e-mail') || lbl.toLowerCase().includes('email') ? ' pac-email-grid-v189' : '';
    if(oldViewItemV189){
      const html=oldViewItemV189(label,value);
      return String(html).replace('class="cm-view-item"',`class="cm-view-item${cls}"`);
    }
    return `<div class="cm-view-item${cls}"><strong>${Utils.esc(label||'')}</strong><span>${Utils.esc(value||'—')}</span></div>`;
  };

  const oldVisualizarV189=Pacientes.visualizar?.bind(Pacientes);
  if(oldVisualizarV189){
    Pacientes.visualizar=function(id){
      const ret=oldVisualizarV189(id);
      setTimeout(()=>{
        document.querySelectorAll('#modal-root .cm-section').forEach(sec=>{
          const title=String(sec.querySelector('.cm-section-title')?.textContent||'').toLowerCase();
          if(title.includes('contato')){
            const grid=sec.querySelector('.cm-view-grid');
            if(grid) grid.classList.add('paciente-contato-grid-v189');
          }
        });
      },30);
      return ret;
    };
    Pacientes.ver=function(id){ return this.visualizar(id); };
  }
})();




/* =========================================================
   ZERO V19.0 — Paciente: complemento no endereço
   Correções:
   - Adiciona campo Complemento no endereço do Novo/Editar Paciente.
   - Salva complemento no cadastro.
   - Visualizar Cadastro mostra Complemento no endereço.
   - Mantém máscaras de CPF, nascimento e telefone.
========================================================= */
(function(){
  if(!window.Pacientes || Pacientes.__complementoEnderecoV190) return;
  Pacientes.__complementoEnderecoV190=true;

  Pacientes.valorComplementoV190=function(p={}){
    return p.complemento || p.enderecoComplemento || p.compl || '';
  };

  Pacientes.inserirComplementoEnderecoV190=function(p={}){
    if(document.getElementById('pac-complemento')) return;

    const numero=document.getElementById('pac-numero');
    const grid=numero?.closest('.cm-form-grid') || document.querySelector('#modal-root .cm-form-grid');
    if(!grid) return;

    const wrap=document.createElement('div');
    wrap.className='pac-complemento-field-v190';
    wrap.innerHTML=`<label>Complemento</label>
      <input id="pac-complemento" value="${Utils.esc(this.valorComplementoV190(p))}" placeholder="Apto, bloco, sala, referência...">`;

    const numeroBox=numero?.closest('div');
    if(numeroBox && numeroBox.parentElement===grid) numeroBox.insertAdjacentElement('afterend',wrap);
    else grid.appendChild(wrap);
  };

  Pacientes.aplicarComplementoEnderecoV190=function(p={}){
    this.inserirComplementoEnderecoV190(p);
  };

  const oldModalV190=Pacientes.modal?.bind(Pacientes);
  if(oldModalV190){
    Pacientes.modal=function(id=''){
      const p=this.list().find(x=>String(x.id)===String(id))||{};
      const ret=oldModalV190(id);

      setTimeout(()=>this.aplicarComplementoEnderecoV190(p),20);
      setTimeout(()=>this.aplicarComplementoEnderecoV190(p),100);
      setTimeout(()=>this.aplicarComplementoEnderecoV190(p),250);

      return ret;
    };
  }

  const oldSaveV190=Pacientes.save?.bind(Pacientes);
  if(oldSaveV190){
    Pacientes.save=function(id=''){
      const nome=(document.getElementById('pac-nome')?.value||'').trim();
      const cpfVal=document.getElementById('pac-cpf')?.value||'';
      const complemento=document.getElementById('pac-complemento')?.value?.trim()||'';

      const ret=oldSaveV190(id);

      try{
        const lista=Store.get('PACIENTES')||[];
        let p=null;

        if(id) p=lista.find(x=>String(x.id)===String(id));
        if(!p && cpfVal) p=[...lista].reverse().find(x=>String(x.cpf||'')===String(cpfVal));
        if(!p && nome) p=[...lista].reverse().find(x=>String(x.nome||x.nomeCompleto||'')===String(nome));

        if(p){
          p.complemento=complemento;
          p.enderecoComplemento=complemento;
          p.compl=complemento;
          Store.upsert('PACIENTES',p);
          setTimeout(()=>{ try{ this.render && this.render(); }catch(e){} },30);
        }
      }catch(e){
        console.warn('Falha ao salvar complemento do endereço',e);
      }

      return ret;
    };
  }

  const oldVisualizarV190=Pacientes.visualizar?.bind(Pacientes);
  if(oldVisualizarV190){
    Pacientes.visualizar=function(id){
      const p=this.list().find(x=>String(x.id)===String(id));
      const ret=oldVisualizarV190(id);

      setTimeout(()=>{
        try{
          const complemento=this.valorComplementoV190(p||{});
          const sec=[...document.querySelectorAll('#modal-root .cm-section')].find(s=>{
            const t=String(s.querySelector('.cm-section-title')?.textContent||'').toLowerCase();
            return t.includes('endereço') || t.includes('endereco');
          });
          const grid=sec?.querySelector('.cm-view-grid');
          if(grid && !grid.querySelector('[data-pac-complemento-v190]')){
            grid.insertAdjacentHTML('beforeend',
              `<div class="cm-view-item" data-pac-complemento-v190="1"><strong>Complemento</strong><span>${Utils.esc(complemento||'—')}</span></div>`
            );
          }
        }catch(e){}
      },40);

      return ret;
    };
    Pacientes.ver=function(id){ return this.visualizar(id); };
  }
})();




/* =========================================================
   ZERO V19.1 — Modal Paciente estável, sem piscar
   Correções:
   - Novo Cadastro de Paciente abre direto no modal final.
   - Editar Cadastro do Paciente abre direto no modal final.
   - Não chama modal antigo e depois injeta campos.
   - Tipo sanguíneo e Complemento já nascem no HTML final.
   - Máscaras aplicadas sem trocar o conteúdo do modal.
========================================================= */
(function(){
  if(!window.Pacientes || Pacientes.__modalPacienteEstavelV191) return;
  Pacientes.__modalPacienteEstavelV191=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');

  Pacientes.valorSangueV191=function(p={}){
    return p.tipoSanguineo || p.tipoSangue || p.sangue || p.grupoSanguineo || '';
  };

  Pacientes.valorComplementoV191=function(p={}){
    return p.complemento || p.enderecoComplemento || p.compl || '';
  };

  Pacientes.estabilizarModalPacienteV191=function(){
    document.body.classList.add('paciente-modal-estavel-v191');
    const root=document.getElementById('modal-root');
    if(!root) return;
    root.classList.add('paciente-modal-root-v191');
    root.querySelectorAll('.modal-backdrop,.modal,.modal-title,.modal-body,.modal-footer,.cm-section,.cm-form-grid').forEach(el=>{
      el.style.animation='none';
      el.style.transition='none';
      el.style.opacity='1';
      el.style.visibility='visible';
      el.style.transform='none';
    });
  };

  Pacientes.abrirModalPacienteEstavelV191=function(titulo,body,footer,size='lg'){
    const root=document.getElementById('modal-root');
    if(!root) return false;

    root.innerHTML=`<div class="modal-backdrop paciente-backdrop-v191">
      <div class="modal ${size} paciente-modal-v191">
        <div class="modal-title paciente-modal-title-v191">
          ${titulo}
          <button class="modal-x" onclick="Modal.close();document.body.classList.remove('paciente-modal-estavel-v191')">×</button>
        </div>
        <div class="modal-body paciente-modal-body-v191">${body}</div>
        <div class="modal-footer paciente-modal-footer-v191">${footer}</div>
      </div>
    </div>`;

    this.estabilizarModalPacienteV191();
    requestAnimationFrame(()=>this.estabilizarModalPacienteV191());
    setTimeout(()=>this.estabilizarModalPacienteV191(),60);
    return true;
  };

  Pacientes.modal=function(id=''){
    const p=this.list().find(x=>String(x.id)===String(id))||{};
    const titulo=id?'Editar Cadastro do Paciente':'Novo Cadastro de Paciente';
    const sangue=this.valorSangueV191(p);
    const complemento=this.valorComplementoV191(p);
    const nasc=(this.normalizarNascimentoFinalV187 ? this.normalizarNascimentoFinalV187(p.nascimento||p.nasc||p.dataNascimento||'') : (p.nascimento||p.nasc||p.dataNascimento||''));
    const cpf=(this.formatarCPFV187 ? this.formatarCPFV187(p.cpf||'') : (p.cpf||''));
    const tel=(this.formatarTelefoneV188 ? this.formatarTelefoneV188(p.telefone||p.tel||'') : (p.telefone||p.tel||''));
    const whats=(this.formatarTelefoneV188 ? this.formatarTelefoneV188(p.whatsapp||'') : (p.whatsapp||''));
    const respTel=(this.formatarTelefoneV188 ? this.formatarTelefoneV188(p.responsavelTelefone||'') : (p.responsavelTelefone||''));

    const body=`
      <div class="cm-section">
        <div class="cm-section-title">👤 Dados do Paciente</div>
        <div class="cm-form-grid paciente-form-grid-v191">
          <div class="span-3">
            <label>Nome completo</label>
            <input id="pac-nome" value="${esc(p.nome||p.nomeCompleto||'')}" placeholder="Nome completo do paciente">
          </div>
          <div>
            <label>Status</label>
            <select id="pac-ativo">
              <option value="true" ${p.ativo===false?'':'selected'}>Ativo</option>
              <option value="false" ${p.ativo===false?'selected':''}>Inativo</option>
            </select>
          </div>
          <div>
            <label>CPF</label>
            <input id="pac-cpf" inputmode="numeric" maxlength="14" value="${esc(cpf)}" placeholder="000.000.000-00">
          </div>
          <div>
            <label>RG</label>
            <input id="pac-rg" value="${esc(p.rg||'')}">
          </div>
          <div>
            <label>Nascimento</label>
            <input id="pac-nasc" inputmode="numeric" maxlength="10" value="${esc(nasc)}" placeholder="dd/mm/aaaa">
          </div>
          <div>
            <label>Sexo</label>
            <select id="pac-sexo">
              <option value="" ${!p.sexo?'selected':''}>Selecione</option>
              <option value="Feminino" ${p.sexo==='Feminino'?'selected':''}>Feminino</option>
              <option value="Masculino" ${p.sexo==='Masculino'?'selected':''}>Masculino</option>
              <option value="Outro" ${p.sexo==='Outro'?'selected':''}>Outro</option>
            </select>
          </div>
          <div>
            <label>Tipo sanguíneo</label>
            <select id="pac-tipo-sangue">
              <option value="" ${!sangue?'selected':''}>Selecione</option>
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-','Não informado'].map(v=>`<option value="${v}" ${sangue===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">📞 Contato</div>
        <div class="cm-form-grid paciente-form-grid-v191">
          <div>
            <label>Telefone</label>
            <input id="pac-tel" inputmode="numeric" maxlength="15" value="${esc(tel)}" placeholder="(00) 00000-0000">
          </div>
          <div>
            <label>WhatsApp</label>
            <input id="pac-whats" inputmode="numeric" maxlength="15" value="${esc(whats)}" placeholder="(00) 00000-0000">
          </div>
          <div class="span-2">
            <label>E-mail</label>
            <input id="pac-email" value="${esc(p.email||'')}" placeholder="email@exemplo.com">
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">🏠 Endereço</div>
        <div class="cm-form-grid paciente-form-grid-v191">
          <div class="span-3">
            <label>Endereço</label>
            <input id="pac-end" value="${esc(p.endereco||'')}">
          </div>
          <div>
            <label>Número</label>
            <input id="pac-numero" value="${esc(p.numero||'')}">
          </div>
          <div>
            <label>Complemento</label>
            <input id="pac-complemento" value="${esc(complemento)}" placeholder="Apto, bloco, sala, referência...">
          </div>
          <div>
            <label>Bairro</label>
            <input id="pac-bairro" value="${esc(p.bairro||'')}">
          </div>
          <div>
            <label>Cidade</label>
            <input id="pac-cidade" value="${esc(p.cidade||'Campo Grande')}">
          </div>
          <div>
            <label>UF</label>
            <input id="pac-uf" value="${esc(p.uf||'MS')}" maxlength="2">
          </div>
          <div>
            <label>CEP</label>
            <input id="pac-cep" value="${esc(p.cep||'')}">
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">💳 Convênio / Responsável</div>
        <div class="cm-form-grid paciente-form-grid-v191">
          <div class="span-2">
            <label>Convênio</label>
            <input id="pac-conv" value="${esc(p.convenio||p.plano||'')}">
          </div>
          <div class="span-2">
            <label>Número da carteirinha</label>
            <input id="pac-carteirinha" value="${esc(p.carteirinha||'')}">
          </div>
          <div class="span-2">
            <label>Responsável</label>
            <input id="pac-responsavel" value="${esc(p.responsavel||'')}">
          </div>
          <div class="span-2">
            <label>Telefone do responsável</label>
            <input id="pac-resp-tel" inputmode="numeric" maxlength="15" value="${esc(respTel)}" placeholder="(00) 00000-0000">
          </div>
          <div class="span-4">
            <label>Observações</label>
            <textarea id="pac-obs" rows="3">${esc(p.obs||'')}</textarea>
          </div>
        </div>
      </div>`;

    const footer=`
      <button class="btn btn-ghost" onclick="Modal.close();document.body.classList.remove('paciente-modal-estavel-v191')">Cancelar</button>
      ${id?`<button class="btn btn-outline" onclick="Pacientes.visualizar('${id}')">Visualizar</button>`:''}
      <button class="btn btn-blue" onclick="Pacientes.save('${id}')">Salvar Cadastro</button>`;

    this.abrirModalPacienteEstavelV191(titulo,body,footer,'lg');
    this.aplicarEventosPacienteV191();
    return false;
  };

  Pacientes.aplicarEventosPacienteV191=function(){
    const cpf=document.getElementById('pac-cpf');
    const nasc=document.getElementById('pac-nasc');
    const tels=[document.getElementById('pac-tel'),document.getElementById('pac-whats'),document.getElementById('pac-resp-tel')];

    if(cpf){
      const fn=()=>{ if(this.formatarCPFV187) cpf.value=this.formatarCPFV187(cpf.value); };
      cpf.addEventListener('input',fn);
      cpf.addEventListener('paste',()=>setTimeout(fn,0));
      cpf.addEventListener('blur',fn);
      fn();
    }

    if(nasc){
      const fn=()=>{ if(this.formatarNascimentoV187) nasc.value=this.formatarNascimentoV187(nasc.value); };
      const blur=()=>{ if(this.normalizarNascimentoFinalV187) nasc.value=this.normalizarNascimentoFinalV187(nasc.value); };
      nasc.addEventListener('input',fn);
      nasc.addEventListener('paste',()=>setTimeout(fn,0));
      nasc.addEventListener('blur',blur);
      fn();
    }

    tels.forEach(el=>{
      if(!el) return;
      const fn=()=>{ if(this.formatarTelefoneV188) el.value=this.formatarTelefoneV188(el.value); };
      el.addEventListener('input',fn);
      el.addEventListener('paste',()=>setTimeout(fn,0));
      el.addEventListener('blur',fn);
      fn();
    });
  };

  Pacientes.save=function(id=''){
    let p=id?this.list().find(x=>String(x.id)===String(id)):{id:Utils.id('PAC')};
    if(!p) p={id:id||Utils.id('PAC')};

    const cpf=this.formatarCPFV187 ? this.formatarCPFV187(document.getElementById('pac-cpf')?.value||'') : (document.getElementById('pac-cpf')?.value||'');
    const nasc=this.normalizarNascimentoFinalV187 ? this.normalizarNascimentoFinalV187(document.getElementById('pac-nasc')?.value||'') : (document.getElementById('pac-nasc')?.value||'');
    const tel=this.formatarTelefoneV188 ? this.formatarTelefoneV188(document.getElementById('pac-tel')?.value||'') : (document.getElementById('pac-tel')?.value||'');
    const whats=this.formatarTelefoneV188 ? this.formatarTelefoneV188(document.getElementById('pac-whats')?.value||'') : (document.getElementById('pac-whats')?.value||'');
    const respTel=this.formatarTelefoneV188 ? this.formatarTelefoneV188(document.getElementById('pac-resp-tel')?.value||'') : (document.getElementById('pac-resp-tel')?.value||'');

    p.nome=(document.getElementById('pac-nome')?.value||'').trim();
    p.nomeCompleto=p.nome;
    p.ativo=document.getElementById('pac-ativo')?.value!=='false';
    p.cpf=cpf;
    p.rg=(document.getElementById('pac-rg')?.value||'').trim();
    p.nascimento=nasc;
    p.nasc=nasc;
    p.dataNascimento=nasc;
    p.sexo=document.getElementById('pac-sexo')?.value||'';

    const sangue=document.getElementById('pac-tipo-sangue')?.value||'';
    p.tipoSanguineo=sangue;
    p.tipoSangue=sangue;
    p.sangue=sangue;
    p.grupoSanguineo=sangue;

    p.telefone=tel;
    p.tel=tel;
    p.whatsapp=whats;
    p.email=(document.getElementById('pac-email')?.value||'').trim();

    p.endereco=(document.getElementById('pac-end')?.value||'').trim();
    p.numero=(document.getElementById('pac-numero')?.value||'').trim();
    p.complemento=(document.getElementById('pac-complemento')?.value||'').trim();
    p.enderecoComplemento=p.complemento;
    p.compl=p.complemento;
    p.bairro=(document.getElementById('pac-bairro')?.value||'').trim();
    p.cidade=(document.getElementById('pac-cidade')?.value||'').trim();
    p.uf=(document.getElementById('pac-uf')?.value||'').trim().toUpperCase();
    p.cep=(document.getElementById('pac-cep')?.value||'').trim();

    p.convenio=(document.getElementById('pac-conv')?.value||'').trim();
    p.plano=p.convenio;
    p.carteirinha=(document.getElementById('pac-carteirinha')?.value||'').trim();
    p.responsavel=(document.getElementById('pac-responsavel')?.value||'').trim();
    p.responsavelTelefone=respTel;
    p.obs=(document.getElementById('pac-obs')?.value||'').trim();

    if(!p.nome) return Utils.toast('Informe o nome do paciente.');

    Store.upsert('PACIENTES',p);
    Modal.close();
    document.body.classList.remove('paciente-modal-estavel-v191');
    this.render();
    Utils.toast('Cadastro do paciente salvo.');
    return true;
  };

  Pacientes.novo=function(){ return this.modal(''); };
  Pacientes.modalNovo=function(){ return this.modal(''); };
  Pacientes.editar=function(id){ return this.modal(id); };
})();
