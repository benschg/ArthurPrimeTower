import * as THREE from "three";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { PLATE_LIFT, type ExtractState } from "../Interiors";
import { INTERIOR_BASE } from "../interiorLayout";
import { DRAWING_ROT_Y, drawingToWorld, growPolygon, stageForFloor } from "../geometry";
import { RISE_TIME, type Ghost, type PacGame } from "../pacman/game";
import { CELL, PAC_FLOOR, getMaze, idx, type Cell } from "../pacman/maze";
import { pacman, usePacmanHud } from "../pacman/store";
import { AX_Y, extrudeUp, shapeFrom } from "./helpers";

// Heights and radii in cells (one cell is CELL metres).
const WALL_H = 0.42;
const CORE_H = 0.62;
const PAC_R = 0.4;
const GHOST_R = 0.4;
const GHOST_H = 0.3; // straight part of the body, under the dome
const MOUTHS = 8;
/**
 * The player has its eyes on top of its head, either side of the mouth: the board is seen
 * from above. Azimuth is measured from the way it faces, so the widest mouth stays clear.
 */
const PAC_EYE = { azimuth: 1.0, elevation: 0.85 };
const GHOST_COLORS = ["#ff2a1f", "#ff6fc4", "#12cfe0", "#ff9416"];
const FRIGHT_COLOR = "#2438e8";
const WALL_COLOR = "#0a1a8f";
const WALL_GLOW = "#1430e0";
const WALL_GLOW_AMT = 0.4;

/**
 * The board is drawn into the front slice of the depth range, which the rest of the scene
 * (anything more than about a metre from the camera) never reaches. So the tower or a
 * neighbour that happens to cross the plate cannot cut into the board, while the board's
 * own pieces still hide one another as usual.
 */
const FRONT_SLICE = 0.1;
const toFront = (renderer: THREE.WebGLRenderer) => renderer.getContext().depthRange(0, FRONT_SLICE);
const toScene = (renderer: THREE.WebGLRenderer) => renderer.getContext().depthRange(0, 1);

const smooth = (v: number, a: number, b: number) => {
  const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Dome on a short cylinder with a scalloped hem: the arcade ghost, in the round. */
function ghostGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.SphereGeometry(GHOST_R, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, GHOST_H, 0),
    new THREE.CylinderGeometry(GHOST_R, GHOST_R, GHOST_H, 20, 1, true).translate(0, GHOST_H / 2, 0),
    new THREE.CircleGeometry(GHOST_R, 20).rotateX(Math.PI / 2),
  ];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    parts.push(new THREE.SphereGeometry(GHOST_R * 0.36, 8, 6).translate(Math.cos(a) * GHOST_R * 0.66, 0, Math.sin(a) * GHOST_R * 0.66));
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** How far a ghost is out of its lift: 0 down in the shaft, 1 on the floor. */
function outOfLift(gh: Ghost): number {
  if (gh.mode === "wait") return 0;
  if (gh.mode === "rise") return 1 - gh.t / RISE_TIME;
  if (gh.mode === "sink") return gh.t / 0.5;
  return 1;
}

/**
 * The game board on the pulled-out plate of floor 13: maze walls, the cores with their lift
 * doors, the dots, the player and the ghosts. It rides the plate's camera-bound transform,
 * steps the game once per frame, and tells the game where the grid's axes point on screen.
 */
export function PacmanBoard({ extractRef, lang }: { extractRef: RefObject<ExtractState>; lang: Lang }) {
  const maze = useMemo(() => getMaze(), []);
  const cells = useMemo(() => {
    const walls: Cell[] = [];
    const cores: Cell[] = [];
    const dots: Cell[] = [];
    const powers: Cell[] = [];
    let sx = 0;
    let sy = 0;
    let lanes = 0;
    for (let y = 0; y < maze.h; y++) {
      for (let x = 0; x < maze.w; x++) {
        const i = idx(maze, x, y);
        if (maze.core[i]) cores.push({ x, y });
        else if (maze.lane[i]) {
          sx += x;
          sy += y;
          lanes++;
          if (maze.pellets[i] === 2) powers.push({ x, y });
          else if (maze.pellets[i] === 1) dots.push({ x, y });
        } else if (maze.floor[i]) walls.push({ x, y });
      }
    }
    return { walls, cores, dots, powers, centre: { x: sx / Math.max(1, lanes), y: sy / Math.max(1, lanes) } };
  }, [maze]);

  const geos = useMemo(() => {
    const poly = stageForFloor(PAC_FLOOR).polygon;
    const rimShape = shapeFrom(growPolygon(poly, -0.1));
    rimShape.holes.push(shapeFrom(growPolygon(poly, -0.45)));
    const rim = new THREE.ExtrudeGeometry(rimShape, { depth: WALL_H * CELL, bevelEnabled: false });
    rim.rotateX(-Math.PI / 2);
    return {
      slab: extrudeUp(growPolygon(poly, -0.1), 0.06),
      rim,
      box: new THREE.BoxGeometry(1, 1, 1),
      dot: new THREE.SphereGeometry(0.11, 10, 8),
      power: new THREE.SphereGeometry(0.27, 14, 10),
      ghost: ghostGeometry(),
      eye: new THREE.SphereGeometry(0.115, 10, 8),
      pupil: new THREE.SphereGeometry(0.06, 8, 6),
      pacEye: new THREE.SphereGeometry(0.075, 10, 8),
      pacGlint: new THREE.SphereGeometry(0.028, 6, 5),
      // the player: a ball with a wedge cut out, one geometry per mouth opening
      mouths: Array.from({ length: MOUTHS }, (_, i) => {
        const open = 0.04 + (i / (MOUTHS - 1)) * 1.3;
        return new THREE.SphereGeometry(PAC_R, 28, 18, open / 2, Math.PI * 2 - open);
      }),
    };
  }, []);
  useEffect(
    () => () => {
      for (const g of Object.values(geos)) (Array.isArray(g) ? g : [g]).forEach((x) => x.dispose());
    },
    [geos],
  );

  const root = useRef<THREE.Group>(null);
  const rise = useRef<THREE.Group>(null);
  const walls = useRef<THREE.InstancedMesh>(null);
  const cores = useRef<THREE.InstancedMesh>(null);
  const dots = useRef<THREE.InstancedMesh>(null);
  const powers = useRef<THREE.InstancedMesh>(null);
  const pac = useRef<THREE.Group>(null);
  const pacBody = useRef<THREE.Mesh>(null);
  const ghosts = useRef<(THREE.Group | null)[]>([]);
  const wallMat = useRef<THREE.MeshStandardMaterial>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);
  const drawn = useRef<{ game: PacGame | null; left: number; level: number }>({ game: null, left: -1, level: 0 });
  const fly = useRef([0, 0, 0, 0]);
  const last = useRef(maze.ghosts.map((g) => ({ x: g.lift.x, y: g.lift.y })));
  const banner = useRef<HTMLDivElement>(null);
  const tmp = useRef({ o: new THREE.Object3D(), v: new THREE.Vector3(), q: new THREE.Quaternion(), c: new THREE.Color() });

  // Every mesh of the board switches the depth range for its own draw call.
  useLayoutEffect(() => {
    root.current?.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      o.onBeforeRender = toFront;
      o.onAfterRender = toScene;
    });
  }, []);

  // Walls and cores never move: place the instances once.
  useLayoutEffect(() => {
    const o = tmp.current.o;
    o.rotation.set(0, 0, 0);
    cells.walls.forEach((c, i) => {
      o.position.set(c.x, WALL_H / 2, c.y);
      o.scale.set(1, WALL_H, 1);
      o.updateMatrix();
      walls.current?.setMatrixAt(i, o.matrix);
    });
    cells.cores.forEach((c, i) => {
      o.position.set(c.x, CORE_H / 2, c.y);
      o.scale.set(1, CORE_H, 1);
      o.updateMatrix();
      cores.current?.setMatrixAt(i, o.matrix);
    });
    if (walls.current) walls.current.instanceMatrix.needsUpdate = true;
    if (cores.current) cores.current.instanceMatrix.needsUpdate = true;
  }, [cells]);

  useFrame((st, dt) => {
    const ex = extractRef.current;
    const g = pacman.game;
    if (!root.current || !rise.current || !ex) return;
    const out = ex.floor === PAC_FLOOR;
    root.current.visible = out && ex.t > 0.02 && !!g;
    // the banner is HTML and does not follow the group's visibility
    if (banner.current) banner.current.style.opacity = out && g && ex.t > 0.8 ? "1" : "0";
    if (!out || !g) return;
    root.current.position.copy(ex.pos);
    root.current.quaternion.copy(ex.quat);
    // the board grows out of the plate as it arrives
    rise.current.scale.set(1, Math.max(0.001, smooth(ex.t, 0.35, 0.95)), 1);

    // Where the grid's axes point on screen: an arrow key then means what it looks like,
    // however the plate has been turned.
    const { v, q, o, c } = tmp.current;
    q.copy(st.camera.quaternion).invert();
    v.set(1, 0, 0).applyAxisAngle(AX_Y, DRAWING_ROT_Y).applyQuaternion(ex.quat).applyQuaternion(q);
    let len = Math.hypot(v.x, v.y) || 1;
    g.basis.x = [v.x / len, v.y / len];
    v.set(0, 0, 1).applyAxisAngle(AX_Y, DRAWING_ROT_Y).applyQuaternion(ex.quat).applyQuaternion(q);
    len = Math.hypot(v.x, v.y) || 1;
    g.basis.y = [v.x / len, v.y / len];

    // the clock only runs once the plate is out in front
    if (ex.t > 0.85) pacman.frame(dt);
    const t = g.clock;

    // dots: redrawn when one is eaten or a new level lays them out again
    const d = drawn.current;
    if (dots.current && (d.game !== g || d.left !== g.left || d.level !== g.level)) {
      o.rotation.set(0, 0, 0);
      cells.dots.forEach((cell, i) => {
        o.position.set(cell.x, 0.3, cell.y);
        o.scale.setScalar(g.pellets[idx(maze, cell.x, cell.y)] ? 1 : 0);
        o.updateMatrix();
        dots.current?.setMatrixAt(i, o.matrix);
      });
      dots.current.instanceMatrix.needsUpdate = true;
      drawn.current = { game: g, left: g.left, level: g.level };
    }
    if (powers.current) {
      o.rotation.set(0, 0, 0);
      cells.powers.forEach((cell, i) => {
        o.position.set(cell.x, 0.36, cell.y);
        o.scale.setScalar(g.pellets[idx(maze, cell.x, cell.y)] ? 1 + 0.25 * Math.sin(t * 7 + i) : 0);
        o.updateMatrix();
        powers.current?.setMatrixAt(i, o.matrix);
      });
      powers.current.instanceMatrix.needsUpdate = true;
    }

    // walls flash when the floor is cleared
    const flash = g.phase === "clear" && Math.sin(t * 14) > 0;
    for (const m of [wallMat.current, rimMat.current]) {
      if (!m) continue;
      m.emissive.set(flash ? "#ffffff" : WALL_GLOW);
      m.emissiveIntensity = flash ? 0.9 : WALL_GLOW_AMT;
    }

    // the player: the mouth faces the way it goes and chomps while it moves
    if (pac.current && pacBody.current) {
      const p = g.pac;
      const moving = g.phase === "play" && (p.dir.x !== 0 || p.dir.y !== 0);
      const chomp = moving ? Math.abs(Math.sin(t * 13)) : 0.45;
      pacBody.current.geometry = geos.mouths[Math.round(chomp * (MOUTHS - 1))];
      pac.current.position.set(p.x, PAC_R + 0.04, p.y);
      pac.current.rotation.y = Math.atan2(p.facing.y, -p.facing.x);
      // caught: it spins and shrinks away
      const gone = g.phase === "caught" ? 1 - smooth(g.phaseT, 0, 1.3) : 0;
      if (gone > 0) pac.current.rotation.y += gone * 9;
      pac.current.scale.setScalar(g.phase === "over" ? 0 : Math.max(0.001, 1 - gone));
    }

    g.ghosts.forEach((gh, i) => {
      const node = ghosts.current[i];
      if (!node) return;
      const up = outOfLift(gh);
      const eaten = gh.mode === "eyes" || gh.mode === "sink";
      // over the cores (and on the way home) a ghost floats above the blocks
      const flying = gh.mode !== "hunt" && gh.mode !== "fright";
      fly.current[i] = THREE.MathUtils.damp(fly.current[i], flying ? CORE_H + 0.12 : 0.12, 9, dt);
      node.visible = up > 0.01 && g.phase !== "over" && !(g.phase === "caught" && g.phaseT < 1.1);
      node.position.set(gh.x, fly.current[i] + 0.05 * Math.sin(t * 5 + i * 1.7) - (1 - up) * 0.5, gh.y);
      node.scale.set(1, Math.max(0.05, up), 1);
      // face the way it moves, lanes or not
      const prev = last.current[i];
      const mx = gh.x - prev.x;
      const my = gh.y - prev.y;
      if (Math.abs(mx) + Math.abs(my) > 1e-4) node.rotation.y = Math.atan2(mx, my);
      prev.x = gh.x;
      prev.y = gh.y;
      const body = node.children[0] as THREE.Mesh;
      const mat = body.material as THREE.MeshStandardMaterial;
      body.visible = !eaten;
      if (gh.mode === "fright") {
        // blinks white when the fright is about to end
        const blink = g.fright < 1.8 && Math.sin(t * 22) > 0;
        c.set(blink ? "#f4f6ff" : FRIGHT_COLOR);
      } else c.set(GHOST_COLORS[i]);
      mat.color.copy(c);
      mat.emissive.copy(c);
    });
  });

  const [ox, oz] = drawingToWorld([maze.x0, maze.y0]);
  return (
    <group ref={root} visible={false}>
      <group ref={rise} position={[0, INTERIOR_BASE - PLATE_LIFT, 0]}>
        <mesh geometry={geos.slab}>
          <meshStandardMaterial color="#080c1f" roughness={0.85} />
        </mesh>
        <mesh geometry={geos.rim}>
          <meshStandardMaterial ref={rimMat} color={WALL_COLOR} emissive={WALL_GLOW} emissiveIntensity={WALL_GLOW_AMT} roughness={0.75} />
        </mesh>
        {/* everything below is in grid coordinates: x and z count cells along the plan's axes */}
        <group position={[ox, 0.06, -oz]} rotation={[0, DRAWING_ROT_Y, 0]} scale={CELL}>
          <instancedMesh ref={walls} args={[geos.box, undefined, Math.max(1, cells.walls.length)]} frustumCulled={false}>
            <meshStandardMaterial ref={wallMat} color={WALL_COLOR} emissive={WALL_GLOW} emissiveIntensity={WALL_GLOW_AMT} roughness={0.75} />
          </instancedMesh>
          <instancedMesh ref={cores} args={[geos.box, undefined, Math.max(1, cells.cores.length)]} frustumCulled={false}>
            <meshStandardMaterial color="#39424f" roughness={0.9} />
          </instancedMesh>
          {/* lift doors on top of the cores; the four the ghosts use glow in their colours */}
          {maze.lifts.map((l, i) => {
            const owner = maze.ghosts.findIndex((gh) => gh.lift === l);
            return (
              <mesh key={i} geometry={geos.box} position={[l.x, CORE_H + 0.02, l.y]} scale={[1.05, 0.04, 1.05]}>
                {owner >= 0 ? <meshBasicMaterial color={GHOST_COLORS[owner]} toneMapped={false} /> : <meshStandardMaterial color="#6b7686" roughness={0.4} metalness={0.5} />}
              </mesh>
            );
          })}
          <instancedMesh ref={dots} args={[geos.dot, undefined, Math.max(1, cells.dots.length)]} frustumCulled={false}>
            <meshBasicMaterial color="#ffd9b0" toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={powers} args={[geos.power, undefined, Math.max(1, cells.powers.length)]} frustumCulled={false}>
            <meshBasicMaterial color="#fff3d6" toneMapped={false} />
          </instancedMesh>
          <group ref={pac}>
            <mesh ref={pacBody} geometry={geos.mouths[3]}>
              <meshStandardMaterial color="#ffd91a" emissive="#b98a00" emissiveIntensity={0.7} roughness={0.45} side={THREE.DoubleSide} />
            </mesh>
            {/* the mouth opens toward local -x; an eye sits on the skin either side of it */}
            {[-1, 1].map((side) => {
              const ce = Math.cos(PAC_EYE.elevation);
              const dir: [number, number, number] = [-ce * Math.cos(PAC_EYE.azimuth), Math.sin(PAC_EYE.elevation), side * ce * Math.sin(PAC_EYE.azimuth)];
              return (
                <group key={side} position={[dir[0] * PAC_R, dir[1] * PAC_R, dir[2] * PAC_R]}>
                  <mesh geometry={geos.pacEye}>
                    <meshBasicMaterial color="#1b1408" toneMapped={false} />
                  </mesh>
                  <mesh geometry={geos.pacGlint} position={[-0.035, 0.05, 0]}>
                    <meshBasicMaterial color="#ffffff" toneMapped={false} />
                  </mesh>
                </group>
              );
            })}
          </group>
          {maze.ghosts.map((_, i) => (
            <group
              key={i}
              ref={(n) => {
                ghosts.current[i] = n;
              }}
              visible={false}
            >
              <mesh geometry={geos.ghost}>
                <meshStandardMaterial color={GHOST_COLORS[i]} emissive={GHOST_COLORS[i]} emissiveIntensity={0.22} roughness={0.65} />
              </mesh>
              {[-1, 1].map((side) => (
                <group key={side} position={[side * GHOST_R * 0.42, GHOST_H + GHOST_R * 0.5, GHOST_R * 0.7]}>
                  <mesh geometry={geos.eye}>
                    <meshBasicMaterial color="#ffffff" toneMapped={false} />
                  </mesh>
                  <mesh geometry={geos.pupil} position={[0, 0.03, 0.075]}>
                    <meshBasicMaterial color="#10205a" toneMapped={false} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          <Banner lang={lang} position={[cells.centre.x, 1.4, cells.centre.y]} el={banner} />
        </group>
      </group>
    </group>
  );
}

/** READY! before a round, GAME OVER after the last life; floats over the board. */
function Banner({ lang, position, el }: { lang: Lang; position: [number, number, number]; el: RefObject<HTMLDivElement | null> }) {
  const hud = usePacmanHud();
  const t = ui[lang].pacman;
  const text = hud.phase === "ready" ? t.ready : hud.phase === "over" ? t.over : hud.phase === "clear" ? t.cleared : "";
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div
        ref={el}
        className="whitespace-nowrap font-mono text-xl sm:text-3xl font-bold tracking-[0.25em] transition-opacity duration-300"
        style={{ opacity: 0, color: hud.phase === "over" ? "#ff3b30" : "#ffd91a", textShadow: "0 0 12px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.8)" }}
      >
        {text}
      </div>
    </Html>
  );
}
