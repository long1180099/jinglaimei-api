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
  Badge,
  DatePicker,
  Timeline,
  Steps,
  Statistic,
  Tabs,
  Radio,
  Checkbox
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CalendarOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  TrophyOutlined,
  GiftOutlined,
  BarChartOutlined,
  FilterOutlined,
  ExportOutlined,
  TeamOutlined,
  UserOutlined,
  CopyOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { FormInstance } from 'antd';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchActionLogs,
  fetchActionLogById,
  createActionLog,
  updateActionLog,
  deleteActionLog,
  updateActionLogProgress,
  completeActionLog,
  getActionLogTypeStats,
  getUserActionLogStats
} from '../../store/slices/schoolSlice';
import { ActionLog, ActionLogQueryParams, ActionLogType, ActionLogPriority, ActionLogStatus } from '../../types/school';
import dayjs from 'dayjs';

const { Option } = Select;
const { Search } = Input;
const { Panel } = Collapse;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Step } = Steps;

const ActionLogManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const formRef = React.useRef<FormInstance>(null);
  
  const {
    actionLogs,
    actionLogsLoading,
    actionLogsError,
    selectedActionLog,
    actionLogStatistics,
    userActionLogStats
  } = useAppSelector((state) => state.school);
  
  const [searchParams, setSearchParams] = useState<ActionLogQueryParams>({
    page: 1,
    pageSize: 10,
    title: '',
    type: undefined,
    priority: undefined,
    status: undefined,
    userId: undefined,
    startDate: undefined,
    endDate: undefined,
    overdue: false
  });
  
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<ActionLog[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [progressValue, setProgressValue] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ActionLog | null>(null);
  
  // 行动日志类型选项
  const typeOptions = [
    { value: ActionLogType.SALES_GOAL, label: '销售目标', color: 'red' },
    { value: ActionLogType.TEAM_GOAL, label: '团队目标', color: 'orange' },
    { value: ActionLogType.LEARNING_GOAL, label: '学习目标', color: 'purple' },
    { value: ActionLogType.PERSONAL_GOAL, label: '个人目标', color: 'blue' },
    { value: ActionLogType.DAILY_TASK, label: '日常任务', color: 'cyan' },
    { value: ActionLogType.WEEKLY_PLAN, label: '周计划', color: 'green' },
    { value: ActionLogType.MONTHLY_PLAN, label: '月计划', color: 'magenta' }
  ];
  
  // 优先级选项
  const priorityOptions = [
    { value: ActionLogPriority.LOW, label: '低', color: 'gray' },
    { value: ActionLogPriority.MEDIUM, label: '中', color: 'blue' },
    { value: ActionLogPriority.HIGH, label: '高', color: 'orange' },
    { value: ActionLogPriority.URGENT, label: '紧急', color: 'red' }
  ];
  
  // 状态选项
  const statusOptions = [
    { value: ActionLogStatus.NOT_STARTED, label: '未开始', color: 'default' },
    { value: ActionLogStatus.IN_PROGRESS, label: '进行中', color: 'processing' },
    { value: ActionLogStatus.COMPLETED, label: '已完成', color: 'success' },
    { value: ActionLogStatus.DELAYED, label: '已延期', color: 'error' },
    { value: ActionLogStatus.CANCELLED, label: '已取消', color: 'default' }
  ];
  
  // 初始化加载数据
  useEffect(() => {
    loadData();
  }, [searchParams, activeTab]);
  
  const loadData = () => {
    const params = { ...searchParams };
    
    // 根据标签页筛选
    switch (activeTab) {
      case 'today':
        params.startDate = dayjs().startOf('day').toISOString();
        params.endDate = dayjs().endOf('day').toISOString();
        break;
      case 'week':
        params.startDate = dayjs().startOf('week').toISOString();
        params.endDate = dayjs().endOf('week').toISOString();
        break;
      case 'month':
        params.startDate = dayjs().startOf('month').toISOString();
        params.endDate = dayjs().endOf('month').toISOString();
        break;
      case 'overdue':
        params.overdue = true;
        break;
      case 'completed':
        params.status = ActionLogStatus.COMPLETED;
        break;
    }
    
    dispatch(fetchActionLogs(params));
    dispatch(getActionLogTypeStats());
  };
  
  const handleSearch = (value: string) => {
    setSearchParams({ ...searchParams, title: value, page: 1 });
  };
  
  const handleFilterChange = (key: keyof ActionLogQueryParams, value: any) => {
    setSearchParams({ ...searchParams, [key]: value, page: 1 });
  };
  
  const handleDateRangeChange = (dates: any, dateStrings: [string, string]) => {
    setSearchParams({
      ...searchParams,
      startDate: dateStrings[0] || undefined,
      endDate: dateStrings[1] || undefined,
      page: 1
    });
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
    formRef.current?.setFieldsValue({
      type: ActionLogType.DAILY_TASK,
      priority: ActionLogPriority.MEDIUM,
      status: ActionLogStatus.NOT_STARTED,
      targetValue: 1,
      currentValue: 0,
      progress: 0,
      pointsReward: 10,
      autoCreateNext: true
    });
    setModalVisible(true);
  };
  
  const handleEdit = (id: string) => {
    setIsEdit(true);
    setCurrentId(id);
    dispatch(fetchActionLogById(id)).then((action: any) => {
      if (fetchActionLogById.fulfilled.match(action)) {
        const log = action.payload;
        formRef.current?.setFieldsValue({
          title: log.title,
          description: log.description,
          type: log.type,
          priority: log.priority,
          status: log.status,
          targetValue: log.targetValue,
          currentValue: log.currentValue,
          progress: log.progress,
          pointsReward: log.pointsReward,
          startDate: log.startDate ? dayjs(log.startDate) : null,
          endDate: log.endDate ? dayjs(log.endDate) : null,
          userId: log.userId,
          teamId: log.teamId,
          tags: log.tags,
          notes: log.notes,
          reminder: log.reminder,
          autoCreateNext: log.autoCreateNext
        });
        setModalVisible(true);
      }
    });
  };
  
  const handleDelete = (id: string) => {
    dispatch(deleteActionLog(id)).then((action: any) => {
      if (deleteActionLog.fulfilled.match(action)) {
        message.success('行动日志删除成功');
        loadData();
      } else {
        message.error('行动日志删除失败');
      }
    });
  };
  
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的${selectedRows.length}条行动日志吗？`,
      onOk: () => {
        const promises = selectedRows.map(log => dispatch(deleteActionLog(log.id)));
        Promise.all(promises).then(() => {
          message.success(`成功删除${selectedRows.length}条行动日志`);
          setSelectedRows([]);
          loadData();
        });
      }
    });
  };
  
  const handleModalOk = () => {
    formRef.current?.validateFields().then((values) => {
      const data = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
        endDate: values.endDate ? values.endDate.toISOString() : undefined
      };
      
      if (isEdit && currentId) {
        dispatch(updateActionLog({ id: currentId, data })).then((action: any) => {
          if (updateActionLog.fulfilled.match(action)) {
            message.success('行动日志更新成功');
            setModalVisible(false);
            loadData();
          }
        });
      } else {
        dispatch(createActionLog(data)).then((action: any) => {
          if (createActionLog.fulfilled.match(action)) {
            message.success('行动日志创建成功');
            setModalVisible(false);
            loadData();
          }
        });
      }
    });
  };
  
  const handleViewDetails = (log: ActionLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };
  
  const handleUpdateProgress = (log: ActionLog) => {
    setSelectedLog(log);
    setProgressValue(log.progress);
    setCurrentValue(log.currentValue);
    setProgressModalVisible(true);
  };
  
  const handleSaveProgress = () => {
    if (!selectedLog) return;
    
    dispatch(updateActionLogProgress({
      id: selectedLog.id,
      progress: progressValue,
      currentValue: currentValue
    })).then((action: any) => {
      if (updateActionLogProgress.fulfilled.match(action)) {
        message.success('进度更新成功');
        setProgressModalVisible(false);
        loadData();
      }
    });
  };
  
  const handleCompleteLog = (id: string, notes?: string) => {
    dispatch(completeActionLog({ id, notes })).then((action: any) => {
      if (completeActionLog.fulfilled.match(action)) {
        message.success('行动日志已完成');
        loadData();
      }
    });
  };
  
  const handleBatchComplete = () => {
    Modal.confirm({
      title: '批量完成',
      content: (
        <div>
          <p>确定要将选中的{selectedRows.length}条行动日志标记为完成吗？</p>
          <Input.TextArea
            placeholder="请输入完成说明（可选）"
            rows={3}
            onChange={(e) => message.info('完成说明已保存')}
          />
        </div>
      ),
      onOk: () => {
        const promises = selectedRows.map(log => 
          dispatch(completeActionLog({ id: log.id, notes: '批量完成' }))
        );
        Promise.all(promises).then(() => {
          message.success(`成功完成${selectedRows.length}条行动日志`);
          setSelectedRows([]);
          loadData();
        });
      }
    });
  };
  
  const handleExport = () => {
    message.info('导出功能开发中');
  };
  
  const handleCopy = (log: ActionLog) => {
    dispatch(createActionLog({
      ...log,
      title: `${log.title} (副本)`,
      status: ActionLogStatus.NOT_STARTED,
      progress: 0,
      currentValue: 0,
      completedAt: undefined
    })).then((action: any) => {
      if (createActionLog.fulfilled.match(action)) {
        message.success('行动日志复制成功');
        loadData();
      }
    });
  };
  
  const columns: ColumnsType<ActionLog> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text) => <span className="text-gray-500">{text.slice(0, 8)}</span>
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text, record) => (
        <div className="flex items-center">
          <Badge 
            status={record.overdue ? "error" : "default"} 
            dot={record.overdue}
            className="mr-2"
          />
          <span className="font-medium">{text}</span>
        </div>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const option = typeOptions.find(t => t.value === type);
        return option ? (
          <Tag color={option.color}>{option.label}</Tag>
        ) : <Tag>{type}</Tag>;
      }
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (priority) => {
        const option = priorityOptions.find(p => p.value === priority);
        return option ? (
          <Tag color={option.color}>{option.label}</Tag>
        ) : <Tag>{priority}</Tag>;
      }
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_, record) => (
        <div className="flex items-center">
          <Progress 
            percent={record.progress} 
            size="small" 
            className="flex-1"
            status={record.overdue ? 'exception' : 'normal'}
          />
          <span className="ml-2 text-sm text-gray-600">
            {record.currentValue}/{record.targetValue}
          </span>
        </div>
      )
    },
    {
      title: '积分奖励',
      dataIndex: 'pointsReward',
      key: 'pointsReward',
      width: 100,
      render: (points) => (
        <div className="flex items-center text-yellow-600">
          <TrophyOutlined className="mr-1" />
          <span>{points}</span>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const option = statusOptions.find(s => s.value === status);
        return option ? (
          <Tag color={option.color}>{option.label}</Tag>
        ) : <Tag>{status}</Tag>;
      }
    },
    {
      title: '截止时间',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 150,
      render: (date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('MM-DD')
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="更新进度">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleUpdateProgress(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => handleCopy(record)}
            />
          </Tooltip>
          <Tooltip title="分享">
            <Button 
              type="text" 
              icon={<ShareAltOutlined />} 
              onClick={() => message.info('分享功能开发中')}
            />
          </Tooltip>
          {record.status !== ActionLogStatus.COMPLETED && (
            <Tooltip title="标记完成">
              <Button 
                type="text" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteLog(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除这条行动日志吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
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
    const cardConfigs = [
      { 
        title: '今日目标', 
        value: actionLogs.filter(log => 
          log.type === ActionLogType.DAILY_TASK && 
          dayjs(log.startDate).isSame(dayjs(), 'day')
        ).length,
        color: '#1890ff', 
        icon: <FlagOutlined /> 
      },
      { 
        title: '进行中', 
        value: actionLogs.filter(log => log.status === ActionLogStatus.IN_PROGRESS).length,
        color: '#13c2c2', 
        icon: <ClockCircleOutlined /> 
      },
      { 
        title: '已完成', 
        value: actionLogs.filter(log => log.status === ActionLogStatus.COMPLETED).length,
        color: '#52c41a', 
        icon: <CheckCircleOutlined /> 
      },
      { 
        title: '已逾期', 
        value: actionLogs.filter(log => log.overdue).length,
        color: '#f5222d', 
        icon: <WarningOutlined /> 
      },
      { 
        title: '总积分', 
        value: actionLogs.reduce((sum, log) => sum + (log.pointsReward || 0), 0),
        color: '#fa8c16', 
        icon: <TrophyOutlined /> 
      },
      { 
        title: '完成率', 
        value: `${(actionLogs.filter(log => log.status === ActionLogStatus.COMPLETED).length / Math.max(actionLogs.length, 1) * 100).toFixed(1)}%`,
        color: '#722ed1', 
        icon: <BarChartOutlined /> 
      }
    ];
    
    return (
      <Row gutter={[16, 16]}>
        {cardConfigs.map((config, index) => (
          <Col xs={24} sm={12} md={8} lg={4} key={index}>
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
  
  // 渲染类型分布
  const renderTypeDistribution = () => {
    if (!actionLogStatistics) return null;
    
    const typeStats = typeOptions.map(type => ({
      name: type.label,
      value: actionLogs.filter(log => log.type === type.value).length,
      color: type.color
    })).filter(stat => stat.value > 0);
    
    return (
      <Card title="行动日志类型分布" className="mt-4">
        <Row gutter={[16, 16]}>
          {typeStats.map((stat, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card className="h-full">
                <div className="flex items-center">
                  <Tag color={stat.color as any} className="mr-2">
                    {stat.name}
                  </Tag>
                  <div className="ml-auto">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <span className="text-gray-500 text-sm ml-1">条</span>
                  </div>
                </div>
                <Progress 
                  percent={(stat.value / Math.max(actionLogs.length, 1) * 100)} 
                  size="small"
                  strokeColor={stat.color}
                  className="mt-3"
                />
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
              placeholder="搜索行动日志标题或描述"
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              className="w-full md:w-80"
            />
          </div>
          <Space wrap>
            <RangePicker
              onChange={handleDateRangeChange}
              placeholder={['开始时间', '结束时间']}
              className="w-64"
            />
            
            <Select
              placeholder="行动类型"
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('type', value)}
              allowClear
            >
              {typeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
            
            <Select
              placeholder="优先级"
              style={{ width: 100 }}
              onChange={(value) => handleFilterChange('priority', value)}
              allowClear
            >
              {priorityOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
            
            <Select
              placeholder="状态"
              style={{ width: 100 }}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              {statusOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
            
            <Button 
              icon={<FilterOutlined />}
              onClick={() => message.info('高级筛选开发中')}
            >
              高级筛选
            </Button>
          </Space>
        </div>
        
        <Divider />
        
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-4">
          <TabPane tab="全部" key="all" />
          <TabPane tab="今日" key="today" />
          <TabPane tab="本周" key="week" />
          <TabPane tab="本月" key="month" />
          <TabPane tab="逾期" key="overdue" />
          <TabPane tab="已完成" key="completed" />
        </Tabs>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
          >
            新建行动日志
          </Button>
          
          <Button 
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            导出数据
          </Button>
          
          <Button 
            icon={<CheckCircleOutlined />}
            onClick={handleBatchComplete}
            disabled={selectedRows.length === 0}
          >
            批量完成 ({selectedRows.length})
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
      
      {/* 类型分布 */}
      {renderTypeDistribution()}
      
      {/* 行动日志表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={actionLogs}
          rowKey="id"
          loading={actionLogsLoading}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.pageSize,
            total: actionLogs.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条行动日志`
          }}
          onChange={handleTableChange}
          rowSelection={{
            selectedRowKeys: selectedRows.map(row => row.id),
            onChange: (_, selectedRows) => setSelectedRows(selectedRows)
          }}
          scroll={{ x: 1500 }}
        />
      </Card>
      
      {/* 详情模态框 */}
      <Modal
        title="行动日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedLog && (
          <div className="p-4">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">{selectedLog.title}</h2>
              <div className="flex items-center space-x-3 mb-3">
                <Tag color={typeOptions.find(t => t.value === selectedLog.type)?.color}>
                  {typeOptions.find(t => t.value === selectedLog.type)?.label}
                </Tag>
                <Tag color={priorityOptions.find(p => p.value === selectedLog.priority)?.color}>
                  {priorityOptions.find(p => p.value === selectedLog.priority)?.label}
                </Tag>
                <Tag color={statusOptions.find(s => s.value === selectedLog.status)?.color}>
                  {statusOptions.find(s => s.value === selectedLog.status)?.label}
                </Tag>
                {selectedLog.overdue && <Tag color="error">已逾期</Tag>}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-sm">创建时间</p>
                  <p>{dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">截止时间</p>
                  <p>{selectedLog.endDate ? dayjs(selectedLog.endDate).format('YYYY-MM-DD HH:mm:ss') : '无限制'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">目标值</p>
                  <p>{selectedLog.targetValue}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">当前值</p>
                  <p>{selectedLog.currentValue}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-2">进度</p>
                <Progress 
                  percent={selectedLog.progress} 
                  status={selectedLog.overdue ? 'exception' : 'normal'}
                  size="small"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>0</span>
                  <span>{selectedLog.targetValue}</span>
                </div>
              </div>
              
              {selectedLog.description && (
                <div className="mb-6">
                  <p className="text-gray-600 text-sm mb-2">描述</p>
                  <p className="whitespace-pre-wrap">{selectedLog.description}</p>
                </div>
              )}
              
              {selectedLog.notes && (
                <div className="mb-6">
                  <p className="text-gray-600 text-sm mb-2">备注</p>
                  <p className="whitespace-pre-wrap">{selectedLog.notes}</p>
                </div>
              )}
              
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-2">积分奖励</p>
                <div className="flex items-center text-yellow-600">
                  <TrophyOutlined className="mr-2" />
                  <span className="text-xl font-bold">{selectedLog.pointsReward} 积分</span>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-2">标签</p>
                <div className="flex flex-wrap gap-2">
                  {selectedLog.tags?.map((tag, index) => (
                    <Tag key={index} color="blue">{tag}</Tag>
                  ))}
                </div>
              </div>
              
              {selectedLog.completedAt && (
                <div className="mb-6">
                  <p className="text-gray-600 text-sm mb-2">完成时间</p>
                  <p>{dayjs(selectedLog.completedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      
      {/* 更新进度模态框 */}
      <Modal
        title="更新进度"
        open={progressModalVisible}
        onCancel={() => setProgressModalVisible(false)}
        onOk={handleSaveProgress}
        width={500}
      >
        {selectedLog && (
          <div className="p-4">
            <Form layout="vertical">
              <Form.Item label="当前值">
                <InputNumber
                  min={0}
                  max={selectedLog.targetValue}
                  value={currentValue}
                  onChange={(value) => {
                    setCurrentValue(value || 0);
                    setProgressValue(Math.round(((value || 0) / selectedLog.targetValue) * 100));
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Form.Item label="进度百分比">
                <InputNumber
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={(value) => {
                    setProgressValue(value || 0);
                    setCurrentValue(Math.round(((value || 0) / 100) * selectedLog.targetValue));
                  }}
                  formatter={value => `${value}%`}
                  parser={value => parseInt(value!.replace('%', '')) || 0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Form.Item label="进度条">
                <Progress 
                  percent={progressValue} 
                  status={selectedLog.overdue ? 'exception' : 'normal'}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>0</span>
                  <span>{selectedLog.targetValue}</span>
                </div>
              </Form.Item>
              
              <Form.Item label="完成奖励预览">
                <div className="flex items-center text-yellow-600">
                  <TrophyOutlined className="mr-2" />
                  <span>完成可获得 {selectedLog.pointsReward} 积分</span>
                </div>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
      
      {/* 行动日志编辑/创建模态框 */}
      <Modal
        title={isEdit ? '编辑行动日志' : '新建行动日志'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleModalOk}
        width={700}
        confirmLoading={actionLogsLoading}
      >
        <Form
          ref={formRef}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="标题"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="请输入行动日志标题" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="type"
                label="类型"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select placeholder="请选择类型">
                  {typeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <Tag color={option.color}>{option.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入行动日志的详细描述..."
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
              >
                <Select placeholder="请选择优先级">
                  {priorityOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <Tag color={option.color}>{option.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
              >
                <Select placeholder="请选择状态">
                  {statusOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <Tag color={option.color}>{option.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="targetValue"
                label="目标值"
                rules={[{ required: true, message: '请输入目标值' }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="请输入目标值"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pointsReward"
                label="积分奖励"
                rules={[{ required: true, message: '请输入积分奖励' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="请输入积分奖励"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="开始时间"
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder="请选择开始时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="截止时间"
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder="请选择截止时间"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="userId"
                label="所属用户"
              >
                <Input placeholder="请输入用户ID（可选）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="teamId"
                label="所属团队"
              >
                <Input placeholder="请输入团队ID（可选）" />
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
            name="notes"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注信息..."
            />
          </Form.Item>
          
          <Form.Item
            name="reminder"
            label="提醒设置"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启提醒" unCheckedChildren="关闭提醒" />
          </Form.Item>
          
          <Form.Item
            name="autoCreateNext"
            label="自动创建下一周期"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ActionLogManagement;