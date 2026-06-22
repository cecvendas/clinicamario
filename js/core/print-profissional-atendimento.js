/* ZERO V7.8 — Cabeçalho de impressão pelo profissional do atendimento */
(function(){
  window.ClinicaPrintProfissionalAtendimento = {
    header(titulo, record){
      const prof = window.ClinicaProfissionalDocumento?.resolve(record) || {};
      const cfg=(window.Configuracoes && Configuracoes.get && Configuracoes.get()) || {};
      const nome=prof.nome || record?.medico || record?.profissional || 'Profissional';
      const conselho=window.ClinicaProfissionalDocumento?.conselhoTexto(prof) || record?.crm || record?.conselho || '';
      const especialidade=prof.especialidade || prof.area || '';
      const endereco=cfg.endereco || prof.endereco || '';
      const whatsapp=cfg.whatsapp || prof.whatsapp || prof.telefone || '';
      const instagram=cfg.instagram || '';
      const contato=[whatsapp?`WhatsApp: ${whatsapp}`:'', instagram?`@${String(instagram).replace(/^@/,'')}`:''].filter(Boolean).join(' • ');

      return `<div class="print-header-imagem sem-logo">
        <div class="print-header-texto">
          <h1>${Utils.esc(titulo||'DOCUMENTO CLÍNICO')}</h1>
          <div><strong>${Utils.esc(nome)}</strong></div>
          ${[especialidade,conselho].filter(Boolean).length?`<div>${Utils.esc([especialidade,conselho].filter(Boolean).join(' • '))}</div>`:''}
          ${endereco?`<div>${Utils.esc(endereco)}</div>`:''}
          ${contato?`<div>${Utils.esc(contato)}</div>`:''}
          <div>Impresso em: ${Utils.esc(new Date().toLocaleString('pt-BR'))}</div>
        </div>
      </div>`;
    },

    assinatura(record){
      const prof=window.ClinicaProfissionalDocumento?.resolve(record) || {};
      const nome=prof.nome || record?.medico || record?.profissional || '';
      const conselho=window.ClinicaProfissionalDocumento?.conselhoTexto(prof) || record?.crm || record?.conselho || '';
      return `<div class="assinatura-medico" style="margin-top:45px;text-align:center;page-break-inside:avoid;">
        <div style="border-top:1px solid #111;width:260px;margin:0 auto 6px;"></div>
        <div><strong>${Utils.esc(nome)}</strong></div>
        ${conselho?`<div>${Utils.esc(conselho)}</div>`:''}
      </div>`;
    }
  };
})();
