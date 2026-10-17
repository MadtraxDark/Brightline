async page => {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  await page.goto('http://localhost:5173/login');
  const email = page.getByRole('textbox', { name: 'E-mail', exact: true });
  await email.waitFor();
  const password = page.getByLabel('Senha', {exact: true});
  const submit = page.getByRole('button', { name: 'Entrar no Brightline', exact: true });
  await submit.click();
  await page.getByText('Informe um e-mail válido.', {exact: true}).waitFor();
  check(await email.evaluate(el => el === document.activeElement), 'E-mail inválido deve receber foco');
  await email.fill('demonstracao@brightline.test');
  await submit.click();
  await page.getByText('Informe a senha.', {exact: true}).waitFor();
  check(await password.evaluate(el => el === document.activeElement), 'Senha vazia deve receber foco');
  await password.fill('senha-de-demonstracao');
  await page.getByRole('button', {name:'Mostrar senha',exact:true}).click();
  check(await password.getAttribute('type') === 'text', 'Mostrar senha');
  await page.getByRole('button', {name:'Ocultar senha',exact:true}).click();
  check(await password.getAttribute('type') === 'password', 'Ocultar senha');
  await page.goto('http://localhost:5173/nao-sinalizados');
  await page.waitForURL('**/login');
  await email.fill('demonstracao@brightline.test');
  await password.fill('senha-de-demonstracao');
  await password.press('Enter');
  await page.waitForURL('**/nao-sinalizados');
  await page.getByRole('button', {name:'Menu de perfil',exact:true}).click();
 await page.getByRole('menuitem', {name:'Sair',exact:true}).click();
  await page.waitForURL('**/login');
  for (const width of [1440,1024,390]) {
    await page.setViewportSize({width,height:900});
    await email.waitFor();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow em ${width}`);
    check(await submit.isVisible(), `Acesso ausente em ${width}`);
    await page.screenshot({path:`artifacts/ui/login-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:900});
  console.log('PASS: validação, foco, mostrar/ocultar senha, login via teclado, redirecionamento, saída e layout em 1440/1024/390px.');
}
