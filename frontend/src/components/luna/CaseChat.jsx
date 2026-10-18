import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import lunaAvatar from "../../assets/luna.png";
import { caseChatReply } from "../../lib/caseChat.js";

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
  function send() {
    const question = draft.trim();
    if (!question || busy.current) return;
    busy.current = true;
    const reply = caseChatReply(question, item, report);
    setMessages((previous) => [...previous, { role: "user", text: question }]);
    setDraft("");
    setTyping(true);
    inputRef.current?.focus();
    timer.current = setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: reply },
      ]);
      setTyping(false);
      busy.current = false;
    }, 900);
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
        <p className="case-chat-footnote">
          Conversa demonstrativa · A IA sugere. O médico valida.
        </p>
      </div>
    </section>
  );
}
