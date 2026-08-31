const fs = require("fs");
const path = require("path");

const dir = "./src/database/entities";

function processFile(file) {
  const full = path.join(dir, file);
  let content = fs.readFileSync(full, "utf8");
  let changed = false;

  content = content.replace(
    /@Column\(\{([^}]*)\}\)\s*\n(\s*)(\w+):\s*string\s*\|\s*null;/g,
    (match, options, indent, field) => {
      if (options.includes("type:")) {
        return match;
      }

      changed = true;

      return `@Column({ type: 'varchar', ${options.trim()} })\n${indent}${field}: string | null;`;
    }
  );

  if (changed) {
    fs.writeFileSync(full, content);
    console.log("fixed:", file);
  }
}

fs.readdirSync(dir)
  .filter(f => f.endsWith(".entity.ts"))
  .forEach(processFile);
