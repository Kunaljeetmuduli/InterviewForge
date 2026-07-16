import { PDFParse } from "pdf-parse";

export const MAX_RESUME_PAGES = 20;
export const MIN_RESUME_TEXT_LENGTH = 200;
export const MAX_AI_RESUME_TEXT_LENGTH = 24_000;

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

export interface PdfExtractor {
  extract(
    data: Uint8Array,
    options: { maxPages: number; timeoutMs: number },
  ): Promise<PdfExtractionResult>;
}

export class PdfExtractionError extends Error {
  constructor(
    readonly code: "PDF_PAGE_LIMIT" | "PDF_PARSE_FAILED" | "PDF_TIMEOUT",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PdfExtractionError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new PdfExtractionError(
            "PDF_TIMEOUT",
            "PDF text extraction timed out.",
          ),
        ),
      timeoutMs,
    );

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(
          error instanceof Error
            ? error
            : new Error("PDF text extraction failed."),
        );
      },
    );
  });
}

export class PdfParseExtractor implements PdfExtractor {
  async extract(
    data: Uint8Array,
    options: { maxPages: number; timeoutMs: number },
  ): Promise<PdfExtractionResult> {
    const parser = new PDFParse({ data, stopAtErrors: true });

    try {
      return await withTimeout(
        (async () => {
          const info = await parser.getInfo();

          if (info.total > options.maxPages) {
            throw new PdfExtractionError(
              "PDF_PAGE_LIMIT",
              `PDF exceeds the ${options.maxPages}-page limit.`,
            );
          }

          const result = await parser.getText({
            first: options.maxPages,
            pageJoiner: "\n",
          });

          return { text: result.text, pageCount: info.total };
        })(),
        options.timeoutMs,
      );
    } catch (error) {
      if (error instanceof PdfExtractionError) {
        throw error;
      }

      throw new PdfExtractionError(
        "PDF_PARSE_FAILED",
        "PDF text extraction failed.",
        { cause: error },
      );
    } finally {
      await parser.destroy();
    }
  }
}
