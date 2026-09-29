import type { Fact, FloorBand, Source, Tenant } from "./types";

export const location = {
  lat: 47.38586,
  lon: 8.51689,
  address: "Hardstrasse 201, 8005 Zürich",
  district: "Kreis 5 · Industriequartier · Zürich-West",
  cloudsAddress: "Maagplatz 5, 8005 Zürich",
};

export const heroFacts: Fact[] = [
  { label: "Height", value: "126 m", note: "132.6 m to tip · highest occupied floor 118.7 m" },
  { label: "Floors", value: "36 + 2", note: "36 above ground, 2 basement levels" },
  { label: "Architects", value: "Gigon/Guyer", note: "Annette Gigon & Mike Guyer, Zürich" },
  { label: "Completed", value: "2011", note: "Inaugurated 6 Dec 2011, fully let" },
];

export const facts: Fact[] = [
  { label: "Official height", value: "126 m", note: "Tallest building in Switzerland 2011–2015; still the tallest in Zürich" },
  { label: "Floors above ground", value: "36", note: "Clouds restaurant on 35, conference centre on 34" },
  { label: "Basement levels", value: "2", note: "Two-level underground garage" },
  { label: "Gross floor area", value: "53,461 m²", note: "73,830 m² incl. Cubus and Diagonal annexes" },
  { label: "Rentable area", value: "≈ 40,000 m²", note: "1,275 m² per storey, up to 4 tenants per floor" },
  { label: "Workplaces", value: "≈ 2,000", note: "60–100 per floor; 3,500 across the whole Maag ensemble" },
  { label: "Site area", value: "9,800 m²", note: "Former Maag gear factory site" },
  { label: "Building volume", value: "≈ 228,000 m³", note: "Losinger quoted 280,000 m³ construction volume" },
  { label: "Investment", value: "CHF 355–380 M", note: "Tower + Platform + Cubus + Diagonal" },
  { label: "Elevators", value: "9", note: "6.5 m/s · top floor in about 30 s" },
  { label: "Facade", value: "≈ 20,500 m²", note: "≈ 4,400 frameless, green-tinted triple-glazed elements" },
  { label: "Concrete", value: "36,000 m³", note: "6,000 t reinforcing steel · 5-day cycle per floor" },
  { label: "Certifications", value: "LEED Gold", note: "Core & Shell (70 pts) · Minergie · greenproperty" },
  { label: "Owner", value: "Swiss Prime Site", note: "Developer and owner since 2004 (Maag Holding takeover)" },
  { label: "Contractors", value: "Losinger + Steiner", note: "ARGE Prime Tower; Platform by HRS" },
  { label: "Award", value: "Gute Bauten 2011–15", note: "Auszeichnung für gute Bauten der Stadt Zürich" },
];

export const timeline: { year: string; text: string }[] = [
  { year: "1913", text: "Max Maag moves Maag-Zahnräder to Hardstrasse 219; the gear works grow to 2,500 employees by 1980." },
  { year: "1997", text: "Maag sells its manufacturing; the firm becomes a real-estate company on the former factory site." },
  { year: "2004", text: "Swiss Prime Site acquires the Maag group (CHF 0.9 bn). Gigon/Guyer win the invited competition for the tower." },
  { year: "2006", text: "A 126 m height profile (Baugespann) is erected with crane and helicopter for three months." },
  { year: "2008", text: "18 Feb: demolition of the industrial buildings begins. 19 Nov: foundation stone laid." },
  { year: "2010", text: "6 Apr: 105.5 m, overtaking Messeturm Basel. 21 May: core topped out at 126 m. 7 Jul: topping-out ceremony, 68 % pre-let." },
  { year: "2011", text: "Summer: first tenants move in. 6 Dec: official inauguration, fully let. 12 Dec: Clouds opens on the 35th floor." },
  { year: "2012", text: "2 Jan: the conference centre on the 34th floor opens." },
  { year: "2015", text: "Roche Tower Bau 1 in Basel (178 m) takes the national height record; Prime Tower remains Zürich's tallest." },
];

export const architecture = [
  {
    title: "Two rectangles, melted together",
    text: "The plan is an irregular octagon derived from two diagonally connected rectangles. Additional volumes are joined at varying heights, producing setbacks and cantilevers that make the silhouette change with every viewpoint.",
  },
  {
    title: "It broadens toward the top",
    text: "Against convention the tower does not taper. Overhanging elements make it wider at the top than at the base; the cantilevers are carried by slanting columns spanning two or three storeys.",
  },
  {
    title: "Concrete skeleton, three cores",
    text: "Flat in-situ concrete slabs on high-performance precast columns, with three central core segments running parallel to the facade. A load-distributing base slab on bored piles sits in the Limmat gravel.",
  },
  {
    title: "Green glass, pixelated",
    text: "Insulated triple glazing with a greenish tint, frameless on the outside. Every second or third window opens parallel to the facade, leaving 6 cm slits that give the skin its pixelated texture. The colour shifts from emerald to white as you move around it.",
  },
  {
    title: "Serpentine lobby",
    text: "The entrance hall is lined with green Aosta serpentine stone rising about ten metres, with interiors developed with Studio Hannes Wettstein.",
  },
  {
    title: "Low-energy services",
    text: "Groundwater heat pumps, waste-heat recovery, heat and ice storage, thermo-active ceiling panels and natural ventilation through openable windows. LEED Gold, Minergie and greenproperty certified.",
  },
];

export const garage = {
  levels: 2,
  spacesTower: 182,
  spacesEnsemble: 250,
  spacesPlatform: 82,
  notes: [
    "Two basement levels beneath the tower form the underground garage. Swiss Prime Site quoted 182 spaces for the tower in 2010; the CTBUH database lists 140.",
    "Across the whole Maag ensemble, primetower.ch quotes roughly 250 spaces, including 82 under the Platform building.",
    "The garage primarily serves tenants. Bahnhof Hardbrücke (S-Bahn) is directly adjacent, and tram and bus stops sit at the foot of the tower.",
  ],
};

export const annexes = [
  { name: "Cubus", address: "Hardstrasse 221/223", floors: 7, height: "25 m", area: "≈ 5,300 m²", text: "Gigon/Guyer new build with a white-cement exposed-concrete facade. Small offices, archives, a training centre, a crèche, a gym and a Coop Pronto." },
  { name: "Diagonal", address: "Zahnradstrasse 21 / Maagplatz 3", floors: 5, height: "21 m", area: "≈ 2,100 m²", text: "Listed industrial building, remediated and refurbished. Home to the galleries Eva Presenhuber and Peter Kilchmann plus restaurant and pop-up space." },
  { name: "Platform", address: "Maagplatz 1", floors: 7, height: "25 m", area: "≈ 20,900 m²", text: "Built by HRS to EY's specification with about 1,000 workplaces, a public staff restaurant, a Coop supermarket and 82 parking spaces." },
];

export const tenants: Tenant[] = [
  { name: "Homburger AG", industry: "Law firm", floors: "8 upper floors (25–32)", building: "Prime Tower", status: "current", note: "Anchor tenant since December 2011", source: "https://www.homburger.ch/en/contact" },
  { name: "Deutsche Bank (Schweiz) AG", industry: "Banking & wealth management", floors: "3 floors incl. 14–15", building: "Prime Tower", status: "current", note: "Reduced from 5 floors in 2021", source: "https://country.db.com/switzerland/company/contacts" },
  { name: "Citibank (Switzerland) AG", industry: "Banking", floors: "4 floors", building: "Prime Tower", status: "current", source: "https://www.citigroup.com/global/about-us/global-presence/switzerland" },
  { name: "GAM Investments", industry: "Asset management", floors: "1 floor", building: "Prime Tower", status: "current", note: "Registered seat Hardstrasse 201", source: "https://uk.finance.yahoo.com/quote/GAM.SW/profile" },
  { name: "Crypto Finance AG", industry: "Digital assets (Deutsche Börse Group)", floors: "24", building: "Prime Tower", status: "current", note: "105 workplaces, moved in 2022", source: "https://www.bilanz.ch/bilanz/zurich-prime-tower-zieht-neue-mieter-an-die-preise-steigen-359459" },
  { name: "Zalando Switzerland AG", industry: "E-commerce tech hub", floors: "23 + part of 7", building: "Prime Tower", status: "current", note: "Floor 23 later marketed for lease; footprint uncertain", source: "https://jobs.zalando.com/en/where-we-work/zurich" },
  { name: "HDI Global SE", industry: "Industrial insurance", floors: "21", building: "Prime Tower", status: "current", source: "https://sps.swiss/en/group/real-estate/portfolio/office/prime-tower" },
  { name: "Oracle Software (Schweiz) GmbH", industry: "IT · Smart Innovation Center", floors: "17", building: "Prime Tower", status: "current", note: "Opened April 2018", source: "https://www.netzwoche.ch/news/2018-04-18/oracle-mietet-sich-im-prime-tower-ein" },
  { name: "Roland Berger AG", industry: "Management consulting", floors: "1 floor", building: "Prime Tower", status: "current", note: "Since January 2021", source: "https://www.primetower.ch/en/2021/03/roland-berger-ag-our-new-arrival-at-the-prime-tower/" },
  { name: "Repower AG", industry: "Energy trading", floors: "6", building: "Prime Tower", status: "current", source: "https://repower.com/new-media/l25nsi1o/zuerich_2023_en.pdf" },
  { name: "Korn Ferry", industry: "Executive search", building: "Prime Tower", status: "current", source: "https://www.kornferry.com/about-us/global-offices/zurich" },
  { name: "JLL (Jones Lang LaSalle) AG", industry: "Real-estate advisory", building: "Prime Tower", status: "current" },
  { name: "Cognizant Technology Solutions AG", industry: "IT services", building: "Prime Tower", status: "current", note: "Swiss headquarters" },
  { name: "Nexxiot AG", industry: "IoT & logistics tech", building: "Prime Tower", status: "current", note: "Headquarters" },
  { name: "Swiss Prime Site Immobilien AG", industry: "Real estate (owner)", building: "Prime Tower", status: "current", source: "https://sps.swiss/en/contact/immobilien" },
  { name: "FlexOffice (Schweiz) AG", industry: "Serviced offices", floors: "7", building: "Prime Tower", status: "current", source: "https://flexoffice.swiss/en/location/zurich-prime-tower/" },
  { name: "Humanis AG", industry: "Recruitment", building: "Prime Tower", status: "current" },
  { name: "schilling partners ag", industry: "Executive search", building: "Prime Tower", status: "current" },
  { name: "Universal Music Group (Switzerland)", industry: "Music", building: "Prime Tower", status: "current", note: "Listed by primetower.ch; not independently verified" },
  { name: "Clouds", industry: "Restaurant · bar · conference", floors: "34–35", building: "Prime Tower", status: "current", note: "Opened 12 Dec 2011, run by Candrian", source: "https://clouds.ch/en/" },
  { name: "Hotel Rivington & Sons", industry: "Bar", floors: "Ground floor", building: "Prime Tower", status: "current" },
  { name: "Zürcher Kantonalbank", industry: "Banking", floors: "Ground-floor branch", building: "Prime Tower", status: "current", note: "Asset-management floors vacated in 2020", source: "https://www.zkb.ch/de/standorte/zuerich-primetower.html" },
  { name: "Migrolino", industry: "Convenience retail", floors: "Ground floor", building: "Prime Tower", status: "current" },
  { name: "Infosys", industry: "IT services", building: "Prime Tower", status: "former", note: "Opening tenant 2011; moved to The Circle in January 2026" },
  { name: "Transammonia / Trammo AG", industry: "Commodity trading", building: "Prime Tower", status: "former", note: "Opening tenant 2011; presence today unclear" },
  { name: "Swiss & Global Asset Management", industry: "Asset management", building: "Prime Tower", status: "former", note: "Opening tenant 2011, later merged into GAM" },
  { name: "EY (Ernst & Young AG)", industry: "Audit & consulting", floors: "Entire building", building: "Platform", status: "current", source: "https://www.ey.com/en_ch/legal-and-privacy/company-information" },
  { name: "Coop", industry: "Supermarket", floors: "Ground floor", building: "Platform", status: "current" },
  { name: "EY Restaurant platform (ZFV)", industry: "Public staff restaurant", floors: "Ground floor", building: "Platform", status: "current" },
  { name: "Coop Pronto", industry: "Convenience retail", floors: "Ground floor", building: "Cubus", status: "current" },
  { name: "kids & co Prime Tower", industry: "Childcare", building: "Cubus", status: "current" },
  { name: "Kieser Training", industry: "Fitness", building: "Cubus", status: "current" },
  { name: "Dr. Semm AG", industry: "Medical practice", building: "Cubus", status: "current" },
  { name: "Galerie Eva Presenhuber", industry: "Art gallery", floors: "2–4", building: "Diagonal", status: "current", source: "https://www.presenhuber.com/about" },
  { name: "Galerie Peter Kilchmann", industry: "Art gallery", floors: "2–4", building: "Diagonal", status: "current" },
  { name: "Moyo / Ooki pop-up", industry: "Restaurant & events", floors: "Ground + 1", building: "Diagonal", status: "current" },
];

/** Floor bands drawn in the 3D model. Floor numbers are above-ground storeys (0 = ground). */
export const floorBands: FloorBand[] = [
  { from: 0, to: 0, label: "Lobby · ZKB branch · Rivington & Sons · Migrolino", color: "#c9d6e2" },
  { from: 1, to: 5, label: "Offices (multi-tenant)", color: "#5c6f83" },
  { from: 6, to: 6, label: "Repower", tenant: "Repower AG", color: "#e0a458" },
  { from: 7, to: 7, label: "FlexOffice · Zalando (part)", tenant: "FlexOffice", color: "#f2c14e" },
  { from: 8, to: 12, label: "Offices (Citibank, GAM, Roland Berger, others)", color: "#5c6f83" },
  { from: 13, to: 13, label: "Deutsche Bank (safes, historic)", tenant: "Deutsche Bank", color: "#4f8fd6" },
  { from: 14, to: 15, label: "Deutsche Bank", tenant: "Deutsche Bank", color: "#4f8fd6" },
  { from: 16, to: 16, label: "Offices", color: "#5c6f83" },
  { from: 17, to: 17, label: "Oracle Smart Innovation Center", tenant: "Oracle", color: "#e25c4a" },
  { from: 18, to: 20, label: "Offices", color: "#5c6f83" },
  { from: 21, to: 21, label: "HDI Global", tenant: "HDI Global", color: "#7bb661" },
  { from: 22, to: 22, label: "Offices", color: "#5c6f83" },
  { from: 23, to: 23, label: "Zalando", tenant: "Zalando", color: "#ff6900" },
  { from: 24, to: 24, label: "Crypto Finance", tenant: "Crypto Finance", color: "#a78bfa" },
  { from: 25, to: 32, label: "Homburger AG", tenant: "Homburger", color: "#7dd3c0" },
  { from: 33, to: 33, label: "Deutsche Bank client advisory (historic) · offices", color: "#5c6f83" },
  { from: 34, to: 34, label: "Clouds Conference Center", tenant: "Clouds", color: "#f7f1e3" },
  { from: 35, to: 35, label: "Clouds Restaurant · Bar · Lounge", tenant: "Clouds", color: "#ffffff" },
];

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
  { title: "Wikipedia (EN) – Prime Tower", url: "https://en.wikipedia.org/wiki/Prime_Tower" },
  { title: "Wikipedia (DE) – Prime Tower", url: "https://de.wikipedia.org/wiki/Prime_Tower" },
  { title: "Bilanz – Prime Tower zieht neue Mieter an (Jan 2022)", url: "https://www.bilanz.ch/bilanz/zurich-prime-tower-zieht-neue-mieter-an-die-preise-steigen-359459" },
  { title: "Clouds – restaurant, bar & conference", url: "https://clouds.ch/en/" },
  { title: "Historisches Lexikon der Schweiz – Maag", url: "https://hls-dhs-dss.ch/de/articles/041806" },
];

export type Plan = { title: string; url: string; note: string; kind: "plan" | "section" | "site" | "pdf" };

/** Published drawings. They are copyrighted by Gigon/Guyer and JLL/Swiss Prime Site, so we link rather than copy. */
export const plans: Plan[] = [
  { kind: "site", title: "Site plan, Maag-Areal", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_S_1500_all_www2-1500x988.jpg", note: "I Prime Tower, II Platform, III Diagonal, IV Cubus between the railway and the Hardbrücke ramp." },
  { kind: "plan", title: "Ground floor", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_00_www-1500x1030.jpg", note: "Entrance hall, reception, lift lobby, garage stair, bank branch, café, restaurant reception. Dashed lines mark the overhangs above." },
  { kind: "plan", title: "1st floor", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_01_www-1500x1030.jpg", note: "Gallery level over the double-height lobby." },
  { kind: "plan", title: "10th floor", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_10_www-1500x1030.png", note: "Typical lower floor on the base octagon." },
  { kind: "plan", title: "24th floor", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_24_www-1500x1030.png", note: "Typical upper floor with the north-east and Hardbrücke extensions." },
  { kind: "plan", title: "31st floor, Homburger fit-out", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_GR_31_300_Homburger_BW_01_www-1500x1030.jpg", note: "West cantilever present; law-firm layout at 1:300." },
  { kind: "plan", title: "35th floor, Clouds", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_22T_GR_35_2018_rot_gelb_Moebel_118_www-1500x1030.jpg", note: "Restaurant, bistro and bar with the kitchen band along the core (2018 refurbishment)." },
  { kind: "section", title: "Section A–A", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_SCH_BW_01_D_oL-1_www-942x1500.png", note: "Two basement levels on a pile foundation, Diagonal to the left, Hardbrücke to the right." },
  { kind: "section", title: "Section B–B", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_SCH_2_300_BW_01_D_oL_www-1108x1500.png", note: "Long-axis section through the three cores showing the steps at floors 17 and 26." },
  { kind: "section", title: "Section, Clouds restaurant", url: "https://www.gigon-guyer.ch/wp-content/uploads/152_4_2_SCH_150_Gastro_BW_01_www-1500x360.png", note: "Floors 34–35 at 1:150." },
  { kind: "pdf", title: "Letting plan 2. OG (526 m²)", url: "https://www.primetower.ch/wp-content/uploads/2019/05/2OG_Prime_Tower.pdf", note: "Vector PDF with north arrow and 20 m scale bar, cores TK1–TK3, columns." },
  { kind: "pdf", title: "Letting plan 3. OG (1,085 m²)", url: "https://www.primetower.ch/wp-content/uploads/2019/05/3OG_Prime_Tower.pdf", note: "The plan the 3D footprint was measured from: 56.8 × 39.3 m bounding box, 1,600 m² inside the facade." },
  { kind: "pdf", title: "Letting plan 4. OG (1,085 m²)", url: "https://www.primetower.ch/wp-content/uploads/2019/05/4OG_Prime_Tower.pdf", note: "Clear room height 2.77 m." },
];
