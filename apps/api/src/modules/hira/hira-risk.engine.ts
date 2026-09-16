import { RiskLevel, ControlHierarchyType } from "@prisma/client";

export interface ControlInput {
  type: ControlHierarchyType;
  description: string;
  effectivenessPercent: number; // 0 to 100
  isExisting?: boolean;
}

export interface RiskCalculationResult {
  initialScore: number;
  initialLevel: RiskLevel;
  residualSeverity: number;
  residualLikelihood: number;
  residualScore: number;
  residualLevel: RiskLevel;
  isAlarpJustified: boolean;
  isUnacceptable: boolean;
  requiresOverride: boolean;
}

export class HiraRiskEngine {
  /**
   * Evaluates Risk Level from a numerical score (1 - 25)
   */
  static getRiskLevel(score: number): RiskLevel {
    if (score <= 4) return RiskLevel.LOW;
    if (score <= 9) return RiskLevel.MODERATE;
    if (score <= 15) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  /**
   * Hierarchy Control Multipliers
   * Elimination provides the highest risk reduction; PPE provides the lowest.
   */
  private static readonly HIERARCHY_WEIGHTS: Record<
    ControlHierarchyType,
    number
  > = {
    [ControlHierarchyType.ELIMINATION]: 0.9,
    [ControlHierarchyType.SUBSTITUTION]: 0.75,
    [ControlHierarchyType.ENGINEERING]: 0.6,
    [ControlHierarchyType.ADMINISTRATIVE]: 0.3,
    [ControlHierarchyType.PPE]: 0.15,
  };

  /**
   * Calculates Initial and Residual Risk server-side with guaranteed floor of 1
   */
  static calculateRisk(
    severity: number,
    likelihood: number,
    controls: ControlInput[] = [],
    alarpJustification?: string,
  ): RiskCalculationResult {
    // Validate inputs
    const clampedSev = Math.max(1, Math.min(5, Math.round(severity)));
    const clampedLik = Math.max(1, Math.min(5, Math.round(likelihood)));

    const initialScore = clampedSev * clampedLik;
    const initialLevel = this.getRiskLevel(initialScore);

    if (controls.length === 0) {
      return {
        initialScore,
        initialLevel,
        residualSeverity: clampedSev,
        residualLikelihood: clampedLik,
        residualScore: initialScore,
        residualLevel: initialLevel,
        isAlarpJustified: initialLevel === RiskLevel.LOW,
        isUnacceptable: initialLevel === RiskLevel.CRITICAL,
        requiresOverride: initialLevel === RiskLevel.CRITICAL,
      };
    }

    // Compute cumulative control reduction factor (capped at 80% total reduction)
    let totalReductionRatio = 0;
    for (const ctrl of controls) {
      const weight = this.HIERARCHY_WEIGHTS[ctrl.type] || 0.2;
      const efficiency =
        Math.max(0, Math.min(100, ctrl.effectivenessPercent)) / 100;
      totalReductionRatio += weight * efficiency * 0.4;
    }
    const cappedReduction = Math.min(0.8, totalReductionRatio);

    // Residual Likelihood is primarily reduced by controls
    const calculatedResidualLik = Math.max(
      1,
      Math.round(clampedLik * (1 - cappedReduction)),
    );
    // Severe hazards maintain severity unless eliminated/substituted
    const hasEliminationOrSub = controls.some(
      (c) =>
        (c.type === ControlHierarchyType.ELIMINATION ||
          c.type === ControlHierarchyType.SUBSTITUTION) &&
        c.effectivenessPercent > 50,
    );
    const calculatedResidualSev = hasEliminationOrSub
      ? Math.max(1, Math.round(clampedSev * (1 - cappedReduction * 0.5)))
      : clampedSev;

    // Guaranteed floor of 1
    const residualScore = Math.max(
      1,
      calculatedResidualSev * calculatedResidualLik,
    );
    const residualLevel = this.getRiskLevel(residualScore);

    const isUnacceptable = residualLevel === RiskLevel.CRITICAL;
    const isAlarpJustified =
      residualLevel === RiskLevel.LOW ||
      ((residualLevel === RiskLevel.MODERATE ||
        residualLevel === RiskLevel.HIGH) &&
        Boolean(alarpJustification && alarpJustification.trim().length >= 5));

    return {
      initialScore,
      initialLevel,
      residualSeverity: calculatedResidualSev,
      residualLikelihood: calculatedResidualLik,
      residualScore,
      residualLevel,
      isAlarpJustified,
      isUnacceptable,
      requiresOverride: isUnacceptable,
    };
  }
}
