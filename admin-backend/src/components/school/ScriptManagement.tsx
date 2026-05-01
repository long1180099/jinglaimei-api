import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  InputNumber,
  Card,
  Row,
  Col,
  Divider,
  Progress,
  Switch,
  Collapse,
  message,
  Popconfirm,
  Tooltip,
  Avatar,
  Badge
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  LikeOutlined,
  StarOutlined,
  RobotOutlined,
  TeamOutlined,
  MessageOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { FormInstance } from 'antd';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchScripts,
  fetchScriptById,
  createScript,
  updateScript,
  deleteScript,
  trainAIScript,
  simulateScenario,
  getHotScripts,
  getScriptStatistics
} from '../../store/slices/schoolSlice';
import { SalesScript, ScriptQueryParams, ScriptStatistics, ScriptScenario, ScriptTrainingResult, ScriptDifficulty, ScriptScene, ScriptPersonality } from '../../types/school';

const { Option } = Select;
const { Search } = Input;
const { Panel } = Collapse;

const ScriptManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const formRef = React.useRef<FormInstance>(null);
  
  const {
    scripts,
    hotScripts,
    scriptStatistics,
    selectedScript: currentScript,
    scriptsLoading: loading,
    scriptsLoading: scriptLoading,
    trainingLoading,
    simulationLoading
  } = useAppSelector((state) => state.school);
  
  const [searchParams, setSearchParams] = useState<ScriptQueryParams>({
    page: 1,
    pageSize: 10,
    title: '',
    category: undefined,
    scenario: undefined,
    personality: undefined,
    status: undefined,
    hot: false
  });
  
  const [modalVisible, setModalVisible] = useState(false);
  const [trainingModalVisible, setTrainingModalVisible] = useState(false);
  const [simulationModalVisible, setSimulationModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<SalesScript[]>([]);
  const [trainingQuestion, setTrainingQuestion] = useState('');
  const [trainingResult, setTrainingResult] = useState<ScriptTrainingResult | null>(null);
  const [simulationScenario, setSimulationScenario] = useState<ScriptScenario | null>(null);
  const [simulationInput, setSimulationInput] = useState('');
  const [simulationOutput, setSimulationOutput] = useState('');
  
  // 场景模拟选项
  const scenarioOptions = [
    { value: 'welcome_call', label: '欢迎电话' },
    { value: 'product_intro', label: '产品介绍' },
    { value: 'objection_handling', label: '异议处理' },
    { value: 'closing_sale', label: '成交话术' },
    { value: 'follow_up', label: '跟进话术' },
    { value: 'customer_service', label: '客服处理' }
  ];
  
  // 性格色彩选项
  const personalityOptions = [
    { value: 'red', label: '红色性格', color: 'red' },
    { value: 'blue', label: '蓝色性格', color: 'blue' },
    { value: 'yellow', label: '黄色性格', color: 'yellow' },
    { value: 'green', label: '绿色性格', color: 'green' }
  ];
  
  // 话术分类选项
  const categoryOptions = [
    { value: 'ai_training', label: 'AI训练话术' },
    { value: 'scenario_simulation', label: '场景模拟话术' },
    { value: 'personality_based', label: '性格色彩话术' },
    { value: 'common_questions', label: '常见问题话术' },
    { value: 'sales_pitch', label: '销售话术' }
  ];
  
  // 初始化加载数据
  useEffect(() => {
    loadData();
  }, [searchParams]);
  
  const loadData = () => {
    dispatch(fetchScripts(searchParams));
    dispatch(getHotScripts());
    dispatch(getScriptStatistics());
  };
  
  const handleSearch = (value: string) => {
    setSearchParams({ ...searchParams, title: value, page: 1 });
  };
  
  const handleFilterChange = (key: keyof ScriptQueryParams, value: any) => {
    setSearchParams({ ...searchParams, [key]: value, page: 1 });
  };
  
  const handleTableChange = (pagination: any) => {
    setSearchParams({
      ...searchParams,
      page: pagination.current,
      pageSize: pagination.pageSize
    });
  };
  
  const handleAdd = () => {
    setIsEdit(false);
    setCurrentId(null);
    formRef.current?.resetFields();
    setModalVisible(true);
  };
  
  const handleEdit = (id: string) => {
    setIsEdit(true);
    setCurrentId(id);
    dispatch(fetchScriptById(id)).then((action: any) => {
      if (fetchScriptById.fulfilled.match(action)) {
        const script = action.payload;
        formRef.current?.setFieldsValue({
          title: script.title,
          category: script.category,
          content: script.content,
          scenario: script.scenario,
          personality: script.personality,
          difficulty: script.difficulty,
          tags: script.tags,
          tips: script.tips,
          examples: script.examples,
          status: script.status
        });
        setModalVisible(true);
      }
    });
  };
  
  const handleDelete = (id: string) => {
    dispatch(deleteScript(id)).then((action: any) => {
      if (deleteScript.fulfilled.match(action)) {
        message.success('话术删除成功');
        loadData();
      } else {
        message.error('话术删除失败');
      }
    });
  };
  
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的${selectedRows.length}条话术吗？`,
      onOk: () => {
        const promises = selectedRows.map(script => dispatch(deleteScript(script.id)));
        Promise.all(promises).then(() => {
          message.success(`成功删除${selectedRows.length}条话术`);
          setSelectedRows([]);
          loadData();
        });
      }
    });
  };
  
  const handleModalOk = () => {
    formRef.current?.validateFields().then((values) => {
      if (isEdit && currentId) {
        dispatch(updateScript({ id: currentId, data: values })).then((action: any) => {
          if (updateScript.fulfilled.match(action)) {
            message.success('话术更新成功');
            setModalVisible(false);
            loadData();
          }
        });
      } else {
        dispatch(createScript(values)).then((action: any) => {
          if (createScript.fulfilled.match(action)) {
            message.success('话术创建成功');
            setModalVisible(false);
            loadData();
          }
        });
      }
    });
  };
  
  const handleAITraining = () => {
    if (!trainingQuestion.trim()) {
      message.warning('请输入训练问题');
      return;
    }
    
    dispatch(trainAIScript(trainingQuestion)).then((action: any) => {
      if (trainAIScript.fulfilled.match(action)) {
        setTrainingResult(action.payload);
        message.success('AI训练完成');
      } else {
        message.error('AI训练失败');
      }
    });
  };
  
  const handleStartTraining = () => {
    setTrainingQuestion('');
    setTrainingResult(null);
    setTrainingModalVisible(true);
  };
  
  const handleSaveTrainingResult = () => {
    if (!trainingResult) return;
    
    dispatch(createScript({
      title: `AI训练话术 - ${trainingQuestion}`,
      scene: ScriptScene.PRODUCT_PROMOTION,
      content: trainingResult.response,
      tags: ['AI生成', '自动训练'],
      difficulty: ScriptDifficulty.MEDIUM,
      personality: [ScriptPersonality.YELLOW],
      description: `AI自动生成的训练话术`,
      status: 'active'
    } as any)).then((action: any) => {
      if (createScript.fulfilled.match(action)) {
        message.success('AI话术已保存');
        setTrainingModalVisible(false);
        loadData();
      }
    });
  };
  
  const handleStartSimulation = (scenario: ScriptScenario) => {
    setSimulationScenario(scenario);
    setSimulationInput('');
    setSimulationOutput('');
    setSimulationModalVisible(true);
  };
  
  const handleRunSimulation = () => {
    if (!simulationScenario || !simulationInput.trim()) {
      message.warning('请输入模拟内容');
      return;
    }
    
    dispatch(simulateScenario({
      scenario: simulationScenario,
      input: simulationInput
    })).then((action: any) => {
      if (simulateScenario.fulfilled.match(action)) {
        setSimulationOutput(action.payload.response);
        message.success('场景模拟完成');
      } else {
        message.error('场景模拟失败');
      }
    });
  };
  
  const handleDownloadScript = (script: SalesScript) => {
    const content = `话术标题：${script.title}\n\n话术描述：${script.description}\n\n话术内容：\n${script.content}\n\n示例对话：\n${script.examples ? JSON.stringify(script.examples, null, 2) : '暂无示例'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('话术下载成功');
  };
  
  const columns: ColumnsType<SalesScript> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text) => <span className="text-gray-500">{text.slice(0, 8)}</span>
    },
    {
      title: '话术标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text, record) => (
        <div className="flex items-center">
          <Badge 
            status={(record.usageCount > 100) ? "error" : "default"}
            dot={(record.usageCount > 100)}
            className="mr-2"
          />
          <span>{text}</span>
        </div>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => {
        const categoryMap: Record<string, { label: string, color: string }> = {
          ai_training: { label: 'AI训练', color: 'purple' },
          scenario_simulation: { label: '场景模拟', color: 'blue' },
          personality_based: { label: '性格色彩', color: 'green' },
          common_questions: { label: '常见问题', color: 'orange' },
          sales_pitch: { label: '销售话术', color: 'red' }
        };
        const config = categoryMap[category] || { label: category, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: '应用场景',
      dataIndex: 'scenario',
      key: 'scenario',
      width: 120,
      render: (scenario) => {
        const scenarioMap: Record<string, string> = {
          welcome_call: '欢迎电话',
          product_intro: '产品介绍',
          objection_handling: '异议处理',
          closing_sale: '成交话术',
          follow_up: '跟进话术',
          customer_service: '客服处理'
        };
        return scenario ? scenarioMap[scenario] || scenario : '-';
      }
    },
    {
      title: '性格色彩',
      dataIndex: 'personality',
      key: 'personality',
      width: 100,
      render: (personality) => {
        const personalityMap: Record<string, { label: string, color: string }> = {
          red: { label: '红色', color: 'red' },
          blue: { label: '蓝色', color: 'blue' },
          yellow: { label: '黄色', color: 'yellow' },
          green: { label: '绿色', color: 'green' }
        };
        return personality ? (
          <Tag color={personalityMap[personality]?.color || 'default'}>
            {personalityMap[personality]?.label || personality}
          </Tag>
        ) : '-';
      }
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty) => {
        const difficultyMap: Record<number, { label: string, color: string }> = {
          1: { label: '初级', color: 'green' },
          2: { label: '中级', color: 'orange' },
          3: { label: '高级', color: 'red' },
          4: { label: '专家', color: 'purple' }
        };
        const config = difficultyMap[difficulty] || { label: `等级${difficulty}`, color: 'default' };
        return (
          <div className="flex items-center">
            <Tag color={config.color}>{config.label}</Tag>
            <Progress 
              percent={difficulty * 25} 
              size="small" 
              showInfo={false}
              className="ml-2 w-16"
              strokeColor={config.color}
            />
          </div>
        );
      }
    },
    {
      title: '点赞/收藏',
      key: 'likes',
      width: 120,
      render: (_, record) => (
        <div className="flex items-center space-x-2">
          <span className="text-red-500">
            <LikeOutlined /> {record.likes || 0}
          </span>
          <span className="text-yellow-500">
            <StarOutlined /> {record.likes || 0}
          </span>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="预览话术">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleEdit(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑话术">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record.id)}
            />
          </Tooltip>
          <Tooltip title="下载话术">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              onClick={() => handleDownloadScript(record)}
            />
          </Tooltip>
          <Tooltip title="分享话术">
            <Button 
              type="text" 
              icon={<ShareAltOutlined />} 
              onClick={() => message.info('分享功能开发中')}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这条话术吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除话术">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];
  
  // 渲染统计卡片
  const renderStatisticsCards = () => {
    if (!scriptStatistics) return null;
    
    const stats = scriptStatistics;
    const cardConfigs = [
      { title: '总话术数', value: stats.totalScripts, color: '#1890ff', icon: <MessageOutlined /> },
      { title: 'AI训练话术', value: stats.aiTrainingScripts, color: '#722ed1', icon: <RobotOutlined /> },
      { title: '场景模拟数', value: stats.scenarioScripts, color: '#13c2c2', icon: <TeamOutlined /> },
      { title: '性格色彩话术', value: stats.personalityScripts, color: '#52c41a', icon: <CustomerServiceOutlined /> }
    ];
    
    return (
      <Row gutter={[16, 16]}>
        {cardConfigs.map((config, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card className="text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center mb-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}20`, color: config.color }}
                >
                  {config.icon}
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: config.color }}>
                {config.value}
              </h3>
              <p className="text-gray-600 text-sm">{config.title}</p>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };
  
  // 渲染热门话术
  const renderHotScripts = () => {
    if (!hotScripts || hotScripts.length === 0) return null;
    
    return (
      <Card title="热门话术" className="mt-4">
        <Row gutter={[16, 16]}>
          {hotScripts.map((script, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={script.id}>
              <Card 
                hoverable 
                className="h-full"
                actions={[
                  <EyeOutlined key="view" onClick={() => handleEdit(script.id)} />,
                  <StarOutlined key="favorite" onClick={() => message.info('收藏功能开发中')} />,
                  <DownloadOutlined key="download" onClick={() => handleDownloadScript(script)} />
                ]}
              >
                <div className="flex items-start mb-3">
                  <Badge count={index + 1} style={{ backgroundColor: index < 3 ? '#ff4d4f' : '#1890ff' }}>
                    <Avatar 
                      size="large" 
                      style={{ backgroundColor: index % 2 === 0 ? '#1890ff' : '#52c41a' }}
                      icon={<MessageOutlined />}
                    />
                  </Badge>
                  <div className="ml-3 flex-1">
                    <h4 className="font-medium mb-1">{script.title}</h4>
                    <div className="flex items-center text-gray-500 text-sm">
                      <Tag color="blue">{script.scene}</Tag>
                      <span className="ml-2">
                        <LikeOutlined /> {script.likes || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2">
                  {script.content.length > 60 ? script.content.substring(0, 60) + '...' : script.content}
                </p>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };
  
  return (
    <div className="p-4">
      {/* 统计卡片 */}
      <div className="mb-6">
        {renderStatisticsCards()}
      </div>
      
      {/* 操作区域 */}
      <Card className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex-1 mb-4 md:mb-0">
            <Search
              placeholder="搜索话术标题或内容"
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              className="w-full md:w-80"
            />
          </div>
          <Space wrap>
            <Select
              placeholder="话术分类"
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('category', value)}
              allowClear
            >
              {categoryOptions.map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
            
            <Select
              placeholder="应用场景"
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('scenario', value)}
              allowClear
            >
              {scenarioOptions.map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
            
            <Select
              placeholder="性格色彩"
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('personality', value)}
              allowClear
            >
              {personalityOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
            
            <Select
              placeholder="话术状态"
              style={{ width: 100 }}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
            
            <Switch
              checkedChildren="热门"
              unCheckedChildren="全部"
              onChange={(checked) => handleFilterChange('hot', checked)}
            />
          </Space>
        </div>
        
        <Divider />
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
          >
            新建话术
          </Button>
          
          <Button 
            type="primary" 
            icon={<RobotOutlined />} 
            onClick={handleStartTraining}
            ghost
          >
            AI话术训练
          </Button>
          
          <Button 
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartSimulation('welcome_call')}
          >
            场景模拟
          </Button>
          
          <Button 
            icon={<UploadOutlined />}
            onClick={() => message.info('批量导入功能开发中')}
          >
            批量导入
          </Button>
          
          {selectedRows.length > 0 && (
            <Button 
              danger 
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除 ({selectedRows.length})
            </Button>
          )}
        </div>
      </Card>
      
      {/* 热门话术展示 */}
      {renderHotScripts()}
      
      {/* 话术表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={scripts}
          rowKey="id"
          loading={loading}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.pageSize,
            total: scripts.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条话术`
          }}
          onChange={handleTableChange}
          rowSelection={{
            selectedRowKeys: selectedRows.map(row => row.id),
            onChange: (_, selectedRows) => setSelectedRows(selectedRows)
          }}
          scroll={{ x: 1500 }}
        />
      </Card>
      
      {/* 场景模拟 */}
      <Modal
        title={`场景模拟：${simulationScenario ? scenarioOptions.find(s => s.value === simulationScenario)?.label : ''}`}
        open={simulationModalVisible}
        onCancel={() => setSimulationModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setSimulationModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="simulate" 
            type="primary" 
            loading={simulationLoading}
            onClick={handleRunSimulation}
          >
            开始模拟
          </Button>
        ]}
        width={700}
      >
        <div className="p-4">
          <Form layout="vertical">
            <Form.Item label="选择场景" required>
              <Select
                placeholder="请选择模拟场景"
                value={simulationScenario}
                onChange={setSimulationScenario}
              >
                {scenarioOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="用户问题/情景描述" required>
              <Input.TextArea
                rows={4}
                placeholder="请输入用户可能提出的问题或描述具体情景..."
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
              />
            </Form.Item>
            
            {simulationOutput && (
              <Form.Item label="AI建议话术">
                <Card className="bg-gray-50">
                  <div className="whitespace-pre-wrap">{simulationOutput}</div>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(simulationOutput);
                        message.success('话术已复制到剪贴板');
                      }}
                    >
                      复制话术
                    </Button>
                  </div>
                </Card>
              </Form.Item>
            )}
          </Form>
        </div>
      </Modal>
      
      {/* AI话术训练模态框 */}
      <Modal
        title="AI话术训练"
        open={trainingModalVisible}
        onCancel={() => setTrainingModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTrainingModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="train" 
            type="primary" 
            loading={trainingLoading}
            onClick={handleAITraining}
          >
            开始训练
          </Button>,
          trainingResult && (
            <Button 
              key="save" 
              type="primary" 
              onClick={handleSaveTrainingResult}
            >
              保存话术
            </Button>
          )
        ]}
        width={700}
      >
        <div className="p-4">
          <Form layout="vertical">
            <Form.Item label="训练问题" required>
              <Input.TextArea
                rows={3}
                placeholder="请输入你想要训练的销售话术问题，例如：如何处理客户的价格异议？"
                value={trainingQuestion}
                onChange={(e) => setTrainingQuestion(e.target.value)}
              />
            </Form.Item>
            
            <Form.Item label="建议训练方向" className="mb-0">
              <div className="grid grid-cols-2 gap-2">
                {[
                  '如何处理价格异议',
                  '如何介绍产品优势',
                  '如何进行客户跟进',
                  '如何促成交易',
                  '如何处理客户投诉',
                  '如何进行电话营销'
                ].map((tip, index) => (
                  <Tag 
                    key={index} 
                    color="blue" 
                    className="cursor-pointer"
                    onClick={() => setTrainingQuestion(tip)}
                  >
                    {tip}
                  </Tag>
                ))}
              </div>
            </Form.Item>
            
            {trainingResult && (
              <>
                <Divider />
                <Form.Item label="AI生成的话术">
                  <Card className="bg-gray-50">
                    <div className="whitespace-pre-wrap">{trainingResult.response}</div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-gray-500 text-sm">
                        生成时间: {new Date(trainingResult.generatedAt).toLocaleString()}
                      </div>
                      <Space>
                        <Button 
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(trainingResult.response);
                            message.success('话术已复制到剪贴板');
                          }}
                        >
                          复制话术
                        </Button>
                      </Space>
                    </div>
                  </Card>
                </Form.Item>
              </>
            )}
          </Form>
        </div>
      </Modal>
      
      {/* 话术编辑/创建模态框 */}
      <Modal
        title={isEdit ? '编辑话术' : '新建话术'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleModalOk}
        width={700}
        confirmLoading={scriptLoading}
      >
        <Form
          ref={formRef}
          layout="vertical"
          initialValues={{
            difficulty: 2,
            status: 'active'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="话术标题"
                rules={[{ required: true, message: '请输入话术标题' }]}
              >
                <Input placeholder="请输入话术标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="话术分类"
                rules={[{ required: true, message: '请选择话术分类' }]}
              >
                <Select placeholder="请选择话术分类">
                  {categoryOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="scenario"
                label="应用场景"
              >
                <Select placeholder="请选择应用场景" allowClear>
                  {scenarioOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="personality"
                label="性格色彩"
              >
                <Select placeholder="请选择性格色彩" allowClear>
                  {personalityOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <Tag color={option.color}>{option.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="content"
            label="话术内容"
            rules={[{ required: true, message: '请输入话术内容' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="请输入详细的话术内容，可以包含多种应对策略..."
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="difficulty"
                label="难度等级"
              >
                <Select placeholder="请选择难度等级">
                  <Option value={1}>初级</Option>
                  <Option value={2}>中级</Option>
                  <Option value={3}>高级</Option>
                  <Option value={4}>专家级</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="话术状态"
              >
                <Select placeholder="请选择话术状态">
                  <Option value="active">启用</Option>
                  <Option value="inactive">禁用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（按回车确认）"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="tips"
            label="使用建议"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入话术的使用建议和注意事项..."
            />
          </Form.Item>
          
          <Form.Item
            name="examples"
            label="示例对话"
          >
            <Input.TextArea
              rows={4}
              placeholder="请输示例对话场景，格式如：\n客户：问题...\n销售：回答...\n客户：反应...\n销售：应对..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScriptManagement;