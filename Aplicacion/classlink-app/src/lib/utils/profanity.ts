// Basic profanity filter for post content moderation.
// Checks Spanish and English offensive terms.

const BANNED_WORDS = [
  // Spanish
  "mierda", "puta", "puto", "perra", "perro", "cabrón", "cabron", "culo", "coño",
  "cono", "marica", "maricón", "maricon", "idiota", "estupido", "estúpido",
  "pendejo", "mamahuevo", "huevon", "huevón", "culero", "jodido", "hdp",
  "ctm", "stfu", "weon", "weón", "conchetumare", "conchetumadre", "csm",
  "hijoputa", "hijo puta", "hija puta", "bastardo", "pito", "verga",
  // English
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "cock",
  "pussy", "faggot", "nigger", "nigga", "whore", "slut", "damn", "ass",
  "retard", "moron", "idiot",
];

// Normalizes text: lowercase, remove accents, collapse spaces
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

export function hasProfanity(text: string): boolean {
  const normalized = normalize(text);
  const normalizedBanned = BANNED_WORDS.map(normalize);
  return normalizedBanned.some((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    return pattern.test(normalized);
  });
}

export function getProfanityError(): string {
  return "Tu publicación contiene lenguaje inapropiado. Por favor revisa el contenido antes de publicar.";
}
