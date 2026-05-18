import { useState, type ReactNode } from 'react';
import { clearAdminToken, getAdminToken, setAdminToken } from '../../lib/api';

type AdminTokenGateProps = { children: ReactNode };

/**
 * Phase-0 admin-token gate. Asks for the X-Admin-Token once, stores it in
 * localStorage, and forwards every /admin/* call with it. Replaced by JWT
 * sign-in once auth lands — see [docs/adr/0003-social-module.md].
 */
export const AdminTokenGate = ({ children }: AdminTokenGateProps): JSX.Element => {
  const [, force] = useState(0);
  const token = getAdminToken();

  if (!token) {
    return <TokenPrompt onSubmit={() => force((n) => n + 1)} />;
  }
  return (
    <div className="relative">
      <button
        type="button"
        className="absolute right-4 top-4 z-10 font-mono text-caption uppercase tracking-wider text-fg-tertiary hover:text-fg-secondary"
        onClick={() => {
          clearAdminToken();
          force((n) => n + 1);
        }}
      >
        ტოკენი · გასვლა
      </button>
      {children}
    </div>
  );
};

const TokenPrompt = ({ onSubmit }: { onSubmit: () => void }): JSX.Element => {
  const [value, setValue] = useState('');
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-base px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim().length > 0) {
            setAdminToken(value.trim());
            onSubmit();
          }
        }}
        className="w-full max-w-md rounded-sm border border-hairline bg-bg-elevated p-8"
      >
        <h2 className="font-headline text-h3 text-fg-primary">ადმინი · შესვლა</h2>
        <p className="mt-2 text-body-sm text-fg-secondary">
          ჩასვი ერთჯერადი ადმინისტრატორის ტოკენი. ის შენახული იქნება მხოლოდ ამ ბრაუზერში.
        </p>
        <label className="mt-6 block">
          <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            X-Admin-Token
          </span>
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 w-full rounded-sm border border-hairline-strong bg-bg-base px-3 py-2 font-mono text-body-sm text-fg-primary outline-none focus:border-accent-amber"
          />
        </label>
        <button
          type="submit"
          className="mt-6 w-full rounded-sm bg-accent-amber px-4 py-2.5 font-headline text-body-sm text-bg-base transition-colors hover:bg-accent-amber-h"
        >
          შესვლა →
        </button>
      </form>
    </div>
  );
};
