#!/usr/bin/env node

import { spawnSync } from"child_process";
import { resolve } from "path";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cmd = "node --no-warnings " + resolve(__dirname, "cli.js");
spawnSync(cmd, { stdio: "inherit", shell: true });