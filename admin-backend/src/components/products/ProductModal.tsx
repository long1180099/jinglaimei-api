// 商品创建/编辑模态框组件 - 含商品图片库
import React, { useEffect, useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Button, 
  Space, 
  Row, 
  Col,
  Tag,
  message,
  Switch,
  Divider,
  Alert,
  Upload,
  Image as AntImage,
  Popconfirm,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  MinusCircleOutlined,
  PictureOutlined,
  StarFilled,
  DeleteOutlined,
  SwapLeftOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createProduct, updateProduct } from '../../store/slices/productSlice';
import { Product, ProductCategory, ProductCreateRequest, ProductUpdateRequest } from '../../types/product';
import { dbProductApi, toFullImageUrl } from '../../services/dbProductApi';

const { TextArea } = Input;
const { Option } = Select;

interface ProductModalProps {
  visible: boolean;
  editingProduct: Product | null;
  categories: ProductCategory[];
  onCancel: () => void;
  onSuccess: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({
  visible,
  editingProduct,
  categories,
  onCancel,
  onSuccess
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [specifications, setSpecifications] = useState<string[]>(['']);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // ==================== 商品图片库状态 ====================
  const [imageList, setImageList] = useState<Array<{ url: string; isMain: boolean }>>([]);
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // 初始化表单数据
  useEffect(() => {
    if (editingProduct) {
      form.setFieldsValue({
        ...editingProduct,
        // commissionRate在数据库存小数(0.15)，表单显示百分比(15)，需转换
        commissionRate: Math.round((editingProduct.commissionRate || 0) * 100),
        dimensions: {
          length: editingProduct.dimensions.length,
          width: editingProduct.dimensions.width,
          height: editingProduct.dimensions.height
        }
      });
      setSpecifications(editingProduct.specifications.length > 0 ? editingProduct.specifications : ['']);
      setTags(editingProduct.tags);
      // 初始化图片库：将images数组转为imageList（首张标记为主图），补全完整URL用于显示
      const imgs = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
        ? editingProduct.images.map((url: string, idx: number) => ({ url: toFullImageUrl(url) || url, isMain: idx === 0 }))
        : [];
      setImageList(imgs);
    } else {
      form.resetFields();
      setSpecifications(['']);
      setTags([]);
      setImageList([]);
    }
  }, [editingProduct, form]);

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const IMAGE_BASE = 'http://localhost:4000';
      // 将完整URL还原为相对路径（用于存储到数据库）
      const toRelativeUrl = (url: string) => url.startsWith(IMAGE_BASE) ? url.replace(IMAGE_BASE, '') : url;

      const formData: any = {
        ...values,
        // 从图片库获取最新的URL列表（保持主图排第一，存储相对路径）
        images: imageList.length > 0
          ? [...imageList.filter(i => i.isMain), ...imageList.filter(i => !i.isMain)].map(i => toRelativeUrl(i.url))
          : (Array.isArray(values.images) ? values.images.map((v: string) => toRelativeUrl(v)) : []),
        specifications: specifications.filter(spec => spec.trim() !== ''),
        tags: tags,
        commissionRate: values.commissionRate / 100, // 转换为小数
        dimensions: {
          length: values.dimensions?.length || 0,
          width: values.dimensions?.width || 0,
          height: values.dimensions?.height || 0
        },
        // 确保数值字段正确
        retailPrice: Number(values.retailPrice),
        agentPrice: Number(values.agentPrice),
        vipPrice: Number(values.vipPrice),
        partnerPrice: Number(values.partnerPrice),
        costPrice: Number(values.costPrice),
        stock: Number(values.stock),
        weight: Number(values.weight),
        shippingFee: Number(values.shippingFee),
        minOrderQuantity: Number(values.minOrderQuantity),
        maxOrderQuantity: Number(values.maxOrderQuantity)
      };

      if (editingProduct) {
        // 更新商品
        const updateData: ProductUpdateRequest = {
          id: editingProduct.id,
          ...formData
        };
        await dispatch(updateProduct(updateData)).unwrap();
        message.success('商品更新成功');
      } else {
        // 创建商品
        const createData: ProductCreateRequest = formData;
        await dispatch(createProduct(createData)).unwrap();
        message.success('商品创建成功');
      }
      
      onSuccess();
    } catch (error) {
      console.error('表单提交失败:', error);
      message.error('操作失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 添加规格
  const addSpecification = () => {
    setSpecifications([...specifications, '']);
  };

  // 更新规格
  const updateSpecification = (index: number, value: string) => {
    const newSpecs = [...specifications];
    newSpecs[index] = value;
    setSpecifications(newSpecs);
  };

  // 移除规格
  const removeSpecification = (index: number) => {
    const newSpecs = specifications.filter((_, i) => i !== index);
    setSpecifications(newSpecs);
  };

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 移除标签
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // ==================== 商品图片库操作 ====================

  // 上传图片（customRequest）
  const handleImageUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const result = await dbProductApi.uploadProductImage(file);
      const fullUrl = toFullImageUrl(result.url) || result.url;
      setImageList(prev => [...prev, { url: fullUrl, isMain: prev.length === 0 }]);
      // 同步到form（存储相对路径用于提交）
      const newUrls = [...imageList.map(i => i.url), result.url];
      form.setFieldsValue({ images: newUrls });
      onSuccess?.(result);
      message.success('图片上传成功');
    } catch (err: any) {
      message.error('上传失败：' + (err.message || '未知错误'));
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  // 设为主图
  const setAsMain = (index: number) => {
    setImageList(prev => {
      const updated = prev.map((img, i) => ({ ...img, isMain: i === index }));
      return updated;
    });
    message.success('已设为主图');
  };

  // 删除图片
  const removeImage = (index: number) => {
    setImageList(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // 如果删的是主图，自动把第一张设为主图
      if (prev[index]?.isMain && updated.length > 0) {
        updated[0].isMain = true;
      }
      return updated;
    });
    // 同步到form
    const urls = imageList.filter((_, i) => i !== index).map(i => i.url);
    form.setFieldsValue({ images: urls });
  };

  // 左移排序（和前一张交换位置）
  const moveImageLeft = (index: number) => {
    if (index <= 0) return;
    setImageList(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  };

  // 预览大图
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  return (
    <Modal
      title={editingProduct ? '编辑商品' : '新增商品'}
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          {editingProduct ? '更新商品' : '创建商品'}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'active',
          shippingType: 'free',
          unit: '件',
          commissionRate: 0,
          weight: 0.1,
          shippingFee: 0,
          minOrderQuantity: 1,
          maxOrderQuantity: 100,
          isFeatured: false,
          isHot: false,
          dimensions: {
            length: 10,
            width: 10,
            height: 10
          }
        }}
      >
        <Row gutter={24}>
          {/* 基本信息 */}
          <Col span={12}>
            <Form.Item
              name="name"
              label="商品名称"
              rules={[{ required: true, message: '请输入商品名称' }]}
            >
              <Input placeholder="请输入商品名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="category"
              label="商品分类"
              rules={[{ required: true, message: '请选择商品分类' }]}
            >
              <Select placeholder="请选择商品分类">
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="商品描述"
          rules={[{ required: true, message: '请输入商品描述' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="请输入商品描述" 
            showCount 
            maxLength={500}
          />
        </Form.Item>

        {/* 价格设置 - 六级价格体系 */}
        <Divider orientation="left">
          <span style={{ fontSize: 16, fontWeight: 600 }}>💰 六级价格体系</span>
        </Divider>
        <Alert
          message="六级价格体系：零售价 > 代言人价 > 代理价 > 批发价 > 分公司价 > 事业部价"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Row gutter={16}>
          <Col span={4}>
            <Form.Item
              name="retailPrice"
              label={<span><span style={{ color: '#ff4d4f', marginRight: 4 }}>●</span>零售价</span>}
              rules={[{ required: true, message: '请输入零售价' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="¥" placeholder="零售价" precision={2} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="vipPrice"
              label={<span><span style={{ color: '#52c41a', marginRight: 4 }}>●</span>代言人价</span>}
              rules={[{ required: true, message: '请输入代言人价' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="¥" placeholder="打版代言人" precision={2} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="agentPrice"
              label={<span><span style={{ color: '#1890ff', marginRight: 4 }}>●</span>代理价</span>}
              rules={[{ required: true, message: '请输入代理价' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="¥" placeholder="代理商进货价" precision={2} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="partnerPrice"
              label={<span><span style={{ color: '#fa8c16', marginRight: 4 }}>●</span>批发价</span>}
              rules={[{ required: true, message: '请输入批发价' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="¥" placeholder="批发商进货价" precision={2} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="chiefPrice"
              label={<span><span style={{ color: '#f5222d', marginRight: 4 }}>●</span>分公司价</span>}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="¥" placeholder="首席分公司价" precision={2} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="divisionPrice"
              label={<span><span style={{ color: '#722ed1', marginRight: 4 }}>●</span>事业部价</span>}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="¥" placeholder="集团事业部价" precision={2} />
            </Form.Item>
          </Col>
        </Row>


        <Row gutter={24}>
          <Col span={6}>
            <Form.Item
              name="costPrice"
              label="成本价"
              rules={[{ required: true, message: '请输入成本价' }]}
            >
              <InputNumber 
                min={0} 
                style={{ width: '100%' }} 
                addonBefore="¥" 
                placeholder="成本价"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="commissionRate"
              label="佣金比例"
              rules={[{ required: true, message: '请输入佣金比例' }]}
            >
              <InputNumber 
                min={0} 
                max={100}
                style={{ width: '100%' }} 
                addonAfter="%" 
                placeholder="佣金比例"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="stock"
              label="库存数量"
              rules={[{ required: true, message: '请输入库存数量' }]}
            >
              <InputNumber 
                min={0} 
                style={{ width: '100%' }} 
                placeholder="库存数量"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="unit"
              label="单位"
              rules={[{ required: true, message: '请输入单位' }]}
            >
              <Input placeholder="如：瓶、盒、件" />
            </Form.Item>
          </Col>
        </Row>

        {/* 商品规格 */}
        <Divider orientation="left">商品规格</Divider>
        <Alert 
          message="规格是商品的不同选项，如尺寸、颜色、容量等" 
          type="info" 
          style={{ marginBottom: 16 }}
        />
        
        {specifications.map((spec, index) => (
          <Row gutter={16} key={index} style={{ marginBottom: 12 }}>
            <Col span={20}>
              <Input
                value={spec}
                onChange={(e) => updateSpecification(index, e.target.value)}
                placeholder={`规格 ${index + 1}（如：30ml、红色、M码）`}
              />
            </Col>
            <Col span={4}>
              <Button
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => removeSpecification(index)}
                disabled={specifications.length <= 1}
              >
                移除
              </Button>
            </Col>
          </Row>
        ))}
        
        <Button
          type="dashed"
          onClick={addSpecification}
          block
          icon={<PlusOutlined />}
          style={{ marginBottom: 24 }}
        >
          添加规格
        </Button>

        {/* 标签管理 */}
        <Divider orientation="left">商品标签</Divider>
        <div style={{ marginBottom: 16 }}>
          <Space wrap style={{ marginBottom: 12 }}>
            {tags.map(tag => (
              <Tag 
                key={tag} 
                closable 
                onClose={() => removeTag(tag)}
              >
                {tag}
              </Tag>
            ))}
          </Space>
          <Input.Group compact>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="输入标签后按添加"
              style={{ width: '200px' }}
              onPressEnter={(e) => {
                e.preventDefault();
                addTag();
              }}
            />
            <Button type="primary" onClick={addTag}>
              添加
            </Button>
          </Input.Group>
          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
            标签可以用于筛选和分类，如：热销、推荐、护肤等
          </div>
        </div>

        {/* 物流信息 */}
        <Divider orientation="left">物流信息</Divider>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item
              name="weight"
              label="重量（kg）"
              rules={[{ required: true, message: '请输入重量' }]}
            >
              <InputNumber 
                min={0} 
                step={0.1} 
                style={{ width: '100%' }} 
                placeholder="重量"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="shippingType"
              label="配送方式"
              rules={[{ required: true, message: '请选择配送方式' }]}
            >
              <Select placeholder="请选择配送方式">
                <Option value="free">包邮</Option>
                <Option value="flat_rate">固定运费</Option>
                <Option value="calculated">运费计算</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="shippingFee"
              label="运费（元）"
              dependencies={['shippingType']}
            >
              <InputNumber 
                min={0} 
                style={{ width: '100%' }} 
                placeholder="运费"
                disabled={form.getFieldValue('shippingType') === 'free'}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={8}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>尺寸（cm）</div>
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item name={['dimensions', 'length']} label="长">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="长" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name={['dimensions', 'width']} label="宽">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="宽" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name={['dimensions', 'height']} label="高">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="高" />
                </Form.Item>
              </Col>
            </Row>
          </Col>
          <Col span={8}>
            <Form.Item
              name="minOrderQuantity"
              label="最小起订量"
              rules={[{ required: true, message: '请输入最小起订量' }]}
            >
              <InputNumber 
                min={1} 
                style={{ width: '100%' }} 
                placeholder="最小起订量"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="maxOrderQuantity"
              label="最大可订量"
              rules={[{ required: true, message: '请输入最大可订量' }]}
            >
              <InputNumber 
                min={1} 
                style={{ width: '100%' }} 
                placeholder="最大可订量"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 商品状态 */}
        <Divider orientation="left">商品状态</Divider>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item
              name="status"
              label="商品状态"
              rules={[{ required: true, message: '请选择商品状态' }]}
            >
              <Select placeholder="请选择商品状态">
                <Option value="active">销售中</Option>
                <Option value="inactive">已下架</Option>
                <Option value="out_of_stock">缺货</Option>
                <Option value="pre_sale">预售</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="isFeatured"
              label="推荐商品"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="isHot"
              label="热销商品"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        {/* 商品图片库 */}
        <Divider orientation="left">
          <span style={{ fontSize: 16, fontWeight: 600 }}>🖼️ 商品图片库</span>
        </Divider>

        <div className="product-image-gallery" style={{ 
          border: '1px dashed #d9d9d9', borderRadius: 8, padding: 16,
          background: imageList.length === 0 ? '#fafafa' : '#fff'
        }}>
          {imageList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
              <PictureOutlined style={{ fontSize: 36, color: '#d9d9d9', marginBottom: 8 }} />
              <div>暂无图片，请点击下方按钮上传</div>
            </div>
          ) : (
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              {imageList.map((img, index) => (
                <Col key={index} xs={8} sm={6} md={4}>
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: img.isMain ? '2px solid #1890ff' : '1px solid #e8e8e8',
                      cursor: 'pointer',
                    }}
                    >
                    {/* 主图标签 */}
                    {img.isMain && (
                      <Tag color="blue" style={{
                        position: 'absolute', top: 4, left: 4, zIndex: 2,
                        margin: 0, fontSize: 11, padding: '0 6px'
                      }}>
                        <StarFilled /> 主图
                      </Tag>
                    )}
                    
                    {/* 图片 */}
                    <div
                      style={{ width: '100%', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}
                      onClick={() => handlePreview(img.url)}
                    >
                      <AntImage
                        src={img.url}
                        fallback="https://via.placeholder.com/100"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                        preview={false}
                      />
                    </div>

                    {/* 操作栏 */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(0,0,0,0.55)', padding: '4px 6px',
                      display: 'flex', justifyContent: 'space-between'
                    }}>
                      <Space size={4}>
                        {!img.isMain && (
                          <Button
                            type="text" size="small" icon={<StarFilled />}
                            onClick={(e) => { e.stopPropagation(); setAsMain(index); }}
                            style={{ color: '#fff', padding: '0 2px', height: 22 }}
                            title="设为主图"
                          />
                        )}
                        {index > 0 && (
                          <Button
                            type="text" size="small" icon={<SwapLeftOutlined />}
                            onClick={(e) => { e.stopPropagation(); moveImageLeft(index); }}
                            style={{ color: '#fff', padding: '0 2px', height: 22 }}
                            title="左移排序"
                          />
                        )}
                        <Button
                          type="text" size="small" icon={<EyeOutlined />}
                          onClick={(e) => { e.stopPropagation(); handlePreview(img.url); }}
                          style={{ color: '#fff', padding: '0 2px', height: 22 }}
                          title="预览大图"
                        />
                      </Space>
                      
                      <Popconfirm
                        title="确定删除此图片？"
                        onConfirm={(e) => { e?.stopPropagation(); removeImage(index); }}
                        okText="确定" cancelText="取消"
                      >
                        <Button
                          type="text" size="small" danger icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#ff7875', padding: '0 2px', height: 22 }}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}

          {/* 上传按钮 */}
          <Form.Item name="images" hidden>
            <Input />
          </Form.Item>
          <Upload
            accept=".jpg,.jpeg,.png,.webp,.gif,.bmp"
            customRequest={handleImageUpload}
            showUploadList={false}
            multiple={false}
          >
            <Button icon={<PictureOutlined />} loading={uploading} block>
              {uploading ? '上传中...' : '上传图片'}
              {imageList.length > 0 && ` (已${imageList.length}张)`}
            </Button>
          </Upload>

          {/* 提示信息 */}
          <Alert
            message={`支持 JPG/PNG/WEBP/GIF 格式，单张最大10MB。首张自动为主图，最多支持9张`}
            type="info"
            showIcon
            style={{ marginTop: 8, padding: '4px 12px' }}
          />
        </div>
      </Form>

      {/* 图片大图预览 */}
      <AntImage
        style={{ display: 'none' }}
        preview={{
          visible: previewVisible,
          src: previewImage,
          onVisibleChange: (val) => setPreviewVisible(val),
        }}
      />
    </Modal>
  );
};

export default ProductModal;