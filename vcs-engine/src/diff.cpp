/**
 * MyVCS Diff & Status Module
 * Author: Shlok
 * 
 * Implements line-by-line diff algorithm (LCS-based) and file status
 * comparison for working directory vs index/tree.
 */

#include "diff.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <set>
#include <map>
#include <iomanip>
#include <openssl/sha.h>

namespace myvcs {

// ============================================================================
// Diff Implementation
// ============================================================================

std::vector<std::string> Diff::splitLines(const std::string& content) {
    std::vector<std::string> lines;
    std::istringstream stream(content);
    std::string line;
    
    while (std::getline(stream, line)) {
        lines.push_back(line);
    }
    
    return lines;
}

bool Diff::isBinary(const std::string& content) {
    // Check for null bytes in first 8000 chars (heuristic)
    size_t checkLen = std::min(content.size(), static_cast<size_t>(8000));
    for (size_t i = 0; i < checkLen; ++i) {
        if (content[i] == '\0') {
            return true;
        }
    }
    return false;
}

std::vector<std::pair<int, int>> Diff::computeLCS(
    const std::vector<std::string>& oldLines,
    const std::vector<std::string>& newLines
) {
    int m = oldLines.size();
    int n = newLines.size();
    
    // DP table for LCS lengths
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));
    
    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (oldLines[i-1] == newLines[j-1]) {
                dp[i][j] = dp[i-1][j-1] + 1;
            } else {
                dp[i][j] = std::max(dp[i-1][j], dp[i][j-1]);
            }
        }
    }
    
    // Backtrack to find actual LCS
    std::vector<std::pair<int, int>> lcs;
    int i = m, j = n;
    
    while (i > 0 && j > 0) {
        if (oldLines[i-1] == newLines[j-1]) {
            lcs.push_back({i-1, j-1});
            --i; --j;
        } else if (dp[i-1][j] > dp[i][j-1]) {
            --i;
        } else {
            --j;
        }
    }
    
    std::reverse(lcs.begin(), lcs.end());
    return lcs;
}

std::vector<DiffLine> Diff::buildDiff(
    const std::vector<std::string>& oldLines,
    const std::vector<std::string>& newLines,
    const std::vector<std::pair<int, int>>& lcs
) {
    std::vector<DiffLine> diff;
    
    int oldIdx = 0;
    int newIdx = 0;
    
    for (const auto& [lcsOld, lcsNew] : lcs) {
        // Add deleted lines (in old but not matched)
        while (oldIdx < lcsOld) {
            diff.push_back({
                ChangeType::DELETED,
                oldIdx + 1,
                -1,
                oldLines[oldIdx]
            });
            ++oldIdx;
        }
        
        // Add added lines (in new but not matched)
        while (newIdx < lcsNew) {
            diff.push_back({
                ChangeType::ADDED,
                -1,
                newIdx + 1,
                newLines[newIdx]
            });
            ++newIdx;
        }
        
        // Add unchanged line
        diff.push_back({
            ChangeType::UNCHANGED,
            oldIdx + 1,
            newIdx + 1,
            oldLines[oldIdx]
        });
        ++oldIdx;
        ++newIdx;
    }
    
    // Remaining deleted lines
    while (oldIdx < static_cast<int>(oldLines.size())) {
        diff.push_back({
            ChangeType::DELETED,
            oldIdx + 1,
            -1,
            oldLines[oldIdx]
        });
        ++oldIdx;
    }
    
    // Remaining added lines
    while (newIdx < static_cast<int>(newLines.size())) {
        diff.push_back({
            ChangeType::ADDED,
            -1,
            newIdx + 1,
            newLines[newIdx]
        });
        ++newIdx;
    }
    
    return diff;
}

std::vector<DiffHunk> Diff::createHunks(
    const std::vector<DiffLine>& lines,
    int context
) {
    std::vector<DiffHunk> hunks;
    
    if (lines.empty()) {
        return hunks;
    }
    
    // Find ranges of changes
    std::vector<std::pair<int, int>> changeRanges;
    int start = -1;
    
    for (size_t i = 0; i < lines.size(); ++i) {
        if (lines[i].type != ChangeType::UNCHANGED) {
            if (start == -1) {
                start = i;
            }
        } else {
            if (start != -1) {
                changeRanges.push_back({start, static_cast<int>(i) - 1});
                start = -1;
            }
        }
    }
    
    if (start != -1) {
        changeRanges.push_back({start, static_cast<int>(lines.size()) - 1});
    }
    
    // Merge nearby ranges and create hunks
    for (const auto& [rangeStart, rangeEnd] : changeRanges) {
        int hunkStart = std::max(0, rangeStart - context);
        int hunkEnd = std::min(static_cast<int>(lines.size()) - 1, rangeEnd + context);
        
        // Check if we can merge with previous hunk
        if (!hunks.empty()) {
            DiffHunk& prev = hunks.back();
            int prevEnd = 0;
            for (const auto& line : prev.lines) {
                if (line.oldLineNum > 0) prevEnd = line.oldLineNum;
            }
            
            if (hunkStart <= prevEnd + context) {
                // Merge: extend previous hunk
                for (int i = prev.lines.size(); i <= hunkEnd; ++i) {
                    if (i < static_cast<int>(lines.size())) {
                        prev.lines.push_back(lines[i]);
                    }
                }
                continue;
            }
        }
        
        // Create new hunk
        DiffHunk hunk;
        hunk.oldStart = lines[hunkStart].oldLineNum > 0 ? lines[hunkStart].oldLineNum : 1;
        hunk.newStart = lines[hunkStart].newLineNum > 0 ? lines[hunkStart].newLineNum : 1;
        hunk.oldCount = 0;
        hunk.newCount = 0;
        
        for (int i = hunkStart; i <= hunkEnd; ++i) {
            hunk.lines.push_back(lines[i]);
            
            if (lines[i].type != ChangeType::ADDED) {
                hunk.oldCount++;
            }
            if (lines[i].type != ChangeType::DELETED) {
                hunk.newCount++;
            }
        }
        
        hunks.push_back(hunk);
    }
    
    return hunks;
}

DiffResult Diff::compare(
    const std::string& oldContent,
    const std::string& newContent,
    const std::string& oldPath,
    const std::string& newPath
) {
    DiffResult result;
    result.oldPath = oldPath;
    result.newPath = newPath;
    result.isBinary = isBinary(oldContent) || isBinary(newContent);
    
    if (result.isBinary) {
        return result;
    }
    
    auto oldLines = splitLines(oldContent);
    auto newLines = splitLines(newContent);
    
    auto lcs = computeLCS(oldLines, newLines);
    auto diffLines = buildDiff(oldLines, newLines, lcs);
    result.hunks = createHunks(diffLines);
    
    return result;
}

DiffResult Diff::compareFiles(
    const std::filesystem::path& oldFile,
    const std::filesystem::path& newFile
) {
    std::string oldContent, newContent;
    
    if (std::filesystem::exists(oldFile)) {
        std::ifstream ifs(oldFile);
        std::ostringstream ss;
        ss << ifs.rdbuf();
        oldContent = ss.str();
    }
    
    if (std::filesystem::exists(newFile)) {
        std::ifstream ifs(newFile);
        std::ostringstream ss;
        ss << ifs.rdbuf();
        newContent = ss.str();
    }
    
    return compare(oldContent, newContent, oldFile.string(), newFile.string());
}

std::string Diff::formatUnified(const DiffResult& diff, int context) {
    std::ostringstream out;
    
    out << "--- " << diff.oldPath << "\n";
    out << "+++ " << diff.newPath << "\n";
    
    if (diff.isBinary) {
        out << "Binary files differ\n";
        return out.str();
    }
    
    for (const auto& hunk : diff.hunks) {
        out << "@@ -" << hunk.oldStart << "," << hunk.oldCount
            << " +" << hunk.newStart << "," << hunk.newCount << " @@\n";
        
        for (const auto& line : hunk.lines) {
            switch (line.type) {
                case ChangeType::UNCHANGED:
                    out << " " << line.content << "\n";
                    break;
                case ChangeType::ADDED:
                    out << "+" << line.content << "\n";
                    break;
                case ChangeType::DELETED:
                    out << "-" << line.content << "\n";
                    break;
            }
        }
    }
    
    return out.str();
}

// ============================================================================
// Status Implementation
// ============================================================================

Status::Status(const std::filesystem::path& repoRoot)
    : repoRoot_(repoRoot)
    , myvcsDir_(repoRoot / ".myvcs")
{}

std::vector<std::pair<std::string, std::string>> Status::loadIndex() {
    std::vector<std::pair<std::string, std::string>> entries;
    std::filesystem::path indexPath = myvcsDir_ / "index";
    
    if (!std::filesystem::exists(indexPath)) {
        return entries;
    }
    
    std::ifstream file(indexPath);
    std::string line;
    
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        
        // Parse: "mode hash mtime size path"
        std::istringstream ss(line);
        int mode;
        std::string hash;
        long mtime;
        size_t size;
        std::string path;
        
        ss >> mode >> hash >> mtime >> size;
        ss.get(); // skip space
        std::getline(ss, path);
        
        entries.push_back({path, hash});
    }
    
    return entries;
}

std::vector<std::string> Status::getWorkingFiles() {
    std::vector<std::string> files;
    
    for (const auto& entry : std::filesystem::recursive_directory_iterator(repoRoot_)) {
        if (!entry.is_regular_file()) continue;
        
        std::string path = std::filesystem::relative(entry.path(), repoRoot_).string();
        
        // Skip .myvcs directory
        if (path.substr(0, 6) == ".myvcs" || path.find("/.myvcs") != std::string::npos) {
            continue;
        }
        
        files.push_back(path);
    }
    
    std::sort(files.begin(), files.end());
    return files;
}

std::string Status::computeHash(const std::filesystem::path& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) {
        return "";
    }
    
    std::ostringstream ss;
    ss << file.rdbuf();
    std::string content = ss.str();
    
    // Create blob header
    std::string header = "blob " + std::to_string(content.size()) + '\0';
    std::string fullObject = header + content;
    
    unsigned char hash[SHA_DIGEST_LENGTH];
    SHA1(reinterpret_cast<const unsigned char*>(fullObject.c_str()), 
         fullObject.length(), hash);
    
    // Convert to hex
    std::ostringstream hexStream;
    for (int i = 0; i < SHA_DIGEST_LENGTH; ++i) {
        hexStream << std::hex << std::setfill('0') << std::setw(2) 
                  << static_cast<int>(hash[i]);
    }
    
    return hexStream.str();
}

std::vector<FileStatusEntry> Status::getStatus() {
    std::vector<FileStatusEntry> result;
    
    auto indexEntries = loadIndex();
    auto workingFiles = getWorkingFiles();
    
    std::set<std::string> indexPaths;
    std::map<std::string, std::string> indexHashes;
    
    for (const auto& [path, hash] : indexEntries) {
        indexPaths.insert(path);
        indexHashes[path] = hash;
    }
    
    std::set<std::string> workingPaths(workingFiles.begin(), workingFiles.end());
    
    // Check all indexed files
    for (const auto& [path, hash] : indexEntries) {
        FileStatusEntry entry;
        entry.path = path;
        entry.indexStatus = FileStatus::UNCHANGED;
        
        if (workingPaths.find(path) == workingPaths.end()) {
            // File deleted from working directory
            entry.workingStatus = FileStatus::DELETED;
        } else {
            // Check if modified
            std::string currentHash = computeHash(repoRoot_ / path);
            if (currentHash != hash) {
                entry.workingStatus = FileStatus::MODIFIED;
            } else {
                entry.workingStatus = FileStatus::UNCHANGED;
            }
        }
        
        result.push_back(entry);
    }
    
    // Check for untracked files
    for (const auto& path : workingFiles) {
        if (indexPaths.find(path) == indexPaths.end()) {
            FileStatusEntry entry;
            entry.path = path;
            entry.indexStatus = FileStatus::UNCHANGED;
            entry.workingStatus = FileStatus::UNTRACKED;
            result.push_back(entry);
        }
    }
    
    // Sort by path
    std::sort(result.begin(), result.end(),
        [](const FileStatusEntry& a, const FileStatusEntry& b) {
            return a.path < b.path;
        });
    
    return result;
}

FileStatusEntry Status::getFileStatus(const std::string& path) {
    auto all = getStatus();
    
    for (const auto& entry : all) {
        if (entry.path == path) {
            return entry;
        }
    }
    
    // Not found - untracked
    FileStatusEntry entry;
    entry.path = path;
    entry.indexStatus = FileStatus::UNCHANGED;
    entry.workingStatus = FileStatus::UNTRACKED;
    return entry;
}

std::vector<std::string> Status::getUntrackedFiles() {
    std::vector<std::string> result;
    for (const auto& entry : getStatus()) {
        if (entry.workingStatus == FileStatus::UNTRACKED) {
            result.push_back(entry.path);
        }
    }
    return result;
}

std::vector<std::string> Status::getModifiedFiles() {
    std::vector<std::string> result;
    for (const auto& entry : getStatus()) {
        if (entry.workingStatus == FileStatus::MODIFIED) {
            result.push_back(entry.path);
        }
    }
    return result;
}

std::vector<std::string> Status::getDeletedFiles() {
    std::vector<std::string> result;
    for (const auto& entry : getStatus()) {
        if (entry.workingStatus == FileStatus::DELETED) {
            result.push_back(entry.path);
        }
    }
    return result;
}

std::vector<std::string> Status::getStagedFiles() {
    std::vector<std::string> result;
    for (const auto& entry : getStatus()) {
        if (entry.indexStatus == FileStatus::STAGED_NEW ||
            entry.indexStatus == FileStatus::STAGED_MOD ||
            entry.indexStatus == FileStatus::STAGED_DEL) {
            result.push_back(entry.path);
        }
    }
    return result;
}

} // namespace myvcs

// ============================================================================
// CLI Interface
// ============================================================================

void printUsage(const char* progName) {
    std::cout << "MyVCS Diff & Status Module\n"
              << "Usage: " << progName << " <command> [args]\n\n"
              << "Commands:\n"
              << "  diff <file1> <file2>   Compare two files\n"
              << "  diff-content           Compare content from stdin (old\\0new format)\n"
              << "  status                 Show working directory status\n"
              << "  status-file <path>     Show status of specific file\n"
              << std::endl;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printUsage(argv[0]);
        return 1;
    }
    
    std::string command = argv[1];
    std::filesystem::path cwd = std::filesystem::current_path();
    
    try {
        if (command == "diff") {
            if (argc < 4) {
                std::cerr << "Usage: " << argv[0] << " diff <file1> <file2>" << std::endl;
                return 1;
            }
            
            auto result = myvcs::Diff::compareFiles(argv[2], argv[3]);
            std::cout << myvcs::Diff::formatUnified(result);
            return 0;
        }
        else if (command == "diff-content") {
            // Read old and new content separated by null byte from stdin
            std::string input;
            std::getline(std::cin, input, '\0');
            std::string oldContent = input;
            
            std::getline(std::cin, input, '\0');
            std::string newContent = input;
            
            auto result = myvcs::Diff::compare(oldContent, newContent, "old", "new");
            std::cout << myvcs::Diff::formatUnified(result);
            return 0;
        }
        else if (command == "status") {
            myvcs::Status status(cwd);
            auto entries = status.getStatus();
            
            bool hasChanges = false;
            
            // Modified files
            std::cout << "Changes not staged for commit:\n";
            for (const auto& entry : entries) {
                if (entry.workingStatus == myvcs::FileStatus::MODIFIED) {
                    std::cout << "  modified:   " << entry.path << "\n";
                    hasChanges = true;
                } else if (entry.workingStatus == myvcs::FileStatus::DELETED) {
                    std::cout << "  deleted:    " << entry.path << "\n";
                    hasChanges = true;
                }
            }
            
            // Untracked files
            std::cout << "\nUntracked files:\n";
            for (const auto& entry : entries) {
                if (entry.workingStatus == myvcs::FileStatus::UNTRACKED) {
                    std::cout << "  " << entry.path << "\n";
                    hasChanges = true;
                }
            }
            
            if (!hasChanges) {
                std::cout << "\nnothing to commit, working tree clean\n";
            }
            
            return 0;
        }
        else if (command == "status-file") {
            if (argc < 3) {
                std::cerr << "Usage: " << argv[0] << " status-file <path>" << std::endl;
                return 1;
            }
            
            myvcs::Status status(cwd);
            auto entry = status.getFileStatus(argv[2]);
            
            std::string statusStr;
            switch (entry.workingStatus) {
                case myvcs::FileStatus::UNTRACKED: statusStr = "untracked"; break;
                case myvcs::FileStatus::MODIFIED:  statusStr = "modified";  break;
                case myvcs::FileStatus::DELETED:   statusStr = "deleted";   break;
                case myvcs::FileStatus::UNCHANGED: statusStr = "unchanged"; break;
                default: statusStr = "unknown"; break;
            }
            
            std::cout << entry.path << ": " << statusStr << "\n";
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
