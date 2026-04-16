/**
 * 响应工具函数
 */
function success(res, data, message = 'success', statusCode = 200) {
  return res.status(statusCode).json({
    code: 0,
    message,
    data,
    timestamp: Date.now()
  });
}

function error(res, message = '请求失败', statusCode = 400, code = -1) {
  return res.status(statusCode).json({
    code,
    message,
    data: null,
    timestamp: Date.now()
  });
}

function paginate(list, page, pageSize) {
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const items = list.slice(offset, offset + pageSize);
  return { items, total, page, pageSize, totalPages };
}

module.exports = { success, error, paginate };
