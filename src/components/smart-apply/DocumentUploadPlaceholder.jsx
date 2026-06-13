import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileUp, LoaderCircle, ShieldCheck, Lock } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { getIcon } from '../../lib/icons';
import { REQUIRED_DOCUMENTS } from '../../data/mockAdmissionRules';
import { useSmartApplyStore } from '../../store/smartApplyStore';
import { listAccountData, uploadStudentDocument } from '../../services/accountService';

const DOC_CARDS = [
  { id: 'passport', icon: 'Globe2', label: UI.docPassport },
  { id: 'diploma', icon: 'GraduationCap', label: UI.docDiploma },
  { id: 'transcript', icon: 'FileText', label: UI.docTranscript },
  { id: 'photo', icon: 'UserRound', label: UI.docPhoto },
  { id: 'language', icon: 'Languages', label: UI.docLanguage },
];

export default function DocumentUploadPlaceholder({ degree = 'bachelor', lang, compact = false }) {
  const isAuthenticated = useSmartApplyStore((s) => s.isAuthenticated);
  const user = useSmartApplyStore((s) => s.user);
  const required = REQUIRED_DOCUMENTS[degree] || REQUIRED_DOCUMENTS.bachelor;
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!user) return;
    try {
      const result = await listAccountData(user.id, 'smart_apply');
      setDocuments(result.documents);
    } catch {
      setError(lang === 'fa' ? 'دریافت فهرست مدارک انجام نشد.' : 'Could not load documents.');
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await listAccountData(user.id, 'smart_apply');
        if (!cancelled) setDocuments(result.documents);
      } catch {
        if (!cancelled) setError(lang === 'fa' ? 'دریافت فهرست مدارک انجام نشد.' : 'Could not load documents.');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, lang]);

  const upload = async (kind, file) => {
    if (!user || !file) return;
    setUploading(kind);
    setError('');
    try {
      await uploadStudentDocument({ user, product: 'smart_apply', kind, file });
      await refresh();
    } catch (err) {
      setError(err?.message || (lang === 'fa' ? 'آپلود انجام نشد.' : 'Upload failed.'));
    } finally {
      setUploading(null);
    }
  };

  return (
    <div>
      <div className={`grid gap-2.5 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {DOC_CARDS.filter((d) => required.includes(d.id) || !compact).map((doc, i) => {
          const Icon = getIcon(doc.icon);
          const uploaded = documents.find((item) => item.document_kind === doc.id);
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.06, duration: 0.28 }}
              className="group rounded-[20px] border border-dashed border-navy/15 bg-white/60 p-4 backdrop-blur-md transition-colors hover:border-gold/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/[0.05] text-navy">
                  <Icon className="h-5 w-5" strokeWidth={2.1} />
                </span>
                <div className="min-w-0">
                  <h4 className="truncate text-[13px] font-black text-navy">{L(doc.label, lang)}</h4>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-navy/45">
                    <FileUp className="h-3 w-3" />
                    {uploaded ? uploaded.original_name : L(UI.docStatusEmpty, lang)}
                  </p>
                </div>
              </div>
              <p className={`mt-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${
                isAuthenticated ? 'bg-emerald-600/10 text-emerald-800' : 'bg-gold/10 text-[#8a6c33]'
              }`}>
                {uploaded ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : isAuthenticated ? <ShieldCheck className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
                {uploaded ? (lang === 'fa' ? 'با موفقیت ذخیره شد' : 'Securely uploaded') : isAuthenticated ? L(UI.docStatusAiReady, lang) : L(UI.docStatusLoginRequired, lang)}
              </p>
              {isAuthenticated && (
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 py-2 text-[10px] font-black text-navy transition hover:border-gold/50">
                  {uploading === doc.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                  {uploading === doc.id
                    ? (lang === 'fa' ? 'در حال آپلود...' : 'Uploading...')
                    : uploaded
                      ? (lang === 'fa' ? 'جایگزینی فایل' : 'Replace file')
                      : (lang === 'fa' ? 'انتخاب فایل' : 'Choose file')}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={Boolean(uploading)}
                    onChange={(event) => upload(doc.id, event.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
              )}
            </motion.div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-[11px] font-bold text-rose-600">{error}</p>}
      <p className="mt-3 text-[11px] font-semibold leading-6 text-navy/50">{L(UI.docsNote, lang)}</p>
    </div>
  );
}
