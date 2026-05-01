/**
 * 电子书在线阅读器组件
 * 支持 PDF（iframe嵌入）、TXT（纯文本展示）、其他格式（下载提示）
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
  Tooltip,
  Tag,
  Select,
  Slider,
  Progress,
  message,
} from 'antd';
import {
  CloseOutlined,
  DownloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ReadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface EbookReaderProps {
  visible: boolean;
  bookId: string;
  bookTitle?: string;
  bookFormat?: string;
  fileUrl?: string;
  onClose: () => void;
}

const EbookReader: React.FC<EbookReaderProps> = ({
  visible,
  bookId,
  bookTitle,
  bookFormat,
  fileUrl,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');
  const [readType, setReadType] = useState<'text' | 'file' | 'unsupported'>('file');
  const [format, setFormat] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [readProgress, setReadProgress] = useState(0);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const readerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && bookId) {
      loadBookContent();
    } else {
      // 关闭时重置
      setContent('');
      setError('');
      setLoading(true);
      setReadProgress(0);
    }
  }, [visible, bookId]);

  // 跟踪阅读进度
  useEffect(() => {
    if (readType !== 'text') return;
    const handleScroll = () => {
      const container = textContainerRef.current;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = scrollHeight > clientHeight
        ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
        : 100;
      setReadProgress(progress);
    };
    const container = textContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [readType]);

  const loadBookContent = async () => {
    setLoading(true);
    setError('');
    try {
      // 如果有 fileUrl 且是PDF，直接用文件URL（通过静态服务访问）
      if (fileUrl) {
        const ext = (bookFormat || '').toLowerCase();
        if (['pdf'].includes(ext)) {
          setReadType('file');
          setFormat(ext);
          setLoading(false);
          return;
        }
      }

      // 调用阅读API
      const response = await fetch(`/api/school/books/${bookId}/read`);
      const result = await response.json();

      if (result.code !== 0) {
        setError(result.message || '加载失败');
        setLoading(false);
        return;
      }

      const data = result.data;
      setFormat(data.format || bookFormat || '');

      if (data.type === 'text') {
        setReadType('text');
        setContent(data.content);
      } else if (data.type === 'file') {
        setReadType('file');
        // 更新fileUrl（从API获取最新URL）
      } else {
        setReadType('unsupported');
      }
    } catch (err) {
      setError('加载书籍失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.open(`/api/school/books/${bookId}/download`, '_blank');
  };

  const handleZoomIn = () => setFontSize((s) => Math.min(s + 2, 32));
  const handleZoomOut = () => setFontSize((s) => Math.max(s - 2, 12));

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleProgressJump = (value: number) => {
    const container = textContainerRef.current;
    if (!container) return;
    const scrollable = container.scrollHeight - container.clientHeight;
    container.scrollTop = (value / 100) * scrollable;
    setReadProgress(value);
  };

  const formatLabel = (f: string) => {
    const labels: Record<string, string> = {
      pdf: 'PDF', txt: 'TXT', epub: 'EPUB',
      doc: 'DOC', docx: 'DOCX', mobi: 'MOBI',
    };
    return labels[f?.toLowerCase()] || f?.toUpperCase() || '未知';
  };

  // 主题样式映射
  const themeStyles: Record<string, React.CSSProperties> = {
    light: { background: '#ffffff', color: '#1a1a1a' },
    sepia: { background: '#f4ecd8', color: '#5b4636' },
    dark: { background: '#1e1e2e', color: '#cdd6f4' },
  };

  const currentTheme = themeStyles[theme];

  // TXT阅读器
  const renderTextReader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 阅读进度条 */}
      <div style={{
        padding: '8px 20px',
        background: currentTheme.background,
        borderBottom: `1px solid ${theme === 'dark' ? '#313244' : theme === 'sepia' ? '#e0d5b7' : '#f0f0f0'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <Progress
          percent={readProgress}
          size="small"
          style={{ flex: 1, marginBottom: 0 }}
          strokeColor={theme === 'dark' ? '#89b4fa' : '#e94560'}
        />
        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap', color: currentTheme.color }}>
          {readProgress}%
        </Text>
      </div>

      {/* 文本内容区域 */}
      <div
        ref={textContainerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '40px 60px',
          ...currentTheme,
          transition: 'background 0.3s, color 0.3s',
        }}
      >
        <div style={{
          maxWidth: 800,
          margin: '0 auto',
          fontSize: `${fontSize}px`,
          lineHeight: `${lineHeight}`,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        }}>
          {content}
        </div>
      </div>
    </div>
  );

  // PDF阅读器（iframe）
  const renderPdfReader = () => {
    const pdfUrl = fileUrl || '';
    return (
      <div style={{ height: '100%', width: '100%' }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 8,
            }}
            title="PDF阅读器"
          />
        ) : (
          <Empty description="PDF文件地址不可用" />
        )}
      </div>
    );
  };

  // 不支持在线阅读的格式
  const renderUnsupported = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 24,
    }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" align="center">
            <Text type="secondary">
              {formatLabel(format)} 格式暂不支持在线阅读
            </Text>
            <Text type="secondary">
              您可以下载后使用本地应用打开
            </Text>
          </Space>
        }
      />
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        size="large"
        onClick={handleDownload}
      >
        下载电子书
      </Button>
    </div>
  );

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={isFullscreen ? '100vw' : '90vw'}
      style={isFullscreen ? { top: 0, padding: 0, margin: 0 } : { top: 20 }}
      styles={isFullscreen ? {
        body: { height: 'calc(100vh - 0px)', padding: 0 },
        header: { display: 'none' },
        content: { padding: 0 },
      } : {
        body: { height: 'calc(100vh - 160px)', padding: 0 },
        content: { padding: 0 },
      }}
      closable={false}
      destroyOnClose
      footer={null}
      title={null}
      wrapClassName="ebook-reader-modal"
    >
      <div
        ref={readerRef}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
        }}
      >
        {/* 顶部工具栏 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#fff',
          flexShrink: 0,
        }}>
          {/* 左侧：书名信息 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <ReadOutlined style={{ fontSize: 20, color: '#e94560' }} />
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ color: '#fff', fontSize: 15, display: 'block' }} ellipsis>
                {bookTitle || '电子书阅读'}
              </Text>
              <Space size={4}>
                <Tag color="red" style={{ margin: 0, fontSize: 11 }}>{formatLabel(format)}</Tag>
                {readType === 'text' && <Tag color="green" style={{ margin: 0, fontSize: 11 }}>在线阅读</Tag>}
                {readType === 'file' && format === 'pdf' && <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>PDF预览</Tag>}
              </Space>
            </div>
          </div>

          {/* 右侧：工具按钮 */}
          <Space size={4}>
            {/* 文本阅读器专属工具 */}
            {readType === 'text' && (
              <>
                <Tooltip title="缩小字体">
                  <Button
                    type="text"
                    icon={<ZoomOutOutlined />}
                    onClick={handleZoomOut}
                    style={{ color: '#fff' }}
                  />
                </Tooltip>
                <Select
                  value={fontSize}
                  onChange={setFontSize}
                  style={{ width: 70 }}
                  size="small"
                  options={[
                    { value: 12, label: '12px' },
                    { value: 14, label: '14px' },
                    { value: 16, label: '16px' },
                    { value: 18, label: '18px' },
                    { value: 20, label: '20px' },
                    { value: 24, label: '24px' },
                    { value: 28, label: '28px' },
                    { value: 32, label: '32px' },
                  ]}
                />
                <Tooltip title="放大字体">
                  <Button
                    type="text"
                    icon={<ZoomInOutlined />}
                    onClick={handleZoomIn}
                    style={{ color: '#fff' }}
                  />
                </Tooltip>

                {/* 分割线 */}
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                {/* 阅读主题 */}
                <Tooltip title="切换阅读主题">
                  <Select
                    value={theme}
                    onChange={setTheme}
                    style={{ width: 90 }}
                    size="small"
                    options={[
                      { value: 'light', label: '☀️ 白天' },
                      { value: 'sepia', label: '📖 护眼' },
                      { value: 'dark', label: '🌙 夜间' },
                    ]}
                  />
                </Tooltip>

                {/* 行距 */}
                <Tooltip title={`行距: ${lineHeight}`}>
                  <Select
                    value={lineHeight}
                    onChange={setLineHeight}
                    style={{ width: 70 }}
                    size="small"
                    options={[
                      { value: 1.4, label: '紧凑' },
                      { value: 1.6, label: '适中' },
                      { value: 1.8, label: '舒适' },
                      { value: 2.0, label: '宽松' },
                      { value: 2.4, label: '超宽' },
                    ]}
                  />
                </Tooltip>
              </>
            )}

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

            <Tooltip title="下载">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                style={{ color: '#fff' }}
              />
            </Tooltip>
            <Tooltip title="重新加载">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={loadBookContent}
                style={{ color: '#fff' }}
              />
            </Tooltip>
            <Tooltip title={isFullscreen ? '退出全屏' : '全屏阅读'}>
              <Button
                type="text"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
                style={{ color: '#fff' }}
              />
            </Tooltip>
            <Tooltip title="关闭">
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={onClose}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          </Space>
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: 16,
            }}>
              <Spin size="large" />
              <Text type="secondary">正在加载电子书内容...</Text>
            </div>
          ) : error ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: 16,
            }}>
              <Empty description={error} />
              <Button type="primary" onClick={loadBookContent}>重新加载</Button>
            </div>
          ) : readType === 'text' ? (
            renderTextReader()
          ) : readType === 'file' && format === 'pdf' ? (
            renderPdfReader()
          ) : (
            renderUnsupported()
          )}
        </div>
      </div>

      <style>{`
        .ebook-reader-modal .ant-modal {
          border-radius: 8px;
          overflow: hidden;
        }
        .ebook-reader-modal .ant-modal-close {
          display: none;
        }
        /* 自定义滚动条 */
        .ebook-reader-modal ::-webkit-scrollbar {
          width: 8px;
        }
        .ebook-reader-modal ::-webkit-scrollbar-track {
          background: transparent;
        }
        .ebook-reader-modal ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .ebook-reader-modal ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </Modal>
  );
};

export default EbookReader;
