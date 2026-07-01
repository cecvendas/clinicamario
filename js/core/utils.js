window.Utils={
  esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')},
  id(prefix='ID'){return prefix+Date.now()+Math.random().toString(36).slice(2,7).toUpperCase()},
  today(){const d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()},
  norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()},
  clone(o){try{return JSON.parse(JSON.stringify(o))}catch(e){return o}},
  money(v){
    const n=Number(String(v??0).replace(/[^0-9,-]/g,'').replace('\.','').replace(',','.'))||0;
    return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  },
  toast(msg){const root=document.getElementById('toast-root');if(!root)return;const el=document.createElement('div');el.className='toast';el.textContent=msg;root.appendChild(el);setTimeout(()=>el.remove(),3200)}
};