async (page) => {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.goto("http://localhost:5173/login");
  await page.getByRole("link", { name: "Criar conta", exact: true }).click();
  await page.waitForURL("**/cadastro");
  const submit = page.getByRole("button", {
    name: "Criar conta de demonstração",
  });
  const name = page.getByRole("textbox", {
    name: "Nome completo",
    exact: true,
  });
  const email = page.getByRole("textbox", { name: "E-mail", exact: true });
  const password = page.getByLabel("Senha", { exact: true });
  const confirmation = page.getByLabel("Confirmar senha", { exact: true });
  await submit.click();
  await page.getByText("Informe seu nome completo.", { exact: true }).waitFor();
  check(
    await name.evaluate((el) => el === document.activeElement),
    "Foco no nome inválido",
  );
  await name.fill("Ana Demonstração");
  await email.fill("ana@example.test");
  await password.fill("senha-demo-123");
  await confirmation.fill("senha-diferente");
  await submit.click();
  await page.getByText("As senhas não coincidem.", { exact: true }).waitFor();
  check(
    await confirmation.evaluate((el) => el === document.activeElement),
    "Foco na confirmação incorreta",
  );
  await confirmation.fill("senha-demo-123");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  check(
    (await password.getAttribute("type")) === "text" &&
      (await confirmation.getAttribute("type")) === "text",
    "Visibilidade das senhas",
  );
  await page
    .getByRole("button", { name: "Ocultar senha", exact: true })
    .click();
  await confirmation.press("Enter");
  await page.waitForURL("http://localhost:5173/");
  await page
    .getByRole("button", { name: "Menu de perfil", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page.waitForURL("**/login");
  await page.getByRole("link", { name: "Criar conta", exact: true }).click();
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/login");
  await page.goto("http://localhost:5173/nao-sinalizados");
  await page.waitForURL("**/login");
  await page.getByRole("link", { name: "Criar conta", exact: true }).click();
  await name.fill("Ana Demonstração");
  await email.fill("ana@example.test");
  await password.fill("senha-demo-123");
  await confirmation.fill("senha-demo-123");
  await submit.click();
  await page.waitForURL("**/nao-sinalizados");
  await page
    .getByRole("button", { name: "Menu de perfil", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page.waitForURL("**/login");
  await page.getByRole("link", { name: "Criar conta", exact: true }).click();
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow em ${width}`,
    );
    await page.screenshot({
      path: `artifacts/ui/cadastro-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log(
    "PASS: navegação login/cadastro, validação, foco, senhas, cadastro de demonstração, saída e redirecionamento.",
  );
};
