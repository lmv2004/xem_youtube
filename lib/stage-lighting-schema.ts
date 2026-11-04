import { z } from "zod";
import { isStageLighting, type StageLighting } from "./stage-lighting";
/** Keep Zod in server validation; the renderer only needs the lightweight guard. */
export const stageLightingSchema = z.custom<StageLighting>(
  isStageLighting,
  "Invalid stage lighting",
);
