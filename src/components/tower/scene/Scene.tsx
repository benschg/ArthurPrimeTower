import { Atmosphere } from "./atmosphere";
import { CameraControls } from "./camera";
import { Underground } from "./garage";
import { Site } from "./site";
import { StageContext, useNewStage } from "./stage";
import { Tower } from "./tower";
import type { SceneProps } from "./types";
import { useStackMotion } from "./useStackMotion";

/** The whole 3D scene: sky and light, the tower, the site around it, the garage beneath, and the camera. */
export function Scene(props: SceneProps) {
  const { night, showGarage, explode, autoRotate, hovered, selected, cleaning, typing, pacman, crossing, race, lang, onPlayBridge, onHoverBridge } = props;
  // a game owns the facade, the camera and the pointer
  const busy = cleaning.active || typing || crossing || race;
  const stage = useNewStage(night);
  const interiorsActive = useStackMotion(stage, { explode, hovered, selected, busy, pacman });
  return (
    <StageContext.Provider value={stage}>
      <Atmosphere night={night} />
      <Tower {...props} busy={busy} interiorsActive={interiorsActive} />
      <Site lang={lang} interactive={!busy} onPlayBridge={onPlayBridge} onHoverBridge={onHoverBridge} />
      <Underground lang={lang} open={showGarage || explode} busy={busy} />
      <CameraControls
        showGarage={showGarage}
        explode={explode}
        autoRotate={autoRotate}
        facing={cleaning.active ? "cleaning" : typing ? "typing" : crossing ? "crossing" : race ? "race" : "none"}
      />
    </StageContext.Provider>
  );
}
