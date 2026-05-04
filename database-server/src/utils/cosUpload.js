/**
 * COS 对象存储上传工具
 *
 * 微信云托管自动注入环境变量：
 *   COS_BUCKET / COS_REGION — COS 桶名和地域
 *   TENCENTCLOUD_SECRETID / TENCENTCLOUD_SECRETKEY — 平台临时凭证
 *
 * 降级：若无 COS 配置则回退到本地磁盘上传
 */
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

const COS_BUCKET = process.env.COS_BUCKET;
const COS_REGION = process.env.COS_REGION;

// 判断是否可用 COS
const useCOS = !!(COS_BUCKET && COS_REGION);

let cosClient = null;

if (useCOS) {
  cosClient = new COS({
    SecretId: process.env.TENCENTCLOUD_SECRETID || process.env.COS_SECRET_ID,
    SecretKey: process.env.TENCENTCLOUD_SECRETKEY || process.env.COS_SECRET_KEY,
  });
  console.log(`[COS] 已初始化: bucket=${COS_BUCKET}, region=${COS_REGION}`);
} else {
  console.log('[COS] 未配置 COS_BUCKET/COS_REGION，将使用本地磁盘上传');
}

/**
 * 上传文件到 COS 或本地
 * @param {Buffer|Stream} fileData - 文件数据（Buffer 或 ReadStream）
 * @param {string} key - 对象键（如 products/xxx.jpg）
 * @param {string} contentType - MIME 类型
 * @returns {Promise<string>} 可访问的 URL
 */
function uploadFile(fileData, key, contentType) {
  if (!useCOS) {
    return Promise.resolve(null); // 返回 null 表示调用方应使用本地路径
  }

  return new Promise((resolve, reject) => {
    cosClient.putObject({
      Bucket: COS_BUCKET,
      Region: COS_REGION,
      Key: key,
      Body: fileData,
      ContentType: contentType || 'application/octet-stream',
    }, (err, data) => {
      if (err) {
        console.error('[COS] 上传失败:', err.message);
        reject(err);
        return;
      }
      // 返回 COS URL
      const url = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${key}`;
      resolve(url);
    });
  });
}

/**
 * 从本地磁盘上传文件到 COS
 * @param {string} localPath - 本地文件路径
 * @param {string} key - COS 对象键
 * @returns {Promise<string>} COS URL
 */
function uploadFromDisk(localPath, key) {
  if (!useCOS || !fs.existsSync(localPath)) {
    return Promise.resolve(null);
  }
  return uploadFile(fs.createReadStream(localPath), key);
}

/**
 * 删除 COS 对象
 * @param {string} urlOrKey - COS URL 或对象键
 */
function deleteFile(urlOrKey) {
  if (!useCOS || !urlOrKey) return Promise.resolve();

  // 从 URL 中提取 key
  let key = urlOrKey;
  if (urlOrKey.startsWith('http')) {
    try {
      const u = new URL(urlOrKey);
      key = u.pathname.slice(1); // 去掉开头的 /
    } catch (e) {
      return Promise.resolve();
    }
  }

  return new Promise((resolve) => {
    cosClient.deleteObject({
      Bucket: COS_BUCKET,
      Region: COS_REGION,
      Key: key,
    }, (err) => {
      if (err) console.warn('[COS] 删除失败:', err.message);
      resolve();
    });
  });
}

/**
 * 将本地路径 URL（/uploads/xxx）转换为完整 URL
 * COS 环境下拼接 COS 域名，本地环境保留原样
 */
function toFullUrl(localUrl) {
  if (!localUrl) return localUrl;
  if (localUrl.startsWith('http')) return localUrl; // 已经是完整 URL
  if (useCOS && localUrl.startsWith('/uploads/')) {
    const key = localUrl.slice(1); // 去掉开头的 /
    return `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${key}`;
  }
  return localUrl;
}

module.exports = { uploadFile, uploadFromDisk, deleteFile, toFullUrl, useCOS };
