import { useMemo, useState } from "react";
import { vkOrderUrl } from "./calculatorConfig";
import {
  calculateEstimate,
  type BasketShape,
  type BottomType,
  type PatternType,
} from "./calculator";

const SHAPES: { value: BasketShape; label: string }[] = [
  { value: "circle", label: "Круглая корзина" },
  { value: "oval", label: "Овальная корзина" },
  { value: "rectangle", label: "Прямоугольный короб" },
  { value: "square", label: "Квадратный короб" },
];

const PATTERNS: { value: PatternType; label: string }[] = [
  { value: "sitc", label: "Ситец" },
  { value: "rope", label: "Верёвочка" },
];

const BOTTOM_TYPES: { value: BottomType; label: string }[] = [
  { value: "woven", label: "Плетёное" },
  { value: "plywood", label: "Фанерное" },
];

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground";

function parsePositive(value: string): number | null {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function CalculatorForm() {
  const [shape, setShape] = useState<BasketShape>("circle");
  const [diameter, setDiameter] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [side, setSide] = useState("");
  const [height, setHeight] = useState("");
  const [bottomPattern, setBottomPattern] = useState<PatternType>("sitc");
  const [wallPattern, setWallPattern] = useState<PatternType>("sitc");
  const [bottomType, setBottomType] = useState<BottomType>("woven");

  const validationError = useMemo(() => {
    const h = parsePositive(height);
    if (h === null) return height.trim() ? "Высота должна быть положительным числом" : null;

    switch (shape) {
      case "circle":
        if (parsePositive(diameter) === null && diameter.trim())
          return "Диаметр должен быть положительным числом";
        if (!diameter.trim()) return null;
        break;
      case "oval":
      case "rectangle": {
        const l = parsePositive(length);
        const w = parsePositive(width);
        if (length.trim() && l === null) return "Длина должна быть положительным числом";
        if (width.trim() && w === null) return "Ширина должна быть положительным числом";
        if (!length.trim() || !width.trim()) return null;
        break;
      }
      case "square":
        if (parsePositive(side) === null && side.trim())
          return "Сторона должна быть положительным числом";
        if (!side.trim()) return null;
        break;
    }
    return null;
  }, [shape, diameter, length, width, side, height]);

  const result = useMemo(() => {
    if (validationError) return null;

    const h = parsePositive(height);
    if (h === null) return null;

    const input = {
      shape,
      height: h,
      bottomPattern,
      wallPattern,
      bottomType,
    } as Parameters<typeof calculateEstimate>[0];

    switch (shape) {
      case "circle": {
        const d = parsePositive(diameter);
        if (d === null) return null;
        input.diameter = d;
        break;
      }
      case "oval":
      case "rectangle": {
        const l = parsePositive(length);
        const w = parsePositive(width);
        if (l === null || w === null) return null;
        input.length = l;
        input.width = w;
        break;
      }
      case "square": {
        const s = parsePositive(side);
        if (s === null) return null;
        input.side = s;
        break;
      }
    }

    return calculateEstimate(input);
  }, [
    shape,
    diameter,
    length,
    width,
    side,
    height,
    bottomPattern,
    wallPattern,
    bottomType,
    validationError,
  ]);

  const isPlywood = bottomType === "plywood";
  const showWidth = shape === "oval" || shape === "rectangle";

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="space-y-8 border border-border/60 bg-background p-6 sm:p-8">
        <fieldset className="space-y-3">
          <legend className={labelClass}>Форма изделия</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SHAPES.map((item) => (
              <label
                key={item.value}
                className={`flex cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors ${
                  shape === item.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                <input
                  type="radio"
                  name="shape"
                  value={item.value}
                  checked={shape === item.value}
                  onChange={() => setShape(item.value)}
                  className="accent-primary"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {shape === "circle" && (
            <Field
              label="Диаметр, см"
              value={diameter}
              onChange={setDiameter}
              required
            />
          )}

          {(shape === "oval" || shape === "rectangle") && (
            <>
              <Field label="Длина, см" value={length} onChange={setLength} required />
              {showWidth && (
                <Field label="Ширина, см" value={width} onChange={setWidth} required />
              )}
            </>
          )}

          {shape === "square" && (
            <Field label="Сторона, см" value={side} onChange={setSide} required />
          )}

          <Field label="Высота, см" value={height} onChange={setHeight} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Узор дна"
            value={bottomPattern}
            onChange={setBottomPattern}
            options={PATTERNS}
            disabled={isPlywood}
            hint={isPlywood ? "Не применяется при фанерном дне" : undefined}
          />
          <SelectField
            label="Узор стенок"
            value={wallPattern}
            onChange={setWallPattern}
            options={PATTERNS}
          />
          <SelectField
            label="Дно"
            value={bottomType}
            onChange={setBottomType}
            options={BOTTOM_TYPES}
          />
        </div>

        {validationError && (
          <p className="text-sm text-primary" role="alert">
            {validationError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-1 flex-col justify-center bg-sage/90 p-8 text-center text-white sm:p-10">
          <p className="text-xs uppercase tracking-[0.25em] text-white/80">
            Ориентировочная стоимость
          </p>
          {result ? (
            <p className="font-display mt-4 text-5xl sm:text-6xl">
              {result.estimatedPrice.toLocaleString("ru-RU")} ₽
            </p>
          ) : (
            <p className="font-display mt-4 text-3xl text-white/70">
              Укажите размеры
            </p>
          )}
          <p className="mt-6 text-sm leading-relaxed text-white/85">
            Цвет, крышка, ручки, фурнитура и нестандартные детали могут менять итоговую
            стоимость
          </p>
        </div>

        {vkOrderUrl && (
          <a
            href={vkOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center bg-primary px-6 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Задать вопрос мастеру
          </a>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder="0"
      />
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className={inputClass}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
