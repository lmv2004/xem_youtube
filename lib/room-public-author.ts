export function roomPublicAuthor(id: string, nickname?: string | null, image?: string | null) {
    const name = nickname?.replace(/\s+/g, " ").trim().slice(0, 60);
    return { id, name: name && !name.includes("@") ? name : "Khách", image: image ?? null };
}
