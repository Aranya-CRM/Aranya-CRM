# Aranya CRM — UI Color System Prompt

> 此文档为 Aranya CRM 完整配色规范，供开发实现参考。所有颜色分层独立，不得混用。

---

## 一、品牌主色 / Brand Primary

系统导航栏、主要新建按钮、品牌识别元素统一使用 Teal（青绿）色系。

| 用途 | 色值 | 说明 |
|---|---|---|
| 导航栏背景 | `#0F6E56` | Teal 600，沉稳不刺眼 |
| 新建/主操作按钮（实心） | `#1D9E75` | Teal 400，正向主操作 |
| 侧边栏选中背景 | `#E1F5EE` | Teal 50，极浅底色 |
| 侧边栏选中文字 | `#0F6E56` | Teal 600 |

---

## 二、操作按钮色系 / Action Button Colors

**原则：同类操作全局统一，高频操作视觉优先级最高。**

### 2.1 编辑按钮（高频操作 — 最显眼）

所有页面的"编辑"相关按钮，统一使用实心蓝，是所有操作按钮中视觉权重最高的。

```
背景色：#378ADD（Blue 400，实心）
文字色：#FFFFFF
图标：ti-edit
适用：Edit Profile、编辑个案、编辑用户
```

### 2.2 删除按钮（破坏性操作）

全局统一浅红底色，有警示感，但不使用实心红（避免过于抢眼）。

```
背景色：#FCEBEB（Red 50）
文字色：#791F1F（Red 800）
边框：0.5px solid #F7C1C1（Red 100）
图标：ti-trash
适用：Delete、移除用户
```

### 2.3 归档 / 标记 / 停用按钮（可逆的谨慎操作）

全局统一琥珀底色，表示"需要注意，但不是删除"。

```
背景色：#FAEEDA（Amber 50）
文字色：#633806（Amber 800）
边框：0.5px solid #FAC775（Amber 100）
图标：ti-archive / ti-flag / ti-lock
适用：归档报告、标记个案（Flag Case）、停用用户（Deactivate）
```

### 2.4 次要操作按钮（无破坏性、低频）

```
背景色：#F1EFE8（Gray 50）
文字色：#5F5E5A（Gray 600）
边框：0.5px solid #D3D1C7（Gray 100）
图标：ti-download 等
适用：导出、取消
```

### 2.5 链接 / 关联操作

```
背景色：#E6F1FB（Blue 50）
文字色：#0C447C（Blue 800）
边框：0.5px solid #B5D4F4（Blue 100）
图标：ti-link
适用：Link Contacts、分配义工（Assign Volunteer）
```

### 2.6 审批按钮（正向决策主操作）

```
背景色：#1D9E75（Teal 400，实心）
文字色：#FFFFFF
图标：ti-circle-check
适用：Approve（审批报告）
```

### 2.7 特权视图按钮（Audit View）

Audit View 是管理员专属入口，独占紫色，不与其他操作按钮撞色。

```
背景色：#EEEDFE（Purple 50）
文字色：#3C3489（Purple 800）
边框：0.5px solid #CECBF6（Purple 100）
适用：审计视图 · Audit View
```

### 2.8 关闭个案按钮

```
背景色：#FCEBEB（Red 50）
文字色：#791F1F（Red 800）
边框：0.5px solid #F7C1C1（Red 100）
图标：ti-x
适用：关闭个案 · Close Case
```

### 2.9 更新状态按钮

```
背景色：#F1EFE8（Gray 50）
文字色：#5F5E5A（Gray 600）
边框：0.5px solid #D3D1C7
图标：ti-refresh
适用：更新状态 · Update Status
```

---

## 三、状态 Badge 色系 / Status Badges

**原则：同一状态全局唯一颜色，不得出现同状态使用不同颜色的情况。**

| 状态 | 背景色 | 文字色 | 图标 |
|---|---|---|---|
| Open / 进行中 | `#EAF3DE` (Green 50) | `#27500A` (Green 800) | ti-circle-check |
| Suspended / 暂停 | `#FAEEDA` (Amber 50) | `#633806` (Amber 800) | ti-pause |
| Closed / 结案 | `#F1EFE8` (Gray 50) | `#5F5E5A` (Gray 600) | ti-x |
| Urgent / 紧急 | `#FCEBEB` (Red 50) | `#791F1F` (Red 800) | ti-alert-triangle |
| Submitted / 已提交 | `#E6F1FB` (Blue 50) | `#0C447C` (Blue 800) | ti-send |
| Home Visit / 家访 | `#E1F5EE` (Teal 50) | `#085041` (Teal 800) | ti-home |
| Active / 活跃用户 | `#EAF3DE` (Green 50) | `#27500A` (Green 800) | ti-circle |

所有 badge 使用 `border-radius: 20px`（胶囊形），`padding: 2px 9px`，`font-size: 11px`，`font-weight: 500`。

---

## 四、角色 Badge 色系 / Role Badges

**原则：角色色系必须与状态色系区分，统一使用紫色系，避免与状态 badge 撞色。**

| 角色 | 背景色 | 文字色 | 图标 |
|---|---|---|---|
| Manager / 管理员 | `#EEEDFE` (Purple 50) | `#3C3489` (Purple 800) | ti-crown |
| Volunteer / 义工 | `#FAEEDA` (Amber 50) | `#633806` (Amber 800) | ti-heart |
| Social Worker / 社工 | `#E6F1FB` (Blue 50) | `#0C447C` (Blue 800) | ti-briefcase |

---

## 五、个案强度指示器 / Case Intensity Indicator

**⚠️ 重要：强度色系与 Case 底色完全独立，不得混用。**

强度指示器仅出现在个案列表和个案详情页，用于表示紧急程度，**不进入日历视图**。

显示形式：小方块（`14×14px`，`border-radius: 2px`），放置在列表"强度"列。

| 级别 | 色值 | 说明 |
|---|---|---|
| Red / 红 | `#E53935` | 迫切 — 迫切护理需求 |
| Orange / 橙 | `#FB8C00` | 高危 — 需要优先关注 |
| Yellow / 黄 | `#FDD835` | 中度 — 定期跟进 |
| Green / 绿 | `#43A047` | 稳定 — 情况良好 |
| Grey / 灰 | `#9E9E9E` | 待评 — 尚未评级 |
| Black / 黑 | `#212121` | 结案 — 个案已关闭 |

---

## 六、Case 底色与日历 Event 色系 / Case Base Color & Calendar Events

**这是独立于强度色的第二个维度，表示"归属于 Aranya CRM"的身份识别色。**

### 6.1 设计原则

- 所有 Aranya CRM 的 Case event 在日历中**统一使用紫色系**
- 用户看到紫色 event = 立刻知道"这是我的 case 预约"
- 与 shared Google Calendar 的其他颜色有明显色相差异

### 6.2 Case 相关颜色

| 用途 | 色值 | 说明 |
|---|---|---|
| 日历 event 背景 | `#EDE7F6` | Purple 系，浅紫底 |
| 日历 event 文字 | `#4527A0` | 深紫，对比度足够 |
| Case 列表行底色 | `#FAF8FF` | 极浅紫，与日历形成视觉桥梁 |
| 今日日期圆圈 | `#7B5EA7` | 中紫，醒目但不抢 |

### 6.3 Shared Calendar Event 区分方案

来自其他 shared Google Calendar 的 event 使用不同色相，让用户一眼区分。

| 来源 | 背景色 | 文字色 | 边框 |
|---|---|---|---|
| Infotech 内部日历 | `#E8F5E9` | `#2E7D32` | `0.5px solid #A5D6A7` |
| 其他订阅日历 | `#E3F2FD` | `#1565C0` | `0.5px solid #90CAF9` |

### 6.4 Google Calendar API colorId 映射（供后端参考）

创建 Case event 时统一写入紫色 colorId：

```
Google Calendar colorId: 3 (Grape)
对应色值：紫色系，与 #EDE7F6 接近
```

### 6.5 Event 标题格式规范

```
[服务类型] · [成员缩写]
例：Home Visit · VXA
    Clinic · VKB
    Follow-up · TY8
```

---

## 七、列表行内图标按钮 / Inline Icon Buttons

用于表格操作列，尺寸 `26×26px`，`border-radius: 5px`。

| 操作 | 背景色 | 图标色 | 图标 |
|---|---|---|---|
| 查看 | `#E1F5EE` | `#0F6E56` | ti-eye |
| 编辑 | `#E6F1FB` | `#185FA5` | ti-edit |
| 归档 | `#FAEEDA` | `#854F0B` | ti-archive |
| 删除 | `#FCEBEB` | `#A32D2D` | ti-trash |

---

## 八、统计卡片数字色 / Stat Card Number Colors

Dashboard 统计数字使用品牌色系点缀，不使用纯黑。

| 指标类型 | 数字颜色 |
|---|---|
| 在籍人数 / 主要指标 | `#0F6E56`（Teal 600） |
| 金额 / 资源类 | `#185FA5`（Blue 600） |
| 新增 / 正向增长 | `#3B6D11`（Green 600） |

---

## 九、全局设计原则 / Global Rules

1. **同类操作必须全局统一颜色**，不允许同一操作在不同页面使用不同颜色
2. **强度色（层级2）与 Case 底色（层级1）完全独立**，不在同一视图中竞争
3. **高频操作（编辑）视觉优先级最高**，使用实心色块；低频危险操作（删除）使用浅色底
4. **角色 badge 与状态 badge 使用不同色系**，避免用户混淆两个维度的信息
5. **紫色系专属于 Case 归属识别**，不用于其他语义
6. **Audit View 按钮专属浅紫**，不与普通操作按钮共用颜色
7. 所有 badge 使用胶囊形（`border-radius: 20px`）；普通按钮使用 `border-radius: 6px`；卡片使用 `border-radius: 8–12px`
8. 表格边框统一 `0.5px solid`，不使用 `1px` 粗边框

---

*版本：v1.0 · 基于 Aranya CRM Pages 截图分析整理*
