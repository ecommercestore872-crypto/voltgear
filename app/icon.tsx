import { ImageResponse } from "next/og";

export const runtime = "edge";

// Image metadata
export const size = {
  width: 512,
  height: 512,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1F3626", // Their brand forest color
          color: "white",
          borderRadius: "110px", // Just enough curve for raw image, OS will auto-mask it
        }}
      >
        <div
          style={{
            fontSize: 220,
            fontFamily: "sans-serif", // next/og uses this as default
            fontWeight: 900,
            letterSpacing: "-6px",
            lineHeight: 1,
            marginTop: 15,
          }}
        >
          BNT
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
