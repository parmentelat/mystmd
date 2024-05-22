import type { Command } from 'commander';
import { upgrade, Session, makeUpgradeCommand } from 'myst-cli';
import { clirun } from './clirun.js';

export function makeUpgradeCLI(program: Command) {
  const command = makeUpgradeCommand().action(clirun(Session, upgrade, program));
  return command;
}
