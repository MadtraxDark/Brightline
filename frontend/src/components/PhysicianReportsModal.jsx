import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowUpRight, X } from "lucide-react";
import PhysicianAvatar from "./PhysicianAvatar.jsx";
import UrgencyBadge from "./UrgencyBadge.jsx";
import { statusLabel } from "../format.js";

export default function PhysicianReportsModal({ person, cases }) {
  const dialog = useRef(null),
    trigger = useRef(null),
    overflow = useRef("");
  useEffect(() => {
    const node = dialog.current;
    return () => {
      if (node?.open) document.body.style.overflow = overflow.current;
    };
  }, []);
  return (
    <>
      <button
        ref={trigger}
        className="physician-reports-toggle"
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          overflow.current = document.body.style.overflow;
          dialog.current.showModal();
          document.body.style.overflow = "hidden";
        }}
      >
        <FileText size={17} aria-hidden="true" />
        Ver laudos associados
        <ArrowUpRight size={17} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        className="physician-reports-dialog"
        aria-label={`Laudos de ${person.name}`}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
        onClose={() => {
          document.body.style.overflow = overflow.current;
          trigger.current?.focus();
        }}
      >
        <header className="physician-modal-heading">
          <PhysicianAvatar name={person.name} />
          <div>
            <h2>{person.name}</h2>
            <p>Laudos associados · {person.associated.length} documentos</p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Fechar laudos do médico"
            onClick={() => dialog.current.close()}
          >
            <X size={22} />
          </button>
        </header>
        <div className="physician-modal-list">
          {person.associated.map((report) => {
            const related = cases.filter(
              (item) => item.report_id === report.report_id,
            );
            return (
              <article
                className="physician-modal-report"
                key={report.report_id}
              >
                <div className="physician-modal-report-top">
                  <span>
                    <FileText size={16} aria-hidden="true" />
                    {report.report_id}
                  </span>
                  <span>
                    {report.radiologist === person.name
                      ? "Radiologista"
                      : "Solicitante"}
                  </span>
                </div>
                <h3>{report.modality || "Modalidade não informada"}</h3>
                <p className="physician-modal-preview">
                  {report.text || "Texto do laudo não disponível."}
                </p>
                <dl>
                  <div>
                    <dt>Radiologista</dt>
                    <dd>{report.radiologist || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Médico solicitante</dt>
                    <dd>{report.ordering_physician || "Não informado"}</dd>
                  </div>
                </dl>
                {related.length ? (
                  related.map((item) => (
                    <div className="physician-modal-finding" key={item.id}>
                      <div>
                        <strong>{item.finding}</strong>
                        <span>
                          <UrgencyBadge level={item.urgency} />
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <Link
                        to={`/caso/${item.id}`}
                        onClick={() => dialog.current.close()}
                      >
                        Ver laudo
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="physician-modal-no-case">
                    Sem caso de acompanhamento associado.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </dialog>
    </>
  );
}
