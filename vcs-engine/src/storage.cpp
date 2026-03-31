/**
 * MyVCS Storage Module
 * Author: Akshat
 * 
 * Implements content-addressable storage with SHA-1 hashing and zlib compression.
 * Handles blob, tree, and commit object storage in .myvcs/objects/
 */

#include "storage.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <cstring>
#include <openssl/sha.h>
#include <zlib.h>

namespace myvcs {

// ============================================================================
// Storage Class Implementation
// ============================================================================

Storage::Storage(const std::filesystem::path& repoRoot) 
    : repoRoot_(repoRoot)
    , myvcsDir_(repoRoot / ".myvcs")
    , objectsDir_(myvcsDir_ / "objects") 
{}

bool Storage::init() {
    try {
        // Create .myvcs directory structure
        std::filesystem::create_directories(objectsDir_);
        std::filesystem::create_directories(myvcsDir_ / "refs" / "heads");
        
        // Create HEAD file pointing to main branch
        std::filesystem::path headFile = myvcsDir_ / "HEAD";
        if (!std::filesystem::exists(headFile)) {
            utils::writeFile(headFile, "ref: refs/heads/main\n");
        }
        
        // Create empty index file
        std::filesystem::path indexFile = myvcsDir_ / "index";
        if (!std::filesystem::exists(indexFile)) {
            utils::writeFile(indexFile, "");
        }
        
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error initializing repository: " << e.what() << std::endl;
        return false;
    }
}

std::string Storage::hashContent(const std::string& content) {
    unsigned char hash[SHA_DIGEST_LENGTH];
    SHA1(reinterpret_cast<const unsigned char*>(content.c_str()), 
         content.length(), hash);
    return utils::toHex(hash, SHA_DIGEST_LENGTH);
}

std::string Storage::hashContent(const std::vector<unsigned char>& content) {
    unsigned char hash[SHA_DIGEST_LENGTH];
    SHA1(content.data(), content.size(), hash);
    return utils::toHex(hash, SHA_DIGEST_LENGTH);
}

std::vector<unsigned char> Storage::compress(const std::string& content) {
    return compress(std::vector<unsigned char>(content.begin(), content.end()));
}

std::vector<unsigned char> Storage::compress(const std::vector<unsigned char>& content) {
    // Estimate compressed size (worst case is slightly larger than input)
    uLongf compressedSize = compressBound(content.size());
    std::vector<unsigned char> compressed(compressedSize);
    
    int result = compress2(
        compressed.data(), 
        &compressedSize,
        content.data(), 
        content.size(),
        Z_BEST_SPEED
    );
    
    if (result != Z_OK) {
        throw std::runtime_error("Compression failed with error code: " + std::to_string(result));
    }
    
    compressed.resize(compressedSize);
    return compressed;
}

std::string Storage::decompress(const std::vector<unsigned char>& compressed) {
    // Start with estimated decompressed size
    std::vector<unsigned char> decompressed;
    uLongf decompressedSize = compressed.size() * 4; // Initial estimate
    
    int result;
    do {
        decompressed.resize(decompressedSize);
        result = uncompress(
            decompressed.data(),
            &decompressedSize,
            compressed.data(),
            compressed.size()
        );
        
        if (result == Z_BUF_ERROR) {
            decompressedSize *= 2; // Double buffer size and retry
        }
    } while (result == Z_BUF_ERROR);
    
    if (result != Z_OK) {
        throw std::runtime_error("Decompression failed with error code: " + std::to_string(result));
    }
    
    decompressed.resize(decompressedSize);
    return std::string(decompressed.begin(), decompressed.end());
}

std::string Storage::createObjectHeader(ObjectType type, size_t size) {
    std::string typeStr;
    switch (type) {
        case ObjectType::BLOB:   typeStr = "blob";   break;
        case ObjectType::TREE:   typeStr = "tree";   break;
        case ObjectType::COMMIT: typeStr = "commit"; break;
    }
    return typeStr + " " + std::to_string(size) + '\0';
}

StorageResult Storage::storeObject(ObjectType type, const std::string& content) {
    StorageResult result;
    
    try {
        // Create object with header: "type size\0content"
        std::string header = createObjectHeader(type, content.size());
        std::string fullObject = header + content;
        
        // Hash the full object
        result.hash = hashContent(fullObject);
        
        // Get object path (first 2 chars as directory, rest as filename)
        std::filesystem::path objPath = getObjectPath(result.hash);
        
        // Check if object already exists
        if (std::filesystem::exists(objPath)) {
            result.success = true;
            return result;
        }
        
        // Create directory if needed
        std::filesystem::create_directories(objPath.parent_path());
        
        // Compress and write
        auto compressed = compress(fullObject);
        if (utils::writeFile(objPath, compressed)) {
            result.success = true;
        } else {
            result.success = false;
            result.error = "Failed to write object file";
        }
    } catch (const std::exception& e) {
        result.success = false;
        result.error = e.what();
    }
    
    return result;
}

StorageResult Storage::storeBlob(const std::string& content) {
    return storeObject(ObjectType::BLOB, content);
}

StorageResult Storage::storeBlob(const std::filesystem::path& filePath) {
    try {
        std::string content = utils::readFile(filePath);
        return storeBlob(content);
    } catch (const std::exception& e) {
        return {false, "", e.what()};
    }
}

StorageResult Storage::storeTree(const std::string& treeContent) {
    return storeObject(ObjectType::TREE, treeContent);
}

StorageResult Storage::storeCommit(const std::string& commitContent) {
    return storeObject(ObjectType::COMMIT, commitContent);
}

std::string Storage::retrieveObject(const std::string& hash) {
    std::filesystem::path objPath = getObjectPath(hash);
    
    if (!std::filesystem::exists(objPath)) {
        throw std::runtime_error("Object not found: " + hash);
    }
    
    // Read compressed data
    std::ifstream file(objPath, std::ios::binary);
    std::vector<unsigned char> compressed(
        (std::istreambuf_iterator<char>(file)),
        std::istreambuf_iterator<char>()
    );
    
    // Decompress
    std::string decompressed = decompress(compressed);
    
    // Skip header (find null byte)
    size_t headerEnd = decompressed.find('\0');
    if (headerEnd == std::string::npos) {
        throw std::runtime_error("Invalid object format: " + hash);
    }
    
    return decompressed.substr(headerEnd + 1);
}

bool Storage::objectExists(const std::string& hash) {
    return std::filesystem::exists(getObjectPath(hash));
}

std::filesystem::path Storage::getObjectPath(const std::string& hash) {
    if (hash.length() < 3) {
        throw std::invalid_argument("Invalid hash: " + hash);
    }
    return objectsDir_ / hash.substr(0, 2) / hash.substr(2);
}

// ============================================================================
// Utility Functions
// ============================================================================

namespace utils {

std::string readFile(const std::filesystem::path& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) {
        throw std::runtime_error("Cannot open file: " + path.string());
    }
    
    std::ostringstream ss;
    ss << file.rdbuf();
    return ss.str();
}

bool writeFile(const std::filesystem::path& path, const std::vector<unsigned char>& content) {
    std::ofstream file(path, std::ios::binary);
    if (!file) {
        return false;
    }
    file.write(reinterpret_cast<const char*>(content.data()), content.size());
    return file.good();
}

bool writeFile(const std::filesystem::path& path, const std::string& content) {
    std::ofstream file(path, std::ios::binary);
    if (!file) {
        return false;
    }
    file << content;
    return file.good();
}

std::string toHex(const unsigned char* data, size_t length) {
    static const char hexChars[] = "0123456789abcdef";
    std::string result;
    result.reserve(length * 2);
    
    for (size_t i = 0; i < length; ++i) {
        result.push_back(hexChars[data[i] >> 4]);
        result.push_back(hexChars[data[i] & 0x0F]);
    }
    
    return result;
}

std::string toHex(const std::vector<unsigned char>& data) {
    return toHex(data.data(), data.size());
}

} // namespace utils

} // namespace myvcs

// ============================================================================
// CLI Interface (excluded when compiling as library)
// ============================================================================

#ifndef STORAGE_LIB_ONLY

void printUsage(const char* progName) {
    std::cout << "MyVCS Storage Module\n"
              << "Usage: " << progName << " <command> [args]\n\n"
              << "Commands:\n"
              << "  init                  Initialize a new repository\n"
              << "  hash-object <file>    Hash and store a file, print hash\n"
              << "  cat-file <hash>       Print contents of an object\n"
              << "  hash-string <string>  Hash a string (for testing)\n"
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
    
    try {
        if (command == "init") {
            if (storage.init()) {
                std::cout << "Initialized empty MyVCS repository in " 
                          << (cwd / ".myvcs").string() << std::endl;
                return 0;
            } else {
                std::cerr << "Failed to initialize repository" << std::endl;
                return 1;
            }
        }
        else if (command == "hash-object") {
            if (argc < 3) {
                std::cerr << "Usage: " << argv[0] << " hash-object <file>" << std::endl;
                return 1;
            }
            
            std::filesystem::path filePath = argv[2];
            auto result = storage.storeBlob(filePath);
            
            if (result.success) {
                std::cout << result.hash << std::endl;
                return 0;
            } else {
                std::cerr << "Error: " << result.error << std::endl;
                return 1;
            }
        }
        else if (command == "cat-file") {
            if (argc < 3) {
                std::cerr << "Usage: " << argv[0] << " cat-file <hash>" << std::endl;
                return 1;
            }
            
            std::string hash = argv[2];
            std::string content = storage.retrieveObject(hash);
            std::cout << content;
            return 0;
        }
        else if (command == "hash-string") {
            if (argc < 3) {
                std::cerr << "Usage: " << argv[0] << " hash-string <string>" << std::endl;
                return 1;
            }
            
            std::string content = argv[2];
            auto result = storage.storeBlob(content);
            
            if (result.success) {
                std::cout << result.hash << std::endl;
                return 0;
            } else {
                std::cerr << "Error: " << result.error << std::endl;
                return 1;
            }
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

#endif // STORAGE_LIB_ONLY
