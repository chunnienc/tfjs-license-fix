#!/usr/bin/env node
/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
const glob = __importStar(require("glob"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const yargs_1 = __importDefault(require("yargs"));
const simple_git_1 = require("simple-git");
const fs_1 = require("fs");
const license_headers_1 = require("./license_headers");
const argsPromise = (0, yargs_1.default)(process.argv)
    .array('glob')
    .describe('glob', [
    'If presented, add/update license header to the matched files from the current directory.',
    'Otherwise, process the current git changed & unstaged files.',
].join(' '))
    .option('no-add', {
    type: 'boolean',
    description: 'If presented, only update existing license headers.',
    default: false,
})
    .help().argv;
async function addOrReplaceLicenseHeader(content, licenseHeader) {
    var _a, _b, _c, _d;
    const SHEBANG_PATTERN = /^(?<shebang>#![^\n]+)[\n]/;
    const shebang = (_b = (_a = content.match(SHEBANG_PATTERN)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.shebang;
    content = content.replace(SHEBANG_PATTERN, '');
    const postProcess = (content) => {
        if (shebang) {
            content = `${shebang}\n${content}`;
        }
        return content;
    };
    for (const pattern of license_headers_1.LICENSE_HEADER_PATTERNS) {
        const year = (_d = (_c = content.match(pattern)) === null || _c === void 0 ? void 0 : _c.groups) === null || _d === void 0 ? void 0 : _d.year;
        if (year == null) {
            continue;
        }
        if (year !== licenseHeader.year.toString()) {
            // License header found and not equal to the target year. Keep the old
            // header.
            return {
                mode: 'Unchanged',
                newContent: postProcess(content),
            };
        }
        // License header found and year matches. Replace it with the target license header
        // regardless of the current license style.
        const newContent = content.replace(pattern, licenseHeader.content);
        return {
            mode: newContent === content ? 'Unchanged' : 'Updated',
            newContent: postProcess(newContent),
        };
    }
    // No license found, add a new license header.
    if ((await argsPromise).add === false) {
        return {
            mode: 'Unchanged',
            newContent: postProcess(content),
        };
    }
    return {
        mode: 'Added',
        newContent: postProcess(`${licenseHeader.content.trim()}\n${content}`),
    };
}
async function getGitDiffFiles() {
    const git = (0, simple_git_1.simpleGit)({
        baseDir: process.cwd(),
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
    });
    const topLevelDir = await git.revparse(['--show-toplevel']);
    const gitStatus = await git.status();
    return gitStatus.files.map(({ path: filename }) => {
        return path.join(topLevelDir, filename);
    });
}
async function getGlobMatchedFiles(patterns) {
    const filenames = new Set();
    for (const pattern of patterns) {
        for (const file of glob.sync(pattern, { ignore: ['**/node_modules/**'] })) {
            filenames.add(path.join(process.cwd(), file));
        }
    }
    return [...filenames].sort();
}
/*
 * Reads the file and writes (fix) license header to it.
 * @param {string} filename The absolute path to the file.
 * @returns {Promise<string>} Colored status text for this file.
 */
async function processFile(filename) {
    const relativeFilename = path.relative(process.cwd(), filename);
    const isTargetFile = license_headers_1.LICENSE_HEADERS.some(({ filenamePattern }) => {
        return filenamePattern.test(filename);
    });
    if (!isTargetFile) {
        chalk_1.default.gray(relativeFilename);
    }
    let content;
    try {
        content = (0, fs_1.readFileSync)(filename, { encoding: 'utf-8' });
    }
    catch (err) {
        // Failed to load the file (maybe deleted), skip it.
        return chalk_1.default.red(relativeFilename);
    }
    for (const licenseHeader of license_headers_1.LICENSE_HEADERS) {
        if (!licenseHeader.filenamePattern.test(filename)) {
            continue;
        }
        const { mode, newContent } = await addOrReplaceLicenseHeader(content, licenseHeader);
        if (mode === 'Unchanged') {
            return chalk_1.default.blueBright(relativeFilename);
        }
        try {
            (0, fs_1.writeFileSync)(filename, newContent);
        }
        catch (err) {
            return chalk_1.default.red(relativeFilename);
        }
        if (mode === 'Added') {
            return chalk_1.default.green(`${relativeFilename} - ADDED`);
        }
        else {
            // mode === 'UPDATED'
            return chalk_1.default.yellow(`${relativeFilename} - UPDATED`);
        }
    }
    return chalk_1.default.gray(relativeFilename);
}
(async function main() {
    const { glob } = await argsPromise;
    const filenames = (glob === null || glob === void 0 ? void 0 : glob.length)
        ? await getGlobMatchedFiles(glob.map(String))
        : await getGitDiffFiles();
    for (const filename of filenames) {
        console.log(await processFile(filename));
    }
})();
