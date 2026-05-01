#!/bin/bash
echo "=== 修复schoolSlice导入路径脚本 ==="
echo "修复从../../store/slices/schoolSlice到../store/slices/schoolSlice的导入路径"

# 修复VideoManagement.tsx
sed -i '' 's|from '"'"'../../store/slices/schoolSlice'"'"'|from '"'"'../store/slices/schoolSlice'"'"'|g' "admin-backend/src/components/school/VideoManagement.tsx"

# 修复ScriptManagement.tsx
sed -i '' 's|from '"'"'../../store/slices/schoolSlice'"'"'|from '"'"'../store/slices/schoolSlice'"'"'|g' "admin-backend/src/components/school/ScriptManagement.tsx"

# 修复ActionLogManagement.tsx
sed -i '' 's|from '"'"'../../store/slices/schoolSlice'"'"'|from '"'"'../store/slices/schoolSlice'"'"'|g' "admin-backend/src/components/school/ActionLogManagement.tsx"

# 修复BookManagement.tsx
sed -i '' 's|from '"'"'../../store/slices/schoolSlice'"'"'|from '"'"'../store/slices/schoolSlice'"'"'|g' "admin-backend/src/components/school/BookManagement.tsx"

# 修复SchoolManagementNew.tsx
sed -i '' 's|from '"'"'../../store/slices/schoolSlice'"'"'|from '"'"'../store/slices/schoolSlice'"'"'|g' "admin-backend/src/pages/SchoolManagementNew.tsx"

echo "schoolSlice导入路径修复完成！"