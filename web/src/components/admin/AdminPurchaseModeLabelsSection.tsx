'use client';

import { Loader2, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listPurchaseModeLabels } from '@/lib/api/billing';
import { updatePurchaseModeLabel } from '@/lib/api/admin';
import type { PurchaseModeLabel } from '@/lib/types';
import { FOCUS_RING } from './adminUtils';
import { Field, PrimaryButton, SectionHeader } from './AdminSectionPrimitives';

const MANAGED_MODES = [
  'first_order_pack',
  'monthly_subscription',
  'yearly_subscription',
  'monthly_value_subscription',
  'yearly_value_subscription',
  'weekly_membership',
  'credits_pack',
] as const;
const MODE_TITLES: Readonly<Record<string, string>> = {
  first_order_pack: '首单套餐',
  monthly_subscription: '基础会员连续包月',
  yearly_subscription: '基础会员连续包年',
  monthly_value_subscription: '超值月卡',
  yearly_value_subscription: '超值年卡',
  weekly_membership: '短期周卡',
  credits_pack: '一次性积分充值',
};

type LabelForm = { badge_zh: string; badge_en: string };

export function AdminPurchaseModeLabelsSection() {
  const [forms, setForms] = useState<Record<string, LabelForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<string>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    listPurchaseModeLabels()
      .then((items) => {
        if (cancelled) return;
        const byMode = Object.fromEntries(items.map((item) => [item.purchase_mode, item]));
        setForms(Object.fromEntries(MANAGED_MODES.map((mode) => [mode, labelForm(byMode[mode])])));
      })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : '加载分类文案失败'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const patch = (mode: string, next: Partial<LabelForm>) => setForms((current) => ({ ...current, [mode]: { ...current[mode], ...next } }));

  const save = async (mode: string) => {
    const form = forms[mode];
    if (!form) return;
    setSavingMode(mode);
    setError('');
    setNotice('');
    try {
      const saved = await updatePurchaseModeLabel(mode, { badge_zh: form.badge_zh.trim(), badge_en: form.badge_en.trim() });
      setForms((current) => ({ ...current, [mode]: labelForm(saved) }));
      setNotice('分类徽章文案已保存，前台立即生效');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存分类徽章文案失败');
    } finally {
      setSavingMode(undefined);
    }
  };

  return (
    <section className="admin-config-section mt-4">
      <SectionHeader icon={<Tag size={16} />} eyebrow="分类徽章文案" title="购买方式徽章文案" subtitle="修改各购买方式在前台价格页 tab 与商品卡片上显示的徽章文案，保存后前台无需发版即可生效。" />
      {loading ? <div className="mt-4 flex items-center gap-2 text-sm font-bold text-secondary"><Loader2 size={16} className="animate-spin" />加载中…</div> : null}
      {error ? <div className="mt-4 rounded-surface border border-danger bg-danger-soft px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-surface border border-success bg-success-soft px-4 py-3 text-sm font-bold text-success" aria-live="polite">{notice}</div> : null}
      {!loading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MANAGED_MODES.map((mode) => (
            <div key={mode} className="admin-card rounded-surface p-3.5">
              <h3 className="text-sm font-black text-ink">{MODE_TITLES[mode]}</h3>
              <div className="mt-3 grid gap-3">
                <Field label="中文徽章文案" htmlFor={`pml-${mode}-zh`}>
                  <input id={`pml-${mode}-zh`} name={`pml-${mode}-zh`} autoComplete="off" value={forms[mode]?.badge_zh ?? ''} disabled={savingMode === mode} maxLength={60} onChange={(event) => patch(mode, { badge_zh: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} />
                </Field>
                <Field label="英文徽章文案" htmlFor={`pml-${mode}-en`}>
                  <input id={`pml-${mode}-en`} name={`pml-${mode}-en`} autoComplete="off" value={forms[mode]?.badge_en ?? ''} disabled={savingMode === mode} maxLength={60} onChange={(event) => patch(mode, { badge_en: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} />
                </Field>
              </div>
              <div className="mt-3 flex justify-end">
                <PrimaryButton onClick={() => void save(mode)} loading={savingMode === mode} disabled={Boolean(savingMode)}>保存</PrimaryButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function labelForm(item?: PurchaseModeLabel): LabelForm {
  return { badge_zh: item?.badge_zh ?? '', badge_en: item?.badge_en ?? '' };
}
