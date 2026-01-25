#!/usr/bin/env python3
"""
Fix pyzbar to find zbar library on macOS with Homebrew
"""
import os
import sys

# Add Homebrew library paths before importing pyzbar
if sys.platform == 'darwin':  # macOS
    homebrew_lib_paths = [
        '/opt/homebrew/lib',
        '/opt/homebrew/Cellar/zbar/0.23.93_2/lib',
        '/usr/local/lib',
    ]
    
    # Set DYLD_LIBRARY_PATH for child processes
    current_lib_path = os.environ.get('DYLD_LIBRARY_PATH', '')
    new_lib_path = ':'.join([p for p in homebrew_lib_paths if os.path.exists(p)])
    if current_lib_path:
        new_lib_path = f"{new_lib_path}:{current_lib_path}"
    os.environ['DYLD_LIBRARY_PATH'] = new_lib_path
    
    # Monkey-patch ctypes.util.find_library to look in Homebrew paths
    from ctypes.util import find_library as original_find_library
    import ctypes.util
    
    def patched_find_library(name):
        # First try original
        result = original_find_library(name)
        if result:
            return result
        
        # Try Homebrew locations for zbar
        if name == 'zbar':
            for lib_path in homebrew_lib_paths:
                full_path = os.path.join(lib_path, f'lib{name}.dylib')
                if os.path.exists(full_path):
                    return full_path
        
        return None
    
    ctypes.util.find_library = patched_find_library

# Now import and run the actual processor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from processor import main

if __name__ == '__main__':
    main()
