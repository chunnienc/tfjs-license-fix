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
export interface LicenseHeader {
  readonly filenamePattern: RegExp;
  readonly year: string | number;
  readonly content: string;
}

export const LICENSE_HEADER_PATTERNS = [
  // JS style license header
  /^[\s\r\n]*\/\*\*(\*(?!\/)|[^*])+@license(\*(?!\/)|[^*])+Copyright\s(?<year>\d+)(\*(?!\/)|[^*])+\*\//i,
  // CPP style license header
  /^[\s\r\n]*\/\*(\*(?!\/)|[^*])+Copyright\s(?<year>\d+)(\*(?!\/)|[^*])+\*\//i,
];

export const LICENSE_HEADERS: LicenseHeader[] = [
  {
    filenamePattern: /(\.ts|\.js)$/i,
    year: 2023,
    content: `
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
 */`.trim(),
  },
  {
    filenamePattern: /(\.c|\.h|\.cc|\.cpp)$/i,
    year: 2023,
    content: `
/* Copyright 2023 Google LLC.
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
];

// Check if LICENSE_HEADERS can be caught by LICENSE_HEADER_PATTERNS
for (const licenseHeader of LICENSE_HEADERS) {
  if (!LICENSE_HEADER_PATTERNS.some(pat => pat.test(licenseHeader.content))) {
    throw new Error(
      `License header cannot be caught by any pattern: ${JSON.stringify(
        licenseHeader,
        null,
        4
      )}`
    );
  }
}
