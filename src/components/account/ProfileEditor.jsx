import { useRef, useState } from 'react';
import { Camera, Check, KeyRound, LoaderCircle } from 'lucide-react';
import { updateAccountPassword, updateProfileDetails, uploadAvatar } from '../../services/accountService';

export default function ProfileEditor({ user, profile, onSaved }) {
  const [name, setName] = useState(profile?.full_name || '');
  const [avatar, setAvatar] = useState(profile?.avatar_url || '');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [savedName, setSavedName] = useState(false);
  const [password, setPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const fileRef = useRef(null);

  const savePassword = async () => {
    setSavingPassword(true);
    setError('');
    setSavedPassword(false);
    try {
      await updateAccountPassword(password);
      setPassword('');
      setSavedPassword(true);
      window.setTimeout(() => setSavedPassword(false), 2500);
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
    try {
      const url = await uploadAvatar(user, file);
      setAvatar(`${url}?t=${Date.now()}`); // cache-bust so the new photo shows
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'آپلود عکس انجام نشد.');
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    setSavingName(true);
    setError('');
    setSavedName(false);
    try {
      await updateProfileDetails(user, { fullName: name });
      setSavedName(true);
      onSaved?.();
      window.setTimeout(() => setSavedName(false), 2000);
    } catch (err) {
      setError(err?.message || 'ذخیره نام انجام نشد.');
    } finally {
      setSavingName(false);
    }
  };

  const initial = (name || user?.email || '?').trim().charAt(0).toUpperCase();
  const nameUnchanged = name.trim() === (profile?.full_name || '').trim();

  return (
    <section className="account-profile-editor">
      <div className="account-profile-row">
      <div className="account-profile-avatar">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="تغییر عکس پروفایل"
        >
          {avatar
            ? <img src={avatar} alt="" />
            : <span className="account-profile-initial">{initial}</span>}
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
      </div>

      <div className="account-profile-fields">
        <span className="account-profile-label">نام و نام خانوادگی</span>
        <input
          className="account-profile-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="نام کامل شما"
          maxLength={80}
        />
        <span className="account-profile-email" dir="ltr">{user?.email}</span>
        {error && <span className="account-profile-error">{error}</span>}
      </div>

      <button
        type="button"
        className="account-profile-save"
        onClick={saveName}
        disabled={savingName || nameUnchanged}
      >
        {savingName ? <LoaderCircle className="account-spin" size={16} /> : <Check size={16} />}
        {savedName ? 'ذخیره شد' : 'ذخیره'}
      </button>
      </div>

      <div className="account-profile-security">
        <label className="account-profile-pass">
          <KeyRound size={15} />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="تنظیم رمز عبور برای ورود (حداقل ۸ کاراکتر)"
            autoComplete="new-password"
            minLength={8}
          />
        </label>
        <button
          type="button"
          className="account-profile-pass-save"
          onClick={savePassword}
          disabled={savingPassword || password.length < 8}
        >
          {savingPassword ? <LoaderCircle className="account-spin" size={15} /> : <KeyRound size={15} />}
          {savedPassword ? 'رمز تنظیم شد' : 'تنظیم رمز'}
        </button>
      </div>
    </section>
  );
}
