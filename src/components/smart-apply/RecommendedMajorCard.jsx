// One recommended major: icon, name, match badge, short "why".
// `detailed` adds the deep-profile lines: personality fit, academic fit and
// the honest admission-reality note (used inside the discovery result).
import { motion } from 'framer-motion';
import { HeartHandshake, GraduationCap, ShieldCheck, Building2 } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { renderIcon } from '../../lib/icons';
import { getMajor } from '../../data/mockPrograms';
import { buildAccaProgramsUrl } from '../../services/programCatalogService';

const SHOW_PROGRAMS_LABEL = {
  fa: 'نمایش دانشگاه‌ها و شهریه‌ها',
  en: 'Show universities & tuition',
  tr: 'Üniversite ve ücretleri gör',
  ar: 'عرض الجامعات والرسوم',
};

function FitLine({ icon: Icon, label, text }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" strokeWidth={2.3} />
      <p className="text-[11px] font-semibold leading-5 text-navy/65">
        <span className="font-black text-navy/80">{label}: </span>
        {text}
      </p>
    </div>
  );
}

export default function RecommendedMajorCard({ majorId, match, lang, index = 0, detailed = false }) {
  const major = getMajor(majorId);
  if (!major) return null;
  const pct = lang === 'fa' || lang === 'ar' ? '٪' : '%';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.3, ease: 'easeOut' }}
      className="rounded-[20px] border border-white/80 bg-white/70 p-3.5 shadow-[0_8px_26px_rgba(7,26,61,0.05)] backdrop-blur-md transition-shadow hover:shadow-[0_12px_34px_rgba(198,167,104,0.18)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/15 via-white to-gold/25 text-navy shadow-inner">
          {renderIcon(major.icon, { className: 'h-5 w-5', strokeWidth: 2.2 })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-black text-navy">{L(major.name, lang)}</h4>
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-black text-[#8a6c33]">
              {match}{pct} {L(UI.matchLabel, lang)}
            </span>
          </div>
          {!detailed && (
            <p className="mt-1 text-xs font-semibold leading-6 text-navy/60">{L(major.reason, lang)}</p>
          )}
        </div>
      </div>

      {detailed && (
        <div className="mt-3 space-y-1.5 border-t border-navy/[0.05] pt-3">
          <FitLine icon={HeartHandshake} label={L(UI.personalityFitLabel, lang)} text={L(major.personalityFit, lang)} />
          <FitLine icon={GraduationCap} label={L(UI.academicFitLabel, lang)} text={L(major.academicFit, lang)} />
          <FitLine icon={ShieldCheck} label={L(UI.admissionNoteLabel, lang)} text={L(major.admissionNote, lang)} />
        </div>
      )}

      <a
        href={buildAccaProgramsUrl({ program: L(major.name, 'en') || L(major.name, lang) })}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-navy px-3 py-2.5 text-[11px] font-black text-cream transition hover:brightness-110"
      >
        <Building2 className="h-3.5 w-3.5 text-gold" />
        {L(SHOW_PROGRAMS_LABEL, lang)}
      </a>
    </motion.div>
  );
}
