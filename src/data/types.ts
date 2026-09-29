export type Fact = {
  label: string;
  value: string;
  note?: string;
  source?: string;
};

export type Tenant = {
  name: string;
  industry: string;
  floors?: string;
  building: "Prime Tower" | "Cubus" | "Diagonal" | "Platform";
  status: "current" | "former";
  note?: string;
  source?: string;
};

export type Photo = {
  file: string; // path under /public/photos
  title: string;
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
  label: string;
  tenant?: string;
  color: string;
};

export type Source = { title: string; url: string };
