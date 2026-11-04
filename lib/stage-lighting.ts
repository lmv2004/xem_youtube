export type StageLighting = {
  type: "beams" | "spots" | "wash";
  palette: "violet" | "sunset" | "ocean" | "forest" | "rainbow";
  motion: "static" | "slow" | "medium" | "fast";
  pulse: "off" | "slow" | "medium" | "fast";
  brightness: number;
};
export function isStageLighting(value: unknown): value is StageLighting {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    ["beams", "spots", "wash"].some((x) => x === v.type) &&
    ["violet", "sunset", "ocean", "forest", "rainbow"].some(
      (x) => x === v.palette,
    ) &&
    ["static", "slow", "medium", "fast"].some((x) => x === v.motion) &&
    ["off", "slow", "medium", "fast"].some((x) => x === v.pulse) &&
    typeof v.brightness === "number" &&
    Number.isInteger(v.brightness) &&
    v.brightness >= 20 &&
    v.brightness <= 100 &&
    Object.keys(v).every((key) =>
      ["type", "palette", "motion", "pulse", "brightness"].includes(key),
    )
  );
}
export const DEFAULT_STAGE_LIGHTING: StageLighting = {
  type: "beams",
  palette: "violet",
  motion: "slow",
  pulse: "off",
  brightness: 60,
};
export function normalizeStageLighting(value: unknown): StageLighting {
  return isStageLighting(value) ? { ...value } : { ...DEFAULT_STAGE_LIGHTING };
}
const PALETTES = {
  violet: ["183 165 250", "112 201 208", "183 165 250"],
  sunset: ["251 146 60", "244 114 182", "253 186 116"],
  ocean: ["56 189 248", "129 140 248", "103 232 249"],
  forest: ["110 231 183", "163 230 53", "94 234 212"],
  rainbow: ["244 114 182", "56 189 248", "250 204 21"],
};
export function stageLightingStyle(value: unknown) {
  const config = normalizeStageLighting(value);
  const colors = PALETTES[config.palette];
  return {
    "--concert-a": colors[0],
    "--concert-b": colors[1],
    "--concert-c": colors[2],
    "--concert-speed": {
      static: "11s",
      slow: "11s",
      medium: "7s",
      fast: "4.5s",
    }[config.motion],
    "--concert-pulse": { off: "4s", slow: "4s", medium: "2.5s", fast: "1.5s" }[
      config.pulse
    ],
    "--concert-level": String(config.brightness / 100),
  };
}
