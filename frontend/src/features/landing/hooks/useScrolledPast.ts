import { useEffect, useState } from "react";

export function useScrolledPast(offset: number): boolean {
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const update = () => setIsPast(window.scrollY > offset);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [offset]);

  return isPast;
}
