/**
 * 业绩排行榜管理 - 后台管理页面
 * 功能：查看/编辑排行榜数据、展示设置、手动同步
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Space, Input, Select, Tag, Card, Statistic, Row, Col,
  Form, Modal, InputNumber, Switch, message, Popconfirm, Tooltip, Avatar,
  Typography, Divider, Badge, Empty, Spin, Tabs, Alert, ColorPicker,
  List
} from 'antd';
import {
  TrophyOutlined, CrownOutlined, SettingOutlined, SyncOutlined,
  SearchOutlined, EditOutlined, EyeInvisibleOutlined, EyeOutlined,
  PushpinOutlined, ReloadOutlined, SaveOutlined, CheckCircleOutlined,
  FireOutlined, StarOutlined, ArrowUpOutlined, ArrowDownOutlined
} from '@ant-design/icons';
import { rankingApi, RankingConfig, RankingSettings } from '../api/rankingApi';
import { AgentLevel } from '../types/commission';

const { Text, Title } = Typography;
const { Option } = Select;

// 等级颜色映射
const levelColors: Record<number, string> = {
  [AgentLevel.MEMBER]: '#8c8c8c',
  [AgentLevel.MODEL_AGENT]: '#52c41a',
  [AgentLevel.AGENT]: '#1890ff',
  [AgentLevel.WHOLESALER]: '#fa8c16',
  [AgentLevel.CHIEF_COMPANY]: '#e94560',
  [AgentLevel.GROUP_DIVISION]: '#722ed1',
};

const levelLabels: Record<number, string> = {
  [AgentLevel.MEMBER]: '会员',
  [AgentLevel.MODEL_AGENT]: '打版代言人',
  [AgentLevel.AGENT]: '代理商',
  [AgentLevel.WHOLESALER]: '批发商',
  [AgentLevel.CHIEF_COMPANY]: '首席分公司',
  [AgentLevel.GROUP_DIVISION]: '集团事业部',
};

const RankingManagement: React.FC = () => {
  // 列表数据状态
  const [data, setData] = useState<RankingConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // 搜索/筛选
  const [searchText, setSearchText] = useState('');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'all'>('month');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // 设置面板
  const [settings, setSettings] = useState<RankingSettings>({
    title: '业绩排行',
    show_count: '8',
    period: 'month',
    auto_refresh: '1',
    enable_top3: '1',
    background_color: '#fffbf0',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // 编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RankingConfig | null>(null);
  const [editForm] = Form.useForm();

  // 加载列表数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rankingApi.getList({
        page,
        pageSize,
        search: searchText,
        period,
      });
      setData(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error('加载失败:', e);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchText, period]);

  // 加载设置
  const fetchSettings = useCallback(async () => {
    try {
      const s = await rankingApi.getSettings();
      setSettings(prev => ({ ...prev, ...s }));
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // 同步数据
  const handleSync = async () => {
    Modal.confirm({
      title: '同步排行榜数据',
      content: `将从数据库实时计算${period === 'month' ? '本月' : period === 'quarter' ? '本季度' : '全部'}业绩并更新排名配置，确认操作？`,
      icon: <SyncOutlined spin />,
      okText: '开始同步',
      cancelText: '取消',
      onOk: async () => {
        const hide = message.loading('正在同步...', 0);
        try {
          const result = await rankingApi.syncData({ limit: 100, period });
          hide();
          message.success(`同步完成！已处理 ${result.synced} 条记录`);
          setLastSyncTime(new Date().toLocaleString());
          fetchData();
        } catch (e) {
          hide();
          message.error('同步失败');
        }
      },
    });
  };

  // 编辑用户配置
  const handleEdit = (record: RankingConfig) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      display_name: record.display_name || '',
      highlight_color: record.highlight_color || '#e94560',
      badge_text: record.badge_text || '',
      is_pinned: Boolean(record.is_pinned),
      is_hidden: Boolean(record.is_hidden),
      custom_note: record.custom_note || '',
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingRecord) return;

      await rankingApi.updateConfig(editingRecord.user_id, values);
      message.success('保存成功');
      setEditModalVisible(false);
      fetchData();
    } catch (e) {
      if (e !== false) message.error('保存失败');
    }
  };

  // 切换隐藏/显示
  const toggleHide = async (record: RankingConfig) => {
    try {
      await rankingApi.updateConfig(record.user_id, {
        is_hidden: record.is_hidden ? 0 : 1,
      });
      message.success(record.is_hidden ? '已恢复显示' : '已隐藏');
      fetchData();
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 保存展示设置
  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      await rankingApi.saveSettings(settings);
      message.success('设置已保存');
    } catch (e) {
      message.error('保存设置失败');
    } finally {
      setSettingsLoading(false);
    }
  };

  // 排名徽章渲染
  const renderRankBadge = (index: number) => {
    if (index === 0) return <span style={{ fontSize: 20 }}>🥇</span>;
    if (index === 1) return <span style={{ fontSize: 20 }}>🥈</span>;
    if (index === 2) return <span style={{ fontSize: 20 }}>🥉</span>;
    return (
      <Tag style={{ fontWeight: 700, minWidth: 36, textAlign: 'center', borderRadius: '50%' }}>
        #{index + 1}
      </Tag>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 70,
      render: (_: unknown, __: unknown, index: number) => renderRankBadge(index),
    },
    {
      title: '用户',
      key: 'user',
      width: 200,
      render: (_: unknown, record: RankingConfig) => (
        <Space>
          <Avatar src={record.avatar_url} size={40} style={{ flexShrink: 0 }}>
            {(record.nickname || record.real_name || '?').charAt(0)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.display_name || record.nickname || record.real_name || record.username || '匿名'}
            </div>
            <div style={{ color: '#999', fontSize: 12 }}>{record.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '等级',
      dataIndex: 'agent_level',
      width: 90,
      render: (level: number) => (
        <Tag color={levelColors[level]}>{levelLabels[level]}</Tag>
      ),
    },
    {
      title: period === 'month' ? '本月收益' : period === 'quarter' ? '季度收益' : '累计收益',
      dataIndex: 'period_income',
      align: 'right' as const,
      width: 130,
      sorter: (a: RankingConfig, b: RankingConfig) => a.period_income - b.period_income,
      render: (val: number) => (
        <Text strong style={{ color: '#e94560', fontSize: 15 }}>¥{Number(val).toFixed(2)}</Text>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'period_orders',
      align: 'center' as const,
      width: 80,
      render: (val: number) => val || 0,
    },
    {
      title: '直推人数',
      dataIndex: 'direct_count',
      align: 'center' as const,
      width: 80,
      render: (val: number) => val || 0,
    },
    {
      title: '高亮色',
      dataIndex: 'highlight_color',
      width: 80,
      render: (color: string) => (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: color, border: '2px solid #f0f0f0',
          margin: '4px auto',
        }} />
      ),
    },
    {
      title: '标签',
      dataIndex: 'badge_text',
      width: 80,
      render: (text: string | null) => text ? <Tag color="gold">{text}</Tag> : '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: unknown, record: RankingConfig) => (
        <Space direction="vertical" size={2}>
          {record.is_pinned ? <Badge status="success" text="置顶" /> : null}
          {record.is_hidden ? <Tag color="default">隐藏</Tag> : <Tag color="green">显示</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: unknown, record: RankingConfig) => (
        <Space size={4}>
          <Tooltip title="编辑配置">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title={record.is_hidden ? '恢复显示' : '隐藏'}>
            <Button type="link" size="small"
              icon={record.is_hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => toggleHide(record)}
            />
          </Tooltip>
          {record.is_pinned ? (
            <Tag color="#e94560">📌 置顶</Tag>
          ) : null}
        </Space>
      ),
    },
  ];

  // ===== 渲染 =====
  return (
    <div className="ranking-management">
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg,#fff7e6,#fff)', borderRadius: 16 }}>
            <Statistic title="总参与人数" value={total} prefix={<TrophyOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg,#fff0f5,#fff)', borderRadius: 16 }}>
            <Statistic title="当前统计周期" value={period === 'month' ? '本月' : period === 'quarter' ? '本季度' : '全部'} prefix={<FireOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg,#f0f5ff,#fff)', borderRadius: 16 }}>
            <Statistic title="首页显示条数" value={settings.show_count} suffix="条" prefix={<StarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg,#f6ffed,#fff)', borderRadius: 16 }}>
            <Statistic title={lastSyncTime ? '上次同步' : '同步状态'} value={lastSyncTime ? lastSyncTime : '待同步'} valueStyle={{ fontSize: 14 }} />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 + 设置 */}
      <Tabs defaultActiveKey="list" size="large">
        <Tabs.TabPane tab={
          <span><TrophyOutlined /> 排行榜管理</span>
        } key="list">

          {/* 工具栏 */}
          <Card style={{ marginBottom: 16, borderRadius: 16 }} bodyStyle={{ padding: '16px 24px' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space wrap>
                  <Input
                    placeholder="搜索用户名/手机号..."
                    prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                    allowClear
                    style={{ width: 240 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onPressEnter={() => { setPage(1); fetchData(); }}
                  />
                  <Select
                    value={period}
                    onChange={(v) => { setPeriod(v); setPage(1); }}
                    style={{ width: 140 }}
                  >
                    <Option value="month">本月</Option>
                    <Option value="quarter">本季度</Option>
                    <Option value="all">全部</Option>
                  </Select>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>刷新</Button>
                  <Popconfirm
                    title={`确定要同步${period === 'month' ? '本月' : ''}数据吗？`}
                    onConfirm={handleSync}
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="primary" icon={<SyncOutlined />}>
                      同步数据
                    </Button>
                  </Popconfirm>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 数据表格 */}
          <Table
            columns={columns}
            dataSource={data}
            rowKey="user_id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              pageSizeOptions: ['10', '20', '50'],
            }}
            scroll={{ x: 1100 }}
            size="middle"
            rowClassName={(r) => r.is_hidden ? 'row-hidden' : ''}
            locale={{ emptyText: <Empty description="暂无排行数据，请点击「同步数据」" /> }}
          />

        </Tabs.TabPane>

        {/* 展示设置 Tab */}
        <Tabs.TabPane tab={
          <span><SettingOutlined /> 首页展示设置</span>
        } key="settings">
          <Card title="小程序首页排行榜配置" style={{ borderRadius: 16 }}>
            <Form layout="vertical" style={{ maxWidth: 600 }}>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="排行榜标题">
                    <Input
                      value={settings.title}
                      onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                      placeholder="业绩排行榜"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="首页显示数量（条）">
                    <InputNumber
                      min={3} max={20}
                      value={parseInt(settings.show_count) || 8}
                      onChange={(v) => setSettings({ ...settings, show_count: String(v || 8) })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="默认统计周期">
                    <Select
                      value={settings.period}
                      onChange={(v) => setSettings({ ...settings, period: v })}
                    >
                      <Option value="month">本月</Option>
                      <Option value="quarter">本季度</Option>
                      <Option value="all">累计</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="模块背景色">
                    <ColorPicker
                      value={settings.background_color}
                      onChange={(color) => setSettings({ ...settings, background_color: color.toHexString() })}
                      presets={[
                        { label: '暖金', colors: ['#fffbf0', '#fff7e6', '#fff1f0'] },
                        { label: '冷蓝', colors: ['#f0f5ff', '#e6fffb', '#f9f0ff'] },
                        { label: '纯白', colors: ['#ffffff', '#fafafa', '#f5f5f5'] },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="前三名领奖台">
                    <Switch
                      checked={settings.enable_top3 === '1'}
                      onChange={(v) => setSettings({ ...settings, enable_top3: v ? '1' : '0' })}
                      checkedChildren="开" unCheckedChildren="关"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="自动刷新">
                    <Switch
                      checked={settings.auto_refresh === '1'}
                      onChange={(v) => setSettings({ ...settings, auto_refresh: v ? '1' : '0' })}
                      checkedChildren="开" unCheckedChildren="关"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={settingsLoading}
                    onClick={handleSaveSettings}
                    size="large"
                  >
                    保存设置
                  </Button>
                  <Alert
                    type="info"
                    showIcon
                    message="设置将实时影响小程序首页的排行榜展示效果"
                    style={{ maxWidth: 400 }}
                  />
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {/* 操作说明 */}
          <Card title="操作说明" style={{ marginTop: 16, borderRadius: 16 }} size="small">
            <List
              size="small"
              dataSource={[
                { desc: '点击「同步数据」按钮从数据库重新计算排名并写入配置表', icon: <SyncOutlined /> },
                { desc: '编辑单个用户的展示名称、颜色、徽章等个性化配置', icon: <EditOutlined /> },
                { desc: '隐藏的用户不会在小程序首页排行榜中展示', icon: <EyeInvisibleOutlined /> },
                { desc: '置顶的用户会固定在榜单前列', icon: <PushpinOutlined /> },
                { desc: '展示设置项会影响小程序首页排行榜模块的呈现方式', icon: <SettingOutlined /> },
              ]}
              renderItem={item => (
                <List.Item>
                  <Space><span style={{ color: '#e94560' }}>{item.icon}</span> <span>{item.desc}</span></Space>
                </List.Item>
              )}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* 编辑弹窗 */}
      <Modal
        title={`编辑排行配置 — ${editingRecord?.nickname || editingRecord?.real_name || editingRecord?.username}`}
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        width={520}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="display_name" label="展示名称">
            <Input placeholder="留空则默认使用昵称或真实姓名" maxLength={10} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="highlight_color" label="高亮色">
                <ColorPicker showText allowClear />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="badge_text" label="徽章文字">
                <Input placeholder="如：冠军、新人王" maxLength={6} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_pinned" label="置顶" valuePropName="checked">
                <Switch checkedChildren="置顶" unCheckedChildren="不置顶" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_hidden" label="隐藏" valuePropName="checked">
                <Switch checkedChildren="隐藏" unCheckedChildren="显示" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="custom_note" label="备注">
            <Input.TextArea rows={2} placeholder="内部备注信息，不在前端展示" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RankingManagement;
