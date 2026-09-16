import React from "react";
import { Image } from "@/components/ui/image";

// Official StudyMate logo (as supplied — never crop, stretch, or redraw).
export const LOGO_URL =
  "https://media.base44.com/images/public/6aa5372e2a8ad145b4249ca0/3366af95f_image.png";

export default function Logo({ height = 40, className = "" }) {
  return (
    <span className={"inline-flex overflow-hidden rounded-lg shrink-0 " + className}>
      <Image
        src={LOGO_URL}
        alt="StudyMate — Your Study. Smarter."
        fittingType="fit"
        className="block w-auto"
        style={{ height }}
      />
    </span>
  );
}