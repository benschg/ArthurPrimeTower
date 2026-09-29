import { l, type L } from "@/i18n";

/**
 * Researched profiles of every company in docs/tenants.md (September 2026).
 * Long-form notes and all sources: docs/tenant-profiles.md.
 * Logos and feature images: src/data/tenantAssets.ts (keyed by slug).
 */

export type ProfileBuilding = "Prime Tower" | "Platform" | "Cubus" | "Diagonal" | "MAAG Halle";
export type ProfileStatus = "current" | "former" | "moved" | "service" | "unconfirmed";
export type ProfileCategory = "law" | "finance" | "consulting" | "tech" | "realestate" | "energy" | "food" | "retail" | "health" | "culture" | "media";

export type TenantProfile = {
  slug: string;
  name: string;
  building: ProfileBuilding;
  category: ProfileCategory;
  status: ProfileStatus;
  /** Known floor numbers in the tower (0 = ground floor). */
  floors?: number[];
  floorsLabel?: L;
  since?: string;
  /** Floor colour in the 3D model. */
  color?: string;
  summary: L;
  atTower: L;
  notes?: L[];
  website?: string;
  sources: { title: string; url: string }[];
};

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const tenantProfiles: TenantProfile[] = [
  // ── Prime Tower offices ─────────────────────────────────────────────
  {
    slug: "homburger",
    color: "#7dd3c0",
    name: "Homburger AG",
    building: "Prime Tower",
    category: "law",
    status: "current",
    floors: range(25, 32),
    floorsLabel: l("8 upper floors (25–32), reception on 31", "8 obere Geschosse (25–32), Empfang im 31."),
    since: "2011",
    summary: l(
      "Leading Swiss corporate law firm for M&A, capital markets, banking, litigation and tax. Founded in 1957 by Prof. Eric Homburger and owned by its partners: 41 partners and more than 160 lawyers.",
      "Führende Schweizer Wirtschaftskanzlei für M&A, Kapitalmarkt, Banking, Prozessführung und Steuern. 1957 von Prof. Eric Homburger gegründet und im Besitz der Partner: 41 Partner und über 160 Anwältinnen und Anwälte.",
    ),
    atTower: l(
      "The anchor tenant, signed before completion. Moved in 2011 into eight upper floors with its own Gigon/Guyer fit-out.",
      "Ankermieterin, noch vor der Fertigstellung unterschrieben. Zog 2011 in acht obere Geschosse mit eigenem Ausbau von Gigon/Guyer.",
    ),
    notes: [
      l("Dieter Gericke became Managing Partner in 2025.", "Dieter Gericke ist seit 2025 Managing Partner."),
      l("Legalcommunity CH Capital Markets Law Firm of the Year 2025, for the third year running.", "Legalcommunity CH «Law Firm of the Year – Capital Markets» 2025, zum dritten Mal in Folge."),
    ],
    website: "https://www.homburger.ch",
    sources: [
      { title: "Swiss Prime Site, topping-out release 2010", url: "https://sps.swiss/fileadmin/user_upload/redakteure/gruppe/pdf/pressemitteilungen/en/2010-07-07---Prime-Tower---topping-out-ceremony-for-Switzerlands-highe.pdf" },
      { title: "Homburger: new managing partner", url: "https://www.homburger.ch/en/news/dieter-gericke-new-managing-partner-of-homburger/" },
    ],
  },
  {
    slug: "deutsche-bank",
    color: "#4f8fd6",
    name: "Deutsche Bank (Schweiz) AG",
    building: "Prime Tower",
    category: "finance",
    status: "current",
    floors: [14, 15],
    floorsLabel: l("3 floors incl. 14–15 (was 5)", "3 Geschosse inkl. 14–15 (vorher 5)"),
    since: "2011",
    summary: l(
      "Swiss arm of Deutsche Bank: wealth management, corporate and investment banking, plus DWS asset management. About 600 staff in Zurich and Geneva.",
      "Schweizer Einheit der Deutschen Bank: Vermögensverwaltung, Firmenkunden- und Investmentbanking sowie DWS-Asset-Management. Rund 600 Mitarbeitende in Zürich und Genf.",
    ),
    atTower: l(
      "Signed in December 2010 for more than 5,000 m², citing the space concept and LEED certification. Moved in around December 2011 and later reduced from five floors to three.",
      "Unterschrieb im Dezember 2010 für über 5000 m² und nannte Raumkonzept und LEED-Zertifizierung als Gründe. Einzug um Dezember 2011, später von fünf auf drei Geschosse verkleinert.",
    ),
    notes: [l("Clemens Kaiser became Chief Country Officer in March 2025, aiming to double Swiss clients and revenue in five years.", "Clemens Kaiser wurde im März 2025 Chief Country Officer, mit dem Ziel, Kundschaft und Ertrag in der Schweiz in fünf Jahren zu verdoppeln.")],
    website: "https://country.db.com/switzerland",
    sources: [
      { title: "Drees & Sommer fit-out", url: "https://dreso.com/de/en/projects/details/tenant-fitout-prime-tower-deutsche-bank" },
      { title: "finews: new Swiss CEO", url: "https://www.finews.ch/news/banken/66931-deutsche-bank-schweiz-new-ceo-clemens-kaiser-zurich-swiss-finance-place" },
    ],
  },
  {
    slug: "citibank",
    name: "Citibank (Switzerland) AG",
    building: "Prime Tower",
    category: "finance",
    status: "current",
    floorsLabel: l("4 floors (numbers not published)", "4 Geschosse (Nummern nicht publiziert)"),
    since: "2011",
    summary: l(
      "Citigroup's Swiss bank for corporate, institutional and private-bank clients. Citi has been in Switzerland since 1963 and has about 400 staff there and in Monaco.",
      "Die Schweizer Bank der Citigroup für Firmen-, institutionelle und Private-Banking-Kunden. Citi ist seit 1963 in der Schweiz und beschäftigt hier und in Monaco rund 400 Personen.",
    ),
    atTower: l(
      "A pre-let tenant. In 2011 about 300 workplaces moved into four floors, which were refitted in 2014 (about 4,000 m²).",
      "Vorvermietete Mieterin. 2011 zogen rund 300 Arbeitsplätze in vier Geschosse, die 2014 neu ausgebaut wurden (rund 4000 m²).",
    ),
    notes: [l("Country Officer Marni McManus since 2022.", "Country Officer ist seit 2022 Marni McManus.")],
    website: "https://www.citigroup.com/global/about-us/global-presence/switzerland",
    sources: [
      { title: "Emch+Berger: move to Prime Tower", url: "https://www.emchberger.ch/de/move-prime-tower?division=71" },
      { title: "finews: new Swiss head", url: "https://www.finews.ch/news/banken/47715-citi-ernennt-neue-schweiz-chefin" },
    ],
  },
  {
    slug: "gam",
    name: "GAM Investments",
    building: "Prime Tower",
    category: "finance",
    status: "current",
    floorsLabel: l("1 floor", "1 Geschoss"),
    since: "2011",
    summary: l(
      "Independent asset manager founded in 1983 and listed on SIX. CHF 12.7 bn under management (June 2026) and about 227 staff.",
      "Unabhängiger Vermögensverwalter, 1983 gegründet und an der SIX kotiert. 12,7 Mrd. Franken verwaltete Vermögen (Juni 2026) und rund 227 Mitarbeitende.",
    ),
    atTower: l(
      "GAM Holding AG has its registered seat at Hardstrasse 201. Its predecessor Swiss & Global Asset Management was an opening tenant in 2011.",
      "Die GAM Holding AG hat ihren Sitz an der Hardstrasse 201. Die Vorgängerin Swiss & Global Asset Management war 2011 Erstmieterin.",
    ),
    notes: [l("Turnaround backed by Xavier Niel's NJJ; CEO Albert Saporta. FY2025 net loss CHF 74.2 m.", "Sanierung mit Unterstützung von Xavier Niels NJJ; CEO Albert Saporta. Reinverlust 2025: 74,2 Mio. Franken.")],
    website: "https://www.gam.com",
    sources: [
      { title: "GAM full-year results 2025", url: "https://www.boerse-online.de/dpa-afx/gnw-news-gam-gibt-ergebnisse-fuer-das-gesamtjahr-2025-bekannt-512559.html" },
      { title: "Wikipedia: GAM", url: "https://en.wikipedia.org/wiki/GAM_(company)" },
    ],
  },
  {
    slug: "crypto-finance",
    color: "#a78bfa",
    name: "Crypto Finance AG",
    building: "Prime Tower",
    category: "finance",
    status: "current",
    floors: [24],
    floorsLabel: l("24", "24"),
    since: "2022",
    summary: l(
      "FINMA-licensed broker, custodian and asset manager for digital assets, serving institutions. Founded in 2017 in Zug and majority-owned by Deutsche Börse since 2021.",
      "Von der FINMA bewilligter Broker, Verwahrer und Vermögensverwalter für digitale Assets für institutionelle Kunden. 2017 in Zug gegründet, seit 2021 mehrheitlich im Besitz der Deutschen Börse.",
    ),
    atTower: l("Headquarters on floor 24 with 105 workplaces since 2022. More than 90 % of staff work in Zurich.", "Hauptsitz im 24. Geschoss mit 105 Arbeitsplätzen seit 2022. Über 90 % der Belegschaft arbeiten in Zürich."),
    notes: [l("CEO Stijn Vander Straeten since November 2023.", "CEO ist seit November 2023 Stijn Vander Straeten.")],
    website: "https://www.crypto-finance.com",
    sources: [
      { title: "Bilanz, January 2022", url: "https://www.bilanz.ch/bilanz/zurich-prime-tower-zieht-neue-mieter-an-die-preise-steigen-359459" },
      { title: "finews 2026", url: "https://www.finews.ch/news/finanzplatz/73637-stijn-vander-straeten-cryptofinance-bitcoin-etp-micar-blackrock-verwahrung-kryptobranche-deutscheboerse-stablecoins-cbdc" },
    ],
  },
  {
    slug: "zalando",
    color: "#ff6900",
    name: "Zalando Switzerland AG",
    building: "Prime Tower",
    category: "tech",
    status: "current",
    floors: [23, 7],
    floorsLabel: l("23 + half of 7 (1,700 m²)", "23 + halbes 7. (1700 m²)"),
    since: "2022",
    summary: l(
      "Zalando's Zurich tech hub builds size-and-fit and recommendation systems. It grew out of the ETH spin-off Fision, which Zalando bought in 2020.",
      "Der Zürcher Tech-Hub von Zalando entwickelt Grössenberatung und Empfehlungssysteme. Er entstand aus dem ETH-Spin-off Fision, das Zalando 2020 übernahm.",
    ),
    atTower: l(
      "Leased floor 23 and half of floor 7 in October 2021 for more than 150 staff and moved in in September 2022. Zalando's own blog put the team at about 40 in October 2024.",
      "Mietete im Oktober 2021 das 23. und das halbe 7. Geschoss für über 150 Personen und zog im September 2022 ein. Laut Zalandos eigenem Blog umfasste das Team im Oktober 2024 rund 40 Personen.",
    ),
    website: "https://jobs.zalando.com/en/where-we-work/zurich",
    sources: [
      { title: "Netzwoche 2021", url: "https://www.netzwoche.ch/news/2021-10-15/zalando-zieht-in-zuercher-prime-tower-ein" },
      { title: "primetower.ch interview", url: "https://www.primetower.ch/en/2022/08/5-questions-for-dunja-maria-bischof-site-operations-lead-at-zalando" },
      { title: "Zalando blog: inside the Zurich hub", url: "https://jobs.zalando.com/en/blog/inside-zurich-tech-hub" },
    ],
  },
  {
    slug: "hdi-global",
    color: "#7bb661",
    name: "HDI Global SE",
    building: "Prime Tower",
    category: "finance",
    status: "current",
    floors: [21],
    floorsLabel: l("21 (about 1,200 m²)", "21 (rund 1200 m²)"),
    summary: l(
      "Swiss branch of the Talanx group's industrial insurer, covering property, liability, marine and specialty risks. About 94 staff in Switzerland and Liechtenstein.",
      "Schweizer Niederlassung des Industrieversicherers der Talanx-Gruppe für Sach-, Haftpflicht-, Transport- und Spezialrisiken. Rund 94 Mitarbeitende in der Schweiz und in Liechtenstein.",
    ),
    atTower: l("Branch headquarters on floor 21. Move-in year not published.", "Hauptsitz der Niederlassung im 21. Geschoss. Einzugsjahr nicht publiziert."),
    notes: [l("CEO Marc Luginbühl since 2020. Best Workplaces Switzerland 2024, rank 7.", "CEO Marc Luginbühl seit 2020. Best Workplaces Switzerland 2024, Rang 7.")],
    website: "https://www.hdi.global/ch/de/",
    sources: [
      { title: "Great Place to Work", url: "https://greatplacetowork.ch/en/employer/hdi-global-se-zurich-branch-switzerland/" },
      { title: "Intelligent Insurer: new Swiss CEO", url: "https://www.intelligentinsurer.com/news/hdi-global-hires-zurich-exec-as-new-ceo-of-switzerland-22588" },
    ],
  },
  {
    slug: "oracle",
    color: "#e25c4a",
    name: "Oracle Software (Schweiz) GmbH",
    building: "Prime Tower",
    category: "tech",
    status: "current",
    floors: [17],
    floorsLabel: l("17 (entire floor)", "17 (ganzes Geschoss)"),
    since: "2018",
    summary: l(
      "Oracle's Swiss subsidiary, legally based in Baden-Dättwil. The Zurich site hosts Oracle Labs, home of GraalVM, and a customer innovation space.",
      "Die Schweizer Tochter von Oracle mit Sitz in Baden-Dättwil. Am Zürcher Standort arbeiten Oracle Labs, die Heimat von GraalVM, und ein Innovationsraum für Kunden.",
    ),
    atTower: l(
      "The SMART Innovation Center opened on the whole of floor 17 on 17 April 2018, with about 50 researchers. Whether it is still there is not published.",
      "Das SMART Innovation Center eröffnete am 17. April 2018 auf dem ganzen 17. Geschoss mit rund 50 Forschenden. Ob es noch dort ist, ist nicht publiziert.",
    ),
    website: "https://www.oracle.com/ch-de/",
    sources: [{ title: "Netzwoche 2018", url: "https://www.netzwoche.ch/news/2018-04-18/oracle-mietet-sich-im-prime-tower-ein" }],
  },
  {
    slug: "roland-berger",
    name: "Roland Berger AG",
    building: "Prime Tower",
    category: "consulting",
    status: "current",
    floorsLabel: l("1 floor, about 70 staff", "1 Geschoss, rund 70 Personen"),
    since: "2021",
    summary: l(
      "Swiss office of the Munich strategy consultancy, which has about 3,500 staff worldwide. Zurich is its only Swiss office.",
      "Schweizer Büro der Münchner Strategieberatung mit weltweit rund 3500 Mitarbeitenden. Zürich ist der einzige Schweizer Standort.",
    ),
    atTower: l(
      "Moved from Seefeld in January 2021 and went from five floors to one. The partners cite transport links, a single floor and the mountain view.",
      "Zog im Januar 2021 aus dem Seefeld hierher und von fünf Geschossen auf eines. Die Partner nennen die Verkehrsanbindung, ein einziges Geschoss und die Bergsicht.",
    ),
    website: "https://www.rolandberger.com",
    sources: [{ title: "primetower.ch: new arrival", url: "https://www.primetower.ch/en/2021/03/roland-berger-ag-our-new-arrival-at-the-prime-tower/" }],
  },
  {
    slug: "repower",
    color: "#e0a458",
    name: "Repower AG",
    building: "Prime Tower",
    category: "energy",
    status: "current",
    floors: [6],
    floorsLabel: l("Reception on 6", "Empfang im 6."),
    summary: l(
      "Graubünden energy group for hydro, wind, solar, grids and trading, headquartered in Poschiavo. 747 staff and a 2025 group profit of CHF 101 m.",
      "Bündner Energiekonzern für Wasser-, Wind- und Solarkraft, Netze und Handel mit Sitz in Poschiavo. 747 Mitarbeitende und 101 Mio. Franken Konzerngewinn 2025.",
    ),
    atTower: l("The Zurich office has its reception on floor 6. Functions and headcount are not published.", "Das Zürcher Büro hat seinen Empfang im 6. Geschoss. Funktionen und Personalbestand sind nicht publiziert."),
    website: "https://www.repower.com",
    sources: [{ title: "Repower Zurich directions (2023)", url: "https://repower.com/new-media/l25nsi1o/zuerich_2023_en.pdf" }],
  },
  {
    slug: "korn-ferry",
    name: "Korn Ferry",
    building: "Prime Tower",
    category: "consulting",
    status: "current",
    since: "2012",
    summary: l(
      "US executive-search and organisational consulting firm, listed on the NYSE. Its Swiss office opened in 1987.",
      "US-Kaderselektions- und Organisationsberatung, an der NYSE kotiert. Das Schweizer Büro besteht seit 1987.",
    ),
    atTower: l(
      "Moved in on 2 April 2012 after doubling to about 50 staff in three years. Zurich was to become its European headquarters.",
      "Zog am 2. April 2012 ein, nachdem sich das Team in drei Jahren auf rund 50 Personen verdoppelt hatte. Zürich sollte zum europäischen Hauptsitz werden.",
    ),
    website: "https://www.kornferry.com",
    sources: [{ title: "moneycab 2012", url: "https://www.moneycab.com/?p=1116197" }],
  },
  {
    slug: "jll",
    color: "#d9534f",
    name: "JLL (Jones Lang LaSalle) AG",
    building: "Prime Tower",
    category: "realestate",
    status: "current",
    floors: [13],
    floorsLabel: l("13 (expanded 2022)", "13 (2022 erweitert)"),
    since: "2011",
    summary: l(
      "Swiss arm of the real-estate services group, founded in 2011 by Jan Eckert with 11 staff. It is also the tower's letting agent.",
      "Schweizer Einheit des Immobiliendienstleisters, 2011 von Jan Eckert mit 11 Personen gegründet. JLL ist zugleich Vermarkterin des Turms.",
    ),
    atTower: l("Moved in in November 2011 and expanded on floor 13 in 2022. About 40 of its 60 Swiss staff work in the tower.", "Einzug im November 2011, 2022 im 13. Geschoss erweitert. Rund 40 der 60 Schweizer Mitarbeitenden arbeiten im Turm."),
    website: "https://www.jll.ch",
    sources: [
      { title: "primetower.ch", url: "https://www.primetower.ch/?p=1050" },
      { title: "immobilienbusiness", url: "https://www.immobilienbusiness.ch/en/?p=54206" },
    ],
  },
  {
    slug: "cognizant",
    color: "#2ab7ca",
    name: "Cognizant Technology Solutions AG",
    building: "Prime Tower",
    category: "tech",
    status: "current",
    floors: [18],
    floorsLabel: l("18", "18"),
    since: "2017",
    summary: l(
      "Swiss unit of the US IT-services group, which had USD 21.1 bn revenue in 2025. Legal seat in Baar, Zurich branch since 2003.",
      "Schweizer Einheit des US-IT-Dienstleisters mit 21,1 Mrd. Dollar Umsatz 2025. Sitz in Baar, Zürcher Zweigniederlassung seit 2003.",
    ),
    atTower: l("The Zurich office moved to floor 18 in 2017. Cognizant Netcentric also lists the tower as its Zurich hub.", "Das Zürcher Büro zog 2017 ins 18. Geschoss. Auch Cognizant Netcentric führt den Turm als Zürcher Standort."),
    website: "https://www.cognizant.com/ch/",
    sources: [
      { title: "20 years of Cognizant in Switzerland", url: "https://www.cognizant.com/ch/en/about-cognizant/20-years-cognizant-switzerland" },
      { title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/cognizant-technology-solutions-ag-zweignieder-20466565121" },
    ],
  },
  {
    slug: "nexxiot",
    name: "Nexxiot AG",
    building: "Prime Tower",
    category: "tech",
    status: "moved",
    summary: l(
      "Zurich IoT company whose sensors and software track rail wagons and shipping containers. About 120 staff; Knorr-Bremse is the largest shareholder.",
      "Zürcher IoT-Firma, deren Sensoren und Software Güterwagen und Container verfolgen. Rund 120 Mitarbeitende; grösste Aktionärin ist Knorr-Bremse.",
    ),
    atTower: l(
      "Formerly at Hardstrasse 201. The register and website now give Nordstrasse 15, 8006 Zürich.",
      "Früher an der Hardstrasse 201. Handelsregister und Website nennen heute die Nordstrasse 15, 8006 Zürich.",
    ),
    notes: [l("CEO Maximilian Eichhorn since June 2024.", "CEO ist seit Juni 2024 Maximilian Eichhorn.")],
    website: "https://www.nexxiot.com",
    sources: [
      { title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/nexxiot-ag-11228190091" },
      { title: "SQS certificate", url: "https://www.sqs.ch/de/node/742847" },
    ],
  },
  {
    slug: "swiss-prime-site",
    name: "Swiss Prime Site",
    building: "Prime Tower",
    category: "realestate",
    status: "current",
    floorsLabel: l("Gave half a floor to Zalando in 2022", "Gab 2022 ein halbes Geschoss an Zalando ab"),
    summary: l(
      "The tower's owner and Switzerland's largest listed real-estate company, with a CHF 14.0 bn portfolio (H1 2026). CEO Marcel Kucher since January 2026.",
      "Eigentümerin des Turms und grösste kotierte Immobiliengesellschaft der Schweiz mit einem Portfolio von 14,0 Mrd. Franken (H1 2026). CEO Marcel Kucher seit Januar 2026.",
    ),
    atTower: l(
      "Swiss Prime Site Immobilien AG is registered at Hardstrasse 201, and Swiss Prime Site Solutions AG lists an office here.",
      "Die Swiss Prime Site Immobilien AG ist an der Hardstrasse 201 eingetragen, die Swiss Prime Site Solutions AG führt hier ein Büro.",
    ),
    website: "https://sps.swiss",
    sources: [
      { title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/swiss-prime-site-immobilien-ag-2865116581" },
      { title: "H1 2026 results", url: "https://live.deutsche-boerse.com/nachrichten/1H26-Swiss-Prime-Site-mit-starkem-operativem-Ergebnis-und-nachhaltigem-Wachstum-FFO-I-von-CHF-215-pro-Aktie-24-bfab409b-06c5-4055-a924-f8170d8776af" },
    ],
  },
  {
    slug: "flexoffice",
    color: "#f2c14e",
    name: "FlexOffice (Schweiz) AG",
    building: "Prime Tower",
    category: "realestate",
    status: "current",
    floors: [3, 4],
    floorsLabel: l("3 and 4", "3 und 4"),
    since: "2023",
    summary: l(
      "Swiss flexible-workspace operator with sites in Zurich, Basel, Bern and Geneva. Founder and CEO Andreas Brandl.",
      "Schweizer Anbieter flexibler Arbeitsplätze mit Standorten in Zürich, Basel, Bern und Genf. Gründer und CEO ist Andreas Brandl.",
    ),
    atTower: l(
      "Floors 3 and 4 since March 2023: team offices for 2 to 30 people and three corporate suites of 200 to 300 m².",
      "Seit März 2023 im 3. und 4. Geschoss: Teambüros für 2 bis 30 Personen und drei Firmensuiten mit 200 bis 300 m².",
    ),
    website: "https://flexoffice.swiss",
    sources: [
      { title: "primetower.ch interview", url: "https://www.primetower.ch/en/2022/08/5-questions-for-andreas-brandl-ceo-flexoffice/" },
      { title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/flexoffice-schweiz-ag-5911764641" },
    ],
  },
  {
    slug: "humanis",
    name: "Humanis AG",
    building: "Prime Tower",
    category: "consulting",
    status: "current",
    summary: l(
      "Zurich recruitment firm since 1986 for finance, HR, IT, sales and assistant roles, with about 30 staff.",
      "Zürcher Personalberatung seit 1986 für Finanzen, HR, IT, Verkauf und Assistenz, mit rund 30 Mitarbeitenden.",
    ),
    atTower: l("Its only office is in the tower. Move-in date and floor are not published.", "Das einzige Büro liegt im Turm. Einzugsdatum und Geschoss sind nicht publiziert."),
    website: "https://www.humanis.ch",
    sources: [{ title: "jobs.ch company profile", url: "https://www.jobs.ch/en/companies/536-humanis-ag/" }],
  },
  {
    slug: "schilling-partners",
    name: "schilling partners ag",
    building: "Prime Tower",
    category: "consulting",
    status: "current",
    summary: l(
      "Executive-search boutique for boards and top management, known for the annual schillingreport. About 30 staff; chairman Guido Schilling.",
      "Boutique für Kaderselektion auf Verwaltungsrats- und Geschäftsleitungsstufe, bekannt für den jährlichen schillingreport. Rund 30 Mitarbeitende; Präsident Guido Schilling.",
    ),
    atTower: l("Registered at Hardstrasse 201. Move-in date not published.", "An der Hardstrasse 201 eingetragen. Einzugsdatum nicht publiziert."),
    notes: [l("Guido Schilling also co-founded MAAG Music & Arts next door.", "Guido Schilling hat auch MAAG Music & Arts nebenan mitgegründet.")],
    website: "https://www.schillingpartners.ch",
    sources: [{ title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/schilling-partners-ag-13447371151" }],
  },
  {
    slug: "universal-music",
    name: "Universal Music (Switzerland)",
    building: "Prime Tower",
    category: "media",
    status: "current",
    since: "2023",
    summary: l("Swiss label arm of Universal Music Group, plus Universal Music Publishing Switzerland.", "Schweizer Label-Gesellschaft der Universal Music Group sowie Universal Music Publishing Switzerland."),
    atTower: l("Both companies are registered at Hardstrasse 201; the address changed in October 2023.", "Beide Gesellschaften sind an der Hardstrasse 201 eingetragen; die Adresse wechselte im Oktober 2023."),
    website: "https://www.universalmusic.ch",
    sources: [{ title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/universal-music-gmbh-10323587051" }],
  },
  {
    slug: "a-connect",
    name: "a-connect ag",
    building: "Prime Tower",
    category: "consulting",
    status: "current",
    summary: l(
      "Zurich-founded consultancy (2002) running a network of 2,800+ independent consultants in life sciences, agribusiness, food and private equity.",
      "In Zürich gegründete Beratung (2002) mit einem Netzwerk von über 2800 unabhängigen Beraterinnen und Beratern für Life Sciences, Agrar, Food und Private Equity.",
    ),
    atTower: l("Registered at \"Hardstrasse 201, Primetower\"; previously at Seefeldstrasse.", "Eingetragen an der «Hardstrasse 201, Primetower»; vorher an der Seefeldstrasse."),
    website: "https://www.a-connect.com",
    sources: [{ title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/a-connect-ag-11219690701" }],
  },
  {
    slug: "assess-perform",
    name: "Assess + Perform AG",
    building: "Prime Tower",
    category: "consulting",
    status: "current",
    summary: l("Small firm for assessments, coaching and career counselling.", "Kleine Firma für Assessments, Coaching und Laufbahnberatung."),
    atTower: l(
      "Its sole board member is also a partner at schilling partners. Both firms were registered on the same day at the same address.",
      "Das einzige Verwaltungsratsmitglied ist auch Partnerin bei schilling partners. Beide Firmen wurden am selben Tag an derselben Adresse eingetragen.",
    ),
    website: "https://www.assessandperform.ch",
    sources: [{ title: "Moneyhouse", url: "https://moneyhouse.ch/en/company/assess-perform-ag-13447007241" }],
  },
  {
    slug: "credit-exchange",
    name: "Credit Exchange AG (CredEx)",
    building: "Prime Tower",
    category: "finance",
    status: "current",
    summary: l(
      "B2B marketplace for Swiss mortgages founded in 2018. It matches brokers with banks, insurers and pension funds and does not lend itself.",
      "B2B-Marktplatz für Schweizer Hypotheken, 2018 gegründet. Er bringt Vermittler mit Banken, Versicherungen und Pensionskassen zusammen und vergibt selbst keine Kredite.",
    ),
    atTower: l("Registered at Hardstrasse 201. Move-in and floor not published.", "An der Hardstrasse 201 eingetragen. Einzug und Geschoss nicht publiziert."),
    notes: [l("Shareholders include Bank Avera, Mobiliar, Swisscom, Vaudoise, PostFinance and two cantonal banks.", "Zu den Aktionären gehören Bank Avera, Mobiliar, Swisscom, Vaudoise, PostFinance und zwei Kantonalbanken.")],
    website: "https://www.creditexchange.ch",
    sources: [
      { title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/credit-exchange-ag-20276919011" },
      { title: "finews", url: "https://www.finews.ch/news/finanzplatz/58809-glbk-postfinance-credex-beteiligung" },
    ],
  },
  {
    slug: "equans",
    name: "Equans Switzerland FM AG",
    building: "Prime Tower",
    category: "realestate",
    status: "service",
    summary: l("Facility-management arm of Equans Switzerland, part of the Bouygues group, with about 1,800 staff.", "Facility-Management-Einheit von Equans Switzerland aus der Bouygues-Gruppe, mit rund 1800 Mitarbeitenden."),
    atTower: l("Runs reception and facility management for the site. No lease at Hardstrasse 201 is registered.", "Betreibt Empfang und Facility Management für das Areal. An der Hardstrasse 201 ist kein Mietverhältnis eingetragen."),
    website: "https://www.equans.ch",
    sources: [
      { title: "primetower.ch site page", url: "https://www.primetower.ch/en/areal-en/" },
      { title: "Moneyhouse", url: "https://www.moneyhouse.ch/de/company/equans-switzerland-facility-management-8146598621" },
    ],
  },
  {
    slug: "wincasa",
    name: "Wincasa AG",
    building: "Prime Tower",
    category: "realestate",
    status: "service",
    summary: l(
      "Real-estate service provider with about 1,000 staff. Swiss Prime Site bought it in 2012 and sold it to Implenia in 2023.",
      "Immobiliendienstleister mit rund 1000 Mitarbeitenden. Swiss Prime Site kaufte ihn 2012 und verkaufte ihn 2023 an Implenia.",
    ),
    atTower: l("Manages the site: operating costs, service charges and steering the facility-management provider.", "Bewirtschaftet das Areal: Betriebs- und Nebenkosten sowie Steuerung des Facility-Management-Anbieters."),
    website: "https://www.wincasa.ch",
    sources: [
      { title: "Wincasa: Prime Tower", url: "https://www.wincasa.ch/en-ch/prime-tower" },
      { title: "Swiss Prime Site: sale to Implenia", url: "https://sps.swiss/en/group/media/media-releases/overview/media-release-detail/swiss-prime-site-to-sell-wincasa-to-implenia" },
    ],
  },
  {
    slug: "trammo",
    name: "Trammo",
    building: "Prime Tower",
    category: "energy",
    status: "former",
    since: "2011",
    summary: l("Privately held New York trader of ammonia, sulphur and fertilizers, founded in 1965 as Transammonia.", "Private New Yorker Händlerin von Ammoniak, Schwefel und Düngemitteln, 1965 als Transammonia gegründet."),
    atTower: l(
      "Trammochem AG moved to Hardstrasse 201 in 2011 and was merged away in 2013. Its successor Trammo GmbH is in Altendorf SZ.",
      "Die Trammochem AG zog 2011 an die Hardstrasse 201 und wurde 2013 fusioniert. Die Nachfolgerin Trammo GmbH sitzt in Altendorf SZ.",
    ),
    website: "https://www.trammo.com",
    sources: [
      { title: "Moneyhouse: Trammochem", url: "https://www.moneyhouse.ch/de/company/trammochem-ag-20890381871" },
      { title: "Moneyhouse: Trammo GmbH", url: "https://www.moneyhouse.ch/de/company/trammo-gmbh-21462829711" },
    ],
  },
  {
    slug: "infosys",
    name: "Infosys",
    building: "Prime Tower",
    category: "tech",
    status: "unconfirmed",
    summary: l("Indian IT-services group, in Switzerland for 25 years.", "Indischer IT-Dienstleister, seit 25 Jahren in der Schweiz."),
    atTower: l(
      "Often listed as a 2011 opening tenant, but no source names a Prime Tower address. Opened a new Swiss headquarters at The Circle, Zurich Airport, on 23 January 2026.",
      "Oft als Erstmieter 2011 genannt, doch keine Quelle nennt eine Adresse im Turm. Eröffnete am 23. Januar 2026 einen neuen Schweizer Hauptsitz im Circle am Flughafen Zürich.",
    ),
    website: "https://www.infosys.com",
    sources: [
      { title: "Netzwoche 2026", url: "https://www.netzwoche.ch/news/2026-01-26/infosys-eroeffnet-buero-in-zuerich" },
      { title: "Infosys release", url: "https://www.infosys.com/newsroom/press-releases/2026/expands-accelerate-enterprise-ai-journeys-zurich.html" },
    ],
  },

  // ── Prime Tower ground floor and top ───────────────────────────────
  {
    slug: "clouds",
    color: "#ffffff",
    name: "Clouds",
    building: "Prime Tower",
    category: "food",
    status: "current",
    floors: [35],
    floorsLabel: l("35", "35"),
    since: "2011",
    summary: l(
      "Restaurant, bistro, bar and event room at the top of the tower, about 120 m up. The kitchen seats 100, the bistro 60, and the bar holds 70 standing.",
      "Restaurant, Bistro, Bar und Eventraum zuoberst im Turm, rund 120 m über Boden. Die Küche bietet 100 Plätze, das Bistro 60, die Bar 70 Stehplätze.",
    ),
    atTower: l("Opened on 12 December 2011. Candrian Catering has run it since 1 July 2015.", "Eröffnet am 12. Dezember 2011. Seit dem 1. Juli 2015 betreibt Candrian Catering das Lokal."),
    notes: [l("Falstaff named the bar among Switzerland's best in 2026.", "Falstaff zählte die Bar 2026 zu den besten der Schweiz.")],
    website: "https://www.clouds.ch",
    sources: [
      { title: "zuerich.com", url: "https://www.zuerich.com/de/besuchen/bars-lounges/clouds-bar-bistro" },
      { title: "Event venue data", url: "https://www.eventlokale.ch/site/_eventlokale/1/Schweiz/43378/clouds_ihr_eventlokal_im_prime_tower.html" },
    ],
  },
  {
    slug: "zkb",
    color: "#c9d6e2",
    name: "Zürcher Kantonalbank",
    building: "Prime Tower",
    category: "finance",
    status: "current",
    floors: [0],
    floorsLabel: l("Ground-floor branch", "Filiale im Erdgeschoss"),
    since: "2011",
    summary: l("The cantonal bank of Zurich, founded in 1870.", "Die Kantonalbank des Kantons Zürich, gegründet 1870."),
    atTower: l(
      "Moved in in June 2011 with a branch and about 100 asset-management staff on floors 3 and 4. It gave up its 3,800 m² of offices by 2020; only the branch remains.",
      "Zog im Juni 2011 mit einer Filiale und rund 100 Personen des Asset Managements ins 3. und 4. Geschoss. Bis 2020 gab sie ihre 3800 m² Büros auf; geblieben ist die Filiale.",
    ),
    website: "https://www.zkb.ch/de/standorte/zuerich-primetower.html",
    sources: [{ title: "Inside Paradeplatz 2017", url: "https://insideparadeplatz.ch/2017/06/30/zkb-verlaesst-prime-tower-cs-geht-raus-aus-leu-haus/" }],
  },
  {
    slug: "hotel-rivington-sons",
    color: "#c9d6e2",
    name: "Hotel Rivington & Sons",
    building: "Prime Tower",
    category: "food",
    status: "current",
    floors: [0],
    floorsLabel: l("Ground floor", "Erdgeschoss"),
    summary: l(
      "A two-level cocktail bar and café, not a hotel, styled as a 1930s New York speakeasy. The 1930s bar counter and six tonnes of subway tiles were shipped from New York.",
      "Eine zweistöckige Cocktailbar mit Café, kein Hotel, im Stil einer New Yorker Speakeasy der 1930er-Jahre. Der Bartresen aus den 1930ern und sechs Tonnen U-Bahn-Kacheln kamen aus New York.",
    ),
    atTower: l("In the tower lobby. Run by Raumzuerich GmbH, the team behind La Stanza.", "In der Lobby des Turms. Betrieben von der Raumzuerich GmbH, dem Team hinter La Stanza."),
    website: "https://rivington.ch",
    sources: [
      { title: "zuerich.com", url: "https://www.zuerich.com/de/besuchen/bars-lounges/hotel-rivington-sons" },
      { title: "NZZ", url: "https://www.nzz.ch/gesellschaft/ein-hotel-ohne-bett-muss-keine-mogelpackung-sein-ld.1821598" },
    ],
  },

  // ── Platform ───────────────────────────────────────────────────────
  {
    slug: "ey",
    name: "EY (Ernst & Young AG)",
    building: "Platform",
    category: "consulting",
    status: "current",
    since: "2011",
    summary: l("EY Switzerland's head office. EY has about 3,000 staff in Switzerland.", "Hauptsitz von EY Schweiz. EY beschäftigt in der Schweiz rund 3000 Personen."),
    atTower: l(
      "Gigon/Guyer built the seven-storey Platform for EY between 2009 and 2011: CHF 80 m, about 20,900 m² and 1,000 workplaces. EY never had floors in the tower itself.",
      "Gigon/Guyer bauten das siebengeschossige Platform 2009 bis 2011 für EY: 80 Mio. Franken, rund 20 900 m² und 1000 Arbeitsplätze. Im Turm selbst hatte EY nie Geschosse.",
    ),
    website: "https://www.ey.com/en_ch",
    sources: [{ title: "HRS: Platform project", url: "https://www.hrs.ch/en/projects/platform" }],
  },
  {
    slug: "ey-restaurant-platform",
    name: "Restaurant platform (ZFV)",
    building: "Platform",
    category: "food",
    status: "current",
    summary: l("Public staff restaurant and café in the EY building, run by the ZFV cooperative.", "Öffentliches Personalrestaurant mit Café im EY-Gebäude, betrieben von der Genossenschaft ZFV."),
    atTower: l("Ground floor of the Platform. Uses ZFV's climate-friendly FOOD2050 menu.", "Erdgeschoss des Platform. Kocht nach dem klimafreundlichen FOOD2050-Konzept der ZFV."),
    website: "https://zfv.ch/platform",
    sources: [{ title: "ZFV", url: "https://zfv.ch/platform" }],
  },
  {
    slug: "coop",
    name: "Coop",
    building: "Platform",
    category: "retail",
    status: "current",
    summary: l("Supermarket of the Swiss retail cooperative.", "Supermarkt der Schweizer Detailhandelsgenossenschaft."),
    atTower: l("Ground floor of the Platform building.", "Erdgeschoss des Platform-Gebäudes."),
    website: "https://www.coop.ch",
    sources: [{ title: "primetower.ch site page", url: "https://www.primetower.ch/en/areal-en/" }],
  },

  // ── Cubus ──────────────────────────────────────────────────────────
  {
    slug: "migrolino",
    name: "Migrolino",
    building: "Cubus",
    category: "retail",
    status: "current",
    summary: l("Migros convenience-store chain.", "Convenience-Kette der Migros."),
    atTower: l(
      "\"migrolino Zürich Prime Tower\" is actually at Hardstrasse 221 in the Cubus. Open Monday to Saturday from 06:00.",
      "«migrolino Zürich Prime Tower» liegt eigentlich an der Hardstrasse 221 im Cubus. Geöffnet Montag bis Samstag ab 06:00.",
    ),
    website: "https://www.migrolino.ch/de/standorte/migrolino-zurich-primetower",
    sources: [{ title: "migrolino location page", url: "https://www.migrolino.ch/de/standorte/migrolino-zurich-primetower" }],
  },
  {
    slug: "coop-pronto",
    name: "Coop Pronto",
    building: "Cubus",
    category: "retail",
    status: "unconfirmed",
    summary: l("Coop's convenience-store format.", "Das Convenience-Format von Coop."),
    atTower: l(
      "Still listed for the Cubus at Hardstrasse 221, but Migrolino now advertises a shop at the same address.",
      "Für den Cubus an der Hardstrasse 221 noch aufgeführt, doch Migrolino wirbt inzwischen an derselben Adresse mit einem Laden.",
    ),
    website: "https://www.coop-pronto.ch",
    sources: [{ title: "coop.ch location page", url: "https://www.coop.ch/de/unternehmen/standorte-und-oeffnungszeiten/detail.html/4577/coop-pronto-zuerich-prime-tower.html" }],
  },
  {
    slug: "kids-and-co",
    name: "kids & co Prime Tower",
    building: "Cubus",
    category: "health",
    status: "current",
    since: "2011",
    summary: l("Day nursery run by the non-profit profawo.", "Kita der gemeinnützigen profawo."),
    atTower: l(
      "Hardstrasse 223, opened in October 2011. 22 places in two groups for children from 3 months to 5 years.",
      "Hardstrasse 223, eröffnet im Oktober 2011. 22 Plätze in zwei Gruppen für Kinder von 3 Monaten bis 5 Jahren.",
    ),
    website: "https://kidsco.profawo.ch",
    sources: [{ title: "search.ch", url: "https://search.ch/tel/zuerich/hardstrasse-223/kids-co-prime-tower.en.html" }],
  },
  {
    slug: "kieser-training",
    name: "Kieser Training",
    building: "Cubus",
    category: "health",
    status: "current",
    summary: l("Strength-training studio of the Kieser chain, which has more than 170 studios.", "Krafttrainingsstudio der Kieser-Kette mit über 170 Studios."),
    atTower: l("Hardstrasse 223. Works with Physiokandil next door.", "Hardstrasse 223. Arbeitet mit Physiokandil nebenan zusammen."),
    website: "https://www.kieser-training.ch",
    sources: [{ title: "zuri.net", url: "https://zuri.net/en/zurich/gym/kieser-training-zurich-prime-tower-8992.htm" }],
  },
  {
    slug: "dr-semm",
    name: "Dr. Semm AG",
    building: "Cubus",
    category: "health",
    status: "current",
    summary: l("Gynaecology practice led by Dr. med. Isolde Semm, with about 9 staff.", "Gynäkologische Praxis unter der Leitung von Dr. med. Isolde Semm, mit rund 9 Mitarbeitenden."),
    atTower: l("\"Zentrum Prime Tower Cubus\" at Hardstrasse 221.", "«Zentrum Prime Tower Cubus» an der Hardstrasse 221."),
    website: "https://www.drsemm.ch",
    sources: [{ title: "comparis.ch", url: "https://en.comparis.ch/gesundheit/arzt/kanton-zuerich/zuerich/semm-isolde-7601003329537" }],
  },
  {
    slug: "physio-kandil",
    name: "Physiokandil GmbH",
    building: "Cubus",
    category: "health",
    status: "current",
    summary: l("Physiotherapy group with three practices, specialising in focused shockwave therapy.", "Physiotherapie mit drei Praxen, spezialisiert auf fokussierte Stosswellentherapie."),
    atTower: l("Confirmed at Hardstrasse 221 with a team of 6.", "Bestätigt an der Hardstrasse 221, mit einem Team von 6 Personen."),
    website: "https://physiokandil.ch/praxis-zuerich-prime-tower/",
    sources: [{ title: "Physiokandil locations", url: "https://physiokandil.ch/standorte/" }],
  },
  {
    slug: "zahnarztzentrum",
    name: "zahnarztzentrum.ch",
    building: "Cubus",
    category: "health",
    status: "current",
    summary: l("Swiss dental chain with 40+ locations and about 900 staff.", "Schweizer Zahnarztkette mit über 40 Standorten und rund 900 Mitarbeitenden."),
    atTower: l(
      "Confirmed: the \"Zürich Bahnhof Hardbrücke\" practice at Hardstrasse 223, with four dentists and Saturday hours.",
      "Bestätigt: die Praxis «Zürich Bahnhof Hardbrücke» an der Hardstrasse 223, mit vier Zahnärztinnen und -ärzten und Samstagsöffnung.",
    ),
    website: "https://zahnarztzentrum.ch/zuerich/hardbruecke",
    sources: [{ title: "zahnarztzentrum.ch", url: "https://zahnarztzentrum.ch/zuerich/hardbruecke" }],
  },

  // ── Diagonal ───────────────────────────────────────────────────────
  {
    slug: "galerie-presenhuber",
    name: "Galerie Eva Presenhuber",
    building: "Diagonal",
    category: "culture",
    status: "current",
    since: "2011",
    summary: l(
      "Contemporary-art gallery founded in 2003. Artists include Ugo Rondinone, Joe Bradley and Tschabalala Self.",
      "Galerie für Gegenwartskunst, 2003 gegründet. Zu den Kunstschaffenden gehören Ugo Rondinone, Joe Bradley und Tschabalala Self.",
    ),
    atTower: l("Floors 2–4 of the listed Diagonal. Opened in April 2011 with a Franz West show.", "Geschosse 2–4 des denkmalgeschützten Diagonal. Eröffnet im April 2011 mit einer Ausstellung von Franz West."),
    website: "https://presenhuber.com",
    sources: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Galerie_Eva_Presenhuber" }],
  },
  {
    slug: "galerie-kilchmann",
    name: "Galerie Peter Kilchmann",
    building: "Diagonal",
    category: "culture",
    status: "current",
    since: "2011",
    summary: l(
      "Gallery founded in 1992, with further spaces at Rämistrasse and in Paris. Artists include Francis Alÿs, Monica Bonvicini and Teresa Margolles.",
      "Galerie, 1992 gegründet, mit weiteren Räumen an der Rämistrasse und in Paris. Zu den Kunstschaffenden gehören Francis Alÿs, Monica Bonvicini und Teresa Margolles.",
    ),
    atTower: l("Moved from Löwenbräu to the Diagonal and opened on 14 April 2011.", "Zog vom Löwenbräu ins Diagonal und eröffnete am 14. April 2011."),
    website: "https://www.peterkilchmann.com",
    sources: [{ title: "About the gallery", url: "https://www.peterkilchmann.com/about/" }],
  },
  {
    slug: "moyo-ooki",
    name: "MOYO / Ooki Temporary",
    building: "Diagonal",
    category: "food",
    status: "current",
    summary: l(
      "MOYO is a two-storey event venue run by Franzoli GmbH. Ooki Temporary is a pop-up izakaya from the Japanese restaurant Ooki.",
      "MOYO ist ein zweigeschossiger Eventraum der Franzoli GmbH. Ooki Temporary ist eine Pop-up-Izakaya des japanischen Restaurants Ooki.",
    ),
    atTower: l("Ground and first floor of the Diagonal. MOYO says it will run only until the end of 2027.", "Erd- und erstes Geschoss des Diagonal. Laut MOYO läuft der Betrieb nur bis Ende 2027."),
    website: "https://moyoshimono.ch",
    sources: [
      { title: "MOYOSHIMONO", url: "https://moyoshimono.ch/" },
      { title: "zuri.net: Ooki Temporary", url: "https://zuri.net/de/zurich/home-delivery/ooki-temporary-19232.htm" },
    ],
  },

  // ── MAAG Halle ─────────────────────────────────────────────────────
  {
    slug: "maag-music-arts",
    name: "MAAG Music & Arts AG",
    building: "MAAG Halle",
    category: "culture",
    status: "current",
    since: "2002",
    summary: l(
      "Event company that runs the MAAG Theater, Lichthalle, Härterei club and Bistro k2 in the old gear-factory halls.",
      "Eventfirma, die in den alten Hallen der Zahnradfabrik das MAAG Theater, die Lichthalle, den Club Härterei und das Bistro k2 betreibt.",
    ),
    atTower: l(
      "Swiss Prime Site planned to demolish the halls, but courts upheld heritage appeals. On 25 June 2026 it withdrew: the halls will be kept and renovated, and MAAG's lease runs to May 2029.",
      "Swiss Prime Site wollte die Hallen abreissen, doch die Gerichte gaben den Heimatschutz-Rekursen recht. Am 25. Juni 2026 zog SPS zurück: Die Hallen bleiben und werden saniert, der Mietvertrag von MAAG läuft bis Mai 2029.",
    ),
    notes: [l("A natural history museum with the University of Zurich is under discussion for the site.", "Für das Gelände wird ein Naturhistorisches Museum mit der Universität Zürich diskutiert.")],
    website: "https://www.maag-moments.ch",
    sources: [
      { title: "Swiss Prime Site release, June 2026", url: "https://mailing-ircockpit.eqs.com/crm-mailing/5c566392-ea7c-11e8-902f-2c44fd856d8c/1bda015e-a3fb-4d4a-b131-5a99c284ccdd/15a85638-4073-414f-9686-24cc9e0974bf/20260625_Maag_Medienmitteilung.pdf" },
      { title: "Blick", url: "https://www.blick.ch/schweiz/zuerich/bauprojekte-zuercher-verwaltungsgericht-heisst-maag-hallen-rekurs-gut-id21055113.html" },
    ],
  },
  {
    slug: "k2-bistro",
    name: "k2 Bistro & Bar",
    building: "MAAG Halle",
    category: "food",
    status: "current",
    summary: l(
      "Casual bistro with about 50 seats in the former welding shop of the gear factory, known for thin schnitzel and burgers.",
      "Ungezwungenes Bistro mit rund 50 Plätzen in der ehemaligen Schweisserei der Zahnradfabrik, bekannt für dünne Schnitzel und Burger.",
    ),
    atTower: l("Run by MAAG Music & Arts at Zahnradstrasse 22.", "Von MAAG Music & Arts an der Zahnradstrasse 22 betrieben."),
    website: "https://www.k2bistro.ch",
    sources: [{ title: "zuerich.com", url: "https://www.zuerich.com/de/besuchen/restaurants/k2-bistro-bar" }],
  },
];

export const categoryLabel: Record<ProfileCategory, L> = {
  finance: l("Finance", "Finanzen"),
  law: l("Law", "Recht"),
  consulting: l("Consulting", "Beratung"),
  tech: l("Tech", "Tech"),
  realestate: l("Real estate", "Immobilien"),
  energy: l("Energy & commodities", "Energie & Rohstoffe"),
  media: l("Media", "Medien"),
  food: l("Food & drink", "Gastronomie"),
  retail: l("Shops", "Läden"),
  health: l("Health & care", "Gesundheit & Betreuung"),
  culture: l("Culture", "Kultur"),
};

export const statusLabel: Record<ProfileStatus, L> = {
  current: l("current", "aktuell"),
  former: l("former", "ehemalig"),
  moved: l("moved out", "weggezogen"),
  service: l("service provider", "Dienstleister"),
  unconfirmed: l("unconfirmed", "unbestätigt"),
};

export const statusClass: Record<ProfileStatus, string> = {
  current: "bg-accent/15 text-accent",
  service: "bg-accent-2/20 text-accent-2",
  former: "bg-muted/15 text-muted",
  moved: "bg-muted/15 text-muted",
  unconfirmed: "bg-amber-400/15 text-amber-300",
};

export const isPast = (p: TenantProfile) => p.status === "former" || p.status === "moved";

/** Current tenants with a sourced floor in the tower. */
export function profilesOnFloor(floor: number): TenantProfile[] {
  return tenantProfiles.filter((p) => p.building === "Prime Tower" && !isPast(p) && p.floors?.includes(floor));
}
