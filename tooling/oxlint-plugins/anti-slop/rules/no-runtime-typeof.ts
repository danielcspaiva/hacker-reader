import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

type RuntimeFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

const EQUALITY_OPERATORS = new Set(["===", "!==", "==", "!="]);

function isRuntimeFunction(node: ESTree.Node): node is RuntimeFunction {
	return (
		node.type === "ArrowFunctionExpression" ||
		node.type === "FunctionDeclaration" ||
		node.type === "FunctionExpression"
	);
}

function isInsideTypeGuard(node: ESTree.Node): boolean {
	let current: ESTree.Node | null = node.parent;
	while (current !== null && current.type !== "Program") {
		if (isRuntimeFunction(current)) {
			return current.returnType?.typeAnnotation.type === "TSTypePredicate";
		}
		current = current.parent;
	}
	return false;
}

function isUndefinedLiteral(node: ESTree.Node): boolean {
	return node.type === "Literal" && node.value === "undefined";
}

const UNDECLARABLE_GLOBALS = new Set([
	"window",
	"document",
	"navigator",
	"global",
	"globalThis",
	"process",
	"self",
]);

/**
 * `typeof window === "undefined"` is the only expression that survives an
 * undeclared global: every other probe throws a ReferenceError before a
 * parser could run. Only the environment globals that can genuinely be
 * absent earn the exemption — probing a local this way is the exact smell
 * the rule bans.
 */
function isUndeclaredGlobalProbe(node: ESTree.UnaryExpression): boolean {
	if (node.argument.type !== "Identifier" || !UNDECLARABLE_GLOBALS.has(node.argument.name)) {
		return false;
	}
	const parent = node.parent;
	if (parent.type !== "BinaryExpression" || !EQUALITY_OPERATORS.has(parent.operator)) return false;
	return parent.left === node
		? isUndefinedLiteral(parent.right)
		: isUndefinedLiteral(parent.left);
}

function allowsTypeGuards(option: unknown): boolean {
	return (
		typeof option === "object" &&
		option !== null &&
		!Array.isArray(option) &&
		"allowInTypeGuards" in option &&
		option.allowInTypeGuards === true
	);
}

/** Disallow runtime typeof checks that narrow unparsed values instead of decoding them. */
export const noRuntimeTypeofRule = defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow runtime typeof checks; external values must be decoded into meaningful types at their I/O boundary.",
		},
		messages: {
			runtimeTypeof:
				"A `typeof` check narrows a representation without establishing its contract. Parse input at its I/O boundary, then branch on the domain value.",
		},
		schema: [
			{
				type: "object",
				properties: {
					allowInTypeGuards: { type: "boolean" },
				},
				additionalProperties: false,
			},
		],
	},
	createOnce(context) {
		// `context.options` is still empty while `createOnce` runs — it is filled
		// per file. Reading it there silently drops every configured option.
		let allowInTypeGuards = false;

		return {
			Program() {
				allowInTypeGuards = allowsTypeGuards(context.options?.[0]);
			},
			UnaryExpression(node) {
				if (node.operator !== "typeof") return;
				if (allowInTypeGuards && isInsideTypeGuard(node)) return;
				if (isUndeclaredGlobalProbe(node)) return;
				context.report({ node, messageId: "runtimeTypeof" });
			},
		};
	},
});
