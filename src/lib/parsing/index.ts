import { UPLOAD_LIMITS } from "../analysis/config";
import { assessCondition } from "../analysis/engine";
import { detectLanguage } from "../analysis/normalize";
import type { CVLanguage, DocumentCondition } from "../analysis/schema";
import { cleanExtractedText } from "../analysis/text";

/**
 * File ingestion.
 *
 * Uploaded files are never executed, never written to a path derived from
 * user input, and never trusted on their declared MIME type alone — the magic
 * bytes decide the parser. Everything happens in memory on a Node runtime.
 */

export type SupportedFormat = "pdf" | "docx" | "txt";

export interface ParsedDocument {
  text: string;
  language: CVLanguage;
  condition: DocumentCondition;
  pageCount: number | null;
  format: SupportedFormat;
  characters: number;
}

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

export class FileTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileTooLargeError";
  }
}

/* -------------------------------------------------------------------------- */
/* Format detection                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Detects the true format from the file's leading bytes. A renamed `.exe`
 * with a PDF extension must not reach a parser, and a real DOCX mislabelled
 * as `application/octet-stream` by the browser should still work.
 */
export function detectFormat(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): SupportedFormat | null {
  // %PDF
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "pdf";
  }

  // PK zip container — DOCX is a zip. Confirm it is a Word document rather
  // than an arbitrary archive.
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    const head = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("latin1");
    if (head.includes("word/") || head.includes("[Content_Types].xml")) {
      return "docx";
    }
    return null;
  }

  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (extension === ".txt" || mimeType === "text/plain") {
    // Reject binary content masquerading as text.
    const sample = buffer.subarray(0, Math.min(buffer.length, 2048));
    const nullBytes = sample.filter((b) => b === 0).length;
    if (nullBytes === 0) return "txt";
  }

  return null;
}

/** Validates size and extension before any parsing work is attempted. */
export function validateUpload(file: {
  size: number;
  name: string;
  type: string;
}): void {
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    throw new FileTooLargeError(
      `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum is ${
        UPLOAD_LIMITS.maxBytes / 1024 / 1024
      } MB.`,
    );
  }

  if (file.size === 0) {
    throw new UnsupportedFileError("This file appears to be empty.");
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowed = UPLOAD_LIMITS.allowedExtensions as readonly string[];
  if (!allowed.includes(extension)) {
    throw new UnsupportedFileError(
      "Please upload a PDF, DOCX or TXT file.",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Parsers                                                                    */
/* -------------------------------------------------------------------------- */

/** One positioned text run as reported by pdf.js. */
interface PdfTextItem {
  str: string;
  transform?: number[];
  hasEOL?: boolean;
}

/**
 * Rebuilds line structure from a PDF's positioned text runs.
 *
 * This matters more than it looks. A PDF has no concept of a line — only
 * glyphs at coordinates. Naively concatenating the runs (which is what the
 * convenience helpers do) yields one enormous line, and every downstream
 * heuristic that depends on structure breaks: section headings stop being
 * headings, bullets stop being bullets, and a genuinely strong CV scores like
 * a weak one. So we group runs by their vertical position instead.
 *
 * Within a line the runs are kept in content-stream order rather than sorted
 * by x. That is deliberate: sorting by ascending x would reverse the word
 * order of right-to-left Arabic text.
 */
const ARABIC_CHARS = /[؀-ۿ]/g;
const LATIN_CHARS = /[A-Za-z]/g;

/**
 * Orders the runs of a single line and joins them.
 *
 * Arabic PDFs are the reason this is not simply `items.join("")`. Producers
 * commonly emit right-to-left runs in *visual* order, so concatenating them
 * yields a line whose words are backwards. Ordering by x-coordinate — right
 * to left for an Arabic-dominant line, left to right otherwise — recovers
 * logical reading order for both scripts.
 */
function joinLineItems(items: PdfTextItem[]): string {
  if (items.length === 0) return "";

  const text = items.map((i) => i.str).join("");
  const arabic = (text.match(ARABIC_CHARS) ?? []).length;
  const latin = (text.match(LATIN_CHARS) ?? []).length;
  const isRtl = arabic > latin;

  const positioned = items.filter((i) => typeof i.transform?.[4] === "number");

  // Without coordinates we can only trust the stream order.
  if (positioned.length !== items.length) {
    return items.map((i) => i.str).join("");
  }

  const ordered = [...items].sort((a, b) => {
    const ax = a.transform?.[4] ?? 0;
    const bx = b.transform?.[4] ?? 0;
    return isRtl ? bx - ax : ax - bx;
  });

  return ordered.map((i) => i.str).join(isRtl ? " " : "");
}

function itemsToLines(items: PdfTextItem[]): string {
  const lines: string[] = [];
  let current: PdfTextItem[] = [];
  let currentY: number | null = null;

  const flush = () => {
    if (current.length === 0) return;
    const line = joinLineItems(current).replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
    current = [];
  };

  for (const item of items) {
    const y = item.transform?.[5];

    if (typeof y === "number" && currentY !== null) {
      // A vertical shift larger than a fraction of a line means a new line.
      // The tolerance absorbs sub-pixel drift and superscripts.
      if (Math.abs(y - currentY) > 2.5) flush();
    }
    if (typeof y === "number") currentY = y;

    current.push(item);

    // pdf.js flags an explicit end-of-line in the content stream.
    if (item.hasEOL) flush();
  }
  flush();

  // NFKC folds Arabic presentation forms (U+FB50–U+FEFF), which is how many
  // PDFs encode shaped Arabic glyphs, back to base letters. Without this the
  // text renders correctly but matches nothing in the lexicon.
  return lines.join("\n").normalize("NFKC");
}

async function parsePdf(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number | null }> {
  // unpdf bundles a serverless-friendly build of pdf.js and, unlike
  // pdf-parse, does not read test fixtures from disk at import time.
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const pageCount: number = pdf.numPages;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(itemsToLines(content.items as PdfTextItem[]));
  }

  return { text: pages.join("\n\n"), pageCount };
}

async function parseDocx(buffer: Buffer): Promise<{ text: string }> {
  const mammoth = await import("mammoth");
  // Raw text rather than HTML: we want the content, not the styling, and
  // extracting raw text avoids any HTML ever reaching a renderer.
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

function parseTxt(buffer: Buffer): { text: string } {
  // Honour a UTF-8 BOM if present, and decode strictly as UTF-8 so Arabic
  // survives intact.
  const hasBom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;
  const body = hasBom ? buffer.subarray(3) : buffer;
  return { text: new TextDecoder("utf-8").decode(body) };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ParsedDocument> {
  const format = detectFormat(buffer, filename, mimeType);

  if (!format) {
    throw new UnsupportedFileError(
      "We couldn't recognise this file. Please upload a text-based PDF, DOCX or TXT file.",
    );
  }

  let raw = "";
  let pageCount: number | null = null;

  try {
    if (format === "pdf") {
      const result = await parsePdf(buffer);
      raw = result.text;
      pageCount = result.pageCount;
    } else if (format === "docx") {
      raw = (await parseDocx(buffer)).text;
    } else {
      raw = parseTxt(buffer).text;
    }
  } catch (error) {
    console.error("[parsing] extraction failed", { format, error });
    // A parser crash is treated as an unreadable document rather than a
    // server error: the user gets an explanation, not a 500.
    return {
      text: "",
      language: "unknown",
      condition: "unreadable",
      pageCount: null,
      format,
      characters: 0,
    };
  }

  const text = cleanExtractedText(raw);

  return {
    text,
    language: detectLanguage(text),
    condition: assessCondition(text, pageCount),
    pageCount,
    format,
    characters: text.length,
  };
}

/** Handles the "paste your CV" path, which skips file handling entirely. */
export function parsePastedText(input: string): ParsedDocument {
  const text = cleanExtractedText(input);
  return {
    text,
    language: detectLanguage(text),
    condition: assessCondition(text, null),
    pageCount: null,
    format: "txt",
    characters: text.length,
  };
}

/** User-facing message for a document we could not read. */
export function conditionMessage(condition: DocumentCondition): string | null {
  switch (condition) {
    case "image_based_document":
      return "We couldn't reliably read this CV. Try uploading a text-based PDF or DOCX.";
    case "unreadable":
      return "We couldn't reliably read this CV. Try uploading a text-based PDF or DOCX.";
    case "too_short":
      return "We could only read a small amount of text from this CV. The report below may be incomplete — try uploading a text-based PDF or DOCX.";
    default:
      return null;
  }
}
