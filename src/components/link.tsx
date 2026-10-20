import { Link as RouterLink, type LinkProps } from "react-router";

/** In-site link. Takes `href` like a plain anchor; pages load without a full reload. */
export default function Link({ href, ...rest }: Omit<LinkProps, "to"> & { href: string }) {
  return <RouterLink to={href} {...rest} />;
}
