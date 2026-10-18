import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Building2, Search, Check } from "lucide-react";

export default function InstitutionPicker({
  institutions,
  selected,
  onChange,
  label = "Instituições vinculadas",
  disabled = false,
}) {
  const id = useId(),
    root = useRef(null),
    summary = useRef(null);
  const [query, setQuery] = useState("");
  const selectedNames = institutions
    .filter((item) => selected.includes(item.id))
    .map((item) => item.name);
  const fold = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = institutions.filter((item) =>
    fold(item.name).includes(fold(query.trim())),
  );
  useEffect(() => {
    const outside = (event) => {
      if (!root.current?.contains(event.target)) root.current.open = false;
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (disabled && root.current) root.current.open = false;
  }, [disabled]);
  function toggle(institutionId) {
    onChange(
      selected.includes(institutionId)
        ? selected.filter((value) => value !== institutionId)
        : [...selected, institutionId],
    );
  }
  return (
    <details
      ref={root}
      className="institution-picker institution-picker-refined"
      id={id}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          root.current.open = false;
          summary.current.focus();
        }
      }}
      onToggle={(event) => {
        if (!event.currentTarget.open) setQuery("");
      }}
    >
      <summary
        ref={summary}
        aria-disabled={disabled}
        aria-label={label}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
      >
        <span className="institution-picker-symbol">
          <Building2 size={20} aria-hidden="true" />
        </span>
        <span className="institution-picker-summary-copy">
          <strong>
            {selectedNames.length
              ? selectedNames[0]
              : "Selecionar instituições"}
          </strong>
          <small>
            {selectedNames.length
              ? `${selectedNames.length} ${selectedNames.length === 1 ? "instituição vinculada" : "instituições vinculadas"}`
              : "Escolha os hospitais da sua conta"}
          </small>
        </span>
        {selectedNames.length > 1 && (
          <span className="institution-picker-count">
            +{selectedNames.length - 1}
          </span>
        )}
        <ChevronDown
          size={17}
          className="institution-picker-chevron"
          aria-hidden="true"
        />
      </summary>
      <div className="institution-picker-menu">
        <div className="institution-picker-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar instituição"
            placeholder="Buscar hospital ou clínica…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={disabled}
          />
        </div>
        <fieldset disabled={disabled}>
          <legend className="sr-only">{label}</legend>
          {visible.map((institution) => (
            <label className="institution-picker-option" key={institution.id}>
              <span className="institution-option-symbol">
                <Building2 size={17} aria-hidden="true" />
              </span>
              <span className="institution-option-name">
                {institution.name}
              </span>
              <input
                type="checkbox"
                checked={selected.includes(institution.id)}
                onChange={() => toggle(institution.id)}
              />
            </label>
          ))}
          {!visible.length && (
            <p className="institution-picker-empty">
              Nenhuma instituição encontrada.
            </p>
          )}
        </fieldset>
        <div className="institution-picker-footer">
          <span>
            <Check size={14} aria-hidden="true" />
            {selected.length} selecionadas
          </span>
          <small>Confirme em Salvar alterações</small>
        </div>
      </div>
    </details>
  );
}
