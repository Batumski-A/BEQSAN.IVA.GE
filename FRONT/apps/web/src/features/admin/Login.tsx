import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Key } from 'lucide-react';

import {
  getAdminToken,
  getSetupStatus,
  login,
  setAdminToken,
  setAdminUser,
  setupOwner,
} from './api';

type LocationState = { from?: { pathname?: string } } | null;
type Mode = 'loading' | 'setup' | 'login';

export const AdminLogin = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const redirectTo = state?.from?.pathname ?? '/adminpanel';

  const [mode, setMode] = useState<Mode>('loading');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getSetupStatus();
        if (!cancelled) setMode(status.hasOwner ? 'login' : 'setup');
      } catch {
        if (!cancelled) setMode('login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (getAdminToken()) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const resp = await login(username.trim(), password);
      setAdminToken(resp.token);
      setAdminUser(resp.username);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შესვლა ვერ მოხერხდა.');
    } finally {
      setPending(false);
    }
  };

  const handleSetup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirm) {
      setError('პაროლები არ ემთხვევა.');
      return;
    }
    if (password.length < 8) {
      setError('პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს.');
      return;
    }
    setPending(true);
    try {
      const resp = await setupOwner(
        username.trim(),
        password,
        displayName.trim() || username.trim(),
      );
      setAdminToken(resp.token);
      setAdminUser(resp.username);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'რეგისტრაცია ვერ მოხერხდა.');
    } finally {
      setPending(false);
    }
  };

  if (mode === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-base text-fg-tertiary">
        <div className="font-mono text-caption uppercase tracking-[0.25em]">იტვირთება…</div>
      </div>
    );
  }

  const isSetup = mode === 'setup';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-base px-4 py-12 text-fg-primary overflow-hidden relative">
      {/* Premium animated/blurred color spots */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full bg-accent-amber/5 blur-[120px] animate-pulse-soft" />
      <div className="pointer-events-none absolute right-[-10%] bottom-[-10%] h-[50vw] w-[50vw] rounded-full bg-blue-500/5 blur-[120px] animate-pulse-soft" />

      <form
        onSubmit={isSetup ? handleSetup : handleLogin}
        className="relative w-full max-w-md rounded-xl border border-hairline-strong bg-bg-elevated/75 p-8 md:p-10 shadow-2xl backdrop-blur-md animate-fade-in"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/img/beqsan-logo.png"
            alt="BEQSAN Logo"
            className="h-16 w-16 object-contain rounded-xl border border-hairline bg-white/5 p-1 shadow-lg mb-3"
          />
          <div className="font-mono text-caption uppercase tracking-[0.25em] text-accent-amber">
            BEQSAN
          </div>
          <h1 className="mt-2 font-headline text-h3 tracking-tight text-fg-primary leading-tight">
            {isSetup ? 'ადმინი · პირველი დაყენება' : 'ადმინი · შესვლა'}
          </h1>
          <p className="mt-2 text-[13px] text-fg-tertiary">
            {isSetup
              ? 'შექმენი მფლობელის ანგარიში — ამ ანგარიშით გექნება სრული წვდომა.'
              : 'მომხმარებელი და პაროლი — როგორც დარეგისტრირდი.'}
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              მომხმარებელი
            </span>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-tertiary pointer-events-none" />
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoFocus
                required
                minLength={3}
                maxLength={64}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-hairline bg-bg-base px-3.5 pl-10 py-2.5 text-body-sm text-fg-primary outline-none focus:border-accent-amber focus:ring-1 focus:ring-accent-amber/25 transition-all bg-bg-base/40"
              />
            </div>
          </label>

          {isSetup && (
            <label className="block">
              <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                გამოსაჩენი სახელი <span className="text-fg-tertiary/60">(არასავალდებულო)</span>
              </span>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-tertiary pointer-events-none" />
                <input
                  type="text"
                  name="displayName"
                  maxLength={128}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="მაგ. რომან შარაშიძე"
                  className="w-full rounded-md border border-hairline bg-bg-base px-3.5 pl-10 py-2.5 text-body-sm text-fg-primary outline-none focus:border-accent-amber focus:ring-1 focus:ring-accent-amber/25 transition-all bg-bg-base/40"
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              პაროლი
            </span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-tertiary pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                required
                minLength={isSetup ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-hairline bg-bg-base px-3.5 pl-10 pr-10 py-2.5 text-body-sm text-fg-primary outline-none focus:border-accent-amber focus:ring-1 focus:ring-accent-amber/25 transition-all bg-bg-base/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isSetup && (
              <span className="mt-1 block font-mono text-[11px] text-fg-tertiary">
                მინიმუმ 8 სიმბოლო
              </span>
            )}
          </label>

          {isSetup && (
            <label className="block">
              <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                გაიმეორე პაროლი
              </span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-tertiary pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password-confirm"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full rounded-md border border-hairline bg-bg-base px-3.5 pl-10 py-2.5 text-body-sm text-fg-primary outline-none focus:border-accent-amber focus:ring-1 focus:ring-accent-amber/25 transition-all bg-bg-base/40"
                />
              </div>
            </label>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-system-danger/30 bg-system-danger/5 px-3.5 py-2.5 text-body-sm text-system-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            pending || !username || !password || (isSetup && !passwordConfirm)
          }
          className="mt-6 block w-full rounded-md bg-accent-amber px-4 py-3 font-headline text-body-sm text-bg-base font-bold transition-all hover:bg-accent-amber-h active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {pending ? 'მუშავდება…' : isSetup ? 'დარეგისტრირება' : 'შესვლა'}
        </button>

        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-fg-tertiary">
          {isSetup ? 'first-install · owner setup' : 'beqsan · admin'}
        </p>
      </form>
    </div>
  );
};
