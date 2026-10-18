import { useState } from "react";
const MOCK_PHYSICIAN_PHOTOS = {
  "Dra. Ana Luz": "/images/physicians/ana-luz.png",
  "Dr. Paulo Mendes": "/images/physicians/paulo-mendes.png",
  "Dr. Caio Ribeiro": "/images/physicians/caio-ribeiro.png",
  "Dra. Marina Lopes": "/images/physicians/marina-lopes.png",
  "Dra. Helena Costa": "/images/physicians/helena-costa.png",
};

export default function PhysicianAvatar({ name, photo }) {
  const [failedPhoto, setFailedPhoto] = useState(null);
  const normalized = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(dr\.?|dra\.?)\s*/i, "")
    .trim()
    .toLowerCase();
  const matched = Object.keys(MOCK_PHYSICIAN_PHOTOS).find(
    (key) =>
      key.replace(/^(dr\.?|dra\.?)\s*/i, "").toLowerCase() === normalized,
  );
  photo = photo || MOCK_PHYSICIAN_PHOTOS[matched];
  const showPhoto = photo && failedPhoto !== photo;
  const initials = String(name || "")
    .replace(/^(dr\.?|dra\.?)\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((_, index, names) => index === 0 || index === names.length - 1)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
  return (
    <span className="physician-avatar" aria-hidden="true">
      {showPhoto ? (
        <img
          key={photo}
          src={photo}
          width="38"
          height="38"
          alt=""
          onError={() => setFailedPhoto(photo)}
        />
      ) : null}
      {!showPhoto && <span>{initials || "—"}</span>}
    </span>
  );
}
