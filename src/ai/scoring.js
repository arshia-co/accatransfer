// Frontend-only Major Discovery scoring engine (25-question deep profile).
//
// Combines seven weighted layers — MBTI-inspired axes, RIASEC-style interests,
// Big-Five- and HEXACO-inspired snapshots, ACCA academic categories,
// motivation values and self-reported academic strengths — into an
// educational guidance profile with explicit confidence levels.
//
// Safety language (also surfaced in the UI): the output is an educational
// guidance profile based on the student's answers — NOT a clinical diagnosis
// and NOT an official MBTI assessment. Confidence is reported honestly:
// close axes are shown as "balanced", never forced into fake certainty.
//
// Everything here is mock and deterministic so a backend scoring service can
// replace this module while keeping the exact same result shape.

import { DISCOVERY_QUESTIONS, findDiscoveryOption } from '../data/discoveryQuestions';
import { ARCHETYPES, ACCA_CATEGORY_LABELS } from '../data/majorQuestions';
import { MAJORS } from '../data/mockPrograms';
import {
  HIDDEN_STRENGTHS,
  BLIND_SPOTS,
  RECAP_TEMPLATES,
  RECAP_FRAGMENTS,
  TRAIT_META,
  LEVEL_LABELS,
} from '../data/discoveryProfile';
import { L } from '../lib/lang';

const MBTI_KEYS = ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'];
const RIASEC_KEYS = ['R', 'I', 'A', 'S', 'E', 'C'];
const BIG5_KEYS = ['O', 'C', 'E', 'A', 'Em'];
const HEXACO_KEYS = ['H', 'Em', 'X', 'A', 'C', 'O'];
const ACCA_KEYS = [
  'Health', 'Business', 'Tech', 'Creative', 'Research', 'People', 'Stability',
  'Leadership', 'Communication', 'Precision', 'GlobalMobility',
];
const MOTIV_KEYS = [
  'Income', 'Prestige', 'Security', 'SocialImpact', 'Autonomy', 'Creativity',
  'Migration', 'FamilyApproval', 'Lifestyle',
];
const STRENGTH_KEYS = [
  'BiologyChemistry', 'MathPhysics', 'LanguageCommunication', 'ArtDesign',
  'BusinessEconomics', 'PsychologyHumanities', 'TechnologyComputing', 'ResearchWriting',
];

const AXES = [
  { id: 'EI', a: 'E', b: 'I' },
  { id: 'SN', a: 'S', b: 'N' },
  { id: 'TF', a: 'T', b: 'F' },
  { id: 'JP', a: 'J', b: 'P' },
];

const zeros = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));

function emptyTotals() {
  return {
    mbti: zeros(MBTI_KEYS),
    riasec: zeros(RIASEC_KEYS),
    big5: zeros(BIG5_KEYS),
    hexaco: zeros(HEXACO_KEYS),
    acca: zeros(ACCA_KEYS),
    motiv: zeros(MOTIV_KEYS),
    strengths: zeros(STRENGTH_KEYS),
  };
}

function addWeights(totals, weights = {}) {
  for (const layer of Object.keys(totals)) {
    const add = weights[layer];
    if (!add) continue;
    for (const [key, val] of Object.entries(add)) {
      if (key in totals[layer]) totals[layer][key] += val;
    }
  }
}

/** Tallies the chosen options (works for partial answer sets too). */
function tally(answerOptionIds) {
  const totals = emptyTotals();
  let reality = null;
  for (const id of answerOptionIds) {
    const hit = findDiscoveryOption(id);
    if (!hit) continue;
    addWeights(totals, hit.option.weights);
    if (hit.option.reality) reality = hit.option.reality;
  }
  return { totals, reality };
}

/** Highest score any single path through the bank could give each dimension. */
function attainableMax() {
  const max = emptyTotals();
  for (const q of DISCOVERY_QUESTIONS) {
    for (const layer of Object.keys(max)) {
      const best = {};
      for (const opt of q.options) {
        const add = opt.weights?.[layer];
        if (!add) continue;
        for (const [key, val] of Object.entries(add)) {
          best[key] = Math.max(best[key] || 0, val);
        }
      }
      for (const [key, val] of Object.entries(best)) {
        if (key in max[layer]) max[layer][key] += val;
      }
    }
  }
  return max;
}

const ATTAINABLE = attainableMax();

const sortedEntries = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

function levelFor(layer, key, score) {
  const cap = Math.max(1, ATTAINABLE[layer][key]);
  const ratio = score / cap;
  if (ratio >= 0.52) return 'high';
  if (ratio >= 0.26) return 'medium';
  return 'low';
}

function pctOfMax(layer, key, score) {
  const cap = Math.max(1, ATTAINABLE[layer][key]);
  return Math.round(Math.min(1, score / cap) * 100);
}

// ─────────────────────── MBTI-inspired axis math ───────────────────────
function computeAxis(totals, axis) {
  const a = totals.mbti[axis.a];
  const b = totals.mbti[axis.b];
  const sum = a + b;
  const winner = b > a ? axis.b : axis.a;
  const loser = winner === axis.a ? axis.b : axis.a;
  const margin = sum === 0 ? 0 : Math.abs(a - b) / sum;
  const confidence = margin < 0.2 ? 'balanced' : margin < 0.45 ? 'medium' : 'high';
  return {
    id: axis.id,
    winner,
    loser,
    // % pull toward the winner pole, capped below 100 — a 25-question demo
    // should never claim absolute certainty, even for one-sided answers.
    score: Math.min(94, Math.round(50 + margin * 50)),
    confidence,
  };
}

function computeMbtiLike(totals) {
  const axes = {};
  let weakest = null;
  for (const axis of AXES) {
    const computed = computeAxis(totals, axis);
    axes[axis.id] = computed;
    if (!weakest || computed.score < axes[weakest].score) weakest = axis.id;
  }
  const type = AXES.map((axis) => axes[axis.id].winner).join('');
  const secondaryType =
    axes[weakest].confidence !== 'high'
      ? AXES.map((axis) => (axis.id === weakest ? axes[axis.id].loser : axes[axis.id].winner)).join('')
      : null;
  const confidence = Math.round(
    AXES.reduce((acc, axis) => acc + axes[axis.id].score, 0) / AXES.length,
  );
  return { type, secondaryType, confidence, axes };
}

// ───────────────────────── Archetype selection ─────────────────────────
function rankArchetypes(totals, riasecCode) {
  const accaTotal = Math.max(1, Object.values(totals.acca).reduce((x, y) => x + y, 0));
  return ARCHETYPES.map((a) => {
    let score = (totals.acca[a.match.acca] || 0) / accaTotal;
    score += a.match.riasec.filter((l) => riasecCode.includes(l)).length * 0.08;
    return { archetype: a, score };
  }).sort((x, y) => y.score - x.score);
}

// ───────────────────── Learning environment spectrums ─────────────────────
// Each spectrum: pos 0–100 toward end B, side 'a' | 'b' (the leaning end).
function computeLearningEnv(totals, axes) {
  const toward = (bScore, aScore) => {
    const sum = aScore + bScore;
    return sum === 0 ? 50 : Math.round((bScore / sum) * 100);
  };
  const social = axes.EI.winner === 'E' ? axes.EI.score : 100 - axes.EI.score; // B = group
  const structure = axes.JP.winner === 'P' ? axes.JP.score : 100 - axes.JP.score; // B = flexible
  const theoryScore = totals.riasec.I + totals.acca.Research + totals.mbti.N;
  const practiceScore = totals.riasec.R + totals.mbti.S;
  const theory = toward(practiceScore, theoryScore); // B = practice-heavy
  const researchScore = totals.riasec.I + totals.acca.Research;
  const peopleScore = totals.riasec.S + totals.acca.People + totals.acca.Communication;
  const focus = toward(peopleScore, researchScore); // B = people-facing
  const pack = (pos) => ({ pos, side: pos >= 50 ? 'b' : 'a' });
  return {
    social: pack(social),
    structure: pack(structure),
    theory: pack(theory),
    focus: pack(focus),
  };
}

// ───────────────────────── Major recommendation ─────────────────────────
function rankMajors(totals, riasecTop, motivTop, strengthsTop, reality) {
  const accaTotal = Math.max(1, Object.values(totals.acca).reduce((x, y) => x + y, 0));
  const accaFrac = Object.fromEntries(
    Object.entries(totals.acca).map(([k, v]) => [k, v / accaTotal]),
  );
  return MAJORS.map((major) => {
    let score = 0;
    for (const [cat, w] of Object.entries(major.acca)) score += (accaFrac[cat] || 0) * w;
    score += major.riasec.filter((l) => riasecTop.includes(l)).length * 0.18;
    score += (major.strengths || []).filter((s) => strengthsTop.includes(s)).length * 0.22;
    score += (major.motiv || []).filter((m) => motivTop.includes(m)).length * 0.12;
    // Gentle admission-reality adjustment — fit first, feasibility second.
    if (reality === 'scholarship_first' && major.costTier === 'high') score *= 0.88;
    if (reality === 'foundation_first' && major.selective) score *= 0.94;
    return { major, score };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Full deep-profile computation after all 25 answers.
 * Shape consumed by MajorResultPreview + smartApplyStore (see README).
 */
export function computeDiscoveryResult(answerOptionIds) {
  const { totals, reality } = tally(answerOptionIds);

  // MBTI-inspired pattern
  const mbtiLike = computeMbtiLike(totals);

  // RIASEC
  const riasecSorted = sortedEntries(totals.riasec);
  const riasecTop = riasecSorted.slice(0, 3).map(([k]) => k);
  const riasec = {
    code: riasecTop.join('-'),
    top: riasecTop,
    scores: Object.fromEntries(
      RIASEC_KEYS.map((k) => [k, pctOfMax('riasec', k, totals.riasec[k])]),
    ),
  };

  // Big-Five / HEXACO-inspired snapshots (level + bar %)
  const bigFive = Object.fromEntries(
    BIG5_KEYS.map((k) => [k, { level: levelFor('big5', k, totals.big5[k]), pct: pctOfMax('big5', k, totals.big5[k]) }]),
  );
  const hexaco = Object.fromEntries(
    HEXACO_KEYS.map((k) => [k, { level: levelFor('hexaco', k, totals.hexaco[k]), pct: pctOfMax('hexaco', k, totals.hexaco[k]) }]),
  );

  // ACCA categories, motivations, strengths
  const accaSorted = sortedEntries(totals.acca);
  const accaTop = accaSorted.slice(0, 4).map(([key, score]) => ({ key, score }));
  const motivTop = sortedEntries(totals.motiv).slice(0, 3).map(([k]) => k);
  const strengthsTop = sortedEntries(totals.strengths)
    .filter(([, v]) => v > 0)
    .slice(0, 3)
    .map(([key, score]) => ({ key, pct: pctOfMax('strengths', key, score) }));

  // Archetypes (primary + secondary)
  const rankedArchetypes = rankArchetypes(totals, riasec.code);
  const accaArchetype = {
    primary: rankedArchetypes[0].archetype.id,
    secondary: rankedArchetypes[1]?.archetype.id || null,
  };

  // Signals consumed by the hidden-strength / blind-spot predicates
  const signals = {
    axes: mbtiLike.axes,
    letters: new Set(Object.values(mbtiLike.axes).map((a) => a.winner)),
    riasecTop,
    accaTop: accaTop.map((c) => c.key),
    big5: Object.fromEntries(BIG5_KEYS.map((k) => [k, bigFive[k].level])),
    hexaco: Object.fromEntries(HEXACO_KEYS.map((k) => [k, hexaco[k].level])),
    motivTop,
    strengthsTop: strengthsTop.map((s) => s.key),
    reality,
  };

  const hiddenStrengths = HIDDEN_STRENGTHS.filter((h) => h.when(signals)).slice(0, 3).map((h) => h.id);
  const blindSpots = BLIND_SPOTS.filter((b) => b.when(signals)).slice(0, 3).map((b) => b.id);

  const learningEnvironment = computeLearningEnv(totals, mbtiLike.axes);

  // Majors: top 6 recommended, bottom 3 as polite caution paths
  const rankedMajors = rankMajors(totals, riasecTop, motivTop, signals.strengthsTop, reality);
  const top = rankedMajors.slice(0, 6);
  const minScore = top[top.length - 1].score;
  const span = top[0].score - minScore || 1;
  const recommendedMajors = top.map(({ major, score }) => ({
    majorId: major.id,
    match: Math.round(72 + 26 * ((score - minScore) / span)),
  }));
  const cautionMajors = rankedMajors.slice(-3).map(({ major }) => ({ majorId: major.id })).reverse();

  const highCostRecommended = top.some(({ major }) => major.costTier === 'high');

  return {
    version: 2,
    mbtiLike,
    riasec,
    bigFive,
    hexaco,
    accaArchetype,
    accaTop,
    motivTop,
    strengthsTop,
    hiddenStrengths,
    blindSpots,
    learningEnvironment,
    recommendedMajors,
    cautionMajors,
    reality: reality || 'balanced',
    highCostRecommended,
    interests: accaTop.slice(0, 2).map((c) => c.key),
  };
}

// ───────────────────────── Mid-flow recap builder ─────────────────────────
function axisFragment(totals, axisId, lang) {
  const axis = AXES.find((a) => a.id === axisId);
  const computed = computeAxis(totals, axis);
  const set = RECAP_FRAGMENTS[axisId];
  const pick = computed.confidence === 'balanced' ? set.balanced : set[computed.winner];
  return L(pick, lang);
}

/**
 * Smart recap shown after questions 5, 10, 15 and 20 — built from the
 * partial scores so it reflects what the student actually answered.
 */
export function buildRecap(answerOptionIds, stage, lang) {
  const { totals } = tally(answerOptionIds);
  const template = L(RECAP_TEMPLATES[stage], lang);
  let a = '';
  let b = '';

  if (stage === 5) {
    a = axisFragment(totals, 'EI', lang);
    b = axisFragment(totals, 'SN', lang);
  } else if (stage === 10) {
    a = axisFragment(totals, 'TF', lang);
    b = axisFragment(totals, 'JP', lang);
  } else if (stage === 15) {
    const topCats = sortedEntries(totals.acca).slice(0, 2);
    a = L(ACCA_CATEGORY_LABELS[topCats[0]?.[0]] || {}, lang);
    b = L(ACCA_CATEGORY_LABELS[topCats[1]?.[0]] || {}, lang);
  } else if (stage === 20) {
    const [topTrait] = sortedEntries(totals.big5);
    const key = topTrait?.[0] || 'C';
    const level = levelFor('big5', key, totals.big5[key]);
    a = `${L(TRAIT_META[key].label, lang)} (${L(LEVEL_LABELS[level], lang)})`;
    b = '';
  }

  return template.replace('{a}', a).replace('{b}', b);
}
