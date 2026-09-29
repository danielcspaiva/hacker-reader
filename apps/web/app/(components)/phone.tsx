import Image from "next/image";

interface PhoneProps {
  src: string;
  alt: string;
  /** Frame rim tone: orange for a light screen, bronze for a dark one. */
  rim?: "orange" | "bronze";
  priority?: boolean;
  className?: string;
  sizes?: string;
}

// Screen proportions of the iPhone 17 Pro Max captures (1320 x 2868).
const SCREEN_ASPECT = "1320 / 2868";

/**
 * A screenshot inside a drawn iPhone: tinted rim, black bezel, rounded screen
 * and Dynamic Island. Width comes from `className`; height follows the aspect.
 */
export function Phone({
  src,
  alt,
  rim = "orange",
  priority,
  className = "",
  sizes = "(min-width: 1024px) 360px, 70vw",
}: PhoneProps) {
  const rimClass =
    rim === "orange"
      ? "bg-[linear-gradient(150deg,#F4A06A_0%,#E0702C_30%,#B9521A_58%,#E98A4C_100%)]"
      : "bg-[linear-gradient(150deg,#7C6D5E_0%,#453B32_40%,#2A241F_65%,#6A5D50_100%)]";

  return (
    <div
      className={`rounded-[15.5%/7.2%] p-[0.7%] shadow-[0_30px_60px_-20px_rgba(60,45,20,0.45)] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] ${rimClass} ${className}`}
    >
      <div className="rounded-[15%/6.95%] bg-[#0a0908] p-[3%]">
        <div
          className="relative overflow-hidden rounded-[12.8%/5.9%] bg-black"
          style={{ aspectRatio: SCREEN_ASPECT }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-[1.25%] h-[3.9%] w-[28.6%] -translate-x-1/2 rounded-full bg-black"
          />
        </div>
      </div>
    </div>
  );
}
