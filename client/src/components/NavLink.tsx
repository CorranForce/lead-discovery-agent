import { Link, LinkProps } from "wouter";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/**
 * NavLink - A reusable navigation link component that prevents nested anchor tags
 * 
 * This component wraps wouter's Link to provide consistent styling and prevent
 * common mistakes like wrapping Links in other interactive elements.
 * 
 * Usage:
 * ```tsx
 * // Basic link
 * <NavLink href="/dashboard">Dashboard</NavLink>
 * 
 * // With custom styling
 * <NavLink href="/profile" className="text-primary">Profile</NavLink>
 * 
 * // As a button-styled link
 * <NavLink href="/settings" variant="button">Settings</NavLink>
 * ```
 */

export interface NavLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** The URL to navigate to (use either href or to) */
  href?: string;
  /** The URL to navigate to (use either href or to) */
  to?: string;
  /** Additional CSS classes to apply */
  className?: string;
  /** Visual variant of the link */
  variant?: "default" | "button" | "ghost" | "muted";
  /** Replace the current history entry instead of adding a new one */
  replace?: boolean;
  /** State to pass to the next location */
  state?: unknown;
  /** Children to render inside the link */
  children: React.ReactNode;
}

const variantStyles = {
  default: "text-foreground hover:text-primary transition-colors",
  button: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors",
  ghost: "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
  muted: "text-muted-foreground hover:text-foreground transition-colors",
};

/**
 * NavLink component that prevents nested anchor tag errors
 * 
 * Key features:
 * - Prevents nesting by using Link directly (no wrapper elements)
 * - Provides consistent styling variants
 * - Type-safe with TypeScript
 * - Forwards refs for advanced use cases
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, variant = "default", children, href, to, replace, state, ...rest }, ref) => {
    const linkProps: any = {
      href: href || to,
      replace,
      state,
      className: cn(variantStyles[variant], className),
    };
    
    return (
      <Link {...linkProps} ref={ref as any} {...rest}>
        {children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";

export default NavLink;
