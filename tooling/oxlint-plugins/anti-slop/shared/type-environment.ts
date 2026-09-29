import type { ESTree } from "@oxlint/plugins";

const BUILT_INS = new Set([
	"Record",
	"Readonly",
	"Partial",
	"Required",
	"Pick",
	"Omit",
	"PropertyKey",
	"NonNullable",
]);

export type TypeEnvironment = {
	readonly aliases: ReadonlyMap<string, ESTree.TSTypeAliasDeclaration>;
	readonly interfaces: ReadonlyMap<string, readonly ESTree.TSInterfaceDeclaration[]>;
	readonly shadowedBuiltIns: ReadonlySet<string>;
};

function declaredStatement(statement: ESTree.Statement): ESTree.Node | null {
	return statement.type === "ExportNamedDeclaration" ||
		statement.type === "ExportDefaultDeclaration"
		? (statement.declaration ?? null)
		: statement;
}

/** Index every module-level type name a rule may have to resolve, plus the built-ins this module shadows. */
export function createTypeEnvironment(program: ESTree.Program): TypeEnvironment {
	const aliases = new Map<string, ESTree.TSTypeAliasDeclaration>();
	const interfaces = new Map<string, ESTree.TSInterfaceDeclaration[]>();
	const shadowedBuiltIns = new Set<string>();

	for (const statement of program.body) {
		const declaration = declaredStatement(statement);
		if (declaration?.type === "ImportDeclaration") {
			for (const specifier of declaration.specifiers) {
				if (BUILT_INS.has(specifier.local.name)) shadowedBuiltIns.add(specifier.local.name);
			}
			continue;
		}

		if (declaration?.type === "TSTypeAliasDeclaration") {
			if (!aliases.has(declaration.id.name)) aliases.set(declaration.id.name, declaration);
			if (BUILT_INS.has(declaration.id.name)) shadowedBuiltIns.add(declaration.id.name);
			continue;
		}

		if (declaration?.type === "TSInterfaceDeclaration") {
			const declarations = interfaces.get(declaration.id.name) ?? [];
			declarations.push(declaration);
			interfaces.set(declaration.id.name, declarations);
			if (BUILT_INS.has(declaration.id.name)) shadowedBuiltIns.add(declaration.id.name);
			continue;
		}

		// A class and an enum each introduce a TYPE name; a function declaration
		// introduces only a value, so it cannot shadow a built-in type.
		if (
			(declaration?.type === "TSEnumDeclaration" ||
				declaration?.type === "ClassDeclaration") &&
			declaration.id !== null &&
			BUILT_INS.has(declaration.id.name)
		) {
			shadowedBuiltIns.add(declaration.id.name);
		}
	}

	return { aliases, interfaces, shadowedBuiltIns };
}

/** Reports whether a name still means TypeScript's built-in type of that name in this module. */
export function isBuiltIn(name: string, environment: TypeEnvironment): boolean {
	return BUILT_INS.has(name) && !environment.shadowedBuiltIns.has(name);
}
