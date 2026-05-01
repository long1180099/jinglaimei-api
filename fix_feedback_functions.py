#!/usr/bin/env python3
import re

file_path = "/Users/apple/WorkBuddy/20260324191412/admin-backend/src/pages/SchoolManagementNew.tsx"

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 替换函数调用
replacements = {
    r'showSuccess\(': 'success(',
    r'showError\(': 'error(',
    r'showLoading\(': 'loading(',
    r'hideLoading\(\)': 'destroyAllMessages()',  # 或者可以留空，根据实际情况
}

for pattern, replacement in replacements.items():
    content = re.sub(pattern, replacement, content)

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"修复完成！共进行了{len(replacements)}个替换")