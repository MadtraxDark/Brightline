import { useId, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import PhysicianAvatar from "./PhysicianAvatar.jsx";

export default function PhysicianSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}) {
  const id = useId(),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const fold = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = options.filter((name) => fold(name).includes(fold(query)));
  function choose(name) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }
  return (
    <div
      className="physician-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="physician-select-control">
        {value && !open ? (
          <PhysicianAvatar name={value} />
        ) : (
          <Search size={17} aria-hidden="true" />
        )}
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && visible[active] ? `${id}-${active}` : undefined
          }
          value={open ? query : value}
          disabled={disabled}
          placeholder="Buscar e selecionar médico"
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
              setQuery("");
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                Math.max(
                  0,
                  Math.min(
                    visible.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (visible[active]) choose(visible[active]);
            }
          }}
        />
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      {open && (
        <ul
          className="physician-select-options"
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
        >
          {visible.map((name, index) => (
            <li
              id={`${id}-${index}`}
              key={name}
              role="option"
              aria-selected={name === value}
              className={index === active ? "is-active" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(name)}
            >
              <PhysicianAvatar name={name} />
              <span>{name}</span>
              {name === value && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
          {!visible.length && (
            <li role="presentation" className="physician-select-empty">
              Nenhum médico encontrado
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
