var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    customer_name: '',
    customer_phone: '',
    selectedCustomer: null,
    customerSearchResults: { users: [], customers: [] },
    showCustomerPicker: false,
    products: [],
    selectedProduct: null,
    showProductPicker: false,
    trace_code: '',
    start_date: '',
    usage_instructions: '',
    usageOptions: [],
    selectedUsageIndex: -1,
    submitting: false
  },

  onLoad: function() {
    this.loadProducts();
    var today = util.formatDate(new Date(), 'YYYY-MM-DD');
    this.setData({ start_date: today });
  },

  loadProducts: function() {
    var that = this;
    api.usage.getProducts({}).then(function(res) {
      if (res.data && res.data.code === 0) {
        that.setData({ products: res.data.data || [] });
      }
    });
  },

  // 顾客姓名输入
  onNameInput: function(e) {
    this.setData({ customer_name: e.detail.value });
  },

  // 顾客手机号输入
  onPhoneInput: function(e) {
    var phone = e.detail.value;
    this.setData({ customer_phone: phone });
    // 手机号长度 >= 3 时搜索
    if (phone.length >= 3) {
      this.searchCustomer(phone);
    } else {
      this.setData({ customerSearchResults: { users: [], customers: [] } });
    }
  },

  searchCustomer: function(phone) {
    var that = this;
    api.usage.searchCustomers({ phone: phone }).then(function(res) {
      if (res.data && res.data.code === 0) {
        that.setData({ customerSearchResults: res.data.data || [] });
      }
    });
  },

  selectCustomer: function(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      selectedCustomer: item,
      customer_name: item.name || '',
      customer_phone: item.phone || '',
      customerSearchResults: { users: [], customers: [] }
    });
  },

  toggleCustomerPicker: function() {
    this.setData({ showCustomerPicker: !this.data.showCustomerPicker });
  },

  // 产品选择
  toggleProductPicker: function() {
    this.setData({ showProductPicker: !this.data.showProductPicker });
  },

  selectProduct: function(e) {
    var item = e.currentTarget.dataset.item;
    var usageOptions = [];
    try {
      usageOptions = JSON.parse(item.usage_instructions || '[]');
    } catch (e) {}
    this.setData({
      selectedProduct: item,
      showProductPicker: false,
      usageOptions: usageOptions,
      selectedUsageIndex: -1,
      usage_instructions: ''
    });
  },

  // 溯源码输入
  onTraceCodeInput: function(e) {
    this.setData({ trace_code: e.detail.value });
  },

  // 日期选择
  onDateChange: function(e) {
    this.setData({ start_date: e.detail.value });
  },

  // 使用说明选择
  selectUsageOption: function(e) {
    var index = e.currentTarget.dataset.index;
    var option = this.data.usageOptions[index];
    this.setData({
      selectedUsageIndex: index,
      usage_instructions: option
    });
  },

  onUsageInput: function(e) {
    this.setData({ usage_instructions: e.detail.value, selectedUsageIndex: -1 });
  },

  // 提交
  submit: function() {
    var that = this;
    if (that.data.submitting) return;

    if (!that.data.customer_name) {
      wx.showToast({ title: '请填写顾客姓名', icon: 'none' });
      return;
    }
    if (!that.data.selectedProduct) {
      wx.showToast({ title: '请选择产品', icon: 'none' });
      return;
    }
    if (!that.data.start_date) {
      wx.showToast({ title: '请选择使用日期', icon: 'none' });
      return;
    }

    that.setData({ submitting: true });

    var data = {
      customer_name: that.data.customer_name,
      customer_phone: that.data.customer_phone || '',
      customer_id: that.data.selectedCustomer ? that.data.selectedCustomer.customer_id : null,
      product_id: that.data.selectedProduct.id,
      trace_code: that.data.trace_code || '',
      start_date: that.data.start_date,
      usage_instructions: that.data.usage_instructions || ''
    };

    api.usage.createLog(data).then(function(res) {
      if (res.data && res.data.code === 0) {
        wx.showToast({ title: '录入成功', icon: 'success' });
        setTimeout(function() {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.data.message || '录入失败', icon: 'none' });
      }
    }).catch(function(err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }).finally(function() {
      that.setData({ submitting: false });
    });
  }
});
