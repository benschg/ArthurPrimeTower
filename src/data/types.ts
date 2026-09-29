import type { L } from "@/i18n";

export type Fact = {
  label: L;
  value: string;
  note?: L;
  source?: string;
};

export type Tenant = {
  name: string;
  industry: L;
  floors?: L;
  building: "Prime Tower" | "Cubus" | "Diagonal" | "Platform";
  status: "current" | "former";
  note?: L;
  source?: string;
};

export type Photo = {
  file: string; // path under /public/photos
  title: string;
  titleDe?: string;
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
  width?: number;
  height?: number;
};

export type FloorBand = {
  from: number;
  to: number;
  label: L;
  tenant?: string;
  color: string;
};

export type Source = { title: string; url: string };

export type Plan = { title: L; url: string; note: L; kind: "plan" | "section" | "site" | "pdf" };
