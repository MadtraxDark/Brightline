import { useEffect, useRef } from "react";
import { Send, X } from "lucide-react";
import lunaIcon from "../../assets/luna.png";

function markName(kind, point) {
  const name = String(point ?? "").replaceAll("_", " ");
  if (kind === "area") return `Área ${name}`;
  if (kind === "classificacao") return `Classificação ${name}`;
  return `Ponto ${name}`;
}

export default function PointChat({
  selected,
  question,
  onQuestion,
  onSubmit,
  discussion,
  typing,
  onClose,
  reportId,
}) {
  const log = useRef(null);
  const input = useRef(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [discussion, typing, selected]);
  useEffect(() => {
    if (selected) input.current?.focus();
  }, [selected?.id]);
  useEffect(() => {
    const node = input.current;
    if (node) {
      node.style.height = "auto";
      node.style.height = `${Math.min(100, Math.max(24, node.scrollHeight))}px`;
    }
  }, [question]);
  return (
    <aside
      className="exam-point-chat point-messenger"
      aria-label="Conversa com Luna sobre pontos"
    >
      <header className="point-messenger-header">
        <img src={lunaIcon} alt="" width={40} height={40} />
        <div>
          <h3>Luna</h3>
          <p>
            {typing ? "Digitando…" : `Sobre a imagem · ${reportId || "Laudo"}`}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar chat de pontos"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div
        className="point-chat-log"
        ref={log}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="point-bubble is-assistant">
          <span>Luna</span>
          <p>
            Marque um ponto ou uma área na imagem e me conte qual é a sua
            dúvida.
          </p>
        </div>
        {discussion.map((message, index) => (
          <div className="point-exchange" key={index}>
            <div className="point-bubble is-user">
              <span>Você · {markName(message.kind, message.point)}</span>
              <p>{message.question}</p>
            </div>
            {message.answer && (
              <div className="point-bubble is-assistant">
                <span>Luna · {markName(message.kind, message.point)}</span>
                <p>{message.answer}</p>
              </div>
            )}
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
      <div className="point-messenger-compose">
        <div className="point-context">
          {selected
            ? `${selected.kind === "area" ? "Área" : "Ponto"} ${selected.id} selecionado`
            : "Selecione um ponto na imagem para conversar"}
        </div>
        <form onSubmit={onSubmit}>
          <label htmlFor="point-question" className="sr-only">
            Mensagem sobre o ponto selecionado
          </label>
          <textarea
            id="point-question"
            ref={input}
            value={question}
            onChange={(event) => onQuestion(event.target.value)}
            maxLength={2000}
            disabled={!selected}
            placeholder={
              selected
                ? "Escreva uma mensagem…"
                : "Marque um ponto ou uma área na imagem…"
            }
            rows={1}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                onSubmit(event);
              }
            }}
          />
          <button
            type="submit"
            aria-label="Enviar mensagem sobre o ponto"
            disabled={!selected || !question.trim() || typing}
          >
            <Send size={19} />
          </button>
        </form>
        <small>Marcações manuais · A IA sugere. O médico valida.</small>
      </div>
    </aside>
  );
}
