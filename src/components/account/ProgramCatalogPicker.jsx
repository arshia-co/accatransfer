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
  getCountryLabel,
  getSelectionItems,
  loadProgramCatalog,
  searchCatalogPrograms,
} from '../../services/programCatalogService';

const PRODUCT_COPY = {
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
};

function ProgramLogo({ program }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="catalog-program-logo">
      {program.universityLogo && !failed ? (
        <img src={program.universityLogo} alt="" onError={() => setFailed(true)} />
      ) : (
        <Building2 size={20} />
      )}
    </span>
  );
}

export function SelectedProgramCard({ selection, product, onChange }) {
  const items = getSelectionItems(selection);
  const program = items[0];
  if (!program?.university) {
    return (
      <button type="button" className="catalog-empty-selection" onClick={onChange}>
        <span><GraduationCap size={20} /></span>
        <div>
          <b>{product === 'ai_transfer' ? 'دانشگاه مقصد انتقالی را مشخص کنید' : 'دانشگاه و رشته موردنظر را انتخاب کنید'}</b>
          <small>کاتالوگ آکادو فقط گزینه‌های ترکیه و قبرس شمالی را نمایش می‌دهد.</small>
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
          {getCountryLabel(program.country)} · {program.city || 'شهر مقصد'}
          {extras.length > 0 && <b className="catalog-selected-count">+{extras.length} گزینه دیگر</b>}
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
          {items.length > 1 ? 'ویرایش فهرست' : 'تغییر انتخاب'}
        </button>
        <a href={buildAccaUniversityUrl(program.university)} target="_blank" rel="noreferrer">
          اطلاعات دانشگاه <ExternalLink size={13} />
        </a>
        <a href={buildAccaProgramsUrl(program)} target="_blank" rel="noreferrer">
          مشاهده در آکادو <BookOpen size={13} />
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
  onClose,
  onSelect,
}) {
  const [programs, setPrograms] = useState([]);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('all');
  const [university, setUniversity] = useState(initialUniversity);
  const [language, setLanguage] = useState('');
  const [selectedList, setSelectedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const copy = PRODUCT_COPY[product] || PRODUCT_COPY.smart_apply;

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
    return [...new Set(names)].sort((a, b) => a.localeCompare(b)).slice(0, 180);
  }, [country, programs]);

  const languageOptions = useMemo(() => {
    const langs = programs
      .filter((program) => country === 'all' || program.country === country)
      .filter((program) => !university || program.university === university)
      .map((program) => program.language)
      .filter(Boolean);
    return [...new Set(langs)].sort((a, b) => a.localeCompare(b));
  }, [country, programs, university]);

  const visiblePrograms = useMemo(() => searchCatalogPrograms(programs, {
    query,
    country,
    university,
    language,
  }), [country, programs, query, university, language]);

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
            dir="rtl"
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
              <button type="button" onClick={onClose} aria-label="بستن"><X size={18} /></button>
            </header>

            <div className="catalog-picker-filters">
              <label>
                <Search size={17} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="نام رشته، دانشگاه، شهر یا زبان..."
                  autoFocus
                />
              </label>
              <div className="catalog-country-tabs">
                {[
                  ['all', 'همه'],
                  ['Turkey', 'ترکیه'],
                  ['KKTC', 'قبرس شمالی'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={country === value ? 'is-active' : ''}
                    onClick={() => {
                      setCountry(value);
                      setUniversity('');
                      setLanguage('');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={university}
                onChange={(event) => { setUniversity(event.target.value); setLanguage(''); }}
                aria-label="دانشگاه مقصد"
              >
                <option value="">همه دانشگاه‌ها</option>
                {universityOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="زبان تحصیل">
                <option value="">همه زبان‌ها</option>
                {languageOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className="catalog-picker-meta">
              <span>منبع: کاتالوگ زنده آکادو</span>
              <b>{visiblePrograms.length} گزینه قابل نمایش</b>
            </div>

            <div className="catalog-program-list">
              {loading ? (
                <div className="catalog-picker-state"><LoaderCircle className="account-spin" /> در حال دریافت کاتالوگ...</div>
              ) : error ? (
                <div className="catalog-picker-state is-error">{error}</div>
              ) : visiblePrograms.length ? (
                visiblePrograms.map((program) => {
                  const isSelected = selectedList.some((item) => item.id === program.id);
                  return (
                    <article key={program.id} className={isSelected ? 'is-selected' : ''}>
                      <ProgramLogo program={program} />
                      <button type="button" className="catalog-program-main" onClick={() => toggleProgram(program)}>
                        <span><MapPin size={12} />{getCountryLabel(program.country)} · {program.city}</span>
                        <h3>{program.program}</h3>
                        <p>{program.university}</p>
                        <div>
                          {program.degree && <small>{program.degree}</small>}
                          {program.language && <small>{program.language}</small>}
                          {program.tuitionFee && <small>{program.tuitionFee}</small>}
                        </div>
                      </button>
                      <div className="catalog-program-actions">
                        <a href={buildAccaUniversityUrl(program.university)} target="_blank" rel="noreferrer" title="اطلاعات دانشگاه">
                          <ExternalLink size={15} />
                        </a>
                        <button type="button" onClick={() => toggleProgram(program)} aria-label={isSelected ? 'حذف از فهرست' : 'افزودن به فهرست'}>
                          {isSelected ? <Check size={16} /> : <ArrowUpLeft size={16} />}
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="catalog-picker-state">با این فیلتر گزینه‌ای پیدا نشد.</div>
              )}
            </div>

            <footer className="catalog-picker-footer">
              <div>
                <small>{selectedList.length ? `${selectedList.length} گزینه در فهرست` : 'انتخاب فعلی'}</small>
                {selectedList.length ? (
                  <div className="catalog-selected-chips">
                    {selectedList.map((item) => (
                      <span key={item.id} title={`${item.program} · ${item.university}`}>
                        {item.university}
                        <button type="button" onClick={() => toggleProgram(item)} aria-label="حذف از فهرست">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <b>هنوز انتخاب نشده</b>
                )}
              </div>
              <button type="button" disabled={!selectedList.length || saving} onClick={() => onSelect(selectedList)}>
                {saving ? <LoaderCircle className="account-spin" size={17} /> : <Check size={17} />}
                {saving ? 'در حال ذخیره...' : `${copy.action}${selectedList.length > 1 ? ` (${selectedList.length})` : ''}`}
              </button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
