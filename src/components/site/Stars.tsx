import { Star } from "lucide-react";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= value ? "fill-[var(--gold)] text-[var(--gold)]" : "text-foreground/20"}
        />
      ))}
    </div>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`Поставить ${i}`}
          className="p-1"
        >
          <Star
            width={24}
            height={24}
            className={i <= value ? "fill-[var(--gold)] text-[var(--gold)]" : "text-foreground/30"}
          />
        </button>
      ))}
    </div>
  );
}
