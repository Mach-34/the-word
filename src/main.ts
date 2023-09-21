#!/usr/bin/env node

import { spawnSync } from"child_process";
import { resolve } from "path";
import path from 'path';
import { argv } from "process";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let args = argv
    .slice(2)
    .map(arg => arg.includes(" ") ? `"${arg}"` : arg)
    .join(" ");

const cmd = `node --no-warnings ${resolve(__dirname, "cli.js")} ${args}`;
spawnSync(cmd, { stdio: "inherit", shell: true });