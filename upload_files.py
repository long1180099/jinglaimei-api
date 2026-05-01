#!/usr/bin/env python3
"""自动分批上传uploads到云托管（字段名zipfile）"""
import os, sys, json, zipfile, time
import requests

API_BASE = "https://api.jinglaimei.com"
SOURCE_DIR = "/tmp/jlm-upload"
BATCH_SIZE_MB = 4.5

def get_token():
    r = requests.post(f"{API_BASE}/api/auth/login", json={
        "username": "admin", "password": "admin123456"
    })
    d = r.json()
    if d.get("code") != 0:
        print(f"登录失败: {d}")
        sys.exit(1)
    return d["data"]["token"]

def make_batch_zip(batch_num, files):
    zip_path = f"/tmp/jlm-batch-{batch_num}.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            arcname = os.path.relpath(f, SOURCE_DIR)
            zf.write(f, arcname)
    return zip_path

def upload_batch(zip_path, token):
    size_mb = os.path.getsize(zip_path) / 1024 / 1024
    fname = os.path.basename(zip_path)
    print(f"  [{fname}] ({size_mb:.1f}MB)...", end=" ", flush=True)
    with open(zip_path, 'rb') as f:
        r = requests.post(
            f"{API_BASE}/api/migrate/upload-files",
            headers={"Authorization": f"Bearer {token}"},
            files={"zipfile": ("uploads.zip", f, "application/zip")},
            timeout=120
        )
    if r.status_code != 200:
        print(f"HTTP {r.status_code}")
        return False
    try:
        d = r.json()
    except:
        print(f"响应解析失败: {r.text[:200]}")
        return False
    if d.get("code") == 0:
        msg = d.get("data", {})
        print(f"OK ({msg.get('extractedFiles', '?')} 文件)")
        return True
    else:
        print(f"失败: {d.get('message', r.text[:100])}")
        return False

def main():
    token = get_token()
    print(f"已登录")

    # 收集所有文件
    all_files = []
    for root, dirs, files in os.walk(SOURCE_DIR):
        for f in files:
            all_files.append(os.path.join(root, f))
    print(f"共 {len(all_files)} 个文件待上传")

    # 分批
    batches = []
    current_batch = []
    current_size = 0
    for f in sorted(all_files):
        fsize = os.path.getsize(f) / 1024 / 1024
        if current_size + fsize > BATCH_SIZE_MB and current_batch:
            batches.append(current_batch)
            current_batch = []
            current_size = 0
        current_batch.append(f)
        current_size += fsize
    if current_batch:
        batches.append(current_batch)

    print(f"分 {len(batches)} 批上传\n")

    success = 0
    for i, batch in enumerate(batches):
        zip_path = make_batch_zip(i + 1, batch)
        try:
            if upload_batch(zip_path, token):
                success += 1
            else:
                time.sleep(3)
                token = get_token()
                if upload_batch(zip_path, token):
                    success += 1
                else:
                    time.sleep(5)
                    token = get_token()
                    if upload_batch(zip_path, token):
                        success += 1
        finally:
            if os.path.exists(zip_path):
                os.remove(zip_path)

    print(f"\n完成: {success}/{len(batches)} 批成功")

    # 验证
    token = get_token()
    r = requests.get(f"{API_BASE}/api/migrate/status",
                     headers={"Authorization": f"Bearer {token}"})
    d = r.json()
    total = d.get("data", {}).get("totalFiles", 0)
    print(f"线上文件总数: {total}")

if __name__ == "__main__":
    main()
