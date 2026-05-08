// Post content moderation — profanity filter.
// Covers Spanish (including Chilean/Latin American variants) and English.
// Words are matched as whole tokens after accent-stripping and lowercasing.

const BANNED_WORDS = [
  // ── Spanish — general ────────────────────────────────────────────────
  "mierda", "mierdas", "puta", "putas", "puto", "putos", "perra", "perras",
  "cabron", "cabrona", "cabrones", "cabronas",
  "culo", "culos", "coño", "conos", "cona",
  "marica", "maricon", "maricones", "maricona",
  "idiota", "idiotas", "estupido", "estupida", "estupidos",
  "pendejo", "pendeja", "pendejos", "pendejas",
  "imbecil", "imbeciles",
  "mamaguevo", "mamahuevo", "mamavergon",
  "huevon", "huevona", "huevones",
  "culero", "culera", "culeros",
  "jodido", "jodida", "jodidos",
  "bastardo", "bastarda", "bastardos",
  "pito", "pitos", "verga", "vergas",
  "chinga", "chingada", "chingado", "chinguen", "chingo",
  "pinche", "pinches",
  "cagate", "cagada", "cagado", "cagar",
  "mamon", "mamona", "mamones",
  "ojete", "ojetes",
  "putazo", "putazos",
  "zorra", "zorras",
  "golfa", "golfas",
  "furcia", "furcio",
  "sorete", "soretes",
  "pelotudo", "pelotuda", "pelotudos",
  "boludo", "boluda", "boludos",
  "forro", "forra", "forros",
  "gilipollas", "capullo", "capullos",
  "subnormal", "subnormales",
  "retrasado", "retrasada", "retrasados",
  "mogolico", "mogolica",
  "cornudo", "cornuda", "cornudos",
  "lameculos", "comeculo",
  "chucha", "chucho",
  "conchetumare", "conchetumadre", "conchatumadre",
  "hijoputa", "hijadeputa", "hijosdeputa",

  // ── Spanish — Chilean slang ───────────────────────────────────────────
  "ctm", "csm", "hdp", "stfu",
  "weon", "weona", "weones",
  "aweonado", "aweonada",
  "culiao", "culiaos", "culiado", "culiada",
  "conchesumare",
  "maraco",
  "pico", "picha",
  "andate a la chucha", "andate a la mierda",
  "culeao",

  // ── Spanish — insults / hate ─────────────────────────────────────────
  "nazi", "nazis",
  "fascista", "fascistas",
  "racista", "racistas",
  "maricona", "travesti",   // used as slurs in context
  "negra de mierda", "negro de mierda",
  "sudaca", "sudacas",
  "indio de mierda",

  // ── English — general ─────────────────────────────────────────────────
  "fuck", "fucked", "fucker", "fuckers", "fucking", "fucks",
  "shit", "shits", "shitty", "bullshit",
  "bitch", "bitches", "bitchy",
  "asshole", "assholes",
  "bastard", "bastards",
  "cunt", "cunts",
  "dick", "dicks",
  "cock", "cocks",
  "pussy", "pussies",
  "faggot", "faggots", "fag",
  "nigger", "niggers", "nigga", "niggas",
  "whore", "whores",
  "slut", "sluts",
  "retard", "retards", "retarded",
  "moron", "morons",
  "idiot", "idiots",
  "dipshit", "dumbass", "dumbasses",
  "motherfucker", "motherfuckers",
  "jackass", "jackasses",
  "wanker", "wankers",
  "prick", "pricks",
  "twat", "twats",
  "arsehole", "arseholes",
  "goddamn", "goddam",
  "scumbag", "scumbags",
  "shithead", "shitheads",
  "deadass", "crackhead",

  // ── English — hate speech ─────────────────────────────────────────────
  "kike", "spic", "chink", "gook", "wetback",
  "tranny", "trannies",
  "nazi", "fascist",
];

// Normalize: lowercase, strip accents, collapse non-alpha to spaces
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pre-normalize banned list once at module level for performance
const NORMALIZED_BANNED = BANNED_WORDS.map((w) => normalize(w));

export function hasProfanity(text: string): boolean {
  const normalized = normalize(text);
  return NORMALIZED_BANNED.some((word) => {
    // Use word-boundary regex; multi-word phrases use a space-boundary check
    if (word.includes(" ")) return normalized.includes(word);
    const pattern = new RegExp(`(?<![a-z])${word}(?![a-z])`, "i");
    return pattern.test(normalized);
  });
}

export function getProfanityError(): string {
  return "Tu publicación contiene lenguaje inapropiado o palabras no permitidas. Por favor revisa el contenido antes de publicar.";
}
