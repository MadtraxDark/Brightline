import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserRound,
  Stethoscope,
} from "lucide-react";
import logo from "../public/logo/logo-text.svg";
import {
  isAuthenticated,
  login,
  register,
  validateSession,
  safeRedirectPath,
  validateLogin,
  validateRegistration,
} from "../lib/session.js";

export default function Login({ mode = "login" }) {
  const registering = mode === "register";
  const navigate = useNavigate();
  const location = useLocation();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const nameRef = useRef(null);
  const confirmationRef = useRef(null);
  const nameErrorId = useId();
  const confirmationErrorId = useId();
  const passwordHintId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [registered, setRegistered] = useState(false);
  const successRef = useRef(null);

  useEffect(() => {
    if (registered) successRef.current?.focus();
  }, [registered]);

  const authedOnLoad = useRef(isAuthenticated(sessionStorage));

  useEffect(() => {
    const previous = document.title;
    document.title = registering
      ? "Criar conta | Brightline"
      : "Entrar | Brightline";
    let active = true;
    if (authedOnLoad.current) {
      validateSession(sessionStorage)
        .then((user) => {
          if (active && user)
            navigate(safeRedirectPath(location.state?.from), { replace: true });
        })
        .catch((error) => {
          if (active) setServerError(error.message);
        });
    }
    return () => {
      active = false;
      document.title = previous;
    };
  }, [navigate, registering, location.state?.from]);

  async function onSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setServerError("");
    const data = new FormData(event.currentTarget);
    const nextErrors = registering
      ? validateRegistration(
          data.get("name"),
          data.get("email"),
          data.get("password"),
          data.get("confirmation"),
        )
      : validateLogin(data.get("email"), data.get("password"));
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else if (nextErrors.password) passwordRef.current?.focus();
      else confirmationRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      const credentials = {
        email: data.get("email"),
        password: data.get("password"),
      };
      if (registering) {
        await register({ ...credentials, name: data.get("name") });
        setRegistered(true);
      } else {
        await login(sessionStorage, credentials);
        navigate(safeRedirectPath(location.state?.from), { replace: true });
      }
    } catch (error) {
      setServerError(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`login-page${registering ? " register-page" : ""}`}>
      <aside
        className="login-brand-panel"
        aria-label="Brightline, inteligência clínica"
      >
        <Link
          className="brand-image login-logo"
          to="/"
          aria-label="Brightline — voltar à página inicial"
          translate="no"
        >
          <img src={logo} alt="Brightline" width="180" height="68" />
        </Link>
        <div className="login-brand-message">
          <span className="login-brand-line" aria-hidden="true" />
          <h2>
            Mais clareza.
            <br />
            Em cada laudo.
          </h2>
          <p>Um espaço para revisar achados e acompanhar o próximo passo.</p>
        </div>
        <div className="login-brand-footer">
          <Stethoscope size={20} aria-hidden="true" />
          <span>IA sugere. O médico valida.</span>
        </div>
      </aside>
      <div className="login-main">
        <header className="login-topline">
          <span>Inteligência clínica</span>
        </header>
        <main className="login-card" aria-labelledby="login-title">
          {registered ? (
            <>
              <h1 id="login-title" ref={successRef} tabIndex={-1}>
                Conta criada com sucesso!
              </h1>
              <p className="login-lead" role="status">
                Agora, entre com seu e-mail e senha para acessar o Brightline.
              </p>
              <Link
                className="login-submit"
                to="/login"
                state={location.state}
                replace
              >
                Ir para o login <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <h1 id="login-title">
                {registering ? "Crie sua conta." : "Bem-vindo de volta."}
              </h1>
              <p className="login-lead">
                {registering
                  ? "Comece a organizar seus laudos em um só lugar."
                  : "Entre para acompanhar seus laudos."}
              </p>
              <form className="login-form" onSubmit={onSubmit} noValidate>
                {registering ? (
                  <div>
                    <label htmlFor="register-name">Nome completo</label>
                    <div
                      className={`login-control${errors.name ? " has-error" : ""}`}
                    >
                      <UserRound size={18} aria-hidden="true" />
                      <input
                        id="register-name"
                        ref={nameRef}
                        name="name"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        placeholder="Seu nome completo"
                        onInput={() =>
                          setErrors((current) => ({
                            ...current,
                            name: undefined,
                          }))
                        }
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? nameErrorId : undefined}
                      />
                    </div>
                    {errors.name ? (
                      <p className="login-error" id={nameErrorId} role="alert">
                        {errors.name}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div>
                  <label htmlFor="login-email">E-mail</label>
                  <div
                    className={`login-control${errors.email ? " has-error" : ""}`}
                  >
                    <Mail size={18} aria-hidden="true" />
                    <input
                      id="login-email"
                      ref={emailRef}
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      spellCheck={false}
                      onInput={() =>
                        setErrors((current) => ({
                          ...current,
                          email: undefined,
                        }))
                      }
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? emailErrorId : undefined}
                    />
                  </div>
                  {errors.email ? (
                    <p className="login-error" id={emailErrorId} role="alert">
                      {errors.email}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="login-password">Senha</label>
                  <div
                    className={`login-control${errors.password ? " has-error" : ""}`}
                  >
                    <Lock size={18} aria-hidden="true" />
                    <input
                      id="login-password"
                      ref={passwordRef}
                      className="login-secret"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete={
                        registering ? "new-password" : "current-password"
                      }
                      minLength={registering ? 9 : undefined}
                      maxLength={256}
                      placeholder={
                        registering ? "Crie uma senha" : "Digite sua senha"
                      }
                      onInput={() =>
                        setErrors((current) => ({
                          ...current,
                          password: undefined,
                        }))
                      }
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={
                        [
                          registering ? passwordHintId : null,
                          errors.password ? passwordErrorId : null,
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    />
                    <button
                      type="button"
                      className="login-reveal"
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                      aria-controls={
                        registering
                          ? "login-password register-confirmation"
                          : "login-password"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} aria-hidden="true" />
                      ) : (
                        <Eye size={18} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {registering ? (
                    <p className="login-field-hint" id={passwordHintId}>
                      Use pelo menos 9 caracteres.
                    </p>
                  ) : null}
                  {errors.password ? (
                    <p
                      className="login-error"
                      id={passwordErrorId}
                      role="alert"
                    >
                      {errors.password}
                    </p>
                  ) : null}
                </div>
                {registering ? (
                  <div>
                    <label htmlFor="register-confirmation">
                      Confirmar senha
                    </label>
                    <div
                      className={`login-control${errors.confirmation ? " has-error" : ""}`}
                    >
                      <Lock size={18} aria-hidden="true" />
                      <input
                        id="register-confirmation"
                        ref={confirmationRef}
                        name="confirmation"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        maxLength={256}
                        placeholder="Repita sua senha"
                        onInput={() =>
                          setErrors((current) => ({
                            ...current,
                            confirmation: undefined,
                          }))
                        }
                        aria-invalid={errors.confirmation ? true : undefined}
                        aria-describedby={
                          errors.confirmation ? confirmationErrorId : undefined
                        }
                      />
                    </div>
                    {errors.confirmation ? (
                      <p
                        className="login-error"
                        id={confirmationErrorId}
                        role="alert"
                      >
                        {errors.confirmation}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {serverError ? (
                  <p className="login-error" role="alert">
                    {serverError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="login-submit"
                  disabled={pending}
                >
                  {pending
                    ? registering
                      ? "Criando conta…"
                      : "Entrando…"
                    : registering
                      ? "Criar conta"
                      : "Entrar no Brightline"}{" "}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </form>
              <p className="auth-switch">
                {registering ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
                <Link
                  to={registering ? "/login" : "/cadastro"}
                  state={location.state}
                >
                  {registering ? "Entrar" : "Criar conta"}
                </Link>
              </p>
            </>
          )}
          <p className="auth-switch">
            <Link to="/">Voltar ao site</Link>
          </p>
          <div className="login-account-note">
            <div>
              <h2>
                {registering ? "Sua conta no Brightline" : "Acesse sua conta"}
              </h2>
              <p>
                {registering
                  ? "Crie sua conta com nome, e-mail e uma senha de pelo menos 9 caracteres. Seus dados de acesso ficam salvos para os próximos logins."
                  : "Entre com o e-mail e a senha que você cadastrou para acompanhar seus laudos."}
              </p>
            </div>
          </div>
        </main>
        <footer className="login-footer">
          <span>© 2026 Brightline</span>
          <span>Feito para apoiar o cuidado.</span>
        </footer>
      </div>
    </div>
  );
}
