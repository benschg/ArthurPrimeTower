import { l, type L } from "@/i18n";

/** Route of the school-talk slide deck (src/app/vortrag). */
export const presentationPath = "/vortrag";

/** One row of a content slide: a heading (a number, a year or a title) and an optional sentence. */
export type SlideItem = { head: L | string; text?: L; big?: boolean };

export type Slide =
  | { kind: "hero"; id: string; eyebrow: L; title: L; subtitle: L; photo: string; notes: L }
  | {
      kind: "content";
      id: string;
      eyebrow: L;
      title: L;
      /** Files under /public/photos, drawn left of the text. */
      photos: string[];
      layout: "list" | "cards" | "pills";
      intro?: L;
      items: SlideItem[];
      footer?: L;
      notes: L;
    }
  | {
      kind: "bars";
      id: string;
      eyebrow: L;
      title: L;
      bars: { metres: number; label: string; note: L }[];
      highlight: number;
      footer: L;
      notes: L;
    }
  | { kind: "gallery"; id: string; eyebrow: L; title: L; photos: { file: string; caption: L }[]; notes: L }
  | { kind: "sources"; id: string; eyebrow: L; title: L; groups: { head: L; items: L[] }[]; notes: L };

export const slides: Slide[] = [
  {
    kind: "hero",
    id: "cover",
    eyebrow: l("Presentation", "Vortrag"),
    title: l("Prime Tower", "Prime Tower"),
    subtitle: l("The tallest building in Zürich", "Das höchste Gebäude von Zürich"),
    photo: "hero-plaza-dusk.jpg",
    notes: l(
      "Welcome. Today I am presenting the Prime Tower, the tallest building in Zürich. It stands in Zürich-West and is 126 metres tall. I will show you how it came about, how it was built and who works in it today.",
      "Begrüssung. Heute stelle ich euch den Prime Tower vor: das höchste Gebäude von Zürich. Er steht in Zürich-West und ist 126 Meter hoch. Ich zeige euch, wie er entstanden ist, wie er gebaut wurde und wer heute darin arbeitet.",
    ),
  },
  {
    kind: "content",
    id: "steckbrief",
    eyebrow: l("Profile", "Steckbrief"),
    title: l("The key numbers", "Die wichtigsten Zahlen"),
    photos: ["low-angle-sunny.jpg"],
    layout: "cards",
    items: [
      { head: "126 m", big: true, text: l("tall (132.6 m to the tip)", "hoch (132,6 m bis zur Spitze)") },
      { head: "36", big: true, text: l("floors plus 2 basement levels", "Stockwerke plus 2 Untergeschosse") },
      { head: "2011", big: true, text: l("opened on 6 December", "eröffnet am 6. Dezember") },
      { head: "2000", big: true, text: l("people work here", "Menschen arbeiten hier") },
    ],
    footer: l("Architects: Annette Gigon and Mike Guyer, Zürich · Owner: Swiss Prime Site", "Architekten: Annette Gigon und Mike Guyer, Zürich · Besitzerin: Swiss Prime Site"),
    notes: l(
      "The Prime Tower is 126 metres tall, 132.6 metres to the tip of the antenna. It has 36 floors above ground and two basement levels with an underground garage. It opened on 6 December 2011. Around 2000 people work in the tower. It was designed by the Zürich architects Annette Gigon and Mike Guyer. The company Swiss Prime Site built it and still owns it.",
      "Der Prime Tower ist 126 Meter hoch, bis zur Spitze der Antenne sogar 132,6 Meter. Er hat 36 Stockwerke über dem Boden und zwei Untergeschosse mit einer Tiefgarage. Eröffnet wurde er am 6. Dezember 2011. Rund 2000 Menschen arbeiten im Turm. Entworfen haben ihn die Zürcher Architekten Annette Gigon und Mike Guyer. Die Firma Swiss Prime Site hat ihn gebaut und besitzt ihn bis heute.",
    ),
  },
  {
    kind: "content",
    id: "standort",
    eyebrow: l("Location", "Standort"),
    title: l("Where does the tower stand?", "Wo steht der Turm?"),
    photos: ["aerial-2023.jpg"],
    layout: "list",
    items: [
      { head: l("Zürich-West, district 5", "Zürich-West, Kreis 5"), text: l("The old industrial quarter is a modern neighbourhood today.", "Das alte Industriequartier ist heute ein modernes Stadtviertel.") },
      { head: "Hardstrasse 201", text: l("Right next to the Hardbrücke bridge and the railway yards.", "Direkt neben der Hardbrücke und dem Gleisfeld.") },
      { head: l("Hardbrücke station", "Bahnhof Hardbrücke"), text: l("S-Bahn, tram and bus stop right at the foot of the tower.", "S-Bahn, Tram und Bus halten direkt am Fuss des Turms.") },
      { head: l("Maag site", "Maag-Areal"), text: l("A gear factory used to stand here.", "Früher stand hier eine Zahnradfabrik.") },
    ],
    notes: l(
      "The Prime Tower stands in Zürich-West, in district 5. This used to be an industrial quarter full of factories. Today it is a modern neighbourhood with offices, restaurants and clubs. The address is Hardstrasse 201. Hardbrücke station is right next door, so most people come to work by S-Bahn or tram. The site is called the Maag site because the Maag gear factory used to stand here.",
      "Der Prime Tower steht in Zürich-West, im Kreis 5. Das war früher ein Industriequartier mit Fabriken. Heute ist es ein modernes Viertel mit Büros, Restaurants und Clubs. Die Adresse ist Hardstrasse 201. Der Bahnhof Hardbrücke liegt direkt daneben, deshalb kommen die meisten Leute mit der S-Bahn oder dem Tram zur Arbeit. Das Gelände heisst Maag-Areal, weil hier früher die Zahnradfabrik Maag stand.",
    ),
  },
  {
    kind: "content",
    id: "geschichte",
    eyebrow: l("History", "Geschichte"),
    title: l("From factory to high-rise", "Von der Fabrik zum Hochhaus"),
    photos: ["aerial-2011.jpg"],
    layout: "cards",
    items: [
      { head: "1913", big: true, text: l("Max Maag builds his gear factory here. By 1980, 2500 people work on the site.", "Max Maag baut hier seine Zahnradfabrik. Bis 1980 arbeiten 2500 Menschen auf dem Areal.") },
      { head: "2004", big: true, text: l("Swiss Prime Site buys the site. The architects Gigon/Guyer win the competition.", "Swiss Prime Site kauft das Areal. Die Architekten Gigon/Guyer gewinnen den Wettbewerb.") },
      { head: "2008", big: true, text: l("The old factory halls are demolished. The foundation stone is laid on 19 November.", "Die alten Fabrikhallen werden abgerissen. Am 19. November wird der Grundstein gelegt.") },
      { head: "2011", big: true, text: l("The tower opens on 6 December. Every office is already let.", "Am 6. Dezember wird der Turm eröffnet. Alle Büros sind schon vermietet.") },
    ],
    notes: l(
      "The story begins in 1913, when Max Maag built a gear factory on Hardstrasse. It grew very large; by 1980, 2500 people worked there. In 1997 the production was sold. In 2004 the real-estate company Swiss Prime Site bought the site and held an architecture competition, won by Annette Gigon and Mike Guyer. In 2006 a 126-metre scaffold profile was even erected so people could see how tall the tower would be. In 2008 the factory halls were demolished and the foundation stone laid. In 2011 the tower was finished.",
      "Die Geschichte beginnt 1913. Damals baute Max Maag an der Hardstrasse eine Fabrik für Zahnräder. Sie wurde sehr gross, bis 1980 arbeiteten dort 2500 Menschen. 1997 wurde die Produktion verkauft. 2004 kaufte die Immobilienfirma Swiss Prime Site das Gelände und machte einen Architekturwettbewerb. Gewonnen haben Annette Gigon und Mike Guyer. 2006 stellte man sogar ein 126 Meter hohes Baugerüst auf, damit die Leute sehen konnten, wie hoch der Turm wird. 2008 wurden die Fabrikhallen abgerissen und der Grundstein gelegt. 2011 war der Turm fertig.",
    ),
  },
  {
    kind: "content",
    id: "bau",
    eyebrow: l("Construction 2008 to 2011", "Bauzeit 2008 bis 2011"),
    title: l("How the tower was built", "So wurde der Turm gebaut"),
    photos: ["cantilever-evening.jpg"],
    layout: "cards",
    items: [
      { head: l("3 years", "3 Jahre"), big: true, text: l("from foundation stone to opening", "Bauzeit vom Grundstein bis zur Eröffnung") },
      { head: l("5 days", "5 Tage"), big: true, text: l("for every new floor", "brauchte man für jedes neue Stockwerk") },
      { head: "36 000 m³", big: true, text: l("of concrete, about 14 swimming pools", "Beton, das sind etwa 14 Schwimmbecken") },
      { head: "6000 t", big: true, text: l("of steel reinforce the concrete", "Stahl stecken im Beton als Verstärkung") },
    ],
    footer: l("Cost: around 355 to 380 million francs for the tower and its annexes", "Kosten: rund 355 bis 380 Millionen Franken für Turm und Nebengebäude"),
    notes: l(
      "Construction ran from 2008 to 2011, about three years. The workers finished a new floor every five days. In April 2010 the tower was already taller than the Messeturm in Basel, making it the tallest building in Switzerland. 36 000 cubic metres of concrete went into the tower. An Olympic pool holds 2500 cubic metres, so that is about 14 pools full of concrete, plus 6000 tonnes of steel. The whole project with the annex buildings cost around 355 to 380 million francs.",
      "Gebaut wurde von 2008 bis 2011, also etwa drei Jahre. Die Bauarbeiter schafften alle fünf Tage ein neues Stockwerk. Im April 2010 war der Turm schon höher als der Messeturm in Basel und damit das höchste Gebäude der Schweiz. Für den Turm brauchte man 36 000 Kubikmeter Beton. Ein olympisches Schwimmbecken fasst 2500 Kubikmeter, also sind das etwa 14 Schwimmbecken voll Beton. Dazu kommen 6000 Tonnen Stahl. Der ganze Bau mit den Nebengebäuden kostete rund 355 bis 380 Millionen Franken.",
    ),
  },
  {
    kind: "content",
    id: "form",
    eyebrow: l("Architecture", "Architektur"),
    title: l("Wider at the top than at the bottom", "Oben breiter als unten"),
    photos: ["from-hardbruecke.jpg", "viaduct-arch.jpg"],
    layout: "list",
    items: [
      { head: l("Two rectangles, one octagon", "Zwei Rechtecke, ein Achteck"), text: l("The floor plan is made of two rectangles joined at an angle. Together they form an octagon.", "Der Grundriss besteht aus zwei schräg verbundenen Rechtecken. So entsteht ein Achteck mit acht Ecken.") },
      { head: l("The tower does not taper", "Der Turm wird nicht schmaler"), text: l("Most high-rises get thinner toward the top. The Prime Tower cantilevers out and gets wider.", "Die meisten Hochhäuser werden nach oben dünner. Der Prime Tower kragt oben aus und wird breiter.") },
      { head: l("Different from every side", "Von jeder Seite anders"), text: l("Slanting columns carry the overhanging parts. The tower looks different depending on where you stand.", "Schräge Stützen tragen die vorspringenden Teile. Je nachdem, wo man steht, sieht der Turm anders aus.") },
    ],
    notes: l(
      "The shape is special. Seen from above, the tower is an octagon made of two rectangles pushed together at an angle. The exciting part: most high-rises get narrower toward the top. The Prime Tower does the opposite. Parts stick out at the top, so it is wider up there than at the base. Slanting columns inside carry those parts. Because the tower is so irregular, it looks different from every side.",
      "Die Form ist besonders. Wenn man den Turm von oben anschaut, sieht man ein Achteck. Es entsteht aus zwei Rechtecken, die schräg zusammengeschoben sind. Das Spannende: Die meisten Hochhäuser werden nach oben schmaler. Der Prime Tower macht das Gegenteil. Oben springen Teile vor, deshalb ist er oben breiter als unten. Schräge Stützen im Innern tragen diese Teile. Weil der Turm so unregelmässig ist, sieht er von jeder Seite anders aus.",
    ),
  },
  {
    kind: "content",
    id: "fassade",
    eyebrow: l("The facade", "Die Fassade"),
    title: l("A skin of green glass", "Eine Haut aus grünem Glas"),
    photos: ["facade-lookup.jpg", "reflection.jpg"],
    layout: "list",
    items: [
      { head: "4400", big: true, text: l("glass elements without a visible frame", "Glaselemente ohne sichtbaren Rahmen") },
      { head: "20 500 m²", big: true, text: l("of glass, triple-glazed and tinted green", "Glasfläche, dreifach verglast und grün getönt") },
      { head: "6 cm", big: true, text: l("wide slits at the windows that open. They make the pixel pattern.", "breite Schlitze an den Fenstern, die sich öffnen lassen. Sie machen das Pixel-Muster.") },
    ],
    notes: l(
      "The facade is made of around 4400 glass elements. No frames are visible from outside. The glass is triple-glazed and tinted slightly green. Depending on the light and the angle, the tower looks emerald green or almost white. Every second or third window opens, leaving a six-centimetre slit. Those slits create the pattern that looks like pixels.",
      "Die Fassade besteht aus rund 4400 Glaselementen. Von aussen sieht man keine Rahmen. Das Glas ist dreifach und leicht grün getönt. Je nach Licht und Blickwinkel wirkt der Turm smaragdgrün oder fast weiss. Jedes zweite oder dritte Fenster lässt sich öffnen. Dabei bleibt ein sechs Zentimeter breiter Schlitz. Diese Schlitze erzeugen das Muster, das aussieht wie Pixel.",
    ),
  },
  {
    kind: "content",
    id: "innen",
    eyebrow: l("Inside", "Im Turm"),
    title: l("To the top in 30 seconds", "In 30 Sekunden nach oben"),
    photos: ["night-entrance.jpg"],
    layout: "list",
    items: [
      { head: l("9 lifts", "9 Aufzüge"), big: true, text: l("travel at 6.5 metres per second", "fahren mit 6,5 Metern pro Sekunde") },
      { head: l("30 seconds", "30 Sekunden"), big: true, text: l("is all the ride to the top floor takes", "dauert die Fahrt bis ins oberste Stockwerk") },
      { head: "1275 m²", big: true, text: l("of office space per floor, for up to 4 companies", "Bürofläche pro Stockwerk, für bis zu 4 Firmen") },
      { head: l("10 metres", "10 Meter"), big: true, text: l("high is the lobby, lined with green serpentine stone", "hoch ist die Eingangshalle aus grünem Serpentin-Stein") },
    ],
    notes: l(
      "There are nine lifts in the tower. They travel at 6.5 metres per second, so the ride to the very top takes only about 30 seconds. Each floor has around 1275 square metres of office space, roughly three basketball courts. Up to four companies share a floor. The lobby is about ten metres high and lined with green serpentine stone from the Aosta valley in Italy.",
      "Im Turm gibt es neun Aufzüge. Sie fahren mit 6,5 Metern pro Sekunde. Bis ganz nach oben dauert es nur etwa 30 Sekunden. Jedes Stockwerk hat rund 1275 Quadratmeter Bürofläche, das ist etwa so gross wie drei Basketballfelder. Bis zu vier Firmen teilen sich ein Stockwerk. Die Eingangshalle ist rund zehn Meter hoch und mit grünem Serpentin-Stein aus dem Aostatal in Italien verkleidet.",
    ),
  },
  {
    kind: "content",
    id: "oben",
    eyebrow: l("At the top", "Ganz oben"),
    title: l("Dining above the clouds", "Essen über den Wolken"),
    photos: ["view-from-top.jpg", "top-alps-bluehour.jpg"],
    layout: "list",
    items: [
      { head: l("Restaurant Clouds on the 35th floor", "Restaurant Clouds im 35. Stock"), text: l("Restaurant, bar and lounge, opened on 12 December 2011.", "Restaurant, Bar und Lounge, eröffnet am 12. Dezember 2011.") },
      { head: l("Conference centre on the 34th floor", "Konferenzzentrum im 34. Stock"), text: l("Companies hold their meetings up here.", "Hier halten Firmen ihre Sitzungen ab.") },
      { head: l("A view to the Alps", "Blick bis zu den Alpen"), text: l("In clear weather you can see across the whole of Zürich and the lake.", "Bei klarem Wetter sieht man über ganz Zürich und den See.") },
    ],
    notes: l(
      "At the very top, on the 35th floor, is the restaurant Clouds. The name fits. There is a restaurant, a bar and a lounge. It opened on 12 December 2011, shortly after the tower. On the 34th floor is a conference centre where companies hold meetings. Anyone can ride up as a guest and enjoy the view. In clear weather you see across all of Zürich, the lake and as far as the Alps.",
      "Ganz oben, im 35. Stock, ist das Restaurant Clouds. Der Name passt: Clouds heisst Wolken. Es gibt ein Restaurant, eine Bar und eine Lounge. Es wurde am 12. Dezember 2011 eröffnet, kurz nach dem Turm. Im 34. Stock ist ein Konferenzzentrum, wo Firmen Sitzungen abhalten. Man kann als Gast hochfahren und die Aussicht geniessen. Bei klarem Wetter sieht man über ganz Zürich, den See und bis zu den Alpen.",
    ),
  },
  {
    kind: "content",
    id: "mieter",
    eyebrow: l("The tenants", "Die Mieter"),
    title: l("Who works in the tower?", "Wer arbeitet im Turm?"),
    photos: ["night-elevated.jpg"],
    layout: "pills",
    intro: l("The tower is an office building. Lawyers, banks, consultants and tech firms work here. A selection:", "Der Turm ist ein Bürohaus. Hier arbeiten Anwälte, Banken, Berater und Tech-Firmen. Eine Auswahl:"),
    items: [
      { head: l("Homburger (lawyers, 8 floors)", "Homburger (Anwälte, 8 Stockwerke)") },
      { head: "Deutsche Bank" },
      { head: "Citibank" },
      { head: "Zalando" },
      { head: "Oracle" },
      { head: "Crypto Finance" },
      { head: "Roland Berger" },
      { head: "Zürcher Kantonalbank" },
    ],
    footer: l("On the ground floor there is a bank branch, a bar and a small shop.", "Im Erdgeschoss gibt es eine Bankfiliale, eine Bar und einen kleinen Laden."),
    notes: l(
      "Nobody lives in the Prime Tower; it is purely an office building. The biggest tenant is the law firm Homburger with eight floors right under the restaurant. Then there are banks such as Deutsche Bank and Citibank, the online shop Zalando, the software company Oracle and the consultancy Roland Berger. On the ground floor there is a Zürcher Kantonalbank branch, the bar Rivington and Sons and a Migrolino shop. Every office was already let when the tower opened in 2011.",
      "Im Prime Tower wohnt niemand, es ist ein reines Bürohaus. Der grösste Mieter ist die Anwaltskanzlei Homburger mit acht Stockwerken ganz oben, direkt unter dem Restaurant. Dazu kommen Banken wie die Deutsche Bank und die Citibank, der Online-Shop Zalando, die Software-Firma Oracle und die Beraterfirma Roland Berger. Im Erdgeschoss gibt es eine Filiale der Zürcher Kantonalbank, die Bar Rivington and Sons und einen Migrolino-Laden. Schon bei der Eröffnung 2011 waren alle Büros vermietet.",
    ),
  },
  {
    kind: "content",
    id: "areal",
    eyebrow: l("The Maag site", "Das Maag-Areal"),
    title: l("More than just a tower", "Mehr als nur ein Turm"),
    photos: ["maagplatz-cubus.jpg"],
    layout: "cards",
    items: [
      { head: l("Cubus · 7 floors", "Cubus · 7 Stockwerke"), text: l("New building in white concrete with small offices, a crèche, a gym and a Coop Pronto.", "Neubau aus weissem Beton mit kleinen Büros, einer Kita, einem Fitnesscenter und einem Coop Pronto.") },
      { head: l("Diagonal · 5 floors", "Diagonal · 5 Stockwerke"), text: l("Listed old factory building. Today it houses art galleries and a restaurant.", "Altes Fabrikgebäude unter Denkmalschutz. Heute sind hier Kunstgalerien und ein Restaurant.") },
      { head: l("Platform · 7 floors", "Platform · 7 Stockwerke"), text: l("Office building of the firm EY with around 1000 workplaces and a Coop supermarket.", "Bürohaus der Firma EY mit rund 1000 Arbeitsplätzen und einem Coop-Supermarkt.") },
    ],
    notes: l(
      "The Prime Tower does not stand alone. Three smaller buildings around it belong to the ensemble. The Cubus is a white concrete building with small offices, a crèche, a gym and a shop. The Diagonal is an old factory building that could not be demolished because it is listed. It was renovated and now houses art galleries. The Platform is the office building of the firm EY with around 1000 workplaces and a Coop. In total around 3500 people work on the whole site.",
      "Der Prime Tower steht nicht allein. Rundherum gehören drei kleinere Gebäude dazu. Der Cubus ist ein weisser Betonbau mit kleinen Büros, einer Kita, einem Fitnesscenter und einem Laden. Das Diagonal ist ein altes Fabrikgebäude, das man nicht abreissen durfte, weil es unter Denkmalschutz steht. Es wurde renoviert und beherbergt heute Kunstgalerien. Die Platform ist das Bürohaus der Firma EY mit rund 1000 Arbeitsplätzen und einem Coop. Zusammen arbeiten auf dem ganzen Areal rund 3500 Menschen.",
    ),
  },
  {
    kind: "content",
    id: "umwelt",
    eyebrow: l("Environment and energy", "Umwelt und Energie"),
    title: l("A green tower, inside too", "Ein grüner Turm, auch innen"),
    photos: ["snowfall.jpg"],
    layout: "cards",
    items: [
      { head: "LEED Gold", text: l("An international certificate for environmentally friendly buildings.", "Ein internationales Zertifikat für umweltfreundliche Gebäude.") },
      { head: "Minergie", text: l("The Swiss label for buildings that use little energy.", "Das Schweizer Label für Häuser, die wenig Energie brauchen.") },
      { head: l("Heat from the ground", "Wärme aus dem Boden"), text: l("Heat pumps draw energy from the groundwater. An ice store helps with cooling.", "Wärmepumpen holen Energie aus dem Grundwasser. Ein Eisspeicher hilft beim Kühlen.") },
      { head: l("Windows that open", "Fenster zum Öffnen"), text: l("Fresh air comes through the windows, not only from the air conditioning.", "Frische Luft kommt durch die Fenster, nicht nur aus der Klimaanlage.") },
    ],
    notes: l(
      "The tower is not only green on the outside. It holds two important environmental certificates: LEED Gold, an international label, and Minergie, the Swiss label for energy-saving buildings. It is heated with heat pumps that draw energy from the groundwater. An ice store helps with cooling in summer. And unlike many high-rises, you can open the windows and let fresh air in.",
      "Der Turm ist nicht nur aussen grün. Er hat zwei wichtige Umwelt-Zertifikate: LEED Gold, das ist ein internationales Label, und Minergie, das Schweizer Label für energiesparende Häuser. Geheizt wird mit Wärmepumpen, die Energie aus dem Grundwasser holen. Ein Eisspeicher hilft im Sommer beim Kühlen. Und anders als bei vielen Hochhäusern kann man die Fenster öffnen und frische Luft hereinlassen.",
    ),
  },
  {
    kind: "bars",
    id: "rekord",
    eyebrow: l("Record", "Rekord"),
    title: l("Tallest building in Switzerland, 2011 to 2015", "Höchstes Haus der Schweiz, 2011 bis 2015"),
    bars: [
      { metres: 105, label: "Messeturm Basel", note: l("Record holder until 2010", "Rekordhalter bis 2010") },
      { metres: 126, label: "Prime Tower Zürich", note: l("Record holder 2011 to 2015", "Rekordhalter 2011 bis 2015") },
      { metres: 178, label: "Roche Tower Basel", note: l("Record holder since 2015", "Rekordhalter seit 2015") },
    ],
    highlight: 1,
    footer: l("The Prime Tower is still the tallest building in Zürich.", "Der Prime Tower ist bis heute das höchste Gebäude in Zürich."),
    notes: l(
      "From 2011 to 2015 the Prime Tower was the tallest building in all of Switzerland. Before that, the Messeturm in Basel held the record at 105 metres. In 2015 the Roche Tower in Basel was finished, clearly taller at 178 metres. But in Zürich the Prime Tower is still the tallest building today.",
      "Von 2011 bis 2015 war der Prime Tower das höchste Gebäude der ganzen Schweiz. Vorher hielt der Messeturm in Basel mit 105 Metern den Rekord. 2015 wurde in Basel der Roche-Turm fertig, der mit 178 Metern deutlich höher ist. Aber in Zürich ist der Prime Tower bis heute das höchste Haus.",
    ),
  },
  {
    kind: "gallery",
    id: "galerie",
    eyebrow: l("Gallery", "Galerie"),
    title: l("The tower from every side", "Der Turm von allen Seiten"),
    photos: [
      { file: "cubus-annex.jpg", caption: l("With the Cubus in front", "Mit dem Cubus davor") },
      { file: "kaeferberg-evening.jpg", caption: l("Evening light from Käferberg", "Abendlicht vom Käferberg") },
      { file: "reflection.jpg", caption: l("Reflected in the neighbouring building", "Gespiegelt im Nachbarhaus") },
      { file: "hero-plaza-dusk.jpg", caption: l("Blue hour at the entrance", "Blaue Stunde am Eingang") },
    ],
    notes: l(
      "A few more pictures to finish. Because the tower is so irregular and the facade reflects the light, it looks different at every time of day and from every side: sometimes green, sometimes almost white, golden in the evening.",
      "Zum Schluss noch ein paar Bilder. Weil der Turm so unregelmässig geformt ist und die Fassade das Licht spiegelt, sieht er zu jeder Tageszeit und von jeder Seite anders aus: mal grün, mal fast weiss, am Abend golden.",
    ),
  },
  {
    kind: "sources",
    id: "quellen",
    eyebrow: l("Sources", "Quellen"),
    title: l("Where the facts come from", "Woher die Fakten stammen"),
    groups: [
      {
        head: l("Text and numbers", "Texte und Zahlen"),
        items: [
          l("primetower.ch, the official website", "primetower.ch, die offizielle Webseite"),
          l("gigon-guyer.ch, the architects", "gigon-guyer.ch, die Architekten"),
          l("Swiss Prime Site, press releases 2010 and 2011", "Swiss Prime Site, Medienmitteilungen 2010 und 2011"),
          l("Wikipedia, article «Prime Tower» (German and English)", "Wikipedia, Artikel «Prime Tower» (deutsch und englisch)"),
          l("CTBUH Skyscraper Center", "CTBUH Skyscraper Center"),
          l("Baunetz Wissen and Architectural Record", "Baunetz Wissen und Architectural Record"),
          l("Historical Dictionary of Switzerland, article «Maag»", "Historisches Lexikon der Schweiz, Artikel «Maag»"),
        ],
      },
      {
        head: l("Photos", "Fotos"),
        items: [
          l("All photos come from Wikimedia Commons and are free to use (licences CC BY, CC BY-SA and CC0).", "Alle Fotos stammen von Wikimedia Commons und sind frei nutzbar (Lizenzen CC BY, CC BY-SA und CC0)."),
          l(
            "Photographers: Gostsens, Hauserphoton, Roland zh, Fred Romero, Daniel Reust, Hansueli Krapf, kuhnmi, FreeclimbZurich, Marius Haffner, Wendelin Jacober, Tschubby, Thomas Woodtli, Roy Egloff and Paebi.",
            "Fotografiert haben: Gostsens, Hauserphoton, Roland zh, Fred Romero, Daniel Reust, Hansueli Krapf, kuhnmi, FreeclimbZurich, Marius Haffner, Wendelin Jacober, Tschubby, Thomas Woodtli, Roy Egloff und Paebi.",
          ),
        ],
      },
    ],
    notes: l(
      "These are my sources. The numbers come mainly from the tower's official website, from the architects and from Wikipedia. All photos are from Wikimedia Commons and may be used freely as long as the photographers are credited.",
      "Hier sind meine Quellen. Die Zahlen stammen vor allem von der offiziellen Webseite des Turms, von den Architekten und von Wikipedia. Alle Fotos sind von Wikimedia Commons und dürfen frei verwendet werden, wenn man die Fotografen nennt.",
    ),
  },
  {
    kind: "hero",
    id: "danke",
    eyebrow: l("The end", "Ende"),
    title: l("Thank you for listening", "Danke fürs Zuhören"),
    subtitle: l("Any questions?", "Habt ihr Fragen?"),
    photo: "kaeferberg-evening.jpg",
    notes: l("Thank you for listening. If you have questions, I am happy to answer them.", "Vielen Dank fürs Zuhören. Wenn ihr Fragen habt, beantworte ich sie gerne."),
  },
];
