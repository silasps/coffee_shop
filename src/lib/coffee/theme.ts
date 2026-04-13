import type { CSSProperties } from "react";
import type { StorefrontConfig } from "@/lib/coffee/types";

type Rgb = {
  r: number;
  g: number;
  b: number;
};

const fallbackPrimary = "#e36a2f";
const fallbackSecondary = "#3d2217";
const fallbackAccent = "#f0c067";

function sanitizeHex(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  if (/^#([0-9a-f]{6})$/i.test(normalized)) {
    return normalized.toLowerCase();
  }

  return fallback;
}

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"),
    )
    .join("")}`;
}

function mixHex(colorA: string, colorB: string, weight: number) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);

  return rgbToHex({
    r: a.r * (1 - weight) + b.r * weight,
    g: a.g * (1 - weight) + b.g * weight,
    b: a.b * (1 - weight) + b.b * weight,
  });
}

function alpha(hex: string, opacity: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function buildStoreTheme(store?: Partial<StorefrontConfig> | null): CSSProperties {
  const primary = sanitizeHex(store?.brandPrimaryColor, fallbackPrimary);
  const secondary = sanitizeHex(store?.brandSecondaryColor, fallbackSecondary);
  const accent = sanitizeHex(store?.brandAccentColor, mixHex(primary, fallbackAccent, 0.45));
  const bg = mixHex(primary, "#fff8f1", 0.88);
  const bgStrong = mixHex(primary, "#f2e0d1", 0.78);
  const surfaceStrong = mixHex(primary, "#ffffff", 0.93);
  const surface = alpha(surfaceStrong, 0.82);
  const text = mixHex(secondary, "#170d08", 0.25);
  const muted = mixHex(secondary, "#8f7b70", 0.58);
  const line = alpha(mixHex(secondary, "#ffffff", 0.72), 0.18);
  const espresso = mixHex(secondary, "#2b160d", 0.18);

  return {
    "--bg": bg,
    "--bg-strong": bgStrong,
    "--surface": surface,
    "--surface-strong": surfaceStrong,
    "--text": text,
    "--muted": muted,
    "--line": line,
    "--brand": primary,
    "--brand-strong": mixHex(primary, secondary, 0.42),
    "--espresso": espresso,
    "--tone-amber": accent,
    "--tone-mocha": mixHex(secondary, "#84553e", 0.24),
    "--tone-forest": mixHex(primary, "#47746a", 0.62),
    "--tone-berry": mixHex(primary, "#95595c", 0.58),
    "--tone-cream": mixHex(primary, "#f5e6c8", 0.82),
    background:
      `radial-gradient(circle at top left, ${alpha(accent, 0.22)}, transparent 24%), ` +
      `radial-gradient(circle at 85% 15%, ${alpha(primary, 0.12)}, transparent 22%), ` +
      `linear-gradient(180deg, ${mixHex(primary, "#fffaf5", 0.94)} 0%, ${bg} 42%, ${bgStrong} 100%)`,
  } as CSSProperties;
}
