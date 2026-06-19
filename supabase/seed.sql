-- =============================================================================
-- Seed data — mirrors src/data/mockData.ts so the Supabase-backed app shows the
-- same demonstration scenarios. Run AFTER 0001_init.sql.
-- (Timestamps use now() offsets so data always looks fresh.)
-- =============================================================================

-- News -----------------------------------------------------------------------
insert into public.news_events (id, headline, summary, category, source, published_at, importance_score, is_market_moving, affected_assets, analyzed_by) values
('news-ai-contract',
 '{"en":"Hyperscaler signs multi-year AI compute contract reportedly worth $11B","ar":"شركة سحابية كبرى توقّع عقد حوسبة ذكاء اصطناعي بقيمة 11 مليار دولار"}',
 '{"en":"A top cloud provider locked in a multi-year accelerator supply deal.","ar":"أبرم مزود سحابي كبير صفقة توريد مسرّعات لعدة سنوات."}',
 'technology','Reuters', now() - interval '35 minutes', 92, true,
 '["stock","index"]', '["global_news","equity","growth","smart_money","urgent_alert"]'),
('news-strait-tension',
 '{"en":"Naval incident raises shipping risk near a key oil chokepoint","ar":"حادث بحري يرفع مخاطر الشحن قرب ممر نفطي رئيسي"}',
 '{"en":"Escalation threatens a fifth of seaborne crude flows.","ar":"تصعيد يهدد خُمس تدفقات النفط البحرية."}',
 'geopolitical','Bloomberg', now() - interval '90 minutes', 88, true,
 '["energy","metal","currency","stock","agriculture"]', '["global_news","geopolitical","market_causality","energy","metals","currency"]'),
('news-cpi-hot',
 '{"en":"US CPI comes in hotter than expected at 3.6% YoY","ar":"التضخم الأمريكي أعلى من المتوقع عند 3.6%"}',
 '{"en":"Core inflation surprised higher, pushing back rate-cut bets.","ar":"فاجأ التضخم الأساسي بالارتفاع وأجّل رهانات خفض الفائدة."}',
 'economic','BLS / WSJ', now() - interval '1 day', 84, true,
 '["index","metal","currency","stock"]', '["global_news","macro","rates_bonds","metals","currency","equity"]'),
('news-quantum-grant',
 '{"en":"Quantum sensing startup wins national lab partnership","ar":"شركة استشعار كمّي ناشئة تفوز بشراكة مختبر وطني"}',
 '{"en":"A little-followed quantum company secured a government partnership.","ar":"شركة كمّية قليلة المتابعة حصلت على شراكة حكومية."}',
 'technology','TechCrunch', now() - interval '5 hours', 61, false,
 '["stock"]', '["emerging_companies","growth","smart_money"]'),
('news-biotech-trial',
 '{"en":"Micro-cap biotech reports mixed Phase 2 trial data","ar":"شركة تقنية حيوية صغيرة تعلن نتائج مختلطة للمرحلة الثانية"}',
 '{"en":"Ambiguous endpoints and thin cash runway raise binary risk.","ar":"نقاط نهاية غامضة وسيولة محدودة ترفع المخاطر الثنائية."}',
 'company','BioPharma Dive', now() - interval '10 hours', 47, false,
 '["stock"]', '["financial_analyst","risk","valuation"]')
on conflict (id) do nothing;

-- Market events --------------------------------------------------------------
insert into public.market_events (id, title, description, category, occurred_at, importance_score, surprise, affected_assets, related_news_id, causality_chain_id) values
('evt-strait','{"en":"Shipping disruption risk at key oil chokepoint","ar":"خطر تعطّل الشحن في ممر نفطي رئيسي"}',
 '{"en":"Naval incident escalates geopolitical risk.","ar":"حادث بحري يصعّد المخاطر الجيوسياسية."}',
 'geopolitical', now() - interval '90 minutes', 88, true, '["energy","metal","currency","stock","agriculture"]','news-strait-tension','chain-strait'),
('evt-cpi','{"en":"US inflation surprises to the upside","ar":"التضخم الأمريكي يفاجئ بالصعود"}',
 '{"en":"Hotter CPI shifts the rates path hawkish.","ar":"تضخم أعلى يدفع مسار الفائدة للتشدد."}',
 'economic', now() - interval '1 day', 84, true, '["index","metal","currency","stock"]','news-cpi-hot','chain-cpi')
on conflict (id) do nothing;

-- Causality chains -----------------------------------------------------------
insert into public.causality_chains (id, event_id, cause, chain, direct_impact, second_order_impact, third_order_impact, beneficiaries, losers, affected_assets, time_horizon, urgency_level, trade_opportunity_probability) values
('chain-strait','evt-strait',
 '{"en":"Geopolitical escalation threatens crude transit.","ar":"تصعيد جيوسياسي يهدد عبور النفط."}',
 '[{"label":{"en":"Geopolitical shock","ar":"صدمة جيوسياسية"},"direction":"up"},{"label":{"en":"Crude prices","ar":"أسعار النفط"},"direction":"up"},{"label":{"en":"Gold demand","ar":"الطلب على الذهب"},"direction":"up"},{"label":{"en":"Defense & energy equities","ar":"أسهم الدفاع والطاقة"},"direction":"up"},{"label":{"en":"Airlines","ar":"الطيران"},"direction":"down"}]',
 '{"en":"Crude and gas spike on supply fears.","ar":"ارتفاع النفط والغاز بفعل مخاوف الإمداد."}',
 '{"en":"Energy costs lift inflation and gold; USD firms.","ar":"تكاليف الطاقة ترفع التضخم والذهب ويتقوى الدولار."}',
 '{"en":"Transport sectors and growth equities lag.","ar":"تتأخر قطاعات النقل وأسهم النمو."}',
 '["Energy producers","Defense","Gold miners","Tankers"]','["Airlines","Logistics"]',
 '["energy","metal","currency","stock","agriculture"]','short_term','high',72),
('chain-cpi','evt-cpi',
 '{"en":"US inflation came in higher than expected.","ar":"جاء التضخم أعلى من المتوقع."}',
 '[{"label":{"en":"Inflation","ar":"التضخم"},"direction":"up"},{"label":{"en":"Fed hawkish","ar":"تشدد الفيدرالي"},"direction":"up"},{"label":{"en":"Bond yields","ar":"عوائد السندات"},"direction":"up"},{"label":{"en":"US Dollar","ar":"الدولار"},"direction":"up"},{"label":{"en":"Gold pressure","ar":"ضغط الذهب"},"direction":"down"},{"label":{"en":"NASDAQ pressure","ar":"ضغط ناسداك"},"direction":"down"}]',
 '{"en":"Rate-cut bets unwind; yields jump.","ar":"تتراجع رهانات الخفض وترتفع العوائد."}',
 '{"en":"Stronger dollar weighs on gold/commodities.","ar":"دولار أقوى يضغط على الذهب والسلع."}',
 '{"en":"Long-duration growth multiples compress.","ar":"تنكمش مضاعفات النمو طويلة الأمد."}',
 '["US Dollar","Banks","Value"]','["Growth/Tech","Gold","Long bonds"]',
 '["index","metal","currency","stock"]','short_term','medium',58)
on conflict (id) do nothing;

-- Assets + companies ---------------------------------------------------------
insert into public.assets (id, name, ticker, asset_type, sector, market_cap, price) values
('asset-nvda','NVIDIA Corp','NVDA','stock','Semiconductors',2900000000000,120.4),
('asset-qbit','QuantBit Systems','QBIT','stock','Quantum Computing',820000000,14.2),
('asset-bmcr','BioMicro Therapeutics','BMCR','stock','Biotech',140000000,3.1),
('asset-zscl','Zscaler-like Cyber','ZSCL','stock','Cybersecurity',26000000000,172.0)
on conflict (id) do nothing;

insert into public.companies (id, name, ticker, sector, market_cap, price, media_mentions_count, noise_level, early_opportunity_score, urgency_score, bull_case, bear_case, neutral_case, final_score) values
('asset-qbit','QuantBit Systems','QBIT','Quantum Computing',820000000,14.2,9,'Alpha Early Signal',82,74,
 '{"en":"National-lab partnership validates tech with low media coverage.","ar":"شراكة مختبر وطني تثبت التقنية مع تغطية إعلامية منخفضة."}',
 '{"en":"Pre-profit with execution risk.","ar":"قبل الربحية مع مخاطر تنفيذ."}',
 '{"en":"Promising but speculative.","ar":"واعدة لكنها مضاربية."}',82),
('asset-nvda','NVIDIA Corp','NVDA','Semiconductors',2900000000000,120.4,95,'Fairly Priced',70,90,
 '{"en":"AI capex supercycle with dominant share.","ar":"دورة إنفاق فائقة على الذكاء الاصطناعي وحصة مهيمنة."}',
 '{"en":"Priced for perfection.","ar":"مسعّرة على الكمال."}',
 '{"en":"Leader, rich valuation short term.","ar":"رائدة بتقييم مرتفع قصير الأجل."}',88),
('asset-bmcr','BioMicro Therapeutics','BMCR','Biotech',140000000,3.1,78,'Late Hype',24,40,
 '{"en":"A clean trial win could multiply the cap.","ar":"فوز نظيف في التجارب قد يضاعف القيمة."}',
 '{"en":"Binary, cash-strapped, insiders selling.","ar":"ثنائية، شحيحة السيولة، الداخليون يبيعون."}',
 '{"en":"Avoid until clarity improves.","ar":"يُتجنّب حتى يتضح الوضع."}',28)
on conflict (id) do nothing;

-- Recommendations ------------------------------------------------------------
insert into public.recommendations (id, asset_id, ticker, asset_type, recommendation_type, time_horizon, confidence_score, risk_score, urgency_score, entry_zone, target_zone, stop_loss, thesis, reason, catalyst, invalidation_conditions, related_news_id, causality_chain_id, supporting_agents, status, expires_at) values
('rec-nvda','asset-nvda','NVDA','stock','buy','short_term',83,42,88,'[118,122]','[134,142]',111,
 '{"en":"AI accelerator demand re-accelerating into a confirmed multi-year contract.","ar":"تسارع الطلب على مسرّعات الذكاء الاصطناعي مع تأكيد عقد متعدد السنوات."}',
 '{"en":"Strong catalyst + abnormal volume + institutional accumulation + bullish consensus.","ar":"محفز قوي + حجم غير اعتيادي + تجميع مؤسسي + توافق صعودي."}',
 '{"en":"Reported $11B AI compute contract.","ar":"الإبلاغ عن عقد حوسبة ذكاء اصطناعي بـ11 مليار دولار."}',
 '{"en":"Close below entry on rising volume or contract walk-back.","ar":"الإغلاق دون الدخول مع ارتفاع الحجم أو تراجع العقد."}',
 'news-ai-contract', null, '["equity","growth","smart_money","global_news"]','approved', now() + interval '5 days'),
('rec-zscl','asset-zscl','ZSCL','stock','watch','medium_term',58,55,49,'[168,175]','[190,205]',158,
 '{"en":"Quality franchise but no time-sensitive catalyst.","ar":"امتياز قوي لكن دون محفز حسّاس للوقت."}',
 '{"en":"Insufficient conviction; downgraded Buy to Watch.","ar":"قناعة غير كافية، خُفّض من شراء إلى مراقبة."}',
 '{"en":"Awaiting next earnings/contract.","ar":"بانتظار النتائج/العقود القادمة."}',
 '{"en":"Break below support with weak retention.","ar":"كسر الدعم مع ضعف الاحتفاظ."}',
 null, null, '["equity"]','active', now() + interval '30 days'),
('rec-bmcr','asset-bmcr','BMCR','stock','watch','short_term',46,86,52,null,null,null,
 '{"en":"Speculative binary biotech with thin runway.","ar":"تقنية حيوية مضاربية ثنائية بسيولة محدودة."}',
 '{"en":"High risk; CIO rejects.","ar":"مخاطر مرتفعة، يرفضها المدير الاستثماري."}',
 '{"en":"Mixed Phase 2 data.","ar":"بيانات مختلطة للمرحلة الثانية."}',
 '{"en":"Needs financing or clear trial success.","ar":"يحتاج تمويلاً أو نجاحاً واضحاً للتجارب."}',
 'news-biotech-trial', null, '[]','rejected', now() + interval '2 days')
on conflict (id) do nothing;

-- Urgent alert ---------------------------------------------------------------
insert into public.urgent_alerts (id, recommendation_id, ticker, asset_type, alert_title, priority, urgency_score, confidence_score, risk_score, expected_move, time_window, reason, related_news_id, impact_chain_id, entry_zone, target_zone, stop_loss, alternative_scenario, invalidation_conditions, supporting_agents, delivery_channels, status, expires_at) values
('alert-nvda','rec-nvda','NVDA','stock',
 '{"en":"CRITICAL: High-conviction AI breakout forming in NVDA","ar":"حرج: تشكّل اختراق عالي القناعة في NVDA"}',
 'critical',88,83,42,
 '{"en":"+8% to +15% within 2-5 trading days","ar":"+8% إلى +15% خلال 2-5 أيام تداول"}','2-5 trading days',
 '{"en":"Time-sensitive catalyst with abnormal volume and smart-money accumulation.","ar":"محفز حسّاس للوقت مع حجم غير اعتيادي وتجميع للأموال الذكية."}',
 'news-ai-contract', null, '[118,122]','[134,142]',111,
 '{"en":"If broad tech rolls over, the setup fails.","ar":"إذا تراجعت التقنية عموماً يفشل الإعداد."}',
 '{"en":"Close below entry on rising volume or contract walk-back.","ar":"الإغلاق دون الدخول مع ارتفاع الحجم أو تراجع العقد."}',
 '["equity","growth","smart_money","global_news"]','["in_app","email"]','new', now() + interval '5 days')
on conflict (id) do nothing;

-- Risk -----------------------------------------------------------------------
insert into public.risks (id, subject, overall_score, level, components, position_size_suggestion, max_drawdown_scenario) values
('risk-market','{"en":"Overall Market","ar":"السوق بشكل عام"}',57,'elevated',
 '[{"type":"inflation","label":{"en":"Inflation Risk","ar":"مخاطر التضخم"},"score":62,"level":"elevated","note":{"en":"Hotter CPI.","ar":"تضخم أعلى."}},{"type":"geopolitical","label":{"en":"Geopolitical Risk","ar":"المخاطر الجيوسياسية"},"score":74,"level":"high","note":{"en":"Oil chokepoint.","ar":"ممر نفطي."}}]',
 '—','{"en":"Combined inflation + geopolitical shock could trigger a 6-10% drawdown.","ar":"صدمة تضخم وجيوسياسية قد تسبب تراجعاً 6-10%."}')
on conflict (id) do nothing;
