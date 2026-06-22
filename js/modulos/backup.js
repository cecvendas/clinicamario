window.Backup={
  modulos:[
    ['PACIENTES','pacientes','pacientes'],
    ['HISTORICO','consultas','consultas'],
    ['HISTORICO','prontuarios','prontuarios'],
    ['RECEITAS','receitas','receitas'],
    ['ATESTADOS','atestados','atestados'],
    ['LAUDOS','laudos','laudos'],
    ['EXAMES_PEDIDOS','pedidosExames','pedidos exames'],
    ['EXAMES_ARQUIVOS','examesAnexos','exames anexos'],
    ['SINAIS_VITAIS','procedimentos','procedimentos'],
    ['ATENDIMENTOS','agenda','agenda'],
    ['USUARIOS','usuarios','usuarios'],
    ['AUDITORIA','auditoria','auditoria'],
    ['CONFIG_CLINICA','configuracoes','configuracoes'],
    ['FIN_RECEITAS','financeiro','financeiro'],
    ['PROFISSIONAIS','profissionais','profissionais']
  ],

  render(){
    document.getElementById('content').innerHTML=`<div class="card">
      <h3>Backup / Importação</h3>
      <p style="color:#64748b;margin-top:4px">Exportar backup completo e restaurar dados do sistema.</p>
      ${this.html()}
    </div>`;
  },

  modal(){
    Modal.open('💾 Backup / Importação',this.html(),`<button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>`,'lg');
  },

  html(){
    return `<div class="backup-original-wrap">
      <div class="backup-original-card">
        <div class="backup-original-title">📦 Exportar backup completo</div>
        <div class="backup-original-desc">
          Exporta um ZIP com JSONs separados por módulo: pacientes, consultas, prontuários, receitas, atestados, laudos, exames, agenda, financeiro, usuários, auditoria e configurações.
        </div>
        <button class="btn btn-blue" onclick="Backup.exportZip()">⬇️ Exportar backup ZIP</button>
      </div>

      <div class="backup-original-card">
        <div class="backup-original-title">📥 Importar / Restaurar</div>
        <div class="backup-original-desc">
          Aceita o novo backup <strong>.zip</strong> e backups antigos em <strong>.json</strong>. Ao substituir, o sistema baixa antes um backup automático de segurança.
        </div>

        <label class="backup-radio-line">
          <input type="radio" name="backup-modo" value="merge" checked>
          <div>
            <strong>Mesclar com dados atuais</strong> <span class="backup-recommend">Recomendado</span>
            <div class="doc-sub">Mantém os dados atuais e adiciona/atualiza dados do backup.</div>
          </div>
        </label>

        <label class="backup-radio-line">
          <input type="radio" name="backup-modo" value="replace">
          <div>
            <strong class="backup-danger">Substituir módulos selecionados</strong>
            <div class="backup-danger">Antes de substituir, o sistema gera um backup automático do estado atual.</div>
          </div>
        </label>

        <div class="backup-original-section-toggle">▾ Selecionar módulos para restaurar</div>
        <div class="backup-modulos-grid">
          ${this.modulos.filter((m,i)=>i<13).map(m=>`<label class="backup-check"><input type="checkbox" class="backup-modulo" value="${m[1]}" checked> ${m[2]}</label>`).join('')}
        </div>

        <button class="btn btn-green" style="margin-top:14px;" onclick="document.getElementById('backup-import-file')?.click()">⬆️ Importar backup</button>
        <input id="backup-import-file" class="backup-hidden-input" type="file" accept=".zip,.json,application/json,application/zip" onchange="Backup.importBackup(event)">
      </div>
    </div>`;
  },

  nomeBase(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `backup_clinica_mario_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  },

  exportData(){
    const data=Store.exportAll();
    data.__meta={
      sistema:'Clínica Mário Zero',
      versao:'Zero V4.8',
      geradoEm:new Date().toISOString()
    };
    return data;
  },

  moduloKeyByNome(nome){
    const map={
      pacientes:'PACIENTES',
      consultas:'HISTORICO',
      prontuarios:'HISTORICO',
      receitas:'RECEITAS',
      atestados:'ATESTADOS',
      laudos:'LAUDOS',
      pedidosExames:'EXAMES_PEDIDOS',
      examesAnexos:'EXAMES_ARQUIVOS',
      procedimentos:'SINAIS_VITAIS',
      agenda:'ATENDIMENTOS',
      usuarios:'USUARIOS',
      auditoria:'AUDITORIA',
      configuracoes:'CONFIG_CLINICA',
      financeiro:'FIN_RECEITAS',
      profissionais:'PROFISSIONAIS'
    };
    return map[nome]||nome;
  },

  selecionados(){
    return Array.from(document.querySelectorAll('.backup-modulo:checked')).map(x=>x.value);
  },

  modo(){
    return document.querySelector('input[name="backup-modo"]:checked')?.value || 'merge';
  },

  exportJson(){
    const data=this.exportData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=this.nomeBase()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    if(window.Security) Security.audit('backup_export_json','Exportou backup JSON');
  },

  exportZip(){
    try{
      const data=this.exportData();
      const files={};

      files['backup_completo.json']=JSON.stringify(data,null,2);

      const modMap=[
        ['PACIENTES','pacientes'],
        ['HISTORICO','consultas'],
        ['HISTORICO','prontuarios'],
        ['RECEITAS','receitas'],
        ['ATESTADOS','atestados'],
        ['LAUDOS','laudos'],
        ['EXAMES_PEDIDOS','pedidos_exames'],
        ['EXAMES_ARQUIVOS','exames_anexos'],
        ['SINAIS_VITAIS','procedimentos'],
        ['ATENDIMENTOS','agenda'],
        ['USUARIOS','usuarios'],
        ['AUDITORIA','auditoria'],
        ['CONFIG_CLINICA','configuracoes'],
        ['PROFISSIONAIS','profissionais']
      ];

      modMap.forEach(([key,name])=>{
        files[`dados/${name}.json`]=JSON.stringify(data[key]||[],null,2);
      });

      files['LEIA-ME.txt']=[
        'Backup Clínica Mário',
        '',
        'Este ZIP contém dados exportados por módulo.',
        'Arquivo principal: backup_completo.json',
        'Arquivos por módulo: pasta dados/',
        '',
        'Gerado em: '+new Date().toLocaleString('pt-BR')
      ].join('\n');

      const blob=this.criarZip(files);
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=this.nomeBase()+'.zip';
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1500);
      Utils.toast('Backup ZIP exportado.');
      if(window.Security) Security.audit('backup_export_zip','Exportou backup ZIP');
    }catch(e){
      console.error(e);
      Utils.toast('Falha ao gerar ZIP. Exportando JSON.');
      this.exportJson();
    }
  },

  importBackup(ev){
    const f=ev.target.files[0];
    if(!f)return;
    if(f.name.toLowerCase().endsWith('.zip')) return this.importZip(ev);
    return this.importJson(ev);
  },

  importJson(ev){
    const f=ev.target.files[0];
    if(!f)return;

    const r=new FileReader();
    r.onload=()=>{
      try{
        const json=JSON.parse(r.result);
        this.aplicarImportacao(json,'JSON');
      }catch(e){
        console.error(e);
        Utils.toast('Arquivo JSON inválido.');
      }
    };
    r.readAsText(f);
  },

  importZip(ev){
    const f=ev.target.files[0];
    if(!f)return;

    const r=new FileReader();
    r.onload=()=>{
      try{
        const files=this.lerZip(new Uint8Array(r.result));
        let jsonTxt=files['backup_completo.json'];

        if(!jsonTxt){
          const completo=Object.keys(files).find(k=>k.toLowerCase().endsWith('/backup_completo.json') || k.toLowerCase()==='backup_completo.json');
          if(completo) jsonTxt=files[completo];
        }

        let data=null;

        if(jsonTxt){
          data=JSON.parse(jsonTxt);
        }else{
          data={};
          Object.keys(files).forEach(k=>{
            const m=k.match(/^dados\/(.+)\.json$/i);
            if(m){
              try{
                const nome=m[1].replace('_','');
                const lookup={
                  pacientes:'PACIENTES',
                  consultas:'HISTORICO',
                  prontuarios:'HISTORICO',
                  receitas:'RECEITAS',
                  atestados:'ATESTADOS',
                  laudos:'LAUDOS',
                  pedidosexames:'EXAMES_PEDIDOS',
                  examesanexos:'EXAMES_ARQUIVOS',
                  procedimentos:'SINAIS_VITAIS',
                  agenda:'ATENDIMENTOS',
                  usuarios:'USUARIOS',
                  auditoria:'AUDITORIA',
                  configuracoes:'CONFIG_CLINICA',
      financeiro:'FIN_RECEITAS',
                  profissionais:'PROFISSIONAIS'
                };
                data[lookup[nome]||m[1]]=JSON.parse(files[k]);
              }catch(e){}
            }
          });
        }

        if(!data || !Object.keys(data).length){
          Utils.toast('ZIP inválido: não encontrei backup_completo.json nem dados/*.json.');
          return;
        }

        this.aplicarImportacao(data,'ZIP');
      }catch(e){
        console.error(e);
        Utils.toast('Não foi possível importar este ZIP.');
      }
    };
    r.readAsArrayBuffer(f);
  },

  aplicarImportacao(json,tipo){
    const modo=this.modo();
    const selecionados=this.selecionados();
    if(!selecionados.length) return Utils.toast('Selecione ao menos um módulo.');

    if(!confirm(`Importar backup ${tipo}?`)) return;

    if(modo==='replace'){
      this.exportZip();
    }

    const mapa={
      pacientes:'PACIENTES',
      consultas:'HISTORICO',
      prontuarios:'HISTORICO',
      receitas:'RECEITAS',
      atestados:'ATESTADOS',
      laudos:'LAUDOS',
      pedidosExames:'EXAMES_PEDIDOS',
      examesAnexos:'EXAMES_ARQUIVOS',
      procedimentos:'SINAIS_VITAIS',
      agenda:'ATENDIMENTOS',
      usuarios:'USUARIOS',
      auditoria:'AUDITORIA',
      configuracoes:'CONFIG_CLINICA',
      financeiro:'FIN_RECEITAS',
      profissionais:'PROFISSIONAIS'
    };

    selecionados.forEach(nome=>{
      const key=mapa[nome];
      if(!key) return;
      const incoming=Array.isArray(json[key]) ? json[key] : [];
      if(modo==='replace'){
        Store.set(key,incoming);
      }else{
        incoming.forEach(item=>Store.upsert(key,item));
      }
    });

    if(window.Security) Security.audit('backup_import_'+tipo.toLowerCase(),`Importou backup ${tipo} modo ${modo}`);
    Utils.toast(`Backup ${tipo} importado.`);
    Router.go('inicio');
  },

  // Leitor ZIP simples: suporta arquivos gerados pelo sistema sem compressão.
  lerZip(bytes){
    const textDecoder=new TextDecoder();
    const u16=(i)=>bytes[i] | (bytes[i+1]<<8);
    const u32=(i)=>(bytes[i] | (bytes[i+1]<<8) | (bytes[i+2]<<16) | (bytes[i+3]<<24))>>>0;
    const files={};
    let pos=0;

    while(pos < bytes.length-30){
      const sig=u32(pos);
      if(sig!==0x04034b50){
        pos++;
        continue;
      }

      const method=u16(pos+8);
      const compSize=u32(pos+18);
      const nameLen=u16(pos+26);
      const extraLen=u16(pos+28);
      const name=textDecoder.decode(bytes.slice(pos+30,pos+30+nameLen));
      const dataStart=pos+30+nameLen+extraLen;
      const dataEnd=dataStart+compSize;

      if(method!==0){
        throw new Error('ZIP com compressão não suportada nesta etapa: '+name);
      }

      files[name]=textDecoder.decode(bytes.slice(dataStart,dataEnd));
      pos=dataEnd;
    }

    return files;
  },

  criarZip(files){
    const encoder=new TextEncoder();
    const fileRecords=[];
    const central=[];
    let offset=0;

    const u16=n=>new Uint8Array([n&255,(n>>>8)&255]);
    const u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
    const concat=(parts)=>{
      const total=parts.reduce((s,p)=>s+p.length,0);
      const out=new Uint8Array(total);
      let pos=0;
      parts.forEach(p=>{out.set(p,pos);pos+=p.length;});
      return out;
    };

    const dosTimeDate=(date)=>{
      const d=date||new Date();
      const time=(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2);
      const dosDate=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
      return {time,dosDate};
    };

    const crcTable=this.crcTable||(this.crcTable=(()=>{
      let c, table=[];
      for(let n=0;n<256;n++){
        c=n;
        for(let k=0;k<8;k++) c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
        table[n]=c>>>0;
      }
      return table;
    })());

    const crc32=(bytes)=>{
      let crc=0^(-1);
      for(let i=0;i<bytes.length;i++) crc=(crc>>>8)^crcTable[(crc^bytes[i])&0xff];
      return (crc^(-1))>>>0;
    };

    Object.keys(files).forEach(name=>{
      const data=encoder.encode(String(files[name]??''));
      const nameBytes=encoder.encode(name.replace(/\\/g,'/'));
      const crc=crc32(data);
      const dt=dosTimeDate(new Date());

      const local=concat([
        u32(0x04034b50),u16(20),u16(0),u16(0),u16(dt.time),u16(dt.dosDate),
        u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),nameBytes,data
      ]);

      fileRecords.push(local);

      const centralHeader=concat([
        u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(dt.time),u16(dt.dosDate),
        u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),u16(0),
        u16(0),u16(0),u32(0),u32(offset),nameBytes
      ]);

      central.push(centralHeader);
      offset+=local.length;
    });

    const centralStart=offset;
    const centralData=concat(central);
    offset+=centralData.length;

    const end=concat([
      u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),
      u32(centralData.length),u32(centralStart),u16(0)
    ]);

    return new Blob([concat([...fileRecords,centralData,end])],{type:'application/zip'});
  }
};

Backup.export = function(){ return Backup.exportZip(); };
Backup.import = function(ev){ return Backup.importBackup(ev); };


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
   ZERO V8.3 — BACKUP PROFISSIONAL
   - ZIP com dados separados
   - manifesto.json
   - anexos locais quando existirem em dataUrl/base64
   - mantém caminhos relativos para Supabase/R2
   - importação de ZIP com dados + anexos locais
========================================================= */
(function(){
  if(!window.Backup || Backup.__profissionalV83) return;
  Backup.__profissionalV83=true;

  Backup.modulosProfissionais = function(){
    return [
      ['PACIENTES','pacientes'],
      ['HISTORICO','consultas'],
      ['HISTORICO','prontuarios'],
      ['RECEITAS','receitas'],
      ['ATESTADOS','atestados'],
      ['LAUDOS','laudos'],
      ['EXAMES_PEDIDOS','pedidos_exames'],
      ['EXAMES_ARQUIVOS','exames_anexos'],
      ['ARQUIVOS','arquivos'],
      ['SINAIS_VITAIS','sinais_vitais'],
      ['ATENDIMENTOS','fila_atendimentos'],
      ['AGENDA_MEDICA','agenda_medica'],
      ['AGENDA_BLOQUEIOS','agenda_bloqueios'],
      ['FIN_RECEITAS','financeiro_receitas'],
      ['FIN_DESPESAS','financeiro_despesas'],
      ['FIN_CATEGORIAS','financeiro_categorias'],
      ['USUARIOS','usuarios'],
      ['PROFISSIONAIS','profissionais'],
      ['AUDITORIA','auditoria'],
      ['LGPD_LOGS','lgpd_logs'],
      ['LGPD_CONSENTIMENTOS','lgpd_consentimentos'],
      ['CONFIG_CLINICA','configuracoes_clinica'],
      ['AGENDA_CONFIG','configuracoes_agenda'],
      ['STORAGE_CONFIG','configuracoes_storage'],
      ['LGPD_CONFIG','configuracoes_lgpd']
    ];
  };

  Backup.exportDataProfissional = function(){
    const data=Store.exportAll();
    data.__meta={
      sistema:'Clínica Mário Zero',
      versao:'Zero V8.3',
      tipo:'backup_profissional_zip',
      geradoEm:new Date().toISOString(),
      observacao:'Backup técnico em JSON separado por módulo. Arquivos/anexos locais ficam na pasta anexos/. Caminhos de Supabase/R2 são mantidos relativos.'
    };
    return data;
  };

  Backup.dataUrlToUint8 = function(dataUrl){
    const parts=String(dataUrl||'').split(',');
    const b64=parts.length>1?parts[1]:parts[0];
    const bin=atob(b64);
    const arr=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    return arr;
  };

  Backup.extFromTipo = function(tipo,nome='arquivo'){
    if(nome && String(nome).includes('.')) return String(nome).split('.').pop().toLowerCase();
    tipo=String(tipo||'').toLowerCase();
    if(tipo.includes('pdf')) return 'pdf';
    if(tipo.includes('png')) return 'png';
    if(tipo.includes('jpeg')||tipo.includes('jpg')) return 'jpg';
    if(tipo.includes('webp')) return 'webp';
    if(tipo.includes('word')) return 'docx';
    return 'bin';
  };

  Backup.coletarAnexosLocais = function(data){
    const anexos=[];
    const fontes=[
      ['ARQUIVOS',data.ARQUIVOS||[]],
      ['EXAMES_ARQUIVOS',data.EXAMES_ARQUIVOS||[]],
      ['RECEITAS',data.RECEITAS||[]],
      ['ATESTADOS',data.ATESTADOS||[]],
      ['LAUDOS',data.LAUDOS||[]],
      ['EXAMES_PEDIDOS',data.EXAMES_PEDIDOS||[]]
    ];

    fontes.forEach(([key,lista])=>{
      if(!Array.isArray(lista)) return;
      lista.forEach((item,idx)=>{
        if(!item || typeof item!=='object') return;
        const dataUrl=item.dataUrl || item.base64 || item.arquivoBase64 || item.conteudoBase64;
        if(!dataUrl || !String(dataUrl).includes('base64')) return;

        const pacId=item.paciente_id || item.pacId || item.pacienteId || 'sem_paciente';
        const nome=item.nome_arquivo || item.nome || item.fileName || `${key}_${idx}.${this.extFromTipo(item.tipo||item.type)}`;
        const pasta=item.categoria || item.origem || key.toLowerCase();
        const caminho=item.caminho || `pacientes/${pacId}/${pasta}/${nome}`;
        const caminhoLimpo=(window.ClinicaStorage?ClinicaStorage.normalizarCaminho(caminho):caminho).replace(/^\/+/,'');
        const zipPath='anexos/'+caminhoLimpo;

        anexos.push({
          zipPath,
          caminho:caminhoLimpo,
          nome,
          tipo:item.tipo||item.type||'',
          origem:key,
          dataUrl
        });

        item.caminho=caminhoLimpo;
        item.backup_anexo=zipPath;
      });
    });

    return anexos;
  };

  Backup.exportZip = function(){
    try{
      const data=this.exportDataProfissional();
      const files={};
      const anexos=this.coletarAnexosLocais(data);

      files['backup_completo.json']=JSON.stringify(data,null,2);

      this.modulosProfissionais().forEach(([key,name])=>{
        files[`dados/${name}.json`]=JSON.stringify(data[key]||[],null,2);
      });

      const manifesto={
        sistema:'Clínica Mário Zero',
        versao:'Zero V8.3',
        geradoEm:new Date().toISOString(),
        formato:'zip-json-modular',
        estrutura:{
          dados:'JSONs separados por módulo',
          anexos:'Arquivos locais quando existirem em base64/dataUrl',
          backup_completo:'Cópia técnica completa para restauração geral'
        },
        regraArquivos:'Salvar apenas caminho relativo. Não salvar URL completa do Supabase/R2.',
        totalModulos:this.modulosProfissionais().length,
        totalAnexos:anexos.length
      };

      files['manifesto.json']=JSON.stringify(manifesto,null,2);
      files['LEIA-ME.txt']=[
        'Backup Clínica Mário — Zero V8.3',
        '',
        'Estrutura:',
        '- backup_completo.json: cópia técnica completa.',
        '- dados/: JSONs separados por módulo.',
        '- anexos/: arquivos locais encontrados em base64/dataUrl.',
        '- manifesto.json: resumo do backup.',
        '',
        'Importante:',
        'Arquivos do Supabase/R2 ficam representados pelo caminho relativo.',
        'Exemplo: pacientes/10/exames/exame.pdf',
        'Não salvar URL completa.',
        '',
        'Gerado em: '+new Date().toLocaleString('pt-BR')
      ].join('\n');

      anexos.forEach(a=>{
        try{
          files[a.zipPath]=this.dataUrlToUint8(a.dataUrl);
        }catch(e){
          console.warn('Falha ao anexar arquivo no backup:',a.zipPath,e);
        }
      });

      const blob=this.criarZip(files);
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=this.nomeBase()+'_profissional.zip';
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1500);
      Utils.toast('Backup profissional ZIP exportado.');
      if(window.Security) Security.audit('backup_export_zip_profissional','Exportou backup profissional ZIP');
      if(window.LGPDOffline) LGPDOffline.audit('backup_profissional','Exportou backup profissional ZIP');
    }catch(e){
      console.error(e);
      Utils.toast('Falha ao gerar backup profissional. Exportando JSON.');
      this.exportJson();
    }
  };

  Backup.importZip = function(ev){
    const f=ev.target.files[0];
    if(!f) return;

    const r=new FileReader();
    r.onload=()=>{
      try{
        const files=this.lerZip(new Uint8Array(r.result));
        let jsonTxt=files['backup_completo.json'];

        if(!jsonTxt){
          const completo=Object.keys(files).find(k=>k.toLowerCase().endsWith('/backup_completo.json') || k.toLowerCase()==='backup_completo.json');
          if(completo) jsonTxt=files[completo];
        }

        let data=null;

        if(jsonTxt){
          data=JSON.parse(jsonTxt);
        }else{
          data={};
          const lookup={
            pacientes:'PACIENTES',
            consultas:'HISTORICO',
            prontuarios:'HISTORICO',
            receitas:'RECEITAS',
            atestados:'ATESTADOS',
            laudos:'LAUDOS',
            pedidos_exames:'EXAMES_PEDIDOS',
            exames_anexos:'EXAMES_ARQUIVOS',
            arquivos:'ARQUIVOS',
            sinais_vitais:'SINAIS_VITAIS',
            fila_atendimentos:'ATENDIMENTOS',
            agenda_medica:'AGENDA_MEDICA',
            agenda_bloqueios:'AGENDA_BLOQUEIOS',
            financeiro_receitas:'FIN_RECEITAS',
            financeiro_despesas:'FIN_DESPESAS',
            financeiro_categorias:'FIN_CATEGORIAS',
            usuarios:'USUARIOS',
            profissionais:'PROFISSIONAIS',
            auditoria:'AUDITORIA',
            lgpd_logs:'LGPD_LOGS',
            lgpd_consentimentos:'LGPD_CONSENTIMENTOS',
            configuracoes_clinica:'CONFIG_CLINICA',
            configuracoes_agenda:'AGENDA_CONFIG',
            configuracoes_storage:'STORAGE_CONFIG',
            configuracoes_lgpd:'LGPD_CONFIG'
          };

          Object.keys(files).forEach(k=>{
            const m=k.match(/^dados\/(.+)\.json$/i);
            if(m){
              try{
                const nome=m[1].toLowerCase();
                data[lookup[nome]||m[1]]=JSON.parse(files[k]);
              }catch(e){}
            }
          });
        }

        // Restaura anexos locais do ZIP para ARQUIVOS quando não vierem já no JSON.
        const anexosZip=Object.keys(files).filter(k=>k.startsWith('anexos/') && !k.endsWith('/'));
        if(anexosZip.length){
          data.ARQUIVOS=data.ARQUIVOS||[];
          anexosZip.forEach(k=>{
            const caminho=k.replace(/^anexos\//,'');
            const existe=data.ARQUIVOS.some(a=>a.caminho===caminho || a.backup_anexo===k);
            if(!existe){
              data.ARQUIVOS.push({
                id:Utils.id('ARQ'),
                caminho,
                nome_arquivo:caminho.split('/').pop(),
                nome:caminho.split('/').pop(),
                categoria:'restaurado',
                origem:'backup_zip',
                criadoEm:new Date().toISOString()
              });
            }
          });
        }

        if(!data || !Object.keys(data).length){
          Utils.toast('ZIP inválido: não encontrei backup_completo.json nem dados/*.json.');
          return;
        }

        this.aplicarImportacao(data,'ZIP');
      }catch(e){
        console.error(e);
        Utils.toast('Não foi possível importar este ZIP.');
      }
    };
    r.readAsArrayBuffer(f);
  };

  const oldHtml=this.html?.bind(this);
  Backup.html = function(){
    const base = oldHtml ? oldHtml() : '';
    if(base.includes('Backup profissional')) return base;
    return base.replace(
      '<div class="backup-original-title">📦 Exportar backup completo</div>',
      '<div class="backup-original-title">📦 Exportar backup completo profissional</div>'
    ).replace(
      'Exporta um ZIP com JSONs separados por módulo: pacientes, consultas, prontuários, receitas, atestados, laudos, exames, agenda, financeiro, usuários, auditoria e configurações.',
      'Exporta um ZIP profissional com dados separados por módulo, manifesto e anexos locais quando existirem. Mantém caminhos relativos para Supabase/R2.'
    );
  };
})();




/* =========================================================
   ZERO V8.5 — Corrige tela Backup / Importação vazia
   - Restaura HTML completo do backup.
   - Mantém backup profissional V8.3.
========================================================= */
(function(){
  if(!window.Backup) return;

  Backup.html = function(){
    return `<div class="backup-original-wrap">
      <div class="backup-original-card">
        <div class="backup-original-title">📦 Exportar backup completo profissional</div>
        <div class="backup-original-desc">
          Exporta um ZIP profissional com JSONs separados por módulo, manifesto, LEIA-ME e anexos locais quando existirem.
          Mantém caminhos relativos para Supabase/R2 e não salva URL completa.
        </div>
        <button class="btn btn-blue" onclick="Backup.exportZip()">⬇️ Exportar backup ZIP</button>
      </div>

      <div class="backup-original-card">
        <div class="backup-original-title">📥 Importar / Restaurar</div>
        <div class="backup-original-desc">
          Aceita backup novo em <strong>.zip</strong> e backups antigos em <strong>.json</strong>.
          Ao substituir, o sistema gera um backup automático de segurança antes.
        </div>

        <label class="backup-radio-line">
          <input type="radio" name="backup-modo" value="merge" checked>
          <span><strong>Mesclar com dados atuais</strong> <em>Recomendado</em><br>
          Mantém os dados atuais e adiciona/atualiza dados do backup.</span>
        </label>

        <label class="backup-radio-line">
          <input type="radio" name="backup-modo" value="replace">
          <span><strong>Substituir módulos selecionados</strong><br>
          Antes de substituir, o sistema gera um backup automático do estado atual.</span>
        </label>

        <div class="backup-original-title" style="font-size:16px;margin-top:14px;">▾ Selecionar módulos para restaurar</div>
        <div class="backup-modulos-grid">
          ${[
            ['pacientes','pacientes'],
            ['consultas','consultas'],
            ['prontuarios','prontuários'],
            ['receitas','receitas'],
            ['atestados','atestados'],
            ['laudos','laudos'],
            ['pedidosExames','pedidos exames'],
            ['examesAnexos','exames anexos'],
            ['procedimentos','sinais vitais/procedimentos'],
            ['agenda','agenda/fila'],
            ['financeiro','financeiro'],
            ['usuarios','usuários'],
            ['profissionais','profissionais'],
            ['auditoria','auditoria'],
            ['configuracoes','configurações']
          ].map(([v,l])=>`<label><input type="checkbox" name="backup-modulo" value="${v}" checked> ${l}</label>`).join('')}
        </div>

        <button class="btn btn-green" onclick="document.getElementById('backup-import-file')?.click()">⬆️ Importar backup</button>
        <input id="backup-import-file" class="backup-hidden-input" type="file" accept=".zip,.json,application/json,application/zip" onchange="Backup.importBackup(event)">
      </div>
    </div>`;
  };

  Backup.render = function(){
    const el=document.getElementById('content');
    if(!el) return;
    el.innerHTML=`<div class="card">
      <h3>Backup / Importação</h3>
      <p style="color:#64748b;margin-top:4px">Exportar backup completo e restaurar dados do sistema.</p>
      ${this.html()}
    </div>`;
  };

  Backup.modal = function(){
    Modal.open('💾 Backup / Importação',this.html(),`<button class="btn btn-ghost" onclick="Modal.close()">Fechar</button>`,'lg');
  };
})();




/* =========================================================
   ZERO V8.8 — Setinha Selecionar módulos funciona
========================================================= */
(function(){
  if(!window.Backup || Backup.__toggleModulosV88) return;
  Backup.__toggleModulosV88=true;

  Backup.toggleModulos = function(){
    const grid=document.getElementById('backup-modulos-grid');
    const arrow=document.getElementById('backup-modulos-arrow');
    if(!grid) return;

    const collapsed=grid.classList.toggle('is-collapsed');
    if(arrow) arrow.textContent=collapsed?'▸':'▾';
  };

  const oldHtml=Backup.html?.bind(Backup);
  if(oldHtml){
    Backup.html=function(){
      let html=oldHtml();

      // Se já tem id, não duplica.
      if(!html.includes('backup-modulos-grid')){
        html=html.replace('class="backup-modulos-grid"', 'id="backup-modulos-grid" class="backup-modulos-grid"');
      }

      // Corrige o título para ser clicável.
      html=html.replace(
        /<div class="backup-original-title" style="font-size:16px;margin-top:14px;">▾ Selecionar módulos para restaurar<\/div>/,
        '<div class="backup-original-title backup-toggle-v88" style="font-size:16px;margin-top:14px;" onclick="Backup.toggleModulos()"><span id="backup-modulos-arrow">▾</span> Selecionar módulos para restaurar</div>'
      );

      // Caso a versão tenha título sem style.
      html=html.replace(
        /<div class="backup-original-title">▾ Selecionar módulos para restaurar<\/div>/,
        '<div class="backup-original-title backup-toggle-v88" onclick="Backup.toggleModulos()"><span id="backup-modulos-arrow">▾</span> Selecionar módulos para restaurar</div>'
      );

      // Se ainda não colocou id na grid, coloca.
      html=html.replace('class="backup-modulos-grid"', 'id="backup-modulos-grid" class="backup-modulos-grid"');

      return html;
    };
  }

  const oldRender=Backup.render?.bind(Backup);
  if(oldRender){
    Backup.render=function(){
      const ret=oldRender();
      setTimeout(()=>{
        const title=[...document.querySelectorAll('.backup-original-title')].find(x=>(x.innerText||'').includes('Selecionar módulos'));
        const grid=document.querySelector('.backup-modulos-grid');
        if(title && grid){
          title.classList.add('backup-toggle-v88');
          title.onclick=()=>Backup.toggleModulos();
          if(!grid.id) grid.id='backup-modulos-grid';
          if(!document.getElementById('backup-modulos-arrow')){
            title.innerHTML='<span id="backup-modulos-arrow">▾</span> Selecionar módulos para restaurar';
          }
        }
      },30);
      return ret;
    };
  }
})();
