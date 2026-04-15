/**
 * MyVCS References Module
 * Author: Anoushka
 * 
 * Handles local pointers in .myvcs/refs/heads/, implements the log command
 * to traverse the commit chain, and manages branch operations.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { mkdir } from 'fs/promises';
import { spawnCppBinary } from './utils.js';

/**
 * Get the current branch name from HEAD
 * @param {string} repoRoot - Repository root path
 * @returns {string} Current branch name
 */
export function getCurrentBranch(repoRoot) {
    const headPath = join(repoRoot, '.myvcs', 'HEAD');
    
    if (!existsSync(headPath)) {
        return 'main';
    }
    
    const content = readFileSync(headPath, 'utf-8').trim();
    
    // Check if HEAD is a symbolic ref (ref: refs/heads/branch)
    if (content.startsWith('ref: ')) {
        const refPath = content.slice(5);
        return refPath.split('/').pop();
    }
    
    // Detached HEAD state (direct commit hash)
    return content.slice(0, 7); // Short hash
}

/**
 * Get the commit hash that HEAD points to
 * @param {string} repoRoot - Repository root path
 * @returns {string|null} Commit hash or null
 */
export function getHeadCommit(repoRoot) {
    const headPath = join(repoRoot, '.myvcs', 'HEAD');
    
    if (!existsSync(headPath)) {
        return null;
    }
    
    const content = readFileSync(headPath, 'utf-8').trim();
    
    if (content.startsWith('ref: ')) {
        // Follow symbolic ref
        const refPath = content.slice(5);
        const fullRefPath = join(repoRoot, '.myvcs', refPath);
        
        if (existsSync(fullRefPath)) {
            return readFileSync(fullRefPath, 'utf-8').trim();
        }
        return null;
    }
    
    // Direct commit hash
    return content;
}

/**
 * Update a branch reference to point to a commit
 * @param {string} repoRoot - Repository root path
 * @param {string} branchName - Branch name
 * @param {string} commitHash - Commit hash
 */
export function updateBranchRef(repoRoot, branchName, commitHash) {
    const refPath = join(repoRoot, '.myvcs', 'refs', 'heads', branchName);
    const refDir = dirname(refPath);
    
    if (!existsSync(refDir)) {
        mkdirSync(refDir, { recursive: true });
    }
    
    writeFileSync(refPath, commitHash + '\n');
}

/**
 * Get the commit hash for a reference (branch name or commit hash)
 * @param {string} repoRoot - Repository root path
 * @param {string} ref - Branch name or commit hash
 * @returns {string|null} Commit hash or null
 */
export function resolveRef(repoRoot, ref) {
    // Check if it's a branch name
    const branchPath = join(repoRoot, '.myvcs', 'refs', 'heads', ref);
    if (existsSync(branchPath)) {
        return readFileSync(branchPath, 'utf-8').trim();
    }
    
    // Assume it's a commit hash
    return ref;
}

/**
 * Get commit history starting from a ref
 * @param {string} repoRoot - Repository root path
 * @param {number} limit - Maximum number of commits to return
 * @returns {Promise<Array>} Array of commit objects
 */
export async function log(repoRoot, limit = 10) {
    const headCommit = getHeadCommit(repoRoot);
    
    if (!headCommit) {
        return [];
    }
    
    const commits = [];
    let currentHash = headCommit;
    
    while (currentHash && commits.length < limit) {
        try {
            const commit = await getCommit(repoRoot, currentHash);
            if (!commit) break;
            
            commits.push({
                hash: currentHash,
                ...commit
            });
            
            currentHash = commit.parent;
        } catch (err) {
            break;
        }
    }
    
    return commits;
}

/**
 * Get commit data by hash
 * @param {string} repoRoot - Repository root path
 * @param {string} hash - Commit hash
 * @returns {Promise<Object|null>} Commit data or null
 */
async function getCommit(repoRoot, hash) {
    try {
        const result = await spawnCppBinary('myvcs-storage', ['cat-file', hash], repoRoot);
        return parseCommit(result.stdout);
    } catch (err) {
        // Try to read from objects directory directly
        return readCommitDirect(repoRoot, hash);
    }
}

/**
 * Parse commit content
 * @param {string} content - Raw commit content
 * @returns {Object} Parsed commit
 */
function parseCommit(content) {
    const lines = content.split('\n');
    const commit = {
        tree: null,
        parent: null,
        author: null,
        email: null,
        timestamp: null,
        message: ''
    };
    
    let inMessage = false;
    
    for (const line of lines) {
        if (inMessage) {
            commit.message += (commit.message ? '\n' : '') + line;
            continue;
        }
        
        if (line === '') {
            inMessage = true;
            continue;
        }
        
        if (line.startsWith('tree ')) {
            commit.tree = line.slice(5);
        } else if (line.startsWith('parent ')) {
            commit.parent = line.slice(7);
        } else if (line.startsWith('author ')) {
            const authorLine = line.slice(7);
            const match = authorLine.match(/^(.+?) <(.+?)> (\d+)/);
            if (match) {
                commit.author = match[1];
                commit.email = match[2];
                commit.timestamp = parseInt(match[3]);
            }
        }
    }
    
    return commit;
}

/**
 * Read commit directly from objects (fallback)
 */
function readCommitDirect(repoRoot, hash) {
    const objectPath = join(repoRoot, '.myvcs', 'objects', hash.slice(0, 2), hash.slice(2));
    
    if (!existsSync(objectPath)) {
        return null;
    }
    
    // Would need zlib decompression here - skip for now
    return null;
}

/**
 * Branch operations
 */
export const branch = {
    /**
     * List all branches
     * @param {string} repoRoot - Repository root path
     * @returns {string[]} Array of branch names
     */
    list(repoRoot) {
        const headsDir = join(repoRoot, '.myvcs', 'refs', 'heads');
        
        if (!existsSync(headsDir)) {
            return ['main'];
        }
        
        const branches = readdirSync(headsDir).filter(f => {
            const fullPath = join(headsDir, f);
            return existsSync(fullPath) && !statSync(fullPath).isDirectory();
        });
        
        if (branches.length === 0) {
            return ['main'];
        }
        
        return branches.sort();
    },
    
    /**
     * Create a new branch
     * @param {string} repoRoot - Repository root path
     * @param {string} name - Branch name
     * @returns {{success: boolean, error?: string}}
     */
    create(repoRoot, name) {
        const refPath = join(repoRoot, '.myvcs', 'refs', 'heads', name);
        
        if (existsSync(refPath)) {
            return { success: false, error: `Branch '${name}' already exists` };
        }
        
        const currentCommit = getHeadCommit(repoRoot);
        
        if (!currentCommit) {
            // No commits yet, just create empty ref
            writeFileSync(refPath, '');
            return { success: true };
        }
        
        writeFileSync(refPath, currentCommit + '\n');
        return { success: true };
    },
    
    /**
     * Delete a branch
     * @param {string} repoRoot - Repository root path
     * @param {string} name - Branch name
     * @returns {{success: boolean, error?: string}}
     */
    delete(repoRoot, name) {
        const currentBranch = getCurrentBranch(repoRoot);
        
        if (name === currentBranch) {
            return { success: false, error: 'Cannot delete the branch you are currently on' };
        }
        
        const refPath = join(repoRoot, '.myvcs', 'refs', 'heads', name);
        
        if (!existsSync(refPath)) {
            return { success: false, error: `Branch '${name}' not found` };
        }
        
        unlinkSync(refPath);
        return { success: true };
    }
};

/**
 * Checkout a branch or commit
 * @param {string} repoRoot - Repository root path
 * @param {string} ref - Branch name or commit hash
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function checkout(repoRoot, ref) {
    try {
        const headPath = join(repoRoot, '.myvcs', 'HEAD');
        const branchPath = join(repoRoot, '.myvcs', 'refs', 'heads', ref);
        
        if (existsSync(branchPath)) {
            // Checkout branch
            writeFileSync(headPath, `ref: refs/heads/${ref}\n`);
            
            // TODO: Restore working directory from tree
            // This would require reading the tree and extracting blobs
            
            return { success: true };
        }
        
        // Check if it's a commit hash
        const objectDir = join(repoRoot, '.myvcs', 'objects', ref.slice(0, 2));
        if (existsSync(objectDir)) {
            // Detached HEAD
            writeFileSync(headPath, ref + '\n');
            return { success: true };
        }
        
        return { success: false, error: `pathspec '${ref}' did not match any branch or commit` };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Sync branch data to Supabase
 * @param {string} repoRoot - Repository root path
 * @param {string} branchName - Branch name
 * @param {Object} supabaseClient - Supabase client instance
 */
export async function syncBranchToSupabase(repoRoot, branchName, supabaseClient) {
    const commitHash = resolveRef(repoRoot, branchName);
    
    if (!commitHash) {
        return { success: false, error: 'Branch has no commits' };
    }
    
    try {
        const { error } = await supabaseClient
            .from('branches')
            .upsert({
                ref_name: branchName,
                commit_hash: commitHash,
                updated_at: new Date().toISOString()
            }, { onConflict: 'ref_name' });
        
        if (error) throw error;
        
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
