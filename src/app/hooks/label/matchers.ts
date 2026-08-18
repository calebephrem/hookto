import { minimatch } from "minimatch";

interface KeywordRule {
  label: string;
  keywords: string[];
}

interface PathRule {
  label: string;
  paths: string[];
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function matchKeywordLabels(
  title: string,
  rules: KeywordRule[],
): string[] {
  return rules
    .filter((rule) =>
      rule.keywords.some((keyword) =>
        new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(title),
      ),
    )
    .map((rule) => rule.label);
}

export function matchPathLabels(files: string[], rules: PathRule[]): string[] {
  return rules
    .filter((rule) =>
      files.some((file) =>
        rule.paths.some((pattern) =>
          pattern === "*" ? true : minimatch(file, pattern),
        ),
      ),
    )
    .map((rule) => rule.label);
}
