/**
 * 静莱美 - 打印弹窗 v3.0
 * 功能：
 *   - 发货人：系统默认名（可设置，自动记住）
 *   - 取货人：必须填写（弹窗输入）
 *   - 审核：可选填
 *   - 打印后自动保存记录 + 更新订单状态为"已发货"
 */
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Radio, message, Input, Form, Space, Divider, Popconfirm } from 'antd';
import {
  PrinterOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import PrintTemplate from './PrintTemplate';

const PRINT_TYPE_OPTIONS = [
  { key: 'shipping', label: '出库单', icon: <FileTextOutlined />, desc: '仓库出库用' },
  { key: 'delivery', label: '配送单', icon: <CheckCircleOutlined />, desc: '快递配送用' },
  { key: 'invoice', label: '销售单', icon: <EyeOutlined />, desc: '财务存档用' },
];

interface PrintModalProps {
  fetchOrderDetail: (orderId: number) => Promise<any>;
  openTrigger?: number | null;
  orderIds?: number[];
}

// ==================== API ====================
const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function getSettings() {
  const res = await fetch(`${API_BASE}/print-logs/settings`, {
    headers: { Authorization: localStorage.getItem('jlm_auth_token') || '' }
  });
  const data = await res.json();
  if (data.code === 0) return data.data;
  return null;
}

async function saveSettings(defaultShipper: string) {
  const res = await fetch(`${API_BASE}/print-logs/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: localStorage.getItem('jlm_auth_token') || ''
    },
    body: JSON.stringify({ defaultShipper })
  });
  return res.json();
}

async function savePrintLog(payload: any) {
  const res = await fetch(`${API_BASE}/print-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: localStorage.getItem('jlm_auth_token') || ''
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

const PrintModal: React.FC<PrintModalProps> = ({ fetchOrderDetail, openTrigger, orderIds }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printType, setPrintType] = useState('shipping');
  const [orders, setOrders] = useState<any[]>([]);
  const [currentOrderIdx, setCurrentOrderIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  
  // 新增状态
  const [defaultShipper, setDefaultShipper] = useState('');
  const [showReceiverInput, setShowReceiverInput] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [shipperName, setShipperName] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // 打印记录
  const templateRef = useRef<HTMLDivElement>(null);

  // 监听触发信号
  useEffect(() => {
    if (openTrigger !== undefined && openTrigger !== null) {
      handleOpen(orderIds || [openTrigger]);
    }
  }, [openTrigger]);

  // 加载设置
  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  async function loadSettings() {
    try {
      const settings = await getSettings();
      if (settings) {
        setDefaultShipper(settings.defaultShipper || '');
        setShipperName(settings.defaultShipper || '');
      }
    } catch(e) {}
  }

  const handleOpen = async (ids: number[]) => {
    if (!ids || ids.length === 0) return;
    
    setVisible(true);
    setLoading(true);
    setCurrentOrderIdx(0);
    setPreviewMode(false);
    setShowReceiverInput(false);
    setReceiverName('');
    setReviewerName('');

    try {
      const results = await Promise.all(ids.map((id: number) => fetchOrderDetail(id)));
      const validResults = results.filter((r) => r !== null && r !== undefined);
      if (validResults.length > 0) {
        setOrders(validResults);
      } else {
        message.error('未获取到有效的订单数据');
        setVisible(false);
      }
    } catch (err: any) {
      console.error('[打印] 加载订单数据失败:', err);
      message.error(err?.message || '加载订单数据失败');
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setOrders([]);
    setCurrentOrderIdx(0);
    setShowReceiverInput(false);
    setShowSettings(false);
  };

  /** 点击"立即打印"时先校验取货人 */
  const handlePrintClick = () => {
    if (!receiverName.trim()) {
      setShowReceiverInput(true);
      return;
    }
    doPrintWithSave();
  };

  /** 确认取货人后执行打印+保存 */
  const doPrintWithSave = () => {
    const name = receiverName.trim();
    if (!name) {
      message.warning('请输入取货人姓名');
      return;
    }
    doPrint();
  };

  /** 保存发货人默认值 */
  const handleSaveDefaultShipper = async () => {
    try {
      const result = await saveSettings(shipperName);
      if (result.code === 0) {
        setDefaultShipper(shipperName);
        message.success('发货人默认名已保存');
        setShowSettings(false);
      }
    } catch(e) {
      message.error('保存失败');
    }
  };

  // 执行打印 — JS精确测量内容高度后动态设置@page纸张尺寸
  const doPrint = () => {
    if (orders.length === 0 || !templateRef.current) return;

    const currentOrder = orders[currentOrderIdx];
    
    try {
      const printContent = templateRef.current.innerHTML;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        message.error('无法创建打印窗口');
        return;
      }

      doc.open();
      doc.write(
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>出库单</title>' +
        '<style id="page-style">' +
        '@page{size:250mm 180mm landscape;margin:3mm 5mm;}' +
        '*{margin:0;padding:0;box-sizing:border-box;}' +
        'html{width:240mm;font-family:"Microsoft YaHei","SimHei","SimSun",sans-serif;font-size:10px;line-height:1.4;color:#000;background:#fff;}' +
        'body{padding:1.5mm 4mm;width:100%;}' +
        'table{width:100%;border-collapse:collapse;table-layout:fixed;}' +
        'th,td{border:1px solid #999;padding:1.5px 3px;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        'th{background:#f5f5f5;font-size:9px;font-weight:bold;text-align:center;}' +
        '/* 商品名称列大字高亮 */' +
        'tbody tr td:nth-child(2){font-size:16px !important;font-weight:bold !important;color:#c00 !important;}' +
        'b{font-weight:bold;}' +
        '.ph{text-align:center;border-bottom:double 2px #000;padding-bottom:1.5mm;margin-bottom:1.5mm;}' +
        '.ph h1{font-size:16px;letter-spacing:8px;margin:0;}' +
        '.ph .sub{font-size:8px;color:#666;letter-spacing:2px;}' +
        '.info-row{display:flex;font-size:9px;line-height:1.5;}' +
        '.info-row>div{flex:1;white-space:nowrap;}' +
        '.addr-box{background:#fafafa;padding:1.5mm 2px;font-size:9px;margin:1mm 0;display:flex;flex-wrap:wrap;gap:0 6px;}' +
        '.addr-box>div{font-size:9px;}' +
        '.sum-row{display:flex;font-size:9.5px;padding:0.5mm 0;}' +
        '.sum-row .l{flex:1;color:#555;}' +
        '.sum-row .r{font-family:"Courier New",monospace;text-align:right;}' +
        '.total-row{border-top:double 2.5px #000;margin-top:0.5mm;padding-top:1mm;font-size:12px;font-weight:bold;}' +
        '.balance-bar{margin-top:1mm;padding-top:1mm;border-top:1px dashed #ccc;font-size:9px;display:flex;align-items:center;gap:4px;}' +
        '.balance-val{font-family:"Courier New",monospace;font-size:12px;font-weight:bold;color:#c00;}' +
        '.footer-row{display:flex;justify-content:space-between;margin-top:1.5mm;padding-top:1.5mm;border-top:1px dashed #999;font-size:8.5px;}' +
        '.barcode-text{font-family:"Courier New",cursive;font-size:11px;letter-spacing:1px;}' +
        '</style></head><body>'
        + printContent +
        '</body></html>'
      );
      doc.close();

      // 等渲染后测量高度再动态设@page
      setTimeout(() => {
        try {
          const bodyEl = doc.body;
          const htmlEl = doc.documentElement;
          const contentHeightPx = Math.max(
            bodyEl.scrollHeight, bodyEl.offsetHeight,
            htmlEl.scrollHeight, htmlEl.offsetHeight
          );
          const pageH_mm = Math.ceil(contentHeightPx / 3.78 + 8);

          console.log(`[打印] 内容高度: ${contentHeightPx}px → 纸张: ${pageH_mm}mm`);

          const pageStyle = doc.getElementById('page-style');
          if (pageStyle) {
            pageStyle.textContent =
              `@page{size:250mm ${pageH_mm}mm landscape;margin:2mm 4mm;}` +
              '*{margin:0;padding:0;box-sizing:border-box;}' +
              'html{width:240mm;font-family:"Microsoft YaHei","SimHei","SimSun",sans-serif;font-size:10px;line-height:1.4;color:#000;background:#fff;}' +
              'body{padding:1.5mm 4mm;width:100%;}' +
              'table{width:100%;border-collapse:collapse;table-layout:fixed;}' +
              'th,td{border:1px solid #999;padding:1.5px 3px;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
              'th{background:#f5f5f5;font-size:9px;font-weight:bold;text-align:center;}' +
              'tbody tr td:nth-child(2){font-size:16px !important;font-weight:bold !important;color:#c00 !important;}' +
              'b{font-weight:bold;}' +
              '.ph{text-align:center;border-bottom:double 2px #000;padding-bottom:1.5mm;margin-bottom:1.5mm;}' +
              '.ph h1{font-size:16px;letter-spacing:8px;margin:0;}' +
              '.ph .sub{font-size:8px;color:#666;letter-spacing:2px;}' +
              '.info-row{display:flex;font-size:9px;line-height:1.5;}' +
              '.info-row>div{flex:1;white-space:nowrap;}' +
              '.addr-box{background:#fafafa;padding:1.5px 2px;font-size:9px;margin:1mm 0;display:flex;flex-wrap:wrap;gap:0 6px;}' +
              '.addr-box>div{font-size:9px;}' +
              '.sum-row{display:flex;font-size:9.5px;padding:0.5mm 0;}' +
              '.sum-row .l{flex:1;color:#555;}' +
              '.sum-row .r{font-family:"Courier New",monospace,text-align:right;}' +
              '.total-row{border-top:double 2.5px #000;margin-top:0.5mm;padding-top:1mm;font-size:12px;font-weight:bold;}' +
              '.balance-bar{margin-top:1mm;padding-top:1mm;border-top:1px dashed #ccc;font-size:9px;display:flex;align-items:center;gap:4px;}' +
              '.balance-val{font-family:"Courier New",monospace;font-size:12px;font-weight:bold;color:#c00;}' +
              '.footer-row{display:flex;justify-content:space-between;margin-top:1.5mm;padding-top:1.5mm;border-top:1px dashed #999;font-size:8.5px;}' +
              '.barcode-text{font-family:"Courier New",cursive;font-size:11px;letter-spacing:1px;}';
          }

          setTimeout(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 3000);
          }, 150);
        } catch (measureErr) {
          console.warn('[打印] 高度测量失败', measureErr);
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
          setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 3000);
        }

        // ★ 打印后保存记录
        savePrintRecord(currentOrder);
        
      }, 200);

      message.success('已发送到打印机');

      if (orders.length > 1 && currentOrderIdx < orders.length - 1) {
        setTimeout(() => setCurrentOrderIdx(currentOrderIdx + 1), 500);
      }
    } catch (err: any) {
      console.error('[打印] 失败:', err);
      message.error('打印失败，请重试');
    }
  };

  /** 保存打印记录到后端 */
  const savePrintRecord = (order: any) => {
    const operatorInfo = JSON.parse(localStorage.getItem('jlm_user_info') || '{}');
    savePrintLog({
      orderId: order.id,
      orderNo: order.order_no,
      printType,
      shipperName: shipperName || defaultShipper || '',
      reviewerName: reviewerName || '',
      receiverName,
      operatorId: operatorInfo.id || 0,
      operatorName: operatorInfo.username || operatorInfo.real_name || '管理员',
    }).then(res => {
      if (res.code === 0) {
        console.log(`[打印记录] 订单 ${order.order_no} 已保存`);
      }
    }).catch(e => {
      console.error('[打印记录] 保存失败:', e);
    });
  };

  const currentOrder = orders[currentOrderIdx] || null;

  return (
    <Modal
      title={
        <span>
          <PrinterOutlined style={{ color: '#e94560', marginRight: 8 }} />
          打印单据
        </span>
      }
      open={visible}
      onCancel={handleClose}
      width={820}
      footer={null}
      destroyOnClose
    >
      {/* ====== 工具栏 ====== */}
      {!loading && orders.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#fafafa', borderRadius: 8 }}>
          {/* 单据类型选择 */}
          <div style={{ marginBottom: 10, fontSize: 13 }}>
            单据类型：
            <Radio.Group value={printType} onChange={(e: any) => setPrintType(e.target.value)} optionType="button" buttonStyle="solid" style={{ marginLeft: 6 }}>
              {PRINT_TYPE_OPTIONS.map((opt: any) => (
                <Radio.Button key={opt.key} value={opt.key}>{opt.icon} {opt.label}</Radio.Button>
              ))}
            </Radio.Group>
          </div>

          {/* 签名人信息栏 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            
            {/* 发货人（可设默认） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#555' }}>发货人：</span>
              <Input
                value={shipperName}
                onChange={(e) => setShipperName(e.target.value)}
                placeholder="输入姓名"
                size="small"
                style={{ width: 90 }}
              />
              <Button
                type="link" size="small"
                icon={<SettingOutlined />}
                onClick={() => setShowSettings(!showSettings)}
                title="设为默认"
                style={{ padding: 0 }}
              >
                默认
              </Button>
              {showSettings && (
                <Popconfirm
                  title={`确定将"${shipperName}"设为系统默认发货人？`}
                  onConfirm={handleSaveDefaultShipper}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" size="small" style={{ color: '#52c41a', padding: 0 }}>确认保存</Button>
                </Popconfirm>
              )}
              {defaultShipper && (
                <span style={{ fontSize: 11, color: '#999' }}>({defaultShipper})</span>
              )}
            </div>

            {/* 审核人（选填） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#555' }}>审核：</span>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="选填"
                size="small"
                style={{ width: 80 }}
              />
            </div>

            {/* 取货人（必填） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#e94560', fontWeight: 600 }}>
                <UserOutlined /> 取货人<span style={{ color: '#f00' }}>*</span>：
              </span>
              <Input
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="请输入取货人姓名（必填）"
                size="small"
                status={!receiverName ? 'error' : undefined}
                style={{ width: 150 }}
                onPressEnter={() => doPrintWithSave()}
              />
            </div>
          </div>

          {/* 多单提示 */}
          {orders.length > 1 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#e94560' }}>
              当前第 {currentOrderIdx + 1}/{orders.length} 单 · 订单号: {currentOrder?.order_no}
            </div>
          )}
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <PrinterOutlined spin style={{ fontSize: 36, color: '#e94560' }} />
          <p style={{ marginTop: 12, color: '#999' }}>正在加载订单数据...</p>
        </div>
      )}

      {/* 打印预览区域 */}
      {!loading && currentOrder && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              overflow: previewMode ? 'auto' : 'hidden',
              minHeight: 300,
              maxHeight: previewMode ? 550 : 320,
              background: '#f0f0f0',
              borderRadius: 6,
              padding: previewMode ? 20 : 16,
            }}
          >
            <div
              style={{
                background: '#fff',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                transform: previewMode ? 'none' : 'scale(0.42)',
                transformOrigin: 'top center',
                transition: 'transform 0.25s ease',
                width: '250mm',
                height: '180mm',
                maxWidth: '100%',
                maxHeight: previewMode ? 600 : 320,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <PrintTemplate
                ref={templateRef}
                order={{
                  ...currentOrder,
                  _extra: { shipperName: shipperName || defaultShipper || '', reviewerName, receiverName }
                }}
                type={printType as any}
                showBarcode
              />
            </div>
          </div>

          {/* 底部操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Space>
              <Button key="close" onClick={handleClose}>关闭</Button>
              <Button key="prev" disabled={currentOrderIdx <= 0 || orders.length <= 1}
                onClick={() => setCurrentOrderIdx(currentOrderIdx - 1)}>
                &larr; 上一单 ({currentOrderIdx + 1}/{orders.length})
              </Button>
              <Button key="next" disabled={currentOrderIdx >= orders.length - 1 || orders.length <= 1}
                onClick={() => setCurrentOrderIdx(currentOrderIdx + 1)}>
                下一单 &rarr;
              </Button>
              <Button key="preview" icon={<EyeOutlined />} onClick={() => setPreviewMode(!previewMode)}>
                {previewMode ? '退出预览' : '预览'}
              </Button>
              <Button
                key="print" type="primary" icon={<PrinterOutlined />}
                onClick={handlePrintClick}
                loading={loading}
                disabled={!currentOrder}
                danger={!receiverName.trim()}
              >
                {receiverName.trim() ? `立即打印${orders.length > 1 ? ` (${orders.length}单)` : ''}` : '⚠ 请先填写取货人'}
              </Button>
            </Space>
          </div>
        </>
      )}
    </Modal>
  );
};

// 用计数器实现外部触发
export function usePrintModal() {
  const [trigger, setTrigger] = useState<number | null>(null);
  const [batchIds, setBatchIds] = useState<number[]>([]);

  return {
    triggerOpen: (ids: number | number[]) => {
      const arr = Array.isArray(ids) ? ids : [ids];
      setBatchIds(arr);
      setTrigger(Date.now());
    },
    render: (fetchOrderDetail: (id: number) => Promise<any>) =>
      <PrintModal fetchOrderDetail={fetchOrderDetail} openTrigger={trigger} orderIds={batchIds} />,
  };
}

export default PrintModal;
