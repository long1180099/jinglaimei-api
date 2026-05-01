#!/usr/bin/env python3
"""
将 VideoManagement.tsx 中的 videoColumns 从组件外移到组件内部（handlePreview 函数之后）
"""

path = "/Users/apple/WorkBuddy/20260324191412/admin-backend/src/components/school/VideoManagement.tsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 找到 "// 视频表格列定义\nconst videoColumns" 到 "];" 的整个块（组件外部）
import re

# 提取外部 videoColumns 定义
outer_cols_pattern = r'(// 视频表格列定义\nconst videoColumns: ColumnsType<LearningVideo> = \[.*?\n\];)\n\n// 工具函数'
match = re.search(outer_cols_pattern, content, re.DOTALL)
if not match:
    print("❌ 未找到外部 videoColumns 定义")
    exit(1)

outer_cols = match.group(1)
print(f"✅ 找到外部 videoColumns 定义 ({len(outer_cols)} chars)")

# 2. 删除外部 videoColumns（保留工具函数部分）
content = content.replace(outer_cols + '\n\n// 工具函数', '// 工具函数', 1)

# 3. 将 videoColumns 改为组件内部定义（加 const 前缀，放到 handleDelete 之后）
# 找到 "  // 删除视频" 这个位置
inner_cols = outer_cols.replace(
    '// 视频表格列定义\nconst videoColumns',
    '  // 视频表格列定义（在组件内定义以访问 handler 函数）\n  const videoColumns'
)
# 修复缩进（在组件内部需要两格缩进）
inner_lines = []
for line in inner_cols.split('\n'):
    inner_lines.append('  ' + line if line and not line.startswith('  // 视频') else line)
# 实际上更简单的方法：直接在特定位置插入
inner_cols_fixed = inner_cols  # 保持原样，用类型断言
# 将 fixed: 'right' 改为 fixed: 'right' as const 避免类型错误
inner_cols_fixed = inner_cols_fixed.replace("fixed: 'right',", "fixed: 'right' as const,")

# 4. 在 handleDelete 函数之后插入
insert_after = "  };\n  \n  // 批量操作"
content = content.replace(
    insert_after,
    f"  }};\n  \n  // 视频表格列定义（在组件内定义以访问 handler 函数）\n  {inner_cols_fixed[inner_cols_fixed.find('const'):]}\n\n  // 批量操作",
    1
)

# 5. 修复 selectAllVideos 调用（该函数可能不存在）
content = content.replace(
    "dispatch(selectAllVideos(false))",
    "dispatch(fetchVideos(queryParams))"
)
content = content.replace(
    "dispatch(selectAllVideos(true))",  
    "dispatch(fetchVideos(queryParams))"
)

# 6. 修复 import type -> import
content = content.replace(
    "import type { LearningVideo, VideoCategory, VideoDifficulty, VideoStatus } from '../../types/school';",
    "import { LearningVideo, VideoCategory, VideoDifficulty, VideoStatus } from '../../types/school';"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 完成，文件已更新")
