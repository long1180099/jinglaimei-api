#!/bin/bash
# DNS验证模式申请SSL证书 - 第一步：生成TXT记录

# 安装acme.sh（如果还没装）
if [ ! -f ~/.acme.sh/acme.sh ]; then
  echo "=== 安装acme.sh ==="
  curl https://get.acme.sh | sh -s email=admin@jinglaimei.com 2>&1 || \
  wget -O- https://get.acme.sh | sh -s email=admin@jinglaimei.com 2>&1
fi

# 加载acme.sh
export LE_WORKING_DIR="$HOME/.acme.sh"
source ~/.acme.sh/acme.sh

echo ""
echo "=== 开始DNS手动验证 ==="
echo "请将以下TXT记录添加到阿里云DNS解析控制台"
echo ""

~/.acme.sh/acme.sh --issue -d api.jinglaimei.com --dns --yes-I-know-dns-manual-mode-enough-go-ahead-please 2>&1

echo ""
echo "=== ACME_STEP1_DONE ==="
