#!/usr/bin/env python3
"""
批量修复所有../../store/导入路径
修复规则：../../store/ -> ../store/
"""
import os
import re
import glob

def fix_imports_in_file(filepath):
    """修复单个文件中的导入路径"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 修复模式：../../store/ -> ../store/
    pattern = r"from '\.\./\.\./store/([^']+)'"
    replacement = r"from '../store/\1'"
    
    new_content = re.sub(pattern, replacement, content)
    
    # 另一个可能的模式：from "../../store/
    pattern2 = r'from "\.\./\.\./store/([^"]+)"'
    replacement2 = r'from "../store/\1"'
    new_content = re.sub(pattern2, replacement2, new_content)
    
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    src_dir = "/Users/apple/WorkBuddy/20260324191412/admin-backend/src"
    
    # 获取所有TypeScript/JavaScript文件
    ts_files = glob.glob(os.path.join(src_dir, "**/*.tsx"), recursive=True)
    ts_files += glob.glob(os.path.join(src_dir, "**/*.ts"), recursive=True)
    ts_files += glob.glob(os.path.join(src_dir, "**/*.jsx"), recursive=True)
    ts_files += glob.glob(os.path.join(src_dir, "**/*.js"), recursive=True)
    
    fixed_count = 0
    for filepath in ts_files:
        if fix_imports_in_file(filepath):
            relative_path = os.path.relpath(filepath, src_dir)
            print(f"✅ 已修复: {relative_path}")
            fixed_count += 1
    
    print(f"\n✅ 修复完成！共修复了 {fixed_count} 个文件")

if __name__ == "__main__":
    main()