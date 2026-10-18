function patientOf(report) {
  const patient = report?.patient;
  return patient && typeof patient === "object" ? patient : null;
}

function nameOf(patient) {
  return typeof patient?.name === "string" ? patient.name.trim() : "";
}

function ageOf(patient) {
  return typeof patient?.age === "number" && Number.isFinite(patient.age)
    ? patient.age
    : null;
}

export function patientLabel(report) {
  const patient = patientOf(report);
  const name = nameOf(patient);
  if (!name) return null;
  const age = ageOf(patient);
  return age == null ? name : `${name} · ${age}a`;
}

export function patientLine(report) {
  const patient = patientOf(report);
  const name = nameOf(patient);
  if (!name) return null;
  const parts = [name];
  const age = ageOf(patient);
  if (age != null) parts.push(`${age} anos`);
  if (typeof patient.sex === "string" && patient.sex.trim())
    parts.push(patient.sex.trim());
  const record =
    typeof patient.record === "string" ? patient.record.trim() : "";
  const head = parts.join(", ");
  return record ? `${head} · ${record}` : head;
}
