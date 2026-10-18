async (page) => {
  const data = {
    reports: [
      {
        report_id: "R-001",
        modality: "Radiografia de tórax",
        radiologist: "Dra. Ana Luz",
        ordering_physician: "Dr. Paulo Mendes",
        text: "Radiografia de tórax em inspiração. Há pneumotórax hipertensivo à direita, com desvio do mediastino para a esquerda. O pulmão esquerdo está expandido.",
        flagged_by_radiologist: false,
        ground_truth: [
          { finding: "Pneumotórax hipertensivo", urgency: "critical" },
        ],
        patient: {
          name: "M. S. Andrade",
          age: 54,
          sex: "F",
          record: "PR-10441",
        },
        location: "Pronto-socorro",
        indication: "Dor torácica súbita e falta de ar",
      },
      {
        report_id: "R-002",
        modality: "TC de crânio",
        radiologist: "Dr. Caio Ribeiro",
        ordering_physician: "Dra. Marina Lopes",
        text: "TC de crânio sem contraste. Hiperdensidade nos sulcos da convexidade, compatível com hemorragia subaracnóidea aguda. Ventrículos de tamanho habitual.",
        flagged_by_radiologist: false,
        ground_truth: [
          { finding: "Hemorragia subaracnóidea aguda", urgency: "critical" },
        ],
        patient: {
          name: "A. P. Nogueira",
          age: 67,
          sex: "M",
          record: "PR-20817",
        },
        location: "Pronto-socorro",
        indication: "Cefaleia súbita intensa",
      },
      {
        report_id: "R-003",
        modality: "TC de abdome",
        radiologist: "Dra. Ana Luz",
        ordering_physician: "Dra. Helena Costa",
        text: "TC de abdome com contraste. Apêndice dilatado, com borramento da gordura adjacente, compatível com apendicite aguda. Não há coleção organizada.",
        flagged_by_radiologist: false,
        ground_truth: [{ finding: "Apendicite aguda", urgency: "urgent" }],
        patient: {
          name: "L. F. Carvalho",
          age: 19,
          sex: "M",
          record: "PR-33002",
        },
        location: "Pronto-socorro",
        indication: "Dor abdominal aguda",
      },
      {
        report_id: "R-004",
        modality: "Radiografia de tórax",
        radiologist: "Dr. Caio Ribeiro",
        ordering_physician: "Dr. Paulo Mendes",
        text: "Radiografia de tórax. Derrame pleural volumoso à esquerda, com opacificação da base. O mediastino está centrado.",
        flagged_by_radiologist: true,
        ground_truth: [
          { finding: "Derrame pleural volumoso", urgency: "urgent" },
        ],
        patient: {
          name: "C. R. Bittencourt",
          age: 72,
          sex: "F",
          record: "PR-44190",
        },
        location: "Internado",
        indication: "Dispneia progressiva",
      },
      {
        report_id: "R-005",
        modality: "TC de tórax",
        radiologist: "Dra. Ana Luz",
        ordering_physician: "Dra. Marina Lopes",
        text: "TC de tórax. Nódulo pulmonar suspeito no lobo superior direito, de contornos espiculados, medindo 1,8 cm. Sem linfonodomegalia.",
        flagged_by_radiologist: true,
        ground_truth: [
          { finding: "Nódulo pulmonar suspeito", urgency: "actionable" },
        ],
        patient: {
          name: "E. V. Martins",
          age: 61,
          sex: "M",
          record: "PR-55214",
        },
        location: "Ambulatório",
        indication: "Tosse persistente",
      },
      {
        report_id: "R-006",
        modality: "TC de abdome",
        radiologist: "Dr. Caio Ribeiro",
        ordering_physician: "Dra. Helena Costa",
        text: "TC de abdome. Massa renal indeterminada no polo superior do rim esquerdo, medindo 3,2 cm. A via excretora não está dilatada.",
        flagged_by_radiologist: true,
        ground_truth: [
          { finding: "Massa renal indeterminada", urgency: "actionable" },
        ],
        patient: {
          name: "S. D. Pacheco",
          age: 58,
          sex: "F",
          record: "PR-66308",
        },
        location: "Ambulatório",
        indication: "Achado incidental em exame de abdome",
      },
      {
        report_id: "R-007",
        modality: "Ultrassom de abdome",
        radiologist: "Dra. Ana Luz",
        ordering_physician: "Dr. Paulo Mendes",
        text: "Ultrassom de abdome total. Fígado, vias biliares, pâncreas, baço e rins sem alterações. Não há líquido livre.",
        flagged_by_radiologist: true,
        ground_truth: [],
        patient: { name: "I. G. Teles", age: 34, sex: "F", record: "PR-77421" },
        location: "Ambulatório",
        indication: "Dor abdominal leve",
      },
      {
        report_id: "R-008",
        modality: "TC de crânio",
        radiologist: "Dr. Caio Ribeiro",
        ordering_physician: "Dra. Marina Lopes",
        text: "TC de crânio sem contraste. Exame sem sinais de hemorragia, sem efeito de massa e sem desvio da linha média.",
        flagged_by_radiologist: true,
        ground_truth: [],
        patient: {
          name: "R. H. Queiroz",
          age: 45,
          sex: "M",
          record: "PR-88563",
        },
        location: "Pronto-socorro",
        indication: "Trauma craniano leve",
      },
    ],
    cases: [
      {
        finding: "Derrame pleural volumoso",
        evidence: "Derrame pleural volumoso à esquerda",
        urgency: "urgent",
        deadline_hours: 24,
        confidence: "high",
        confidence_percent: 91,
        confidence_is_example: true,
        id: "R-004-1",
        report_id: "R-004",
        status: "notified",
        escalation_level: 0,
        deadline_at: 24,
        notified_at: 0,
        events: [{ at: 0, label: "Laudo disponível para revisão" }],
        modality: "Radiografia de tórax",
        text: "Radiografia de tórax. Derrame pleural volumoso à esquerda, com opacificação da base. O mediastino está centrado.",
        radiologist: "Dr. Caio Ribeiro",
        ordering_physician: "Dr. Paulo Mendes",
        flagged_by_radiologist: true,
      },
      {
        finding: "Pneumotórax hipertensivo",
        evidence:
          "pneumotórax hipertensivo à direita, com desvio do mediastino",
        urgency: "critical",
        deadline_hours: 1,
        confidence: "high",
        confidence_percent: 96,
        confidence_is_example: true,
        id: "R-001-1",
        report_id: "R-001",
        status: "closed",
        escalation_level: 0,
        deadline_at: 1,
        notified_at: 0,
        events: [{ at: 0, label: "Laudo disponível para revisão" }],
        modality: "Radiografia de tórax",
        text: "Radiografia de tórax em inspiração. Há pneumotórax hipertensivo à direita, com desvio do mediastino para a esquerda. O pulmão esquerdo está expandido.",
        radiologist: "Dra. Ana Luz",
        ordering_physician: "Dr. Paulo Mendes",
        flagged_by_radiologist: false,
      },
      {
        finding: "Hemorragia subaracnóidea aguda",
        evidence: "hemorragia subaracnóidea aguda",
        urgency: "critical",
        deadline_hours: 1,
        confidence: "high",
        confidence_percent: 94,
        confidence_is_example: true,
        id: "R-002-1",
        report_id: "R-002",
        status: "closed",
        escalation_level: 0,
        deadline_at: 1,
        notified_at: 0,
        events: [{ at: 0, label: "Laudo disponível para revisão" }],
        modality: "TC de crânio",
        text: "TC de crânio sem contraste. Hiperdensidade nos sulcos da convexidade, compatível com hemorragia subaracnóidea aguda. Ventrículos de tamanho habitual.",
        radiologist: "Dr. Caio Ribeiro",
        ordering_physician: "Dra. Marina Lopes",
        flagged_by_radiologist: false,
      },
      {
        finding: "Apendicite aguda",
        evidence: "compatível com apendicite aguda",
        urgency: "urgent",
        deadline_hours: 24,
        confidence: "medium",
        confidence_percent: 76,
        confidence_is_example: true,
        id: "R-003-1",
        report_id: "R-003",
        status: "notified",
        escalation_level: 0,
        deadline_at: 24,
        notified_at: 0,
        events: [{ at: 0, label: "Laudo disponível para revisão" }],
        modality: "TC de abdome",
        text: "TC de abdome com contraste. Apêndice dilatado, com borramento da gordura adjacente, compatível com apendicite aguda. Não há coleção organizada.",
        radiologist: "Dra. Ana Luz",
        ordering_physician: "Dra. Helena Costa",
        flagged_by_radiologist: false,
      },
      {
        finding: "Nódulo pulmonar suspeito",
        evidence: "Nódulo pulmonar suspeito no lobo superior direito",
        urgency: "actionable",
        deadline_hours: 720,
        confidence: "medium",
        confidence_percent: 68,
        confidence_is_example: true,
        id: "R-005-1",
        report_id: "R-005",
        status: "notified",
        escalation_level: 0,
        deadline_at: 720,
        notified_at: 0,
        events: [{ at: 0, label: "Laudo disponível para revisão" }],
        modality: "TC de tórax",
        text: "TC de tórax. Nódulo pulmonar suspeito no lobo superior direito, de contornos espiculados, medindo 1,8 cm. Sem linfonodomegalia.",
        radiologist: "Dra. Ana Luz",
        ordering_physician: "Dra. Marina Lopes",
        flagged_by_radiologist: true,
      },
      {
        finding: "Massa renal indeterminada",
        evidence: "Massa renal indeterminada no polo superior do rim esquerdo",
        urgency: "actionable",
        deadline_hours: 720,
        confidence: "low",
        confidence_percent: 58,
        confidence_is_example: true,
        id: "R-006-1",
        report_id: "R-006",
        status: "notified",
        escalation_level: 0,
        deadline_at: 720,
        notified_at: 0,
        events: [{ at: 0, label: "Laudo disponível para revisão" }],
        modality: "TC de abdome",
        text: "TC de abdome. Massa renal indeterminada no polo superior do rim esquerdo, medindo 3,2 cm. A via excretora não está dilatada.",
        radiologist: "Dr. Caio Ribeiro",
        ordering_physician: "Dra. Helena Costa",
        flagged_by_radiologist: true,
      },
    ],
    sim_now: 0,
  };
  const user = {
    id: "preview",
    name: "Bruno Souza",
    institutions: ["preview"],
    active_institution_id: "preview",
  };
  await page.addInitScript(
    (user) =>
      sessionStorage.setItem(
        "brightline:session",
        JSON.stringify({
          access_token: "preview",
          refresh_token: "preview",
          user,
        }),
      ),
    user,
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      json: path.endsWith("/workspace")
        ? data
        : path.endsWith("/auth/me")
          ? user
          : path.endsWith("/institutions")
            ? [{ id: "preview", name: "Instituição ilustrativa" }]
            : {},
    });
  });
  await page.setViewportSize({ width: 517, height: 884 });
  await page.goto("http://localhost:5173/home");
  await page.locator(".clinical-case").first().waitFor();
  await page.waitForTimeout(300);
  await page.addStyleTag({
    content:
      "*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}",
  });
  await page.screenshot({
    path: "frontend/public/images/landing-overview-mobile.png",
  });
  await page.setViewportSize({ width: 1534, height: 883 });
  await page.goto("http://localhost:5173/caso/R-004-1");
  await page.locator(".report-document").waitFor();
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    window.scrollTo(
      0,
      document.querySelector(".report-reading-layout").getBoundingClientRect()
        .top +
        scrollY -
        126,
    ),
  );
  await page.screenshot({
    path: "frontend/public/images/landing-report-desktop.png",
  });
  return {
    mobile: "landing-overview-mobile.png",
    desktop: "landing-report-desktop.png",
  };
};
