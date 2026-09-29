/** Maps a floor to the closest published drawing. Drawings are linked from their publishers, not copied. */

export type FloorPlanRef = {
  /** Web image of the plan (Gigon/Guyer). */
  image?: { url: string; title: string; exact: boolean };
  /** Vector letting plan (primetower.ch / JLL). */
  pdf?: { url: string; title: string };
};

const GG = "https://www.gigon-guyer.ch/wp-content/uploads/";
const PT = "https://www.primetower.ch/wp-content/uploads/2019/05/";

const images = {
  g: { url: `${GG}152_4_2_GR_00_www-1500x1030.jpg`, title: "Ground floor plan" },
  f1: { url: `${GG}152_4_2_GR_01_www-1500x1030.jpg`, title: "1st floor plan" },
  f10: { url: `${GG}152_4_2_GR_10_www-1500x1030.png`, title: "10th floor plan" },
  f24: { url: `${GG}152_4_2_GR_24_www-1500x1030.png`, title: "24th floor plan" },
  f31: { url: `${GG}152_4_2_GR_31_300_Homburger_BW_01_www-1500x1030.jpg`, title: "31st floor plan (Homburger)" },
  f35: { url: `${GG}152_4_22T_GR_35_2018_rot_gelb_Moebel_118_www-1500x1030.jpg`, title: "35th floor plan (Clouds)" },
};

export function planForFloor(f: number): FloorPlanRef {
  const img = (key: keyof typeof images, exact: boolean) => ({ ...images[key], exact });
  if (f === 0) return { image: img("g", true) };
  if (f === 1) return { image: img("f1", true) };
  if (f >= 2 && f <= 4) {
    return {
      image: img("f10", false),
      pdf: { url: `${PT}${f}OG_Prime_Tower.pdf`, title: `Letting plan ${f}. OG (vector PDF)` },
    };
  }
  if (f <= 16) return { image: img("f10", f === 10) };
  if (f <= 25) return { image: img("f24", f === 24) };
  if (f <= 33) return { image: img("f31", f === 31) };
  return { image: img("f35", f === 35) };
}
