import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, sqlite } from "@/server/db/client";
import { resumeDocuments, resumeProjects } from "@/server/db/schema";
import { createStableOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { parseJsonStringArray } from "@/server/repositories/search-helpers";

const upsertResumeDocumentInputSchema = z.object({
  sourceDocumentId: z.string().min(1),
  candidateName: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).nullable().optional(),
});

const replaceResumeProjectsInputSchema = z.object({
  resumeDocumentId: z.string().min(1),
  projects: z.array(
    z.object({
      name: z.string().min(1),
      summary: z.string().min(1).nullable().optional(),
      highlights: z.array(z.string().min(1)).default([]),
      techStack: z.array(z.string().min(1)).default([]),
      deepDiveQuestions: z.array(z.string().min(1)).default([]),
    }),
  ),
});

function buildResumeDocumentId(sourceDocumentId: string) {
  return createStableOpaqueId("res", sourceDocumentId);
}

function buildResumeProjectId(
  resumeDocumentId: string,
  projectName: string,
  index: number,
) {
  const normalizedName = projectName.replace(/\s+/g, " ").trim().toLowerCase();

  return createStableOpaqueId(
    "proj",
    `${resumeDocumentId}:${index}:${normalizedName}`,
  );
}

function parseResumeProjectRow(row: {
  id: string;
  resumeDocumentId: string;
  name: string;
  summary: string | null;
  highlightsJson: string | null;
  techStackJson: string | null;
  deepDiveQuestionsJson: string | null;
  createdAt: string;
  updatedAt: string;
  sessionCount?: number;
  latestSessionId?: string | null;
  latestSessionUpdatedAt?: string | null;
}) {
  return {
    id: row.id,
    resumeDocumentId: row.resumeDocumentId,
    name: row.name,
    summary: row.summary,
    highlights: parseJsonStringArray(row.highlightsJson),
    techStack: parseJsonStringArray(row.techStackJson),
    deepDiveQuestions: parseJsonStringArray(row.deepDiveQuestionsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sessionCount: Number(row.sessionCount ?? 0),
    latestSessionId: row.latestSessionId ?? null,
    latestSessionUpdatedAt: row.latestSessionUpdatedAt ?? null,
  };
}

export const resumeRepository = {
  upsertResumeDocument(input: z.input<typeof upsertResumeDocumentInputSchema>) {
    const value = upsertResumeDocumentInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const resumeDocument = {
      id: buildResumeDocumentId(value.sourceDocumentId),
      sourceDocumentId: value.sourceDocumentId,
      candidateName: value.candidateName ?? null,
      summary: value.summary ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(resumeDocuments)
      .values(resumeDocument)
      .onConflictDoUpdate({
        target: resumeDocuments.sourceDocumentId,
        set: {
          candidateName: resumeDocument.candidateName,
          summary: resumeDocument.summary,
          updatedAt: timestamp,
        },
      })
      .run();

    return (
      db
        .select()
        .from(resumeDocuments)
        .where(eq(resumeDocuments.id, resumeDocument.id))
        .limit(1)
        .all()[0] ?? resumeDocument
    );
  },

  replaceResumeProjects(input: z.input<typeof replaceResumeProjectsInputSchema>) {
    const value = replaceResumeProjectsInputSchema.parse(input);
    const timestamp = nowUtcIso();

    db.delete(resumeProjects)
      .where(eq(resumeProjects.resumeDocumentId, value.resumeDocumentId))
      .run();

    if (value.projects.length === 0) {
      return [];
    }

    const rows = value.projects.map((project, index) => ({
      id: buildResumeProjectId(value.resumeDocumentId, project.name, index),
      resumeDocumentId: value.resumeDocumentId,
      name: project.name,
      summary: project.summary ?? null,
      highlightsJson: JSON.stringify(project.highlights),
      techStackJson: JSON.stringify(project.techStack),
      deepDiveQuestionsJson: JSON.stringify(project.deepDiveQuestions),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    db.insert(resumeProjects).values(rows).run();

    return rows.map((row) => parseResumeProjectRow(row));
  },

  findBySourceDocumentId(sourceDocumentId: string) {
    return db
      .select()
      .from(resumeDocuments)
      .where(eq(resumeDocuments.sourceDocumentId, sourceDocumentId))
      .limit(1)
      .all()[0];
  },

  findById(resumeId: string) {
    return db
      .select()
      .from(resumeDocuments)
      .where(eq(resumeDocuments.id, resumeId))
      .limit(1)
      .all()[0];
  },

  listRecentResumes(limit = 6) {
    const rows = sqlite.prepare(`
      SELECT
        rd.id AS id,
        rd.source_document_id AS sourceDocumentId,
        rd.candidate_name AS candidateName,
        rd.summary AS summary,
        rd.created_at AS createdAt,
        rd.updated_at AS updatedAt,
        COUNT(rp.id) AS projectCount
      FROM resume_documents rd
      LEFT JOIN resume_projects rp
        ON rp.resume_document_id = rd.id
      GROUP BY rd.id
      ORDER BY rd.updated_at DESC, rd.created_at DESC
      LIMIT ?
    `).all(limit) as Array<{
      id: string;
      sourceDocumentId: string;
      candidateName: string | null;
      summary: string | null;
      createdAt: string;
      updatedAt: string;
      projectCount: number;
    }>;

    return rows.map((row) => ({
      ...row,
      projectCount: Number(row.projectCount ?? 0),
    }));
  },

  listProjectsByResumeId(resumeDocumentId: string) {
    const rows = sqlite.prepare(`
      SELECT
        rp.id AS id,
        rp.resume_document_id AS resumeDocumentId,
        rp.name AS name,
        rp.summary AS summary,
        rp.highlights_json AS highlightsJson,
        rp.tech_stack_json AS techStackJson,
        rp.deep_dive_questions_json AS deepDiveQuestionsJson,
        rp.created_at AS createdAt,
        rp.updated_at AS updatedAt,
        (
          SELECT COUNT(*)
          FROM ai_sessions s
          WHERE s.related_resume_project_id = rp.id
            AND s.session_type = 'resume_deep_dive'
        ) AS sessionCount,
        (
          SELECT s.id
          FROM ai_sessions s
          WHERE s.related_resume_project_id = rp.id
            AND s.session_type = 'resume_deep_dive'
          ORDER BY s.updated_at DESC
          LIMIT 1
        ) AS latestSessionId,
        (
          SELECT s.updated_at
          FROM ai_sessions s
          WHERE s.related_resume_project_id = rp.id
            AND s.session_type = 'resume_deep_dive'
          ORDER BY s.updated_at DESC
          LIMIT 1
        ) AS latestSessionUpdatedAt
      FROM resume_projects rp
      WHERE rp.resume_document_id = ?
      ORDER BY rp.updated_at DESC, rp.name COLLATE NOCASE ASC
    `).all(resumeDocumentId) as Array<{
      id: string;
      resumeDocumentId: string;
      name: string;
      summary: string | null;
      highlightsJson: string | null;
      techStackJson: string | null;
      deepDiveQuestionsJson: string | null;
      createdAt: string;
      updatedAt: string;
      sessionCount: number;
      latestSessionId: string | null;
      latestSessionUpdatedAt: string | null;
    }>;

    return rows.map(parseResumeProjectRow);
  },

  findProjectById(projectId: string) {
    const row = sqlite.prepare(`
      SELECT
        rp.id AS id,
        rp.resume_document_id AS resumeDocumentId,
        rp.name AS name,
        rp.summary AS summary,
        rp.highlights_json AS highlightsJson,
        rp.tech_stack_json AS techStackJson,
        rp.deep_dive_questions_json AS deepDiveQuestionsJson,
        rp.created_at AS createdAt,
        rp.updated_at AS updatedAt,
        rd.id AS resumeId,
        rd.source_document_id AS sourceDocumentId,
        rd.candidate_name AS candidateName,
        rd.summary AS resumeSummary,
        rd.created_at AS resumeCreatedAt,
        rd.updated_at AS resumeUpdatedAt,
        sd.title AS sourceTitle,
        sd.parse_status AS sourceParseStatus,
        sd.updated_at AS sourceUpdatedAt
      FROM resume_projects rp
      INNER JOIN resume_documents rd
        ON rd.id = rp.resume_document_id
      INNER JOIN source_documents sd
        ON sd.id = rd.source_document_id
      WHERE rp.id = ?
      LIMIT 1
    `).get(projectId) as
      | {
          id: string;
          resumeDocumentId: string;
          name: string;
          summary: string | null;
          highlightsJson: string | null;
          techStackJson: string | null;
          deepDiveQuestionsJson: string | null;
          createdAt: string;
          updatedAt: string;
          resumeId: string;
          sourceDocumentId: string;
          candidateName: string | null;
          resumeSummary: string | null;
          resumeCreatedAt: string;
          resumeUpdatedAt: string;
          sourceTitle: string;
          sourceParseStatus:
            | "not_started"
            | "pending"
            | "running"
            | "needs_review"
            | "confirmed"
            | "failed";
          sourceUpdatedAt: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    const project = parseResumeProjectRow(row);

    return {
      ...project,
      resumeDocument: {
        id: row.resumeId,
        sourceDocumentId: row.sourceDocumentId,
        candidateName: row.candidateName,
        summary: row.resumeSummary,
        createdAt: row.resumeCreatedAt,
        updatedAt: row.resumeUpdatedAt,
      },
      sourceDocument: {
        id: row.sourceDocumentId,
        title: row.sourceTitle,
        parseStatus: row.sourceParseStatus,
        updatedAt: row.sourceUpdatedAt,
      },
    };
  },
};
