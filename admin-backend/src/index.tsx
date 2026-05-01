import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import App from './App';
import { store } from './store';
import './styles/index.css';

// 设置dayjs本地化
dayjs.locale('zh-cn');

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              // 主色调 - 现代绿色
              colorPrimary: '#10b981',
              colorPrimaryHover: '#059669',
              colorPrimaryActive: '#047857',
              colorPrimaryBg: '#d1fae5',
              colorPrimaryBgHover: '#a7f3d0',
              
              // 辅助色
              colorSuccess: '#10b981',
              colorWarning: '#f97316',
              colorError: '#ef4444',
              colorInfo: '#3b82f6',
              
              // 圆角
              borderRadius: 8,
              borderRadiusLG: 12,
              borderRadiusSM: 6,
              borderRadiusXS: 4,
              
              // 文字
              colorText: '#111827',
              colorTextSecondary: '#6b7280',
              colorTextTertiary: '#9ca3af',
              
              // 背景
              colorBgContainer: '#ffffff',
              colorBgElevated: '#ffffff',
              colorBgLayout: '#f8fafc',
              colorBgSpotlight: '#111827',
              
              // 边框
              colorBorder: '#e5e7eb',
              colorBorderSecondary: '#f3f4f6',
              
              // 阴影
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
              boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
              
              // 字体
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
              fontSize: 14,
              fontSizeLG: 16,
              fontSizeSM: 12,
            },
            components: {
              Layout: {
                headerBg: 'rgba(255, 255, 255, 0.9)',
                headerHeight: 72,
                siderBg: '#ffffff',
                triggerBg: '#f3f4f6',
                triggerColor: '#6b7280',
              },
              Menu: {
                itemSelectedBg: 'rgba(16, 185, 129, 0.1)',
                itemSelectedColor: '#059669',
                itemHoverBg: 'rgba(16, 185, 129, 0.05)',
                itemHoverColor: '#10b981',
                itemActiveBg: 'rgba(16, 185, 129, 0.08)',
                itemBorderRadius: 8,
                itemHeight: 48,
              },
              Card: {
                borderRadius: 12,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
                colorBorderSecondary: '#e5e7eb',
              },
              Button: {
                borderRadius: 8,
                borderRadiusLG: 10,
                borderRadiusSM: 6,
              },
              Input: {
                borderRadius: 8,
                colorBorder: '#e5e7eb',
                hoverBorderColor: '#10b981',
                activeBorderColor: '#059669',
              },
              Table: {
                borderRadius: 12,
                headerBg: '#f9fafb',
                headerColor: '#374151',
                rowHoverBg: 'rgba(16, 185, 129, 0.02)',
              },
              Tag: {
                borderRadius: 9999,
              },
              Badge: {
                colorError: '#ef4444',
                colorWarning: '#f97316',
              },
              Tooltip: {
                borderRadius: 8,
              },
              Modal: {
                borderRadius: 16,
                contentBg: '#ffffff',
                headerBg: '#ffffff',
              },
              Dropdown: {
                borderRadius: 12,
                controlItemBgHover: 'rgba(16, 185, 129, 0.08)',
              },
              Select: {
                borderRadius: 8,
                controlItemBgActive: 'rgba(16, 185, 129, 0.1)',
                controlItemBgHover: 'rgba(16, 185, 129, 0.05)',
              },
              DatePicker: {
                borderRadius: 8,
                controlItemBgActive: 'rgba(16, 185, 129, 0.1)',
              },
              Tabs: {
                borderRadius: 8,
                colorPrimary: '#10b981',
                itemSelectedColor: '#059669',
              },
              Pagination: {
                borderRadius: 8,
                itemActiveBg: 'rgba(16, 185, 129, 0.1)',
              },
              Switch: {
                colorPrimary: '#10b981',
              },
              Slider: {
                colorPrimary: '#10b981',
              },
              Progress: {
                defaultColor: '#10b981',
                colorSuccess: '#10b981',
              },
            },
          }}
        >
          <App />
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);