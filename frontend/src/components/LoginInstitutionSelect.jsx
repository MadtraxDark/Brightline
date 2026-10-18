import { useEffect, useId, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";

export default function LoginInstitutionSelect({
  institutions,
  disabled = false,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const options = [
    { id: "", name: "Selecione uma instituição" },
    ...institutions,
  ];
  const selected = options.find((item) => item.id === value) ?? options[0];

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  function choose(nextId) {
    setValue(nextId);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        Math.max(
          0,
          options.findIndex((item) => item.id === value),
        ),
      );
      setOpen(true);
    }
  }

  function onListKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (current) => (current - 1 + options.length) % options.length,
      );
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[activeIndex]?.id ?? "");
    }
  }

  return (
    <div className={`login-institution${open ? " is-open" : ""}`} ref={rootRef}>
      <input type="hidden" name="institution_id" value={value} />
      <button
        id="login-institution"
        ref={triggerRef}
        type="button"
        className="login-institution-trigger"
        aria-labelledby="login-institution-label login-institution-value"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setActiveIndex(
            Math.max(
              0,
              options.findIndex((item) => item.id === value),
            ),
          );
          setOpen((current) => !current);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <Building2 size={18} aria-hidden="true" />
        <span
          id="login-institution-value"
          className={value ? "" : "is-placeholder"}
        >
          {selected.name}
        </span>
        <ChevronDown
          size={16}
          className="login-institution-chevron"
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul
          id={listId}
          className="login-institution-menu"
          role="listbox"
          aria-label="Instituição"
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          ref={listRef}
        >
          {options.map((institution, index) => {
            const picked = institution.id === value;
            return (
              <li key={institution.id || "none"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={picked}
                  className={index === activeIndex ? "is-active" : ""}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(institution.id)}
                >
                  <span>{institution.name}</span>
                  {picked ? <Check size={16} aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
