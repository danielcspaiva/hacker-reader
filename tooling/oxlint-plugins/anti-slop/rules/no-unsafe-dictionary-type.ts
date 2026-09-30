import { defineRule } from "@oxlint/plugins";

import {
	classifyUnsafeDictionary,
	classifyUnsafeDictionaryValue,
} from "../shared/dictionary-types.ts";
import { typeReferenceName } from "../shared/type-annotations.ts";
import { createTypeEnvironment, type TypeEnvironment } from "../shared/type-environment.ts";

import type { ESTree } from "@oxlint/plugins";

const typeNodeKinds: ReadonlySet<string> = new Set([
	"JSDocNonNullableType",
	"JSDocNullableType",
	"JSDocUnknownType",
	"TSAnyKeyword",
	"TSArrayType",
	"TSBigIntKeyword",
	"TSBooleanKeyword",
	"TSConditionalType",
	"TSConstructorType",
	"TSFunctionType",
	"TSImportType",
	"TSIndexedAccessType",
	"TSInferType",
	"TSIntersectionType",
	"TSIntrinsicKeyword",
	"TSLiteralType",
	"TSMappedType",
	"TSNamedTupleMember",
	"TSNeverKeyword",
	"TSNullKeyword",
	"TSNumberKeyword",
	"TSObjectKeyword",
	"TSParenthesizedType",
	"TSStringKeyword",
	"TSSymbolKeyword",
	"TSTemplateLiteralType",
	"TSThisType",
	"TSTupleType",
	"TSTypeLiteral",
	"TSTypeOperator",
	"TSTypePredicate",
	"TSTypeQuery",
	"TSTypeReference",
	"TSUndefinedKeyword",
	"TSUnionType",
	"TSUnknownKeyword",
	"TSVoidKeyword",
]);

function isTypeNode(node: ESTree.Node): node is ESTree.TSType {
	return typeNodeKinds.has(node.type);
}

function isInsideTypeAliasDeclaration(node: ESTree.Node): boolean {
	let current: ESTree.Node | null = node.parent;
	while (current !== null && current.type !== "Program") {
		if (current.type === "TSTypeAliasDeclaration") return true;
		current = current.parent;
	}
	return false;
}

function isPlainAliasConsumerUse(node: ESTree.TSType, environment: TypeEnvironment): boolean {
	if (node.type !== "TSTypeReference" || node.typeArguments?.params.length) return false;
	const name = typeReferenceName(node);
	return name !== null && environment.aliases.has(name) && !isInsideTypeAliasDeclaration(node);
}

/**
 * `<T extends Record<string, unknown>>` is TypeScript's only spelling for "any
 * object": the constraint bounds a parameter the caller still supplies a
 * concrete type for, so nothing here reaches a value untyped.
 */
function isTypeParameterConstraint(node: ESTree.TSType): boolean {
	let current: ESTree.Node = node;
	while (isTypeNode(current)) {
		const parent: ESTree.Node = current.parent;
		if (parent.type === "TSTypeParameter") return parent.constraint === current;
		current = parent;
	}
	return false;
}

/**
 * A type predicate (`value is Record<string, unknown>`) IS the parser this
 * rule's remedy asks for — the guard mints the bag at the unknown boundary,
 * so the dictionary shape in predicate position is the fix, not the smell.
 */
function isInsideTypePredicate(node: ESTree.TSType): boolean {
	// The predicate's type sits under a TSTypeAnnotation wrapper, which is not
	// itself a TSType — walk through it or the predicate is never reached.
	let current: ESTree.Node = node;
	while (isTypeNode(current) || current.type === "TSTypeAnnotation") {
		if (current.type === "TSTypePredicate") return true;
		current = current.parent;
	}
	return false;
}

// Every ancestor of a reported node gets classified too, and the rule visits
// every type node — memoize per AST node (nodes are per-file, so the cache
// cannot leak across files or environments).
const unsafeDictionaryVerdict = new WeakMap<ESTree.TSType, boolean>();

function isUnsafeDictionary(node: ESTree.TSType, environment: TypeEnvironment): boolean {
	const cached = unsafeDictionaryVerdict.get(node);
	if (cached !== undefined) return cached;
	const verdict = classifyUnsafeDictionary(node, environment) !== null;
	unsafeDictionaryVerdict.set(node, verdict);
	return verdict;
}

function shouldReportType(node: ESTree.TSType, environment: TypeEnvironment): boolean {
	if (isPlainAliasConsumerUse(node, environment)) return false;
	if (isTypeParameterConstraint(node)) return false;
	if (isInsideTypePredicate(node)) return false;
	if (!isUnsafeDictionary(node, environment)) return false;
	let current: ESTree.Node | null = node.parent;
	while (current !== null && current.type !== "Program") {
		if (isTypeNode(current) && isUnsafeDictionary(current, environment)) return false;
		current = current.parent;
	}
	return true;
}

/** Disallow object-dictionary contracts whose direct value type is an unsafe escape hatch. */
export const noUnsafeDictionaryTypeRule = defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow object-dictionary contracts whose direct value type is unknown, any, object, {}, or a union/alias containing one of those escape hatches.",
		},
		messages: {
			unsafeDictionary:
				"This dictionary's {{value}} value type gives callers no concrete value contract. Use an owner/schema-derived value type; parse external payloads before insertion.",
		},
	},
	createOnce(context) {
		let environment: TypeEnvironment | null = null;
		const report = (node: ESTree.Node, value: string) => {
			context.report({ node, messageId: "unsafeDictionary", data: { value } });
		};
		const reportIfUnsafe = (node: ESTree.TSType) => {
			if (environment === null || !shouldReportType(node, environment)) return;
			const unsafe = classifyUnsafeDictionary(node, environment);
			if (unsafe === null) return;
			report(node, unsafe.unsafeValue);
		};

		return {
			Program(node) {
				environment = createTypeEnvironment(node);
			},
			TSTypeReference: reportIfUnsafe,
			TSTypeLiteral: reportIfUnsafe,
			TSMappedType: reportIfUnsafe,
			TSIndexSignature(node) {
				if (
					environment === null ||
					node.typeAnnotation === null ||
					node.parent.type === "TSTypeLiteral"
				)
					return;
				const unsafe = classifyUnsafeDictionaryValue(
					node.typeAnnotation.typeAnnotation,
					environment,
				);
				if (unsafe !== null) report(node, unsafe.unsafeValue);
			},
		};
	},
});
