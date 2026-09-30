import { defineRule } from "@oxlint/plugins";

import { parameterAnnotation } from "../shared/type-annotations.ts";

import type { ESTree, SourceCode } from "@oxlint/plugins";

type Parameter = ESTree.ParamPattern;
type ParameterOwner =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSConstructorType
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature;

function returnsParsedContract(node: ParameterOwner): boolean {
  const annotation = node.returnType;
  if (annotation === null || annotation === undefined) return false;
  const type = annotation.typeAnnotation;
  if (type.type === "TSTypePredicate") return true;
  if (type.type === "TSUnknownKeyword" || type.type === "TSVoidKeyword") {
    return false;
  }
  return true;
}

function parameterName(parameter: Parameter, sourceCode: SourceCode): string {
  if (parameter.type === "TSParameterProperty") {
    return parameterName(parameter.parameter, sourceCode);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameterName(parameter.left, sourceCode);
  }
  if (parameter.type === "RestElement") {
    return parameterName(parameter.argument, sourceCode);
  }
  return parameter.type === "Identifier"
    ? parameter.name
    : sourceCode.getText(parameter).replace(/\s*:\s*unknown\s*$/u, "");
}

/** Disallow unknown inputs except explicitly named error-cause enrichment. */
export const noUnknownParametersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow explicitly unknown function parameters except `cause`; decode unknown input at its I/O boundary instead.",
    },
    messages: {
      unknownParameter:
        "Parameter `{{parameter}}` leaves input unparsed. Accept a named domain type; run the expected schema or parser at the I/O boundary before calling this function.",
    },
  },
  createOnce(context) {
    const checkParameters = (node: ParameterOwner) => {
      // The I/O decoder is allowed to take `unknown` when it returns a named
      // contract or a type predicate — that function *is* the parse boundary.
      if (returnsParsedContract(node)) return;
      for (const parameter of node.params) {
        const annotation = parameterAnnotation(parameter);
        if (annotation?.typeAnnotation.type !== "TSUnknownKeyword") continue;
        const name = parameterName(parameter, context.sourceCode);
        // `cause` is the rule's own convention. `error`/`err` are TypeScript's
        // catch-clause contract (`unknown`) and this repo's error-boundary
        // parameter names — same unparsed incoming value, different call sites.
        if (name === "cause" || name === "error" || name === "err") continue;
        context.report({
          node: annotation.typeAnnotation,
          messageId: "unknownParameter",
          data: { parameter: name },
        });
      }
    };

    return {
      ArrowFunctionExpression: checkParameters,
      FunctionDeclaration: checkParameters,
      FunctionExpression: checkParameters,
      TSCallSignatureDeclaration: checkParameters,
      TSConstructSignatureDeclaration: checkParameters,
      TSConstructorType: checkParameters,
      TSDeclareFunction: checkParameters,
      TSEmptyBodyFunctionExpression: checkParameters,
      TSFunctionType: checkParameters,
      TSMethodSignature: checkParameters,
    };
  },
});
