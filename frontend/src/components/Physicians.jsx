import { useMemo, useState } from "react";
import PhysicianReportsModal from "./PhysicianReportsModal.jsx";
import { Search, Building2, Stethoscope } from "lucide-react";
import { useStore } from "../store/useStore.js";
import PhysicianAvatar from "./PhysicianAvatar.jsx";

const fold = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export default function Physicians() {
  const reports = useStore((state) => state.reports);
  const cases = useStore((state) => state.cases);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const physicians = useMemo(() => {
    const names = [
      ...new Set(
        reports
          .flatMap((report) => [report.radiologist, report.ordering_physician])
          .filter(Boolean),
      ),
    ];
    return names
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((name) => {
        const associated = reports.filter(
          (report) =>
            report.radiologist === name || report.ordering_physician === name,
        );
        const signed = associated.filter(
          (report) => report.radiologist === name,
        ).length;
        const requested = associated.filter(
          (report) => report.ordering_physician === name,
        ).length;
        const ids = new Set(associated.map((report) => report.report_id));
        const open = cases.filter(
          (item) => ids.has(item.report_id) && item.status !== "closed",
        ).length;
        return {
          name,
          associated,
          signed,
          requested,
          open,
          modalities: [
            ...new Set(
              associated.map((report) => report.modality).filter(Boolean),
            ),
          ],
        };
      });
  }, [reports, cases]);
  const visible = physicians.filter(
    (person) =>
      fold(person.name).includes(fold(query.trim())) &&
      (role === "all" ||
        (role === "radiologist" ? person.signed > 0 : person.requested > 0)),
  );
  return (
    <div className="physicians-page">
      <header className="physicians-heading">
        <div>
          <h1>Equipe médica</h1>
          <p>
            Conheça os profissionais e acompanhe sua participação nos laudos.
          </p>
        </div>
        <div className="physicians-total">
          <Stethoscope size={19} aria-hidden="true" />
          <strong>{physicians.length}</strong>
          <span>profissionais</span>
        </div>
      </header>
      <div className="physicians-toolbar">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar médico"
            placeholder="Buscar profissional…"
          />
        </div>
        <select
          aria-label="Filtrar por atuação"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="all">Todas as atuações</option>
          <option value="radiologist">Radiologistas</option>
          <option value="requesting">Médicos solicitantes</option>
        </select>
        <span className="physicians-results" role="status">
          {visible.length}{" "}
          {visible.length === 1
            ? "profissional encontrado"
            : "profissionais encontrados"}
        </span>
      </div>
      <div className="physicians-grid">
        {visible.map((person) => (
          <article
            className="physician-card physician-rich-card"
            key={person.name}
            aria-label={person.name}
          >
            <div className="physician-card-portrait">
              <PhysicianAvatar name={person.name} />
              <span className="physician-role-badge">
                {person.signed > 0 && person.requested > 0
                  ? "Radiologista · Solicitante"
                  : person.signed > 0
                    ? "Radiologista"
                    : "Médico solicitante"}
              </span>
            </div>
            <div className="physician-card-content">
              <h2>{person.name}</h2>
              <p className="physician-context">
                {person.signed > 0
                  ? "Responsável pela interpretação de exames"
                  : "Solicitação e acompanhamento de exames"}
              </p>
              <dl className="physician-activity">
                <div>
                  <dt>Laudos associados</dt>
                  <dd>{person.associated.length}</dd>
                </div>
                <div>
                  <dt>Casos em aberto</dt>
                  <dd>{person.open}</dd>
                </div>
              </dl>
              <div className="physician-exams">
                <h3>Exames associados</h3>
                <div>
                  {person.modalities.map((modality) => (
                    <span key={modality}>{modality}</span>
                  ))}
                </div>
              </div>
              <dl className="physician-clinic">
                <dt>
                  <Building2 size={15} aria-hidden="true" />
                  Clínica
                </dt>
                <dd aria-label="Clínica não cadastrada">{"\u00a0"}</dd>
              </dl>
              <PhysicianReportsModal person={person} cases={cases} />
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="state-block empty">
          <h2>Nenhum médico encontrado</h2>
          <p>Tente outro nome ou altere o filtro de atuação.</p>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setRole("all");
              setQuery("");
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
