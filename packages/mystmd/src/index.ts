#!/usr/bin/env node
import 'core-js/actual'; // This adds backwards compatible functionality for various CLIs
import { Command } from 'commander';
import version from './version.js';
import { makeBuildCLI } from './build.js';
import { makeCleanCLI } from './clean.js';
import { makeInitCLI, addDefaultCommand } from './init.js';
import { makeStartCLI } from './site.js';
import { makeTemplatesCLI } from './templates.js';
import { makeUpgradeCLI } from './upgrade.js';

const program = new Command();

program.addCommand(makeInitCLI(program));
program.addCommand(makeBuildCLI(program));
program.addCommand(makeStartCLI(program));
program.addCommand(makeCleanCLI(program));
program.addCommand(makeTemplatesCLI(program));
program.addCommand(makeUpgradeCLI(program));
program.version(`v${version}`, '-v, --version', 'Print the current version of myst');
program.option('-d, --debug', 'Log out any errors to the console');
addDefaultCommand(program);
program.parse(process.argv);
