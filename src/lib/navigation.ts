import { useLocation, useNavigate, useRevalidator, useSearchParams as useRouterSearchParams } from "react-router";

/** Browser-side navigation for client components. */
export function useRouter() {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, { replace: true }),
    /** Re-runs the current page's loaders (e.g. after signing in or saving). */
    refresh: () => { void revalidate(); },
  };
}

export const usePathname = () => useLocation().pathname;
export const useSearchParams = () => useRouterSearchParams()[0];
