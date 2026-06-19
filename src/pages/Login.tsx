import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Languages } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { Disclaimer } from '@/components/Disclaimer';

export default function Login() {
  const { t } = useTranslation();
  const { toggleLocale, locale } = useLocale();
  const { signIn, signUp, resetPassword, usingSupabase } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    const res =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    else navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-slate-900 to-slate-950 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold">{t('appName')}</div>
            <div className="text-xs text-slate-400">{t('appTagline')}</div>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight">{t('login.subtitle')}</h1>
          <p className="mt-4 text-sm text-slate-400">
            20 specialized AI agents monitor news, geopolitics, macro, assets,
            growth, valuation, smart money and risk — surfacing urgent
            high-conviction opportunities with full reasoning.
          </p>
        </div>
        <div className="max-w-md">
          <Disclaimer compact />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">{t('appName')}</span>
            </div>
            <button className="btn-ghost ms-auto !px-2.5" onClick={toggleLocale}>
              <Languages className="h-4 w-4" />
              <span className="text-xs">{locale === 'en' ? 'العربية' : 'EN'}</span>
            </button>
          </div>

          <h2 className="text-xl font-semibold">
            {mode === 'signin' ? t('login.title') : t('login.createTitle')}
          </h2>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                {t('login.email')}
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                {t('login.password')}
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {info && <p className="text-sm text-emerald-400">{info}</p>}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {mode === 'signin' ? t('login.signIn') : t('login.signUp')}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              className="text-slate-400 hover:text-slate-200"
              onClick={async () => {
                if (!email) {
                  setError(t('login.email'));
                  return;
                }
                await resetPassword(email);
                setInfo(t('login.resetSent'));
              }}
            >
              {t('login.forgot')}
            </button>
            <button
              className="text-brand-400 hover:underline"
              onClick={() => {
                setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                setError('');
              }}
            >
              {mode === 'signin' ? t('login.signUp') : t('login.signIn')}
            </button>
          </div>

          {!usingSupabase && (
            <p className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
              {t('login.demoNote')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
