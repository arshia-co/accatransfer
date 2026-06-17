const ACCA_SITE_URL = import.meta.env.VITE_ACCA_SITE_URL || 'https://www.accaco.com';
const CATALOG_URL = import.meta.env.VITE_ACCA_CATALOG_URL || `${ACCA_SITE_URL}/data/programs.json`;
const ALLOWED_COUNTRIES = new Set(['Turkey', 'KKTC']);
const AVAILABLE_STATUS = 'available';

let catalogPromise;

function clean(value) {
  return String(value || '').trim();
}

function normalizeSearch(value) {
  return clean(value)
    .toLocaleLowerCase('en-US')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeProgram(row) {
  const country = clean(row.country);
  if (!ALLOWED_COUNTRIES.has(country)) return null;
  if (clean(row.status).toLowerCase() !== AVAILABLE_STATUS) return null;

  return {
    id: clean(row.id),
    country,
    city: clean(row.city),
    university: clean(row.university),
    program: clean(row.program),
    degree: clean(row.degree),
    language: clean(row.language),
    faculty: clean(row.faculty),
    years: clean(row.years),
    tuitionFee: clean(row.tuitionFee),
    cashFees: clean(row.cashFees),
    depositFee: clean(row.depositFee),
    semester: clean(row.semester),
    universityLogo: clean(row.universityLogo),
    universityUrl: clean(row.universityUrl),
  };
}

export function getCountryLabel(country) {
  return country === 'KKTC' ? 'قبرس شمالی' : 'ترکیه';
}

export async function loadProgramCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then((response) => {
        if (!response.ok) throw new Error('کاتالوگ رشته‌ها در دسترس نیست.');
        return response.json();
      })
      .then((payload) => (payload.rows || []).map(normalizeProgram).filter(Boolean))
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }

  return catalogPromise;
}

export function findCatalogProgram(programs, programId) {
  const id = clean(programId);
  return id ? programs.find((program) => program.id === id) || null : null;
}

/**
 * Reads the saved shortlist from a `student_program_selections` row.
 * Backward compatible: new rows store an array in `catalog_snapshot.items`,
 * older rows stored a single program object in `catalog_snapshot`.
 */
export function getSelectionItems(selection) {
  if (!selection) return [];
  const snapshot = selection.catalog_snapshot || selection;
  if (Array.isArray(snapshot?.items) && snapshot.items.length) return snapshot.items.filter(Boolean);
  if (snapshot?.university) return [snapshot];
  return [];
}

export function searchCatalogPrograms(programs, {
  query = '',
  country = 'all',
  university = '',
  language = '',
  limit = 60,
} = {}) {
  const normalizedQuery = normalizeSearch(query);
  const normalizedUniversity = normalizeSearch(university);
  const normalizedLanguage = normalizeSearch(language);

  return programs
    .filter((program) => country === 'all' || program.country === country)
    .filter((program) => !normalizedUniversity || normalizeSearch(program.university).includes(normalizedUniversity))
    .filter((program) => !normalizedLanguage || normalizeSearch(program.language) === normalizedLanguage)
    .filter((program) => {
      if (!normalizedQuery) return true;
      return normalizeSearch([
        program.program,
        program.university,
        program.city,
        program.degree,
        program.language,
        program.faculty,
      ].join(' ')).includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function buildAccaProgramsUrl(program) {
  const params = new URLSearchParams({ page: 'programs' });
  if (Array.isArray(program?.programs) && program.programs.length) {
    // Pre-select the accaco "program" filter with one or more exact names.
    // No country param → accaco keeps its Turkey + N. Cyprus default.
    program.programs.forEach((name) => params.append('program', name));
  } else {
    if (program?.university) params.set('university', program.university);
    if (program?.program) params.set('search', program.program);
  }
  return `${ACCA_SITE_URL}/?${params.toString()}`;
}

// Focused program-filter per recommended major: `include` phrases (and optional
// `exclude`) are matched against accaco's live catalog so a major resolves to its
// related programs (e.g. cs_ai → Computer/Software/AI/Information Systems), not a
// loose text search. Validated against accaco's Turkey + N. Cyprus catalog.
export const MAJOR_PROGRAM_FILTERS = {
  medicine: { include: ['medicine'], exclude: ['nursing', 'veterinary', 'technician', 'assistant', 'secretary', 'aesthetic'] },
  dentistry: { include: ['dentistry'], exclude: ['technician', 'technology', 'prosthe'] },
  physiotherapy: { include: ['physiotherapy'], exclude: [] },
  psychology: { include: ['psychology'], exclude: [] },
  nutrition: { include: ['nutrition'], exclude: ['animal'] },
  nursing: { include: ['nursing'], exclude: [] },
  biomedical: { include: ['biomedical'], exclude: [] },
  cs_ai: { include: ['computer engineering', 'computer science', 'software engineering', 'artificial intelligence', 'information systems engineering', 'information technolog', 'mechatronic'], exclude: ['education', 'instructional', 'teaching'] },
  data_science: { include: ['data science', 'big data', 'data analytic'], exclude: [] },
  business: { include: ['business'], exclude: ['tourism', 'logistics', 'aviation', 'sport', 'art', 'health', 'real estate', 'banking and'] },
  marketing: { include: ['marketing'], exclude: [] },
  ir: { include: ['international relations', 'political science'], exclude: [] },
  law: { include: ['law'], exclude: [] },
  architecture: { include: ['architecture'], exclude: ['interior', 'landscape', 'restoration'] },
  interior: { include: ['interior'], exclude: [] },
  molecular: { include: ['molecular biolog', 'genetic'], exclude: [] },
  health_mgmt: { include: ['health management', 'health institution', 'healthcare management'], exclude: [] },
};

const MAX_PROGRAM_FILTERS = 24;

/**
 * Resolve a recommended major to the exact accaco program names it should filter
 * to. Uses the curated MAJOR_PROGRAM_FILTERS when the major id is known, otherwise
 * falls back to the major's own name as a single include phrase.
 */
export function resolveMajorPrograms(programs, { majorId, majorName } = {}) {
  const filter = MAJOR_PROGRAM_FILTERS[majorId];
  const include = (filter?.include?.length ? filter.include : [String(majorName || '')])
    .map(normalizeSearch).filter(Boolean);
  const exclude = (filter?.exclude || []).map(normalizeSearch).filter(Boolean);
  if (!include.length) return [];
  const names = new Set();
  for (const program of programs) {
    const name = normalizeSearch(program.program);
    if (include.some((key) => name.includes(key)) && !exclude.some((key) => name.includes(key))) {
      names.add(program.program);
      if (names.size >= MAX_PROGRAM_FILTERS) break;
    }
  }
  return [...names];
}

export function buildAccaUniversityUrl(university) {
  const params = new URLSearchParams({
    page: 'universities',
    university: clean(university),
  });
  return `${ACCA_SITE_URL}/?${params.toString()}`;
}

export function readCatalogDeepLink() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const product = params.get('select');
  const programId = params.get('programId');
  const university = params.get('university');

  if (!['smart_apply', 'ai_transfer'].includes(product)) return null;
  if (!programId && !university) return null;

  return {
    product,
    programId: clean(programId),
    university: clean(university),
    source: clean(params.get('source')) || 'direct',
  };
}

export async function resolveCatalogDeepLink(deepLink) {
  if (!deepLink?.programId) return null;
  const programs = await loadProgramCatalog();
  return findCatalogProgram(programs, deepLink.programId);
}

export function clearCatalogDeepLink() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  ['select', 'programId', 'university', 'source'].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
