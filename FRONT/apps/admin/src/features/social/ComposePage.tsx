import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { socialApi, type PublishResponse, type PublishTarget, type SocialPlatform } from './api';
import { Shell } from '../../components/shell/Shell';

type Selection = { pageId: string; platform: SocialPlatform };

const MAX_CAPTION = 2200;

export const ComposePage = (): JSX.Element => {
  const accountsQuery = useQuery({ queryKey: ['social', 'accounts'], queryFn: socialApi.listAccounts });
  const [caption, setCaption] = useState('');
  const [imageUrlsRaw, setImageUrlsRaw] = useState('');
  const [selections, setSelections] = useState<Selection[]>([]);
  const [aiTopic, setAiTopic] = useState('');
  const [result, setResult] = useState<PublishResponse | null>(null);

  const imageUrls = useMemo(
    () => imageUrlsRaw.split(/\s+/).map((u) => u.trim()).filter(Boolean),
    [imageUrlsRaw],
  );

  const toggleSelection = (sel: Selection): void => {
    setSelections((current) => {
      const exists = current.find((s) => s.pageId === sel.pageId && s.platform === sel.platform);
      return exists
        ? current.filter((s) => !(s.pageId === sel.pageId && s.platform === sel.platform))
        : [...current, sel];
    });
  };

  const draftMutation = useMutation({
    mutationFn: () => socialApi.draftCaption(aiTopic, undefined),
    onSuccess: (text) => setCaption(text),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      socialApi.publishPost(
        caption,
        imageUrls,
        selections.map((s) => ({ pageId: s.pageId, platform: s.platform }) satisfies PublishTarget),
      ),
    onSuccess: (resp) => setResult(resp),
  });

  const captionRemaining = MAX_CAPTION - caption.length;

  return (
    <Shell title="ახალი პოსტი" subtitle="composer · facebook + instagram">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,360px]">
        <section>
          <Field label="ტექსტი" hint={`${captionRemaining} სიმბოლო დარჩა`}>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={10}
              maxLength={MAX_CAPTION}
              placeholder="დაწერე ან გამოიყენე AI ასისტენტი ქვემოთ →"
              className="w-full resize-y rounded-sm border border-hairline-strong bg-bg-base px-3 py-2 text-body text-fg-primary outline-none focus:border-accent-amber"
            />
          </Field>

          <div className="mt-4 rounded-sm border border-hairline bg-bg-elevated p-4">
            <div className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              ai · sonnet 4.6
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="თემა: slim 70mm ფანჯრები, ფერი ანტრაციტი…"
                className="flex-1 rounded-sm border border-hairline bg-bg-base px-3 py-2 text-body-sm text-fg-primary outline-none focus:border-accent-amber"
              />
              <button
                type="button"
                disabled={draftMutation.isPending || aiTopic.trim().length === 0}
                onClick={() => draftMutation.mutate()}
                className="rounded-sm border border-hairline-strong bg-bg-raised px-4 py-2 font-mono text-caption uppercase tracking-wider text-fg-primary transition-colors hover:bg-bg-overlay disabled:opacity-50"
              >
                {draftMutation.isPending ? 'წერს…' : 'შემოთავაზება'}
              </button>
            </div>
          </div>

          <Field label="სურათების URL-ები" hint="თითო ხაზზე ერთი https:// მისამართი">
            <textarea
              value={imageUrlsRaw}
              onChange={(e) => setImageUrlsRaw(e.target.value)}
              rows={4}
              placeholder={'https://cdn.beqsan.ge/photo-01.jpg\nhttps://cdn.beqsan.ge/photo-02.jpg'}
              className="w-full resize-y rounded-sm border border-hairline-strong bg-bg-base px-3 py-2 font-mono text-body-sm text-fg-primary outline-none focus:border-accent-amber"
            />
          </Field>

          <button
            type="button"
            disabled={publishMutation.isPending || selections.length === 0}
            onClick={() => publishMutation.mutate()}
            className="mt-6 rounded-sm bg-accent-amber px-5 py-2.5 font-headline text-body text-bg-base transition-colors hover:bg-accent-amber-h disabled:opacity-50"
          >
            {publishMutation.isPending ? 'ქვეყნდება…' : `→ ${selections.length} მიზანზე გამოქვეყნება`}
          </button>

          {result ? <ResultBlock result={result} /> : null}
        </section>

        <aside>
          <div className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            სად გამოქვეყნდეს
          </div>
          <ul className="mt-3 divide-y divide-hairline rounded-sm border border-hairline bg-bg-raised">
            {accountsQuery.data?.flatMap((a) =>
              a.pages.map((p) => (
                <li key={p.id} className="px-4 py-3">
                  <div className="text-body-sm text-fg-primary">{p.name}</div>
                  <div className="mt-2 flex gap-3">
                    <PlatformToggle
                      checked={selections.some((s) => s.pageId === p.id && s.platform === 'Facebook')}
                      onChange={() => toggleSelection({ pageId: p.id, platform: 'Facebook' })}
                      label="Facebook"
                    />
                    <PlatformToggle
                      checked={selections.some((s) => s.pageId === p.id && s.platform === 'Instagram')}
                      onChange={() => toggleSelection({ pageId: p.id, platform: 'Instagram' })}
                      disabled={!p.igUserId}
                      label={p.igUserId ? `Instagram · @${p.igUsername ?? ''}` : 'Instagram · არ არის'}
                    />
                  </div>
                </li>
              )),
            )}
            {accountsQuery.data?.length === 0 ? (
              <li className="px-4 py-6 text-center text-body-sm text-fg-tertiary">
                ჯერ ანგარიში არ არის დაკავშირებული.
              </li>
            ) : null}
          </ul>
        </aside>
      </div>
    </Shell>
  );
};

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element => (
  <div className="mt-4 first:mt-0">
    <div className="mb-2 flex items-baseline justify-between">
      <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">{label}</span>
      {hint ? <span className="font-mono text-caption text-fg-tertiary tabular-nums">{hint}</span> : null}
    </div>
    {children}
  </div>
);

const PlatformToggle = ({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}): JSX.Element => (
  <label
    className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
      disabled
        ? 'cursor-not-allowed border-hairline text-fg-disabled'
        : checked
          ? 'border-accent-amber bg-accent-amber/10 text-fg-primary'
          : 'border-hairline-strong text-fg-secondary hover:border-hairline-strong hover:text-fg-primary'
    }`}
  >
    <input type="checkbox" className="hidden" checked={checked} disabled={disabled} onChange={onChange} />
    {label}
  </label>
);

const ResultBlock = ({ result }: { result: PublishResponse }): JSX.Element => (
  <div className="mt-6 rounded-sm border border-hairline bg-bg-elevated p-4">
    <div className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">შედეგი</div>
    <ul className="mt-3 space-y-2">
      {result.posts.map((p, i) => (
        <li key={`${p.pageId}-${p.platform}-${i}`} className="flex items-baseline justify-between gap-3 text-body-sm">
          <span className="text-fg-primary">
            {p.platform} ·{' '}
            <span className="font-mono text-caption text-fg-tertiary">{p.pageId.slice(0, 8)}</span>
          </span>
          <span
            className={`font-mono text-caption uppercase tracking-wider ${
              p.status === 'Published' ? 'text-system-success' : 'text-system-danger'
            }`}
          >
            {p.status === 'Published' ? 'გამოქვეყნდა' : (p.failureReason ?? 'მარცხი')}
          </span>
        </li>
      ))}
    </ul>
  </div>
);
