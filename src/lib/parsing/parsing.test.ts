import { describe, expect, it } from "vitest";

import { ARABIC_CV, STRONG_CV } from "../analysis/__fixtures__/cvs";
import {
  FileTooLargeError,
  UnsupportedFileError,
  conditionMessage,
  detectFormat,
  parseDocument,
  parsePastedText,
  validateUpload,
} from "./index";

const txtBuffer = (text: string) => Buffer.from(text, "utf-8");

describe("upload validation", () => {
  it("rejects files above the size limit", () => {
    expect(() =>
      validateUpload({ size: 9 * 1024 * 1024, name: "cv.pdf", type: "application/pdf" }),
    ).toThrow(FileTooLargeError);
  });

  it("rejects empty files", () => {
    expect(() =>
      validateUpload({ size: 0, name: "cv.pdf", type: "application/pdf" }),
    ).toThrow(UnsupportedFileError);
  });

  it("rejects unsupported extensions", () => {
    for (const name of ["cv.exe", "cv.jpg", "cv.pages", "cv"]) {
      expect(() =>
        validateUpload({ size: 1024, name, type: "application/octet-stream" }),
      ).toThrow(UnsupportedFileError);
    }
  });

  it("accepts the supported extensions", () => {
    for (const name of ["cv.pdf", "cv.docx", "cv.doc", "cv.txt", "CV.PDF"]) {
      expect(() =>
        validateUpload({ size: 1024, name, type: "application/pdf" }),
      ).not.toThrow();
    }
  });
});

describe("format detection", () => {
  it("identifies a PDF by its magic bytes, not its name", () => {
    const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(64)]);
    expect(detectFormat(pdf, "resume.txt", "text/plain")).toBe("pdf");
  });

  it("identifies plain text", () => {
    expect(detectFormat(txtBuffer(STRONG_CV), "cv.txt", "text/plain")).toBe("txt");
  });

  it("refuses a binary file renamed to .txt", () => {
    const binary = Buffer.from([0x00, 0x01, 0x02, 0x00, 0xff, 0xfe]);
    expect(detectFormat(binary, "cv.txt", "text/plain")).toBeNull();
  });

  it("refuses a zip archive that is not a Word document", () => {
    const zip = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from("photos/holiday.jpg"),
      Buffer.alloc(64),
    ]);
    expect(detectFormat(zip, "cv.docx", "application/zip")).toBeNull();
  });

  it("refuses an unrecognised binary", () => {
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);
    expect(detectFormat(exe, "cv.pdf", "application/pdf")).toBeNull();
  });
});

describe("text parsing", () => {
  it("parses a UTF-8 text CV", async () => {
    const result = await parseDocument(
      txtBuffer(STRONG_CV),
      "cv.txt",
      "text/plain",
    );
    expect(result.format).toBe("txt");
    expect(result.condition).toBe("ok");
    expect(result.language).toBe("en");
    expect(result.text).toContain("Supply Chain");
  });

  it("preserves Arabic text and its numerals", async () => {
    const result = await parseDocument(
      txtBuffer(ARABIC_CV),
      "cv.txt",
      "text/plain",
    );
    expect(result.text).toContain("مدير التسويق الرقمي");
    expect(result.text).toContain("٣٤٪");
    expect(["ar", "mixed"]).toContain(result.language);
  });

  it("strips a UTF-8 BOM", async () => {
    const withBom = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      txtBuffer(STRONG_CV),
    ]);
    const result = await parseDocument(withBom, "cv.txt", "text/plain");
    expect(result.text.startsWith("Sara")).toBe(true);
  });

  it("rejects a file it cannot recognise", async () => {
    const junk = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    await expect(
      parseDocument(junk, "cv.png", "image/png"),
    ).rejects.toThrow(UnsupportedFileError);
  });

  it("flags an effectively empty document rather than scoring it", async () => {
    const result = await parseDocument(txtBuffer("   \n  \n "), "cv.txt", "text/plain");
    expect(result.condition).toBe("image_based_document");
    expect(conditionMessage(result.condition)).toContain("couldn't reliably read");
  });
});

describe("pasted text", () => {
  it("handles the paste path without any file handling", () => {
    const result = parsePastedText(STRONG_CV);
    expect(result.condition).toBe("ok");
    expect(result.format).toBe("txt");
    expect(result.characters).toBeGreaterThan(500);
  });

  it("normalises Windows line endings", () => {
    const result = parsePastedText("Line one\r\nLine two\r\n\r\n\r\nLine three");
    expect(result.text).not.toContain("\r");
    expect(result.text).toBe("Line one\nLine two\n\nLine three");
  });
});
