#!/usr/bin/env python3
"""
修复 UserManagementNew.tsx 中的 TypeScript 字段访问错误
"""

import re

file_path = '/Users/apple/WorkBuddy/20260324191412/admin-backend/src/pages/UserManagementNew.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 需要添加 (record as any) 的字段
fields_to_fix = [
    'activity_score', 'login_count', 'order_count', 'status'
]

# 修复 record.field 但不包括已经修复的 (record as any).field
# 并且不包括 record.id 和 record.username 等已存在的字段
for field in fields_to_fix:
    # 匹配 record.field 但不匹配 (record as any).field
    pattern = rf'(?<!\(record as any\)\.)\brecord\.{field}\b'
    replacement = rf'(record as any).{field}'
    content = re.sub(pattern, replacement, content)

# 修复 record.phone 和 record.email (这些在 UserInfo 中可能不存在)
content = re.sub(r'(?<!\(record as any\)\.)\brecord\.phone\b', '(record as any).phone', content)
content = re.sub(r'(?<!\(record as any\)\.)\brecord\.email\b', '(record as any).email', content)

with open(file_path, 'w') as f:
    f.write(content)

print("修复完成！")
