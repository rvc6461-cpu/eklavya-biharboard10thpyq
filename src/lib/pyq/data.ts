// Offline seed dataset for chapter-wise PYQ practice.
// Lightweight: bundled with the app so it works fully offline.

export type Question = {
  id: string;
  year: number;
  text: string;
  options: [string, string, string, string];
  /** 0-3 index of the correct option */
  answer: number;
  explanation: string;
};

export type Chapter = {
  id: string;
  name: string;
  questionCount: number;
  questions: Question[];
};

export type Subject = {
  id: string;
  name: string;
  short: string;
  glyph: string;
  hue: string; // tailwind gradient classes
  chapters: Chapter[];
};

const q = (
  id: string,
  year: number,
  text: string,
  options: [string, string, string, string],
  answer: number,
  explanation: string,
): Question => ({ id, year, text, options, answer, explanation });

export const SUBJECTS: Subject[] = [
  {
    id: "math",
    name: "Mathematics",
    short: "Math",
    glyph: "∑",
    hue: "from-indigo-500 to-violet-600",
    chapters: [
      {
        id: "real-numbers",
        name: "Real Numbers",
        questionCount: 4,
        questions: [
          q("m1-1", 2024, "The HCF of 96 and 404 is:", ["2", "4", "8", "12"], 1,
            "404 = 96×4 + 20, 96 = 20×4 + 16, 20 = 16×1 + 4, 16 = 4×4. So HCF = 4."),
          q("m1-2", 2023, "Which of the following is an irrational number?",
            ["√4", "√9", "√7", "√16"], 2,
            "√7 is irrational because 7 is not a perfect square."),
          q("m1-3", 2022, "The decimal expansion of 13/3125 will terminate after how many places?",
            ["3", "4", "5", "6"], 2,
            "3125 = 5⁵, so decimal terminates after 5 places."),
          q("m1-4", 2024, "If two positive integers a and b are written as a = x³y² and b = xy³, then HCF(a,b) is:",
            ["xy²", "xy³", "x³y³", "x²y²"], 0,
            "HCF takes the lowest power of each common prime: x¹y²."),
        ],
      },
      {
        id: "polynomials",
        name: "Polynomials",
        questionCount: 3,
        questions: [
          q("m2-1", 2024, "If α and β are zeroes of x² − 5x + 6, then α + β is:",
            ["−5", "5", "6", "−6"], 1, "Sum of zeroes = −b/a = 5."),
          q("m2-2", 2023, "The degree of polynomial 3x⁴ − 2x³ + x − 7 is:",
            ["2", "3", "4", "7"], 2, "Highest power of x is 4."),
          q("m2-3", 2022, "A quadratic polynomial whose zeroes are 2 and −3 is:",
            ["x² + x − 6", "x² − x − 6", "x² − x + 6", "x² + x + 6"], 0,
            "Sum=−1, Product=−6 → x² − (sum)x + product = x² + x − 6."),
        ],
      },
      {
        id: "trigonometry",
        name: "Introduction to Trigonometry",
        questionCount: 3,
        questions: [
          q("m3-1", 2024, "The value of sin 30° + cos 60° is:",
            ["1/2", "1", "√3/2", "0"], 1, "sin 30° = 1/2, cos 60° = 1/2, sum = 1."),
          q("m3-2", 2023, "If tan θ = 4/3, then sin θ is:",
            ["3/5", "4/5", "3/4", "5/4"], 1,
            "Opp=4, Adj=3, Hyp=5. sin θ = Opp/Hyp = 4/5."),
          q("m3-3", 2022, "sec²θ − tan²θ = ?",
            ["0", "1", "−1", "2"], 1, "Identity: sec²θ − tan²θ = 1."),
        ],
      },
    ],
  },
  {
    id: "science",
    name: "Science",
    short: "Sci",
    glyph: "⚛",
    hue: "from-emerald-500 to-teal-600",
    chapters: [
      {
        id: "chemical-reactions",
        name: "Chemical Reactions and Equations",
        questionCount: 3,
        questions: [
          q("s1-1", 2024, "Rusting of iron is an example of:",
            ["Combination", "Displacement", "Oxidation", "Reduction"], 2,
            "Iron loses electrons to oxygen — it is oxidised."),
          q("s1-2", 2023, "The chemical formula of quick lime is:",
            ["CaO", "Ca(OH)₂", "CaCO₃", "CaCl₂"], 0,
            "Quick lime is calcium oxide, CaO."),
          q("s1-3", 2022, "Which gas is evolved when zinc reacts with dilute HCl?",
            ["O₂", "Cl₂", "H₂", "CO₂"], 2,
            "Zn + 2HCl → ZnCl₂ + H₂↑."),
        ],
      },
      {
        id: "light",
        name: "Light – Reflection and Refraction",
        questionCount: 3,
        questions: [
          q("s2-1", 2024, "The image formed by a plane mirror is always:",
            ["Real and inverted", "Virtual and erect", "Real and erect", "Virtual and inverted"], 1,
            "Plane mirrors form virtual, erect, laterally inverted images of the same size."),
          q("s2-2", 2023, "The SI unit of power of a lens is:",
            ["metre", "dioptre", "watt", "candela"], 1,
            "Power P = 1/f (in metres). Unit is dioptre (D)."),
          q("s2-3", 2022, "Refractive index of water is approximately:",
            ["1.00", "1.33", "1.50", "2.42"], 1, "n_water ≈ 1.33."),
        ],
      },
    ],
  },
  {
    id: "sst",
    name: "Social Science",
    short: "SST",
    glyph: "❖",
    hue: "from-amber-500 to-orange-600",
    chapters: [
      {
        id: "nationalism-india",
        name: "Nationalism in India",
        questionCount: 3,
        questions: [
          q("h1-1", 2024, "The Non-Cooperation Movement was launched in:",
            ["1919", "1920", "1922", "1930"], 1,
            "Launched by Gandhi ji in 1920."),
          q("h1-2", 2023, "The Dandi March was associated with:",
            ["Khilafat Movement", "Civil Disobedience", "Quit India", "Swadeshi"], 1,
            "Dandi March (1930) started the Civil Disobedience Movement."),
          q("h1-3", 2022, "Who wrote 'Vande Mataram'?",
            ["Tagore", "Bankim Chandra", "Sarojini Naidu", "Tilak"], 1,
            "Bankim Chandra Chattopadhyay wrote it in his novel Anandamath."),
        ],
      },
    ],
  },
  {
    id: "english",
    name: "English",
    short: "Eng",
    glyph: "✎",
    hue: "from-sky-500 to-blue-600",
    chapters: [
      {
        id: "grammar",
        name: "Grammar — Tenses",
        questionCount: 2,
        questions: [
          q("e1-1", 2024, "She _____ to school every day.",
            ["go", "goes", "going", "gone"], 1,
            "Third person singular in simple present takes -s."),
          q("e1-2", 2023, "The passive form of 'He writes a letter' is:",
            ["A letter is written by him", "A letter was written by him",
              "A letter has been written by him", "A letter being written by him"], 0,
            "Simple present passive: is/are + V3."),
        ],
      },
    ],
  },
  {
    id: "hindi",
    name: "Hindi",
    short: "Hin",
    glyph: "ह",
    hue: "from-rose-500 to-pink-600",
    chapters: [
      {
        id: "vyakaran",
        name: "व्याकरण — संधि",
        questionCount: 2,
        questions: [
          q("hi1-1", 2024, "'विद्यालय' में कौन सी संधि है?",
            ["स्वर संधि", "व्यंजन संधि", "विसर्ग संधि", "इनमें से कोई नहीं"], 0,
            "विद्या + आलय → दीर्घ स्वर संधि (आ + आ = आ)।"),
          q("hi1-2", 2023, "'सूर्योदय' का संधि-विच्छेद है:",
            ["सूर्य + उदय", "सूर्यो + दय", "सूर: + उदय", "सूर + उदय"], 0,
            "सूर्य + उदय → गुण संधि (अ + उ = ओ)।"),
        ],
      },
    ],
  },
  {
    id: "sanskrit",
    name: "Sanskrit",
    short: "Sans",
    glyph: "ॐ",
    hue: "from-yellow-500 to-orange-600",
    chapters: [
      {
        id: "vyakaran-sandhi",
        name: "व्याकरणम् — सन्धि",
        questionCount: 3,
        questions: [
          q("sa1-1", 2024, "'रमा + ईशः' इत्यस्य सन्धिः कः?",
            ["रमेशः", "रमीशः", "रमाईशः", "रमयीशः"], 0,
            "आ + ई = ए (गुण सन्धि) → रमेशः।"),
          q("sa1-2", 2023, "'सूर्य + उदयः' इत्यस्य सन्धिः कः?",
            ["सूर्योदयः", "सूर्यउदयः", "सूर्यैदयः", "सूर्यादयः"], 0,
            "अ + उ = ओ (गुण सन्धि) → सूर्योदयः।"),
          q("sa1-3", 2022, "'देव + इन्द्रः' इत्यस्य सन्धिः कः?",
            ["देवेन्द्रः", "देवीन्द्रः", "देवैन्द्रः", "देवइन्द्रः"], 0,
            "अ + इ = ए (गुण सन्धि) → देवेन्द्रः।"),
        ],
      },
      {
        id: "shabda-roop",
        name: "शब्द-रूपाणि",
        questionCount: 2,
        questions: [
          q("sa2-1", 2024, "'बालक' शब्दस्य प्रथमा विभक्तेः एकवचनं किम्?",
            ["बालकः", "बालकौ", "बालकाः", "बालकम्"], 0,
            "अकारान्त पुल्लिङ्ग — प्रथमा एकवचन → बालकः।"),
          q("sa2-2", 2023, "'लता' शब्दस्य तृतीया विभक्तेः एकवचनं किम्?",
            ["लतया", "लतायाः", "लतायाम्", "लताम्"], 0,
            "आकारान्त स्त्रीलिङ्ग — तृतीया एकवचन → लतया।"),
        ],
      },
      {
        id: "dhatu-roop",
        name: "धातु-रूपाणि",
        questionCount: 2,
        questions: [
          q("sa3-1", 2024, "'भू' धातोः लट् लकारे प्रथमपुरुष एकवचनं किम्?",
            ["भवति", "भवतः", "भवन्ति", "भवामि"], 0,
            "भू → लट् लकार, प्रथम पुरुष, एकवचन → भवति।"),
          q("sa3-2", 2022, "'पठ्' धातोः लट् लकारे उत्तमपुरुष एकवचनं किम्?",
            ["पठामि", "पठसि", "पठति", "पठावः"], 0,
            "पठ् → लट् लकार, उत्तम पुरुष, एकवचन → पठामि।"),
        ],
      },
    ],
  },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export function getChapter(subjectId: string, chapterId: string) {
  const subject = getSubject(subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId);
  return { subject, chapter };
}

/**
 * Split a chapter's questions into practice sets of ~20 questions each.
 * Fills sets of 20 sequentially; the final set holds the leftover
 * (typically 15–20; may be smaller when the chapter has very few PYQs).
 */
export function buildPracticeSets(questions: Question[], setSize = 20): Question[][] {
  if (!questions.length) return [];
  const sets: Question[][] = [];
  for (let i = 0; i < questions.length; i += setSize) {
    sets.push(questions.slice(i, i + setSize));
  }
  return sets;
}

const BEST_SCORE_KEY = "eklavya:pyq:setBest:v1";

export function readSetBestScores(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(BEST_SCORE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeSetBestScore(key: string, pct: number) {
  if (typeof window === "undefined") return;
  const all = readSetBestScores();
  if ((all[key] ?? -1) < pct) {
    all[key] = pct;
    window.localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("eklavya:pyq:update"));
  }
}

