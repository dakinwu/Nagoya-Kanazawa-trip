import { copyFile, mkdir } from "node:fs/promises";
await mkdir("public", { recursive: true });
for (const name of ["cloud-config.js", "cloud-sync.js"]) await copyFile(name, `public/${name}`);
