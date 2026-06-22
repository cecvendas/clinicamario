/* Clínica Mário — Banner instalar PWA */
(function(){
  if(window.__ClinicaMarioPWAInstall) return;
  window.__ClinicaMarioPWAInstall=true;

  let deferredPrompt=null;

  function ensureBanner(){
    let b=document.getElementById('pwa-install-banner');
    if(b) return b;
    b=document.createElement('div');
    b.id='pwa-install-banner';
    b.className='pwa-install-banner';
    b.innerHTML='<span>Instalar Clínica Mário?</span><button id="pwa-install-btn" type="button">Instalar</button><button class="x" id="pwa-install-close" type="button">×</button>';
    document.body.appendChild(b);

    document.getElementById('pwa-install-btn').onclick=async function(){
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      try{ await deferredPrompt.userChoice; }catch(e){}
      deferredPrompt=null;
      b.style.display='none';
    };
    document.getElementById('pwa-install-close').onclick=function(){
      b.style.display='none';
    };
    return b;
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt=e;
    ensureBanner().style.display='flex';
  });

  window.addEventListener('appinstalled', function(){
    const b=document.getElementById('pwa-install-banner');
    if(b) b.style.display='none';
    deferredPrompt=null;
  });
})();
