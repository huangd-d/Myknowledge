---
title: 相机
description: 透视与正交只差一个投影矩阵，fov / near / far 决定了你看到什么、以及深度精度。
order: 4
---

# 相机

> 一句话：相机是两个矩阵——`matrixWorldInverse`（视图）和 `projectionMatrix`（投影），换相机就是换投影。

## 两种相机

```js
// 透视：近大远小，等价于人眼/镜头
const camera = new THREE.PerspectiveCamera(
  50,                 // fov：垂直视角（度）
  width / height,     // aspect
  0.1,                // near
  100,                // far
)

// 正交：大小不随距离变，适合 2D、UI、等距视角、工程图
const ortho = new THREE.OrthographicCamera(
  -width / 2, width / 2,   // left, right（世界单位）
  height / 2, -height / 2, // top, bottom
  0.1, 1000,
)
```

| 参数 | 影响 | 建议 |
| --- | --- | --- |
| `fov` | 视野宽窄，越小越"长焦" | 45–60 接近自然；产品展示常用 35–45 |
| `aspect` | 画面拉伸 | 容器变化时必须更新 |
| `near` | 最近可见距离 | 别设 0.0001，深度精度会崩 |
| `far` | 最远可见距离 | 按场景规模给，别动辄 10000 |

## 投影与视锥

`near/far` 之间是一个**视锥（frustum）**，六面体外的物体不会提交给 GPU（视锥剔除）。它们还共同决定深度缓冲的精度：

- `near` 太小、`near/far` 比值过大 → **z-fighting**（两个面交替闪烁）。
- 典型坏味道：`near = 0.001, far = 100000`。改成 `0.1 / 500` 立刻好。

正交相机的 `near` 可以是负数，这样相机后方的物体也能看见（`-1000, 1000`）。

## 摆放相机

```js
camera.position.set(3, 4, 5)
camera.lookAt(0, 0, 0)                    // 让 -Z 指向原点
camera.updateProjectionMatrix()           // 改过 fov/aspect/near/far 之后必须调用
```

相机要作为场景的一部分才能承载子物体（比如第一人称视角手里的武器）：

```js
scene.add(camera)
camera.add(weaponMesh)
weaponMesh.position.set(0.4, -0.3, -0.8)   // 相机前方是 -Z
```

## 轨道控制器

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0, 0)
controls.enableDamping = true     // 惯性
controls.dampingFactor = 0.05
controls.minDistance = 2
controls.maxDistance = 20
controls.maxPolarAngle = Math.PI / 2   // 不许转到地面以下

// 每帧调用（开了 damping 就必须每次 update）
controls.update()
```

`OrbitControls` 会改相机的 `position/quaternion`，别同时自己再 `lookAt`，会打架。限制类的 `min/maxPolarAngle` 比事后判断更省事。

## 相机跟随的两种写法

```js
// 1) 硬跟随：位置直接拷贝，每帧一次
camera.position.copy(target.position).add(offset)
camera.lookAt(target.position)

// 2) 阻尼跟随：指数插值，与帧率无关
const desired = new THREE.Vector3()
const alpha = 1 - Math.exp(-6 * delta)
desired.copy(target.position).add(offset)
camera.position.lerp(desired, alpha)
```

写法 2 不要写成 `lerp(desired, 0.1)`——那是"每帧 10%"，帧率越高跟得越紧。

## 常见坑

- **改了 `aspect` 没 `updateProjectionMatrix()`**：画面拉伸。
- **相机在物体内部**：大模型（比如房间）导入后相机默认在原点，被包在里面，看起来"什么都没渲染"。
- **`lookAt` 之后又改 `position`**：顺序反了，朝向按旧位置算的。
- **多相机切换**：只需换 `render()` 第二个参数，但别忘同步 `aspect`。
- **正交相机配 OrbitControls**：滚轮会改 `zoom`，需要 `camera.updateProjectionMatrix()`，OrbitControls 内部已处理。

## 自检

- `near` 和 `far` 为什么会影响画面闪烁？
- 透视和正交投影矩阵的本质差别是什么？
- 相机里挂一把枪，为什么枪要在 -Z 方向？
- `enableDamping` 打开后忘了 `controls.update()` 会怎样？
