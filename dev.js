import path from "path";
import fs from "fs";
import { config } from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

import go from "./transform.js";
import express from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));

config();

let app = express();
app.use(express.static("./static"));

app.get("/", (req, res) => {
  go(process.env.DOCUMENT_ID).then(({ html }) => {
    res.send(html);
  });
});

app.listen(process.env.PORT || 5000);
