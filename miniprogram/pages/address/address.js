Page({
  data: {
    // 地址列表
    addressList: [],
    // 模式：manage=管理（从我的进入），select=选择（从购物车/确认页进入）
    mode: 'manage',
    // 选择模式下的选中项
    selectedIndex: -1,
    selectedId: ''
  },

  onLoad(options) {
    // 从URL参数读取模式，默认是管理模式
    const mode = options.mode || 'manage';
    this.setData({ mode });
    
    // 根据模式设置导航栏标题
    wx.setNavigationBarTitle({
      title: mode === 'select' ? '选择收货地址' : '地址管理'
    });

    this.loadAddressList();
  },

  onShow() {
    // 每次显示时刷新列表（新增/编辑后回退会触发）
    this.loadAddressList();
  },

  // 加载地址列表
  loadAddressList() {
    const list = wx.getStorageSync('addressList') || [];
    
    // 确保至少有一个默认地址
    if (list.length > 0 && !list.some(a => a.isDefault)) {
      list[0].isDefault = true;
      wx.setStorageSync('addressList', list);
    }

    this.setData({ addressList: list });

    // 选择模式下自动选中默认地址
    if (this.data.mode === 'select' && this.data.selectedIndex === -1) {
      const defaultIdx = list.findIndex(a => a.isDefault);
      if (defaultIdx >= 0) {
        this.setData({
          selectedIndex: defaultIdx,
          selectedId: list[defaultIdx].id
        });
      }
    }
  },

  // 新增地址
  addAddress() {
    wx.navigateTo({
      url: '/pages/address/edit?mode=add'
    });
  },

  // 编辑地址
  editAddress(e) {
    const index = e.currentTarget.dataset.index;
    const addr = this.data.addressList[index];
    wx.navigateTo({
      url: '/pages/address/edit?mode=edit&id=' + addr.id + '&index=' + index
    });
  },

  // 删除地址
  deleteAddress(e) {
    const index = e.currentTarget.dataset.index;
    const addr = this.data.addressList[index];

    wx.showModal({
      title: '确认删除',
      content: '确定要删除 "' + addr.name + '" 的地址吗？',
      confirmColor: '#e94560',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.addressList;
          const isDeletingDefault = addr.isDefault;

          // 删除
          list.splice(index, 1);

          // 如果删的是默认地址且还有其他地址，把第一个设为默认
          if (isDeletingDefault && list.length > 0) {
            list[0].isDefault = true;
          }

          wx.setStorageSync('addressList', list);
          this.loadAddressList();

          wx.showToast({ title: '已删除', icon: 'success' });

          // 同步更新 defaultAddress storage
          this.syncDefaultStorage(list);
        }
      }
    });
  },

  // 设为默认
  setDefault(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.addressList;

    // 先全部取消默认
    list.forEach(function(item) { item.isDefault = false; });
    // 再设置新的默认
    list[index].isDefault = true;

    wx.setStorageSync('addressList', list);
    this.setData({ addressList: list });

    wx.showToast({ title: '已设为默认', icon: 'success' });

    // 同步更新 defaultAddress
    this.syncDefaultStorage(list);
  },

  // 选择模式下选中某个地址
  selectAddress(e) {
    const index = e.currentTarget.dataset.index;
    const addr = this.data.addressList[index];
    this.setData({
      selectedIndex: index,
      selectedId: addr.id
    });
  },

  // 确认选择并返回
  confirmSelect() {
    if (!this.data.selectedId) {
      wx.showToast({ title: '请先选择地址', icon: 'none' });
      return;
    }
    const addr = this.data.addressList[this.data.selectedIndex];

    // 通过全局事件或storage传递选中的地址
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2];

    // 设置到storage供目标页面读取
    wx.setStorageSync('defaultAddress', addr);

    wx.showToast({ title: '地址已选择', icon: 'success' });
    setTimeout(function() {
      wx.navigateBack();
    }, 500);
  },

  // 同步 defaultAddress 到 storage（给购物车/确认页用）
  syncDefaultStorage(list) {
    const defaultAddr = list.find(function(a) { return a.isDefault; });
    if (defaultAddr) {
      wx.setStorageSync('defaultAddress', defaultAddr);
    } else if (list.length > 0) {
      wx.setStorageSync('defaultAddress', list[0]);
    } else {
      wx.removeStorageSync('defaultAddress');
    }
  }
});
