/**
 * Question bank generator.
 * ----------------------------------------------------------------------------
 * Expands the small, human-maintainable datasets in src/data/generators/* into
 * a large (~1000) bank of technical-English questions written to
 * src/data/questions.json.
 *
 * Run with:  npm run generate:questions
 *
 * To grow the bank, just add entries to the dataset JSON files and re-run — no
 * need to hand-write individual questions. Generation is deterministic (seeded)
 * so ids stay stable between runs unless the datasets change.
 */
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type QuestionType = 'multiple_choice' | 'text_input';

interface GeneratedQuestion {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string;
  acceptedAnswers?: string[];
}

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 1337;
const rand = mulberry32(SEED);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Picks `count` distinct items from pool excluding any in `exclude`. */
function pickDistinct(pool: string[], exclude: string[], count: number): string[] {
  const candidates = shuffle(pool.filter((x) => !exclude.includes(x)));
  return candidates.slice(0, count);
}

// ---------------------------------------------------------------------------
// Dataset loading
// ---------------------------------------------------------------------------
const GEN_DIR = path.join(__dirname, '..', 'src', 'data', 'generators');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(GEN_DIR, file), 'utf-8')) as T;
}

const acronyms = readJson<{ acronym: string; full: string }[]>('acronyms.json');
const vocabulary = readJson<{ term: string; definition: string }[]>('vocabulary.json');
const grammar = readJson<{
  subjects: { text: string; be: string; third: boolean }[];
  verbs: { base: string; third: string; rest: string }[];
  articleNouns: { noun: string; article: string }[];
}>('grammar.json');
const mcExtra = readJson<{ question: string; options: string[]; answer: string }[]>(
  'mc-extra.json',
);
const translations = readJson<{ pt: string; en: string; accepted: string[] }[]>(
  'translations.json',
);
const words = readJson<{ pt: string; en: string; accepted: string[] }[]>('words.json');
const fillBlanks = readJson<{ question: string; answer: string; accepted: string[] }[]>(
  'fill-blanks.json',
);

// ---------------------------------------------------------------------------
// Generators (return questions WITHOUT ids)
// ---------------------------------------------------------------------------
type Draft = Omit<GeneratedQuestion, 'id'>;

function mc(question: string, options: string[], answer: string): Draft {
  return { type: 'multiple_choice', question, options: shuffle(options), answer };
}

function text(question: string, answer: string, accepted: string[] = []): Draft {
  const draft: Draft = { type: 'text_input', question, answer };
  if (accepted.length > 0) draft.acceptedAnswers = accepted;
  return draft;
}

// --- Multiple choice ---
const allFulls = acronyms.map((a) => a.full);
const allAcronyms = acronyms.map((a) => a.acronym);
const allDefs = vocabulary.map((v) => v.definition);
const allTerms = vocabulary.map((v) => v.term);

const acronymExpand: Draft[] = acronyms.map((a) =>
  mc(
    `What does ${a.acronym} stand for?`,
    [a.full, ...pickDistinct(allFulls, [a.full], 3)],
    a.full,
  ),
);

const acronymReverse: Draft[] = acronyms.map((a) =>
  mc(
    `Which acronym means "${a.full}"?`,
    [a.acronym, ...pickDistinct(allAcronyms, [a.acronym], 3)],
    a.acronym,
  ),
);

const vocabMeaning: Draft[] = vocabulary.map((v) =>
  mc(
    `What does "${v.term}" mean (in software development)?`,
    [v.definition, ...pickDistinct(allDefs, [v.definition], 3)],
    v.definition,
  ),
);

const vocabReverse: Draft[] = vocabulary.map((v) =>
  mc(
    `Which term is described by: "${v.definition}"?`,
    [v.term, ...pickDistinct(allTerms, [v.term], 3)],
    v.term,
  ),
);

const grammarMC: Draft[] = [];
for (const s of grammar.subjects) {
  for (const v of grammar.verbs) {
    const correctForm = s.third ? v.third : v.base;
    const oppositeForm = s.third ? v.base : v.third;
    const correct = `${s.text} ${correctForm} ${v.rest}.`;
    const d1 = `${s.text} ${oppositeForm} ${v.rest}.`;
    const d2 = `${s.text} ${s.be} ${v.base} ${v.rest}.`;
    const d3 = `${s.text} ${s.be} ${v.third} ${v.rest}.`;
    grammarMC.push(mc('Which sentence is correct?', [correct, d1, d2, d3], correct));
  }
}

const articleMC: Draft[] = grammar.articleNouns.map((n) => {
  const wrong = n.article === 'a' ? 'an' : 'a';
  const correct = `I am ${n.article} ${n.noun}.`;
  return mc(
    'Which sentence is correct?',
    [
      correct,
      `I am ${wrong} ${n.noun}.`,
      `I am ${n.noun}.`,
      `I ${n.article} ${n.noun}.`,
    ],
    correct,
  );
});

const extraMC: Draft[] = mcExtra.map((q) => mc(q.question, q.options, q.answer));

// --- Text input ---
const sentenceTranslations: Draft[] = translations.map((t) =>
  text(`Translate to English: ${t.pt}`, t.en, t.accepted),
);

const wordTranslations: Draft[] = words.map((w) =>
  text(`Translate to English: ${w.pt}`, w.en, w.accepted),
);

const fillBlankText: Draft[] = fillBlanks.map((f) =>
  text(f.question, f.answer, f.accepted),
);

const vocabDefToTerm: Draft[] = vocabulary.map((v) =>
  text(`In one or two words, what is being described? "${v.definition}"`, v.term),
);

const acronymFromFull: Draft[] = acronyms.map((a) =>
  text(`Type the acronym for: ${a.full}`, a.acronym),
);

const verbConjugationText: Draft[] = [];
for (const s of grammar.subjects) {
  for (const v of grammar.verbs) {
    const correctForm = s.third ? v.third : v.base;
    verbConjugationText.push(
      text(
        `Use the correct form of "${v.base}": ${s.text} ___ ${v.rest}.`,
        correctForm,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Balancing — aim for ~500 MC + ~500 text_input (≈ 1000 total)
// ---------------------------------------------------------------------------
const TARGET_PER_TYPE = 500;

const fixedMC = [
  ...acronymExpand,
  ...acronymReverse,
  ...vocabMeaning,
  ...vocabReverse,
  ...articleMC,
  ...extraMC,
];
const grammarCap = Math.max(0, TARGET_PER_TYPE - fixedMC.length);
const multipleChoice = [...fixedMC, ...shuffle(grammarMC).slice(0, grammarCap)];

const fixedText = [
  ...sentenceTranslations,
  ...wordTranslations,
  ...fillBlankText,
  ...vocabDefToTerm,
  ...acronymFromFull,
];
const verbCap = Math.max(0, multipleChoice.length - fixedText.length);
const textInput = [...fixedText, ...shuffle(verbConjugationText).slice(0, verbCap)];

// ---------------------------------------------------------------------------
// Assemble + assign ids
// ---------------------------------------------------------------------------
const drafts: Draft[] = [...multipleChoice, ...textInput];
const questions: GeneratedQuestion[] = drafts.map((d, i) => ({ id: i + 1, ...d }));

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
let invalid = 0;
for (const q of questions) {
  if (q.type === 'multiple_choice') {
    const opts = q.options ?? [];
    const unique = new Set(opts);
    if (opts.length < 2 || !opts.includes(q.answer) || unique.size !== opts.length) {
      invalid++;
      console.warn(`Invalid MC question id=${q.id}: ${q.question}`);
    }
  } else if (!q.answer) {
    invalid++;
  }
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const OUT = path.join(__dirname, '..', 'src', 'data', 'questions.json');
fs.writeFileSync(OUT, JSON.stringify(questions, null, 2) + '\n', 'utf-8');

const mcCount = questions.filter((q) => q.type === 'multiple_choice').length;
const textCount = questions.filter((q) => q.type === 'text_input').length;

console.log('-----------------------------------------------------');
console.log(`Generated ${questions.length} questions -> ${OUT}`);
console.log(`  multiple_choice: ${mcCount}`);
console.log(`  text_input:      ${textCount}`);
if (invalid > 0) console.warn(`  WARNING: ${invalid} invalid question(s) detected.`);
console.log('-----------------------------------------------------');
