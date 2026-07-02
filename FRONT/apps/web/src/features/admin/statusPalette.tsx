/**
 * Shared status palette for the admin surfaces. Single source of truth so
 * Orders / Warranties / Reports all use the same chip styling.
 *
 * Design-system constraint: only the tokens from tailwind.config (accent,
 * system, mat, fg) — no raw `bg-blue-500`, no purple. Purple is explicitly
 * forbidden as a primary palette colour ("❌ no purple as primary" in
 * .claude/skills/design-system/SKILL.md).
 *
 * Workshop semantics:
 *  - Pending      → amber (open, awaiting human action)
 *  - Confirmed    → system-info (manager acknowledged)
 *  - InProduction → mat-aluminum (literally in the workshop — brushed steel)
 *  - Ready        → system-success (production complete)
 *  - Delivered    → fg-tertiary (archived, success state of the funnel)
 *  - Cancelled    → system-danger (terminal failure)
 *
 * Warranties reuse the same vocabulary:
 *  - Active   → success, Expired → fg-tertiary, Claimed → danger, Resolved → info.
 */
import type { OrderStatus, WarrantyStatus } from './api';

export type StatusKey = OrderStatus | WarrantyStatus;

/** Full chip className — border + background + foreground in one. */
export const STATUS_CHIP: Record<StatusKey, string> = {
  Pending: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  Confirmed: 'bg-system-info/15 text-system-info border-system-info/30',
  InProduction: 'bg-mat-aluminum/15 text-mat-aluminum border-mat-aluminum/40',
  Ready: 'bg-system-success/15 text-system-success border-system-success/30',
  Delivered: 'bg-fg-tertiary/10 text-fg-tertiary border-hairline-strong',
  Cancelled: 'bg-system-danger/15 text-system-danger border-system-danger/30',
  Active: 'bg-system-success/15 text-system-success border-system-success/30',
  Expired: 'bg-fg-tertiary/10 text-fg-tertiary border-hairline-strong',
  Claimed: 'bg-system-danger/15 text-system-danger border-system-danger/30',
  Resolved: 'bg-system-info/15 text-system-info border-system-info/30',
};

/** Just the foreground colour class — useful for icons and progress bars. */
export const STATUS_FG: Record<StatusKey, string> = {
  Pending: 'text-accent-amber',
  Confirmed: 'text-system-info',
  InProduction: 'text-mat-aluminum',
  Ready: 'text-system-success',
  Delivered: 'text-fg-tertiary',
  Cancelled: 'text-system-danger',
  Active: 'text-system-success',
  Expired: 'text-fg-tertiary',
  Claimed: 'text-system-danger',
  Resolved: 'text-system-info',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  Pending: 'მოლოდინში',
  Confirmed: 'დადასტურებული',
  InProduction: 'წარმოებაში',
  Ready: 'მზადაა',
  Delivered: 'ჩაბარებული',
  Cancelled: 'გაუქმდა',
};

export const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  Active: 'მოქმედი',
  Expired: 'ვადაგასული',
  Claimed: 'პრეტენზია',
  Resolved: 'მოგვარდა',
};

/** Reusable skeleton-block primitive — design rule: never spinners on empty screens. */
export const SkeletonBlock = ({
  className = '',
}: {
  className?: string;
}): JSX.Element => (
  <div
    className={`animate-pulse rounded-md bg-bg-raised/60 ${className}`}
    role="presentation"
    aria-hidden="true"
  />
);
