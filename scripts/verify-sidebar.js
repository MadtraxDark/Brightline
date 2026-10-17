async (page) => {
  const check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  await page.goto("http://localhost:5173/");
  await page.waitForFunction(
    () =>
      document.querySelector("#login-email") ||
      document.querySelector(".sidebar-primary"),
  );
  if (new URL(page.url()).pathname === "/login") {
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill("demo@example.test");
    await page.getByLabel("Senha", { exact: true }).fill("demo-sidebar");
    await page.getByRole("button", { name: "Entrar no Brightline" }).click();
  }
  await page.waitForURL("http://localhost:5173/");
  await page.setViewportSize({ width: 1440, height: 900 });
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await nav.getByRole("link").first().waitFor();
  check(
    (await nav.getByRole("link").count()) === 3,
    "Três destinos em um único grupo",
  );
  check(
    !(await page.getByRole("button", { name: "+1h", exact: true }).isVisible()),
    "Simulação inicialmente recolhida",
  );
  await nav.getByRole("link", { name: /Não sinalizados/ }).click();
  await page.waitForURL("**/nao-sinalizados");
  await nav
    .locator('a[href="/nao-sinalizados"][aria-current="page"]')
    .waitFor();
  check(
    (await nav
      .getByRole("link", { name: /Não sinalizados/ })
      .getAttribute("aria-current")) === "page",
    "Item ativo da revisão",
  );
  await nav.getByRole("link", { name: "Avaliação da IA", exact: true }).click();
  await page.waitForURL("**/avaliacao");
  await nav.getByRole("link", { name: "Visão geral", exact: true }).click();
  await page.locator(".sidebar-demo summary").focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "+1h", exact: true }).click();
  await page.getByText("Hora simulada: +1h", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Resetar demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar reset", exact: true })
    .click();
  await page.getByText("Hora simulada: +0h", { exact: true }).waitFor();
  await page.locator(".sidebar-demo summary").click();
  await page.screenshot({
    path: "artifacts/ui/navbar-desktop.png",
    fullPage: true,
  });
  await page
    .locator(".sidebar")
    .screenshot({ path: "artifacts/ui/navbar-sidebar.png" });
  await page.setViewportSize({ width: 390, height: 900 });
  check(!(await nav.isVisible()), "Menu mobile inicialmente recolhido");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  check(await nav.isVisible(), "Menu mobile abre");
  check(
    await page
      .getByRole("button", { name: "Menu de perfil", exact: true })
      .isVisible(),
    "Perfil disponível no celular",
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Sem overflow mobile",
  );
  await page.screenshot({
    path: "artifacts/ui/navbar-mobile-open.png",
    fullPage: true,
  });
  await nav.getByRole("link", { name: /Não sinalizados/ }).click();
  await page.waitForURL("**/nao-sinalizados");
  check(!(await nav.isVisible()), "Navegar recolhe menu mobile");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Menu de perfil", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page.waitForURL("**/login");
  await page
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill("demo@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("demo-sidebar");
  await page.getByRole("button", { name: "Entrar no Brightline" }).click();
  await page.waitForURL("http://localhost:5173/");
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log(
    "PASS: links, item ativo, simulação por teclado, relógio, reset, menu mobile e saída.",
  );
};
