#!/bin/bash
# SSL证书申请 - 网络诊断 + acme.sh安装

echo "=== 1. DNS解析状态 ==="
echo "--- 阿里DNS(223.5.5.5) ---"
nslookup api.jinglaimei.com 223.5.5.5 2>&1 | tail -4
echo ""
echo "--- 腾讯DNS(119.29.29.29) ---"
nslookup api.jinglaimei.com 119.29.29.29 2>&1 | tail -4

echo ""
echo "=== 2. 安装acme.sh ==="

if [ -f ~/.acme.sh/acme.sh ]; then
    echo "acme.sh已安装，跳过安装步骤"
else
    echo "尝试从gitee克隆..."
    git clone https://gitee.com/neilpang/acme.sh.git /root/.acme.sh-src 2>&1
    
    if [ -d /root/.acme.sh-src ]; then
        cd /root/.acme.sh-src && ./acme.sh --install 2>&1
        echo "GITEE_OK"
    else
        echo "尝试jsdelivr CDN..."
        wget --timeout=30 -q "https://cdn.jsdelivr.net/gh/Neilpang/acme.sh@master/acme.sh" -O /tmp/acme.sh 2>&1
        if [ -f /tmp/acme.sh ]; then
            chmod +x /tmp/acme.sh
            /tmp/acme.sh --install 2>&1
            echo "JSDELIVR_OK"
        else
            echo "所有源都失败，检查网络..."
            curl -sI --max-time 10 https://raw.githubusercontent.com 2>&1 | head -3
            echo "ALL_FAILED"
            exit 1
        fi
    fi
fi

source ~/.acme.sh/acme.sh 2>/dev/null || true

echo ""
echo "=== 3. 开始DNS验证模式申请证书 ==="
~/.acme.sh/acme.sh --issue -d api.jinglaimei.com --dns --yes-I-know-dns-manual-mode-enough-go-ahead-please 2>&1

echo ""
echo "=== SCRIPT_DONE ==="
