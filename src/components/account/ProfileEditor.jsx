import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  Edit3,
  KeyRound,
  LoaderCircle,
  Mail,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import {
  requestAccountPasswordReset,
  updateAccountPassword,
  updateProfileDetails,
  uploadAvatar,
} from '../../services/accountService';

const COUNTRY_CODES = [
  { value: '+90', label: 'Turkey +90' },
  { value: '+98', label: 'Iran +98' },
  { value: '+994', label: 'Azerbaijan +994' },
  { value: '+7', label: 'Russia / CIS +7' },
  { value: '+971', label: 'UAE +971' },
  { value: '+966', label: 'Saudi Arabia +966' },
  { value: '+964', label: 'Iraq +964' },
  { value: '+1', label: 'US / Canada +1' },
  { value: '+44', label: 'UK +44' },
  { value: '+49', label: 'Germany +49' },
];

function normalizePhone(value) {
  return String(value || '').replace(/[^\d\s()-]/g, '').replace(/\s+/g, ' ').trim();
}

export default function ProfileEditor({ user, profile, onSaved }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.full_name || '');
  const [phoneCountryCode, setPhoneCountryCode] = useState(profile?.phone_country_code || '+90');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [avatar, setAvatar] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const fileRef = useRef(null);

  const displayName = name.trim() || profile?.full_name || user?.user_metadata?.full_name || 'دانشجوی ACCA';
  const initial = (displayName || user?.email || '?').trim().charAt(0).toUpperCase();
  const cleanPhone = normalizePhone(phoneNumber);
  const profileUnchanged = (
    name.trim() === (profile?.full_name || user?.user_metadata?.full_name || '').trim()
    && phoneCountryCode === (profile?.phone_country_code || '+90')
    && cleanPhone === (profile?.phone_number || '').trim()
  );
  const phoneSummary = cleanPhone ? `${phoneCountryCode} ${cleanPhone}` : 'افزودن شماره تماس';

  const resetMessages = () => {
    setError('');
    setNotice('');
  };

  const savePassword = async () => {
    if (!currentPassword) {
      setError('برای تغییر رمز، رمز فعلی حساب را وارد کنید یا از گزینه ارسال لینک تغییر رمز استفاده کنید.');
      return;
    }
    if (password.length < 8) {
      setError('رمز جدید باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    if (password !== confirmPassword) {
      setError('تکرار رمز جدید با رمز اصلی یکسان نیست.');
      return;
    }

    setSavingPassword(true);
    resetMessages();
    try {
      await updateAccountPassword({
        email: user?.email,
        currentPassword,
        nextPassword: password,
      });
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setNotice('رمز عبور با موفقیت تغییر کرد.');
      window.setTimeout(() => setNotice(''), 2600);
    } catch (err) {
      setError(err?.message || 'تغییر رمز انجام نشد. رمز فعلی را بررسی کنید یا لینک تغییر رمز بگیرید.');
    } finally {
      setSavingPassword(false);
    }
  };

  const sendPasswordReset = async () => {
    setSendingReset(true);
    resetMessages();
    try {
      await requestAccountPasswordReset(user?.email);
      setNotice('لینک امن تغییر رمز به ایمیل حساب شما ارسال شد.');
      window.setTimeout(() => setNotice(''), 3200);
    } catch (err) {
      setError(err?.message || 'ارسال لینک تغییر رمز انجام نشد.');
    } finally {
      setSendingReset(false);
    }
  };

  const pickAvatar = async (file) => {
    if (!file) return;
    setUploading(true);
    resetMessages();
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

  const saveProfile = async () => {
    if (cleanPhone && cleanPhone.replace(/\D/g, '').length < 6) {
      setError('شماره تماس را کامل‌تر وارد کنید یا خالی بگذارید.');
      return;
    }

    setSavingProfile(true);
    resetMessages();
    try {
      await updateProfileDetails(user, {
        fullName: name,
        phoneCountryCode,
        phoneNumber: cleanPhone,
      });
      setPhoneNumber(cleanPhone);
      setNotice('مشخصات پروفایل ذخیره شد.');
      onSaved?.();
      window.setTimeout(() => setNotice(''), 2200);
    } catch (err) {
      setError(err?.message || 'ذخیره مشخصات انجام نشد.');
    } finally {
      setSavingProfile(false);
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
          <div><small>شماره تماس</small><b dir="ltr">{phoneSummary}</b></div>
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
                  <p>اطلاعات تماس و امنیت حساب مرکزی خود را مدیریت کنید.</p>
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
                  <div className="account-profile-phone">
                    <label>
                      <span>کد کشور</span>
                      <select
                        className="account-profile-input"
                        value={phoneCountryCode}
                        onChange={(event) => setPhoneCountryCode(event.target.value)}
                      >
                        {COUNTRY_CODES.map((country) => (
                          <option key={country.value} value={country.value}>{country.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>شماره تلفن</span>
                      <input
                        className="account-profile-input"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(normalizePhone(event.target.value))}
                        placeholder="535 000 00 00"
                        inputMode="tel"
                        autoComplete="tel-national"
                        dir="ltr"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="account-profile-save"
                    onClick={saveProfile}
                    disabled={savingProfile || profileUnchanged}
                  >
                    {savingProfile ? <LoaderCircle className="account-spin" size={16} /> : <Check size={16} />}
                    ذخیره مشخصات
                  </button>
                </div>
              </div>

              <div className="account-profile-security">
                <div>
                  <b>امنیت ورود</b>
                  <span>اگر رمز فعلی را می‌دانید، همین‌جا رمز جدید تنظیم کنید. اگر مطمئن نیستید، لینک امن تغییر رمز را از ایمیل دریافت کنید.</span>
                </div>
                <div className="account-profile-password-grid">
                  <label className="account-profile-pass">
                    <KeyRound size={15} />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="رمز فعلی"
                      autoComplete="current-password"
                      dir="ltr"
                    />
                  </label>
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
                </div>
                <div className="account-profile-security-actions">
                  <button
                    type="button"
                    className="account-profile-pass-save"
                    onClick={savePassword}
                    disabled={savingPassword || !currentPassword || password.length < 8 || confirmPassword.length < 8}
                  >
                    {savingPassword ? <LoaderCircle className="account-spin" size={15} /> : <KeyRound size={15} />}
                    تغییر رمز
                  </button>
                  <button
                    type="button"
                    className="account-profile-reset-link"
                    onClick={sendPasswordReset}
                    disabled={sendingReset}
                  >
                    {sendingReset ? <LoaderCircle className="account-spin" size={15} /> : <RotateCcw size={15} />}
                    ارسال لینک تغییر رمز
                  </button>
                </div>
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
