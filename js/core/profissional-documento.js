/* =========================================================
   ZERO V7.8 — Profissional do atendimento nas impressões
   Regra:
   Receita, laudo, atestado, pedido de exames e prontuário devem
   imprimir com o profissional que atendeu/assinou o documento,
   nunca com quem está logado apenas imprimindo.
========================================================= */
(function(){
  window.ClinicaProfissionalDocumento = {
    norm(v){
      return String(v||'').trim();
    },

    profissionais(){
      return (window.Store && Store.get) ? Store.get('PROFISSIONAIS') : [];
    },

    historicos(){
      return (window.Store && Store.get) ? Store.get('HISTORICO') : [];
    },

    atendimentos(){
      return (window.Store && Store.get) ? Store.get('ATENDIMENTOS') : [];
    },

    byId(id){
      if(!id) return null;
      return this.profissionais().find(p =>
        String(p.id)===String(id) ||
        String(p.profissionalId)===String(id) ||
        String(p.userId)===String(id)
      ) || null;
    },

    byName(nome){
      nome=this.norm(nome).toLowerCase();
      if(!nome) return null;
      return this.profissionais().find(p => this.norm(p.nome).toLowerCase()===nome) || null;
    },

    fromHistoricoId(id){
      if(!id) return null;
      const h=this.historicos().find(x =>
        String(x.id)===String(id) ||
        String(x.histId)===String(id) ||
        String(x.historicoId)===String(id)
      );
      return h ? this.fromRecord(h) : null;
    },

    fromAtendimentoId(id){
      if(!id) return null;
      const a=this.atendimentos().find(x =>
        String(x.id)===String(id) ||
        String(x.atendimentoId)===String(id)
      );
      return a ? this.fromRecord(a) : null;
    },

    fromRecord(record){
      record=record||{};

      // 1) IDs explícitos do profissional/médico que atendeu
      const ids=[
        record.profissionalId,
        record.medicoId,
        record.profId,
        record.usuarioProfissionalId,
        record.assinanteId,
        record.atendidoPorId,
        record.criadoPorProfissionalId
      ].filter(Boolean);

      for(const id of ids){
        const p=this.byId(id);
        if(p) return p;
      }

      // 2) Se o documento guarda vínculo com atendimento/histórico
      const h=this.fromHistoricoId(record.histId || record.historicoId || record.__histId);
      if(h) return h;

      const a=this.fromAtendimentoId(record.atendimentoId || record.atId || record.__atendimentoId);
      if(a) return a;

      // 3) Nomes salvos no documento/atendimento
      const nomes=[
        record.medico,
        record.profissional,
        record.nomeProfissional,
        record.assinante,
        record.atendidoPor,
        record.usuarioNome
      ].filter(Boolean);

      for(const nome of nomes){
        const p=this.byName(nome);
        if(p) return p;
        // Se não existe cadastro, retorna objeto mínimo com o nome salvo no documento.
        if(this.norm(nome)) return { nome:this.norm(nome), crm:record.crm||record.conselho||'', conselho:record.conselho||record.crm||'' };
      }

      return null;
    },

    currentLoggedProfessional(){
      try{
        const sess = window.Auth?.currentUser?.() || window.Security?.currentUser?.() || window.currentUser || {};
        return this.byId(sess.profissionalId || sess.id || sess.userId) || this.byName(sess.nome || sess.name);
      }catch(e){
        return null;
      }
    },

    resolve(record, options={}){
      // A regra principal: primeiro o profissional do documento/atendimento.
      const fromDoc=this.fromRecord(record);
      if(fromDoc) return fromDoc;

      // Se for impressão antiga sem vínculo, tenta paciente/histórico pela data.
      if(record && (record.pacId || record.pacienteId) && record.data){
        const pacId=record.pacId || record.pacienteId;
        const data=record.data;
        const h=this.historicos().find(x =>
          String(x.pacId||x.pacienteId)===String(pacId) &&
          String(x.data||'')===String(data) &&
          (x.medicoId || x.profissionalId || x.medico || x.profissional)
        );
        if(h){
          const p=this.fromRecord(h);
          if(p) return p;
        }
      }

      // Fallback somente para documentos antigos, para não quebrar impressão.
      return options.allowLoggedFallback === false ? null : this.currentLoggedProfessional();
    },

    conselhoTexto(prof){
      if(!prof) return '';
      return prof.crm || prof.conselho || prof.registro || prof.crmConselho || '';
    },

    nome(prof){
      return prof?.nome || prof?.name || '';
    },

    aplicarNoDocumento(record, html){
      const prof=this.resolve(record);
      if(!prof || !html || typeof html!=='string') return html;

      const nome=this.nome(prof);
      const conselho=this.conselhoTexto(prof);

      // Substitui placeholders se existirem.
      html=html.replace(/\{\{PROFISSIONAL_DOCUMENTO\}\}/g, nome || '');
      html=html.replace(/\{\{CONSELHO_DOCUMENTO\}\}/g, conselho || '');
      html=html.replace(/\{\{CRM_DOCUMENTO\}\}/g, conselho || '');

      return html;
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
