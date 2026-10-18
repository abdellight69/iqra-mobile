/** L'API renvoie le nom de langue dans la langue demandée (« french », « français »…). */
export function isFrench(languageName: string | null | undefined): boolean {
  const name = (languageName ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return name === "french" || name === "francais" || name === "fr";
}

/** « english » → « English » pour l'affichage des groupes de langues. */
export function languageLabel(languageName: string): string {
  const name = languageName.trim();
  return name ? name.charAt(0).toLocaleUpperCase("fr") + name.slice(1) : "Autre";
}
