import { l, type L } from "@/i18n";
import { profilesOnFloor } from "./tenantProfiles";
import type { Fact, FloorBand, Plan, Source } from "./types";

export const location = {
  lat: 47.38586,
  lon: 8.51689,
  address: "Hardstrasse 201, 8005 Zürich",
  district: "Kreis 5 · Industriequartier · Zürich-West",
  cloudsAddress: "Maagplatz 5, 8005 Zürich",
};

export const heroFacts: Fact[] = [
  { label: l("Height", "Höhe"), value: "126 m", note: l("132.6 m to tip · highest occupied floor 118.7 m", "132.6 m bis zur Spitze · höchstes genutztes Geschoss 118.7 m") },
  { label: l("Floors", "Geschosse"), value: "36 + 2", note: l("36 above ground, 2 basement levels", "36 oberirdisch, 2 Untergeschosse") },
  { label: l("Architects", "Architekten"), value: "Gigon/Guyer", note: l("Annette Gigon & Mike Guyer, Zürich", "Annette Gigon & Mike Guyer, Zürich") },
  { label: l("Completed", "Fertigstellung"), value: "2011", note: l("Inaugurated 6 Dec 2011, fully let", "Eröffnet am 6. Dez. 2011, vollvermietet") },
];

export const facts: Fact[] = [
  { label: l("Official height", "Offizielle Höhe"), value: "126 m", note: l("Tallest building in Switzerland 2011–2015; still the tallest in Zürich", "Höchstes Gebäude der Schweiz 2011–2015; bis heute das höchste in Zürich") },
  { label: l("Floors above ground", "Geschosse oberirdisch"), value: "36", note: l("Clouds restaurant on 35, conference centre on 34", "Restaurant Clouds im 35., Konferenzzentrum im 34. Geschoss") },
  { label: l("Basement levels", "Untergeschosse"), value: "2", note: l("Two-level underground garage", "Zweigeschossige Tiefgarage") },
  { label: l("Gross floor area", "Geschossfläche"), value: "53,461 m²", note: l("73,830 m² incl. Cubus and Diagonal annexes", "73 830 m² inkl. der Annexbauten Cubus und Diagonal") },
  { label: l("Rentable area", "Mietfläche"), value: "≈ 40,000 m²", note: l("1,275 m² per storey, up to 4 tenants per floor", "1275 m² pro Geschoss, bis zu 4 Mieter pro Geschoss") },
  { label: l("Workplaces", "Arbeitsplätze"), value: "≈ 2,000", note: l("60–100 per floor; 3,500 across the whole Maag ensemble", "60–100 pro Geschoss; 3500 im ganzen Maag-Ensemble") },
  { label: l("Site area", "Grundstück"), value: "9,800 m²", note: l("Former Maag gear factory site", "Ehemaliges Areal der Maag-Zahnräder") },
  { label: l("Building volume", "Gebäudevolumen"), value: "≈ 228,000 m³", note: l("Losinger quoted 280,000 m³ construction volume", "Losinger nannte 280 000 m³ Bauvolumen") },
  { label: l("Investment", "Investition"), value: "CHF 355–380 M", note: l("Tower + Platform + Cubus + Diagonal", "Turm + Platform + Cubus + Diagonal") },
  { label: l("Elevators", "Aufzüge"), value: "9", note: l("6.5 m/s · top floor in about 30 s", "6.5 m/s · oberstes Geschoss in rund 30 s") },
  { label: l("Facade", "Fassade"), value: "≈ 20,500 m²", note: l("≈ 4,400 frameless, green-tinted triple-glazed elements", "≈ 4400 rahmenlose, grün getönte Dreifachglas-Elemente") },
  { label: l("Concrete", "Beton"), value: "36,000 m³", note: l("6,000 t reinforcing steel · 5-day cycle per floor", "6000 t Bewehrungsstahl · 5-Tage-Takt pro Geschoss") },
  { label: l("Certifications", "Zertifikate"), value: "LEED Gold", note: l("Core & Shell (70 pts) · Minergie · greenproperty", "Core & Shell (70 Punkte) · Minergie · greenproperty") },
  { label: l("Owner", "Eigentümerin"), value: "Swiss Prime Site", note: l("Developer and owner since 2004 (Maag Holding takeover)", "Entwicklerin und Eigentümerin seit 2004 (Übernahme der Maag Holding)") },
  { label: l("Contractors", "Unternehmer"), value: "Losinger + Steiner", note: l("ARGE Prime Tower; Platform by HRS", "ARGE Prime Tower; Platform durch HRS") },
  { label: l("Award", "Auszeichnung"), value: "Gute Bauten 2011–15", note: l("Auszeichnung für gute Bauten der Stadt Zürich", "Auszeichnung für gute Bauten der Stadt Zürich") },
];

export const timeline: { year: string; text: L }[] = [
  { year: "1913", text: l("Max Maag moves Maag-Zahnräder to Hardstrasse 219; the gear works grow to 2,500 employees by 1980.", "Max Maag zieht mit Maag-Zahnräder an die Hardstrasse 219; das Werk wächst bis 1980 auf 2500 Beschäftigte.") },
  { year: "1997", text: l("Maag sells its manufacturing; the firm becomes a real-estate company on the former factory site.", "Maag verkauft die Produktion; die Firma wird zur Immobiliengesellschaft auf dem ehemaligen Fabrikareal.") },
  { year: "2004", text: l("Swiss Prime Site acquires the Maag group (CHF 0.9 bn). Gigon/Guyer win the invited competition for the tower.", "Swiss Prime Site übernimmt die Maag-Gruppe (CHF 0.9 Mrd.). Gigon/Guyer gewinnen den eingeladenen Wettbewerb für den Turm.") },
  { year: "2006", text: l("A 126 m height profile (Baugespann) is erected with crane and helicopter for three months.", "Ein 126 m hohes Baugespann wird mit Kran und Helikopter aufgestellt und steht drei Monate.") },
  { year: "2008", text: l("18 Feb: demolition of the industrial buildings begins. 19 Nov: foundation stone laid.", "18. Feb.: Abbruch der Industriebauten beginnt. 19. Nov.: Grundsteinlegung.") },
  { year: "2010", text: l("6 Apr: 105.5 m, overtaking Messeturm Basel. 21 May: core topped out at 126 m. 7 Jul: topping-out ceremony, 68 % pre-let.", "6. Apr.: 105.5 m, der Messeturm Basel ist überholt. 21. Mai: Kern auf 126 m. 7. Juli: Aufrichte, 68 % vorvermietet.") },
  { year: "2011", text: l("Summer: first tenants move in. 6 Dec: official inauguration, fully let. 12 Dec: Clouds opens on the 35th floor.", "Sommer: erste Mieter ziehen ein. 6. Dez.: offizielle Eröffnung, vollvermietet. 12. Dez.: Clouds eröffnet im 35. Geschoss.") },
  { year: "2012", text: l("2 Jan: the conference centre on the 34th floor opens.", "2. Jan.: Das Konferenzzentrum im 34. Geschoss eröffnet.") },
  { year: "2015", text: l("Roche Tower Bau 1 in Basel (178 m) takes the national height record; Prime Tower remains Zürich's tallest.", "Der Roche-Turm Bau 1 in Basel (178 m) übernimmt den Schweizer Höhenrekord; der Prime Tower bleibt Zürichs höchstes Gebäude.") },
];

export const architecture: { title: L; text: L }[] = [
  {
    title: l("Two rectangles, melted together", "Zwei Rechtecke, ineinander verschmolzen"),
    text: l(
      "The plan is an irregular octagon derived from two diagonally connected rectangles. Additional volumes are joined at varying heights, producing setbacks and cantilevers that make the silhouette change with every viewpoint.",
      "Der Grundriss ist ein unregelmässiges Achteck aus zwei diagonal verbundenen Rechtecken. Weitere Volumen schliessen auf unterschiedlichen Höhen an und erzeugen Rücksprünge und Auskragungen, die die Silhouette mit jedem Blickwinkel verändern.",
    ),
  },
  {
    title: l("It broadens toward the top", "Nach oben wird er breiter"),
    text: l(
      "Against convention the tower does not taper. Overhanging elements make it wider at the top than at the base; the cantilevers are carried by slanting columns spanning two or three storeys.",
      "Entgegen der Konvention verjüngt sich der Turm nicht. Auskragende Elemente machen ihn oben breiter als unten; die Auskragungen werden von schrägen Stützen über zwei bis drei Geschosse getragen.",
    ),
  },
  {
    title: l("Concrete skeleton, three cores", "Betonskelett, drei Kerne"),
    text: l(
      "Flat in-situ concrete slabs on high-performance precast columns, with three central core segments running parallel to the facade. A load-distributing base slab on bored piles sits in the Limmat gravel.",
      "Flachdecken in Ortbeton auf vorfabrizierten Hochleistungsbetonstützen, dazu drei zentrale Kernsegmente parallel zur Fassade. Eine lastverteilende Bodenplatte auf Bohrpfählen steht im Limmatkies.",
    ),
  },
  {
    title: l("Green glass, pixelated", "Grünes Glas, gepixelt"),
    text: l(
      "Insulated triple glazing with a greenish tint, frameless on the outside. Every second or third window opens parallel to the facade, leaving 6 cm slits that give the skin its pixelated texture. The colour shifts from emerald to white as you move around it.",
      "Dreifach-Isolierglas mit grünlicher Tönung, aussen rahmenlos. Jedes zweite oder dritte Fenster öffnet parallel zur Fassade und hinterlässt 6 cm breite Schlitze, die der Haut ihre gepixelte Textur geben. Die Farbe wechselt von Smaragd zu Weiss, während man um den Turm geht.",
    ),
  },
  {
    title: l("Serpentine lobby", "Lobby aus Serpentin"),
    text: l(
      "The entrance hall is lined with green Aosta serpentine stone rising about ten metres, with interiors developed with Studio Hannes Wettstein.",
      "Die Eingangshalle ist mit rund zehn Meter hohem grünem Aosta-Serpentin verkleidet; die Innenräume entstanden mit dem Studio Hannes Wettstein.",
    ),
  },
  {
    title: l("Low-energy services", "Sparsame Haustechnik"),
    text: l(
      "Groundwater heat pumps, waste-heat recovery, heat and ice storage, thermo-active ceiling panels and natural ventilation through openable windows. LEED Gold, Minergie and greenproperty certified.",
      "Grundwasser-Wärmepumpen, Abwärmenutzung, Wärme- und Eisspeicher, thermoaktive Deckenelemente und natürliche Lüftung über öffenbare Fenster. Zertifiziert nach LEED Gold, Minergie und greenproperty.",
    ),
  },
];

export const garage = {
  levels: 2,
  spacesTower: 182,
  spacesEnsemble: 250,
  spacesPlatform: 82,
  notes: [
    l(
      "Two basement levels beneath the tower form the underground garage. Swiss Prime Site quoted 182 spaces for the tower in 2010; the CTBUH database lists 140.",
      "Zwei Untergeschosse unter dem Turm bilden die Tiefgarage. Swiss Prime Site nannte 2010 182 Plätze für den Turm; die CTBUH-Datenbank führt 140.",
    ),
    l(
      "Across the whole Maag ensemble, primetower.ch quotes roughly 250 spaces, including 82 under the Platform building.",
      "Für das ganze Maag-Ensemble nennt primetower.ch rund 250 Plätze, davon 82 unter dem Gebäude Platform.",
    ),
    l(
      "The garage primarily serves tenants. Bahnhof Hardbrücke (S-Bahn) is directly adjacent, and tram and bus stops sit at the foot of the tower.",
      "Die Garage dient in erster Linie den Mietern. Der Bahnhof Hardbrücke (S-Bahn) liegt direkt daneben, Tram- und Bushaltestellen am Fuss des Turms.",
    ),
  ],
};

export const annexes: { name: string; address: string; floors: number; height: string; area: string; text: L }[] = [
  { name: "Cubus", address: "Hardstrasse 221/223", floors: 7, height: "25 m", area: "≈ 5,300 m²", text: l("Gigon/Guyer new build with a white-cement exposed-concrete facade. Small offices, archives, a training centre, a crèche, a gym and a Coop Pronto.", "Neubau von Gigon/Guyer mit Sichtbetonfassade aus Weisszement. Kleine Büros, Archive, ein Schulungszentrum, eine Kita, ein Fitnesscenter und ein Coop Pronto.") },
  { name: "Diagonal", address: "Zahnradstrasse 21 / Maagplatz 3", floors: 5, height: "21 m", area: "≈ 2,100 m²", text: l("Listed industrial building, remediated and refurbished. Home to the galleries Eva Presenhuber and Peter Kilchmann plus restaurant and pop-up space.", "Denkmalgeschützter Industriebau, saniert und umgebaut. Sitz der Galerien Eva Presenhuber und Peter Kilchmann sowie Restaurant- und Pop-up-Fläche.") },
  { name: "Platform", address: "Maagplatz 1", floors: 7, height: "25 m", area: "≈ 20,900 m²", text: l("Built by HRS to EY's specification with about 1,000 workplaces, a public staff restaurant, a Coop supermarket and 82 parking spaces.", "Von HRS nach den Vorgaben von EY gebaut, mit rund 1000 Arbeitsplätzen, einem öffentlichen Personalrestaurant, einem Coop-Supermarkt und 82 Parkplätzen.") },
];

const OFFICE_COLOR = "#5c6f83";
const LOBBY_COLOR = "#c9d6e2";
const shortName = (name: string) => name.replace(/\s*\(.*?\)/g, "").replace(/\s+(AG|GmbH|SE)$/, "");

/**
 * Floor colouring for the 3D model, generated from the researched tenant list
 * (src/data/tenantProfiles.ts). Floors without a sourced tenant are multi-tenant offices.
 */
export const floorBands: FloorBand[] = (() => {
  const bands: FloorBand[] = [];
  for (let f = 0; f <= 35; f++) {
    const here = profilesOnFloor(f);
    const names = here.map((p) => shortName(p.name)).join(" · ");
    let band: FloorBand;
    if (f === 0) band = { from: 0, to: 0, label: l(`Lobby · ${names}`, `Lobby · ${names}`), color: LOBBY_COLOR };
    else if (here.length) band = { from: f, to: f, label: l(names, names), tenant: here[0].name, color: here[0].color ?? OFFICE_COLOR };
    // Clouds' event level: named by the operator, but no source confirms the floor number.
    else if (f === 34) band = { from: f, to: f, label: l("Clouds events (level not confirmed)", "Clouds Events (Geschoss unbestätigt)"), color: "#f7f1e3" };
    else band = { from: f, to: f, label: l("Offices (multi-tenant)", "Büros (mehrere Mieter)"), color: OFFICE_COLOR };
    const prev = bands[bands.length - 1];
    if (prev && prev.to === f - 1 && prev.label.en === band.label.en) prev.to = f;
    else bands.push(band);
  }
  return bands;
})();

export const sources: Source[] = [
  { title: "Gigon/Guyer – Prime Tower project page", url: "https://www.gigon-guyer.ch/en/projects/prime-tower/" },
  { title: "primetower.ch – official site (Swiss Prime Site / Wincasa)", url: "https://www.primetower.ch/" },
  { title: "primetower.ch – tenant directory", url: "https://www.primetower.ch/en/business-en/" },
  { title: "primetower.ch – the Maag site & annex buildings", url: "https://www.primetower.ch/en/areal-en/" },
  { title: "Swiss Prime Site – portfolio page", url: "https://sps.swiss/en/group/real-estate/portfolio/office/prime-tower" },
  { title: "Swiss Prime Site – topping-out press release, 7 Jul 2010 (PDF)", url: "https://sps.swiss/fileadmin/user_upload/redakteure/gruppe/pdf/pressemitteilungen/en/2010-07-07---Prime-Tower---topping-out-ceremony-for-Switzerlands-highe.pdf" },
  { title: "Swiss Prime Site – Medienorientierung 6 Dec 2011 (PDF)", url: "https://www.primetower.ch/wp-content/uploads/2011/12/Medienorientierung-Prime-Tower-6-12-2011.pdf" },
  { title: "CTBUH Skyscraper Center – Prime Tower", url: "https://www.skyscrapercenter.com/building/prime-tower/9047" },
  { title: "Architectural Record – Prime Tower", url: "https://architecturalrecord.com/articles/7942-prime-tower" },
  { title: "Baunetz Wissen – Prime Tower in Zürich", url: "https://www.baunetzwissen.de/sicherheitstechnik/objekte/buero-gewerbe/prime-tower-in-zuerich-1497631" },
  { title: "Walt Galmarini – structural engineering", url: "https://waltgalmarini.ch/en/projects/prime-tower-zurich/" },
  { title: "Doka – formwork reference (3.35 m storeys)", url: "https://www.doka.com/de-CH/references/europe/primetowerzuerich" },
  { title: "Wikipedia (EN) – Prime Tower", url: "https://en.wikipedia.org/wiki/Prime_Tower" },
  { title: "Wikipedia (DE) – Prime Tower", url: "https://de.wikipedia.org/wiki/Prime_Tower" },
  { title: "Bilanz – Prime Tower zieht neue Mieter an (Jan 2022)", url: "https://www.bilanz.ch/bilanz/zurich-prime-tower-zieht-neue-mieter-an-die-preise-steigen-359459" },
  { title: "Clouds – restaurant, bar & conference", url: "https://clouds.ch/en/" },
  { title: "Historisches Lexikon der Schweiz – Maag", url: "https://hls-dhs-dss.ch/de/articles/041806" },
  { title: "OpenStreetMap – Prime Tower (way 47122541)", url: "https://www.openstreetmap.org/way/47122541" },
];

/** Published drawings. They are copyrighted by Gigon/Guyer and JLL/Swiss Prime Site, so we link rather than copy. */
export const plans: Plan[] = [
  { kind: "site", title: l("Site plan, Maag-Areal", "Situationsplan Maag-Areal"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_S_1500_all_www2-1500x988.jpg", note: l("I Prime Tower, II Platform, III Diagonal, IV Cubus between the railway and the Hardbrücke ramp.", "I Prime Tower, II Platform, III Diagonal, IV Cubus zwischen Gleisfeld und Hardbrücke-Rampe.") },
  { kind: "plan", title: l("Ground floor", "Erdgeschoss"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_00_www-1500x1030.jpg", note: l("Entrance hall, reception, lift lobby, garage stair, bank branch, café, restaurant reception. Dashed lines mark the overhangs above.", "Eingangshalle, Rezeption, Liftlobby, Garagentreppe, Bankfiliale, Café, Restaurantempfang. Gestrichelt die Auskragungen darüber.") },
  { kind: "plan", title: l("1st floor", "1. Obergeschoss"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_01_www-1500x1030.jpg", note: l("Gallery level over the double-height lobby.", "Galeriegeschoss über der doppelgeschossigen Lobby.") },
  { kind: "plan", title: l("10th floor", "10. Obergeschoss"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_10_www-1500x1030.png", note: l("Typical lower floor on the base octagon.", "Typisches unteres Geschoss auf dem Grund-Achteck.") },
  { kind: "plan", title: l("24th floor", "24. Obergeschoss"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_24_www-1500x1030.png", note: l("Typical upper floor with the north-east and Hardbrücke extensions.", "Typisches oberes Geschoss mit den Erweiterungen nach Nordosten und zur Hardbrücke.") },
  { kind: "plan", title: l("31st floor, Homburger fit-out", "31. Obergeschoss, Ausbau Homburger"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_31_300_Homburger_BW_01_www-1500x1030.jpg", note: l("West cantilever present; law-firm layout at 1:300.", "Mit westlicher Auskragung; Kanzleigrundriss 1:300.") },
  { kind: "plan", title: l("35th floor, Clouds", "35. Obergeschoss, Clouds"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_22T_GR_35_2018_rot_gelb_Moebel_118_www-1500x1030.jpg", note: l("Restaurant, bistro and bar with the kitchen band along the core (2018 refurbishment).", "Restaurant, Bistro und Bar mit dem Küchenband entlang des Kerns (Umbau 2018).") },
  { kind: "section", title: l("Section A–A", "Schnitt A–A"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_SCH_BW_01_D_oL-1_www-942x1500.png", note: l("Two basement levels on a pile foundation, Diagonal to the left, Hardbrücke to the right.", "Zwei Untergeschosse auf Pfahlfundation, links das Diagonal, rechts die Hardbrücke.") },
  { kind: "section", title: l("Section B–B", "Schnitt B–B"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_SCH_2_300_BW_01_D_oL_www-1108x1500.png", note: l("Long-axis section through the three cores showing the steps at floors 17 and 26.", "Längsschnitt durch die drei Kerne mit den Stufen bei den Geschossen 17 und 26.") },
  { kind: "section", title: l("Section, Clouds restaurant", "Schnitt Restaurant Clouds"), url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_SCH_150_Gastro_BW_01_www-1500x360.png", note: l("Floors 34–35 at 1:150.", "Geschosse 34–35 im Massstab 1:150.") },
  { kind: "pdf", title: l("Letting plan 2. OG (526 m²)", "Mietflächenplan 2. OG (526 m²)"), url: "https://www.primetower.ch/wp-content/uploads/2019/05/2OG_Prime_Tower.pdf", note: l("Vector PDF with north arrow and 20 m scale bar, cores TK1–TK3, columns.", "Vektor-PDF mit Nordpfeil und 20-m-Massstab, Kerne TK1–TK3, Stützen.") },
  { kind: "pdf", title: l("Letting plan 3. OG (1,085 m²)", "Mietflächenplan 3. OG (1085 m²)"), url: "https://www.primetower.ch/wp-content/uploads/2019/05/3OG_Prime_Tower.pdf", note: l("The plan the 3D footprint was measured from: 56.8 × 39.3 m bounding box, 1,600 m² inside the facade.", "Der Plan, aus dem der 3D-Grundriss vermessen wurde: 56.8 × 39.3 m Hüllrechteck, 1600 m² innerhalb der Fassade.") },
  { kind: "pdf", title: l("Letting plan 4. OG (1,085 m²)", "Mietflächenplan 4. OG (1085 m²)"), url: "https://www.primetower.ch/wp-content/uploads/2019/05/4OG_Prime_Tower.pdf", note: l("Clear room height 2.77 m.", "Lichte Raumhöhe 2.77 m.") },
];
