---
title: 几何体
description: BufferGeometry 就是一张顶点属性表，内置几何体只是它的预设，分段数决定精度也决定开销。
order: 5
---

# 几何体

> 一句话：几何体只描述形状，不描述外观；`BufferGeometry` = 顶点属性数组 + 索引数组。

## 顶点属性

```js
const geometry = new THREE.BufferGeometry()

// 三个顶点，组成一个三角形
geometry.setAttribute('position', new THREE.Float32BufferAttribute([
   0, 1, 0,   // 顶点 0
  -1, 0, 0,   // 顶点 1
   1, 0, 0,   // 顶点 2
], 3))

geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
  0.5, 1, 0, 0, 1, 0,
], 2))

geometry.setIndex([0, 1, 2])          // 用索引复用顶点
geometry.computeVertexNormals()        // 没给 normal 时自动算
```

| 属性 | 分量 | 用途 |
| --- | --- | --- |
| `position` | 3 | 顶点坐标，必需 |
| `normal` | 3 | 光照计算，PBR 必需 |
| `uv` | 2 | 纹理坐标 |
| `color` | 3 或 4 | 顶点色（材质开 `vertexColors`） |
| `tangent` | 4 | 法线贴图需要 |

数组是扁平的 `[x,y,z, x,y,z, ...]`，第二个参数是每顶点分量数。改完要 `attribute.needsUpdate = true` 才会重新上传 GPU。

## 内置几何体

```js
new THREE.BoxGeometry(1, 1, 1, 2, 2, 2)          // 宽高深 + 各方向分段
new THREE.SphereGeometry(1, 32, 16)              // 半径, 经度段, 纬度段
new THREE.PlaneGeometry(10, 10, 10, 10)          // 默认在 XY 平面，朝向 +Z
new THREE.CircleGeometry(1, 32)
new THREE.CylinderGeometry(1, 1, 2, 32)          // 上半径, 下半径, 高
new THREE.ConeGeometry(1, 2, 32)
new THREE.TorusGeometry(1, 0.4, 16, 64)
new THREE.TorusKnotGeometry(1, 0.35, 128, 32)
new THREE.IcosahedronGeometry(1, 1)              // 细分 1 次，做低多边形星球很顺手
```

**分段数是精度的唯一旋钮**：球体 `32×16` 已经够看，`128×128` 是 3 万多个三角形；一个场景里几个球就能把低端机拖到 20fps。默认值通常偏保守，按需加，不要全局调大。

## 常用操作

```js
geometry.computeBoundingBox()      // 包围盒，判断尺寸/居中用
geometry.center()                  // 把几何体自身原点挪到包围盒中心
geometry.rotateX(-Math.PI / 2)     // 把 XY 平面转成 XZ 地面
geometry.translate(0, 1, 0)
geometry.scale(2, 2, 2)
geometry.toNonIndexed()            // 展开成独立三角形，flatShading / 逐面上色时用
```

水平地面：

```js
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x2a2f3a }),
)
```

`PlaneGeometry` 默认立在 XY 平面，**不转就是一面竖墙**，这是新手最常见的"地面看不见"。

## 合并几何体

同一材质的静态物体可以合成一个几何体，draw call 从 N 降到 1：

```js
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const merged = mergeGeometries([g1, g2, g3], false)
const mesh = new THREE.Mesh(merged, sharedMaterial)
```

前提是**材质相同、属性布局相同**（都有 uv 或都没有）。合并后不能单独移动其中一块——需要单独动就用 `InstancedMesh`（见性能篇）。

## 复用与释放

```js
const sphere = new THREE.SphereGeometry(1, 32, 16)
const a = new THREE.Mesh(sphere, matA)
const b = new THREE.Mesh(sphere, matB)   // 共用几何体，省一份 GPU 内存

// 不再使用时
sphere.dispose()
```

几何体、材质、纹理都是**引用计数之外**的 GPU 资源，Three.js 不会自动回收。场景里 `remove()` 了不代表显存释放，必须 `dispose()`。

## 常见坑

- 每个物体都 `new BoxGeometry()`：100 个立方体 = 100 份顶点数据。共享同一份。
- 忘了 `computeVertexNormals()`：自定义几何体全黑或光照错乱。
- 索引写错顺序：面朝内，看起来"透过去"了（背面剔除）。
- `PlaneGeometry` 没转：地面立起来了。
- 顶点数上百万的模型直接加载：先减面（Blender 的 Decimate）或换 LOD。

## 自检

- `position` 属性和 `index` 的关系是什么？
- 为什么球体分段数是性能敏感参数？
- 合并几何体的前提条件有哪些？
- `geometry.dispose()` 之后再用会怎样？
