import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import lunaAvatar from "../../assets/luna.png";
import { askLuna } from "../../lib/luna/client.js";
import { getLunaMode } from "../../lib/luna/mode.js";
import { buildCaseContext, lunaReplyText } from "../../lib/luna/live.js";

export default function CaseChat({ item, report }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(true);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const timer = useRef(null);
  const busy = useRef(true);
  useEffect(() => {
    timer.current = setTimeout(() => {
      setMessages([
        {
          role: "assistant",
          text: "Olá! Qual é a sua dúvida sobre este laudo?",
        },
      ]);
      setTyping(false);
      busy.current = false;
    }, 800);
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, typing]);
  useEffect(() => {
    const input = inputRef.current;
    input.style.height = "auto";
    input.style.height = `${Math.min(112, Math.max(24, input.scrollHeight))}px`;
  }, [draft]);
  async function send() {
    const question = draft.trim().slice(0, 500);
    if (!question || busy.current) return;
    busy.current = true;
    const history = messages.slice(-6).map((message) => ({
      role: message.role,
      text: message.text.slice(0, 800),
    }));
    setMessages((previous) => [...previous, { role: "user", text: question }]);
    setDraft("");
    setTyping(true);
    inputRef.current?.focus();
    try {
      const result = await askLuna({
        question,
        history,
        context: buildCaseContext(item, report),
        mode: getLunaMode(sessionStorage),
      });
      const text = lunaReplyText(result);
      if (!text) return;
      setMessages((previous) => [...previous, { role: "assistant", text }]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "Não foi possível consultar a Luna agora. Tente de novo.",
        },
      ]);
    } finally {
      setTyping(false);
      busy.current = false;
    }
  }
  return (
    <section
      className="case-chat messenger-chat"
      aria-labelledby="case-chat-title"
    >
      <header className="case-chat-header">
        <img src={lunaAvatar} alt="" width="44" height="44" />
        <div>
          <h3 id="case-chat-title">Luna</h3>
          <p>{typing ? "Digitando…" : `Sobre o laudo ${item.report_id}`}</p>
        </div>
      </header>
      <div
        className="case-chat-log"
        ref={logRef}
        role="log"
        aria-label="Conversa sobre o laudo"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message, index) => (
          <div className={`case-chat-message is-${message.role}`} key={index}>
            <span>{message.role === "assistant" ? "Luna" : "Você"}</span>
            <p>{message.text}</p>
          </div>
        ))}
        {typing && (
          <div
            className="luna-typing"
            role="status"
            aria-label="Luna está digitando"
          >
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <div className="messenger-compose-area">
        <form
          className="case-chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="case-chat-question">
            Mensagem para Luna
          </label>
          <textarea
            id="case-chat-question"
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escreva uma mensagem…"
            rows={1}
            maxLength={2000}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                send();
              }
            }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing}
            aria-label="Enviar mensagem"
          >
            <Send size={20} aria-hidden="true" />
          </button>
        </form>
        <p className="case-chat-footnote">A IA sugere. O médico valida.</p>
      </div>
    </section>
  );
}
