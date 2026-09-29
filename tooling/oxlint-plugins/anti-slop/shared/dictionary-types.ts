import { typeReferenceName } from "./type-annotations.ts";
import { isBuiltIn, type TypeEnvironment } from "./type-environment.ts";

import type { ESTree } from "@oxlint/plugins";

const TRANSPARENT_WRAPPERS = new Set(["Readonly", "Partial", "Required", "NonNullable"]);

type TypeAliasEnvironment = ReadonlyMap<string, ESTree.TSType>;

type ResolvedType = {
	readonly type: ESTree.TSType;
	readonly substitutions: TypeAliasEnvironment;
};

type ResolvedTerminal = {
	readonly kind: "terminal";
	readonly type: ESTree.TSType;
	readonly substitutions: TypeAliasEnvironment;
	readonly resolvingAliases: ReadonlySet<string>;
};

type ResolvedAlias = {
	readonly kind: "alias";
	readonly name: string;
	readonly alias: ESTree.TSTypeAliasDeclaration;
	readonly reference: ESTree.TSTypeReference;
	readonly substitutions: TypeAliasEnvironment;
	readonly resolvingAliases: ReadonlySet<string>;
};

type Resolved = ResolvedTerminal | ResolvedAlias;

type UnsafeDictionary = {
	readonly kind: "unsafe-dictionary";
	readonly unsafeValue: "any" | "empty-object" | "object" | "union" | "unknown";
};

type WideningTargetKind =
	| "anonymous object"
	| "any"
	| "generic container"
	| "object"
	| "open dictionary"
	| "unknown";

export type WideningTarget = {
	readonly kind: WideningTargetKind;
};

function isUnappliedReferenceTo(type: ESTree.TSType, name: string): boolean {
	const unwrapped = unwrapTransparentType(type);
	return (
		unwrapped.type === "TSTypeReference" &&
		typeReferenceName(unwrapped) === name &&
		(unwrapped.typeArguments === null ||
			unwrapped.typeArguments === undefined ||
			unwrapped.typeArguments.params.length === 0)
	);
}

/** Strip parens and `readonly` operators down to the type they decorate. */
export function unwrapTransparentType(type: ESTree.TSType): ESTree.TSType {
	let current = type;
	while (
		current.type === "TSParenthesizedType" ||
		(current.type === "TSTypeOperator" && current.operator === "readonly")
	) {
		current = current.typeAnnotation;
	}
	return current;
}

function isNeverType(type: ESTree.TSType): boolean {
	return unwrapTransparentType(type).type === "TSNeverKeyword";
}

function isEffectivelyEmptyMember(member: ESTree.TSSignature): boolean {
	return (
		member.type === "TSPropertySignature" &&
		member.optional === true &&
		member.typeAnnotation !== null &&
		member.typeAnnotation !== undefined &&
		isNeverType(member.typeAnnotation.typeAnnotation)
	);
}

function isEffectivelyEmptyTypeLiteral(type: ESTree.TSTypeLiteral): boolean {
	return type.members.length === 0 || type.members.every(isEffectivelyEmptyMember);
}

function isEffectivelyEmptyInterface(
	declarations: readonly ESTree.TSInterfaceDeclaration[],
): boolean {
	if (declarations.length !== 1) return false;
	const [type] = declarations;
	return (
		type !== undefined &&
		type.extends.length === 0 &&
		(type.body.body.length === 0 || type.body.body.every(isEffectivelyEmptyMember))
	);
}

function resolvedSubstitutionArgument(
	type: ESTree.TSType,
	base: TypeAliasEnvironment,
	resolving: ReadonlySet<string> = new Set(),
): ESTree.TSType {
	const unwrapped = unwrapTransparentType(type);
	if (unwrapped.type !== "TSTypeReference") return type;
	const name = typeReferenceName(unwrapped);
	if (name === null || resolving.has(name)) return type;
	const substitution = base.get(name);
	if (substitution === undefined) return type;
	const nextResolving = new Set(resolving);
	nextResolving.add(name);
	return resolvedSubstitutionArgument(substitution, base, nextResolving);
}

function aliasSubstitution(
	alias: ESTree.TSTypeAliasDeclaration,
	type: ESTree.TSTypeReference,
	base: TypeAliasEnvironment,
): TypeAliasEnvironment | null {
	const parameters = alias.typeParameters?.params ?? [];
	const arguments_ = type.typeArguments?.params ?? [];
	const next = new Map(base);
	for (const [index, parameter] of parameters.entries()) {
		const argument = arguments_[index] ?? parameter.default;
		if (argument === null || argument === undefined) return null;
		next.set(parameter.name.name, resolvedSubstitutionArgument(argument, next));
	}
	return next;
}

/**
 * The one reference-resolution cascade every classifier shares: unwrap
 * parens/`readonly`, follow type-parameter substitutions (an unapplied
 * self-reference is a dead end), and see through built-in transparent
 * wrappers. Stops AT a user alias and hands it back unexpanded, so a caller
 * that must inspect the alias itself (`classifyWideningTarget`'s
 * generic-container judgment) shares the cascade instead of forking it;
 * callers that just want through it call `expandAlias` and resolve again.
 * `null` means "yields nothing" in every caller: a substitution cycle, an
 * alias already on the cycle set, or a wrapper with no argument.
 */
function resolveTypeReference(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment,
	resolvingAliases: ReadonlySet<string>,
): Resolved | null {
	let current = unwrapTransparentType(type);
	const followedSubstitutions = new Set<string>();
	while (current.type === "TSTypeReference") {
		const name = typeReferenceName(current);
		if (name === null) break;
		const substitution = substitutions.get(name);
		if (substitution !== undefined) {
			if (isUnappliedReferenceTo(substitution, name)) return null;
			// A two-name substitution cycle ({T→U, U→T}) must dead-end, not hang.
			if (followedSubstitutions.has(name)) return null;
			followedSubstitutions.add(name);
			current = unwrapTransparentType(substitution);
			continue;
		}
		if (TRANSPARENT_WRAPPERS.has(name) && isBuiltIn(name, environment)) {
			const wrapped = current.typeArguments?.params[0];
			if (wrapped === undefined) return null;
			current = unwrapTransparentType(wrapped);
			continue;
		}
		const alias = environment.aliases.get(name);
		if (alias === undefined) break;
		if (resolvingAliases.has(name)) return null;
		return { kind: "alias", name, alias, reference: current, substitutions, resolvingAliases };
	}
	return { kind: "terminal", type: current, substitutions, resolvingAliases };
}

/** One step through an alias the resolver stopped at; `null` = unresolvable args. */
function expandAlias(resolved: ResolvedAlias): {
	readonly type: ESTree.TSType;
	readonly substitutions: TypeAliasEnvironment;
	readonly resolvingAliases: ReadonlySet<string>;
} | null {
	const substitutions = aliasSubstitution(resolved.alias, resolved.reference, resolved.substitutions);
	if (substitutions === null) return null;
	const resolvingAliases = new Set(resolved.resolvingAliases);
	resolvingAliases.add(resolved.name);
	return { type: resolved.alias.typeAnnotation, substitutions, resolvingAliases };
}

/** The cascade with aliases expanded all the way down to a terminal node. */
export function resolveThroughAliases(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment = new Map(),
	resolvingAliases: ReadonlySet<string> = new Set(),
): ResolvedTerminal | null {
	let resolved = resolveTypeReference(type, environment, substitutions, resolvingAliases);
	while (resolved !== null && resolved.kind === "alias") {
		const expanded = expandAlias(resolved);
		if (expanded === null) return null;
		resolved = resolveTypeReference(
			expanded.type,
			environment,
			expanded.substitutions,
			expanded.resolvingAliases,
		);
	}
	return resolved;
}

function unsafeDirectValue(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment,
	resolvingAliases: ReadonlySet<string>,
): UnsafeDictionary["unsafeValue"] | null {
	const resolved = resolveThroughAliases(type, environment, substitutions, resolvingAliases);
	if (resolved === null) return null;
	const { type: unwrapped, substitutions: scope, resolvingAliases: resolving } = resolved;
	if (unwrapped.type === "TSUnknownKeyword") return "unknown";
	if (unwrapped.type === "TSAnyKeyword") return "any";
	if (unwrapped.type === "TSObjectKeyword") return "object";
	if (unwrapped.type === "TSTypeLiteral" && isEffectivelyEmptyTypeLiteral(unwrapped))
		return "empty-object";
	if (unwrapped.type === "TSUnionType") {
		return unwrapped.types.some(
			(member) => unsafeDirectValue(member, environment, scope, resolving) !== null,
		)
			? "union"
			: null;
	}
	if (unwrapped.type === "TSIntersectionType") {
		const unsafeMembers = unwrapped.types.map((member) =>
			unsafeDirectValue(member, environment, scope, resolving),
		);
		if (unsafeMembers.includes("any")) return "any";
		return unsafeMembers.length > 0 && unsafeMembers.every((member) => member !== null)
			? (unsafeMembers[0] ?? null)
			: null;
	}
	if (unwrapped.type !== "TSTypeReference") return null;
	const name = typeReferenceName(unwrapped);
	if (name === null) return null;
	const interfaceDeclarations = environment.interfaces.get(name);
	if (interfaceDeclarations !== undefined) {
		return isEffectivelyEmptyInterface(interfaceDeclarations) ? "empty-object" : null;
	}
	return null;
}

function dictionaryValueTypes(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment,
	resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] {
	const resolved = resolveThroughAliases(type, environment, substitutions, resolvingAliases);
	if (resolved === null) return [];
	const { type: unwrapped, substitutions: scope, resolvingAliases: resolving } = resolved;

	if (unwrapped.type === "TSTypeLiteral") {
		return unwrapped.members.flatMap((member): readonly ResolvedType[] =>
			member.type === "TSIndexSignature" && member.typeAnnotation !== null
				? [{ type: member.typeAnnotation.typeAnnotation, substitutions: scope }]
				: [],
		);
	}

	if (unwrapped.type === "TSMappedType") {
		return unwrapped.typeAnnotation === null
			? []
			: [{ type: unwrapped.typeAnnotation, substitutions: scope }];
	}

	if (unwrapped.type !== "TSTypeReference") return [];
	const name = typeReferenceName(unwrapped);
	if (name === null) return [];

	if (name === "Record" && isBuiltIn(name, environment)) {
		const value = unwrapped.typeArguments?.params[1] ?? null;
		return value === null ? [] : [{ type: value, substitutions: scope }];
	}

	if ((name === "Pick" || name === "Omit") && isBuiltIn(name, environment)) {
		const source = unwrapped.typeArguments?.params[0];
		return source === undefined
			? []
			: dictionaryValueTypes(source, environment, scope, resolving);
	}

	return [];
}

export function classifyUnsafeDictionaryValue(
	valueType: ESTree.TSType,
	environment: TypeEnvironment,
): UnsafeDictionary | null {
	const unsafeValue = unsafeDirectValue(valueType, environment, new Map(), new Set());
	return unsafeValue === null ? null : { kind: "unsafe-dictionary", unsafeValue };
}

/**
 * A dictionary only discards evidence when its VALUE type is an escape hatch:
 * `Record<string, string>` states a contract, `Record<string, unknown>` does
 * not. Every classifier gates on this, so the dictionary rules agree on what
 * "broad" means.
 */
export function classifyUnsafeDictionary(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment = new Map(),
	resolvingAliases: ReadonlySet<string> = new Set(),
): UnsafeDictionary | null {
	for (const valueType of dictionaryValueTypes(
		type,
		environment,
		substitutions,
		resolvingAliases,
	)) {
		const unsafeValue = unsafeDirectValue(
			valueType.type,
			environment,
			valueType.substitutions,
			new Set(),
		);
		if (unsafeValue !== null) return { kind: "unsafe-dictionary", unsafeValue };
	}
	return null;
}

function isBroadMappedKey(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment,
): boolean {
	const unwrapped = unwrapTransparentType(type);
	if (
		unwrapped.type === "TSStringKeyword" ||
		unwrapped.type === "TSNumberKeyword" ||
		unwrapped.type === "TSSymbolKeyword"
	) {
		return true;
	}
	if (unwrapped.type === "TSUnionType") {
		return unwrapped.types.every((member) =>
			isBroadMappedKey(member, environment, substitutions),
		);
	}
	if (unwrapped.type !== "TSTypeReference") return false;
	const name = typeReferenceName(unwrapped);
	if (name === null) return false;
	const substitution = substitutions.get(name);
	if (substitution !== undefined && !isUnappliedReferenceTo(substitution, name)) {
		return isBroadMappedKey(substitution, environment, substitutions);
	}
	return name === "PropertyKey" && isBuiltIn(name, environment);
}

/**
 * The three judgments only the DECLARATION site gets: a member-carrying type
 * literal reads as "anonymous object", a mapped type needs no broad-key check
 * (the rule already chose the site), and a generic alias is reported as the
 * container itself rather than expanded.
 */
export function classifyWideningTarget(
	type: ESTree.TSType,
	environment: TypeEnvironment,
): WideningTarget | null {
	const resolved = resolveTypeReference(type, environment, new Map(), new Set());
	if (resolved === null) return null;
	if (resolved.kind === "alias") {
		const expanded = expandAlias(resolved);
		if (expanded === null) return null;
		if ((resolved.alias.typeParameters?.params.length ?? 0) > 0) {
			return classifyUnsafeDictionary(
				expanded.type,
				environment,
				expanded.substitutions,
				expanded.resolvingAliases,
			) !== null
				? { kind: "generic container" }
				: null;
		}
		return classifyExpandedTarget(
			expanded.type,
			environment,
			expanded.substitutions,
			expanded.resolvingAliases,
		);
	}
	const unwrapped = resolved.type;
	if (unwrapped.type === "TSTypeLiteral") {
		if (unwrapped.members.some((member) => member.type === "TSIndexSignature")) {
			return openDictionaryTarget(unwrapped, environment, new Map(), new Set());
		}
		return unwrapped.members.length > 0 ? { kind: "anonymous object" } : null;
	}
	if (unwrapped.type === "TSMappedType") {
		return openDictionaryTarget(unwrapped, environment, new Map(), new Set());
	}
	return classifyExpandedTarget(
		unwrapped,
		environment,
		resolved.substitutions,
		resolved.resolvingAliases,
	);
}

function classifyExpandedTarget(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment,
	resolvingAliases: ReadonlySet<string>,
): WideningTarget | null {
	const resolved = resolveThroughAliases(type, environment, substitutions, resolvingAliases);
	if (resolved === null) return null;
	const { type: unwrapped, substitutions: scope, resolvingAliases: resolving } = resolved;
	if (unwrapped.type === "TSUnknownKeyword") return { kind: "unknown" };
	if (unwrapped.type === "TSAnyKeyword") return { kind: "any" };
	if (unwrapped.type === "TSObjectKeyword") return { kind: "object" };
	if (unwrapped.type === "TSTypeLiteral") {
		return unwrapped.members.some((member) => member.type === "TSIndexSignature")
			? openDictionaryTarget(unwrapped, environment, scope, resolving)
			: null;
	}
	if (unwrapped.type === "TSMappedType") {
		return isBroadMappedKey(unwrapped.constraint, environment, scope)
			? openDictionaryTarget(unwrapped, environment, scope, resolving)
			: null;
	}
	if (unwrapped.type !== "TSTypeReference") return null;
	const name = typeReferenceName(unwrapped);
	if (name === null) return null;
	if (name === "Record" && isBuiltIn(name, environment)) {
		return openDictionaryTarget(unwrapped, environment, scope, resolving);
	}
	return null;
}

/** The one place the "does this dictionary discard evidence?" question maps
 * onto a widening verdict. */
function openDictionaryTarget(
	type: ESTree.TSType,
	environment: TypeEnvironment,
	substitutions: TypeAliasEnvironment,
	resolvingAliases: ReadonlySet<string>,
): WideningTarget | null {
	return classifyUnsafeDictionary(type, environment, substitutions, resolvingAliases) !== null
		? { kind: "open dictionary" }
		: null;
}

/** Strip parens and assertion wrappers down to the expression they decorate. */
export function unwrapAssertionExpression(
	expression: ESTree.Expression,
): ESTree.Expression {
	let current = expression;
	while (
		current.type === "ParenthesizedExpression" ||
		current.type === "TSAsExpression" ||
		current.type === "TSTypeAssertion" ||
		current.type === "TSNonNullExpression" ||
		current.type === "TSSatisfiesExpression"
	) {
		current = current.expression;
	}
	return current;
}

export function isKnownEvidenceExpression(expression: ESTree.Expression): boolean {
	const current = unwrapAssertionExpression(expression);
	if (current.type === "ObjectExpression") return true;
	return (
		current.type === "ArrayExpression" ||
		current.type === "ArrowFunctionExpression" ||
		current.type === "ClassExpression" ||
		current.type === "FunctionExpression" ||
		current.type === "NewExpression" ||
		current.type === "Literal" ||
		current.type === "TemplateLiteral" ||
		current.type === "UnaryExpression"
	);
}
