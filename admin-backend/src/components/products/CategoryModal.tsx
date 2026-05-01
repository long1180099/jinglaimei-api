// 分类管理模态框组件
import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, TreeSelect, Button, Space, message } from 'antd';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createCategory, updateCategory } from '../../store/slices/productSlice';
import { ProductCategory } from '../../types/product';

const { TextArea } = Input;
const { Option } = Select;

interface CategoryModalProps {
  visible: boolean;
  editingCategory: ProductCategory | null;
  categories: ProductCategory[];
  onCancel: () => void;
  onSuccess: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  editingCategory,
  categories,
  onCancel,
  onSuccess
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  // 构建树形数据
  const buildTreeData = (categories: ProductCategory[]) => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    categories.forEach(category => {
      map.set(category.id, {
        ...category,
        key: category.id,
        title: category.name,
        value: category.id,
        children: []
      });
    });

    categories.forEach(category => {
      const node = map.get(category.id)!;
      if (category.parentId) {
        const parent = map.get(category.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const treeData = buildTreeData(categories);

  // 初始化表单数据
  useEffect(() => {
    if (editingCategory) {
      form.setFieldsValue({
        ...editingCategory,
        parentId: editingCategory.parentId || undefined
      });
    } else {
      form.resetFields();
    }
  }, [editingCategory, form]);

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const categoryData = {
        ...values,
        level: values.parentId ? 2 : 1,
        productCount: 0
      };

      if (editingCategory) {
        // 更新分类
        await dispatch(updateCategory({
          ...editingCategory,
          ...categoryData
        })).unwrap();
        message.success('分类更新成功');
      } else {
        // 创建分类
        await dispatch(createCategory(categoryData)).unwrap();
        message.success('分类创建成功');
      }
      
      onSuccess();
    } catch (error) {
      message.error('操作失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingCategory ? '编辑分类' : '新增分类'}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          {editingCategory ? '更新分类' : '创建分类'}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          sortOrder: 0,
          level: 1
        }}
      >
        <Form.Item
          name="name"
          label="分类名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
        >
          <Input placeholder="请输入分类名称" />
        </Form.Item>

        <Form.Item
          name="description"
          label="分类描述"
          rules={[{ required: true, message: '请输入分类描述' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="请输入分类描述" 
            showCount 
            maxLength={200}
          />
        </Form.Item>

        <Form.Item
          name="parentId"
          label="父级分类"
          tooltip="不选择则为一级分类"
        >
          <TreeSelect
            placeholder="请选择父级分类（可选）"
            treeData={treeData}
            allowClear
            treeDefaultExpandAll
            disabled={editingCategory?.level === 2}
          />
        </Form.Item>

        <Form.Item
          name="icon"
          label="分类图标"
          tooltip="可输入emoji或图标代码"
        >
          <Input placeholder="如：💆‍♀️、🍎、👚" />
        </Form.Item>

        <Form.Item
          name="sortOrder"
          label="排序序号"
          rules={[{ required: true, message: '请输入排序序号' }]}
          tooltip="数字越小排序越靠前"
        >
          <InputNumber 
            min={0} 
            max={999}
            style={{ width: '100%' }} 
            placeholder="排序序号"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CategoryModal;