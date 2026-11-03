/** Public room identity must never fall back to the Google account profile. */
export function roomPublicAuthor(id: string, nickname?: string | null) {
    const name = nickname?.replace(/\s+/g, " ").trim().slice(0, 60);
    return { id, name: name && !name.includes("@") ? name : "Khách", image: null };
}
