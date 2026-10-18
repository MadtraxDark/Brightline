import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";

export default function ProfileMenu({ profile, onLogout }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const menuId = useId();
  const { pathname } = useLocation();
  const displayName = profile.name?.trim() || "Meu perfil";
  const initials = profile.name
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((_, index, names) => index === 0 || index === names.length - 1)
    .map((name) => name[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector('[role="menuitem"]')?.focus();
    const closeOutside = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const items = [...menu.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    }
  }

  return (
    <div
      className="profile-menu"
      ref={container}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="profile-trigger"
        aria-label="Menu de perfil"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className="profile-avatar">
          {profile.photo ? (
            <img src={profile.photo} alt="" width="36" height="36" />
          ) : initials ? (
            <span aria-hidden="true">{initials}</span>
          ) : (
            <UserRound size={20} aria-hidden="true" />
          )}
        </span>
        <span className="profile-trigger-name" title={displayName}>
          {displayName}
        </span>
        <ChevronDown className="profile-chevron" size={15} aria-hidden="true" />
      </button>
      {open ? (
        <div className="profile-dropdown">
          <div className="profile-menu-heading">
            <strong>{profile.name || "Meu perfil"}</strong>
            <span>Ambiente de trabalho</span>
          </div>
          <div ref={menu} role="menu" id={menuId} aria-label="Opções do perfil">
            <Link
              role="menuitem"
              tabIndex={-1}
              to="/configuracoes"
              onClick={() => setOpen(false)}
            >
              <Settings size={17} aria-hidden="true" />
              Configurações
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={onLogout}
            >
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
