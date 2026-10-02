import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, X } from "lucide-react";
import {
  formatPct,
  formatShortMoney,
  formatShortSigned,
  trendOf,
} from "../../lib/money";
import { gameDate } from "../../lib/share";
import { wrappedText, type Wrapped } from "../../lib/wrapped";
import card from "../chrome/card.module.css";
import styles from "./WrappedStory.module.css";

type Props = { wrapped: Wrapped; onClose: () => void };

type Slide = {
  key: string;
  eyebrow: string;
  big: ReactNode;
  lines: ReactNode[];
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const ordinal = (n: number) =>
  `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th"}`;

function money(n: number) {
  return (
    <span className={`${card.money} ${card[trendOf(n)]}`}>
      {formatShortSigned(n)}
    </span>
  );
}

function slidesOf(w: Wrapped): Slide[] {
  const slides: Slide[] = [
    {
      key: "intro",
      eyebrow: `${w.year} in poker`,
      big: plural(w.games, "game"),
      lines: [
        `${formatShortMoney(w.onTable)} on the table`,
        `${plural(w.players, "player")} sat down`,
        ...(w.busiestMonth
          ? [
              `${w.busiestMonth.month} was the busiest month with ${plural(w.busiestMonth.games, "game")}`,
            ]
          : []),
      ],
    },
  ];
  const me = w.me;
  if (me) {
    slides.push({
      key: "me",
      eyebrow: "Your year",
      big: money(me.net),
      lines: [
        `${plural(me.games, "game")} · ${me.winRate}% won`,
        `${plural(me.nightsWon, "night")} as the big winner`,
        `Finished ${ordinal(me.rank)} of ${w.players}`,
      ],
    });
    if (me.bestNight)
      slides.push({
        key: "best",
        eyebrow: "Your best night",
        big: money(me.bestNight.value),
        lines: [
          gameDate(me.bestNight.date),
          `at a ${formatShortMoney(me.bestNight.buyIn)} buy-in`,
        ],
      });
    if (me.nemesis || me.favoriteAtm)
      slides.push({
        key: "rivals",
        eyebrow: "Your rivals",
        big: me.nemesis?.name ?? me.favoriteAtm?.name,
        lines: [
          ...(me.nemesis
            ? [
                <>
                  Your nemesis took {formatShortMoney(-me.nemesis.net)} off you
                </>,
              ]
            : []),
          ...(me.favoriteAtm
            ? [
                <>
                  {me.favoriteAtm.name} was your favorite ATM at{" "}
                  {formatShortMoney(me.favoriteAtm.net)}
                </>,
              ]
            : []),
        ],
      });
  }
  if (w.mvp)
    slides.push({
      key: "mvp",
      eyebrow: "The MVP",
      big: w.mvp.name,
      lines: [
        money(w.mvp.net),
        `${formatPct(w.mvp.roi)} ROI over ${plural(w.mvp.games, "game")}`,
        ...(w.mostNightsWon && w.mostNightsWon.nightsWon > 0
          ? [
              `Most nights won: ${w.mostNightsWon.name} with ${w.mostNightsWon.nightsWon}`,
            ]
          : []),
        ...(w.ironMan
          ? [`Most games: ${w.ironMan.name} with ${w.ironMan.games}`]
          : []),
      ],
    });
  if (w.biggestGame)
    slides.push({
      key: "biggest",
      eyebrow: "The biggest night",
      big: formatShortMoney(w.biggestGame.value),
      lines: [
        `on the table ${gameDate(w.biggestGame.date)}`,
        ...(w.biggestWin
          ? [
              <>
                Biggest win: {w.biggestWin.name} {money(w.biggestWin.value)}
              </>,
            ]
          : []),
      ],
    });
  slides.push({
    key: "outro",
    eyebrow: `That's ${w.year}`,
    big: "See you at the table",
    lines: [],
  });
  return slides;
}

/** A tap-through story of one year of poker. */
export function WrappedStory({ wrapped, onClose }: Props) {
  const slides = slidesOf(wrapped);
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)];

  useEffect(() => {
    layer.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, last));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, last]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wrappedText(wrapped));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!slide) return null;
  return (
    <div
      ref={layer}
      className={styles.layer}
      role="dialog"
      aria-modal="true"
      aria-label={`Poker Wrapped ${wrapped.year}`}
      tabIndex={-1}
    >
      <div className={styles.progress} aria-hidden>
        {slides.map((s, i) => (
          <span
            key={s.key}
            className={`${styles.bar} ${i <= index ? styles.seen : ""}`}
          />
        ))}
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close Wrapped"
      >
        <X size={20} strokeWidth={2.4} aria-hidden />
      </button>

      <div
        className={`${styles.slide} ${styles[slide.key] ?? ""}`}
        key={slide.key}
      >
        <span className={styles.eyebrow}>{slide.eyebrow}</span>
        <span className={styles.big}>{slide.big}</span>
        {slide.lines.map((line, i) => (
          <span key={i} className={styles.line}>
            {line}
          </span>
        ))}
        {index === last && (
          <button type="button" className={card.quiet} onClick={copy}>
            {copied ? (
              <Check size={18} aria-hidden />
            ) : (
              <Copy size={18} aria-hidden />
            )}
            {copied ? "Copied" : "Copy for group chat"}
          </button>
        )}
      </div>

      <button
        type="button"
        className={styles.back}
        onClick={() => setIndex((i) => Math.max(i - 1, 0))}
        disabled={index === 0}
        aria-label="Previous"
      />
      <button
        type="button"
        className={styles.next}
        onClick={() => (index === last ? onClose() : setIndex(index + 1))}
        aria-label={index === last ? "Close Wrapped" : "Next"}
      />
    </div>
  );
}
