import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpLeft, BookOpen, Building2, Check, ExternalLink, GraduationCap,
  LoaderCircle, MapPin, Search, Sparkles, X,
} from 'lucide-react';
import {
  buildAccaProgramsUrl,
  buildAccaUniversityUrl,
  findCatalogProgram,
  getSelectionItems,
  loadProgramCatalog,
  searchCatalogPrograms,
} from '../../services/programCatalogService';

// This picker is shared between the (Persian-only) central account portal and the
// bilingual AI Transfer flow, so all copy is keyed by `lang` (default 'fa' keeps
// the account portal unchanged).
const COUNTRY_LABELS = {
  fa: { KKTC: 'قبرس شمالی', Turkey: 'ترکیه' },
  en: { KKTC: 'North Cyprus', Turkey: 'Türkiye' },
};
function countryLabel(country, lang) {
  const table = COUNTRY_LABELS[lang] || COUNTRY_LABELS.fa;
  return country === 'KKTC' ? table.KKTC : table.Turkey;
}

const PRODUCT_COPY = {
  fa: {
    smart_apply: {
      eyebrow: 'Smart Apply Target',
      title: 'رشته و دانشگاه مقصد را انتخاب کنید',
      body: 'انتخاب شما از کاتالوگ زنده آکادو وارد پرونده پذیرش می‌شود.',
      action: 'انتخاب برای Smart Apply',
    },
    ai_transfer: {
      eyebrow: 'AI Transfer Target',
      title: 'دانشگاه و رشته مقصد انتقالی را انتخاب کنید',
      body: 'این انتخاب مبنای بررسی بعدی ریزنمرات و تطبیق مقدماتی دروس خواهد بود.',
      action: 'انتخاب برای AI Transfer',
    },
  },
  en: {
    smart_apply: {
      eyebrow: 'Smart Apply Target',
      title: 'Choose your target program & university',
      body: 'Your pick from the live ACCA catalog is added to your admission file.',
      action: 'Select for Smart Apply',
    },
    ai_transfer: {
      eyebrow: 'AI Transfer Target',
      title: 'Choose your transfer destination & program',
      body: 'This selection drives the next transcript review and preliminary course matching.',
      action: 'Select for AI Transfer',
    },
  },
};

const UI = {
  fa: {
    searchPlaceholder: 'نام رشته، دانشگاه، شهر یا زبان...',
    all: 'همه', turkey: 'ترکیه', cyprus: 'قبرس شمالی',
    allUniversities: 'همه دانشگاه‌ها', allDegrees: 'همه مقاطع', allLanguages: 'همه زبان‌ها',
    universityAria: 'دانشگاه مقصد', degreeAria: 'مقطع تحصیلی', languageAria: 'زبان تحصیل', close: 'بستن',
    source: 'منبع: کاتالوگ زنده آکادو',
    countShown: (shown, total) => `${shown} گزینه از ${total} برنامه فعال`,
    loading: 'در حال دریافت کاتالوگ...',
    empty: 'با این فیلتر گزینه‌ای پیدا نشد.',
    inList: (n) => `${n} گزینه در فهرست`, current: 'انتخاب فعلی', notSelected: 'هنوز انتخاب نشده',
    saving: 'در حال ذخیره...',
    uniInfo: 'اطلاعات دانشگاه', add: 'افزودن به فهرست', remove: 'حذف از فهرست',
  },
  en: {
    searchPlaceholder: 'Program, university, city or language…',
    all: 'All', turkey: 'Türkiye', cyprus: 'North Cyprus',
    allUniversities: 'All universities', allDegrees: 'All degrees', allLanguages: 'All languages',
    universityAria: 'Target university', degreeAria: 'Degree level', languageAria: 'Language of study', close: 'Close',
    source: 'Source: live ACCA catalog',
    countShown: (shown, total) => `${shown} of ${total} active programs`,
    loading: 'Loading catalog…',
    empty: 'No options match this filter.',
    inList: (n) => `${n} in shortlist`, current: 'Current selection', notSelected: 'Nothing selected yet',
    saving: 'Saving…',
    uniInfo: 'University info', add: 'Add to shortlist', remove: 'Remove from shortlist',
  },
};

const CARD_UI = {
  fa: {
    emptyTitleTransfer: 'دانشگاه مقصد انتقالی را مشخص کنید',
    emptyTitleSmart: 'دانشگاه و رشته موردنظر را انتخاب کنید',
    emptySub: 'کاتالوگ آکادو فقط گزینه‌های ترکیه و قبرس شمالی را نمایش می‌دهد.',
    cityFallback: 'شهر مقصد',
    more: (n) => `+${n} گزینه دیگر`,
    editList: 'ویرایش فهرست', changeOne: 'تغییر انتخاب',
    uniInfo: 'اطلاعات دانشگاه', viewOnAcca: 'مشاهده در آکادو',
  },
  en: {
    emptyTitleTransfer: 'Choose your transfer destination',
    emptyTitleSmart: 'Choose your target program & university',
    emptySub: 'The ACCA catalog shows Türkiye and North Cyprus options only.',
    cityFallback: 'Destination city',
    more: (n) => `+${n} more`,
    editList: 'Edit shortlist', changeOne: 'Change selection',
    uniInfo: 'University info', viewOnAcca: 'View on ACCA',
  },
};

function ProgramLogo({ program }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="catalog-program-logo">
      {program.universityLogo && !failed ? (
        <img src={program.universityLogo} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <Building2 size={20} />
      )}
    </span>
  );
}

export function SelectedProgramCard({ selection, product, onChange, lang = 'fa' }) {
  const t = CARD_UI[lang] || CARD_UI.fa;
  const items = getSelectionItems(selection);
  const program = items[0];
  if (!program?.university) {
    return (
      <button type="button" className="catalog-empty-selection" onClick={onChange}>
        <span><GraduationCap size={20} /></span>
        <div>
          <b>{product === 'ai_transfer' ? t.emptyTitleTransfer : t.emptyTitleSmart}</b>
          <small>{t.emptySub}</small>
        </div>
        <ArrowUpLeft size={18} />
      </button>
    );
  }

  const extras = items.slice(1);

  return (
    <motion.article
      className="catalog-selected-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <ProgramLogo program={program} />
      <div className="catalog-selected-copy">
        <span>
          {countryLabel(program.country, lang)} · {program.city || t.cityFallback}
          {extras.length > 0 && <b className="catalog-selected-count">{t.more(extras.length)}</b>}
        </span>
        <h3>{program.program}</h3>
        <p>{program.university}</p>
        <div>
          {program.degree && <small>{program.degree}</small>}
          {program.language && <small>{program.language}</small>}
          {program.tuitionFee && <small>{program.tuitionFee}</small>}
        </div>
        {extras.length > 0 && (
          <ul className="catalog-selected-extra">
            {extras.map((item) => (
              <li key={item.id}>
                <Check size={11} />
                <span>{item.program} · {item.university}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="catalog-selected-actions">
        <button type="button" onClick={onChange}>
          {items.length > 1 ? t.editList : t.changeOne}
        </button>
        <a href={buildAccaUniversityUrl(program.university)} target="_blank" rel="noreferrer">
          {t.uniInfo} <ExternalLink size={13} />
        </a>
        <a href={buildAccaProgramsUrl(program)} target="_blank" rel="noreferrer">
          {t.viewOnAcca} <BookOpen size={13} />
        </a>
      </div>
    </motion.article>
  );
}

export default function ProgramCatalogPicker({
  open,
  product,
  initialProgramId = '',
  initialUniversity = '',
  initialSelection = [],
  saving = false,
  lang = 'fa',
  onClose,
  onSelect,
}) {
  const [programs, setPrograms] = useState([]);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('all');
  const [university, setUniversity] = useState(initialUniversity);
  const [degree, setDegree] = useState('');
  const [language, setLanguage] = useState('');
  const [selectedList, setSelectedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const langCopy = PRODUCT_COPY[lang] || PRODUCT_COPY.fa;
  const copy = langCopy[product] || langCopy.smart_apply;
  const t = UI[lang] || UI.fa;

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');

      loadProgramCatalog()
        .then((rows) => {
          if (!active) return;
          setPrograms(rows);
          setUniversity(initialUniversity || '');
          setDegree('');
          // Reconcile any saved shortlist against the live catalog (fall back to the snapshot).
          const seeded = (initialSelection || [])
            .map((item) => findCatalogProgram(rows, item.id) || item)
            .filter((item) => item && item.id);
          const linkedProgram = findCatalogProgram(rows, initialProgramId);
          if (linkedProgram && !seeded.some((item) => item.id === linkedProgram.id)) {
            seeded.unshift(linkedProgram);
          }
          setSelectedList(seeded);
          setQuery('');
        })
        .catch((catalogError) => {
          if (active) setError(catalogError?.message || 'دریافت کاتالوگ انجام نشد.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [initialProgramId, initialUniversity, initialSelection, open]);

  const toggleProgram = (program) => {
    setSelectedList((list) => (
      list.some((item) => item.id === program.id)
        ? list.filter((item) => item.id !== program.id)
        : [...list, program]
    ));
  };

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  const universityOptions = useMemo(() => {
    const names = programs
      .filter((program) => country === 'all' || program.country === country)
      .map((program) => program.university);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [country, programs]);

  const degreeOptions = useMemo(() => {
    const degrees = programs
      .filter((program) => country === 'all' || program.country === country)
      .filter((program) => !university || program.university === university)
      .map((program) => program.degree)
      .filter(Boolean);
    return [...new Set(degrees)].sort((a, b) => a.localeCompare(b));
  }, [country, programs, university]);

  const languageOptions = useMemo(() => {
    const langs = programs
      .filter((program) => country === 'all' || program.country === country)
      .filter((program) => !university || program.university === university)
      .filter((program) => !degree || program.degree === degree)
      .map((program) => program.language)
      .filter(Boolean);
    return [...new Set(langs)].sort((a, b) => a.localeCompare(b));
  }, [country, degree, programs, university]);

  const visiblePrograms = useMemo(() => searchCatalogPrograms(programs, {
    query,
    country,
    university,
    degree,
    language,
  }), [country, degree, programs, query, university, language]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="catalog-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="catalog-picker"
            role="dialog"
            aria-modal="true"
            dir={lang === 'en' ? 'ltr' : 'rtl'}
            initial={{ opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="catalog-picker-head">
              <div className="catalog-picker-orb"><Sparkles size={23} /></div>
              <div>
                <span>{copy.eyebrow}</span>
                <h2>{copy.title}</h2>
                <p>{copy.body}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t.close}><X size={18} /></button>
            </header>

            <div className="catalog-picker-filters">
              <label>
                <Search size={17} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  autoFocus
                />
              </label>
              <div className="catalog-country-tabs">
                {[
                  ['all', t.all],
                  ['Turkey', t.turkey],
                  ['KKTC', t.cyprus],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={country === value ? 'is-active' : ''}
                    onClick={() => {
                      setCountry(value);
                      setUniversity('');
                      setDegree('');
                      setLanguage('');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={university}
                onChange={(event) => { setUniversity(event.target.value); setDegree(''); setLanguage(''); }}
                aria-label={t.universityAria}
              >
                <option value="">{t.allUniversities}</option>
                {universityOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select value={degree} onChange={(event) => { setDegree(event.target.value); setLanguage(''); }} aria-label={t.degreeAria}>
                <option value="">{t.allDegrees}</option>
                {degreeOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t.languageAria}>
                <option value="">{t.allLanguages}</option>
                {languageOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className="catalog-picker-meta">
              <span>{t.source}</span>
              <b>{t.countShown(visiblePrograms.length, programs.length)}</b>
            </div>

            <div className="catalog-program-list">
              {loading ? (
                <div className="catalog-picker-state"><LoaderCircle className="account-spin" /> {t.loading}</div>
              ) : error ? (
                <div className="catalog-picker-state is-error">{error}</div>
              ) : visiblePrograms.length ? (
                visiblePrograms.map((program) => {
                  const isSelected = selectedList.some((item) => item.id === program.id);
                  return (
                    <article key={program.id} className={isSelected ? 'is-selected' : ''}>
                      <ProgramLogo program={program} />
                      <button type="button" className="catalog-program-main" onClick={() => toggleProgram(program)}>
                        <span><MapPin size={12} />{countryLabel(program.country, lang)} · {program.city}</span>
                        <h3>{program.program}</h3>
                        <p>{program.university}</p>
                        <div>
                          {program.degree && <small>{program.degree}</small>}
                          {program.language && <small>{program.language}</small>}
                          {program.tuitionFee && <small>{program.tuitionFee}</small>}
                        </div>
                      </button>
                      <div className="catalog-program-actions">
                        <a href={buildAccaUniversityUrl(program.university)} target="_blank" rel="noreferrer" title={t.uniInfo}>
                          <ExternalLink size={15} />
                        </a>
                        <button type="button" onClick={() => toggleProgram(program)} aria-label={isSelected ? t.remove : t.add}>
                          {isSelected ? <Check size={16} /> : <ArrowUpLeft size={16} />}
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="catalog-picker-state">{t.empty}</div>
              )}
            </div>

            <footer className="catalog-picker-footer">
              <div>
                <small>{selectedList.length ? t.inList(selectedList.length) : t.current}</small>
                {selectedList.length ? (
                  <div className="catalog-selected-chips">
                    {selectedList.map((item) => (
                      <span key={item.id} title={`${item.program} · ${item.university}`}>
                        {item.university}
                        <button type="button" onClick={() => toggleProgram(item)} aria-label={t.remove}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <b>{t.notSelected}</b>
                )}
              </div>
              <button type="button" disabled={!selectedList.length || saving} onClick={() => onSelect(selectedList)}>
                {saving ? <LoaderCircle className="account-spin" size={17} /> : <Check size={17} />}
                {saving ? t.saving : `${copy.action}${selectedList.length > 1 ? ` (${selectedList.length})` : ''}`}
              </button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
