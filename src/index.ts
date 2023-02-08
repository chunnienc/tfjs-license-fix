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
import {readFileSync, writeFileSync} from 'fs';
import * as path from 'path';
import {simpleGit} from 'simple-git';

enum LicenseStyle {
  JS = 'js',
  CPP = 'cpp',
}

interface License {
  readonly fileExtensions: string[];
  readonly year: string;
  readonly content: string;
}

const LICENSES: Record<LicenseStyle, License> = {
  [LicenseStyle.JS]: {
    fileExtensions: ['.ts', '.js'],
    year: '2023',
    content: `/**
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
  */`.trim(),
  },
  [LicenseStyle.CPP]: {
    fileExtensions: ['.h', '.cc', '.cpp'],
    year: '2023',
    content: `/* Copyright 2023 Google LLC.
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
    * ===========================================================================*/
   `.trim(),
  },
};

function replaceLicense(content: string, license: License) {
  const patterns = [
    /^\/\*\*(.|[\r\n])+@license(.|[\r\n])+Copyright\s(?<year>\d+).+Google(.|[\r\n])+\*\//i,
    /^\/\*(.|[\r\n])+Copyright\s(?<year>\d+).+Google(.|[\r\n])+\*\//i,
  ];

  for (const pattern of patterns) {
    const year = content.match(pattern)?.groups?.year;
    if (year == null) {
      continue;
    }
    if (year !== license.year) {
      // License header found and not equal to the target year. Keep the old
      // header.
      return content;
    }
    console.log(license.content);
    console.log(content.replace(pattern, license.content));
    return content;
  }
  // No license found, add a new license header.
  return `${license.content.trim()}\n${content}`;
}

async function main() {
  const dir = process.cwd();

  const git = simpleGit({
    baseDir: dir,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  });

  const topLevelDir = await git.revparse(['--show-toplevel']);

  const targetFileExtensions: string[] = Object.values(LICENSES)
    .map(x => x.fileExtensions)
    .flat();

  for (const file of (await git.diffSummary()).files) {
    if (
      !targetFileExtensions.some((ext: string) =>
        file.file.toLowerCase().endsWith(ext)
      )
    ) {
      continue;
    }
    const filename = path.join(topLevelDir, file.file);
    const content = readFileSync(filename, {encoding: 'utf-8'});

    for (const license of Object.values(LICENSES)) {
      if (
        !license.fileExtensions.some((ext: string) =>
          filename.toLowerCase().endsWith(ext)
        )
      ) {
        continue;
      }
      const newContent = replaceLicense(content, license);
      if (newContent !== content) {
        writeFileSync(filename, newContent);
      }
    }
  }
}
main();
