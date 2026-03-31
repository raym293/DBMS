#ifndef MYVCS_STORAGE_H
#define MYVCS_STORAGE_H

#include <string>
#include <vector>
#include <filesystem>

namespace myvcs {

// Object types in the VCS
enum class ObjectType {
    BLOB,
    TREE,
    COMMIT
};

// Result structure for operations
struct StorageResult {
    bool success;
    std::string hash;
    std::string error;
};

// Storage class for content-addressable object storage
class Storage {
public:
    // Initialize storage with repository root path
    explicit Storage(const std::filesystem::path& repoRoot);

    // Initialize the .myvcs directory structure
    bool init();

    // Hash content using SHA-1
    std::string hashContent(const std::string& content);
    std::string hashContent(const std::vector<unsigned char>& content);

    // Compress content using zlib
    std::vector<unsigned char> compress(const std::string& content);
    std::vector<unsigned char> compress(const std::vector<unsigned char>& content);

    // Decompress content using zlib
    std::string decompress(const std::vector<unsigned char>& compressed);

    // Store a blob (file content) and return its hash
    StorageResult storeBlob(const std::string& content);
    StorageResult storeBlob(const std::filesystem::path& filePath);

    // Store a tree object and return its hash
    StorageResult storeTree(const std::string& treeContent);

    // Store a commit object and return its hash
    StorageResult storeCommit(const std::string& commitContent);

    // Retrieve an object by its hash
    std::string retrieveObject(const std::string& hash);

    // Check if an object exists
    bool objectExists(const std::string& hash);

    // Get the path to an object file
    std::filesystem::path getObjectPath(const std::string& hash);

    // Get repository root
    std::filesystem::path getRepoRoot() const { return repoRoot_; }

    // Get objects directory
    std::filesystem::path getObjectsDir() const { return objectsDir_; }

private:
    std::filesystem::path repoRoot_;
    std::filesystem::path myvcsDir_;
    std::filesystem::path objectsDir_;

    // Store an object with given type prefix
    StorageResult storeObject(ObjectType type, const std::string& content);

    // Create object header
    std::string createObjectHeader(ObjectType type, size_t size);
};

// Utility functions
namespace utils {
    // Read entire file content
    std::string readFile(const std::filesystem::path& path);
    
    // Write content to file
    bool writeFile(const std::filesystem::path& path, const std::vector<unsigned char>& content);
    bool writeFile(const std::filesystem::path& path, const std::string& content);
    
    // Convert bytes to hex string
    std::string toHex(const unsigned char* data, size_t length);
    std::string toHex(const std::vector<unsigned char>& data);
}

} // namespace myvcs

#endif // MYVCS_STORAGE_H
