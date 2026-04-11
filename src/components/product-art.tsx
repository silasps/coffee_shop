type ProductArtProps = {
  title: string;
  tone: "amber" | "mocha" | "forest" | "berry" | "cream";
  size?: "default" | "compact" | "thumb";
};

const toneStyles = {
  amber:
    "linear-gradient(135deg, rgba(240, 192, 103, 0.88), rgba(219, 121, 62, 0.92))",
  mocha:
    "linear-gradient(135deg, rgba(79, 44, 31, 0.92), rgba(155, 99, 73, 0.88))",
  forest:
    "linear-gradient(135deg, rgba(72, 125, 110, 0.92), rgba(191, 221, 214, 0.66))",
  berry:
    "linear-gradient(135deg, rgba(145, 76, 82, 0.94), rgba(224, 171, 167, 0.8))",
  cream:
    "linear-gradient(135deg, rgba(245, 230, 200, 0.96), rgba(255, 255, 255, 0.92))",
};

export function ProductArt({
  title,
  tone,
  size = "default",
}: ProductArtProps) {
  const showBadge = size !== "thumb";
  const showBackdropInitials = size !== "thumb";
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((item) => item[0])
    .join("");

  return (
    <div
      className={`relative flex overflow-hidden text-white ${
        size === "thumb"
          ? "h-16 w-16 items-center justify-center rounded-[18px] p-2"
          : size === "compact"
            ? "h-24 w-24 items-end rounded-[20px] p-3"
            : "h-36 items-end rounded-[24px] p-4"
      }`}
      style={{ background: toneStyles[tone] }}
    >
      {showBadge ? (
        <div
          className={`absolute rounded-full border border-white/25 font-semibold uppercase tracking-[0.18em] text-white/80 ${
            size === "compact"
              ? "right-2 top-2 px-2 py-0.5 text-[10px]"
              : "right-3 top-3 px-3 py-1 text-[10px]"
          }`}
        >
          AT
        </div>
      ) : null}
      {showBackdropInitials ? (
        <div
          className={`absolute inset-y-0 left-[-16px] flex items-center font-semibold opacity-[0.12] ${
            size === "compact" ? "text-[56px]" : "text-[96px]"
          }`}
        >
          {initials}
        </div>
      ) : null}
      <div
        className={`relative z-10 ${
          size === "thumb"
            ? "max-w-[56px] text-center"
            : size === "compact"
              ? "max-w-[88px]"
              : "max-w-[180px]"
        }`}
      >
        <p
          className={`display-title leading-none ${
            size === "thumb"
              ? "line-clamp-3 text-[11px]"
              : size === "compact"
                ? "text-lg"
                : "text-2xl"
          }`}
        >
          {title}
        </p>
      </div>
    </div>
  );
}
