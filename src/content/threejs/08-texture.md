---
title: 纹理
description: 贴图采样、颜色空间、平铺与各向异性，以及"颜色贴图必须标 sRGB"这条铁律。
order: 8
---

# 纹理

> 一句话：纹理是贴在 UV 上的一张图；它的**颜色空间**决定画面是正常还是发灰。

## 加载

```js
const loader = new THREE.TextureLoader()
const map = await loader.loadAsync('/textures/wood.jpg')

const material = new THREE.MeshStandardMaterial({ map })
```

`loadAsync` 返回 Promise，适合 `await`；传统回调写法是 `loader.load(url, onLoad, onProgress, onError)`。加载是异步的，第一帧可能还没有贴图——需要"等资源齐了再渲染"就用 `LoadingManager`（见资源加载篇）。

## 颜色空间：唯一必须记住的规则

```js
// 颜色贴图（albedo / emissive）：人眼看的颜色，标 sRGB
colorTexture.colorSpace = THREE.SRGBColorSpace

// 数据贴图（normal / roughness / metalness / ao / displacement）：数学数据，保持线性
normalTexture.colorSpace = THREE.NoColorSpace
```

搞反的后果：

- 颜色贴图没标 sRGB → 画面**发灰、发白**，对比度丢失。
- 数据贴图标了 sRGB → 法线/粗糙度被错误解码，光照"怪怪的"，而且很难查。

`TextureLoader` 默认给的是 `NoColorSpace`，所以颜色贴图**每一张都要手动设**。

## 平铺、偏移、旋转

```js
map.wrapS = THREE.RepeatWrapping
map.wrapT = THREE.RepeatWrapping
map.repeat.set(8, 8)          // 平铺 8×8，需要 wrap 先设成 Repeat
map.offset.set(0.5, 0)        // 平移 UV
map.center.set(0.5, 0.5)
map.rotation = Math.PI / 4    // 弧度
```

`repeat` 大于 1 而 `wrap` 还是默认的 `ClampToEdgeWrapping` 时，边缘会被拉伸成一条条色带——这是"地面贴图糊成一片"的经典原因。

## 过滤与各向异性

```js
map.magFilter = THREE.LinearFilter          // 放大：默认
map.minFilter = THREE.LinearMipmapLinearFilter  // 缩小：默认，带 mipmap
map.generateMipmaps = true                   // 默认开，缩小远离时减少闪烁
map.anisotropy = renderer.capabilities.getMaxAnisotropy()  // 斜视地面的清晰度
```

各向异性对**地面、长走廊**这类大角度斜视的贴图提升最明显，几乎无性能代价，值得默认拉满。

## 常用纹理来源

| 来源 | 写法 | 用途 |
| --- | --- | --- |
| `TextureLoader` | `loadAsync(url)` | jpg/png/webp |
| `KTX2Loader` | 需配 transcoder | 压缩纹理，移动端首选 |
| `RGBELoader` | `.hdr` | 环境贴图（IBL） |
| `CanvasTexture` | `new CanvasTexture(canvas)` | 文字、图表、程序化生成 |
| `DataTexture` | `Uint8Array` + 宽高 | 逐像素生成（噪声、遮罩） |

```js
const canvas = document.createElement('canvas')
canvas.width = 512
canvas.height = 256
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#111827'
ctx.fillRect(0, 0, 512, 256)
ctx.fillStyle = '#fff'
ctx.font = 'bold 64px sans-serif'
ctx.fillText('HELLO', 40, 150)

const texture = new THREE.CanvasTexture(canvas)
texture.colorSpace = THREE.SRGBColorSpace
texture.needsUpdate = true       // 内容变了要重传
```

## 释放

```js
texture.dispose()
```

纹理是显存里最大的一块。切换场景、卸载模型时必须 `dispose()`，否则显存只增不减（`renderer.info.memory.textures` 会一直涨）。

## 常见坑

- 颜色贴图没设 `SRGBColorSpace`：画面发灰。
- 数据贴图设成 sRGB：光照错误且难定位。
- `repeat` 不生效：忘了设 `wrapS/wrapT = RepeatWrapping`。
- 每帧 `texture.needsUpdate = true`：每帧重传显存，帧率立刻掉一半。
- 一张 4096×4096 的 png 当图标用：显存 64MB 起步，先降分辨率。
- 忘记 `dispose()`：来回切场景十次，显存爆掉。

## 自检

- 哪些贴图要 sRGB，哪些必须线性？
- 为什么 `repeat` 需要配合 `wrap`？
- 各向异性解决的是什么视觉问题？
- 怎么用 `renderer.info.memory` 判断有没有泄漏？
