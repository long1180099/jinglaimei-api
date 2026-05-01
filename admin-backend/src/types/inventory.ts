// 库存管理类型定义

export interface InventoryStock {
  id: number;
  product_name: string;
  product_code: string;
  category: string;
  unit: string;
  quantity: number;          // 当前库存
  total_in: number;          // 累计入库
  total_out: number;         // 累计出库
  avg_cost: number;          // 加权平均成本
  total_cost: number;        // 总成本
  total_freight: number;     // 总运费
  min_alert: number;         // 预警阈值
  remark: string;
  status: number;            // 1=正常 0=停用
  record_count?: number;     // 记录数（查询时附加）
  total_in_cost?: number;    // 累计入库成本
  total_in_freight?: number; // 累计入库运费
  created_at: string;
  updated_at: string;
}

export interface InventoryRecord {
  id: number;
  stock_id: number;
  product_name: string;
  record_type: 'in' | 'out' | 'adjust';
  quantity: number;
  unit_cost: number;
  cost_total: number;
  freight: number;
  stock_before: number;
  stock_after: number;
  operator: string;
  remark: string;
  batch_no: string;
  supplier: string;
  created_at: string;
}

export interface InventoryOverview {
  totalProducts: number;
  lowStockCount: number;
  totalQuantity: number;
  totalCost: number;
  totalFreight: number;
  stockValue: number;
}

export interface InventoryStats extends InventoryOverview {
  todayInQty: number;
  todayInCost: number;
  todayFreight: number;
  todayRecords: number;
  monthInQty: number;
  monthOutQty: number;
  monthInCost: number;
}

export interface ReportItem {
  label: string;
  inQty: number;
  outQty: number;
  inCost: number;
  inFreight: number;
  recordCount: number;
}

export interface TopProduct {
  product_name: string;
  totalIn: number;
  totalOut: number;
  totalCost: number;
}

export interface StockInForm {
  product_name: string;
  product_code?: string;
  category?: string;
  unit?: string;
  quantity: number;
  unit_cost?: number;
  freight?: number;
  remark?: string;
  supplier?: string;
  batch_no?: string;
}

export interface StockOutForm {
  stock_id: number | null;
  quantity: number;
  remark?: string;
  operator?: string;
}

// 特供出货表单
export interface SpecialOutForm {
  stock_id: number | null;
  member_id: number | null;
  quantity: number;
  remark?: string;
}

// 搜索到的会员
export interface MemberOption {
  id: number;
  username: string;
  real_name: string | null;
  phone: string | null;
  agent_level: number;
  display_name: string;
}
