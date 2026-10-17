export const PROFILE_KEY = "brightline:profile";

export function readProfile(storage) {
  try {
    const value = JSON.parse(storage.getItem(PROFILE_KEY) || "{}");
    return {
      name: typeof value?.name === "string" ? value.name.slice(0, 80) : "",
      photo:
        typeof value?.photo === "string" &&
        /^data:image\/(png|jpeg|webp);base64,/.test(value.photo)
          ? value.photo
          : "",
    };
  } catch {
    return { name: "", photo: "" };
  }
}

export function saveProfile(storage, profile) {
  storage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
