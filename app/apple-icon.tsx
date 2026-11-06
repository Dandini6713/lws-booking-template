import { ImageResponse } from "next/og";
import config from "@/business.config";

/** App icon generated from the brand colours and the first letter of the name. Swap for a real logo by adding app/icon.png. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  const { colours } = config.brand;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colours.ink,
          color: colours.paper,
          fontSize: 100,
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex", width: 110, height: 110, borderRadius: 999, background: colours.accent, alignItems: "center", justifyContent: "center", color: colours.accentInk }}>
          {config.business.shortName.charAt(0)}
        </div>
      </div>
    ),
    size,
  );
}
