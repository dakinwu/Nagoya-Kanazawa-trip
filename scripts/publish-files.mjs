import { cp, readdir } from "node:fs/promises";
// Commit these output files alongside src/ for Pages configured as main / root.
// cloud-config.js remains the user's existing environment configuration.
for (const name of await readdir("dist")) {
  if (name === "cloud-config.js" || name === "cloud-sync.js") continue;
  await cp(`dist/${name}`, name, { recursive: true });
}
console.log("Prepared root files for GitHub Pages.");
