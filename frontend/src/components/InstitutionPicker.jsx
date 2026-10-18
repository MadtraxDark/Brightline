import { useId } from "react";
import { ChevronDown } from "lucide-react";

export default function InstitutionPicker({
  institutions,
  selected,
  onChange,
  label = "Instituições vinculadas",
  disabled = false,
}) {
  const id = useId();
  const selectedNames = institutions
    .filter((institution) => selected.includes(institution.id))
    .map((institution) => institution.name);

  function toggle(institutionId) {
    const next = selected.includes(institutionId)
      ? selected.filter((id) => id !== institutionId)
      : [...selected, institutionId];
    onChange(next);
  }

  return (
    <details className="institution-picker" id={id}>
      <summary aria-disabled={disabled} aria-label={label}>
        <span>
          {selectedNames.length
            ? selectedNames.join(", ")
            : "Selecione uma ou mais instituições"}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <fieldset disabled={disabled}>
        <legend>{label}</legend>
        {institutions.map((institution) => (
          <label key={institution.id}>
            <input
              type="checkbox"
              checked={selected.includes(institution.id)}
              onChange={() => toggle(institution.id)}
            />
            <span>{institution.name}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
