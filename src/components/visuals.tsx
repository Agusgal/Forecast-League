import {
  ArrowUpRight,
  Check,
  Flag,
  Zap,
  Atom,
  Globe2,
  Sprout,
  Trophy,
  Cpu,
  ChartNoAxesCombined,
} from "lucide-react";
import type { Question } from "@/domain/types";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "brand-small" : ""}`}>
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      {!small && (
        <span>
          forecast<span className="brand-league">LEAGUE</span>
        </span>
      )}
    </div>
  );
}
export function GlobeArt() {
  return (
    <div className="globe-art" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="globe">
        <svg viewBox="0 0 250 250" fill="none">
          <circle cx="125" cy="125" r="121" />
          <ellipse cx="125" cy="125" rx="78" ry="121" />
          <ellipse cx="125" cy="125" rx="30" ry="121" />
          <ellipse cx="125" cy="125" rx="121" ry="45" />
          <ellipse cx="125" cy="125" rx="115" ry="87" />
          <path d="M4 125h242M125 4v242" />
        </svg>
      </div>
      <span className="globe-star star-one">✦</span>
      <span className="globe-star star-two">✦</span>
      <span className="globe-dot" />
      <span className="art-arrow">
        <ArrowUpRight size={27} />
      </span>
    </div>
  );
}
const icons = {
  space: Atom,
  climate: Sprout,
  ai: Cpu,
  world: Globe2,
  sports: Trophy,
  economy: ChartNoAxesCombined,
};
export function QuestionArt({ visual }: { visual: Question["visual"] }) {
  const Icon = icons[visual];
  return (
    <span className={`question-art art-${visual}`} aria-hidden="true">
      <Icon size={25} strokeWidth={1.5} />
    </span>
  );
}
export function Avatar({
  name,
  small = false,
  index = 0,
}: {
  name: string;
  small?: boolean;
  index?: number;
}) {
  return (
    <span
      className={`avatar ${small ? "avatar-small" : ""} avatar-${index % 5}`}
    >
      {name
        .replace(/^Demo · /, "")
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}

export function ForecastArenaArt({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <div className="arena-art" aria-hidden="true">
      <span className="arena-spark spark-a">✦</span>
      <span className="arena-spark spark-b">✦</span>
      <div className="arena-scorecard">
        <span className="arena-label">
          <Flag size={13} /> DESAFÍO DIARIO
        </span>
        <div className="arena-trophy">
          <Trophy size={58} strokeWidth={1.8} />
        </div>
        <div className="arena-completion">
          <strong>
            {completed}
            <span> / {total}</span>
          </strong>
          <span>pronósticos</span>
        </div>
        <div className="arena-slots">
          {Array.from({ length: Math.max(1, total) }, (_, index) => (
            <span key={index} className={index < completed ? "complete" : ""}>
              {index < completed ? <Check size={15} /> : index + 1}
            </span>
          ))}
        </div>
      </div>
      <span className="arena-token token-a">
        <Zap size={24} fill="currentColor" />
      </span>
      <span className="arena-token token-b">
        <TargetIcon />
      </span>
    </div>
  );
}
function TargetIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="11" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="15" cy="15" r="6" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="15" cy="15" r="2" fill="currentColor" />
    </svg>
  );
}
