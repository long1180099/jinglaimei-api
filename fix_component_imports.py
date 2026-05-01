#!/usr/bin/env python3
"""批量修复 components 子目录中错误的相对路径导入"""

import os
import re

base = "/Users/apple/WorkBuddy/20260324191412/admin-backend/src"

# 需要修复的文件及替换规则
# 从 components/xxx/ 层级，../store 应改为 ../../store，../utils 应改为 ../../utils，../api 应改为 ../../api
fixes = [
    # commission 组件
    "components/commission/CommissionCalculatorModal.tsx",
    "components/commission/CommissionRulesModal.tsx",
    "components/commission/LevelConfigModal.tsx",
    "components/commission/CommissionStatsCard.tsx",
    # team 组件
    "components/team/TeamGrowthChart.tsx",
    "components/team/TeamTree.tsx",
    "components/team/MemberDetailModal.tsx",
    # school 组件
    "components/school/BookManagement.tsx",
    "components/school/ActionLogManagement.tsx",
    "components/school/ScriptManagement.tsx",
    "components/school/VideoManagement.tsx",
]

patterns = [
    (r"from '\.\./(store)", r"from '../../\1"),
    (r"from '\.\./(utils)", r"from '../../\1"),
    (r"from '\.\./(api)", r"from '../../\1"),
    (r"from '\.\./(types)", r"from '../../\1"),
    (r'from "\.\./( store)', r'from "../../\1'),
]

total_fixed = 0
for rel_path in fixes:
    full_path = os.path.join(base, rel_path)
    if not os.path.exists(full_path):
        print(f"  [跳过] 不存在: {rel_path}")
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    # 修复 '../store → ../../store' 等
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ 已修复: {rel_path}")
        total_fixed += 1
    else:
        print(f"  - 无需修改: {rel_path}")

print(f"\n共修复 {total_fixed} 个文件")
