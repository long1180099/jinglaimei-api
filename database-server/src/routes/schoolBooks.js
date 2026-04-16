/**
 * 电子书路由 - 文件上传 + CRUD
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error, paginate } = require('../utils/response');

// ==================== 文件存储配置 ====================
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads/ebooks');
const COVER_DIR = path.join(__dirname, '../../data/uploads/covers');

// 确保上传目录存在
[UPLOAD_DIR, COVER_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// multer存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据字段名区分：cover->封面，file->电子书文件
    const dir = file.fieldname === 'cover' ? COVER_DIR : UPLOAD_DIR;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedEbookExts = ['.pdf', '.epub', '.doc', '.docx', '.txt', '.mobi'];
  const allowedCoverExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const allowedImportExts = ['.json'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'cover') {
    if (allowedCoverExts.includes(ext)) return cb(null, true);
    return cb(new Error('不支持的封面格式，仅支持 JPG/PNG/WEBP'), false);
  }

  // 导入路由允许JSON
  if (req.path === '/import' || req.originalUrl?.includes('/import')) {
    if (allowedImportExts.includes(ext)) return cb(null, true);
    return cb(new Error('导入文件仅支持JSON格式'), false);
  }

  if (file.fieldname === 'file') {
    if (allowedEbookExts.includes(ext) || allowedImportExts.includes(ext)) return cb(null, true);
    return cb(new Error('不支持的文件格式，仅支持 PDF/EPUB/DOC/TXT'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  }
});

// ==================== 确保books表存在 ====================
function ensureBooksTable() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'sales_psychology',
      difficulty TEXT DEFAULT 'beginner',
      pages INTEGER DEFAULT 0,
      reading_time INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      summary TEXT DEFAULT '',
      key_points TEXT DEFAULT '[]',
      status TEXT DEFAULT 'available',
      file_url TEXT DEFAULT '',
      file_name TEXT DEFAULT '',
      file_format TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      cover_url TEXT DEFAULT '',
      views INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
}

// ==================== 路由 ====================

// POST /api/school/books/upload - 上传电子书文件
router.post('/books/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return error(res, '请选择要上传的文件');

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const fileUrl = `/uploads/ebooks/${req.file.filename}`;

    success(res, {
      url: fileUrl,
      filename: req.file.originalname,
      format: ext,
      size: req.file.size,
    }, '文件上传成功');
  } catch (err) {
    error(res, err.message || '上传失败', 500);
}
});

// POST /api/school/books/create-with-file - 原子操作：上传文件+创建书籍(一步完成)
router.post('/books/create-with-file', upload.single('file'), (req, res) => {
  try {
    ensureBooksTable();
    
    // Step 1: 处理文件上传
    if (!req.file) return error(res, '请选择要上传的文件');
    
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const fileUrl = `/uploads/ebooks/${req.file.filename}`;
    
    console.log('[BOOK_CREATE_WITH_FILE] 文件上传成功:', fileUrl);
    
    // Step 2: 从body取书籍信息（同时支持camelCase和snake_case）
    const { title, author, description, category, difficulty, pages, reading_time: readingTime,
            tags, summary, keyPoints, status, coverUrl } = req.body;
            
    console.log('[BOOK_CREATE_WITH_FILE] Body:', JSON.stringify({ title, author, pages, fileUrl }));
    
    if (!title) return error(res, '请输入书籍标题');
    
    const db = getDB();
    const result = db.prepare(`
      INSERT INTO learning_books (title, author, description, category, difficulty, pages, reading_time, tags, summary, key_points, status, file_url, file_name, file_format, file_size, cover_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title || '',
      author || '',
      description || '',
      category || 'sales_psychology',
      difficulty || 'beginner',
      parseInt(pages) || 0,
      parseInt(readingTime) || 0,
      JSON.stringify(tags || []),
      summary || '',
      JSON.stringify(keyPoints || []),
      status || 'available',
      fileUrl,                          // ← 关键：直接用上传的URL
      req.file.originalname,             // ← 文件名来自实际上传的文件
      ext,                              // ← 格式来自实际上传的文件
      req.file.size,                    // ← 大小来自实际上传的文件
      coverUrl || ''
    );
    
    const newId = result.lastInsertRowid;
    const newBook = db.prepare('SELECT * FROM learning_books WHERE id = ?').get(newId);
    
    console.log(`[BOOK_CREATE_WITH_FILE] 创建成功 ID=${newId} file_url=${newBook.file_url}`);
    
    success(res, {
      ...newBook,
      id: String(newBook.id),
      tags: JSON.parse(newBook.tags || '[]'),
      keyPoints: JSON.parse(newBook.key_points || '[]'),
    }, '电子书创建成功', 201);
  } catch (err) {
    console.error('[BOOK_CREATE_WITH_FILE] 错误:', err.message);
    error(res, err.message || '创建失败', 500);
  }
});

// POST /api/school/books/cover - 上传封面
router.post('/books/cover', upload.single('cover'), (req, res) => {
  try {
    if (!req.file) return error(res, '请选择封面图片');

    const coverUrl = `/uploads/covers/${req.file.filename}`;

    success(res, {
      url: coverUrl,
    }, '封面上传成功');
  } catch (err) {
    error(res, err.message || '上传失败', 500);
  }
});

// POST /api/school/books/import - 批量导入（JSON格式）
router.post('/books/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return error(res, '请选择要导入的文件');

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.json') return error(res, '导入文件仅支持JSON格式');

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const booksData = JSON.parse(content);
    const books = Array.isArray(booksData) ? booksData : [booksData];
    const db = getDB();
    ensureBooksTable();

    let imported = 0;
    for (const book of books) {
      db.prepare(`
        INSERT INTO learning_books (title, author, description, category, difficulty, pages, reading_time, tags, summary, key_points, status, cover_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        book.title || '未命名',
        book.author || '',
        book.description || '',
        book.category || 'sales_psychology',
        book.difficulty || 'beginner',
        book.pages || 0,
        book.reading_time || 0,
        JSON.stringify(book.tags || []),
        book.summary || '',
        JSON.stringify(book.key_points || []),
        book.status || 'available',
        book.cover_url || ''
      );
      imported++;
    }

    success(res, { imported }, `成功导入 ${imported} 本书籍`);
  } catch (err) {
    error(res, err.message || '导入失败', 500);
  }
});

// GET /api/school/books - 电子书列表
router.get('/books', (req, res) => {
  try {
    ensureBooksTable();
    const db = getDB();
    const { page = 1, pageSize = 20, keyword, category, status, difficulty, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let where = [];
    let params = [];
    if (keyword) { where.push('(title LIKE ? OR author LIKE ? OR description LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (category) { where.push('category = ?'); params.push(category); }
    if (status) { where.push('status = ?'); params.push(status); }
    if (difficulty) { where.push('difficulty = ?'); params.push(difficulty); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const allowedSort = ['created_at', 'updated_at', 'views', 'downloads', 'sort_order', 'title'];
    const sortBy = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM learning_books ${whereClause}`).get(...params).cnt;
    const books = db.prepare(`
      SELECT * FROM learning_books ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);

    // 解析JSON字段 + snake_case → camelCase 映射
    const parsedBooks = books.map(book => ({
      ...book,
      id: String(book.id),
      fileUrl: book.file_url,
      fileName: book.file_name,
      fileFormat: book.file_format,
      fileSize: book.file_size,
      coverUrl: book.cover_url,
      createdAt: book.created_at,
      updatedAt: book.updated_at,
      keyPoints: JSON.parse(book.key_points || '[]'),
      tags: JSON.parse(book.tags || '[]'),
    }));

    return success(res, {
      list: parsedBooks,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /api/school/books/:id - 电子书详情
router.get('/books/:id', (req, res) => {
  try {
    ensureBooksTable();
    const db = getDB();
    const book = db.prepare('SELECT * FROM learning_books WHERE id = ?').get(req.params.id);
    if (!book) return error(res, '电子书不存在', 404);

    db.prepare('UPDATE learning_books SET views = views + 1 WHERE id = ?').run(req.params.id);

    return success(res, {
      ...book,
      id: String(book.id),
      fileUrl: book.file_url,
      fileName: book.file_name,
      fileFormat: book.file_format,
      fileSize: book.file_size,
      coverUrl: book.cover_url,
      createdAt: book.created_at,
      updatedAt: book.updated_at,
      tags: JSON.parse(book.tags || '[]'),
      keyPoints: JSON.parse(book.key_points || '[]'),
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /api/school/books - 创建电子书
router.post('/books', (req, res) => {
  try {
    ensureBooksTable();
    const db = getDB();
    const { title, author, description, category, difficulty, pages, reading_time, tags, summary, keyPoints, status, fileUrl, fileName, fileFormat, fileSize, coverUrl } = req.body;

    if (!title) return error(res, '请输入书籍标题');

    const result = db.prepare(`
      INSERT INTO learning_books (title, author, description, category, difficulty, pages, reading_time, tags, summary, key_points, status, file_url, file_name, file_format, file_size, cover_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      author || '',
      description || '',
      category || 'sales_psychology',
      difficulty || 'beginner',
      pages || 0,
      reading_time || 0,
      JSON.stringify(tags || []),
      summary || '',
      JSON.stringify(keyPoints || []),
      status || 'available',
      fileUrl || '',
      fileName || '',
      fileFormat || '',
      fileSize || 0,
      coverUrl || ''
    );

    const newId = result.lastInsertRowid;
    const newBook = db.prepare('SELECT * FROM learning_books WHERE id = ?').get(newId);
    success(res, {
      ...newBook,
      id: String(newBook.id),
      tags: JSON.parse(newBook.tags || '[]'),
      keyPoints: JSON.parse(newBook.key_points || '[]'),
    }, '创建成功', 201);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// PUT /api/school/books/:id - 更新电子书
router.put('/books/:id', (req, res) => {
  try {
    ensureBooksTable();
    const db = getDB();
    const book = db.prepare('SELECT id FROM learning_books WHERE id = ?').get(req.params.id);
    if (!book) return error(res, '电子书不存在', 404);

    const { title, author, description, category, difficulty, pages, reading_time, tags, summary, keyPoints, status, fileUrl, fileName, fileFormat, fileSize, coverUrl } = req.body;

    db.prepare(`
      UPDATE learning_books SET
        title = COALESCE(?, title),
        author = COALESCE(?, author),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        difficulty = COALESCE(?, difficulty),
        pages = COALESCE(?, pages),
        reading_time = COALESCE(?, reading_time),
        tags = COALESCE(?, tags),
        summary = COALESCE(?, summary),
        key_points = COALESCE(?, key_points),
        status = COALESCE(?, status),
        file_url = COALESCE(?, file_url),
        file_name = COALESCE(?, file_name),
        file_format = COALESCE(?, file_format),
        file_size = COALESCE(?, file_size),
        cover_url = COALESCE(?, cover_url),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      title, author, description, category, difficulty,
      pages, reading_time,
      Array.isArray(tags) ? JSON.stringify(tags) : tags,
      summary,
      Array.isArray(keyPoints) ? JSON.stringify(keyPoints) : keyPoints,
      status, fileUrl, fileName, fileFormat, fileSize, coverUrl,
      req.params.id
    );

    success(res, null, '更新成功');
  } catch (err) {
    error(res, err.message, 500);
  }
});

// PUT/POST /api/school/books/:id/recommend - 切换推荐状态
router.put('/books/:id/recommend', handleRecommend);
router.post('/books/:id/recommend', handleRecommend);

function handleRecommend(req, res) {
  try {
    ensureBooksTable();
    const db = getDB();
    const { recommended } = req.body;
    const newStatus = recommended ? 'recommended' : 'available';

    db.prepare('UPDATE learning_books SET status = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(newStatus, req.params.id);
    success(res, null, recommended ? '已设为推荐' : '已取消推荐');
  } catch (err) {
    error(res, err.message, 500);
  }
}

// DELETE /api/school/books/:id - 删除电子书
router.delete('/books/:id', (req, res) => {
  try {
    ensureBooksTable();
    const db = getDB();
    const book = db.prepare('SELECT * FROM learning_books WHERE id = ?').get(req.params.id);
    if (!book) return error(res, '电子书不存在', 404);

    // 删除关联文件
    if (book.file_url) {
      const filePath = path.join(__dirname, '../../data', book.file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (book.cover_url) {
      const coverPath = path.join(__dirname, '../../data', book.cover_url);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }

    db.prepare('DELETE FROM learning_books WHERE id = ?').run(req.params.id);
    success(res, null, '删除成功');
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /api/school/books/check-format - 检查文件格式
router.post('/books/check-format', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return error(res, '请选择文件');

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const supportedFormats = ['pdf', 'epub', 'doc', 'docx', 'txt', 'mobi'];

    success(res, {
      format: ext,
      supported: supportedFormats.includes(ext),
      size: req.file.size,
      name: req.file.originalname,
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /api/school/books/:id/read - 在线阅读（返回文件URL或文本内容）
router.get('/books/:id/read', (req, res) => {
  try {
    ensureBooksTable();
    const db = getDB();
    const book = db.prepare('SELECT * FROM learning_books WHERE id = ?').get(req.params.id);
    if (!book || !book.file_url) return error(res, '文件不存在', 404);

    const filePath = path.join(__dirname, '../../data', book.file_url);
    if (!fs.existsSync(filePath)) return error(res, '文件已被删除', 404);

    // 更新阅读量
    db.prepare('UPDATE learning_books SET views = views + 1 WHERE id = ?').run(req.params.id);

    const ext = (book.file_format || '').toLowerCase();

    if (ext === 'txt') {
      // TXT文件直接返回文本内容
      const text = fs.readFileSync(filePath, 'utf-8');
      return success(res, {
        type: 'text',
        content: text,
        format: 'txt',
        title: book.title,
        author: book.author,
      });
    }

    // PDF/EPUB/DOC等格式返回文件URL，前端用对应渲染器打开
    return success(res, {
      type: 'file',
      url: book.file_url,
      format: ext,
      title: book.title,
      author: book.author,
      fileName: book.file_name,
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /api/school/books/:id/download - 下载电子书
router.get('/books/:id/download', (req, res) => {
  try {
    ensureBooksTable();
    const db = getDB();
    const book = db.prepare('SELECT * FROM learning_books WHERE id = ?').get(req.params.id);
    if (!book || !book.file_url) return error(res, '文件不存在', 404);

    const filePath = path.join(__dirname, '../../data', book.file_url);
    if (!fs.existsSync(filePath)) return error(res, '文件已被删除', 404);

    // 更新下载量
    db.prepare('UPDATE learning_books SET downloads = downloads + 1 WHERE id = ?').run(req.params.id);

    res.download(filePath, book.file_name || `ebook_${book.id}.${book.file_format}`);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
