/**
 * MyVCS Staging Module
 * Author: Kevalina
 * 
 * Manages the .myvcs/index file (staging area) and implements
 * the add command logic.
 */

import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'fs';
import { join, relative, dirname, resolve } from 'path';
import { mkdir } from 'fs/promises';
import { spawnCppBinary } from './utils.js';
import { getCurrentBranch, getHeadCommit, updateBranchRef } from './refs.js';

/**
 * Find the repository root by looking for .myvcs directory
 * @param {string} startPath - Starting path
 * @returns {string|null} Repository root or null
 */
export function findRepoRoot(startPath) {
    let current = resolve(startPath);
    
    while (current !== dirname(current)) {
        if (existsSync(join(current, '.myvcs'))) {
            return current;
        }
        current = dirname(current);
    }
    
    return null;
}

/**
 * Initialize a new repository
 * @param {string} path - Path to initialize
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function initRepo(path) {
    try {
        const myvcsDir = join(path, '.myvcs');
        
        if (existsSync(myvcsDir)) {
            return { success: false, error: 'Repository already exists' };
        }

        // Create directory structure
        await mkdir(join(myvcsDir, 'objects'), { recursive: true });
        await mkdir(join(myvcsDir, 'refs', 'heads'), { recursive: true });
        
        // Create HEAD pointing to main branch
        writeFileSync(join(myvcsDir, 'HEAD'), 'ref: refs/heads/main\n');
        
        // Create empty index
        writeFileSync(join(myvcsDir, 'index'), '');
        
        // Create config file
        writeFileSync(join(myvcsDir, 'config'), JSON.stringify({
            core: {
                repositoryformatversion: 0
            }
        }, null, 2));

        return { success: true, path: myvcsDir };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Load the index file
 * @param {string} repoRoot - Repository root path
 * @returns {Map<string, IndexEntry>} Map of path to entry
 */
export function loadIndex(repoRoot) {
    const indexPath = join(repoRoot, '.myvcs', 'index');
    const entries = new Map();
    
    if (!existsSync(indexPath)) {
        return entries;
    }
    
    const content = readFileSync(indexPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        const parts = line.split(' ');
        if (parts.length >= 5) {
            const mode = parseInt(parts[0]);
            const hash = parts[1];
            const mtime = parseInt(parts[2]);
            const size = parseInt(parts[3]);
            const path = parts.slice(4).join(' ');
            
            entries.set(path, { mode, hash, mtime, size, path });
        }
    }
    
    return entries;
}

/**
 * Save the index file
 * @param {string} repoRoot - Repository root path
 * @param {Map<string, IndexEntry>} entries - Index entries
 */
export function saveIndex(repoRoot, entries) {
    const indexPath = join(repoRoot, '.myvcs', 'index');
    
    const lines = [];
    for (const [path, entry] of entries) {
        lines.push(`${entry.mode} ${entry.hash} ${entry.mtime} ${entry.size} ${entry.path}`);
    }
    
    // Sort by path
    lines.sort();
    
    writeFileSync(indexPath, lines.join('\n') + (lines.length > 0 ? '\n' : ''));
}

/**
 * Add a file to the index
 * @param {string} repoRoot - Repository root path
 * @param {string} filePath - File path to add (relative or absolute)
 * @returns {Promise<{success: boolean, hash?: string, error?: string}>}
 */
export async function add(repoRoot, filePath) {
    try {
        const absolutePath = resolve(process.cwd(), filePath);
        const relativePath = relative(repoRoot, absolutePath);
        
        // Check if path is within repo
        if (relativePath.startsWith('..')) {
            return { success: false, error: 'Path is outside repository' };
        }
        
        // Skip .myvcs directory
        if (relativePath.startsWith('.myvcs')) {
            return { success: false, error: 'Cannot add .myvcs directory' };
        }
        
        if (!existsSync(absolutePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }
        
        const stat = statSync(absolutePath);
        
        if (stat.isDirectory()) {
            // Recursively add all files in directory
            return await addDirectory(repoRoot, absolutePath);
        }
        
        // Hash and store the file using C++ binary
        let hash;
        try {
            const result = await spawnCppBinary('myvcs-storage', ['hash-object', absolutePath], repoRoot);
            hash = result.stdout.trim();
        } catch (err) {
            // Fallback: compute hash in JS if C++ binary not available
            hash = await computeHashJS(absolutePath);
        }
        
        // Update index
        const entries = loadIndex(repoRoot);
        entries.set(relativePath, {
            mode: stat.mode & 0o100 ? 100755 : 100644,
            hash,
            mtime: Math.floor(stat.mtimeMs / 1000),
            size: stat.size,
            path: relativePath
        });
        
        saveIndex(repoRoot, entries);
        
        return { success: true, hash };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Recursively add a directory
 * @param {string} repoRoot - Repository root path
 * @param {string} dirPath - Directory path
 */
async function addDirectory(repoRoot, dirPath) {
    const files = getAllFiles(dirPath);
    let added = 0;
    
    for (const file of files) {
        const relativePath = relative(repoRoot, file);
        if (!relativePath.startsWith('.myvcs')) {
            const result = await add(repoRoot, file);
            if (result.success) added++;
        }
    }
    
    return { success: true, filesAdded: added };
}

/**
 * Get all files in a directory recursively
 * @param {string} dirPath - Directory path
 * @returns {string[]} Array of file paths
 */
function getAllFiles(dirPath) {
    const files = [];
    
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            if (entry.name !== '.myvcs' && entry.name !== 'node_modules' && entry.name !== '.git') {
                files.push(...getAllFiles(fullPath));
            }
        } else {
            files.push(fullPath);
        }
    }
    
    return files;
}

/**
 * Compute file hash in JavaScript (fallback if C++ not available)
 * @param {string} filePath - File path
 * @returns {Promise<string>} SHA-1 hash
 */
async function computeHashJS(filePath) {
    const crypto = await import('crypto');
    const content = readFileSync(filePath);
    
    // Create blob header
    const header = `blob ${content.length}\0`;
    const fullContent = Buffer.concat([Buffer.from(header), content]);
    
    return crypto.createHash('sha1').update(fullContent).digest('hex');
}

/**
 * Load the last commit's tree to compare against
 * @param {string} repoRoot - Repository root path
 * @returns {Map<string, string>} Map of path to hash from last commit
 */
function loadCommittedFiles(repoRoot) {
    const committed = new Map();
    const headCommit = getHeadCommit(repoRoot);
    
    if (!headCommit) {
        return committed;
    }
    
    // Read the commit's tree from .myvcs/commits/<hash>
    const commitFile = join(repoRoot, '.myvcs', 'commits', headCommit);
    if (!existsSync(commitFile)) {
        return committed;
    }
    
    try {
        const commitData = JSON.parse(readFileSync(commitFile, 'utf-8'));
        if (commitData.files) {
            for (const [path, hash] of Object.entries(commitData.files)) {
                committed.set(path, hash);
            }
        }
    } catch {
        // Ignore parse errors
    }
    
    return committed;
}

/**
 * Get working tree status
 * @param {string} repoRoot - Repository root path
 * @returns {Promise<{staged: Array, modified: Array, deleted: Array, untracked: Array}>}
 */
export async function status(repoRoot) {
    const index = loadIndex(repoRoot);
    const committed = loadCommittedFiles(repoRoot);
    const workingFiles = new Set(getAllFiles(repoRoot).map(f => relative(repoRoot, f)));
    
    const result = {
        staged: [],      // Files in index that differ from last commit
        modified: [],    // Modified since staged
        deleted: [],     // Deleted from working dir
        untracked: []    // Not in index
    };
    
    // Check indexed files
    for (const [path, entry] of index) {
        const absolutePath = join(repoRoot, path);
        
        if (!existsSync(absolutePath)) {
            result.deleted.push(path);
        } else {
            // Check if modified since staged
            let currentHash;
            try {
                currentHash = await computeHashJS(absolutePath);
            } catch {
                continue;
            }
            
            if (currentHash !== entry.hash) {
                // File modified since it was staged
                result.modified.push(path);
            } else {
                // Check if this file differs from last commit (i.e., is staged for commit)
                const committedHash = committed.get(path);
                if (committedHash !== entry.hash) {
                    // File is staged (new or modified vs last commit)
                    result.staged.push({ path, status: 'staged' });
                }
                // If hash matches committed, file is unchanged - don't show it
            }
        }
    }
    
    // Check for untracked files
    for (const file of workingFiles) {
        if (!index.has(file) && !file.startsWith('.myvcs')) {
            result.untracked.push(file);
        }
    }
    
    return result;
}

/**
 * Create a commit from the current index
 * @param {string} repoRoot - Repository root path
 * @param {Object} options - Commit options
 * @returns {Promise<{success: boolean, hash?: string, branch?: string, error?: string}>}
 */
export async function commit(repoRoot, options) {
    const { message, author, email } = options;
    
    try {
        const index = loadIndex(repoRoot);
        const committed = loadCommittedFiles(repoRoot);
        
        // Check if there are actually changes to commit
        let hasChanges = false;
        for (const [path, entry] of index) {
            if (committed.get(path) !== entry.hash) {
                hasChanges = true;
                break;
            }
        }
        
        if (index.size === 0) {
            return { success: false, error: 'nothing to commit (create/copy files and use "myvcs add" to track)' };
        }
        
        if (!hasChanges && committed.size > 0) {
            return { success: false, error: 'nothing to commit, working tree clean' };
        }
        
        // Build tree from index
        let treeHash;
        try {
            const result = await spawnCppBinary('myvcs-history', ['write-tree'], repoRoot);
            treeHash = result.stdout.trim();
        } catch (err) {
            // Fallback: build tree in JS
            treeHash = await buildTreeJS(repoRoot, index);
        }
        
        // Get parent commit
        const parentHash = getHeadCommit(repoRoot) || '-';
        
        // Create commit
        let commitHash;
        try {
            const result = await spawnCppBinary('myvcs-history', 
                ['commit', treeHash, parentHash, author, email, message], 
                repoRoot
            );
            commitHash = result.stdout.trim();
        } catch (err) {
            // Fallback: create commit in JS
            commitHash = await createCommitJS(repoRoot, treeHash, parentHash, author, email, message);
        }
        
        // Update branch reference
        const branch = getCurrentBranch(repoRoot);
        updateBranchRef(repoRoot, branch, commitHash);
        
        // Save commit metadata including files for status comparison
        const commitsDir = join(repoRoot, '.myvcs', 'commits');
        if (!existsSync(commitsDir)) {
            await mkdir(commitsDir, { recursive: true });
        }
        
        const filesMap = {};
        for (const [path, entry] of index) {
            filesMap[path] = entry.hash;
        }
        
        writeFileSync(join(commitsDir, commitHash), JSON.stringify({
            tree: treeHash,
            parent: parentHash !== '-' ? parentHash : null,
            author,
            email,
            message,
            timestamp: Math.floor(Date.now() / 1000),
            files: filesMap
        }, null, 2));
        
        return {
            success: true,
            hash: commitHash,
            branch,
            filesChanged: index.size,
            tree: treeHash,
            parent: parentHash !== '-' ? parentHash : null,
            author,
            timestamp: Math.floor(Date.now() / 1000)
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Build tree in JavaScript (fallback)
 */
async function buildTreeJS(repoRoot, index) {
    const crypto = await import('crypto');
    
    // Simple flat tree for now
    let treeContent = '';
    for (const [path, entry] of index) {
        const mode = entry.mode.toString();
        const name = path.split('/').pop();
        const hashBinary = Buffer.from(entry.hash, 'hex');
        treeContent += `${mode} ${name}\0${hashBinary.toString('binary')}`;
    }
    
    const header = `tree ${treeContent.length}\0`;
    const fullContent = header + treeContent;
    
    return crypto.createHash('sha1').update(fullContent, 'binary').digest('hex');
}

/**
 * Create commit in JavaScript (fallback)
 */
async function createCommitJS(repoRoot, treeHash, parentHash, author, email, message) {
    const crypto = await import('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    
    let content = `tree ${treeHash}\n`;
    if (parentHash && parentHash !== '-') {
        content += `parent ${parentHash}\n`;
    }
    content += `author ${author} <${email}> ${timestamp}\n`;
    content += `committer ${author} <${email}> ${timestamp}\n`;
    content += `\n${message}`;
    
    const header = `commit ${content.length}\0`;
    const fullContent = header + content;
    
    return crypto.createHash('sha1').update(fullContent).digest('hex');
}
