import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  localeHref: string;
  inverse?: boolean;
  compact?: boolean;
};

export function BrandMark({
  localeHref,
  inverse = false,
  compact = false,
}: BrandMarkProps) {
  return (
    <Link href={localeHref} className="inline-flex items-center gap-4">
      <div
        className={`relative overflow-hidden border border-white/10 bg-[#fff8f1] shadow-lg ${
          compact ? "h-12 w-12 rounded-2xl" : "h-16 w-16 rounded-2xl"
        }`}
      >
        <Image
          src={inverse ? "/brand/logo-dark.png" : "/brand/logo-primary.png"}
          alt="Logo Cafeteria AT"
          fill
          className="object-cover"
        />
      </div>
      <div className={compact ? "space-y-0.5" : "space-y-1"}>
        <p
          className={`font-semibold uppercase tracking-[0.24em] text-[var(--brand-strong)] ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          Cafeteria AT
        </p>
        <p
          className={`display-title font-semibold leading-none text-[var(--espresso)] ${
            compact ? "text-2xl" : "text-3xl"
          }`}
        >
          Coffee Shop
        </p>
      </div>
    </Link>
  );
}
