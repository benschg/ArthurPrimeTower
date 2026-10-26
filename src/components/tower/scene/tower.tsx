import { PAC_FLOOR } from "../pacman/maze";
import { ConfettiCannons } from "./cannons";
import { Entrances } from "./entrances";
import { FloorLabel, FloorSlices, Structure } from "./floors";
import { GlassStages } from "./glass";
import { Interiors } from "./interiors";
import { MaintenanceUnit } from "./maintenance";
import { PacmanBoard } from "./pacman";
import { Roof } from "./roof";
import type { SceneProps } from "./types";

/**
 * The tower: its glass, floor plates and their fit-out, the roof with the cleaning cradle, the
 * entrances, and what the games on the tower put on it.
 */
export function Tower({
  night,
  showTenants,
  explode,
  hovered,
  selected,
  cleaning,
  typing,
  pacman,
  lang,
  onHover,
  onSelect,
  onStartCleaning,
  onCleanProgress,
  onHoverUnit,
  busy,
  interiorsActive,
}: SceneProps & {
  /** a game owns the facade and the pointer */
  busy: boolean;
  /** the interiors are mounted (the stack is exploded or a floor is out) */
  interiorsActive: boolean;
}) {
  const labelFloor = selected ?? hovered;
  return (
    <group>
      <GlassStages night={night} dim={showTenants || explode} lively={!busy} />
      <Roof night={night} party={cleaning.active && cleaning.progress >= 0.99}>
        <MaintenanceUnit cleaning={cleaning} onStart={onStartCleaning} onProgress={onCleanProgress} onHoverUnit={onHoverUnit} />
      </Roof>
      <Structure visible={showTenants && !explode} />
      <FloorSlices showTenants={showTenants} explode={explode} hovered={hovered} selected={selected} onHover={onHover} onSelect={onSelect} interactive={!busy} />
      <Interiors active={interiorsActive} hideFloor={pacman ? PAC_FLOOR : -1} />
      {pacman && <PacmanBoard lang={lang} />}
      <Entrances />
      <ConfettiCannons active={typing} />
      {labelFloor !== null && !busy && selected === null && <FloorLabel floor={labelFloor} explode={explode} lang={lang} />}
    </group>
  );
}
