window.AuditoriaSistema={
  logs(){
    return Store.get('AUDITORIA').sort((a,b)=>(Date.parse(b.dataHora||'')||0)-(Date.parse(a.dataHora||'')||0));
  },

  usuarios(){
    return Store.get('USUARIOS');
  },

  profissionais(){
    return Store.get('PROFISSIONAIS');
  },

  atendimentos(){
    return Store.get('ATENDIMENTOS');
  },

  item(titulo,desc,status,tipo='ok'){
    const cls=tipo==='ok'?'audit-system-ok':tipo==='warn'?'audit-system-warn':'audit-system-alert';
    return `<div class="audit-system-item">
      <div>
        <strong>${Utils.esc(titulo)}</strong>
        <div class="doc-sub">${Utils.esc(desc)}</div>
      </div>
      <span class="${cls}">${Utils.esc(status)}</span>
    </div>`;
  },

  card(label,value){
    return `<div class="audit-system-card">
      <div class="label">${Utils.esc(label)}</div>
      <div class="value">${Utils.esc(value)}</div>
    </div>`;
  },

  render(){
    const logs=this.logs();
    const negados=logs.filter(l=>String(l.acao||'').includes('denied') || String(l.acao||'').includes('bloqueado'));
    const logins=logs.filter(l=>String(l.acao||'').includes('login'));
    const usuarios=this.usuarios();
    const profs=this.profissionais();
    const semLogin=profs.filter(p=>p.ativo!==false && !p.login);
    const semPerfil=profs.filter(p=>p.ativo!==false && !p.perfil);
    const atendimentosAbertos=this.atendimentos().filter(a=>a.status==='Aguardando'||a.status==='Em atendimento');

    const temAdmin=usuarios.some(u=>String(u.perfil||'').toLowerCase()==='admin');
    const temAuditoria=Array.isArray(logs);
    const temBackupZip=!!(window.Backup && typeof Backup.importZip==='function');
    const temSupabase=!!window.SupabaseBase;
    const temSecurity=!!window.Security;

    document.getElementById('content').innerHTML=`<div class="card">
      <div class="row between">
        <div>
          <h3>Auditoria Sistema</h3>
          <p style="color:#64748b;margin-top:4px">Verificação das proteções, perfis, acessos e segurança local do sistema.</p>
        </div>
        <button class="btn btn-outline" onclick="AuditoriaSistema.exportar()">Exportar relatório</button>
      </div>
    </div>

    <div class="audit-system-grid">
      ${this.card('Logs registrados',logs.length)}
      ${this.card('Acessos bloqueados',negados.length)}
      ${this.card('Logins',logins.length)}
      ${this.card('Atendimentos abertos',atendimentosAbertos.length)}
    </div>

    <div class="card">
      <h3>Proteções do sistema</h3>
      <div class="audit-system-list" style="margin-top:12px;">
        ${this.item('Controle de perfis', temSecurity?'Security.js carregado e ativo':'Security.js não encontrado', temSecurity?'OK':'Falha', temSecurity?'ok':'alert')}
        ${this.item('Administrador cadastrado', temAdmin?'Existe pelo menos um usuário administrador':'Nenhum administrador localizado', temAdmin?'OK':'Atenção', temAdmin?'ok':'warn')}
        ${this.item('Auditoria local', temAuditoria?'AUDITORIA disponível no armazenamento local':'AUDITORIA não disponível', temAuditoria?'OK':'Falha', temAuditoria?'ok':'alert')}
        ${this.item('Backup ZIP', temBackupZip?'Importação/exportação ZIP disponível':'Importação ZIP não localizada', temBackupZip?'OK':'Falha', temBackupZip?'ok':'alert')}
        ${this.item('Base Supabase', temSupabase?'Base Supabase preparada':'Base Supabase não carregada', temSupabase?'Preparado':'Atenção', temSupabase?'ok':'warn')}
        ${this.item('Registrar Consulta', 'Removido do prontuário. Fluxo correto: Fila / Atendimento > Atender.', 'OK', 'ok')}
      </div>
    </div>

    <div class="card">
      <h3>Profissionais e acessos</h3>
      <div class="audit-system-list" style="margin-top:12px;">
        ${this.item('Profissionais ativos sem login', semLogin.length?`${semLogin.length} profissional(is) ativo(s) sem login`:'Todos os ativos com login ou sem necessidade definida', semLogin.length?'Atenção':'OK', semLogin.length?'warn':'ok')}
        ${this.item('Profissionais ativos sem perfil', semPerfil.length?`${semPerfil.length} profissional(is) sem perfil`:'Todos os ativos possuem perfil', semPerfil.length?'Atenção':'OK', semPerfil.length?'warn':'ok')}
        ${this.item('Usuários cadastrados', `${usuarios.length} usuário(s) no sistema`, usuarios.length?'OK':'Atenção', usuarios.length?'ok':'warn')}
      </div>
    </div>

    <div class="card">
      <h3>Últimos eventos</h3>
      ${logs.length?`<div class="sv-table-wrap" style="margin-top:12px;">
        <table class="sv-table">
          <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Perfil</th><th>Ação</th><th>Detalhe</th></tr></thead>
          <tbody>
            ${logs.slice(0,20).map(l=>`<tr>
              <td>${Utils.esc(this.fmt(l.dataHora))}</td>
              <td>${Utils.esc(l.usuario||'—')}</td>
              <td>${Utils.esc(l.perfil||'—')}</td>
              <td>${Utils.esc(l.acao||'—')}</td>
              <td>${Utils.esc(l.detalhe||'—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`:`<div class="inicio-empty">Nenhum evento registrado.</div>`}
    </div>`;
  },

  fmt(iso){
    const d=new Date(iso);
    return isNaN(d.getTime()) ? (iso||'—') : d.toLocaleString('pt-BR');
  },

  exportar(){
    const data={
      geradoEm:new Date().toISOString(),
      logs:this.logs(),
      usuarios:this.usuarios(),
      profissionais:this.profissionais(),
      atendimentosAbertos:this.atendimentos().filter(a=>a.status==='Aguardando'||a.status==='Em atendimento')
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='auditoria_sistema_'+Date.now()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    if(window.Security) Security.audit('auditoria_sistema_export','Exportou auditoria do sistema');
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
