"use client";

import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnchorHTMLAttributes, forwardRef, useCallback } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> & {
  to: string;
  href?: string;
  className?: string;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, href, ...props }, ref) => (
  <NextLink ref={ref} href={href || to} {...props} />
));

Link.displayName = "Link";

export type NavLinkProps = Omit<LinkProps, "className"> & {
  className?: string | ((state: { isActive: boolean; isPending: boolean }) => string | undefined);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(({ className, to, ...props }, ref) => {
  const pathname = usePathname();
  const isActive = pathname === to;
  const resolvedClassName =
    typeof className === "function" ? className({ isActive, isPending: false }) : className;

  return <Link ref={ref} to={to} className={resolvedClassName} {...props} />;
});

NavLink.displayName = "NavLink";

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number) => {
      if (typeof to === "number") {
        window.history.go(to);
        return;
      }
      router.push(to);
    },
    [router]
  );
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  return { pathname, search, state: undefined as any };
}

export function useParams() {
  const params = useNextParams() || {};
  const pathname = usePathname();
  if ("id" in params) return params as Record<string, string>;

  const segments = pathname.split("/").filter(Boolean);
  return { ...params, id: segments.at(-1) } as Record<string, string | undefined>;
}
