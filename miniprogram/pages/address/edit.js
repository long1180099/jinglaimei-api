Page({
  data: {
    // 模式：add=新增，edit=编辑
    mode: 'add',
    editIndex: -1,
    editingId: '',
    // 表单数据
    formData: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false
    },
    regionText: '',
    // 省市区picker的value（行政区划码数组）
    regionCode: [],
    saving: false
  },

  onLoad(options) {
    this.setData({ mode: options.mode || 'add' });

    if (options.mode === 'edit' && options.id) {
      this.setData({ editingId: options.id, editIndex: parseInt(options.index) || 0 });
      wx.setNavigationBarTitle({ title: '编辑地址' });
      this.loadExistingAddress(options.id);
    }
  },

  // 加载已有地址数据用于编辑
  loadExistingAddress(id) {
    var list = wx.getStorageSync('addressList') || [];
    var addr = list.find(function(a) { return a.id === id; });
    if (addr) {
      this.setData({
        formData: {
          name: addr.name || '',
          phone: addr.phone || '',
          province: addr.province || '',
          city: addr.city || '',
          district: addr.district || '',
          detail: addr.detail || '',
          isDefault: !!addr.isDefault
        },
        regionText: (addr.province || '') + (addr.city || '') + (addr.district || '')
      });
    }
  },

  // 输入事件
  onNameInput(e) {
    this.setDataValue('name', e.detail.value);
  },
  onPhoneInput(e) {
    this.setDataValue('phone', e.detail.value);
  },
  onDetailInput(e) {
    this.setDataValue('detail', e.detail.value);
  },
  onDefaultChange(e) {
    this.setDataValue('isDefault', e.detail.value);
  },

  setDataValue(field, value) {
    var fd = this.data.formData;
    fd[field] = value;
    this.setData({ formData: fd });
  },

  // 省市区选择器 - 选择完成
  onRegionChange(e) {
    var val = e.detail.value;
    var code = e.detail.code;
    var fd = this.data.formData;
    fd.province = val[0];
    fd.city = val[1];
    fd.district = val[2] === '全部' ? '' : val[2];

    this.setData({
      formData: fd,
      regionText: val.join(' '),
      regionCode: code
    });
  },

  // 省市区选择器 - 取消选择
  onRegionCancel() {
    // 用户取消，不做处理
  },

  // 从微信地址簿导入
  importWxAddress() {
    var self = this;
    wx.chooseAddress({
      success: function(res) {
        self.setData({
          'formData.name': res.userName,
          'formData.phone': res.telNumber,
          'formData.province': res.provinceName,
          'formData.city': res.cityName,
          'formData.district': res.countyName,
          'formData.detail': res.detailInfo || self.data.formData.detail,
          regionText: res.provinceName + res.cityName + res.countyName
        });
        wx.showToast({ title: '已导入微信地址', icon: 'success' });
      },
      fail: function(err) {
        if (err.errMsg.indexOf('auth deny') > -1) {
          wx.showModal({
            title: '提示',
            content: '需要授权地址信息才能导入，是否去设置？',
            confirmText: '去设置',
            success: function(r) {
              if (r.confirm) wx.openSetting();
            }
          });
        }
      }
    });
  },

  // 校验表单
  validate() {
    var d = this.data.formData;
    if (!d.name || !d.name.trim()) {
      wx.showToast({ title: '请输入收货人姓名', icon: 'none' }); return false;
    }
    if (!d.phone || !d.phone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' }); return false;
    }
    if (!/^1\d{10}$/.test(d.phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return false;
    }
    if (!d.province || !d.city || !d.district) {
      wx.showToast({ title: '请选择所在地区（可通过微信导入）', icon: 'none' }); return false;
    }
    if (!d.detail || !d.detail.trim()) {
      wx.showToast({ title: '请输入详细地址', icon: 'none' }); return false;
    }
    return true;
  },

  // 保存地址
  saveAddress() {
    if (this.data.saving) return;
    if (!this.validate()) return;

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    var self = this;
    var d = self.data.formData;
    var list = wx.getStorageSync('addressList') || [];

    setTimeout(function() {
      try {
        if (self.data.mode === 'edit') {
          // 编辑模式：更新现有地址
          var idx = list.findIndex(function(a) { return a.id === self.data.editingId; });
          if (idx >= 0) {
            // 如果设为默认，先把其他默认取消
            if (d.isDefault) {
              list.forEach(function(item) { item.isDefault = false; });
            } else {
              // 保持原有的默认状态
              d.isDefault = list[idx].isDefault;
            }

            list[idx] = Object.assign({}, list[idx], {
              name: d.name.trim(),
              phone: d.phone.trim(),
              province: d.province,
              city: d.city,
              district: d.district,
              detail: d.detail.trim(),
              isDefault: d.isDefault,
              updateTime: Date.now()
            });
          }
        } else {
          // 新增模式
          // 如果设为默认，先把其他默认取消
          if (d.isDefault) {
            list.forEach(function(item) { item.isDefault = false; });
          }
          // 如果是第一个地址，自动设为默认
          if (list.length === 0) {
            d.isDefault = true;
          }

          var newAddr = {
            id: 'addr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: d.name.trim(),
            phone: d.phone.trim(),
            province: d.province,
            city: d.city,
            district: d.district,
            detail: d.detail.trim(),
            isDefault: d.isDefault,
            createTime: Date.now()
          };
          list.push(newAddr);
        }

        wx.setStorageSync('addressList', list);

        // 同步 defaultAddress storage
        var defaultAddr = list.find(function(a) { return a.isDefault; }) || list[0];
        if (defaultAddr) {
          wx.setStorageSync('defaultAddress', defaultAddr);
        }

        wx.hideLoading();
        wx.showToast({ title: self.data.mode === 'edit' ? '修改成功' : '添加成功', icon: 'success' });

        setTimeout(function() {
          wx.navigateBack();
        }, 800);
      } catch(e) {
        wx.hideLoading();
        self.setData({ saving: false });
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      }
    }, 300); // 短暂延迟让用户看到loading
  }
});
