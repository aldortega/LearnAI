// PROTOTYPE — Tres variantes del onboarding simulado sobre la Home, vía ?onboarding=A|B|C. Borrar al decidir.
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { PrototypeSwitcher } from "../../../shared/ui/PrototypeSwitcher";
import { useDemoFlow } from "./useDemoFlow";
import { VariantASpotlight } from "./VariantASpotlight";
import { VariantBCarousel } from "./VariantBCarousel";
import { VariantCSandbox } from "./VariantCSandbox";

const VARIANTS = [
  { key: "A", name: "Spotlight sobre la app" },
  { key: "B", name: "Carrusel animado" },
  { key: "C", name: "Práctica guiada" },
];

export function OnboardingPrototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = searchParams.get("onboarding");
  const flow = useDemoFlow();
  const { restart } = flow;

  const changeVariant = useCallback(
    (key: string) => {
      restart();
      setSearchParams({ onboarding: key }, { replace: true });
    },
    [restart, setSearchParams],
  );

  const close = useCallback(() => {
    restart();
    setSearchParams({}, { replace: true });
  }, [restart, setSearchParams]);

  if (!variant) return null;

  return (
    <>
      {variant === "A" && <VariantASpotlight flow={flow} onClose={close} />}
      {variant === "B" && <VariantBCarousel flow={flow} onClose={close} />}
      {variant === "C" && <VariantCSandbox flow={flow} onClose={close} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={changeVariant} />
    </>
  );
}
