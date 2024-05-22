import { Command } from 'commander';

export function makeUpgradeCommand() {
  const command = new Command('upgrade')
    .description('Upgrade Jupyter Book projects to MyST')
    return command;
}
