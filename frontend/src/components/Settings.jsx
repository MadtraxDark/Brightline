import { useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";

export default function Settings({ profile, onSave }) {
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState(profile.photo);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reading, setReading] = useState(false);
  const fileRef = useRef(null);
  const readVersion = useRef(0);

  function changePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const version = ++readVersion.current;
    setError("");
    setStatus("");
    setReading(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
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

  function submit(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      onSave({ name: name.trim(), photo });
      setStatus("Perfil atualizado nesta sessão.");
    } catch {
      setError("Não foi possível salvar. Tente uma imagem menor ou verifique o armazenamento do navegador.");
    }
  }

  return <>
    <div className="page-intro"><h1>Configurações</h1><p>Personalize como seu perfil aparece no Brightline.</p></div>
    <section className="panel settings-panel" aria-labelledby="settings-profile-title">
      <h2 id="settings-profile-title">Perfil</h2>
      <p className="settings-description">Estas preferências ficam neste navegador durante a sessão de demonstração.</p>
      <form onSubmit={submit} className="settings-form">
        <div className="settings-photo-row">
          <span className="profile-avatar settings-avatar">{photo ? <img src={photo} alt="Prévia da foto de perfil" width="80" height="80" /> : <UserRound size={32} aria-hidden="true" />}</span>
          <div><div className="settings-photo-actions"><button className="btn-secondary" type="button" disabled={reading} onClick={() => fileRef.current?.click()}><Camera size={16} aria-hidden="true" />{reading ? "Carregando…" : "Alterar foto"}</button>{photo ? <button className="settings-remove" type="button" onClick={() => { ++readVersion.current; setReading(false); setPhoto(""); setStatus(""); setError(""); if (fileRef.current) fileRef.current.value = ""; }}>Remover</button> : null}</div><p className="hint" id="photo-hint">JPG, PNG ou WebP. Até 2 MB.</p></div>
          <input ref={fileRef} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto de perfil" aria-describedby="photo-hint" onChange={changePhoto} />
        </div>
        <label className="settings-field">Nome de exibição<input name="display-name" type="text" maxLength={80} autoComplete="off" placeholder="Como você quer ser chamado" value={name} onChange={event => { setName(event.target.value); setStatus(""); }} /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="settings-save"><button className="btn-primary" type="submit" disabled={reading}>Salvar alterações</button><p role="status" className="hint">{status}</p></div>
      </form>
    </section>
  </>;
}
