/**
 * 用户反馈工具 - 统一管理提示、通知和确认对话框
 */

import { message, notification, Modal } from 'antd';

// 消息类型
type MessageType = 'info' | 'success' | 'error' | 'warning' | 'loading';

// 通知位置类型
type NotificationPlacement = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

// 消息配置接口
interface MessageConfig {
  duration?: number;
  key?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
}

// 通知配置接口
interface NotificationConfig {
  message?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  placement?: NotificationPlacement;
  duration?: number;
  key?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
  btn?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 消息反馈工具类
 */
class FeedbackUtils {
  private static messageInstance = message;
  private static notificationInstance = notification;
  private static modalInstance = Modal;

  // 基础消息方法
  static showMessage(type: MessageType, content: string, config?: MessageConfig) {
    const method = this.messageInstance[type];
    if (method) {
      method(content, config?.duration || 3, config?.onClose);
    }
  }

  // 成功消息
  static success(message: string, config?: MessageConfig) {
    this.showMessage('success', message, config);
  }

  // 错误消息
  static error(message: string, config?: MessageConfig) {
    this.showMessage('error', message, config);
  }

  // 警告消息
  static warning(message: string, config?: MessageConfig) {
    this.showMessage('warning', message, config);
  }

  // 信息消息
  static info(message: string, config?: MessageConfig) {
    this.showMessage('info', message, config);
  }

  // 加载消息
  static loading(message: string, config?: MessageConfig) {
    const loadingConfig: MessageConfig = {
      duration: 0, // 持续显示
      ...config,
    };
    this.showMessage('loading', message, loadingConfig);
  }

  // 清除所有消息
  static destroyAllMessages() {
    this.messageInstance.destroy();
  }

  /**
   * 通知反馈方法
   */
  
  // 显示通知
  static showNotification(config: NotificationConfig) {
    const defaultConfig = {
      message: config.message || '通知',
      description: config.description,
      type: config.type,
      placement: 'topRight' as const,
      duration: 4.5,
      ...config,
    };
    
    this.notificationInstance.open(defaultConfig);
  }

  // 成功通知
  static successNotification(title: string, description: string, config?: NotificationConfig) {
    this.notificationInstance.success({
      message: title,
      description,
      ...config,
    });
  }

  // 错误通知
  static errorNotification(title: string, description: string, config?: NotificationConfig) {
    this.notificationInstance.error({
      message: title,
      description,
      ...config,
    });
  }

  // 警告通知
  static warningNotification(title: string, description: string, config?: NotificationConfig) {
    this.notificationInstance.warning({
      message: title,
      description,
      ...config,
    });
  }

  // 信息通知
  static infoNotification(title: string, description: string, config?: NotificationConfig) {
    this.notificationInstance.info({
      message: title,
      description,
      ...config,
    });
  }

  // 清除所有通知
  static destroyAllNotifications() {
    this.notificationInstance.destroy();
  }

  /**
   * 确认对话框方法
   */
  
  // 显示确认对话框
  static showConfirm(options: {
    title: string;
    content: string;
    onOk?: () => void;
    onCancel?: () => void;
    okText?: string;
    cancelText?: string;
    okType?: 'primary' | 'danger' | 'dashed' | 'link' | 'text' | 'default';
    width?: number;
    centered?: boolean;
  }) {
    this.modalInstance.confirm({
      title: options.title,
      content: options.content,
      okText: options.okText || '确定',
      cancelText: options.cancelText || '取消',
      okType: options.okType || 'danger',
      width: options.width || 416,
      centered: options.centered || false,
      onOk: options.onOk,
      onCancel: options.onCancel,
    });
  }

  // 删除确认对话框
  static deleteConfirm(
    itemName: string,
    onOk: () => void,
    options?: {
      title?: string;
      content?: string;
      okText?: string;
      cancelText?: string;
    }
  ) {
    this.showConfirm({
      title: options?.title || '删除确认',
      content: options?.content || `确定要删除 "${itemName}" 吗？此操作不可恢复。`,
      onOk,
      okText: options?.okText || '删除',
      okType: 'danger',
      ...options,
    });
  }

  // 操作确认对话框
  static operationConfirm(
    operation: string,
    itemName: string,
    onOk: () => void,
    options?: {
      title?: string;
      content?: string;
      okText?: string;
      cancelText?: string;
      okType?: 'primary' | 'danger' | 'dashed' | 'link' | 'text' | 'default';
    }
  ) {
    this.showConfirm({
      title: options?.title || `${operation}确认`,
      content: options?.content || `确定要${operation} "${itemName}" 吗？`,
      onOk,
      okText: options?.okText || operation,
      okType: options?.okType || 'primary',
      ...options,
    });
  }

  /**
   * 文件操作反馈
   */
  
  // 文件上传成功
  static fileUploadSuccess(fileName: string) {
    this.successNotification('文件上传成功', `文件 "${fileName}" 已成功上传`);
  }

  // 文件上传失败
  static fileUploadError(fileName: string, error: string) {
    this.errorNotification('文件上传失败', `文件 "${fileName}" 上传失败: ${error}`);
  }

  // 文件格式错误
  static fileFormatError(allowedFormats: string[]) {
    this.errorNotification(
      '文件格式错误',
      `仅支持以下格式: ${allowedFormats.join(', ')}`
    );
  }

  // 文件大小错误
  static fileSizeError(maxSizeMB: number) {
    this.errorNotification(
      '文件大小超出限制',
      `文件大小不能超过 ${maxSizeMB}MB`
    );
  }

  /**
   * 数据操作反馈
   */
  
  // 数据保存成功
  static saveSuccess(itemName?: string) {
    this.success('保存成功', {
      duration: 2,
    });
    if (itemName) {
      this.successNotification('数据保存成功', `${itemName} 已成功保存`);
    }
  }

  // 数据保存失败
  static saveError(itemName?: string, error?: string) {
    this.error('保存失败', {
      duration: 3,
    });
    if (itemName) {
      this.errorNotification(
        '数据保存失败',
        `${itemName} 保存失败${error ? `: ${error}` : ''}`
      );
    }
  }

  // 数据删除成功
  static deleteSuccess(itemName: string) {
    this.success(`${itemName} 已删除`, {
      duration: 2,
    });
  }

  // 数据删除失败
  static deleteError(itemName: string, error?: string) {
    this.error(`删除 ${itemName} 失败`, {
      duration: 3,
    });
    if (error) {
      this.errorNotification('删除失败', error);
    }
  }

  /**
   * 批量操作反馈
   */
  
  // 批量操作成功
  static batchOperationSuccess(count: number, operation: string) {
    this.successNotification(
      '批量操作成功',
      `已成功${operation} ${count} 个项目`
    );
  }

  // 批量操作失败
  static batchOperationError(count: number, operation: string, error?: string) {
    this.errorNotification(
      '批量操作失败',
      `${operation} ${count} 个项目失败${error ? `: ${error}` : ''}`
    );
  }

  /**
   * 网络状态反馈
   */
  
  // 网络连接失败
  static networkError() {
    this.errorNotification(
      '网络连接失败',
      '请检查您的网络连接，然后重试'
    );
  }

  // 服务器错误
  static serverError() {
    this.errorNotification(
      '服务器错误',
      '服务器暂时无法处理您的请求，请稍后重试'
    );
  }

  // 权限不足
  static permissionDenied() {
    this.errorNotification(
      '权限不足',
      '您没有执行此操作的权限'
    );
  }

  /**
   * 表单验证反馈
   */
  
  // 表单验证失败
  static formValidationError(field?: string) {
    const message = field ? `请正确填写 ${field}` : '请正确填写所有必填项';
    this.warning(message, {
      duration: 3,
    });
  }

  // 表单提交成功
  static formSubmitSuccess(formName?: string) {
    const message = formName ? `${formName} 提交成功` : '提交成功';
    this.success(message, {
      duration: 2,
    });
  }

  // 表单提交失败
  static formSubmitError(formName?: string, error?: string) {
    const message = formName ? `${formName} 提交失败` : '提交失败';
    this.error(message, {
      duration: 3,
    });
    if (error) {
      this.errorNotification('提交失败', error);
    }
  }

  /**
   * 自定义钩子
   */
  
  // 创建消息钩子
  static useMessage() {
    return {
      success: this.success.bind(this),
      error: this.error.bind(this),
      warning: this.warning.bind(this),
      info: this.info.bind(this),
      loading: this.loading.bind(this),
      destroyAll: this.destroyAllMessages.bind(this),
    };
  }

  // 创建通知钩子
  static useNotification() {
    return {
      success: this.successNotification.bind(this),
      error: this.errorNotification.bind(this),
      warning: this.warningNotification.bind(this),
      info: this.infoNotification.bind(this),
      open: this.showNotification.bind(this),
      destroyAll: this.destroyAllNotifications.bind(this),
    };
  }

  // 创建确认对话框钩子
  static useConfirm() {
    return {
      show: this.showConfirm.bind(this),
      delete: this.deleteConfirm.bind(this),
      operation: this.operationConfirm.bind(this),
    };
  }
}

// 导出默认实例
export default FeedbackUtils;

// 快捷导出（绑定this上下文，避免解构后this丢失）
export const success = FeedbackUtils.success.bind(FeedbackUtils);
export const error = FeedbackUtils.error.bind(FeedbackUtils);
export const warning = FeedbackUtils.warning.bind(FeedbackUtils);
export const info = FeedbackUtils.info.bind(FeedbackUtils);
export const loading = FeedbackUtils.loading.bind(FeedbackUtils);
export const destroyAllMessages = FeedbackUtils.destroyAllMessages.bind(FeedbackUtils);

export const successNotification = FeedbackUtils.successNotification.bind(FeedbackUtils);
export const errorNotification = FeedbackUtils.errorNotification.bind(FeedbackUtils);
export const warningNotification = FeedbackUtils.warningNotification.bind(FeedbackUtils);
export const infoNotification = FeedbackUtils.infoNotification.bind(FeedbackUtils);
export const destroyAllNotifications = FeedbackUtils.destroyAllNotifications.bind(FeedbackUtils);

export const showConfirm = FeedbackUtils.showConfirm.bind(FeedbackUtils);
export const deleteConfirm = FeedbackUtils.deleteConfirm.bind(FeedbackUtils);
export const operationConfirm = FeedbackUtils.operationConfirm.bind(FeedbackUtils);

export const saveSuccess = FeedbackUtils.saveSuccess.bind(FeedbackUtils);
export const saveError = FeedbackUtils.saveError.bind(FeedbackUtils);
export const deleteSuccess = FeedbackUtils.deleteSuccess.bind(FeedbackUtils);
export const deleteError = FeedbackUtils.deleteError.bind(FeedbackUtils);

export const fileUploadSuccess = FeedbackUtils.fileUploadSuccess.bind(FeedbackUtils);
export const fileUploadError = FeedbackUtils.fileUploadError.bind(FeedbackUtils);
export const fileFormatError = FeedbackUtils.fileFormatError.bind(FeedbackUtils);
export const fileSizeError = FeedbackUtils.fileSizeError.bind(FeedbackUtils);

export const useMessage = FeedbackUtils.useMessage.bind(FeedbackUtils);
export const useNotification = FeedbackUtils.useNotification.bind(FeedbackUtils);
export const useConfirm = FeedbackUtils.useConfirm.bind(FeedbackUtils);