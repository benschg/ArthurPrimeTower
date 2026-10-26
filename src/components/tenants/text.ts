import { l } from "@/i18n";

/** The tenant directory's own wording. */
export const txt = {
  back: l("Prime Tower", "Prime Tower"),
  eyebrow: l("Tenant directory", "Mieterverzeichnis"),
  title: l("Who works in and around the Prime Tower", "Wer im und um den Prime Tower arbeitet"),
  intro: l(
    "Every company on the Maag site, researched from press reports, the commercial register and company websites (September 2026). Floor numbers are only shown where a source names them.",
    "Alle Firmen auf dem Maag-Areal, recherchiert aus Presseberichten, dem Handelsregister und Firmenwebsites (September 2026). Geschosse werden nur gezeigt, wo eine Quelle sie nennt.",
  ),
  stats: { companies: l("companies", "Firmen"), tower: l("in the tower", "im Turm"), floors: l("floors identified", "Geschosse zugeordnet"), buildings: l("buildings", "Gebäude") },
  search: l("Search companies…", "Firmen suchen…"),
  all: l("All", "Alle"),
  showPast: l("Include former and moved", "Ehemalige und Weggezogene zeigen"),
  none: l("No company matches these filters.", "Keine Firma passt zu diesen Filtern."),
  reset: l("Reset filters", "Filter zurücksetzen"),
  stack: l("Floor stack", "Geschossübersicht"),
  stackHint: l("Floors with a sourced tenant. Click one to filter.", "Geschosse mit belegter Mieterschaft. Klicken zum Filtern."),
  floor: l("Floor", "Geschoss"),
  ground: l("G", "EG"),
  clearFloor: l("All floors", "Alle Geschosse"),
  close: l("Close", "Schliessen"),
  about: l("About", "Über die Firma"),
  here: l("On the site", "Auf dem Areal"),
  notes: l("Worth knowing", "Wissenswert"),
  sources: l("Sources", "Quellen"),
  website: l("Website", "Website"),
  since: l("Since", "Seit"),
  floors: l("Floors", "Geschosse"),
  building: l("Building", "Gebäude"),
  imageFrom: l("Image", "Bild"),
  placeholderLogo: l("No logo available; monogram shown.", "Kein Logo verfügbar; Monogramm gezeigt."),
  prev: l("Previous", "Vorherige"),
  next: l("Next", "Nächste"),
  count: l("shown", "angezeigt"),
};

/** A website's host name, for links and credits. */
export const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
