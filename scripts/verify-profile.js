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
    await page.getByLabel("Senha", { exact: true }).fill("demo-profile");
    await page.getByRole("button", { name: "Entrar no Brightline" }).click();
  }
  const trigger = page.getByRole("button", {
    name: "Menu de perfil",
    exact: true,
  });
  await trigger.waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  check(
    (await page
      .locator(".sidebar")
      .getByText("Sair", { exact: true })
      .count()) === 0,
    "Saída foi movida para o perfil",
  );
  await trigger.click();
  await page.getByRole("menu", { name: "Opções do perfil" }).waitFor();
  await page.keyboard.press("ArrowDown");
  check(
    await page
      .getByRole("menuitem", { name: "Sair", exact: true })
      .evaluate((el) => el === document.activeElement),
    "Teclado navega pelo menu",
  );
  await page.keyboard.press("Escape");
  check(
    await trigger.evaluate((el) => el === document.activeElement),
    "Escape retorna foco",
  );
  await trigger.click();
  await page.getByRole("heading", { name: "Visão geral", exact: true }).click();
  check((await page.getByRole("menu").count()) === 0, "Clique fora fecha");
  await trigger.click();
  await page
    .getByRole("menuitem", { name: "Configurações", exact: true })
    .click();
  await page.waitForURL("**/configuracoes");
  const file = page.getByLabel("Foto de perfil", { exact: true });
  await file.setInputFiles({
    name: "invalido.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not image"),
  });
  await page.getByRole("alert").waitFor();
  await file.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("img", { name: "Prévia da foto de perfil" }).waitFor();
  await page
    .getByRole("textbox", { name: "Nome de exibição", exact: true })
    .fill("Perfil de demonstração");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page
    .getByText("Perfil atualizado nesta sessão.", { exact: true })
    .waitFor();
  await page.reload();
  await trigger.waitFor();
  check(
    (await page.locator(".profile-trigger img").count()) === 1,
    "Imagem persiste durante a sessão",
  );
  await trigger.click();
  await page.getByText("Perfil de demonstração", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nome de exibição", exact: true })
    .fill("");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Visão geral", exact: true })
    .click();
  await page.waitForURL("http://localhost:5173/");
  await trigger.click();
  await page.screenshot({
    path: "artifacts/ui/profile-dropdown-desktop.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 900 });
  await trigger.click();
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Sem overflow mobile",
  );
  await page.screenshot({
    path: "artifacts/ui/profile-dropdown-mobile.png",
    fullPage: true,
  });
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page.waitForURL("**/login");
  await page
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill("demo@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("demo-profile");
  await page.getByRole("button", { name: "Entrar no Brightline" }).click();
  await trigger.waitFor();
  check(
    (await page.locator(".profile-trigger img").count()) === 0,
    "Logout limpa a foto da sessão",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await trigger.click();
  console.log(
    "PASS: dropdown, teclado, Escape, clique fora, configurações, upload, validação, persistência de sessão, remoção, mobile e saída.",
  );
};
