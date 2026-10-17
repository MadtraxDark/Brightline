async page => {
  const check = (ok, text) => { if (!ok) throw new Error(text); };
  const tab = () => page.locator(".nav-active-indicator");
  const settle = (section) => page.waitForFunction((value) => {
    const nav = document.querySelector(".sidebar-scroll");
    return nav?.dataset.highlight === value && nav?.dataset.phase === "idle";
  }, section);

  await page.goto("http://localhost:5173/home");
  await page.waitForFunction(() => document.querySelector("#login-email") || document.querySelector(".sidebar-scroll"));
  if (new URL(page.url()).pathname === "/login") {
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("demo@example.test");
    await page.getByLabel("Senha", { exact: true }).fill("demo-motion");
    await page.getByRole("button", { name: "Entrar no Brightline" }).click();
    await page.waitForURL(/\/home/);
  }

  async function setCollapsed(collapsed) {
    const expand = page.getByRole("button", { name: "Expandir menu", exact: true });
    const collapse = page.getByRole("button", { name: "Recolher menu", exact: true });
    if (collapsed && await collapse.isVisible()) await collapse.click();
    if (!collapsed && await expand.isVisible()) await expand.click();
    await page.waitForTimeout(200);
  }

  async function readTab() {
    return page.evaluate(() => {
      const ind = document.querySelector(".nav-active-indicator");
      const side = document.querySelector(".sidebar");
      const scroll = document.querySelector(".sidebar-scroll");
      const svg = ind.querySelector("svg");
      const ir = ind.getBoundingClientRect();
      const sr = side.getBoundingClientRect();
      const link = scroll.querySelector(`a[data-section="${scroll.dataset.highlight}"]`);
      const color = link ? getComputedStyle(link).color : "";
      const overflows = [];
      let node = ind.parentElement;
      while (node) {
        const style = getComputedStyle(node);
        if (style.overflowX !== "visible") overflows.push(`${node.className || node.tagName} ${style.overflowX}`);
        node = node.parentElement;
      }
      const channel = (value) => {
        const x = value / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      const lum = (rgb) => {
        const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number);
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const fg = lum(color || "rgb(0, 0, 0)");
      const bg = lum("rgb(255, 255, 255)");
      const contrast = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      const matrix = new DOMMatrixReadOnly(getComputedStyle(ind).transform);
      return {
        tabRight: Math.round(ir.right * 10) / 10,
        sideRight: Math.round(sr.right * 10) / 10,
        delta: Math.round((ir.right - sr.right) * 10) / 10,
        y: Math.round(matrix.m42 * 10) / 10,
        svg: getComputedStyle(svg).display,
        overflows,
        color,
        contrast: Math.round(contrast * 100) / 100,
        highlight: scroll.dataset.highlight,
        scrollGap: scroll.scrollHeight - scroll.clientHeight,
        sideGap: side.scrollHeight - side.clientHeight,
      };
    });
  }

  const routes = [
    ["Visão geral", "0"],
    ["Não sinalizados", "1"],
    ["Avaliação da IA", "2"],
  ];

  async function visitAll(label) {
    let previous = await tab().elementHandle();
    let previousY = null;
    for (const [name, section] of routes) {
      const before = await tab().elementHandle();
      const beforeRead = await readTab();
      await page.getByRole("link", { name: new RegExp(name) }).first().click();
      await settle(section);
      const after = await readTab();
      const same = await page.evaluate((el) => el === document.querySelector(".nav-active-indicator"), before);
      console.log(`${label} ${name}: aba ${after.tabRight}px, sidebar ${after.sideRight}px, diferença ${after.delta}px`);
      check(after.delta >= 0 && after.delta <= 1, `${label} ${name}: borda da aba fora da tolerância (${after.delta})`);
      check(same, `${label} ${name}: a aba foi remontada`);
      if (previousY !== null && beforeRead.highlight !== section) check(after.y !== previousY, `${label} ${name}: o Y não mudou`);
      previousY = after.y;
      previous = before;
      check(after.svg !== "none", `${label}: SVG das curvas oculto`);
      check(after.overflows.length === 0, `${label}: ancestral com overflow horizontal (${after.overflows.join(", ")})`);
    }
    return previous;
  }

  for (const height of [720, 620]) {
    await page.setViewportSize({ width: 1280, height });
    await setCollapsed(false);
    await page.getByRole("link", { name: /Visão geral/ }).first().click();
    await settle("0");
    await visitAll(`expandida ${height}`);
    await page.getByRole("link", { name: /Visão geral/ }).first().click();
    await settle("0");
    const home = await readTab();
    const node = await tab().elementHandle();
    await page.getByRole("link", { name: /Crítico/ }).first().click();
    await page.waitForURL(/prioridade=critical/);
    await page.waitForTimeout(300);
    const filtered = await readTab();
    const sameFilter = await page.evaluate((el) => el === document.querySelector(".nav-active-indicator"), node);
    console.log(`filtro ${height}: Y ${home.y} -> ${filtered.y}, contraste ${filtered.contrast}:1, cor ${filtered.color}`);
    check(sameFilter && home.y === filtered.y && filtered.highlight === "0", `filtro ${height} moveu a aba`);
    check(filtered.contrast >= 4.5, `contraste ${filtered.contrast} abaixo de 4,5`);
    check(filtered.scrollGap <= 1 && filtered.sideGap <= 1, `sidebar ${height} rolou (${filtered.scrollGap}/${filtered.sideGap})`);
    await page.getByRole("link", { name: /Visão geral/ }).first().click();
    await settle("0");
    await page.screenshot({ path: `artifacts/ui/tab-expandida-${height}.png` });
    await setCollapsed(true);
    await page.getByRole("link", { name: /Visão geral/ }).first().click();
    await settle("0");
    await visitAll(`recolhida ${height}`);
    const collapsed = await readTab();
    check(collapsed.scrollGap <= 1, `sidebar recolhida ${height} rolou`);
    const shortcuts = await page.locator(".sidebar-priority a").count();
    check(shortcuts === 4, `atalhos recolhidos: ${shortcuts}`);
    await page.getByRole("link", { name: /Visão geral/ }).first().click();
    await settle("0");
    await page.screenshot({ path: `artifacts/ui/tab-recolhida-${height}.png` });
    await setCollapsed(false);
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("link", { name: /Visão geral/ }).first().click();
  await settle("0");
  const frames = await page.evaluate(async () => {
    const nav = document.querySelector(".sidebar-scroll");
    const indicator = nav.querySelector(".nav-active-indicator");
    const link = [...nav.querySelectorAll("a")].find((item) => (item.getAttribute("aria-label") || item.textContent).includes("Não sinalizados"));
    const samples = [];
    let sawMotion = false;
    const done = (async () => {
      for (let i = 0; i < 120; i += 1) {
        await new Promise(requestAnimationFrame);
        const matrix = new DOMMatrixReadOnly(getComputedStyle(indicator).transform);
        samples.push({ phase: nav.dataset.phase, x: matrix.m41, y: matrix.m42 });
        if (nav.dataset.phase !== "idle") sawMotion = true;
        if (sawMotion && nav.dataset.phase === "idle") break;
      }
      return samples;
    })();
    link.click();
    return done;
  });
  check(frames.some((frame) => frame.phase === "closing" && frame.x > 0), "Destaque recolhe para a main");
  check(frames.some((frame) => frame.phase === "opening" && frame.x > 0), "Destaque reabre na nova seção");
  await settle("1");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: /Avaliação da IA/ }).first().click();
  await settle("2");
  check(await tab().evaluate((el) => el.getAnimations().length) === 0, "Movimento reduzido sem animação");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await settle("2");
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Sem overflow mobile");
  await page.screenshot({ path: "artifacts/ui/navigation-merge-mobile.png" });
  console.log("PASS: aba na borda, mesmo nó, filtro parado, contraste, curvas e movimento.");
};
