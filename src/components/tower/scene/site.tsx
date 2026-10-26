import * as THREE from "three";
import { memo, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid, Html } from "@react-three/drei";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { neighbours, bridge, bridgePiers, stationPlatform, railway } from "../geometry";
import { extrudeUp } from "./helpers";
import { DAY_GROUND, NIGHT_GROUND } from "./palette";
import { useStage } from "./stage";
import { BridgeTraffic } from "./traffic";
import { Trains } from "./trains";
import { CrossingFrog } from "./crossing";
import { RaceCars } from "./race";

/** Refs that are set once the scene has mounted, which is before any label tests them. */
type Occluders = RefObject<THREE.Object3D>[];

/**
 * A site label, hidden while the tower, a building or the bridge deck stands in front of it.
 * Only those are tested: occlusion against the whole scene would raycast every object in it
 * (stars, traffic, interiors) for every label, every frame.
 */
function SiteLabel({ position, occluders, children }: { position: [number, number, number]; occluders: Occluders; children: ReactNode }) {
  return (
    <Html zIndexRange={[5, 0]} position={position} center occlude={occluders} distanceFactor={220} style={{ pointerEvents: "none" }} className="site-label">
      {children}
    </Html>
  );
}

function Footprint({ polygon, height, color, floors, name, note, occluders }: (typeof neighbours)[number] & { occluders: Occluders }) {
  const geo = useMemo(() => extrudeUp(polygon, height), [polygon, height]);
  const lines = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let f = 1; f < floors; f++) {
      const y = (height * f) / floors;
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        pts.push(new THREE.Vector3(a[0], y, -a[1]), new THREE.Vector3(b[0], y, -b[1]));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [polygon, height, floors]);
  const cx = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#0b0f14" transparent opacity={0.5} />
      </lineSegments>
      {name && (
        <SiteLabel position={[cx, height + 4, -cy]} occluders={occluders}>
          <div className="text-center whitespace-nowrap">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/80">{name}</div>
            {note && <div className="text-[9px] text-muted">{note}</div>}
          </div>
        </SiteLabel>
      )}
    </group>
  );
}

/** The plaza and streets: darker by night, and see-through while the garage beneath shows. */
function Ground() {
  const { blendRef } = useStage();
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const { night, garage } = blendRef.current;
    m.opacity = THREE.MathUtils.lerp(1, 0.12, garage);
    m.color.lerpColors(DAY_GROUND, NIGHT_GROUND, night);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1200, 1200]} />
      {/* Always in the transparent pass with depth writes on. */}
      <meshStandardMaterial ref={mat} color="#161d27" roughness={1} transparent opacity={1} />
    </mesh>
  );
}

export const Site = memo(function Site({
  lang,
  interactive,
  onPlayBridge,
  onHoverBridge,
}: {
  lang: Lang;
  /** no game has the scene: a click on the bridge may start one of those played there */
  interactive: boolean;
  onPlayBridge: () => void;
  onHoverBridge: (v: boolean) => void;
}) {
  const { glassRef } = useStage();
  const buildings = useRef<THREE.Group>(null);
  const deck = useRef<THREE.Mesh>(null);
  // the station sits beneath the deck, and the deck hides its label from above
  const occluders = useMemo(() => [glassRef, buildings, deck] as Occluders, [glassRef]);
  const lab = ui[lang].viewer.labels;
  const bRot = (bridge.bearing * Math.PI) / 180;
  const rRot = (railway.bearing * Math.PI) / 180;
  const station = useMemo(() => extrudeUp(stationPlatform, 1.2), []);
  return (
    <group>
      <Ground />
      <Grid
        renderOrder={1}
        position={[0, 0.03, 0]}
        args={[1200, 1200]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#22303d"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#2e4053"
        fadeDistance={560}
        fadeStrength={1.3}
        infiniteGrid
      />

      <group ref={buildings}>
        {neighbours.map((b, i) => (
          <Footprint key={i} {...b} occluders={occluders} />
        ))}
      </group>

      {/* Hardbrücke elevated road. Rotation about Y by -bearing aligns local +x with the compass bearing. */}
      <group position={[bridge.center[0], 0, -bridge.center[1]]} rotation={[0, Math.PI / 2 - bRot, 0]}>
        {/* The deck: click it to play one of the bridge's games (a drag that ends here is an orbit, not a click) */}
        <mesh
          ref={deck}
          position={[0, bridge.deckHeight, 0]}
          castShadow
          receiveShadow
          onClick={(e) => {
            if (!interactive || e.delta > 4) return;
            e.stopPropagation();
            onPlayBridge();
          }}
          onPointerOver={() => interactive && onHoverBridge(true)}
          onPointerOut={() => onHoverBridge(false)}
        >
          <boxGeometry args={[bridge.length, 1.5, bridge.width]} />
          <meshStandardMaterial color="#2c3641" roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, bridge.deckHeight + 1.2, (s * bridge.width) / 2]}>
            <boxGeometry args={[bridge.length, 1.1, 0.3]} />
            <meshStandardMaterial color="#4a5663" />
          </mesh>
        ))}
        {bridgePiers.map((x) => (
          <mesh key={x} position={[x, bridge.deckHeight / 2, 0]} castShadow>
            <boxGeometry args={[2.4, bridge.deckHeight, bridge.width - 8]} />
            <meshStandardMaterial color="#39434f" />
          </mesh>
        ))}
        <SiteLabel position={[110, bridge.deckHeight + 6, 0]} occluders={occluders}>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/70 whitespace-nowrap">{lab.hardbruecke}</div>
        </SiteLabel>
        <BridgeTraffic />
        <CrossingFrog />
        <RaceCars />
      </group>

      {/* Bahnhof Hardbrücke platform (at ground level beneath the bridge) */}
      <mesh geometry={station} position={[0, 0.05, 0]} receiveShadow>
        <meshStandardMaterial color="#5b6774" roughness={0.9} />
      </mesh>
      <SiteLabel position={[38, 6, 45]} occluders={occluders}>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/70 whitespace-nowrap">{lab.station}</div>
      </SiteLabel>

      {/* Railway corridor south-west of the tower */}
      <group position={[railway.center[0], 0.05, -railway.center[1]]} rotation={[0, Math.PI / 2 - rRot, 0]}>
        {Array.from({ length: railway.tracks }, (_, i) => (
          <mesh key={i} position={[0, 0, (i - (railway.tracks - 1) / 2) * railway.spacing]}>
            <boxGeometry args={[railway.length, 0.1, 1.5]} />
            <meshStandardMaterial color="#3d4956" />
          </mesh>
        ))}
        <Trains />
      </group>
    </group>
  );
});
