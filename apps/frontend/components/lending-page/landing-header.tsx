"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, ExternalLink, Moon, Sun, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import CornerIcons from "@/components/ui/corners";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "#" },
  { label: "Templates", href: "#" },
  { label: "Docs", href: "#" },
  { label: "Pricing", href: "#" },
];

const PROFILE_ITEMS = [
  {
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 6l-10 7L2 6" />
      </svg>
    ),
    label: "Email",
    badge: null,
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    label: "X (Twitter)",
    badge: "Active",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    label: "GitHub",
    badge: null,
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    label: "LinkedIn",
    badge: null,
  },
];

function ThemeToggleBtn() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return <div className="size-10" />;
  }
  const isDark = theme === "dark";
  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active hover:bg-accent-primary hover:text-accent-on size-10"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export default function LandingHeader() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    /* Outer: full-width fixed, handles scroll padding */
    <div className="pointer-events-none fixed top-0 right-0 left-0 z-50">
      <motion.div
        className="pointer-events-auto"
        animate={{
          paddingTop: scrolled ? 14 : 0,
          paddingLeft: scrolled ? 24 : 0,
          paddingRight: scrolled ? 24 : 0,
        }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <header
          className={cn(
            "h-[72px] w-full",
            "transition-[background-color,border-color,box-shadow] duration-[350ms]",
            scrolled
              ? "bg-bg-canvas/85 border-text-primary dark:border-border-stamp border-[1.5px] shadow-[6px_6px_0_0_var(--hard-shadow-color)] backdrop-blur-xl"
              : "bg-bg-canvas/80 border-border-subtle border-b-[1.5px] backdrop-blur-md"
          )}
        >
          <div className="section-container flex h-full items-center gap-8 py-3">
            {/* Logo */}
            <button
              onClick={() => router.push("/")}
              className="group flex shrink-0 cursor-pointer items-center gap-2.5"
              aria-label="FLOW home"
            >
              <span className="btn-stamp bg-accent-primary text-accent-on size-7 shadow-[2px_2px_0_0_var(--hard-shadow-color)] transition-shadow duration-[150ms] group-hover:shadow-[3px_3px_0_0_var(--hard-shadow-color)]">
                <Zap className="size-3.5 fill-current" aria-hidden="true" />
              </span>
              <span className="text-body-md text-text-primary font-bold tracking-tight">
                FLOW
              </span>
            </button>

            {/* Nav links */}
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Primary"
            >
              {NAV_LINKS.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.12 }}
                  className="text-body-sm text-text-secondary hover:text-text-primary hover:bg-accent-subtle group relative rounded-sm px-3 py-1.5 font-medium transition-colors duration-[150ms]"
                >
                  {link.label}
                  <span className="bg-text-brand absolute right-3 bottom-0 left-3 h-px origin-left scale-x-0 transition-transform duration-[200ms] group-hover:scale-x-100" />
                </motion.a>
              ))}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggleBtn />

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  className={cn(
                    "btn-stamp btn-stamp-primary hover:btn-stamp-primary-hover active:btn-stamp-active",
                    "text-body-sm h-10 px-3.5",
                    profileOpen && "btn-stamp-hover"
                  )}
                >
                  <span className="bg-accent-on text-accent-primary flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                    AS
                  </span>
                  <span className="hidden sm:inline">Profile</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-[200ms]",
                      profileOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="overlay-surface absolute top-full right-0 z-50 mt-3 w-[280px] p-2"
                    >
                      <CornerIcons size="md" />
                      {PROFILE_ITEMS.map((item) => (
                        <a
                          key={item.label}
                          href="#"
                          role="menuitem"
                          className="text-body-sm text-text-primary hover:bg-bg-canvas group relative flex items-center gap-3 px-3 py-2.5 font-medium transition-colors duration-[120ms]"
                        >
                          <span className="text-text-primary grid size-[18px] place-items-center">
                            {item.icon}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="bg-accent-primary text-accent-on border-border-stamp border px-1 py-0.5 text-[8px] font-bold tracking-[0.08em] uppercase">
                              {item.badge}
                            </span>
                          )}
                          <ExternalLink className="text-text-muted size-3" />
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => router.push("/workflows/new")}
                className="btn-stamp btn-stamp-primary hover:btn-stamp-primary-hover hover:btn-stamp-hover active:btn-stamp-active text-body-sm hidden h-10 px-4 sm:inline-flex"
              >
                <Zap className="size-3.5" />
                Get started
              </button>
            </div>
          </div>
        </header>
      </motion.div>
    </div>
  );
}
