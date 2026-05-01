const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class ExcelService {
  constructor(basePath = '/Users/apple/WorkBuddy/20260324191412/action-log-system/data') {
    this.basePath = basePath;
    this.ensureDirectories();
  }
  
  ensureDirectories() {
    const directories = [
      'annual_goals',
      'monthly_goals',
      'weekly_goals', 
      'daily_goals',
      'monthly_tracking',
      'commitments',
      'reports'
    ];
    
    directories.forEach(dir => {
      const fullPath = path.join(this.basePath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }
  
  // 创建Excel文件
  createWorkbook(template, fileName, sheetName = 'Sheet1') {
    const workbook = XLSX.utils.book_new();
    
    if (Array.isArray(template)) {
      // 处理数组格式的模板
      const ws = XLSX.utils.json_to_sheet(template);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    } else if (typeof template === 'object') {
      // 处理多工作表格式
      Object.keys(template).forEach((sheet, index) => {
        const ws = XLSX.utils.json_to_sheet(template[sheet]);
        XLSX.utils.book_append_sheet(workbook, ws, sheet || `Sheet${index + 1}`);
      });
    }
    
    return workbook;
  }
  
  // 保存Excel文件
  saveWorkbook(workbook, filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    XLSX.writeFile(workbook, filePath);
    return filePath;
  }
  
  // 读取Excel文件
  readWorkbook(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    const workbook = XLSX.readFile(filePath);
    const result = {};
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      result[sheetName] = data;
    });
    
    return result;
  }
  
  // 更新Excel文件
  updateWorkbook(filePath, updates) {
    let workbook;
    
    if (fs.existsSync(filePath)) {
      workbook = XLSX.readFile(filePath);
    } else {
      workbook = XLSX.utils.book_new();
    }
    
    Object.keys(updates).forEach(sheetName => {
      const ws = XLSX.utils.json_to_sheet(updates[sheetName]);
      
      if (workbook.SheetNames.includes(sheetName)) {
        // 替换已有工作表
        workbook.Sheets[sheetName] = ws;
      } else {
        // 添加新工作表
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      }
    });
    
    XLSX.writeFile(workbook, filePath);
    return filePath;
  }
  
  // 在指定位置添加数据行
  addRow(filePath, sheetName, rowData, position = 'append') {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`工作表不存在: ${sheetName}`);
    }
    
    let data = XLSX.utils.sheet_to_json(worksheet);
    
    if (position === 'append') {
      data.push(rowData);
    } else if (position === 'prepend') {
      data.unshift(rowData);
    } else if (typeof position === 'number') {
      data.splice(position, 0, rowData);
    }
    
    const newWs = XLSX.utils.json_to_sheet(data);
    workbook.Sheets[sheetName] = newWs;
    XLSX.writeFile(workbook, filePath);
    
    return data.length;
  }
  
  // 查找和更新数据
  updateRow(filePath, sheetName, searchCriteria, updateData) {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(worksheet);
    let updated = false;
    
    data = data.map(row => {
      let match = true;
      Object.keys(searchCriteria).forEach(key => {
        if (row[key] !== searchCriteria[key]) {
          match = false;
        }
      });
      
      if (match) {
        updated = true;
        return { ...row, ...updateData };
      }
      
      return row;
    });
    
    if (updated) {
      const newWs = XLSX.utils.json_to_sheet(data);
      workbook.Sheets[sheetName] = newWs;
      XLSX.writeFile(workbook, filePath);
    }
    
    return { updated, count: updated ? 1 : 0 };
  }
  
  // 统计数据
  countByCriteria(filePath, sheetName, criteria = {}) {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (Object.keys(criteria).length === 0) {
      return data.length;
    }
    
    return data.filter(row => {
      let match = true;
      Object.keys(criteria).forEach(key => {
        if (row[key] !== criteria[key]) {
          match = false;
        }
      });
      return match;
    }).length;
  }
  
  // 汇总数据
  aggregateData(filePath, sheetName, groupBy, aggregateField, operation = 'sum') {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const result = {};
    
    data.forEach(row => {
      const groupKey = row[groupBy];
      const value = parseFloat(row[aggregateField]) || 0;
      
      if (!result[groupKey]) {
        result[groupKey] = {
          count: 0,
          sum: 0,
          values: []
        };
      }
      
      result[groupKey].count++;
      result[groupKey].sum += value;
      result[groupKey].values.push(value);
    });
    
    // 根据操作类型计算结果
    Object.keys(result).forEach(key => {
      const item = result[key];
      
      switch (operation) {
        case 'sum':
          item.result = item.sum;
          break;
        case 'avg':
          item.result = item.count > 0 ? item.sum / item.count : 0;
          break;
        case 'count':
          item.result = item.count;
          break;
        case 'max':
          item.result = Math.max(...item.values);
          break;
        case 'min':
          item.result = Math.min(...item.values);
          break;
        default:
          item.result = item.sum;
      }
      
      delete item.values;
    });
    
    return result;
  }
  
  // 生成报告
  generateReport(filePath, reportConfig) {
    const data = this.readWorkbook(filePath);
    const report = {
      metadata: {
        filePath,
        generatedAt: new Date().toISOString(),
        sheetCount: Object.keys(data).length
      },
      summary: {},
      details: {}
    };
    
    Object.keys(data).forEach(sheetName => {
      const sheetData = data[sheetName];
      report.details[sheetName] = {
        rowCount: sheetData.length,
        columns: sheetData.length > 0 ? Object.keys(sheetData[0]) : [],
        sampleData: sheetData.slice(0, 3)
      };
      
      // 根据报告配置生成统计
      if (reportConfig && reportConfig[sheetName]) {
        const config = reportConfig[sheetName];
        report.summary[sheetName] = {};
        
        config.forEach(stat => {
          if (stat.type === 'count' && stat.criteria) {
            report.summary[sheetName][stat.name] = this.countByCriteria(filePath, sheetName, stat.criteria);
          } else if (stat.type === 'aggregate') {
            report.summary[sheetName][stat.name] = this.aggregateData(
              filePath, 
              sheetName, 
              stat.groupBy, 
              stat.field, 
              stat.operation
            );
          }
        });
      }
    });
    
    return report;
  }
  
  // 导出为JSON
  exportToJSON(filePath, outputPath) {
    const data = this.readWorkbook(filePath);
    const jsonData = JSON.stringify(data, null, 2);
    
    fs.writeFileSync(outputPath, jsonData, 'utf8');
    return outputPath;
  }
  
  // 导入JSON到Excel
  importFromJSON(jsonPath, excelPath) {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const workbook = this.createWorkbook(jsonData, path.basename(excelPath));
    this.saveWorkbook(workbook, excelPath);
    return excelPath;
  }
}

module.exports = ExcelService;