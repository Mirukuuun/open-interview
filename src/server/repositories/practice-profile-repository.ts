import { eq } from "drizzle-orm";

import {
  practiceDimensionCatalog,
  practiceDimensionCatalogVersion,
  type PracticeDimensionKey,
} from "@/lib/practice-dimensions";
import { db } from "@/server/db/client";
import {
  practiceProfileDimensions,
  practiceProfiles,
} from "@/server/db/schema";
import { createStableOpaqueId, nowUtcIso } from "@/server/repositories/ids";

/**
 * [POS] 维护考试模式长期能力画像的持久化边界，包括 singleton profile 初始化、维度读取与增量更新。
 * [IN] 画像读取、考试提交后的维度得分与覆盖权重。
 * [OUT] 返回 profile/profile_dimensions 读模型，并负责持久化更新元数据与累计 evidence。
 *
 * @feature open-interview-practice-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

const defaultPracticeProfileId = "practice_profile_local";
const defaultPracticeProfileScope = "local_default";

function roundScore(value: number) {
  return Number(Math.max(0, Math.min(10, value)).toFixed(1));
}

function roundMetric(value: number) {
  return Number(Math.max(0, value).toFixed(2));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultProfileRow() {
  return db
    .select()
    .from(practiceProfiles)
    .where(eq(practiceProfiles.id, defaultPracticeProfileId))
    .limit(1)
    .all()[0];
}

function listDimensionRows(profileId: string) {
  return db
    .select()
    .from(practiceProfileDimensions)
    .where(eq(practiceProfileDimensions.practiceProfileId, profileId))
    .all();
}

function toProfileBundle() {
  const profile = getDefaultProfileRow();

  if (!profile) {
    return null;
  }

  const dimensionRows = listDimensionRows(profile.id);
  const dimensionMap = new Map(
    dimensionRows.map((dimension) => [dimension.dimensionKey, dimension]),
  );

  return {
    profile,
    dimensions: practiceDimensionCatalog.map((dimension) => {
      const row = dimensionMap.get(dimension.key);

      return {
        id:
          row?.id ??
          createStableOpaqueId("profile_dimension", `${profile.id}:${dimension.key}`),
        practiceProfileId: profile.id,
        key: dimension.key,
        label: dimension.label,
        score: roundScore(row?.score ?? 0),
        evidenceCount: roundMetric(row?.evidenceCount ?? 0),
        lastExamScore:
          row?.lastExamScore === null || row?.lastExamScore === undefined
            ? null
            : roundScore(row.lastExamScore),
        lastCoverageWeight:
          row?.lastCoverageWeight === null || row?.lastCoverageWeight === undefined
            ? null
            : roundMetric(row.lastCoverageWeight),
        lastAssessedAt: row?.lastAssessedAt ?? null,
        createdAt: row?.createdAt ?? profile.createdAt,
        updatedAt: row?.updatedAt ?? profile.updatedAt,
      };
    }),
  };
}

function ensureDefaultProfile() {
  const timestamp = nowUtcIso();

  db.transaction(() => {
    const existingProfile = getDefaultProfileRow();

    if (!existingProfile) {
      db.insert(practiceProfiles)
        .values({
          id: defaultPracticeProfileId,
          scope: defaultPracticeProfileScope,
          dimensionCatalogVersion: practiceDimensionCatalogVersion,
          lastExamSessionId: null,
          lastAssessedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }

    const existingDimensions = new Set(
      listDimensionRows(defaultPracticeProfileId).map((dimension) => dimension.dimensionKey),
    );
    const missingDimensions = practiceDimensionCatalog.filter(
      (dimension) => !existingDimensions.has(dimension.key),
    );

    if (missingDimensions.length > 0) {
      db.insert(practiceProfileDimensions)
        .values(
          missingDimensions.map((dimension) => ({
            id: createStableOpaqueId(
              "profile_dimension",
              `${defaultPracticeProfileId}:${dimension.key}`,
            ),
            practiceProfileId: defaultPracticeProfileId,
            dimensionKey: dimension.key,
            score: 0,
            evidenceCount: 0,
            lastExamScore: null,
            lastCoverageWeight: null,
            lastAssessedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          })),
        )
        .run();
    }
  });

  return toProfileBundle();
}

export const practiceProfileRepository = {
  getDefaultProfile() {
    return ensureDefaultProfile();
  },

  applyExamResult(input: {
    sessionId: string;
    assessedAt: string;
    examDimensions: Array<{
      key: PracticeDimensionKey;
      averageScore: number;
      coverageWeight: number;
    }>;
  }) {
    const profileBundle = ensureDefaultProfile();

    if (!profileBundle) {
      return null;
    }

    const currentDimensionMap = new Map(
      profileBundle.dimensions.map((dimension) => [dimension.key, dimension]),
    );
    const updates = input.examDimensions.map((dimension) => {
      const currentDimension = currentDimensionMap.get(dimension.key);
      const coverageWeight = roundMetric(dimension.coverageWeight);
      const examScore = roundScore(dimension.averageScore);
      const updateWeight = roundMetric(
        clamp(0.08 + 0.06 * coverageWeight, 0.08, 0.35),
      );
      const previousScore = currentDimension?.score ?? 0;
      const nextScore = roundScore(
        previousScore * (1 - updateWeight) + examScore * updateWeight,
      );

      return {
        key: dimension.key,
        previousScore: currentDimension?.score ?? null,
        newScore: nextScore,
        examScore,
        coverageWeight,
        updateWeight,
        evidenceCount: roundMetric(
          (currentDimension?.evidenceCount ?? 0) + coverageWeight,
        ),
      };
    });

    db.transaction(() => {
      updates.forEach((update) => {
        db.update(practiceProfileDimensions)
          .set({
            score: update.newScore,
            evidenceCount: update.evidenceCount,
            lastExamScore: update.examScore,
            lastCoverageWeight: update.coverageWeight,
            lastAssessedAt: input.assessedAt,
            updatedAt: input.assessedAt,
          })
          .where(
            eq(
              practiceProfileDimensions.id,
              createStableOpaqueId(
                "profile_dimension",
                `${defaultPracticeProfileId}:${update.key}`,
              ),
            ),
          )
          .run();
      });

      db.update(practiceProfiles)
        .set({
          lastExamSessionId: input.sessionId,
          lastAssessedAt: input.assessedAt,
          updatedAt: input.assessedAt,
        })
        .where(eq(practiceProfiles.id, defaultPracticeProfileId))
        .run();
    });

    const refreshedProfile = toProfileBundle();

    if (!refreshedProfile) {
      return null;
    }

    return {
      profile: refreshedProfile.profile,
      dimensions: refreshedProfile.dimensions,
      updates,
    };
  },
};
