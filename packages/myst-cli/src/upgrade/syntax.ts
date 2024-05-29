import { mystParse } from 'myst-parser';
import fs from 'node:fs';
import { globSync } from 'glob';
import { selectAll } from 'unist-util-select';
import { toText } from 'myst-common';

type Line = {
  content: string;
  offset: number;
};

type LegacyGlossaryItem = {
  termLines: Line[];
  definitionLines: Line[];
};

export function upgradeGlossaries() {
  const mdFiles = globSync('**/*.md');
  mdFiles.forEach(upgradeGlossary);
}

const SPLIT_PATTERN = /\r\n|\r|\n/;

function upgradeGlossary(path: string) {
  const backupFilePath = `${path}.myst.bak`;
  if (fs.existsSync(backupFilePath)) {
    return;
  }
  const data = fs.readFileSync(path).toString();
  const documentLines = data.split(SPLIT_PATTERN);

  const mdast = mystParse(data);
  const glossaryNodes = selectAll('mystDirective[name=glossary]', mdast);

  // Track the edit point
  let editOffset = 0;
  for (const node of glossaryNodes) {
    const nodeLines = ((node as any).value as string).split(SPLIT_PATTERN);

    // TODO: assert span items

    // Flag tracking whether the line-processor expects definition lines
    let inDefinition = false;
    let indentSize = 0;

    const entries: LegacyGlossaryItem[] = [];

    // Parse lines into separate entries
    for (let i = 0; i < nodeLines.length; i++) {
      const line = nodeLines[i];
      // Is the line a comment?
      if (/^\.\.\s/.test(line) || !line.length) {
        continue;
      }
      // Is the line a non-whitespace-leading line (term declaration)?
      else if (/^[^\s]/.test(line[0])) {
        // Comment
        if (line.startsWith('.. ')) {
          continue;
        }

        // Do we need to create a new entry?
        if (inDefinition || !entries.length) {
          // Close the current definition, open a new term
          entries.push({
            definitionLines: [],
            termLines: [{ content: line, offset: i }],
          });
          inDefinition = false;
        }
        // Can we extend existing entry with an additional term?
        else if (entries.length) {
          entries[entries.length - 1].termLines.push({ content: line, offset: i });
        }
      }
      // Open a definition
      else if (!inDefinition) {
        inDefinition = true;
        indentSize = line.length - line.replace(/^\s+/, '').length;

        if (entries.length) {
          entries[entries.length - 1].definitionLines.push({
            content: line.slice(indentSize),
            offset: i,
          });
        }
      }
    }

    // Build glossary
    const newLines: string[] = [];

    for (const entry of entries) {
      const { termLines, definitionLines } = entry;

      const definitionBody = definitionLines.map((line) => line.content).join('\n');
      const [firstTerm, ...restTerms] = termLines;

      // Initial definition
      const [firstTermValue, ..._] = firstTerm.content.split(/\s+:\s+/);
      newLines.push(firstTermValue, `: ${definitionBody}\n`);

      if (restTerms) {
        // Terms can contain markup, but we need the text-form to create a term reference
        // TODO: what if something magical like an xref is used here? Assume not.
        const parsedTerm = mystParse(firstTermValue);
        const termName = toText(parsedTerm);
        for (const { content } of restTerms) {
          const [term, ..._] = content.split(/\s+:\s+/);
          newLines.push(term, `: {term}\`${termName}\`\n`);
        }
      }
    }
    const nodeSpan = { start: node.position?.start?.line, stop: node.position?.end?.line };
    const spanLength = nodeSpan.stop! - nodeSpan.start! - 1;
    documentLines.splice(nodeSpan.start! + editOffset, spanLength, ...newLines);

    // Offset our insert cursor
    editOffset += newLines.length - spanLength;
  }

  // Update the file
  if (glossaryNodes.length) {
    fs.copyFileSync(path, backupFilePath);
    fs.writeFileSync(path, documentLines.join('\n'));
  }
}
