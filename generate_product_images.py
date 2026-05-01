#!/usr/bin/env python3
"""
为服务器实际存在的10个商品(ID 22-31)生成专业产品展示图
"""

from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = '/Users/apple/WorkBuddy/20260324191412/generated-products'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 服务器实际存在的10个商品数据
PRODUCTS = {
    22: {'name': '玫小可-童颜嫩肤精华液', 'cat': '面部护理', 'price': '¥298', 'tag': '热销',
          'desc': '童颜秘方 深层滋养\n焕活肌肤 年轻光彩',
          'color': '#EC407A', 'bg_top': '#FCE4EC', 'bg_bot': '#F8BBD0'},
    23: {'name': '玫小可-御龄养肤油', 'cat': '面部护理', 'price': '¥368', 'tag': '推荐',
          'desc': '黄金御龄油\n抗老修复 奢润养护',
          'color': '#FFB74D', 'bg_top': '#FFF3E0', 'bg_bot': '#FFE0B2'},
    24: {'name': '玫小可-焕亮修护精华液', 'cat': '面部护理', 'price': '¥328', 'tag': '',
          'desc': '焕亮修护 提亮肤色\n改善暗沉 细腻光滑',
          'color': '#AB47BC', 'bg_top': '#F3E5F5', 'bg_bot': '#E1BEE7'},
    25: {'name': '玫小可-玻尿酸补水面膜', 'cat': '面部护理', 'price': '¥128', 'tag': '',
          'desc': '5片装 深层补水\n玻尿酸精华 急救保湿',
          'color': '#26C6DA', 'bg_top': '#E0F7FA', 'bg_bot': '#B2EBF2'},
    26: {'name': '静莱美-抗皱眼霜', 'cat': '眼部护理', 'price': '¥258', 'tag': '爆款',
          'desc': '淡化细纹 紧致眼周\n视黄醇配方 抚平岁月',
          'color': '#F06292', 'bg_top': '#FCE4EC', 'bg_bot': '#F8BBD0'},
    27: {'name': '静莱美-氨基酸洁面乳', 'cat': '面部护理', 'price': '¥88', 'tag': '',
          'desc': '温和洁净 不紧绷\n氨基酸配方 敏感肌适用',
          'color': '#42A5F5', 'bg_top': '#E3F2FD', 'bg_bot': '#BBDEFB'},
    28: {'name': '玫小可-玫瑰精油喷雾', 'cat': '身体护理', 'price': '¥168', 'tag': '',
          'desc': '玫瑰精油 舒缓喷雾\n随时随地 补水保湿',
          'color': '#66BB6A', 'bg_top': '#E8F5E9', 'bg_bot': '#C8E6C9'},
    29: {'name': '静莱美-防晒隔离乳', 'cat': '面部护理', 'price': '¥158', 'tag': '热销',
          'desc': 'SPF50+ PA++++\n轻薄透气 防晒隔离一体',
          'color': '#FF7043', 'bg_top': '#FBE9E7', 'bg_bot': '#FFCCBC'},
    30: {'name': '玫小可-胶原蛋白面霜', 'cat': '面部护理', 'price': '¥218', 'tag': '',
          'desc': '胶原蛋白 弹润饱满\n紧致淡纹 唤醒年轻',
          'color': '#e94560', 'bg_top': '#FFEBEE', 'bg_bot': '#FFCDD2'},
    31: {'name': '静莱美-卸妆水300ml', 'cat': '面部护理', 'price': '¥68', 'tag': '',
          'desc': '温和卸妆 无残留\n300ml大容量 清透净颜',
          'color': '#78909C', 'bg_top': '#ECEFF1', 'bg_bot': '#CFD8DC'},
}

CAT_ICONS = {
    '面部护理': '💧',
    '眼部护理': '✨',
    '口红系列': '💄',
    '粉底系列': '🪞',
    '香水': '🌹',
    '身体护理': '🧴',
}

W, H = 800, 800

def make_gradient(draw, w, h, c1, c2):
    """绘制垂直渐变背景"""
    for y in range(h):
        r = int(c1[0] + (c2[0] - c1[0]) * y / h)
        g = int(c1[1] + (c2[1] - c1[1]) * y / h)
        b = int(c1[2] + (c2[2] - c1[2]) * y / h)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def draw_rounded_rect(draw, coords, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(coords, radius=radius, fill=fill, outline=outline, width=width)

try:
    font_paths = [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
    ]
    font_large = font_mid = font_small = None
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font_large = ImageFont.truetype(fp, 48)
                font_mid = ImageFont.truetype(fp, 30)
                font_small = ImageFont.truetype(fp, 22)
                break
            except:
                continue
    if not font_large:
        font_large = font_mid = font_small = ImageFont.load_default()

    print('Generating %d product images...' % len(PRODUCTS))

    for pid, prod in PRODUCTS.items():
        img = Image.new('RGB', (W, H), '#FFFFFF')
        draw = ImageDraw.Draw(img)

        bg_top = hex_to_rgb(prod['bg_top'])
        bg_bot = hex_to_rgb(prod['bg_bot'])
        make_gradient(draw, W, H, bg_top, bg_bot)

        # 底部品牌色条
        accent_color = hex_to_rgb('#e94560')
        draw.rectangle([0, H-110, W, H], fill=accent_color)
        trans_color = tuple(min(255, c + 40) for c in accent_color)
        draw.rectangle([0, H-120, W, H-110], fill=trans_color)

        # 中央白色卡片
        card_x, card_y = 45, 130
        card_w, card_h = W - 90, 430
        draw_rounded_rect(draw, [card_x, card_y, card_x+card_w, card_y+card_h],
                          radius=28, fill='#FFFFFF')

        # 卡片顶部色带
        band_color = hex_to_rgb(prod['color'])
        draw_rounded_rect(draw, [card_x, card_y, card_x+card_w, card_y+8],
                          radius=28, fill=band_color)

        # 分类标签
        icon = CAT_ICONS.get(prod['cat'], '📦')
        cat_text = icon + '  ' + prod['cat']
        bbox = draw.textbbox((0, 0), cat_text, font=font_mid)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((W - tw) // 2, card_y + 32), cat_text, font=font_mid,
                  fill='#666666')

        # 产品名称
        name = prod['name']
        name_bbox = draw.textbbox((0, 0), name, font=font_large)
        name_w = name_bbox[2] - name_bbox[0]
        if name_w > card_w - 70:
            mid = len(name) // 2
            for i in range(mid, 0, -1):
                if name[i] in ('-', '·', '('):
                    line1 = name[:i+1]
                    line2 = name[i+1:]
                    break
            else:
                line1 = name[:mid]
                line2 = name[mid:]
            b1 = draw.textbbox((0,0), line1, font=font_large)
            b2 = draw.textbbox((0,0), line2, font=font_large)
            draw.text(((W - (b1[2]-b1[0]))//2, card_y + 95), line1, font=font_large,
                      fill='#1a1a2e')
            draw.text(((W - (b2[2]-b2[0]))//2, card_y + 160), line2, font=font_large,
                      fill='#1a1a2e')
        else:
            draw.text(((W - name_w) // 2, card_y + 105), name, font=font_large,
                      fill='#1a1a2e')

        # 分隔线
        line_y = card_y + 250
        draw.line([card_x + 55, line_y, card_x + card_w - 55, line_y],
                  fill='#EEEEEE', width=2)

        # 产品描述
        desc_lines = prod['desc'].split('\n')
        desc_start_y = line_y + 22
        for i, line in enumerate(desc_lines):
            db = draw.textbbox((0,0), line, font=font_mid)
            dw = db[2] - db[0]
            draw.text(((W - dw)//2, desc_start_y + i*42), line, font=font_mid,
                      fill='#555555')

        # 价格标签
        price_text = "零售价 " + prod['price']
        pb = draw.textbbox((0,0), price_text, font=font_large)
        pw = pb[2] - pb[0]
        price_bg_x = (W - pw - 50) // 2
        price_bg_y = card_y + card_h - 82
        draw_rounded_rect(draw, [price_bg_x, price_bg_y, price_bg_x + pw + 35, price_bg_y + 62],
                          radius=14, fill='#FFF8E1')
        draw.text((price_bg_x + 18, price_bg_y + 10), price_text, font=font_large,
                  fill='#e94560')

        # 标签(热销/推荐/爆款)
        tag = prod.get('tag', '')
        if tag:
            tb = draw.textbbox((0,0), tag, font=font_small)
            tw_tag, th_tag = tb[2]-tb[0], tb[3]-tb[1]
            tag_x = card_x + card_w - tw_tag - 25
            tag_y = card_y + 18
            if tag in ('热销', '爆款'):
                tc, tbg = '#e94560', '#FFEBEE'
            elif tag == '推荐':
                tc, tbg = '#FF8F00', '#FFF3E0'
            else:
                tc, tbg = '#1976D2', '#E3F2FD'
            draw_rounded_rect(draw, [tag_x-8, tag_y-4, tag_x+tw_tag+18, tag_y+th_tag+8],
                              radius=10, fill=tbg)
            draw.text((tag_x, tag_y), tag, font=font_small, fill=tc)

        # 底部品牌名
        brand_text = "JINGLAI MEI x MEIXIAOKE"
        bb = draw.textbbox((0,0), brand_text, font=font_mid)
        bw = bb[2] - bb[0]
        draw.text(((W-bw)//2, H-75), brand_text, font=font_mid, fill=(255,255,255))

        # 右上角Logo圆圈
        logo_cx, logo_cy = W - 85, 85
        logo_r = 46
        draw.ellipse([logo_cx-logo_r, logo_cy-logo_r, logo_cx+logo_r, logo_cy+logo_r],
                     fill='#e94560')
        jl_font = ImageFont.truetype(font_paths[0], 26) if os.path.exists(font_paths[0]) else font_mid
        jlb = draw.textbbox((0,0), 'JM', font=jl_font)
        jlw = jlb[2] - jlb[0]
        draw.text((logo_cx - jlw//2, logo_cy - 16), 'JM', font=jl_font, fill=(255,255,255))

        # 保存
        filename = 'product_%02d.png' % pid
        filepath = os.path.join(OUTPUT_DIR, filename)
        img.save(filepath, 'PNG', quality=95)
        size_kb = os.path.getsize(filepath)
        print('  OK %s - %s (%dKB)' % (filename, prod['name'], size_kb // 1024))

    print('\nDone! %d images saved to %s/' % (len(PRODUCTS), OUTPUT_DIR))
except Exception as e:
    print('Error: %s' % e)
    import traceback
    traceback.print_exc()
