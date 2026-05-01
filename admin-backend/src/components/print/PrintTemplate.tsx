/**
 * 静莱美 - 打印模板（横向版）
 * 纸张：250mm × 180mm，横向打印（landscape）
 * 字体优先用微软雅黑/黑体避免乱码
 */
import React, { forwardRef } from 'react';
import dayjs from 'dayjs';

const PRINT_TYPES: Record<string, { title: string; subTitle: string }> = {
  shipping: { title: '出 库 单', subTitle: 'JINGLAIMEI' },
  delivery:  { title: '配 送 单', subTitle: 'JINGLAIMEI' },
  invoice:   { title: '销 售 单', subTitle: 'JINGLAIMEI' },
};

const STATUS_MAP: Record<number, string> = {
  0: '待付款', 1: '待发货', 2: '已发货', 3: '已完成', 4: '已取消',
};
const PAY_MAP: Record<string, string> = { balance: '余额支付', wechat: '微信支付' };
const LEVEL_MAP: Record<number, string> = { 1:'会员',2:'代言人',3:'代理商',4:'批发商',5:'首席',6:'集团' };

// 横向180mm高，每页最多商品行数
const MAX_ROWS_PER_PAGE = 14;

interface Props { order: any; type?: string; showBarcode?: boolean; }

function splitItemsIntoPages(items: any[], maxRows: number): any[][] {
  if (items.length <= maxRows) return [items];
  const pages: any[][] = [];
  for (let i = 0; i < items.length; i += maxRows) {
    pages.push(items.slice(i, i + maxRows));
  }
  return pages;
}

const PrintTemplate = forwardRef<HTMLDivElement, Props>(
  ({ order, type = 'shipping', showBarcode = true }, ref) => {
    if (!order?.id) return null;

    const cfg = PRINT_TYPES[type] || PRINT_TYPES.shipping;
    const items = order.items || [];
    const totalAmt = parseFloat(order.total_amount) || 0;
    const discountAmt = parseFloat(order.discount_amount) || 0;
    const shipFee = parseFloat(order.shipping_fee) || 0;
    const actualAmt = parseFloat(order.actual_amount) || 0;
    const userBalance = parseFloat(order.balance) || 0;
    const levelText = LEVEL_MAP[order.agent_level] || '-';
    
    // 签名人信息（从 order._extra 获取）
    const extra = (order as any)._extra || {};
    const shipperName = extra.shipperName || '';
    const reviewerName = extra.reviewerName || '';
    const receiverName = extra.receiverName || '';
    
    // 商品较多时自动缩小字体
    const compactMode = items.length > 8;
    const itemPages = splitItemsIntoPages(items, MAX_ROWS_PER_PAGE);

    /** 渲染表格 */
    const renderTableBody = (pageItems: any[], pageIndex: number, totalPages: number) => {
      const fs = compactMode ? 8 : 9;
      const pad = compactMode ? '1px 3px' : '2px 3px';
      const rowH = compactMode ? 16 : 20;

      return (
        <table key={`p-${pageIndex}`} style={{ marginTop: 2 }}>
          <thead>
            <tr>
              <th style={{ width: '6%', padding: pad }}>#</th>
              <th style={{ width: '44%', padding: pad, textAlign: 'left' }}>商品名称</th>
              <th style={{ width: '16%', padding: pad, textAlign: 'right' }}>单价</th>
              <th style={{ width: '10%', padding: pad, textAlign: 'center' }}>数量</th>
              <th style={{ width: '16%', padding: pad, textAlign: 'right' }}>金额</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item: any, i: number) => (
              <tr key={i} style={{ height: rowH }}>
                <td style={{ textAlign: 'center', color: '#666', fontSize: fs }}>
                  {(pageIndex * MAX_ROWS_PER_PAGE) + i + 1}
                </td>
                <td style={{ textAlign: 'left', fontSize: 15, fontWeight: 'bold', color: '#c00',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }} title={item.product_name}>
                  {item.product_name || '-'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: '"Courier New",monospace', fontSize: fs }}>
                  {Number(item.unit_price || 0).toFixed(2)}
                </td>
                <td style={{ textAlign: 'center', fontSize: fs }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', fontFamily: '"Courier New",monospace', fontSize: fs }}>
                  {Number(item.subtotal || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    };

    /** 汇总区（仅最后一页） */
    const renderSummary = (isLastPage: boolean) => {
      if (!isLastPage) return null;
      return (
        <>
          {/* 汇总 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 2, fontSize: 9.5 }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.5px 3px', color: '#666' }}>商品总额</td>
                <td style={{ padding: '0.5px 3px', textAlign: 'right', fontFamily: '"Courier New",monospace' }}>
                  {totalAmt.toFixed(2)}
                </td>
              </tr>
              {discountAmt > 0 && (
                <tr>
                  <td style={{ padding: '1px 3px', color: '#c00' }}>优惠抵扣</td>
                  <td style={{ padding: '1px 3px', textAlign: 'right', fontFamily: '"Courier New",monospace', color: '#c00' }}>
                    -{discountAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              {shipFee > 0 && (
                <tr>
                  <td style={{ padding: '1px 3px', color: '#666' }}>运费</td>
                  <td style={{ padding: '1px 3px', textAlign: 'right', fontFamily: '"Courier New",monospace' }}>
                    +{shipFee.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr style={{ borderTop: 'double 2.5px #000', marginTop: 0.5 }}>
                <td style={{ padding: '2px 3px', fontSize: 12, fontWeight: 'bold' }}>实付合计</td>
                <td style={{ padding: '3px 3px 1px', textAlign: 'right',
                  fontFamily: '"Courier New",monospace', fontSize: 15, fontWeight: 'bold'
                }}>
                  ￥{actualAmt.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 余额条 */}
          <div className="balance-bar" style={{ background: '#fff3e0', padding: '4px 6px', borderRadius: 3, border: '1.5px solid #e94560' }}>
            <span style={{ color: '#666', fontSize: 10 }}>【会员余额】</span>
            <span className="balance-val" style={{ fontSize: 17, fontWeight: 'bold', color: '#e94560' }}>￥{userBalance.toFixed(2)}</span>
            <span style={{ fontSize: 8, color: '#aaa' }}>（实时）</span>
          </div>

          {/* 底部 */}
          <div className="footer-row">
            <div>
              {showBarcode && <div className="barcode-text">|{order.order_no}|</div>}
              <div>买家：{order.real_name || order.username || '-'}（{levelText}）</div>
              {order.shipping_no && <div>物流：{order.shipping_no}</div>}
              {order.payment_method && <div>支付：{PAY_MAP[order.payment_method] || order.payment_method}</div>}
            </div>
            <div style={{ display: 'flex', gap: 18, fontSize: 9 }}>
              <span>发货人：<span style={{ borderBottom: '1px solid #333' }}>{shipperName || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}</span></span>
              <span>审核人：<span style={{ borderBottom: '1px solid #333' }}>{reviewerName || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}</span></span>
              <span>取货人：<span style={{ borderBottom: '1px solid #333', fontWeight: 'bold', color: '#000' }}>{receiverName || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}</span></span>
            </div>
          </div>
        </>
      );
    };

    return (
      <div ref={ref} style={{ width: '100%' }}>
        {itemPages.map((pageItems, pi) => (
          <div
            key={pi}
            style={itemPages.length > 1 ? {
              pageBreakAfter: pi < itemPages.length - 1 ? 'always' : 'auto',
              marginBottom: pi < itemPages.length - 1 ? 4 : 0,
            } : undefined}
          >
            {/* 表头 */}
            <div className="ph">
              <h1>{cfg.title}</h1>
              <div className="sub">
                {cfg.subTitle}
                {itemPages.length > 1 && <span>　第 {pi + 1}/{itemPages.length} 页</span>}
              </div>
            </div>

            {/* 订单信息 */}
            <div className="info-row">
              <div><b>单号：</b>{order.order_no}</div>
              <div><b>状态：</b>
                <span style={{
                  border: '1px solid #333', padding: '0 3px', fontSize: 8,
                  background: order.order_status === 3 ? '#eee' : 'transparent',
                }}>{STATUS_MAP[order.order_status] || '-'}</span>
              </div>
              <div><b>日期：</b>{dayjs(order.order_time).format('YYYY/MM/DD HH:mm')}</div>
            </div>

            {/* 收货地址 */}
            <div className="addr-box">
              <div><b>收货人：</b>{order.receiver_name || '-'}</div>
              <div><b>电　话：</b>{order.receiver_phone || '-'}</div>
              <div style={{ flex: '1 1 120px', minWidth: 100 }}>
                <b>地　址：</b>{order.receiver_address || '-'}
              </div>
            </div>

            {/* 分割线 */}
            <div style={{ borderTop: '1.5px solid #000', margin: '2px 0' }} />

            {/* 商品表格 */}
            {renderTableBody(pageItems, pi, itemPages.length)}

            {/* 汇+底部（仅最后页） */}
            {renderSummary(pi === itemPages.length - 1)}
          </div>
        ))}
      </div>
    );
  }
);

PrintTemplate.displayName = 'PrintTemplate';
export default PrintTemplate;
