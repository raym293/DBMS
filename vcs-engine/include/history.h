#ifndef MYVCS_HISTORY_H
#define MYVCS_HISTORY_H

#include "storage.h"
#include <string>
#include <vector>
#include <filesystem>
#include <ctime>
#include <map>

namespace myvcs {

// Tree entry modes (similar to Git)
enum class TreeEntryMode {
    REGULAR_FILE = 100644,
    EXECUTABLE = 100755,
    DIRECTORY = 40000,
    SYMLINK = 120000
};

// Represents an entry in a tree (file or subdirectory)
struct TreeEntry {
    TreeEntryMode mode;
    std::string name;
    std::string hash;  // SHA-1 hash of the blob or tree
    
    // Serialize to tree format: "mode name\0hash"
    std::string serialize() const;
    
    // Parse from serialized format
    static TreeEntry parse(const std::string& data, size_t& offset);
};

// Represents a tree object (directory structure)
struct Tree {
    std::vector<TreeEntry> entries;
    
    // Serialize all entries
    std::string serialize() const;
    
    // Parse from serialized content
    static Tree parse(const std::string& content);
    
    // Add entry (maintains sorted order)
    void addEntry(const TreeEntry& entry);
};

// Commit metadata
struct CommitData {
    std::string tree_hash;       // SHA-1 of the root tree
    std::string parent_hash;     // SHA-1 of parent commit (empty for initial)
    std::string author_id;       // Author identifier
    std::string author_email;    // Author email
    std::string committer_id;    // Committer identifier
    std::string committer_email; // Committer email
    std::time_t timestamp;       // Unix timestamp
    std::string message;         // Commit message
    
    // Serialize to commit format
    std::string serialize() const;
    
    // Parse from serialized content
    static CommitData parse(const std::string& content);
};

// Index entry for staging
struct IndexEntry {
    std::string path;     // Relative file path
    std::string hash;     // SHA-1 of the blob
    TreeEntryMode mode;   // File mode
    std::time_t mtime;    // Last modified time
    size_t size;          // File size
    
    std::string serialize() const;
    static IndexEntry parse(const std::string& line);
};

// History manager class
class History {
public:
    explicit History(Storage& storage);
    
    // Build a tree from the current index
    // Returns the tree hash
    std::string buildTreeFromIndex(const std::vector<IndexEntry>& index);
    
    // Create a commit
    StorageResult createCommit(
        const std::string& treeHash,
        const std::string& parentHash,
        const std::string& authorId,
        const std::string& authorEmail,
        const std::string& message
    );
    
    // Get commit data
    CommitData getCommit(const std::string& hash);
    
    // Get tree data
    Tree getTree(const std::string& hash);
    
    // Walk the commit history
    std::vector<CommitData> getCommitHistory(const std::string& startHash, int limit = -1);
    
    // Flatten a tree to list all files with their paths
    std::map<std::string, std::string> flattenTree(const std::string& treeHash, const std::string& prefix = "");

private:
    Storage& storage_;
    
    // Recursively build trees for directories
    std::string buildTreeRecursive(
        const std::vector<IndexEntry>& entries,
        size_t& idx,
        const std::string& currentDir
    );
};

// Index file manager
class Index {
public:
    explicit Index(const std::filesystem::path& repoRoot);
    
    // Load index from file
    bool load();
    
    // Save index to file
    bool save();
    
    // Add or update an entry
    void update(const IndexEntry& entry);
    
    // Remove an entry by path
    bool remove(const std::string& path);
    
    // Get entry by path
    const IndexEntry* get(const std::string& path) const;
    
    // Get all entries
    const std::vector<IndexEntry>& entries() const { return entries_; }
    
    // Clear all entries
    void clear() { entries_.clear(); }

private:
    std::filesystem::path indexPath_;
    std::vector<IndexEntry> entries_;
};

} // namespace myvcs

#endif // MYVCS_HISTORY_H
