/**
 * MyVCS Utility Functions
 * 
 * Helper functions for spawning C++ binaries and common operations.
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to C++ binaries
const BIN_DIR = join(__dirname, '../../vcs-engine/bin');

/**
 * Spawn a C++ binary and return its output
 * @param {string} binary - Binary name (e.g., 'myvcs-storage')
 * @param {string[]} args - Command line arguments
 * @param {string} cwd - Working directory
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function spawnCppBinary(binary, args, cwd) {
    const binaryPath = join(BIN_DIR, binary);
    
    if (!existsSync(binaryPath)) {
        throw new Error(`Binary not found: ${binaryPath}. Run 'make' in vcs-engine directory.`);
    }

    return new Promise((resolve, reject) => {
        const proc = spawn(binaryPath, args, { cwd });
        
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, code });
            } else {
                const error = new Error(stderr || `Process exited with code ${code}`);
                error.code = code;
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
            }
        });

        proc.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Spawn C++ binary with stdin input
 * @param {string} binary - Binary name
 * @param {string[]} args - Command line arguments
 * @param {string} input - Input to send to stdin
 * @param {string} cwd - Working directory
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function spawnCppBinaryWithInput(binary, args, input, cwd) {
    const binaryPath = join(BIN_DIR, binary);
    
    if (!existsSync(binaryPath)) {
        throw new Error(`Binary not found: ${binaryPath}. Run 'make' in vcs-engine directory.`);
    }

    return new Promise((resolve, reject) => {
        const proc = spawn(binaryPath, args, { cwd });
        
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            resolve({ stdout, stderr, code });
        });

        proc.on('error', (err) => {
            reject(err);
        });

        // Write input and close stdin
        proc.stdin.write(input);
        proc.stdin.end();
    });
}

/**
 * Show diff for a file or all files
 * @param {string} repoRoot - Repository root path
 * @param {string} [filePath] - Specific file to diff (optional)
 * @returns {Promise<string>} Diff output
 */
export async function diff(repoRoot, filePath) {
    try {
        const result = await spawnCppBinary('myvcs-diff', 
            filePath ? ['status-file', filePath] : ['status'], 
            repoRoot
        );
        return result.stdout;
    } catch (err) {
        // If C++ binary not available, return basic status
        return `Diff engine not available. Build C++ binaries first.\n${err.message}`;
    }
}

/**
 * Format a date timestamp for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Truncate a hash for display
 * @param {string} hash - Full hash string
 * @param {number} length - Desired length (default 7)
 * @returns {string} Truncated hash
 */
export function shortHash(hash, length = 7) {
    return hash ? hash.slice(0, length) : '';
}
