import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Send, MessageCircle } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, SectionCard, Pill } from '@/components/ui';
import { Disclaimer } from '@/components/Disclaimer';
import type { Locale } from '@/types';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${
        checked ? 'bg-brand-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? 'start-[22px]' : 'start-0.5'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { user } = useAuth();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegram, setTelegram] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [riskPref, setRiskPref] = useState('moderate');
  const [horizon, setHorizon] = useState('medium_term');
  const [savedMsg, setSavedMsg] = useState('');

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.settings')} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Profile */}
        <SectionCard title={t('settings.profile')}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                {t('login.email')}
              </label>
              <input className="input" value={user?.email ?? ''} readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Full name</label>
              <input className="input" placeholder="Your name" />
            </div>
          </div>
        </SectionCard>

        {/* Language */}
        <SectionCard title={t('settings.language')}>
          <div className="flex gap-2">
            {(['en', 'ar'] as Locale[]).map((l) => (
              <button
                key={l}
                className={l === locale ? 'btn-primary flex-1' : 'btn-ghost flex-1'}
                onClick={() => setLocale(l)}
              >
                {l === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            UI direction switches to RTL automatically for Arabic.
          </p>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title={t('settings.notifications')}>
          <div className="space-y-4">
            <Row
              icon={<Mail className="h-4 w-4 text-brand-400" />}
              label={t('settings.emailAlerts')}
            >
              <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
            </Row>
            <Row
              icon={<Send className="h-4 w-4 text-sky-400" />}
              label={t('settings.telegram')}
              badge={t('settings.comingSoon')}
            >
              <Toggle checked={telegram} onChange={setTelegram} disabled />
            </Row>
            <Row
              icon={<MessageCircle className="h-4 w-4 text-emerald-400" />}
              label={t('settings.whatsapp')}
              badge={t('settings.comingSoon')}
            >
              <Toggle checked={whatsapp} onChange={setWhatsapp} disabled />
            </Row>
          </div>
        </SectionCard>

        {/* Preferences */}
        <SectionCard title={`${t('settings.riskPref')} & ${t('settings.horizon')}`}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                {t('settings.riskPref')}
              </label>
              <select
                className="input"
                value={riskPref}
                onChange={(e) => setRiskPref(e.target.value)}
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                {t('settings.horizon')}
              </label>
              <select
                className="input"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
              >
                <option value="short_term">{t('horizon.short_term')}</option>
                <option value="medium_term">{t('horizon.medium_term')}</option>
                <option value="long_term">{t('horizon.long_term')}</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* API keys */}
        <SectionCard title={t('settings.apiKeys')}>
          <div className="space-y-3">
            {['OpenAI / LLM', 'News API', 'Market Data API', 'Financial Data API'].map(
              (k) => (
                <div key={k}>
                  <label className="mb-1 block text-sm text-slate-400">{k}</label>
                  <input
                    className="input"
                    type="password"
                    placeholder={t('settings.placeholderKey')}
                  />
                </div>
              ),
            )}
            <p className="text-xs text-slate-500">
              Keys are placeholders in the MVP and are not transmitted anywhere.
            </p>
          </div>
        </SectionCard>

        {/* Data sources */}
        <SectionCard title={t('settings.dataSources')}>
          <div className="flex flex-wrap gap-2">
            {['Reuters', 'Bloomberg', 'BLS', 'SEC EDGAR', 'EIA', 'OPEC', 'CME FedWatch'].map(
              (s) => (
                <Pill key={s} className="bg-slate-700/40 text-slate-300">
                  {s}
                </Pill>
              ),
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Connect real providers via API keys above; the engine currently runs on
            simulated data.
          </p>
        </SectionCard>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          onClick={() => {
            setSavedMsg(t('settings.saved'));
            setTimeout(() => setSavedMsg(''), 2500);
          }}
        >
          {t('settings.save')}
        </button>
        {savedMsg && <span className="text-sm text-emerald-400">{savedMsg}</span>}
      </div>

      <Disclaimer />
    </div>
  );
}

function Row({
  icon,
  label,
  badge,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-slate-200">{label}</span>
        {badge && (
          <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
