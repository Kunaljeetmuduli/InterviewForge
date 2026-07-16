import { describe, expect, it } from "vitest";

import {
  PdfParseExtractor,
  withTimeout,
} from "../src/modules/resume/pdf-extractor.js";

function createTwoPagePdf(): Uint8Array {
  const streams = ["BT /F1 12 Tf 40 100 Td (Page one) Tj ET", "BT /F1 12 Tf 40 100 Td (Page two) Tj ET"];
  const [firstStream, secondStream] = streams as [string, string];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${firstStream.length} >>\nstream\n${firstStream}\nendstream`,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${secondStream.length} >>\nstream\n${secondStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let source = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(source.length);
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = source.length;
  source += `xref\n0 ${objects.length + 1}\n`;
  source += "0000000000 65535 f \n";
  source += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(source);
}

describe("PdfParseExtractor", () => {
  it("extracts text and reports the actual page count", async () => {
    const result = await new PdfParseExtractor().extract(createTwoPagePdf(), {
      maxPages: 2,
      timeoutMs: 2_000,
    });

    expect(result.pageCount).toBe(2);
    expect(result.text).toContain("Page one");
    expect(result.text).toContain("Page two");
  });

  it("rejects a document before extraction when it exceeds the page limit", async () => {
    await expect(
      new PdfParseExtractor().extract(createTwoPagePdf(), {
        maxPages: 1,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({ code: "PDF_PAGE_LIMIT" });
  });

  it("maps the timeout boundary to a typed extraction error", async () => {
    await expect(
      withTimeout(new Promise<never>(() => undefined), 5),
    ).rejects.toMatchObject({ code: "PDF_TIMEOUT" });
  });
});
