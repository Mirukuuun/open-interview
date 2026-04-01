import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * [POS] 负责从 `src/prompts/*.md` 读取 prompt 文档、解析分节，并把运行时变量渲染成最终 prompt 文本。
 * [IN] prompt markdown 文件名、section 名称与运行时模板变量。
 * [OUT] 返回缓存后的 prompt 文档、指定 section 内容和渲染后的字符串；不负责具体业务 prompt 的上下文选择。
 *
 * @feature open-interview-server-core-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

type PromptMarkdownDocument = {
  metadata: Record<string, string>;
  sections: Record<string, string>;
};

const promptMarkdownCache = new Map<string, PromptMarkdownDocument>();

function normalizePromptNewlines(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function normalizeSectionName(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parsePromptMetadata(rawMetadata: string) {
  return rawMetadata
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .reduce<Record<string, string>>((metadata, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex <= 0) {
        throw new Error(`Invalid prompt metadata line: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      metadata[key] = value;
      return metadata;
    }, {});
}

function parsePromptMarkdown(content: string) {
  let normalizedContent = normalizePromptNewlines(content).trim();
  let metadata: Record<string, string> = {};

  if (normalizedContent.startsWith("---\n")) {
    const metadataEndIndex = normalizedContent.indexOf("\n---\n", 4);

    if (metadataEndIndex === -1) {
      throw new Error("Prompt markdown frontmatter is not closed.");
    }

    metadata = parsePromptMetadata(
      normalizedContent.slice(4, metadataEndIndex).trim(),
    );
    normalizedContent = normalizedContent.slice(metadataEndIndex + 5).trim();
  }

  const sectionMatches = Array.from(
    normalizedContent.matchAll(/^##\s+([^\n]+)\n/gm),
  );

  if (sectionMatches.length === 0) {
    throw new Error("Prompt markdown must contain at least one ## section.");
  }

  const sections = sectionMatches.reduce<Record<string, string>>(
    (collection, match, index) => {
      const sectionName = normalizeSectionName(match[1] ?? "");
      const sectionStart = (match.index ?? 0) + match[0].length;
      const sectionEnd =
        index + 1 < sectionMatches.length
          ? (sectionMatches[index + 1]?.index ?? normalizedContent.length)
          : normalizedContent.length;

      collection[sectionName] = normalizedContent
        .slice(sectionStart, sectionEnd)
        .trim();
      return collection;
    },
    {},
  );

  return {
    metadata,
    sections,
  } satisfies PromptMarkdownDocument;
}

export function loadPromptMarkdown(fileName: string) {
  const cachedDocument = promptMarkdownCache.get(fileName);

  if (cachedDocument) {
    return cachedDocument;
  }

  const promptPath = path.join(process.cwd(), "src", "prompts", fileName);
  const promptDocument = parsePromptMarkdown(
    readFileSync(promptPath, "utf8"),
  );

  promptMarkdownCache.set(fileName, promptDocument);
  return promptDocument;
}

export function getRequiredPromptMetadata(
  document: PromptMarkdownDocument,
  key: string,
) {
  const value = document.metadata[key];

  if (!value) {
    throw new Error(`Prompt metadata "${key}" is missing.`);
  }

  return value;
}

export function getRequiredPromptSection(
  document: PromptMarkdownDocument,
  sectionName: string,
) {
  const normalizedSectionName = normalizeSectionName(sectionName);
  const value = document.sections[normalizedSectionName];

  if (!value) {
    throw new Error(`Prompt section "${normalizedSectionName}" is missing.`);
  }

  return value;
}

function stringifyPromptValue(value: unknown): string {
  if (value === null || value === undefined || value === false) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

export function renderPromptTemplate(
  template: string,
  values: Record<string, unknown>,
): string {
  const renderedBlocks = template.replace(
    /{{#([a-zA-Z0-9_]+)}}([\s\S]*?){{\/\1}}/g,
    (_match, key: string, block: string) => {
      const blockValue = values[key];

      if (!blockValue) {
        return "";
      }

      const scopedValues =
        blockValue && typeof blockValue === "object" && !Array.isArray(blockValue)
          ? {
              ...values,
              ...(blockValue as Record<string, unknown>),
            }
          : values;

      return renderPromptTemplate(block, scopedValues);
    },
  );

  return renderedBlocks
    .replace(/{{([a-zA-Z0-9_]+)}}/g, (_match, key: string) =>
      stringifyPromptValue(values[key]),
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
