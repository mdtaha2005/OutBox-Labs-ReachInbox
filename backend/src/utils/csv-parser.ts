const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface ParsedLeadsResult {
  validLeads: string[];
  invalidCount: number;
  totalCount: number;
}

export function parseLeadsContent(content: string): ParsedLeadsResult {
  // Normalize newlines and commas/semicolons to split efficiently
  const lines = content.split(/[\r\n,;]+/);
  const seen = new Set<string>();
  const validLeads: string[] = [];
  let invalidCount = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim().replace(/^["']|["']$/g, "").trim();
    if (!trimmed) continue;

    // Check if header line like "email" or "Email Address"
    if (trimmed.toLowerCase() === "email" || trimmed.toLowerCase() === "email address") {
      continue;
    }

    if (EMAIL_REGEX.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        validLeads.push(lower);
      }
    } else {
      invalidCount++;
    }
  }

  return {
    validLeads,
    invalidCount,
    totalCount: validLeads.length + invalidCount,
  };
}
