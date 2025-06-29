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
    def __init__(self, dry_run: bool = False, create_backups: bool = True):
        # Patterns for comments to PRESERVE
        self.preserve_patterns = [
            r'^\s*//\s*@ts-',           # TypeScript compiler directives
            r'^\s*//\s*eslint-',        # ESLint directives
            r'^\s*//\s*prettier-',      # Prettier directives
            r'^\s*//\s*@',              # Other @ directives
            r'^\s*/\*\*',              # JSDoc comments (start)
            r'^\s*\*',                 # JSDoc comment continuation
            r'^\s*\*/',                # JSDoc comment end
            r'^\s*//\s*TODO',          # TODO comments
            r'^\s*//\s*FIXME',         # FIXME comments
            r'^\s*//\s*NOTE',          # NOTE comments
            r'^\s*//\s*HACK',          # HACK comments
            r'^\s*//\s*BUG',           # BUG comments
            r'^\s*///\s*<reference',   # Triple-slash references
            r'^\s*//\s*#',             # Preprocessor directives
            r'^\s*//\s*Mock',          # Mock-related comments
            r'^\s*//\s*Test',          # Test-related comments
            r'^\s*//\s*Environment',   # Environment-related comments
            r'^\s*//\s*Config',        # Configuration comments
            r'^\s*//\s*API',           # API-related comments
        ]
        
        # URL and string safety patterns
        self.url_patterns = [
            r'https?://',
            r'ftp://',
            r'file://',
            r'xmlns=',
            r'viewBox=',
            r'href=',
            r'src=',
        ]
        
        # Additional critical patterns for SVG and XML attributes
        self.critical_patterns = [
            r'xmlns:',           # XML namespaces
            r'viewBox=',         # SVG viewBox
            r'd="[^"]*"',        # SVG path data
            r'fill="[^"]*"',     # SVG fill attributes
            r'stroke="[^"]*"',   # SVG stroke attributes
            r'transform="[^"]*"' # SVG transforms
        ]
        
        # Compile regex patterns for efficiency
        self.preserve_regexes = [re.compile(pattern) for pattern in self.preserve_patterns]
        self.url_regexes = [re.compile(pattern, re.IGNORECASE) for pattern in self.url_patterns]
        self.critical_regexes = [re.compile(pattern, re.IGNORECASE) for pattern in self.critical_patterns]
        
        # Configuration
        self.dry_run = dry_run
        self.create_backups = create_backups
        
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
        
        # SAFETY: Don't touch lines with glob patterns
        if '/**/' in line or '**/' in line:
            return True
        
        # SAFETY: Always preserve lines with URLs or special attributes
        if any(regex.search(line) for regex in self.url_regexes):
            return True
        
        # SAFETY: Preserve important context comments (case-insensitive)
        important_keywords = [
            'reduce', 'improve', 'timeout', 'retry', 'config', 'setup', 
            'environment', 'test', 'mock', 'override', 'fallback', 'catch',
            'prevent', 'ensure', 'validate', 'check', 'filter', 'suppress',
            'disable', 'enable', 'global', 'intercept', 'api', 'endpoint'
        ]
        
        comment_text = stripped.lower()
        if any(keyword in comment_text for keyword in important_keywords):
            return True
        
        # Check against preservation patterns FIRST (this is the main logic)
        for regex in self.preserve_regexes:
            if regex.match(line):
                return True
        
        # For JSDoc-style comments, only preserve if they're actually JSDoc (/** */)
        if stripped.startswith('/**') or (stripped.startswith('*') and not stripped.startswith('*/')):
            return True
        
        # SAFETY: Only preserve lines that look like they contain URLs or critical syntax in the comment itself
        if any(pattern in stripped for pattern in ['http://', 'https://', 'xmlns=', 'viewBox=', 'href=', 'src=']):
            return True
        
        return False
    
    def is_inline_comment_to_remove(self, line: str) -> Tuple[bool, str]:
        """Check if line has an inline comment that should be removed."""
        
        # SAFETY: Don't touch lines with glob patterns AT ALL
        if '/**/' in line or '**/' in line:
            return False, line
        
        # SAFETY: Don't touch lines with URLs, strings, or complex patterns
        if any(pattern in line.lower() for pattern in ['http:', 'https:', 'ftp:', 'file:', 'xmlns=']):
            return False, line
        
        # SAFETY: Don't touch lines with string literals that might contain URLs
        if re.search(r'["\'][^"\']*://[^"\']*["\']', line):
            return False, line
        
        # SAFETY: Don't touch JSX attributes or complex expressions that might contain URLs
        if '=' in line and any(pattern in line.lower() for pattern in ['http', 'xmlns', 'viewbox', 'href', 'src']):
            return False, line
        
        # Look for // comments at the end of code lines, but be very careful
        match = re.search(r'^(.+?)\s*//\s*([^@].*?)$', line)
        if match:
            code_part = match.group(1).rstrip()
            comment_part = match.group(2)
            
            # Don't remove if it's a directive
            if any(regex.match('  // ' + comment_part) for regex in self.preserve_regexes):
                return False, line
            
            # SAFETY: Don't remove comments that look like they might be part of URLs
            if any(char in comment_part for char in ['/', '.', ':', '=', '"', "'"]):
                return False, line
            
            # SAFETY: Only remove simple explanatory comments
            if len(comment_part.strip()) > 50:  # Probably important if it's long
                return False, line
            
            # Remove the inline comment
            return True, code_part
        
        return False, line
    
    def clean_file_content(self, content: str) -> Tuple[str, int, int]:
        """Clean a file's content by removing non-JSDoc comments."""
        lines = content.split('\n')
        cleaned_lines = []
        comments_removed = 0
        lines_removed = 0
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # CRITICAL FIX: Skip ANY line containing glob patterns entirely
            if '/**/' in line or '**/' in line or '/*' in line:
                # Don't process these lines AT ALL - they might contain glob patterns
                cleaned_lines.append(line)
                i += 1
                continue
            
            # SAFETY: Skip lines that contain URLs or special syntax entirely
            if any(regex.search(line) for regex in self.url_regexes):
                cleaned_lines.append(line)
                i += 1
                continue
            
            # SAFETY: Skip lines with JSX/HTML attributes or complex expressions that contain URLs/attributes
            if ('=' in line and any(url_pattern in line.lower() for url_pattern in ['http', 'xmlns', 'viewbox', 'href', 'src'])):
                cleaned_lines.append(line)
                i += 1
                continue
            
            # Handle multi-line comments (/* ... */) - but be careful
            if '/*' in line and not line.strip().startswith('/**'):
                # SAFETY: Don't touch lines that might contain URLs in comments
                if any(pattern in line.lower() for pattern in ['http', 'xmlns', 'viewbox']):
                    cleaned_lines.append(line)
                    i += 1
                    continue
                
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
                # Check for inline comments (with enhanced safety)
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
                # SAFETY: Validate syntax before writing
                if not self.validate_syntax(file_path, cleaned_content):
                    print(f"❌ {file_path}: Skipping due to syntax validation failure")
                    return False
                
                if self.dry_run:
                    print(f"🔍 {file_path}: Would remove {comments_removed} comments, {lines_removed} lines [DRY RUN]")
                    if hasattr(self, 'show_preview') and self.show_preview:
                        self.preview_changes(file_path)
                else:
                    # Create backup if requested
                    if self.create_backups:
                        backup_path = file_path.with_suffix(file_path.suffix + '.backup')
                        with open(backup_path, 'w', encoding='utf-8') as f:
                            f.write(original_content)
                        print(f"💾 Created backup: {backup_path}")
                    
                    # Write the cleaned file
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(cleaned_content)
                    
                    print(f"✅ {file_path}: Removed {comments_removed} comments, {lines_removed} lines")
                
                self.comments_removed += comments_removed
                self.lines_removed += lines_removed
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
            '.next', 'storybook-static', 'cypress', 'cypress/downloads', 'cypress/screenshots'
        }
        
        # Files that should never be modified (critical system files)
        exclude_files = {
            'next-env.d.ts',           # Next.js generated file
            'vite-env.d.ts',           # Vite generated file  
            'sw.js',                   # Service worker
            'workbox-*.js',            # Workbox files
            '*.min.js',                # Minified files
            '*.bundle.js',             # Bundle files
        }
        
        files = []
        for root, dirs, filenames in os.walk(root_dir):
            # Remove excluded directories from dirs to prevent os.walk from entering them
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for filename in filenames:
                if any(filename.endswith(ext) for ext in extensions):
                    # Skip excluded files
                    if any(filename == exclude_file or 
                          (exclude_file.startswith('*') and filename.endswith(exclude_file[1:])) or
                          (exclude_file.endswith('*') and filename.startswith(exclude_file[:-1]))
                          for exclude_file in exclude_files):
                        continue
                        
                    file_path = Path(root) / filename
                    files.append(file_path)
        
        return sorted(files)
    
    def run(self, root_dir: str = '.') -> None:
        """Run the comment cleanup process."""
        root_path = Path(root_dir).resolve()
        mode_text = "[DRY RUN] " if self.dry_run else ""
        print(f"🚀 {mode_text}Starting comment cleanup in: {root_path}")
        
        if self.dry_run:
            print("🔍 DRY RUN MODE: No files will be modified, only showing what would change")
        elif self.create_backups:
            print("💾 BACKUP MODE: Creating .backup files for all changes")
        
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
        print(f"   Files {'would be ' if self.dry_run else ''}modified: {modified_files}")
        print(f"   Comments {'would be ' if self.dry_run else ''}removed: {self.comments_removed}")
        print(f"   Lines {'would be ' if self.dry_run else ''}removed: {self.lines_removed}")
        
        if self.dry_run:
            print(f"\n🔍 DRY RUN complete! Run without --dry-run to apply changes.")
        elif modified_files > 0:
            print(f"\n✅ Cleanup complete! {modified_files} files were cleaned.")
            if self.create_backups:
                print(f"💾 Backup files (.backup) created for all modified files.")
        else:
            print(f"\n⚪ No files needed cleaning.")
    
    def preview_changes(self, file_path: Path, max_lines: int = 5) -> None:
        """Show a preview of what would be changed in a file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            cleaned_content, comments_removed, lines_removed = self.clean_file_content(original_content)
            
            if cleaned_content != original_content:
                print(f"\n📝 Preview changes for {file_path}:")
                print(f"   Would remove {comments_removed} comments, {lines_removed} lines")
                
                # Show diff preview
                original_lines = original_content.split('\n')
                cleaned_lines = cleaned_content.split('\n')
                
                changes_shown = 0
                for i, (orig, clean) in enumerate(zip(original_lines, cleaned_lines)):
                    if orig != clean and changes_shown < max_lines:
                        print(f"   Line {i+1}:")
                        print(f"     - {orig}")
                        print(f"     + {clean}")
                        changes_shown += 1
                
                if changes_shown == max_lines and comments_removed > max_lines:
                    print(f"     ... and {comments_removed - max_lines} more changes")
                    
        except Exception as e:
            print(f"❌ Error previewing {file_path}: {e}")
    
    def validate_syntax(self, file_path: Path, content: str) -> bool:
        """Basic syntax validation to ensure we didn't break anything."""
        try:
            # For TypeScript/JavaScript files, we can do basic validation
            # Check for unmatched quotes, brackets, etc.
            
            # Count quotes
            single_quotes = content.count("'") - content.count("\\'")
            double_quotes = content.count('"') - content.count('\\"')
            
            if single_quotes % 2 != 0:
                print(f"⚠️ Warning: Unmatched single quotes in {file_path}")
                return False
                
            if double_quotes % 2 != 0:
                print(f"⚠️ Warning: Unmatched double quotes in {file_path}")
                return False
            
            # Count brackets
            brackets = {'(': ')', '[': ']', '{': '}'}
            stack = []
            
            for char in content:
                if char in brackets:
                    stack.append(brackets[char])
                elif char in brackets.values():
                    if not stack or stack.pop() != char:
                        print(f"⚠️ Warning: Unmatched brackets in {file_path}")
                        return False
            
            if stack:
                print(f"⚠️ Warning: Unmatched brackets in {file_path}")
                return False
            
            return True
            
        except Exception as e:
            print(f"⚠️ Warning: Could not validate syntax for {file_path}: {e}")
            return False

    def is_jsx_svg_line(self, line: str) -> bool:
        """Detect JSX/SVG content that should never be touched."""
        jsx_indicators = ['<path', '<svg', '<g>', '<circle', '<rect', 'viewBox', 'd=']
        return any(indicator in line for indicator in jsx_indicators)

    def is_safe_inline_comment(self, comment_text: str) -> bool:
        """Only remove very simple, obviously safe inline comments."""
        # Never remove if contains special characters
        dangerous_chars = ['/', '.', ':', '=', '"', "'", '<', '>', '{', '}']
        if any(char in comment_text for char in dangerous_chars):
            return False
        
        # Only remove simple word comments
        return re.match(r'^[a-zA-Z\s]+$', comment_text.strip())

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Clean up TypeScript/JavaScript comments')
    parser.add_argument('directory', nargs='?', help='Directory to process (default: project root)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without modifying files')
    parser.add_argument('--no-backups', action='store_true', help='Skip creating backup files')
    parser.add_argument('--preview', action='store_true', help='Show detailed preview of changes (implies --dry-run)')
    
    args = parser.parse_args()
    
    if args.directory:
        root_dir = args.directory
    else:
        # Default to project root (3 levels up from src/config/scripts/)
        root_dir = Path(__file__).parent.parent.parent.parent
    
    # Preview mode implies dry-run
    dry_run = args.dry_run or args.preview
    
    cleaner = CommentCleaner(
        dry_run=dry_run,
        create_backups=not args.no_backups
    )
    
    # Set preview mode if requested
    if args.preview:
        cleaner.show_preview = True
    
    cleaner.run(root_dir)

if __name__ == '__main__':
    main()
