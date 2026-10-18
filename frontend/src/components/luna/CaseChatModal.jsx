import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import lunaIcon from "../../assets/luna.png";
import CaseChat from "./CaseChat.jsx";

export default function CaseChatModal({ item, report }) {
  const dialog = useRef(null);
  const [started, setStarted] = useState(false);
  const trigger = useRef(null);
  const previousOverflow = useRef("");
  useEffect(
    () => () => {
      if (dialog.current?.open)
        document.body.style.overflow = previousOverflow.current;
    },
    [],
  );
  return (
    <>
      <button
        className="luna-report-cta"
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setStarted(true);
          previousOverflow.current = document.body.style.overflow;
          dialog.current.showModal();
          document.body.style.overflow = "hidden";
          dialog.current.querySelector("textarea")?.focus();
        }}
      >
        <img src={lunaIcon} alt="" width="38" height="38" />
        Converse com a Luna
      </button>
      <dialog
        ref={dialog}
        className="luna-report-dialog"
        aria-label="Conversa com a Luna sobre o laudo"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
        onClose={() => {
          document.body.style.overflow = previousOverflow.current;
          trigger.current?.focus();
        }}
      >
        <button
          className="luna-report-close icon-button"
          type="button"
          aria-label="Fechar conversa"
          onClick={() => dialog.current.close()}
        >
          <X size={21} aria-hidden="true" />
        </button>
        {started && <CaseChat item={item} report={report} />}
      </dialog>
    </>
  );
}
