import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

const FORBIDDEN_SEGMENT = /^shapes?$/iu;

// A name is a sequence of word segments: `_`/`-`/`$` separate them, and so does
// every camelCase and acronym boundary. Splitting on those is what keeps
// `reshapeData` and `misshapen` — words that merely contain the letters — apart
// from `UserShape` and `CTA_SHAPE`, which name the term.
const SEGMENT_BOUNDARY = /(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|[^A-Za-z0-9]+/u;

function containsForbiddenSymbolName(name: string): boolean {
  return name.split(SEGMENT_BOUNDARY).some((segment) => FORBIDDEN_SEGMENT.test(segment));
}

function isLibraryShapeName(node: ESTree.Node & { name: string }): boolean {
  // Exact `shape` is Zod (`schema.shape`, `ZodRawShape`) and tRPC
  // (`errorFormatter({ shape })`). Compound names (`FooShape`, `CTA_SHAPE`)
  // are ours and still rename.
  return node.name === "shape" || node.name === "ZodRawShape";
}

/** Ban "shape" as a word in every JavaScript and TypeScript symbol name. */
export const noForbiddenTermInSymbolNamesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow "shape" as a word segment in JavaScript, TypeScript, private, and JSX symbol names.',
    },
    messages: {
      forbiddenSymbolName:
        'Rename symbol "{{name}}" for its domain role; "shape" describes structure rather than ownership.',
    },
  },
  createOnce(context) {
    const reportForbiddenSymbolName = (node: ESTree.Node & { name: string }) => {
      if (!containsForbiddenSymbolName(node.name)) return;
      if (isLibraryShapeName(node)) return;
      context.report({
        node,
        messageId: "forbiddenSymbolName",
        data: { name: node.name },
      });
    };

    return {
      Identifier: reportForbiddenSymbolName,
      PrivateIdentifier: reportForbiddenSymbolName,
      JSXIdentifier: reportForbiddenSymbolName,
    };
  },
});
