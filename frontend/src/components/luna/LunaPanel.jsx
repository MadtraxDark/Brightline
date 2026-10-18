import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import luna from "../../assets/luna.png";
import { useStore } from "../../store/useStore.js";
import { generalLunaReply } from "../../lib/generalLuna.js";

export default function LunaPanel({ open, onClose }) {
  const cases = useStore((state) => state.cases);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Olá! Sou a Luna. Como posso ajudar você no Brightline hoje?",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const busy = useRef(false);
  const timer = useRef(null);
  const log = useRef(null);
  const input = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, typing, open]);
  useEffect(() => {
    const node = input.current;
    if (node) {
      node.style.height = "auto";
      node.style.height = `${Math.min(100, Math.max(24, node.scrollHeight))}px`;
    }
  }, [draft, open]);
  function send(event) {
    event.preventDefault();
    if (!draft.trim() || busy.current) return;
    const question = draft.trim(),
      reply = generalLunaReply(question, cases);
    setMessages((previous) => [...previous, { role: "user", text: question }]);
    setDraft("");
    setTyping(true);
    busy.current = true;
    input.current?.focus();
    timer.current = setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: reply },
      ]);
      setTyping(false);
      busy.current = false;
    }, 850);
  }
  return (
    <div
      id="luna-panel"
      className="luna-panel luna-general-chat"
      role="dialog"
      aria-label="Chat geral da Luna"
      hidden={!open}
    >
      <header className="general-chat-header">
        <img src={luna} alt="" width={40} height={40} />
        <div>
          <h2>Luna</h2>
          <p>{typing ? "Digitando…" : "Assistente do Brightline"}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar chat geral"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div
        className="general-chat-log"
        role="log"
        aria-label="Conversa geral"
        aria-live="polite"
        aria-relevant="additions"
        ref={log}
      >
        {messages.map((message, index) => (
          <div className={`general-chat-bubble is-${message.role}`} key={index}>
            <span>{message.role === "user" ? "Você" : "Luna"}</span>
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
      <div className="general-chat-compose">
        <form onSubmit={send}>
          <label className="sr-only" htmlFor="general-luna-message">
            Mensagem para Luna
          </label>
          <textarea
            ref={input}
            id="general-luna-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={1}
            maxLength={2000}
            placeholder="Escreva uma mensagem…"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              )
                send(event);
            }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing}
            aria-label="Enviar mensagem para Luna"
          >
            <Send size={19} />
          </button>
        </form>
        <small>Conversa demonstrativa · A IA sugere. Você valida.</small>
      </div>
    </div>
  );
}
