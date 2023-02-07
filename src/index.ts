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
import * as chalk from 'chalk';
import * as glob from 'glob';
import * as path from 'path';
import * as yargs from 'yargs';
import {simpleGit} from 'simple-git';
import {readFileSync, writeFileSync} from 'fs';

import {LICENSE_HEADERS, LicenseHeader} from './license_headers';

const argsPromise = yargs(process.argv.slice(2))
  .usage('Usage: tfjs-license-fix [...glob]')
  .array('glob')
  .describe(
    'glob',
    [
      'If provided, add/replace license header to the matched files from the current directory.',
      'Otherwise, process the current git changed & unstaged files.',
    ].join(' ')
  )
  .help().argv;

interface AddLicenseHeaderResult {
  readonly mode: 'Unchanged' | 'Added' | 'Replaced';
  readonly newContent: string;
}

function addOrReplaceLicenseHeader(
  content: string,
  licenseHeader: LicenseHeader
): AddLicenseHeaderResult {
  const patterns = [
    // JS style license header
    /^[\s\r\n]*\/\*\*(\*(?!\/)|[^*])+@license(\*(?!\/)|[^*])+Copyright\s(?<year>\d+).+Google(\*(?!\/)|[^*])+\*\//i,
    // CPP style license header
    /^[\s\r\n]*\/\*(\*(?!\/)|[^*])+Copyright\s(?<year>\d+).+Google(\*(?!\/)|[^*])+\*\//i,
  ];

  for (const pattern of patterns) {
    const year = content.match(pattern)?.groups?.year;
    if (year == null) {
      continue;
    }
    if (year !== licenseHeader.year.toString()) {
      // License header found and not equal to the target year. Keep the old
      // header.
      return {
        mode: 'Unchanged',
        newContent: content,
      };
    }
    // License header found and year matches. Replace it with the target license header
    // regardless of the current license style.
    const newContent = content.replace(pattern, licenseHeader.content);
    return {
      mode: newContent === content ? 'Unchanged' : 'Replaced',
      newContent,
    };
  }
  // No license found, add a new license header.
  return {
    mode: 'Added',
    newContent: `${licenseHeader.content.trim()}\n${content}`,
  };
}

async function getGitDiffFiles(): Promise<string[]> {
  const git = simpleGit({
    baseDir: process.cwd(),
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  });
  const topLevelDir = await git.revparse(['--show-toplevel']);
  const gitStatus = await git.status();
  return gitStatus.files.map(({path: filename}) => {
    return path.join(topLevelDir, filename);
  });
}

async function getGlobMatchedFiles(patterns: string[]): Promise<string[]> {
  const filenames = new Set<string>();
  for (const pattern of patterns) {
    for (const file of glob.sync(pattern, {ignore: ['**/node_modules/**']})) {
      filenames.add(path.join(process.cwd(), file));
    }
  }
  return [...filenames].sort();
}

/*
 * Reads the file and writes (fix) license header to it.
 * @param {string} filename The absolute path to the file.
 * @returns {string} Colored status text for this file.
 */
function processFile(filename: string): string {
  const relativeFilename = path.relative(process.cwd(), filename);
  const isTargetFile = LICENSE_HEADERS.some(({filenamePattern}) => {
    return filenamePattern.test(filename);
  });
  if (!isTargetFile) {
    chalk.gray(relativeFilename);
  }

  let content: string;
  try {
    content = readFileSync(filename, {encoding: 'utf-8'});
  } catch (err) {
    // Failed to load the file (maybe deleted), skip it.
    return chalk.red(relativeFilename);
  }

  for (const licenseHeader of LICENSE_HEADERS) {
    if (!licenseHeader.filenamePattern.test(filename)) {
      continue;
    }

    const {mode, newContent} = addOrReplaceLicenseHeader(
      content,
      licenseHeader
    );
    if (mode === 'Unchanged') {
      return chalk.blueBright(relativeFilename);
    }
    try {
      writeFileSync(filename, newContent);
    } catch (err) {
      return chalk.red(relativeFilename);
    }

    if (mode === 'Added') {
      return chalk.green(`${relativeFilename} - ADDED`);
    } else {
      // mode === 'Replaced'
      return chalk.yellow(`${relativeFilename} - REPLACED`);
    }
  }
  return chalk.gray(relativeFilename);
}

(async function main() {
  const {glob} = await argsPromise;
  const filenames = glob?.length
    ? await getGlobMatchedFiles(glob.map(String))
    : await getGitDiffFiles();

  for (const filename of filenames) {
    console.log(processFile(filename));
  }
})();
