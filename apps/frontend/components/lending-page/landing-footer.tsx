"use client";

import { useState } from "react";
import { motion } from "motion/react";

import AppLogo from "@/components/ui/app-logo";

const SOCIALS = [
  {
    label: "Email",
    icon: (
      <svg
        width="18"
        height="18"
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
  },
  {
    label: "X",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
] as const;

export default function LandingFooter() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <footer className="bg-bg-surface border-text-primary dark:border-border-stamp border-t-[1.5px]">
      <div className="section-container py-16">
        <div className="flex flex-col gap-12 md:flex-row md:gap-20">
          {/* Left: brand + subscribe */}
          <div className="max-w-sm flex-1">
            {/* Logo */}
            <AppLogo className="mb-5" />

            <p className="text-body-sm text-text-secondary mb-6 leading-relaxed">
              Release notes and the occasional &ldquo;we shipped this&rdquo;
              email. About once a month, never more.
            </p>

            {/* Email subscribe */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) {
                  setSubscribed(true);
                }
              }}
              className="flex gap-2"
            >
              {subscribed ? (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-body-sm text-success font-medium"
                >
                  ✓ Subscribed — thanks!
                </motion.p>
              ) : (
                <>
                  <input
                    type="email"
                    placeholder="you@workspace.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="btn-stamp text-body-sm text-text-primary placeholder:text-text-muted bg-bg-elevated focus:btn-stamp-hover h-10 min-w-0 flex-1 px-3.5 font-normal focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="btn-stamp btn-stamp-primary hover:btn-stamp-primary-hover hover:btn-stamp-hover active:btn-stamp-active text-body-sm h-10 shrink-0 px-4"
                  >
                    Subscribe
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Right: links */}
          <div className="flex flex-wrap gap-12">
            {[
              {
                title: "Product",
                links: ["Overview", "Templates", "Changelog", "Roadmap"],
              },
              {
                title: "Developers",
                links: ["Documentation", "API Reference", "SDK", "Self-host"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers", "Contact"],
              },
            ].map((group) => (
              <div key={group.title}>
                <p className="text-text-muted mb-4 text-[11px] font-bold tracking-widest uppercase">
                  {group.title}
                </p>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link}>
                      <motion.a
                        href="#"
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.1 }}
                        className="text-body-sm text-text-secondary hover:text-text-primary transition-colors duration-[120ms]"
                      >
                        {link}
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-border-subtle border-t">
        <div className="section-container text-text-muted flex flex-col items-center justify-between gap-4 py-5 font-mono text-[11px] sm:flex-row">
          <span>© 2026 FLOW Systems · MIT</span>

          {/* Social icons */}
          <div className="flex items-center gap-2.5" aria-label="Social links">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active hover:bg-accent-primary hover:text-accent-on size-[42px]"
              >
                {s.icon}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-body-sm text-text-muted flex items-center gap-1.5">
              <span className="bg-success animate-pulse-status size-1.5 rounded-full" />
              All systems operational · 99.99%
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
