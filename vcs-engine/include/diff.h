#ifndef MYVCS_DIFF_H
#define MYVCS_DIFF_H

#include <string>
#include <vector>
#include <filesystem>

namespace myvcs {

// Represents a line change in a diff
enum class ChangeType {
    UNCHANGED,
    ADDED,
    DELETED
};

struct DiffLine {
    ChangeType type;
    int oldLineNum;  // Line number in old file (-1 if added)
    int newLineNum;  // Line number in new file (-1 if deleted)
    std::string content;
};

// Represents a hunk (contiguous group of changes)
struct DiffHunk {
    int oldStart;
    int oldCount;
    int newStart;
    int newCount;
    std::vector<DiffLine> lines;
};

// Complete diff result
struct DiffResult {
    std::string oldPath;
    std::string newPath;
    std::vector<DiffHunk> hunks;
    bool isBinary;
};

// File status types
enum class FileStatus {
    UNTRACKED,     // New file not in index
    MODIFIED,      // File changed since last staged
    DELETED,       // File removed from working dir
    STAGED_NEW,    // New file staged for commit
    STAGED_MOD,    // Modified file staged
    STAGED_DEL,    // Deleted file staged
    UNCHANGED      // No changes
};

struct FileStatusEntry {
    std::string path;
    FileStatus indexStatus;   // Status in index vs HEAD
    FileStatus workingStatus; // Status in working dir vs index
};

// Diff engine class
class Diff {
public:
    // Compare two strings line by line
    static DiffResult compare(
        const std::string& oldContent,
        const std::string& newContent,
        const std::string& oldPath = "a",
        const std::string& newPath = "b"
    );
    
    // Compare two files
    static DiffResult compareFiles(
        const std::filesystem::path& oldFile,
        const std::filesystem::path& newFile
    );
    
    // Format diff output (unified format)
    static std::string formatUnified(const DiffResult& diff, int context = 3);
    
    // Check if content appears to be binary
    static bool isBinary(const std::string& content);
    
private:
    // Split string into lines
    static std::vector<std::string> splitLines(const std::string& content);
    
    // Compute longest common subsequence
    static std::vector<std::pair<int, int>> computeLCS(
        const std::vector<std::string>& oldLines,
        const std::vector<std::string>& newLines
    );
    
    // Build diff from LCS
    static std::vector<DiffLine> buildDiff(
        const std::vector<std::string>& oldLines,
        const std::vector<std::string>& newLines,
        const std::vector<std::pair<int, int>>& lcs
    );
    
    // Group diff lines into hunks
    static std::vector<DiffHunk> createHunks(
        const std::vector<DiffLine>& lines,
        int context = 3
    );
};

// Status engine class
class Status {
public:
    explicit Status(const std::filesystem::path& repoRoot);
    
    // Get status of all files
    std::vector<FileStatusEntry> getStatus();
    
    // Get status of specific file
    FileStatusEntry getFileStatus(const std::string& path);
    
    // Get list of untracked files
    std::vector<std::string> getUntrackedFiles();
    
    // Get list of modified files (working dir vs index)
    std::vector<std::string> getModifiedFiles();
    
    // Get list of deleted files
    std::vector<std::string> getDeletedFiles();
    
    // Get list of staged files
    std::vector<std::string> getStagedFiles();

private:
    std::filesystem::path repoRoot_;
    std::filesystem::path myvcsDir_;
    
    // Get all tracked files from index
    std::vector<std::pair<std::string, std::string>> loadIndex();
    
    // Get all files in working directory
    std::vector<std::string> getWorkingFiles();
    
    // Compute file hash without storing
    std::string computeHash(const std::filesystem::path& path);
};

} // namespace myvcs

#endif // MYVCS_DIFF_H
