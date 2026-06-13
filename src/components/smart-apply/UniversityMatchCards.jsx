// Matching program/university cards shown inside the conversation after the
// admission funnel. Data comes from mock programs — backend will replace it.
import { motion } from 'framer-motion';
import { MapPin, BadgePercent, Languages } from 'lucide-react';
import { L } from '../../lib/lang';
import { getIcon } from '../../lib/icons';
import { MOCK_PROGRAMS, getMajor } from '../../data/mockPrograms';
import { getUniversity } from '../../data/mockUniversities';

const SCHOLARSHIP_HINT = {
  fa: 'بورسیه‌پذیر',
  en: 'Scholarship-friendly',
  tr: 'Burs dostu',
  ar: 'مناسب للمنح',
};

const PER_YEAR = { fa: 'در سال', en: '/ year', tr: '/ yıl', ar: 'سنوياً' };

export default function UniversityMatchCards({ programIds = [], lang }) {
  const programs = programIds
    .map((id) => MOCK_PROGRAMS.find((p) => p.id === id))
    .filter(Boolean);

  if (!programs.length) return null;

  return (
    <div className="grid gap-2.5">
      {programs.map((program, i) => {
        const university = getUniversity(program.universityId);
        const major = getMajor(program.majorId);
        const MajorIcon = getIcon(major?.icon);
        const initials = L(university?.name, 'en')
          .split(' ')
          .filter((w) => w[0] === w[0]?.toUpperCase())
          .slice(0, 2)
          .map((w) => w[0])
          .join('');
        return (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.08, duration: 0.3 }}
            className="flex items-center gap-3.5 rounded-[20px] border border-white/80 bg-white/75 p-4 shadow-[0_10px_30px_rgba(7,26,61,0.06)] backdrop-blur-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-black text-gold shadow-[0_8px_22px_rgba(7,26,61,0.3)]">
              {initials || 'U'}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-black text-navy">{L(university?.name, lang)}</h4>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-navy/55">
                <span className="inline-flex items-center gap-1">
                  <MajorIcon className="h-3.5 w-3.5 text-emerald-700" />
                  {L(major?.name, lang)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Languages className="h-3.5 w-3.5 text-navy/40" />
                  {program.language}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-navy/40" />
                  {university?.city}
                </span>
              </p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-sm font-black text-emerald-700">
                ${program.tuitionUSD.toLocaleString('en-US')}
              </p>
              <p className="text-[10px] font-bold text-navy/45">{L(PER_YEAR, lang)}</p>
              {university?.scholarshipFriendly && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-black text-[#8a6c33]">
                  <BadgePercent className="h-3 w-3" />
                  {L(SCHOLARSHIP_HINT, lang)}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
