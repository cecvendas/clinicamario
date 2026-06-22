window.RegistrarConsulta={
  formDraft:null,

  open(pacId,atendimentoId=''){
    const p=Store.get('PACIENTES').find(x=>x.id===pacId);
    if(!p)return;

    if(window.Security && !Security.canRegistrarConsulta()){
      Utils.toast('Somente perfil Médico ou Administrador pode registrar consulta.');
      return;
    }

    const atendimento = window.Atendimento && Atendimento.emAtendimento(pacId);
    if(!atendimento){
      Utils.toast('Só é possível registrar consulta quando o paciente estiver em atendimento.');
      return;
    }

    const consId=atendimentoId || atendimento.id || Utils.id('CONS');
    Documentos.start(pacId,consId);
    this.pac=p;
    this.consId=consId;
    this.atendimentoId=atendimento.id;
    this.formDraft=null;

    Modal.open('🩺 Registrar Consulta',this.html(),this.footer(),'lg');
    setTimeout(()=>this.afterRender(),40);
  },

  esc(v){ return Utils.esc(v); },

  val(id){ return document.getElementById(id)?.value?.trim() || ''; },

  checks(name){
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(x=>x.value);
  },

  captureForm(){
    const root=document.querySelector('.modal-body');
    if(!root) return;
    const data={};
    root.querySelectorAll('input,textarea,select').forEach(el=>{
      if(!el.id && !el.name) return;
      const key=el.id || ('name:'+el.name+':'+el.value);
      if(el.type==='checkbox' || el.type==='radio') data[key]=el.checked;
      else data[key]=el.value;
    });
    this.formDraft=data;
  },

  restoreForm(){
    const data=this.formDraft;
    if(!data) return;
    const root=document.querySelector('.modal-body');
    if(!root) return;
    root.querySelectorAll('input,textarea,select').forEach(el=>{
      const key=el.id || ('name:'+el.name+':'+el.value);
      if(!(key in data)) return;
      if(el.type==='checkbox' || el.type==='radio') el.checked=!!data[key];
      else el.value=data[key];
    });
  },

  afterRender(){
    this.restoreForm();
    this.atualizarModoRegistroAtendimento();
    this.toggleDetalhesRadio('ana-tabagismo-opcao','Sim','ana-tabagismo-detalhe-box');
    this.toggleDetalhesRadio('ana-etilismo-opcao','Sim','ana-etilismo-detalhe-box');
    this.toggleDetalhesRadio('ana-alergia-medicamentosa-opcao','Sim','ana-alergia-medicamentosa-detalhe-box');
    this.toggleDetalhesRadio('ana-alergia-alimentar-opcao','Sim','ana-alergia-alimentar-detalhe-box');
    this.renderCards();
  },

  field(id,label,rows=2,ph=''){
    return `<div class="rc-col rc-full"><label>${this.esc(label)}</label><textarea id="${id}" rows="${rows}" placeholder="${this.esc(ph||label)}"></textarea></div>`;
  },

  input(id,label,ph='',type='text'){
    return `<div class="rc-col"><label>${this.esc(label)}</label><input type="${type}" id="${id}" placeholder="${this.esc(ph)}"></div>`;
  },

  section(t){
    return `<div class="rc-section">${this.esc(t)}</div>`;
  },

  radio(label,name,items,detailFn=''){
    return `<div class="rc-col rc-full"><label>${this.esc(label)}</label><div class="rc-radio-grid">
      ${items.map(([v,t])=>`<label class="rc-radio"><input type="radio" name="${name}" value="${this.esc(v)}" ${detailFn?`onchange="${detailFn}"`:''}> ${this.esc(t)}</label>`).join('')}
    </div></div>`;
  },

  checksHtml(label,name,items){
    return `<div class="rc-col rc-full"><label>${this.esc(label)}</label><div class="rc-check-grid">
      ${items.map(([v,t])=>`<label class="rc-check"><input type="checkbox" name="${name}" value="${this.esc(t)}"> ${this.esc(t)}</label>`).join('')}
    </div></div>`;
  },

  lastVitalsHtml(){
    const p=this.pac;
    const regs=Store.get('SINAIS_VITAIS').filter(x=>x.pacId===p.id||x.pacienteId===p.id)
      .sort((a,b)=>(Date.parse(b.dataHora||b.criadoEm||'')||0)-(Date.parse(a.dataHora||a.criadoEm||'')||0));
    const s=regs[0];
    if(!s) return '';
    return `<div class="rc-last-vitals">
      <div><strong>Últimos sinais vitais</strong></div>
      <div>PA: <strong>${this.esc(s.pa||'—')}</strong></div>
      <div>FC: <strong>${this.esc(s.fc||'—')} bpm</strong></div>
      <div>SpO₂: <strong>${this.esc(s.spo2||'—')}%</strong></div>
      <div>Temp: <strong>${this.esc(s.temp||'—')}°C</strong></div>
      <div>${this.esc(s.data||'')}</div>
    </div>`;
  },

  renderMedicacoesUso(){
    return `<div class="rc-col rc-full">
      <label>Medicações em uso</label>
      <div id="ana-medicacoes-lista">
        <div class="rc-med-row ana-med-row">
          <input class="ana-med-nome" placeholder="Medicamento">
          <input class="ana-med-dose" placeholder="Dose">
          <input class="ana-med-freq" placeholder="Frequência">
          <button type="button" class="btn btn-sm btn-outline" onclick="RegistrarConsulta.addMedicacaoRow()">+</button>
        </div>
      </div>
    </div>`;
  },

  addMedicacaoRow(){
    const box=document.getElementById('ana-medicacoes-lista');
    if(!box) return;
    const div=document.createElement('div');
    div.className='rc-med-row ana-med-row';
    div.innerHTML=`<input class="ana-med-nome" placeholder="Medicamento"><input class="ana-med-dose" placeholder="Dose"><input class="ana-med-freq" placeholder="Frequência"><button type="button" class="btn btn-sm btn-red" onclick="this.closest('.ana-med-row').remove()">×</button>`;
    box.appendChild(div);
  },

  html(){
    const p=this.pac;
    return `<div class="rc-original">
      <div class="patient-top">
        <div><strong>Paciente</strong><br>${this.esc(p.nome)}</div>
        <div><strong>Nascimento</strong><br>${this.esc(p.nascimento||p.nasc||'—')}</div>
        <div><strong>CPF</strong><br>${this.esc(p.cpf||'—')}</div>
        <div><strong>Convênio</strong><br>${this.esc(p.convenio||'—')}</div>
      </div>

      <div class="rc-form-grid">
        ${this.lastVitalsHtml()}

        <div class="rc-col"><label>Tipo</label>
          <select id="nc-tipo" onchange="RegistrarConsulta.atualizarModoRegistroAtendimento()">
            <option>Consulta</option>
            <option>Retorno</option>
            <option>Procedimento</option>
            <option>Urgência</option>
            <option>Emergência</option>
          </select>
        </div>

        <div class="rc-col"><label id="nc-cid-label">CID-10</label><input type="text" id="nc-cid" placeholder="ex: J06.9 — IVAS"></div>

        <div id="nc-anamnese-completa" class="rc-col rc-full">
          ${this.section('1. Queixa Principal (QP)')}
          ${this.field('ana-qp-motivo','Qual o motivo da consulta?',3)}
          ${this.field('ana-qp-inicio','Quando começou?',2)}

          ${this.section('2. História da Doença Atual (HDA)')}
          ${this.radio('Início','ana-hda-inicio',[['Súbito','Súbito'],['Gradual','Gradual']])}
          ${this.radio('Evolução','ana-hda-evolucao',[['Estável','Estável'],['Progressiva','Progressiva'],['Intermitente','Intermitente']])}
          ${this.field('ana-hda-sintomas','Sintomas associados?',3)}
          ${this.field('ana-hda-tratamentos','Tratamentos prévios e respostas?',3)}

          ${this.section('3. História Patológica Pregressa')}
          ${this.checksHtml('Doenças prévias','ana_hpp_checks',[
            ['hipertensao','Hipertensão'],['diabetes','Diabetes'],['dislipidemia','Dislipidemia'],['doencas_autoimunes','Doenças autoimunes']
          ])}
          ${this.field('ana-hpp-doencas-texto','Doenças prévias',3)}
          ${this.field('ana-hpp-cirurgias','Cirurgias (ex.: tireoidectômica, bariátrica)',2)}
          ${this.field('ana-hpp-hospitalizacoes','Hospitalizações',2)}
          ${this.field('ana-hpp-medicamentos-cronicos','Uso crônico de medicamentos (corticosteroides, hormônios, antidiabéticos etc.)',3)}

          ${this.section('4. História Familiar')}
          ${this.checksHtml('História familiar','ana_hf_checks',[
            ['diabetes_mellitus','Diabetes mellitus'],['hipotireoidismo_hipertireoidismo','Hipotireoidismo/Hipertireoidismo'],['obesidade','Obesidade'],['dislipidemia','Dislipidemia'],['doencas_autoimunes','Doenças autoimunes'],['cancer','Câncer (tireoide, adrenal, pâncreas)'],['osteoporose_fraturas','Osteoporose/fraturas']
          ])}
          ${this.field('ana-hf-outros','Outros',2)}

          ${this.section('5. História Social e Estilo de Vida')}
          ${this.field('ana-alimentacao','Alimentação',3)}
          ${this.field('ana-atividade-fisica','Atividade física',2)}
          ${this.radio('Tabagismo','ana-tabagismo-opcao',[['Não','Não'],['Sim','Sim']],"RegistrarConsulta.toggleDetalhesRadio('ana-tabagismo-opcao','Sim','ana-tabagismo-detalhe-box')")}
          <div class="rc-col rc-full" id="ana-tabagismo-detalhe-box" style="display:none;"><label>Detalhes do tabagismo</label><textarea id="ana-tabagismo-detalhe" rows="2" placeholder="Ex.: quantidade, tempo de uso, cessação, carga tabágica"></textarea></div>
          ${this.radio('Etilismo','ana-etilismo-opcao',[['Não','Não'],['Sim','Sim']],"RegistrarConsulta.toggleDetalhesRadio('ana-etilismo-opcao','Sim','ana-etilismo-detalhe-box')")}
          <div class="rc-col rc-full" id="ana-etilismo-detalhe-box" style="display:none;"><label>Detalhes do etilismo</label><textarea id="ana-etilismo-detalhe" rows="2" placeholder="Ex.: frequência, quantidade, tipo de bebida"></textarea></div>
          ${this.field('ana-sono','Sono (qualidade, apneia, ronco)',2)}
          ${this.field('ana-estresse','Estresse e saúde mental',2)}

          ${this.section('6. Revisão de Sistemas com foco endócrino')}
          ${this.checksHtml('🔵 Geral','ana_rs_geral',[
            ['astenia','Astenia'],['fadiga','Fadiga'],['ganho_perda_peso','Ganho/perda de peso'],['sudorese','Sudorese'],['febre','Febre']
          ])}
          ${this.checksHtml('🔵 Metabólico','ana_rs_metabolico',[
            ['poliuria','Poliúria'],['polidipsia','Polidipsia'],['polifagia','Polifagia'],['intolerancia_frio_calor','Intolerância ao frio/calor'],['alteracoes_apetite','Alterações no apetite'],['hipo_hiperglicemia','Hipo/hiperglicemia']
          ])}
          ${this.checksHtml('🔵 Tireoide','ana_rs_tireoide',[
            ['bocio','Bócio'],['dor_cervical','Dor cervical'],['taquicardia_palpitations','Taquicardia/palpitações'],['tremores','Tremores'],['alteracoes_humor','Alterações de humor'],['constipacao_diarreia','Constipação/diarreia'],['alteracoes_menstruais','Alterações menstruais']
          ])}
          ${this.checksHtml('🔵 Adrenal','ana_rs_adrenal',[
            ['hipotensao_postural','Hipotensão postural'],['hiperpigmentacao','Hiperpigmentação'],['fraqueza_muscular','Fraqueza muscular'],['perda_apetite','Perda de apetite'],['hirsutismo','Hirsutismo']
          ])}
          ${this.checksHtml('🔵 Hipófise','ana_rs_hipofise',[
            ['cefaleia','Cefaleia'],['alteracoes_visuais','Alterações visuais'],['galactorreia','Galactorreia'],['alteracoes_menstruais_libido','Alterações menstruais/libido'],['crescimento_excessivo','Crescimento excessivo']
          ])}
          ${this.checksHtml('🔵 Gônadas','ana_rs_gonadas',[
            ['disfuncao_eretil','Disfunção erétil'],['irregularidade_menstrual','Irregularidade menstrual'],['menopausa_precoce_tardia','Menopausa precoce/tardia'],['infertilidade','Infertilidade']
          ])}
          ${this.checksHtml('🔵 Paratireoide/Metabolismo Ósseo','ana_rs_paratireoide',[
            ['caibras','Cãibras'],['parestesias','Parestesias'],['fraturas','Fraturas'],['dor_ossea','Dor óssea'],['calculos_renais','Cálculos renais']
          ])}
          ${this.field('ana-revisao-obs','Observações da revisão de sistemas',3)}

          ${this.section('6.1 Exame Físico')}
          <div class="rc-col rc-full">
            <label>Exame físico</label>
            <textarea id="ana-exame-fisico" rows="7">BEG, lúcido, orientado, hidratado, corado, anictérico, acianótico, afebril
Sem alterações aparentes. Tireoide não palpável/aumentada (± nódulos). Sem linfonodomegalias.
RCR 2T, bulhas normofonéticas, sem sopros.
MV presente bilateralmente, sem ruídos adventícios.
Plano/globoso, flácido, indolor à palpação, sem visceromegalias.
Sem edema. Pulsos periféricos presentes e simétricos.
Sem lesões. Sem acantose nigricans / estrias violáceas / hirsutismo / acne (ou descrever se presente).
Sem déficits focais.</textarea>
          </div>

          ${this.section('7. Medicações em Uso')}
          ${this.renderMedicacoesUso()}
          ${this.field('ana-uso-correto','Uso correto/aderência',2)}
          ${this.field('ana-suplementos','Suplementos, fitoterápicos',2)}

          ${this.section('8. Alergias')}
          ${this.radio('Alergia medicamentosa','ana-alergia-medicamentosa-opcao',[['Sim','Sim'],['Não','Não']],"RegistrarConsulta.toggleDetalhesRadio('ana-alergia-medicamentosa-opcao','Sim','ana-alergia-medicamentosa-detalhe-box')")}
          <div class="rc-col rc-full" id="ana-alergia-medicamentosa-detalhe-box" style="display:none;"><label>Detalhes da alergia medicamentosa</label><textarea id="ana-alergia-medicamentosa-detalhe" rows="2" placeholder="Ex.: medicamento, reação, gravidade"></textarea></div>
          ${this.radio('Alergia alimentar','ana-alergia-alimentar-opcao',[['Sim','Sim'],['Não','Não']],"RegistrarConsulta.toggleDetalhesRadio('ana-alergia-alimentar-opcao','Sim','ana-alergia-alimentar-detalhe-box')")}
          <div class="rc-col rc-full" id="ana-alergia-alimentar-detalhe-box" style="display:none;"><label>Detalhes da alergia alimentar</label><textarea id="ana-alergia-alimentar-detalhe" rows="2" placeholder="Ex.: alimento, reação, gravidade"></textarea></div>

          ${this.section('9. Exames Anteriores')}
          ${this.field('ana-exames-lab-img','Laboratoriais e de imagem',3)}
          ${this.field('ana-avaliacao-exames','Avaliação de controle glicêmico, perfil lipídico, função tireoidiana, etc.',3)}

          ${this.section('10. Hipótese Diagnóstica')}
          ${this.field('ana-hipotese','Hipótese diagnóstica',5)}

          ${this.section('11. Conduta')}
          ${this.field('ana-conduta','Conduta',5)}
        </div>

        <div id="nc-procedimento-container" class="rc-col rc-full" style="display:none;">
          ${this.section('Registro procedural')}
          <div class="rc-proc-alert">Modo procedimento: registre o que foi realizado de forma rápida, sem precisar preencher uma consulta médica completa.</div>
          <div class="rc-col rc-full"><label id="nc-s-label">Procedimento realizado</label><textarea id="nc-s" rows="3" placeholder="Ex.: Curativo em MID, lavagem otológica, aplicação IM..."></textarea></div>
          <div class="rc-col rc-full"><label id="nc-o-label">Materiais utilizados</label><textarea id="nc-o" rows="3" placeholder="Ex.: gaze, soro fisiológico, luvas, medicação utilizada..."></textarea></div>
          <div class="rc-col rc-full"><label id="nc-a-label">Intercorrências</label><textarea id="nc-a" rows="2" placeholder="Ex.: sem intercorrências, dor local, sangramento discreto..."></textarea></div>
          <div class="rc-col rc-full"><label id="nc-p-label">Observações / evolução procedural</label><textarea id="nc-p" rows="3" placeholder="Ex.: Procedimento realizado sem intercorrências. Orientado retorno se necessário."></textarea></div>
        </div>

        <div class="rc-section">Documentos do atendimento</div>
        <div class="rc-col rc-full rc-docs-area">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="btn btn-green" onclick="RegistrarConsulta.captureForm();RegistrarConsulta.modalReceita()">💊 Receita</button>
            <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.captureForm();RegistrarConsulta.modalPedido()">🔬 Pedido de Exames</button>
            <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.captureForm();document.getElementById('nc-anexos-exames-input')?.click()">📎 Anexar exame</button>
            <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.captureForm();RegistrarConsulta.modalAtestado()">📄 Atestado</button>
            <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.captureForm();RegistrarConsulta.modalLaudo()">🧾 Laudo</button>
          </div>
          <div id="docs-novo-registro-lista" style="margin-top:10px;"></div>
          <input id="nc-anexos-exames-input" type="file" multiple accept=".pdf,image/*,.jpg,.jpeg,.png,.webp,.doc,.docx" style="display:none" onchange="RegistrarConsulta.saveAnexosConsulta(event)">
          <div id="nc-anexos-exames-lista" style="margin-top:10px;"></div>
        </div>
      </div>
    </div>`;
  },

  footer(){
    return `<button class="btn btn-ghost btn-registro-cancelar" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-blue btn-registro-manter" onclick="RegistrarConsulta.save(false)">💾 Salvar e manter na fila</button>
      <button class="btn btn-green btn-registro-finalizar" onclick="RegistrarConsulta.save(true)">✅ Salvar e finalizar</button>`;
  },

  refresh(){
    this.captureForm();
    document.querySelector('.modal-body').innerHTML=this.html();
    document.querySelector('.modal-footer').innerHTML=this.footer();
    setTimeout(()=>this.afterRender(),20);
  },

  renderCards(){
    const alvo=document.getElementById('docs-novo-registro-lista');
    if(!alvo) return;
    const docs=Documentos.temp||[];
    alvo.innerHTML = docs.length ? `<div class="grid" style="margin-top:10px;">${docs.map(d=>Documentos.card(d)).join('')}</div>` : '';
  },

  toggleDetalhesRadio(name,value,boxId){
    const selected=document.querySelector(`input[name="${name}"]:checked`)?.value || '';
    const box=document.getElementById(boxId);
    if(box) box.style.display = selected===value ? 'block':'none';
  },

  atualizarModoRegistroAtendimento(){
    const tipo=document.getElementById('nc-tipo')?.value || 'Consulta';
    const procedimento=String(tipo).toLowerCase()==='procedimento';
    const ana=document.getElementById('nc-anamnese-completa');
    const proc=document.getElementById('nc-procedimento-container');
    const cidLabel=document.getElementById('nc-cid-label');
    const cid=document.getElementById('nc-cid');
    if(ana) ana.style.display=procedimento?'none':'block';
    if(proc) proc.style.display=procedimento?'block':'none';
    if(cidLabel) cidLabel.textContent=procedimento?'CID-10 (opcional)':'CID-10';
    if(cid) cid.placeholder=procedimento?'Opcional':'ex: J06.9 — IVAS';
  },

  coletarMedicacoes(){
    return Array.from(document.querySelectorAll('#ana-medicacoes-lista .ana-med-row')).map(row=>({
      nome: row.querySelector('.ana-med-nome')?.value?.trim() || '',
      dose: row.querySelector('.ana-med-dose')?.value?.trim() || '',
      frequencia: row.querySelector('.ana-med-freq')?.value?.trim() || ''
    })).filter(m=>m.nome || m.dose || m.frequencia);
  },

  coletarAnamnese(){
    return {
      qp:{motivo:this.val('ana-qp-motivo'), inicio:this.val('ana-qp-inicio')},
      hda:{inicio:document.querySelector('input[name="ana-hda-inicio"]:checked')?.value||'', evolucao:document.querySelector('input[name="ana-hda-evolucao"]:checked')?.value||'', sintomas:this.val('ana-hda-sintomas'), tratamentos:this.val('ana-hda-tratamentos')},
      hpp:{selecionados:this.checks('ana_hpp_checks'), doencas:this.val('ana-hpp-doencas-texto'), cirurgias:this.val('ana-hpp-cirurgias'), hospitalizacoes:this.val('ana-hpp-hospitalizacoes'), medicamentosCronicos:this.val('ana-hpp-medicamentos-cronicos')},
      historiaFamiliar:{selecionados:this.checks('ana_hf_checks'), outros:this.val('ana-hf-outros')},
      social:{alimentacao:this.val('ana-alimentacao'), atividadeFisica:this.val('ana-atividade-fisica'), tabagismo:(document.querySelector('input[name="ana-tabagismo-opcao"]:checked')?.value||''), tabagismoDetalhe:this.val('ana-tabagismo-detalhe'), etilismo:(document.querySelector('input[name="ana-etilismo-opcao"]:checked')?.value||''), etilismoDetalhe:this.val('ana-etilismo-detalhe'), sono:this.val('ana-sono'), estresse:this.val('ana-estresse')},
      revisaoSistemas:{
        geral:this.checks('ana_rs_geral'), metabolico:this.checks('ana_rs_metabolico'), tireoide:this.checks('ana_rs_tireoide'), adrenal:this.checks('ana_rs_adrenal'), hipofise:this.checks('ana_rs_hipofise'), gonadas:this.checks('ana_rs_gonadas'), paratireoide:this.checks('ana_rs_paratireoide'), observacoes:this.val('ana-revisao-obs')
      },
      exameFisico:this.val('ana-exame-fisico'),
      medicacoes:{lista:this.coletarMedicacoes(), aderencia:this.val('ana-uso-correto'), suplementos:this.val('ana-suplementos')},
      alergias:{medicamentosa:(document.querySelector('input[name="ana-alergia-medicamentosa-opcao"]:checked')?.value||''), medicamentosas:this.val('ana-alergia-medicamentosa-detalhe'), alimentar:(document.querySelector('input[name="ana-alergia-alimentar-opcao"]:checked')?.value||''), alimentares:this.val('ana-alergia-alimentar-detalhe')},
      examesAnteriores:{laboratoriaisImagem:this.val('ana-exames-lab-img'), avaliacao:this.val('ana-avaliacao-exames')},
      hipoteseDiagnostica:this.val('ana-hipotese'),
      conduta:this.val('ana-conduta')
    };
  },

  montarResumoAnamnese(a){
    const partes=[];
    if(a.qp?.motivo) partes.push(`QP: ${a.qp.motivo}`);
    if(a.qp?.inicio) partes.push(`Início: ${a.qp.inicio}`);
    if(a.hda?.sintomas) partes.push(`Sintomas: ${a.hda.sintomas}`);
    return partes.join('\n');
  },

  montarResumoObjetivo(a){
    const rs=a.revisaoSistemas||{};
    const selecionados=[...(rs.geral||[]),...(rs.metabolico||[]),...(rs.tireoide||[]),...(rs.adrenal||[]),...(rs.hipofise||[]),...(rs.gonadas||[]),...(rs.paratireoide||[])];
    return [a.exameFisico||'', selecionados.length?`Revisão de sistemas: ${selecionados.join(', ')}`:'', rs.observacoes?`Obs revisão: ${rs.observacoes}`:''].filter(Boolean).join('\n');
  },

  modalReceita(d={}){
    this.captureForm();
    const meds=d.medicamentos||[];
    Modal.open(d.id?'Editar Receita':'Nova Receita',`
      <input type="hidden" id="doc-id" value="${d.id||''}">
      <label>Medicamentos</label>
      <textarea id="rec-meds" rows="7" placeholder="Um por linha: Nome | Fórmula | Quantidade | Via | Dose/Frequência | Duração | Orientação">${Utils.esc(meds.map(m=>[m.nome,m.formula,m.quantidade,m.via,m.posologia,m.duracao,m.orientacao].filter(x=>x!=null).join(' | ')).join('\n'))}</textarea>
      <label>Orientações gerais</label>
      <textarea id="rec-obs">${Utils.esc(d.obs||'')}</textarea>
    `,`<button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button><button class="btn btn-green" onclick="RegistrarConsulta.saveReceita()">Salvar Receita</button>`,'lg');
  },

  restoreMainModal(){
    Modal.open('🩺 Registrar Consulta',this.html(),this.footer(),'lg');
    setTimeout(()=>this.afterRender(),30);
  },

  saveReceita(){
    let id=document.getElementById('doc-id').value||Utils.id('TMP_REC');
    let meds=document.getElementById('rec-meds').value.split(/\n+/).map(l=>{
      let p=l.split('|').map(x=>x.trim());
      return {nome:p[0]||'',formula:p[1]||'',quantidade:p[2]||'',via:p[3]||'',posologia:p[4]||'',duracao:p[5]||'',orientacao:p[6]||''};
    }).filter(m=>m.nome);
    if(!meds.length)return Utils.toast('Informe ao menos um medicamento');
    Documentos.add('Receita',{id,medicamentos:meds,obs:document.getElementById('rec-obs').value});
    this.restoreMainModal();
  },

  modalAtestado(d={}){
    this.captureForm();
    Modal.open(d.id?'Editar Atestado':'Novo Atestado',`
      <input type="hidden" id="doc-id" value="${d.id||''}">
      <div class="grid grid-2">
        <div><label>Tipo</label><select id="at-tipo"><option>Atestado médico</option><option>Declaração de comparecimento</option></select></div>
        <div><label>Dias</label><input id="at-dias" value="${Utils.esc(d.dias||'')}"></div>
        <div><label>CID</label><input id="at-cid" value="${Utils.esc(d.cid||'')}"></div>
        <div><label>Horário</label><input id="at-hora" value="${Utils.esc(d.hora||'')}"></div>
        <div class="full"><label>Texto / Motivo</label><textarea id="at-texto">${Utils.esc(d.texto||d.motivo||'')}</textarea></div>
      </div>
    `,`<button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button><button class="btn btn-purple" onclick="RegistrarConsulta.saveAtestado()">Salvar Atestado</button>`);
    setTimeout(()=>{document.getElementById('at-tipo').value=d.tipo||'Atestado médico'},20);
  },

  saveAtestado(){
    let id=document.getElementById('doc-id').value||Utils.id('TMP_AT');
    Documentos.add('Atestado',{id,tipo:document.getElementById('at-tipo').value,dias:document.getElementById('at-dias').value,cid:document.getElementById('at-cid').value,hora:document.getElementById('at-hora').value,texto:document.getElementById('at-texto').value});
    this.restoreMainModal();
  },

  modalLaudo(d={}){
    this.captureForm();
    Modal.open(d.id?'Editar Laudo':'Novo Laudo',`
      <input type="hidden" id="doc-id" value="${d.id||''}">
      <label>Título</label><input id="ld-titulo" value="${Utils.esc(d.titulo||'Laudo médico')}">
      <label>CID</label><input id="ld-cid" value="${Utils.esc(d.cid||'')}">
      <label>Texto</label><textarea id="ld-texto" rows="8">${Utils.esc(d.texto||'')}</textarea>
    `,`<button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button><button class="btn btn-blue" onclick="RegistrarConsulta.saveLaudo()">Salvar Laudo</button>`,'lg');
  },

  saveLaudo(){
    let id=document.getElementById('doc-id').value||Utils.id('TMP_LD');
    Documentos.add('Laudo',{id,titulo:document.getElementById('ld-titulo').value,cid:document.getElementById('ld-cid').value,texto:document.getElementById('ld-texto').value});
    this.restoreMainModal();
  },

  modalPedido(d={}){
    this.captureForm();
    Modal.open(d.id?'Editar Pedido de Exames':'Novo Pedido de Exames',`
      <input type="hidden" id="doc-id" value="${d.id||''}">
      <label>Exames solicitados</label><textarea id="pe-exames" rows="7">${Utils.esc(d.exames||'')}</textarea>
      <label>Observações</label><textarea id="pe-obs">${Utils.esc(d.obs||'')}</textarea>
    `,`<button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button><button class="btn btn-blue" onclick="RegistrarConsulta.savePedido()">Salvar Pedido</button>`,'lg');
  },

  savePedido(){
    let id=document.getElementById('doc-id').value||Utils.id('TMP_PE');
    Documentos.add('Pedido de Exames',{id,exames:document.getElementById('pe-exames').value,obs:document.getElementById('pe-obs').value});
    this.restoreMainModal();
  },

  saveAnexosConsulta(ev){
    this.captureForm();
    const files=Array.from(ev.target.files||[]);
    if(!files.length) return;
    let pending=files.length;
    files.forEach(f=>{
      const done=(dataUrl='')=>{
        Documentos.add('Exame anexado',{id:Utils.id('TMP_EX'),nome:f.name,filename:f.name,obs:'',dataUrl,mime:f.type||''});
        pending--;
        if(pending<=0) this.restoreMainModal();
      };
      const r=new FileReader();
      r.onload=()=>done(r.result);
      r.onerror=()=>done('');
      r.readAsDataURL(f);
    });
  },

  save(finalizar=true){
    const tipo=document.getElementById('nc-tipo')?.value||'Consulta';
    const cid=this.val('nc-cid');
    const procedimento=String(tipo).toLowerCase()==='procedimento';

    let S='',O='',A='',P='',anamneseCompleta=null;

    if(procedimento){
      S=this.val('nc-s');
      O=this.val('nc-o');
      A=this.val('nc-a');
      P=this.val('nc-p');
      if(!S && !O && !A && !P){
        Utils.toast('Preencha ao menos um campo do registro procedural.');
        return;
      }
    }else{
      anamneseCompleta=this.coletarAnamnese();
      S=this.montarResumoAnamnese(anamneseCompleta);
      O=this.montarResumoObjetivo(anamneseCompleta);
      A=anamneseCompleta.hipoteseDiagnostica||'';
      P=anamneseCompleta.conduta||'';
      if(!S && !A && !P){
        Utils.toast('Preencha ao menos a queixa principal, hipótese diagnóstica ou conduta.');
        return;
      }
    }

    const histId=Utils.id('HIST');
    const p=this.pac;
    const prof = (window.ClinicaProfissionalDocumento && ClinicaProfissionalDocumento.resolve(item||doc||r||receita||atestado||laudo||pedido||exame||hist||{})) || {};
    const docs=Documentos.consolidate(p.id,this.consId,histId);

    const hist={
      id:histId,
      pacId:p.id,
      pacienteId:p.id,
      consultaId:this.consId,
      data:Utils.today(),
      hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:new Date().toISOString(),
      medico:prof.nome||'',
      tipo,
      tipoAtendimento:tipo,
      tipoConsulta:tipo,
      origem:procedimento?'procedimento':String(tipo||'consulta').toLowerCase(),
      status:finalizar?'Realizado':'Aguardando',
      cid,
      S,O,A,P,
      evolucao:S,
      conduta:P,
      obs:O,
      anamneseCompleta,
      registroCompleto:{tipo,S,O,A,P,cid,procedimento,anamneseCompleta},
      procedimentoRealizado:S,
      materiais:O,
      intercorrencias:A,
      evolucaoProcedural:P,
      documentos:docs,
      documentosAtendimento:docs
    };

    Store.upsert('HISTORICO',hist);

    if(window.Atendimento && finalizar) Atendimento.finalizar(p.id,histId);
    else if(window.Atendimento && !finalizar){
      const item=Atendimento.emAtendimento(p.id);
      if(item){
        item.status='Aguardando';
        item.horaFim='';
        item.finalizadoEm='';
        Store.upsert('ATENDIMENTOS',item);
      }
    }

    if(window.Security) Security.audit('salvou_atendimento',`Paciente ${p.nome} - ${tipo}`);

    this.formDraft=null;
    Modal.close();
    Prontuario.abrir(p.id,'historico');
    Utils.toast(finalizar?'✅ Atendimento registrado e finalizado!':'💾 Atendimento salvo e mantido na fila.');
  }
};




/* =========================================================
   ZERO V3.4 — Modais documentos no padrão original + 1 lista única
========================================================= */
(function(){
  if(!window.RegistrarConsulta) return;

  RegistrarConsulta.renderCards = function(){
    const alvo=document.getElementById('docs-novo-registro-lista');
    if(!alvo) return;
    const docs=Documentos.temp||[];
    alvo.innerHTML = docs.length ? Documentos.cards() : '';
  };

  RegistrarConsulta.medResumo = function(m){
    return [m.formula,m.quantidade,m.via,m.posologia,m.duracao,m.orientacao].filter(Boolean).join(' • ');
  };

  RegistrarConsulta.parseMedicamentos = function(){
    return Array.from(document.querySelectorAll('.rec-med-row')).map(row=>({
      nome:row.querySelector('.rec-med-nome')?.value?.trim()||'',
      formula:row.querySelector('.rec-med-formula')?.value?.trim()||'',
      quantidade:row.querySelector('.rec-med-qtd')?.value?.trim()||'',
      via:row.querySelector('.rec-med-via')?.value?.trim()||'',
      posologia:row.querySelector('.rec-med-posologia')?.value?.trim()||'',
      duracao:row.querySelector('.rec-med-duracao')?.value?.trim()||'',
      orientacao:row.querySelector('.rec-med-orientacao')?.value?.trim()||''
    })).filter(m=>m.nome);
  };

  RegistrarConsulta.addMedReceitaRow = function(m={}){
    const box=document.getElementById('rec-meds-lista-original');
    if(!box) return;
    const div=document.createElement('div');
    div.className='doc-med-item rec-med-row';
    div.innerHTML=`<div style="flex:1;">
      <div class="grid grid-2">
        <div><label>Medicamento</label><input class="rec-med-nome" value="${Utils.esc(m.nome||'')}" placeholder="Nome do medicamento"></div>
        <div><label>Fórmula / Apresentação</label><input class="rec-med-formula" value="${Utils.esc(m.formula||'')}" placeholder="Ex.: 500mg, gotas, comprimido"></div>
        <div><label>Quantidade</label><input class="rec-med-qtd" value="${Utils.esc(m.quantidade||'')}" placeholder="Ex.: 01 caixa"></div>
        <div><label>Via</label><input class="rec-med-via" value="${Utils.esc(m.via||'')}" placeholder="Oral, tópico, IM..."></div>
        <div><label>Dose/Frequência</label><input class="rec-med-posologia" value="${Utils.esc(m.posologia||m.freq||m.frequencia||'')}" placeholder="Ex.: 1 comp. 12/12h"></div>
        <div><label>Duração</label><input class="rec-med-duracao" value="${Utils.esc(m.duracao||'')}" placeholder="Ex.: 7 dias / uso contínuo"></div>
        <div class="full"><label>Orientação</label><input class="rec-med-orientacao" value="${Utils.esc(m.orientacao||'')}" placeholder="Orientação específica"></div>
      </div>
    </div>
    <div><button type="button" class="btn btn-sm btn-red" onclick="this.closest('.rec-med-row').remove()">×</button></div>`;
    box.appendChild(div);
  };

  RegistrarConsulta.modalReceita = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    const meds=d.medicamentos||[];
    Modal.open(d.id?'Editar Receita Médica':'Nova Receita Médica',`
      <div class="doc-original-banner doc-banner-green">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${d.id||''}">

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;">
        <label style="font-weight:800;color:#334155;margin:0;">Medicamentos:</label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="RegistrarConsulta.addMedReceitaRow()">+ Medicamento</button>
      </div>

      <div id="rec-meds-lista-original" class="doc-med-list"></div>

      <div class="f-col f-full">
        <label>Observações / Orientações ao paciente</label>
        <textarea id="rec-obs" rows="3" placeholder="Ex: Tomar com alimento. Evitar sol...">${Utils.esc(d.obs||d.orientacao||'')}</textarea>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.saveReceita(true,'receita')">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>
      <button class="btn btn-green" onclick="RegistrarConsulta.saveReceita(false,'')">💾 Salvar Receita</button>
    `,'lg');
    setTimeout(()=>{
      if(meds.length) meds.forEach(m=>RegistrarConsulta.addMedReceitaRow(m));
      else RegistrarConsulta.addMedReceitaRow();
    },30);
  };

  RegistrarConsulta.saveReceita = function(imprimir=false,tipoPrint=''){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_REC');
    const meds=this.parseMedicamentos();
    if(!meds.length) return Utils.toast('Informe ao menos um medicamento.');
    const doc={id,medicamentos:meds,obs:document.getElementById('rec-obs')?.value||''};
    Documentos.add('Receita',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Receita'}),180);
    this.restoreMainModal();
  };

  RegistrarConsulta.modalAtestado = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    Modal.open(d.id?'Editar Atestado':'Novo Atestado Médico',`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${d.id||''}">
      <div class="form-grid">
        <div class="f-col">
          <label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipo()">
            <option>Atestado médico</option>
            <option>Declaração de comparecimento</option>
          </select>
        </div>
        <div class="f-col at-campo-afastamento"><label>Dias de afastamento</label><input id="at-dias" type="number" value="${Utils.esc(d.dias||'')}" placeholder="Ex.: 3"></div>
        <div class="f-col at-campo-afastamento"><label>CID-10</label><input id="at-cid" value="${Utils.esc(d.cid||'')}" placeholder="Opcional"></div>
        <div class="f-col at-campo-comparecimento"><label>Hora de chegada</label><input id="at-hora-chegada" type="time" value="${Utils.esc(d.horaChegada||'')}"></div>
        <div class="f-col at-campo-comparecimento"><label>Hora de saída</label><input id="at-hora-saida" type="time" value="${Utils.esc(d.horaSaida||d.hora||'')}"></div>
        <div class="f-col f-full"><label>Motivo / Texto</label><textarea id="at-motivo" rows="4" placeholder="Texto do atestado ou motivo...">${Utils.esc(d.motivo||d.texto||'')}</textarea></div>
        <div class="f-col f-full"><label>Observações</label><textarea id="at-obs" rows="3">${Utils.esc(d.obs||'')}</textarea></div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.saveAtestado(true)">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-purple" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar Atestado</button>
    `,'lg');
    setTimeout(()=>{
      document.getElementById('at-tipo').value=d.tipo||'Atestado médico';
      RegistrarConsulta.toggleAtestadoTipo();
    },30);
  };

  RegistrarConsulta.toggleAtestadoTipo = function(){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    const comp=tipo.toLowerCase().includes('comparecimento');
    document.querySelectorAll('.at-campo-afastamento').forEach(e=>e.style.display=comp?'none':'block');
    document.querySelectorAll('.at-campo-comparecimento').forEach(e=>e.style.display=comp?'block':'none');
  };

  RegistrarConsulta.saveAtestado = function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_AT');
    const doc={
      id,
      tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
      dias:document.getElementById('at-dias')?.value||'',
      cid:document.getElementById('at-cid')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:document.getElementById('at-motivo')?.value||'',
      texto:document.getElementById('at-motivo')?.value||'',
      obs:document.getElementById('at-obs')?.value||''
    };
    Documentos.add('Atestado',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),180);
    this.restoreMainModal();
  };

  RegistrarConsulta.modalPedido = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    Modal.open(d.id?'Editar Pedido de Exames':'Novo Pedido de Exames',`
      <div class="doc-original-banner doc-banner-blue">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${d.id||''}">
      <div class="form-grid">
        <div class="f-col f-full">
          <label>Exames solicitados</label>
          <textarea id="pe-exames" rows="8" placeholder="Digite um exame por linha...">${Utils.esc(d.exames||'')}</textarea>
        </div>
        <div class="f-col f-full">
          <label>Observações</label>
          <textarea id="pe-obs" rows="3" placeholder="Orientações, preparo, justificativa...">${Utils.esc(d.obs||'')}</textarea>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.savePedido(true)">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-blue" onclick="RegistrarConsulta.savePedido(false)">💾 Salvar Pedido</button>
    `,'lg');
  };

  RegistrarConsulta.savePedido = function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_PE');
    const doc={id,exames:document.getElementById('pe-exames')?.value||'',obs:document.getElementById('pe-obs')?.value||''};
    if(!doc.exames.trim()) return Utils.toast('Informe os exames solicitados.');
    Documentos.add('Pedido de Exames',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),180);
    this.restoreMainModal();
  };

  RegistrarConsulta.modalLaudo = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    Modal.open(d.id?'Editar Laudo Médico':'Novo Laudo Médico',`
      <div class="doc-original-banner doc-banner-cyan">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${d.id||''}">
      <div class="form-grid">
        <div class="f-col f-full"><label>Título do laudo</label><input id="ld-titulo" value="${Utils.esc(d.titulo||'')}"></div>
        <div class="f-col f-full"><label>CID-10</label><input id="ld-cid" placeholder="CID" value="${Utils.esc(d.cid||'')}"></div>
        <div class="f-col f-full"><label>Laudo</label><textarea id="ld-texto" rows="10" placeholder="Digite o conteúdo do laudo...">${Utils.esc(d.texto||d.descricao||d.conclusao||'')}</textarea></div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.saveLaudo(true)">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-blue" onclick="RegistrarConsulta.saveLaudo(false)">💾 Salvar Laudo</button>
    `,'lg');
  };

  RegistrarConsulta.saveLaudo = function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_LD');
    const texto=document.getElementById('ld-texto')?.value||'';
    if(!texto.trim()) return Utils.toast('Informe o texto do laudo.');
    const doc={
      id,
      titulo:document.getElementById('ld-titulo')?.value||'Laudo médico',
      cid:document.getElementById('ld-cid')?.value||'',
      texto,
      finalidade:'',
      descricao:texto,
      conclusao:texto,
      conduta:''
    };
    Documentos.add('Laudo',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Laudo'}),180);
    this.restoreMainModal();
  };
})();




/* =========================================================
   ZERO V3.5 — Receita igual ao fluxo original
   - + Medicamento abre modal separado
   - X/Cancelar da receita volta para Registrar Consulta
   - Não fecha o modal principal
========================================================= */
(function(){
  if(!window.RegistrarConsulta) return;

  RegistrarConsulta.receitaMeds = [];
  RegistrarConsulta.receitaContext = null;

  RegistrarConsulta.docCloseToRegistro = function(){
    RegistrarConsulta.restoreMainModal();
  };

  RegistrarConsulta.medicamentoResumoOriginal = function(m){
    const partes = [];
    if(m.formula) partes.push(m.formula);
    if(m.quantidade) partes.push('Qtd: '+m.quantidade);
    if(m.via) partes.push('Via: '+m.via);
    if(m.dose) partes.push(m.dose);
    if(m.periodicidadeTexto) partes.push(m.periodicidadeTexto);
    if(m.duracao) partes.push(m.duracao);
    if(m.usoContinuo) partes.push('USO CONTÍNUO');
    if(m.orientacao) partes.push(m.orientacao);
    return partes.filter(Boolean).join(' • ');
  };

  RegistrarConsulta.renderListaMedsReceitaOriginal = function(){
    const box=document.getElementById('rec-meds-lista-original');
    if(!box) return;

    const meds=this.receitaMeds||[];
    if(!meds.length){
      box.innerHTML='<div class="receita-original-empty">Nenhum medicamento adicionado. Clique em + Medicamento.</div>';
      return;
    }

    box.innerHTML = meds.map((m,i)=>`<div class="receita-original-med">
      <div style="min-width:0;">
        <div class="receita-original-med-title">${i+1}. ${Utils.esc(m.nome||'Medicamento')}</div>
        <div class="receita-original-med-sub">${Utils.esc(this.medicamentoResumoOriginal(m))}</div>
      </div>
      <div class="doc-actions">
        <button type="button" class="btn btn-sm btn-outline" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal(${i})">✏️ Editar</button>
        <button type="button" class="btn btn-sm btn-red" onclick="RegistrarConsulta.removerMedicamentoReceitaOriginal(${i})">🗑️ Remover</button>
      </div>
    </div>`).join('');
  };

  RegistrarConsulta.removerMedicamentoReceitaOriginal = function(index){
    this.receitaMeds.splice(index,1);
    this.renderListaMedsReceitaOriginal();
  };

  RegistrarConsulta.modalReceita = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    this.receitaContext = {id:d.id||'', obs:d.obs||d.orientacao||''};
    this.receitaMeds = Array.isArray(d.medicamentos) ? JSON.parse(JSON.stringify(d.medicamentos)) : [];

    Modal.open(d.id?'Editar Receita Médica':'Nova Receita Médica',`
      <div class="modal-title" style="display:none"></div>
      <div class="doc-original-banner doc-banner-green">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${Utils.esc(d.id||'')}">

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;">
        <label style="font-weight:800;color:#334155;margin:0;">Medicamentos:</label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal()">+ Medicamento</button>
      </div>

      <div id="rec-meds-lista-original" class="receita-original-lista"></div>

      <div class="f-col f-full">
        <label>Observações / Orientações ao paciente</label>
        <textarea id="rec-obs" rows="3" placeholder="Ex: Tomar com alimento. Evitar sol...">${Utils.esc(d.obs||d.orientacao||'')}</textarea>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.docCloseToRegistro()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.saveReceita(true,'receita')">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>
      <button class="btn btn-green" onclick="RegistrarConsulta.saveReceita(false,'')">💾 Salvar Receita</button>
    `,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title){
        title.innerHTML=`💊 ${d.id?'Editar':'Nova'} Receita Médica <button class="modal-x" onclick="RegistrarConsulta.docCloseToRegistro()">×</button>`;
        title.style.display='';
      }
      RegistrarConsulta.renderListaMedsReceitaOriginal();
    },30);
  };

  RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal = function(index=null){
    const editando = index !== null && index !== undefined;
    const m = editando ? (this.receitaMeds[index]||{}) : {};
    const periodicidades = ['A cada 8h','A cada 6h','A cada 12h','1x ao dia','2x ao dia','3x ao dia','4x ao dia','Uso contínuo','Se necessário','Personalizado'];
    const selecionadas = Array.isArray(m.periodicidades) ? m.periodicidades : (m.periodicidadeTexto ? [m.periodicidadeTexto] : []);

    Modal.open(editando?'Editar Medicamento':'Adicionar Medicamento',`
      <div class="doc-original-banner doc-banner-green">
        Informe os dados do medicamento da receita.
      </div>

      <input type="hidden" id="med-edit-index" value="${editando?index:''}">
      <div class="med-form-grid">
        <div class="full">
          <label>Medicamento</label>
          <input id="med-nome" value="${Utils.esc(m.nome||'')}" placeholder="Nome do medicamento">
        </div>
        <div>
          <label>Fórmula / Apresentação</label>
          <input id="med-formula" value="${Utils.esc(m.formula||'')}" placeholder="Ex.: 500mg, comprimido, gotas">
        </div>
        <div>
          <label>Quantidade</label>
          <input id="med-quantidade" value="${Utils.esc(m.quantidade||'')}" placeholder="Ex.: 01 caixa">
        </div>
        <div>
          <label>Via</label>
          <input id="med-via" value="${Utils.esc(m.via||'')}" placeholder="Oral, tópico, IM...">
        </div>
        <div>
          <label>Dose</label>
          <input id="med-dose" value="${Utils.esc(m.dose||'')}" placeholder="Ex.: 1 comprimido">
        </div>

        <div class="full">
          <label>Periodicidade</label>
          <div class="med-period-grid">
            ${periodicidades.map(op=>`<label class="med-period-option">
              <input type="checkbox" name="med-periodicidade" value="${Utils.esc(op)}" ${selecionadas.includes(op)||String(m.periodicidadeTexto||'').includes(op)?'checked':''} onchange="RegistrarConsulta.toggleMedPersonalizado()">
              ${Utils.esc(op)}
            </label>`).join('')}
          </div>
        </div>

        <div class="full" id="med-personalizado-box" style="display:none">
          <label>Descrever periodicidade personalizada</label>
          <input id="med-periodicidade-personalizada" value="${Utils.esc(m.periodicidadePersonalizada||'')}" placeholder="Ex.: ao deitar, antes das refeições, dias alternados">
        </div>

        <div>
          <label>Duração</label>
          <input id="med-duracao" value="${Utils.esc(m.duracao||'')}" placeholder="Ex.: 7 dias / uso contínuo">
        </div>
        <div>
          <label>Uso contínuo</label>
          <select id="med-uso-continuo">
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </select>
        </div>
        <div class="full">
          <label>Orientação</label>
          <textarea id="med-orientacao" rows="3" placeholder="Orientações específicas">${Utils.esc(m.orientacao||'')}</textarea>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.modalReceita({id:RegistrarConsulta.receitaContext?.id||'', medicamentos:RegistrarConsulta.receitaMeds, obs:RegistrarConsulta.receitaContext?.obs||document.getElementById('rec-obs')?.value||''})">Cancelar</button>
      <button class="btn btn-green" onclick="RegistrarConsulta.aplicarMedicamentoReceitaOriginal()">Aplicar</button>
    `,'lg');

    setTimeout(()=>{
      const sel=document.getElementById('med-uso-continuo');
      if(sel) sel.value=String(!!m.usoContinuo);
      RegistrarConsulta.toggleMedPersonalizado();
    },30);
  };

  RegistrarConsulta.toggleMedPersonalizado = function(){
    const marcado = Array.from(document.querySelectorAll('input[name="med-periodicidade"]:checked')).some(x=>x.value==='Personalizado');
    const box=document.getElementById('med-personalizado-box');
    if(box) box.style.display=marcado?'block':'none';
  };

  RegistrarConsulta.aplicarMedicamentoReceitaOriginal = function(){
    const indexRaw=document.getElementById('med-edit-index')?.value;
    const periodicidades=Array.from(document.querySelectorAll('input[name="med-periodicidade"]:checked')).map(x=>x.value);
    const personalizada=document.getElementById('med-periodicidade-personalizada')?.value?.trim()||'';
    const periodicidadeTexto=periodicidades.map(v=>v==='Personalizado' && personalizada ? 'Personalizado: '+personalizada : v).join(' + ');

    const med={
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value?.trim()||'',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      periodicidades,
      periodicidadePersonalizada:personalizada,
      periodicidadeTexto,
      posologia:[document.getElementById('med-dose')?.value?.trim()||'', periodicidadeTexto].filter(Boolean).join(' - '),
      duracao:document.getElementById('med-duracao')?.value?.trim()||'',
      usoContinuo:document.getElementById('med-uso-continuo')?.value==='true' || String(document.getElementById('med-duracao')?.value||'').toLowerCase().includes('contínuo') || String(document.getElementById('med-duracao')?.value||'').toLowerCase().includes('continuo'),
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };

    if(!med.nome){
      Utils.toast('Informe o medicamento.');
      return;
    }

    if(indexRaw!=='' && indexRaw!=null) this.receitaMeds[Number(indexRaw)]=med;
    else this.receitaMeds.push(med);

    this.modalReceita({id:this.receitaContext?.id||'', medicamentos:this.receitaMeds, obs:this.receitaContext?.obs||''});
  };

  RegistrarConsulta.saveReceita = function(imprimir=false,tipoPrint=''){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_REC');
    const obs=document.getElementById('rec-obs')?.value||'';

    if(!this.receitaMeds.length){
      Utils.toast('Adicione ao menos um medicamento.');
      return;
    }

    const doc={
      id,
      medicamentos:JSON.parse(JSON.stringify(this.receitaMeds)),
      obs,
      orientacao:obs
    };

    Documentos.add('Receita',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Receita'}),180);
    this.receitaMeds=[];
    this.receitaContext=null;
    this.restoreMainModal();
  };
})();




/* =========================================================
   ZERO V3.6 — Receita/Pedido/Atestado no padrão original
   - Remove Turno da receita
   - Pedido de exames igual ao print original
   - Atestado com textos/campos iguais ao original
   - X dos submodais retorna para Registrar Consulta ou Receita
========================================================= */
(function(){
  if(!window.RegistrarConsulta) return;

  RegistrarConsulta.periodicidadeTemp = 'A cada 8h';

  RegistrarConsulta.voltarParaReceita = function(){
    this.modalReceita({
      id:this.receitaContext?.id||'',
      medicamentos:this.receitaMeds||[],
      obs:this.receitaContext?.obs||''
    });
  };

  RegistrarConsulta.modalReceita = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    this.receitaContext = {id:d.id||'', obs:d.obs||d.orientacao||''};
    this.receitaMeds = Array.isArray(d.medicamentos) ? JSON.parse(JSON.stringify(d.medicamentos)) : [];

    Modal.open(d.id?'Editar Receita Médica':'Nova Receita Médica',`
      <div class="modal-title" style="display:none"></div>
      <div class="doc-original-banner doc-banner-green">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${Utils.esc(d.id||'')}">

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;">
        <label style="font-weight:800;color:#334155;margin:0;">Medicamentos:</label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal()">+ Medicamento</button>
      </div>

      <div id="rec-meds-lista-original" class="receita-original-lista"></div>

      <div class="f-col f-full doc-modal-original">
        <label>Observações / Orientações ao paciente</label>
        <textarea id="rec-obs" rows="3" placeholder="Ex: Tomar com alimento. Evitar sol...">${Utils.esc(d.obs||d.orientacao||'')}</textarea>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.docCloseToRegistro()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.saveReceita(true,'receita')">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>
      <button class="btn btn-green" onclick="RegistrarConsulta.saveReceita(false,'')">💾 Salvar Receita</button>
    `,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title){
        title.innerHTML=`💊 ${d.id?'Editar':'Nova'} Receita Médica <button class="modal-x" onclick="RegistrarConsulta.docCloseToRegistro()">×</button>`;
        title.style.display='';
      }
      RegistrarConsulta.renderListaMedsReceitaOriginal();
    },30);
  };

  RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal = function(index=null){
    const editando = index !== null && index !== undefined;
    const m = editando ? (this.receitaMeds[index]||{}) : {};
    this.periodicidadeTemp = m.periodicidadeTexto || 'A cada 8h';

    Modal.open(editando?'Editar medicamento':'Adicionar medicamento',`
      <div class="modal-title" style="display:none"></div>
      <div class="doc-modal-original">
        <input type="hidden" id="med-edit-index" value="${editando?index:''}">

        <div class="f-col f-full">
          <label>Princípio ativo / medicamento *</label>
          <input id="med-nome" value="${Utils.esc(m.nome||'')}" placeholder="Digite o medicamento">
        </div>

        <div class="form-grid">
          <div class="f-col">
            <label>Concentração</label>
            <input id="med-formula" value="${Utils.esc(m.formula||'')}" placeholder="Ex.: 500 mg">
          </div>
          <div class="f-col">
            <label>Forma farmacêutica</label>
            <input id="med-forma" value="${Utils.esc(m.formaFarmaceutica||m.apresentacao||'')}" placeholder="Ex.: Comprimido">
          </div>

          <div class="f-col">
            <label>Via de administração *</label>
            <select id="med-via">
              <option>Oral</option>
              <option>Sublingual</option>
              <option>Tópica</option>
              <option>Intramuscular</option>
              <option>Subcutânea</option>
              <option>Endovenosa</option>
              <option>Inalatória</option>
              <option>Oftálmica</option>
              <option>Otológica</option>
              <option>Nasal</option>
              <option>Retal</option>
              <option>Vaginal</option>
            </select>
          </div>
          <div class="f-col">
            <label>Quantidade da dose</label>
            <input id="med-dose" value="${Utils.esc(m.dose||'')}" placeholder="Ex.: 1 comprimido">
          </div>

          <div class="f-col f-full">
            <label>Periodicidade <small style="color:#64748b;">(pode selecionar mais de uma opção)</small></label>
            <div class="med-period-line">
              <div id="med-periodicidade-resumo" class="med-period-current">${Utils.esc(this.periodicidadeTemp||'A cada 8h')}</div>
              <button type="button" class="med-select-btn" onclick="RegistrarConsulta.abrirModalPeriodicidadeMedicamento()">Selecionar</button>
            </div>
          </div>

          <div class="f-col">
            <label>Duração</label>
            <input id="med-duracao" value="${Utils.esc(m.duracao||'')}" placeholder="Ex.: 5 dias ou uso contínuo">
          </div>
          <div class="f-col">
            <label>Quantidade solicitada</label>
            <input id="med-quantidade" value="${Utils.esc(m.quantidade||'')}" placeholder="Ex.: 1 caixa">
          </div>

          <div class="f-col f-full">
            <label>Recomendações</label>
            <textarea id="med-orientacao" rows="4" placeholder="Ex.: tomar após alimentação">${Utils.esc(m.orientacao||'')}</textarea>
          </div>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.voltarParaReceita()">Cancelar</button>
      <button class="btn btn-green" onclick="RegistrarConsulta.aplicarMedicamentoReceitaOriginal()">Aplicar</button>
    `,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title){
        title.innerHTML=`${editando?'Editar':'Adicionar'} medicamento <button class="modal-x" onclick="RegistrarConsulta.voltarParaReceita()">×</button>`;
        title.style.display='';
      }
      const via=document.getElementById('med-via');
      if(via) via.value=m.via||'Oral';
    },30);
  };

  RegistrarConsulta.abrirModalPeriodicidadeMedicamento = function(){
    const opcoes=['A cada 8h','A cada 6h','A cada 12h','1x ao dia','2x ao dia','3x ao dia','4x ao dia','Uso contínuo','Se necessário','Personalizado'];
    const atual=String(this.periodicidadeTemp||'A cada 8h');
    const selecionadas=atual.split('+').map(x=>x.trim()).filter(Boolean);

    Modal.open('Selecionar periodicidade',`
      <div class="period-modal-grid">
        ${opcoes.map(op=>`<label class="period-modal-opt">
          <input type="checkbox" name="period-med-opt" value="${Utils.esc(op)}" ${selecionadas.some(s=>s.includes(op))?'checked':''} onchange="RegistrarConsulta.togglePeriodicidadePersonalizada()">
          ${Utils.esc(op)}
        </label>`).join('')}
      </div>
      <div id="period-personalizado-box" style="display:none;margin-top:12px;">
        <label>Descrever periodicidade personalizada</label>
        <input id="period-personalizado-texto" value="${Utils.esc(atual.includes('Personalizado:')?atual.split('Personalizado:').pop().trim():'')}" placeholder="Ex.: ao deitar, dias alternados">
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal(document.getElementById('med-edit-index')?.value!==''?Number(document.getElementById('med-edit-index')?.value):null)">Cancelar</button>
      <button class="btn btn-green" onclick="RegistrarConsulta.aplicarPeriodicidadeMedicamento()">Aplicar</button>
    `,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title) title.innerHTML=`Selecionar periodicidade <button class="modal-x" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal(document.getElementById('med-edit-index')?.value!==''?Number(document.getElementById('med-edit-index')?.value):null)">×</button>`;
      RegistrarConsulta.togglePeriodicidadePersonalizada();
    },30);
  };

  RegistrarConsulta.togglePeriodicidadePersonalizada = function(){
    const marcado=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).some(x=>x.value==='Personalizado');
    const box=document.getElementById('period-personalizado-box');
    if(box) box.style.display=marcado?'block':'none';
  };

  RegistrarConsulta.aplicarPeriodicidadeMedicamento = function(){
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
    const personalizado=document.getElementById('period-personalizado-texto')?.value?.trim()||'';
    const texto=opts.map(v=>v==='Personalizado'&&personalizado?'Personalizado: '+personalizado:v).join(' + ') || 'A cada 8h';
    this.periodicidadeTemp=texto;
    const idx=document.getElementById('med-edit-index')?.value;
    this.modalAdicionarMedicamentoReceitaOriginal(idx!==''?Number(idx):null);
    setTimeout(()=>{
      const el=document.getElementById('med-periodicidade-resumo');
      if(el) el.textContent=texto;
    },40);
  };

  RegistrarConsulta.aplicarMedicamentoReceitaOriginal = function(){
    const indexRaw=document.getElementById('med-edit-index')?.value;
    const duracao=document.getElementById('med-duracao')?.value?.trim()||'';
    const med={
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      periodicidadeTexto:this.periodicidadeTemp||'A cada 8h',
      posologia:[document.getElementById('med-dose')?.value?.trim()||'', this.periodicidadeTemp||'A cada 8h'].filter(Boolean).join(' - '),
      duracao,
      usoContinuo:String(duracao).toLowerCase().includes('contínuo') || String(duracao).toLowerCase().includes('continuo') || String(this.periodicidadeTemp||'').toLowerCase().includes('uso contínuo') || String(this.periodicidadeTemp||'').toLowerCase().includes('uso continuo'),
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };

    if(!med.nome){
      Utils.toast('Informe o medicamento.');
      return;
    }

    if(indexRaw!=='' && indexRaw!=null) this.receitaMeds[Number(indexRaw)]=med;
    else this.receitaMeds.push(med);

    this.voltarParaReceita();
  };

  RegistrarConsulta.medicamentoResumoOriginal = function(m){
    const partes = [];
    if(m.concentracao||m.formula) partes.push(m.concentracao||m.formula);
    if(m.formaFarmaceutica||m.apresentacao) partes.push(m.formaFarmaceutica||m.apresentacao);
    if(m.via) partes.push('Via: '+m.via);
    if(m.dose) partes.push(m.dose);
    if(m.periodicidadeTexto) partes.push(m.periodicidadeTexto);
    if(m.duracao) partes.push(m.duracao);
    if(m.quantidade) partes.push('Qtd: '+m.quantidade);
    if(m.usoContinuo) partes.push('USO CONTÍNUO');
    if(m.orientacao) partes.push(m.orientacao);
    return partes.filter(Boolean).join(' • ');
  };

  RegistrarConsulta.modalPedido = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    Modal.open(d.id?'Editar Solicitação de exames':'Solicitação de exames',`
      <div class="modal-title" style="display:none"></div>
      <div class="doc-modal-original">
        <input type="hidden" id="doc-id" value="${d.id||''}">
        <div class="f-col f-full">
          <label>Paciente</label>
          <input id="pe-paciente" value="${Utils.esc(p.nome||'')}" disabled>
        </div>
        <div class="f-col f-full">
          <label>Exames solicitados</label>
          <textarea id="pe-exames" rows="6" placeholder="Ex: Hemograma completo&#10;Glicemia de jejum&#10;Hemoglobina glicada&#10;TSH e T4 livre">${Utils.esc(d.exames||'')}</textarea>
        </div>
        <div class="f-col f-full">
          <label>Hipótese diagnóstica / Observação</label>
          <textarea id="pe-obs" rows="4" placeholder="Ex: investigação metabólica, controle de diabetes, avaliação tireoidiana...">${Utils.esc(d.obs||'')}</textarea>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.docCloseToRegistro()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.savePedido(true)">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-blue" onclick="RegistrarConsulta.savePedido(false)">💾 Salvar pedido</button>
    `,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title){
        title.innerHTML=`🧪 ${d.id?'Editar':'Solicitação de'} exames <button class="modal-x" onclick="RegistrarConsulta.docCloseToRegistro()">×</button>`;
        title.style.display='';
      }
    },30);
  };

  RegistrarConsulta.savePedido = function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_PE');
    const doc={id,exames:document.getElementById('pe-exames')?.value||'',obs:document.getElementById('pe-obs')?.value||'',hipotese:document.getElementById('pe-obs')?.value||''};
    if(!doc.exames.trim()) return Utils.toast('Informe os exames solicitados.');
    Documentos.add('Pedido de Exames',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),180);
    this.restoreMainModal();
  };

  RegistrarConsulta.modalAtestado = function(d={}){
    this.captureForm();
    const p=this.pac||{};
    Modal.open(d.id?'Editar documento médico':'Novo documento médico',`
      <div class="modal-title" style="display:none"></div>
      <div class="doc-modal-original">
        <input type="hidden" id="doc-id" value="${d.id||''}">
        <div class="form-grid">
          <div class="f-col f-full">
            <label>Paciente</label>
            <input type="text" value="${Utils.esc(p.nome||'')}" disabled>
          </div>

          <div class="f-col f-full">
            <label>Tipo do documento</label>
            <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipo()">
              <option value="Atestado médico">Atestado médico</option>
              <option value="Atestado de comparecimento">Atestado de comparecimento</option>
              <option value="Declaração de comparecimento">Declaração de comparecimento</option>
              <option value="Declaração de consulta médica">Declaração de consulta médica</option>
            </select>
          </div>

          <div id="at-comparecimento-wrap" class="form-grid f-full" style="display:none;margin:0;">
            <div class="f-col">
              <label>Horário de chegada</label>
              <input type="time" id="at-hora-chegada" value="${Utils.esc(d.horaChegada||'')}">
            </div>

            <div class="f-col">
              <label>Horário de saída</label>
              <input type="time" id="at-hora-saida" value="${Utils.esc(d.horaSaida||d.hora||'')}">
            </div>

            <div class="f-col">
              <label>Período</label>
              <select id="at-periodo">
                <option value="">Usar horário de chegada e saída</option>
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="noturno">Noturno</option>
                <option value="integral">Integral</option>
              </select>
            </div>
          </div>

          <div class="f-col" id="at-dias-wrap">
            <label>Dias de afastamento</label>
            <input type="number" min="0" id="at-dias" value="${Utils.esc(d.dias||0)}">
          </div>

          <div class="f-col" id="at-cid-wrap">
            <label>CID-10</label>
            <input type="text" id="at-cid" placeholder="ex: J06.9" value="${Utils.esc(d.cid||'')}">
          </div>

          <div class="f-col f-full">
            <label>Motivo / Observação</label>
            <input type="text" id="at-motivo" placeholder="ex: consulta médica, comparecimento, diagnóstico..." value="${Utils.esc(d.motivo||d.texto||'')}">
          </div>

          <div class="f-col f-full">
            <label>Observações adicionais</label>
            <textarea id="at-obs" rows="3">${Utils.esc(d.obs||'')}</textarea>
          </div>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.docCloseToRegistro()">Cancelar</button>
      <button class="btn btn-purple" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
    `,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title){
        title.innerHTML=`📝 ${d.id?'Editar':'Novo'} documento médico <button class="modal-x" onclick="RegistrarConsulta.docCloseToRegistro()">×</button>`;
        title.style.display='';
      }
      const tipo=document.getElementById('at-tipo');
      if(tipo) tipo.value=d.tipo||'Atestado médico';
      const periodo=document.getElementById('at-periodo');
      if(periodo) periodo.value=d.periodo||'';
      RegistrarConsulta.toggleAtestadoTipo();
    },30);
  };

  RegistrarConsulta.toggleAtestadoTipo = function(){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    const comp=tipo.toLowerCase().includes('comparecimento') || tipo.toLowerCase().includes('declaração');
    const wrap=document.getElementById('at-comparecimento-wrap');
    const dias=document.getElementById('at-dias-wrap');
    const cid=document.getElementById('at-cid-wrap');
    if(wrap) wrap.style.display=comp?'grid':'none';
    if(dias) dias.style.display=comp?'none':'block';
    if(cid) cid.style.display=comp?'none':'block';
  };

  RegistrarConsulta.saveAtestado = function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_AT');
    const doc={
      id,
      tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
      dias:document.getElementById('at-dias')?.value||0,
      cid:document.getElementById('at-cid')?.value||'',
      motivo:document.getElementById('at-motivo')?.value||'',
      texto:document.getElementById('at-motivo')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      periodo:document.getElementById('at-periodo')?.value||'',
      obs:document.getElementById('at-obs')?.value||''
    };
    Documentos.add('Atestado',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),180);
    this.restoreMainModal();
  };
})();




/* =========================================================
   ZERO V3.7 — X do Novo Laudo não fecha Registrar Atendimento
========================================================= */
(function(){
  if(!window.RegistrarConsulta) return;

  RegistrarConsulta.modalLaudo = function(d={}){
    this.captureForm();
    const p=this.pac||{};

    Modal.open(d.id?'Editar Laudo Médico':'Novo Laudo Médico',`
      <div class="modal-title" style="display:none"></div>
      <div class="doc-original-banner doc-banner-cyan">
        Paciente: <strong>${Utils.esc(p.nome||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${d.id||''}">
      <div class="form-grid doc-modal-original">
        <div class="f-col f-full">
          <label>Título do laudo</label>
          <input id="ld-titulo" value="${Utils.esc(d.titulo||'')}" placeholder="Ex.: Laudo médico">
        </div>

        <div class="f-col f-full">
          <label>CID-10</label>
          <input id="ld-cid" placeholder="CID" value="${Utils.esc(d.cid||'')}">
        </div>

        <div class="f-col f-full">
          <label>Laudo</label>
          <textarea id="ld-texto" rows="10" placeholder="Digite o conteúdo do laudo...">${Utils.esc(d.texto||d.descricao||d.conclusao||'')}</textarea>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.docCloseToRegistro()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.saveLaudo(true)">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-blue" onclick="RegistrarConsulta.saveLaudo(false)">💾 Salvar Laudo</button>
    `,'lg');

    setTimeout(()=>{
      const title=document.querySelector('.modal-title');
      if(title){
        title.innerHTML=`🧾 ${d.id?'Editar':'Novo'} Laudo Médico <button class="modal-x" onclick="RegistrarConsulta.docCloseToRegistro()">×</button>`;
        title.style.display='';
      }
    },30);
  };

  RegistrarConsulta.saveLaudo = function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_LD');
    const texto=document.getElementById('ld-texto')?.value||'';

    if(!texto.trim()){
      Utils.toast('Informe o texto do laudo.');
      return;
    }

    const doc={
      id,
      titulo:document.getElementById('ld-titulo')?.value||'Laudo médico',
      cid:document.getElementById('ld-cid')?.value||'',
      texto,
      finalidade:'',
      descricao:texto,
      conclusao:texto,
      conduta:''
    };

    Documentos.add('Laudo',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Laudo'}),180);
    this.restoreMainModal();
  };
})();




/* =========================================================
   ZERO V4.1 — Cancelar volta aguardando + salvar/manter/direcionar
========================================================= */
(function(){
  if(!window.RegistrarConsulta) return;

  RegistrarConsulta.cancelarAtendimentoVoltarFila = function(){
    const p=this.pac;
    if(window.Atendimento && p){
      const item=Atendimento.emAtendimento(p.id);
      if(item){
        item.status='Aguardando';
        item.horaInicio='';
        item.iniciadoEm='';
        item.observacaoCancelamento='Registro cancelado, voltou para aguardando.';
        Store.upsert('ATENDIMENTOS',item);
        if(window.Security) Security.audit('atendimento_cancelado_voltou_fila',`Paciente ${item.paciente||p.nome} voltou para aguardando`);
      }
    }
    Modal.close();
    Router.go('atendimento');
    Utils.toast('Atendimento voltou para a fila como aguardando.');
  };

  RegistrarConsulta.footer = function(){
    return `<button class="btn btn-ghost btn-registro-cancelar" onclick="RegistrarConsulta.cancelarAtendimentoVoltarFila()">Cancelar</button>
      <button class="btn btn-outline btn-registro-manter" onclick="RegistrarConsulta.modalSalvarManterFila()">💾 Salvar e manter na fila</button>
      <button class="btn btn-green btn-registro-finalizar" onclick="RegistrarConsulta.save(true)">✅ Salvar atendimento</button>`;
  };

  RegistrarConsulta.modalSalvarManterFila = function(){
    this.captureForm();
    const profs=Store.get('PROFISSIONAIS').filter(p=>p.ativo!==false);
    const atual=(Profissionais.atual()||{}).id||'';

    Modal.open('Salvar e manter na fila',`
      <div class="manter-fila-box">
        <strong>Salvar atendimento sem finalizar a passagem do paciente.</strong>
        <div class="doc-sub" style="margin-top:4px;">Você pode manter na fila para o mesmo profissional ou direcionar para outro profissional cadastrado.</div>
      </div>

      <div class="doc-modal-original" style="margin-top:14px;">
        <label>Direcionar para profissional</label>
        <select id="manter-profissional">
          <option value="">Manter profissional atual</option>
          ${profs.map(p=>`<option value="${p.id}" ${p.id===atual?'selected':''}>${Utils.esc(p.nome)} ${p.especialidade?`- ${Utils.esc(p.especialidade)}`:''}</option>`).join('')}
        </select>

        <label style="margin-top:10px;">Observação para fila</label>
        <textarea id="manter-obs" rows="3" placeholder="Ex.: Retornar após exames, encaminhar para outro profissional, manter aguardando..."></textarea>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Voltar</button>
      <button class="btn btn-blue" onclick="RegistrarConsulta.save(false)">Salvar e manter</button>
    `,'lg');
  };

  const oldSaveV41 = RegistrarConsulta.save.bind(RegistrarConsulta);
  RegistrarConsulta.save = function(finalizar=true){
    const profDestinoId=document.getElementById('manter-profissional')?.value||'';
    const obsFila=document.getElementById('manter-obs')?.value||'';

    // chama o save original, que já cria histórico e consolida documentos
    oldSaveV41(finalizar);

    if(!finalizar && window.Atendimento && this.pac){
      const lista=Store.get('ATENDIMENTOS');
      let item=lista.find(a=>String(a.pacId)===String(this.pac.id) && (a.status==='Aguardando'||a.status==='Em atendimento'));
      if(item){
        item.status='Aguardando';
        item.horaInicio='';
        item.iniciadoEm='';
        item.obsFila=obsFila;
        if(profDestinoId){
          const prof=Store.get('PROFISSIONAIS').find(p=>String(p.id)===String(profDestinoId));
          if(prof){
            item.profissionalId=prof.id;
            item.profissional=prof.nome;
          }
        }
        Store.upsert('ATENDIMENTOS',item);
      }
      Router.go('atendimento');
      Utils.toast('Atendimento salvo e paciente mantido na fila.');
    }
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
   ZERO V9.4 — Receita/Medicamento estável
   Correções:
   1) Ao abrir Periodicidade, não perde mais o que foi digitado
      no modal Adicionar Medicamento.
   2) Ao aplicar medicamento, os cards voltam mais estáveis.
   3) Documentos salvos/impressos pelo modal levam os dados do paciente.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__receitaFixV94) return;
  RegistrarConsulta.__receitaFixV94=true;

  RegistrarConsulta.capturarMedicamentoDraftV94 = function(){
    return {
      index:document.getElementById('med-edit-index')?.value ?? '',
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      duracao:document.getElementById('med-duracao')?.value?.trim()||'',
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||'',
      periodicidadeTexto:this.periodicidadeTemp||document.getElementById('med-periodicidade-resumo')?.innerText||'A cada 8h'
    };
  };

  RegistrarConsulta.restaurarMedicamentoDraftV94 = function(draft){
    if(!draft) return;
    const set=(id,val)=>{const el=document.getElementById(id); if(el) el.value=val||'';};
    set('med-nome',draft.nome);
    set('med-formula',draft.formula||draft.concentracao);
    set('med-forma',draft.formaFarmaceutica||draft.apresentacao);
    set('med-dose',draft.dose);
    set('med-quantidade',draft.quantidade);
    set('med-duracao',draft.duracao);
    set('med-orientacao',draft.orientacao);
    const via=document.getElementById('med-via');
    if(via) via.value=draft.via||'Oral';
    const resumo=document.getElementById('med-periodicidade-resumo');
    if(resumo) resumo.textContent=draft.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';
  };

  const oldAbrirPeriodicidadeV94 = RegistrarConsulta.abrirModalPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  if(oldAbrirPeriodicidadeV94){
    RegistrarConsulta.abrirModalPeriodicidadeMedicamento = function(){
      this.medDraftTempV94=this.capturarMedicamentoDraftV94();
      this.periodicidadeTemp=this.medDraftTempV94.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';
      return oldAbrirPeriodicidadeV94();
    };
  }

  const oldModalAddMedV94 = RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal?.bind(RegistrarConsulta);
  if(oldModalAddMedV94){
    RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal = function(index=null){
      const ret=oldModalAddMedV94(index);
      setTimeout(()=>{
        if(this.medDraftTempV94){
          const idxAtual=document.getElementById('med-edit-index')?.value ?? '';
          const idxDraft=this.medDraftTempV94.index ?? '';
          // Restaura quando voltou do modal de periodicidade.
          if(String(idxAtual)===String(idxDraft)){
            this.restaurarMedicamentoDraftV94(this.medDraftTempV94);
          }
        }
      },35);
      return ret;
    };
  }

  const oldAplicarPeriodicidadeV94 = RegistrarConsulta.aplicarPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  if(oldAplicarPeriodicidadeV94){
    RegistrarConsulta.aplicarPeriodicidadeMedicamento = function(){
      const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
      const personalizado=document.getElementById('period-personalizado-texto')?.value?.trim()||'';
      const texto=opts.map(v=>v==='Personalizado'&&personalizado?'Personalizado: '+personalizado:v).join(' + ') || 'A cada 8h';

      this.periodicidadeTemp=texto;
      if(this.medDraftTempV94) this.medDraftTempV94.periodicidadeTexto=texto;

      const idx=this.medDraftTempV94?.index ?? '';
      this.modalAdicionarMedicamentoReceitaOriginal(idx!==''?Number(idx):null);

      setTimeout(()=>{
        this.restaurarMedicamentoDraftV94(this.medDraftTempV94);
        const el=document.getElementById('med-periodicidade-resumo');
        if(el) el.textContent=texto;
      },40);
    };
  }

  RegistrarConsulta.pacienteDocV94 = function(){
    const p=this.pac||{};
    return {
      pacId:p.id||this.pacId||this.pacienteId||'',
      pacienteId:p.id||this.pacId||this.pacienteId||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  const oldAplicarMedV94 = RegistrarConsulta.aplicarMedicamentoReceitaOriginal?.bind(RegistrarConsulta);
  if(oldAplicarMedV94){
    RegistrarConsulta.aplicarMedicamentoReceitaOriginal = function(){
      // Captura antes para não perder se alguma versão antiga reconstruir.
      this.medDraftTempV94=this.capturarMedicamentoDraftV94();

      const indexRaw=document.getElementById('med-edit-index')?.value;
      const duracao=document.getElementById('med-duracao')?.value?.trim()||'';
      const periodicidade=this.periodicidadeTemp||document.getElementById('med-periodicidade-resumo')?.innerText||'A cada 8h';

      const med={
        nome:document.getElementById('med-nome')?.value?.trim()||'',
        formula:document.getElementById('med-formula')?.value?.trim()||'',
        concentracao:document.getElementById('med-formula')?.value?.trim()||'',
        formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
        apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
        via:document.getElementById('med-via')?.value||'Oral',
        dose:document.getElementById('med-dose')?.value?.trim()||'',
        quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
        periodicidadeTexto:periodicidade,
        posologia:[document.getElementById('med-dose')?.value?.trim()||'', periodicidade].filter(Boolean).join(' - '),
        duracao,
        usoContinuo:String(duracao).toLowerCase().includes('contínuo') || String(duracao).toLowerCase().includes('continuo') || String(periodicidade).toLowerCase().includes('uso contínuo') || String(periodicidade).toLowerCase().includes('uso continuo'),
        orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
      };

      if(!med.nome){
        Utils.toast('Informe o medicamento.');
        return;
      }

      if(indexRaw!=='' && indexRaw!=null) this.receitaMeds[Number(indexRaw)]=med;
      else this.receitaMeds.push(med);

      this.medDraftTempV94=null;

      // Volta para a receita e renderiza a lista imediatamente para reduzir a piscada.
      this.modalReceita({
        id:this.receitaContext?.id||'',
        medicamentos:this.receitaMeds,
        obs:this.receitaContext?.obs||''
      });

      requestAnimationFrame(()=>this.renderListaMedsReceitaOriginal && this.renderListaMedsReceitaOriginal());
    };
  }

  // Acrescenta dados do paciente em receita, atestado, pedido e laudo ao salvar/imprimir.
  const oldSaveReceitaV94 = RegistrarConsulta.saveReceita?.bind(RegistrarConsulta);
  if(oldSaveReceitaV94){
    RegistrarConsulta.saveReceita = function(imprimir=false,tipoPrint=''){
      const id=document.getElementById('doc-id')?.value||Utils.id('TMP_REC');
      const obs=document.getElementById('rec-obs')?.value||'';

      if(!this.receitaMeds || !this.receitaMeds.length){
        Utils.toast('Adicione ao menos um medicamento.');
        return;
      }

      const doc={
        id,
        ...this.pacienteDocV94(),
        medicamentos:JSON.parse(JSON.stringify(this.receitaMeds)),
        obs,
        orientacao:obs,
        tipoPrint
      };

      Documentos.add('Receita',doc);
      if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Receita'}),80);
      this.receitaMeds=[];
      this.receitaContext=null;
      this.restoreMainModal();
    };
  }

  const oldSaveAtestadoV94 = RegistrarConsulta.saveAtestado?.bind(RegistrarConsulta);
  if(oldSaveAtestadoV94){
    RegistrarConsulta.saveAtestado=function(imprimir=false){
      const id=document.getElementById('doc-id')?.value||Utils.id('TMP_AT');
      const doc={
        id,
        ...this.pacienteDocV94(),
        tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
        dias:document.getElementById('at-dias')?.value||'',
        cid:document.getElementById('at-cid')?.value||'',
        horaChegada:document.getElementById('at-hora-chegada')?.value||'',
        horaSaida:document.getElementById('at-hora-saida')?.value||'',
        hora:document.getElementById('at-hora-saida')?.value||'',
        motivo:document.getElementById('at-motivo')?.value||'',
        texto:document.getElementById('at-motivo')?.value||'',
        obs:document.getElementById('at-obs')?.value||''
      };
      Documentos.add('Atestado',doc);
      if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),80);
      this.restoreMainModal();
    };
  }

  const oldSavePedidoV94 = RegistrarConsulta.savePedido?.bind(RegistrarConsulta);
  if(oldSavePedidoV94){
    RegistrarConsulta.savePedido=function(imprimir=false){
      const id=document.getElementById('doc-id')?.value||Utils.id('TMP_PE');
      const doc={
        id,
        ...this.pacienteDocV94(),
        exames:document.getElementById('pe-exames')?.value||'',
        obs:document.getElementById('pe-obs')?.value||''
      };
      Documentos.add('Pedido de Exames',doc);
      if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),80);
      this.restoreMainModal();
    };
  }

  const oldSaveLaudoV94 = RegistrarConsulta.saveLaudo?.bind(RegistrarConsulta);
  if(oldSaveLaudoV94){
    RegistrarConsulta.saveLaudo=function(imprimir=false){
      const id=document.getElementById('doc-id')?.value||Utils.id('TMP_LD');
      const texto=document.getElementById('ld-texto')?.value||'';
      if(!texto.trim()) return Utils.toast('Informe o texto do laudo.');
      const doc={
        id,
        ...this.pacienteDocV94(),
        titulo:document.getElementById('ld-titulo')?.value||'Laudo médico',
        cid:document.getElementById('ld-cid')?.value||'',
        texto,
        finalidade:'',
        descricao:texto,
        conclusao:texto,
        conduta:''
      };
      Documentos.add('Laudo',doc);
      if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Laudo'}),80);
      this.restoreMainModal();
    };
  }
})();




/* =========================================================
   ZERO V9.6 — Modais de documentos estáveis
   Correções:
   - Nova Receita Médica, Solicitação de Exames, Novo Documento Médico,
     Novo Laudo Médico não exibem mais modal anterior antes de estabilizar.
   - Periodicidade não apaga campos do medicamento.
   - Ao salvar periodicidade, volta ao modal Adicionar Medicamento já
     com os dados preenchidos, sem mostrar a tela anterior.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__modalDocsStableV96) return;
  RegistrarConsulta.__modalDocsStableV96=true;

  RegistrarConsulta._docModalAbrindoV96=false;

  RegistrarConsulta.safeModalOpenV96=function(title,body,footer='',size='lg'){
    this._docModalAbrindoV96=true;
    Modal.open(title,body,footer,size);
    requestAnimationFrame(()=>{ this._docModalAbrindoV96=false; });
  };

  RegistrarConsulta.capturarMedicamentoDraftV96=function(){
    return {
      index:document.getElementById('med-edit-index')?.value ?? '',
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      duracao:document.getElementById('med-duracao')?.value?.trim()||'',
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||'',
      periodicidadeTexto:this.periodicidadeTemp||document.getElementById('med-periodicidade-resumo')?.innerText||'A cada 8h'
    };
  };

  RegistrarConsulta.restaurarMedicamentoDraftV96=function(draft){
    if(!draft) return;
    const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.value=val||''; };
    set('med-nome',draft.nome);
    set('med-formula',draft.formula||draft.concentracao);
    set('med-forma',draft.formaFarmaceutica||draft.apresentacao);
    set('med-dose',draft.dose);
    set('med-quantidade',draft.quantidade);
    set('med-duracao',draft.duracao);
    set('med-orientacao',draft.orientacao);
    const via=document.getElementById('med-via');
    if(via) via.value=draft.via||'Oral';
    const resumo=document.getElementById('med-periodicidade-resumo');
    if(resumo) resumo.textContent=draft.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';
  };

  // Captura antes de abrir a periodicidade
  const oldAbrirPeriodoV96=RegistrarConsulta.abrirModalPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  if(oldAbrirPeriodoV96){
    RegistrarConsulta.abrirModalPeriodicidadeMedicamento=function(){
      this.medDraftTempV96=this.capturarMedicamentoDraftV96();
      this.periodicidadeTemp=this.medDraftTempV96.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';
      return oldAbrirPeriodoV96();
    };
  }

  // Restaura depois que volta para adicionar medicamento
  const oldModalMedV96=RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal?.bind(RegistrarConsulta);
  if(oldModalMedV96){
    RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal=function(index=null){
      const ret=oldModalMedV96(index);
      requestAnimationFrame(()=>{
        if(this.medDraftTempV96){
          const idxAtual=document.getElementById('med-edit-index')?.value ?? '';
          const idxDraft=this.medDraftTempV96.index ?? '';
          if(String(idxAtual)===String(idxDraft)){
            this.restaurarMedicamentoDraftV96(this.medDraftTempV96);
          }
        }
      });
      return ret;
    };
  }

  // Aplica periodicidade sem perder nem piscar os campos
  RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
    const personalizado=document.getElementById('period-personalizado-texto')?.value?.trim()||'';
    const texto=opts.map(v=>v==='Personalizado'&&personalizado?'Personalizado: '+personalizado:v).join(' + ') || 'A cada 8h';

    if(!this.medDraftTempV96) this.medDraftTempV96=this.capturarMedicamentoDraftV96();
    this.periodicidadeTemp=texto;
    this.medDraftTempV96.periodicidadeTexto=texto;

    const idx=this.medDraftTempV96.index ?? '';
    this.modalAdicionarMedicamentoReceitaOriginal(idx!==''?Number(idx):null);

    requestAnimationFrame(()=>{
      this.restaurarMedicamentoDraftV96(this.medDraftTempV96);
      const el=document.getElementById('med-periodicidade-resumo');
      if(el) el.textContent=texto;
    });
  };

  // Substitui Documentos/add rápido, evitando render atrasado visível
  const oldAplicarMedV96=RegistrarConsulta.aplicarMedicamentoReceitaOriginal?.bind(RegistrarConsulta);
  if(oldAplicarMedV96){
    RegistrarConsulta.aplicarMedicamentoReceitaOriginal=function(){
      this.medDraftTempV96=this.capturarMedicamentoDraftV96();

      const indexRaw=document.getElementById('med-edit-index')?.value;
      const draft=this.medDraftTempV96;
      const periodicidade=draft.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';

      const med={
        nome:draft.nome||'',
        formula:draft.formula||draft.concentracao||'',
        concentracao:draft.formula||draft.concentracao||'',
        formaFarmaceutica:draft.formaFarmaceutica||draft.apresentacao||'',
        apresentacao:draft.formaFarmaceutica||draft.apresentacao||'',
        via:draft.via||'Oral',
        dose:draft.dose||'',
        quantidade:draft.quantidade||'',
        periodicidadeTexto:periodicidade,
        posologia:[draft.dose||'', periodicidade].filter(Boolean).join(' - '),
        duracao:draft.duracao||'',
        usoContinuo:String(draft.duracao||'').toLowerCase().includes('contínuo') || String(draft.duracao||'').toLowerCase().includes('continuo') || String(periodicidade).toLowerCase().includes('uso contínuo') || String(periodicidade).toLowerCase().includes('uso continuo'),
        orientacao:draft.orientacao||''
      };

      if(!med.nome){
        Utils.toast('Informe o medicamento.');
        return;
      }

      if(indexRaw!=='' && indexRaw!=null) this.receitaMeds[Number(indexRaw)]=med;
      else this.receitaMeds.push(med);

      this.medDraftTempV96=null;

      this.modalReceita({
        id:this.receitaContext?.id||'',
        medicamentos:this.receitaMeds,
        obs:this.receitaContext?.obs||''
      });

      requestAnimationFrame(()=>this.renderListaMedsReceitaOriginal && this.renderListaMedsReceitaOriginal());
    };
  }

  // Dados do paciente precisam ir junto nos documentos quando imprime direto do modal
  RegistrarConsulta.pacienteDocV96=function(){
    const p=this.pac||{};
    return {
      pacId:p.id||this.pacId||this.pacienteId||'',
      pacienteId:p.id||this.pacId||this.pacienteId||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.saveReceita=function(imprimir=false,tipoPrint=''){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_REC');
    const obs=document.getElementById('rec-obs')?.value||'';

    if(!this.receitaMeds || !this.receitaMeds.length){
      Utils.toast('Adicione ao menos um medicamento.');
      return;
    }

    const doc={
      id,
      ...this.pacienteDocV96(),
      medicamentos:JSON.parse(JSON.stringify(this.receitaMeds)),
      obs,
      orientacao:obs,
      tipoPrint
    };

    Documentos.add('Receita',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Receita'}),60);
    this.receitaMeds=[];
    this.receitaContext=null;
    this.restoreMainModal();
  };

  const oldSavePedidoV96=RegistrarConsulta.savePedido?.bind(RegistrarConsulta);
  if(oldSavePedidoV96){
    RegistrarConsulta.savePedido=function(imprimir=false){
      const id=document.getElementById('doc-id')?.value||Utils.id('TMP_PE');
      const doc={
        id,
        ...this.pacienteDocV96(),
        exames:document.getElementById('pe-exames')?.value||'',
        obs:document.getElementById('pe-obs')?.value||''
      };
      Documentos.add('Pedido de Exames',doc);
      if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),60);
      this.restoreMainModal();
    };
  }

  const oldSaveAtestadoV96=RegistrarConsulta.saveAtestado?.bind(RegistrarConsulta);
  if(oldSaveAtestadoV96){
    RegistrarConsulta.saveAtestado=function(imprimir=false){
      const id=document.getElementById('doc-id')?.value||Utils.id('TMP_AT');
      const doc={
        id,
        ...this.pacienteDocV96(),
        tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
        dias:document.getElementById('at-dias')?.value||'',
        cid:document.getElementById('at-cid')?.value||'',
        horaChegada:document.getElementById('at-hora-chegada')?.value||'',
        horaSaida:document.getElementById('at-hora-saida')?.value||'',
        hora:document.getElementById('at-hora-saida')?.value||'',
        motivo:document.getElementById('at-motivo')?.value||'',
        texto:document.getElementById('at-motivo')?.value||'',
        obs:document.getElementById('at-obs')?.value||''
      };
      Documentos.add('Atestado',doc);
      if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),60);
      this.restoreMainModal();
    };
  }

  const oldSaveLaudoV96=RegistrarConsulta.saveLaudo?.bind(RegistrarConsulta);
  if(oldSaveLaudoV96){
    RegistrarConsulta.saveLaudo=function(imprimir=false){
      const id=document.getElementById('doc-id')?.value||Utils.id('TMP_LD');
      const texto=document.getElementById('ld-texto')?.value||'';
      if(!texto.trim()) return Utils.toast('Informe o texto do laudo.');
      const doc={
        id,
        ...this.pacienteDocV96(),
        titulo:document.getElementById('ld-titulo')?.value||'Laudo médico',
        cid:document.getElementById('ld-cid')?.value||'',
        texto,
        finalidade:'',
        descricao:texto,
        conclusao:texto,
        conduta:''
      };
      Documentos.add('Laudo',doc);
      if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Laudo'}),60);
      this.restoreMainModal();
    };
  }
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




/* =========================================================
   ZERO V9.8 — Texto original do atestado
   Texto solicitado:
   Atesto para os devidos fins que o(a) paciente [Nome Completo],
   portador(a) do CPF nº [CPF], esteve sob meus cuidados médicos
   no dia [DATA DO DIA].
   Necessita de afastamento de suas atividades pelo período de [X],
   a contar da data de hoje, [Data de início: //____].
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__textoAtestadoV98) return;
  RegistrarConsulta.__textoAtestadoV98=true;

  RegistrarConsulta.textoAtestadoPadraoV98=function(dias='',inicio=''){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf||'[000.000.000-00]';
    const data=Utils.today();
    const periodo=dias ? `${dias} dia(s)` : '[X]';
    const dataInicio=inicio || '__/__/____';

    return `Atesto para os devidos fins que o(a) paciente ${nome}, portador(a) do CPF nº ${cpf}, esteve sob meus cuidados médicos no dia ${data}.
Necessita de afastamento de suas atividades pelo período de ${periodo}, a contar da data de hoje, [Data de início: ${dataInicio}].`;
  };

  RegistrarConsulta.atualizarTextoAtestadoV98=function(){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    if(String(tipo).toLowerCase().includes('comparecimento')) return;

    const dias=document.getElementById('at-dias')?.value||'';
    const inicio=document.getElementById('at-inicio')?.value||'';
    const texto=document.getElementById('at-motivo');
    if(texto && (!texto.dataset.editado || texto.dataset.editado==='0')){
      texto.value=this.textoAtestadoPadraoV98(dias,inicio);
    }
  };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.captureForm && this.captureForm();
    const p=this.pac||{};
    const textoInicial=d.motivo||d.texto||this.textoAtestadoPadraoV98(d.dias||'',d.inicio||d.dataInicio||'');

    this.openStableModalV97(d.id?'Editar Documento Médico':'Novo Documento Médico',`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${Utils.esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${Utils.esc(d.id||'')}">
      <div class="form-grid">
        <div class="f-col">
          <label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipo();RegistrarConsulta.atualizarTextoAtestadoV98()">
            <option ${String(d.tipo||'').includes('Atestado')?'selected':''}>Atestado médico</option>
            <option ${String(d.tipo||'').includes('comparecimento')?'selected':''}>Declaração de comparecimento</option>
          </select>
        </div>
        <div class="f-col at-campo-afastamento">
          <label>Dias de afastamento</label>
          <input id="at-dias" type="number" value="${Utils.esc(d.dias||'')}" placeholder="Ex.: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV98()">
        </div>
        <div class="f-col at-campo-afastamento">
          <label>Data de início</label>
          <input id="at-inicio" type="date" value="${Utils.esc(d.inicio||d.dataInicio||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV98()">
        </div>
        <div class="f-col at-campo-afastamento">
          <label>CID-10</label>
          <input id="at-cid" value="${Utils.esc(d.cid||'')}" placeholder="Opcional">
        </div>
        <div class="f-col at-campo-comparecimento">
          <label>Hora de chegada</label>
          <input id="at-hora-chegada" type="time" value="${Utils.esc(d.horaChegada||'')}">
        </div>
        <div class="f-col at-campo-comparecimento">
          <label>Hora de saída</label>
          <input id="at-hora-saida" type="time" value="${Utils.esc(d.horaSaida||d.hora||'')}">
        </div>
        <div class="f-col f-full">
          <label>Texto do documento</label>
          <textarea id="at-motivo" rows="6" data-editado="${d.motivo||d.texto?'1':'0'}" oninput="this.dataset.editado='1'">${Utils.esc(textoInicial)}</textarea>
        </div>
        <div class="f-col f-full">
          <label>Observações</label>
          <textarea id="at-obs" rows="3">${Utils.esc(d.obs||'')}</textarea>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button>
      <button class="btn btn-outline" onclick="RegistrarConsulta.saveAtestado(true)">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-purple" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
    `,'lg');

    requestAnimationFrame(()=>{
      RegistrarConsulta.toggleAtestadoTipo && RegistrarConsulta.toggleAtestadoTipo();
      if(!(d.motivo||d.texto)) RegistrarConsulta.atualizarTextoAtestadoV98();
    });
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_AT');
    const doc={
      id,...this.pacienteDocV97(),
      tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
      dias:document.getElementById('at-dias')?.value||'',
      inicio:document.getElementById('at-inicio')?.value||'',
      dataInicio:document.getElementById('at-inicio')?.value||'',
      cid:document.getElementById('at-cid')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:document.getElementById('at-motivo')?.value||'',
      texto:document.getElementById('at-motivo')?.value||'',
      obs:document.getElementById('at-obs')?.value||''
    };
    Documentos.add('Atestado',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),60);
    this.restoreMainModal();
  };
})();




/* =========================================================
   ZERO V9.9 — Estabilidade de modais clínicos por perfil
   - Aplica a mesma abertura estável no perfil médico, recepção,
     financeiro e admin.
   - Congela menu/rota enquanto abre:
     Registrar Consulta, Receita, Exames, Atestado, Laudo,
     Adicionar Medicamento e Periodicidade.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__todosPerfisModalStableV99) return;
  RegistrarConsulta.__todosPerfisModalStableV99=true;

  RegistrarConsulta.openStableModalV99=function(title,body,footer='',size='lg'){
    if(window.Modal && Modal.freezeLayout) Modal.freezeLayout(260);
    Modal.open(title,body,footer,size);
    return false;
  };

  // substitui openStableModalV97 por versão com freeze global
  RegistrarConsulta.openStableModalV97=function(title,body,footer='',size='lg'){
    return RegistrarConsulta.openStableModalV99(title,body,footer,size);
  };

  // evita que o modal de consulta principal seja reconstruído durante abertura de documento
  const oldRefresh=RegistrarConsulta.refresh?.bind(RegistrarConsulta);
  if(oldRefresh){
    RegistrarConsulta.refresh=function(){
      if(window.Modal && Modal.isOpen && Modal.isOpen()){
        const freezeUntil=window.__CM_MODAL_FREEZE_UNTIL__||0;
        if(Date.now()<freezeUntil) return;
      }
      return oldRefresh();
    };
  }

  const oldRestore=RegistrarConsulta.restoreMainModal?.bind(RegistrarConsulta);
  if(oldRestore){
    RegistrarConsulta.restoreMainModal=function(){
      if(window.Modal && Modal.freezeLayout) Modal.freezeLayout(220);
      return oldRestore();
    };
  }

  // reforço da periodicidade: não fecha/reabre com dados vazios
  const oldAbrirPeriodo=RegistrarConsulta.abrirModalPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  if(oldAbrirPeriodo){
    RegistrarConsulta.abrirModalPeriodicidadeMedicamento=function(){
      if(this.capturarMedicamentoDraftV97){
        this.medDraftTempV97=this.capturarMedicamentoDraftV97();
        this.periodicidadeTemp=this.medDraftTempV97.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';
      }
      if(window.Modal && Modal.freezeLayout) Modal.freezeLayout(260);
      return oldAbrirPeriodo();
    };
  }

  const oldAplicarPeriodo=RegistrarConsulta.aplicarPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  if(oldAplicarPeriodo){
    RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
      if(window.Modal && Modal.freezeLayout) Modal.freezeLayout(260);
      return oldAplicarPeriodo();
    };
  }
})();




/* =========================================================
   ZERO V10.0 — Atestado Médico corrigido
   Correções:
   - Modal chama "Atestado Médico", não "Novo Documento Médico".
   - Botões Salvar e Salvar e Imprimir funcionam.
   - Texto padrão correto para impressão.
   - Data de início aparece no texto como DD/MM/AAAA.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__atestadoMedicoV100) return;
  RegistrarConsulta.__atestadoMedicoV100=true;

  RegistrarConsulta.formatarDataBRV100=function(v){
    if(!v) return '__/__/____';
    if(String(v).includes('/')) return v;
    const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;
    return String(v);
  };

  RegistrarConsulta.textoAtestadoPadraoV100=function(dias='',inicio=''){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf||'[000.000.000-00]';
    const data=Utils.today();
    const periodo=dias ? `${dias} dia(s)` : '[X]';
    const dataInicio=this.formatarDataBRV100(inicio);

    return `Atesto para os devidos fins que o(a) paciente ${nome}, portador(a) do CPF nº ${cpf}, esteve sob meus cuidados médicos no dia ${data}.
Necessita de afastamento de suas atividades pelo período de ${periodo}, a contar da data de hoje, Data de início: ${dataInicio}.`;
  };

  RegistrarConsulta.atualizarTextoAtestadoV100=function(force=false){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    if(String(tipo).toLowerCase().includes('comparecimento')) return;

    const dias=document.getElementById('at-dias')?.value||'';
    const inicio=document.getElementById('at-inicio')?.value||'';
    const texto=document.getElementById('at-motivo');

    if(texto && (force || !texto.dataset.editado || texto.dataset.editado==='0')){
      texto.value=this.textoAtestadoPadraoV100(dias,inicio);
      texto.dataset.editado='0';
    }
  };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.captureForm && this.captureForm();
    const p=this.pac||{};
    const temTexto=!!(d.motivo||d.texto);
    const textoInicial=d.motivo||d.texto||this.textoAtestadoPadraoV100(d.dias||'',d.inicio||d.dataInicio||'');

    this.openStableModalV97(d.id?'Editar Atestado Médico':'Atestado Médico',`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${Utils.esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${Utils.esc(d.id||'')}">

      <div class="form-grid">
        <div class="f-col">
          <label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipo();RegistrarConsulta.atualizarTextoAtestadoV100(true)">
            <option ${String(d.tipo||'Atestado médico').toLowerCase().includes('atestado')?'selected':''}>Atestado médico</option>
            <option ${String(d.tipo||'').toLowerCase().includes('comparecimento')?'selected':''}>Declaração de comparecimento</option>
          </select>
        </div>

        <div class="f-col at-campo-afastamento">
          <label>Dias de afastamento</label>
          <input id="at-dias" type="number" value="${Utils.esc(d.dias||'')}" placeholder="Ex.: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV100(false)">
        </div>

        <div class="f-col at-campo-afastamento">
          <label>Data de início</label>
          <input id="at-inicio" type="date" value="${Utils.esc(d.inicio||d.dataInicio||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV100(false)">
        </div>

        <div class="f-col at-campo-afastamento">
          <label>CID-10</label>
          <input id="at-cid" value="${Utils.esc(d.cid||'')}" placeholder="Opcional">
        </div>

        <div class="f-col at-campo-comparecimento">
          <label>Hora de chegada</label>
          <input id="at-hora-chegada" type="time" value="${Utils.esc(d.horaChegada||'')}">
        </div>

        <div class="f-col at-campo-comparecimento">
          <label>Hora de saída</label>
          <input id="at-hora-saida" type="time" value="${Utils.esc(d.horaSaida||d.hora||'')}">
        </div>

        <div class="f-col f-full">
          <label>Texto do atestado</label>
          <textarea id="at-motivo" rows="6" data-editado="${temTexto?'1':'0'}" oninput="this.dataset.editado='1'">${Utils.esc(textoInicial)}</textarea>
        </div>

        <div class="f-col f-full">
          <label>Observações</label>
          <textarea id="at-obs" rows="3">${Utils.esc(d.obs||'')}</textarea>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" type="button" onclick="RegistrarConsulta.restoreMainModal()">Cancelar</button>
      <button class="btn btn-outline" type="button" onclick="RegistrarConsulta.saveAtestado(true)">💾🖨️ Salvar e imprimir</button>
      <button class="btn btn-purple" type="button" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
    `,'lg');

    requestAnimationFrame(()=>{
      RegistrarConsulta.toggleAtestadoTipo && RegistrarConsulta.toggleAtestadoTipo();
      if(!temTexto) RegistrarConsulta.atualizarTextoAtestadoV100(false);
    });
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const id=document.getElementById('doc-id')?.value||Utils.id('TMP_AT');
    const texto=document.getElementById('at-motivo')?.value||'';
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';

    if(!texto.trim()){
      Utils.toast('Informe o texto do atestado.');
      return;
    }

    const doc={
      id,
      ...(this.pacienteDocV97 ? this.pacienteDocV97() : (this.pacienteDocV96 ? this.pacienteDocV96() : {})),
      tipo,
      tipoDocumento:'Atestado',
      dias:document.getElementById('at-dias')?.value||'',
      inicio:document.getElementById('at-inicio')?.value||'',
      dataInicio:document.getElementById('at-inicio')?.value||'',
      cid:document.getElementById('at-cid')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:texto,
      texto:texto,
      obs:document.getElementById('at-obs')?.value||''
    };

    Documentos.add('Atestado',doc);

    if(imprimir){
      setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),60);
    }

    Utils.toast(imprimir?'Atestado salvo e enviado para impressão.':'Atestado salvo.');
    this.restoreMainModal();
  };
})();




/* =========================================================
   ZERO V10.6 — Registrar Consulta preserva campos e salva atendimento/anexos
   Correções:
   - Abrir Receita / Exames / Atestado / Laudo / Anexos não apaga
     o que foi digitado no Registrar Consulta.
   - Salvar atendimento volta a salvar HISTÓRICO.
   - Documentos e arquivos incluídos dentro do Registrar Consulta
     são consolidados no histórico do atendimento.
   - Corrige erro interno causado por variáveis inexistentes em save/consolidate.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__preservaSalvaV106) return;
  RegistrarConsulta.__preservaSalvaV106=true;

  RegistrarConsulta.mainFormDraftV106=null;

  RegistrarConsulta.isMainConsultaModalV106=function(){
    const body=document.querySelector('#modal-root .modal-body');
    if(!body) return false;
    return !!(body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-s'));
  };

  RegistrarConsulta.captureMainFormV106=function(){
    const body=document.querySelector('#modal-root .modal-body');
    if(!body || !this.isMainConsultaModalV106()) return;
    const data={};
    body.querySelectorAll('input,textarea,select').forEach(el=>{
      if(!el.id && !el.name) return;
      const key=el.id || ('name:'+el.name+':'+el.value);
      if(el.type==='checkbox' || el.type==='radio') data[key]=!!el.checked;
      else data[key]=el.value;
    });
    this.mainFormDraftV106=data;
    this.formDraft=data;
  };

  RegistrarConsulta.restoreMainFormV106=function(){
    const data=this.mainFormDraftV106 || this.formDraft;
    const body=document.querySelector('#modal-root .modal-body');
    if(!data || !body) return;
    body.querySelectorAll('input,textarea,select').forEach(el=>{
      if(!el.id && !el.name) return;
      const key=el.id || ('name:'+el.name+':'+el.value);
      if(!(key in data)) return;
      if(el.type==='checkbox' || el.type==='radio') el.checked=!!data[key];
      else el.value=data[key];
    });
  };

  const oldCaptureV106=RegistrarConsulta.captureForm?.bind(RegistrarConsulta);
  RegistrarConsulta.captureForm=function(){
    if(this.isMainConsultaModalV106()){
      return this.captureMainFormV106();
    }
    // Não deixa submodal sobrescrever o draft do Registrar Consulta.
    return;
  };

  const oldAfterV106=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    if(oldAfterV106) oldAfterV106();
    this.restoreMainFormV106();
    this.renderCards && this.renderCards();
  };

  RegistrarConsulta.restoreMainModal=function(){
    Modal.open('🩺 Registrar Consulta',this.html(),this.footer(),'lg');
    setTimeout(()=>{
      this.afterRender();
      this.restoreMainFormV106();
      this.renderCards && this.renderCards();
    },20);
  };

  // Garante que antes de abrir qualquer submodal o texto atual fique guardado.
  ['modalReceita','modalPedido','modalAtestado','modalLaudo'].forEach(fn=>{
    const old=this && null;
  });

  const wrapOpenDocV106=function(nome){
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old) return;
    RegistrarConsulta[nome]=function(){
      this.captureMainFormV106();
      return old(...arguments);
    };
  };
  wrapOpenDocV106('modalReceita');
  wrapOpenDocV106('modalPedido');
  wrapOpenDocV106('modalAtestado');
  wrapOpenDocV106('modalLaudo');

  const oldSaveAnexosV106=RegistrarConsulta.saveAnexosConsulta?.bind(RegistrarConsulta);
  RegistrarConsulta.saveAnexosConsulta=function(ev){
    this.captureMainFormV106();
    const files=Array.from(ev?.target?.files||[]);
    if(!files.length) return;
    let pending=files.length;
    files.forEach(f=>{
      const done=(dataUrl='')=>{
        Documentos.add('Exame anexado',{
          id:Utils.id('TMP_EX'),
          nome:f.name,
          filename:f.name,
          obs:'',
          dataUrl,
          mime:f.type||'',
          tamanho:f.size||0
        });
        pending--;
        if(pending<=0){
          if(ev.target) ev.target.value='';
          this.restoreMainModal();
        }
      };
      const r=new FileReader();
      r.onload=()=>done(r.result);
      r.onerror=()=>done('');
      r.readAsDataURL(f);
    });
  };

  RegistrarConsulta.profissionalAtualAtendimentoV106=function(){
    try{
      const atendimento = this.atendimentoId ? Store.get('ATENDIMENTOS').find(a=>String(a.id)===String(this.atendimentoId)) : null;
      const profId = atendimento?.profissionalId || window.Auth?.current?.profissionalId || window.Auth?.current?.id || '';
      const prof = Store.get('PROFISSIONAIS').find(p=>String(p.id)===String(profId)) || {};
      if(prof.nome) return prof;
      if(atendimento?.profissional) return {id:profId,nome:atendimento.profissional,conselho:atendimento.conselho||atendimento.crm||''};
      if(window.Profissionais?.atual) return Profissionais.atual()||{};
    }catch(e){}
    return {};
  };

  RegistrarConsulta.save=function(finalizar=true){
    this.captureMainFormV106();

    const tipo=document.getElementById('nc-tipo')?.value||'Consulta';
    const cid=this.val('nc-cid');
    const procedimento=String(tipo).toLowerCase()==='procedimento';

    let S='',O='',A='',P='',anamneseCompleta=null;

    if(procedimento){
      S=this.val('nc-s');
      O=this.val('nc-o');
      A=this.val('nc-a');
      P=this.val('nc-p');
      if(!S && !O && !A && !P){
        Utils.toast('Preencha ao menos um campo do registro procedural.');
        return;
      }
    }else{
      anamneseCompleta=this.coletarAnamnese ? this.coletarAnamnese() : null;
      S=this.montarResumoAnamnese ? this.montarResumoAnamnese(anamneseCompleta) : '';
      O=this.montarResumoObjetivo ? this.montarResumoObjetivo(anamneseCompleta) : '';
      A=anamneseCompleta?.hipoteseDiagnostica||this.val('ana-hipotese')||'';
      P=anamneseCompleta?.conduta||this.val('ana-conduta')||'';
      if(!S && !A && !P){
        Utils.toast('Preencha ao menos a queixa principal, hipótese diagnóstica ou conduta.');
        return;
      }
    }

    const histId=Utils.id('HIST');
    const p=this.pac;
    if(!p || !p.id){
      Utils.toast('Paciente não encontrado no registro.');
      return;
    }

    const prof=this.profissionalAtualAtendimentoV106();
    const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');
    const docs=Documentos.consolidate(p.id,this.consId,histId);

    const hist={
      id:histId,
      pacId:p.id,
      pacienteId:p.id,
      paciente:p.nome||p.nomeCompleto||'',
      consultaId:this.consId,
      atendimentoId:this.atendimentoId||this.consId,
      data:Utils.today(),
      hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:new Date().toISOString(),
      profissionalId:prof.id||'',
      profissional:prof.nome||'',
      medico:prof.nome||'',
      conselho,
      crm:conselho,
      tipo,
      tipoAtendimento:tipo,
      tipoConsulta:tipo,
      origem:procedimento?'procedimento':String(tipo||'consulta').toLowerCase(),
      status:finalizar?'Realizado':'Aguardando',
      cid,
      S,O,A,P,
      evolucao:S,
      conduta:P,
      obs:O,
      anamneseCompleta,
      registroCompleto:{tipo,S,O,A,P,cid,procedimento,anamneseCompleta},
      procedimentoRealizado:S,
      materiais:O,
      intercorrencias:A,
      evolucaoProcedural:P,
      documentos:docs,
      documentosAtendimento:docs,
      anexos:docs.filter(d=>d.tipoDoc==='Exame anexado')
    };

    Store.upsert('HISTORICO',hist);

    if(window.Atendimento && finalizar){
      Atendimento.finalizar(p.id,histId);
    }else if(window.Atendimento && !finalizar){
      const item=Atendimento.emAtendimento(p.id);
      if(item){
        item.status='Aguardando';
        item.horaFim='';
        item.finalizadoEm='';
        item.histId=histId;
        Store.upsert('ATENDIMENTOS',item);
      }
    }

    try{ if(window.Security) Security.audit('salvou_atendimento',`Paciente ${p.nome} - ${tipo}`); }catch(e){}

    this.formDraft=null;
    this.mainFormDraftV106=null;
    Modal.close();
    Prontuario.abrir(p.id,'historico');
    Utils.toast(finalizar?'✅ Atendimento registrado e finalizado!':'💾 Atendimento salvo e mantido na fila.');
  };
})();




/* =========================================================
   ZERO V10.8 — Cards/anexos do Registrar Consulta sem apagar e sem piscar
   Correções:
   - Anexar exame mostra o card imediatamente.
   - Anexar exame NÃO apaga os cards já salvos.
   - Salvar documento dentro do Registrar Consulta volta sem mostrar tela vazia.
   - Os documentos temporários são protegidos até salvar o atendimento.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__cardsAnexosStableV108) return;
  RegistrarConsulta.__cardsAnexosStableV108=true;

  RegistrarConsulta.docsBackupV108=[];

  RegistrarConsulta.backupDocsV108=function(){
    try{
      this.docsBackupV108=Utils.clone(window.Documentos?.temp||[]);
    }catch(e){
      this.docsBackupV108=[...(window.Documentos?.temp||[])];
    }
  };

  RegistrarConsulta.restoreDocsBackupV108=function(){
    if(!window.Documentos) return;
    if((!Documentos.temp || !Documentos.temp.length) && this.docsBackupV108 && this.docsBackupV108.length){
      try{ Documentos.temp=Utils.clone(this.docsBackupV108); }
      catch(e){ Documentos.temp=[...this.docsBackupV108]; }
    }
  };

  RegistrarConsulta.renderCards=function(){
    this.restoreDocsBackupV108();
    const alvo=document.getElementById('docs-novo-registro-lista');
    if(!alvo) return;
    const docs=window.Documentos?.temp||[];
    alvo.innerHTML = docs.length ? Documentos.cards() : '';
  };

  RegistrarConsulta.restoreMainModalStableV108=function(){
    this.restoreDocsBackupV108();
    document.body.classList.add('registrar-consulta-restoring-v108');

    Modal.open('🩺 Registrar Consulta',this.html(),this.footer(),'lg');

    requestAnimationFrame(()=>{
      this.afterRender && this.afterRender();
      this.restoreMainFormV106 && this.restoreMainFormV106();
      this.restoreDocsBackupV108();
      this.renderCards();
      requestAnimationFrame(()=>{
        document.body.classList.remove('registrar-consulta-restoring-v108');
      });
    });
  };

  RegistrarConsulta.restoreMainModal=function(){
    return this.restoreMainModalStableV108();
  };

  RegistrarConsulta.voltarRegistroSemPiscarV108=function(){
    this.backupDocsV108();
    return this.restoreMainModalStableV108();
  };

  // Protege os dados digitados e os cards antes de abrir qualquer menu interno.
  ['modalReceita','modalPedido','modalAtestado','modalLaudo'].forEach(nome=>{
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old || old.__wrappedV108) return;
    const wrapped=function(){
      this.captureMainFormV106 && this.captureMainFormV106();
      this.backupDocsV108();
      return old(...arguments);
    };
    wrapped.__wrappedV108=true;
    RegistrarConsulta[nome]=wrapped;
  });

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    this.captureMainFormV106 && this.captureMainFormV106();
    this.backupDocsV108();

    const files=Array.from(ev?.target?.files||[]);
    if(!files.length) return;

    let pending=files.length;
    const adicionados=[];

    const finalizar=()=>{
      this.backupDocsV108();
      if(ev && ev.target) ev.target.value='';
      this.restoreDocsBackupV108();
      this.renderCards();
      Utils.toast(`${adicionados.length} anexo(s) incluído(s) neste atendimento.`);
    };

    files.forEach(f=>{
      const done=(dataUrl='')=>{
        const item={
          id:Utils.id('TMP_EX'),
          nome:f.name,
          filename:f.name,
          obs:'',
          dataUrl,
          mime:f.type||'',
          tamanho:f.size||0,
          criadoEm:new Date().toISOString()
        };

        // Adiciona sem depender de outro documento para aparecer.
        if(window.Documentos){
          Documentos.add('Exame anexado',item);
          this.backupDocsV108();
        }

        adicionados.push(item);
        pending--;
        if(pending<=0) finalizar();
      };

      const r=new FileReader();
      r.onload=()=>done(r.result);
      r.onerror=()=>done('');
      r.readAsDataURL(f);
    });
  };

  // Antes de salvar o atendimento, garante que os anexos/cards temporários voltaram para Documentos.temp.
  const oldSaveV108=RegistrarConsulta.save?.bind(RegistrarConsulta);
  RegistrarConsulta.save=function(finalizar=true){
    this.captureMainFormV106 && this.captureMainFormV106();
    this.restoreDocsBackupV108();
    return oldSaveV108 ? oldSaveV108(finalizar) : undefined;
  };
})();




/* =========================================================
   ZERO V10.9 — Botão Salvar Atendimento corrigido de forma definitiva
   Correções:
   - Salvar e manter na fila funciona.
   - Salvar e finalizar funciona.
   - Não depende da cadeia antiga de save.
   - Salva histórico mesmo com documentos/anexos incluídos.
   - Finaliza/atualiza o atendimento correto pelo atendimentoId.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__saveAtendimentoFixV109) return;
  RegistrarConsulta.__saveAtendimentoFixV109=true;

  RegistrarConsulta.footer=function(){
    return `<button type="button" class="btn btn-ghost btn-registro-cancelar" onclick="Modal.close()">Cancelar</button>
      <button type="button" class="btn btn-blue btn-registro-manter" onclick="RegistrarConsulta.save(false)">💾 Salvar e manter na fila</button>
      <button type="button" class="btn btn-green btn-registro-finalizar" onclick="RegistrarConsulta.save(true)">✅ Salvar e finalizar</button>`;
  };

  RegistrarConsulta.docsAtuaisV109=function(){
    try{
      if(window.Documentos){
        if((!Documentos.temp || !Documentos.temp.length) && this.docsBackupV108?.length){
          Documentos.temp=Utils.clone(this.docsBackupV108);
        }
        if((!Documentos.temp || !Documentos.temp.length) && Documentos.tempBackupV108?.length){
          Documentos.temp=Utils.clone(Documentos.tempBackupV108);
        }
        return Documentos.temp||[];
      }
    }catch(e){}
    return [];
  };

  RegistrarConsulta.coletarRegistroFallbackV109=function(){
    const body=document.querySelector('#modal-root .modal-body');
    const linhas=[];
    if(body){
      body.querySelectorAll('textarea,input,select').forEach(el=>{
        const label=el.closest('div')?.querySelector('label')?.textContent?.trim() || el.id || el.name || '';
        let val='';
        if(el.type==='checkbox' || el.type==='radio'){
          if(el.checked) val=el.value||'Sim';
        }else{
          val=el.value||'';
        }
        if(val && label && !['hidden','file'].includes(el.type||'')){
          linhas.push(`${label}: ${val}`);
        }
      });
    }
    return linhas.join('\n');
  };

  RegistrarConsulta.profissionalAtualAtendimentoV109=function(){
    try{
      const atds=Store.get('ATENDIMENTOS')||[];
      const atendimento = atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId)) ||
        atds.find(a=>String(a.pacId||a.pacienteId)===String(this.pac?.id) && ['Em atendimento','Aguardando'].includes(a.status||''));
      const profId = atendimento?.profissionalId || window.Auth?.current?.profissionalId || '';
      const prof = (Store.get('PROFISSIONAIS')||[]).find(p=>String(p.id)===String(profId)) || {};
      if(prof.nome) return prof;
      if(atendimento?.profissional) return {id:profId,nome:atendimento.profissional,conselho:atendimento.conselho||atendimento.crm||''};
      return {id:profId||'',nome:window.Auth?.current?.nome||'',conselho:''};
    }catch(e){}
    return {};
  };

  RegistrarConsulta.atualizarAtendimentoV109=function(finalizar,histId){
    if(!window.Atendimento || !this.pac?.id) return;

    const atds=Store.get('ATENDIMENTOS')||[];
    let item=atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId));
    if(!item){
      item=atds.find(a=>String(a.pacId||a.pacienteId)===String(this.pac.id) && ['Em atendimento','Aguardando'].includes(a.status||''));
    }
    if(!item) return;

    item.histId=histId;
    item.ultimoHistId=histId;

    if(finalizar){
      item.status='Finalizado';
      item.finalizadoEm=new Date().toISOString();
      item.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    }else{
      item.status='Aguardando';
      item.finalizadoEm='';
      item.horaFim='';
    }

    Store.upsert('ATENDIMENTOS',item);

    if(item.origemAgendaId){
      const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status=finalizar?'Atendido':'Aguardando';
        ag.histId=histId;
        ag.atendimentoId=item.id;
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }
  };

  RegistrarConsulta.save=function(finalizar=true){
    try{
      this.captureMainFormV106 && this.captureMainFormV106();
      this.restoreDocsBackupV108 && this.restoreDocsBackupV108();

      const p=this.pac;
      if(!p || !p.id){
        Utils.toast('Paciente não encontrado para salvar atendimento.');
        return false;
      }

      const tipo=document.getElementById('nc-tipo')?.value||'Consulta';
      const cid=(document.getElementById('nc-cid')?.value||'').trim();
      const procedimento=String(tipo).toLowerCase()==='procedimento';

      let S='',O='',A='',P='',anamneseCompleta=null;

      if(procedimento){
        S=(document.getElementById('nc-s')?.value||'').trim();
        O=(document.getElementById('nc-o')?.value||'').trim();
        A=(document.getElementById('nc-a')?.value||'').trim();
        P=(document.getElementById('nc-p')?.value||'').trim();
      }else{
        try{
          anamneseCompleta=this.coletarAnamnese ? this.coletarAnamnese() : null;
          S=this.montarResumoAnamnese ? (this.montarResumoAnamnese(anamneseCompleta)||'') : '';
          O=this.montarResumoObjetivo ? (this.montarResumoObjetivo(anamneseCompleta)||'') : '';
          A=anamneseCompleta?.hipoteseDiagnostica||'';
          P=anamneseCompleta?.conduta||'';
        }catch(e){
          S=this.coletarRegistroFallbackV109();
        }
      }

      const fallback=this.coletarRegistroFallbackV109();
      if(!S && fallback) S=fallback;

      const docs=this.docsAtuaisV109();
      if(!S && !O && !A && !P && !docs.length){
        Utils.toast('Preencha o atendimento ou inclua algum documento/anexo antes de salvar.');
        return false;
      }

      const histId=Utils.id('HIST');
      const prof=this.profissionalAtualAtendimentoV109();
      const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');

      let docsSalvos=[];
      if(window.Documentos){
        docsSalvos=Documentos.consolidate(p.id,this.consId||this.atendimentoId||Utils.id('CONS'),histId)||[];
      }

      const hist={
        id:histId,
        pacId:p.id,
        pacienteId:p.id,
        paciente:p.nome||p.nomeCompleto||'',
        consultaId:this.consId||this.atendimentoId||histId,
        atendimentoId:this.atendimentoId||this.consId||'',
        data:Utils.today(),
        hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
        criadoEm:new Date().toISOString(),
        profissionalId:prof.id||'',
        profissional:prof.nome||'',
        medico:prof.nome||'',
        conselho,
        crm:conselho,
        tipo,
        tipoAtendimento:tipo,
        tipoConsulta:tipo,
        origem:procedimento?'procedimento':String(tipo||'consulta').toLowerCase(),
        status:finalizar?'Realizado':'Aguardando',
        cid,
        S:S||'',
        O:O||'',
        A:A||'',
        P:P||'',
        evolucao:S||'',
        conduta:P||'',
        obs:O||'',
        anamneseCompleta,
        registroCompleto:{tipo,S:S||'',O:O||'',A:A||'',P:P||'',cid,procedimento,anamneseCompleta},
        procedimentoRealizado:procedimento?S:'',
        materiais:procedimento?O:'',
        intercorrencias:procedimento?A:'',
        evolucaoProcedural:procedimento?P:'',
        documentos:docsSalvos,
        documentosAtendimento:docsSalvos,
        anexos:docsSalvos.filter(d=>d.tipoDoc==='Exame anexado')
      };

      Store.upsert('HISTORICO',hist);
      this.atualizarAtendimentoV109(finalizar,histId);

      try{ if(window.Security) Security.audit('salvou_atendimento',`Paciente ${p.nome||''} - ${tipo}`); }catch(e){}

      this.formDraft=null;
      this.mainFormDraftV106=null;
      this.docsBackupV108=[];
      if(window.Documentos){
        Documentos.temp=[];
        Documentos.tempBackupV108=[];
      }

      Modal.close();
      if(window.Prontuario?.abrir) Prontuario.abrir(p.id,'historico');
      else if(window.Router?.go) Router.go('pacientes');

      Utils.toast(finalizar?'✅ Atendimento registrado e finalizado!':'💾 Atendimento salvo e mantido na fila.');
      return true;

    }catch(err){
      console.error('Erro ao salvar atendimento V10.9:',err);
      Utils.toast('Erro ao salvar atendimento. Verifique os dados e tente novamente.');
      return false;
    }
  };
})();




/* =========================================================
   ZERO V11.0 — Registrar Consulta sem piscar + salvar funcionando
   Correção definitiva do fluxo:
   - Não reconstrói a tela inteira quando cria/anexa documento.
   - Cards aparecem imediatamente, sem esperar outro documento.
   - Cards já criados não somem.
   - Botões Salvar e manter / Salvar e finalizar usam handler seguro.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__semPiscarSalvarV110) return;
  RegistrarConsulta.__semPiscarSalvarV110=true;

  RegistrarConsulta.tempHtmlV110='';
  RegistrarConsulta.tempFooterV110='';

  RegistrarConsulta.capturarTelaPrincipalV110=function(){
    const body=document.querySelector('#modal-root .modal-body');
    const footer=document.querySelector('#modal-root .modal-footer');
    if(body && (body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-s'))){
      this.captureMainFormV106 && this.captureMainFormV106();
      this.backupDocsV108 && this.backupDocsV108();
      this.tempHtmlV110=body.innerHTML;
      this.tempFooterV110=footer ? footer.innerHTML : this.footer();
    }
  };

  RegistrarConsulta.voltarParaTelaPrincipalV110=function(){
    const body=document.querySelector('#modal-root .modal-body');
    const footer=document.querySelector('#modal-root .modal-footer');

    document.body.classList.add('rc-no-blink-v110');

    if(body && this.tempHtmlV110){
      body.innerHTML=this.tempHtmlV110;
      if(footer) footer.innerHTML=this.footer();
      this.afterRender && this.afterRender();
      this.restoreMainFormV106 && this.restoreMainFormV106();
      this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
      this.renderCards && this.renderCards();
      requestAnimationFrame(()=>document.body.classList.remove('rc-no-blink-v110'));
      return;
    }

    // fallback sem deixar visível vazio
    Modal.open('🩺 Registrar Consulta',this.html(),this.footer(),'lg');
    requestAnimationFrame(()=>{
      this.afterRender && this.afterRender();
      this.restoreMainFormV106 && this.restoreMainFormV106();
      this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
      this.renderCards && this.renderCards();
      requestAnimationFrame(()=>document.body.classList.remove('rc-no-blink-v110'));
    });
  };

  RegistrarConsulta.restoreMainModal=function(){
    return this.voltarParaTelaPrincipalV110();
  };

  RegistrarConsulta.renderCards=function(){
    this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
    const alvo=document.getElementById('docs-novo-registro-lista');
    if(!alvo) return;
    const docs=window.Documentos?.temp || [];
    alvo.innerHTML = docs.length ? Documentos.cards() : '';
  };

  // Abrir menus internos sempre guarda a tela principal antes.
  ['modalReceita','modalPedido','modalAtestado','modalLaudo'].forEach(nome=>{
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old || old.__wrappedV110) return;
    const wrapped=function(){
      this.capturarTelaPrincipalV110();
      return old(...arguments);
    };
    wrapped.__wrappedV110=true;
    RegistrarConsulta[nome]=wrapped;
  });

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    this.capturarTelaPrincipalV110();

    const files=Array.from(ev?.target?.files||[]);
    if(!files.length) return;

    let pending=files.length;
    files.forEach(f=>{
      const done=(dataUrl='')=>{
        Documentos.add('Exame anexado',{
          id:Utils.id('TMP_EX'),
          nome:f.name,
          filename:f.name,
          obs:'',
          dataUrl,
          mime:f.type||'',
          tamanho:f.size||0,
          criadoEm:new Date().toISOString()
        });

        this.backupDocsV108 && this.backupDocsV108();
        this.renderCards();

        pending--;
        if(pending<=0){
          if(ev.target) ev.target.value='';
          Utils.toast(`${files.length} anexo(s) incluído(s).`);
        }
      };

      const r=new FileReader();
      r.onload=()=>done(r.result);
      r.onerror=()=>done('');
      r.readAsDataURL(f);
    });
  };

  // Salvar documento sem perder tela principal.
  RegistrarConsulta.saveReceita=function(){
    const id=document.getElementById('doc-id')?.value || Utils.id('TMP_REC');
    let meds=[];
    if(this.parseMedicamentos) meds=this.parseMedicamentos();
    if(!meds.length && document.getElementById('rec-meds')){
      meds=(document.getElementById('rec-meds').value||'').split(/\n+/).map(l=>{
        let p=l.split('|').map(x=>x.trim());
        return {nome:p[0]||'',formula:p[1]||'',quantidade:p[2]||'',via:p[3]||'',posologia:p[4]||'',duracao:p[5]||'',orientacao:p[6]||''};
      }).filter(m=>m.nome);
    }
    if(!meds.length) return Utils.toast('Informe ao menos um medicamento.');

    Documentos.add('Receita',{id,medicamentos:meds,obs:document.getElementById('rec-obs')?.value||''});
    this.backupDocsV108 && this.backupDocsV108();
    this.voltarParaTelaPrincipalV110();
    Utils.toast('Receita adicionada ao atendimento.');
  };

  RegistrarConsulta.savePedido=function(){
    const id=document.getElementById('doc-id')?.value || Utils.id('TMP_PE');
    const exames=document.getElementById('pe-exames')?.value || document.getElementById('pedido-exames')?.value || '';
    const obs=document.getElementById('pe-obs')?.value || document.getElementById('pedido-obs')?.value || '';
    if(!String(exames).trim()) return Utils.toast('Informe os exames solicitados.');
    Documentos.add('Pedido de Exames',{id,exames,obs});
    this.backupDocsV108 && this.backupDocsV108();
    this.voltarParaTelaPrincipalV110();
    Utils.toast('Solicitação de exames adicionada ao atendimento.');
  };

  RegistrarConsulta.saveLaudo=function(){
    const id=document.getElementById('doc-id')?.value || Utils.id('TMP_LD');
    const titulo=document.getElementById('ld-titulo')?.value || 'Laudo médico';
    const cid=document.getElementById('ld-cid')?.value || '';
    const texto=document.getElementById('ld-texto')?.value || '';
    if(!String(texto).trim()) return Utils.toast('Informe o texto do laudo.');
    Documentos.add('Laudo',{id,titulo,cid,texto});
    this.backupDocsV108 && this.backupDocsV108();
    this.voltarParaTelaPrincipalV110();
    Utils.toast('Laudo adicionado ao atendimento.');
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const id=document.getElementById('doc-id')?.value || Utils.id('TMP_AT');
    const tipo=document.getElementById('at-tipo')?.value || 'Atestado médico';
    const texto=document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '';
    if(!String(texto).trim()) return Utils.toast('Informe o texto do atestado.');

    const doc={
      id,
      tipo,
      tipoDocumento:'Atestado',
      dias:document.getElementById('at-dias')?.value||'',
      inicio:document.getElementById('at-inicio')?.value||'',
      dataInicio:document.getElementById('at-inicio')?.value||'',
      cid:document.getElementById('at-cid')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||document.getElementById('at-hora')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||document.getElementById('at-hora')?.value||'',
      motivo:texto,
      texto:texto,
      obs:document.getElementById('at-obs')?.value||''
    };

    Documentos.add('Atestado',doc);
    this.backupDocsV108 && this.backupDocsV108();

    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),60);

    this.voltarParaTelaPrincipalV110();
    Utils.toast('Atestado adicionado ao atendimento.');
  };

  RegistrarConsulta.coletarTextoDigitadoV110=function(){
    const body=document.querySelector('#modal-root .modal-body');
    const linhas=[];
    if(!body) return '';
    body.querySelectorAll('textarea,input,select').forEach(el=>{
      if(['hidden','file','button','submit'].includes(el.type||'')) return;
      if((el.type==='radio' || el.type==='checkbox') && !el.checked) return;
      const val=(el.type==='radio' || el.type==='checkbox') ? (el.value||'Sim') : (el.value||'');
      if(!String(val).trim()) return;
      let label='';
      const lab=document.querySelector(`label[for="${el.id}"]`);
      if(lab) label=lab.textContent.trim();
      if(!label) label=el.closest('div')?.querySelector('label')?.textContent?.trim() || el.id || el.name || '';
      linhas.push(`${label}: ${val}`);
    });
    return linhas.join('\n');
  };

  RegistrarConsulta.salvarAtendimentoV110=function(finalizar=true){
    try{
      this.captureMainFormV106 && this.captureMainFormV106();
      this.restoreDocsBackupV108 && this.restoreDocsBackupV108();

      const p=this.pac;
      if(!p || !p.id) return Utils.toast('Paciente não encontrado para salvar atendimento.');

      const tipo=document.getElementById('nc-tipo')?.value || 'Consulta';
      const cid=(document.getElementById('nc-cid')?.value||'').trim();
      const procedimento=String(tipo).toLowerCase()==='procedimento';

      let S='',O='',A='',P='',anamneseCompleta=null;

      if(procedimento){
        S=(document.getElementById('nc-s')?.value||'').trim();
        O=(document.getElementById('nc-o')?.value||'').trim();
        A=(document.getElementById('nc-a')?.value||'').trim();
        P=(document.getElementById('nc-p')?.value||'').trim();
      }else{
        try{
          anamneseCompleta=this.coletarAnamnese ? this.coletarAnamnese() : null;
          S=this.montarResumoAnamnese ? (this.montarResumoAnamnese(anamneseCompleta)||'') : '';
          O=this.montarResumoObjetivo ? (this.montarResumoObjetivo(anamneseCompleta)||'') : '';
          A=anamneseCompleta?.hipoteseDiagnostica||'';
          P=anamneseCompleta?.conduta||'';
        }catch(e){}
      }

      const digitado=this.coletarTextoDigitadoV110();
      if(!S && digitado) S=digitado;

      if(window.Documentos && (!Documentos.temp || !Documentos.temp.length)){
        if(this.docsBackupV108?.length) Documentos.temp=Utils.clone(this.docsBackupV108);
        else if(Documentos.tempBackupV108?.length) Documentos.temp=Utils.clone(Documentos.tempBackupV108);
      }

      const docs=(window.Documentos?.temp)||[];

      if(!S && !O && !A && !P && !docs.length){
        return Utils.toast('Preencha o atendimento ou inclua algum documento/anexo antes de salvar.');
      }

      const histId=Utils.id('HIST');
      const consultaId=this.consId || this.atendimentoId || histId;
      const prof=(this.profissionalAtualAtendimentoV109 && this.profissionalAtualAtendimentoV109()) || (this.profissionalAtualAtendimentoV106 && this.profissionalAtualAtendimentoV106()) || {};
      const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');

      const docsSalvos=window.Documentos ? (Documentos.consolidate(p.id,consultaId,histId)||[]) : [];

      const hist={
        id:histId,
        pacId:p.id,
        pacienteId:p.id,
        paciente:p.nome||p.nomeCompleto||'',
        consultaId,
        atendimentoId:this.atendimentoId||consultaId,
        data:Utils.today(),
        hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
        criadoEm:new Date().toISOString(),
        profissionalId:prof.id||'',
        profissional:prof.nome||'',
        medico:prof.nome||'',
        conselho,
        crm:conselho,
        tipo,
        tipoAtendimento:tipo,
        tipoConsulta:tipo,
        origem:procedimento?'procedimento':String(tipo||'consulta').toLowerCase(),
        status:finalizar?'Realizado':'Aguardando',
        cid,
        S:S||'',
        O:O||'',
        A:A||'',
        P:P||'',
        evolucao:S||'',
        conduta:P||'',
        obs:O||'',
        anamneseCompleta,
        registroCompleto:{tipo,S:S||'',O:O||'',A:A||'',P:P||'',cid,procedimento,anamneseCompleta},
        documentos:docsSalvos,
        documentosAtendimento:docsSalvos,
        anexos:docsSalvos.filter(d=>d.tipoDoc==='Exame anexado')
      };

      Store.upsert('HISTORICO',hist);

      // Atualiza fila/agenda diretamente.
      const atds=Store.get('ATENDIMENTOS')||[];
      let atd=atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId));
      if(!atd) atd=atds.find(a=>String(a.pacId||a.pacienteId)===String(p.id) && ['Em atendimento','Aguardando'].includes(a.status||''));
      if(atd){
        atd.histId=histId;
        atd.ultimoHistId=histId;
        if(finalizar){
          atd.status='Finalizado';
          atd.finalizadoEm=new Date().toISOString();
          atd.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        }else{
          atd.status='Aguardando';
          atd.finalizadoEm='';
          atd.horaFim='';
        }
        Store.upsert('ATENDIMENTOS',atd);

        if(atd.origemAgendaId){
          const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(atd.origemAgendaId));
          if(ag){
            ag.status=finalizar?'Atendido':'Aguardando';
            ag.histId=histId;
            ag.atendimentoId=atd.id;
            Store.upsert('AGENDA_MEDICA',ag);
          }
        }
      }

      this.formDraft=null;
      this.mainFormDraftV106=null;
      this.docsBackupV108=[];
      if(window.Documentos){ Documentos.temp=[]; Documentos.tempBackupV108=[]; }

      Modal.close();
      if(window.Prontuario?.abrir) Prontuario.abrir(p.id,'historico');
      Utils.toast(finalizar?'✅ Atendimento registrado e finalizado!':'💾 Atendimento salvo e mantido na fila.');
      return true;
    }catch(err){
      console.error('Salvar atendimento V11.0',err);
      Utils.toast('Erro ao salvar atendimento. Veja o console para detalhes.');
      return false;
    }
  };

  RegistrarConsulta.save=function(finalizar=true){
    return this.salvarAtendimentoV110(finalizar);
  };
})();




/* =========================================================
   ZERO V11.1 — Registrar Consulta reabre com rascunho estável
   Correções:
   - Se fechar o modal Registrar Consulta sem salvar, o rascunho é guardado.
   - Ao abrir novamente o mesmo atendimento, volta com textos, marcações e cards.
   - Reabre estável, sem mostrar tela vazia antes de restaurar.
   - Após salvar atendimento com sucesso, o rascunho é limpo.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__rascunhoEstavelV111) return;
  RegistrarConsulta.__rascunhoEstavelV111=true;

  RegistrarConsulta.rascunhoKeyV111=function(pacId='',consId=''){
    const p=pacId || this.pac?.id || '';
    const c=consId || this.consId || this.atendimentoId || '';
    return `CM_REG_CONSULTA_DRAFT_V111_${p}_${c}`;
  };

  RegistrarConsulta.isTelaPrincipalAbertaV111=function(){
    const body=document.querySelector('#modal-root .modal-body');
    return !!(body && (body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-s')));
  };

  RegistrarConsulta.coletarCamposTelaV111=function(){
    const body=document.querySelector('#modal-root .modal-body');
    const data={};
    if(!body) return data;

    body.querySelectorAll('input,textarea,select').forEach(el=>{
      if(!el.id && !el.name) return;
      if(['file','button','submit'].includes(el.type||'')) return;
      const key=el.id || ('name:'+el.name+':'+el.value);
      if(el.type==='checkbox' || el.type==='radio') data[key]=!!el.checked;
      else data[key]=el.value;
    });

    return data;
  };

  RegistrarConsulta.aplicarCamposTelaV111=function(data){
    const body=document.querySelector('#modal-root .modal-body');
    if(!body || !data) return;

    body.querySelectorAll('input,textarea,select').forEach(el=>{
      if(!el.id && !el.name) return;
      if(['file','button','submit'].includes(el.type||'')) return;
      const key=el.id || ('name:'+el.name+':'+el.value);
      if(!(key in data)) return;
      if(el.type==='checkbox' || el.type==='radio') el.checked=!!data[key];
      else el.value=data[key];
    });
  };

  RegistrarConsulta.salvarRascunhoV111=function(){
    try{
      if(!this.pac?.id) return;
      const isMain=this.isTelaPrincipalAbertaV111();
      if(isMain){
        this.mainFormDraftV106=this.coletarCamposTelaV111();
        this.formDraft=this.mainFormDraftV106;
      }

      if(window.Documentos){
        if((!Documentos.temp || !Documentos.temp.length) && this.docsBackupV108?.length){
          Documentos.temp=Utils.clone(this.docsBackupV108);
        }
        if(Documentos.temp && Documentos.temp.length){
          this.docsBackupV108=Utils.clone(Documentos.temp);
        }
      }

      const payload={
        pacId:this.pac?.id||'',
        consId:this.consId||this.atendimentoId||'',
        atendimentoId:this.atendimentoId||'',
        form:this.mainFormDraftV106||this.formDraft||{},
        docs:window.Documentos?.temp?.length ? Utils.clone(Documentos.temp) : Utils.clone(this.docsBackupV108||[]),
        atualizadoEm:new Date().toISOString()
      };

      sessionStorage.setItem(this.rascunhoKeyV111(payload.pacId,payload.consId),JSON.stringify(payload));
    }catch(e){
      console.warn('Falha ao salvar rascunho do Registrar Consulta',e);
    }
  };

  RegistrarConsulta.carregarRascunhoV111=function(pacId='',consId=''){
    try{
      const raw=sessionStorage.getItem(this.rascunhoKeyV111(pacId,consId));
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){
      return null;
    }
  };

  RegistrarConsulta.aplicarRascunhoV111=function(rascunho){
    if(!rascunho) return;

    document.body.classList.add('rc-restoring-draft-v111');

    try{
      if(rascunho.form){
        this.mainFormDraftV106=rascunho.form;
        this.formDraft=rascunho.form;
        this.aplicarCamposTelaV111(rascunho.form);
      }

      if(window.Documentos && Array.isArray(rascunho.docs)){
        Documentos.temp=Utils.clone(rascunho.docs);
        Documentos.tempBackupV108=Utils.clone(rascunho.docs);
        this.docsBackupV108=Utils.clone(rascunho.docs);
      }

      this.afterRender && this.afterRender();
      if(rascunho.form) this.aplicarCamposTelaV111(rascunho.form);
      this.renderCards && this.renderCards();

    }catch(e){
      console.warn('Falha ao aplicar rascunho do Registrar Consulta',e);
    }

    requestAnimationFrame(()=>document.body.classList.remove('rc-restoring-draft-v111'));
  };

  RegistrarConsulta.limparRascunhoV111=function(){
    try{
      if(!this.pac?.id) return;
      sessionStorage.removeItem(this.rascunhoKeyV111(this.pac.id,this.consId||this.atendimentoId||''));
    }catch(e){}
  };

  // Captura rascunho sempre que o usuário altera algo dentro do Registrar Consulta.
  document.addEventListener('input',function(ev){
    if(!window.RegistrarConsulta?.isTelaPrincipalAbertaV111?.()) return;
    if(ev.target && ev.target.closest && ev.target.closest('#modal-root')){
      clearTimeout(RegistrarConsulta.__draftTimerV111);
      RegistrarConsulta.__draftTimerV111=setTimeout(()=>RegistrarConsulta.salvarRascunhoV111(),180);
    }
  },true);

  document.addEventListener('change',function(ev){
    if(!window.RegistrarConsulta?.isTelaPrincipalAbertaV111?.()) return;
    if(ev.target && ev.target.closest && ev.target.closest('#modal-root')){
      clearTimeout(RegistrarConsulta.__draftTimerV111);
      RegistrarConsulta.__draftTimerV111=setTimeout(()=>RegistrarConsulta.salvarRascunhoV111(),80);
    }
  },true);

  // Ao fechar o modal principal sem salvar, guarda tudo para reabrir depois.
  if(window.Modal && !Modal.__registrarDraftCloseV111){
    Modal.__registrarDraftCloseV111=true;
    const oldClose=Modal.close?.bind(Modal);
    Modal.close=function(){
      try{
        if(window.RegistrarConsulta?.isTelaPrincipalAbertaV111?.()){
          RegistrarConsulta.salvarRascunhoV111();
        }
      }catch(e){}
      return oldClose ? oldClose() : undefined;
    };
  }

  // Ao abrir o mesmo atendimento, restaura rascunho antes de mostrar a tela estável.
  const oldOpen=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(pacId,atendimentoId=''){
    document.body.classList.add('rc-restoring-draft-v111');

    const ret=oldOpen ? oldOpen(pacId,atendimentoId) : undefined;

    const consId=this.consId||this.atendimentoId||atendimentoId||'';
    const rascunho=this.carregarRascunhoV111(pacId,consId);

    requestAnimationFrame(()=>{
      if(rascunho){
        this.aplicarRascunhoV111(rascunho);
      }else{
        this.afterRender && this.afterRender();
        this.renderCards && this.renderCards();
        requestAnimationFrame(()=>document.body.classList.remove('rc-restoring-draft-v111'));
      }
    });

    return ret;
  };

  // Ao voltar de submenus internos, também salva rascunho já restaurado.
  const oldRenderCards=RegistrarConsulta.renderCards?.bind(RegistrarConsulta);
  RegistrarConsulta.renderCards=function(){
    const ret=oldRenderCards ? oldRenderCards() : undefined;
    try{ this.salvarRascunhoV111(); }catch(e){}
    return ret;
  };

  // Se salvar atendimento com sucesso, limpa o rascunho para não reabrir dados antigos.
  const oldSave=RegistrarConsulta.save?.bind(RegistrarConsulta);
  RegistrarConsulta.save=function(finalizar=true){
    const ok=oldSave ? oldSave(finalizar) : false;
    if(ok) this.limparRascunhoV111();
    return ok;
  };
})();




/* =========================================================
   ZERO V11.2 — Receita salvar/imprimir + controle especial + atestado data
   Correções:
   - Salvar Receita volta a funcionar.
   - Salvar e imprimir Receita funciona.
   - Salvar e imprimir Controle Especial funciona.
   - Controle Especial imprime 1ª via e 2ª via em folhas separadas.
   - Atestado já abre com data inicial = data da consulta/dia.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__receitaAtestadoFixV112) return;
  RegistrarConsulta.__receitaAtestadoFixV112=true;

  RegistrarConsulta.dataHojeIsoV112=function(){
    const br=Utils.today();
    const m=String(br||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return `${m[3]}-${m[2]}-${m[1]}`;
    return new Date().toISOString().slice(0,10);
  };

  RegistrarConsulta.dataBRV112=function(iso=''){
    if(!iso) return Utils.today();
    const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;
    return String(iso);
  };

  RegistrarConsulta.parseMedicamentosSeguroV112=function(){
    let meds=[];

    if(Array.isArray(this.receitaMeds) && this.receitaMeds.length){
      meds=Utils.clone(this.receitaMeds);
    }

    if(!meds.length && this.parseMedicamentos){
      try{ meds=this.parseMedicamentos()||[]; }catch(e){}
    }

    if(!meds.length){
      const rows=Array.from(document.querySelectorAll('.rec-med-row,.doc-med-item'));
      meds=rows.map(row=>({
        nome:row.querySelector('.rec-med-nome,.med-nome,#med-nome')?.value?.trim()||'',
        formula:row.querySelector('.rec-med-formula,.med-formula,#med-formula')?.value?.trim()||'',
        quantidade:row.querySelector('.rec-med-qtd,.rec-med-quantidade,.med-quantidade,#med-quantidade')?.value?.trim()||'',
        via:row.querySelector('.rec-med-via,.med-via,#med-via')?.value?.trim()||'',
        posologia:row.querySelector('.rec-med-posologia,.med-posologia,#med-posologia')?.value?.trim()||'',
        duracao:row.querySelector('.rec-med-duracao,.med-duracao,#med-duracao')?.value?.trim()||'',
        orientacao:row.querySelector('.rec-med-orientacao,.med-orientacao,#med-orientacao')?.value?.trim()||''
      })).filter(m=>m.nome);
    }

    if(!meds.length && document.getElementById('rec-meds')){
      meds=(document.getElementById('rec-meds').value||'').split(/\n+/).map(l=>{
        let p=l.split('|').map(x=>x.trim());
        return {nome:p[0]||'',formula:p[1]||'',quantidade:p[2]||'',via:p[3]||'',posologia:p[4]||'',duracao:p[5]||'',orientacao:p[6]||''};
      }).filter(m=>m.nome);
    }

    return meds.map(m=>({
      ...m,
      posologia:m.posologia||m.freq||m.frequencia||m.periodicidadeTexto||'',
      duracao:m.duracao||m.tempo||'',
      orientacao:m.orientacao||m.obs||''
    }));
  };

  RegistrarConsulta.pacienteDocV112=function(){
    const p=this.pac||{};
    return {
      pacId:p.id||'',
      pacienteId:p.id||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.modalReceita=function(d={}){
    this.capturarTelaPrincipalV110 && this.capturarTelaPrincipalV110();
    const p=this.pac||{};
    this.receitaContext={id:d.id||'',obs:d.obs||d.orientacao||''};
    this.receitaMeds=Array.isArray(d.medicamentos) ? Utils.clone(d.medicamentos) : [];

    Modal.open(d.id?'Editar Receita Médica':'Nova Receita Médica',`
      <div class="doc-original-banner doc-banner-green">
        Paciente: <strong>${Utils.esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${Utils.esc(d.id||'')}">

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;">
        <label style="font-weight:800;color:#334155;margin:0;">Medicamentos:</label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal()">+ Medicamento</button>
      </div>

      <div id="rec-meds-lista-original" class="receita-original-lista"></div>

      <div class="f-col f-full doc-modal-original">
        <label>Observações / Orientações ao paciente</label>
        <textarea id="rec-obs" rows="3" placeholder="Ex: Tomar com alimento. Evitar sol...">${Utils.esc(d.obs||d.orientacao||'')}</textarea>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarParaTelaPrincipalV110()">Cancelar</button>
      <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.saveReceita(false,'receita')">💾 Salvar Receita</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveReceita(true,'receita')">💾🖨️ Salvar e imprimir</button>
      <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>
    `,'lg');

    requestAnimationFrame(()=>{
      if(this.renderListaMedsReceitaOriginal) this.renderListaMedsReceitaOriginal();
      if(!this.receitaMeds.length && this.modalAdicionarMedicamentoReceitaOriginal && !document.querySelector('#rec-meds-lista-original .doc-med-card')) {
        // não abre submodal; apenas deixa lista vazia para clicar em + Medicamento
      }
    });
  };

  RegistrarConsulta.saveReceita=function(imprimir=false,tipoPrint='receita'){
    const id=document.getElementById('doc-id')?.value || Utils.id('TMP_REC');
    const meds=this.parseMedicamentosSeguroV112();

    if(!meds.length){
      Utils.toast('Adicione ao menos um medicamento.');
      return false;
    }

    const obs=document.getElementById('rec-obs')?.value || '';
    const doc={
      id,
      ...this.pacienteDocV112(),
      medicamentos:meds,
      obs,
      orientacao:obs,
      tipoPrint,
      controleEspecial:tipoPrint==='receita-controle',
      data:Utils.today()
    };

    Documentos.add('Receita',doc);
    this.backupDocsV108 && this.backupDocsV108();

    if(imprimir){
      setTimeout(()=>{
        Impressao.print({...doc,tipoDoc:'Receita',tipoPrint});
      },80);
    }

    this.voltarParaTelaPrincipalV110 ? this.voltarParaTelaPrincipalV110() : this.restoreMainModal();
    Utils.toast(imprimir?'Receita salva e enviada para impressão.':'Receita adicionada ao atendimento.');
    return true;
  };

  RegistrarConsulta.textoAtestadoPadraoV112=function(dias='',inicio=''){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf||'[000.000.000-00]';
    const dataConsulta=Utils.today();
    const periodo=dias ? `${dias} dia(s)` : '[X]';
    const dataInicio=this.dataBRV112(inicio || this.dataHojeIsoV112());

    return `Atesto para os devidos fins que o(a) paciente ${nome}, portador(a) do CPF nº ${cpf}, esteve sob meus cuidados médicos no dia ${dataConsulta}.
Necessita de afastamento de suas atividades pelo período de ${periodo}, a contar da data de hoje, Data de início: ${dataInicio}.`;
  };

  RegistrarConsulta.atualizarTextoAtestadoV112=function(force=false){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    if(String(tipo).toLowerCase().includes('comparecimento')) return;
    const dias=document.getElementById('at-dias')?.value||'';
    const inicio=document.getElementById('at-inicio')?.value||this.dataHojeIsoV112();
    const texto=document.getElementById('at-motivo');
    if(texto && (force || !texto.dataset.editado || texto.dataset.editado==='0')){
      texto.value=this.textoAtestadoPadraoV112(dias,inicio);
      texto.dataset.editado='0';
    }
  };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.capturarTelaPrincipalV110 && this.capturarTelaPrincipalV110();
    const p=this.pac||{};
    const inicio=d.inicio||d.dataInicio||this.dataHojeIsoV112();
    const temTexto=!!(d.motivo||d.texto);
    const textoInicial=d.motivo||d.texto||this.textoAtestadoPadraoV112(d.dias||'',inicio);

    Modal.open(d.id?'Editar Atestado Médico':'Atestado Médico',`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${Utils.esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${Utils.esc(d.id||'')}">

      <div class="form-grid">
        <div class="f-col">
          <label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipo && RegistrarConsulta.toggleAtestadoTipo();RegistrarConsulta.atualizarTextoAtestadoV112(true)">
            <option ${String(d.tipo||'Atestado médico').toLowerCase().includes('atestado')?'selected':''}>Atestado médico</option>
            <option ${String(d.tipo||'').toLowerCase().includes('comparecimento')?'selected':''}>Declaração de comparecimento</option>
          </select>
        </div>
        <div class="f-col at-campo-afastamento">
          <label>Dias de afastamento</label>
          <input id="at-dias" type="number" value="${Utils.esc(d.dias||'')}" placeholder="Ex.: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV112(false)">
        </div>
        <div class="f-col at-campo-afastamento">
          <label>Data de início</label>
          <input id="at-inicio" type="date" value="${Utils.esc(inicio)}" onchange="RegistrarConsulta.atualizarTextoAtestadoV112(false)">
        </div>
        <div class="f-col at-campo-afastamento">
          <label>CID-10</label>
          <input id="at-cid" value="${Utils.esc(d.cid||'')}" placeholder="Opcional">
        </div>
        <div class="f-col at-campo-comparecimento">
          <label>Hora de chegada</label>
          <input id="at-hora-chegada" type="time" value="${Utils.esc(d.horaChegada||'')}">
        </div>
        <div class="f-col at-campo-comparecimento">
          <label>Hora de saída</label>
          <input id="at-hora-saida" type="time" value="${Utils.esc(d.horaSaida||d.hora||'')}">
        </div>
        <div class="f-col f-full">
          <label>Texto do atestado</label>
          <textarea id="at-motivo" rows="6" data-editado="${temTexto?'1':'0'}" oninput="this.dataset.editado='1'">${Utils.esc(textoInicial)}</textarea>
        </div>
        <div class="f-col f-full">
          <label>Observações</label>
          <textarea id="at-obs" rows="3">${Utils.esc(d.obs||'')}</textarea>
        </div>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarParaTelaPrincipalV110()">Cancelar</button>
      <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.saveAtestado(true)">💾🖨️ Salvar e imprimir</button>
      <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar Atestado</button>
    `,'lg');

    requestAnimationFrame(()=>{
      this.toggleAtestadoTipo && this.toggleAtestadoTipo();
      if(!temTexto) this.atualizarTextoAtestadoV112(false);
    });
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const id=document.getElementById('doc-id')?.value || Utils.id('TMP_AT');
    const tipo=document.getElementById('at-tipo')?.value || 'Atestado médico';
    const inicio=document.getElementById('at-inicio')?.value || this.dataHojeIsoV112();
    const texto=document.getElementById('at-motivo')?.value || '';
    if(!String(texto).trim()) return Utils.toast('Informe o texto do atestado.');

    const doc={
      id,
      ...this.pacienteDocV112(),
      tipo,
      tipoDocumento:'Atestado',
      dias:document.getElementById('at-dias')?.value||'',
      inicio,
      dataInicio:inicio,
      cid:document.getElementById('at-cid')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:texto,
      texto,
      obs:document.getElementById('at-obs')?.value||'',
      data:Utils.today()
    };

    Documentos.add('Atestado',doc);
    this.backupDocsV108 && this.backupDocsV108();
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),80);
    this.voltarParaTelaPrincipalV110 ? this.voltarParaTelaPrincipalV110() : this.restoreMainModal();
    Utils.toast(imprimir?'Atestado salvo e enviado para impressão.':'Atestado adicionado ao atendimento.');
    return true;
  };
})();




/* =========================================================
   ZERO V11.3 — X dos modais internos do Registrar Consulta
   Correções:
   - X de Receita/Exames/Atestado/Laudo volta para Registrar Consulta.
   - X de Adicionar Medicamento volta para Receita, não fecha Registrar Consulta.
   - X de Periodicidade volta para Adicionar Medicamento.
   - Título do submodal fechado não fica preso no título do Registrar Consulta.
   - Aplicado para todos os menus internos do Registrar Consulta.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__xModaisInternosV113) return;
  RegistrarConsulta.__xModaisInternosV113=true;

  RegistrarConsulta.__modalInternoV113='';
  RegistrarConsulta.__medModalDraftV113=null;

  RegistrarConsulta.tituloRegistrarConsultaV113=function(){
    const title=document.querySelector('#modal-root .modal-title');
    if(title && (document.querySelector('#nc-tipo') || document.querySelector('#ana-qp-motivo') || document.querySelector('#nc-s'))){
      title.innerHTML='🩺 Registrar Consulta <button type="button" class="modal-x" onclick="Modal.close()">×</button>';
    }
  };

  RegistrarConsulta.setXAtualV113=function(handler){
    requestAnimationFrame(()=>{
      const x=document.querySelector('#modal-root .modal-title .modal-x');
      if(x){
        x.setAttribute('type','button');
        x.onclick=function(ev){
          if(ev){
            ev.preventDefault();
            ev.stopPropagation();
          }
          handler();
          return false;
        };
      }
    });
  };

  RegistrarConsulta.voltarRegistroV113=function(){
    this.__modalInternoV113='';
    if(this.voltarParaTelaPrincipalV110) this.voltarParaTelaPrincipalV110();
    else if(this.restoreMainModal) this.restoreMainModal();
    requestAnimationFrame(()=>this.tituloRegistrarConsultaV113());
  };

  RegistrarConsulta.voltarReceitaV113=function(){
    this.__modalInternoV113='receita';
    const id=this.receitaContext?.id||document.getElementById('doc-id')?.value||'';
    const obs=this.receitaContext?.obs||document.getElementById('rec-obs')?.value||'';
    const meds=Array.isArray(this.receitaMeds) ? Utils.clone(this.receitaMeds) : [];
    if(this.modalReceita){
      this.modalReceita({id,medicamentos:meds,obs});
    }else{
      this.voltarRegistroV113();
    }
  };

  RegistrarConsulta.capturarMedDraftV113=function(){
    return {
      index:document.getElementById('med-edit-index')?.value ?? '',
      nome:document.getElementById('med-nome')?.value||'',
      formula:document.getElementById('med-formula')?.value||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value||'',
      quantidade:document.getElementById('med-quantidade')?.value||'',
      via:document.getElementById('med-via')?.value||'',
      posologia:document.getElementById('med-posologia')?.value||'',
      duracao:document.getElementById('med-duracao')?.value||'',
      orientacao:document.getElementById('med-orientacao')?.value||'',
      periodicidadeTexto:document.getElementById('med-periodicidade')?.value||this.periodicidadeTemp||''
    };
  };

  RegistrarConsulta.voltarMedicamentoV113=function(){
    const d=this.__medModalDraftV113||{};
    const idx=(d.index!=='' && d.index!==undefined && d.index!==null) ? Number(d.index) : null;
    this.__modalInternoV113='medicamento';
    if(this.modalAdicionarMedicamentoReceitaOriginal){
      this.modalAdicionarMedicamentoReceitaOriginal(Number.isFinite(idx)?idx:null);
      requestAnimationFrame(()=>{
        const set=(id,val)=>{const el=document.getElementById(id); if(el) el.value=val||'';};
        set('med-nome',d.nome);
        set('med-formula',d.formula);
        set('med-forma',d.formaFarmaceutica);
        set('med-quantidade',d.quantidade);
        set('med-via',d.via);
        set('med-posologia',d.posologia);
        set('med-duracao',d.duracao);
        set('med-orientacao',d.orientacao);
        set('med-periodicidade',d.periodicidadeTexto);
      });
    }else{
      this.voltarReceitaV113();
    }
  };

  function wrapModalV113(nome,tipo,voltarFn){
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old || old.__wrappedXModalV113) return;
    const wrapped=function(){
      if(['receita','pedido','atestado','laudo'].includes(tipo)){
        this.capturarTelaPrincipalV110 && this.capturarTelaPrincipalV110();
      }
      this.__modalInternoV113=tipo;
      const ret=old(...arguments);
      this.setXAtualV113(()=>this[voltarFn]());
      return ret;
    };
    wrapped.__wrappedXModalV113=true;
    RegistrarConsulta[nome]=wrapped;
  }

  wrapModalV113('modalReceita','receita','voltarRegistroV113');
  wrapModalV113('modalPedido','pedido','voltarRegistroV113');
  wrapModalV113('modalAtestado','atestado','voltarRegistroV113');
  wrapModalV113('modalLaudo','laudo','voltarRegistroV113');

  const oldAddMed=RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal?.bind(RegistrarConsulta);
  if(oldAddMed && !oldAddMed.__wrappedXModalV113){
    const wrapped=function(){
      this.__modalInternoV113='medicamento';
      const ret=oldAddMed(...arguments);
      this.setXAtualV113(()=>this.voltarReceitaV113());
      return ret;
    };
    wrapped.__wrappedXModalV113=true;
    RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal=wrapped;
  }

  const oldPeriodo=RegistrarConsulta.abrirModalPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  if(oldPeriodo && !oldPeriodo.__wrappedXModalV113){
    const wrapped=function(){
      this.__medModalDraftV113=this.capturarMedDraftV113();
      this.__modalInternoV113='periodicidade';
      const ret=oldPeriodo(...arguments);
      this.setXAtualV113(()=>this.voltarMedicamentoV113());
      return ret;
    };
    wrapped.__wrappedXModalV113=true;
    RegistrarConsulta.abrirModalPeriodicidadeMedicamento=wrapped;
  }

  // Cancela/fecha de submodal interno sem derrubar o Registrar Consulta.
  if(window.Modal && !Modal.__registrarConsultaCloseV113){
    Modal.__registrarConsultaCloseV113=true;
    const oldClose=Modal.close?.bind(Modal);
    Modal.close=function(){
      try{
        const ctx=RegistrarConsulta.__modalInternoV113||'';
        if(ctx==='receita' || ctx==='pedido' || ctx==='atestado' || ctx==='laudo'){
          RegistrarConsulta.voltarRegistroV113();
          return false;
        }
        if(ctx==='medicamento'){
          RegistrarConsulta.voltarReceitaV113();
          return false;
        }
        if(ctx==='periodicidade'){
          RegistrarConsulta.voltarMedicamentoV113();
          return false;
        }
      }catch(e){}
      return oldClose ? oldClose() : undefined;
    };
  }

  // Quando volta para Registrar Consulta, corrige título e X do modal principal.
  const oldVoltarTela=RegistrarConsulta.voltarParaTelaPrincipalV110?.bind(RegistrarConsulta);
  if(oldVoltarTela && !oldVoltarTela.__wrappedTitleV113){
    const wrapped=function(){
      this.__modalInternoV113='';
      const ret=oldVoltarTela(...arguments);
      requestAnimationFrame(()=>this.tituloRegistrarConsultaV113());
      return ret;
    };
    wrapped.__wrappedTitleV113=true;
    RegistrarConsulta.voltarParaTelaPrincipalV110=wrapped;
  }

  const oldRestore=RegistrarConsulta.restoreMainModal?.bind(RegistrarConsulta);
  if(oldRestore && !oldRestore.__wrappedTitleV113){
    const wrapped=function(){
      this.__modalInternoV113='';
      const ret=oldRestore(...arguments);
      requestAnimationFrame(()=>this.tituloRegistrarConsultaV113());
      return ret;
    };
    wrapped.__wrappedTitleV113=true;
    RegistrarConsulta.restoreMainModal=wrapped;
  }
})();




/* =========================================================
   ZERO V11.4 — Cancelar Registrar Consulta cancela atendimento
   Correções:
   - Botão Cancelar do Registrar Consulta não apenas fecha o modal.
   - Ele remove o atendimento de "Em atendimento".
   - Atendimento volta como Cancelado e sai da fila atual.
   - Se veio da agenda, agenda volta para Aguardando/Agendado conforme origem.
   - O X continua só fechando/guardando rascunho, sem cancelar.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__cancelarAtendimentoV114) return;
  RegistrarConsulta.__cancelarAtendimentoV114=true;

  RegistrarConsulta.footer=function(){
    return `<button type="button" class="btn btn-ghost btn-registro-cancelar" onclick="RegistrarConsulta.cancelarAtendimentoAtualV114()">Cancelar atendimento</button>
      <button type="button" class="btn btn-blue btn-registro-manter" onclick="RegistrarConsulta.save(false)">💾 Salvar e manter na fila</button>
      <button type="button" class="btn btn-green btn-registro-finalizar" onclick="RegistrarConsulta.save(true)">✅ Salvar e finalizar</button>`;
  };

  RegistrarConsulta.atendimentoAtualV114=function(){
    const p=this.pac||{};
    const atds=Store.get('ATENDIMENTOS')||[];

    return atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId)) ||
      atds.find(a=>String(a.pacId||a.pacienteId)===String(p.id) && ['Em atendimento','Aguardando'].includes(a.status||'')) ||
      null;
  };

  RegistrarConsulta.cancelarAtendimentoAtualV114=function(){
    const p=this.pac||{};
    const item=this.atendimentoAtualV114();

    if(!item){
      Modal.close();
      return false;
    }

    const ok=confirm('Cancelar este atendimento e tirar o paciente da fila?');
    if(!ok) return false;

    item.status='Cancelado';
    item.canceladoEm=new Date().toISOString();
    item.finalizadoEm='';
    item.horaFim='';
    item.canceladoNoRegistroConsulta=true;
    Store.upsert('ATENDIMENTOS',item);

    // Se o atendimento veio da agenda, não deixa preso como "Em atendimento".
    if(item.origemAgendaId){
      const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status='Agendado';
        ag.atendimentoId='';
        ag.histId='';
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }

    // limpa rascunho/documentos temporários do registro cancelado
    try{
      this.limparRascunhoV111 && this.limparRascunhoV111();
    }catch(e){}
    this.formDraft=null;
    this.mainFormDraftV106=null;
    this.docsBackupV108=[];
    if(window.Documentos){
      Documentos.temp=[];
      Documentos.tempBackupV108=[];
    }

    Modal.close();
    if(window.Router?.go) Router.go('atendimento');
    Utils.toast('Atendimento cancelado e removido da fila atual.');
    return false;
  };

  // Garante que qualquer renderização nova do modal use o novo footer.
  const oldRestoreMainV114=RegistrarConsulta.restoreMainModal?.bind(RegistrarConsulta);
  if(oldRestoreMainV114 && !oldRestoreMainV114.__footerCancelV114){
    const wrapped=function(){
      const ret=oldRestoreMainV114(...arguments);
      setTimeout(()=>{
        const footer=document.querySelector('#modal-root .modal-footer');
        if(footer && document.querySelector('#nc-tipo')){
          footer.innerHTML=this.footer();
        }
      },30);
      return ret;
    };
    wrapped.__footerCancelV114=true;
    RegistrarConsulta.restoreMainModal=wrapped;
  }

  const oldVoltarTelaV114=RegistrarConsulta.voltarParaTelaPrincipalV110?.bind(RegistrarConsulta);
  if(oldVoltarTelaV114 && !oldVoltarTelaV114.__footerCancelV114){
    const wrapped=function(){
      const ret=oldVoltarTelaV114(...arguments);
      setTimeout(()=>{
        const footer=document.querySelector('#modal-root .modal-footer');
        if(footer && document.querySelector('#nc-tipo')){
          footer.innerHTML=this.footer();
        }
      },30);
      return ret;
    };
    wrapped.__footerCancelV114=true;
    RegistrarConsulta.voltarParaTelaPrincipalV110=wrapped;
  }
})();




/* =========================================================
   ZERO V11.5 — Cancelar Registrar Consulta mantém na fila
   Regra correta:
   - Se abriu Registrar Consulta e clicou Cancelar, NÃO remove da fila.
   - O paciente volta para status Aguardando.
   - Sai de "Em atendimento".
   - Agenda fica Aguardando também, se veio da agenda.
   - Limpa só o rascunho do modal, não cancela o atendimento.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__cancelarMantemFilaV115) return;
  RegistrarConsulta.__cancelarMantemFilaV115=true;

  RegistrarConsulta.footer=function(){
    return `<button type="button" class="btn btn-ghost btn-registro-cancelar" onclick="RegistrarConsulta.cancelarAtendimentoAtualV114()">Cancelar e manter na fila</button>
      <button type="button" class="btn btn-blue btn-registro-manter" onclick="RegistrarConsulta.save(false)">💾 Salvar e manter na fila</button>
      <button type="button" class="btn btn-green btn-registro-finalizar" onclick="RegistrarConsulta.save(true)">✅ Salvar e finalizar</button>`;
  };

  RegistrarConsulta.cancelarAtendimentoAtualV114=function(){
    const p=this.pac||{};
    const atds=Store.get('ATENDIMENTOS')||[];

    let item=atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId));
    if(!item){
      item=atds.find(a=>String(a.pacId||a.pacienteId)===String(p.id) && ['Em atendimento','Aguardando'].includes(a.status||''));
    }

    if(item){
      item.status='Aguardando';
      item.iniciadoEm='';
      item.horaInicio='';
      item.finalizadoEm='';
      item.horaFim='';
      item.canceladoEm='';
      item.canceladoNoRegistroConsulta=false;
      Store.upsert('ATENDIMENTOS',item);

      if(item.origemAgendaId){
        const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(item.origemAgendaId));
        if(ag){
          ag.status='Aguardando';
          ag.atendimentoId=item.id;
          Store.upsert('AGENDA_MEDICA',ag);
        }
      }
    }

    // Fecha o modal e limpa apenas o rascunho da tela que foi abandonada.
    try{ this.limparRascunhoV111 && this.limparRascunhoV111(); }catch(e){}
    this.formDraft=null;
    this.mainFormDraftV106=null;
    this.docsBackupV108=[];
    if(window.Documentos){
      Documentos.temp=[];
      Documentos.tempBackupV108=[];
    }

    Modal.close();
    if(window.Router?.go) Router.go('atendimento');
    Utils.toast('Atendimento mantido na fila como Aguardando.');
    return false;
  };
})();




/* =========================================================
   ZERO V11.6 — Dois cancelamentos no Registrar Consulta
   - Cancelar e manter na fila: volta para Aguardando.
   - Cancelar atendimento: remove da fila atual como Cancelado.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__doisCancelarV116) return;
  RegistrarConsulta.__doisCancelarV116=true;

  RegistrarConsulta.footer=function(){
    return `<button type="button" class="btn btn-ghost btn-registro-cancelar" onclick="RegistrarConsulta.cancelarAtendimentoAtualV114()">Cancelar e manter na fila</button>
      <button type="button" class="btn btn-red btn-registro-cancelar-real" onclick="RegistrarConsulta.cancelarAtendimentoRemoverV116()">Cancelar atendimento</button>
      <button type="button" class="btn btn-blue btn-registro-manter" onclick="RegistrarConsulta.save(false)">💾 Salvar e manter na fila</button>
      <button type="button" class="btn btn-green btn-registro-finalizar" onclick="RegistrarConsulta.save(true)">✅ Salvar e finalizar</button>`;
  };

  RegistrarConsulta.cancelarAtendimentoRemoverV116=function(){
    const p=this.pac||{};
    const atds=Store.get('ATENDIMENTOS')||[];

    let item=atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId));
    if(!item){
      item=atds.find(a=>String(a.pacId||a.pacienteId)===String(p.id) && ['Em atendimento','Aguardando'].includes(a.status||''));
    }

    if(!item){
      Modal.close();
      if(window.Router?.go) Router.go('atendimento');
      return false;
    }

    const ok=confirm('Cancelar o atendimento e remover da fila atual?');
    if(!ok) return false;

    item.status='Cancelado';
    item.canceladoEm=new Date().toISOString();
    item.finalizadoEm='';
    item.horaFim='';
    item.canceladoNoRegistroConsulta=true;
    Store.upsert('ATENDIMENTOS',item);

    if(item.origemAgendaId){
      const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(item.origemAgendaId));
      if(ag){
        ag.status='Agendado';
        ag.atendimentoId='';
        ag.histId='';
        Store.upsert('AGENDA_MEDICA',ag);
      }
    }

    try{ this.limparRascunhoV111 && this.limparRascunhoV111(); }catch(e){}
    this.formDraft=null;
    this.mainFormDraftV106=null;
    this.docsBackupV108=[];
    if(window.Documentos){
      Documentos.temp=[];
      Documentos.tempBackupV108=[];
    }

    Modal.close();
    if(window.Router?.go) Router.go('atendimento');
    Utils.toast('Atendimento cancelado e removido da fila atual.');
    return false;
  };

  const oldRestoreMainV116=RegistrarConsulta.restoreMainModal?.bind(RegistrarConsulta);
  if(oldRestoreMainV116 && !oldRestoreMainV116.__footerDoisCancelarV116){
    const wrapped=function(){
      const ret=oldRestoreMainV116(...arguments);
      setTimeout(()=>{
        const footer=document.querySelector('#modal-root .modal-footer');
        if(footer && document.querySelector('#nc-tipo')) footer.innerHTML=this.footer();
      },30);
      return ret;
    };
    wrapped.__footerDoisCancelarV116=true;
    RegistrarConsulta.restoreMainModal=wrapped;
  }

  const oldVoltarTelaV116=RegistrarConsulta.voltarParaTelaPrincipalV110?.bind(RegistrarConsulta);
  if(oldVoltarTelaV116 && !oldVoltarTelaV116.__footerDoisCancelarV116){
    const wrapped=function(){
      const ret=oldVoltarTelaV116(...arguments);
      setTimeout(()=>{
        const footer=document.querySelector('#modal-root .modal-footer');
        if(footer && document.querySelector('#nc-tipo')) footer.innerHTML=this.footer();
      },30);
      return ret;
    };
    wrapped.__footerDoisCancelarV116=true;
    RegistrarConsulta.voltarParaTelaPrincipalV110=wrapped;
  }
})();




/* =========================================================
   ZERO V11.8 — Textos do Registrar Consulta dentro dos campos
   - Corrige palavras saindo para fora dos inputs/cards.
   - Textareas expandem corretamente sem estourar o modal.
   - Cards de documentos/anamnese quebram linha corretamente.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__layoutRegistroV118) return;
  RegistrarConsulta.__layoutRegistroV118=true;

  function marcarModalRegistroV118(){
    const modal=document.querySelector('#modal-root .modal');
    const body=document.querySelector('#modal-root .modal-body');
    if(body && (body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-s'))){
      modal?.classList.add('modal-registrar-consulta-v118');
    }
  }

  const oldAfter=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfter ? oldAfter(...arguments) : undefined;
    setTimeout(marcarModalRegistroV118,10);
    return ret;
  };

  const oldOpen=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(){
    const ret=oldOpen ? oldOpen(...arguments) : undefined;
    setTimeout(marcarModalRegistroV118,30);
    return ret;
  };

  const oldRestore=RegistrarConsulta.restoreMainModal?.bind(RegistrarConsulta);
  if(oldRestore && !oldRestore.__layoutRegistroV118){
    const wrapped=function(){
      const ret=oldRestore(...arguments);
      setTimeout(marcarModalRegistroV118,30);
      return ret;
    };
    wrapped.__layoutRegistroV118=true;
    RegistrarConsulta.restoreMainModal=wrapped;
  }

  const oldVoltar=RegistrarConsulta.voltarParaTelaPrincipalV110?.bind(RegistrarConsulta);
  if(oldVoltar && !oldVoltar.__layoutRegistroV118){
    const wrapped=function(){
      const ret=oldVoltar(...arguments);
      setTimeout(marcarModalRegistroV118,30);
      return ret;
    };
    wrapped.__layoutRegistroV118=true;
    RegistrarConsulta.voltarParaTelaPrincipalV110=wrapped;
  }
})();




/* =========================================================
   ZERO V12.0 — Últimos sinais vitais no Registrar Consulta
   Correções:
   - Busca sinais em SINAIS_VITAIS e também em HISTORICO.sinaisVitais.
   - Aceita variações dos campos: pa/pressao, fc/frequenciaCardiaca,
     temp/temperatura, spo2/saturacao, hgt/glicemia.
   - Injeta o card no Registrar Consulta mesmo se o HTML antigo não renderizar.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__ultimosSinaisV120) return;
  RegistrarConsulta.__ultimosSinaisV120=true;

  RegistrarConsulta.dataSinalV120=function(s){
    const raw=s.dataHora||s.criadoEm||s.createdAt||s.data||'';
    if(!raw) return 0;
    if(String(raw).includes('/')){
      const m=String(raw).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if(m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
    }
    const t=Date.parse(raw);
    return isNaN(t)?0:t;
  };

  RegistrarConsulta.valorSinalV120=function(s,keys){
    for(const k of keys){
      const v=s?.[k];
      if(v!==undefined && v!==null && String(v).trim()!=='') return v;
    }
    return '';
  };

  RegistrarConsulta.ultimoSinalVitalV120=function(pacId){
    pacId=String(pacId||this.pac?.id||'');
    if(!pacId) return null;

    const diretos=(Store.get('SINAIS_VITAIS')||[])
      .filter(s=>String(s.pacId||s.pacienteId||'')===pacId);

    const doHistorico=(Store.get('HISTORICO')||[])
      .filter(h=>String(h.pacId||h.pacienteId||'')===pacId && h.sinaisVitais)
      .map(h=>({
        id:'SVH_'+(h.id||Utils.id('H')),
        pacId,
        pacienteId:pacId,
        data:h.data||'',
        dataHora:h.criadoEm||h.dataHora||'',
        medico:h.medico||h.profissional||'',
        ...h.sinaisVitais
      }));

    return diretos.concat(doHistorico)
      .sort((a,b)=>this.dataSinalV120(b)-this.dataSinalV120(a))[0] || null;
  };

  RegistrarConsulta.lastVitalsHtml=function(){
    const s=this.ultimoSinalVitalV120(this.pac?.id);
    if(!s){
      return `<div class="rc-last-vitals rc-last-vitals-empty">
        <div class="rc-last-vitals-title"><strong>❤️ Últimos sinais vitais</strong></div>
        <div class="rc-last-vitals-muted">Nenhum sinal vital registrado para este paciente.</div>
      </div>`;
    }

    const pa=this.valorSinalV120(s,['pa','pressao','pressaoArterial','pressao_arterial']);
    const fc=this.valorSinalV120(s,['fc','frequenciaCardiaca','frequencia_cardiaca']);
    const fr=this.valorSinalV120(s,['fr','frequenciaRespiratoria','frequencia_respiratoria']);
    const spo2=this.valorSinalV120(s,['spo2','spO2','saturacao','saturacaoOxigenio']);
    const temp=this.valorSinalV120(s,['temp','temperatura']);
    const peso=this.valorSinalV120(s,['peso']);
    const altura=this.valorSinalV120(s,['altura']);
    const imc=this.valorSinalV120(s,['imc']);
    const hgt=this.valorSinalV120(s,['hgt','glicemia','dextro']);
    const data=s.data||Utils.today();

    const item=(l,v,suf='')=>String(v||'').trim()?`<div><span>${Utils.esc(l)}</span><strong>${Utils.esc(v)}${suf}</strong></div>`:'';

    return `<div class="rc-last-vitals rc-last-vitals-v120">
      <div class="rc-last-vitals-title"><strong>❤️ Últimos sinais vitais</strong><small>${Utils.esc(data||'')}</small></div>
      <div class="rc-last-vitals-grid">
        ${item('PA',pa)}
        ${item('FC',fc,' bpm')}
        ${item('FR',fr,' irpm')}
        ${item('SpO₂',spo2,'%')}
        ${item('Temp.',temp,' °C')}
        ${item('Peso',peso,' kg')}
        ${item('Altura',altura,' m')}
        ${item('IMC',imc)}
        ${item('HGT',hgt)}
      </div>
    </div>`;
  };

  RegistrarConsulta.garantirUltimosSinaisV120=function(){
    const body=document.querySelector('#modal-root .modal-body');
    if(!body || !(body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-s'))) return;

    let card=body.querySelector('.rc-last-vitals');
    const html=this.lastVitalsHtml();

    if(card){
      card.outerHTML=html;
      return;
    }

    const top=body.querySelector('.patient-top');
    if(top) top.insertAdjacentHTML('afterend',html);
  };

  const oldAfter=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfter ? oldAfter(...arguments) : undefined;
    setTimeout(()=>this.garantirUltimosSinaisV120(),20);
    return ret;
  };

  const oldOpen=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(){
    const ret=oldOpen ? oldOpen(...arguments) : undefined;
    setTimeout(()=>this.garantirUltimosSinaisV120(),60);
    return ret;
  };

  const oldRestore=RegistrarConsulta.restoreMainModal?.bind(RegistrarConsulta);
  if(oldRestore && !oldRestore.__sinaisV120){
    const wrapped=function(){
      const ret=oldRestore(...arguments);
      setTimeout(()=>this.garantirUltimosSinaisV120(),60);
      return ret;
    };
    wrapped.__sinaisV120=true;
    RegistrarConsulta.restoreMainModal=wrapped;
  }

  const oldVoltar=RegistrarConsulta.voltarParaTelaPrincipalV110?.bind(RegistrarConsulta);
  if(oldVoltar && !oldVoltar.__sinaisV120){
    const wrapped=function(){
      const ret=oldVoltar(...arguments);
      setTimeout(()=>this.garantirUltimosSinaisV120(),60);
      return ret;
    };
    wrapped.__sinaisV120=true;
    RegistrarConsulta.voltarParaTelaPrincipalV110=wrapped;
  }
})();




/* =========================================================
   ZERO V12.4 — Ajustes do Registrar Consulta
   - Últimos sinais vitais compactos.
   - Queixa/Motivo e Observação sempre aparecem.
   - Periodicidade selecionada salva no medicamento.
   - Histórico recebe tipo correto e observações.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__ajustesClinicosV124) return;
  RegistrarConsulta.__ajustesClinicosV124=true;

  RegistrarConsulta.garantirCamposAtendimentoV124=function(){
    const body=document.querySelector('#modal-root .modal-body');
    if(!body || !(body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-s'))) return;
    if(document.getElementById('nc-queixa-motivo-v124')) return;

    let atd=null;
    try{
      const atds=Store.get('ATENDIMENTOS')||[];
      atd=atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId))||null;
    }catch(e){}

    const queixa=atd?.procedimento||atd?.queixa||atd?.motivo||atd?.obs||'';
    const obs=atd?.obs||'';

    const html=`<div class="rc-col rc-full rc-atendimento-extra-v124">
      <label>Queixa / Motivo do atendimento</label>
      <textarea id="nc-queixa-motivo-v124" rows="2" placeholder="Queixa, motivo principal ou procedimento realizado">${Utils.esc(queixa)}</textarea>
    </div>
    <div class="rc-col rc-full rc-atendimento-extra-v124">
      <label>Observação do atendimento</label>
      <textarea id="nc-observacao-geral-v124" rows="2" placeholder="Observações gerais do atendimento">${Utils.esc(obs)}</textarea>
    </div>`;

    const cid=document.getElementById('nc-cid')?.closest('.rc-col');
    if(cid) cid.insertAdjacentHTML('afterend',html);
    else body.querySelector('.rc-form-grid')?.insertAdjacentHTML('afterbegin',html);
  };

  RegistrarConsulta.campoV124=function(id){
    return (document.getElementById(id)?.value||'').trim();
  };

  RegistrarConsulta.tipoHistoricoLabelV124=function(tipo){
    const t=String(tipo||'Consulta').toLowerCase();
    if(t.includes('proced')) return 'Procedimento';
    if(t.includes('emerg')) return 'Emergência';
    if(t.includes('urg')) return 'Urgência';
    if(t.includes('retorno')) return 'Retorno';
    return 'Consulta';
  };

  const oldAfterV124=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfterV124 ? oldAfterV124(...arguments) : undefined;
    setTimeout(()=>this.garantirCamposAtendimentoV124(),20);
    return ret;
  };

  const oldOpenV124=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(){
    const ret=oldOpenV124 ? oldOpenV124(...arguments) : undefined;
    setTimeout(()=>this.garantirCamposAtendimentoV124(),80);
    return ret;
  };

  // Periodicidade: guarda as opções marcadas no campo do medicamento e no draft.
  RegistrarConsulta.coletarPeriodicidadeSelecionadaV124=function(){
    const marcados=Array.from(document.querySelectorAll('#modal-root input[type="checkbox"]:checked,#modal-root input[type="radio"]:checked'))
      .map(x=>x.value||x.dataset.label||'')
      .filter(Boolean);
    const textos=Array.from(document.querySelectorAll('#modal-root textarea,#modal-root input[type="text"],#modal-root input:not([type])'))
      .map(x=>x.value||'')
      .filter(v=>String(v).trim());
    return [...marcados,...textos].join(' • ').trim();
  };

  const oldAplicarPeriodoV124=RegistrarConsulta.aplicarPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
    const txt=this.coletarPeriodicidadeSelecionadaV124();
    if(txt) this.periodicidadeTemp=txt;

    const ret=oldAplicarPeriodoV124 ? oldAplicarPeriodoV124(...arguments) : undefined;

    setTimeout(()=>{
      const val=this.periodicidadeTemp||txt||'';
      ['med-periodicidade','med-posologia','med-frequencia'].forEach(id=>{
        const el=document.getElementById(id);
        if(el && val && !String(el.value||'').includes(val)) el.value=val;
      });
      if(this.__medModalDraftV113) this.__medModalDraftV113.periodicidadeTexto=val;
      if(this.medDraftTempV97) this.medDraftTempV97.periodicidadeTexto=val;
    },60);

    return ret;
  };

  const oldSalvarAtendimentoV124=(RegistrarConsulta.salvarAtendimentoV110||RegistrarConsulta.save)?.bind(RegistrarConsulta);
  RegistrarConsulta.save=function(finalizar=true){
    const tipo=document.getElementById('nc-tipo')?.value||'Consulta';
    const queixa=this.campoV124('nc-queixa-motivo-v124');
    const obsExtra=this.campoV124('nc-observacao-geral-v124');
    const pacId=this.pac?.id||'';
    const atendimentoId=this.atendimentoId||this.consId||'';

    const ret=oldSalvarAtendimentoV124 ? oldSalvarAtendimentoV124(finalizar) : false;

    try{
      const hist=(Store.get('HISTORICO')||[])
        .filter(h=>String(h.pacId||h.pacienteId||'')===String(pacId))
        .sort((a,b)=>(Date.parse(b.criadoEm||'')||0)-(Date.parse(a.criadoEm||'')||0))[0];

      if(hist){
        hist.tipo=tipo;
        hist.tipoAtendimento=tipo;
        hist.tipoConsulta=tipo;
        hist.tituloHistorico=this.tipoHistoricoLabelV124(tipo);
        hist.queixaMotivo=queixa||hist.queixaMotivo||hist.queixa||'';
        hist.motivo=queixa||hist.motivo||'';
        hist.obs=obsExtra || hist.obs || '';
        if(queixa && !String(hist.evolucao||hist.S||'').includes(queixa)){
          hist.evolucao=[queixa,hist.evolucao||hist.S||''].filter(Boolean).join('\n');
          hist.S=hist.evolucao;
        }
        Store.upsert('HISTORICO',hist);
      }

      const atd=(Store.get('ATENDIMENTOS')||[]).find(a=>String(a.id)===String(atendimentoId));
      if(atd){
        atd.tipo=tipo;
        atd.tipoConsulta=tipo;
        atd.queixa=queixa||atd.queixa||'';
        atd.obs=obsExtra||atd.obs||'';
        Store.upsert('ATENDIMENTOS',atd);
      }
    }catch(e){console.warn('V12.4 pós-salvamento',e);}

    return ret;
  };
})();




/* =========================================================
   ZERO V12.5 — Registrar Consulta aparece só depois de restaurar
   - Reduz piscada ao abrir pelo botão Atender.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__openStableV125) return;
  RegistrarConsulta.__openStableV125=true;

  const oldOpen=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(){
    document.body.classList.add('registrar-open-stable-v125');
    const ret=oldOpen ? oldOpen(...arguments) : undefined;

    requestAnimationFrame(()=>{
      try{
        this.afterRender && this.afterRender();
        this.restoreMainFormV106 && this.restoreMainFormV106();
        this.garantirCamposAtendimentoV124 && this.garantirCamposAtendimentoV124();
        this.garantirUltimosSinaisV120 && this.garantirUltimosSinaisV120();
        this.renderCards && this.renderCards();
      }catch(e){}
      requestAnimationFrame(()=>document.body.classList.remove('registrar-open-stable-v125'));
    });

    return ret;
  };
})();




/* =========================================================
   ZERO V13.0 — Queixa/Motivo e Observação em card igual Sinais Vitais
   Correções:
   - Queixa/Motivo aparece no topo do Registrar Consulta.
   - Observação aparece no topo do Registrar Consulta.
   - Visual no mesmo padrão do card Últimos sinais vitais.
   - Não fica mais como campos soltos no meio do formulário.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__queixaObsCardV130) return;
  RegistrarConsulta.__queixaObsCardV130=true;

  RegistrarConsulta.dadosAtendimentoAtualV130=function(){
    try{
      const atds=Store.get('ATENDIMENTOS')||[];
      return atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId))||{};
    }catch(e){
      return {};
    }
  };

  RegistrarConsulta.queixaObsCardHtmlV130=function(){
    const atd=this.dadosAtendimentoAtualV130();
    const queixa=atd.queixa||atd.motivo||atd.procedimento||atd.obs||'';
    const obs=atd.obs||'';

    return `<div class="rc-queixa-obs-card-v130">
      <div class="rc-queixa-obs-title-v130">
        <strong>📝 Queixa / Motivo e Observação</strong>
      </div>

      <div class="rc-queixa-obs-grid-v130">
        <div class="rc-queixa-obs-box-v130">
          <span>Queixa / Motivo</span>
          <textarea id="nc-queixa-motivo-v124" rows="2" placeholder="Queixa, motivo principal ou procedimento realizado">${Utils.esc(queixa)}</textarea>
        </div>

        <div class="rc-queixa-obs-box-v130">
          <span>Observação</span>
          <textarea id="nc-observacao-geral-v124" rows="2" placeholder="Observações gerais do atendimento">${Utils.esc(obs)}</textarea>
        </div>
      </div>
    </div>`;
  };

  RegistrarConsulta.garantirQueixaObsCardV130=function(){
    const body=document.querySelector('#modal-root .modal-body');
    if(!body || !(body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-cid'))) return;

    // remove versão antiga solta criada no V12.4
    body.querySelectorAll('.rc-atendimento-extra-v124').forEach(el=>el.remove());

    let card=body.querySelector('.rc-queixa-obs-card-v130');
    const html=this.queixaObsCardHtmlV130();

    if(card){
      const q=document.getElementById('nc-queixa-motivo-v124')?.value||'';
      const o=document.getElementById('nc-observacao-geral-v124')?.value||'';
      card.outerHTML=html;
      setTimeout(()=>{
        const qEl=document.getElementById('nc-queixa-motivo-v124');
        const oEl=document.getElementById('nc-observacao-geral-v124');
        if(qEl && q) qEl.value=q;
        if(oEl && o) oEl.value=o;
      },0);
      return;
    }

    const sinais=body.querySelector('.rc-last-vitals');
    if(sinais){
      sinais.insertAdjacentHTML('afterend',html);
      return;
    }

    const top=body.querySelector('.patient-top');
    if(top){
      top.insertAdjacentHTML('afterend',html);
      return;
    }

    body.querySelector('.rc-form-grid')?.insertAdjacentHTML('afterbegin',html);
  };

  // substitui o método antigo, mas mantém compatibilidade com chamadas existentes
  RegistrarConsulta.garantirCamposAtendimentoV124=function(){
    return this.garantirQueixaObsCardV130();
  };

  const oldAfter=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfter ? oldAfter(...arguments) : undefined;
    setTimeout(()=>this.garantirQueixaObsCardV130(),25);
    return ret;
  };

  const oldOpen=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(){
    const ret=oldOpen ? oldOpen(...arguments) : undefined;
    setTimeout(()=>this.garantirQueixaObsCardV130(),90);
    return ret;
  };

  const oldRestore=RegistrarConsulta.restoreMainModal?.bind(RegistrarConsulta);
  if(oldRestore && !oldRestore.__queixaObsV130){
    const wrapped=function(){
      const ret=oldRestore(...arguments);
      setTimeout(()=>this.garantirQueixaObsCardV130(),80);
      return ret;
    };
    wrapped.__queixaObsV130=true;
    RegistrarConsulta.restoreMainModal=wrapped;
  }

  const oldVoltar=RegistrarConsulta.voltarParaTelaPrincipalV110?.bind(RegistrarConsulta);
  if(oldVoltar && !oldVoltar.__queixaObsV130){
    const wrapped=function(){
      const ret=oldVoltar(...arguments);
      setTimeout(()=>this.garantirQueixaObsCardV130(),80);
      return ret;
    };
    wrapped.__queixaObsV130=true;
    RegistrarConsulta.voltarParaTelaPrincipalV110=wrapped;
  }
})();




/* =========================================================
   ZERO V13.1 — Periodicidade marcada e personalizada salva de verdade
   Correções:
   - Salva exatamente as opções marcadas na periodicidade.
   - Salva texto personalizado.
   - Mantém a periodicidade quando volta para o modal do medicamento.
   - Ao clicar Aplicar no medicamento, grava a periodicidade no item da receita.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__periodicidadeSalvaV131) return;
  RegistrarConsulta.__periodicidadeSalvaV131=true;

  RegistrarConsulta.capturarMedAtualV131=function(){
    return {
      index:document.getElementById('med-edit-index')?.value ?? '',
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      forma:document.getElementById('med-forma')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      duracao:document.getElementById('med-duracao')?.value?.trim()||'',
      usoContinuo:document.getElementById('med-uso-continuo')?.value||'false',
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };
  };

  RegistrarConsulta.restaurarMedAtualV131=function(d){
    if(!d) return;
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
    set('med-nome',d.nome);
    set('med-formula',d.formula);
    set('med-forma',d.forma);
    set('med-quantidade',d.quantidade);
    set('med-via',d.via||'Oral');
    set('med-dose',d.dose);
    set('med-duracao',d.duracao);
    set('med-uso-continuo',d.usoContinuo||'false');
    set('med-orientacao',d.orientacao);
  };

  RegistrarConsulta.normalizarPeriodicidadeV131=function(opts=[],personalizado=''){
    const marcadas=(opts||[]).map(x=>String(x||'').trim()).filter(Boolean);
    personalizado=String(personalizado||'').trim();

    const partes=marcadas.map(v=>{
      if(v==='Personalizado'){
        return personalizado ? 'Personalizado: '+personalizado : 'Personalizado';
      }
      return v;
    }).filter(Boolean);

    // Se digitou personalizado mas não marcou a caixa, salva mesmo assim.
    if(personalizado && !partes.some(x=>x.toLowerCase().includes('personalizado'))){
      partes.push('Personalizado: '+personalizado);
    }

    return partes.join(' + ');
  };

  RegistrarConsulta.lerPeriodicidadeAtualV131=function(){
    const opts1=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
    const pers1=document.getElementById('period-personalizado-texto')?.value?.trim()||'';

    const opts2=Array.from(document.querySelectorAll('input[name="med-periodicidade"]:checked')).map(x=>x.value);
    const pers2=document.getElementById('med-periodicidade-personalizada')?.value?.trim()||'';

    const resumo=document.getElementById('med-periodicidade-resumo')?.textContent?.trim()||'';

    const txt1=this.normalizarPeriodicidadeV131(opts1,pers1);
    const txt2=this.normalizarPeriodicidadeV131(opts2,pers2);

    return txt1 || txt2 || resumo || this.periodicidadeTemp || '';
  };

  RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
    const draft=this.__medModalDraftV113 || this.capturarMedAtualV131();
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
    const personalizado=document.getElementById('period-personalizado-texto')?.value?.trim()||'';
    const texto=this.normalizarPeriodicidadeV131(opts,personalizado) || 'A cada 8h';

    this.periodicidadeTemp=texto;
    this.__periodicidadeMarcadaV131={opts,personalizado,texto};
    this.__medDraftV131={...draft, periodicidadeTexto:texto};

    const idx=draft?.index;
    this.__modalInternoV113='medicamento';
    this.modalAdicionarMedicamentoReceitaOriginal(idx!=='' && idx!=null ? Number(idx) : null);

    setTimeout(()=>{
      this.restaurarMedAtualV131(this.__medDraftV131);
      const el=document.getElementById('med-periodicidade-resumo');
      if(el) el.textContent=texto;

      // Também marca no modelo com checkboxes se este layout estiver presente.
      document.querySelectorAll('input[name="med-periodicidade"]').forEach(ch=>{
        ch.checked=opts.includes(ch.value) || (ch.value==='Personalizado' && !!personalizado);
      });
      const p=document.getElementById('med-periodicidade-personalizada');
      if(p) p.value=personalizado;
      if(this.toggleMedPersonalizado) this.toggleMedPersonalizado();
    },80);

    return false;
  };

  const oldAbrirV131=RegistrarConsulta.abrirModalPeriodicidadeMedicamento?.bind(RegistrarConsulta);
  RegistrarConsulta.abrirModalPeriodicidadeMedicamento=function(){
    this.__medDraftV131=this.capturarMedAtualV131();
    this.__medModalDraftV113={...this.__medDraftV131};
    const atual=this.lerPeriodicidadeAtualV131();
    if(atual) this.periodicidadeTemp=atual;
    const ret=oldAbrirV131 ? oldAbrirV131(...arguments) : undefined;

    setTimeout(()=>{
      const texto=this.periodicidadeTemp||atual||'';
      const pers=(texto.match(/Personalizado:\s*(.+)$/i)||[])[1]||'';
      if(pers){
        const p=document.getElementById('period-personalizado-texto');
        if(p) p.value=pers.trim();
      }
      if(this.togglePeriodicidadePersonalizada) this.togglePeriodicidadePersonalizada();
    },60);

    return ret;
  };

  RegistrarConsulta.aplicarMedicamentoReceitaOriginal=function(){
    const indexRaw=document.getElementById('med-edit-index')?.value;
    const duracao=document.getElementById('med-duracao')?.value?.trim()||'';
    const periodicidade=this.lerPeriodicidadeAtualV131() || 'A cada 8h';
    this.periodicidadeTemp=periodicidade;

    const med={
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      periodicidades:this.__periodicidadeMarcadaV131?.opts||[],
      periodicidadePersonalizada:this.__periodicidadeMarcadaV131?.personalizado||'',
      periodicidadeTexto:periodicidade,
      posologia:[document.getElementById('med-dose')?.value?.trim()||'', periodicidade].filter(Boolean).join(' - '),
      duracao,
      usoContinuo:String(duracao).toLowerCase().includes('contínuo') ||
        String(duracao).toLowerCase().includes('continuo') ||
        String(periodicidade).toLowerCase().includes('uso contínuo') ||
        String(periodicidade).toLowerCase().includes('uso continuo'),
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };

    if(!med.nome){
      Utils.toast('Informe o medicamento.');
      return false;
    }

    if(!Array.isArray(this.receitaMeds)) this.receitaMeds=[];
    if(indexRaw!=='' && indexRaw!=null && !isNaN(Number(indexRaw))) this.receitaMeds[Number(indexRaw)]=med;
    else this.receitaMeds.push(med);

    this.__periodicidadeMarcadaV131=null;
    this.__medDraftV131=null;
    this.__medModalDraftV113=null;

    if(this.voltarParaReceita) this.voltarParaReceita();
    else this.modalReceita({id:this.receitaContext?.id||'', medicamentos:this.receitaMeds, obs:this.receitaContext?.obs||''});

    return true;
  };
})();




/* =========================================================
   ZERO V13.3 — Registrar Consulta: submodais estáveis + queixa/obs somente leitura
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__modaisClinicosSemPiscarV133) return;
  RegistrarConsulta.__modaisClinicosSemPiscarV133=true;

  RegistrarConsulta.dadosAtendimentoAtualV133=function(){
    try{
      const atds=Store.get('ATENDIMENTOS')||[];
      const atd=atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId))||{};
      let ag={};
      if(atd.origemAgendaId){
        ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(atd.origemAgendaId))||{};
      }
      return {...ag,...atd};
    }catch(e){
      return {};
    }
  };

  RegistrarConsulta.queixaObsCardHtmlV130=function(){
    const atd=this.dadosAtendimentoAtualV133 ? this.dadosAtendimentoAtualV133() : {};
    const queixa=atd.queixa||atd.motivo||atd.procedimento||atd.obs||'';
    const obs=atd.obs||'';

    return `<div class="rc-queixa-obs-card-v130 rc-queixa-obs-readonly-v133">
      <div class="rc-queixa-obs-title-v130">
        <strong>📝 Queixa / Motivo e Observação</strong>
      </div>

      <input type="hidden" id="nc-queixa-motivo-v124" value="${Utils.esc(queixa)}">
      <input type="hidden" id="nc-observacao-geral-v124" value="${Utils.esc(obs)}">

      <div class="rc-queixa-obs-grid-v130">
        <div class="rc-queixa-obs-box-v130">
          <span>Queixa / Motivo</span>
          <div class="rc-readonly-text-v133">${Utils.esc(queixa||'Não informado no agendamento.').replace(/\n/g,'<br>')}</div>
        </div>

        <div class="rc-queixa-obs-box-v130">
          <span>Observação</span>
          <div class="rc-readonly-text-v133">${Utils.esc(obs||'Não informado no agendamento.').replace(/\n/g,'<br>')}</div>
        </div>
      </div>
    </div>`;
  };

  RegistrarConsulta.garantirQueixaObsCardV130=function(){
    const body=document.querySelector('#modal-root .modal-body');
    if(!body || !(body.querySelector('#nc-tipo') || body.querySelector('#ana-qp-motivo') || body.querySelector('#nc-cid'))) return;

    body.querySelectorAll('.rc-atendimento-extra-v124').forEach(el=>el.remove());

    const html=this.queixaObsCardHtmlV130();
    const card=body.querySelector('.rc-queixa-obs-card-v130');

    if(card){
      card.outerHTML=html;
      return;
    }

    const sinais=body.querySelector('.rc-last-vitals');
    if(sinais) return sinais.insertAdjacentHTML('afterend',html);

    const top=body.querySelector('.patient-top');
    if(top) return top.insertAdjacentHTML('afterend',html);

    body.querySelector('.rc-form-grid')?.insertAdjacentHTML('afterbegin',html);
  };

  RegistrarConsulta.abrirSubmodalClinicoV133=function(ctx,fn,args){
    try{
      this.capturarTelaPrincipalV110 && this.capturarTelaPrincipalV110();
    }catch(e){}

    this.__modalInternoV113=ctx;
    if(window.Modal){
      Modal.stackOpenV133=true;
      Modal.stackContextV133=ctx;
    }

    const ret=fn.apply(this,args||[]);

    if(window.Modal){
      Modal.stackOpenV133=false;
      Modal.stackContextV133='';
    }

    setTimeout(()=>{
      const layer=Modal?.topLayerV133?.();
      if(layer) layer.setAttribute('data-context',ctx);
      document.body.classList.remove('modal-stabilizing-body-v129','modal-freeze-v99');
      document.getElementById('modal-root')?.classList.remove('modal-stabilizing-v129','modal-switching-v96','modal-switching-v97','modal-switching-v99');
    },20);

    return ret;
  };

  function wrapClinicoV133(nome,ctx){
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old || old.__clinicoV133) return;
    const wrapped=function(){
      return this.abrirSubmodalClinicoV133(ctx,old,arguments);
    };
    wrapped.__clinicoV133=true;
    RegistrarConsulta[nome]=wrapped;
  }

  wrapClinicoV133('modalReceita','receita');
  wrapClinicoV133('modalPedido','pedido');
  wrapClinicoV133('modalAtestado','atestado');
  wrapClinicoV133('modalLaudo','laudo');
  wrapClinicoV133('modalAdicionarMedicamentoReceitaOriginal','medicamento');
  wrapClinicoV133('abrirModalPeriodicidadeMedicamento','periodicidade');

  RegistrarConsulta.fecharSubmodalV133=function(){
    if(window.Modal) return Modal.close();
    return false;
  };

  // Fecha só o submodal de cima e volta para o modal de baixo, sem reconstruir a tela toda.
  RegistrarConsulta.voltarRegistroV113=RegistrarConsulta.fecharSubmodalV133;
  RegistrarConsulta.voltarReceitaV113=RegistrarConsulta.fecharSubmodalV133;
  RegistrarConsulta.voltarMedicamentoV113=RegistrarConsulta.fecharSubmodalV133;
  RegistrarConsulta.docCloseToRegistro=RegistrarConsulta.fecharSubmodalV133;
})();


/* =========================================================
   ZERO V13.4 — Registrar consulta: submodais e campos estáveis
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__estavelFinalV134) return;
  RegistrarConsulta.__estavelFinalV134=true;

  RegistrarConsulta.captureFormV134=function(){
    const root=document.querySelector('#modal-root .modal-backdrop:last-child .modal-body') || document.querySelector('.modal-body');
    if(!root) return;
    const data={};
    root.querySelectorAll('input,textarea,select').forEach(el=>{
      if(!el.id && !el.name) return;
      const key=el.id || ('name:'+el.name+':'+el.value);
      data[key]=(el.type==='checkbox' || el.type==='radio') ? !!el.checked : el.value;
    });
    this.formDraft=data;
  };

  const submods=['modalReceita','modalPedido','modalAtestado','modalLaudo','modalAdicionarMedicamentoReceitaOriginal','abrirModalPeriodicidadeMedicamento'];
  submods.forEach(nome=>{
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old || old.__v134wrap) return;
    const wrapped=function(){
      try{ this.captureFormV134(); }catch(e){}
      if(window.Modal){ Modal.stackOpenV133=true; Modal.stackContextV133=nome; }
      document.body.classList.add('modal-open-v99');
      document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');
      const ret=old.apply(this,arguments);
      setTimeout(()=>{
        document.body.classList.add('modal-open-v99');
        document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');
        const root=document.getElementById('modal-root');
        if(root) root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
      },0);
      return ret;
    };
    wrapped.__v134wrap=true;
    RegistrarConsulta[nome]=wrapped;
  });

  const oldAfter=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    if(oldAfter) oldAfter();
    setTimeout(()=>{
      this.garantirQueixaObsCardV130 && this.garantirQueixaObsCardV130();
      const q=document.getElementById('nc-queixa-motivo-v124');
      const o=document.getElementById('nc-observacao-geral-v124');
      if(q) q.value=q.value||'';
      if(o) o.value=o.value||'';
    },20);
  };
})();




/* =========================================================
   ZERO V13.5 — Registrar Consulta: abertura clínica empilhada sem piscar
   Alvos:
   - Nova Receita
   - Pedido/Solicitação de Exames
   - Atestado
   - Laudo
   - + Medicamento
   - Periodicidade
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__clinicoZeroPiscarV135) return;
  RegistrarConsulta.__clinicoZeroPiscarV135=true;

  RegistrarConsulta.prepararSubmodalClinicoV135=function(ctx){
    try{ this.captureFormV134 ? this.captureFormV134() : (this.captureForm && this.captureForm()); }catch(e){}
    this.__modalInternoV113=ctx||'clinico';
    this.__clinicoStackAtivoV135=true;

    if(window.Modal && Modal.setNextStackV135){
      Modal.setNextStackV135(ctx||'clinico');
    }else if(window.Modal){
      Modal.__appendNextV135=true;
      Modal.__contextNextV135=ctx||'clinico';
    }

    document.body.classList.add('modal-open-v99','modal-clinico-stack-v135');
    document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');

    const root=document.getElementById('modal-root');
    if(root){
      root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
      root.style.visibility='visible';
      root.style.opacity='1';
    }
  };

  RegistrarConsulta.finalizarSubmodalClinicoV135=function(){
    this.__clinicoStackAtivoV135=false;
    if(window.Modal && Modal.syncLayersV135) Modal.syncLayersV135();

    document.body.classList.add('modal-open-v99');
    document.body.classList.remove('modal-freeze-v99','modal-stabilizing-body-v129');

    const root=document.getElementById('modal-root');
    if(root){
      root.classList.remove('modal-switching-v96','modal-switching-v97','modal-switching-v99','modal-stabilizing-v129');
      root.querySelectorAll('.modal-footer button,.modal-title button,.modal-body button').forEach(b=>{
        if(!b.getAttribute('type')) b.setAttribute('type','button');
      });
    }
  };

  function wrapV135(nome,ctx){
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old || old.__zeroPiscarV135) return;
    const wrapped=function(){
      this.prepararSubmodalClinicoV135(ctx);
      let ret;
      try{
        ret=old(...arguments);
      }finally{
        setTimeout(()=>this.finalizarSubmodalClinicoV135(),0);
        requestAnimationFrame(()=>this.finalizarSubmodalClinicoV135());
        setTimeout(()=>this.finalizarSubmodalClinicoV135(),40);
      }
      return ret;
    };
    wrapped.__zeroPiscarV135=true;
    RegistrarConsulta[nome]=wrapped;
  }

  wrapV135('modalReceita','receita');
  wrapV135('modalPedido','pedido');
  wrapV135('modalAtestado','atestado');
  wrapV135('modalLaudo','laudo');
  wrapV135('modalAdicionarMedicamentoReceitaOriginal','medicamento');
  wrapV135('abrirModalPeriodicidadeMedicamento','periodicidade');

  // Voltar/Cancelar/X fecha apenas a camada de cima. Não reconstruir a tela toda.
  RegistrarConsulta.fecharCamadaClinicaV135=function(){
    if(window.Modal && Modal.close) return Modal.close();
    return false;
  };

  RegistrarConsulta.voltarRegistroV113=RegistrarConsulta.fecharCamadaClinicaV135;
  RegistrarConsulta.voltarReceitaV113=RegistrarConsulta.fecharCamadaClinicaV135;
  RegistrarConsulta.voltarMedicamentoV113=RegistrarConsulta.fecharCamadaClinicaV135;
  RegistrarConsulta.docCloseToRegistro=RegistrarConsulta.fecharCamadaClinicaV135;

  // Botões que foram escritos antes com chamada antiga continuam fechando só a camada.
  document.addEventListener('click',function(ev){
    const el=ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if(!el || !document.querySelector('#modal-root .modal-backdrop')) return;

    const onclick=String(el.getAttribute('onclick')||'');
    if(onclick.includes('docCloseToRegistro') || onclick.includes('voltarRegistroV113') || onclick.includes('voltarReceitaV113') || onclick.includes('voltarMedicamentoV113')){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      RegistrarConsulta.fecharCamadaClinicaV135();
      return false;
    }
  },true);
})();




/* =========================================================
   ZERO V13.7 — Receita/Medicamento/Periodicidade não fecham Registrar Consulta
   Correções:
   - Salvar receita/exame/atestado/laudo volta para Registrar Consulta sem fechar.
   - X/Cancelar fecha só o submodal de cima.
   - Medicamento salva de verdade no array da receita.
   - Periodicidade marcada e personalizada aparece imediatamente no medicamento.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__submodaisReceitaPeriodoV137) return;
  RegistrarConsulta.__submodaisReceitaPeriodoV137=true;

  RegistrarConsulta.abrirEmpilhadoV137=function(ctx,fn,args){
    try{ this.captureFormV134 ? this.captureFormV134() : (this.captureForm && this.captureForm()); }catch(e){}
    this.__modalInternoV113=ctx||'submodal';
    if(window.Modal){
      Modal.__appendNextV137=true;
      Modal.__contextNextV137=ctx||'submodal';
      Modal.__appendNextV135=true;
      Modal.__contextNextV135=ctx||'submodal';
      Modal.stackOpenV133=true;
      Modal.stackContextV133=ctx||'submodal';
    }
    const ret=fn.apply(this,args||[]);
    setTimeout(()=>{ if(window.Modal?.syncV137) Modal.syncV137(); },0);
    return ret;
  };

  function wrapOpenV137(nome,ctx){
    const old=RegistrarConsulta[nome]?.bind(RegistrarConsulta);
    if(!old || old.__v137stack) return;
    const wrapped=function(){
      return this.abrirEmpilhadoV137(ctx,old,arguments);
    };
    wrapped.__v137stack=true;
    RegistrarConsulta[nome]=wrapped;
  }

  wrapOpenV137('modalReceita','receita');
  wrapOpenV137('modalPedido','pedido');
  wrapOpenV137('modalAtestado','atestado');
  wrapOpenV137('modalLaudo','laudo');
  wrapOpenV137('modalAdicionarMedicamentoReceitaOriginal','medicamento');
  wrapOpenV137('abrirModalPeriodicidadeMedicamento','periodicidade');

  RegistrarConsulta.fecharSubmodalClinicoV137=function(){
    if(window.Modal?.closeTopV137) return Modal.closeTopV137();
    if(window.Modal?.close) return Modal.close();
    return false;
  };

  RegistrarConsulta.voltarRegistroV113=RegistrarConsulta.fecharSubmodalClinicoV137;
  RegistrarConsulta.voltarReceitaV113=RegistrarConsulta.fecharSubmodalClinicoV137;
  RegistrarConsulta.voltarMedicamentoV113=RegistrarConsulta.fecharSubmodalClinicoV137;
  RegistrarConsulta.docCloseToRegistro=RegistrarConsulta.fecharSubmodalClinicoV137;
  RegistrarConsulta.voltarParaReceita=function(){
    RegistrarConsulta.fecharSubmodalClinicoV137();
    setTimeout(()=>RegistrarConsulta.renderListaMedsReceitaOriginal && RegistrarConsulta.renderListaMedsReceitaOriginal(),30);
  };

  RegistrarConsulta.lerPeriodicidadeV137=function(){
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked,input[name="med-periodicidade"]:checked'))
      .map(x=>x.value).filter(Boolean);
    const personalizado=(document.getElementById('period-personalizado-texto')?.value ||
      document.getElementById('med-periodicidade-personalizada')?.value || '').trim();

    const partes=opts.map(v=>{
      if(v==='Personalizado') return personalizado ? 'Personalizado: '+personalizado : 'Personalizado';
      return v;
    }).filter(Boolean);

    if(personalizado && !partes.some(v=>String(v).toLowerCase().includes('personalizado'))){
      partes.push('Personalizado: '+personalizado);
    }

    return partes.join(' + ') ||
      document.getElementById('med-periodicidade-resumo')?.textContent?.trim() ||
      this.periodicidadeTemp || '';
  };

  RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
    const texto=this.lerPeriodicidadeV137() || 'A cada 8h';
    const personalizado=(document.getElementById('period-personalizado-texto')?.value ||
      document.getElementById('med-periodicidade-personalizada')?.value || '').trim();
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked,input[name="med-periodicidade"]:checked')).map(x=>x.value);

    this.periodicidadeTemp=texto;
    this.__periodicidadeMarcadaV137={texto,opts,personalizado};

    // Fecha só periodicidade, volta para o medicamento já aberto.
    this.fecharSubmodalClinicoV137();

    setTimeout(()=>{
      const resumo=document.getElementById('med-periodicidade-resumo');
      if(resumo) resumo.textContent=texto;

      document.querySelectorAll('input[name="med-periodicidade"]').forEach(ch=>{
        ch.checked=opts.includes(ch.value) || (ch.value==='Personalizado' && !!personalizado);
      });

      const p=document.getElementById('med-periodicidade-personalizada');
      if(p) p.value=personalizado;
      if(this.toggleMedPersonalizado) this.toggleMedPersonalizado();
    },30);

    return false;
  };

  RegistrarConsulta.aplicarMedicamentoReceitaOriginal=function(){
    const indexRaw=document.getElementById('med-edit-index')?.value;
    const periodicidade=this.lerPeriodicidadeV137() || this.periodicidadeTemp || 'A cada 8h';
    const duracao=document.getElementById('med-duracao')?.value?.trim()||'';

    const med={
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      periodicidadeTexto:periodicidade,
      periodicidades:this.__periodicidadeMarcadaV137?.opts||[],
      periodicidadePersonalizada:this.__periodicidadeMarcadaV137?.personalizado||'',
      posologia:[document.getElementById('med-dose')?.value?.trim()||'', periodicidade].filter(Boolean).join(' - '),
      duracao,
      usoContinuo:String(duracao).toLowerCase().includes('contínuo') ||
        String(duracao).toLowerCase().includes('continuo') ||
        String(periodicidade).toLowerCase().includes('uso contínuo') ||
        String(periodicidade).toLowerCase().includes('uso continuo'),
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };

    if(!med.nome){
      Utils.toast('Informe o medicamento.');
      return false;
    }

    if(!Array.isArray(this.receitaMeds)) this.receitaMeds=[];
    if(indexRaw!=='' && indexRaw!=null && !isNaN(Number(indexRaw))) this.receitaMeds[Number(indexRaw)]=med;
    else this.receitaMeds.push(med);

    this.__periodicidadeMarcadaV137=null;
    this.periodicidadeTemp=periodicidade;

    // Fecha só o submodal medicamento, volta para Receita já aberta.
    this.fecharSubmodalClinicoV137();

    setTimeout(()=>{
      if(this.renderListaMedsReceitaOriginal) this.renderListaMedsReceitaOriginal();
      const lista=document.getElementById('rec-meds-lista-original');
      if(lista && !lista.innerHTML.trim() && this.renderCards) this.renderCards();
    },40);

    Utils.toast('Medicamento adicionado à receita.');
    return true;
  };

  RegistrarConsulta.voltarRegistroPrincipalSemFecharV137=function(){
    // Fecha só o documento aberto; Registrar Consulta fica por baixo.
    this.fecharSubmodalClinicoV137();
    setTimeout(()=>{
      try{
        this.renderCards && this.renderCards();
        this.garantirQueixaObsCardV130 && this.garantirQueixaObsCardV130();
      }catch(e){}
    },50);
    return false;
  };

  RegistrarConsulta.saveReceita=function(imprimir=false,tipoPrint='receita'){
    const id=document.getElementById('doc-id')?.value || Utils.id('TMP_REC');
    const obs=document.getElementById('rec-obs')?.value || '';
    const meds=Array.isArray(this.receitaMeds) ? Utils.clone(this.receitaMeds) : [];

    if(!meds.length){
      Utils.toast('Adicione ao menos um medicamento.');
      return false;
    }

    const doc={
      id,
      ...(this.pacienteDocV112 ? this.pacienteDocV112() : {}),
      medicamentos:meds,
      obs,
      orientacao:obs,
      tipoPrint,
      controleEspecial:tipoPrint==='receita-controle',
      data:Utils.today()
    };

    Documentos.add('Receita',doc);

    if(imprimir){
      setTimeout(()=>Impressao.print({...doc,tipoDoc:'Receita',tipoPrint}),60);
    }

    this.voltarRegistroPrincipalSemFecharV137();
    Utils.toast(imprimir?'Receita salva e enviada para impressão.':'Receita adicionada ao atendimento.');
    return true;
  };

  RegistrarConsulta.savePedido=function(imprimir=false){
    const id=document.getElementById('ex-id')?.value || document.getElementById('ped-id')?.value || Utils.id('TMP_EX');
    const exames=document.getElementById('ex-exames')?.value || document.getElementById('ped-exames')?.value || document.getElementById('pedido-exames')?.value || '';
    const obs=document.getElementById('ex-obs')?.value || document.getElementById('ped-obs')?.value || '';
    if(!exames.trim()){
      Utils.toast('Informe os exames solicitados.');
      return false;
    }
    const doc={id,...(this.pacienteDocV112?this.pacienteDocV112():{}),exames,obs,data:Utils.today()};
    Documentos.add('Pedido de Exames',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),60);
    this.voltarRegistroPrincipalSemFecharV137();
    Utils.toast('Pedido de exames adicionado ao atendimento.');
    return true;
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const id=document.getElementById('at-id')?.value || Utils.id('TMP_AT');
    const doc={
      id,
      ...(this.pacienteDocV112?this.pacienteDocV112():{}),
      tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
      dias:document.getElementById('at-dias')?.value||'',
      inicio:document.getElementById('at-inicio')?.value||'',
      cid:document.getElementById('at-cid')?.value||'',
      texto:document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '',
      data:Utils.today()
    };
    if(!doc.texto.trim()){
      Utils.toast('Informe o texto do atestado.');
      return false;
    }
    Documentos.add('Atestado',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),60);
    this.voltarRegistroPrincipalSemFecharV137();
    Utils.toast('Atestado adicionado ao atendimento.');
    return true;
  };

  RegistrarConsulta.saveLaudo=function(imprimir=false){
    const id=document.getElementById('ld-id')?.value || Utils.id('TMP_LD');
    const doc={
      id,
      ...(this.pacienteDocV112?this.pacienteDocV112():{}),
      titulo:document.getElementById('ld-titulo')?.value||'Laudo médico',
      cid:document.getElementById('ld-cid')?.value||'',
      texto:document.getElementById('ld-texto')?.value||'',
      data:Utils.today()
    };
    if(!doc.texto.trim()){
      Utils.toast('Informe o texto do laudo.');
      return false;
    }
    Documentos.add('Laudo',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Laudo'}),60);
    this.voltarRegistroPrincipalSemFecharV137();
    Utils.toast('Laudo adicionado ao atendimento.');
    return true;
  };

  // intercepta X/Cancelar antigos para nunca fechar o Registrar Consulta inteiro.
  document.addEventListener('click',function(ev){
    const btn=ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if(!btn) return;
    const layers=document.querySelectorAll('#modal-root > .modal-backdrop');
    if(layers.length<=1) return;

    const txt=String(btn.textContent||'').trim().toLowerCase();
    const onclick=String(btn.getAttribute('onclick')||'');
    if(txt==='cancelar' || txt==='×' || onclick.includes('Modal.close') || onclick.includes('docCloseToRegistro') || onclick.includes('voltarRegistro') || onclick.includes('voltarReceita') || onclick.includes('voltarMedicamento')){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      RegistrarConsulta.fecharSubmodalClinicoV137();
      return false;
    }
  },true);
})();




/* =========================================================
   ZERO V14.3 — Documentos do Registrar Consulta corrigidos de verdade
   Correções:
   - Salvar Pedido / Salvar e imprimir funcionam.
   - Salvar Laudo / Salvar e imprimir não fecham Registrar Consulta.
   - Salvar Receita / Atestado / Pedido / Laudo volta para Registrar Consulta.
   - X e Cancelar dos documentos voltam para Registrar Consulta.
   - Novo documento sempre abre em branco.
   - Novo documento não sobrescreve card anterior.
   - + Medicamento salva as informações na Receita imediatamente.
   - Periodicidade marcada/personalizada salva no medicamento.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__docsModalSalvarCardsV143) return;
  RegistrarConsulta.__docsModalSalvarCardsV143=true;

  const esc=(v)=> (window.Utils && Utils.esc) ? Utils.esc(v||'') : String(v||'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const uid=(p)=> (window.Utils && Utils.id) ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.capturarRegistrarPrincipalV143=function(){
    const layer=document.querySelector('#modal-root > .modal-backdrop:last-child');
    const modal=layer?.querySelector('.modal');
    if(!modal) return;

    const body=modal.querySelector('.modal-body');
    const footer=modal.querySelector('.modal-footer');
    const title=modal.querySelector('.modal-title');

    this.__registrarMainV143={
      title:title?.innerHTML || '🩺 Registrar Consulta',
      body:body?.innerHTML || '',
      footer:footer?.innerHTML || '',
      cls:modal.className || 'modal lg',
      form:{}
    };

    body?.querySelectorAll('input,textarea,select').forEach(el=>{
      const key=el.id || (el.name ? ('name:'+el.name+':'+el.value) : '');
      if(!key) return;
      this.__registrarMainV143.form[key]=(el.type==='checkbox'||el.type==='radio') ? !!el.checked : el.value;
    });
  };

  RegistrarConsulta.restaurarRegistrarPrincipalV143=function(){
    const snap=this.__registrarMainV143;
    if(snap && snap.body){
      const size=(String(snap.cls||'').includes('xl')?'xl':String(snap.cls||'').includes('lg')?'lg':'lg');
      Modal.open('🩺 Registrar Consulta',snap.body,snap.footer||this.footer?.()||'',size);

      setTimeout(()=>{
        const body=document.querySelector('#modal-root .modal-body');
        if(body){
          body.querySelectorAll('input,textarea,select').forEach(el=>{
            const key=el.id || (el.name ? ('name:'+el.name+':'+el.value) : '');
            if(!key || !(key in snap.form)) return;
            if(el.type==='checkbox'||el.type==='radio') el.checked=!!snap.form[key];
            else el.value=snap.form[key];
          });
        }
        try{
          this.afterRender && this.afterRender();
          this.renderCards && this.renderCards();
          this.garantirQueixaObsCardV130 && this.garantirQueixaObsCardV130();
        }catch(e){}
      },40);
      return false;
    }

    // fallback: nunca fecha, reabre o registrar consulta do paciente atual.
    if(this.pac?.id && this.open) return this.open(this.pac.id,this.atendimentoId||this.consId||'');
    return false;
  };

  RegistrarConsulta.abrirDocV143=function(tipo,fn,d){
    this.capturarRegistrarPrincipalV143();
    this.__docEditandoV143=!!(d && d.id);
    this.__modalInternoV113=tipo;
    return fn.call(this,d&&d.id?d:{});
  };

  RegistrarConsulta.cancelarDocV143=function(){
    return this.restaurarRegistrarPrincipalV143();
  };

  RegistrarConsulta.pacienteDocV143=function(){
    const p=this.pac||{};
    return {
      pacId:p.id||'',
      pacienteId:p.id||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.modalReceita=function(d={}){
    return this.abrirDocV143('receita',function(d={}){
      const p=this.pac||{};
      this.receitaContext={id:d.id||'',obs:d.obs||d.orientacao||''};
      this.receitaMeds=Array.isArray(d.medicamentos) ? JSON.parse(JSON.stringify(d.medicamentos)) : [];

      Modal.open(d.id?'Editar Receita Médica':'Nova Receita Médica',`
        <div class="doc-original-banner doc-banner-green">
          Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
        </div>

        <input type="hidden" id="doc-id" value="${esc(d.id||'')}">

        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;">
          <label style="font-weight:800;color:#334155;margin:0;">Medicamentos:</label>
          <button type="button" class="btn btn-ghost btn-sm" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal()">+ Medicamento</button>
        </div>

        <div id="rec-meds-lista-original" class="receita-original-lista"></div>

        <div class="f-col f-full doc-modal-original">
          <label>Observações / Orientações ao paciente</label>
          <textarea id="rec-obs" rows="3" placeholder="Ex: Tomar com alimento. Evitar sol...">${esc(d.obs||d.orientacao||'')}</textarea>
        </div>
      `,`
        <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.cancelarDocV143()">Cancelar</button>
        <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.saveReceita(false,'receita')">💾 Salvar Receita</button>
        <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveReceita(true,'receita')">💾🖨️ Salvar e imprimir</button>
        <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>
      `,'lg');

      setTimeout(()=>{
        this.renderListaMedsReceitaOriginal && this.renderListaMedsReceitaOriginal();
        const x=document.querySelector('#modal-root .modal-x');
        if(x) x.setAttribute('onclick','RegistrarConsulta.cancelarDocV143()');
      },40);
    },d);
  };

  RegistrarConsulta.renderListaMedsReceitaOriginal=function(){
    const box=document.getElementById('rec-meds-lista-original');
    if(!box) return;
    const meds=this.receitaMeds||[];
    box.innerHTML=meds.length ? meds.map((m,i)=>`
      <div class="doc-med-card">
        <div class="doc-med-main">
          <strong>${i+1}. ${esc(m.nome||'Medicamento')}</strong>
          <div class="doc-sub">${esc([m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao,m.via,m.dose,m.periodicidadeTexto,m.duracao,m.quantidade].filter(Boolean).join(' • '))}</div>
        </div>
        <div class="doc-actions">
          <button type="button" class="btn btn-sm btn-outline" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal(${i})">✏️ Editar</button>
          <button type="button" class="btn btn-sm btn-red" onclick="RegistrarConsulta.receitaMeds.splice(${i},1);RegistrarConsulta.renderListaMedsReceitaOriginal()">Excluir</button>
        </div>
      </div>
    `).join('') : `<div class="doc-empty-card">Nenhum medicamento adicionado.</div>`;
  };

  RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal=function(index=null){
    this.__receitaAbertaV143={
      id:document.getElementById('doc-id')?.value||this.receitaContext?.id||'',
      obs:document.getElementById('rec-obs')?.value||this.receitaContext?.obs||'',
      medicamentos:JSON.parse(JSON.stringify(this.receitaMeds||[]))
    };
    const editando=index!==null && index!==undefined && index!=='';
    const m=editando ? (this.receitaMeds[Number(index)]||{}) : {};
    this.periodicidadeTemp=m.periodicidadeTexto||'A cada 8h';

    Modal.open(editando?'Editar medicamento':'Adicionar medicamento',`
      <input type="hidden" id="med-edit-index" value="${editando?Number(index):''}">
      <div class="doc-modal-original">
        <div class="form-grid">
          <div class="f-col f-full">
            <label>Princípio ativo / medicamento *</label>
            <input id="med-nome" value="${esc(m.nome||'')}" placeholder="Digite o medicamento">
          </div>
          <div class="f-col">
            <label>Concentração</label>
            <input id="med-formula" value="${esc(m.formula||m.concentracao||'')}" placeholder="Ex.: 500 mg">
          </div>
          <div class="f-col">
            <label>Forma farmacêutica</label>
            <input id="med-forma" value="${esc(m.formaFarmaceutica||m.apresentacao||'')}" placeholder="Ex.: comprimido">
          </div>
          <div class="f-col">
            <label>Quantidade</label>
            <input id="med-quantidade" value="${esc(m.quantidade||'')}" placeholder="Ex.: 1 caixa">
          </div>
          <div class="f-col">
            <label>Via</label>
            <select id="med-via">
              ${['Oral','Tópico','Intramuscular','Endovenoso','Subcutâneo','Inalatório','Oftálmico','Otológico','Nasal','Retal','Vaginal'].map(v=>`<option ${String(m.via||'Oral')===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="f-col">
            <label>Dose</label>
            <input id="med-dose" value="${esc(m.dose||'')}" placeholder="Ex.: 1 comprimido">
          </div>
          <div class="f-col">
            <label>Periodicidade</label>
            <div class="med-period-picker">
              <div id="med-periodicidade-resumo" class="med-period-current">${esc(m.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h')}</div>
              <button type="button" class="med-select-btn" onclick="RegistrarConsulta.abrirModalPeriodicidadeMedicamento()">Selecionar</button>
            </div>
          </div>
          <div class="f-col">
            <label>Duração</label>
            <input id="med-duracao" value="${esc(m.duracao||'')}" placeholder="Ex.: 7 dias / uso contínuo">
          </div>
          <div class="f-col f-full">
            <label>Orientação</label>
            <textarea id="med-orientacao" rows="3" placeholder="Orientações específicas">${esc(m.orientacao||'')}</textarea>
          </div>
        </div>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarReceitaV143()">Cancelar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.aplicarMedicamentoReceitaOriginal()">Aplicar</button>
    `,'lg');

    setTimeout(()=>{
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.voltarReceitaV143()');
    },40);
  };

  RegistrarConsulta.voltarReceitaV143=function(){
    const r=this.__receitaAbertaV143||{id:this.receitaContext?.id||'',obs:this.receitaContext?.obs||'',medicamentos:this.receitaMeds||[]};
    this.receitaContext={id:r.id||'',obs:r.obs||''};
    this.receitaMeds=Array.isArray(r.medicamentos)?JSON.parse(JSON.stringify(r.medicamentos)):[];
    this.modalReceita({id:r.id||'',obs:r.obs||'',medicamentos:this.receitaMeds});
    return false;
  };

  RegistrarConsulta.abrirModalPeriodicidadeMedicamento=function(){
    this.__medDraftV143={
      index:document.getElementById('med-edit-index')?.value||'',
      nome:document.getElementById('med-nome')?.value||'',
      formula:document.getElementById('med-formula')?.value||'',
      forma:document.getElementById('med-forma')?.value||'',
      quantidade:document.getElementById('med-quantidade')?.value||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value||'',
      duracao:document.getElementById('med-duracao')?.value||'',
      orientacao:document.getElementById('med-orientacao')?.value||'',
      periodicidadeTexto:document.getElementById('med-periodicidade-resumo')?.textContent?.trim()||this.periodicidadeTemp||'A cada 8h'
    };

    const opcoes=['A cada 8h','A cada 6h','A cada 12h','1x ao dia','2x ao dia','3x ao dia','4x ao dia','Uso contínuo','Se necessário','Personalizado'];
    const atual=this.__medDraftV143.periodicidadeTexto||'';
    const personalizado=(atual.match(/Personalizado:\s*(.+)$/i)||[])[1]||'';

    Modal.open('Selecionar periodicidade',`
      <div class="period-modal-grid">
        ${opcoes.map(op=>`<label class="period-modal-opt">
          <input type="checkbox" name="period-med-opt" value="${esc(op)}" ${atual.includes(op)?'checked':''} onchange="RegistrarConsulta.togglePeriodicidadePersonalizada && RegistrarConsulta.togglePeriodicidadePersonalizada()">
          ${esc(op)}
        </label>`).join('')}
      </div>
      <div id="period-personalizado-box" style="display:${atual.includes('Personalizado')?'block':'none'};margin-top:12px;">
        <label>Descrever periodicidade personalizada</label>
        <input id="period-personalizado-texto" value="${esc(personalizado)}" placeholder="Ex.: ao deitar, dias alternados">
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarMedicamentoV143()">Cancelar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.aplicarPeriodicidadeMedicamento()">Aplicar</button>
    `,'md');

    setTimeout(()=>{
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.voltarMedicamentoV143()');
    },40);
  };

  RegistrarConsulta.voltarMedicamentoV143=function(){
    const d=this.__medDraftV143;
    this.modalAdicionarMedicamentoReceitaOriginal(d?.index!=='' && d?.index!=null ? Number(d.index) : null);
    setTimeout(()=>{
      if(!d) return;
      const set=(id,v)=>{const el=document.getElementById(id); if(el) el.value=v||'';};
      set('med-nome',d.nome); set('med-formula',d.formula); set('med-forma',d.forma);
      set('med-quantidade',d.quantidade); set('med-via',d.via); set('med-dose',d.dose);
      set('med-duracao',d.duracao); set('med-orientacao',d.orientacao);
      const r=document.getElementById('med-periodicidade-resumo');
      if(r) r.textContent=d.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';
    },50);
    return false;
  };

  RegistrarConsulta.togglePeriodicidadePersonalizada=function(){
    const marcado=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).some(x=>x.value==='Personalizado');
    const box=document.getElementById('period-personalizado-box');
    if(box) box.style.display=marcado?'block':'none';
  };

  RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
    const personalizado=document.getElementById('period-personalizado-texto')?.value?.trim()||'';
    const texto=opts.map(v=>v==='Personalizado' && personalizado ? 'Personalizado: '+personalizado : v).filter(Boolean).join(' + ') || 'A cada 8h';

    this.periodicidadeTemp=texto;
    if(!this.__medDraftV143) this.__medDraftV143={};
    this.__medDraftV143.periodicidadeTexto=texto;
    this.__periodicidadeMarcadaV143={opts,personalizado,texto};

    return this.voltarMedicamentoV143();
  };

  RegistrarConsulta.aplicarMedicamentoReceitaOriginal=function(){
    const indexRaw=document.getElementById('med-edit-index')?.value;
    const periodicidade=document.getElementById('med-periodicidade-resumo')?.textContent?.trim() || this.periodicidadeTemp || 'A cada 8h';
    const duracao=document.getElementById('med-duracao')?.value?.trim()||'';

    const med={
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value?.trim()||'',
      periodicidadeTexto:periodicidade,
      periodicidades:this.__periodicidadeMarcadaV143?.opts||[],
      periodicidadePersonalizada:this.__periodicidadeMarcadaV143?.personalizado||'',
      posologia:[document.getElementById('med-dose')?.value?.trim()||'',periodicidade].filter(Boolean).join(' - '),
      duracao,
      usoContinuo:String(duracao).toLowerCase().includes('contínuo') || String(duracao).toLowerCase().includes('continuo') || String(periodicidade).toLowerCase().includes('uso contínuo') || String(periodicidade).toLowerCase().includes('uso continuo'),
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };

    if(!med.nome){
      Utils.toast('Informe o medicamento.');
      return false;
    }

    const r=this.__receitaAbertaV143||{};
    this.receitaMeds=Array.isArray(r.medicamentos) ? JSON.parse(JSON.stringify(r.medicamentos)) : (this.receitaMeds||[]);
    if(indexRaw!=='' && indexRaw!=null && !isNaN(Number(indexRaw))) this.receitaMeds[Number(indexRaw)]=med;
    else this.receitaMeds.push(med);

    this.receitaContext={id:r.id||this.receitaContext?.id||'',obs:r.obs||this.receitaContext?.obs||''};
    this.__receitaAbertaV143={id:this.receitaContext.id,obs:this.receitaContext.obs,medicamentos:this.receitaMeds};

    this.modalReceita({id:this.receitaContext.id,obs:this.receitaContext.obs,medicamentos:this.receitaMeds});
    setTimeout(()=>this.renderListaMedsReceitaOriginal && this.renderListaMedsReceitaOriginal(),60);
    Utils.toast('Medicamento adicionado à receita.');
    return true;
  };

  RegistrarConsulta.modalPedido=function(d={}){
    return this.abrirDocV143('pedido',function(d={}){
      const p=this.pac||{};
      Modal.open(d.id?'Editar Pedido de Exames':'Pedido de Exames',`
        <div class="doc-original-banner doc-banner-blue">
          Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
        </div>
        <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
        <div class="doc-modal-original">
          <div class="f-col f-full">
            <label>Exames solicitados</label>
            <textarea id="pe-exames" rows="7" placeholder="Ex: Hemograma completo&#10;Glicemia de jejum&#10;TSH e T4 livre">${esc(d.exames||'')}</textarea>
          </div>
          <div class="f-col f-full">
            <label>Hipótese diagnóstica / Observação</label>
            <textarea id="pe-obs" rows="4" placeholder="Observações do pedido">${esc(d.obs||'')}</textarea>
          </div>
        </div>
      `,`
        <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.cancelarDocV143()">Cancelar</button>
        <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.savePedido(true)">💾🖨️ Salvar e imprimir</button>
        <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.savePedido(false)">💾 Salvar pedido</button>
      `,'lg');

      setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.cancelarDocV143()'); },40);
    },d);
  };

  RegistrarConsulta.modalLaudo=function(d={}){
    return this.abrirDocV143('laudo',function(d={}){
      const p=this.pac||{};
      Modal.open(d.id?'Editar Laudo Médico':'Novo Laudo Médico',`
        <div class="doc-original-banner doc-banner-cyan">
          Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
        </div>
        <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
        <div class="form-grid doc-modal-original">
          <div class="f-col f-full"><label>Título do laudo</label><input id="ld-titulo" value="${esc(d.titulo||'')}" placeholder="Ex.: Laudo médico"></div>
          <div class="f-col f-full"><label>CID-10</label><input id="ld-cid" placeholder="CID" value="${esc(d.cid||'')}"></div>
          <div class="f-col f-full"><label>Laudo</label><textarea id="ld-texto" rows="10" placeholder="Digite o conteúdo do laudo...">${esc(d.texto||d.descricao||d.conclusao||'')}</textarea></div>
        </div>
      `,`
        <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.cancelarDocV143()">Cancelar</button>
        <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.saveLaudo(true)">💾🖨️ Salvar e imprimir</button>
        <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveLaudo(false)">💾 Salvar Laudo</button>
      `,'lg');
      setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.cancelarDocV143()'); },40);
    },d);
  };

  RegistrarConsulta.modalAtestado=function(d={}){
    return this.abrirDocV143('atestado',function(d={}){
      const p=this.pac||{};
      const inicio=d.inicio||d.dataInicio||this.dataHojeIsoV112?.()||'';
      const textoInicial=d.motivo||d.texto||'';
      Modal.open(d.id?'Editar Atestado Médico':'Novo Atestado Médico',`
        <div class="doc-original-banner doc-banner-purple">
          Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
        </div>
        <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
        <div class="form-grid doc-modal-original">
          <div class="f-col"><label>Tipo</label><select id="at-tipo"><option ${String(d.tipo||'Atestado médico').toLowerCase().includes('atestado')?'selected':''}>Atestado médico</option><option ${String(d.tipo||'').toLowerCase().includes('comparecimento')?'selected':''}>Declaração de comparecimento</option></select></div>
          <div class="f-col"><label>Dias de afastamento</label><input id="at-dias" type="number" value="${esc(d.dias||'')}" placeholder="Ex.: 3"></div>
          <div class="f-col"><label>Data de início</label><input id="at-inicio" type="date" value="${esc(inicio||'')}"></div>
          <div class="f-col"><label>CID-10</label><input id="at-cid" value="${esc(d.cid||'')}" placeholder="Opcional"></div>
          <div class="f-col f-full"><label>Texto</label><textarea id="at-motivo" rows="8" placeholder="Digite o texto do atestado...">${esc(textoInicial)}</textarea></div>
        </div>
      `,`
        <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.cancelarDocV143()">Cancelar</button>
        <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.saveAtestado(true)">💾🖨️ Salvar e imprimir</button>
        <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar Atestado</button>
      `,'lg');
      setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.cancelarDocV143()'); },40);
    },d);
  };

  RegistrarConsulta.saveReceita=function(imprimir=false,tipoPrint='receita'){
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('TMP_REC');
    const obs=document.getElementById('rec-obs')?.value||'';
    const meds=Array.isArray(this.receitaMeds) ? JSON.parse(JSON.stringify(this.receitaMeds)) : [];
    if(!meds.length){ Utils.toast('Adicione ao menos um medicamento.'); return false; }

    const doc={id,...this.pacienteDocV143(),medicamentos:meds,obs,orientacao:obs,tipoPrint,controleEspecial:tipoPrint==='receita-controle',data:Utils.today(),criadoEm:new Date().toISOString()};
    Documentos.add('Receita',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Receita',tipoPrint}),80);
    this.restaurarRegistrarPrincipalV143();
    setTimeout(()=>this.renderCards && this.renderCards(),80);
    Utils.toast(imprimir?'Receita salva e enviada para impressão.':'Receita adicionada ao atendimento.');
    return true;
  };

  RegistrarConsulta.savePedido=function(imprimir=false){
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('TMP_EX');
    const exames=document.getElementById('pe-exames')?.value || document.getElementById('ex-exames')?.value || document.getElementById('ped-exames')?.value || '';
    const obs=document.getElementById('pe-obs')?.value || document.getElementById('ex-obs')?.value || document.getElementById('ped-obs')?.value || '';
    if(!String(exames).trim()){ Utils.toast('Informe os exames solicitados.'); return false; }

    const doc={id,...this.pacienteDocV143(),exames,obs,data:Utils.today(),criadoEm:new Date().toISOString()};
    Documentos.add('Pedido de Exames',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),80);
    this.restaurarRegistrarPrincipalV143();
    setTimeout(()=>this.renderCards && this.renderCards(),80);
    Utils.toast(imprimir?'Pedido salvo e enviado para impressão.':'Pedido de exames adicionado ao atendimento.');
    return true;
  };

  RegistrarConsulta.saveLaudo=function(imprimir=false){
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('TMP_LD');
    const titulo=document.getElementById('ld-titulo')?.value||'Laudo médico';
    const cid=document.getElementById('ld-cid')?.value||'';
    const texto=document.getElementById('ld-texto')?.value||'';
    if(!String(texto).trim()){ Utils.toast('Informe o texto do laudo.'); return false; }

    const doc={id,...this.pacienteDocV143(),titulo,cid,texto,data:Utils.today(),criadoEm:new Date().toISOString()};
    Documentos.add('Laudo',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Laudo'}),80);
    this.restaurarRegistrarPrincipalV143();
    setTimeout(()=>this.renderCards && this.renderCards(),80);
    Utils.toast(imprimir?'Laudo salvo e enviado para impressão.':'Laudo adicionado ao atendimento.');
    return true;
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('TMP_AT');
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    const dias=document.getElementById('at-dias')?.value||'';
    const inicio=document.getElementById('at-inicio')?.value||'';
    const cid=document.getElementById('at-cid')?.value||'';
    const texto=document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '';
    if(!String(texto).trim()){ Utils.toast('Informe o texto do atestado.'); return false; }

    const doc={id,...this.pacienteDocV143(),tipo,dias,inicio,cid,texto,motivo:texto,data:Utils.today(),criadoEm:new Date().toISOString()};
    Documentos.add('Atestado',doc);
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),80);
    this.restaurarRegistrarPrincipalV143();
    setTimeout(()=>this.renderCards && this.renderCards(),80);
    Utils.toast(imprimir?'Atestado salvo e enviado para impressão.':'Atestado adicionado ao atendimento.');
    return true;
  };
})();




/* =========================================================
   ZERO V14.4 — Selecionar exames e anexar exames salvando
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__examesSelecionarAnexarV144) return;
  RegistrarConsulta.__examesSelecionarAnexarV144=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const uid=(p)=>Utils.id?Utils.id(p):(p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.examesListaV144=[
    'Hemograma completo','Glicemia de jejum','Hemoglobina glicada','Insulina','Colesterol total e frações','Triglicerídeos',
    'Ureia','Creatinina','TGO/AST','TGP/ALT','Gama GT','Fosfatase alcalina','Bilirrubinas','Sódio','Potássio',
    'TSH','T4 livre','T3 livre','Anti-TPO','Anti-tireoglobulina','Vitamina D','Vitamina B12','Ferritina','Ferro sérico',
    'PCR','VHS','EAS / Urina tipo 1','Urocultura','Microalbuminúria','Relação albumina/creatinina','Cortisol','Prolactina',
    'FSH','LH','Estradiol','Progesterona','Testosterona total','Testosterona livre','PTH','Cálcio','Fósforo','Magnésio',
    'Ultrassom de tireoide','Ultrassom abdominal','Eletrocardiograma'
  ];

  RegistrarConsulta.examesSelecionadosV144=function(){
    return Array.from(document.querySelectorAll('input[name="pe-exame-opt"]:checked')).map(x=>x.value).filter(Boolean);
  };

  RegistrarConsulta.atualizarExamesTextareaV144=function(){
    const ta=document.getElementById('pe-exames');
    if(!ta) return;
    const atual=String(ta.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const selecionados=this.examesSelecionadosV144();
    const merged=[...atual];
    selecionados.forEach(x=>{ if(!merged.includes(x)) merged.push(x); });
    ta.value=merged.join('\n');
  };

  RegistrarConsulta.marcarExamesDoTextoV144=function(){
    const texto=String(document.getElementById('pe-exames')?.value||'');
    document.querySelectorAll('input[name="pe-exame-opt"]').forEach(ch=>{
      ch.checked=texto.includes(ch.value);
    });
  };

  RegistrarConsulta.modalPedido=function(d={}){
    this.capturarRegistrarPrincipalV143 && this.capturarRegistrarPrincipalV143();
    const p=this.pac||{};
    const examesTexto=d.id ? (d.exames||'') : '';
    const obsTexto=d.id ? (d.obs||'') : '';

    Modal.open(d.id?'Editar Pedido de Exames':'Pedido de Exames',`
      <div class="doc-original-banner doc-banner-blue">
        Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">

      <div class="doc-modal-original">
        <div class="f-col f-full">
          <label>Selecionar exames</label>
          <div class="exames-select-grid-v144">
            ${this.examesListaV144.map(ex=>`<label class="exame-opt-v144">
              <input type="checkbox" name="pe-exame-opt" value="${esc(ex)}" onchange="RegistrarConsulta.atualizarExamesTextareaV144()">
              ${esc(ex)}
            </label>`).join('')}
          </div>
        </div>

        <div class="f-col f-full">
          <label>Exames solicitados</label>
          <textarea id="pe-exames" rows="7" placeholder="Ex: Hemograma completo&#10;Glicemia de jejum&#10;TSH e T4 livre" oninput="RegistrarConsulta.marcarExamesDoTextoV144()">${esc(examesTexto)}</textarea>
        </div>

        <div class="f-col f-full">
          <label>Hipótese diagnóstica / Observação</label>
          <textarea id="pe-obs" rows="4" placeholder="Observações do pedido">${esc(obsTexto)}</textarea>
        </div>
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.cancelarDocV143 ? RegistrarConsulta.cancelarDocV143() : RegistrarConsulta.restaurarRegistrarPrincipalV143()">Cancelar</button>
      <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.savePedido(true)">💾🖨️ Salvar e imprimir</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.savePedido(false)">💾 Salvar pedido</button>
    `,'lg');

    setTimeout(()=>{
      this.marcarExamesDoTextoV144();
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.cancelarDocV143 ? RegistrarConsulta.cancelarDocV143() : RegistrarConsulta.restaurarRegistrarPrincipalV143()');
    },60);
  };

  RegistrarConsulta.savePedido=function(imprimir=false){
    this.atualizarExamesTextareaV144 && this.atualizarExamesTextareaV144();

    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('TMP_PE');
    const exames=document.getElementById('pe-exames')?.value ||
      document.getElementById('ex-exames')?.value ||
      document.getElementById('ped-exames')?.value ||
      document.getElementById('pedido-exames')?.value || '';
    const obs=document.getElementById('pe-obs')?.value ||
      document.getElementById('ex-obs')?.value ||
      document.getElementById('ped-obs')?.value ||
      document.getElementById('pedido-obs')?.value || '';
    const examesSelecionados=this.examesSelecionadosV144 ? this.examesSelecionadosV144() : [];

    if(!String(exames).trim() && !examesSelecionados.length){
      Utils.toast('Selecione ou informe os exames.');
      return false;
    }

    const textoFinal=String(exames||'').trim() || examesSelecionados.join('\n');
    const doc={
      id,
      ...(this.pacienteDocV143 ? this.pacienteDocV143() : (this.pacienteDocV112 ? this.pacienteDocV112() : {})),
      exames:textoFinal,
      examesSelecionados,
      obs,
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };

    Documentos.add('Pedido de Exames',doc);
    this.backupDocsV108 && this.backupDocsV108();

    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),80);

    if(this.restaurarRegistrarPrincipalV143) this.restaurarRegistrarPrincipalV143();
    else if(this.voltarParaTelaPrincipalV110) this.voltarParaTelaPrincipalV110();

    setTimeout(()=>{
      this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
      this.renderCards && this.renderCards();
    },100);

    Utils.toast(imprimir?'Pedido salvo e enviado para impressão.':'Pedido de exames adicionado ao atendimento.');
    return true;
  };

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    try{ this.capturarRegistrarPrincipalV143 && this.capturarRegistrarPrincipalV143(); }catch(e){}
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}

    const input=ev?.target || document.getElementById('nc-anexos-exames-input');
    const files=Array.from(input?.files||[]);
    if(!files.length){
      Utils.toast('Selecione ao menos um arquivo de exame.');
      return false;
    }

    let pendentes=files.length;
    const finalizar=()=>{
      pendentes--;
      if(pendentes<=0){
        if(input) input.value='';
        this.backupDocsV108 && this.backupDocsV108();
        this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
        this.renderCards && this.renderCards();
        Utils.toast(`${files.length} exame(s) anexado(s).`);
      }
    };

    files.forEach(file=>{
      const salvar=(dataUrl='')=>{
        Documentos.add('Exame anexado',{
          id:uid('TMP_EX'),
          ...(this.pacienteDocV143 ? this.pacienteDocV143() : (this.pacienteDocV112 ? this.pacienteDocV112() : {})),
          nome:file.name,
          filename:file.name,
          tipoArquivo:file.type||'',
          mime:file.type||'',
          tamanho:file.size||0,
          dataUrl,
          arquivo:dataUrl,
          obs:'',
          data:Utils.today(),
          criadoEm:new Date().toISOString()
        });
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

  // Garante que o input de anexos sempre chama a função correta depois de qualquer render.
  const oldAfterRenderV144=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfterRenderV144 ? oldAfterRenderV144(...arguments) : undefined;
    setTimeout(()=>{
      const inp=document.getElementById('nc-anexos-exames-input');
      if(inp){
        inp.onchange=function(ev){ RegistrarConsulta.saveAnexosConsulta(ev); };
      }
      this.renderCards && this.renderCards();
    },40);
    return ret;
  };
})();




/* =========================================================
   ZERO V14.6 — Pedido/anexo do Registrar Consulta aparecem no menu Exames
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__examesMenuSalvarV146) return;
  RegistrarConsulta.__examesMenuSalvarV146=true;

  const uid=(p)=>Utils.id?Utils.id(p):(p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.savePedido=function(imprimir=false){
    if(this.atualizarExamesTextareaV144) this.atualizarExamesTextareaV144();

    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('PE');
    const exames=document.getElementById('pe-exames')?.value ||
      document.getElementById('ex-exames')?.value ||
      document.getElementById('ped-exames')?.value ||
      document.getElementById('pedido-exames')?.value || '';
    const obs=document.getElementById('pe-obs')?.value ||
      document.getElementById('ex-obs')?.value ||
      document.getElementById('ped-obs')?.value ||
      document.getElementById('pedido-obs')?.value || '';
    const examesSelecionados=this.examesSelecionadosV144 ? this.examesSelecionadosV144() : [];
    const textoFinal=String(exames||'').trim() || examesSelecionados.join('\n');

    if(!textoFinal.trim()){
      Utils.toast('Selecione ou informe os exames.');
      return false;
    }

    const doc={
      id:String(id).startsWith('TMP') ? uid('PE') : id,
      ...(this.pacienteDocV143 ? this.pacienteDocV143() : (this.pacienteDocV112 ? this.pacienteDocV112() : {})),
      exames:textoFinal,
      examesSelecionados,
      obs,
      data:Utils.today(),
      criadoEm:new Date().toISOString(),
      tipo:'Pedido de Exames',
      tipoDoc:'Pedido de Exames'
    };

    // salva no card do atendimento e também no menu Exames imediatamente
    Documentos.add('Pedido de Exames',doc);
    Store.upsert('EXAMES_PEDIDOS',Utils.clone(doc));
    this.backupDocsV108 && this.backupDocsV108();

    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),80);

    if(this.restaurarRegistrarPrincipalV143) this.restaurarRegistrarPrincipalV143();
    else if(this.voltarParaTelaPrincipalV110) this.voltarParaTelaPrincipalV110();

    setTimeout(()=>{
      this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
      this.renderCards && this.renderCards();
    },100);

    Utils.toast(imprimir?'Pedido salvo, enviado para impressão e gravado no menu Exames.':'Pedido salvo no atendimento e no menu Exames.');
    return true;
  };

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    try{ this.capturarRegistrarPrincipalV143 && this.capturarRegistrarPrincipalV143(); }catch(e){}
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}

    const input=ev?.target || document.getElementById('nc-anexos-exames-input');
    const files=Array.from(input?.files||[]);
    if(!files.length){
      Utils.toast('Selecione ao menos um arquivo de exame.');
      return false;
    }

    let pendentes=files.length;
    const finalizar=()=>{
      pendentes--;
      if(pendentes<=0){
        if(input) input.value='';
        this.backupDocsV108 && this.backupDocsV108();
        this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
        this.renderCards && this.renderCards();
        Utils.toast(`${files.length} exame(s) anexado(s) no atendimento e no menu Exames.`);
      }
    };

    files.forEach(file=>{
      const salvar=(dataUrl='')=>{
        const doc={
          id:uid('EX'),
          ...(this.pacienteDocV143 ? this.pacienteDocV143() : (this.pacienteDocV112 ? this.pacienteDocV112() : {})),
          nome:file.name,
          filename:file.name,
          tipo:'Exame anexado',
          tipoDoc:'Exame anexado',
          tipoArquivo:file.type||'',
          mime:file.type||'',
          tamanho:file.size||0,
          dataUrl:dataUrl||'',
          arquivo:dataUrl||'',
          obs:'Anexado pelo Registrar Consulta',
          data:Utils.today(),
          criadoEm:new Date().toISOString()
        };

        Documentos.add('Exame anexado',doc);
        Store.upsert('EXAMES_ARQUIVOS',Utils.clone(doc));
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
})();




/* =========================================================
   ZERO V16.0 — Registrar Consulta abre mesmo vindo de Aguardando/Agenda
   Correções:
   - Antes de abrir, garante atendimento em "Em atendimento".
   - Corrige pacId/pacienteId.
   - Remove travas visuais antigas de modal de agenda.
   - Mantém a tela original do Registrar Consulta.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__openAtendimentoFixV160) return;
  RegistrarConsulta.__openAtendimentoFixV160=true;

  RegistrarConsulta.prepararAtendimentoOpenV160=function(pacId='',atendimentoId=''){
    if(!window.Atendimento) return null;

    let item=null;
    const atds=Store.get('ATENDIMENTOS')||[];

    if(atendimentoId){
      item=atds.find(a=>String(a.id)===String(atendimentoId))||null;
    }

    if(!item && pacId){
      item=atds.find(a=>
        String(a.pacId||a.pacienteId||'')===String(pacId) &&
        ['Aguardando','Em atendimento'].includes(a.status||'')
      ) || null;
    }

    if(window.Atendimento.prepararRegistrarConsultaV160){
      item=Atendimento.prepararRegistrarConsultaV160(item?.id||atendimentoId||'',pacId) || item;
    }else if(item){
      const pid=item.pacId||item.pacienteId||pacId;
      item.pacId=pid;
      item.pacienteId=pid;
      item.status='Em atendimento';
      item.iniciadoEm=item.iniciadoEm||new Date().toISOString();
      item.horaInicio=item.horaInicio||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      Store.upsert('ATENDIMENTOS',item);
    }

    return item;
  };

  const oldOpenV160=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(pacId,atendimentoId=''){
    document.body.classList.remove(
      'agenda-config-estavel-v158','agenda-config-opening-v158',
      'agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152'
    );

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    const item=this.prepararAtendimentoOpenV160(pacId,atendimentoId);
    if(!item){
      return Utils.toast('Atendimento não encontrado na fila.');
    }

    const pid=item.pacId||item.pacienteId||pacId;
    const atId=item.id||atendimentoId||'';

    return oldOpenV160 ? oldOpenV160(pid,atId) : false;
  };
})();




/* =========================================================
   ZERO V16.1 — Registrar Consulta abre direto e estável
   Correções:
   - Não depende mais da cadeia antiga do open para liberar a tela.
   - Garante atendimento em "Em atendimento".
   - Abre o modal Registrar Consulta original com html/footer atuais.
   - Restaura cards/documentos depois de abrir.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__openDiretoEstavelV161) return;
  RegistrarConsulta.__openDiretoEstavelV161=true;

  RegistrarConsulta.encontrarOuCriarAtendimentoV161=function(pacId,atendimentoId=''){
    let item=null;
    const atds=Store.get('ATENDIMENTOS')||[];

    if(atendimentoId){
      item=atds.find(a=>String(a.id)===String(atendimentoId))||null;
    }

    if(!item){
      item=atds.find(a=>
        String(a.pacId||a.pacienteId||'')===String(pacId) &&
        ['Aguardando','Em atendimento'].includes(a.status||'')
      )||null;
    }

    if(!item){
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
        data:Utils.today(),
        hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
        criadoEm:new Date().toISOString()
      };
    }

    item.pacId=item.pacId||item.pacienteId||pacId;
    item.pacienteId=item.pacienteId||item.pacId||pacId;
    item.status='Em atendimento';
    item.iniciadoEm=item.iniciadoEm||new Date().toISOString();
    item.horaInicio=item.horaInicio||new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    Store.upsert('ATENDIMENTOS',item);

    return item;
  };

  RegistrarConsulta.open=function(pacId,atendimentoId=''){
    document.body.classList.remove(
      'agenda-config-estavel-v158','agenda-config-opening-v158',
      'agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152',
      'modal-freeze-v99','modal-stabilizing-body-v129'
    );

    const p=Store.get('PACIENTES').find(x=>String(x.id)===String(pacId));
    if(!p) return Utils.toast('Paciente não encontrado.');

    if(window.Security && !Security.canRegistrarConsulta()){
      Utils.toast('Somente perfil Médico ou Administrador pode registrar consulta.');
      return false;
    }

    const item=this.encontrarOuCriarAtendimentoV161(p.id,atendimentoId);
    if(!item) return Utils.toast('Atendimento não encontrado para este paciente.');

    const consId=item.id || atendimentoId || Utils.id('CONS');

    try{ if(window.Documentos) Documentos.start(p.id,consId); }catch(e){ console.warn(e); }

    this.pac=p;
    this.consId=consId;
    this.atendimentoId=item.id;
    this.formDraft=null;

    Modal.open('🩺 Registrar Consulta',this.html(),this.footer(),'lg');

    const aplicar=()=>{
      try{
        this.afterRender && this.afterRender();
        this.restoreMainFormV106 && this.restoreMainFormV106();
        this.garantirCamposAtendimentoV124 && this.garantirCamposAtendimentoV124();
        this.garantirUltimosSinaisV120 && this.garantirUltimosSinaisV120();
        this.restoreDocsBackupV108 && this.restoreDocsBackupV108();
        this.renderCards && this.renderCards();

        const rascunho=this.carregarRascunhoV111 ? this.carregarRascunhoV111(p.id,consId) : null;
        if(rascunho && this.aplicarRascunhoV111) this.aplicarRascunhoV111(rascunho);
      }catch(e){ console.warn('RegistrarConsulta V16.1 pós-abertura',e); }
    };

    requestAnimationFrame(aplicar);
    setTimeout(aplicar,80);

    return true;
  };
})();




/* =========================================================
   ZERO V16.2 — Receita: aplicar medicamento volta para Nova Receita e salva
   Correções:
   - Aplicar em Adicionar Medicamento volta para o modal Nova Receita Médica.
   - Medicamento aparece imediatamente na lista da receita.
   - Salvar Receita funciona depois de aplicar medicamento.
   - Cancelar Nova Receita volta para Registrar Consulta com conteúdo correto.
   - Periodicidade volta em layout estável/original, sem quebrar o modal.
   - Não usa pilha/overlay antigo para receita/medicamento/periodicidade.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__receitaMedPeriodoFixV162) return;
  RegistrarConsulta.__receitaMedPeriodoFixV162=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const clone=(v)=>JSON.parse(JSON.stringify(v||null));

  RegistrarConsulta.limparFlagsModalReceitaV162=function(){
    if(window.Modal){
      Modal.__appendNextV137=false;
      Modal.__contextNextV137='';
      Modal.__appendNextV135=false;
      Modal.__contextNextV135='';
      Modal.stackOpenV133=false;
      Modal.stackContextV133='';
    }
    document.body.classList.remove(
      'modal-freeze-v99','modal-stabilizing-body-v129',
      'agenda-config-estavel-v158','agenda-config-opening-v158'
    );
  };

  RegistrarConsulta.modalPartsV162=function(){
    const root=document.getElementById('modal-root');
    return {
      root,
      body:root?.querySelector('.modal-body,.cm-modal-body,.modal-content-body') || root?.querySelector('[class*="body"]'),
      footer:root?.querySelector('.modal-footer,.cm-modal-footer') || root?.querySelector('[class*="footer"]'),
      title:root?.querySelector('.modal-title,.cm-modal-title,h2,h3')
    };
  };

  RegistrarConsulta.coletarValoresModalV162=function(){
    const {body}=this.modalPartsV162();
    const data={};
    if(!body) return data;
    body.querySelectorAll('input,textarea,select').forEach(el=>{
      if(['button','submit','file'].includes(el.type||'')) return;
      const key=el.id || (el.name ? ('name:'+el.name+':'+el.value) : '');
      if(!key) return;
      if(el.type==='checkbox' || el.type==='radio') data[key]=!!el.checked;
      else data[key]=el.value;
    });
    return data;
  };

  RegistrarConsulta.aplicarValoresModalV162=function(data){
    const {body}=this.modalPartsV162();
    if(!body || !data) return;
    body.querySelectorAll('input,textarea,select').forEach(el=>{
      const key=el.id || (el.name ? ('name:'+el.name+':'+el.value) : '');
      if(!key || !(key in data)) return;
      if(el.type==='checkbox' || el.type==='radio') el.checked=!!data[key];
      else el.value=data[key];
    });
  };

  RegistrarConsulta.capturarRegistroPrincipalV162=function(){
    const {body,footer}=this.modalPartsV162();
    if(!body) return;
    // Só captura quando ainda estamos na tela principal do Registrar Consulta.
    if(body.querySelector('#med-nome,#rec-meds-lista-original,#period-personalizado-texto')) return;
    this.__registroSnapshotV162={
      bodyHTML:body.innerHTML,
      footerHTML:footer ? footer.innerHTML : '',
      valores:this.coletarValoresModalV162()
    };
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}
    try{ this.salvarRascunhoV111 && this.salvarRascunhoV111(); }catch(e){}
  };

  RegistrarConsulta.abrirModalLimpoV162=function(titulo,body,footer,tamanho='lg'){
    this.limparFlagsModalReceitaV162();
    Modal.open(titulo,body,footer,tamanho);
    setTimeout(()=>this.limparFlagsModalReceitaV162(),10);
    return false;
  };

  RegistrarConsulta.restaurarRegistroPrincipalV162=function(){
    this.limparFlagsModalReceitaV162();

    const snap=this.__registroSnapshotV162;
    if(snap && snap.bodyHTML){
      Modal.open('🩺 Registrar Consulta',snap.bodyHTML,snap.footerHTML||this.footer?.()||'','lg');
      setTimeout(()=>{
        this.aplicarValoresModalV162(snap.valores);
        try{ this.afterRender && this.afterRender(); }catch(e){}
        try{ this.restoreMainFormV106 && this.restoreMainFormV106(); }catch(e){}
        try{ this.restoreDocsBackupV108 && this.restoreDocsBackupV108(); }catch(e){}
        try{ this.renderCards && this.renderCards(); }catch(e){}
      },40);
      return false;
    }

    if(this.pac?.id && this.open){
      return this.open(this.pac.id,this.atendimentoId||this.consId||'');
    }
    return false;
  };

  RegistrarConsulta.cancelarDocV143=function(){
    return this.restaurarRegistroPrincipalV162();
  };

  RegistrarConsulta.cancelarReceitaV162=function(){
    return this.restaurarRegistroPrincipalV162();
  };

  RegistrarConsulta.htmlReceitaV162=function(d={}){
    const p=this.pac||{};
    const obs=d.obs||d.orientacao||this.receitaContext?.obs||'';
    const id=d.id||this.receitaContext?.id||'';
    return `
      <div class="doc-original-banner doc-banner-green">
        Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>

      <input type="hidden" id="doc-id" value="${esc(id)}">

      <div class="receita-toolbar-v162">
        <label>Medicamentos:</label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal()">+ Medicamento</button>
      </div>

      <div id="rec-meds-lista-original" class="receita-original-lista"></div>

      <div class="f-col f-full doc-modal-original">
        <label>Observações / Orientações ao paciente</label>
        <textarea id="rec-obs" rows="3" placeholder="Ex: Tomar com alimento. Evitar sol...">${esc(obs)}</textarea>
      </div>`;
  };

  RegistrarConsulta.footerReceitaV162=function(){
    return `
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.cancelarReceitaV162()">Cancelar</button>
      <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.saveReceita(false,'receita')">💾 Salvar Receita</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveReceita(true,'receita')">💾🖨️ Salvar e imprimir</button>
      <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>`;
  };

  RegistrarConsulta.modalReceita=function(d={}){
    this.capturarRegistroPrincipalV162();

    const meds=Array.isArray(d.medicamentos) ? clone(d.medicamentos) :
      (Array.isArray(this.receitaMeds) ? clone(this.receitaMeds) : []);

    this.receitaContext={id:d.id||this.receitaContext?.id||'',obs:d.obs||d.orientacao||this.receitaContext?.obs||''};
    this.receitaMeds=Array.isArray(meds) ? meds : [];

    this.abrirModalLimpoV162(d.id?'Editar Receita Médica':'Nova Receita Médica',this.htmlReceitaV162(d),this.footerReceitaV162(),'lg');

    setTimeout(()=>{
      this.renderListaMedsReceitaOriginal();
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.cancelarReceitaV162()');
    },40);

    return false;
  };

  RegistrarConsulta.renderListaMedsReceitaOriginal=function(){
    const box=document.getElementById('rec-meds-lista-original');
    if(!box) return;
    const meds=Array.isArray(this.receitaMeds) ? this.receitaMeds : [];

    box.innerHTML=meds.length ? meds.map((m,i)=>{
      const resumo=[m.formula||m.concentracao,m.formaFarmaceutica||m.apresentacao,m.quantidade,m.via,m.dose,m.periodicidadeTexto,m.duracao].filter(Boolean).join(' • ');
      return `<div class="doc-med-card receita-med-card-v162">
        <div class="doc-med-main">
          <strong>${i+1}. ${esc(m.nome||'Medicamento')}</strong>
          <div class="doc-sub">${esc(resumo||'Medicamento adicionado')}</div>
          ${m.orientacao?`<div class="doc-sub">Orientação: ${esc(m.orientacao)}</div>`:''}
        </div>
        <div class="doc-actions">
          <button type="button" class="btn btn-sm btn-outline" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal(${i})">✏️ Editar</button>
          <button type="button" class="btn btn-sm btn-red" onclick="RegistrarConsulta.removerMedicamentoReceitaV162(${i})">Excluir</button>
        </div>
      </div>`;
    }).join('') : `<div class="doc-empty-card">Nenhum medicamento adicionado.</div>`;
  };

  RegistrarConsulta.removerMedicamentoReceitaV162=function(i){
    if(!Array.isArray(this.receitaMeds)) this.receitaMeds=[];
    this.receitaMeds.splice(Number(i),1);
    this.renderListaMedsReceitaOriginal();
    return false;
  };

  RegistrarConsulta.capturarReceitaAtualV162=function(){
    this.receitaContext={
      id:document.getElementById('doc-id')?.value||this.receitaContext?.id||'',
      obs:document.getElementById('rec-obs')?.value||this.receitaContext?.obs||''
    };
    this.__receitaSnapshotV162={
      id:this.receitaContext.id,
      obs:this.receitaContext.obs,
      medicamentos:clone(this.receitaMeds||[])
    };
    return this.__receitaSnapshotV162;
  };

  RegistrarConsulta.restaurarReceitaV162=function(){
    const r=this.__receitaSnapshotV162 || {
      id:this.receitaContext?.id||'',
      obs:this.receitaContext?.obs||'',
      medicamentos:this.receitaMeds||[]
    };
    this.receitaContext={id:r.id||'',obs:r.obs||''};
    this.receitaMeds=Array.isArray(r.medicamentos) ? clone(r.medicamentos) : [];

    this.abrirModalLimpoV162(r.id?'Editar Receita Médica':'Nova Receita Médica',this.htmlReceitaV162(r),this.footerReceitaV162(),'lg');

    setTimeout(()=>{
      this.renderListaMedsReceitaOriginal();
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.cancelarReceitaV162()');
    },40);

    return false;
  };

  RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal=function(index=null){
    this.capturarReceitaAtualV162();

    const editando=index!==null && index!==undefined && index!=='';
    const meds=Array.isArray(this.receitaMeds) ? this.receitaMeds : [];
    const m=editando ? (meds[Number(index)]||{}) : {};
    const periodo=m.periodicidadeTexto||this.periodicidadeTemp||'A cada 8h';

    this.__medDraftV162={
      index:editando?Number(index):'',
      nome:m.nome||'',
      formula:m.formula||m.concentracao||'',
      forma:m.formaFarmaceutica||m.apresentacao||'',
      quantidade:m.quantidade||'',
      via:m.via||'Oral',
      dose:m.dose||'',
      periodicidadeTexto:periodo,
      duracao:m.duracao||'',
      orientacao:m.orientacao||'',
      opts:m.periodicidades||[],
      personalizado:m.periodicidadePersonalizada||''
    };

    this.abrirModalMedicamentoV162(this.__medDraftV162,editando);
    return false;
  };

  RegistrarConsulta.htmlMedicamentoV162=function(d={}){
    return `
      <input type="hidden" id="med-edit-index" value="${d.index!==undefined&&d.index!==null?esc(d.index):''}">
      <div class="doc-modal-original med-modal-v162">
        <div class="form-grid">
          <div class="f-col f-full">
            <label>Princípio ativo / medicamento *</label>
            <input id="med-nome" value="${esc(d.nome||'')}" placeholder="Digite o medicamento">
          </div>
          <div class="f-col">
            <label>Concentração</label>
            <input id="med-formula" value="${esc(d.formula||'')}" placeholder="Ex.: 500 mg">
          </div>
          <div class="f-col">
            <label>Forma farmacêutica</label>
            <input id="med-forma" value="${esc(d.forma||'')}" placeholder="Ex.: comprimido">
          </div>
          <div class="f-col">
            <label>Quantidade</label>
            <input id="med-quantidade" value="${esc(d.quantidade||'')}" placeholder="Ex.: 1 caixa">
          </div>
          <div class="f-col">
            <label>Via</label>
            <select id="med-via">
              ${['Oral','Tópico','Intramuscular','Endovenoso','Subcutâneo','Inalatório','Oftálmico','Otológico','Nasal','Retal','Vaginal'].map(v=>`<option ${String(d.via||'Oral')===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="f-col">
            <label>Dose</label>
            <input id="med-dose" value="${esc(d.dose||'')}" placeholder="Ex.: 1 comprimido">
          </div>
          <div class="f-col">
            <label>Periodicidade</label>
            <div class="med-period-picker">
              <div id="med-periodicidade-resumo" class="med-period-current">${esc(d.periodicidadeTexto||'A cada 8h')}</div>
              <button type="button" class="med-select-btn" onclick="RegistrarConsulta.abrirModalPeriodicidadeMedicamento()">Selecionar</button>
            </div>
          </div>
          <div class="f-col">
            <label>Duração</label>
            <input id="med-duracao" value="${esc(d.duracao||'')}" placeholder="Ex.: 7 dias / uso contínuo">
          </div>
          <div class="f-col f-full">
            <label>Orientação</label>
            <textarea id="med-orientacao" rows="3" placeholder="Orientações específicas">${esc(d.orientacao||'')}</textarea>
          </div>
        </div>
      </div>`;
  };

  RegistrarConsulta.abrirModalMedicamentoV162=function(d={},editando=false){
    this.abrirModalLimpoV162(editando?'Editar medicamento':'Adicionar medicamento',
      this.htmlMedicamentoV162(d),
      `<button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.restaurarReceitaV162()">Cancelar</button>
       <button type="button" class="btn btn-green" onclick="RegistrarConsulta.aplicarMedicamentoReceitaOriginal()">Aplicar</button>`,
      'lg'
    );

    setTimeout(()=>{
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.restaurarReceitaV162()');
    },40);
  };

  RegistrarConsulta.capturarMedicamentoTelaV162=function(){
    const d={
      index:document.getElementById('med-edit-index')?.value||'',
      nome:document.getElementById('med-nome')?.value||'',
      formula:document.getElementById('med-formula')?.value||'',
      forma:document.getElementById('med-forma')?.value||'',
      quantidade:document.getElementById('med-quantidade')?.value||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose:document.getElementById('med-dose')?.value||'',
      periodicidadeTexto:document.getElementById('med-periodicidade-resumo')?.textContent?.trim()||this.periodicidadeTemp||'A cada 8h',
      duracao:document.getElementById('med-duracao')?.value||'',
      orientacao:document.getElementById('med-orientacao')?.value||'',
      opts:this.__medDraftV162?.opts||[],
      personalizado:this.__medDraftV162?.personalizado||''
    };
    this.__medDraftV162=d;
    return d;
  };

  RegistrarConsulta.abrirModalPeriodicidadeMedicamento=function(){
    const d=this.capturarMedicamentoTelaV162();
    const opcoes=['A cada 6h','A cada 8h','A cada 12h','1x ao dia','2x ao dia','3x ao dia','4x ao dia','Uso contínuo','Se necessário','Personalizado'];
    const atual=d.periodicidadeTexto||'';
    const personalizado=d.personalizado || (atual.match(/Personalizado:\s*(.+)$/i)||[])[1] || '';

    this.abrirModalLimpoV162('Selecionar periodicidade',`
      <div class="period-original-v162">
        ${opcoes.map(op=>`<label class="period-modal-opt">
          <input type="checkbox" name="period-med-opt" value="${esc(op)}" ${(d.opts||[]).includes(op)||atual.includes(op)?'checked':''} onchange="RegistrarConsulta.togglePeriodicidadePersonalizada()">
          <span>${esc(op)}</span>
        </label>`).join('')}
      </div>
      <div id="period-personalizado-box" style="display:${atual.includes('Personalizado')||personalizado?'block':'none'};margin-top:12px;">
        <label>Descrever periodicidade personalizada</label>
        <input id="period-personalizado-texto" value="${esc(personalizado)}" placeholder="Ex.: ao deitar, dias alternados">
      </div>
    `,`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarMedicamentoV162()">Cancelar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.aplicarPeriodicidadeMedicamento()">Aplicar</button>
    `,'md');

    setTimeout(()=>{
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.voltarMedicamentoV162()');
    },40);

    return false;
  };

  RegistrarConsulta.togglePeriodicidadePersonalizada=function(){
    const marcado=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).some(x=>x.value==='Personalizado');
    const box=document.getElementById('period-personalizado-box');
    if(box) box.style.display=marcado?'block':'none';
  };

  RegistrarConsulta.voltarMedicamentoV162=function(){
    const d=this.__medDraftV162||{};
    this.abrirModalMedicamentoV162(d,d.index!==''&&d.index!==undefined&&d.index!==null);
    return false;
  };

  RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
    const personalizado=document.getElementById('period-personalizado-texto')?.value?.trim()||'';
    const texto=opts.map(v=>v==='Personalizado' && personalizado ? 'Personalizado: '+personalizado : v).filter(Boolean).join(' + ') || 'A cada 8h';

    this.__medDraftV162=Object.assign({},this.__medDraftV162||{},{
      periodicidadeTexto:texto,
      opts,
      personalizado
    });
    this.__periodicidadeMarcadaV143={opts,personalizado,texto};
    this.periodicidadeTemp=texto;

    this.abrirModalMedicamentoV162(this.__medDraftV162,this.__medDraftV162.index!==''&&this.__medDraftV162.index!==undefined&&this.__medDraftV162.index!==null);
    return false;
  };

  RegistrarConsulta.aplicarMedicamentoReceitaOriginal=function(){
    const indexRaw=document.getElementById('med-edit-index')?.value;
    const periodicidade=document.getElementById('med-periodicidade-resumo')?.textContent?.trim() || this.periodicidadeTemp || 'A cada 8h';
    const duracao=document.getElementById('med-duracao')?.value?.trim()||'';
    const dose=document.getElementById('med-dose')?.value?.trim()||'';

    const med={
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose,
      periodicidadeTexto:periodicidade,
      periodicidades:this.__medDraftV162?.opts||this.__periodicidadeMarcadaV143?.opts||[],
      periodicidadePersonalizada:this.__medDraftV162?.personalizado||this.__periodicidadeMarcadaV143?.personalizado||'',
      posologia:[dose,periodicidade].filter(Boolean).join(' - '),
      duracao,
      usoContinuo:String(duracao).toLowerCase().includes('contínuo') || String(duracao).toLowerCase().includes('continuo') || String(periodicidade).toLowerCase().includes('uso contínuo') || String(periodicidade).toLowerCase().includes('uso continuo'),
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };

    if(!med.nome){
      Utils.toast('Informe o medicamento.');
      return false;
    }

    if(!Array.isArray(this.receitaMeds)) this.receitaMeds=[];
    if(indexRaw!=='' && indexRaw!=null && !isNaN(Number(indexRaw))){
      this.receitaMeds[Number(indexRaw)]=med;
    }else{
      this.receitaMeds.push(med);
    }

    // Atualiza o snapshot antes de voltar para receita.
    this.__receitaSnapshotV162={
      id:this.receitaContext?.id||'',
      obs:this.receitaContext?.obs||'',
      medicamentos:clone(this.receitaMeds)
    };

    this.restaurarReceitaV162();
    setTimeout(()=>this.renderListaMedsReceitaOriginal(),60);
    Utils.toast('Medicamento adicionado à receita.');
    return false;
  };

  RegistrarConsulta.saveReceita=function(imprimir=false,tipoPrint='receita'){
    const id=(document.getElementById('doc-id')?.value||'').trim() || (Utils.id?Utils.id('REC'):('REC_'+Date.now()));
    const obs=document.getElementById('rec-obs')?.value||this.receitaContext?.obs||'';
    const meds=Array.isArray(this.receitaMeds) ? clone(this.receitaMeds) : [];

    if(!meds.length){
      Utils.toast('Adicione ao menos um medicamento.');
      return false;
    }

    const doc={
      id,
      ...(this.pacienteDocV143 ? this.pacienteDocV143() : {}),
      medicamentos:meds,
      obs,
      orientacao:obs,
      tipo:'Receita',
      tipoDoc:'Receita',
      tipoPrint,
      controleEspecial:tipoPrint==='receita-controle',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };

    Documentos.add('Receita',doc);
    try{ Store.upsert('RECEITAS',clone(doc)); }catch(e){}
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Receita',tipoPrint}),80);

    this.receitaMeds=[];
    this.receitaContext={};
    this.__receitaSnapshotV162=null;

    this.restaurarRegistroPrincipalV162();
    setTimeout(()=>{
      try{ this.restoreDocsBackupV108 && this.restoreDocsBackupV108(); }catch(e){}
      try{ this.renderCards && this.renderCards(); }catch(e){}
    },100);

    Utils.toast(imprimir?'Receita salva e enviada para impressão.':'Receita adicionada ao atendimento.');
    return true;
  };
})();




/* =========================================================
   ZERO V16.3 — Selecionar arquivo no Registrar Consulta salva anexos
   Correções:
   - Input de anexos do Registrar Consulta volta a salvar.
   - Salva no atendimento e também no menu Exames.
   - Atualiza os cards sem fechar o Registrar Consulta.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__selecionarArquivoSalvarV163) return;
  RegistrarConsulta.__selecionarArquivoSalvarV163=true;

  RegistrarConsulta.uidArquivoV163=function(p){
    return Utils.id ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));
  };

  RegistrarConsulta.pacienteArquivoV163=function(){
    const p=this.pac||{};
    return {
      pacId:p.id||'',
      pacienteId:p.id||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.salvarArquivoExameConsultaV163=function(file,dataUrl=''){
    const base=this.pacienteArquivoV163();
    if(!base.pacId){
      Utils.toast('Paciente não encontrado para anexar arquivo.');
      return false;
    }

    const doc={
      id:this.uidArquivoV163('EX'),
      ...base,
      nome:file?.name||'arquivo',
      filename:file?.name||'arquivo',
      arquivoNome:file?.name||'arquivo',
      tipo:'Exame anexado',
      tipoDoc:'Exame anexado',
      tipoArquivo:file?.type||'',
      mime:file?.type||'',
      tamanho:file?.size||0,
      dataUrl:dataUrl||'',
      arquivo:dataUrl||'',
      conteudo:dataUrl||'',
      obs:'Anexado pelo Registrar Consulta',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };

    if(window.Documentos){
      Documentos.add('Exame anexado',doc);
      if(this.backupDocsV108) this.backupDocsV108();
    }

    Store.upsert('EXAMES_ARQUIVOS',Utils.clone ? Utils.clone(doc) : JSON.parse(JSON.stringify(doc)));
    return doc;
  };

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    try{ this.capturarRegistrarPrincipalV143 && this.capturarRegistrarPrincipalV143(); }catch(e){}
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}

    const input=ev?.target || document.getElementById('nc-anexos-exames-input');
    const files=Array.from(input?.files||[]);
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
        try{ this.restoreDocsBackupV108 && this.restoreDocsBackupV108(); }catch(e){}
        try{ this.renderCards && this.renderCards(); }catch(e){}
        Utils.toast(`${salvos} arquivo(s) anexado(s) ao atendimento e ao menu Exames.`);
      }
    };

    files.forEach(file=>{
      const salvar=(dataUrl='')=>{
        try{
          if(this.salvarArquivoExameConsultaV163(file,dataUrl)) salvos++;
        }catch(e){
          console.error('Erro ao anexar exame no Registrar Consulta',e);
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

  const oldAfterRenderV163=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfterRenderV163 ? oldAfterRenderV163(...arguments) : undefined;
    setTimeout(()=>{
      const inp=document.getElementById('nc-anexos-exames-input');
      if(inp){
        inp.onchange=function(ev){ RegistrarConsulta.saveAnexosConsulta(ev); };
      }
    },40);
    return ret;
  };

  document.addEventListener('change',function(ev){
    const el=ev.target;
    if(el && el.id==='nc-anexos-exames-input'){
      ev.stopPropagation();
      RegistrarConsulta.saveAnexosConsulta(ev);
    }
  },true);
})();




/* =========================================================
   ZERO V16.4 — Documentos do atendimento: atestado, pedido, anexos e cards
   Correções:
   - Novo Atestado Médico volta com texto padrão e salva.
   - Salvar Pedido de Exames volta a salvar e criar card.
   - Anexar exames cria card imediatamente.
   - Cards temporários voltam com Visualizar / Imprimir / Editar / Excluir.
   - Campos não estouram os grids do Registrar Consulta.
   - Não remove Receita/Medicamentos/Periodicidade já corrigidos.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__docsAtendimentoFixV164) return;
  RegistrarConsulta.__docsAtendimentoFixV164=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };
  const uid=(p)=>Utils.id ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.pacienteDocV164=function(){
    const p=this.pac||{};
    return {
      pacId:p.id||'', pacienteId:p.id||'', paciente:p.nome||p.nomeCompleto||'', pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'', pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'', pacienteTelefone:p.telefone||p.celular||p.tel||'', pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.guardarDocsV164=function(){
    try{
      const docs=(window.Documentos?.temp||[]);
      this.docsBackupV108=clone(docs)||[];
      if(window.Documentos) Documentos.tempBackupV108=clone(docs)||[];
    }catch(e){}
  };

  RegistrarConsulta.docsAtendimentoV164=function(){
    const todos=[];
    const add=(arr)=>Array.isArray(arr)&&arr.forEach(d=>{
      if(!d) return;
      if(!todos.some(x=>String(x.id)===String(d.id))) todos.push(d);
    });
    add(window.Documentos?.temp||[]);
    add(window.Documentos?.tempBackupV108||[]);
    add(this.docsBackupV108||[]);
    if(window.Documentos){
      Documentos.temp=clone(todos)||[];
      Documentos.tempBackupV108=clone(todos)||[];
    }
    this.docsBackupV108=clone(todos)||[];
    return todos;
  };

  RegistrarConsulta.renderCards=function(){
    const alvo=document.getElementById('docs-novo-registro-lista') || document.getElementById('nc-anexos-exames-lista');
    if(!alvo || !window.Documentos) return;
    this.docsAtendimentoV164();
    alvo.innerHTML=Documentos.cards ? Documentos.cards() : '';
  };

  RegistrarConsulta.voltarRegistroDepoisDocV164=function(){
    if(this.restaurarRegistroPrincipalV162) return this.restaurarRegistroPrincipalV162();
    if(this.restaurarRegistrarPrincipalV143) return this.restaurarRegistrarPrincipalV143();
    if(this.restoreMainModal) return this.restoreMainModal();
    if(this.pac?.id && this.open) return this.open(this.pac.id,this.atendimentoId||this.consId||'');
    return false;
  };

  RegistrarConsulta.textoAtestadoPadraoV164=function(dias='',inicio=''){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome do paciente]';
    const cpf=p.cpf ? `, CPF nº ${p.cpf}` : '';
    const hoje=Utils.today ? Utils.today() : new Date().toLocaleDateString('pt-BR');
    let ini=inicio||'';
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(ini))){ const [a,m,d]=String(ini).split('-'); ini=`${d}/${m}/${a}`; }
    const periodo=dias ? `${dias} dia(s)` : '____ dia(s)';
    return `Atesto, para os devidos fins, que o(a) paciente ${nome}${cpf}, esteve sob meus cuidados médicos nesta data (${hoje}), necessitando de afastamento de suas atividades pelo período de ${periodo}${ini ? ', a contar de '+ini : ''}.`;
  };

  RegistrarConsulta.atualizarTextoAtestadoV164=function(force=false){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    const txt=document.getElementById('at-motivo') || document.getElementById('at-texto');
    if(!txt) return;
    if(String(tipo).toLowerCase().includes('comparecimento')){
      if(force || !txt.dataset.editado || txt.dataset.editado==='0'){
        const p=this.pac||{};
        const h1=document.getElementById('at-hora-chegada')?.value||'____';
        const h2=document.getElementById('at-hora-saida')?.value||'____';
        txt.value=`Declaro, para os devidos fins, que o(a) paciente ${p.nome||p.nomeCompleto||'[Nome do paciente]'} compareceu a esta clínica para atendimento médico, permanecendo no período de ${h1} às ${h2}.`;
        txt.dataset.editado='0';
      }
      return;
    }
    if(force || !txt.dataset.editado || txt.dataset.editado==='0'){
      txt.value=this.textoAtestadoPadraoV164(document.getElementById('at-dias')?.value||'',document.getElementById('at-inicio')?.value||'');
      txt.dataset.editado='0';
    }
  };

  RegistrarConsulta.modalAtestado=function(d={}){
    try{ this.capturarRegistroPrincipalV162 && this.capturarRegistroPrincipalV162(); }catch(e){}
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}
    const p=this.pac||{};
    const texto=(d.motivo||d.texto||'') || this.textoAtestadoPadraoV164(d.dias||'',d.inicio||d.dataInicio||'');
    const body=`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v164">
        <div class="f-col"><label>Tipo</label><select id="at-tipo" onchange="RegistrarConsulta.atualizarTextoAtestadoV164(true)"><option ${String(d.tipo||'Atestado médico').toLowerCase().includes('atestado')?'selected':''}>Atestado médico</option><option ${String(d.tipo||'').toLowerCase().includes('comparecimento')?'selected':''}>Declaração de comparecimento</option></select></div>
        <div class="f-col"><label>Dias de afastamento</label><input id="at-dias" type="number" value="${esc(d.dias||'')}" placeholder="Ex.: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col"><label>Data de início</label><input id="at-inicio" type="date" value="${esc(d.inicio||d.dataInicio||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col"><label>CID-10</label><input id="at-cid" value="${esc(d.cid||'')}" placeholder="Opcional"></div>
        <div class="f-col"><label>Hora de chegada</label><input id="at-hora-chegada" type="time" value="${esc(d.horaChegada||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col"><label>Hora de saída</label><input id="at-hora-saida" type="time" value="${esc(d.horaSaida||d.hora||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col f-full"><label>Texto do atestado</label><textarea id="at-motivo" rows="8" data-editado="${d.motivo||d.texto?'1':'0'}" oninput="this.dataset.editado='1'">${esc(texto)}</textarea></div>
        <div class="f-col f-full"><label>Observações</label><textarea id="at-obs" rows="3">${esc(d.obs||'')}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV164()">Cancelar</button>
      <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.saveAtestado(true)">💾🖨️ Salvar e imprimir</button>
      <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar Atestado</button>`;
    if(this.abrirModalLimpoV162) this.abrirModalLimpoV162(d.id?'Editar Atestado Médico':'Novo Atestado Médico',body,footer,'lg');
    else Modal.open(d.id?'Editar Atestado Médico':'Novo Atestado Médico',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV164()'); },40);
    return false;
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const texto=(document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '').trim();
    if(!texto) return Utils.toast('Informe o texto do atestado.');
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('TMP_AT');
    const doc={
      id,...this.pacienteDocV164(), tipo:document.getElementById('at-tipo')?.value||'Atestado médico', tipoDoc:'Atestado',
      dias:document.getElementById('at-dias')?.value||'', inicio:document.getElementById('at-inicio')?.value||'', dataInicio:document.getElementById('at-inicio')?.value||'',
      cid:document.getElementById('at-cid')?.value||'', horaChegada:document.getElementById('at-hora-chegada')?.value||'', horaSaida:document.getElementById('at-hora-saida')?.value||'', hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:texto, texto, obs:document.getElementById('at-obs')?.value||'', data:Utils.today(), criadoEm:new Date().toISOString()
    };
    Documentos.add('Atestado',doc);
    try{ Store.upsert('ATESTADOS',clone(doc)); }catch(e){}
    this.guardarDocsV164();
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Atestado'}),80);
    this.voltarRegistroDepoisDocV164();
    setTimeout(()=>{ this.docsAtendimentoV164(); this.renderCards(); },120);
    Utils.toast(imprimir?'Atestado salvo e enviado para impressão.':'Atestado salvo no atendimento.');
    return true;
  };

  RegistrarConsulta.modalPedido=function(d={}){
    try{ this.capturarRegistroPrincipalV162 && this.capturarRegistroPrincipalV162(); }catch(e){}
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}
    const p=this.pac||{};
    const body=`
      <div class="doc-original-banner doc-banner-blue">Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}</div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="doc-modal-original doc-grid-fix-v164">
        <div class="f-col f-full"><label>Exames solicitados</label><textarea id="pe-exames" rows="8" placeholder="Digite um exame por linha">${esc(d.exames||d.lista||'')}</textarea></div>
        <div class="f-col f-full"><label>Hipótese diagnóstica / Observação</label><textarea id="pe-obs" rows="4" placeholder="Observações do pedido">${esc(d.obs||'')}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV164()">Cancelar</button>
      <button type="button" class="btn btn-outline" onclick="RegistrarConsulta.savePedido(true)">💾🖨️ Salvar e imprimir</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.savePedido(false)">💾 Salvar pedido</button>`;
    if(this.abrirModalLimpoV162) this.abrirModalLimpoV162(d.id?'Editar Pedido de Exames':'Pedido de Exames',body,footer,'lg');
    else Modal.open(d.id?'Editar Pedido de Exames':'Pedido de Exames',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV164()'); },40);
    return false;
  };

  RegistrarConsulta.savePedido=function(imprimir=false){
    const exames=(document.getElementById('pe-exames')?.value || document.getElementById('ex-exames')?.value || document.getElementById('ped-exames')?.value || '').trim();
    const selecionados=Array.from(document.querySelectorAll('input[name="pe-exame-opt"]:checked')).map(x=>x.value).filter(Boolean);
    const textoFinal=exames || selecionados.join('\n');
    if(!textoFinal) return Utils.toast('Informe ou selecione os exames.');
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('TMP_PE');
    const doc={id,...this.pacienteDocV164(), exames:textoFinal, lista:textoFinal, examesSelecionados:selecionados, obs:document.getElementById('pe-obs')?.value||'', tipo:'Pedido de Exames', tipoDoc:'Pedido de Exames', data:Utils.today(), criadoEm:new Date().toISOString()};
    Documentos.add('Pedido de Exames',doc);
    try{ Store.upsert('EXAMES_PEDIDOS',clone(doc)); }catch(e){}
    this.guardarDocsV164();
    if(imprimir) setTimeout(()=>Impressao.print({...doc,tipoDoc:'Pedido de Exames'}),80);
    this.voltarRegistroDepoisDocV164();
    setTimeout(()=>{ this.docsAtendimentoV164(); this.renderCards(); },120);
    Utils.toast(imprimir?'Pedido salvo e enviado para impressão.':'Pedido de exames salvo no atendimento.');
    return true;
  };

  RegistrarConsulta.salvarArquivoExameConsultaV164=function(file,dataUrl=''){
    const base=this.pacienteDocV164();
    if(!base.pacId) return false;
    const doc={id:uid('TMP_EX'),...base,nome:file?.name||'arquivo',filename:file?.name||'arquivo',arquivoNome:file?.name||'arquivo',tipo:'Exame anexado',tipoDoc:'Exame anexado',tipoArquivo:file?.type||'',mime:file?.type||'',tamanho:file?.size||0,dataUrl:dataUrl||'',arquivo:dataUrl||'',conteudo:dataUrl||'',obs:'Anexado pelo Registrar Consulta',data:Utils.today(),criadoEm:new Date().toISOString()};
    Documentos.add('Exame anexado',doc);
    try{ Store.upsert('EXAMES_ARQUIVOS',clone(doc)); }catch(e){}
    return doc;
  };

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}
    const input=ev?.target || document.getElementById('nc-anexos-exames-input');
    const files=Array.from(input?.files||[]);
    if(!files.length) return Utils.toast('Selecione ao menos um arquivo.');
    let pendentes=files.length, salvos=0;
    const done=()=>{
      pendentes--;
      if(pendentes<=0){
        try{ if(input) input.value=''; }catch(e){}
        this.guardarDocsV164();
        this.docsAtendimentoV164();
        this.renderCards();
        Utils.toast(`${salvos} arquivo(s) anexado(s) ao atendimento.`);
      }
    };
    files.forEach(file=>{
      const salvar=(dataUrl='')=>{ try{ if(this.salvarArquivoExameConsultaV164(file,dataUrl)) salvos++; }catch(e){console.error(e);} done(); };
      if(window.FileReader){ const r=new FileReader(); r.onload=()=>salvar(r.result||''); r.onerror=()=>salvar(''); r.readAsDataURL(file); }
      else salvar('');
    });
    return true;
  };

  const oldAfterRenderV164=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfterRenderV164 ? oldAfterRenderV164(...arguments) : undefined;
    setTimeout(()=>{
      const inp=document.getElementById('nc-anexos-exames-input');
      if(inp) inp.onchange=function(ev){ RegistrarConsulta.saveAnexosConsulta(ev); };
      try{ RegistrarConsulta.docsAtendimentoV164(); RegistrarConsulta.renderCards(); }catch(e){}
    },60);
    return ret;
  };
})();




/* =========================================================
   ZERO V16.6 — Anexar exame cria card dentro do Registrar Consulta
   Correções:
   - Anexar exame cria o card imediatamente no modal Registrar Consulta.
   - Não depende de render antigo nem de overlay.
   - Mantém o arquivo em Documentos.temp, tempBackup e docsBackup.
   - Salva também em EXAMES_ARQUIVOS com dataUrl/arquivo/conteudo.
   - Reaplica o onchange do input sempre que o modal renderiza.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__anexarExameCardV166) return;
  RegistrarConsulta.__anexarExameCardV166=true;

  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };
  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');

  RegistrarConsulta.uidAnexoV166=function(){
    return (Utils.id ? Utils.id('EX') : ('EX_'+Date.now()+'_'+Math.random().toString(16).slice(2)));
  };

  RegistrarConsulta.pacienteAnexoV166=function(){
    const p=this.pac||{};
    return {
      pacId:p.id||'',
      pacienteId:p.id||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.docsUnificadosV166=function(){
    const out=[];
    const add=(arr)=>Array.isArray(arr)&&arr.forEach(d=>{
      if(!d) return;
      const id=String(d.id||'');
      if(id && out.some(x=>String(x.id)===id)) return;
      out.push(d);
    });

    add(window.Documentos?.temp||[]);
    add(window.Documentos?.tempBackupV108||[]);
    add(this.docsBackupV108||[]);

    if(window.Documentos){
      Documentos.temp=clone(out)||[];
      Documentos.tempBackupV108=clone(out)||[];
    }
    this.docsBackupV108=clone(out)||[];
    return out;
  };

  RegistrarConsulta.upsertDocAtendimentoV166=function(doc){
    if(!doc || !doc.id) return null;

    if(window.Documentos){
      if(!Array.isArray(Documentos.temp)) Documentos.temp=[];
      const i=Documentos.temp.findIndex(x=>String(x.id)===String(doc.id));
      if(i>=0) Documentos.temp[i]=doc;
      else Documentos.temp.push(doc);

      Documentos.tempBackupV108=clone(Documentos.temp)||[];
    }

    if(!Array.isArray(this.docsBackupV108)) this.docsBackupV108=[];
    const j=this.docsBackupV108.findIndex(x=>String(x.id)===String(doc.id));
    if(j>=0) this.docsBackupV108[j]=doc;
    else this.docsBackupV108.push(doc);

    try{ Store.upsert('EXAMES_ARQUIVOS',clone(doc)); }catch(e){}

    return doc;
  };

  RegistrarConsulta.cardDocAtendimentoFallbackV166=function(d){
    const tipo=String(d.tipoDoc||d.tipo||'Exame anexado');
    const isAnexo=tipo.toLowerCase().includes('anex') || tipo.toLowerCase().includes('arquivo');
    const isReceita=tipo.toLowerCase().includes('receita');
    const resumo=d.nome||d.filename||d.arquivoNome||d.exames||d.texto||d.motivo||'Documento do atendimento';

    return `<div class="doc-temp-card-v164 doc-temp-card-v165 doc-temp-card-v166">
      <div class="doc-temp-main-v164">
        <strong>${window.Documentos?.icon ? Documentos.icon(tipo) : '📎'} ${esc(tipo)}</strong>
        <div class="doc-sub">${esc(resumo)}</div>
      </div>
      <div class="doc-actions doc-actions-v164 doc-actions-icons-v165">
        <button type="button" class="btn btn-sm btn-outline doc-icon-btn-v165" title="Visualizar" aria-label="Visualizar" onclick="Documentos.visualizarTempV164 && Documentos.visualizarTempV164('${d.id}')">👁️</button>
        <button type="button" class="btn btn-sm btn-blue doc-icon-btn-v165" title="Imprimir/Abrir" aria-label="Imprimir/Abrir" onclick="${isReceita?`Documentos.imprimirReceitaTempV165 && Documentos.imprimirReceitaTempV165('${d.id}','receita')`:`Documentos.imprimirTempV165 ? Documentos.imprimirTempV165('${d.id}') : (Documentos.imprimirTempV164 && Documentos.imprimirTempV164('${d.id}'))`}">🖨️</button>
        ${isReceita?`<button type="button" class="btn btn-sm btn-purple doc-icon-btn-v165" title="Controle especial" aria-label="Controle especial" onclick="Documentos.imprimirReceitaTempV165 && Documentos.imprimirReceitaTempV165('${d.id}','receita-controle')">🧾</button>`:''}
        ${isAnexo?'':`<button type="button" class="btn btn-sm btn-outline doc-icon-btn-v165" title="Editar" aria-label="Editar" onclick="Documentos.editarTempV164 && Documentos.editarTempV164('${d.id}')">✏️</button>`}
        <button type="button" class="btn btn-sm btn-red doc-icon-btn-v165" title="Excluir" aria-label="Excluir" onclick="Documentos.remove && Documentos.remove('${d.id}')">🗑️</button>
      </div>
    </div>`;
  };

  RegistrarConsulta.renderCards=function(){
    const principal=document.getElementById('docs-novo-registro-lista');
    const secundario=document.getElementById('nc-anexos-exames-lista');
    const alvo=principal || secundario;
    if(!alvo) return false;

    const docs=this.docsUnificadosV166();
    let html='';

    if(window.Documentos && typeof Documentos.cards==='function'){
      try{ html=Documentos.cards()||''; }catch(e){ console.warn('Falha Documentos.cards V16.6',e); }
    }

    if(!html && docs.length){
      html=docs.map(d=>this.cardDocAtendimentoFallbackV166(d)).join('');
    }

    alvo.innerHTML=html || '';
    if(secundario && principal && secundario!==principal) secundario.innerHTML='';
    return true;
  };

  RegistrarConsulta.criarDocAnexoV166=function(file,dataUrl=''){
    const base=this.pacienteAnexoV166();
    if(!base.pacId){
      Utils.toast('Paciente não encontrado para anexar exame.');
      return null;
    }

    const nome=file?.name || 'exame_anexado';
    const doc={
      id:this.uidAnexoV166(),
      ...base,
      consultaId:this.consId||this.atendimentoId||'',
      atendimentoId:this.atendimentoId||this.consId||'',
      nome,
      filename:nome,
      arquivoNome:nome,
      tipo:'Exame anexado',
      tipoDoc:'Exame anexado',
      tipoArquivo:file?.type||'',
      mime:file?.type||'',
      tamanho:file?.size||0,
      dataUrl:dataUrl||'',
      arquivo:dataUrl||'',
      conteudo:dataUrl||'',
      obs:'Anexado pelo Registrar Consulta',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };

    this.upsertDocAtendimentoV166(doc);
    this.renderCards();
    return doc;
  };

  RegistrarConsulta.atualizarDocAnexoV166=function(id,dataUrl=''){
    if(!id) return;
    const update=(arr)=>{
      if(!Array.isArray(arr)) return;
      const d=arr.find(x=>String(x.id)===String(id));
      if(d){
        d.dataUrl=dataUrl||d.dataUrl||'';
        d.arquivo=dataUrl||d.arquivo||'';
        d.conteudo=dataUrl||d.conteudo||'';
      }
    };
    update(window.Documentos?.temp);
    update(window.Documentos?.tempBackupV108);
    update(this.docsBackupV108);

    const d=(window.Documentos?.temp||[]).find(x=>String(x.id)===String(id)) ||
      (this.docsBackupV108||[]).find(x=>String(x.id)===String(id));
    if(d){
      try{ Store.upsert('EXAMES_ARQUIVOS',clone(d)); }catch(e){}
    }
    this.docsUnificadosV166();
    this.renderCards();
  };

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}
    try{ this.captureForm && this.captureForm(); }catch(e){}

    const input=ev?.target || document.getElementById('nc-anexos-exames-input');
    const files=Array.from(input?.files||[]);

    if(!files.length){
      Utils.toast('Selecione ao menos um arquivo.');
      return false;
    }

    let salvos=0;
    files.forEach(file=>{
      const doc=this.criarDocAnexoV166(file,'');
      if(!doc) return;
      salvos++;

      if(window.FileReader){
        const reader=new FileReader();
        reader.onload=()=>this.atualizarDocAnexoV166(doc.id,reader.result||'');
        reader.onerror=()=>this.atualizarDocAnexoV166(doc.id,'');
        try{ reader.readAsDataURL(file); }catch(e){ this.atualizarDocAnexoV166(doc.id,''); }
      }
    });

    try{ if(input) input.value=''; }catch(e){}
    this.docsUnificadosV166();
    this.renderCards();

    Utils.toast(`${salvos} exame(s) anexado(s) ao atendimento.`);
    return true;
  };

  RegistrarConsulta.garantirInputAnexosV166=function(){
    const area=document.querySelector('.rc-docs-area') || document.querySelector('#docs-novo-registro-lista')?.parentElement || document.querySelector('.modal-body');
    if(!area) return;

    let lista=document.getElementById('docs-novo-registro-lista');
    if(!lista){
      lista=document.createElement('div');
      lista.id='docs-novo-registro-lista';
      lista.style.marginTop='10px';
      area.appendChild(lista);
    }

    let input=document.getElementById('nc-anexos-exames-input');
    if(!input){
      input=document.createElement('input');
      input.id='nc-anexos-exames-input';
      input.type='file';
      input.multiple=true;
      input.accept='.pdf,image/*,.jpg,.jpeg,.png,.webp,.doc,.docx';
      input.style.display='none';
      area.appendChild(input);
    }
    input.onchange=function(ev){ RegistrarConsulta.saveAnexosConsulta(ev); };
  };

  const oldAfterRenderV166=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfterRenderV166 ? oldAfterRenderV166(...arguments) : undefined;
    setTimeout(()=>{
      this.garantirInputAnexosV166();
      this.docsUnificadosV166();
      this.renderCards();
    },40);
    return ret;
  };

  document.addEventListener('change',function(ev){
    const el=ev.target;
    if(el && el.id==='nc-anexos-exames-input'){
      ev.preventDefault();
      ev.stopPropagation();
      RegistrarConsulta.saveAnexosConsulta(ev);
    }
  },true);

  document.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('button');
    if(!btn) return;
    const txt=String(btn.textContent||'').toLowerCase();
    const onclick=String(btn.getAttribute('onclick')||'');
    if(txt.includes('anexar exame') || onclick.includes('nc-anexos-exames-input')){
      const modalBody=document.querySelector('#modal-root .modal-body');
      if(modalBody && (modalBody.querySelector('#nc-tipo') || modalBody.querySelector('#docs-novo-registro-lista'))){
        RegistrarConsulta.garantirInputAnexosV166();
        const inp=document.getElementById('nc-anexos-exames-input');
        if(inp){
          ev.preventDefault();
          ev.stopPropagation();
          inp.click();
          return false;
        }
      }
    }
  },true);
})();




/* =========================================================
   ZERO V16.7 — Modais documentos estáveis + botão só salvar
   Correções:
   - Novo/Editar Receita, Pedido, Atestado e Laudo abrem estáveis.
   - Não usa overlay/pilha antiga para esses documentos.
   - Todos têm opção "Salvar".
   - Receita mantém as 2 impressões: normal e controle especial.
   - Editar não remove o documento antes de salvar.
   - Cancelar volta corretamente para Registrar Consulta.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__docsModaisEstaveisSalvarV167) return;
  RegistrarConsulta.__docsModaisEstaveisSalvarV167=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };
  const uid=(p)=>Utils.id ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.limparFlagsDocV167=function(){
    try{
      if(window.Modal){
        Modal.__appendNextV137=false;
        Modal.__contextNextV137='';
        Modal.__appendNextV135=false;
        Modal.__contextNextV135='';
        Modal.stackOpenV133=false;
        Modal.stackContextV133='';
      }
    }catch(e){}
    document.body.classList.remove(
      'modal-freeze-v99','modal-stabilizing-body-v129',
      'agenda-config-estavel-v158','agenda-config-opening-v158',
      'agenda-config-open-v147','agenda-config-open-v151','agenda-config-open-v152'
    );
    document.body.classList.add('doc-modal-estavel-v167');
  };

  RegistrarConsulta.estabilizarDocModalV167=function(){
    this.limparFlagsDocV167();
    const root=document.getElementById('modal-root');
    if(!root) return;
    root.classList.add('doc-modal-root-v167');
    root.querySelectorAll('.modal,.modal-box,.modal-content,.cm-modal,.modal-backdrop,.modal-body,.modal-footer').forEach(el=>{
      el.classList.add('doc-modal-estavel-node-v167');
      el.style.animation='none';
      el.style.transition='none';
      el.style.opacity='1';
      el.style.visibility='visible';
      el.style.transform='none';
    });
  };

  RegistrarConsulta.abrirDocumentoEstavelV167=function(titulo,body,footer,tamanho='lg'){
    this.limparFlagsDocV167();
    Modal.open(titulo,body,footer,tamanho);
    this.estabilizarDocModalV167();
    requestAnimationFrame(()=>this.estabilizarDocModalV167());
    setTimeout(()=>this.estabilizarDocModalV167(),40);
    return false;
  };

  RegistrarConsulta.capturarAntesDocumentoV167=function(){
    try{ this.capturarRegistroPrincipalV162 && this.capturarRegistroPrincipalV162(); }catch(e){}
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}
    try{ this.salvarRascunhoV111 && this.salvarRascunhoV111(); }catch(e){}
    try{ this.docsUnificadosV166 && this.docsUnificadosV166(); }catch(e){}
    try{ this.docsAtendimentoV164 && this.docsAtendimentoV164(); }catch(e){}
  };

  RegistrarConsulta.voltarRegistroDepoisDocV167=function(){
    this.limparFlagsDocV167();
    let ret=false;
    if(this.restaurarRegistroPrincipalV162) ret=this.restaurarRegistroPrincipalV162();
    else if(this.restaurarRegistrarPrincipalV143) ret=this.restaurarRegistrarPrincipalV143();
    else if(this.restoreMainModal) ret=this.restoreMainModal();
    else if(this.pac?.id && this.open) ret=this.open(this.pac.id,this.atendimentoId||this.consId||'');

    setTimeout(()=>{
      try{ this.restoreDocsBackupV108 && this.restoreDocsBackupV108(); }catch(e){}
      try{ this.docsUnificadosV166 && this.docsUnificadosV166(); }catch(e){}
      try{ this.docsAtendimentoV164 && this.docsAtendimentoV164(); }catch(e){}
      try{ this.renderCards && this.renderCards(); }catch(e){}
      document.body.classList.remove('doc-modal-estavel-v167');
    },80);
    return ret||false;
  };

  RegistrarConsulta.cancelarDocV143=function(){ return this.voltarRegistroDepoisDocV167(); };
  RegistrarConsulta.cancelarReceitaV162=function(){ return this.voltarRegistroDepoisDocV167(); };
  RegistrarConsulta.voltarRegistroDepoisDocV164=function(){ return this.voltarRegistroDepoisDocV167(); };

  RegistrarConsulta.pacienteDocV167=function(){
    if(this.pacienteDocV164) return this.pacienteDocV164();
    const p=this.pac||{};
    return {
      pacId:p.id||'',
      pacienteId:p.id||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.sincronizarDocumentoAtendimentoV167=function(tipo,doc,key=''){
    if(!doc || !doc.id) return false;
    doc.tipo=doc.tipo||tipo;
    doc.tipoDoc=tipo;

    if(window.Documentos){
      if(typeof Documentos.add==='function') Documentos.add(tipo,doc);
      if(!Array.isArray(Documentos.temp)) Documentos.temp=[];
      const i=Documentos.temp.findIndex(x=>String(x.id)===String(doc.id));
      if(i>=0) Documentos.temp[i]=clone(doc);
      else Documentos.temp.push(clone(doc));
      Documentos.tempBackupV108=clone(Documentos.temp)||[];
    }

    if(!Array.isArray(this.docsBackupV108)) this.docsBackupV108=[];
    const j=this.docsBackupV108.findIndex(x=>String(x.id)===String(doc.id));
    if(j>=0) this.docsBackupV108[j]=clone(doc);
    else this.docsBackupV108.push(clone(doc));

    try{ if(key) Store.upsert(key,clone(doc)); }catch(e){}

    try{ this.docsUnificadosV166 && this.docsUnificadosV166(); }catch(e){}
    try{ this.docsAtendimentoV164 && this.docsAtendimentoV164(); }catch(e){}
    try{ this.guardarDocsV164 && this.guardarDocsV164(); }catch(e){}
    return true;
  };

  RegistrarConsulta.htmlReceitaV167=function(d={}){
    if(this.htmlReceitaV162) return this.htmlReceitaV162(d);
    const p=this.pac||{};
    const obs=d.obs||d.orientacao||this.receitaContext?.obs||'';
    return `
      <div class="doc-original-banner doc-banner-green">
        Paciente: <strong>${esc(p.nome||p.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||this.receitaContext?.id||'')}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;">
        <label style="font-weight:800;color:#334155;margin:0;">Medicamentos:</label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="RegistrarConsulta.modalAdicionarMedicamentoReceitaOriginal()">+ Medicamento</button>
      </div>
      <div id="rec-meds-lista-original" class="receita-original-lista"></div>
      <div class="f-col f-full doc-modal-original">
        <label>Observações / Orientações ao paciente</label>
        <textarea id="rec-obs" rows="3" placeholder="Ex: Tomar com alimento. Evitar sol...">${esc(obs)}</textarea>
      </div>`;
  };

  RegistrarConsulta.footerReceitaV167=function(){
    return `
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveReceita(false,'receita')">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveReceita(true,'receita')">🖨️ Salvar e imprimir receita</button>
      <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>`;
  };

  RegistrarConsulta.modalReceita=function(d={}){
    this.capturarAntesDocumentoV167();
    const meds=Array.isArray(d.medicamentos) ? clone(d.medicamentos) : (Array.isArray(this.receitaMeds) ? clone(this.receitaMeds) : []);
    this.receitaContext={id:d.id||this.receitaContext?.id||'',obs:d.obs||d.orientacao||this.receitaContext?.obs||''};
    this.receitaMeds=Array.isArray(meds) ? meds : [];
    this.__receitaSnapshotV162={id:this.receitaContext.id,obs:this.receitaContext.obs,medicamentos:clone(this.receitaMeds)||[]};

    this.abrirDocumentoEstavelV167(d.id?'Editar Receita Médica':'Nova Receita Médica',this.htmlReceitaV167(d),this.footerReceitaV167(),'lg');

    setTimeout(()=>{
      try{ this.renderListaMedsReceitaOriginal && this.renderListaMedsReceitaOriginal(); }catch(e){}
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()');
      this.estabilizarDocModalV167();
    },60);
    return false;
  };

  RegistrarConsulta.saveReceita=function(imprimir=false,tipoPrint='receita'){
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('REC');
    const obs=document.getElementById('rec-obs')?.value||this.receitaContext?.obs||'';
    const meds=Array.isArray(this.receitaMeds) ? clone(this.receitaMeds) : [];
    if(!meds.length){
      Utils.toast('Adicione ao menos um medicamento.');
      return false;
    }

    const doc={
      id,
      ...this.pacienteDocV167(),
      medicamentos:meds,
      obs,
      orientacao:obs,
      tipo:'Receita',
      tipoDoc:'Receita',
      tipoPrint,
      controleEspecial:tipoPrint==='receita-controle',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };

    this.sincronizarDocumentoAtendimentoV167('Receita',doc,'RECEITAS');

    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Receita',tipoPrint}); }catch(e){} },80);

    this.receitaMeds=[];
    this.receitaContext={};
    this.__receitaSnapshotV162=null;

    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Receita salva e enviada para impressão.':'Receita salva no documento.');
    return true;
  };

  RegistrarConsulta.textoAtestadoPadraoV167=function(d={}){
    if((d.texto||d.motivo)) return d.texto||d.motivo||'';
    const dias=d.dias||'';
    const inicio=d.inicio||d.dataInicio||'';
    if(this.textoAtestadoPadraoV164) return this.textoAtestadoPadraoV164(dias,inicio);
    const p=this.pac||{};
    return `Atesto, para os devidos fins, que o(a) paciente ${p.nome||p.nomeCompleto||'[Nome do paciente]'} esteve sob meus cuidados médicos nesta data, necessitando de afastamento de suas atividades pelo período de ${dias||'____'} dia(s).`;
  };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.capturarAntesDocumentoV167();
    const texto=this.textoAtestadoPadraoV167(d);
    const body=`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v164 doc-grid-fix-v167">
        <div class="f-col"><label>Tipo</label><select id="at-tipo" onchange="RegistrarConsulta.atualizarTextoAtestadoV164 && RegistrarConsulta.atualizarTextoAtestadoV164(true)"><option ${String(d.tipo||'Atestado médico').toLowerCase().includes('atestado')?'selected':''}>Atestado médico</option><option ${String(d.tipo||'').toLowerCase().includes('comparecimento')?'selected':''}>Declaração de comparecimento</option></select></div>
        <div class="f-col"><label>Dias de afastamento</label><input id="at-dias" type="number" value="${esc(d.dias||'')}" placeholder="Ex.: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV164 && RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col"><label>Data de início</label><input id="at-inicio" type="date" value="${esc(d.inicio||d.dataInicio||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV164 && RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col"><label>CID-10</label><input id="at-cid" value="${esc(d.cid||'')}" placeholder="Opcional"></div>
        <div class="f-col"><label>Hora de chegada</label><input id="at-hora-chegada" type="time" value="${esc(d.horaChegada||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV164 && RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col"><label>Hora de saída</label><input id="at-hora-saida" type="time" value="${esc(d.horaSaida||d.hora||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV164 && RegistrarConsulta.atualizarTextoAtestadoV164(true)"></div>
        <div class="f-col f-full"><label>Texto do atestado</label><textarea id="at-motivo" rows="8" data-editado="${d.motivo||d.texto?'1':'0'}" oninput="this.dataset.editado='1'">${esc(texto)}</textarea></div>
        <div class="f-col f-full"><label>Observações</label><textarea id="at-obs" rows="3">${esc(d.obs||'')}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveAtestado(true)">🖨️ Salvar e imprimir</button>`;
    this.abrirDocumentoEstavelV167(d.id?'Editar Atestado Médico':'Novo Atestado Médico',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()'); this.estabilizarDocModalV167(); },60);
    return false;
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const texto=(document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '').trim();
    if(!texto) return Utils.toast('Informe o texto do atestado.');
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('AT');
    const doc={
      id,...this.pacienteDocV167(),
      tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
      tipoDoc:'Atestado',
      dias:document.getElementById('at-dias')?.value||'',
      inicio:document.getElementById('at-inicio')?.value||'',
      dataInicio:document.getElementById('at-inicio')?.value||'',
      cid:document.getElementById('at-cid')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:texto,
      texto,
      obs:document.getElementById('at-obs')?.value||'',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };
    this.sincronizarDocumentoAtendimentoV167('Atestado',doc,'ATESTADOS');
    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Atestado'}); }catch(e){} },80);
    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Atestado salvo e enviado para impressão.':'Atestado salvo no documento.');
    return true;
  };

  RegistrarConsulta.modalPedido=function(d={}){
    this.capturarAntesDocumentoV167();
    const body=`
      <div class="doc-original-banner doc-banner-blue">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="doc-modal-original doc-grid-fix-v164 doc-grid-fix-v167">
        <div class="f-col f-full"><label>Exames solicitados</label><textarea id="pe-exames" rows="8" placeholder="Digite um exame por linha">${esc(d.exames||d.lista||'')}</textarea></div>
        <div class="f-col f-full"><label>Hipótese diagnóstica / Observação</label><textarea id="pe-obs" rows="4" placeholder="Observações do pedido">${esc(d.obs||'')}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.savePedido(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.savePedido(true)">🖨️ Salvar e imprimir</button>`;
    this.abrirDocumentoEstavelV167(d.id?'Editar Pedido de Exames':'Novo Pedido de Exames',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()'); this.estabilizarDocModalV167(); },60);
    return false;
  };

  RegistrarConsulta.savePedido=function(imprimir=false){
    const exames=(document.getElementById('pe-exames')?.value || document.getElementById('ex-exames')?.value || document.getElementById('ped-exames')?.value || '').trim();
    const selecionados=Array.from(document.querySelectorAll('input[name="pe-exame-opt"]:checked')).map(x=>x.value).filter(Boolean);
    const textoFinal=exames || selecionados.join('\n');
    if(!textoFinal) return Utils.toast('Informe ou selecione os exames.');
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('PE');
    const doc={
      id,...this.pacienteDocV167(),
      exames:textoFinal,
      lista:textoFinal,
      examesSelecionados:selecionados,
      obs:document.getElementById('pe-obs')?.value||'',
      tipo:'Pedido de Exames',
      tipoDoc:'Pedido de Exames',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };
    this.sincronizarDocumentoAtendimentoV167('Pedido de Exames',doc,'EXAMES_PEDIDOS');
    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Pedido de Exames'}); }catch(e){} },80);
    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Pedido salvo e enviado para impressão.':'Pedido de exames salvo no documento.');
    return true;
  };

  RegistrarConsulta.modalLaudo=function(d={}){
    this.capturarAntesDocumentoV167();
    const body=`
      <div class="doc-original-banner doc-banner-cyan">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v167">
        <div class="f-col f-full"><label>Título do laudo</label><input id="ld-titulo" value="${esc(d.titulo||'')}" placeholder="Ex.: Laudo médico"></div>
        <div class="f-col f-full"><label>CID-10</label><input id="ld-cid" placeholder="CID" value="${esc(d.cid||'')}"></div>
        <div class="f-col f-full"><label>Laudo</label><textarea id="ld-texto" rows="10" placeholder="Digite o conteúdo do laudo...">${esc(d.texto||d.descricao||d.conclusao||'')}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveLaudo(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveLaudo(true)">🖨️ Salvar e imprimir</button>`;
    this.abrirDocumentoEstavelV167(d.id?'Editar Laudo Médico':'Novo Laudo Médico',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()'); this.estabilizarDocModalV167(); },60);
    return false;
  };

  RegistrarConsulta.saveLaudo=function(imprimir=false){
    const texto=(document.getElementById('ld-texto')?.value||'').trim();
    if(!texto) return Utils.toast('Informe o texto do laudo.');
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('LD');
    const doc={
      id,...this.pacienteDocV167(),
      titulo:document.getElementById('ld-titulo')?.value||'Laudo médico',
      cid:document.getElementById('ld-cid')?.value||'',
      texto,
      descricao:texto,
      conclusao:texto,
      tipo:'Laudo',
      tipoDoc:'Laudo',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };
    this.sincronizarDocumentoAtendimentoV167('Laudo',doc,'LAUDOS');
    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Laudo'}); }catch(e){} },80);
    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Laudo salvo e enviado para impressão.':'Laudo salvo no documento.');
    return true;
  };
})();




/* =========================================================
   ZERO V16.8 — Receita/Medicamento sem piscar ao aplicar
   Correções:
   - Aplicar medicamento não fecha/reabre o modal de receita.
   - A troca Medicamento -> Nova Receita é feita dentro do mesmo modal.
   - O medicamento aparece imediatamente na lista, sem tela vazia.
   - Periodicidade também volta para o medicamento sem reconstruir o modal inteiro.
   - Mantém as opções de salvar/imprimir já configuradas.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__receitaMedicamentoSemPiscarV168) return;
  RegistrarConsulta.__receitaMedicamentoSemPiscarV168=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };

  RegistrarConsulta.travarTrocaReceitaV168=function(){
    document.body.classList.add('receita-modal-sem-piscar-v168');
    const root=document.getElementById('modal-root');
    if(root) root.classList.add('receita-modal-root-v168');
  };

  RegistrarConsulta.estabilizarReceitaV168=function(){
    this.travarTrocaReceitaV168();
    try{ this.estabilizarDocModalV167 && this.estabilizarDocModalV167(); }catch(e){}
    const root=document.getElementById('modal-root');
    if(!root) return;
    root.querySelectorAll('.modal,.modal-backdrop,.modal-title,.modal-body,.modal-footer').forEach(el=>{
      el.style.animation='none';
      el.style.transition='none';
      el.style.opacity='1';
      el.style.visibility='visible';
      el.style.transform='none';
    });
  };

  RegistrarConsulta.trocarConteudoModalAtualV168=function(titulo,body,footer='',size='lg',xAction='Modal.close()'){
    this.travarTrocaReceitaV168();
    const root=document.getElementById('modal-root');
    const modal=root?.querySelector?.('.modal');
    if(!root || !modal){
      if(this.abrirDocumentoEstavelV167) this.abrirDocumentoEstavelV167(titulo,body,footer,size);
      else Modal.open(titulo,body,footer,size);
      setTimeout(()=>this.estabilizarReceitaV168(),20);
      return false;
    }

    modal.classList.remove('sm','md','lg','xl');
    if(size) modal.classList.add(size);

    let title=modal.querySelector('.modal-title');
    if(!title){
      title=document.createElement('div');
      title.className='modal-title';
      modal.insertBefore(title,modal.firstChild);
    }
    title.innerHTML=`${titulo}<button type="button" class="modal-x" onclick="${xAction}">×</button>`;

    let bodyEl=modal.querySelector('.modal-body');
    if(!bodyEl){
      bodyEl=document.createElement('div');
      bodyEl.className='modal-body';
      modal.appendChild(bodyEl);
    }
    bodyEl.innerHTML=body;

    let foot=modal.querySelector('.modal-footer');
    if(footer){
      if(!foot){
        foot=document.createElement('div');
        foot.className='modal-footer';
        modal.appendChild(foot);
      }
      foot.innerHTML=footer;
    }else if(foot){
      foot.remove();
    }

    this.estabilizarReceitaV168();
    requestAnimationFrame(()=>this.estabilizarReceitaV168());
    setTimeout(()=>this.estabilizarReceitaV168(),30);
    return false;
  };

  RegistrarConsulta.htmlReceitaAtualV168=function(){
    const r=this.__receitaSnapshotV162 || {
      id:this.receitaContext?.id||'',
      obs:this.receitaContext?.obs||'',
      medicamentos:this.receitaMeds||[]
    };
    const data={id:r.id||'',obs:r.obs||'',orientacao:r.obs||'',medicamentos:r.medicamentos||this.receitaMeds||[]};
    if(this.htmlReceitaV167) return this.htmlReceitaV167(data);
    if(this.htmlReceitaV162) return this.htmlReceitaV162(data);
    return '';
  };

  RegistrarConsulta.footerReceitaAtualV168=function(){
    if(this.footerReceitaV167) return this.footerReceitaV167();
    if(this.footerReceitaV162) return this.footerReceitaV162();
    return `<button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167 && RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveReceita(false,'receita')">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveReceita(true,'receita')">🖨️ Salvar e imprimir receita</button>
      <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>`;
  };

  RegistrarConsulta.mostrarReceitaSemPiscarV168=function(){
    const r=this.__receitaSnapshotV162 || {
      id:this.receitaContext?.id||'',
      obs:this.receitaContext?.obs||'',
      medicamentos:this.receitaMeds||[]
    };
    this.receitaContext={id:r.id||'',obs:r.obs||''};
    this.receitaMeds=Array.isArray(r.medicamentos) ? clone(r.medicamentos) : (Array.isArray(this.receitaMeds)?clone(this.receitaMeds):[]);

    const titulo=this.receitaContext.id?'Editar Receita Médica':'Nova Receita Médica';
    this.trocarConteudoModalAtualV168(titulo,this.htmlReceitaAtualV168(),this.footerReceitaAtualV168(),'lg','RegistrarConsulta.voltarRegistroDepoisDocV167()');
    this.renderListaMedsReceitaOriginal && this.renderListaMedsReceitaOriginal();
    const x=document.querySelector('#modal-root .modal-x');
    if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()');
    this.estabilizarReceitaV168();
    return false;
  };

  RegistrarConsulta.restaurarReceitaV162=function(){
    return this.mostrarReceitaSemPiscarV168();
  };
  RegistrarConsulta.voltarReceitaV143=function(){
    return this.mostrarReceitaSemPiscarV168();
  };

  RegistrarConsulta.abrirModalMedicamentoV162=function(d={},editando=false){
    this.__medDraftV162=Object.assign({},this.__medDraftV162||{},d||{});
    const titulo=editando?'Editar medicamento':'Adicionar medicamento';
    const footer=`<button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.restaurarReceitaV162()">Cancelar</button>
       <button type="button" class="btn btn-green" onclick="RegistrarConsulta.aplicarMedicamentoReceitaOriginal()">Aplicar</button>`;
    this.trocarConteudoModalAtualV168(titulo,this.htmlMedicamentoV162(d),footer,'lg','RegistrarConsulta.restaurarReceitaV162()');
    return false;
  };

  RegistrarConsulta.abrirModalPeriodicidadeMedicamento=function(){
    const d=this.capturarMedicamentoTelaV162 ? this.capturarMedicamentoTelaV162() : (this.__medDraftV162||{});
    const opcoes=['A cada 6h','A cada 8h','A cada 12h','1x ao dia','2x ao dia','3x ao dia','4x ao dia','Uso contínuo','Se necessário','Personalizado'];
    const atual=d.periodicidadeTexto||'';
    const personalizado=d.personalizado || (atual.match(/Personalizado:\s*(.+)$/i)||[])[1] || '';
    const body=`
      <div class="period-original-v162 period-original-v168">
        ${opcoes.map(op=>`<label class="period-modal-opt">
          <input type="checkbox" name="period-med-opt" value="${esc(op)}" ${(d.opts||[]).includes(op)||atual.includes(op)?'checked':''} onchange="RegistrarConsulta.togglePeriodicidadePersonalizada()">
          <span>${esc(op)}</span>
        </label>`).join('')}
      </div>
      <div id="period-personalizado-box" style="display:${atual.includes('Personalizado')||personalizado?'block':'none'};margin-top:12px;">
        <label>Descrever periodicidade personalizada</label>
        <input id="period-personalizado-texto" value="${esc(personalizado)}" placeholder="Ex.: ao deitar, dias alternados">
      </div>`;
    const footer=`<button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarMedicamentoV162()">Cancelar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.aplicarPeriodicidadeMedicamento()">Aplicar</button>`;
    this.trocarConteudoModalAtualV168('Selecionar periodicidade',body,footer,'md','RegistrarConsulta.voltarMedicamentoV162()');
    return false;
  };

  RegistrarConsulta.voltarMedicamentoV162=function(){
    const d=this.__medDraftV162||{};
    this.abrirModalMedicamentoV162(d,d.index!==''&&d.index!==undefined&&d.index!==null);
    return false;
  };

  RegistrarConsulta.aplicarPeriodicidadeMedicamento=function(){
    const opts=Array.from(document.querySelectorAll('input[name="period-med-opt"]:checked')).map(x=>x.value);
    const personalizado=document.getElementById('period-personalizado-texto')?.value?.trim()||'';
    const texto=opts.map(v=>v==='Personalizado' && personalizado ? 'Personalizado: '+personalizado : v).filter(Boolean).join(' + ') || 'A cada 8h';

    this.__medDraftV162=Object.assign({},this.__medDraftV162||{}, {periodicidadeTexto:texto,opts,personalizado});
    this.__periodicidadeMarcadaV143={opts,personalizado,texto};
    this.periodicidadeTemp=texto;
    return this.voltarMedicamentoV162();
  };

  RegistrarConsulta.aplicarMedicamentoReceitaOriginal=function(){
    const indexRaw=document.getElementById('med-edit-index')?.value;
    const periodicidade=document.getElementById('med-periodicidade-resumo')?.textContent?.trim() || this.__medDraftV162?.periodicidadeTexto || this.periodicidadeTemp || 'A cada 8h';
    const duracao=document.getElementById('med-duracao')?.value?.trim()||'';
    const dose=document.getElementById('med-dose')?.value?.trim()||'';

    const med={
      nome:document.getElementById('med-nome')?.value?.trim()||'',
      formula:document.getElementById('med-formula')?.value?.trim()||'',
      concentracao:document.getElementById('med-formula')?.value?.trim()||'',
      formaFarmaceutica:document.getElementById('med-forma')?.value?.trim()||'',
      apresentacao:document.getElementById('med-forma')?.value?.trim()||'',
      quantidade:document.getElementById('med-quantidade')?.value?.trim()||'',
      via:document.getElementById('med-via')?.value||'Oral',
      dose,
      periodicidadeTexto:periodicidade,
      periodicidades:this.__medDraftV162?.opts||this.__periodicidadeMarcadaV143?.opts||[],
      periodicidadePersonalizada:this.__medDraftV162?.personalizado||this.__periodicidadeMarcadaV143?.personalizado||'',
      posologia:[dose,periodicidade].filter(Boolean).join(' - '),
      duracao,
      usoContinuo:String(duracao).toLowerCase().includes('contínuo') || String(duracao).toLowerCase().includes('continuo') || String(periodicidade).toLowerCase().includes('uso contínuo') || String(periodicidade).toLowerCase().includes('uso continuo'),
      orientacao:document.getElementById('med-orientacao')?.value?.trim()||''
    };

    if(!med.nome){
      Utils.toast('Informe o medicamento.');
      return false;
    }

    if(!Array.isArray(this.receitaMeds)) this.receitaMeds=[];
    if(indexRaw!=='' && indexRaw!=null && !isNaN(Number(indexRaw))) this.receitaMeds[Number(indexRaw)]=med;
    else this.receitaMeds.push(med);

    this.__receitaSnapshotV162={
      id:this.receitaContext?.id||'',
      obs:this.receitaContext?.obs||'',
      medicamentos:clone(this.receitaMeds)||[]
    };

    this.__medDraftV162={};
    this.mostrarReceitaSemPiscarV168();
    Utils.toast('Medicamento adicionado à receita.');
    return false;
  };
})();




/* =========================================================
   ZERO V17.1 — Anexo no Registrar Consulta: abre PDF e só salva no menu ao salvar consulta
   Correções:
   - PDF/imagem anexado no Registrar Consulta recebe blobUrl imediato.
   - Visualizar/Imprimir não depende do FileReader terminar para abrir.
   - Não grava EXAMES_ARQUIVOS ao anexar no modal.
   - Só vai para menu Exames quando salvar o Registrar Consulta.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__anexoPdfSalvarFinalV171) return;
  RegistrarConsulta.__anexoPdfSalvarFinalV171=true;

  const clone=(v)=>{ try{return Utils.clone ? Utils.clone(v) : JSON.parse(JSON.stringify(v||null));}catch(e){return v;} };

  RegistrarConsulta.mimeArquivoV171=function(file,nome=''){
    const n=String(nome||file?.name||'').toLowerCase();
    let mime=String(file?.type||'').toLowerCase();
    if(!mime || mime==='application/octet-stream'){
      if(n.endsWith('.pdf')) mime='application/pdf';
      else if(/\.(jpg|jpeg)$/i.test(n)) mime='image/jpeg';
      else if(n.endsWith('.png')) mime='image/png';
      else if(n.endsWith('.gif')) mime='image/gif';
      else if(n.endsWith('.webp')) mime='image/webp';
    }
    return mime || 'application/octet-stream';
  };

  RegistrarConsulta.urlArquivoSessaoV171=function(file){
    try{
      if(file && window.URL && URL.createObjectURL) return URL.createObjectURL(file);
    }catch(e){}
    return '';
  };

  RegistrarConsulta.pacienteAnexoFinalV171=function(){
    const p=this.pac||{};
    return {
      pacId:p.id||'',
      pacienteId:p.id||'',
      paciente:p.nome||p.nomeCompleto||'',
      pacienteNome:p.nome||p.nomeCompleto||'',
      pacienteCpf:p.cpf||'',
      pacienteNascimento:p.nascimento||p.dataNascimento||p.nasc||'',
      pacienteTelefone:p.telefone||p.celular||p.tel||'',
      pacienteConvenio:p.convenio||p.plano||''
    };
  };

  RegistrarConsulta.upsertDocTemporarioV171=function(doc){
    if(!doc || !doc.id) return doc;

    const up=(arr)=>{
      if(!Array.isArray(arr)) return;
      const i=arr.findIndex(x=>String(x.id)===String(doc.id));
      if(i>=0) arr[i]={...arr[i],...doc};
      else arr.push(doc);
    };

    if(window.Documentos){
      if(!Array.isArray(Documentos.temp)) Documentos.temp=[];
      if(!Array.isArray(Documentos.tempBackupV108)) Documentos.tempBackupV108=[];
      up(Documentos.temp);
      up(Documentos.tempBackupV108);
    }

    if(!Array.isArray(this.docsBackupV108)) this.docsBackupV108=[];
    up(this.docsBackupV108);

    // Garantia: enquanto estiver só no modal, não aparece no menu Exames.
    try{
      const id=String(doc.id);
      Store.set('EXAMES_ARQUIVOS',(Store.get('EXAMES_ARQUIVOS')||[]).filter(x=>String(x.id)!==id));
    }catch(e){}

    try{ this.docsUnificadosV166 && this.docsUnificadosV166(); }catch(e){}
    try{ this.renderCards && this.renderCards(); }catch(e){}
    return doc;
  };

  RegistrarConsulta.criarDocAnexoV166=function(file,dataUrl=''){
    const nome=file?.name||'Arquivo anexado';
    const mime=this.mimeArquivoV171(file,nome);
    const blobUrl=this.urlArquivoSessaoV171(file);
    const base=this.pacienteAnexoFinalV171();

    const doc={
      id:this.uidAnexoV166 ? this.uidAnexoV166() : (Utils.id ? Utils.id('EX') : ('EX_'+Date.now())),
      ...base,
      consultaId:this.consId||this.atendimentoId||'',
      atendimentoId:this.atendimentoId||this.consId||'',
      nome,
      filename:nome,
      arquivoNome:nome,
      tipo:'Exame anexado',
      tipoDoc:'Exame anexado',
      tipoArquivo:mime,
      mime,
      contentType:mime,
      tamanho:file?.size||0,
      dataUrl:dataUrl||'',
      arquivo:dataUrl||'',
      conteudo:dataUrl||'',
      blobUrl,
      objectUrl:blobUrl,
      urlSessao:blobUrl,
      _fileObject:file||null,
      salvoNoMenu:false,
      temporarioRegistrarConsulta:true,
      obs:'Anexado pelo Registrar Consulta',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };

    return this.upsertDocTemporarioV171(doc);
  };

  RegistrarConsulta.atualizarDocAnexoV166=function(id,dataUrl=''){
    if(!id) return;
    let finalDoc=null;

    const update=(arr)=>{
      if(!Array.isArray(arr)) return;
      const d=arr.find(x=>String(x.id)===String(id));
      if(d){
        if(dataUrl){
          d.dataUrl=dataUrl;
          d.arquivo=dataUrl;
          d.conteudo=dataUrl;
        }
        const mime=this.mimeArquivoV171(d._fileObject||null,d.nome||d.filename||d.arquivoNome||'');
        if(!d.mime || d.mime==='application/octet-stream') d.mime=mime;
        if(!d.tipoArquivo || d.tipoArquivo==='application/octet-stream') d.tipoArquivo=mime;
        if(!d.contentType || d.contentType==='application/octet-stream') d.contentType=mime;
        if(!d.blobUrl && d._fileObject){
          const u=this.urlArquivoSessaoV171(d._fileObject);
          d.blobUrl=u; d.objectUrl=u; d.urlSessao=u;
        }
        d.salvoNoMenu=false;
        d.temporarioRegistrarConsulta=true;
        finalDoc={...d};
      }
    };

    update(window.Documentos?.temp);
    update(window.Documentos?.tempBackupV108);
    update(this.docsBackupV108);

    if(finalDoc) this.upsertDocTemporarioV171(finalDoc);
    try{ this.docsUnificadosV166 && this.docsUnificadosV166(); }catch(e){}
    try{ this.renderCards && this.renderCards(); }catch(e){}
  };

  RegistrarConsulta.saveAnexosConsulta=function(ev){
    try{ this.captureMainFormV106 && this.captureMainFormV106(); }catch(e){}
    try{ this.captureForm && this.captureForm(); }catch(e){}

    const input=ev?.target || document.getElementById('nc-anexos-exames-input');
    const files=Array.from(input?.files||[]);
    if(!files.length){
      Utils.toast('Selecione ao menos um arquivo.');
      return false;
    }

    let salvos=0;
    files.forEach(file=>{
      const doc=this.criarDocAnexoV166(file,'');
      if(!doc) return;
      salvos++;

      if(window.FileReader){
        const reader=new FileReader();
        reader.onload=()=>this.atualizarDocAnexoV166(doc.id,reader.result||'');
        reader.onerror=()=>this.atualizarDocAnexoV166(doc.id,'');
        try{ reader.readAsDataURL(file); }catch(e){ this.atualizarDocAnexoV166(doc.id,''); }
      }
    });

    try{ if(input) input.value=''; }catch(e){}
    try{ this.docsUnificadosV166 && this.docsUnificadosV166(); }catch(e){}
    try{ this.renderCards && this.renderCards(); }catch(e){}

    Utils.toast(`${salvos} exame(s) anexado(s) ao atendimento.`);
    return true;
  };

  // Documentos clínicos do modal só entram no card; o módulo próprio recebe ao salvar Registrar Consulta.
  RegistrarConsulta.sincronizarDocumentoAtendimentoV167=function(tipo,doc,key=''){
    if(!doc || !doc.id) return false;
    doc.tipo=doc.tipo||tipo;
    doc.tipoDoc=tipo;
    doc.temporarioRegistrarConsulta=true;
    doc.salvoNoMenu=false;

    if(window.Documentos){
      if(typeof Documentos.add==='function') Documentos.add(tipo,doc);
      if(!Array.isArray(Documentos.temp)) Documentos.temp=[];
      const i=Documentos.temp.findIndex(x=>String(x.id)===String(doc.id));
      if(i>=0) Documentos.temp[i]=clone(doc);
      else Documentos.temp.push(clone(doc));
      Documentos.tempBackupV108=clone(Documentos.temp)||[];
    }

    if(!Array.isArray(this.docsBackupV108)) this.docsBackupV108=[];
    const j=this.docsBackupV108.findIndex(x=>String(x.id)===String(doc.id));
    if(j>=0) this.docsBackupV108[j]=clone(doc);
    else this.docsBackupV108.push(clone(doc));

    try{ this.docsUnificadosV166 && this.docsUnificadosV166(); }catch(e){}
    try{ this.docsAtendimentoV164 && this.docsAtendimentoV164(); }catch(e){}
    try{ this.guardarDocsV164 && this.guardarDocsV164(); }catch(e){}
    try{ this.renderCards && this.renderCards(); }catch(e){}
    return true;
  };
})();




/* =========================================================
   ZERO V17.3 — Botões "Salvar" + Laudo sem CID
   Correções:
   - Texto dos botões volta para "Salvar".
   - Novo/Editar Laudo não mostra campo CID-10.
   - Laudo salvo não grava CID do modal.
   - Mantém modais estáveis e fluxos anteriores.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__botoesNoDocumentoLaudoSemCidV173) return;
  RegistrarConsulta.__botoesNoDocumentoLaudoSemCidV173=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const uid=(p)=>Utils.id ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.footerReceitaV167=function(){
    return `
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveReceita(false,'receita')">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveReceita(true,'receita')">🖨️ Salvar e imprimir receita</button>
      <button type="button" class="btn btn-purple" onclick="RegistrarConsulta.saveReceita(true,'receita-controle')">🧾 Salvar e imprimir controle especial</button>`;
  };

  RegistrarConsulta.footerReceitaAtualV168=function(){
    return this.footerReceitaV167();
  };

  RegistrarConsulta.modalPedido=function(d={}){
    this.capturarAntesDocumentoV167 && this.capturarAntesDocumentoV167();
    const exames=d.exames||d.lista||'';
    const body=`
      <div class="doc-original-banner doc-banner-blue">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v167">
        <div class="f-col f-full">
          <label>Exames solicitados</label>
          <textarea id="pe-exames" rows="8" placeholder="Digite um exame por linha">${esc(exames)}</textarea>
        </div>
        <div class="f-col f-full">
          <label>Hipótese diagnóstica / Observação</label>
          <textarea id="pe-obs" rows="4" placeholder="Observações do pedido">${esc(d.obs||'')}</textarea>
        </div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.savePedido(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.savePedido(true)">🖨️ Salvar e imprimir</button>`;
    this.abrirDocumentoEstavelV167(d.id?'Editar Pedido de Exames':'Novo Pedido de Exames',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()'); this.estabilizarDocModalV167 && this.estabilizarDocModalV167(); },60);
    return false;
  };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.capturarAntesDocumentoV167 && this.capturarAntesDocumentoV167();

    const textoInicial=d.motivo||d.texto||(this.textoAtestadoPadraoV98?this.textoAtestadoPadraoV98(d.dias||'',d.inicio||d.dataInicio||''):'');
    const body=`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v167">
        <div class="f-col"><label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.atualizarTextoAtestadoV98 && RegistrarConsulta.atualizarTextoAtestadoV98()">
            <option ${(String(d.tipo||'Atestado médico').includes('Atestado'))?'selected':''}>Atestado médico</option>
            <option ${(String(d.tipo||'').includes('Comparecimento'))?'selected':''}>Declaração de comparecimento</option>
          </select>
        </div>
        <div class="f-col"><label>Dias de afastamento</label><input id="at-dias" value="${esc(d.dias||'')}" placeholder="Ex: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV98 && RegistrarConsulta.atualizarTextoAtestadoV98()"></div>
        <div class="f-col"><label>Data de início</label><input id="at-inicio" type="date" value="${esc(d.inicio||d.dataInicio||'')}" oninput="RegistrarConsulta.atualizarTextoAtestadoV98 && RegistrarConsulta.atualizarTextoAtestadoV98()"></div>
        <div class="f-col"><label>CID-10</label><input id="at-cid" placeholder="Opcional" value="${esc(d.cid||'')}"></div>
        <div class="f-col"><label>Hora de chegada</label><input id="at-hora-chegada" type="time" value="${esc(d.horaChegada||'')}"></div>
        <div class="f-col"><label>Hora de saída</label><input id="at-hora-saida" type="time" value="${esc(d.horaSaida||d.hora||'')}"></div>
        <div class="f-col f-full"><label>Texto do atestado</label><textarea id="at-motivo" rows="8" oninput="this.dataset.editado='1'">${esc(textoInicial)}</textarea></div>
        <div class="f-col f-full"><label>Observações</label><textarea id="at-obs" rows="3">${esc(d.obs||'')}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveAtestado(true)">🖨️ Salvar e imprimir</button>`;
    this.abrirDocumentoEstavelV167(d.id?'Editar Atestado Médico':'Novo Atestado Médico',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()'); this.estabilizarDocModalV167 && this.estabilizarDocModalV167(); },60);
    return false;
  };

  RegistrarConsulta.modalLaudo=function(d={}){
    this.capturarAntesDocumentoV167 && this.capturarAntesDocumentoV167();
    const body=`
      <div class="doc-original-banner doc-banner-cyan">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${Utils.today()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v167 laudo-sem-cid-v173">
        <div class="f-col f-full"><label>Título do laudo</label><input id="ld-titulo" value="${esc(d.titulo||'')}" placeholder="Ex.: Laudo médico"></div>
        <div class="f-col f-full"><label>Laudo</label><textarea id="ld-texto" rows="10" placeholder="Digite o conteúdo do laudo...">${esc(d.texto||d.descricao||d.conclusao||'')}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveLaudo(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveLaudo(true)">🖨️ Salvar e imprimir</button>`;
    this.abrirDocumentoEstavelV167(d.id?'Editar Laudo Médico':'Novo Laudo Médico',body,footer,'lg');
    setTimeout(()=>{ const x=document.querySelector('#modal-root .modal-x'); if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()'); this.estabilizarDocModalV167 && this.estabilizarDocModalV167(); },60);
    return false;
  };

  RegistrarConsulta.saveLaudo=function(imprimir=false){
    const texto=(document.getElementById('ld-texto')?.value||'').trim();
    if(!texto) return Utils.toast('Informe o texto do laudo.');
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('LD');
    const doc={
      id,
      ...(this.pacienteDocV167 ? this.pacienteDocV167() : {}),
      titulo:document.getElementById('ld-titulo')?.value||'Laudo médico',
      cid:'',
      cid10:'',
      texto,
      descricao:texto,
      conclusao:texto,
      tipo:'Laudo',
      tipoDoc:'Laudo',
      data:Utils.today(),
      criadoEm:new Date().toISOString()
    };
    this.sincronizarDocumentoAtendimentoV167('Laudo',doc,'LAUDOS');
    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Laudo'}); }catch(e){} },80);
    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Laudo salvo e enviado para impressão.':'Laudo salvo no documento.');
    return true;
  };
})();




/* =========================================================
   ZERO V17.4 — Texto do botão de salvar
   Regra: botão de salvar sem imprimir fica escrito apenas "Salvar".
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__botaoSalvarNomeV174) return;
  RegistrarConsulta.__botaoSalvarNomeV174=true;

  RegistrarConsulta.normalizarBotoesSalvarV174=function(){
    document.querySelectorAll('#modal-root button').forEach(btn=>{
      const t=String(btn.textContent||'').trim().toLowerCase();
      const onclick=String(btn.getAttribute('onclick')||'');
      const isSalvarSemImprimir=
        (t.includes('só salvar') || t==='salvar documento' || t.includes('salvar no documento')) &&
        !t.includes('imprimir') &&
        /saveReceita\(false|savePedido\(false|saveAtestado\(false|saveLaudo\(false/.test(onclick);
      if(isSalvarSemImprimir) btn.innerHTML='💾 Salvar';
    });
  };

  const oldAbrirDocumentoEstavelV174=RegistrarConsulta.abrirDocumentoEstavelV167?.bind(RegistrarConsulta);
  if(oldAbrirDocumentoEstavelV174){
    RegistrarConsulta.abrirDocumentoEstavelV167=function(){
      const ret=oldAbrirDocumentoEstavelV174(...arguments);
      setTimeout(()=>this.normalizarBotoesSalvarV174(),20);
      setTimeout(()=>this.normalizarBotoesSalvarV174(),80);
      return ret;
    };
  }

  const oldTrocarConteudoV174=RegistrarConsulta.trocarConteudoModalAtualV168?.bind(RegistrarConsulta);
  if(oldTrocarConteudoV174){
    RegistrarConsulta.trocarConteudoModalAtualV168=function(){
      const ret=oldTrocarConteudoV174(...arguments);
      setTimeout(()=>this.normalizarBotoesSalvarV174(),20);
      setTimeout(()=>this.normalizarBotoesSalvarV174(),80);
      return ret;
    };
  }
})();




/* =========================================================
   ZERO V17.8 — Novo Registro sempre em branco
   Regra:
   - Toda vez que abrir Registrar Consulta/Novo Registro, abre limpo.
   - Não puxa rascunho anterior.
   - Não puxa atendimento salvo do mesmo dia.
   - Não puxa atendimento de outro dia.
   - Submodais continuam preservando o que foi digitado enquanto o modal atual está aberto.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__novoRegistroEmBrancoV178) return;
  RegistrarConsulta.__novoRegistroEmBrancoV178=true;

  RegistrarConsulta.limparRascunhosPacienteV178=function(pacId='',consId=''){
    try{
      const prefix=`CM_REG_CONSULTA_DRAFT_V111_${pacId}_`;
      const keys=[];
      for(let i=0;i<sessionStorage.length;i++){
        const k=sessionStorage.key(i);
        if(k && (k.startsWith(prefix) || (consId && k===`CM_REG_CONSULTA_DRAFT_V111_${pacId}_${consId}`))){
          keys.push(k);
        }
      }
      keys.forEach(k=>sessionStorage.removeItem(k));
    }catch(e){}
  };

  RegistrarConsulta.limparEstadoNovoRegistroV178=function(pacId='',consId=''){
    this.formDraft=null;
    this.mainFormDraftV106=null;
    this.__mainFormSnapshotV162=null;
    this.__registroSnapshotV143=null;
    this.docsBackupV108=[];
    this.receitaContext=null;
    this.receitaMeds=[];
    this.__receitaSnapshotV162=null;
    this.__medDraftV162=null;
    this.__periodicidadeMarcadaV143=null;
    this.periodicidadeTemp=null;

    if(window.Documentos){
      Documentos.temp=[];
      Documentos.tempBackupV108=[];
      Documentos.pacId=pacId||'';
      Documentos.consId=consId||'';
    }

    this.limparRascunhosPacienteV178(pacId,consId);
  };

  // Rascunho persistente desativado para o Novo Registro sempre abrir limpo.
  RegistrarConsulta.carregarRascunhoV111=function(){ return null; };
  RegistrarConsulta.salvarRascunhoV111=function(){ return false; };
  RegistrarConsulta.aplicarRascunhoV111=function(){ return false; };
  RegistrarConsulta.limparRascunhoV111=function(){
    try{
      this.limparRascunhosPacienteV178(this.pac?.id||'',this.consId||this.atendimentoId||'');
    }catch(e){}
    return true;
  };

  const oldOpenV178=RegistrarConsulta.open?.bind(RegistrarConsulta);
  RegistrarConsulta.open=function(pacId,atendimentoId=''){
    const pId=String(pacId||'');
    const aId=String(atendimentoId||'');

    this.__abrindoNovoRegistroV178=true;
    this.limparEstadoNovoRegistroV178(pId,aId);

    const ret=oldOpenV178 ? oldOpenV178(pacId,atendimentoId) : undefined;

    const consId=this.consId||this.atendimentoId||aId||'';
    this.limparEstadoNovoRegistroV178(pId,consId);

    // Documentos.start pode ter rodado dentro do open; preserva apenas identificação, sem cards antigos.
    if(window.Documentos){
      Documentos.pacId=pId;
      Documentos.consId=consId;
      Documentos.temp=[];
      Documentos.tempBackupV108=[];
    }

    requestAnimationFrame(()=>{
      try{
        this.formDraft=null;
        this.mainFormDraftV106=null;
        this.docsBackupV108=[];
        if(window.Documentos){
          Documentos.temp=[];
          Documentos.tempBackupV108=[];
        }
        this.afterRender && this.afterRender();
        this.renderCards && this.renderCards();
      }catch(e){}
      this.__abrindoNovoRegistroV178=false;
    });

    setTimeout(()=>{
      try{
        this.formDraft=null;
        this.mainFormDraftV106=null;
        this.docsBackupV108=[];
        if(window.Documentos){
          Documentos.temp=[];
          Documentos.tempBackupV108=[];
        }
        this.renderCards && this.renderCards();
      }catch(e){}
      this.__abrindoNovoRegistroV178=false;
    },120);

    return ret;
  };

  // Depois de salvar atendimento, garante que a próxima abertura venha limpa.
  const oldSalvarAtendimentoV178=RegistrarConsulta.salvarAtendimentoV110?.bind(RegistrarConsulta);
  if(oldSalvarAtendimentoV178){
    RegistrarConsulta.salvarAtendimentoV110=function(finalizar=true){
      const pacId=this.pac?.id||'';
      const consId=this.consId||this.atendimentoId||'';
      const ret=oldSalvarAtendimentoV178(finalizar);
      try{ this.limparEstadoNovoRegistroV178(pacId,consId); }catch(e){}
      return ret;
    };
    RegistrarConsulta.save=function(finalizar=true){
      return this.salvarAtendimentoV110(finalizar);
    };
  }

  // Se o usuário cancelar/fechar sem salvar, também não guarda nada para reabrir.
  const oldCloseModalV178=window.Modal?.close?.bind(window.Modal);
  if(window.Modal && oldCloseModalV178 && !Modal.__novoRegistroBlankCloseV178){
    Modal.__novoRegistroBlankCloseV178=true;
    Modal.close=function(){
      try{
        if(window.RegistrarConsulta?.isTelaPrincipalAbertaV111?.()){
          const pacId=RegistrarConsulta.pac?.id||'';
          const consId=RegistrarConsulta.consId||RegistrarConsulta.atendimentoId||'';
          RegistrarConsulta.limparEstadoNovoRegistroV178(pacId,consId);
        }
      }catch(e){}
      return oldCloseModalV178();
    };
  }
})();




/* =========================================================
   ZERO V18.0 — Procedimento salva só campos do procedimento
   Correções:
   - Ao marcar Procedimento, não puxa campos de Consulta/Retorno/Urgência/Emergência.
   - Queixa/Motivo e Observação do agendamento/card não entram em Evolução nem Objetivo.
   - Objetivo/Exame físico não recebe Queixa/Motivo.
   - Cada tipo salva somente os campos visíveis/do seu modo.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__procedimentoCamposSeparadosV180) return;
  RegistrarConsulta.__procedimentoCamposSeparadosV180=true;

  RegistrarConsulta.campoV180=function(id){
    return (document.getElementById(id)?.value||'').trim();
  };

  RegistrarConsulta.tipoLimpoV180=function(){
    return document.getElementById('nc-tipo')?.value || 'Consulta';
  };

  RegistrarConsulta.ehProcedimentoV180=function(tipo){
    return String(tipo||'').toLowerCase().includes('proced');
  };

  RegistrarConsulta.queixaObsAtendimentoV180=function(){
    const atd=(this.dadosAtendimentoAtualV133 && this.dadosAtendimentoAtualV133()) ||
      (this.dadosAtendimentoAtualV130 && this.dadosAtendimentoAtualV130()) || {};
    return {
      queixa:this.campoV180('nc-queixa-motivo-v124') || atd.queixa || atd.motivo || atd.procedimento || '',
      observacao:this.campoV180('nc-observacao-geral-v124') || atd.observacao || atd.obs || ''
    };
  };

  RegistrarConsulta.coletarRegistroPorTipoV180=function(tipo){
    const procedimento=this.ehProcedimentoV180(tipo);
    let S='',O='',A='',P='',anamneseCompleta=null;

    if(procedimento){
      // Procedimento: somente os campos do bloco Registro procedural.
      S=this.campoV180('nc-s');
      O=this.campoV180('nc-o');
      A=this.campoV180('nc-a');
      P=this.campoV180('nc-p');
      return {S,O,A,P,anamneseCompleta,procedimento:true};
    }

    // Consulta, Retorno, Urgência e Emergência: somente anamnese/consulta médica.
    try{
      anamneseCompleta=this.coletarAnamnese ? this.coletarAnamnese() : null;
      S=this.montarResumoAnamnese ? (this.montarResumoAnamnese(anamneseCompleta)||'') : '';
      O=this.montarResumoObjetivo ? (this.montarResumoObjetivo(anamneseCompleta)||'') : '';
      A=anamneseCompleta?.hipoteseDiagnostica||'';
      P=anamneseCompleta?.conduta||'';
    }catch(e){}

    return {S,O,A,P,anamneseCompleta,procedimento:false};
  };

  RegistrarConsulta.limparHistoricoPoluidoV180=function(hist){
    if(!hist) return hist;
    const qo=hist.queixaMotivo||hist.queixa||hist.motivo||'';
    const obsAg=hist.observacaoAtendimento||hist.observacaoGeral||'';

    // Garante que queixa/observação do agendamento não sejam misturadas nos campos clínicos.
    if(qo && String(hist.S||hist.evolucao||'').trim()===String(qo).trim()){
      hist.S='';
      hist.evolucao='';
    }
    if(obsAg && String(hist.O||hist.obs||'').trim()===String(obsAg).trim()){
      hist.O='';
      hist.obs='';
    }
    return hist;
  };

  RegistrarConsulta.salvarAtendimentoV110=function(finalizar=true){
    try{
      this.captureMainFormV106 && this.captureMainFormV106();
      this.restoreDocsBackupV108 && this.restoreDocsBackupV108();

      const p=this.pac;
      if(!p || !p.id) return Utils.toast('Paciente não encontrado para salvar atendimento.');

      const tipo=this.tipoLimpoV180();
      const cid=this.campoV180('nc-cid');
      const {S,O,A,P,anamneseCompleta,procedimento}=this.coletarRegistroPorTipoV180(tipo);
      const {queixa,observacao}=this.queixaObsAtendimentoV180();

      if(window.Documentos && (!Documentos.temp || !Documentos.temp.length)){
        if(this.docsBackupV108?.length) Documentos.temp=Utils.clone(this.docsBackupV108);
        else if(Documentos.tempBackupV108?.length) Documentos.temp=Utils.clone(Documentos.tempBackupV108);
      }

      const docs=(window.Documentos?.temp)||[];

      // Queixa/observação do agendamento não contam como atendimento preenchido.
      if(!S && !O && !A && !P && !docs.length){
        return Utils.toast('Preencha o atendimento ou inclua algum documento/anexo antes de salvar.');
      }

      const histId=Utils.id('HIST');
      const consultaId=this.consId || this.atendimentoId || histId;
      const prof=(this.profissionalAtualAtendimentoV109 && this.profissionalAtualAtendimentoV109()) ||
        (this.profissionalAtualAtendimentoV106 && this.profissionalAtualAtendimentoV106()) || {};
      const conselho=(window.Profissionais?.conselho && prof) ? Profissionais.conselho(prof) : (prof.conselho||prof.crm||'');

      const docsSalvos=window.Documentos ? (Documentos.consolidate(p.id,consultaId,histId)||[]) : [];

      const hist=this.limparHistoricoPoluidoV180({
        id:histId,
        pacId:p.id,
        pacienteId:p.id,
        paciente:p.nome||p.nomeCompleto||'',
        consultaId,
        atendimentoId:this.atendimentoId||consultaId,
        data:Utils.today(),
        hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
        criadoEm:new Date().toISOString(),
        profissionalId:prof.id||'',
        profissional:prof.nome||'',
        medico:prof.nome||'',
        conselho,
        crm:conselho,
        tipo,
        tipoAtendimento:tipo,
        tipoConsulta:tipo,
        origem:procedimento?'procedimento':String(tipo||'consulta').toLowerCase(),
        status:finalizar?'Realizado':'Aguardando',
        cid,

        // Campos clínicos reais do tipo escolhido.
        S:S||'',
        O:O||'',
        A:A||'',
        P:P||'',
        evolucao:S||'',
        conduta:P||'',
        obs:O||'',

        // Campos vindos do card/agendamento ficam separados.
        queixaMotivo:queixa||'',
        motivo:queixa||'',
        observacaoAtendimento:observacao||'',
        observacaoGeral:observacao||'',

        anamneseCompleta:procedimento?null:anamneseCompleta,
        registroCompleto:{tipo,S:S||'',O:O||'',A:A||'',P:P||'',cid,procedimento,anamneseCompleta:procedimento?null:anamneseCompleta},

        procedimentoRealizado:procedimento?(S||''):'',
        materiais:procedimento?(O||''):'',
        intercorrencias:procedimento?(A||''):'',
        evolucaoProcedural:procedimento?(P||''):'',

        documentos:docsSalvos,
        documentosAtendimento:docsSalvos,
        anexos:docsSalvos.filter(d=>d.tipoDoc==='Exame anexado')
      });

      Store.upsert('HISTORICO',hist);

      const atds=Store.get('ATENDIMENTOS')||[];
      let atd=atds.find(a=>String(a.id)===String(this.atendimentoId||this.consId));
      if(!atd) atd=atds.find(a=>String(a.pacId||a.pacienteId)===String(p.id) && ['Em atendimento','Aguardando'].includes(a.status||''));
      if(atd){
        atd.histId=histId;
        atd.ultimoHistId=histId;
        atd.tipo=tipo;
        atd.tipoConsulta=tipo;

        // Atualiza somente o card/agendamento, sem jogar isso em evolução/objetivo.
        if(queixa) atd.queixa=queixa;
        if(observacao) atd.obs=observacao;

        if(finalizar){
          atd.status='Finalizado';
          atd.finalizadoEm=new Date().toISOString();
          atd.horaFim=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        }else{
          atd.status='Aguardando';
          atd.finalizadoEm='';
          atd.horaFim='';
        }
        Store.upsert('ATENDIMENTOS',atd);

        if(atd.origemAgendaId){
          const ag=(Store.get('AGENDA_MEDICA')||[]).find(a=>String(a.id)===String(atd.origemAgendaId));
          if(ag){
            ag.status=finalizar?'Atendido':'Aguardando';
            ag.histId=histId;
            ag.atendimentoId=atd.id;
            if(queixa) ag.queixa=queixa;
            if(observacao) ag.obs=observacao;
            Store.upsert('AGENDA_MEDICA',ag);
          }
        }
      }

      this.formDraft=null;
      this.mainFormDraftV106=null;
      this.docsBackupV108=[];
      if(window.Documentos){ Documentos.temp=[]; Documentos.tempBackupV108=[]; }

      try{ this.limparEstadoNovoRegistroV178 && this.limparEstadoNovoRegistroV178(p.id,consultaId); }catch(e){}

      Modal.close();
      if(window.Prontuario?.abrir) Prontuario.abrir(p.id,'historico');
      Utils.toast(finalizar?'✅ Atendimento registrado e finalizado!':'💾 Atendimento salvo e mantido na fila.');
      return true;
    }catch(err){
      console.error('Salvar atendimento V18.0',err);
      Utils.toast('Erro ao salvar atendimento. Veja o console para detalhes.');
      return false;
    }
  };

  RegistrarConsulta.save=function(finalizar=true){
    return this.salvarAtendimentoV110(finalizar);
  };
})();




/* =========================================================
   ZERO V18.1 — Atestado sem Observação + data dd/mm/aaaa
   Correções:
   - Remove campo Observações do modal de atestado.
   - Atestado salvo não grava obs.
   - Texto automático usa datas em dd/mm/aaaa.
   - Data de início no texto também fica dd/mm/aaaa.
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__atestadoSemObsDataBRV181) return;
  RegistrarConsulta.__atestadoSemObsDataBRV181=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const uid=(p)=>Utils.id ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.dataBRV181=function(v){
    if(!v) return '';
    const s=String(v).trim();
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    if(/^\d{4}-\d{2}-\d{2}/.test(s)){
      const [a,m,d]=s.slice(0,10).split('-');
      return `${d}/${m}/${a}`;
    }
    const dt=new Date(s);
    if(!isNaN(dt.getTime())) return dt.toLocaleDateString('pt-BR');
    return s;
  };

  RegistrarConsulta.hojeBRV181=function(){
    return this.dataBRV181(Utils.today ? Utils.today() : new Date().toISOString().slice(0,10));
  };

  RegistrarConsulta.textoAtestadoPadraoV181=function(dias='',inicio=''){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf||'[000.000.000-00]';
    const dataHoje=this.hojeBRV181();
    const periodo=dias ? `${dias} dia(s)` : '[X]';
    const dataInicio=this.dataBRV181(inicio) || '__/__/____';

    return `Atesto para os devidos fins que o(a) paciente ${nome}, portador(a) do CPF nº ${cpf}, esteve sob meus cuidados médicos no dia ${dataHoje}.
Necessita de afastamento de suas atividades pelo período de ${periodo}, a contar da data de hoje, [Data de início: ${dataInicio}].`;
  };

  RegistrarConsulta.textoComparecimentoV181=function(){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf ? `, CPF nº ${p.cpf}` : '';
    const dataHoje=this.hojeBRV181();
    const h1=document.getElementById('at-hora-chegada')?.value||'____';
    const h2=document.getElementById('at-hora-saida')?.value||'____';
    return `Declaro, para os devidos fins, que o(a) paciente ${nome}${cpf} compareceu a esta clínica para atendimento médico no dia ${dataHoje}, permanecendo no período de ${h1} às ${h2}.`;
  };

  RegistrarConsulta.atualizarTextoAtestadoV181=function(force=false){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    const txt=document.getElementById('at-motivo') || document.getElementById('at-texto');
    if(!txt) return;

    if(String(tipo).toLowerCase().includes('comparecimento')){
      if(force || !txt.dataset.editado || txt.dataset.editado==='0'){
        txt.value=this.textoComparecimentoV181();
        txt.dataset.editado='0';
      }
      return;
    }

    if(force || !txt.dataset.editado || txt.dataset.editado==='0'){
      txt.value=this.textoAtestadoPadraoV181(
        document.getElementById('at-dias')?.value||'',
        document.getElementById('at-inicio')?.value||''
      );
      txt.dataset.editado='0';
    }
  };

  // Compatibilidade: todos os nomes antigos passam a usar a versão com data BR.
  RegistrarConsulta.textoAtestadoPadraoV98=function(dias='',inicio=''){ return this.textoAtestadoPadraoV181(dias,inicio); };
  RegistrarConsulta.textoAtestadoPadraoV164=function(dias='',inicio=''){ return this.textoAtestadoPadraoV181(dias,inicio); };
  RegistrarConsulta.atualizarTextoAtestadoV98=function(force=false){ return this.atualizarTextoAtestadoV181(force); };
  RegistrarConsulta.atualizarTextoAtestadoV100=function(force=false){ return this.atualizarTextoAtestadoV181(force); };
  RegistrarConsulta.atualizarTextoAtestadoV112=function(force=false){ return this.atualizarTextoAtestadoV181(force); };
  RegistrarConsulta.atualizarTextoAtestadoV164=function(force=false){ return this.atualizarTextoAtestadoV181(force); };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.capturarAntesDocumentoV167 && this.capturarAntesDocumentoV167();

    const temTexto=!!(d.motivo||d.texto);
    const textoInicial=(d.motivo||d.texto||'') || this.textoAtestadoPadraoV181(d.dias||'',d.inicio||d.dataInicio||'');

    const body=`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${this.hojeBRV181()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v167 atestado-sem-obs-v181">
        <div class="f-col"><label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipo && RegistrarConsulta.toggleAtestadoTipo();RegistrarConsulta.atualizarTextoAtestadoV181(true)">
            <option ${(String(d.tipo||'Atestado médico').toLowerCase().includes('atestado'))?'selected':''}>Atestado médico</option>
            <option ${(String(d.tipo||'').toLowerCase().includes('comparecimento'))?'selected':''}>Declaração de comparecimento</option>
          </select>
        </div>
        <div class="f-col at-campo-afastamento"><label>Dias de afastamento</label><input id="at-dias" type="number" value="${esc(d.dias||'')}" placeholder="Ex: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV181(false)"></div>
        <div class="f-col at-campo-afastamento"><label>Data de início</label><input id="at-inicio" type="date" value="${esc(d.inicio||d.dataInicio||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV181(false)"></div>
        <div class="f-col at-campo-afastamento"><label>CID-10</label><input id="at-cid" placeholder="Opcional" value="${esc(d.cid||'')}"></div>
        <div class="f-col at-campo-comparecimento"><label>Hora de chegada</label><input id="at-hora-chegada" type="time" value="${esc(d.horaChegada||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV181(false)"></div>
        <div class="f-col at-campo-comparecimento"><label>Hora de saída</label><input id="at-hora-saida" type="time" value="${esc(d.horaSaida||d.hora||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV181(false)"></div>
        <div class="f-col f-full"><label>Texto do atestado</label><textarea id="at-motivo" rows="8" data-editado="${temTexto?'1':'0'}" oninput="this.dataset.editado='1'">${esc(textoInicial)}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveAtestado(true)">🖨️ Salvar e imprimir</button>`;

    this.abrirDocumentoEstavelV167(d.id?'Editar Atestado Médico':'Novo Atestado Médico',body,footer,'lg');
    setTimeout(()=>{
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()');
      this.toggleAtestadoTipo && this.toggleAtestadoTipo();
      if(!temTexto) this.atualizarTextoAtestadoV181(false);
      this.estabilizarDocModalV167 && this.estabilizarDocModalV167();
    },60);
    return false;
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const texto=(document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '').trim();
    if(!texto) return Utils.toast('Informe o texto do atestado.');
    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('AT');
    const inicio=document.getElementById('at-inicio')?.value||'';
    const doc={
      id,
      ...(this.pacienteDocV167 ? this.pacienteDocV167() : {}),
      tipo:document.getElementById('at-tipo')?.value||'Atestado médico',
      tipoDoc:'Atestado',
      dias:document.getElementById('at-dias')?.value||'',
      inicio,
      dataInicio:inicio,
      dataInicioBR:this.dataBRV181(inicio),
      cid:document.getElementById('at-cid')?.value||'',
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:texto,
      texto,
      data:this.hojeBRV181(),
      criadoEm:new Date().toISOString()
    };

    // Garantia: não gravar observação no atestado.
    delete doc.obs;
    delete doc.observacao;

    this.sincronizarDocumentoAtendimentoV167('Atestado',doc,'ATESTADOS');
    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Atestado'}); }catch(e){} },80);
    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Atestado salvo e enviado para impressão.':'Atestado salvo no documento.');
    return true;
  };
})();




/* =========================================================
   ZERO V18.2 — Idade no topo do Registrar Consulta
========================================================= */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__idadeTopoPacienteV182) return;
  RegistrarConsulta.__idadeTopoPacienteV182=true;

  RegistrarConsulta.idadePacienteV182=function(p={}){
    const raw=String(p.nascimento||p.nasc||p.dataNascimento||'').trim();
    if(!raw) return '';
    let dia,mes,ano;
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) [dia,mes,ano]=raw.split('/').map(Number);
    else if(/^\d{4}-\d{2}-\d{2}/.test(raw)) [ano,mes,dia]=raw.slice(0,10).split('-').map(Number);
    else return '';
    const nasc=new Date(ano,mes-1,dia);
    if(isNaN(nasc.getTime())) return '';
    const hoje=new Date();
    let idade=hoje.getFullYear()-nasc.getFullYear();
    if(hoje.getMonth()<nasc.getMonth() || (hoje.getMonth()===nasc.getMonth() && hoje.getDate()<nasc.getDate())) idade--;
    if(idade<0 || idade>130) return '';
    return `${idade} ano${idade===1?'':'s'}`;
  };

  RegistrarConsulta.aplicarIdadeTopoV182=function(){
    const p=this.pac||{};
    const idade=this.idadePacienteV182(p);
    if(!idade) return;
    const top=document.querySelector('#modal-root .patient-top');
    if(!top || top.querySelector('.rc-idade-v182')) return;
    const nascBox=Array.from(top.children||[]).find(el=>String(el.textContent||'').toLowerCase().includes('nascimento'));
    if(nascBox) nascBox.insertAdjacentHTML('afterend',`<div class="rc-idade-v182"><strong>Idade</strong><br>${idade}</div>`);
  };

  const oldAfterV182=RegistrarConsulta.afterRender?.bind(RegistrarConsulta);
  RegistrarConsulta.afterRender=function(){
    const ret=oldAfterV182 ? oldAfterV182(...arguments) : undefined;
    try{ this.aplicarIdadeTopoV182(); }catch(e){}
    setTimeout(()=>{ try{ this.aplicarIdadeTopoV182(); }catch(e){} },30);
    return ret;
  };
})();



/* ZERO V19.2 — Declaração de comparecimento com horas */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__declaracaoComparecimentoHorasV192) return;
  RegistrarConsulta.__declaracaoComparecimentoHorasV192=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const uid=(p)=>Utils.id ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.dataBRV192=function(v){
    if(this.dataBRV181) return this.dataBRV181(v);
    if(!v) return '';
    const s=String(v).trim();
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    if(/^\d{4}-\d{2}-\d{2}/.test(s)){
      const [a,m,d]=s.slice(0,10).split('-');
      return `${d}/${m}/${a}`;
    }
    const dt=new Date(s);
    return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('pt-BR');
  };

  RegistrarConsulta.hojeBRV192=function(){
    return this.dataBRV192(Utils.today ? Utils.today() : new Date().toISOString().slice(0,10));
  };

  RegistrarConsulta.ehComparecimentoV192=function(){
    const tipo=String(document.getElementById('at-tipo')?.value||'').toLowerCase();
    return tipo.includes('comparecimento') || tipo.includes('declara');
  };

  RegistrarConsulta.textoAtestadoPadraoV192=function(dias='',inicio=''){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf||'[000.000.000-00]';
    const dataHoje=this.hojeBRV192();
    const periodo=dias ? `${dias} dia(s)` : '[X]';
    const dataInicio=this.dataBRV192(inicio) || dataHoje;
    return `Atesto para os devidos fins que o(a) paciente ${nome}, portador(a) do CPF nº ${cpf}, esteve sob meus cuidados médicos no dia ${dataHoje}, necessitando de afastamento de suas atividades pelo período de ${periodo}, a contar de ${dataInicio}.`;
  };

  RegistrarConsulta.textoComparecimentoV192=function(){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf ? `, CPF nº ${p.cpf}` : '';
    const dataHoje=this.hojeBRV192();
    const h1=document.getElementById('at-hora-chegada')?.value || '__:__';
    const h2=document.getElementById('at-hora-saida')?.value || '__:__';
    return `Declaro, para os devidos fins, que o(a) paciente ${nome}${cpf} compareceu a esta clínica no dia ${dataHoje}, permanecendo no horário das ${h1} às ${h2}, para atendimento médico.`;
  };

  RegistrarConsulta.atualizarTextoAtestadoV192=function(force=true){
    const txt=document.getElementById('at-motivo') || document.getElementById('at-texto');
    if(!txt) return false;
    if(!force && txt.dataset.editado==='1') return false;

    if(this.ehComparecimentoV192()){
      txt.value=this.textoComparecimentoV192();
    }else{
      txt.value=this.textoAtestadoPadraoV192(
        document.getElementById('at-dias')?.value||'',
        document.getElementById('at-inicio')?.value||''
      );
    }
    txt.dataset.editado='0';
    return true;
  };

  RegistrarConsulta.toggleAtestadoTipoV192=function(){
    const comparecimento=this.ehComparecimentoV192();
    document.querySelectorAll('#modal-root .at-campo-afastamento').forEach(el=>{
      el.style.display=comparecimento?'none':'';
    });
    document.querySelectorAll('#modal-root .at-campo-comparecimento').forEach(el=>{
      el.style.display=comparecimento?'':'none';
    });
    return true;
  };

  RegistrarConsulta.textoAtestadoPadraoV181=function(dias='',inicio=''){ return this.textoAtestadoPadraoV192(dias,inicio); };
  RegistrarConsulta.textoAtestadoPadraoV98=function(dias='',inicio=''){ return this.textoAtestadoPadraoV192(dias,inicio); };
  RegistrarConsulta.textoAtestadoPadraoV164=function(dias='',inicio=''){ return this.textoAtestadoPadraoV192(dias,inicio); };
  RegistrarConsulta.textoComparecimentoV181=function(){ return this.textoComparecimentoV192(); };
  RegistrarConsulta.atualizarTextoAtestadoV181=function(force=true){ return this.atualizarTextoAtestadoV192(force); };
  RegistrarConsulta.atualizarTextoAtestadoV98=function(force=true){ return this.atualizarTextoAtestadoV192(force); };
  RegistrarConsulta.atualizarTextoAtestadoV100=function(force=true){ return this.atualizarTextoAtestadoV192(force); };
  RegistrarConsulta.atualizarTextoAtestadoV112=function(force=true){ return this.atualizarTextoAtestadoV192(force); };
  RegistrarConsulta.atualizarTextoAtestadoV164=function(force=true){ return this.atualizarTextoAtestadoV192(force); };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.capturarAntesDocumentoV167 && this.capturarAntesDocumentoV167();

    const tipoAtual=d.tipo || 'Atestado médico';
    const ehComp=String(tipoAtual).toLowerCase().includes('comparecimento') || String(tipoAtual).toLowerCase().includes('declara');
    const temTexto=!!(d.motivo||d.texto);
    const textoInicial=(d.motivo||d.texto||'') || (ehComp ? this.textoComparecimentoV192() : this.textoAtestadoPadraoV192(d.dias||'',d.inicio||d.dataInicio||''));

    const body=`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${this.hojeBRV192()}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v167 atestado-sem-obs-v181 atestado-horas-v192">
        <div class="f-col"><label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipoV192();RegistrarConsulta.atualizarTextoAtestadoV192(true)">
            <option value="Atestado médico" ${!ehComp?'selected':''}>Atestado médico</option>
            <option value="Declaração de comparecimento" ${ehComp?'selected':''}>Declaração de comparecimento</option>
          </select>
        </div>
        <div class="f-col at-campo-afastamento"><label>Dias de afastamento</label><input id="at-dias" type="number" value="${esc(d.dias||'')}" placeholder="Ex: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV192(false)"></div>
        <div class="f-col at-campo-afastamento"><label>Data de início</label><input id="at-inicio" type="date" value="${esc(d.inicio||d.dataInicio||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV192(false)"></div>
        <div class="f-col at-campo-afastamento"><label>CID-10</label><input id="at-cid" placeholder="Opcional" value="${esc(d.cid||'')}"></div>
        <div class="f-col at-campo-comparecimento"><label>Hora de chegada</label><input id="at-hora-chegada" type="time" value="${esc(d.horaChegada||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV192(true)"></div>
        <div class="f-col at-campo-comparecimento"><label>Hora de saída</label><input id="at-hora-saida" type="time" value="${esc(d.horaSaida||d.hora||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV192(true)"></div>
        <div class="f-col f-full"><label>Texto do atestado</label><textarea id="at-motivo" rows="8" data-editado="${temTexto?'1':'0'}" oninput="this.dataset.editado='1'">${esc(textoInicial)}</textarea></div>
      </div>`;
    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveAtestado(true)">🖨️ Salvar e imprimir</button>`;

    this.abrirDocumentoEstavelV167(d.id?'Editar Atestado Médico':'Novo Atestado Médico',body,footer,'lg');
    setTimeout(()=>{
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()');
      this.toggleAtestadoTipoV192();
      if(!temTexto) this.atualizarTextoAtestadoV192(true);
      this.estabilizarDocModalV167 && this.estabilizarDocModalV167();
    },50);
    return false;
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    const ehComp=this.ehComparecimentoV192();
    if(ehComp) this.atualizarTextoAtestadoV192(true);

    const texto=(document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '').trim();
    if(!texto) return Utils.toast('Informe o texto do atestado.');

    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('AT');
    const inicio=document.getElementById('at-inicio')?.value||'';
    const doc={
      id,
      ...(this.pacienteDocV167 ? this.pacienteDocV167() : {}),
      tipo,
      tipoDoc:'Atestado',
      dias:ehComp?'':(document.getElementById('at-dias')?.value||''),
      inicio:ehComp?'':inicio,
      dataInicio:ehComp?'':inicio,
      dataInicioBR:ehComp?'':this.dataBRV192(inicio),
      cid:ehComp?'':(document.getElementById('at-cid')?.value||''),
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:texto,
      texto,
      data:this.hojeBRV192(),
      criadoEm:new Date().toISOString()
    };

    delete doc.obs;
    delete doc.observacao;

    this.sincronizarDocumentoAtendimentoV167('Atestado',doc,'ATESTADOS');
    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Atestado'}); }catch(e){} },80);
    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Documento salvo e enviado para impressão.':'Documento salvo.');
    return true;
  };
})();



/* ZERO V19.3 — Declaração: campos de horas visíveis */
(function(){
  if(!window.RegistrarConsulta || RegistrarConsulta.__declaracaoHorasVisiveisV193) return;
  RegistrarConsulta.__declaracaoHorasVisiveisV193=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');
  const uid=(p)=>Utils.id ? Utils.id(p) : (p+'_'+Date.now()+'_'+Math.random().toString(16).slice(2));

  RegistrarConsulta.ehComparecimentoV193=function(){
    const tipo=String(document.getElementById('at-tipo')?.value||'').toLowerCase();
    return tipo.includes('comparecimento') || tipo.includes('declara');
  };

  RegistrarConsulta.toggleAtestadoTipoV192=function(){
    const comparecimento=this.ehComparecimentoV193();

    document.querySelectorAll('#modal-root .at-campo-afastamento').forEach(el=>{
      el.style.setProperty('display',comparecimento?'none':'block','important');
    });

    document.querySelectorAll('#modal-root .at-campo-comparecimento').forEach(el=>{
      el.style.setProperty('display',comparecimento?'block':'none','important');
    });

    return true;
  };

  RegistrarConsulta.toggleAtestadoTipoV193=function(){
    return this.toggleAtestadoTipoV192();
  };

  RegistrarConsulta.textoComparecimentoV193=function(){
    const p=this.pac||{};
    const nome=p.nome||p.nomeCompleto||'[Nome Completo do Paciente]';
    const cpf=p.cpf ? `, CPF nº ${p.cpf}` : '';
    const dataHoje=this.hojeBRV192 ? this.hojeBRV192() : (this.hojeBRV181 ? this.hojeBRV181() : new Date().toLocaleDateString('pt-BR'));
    const h1=document.getElementById('at-hora-chegada')?.value || '__:__';
    const h2=document.getElementById('at-hora-saida')?.value || '__:__';

    return `Declaro, para os devidos fins, que o(a) paciente ${nome}${cpf} compareceu a esta clínica no dia ${dataHoje}, permanecendo no horário das ${h1} às ${h2}, para atendimento médico.`;
  };

  RegistrarConsulta.textoComparecimentoV192=function(){
    return this.textoComparecimentoV193();
  };
  RegistrarConsulta.textoComparecimentoV181=function(){
    return this.textoComparecimentoV193();
  };

  RegistrarConsulta.atualizarTextoAtestadoV193=function(force=true){
    const txt=document.getElementById('at-motivo') || document.getElementById('at-texto');
    if(!txt) return false;

    if(!force && txt.dataset.editado==='1') return false;

    if(this.ehComparecimentoV193()){
      txt.value=this.textoComparecimentoV193();
    }else{
      txt.value=(this.textoAtestadoPadraoV192 ? this.textoAtestadoPadraoV192(
        document.getElementById('at-dias')?.value||'',
        document.getElementById('at-inicio')?.value||''
      ) : '');
    }

    txt.dataset.editado='0';
    return true;
  };

  RegistrarConsulta.atualizarTextoAtestadoV192=function(force=true){ return this.atualizarTextoAtestadoV193(force); };
  RegistrarConsulta.atualizarTextoAtestadoV181=function(force=true){ return this.atualizarTextoAtestadoV193(force); };
  RegistrarConsulta.atualizarTextoAtestadoV98=function(force=true){ return this.atualizarTextoAtestadoV193(force); };
  RegistrarConsulta.atualizarTextoAtestadoV100=function(force=true){ return this.atualizarTextoAtestadoV193(force); };
  RegistrarConsulta.atualizarTextoAtestadoV112=function(force=true){ return this.atualizarTextoAtestadoV193(force); };
  RegistrarConsulta.atualizarTextoAtestadoV164=function(force=true){ return this.atualizarTextoAtestadoV193(force); };

  RegistrarConsulta.modalAtestado=function(d={}){
    this.capturarAntesDocumentoV167 && this.capturarAntesDocumentoV167();

    const tipoAtual=d.tipo || 'Atestado médico';
    const ehComp=String(tipoAtual).toLowerCase().includes('comparecimento') || String(tipoAtual).toLowerCase().includes('declara');
    const temTexto=!!(d.motivo||d.texto);
    const textoInicial=(d.motivo||d.texto||'') || (ehComp ? this.textoComparecimentoV193() : (this.textoAtestadoPadraoV192 ? this.textoAtestadoPadraoV192(d.dias||'',d.inicio||d.dataInicio||'') : ''));

    const body=`
      <div class="doc-original-banner doc-banner-purple">
        Paciente: <strong>${esc(this.pac?.nome||this.pac?.nomeCompleto||'')}</strong> &nbsp;|&nbsp; Data: ${(this.hojeBRV192?this.hojeBRV192():(this.hojeBRV181?this.hojeBRV181():''))}
      </div>
      <input type="hidden" id="doc-id" value="${esc(d.id||'')}">
      <div class="form-grid doc-modal-original doc-grid-fix-v167 atestado-sem-obs-v181 atestado-horas-v193">
        <div class="f-col"><label>Tipo</label>
          <select id="at-tipo" onchange="RegistrarConsulta.toggleAtestadoTipoV193();RegistrarConsulta.atualizarTextoAtestadoV193(true)">
            <option value="Atestado médico" ${!ehComp?'selected':''}>Atestado médico</option>
            <option value="Declaração de comparecimento" ${ehComp?'selected':''}>Declaração de comparecimento</option>
          </select>
        </div>

        <div class="f-col at-campo-afastamento" style="${ehComp?'display:none!important;':'display:block!important;'}">
          <label>Dias de afastamento</label>
          <input id="at-dias" type="number" value="${esc(d.dias||'')}" placeholder="Ex: 3" oninput="RegistrarConsulta.atualizarTextoAtestadoV193(false)">
        </div>

        <div class="f-col at-campo-afastamento" style="${ehComp?'display:none!important;':'display:block!important;'}">
          <label>Data de início</label>
          <input id="at-inicio" type="date" value="${esc(d.inicio||d.dataInicio||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV193(false)">
        </div>

        <div class="f-col at-campo-afastamento" style="${ehComp?'display:none!important;':'display:block!important;'}">
          <label>CID-10</label>
          <input id="at-cid" placeholder="Opcional" value="${esc(d.cid||'')}">
        </div>

        <div class="f-col at-campo-comparecimento" style="${ehComp?'display:block!important;':'display:none!important;'}">
          <label>Hora de chegada</label>
          <input id="at-hora-chegada" type="time" value="${esc(d.horaChegada||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV193(true)" oninput="RegistrarConsulta.atualizarTextoAtestadoV193(true)">
        </div>

        <div class="f-col at-campo-comparecimento" style="${ehComp?'display:block!important;':'display:none!important;'}">
          <label>Hora de saída</label>
          <input id="at-hora-saida" type="time" value="${esc(d.horaSaida||d.hora||'')}" onchange="RegistrarConsulta.atualizarTextoAtestadoV193(true)" oninput="RegistrarConsulta.atualizarTextoAtestadoV193(true)">
        </div>

        <div class="f-col f-full">
          <label>Texto do documento</label>
          <textarea id="at-motivo" rows="8" data-editado="${temTexto?'1':'0'}" oninput="this.dataset.editado='1'">${esc(textoInicial)}</textarea>
        </div>
      </div>`;

    const footer=`
      <button type="button" class="btn btn-ghost" onclick="RegistrarConsulta.voltarRegistroDepoisDocV167()">Cancelar</button>
      <button type="button" class="btn btn-blue" onclick="RegistrarConsulta.saveAtestado(false)">💾 Salvar</button>
      <button type="button" class="btn btn-green" onclick="RegistrarConsulta.saveAtestado(true)">🖨️ Salvar e imprimir</button>`;

    this.abrirDocumentoEstavelV167(d.id?'Editar Atestado Médico':'Novo Atestado Médico',body,footer,'lg');

    setTimeout(()=>{
      const x=document.querySelector('#modal-root .modal-x');
      if(x) x.setAttribute('onclick','RegistrarConsulta.voltarRegistroDepoisDocV167()');
      this.toggleAtestadoTipoV193();
      if(!temTexto) this.atualizarTextoAtestadoV193(true);
      this.estabilizarDocModalV167 && this.estabilizarDocModalV167();
    },50);

    return false;
  };

  RegistrarConsulta.saveAtestado=function(imprimir=false){
    const tipo=document.getElementById('at-tipo')?.value||'Atestado médico';
    const ehComp=this.ehComparecimentoV193();

    if(ehComp) this.atualizarTextoAtestadoV193(true);

    const texto=(document.getElementById('at-motivo')?.value || document.getElementById('at-texto')?.value || '').trim();
    if(!texto) return Utils.toast('Informe o texto do documento.');

    const id=(document.getElementById('doc-id')?.value||'').trim() || uid('AT');
    const inicio=document.getElementById('at-inicio')?.value||'';

    const doc={
      id,
      ...(this.pacienteDocV167 ? this.pacienteDocV167() : {}),
      tipo,
      tipoDoc:'Atestado',
      dias:ehComp?'':(document.getElementById('at-dias')?.value||''),
      inicio:ehComp?'':inicio,
      dataInicio:ehComp?'':inicio,
      dataInicioBR:ehComp?'':(this.dataBRV192 ? this.dataBRV192(inicio) : ''),
      cid:ehComp?'':(document.getElementById('at-cid')?.value||''),
      horaChegada:document.getElementById('at-hora-chegada')?.value||'',
      horaSaida:document.getElementById('at-hora-saida')?.value||'',
      hora:document.getElementById('at-hora-saida')?.value||'',
      motivo:texto,
      texto,
      data:(this.hojeBRV192 ? this.hojeBRV192() : Utils.today()),
      criadoEm:new Date().toISOString()
    };

    delete doc.obs;
    delete doc.observacao;

    this.sincronizarDocumentoAtendimentoV167('Atestado',doc,'ATESTADOS');
    if(imprimir) setTimeout(()=>{ try{ Impressao.print({...doc,tipoDoc:'Atestado'}); }catch(e){} },80);
    this.voltarRegistroDepoisDocV167();
    Utils.toast(imprimir?'Documento salvo e enviado para impressão.':'Documento salvo.');
    return true;
  };
})();
