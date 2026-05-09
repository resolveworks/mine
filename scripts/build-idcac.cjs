#!/usr/bin/env node
// Compiles the OhMyGuus "I Still Don't Care About Cookies" extension into a
// single injectable script.  Adapted from ~/Projects/idcac/scripts/compile-fork.js
// but simplified — no AST manipulation needed for the OhMyGuus fork source.

const fs = require("fs");
const path = require("path");

const FORK_DIR = path.join(
  __dirname,
  "..",
  "..",
  "I-Still-Dont-Care-About-Cookies",
  "src",
  "data",
);
const POLYFILLS_DIR = path.join(__dirname, "..", "..", "idcac", "scripts", "polyfills");
const OUT = path.join(__dirname, "..", "lib", "idcac-compiled.js");

function stripImportExport(code) {
  return code
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("export ") && !trimmed.startsWith("import ");
    })
    .join("\n");
}

// Ensure output dir exists
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const sink = fs.createWriteStream(OUT, { flags: "w" });
sink.write("try {\n");

// 1. Rules (strip export statement)
const rules = fs.readFileSync(path.join(FORK_DIR, "rules.js"), "utf-8");
sink.write(stripImportExport(rules));
sink.write("\n");

// 2. Bundle JS/CSS handler files as a `files` object
sink.write("const files = {\n");

for (const f of fs.readdirSync(path.join(FORK_DIR, "js"))) {
  if (f.endsWith(".js")) {
    const content = fs.readFileSync(path.join(FORK_DIR, "js", f), "utf-8");
    sink.write(`"data/js/${f}": \`${content.replace(/`/g, "\\`")}\`,\n`);
  }
}

for (const f of fs.readdirSync(path.join(FORK_DIR, "css"))) {
  if (f.endsWith(".css")) {
    const content = fs.readFileSync(path.join(FORK_DIR, "css", f), "utf-8");
    sink.write(`"data/css/${f}": \`${content.replace(/`/g, "\\`")}\`,\n`);
  }
}

sink.write("};\n");

// 3. Polyfills (prepend)
sink.write(fs.readFileSync(path.join(POLYFILLS_DIR, "prepend.js"), "utf-8"));
sink.write("\n");

// 4. Background script (strip import statement)
const background = fs.readFileSync(path.join(FORK_DIR, "background.js"), "utf-8");
sink.write(stripImportExport(background));
sink.write("\n");

// 5. Polyfills (append) — set up tab and trigger doTheMagic
sink.write(fs.readFileSync(path.join(POLYFILLS_DIR, "append.js"), "utf-8"));

sink.write("} catch (e) {\n");
sink.write("  console.error(e);\n");
sink.write("}\n");

sink.end(() => {
  const size = fs.statSync(OUT).size;
  console.log(`Built ${OUT} (${(size / 1024 / 1024).toFixed(1)} MB)`);
});
