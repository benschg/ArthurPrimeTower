import { l, type L } from "@/i18n";

/** Route of the school-talk slide deck (src/app/vortrag). */
export const presentationPath = "/vortrag";

/** One row of a content slide: a heading (a number, a year or a title) and an optional sentence. */
export type SlideItem = { head: L | string; text?: L; big?: boolean };

export type Slide =
  | {
      kind: "hero";
      id: string;
      eyebrow: L;
      title: L;
      subtitle: L;
      /** A file under /public/photos. The slide shows its 16:9 crop from /public/photos/hero: node scripts/crop-heroes.mjs */
      photo: string;
      /** A QR code (SVG under /public) shown bottom right, with the address it encodes. */
      qr?: { file: string; href: string; label: string; hint: L };
      /** A link shown under the QR code, e.g. to the sources on the website. */
      link?: { href: string; label: string; hint: L };
      notes: L;
    }
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
      /**
       * `photo` is a sky-free cutout under /public/photos/towers, cropped from the roof to
       * `groundMetres` below the tower's foot, so all towers share one metres-to-pixels scale.
       * The files are 4.2 px per metre, twice the size the slide draws them at.
       */
      bars: { metres: number; label: string; note: L; photo: { file: string; author: string; license: string } }[];
      groundMetres: number;
      highlight: number;
      footer: L;
      notes: L;
    }
  | { kind: "gallery"; id: string; eyebrow: L; title: L; photos: { file: string; caption: L }[]; notes: L };

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
    kind: "bars",
    id: "rekord",
    eyebrow: l("Record", "Rekord"),
    title: l("Tallest building in Switzerland, 2011 to 2015", "Höchstes Haus der Schweiz, 2011 bis 2015"),
    bars: [
      { metres: 105, label: "Messeturm Basel", note: l("Record holder until 2010", "Rekordhalter bis 2010"), photo: { file: "messeturm-basel.webp", author: "Taxiarchos228", license: "FAL" } },
      { metres: 126, label: "Prime Tower Zürich", note: l("Record holder 2011 to 2015", "Rekordhalter 2011 bis 2015"), photo: { file: "prime-tower.webp", author: "Micha L. Rieser", license: "Attribution" } },
      { metres: 178, label: "Roche Tower Basel", note: l("Record holder since 2015", "Rekordhalter seit 2015"), photo: { file: "roche-tower.webp", author: "Taxiarchos228", license: "FAL" } },
    ],
    /* Crops from Wikimedia Commons: File:Basel_-_Messeturm1.jpg, File:Prime_Tower_-_August_2012_-_Bild_2.JPG, File:Basel_-_Roche_Tower_-_September_2015_4.jpg */
    groundMetres: 15,
    highlight: 1,
    footer: l("The Prime Tower is still the tallest building in Zürich.", "Der Prime Tower ist bis heute das höchste Gebäude in Zürich."),
    notes: l(
      "From 2011 to 2015 the Prime Tower was the tallest building in all of Switzerland. Before that, the Messeturm in Basel held the record at 105 metres. In 2015 the Roche Tower in Basel was finished, clearly taller at 178 metres. But in Zürich the Prime Tower is still the tallest building today.",
      "Von 2011 bis 2015 war der Prime Tower das höchste Gebäude der ganzen Schweiz. Vorher hielt der Messeturm in Basel mit 105 Metern den Rekord. 2015 wurde in Basel der Roche-Turm fertig, der mit 178 Metern deutlich höher ist. Aber in Zürich ist der Prime Tower bis heute das höchste Haus.",
    ),
  },
  {
    kind: "hero",
    id: "danke",
    eyebrow: l("The end", "Ende"),
    title: l("Thank you for listening", "Danke fürs Zuhören"),
    subtitle: l("Any questions?", "Habt ihr Fragen?"),
    photo: "kaeferberg-evening.jpg",
    /* public/qr-site.svg: npx qrcode -t svg -e H -o public/qr-site.svg "https://primetower.arthurfaehndrich.ch/" */
    qr: { file: "qr-site.svg", href: "/", label: "primetower.arthurfaehndrich.ch", hint: l("Scan to open the website", "Scannen und die Website öffnen") },
    link: { href: "/#sources", label: "primetower.arthurfaehndrich.ch/#sources", hint: l("All sources are listed on the website", "Alle Quellen stehen auf der Website") },
    notes: l(
      "Thank you for listening. All my sources are listed with links on the website, under Sources. If you have questions, I am happy to answer them.",
      "Vielen Dank fürs Zuhören. Alle meine Quellen findet ihr mit Links auf der Website unter «Quellen». Wenn ihr Fragen habt, beantworte ich sie gerne.",
    ),
  },
];
