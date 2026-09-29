import { pointInPolygon, type Pt } from "./footprint";
import { cores } from "./structure";

export type Building = {
  name: string;
  polygon: Pt[];
  height: number;
  floors: number;
  color: string;
  note?: string;
};

export const neighbours: Building[] = [
  {
    name: "Cubus",
    polygon: [
      [48.4, 61.9], [51.6, 59.3], [58.1, 54.0], [36.5, 21.6], [34.7, 22.7], [32.4, 24.3], [30.5, 25.5],
      [28.8, 26.6], [17.5, 34.0], [16.2, 37.6], [12.2, 48.7], [18.1, 50.9], [41.1, 59.4],
    ],
    height: 25,
    floors: 7,
    color: "#d8dde3",
    note: "Hardstrasse 221 · white-cement concrete",
  },
  {
    name: "Diagonal",
    polygon: [
      [-62.1, 22.4], [-54.9, 25.0], [-11.1, 40.4], [-5.6, 36.9], [-5.9, 36.5], [-12.8, 26.0], [-36.6, 17.4],
      [-54.5, 10.9], [-58.8, 12.7], [-60.3, 17.5],
    ],
    height: 21,
    floors: 5,
    color: "#8c6e5c",
    note: "Maagplatz 3 · listed 1920s industrial hall",
  },
  {
    name: "Platform",
    polygon: [
      [-37.7, -58.4], [-76.8, -43.2], [-80.1, -41.9], [-144.8, -16.1], [-147.3, -7.7], [-128.6, -0.3],
      [-101.9, 8.0], [-101.9, 8.9], [-95.4, 11.7], [-77.4, 16.8], [-67.1, 1.3], [-58.3, -18.7], [-54.5, -21.6],
      [-48.7, -25.2], [-42.3, -29.8], [-33.3, -39.1],
    ],
    height: 25,
    floors: 7,
    color: "#3a4753",
    note: "Maagplatz 1 · EY headquarters",
  },
  {
    name: "Lichthalle MAAG",
    polygon: [
      [-71.5, 80.0], [-74.3, 74.7], [-94.1, 39.8], [-84.1, 34.0], [-78.9, 42.7], [-70.7, 37.9], [-69.9, 39.5],
      [-68.2, 38.5], [-33.2, 51.1], [-32.5, 54.1], [-34.0, 55.6],
    ],
    height: 14,
    floors: 3,
    color: "#6f5f55",
    note: "Zahnradstrasse 22 · MAAG Halle event venue",
  },
  {
    name: "Parkhaus Pfingstweid",
    polygon: [
      [97.2, 116.2], [68.4, 137.3], [56.8, 143.3], [44.0, 155.1], [33.1, 163.0], [44.1, 177.0], [104.9, 132.7],
      [97.4, 121.8], [99.9, 120.2],
    ],
    height: 24,
    floors: 8,
    color: "#3e4a56",
    note: "Nearest public car park · 276 spaces",
  },
  {
    name: "Prime 2",
    polygon: [[-24.8, 209.7], [24.5, 173.9], [-11.3, 124.6], [-60.6, 160.4]],
    height: 26,
    floors: 7,
    color: "#46525e",
  },
  {
    name: "",
    polygon: [[68.2, -40.8], [91.2, -44.5], [84.9, -84.4], [61.2, -85.0]],
    height: 9,
    floors: 2,
    color: "#4a5560",
  },
  {
    name: "",
    polygon: [[-132.7, 10.6], [-148.7, 19.7], [-110.8, 163.6], [-62.0, 136.2], [-95.6, 76.4]],
    height: 32,
    floors: 10,
    color: "#3f4a55",
  },
];

/** Hardbrücke elevated road: centreline through (58, 0) at bearing 30°, deck ~9 m above ground. */
export const bridge = { center: [58, 0] as Pt, bearing: 30, length: 520, width: 28, deckHeight: 9 };

/** Bahnhof Hardbrücke platform footprint (OSM). */
export const stationPlatform: Pt[] = [[21.9, -74.2], [19.5, -73.0], [52.8, -19.5], [56.2, -19.4]];

/** Railway corridor: tracks run at bearing ~112° south-west of the tower. */
export const railway = { center: [0, -95] as Pt, bearing: 112, length: 700, tracks: 8, spacing: 4.5 };

/** Garage: two levels under tower and plaza, ramp from Zahnradstrasse at the north-east (OSM "Parkshaus Prime Tower"). */
export const garagePolygon: Pt[] = [
  [-42, -38], [24, -50], [46, -12], [43.1, 56.3], [19.3, 47.6], [15.0, 46.0], [-40, 18],
];

export const rampPolygon: Pt[] = [[15.0, 46.0], [19.3, 47.6], [43.1, 56.3], [50.4, 51.7], [34.9, 25.9], [18.9, 36.0]];

/** Parking bays on a grid aligned with the tower's long axis (bearing 34°), 2.5 × 5 m, double rows with 6 m aisles. */
export function parkingBays(): { x: number; z: number; rot: number }[] {
  const bays: { x: number; z: number; rot: number }[] = [];
  const ang = (34 * Math.PI) / 180; // bearing of the row direction
  const ux: Pt = [Math.sin(ang), Math.cos(ang)]; // along rows
  const uy: Pt = [Math.cos(ang), -Math.sin(ang)]; // across rows
  const bayW = 2.5;
  const bayL = 5;
  const aisle = 6.5;
  const moduleW = bayL * 2 + aisle;
  const coreBoxes = cores.map((c) => ({ c: c.center, r: Math.max(...c.size) / 2 + 1.5 }));
  for (let m = -6; m <= 6; m++) {
    for (const side of [-1, 1]) {
      const v = m * moduleW + side * (bayL / 2 + 0.2);
      for (let u = -70; u <= 70; u += bayW) {
        const E = ux[0] * u + uy[0] * v;
        const N = ux[1] * u + uy[1] * v;
        if (!pointInPolygon([E, N], garagePolygon)) continue;
        if (pointInPolygon([E, N], rampPolygon)) continue;
        if (coreBoxes.some((b) => Math.hypot(E - b.c[0], N - b.c[1]) < b.r)) continue;
        bays.push({ x: E, z: -N, rot: -ang });
      }
    }
  }
  return bays;
}
