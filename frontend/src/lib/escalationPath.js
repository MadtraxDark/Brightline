const STEPS = [
  ["Médico solicitante", "ordering_physician"],
  ["Radiologista que assinou", "radiologist"],
  ["Coordenação de Radiologia", null],
];

const SETTLED = new Set(["read", "action_taken", "closed"]);

export function escalationPath(caso, relatorio) {
  const item = caso ?? {};
  const report = relatorio ?? {};
  const level = Math.min(2, Math.max(0, Number(item.escalation_level) || 0));
  const settled = SETTLED.has(item.status);
  return STEPS.map(([role, field], index) => {
    let state = "Próximo se não houver leitura";
    if (settled) {
      if (index === level) state = "Leitura confirmada";
      else if (index > level) state = "Não necessário";
      else state = "Já notificado";
    } else if (index === level) state = "Atual";
    else if (index < level) state = "Já notificado";
    const name = field
      ? String(report[field] || item[field] || "")
      : "Coordenação de Radiologia";
    return { level: index, role, name, state };
  });
}
