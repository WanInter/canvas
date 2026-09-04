'use client';

import type { AdminLabels, ModelForm } from './adminUtils';
import { FOCUS_RING } from './adminUtils';
import { Field } from './AdminSectionPrimitives';
import { modelFieldDOMID } from './modelEditorUtils';

export function ModelIdentityFields({
  labels,
  formKey,
  form,
  providerChoices,
  normalizedCurrentProvider,
  fieldIssueMap,
  onChange,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  form: ModelForm;
  providerChoices: readonly string[];
  normalizedCurrentProvider: string;
  fieldIssueMap: ReadonlyMap<string, string>;
  onChange: (patch: Partial<ModelForm>) => void;
}>) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-6">
      <Field htmlFor={fieldID(formKey, 'id')} label={labels.modelId} error={fieldIssueMap.get('id')} changed={form.id !== form.savedState.id}>
        <input
          id={fieldID(formKey, 'id')}
          name={fieldID(formKey, 'id')}
          value={form.id}
          onChange={(event) => onChange({ id: event.target.value })}
          className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}
          placeholder={labels.modelIdPlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Field htmlFor={fieldID(formKey, 'name')} label={labels.name} error={fieldIssueMap.get('name')} changed={form.name !== form.savedState.name}>
        <input id={fieldID(formKey, 'name')} name={fieldID(formKey, 'name')} value={form.name} onChange={(event) => onChange({ name: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={`${labels.name}…`} autoComplete="off" />
      </Field>
      <Field htmlFor={fieldID(formKey, 'provider')} label={labels.provider} error={fieldIssueMap.get('provider')} changed={form.provider !== form.savedState.provider}>
        <select id={fieldID(formKey, 'provider')} name={fieldID(formKey, 'provider')} value={form.provider} onChange={(event) => onChange({ provider: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
          {!normalizedCurrentProvider ? <option value="">{labels.pendingProvider}</option> : null}
          {providerChoices.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
        </select>
      </Field>
      <Field htmlFor={fieldID(formKey, 'upstreamModelID')} label={labels.upstreamModelId} error={fieldIssueMap.get('upstreamModelID')} changed={form.upstreamModelID !== form.savedState.upstreamModelID}>
        <input id={fieldID(formKey, 'upstreamModelID')} name={fieldID(formKey, 'upstreamModelID')} value={form.upstreamModelID} onChange={(event) => onChange({ upstreamModelID: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={`${labels.upstreamModelId}…`} autoComplete="off" spellCheck={false} />
      </Field>
      <Field htmlFor={fieldID(formKey, 'displayOrder')} label={labels.modelDisplayOrder} error={fieldIssueMap.get('displayOrder')} changed={form.displayOrder !== form.savedState.displayOrder}>
        <input id={fieldID(formKey, 'displayOrder')} name={fieldID(formKey, 'displayOrder')} type="number" step="1" value={form.displayOrder} onChange={(event) => onChange({ displayOrder: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="100" inputMode="numeric" />
      </Field>
      <Field htmlFor={fieldID(formKey, 'type')} label={labels.type} changed={form.type !== form.savedState.type}>
        <select id={fieldID(formKey, 'type')} name={fieldID(formKey, 'type')} value={form.type} onChange={(event) => onChange({ type: event.target.value as ModelForm['type'] })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
          <option value="image">image</option>
          <option value="video">video</option>
        </select>
      </Field>
    </div>
  );
}

function fieldID(formKey: string, field: string): string {
  return modelFieldDOMID(formKey, field);
}
