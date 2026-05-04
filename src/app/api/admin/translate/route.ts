import { NextResponse } from "next/server";

const supportedLocales = ["pt", "en", "es"] as const;

type SupportedLocale = (typeof supportedLocales)[number];

function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && supportedLocales.includes(value as SupportedLocale);
}

async function translateOne(text: string, from: SupportedLocale, to: SupportedLocale) {
  const params = new URLSearchParams({
    q: text,
    langpair: `${from}|${to}`,
  });

  const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    responseData?: {
      translatedText?: string;
    };
  };

  return data.responseData?.translatedText?.trim() || null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
    from?: unknown;
    to?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const from = body?.from;
  const to = Array.isArray(body?.to) ? body.to : [];

  if (!text || text.length > 800 || !isSupportedLocale(from)) {
    return NextResponse.json({ translations: {} }, { status: 400 });
  }

  const targetLocales = to.filter(
    (locale): locale is SupportedLocale => isSupportedLocale(locale) && locale !== from,
  );
  const entries = await Promise.all(
    targetLocales.map(async (locale) => [locale, await translateOne(text, from, locale)] as const),
  );
  const translations = Object.fromEntries(
    entries.filter((entry): entry is readonly [SupportedLocale, string] => Boolean(entry[1])),
  );

  return NextResponse.json({ translations });
}
