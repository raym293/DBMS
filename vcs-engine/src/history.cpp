/**
 * MyVCS History Module
 * Author: Raymond
 * 
 * Implements Merkle tree construction from index, commit creation,
 * and history chain traversal.
 */

#include "history.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iomanip>
#include <cstring>

namespace myvcs {

// ============================================================================
// TreeEntry Implementation
// ============================================================================

std::string TreeEntry::serialize() const {
    std::ostringstream ss;
    ss << static_cast<int>(mode) << ' ' << name << '\0';
    
    // Convert hash from hex to binary (20 bytes)
    for (size_t i = 0; i < 40; i += 2) {
        unsigned int byte;
        std::istringstream(hash.substr(i, 2)) >> std::hex >> byte;
        ss << static_cast<char>(byte);
    }
    
    return ss.str();
}

TreeEntry TreeEntry::parse(const std::string& data, size_t& offset) {
    TreeEntry entry;
    
    // Parse mode
    size_t spacePos = data.find(' ', offset);
    int mode = std::stoi(data.substr(offset, spacePos - offset));
    entry.mode = static_cast<TreeEntryMode>(mode);
    
    // Parse name (until null byte)
    size_t nameStart = spacePos + 1;
    size_t nullPos = data.find('\0', nameStart);
    entry.name = data.substr(nameStart, nullPos - nameStart);
    
    // Parse hash (20 binary bytes -> 40 hex chars)
    size_t hashStart = nullPos + 1;
    std::ostringstream hexHash;
    for (size_t i = 0; i < 20; ++i) {
        hexHash << std::hex << std::setfill('0') << std::setw(2) 
                << (static_cast<unsigned int>(static_cast<unsigned char>(data[hashStart + i])));
    }
    entry.hash = hexHash.str();
    
    offset = hashStart + 20;
    return entry;
}

// ============================================================================
// Tree Implementation
// ============================================================================

std::string Tree::serialize() const {
    std::string result;
    for (const auto& entry : entries) {
        result += entry.serialize();
    }
    return result;
}

Tree Tree::parse(const std::string& content) {
    Tree tree;
    size_t offset = 0;
    while (offset < content.size()) {
        tree.entries.push_back(TreeEntry::parse(content, offset));
    }
    return tree;
}

void Tree::addEntry(const TreeEntry& entry) {
    // Insert in sorted order by name
    auto it = std::lower_bound(entries.begin(), entries.end(), entry,
        [](const TreeEntry& a, const TreeEntry& b) {
            return a.name < b.name;
        });
    
    // Update if exists, otherwise insert
    if (it != entries.end() && it->name == entry.name) {
        *it = entry;
    } else {
        entries.insert(it, entry);
    }
}

// ============================================================================
// CommitData Implementation
// ============================================================================

std::string CommitData::serialize() const {
    std::ostringstream ss;
    
    ss << "tree " << tree_hash << "\n";
    
    if (!parent_hash.empty()) {
        ss << "parent " << parent_hash << "\n";
    }
    
    ss << "author " << author_id << " <" << author_email << "> " << timestamp << "\n";
    ss << "committer " << committer_id << " <" << committer_email << "> " << timestamp << "\n";
    ss << "\n";
    ss << message;
    
    return ss.str();
}

CommitData CommitData::parse(const std::string& content) {
    CommitData commit;
    std::istringstream ss(content);
    std::string line;
    
    while (std::getline(ss, line) && !line.empty()) {
        if (line.substr(0, 5) == "tree ") {
            commit.tree_hash = line.substr(5);
        } else if (line.substr(0, 7) == "parent ") {
            commit.parent_hash = line.substr(7);
        } else if (line.substr(0, 7) == "author ") {
            // Parse: "author name <email> timestamp"
            std::string authorLine = line.substr(7);
            size_t emailStart = authorLine.find('<');
            size_t emailEnd = authorLine.find('>');
            
            commit.author_id = authorLine.substr(0, emailStart - 1);
            commit.author_email = authorLine.substr(emailStart + 1, emailEnd - emailStart - 1);
            commit.timestamp = std::stol(authorLine.substr(emailEnd + 2));
        } else if (line.substr(0, 10) == "committer ") {
            std::string committerLine = line.substr(10);
            size_t emailStart = committerLine.find('<');
            size_t emailEnd = committerLine.find('>');
            
            commit.committer_id = committerLine.substr(0, emailStart - 1);
            commit.committer_email = committerLine.substr(emailStart + 1, emailEnd - emailStart - 1);
        }
    }
    
    // Rest is the message
    std::ostringstream msgStream;
    while (std::getline(ss, line)) {
        msgStream << line << "\n";
    }
    commit.message = msgStream.str();
    if (!commit.message.empty() && commit.message.back() == '\n') {
        commit.message.pop_back();
    }
    
    return commit;
}

// ============================================================================
// IndexEntry Implementation
// ============================================================================

std::string IndexEntry::serialize() const {
    std::ostringstream ss;
    ss << static_cast<int>(mode) << " " << hash << " " << mtime << " " << size << " " << path;
    return ss.str();
}

IndexEntry IndexEntry::parse(const std::string& line) {
    IndexEntry entry;
    std::istringstream ss(line);
    
    int mode;
    ss >> mode >> entry.hash >> entry.mtime >> entry.size;
    ss.get(); // skip space
    std::getline(ss, entry.path);
    
    entry.mode = static_cast<TreeEntryMode>(mode);
    return entry;
}

// ============================================================================
// History Implementation
// ============================================================================

History::History(Storage& storage) : storage_(storage) {}

std::string History::buildTreeFromIndex(const std::vector<IndexEntry>& index) {
    if (index.empty()) {
        // Empty tree
        Tree emptyTree;
        auto result = storage_.storeTree(emptyTree.serialize());
        return result.hash;
    }
    
    // Sort entries by path for hierarchical processing
    std::vector<IndexEntry> sorted = index;
    std::sort(sorted.begin(), sorted.end(), 
        [](const IndexEntry& a, const IndexEntry& b) {
            return a.path < b.path;
        });
    
    // Build tree recursively from root
    size_t idx = 0;
    return buildTreeRecursive(sorted, idx, "");
}

std::string History::buildTreeRecursive(
    const std::vector<IndexEntry>& entries,
    size_t& idx,
    const std::string& currentDir
) {
    Tree tree;
    
    while (idx < entries.size()) {
        const auto& entry = entries[idx];
        std::string relativePath = entry.path;
        
        // Skip leading "./" if present
        if (relativePath.substr(0, 2) == "./") {
            relativePath = relativePath.substr(2);
        }
        
        // Check if this entry belongs to current directory
        if (!currentDir.empty()) {
            if (relativePath.substr(0, currentDir.length()) != currentDir) {
                break; // Entry is in a different directory
            }
            relativePath = relativePath.substr(currentDir.length());
        }
        
        // Check if entry is in a subdirectory
        size_t slashPos = relativePath.find('/');
        
        if (slashPos == std::string::npos) {
            // File in current directory
            TreeEntry treeEntry;
            treeEntry.mode = entry.mode;
            treeEntry.name = relativePath;
            treeEntry.hash = entry.hash;
            tree.addEntry(treeEntry);
            ++idx;
        } else {
            // Subdirectory
            std::string subdir = relativePath.substr(0, slashPos);
            std::string subdirPath = currentDir + subdir + "/";
            
            // Recursively build subtree
            std::string subtreeHash = buildTreeRecursive(entries, idx, subdirPath);
            
            TreeEntry dirEntry;
            dirEntry.mode = TreeEntryMode::DIRECTORY;
            dirEntry.name = subdir;
            dirEntry.hash = subtreeHash;
            tree.addEntry(dirEntry);
        }
    }
    
    // Store this tree and return its hash
    auto result = storage_.storeTree(tree.serialize());
    return result.hash;
}

StorageResult History::createCommit(
    const std::string& treeHash,
    const std::string& parentHash,
    const std::string& authorId,
    const std::string& authorEmail,
    const std::string& message
) {
    CommitData commit;
    commit.tree_hash = treeHash;
    commit.parent_hash = parentHash;
    commit.author_id = authorId;
    commit.author_email = authorEmail;
    commit.committer_id = authorId;
    commit.committer_email = authorEmail;
    commit.timestamp = std::time(nullptr);
    commit.message = message;
    
    return storage_.storeCommit(commit.serialize());
}

CommitData History::getCommit(const std::string& hash) {
    std::string content = storage_.retrieveObject(hash);
    return CommitData::parse(content);
}

Tree History::getTree(const std::string& hash) {
    std::string content = storage_.retrieveObject(hash);
    return Tree::parse(content);
}

std::vector<CommitData> History::getCommitHistory(const std::string& startHash, int limit) {
    std::vector<CommitData> history;
    std::string currentHash = startHash;
    
    while (!currentHash.empty() && (limit < 0 || static_cast<int>(history.size()) < limit)) {
        try {
            CommitData commit = getCommit(currentHash);
            history.push_back(commit);
            currentHash = commit.parent_hash;
        } catch (const std::exception&) {
            break;
        }
    }
    
    return history;
}

std::map<std::string, std::string> History::flattenTree(const std::string& treeHash, const std::string& prefix) {
    std::map<std::string, std::string> files;
    Tree tree = getTree(treeHash);
    
    for (const auto& entry : tree.entries) {
        std::string path = prefix.empty() ? entry.name : prefix + "/" + entry.name;
        
        if (entry.mode == TreeEntryMode::DIRECTORY) {
            auto subfiles = flattenTree(entry.hash, path);
            files.insert(subfiles.begin(), subfiles.end());
        } else {
            files[path] = entry.hash;
        }
    }
    
    return files;
}

// ============================================================================
// Index Implementation
// ============================================================================

Index::Index(const std::filesystem::path& repoRoot)
    : indexPath_(repoRoot / ".myvcs" / "index") {}

bool Index::load() {
    entries_.clear();
    
    if (!std::filesystem::exists(indexPath_)) {
        return true; // Empty index is valid
    }
    
    std::ifstream file(indexPath_);
    if (!file) {
        return false;
    }
    
    std::string line;
    while (std::getline(file, line)) {
        if (!line.empty()) {
            entries_.push_back(IndexEntry::parse(line));
        }
    }
    
    return true;
}

bool Index::save() {
    std::ofstream file(indexPath_);
    if (!file) {
        return false;
    }
    
    for (const auto& entry : entries_) {
        file << entry.serialize() << "\n";
    }
    
    return file.good();
}

void Index::update(const IndexEntry& entry) {
    // Find existing entry by path
    auto it = std::find_if(entries_.begin(), entries_.end(),
        [&entry](const IndexEntry& e) { return e.path == entry.path; });
    
    if (it != entries_.end()) {
        *it = entry;
    } else {
        entries_.push_back(entry);
        // Keep sorted by path
        std::sort(entries_.begin(), entries_.end(),
            [](const IndexEntry& a, const IndexEntry& b) { return a.path < b.path; });
    }
}

bool Index::remove(const std::string& path) {
    auto it = std::find_if(entries_.begin(), entries_.end(),
        [&path](const IndexEntry& e) { return e.path == path; });
    
    if (it != entries_.end()) {
        entries_.erase(it);
        return true;
    }
    return false;
}

const IndexEntry* Index::get(const std::string& path) const {
    auto it = std::find_if(entries_.begin(), entries_.end(),
        [&path](const IndexEntry& e) { return e.path == path; });
    
    return it != entries_.end() ? &(*it) : nullptr;
}

} // namespace myvcs

// ============================================================================
// CLI Interface
// ============================================================================

void printUsage(const char* progName) {
    std::cout << "MyVCS History Module\n"
              << "Usage: " << progName << " <command> [args]\n\n"
              << "Commands:\n"
              << "  commit <tree_hash> <parent_hash> <author> <email> <message>\n"
              << "      Create a new commit\n"
              << "  cat-commit <hash>\n"
              << "      Print commit details\n"
              << "  cat-tree <hash>\n"
              << "      Print tree entries\n"
              << "  log <commit_hash> [limit]\n"
              << "      Show commit history\n"
              << "  write-tree\n"
              << "      Build tree from index and print hash\n"
              << std::endl;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printUsage(argv[0]);
        return 1;
    }
    
    std::string command = argv[1];
    std::filesystem::path cwd = std::filesystem::current_path();
    myvcs::Storage storage(cwd);
    myvcs::History history(storage);
    
    try {
        if (command == "commit") {
            if (argc < 7) {
                std::cerr << "Usage: " << argv[0] 
                          << " commit <tree_hash> <parent_hash> <author> <email> <message>" << std::endl;
                return 1;
            }
            
            std::string treeHash = argv[2];
            std::string parentHash = argv[3];
            if (parentHash == "-" || parentHash == "null") parentHash = "";
            std::string author = argv[4];
            std::string email = argv[5];
            std::string message = argv[6];
            
            auto result = history.createCommit(treeHash, parentHash, author, email, message);
            if (result.success) {
                std::cout << result.hash << std::endl;
                return 0;
            } else {
                std::cerr << "Error: " << result.error << std::endl;
                return 1;
            }
        }
        else if (command == "cat-commit") {
            if (argc < 3) {
                std::cerr << "Usage: " << argv[0] << " cat-commit <hash>" << std::endl;
                return 1;
            }
            
            auto commit = history.getCommit(argv[2]);
            std::cout << "tree " << commit.tree_hash << "\n";
            if (!commit.parent_hash.empty()) {
                std::cout << "parent " << commit.parent_hash << "\n";
            }
            std::cout << "author " << commit.author_id << " <" << commit.author_email << ">\n";
            std::cout << "date " << commit.timestamp << "\n\n";
            std::cout << commit.message << std::endl;
            return 0;
        }
        else if (command == "cat-tree") {
            if (argc < 3) {
                std::cerr << "Usage: " << argv[0] << " cat-tree <hash>" << std::endl;
                return 1;
            }
            
            auto tree = history.getTree(argv[2]);
            for (const auto& entry : tree.entries) {
                std::cout << std::setfill('0') << std::setw(6) << static_cast<int>(entry.mode)
                          << " " << (entry.mode == myvcs::TreeEntryMode::DIRECTORY ? "tree" : "blob")
                          << " " << entry.hash
                          << " " << entry.name << "\n";
            }
            return 0;
        }
        else if (command == "log") {
            if (argc < 3) {
                std::cerr << "Usage: " << argv[0] << " log <commit_hash> [limit]" << std::endl;
                return 1;
            }
            
            int limit = argc > 3 ? std::stoi(argv[3]) : -1;
            auto commits = history.getCommitHistory(argv[2], limit);
            
            for (const auto& commit : commits) {
                std::cout << "commit " << commit.tree_hash << "\n";
                std::cout << "Author: " << commit.author_id << " <" << commit.author_email << ">\n";
                std::cout << "Date:   " << std::ctime(&commit.timestamp);
                std::cout << "\n    " << commit.message << "\n\n";
            }
            return 0;
        }
        else if (command == "write-tree") {
            myvcs::Index index(cwd);
            if (!index.load()) {
                std::cerr << "Error: Failed to load index" << std::endl;
                return 1;
            }
            
            std::string treeHash = history.buildTreeFromIndex(index.entries());
            std::cout << treeHash << std::endl;
            return 0;
        }
        else {
            std::cerr << "Unknown command: " << command << std::endl;
            printUsage(argv[0]);
            return 1;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
