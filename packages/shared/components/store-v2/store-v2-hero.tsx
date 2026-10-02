"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { StoreV2HeroItem } from "./store-v2-utils";

const INTERVAL = 5500;

export function StoreV2Hero({ slides }: { slides: StoreV2HeroItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const go = useCallback(
    (next: number) => {
      setIndex((next + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1 || paused || reduceMotion) return;
    const id = window.setInterval(() => go(index + 1), INTERVAL);
    return () => window.clearInterval(id);
  }, [slides.length, paused, reduceMotion, index, go]);

  if (!slides.length) return null;

  return (
    <section
      className="sv2-hero"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="sv2-hero-slides">
        {slides.map((s, i) => (
          <article
            key={`${s.title}-${i}`}
            className={`sv2-hero-slide${i === index ? " is-active" : ""}`}
            aria-hidden={i !== index}
          >
            <div className="sv2-hero-bg">
              <Image
                src={s.img}
                alt={s.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                className="sv2-hero-img"
              />
            </div>
            <div className="sv2-hero-scrim" aria-hidden="true" />
            <div className="sv2-hero-copy">
              <p className="sv2-hero-tag">{s.tag}</p>
              {i === 0 ? (
                <h1 id="sv2-hero-heading" className="sv2-hero-title">
                  {s.title}
                </h1>
              ) : (
                <h2 className="sv2-hero-title">{s.title}</h2>
              )}
              <Link className="sv2-hero-cta" href={s.href}>
                Shop now
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="sv2-hero-index" aria-live="polite">
        <span>{index + 1}</span> / {slides.length}
      </p>
      <div className="sv2-hero-controls">
        <button type="button" className="sv2-hero-btn" aria-label="Previous slide" onClick={() => go(index - 1)}>
          ‹
        </button>
        <div className="sv2-hero-dots" role="tablist" aria-label="Choose slide">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}`}
              className={`sv2-hero-dot${i === index ? " is-on" : ""}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button type="button" className="sv2-hero-btn" aria-label="Next slide" onClick={() => go(index + 1)}>
          ›
        </button>
      </div>
    </section>
  );
}
