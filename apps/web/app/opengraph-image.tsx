import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hacker Reader - A Beautiful Hacker News Client";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  // Fetch the icon
  const iconUrl = new URL("/ios-light.png", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  
  // Fetch Inter font from correct CDN
  const interBold = fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff'
  ).then((res) => res.arrayBuffer());

  const interSemiBold = fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-600-normal.woff'
  ).then((res) => res.arrayBuffer());
  
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f0e8",
          background:
            "linear-gradient(to bottom, #f5f0e8 0%, #ffffff 100%)",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 48,
          }}
        >
          <img
            src={iconUrl.toString()}
            alt="Hacker Reader Icon"
            width={140}
            height={140}
            style={{
              borderRadius: 28,
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#1a1410",
              display: "flex",
              letterSpacing: "-0.04em",
            }}
          >
            Hacker Reader
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#ff6600",
              display: "flex",
              letterSpacing: "-0.02em",
            }}
          >
            Reimagined
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: "#665c4f",
            marginTop: 40,
            maxWidth: 900,
            textAlign: "center",
            display: "flex",
            lineHeight: 1.5,
          }}
        >
          A beautiful, native mobile experience for Hacker News
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Inter',
          data: await interBold,
          style: 'normal',
          weight: 700,
        },
        {
          name: 'Inter',
          data: await interSemiBold,
          style: 'normal',
          weight: 600,
        },
      ],
    }
  );
}

