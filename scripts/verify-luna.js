async page => {
  const { readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const check = (ok, label, detail = "") => {
    console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
    if (!ok) throw new Error(label);
  };
  const box = (locator) => locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  });
  const near = (value, expected) => Math.abs(value - expected) <= 1;

  async function login() {
    await page.goto("http://localhost:5173/login");
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("demo@example.test");
    await page.getByLabel("Senha", { exact: true }).fill("demo-motion");
    await page.getByRole("button", { name: "Entrar no Brightline" }).click();
    await page.waitForURL(/\/home/);
  }

  await page.goto("http://localhost:5173/login");
  check(await page.locator(".luna").count() === 0, "ausente no login");
  await page.goto("http://localhost:5173/cadastro");
  check(await page.locator(".luna").count() === 0, "ausente no cadastro");

  await login();
  const routes = ["/home", "/caso/R-001-1", "/nao-sinalizados", "/avaliacao"];
  for (const route of routes) {
    await page.goto(`http://localhost:5173${route}`);
    await page.locator(".luna-button").waitFor();
    check(await page.locator(".luna").count() === 1, `presente em ${route}`);
  }

  const sizes = [];
  for (const [width, height] of [[1280, 720], [1280, 620]]) {
    await page.setViewportSize({ width, height });
    for (const collapsed of [false, true]) {
      await page.goto("http://localhost:5173/home");
      await page.locator(".luna-button").waitFor();
      const collapse = page.getByRole("button", { name: /Recolher menu|Expandir menu/ });
      const expanded = (await collapse.getAttribute("aria-label")) === "Recolher menu";
      if (expanded === collapsed) await collapse.click();
      const button = await box(page.locator(".luna-button"));
      const right = width - button.right;
      const bottom = height - button.bottom;
      sizes.push({ width, height, collapsed, right, bottom, w: button.width, h: button.height });
      console.log(`medida ${width}x${height} ${collapsed ? "recolhida" : "expandida"} ${button.width.toFixed(1)}x${button.height.toFixed(1)} right ${right.toFixed(1)} bottom ${bottom.toFixed(1)}`);
      check(near(button.width, 56) && near(button.height, 56), "botão 56×56");
      check(near(right, 24) && near(bottom, 24), "distância 24px");
    }
  }
  const first = sizes[0];
  check(sizes.every((entry) => near(entry.right, first.right) && near(entry.bottom, first.bottom)), "posição independente da sidebar");

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://localhost:5173/home");
  const button = page.locator(".luna-button");
  await button.click();
  const panel = page.locator("#luna-panel");
  check(await panel.isVisible(), "painel abre");
  check((await panel.innerText()).includes("Assistente de IA do Brightline. Em breve."), "texto exato");
  check(await button.evaluate((node) => document.activeElement === node), "foco permanece no botão ao abrir");
  await page.screenshot({ path: "artifacts/ui/luna-aberta.png" });
  await page.keyboard.press("Escape");
  check(await panel.getAttribute("hidden") !== null, "Esc fecha");
  check(await button.evaluate((node) => document.activeElement === node), "foco permanece no botão ao fechar");
  await button.click();
  await page.locator(".workspace-footer").click({ position: { x: 8, y: 8 } });
  check(await panel.getAttribute("hidden") !== null, "clique fora fecha");
  await page.screenshot({ path: "artifacts/ui/luna-fechada.png" });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const footer = await box(page.locator(".workspace-footer"));
  const luna = await box(button);
  const overlaps = luna.left < footer.right && luna.right > footer.left && luna.top < footer.bottom && luna.bottom > footer.top;
  console.log(`footer ${footer.top.toFixed(0)}–${footer.bottom.toFixed(0)} luna ${luna.top.toFixed(0)}–${luna.bottom.toFixed(0)}`);
  check(!overlaps, "rodapé livre no fim da rolagem");
  await page.screenshot({ path: "artifacts/ui/luna-fim-da-pagina.png" });

  await page.setViewportSize({ width: 1280, height: 620 });
  await page.goto("http://localhost:5173/home");
  await page.getByRole("button", { name: /Relógio da demonstração/ }).click();
  const clock = page.locator(".demo-clock-panel");
  await clock.waitFor();
  const hit = await page.evaluate(() => {
    const panel = document.querySelector(".demo-clock-panel");
    const rect = panel.getBoundingClientRect();
    const node = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { panel: panel.contains(node), luna: Boolean(node?.closest(".luna")) };
  });
  check(hit.panel && !hit.luna, "painel do relógio acima da Luna");
  console.log("z-index luna 25, relógio 40, menu do avatar 30");

  const files = [];
  for (const dir of ["frontend/dist/assets", "dist/assets"]) {
    try {
      for (const name of readdirSync(dir)) {
        if (name.includes("luna")) files.push({ name, bytes: statSync(join(dir, name)).size, dir });
      }
    } catch {}
  }
  check(files.length > 0, "asset da Luna no build");
  for (const file of files) console.log(`asset ${file.dir}/${file.name} ${file.bytes} bytes`);
  const src = await button.getAttribute("src") ?? await page.locator(".luna-button img").getAttribute("src");
  check(src && !/^https?:\/\//i.test(src), "sem URL externa", src);
}
