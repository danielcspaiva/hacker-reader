// Custom oxlint rules for change-history comments, narration, and ternary chains.

const unwrap = (n) => {
  let cur = n;
  while (cur?.type === "ParenthesizedExpression") cur = cur.expression;
  return cur;
};

const nestedBranches = (n) =>
  [n.consequent, n.alternate]
    .map(unwrap)
    .filter((b) => b?.type === "ConditionalExpression");

const chainDepth = (n) => {
  const kids = nestedBranches(n);
  return kids.length === 0 ? 0 : 1 + Math.max(...kids.map(chainDepth));
};

const DECISION_LOG = [
  {
    re: /\bPR #\d+/,
    why: "PR references rot; git blame already knows the PR",
  },
  {
    re: /\b(?:rul(?:ing|ed)|verified|decided|changed|updated|added|removed|renamed|moved|migrated|fixed|introduced|as of|since)\b[^\n.]{0,24}\b20\d{2}-\d{2}-\d{2}/i,
    why: "decision-verb + date is a changelog entry; it belongs in the commit message",
  },
  {
    re: /\bas (?:requested|discussed)\b|\bper (?:the |your )(?:review|feedback|request|discussion)\b/i,
    why: "review-conversation residue addressed to a reviewer, not the next reader",
  },
  {
    re: /^(?:NEW|UPDATED|CHANGED|FIXED|ADDED|MOVED|REMOVED)\b[:,]/,
    why: "status marker narrating the edit, not the code",
  },
  {
    re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u,
    why: "emoji in a code comment",
  },
];

const NARRATION = [
  /^(?:Get|Gets|Set|Sets|Check|Checks|Create|Creates|Initialize|Initializes|Define|Defines|Loop|Iterate|Call|Calls|Return|Returns|Import|Imports|Extract|Extracts|Build|Builds|Fetch|Fetches|Update|Updates|Add|Adds|Remove|Removes|Parse|Parses|Convert|Converts|Format|Formats|Validate|Validates|Calculate|Calculates|Compute|Computes|Render|Renders|Handle|Handles|Process|Processes|Ensure|Ensures|Make sure)\s+(?:the|a|an|all|our|each|if|that|whether)\b/i,
  // Ambiguous sentence openers only count as steps when punctuation marks them.
  /^(?:Finally|Lastly|Step \d+)\b[,:]?\s/,
  /^(?:First|Then|Next|Now)\b[,:]\s/,
  /^This (?:function|method|component|hook|file|helper) (?:is|does|handles|returns|takes|creates)\b/i,
  /^(?:We (?:need to|now|then|also|first|just)\b|Now we\b|Here we\b)/i,
];

// Tooling directives and pragmas are not prose comments.
const DIRECTIVE =
  /^(?:\/|@ts-|ts-|eslint|oxlint|biome-|prettier-|c8 |v8 |istanbul |knip|palette-guard|webpack|vite-|@vite|#|!|\*)|^\s*$/;

function commentText(comment) {
  return comment.value.trim();
}

function withoutQuotedText(text) {
  return text
    .replace(/"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’/gu, "")
    .replace(/(^|[\s([{])'[^'\n]+'(?=$|[\s.,;:!?)}\]])/gu, "$1");
}

function hasExplanatoryDashClause(text) {
  const clause = text.split(" — ", 2)[1];
  return (
    clause !== undefined &&
    /\b(?:because|since|so|otherwise|may|might|must|can(?:not|'t)?|keeps?|prevents?|requires?|ensures?|avoids?)\b/iu.test(
      clause
    )
  );
}

function isDirective(comment) {
  return DIRECTIVE.test(commentText(comment));
}

function isolatedLineComments(comments) {
  const lines = new Set(
    comments.filter((c) => c.type === "Line").map((c) => c.loc.start.line)
  );
  return comments.filter(
    (c) =>
      c.type === "Line" &&
      !lines.has(c.loc.start.line - 1) &&
      !lines.has(c.loc.start.line + 1)
  );
}

const plugin = {
  meta: { name: "comments" },
  rules: {
    "no-decision-log-comments": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Comments must not carry change history (PR refs, dated decisions, review residue, status markers, emoji) — that belongs in commits/PRs/ADRs.",
        },
      },
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              if (isDirective(comment)) continue;
              const text = commentText(comment);
              for (const { re, why } of DECISION_LOG) {
                const candidate =
                  why === "emoji in a code comment"
                    ? withoutQuotedText(text)
                    : text;
                const match = re.exec(candidate);
                if (match) {
                  context.report({
                    loc: comment.loc,
                    message: `Decision-log comment (${why}): "${match[0]}"`,
                  });
                  break;
                }
              }
            }
          },
        };
      },
    },

    "no-narrating-comments": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "A single-line comment must not narrate the code below it. State a constraint the code cannot express, or delete it.",
        },
      },
      create(context) {
        return {
          Program() {
            const comments = context.sourceCode.getAllComments();
            for (const comment of isolatedLineComments(comments)) {
              if (isDirective(comment)) continue;
              const text = commentText(comment);
              if (hasExplanatoryDashClause(text)) continue;
              if (NARRATION.some((re) => re.test(text))) {
                context.report({
                  loc: comment.loc,
                  message:
                    "Narrating comment — it restates what the code already says. State the non-obvious constraint, or delete it.",
                });
              }
            }
          },
        };
      },
    },

    "no-nested-ternary": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "A ternary chain nested more than one level deep. `a ? x : b ? y : z` reads as a three-way choice and is allowed; another level past that is not.",
        },
      },
      create(context) {
        // The raw plugin API omits parent links; `claimed` reports a chain once.
        const claimed = new Set();
        return {
          ConditionalExpression(node) {
            if (claimed.has(node)) return;
            const nested = nestedBranches(node);
            if (nested.length === 0) return;
            for (const queue = [...nested]; queue.length > 0;) {
              const inner = queue.pop();
              claimed.add(inner);
              for (const b of nestedBranches(inner)) queue.push(b);
            }
            if (chainDepth(node) < 2) return;
            for (const branch of nested) {
              context.report({
                node: branch,
                message:
                  "Ternary nested more than one level — refactor to an early-return helper at module scope, or a lookup table. One level (`a ? x : b ? y : z`) is fine. Do NOT add parentheses: oxfmt strips them in .ts AND in JSX, so the parenthesised form can never stay green.",
              });
            }
          },
        };
      },
    },
  },
};

export default plugin;
