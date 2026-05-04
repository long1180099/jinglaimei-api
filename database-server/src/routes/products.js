/**
 * 商品路由 - 含图片上传
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const { uploadFile, deleteFile, toFullUrl, useCOS } = require('../utils/cosUpload');

// ==================== 图片上传配置 ====================
const PRODUCT_IMAGE_DIR = path.join(__dirname, '../../data/uploads/products');

// 确保商品图片目录存在（本地存储时需要）
if (!fs.existsSync(PRODUCT_IMAGE_DIR)) {
  fs.mkdirSync(PRODUCT_IMAGE_DIR, { recursive: true });
}

// multer 存储：COS 用内存存储，本地用磁盘存储
const imageStorage = useCOS
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, PRODUCT_IMAGE_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
      }
    });

// 图片文件过滤（仅允许常见图片格式）
const imageFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error(`不支持的图片格式: ${ext}，仅支持 ${allowed.join(', ')}`), false);
};

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 单张最大10MB
});

// GET /api/products - 商品列表
router.get('/', (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, keyword, status, categoryId, isHot } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = [];
  let params = [];
  if (keyword) {
    where.push('(p.product_name LIKE ? OR p.product_code LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') { where.push('p.status = ?'); params.push(parseInt(status)); }
  if (categoryId) { where.push('p.category_id = ?'); params.push(parseInt(categoryId)); }
  if (isHot !== undefined && isHot !== '') { where.push('p.is_hot = ?'); params.push(parseInt(isHot)); }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM products p ${whereClause}`).get(...params).cnt;
  const products = db.prepare(`
    SELECT p.*, c.category_name,
           (p.stock_quantity - p.sold_quantity) as available_stock
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    ${whereClause}
    ORDER BY p.sort_order ASC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: products, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/products/stats - 商品统计
router.get('/stats', (req, res) => {
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
  const active = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE status = 1').get().cnt;
  const lowStock = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE (stock_quantity - sold_quantity) <= min_stock_alert AND status = 1').get().cnt;
  const totalSales = db.prepare('SELECT COALESCE(SUM(sold_quantity * agent_price), 0) as val FROM products').get().val;
  
  return success(res, { total, active, lowStock, totalSales });
});

// GET /api/products/categories - 商品分类
router.get('/categories', (req, res) => {
  const db = getDB();
  const categories = db.prepare('SELECT * FROM product_categories WHERE status = 1 ORDER BY sort_order').all();
  return success(res, categories);
});

// GET /api/products/:id - 商品详情
router.get('/:id', (req, res) => {
  const db = getDB();
  const product = db.prepare(`
    SELECT p.*, c.category_name FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return error(res, '商品不存在', 404);

  // 图片URL转HTTPS（小程序必须用HTTPS）
  const toHttps = (url) => {
    if (!url) return url;
    return url.replace(/^http:\/\//, 'https://api.jinglaimei.com/');
  };
  if (product.main_image) product.main_image = toHttps(product.main_image);
  if (product.image_gallery) {
    try {
      const gallery = typeof product.image_gallery === 'string' 
        ? JSON.parse(product.image_gallery) 
        : product.image_gallery;
      product.image_gallery = JSON.stringify(gallery.map(toHttps));
    } catch(e) { /* ignore */ }
  }

  // 附加销售趋势（最近3个月）
  const salesTrend = db.prepare(`
    SELECT strftime('%Y-%m', o.order_time) as month, 
           SUM(oi.quantity) as qty, SUM(oi.subtotal) as amount
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_id = ? AND o.order_status = 3
    GROUP BY strftime('%Y-%m', o.order_time)
    ORDER BY month DESC LIMIT 6
  `).all(req.params.id);
  
  return success(res, { ...product, salesTrend });
});

// POST /api/products - 新增商品
router.post('/', (req, res) => {
  const db = getDB();
  const { product_code, product_name, category_id, brand, retail_price, agent_price, vip_price, partner_price,
          wholesale_price, chief_price, division_price, cost_price,
          stock_quantity, min_stock_alert, description, specifications, main_image, image_gallery,
          status, is_hot, is_recommend, sort_order, commission_rate } = req.body;
  if (!product_code || !product_name || !category_id) return error(res, '商品编码、名称、分类不能为空');
  if (!retail_price) return error(res, '零售价不能为空');

  // 确保 commission_rate 列存在（兼容旧数据库）
  try { db.prepare('ALTER TABLE products ADD COLUMN commission_rate REAL DEFAULT 0').run(); } catch(e) {}

  try {
    const result = db.prepare(`
      INSERT INTO products (product_code, product_name, category_id, brand, retail_price, agent_price, vip_price, partner_price,
        wholesale_price, chief_price, division_price, cost_price, stock_quantity, min_stock_alert, description, specifications,
        main_image, image_gallery, status, is_hot, is_recommend, sort_order, commission_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(product_code, product_name, category_id, brand, retail_price, agent_price, vip_price || null, partner_price || null,
           wholesale_price || null, chief_price || null, division_price || null,
           cost_price || null, stock_quantity || 0, min_stock_alert || 10, description, specifications,
           main_image, image_gallery || '[]', status ?? 1, is_hot ?? 0, is_recommend ?? 0, sort_order || 0,
           commission_rate ?? 0);
    return success(res, { id: result.lastInsertRowid }, '商品创建成功', 201);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return error(res, '商品编码已存在');
    return error(res, '创建失败: ' + err.message);
  }
});

// PUT /api/products/:id - 更新商品
router.put('/:id', (req, res) => {
  const db = getDB();
  // 确保 commission_rate 列存在（兼容旧数据库）
  try { db.prepare('ALTER TABLE products ADD COLUMN commission_rate REAL DEFAULT 0').run(); } catch(e) {}
  
  const fields = ['product_name', 'retail_price', 'agent_price', 'vip_price', 'partner_price', 'stock_quantity',
                  'min_stock_alert', 'description', 'status', 'is_hot', 'is_recommend', 'sort_order', 'main_image',
                  'commission_rate', 'wholesale_price', 'chief_price', 'division_price', 'cost_price'];
  const updates = [];
  const params = [];
  
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (!updates.length) return error(res, '没有需要更新的字段');
  
  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  
  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return success(res, null, '更新成功');
});

// PUT /api/products/:id/stock - 更新库存
router.put('/:id/stock', (req, res) => {
  const db = getDB();
  const { quantity, type } = req.body; // type: 'add' | 'set'
  if (type === 'set') {
    db.prepare("UPDATE products SET stock_quantity = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(quantity, req.params.id);
  } else {
    db.prepare("UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(quantity, req.params.id);
  }
  return success(res, null, '库存更新成功');
});

// ==================== 商品图片上传 ====================

// POST /api/products/upload-image - 上传单张商品图片
router.post('/upload-image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) return error(res, '请选择要上传的图片');

    let imageUrl;

    if (useCOS && req.file.buffer) {
      // COS 上传
      const ext = path.extname(req.file.originalname).toLowerCase();
      const key = `products/${uuidv4()}${ext}`;
      imageUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);
    } else {
      // 本地磁盘上传
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    success(res, {
      url: imageUrl,
      filename: req.file.originalname,
      size: req.file.size,
      format: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
    }, '图片上传成功');
  } catch (err) {
    error(res, err.message || '图片上传失败', 500);
  }
});

// ==================== 轮播图/通用图片上传 ====================

const BANNER_DIR = path.join(__dirname, '../../data/uploads/banners');
if (!fs.existsSync(BANNER_DIR)) fs.mkdirSync(BANNER_DIR, { recursive: true });

const bannerStorage = useCOS
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, BANNER_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `banner_${Date.now()}_${uuidv4().slice(0,8)}${ext}`);
      }
    });
const uploadBanner = multer({
  storage: bannerStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// POST /api/upload/banner - 轮播图/通用图片上传（前端BannerManagement调用）
router.post('/upload/banner', uploadBanner.single('image'), async (req, res) => {
  try {
    if (!req.file) return error(res, '请选择要上传的图片');

    let fileUrl;

    if (useCOS && req.file.buffer) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const key = `banners/banner_${Date.now()}_${uuidv4().slice(0,8)}${ext}`;
      fileUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);
    } else {
      fileUrl = `/uploads/banners/${req.file.filename}`;
    }

    console.log('[BANNER_UPLOAD]', { fileUrl, originalName: req.file.originalname, size: req.file.size });

    success(res, {
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size
    }, '图片上传成功');
  } catch (err) {
    error(res, err.message || '轮播图上传失败', 500);
  }
});

// POST /api/products/upload-images - 批量上传多张商品图片（最多9张）
router.post('/upload-images', uploadImage.array('images', 9), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return error(res, '请选择要上传的图片');

    const images = [];
    for (const file of req.files) {
      if (useCOS && file.buffer) {
        const ext = path.extname(file.originalname).toLowerCase();
        const key = `products/${uuidv4()}${ext}`;
        const url = await uploadFile(file.buffer, key, file.mimetype);
        images.push({ url, filename: file.originalname, size: file.size });
      } else {
        images.push({
          url: `/uploads/products/${file.filename}`,
          filename: file.originalname,
          size: file.size,
        });
      }
    }

    success(res, { images }, `成功上传 ${images.length} 张图片`);
  } catch (err) {
    error(res, err.message || '批量上传失败', 500);
  }
});

// DELETE /api/products/:id - 删除商品（物理删除）
router.delete('/:id', (req, res) => {
  const db = getDB();
  
  // 1. 检查商品是否存在
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return error(res, '商品不存在', 404);

  // 2. 删除关联的订单明细（级联清理）
  db.prepare('DELETE FROM order_items WHERE product_id = ?').run(req.params.id);

  // 2.1 删除关联的库存记录（inventory_stock有外键约束，必须先删）
  try {
    db.prepare('DELETE FROM inventory_stock WHERE product_id = ?').run(req.params.id);
  } catch(e) {
    console.warn('[删除商品] 清理inventory_stock失败:', e.message);
  }

  // 3. 删除关联的物理图片
  try {
    if (product.main_image) {
      deleteFile(product.main_image); // COS 环境删除 COS 对象
      const mainPath = path.join(__dirname, '../..', product.main_image);
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath); // 本地也清
    }
    if (product.image_gallery) {
      try {
        const gallery = JSON.parse(product.image_gallery);
        if (Array.isArray(gallery)) {
          gallery.forEach(imgUrl => {
            if (!imgUrl) return;
            deleteFile(imgUrl); // COS 环境删除
            if (imgUrl.startsWith('/uploads/products/')) {
              const imgPath = path.join(__dirname, '../..', imgUrl);
              if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }
          });
        }
      } catch(e) { /* image_gallery解析失败，跳过 */ }
    }
  } catch(e) {
    console.warn('删除商品图片时出错:', e.message);
  }

  // 4. 从数据库物理删除商品
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  return success(res, null, '商品删除成功');
});

// DELETE /api/products/delete-image - 删除商品物理图片文件
router.delete('/delete-image', (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return error(res, '缺少imageUrl参数');

    // 安全检查：只允许删除 uploads/products/ 下的文件
    if (!imageUrl.startsWith('/uploads/products/')) {
      return error(res, '不允许删除此路径的文件', 403);
    }

    const filePath = path.join(__dirname, '../..', imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return success(res, null, '图片删除成功');
    }
    return error(res, '文件不存在', 404);
  } catch (err) {
    error(res, err.message || '删除失败', 500);
  }
});

// GET /api/product-images - 获取所有已上传的商品图片列表（图片库浏览）
router.get('/product-images', (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // 读取uploads/products目录下所有图片
    let files = [];
    try {
      files = fs.readdirSync(PRODUCT_IMAGE_DIR)
        .filter(f => ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(path.extname(f).toLowerCase()))
        .map(f => {
          const stat = fs.statSync(path.join(PRODUCT_IMAGE_DIR, f));
          return {
            url: `/uploads/products/${f}`,
            filename: f,
            size: stat.size,
            createdAt: stat.birthtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      // 目录不存在或为空
    }

    const total = files.length;
    const list = files.slice(offset, offset + parseInt(pageSize));

    success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (err) {
    error(res, err.message || '获取图片库失败', 500);
  }
});

module.exports = router;
