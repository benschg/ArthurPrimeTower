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
  /** the typing game has the facade and the camera */
  typing: boolean;
};

export type SceneProps = ViewerState & {
  /** the floor-13 game is on: that floor's plate is the board */
  pacman: boolean;
  /** the Hardbrücke game is on: it has the bridge and the camera */
  crossing: boolean;
  lang: Lang;
  onHover: (floor: number | null) => void;
  onSelect: (floor: number | null) => void;
  onStartCleaning: () => void;
  onCleanProgress: (progress: number, secondsLeft: number) => void;
  onHoverUnit: (v: boolean) => void;
  onStartCrossing: () => void;
  onHoverBridge: (v: boolean) => void;
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
