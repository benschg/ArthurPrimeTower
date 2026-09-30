/**
 * The Hardbrücke as a road: three lanes each way and the vehicles on them. Plain numbers, no
 * three.js: the scene draws the vehicles, and the crossing game has to keep clear of them.
 * Everything is in metres in the bridge's own frame: x along the deck from its centre, z across.
 */
import { bridge } from "../geometry";

/** Height of the road surface. */
export const DECK_TOP = bridge.deckHeight + 0.75;
/** Vehicles run the length of the deck and come back on at the other end. */
export const LOOP = bridge.length;
const MIN_GAP = 3; // metres bumper to bumper at a standstill
const SPROUT = 0.35; // seconds a vehicle takes to appear in a gap, or to shrink away

export type Kind = {
  len: number;
  width: number;
  lampY: number;
  /** cruising speed range, m/s */
  speed: [number, number];
  /** body colours; the model's own colours are multiplied by these */
  colors: number[];
};

export const CAR = 0;
export const VAN = 1;
export const BUS = 2;

export const KINDS: Kind[] = [
  { len: 4.4, width: 1.8, lampY: 0.68, speed: [11.5, 16], colors: [0xe8ecef, 0xaab3bb, 0x7f8992, 0x5d666f, 0x2a3037, 0x1b1f24, 0x23344d, 0x3d5a80, 0x8c2f2a, 0x6d7a63] },
  { len: 5.6, width: 2, lampY: 0.75, speed: [11, 14], colors: [0xe8ecef, 0xe8ecef, 0xc9d0d6, 0xf2c14e, 0x4a5560] },
  { len: 12, width: 2.5, lampY: 0.8, speed: [9.5, 11], colors: [0xffffff] },
];

/**
 * One carriageway from the median outwards: two lanes of cars and vans, then the bus lane.
 * Swiss traffic keeps right, so the carriageway heading along the bridge's bearing (+x) is
 * on its +z side; the other one mirrors it.
 */
export const LANE_Z = [3, 6.6, 10.2];
/** No lane ever holds more than this, whatever the flow asks for. */
export const MAX_PER_LANE = 30;

/** How busy the road is: vehicles per lane (median outwards), and how closely and fast they drive. */
export type Flow = {
  counts: [number, number, number];
  /** seconds kept to the vehicle ahead */
  headway: number;
  /** multiplies every vehicle's own cruising speed */
  pace: number;
};

/** Everyday traffic. */
export const CALM: Flow = { counts: [9, 11, 1], headway: 1.3, pace: 1 };

export type Vehicle = {
  kind: number;
  /** body colour, 0xRRGGBB */
  tint: number;
  /** metres along the lane, 0..LOOP */
  p: number;
  v: number;
  /** the speed it would drive on an empty road */
  want: number;
  len: number;
  sx: number;
  sy: number;
  /** 0..1: grows as it appears in a gap, shrinks once it is `leaving` */
  shown: number;
  leaving: boolean;
};

export type Lane = {
  z: number;
  dir: 1 | -1;
  /** index into LANE_Z and Flow.counts */
  tier: number;
  /** sorted back to front */
  list: Vehicle[];
};

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function newVehicle(tier: number): Vehicle {
  const kind = tier === 2 ? BUS : tier === 1 && Math.random() < 0.25 ? VAN : CAR;
  const k = KINDS[kind];
  const sx = kind === CAR ? rand(0.9, 1.1) : 1;
  const want = rand(...k.speed);
  return { kind, tint: pick(k.colors), p: 0, v: want, want, len: k.len * sx, sx, sy: kind === CAR ? rand(0.92, 1.14) : 1, shown: 0, leaving: false };
}

/**
 * Each lane is a ring: vehicles keep their own pace, slow down behind slower ones and come
 * back on at the start as another vehicle. When the flow changes, extra vehicles sprout in
 * the widest gaps, or surplus ones shrink away.
 */
class Road {
  readonly lanes: Lane[] = ([1, -1] as const).flatMap((dir) => LANE_Z.map((z, tier): Lane => ({ z: dir * z, dir, tier, list: [] })));
  flow: Flow = CALM;

  step(dt: number): void {
    for (const lane of this.lanes) {
      this.populate(lane);
      const list = lane.list;
      const n = list.length;
      if (n === 0) continue;
      for (let i = 0; i < n; i++) {
        const c = list[i];
        let target = c.want * this.flow.pace;
        if (n > 1) {
          const lead = list[(i + 1) % n];
          const gap = lead.p - lead.len / 2 - (c.p + c.len / 2) + (i === n - 1 ? LOOP : 0);
          target = Math.min(target, Math.max(0, (gap - MIN_GAP) / this.flow.headway));
        }
        c.v += clamp(target - c.v, -7 * dt, 2.2 * dt);
        c.p += c.v * dt;
        c.shown = clamp(c.shown + (c.leaving ? -dt : dt) / SPROUT, 0, 1);
      }
      // Only the front vehicle can run off the end: it comes back on at the start as another one.
      const front = list[n - 1];
      if (front.p >= LOOP) {
        front.p -= LOOP;
        front.want = rand(...KINDS[front.kind].speed);
        front.tint = pick(KINDS[front.kind].colors);
        list.unshift(list.pop()!);
      }
      for (let i = n - 1; i >= 0; i--) if (list[i].leaving && list[i].shown <= 0) list.splice(i, 1);
    }
  }

  /** The vehicle that a body of radius r standing at (x, z) on the deck touches, if any. */
  hit(x: number, z: number, r: number): Vehicle | null {
    for (const lane of this.lanes) {
      if (Math.abs(lane.z - z) > 1.25 + r) continue;
      for (const c of lane.list) {
        if (c.shown < 0.6 || Math.abs(lane.z - z) > KINDS[c.kind].width / 2 + r) continue;
        if (Math.abs(lane.dir * (c.p - LOOP / 2) - x) < c.len / 2 + r) return c;
      }
    }
    return null;
  }

  /** Bring a lane toward the number of vehicles the flow asks for. */
  private populate(lane: Lane): void {
    const want = Math.min(this.flow.counts[lane.tier], MAX_PER_LANE);
    const staying = lane.list.filter((c) => !c.leaving);
    if (staying.length > want) pick(staying).leaving = true;
    for (let n = staying.length; n < want; n++) if (!this.add(lane)) break;
  }

  /** Put a new vehicle somewhere in the lane's widest gap; false if there is no room. */
  private add(lane: Lane): boolean {
    const list = lane.list;
    const n = list.length;
    const c = newVehicle(lane.tier);
    if (n === 0) {
      c.p = Math.random() * LOOP;
      list.push(c);
      return true;
    }
    let after = 0;
    let room = -Infinity;
    for (let i = 0; i < n; i++) {
      const a = list[i];
      const b = list[(i + 1) % n];
      const free = b.p - b.len / 2 - (a.p + a.len / 2) + (i === n - 1 ? LOOP : 0);
      if (free > room) {
        room = free;
        after = i;
      }
    }
    const margin = MIN_GAP + 1;
    const spare = room - c.len - 2 * margin;
    if (spare < 0) return false;
    const a = list[after];
    c.p = a.p + a.len / 2 + margin + c.len / 2 + rand(0.2, 0.8) * spare;
    c.v = Math.min(c.want * this.flow.pace, list[(after + 1) % n].v);
    if (c.p >= LOOP) {
      c.p -= LOOP;
      list.unshift(c);
    } else list.splice(after + 1, 0, c);
    return true;
  }
}

export type { Road };
export const road = new Road();
