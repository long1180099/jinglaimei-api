#!/bin/bash
# ============================================================
#  静莱美线上部署脚本 - 一键部署到腾讯云CVM
#  用法: ./deploy.sh
# ============================================================

set -e

# ===== 配置 =====
SERVER="118.195.185.6"
USER="root"
PASS="@M3^w,uc2JFTHD"
BUILD_DIR="/Users/apple/WorkBuddy/20260324191412/admin-backend/build"
REMOTE_DIR="/var/www/admin"
TAR_FILE="/tmp/jinglaimei_admin_$(date +%Y%m%d_%H%M%S).tar.gz"
API_DIR="/root/database-server"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  🚀 静莱美线上部署脚本               ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ===== 第一步：检查构建产物 =====
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ 构建目录不存在，先执行: cd admin-backend && npm run build"
    exit 1
fi
echo "✅ 构建产物检查通过"

# ===== 第二步：打包 =====
echo "📦 正在打包..."
cd "$(dirname $BUILD_DIR)"
tar -czf "$TAR_FILE" build/
SIZE=$(du -h "$TAR_FILE" | cut -f1)
echo "✅ 打包完成: $TAR_FILE ($SIZE)"

# ===== 第三步：上传到服务器 =====
echo "📤 正在上传到服务器..."
if command -v sshpass &>/dev/null; then
    sshpass -p "$PASS" scp -o StrictHostKeyChecking=no "$TAR_FILE" ${USER}@${SERVER}:/tmp/admin_build.tar.gz
else
    # 使用 expect 自动输入密码
    expect -c "
        set timeout 300
        spawn scp -o StrictHostKeyChecking=no \"$TAR_FILE\" ${USER}@${SERVER}:/tmp/admin_build.tar.gz
        expect {
            \"password:\" { send \"$PASS\r\" }
            \"(yes/no)?\" { send \"yes\r\"; exp_continue }
        }
        expect eof
    "
fi
echo "✅ 上传成功"

# ===== 第四步：解压部署 + 重启后端 =====
echo "🔧 正在部署前端..."
expect -c "
    set timeout 120
    spawn ssh -o StrictHostKeyChecking=no ${USER}@${SERVER}
    expect {
        \"password:\" { send \"$PASS\r\" }
        \"(yes/no)?\" { send \"yes\r\"; exp_continue }
    }
    expect -re {[#$\\s]}
    
    # 部署前端到Nginx
    send \"cd $REMOTE_DIR && rm -rf build static js css images fonts *.map 2>/dev/null; tar -xzf /tmp/admin_build.tar.gz && cp -r build/* . && rm -rf build /tmp/admin_build.tar.gz && ls -la\r\"
    expect -re {[#$\\s]}
    
    echo '---'
    echo '✅ 前端部署完成'
    
    # 重启后端 API 服务
    echo ''
    echo '🔄 正在重启后端服务...'
    send \"cd $API_DIR && pm2 restart jinglaimei-api || pm2 start app.js --name jinglaimei-api && pm2 list\r\"
    expect -re {[#$\\s]}
    
    send \"exit\r\"
    expect eof
"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  ✅ 部署完成!                        ║"
echo "╠══════════════════════════════════════╣"
echo "║  🌐 后台: https://admin.jinglaimei.com ║"
echo "║  🔗 API : https://api.jinglaimei.com   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 清理本地临时文件
rm -f "$TAR_FILE" 2>/dev/null
