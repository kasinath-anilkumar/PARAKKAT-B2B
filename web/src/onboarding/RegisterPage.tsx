import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as onboardingApi from '../api/onboarding.api';
import {
  clearResumeSession,
  loadResumeSession,
  saveResumeSession,
} from '../store/onboardingSession';
import type { DocType, DocumentSummary, DraftFields } from '../types/onboarding';

interface FieldDef {
  name: keyof DraftFields;
  label: string;
  placeholder?: string;
  type?: string;
  optional?: boolean;
}

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Business',
    fields: [
      { name: 'legalName', label: 'Legal business name' },
      { name: 'gstin', label: 'GSTIN', placeholder: '27AABCU9603R1ZM' },
      { name: 'pan', label: 'PAN', placeholder: 'AABCU9603R' },
    ],
  },
  {
    title: 'Registered address',
    fields: [
      { name: 'addressLine1', label: 'Address line 1' },
      { name: 'addressLine2', label: 'Address line 2', optional: true },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'postalCode', label: 'Postal code', placeholder: '560001' },
      { name: 'country', label: 'Country' },
    ],
  },
  {
    title: 'Business contact',
    fields: [
      { name: 'businessContactEmail', label: 'Contact email', type: 'email' },
      { name: 'businessContactPhone', label: 'Contact phone', placeholder: '9876543210' },
    ],
  },
  {
    title: 'Authorized representative',
    fields: [
      { name: 'repName', label: 'Full name' },
      { name: 'repDesignation', label: 'Designation' },
      { name: 'repEmail', label: 'Email', type: 'email' },
      { name: 'repMobile', label: 'Mobile', placeholder: '9876543211' },
      { name: 'repAadhaarRef', label: 'Aadhaar reference (for eKYC)' },
    ],
  },
  {
    title: 'Bank details',
    fields: [
      { name: 'bankAccount', label: 'Account number' },
      { name: 'ifsc', label: 'IFSC', placeholder: 'HDFC0001234' },
      { name: 'accountHolder', label: 'Account holder name' },
    ],
  },
];

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'REGISTRATION_PROOF', label: 'Registration proof' },
  { value: 'ADDRESS_PROOF', label: 'Address proof' },
  { value: 'OTHER', label: 'Other' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<DraftFields>({ country: 'India' });
  const [session, setSession] = useState(() => loadResumeSession());
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    onboardingApi
      .getDraft(session.applicationId, session.resumeToken)
      .then((res) => {
        if (res.application.lifecycleState !== 'DRAFT') {
          navigate('/onboarding/status');
          return;
        }
        const { id: _id, lifecycleState: _s, submittedAt: _sub, ...rest } = res.application;
        void _id;
        void _s;
        void _sub;
        setFields((prev) => ({ ...prev, ...rest }));
        return onboardingApi.listDocuments(session.applicationId, session.resumeToken);
      })
      .then((res) => res && setDocuments(res.documents))
      .catch(() => {
        // Stale/invalid session — start fresh.
        clearResumeSession();
        setSession(null);
      });
  }, [session, navigate]);

  function update(name: keyof DraftFields, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function saveDraft(): Promise<void> {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (!session) {
        const res = await onboardingApi.createDraft(fields);
        const next = { applicationId: res.applicationId, resumeToken: res.resumeToken };
        saveResumeSession(next);
        setSession(next);
        setNotice('Draft saved. You can safely leave and resume later.');
      } else {
        await onboardingApi.updateDraft(session.applicationId, session.resumeToken, fields);
        setNotice('Draft updated.');
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!session) return;
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const docTypeInput = form.elements.namedItem('docType') as HTMLSelectElement;
    if (!fileInput.files?.[0]) return;
    setError(null);
    setBusy(true);
    try {
      await onboardingApi.uploadDocument(
        session.applicationId,
        session.resumeToken,
        docTypeInput.value as DocType,
        fileInput.files[0],
      );
      const res = await onboardingApi.listDocuments(session.applicationId, session.resumeToken);
      setDocuments(res.documents);
      form.reset();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    if (!session) return;
    setError(null);
    setBusy(true);
    try {
      await onboardingApi.submitApplication(session.applicationId, session.resumeToken);
      navigate('/onboarding/status');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Agency registration</h1>
      <p className="mt-1 text-sm text-slate-500">
        Complete your details, upload the required proofs, and submit for verification. Your draft
        is saved and resumable.
      </p>

      {notice && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field.name} className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">
                    {field.label}
                    {field.optional && <span className="text-slate-400"> (optional)</span>}
                  </span>
                  <input
                    type={field.type ?? 'text'}
                    value={fields[field.name] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => update(field.name, e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <div className="flex gap-3">
          <button
            onClick={saveDraft}
            disabled={busy}
            className="rounded bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
          >
            {session ? 'Update draft' : 'Save draft'}
          </button>
          <button
            onClick={submit}
            disabled={busy || !session}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Submit for verification
          </button>
        </div>

        {session && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Documents
            </h2>
            <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Type</span>
                <select name="docType" className="rounded border border-slate-300 px-3 py-2">
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-sm" />
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
              >
                Upload
              </button>
            </form>

            <ul className="mt-4 space-y-1 text-sm text-slate-600">
              {documents.map((doc) => (
                <li key={doc.id} className="flex justify-between rounded border border-slate-200 px-3 py-2">
                  <span>{doc.fileName}</span>
                  <span className="text-slate-400">{doc.docType}</span>
                </li>
              ))}
              {documents.length === 0 && <li className="text-slate-400">No documents uploaded yet.</li>}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function extractError(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
    'Something went wrong'
  );
}
