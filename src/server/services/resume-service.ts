import type { ParseResumeProjectCandidate } from "@/lib/schemas/parse-result";
import type { ParseJobSummary } from "@/lib/schemas/parse-jobs";
import {
  resumeDocumentSchema,
  resumeProjectDetailSchema,
  resumeProjectSchema,
  resumeProjectSessionSchema,
  resumeProjectSummarySchema,
} from "@/lib/schemas/resume";
import { sqlite } from "@/server/db/client";
import {
  chunkRepository,
  parseJobRepository,
  qaSessionRepository,
  resumeRepository,
  sourceDocumentRepository,
} from "@/server/repositories";

export class ResumeServiceError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "ResumeServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function trimNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeStringList(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function buildCandidateName(rawText: string) {
  const lines = rawText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const candidateLine = lines.find(
    (line) =>
      line.length <= 80 &&
      !/[：:]/u.test(line) &&
      !/(?:@|linkedin|github|电话|手机|email|邮箱)/iu.test(line),
  );

  return candidateLine ? candidateLine.replace(/\s+/g, " ").trim() : null;
}

function normalizeProjectCandidates(projects: ParseResumeProjectCandidate[] | undefined) {
  return (projects ?? [])
    .map((project) => ({
      name: project.name.trim(),
      summary: trimNullable(project.summary),
      highlights: normalizeStringList(project.highlights).slice(0, 5),
      techStack: normalizeStringList(project.tech_stack).slice(0, 8),
      deepDiveQuestions: normalizeStringList(project.deep_dive_questions).slice(0, 6),
    }))
    .filter((project) => project.name.length > 0);
}

function toParseJobSummary(parseJob: NonNullable<ReturnType<typeof parseJobRepository.findById>>) {
  return {
    id: parseJob.id,
    source_document_id: parseJob.sourceDocumentId,
    job_type: parseJob.jobType,
    provider: parseJob.provider,
    status: parseJob.status,
    attempt_count: parseJob.attemptCount,
    error_message: parseJob.errorMessage,
    candidate_question_count: parseJob.resultJson?.questions.length ?? 0,
    created_at: parseJob.createdAt,
    updated_at: parseJob.updatedAt,
    started_at: parseJob.startedAt,
    finished_at: parseJob.finishedAt,
  } satisfies ParseJobSummary;
}

function toApiResumeDocument(
  resumeDocument: NonNullable<ReturnType<typeof resumeRepository.findById>>,
  projectCount: number,
) {
  return resumeDocumentSchema.parse({
    id: resumeDocument.id,
    source_document_id: resumeDocument.sourceDocumentId,
    candidate_name: resumeDocument.candidateName,
    summary: resumeDocument.summary,
    project_count: projectCount,
    created_at: resumeDocument.createdAt,
    updated_at: resumeDocument.updatedAt,
  });
}

function toApiResumeProject(
  project: ReturnType<typeof resumeRepository.listProjectsByResumeId>[number],
) {
  return resumeProjectSchema.parse({
    id: project.id,
    resume_document_id: project.resumeDocumentId,
    name: project.name,
    summary: project.summary,
    highlights: project.highlights,
    tech_stack: project.techStack,
    deep_dive_questions: project.deepDiveQuestions,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
}

function toApiResumeProjectSummary(
  project: ReturnType<typeof resumeRepository.listProjectsByResumeId>[number],
) {
  return resumeProjectSummarySchema.parse({
    ...toApiResumeProject(project),
    session_count: project.sessionCount,
    latest_session_id: project.latestSessionId,
    latest_session_updated_at: project.latestSessionUpdatedAt,
  });
}

function toApiResumeProjectSession(
  session: ReturnType<typeof qaSessionRepository.listByRelatedResumeProject>[number],
) {
  return resumeProjectSessionSchema.parse({
    id: session.id,
    session_type: "resume_deep_dive",
    status: session.status,
    related_resume_project_id: session.relatedResumeProjectId,
    provider: session.provider,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  });
}

function getResumeDetailById(resumeId: string) {
  const resumeDocument = resumeRepository.findById(resumeId);

  if (!resumeDocument) {
    return undefined;
  }

  const sourceDocument = sourceDocumentRepository.findById(resumeDocument.sourceDocumentId);

  if (!sourceDocument) {
    return undefined;
  }

  const projects = resumeRepository.listProjectsByResumeId(resumeId);

  return {
    resumeDocument: toApiResumeDocument(resumeDocument, projects.length),
    sourceDocument: {
      id: sourceDocument.id,
      title: sourceDocument.title,
      parseStatus: sourceDocument.parseStatus,
      updatedAt: sourceDocument.updatedAt,
    },
    projects: projects.map(toApiResumeProjectSummary),
  };
}

function getProjectDetailById(projectId: string) {
  const project = resumeRepository.findProjectById(projectId);

  if (!project) {
    return undefined;
  }

  const sessions = qaSessionRepository.listByRelatedResumeProject(projectId);
  const projectCount = resumeRepository.listProjectsByResumeId(project.resumeDocument.id).length;

  return resumeProjectDetailSchema.parse({
    id: project.id,
    resume_document_id: project.resumeDocument.id,
    name: project.name,
    summary: project.summary,
    highlights: project.highlights,
    tech_stack: project.techStack,
    deep_dive_questions: project.deepDiveQuestions,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    resume_document: toApiResumeDocument(project.resumeDocument, projectCount),
    source_document: {
      id: project.sourceDocument.id,
      title: project.sourceDocument.title,
      parse_status: project.sourceDocument.parseStatus,
      updated_at: project.sourceDocument.updatedAt,
    },
    sessions: sessions.map(toApiResumeProjectSession),
  });
}

export const resumeService = {
  getWorkspace() {
    const latestResumeSource = sourceDocumentRepository.list({
      kind: "resume",
      page: 1,
      pageSize: 1,
    }).items[0];
    const latestParseJob = latestResumeSource
      ? parseJobRepository.findLatestBySourceDocumentId(latestResumeSource.id)
      : undefined;
    const recentResumes = resumeRepository.listRecentResumes(6);
    const activeResume = recentResumes[0]
      ? getResumeDetailById(recentResumes[0].id)
      : undefined;

    return {
      latestResumeSource: latestResumeSource
        ? {
            id: latestResumeSource.id,
            title: latestResumeSource.title,
            parseStatus: latestResumeSource.parseStatus,
            createdAt: latestResumeSource.createdAt,
            updatedAt: latestResumeSource.updatedAt,
          }
        : null,
      latestParseJob: latestParseJob ? toParseJobSummary(latestParseJob) : null,
      parsedProjectPreview: normalizeProjectCandidates(
        latestParseJob?.resultJson?.resume_projects,
      ),
      parseWarnings: latestParseJob?.resultJson?.warnings ?? [],
      activeResume: activeResume ?? null,
      recentResumes: recentResumes.map((resume) =>
        resumeDocumentSchema.parse({
          id: resume.id,
          source_document_id: resume.sourceDocumentId,
          candidate_name: resume.candidateName,
          summary: resume.summary,
          project_count: resume.projectCount,
          created_at: resume.createdAt,
          updated_at: resume.updatedAt,
        }),
      ),
    };
  },

  createFromSource(sourceDocumentId: string) {
    const sourceDocument = sourceDocumentRepository.findById(sourceDocumentId);

    if (!sourceDocument || sourceDocument.kind !== "resume") {
      throw new ResumeServiceError("not_found", "Resume source document was not found.", 404);
    }

    const latestParseJob = parseJobRepository.findLatestBySourceDocumentId(sourceDocumentId);

    if (!latestParseJob || latestParseJob.jobType !== "extract_resume") {
      throw new ResumeServiceError(
        "review_required",
        "Run a resume parse job before creating structured resume entities.",
        409,
      );
    }

    if (
      latestParseJob.status !== "needs_review" &&
      latestParseJob.status !== "confirmed"
    ) {
      throw new ResumeServiceError(
        "review_required",
        `Resume parse job is not ready for structured import. Current status: ${latestParseJob.status}.`,
        409,
      );
    }

    if (!latestParseJob.resultJson) {
      throw new ResumeServiceError(
        "review_required",
        "Resume parse result is missing.",
        409,
      );
    }

    const normalizedProjects = normalizeProjectCandidates(
      latestParseJob.resultJson.resume_projects,
    );

    if (normalizedProjects.length === 0) {
      throw new ResumeServiceError(
        "review_required",
        "No structured projects were extracted from this resume yet.",
        409,
      );
    }

    const imported = sqlite.transaction(() => {
      const resumeDocument = resumeRepository.upsertResumeDocument({
        sourceDocumentId,
        candidateName: buildCandidateName(sourceDocument.rawText),
        summary: trimNullable(latestParseJob.resultJson?.source_summary) ?? sourceDocument.title,
      });
      const projects = resumeRepository.replaceResumeProjects({
        resumeDocumentId: resumeDocument.id,
        projects: normalizedProjects,
      });

      parseJobRepository.update(latestParseJob.id, {
        status: "confirmed",
        finishedAt: new Date().toISOString(),
      });
      sourceDocumentRepository.updateParseStatus(sourceDocumentId, "confirmed");
      chunkRepository.syncResumeProjectChunks();

      return {
        resumeDocument,
        projects,
      };
    })();

    return {
      resumeDocument: toApiResumeDocument(
        imported.resumeDocument,
        imported.projects.length,
      ),
      projects: imported.projects.map(toApiResumeProject),
    };
  },

  getResumeDetail(resumeId: string) {
    return getResumeDetailById(resumeId);
  },

  getProjectDetail(projectId: string) {
    return getProjectDetailById(projectId);
  },
};

export type ResumeWorkspace = ReturnType<typeof resumeService.getWorkspace>;
export type ResumeDetail = NonNullable<ReturnType<typeof resumeService.getResumeDetail>>;
export type ResumeProjectDetail = NonNullable<
  ReturnType<typeof resumeService.getProjectDetail>
>;
