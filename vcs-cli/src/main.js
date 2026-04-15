#!/usr/bin/env node

/**
 * MyVCS CLI Entry Point
 * Author: Moksh
 * 
 * Main CLI orchestrator that routes commands and spawns C++ binaries
 * for performance-heavy operations.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

import { initRepo, findRepoRoot } from './staging.js';
import { add, status, commit } from './staging.js';
import { log, branch, checkout, getCurrentBranch } from './refs.js';
import { spawnCppBinary, diff } from './utils.js';
import { isConfigured, syncCommit, syncBranch } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Package info
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
    .name('myvcs')
    .description('MyVCS - A custom version control system')
    .version(pkg.version);

// ============================================================================
// init - Initialize a new repository
// ============================================================================
program
    .command('init')
    .description('Initialize a new MyVCS repository')
    .action(async () => {
        try {
            const result = await initRepo(process.cwd());
            if (result.success) {
                console.log(chalk.green(`Initialized empty MyVCS repository in ${result.path}`));
            } else {
                console.error(chalk.red(`Error: ${result.error}`));
                process.exit(1);
            }
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// add - Stage files for commit
// ============================================================================
program
    .command('add')
    .description('Add file contents to the index')
    .argument('<paths...>', 'Files to add')
    .action(async (paths) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            for (const path of paths) {
                const result = await add(repoRoot, path);
                if (!result.success) {
                    console.error(chalk.red(`Error adding ${path}: ${result.error}`));
                }
            }
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// status - Show working tree status
// ============================================================================
program
    .command('status')
    .description('Show the working tree status')
    .action(async () => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            const currentBranch = getCurrentBranch(repoRoot);
            console.log(`On branch ${chalk.cyan(currentBranch)}\n`);

            const result = await status(repoRoot);
            
            if (result.staged.length > 0) {
                console.log(chalk.green('Changes to be committed:'));
                for (const file of result.staged) {
                    console.log(chalk.green(`  ${file.status}: ${file.path}`));
                }
                console.log();
            }

            if (result.modified.length > 0 || result.deleted.length > 0) {
                console.log(chalk.red('Changes not staged for commit:'));
                for (const file of result.modified) {
                    console.log(chalk.red(`  modified: ${file}`));
                }
                for (const file of result.deleted) {
                    console.log(chalk.red(`  deleted:  ${file}`));
                }
                console.log();
            }

            if (result.untracked.length > 0) {
                console.log(chalk.gray('Untracked files:'));
                for (const file of result.untracked) {
                    console.log(chalk.gray(`  ${file}`));
                }
                console.log();
            }

            if (result.staged.length === 0 && result.modified.length === 0 && 
                result.deleted.length === 0 && result.untracked.length === 0) {
                console.log('nothing to commit, working tree clean');
            }
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// commit - Record changes to the repository
// ============================================================================
program
    .command('commit')
    .description('Record changes to the repository')
    .option('-m, --message <message>', 'Commit message')
    .option('-a, --author <author>', 'Author name')
    .option('-e, --email <email>', 'Author email')
    .action(async (options) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            if (!options.message) {
                console.error(chalk.red('error: commit message required (-m)'));
                process.exit(1);
            }

            const result = await commit(repoRoot, {
                message: options.message,
                author: options.author || 'Unknown',
                email: options.email || 'unknown@example.com'
            });

            if (result.success) {
                console.log(`[${chalk.cyan(result.branch)} ${chalk.yellow(result.hash.slice(0, 7))}] ${options.message}`);
                console.log(` ${result.filesChanged} file(s) changed`);

                if (isConfigured()) {
                    const commitSync = await syncCommit({
                        hash: result.hash,
                        tree: result.tree,
                        parent: result.parent,
                        author: result.author,
                        message: options.message,
                        timestamp: result.timestamp
                    });

                    if (!commitSync.success) {
                        console.warn(chalk.yellow(`Warning: commit not synced to Supabase: ${commitSync.error}`));
                    }

                    const branchSync = await syncBranch(result.branch, result.hash);
                    if (!branchSync.success) {
                        console.warn(chalk.yellow(`Warning: branch not synced to Supabase: ${branchSync.error}`));
                    }
                }
            } else {
                console.error(chalk.red(`Error: ${result.error}`));
                process.exit(1);
            }
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// log - Show commit history
// ============================================================================
program
    .command('log')
    .description('Show commit logs')
    .option('-n, --number <count>', 'Limit number of commits', '10')
    .action(async (options) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            const commits = await log(repoRoot, parseInt(options.number));

            for (const c of commits) {
                console.log(chalk.yellow(`commit ${c.hash}`));
                console.log(`Author: ${c.author} <${c.email}>`);
                console.log(`Date:   ${new Date(c.timestamp * 1000).toLocaleString()}`);
                console.log();
                console.log(`    ${c.message}`);
                console.log();
            }

            if (commits.length === 0) {
                console.log('No commits yet');
            }
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// branch - List, create, or delete branches
// ============================================================================
program
    .command('branch')
    .description('List, create, or delete branches')
    .argument('[name]', 'Branch name to create')
    .option('-d, --delete', 'Delete a branch')
    .option('-l, --list', 'List branches')
    .action(async (name, options) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            if (options.list || !name) {
                const branches = branch.list(repoRoot);
                const current = getCurrentBranch(repoRoot);

                for (const b of branches) {
                    if (b === current) {
                        console.log(chalk.green(`* ${b}`));
                    } else {
                        console.log(`  ${b}`);
                    }
                }
            } else if (options.delete) {
                const result = branch.delete(repoRoot, name);
                if (result.success) {
                    console.log(`Deleted branch ${name}`);
                } else {
                    console.error(chalk.red(`Error: ${result.error}`));
                    process.exit(1);
                }
            } else {
                const result = branch.create(repoRoot, name);
                if (result.success) {
                    console.log(`Created branch ${name}`);
                } else {
                    console.error(chalk.red(`Error: ${result.error}`));
                    process.exit(1);
                }
            }
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// checkout - Switch branches or restore working tree files
// ============================================================================
program
    .command('checkout')
    .description('Switch branches or restore working tree files')
    .argument('<ref>', 'Branch name or commit hash')
    .option('-b', 'Create and checkout a new branch')
    .action(async (ref, options) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            if (options.b) {
                // Create new branch first
                const createResult = branch.create(repoRoot, ref);
                if (!createResult.success) {
                    console.error(chalk.red(`Error: ${createResult.error}`));
                    process.exit(1);
                }
            }

            const result = await checkout(repoRoot, ref);
            if (result.success) {
                console.log(`Switched to branch '${ref}'`);
            } else {
                console.error(chalk.red(`Error: ${result.error}`));
                process.exit(1);
            }
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// diff - Show changes between commits, commit and working tree, etc.
// ============================================================================
program
    .command('diff')
    .description('Show changes between commits, commit and working tree, etc.')
    .argument('[path]', 'File to diff')
    .action(async (path) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            const result = await diff(repoRoot, path);
            console.log(result);
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// hash-object - Compute object hash (low-level)
// ============================================================================
program
    .command('hash-object')
    .description('Compute object ID and optionally creates a blob')
    .argument('<file>', 'File to hash')
    .option('-w, --write', 'Actually write the object to the database')
    .action(async (file, options) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            const args = options.write ? ['hash-object', file] : ['hash-string', readFileSync(file, 'utf-8')];
            
            const result = await spawnCppBinary('myvcs-storage', args, repoRoot || process.cwd());
            console.log(result.stdout.trim());
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

// ============================================================================
// cat-file - Display object contents (low-level)
// ============================================================================
program
    .command('cat-file')
    .description('Display contents of a repository object')
    .argument('<hash>', 'Object hash')
    .action(async (hash) => {
        try {
            const repoRoot = findRepoRoot(process.cwd());
            if (!repoRoot) {
                console.error(chalk.red('fatal: not a myvcs repository'));
                process.exit(1);
            }

            const result = await spawnCppBinary('myvcs-storage', ['cat-file', hash], repoRoot);
            console.log(result.stdout);
        } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    });

program.parse();
