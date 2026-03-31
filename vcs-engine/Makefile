# MyVCS Engine Makefile
# Compiler: clang++ for macOS

CXX = clang++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2

# OpenSSL paths (Homebrew on macOS)
OPENSSL_PREFIX = $(shell brew --prefix openssl 2>/dev/null || echo /usr/local/opt/openssl)
INCLUDES = -I./include -I$(OPENSSL_PREFIX)/include
LDFLAGS = -L$(OPENSSL_PREFIX)/lib
LIBS = -lssl -lcrypto -lz

SRC_DIR = src
INC_DIR = include
BIN_DIR = bin
OBJ_DIR = obj

# Source files
STORAGE_SRC = $(SRC_DIR)/storage.cpp
HISTORY_SRC = $(SRC_DIR)/history.cpp
DIFF_SRC = $(SRC_DIR)/diff.cpp

# Object files (library code without main)
STORAGE_LIB_OBJ = $(OBJ_DIR)/storage_lib.o

# Binaries
STORAGE_BIN = $(BIN_DIR)/myvcs-storage
HISTORY_BIN = $(BIN_DIR)/myvcs-history
DIFF_BIN = $(BIN_DIR)/myvcs-diff

.PHONY: all clean storage history diff

all: storage history diff

storage: $(STORAGE_BIN)

history: $(HISTORY_BIN)

diff: $(DIFF_BIN)

# Compile storage as library (without main)
$(STORAGE_LIB_OBJ): $(STORAGE_SRC) $(INC_DIR)/storage.h
	@mkdir -p $(OBJ_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -DSTORAGE_LIB_ONLY -c $(STORAGE_SRC) -o $(STORAGE_LIB_OBJ)

$(STORAGE_BIN): $(STORAGE_SRC) $(INC_DIR)/storage.h
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $(STORAGE_SRC) -o $(STORAGE_BIN) $(LDFLAGS) $(LIBS)

$(HISTORY_BIN): $(HISTORY_SRC) $(STORAGE_LIB_OBJ) $(INC_DIR)/history.h $(INC_DIR)/storage.h
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $(HISTORY_SRC) $(STORAGE_LIB_OBJ) -o $(HISTORY_BIN) $(LDFLAGS) $(LIBS)

$(DIFF_BIN): $(DIFF_SRC) $(INC_DIR)/diff.h
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $(DIFF_SRC) -o $(DIFF_BIN) $(LDFLAGS) $(LIBS)

clean:
	rm -rf $(BIN_DIR)/* $(OBJ_DIR)/*

# Development targets
debug: CXXFLAGS += -g -DDEBUG
debug: all

# Install to system (optional)
install: all
	cp $(BIN_DIR)/myvcs-* /usr/local/bin/

uninstall:
	rm -f /usr/local/bin/myvcs-storage
	rm -f /usr/local/bin/myvcs-history
	rm -f /usr/local/bin/myvcs-diff
