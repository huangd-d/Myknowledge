---
title: 渲染流程与渲染循环
description: 一帧是怎么画出来的，setAnimationLoop 为什么比手写 rAF 更好。
order: 1
---

# 渲染流程与渲染循环

> 一句话：`renderer.render(scene, camera)` 是"提交一帧"，渲染循环是"每 16ms 提交一次"。

## 渲染器做了什么

`WebGLRenderer` 不是引擎，它是一层薄封装。一次 `render()` 大致做五件事：

1. **更新世界矩阵**：`scene.updateMatrixWorld()`，把场景图里每层的 local matrix 乘成 world matrix。
2. **视锥剔除**：用相机的 6 个裁剪面包住物体，包外的不提交（`object.frustumCulled`）。
3. **排序**：不透明物体从前到后（减少 overdraw），透明物体从后到前（保证混合正确）。
4. **准备程序**：按「材质类型 + 是否用阴影 + 是否有贴图」拿到或编译 shader program，并上传 uniform。
5. **提交绘制**：几何体的顶点缓冲 + 索引，一次 draw call 画一个物体（实例化除外）。

所以性能优化的方向只有两个：**减少 draw call 数量**，**减少每个 draw call 的开销**（顶点数、贴图数、shader 复杂度）。

## 渲染循环

```js
renderer.setAnimationLoop((time, frame) => {
  const delta = clock.getDelta() // 秒
  mixer.update(delta)
  controls.update()
  renderer.render(scene, camera)
})
```

`setAnimationLoop` 内部就是 `requestAnimationFrame`，但它在 WebXR 下会自动切到 XR 的帧循环，并且 `renderer.dispose()` 前可以用 `setAnimationLoop(null)` 停掉。**统一用它，不要手写 rAF**。

停止与恢复：

```js
renderer.setAnimationLoop(null)          // 停止
document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.setAnimationLoop(null)
  else renderer.setAnimationLoop(tick)
})
```

标签页隐藏时浏览器本来就会暂停 rAF，但如果你在循环里做重计算（比如物理），显式停止更稳。

## 帧率无关的 delta

```js
const clock = new THREE.Clock()

let last = 0
renderer.setAnimationLoop((time) => {
  const delta = Math.min((time - last) / 1000, 0.1) // 秒，封顶防止切回标签页时爆冲
  last = time
  mesh.rotation.y += 1.5 * delta   // 每秒 1.5 弧度
  renderer.render(scene, camera)
})
```

要点：
- 位置/旋转的增量必须乘 delta，否则 144Hz 屏幕上会快 2.4 倍。
- delta 要封顶（0.1s 左右），否则标签页切回来那一帧会跳一大步。
- `Clock.getDelta()` 与手动算 `time` 二选一，不要混用。

## 渲染器初始化清单

```js
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,          // 有开销，但边缘质量提升明显
  alpha: false,             // 需要透明背景才开
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 别跟着 3x/4x 屏走
renderer.setSize(width, height, false)   // false：不写 canvas 的 style
renderer.outputColorSpace = THREE.SRGBColorSpace   // 默认值，显式写出来便于 review
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
```

画布尺寸用父容器算，不要用 `window.innerWidth`（侧栏一出现就错）：

```js
const resize = () => {
  const { clientWidth: width, clientHeight: height } = canvas
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(canvas.parentElement)
```

`ResizeObserver` 比 `window.resize` 准，容器变化也能捕获。记得在组件卸载时 `disconnect()`。

## WebGPU 渲染器

较新版本提供 `three/webgpu`：

```js
import { WebGPURenderer } from 'three/webgpu'
const renderer = new WebGPURenderer({ canvas, antialias: true })
await renderer.init()
```

API 与 WebGL 渲染器基本同构，材质/几何体通用。区别在节点材质系统（TSL）与计算着色器。**学习阶段先用 WebGL 版**，资料和例子都是它。

## 常见坑

- `setSize` 第三个参数传 `true`（默认）：会把 canvas 的 style 宽高也写死，配合 CSS 弹性布局会互相打架。
- 忘记 `camera.updateProjectionMatrix()`：改了 `aspect/fov/near/far` 不生效，画面被拉伸。
- 在循环里 `new` 对象（`new Vector3()`、`new Color()`）：每帧产生垃圾，GC 抖动。复用模块级临时变量。
- 每帧 `scene.traverse()` 改属性：遍历本身不贵，贵的是每条赋值都触发 `matrixWorldNeedsUpdate`。
- 多个 canvas 多个 renderer：每个 renderer 一个 WebGL 上下文，浏览器上限约 8~16 个，超了就丢上下文。

## 自检

- 你能说清一帧里 `render()` 内部发生的五件事吗？
- 为什么透明物体要从后往前排？
- 144Hz 屏幕上动画变快，最可能是哪里漏了 delta？
- `renderer.info.render.calls` 变大时，你打算先看什么？
