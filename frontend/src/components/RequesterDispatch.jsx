import { useEffect, useRef, useState } from "react";
import { Send, CheckCircle2, Clock3, X } from "lucide-react";
import { authorizedRequest } from "../lib/session.js";
import { refreshWorkspace } from "../api.js";
import { formatRemaining } from "../lib/formatRemaining.js";
import PhysicianAvatar from "./PhysicianAvatar.jsx";

export default function RequesterDispatch({ item, autoOpenToken }) {
  const dialog = useRef(null),
    trigger = useRef(null),
    overflow = useRef("");
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  const sent = Boolean(item.requester_sent_at);
  const deadline = item.requester_dispatch_deadline
    ? Date.parse(item.requester_dispatch_deadline)
    : null;
  const remaining = deadline
    ? (deadline - now) / 3600000
    : item.time_remaining_hours;
  function open() {
    setError("");
    overflow.current = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = "hidden";
  }
  useEffect(() => {
    if (autoOpenToken > 0 && !sent) open();
  }, [autoOpenToken]);
  useEffect(() => {
    if (sent) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sent]);
  useEffect(() => {
    const node = dialog.current;
    return () => {
      if (node?.open) document.body.style.overflow = overflow.current;
    };
  }, []);
  async function send() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await authorizedRequest(`/cases/${item.id}/send-requester`, {
        method: "POST",
      });
      await refreshWorkspace();
      dialog.current.close();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="requester-dispatch">
      <div className="requester-dispatch-summary">
        {sent ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
        <div>
          <h4>
            {sent
              ? "Envio ao solicitante registrado"
              : "Envio ao solicitante pendente"}
          </h4>
          <p>
            {sent
              ? `Registro interno para ${item.ordering_physician}.`
              : "Caso fechado. O prazo de comunicação continua correndo."}
          </p>
          {!sent && (
            <span className={remaining < 0 ? "is-overdue" : ""}>
              Prazo de envio: {formatRemaining(remaining)}
            </span>
          )}
        </div>
      </div>
      {!sent && (
        <button
          ref={trigger}
          type="button"
          className="btn-primary"
          onClick={open}
        >
          <Send size={16} />
          Enviar ao solicitante
        </button>
      )}
      <dialog
        className="requester-dispatch-dialog"
        ref={dialog}
        aria-labelledby="requester-dispatch-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => {
          document.body.style.overflow = overflow.current;
          trigger.current?.focus();
        }}
      >
        <header>
          <span className="requester-dispatch-symbol">
            <Send size={24} />
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Enviar depois"
            disabled={pending}
            onClick={() => dialog.current.close()}
          >
            <X size={20} />
          </button>
        </header>
        <h2 id="requester-dispatch-title">Enviar ao médico solicitante?</h2>
        <p>
          A leitura foi confirmada e a ação registrada. O caso está fechado.
        </p>
        <div className="requester-recipient">
          <PhysicianAvatar name={item.ordering_physician} />
          <div>
            <small>Médico solicitante</small>
            <strong>{item.ordering_physician || "Não informado"}</strong>
          </div>
        </div>
        <p className="requester-send-note">
          O envio será registrado na comunicação interna. Se preferir enviar
          depois, o prazo continua correndo e esta opção permanece disponível no
          caso.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            className="btn-secondary"
            type="button"
            disabled={pending}
            onClick={() => dialog.current.close()}
          >
            Ainda não
          </button>
          <button
            className="btn-primary"
            type="button"
            disabled={pending || !item.ordering_physician}
            onClick={send}
          >
            {pending ? "Registrando envio…" : "Sim, enviar agora"}
          </button>
        </footer>
      </dialog>
    </div>
  );
}
