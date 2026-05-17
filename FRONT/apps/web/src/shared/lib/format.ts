// Georgian number / date / dimension formatting helpers.
// Mirrors the rules in .claude/skills/georgian-ux/SKILL.md.

const georgianFormatter = new Intl.NumberFormat('ka-GE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const priceFormatter = new Intl.NumberFormat('ka-GE', {
  style: 'currency',
  currency: 'GEL',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateLongFormatter = new Intl.DateTimeFormat('ka-GE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const time24Formatter = new Intl.DateTimeFormat('ka-GE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const NBSP = ' ';

/** ფასი: "1 234,56 ₾" */
export const formatPrice = (amount: number): string => priceFormatter.format(amount);

/** რიცხვი ქართული ფორმატით: "1 234,56" */
export const formatNumber = (n: number): string => georgianFormatter.format(n);

/** ზომა ერთეულით: "120 სმ", "1 200 მმ", "2,4 მ²" */
export const formatDimension = (value: number, unit: 'mm' | 'cm' | 'm' | 'sqm'): string => {
  const formatted = georgianFormatter.format(value);
  const label = { mm: 'მმ', cm: 'სმ', m: 'მ', sqm: 'მ²' }[unit];
  return `${formatted}${NBSP}${label}`;
};

/** თარიღი: "17 მაისი, 2026" */
export const formatDate = (date: Date): string => dateLongFormatter.format(date);

/** დრო: "15:42" (24-hour) */
export const formatTime = (date: Date): string => time24Formatter.format(date);
