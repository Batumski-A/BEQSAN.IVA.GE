import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { socialApi, type PublishResponse, type PublishTarget, type SocialPlatform } from './api';
import { AdminLayout } from '../AdminLayout';
import {
  Sparkles,
  Send,
  Image as ImageIcon,
  Facebook,
  Instagram,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Heart,
  Bookmark,
  Globe,
  RefreshCw,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';

type Selection = { pageId: string; platform: SocialPlatform };

const MAX_CAPTION = 2200;

// Pre-defined local high-quality brand images for easy post creation
const IMAGE_PRESETS = [
  { label: 'PVC ფანჯარა', url: '/img/modern-pvc-window.webp' },
  { label: 'ალუმინის სლაიდერი', url: '/img/aluminum-sliding-door.webp' },
  { label: 'ვიტრაჟული ფასადი', url: '/img/panoramic-facade-vitrage.webp' },
  { label: 'მწერიდან დამცავი ბადე', url: '/img/premium-mosquito-net.webp' },
];

export const ComposePage = (): JSX.Element => {
  const accountsQuery = useQuery({ queryKey: ['social', 'accounts'], queryFn: socialApi.listAccounts });
  const [caption, setCaption] = useState('');
  const [imageUrlsRaw, setImageUrlsRaw] = useState('');
  const [selections, setSelections] = useState<Selection[]>([]);
  const [aiTopic, setAiTopic] = useState('');
  const [result, setResult] = useState<PublishResponse | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('Facebook');

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

  const insertPreset = (url: string) => {
    setImageUrlsRaw((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n${url}` : url;
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

  // Active page name for preview purposes
  const selectedPageName = useMemo(() => {
    if (selections.length === 0) return 'BEQSAN';
    const firstSel = selections[0];
    const foundPage = accountsQuery.data
      ?.flatMap((a) => a.pages)
      .find((p) => p.id === firstSel.pageId);
    return foundPage?.name ?? 'BEQSAN';
  }, [selections, accountsQuery.data]);

  return (
    <AdminLayout title="ახალი პოსტი" subtitle="Composer · სოციალური პოსტების მართვა">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px]">
        {/* Composer Form Section */}
        <div className="space-y-6">
          {/* Post Text Area */}
          <Field label="პოსტის ტექსტი" hint={`${captionRemaining} სიმბოლო დარჩა`}>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={8}
              maxLength={MAX_CAPTION}
              placeholder="დაწერე პოსტის შინაარსი აქ, ან გამოიყენე AI ასისტენტი..."
              className="w-full resize-y rounded-xl border border-hairline-strong bg-bg-base/40 backdrop-blur-sm px-4 py-3 text-body-sm text-fg-primary outline-none focus:border-accent-amber transition-colors"
            />
          </Field>

          {/* AI Helper Card */}
          <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm p-5 shadow-sm relative overflow-hidden">
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-accent-amber/5 blur-2xl" />
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-accent-amber animate-pulse" />
              <div className="font-mono text-[10px] uppercase tracking-wider font-bold text-fg-tertiary">
                AI ასისტენტი · BEQSAN Writer
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="თემა: პრემიუმ ალუმინის სლაიდერი, ენერგოეფექტურობა…"
                className="flex-1 rounded-lg border border-hairline bg-bg-base px-3 py-2 text-body-sm text-fg-primary outline-none focus:border-accent-amber transition-colors"
              />
              <button
                type="button"
                disabled={draftMutation.isPending || aiTopic.trim().length === 0}
                onClick={() => draftMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong bg-bg-raised px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-primary transition-all hover:border-accent-amber hover:text-accent-amber active:scale-95 disabled:opacity-50"
              >
                {draftMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    წერს…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    გენერირება
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Image URLs Input */}
          <Field label="სურათების ბმულები" hint="თითო ხაზზე ერთი URL">
            <textarea
              value={imageUrlsRaw}
              onChange={(e) => setImageUrlsRaw(e.target.value)}
              rows={3}
              placeholder={'https://example.com/image.jpg'}
              className="w-full resize-y rounded-xl border border-hairline-strong bg-bg-base/40 backdrop-blur-sm px-4 py-3 font-mono text-body-sm text-fg-primary outline-none focus:border-accent-amber transition-colors"
            />
          </Field>

          {/* Preset Helper Tags */}
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-fg-tertiary mb-2">
              ბრენდის მზა სურათები (Insert Preset)
            </div>
            <div className="flex flex-wrap gap-2">
              {IMAGE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => insertPreset(preset.url)}
                  className="inline-flex items-center gap-1 rounded-full border border-hairline bg-bg-raised/40 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-fg-secondary hover:border-accent-amber hover:text-accent-amber transition-colors"
                >
                  <ImageIcon className="h-3 w-3" />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paste / Gallery Thumbnails Preview */}
          {imageUrls.length > 0 && (
            <div className="rounded-xl border border-hairline-strong bg-bg-elevated/20 p-4">
              <h4 className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary mb-3">
                ატვირთული ფოტოები ({imageUrls.length})
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-hairline group">
                    <img
                      src={url}
                      alt={`Post Attachment ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // fallback image on load error
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="font-mono text-[8px] text-white">#{index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publish Trigger */}
          <div className="pt-4">
            <button
              type="button"
              disabled={publishMutation.isPending || selections.length === 0}
              onClick={() => publishMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-amber px-6 py-3 font-headline text-body font-bold text-bg-base transition-all hover:bg-accent-amber/90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-accent-amber/15"
            >
              {publishMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  მიმდინარეობს გამოქვეყნება…
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  პოსტის გამოქვეყნება ({selections.length} მიზანი)
                </>
              )}
            </button>
          </div>

          {result ? <ResultBlock result={result} /> : null}
        </div>

        {/* Live Sidebar Preview / Target Manager */}
        <aside className="space-y-6">
          {/* Target Pages Manager */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary mb-3">
              გამოსაქვეყნებელი გვერდები
            </div>
            <ul className="divide-y divide-hairline rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm overflow-hidden">
              {accountsQuery.data?.flatMap((a) =>
                a.pages.map((p) => (
                  <li key={p.id} className="p-4 bg-bg-elevated/10">
                    <div className="text-body-sm font-bold text-fg-primary">{p.name}</div>
                    <div className="mt-3 flex gap-2">
                      <PlatformToggle
                        checked={selections.some((s) => s.pageId === p.id && s.platform === 'Facebook')}
                        onChange={() => toggleSelection({ pageId: p.id, platform: 'Facebook' })}
                        label="Facebook"
                        icon={<Facebook className="h-3 w-3 shrink-0" />}
                      />
                      <PlatformToggle
                        checked={selections.some((s) => s.pageId === p.id && s.platform === 'Instagram')}
                        onChange={() => toggleSelection({ pageId: p.id, platform: 'Instagram' })}
                        disabled={!p.igUserId}
                        label="Instagram"
                        icon={<Instagram className="h-3 w-3 shrink-0" />}
                      />
                    </div>
                  </li>
                )),
              )}
              {accountsQuery.isLoading && (
                <li className="p-4 text-center text-body-sm text-fg-tertiary animate-pulse">
                  იძებნება Meta გვერდები...
                </li>
              )}
              {accountsQuery.data?.length === 0 ? (
                <li className="p-6 text-center text-body-sm text-fg-tertiary">
                  ჯერ Meta გვერდები არ გაქვს დაკავშირებული.
                </li>
              ) : null}
            </ul>
          </div>

          {/* Real-time feed mock mockup */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                ლაივ რეჟიმი (Preview)
              </div>
              {/* Tab Toggles */}
              <div className="flex rounded-md border border-hairline bg-bg-base p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('Facebook')}
                  className={`rounded px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                    previewPlatform === 'Facebook'
                      ? 'bg-bg-raised text-fg-primary font-bold'
                      : 'text-fg-tertiary hover:text-fg-secondary'
                  }`}
                >
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('Instagram')}
                  className={`rounded px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                    previewPlatform === 'Instagram'
                      ? 'bg-bg-raised text-fg-primary font-bold'
                      : 'text-fg-tertiary hover:text-fg-secondary'
                  }`}
                >
                  Instagram
                </button>
              </div>
            </div>

            {/* MOCK WRAPPER */}
            <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm overflow-hidden shadow-lg">
              {previewPlatform === 'Facebook' ? (
                <FacebookMockup pageName={selectedPageName} caption={caption} images={imageUrls} />
              ) : (
                <InstagramMockup pageName={selectedPageName} caption={caption} images={imageUrls} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
};

/* --- Component Helpers --- */

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element => (
  <div>
    <div className="mb-2 flex items-baseline justify-between">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">{label}</span>
      {hint ? <span className="font-mono text-[10px] text-fg-tertiary/75 tabular-nums">{hint}</span> : null}
    </div>
    {children}
  </div>
);

const PlatformToggle = ({
  checked,
  onChange,
  label,
  icon,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}): JSX.Element => (
  <label
    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all select-none ${
      disabled
        ? 'cursor-not-allowed border-hairline/40 text-fg-disabled bg-bg-base/10'
        : checked
          ? 'border-accent-amber bg-accent-amber/10 text-fg-primary font-bold shadow-sm'
          : 'border-hairline bg-bg-base/30 text-fg-secondary hover:border-hairline-strong hover:text-fg-primary'
    }`}
  >
    <input type="checkbox" className="hidden" checked={checked} disabled={disabled} onChange={onChange} />
    {icon}
    {label}
  </label>
);

const ResultBlock = ({ result }: { result: PublishResponse }): JSX.Element => (
  <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-5">
    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary mb-3 flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-system-success animate-pulse" />
      გამოქვეყნების რეპორტი
    </div>
    <ul className="space-y-2">
      {result.posts.map((p, i) => (
        <li
          key={`${p.pageId}-${p.platform}-${i}`}
          className="flex items-center justify-between p-2 rounded-lg border border-hairline bg-bg-base/35 text-body-sm"
        >
          <span className="flex items-center gap-2 font-medium text-fg-primary">
            {p.platform === 'Facebook' ? (
              <Facebook className="h-4 w-4 text-[#1877F2]" />
            ) : (
              <Instagram className="h-4 w-4 text-[#c32aa3]" />
            )}
            {p.platform} · <span className="font-mono text-[10px] text-fg-tertiary">{p.pageId.slice(0, 8)}</span>
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider font-bold ${
              p.status === 'Published' ? 'text-system-success' : 'text-system-danger'
            }`}
          >
            {p.status === 'Published' ? 'წარმატებული' : (p.failureReason ?? 'შეცდომა')}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

/* --- MOCK DESIGN PANELS --- */

const FacebookMockup = ({
  pageName,
  caption,
  images,
}: {
  pageName: string;
  caption: string;
  images: string[];
}): JSX.Element => {
  return (
    <div className="bg-bg-elevated p-4 text-fg-primary">
      {/* FB Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-amber text-bg-base font-headline text-body-sm font-bold shadow-md">
            {pageName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-body-sm font-bold text-fg-primary leading-tight">{pageName}</div>
            <div className="flex items-center gap-1 mt-0.5 font-mono text-[9px] text-fg-tertiary">
              ახლახანს · <Globe className="h-2.5 w-2.5" />
            </div>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-fg-tertiary" />
      </div>

      {/* Post Text */}
      <p className="text-body-sm text-fg-primary whitespace-pre-wrap leading-relaxed mb-3">
        {caption || 'პოსტის ტექსტის დემო...'}
      </p>

      {/* Attachment Image */}
      {images.length > 0 ? (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-hairline bg-bg-base/40">
          <img
            src={images[0]}
            alt="Facebook Feed Preview"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400';
            }}
          />
          {images.length > 1 && (
            <div className="absolute right-3 bottom-3 rounded-md bg-black/75 px-2 py-1 font-mono text-[9px] text-white">
              +{images.length - 1} ფოტო
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video w-full rounded-lg border border-dashed border-hairline flex flex-col items-center justify-center text-fg-tertiary bg-bg-base/10">
          <ImageIcon className="h-6 w-6 opacity-40 mb-1" />
          <span className="text-[10px] font-mono uppercase tracking-wider">ფოტო არ არის მითითებული</span>
        </div>
      )}

      {/* Divider */}
      <div className="h-[1px] bg-hairline my-3.5" />

      {/* Action Buttons */}
      <div className="grid grid-cols-3 text-center font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
        <div className="flex items-center justify-center gap-1.5 py-1 hover:text-fg-secondary cursor-pointer">
          <ThumbsUp className="h-3.5 w-3.5" />
          მოწონება
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1 hover:text-fg-secondary cursor-pointer">
          <MessageCircle className="h-3.5 w-3.5" />
          კომენტარი
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1 hover:text-fg-secondary cursor-pointer">
          <Share2 className="h-3.5 w-3.5" />
          გაზიარება
        </div>
      </div>
    </div>
  );
};

const InstagramMockup = ({
  pageName,
  caption,
  images,
}: {
  pageName: string;
  caption: string;
  images: string[];
}): JSX.Element => {
  const displayUsername = pageName.toLowerCase().replace(/\s+/g, '_');
  return (
    <div className="bg-bg-elevated text-fg-primary flex flex-col">
      {/* IG Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-hairline/40">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white p-[1px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-elevated font-headline text-[9px] font-bold">
              {pageName.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <span className="text-[11px] font-semibold tracking-tight text-fg-primary">@{displayUsername}</span>
        </div>
        <MoreHorizontal className="h-4 w-4 text-fg-tertiary" />
      </div>

      {/* Feed Image */}
      {images.length > 0 ? (
        <div className="relative aspect-square w-full bg-bg-base/40">
          <img
            src={images[0]}
            alt="Instagram Feed Preview"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400';
            }}
          />
          {images.length > 1 && (
            <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[8px] text-white">
              1/{images.length}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-square w-full border-b border-dashed border-hairline flex flex-col items-center justify-center text-fg-tertiary bg-bg-base/10">
          <ImageIcon className="h-8 w-8 opacity-40 mb-1" />
          <span className="text-[10px] font-mono uppercase tracking-wider">ფოტო არ არის მითითებული</span>
        </div>
      )}

      {/* IG Actions */}
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-fg-primary hover:text-system-danger hover:fill-system-danger transition-colors cursor-pointer" />
          <MessageCircle className="h-5 w-5 text-fg-primary hover:text-fg-secondary cursor-pointer" />
          <Share2 className="h-5 w-5 text-fg-primary hover:text-fg-secondary cursor-pointer" />
        </div>
        <Bookmark className="h-5 w-5 text-fg-primary hover:text-fg-secondary cursor-pointer" />
      </div>

      {/* Likes */}
      <div className="px-3.5 font-mono text-[9px] uppercase tracking-wider font-bold text-fg-primary mb-1">
        Liked by sandro and others
      </div>

      {/* Caption block */}
      <div className="px-3.5 pb-4 text-body-sm leading-relaxed text-fg-primary">
        <span className="font-semibold text-[11px] tracking-tight mr-1.5 text-fg-primary">@{displayUsername}</span>
        {caption || 'პოსტის ტექსტის დემო...'}
      </div>
    </div>
  );
};

