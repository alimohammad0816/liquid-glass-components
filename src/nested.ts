import { createContext } from "react";

/**
 * True inside a glass surface. `backdrop-filter` creates a backdrop root, and an SVG
 * filter inside a nested glass surface turns the surface gray or dark in Chromium. A
 * nested surface therefore renders without the SVG refraction filter; every other layer
 * (tint, rim, light, motion) is identical.
 */
export const NestedGlass = createContext(false);
