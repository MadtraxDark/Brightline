async page => {
 const check = (ok, text) => { if (!ok) throw new Error(text); };
 await page.goto('http://localhost:5173/');
 await page.waitForFunction(() => document.querySelector('#login-email') || document.querySelector('.sidebar-primary'));
 if (new URL(page.url()).pathname === '/login') {
   await page.getByRole('textbox',{name:'E-mail',exact:true}).fill('demo@example.test');
   await page.getByLabel('Senha',{exact:true}).fill('demo-motion');
   await page.getByRole('button',{name:'Entrar no Brightline'}).click();
 }
 const nav = page.getByRole('navigation',{name:'Navegação principal'});
 const settle = async (section) => page.locator(`.sidebar-primary[data-active="${section}"][data-highlight="${section}"][data-phase="idle"]`).waitFor();
 const aligned = async () => page.locator('.sidebar-primary').evaluate(nav => {
   const marker = nav.querySelector('.nav-active-indicator').getBoundingClientRect();
   const row = nav.querySelector('a[aria-current="page"], a.is-current-section')?.getBoundingClientRect();
   return row && Math.abs(marker.top-row.top) < 1 && Math.abs(marker.left-row.left) < 1;
 });
 await nav.waitFor();
 await page.setViewportSize({width:1481,height:884});
 await settle("0");
 await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
 await nav.getByRole('link',{name:/Não sinalizados/}).click();
 const frames = await nav.evaluate(async nav => {
   const indicator = nav.querySelector('.nav-active-indicator');
   const samples = [];
   for(let i=0;i<80;i++) {
     await new Promise(requestAnimationFrame);
     const matrix = new DOMMatrixReadOnly(getComputedStyle(indicator).transform);
     samples.push({phase:nav.dataset.phase,x:matrix.m41,y:matrix.m42});
     if(nav.dataset.phase==='idle') break;
   }
   return samples;
 });
 check(frames.some(f => f.phase==='closing' && f.x>0), 'Destaque recolhe para a main');
 check(frames.some(f => f.phase==='opening' && f.x>0), 'Destaque reabre na nova seção');
 await settle("1");
 check(await aligned(), 'Posição final correta');
 for (const name of ['Avaliação da IA','Visão geral','Não sinalizados']) await nav.getByRole('link',{name:new RegExp(name)}).click();
 await settle("1");
 check(await aligned(), 'Cliques rápidos não deixam animação pendente');
 await page.screenshot({path:'artifacts/ui/navigation-merge-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Menu de perfil',exact:true}).click();
 await page.getByRole('menuitem',{name:'Configurações',exact:true}).click();
 await settle("none");
 check(await page.locator('.nav-active-indicator').evaluate(el => getComputedStyle(el).opacity)==='0', 'Configurações recolhe destaque');
 await page.emulateMedia({reducedMotion:'reduce'});
 await nav.getByRole('link',{name:/Não sinalizados/}).click();
 await settle("1");
 check(await page.locator('.nav-active-indicator').evaluate(el => el.getAnimations().length)===0, 'Movimento reduzido sem animação');
 check(await aligned(), 'Movimento reduzido mantém seleção');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:900});
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
 await settle("1");
 check(await aligned(), 'Menu mobile mantém alinhamento');
 check(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth), 'Sem overflow mobile');
 await page.screenshot({path:'artifacts/ui/navigation-merge-mobile.png',fullPage:true});
 await nav.getByRole('link',{name:'Avaliação da IA',exact:true}).click();
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
 await settle("2");
 check(await aligned(), 'Reabrir menu mobile seleciona destino certo');
 await page.getByRole('button',{name:'Fechar menu',exact:true}).click();
 await page.setViewportSize({width:1481,height:884});
 await nav.getByRole('link',{name:'Visão geral',exact:true}).click();
 await settle("0");
 console.log('PASS: recolher → reposicionar oculto → reabrir; cliques rápidos; movimento reduzido; configurações; mobile.');
}
