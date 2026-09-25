import { ImageResponse } from "next/og";
import { glasshouseMarkOG } from "@/components/GlasshouseMarkOG";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
          background: "#000000",
        }}
      >
        {glasshouseMarkOG(28)}
      </div>
    ),
    { ...size }
  );
}
