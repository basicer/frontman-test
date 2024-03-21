import path from "path";
import fs from "fs";
import { config } from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

import go from "./transform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

config();

const build = path.join(__dirname, "build");
const assets = path.join(__dirname, "static");

if (!fs.existsSync(build)) {
  fs.mkdirSync(build);
}

for (let f of fs.readdirSync(assets)) {
  fs.copyFileSync(path.join(assets, f), path.join(build, f));
}

let { md, html } = await go(process.env.DOCUMENT_ID, build);

fs.writeFileSync(path.join(build, "index.html"), html, "utf8");
fs.writeFileSync(path.join(build, "index.md"), md, "utf8");
