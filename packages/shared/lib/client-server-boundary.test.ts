import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import ts from "typescript";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const sharedLibRoot = join(repoRoot, "packages", "shared", "lib");
const sharedComponentsRoot = join(repoRoot, "packages", "shared", "components");
const sourceRoots = [join(repoRoot, "apps"), join(repoRoot, "packages", "shared")];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set([
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...sourceFiles(absolute));
    }
    else if (sourceExtensions.has(extname(entry.name))) files.push(absolute);
  }
  return files;
}

function isClientComponent(source: ts.SourceFile): boolean {
  const firstStatement = source.statements[0];
  return Boolean(
    firstStatement &&
      ts.isExpressionStatement(firstStatement) &&
      ts.isStringLiteral(firstStatement.expression) &&
      firstStatement.expression.text === "use client",
  );
}

function runtimeImportSources(source: ts.SourceFile): string[] {
  const imports: string[] = [];

  function hasRuntimeBinding(node: ts.ImportDeclaration): boolean {
    if (!node.importClause) return true;
    if (node.importClause.isTypeOnly) return false;
    if (node.importClause.name) return true;

    const bindings = node.importClause.namedBindings;
    if (!bindings || ts.isNamespaceImport(bindings)) return true;
    return bindings.elements.some((element) => !element.isTypeOnly);
  }

  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      hasRuntimeBinding(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return imports;
}

function isServerDataModule(moduleName: string): boolean {
  const normalized = moduleName.replaceAll("\\", "/");
  return (
    /(?:^|\/)lib\/supabase\/server$/.test(normalized) ||
    /(?:^|\/)lib\/db\/(?:admin-store|store|store-query-foundation|[^/]+-store)$/.test(
      normalized,
    )
  );
}

describe("client/server module boundary", () => {
  it("keeps server database modules out of Client Component runtime imports", () => {
    const violations: string[] = [];

    for (const absolute of sourceRoots.flatMap(sourceFiles)) {
      const contents = readFileSync(absolute, "utf8");
      if (!/["']use client["']/.test(contents)) continue;

      const source = ts.createSourceFile(
        absolute,
        contents,
        ts.ScriptTarget.Latest,
        true,
        absolute.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      if (!isClientComponent(source)) continue;

      for (const moduleName of runtimeImportSources(source)) {
        if (isServerDataModule(moduleName)) {
          violations.push(`${relative(repoRoot, absolute)} -> ${moduleName}`);
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Client Components must use HTTP/client adapters or type-only imports:\n${violations.join("\n")}`,
    );
  });

  it("keeps shared domain libraries independent from UI components", () => {
    const violations: string[] = [];

    for (const absolute of sourceFiles(sharedLibRoot)) {
      const contents = readFileSync(absolute, "utf8");
      const source = ts.createSourceFile(
        absolute,
        contents,
        ts.ScriptTarget.Latest,
        true,
        absolute.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );

      for (const moduleName of runtimeImportSources(source)) {
        const normalized = moduleName.replaceAll("\\", "/");
        const resolvedRelative = normalized.startsWith(".")
          ? resolve(dirname(absolute), normalized)
          : null;
        if (
          normalized === "@/components" ||
          normalized.startsWith("@/components/") ||
          resolvedRelative === sharedComponentsRoot ||
          resolvedRelative?.startsWith(`${sharedComponentsRoot}${sep}`)
        ) {
          violations.push(`${relative(repoRoot, absolute)} -> ${moduleName}`);
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Shared domain libraries must not depend on UI component modules:\n${violations.join("\n")}`,
    );
  });
});
