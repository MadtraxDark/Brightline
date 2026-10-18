export default function LunaPanel({ open, onClose }) {
  return (
    <div
      id="luna-panel"
      className="luna-panel"
      role="dialog"
      aria-label="Luna"
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <h2>Luna</h2>
      <p>Assistente de IA do Brightline. Em breve.</p>
    </div>
  );
}
