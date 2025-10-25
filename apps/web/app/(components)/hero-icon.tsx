"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import * as React from "react";

export function HeroIcon() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative w-24 h-24 sm:w-32 sm:h-32">
        <Image
          src="/ios-light.png"
          alt="HN Client App Icon"
          fill
          className="object-contain [filter:drop-shadow(0_20px_25px_rgba(0,0,0,0.15))_drop-shadow(0_8px_10px_rgba(0,0,0,0.1))]"
          priority
        />
      </div>
    );
  }

  const iconSrc = resolvedTheme === "dark" ? "/ios-dark.png" : "/ios-light.png";

  return (
    <div className="relative w-24 h-24 sm:w-32 sm:h-32">
      <Image
        src={iconSrc}
        alt="HN Client App Icon"
        fill
        className="object-contain [filter:drop-shadow(0_20px_25px_rgba(0,0,0,0.15))_drop-shadow(0_8px_10px_rgba(0,0,0,0.1))]"
        priority
      />
    </div>
  );
}

