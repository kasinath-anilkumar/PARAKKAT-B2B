import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as onboardingApi from '../api/onboarding.api';
import { saveResumeSession } from '../store/onboardingSession';

export function ResumePage() {
  const navigate = useNavigate();
  const [applicationId, setApplicationId] = useState('');
  const [resumeToken, setResumeToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await onboardingApi.getDraft(applicationId.trim(), resumeToken.trim());
      saveResumeSession({ applicationId: applicationId.trim(), resumeToken: resumeToken.trim() });
      navigate(res.application.lifecycleState === 'DRAFT' ? '/onboarding/register' : '/onboarding/status');
    } catch {
      setError('Could not find an application with that reference and token');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-xl font-semibold text-slate-900">Resume your application</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the application reference and resume token you received when you started.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Application reference</span>
          <input
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Resume token</span>
          <input
            value={resumeToken}
            onChange={(e) => setResumeToken(e.target.value)}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Resume
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/onboarding/register" className="text-slate-900 underline">
          Start a new application
        </Link>
      </p>
    </div>
  );
}
