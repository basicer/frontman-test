import path from "path";
import fs from "fs";
import { google } from "googleapis";
import { config } from "dotenv";
import { toHast } from "@googleworkspace/google-docs-hast";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import filetype from 'magic-bytes.js'

import rehypeStringify from "rehype-stringify";
import rehypeRemark from "rehype-remark";
import rehypeParse from 'rehype-parse'
import remarkStringify from 'remark-stringify';
import rehypeFormat from 'rehype-format';
import rehypeDocument from 'rehype-document'
import {h, s} from 'hastscript'

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

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT, "base64").toString("utf8")),
  scopes: ["https://www.googleapis.com/auth/documents.readonly"],
});

const docs = google.docs({ version: "v1", auth: auth });
const res = await docs.documents.get({
  documentId: "1-3Jt8LsdgHCorszokW6wS1P1X_53e2I2NQ3L2zbsb-4",
});

let title = res.data.title;

let tree = toHast(res.data);
tree = h("main", tree);

let images = [];

visit(tree, (node) => {
  if (node.type === "element" && node.tagName === "img") {
    const { src } = node.properties;
    images[src] = true;
    // download, store, and replace the src attribute
    console.log("Image", node);
    //node.properties.src = "hi.png";
  }
});


for (let url in images) {
  let bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  const sha1 = createHash("sha1");
  sha1.update(bytes);
  let hash = sha1.digest("hex");
  let mime = filetype.filetypename(bytes);
  let fn = `${hash}.${mime[0] || ".bin"}`;
  fs.writeFileSync(path.join(build, fn), bytes);
  images[url] = fn;
  console.log(bytes);
  console.log(url, hash, [0]);
}

visit(tree, (node) => {
  if (node.type === "element" && node.tagName === "img") {
    const { src } = node.properties;
    node.properties.src = "/" + images[src];
  }
});

const fragment = unified()
  .use(rehypeStringify, { collapseEmptyAttributes: true })
  .stringify(tree);

let style = `
  img { max-height: 200px }
`;

const html = (await unified()
  .use(rehypeParse, {fragment: true})
  .use(rehypeDocument, {
    title,
    css: ['simple.css', 'outline.css'],
    js: 'outline.js',
    style,
  })
  .use(rehypeFormat)
  .use(rehypeStringify, { collapseEmptyAttributes: true })
  .process(fragment)).value;

let md = (await unified()
  .use(rehypeParse, {fragment: true})
  .use(rehypeRemark)
  .use(remarkStringify, { collapseEmptyAttributes: true })
  .process(fragment)).value;

fs.writeFileSync(path.join(build, "index.html"), html, "utf8");
fs.writeFileSync(path.join(build, "index.md"), md, "utf8");
