import {
  baseHours,
  basePackagingPrice,
  cornerTubes,
  markup,
  materialCostPerTube,
  monthlyHours,
  monthlySalary,
  normalComplexityFactor,
  packagingIncludedPerimeter,
  packagingStep,
  packagingStepPrice,
  patterns,
  plywoodCost,
  reservePercent,
  stakeDistance,
  stakeMultiplicity,
  timeHeightIncluded,
  timeHeightStep,
  timePerimeterIncluded,
  timePerimeterStep,
  tubeLength,
} from "./calculatorConfig";

export type BasketShape = "circle" | "oval" | "rectangle" | "square";
export type PatternType = "sitc" | "rope";
export type BottomType = "woven" | "plywood";

export interface CalculatorInput {
  shape: BasketShape;
  /** Диаметр — круг */
  diameter?: number;
  /** Длина — овал, прямоугольник */
  length?: number;
  /** Ширина — овал, прямоугольник */
  width?: number;
  /** Сторона — квадрат */
  side?: number;
  height: number;
  bottomPattern: PatternType;
  wallPattern: PatternType;
  bottomType: BottomType;
}

export interface CalculatorResult {
  estimatedPrice: number;
}

function getBottomPatternCoefficient(shape: BasketShape, pattern: PatternType): number {
  if (pattern === "rope") return patterns.rope.bottomAndWall;
  if (shape === "square") return patterns.sitc.squareBottom;
  return patterns.sitc.bottom;
}

function getWallPatternCoefficient(pattern: PatternType): number {
  if (pattern === "rope") return patterns.rope.bottomAndWall;
  return patterns.sitc.wall;
}

interface TubeUsage {
  perimeter: number;
  height: number;
  tubesToPrepare: number;
}

function calculateTubes(input: CalculatorInput): TubeUsage {
  const { shape, height, bottomType, bottomPattern, wallPattern } = input;
  const isPlywood = bottomType === "plywood";
  const mult = stakeMultiplicity[shape];
  const bottomCoeff = getBottomPatternCoefficient(shape, bottomPattern);
  const wallCoeff = getWallPatternCoefficient(wallPattern);

  let perimeter = 0;
  let bottomStakes = 0;
  let bottomPatternTubes = 0;
  let wallStakes = 0;
  let wallPatternTubes = 0;
  let bend = 0;

  switch (shape) {
    case "circle": {
      const diameter = input.diameter!;
      perimeter = Math.PI * diameter;
      const finalStakes = Math.ceil(perimeter / stakeDistance);
      bottomStakes = finalStakes * mult.bottom;
      bottomPatternTubes = isPlywood
        ? 0
        : Math.ceil(Math.PI * (diameter / 2) ** 2 * bottomCoeff);
      wallStakes =
        diameter + height <= tubeLength ? 0 : finalStakes * mult.wall;
      wallPatternTubes = Math.ceil(perimeter * height * wallCoeff);
      bend = finalStakes * mult.bend;
      break;
    }
    case "oval": {
      const length = input.length!;
      const width = input.width!;
      const a = Math.max(length, width) / 2;
      const b = Math.min(length, width) / 2;
      perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      const finalStakes = Math.round(perimeter / stakeDistance / 2) * 2;
      bottomStakes = finalStakes * mult.bottom;
      bottomPatternTubes = isPlywood
        ? 0
        : Math.ceil(Math.PI * (length / 2) * (width / 2) * bottomCoeff);
      wallStakes =
        Math.max(length, width) + height <= tubeLength ? 0 : finalStakes * mult.wall;
      wallPatternTubes = Math.ceil(perimeter * height * wallCoeff);
      bend = finalStakes * mult.bend;
      break;
    }
    case "rectangle": {
      const length = input.length!;
      const width = input.width!;
      perimeter = 2 * (length + width);
      const ordinaryWallPositions = Math.ceil(perimeter / stakeDistance / 4) * 4;
      const finalStakes = ordinaryWallPositions + 4;
      const longSide = Math.max(length, width);
      const shortSide = Math.min(length, width);
      bottomStakes = Math.ceil(longSide / stakeDistance) * mult.bottom;
      bottomPatternTubes = isPlywood ? 0 : Math.ceil(length * width * bottomCoeff);
      const cornerAddition = 4 * Math.max(0, cornerTubes - mult.wall);
      wallStakes =
        shortSide + height <= tubeLength
          ? 0
          : ordinaryWallPositions * mult.wall + cornerAddition;
      wallPatternTubes = Math.ceil(perimeter * height * wallCoeff);
      bend = finalStakes * mult.bend;
      break;
    }
    case "square": {
      const side = input.side!;
      perimeter = side * 4;
      const ordinaryWallPositions = Math.ceil(perimeter / stakeDistance / 4) * 4;
      const finalStakes = ordinaryWallPositions + 4;
      bottomStakes = Math.ceil(side / stakeDistance) * 2 * mult.bottom;
      bottomPatternTubes = isPlywood ? 0 : Math.ceil(side * side * bottomCoeff);
      const cornerAddition = 4 * Math.max(0, cornerTubes - mult.wall);
      wallStakes =
        side + height <= tubeLength
          ? 0
          : ordinaryWallPositions * mult.wall + cornerAddition;
      wallPatternTubes = Math.ceil(perimeter * height * wallCoeff);
      bend = finalStakes * mult.bend;
      break;
    }
  }

  const totalWithoutReserve =
    bottomStakes + bottomPatternTubes + wallStakes + wallPatternTubes + bend;
  const reserveTubes = Math.ceil(totalWithoutReserve * reservePercent);
  const tubesToPrepare = totalWithoutReserve + reserveTubes;

  return { perimeter, height, tubesToPrepare };
}

function calculatePrice(
  perimeter: number,
  height: number,
  tubesToPrepare: number,
  bottomType: BottomType,
): number {
  const materialCost = tubesToPrepare * materialCostPerTube;

  const packaging =
    basePackagingPrice +
    Math.max(0, Math.ceil((perimeter - packagingIncludedPerimeter) / packagingStep)) *
      packagingStepPrice;

  const plywoodExtra = bottomType === "plywood" ? plywoodCost : 0;

  const workHours =
    baseHours +
    Math.max(0, Math.ceil((perimeter - timePerimeterIncluded) / timePerimeterStep)) +
    Math.max(0, Math.ceil((height - timeHeightIncluded) / timeHeightStep));

  const hourCost = monthlySalary / monthlyHours;
  const laborCost = workHours * hourCost;
  const baseCost = materialCost + packaging + plywoodExtra + laborCost;

  return Math.round(baseCost * normalComplexityFactor * (1 + markup));
}

/** Полный расчёт — только ориентировочная цена для клиента */
export function calculateEstimate(input: CalculatorInput): CalculatorResult {
  const { perimeter, height, tubesToPrepare } = calculateTubes(input);
  const estimatedPrice = calculatePrice(
    perimeter,
    height,
    tubesToPrepare,
    input.bottomType,
  );
  return { estimatedPrice };
}

/** Для проверки формул — не используется в UI */
export function calculateTubesForTest(input: CalculatorInput): number {
  return calculateTubes(input).tubesToPrepare;
}
