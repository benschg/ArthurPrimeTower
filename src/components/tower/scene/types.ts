import type { Lang } from "@/i18n";

export type ViewerState = {
  showTenants: boolean;
  showGarage: boolean;
  explode: boolean;
  autoRotate: boolean;
  night: boolean;
  hovered: number | null;
  selected: number | null;
  cleaning: CleanState;
};

export type SceneProps = ViewerState & {
  lang: Lang;
  onHover: (floor: number | null) => void;
  onSelect: (floor: number | null) => void;
  onStartCleaning: () => void;
  onCleanProgress: (progress: number, secondsLeft: number) => void;
  onHoverUnit: (v: boolean) => void;
};

export type CleanState = {
  active: boolean;
  /** 0..1 fraction of the facade cleaned */
  progress: number;
  secondsLeft: number;
};

export type UnitProps = {
  cleaning: CleanState;
  onStart: () => void;
  onProgress: (progress: number, secondsLeft: number) => void;
  onHoverUnit: (v: boolean) => void;
};
