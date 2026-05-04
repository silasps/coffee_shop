import { buildStoreTheme } from "@/lib/coffee/theme";
import { PublicHeader } from "@/components/public-header";
import type { Locale, StorefrontConfig } from "@/lib/coffee/types";

type StorefrontShellProps = {
  locale: Locale;
  store: StorefrontConfig;
  children: React.ReactNode;
  padBottom?: boolean;
};

export function StorefrontShell({
  locale,
  store,
  children,
  padBottom = true,
}: StorefrontShellProps) {
  return (
    <main
      data-global-action-feedback="off"
      className={padBottom ? "min-h-screen pb-12" : "min-h-screen"}
      style={buildStoreTheme(store)}
    >
      <PublicHeader locale={locale} store={store} />
      {children}
    </main>
  );
}
