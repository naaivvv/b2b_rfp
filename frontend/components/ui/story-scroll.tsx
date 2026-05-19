"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function cx(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(" ");
}

export interface FlowSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  "aria-label"?: string;
}

export const FlowSection: React.FC<FlowSectionProps> = ({
  className,
  style = {},
  children,
  "aria-label": ariaLabel
}) => (
  <section
    data-flow-section
    aria-label={ariaLabel}
    className={cx("relative min-h-dvh w-full overflow-hidden", className)}
  >
    <div
      data-flow-inner
      className={cx(
        "flow-art-container relative flex min-h-dvh w-full flex-col justify-between gap-6 px-[4vw] pb-[4vw] pt-[clamp(2rem,8vw,4vw)]",
        "will-change-transform"
      )}
      style={{ transformOrigin: "bottom left", ...style }}
    >
      {children}
    </div>
  </section>
);

export interface FlowArtProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

const childCount = (children: React.ReactNode) => React.Children.count(children);

const FlowArt: React.FC<FlowArtProps> = ({
  children,
  className,
  "aria-label": ariaLabel = "Story scroll"
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = window.matchMedia("(max-width: 767px)");

    const update = () => {
      setReducedMotion(motionQuery.matches);
      setCompactViewport(compactQuery.matches);
    };

    update();
    motionQuery.addEventListener("change", update);
    compactQuery.addEventListener("change", update);

    return () => {
      motionQuery.removeEventListener("change", update);
      compactQuery.removeEventListener("change", update);
    };
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const sections = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>("[data-flow-section]")
      );

      if (sections.length === 0) return;

      const inners = sections
        .map((section) => section.querySelector<HTMLElement>(".flow-art-container"))
        .filter((inner): inner is HTMLElement => inner !== null);

      if (reducedMotion || compactViewport) {
        inners.forEach((inner) => {
          gsap.set(inner, { clearProps: "transform,rotation" });
        });
        return;
      }

      const triggers: ScrollTrigger[] = [];

      sections.forEach((section, index) => {
        gsap.set(section, { zIndex: index + 1 });

        const inner = section.querySelector<HTMLElement>(".flow-art-container");
        if (!inner) return;

        if (index > 0) {
          gsap.set(inner, { rotation: 30, transformOrigin: "bottom left" });
          const tween = gsap.to(inner, {
            rotation: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top 25%",
              scrub: true
            }
          });

          if (tween.scrollTrigger) {
            triggers.push(tween.scrollTrigger);
          }
        }

        if (index < sections.length - 1) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: "bottom bottom",
              end: "bottom top",
              pin: true,
              pinSpacing: false
            })
          );
        }
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((trigger) => trigger.kill());
        inners.forEach((inner) => {
          gsap.set(inner, { clearProps: "transform,rotation" });
        });
      };
    },
    { scope: containerRef, dependencies: [childCount(children), reducedMotion, compactViewport] }
  );

  return (
    <main
      ref={containerRef}
      aria-label={ariaLabel}
      className={cx("w-full overflow-x-hidden", className)}
    >
      {children}
    </main>
  );
};

export default FlowArt;
