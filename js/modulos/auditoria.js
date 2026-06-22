window.Auditoria={
  list(){
    return Store.get('AUDITORIA').sort((a,b)=>(Date.parse(b.dataHora||'')||0)-(Date.parse(a.dataHora||'')||0));
  },

  fmtData(iso){
    const d=new Date(iso);
    return isNaN(d.getTime()) ? (iso||'—') : d.toLocaleString('pt-BR');
  },

  badge(acao){
    const a=String(acao||'');
    const danger = a.includes('denied') || a.includes('bloqueado') || a.includes('erro');
    const success = a.includes('login') || a.includes('import') || a.includes('export');
    return `<span class="audit-action-badge ${danger?'danger':success?'success':''}">${Utils.esc(acao||'—')}</span>`;
  },

  render(){
    const logs=this.list();
    document.getElementById('content').innerHTML=`<div class="card">
      <div class="audit-toolbar">
        <div>
          <h3>Logs / Auditoria</h3>
          <p style="color:#64748b;margin-top:4px">Registro local de login, logout, importação/exportação e acessos bloqueados.</p>
        </div>
        <div class="row">
          <button class="btn btn-outline" onclick="Auditoria.exportar()">Exportar Logs</button>
          <button class="btn btn-red" onclick="Auditoria.limpar()">Limpar Logs</button>
        </div>
      </div>

      <div class="audit-filters">
        <input id="audit-busca" placeholder="Buscar usuário, ação ou detalhe" oninput="Auditoria.renderTabela()">
        <select id="audit-acao" onchange="Auditoria.renderTabela()">
          <option value="">Todas as ações</option>
          ${[...new Set(logs.map(l=>l.acao).filter(Boolean))].map(a=>`<option>${Utils.esc(a)}</option>`).join('')}
        </select>
      </div>

      <div id="audit-table" style="margin-top:14px;"></div>
    </div>`;
    this.renderTabela();
  },

  filtrados(){
    const busca=Utils.norm(document.getElementById('audit-busca')?.value||'');
    const acao=document.getElementById('audit-acao')?.value||'';

    return this.list().filter(l=>{
      const hay=Utils.norm([l.usuario,l.perfil,l.acao,l.detalhe,l.dataHora].join(' '));
      return (!busca || hay.includes(busca)) && (!acao || l.acao===acao);
    });
  },

  renderTabela(){
    const logs=this.filtrados();
    const el=document.getElementById('audit-table');
    if(!el) return;

    el.innerHTML = logs.length ? `<div class="sv-table-wrap">
      <table class="sv-table">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Ação</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l=>`<tr class="audit-log-row" onclick="Auditoria.visualizar('${l.id}')">
            <td>${Utils.esc(this.fmtData(l.dataHora))}</td>
            <td>${Utils.esc(l.usuario||'—')}</td>
            <td>${Utils.esc(l.perfil||'—')}</td>
            <td>${this.badge(l.acao)}</td>
            <td>${Utils.esc(l.detalhe||'—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : `<div class="inicio-empty">Nenhum log encontrado.</div>`;
  },

  visualizar(id){
    const l=this.list().find(x=>x.id===id);
    if(!l) return;
    Modal.open('🧾 Detalhe do Log',`
      <div class="cm-view-grid">
        <div class="cm-view-item"><strong>Data/Hora</strong><span>${Utils.esc(this.fmtData(l.dataHora))}</span></div>
        <div class="cm-view-item"><strong>Usuário</strong><span>${Utils.esc(l.usuario||'—')}</span></div>
        <div class="cm-view-item"><strong>Perfil</strong><span>${Utils.esc(l.perfil||'—')}</span></div>
        <div class="cm-view-item"><strong>Ação</strong><span>${Utils.esc(l.acao||'—')}</span></div>
      </div>
      <div class="cm-view-item" style="margin-top:12px;"><strong>Detalhe</strong><span>${Utils.esc(l.detalhe||'—')}</span></div>
    `,`<button class="btn btn-blue" onclick="Modal.close()">Fechar</button>`,'lg');
  },

  exportar(){
    const data=this.list();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='logs_auditoria_'+Date.now()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    if(window.Security) Security.audit('audit_export','Exportou logs de auditoria');
  },

  limpar(){
    if(!confirm('Limpar todos os logs locais de auditoria?')) return;
    Store.set('AUDITORIA',[]);
    if(window.Security) Security.audit('audit_clear','Limpou logs de auditoria');
    this.render();
  }
};