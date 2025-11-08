import Image from "next/image";

export function AppStoreBadge() {
  return (
    <a
      href="https://apps.apple.com/us/app/hacker-reader/id6754137305"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6600]"
    >
      {/* Black badge for light mode */}
      <Image
        src="/app-store-badge-black.svg"
        alt="Download on the App Store"
        width={160}
        height={53}
        className="block dark:hidden h-[53px] w-auto"
      />
      {/* White badge for dark mode */}
      <Image
        src="/app-store-badge-white.svg"
        alt="Download on the App Store"
        width={160}
        height={53}
        className="hidden dark:block h-[53px] w-auto"
      />
    </a>
  );
}
