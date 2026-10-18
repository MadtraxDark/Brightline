import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import {
  currentUser,
  getInstitutions,
  switchInstitution,
} from "../lib/session.js";

export default function InstitutionSwitcher({ onChange }) {
  const [user, setUser] = useState(() => currentUser(sessionStorage));
  const [institutions, setInstitutions] = useState([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getInstitutions()
      .then((items) => {
        if (active) setInstitutions(items);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as instituições.");
      });
    const sync = () => setUser(currentUser(sessionStorage));
    window.addEventListener("brightline:institution-changed", sync);
    return () => {
      active = false;
      window.removeEventListener("brightline:institution-changed", sync);
    };
  }, []);

  const linked = institutions.filter((item) =>
    user?.institutions?.includes(item.id),
  );
  const activeInstitution = linked.find(
    (item) => item.id === user?.active_institution_id,
  );

  async function change(event) {
    const nextId = event.target.value;
    if (!nextId || nextId === user?.active_institution_id) return;
    setPending(true);
    setError("");
    try {
      const nextUser = await switchInstitution(sessionStorage, nextId);
      setUser(nextUser);
      onChange?.(nextUser);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="institution-switcher">
      <Building2 size={16} aria-hidden="true" />
      {linked.length > 1 ? (
        <select
          aria-label="Instituição ativa"
          value={user?.active_institution_id || ""}
          onChange={change}
          disabled={pending}
        >
          {linked.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>
      ) : (
        <span>
          {activeInstitution?.name || "Vínculo institucional pendente"}
        </span>
      )}
      {error ? (
        <span className="institution-switcher-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
