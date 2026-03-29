import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import Database from "better-sqlite3";

const rootDir = path.resolve(import.meta.dirname, "..");
const uploadRoutePath = path.join(
  rootDir,
  ".next",
  "server",
  "app",
  "api",
  "sources",
  "upload",
  "route.js",
);
const parseJobResultRoutePath = path.join(
  rootDir,
  ".next",
  "server",
  "app",
  "api",
  "parse-jobs",
  "[jobId]",
  "result",
  "route.js",
);
const smokeDbPath = "/tmp/at-v1-013-7e-smoke.sqlite";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runNodeScript(relativePath, env) {
  const result = spawnSync(process.execPath, [relativePath], {
    cwd: rootDir,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to run ${relativePath}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return result.stdout.trim();
}

function readJsonResponse(response) {
  return response.json();
}

function createModelResponse(payload) {
  return new Response(
    JSON.stringify({
      output_text: JSON.stringify(payload),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

function buildLongSourceText() {
  const header = [
    "Company: OpenClaw",
    "Role: Backend Engineer",
    "Round: Long Document Loop",
    "Summary: Generated repeated-content sample for bounded chunking smoke.",
  ].join("\n");
  const repeatedSection = [
    "Question: What is Redis cache penetration?",
    "Answer: Use empty-value caching, bloom filters, and request validation to stop repeated misses.",
    "",
    "Question: How does ThreadLocal work internally?",
    "Answer: Each thread keeps a ThreadLocalMap keyed by weak references, and stale entries must be cleaned up carefully.",
    "",
    "Question: How do you design idempotent APIs?",
    "Answer: Use idempotency keys, durable request records, and conflict-safe writes so retries do not duplicate side effects.",
    "",
    "Notes: This repeated block intentionally pushes the source past the single-call threshold while preserving paragraph structure.",
    "Context: Deterministic repeated content for long-document smoke validation.",
  ].join("\n");

  let output = header;
  let index = 1;

  while (output.length < 40_500) {
    output += `\n\n## Round ${index}\n${repeatedSection}\nExtra ${index}: ${"Repeated supporting detail for chunking proof. ".repeat(8)}`;
    index += 1;
  }

  return output;
}

function buildShortSourceText() {
  return [
    "Company: ShortCo",
    "Role: Backend Engineer",
    "Round: One",
    "Summary: Short-path regression proof.",
    "",
    "Question: What is CAP theorem?",
    "Answer: It highlights the trade-offs between consistency, availability, and partition tolerance.",
  ].join("\n");
}

function getCanonicalCounts(databasePath) {
  const sqlite = new Database(databasePath, {
    readonly: true,
  });

  try {
    return {
      question_items: sqlite.prepare("SELECT COUNT(*) AS count FROM question_items").get().count,
      answer_variants: sqlite.prepare("SELECT COUNT(*) AS count FROM answer_variants").get().count,
      source_question_refs: sqlite
        .prepare("SELECT COUNT(*) AS count FROM source_question_refs")
        .get().count,
    };
  } finally {
    sqlite.close();
  }
}

function parsePromptMetadata(promptText) {
  const titleMatch = promptText.match(/^Title:\s*(.+)$/mu);
  const chunkMatch = promptText.match(/^Chunk:\s*(\d+)\s+of\s+(\d+)$/mu);

  return {
    title: titleMatch?.[1] ?? "",
    chunkIndex: chunkMatch ? Number(chunkMatch[1]) : null,
    chunkCount: chunkMatch ? Number(chunkMatch[2]) : null,
    hasChunkMarker: Boolean(chunkMatch),
  };
}

function resolveUserlandRoute(moduleNamespace, methodName) {
  return (
    moduleNamespace?.[methodName] ??
    moduleNamespace?.default?.[methodName] ??
    moduleNamespace?.default?.routeModule?.userland?.[methodName] ??
    null
  );
}

function buildLongChunkPayload(chunkIndex) {
  if (chunkIndex === 1) {
    return {
      source_summary: "Chunk 1 summary",
      source_kind_guess: "interview_experience",
      interview_experience: {
        company: "OpenClaw",
        role: "Backend Engineer",
        round_info: "Long Document Loop",
        summary: "Generated repeated-content sample for bounded chunking smoke.",
        tags: ["redis", "backend"],
      },
      questions: [
        {
          question_text: "What is Redis cache penetration?",
          canonical_answer:
            "Use empty-value caching, bloom filters, and request validation to stop repeated misses.",
          source_answer:
            "Use empty-value caching, bloom filters, and request validation to stop repeated misses.",
          category: "distributed_system",
          tags: ["redis"],
          confidence: 0.91,
        },
      ],
      warnings: [],
    };
  }

  if (chunkIndex === 2) {
    return {
      source_summary: "Chunk 2 summary",
      source_kind_guess: "interview_experience",
      interview_experience: {
        company: "OpenClaw",
        role: "Backend Engineer",
        round_info: "Long Document Loop",
        summary: "Generated repeated-content sample for bounded chunking smoke with repeated middle rounds.",
        tags: ["threadlocal"],
      },
      questions: [
        {
          question_text: "What is Redis cache penetration?",
          canonical_answer:
            "Protect the cache layer with bloom filters and negative caching before repeated misses hit the database.",
          source_answer:
            "Protect the cache layer with bloom filters and negative caching before repeated misses hit the database.",
          category: "distributed_system",
          tags: ["redis", "cache"],
          confidence: 0.84,
        },
        {
          question_text: "How does ThreadLocal work internally?",
          canonical_answer:
            "Each thread holds a ThreadLocalMap keyed by weak references, so stale entries must be cleaned up carefully.",
          source_answer:
            "Each thread holds a ThreadLocalMap keyed by weak references, so stale entries must be cleaned up carefully.",
          category: "java_concurrency",
          tags: ["threadlocal", "concurrency"],
          confidence: 0.89,
        },
      ],
      warnings: ["Repeated middle rounds were merged deterministically."],
    };
  }

  return {
    source_summary: "Chunk 3 summary",
    source_kind_guess: "interview_experience",
    interview_experience: {
      company: "OpenClaw",
      role: "Backend Engineer",
      round_info: "Long Document Loop",
      summary: "Generated repeated-content sample for bounded chunking smoke with final rounds.",
      tags: ["design"],
    },
    questions: [
      {
        question_text: "How do you design idempotent APIs?",
        canonical_answer:
          "Use idempotency keys, durable request records, and conflict-safe writes so retries do not duplicate side effects.",
        source_answer:
          "Use idempotency keys, durable request records, and conflict-safe writes so retries do not duplicate side effects.",
        category: "system_design",
        tags: ["design"],
        confidence: 0.9,
      },
    ],
    warnings: [],
  };
}

function buildShortPayload() {
  return {
    source_summary: "Short summary",
    source_kind_guess: "interview_experience",
    interview_experience: {
      company: "ShortCo",
      role: "Backend Engineer",
      round_info: "One",
      summary: "Short-path regression proof.",
      tags: ["network"],
    },
    questions: [
      {
        question_text: "What is CAP theorem?",
        canonical_answer:
          "It describes the trade-offs between consistency, availability, and partition tolerance.",
        source_answer:
          "It describes the trade-offs between consistency, availability, and partition tolerance.",
        category: "distributed_system",
        tags: ["network"],
        confidence: 0.88,
      },
    ],
    warnings: [],
  };
}

async function uploadSource(routeModule, fileName, title, rawText) {
  const formData = new FormData();

  formData.set(
    "file",
    new File([rawText], fileName, {
      type: "text/markdown",
    }),
  );
  formData.set("title", title);
  formData.set("kind", "interview_experience");
  formData.set("submit_mode", "save_and_review");

  const postHandler = resolveUserlandRoute(routeModule, "POST");

  assert(postHandler, "Compiled upload route did not expose POST.");

  return postHandler(
    new Request("http://127.0.0.1/api/sources/upload", {
      method: "POST",
      body: formData,
    }),
  );
}

async function readParseResult(routeModule, jobId) {
  const getHandler = resolveUserlandRoute(routeModule, "GET");

  assert(getHandler, "Compiled parse-job result route did not expose GET.");

  return getHandler(new Request(`http://127.0.0.1/api/parse-jobs/${jobId}/result`), {
    params: Promise.resolve({
      jobId,
    }),
  });
}

async function main() {
  assert(fs.existsSync(uploadRoutePath), "Missing compiled upload route. Run build first.");
  assert(
    fs.existsSync(parseJobResultRoutePath),
    "Missing compiled parse-job result route. Run build first.",
  );

  fs.rmSync(smokeDbPath, {
    force: true,
  });

  runNodeScript("scripts/db/init.mjs", {
    OPEN_INTERVIEW_DB_PATH: smokeDbPath,
  });

  process.env.OPEN_INTERVIEW_DB_PATH = smokeDbPath;
  process.env.LLM_BASE_URL = "http://mocked.local/v1";
  process.env.LLM_MODEL_PARSE_INTERVIEW = "gpt-5.4";
  process.env.OPEN_INTERVIEW_ALLOW_HEURISTIC_INTERVIEW_PARSE_FALLBACK = "0";

  const uploadRouteModule = await import(pathToFileURL(uploadRoutePath).href);
  const parseJobResultRouteModule = await import(pathToFileURL(parseJobResultRoutePath).href);
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_url, init) => {
    const bodyText = typeof init?.body === "string" ? init.body : "";
    const payload = JSON.parse(bodyText);
    const promptText = payload?.input?.[1]?.content;

    assert(typeof promptText === "string", "Mock LLM transport received an invalid prompt.");

    const promptMetadata = parsePromptMetadata(promptText);

    fetchCalls.push(promptMetadata);

    if (promptMetadata.title.includes("Long chunking smoke sample")) {
      assert(promptMetadata.hasChunkMarker, "Long sample did not use the chunking prompt branch.");
      return createModelResponse(buildLongChunkPayload(promptMetadata.chunkIndex ?? 1));
    }

    if (promptMetadata.title.includes("Short regression smoke sample")) {
      assert(!promptMetadata.hasChunkMarker, "Short sample unexpectedly used the chunking branch.");
      return createModelResponse(buildShortPayload());
    }

    throw new Error(`Unexpected prompt title in smoke mock: ${promptMetadata.title}`);
  };

  try {
    const longRawText = buildLongSourceText();
    assert(
      longRawText.length > 24_000,
      `Expected generated long sample to exceed the chunking threshold, got ${longRawText.length}.`,
    );

    const longUploadResponse = await uploadSource(
      uploadRouteModule,
      "long-chunking-smoke.md",
      "Long chunking smoke sample",
      longRawText,
    );
    const longUploadPayload = await readJsonResponse(longUploadResponse);

    assert(longUploadResponse.status === 201, `Long upload failed with HTTP ${longUploadResponse.status}.`);
    assert(longUploadPayload.ok === true, "Long upload response envelope was not ok.");
    assert(
      longUploadPayload.data.source_document.parse_status === "needs_review",
      "Long upload did not reach needs_review.",
    );
    assert(
      longUploadPayload.data.parse_job?.status === "needs_review",
      "Long upload parse job did not reach needs_review.",
    );

    const longJobId = longUploadPayload.data.parse_job.id;
    const longChunkCalls = fetchCalls.filter((call) =>
      call.title.includes("Long chunking smoke sample"),
    );

    assert(longChunkCalls.length === 3, `Expected 3 LLM calls for long sample, got ${longChunkCalls.length}.`);
    assert(
      longChunkCalls.every(
        (call) => call.hasChunkMarker && call.chunkCount === 3,
      ),
      "Long sample did not keep deterministic chunk metadata across all LLM calls.",
    );

    const longResultResponse = await readParseResult(parseJobResultRouteModule, longJobId);
    const longResultPayload = await readJsonResponse(longResultResponse);

    assert(longResultResponse.status === 200, `Long result fetch failed with HTTP ${longResultResponse.status}.`);
    assert(longResultPayload.ok === true, "Long result response envelope was not ok.");
    assert(longResultPayload.data.result !== null, "Long parse result was null.");
    assert(
      longResultPayload.data.result.questions.length === 3,
      `Expected merged long result to contain 3 questions after dedupe, got ${longResultPayload.data.result.questions.length}.`,
    );
    assert(
      (longResultPayload.data.result.warnings ?? []).some((warning) =>
        warning.includes("Long source was parsed in 3 chunks"),
      ),
      "Merged long result did not record the chunking warning.",
    );

    const shortUploadResponse = await uploadSource(
      uploadRouteModule,
      "short-regression-smoke.md",
      "Short regression smoke sample",
      buildShortSourceText(),
    );
    const shortUploadPayload = await readJsonResponse(shortUploadResponse);

    assert(shortUploadResponse.status === 201, `Short upload failed with HTTP ${shortUploadResponse.status}.`);
    assert(shortUploadPayload.ok === true, "Short upload response envelope was not ok.");
    assert(
      shortUploadPayload.data.source_document.parse_status === "needs_review",
      "Short upload did not reach needs_review.",
    );

    const shortCalls = fetchCalls.filter((call) =>
      call.title.includes("Short regression smoke sample"),
    );

    assert(shortCalls.length === 1, `Expected 1 LLM call for short sample, got ${shortCalls.length}.`);
    assert(
      shortCalls[0] && shortCalls[0].hasChunkMarker === false,
      "Short sample did not stay on the single-call path.",
    );

    const shortResultResponse = await readParseResult(
      parseJobResultRouteModule,
      shortUploadPayload.data.parse_job.id,
    );
    const shortResultPayload = await readJsonResponse(shortResultResponse);

    assert(shortResultResponse.status === 200, `Short result fetch failed with HTTP ${shortResultResponse.status}.`);
    assert(shortResultPayload.ok === true, "Short result response envelope was not ok.");
    assert(shortResultPayload.data.result !== null, "Short parse result was null.");
    assert(
      shortResultPayload.data.result.questions.length === 1,
      `Expected short result to contain 1 question, got ${shortResultPayload.data.result.questions.length}.`,
    );

    const canonicalCounts = getCanonicalCounts(smokeDbPath);

    assert(canonicalCounts.question_items === 0, "Canonical question_items changed before confirmation.");
    assert(canonicalCounts.answer_variants === 0, "Canonical answer_variants changed before confirmation.");
    assert(
      canonicalCounts.source_question_refs === 0,
      "Canonical source_question_refs changed before confirmation.",
    );

    process.stdout.write(`smoke_db=${smokeDbPath}\n`);
    process.stdout.write(`long_sample_chars=${longRawText.length}\n`);
    process.stdout.write(`long_chunk_calls=${longChunkCalls.length}\n`);
    process.stdout.write(`long_merged_questions=${longResultPayload.data.result.questions.length}\n`);
    process.stdout.write(`long_job_id=${longJobId}\n`);
    process.stdout.write(`short_single_call=${shortCalls.length}\n`);
    process.stdout.write(`short_job_id=${shortUploadPayload.data.parse_job.id}\n`);
    process.stdout.write(
      `canonical_counts=${canonicalCounts.question_items}/${canonicalCounts.answer_variants}/${canonicalCounts.source_question_refs}\n`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await main();
