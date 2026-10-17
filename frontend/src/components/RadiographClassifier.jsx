import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Upload } from "lucide-react";
import "../styles/classifier.css";

const API_URL = (import.meta.env.VITE_BRIGHTLINE_API_URL || "http://localhost:8080").replace(/\/$/, "");
const LABELS = ["Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule", "Pneumonia", "Pneumothorax", "Consolidation", "Edema", "Emphysema", "Fibrosis", "Pleural_Thickening", "Hernia"];
const PT = { Atelectasis: "Atelectasia", Cardiomegaly: "Cardiomegalia", Effusion: "Derrame pleural", Infiltration: "Infiltração", Mass: "Massa", Nodule: "Nódulo", Pneumonia: "Pneumonia", Pneumothorax: "Pneumotórax", Consolidation: "Consolidação", Edema: "Edema", Emphysema: "Enfisema", Fibrosis: "Fibrose", Pleural_Thickening: "Espessamento pleural", Hernia: "Hérnia" };

async function readError(response) {
  const payload = await response.json().catch(() => ({}));
  return typeof payload.detail === "string" ? payload.detail : "Não foi possível concluir a solicitação.";
}

export default function RadiographClassifier() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function login(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!response.ok) throw new Error(await readError(response));
      setToken((await response.json()).access_token);
    } catch (caught) { setError(caught.message || "Falha ao entrar."); }
    finally { setBusy(false); }
  }

  async function classify(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const form = new FormData(); form.append("radiograph", file);
      const response = await fetch(`${API_URL}/radiographs/classify`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!response.ok) throw new Error(await readError(response));
      setResult(await response.json());
    } catch (caught) { setError(caught.message || "Falha ao classificar a imagem."); }
    finally { setBusy(false); }
  }

  return <main className="classifier-page">
    <div className="classifier-top"><Link to="/" className="classifier-back"><ArrowLeft size={17} /> Voltar ao Brightline</Link><span>Brightline · demonstração</span></div>
    <section className="classifier-card">
      <div className="classifier-heading"><span className="classifier-icon"><Activity size={22} /></span><div><p className="classifier-eyebrow">MODELO NIH CHESTX-RAY14</p><h1>Classificar radiografia</h1><p>Envie uma radiografia de tórax em PNG ou JPEG para obter probabilidades exploratórias.</p></div></div>
      {!token ? <form className="classifier-form" onSubmit={login}>
        <label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="classifier-button" disabled={busy}>{busy ? "Entrando…" : "Entrar na API"}</button>
        <small>A conta precisa estar cadastrada no backend Brightline.</small>
      </form> : <form className="classifier-form" onSubmit={classify}>
        <label className="classifier-upload"><Upload size={20} /><span>{file ? file.name : "Escolha uma radiografia PNG ou JPEG"}</span><input type="file" accept="image/png,image/jpeg" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError(""); }} /></label>
        {file && <img className="classifier-preview" src={preview} alt="Prévia da radiografia selecionada" />}
        <button className="classifier-button" disabled={busy || !file}>{busy ? "Analisando…" : "Classificar imagem"}</button>
        <button type="button" className="classifier-text-button" onClick={() => { setToken(""); setResult(null); setFile(null); }}>Sair</button>
      </form>}
      {error && <p className="classifier-error" role="alert">{error}</p>}
      {result && <section className="classifier-results" aria-live="polite"><h2>Probabilidades do modelo</h2><p>As probabilidades não são diagnósticos. Todas as imagens e classes precisam de revisão profissional.</p>
        {LABELS.map(label => <div className="classifier-score" key={label}><span>{PT[label]}</span><div><i style={{ width: `${Math.max(0, Math.min(100, result.probabilities[label] * 100))}%` }} /></div><strong>{(result.probabilities[label] * 100).toFixed(1)}%</strong></div>)}
        <small>Modelo: {result.model_version} · Corte exploratório: {(result.threshold * 100).toFixed(0)}%</small>
      </section>}
    </section>
    <p className="classifier-disclaimer">Ferramenta experimental treinada em ChestX-ray14. Não substitui avaliação médica nem deve orientar decisões clínicas.</p>
  </main>;
}
