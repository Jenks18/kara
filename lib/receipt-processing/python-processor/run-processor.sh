#!/bin/bash
# Wrapper script to run Python processor with correct library paths

# Set library paths for zbar
export DYLD_LIBRARY_PATH="/opt/homebrew/lib:/opt/homebrew/Cellar/zbar/0.23.93_2/lib:$DYLD_LIBRARY_PATH"
export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib:/opt/homebrew/Cellar/zbar/0.23.93_2/lib:$DYLD_FALLBACK_LIBRARY_PATH"

# Run Python processor with all arguments
python3 "$(dirname "$0")/processor.py" "$@"
