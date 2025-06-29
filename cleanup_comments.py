#!/usr/bin/env python3
"""
TypeScript Comment Cleanup Script
Removes all non-JSDoc comments from TypeScript/JavaScript files while preserving:
- JSDoc comments (/** ... */)
- Type comments (// @ts-ignore, // @ts-expect-error, etc.)
- ESLint disable comments (// eslint-disable-line, etc.)
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple, Set

class CommentCleaner:
    def __init__(self):
        # Patterns for comments to PRESERVE
        self.preserve_patterns = [
            r'^\s*//\s*@ts-',           # TypeScript compiler directives
            r'^\s*//\s*eslint-',        # ESLint directives
            r'^\s*//\s*prettier-',      # Prettier directives
            r'^\s*//\s*@',              # Other @ directives
            r'^\s*/\*\*',              # JSDoc comments (start)
            r'^\s*\*',                 # JSDoc comment continuation
            r'^\s*\*/',                # JSDoc comment end
        ]
        
        # Compile regex patterns for efficiency
        self.preserve_regexes = [re.compile(pattern) for pattern in self.preserve_patterns]
        
        # Track statistics
        self.files_processed = 0
        self.comments_removed = 0
        self.lines_removed = 0
    
    def should_preserve_line(self, line: str) -> bool:
        """Check if a line should be preserved (contains special comments)."""
        stripped = line.strip()
        
        # Always preserve empty lines and non-comment lines
        if not stripped or not (stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*')):
            return True
        
        # Check against preservation patterns
        for regex in self.preserve_regexes:
            if regex.match(line):
                return True
        
        return False
    
    def is_inline_comment_to_remove(self, line: str) -> Tuple[bool, str]:
        """
        Check if line has an inline comment that should be removed.
        Returns (has_removable_comment, line_without_comment)
        """
        # Look for // comments at the end of code lines
        match = re.search(r'^(.+?)\s*//\s*([^@].*?)$', line)
        if match:
            code_part = match.group(1).rstrip()
            comment_part = match.group(2)
            
            # Don't remove if it's a directive
            if any(regex.match('  // ' + comment_part) for regex in self.preserve_regexes):
                return False, line
            
            # Remove the inline comment
            return True, code_part
        
        return False, line
    
    def clean_file_content(self, content: str) -> Tuple[str, int, int]:
        """
        Clean a file's content by removing non-JSDoc comments.
        Returns (cleaned_content, comments_removed, lines_removed)
        """
        lines = content.split('\n')
        cleaned_lines = []
        comments_removed = 0
        lines_removed = 0
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Handle multi-line comments (/* ... */)
            if '/*' in line and not line.strip().startswith('/**'):
                # Check if it's a single-line /* comment */
                if '*/' in line:
                    # Remove the comment part
                    before_comment = line[:line.find('/*')]
                    after_comment = line[line.find('*/') + 2:]
                    cleaned_line = before_comment + after_comment
                    if cleaned_line.strip():
                        cleaned_lines.append(cleaned_line)
                    else:
                        lines_removed += 1
                    comments_removed += 1
                    i += 1
                    continue
                else:
                    # Multi-line /* comment - skip until */
                    start_i = i
                    while i < len(lines) and '*/' not in lines[i]:
                        i += 1
                    if i < len(lines):
                        # Found closing */
                        i += 1
                    comments_removed += 1
                    lines_removed += (i - start_i)
                    continue
            
            # Handle single-line comments
            if line.strip().startswith('//'):
                if self.should_preserve_line(line):
                    cleaned_lines.append(line)
                else:
                    comments_removed += 1
                    lines_removed += 1
            else:
                # Check for inline comments
                has_inline, cleaned_line = self.is_inline_comment_to_remove(line)
                if has_inline:
                    comments_removed += 1
                    cleaned_lines.append(cleaned_line)
                else:
                    cleaned_lines.append(line)
            
            i += 1
        
        # Remove excessive blank lines (more than 2 consecutive)
        final_lines = []
        blank_count = 0
        
        for line in cleaned_lines:
            if line.strip() == '':
                blank_count += 1
                if blank_count <= 2:
                    final_lines.append(line)
            else:
                blank_count = 0
                final_lines.append(line)
        
        # Remove trailing blank lines
        while final_lines and final_lines[-1].strip() == '':
            final_lines.pop()
        
        return '\n'.join(final_lines) + '\n', comments_removed, lines_removed
    
    def process_file(self, file_path: Path) -> bool:
        """Process a single file. Returns True if file was modified."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            cleaned_content, comments_removed, lines_removed = self.clean_file_content(original_content)
            
            # Only write if content changed
            if cleaned_content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(cleaned_content)
                
                self.comments_removed += comments_removed
                self.lines_removed += lines_removed
                print(f"✅ {file_path}: Removed {comments_removed} comments, {lines_removed} lines")
                return True
            else:
                print(f"⚪ {file_path}: No changes needed")
                return False
        
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            return False
    
    def find_typescript_files(self, root_dir: Path) -> List[Path]:
        """Find all TypeScript/JavaScript files to process."""
        extensions = {'.ts', '.tsx', '.js', '.jsx'}
        exclude_dirs = {
            'node_modules', '.git', 'dist', 'build', 'coverage', 
            '.next', 'storybook-static', 'cypress/downloads', 'cypress/screenshots'
        }
        
        files = []
        for root, dirs, filenames in os.walk(root_dir):
            # Remove excluded directories from dirs to prevent os.walk from entering them
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for filename in filenames:
                if any(filename.endswith(ext) for ext in extensions):
                    file_path = Path(root) / filename
                    files.append(file_path)
        
        return sorted(files)
    
    def run(self, root_dir: str = '.') -> None:
        """Run the comment cleanup process."""
        root_path = Path(root_dir).resolve()
        print(f"🚀 Starting comment cleanup in: {root_path}")
        
        # Find all TypeScript/JavaScript files
        files = self.find_typescript_files(root_path)
        print(f"📁 Found {len(files)} TypeScript/JavaScript files")
        
        if not files:
            print("No files found to process")
            return
        
        # Process each file
        modified_files = 0
        for file_path in files:
            self.files_processed += 1
            if self.process_file(file_path):
                modified_files += 1
        
        # Print summary
        print(f"\n📊 Cleanup Summary:")
        print(f"   Files processed: {self.files_processed}")
        print(f"   Files modified: {modified_files}")
        print(f"   Comments removed: {self.comments_removed}")
        print(f"   Lines removed: {self.lines_removed}")
        
        if modified_files > 0:
            print(f"\n✅ Cleanup complete! {modified_files} files were cleaned.")
        else:
            print(f"\n⚪ No files needed cleaning.")

def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        root_dir = sys.argv[1]
    else:
        root_dir = '.'
    
    cleaner = CommentCleaner()
    cleaner.run(root_dir)

if __name__ == '__main__':
    main()
