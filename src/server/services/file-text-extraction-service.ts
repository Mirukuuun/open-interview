import fs from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

import type { SupportedUploadExtension } from "@/server/services/file-storage-service";
import { ImportServiceError } from "@/server/services/import-service-error";

const utf8TextDecoder = new TextDecoder("utf-8", { fatal: true });

function normalizeExtractedText(rawText: string) {
  return rawText
    .replace(/^\uFEFF/u, "")
    .replace(/\u0000/gu, "")
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

async function readUtf8TextFile(absoluteFilePath: string) {
  try {
    return await fs.readFile(absoluteFilePath, "utf8");
  } catch (error) {
    throw new ImportServiceError(
      "text_extraction_failed",
      "Failed to read text from the uploaded file.",
      422,
      {
        reason: error instanceof Error ? error.message : "unknown_read_error",
      },
    );
  }
}

function readUInt16Le(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function readUInt32Le(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function decodeXmlEntities(value: string) {
  return value.replace(
    /&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/giu,
    (match, entity: string) => {
      switch (entity.toLowerCase()) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return "\"";
        case "apos":
          return "'";
        default:
          if (entity.startsWith("#x") || entity.startsWith("#X")) {
            const codePoint = Number.parseInt(entity.slice(2), 16);

            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
          }

          if (entity.startsWith("#")) {
            const codePoint = Number.parseInt(entity.slice(1), 10);

            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
          }

          return match;
      }
    },
  );
}

type ZipEntry = {
  compressedSize: number;
  compressionMethod: number;
  flags: number;
  localHeaderOffset: number;
  name: string;
  uncompressedSize: number;
};

function listZipEntries(buffer: Buffer) {
  const entries = new Map<string, ZipEntry>();
  const searchStart = Math.max(0, buffer.length - 65_557);
  let endOfCentralDirectoryOffset = -1;

  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (readUInt32Le(buffer, offset) === 0x0605_4b50) {
      endOfCentralDirectoryOffset = offset;
      break;
    }
  }

  if (endOfCentralDirectoryOffset === -1) {
    throw new Error("missing_end_of_central_directory");
  }

  const totalEntries = readUInt16Le(buffer, endOfCentralDirectoryOffset + 10);
  let directoryOffset = readUInt32Le(buffer, endOfCentralDirectoryOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    if (readUInt32Le(buffer, directoryOffset) !== 0x0201_4b50) {
      throw new Error("invalid_central_directory_header");
    }

    const flags = readUInt16Le(buffer, directoryOffset + 8);
    const compressionMethod = readUInt16Le(buffer, directoryOffset + 10);
    const compressedSize = readUInt32Le(buffer, directoryOffset + 20);
    const uncompressedSize = readUInt32Le(buffer, directoryOffset + 24);
    const fileNameLength = readUInt16Le(buffer, directoryOffset + 28);
    const extraFieldLength = readUInt16Le(buffer, directoryOffset + 30);
    const fileCommentLength = readUInt16Le(buffer, directoryOffset + 32);
    const localHeaderOffset = readUInt32Le(buffer, directoryOffset + 42);
    const nameStart = directoryOffset + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = buffer.subarray(nameStart, nameEnd).toString("utf8");

    entries.set(name, {
      compressedSize,
      compressionMethod,
      flags,
      localHeaderOffset,
      name,
      uncompressedSize,
    });

    directoryOffset = nameEnd + extraFieldLength + fileCommentLength;
  }

  return entries;
}

const MAX_UNCOMPRESSED_ENTRY_BYTES = 256 * 1024 * 1024; // 256 MB

function readZipEntry(buffer: Buffer, entry: ZipEntry) {
  if ((entry.flags & 0x0001) !== 0) {
    throw new Error(`zip_entry_encrypted:${entry.name}`);
  }

  if (entry.uncompressedSize > MAX_UNCOMPRESSED_ENTRY_BYTES) {
    throw new Error(`zip_entry_too_large:${entry.name}`);
  }

  if (readUInt32Le(buffer, entry.localHeaderOffset) !== 0x0403_4b50) {
    throw new Error(`invalid_local_file_header:${entry.name}`);
  }

  const fileNameLength = readUInt16Le(buffer, entry.localHeaderOffset + 26);
  const extraFieldLength = readUInt16Le(buffer, entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraFieldLength;
  const dataEnd = dataStart + entry.compressedSize;
  const compressedBytes = buffer.subarray(dataStart, dataEnd);

  switch (entry.compressionMethod) {
    case 0:
      return compressedBytes;
    case 8:
      return inflateRawSync(compressedBytes, { maxOutputLength: MAX_UNCOMPRESSED_ENTRY_BYTES });
    default:
      throw new Error(`unsupported_zip_compression:${entry.compressionMethod}`);
  }
}

function extractTextFromWordprocessingXml(xmlText: string) {
  return decodeXmlEntities(
    xmlText
      .replace(/<w:tab\b[^>]*\/>/gu, "\t")
      .replace(/<w:(?:br|cr)\b[^>]*\/>/gu, "\n")
      .replace(/<\/w:p>/gu, "\n")
      .replace(/<\/w:tr>/gu, "\n")
      .replace(/<\/w:tc>/gu, "\t")
      .replace(/<[^>]+>/gu, ""),
  );
}

async function readDocxTextFile(absoluteFilePath: string) {
  let fileBuffer: Buffer;

  try {
    fileBuffer = await fs.readFile(absoluteFilePath);
  } catch (error) {
    throw new ImportServiceError(
      "text_extraction_failed",
      "Failed to read text from the uploaded DOCX file.",
      422,
      {
        reason: error instanceof Error ? error.message : "unknown_docx_read_error",
      },
    );
  }

  try {
    const entries = listZipEntries(fileBuffer);
    const documentXml = entries.get("word/document.xml");

    if (!documentXml) {
      throw new Error("missing_word_document_xml");
    }

    const supplementalXmlEntries = Array.from(entries.values())
      .filter((entry) =>
        /^word\/(?:header\d+|footer\d+|footnotes|endnotes)\.xml$/u.test(entry.name),
      )
      .sort((left, right) => left.name.localeCompare(right.name));

    const xmlParts = [documentXml, ...supplementalXmlEntries].map((entry) =>
      readZipEntry(fileBuffer, entry).toString("utf8"),
    );

    return xmlParts.map(extractTextFromWordprocessingXml).join("\n");
  } catch (error) {
    throw new ImportServiceError(
      "text_extraction_failed",
      "Failed to extract readable text from the uploaded DOCX file.",
      422,
      {
        reason: error instanceof Error ? error.message : "unknown_docx_extraction_error",
      },
    );
  }
}

function decodeUtf16Be(buffer: Buffer) {
  const byteLength = buffer.length - (buffer.length % 2);

  return Buffer.from(buffer.subarray(0, byteLength)).swap16().toString("utf16le");
}

function looksLikeUtf16Be(buffer: Buffer) {
  if (buffer.length < 4 || buffer.length % 2 !== 0) {
    return false;
  }

  let zeroByteCount = 0;

  for (let index = 0; index < buffer.length; index += 2) {
    if (buffer[index] === 0) {
      zeroByteCount += 1;
    }
  }

  return zeroByteCount >= Math.floor(buffer.length / 4);
}

function decodePdfByteString(buffer: Buffer) {
  if (buffer.length === 0) {
    return "";
  }

  if (buffer.length >= 2) {
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return decodeUtf16Be(buffer.subarray(2));
    }

    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return buffer.subarray(2).toString("utf16le");
    }
  }

  if (looksLikeUtf16Be(buffer)) {
    return decodeUtf16Be(buffer);
  }

  try {
    return utf8TextDecoder.decode(buffer);
  } catch {
    return buffer.toString("latin1");
  }
}

function decodePdfAsciiHex(input: string) {
  const compactHex = input.replace(/[^0-9a-f]/giu, "");

  if (compactHex.length === 0) {
    return Buffer.alloc(0);
  }

  const normalizedHex =
    compactHex.length % 2 === 0 ? compactHex : `${compactHex}0`;

  return Buffer.from(normalizedHex, "hex");
}

function decodePdfAscii85(input: string) {
  const output: number[] = [];
  const group: number[] = [];

  for (const character of input.replace(/\s+/gu, "")) {
    if (character === "~") {
      break;
    }

    if (character === "z") {
      if (group.length !== 0) {
        throw new Error("invalid_ascii85_compaction");
      }

      output.push(0, 0, 0, 0);
      continue;
    }

    const codePoint = character.codePointAt(0);

    if (codePoint === undefined || codePoint < 33 || codePoint > 117) {
      continue;
    }

    group.push(codePoint - 33);

    if (group.length === 5) {
      let value = 0;

      for (const digit of group) {
        value = value * 85 + digit;
      }

      output.push(
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
      );
      group.length = 0;
    }
  }

  if (group.length > 0) {
    const originalLength = group.length;

    while (group.length < 5) {
      group.push(84);
    }

    let value = 0;

    for (const digit of group) {
      value = value * 85 + digit;
    }

    for (let index = 0; index < originalLength - 1; index += 1) {
      output.push((value >>> (24 - index * 8)) & 0xff);
    }
  }

  return Buffer.from(output);
}

function parsePdfFilterList(dictionaryText: string) {
  const filterMatch = dictionaryText.match(
    /\/Filter\s*(\[[^\]]+\]|\/[A-Za-z0-9#]+)/u,
  );

  if (!filterMatch) {
    return [];
  }

  return Array.from(
    filterMatch[1].matchAll(/\/([A-Za-z0-9#]+)/gu),
    (match) => match[1],
  );
}

function applyPdfStreamFilters(streamBytes: Buffer, filters: string[]) {
  let decodedBytes = streamBytes;

  for (const filter of filters) {
    switch (filter) {
      case "FlateDecode":
      case "Fl":
        decodedBytes = inflateRawSync(decodedBytes);
        break;
      case "ASCIIHexDecode":
      case "AHx":
        decodedBytes = decodePdfAsciiHex(decodedBytes.toString("latin1"));
        break;
      case "ASCII85Decode":
      case "A85":
        decodedBytes = decodePdfAscii85(decodedBytes.toString("latin1"));
        break;
      default:
        throw new Error(`unsupported_pdf_filter:${filter}`);
    }
  }

  return decodedBytes;
}

function readPdfLiteralString(content: string, startIndex: number) {
  let index = startIndex + 1;
  let depth = 1;
  let value = "";

  while (index < content.length) {
    const character = content[index];

    if (character === "\\") {
      index += 1;

      if (index >= content.length) {
        break;
      }

      const escapedCharacter = content[index];

      switch (escapedCharacter) {
        case "n":
          value += "\n";
          index += 1;
          break;
        case "r":
          value += "\r";
          index += 1;
          break;
        case "t":
          value += "\t";
          index += 1;
          break;
        case "b":
          value += "\b";
          index += 1;
          break;
        case "f":
          value += "\f";
          index += 1;
          break;
        case "(":
        case ")":
        case "\\":
          value += escapedCharacter;
          index += 1;
          break;
        case "\n":
          index += 1;
          break;
        case "\r":
          index += content[index + 1] === "\n" ? 2 : 1;
          break;
        default: {
          if (/[0-7]/u.test(escapedCharacter)) {
            let octalDigits = escapedCharacter;
            let lookaheadIndex = index + 1;

            while (
              lookaheadIndex < content.length &&
              octalDigits.length < 3 &&
              /[0-7]/u.test(content[lookaheadIndex])
            ) {
              octalDigits += content[lookaheadIndex];
              lookaheadIndex += 1;
            }

            value += String.fromCharCode(Number.parseInt(octalDigits, 8));
            index = lookaheadIndex;
            break;
          }

          value += escapedCharacter;
          index += 1;
          break;
        }
      }

      continue;
    }

    if (character === "(") {
      depth += 1;
      value += character;
      index += 1;
      continue;
    }

    if (character === ")") {
      depth -= 1;

      if (depth === 0) {
        return {
          nextIndex: index + 1,
          value,
        };
      }

      value += character;
      index += 1;
      continue;
    }

    value += character;
    index += 1;
  }

  return {
    nextIndex: index,
    value,
  };
}

function readPdfHexString(content: string, startIndex: number) {
  let index = startIndex + 1;
  let value = "";

  while (index < content.length) {
    const character = content[index];

    if (character === ">") {
      return {
        nextIndex: index + 1,
        value,
      };
    }

    value += character;
    index += 1;
  }

  return {
    nextIndex: index,
    value,
  };
}

function cleanPdfTextFragment(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractTextFromPdfTextSection(content: string) {
  const lines: string[] = [];
  const currentLineFragments: string[] = [];
  let index = 0;

  const flushCurrentLine = () => {
    const line = currentLineFragments.join(" ").trim();

    if (line.length > 0) {
      lines.push(line);
    }

    currentLineFragments.length = 0;
  };

  while (index < content.length) {
    const character = content[index];

    if (character === "(") {
      const literalString = readPdfLiteralString(content, index);
      const cleanedValue = cleanPdfTextFragment(literalString.value);

      if (cleanedValue.length > 0) {
        currentLineFragments.push(cleanedValue);
      }

      index = literalString.nextIndex;
      continue;
    }

    if (character === "<" && content[index + 1] !== "<") {
      const hexString = readPdfHexString(content, index);
      const cleanedValue = cleanPdfTextFragment(
        decodePdfByteString(decodePdfAsciiHex(hexString.value)),
      );

      if (cleanedValue.length > 0) {
        currentLineFragments.push(cleanedValue);
      }

      index = hexString.nextIndex;
      continue;
    }

    if (content.startsWith("T*", index)) {
      flushCurrentLine();
      index += 2;
      continue;
    }

    if (character === "'" || character === "\"") {
      flushCurrentLine();
      index += 1;
      continue;
    }

    index += 1;
  }

  flushCurrentLine();

  return lines.join("\n");
}

function extractTextFromPdfStream(streamContent: string) {
  const sections: string[] = [];
  const textObjectRegex = /BT\b([\s\S]*?)ET\b/gu;

  for (const match of streamContent.matchAll(textObjectRegex)) {
    const sectionText = extractTextFromPdfTextSection(match[1]);

    if (sectionText.length > 0) {
      sections.push(sectionText);
    }
  }

  return sections.join("\n");
}

async function readPdfTextFile(absoluteFilePath: string) {
  let fileBuffer: Buffer;

  try {
    fileBuffer = await fs.readFile(absoluteFilePath);
  } catch (error) {
    throw new ImportServiceError(
      "text_extraction_failed",
      "Failed to read text from the uploaded PDF file.",
      422,
      {
        reason: error instanceof Error ? error.message : "unknown_pdf_read_error",
      },
    );
  }

  const pdfText = fileBuffer.toString("latin1");
  const objectRegex = /\d+\s+\d+\s+obj\b[\s\S]*?endobj/gu;
  const extractedSections: string[] = [];
  const extractionErrors: string[] = [];

  for (const objectMatch of pdfText.matchAll(objectRegex)) {
    const objectText = objectMatch[0];
    const streamStartIndex = objectText.indexOf("stream");

    if (streamStartIndex === -1) {
      continue;
    }

    const streamEndIndex = objectText.indexOf("endstream", streamStartIndex);

    if (streamEndIndex === -1) {
      continue;
    }

    const dictionaryStartIndex = objectText.lastIndexOf("<<", streamStartIndex);
    const dictionaryEndIndex = objectText.lastIndexOf(">>", streamStartIndex);

    if (dictionaryStartIndex === -1 || dictionaryEndIndex === -1) {
      continue;
    }

    const dictionaryText = objectText.slice(dictionaryStartIndex, dictionaryEndIndex + 2);
    let streamDataStart = streamStartIndex + "stream".length;

    if (objectText.startsWith("\r\n", streamDataStart)) {
      streamDataStart += 2;
    } else if (
      objectText.startsWith("\n", streamDataStart) ||
      objectText.startsWith("\r", streamDataStart)
    ) {
      streamDataStart += 1;
    }

    let streamDataEnd = streamEndIndex;

    if (objectText.startsWith("\r\n", streamDataEnd - 2)) {
      streamDataEnd -= 2;
    } else if (
      objectText.startsWith("\n", streamDataEnd - 1) ||
      objectText.startsWith("\r", streamDataEnd - 1)
    ) {
      streamDataEnd -= 1;
    }

    const rawStreamBytes = Buffer.from(
      objectText.slice(streamDataStart, streamDataEnd),
      "latin1",
    );

    try {
      const decodedStream = applyPdfStreamFilters(
        rawStreamBytes,
        parsePdfFilterList(dictionaryText),
      ).toString("latin1");
      const sectionText = extractTextFromPdfStream(decodedStream);

      if (sectionText.length > 0) {
        extractedSections.push(sectionText);
      }
    } catch (error) {
      extractionErrors.push(
        error instanceof Error ? error.message : "unknown_pdf_stream_error",
      );
    }
  }

  if (extractedSections.length === 0 && extractionErrors.length > 0) {
    throw new ImportServiceError(
      "text_extraction_failed",
      "Failed to extract readable text from the uploaded PDF file.",
      422,
      {
        reason: extractionErrors[0],
      },
    );
  }

  return extractedSections.join("\n");
}

export const fileTextExtractionService = {
  async extractTextFromFile(input: {
    absoluteFilePath: string;
    extension: SupportedUploadExtension;
  }) {
    let rawText: string;

    switch (input.extension) {
      case ".txt":
      case ".md":
        rawText = await readUtf8TextFile(input.absoluteFilePath);
        break;
      case ".pdf":
        rawText = await readPdfTextFile(input.absoluteFilePath);
        break;
      case ".docx":
        rawText = await readDocxTextFile(input.absoluteFilePath);
        break;
      default:
        throw new ImportServiceError(
          "unsupported_file_type",
          "Only .txt, .md, .pdf, and .docx files are supported in this slice.",
          415,
        );
    }

    const normalizedText = normalizeExtractedText(rawText);

    if (normalizedText.length === 0) {
      throw new ImportServiceError(
        "text_extraction_failed",
        "The uploaded file did not contain readable text.",
        422,
      );
    }

    return normalizedText;
  },
};
