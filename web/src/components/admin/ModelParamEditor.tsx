'use client';

import { CirclePlus, GripHorizontal, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { FOCUS_RING, type AdminLabels } from './adminUtils';
import { emptyEditableParam, emptyEditableParamOption, modelFieldDOMID, type EditableModelParam, type ModelValidationIssue } from './modelEditorUtils';

export function ModelParamEditor({
  labels,
  formKey,
  value,
  issues,
  onChange,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  value: readonly EditableModelParam[];
  issues: readonly ModelValidationIssue[];
  onChange: (nextParams: EditableModelParam[]) => void;
}>) {
  const issueMap = useMemo(() => new Map(issues.map((issue) => [issue.field, issue.message])), [issues]);

  return (
    <div className="bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black text-ink">{labels.paramBuilderTitle}</h4>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2 py-0.5 text-xs font-black text-secondary">{value.length}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, emptyEditableParam()])}
          className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-black text-secondary transition hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`}
        >
          <CirclePlus size={15} aria-hidden="true" />
          {labels.addParam}
        </button>
      </div>

      {value.length === 0 ? (
        <div className="mt-1.5 rounded-surface border border-dashed border-line bg-surface px-3 py-3 text-sm font-semibold text-muted">{labels.noParams}</div>
      ) : (
        <div className="mt-2 overflow-hidden border-y border-line bg-white">
          {value.map((param, index) => (
            <ParamCard key={param.id} labels={labels} formKey={formKey} param={param} index={index} issueMap={issueMap} params={value} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function ParamCard({
  labels,
  formKey,
  param,
  index,
  issueMap,
  params,
  onChange,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  param: EditableModelParam;
  index: number;
  issueMap: ReadonlyMap<string, string>;
  params: readonly EditableModelParam[];
  onChange: (nextParams: EditableModelParam[]) => void;
}>) {
  const optionIssuePrefix = `param:${param.id}:option:`;
  const hasOptionIssue = hasIssuePrefix(issueMap, optionIssuePrefix) || issueMap.has(`param:${param.id}:options`);

  const hasFieldIssue = hasIssuePrefix(issueMap, `param:${param.id}:`);
  const paramTitle = param.key.trim() || labels.paramCardHint;
  const paramMeta = [
    param.label.trim(),
    param.kind,
    param.kind === 'number' && (param.min || param.max) ? `${param.min || '-'}-${param.max || '-'}` : '',
    param.kind === 'select' ? `${param.options.length} ${labels.paramOptions}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <details className={`border-b last:border-b-0 ${hasFieldIssue ? 'border-red-200 bg-red-50/40' : 'border-line bg-white'}`} open={hasFieldIssue || !param.key.trim() ? true : undefined}>
      <summary className="cursor-pointer list-none">
        <div className="grid min-h-11 grid-cols-[32px_minmax(120px,1.2fr)_96px_minmax(120px,1fr)_80px_40px] items-center gap-2 px-2 py-1.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-black text-secondary">{index + 1}</span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <GripHorizontal size={13} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="truncate text-xs font-black text-secondary">{paramTitle}</span>
              {hasFieldIssue ? <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-black uppercase text-red-700">error</span> : null}
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-muted">{param.label.trim() || labels.paramCardHint}</p>
          </div>
          <span className="justify-self-start rounded-full border border-line bg-subtle px-2 py-0.5 text-xs font-black uppercase tracking-normal text-secondary">{param.kind}</span>
          <span className="min-w-0 truncate text-xs font-semibold text-secondary">{paramMeta || labels.paramCardHint}</span>
          <span className={`justify-self-start rounded-full px-2 py-0.5 text-xs font-black ${param.required ? 'bg-accent-soft text-secondary' : 'bg-slate-100 text-slate-500'}`}>{param.required ? labels.paramRequired : '-'}</span>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onChange(params.filter((item) => item.id !== param.id));
            }}
            className={`inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-lg border border-danger bg-danger-soft text-danger transition hover:brightness-95 ${FOCUS_RING}`}
            aria-label={`${labels.removeParam} ${index + 1}`}
            title={labels.removeParam}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </summary>

      <div className="border-t border-line bg-white p-2">
      <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-12">
        <EditorField className="xl:col-span-3" htmlFor={fieldID(formKey, param.id, 'key')} label={labels.paramKey} error={issueMap.get(`param:${param.id}:key`)}>
          <input
            id={fieldID(formKey, param.id, 'key')}
            name={fieldID(formKey, param.id, 'key')}
            value={param.key}
            onChange={(event) => onChange(patchParam(params, param.id, { key: event.target.value }))}
            className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
            placeholder={`${labels.paramKey}…`}
            autoComplete="off"
            spellCheck={false}
          />
        </EditorField>

        <EditorField className="xl:col-span-3" htmlFor={fieldID(formKey, param.id, 'label')} label={labels.paramLabel} error={issueMap.get(`param:${param.id}:label`)}>
          <input
            id={fieldID(formKey, param.id, 'label')}
            name={fieldID(formKey, param.id, 'label')}
            value={param.label}
            onChange={(event) => onChange(patchParam(params, param.id, { label: event.target.value }))}
            className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
            placeholder={`${labels.paramLabel}…`}
            autoComplete="off"
          />
        </EditorField>

        <EditorField className="xl:col-span-2" htmlFor={fieldID(formKey, param.id, 'kind')} label={labels.paramKind}>
          <select
            id={fieldID(formKey, param.id, 'kind')}
            name={fieldID(formKey, param.id, 'kind')}
            value={param.kind}
            onChange={(event) => {
              const kind = event.target.value as EditableModelParam['kind'];
              onChange(patchParam(params, param.id, { kind, ...(kind === 'number' ? { options: [] } : {}) }));
            }}
            className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
          >
            <option value="text">text</option>
            <option value="select">select</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
          </select>
        </EditorField>

        {param.kind === 'boolean' ? (
          <ToggleField className="xl:col-span-2" htmlFor={fieldID(formKey, param.id, 'default')} label={labels.paramDefault}>
            <input
              id={fieldID(formKey, param.id, 'default')}
              name={fieldID(formKey, param.id, 'default')}
              type="checkbox"
              checked={param.defaultBoolean}
              onChange={(event) => onChange(patchParam(params, param.id, { defaultBoolean: event.target.checked }))}
              className="h-4 w-4 accent-[var(--ui-accent)]"
            />
            {labels.paramDefaultBoolean}
          </ToggleField>
        ) : (
          <EditorField className="xl:col-span-2" htmlFor={fieldID(formKey, param.id, 'default')} label={labels.paramDefault} error={issueMap.get(`param:${param.id}:default`)}>
            <input
              id={fieldID(formKey, param.id, 'default')}
              name={fieldID(formKey, param.id, 'default')}
              type={param.kind === 'number' ? 'number' : 'text'}
              inputMode={param.kind === 'number' ? 'decimal' : undefined}
              value={param.defaultText}
              onChange={(event) => onChange(patchParam(params, param.id, { defaultText: event.target.value }))}
              className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
              placeholder={`${labels.paramDefault}…`}
              autoComplete="off"
              spellCheck={false}
            />
          </EditorField>
        )}

        <ToggleField className="xl:col-span-2" htmlFor={fieldID(formKey, param.id, 'required')} label={labels.paramRequired}>
          <input
            id={fieldID(formKey, param.id, 'required')}
            name={fieldID(formKey, param.id, 'required')}
            type="checkbox"
            checked={param.required}
            onChange={(event) => onChange(patchParam(params, param.id, { required: event.target.checked }))}
            className="h-4 w-4 accent-[var(--ui-accent)]"
          />
          {labels.paramRequired}
        </ToggleField>

        {param.kind === 'number' ? <NumberFields labels={labels} formKey={formKey} param={param} issueMap={issueMap} params={params} onChange={onChange} /> : null}

        <EditorField className="xl:col-span-12" htmlFor={fieldID(formKey, param.id, 'description')} label={labels.paramDescription}>
          <textarea
            id={fieldID(formKey, param.id, 'description')}
            name={fieldID(formKey, param.id, 'description')}
            value={param.description}
            onChange={(event) => onChange(patchParam(params, param.id, { description: event.target.value }))}
            className={`aics-control min-h-[56px] w-full rounded-lg px-2.5 py-2 text-sm leading-5 ${FOCUS_RING}`}
            placeholder={`${labels.paramDescription}…`}
            autoComplete="off"
          />
        </EditorField>

        {(param.kind === 'select' || param.kind === 'text') ? <ParamOptionsEditor labels={labels} formKey={formKey} param={param} issueMap={issueMap} params={params} onChange={onChange} hasOptionIssue={hasOptionIssue} /> : null}
      </div>
      </div>
    </details>
  );
}

function NumberFields({
  labels,
  formKey,
  param,
  issueMap,
  params,
  onChange,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  param: EditableModelParam;
  issueMap: ReadonlyMap<string, string>;
  params: readonly EditableModelParam[];
  onChange: (nextParams: EditableModelParam[]) => void;
}>) {
  return (
    <>
      <EditorField className="xl:col-span-4" htmlFor={fieldID(formKey, param.id, 'min')} label={labels.paramMin} error={issueMap.get(`param:${param.id}:min`)}>
        <input
          id={fieldID(formKey, param.id, 'min')}
          name={fieldID(formKey, param.id, 'min')}
          type="number"
          inputMode="decimal"
          value={param.min}
          onChange={(event) => onChange(patchParam(params, param.id, { min: event.target.value }))}
          className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
          placeholder={`${labels.paramMin}…`}
          autoComplete="off"
          spellCheck={false}
        />
      </EditorField>
      <EditorField className="xl:col-span-4" htmlFor={fieldID(formKey, param.id, 'max')} label={labels.paramMax} error={issueMap.get(`param:${param.id}:max`)}>
        <input
          id={fieldID(formKey, param.id, 'max')}
          name={fieldID(formKey, param.id, 'max')}
          type="number"
          inputMode="decimal"
          value={param.max}
          onChange={(event) => onChange(patchParam(params, param.id, { max: event.target.value }))}
          className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
          placeholder={`${labels.paramMax}…`}
          autoComplete="off"
          spellCheck={false}
        />
      </EditorField>
      <EditorField className="xl:col-span-4" htmlFor={fieldID(formKey, param.id, 'step')} label={labels.paramStep} error={issueMap.get(`param:${param.id}:step`)}>
        <input
          id={fieldID(formKey, param.id, 'step')}
          name={fieldID(formKey, param.id, 'step')}
          type="number"
          inputMode="decimal"
          value={param.step}
          onChange={(event) => onChange(patchParam(params, param.id, { step: event.target.value }))}
          className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
          placeholder={`${labels.paramStep}…`}
          autoComplete="off"
          spellCheck={false}
        />
      </EditorField>
    </>
  );
}

function ParamOptionsEditor({
  labels,
  formKey,
  param,
  issueMap,
  params,
  onChange,
  hasOptionIssue,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  param: EditableModelParam;
  issueMap: ReadonlyMap<string, string>;
  params: readonly EditableModelParam[];
  onChange: (nextParams: EditableModelParam[]) => void;
  hasOptionIssue: boolean;
}>) {
  return (
    <details className="xl:col-span-12 rounded-surface border border-line bg-subtle p-2" open={hasOptionIssue ? true : undefined}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-black uppercase tracking-normal text-secondary">{labels.paramOptions}</span>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2 py-0.5 text-xs font-black text-secondary">{param.options.length}</span>
          </div>
          <span className="text-xs font-semibold text-muted">{labels.paramOptionsHint}</span>
        </div>
      </summary>

      <div className="mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={() => onChange(patchParamOptions(params, param.id, [...param.options, emptyEditableParamOption()]))}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-black text-secondary transition hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`}
        >
          <CirclePlus size={14} aria-hidden="true" />
          {labels.addOption}
        </button>
      </div>

      {issueMap.get(`param:${param.id}:options`) ? <FieldError message={issueMap.get(`param:${param.id}:options`)} /> : null}

      {param.options.length === 0 ? (
        <div className="mt-1.5 rounded-lg border border-dashed border-line bg-surface px-3 py-3 text-sm font-semibold text-muted">{labels.noOptions}</div>
      ) : (
        <div className="mt-1.5 overflow-hidden rounded-lg border border-line bg-white">
          <div className="hidden bg-line md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] md:gap-px">
            <OptionColumnHeader>{labels.paramOptionLabel}</OptionColumnHeader>
            <OptionColumnHeader>{labels.paramOptionValue}</OptionColumnHeader>
            <OptionColumnHeader />
          </div>
          <div className="grid gap-px bg-line">
            {param.options.map((option, optionIndex) => (
              <div key={option.id} className="grid gap-px bg-line md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px]">
                <OptionField
                  htmlFor={fieldID(formKey, param.id, `option:${option.id}:label`)}
                  label={labels.paramOptionLabel}
                  error={issueMap.get(`param:${param.id}:option:${option.id}:label`)}
                >
                  <input
                    id={fieldID(formKey, param.id, `option:${option.id}:label`)}
                    name={fieldID(formKey, param.id, `option:${option.id}:label`)}
                    value={option.label}
                    onChange={(event) => onChange(patchParamOption(params, param.id, option.id, { label: event.target.value }))}
                    className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
                    placeholder={`${labels.paramOptionLabel} ${optionIndex + 1}…`}
                    autoComplete="off"
                  />
                </OptionField>
                <OptionField
                  htmlFor={fieldID(formKey, param.id, `option:${option.id}:value`)}
                  label={labels.paramOptionValue}
                  error={issueMap.get(`param:${param.id}:option:${option.id}:value`)}
                >
                  <input
                    id={fieldID(formKey, param.id, `option:${option.id}:value`)}
                    name={fieldID(formKey, param.id, `option:${option.id}:value`)}
                    value={option.value}
                    onChange={(event) => onChange(patchParamOption(params, param.id, option.id, { value: event.target.value }))}
                    className={`aics-control w-full rounded-lg px-2.5 py-1.5 text-sm ${FOCUS_RING}`}
                    placeholder={`${labels.paramOptionValue} ${optionIndex + 1}…`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </OptionField>
                <div className="flex items-center justify-end bg-white p-1.5 md:justify-center">
                  <button
                    type="button"
                    onClick={() => onChange(patchParamOptions(params, param.id, param.options.filter((item) => item.id !== option.id)))}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-danger bg-danger-soft text-danger transition hover:brightness-95 ${FOCUS_RING}`}
                    aria-label={`${labels.removeOption} ${optionIndex + 1}`}
                    title={labels.removeOption}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </details>
  );
}

function patchParam(items: readonly EditableModelParam[], paramID: string, patch: Partial<EditableModelParam>): EditableModelParam[] {
  return items.map((item) => (item.id === paramID ? { ...item, ...patch } : item));
}

function patchParamOptions(items: readonly EditableModelParam[], paramID: string, options: readonly EditableModelParam['options'][number][]): EditableModelParam[] {
  return items.map((item) => (item.id === paramID ? { ...item, options: [...options] } : item));
}

function patchParamOption(items: readonly EditableModelParam[], paramID: string, optionID: string, patch: Partial<EditableModelParam['options'][number]>): EditableModelParam[] {
  return items.map((item) => {
    if (item.id !== paramID) return item;
    return {
      ...item,
      options: item.options.map((option) => (option.id === optionID ? { ...option, ...patch } : option)),
    };
  });
}

function fieldID(formKey: string, paramID: string, field: string): string {
  return modelFieldDOMID(formKey, `param:${paramID}:${field}`);
}

function hasIssuePrefix(issueMap: ReadonlyMap<string, string>, prefix: string): boolean {
  return [...issueMap.keys()].some((key) => key.startsWith(prefix));
}

function EditorField({ htmlFor, label, error, className, children }: Readonly<{ htmlFor: string; label: string; error?: string; className?: string; children: React.ReactNode }>) {
  return (
    <div className={className ?? 'block'}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-black uppercase tracking-normal text-secondary">
        {label}
      </label>
      {children}
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

function ToggleField({ htmlFor, label, className, children }: Readonly<{ htmlFor: string; label: string; className?: string; children: React.ReactNode }>) {
  return (
    <div className={className ?? 'block'}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-black uppercase tracking-normal text-secondary">
        {label}
      </label>
      <label htmlFor={htmlFor} className="inline-flex min-h-8 w-full items-center gap-2 rounded-lg border border-line bg-subtle px-2.5 py-1.5 text-sm font-bold text-secondary">
        {children}
      </label>
    </div>
  );
}

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null;
  return <p className="mt-0.5 text-xs font-semibold text-red-600" aria-live="polite">{message}</p>;
}

function OptionColumnHeader({ children }: Readonly<{ children?: React.ReactNode }>) {
  return <div className="bg-subtle px-2.5 py-1.5 text-xs font-black uppercase tracking-normal text-secondary">{children}</div>;
}

function OptionField({
  htmlFor,
  label,
  error,
  children,
}: Readonly<{
  htmlFor: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-white p-1.5">
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-black uppercase tracking-normal text-secondary md:sr-only">
        {label}
      </label>
      {children}
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}
