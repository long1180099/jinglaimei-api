#!/bin/bash
echo "=== 修复导入路径脚本 ==="
echo "修复从../../store/hooks到../store/hooks的导入路径"

# 修复VideoManagement.tsx
sed -i '' 's|from '"'"'../../store/hooks'"'"'|from '"'"'../store/hooks'"'"'|g' "admin-backend/src/components/school/VideoManagement.tsx"

# 修复ScriptManagement.tsx
sed -i '' 's|from '"'"'../../store/hooks'"'"'|from '"'"'../store/hooks'"'"'|g' "admin-backend/src/components/school/ScriptManagement.tsx"

# 修复ActionLogManagement.tsx
sed -i '' 's|from '"'"'../../store/hooks'"'"'|from '"'"'../store/hooks'"'"'|g' "admin-backend/src/components/school/ActionLogManagement.tsx"

# 修复BookManagement.tsx
sed -i '' 's|from '"'"'../../store/hooks'"'"'|from '"'"'../store/hooks'"'"'|g' "admin-backend/src/components/school/BookManagement.tsx"

echo "导入路径修复完成！"