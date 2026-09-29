import { l, type L } from "@/i18n";

/** Maps a floor to the closest published drawing. Drawings are linked from their publishers, not copied. */

export type FloorPlanRef = {
  /** Web image of the plan (Gigon/Guyer). */
  image?: { url: string; title: L; exact: boolean };
  /** Vector letting plan (primetower.ch / JLL). */
  pdf?: { url: string; title: L };
};

const GG = "https://www.gigon-guyer.ch/wp-content/uploads/";
const PT = "https://www.primetower.ch/wp-content/uploads/2019/05/";

const images = {
  g: { url: `${GG}152_4_2_GR_00_www-1500x1030.jpg`, title: l("Ground floor plan", "Grundriss Erdgeschoss") },
  f1: { url: `${GG}152_4_2_GR_01_www-1500x1030.jpg`, title: l("1st floor plan", "Grundriss 1. OG") },
  f10: { url: `${GG}152_4_2_GR_10_www-1500x1030.png`, title: l("10th floor plan", "Grundriss 10. OG") },
  f24: { url: `${GG}152_4_2_GR_24_www-1500x1030.png`, title: l("24th floor plan", "Grundriss 24. OG") },
  f31: { url: `${GG}152_4_2_GR_31_300_Homburger_BW_01_www-1500x1030.jpg`, title: l("31st floor plan (Homburger)", "Grundriss 31. OG (Homburger)") },
  f35: { url: `${GG}152_4_22T_GR_35_2018_rot_gelb_Moebel_118_www-1500x1030.jpg`, title: l("35th floor plan (Clouds)", "Grundriss 35. OG (Clouds)") },
};

export function planForFloor(f: number): FloorPlanRef {
  const img = (key: keyof typeof images, exact: boolean) => ({ ...images[key], exact });
  if (f === 0) return { image: img("g", true) };
  if (f === 1) return { image: img("f1", true) };
  if (f >= 2 && f <= 4) {
    return {
      image: img("f10", false),
      pdf: { url: `${PT}${f}OG_Prime_Tower.pdf`, title: l(`Letting plan ${f}. OG (vector PDF)`, `Mietflächenplan ${f}. OG (Vektor-PDF)`) },
    };
  }
  if (f <= 16) return { image: img("f10", f === 10) };
  if (f <= 25) return { image: img("f24", f === 24) };
  if (f <= 33) return { image: img("f31", f === 31) };
  return { image: img("f35", f === 35) };
}
