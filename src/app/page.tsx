import { redirect } from "next/navigation";
import { buildStorePath, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";

export default function RootRedirectPage() {
  redirect(buildStorePath(DEFAULT_STORE_SLUG, "pt"));
}
