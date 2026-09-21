import { parseMarkdown, plainText, checkMarkdown } from "./markdown.js";

function signals(source) {
  const document = parseMarkdown(source);
  const prose = document.tokens
    .filter((t) => t.type === "inline")
    .map((t) =>
      plainText((t.children || []).filter((c) => c.type !== "code_inline")),
    )
    .join("\n");
  const numbers = [
    ...new Set(
      prose.match(/\d+(?:[.,]\d+)*(?:%|％|万|亿|ms|秒|分钟|小时|天|元)?/g) ||
        [],
    ),
  ];
  const links = [
    ...new Set(
      document.tokens
        .flatMap((t) =>
          (t.children || [])
            .filter((c) => c.type === "link_open")
            .map((c) => c.attrGet("href")),
        )
        .filter((h) => /^https?:\/\//.test(h)),
    ),
  ];
  return { document, numbers, links, characters: prose.length };
}

// Mechanical review prompts, not a quality score or semantic fact verifier.
export function reviewMarkdown(source, { original, type = "explainer" } = {}) {
  const checks = checkMarkdown(source, { type });
  const current = signals(source),
    findings = [...checks.findings];
  let comparison = null;
  if (original !== undefined) {
    const before = signals(original);
    comparison = {
      originalCharacters: before.characters,
      finalCharacters: current.characters,
      removedNumbers: before.numbers.filter(
        (n) => !current.numbers.includes(n),
      ),
      addedNumbers: current.numbers.filter((n) => !before.numbers.includes(n)),
      removedSources: before.links.filter((h) => !current.links.includes(h)),
      addedSources: current.links.filter((h) => !before.links.includes(h)),
    };
    if (comparison.removedNumbers.length || comparison.addedNumbers.length)
      findings.push({
        code: "numbers-changed",
        severity: "warning",
        message:
          "数字、单位或数量写法发生变化，逐项确认是获准修正还是改写失真。",
      });
    if (comparison.removedSources.length)
      findings.push({
        code: "sources-removed",
        severity: "warning",
        message: "原稿的来源链接减少，核对结论是否仍有对应依据。",
      });
  }
  const visualCount =
    current.document.tokens.filter(
      (t) => t.type === "fence" && t.info.trim() === "mermaid",
    ).length +
    current.document.tokens
      .flatMap((t) => t.children || [])
      .filter((t) => t.type === "image").length;
  return {
    status:
      checks.status === "blocked"
        ? "blocked"
        : findings.length
          ? "needs-review"
          : "checks-passed",
    findings,
    comparison,
    document: {
      title: current.document.title,
      characters: current.characters,
      headings: current.document.headings.map((h) => h.text),
      visualCount,
    },
    next: findings.map((f) => ({
      code: f.code,
      line: f.line ?? null,
      action: f.message,
    })),
    readerReview: [
      ...checks.readerReview,
      "开头是否让目标读者知道结论、用途和适用条件？",
      "否定、前提、风险与不确定性是否保留？程序无法可靠判断这些语义。",
      visualCount
        ? "每张图是否回答了具体问题，且与正文关系、数字一致？"
        : "是否存在文字难以说明的关系？有需要才加图，不以图的数量评价质量。",
    ],
    limitation:
      "数字与链接对照是复查线索，不理解含义或证明事实正确；不同表达可能被提示，新增无数字的错误结论也可能漏检。代码中的数值不参与对照。不得将 checks-passed 称为内容已验收。",
  };
}
