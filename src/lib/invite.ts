import { SITE_URL } from "./legal";

/** Message « Inviter un ami » : une phrase et l'adresse du site, prêts pour la feuille de partage. */
export function inviteFriendMessage(siteUrl: string = SITE_URL): string {
  return `Je lis et j’apprends le Coran avec Eqra, une application gratuite en français. Rejoins-moi : ${siteUrl}`;
}
