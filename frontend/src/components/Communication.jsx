import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Mail, Search, Send } from "lucide-react";
import PhysicianAvatar from "./PhysicianAvatar.jsx";
import { useStore } from "../store/useStore.js";
import { authorizedRequest, currentUser } from "../lib/session.js";

const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function roleOf(person) {
  if (person.signed > 0 && person.requested > 0)
    return "Radiologista e solicitante";
  if (person.signed > 0) return "Radiologista";
  return "Médico solicitante";
}

function clock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function ReportPicker({ reports, value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const current = reports.find((report) => report.report_id === value);
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className={`comm-picker${open ? " is-open" : ""}`} ref={root}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Referência de laudo"
        onClick={() => setOpen((next) => !next)}
      >
        <span>
          <strong>{current ? current.report_id : "Nenhum laudo"}</strong>
          <small>{current?.modality || "Sem referência"}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <ul role="listbox" aria-label="Laudos deste médico">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <strong>Nenhum laudo</strong>
              <small>Mensagem sem referência</small>
            </button>
          </li>
          {reports.map((report) => (
            <li key={`${report.institution_id ?? ""}-${report.report_id}`}>
              <button
                type="button"
                role="option"
                aria-selected={value === report.report_id}
                onClick={() => {
                  onChange(report.report_id);
                  setOpen(false);
                }}
              >
                <strong>{report.report_id}</strong>
                <small>{report.modality || "Laudo"}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function openMail(message) {
  const subject = message.report_id
    ? `Brightline · laudo ${message.report_id}`
    : `Brightline · ${message.peer_name}`;
  const href = `mailto:${message.email_to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.body)}`;
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noreferrer";
  link.click();
}

export default function Communication() {
  const reports = useStore((state) => state.reports);
  const me = currentUser(sessionStorage);
  const people = useMemo(() => {
    const names = [
      ...new Set(
        reports
          .flatMap((report) => [report.radiologist, report.ordering_physician])
          .filter(Boolean),
      ),
    ].sort((left, right) => left.localeCompare(right, "pt-BR"));
    return names.map((name) => {
      const associated = reports.filter(
        (report) =>
          report.radiologist === name || report.ordering_physician === name,
      );
      return {
        name,
        associated,
        signed: associated.filter((report) => report.radiologist === name)
          .length,
        requested: associated.filter(
          (report) => report.ordering_physician === name,
        ).length,
      };
    });
  }, [reports]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [reportId, setReportId] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);
  const threadEnd = useRef(null);
  const opened = useRef(false);
  const visible = people.filter((person) =>
    fold(person.name).includes(fold(query.trim())),
  );
  const active = people.find((person) => person.name === selected) ?? null;
  const thread = messages.filter(
    (message) => message.peer_name === active?.name,
  );

  useEffect(() => {
    let cancelled = false;
    authorizedRequest("/communications")
      .then((data) => {
        if (!cancelled) setMessages(data?.messages ?? []);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause?.message || "Não foi possível abrir a comunicação.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (opened.current || !people.length) return;
    opened.current = true;
    setSelected(people[0].name);
  }, [people]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "end" });
  }, [thread.length, active?.name]);

  async function submit(event) {
    event.preventDefault();
    if (!active || sending) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      const saved = await authorizedRequest("/communications", {
        method: "POST",
        body: {
          peer_name: active.name,
          body,
          channel: emailMode ? "email" : "chat",
          report_id: reportId || null,
          email_to: emailMode ? emailTo.trim() : null,
        },
      });
      setMessages((current) => [...current, saved]);
      setDraft("");
      setReportId("");
      if (emailMode) openMail(saved);
    } catch (cause) {
      setError(cause?.message || "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`comm-desk${active ? " is-open" : ""}`}>
      <section className="comm-people" aria-label="Médicos">
        <header>
          <h1>Comunicação</h1>
          <div className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar médico"
              placeholder="Buscar médico…"
            />
          </div>
        </header>
        <ul>
          {visible.map((person) => {
            const last = [...messages]
              .reverse()
              .find((message) => message.peer_name === person.name);
            const current = person.name === active?.name;
            return (
              <li key={person.name}>
                <button
                  type="button"
                  className={current ? "is-current" : undefined}
                  aria-current={current ? "true" : undefined}
                  onClick={() => {
                    setSelected(person.name);
                    setReportId("");
                    setError("");
                  }}
                >
                  <PhysicianAvatar name={person.name} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>{last?.body || roleOf(person)}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!visible.length ? (
          <p className="comm-empty">Nenhum médico encontrado nos laudos.</p>
        ) : null}
      </section>
      <section className="comm-thread" aria-label="Conversa">
        {active ? (
          <>
            <header className="comm-thread-head">
              <button
                type="button"
                className="comm-back"
                onClick={() => setSelected("")}
              >
                Médicos
              </button>
              <PhysicianAvatar name={active.name} />
              <div>
                <h2>{active.name}</h2>
                <p>
                  {roleOf(active)}. O e-mail abre o programa do seu computador e
                  a mensagem fica registrada aqui.
                </p>
              </div>
            </header>
            <div className="comm-log" role="log" aria-live="polite">
              {loading ? <p className="comm-empty">Abrindo conversa…</p> : null}
              {!loading && !thread.length ? (
                <p className="comm-empty">
                  Nenhuma mensagem com {active.name}. Escreva abaixo ou envie um
                  e-mail com a referência de um laudo.
                </p>
              ) : null}
              {thread.map((message, index) => {
                const mine = message.author_id === me?.id;
                const showDay =
                  index === 0 ||
                  dayLabel(message.created_at) !==
                    dayLabel(thread[index - 1].created_at);
                return (
                  <div key={message.id}>
                    {showDay ? (
                      <p className="comm-day">{dayLabel(message.created_at)}</p>
                    ) : null}
                    <article
                      className={mine ? "comm-bubble is-mine" : "comm-bubble"}
                    >
                      <p>{message.body}</p>
                      <footer>
                        {message.channel === "email" ? (
                          <span>E-mail · {message.email_to}</span>
                        ) : (
                          <span>{message.author_name}</span>
                        )}
                        {message.report_id ? (
                          <span>Laudo {message.report_id}</span>
                        ) : null}
                        <time dateTime={message.created_at}>
                          {clock(message.created_at)}
                        </time>
                      </footer>
                    </article>
                  </div>
                );
              })}
              <div ref={threadEnd} />
            </div>
            <form className="comm-composer" onSubmit={submit}>
              {error ? <p role="alert">{error}</p> : null}
              <div className="comm-composer-tools">
                <div className="comm-reference">
                  <span id="comm-reference-label">Referência</span>
                  <ReportPicker
                    reports={active.associated}
                    value={reportId}
                    onChange={setReportId}
                  />
                </div>
                <button
                  type="button"
                  className={emailMode ? "is-on" : undefined}
                  aria-pressed={emailMode}
                  onClick={() => setEmailMode((value) => !value)}
                >
                  <Mail size={16} aria-hidden="true" />
                  E-mail
                </button>
              </div>
              {emailMode ? (
                <label className="comm-email">
                  Para
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(event) => setEmailTo(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="nome@instituicao.org"
                    aria-label="E-mail do médico"
                  />
                </label>
              ) : null}
              <div className="comm-write">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  maxLength={2000}
                  required
                  placeholder={
                    emailMode
                      ? "Texto que vai no e-mail…"
                      : "Escreva uma mensagem…"
                  }
                  aria-label={emailMode ? "Texto do e-mail" : "Mensagem"}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button type="submit" disabled={sending || !draft.trim()}>
                  <Send size={16} aria-hidden="true" />
                  {emailMode ? "Abrir e-mail" : "Enviar"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="comm-empty">Escolha um médico para abrir a conversa.</p>
        )}
      </section>
    </div>
  );
}
