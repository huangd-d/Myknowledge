---
title: 坐标系、单位与旋转
description: 右手系、Y 轴向上、相机看 -Z，以及弧度、欧拉角、NDC 这些容易记反的事。
order: 3
---

# 坐标系、单位与旋转

> 一句话：Three.js 是 Y 轴向上的右手坐标系，相机看向 -Z，所有角度都是弧度。

## 三条硬约定

| 约定 | 内容 | 后果 |
| --- | --- | --- |
| 右手系 | 拇指 X、食指 Y、中指 Z | 叉乘方向、正旋转方向都由它决定 |
| Y 轴向上 | 地面是 XZ 平面，高度是 Y | 从 Blender（Z 向上）导入会"躺倒" |
| 相机看 -Z | 相机默认朝 -Z，`lookAt` 对相机也是 -Z | 判断"前方"时别用 +Z |

```js
scene.add(new THREE.AxesHelper(2))   // 红=X 绿=Y 蓝=Z
const grid = new THREE.GridHelper(10, 10) // 默认就在 XZ 平面
```

## 单位：约定 1 单位 = 1 米

Three.js 不检查单位，但单位不统一会立刻出问题：

- 光照强度、阴影范围、相机 `near/far` 都按场景尺度调。
- 物理引擎（cannon/rapier）默认按米和千克算，场景用厘米会飞。
- glTF 规范规定 1 单位 = 1 米，所以按米建场景导入模型最顺。

**团队约定写进 README**，比每次调试"这个模型为什么这么大"便宜。

## 弧度，不是角度

```js
mesh.rotation.y = Math.PI / 2      // 90°
mesh.rotation.y = 90               // 错：这是 90 弧度，转了 14 圈
const deg = THREE.MathUtils.radToDeg(Math.PI) // 180
const rad = THREE.MathUtils.degToRad(45)      // 0.785
```

UI 控件给的是角度，进场景前统一转弧度。

## 欧拉角 vs 四元数

```js
// 欧拉角：可读，但有顺序问题
mesh.rotation.set(0, Math.PI / 4, 0)

// 四元数：无歧义，适合插值和叠加旋转
const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)
mesh.quaternion.copy(q)
```

欧拉角默认顺序 `XYZ`，意味着"先绕 X，再绕 Y，最后绕 Z"（作用在局部轴上）。同一组角度换个顺序就是另一个朝向。需要稳定朝向时：让物体 `lookAt(target)`，或直接操作四元数。

## 四个坐标系

| 空间 | 范围 | 什么时候用 |
| --- | --- | --- |
| 局部（local） | 物体自己的坐标 | 建模、`position` |
| 世界（world） | 整个场景 | 计算距离、碰撞前先转到这里 |
| 视图（view） | 相机为原点 | 调试、手写 shader |
| NDC / 屏幕 | [-1,1] 或像素 | 鼠标拾取、投影到屏幕 |

```js
const v = new THREE.Vector3(1, 0, 0)
mesh.worldToLocal(v)              // 世界 → 局部
v.applyMatrix4(camera.matrixWorldInverse)  // 世界 → 视图
v.project(camera)                 // 世界 → NDC
```

## 常见坑

- **Blender 导出躺倒**：Blender 是 Z 向上，导出 glTF 时勾选 `+Y up`（默认已勾）。obj/fbx 可能没有，导入后给模型套一个 `rotation.x = -Math.PI / 2` 的 Group。
- **负缩放**：`scale` 为负会翻转法线，单面材质看不见，光照也反。
- **NDC 的 Y 轴方向**：NDC 里 +Y 向上，而屏幕坐标 +Y 向下。做拾取时 `y` 要 `-(y / height) * 2 + 1`，符号写错就点不中。
- **相机朝向混淆**：`camera.lookAt` 让 -Z 指向目标；`mesh.lookAt` 让 +Z 指向目标。
- **`Object3D.up`**：`lookAt` 依赖 `up`（默认 `(0,1,0)`），做"贴地飞行"时要换 `up`。

## 自检

- 为什么"绕 Y 转 90°"在右手系里是逆时针（从上往下看）？
- 相机前方是 +Z 还是 -Z？
- 把屏幕坐标 `(x, y)` 转成 NDC 的两行公式怎么写？
- 什么情况下必须用四元数而不能用欧拉角？
