import type { CSSProperties } from "react";
import type { MenuAreaSlug } from "@/lib/coffee/types";

type ArtTone = "amber" | "mocha" | "forest" | "berry" | "cream";

type ProductArtProps = {
  title: string;
  tone: ArtTone;
  size?: "default" | "compact" | "thumb" | "column";
  area?: MenuAreaSlug;
  imageUrl?: string | null;
};

type SectionArtProps = {
  label: string;
  imageUrl?: string | null;
  area?: MenuAreaSlug;
  tone?: ArtTone;
};

type ArtMotif =
  | "hot-drink"
  | "cold-drink"
  | "juice"
  | "sandwich"
  | "croissant"
  | "cake"
  | "wrap"
  | "snack";

type ScenePalette = {
  background: string;
  glow: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  detail: string;
  shadow: string;
};

const scenePalettes: Record<ArtTone, ScenePalette> = {
  amber: {
    background:
      "radial-gradient(circle at 22% 18%, rgba(255, 240, 214, 0.92), transparent 30%), linear-gradient(145deg, #8a573a 0%, #d99a58 42%, #5a3424 100%)",
    glow: "rgba(255, 236, 201, 0.52)",
    surface: "#fff3e1",
    primary: "#f4c27d",
    secondary: "#a55f3d",
    accent: "#ffe5be",
    detail: "#fffaf3",
    shadow: "#4a2819",
  },
  mocha: {
    background:
      "radial-gradient(circle at 24% 16%, rgba(241, 214, 194, 0.28), transparent 28%), linear-gradient(145deg, #3f2218 0%, #7a4836 45%, #b67f63 100%)",
    glow: "rgba(239, 210, 189, 0.42)",
    surface: "#f8e9de",
    primary: "#fff0e4",
    secondary: "#bf8468",
    accent: "#f8d1b9",
    detail: "#fff8f2",
    shadow: "#2b140d",
  },
  forest: {
    background:
      "radial-gradient(circle at 18% 20%, rgba(225, 246, 236, 0.34), transparent 26%), linear-gradient(145deg, #32594c 0%, #5f8d78 44%, #bdd8c8 100%)",
    glow: "rgba(221, 245, 231, 0.46)",
    surface: "#effaf5",
    primary: "#dff6ec",
    secondary: "#74a289",
    accent: "#f4fff9",
    detail: "#ffffff",
    shadow: "#20352e",
  },
  berry: {
    background:
      "radial-gradient(circle at 20% 18%, rgba(255, 225, 225, 0.34), transparent 28%), linear-gradient(145deg, #6f3740 0%, #a35d68 46%, #deaaa5 100%)",
    glow: "rgba(255, 229, 227, 0.42)",
    surface: "#fff0f0",
    primary: "#ffe5e5",
    secondary: "#cf7d87",
    accent: "#fff6f6",
    detail: "#ffffff",
    shadow: "#431b21",
  },
  cream: {
    background:
      "radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.9), transparent 28%), linear-gradient(145deg, #d8c4a5 0%, #f5e7d0 48%, #b79472 100%)",
    glow: "rgba(255, 255, 255, 0.65)",
    surface: "#fffaf2",
    primary: "#fff4e4",
    secondary: "#d4a67c",
    accent: "#fffdf9",
    detail: "#ffffff",
    shadow: "#6d4a34",
  },
};

const motifToneMap: Record<ArtMotif, ArtTone> = {
  "hot-drink": "mocha",
  "cold-drink": "cream",
  juice: "forest",
  sandwich: "amber",
  croissant: "amber",
  cake: "berry",
  wrap: "cream",
  snack: "mocha",
};

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferMotif(label: string, area?: MenuAreaSlug): ArtMotif {
  const normalized = normalizeLabel(label);

  if (normalized.includes("croissant")) {
    return "croissant";
  }

  if (
    normalized.includes("bolo") ||
    normalized.includes("cake") ||
    normalized.includes("brownie") ||
    normalized.includes("dessert") ||
    normalized.includes("sobremesa") ||
    normalized.includes("torta")
  ) {
    return "cake";
  }

  if (
    normalized.includes("tapioca") ||
    normalized.includes("crepioca") ||
    normalized.includes("wrap")
  ) {
    return "wrap";
  }

  if (
    normalized.includes("sand") ||
    normalized.includes("toast") ||
    normalized.includes("grilled") ||
    normalized.includes("bacon egg")
  ) {
    return "sandwich";
  }

  if (
    normalized.includes("suco") ||
    normalized.includes("juice") ||
    normalized.includes("vitamina") ||
    normalized.includes("laranja") ||
    normalized.includes("abacaxi") ||
    normalized.includes("morango")
  ) {
    return "juice";
  }

  if (
    normalized.includes("gelad") ||
    normalized.includes("iced") ||
    normalized.includes("cold") ||
    normalized.includes("shake") ||
    normalized.includes("frappe") ||
    normalized.includes("frape") ||
    normalized.includes("frio") ||
    normalized.includes("soda") ||
    normalized.includes("limonada")
  ) {
    return "cold-drink";
  }

  if (
    normalized.includes("cafe") ||
    normalized.includes("espresso") ||
    normalized.includes("cappuccino") ||
    normalized.includes("latte") ||
    normalized.includes("cha") ||
    normalized.includes("tea") ||
    normalized.includes("mocha") ||
    normalized.includes("chocolate") ||
    normalized.includes("quente") ||
    normalized.includes("hot")
  ) {
    return "hot-drink";
  }

  if (
    normalized.includes("coxinha") ||
    normalized.includes("kibe") ||
    normalized.includes("risoles") ||
    normalized.includes("esfiha") ||
    normalized.includes("salgad") ||
    normalized.includes("food") ||
    normalized.includes("comida") ||
    normalized.includes("frito") ||
    normalized.includes("baked") ||
    normalized.includes("bread")
  ) {
    return "snack";
  }

  if (area === "foods") {
    return "snack";
  }

  if (area === "cold-drinks") {
    return "cold-drink";
  }

  return "hot-drink";
}

function toBackgroundImage(url: string): CSSProperties["backgroundImage"] {
  const safeUrl = url.replace(/"/g, '\\"');
  return `url("${safeUrl}")`;
}

function getSectionTone(label: string, area?: MenuAreaSlug, tone?: ArtTone) {
  if (tone) {
    return tone;
  }

  const motif = inferMotif(label, area);
  return motifToneMap[motif];
}

function FallbackPhoto({
  motif,
  palette,
}: {
  motif: ArtMotif;
  palette: ScenePalette;
}) {
  const subjectShadow = {
    filter: "drop-shadow(0 16px 24px rgba(28, 14, 8, 0.22))",
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 160"
      className="absolute inset-0 h-full w-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="32" cy="34" r="18" fill={palette.glow} opacity="0.6" />
      <circle cx="126" cy="30" r="10" fill={palette.glow} opacity="0.4" />
      <circle cx="136" cy="118" r="14" fill={palette.glow} opacity="0.24" />
      <ellipse cx="82" cy="128" rx="44" ry="12" fill={palette.shadow} opacity="0.16" />

      {motif === "hot-drink" ? (
        <>
          <g style={subjectShadow}>
            <ellipse cx="80" cy="118" rx="34" ry="9" fill={palette.shadow} opacity="0.18" />
            <path d="M50 58h44v36c0 12-10 22-22 22S50 106 50 94V58Z" fill={palette.primary} />
            <path d="M94 70h12c11 0 11 20 0 20H94" stroke={palette.accent} strokeWidth="8" />
            <path d="M44 112h58c-7 9-16 13-29 13s-22-4-29-13Z" fill={palette.surface} />
          </g>
          <path d="M60 32c7 10 8 20 1 30" stroke={palette.detail} strokeWidth="6" opacity="0.72" />
          <path d="M78 24c8 12 9 22 1 33" stroke={palette.detail} strokeWidth="6" opacity="0.76" />
          <path d="M95 34c6 10 7 18 1 26" stroke={palette.detail} strokeWidth="6" opacity="0.72" />
        </>
      ) : null}

      {motif === "cold-drink" ? (
        <>
          <g style={subjectShadow}>
            <path d="M56 38h48l-9 73H65l-9-73Z" fill={palette.primary} opacity="0.96" />
            <path d="M62 50h36l-6 51H68l-6-51Z" fill={palette.secondary} opacity="0.5" />
            <rect x="68" y="58" width="10" height="12" rx="3" fill={palette.accent} opacity="0.58" />
            <rect x="80" y="70" width="11" height="13" rx="3" fill={palette.detail} opacity="0.6" />
            <path d="M80 22v22" stroke={palette.detail} strokeWidth="7" />
            <path d="M80 24l13-8" stroke={palette.detail} strokeWidth="7" />
            <circle cx="116" cy="54" r="12" fill={palette.accent} opacity="0.46" />
            <path d="M116 42v24M104 54h24" stroke={palette.detail} strokeWidth="4" opacity="0.65" />
          </g>
        </>
      ) : null}

      {motif === "juice" ? (
        <>
          <g style={subjectShadow}>
            <path d="M58 42h44l-7 68H65l-7-68Z" fill={palette.primary} />
            <path d="M65 48h30l-5 56H70l-5-56Z" fill={palette.secondary} opacity="0.42" />
            <path d="M80 24v20" stroke={palette.detail} strokeWidth="7" />
            <circle cx="116" cy="52" r="16" fill={palette.accent} />
            <circle cx="116" cy="52" r="11" fill="none" stroke={palette.detail} strokeWidth="5" opacity="0.7" />
            <path d="M116 36v32M100 52h32" stroke={palette.detail} strokeWidth="3.5" opacity="0.7" />
          </g>
        </>
      ) : null}

      {motif === "sandwich" ? (
        <>
          <g style={subjectShadow}>
            <path d="M42 84c6-18 20-30 39-30s33 12 39 30H42Z" fill={palette.primary} />
            <rect x="46" y="84" width="68" height="10" rx="5" fill={palette.detail} />
            <rect x="49" y="94" width="62" height="9" rx="4.5" fill={palette.secondary} opacity="0.88" />
            <path d="M53 58c7-9 17-14 28-14s21 5 28 14H53Z" fill={palette.surface} />
            <path d="M53 88c8-6 16-9 28-9s20 3 28 9" stroke={palette.accent} strokeWidth="5" opacity="0.6" />
          </g>
        </>
      ) : null}

      {motif === "croissant" ? (
        <>
          <g style={subjectShadow}>
            <path
              d="M41 96c2-24 18-42 39-45 18-2 33 6 41 21-11 1-20 5-27 13-7 8-11 18-11 31-16 2-28-1-36-8-4-3-6-6-6-12Z"
              fill={palette.primary}
            />
            <path d="M55 86c11 8 23 12 37 10" stroke={palette.secondary} strokeWidth="7" opacity="0.6" />
            <path d="M66 70c9 7 18 10 29 10" stroke={palette.secondary} strokeWidth="6" opacity="0.52" />
          </g>
        </>
      ) : null}

      {motif === "cake" ? (
        <>
          <g style={subjectShadow}>
            <path d="M54 112h58L94 58H73L54 112Z" fill={palette.primary} />
            <path d="M70 70h28l8 42H62l8-42Z" fill={palette.secondary} opacity="0.46" />
            <path d="M72 58c4-11 11-16 19-16 8 0 15 5 19 16" fill={palette.detail} opacity="0.92" />
            <circle cx="84" cy="38" r="6" fill={palette.accent} />
            <path d="M84 30v-12" stroke={palette.detail} strokeWidth="4" />
          </g>
        </>
      ) : null}

      {motif === "wrap" ? (
        <>
          <g style={subjectShadow}>
            <path
              d="M48 108c10-28 28-44 52-44 11 0 22 3 33 10-6 20-20 38-41 45-18 6-32 2-44-11Z"
              fill={palette.primary}
            />
            <path d="M64 91c14-5 28-4 43 5" stroke={palette.secondary} strokeWidth="7" opacity="0.56" />
            <path d="M72 76c7 6 17 10 28 12" stroke={palette.accent} strokeWidth="5" opacity="0.72" />
          </g>
        </>
      ) : null}

      {motif === "snack" ? (
        <>
          <g style={subjectShadow}>
            <path d="M80 40c18 0 28 18 28 37 0 26-16 39-28 39s-28-13-28-39c0-19 10-37 28-37Z" fill={palette.primary} />
            <path d="M80 48c9 10 15 20 15 34 0 18-8 27-15 27s-15-9-15-27c0-14 6-24 15-34Z" fill={palette.secondary} opacity="0.38" />
            <circle cx="80" cy="35" r="8" fill={palette.accent} />
          </g>
        </>
      ) : null}
    </svg>
  );
}

export function ProductArt({
  title,
  tone,
  size = "default",
  area,
  imageUrl,
}: ProductArtProps) {
  const motif = inferMotif(title, area);
  const palette = scenePalettes[tone];
  const hasPhoto = Boolean(imageUrl);

  return (
    <div
      role="img"
      aria-label={title}
      className={`relative overflow-hidden border border-white/24 shadow-[0_16px_32px_rgba(61,34,23,0.14)] ${
        size === "thumb"
          ? "h-16 w-16 rounded-[18px]"
          : size === "compact"
            ? "aspect-square w-full rounded-[22px]"
            : size === "column"
              ? "h-full min-h-[168px] w-full rounded-[24px]"
            : "aspect-[5/4] w-full rounded-[28px]"
      }`}
    >
      <div className="absolute inset-0" style={{ background: palette.background }} />

      {hasPhoto ? (
        <div
          className="absolute inset-0 scale-[1.03]"
          style={{
            backgroundImage: toBackgroundImage(imageUrl as string),
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      ) : (
        <FallbackPhoto motif={motif} palette={palette} />
      )}

      <div
        className="absolute inset-0"
        style={{
          background: hasPhoto
            ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(28,16,10,0.22))"
            : "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.18), transparent 30%)",
        }}
      />
    </div>
  );
}

export function SectionArt({
  label,
  imageUrl,
  area,
  tone,
}: SectionArtProps) {
  const motif = inferMotif(label, area);
  const palette = scenePalettes[getSectionTone(label, area, tone)];
  const hasPhoto = Boolean(imageUrl);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: palette.background }} />

      {hasPhoto ? (
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: toBackgroundImage(imageUrl as string),
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      ) : (
        <FallbackPhoto motif={motif} palette={palette} />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,16,10,0.2),rgba(28,16,10,0.68))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.18),transparent_30%)]" />
    </div>
  );
}
