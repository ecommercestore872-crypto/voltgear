import type { SocialPlatformId } from "@/lib/social-links-rules";

export function GadgetSocialGlyph({
  platform,
  className = "h-9 w-9",
}: {
  platform: SocialPlatformId;
  className?: string;
}) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
        <defs>
          <linearGradient id="ig-g" x1="8" y1="40" x2="40" y2="8">
            <stop stopColor="#F58529" />
            <stop offset="0.45" stopColor="#DD2A7B" />
            <stop offset="1" stopColor="#8134AF" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="36" height="36" rx="11" stroke="url(#ig-g)" strokeWidth="3" />
        <circle cx="24" cy="24" r="9" stroke="url(#ig-g)" strokeWidth="3" />
        <circle cx="35" cy="13" r="2.5" fill="#DD2A7B" />
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
        <path d="M28 8v22.5a6.5 6.5 0 1 1-5.5-6.4V16.2c3.8-.3 7-2.4 8.8-5.5H28Z" fill="#25F4EE" />
        <path d="M30 8v22.5a6.5 6.5 0 1 1-5.5-6.4V18.4c3.8-.3 7-2.4 8.8-5.5H30Z" fill="#FE2C55" opacity="0.92" />
        <path d="M29 8v20.8a6.5 6.5 0 1 1-5.5-6.4V17.3c3.8-.3 7-2.4 8.8-5.5H29Z" fill="#0f172a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#1877F2" />
      <path d="M27.2 24.8h3.2l1.4-4.6h-3.2v-2.9c0-1.3.4-2.2 2.2-2.2h1.7V10.8c-.3 0-1.5-.1-2.9-.1-2.9 0-4.9 1.8-4.9 5v3.5h-3.3v4.6h3.3V38h4.7V24.8Z" fill="white" />
    </svg>
  );
}