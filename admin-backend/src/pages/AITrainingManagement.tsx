import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Input, InputNumber,
  Select, Switch, Tag, Space, Popconfirm, message, Empty,
  Row, Col, Statistic, Tooltip, Badge, Progress, Typography
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  TrophyOutlined, ExperimentOutlined, BookOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined,
  StarOutlined, BarChartOutlined
} from '@ant-design/icons';
import {
  levelApi, questionApi, scenarioApi, scriptApi, dashboardApi,
  AITrainingLevel, AITrainingQuestion, AITrainingScenario,
  AITrainingScript, AIRankingItem
} from '../api/aiTrainingApi';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

// ============ 主题色 ============
const THEME = {
  primary: '#e94560',
  dark: '#1a1a2e',
  purple: '#722ED1',
  purpleLight: '#B37FEB',
  gradient: 'linear-gradient(135deg, #722ED1 0%, #B37FEB 100%)',
  bg: '#f8f9fe',
};

// ============ 关卡管理 Tab ============
const LevelManagement: React.FC = () => {
  const [levels, setLevels] = useState<AITrainingLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AITrainingLevel | null>(null);
  const [expandedLevelId, setExpandedLevelId] = useState<number | null>(null);
  const [levelQuestions, setLevelQuestions] = useState<AITrainingQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<AITrainingQuestion | null>(null);
  const [form] = Form.useForm();
  const [questionForm] = Form.useForm();

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await levelApi.getLevels();
      setLevels(Array.isArray(res) ? res : []);
    } catch (err: any) {
      message.error(err?.message || '获取关卡列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const fetchQuestions = async (levelId: number) => {
    try {
      const res = await questionApi.getQuestions(levelId);
      setLevelQuestions(Array.isArray(res) ? res : []);
    } catch {
      setLevelQuestions([]);
    }
  };

  const handleExpand = (expanded: boolean, record: AITrainingLevel) => {
    if (expanded) {
      setExpandedLevelId(record.id!);
      fetchQuestions(record.id!);
    } else {
      setExpandedLevelId(null);
      setLevelQuestions([]);
    }
  };

  const openLevelModal = (record?: AITrainingLevel) => {
    setEditingLevel(record || null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSaveLevel = async () => {
    try {
      const values = await form.validateFields();
      if (editingLevel?.id) {
        await levelApi.updateLevel(editingLevel.id, values);
        message.success('关卡更新成功');
      } else {
        await levelApi.createLevel(values);
        message.success('关卡创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchLevels();
    } catch (err: any) {
      message.error(err?.message || '保存失败，请重试');
    }
  };

  const handleDeleteLevel = async (id: number) => {
    try {
      await levelApi.deleteLevel(id);
      message.success('关卡已删除');
      fetchLevels();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  const handleToggleStatus = async (record: AITrainingLevel) => {
    try {
      await levelApi.toggleLevelStatus(record.id!, record.status === 1 ? 0 : 1);
      message.success('状态已切换');
      fetchLevels();
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    }
  };

  const openQuestionModal = (levelId: number, question?: AITrainingQuestion) => {
    setEditingQuestion(question || null);
    questionForm.resetFields();
    questionForm.setFieldsValue({ level_id: levelId, ...question });
    setQuestionModalVisible(true);
  };

  const handleSaveQuestion = async () => {
    try {
      const values = await questionForm.validateFields();
      const levelId = expandedLevelId!;
      if (editingQuestion?.id) {
        await questionApi.updateQuestion(levelId, editingQuestion.id, values);
        message.success('题目更新成功');
      } else {
        await questionApi.createQuestion(levelId, values);
        message.success('题目创建成功');
      }
      setQuestionModalVisible(false);
      fetchQuestions(levelId);
    } catch (err: any) {
      message.error(err?.message || '保存失败，请重试');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      await questionApi.deleteQuestion(expandedLevelId!, questionId);
      message.success('题目已删除');
      fetchQuestions(expandedLevelId!);
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  const questionColumns = [
    { title: '场景描述', dataIndex: 'scenario', key: 'scenario', ellipsis: true },
    {
      title: '正确答案', dataIndex: 'correct_answer', key: 'correct_answer',
      width: 100,
      render: (v: string) => <Tag color="green">{v}</Tag>
    },
    {
      title: '各选项分数', key: 'scores', width: 240,
      render: (_: any, r: AITrainingQuestion) => (
        <Space size={4}>
          <Tag color="blue">A:{r.score_a}</Tag>
          <Tag color="blue">B:{r.score_b}</Tag>
          <Tag color="blue">C:{r.score_c}</Tag>
          <Tag color="blue">D:{r.score_d}</Tag>
        </Space>
      )
    },
    {
      title: '操作', key: 'action', width: 140,
      render: (_: any, r: AITrainingQuestion) => (
        <Space>
          <Tooltip title="编辑"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => openQuestionModal(expandedLevelId!, r)} /></Tooltip>
          <Popconfirm title="确认删除该题目？" onConfirm={() => handleDeleteQuestion(r.id!)}>
            <Tooltip title="删除"><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const levelColumns = [
    {
      title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 70,
      sorter: (a: AITrainingLevel, b: AITrainingLevel) => (a.sort_order || 0) - (b.sort_order || 0),
      render: (v: number) => <Badge count={v} style={{ backgroundColor: THEME.purple }} />
    },
    { title: '关卡名称', dataIndex: 'name', key: 'name', width: 180 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '及格分', dataIndex: 'pass_score', key: 'pass_score', width: 100,
      render: (v: number) => <Text strong style={{ color: THEME.primary }}>{v}</Text>
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: number, record: AITrainingLevel) => (
        <Switch
          checked={v === 1}
          onChange={() => handleToggleStatus(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      )
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, record: AITrainingLevel) => (
        <Space>
          <Tooltip title="编辑"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => openLevelModal(record)} /></Tooltip>
          <Popconfirm title="确认删除该关卡及其所有题目？" onConfirm={() => handleDeleteLevel(record.id!)}>
            <Tooltip title="删除"><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: THEME.dark }}>
            <ExperimentOutlined style={{ marginRight: 8, color: THEME.primary }} />
            关卡管理
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>管理AI训练关卡与题目</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openLevelModal()}
          style={{ background: THEME.gradient, border: 'none', borderRadius: 8, height: 38 }}
        >
          新增关卡
        </Button>
      </div>

      <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table
          columns={levelColumns}
          dataSource={levels}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 14, color: THEME.dark }}>
                    📝 题目列表 ({levelQuestions.length}题)
                  </Text>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => openQuestionModal(record.id!)}
                    style={{ borderRadius: 6 }}
                  >
                    添加题目
                  </Button>
                </div>
                {levelQuestions.length > 0 ? (
                  <Table
                    columns={questionColumns}
                    dataSource={levelQuestions}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    bordered
                  />
                ) : (
                  <Empty description="暂无题目，请添加" />
                )}
              </div>
            ),
            onExpandedRowsChange: (rows) => {
              if (rows.length === 0) {
                setExpandedLevelId(null);
              } else {
                const lastRow = rows[rows.length - 1];
                const record = levels.find(l => l.id === lastRow);
                if (record) handleExpand(true, record);
              }
            }
          }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 关卡编辑弹窗 */}
      <Modal
        title={editingLevel ? '编辑关卡' : '新增关卡'}
        open={modalVisible}
        onOk={handleSaveLevel}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        okText="保存"
        cancelText="取消"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="关卡名称" rules={[{ required: true, message: '请输入关卡名称' }]}>
            <Input placeholder="如：客户破冰入门" />
          </Form.Item>
          <Form.Item name="description" label="关卡描述" rules={[{ required: true, message: '请输入描述' }]}>
            <TextArea rows={2} placeholder="简短描述本关卡训练目标" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="pass_score" label="及格分数" rules={[{ required: true, message: '请输入及格分' }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="60" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sort_order" label="排序" initialValue={1}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态" initialValue={1}>
                <Select>
                  <Option value={1}>启用</Option>
                  <Option value={0}>禁用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="learning_material" label="学习资料">
            <TextArea rows={6} placeholder="输入该关卡的学习资料、知识点等..." style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 题目编辑弹窗 */}
      <Modal
        title={editingQuestion ? '编辑题目' : '新增题目'}
        open={questionModalVisible}
        onOk={handleSaveQuestion}
        onCancel={() => { setQuestionModalVisible(false); questionForm.resetFields(); }}
        okText="保存"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form form={questionForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="level_id" hidden><InputNumber /></Form.Item>
          <Form.Item name="scenario" label="场景描述" rules={[{ required: true, message: '请输入场景描述' }]}>
            <TextArea rows={3} placeholder="描述一个销售场景，如：客户进店后犹豫不决..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="option_a" label="选项 A" rules={[{ required: true }]}>
                <Input placeholder="选项内容" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="score_a" label="A 分数" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="option_b" label="选项 B" rules={[{ required: true }]}>
                <Input placeholder="选项内容" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="score_b" label="B 分数" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="option_c" label="选项 C" rules={[{ required: true }]}>
                <Input placeholder="选项内容" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="score_c" label="C 分数" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="option_d" label="选项 D" rules={[{ required: true }]}>
                <Input placeholder="选项内容" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="score_d" label="D 分数" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="correct_answer" label="正确答案" rules={[{ required: true }]}>
                <Select placeholder="选择正确答案">
                  <Option value="A">A</Option>
                  <Option value="B">B</Option>
                  <Option value="C">C</Option>
                  <Option value="D">D</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort_order" label="排序" initialValue={1}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="analysis" label="答案解析" rules={[{ required: true, message: '请输入解析' }]}>
            <TextArea rows={3} placeholder="解释为什么这个答案是正确的..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ 场景管理 Tab ============
const PERSONALITY_TYPES = [
  { value: 'red', label: '🔴 红色 - 活泼型', color: '#e94560' },
  { value: 'blue', label: '🔵 蓝色 - 完美型', color: '#1890ff' },
  { value: 'yellow', label: '🟡 黄色 - 力量型', color: '#faad14' },
  { value: 'green', label: '🟢 绿色 - 和平型', color: '#52c41a' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '简单', color: '#52c41a' },
  { value: 'medium', label: '中等', color: '#faad14' },
  { value: 'hard', label: '困难', color: '#e94560' },
];

const ScenarioManagement: React.FC = () => {
  const [scenarios, setScenarios] = useState<AITrainingScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AITrainingScenario | null>(null);
  const [filterPersonality, setFilterPersonality] = useState<string | undefined>();
  const [filterDifficulty, setFilterDifficulty] = useState<string | undefined>();
  const [form] = Form.useForm();

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scenarioApi.getScenarios({
        personality_type: filterPersonality,
        difficulty: filterDifficulty,
      });
      setScenarios(Array.isArray(res) ? res : []);
    } catch (err: any) {
      message.error(err?.message || '获取场景列表失败');
    } finally {
      setLoading(false);
    }
  }, [filterPersonality, filterDifficulty]);

  useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

  const openModal = (record?: AITrainingScenario) => {
    setEditing(record || null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing?.id) {
        await scenarioApi.updateScenario(editing.id, values);
        message.success('场景更新成功');
      } else {
        await scenarioApi.createScenario(values);
        message.success('场景创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchScenarios();
    } catch (err: any) {
      message.error(err?.message || '保存失败，请重试');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await scenarioApi.deleteScenario(id);
      message.success('场景已删除');
      fetchScenarios();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  const getPersonalityTag = (type: string) => {
    const p = PERSONALITY_TYPES.find(t => t.value === type);
    return p ? <Tag color={p.color}>{p.label}</Tag> : <Tag>{type}</Tag>;
  };

  const getDifficultyTag = (d: string) => {
    const diff = DIFFICULTY_OPTIONS.find(t => t.value === d);
    return diff ? <Tag color={diff.color}>{diff.label}</Tag> : <Tag>{d}</Tag>;
  };

  const columns = [
    { title: '场景名称', dataIndex: 'name', key: 'name', width: 180 },
    {
      title: '性格类型', dataIndex: 'personality_type', key: 'personality_type', width: 180,
      filters: PERSONALITY_TYPES.map(p => ({ text: p.label, value: p.value })),
      onFilter: (value: any, record: AITrainingScenario) => record.personality_type === value,
      render: (v: string) => getPersonalityTag(v)
    },
    {
      title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 100,
      render: (v: string) => getDifficultyTag(v)
    },
    { title: '开场白', dataIndex: 'opening', key: 'opening', ellipsis: true },
    {
      title: '使用次数', dataIndex: 'usage_count', key: 'usage_count', width: 100,
      render: (v: number) => <Text style={{ color: THEME.purple, fontWeight: 600 }}>{v || 0}</Text>
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, record: AITrainingScenario) => (
        <Space>
          <Tooltip title="编辑"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)} /></Tooltip>
          <Popconfirm title="确认删除该场景？" onConfirm={() => handleDelete(record.id!)}>
            <Tooltip title="删除"><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: THEME.dark }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: THEME.primary }} />
            场景管理
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>配置AI教练对话场景与性格模型</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          style={{ background: THEME.gradient, border: 'none', borderRadius: 8, height: 38 }}
        >
          新增场景
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text type="secondary">筛选：</Text>
          <Select
            placeholder="性格类型" allowClear style={{ width: 180 }}
            value={filterPersonality}
            onChange={(v) => setFilterPersonality(v)}
          >
            {PERSONALITY_TYPES.map(p => <Option key={p.value} value={p.value}>{p.label}</Option>)}
          </Select>
          <Select
            placeholder="难度" allowClear style={{ width: 120 }}
            value={filterDifficulty}
            onChange={(v) => setFilterDifficulty(v)}
          >
            {DIFFICULTY_OPTIONS.map(d => <Option key={d.value} value={d.value}>{d.label}</Option>)}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchScenarios}>刷新</Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table columns={columns} dataSource={scenarios} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editing ? '编辑场景' : '新增场景'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        okText="保存"
        cancelText="取消"
        width={680}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="场景名称" rules={[{ required: true, message: '请输入场景名称' }]}>
                <Input placeholder="如：面诊沟通" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="personality_type" label="性格类型" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="选择性格类型">
                  {PERSONALITY_TYPES.map(p => <Option key={p.value} value={p.value}>{p.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="场景描述" rules={[{ required: true, message: '请输入描述' }]}>
            <TextArea rows={2} placeholder="描述该对话场景的背景..." />
          </Form.Item>
          <Form.Item name="initial_intent" label="初始意图">
            <TextArea rows={2} placeholder="客户进入对话时的初始意图..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="difficulty" label="难度" rules={[{ required: true }]}>
                <Select placeholder="选择难度">
                  {DIFFICULTY_OPTIONS.map(d => <Option key={d.value} value={d.value}>{d.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="opening" label="开场白" rules={[{ required: true, message: '请输入开场白' }]}>
            <TextArea rows={3} placeholder="AI教练的开场白..." />
          </Form.Item>
          <Form.Item name="personality_traits" label="性格特征 (JSON)">
            <TextArea rows={4} placeholder='{"沟通风格": "直接果断", "关注点": "效果和结果"}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="skill_tips" label="技巧提示">
            <TextArea rows={3} placeholder="应对该性格客户的销售技巧..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ 话术库管理 Tab ============
const SCRIPT_CATEGORIES = [
  '开场白', '破冰话术', '异议处理', '促单话术', '跟进话术', '关系维护',
  '产品介绍', '价格谈判', '售后服务', '转介绍', '其他'
];

const ScriptManagement: React.FC = () => {
  const [scripts, setScripts] = useState<AITrainingScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AITrainingScript | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterPersonality, setFilterPersonality] = useState<string | undefined>();
  const [form] = Form.useForm();

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scriptApi.getScripts({
        category: filterCategory,
        personality_type: filterPersonality,
      });
      setScripts(Array.isArray(res) ? res : []);
    } catch (err: any) {
      message.error(err?.message || '获取话术列表失败');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterPersonality]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  const openModal = (record?: AITrainingScript) => {
    setEditing(record || null);
    form.resetFields();
    if (record) form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // 字段映射: 前端content → 后端script_content, tags → tips
      const payload = {
        ...values,
        script_content: values.content,
        tips: values.tags || '',
      };
      delete payload.content;
      
      if (editing?.id) {
        await scriptApi.updateScript(editing.id, payload);
        message.success('话术更新成功');
      } else {
        await scriptApi.createScript(payload);
        message.success('话术创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchScripts();
    } catch (err: any) {
      message.error(err?.message || '保存失败，请重试');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await scriptApi.deleteScript(id);
      message.success('话术已删除');
      fetchScripts();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  const columns = [
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 120,
      filters: SCRIPT_CATEGORIES.map(c => ({ text: c, value: c })),
      onFilter: (value: any, record: AITrainingScript) => record.category === value,
      render: (v: string) => <Tag color="purple">{v}</Tag>
    },
    {
      title: '性格类型', dataIndex: 'personality_type', key: 'personality_type', width: 160,
      render: (v: string) => {
        const p = PERSONALITY_TYPES.find(t => t.value === v);
        return p ? <Tag color={p.color}>{p.label}</Tag> : <Tag>{v}</Tag>;
      }
    },
    { title: '场景', dataIndex: 'scenario', key: 'scenario', width: 150 },
    { title: '话术内容', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: '使用次数', dataIndex: 'usage_count', key: 'usage_count', width: 100,
      render: (v: number) => <Text style={{ color: THEME.purple, fontWeight: 600 }}>{v || 0}</Text>
    },
    {
      title: '操作', key: 'action', width: 140,
      render: (_: any, record: AITrainingScript) => (
        <Space>
          <Tooltip title="编辑"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)} /></Tooltip>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id!)}>
            <Tooltip title="删除"><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: THEME.dark }}>
            <BookOutlined style={{ marginRight: 8, color: THEME.primary }} />
            话术库管理
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>管理和维护各类销售话术模板</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          style={{ background: THEME.gradient, border: 'none', borderRadius: 8, height: 38 }}
        >
          新增话术
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text type="secondary">筛选：</Text>
          <Select placeholder="分类" allowClear style={{ width: 150 }} value={filterCategory} onChange={(v) => setFilterCategory(v)}>
            {SCRIPT_CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
          <Select placeholder="性格类型" allowClear style={{ width: 180 }} value={filterPersonality} onChange={(v) => setFilterPersonality(v)}>
            {PERSONALITY_TYPES.map(p => <Option key={p.value} value={p.value}>{p.label}</Option>)}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchScripts}>刷新</Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table columns={columns} dataSource={scripts} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editing ? '编辑话术' : '新增话术'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        okText="保存"
        cancelText="取消"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
                <Select placeholder="选择话术分类">
                  {SCRIPT_CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="personality_type" label="性格类型" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="选择性格类型">
                  {PERSONALITY_TYPES.map(p => <Option key={p.value} value={p.value}>{p.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="scenario" label="场景" rules={[{ required: true, message: '请输入场景' }]}>
            <Input placeholder="适用的销售场景" />
          </Form.Item>
          <Form.Item name="content" label="话术内容" rules={[{ required: true, message: '请输入话术内容' }]}>
            <TextArea rows={6} placeholder="输入话术内容..." />
          </Form.Item>
          <Form.Item name="tags" label="标签（逗号分隔）">
            <Input placeholder="如：破冰, 高效, 热情" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ 数据报表 Tab ============
const DashboardReport: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [rankings, setRankings] = useState<AIRankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, rankingsRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRankings({ limit: 20 }),
      ]);
      setStats(statsRes || null);
      setRankings(rankingsRes || []);
    } catch (err: any) {
      message.error(err?.message || '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statCards = [
    {
      title: '参与人数',
      value: stats?.total_participants || 0,
      icon: <StarOutlined />,
      color: THEME.primary,
      bg: 'linear-gradient(135deg, #e94560, #ff6b81)',
    },
    {
      title: '总关卡数',
      value: stats?.total_levels || 0,
      icon: <ExperimentOutlined />,
      color: THEME.purple,
      bg: 'linear-gradient(135deg, #722ED1, #B37FEB)',
    },
    {
      title: '总场景数',
      value: stats?.total_scenarios || 0,
      icon: <ThunderboltOutlined />,
      color: '#1890ff',
      bg: 'linear-gradient(135deg, #1890ff, #69c0ff)',
    },
    {
      title: '平均分',
      value: stats?.average_score ? stats.average_score.toFixed(1) : '0.0',
      icon: <TrophyOutlined />,
      color: '#faad14',
      bg: 'linear-gradient(135deg, #faad14, #ffd666)',
    },
  ];

  // Simple bar chart using CSS
  const completionRates = stats?.level_completion_rates || [];

  const rankColumns = [
    {
      title: '排名', key: 'rank', width: 80,
      render: (_: any, record: AIRankingItem) => {
        const colors = ['#faad14', '#d9d9d9', '#d48806'];
        const color = record.rank <= 3 ? colors[record.rank - 1] : undefined;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {record.rank <= 3 ? (
              <TrophyOutlined style={{ fontSize: 20, color }} />
            ) : (
              <span style={{ fontWeight: 600, color: '#999' }}>{record.rank}</span>
            )}
          </div>
        );
      }
    },
    {
      title: '用户', key: 'user', render: (_: any, r: AIRankingItem) => (
        <Space>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: THEME.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 600
          }}>
            {r.nickname?.charAt(0) || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{r.nickname || '未知'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>Lv.{r.level || 1}</div>
          </div>
        </Space>
      )
    },
    {
      title: '总分', dataIndex: 'total_score', key: 'total_score', width: 120,
      sorter: (a: AIRankingItem, b: AIRankingItem) => (a.total_score || 0) - (b.total_score || 0),
      render: (v: number) => <Text strong style={{ color: THEME.primary, fontSize: 16 }}>{v || 0}</Text>
    },
    {
      title: '已通关', dataIndex: 'completed_levels', key: 'completed_levels', width: 100,
      render: (v: number) => <Tag color="green">{v || 0} 关</Tag>
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: THEME.dark }}>
            <BarChartOutlined style={{ marginRight: 8, color: THEME.primary }} />
            数据报表
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>AI训练系统运营数据概览</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新数据</Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card
              style={{ borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
              bodyStyle={{ padding: '20px 24px' }}
              hoverable
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{card.title}</Text>
                  <div style={{ fontSize: 28, fontWeight: 700, color: card.color, marginTop: 8 }}>{card.value}</div>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: card.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff'
                }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* 关卡通关率 */}
        <Col xs={24} lg={14}>
          <Card
            title={<span><CheckCircleOutlined style={{ color: THEME.purple, marginRight: 8 }} />各关卡通关率</span>}
            style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            bodyStyle={{ minHeight: 300 }}
          >
            {completionRates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                {completionRates.map((item: any, idx: number) => {
                  const rate = item.completion_rate || 0;
                  const barColor = rate >= 80 ? '#52c41a' : rate >= 50 ? '#faad14' : '#e94560';
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13 }}>{item.level_name || `关卡${idx + 1}`}</Text>
                        <Text strong style={{ color: barColor }}>{rate}%</Text>
                      </div>
                      <div style={{
                        width: '100%', height: 12, borderRadius: 6, background: '#f0f0f0', overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(rate, 100)}%`, height: '100%', borderRadius: 6,
                          background: barColor, transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty description="暂无通关数据" />
            )}
          </Card>
        </Col>

        {/* 排行榜 */}
        <Col xs={24} lg={10}>
          <Card
            title={<span><TrophyOutlined style={{ color: '#faad14', marginRight: 8 }} />学习排行榜</span>}
            style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              columns={rankColumns}
              dataSource={rankings}
              rowKey={(_, idx) => `${idx}`}
              pagination={{ pageSize: 8, size: 'small' }}
              size="small"
              locale={{ emptyText: '暂无排行数据' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 场景使用统计 */}
      <Card
        title={<span><ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />各场景使用统计</span>}
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginTop: 16 }}
      >
        {stats?.scenario_usage_stats?.length > 0 ? (
          <Row gutter={[16, 16]}>
            {stats.scenario_usage_stats.map((item: any, idx: number) => {
              const colors = ['#e94560', '#722ED1', '#1890ff', '#13c2c2', '#52c41a', '#faad14', '#eb2f96', '#fa8c16'];
              const color = colors[idx % colors.length];
              return (
                <Col xs={12} sm={8} md={6} key={idx}>
                  <Card size="small" style={{ borderRadius: 10, textAlign: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: `${color}18`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color, marginBottom: 8
                    }}>
                      🔥
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.scenario_name || `场景${idx + 1}`}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{item.count || 0}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>使用次数</Text>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Empty description="暂无场景使用数据" />
        )}
      </Card>
    </div>
  );
};

// ============ 主页面 ============
const AITrainingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('levels');

  const tabItems = [
    {
      key: 'levels',
      label: (
        <span>
          <ExperimentOutlined />
          关卡管理
        </span>
      ),
      children: <LevelManagement />,
    },
    {
      key: 'scenarios',
      label: (
        <span>
          <ThunderboltOutlined />
          场景管理
        </span>
      ),
      children: <ScenarioManagement />,
    },
    {
      key: 'scripts',
      label: (
        <span>
          <BookOutlined />
          话术库管理
        </span>
      ),
      children: <ScriptManagement />,
    },
    {
      key: 'dashboard',
      label: (
        <span>
          <BarChartOutlined />
          数据报表
        </span>
      ),
      children: <DashboardReport />,
    },
  ];

  return (
    <div style={{
      padding: '4px 0',
      background: THEME.bg,
      minHeight: 'calc(100vh - 160px)'
    }}>
      {/* 页面标题区 */}
      <div style={{
        background: THEME.gradient,
        margin: '0 0 24px 0',
        borderRadius: 16,
        padding: '28px 32px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)'
        }} />
        <div style={{
          position: 'absolute', bottom: -50, right: 80,
          width: 150, height: 150, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>
            <ExperimentOutlined style={{ marginRight: 12 }} />
            AI话术训练系统
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
            管理AI训练关卡、对话场景、话术模板与学习数据
          </Text>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
        tabBarStyle={{
          marginBottom: 16,
          background: '#fff',
          borderRadius: 12,
          padding: '4px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      />
    </div>
  );
};

export default AITrainingManagement;
