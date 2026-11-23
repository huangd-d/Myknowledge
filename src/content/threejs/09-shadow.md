---
title: 阴影
description: 阴影是从光源视角再渲染一遍深度图，贵、需要调参，而且调错的样子完全不一样。
order: 9
---

# 阴影

> 一句话：阴影 = 从光源视角渲染一张深度图，再在着色时比较深度；每盏投影灯多一次渲染。

## 三步打开

```js
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap   // 默认 PCFShadowMap，软阴影更自然

light.castShadow = true          // 灯要投影
mesh.castShadow = true           // 物体要投影
mesh.receiveShadow = true        // 物体要接影
```

三个条件缺一不可。**灯开了但物体没开**，是最常见的"阴影不出现"。

## 平行光的阴影相机

`DirectionalLight` 的阴影由一台**正交相机**产生，它的范围要手动框住场景：

```js
const sun = new THREE.DirectionalLight(0xffffff, 2)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)     // 分辨率，1024/2048 是常见档位

const cam = sun.shadow.camera          // OrthographicCamera
cam.left = -12
cam.right = 12
cam.top = 12
cam.bottom = -12
cam.near = 0.5
cam.far = 40
cam.updateProjectionMatrix()           // 改完必须调用

sun.shadow.bias = -0.0005              // 消除自阴影条纹（acne）
sun.shadow.normalBias = 0.02           // 更稳，优先调这个
sun.shadow.radius = 2                  // 只对 PCFSoft 生效
```

范围与分辨率是**互相拉扯的一对**：范围框得越大，同样的 2048 分辨率覆盖面积越大，阴影越模糊、越容易出现锯齿。原则是**刚好框住需要投影的物体**，别用 `-100 ~ 100`。

聚光灯用透视相机，范围由 `angle` 与 `far` 决定：

```js
spot.shadow.camera.fov = THREE.MathUtils.radToDeg(spot.angle) * 2
spot.shadow.camera.far = 30
```

## 两类典型瑕疵

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| 物体表面出现条纹（acne） | 深度比较精度不够 | `normalBias` 调大（0.01–0.05），再考虑 `bias` 微调负数 |
| 阴影和物体"脱开"（peter-panning） | `bias` 太大 | 减小 bias，优先用 `normalBias` |
| 阴影边缘一块一块 | 分辨率不足或范围太大 | 加大 `mapSize`，缩小 `shadow.camera` 范围 |
| 远处物体没有阴影 | 超出 `shadow.camera.far` | 调大 far 或缩小场景 |

**优先调 `normalBias`，少用 `bias`**：bias 是沿光照方向的整体偏移，容易让接触阴影漂走。

## 代价

- 每盏 `castShadow` 的灯多一次场景渲染（只写深度）。6 个投影灯 = 7 次渲染。
- 点光源阴影需要**立方体贴图**，等于 6 个面各渲一次，最贵。室内小范围用 SpotLight 替代。
- 阴影贴图是 GPU 内存：2048² × 4 字节 ≈ 16MB/盏（深度+辅助缓冲，实际更多）。

静态场景可以让阴影只渲染一次：

```js
renderer.shadowMap.autoUpdate = false
renderer.shadowMap.needsUpdate = true   // 需要时手动刷一次
```

## 软阴影的三种来源

1. `PCFSoftShadowMap` + `shadow.radius`：最便宜的软化。
2. `VSMShadowMap`：可调 `blurSamples`，但容易漏光（light bleeding）。
3. 环境光遮蔽（AO）与接触阴影：不是阴影贴图能给的，靠 `aoMap`、SSAO 后处理补。

## 常见坑

- 只开了 `renderer.shadowMap.enabled`，忘了灯的 `castShadow`。
- 地面是 `PlaneGeometry` 但没 `receiveShadow`，阴影"投到空气里"。
- 改完 `shadow.camera` 忘了 `updateProjectionMatrix()`。
- 阴影相机范围太大：整片阴影糊成一团。
- 透明材质投影：默认按几何体投，叶片/树叶需要 `alphaTest` 配合 `customDepthMaterial`。
- 每帧更新阴影：`autoUpdate` 保持默认 true 时，静态场景白白多一次渲染。

## 自检

- 阴影贴图本质上存的是什么？
- 为什么点光源阴影最贵？
- acne 和 peter-panning 分别该调哪个参数？
- 静态场景怎么让阴影只算一次？
