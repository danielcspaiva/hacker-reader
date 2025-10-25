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
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <img
            src={iconUrl.toString()}
            alt="Hacker Reader Icon"
            width={120}
            height={120}
            style={{
              borderRadius: 24,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#1a1410",
              display: "flex",
              letterSpacing: "-0.02em",
            }}
          >
            Hacker Reader
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: "bold",
              color: "#ff6600",
              display: "flex",
            }}
          >
            Reimagined
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 28,
            color: "#665c4f",
            marginTop: 32,
            maxWidth: 800,
            textAlign: "center",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          A beautiful, native mobile experience for Hacker News
        </div>

        {/* Features badges */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 48,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["React Native", "Expo", "TypeScript", "iOS & Android"].map(
            (tech) => (
              <div
                key={tech}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "white",
                  borderRadius: 24,
                  fontSize: 20,
                  color: "#1a1410",
                  fontWeight: 600,
                  display: "flex",
                  border: "2px solid #e5ddd0",
                }}
              >
                {tech}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

