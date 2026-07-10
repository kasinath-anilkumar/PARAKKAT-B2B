import { useState } from 'react';
import { Button, Field, Input } from '../components/ui/kit';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

/**
 * v3 §10.2 — self-service password change. Enforces the password policy client-
 * side for fast feedback (the server re-validates), then refreshes the in-memory
 * session with the tokens the endpoint returns (other sessions are revoked).
 */
const RULES: { test: (pw: string) => boolean; label: string }[] = [
  { test: (pw) => pw.length >= 10, label: 'At least 10 characters' },
  { test: (pw) => /[A-Z]/.test(pw), label: 'An upper-case letter' },
  { test: (pw) => /[a-z]/.test(pw), label: 'A lower-case letter' },
  { test: (pw) => /\d/.test(pw), label: 'A digit' },
  { test: (pw) => /[^A-Za-z0-9]/.test(pw), label: 'A symbol' },
];

export function ChangePasswordCard() {
  const setSession = useAuthStore((s) => s.setSession);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const unmet = RULES.filter((r) => !r.test(next));
  const canSubmit = current !== '' && next !== '' && next === confirm && unmet.length === 0 && !busy;

  async function submit() {
    setError(null);
    setDone(false);
    if (next !== confirm) { setError('New passwords do not match.'); return; }
    setBusy(true);
    try {
      const { user, accessToken } = await authApi.changePassword(current, next);
      setSession(accessToken, user);
      setCurrent(''); setNext(''); setConfirm(''); setDone(true);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not change password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-slate-700">Change password</div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {done && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Password updated. Other devices have been signed out.</p>}
      <div className="space-y-3">
        <Field label="Current password"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New password"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label="Confirm new password"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {next !== '' && unmet.length > 0 && (
          <ul className="space-y-0.5 text-xs text-slate-500">
            {RULES.map((r) => (
              <li key={r.label} className={r.test(next) ? 'text-green-600' : 'text-slate-400'}>
                {r.test(next) ? '✓' : '○'} {r.label}
              </li>
            ))}
          </ul>
        )}
        <div className="pt-1"><Button variant="primary" disabled={!canSubmit} onClick={submit}>{busy ? 'Updating…' : 'Update password'}</Button></div>
      </div>
    </div>
  );
}

/** v3 §10.2 — prompt shown while the signed-in user still has a temporary password. */
export function MustChangePasswordBanner() {
  const user = useAuthStore((s) => s.user);
  if (!user?.mustChangePassword) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      For your security, please change your temporary password below before continuing.
    </div>
  );
}
