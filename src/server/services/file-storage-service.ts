import fs from "node:fs/promises";
import path from "node:path";

import { ImportServiceError } from "@/server/services/import-service-error";

const supportedFileTypesByExtension = {
  ".txt": {
    extension: ".txt",
    mimeType: "text/plain",
  },
  ".md": {
    extension: ".md",
    mimeType: "text/markdown",
  },
  ".pdf": {
    extension: ".pdf",
    mimeType: "application/pdf",
  },
  ".docx": {
    extension: ".docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
} as const;

export type SupportedUploadExtension = keyof typeof supportedFileTypesByExtension;

export type StoredUploadFile = {
  absoluteFilePath: string;
  extension: SupportedUploadExtension;
  filePath: string;
  mimeType: string;
};

function normalizeUploadMimeType(
  extension: SupportedUploadExtension,
  mimeType: string | null | undefined,
) {
  const trimmedMimeType = mimeType?.trim().toLowerCase() ?? "";

  if (extension === ".md") {
    if (
      trimmedMimeType === "text/plain" ||
      trimmedMimeType === "text/markdown" ||
      trimmedMimeType === "text/x-markdown"
    ) {
      return "text/markdown";
    }

    return supportedFileTypesByExtension[extension].mimeType;
  }

  return supportedFileTypesByExtension[extension].mimeType;
}

function resolveUploadExtension(fileName: string, mimeType: string | null | undefined) {
  const trimmedFileName = fileName.trim();
  const extension = path.extname(trimmedFileName).toLowerCase();

  if (extension in supportedFileTypesByExtension) {
    return extension as SupportedUploadExtension;
  }

  const normalizedMimeType = mimeType?.trim().toLowerCase() ?? "";

  if (normalizedMimeType === "text/plain") {
    return ".txt";
  }

  if (
    normalizedMimeType === "text/markdown" ||
    normalizedMimeType === "text/x-markdown"
  ) {
    return ".md";
  }

  if (normalizedMimeType === "application/pdf") {
    return ".pdf";
  }

  if (
    normalizedMimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return ".docx";
  }

  throw new ImportServiceError(
    "unsupported_file_type",
    "Only .txt, .md, .pdf, and .docx files are supported in this slice.",
    415,
    {
      file_name: trimmedFileName,
      mime_type: mimeType ?? null,
    },
  );
}

export const fileStorageService = {
  async saveUploadedFile(input: {
    sourceDocumentId: string;
    fileName: string;
    mimeType?: string | null;
    fileBuffer: Buffer;
  }): Promise<StoredUploadFile> {
    const trimmedFileName = input.fileName.trim();

    if (trimmedFileName.length === 0) {
      throw new ImportServiceError(
        "invalid_request",
        "Uploaded file must include a file name.",
        400,
      );
    }

    const extension = resolveUploadExtension(trimmedFileName, input.mimeType);
    const relativeFilePath = path.posix.join(
      "storage",
      "raw",
      input.sourceDocumentId,
      `original${extension}`,
    );
    const absoluteFilePath = path.join(process.cwd(), relativeFilePath);

    await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
    await fs.writeFile(absoluteFilePath, input.fileBuffer);

    return {
      absoluteFilePath,
      extension,
      filePath: relativeFilePath,
      mimeType: normalizeUploadMimeType(extension, input.mimeType),
    };
  },

  async deleteStoredFile(filePath: string | null | undefined) {
    if (!filePath) {
      return;
    }

    const normalizedFilePath = path.normalize(filePath);
    const absoluteFilePath = path.resolve(process.cwd(), normalizedFilePath);
    const rawStorageRoot = path.resolve(process.cwd(), "storage", "raw");

    if (!absoluteFilePath.startsWith(rawStorageRoot)) {
      return;
    }

    await fs.rm(path.dirname(absoluteFilePath), {
      recursive: true,
      force: true,
    });
  },
};
