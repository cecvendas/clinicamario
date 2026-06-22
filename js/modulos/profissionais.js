window.Profissionais={
  list(){
    return Store.get('PROFISSIONAIS').sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  },

  ativos(){
    return this.list().filter(p=>p.ativo!==false);
  },

  conselho(p){
    if(!p) return '';
    if(p.conselho) return p.conselho;
    return `${p.tipoConselho||'CRM'}-${p.ufConselho||'MS'} ${p.numeroConselho||''}`.trim();
  },

  atual(){
    return this.ativos().find(p=>['medico','admin'].includes(String(p.perfil||'').toLowerCase())) || this.ativos()[0] || this.list()[0] || {};
  },

  status(p){
    return p.ativo===false ? '<span class="badge status-inativo">Inativo</span>' : '<span class="badge status-ativo">Ativo</span>';
  },

  perfilLabel(p){
    const perfil = String(p.perfil || 'medico').toLowerCase();
    const map = {
      admin:'Administrador',
      medico:'Médico',
      recepcao:'Recepção',
      financeiro:'Financeiro'
    };
    return `<span class="perfil-pill">${map[perfil] || perfil}</span>`;
  },

  loginLabel(p){
    return p.login ? `<span class="login-pill">${Utils.esc(p.login)}</span>` : '<span class="badge">Sem login</span>';
  },

  render(){
    const lista=this.list();

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>Profissionais</h3>
          <p style="color:#64748b;margin-top:4px">Cadastro de profissionais, perfis de acesso, login e conselho profissional.</p>
        </div>
        <button class="btn btn-blue" onclick="Profissionais.modal()">+ Novo Profissional</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Conselho</th>
            <th>Perfil</th>
            <th>Login</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${lista.map(p=>`<tr>
          <td>${Utils.esc(p.nome)}</td>
          <td>${Utils.esc(this.conselho(p))}</td>
          <td>${this.perfilLabel(p)}</td>
          <td>${this.loginLabel(p)}</td>
          <td>${this.status(p)}</td>
          <td>
            <div class="row right">
              <button class="btn btn-sm btn-outline" onclick="Profissionais.visualizar('${p.id}')">👁️ Visualizar</button>
              <button class="btn btn-sm btn-outline" onclick="Profissionais.modal('${p.id}')">✏️ Editar</button>
              <button class="btn btn-sm ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${p.id}')">${p.ativo===false?'Ativar':'Desativar'}</button>
            </div>
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  },

  modal(id=''){
    const p=this.list().find(x=>x.id===id)||{};
    Modal.open(id?'Editar Profissional':'Novo Profissional',`
      <div class="cm-section">
        <div class="cm-section-title">🧑‍⚕️ Dados do Profissional</div>
        <div class="cm-form-grid">
          <div class="span-3">
            <label>Nome completo</label>
            <input id="prof-nome" value="${Utils.esc(p.nome||'')}">
          </div>
          <div>
            <label>Status</label>
            <select id="prof-ativo">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          <div>
            <label>Perfil de acesso</label>
            <select id="prof-perfil">
              <option value="medico">Médico</option>
              <option value="recepcao">Recepção</option>
              <option value="financeiro">Financeiro</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label>Tipo de conselho</label>
            <select id="prof-tipo">
              <option>CRM</option>
              <option>CRF</option>
              <option>COREN</option>
              <option>CREFITO</option>
              <option>Outro</option>
            </select>
          </div>
          <div>
            <label>UF</label>
            <input id="prof-uf" value="${Utils.esc(p.ufConselho||'MS')}">
          </div>
          <div>
            <label>Número do conselho</label>
            <input id="prof-num" value="${Utils.esc(p.numeroConselho||'')}">
          </div>

          <div class="span-2">
            <label>Especialidade / Setor</label>
            <input id="prof-especialidade" value="${Utils.esc(p.especialidade||'')}">
          </div>
          <div>
            <label>Telefone</label>
            <input id="prof-telefone" value="${Utils.esc(p.telefone||'')}">
          </div>
          <div>
            <label>E-mail</label>
            <input id="prof-email" value="${Utils.esc(p.email||'')}">
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">🔐 Login do sistema</div>
        <div class="cm-form-grid">
          <div class="span-2">
            <label>Login / usuário</label>
            <input id="prof-login" value="${Utils.esc(p.login||'')}" placeholder="ex: recepcao">
          </div>
          <div class="span-2">
            <label>Senha</label>
            <input id="prof-senha" type="password" value="${Utils.esc(p.senha||'')}" placeholder="${id?'Deixe como está ou altere':'Crie uma senha'}">
          </div>
          <div class="span-4">
            <div style="font-size:12px;color:#64748b;">
              Este login será usado na tela inicial do sistema. Perfis disponíveis: Médico, Recepção, Financeiro e Administrador.
            </div>
          </div>
        </div>
      </div>

      <div class="cm-section">
        <div class="cm-section-title">📝 Observações</div>
        <textarea id="prof-obs" rows="3">${Utils.esc(p.obs||'')}</textarea>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      ${id?`<button class="btn ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${id}',true)">${p.ativo===false?'Ativar':'Desativar'}</button>`:''}
      <button class="btn btn-blue" onclick="Profissionais.save('${id}')">Salvar</button>
    `,'lg');

    setTimeout(()=>{
      document.getElementById('prof-tipo').value=p.tipoConselho||'CRM';
      document.getElementById('prof-ativo').value=String(p.ativo!==false);
      document.getElementById('prof-perfil').value=p.perfil||'medico';
    },30);
  },

  loginEmUso(login,idAtual=''){
    if(!login) return false;
    const prof=this.list().find(p=>String(p.login||'').toLowerCase()===String(login).toLowerCase() && String(p.id)!==String(idAtual));
    const user=Store.get('USUARIOS').find(u=>String(u.login||'').toLowerCase()===String(login).toLowerCase() && String(u.profissionalId||'')!==String(idAtual));
    return !!(prof||user);
  },

  save(id=''){
    let p=id?this.list().find(x=>x.id===id):{id:Utils.id('PROF')};

    p.nome=document.getElementById('prof-nome').value.trim();
    p.ativo=document.getElementById('prof-ativo').value==='true';
    p.perfil=document.getElementById('prof-perfil').value;
    p.tipoConselho=document.getElementById('prof-tipo').value;
    p.ufConselho=document.getElementById('prof-uf').value.trim().toUpperCase();
    p.numeroConselho=document.getElementById('prof-num').value.trim();
    p.conselho=p.numeroConselho ? `${p.tipoConselho}-${p.ufConselho} ${p.numeroConselho}`.trim() : '';
    p.especialidade=document.getElementById('prof-especialidade').value.trim();
    p.telefone=document.getElementById('prof-telefone').value.trim();
    p.email=document.getElementById('prof-email').value.trim();
    p.login=document.getElementById('prof-login').value.trim();
    p.senha=document.getElementById('prof-senha').value.trim();
    p.obs=document.getElementById('prof-obs').value.trim();

    if(!p.nome) return Utils.toast('Informe o nome do profissional.');

    if(p.login && !p.senha){
      return Utils.toast('Informe a senha para este login.');
    }

    if(p.login && this.loginEmUso(p.login,p.id)){
      return Utils.toast('Este login já está em uso.');
    }

    Store.upsert('PROFISSIONAIS',p);
    this.sincronizarUsuario(p);

    Modal.close();
    this.render();
    Utils.toast('Profissional salvo.');
  },

  sincronizarUsuario(p){
    let users=Store.get('USUARIOS');
    users=users.filter(u=>String(u.profissionalId||'')!==String(p.id));

    if(p.login && p.senha && p.ativo!==false){
      users.push({
        id:'USR_'+p.id,
        profissionalId:p.id,
        login:p.login,
        senha:p.senha,
        nome:p.nome,
        perfil:p.perfil||'medico'
      });
    }

    // garante admin padrão
    if(!users.find(u=>String(u.login).toLowerCase()==='admin')){
      users.push({id:'U001',login:'admin',senha:'admin',nome:'Administrador',perfil:'admin'});
    }

    Store.set('USUARIOS',users);
  },

  toggleAtivo(id,fromModal=false){
    const p=this.list().find(x=>x.id===id);
    if(!p) return Utils.toast('Profissional não encontrado.');

    const novo = p.ativo===false;
    const msg = novo ? 'Ativar este profissional?' : 'Desativar este profissional?';

    if(!confirm(msg)) return;

    p.ativo=novo;
    Store.upsert('PROFISSIONAIS',p);
    this.sincronizarUsuario(p);

    if(fromModal) Modal.close();
    this.render();
    Utils.toast(novo?'Profissional ativado.':'Profissional desativado.');
  },

  visualizar(id){
    const p=this.list().find(x=>x.id===id);
    if(!p) return Utils.toast('Profissional não encontrado.');

    Modal.open('👁️ Cadastro do Profissional',`
      <div class="cm-section">
        <div class="cm-section-title">🧑‍⚕️ Dados do Profissional</div>
        <div class="cm-view-grid">
          ${this.viewItem('Nome',p.nome)}
          ${this.viewItem('Status',p.ativo===false?'Inativo':'Ativo')}
          ${this.viewItem('Perfil',this.perfilTexto(p.perfil))}
          ${this.viewItem('Conselho',this.conselho(p))}
          ${this.viewItem('Especialidade / Setor',p.especialidade)}
          ${this.viewItem('Telefone',p.telefone)}
          ${this.viewItem('E-mail',p.email)}
          ${this.viewItem('Login',p.login)}
        </div>
        ${p.obs?`<div class="cm-view-item" style="margin-top:10px;"><strong>Observações</strong><span>${Utils.esc(p.obs)}</span></div>`:''}
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-outline" onclick="Profissionais.modal('${p.id}')">Editar</button>
      <button class="btn ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${p.id}',true)">${p.ativo===false?'Ativar':'Desativar'}</button>
    `,'lg');
  },

  perfilTexto(perfil){
    return {
      admin:'Administrador',
      medico:'Médico',
      recepcao:'Recepção',
      financeiro:'Financeiro'
    }[String(perfil||'medico').toLowerCase()] || perfil || 'Médico';
  },

  viewItem(label,value){
    return `<div class="cm-view-item"><strong>${Utils.esc(label)}</strong><span>${Utils.esc(value||'—')}</span></div>`;
  }
};



/* ZERO V4.5 — Campo logo do profissional/clinica para impressão */
(function(){
  if(!window.Profissionais) return;

  Profissionais.logoPreviewFromFile = function(ev){
    const f=ev.target.files && ev.target.files[0];
    if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      const el=document.getElementById('prof-logo-data');
      const img=document.getElementById('prof-logo-preview');
      if(el) el.value=r.result;
      if(img){img.src=r.result; img.style.display='block';}
    };
    r.readAsDataURL(f);
  };

  const oldModal=Profissionais.modal.bind(Profissionais);
  Profissionais.modal=function(id=''){
    oldModal(id);
    setTimeout(()=>{
      const p=this.list().find(x=>x.id===id)||{};
      const sec=document.querySelector('.modal-body .cm-section');
      if(sec && !document.getElementById('prof-logo-data')){
        sec.insertAdjacentHTML('beforeend',`
          <div class="cm-form-grid" style="margin-top:12px;">
            <div class="span-4">
              <label>Logo para impressão</label>
              <input type="hidden" id="prof-logo-data" value="${Utils.esc(p.logo||'')}">
              <input type="file" accept="image/*" onchange="Profissionais.logoPreviewFromFile(event)">
              <img id="prof-logo-preview" src="${Utils.esc(p.logo||'')}" style="${p.logo?'':'display:none;'}margin-top:8px;width:64px;height:64px;object-fit:cover;border-radius:10px;background:#222;">
              <div style="font-size:12px;color:#64748b;margin-top:4px;">Se não enviar uma logo, o sistema usa a logo padrão MS.</div>
            </div>
          </div>
        `);
      }
    },80);
  };

  const oldSave=Profissionais.save.bind(Profissionais);
  Profissionais.save=function(id=''){
    const logo=document.getElementById('prof-logo-data')?.value||'';
    oldSave(id);
    if(logo){
      const login=document.getElementById('prof-login')?.value||'';
      let prof=this.list().find(p=>String(p.login||'')===String(login)) || this.list().slice(-1)[0];
      if(prof){
        prof.logo=logo;
        Store.upsert('PROFISSIONAIS',prof);
      }
    }
  };
})();




/* ZERO V5.0 — Remover logo do profissional de verdade */
(function(){
  if(!window.Profissionais) return;

  Profissionais.removerLogoProfissional = function(){
    const el=document.getElementById('prof-logo-data');
    const img=document.getElementById('prof-logo-preview');
    if(el) el.value='';
    if(img){
      img.removeAttribute('src');
      img.style.display='none';
    }
    Utils.toast('Logo do profissional removida. Clique em Salvar.');
  };

  const oldModalV50 = Profissionais.modal.bind(Profissionais);
  Profissionais.modal = function(id=''){
    oldModalV50(id);
    setTimeout(()=>{
      const logoInput=document.getElementById('prof-logo-data');
      if(logoInput && !document.getElementById('btn-remover-logo-prof')){
        const img=document.getElementById('prof-logo-preview');
        (img||logoInput).insertAdjacentHTML('afterend',
          '<div style="margin-top:8px;"><button type="button" id="btn-remover-logo-prof" class="btn btn-sm btn-outline" onclick="Profissionais.removerLogoProfissional()">Remover logo</button></div>'
        );
      }
    },120);
  };

  const oldSaveV50 = Profissionais.save.bind(Profissionais);
  Profissionais.save = function(id=''){
    const logoEl=document.getElementById('prof-logo-data');
    const logoValor=logoEl ? logoEl.value : null;
    oldSaveV50(id);

    if(logoValor !== null){
      let prof = id ? this.list().find(p=>String(p.id)===String(id)) : null;
      if(!prof){
        const login=document.getElementById('prof-login')?.value||'';
        prof=this.list().find(p=>String(p.login||'')===String(login)) || this.list().slice(-1)[0];
      }
      if(prof){
        prof.logo=logoValor || '';
        prof.logoUrl=logoValor || '';
        prof.logoDataUrl=logoValor || '';
        Store.upsert('PROFISSIONAIS',prof);
      }
    }
  };
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
   ZERO V9.0 — Modal Profissional no padrão original
   - Modal maior, dividido por blocos.
   - Cadastro completo do profissional.
   - Login/senha/perfil no próprio cadastro.
   - Status ativo/inativo e desativar no modal.
   - Mantém compatibilidade com os campos antigos.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__modalOriginalV90) return;
  Profissionais.__modalOriginalV90=true;

  Profissionais.modal = function(id=''){
    const p=this.list().find(x=>String(x.id)===String(id))||{};

    Modal.open(id?'Editar Profissional':'Novo Profissional',`
      <div class="prof-original-modal">

        <div class="prof-original-alert">
          <strong>Cadastro do profissional</strong>
          <span>Preencha os dados do profissional, conselho, acesso ao sistema e informações de atendimento.</span>
        </div>

        <div class="cm-section">
          <div class="cm-section-title">🧑‍⚕️ Dados pessoais</div>
          <div class="cm-form-grid prof-original-grid">
            <div class="span-3">
              <label>Nome completo *</label>
              <input id="prof-nome" value="${Utils.esc(p.nome||'')}" placeholder="Nome completo do profissional">
            </div>

            <div>
              <label>Status</label>
              <select id="prof-ativo">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div>
              <label>CPF</label>
              <input id="prof-cpf" value="${Utils.esc(p.cpf||'')}" placeholder="000.000.000-00">
            </div>

            <div>
              <label>Telefone</label>
              <input id="prof-telefone" value="${Utils.esc(p.telefone||'')}" placeholder="(00) 00000-0000">
            </div>

            <div class="span-2">
              <label>E-mail</label>
              <input id="prof-email" value="${Utils.esc(p.email||'')}" placeholder="email@clinica.com">
            </div>

            <div class="span-2">
              <label>Endereço</label>
              <input id="prof-endereco" value="${Utils.esc(p.endereco||'')}" placeholder="Endereço do profissional">
            </div>

            <div>
              <label>WhatsApp</label>
              <input id="prof-whatsapp" value="${Utils.esc(p.whatsapp||'')}" placeholder="WhatsApp">
            </div>

            <div>
              <label>Data de nascimento</label>
              <input id="prof-nascimento" type="date" value="${Utils.esc(p.nascimento||p.dataNascimento||'')}">
            </div>
          </div>
        </div>

        <div class="cm-section">
          <div class="cm-section-title">🪪 Conselho profissional</div>
          <div class="cm-form-grid prof-original-grid">
            <div>
              <label>Tipo de conselho</label>
              <select id="prof-tipo">
                <option>CRM</option>
                <option>CRF</option>
                <option>COREN</option>
                <option>CREFITO</option>
                <option>CRP</option>
                <option>CRO</option>
                <option>CRN</option>
                <option>Outro</option>
              </select>
            </div>

            <div>
              <label>UF</label>
              <input id="prof-uf" value="${Utils.esc(p.ufConselho||'MS')}" maxlength="2">
            </div>

            <div>
              <label>Número do conselho</label>
              <input id="prof-num" value="${Utils.esc(p.numeroConselho||'')}" placeholder="12345">
            </div>

            <div class="span-2">
              <label>Especialidade / Setor</label>
              <input id="prof-especialidade" value="${Utils.esc(p.especialidade||p.area||'')}" placeholder="Ex: Clínico geral, Recepção, Financeiro">
            </div>

            <div class="span-2">
              <label>Assinatura / identificação impressa</label>
              <input id="prof-assinatura" value="${Utils.esc(p.assinatura||p.nomeAssinatura||p.nome||'')}" placeholder="Nome que aparece nas impressões">
            </div>
          </div>

          <div class="prof-preview">
            <strong>Prévia da assinatura:</strong>
            <span id="prof-preview-assinatura">${Utils.esc(p.assinatura||p.nomeAssinatura||p.nome||'Nome do profissional')}</span>
            <span id="prof-preview-conselho">${Utils.esc(this.conselho(p)||'CRM-MS 00000')}</span>
          </div>
        </div>

        <div class="cm-section">
          <div class="cm-section-title">🔐 Login e permissões</div>
          <div class="cm-form-grid prof-original-grid">
            <div>
              <label>Perfil de acesso *</label>
              <select id="prof-perfil">
                <option value="medico">Médico</option>
                <option value="recepcao">Recepção</option>
                <option value="financeiro">Financeiro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div class="span-2">
              <label>Login / usuário</label>
              <input id="prof-login" value="${Utils.esc(p.login||'')}" placeholder="ex: recepcao">
            </div>

            <div>
              <label>Senha</label>
              <input id="prof-senha" type="password" value="${Utils.esc(p.senha||'')}" placeholder="${id?'Mantenha ou altere':'Crie uma senha'}">
            </div>

            <div class="span-4 prof-perfis-help">
              <div><strong>Administrador:</strong> acesso total.</div>
              <div><strong>Médico:</strong> atendimento, prontuário, agenda e documentos clínicos.</div>
              <div><strong>Recepção:</strong> pacientes, fila e agenda.</div>
              <div><strong>Financeiro:</strong> financeiro e relatórios.</div>
            </div>
          </div>
        </div>

        <div class="cm-section">
          <div class="cm-section-title">📅 Atendimento</div>
          <div class="cm-form-grid prof-original-grid">
            <div>
              <label>Atende agenda médica?</label>
              <select id="prof-agenda-medica">
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            <div>
              <label>Atende procedimentos?</label>
              <select id="prof-agenda-procedimento">
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            <div>
              <label>Valor consulta padrão</label>
              <input id="prof-valor-consulta" value="${p.valorConsulta?Number(p.valorConsulta).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):''}" placeholder="R$ 0,00">
            </div>

            <div>
              <label>Tempo padrão</label>
              <select id="prof-tempo">
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos</option>
              </select>
            </div>
          </div>
        </div>

        <div class="cm-section">
          <div class="cm-section-title">📝 Observações</div>
          <textarea id="prof-obs" rows="3" placeholder="Observações internas sobre este profissional">${Utils.esc(p.obs||'')}</textarea>
        </div>
      </div>
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
      ${id?`<button class="btn ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${id}',true)">${p.ativo===false?'Ativar profissional':'Desativar profissional'}</button>`:''}
      <button class="btn btn-blue" onclick="Profissionais.save('${id}')">Salvar</button>
    `,'lg');

    setTimeout(()=>{
      const set=(idv,val)=>{const el=document.getElementById(idv); if(el) el.value=val;};
      set('prof-tipo',p.tipoConselho||'CRM');
      set('prof-ativo',String(p.ativo!==false));
      set('prof-perfil',p.perfil||'medico');
      set('prof-agenda-medica',String(p.agendaMedica!==false));
      set('prof-agenda-procedimento',String(p.agendaProcedimento!==false));
      set('prof-tempo',String(p.tempoPadrao||p.tempoConsulta||30));

      ['prof-nome','prof-tipo','prof-uf','prof-num','prof-assinatura'].forEach(idv=>{
        const el=document.getElementById(idv);
        if(el) el.addEventListener('input',()=>Profissionais.atualizarPreviewModal());
        if(el) el.addEventListener('change',()=>Profissionais.atualizarPreviewModal());
      });
      Profissionais.atualizarPreviewModal();
    },30);
  };

  Profissionais.parseMoney = function(v){
    return Number(String(v||'').replace(/[R$\\s.]/g,'').replace(',','.'))||0;
  };

  Profissionais.atualizarPreviewModal = function(){
    const nome=document.getElementById('prof-assinatura')?.value || document.getElementById('prof-nome')?.value || 'Nome do profissional';
    const tipo=document.getElementById('prof-tipo')?.value || 'CRM';
    const uf=(document.getElementById('prof-uf')?.value || 'MS').toUpperCase();
    const num=document.getElementById('prof-num')?.value || '00000';
    const a=document.getElementById('prof-preview-assinatura');
    const c=document.getElementById('prof-preview-conselho');
    if(a) a.textContent=nome;
    if(c) c.textContent=`${tipo}-${uf} ${num}`.trim();
  };

  const oldSaveOriginalV90 = Profissionais.save?.bind(Profissionais);
  Profissionais.save = function(id=''){
    let p=id?this.list().find(x=>String(x.id)===String(id)):{id:Utils.id('PROF')};
    if(!p) p={id:Utils.id('PROF')};

    p.nome=document.getElementById('prof-nome')?.value.trim()||'';
    p.ativo=document.getElementById('prof-ativo')?.value==='true';
    p.perfil=document.getElementById('prof-perfil')?.value||'medico';

    p.cpf=document.getElementById('prof-cpf')?.value.trim()||'';
    p.telefone=document.getElementById('prof-telefone')?.value.trim()||'';
    p.email=document.getElementById('prof-email')?.value.trim()||'';
    p.endereco=document.getElementById('prof-endereco')?.value.trim()||'';
    p.whatsapp=document.getElementById('prof-whatsapp')?.value.trim()||'';
    p.nascimento=document.getElementById('prof-nascimento')?.value||'';

    p.tipoConselho=document.getElementById('prof-tipo')?.value||'CRM';
    p.ufConselho=(document.getElementById('prof-uf')?.value.trim()||'MS').toUpperCase();
    p.numeroConselho=document.getElementById('prof-num')?.value.trim()||'';
    p.conselho=p.numeroConselho ? `${p.tipoConselho}-${p.ufConselho} ${p.numeroConselho}`.trim() : '';

    p.especialidade=document.getElementById('prof-especialidade')?.value.trim()||'';
    p.area=p.especialidade;
    p.assinatura=document.getElementById('prof-assinatura')?.value.trim()||p.nome;
    p.nomeAssinatura=p.assinatura;

    p.login=document.getElementById('prof-login')?.value.trim()||'';
    p.senha=document.getElementById('prof-senha')?.value.trim()||'';

    p.agendaMedica=document.getElementById('prof-agenda-medica')?.value==='true';
    p.agendaProcedimento=document.getElementById('prof-agenda-procedimento')?.value==='true';
    p.valorConsulta=this.parseMoney(document.getElementById('prof-valor-consulta')?.value||'');
    p.tempoPadrao=Number(document.getElementById('prof-tempo')?.value||30);

    p.obs=document.getElementById('prof-obs')?.value.trim()||'';

    if(!p.nome) return Utils.toast('Informe o nome do profissional.');

    if(p.login && !p.senha){
      return Utils.toast('Informe a senha para este login.');
    }

    if(p.login && this.loginEmUso && this.loginEmUso(p.login,p.id)){
      return Utils.toast('Este login já está em uso.');
    }

    Store.upsert('PROFISSIONAIS',p);

    if(this.sincronizarUsuario) this.sincronizarUsuario(p);

    Modal.close();
    this.render();
    Utils.toast('Profissional salvo.');
  };
})();




/* =========================================================
   ZERO V11.7 — Horários cadastrados por profissional
   - Profissional passa a ter agenda semanal própria.
   - Agenda Médica/Procedimentos puxa horários do profissional selecionado.
   - Não fica mais preso ao horário semanal fixo global.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__horariosProfissionalV117) return;
  Profissionais.__horariosProfissionalV117=true;

  Profissionais.diasSemanaV117=[
    ['0','Domingo'],['1','Segunda'],['2','Terça'],['3','Quarta'],['4','Quinta'],['5','Sexta'],['6','Sábado']
  ];

  Profissionais.horariosPadraoV117=function(){
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

  Profissionais.normalizarHorariosV117=function(h){
    const pad=this.horariosPadraoV117();
    h=h||{};
    Object.keys(pad).forEach(k=>{
      h[k]=Object.assign({},pad[k],h[k]||{});
      h[k].ativo = h[k].ativo!==false && String(h[k].ativo)!=='false';
      h[k].inicio = h[k].inicio || pad[k].inicio;
      h[k].fim = h[k].fim || pad[k].fim;
    });
    return h;
  };

  Profissionais.htmlHorariosV117=function(p={}){
    const h=this.normalizarHorariosV117(Utils.clone(p.horariosSemana||p.horarios||{}));
    return `<div class="cm-section prof-horarios-v117">
      <div class="cm-section-title">🕒 Horários da agenda deste profissional</div>
      <div style="font-size:12px;color:#64748b;margin:-4px 0 12px;">
        A Agenda Médica e a Agenda de Procedimentos vão puxar estes horários conforme o profissional selecionado.
      </div>
      <div class="prof-horarios-grid-v117">
        ${this.diasSemanaV117.map(([k,n])=>`
          <div class="prof-horario-row-v117">
            <label class="prof-dia-v117">
              <input type="checkbox" id="prof-dia-${k}" ${h[k].ativo?'checked':''}>
              <span>${n}</span>
            </label>
            <input type="time" id="prof-inicio-${k}" value="${Utils.esc(h[k].inicio)}">
            <span>até</span>
            <input type="time" id="prof-fim-${k}" value="${Utils.esc(h[k].fim)}">
          </div>
        `).join('')}
      </div>
    </div>`;
  };

  Profissionais.lerHorariosTelaV117=function(){
    const h={};
    this.diasSemanaV117.forEach(([k])=>{
      h[k]={
        ativo:!!document.getElementById(`prof-dia-${k}`)?.checked,
        inicio:document.getElementById(`prof-inicio-${k}`)?.value||'07:00',
        fim:document.getElementById(`prof-fim-${k}`)?.value||'18:00'
      };
    });
    return h;
  };

  const oldModal=Profissionais.modal?.bind(Profissionais);
  Profissionais.modal=function(id=''){
    const ret=oldModal ? oldModal(id) : undefined;
    const p=this.list().find(x=>x.id===id)||{};
    setTimeout(()=>{
      const obs=document.getElementById('prof-obs');
      const section=obs?.closest('.cm-section');
      if(section && !document.querySelector('.prof-horarios-v117')){
        section.insertAdjacentHTML('beforebegin',this.htmlHorariosV117(p));
      }
    },40);
    return ret;
  };

  const oldSave=Profissionais.save?.bind(Profissionais);
  Profissionais.save=function(id=''){
    const ret=oldSave ? oldSave(id) : undefined;
    try{
      const nome=document.getElementById('prof-nome')?.value?.trim();
      if(!nome) return ret;
      let p=id?this.list().find(x=>x.id===id):this.list().find(x=>x.nome===nome);
      if(p && document.getElementById('prof-dia-1')){
        p.horariosSemana=this.lerHorariosTelaV117();
        Store.upsert('PROFISSIONAIS',p);
      }
    }catch(e){
      console.warn('Falha ao salvar horários do profissional',e);
    }
    return ret;
  };

  const oldVisualizar=Profissionais.visualizar?.bind(Profissionais);
  Profissionais.visualizar=function(id){
    const p=this.list().find(x=>x.id===id);
    if(!p) return oldVisualizar ? oldVisualizar(id) : undefined;
    const h=this.normalizarHorariosV117(Utils.clone(p.horariosSemana||{}));
    const linhas=this.diasSemanaV117.map(([k,n])=>{
      const d=h[k];
      return `<div class="cm-view-item"><strong>${n}</strong><span>${d.ativo?`${d.inicio} até ${d.fim}`:'Fechado'}</span></div>`;
    }).join('');

    Modal.open('👁️ Cadastro do Profissional',`
      <div class="cm-section">
        <div class="cm-section-title">🧑‍⚕️ Dados do Profissional</div>
        <div class="cm-view-grid">
          ${this.viewItem('Nome',p.nome)}
          ${this.viewItem('Status',p.ativo===false?'Inativo':'Ativo')}
          ${this.viewItem('Perfil',this.perfilTexto(p.perfil))}
          ${this.viewItem('Conselho',this.conselho(p))}
          ${this.viewItem('Especialidade / Setor',p.especialidade)}
          ${this.viewItem('Telefone',p.telefone)}
          ${this.viewItem('E-mail',p.email)}
          ${this.viewItem('Login',p.login)}
        </div>
      </div>
      <div class="cm-section">
        <div class="cm-section-title">🕒 Horários da agenda</div>
        <div class="cm-view-grid">${linhas}</div>
      </div>
      ${p.obs?`<div class="cm-view-item" style="margin-top:10px;"><strong>Observações</strong><span>${Utils.esc(p.obs)}</span></div>`:''}
    `,`
      <button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>
      <button class="btn btn-outline" onclick="Profissionais.modal('${p.id}')">Editar</button>
      <button class="btn ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${p.id}',true)">${p.ativo===false?'Ativar':'Desativar'}</button>
    `,'lg');
  };
})();




/* =========================================================
   ZERO V11.8 — Layout alinhado do cadastro de profissional
   - Organiza os campos em grid real.
   - Evita cards tortos/desalinhados.
   - Ajusta horários por profissional para não quebrar em telas menores.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__layoutProfissionalV118) return;
  Profissionais.__layoutProfissionalV118=true;

  const oldModal=Profissionais.modal?.bind(Profissionais);
  Profissionais.modal=function(id=''){
    const ret=oldModal ? oldModal(id) : undefined;
    setTimeout(()=>{
      const modal=document.querySelector('#modal-root .modal');
      if(modal) modal.classList.add('modal-profissional-v118');
      document.querySelectorAll('#modal-root .cm-form-grid').forEach(g=>g.classList.add('cm-form-grid-v118'));
    },20);
    return ret;
  };
})();




/* =========================================================
   ZERO V11.9 — Alinhamento real do modal Profissional
   - Força classe no modal e nas seções do cadastro.
   - Ajusta campos para grid de 2 colunas no modal, evitando 3/4 campos apertados.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__alinhamentoRealV119) return;
  Profissionais.__alinhamentoRealV119=true;

  Profissionais.aplicarLayoutProfissionalV119=function(){
    const modal=document.querySelector('#modal-root .modal');
    const body=document.querySelector('#modal-root .modal-body');
    if(!body) return;

    if(body.querySelector('#prof-nome') || body.querySelector('#prof-tipo') || body.querySelector('#prof-num')){
      modal?.classList.add('modal-profissional-v119');
      modal?.classList.add('modal-profissional-v118');

      body.querySelectorAll('.cm-form-grid').forEach(g=>{
        g.classList.add('cm-form-grid-v119');
        g.classList.add('cm-form-grid-v118');
      });

      body.querySelectorAll('.cm-form-grid > div').forEach(c=>{
        c.classList.add('prof-field-v119');
      });
    }
  };

  const oldModal=Profissionais.modal?.bind(Profissionais);
  Profissionais.modal=function(id=''){
    const ret=oldModal ? oldModal(id) : undefined;
    setTimeout(()=>this.aplicarLayoutProfissionalV119(),20);
    setTimeout(()=>this.aplicarLayoutProfissionalV119(),80);
    return ret;
  };
})();




/* =========================================================
   ZERO V12.1 — Ativar/desativar assinatura profissional
   - Campo no cadastro do profissional.
   - Define se a assinatura/conselho aparece nas impressões.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__assinaturaToggleV121) return;
  Profissionais.__assinaturaToggleV121=true;

  Profissionais.aplicarToggleAssinaturaV121=function(p={}){
    const assinatura=document.getElementById('prof-assinatura');
    if(!assinatura || document.getElementById('prof-assinatura-ativa')) return;

    const ativo=p.assinaturaAtiva!==false;

    const wrap=document.createElement('div');
    wrap.className='span-2 prof-assinatura-toggle-v121';
    wrap.innerHTML=`
      <label>Assinatura nas impressões</label>
      <select id="prof-assinatura-ativa">
        <option value="true" ${ativo?'selected':''}>Ativada</option>
        <option value="false" ${!ativo?'selected':''}>Desativada</option>
      </select>
      <div class="prof-assinatura-help-v121">Quando desativada, nome/CRM não aparecem no rodapé das receitas, atestados, laudos e pedidos.</div>
    `;

    const campoAssinatura=assinatura.closest('div');
    if(campoAssinatura) campoAssinatura.insertAdjacentElement('afterend',wrap);
  };

  const oldModal=Profissionais.modal?.bind(Profissionais);
  Profissionais.modal=function(id=''){
    const ret=oldModal ? oldModal(id) : undefined;
    const p=this.list().find(x=>String(x.id)===String(id))||{};
    setTimeout(()=>this.aplicarToggleAssinaturaV121(p),60);
    setTimeout(()=>this.aplicarToggleAssinaturaV121(p),140);
    return ret;
  };

  const oldSave=Profissionais.save?.bind(Profissionais);
  Profissionais.save=function(id=''){
    const assinaturaAtiva=document.getElementById('prof-assinatura-ativa')?.value!=='false';
    const nomeTela=document.getElementById('prof-nome')?.value?.trim()||'';
    const ret=oldSave ? oldSave(id) : undefined;

    try{
      let p=id ? this.list().find(x=>String(x.id)===String(id)) : this.list().find(x=>String(x.nome||'')===String(nomeTela));
      if(p){
        p.assinaturaAtiva=assinaturaAtiva;
        Store.upsert('PROFISSIONAIS',p);
      }
    }catch(e){
      console.warn('Falha ao salvar opção de assinatura profissional',e);
    }

    return ret;
  };

  const oldVisualizar=Profissionais.visualizar?.bind(Profissionais);
  Profissionais.visualizar=function(id){
    const ret=oldVisualizar ? oldVisualizar(id) : undefined;
    setTimeout(()=>{
      const modal=document.querySelector('#modal-root .modal-body');
      const p=this.list().find(x=>String(x.id)===String(id));
      if(modal && p && !modal.querySelector('.assinatura-status-v121')){
        const sec=document.createElement('div');
        sec.className='cm-section assinatura-status-v121';
        sec.innerHTML=`<div class="cm-section-title">✍️ Assinatura nas impressões</div>
          <div class="cm-view-grid">
            ${this.viewItem('Status',p.assinaturaAtiva===false?'Desativada':'Ativada')}
            ${this.viewItem('Nome impresso',p.assinatura||p.nomeAssinatura||p.nome)}
          </div>`;
        modal.appendChild(sec);
      }
    },80);
    return ret;
  };
})();




/* =========================================================
   ZERO V15.1 — Modal Profissional estável sem piscar
   Correções:
   - Novo/Editar Profissional não usa mais Modal geral.
   - Abre em overlay próprio, sem piscar.
   - Mantém horários por profissional dentro do profissional.
   - Salvar funciona e fecha estável.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__modalEstavelV151) return;
  Profissionais.__modalEstavelV151=true;

  Profissionais.rootV151=function(){
    let root=document.getElementById('profissionais-modal-root-v151');
    if(!root){
      root=document.createElement('div');
      root.id='profissionais-modal-root-v151';
      document.body.appendChild(root);
    }
    return root;
  };

  Profissionais.fecharModalV151=function(){
    const root=document.getElementById('profissionais-modal-root-v151');
    if(root) root.innerHTML='';
    document.body.classList.remove('prof-modal-open-v151');
    return false;
  };

  Profissionais.horariosHtmlSeguroV151=function(p){
    if(typeof this.htmlHorariosV117==='function'){
      return this.htmlHorariosV117(p||{});
    }
    return '';
  };

  Profissionais.lerHorariosSeguroV151=function(){
    if(typeof this.lerHorariosTelaV117==='function' && document.getElementById('prof-dia-1')){
      return this.lerHorariosTelaV117();
    }
    return null;
  };

  Profissionais.modal=function(id=''){
    const p=this.list().find(x=>String(x.id)===String(id))||{};
    const root=this.rootV151();

    document.body.classList.add('prof-modal-open-v151');

    root.innerHTML=`<div class="prof-backdrop-v151">
      <div class="prof-modal-v151">
        <div class="prof-title-v151">
          <span>${id?'Editar Profissional':'Novo Profissional'}</span>
          <button type="button" class="modal-x" onclick="Profissionais.fecharModalV151()">×</button>
        </div>

        <div class="prof-body-v151">
          <div class="cm-section">
            <div class="cm-section-title">🧑‍⚕️ Dados do Profissional</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div class="span-3">
                <label>Nome completo</label>
                <input id="prof-nome" value="${Utils.esc(p.nome||'')}">
              </div>
              <div>
                <label>Status</label>
                <select id="prof-ativo">
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>

              <div>
                <label>Perfil de acesso</label>
                <select id="prof-perfil">
                  <option value="medico">Médico</option>
                  <option value="recepcao">Recepção</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label>Tipo de conselho</label>
                <select id="prof-tipo">
                  <option>CRM</option>
                  <option>CRF</option>
                  <option>COREN</option>
                  <option>CREFITO</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label>UF</label>
                <input id="prof-uf" value="${Utils.esc(p.ufConselho||'MS')}">
              </div>
              <div>
                <label>Número do conselho</label>
                <input id="prof-num" value="${Utils.esc(p.numeroConselho||'')}">
              </div>

              <div class="span-2">
                <label>Especialidade / Setor</label>
                <input id="prof-especialidade" value="${Utils.esc(p.especialidade||'')}">
              </div>
              <div>
                <label>Telefone</label>
                <input id="prof-telefone" value="${Utils.esc(p.telefone||'')}">
              </div>
              <div>
                <label>E-mail</label>
                <input id="prof-email" value="${Utils.esc(p.email||'')}">
              </div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">🔐 Login do sistema</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div class="span-2">
                <label>Login / usuário</label>
                <input id="prof-login" value="${Utils.esc(p.login||'')}" placeholder="ex: recepcao">
              </div>
              <div class="span-2">
                <label>Senha</label>
                <input id="prof-senha" type="password" value="${Utils.esc(p.senha||'')}" placeholder="${id?'Deixe como está ou altere':'Crie uma senha'}">
              </div>
            </div>
          </div>

          ${this.horariosHtmlSeguroV151(p)}

          <div class="cm-section">
            <div class="cm-section-title">✍️ Assinatura nas impressões</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div>
                <label>Assinatura ativa</label>
                <select id="prof-assinatura-ativa">
                  <option value="true">Ativada</option>
                  <option value="false">Desativada</option>
                </select>
              </div>
              <div class="span-3">
                <label>Nome impresso</label>
                <input id="prof-assinatura" value="${Utils.esc(p.assinatura||p.nomeAssinatura||p.nome||'')}">
              </div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">📝 Observações</div>
            <textarea id="prof-obs" rows="3">${Utils.esc(p.obs||'')}</textarea>
          </div>
        </div>

        <div class="prof-footer-v151">
          <button class="btn btn-ghost" onclick="Profissionais.fecharModalV151()">Cancelar</button>
          ${id?`<button class="btn ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${id}',true);Profissionais.fecharModalV151()">${p.ativo===false?'Ativar':'Desativar'}</button>`:''}
          <button class="btn btn-blue" onclick="Profissionais.save('${id}')">Salvar</button>
        </div>
      </div>
    </div>`;

    setTimeout(()=>{
      const set=(idEl,val)=>{const el=document.getElementById(idEl); if(el) el.value=val;};
      set('prof-tipo',p.tipoConselho||'CRM');
      set('prof-ativo',String(p.ativo!==false));
      set('prof-perfil',p.perfil||'medico');
      set('prof-assinatura-ativa',String(p.assinaturaAtiva!==false));
    },0);

    return false;
  };

  Profissionais.save=function(id=''){
    let p=id?this.list().find(x=>String(x.id)===String(id)):{id:Utils.id('PROF')};
    if(!p) p={id:id||Utils.id('PROF')};

    p.nome=document.getElementById('prof-nome')?.value.trim()||'';
    p.ativo=document.getElementById('prof-ativo')?.value==='true';
    p.perfil=document.getElementById('prof-perfil')?.value||'medico';
    p.tipoConselho=document.getElementById('prof-tipo')?.value||'CRM';
    p.ufConselho=(document.getElementById('prof-uf')?.value||'MS').trim().toUpperCase();
    p.numeroConselho=document.getElementById('prof-num')?.value.trim()||'';
    p.conselho=p.numeroConselho ? `${p.tipoConselho}-${p.ufConselho} ${p.numeroConselho}`.trim() : '';
    p.especialidade=document.getElementById('prof-especialidade')?.value.trim()||'';
    p.telefone=document.getElementById('prof-telefone')?.value.trim()||'';
    p.email=document.getElementById('prof-email')?.value.trim()||'';
    p.login=document.getElementById('prof-login')?.value.trim()||'';
    p.senha=document.getElementById('prof-senha')?.value.trim()||'';
    p.obs=document.getElementById('prof-obs')?.value.trim()||'';
    p.assinaturaAtiva=document.getElementById('prof-assinatura-ativa')?.value!=='false';
    p.assinatura=document.getElementById('prof-assinatura')?.value.trim()||p.nome;
    p.nomeAssinatura=p.assinatura;

    const horarios=this.lerHorariosSeguroV151();
    if(horarios) p.horariosSemana=horarios;

    if(!p.nome) return Utils.toast('Informe o nome do profissional.');
    if(p.login && !p.senha) return Utils.toast('Informe a senha para este login.');
    if(p.login && this.loginEmUso && this.loginEmUso(p.login,p.id)) return Utils.toast('Este login já está em uso.');

    Store.upsert('PROFISSIONAIS',p);
    this.sincronizarUsuario && this.sincronizarUsuario(p);

    this.fecharModalV151();
    this.render();
    Utils.toast('Profissional salvo.');
    return true;
  };
})();




/* =========================================================
   ZERO V17.5 — Profissional: agenda que atende
   Correção:
   - Volta no Editar/Novo Profissional a escolha:
     Agenda médica, Agenda procedimentos ou Ambas.
   - Salva junto com o profissional.
   - Mantém horários semanais do profissional.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__agendaTipoProfissionalV175) return;
  Profissionais.__agendaTipoProfissionalV175=true;

  Profissionais.agendaTipoProfV175=function(p={}){
    let v=String(p.agendaTipo||p.agendaAtendimento||p.tipoAgenda||p.agenda||'').trim();
    if(!v){
      const med=p.atendeAgendaMedica!==false && p.atendeConsulta!==false && p.atendeAgendaConsulta!==false;
      const proc=p.atendeAgendaProcedimentos!==false && p.atendeProcedimento!==false && p.atendeAgendaProcedimento!==false;
      if(med && proc) v='ambas';
      else if(proc) v='procedimento';
      else if(med) v='consulta';
      else v='ambas';
    }
    v=v.toLowerCase();
    if(['ambos','ambas','todos','todas','consulta_procedimento','medica_procedimento'].includes(v)) return 'ambas';
    if(['procedimento','procedimentos','agendaProcedimentos','agenda_procedimentos'].map(x=>x.toLowerCase()).includes(v)) return 'procedimento';
    if(['consulta','consultas','medica','médica','agenda','agenda_medica','agenda médica'].includes(v)) return 'consulta';
    return 'ambas';
  };

  Profissionais.agendaTipoLabelV175=function(v){
    v=this.agendaTipoProfV175({agendaTipo:v});
    if(v==='consulta') return 'Somente agenda médica';
    if(v==='procedimento') return 'Somente agenda de procedimentos';
    return 'Agenda médica e agenda de procedimentos';
  };

  Profissionais.htmlAgendaTipoV175=function(p={}){
    const atual=this.agendaTipoProfV175(p);
    return `<div class="cm-section prof-agenda-tipo-v175" id="prof-agenda-tipo-section-v175">
      <div class="cm-section-title">📅 Agenda do profissional</div>
      <div class="cm-form-grid cm-form-grid-v118">
        <div class="span-2">
          <label>Esse profissional atende em qual agenda?</label>
          <select id="prof-agenda-tipo">
            <option value="ambas" ${atual==='ambas'?'selected':''}>Agenda médica e agenda de procedimentos</option>
            <option value="consulta" ${atual==='consulta'?'selected':''}>Somente agenda médica</option>
            <option value="procedimento" ${atual==='procedimento'?'selected':''}>Somente agenda de procedimentos</option>
          </select>
        </div>
        <div class="span-2 prof-agenda-ajuda-v175">
          Escolha onde este profissional deve aparecer para agendamento. Os horários semanais continuam sendo configurados abaixo.
        </div>
      </div>
    </div>`;
  };

  Profissionais.aplicarAgendaTipoNoModalV175=function(p={}){
    const body=document.querySelector('#profissionais-modal-root-v151 .prof-body-v151') || document.querySelector('#modal-root .modal-body');
    if(!body || document.getElementById('prof-agenda-tipo-section-v175')) return;

    const html=this.htmlAgendaTipoV175(p);
    const loginSection=Array.from(body.querySelectorAll('.cm-section')).find(sec=>
      String(sec.textContent||'').toLowerCase().includes('login do sistema')
    );
    if(loginSection) loginSection.insertAdjacentHTML('afterend',html);
    else body.insertAdjacentHTML('beforeend',html);
  };

  const oldModalV175=Profissionais.modal?.bind(Profissionais);
  Profissionais.modal=function(id=''){
    const p=this.list().find(x=>String(x.id)===String(id))||{};
    const ret=oldModalV175 ? oldModalV175(id) : false;
    setTimeout(()=>{
      this.aplicarAgendaTipoNoModalV175(p);
      const sel=document.getElementById('prof-agenda-tipo');
      if(sel) sel.value=this.agendaTipoProfV175(p);
    },30);
    setTimeout(()=>{
      this.aplicarAgendaTipoNoModalV175(p);
      const sel=document.getElementById('prof-agenda-tipo');
      if(sel) sel.value=this.agendaTipoProfV175(p);
    },120);
    return ret;
  };

  Profissionais.aplicarAgendaNoObjetoV175=function(p){
    const tipo=document.getElementById('prof-agenda-tipo')?.value || this.agendaTipoProfV175(p);
    p.agendaTipo=tipo;
    p.agendaAtendimento=tipo;
    p.tipoAgenda=tipo;
    p.agendaLabel=this.agendaTipoLabelV175(tipo);
    p.atendeAgendaMedica=(tipo==='ambas'||tipo==='consulta');
    p.atendeAgendaConsulta=p.atendeAgendaMedica;
    p.atendeConsulta=p.atendeAgendaMedica;
    p.atendeAgendaProcedimentos=(tipo==='ambas'||tipo==='procedimento');
    p.atendeAgendaProcedimento=p.atendeAgendaProcedimentos;
    p.atendeProcedimento=p.atendeAgendaProcedimentos;
    return p;
  };

  // Mantém o save estável da V15.1, incluindo agendaTipo.
  Profissionais.save=function(id=''){
    let p=id?this.list().find(x=>String(x.id)===String(id)):{id:Utils.id('PROF')};
    if(!p) p={id:id||Utils.id('PROF')};

    p.nome=document.getElementById('prof-nome')?.value.trim()||'';
    p.ativo=document.getElementById('prof-ativo')?.value==='true';
    p.perfil=document.getElementById('prof-perfil')?.value||'medico';
    p.tipoConselho=document.getElementById('prof-tipo')?.value||'CRM';
    p.ufConselho=(document.getElementById('prof-uf')?.value||'MS').trim().toUpperCase();
    p.numeroConselho=document.getElementById('prof-num')?.value.trim()||'';
    p.conselho=p.numeroConselho ? `${p.tipoConselho}-${p.ufConselho} ${p.numeroConselho}`.trim() : '';
    p.especialidade=document.getElementById('prof-especialidade')?.value.trim()||'';
    p.telefone=document.getElementById('prof-telefone')?.value.trim()||'';
    p.email=document.getElementById('prof-email')?.value.trim()||'';
    p.login=document.getElementById('prof-login')?.value.trim()||'';
    p.senha=document.getElementById('prof-senha')?.value.trim()||'';
    p.obs=document.getElementById('prof-obs')?.value.trim()||'';
    p.assinaturaAtiva=document.getElementById('prof-assinatura-ativa')?.value!=='false';
    p.assinatura=document.getElementById('prof-assinatura')?.value.trim()||p.nome;
    p.nomeAssinatura=p.assinatura;

    this.aplicarAgendaNoObjetoV175(p);

    const horarios=this.lerHorariosSeguroV151 ? this.lerHorariosSeguroV151() : null;
    if(horarios) p.horariosSemana=horarios;

    if(!p.nome) return Utils.toast('Informe o nome do profissional.');
    if(p.login && !p.senha) return Utils.toast('Informe a senha para este login.');
    if(p.login && this.loginEmUso && this.loginEmUso(p.login,p.id)) return Utils.toast('Este login já está em uso.');

    Store.upsert('PROFISSIONAIS',p);
    this.sincronizarUsuario && this.sincronizarUsuario(p);

    if(this.fecharModalV151) this.fecharModalV151();
    else if(window.Modal?.close) Modal.close();

    this.render();
    Utils.toast('Profissional salvo.');
    return true;
  };
})();




/* =========================================================
   ZERO V17.6 — Editar Profissional estável + agenda salva real
   Correções:
   - Campo da agenda entra direto no HTML do modal, sem injetar depois.
   - Salvar grava agendaTipo / flags de agenda no profissional.
   - Ao reabrir, mantém a opção escolhida.
   - Modal de profissional abre estável, sem reconstruir o campo depois.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__profAgendaSalvaEstavelV176) return;
  Profissionais.__profAgendaSalvaEstavelV176=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');

  Profissionais.agendaTipoProfV176=function(p={}){
    let v=String(p.agendaTipo||p.agendaAtendimento||p.tipoAgenda||p.agenda||'').trim().toLowerCase();

    if(!v){
      const campos=['atendeAgendaMedica','atendeConsulta','atendeAgendaConsulta','atendeAgendaProcedimentos','atendeProcedimento','atendeAgendaProcedimento'];
      const temConfig=campos.some(k=>Object.prototype.hasOwnProperty.call(p,k));
      if(!temConfig) return 'ambas';

      const med=p.atendeAgendaMedica===true || p.atendeConsulta===true || p.atendeAgendaConsulta===true;
      const proc=p.atendeAgendaProcedimentos===true || p.atendeProcedimento===true || p.atendeAgendaProcedimento===true;
      if(med && proc) return 'ambas';
      if(proc) return 'procedimento';
      if(med) return 'consulta';
      return 'ambas';
    }

    if(['ambas','ambos','todas','todos','consulta_procedimento','medica_procedimento'].includes(v)) return 'ambas';
    if(['procedimento','procedimentos','agendaprocedimentos','agenda_procedimentos','agenda procedimentos'].includes(v)) return 'procedimento';
    if(['consulta','consultas','medica','médica','agenda','agenda_medica','agenda médica'].includes(v)) return 'consulta';
    return 'ambas';
  };

  Profissionais.agendaLabelV176=function(tipo){
    tipo=this.agendaTipoProfV176({agendaTipo:tipo});
    if(tipo==='consulta') return 'Somente agenda médica';
    if(tipo==='procedimento') return 'Somente agenda de procedimentos';
    return 'Agenda médica e agenda de procedimentos';
  };

  Profissionais.htmlAgendaTipoV176=function(p={}){
    const atual=this.agendaTipoProfV176(p);
    return `<div class="cm-section prof-agenda-tipo-v176">
      <div class="cm-section-title">📅 Agenda do profissional</div>
      <div class="cm-form-grid cm-form-grid-v118">
        <div class="span-2">
          <label>Esse profissional aparece em qual agenda?</label>
          <select id="prof-agenda-tipo">
            <option value="ambas" ${atual==='ambas'?'selected':''}>Agenda médica e agenda de procedimentos</option>
            <option value="consulta" ${atual==='consulta'?'selected':''}>Somente agenda médica</option>
            <option value="procedimento" ${atual==='procedimento'?'selected':''}>Somente agenda de procedimentos</option>
          </select>
        </div>
        <div class="span-2 prof-agenda-ajuda-v175">
          Esta opção define em qual agenda o profissional aparece. Os horários semanais abaixo continuam valendo para a agenda escolhida.
        </div>
      </div>
    </div>`;
  };

  Profissionais.rootV176=function(){
    let root=document.getElementById('profissionais-modal-root-v151');
    if(!root){
      root=document.createElement('div');
      root.id='profissionais-modal-root-v151';
      document.body.appendChild(root);
    }
    return root;
  };

  Profissionais.estabilizarModalProfissionalV176=function(){
    document.body.classList.add('prof-modal-open-v151','prof-modal-estavel-v176');
    const root=document.getElementById('profissionais-modal-root-v151');
    if(!root) return;
    root.querySelectorAll('.prof-backdrop-v151,.prof-modal-v151,.prof-body-v151,.prof-footer-v151').forEach(el=>{
      el.style.animation='none';
      el.style.transition='none';
      el.style.opacity='1';
      el.style.visibility='visible';
      el.style.transform='none';
    });
  };

  Profissionais.modal=function(id=''){
    const p=this.list().find(x=>String(x.id)===String(id))||{};
    const root=this.rootV176();
    const agendaTipo=this.agendaTipoProfV176(p);

    document.body.classList.add('prof-modal-open-v151','prof-modal-estavel-v176');

    root.innerHTML=`<div class="prof-backdrop-v151">
      <div class="prof-modal-v151">
        <div class="prof-title-v151">
          <span>${id?'Editar Profissional':'Novo Profissional'}</span>
          <button type="button" class="modal-x" onclick="Profissionais.fecharModalV151 ? Profissionais.fecharModalV151() : (document.getElementById('profissionais-modal-root-v151').innerHTML='')">×</button>
        </div>

        <div class="prof-body-v151">
          <div class="cm-section">
            <div class="cm-section-title">🧑‍⚕️ Dados do Profissional</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div class="span-3">
                <label>Nome completo</label>
                <input id="prof-nome" value="${esc(p.nome||'')}">
              </div>
              <div>
                <label>Status</label>
                <select id="prof-ativo">
                  <option value="true" ${p.ativo===false?'':'selected'}>Ativo</option>
                  <option value="false" ${p.ativo===false?'selected':''}>Inativo</option>
                </select>
              </div>

              <div>
                <label>Perfil de acesso</label>
                <select id="prof-perfil">
                  <option value="medico" ${(p.perfil||'medico')==='medico'?'selected':''}>Médico</option>
                  <option value="recepcao" ${p.perfil==='recepcao'?'selected':''}>Recepção</option>
                  <option value="financeiro" ${p.perfil==='financeiro'?'selected':''}>Financeiro</option>
                  <option value="admin" ${p.perfil==='admin'?'selected':''}>Administrador</option>
                </select>
              </div>
              <div>
                <label>Tipo de conselho</label>
                <select id="prof-tipo">
                  ${['CRM','CRF','COREN','CREFITO','Outro'].map(t=>`<option ${String(p.tipoConselho||'CRM')===t?'selected':''}>${t}</option>`).join('')}
                </select>
              </div>
              <div>
                <label>UF</label>
                <input id="prof-uf" value="${esc(p.ufConselho||'MS')}">
              </div>
              <div>
                <label>Número do conselho</label>
                <input id="prof-num" value="${esc(p.numeroConselho||'')}">
              </div>

              <div class="span-2">
                <label>Especialidade / Setor</label>
                <input id="prof-especialidade" value="${esc(p.especialidade||'')}">
              </div>
              <div>
                <label>Telefone</label>
                <input id="prof-telefone" value="${esc(p.telefone||'')}">
              </div>
              <div>
                <label>E-mail</label>
                <input id="prof-email" value="${esc(p.email||'')}">
              </div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">🔐 Login do sistema</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div class="span-2">
                <label>Login / usuário</label>
                <input id="prof-login" value="${esc(p.login||'')}" placeholder="ex: recepcao">
              </div>
              <div class="span-2">
                <label>Senha</label>
                <input id="prof-senha" type="password" value="${esc(p.senha||'')}" placeholder="${id?'Deixe como está ou altere':'Crie uma senha'}">
              </div>
            </div>
          </div>

          ${this.htmlAgendaTipoV176(p)}

          ${this.horariosHtmlSeguroV151 ? this.horariosHtmlSeguroV151(p) : ''}

          <div class="cm-section">
            <div class="cm-section-title">✍️ Assinatura nas impressões</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div>
                <label>Assinatura ativa</label>
                <select id="prof-assinatura-ativa">
                  <option value="true" ${p.assinaturaAtiva===false?'':'selected'}>Ativada</option>
                  <option value="false" ${p.assinaturaAtiva===false?'selected':''}>Desativada</option>
                </select>
              </div>
              <div class="span-3">
                <label>Nome impresso</label>
                <input id="prof-assinatura" value="${esc(p.assinatura||p.nomeAssinatura||p.nome||'')}">
              </div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">📝 Observações</div>
            <textarea id="prof-obs" rows="3">${esc(p.obs||'')}</textarea>
          </div>
        </div>

        <div class="prof-footer-v151">
          <button class="btn btn-ghost" onclick="Profissionais.fecharModalV151 ? Profissionais.fecharModalV151() : (document.getElementById('profissionais-modal-root-v151').innerHTML='')">Cancelar</button>
          ${id?`<button class="btn ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${id}',true);Profissionais.fecharModalV151 && Profissionais.fecharModalV151()">${p.ativo===false?'Ativar':'Desativar'}</button>`:''}
          <button class="btn btn-blue" onclick="Profissionais.save('${id}')">Salvar</button>
        </div>
      </div>
    </div>`;

    setTimeout(()=>{
      const sel=document.getElementById('prof-agenda-tipo');
      if(sel) sel.value=agendaTipo;
      this.estabilizarModalProfissionalV176();
    },0);

    return false;
  };

  Profissionais.aplicarAgendaNoObjetoV176=function(p){
    const tipo=document.getElementById('prof-agenda-tipo')?.value || this.agendaTipoProfV176(p);
    p.agendaTipo=tipo;
    p.agendaAtendimento=tipo;
    p.tipoAgenda=tipo;
    p.agendaLabel=this.agendaLabelV176(tipo);

    p.atendeAgendaMedica=(tipo==='ambas'||tipo==='consulta');
    p.atendeAgendaConsulta=p.atendeAgendaMedica;
    p.atendeConsulta=p.atendeAgendaMedica;

    p.atendeAgendaProcedimentos=(tipo==='ambas'||tipo==='procedimento');
    p.atendeAgendaProcedimento=p.atendeAgendaProcedimentos;
    p.atendeProcedimento=p.atendeAgendaProcedimentos;

    return p;
  };

  Profissionais.save=function(id=''){
    let p=id?this.list().find(x=>String(x.id)===String(id)):{id:Utils.id('PROF')};
    if(!p) p={id:id||Utils.id('PROF')};

    p.nome=document.getElementById('prof-nome')?.value.trim()||'';
    p.ativo=document.getElementById('prof-ativo')?.value==='true';
    p.perfil=document.getElementById('prof-perfil')?.value||'medico';
    p.tipoConselho=document.getElementById('prof-tipo')?.value||'CRM';
    p.ufConselho=(document.getElementById('prof-uf')?.value||'MS').trim().toUpperCase();
    p.numeroConselho=document.getElementById('prof-num')?.value.trim()||'';
    p.conselho=p.numeroConselho ? `${p.tipoConselho}-${p.ufConselho} ${p.numeroConselho}`.trim() : '';
    p.especialidade=document.getElementById('prof-especialidade')?.value.trim()||'';
    p.telefone=document.getElementById('prof-telefone')?.value.trim()||'';
    p.email=document.getElementById('prof-email')?.value.trim()||'';
    p.login=document.getElementById('prof-login')?.value.trim()||'';
    p.senha=document.getElementById('prof-senha')?.value.trim()||'';
    p.obs=document.getElementById('prof-obs')?.value.trim()||'';
    p.assinaturaAtiva=document.getElementById('prof-assinatura-ativa')?.value!=='false';
    p.assinatura=document.getElementById('prof-assinatura')?.value.trim()||p.nome;
    p.nomeAssinatura=p.assinatura;

    this.aplicarAgendaNoObjetoV176(p);

    const horarios=this.lerHorariosSeguroV151 ? this.lerHorariosSeguroV151() : null;
    if(horarios) p.horariosSemana=horarios;

    if(!p.nome) return Utils.toast('Informe o nome do profissional.');
    if(p.login && !p.senha) return Utils.toast('Informe a senha para este login.');
    if(p.login && this.loginEmUso && this.loginEmUso(p.login,p.id)) return Utils.toast('Este login já está em uso.');

    Store.upsert('PROFISSIONAIS',p);
    this.sincronizarUsuario && this.sincronizarUsuario(p);

    if(this.fecharModalV151) this.fecharModalV151();
    else document.getElementById('profissionais-modal-root-v151').innerHTML='';

    this.render();
    Utils.toast('Profissional salvo.');
    return true;
  };
})();




/* =========================================================
   ZERO V17.9 — Cadastro/Editar Profissional estável, sem puxar modal antigo
   Correções:
   - Novo/Editar Profissional abre direto no modal final.
   - Não chama mais modal/script antigo antes de estabilizar.
   - Limpa restos de modal antigo antes de abrir.
   - Mantém agenda do profissional, horários semanais, login e assinatura.
========================================================= */
(function(){
  if(!window.Profissionais || Profissionais.__modalEstavelSemAntigoV179) return;
  Profissionais.__modalEstavelSemAntigoV179=true;

  const esc=(v)=>Utils.esc ? Utils.esc(v||'') : String(v||'');

  Profissionais.rootV179=function(){
    ['profissionais-modal-root-v151','profissionais-modal-root-v176'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='';
    });
    const modalRoot=document.getElementById('modal-root');
    if(modalRoot) modalRoot.innerHTML='';

    let root=document.getElementById('profissionais-modal-root-v179');
    if(!root){
      root=document.createElement('div');
      root.id='profissionais-modal-root-v179';
      document.body.appendChild(root);
    }
    return root;
  };

  Profissionais.fecharModalV179=function(){
    ['profissionais-modal-root-v179','profissionais-modal-root-v151','profissionais-modal-root-v176'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='';
    });
    const modalRoot=document.getElementById('modal-root');
    if(modalRoot && modalRoot.querySelector('[data-prof-modal-v179]')) modalRoot.innerHTML='';
    document.body.classList.remove('prof-modal-open-v151','prof-modal-estavel-v176','prof-modal-estavel-v179');
    return false;
  };

  Profissionais.fecharModalV151=function(){ return this.fecharModalV179(); };

  Profissionais.agendaTipoProfV179=function(p={}){
    if(this.agendaTipoProfV176) return this.agendaTipoProfV176(p);
    let v=String(p.agendaTipo||p.agendaAtendimento||p.tipoAgenda||p.agenda||'').trim().toLowerCase();
    if(!v) return 'ambas';
    if(['ambas','ambos','todos','todas'].includes(v)) return 'ambas';
    if(v.includes('proced')) return 'procedimento';
    if(v.includes('consulta') || v.includes('medic') || v.includes('médic')) return 'consulta';
    return 'ambas';
  };

  Profissionais.agendaLabelV179=function(tipo){
    tipo=this.agendaTipoProfV179({agendaTipo:tipo});
    if(tipo==='consulta') return 'Somente agenda médica';
    if(tipo==='procedimento') return 'Somente agenda de procedimentos';
    return 'Agenda médica e agenda de procedimentos';
  };

  Profissionais.htmlAgendaTipoV179=function(p={}){
    const atual=this.agendaTipoProfV179(p);
    return `<div class="cm-section prof-agenda-tipo-v179">
      <div class="cm-section-title">📅 Agenda do profissional</div>
      <div class="cm-form-grid cm-form-grid-v118">
        <div class="span-2">
          <label>Esse profissional aparece em qual agenda?</label>
          <select id="prof-agenda-tipo">
            <option value="ambas" ${atual==='ambas'?'selected':''}>Agenda médica e agenda de procedimentos</option>
            <option value="consulta" ${atual==='consulta'?'selected':''}>Somente agenda médica</option>
            <option value="procedimento" ${atual==='procedimento'?'selected':''}>Somente agenda de procedimentos</option>
          </select>
        </div>
        <div class="span-2 prof-agenda-ajuda-v179">
          Esta opção define em qual agenda o profissional vai aparecer. Os horários semanais continuam abaixo.
        </div>
      </div>
    </div>`;
  };

  Profissionais.estabilizarModalV179=function(){
    document.body.classList.add('prof-modal-open-v151','prof-modal-estavel-v179');
    const root=document.getElementById('profissionais-modal-root-v179');
    if(!root) return;
    root.querySelectorAll('.prof-backdrop-v179,.prof-modal-v179,.prof-body-v179,.prof-footer-v179,.cm-section,.cm-form-grid').forEach(el=>{
      el.style.animation='none';
      el.style.transition='none';
      el.style.opacity='1';
      el.style.visibility='visible';
      el.style.transform='none';
    });
  };

  Profissionais.modal=function(id=''){
    const p=this.list().find(x=>String(x.id)===String(id))||{};
    const root=this.rootV179();

    document.body.classList.add('prof-modal-open-v151','prof-modal-estavel-v179');

    root.innerHTML=`<div class="prof-backdrop-v179" data-prof-modal-v179="true">
      <div class="prof-modal-v179" role="dialog" aria-modal="true">
        <div class="prof-title-v179">
          <span>${id?'Editar Profissional':'Novo Profissional'}</span>
          <button type="button" class="modal-x" onclick="Profissionais.fecharModalV179()">×</button>
        </div>

        <div class="prof-body-v179">
          <div class="cm-section">
            <div class="cm-section-title">🧑‍⚕️ Dados do Profissional</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div class="span-3">
                <label>Nome completo</label>
                <input id="prof-nome" value="${esc(p.nome||'')}">
              </div>
              <div>
                <label>Status</label>
                <select id="prof-ativo">
                  <option value="true" ${p.ativo===false?'':'selected'}>Ativo</option>
                  <option value="false" ${p.ativo===false?'selected':''}>Inativo</option>
                </select>
              </div>

              <div>
                <label>Perfil de acesso</label>
                <select id="prof-perfil">
                  <option value="medico" ${(p.perfil||'medico')==='medico'?'selected':''}>Médico</option>
                  <option value="recepcao" ${p.perfil==='recepcao'?'selected':''}>Recepção</option>
                  <option value="financeiro" ${p.perfil==='financeiro'?'selected':''}>Financeiro</option>
                  <option value="admin" ${p.perfil==='admin'?'selected':''}>Administrador</option>
                </select>
              </div>
              <div>
                <label>Tipo de conselho</label>
                <select id="prof-tipo">
                  ${['CRM','CRF','COREN','CREFITO','Outro'].map(t=>`<option ${String(p.tipoConselho||'CRM')===t?'selected':''}>${t}</option>`).join('')}
                </select>
              </div>
              <div>
                <label>UF</label>
                <input id="prof-uf" value="${esc(p.ufConselho||'MS')}">
              </div>
              <div>
                <label>Número do conselho</label>
                <input id="prof-num" value="${esc(p.numeroConselho||'')}">
              </div>

              <div class="span-2">
                <label>Especialidade / Setor</label>
                <input id="prof-especialidade" value="${esc(p.especialidade||'')}">
              </div>
              <div>
                <label>Telefone</label>
                <input id="prof-telefone" value="${esc(p.telefone||'')}">
              </div>
              <div>
                <label>E-mail</label>
                <input id="prof-email" value="${esc(p.email||'')}">
              </div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">🔐 Login do sistema</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div class="span-2">
                <label>Login / usuário</label>
                <input id="prof-login" value="${esc(p.login||'')}" placeholder="ex: recepcao">
              </div>
              <div class="span-2">
                <label>Senha</label>
                <input id="prof-senha" type="password" value="${esc(p.senha||'')}" placeholder="${id?'Deixe como está ou altere':'Crie uma senha'}">
              </div>
            </div>
          </div>

          ${this.htmlAgendaTipoV179(p)}

          ${this.horariosHtmlSeguroV151 ? this.horariosHtmlSeguroV151(p) : (this.htmlHorariosV117 ? this.htmlHorariosV117(p) : '')}

          <div class="cm-section">
            <div class="cm-section-title">✍️ Assinatura nas impressões</div>
            <div class="cm-form-grid cm-form-grid-v118">
              <div>
                <label>Assinatura ativa</label>
                <select id="prof-assinatura-ativa">
                  <option value="true" ${p.assinaturaAtiva===false?'':'selected'}>Ativada</option>
                  <option value="false" ${p.assinaturaAtiva===false?'selected':''}>Desativada</option>
                </select>
              </div>
              <div class="span-3">
                <label>Nome impresso</label>
                <input id="prof-assinatura" value="${esc(p.assinatura||p.nomeAssinatura||p.nome||'')}">
              </div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">📝 Observações</div>
            <textarea id="prof-obs" rows="3">${esc(p.obs||'')}</textarea>
          </div>
        </div>

        <div class="prof-footer-v179">
          <button class="btn btn-ghost" onclick="Profissionais.fecharModalV179()">Cancelar</button>
          ${id?`<button class="btn ${p.ativo===false?'btn-green':'btn-red'}" onclick="Profissionais.toggleAtivo('${id}',true);Profissionais.fecharModalV179()">${p.ativo===false?'Ativar':'Desativar'}</button>`:''}
          <button class="btn btn-blue" onclick="Profissionais.save('${id}')">Salvar</button>
        </div>
      </div>
    </div>`;

    this.estabilizarModalV179();
    requestAnimationFrame(()=>this.estabilizarModalV179());
    setTimeout(()=>this.estabilizarModalV179(),60);
    return false;
  };

  Profissionais.novo=function(){ return this.modal(''); };
  Profissionais.editar=function(id){ return this.modal(id); };
  Profissionais.modalProfissional=function(id=''){ return this.modal(id); };
  Profissionais.abrirModal=function(id=''){ return this.modal(id); };

  Profissionais.aplicarAgendaNoObjetoV179=function(p){
    const tipo=document.getElementById('prof-agenda-tipo')?.value || this.agendaTipoProfV179(p);
    p.agendaTipo=tipo;
    p.agendaAtendimento=tipo;
    p.tipoAgenda=tipo;
    p.agendaLabel=this.agendaLabelV179(tipo);

    p.atendeAgendaMedica=(tipo==='ambas'||tipo==='consulta');
    p.atendeAgendaConsulta=p.atendeAgendaMedica;
    p.atendeConsulta=p.atendeAgendaMedica;

    p.atendeAgendaProcedimentos=(tipo==='ambas'||tipo==='procedimento');
    p.atendeAgendaProcedimento=p.atendeAgendaProcedimentos;
    p.atendeProcedimento=p.atendeAgendaProcedimentos;
    return p;
  };

  Profissionais.save=function(id=''){
    let p=id?this.list().find(x=>String(x.id)===String(id)):{id:Utils.id('PROF')};
    if(!p) p={id:id||Utils.id('PROF')};

    p.nome=document.getElementById('prof-nome')?.value.trim()||'';
    p.ativo=document.getElementById('prof-ativo')?.value==='true';
    p.perfil=document.getElementById('prof-perfil')?.value||'medico';
    p.tipoConselho=document.getElementById('prof-tipo')?.value||'CRM';
    p.ufConselho=(document.getElementById('prof-uf')?.value||'MS').trim().toUpperCase();
    p.numeroConselho=document.getElementById('prof-num')?.value.trim()||'';
    p.conselho=p.numeroConselho ? `${p.tipoConselho}-${p.ufConselho} ${p.numeroConselho}`.trim() : '';
    p.especialidade=document.getElementById('prof-especialidade')?.value.trim()||'';
    p.telefone=document.getElementById('prof-telefone')?.value.trim()||'';
    p.email=document.getElementById('prof-email')?.value.trim()||'';
    p.login=document.getElementById('prof-login')?.value.trim()||'';
    p.senha=document.getElementById('prof-senha')?.value.trim()||'';
    p.obs=document.getElementById('prof-obs')?.value.trim()||'';
    p.assinaturaAtiva=document.getElementById('prof-assinatura-ativa')?.value!=='false';
    p.assinatura=document.getElementById('prof-assinatura')?.value.trim()||p.nome;
    p.nomeAssinatura=p.assinatura;

    this.aplicarAgendaNoObjetoV179(p);

    const horarios=this.lerHorariosSeguroV151 ? this.lerHorariosSeguroV151() : (this.lerHorariosTelaV117 ? this.lerHorariosTelaV117() : null);
    if(horarios) p.horariosSemana=horarios;

    if(!p.nome) return Utils.toast('Informe o nome do profissional.');
    if(p.login && !p.senha) return Utils.toast('Informe a senha para este login.');
    if(p.login && this.loginEmUso && this.loginEmUso(p.login,p.id)) return Utils.toast('Este login já está em uso.');

    Store.upsert('PROFISSIONAIS',p);
    this.sincronizarUsuario && this.sincronizarUsuario(p);

    this.fecharModalV179();
    this.render();
    Utils.toast('Profissional salvo.');
    return true;
  };
})();
