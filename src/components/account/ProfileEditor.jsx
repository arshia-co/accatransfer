import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  Edit3,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { updateAccountPassword, updateProfileDetails, uploadAvatar } from '../../services/accountService';

export default function ProfileEditor({ user, profile, onSaved }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.full_name || '');
  const [avatar, setAvatar] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const fileRef = useRef(null);

  const displayName = name.trim() || profile?.full_name || user?.user_metadata?.full_name || 'دانشجوی ACCA';
  const initial = (displayName || user?.email || '?').trim().charAt(0).toUpperCase();
  const nameUnchanged = name.trim() === (profile?.full_name || user?.user_metadata?.full_name || '').trim();

  const savePassword = async () => {
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    if (password !== confirmPassword) {
      setError('تکرار رمز عبور با رمز اصلی یکسان نیست.');
      return;
    }

    setSavingPassword(true);
    setError('');
    setNotice('');
    try {
      await updateAccountPassword(password);
      setPassword('');
      setConfirmPassword('');
      setNotice('رمز عبور با موفقیت تغییر کرد.');
      window.setTimeout(() => setNotice(''), 2600);
    } catch (err) {
      setError(err?.message || 'تنظیم رمز انجام نشد.');
    } finally {
      setSavingPassword(false);
    }
  };

  const pickAvatar = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const url = await uploadAvatar(user, file);
      setAvatar(`${url}?t=${Date.now()}`);
      setNotice('عکس پروفایل به‌روزرسانی شد.');
      onSaved?.();
      window.setTimeout(() => setNotice(''), 2400);
    } catch (err) {
      setError(err?.message || 'آپلود عکس انجام نشد.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveName = async () => {
    setSavingName(true);
    setError('');
    setNotice('');
    try {
      await updateProfileDetails(user, { fullName: name });
      setNotice('مشخصات پروفایل ذخیره شد.');
      onSaved?.();
      window.setTimeout(() => setNotice(''), 2200);
    } catch (err) {
      setError(err?.message || 'ذخیره نام انجام نشد.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <>
      <section className="account-profile-editor">
        <div className="account-profile-summary-main">
          <div className="account-profile-avatar is-summary">
            {avatar ? <img src={avatar} alt="" /> : <span className="account-profile-initial">{initial}</span>}
          </div>
          <div className="account-profile-summary-copy">
            <span className="account-kicker">Central Profile</span>
            <h2>{displayName}</h2>
            <p>
              <Mail size={14} />
              <span dir="ltr">{user?.email}</span>
            </p>
          </div>
          <div className="account-profile-state">
            <span><ShieldCheck size={15} /> حساب فعال</span>
            <button type="button" onClick={() => setOpen(true)}>
              <Edit3 size={15} /> تغییر مشخصات
            </button>
          </div>
        </div>
        <div className="account-profile-summary-grid">
          <div><small>ورود</small><b>رمز عبور یا کد ایمیل</b></div>
          <div><small>حریم خصوصی</small><b>داده‌ها فقط برای همین حساب</b></div>
          <div><small>پروفایل</small><b>{profile?.full_name ? 'تکمیل شده' : 'نیازمند تکمیل نام'}</b></div>
        </div>
      </section>

      <AnimatePresence>
        {open && (
          <motion.div
            className="account-profile-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.section
              dir="rtl"
              role="dialog"
              aria-modal="true"
              className="account-profile-modal"
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="account-profile-modal-close" onClick={() => setOpen(false)} aria-label="بستن">
                <X size={17} />
              </button>

              <div className="account-profile-modal-head">
                <span><UserRound size={20} /></span>
                <div>
                  <small>Profile Settings</small>
                  <h3>ویرایش مشخصات حساب</h3>
                  <p>نام، عکس پروفایل و رمز عبور حساب مرکزی خود را مدیریت کنید.</p>
                </div>
              </div>

              <div className="account-profile-modal-grid">
                <div className="account-profile-photo-block">
                  <button
                    type="button"
                    className="account-profile-avatar is-editable"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label="تغییر عکس پروفایل"
                  >
                    {avatar ? <img src={avatar} alt="" /> : <span className="account-profile-initial">{initial}</span>}
                    <span className="account-profile-cam">
                      {uploading ? <LoaderCircle className="account-spin" size={14} /> : <Camera size={14} />}
                    </span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => pickAvatar(event.target.files?.[0])}
                  />
                  <small>JPG یا PNG کمتر از ۴ مگابایت</small>
                </div>

                <div className="account-profile-fields">
                  <label>
                    <span>نام و نام خانوادگی</span>
                    <input
                      className="account-profile-input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="نام کامل شما"
                      maxLength={80}
                    />
                  </label>
                  <label>
                    <span>ایمیل حساب</span>
                    <input
                      className="account-profile-input"
                      value={user?.email || ''}
                      readOnly
                      dir="ltr"
                    />
                  </label>
                  <button
                    type="button"
                    className="account-profile-save"
                    onClick={saveName}
                    disabled={savingName || nameUnchanged}
                  >
                    {savingName ? <LoaderCircle className="account-spin" size={16} /> : <Check size={16} />}
                    ذخیره مشخصات
                  </button>
                </div>
              </div>

              <div className="account-profile-security">
                <div>
                  <b>امنیت ورود</b>
                  <span>برای ورود سریع‌تر، رمز عبور اختصاصی تنظیم یا تغییر دهید.</span>
                </div>
                <label className="account-profile-pass">
                  <KeyRound size={15} />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="رمز جدید، حداقل ۸ کاراکتر"
                    autoComplete="new-password"
                    minLength={8}
                    dir="ltr"
                  />
                </label>
                <label className="account-profile-pass">
                  <KeyRound size={15} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="تکرار رمز جدید"
                    autoComplete="new-password"
                    minLength={8}
                    dir="ltr"
                  />
                </label>
                <button
                  type="button"
                  className="account-profile-pass-save"
                  onClick={savePassword}
                  disabled={savingPassword || password.length < 8 || confirmPassword.length < 8}
                >
                  {savingPassword ? <LoaderCircle className="account-spin" size={15} /> : <KeyRound size={15} />}
                  تغییر رمز
                </button>
                <small>
                  ایمیل‌های امنیتی تغییر رمز از تنظیمات Supabase Auth ارسال می‌شوند؛ اعلان‌های سفارشی مثل تغییر عکس به Edge Function ایمیل نیاز دارند.
                </small>
              </div>

              {notice && <p className="account-profile-notice">{notice}</p>}
              {error && <p className="account-profile-error">{error}</p>}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
