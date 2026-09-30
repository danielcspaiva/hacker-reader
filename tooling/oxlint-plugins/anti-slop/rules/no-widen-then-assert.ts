import { defineRule } from "@oxlint/plugins";

import {
  classifyWideningTarget,
  isKnownEvidenceExpression,
  resolveThroughAliases,
  unwrapTransparentType,
} from "../shared/dictionary-types.ts";
import { typeReferenceName } from "../shared/type-annotations.ts";
import { createTypeEnvironment, isBuiltIn, type TypeEnvironment } from "../shared/type-environment.ts";
import { resolveVariable, variableDeclarator } from "../shared/variable-resolution.ts";

import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";

type BroadTypeKind = "top" | "object" | "record";

type KnownValueEvidence = {
  readonly type: ESTree.TSType | null;
};

const functionBoundaryTypes = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
]);

function unwrapExpressionParentheses(expression: ESTree.Expression): ESTree.Expression {
  let current = expression;
  while (current.type === "ParenthesizedExpression") current = current.expression;
  return current;
}

function broadTypeKind(type: ESTree.TSType, environment: TypeEnvironment): BroadTypeKind | null {
  const target = classifyWideningTarget(type, environment);
  if (target === null) return null;
  if (target.kind === "unknown" || target.kind === "any") return "top";
  if (target.kind === "object") return "object";
  if (target.kind === "open dictionary" || target.kind === "generic container") return "record";
  return null;
}

function assertedExpression(
  node: ESTree.TSAsExpression | ESTree.TSTypeAssertion,
): ESTree.Expression {
  return unwrapExpressionParentheses(node.expression);
}

function assertionFromExpression(
  expression: ESTree.Expression,
): ESTree.TSAsExpression | ESTree.TSTypeAssertion | null {
  const unwrapped = unwrapExpressionParentheses(expression);
  return unwrapped.type === "TSAsExpression" || unwrapped.type === "TSTypeAssertion"
    ? unwrapped
    : null;
}

function normalizedTypeText(sourceText: string, type: ESTree.TSType): string {
  return sourceText.slice(type.start, type.end).replaceAll(/\s+/gu, "");
}

function typesHaveSameSyntax(
  sourceText: string,
  left: ESTree.TSType | null,
  right: ESTree.TSType,
): boolean {
  return (
    left !== null &&
    normalizedTypeText(sourceText, unwrapTransparentType(left)) ===
      normalizedTypeText(sourceText, unwrapTransparentType(right))
  );
}

function isDefinitelyObjectType(
  type: ESTree.TSType,
  environment: TypeEnvironment,
  substitutions: ReadonlyMap<string, ESTree.TSType> = new Map(),
  resolvingAliases: ReadonlySet<string> = new Set(),
): boolean {
  const resolved = resolveThroughAliases(type, environment, substitutions, resolvingAliases);
  if (resolved === null) return false;
  const unwrapped = resolved.type;
  switch (unwrapped.type) {
    case "TSArrayType":
    case "TSConstructorType":
    case "TSFunctionType":
    case "TSMappedType":
    case "TSObjectKeyword":
    case "TSTupleType":
      return true;
    case "TSTypeLiteral":
      return unwrapped.members.length > 0;
    case "TSIntersectionType":
      // The intersection's members still reference the alias's type parameters
      // (`Pair<T> = T & { … }`), so the resolver's substitution scope must
      // travel with the recursion or `T` dead-ends and false-negatives.
      return unwrapped.types.every((member) =>
        isDefinitelyObjectType(member, environment, resolved.substitutions, resolved.resolvingAliases),
      );
    case "TSTypeReference": {
      // A reference the alias resolver could not expand: an in-file interface
      // is still definitely an object type (`x as User` after `const x: object`).
      const name = typeReferenceName(unwrapped);
      return name !== null && environment.interfaces.has(name);
    }
    default:
      return false;
  }
}

function isDefinitelyNarrowerRecordType(
  type: ESTree.TSType,
  environment: TypeEnvironment,
): boolean {
  const resolved = resolveThroughAliases(type, environment);
  if (resolved === null) return false;
  const unwrapped = resolved.type;
  if (unwrapped.type === "TSTypeLiteral") {
    return unwrapped.members.some((member) => member.type !== "TSIndexSignature");
  }
  if (unwrapped.type !== "TSTypeReference") return false;
  if (typeReferenceName(unwrapped) !== "Record" || !isBuiltIn("Record", environment)) return false;

  const parameters = unwrapped.typeArguments?.params ?? [];
  return (
    parameters.length === 2 &&
    parameters[1] !== undefined &&
    broadTypeKind(parameters[1], environment) !== "top"
  );
}

function functionBoundary(node: ESTree.Node): ESTree.Node | null {
  let current = node.parent;
  while (current !== null && current.type !== "Program") {
    if (functionBoundaryTypes.has(current.type)) return current;
    current = current.parent;
  }
  return null;
}

function knownValueEvidence(
  sourceCode: SourceCode,
  environment: TypeEnvironment,
  expression: ESTree.Expression,
  boundary: ESTree.Node | null,
  visitedVariables: ReadonlySet<Variable>,
): KnownValueEvidence | null {
  const unwrapped = unwrapExpressionParentheses(expression);

  if (unwrapped.type === "TSAsExpression" || unwrapped.type === "TSTypeAssertion") {
    if (broadTypeKind(unwrapped.typeAnnotation, environment) !== null) return null;
    return { type: unwrapped.typeAnnotation };
  }

  if (isKnownEvidenceExpression(unwrapped)) return { type: null };

  if (unwrapped.type !== "Identifier") return null;
  const variable = resolveVariable(sourceCode, unwrapped);
  if (variable === null || visitedVariables.has(variable)) return null;

  const annotatedIdentifier = variable.identifiers.find(
    (identifier) => identifier.typeAnnotation !== null && identifier.typeAnnotation !== undefined,
  );
  const annotation = annotatedIdentifier?.typeAnnotation?.typeAnnotation;
  if (annotation !== undefined && annotatedIdentifier !== undefined) {
    if (
      functionBoundary(annotatedIdentifier) !== boundary ||
      broadTypeKind(annotation, environment) !== null
    ) {
      return null;
    }
    return { type: annotation };
  }

  const declarator = variableDeclarator(variable);
  if (
    declarator === null ||
    declarator.parent.type !== "VariableDeclaration" ||
    declarator.parent.kind !== "const" ||
    declarator.init === null ||
    variable.references.some((reference) => reference.isWrite() && !reference.init) ||
    functionBoundary(declarator) !== boundary
  ) {
    return null;
  }

  return knownValueEvidence(
    sourceCode,
    environment,
    declarator.init,
    boundary,
    new Set([...visitedVariables, variable]),
  );
}

function widenedBinding(
  sourceCode: SourceCode,
  environment: TypeEnvironment,
  variable: Variable,
): {
  readonly broadKind: BroadTypeKind;
  readonly evidence: KnownValueEvidence;
  readonly declaredAt: number;
  readonly boundary: ESTree.Node | null;
} | null {
  const declarator = variableDeclarator(variable);
  if (
    declarator === null ||
    declarator.parent.type !== "VariableDeclaration" ||
    declarator.parent.kind !== "const" ||
    declarator.id.type !== "Identifier" ||
    declarator.init === null ||
    variable.references.some((reference) => reference.isWrite() && !reference.init)
  ) {
    return null;
  }

  const boundary = functionBoundary(declarator);
  const declaredType = declarator.id.typeAnnotation?.typeAnnotation;
  const initializerAssertion = assertionFromExpression(declarator.init);
  const initializerBroadKind =
    initializerAssertion === null
      ? null
      : broadTypeKind(initializerAssertion.typeAnnotation, environment);
  const declaredBroadKind =
    declaredType === undefined ? null : broadTypeKind(declaredType, environment);
  const broadKind = declaredBroadKind ?? initializerBroadKind;
  if (broadKind === null) return null;

  const originalExpression =
    initializerAssertion !== null && initializerBroadKind !== null
      ? assertedExpression(initializerAssertion)
      : declarator.init;
  const evidence = knownValueEvidence(
    sourceCode,
    environment,
    originalExpression,
    boundary,
    new Set([variable]),
  );
  return evidence === null ? null : { broadKind, evidence, declaredAt: declarator.end, boundary };
}

function assertionIsNarrower(
  sourceText: string,
  environment: TypeEnvironment,
  broadKind: BroadTypeKind,
  evidence: KnownValueEvidence,
  assertedType: ESTree.TSType,
): boolean {
  if (broadTypeKind(assertedType, environment) !== null) return false;
  if (broadKind === "top") return true;
  if (typesHaveSameSyntax(sourceText, evidence.type, assertedType)) return true;
  if (broadKind === "object") return isDefinitelyObjectType(assertedType, environment);
  return isDefinitelyNarrowerRecordType(assertedType, environment);
}

/** Detect immutable local bindings that erase a known type and are later asserted back to a narrower type. */
export const noWidenThenAssertRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow local const flows that explicitly widen a known value before asserting the widened binding to a narrower type.",
    },
    messages: {
      widenThenAssert:
        'Binding "{{name}}" discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.',
    },
  },
  createOnce(context) {
    let environment: TypeEnvironment | null = null;

    const checkAssertion = (node: ESTree.TSAsExpression | ESTree.TSTypeAssertion) => {
      if (environment === null) return;
      const expression = assertedExpression(node);
      if (expression.type !== "Identifier") return;

      const variable = resolveVariable(context.sourceCode, expression);
      if (variable === null) return;
      const widened = widenedBinding(context.sourceCode, environment, variable);
      if (
        widened === null ||
        node.start <= widened.declaredAt ||
        functionBoundary(node) !== widened.boundary ||
        !assertionIsNarrower(
          context.sourceCode.text,
          environment,
          widened.broadKind,
          widened.evidence,
          node.typeAnnotation,
        )
      ) {
        return;
      }

      context.report({
        node,
        messageId: "widenThenAssert",
        data: { name: expression.name },
      });
    };

    return {
      Program(node) {
        environment = createTypeEnvironment(node);
      },
      TSAsExpression: checkAssertion,
      TSTypeAssertion: checkAssertion,
    };
  },
});
