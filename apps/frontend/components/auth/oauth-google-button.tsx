"use client";

import { Button } from "@/components/ui/button";

/* ============================================================
   OAuthGoogleButton — Google sign-in / continue button.

   Uses the project's stamp-style Button (ghost variant) so the
   brutalist hard-shadow aesthetic is consistent. The Google
   "G" mark stays multi-coloured — it's a brand asset and may
   not be recoloured per Google's branding guidelines.
   ============================================================ */

interface OAuthGoogleButtonProps {
  label?: string;
  onClick?: () => void;
}

export function OAuthGoogleButton({
  label = "Continue with Google",
  onClick,
}: OAuthGoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="text-body-md h-11 w-full gap-2.5 font-medium [&_svg]:size-[18px]"
      data-provider="google"
    >
      <GoogleMark />
      <span>{label}</span>
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8L6.1 33C9.4 39.6 16.1 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2c-.4.4 6.5-4.7 6.5-14.7 0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
