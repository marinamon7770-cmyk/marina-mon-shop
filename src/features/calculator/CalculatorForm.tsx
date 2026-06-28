import { useMemo, useRef, useState, type RefObject } from "react";
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

type SizeField = "diameter" | "length" | "width" | "side" | "height";

function parsePositive(value: string): number | null {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function buildCalculatorInput(
  shape: BasketShape,
  diameter: string,
  length: string,
  width: string,
  side: string,
  height: string,
  bottomPattern: PatternType,
  wallPattern: PatternType,
  bottomType: BottomType,
): Parameters<typeof calculateEstimate>[0] | null {
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

  return input;
}

function getFirstMissingField(
  shape: BasketShape,
  diameter: string,
  length: string,
  width: string,
  side: string,
  height: string,
): SizeField | null {
  switch (shape) {
    case "circle":
      if (!diameter.trim() || parsePositive(diameter) === null) return "diameter";
      if (!height.trim() || parsePositive(height) === null) return "height";
      return null;
    case "oval":
    case "rectangle":
      if (!length.trim() || parsePositive(length) === null) return "length";
      if (!width.trim() || parsePositive(width) === null) return "width";
      if (!height.trim() || parsePositive(height) === null) return "height";
      return null;
    case "square":
      if (!side.trim() || parsePositive(side) === null) return "side";
      if (!height.trim() || parsePositive(height) === null) return "height";
      return null;
  }
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
  const [highlightedField, setHighlightedField] = useState<SizeField | null>(null);
  const [ctaMessage, setCtaMessage] = useState<string | null>(null);
  const [resultPulse, setResultPulse] = useState(false);

  const resultCardRef = useRef<HTMLDivElement>(null);
  const diameterRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const widthRef = useRef<HTMLInputElement>(null);
  const sideRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<SizeField, RefObject<HTMLInputElement | null>> = {
    diameter: diameterRef,
    length: lengthRef,
    width: widthRef,
    side: sideRef,
    height: heightRef,
  };

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
    const input = buildCalculatorInput(
      shape,
      diameter,
      length,
      width,
      side,
      height,
      bottomPattern,
      wallPattern,
      bottomType,
    );
    if (!input) return null;
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

  function clearFieldHighlight(field: SizeField) {
    setHighlightedField((current) => (current === field ? null : current));
    setCtaMessage(null);
  }

  function handleCalculateClick() {
    const missing = getFirstMissingField(shape, diameter, length, width, side, height);
    if (missing) {
      setHighlightedField(missing);
      setCtaMessage("Укажите размеры изделия, чтобы увидеть стоимость.");
      const target = fieldRefs[missing].current;
      target?.focus();
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (validationError) return;

    setHighlightedField(null);
    setCtaMessage(null);
    setResultPulse(true);
    resultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setResultPulse(false), 1600);
  }

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
              onChange={(v) => {
                setDiameter(v);
                clearFieldHighlight("diameter");
              }}
              required
              inputRef={diameterRef}
              highlighted={highlightedField === "diameter"}
            />
          )}

          {(shape === "oval" || shape === "rectangle") && (
            <>
              <Field
                label="Длина, см"
                value={length}
                onChange={(v) => {
                  setLength(v);
                  clearFieldHighlight("length");
                }}
                required
                inputRef={lengthRef}
                highlighted={highlightedField === "length"}
              />
              {showWidth && (
                <Field
                  label="Ширина, см"
                  value={width}
                  onChange={(v) => {
                    setWidth(v);
                    clearFieldHighlight("width");
                  }}
                  required
                  inputRef={widthRef}
                  highlighted={highlightedField === "width"}
                />
              )}
            </>
          )}

          {shape === "square" && (
            <Field
              label="Сторона, см"
              value={side}
              onChange={(v) => {
                setSide(v);
                clearFieldHighlight("side");
              }}
              required
              inputRef={sideRef}
              highlighted={highlightedField === "side"}
            />
          )}

          <Field
            label="Высота, см"
            value={height}
            onChange={(v) => {
              setHeight(v);
              clearFieldHighlight("height");
            }}
            required
            inputRef={heightRef}
            highlighted={highlightedField === "height"}
          />
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

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleCalculateClick}
            className="flex min-h-14 w-full items-center justify-center bg-primary px-5 py-4 text-base leading-snug font-medium text-primary-foreground shadow-[0_4px_16px_rgba(102,2,16,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.33_0.14_22)] hover:shadow-[0_6px_20px_rgba(102,2,16,0.28)] sm:text-lg"
          >
            Рассчитать стоимость корзины или короба
          </button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Калькулятор для круглых, овальных, квадратных и прямоугольных плетёных корзин и
            коробов.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            Стоимость обновляется автоматически после заполнения размеров.
          </p>
        </div>

        {(ctaMessage || validationError) && (
          <p className="text-sm text-primary" role="alert">
            {ctaMessage ?? validationError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div
          ref={resultCardRef}
          className={`flex flex-1 flex-col justify-center bg-sage/90 p-8 text-center text-white transition-all duration-500 sm:p-10 ${
            resultPulse
              ? "scale-[1.02] shadow-[0_0_0_4px_rgba(255,255,255,0.45),0_8px_28px_rgba(47,47,47,0.18)]"
              : "shadow-none"
          }`}
        >
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
  inputRef,
  highlighted,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  highlighted?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} ${
          highlighted
            ? "border-primary ring-2 ring-primary/30 bg-primary/[0.03]"
            : ""
        }`}
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
