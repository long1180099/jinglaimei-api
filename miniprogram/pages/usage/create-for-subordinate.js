var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    // 步骤控制
    step: 1,

    // 步骤1: 选择下级代理商
    subordinates: [],
    subordinateSearch: '',
    selectedSubordinate: null,
    showSubordinatePicker: false,

    // 步骤2-6: 同 create-log
    customer_name: '',
    customer_phone: '',
    selectedCustomer: null,
    customerSearchResults: { users: [], customers: [] },
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
    this.loadSubordinates();
    this.loadProducts();
    var today = util.formatDate(new Date(), 'YYYY-MM-DD');
    this.setData({ start_date: today });
  },

  // 加载下级列表
  loadSubordinates: function() {
    var that = this;
    api.usage.getSubordinates({}).then(function(res) {
      if (res.data && res.data.code === 0) {
        var list = (res.data.data || []).map(function(item) {
          item.level_text = util.agentLevelText(item.agent_level);
          return item;
        });
        that.setData({ subordinates: list });
      }
    });
  },

  // 下级搜索
  onSubordinateSearch: function(e) {
    var keyword = e.detail.value;
    this.setData({ subordinateSearch: keyword });
    if (keyword.length >= 1) {
      var that = this;
      api.usage.getSubordinates({ search: keyword }).then(function(res) {
        if (res.data && res.data.code === 0) {
          var list = (res.data.data || []).map(function(item) {
            item.level_text = util.agentLevelText(item.agent_level);
            return item;
          });
          that.setData({ subordinates: list });
        }
      });
    }
  },

  selectSubordinate: function(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      selectedSubordinate: item,
      showSubordinatePicker: false,
      step: 2
    });
  },

  toggleSubordinatePicker: function() {
    this.setData({ showSubordinatePicker: !this.data.showSubordinatePicker });
  },

  prevStep: function() {
    if (this.data.step > 1) {
      this.setData({ step: this.data.step - 1 });
    }
  },

  // 以下与 create-log 相同的逻辑
  loadProducts: function() {
    var that = this;
    api.usage.getProducts({}).then(function(res) {
      if (res.data && res.data.code === 0) {
        that.setData({ products: res.data.data || [] });
      }
    });
  },

  onNameInput: function(e) { this.setData({ customer_name: e.detail.value }); },
  onPhoneInput: function(e) {
    var phone = e.detail.value;
    this.setData({ customer_phone: phone });
    if (phone.length >= 3) { this.searchCustomer(phone); }
    else { this.setData({ customerSearchResults: { users: [], customers: [] } }); }
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
      selectedCustomer: item, customer_name: item.name || '',
      customer_phone: item.phone || '',       customerSearchResults: { users: [], customers: [] }
    });
  },

  toggleProductPicker: function() {
    this.setData({ showProductPicker: !this.data.showProductPicker });
  },

  selectProduct: function(e) {
    var item = e.currentTarget.dataset.item;
    var usageOptions = [];
    try { usageOptions = JSON.parse(item.usage_instructions || '[]'); } catch (e) {}
    this.setData({
      selectedProduct: item, showProductPicker: false,
      usageOptions: usageOptions, selectedUsageIndex: -1, usage_instructions: ''
    });
  },

  onTraceCodeInput: function(e) { this.setData({ trace_code: e.detail.value }); },
  onDateChange: function(e) { this.setData({ start_date: e.detail.value }); },

  selectUsageOption: function(e) {
    var index = e.currentTarget.dataset.index;
    this.setData({ selectedUsageIndex: index, usage_instructions: this.data.usageOptions[index] });
  },

  onUsageInput: function(e) {
    this.setData({ usage_instructions: e.detail.value, selectedUsageIndex: -1 });
  },

  submit: function() {
    var that = this;
    if (that.data.submitting) return;
    if (!that.data.selectedSubordinate) { wx.showToast({ title: '请选择代理商', icon: 'none' }); return; }
    if (!that.data.customer_name) { wx.showToast({ title: '请填写顾客姓名', icon: 'none' }); return; }
    if (!that.data.selectedProduct) { wx.showToast({ title: '请选择产品', icon: 'none' }); return; }
    if (!that.data.start_date) { wx.showToast({ title: '请选择使用日期', icon: 'none' }); return; }

    that.setData({ submitting: true });

    api.usage.createForSubordinate({
      subordinate_agent_id: that.data.selectedSubordinate.id,
      customer_name: that.data.customer_name,
      customer_phone: that.data.customer_phone || '',
      customer_id: that.data.selectedCustomer ? that.data.selectedCustomer.customer_id : null,
      product_id: that.data.selectedProduct.id,
      trace_code: that.data.trace_code || '',
      start_date: that.data.start_date,
      usage_instructions: that.data.usage_instructions || ''
    }).then(function(res) {
      if (res.data && res.data.code === 0) {
        wx.showToast({ title: '代填写成功', icon: 'success' });
        setTimeout(function() { wx.navigateBack(); }, 1500);
      } else {
        wx.showToast({ title: res.data.message || '提交失败', icon: 'none' });
      }
    }).catch(function(err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }).finally(function() {
      that.setData({ submitting: false });
    });
  }
});
