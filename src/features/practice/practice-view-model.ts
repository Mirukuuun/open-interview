import type {
  AssessmentResultSummary,
  AssessmentResultSummaryV2,
  PracticeProfile,
  PracticeProfileDimension,
  SubmitAssessmentSessionResponseData,
} from "@/lib/schemas/practice";
import { isAssessmentResultSummaryV2 } from "@/lib/schemas/practice";

import type { PracticeRadarChartDimension } from "./practice-radar-chart";

export type PracticeProfileState = {
  profile: PracticeProfile;
  dimensions: PracticeProfileDimension[];
};

export function buildProfileStateFromExamResult(
  payload: SubmitAssessmentSessionResponseData,
  currentProfile: PracticeProfileState,
): PracticeProfileState {
  if (!isAssessmentResultSummaryV2(payload.result_summary)) {
    return currentProfile;
  }

  const updateMap = new Map(
    payload.result_summary.profile_updates.map((update) => [update.key, update]),
  );
  const previousDimensionMap = new Map(
    currentProfile.dimensions.map((dimension) => [dimension.key, dimension]),
  );

  return {
    profile: {
      ...currentProfile.profile,
      last_exam_session_id: payload.assessment_session.id,
      last_assessed_at:
        payload.assessment_session.completed_at ??
        currentProfile.profile.last_assessed_at,
    },
    dimensions: payload.result_summary.profile_radar_dimensions.map((dimension) => {
      const previousDimension = previousDimensionMap.get(dimension.key);
      const update = updateMap.get(dimension.key);

      return {
        key: dimension.key,
        label: dimension.label,
        score: dimension.score,
        evidence_count: dimension.evidence_count,
        last_exam_score:
          update?.exam_score ?? previousDimension?.last_exam_score ?? null,
        last_assessed_at: dimension.last_assessed_at ?? null,
      };
    }),
  };
}

export function toLegacyRadarChartDimensions(summary: AssessmentResultSummary) {
  if (isAssessmentResultSummaryV2(summary)) {
    return [];
  }

  return summary.radar_dimensions.map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    score: dimension.average_score,
  }));
}

export function toExamRadarChartDimensions(summary: AssessmentResultSummaryV2) {
  return summary.exam_radar_dimensions.map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    score: dimension.average_score,
    meta: `覆盖权重 ${dimension.coverage_weight.toFixed(2)} · ${dimension.question_count} 题`,
  }));
}

export function toProfileRadarChartDimensions(summary: AssessmentResultSummaryV2) {
  return summary.profile_radar_dimensions.map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    score: dimension.score,
    meta: `证据值 ${dimension.evidence_count.toFixed(2)}${
      dimension.covered_in_exam ? " · 本场已覆盖" : ""
    }`,
  }));
}

export function renderWeakAreaBadgeDimensions(
  weakAreas: AssessmentResultSummaryV2["weak_areas"] | AssessmentResultSummary["weak_areas"],
): PracticeRadarChartDimension[] {
  return weakAreas.map((area) => ({
    key: area.key,
    label: area.label,
    score: area.average_score,
  }));
}
