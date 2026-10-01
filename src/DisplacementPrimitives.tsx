import { effectiveChroma } from "./core/settings";

export { effectiveChroma };

interface DisplacementPrimitivesProps {
  scale: number;
  chroma: number;
}

/**
 * Body of the refraction filter: displacement by the map `in2="map"` (the output of an
 * `feImage`), with optional chromatic dispersion. The `<filter>` element and the
 * `feImage` belong to the surface that uses it.
 *
 * With dispersion, the displacement runs three times with slightly different scales,
 * one pass per color channel, and the channels are recombined with a screen blend.
 */
export function DisplacementPrimitives({ scale, chroma }: DisplacementPrimitivesProps) {
  if (chroma <= 0.001) {
    return (
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    );
  }
  return (
    <>
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="dr"
      />
      <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale * (1 + chroma)}
        xChannelSelector="R"
        yChannelSelector="G"
        result="dg"
      />
      <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale * (1 + chroma * 2)}
        xChannelSelector="R"
        yChannelSelector="G"
        result="db"
      />
      <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feBlend in="r" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="b" mode="screen" />
    </>
  );
}
