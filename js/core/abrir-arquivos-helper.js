/* ZERO V8.2 — abrir arquivos sempre via gerarUrl(caminho) */
(function(){
 document.addEventListener('click',function(ev){
  const el=ev.target.closest('[data-caminho],[data-arquivo-caminho]');
  if(!el)return;
  const caminho=el.getAttribute('data-caminho')||el.getAttribute('data-arquivo-caminho');
  if(caminho&&window.abrirArquivo){ev.preventDefault();abrirArquivo(caminho);}
 },true);
})();
