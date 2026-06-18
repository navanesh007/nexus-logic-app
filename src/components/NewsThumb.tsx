import { useState } from "react";

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function gradient(seed: string) {
  const h = hash(seed);
  const a = h % 360;
  const b = (a + 60) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 35%), hsl(${b} 70% 25%))`;
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  ai: "artificial-intelligence,robot,technology",
  technology: "technology,gadgets,computer",
  finance: "finance,stockmarket,business",
  crypto: "cryptocurrency,bitcoin,blockchain",
  world: "world,city,news",
};

function imageUrl(seed: string, category?: string, w = 800, h = 500) {
  const id = hash(seed) % 1000;
  // picsum.photos is reliable and seedable. Category-tinted via grayscale fallback handled in onError.
  void category; // category kept for future source switching
  return `https://picsum.photos/seed/${id}-${seed.length}/${w}/${h}`;
}

type Props = {
  title: string;
  category?: string;
  className?: string;
  width?: number;
  height?: number;
  children?: React.ReactNode;
};

export function NewsThumb({ title, category, className = "", width = 800, height = 500, children }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [tries, setTries] = useState(0);

  const src = errored
    ? `https://picsum.photos/seed/${hash(title + tries)}/${width}/${height}`
    : imageUrl(title, category, width, height);

  return (
    <div
      className={`relative overflow-hidden bg-muted ${className}`}
      style={{ backgroundImage: gradient(title), backgroundSize: "cover" }}
    >
      <img
        src={src}
        alt={title}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (tries < 1) {
            setTries((t) => t + 1);
            setErrored(true);
          } else {
            setLoaded(true); // give up; gradient shows
          }
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* subtle dark gradient overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      {children}
    </div>
  );
}
