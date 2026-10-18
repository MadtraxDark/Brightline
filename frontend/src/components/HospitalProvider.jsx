import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ACTIVE_HOSPITAL_KEY = "brightline:hospital";
const HOSPITALS_KEY = "brightline:institutions:";

export const HOSPITALS = [
  { id: "hctco_unifeso", name: "HCTCO · UNIFESO" },
  { id: "hospital_sao_jose", name: "Hospital São José · Teresópolis" },
  { id: "beneficencia_portuguesa", name: "Hospital Beneficência Portuguesa · Teresópolis" },
  { id: "outro_hospital", name: "Outro hospital" },
];

export function saveHospitalSelection(userId, ids, activeId, replace = false) {
  if (!userId) return;
  const validIds = ids.filter((id) => HOSPITALS.some((item) => item.id === id));
  const memberships = replace
    ? [...new Set(validIds)]
    : [...new Set([...readHospitals(userId), ...validIds])];
  const active = memberships.includes(activeId) ? activeId : memberships[0];
  try {
    localStorage.setItem(
      `${HOSPITALS_KEY}${userId}`,
      JSON.stringify(memberships),
    );
    if (active)
      localStorage.setItem(`${ACTIVE_HOSPITAL_KEY}:${userId}`, active);
  } catch {
    // O vínculo pode ser configurado depois em Configurações do perfil.
  }
}

const HospitalContext = createContext(null);

function currentUserKey() {
  try {
    const session = JSON.parse(
      sessionStorage.getItem("brightline:session") || "null",
    );
    return session?.user?.id || "preview";
  } catch {
    return "preview";
  }
}

function readHospital(userKey) {
  try {
    const saved = localStorage.getItem(`${ACTIVE_HOSPITAL_KEY}:${userKey}`);
    return HOSPITALS.some((hospital) => hospital.id === saved)
      ? saved
      : "hctco_unifeso";
  } catch {
    return "hctco_unifeso";
  }
}

function readHospitals(userKey) {
  try {
    const session = JSON.parse(
      sessionStorage.getItem("brightline:session") || "null",
    );
    if (
      session?.user?.id === userKey &&
      Array.isArray(session.user.institutions)
    ) {
      const fromServer = session.user.institutions.filter((id) =>
        HOSPITALS.some((hospital) => hospital.id === id),
      );
      if (fromServer.length) return [...new Set(fromServer)];
    }
    const saved = JSON.parse(
      localStorage.getItem(`${HOSPITALS_KEY}${userKey}`) || "null",
    );
    const valid = Array.isArray(saved)
      ? saved.filter((id) => HOSPITALS.some((hospital) => hospital.id === id))
      : [];
    return valid.length ? [...new Set(valid)] : ["hctco_unifeso"];
  } catch {
    return ["hctco_unifeso"];
  }
}

export function HospitalProvider({ children }) {
  const [userKey, setUserKey] = useState(currentUserKey);
  const [hospitalId, setHospitalId] = useState(() =>
    readHospital(currentUserKey()),
  );
  const [hospitalIds, setHospitalIds] = useState(() =>
    readHospitals(currentUserKey()),
  );

  const syncUser = useCallback(() => {
    const nextUserKey = currentUserKey();
    if (nextUserKey === userKey) return;
    setUserKey(nextUserKey);
    setHospitalId(readHospital(nextUserKey));
    setHospitalIds(readHospitals(nextUserKey));
  }, [userKey]);

  useEffect(() => {
    const nextUserKey = currentUserKey();
    if (nextUserKey === userKey) return;
    setUserKey(nextUserKey);
    setHospitalId(readHospital(nextUserKey));
    setHospitalIds(readHospitals(nextUserKey));
  }, [userKey]);

  useEffect(() => {
    document.documentElement.dataset.hospital = hospitalId;
    try {
      localStorage.setItem(`${ACTIVE_HOSPITAL_KEY}:${userKey}`, hospitalId);
    } catch {
      // A seleção ainda vale enquanto o painel estiver aberto.
    }
  }, [hospitalId, userKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `${HOSPITALS_KEY}${userKey}`,
        JSON.stringify(hospitalIds),
      );
    } catch {
      // Os vínculos continuam disponíveis enquanto o painel estiver aberto.
    }
    if (!hospitalIds.includes(hospitalId)) {
      setHospitalId(hospitalIds[0] || "hctco_unifeso");
    }
  }, [hospitalIds, hospitalId, userKey]);

  const value = useMemo(
    () => ({
      hospitalId,
      userKey,
      hospital: HOSPITALS.find((item) => item.id === hospitalId),
      hospitalIds,
      hospitals: HOSPITALS.filter((item) => hospitalIds.includes(item.id)),
      institutionOptions: HOSPITALS,
      setHospitalId,
      setHospitalIds,
      syncUser,
    }),
    [hospitalId, hospitalIds, syncUser, userKey],
  );

  return (
    <HospitalContext.Provider value={value}>
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error("useHospital precisa estar dentro de HospitalProvider.");
  }
  return context;
}
