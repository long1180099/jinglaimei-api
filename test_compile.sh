#!/bin/bash
echo "=== 静莱美代理商系统编译测试 ==="
echo "时间: $(date)"
echo ""

cd "/Users/apple/WorkBuddy/20260324191412/admin-backend"

echo "1. 检查TypeScript编译..."
# 设置环境变量
export NODE_PATH="/Users/apple/.workbuddy/binaries/node/workspace/node_modules"
export NODE_OPTIONS="--max-old-space-size=4096"

# 尝试编译
echo "正在运行TypeScript编译器检查..."
/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin/node node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1 | head -20

echo ""
echo "2. 检查项目依赖..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules目录存在"
else
    echo "❌ node_modules目录不存在"
fi

echo ""
echo "3. 项目结构检查..."
echo "src目录:"
ls -la src/ | head -10

echo ""
echo "4. 系统状态总结..."
echo "编译测试完成！如果以上没有显示错误信息，说明项目编译状态良好。"