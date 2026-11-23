---
title: 性能与内存
description: 先看 draw call 和三角形数，再谈优化；实例化、合并、剔除、像素比是四个高杠杆开关。
order: 13
---

# 性能与内存

> 一句话：先测量再优化；绝大多数"卡"来自 draw call 太多、像素比太高、或者每帧在分配对象。

## 先看三个数字

```js
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera)
  info.calls = renderer.info.render.calls        // 本帧 draw call 数
  info.triangles = renderer.info.render.triangles // 本帧三角形数
  info.textures = renderer.info.memory.textures   // 常驻纹理数
})
```

经验门槛（桌面端，60fps）：

| 指标 | 舒适 | 需要优化 |
| --- | --- | --- |
| draw call | < 200 | > 500 |
| 三角形 | < 100 万 | > 300 万 |
| 纹理内存 | < 200MB | > 500MB |

## 四个高杠杆手段

### 1. 实例化：同样的东西画一千个

```js
const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
const material = new THREE.MeshStandardMaterial({ color: 0x8b93ff })
const mesh = new THREE.InstancedMesh(geometry, material, 1000)

const matrix = new THREE.Matrix4()
const color = new THREE.Color()

for (let i = 0; i < 1000; i += 1) {
  matrix.setPosition(Math.random() * 40 - 20, Math.random() * 4, Math.random() * 40 - 20)
  mesh.setMatrixAt(i, matrix)
  mesh.setColorAt(i, color.setHSL(Math.random(), 0.6, 0.55))
}
mesh.instanceMatrix.needsUpdate = true
mesh.instanceColor.needsUpdate = true
```

1000 个立方体：普通 Mesh 是 1000 次 draw call，实例化是 **1 次**。代价是不能单独对某个实例做层级变换（要改矩阵），且共享几何体与材质。

### 2. 合并静态几何体

```js
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
const merged = mergeGeometries(geometries, false)
```

材质相同、永远不单独动的物体（地板砖、栏杆、树）合并后 draw call 从 N 变 1。需要在构建期做，别每帧合。

### 3. 剔除与分层

视锥剔除是自动的（`frustumCulled` 默认 true），但要注意：

- 把物体的 `boundingSphere` 手动算错（比如顶点改了没 `computeBoundingSphere()`），会导致本该可见的被剔掉。
- 大量小物体可以用 `LOD` 分级，远处换低面数模型。
- 不需要交互的物体放到独立 `Layer`，需要时切相机的 `layers`。

### 4. 像素比与分辨率

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
```

从 3 降到 2 就是 55% 的像素量，肉眼几乎无差别。移动端甚至可以锁 1.5。后处理全屏 pass 也吃像素，分辨率是第一成本项。

## 别在循环里分配对象

```js
// ❌ 每帧 new 三个对象，GC 抖动
renderer.setAnimationLoop(() => {
  mesh.position.copy(new THREE.Vector3(1, 2, 3))
  const dir = new THREE.Vector3().subVectors(a, b)
})

// ✅ 模块级复用
const tmpVec = new THREE.Vector3()
const tmpDir = new THREE.Vector3()
renderer.setAnimationLoop(() => {
  mesh.position.copy(tmpVec.set(1, 2, 3))
  tmpDir.subVectors(a, b)
})
```

分配本身不慢，触发 GC 时会出现规律性的掉帧（尖刺），用 Performance 面板能直接看到。

## 首帧卡顿：shader 编译

每种材质/光照/阴影组合第一次出现时都要编译 shader，表现为"进入场景卡 300ms"。

```js
// 提前编译（在加载完成后、显示前调用）
renderer.compile(scene, camera)
```

或者先把所有材质各渲染一帧到 1×1 的小 render target。彻底解法是缓存 program（`WebGLRenderer` 内部有 programCache，但首帧仍要编）。

## 其它廉价优化

- 静态物体关 `matrixAutoUpdate`，手动 `updateMatrix()`。
- 阴影：`shadowMap.autoUpdate = false`，只在需要时刷。
- 暂停：标签页隐藏时 `setAnimationLoop(null)`。
- 材质共享：同一材质实例给多个网格，减少 program 数量。
- 纹理压缩：KTX2/Basis，移动端显存降 4–8 倍。
- 移动端：`antialias: false`，用 FXAA 或干脆不开。

## 内存泄漏的排查步骤

1. 记录 `renderer.info.memory` 基线。
2. 反复进出场景 5 次。
3. 数字只涨不降 → 有资源没 `dispose()`。
4. Chrome DevTools Memory 面板拍两次堆快照，比较 `Object3D`、`Texture`、`BufferGeometry` 的实例数。
5. 常见漏点：纹理、几何体、材质、`renderer.renderLists`、动画 mixer 的缓存、`ResizeObserver`/事件监听。

## 自检

- 1000 个相同物体，draw call 应该是多少？
- 为什么"每帧 new Vector3"会导致规律性掉帧？
- 首帧卡 300ms 最可能是什么原因？
- `renderer.info.memory` 一直涨，先从哪三类资源查？
