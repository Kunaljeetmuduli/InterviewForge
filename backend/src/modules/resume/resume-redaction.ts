const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /(?<!\w)\+?\d(?:[\s().-]*\d){9,14}(?!\w)/g;

export interface RedactionResult {
  text: string;
  emailCount: number;
  phoneCount: number;
}

export function redactDirectIdentifiers(source: string): RedactionResult {
  let emailCount = 0;
  let phoneCount = 0;

  const withoutEmails = source.replace(EMAIL_PATTERN, () => {
    emailCount += 1;
    return "[EMAIL REDACTED]";
  });
  const text = withoutEmails.replace(PHONE_PATTERN, () => {
    phoneCount += 1;
    return "[PHONE REDACTED]";
  });

  return { text, emailCount, phoneCount };
}

export function minimizeResumeText(source: string, maximumLength: number) {
  return source
    .replace(/\0/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maximumLength);
}
