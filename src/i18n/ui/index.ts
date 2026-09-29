import type { Lang } from "../index";
import { de } from "./de";
import { en } from "./en";

export type UI = typeof en;
export const ui: Record<Lang, UI> = { en, de };
