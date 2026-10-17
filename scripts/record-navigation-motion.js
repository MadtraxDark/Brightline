async (page) => {
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  for (const [name, section] of [
    ["Não sinalizados", "1"],
    ["Avaliação da IA", "2"],
    ["Visão geral", "0"],
    ["Avaliação da IA", "2"],
    ["Visão geral", "0"],
  ]) {
    await nav.getByRole("link", { name: new RegExp(name) }).click();
    await page
      .locator(
        `.sidebar-primary[data-active="${section}"][data-highlight="${section}"][data-phase="idle"]`,
      )
      .waitFor();
  }
};
