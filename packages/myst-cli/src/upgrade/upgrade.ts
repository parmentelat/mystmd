import path from 'node:path';
import fs from 'node:fs';
import type { ISession } from '../session/types.js';
import { writeJsonLogs } from '../utils/logging.js';
import yaml from 'js-yaml';
import type { Config } from 'myst-config';
import { upgradeConfig, validateJupyterBookConfig } from './config.js';
import { upgradeTOC, validateSphinxExternalTOC } from './toc.js';
import { upgradeGlossaries } from './syntax.js';
import { defined } from './utils.js';
export async function upgrade(session: ISession, opts: any) {
  const upgradeLog: Record<string, any> = {
    input: {
      opts: opts,
    },
  };

  const config: Config = {
    version: 1,
  };

  // Does config file exist?
  if (fs.existsSync('_config.yml')) {
    const content = fs.readFileSync('_config.yml').toString();
    const data = validateJupyterBookConfig(yaml.load(content));
    if (defined(data)) {
      // Update MyST configuration
      ({ site: config.site, project: config.project } = upgradeConfig(data));
    }
  }
  // Does TOC exist?
  if (fs.existsSync('_toc.yml')) {
    const content = fs.readFileSync('_toc.yml').toString();
    const data = validateSphinxExternalTOC(yaml.load(content));
    if (defined(data)) {
      (config as any).toc = upgradeTOC(data);
    }
  }

  upgradeGlossaries();

  // Write new myst.yml
  fs.writeFileSync('myst.yml', yaml.dump(config));

  writeJsonLogs(session, 'myst.upgrade.json', upgradeLog);
  session.dispose();
}
