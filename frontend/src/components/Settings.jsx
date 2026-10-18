import { useEffect, useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";
import InstitutionPicker from "./InstitutionPicker.jsx";
import {
  currentUser,
  getInstitutions,
  updateInstitutions,
} from "../lib/session.js";

export default function Settings({ profile, onSave }) {
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState(profile.photo);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState(
    () => currentUser(sessionStorage)?.institutions ?? [],
  );
  const [activeInstitution, setActiveInstitution] = useState(
    () => currentUser(sessionStorage)?.active_institution_id ?? "",
  );
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const fileRef = useRef(null);
  const readVersion = useRef(0);

  useEffect(() => {
    let active = true;
    getInstitutions()
      .then((items) => {
        if (active) setInstitutions(items);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, []);

  function changePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const version = ++readVersion.current;
    setError("");
    setStatus("");
    setReading(false);
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Escolha uma imagem JPG, PNG ou WebP de até 2 MB.");
      event.target.value = "";
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (version !== readVersion.current) return;
      setPhoto(String(reader.result));
      setReading(false);
    };
    reader.onerror = () => {
      if (version !== readVersion.current) return;
      setError("Não foi possível ler a imagem. Escolha outro arquivo.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    if (selectedInstitutions.length === 0) {
      setError("Mantenha pelo menos uma instituição vinculada.");
      return;
    }
    const nextActive = selectedInstitutions.includes(activeInstitution)
      ? activeInstitution
      : selectedInstitutions[0];
    setPending(true);
    try {
      const user = await updateInstitutions(
        sessionStorage,
        selectedInstitutions,
        nextActive,
      );
      setActiveInstitution(user.active_institution_id);
      onSave({ name: name.trim(), photo });
      setStatus("Perfil e instituições atualizados.");
    } catch (reason) {
      setError(reason.message || "Não foi possível salvar suas alterações.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <h1>Configurações</h1>
        <p>Gerencie seu perfil e os hospitais associados à sua conta.</p>
      </div>
      <section
        className="panel settings-panel"
        aria-labelledby="settings-profile-title"
      >
        <h2 id="settings-profile-title">Perfil</h2>
        <p className="settings-description">
          A instituição ativa define quais dados clínicos ficam disponíveis no
          painel.
        </p>
        <form onSubmit={submit} className="settings-form">
          <div className="settings-field">
            <span>Instituições vinculadas</span>
            <InstitutionPicker
              institutions={institutions}
              selected={selectedInstitutions}
              onChange={(next) => {
                setSelectedInstitutions(next);
                if (!next.includes(activeInstitution)) {
                  setActiveInstitution(next[0] || "");
                }
                setStatus("");
              }}
              disabled={pending}
            />
          </div>
          {selectedInstitutions.length > 1 ? (
            <label className="settings-field">
              Instituição ativa após salvar
              <select
                value={
                  selectedInstitutions.includes(activeInstitution)
                    ? activeInstitution
                    : selectedInstitutions[0]
                }
                onChange={(event) => setActiveInstitution(event.target.value)}
                disabled={pending}
              >
                {institutions
                  .filter((item) => selectedInstitutions.includes(item.id))
                  .map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <div className="settings-photo-row">
            <span className="profile-avatar settings-avatar">
              {photo ? (
                <img
                  src={photo}
                  alt="Prévia da foto de perfil"
                  width="80"
                  height="80"
                />
              ) : (
                <UserRound size={32} aria-hidden="true" />
              )}
            </span>
            <div>
              <div className="settings-photo-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={reading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera size={16} aria-hidden="true" />
                  {reading ? "Carregando…" : "Alterar foto"}
                </button>
                {photo ? (
                  <button
                    className="settings-remove"
                    type="button"
                    onClick={() => {
                      ++readVersion.current;
                      setReading(false);
                      setPhoto("");
                      setStatus("");
                      setError("");
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <p className="hint" id="photo-hint">
                JPG, PNG ou WebP. Até 2 MB.
              </p>
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              tabIndex={-1}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Foto de perfil"
              aria-describedby="photo-hint"
              onChange={changePhoto}
            />
          </div>
          <label className="settings-field">
            Nome de exibição
            <input
              name="display-name"
              type="text"
              maxLength={80}
              autoComplete="off"
              placeholder="Como você quer ser chamado"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setStatus("");
              }}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="settings-save">
            <button
              className="btn-primary"
              type="submit"
              disabled={reading || pending}
            >
              {pending ? "Salvando…" : "Salvar alterações"}
            </button>
            <p role="status" className="hint">
              {status}
            </p>
          </div>
        </form>
      </section>
    </>
  );
}
