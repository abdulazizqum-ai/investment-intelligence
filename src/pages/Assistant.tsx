import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, ArrowRight, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill } from '@/components/ui';
import { Disclaimer } from '@/components/Disclaimer';
import { recColor } from '@/lib/format';
import type { Bilingual } from '@/types';

interface Answer {
  routedAgentId?: string;
  routedAgentName?: Bilingual;
  agentAnalysis?: Bilingual;
  cioVerdict?: 'approved' | 'revised' | 'rejected';
  cioNote?: Bilingual;
  recommendation?: string;
  confidence?: number;
  risk?: number;
  answer?: Bilingual;
}
interface Msg {
  role: 'user' | 'assistant';
  text?: string;
  data?: Answer;
  error?: string;
}

export default function Assistant() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scroll = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    scroll();
    try {
      const res = await fetch('/.netlify/functions/ask?q=' + encodeURIComponent(q));
      const text = await res.text();
      const s = text.indexOf('{');
      const e = text.lastIndexOf('}');
      const data = s >= 0 && e >= 0 ? (JSON.parse(text.slice(s, e + 1)) as Answer) : null;
      if (data?.answer) setMessages((m) => [...m, { role: 'assistant', data }]);
      else setMessages((m) => [...m, { role: 'assistant', error: 'No answer (the assistant may be warming up — try again).' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', error: 'Request failed. Try again.' }]);
    } finally {
      setBusy(false);
      scroll();
    }
  }

  const verdictPill = (v?: string) => {
    if (v === 'approved') return { cls: 'bg-emerald-500/15 text-emerald-400', Icon: CheckCircle2, label: t('assistant.verdict_approved') };
    if (v === 'rejected') return { cls: 'bg-red-500/15 text-red-400', Icon: XCircle, label: t('assistant.verdict_rejected') };
    return { cls: 'bg-amber-500/15 text-amber-400', Icon: Pencil, label: t('assistant.verdict_revised') };
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader title={t('assistant.title')} subtitle={t('assistant.subtitle')} />

      <div className="flex-1 space-y-4 overflow-y-auto pe-1">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
            {t('assistant.empty')}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="flex max-w-[80%] items-start gap-2 rounded-2xl rounded-se-sm bg-brand-600/20 px-4 py-2.5 text-sm text-slate-100">
                <span>{m.text}</span>
                <User className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="flex w-full max-w-[92%] gap-2">
                <Bot className="mt-1 h-5 w-5 shrink-0 text-brand-400" />
                {m.error ? (
                  <Card className="!border-red-500/30 text-sm text-red-300">{m.error}</Card>
                ) : (
                  <Card className="w-full space-y-3">
                    {/* routing chain */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Pill className="bg-slate-700/40 text-slate-300">Inquiry Agent</Pill>
                      <ArrowRight className="h-3 w-3 text-slate-600 rtl:rotate-180" />
                      <Pill className="bg-brand-600/15 text-brand-300">
                        {t('assistant.routedTo')}: {m.data?.routedAgentName ? t2(m.data.routedAgentName) : m.data?.routedAgentId}
                      </Pill>
                      <ArrowRight className="h-3 w-3 text-slate-600 rtl:rotate-180" />
                      {(() => {
                        const v = verdictPill(m.data?.cioVerdict);
                        return (
                          <Pill className={v.cls}>
                            <v.Icon className="h-3 w-3" /> {t('assistant.cio')}: {v.label}
                          </Pill>
                        );
                      })()}
                    </div>

                    {/* agent analysis */}
                    {m.data?.agentAnalysis && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t('assistant.analysis')}
                        </div>
                        <p className="mt-1 text-sm text-slate-300">{t2(m.data.agentAnalysis)}</p>
                      </div>
                    )}

                    {/* cio note */}
                    {m.data?.cioNote && (
                      <p className="text-xs text-slate-400">
                        <span className="font-medium text-slate-300">{t('assistant.cio')}: </span>
                        {t2(m.data.cioNote)}
                      </p>
                    )}

                    {/* final answer */}
                    <div className="rounded-lg bg-slate-800/50 p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t('assistant.answer')}
                        </span>
                        {m.data?.recommendation && m.data.recommendation !== 'n/a' && (
                          <Pill className={recColor(m.data.recommendation as any)}>
                            {t(`rec.${m.data.recommendation}`)}
                          </Pill>
                        )}
                        {typeof m.data?.confidence === 'number' && (
                          <span className="text-[11px] text-slate-400">
                            {t('common.confidence')} {m.data.confidence} · {t('common.risk')} {m.data.risk}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-100">{m.data?.answer ? t2(m.data.answer) : ''}</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Bot className="h-4 w-4 animate-pulse text-brand-400" /> {t('assistant.thinking')}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3">
        <Disclaimer compact />
        <div className="mt-2 flex gap-2">
          <input
            className="input"
            placeholder={t('assistant.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={busy}
          />
          <button className="btn-primary" onClick={send} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" /> {t('assistant.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
