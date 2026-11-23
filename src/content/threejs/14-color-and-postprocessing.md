---
title: 颜色管理与后处理
description: 颜色要经过 sRGB → 线性 → 色调映射 → sRGB 的往返；后处理就是在这条链上插一条离屏渲染。
order: 14
---

# 颜色管理与后处理

> 一句话：渲染在**线性空间**里算光，显示前必须转回 sRGB；后处理把画面先画到贴图，再逐级处理。

## 颜色管线

```
贴图（sRGB 解码）→ 线性工作空间（乘光、加光）→ 色调映射（HDR→LDR）→ sRGB 编码 → 屏幕
```

Three.js 较新版本里 `THREE.ColorManagement.enabled` 默认是 `true`，所以：

- `new THREE.Color('#8b93ff')`、材质 `color: 0x8b93ff` 都被当作 **sRGB** 输入，内部自动转成线性。
- 颜色贴图要显式 `texture.colorSpace = THREE.SRGBColorSpace`（见纹理篇），否则它被当作线性数据，画面发灰。
- 输出由 `renderer.outputColorSpace = THREE.SRGBColorSpace` 负责，默认就是它，**别关**。

手工做色彩运算时注意：

```js
const color = new THREE.Color().setHex(0x8b93ff)   // 按 sRGB 解释
const linear = color.clone().convertSRGBToLinear() // 需要参与插值/混合时
```

在线性空间做插值（渐变、光照混合）才符合物理；直接对 sRGB 值取平均，暗部会脏。

## 色调映射

```js
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
```

| 模式 | 特点 |
| --- | --- |
| `NoToneMapping` | 直出，HDR 高光直接裁掉，纯色平面图适用 |
| `ACESFilmicToneMapping` | 电影感，高光过渡柔和，最常用 |
| `AgXToneMapping`（较新版本） | 更中性的高光与色相 |
| `NeutralToneMapping`（较新版本） | 贴近原色，适合产品展示 |
| `LinearToneMapping` / `ReinhardToneMapping` | 老派，控制简单 |

色调映射只在**输出前**做一次。若同时用了后处理，注意不要重复应用（见下）。

## 后处理

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const composer = new EffectComposer(renderer)
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
composer.setSize(width, height)

composer.addPass(new RenderPass(scene, camera))

const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.4, 0.85)
composer.addPass(bloom)

composer.addPass(new OutputPass())   // 必须是最后一个

renderer.setAnimationLoop(() => {
  composer.render()                  // 注意：不再调 renderer.render()
})
```

`OutputPass` 负责**色调映射 + sRGB 转换**。少了它，画面会明显偏亮/偏灰（因为渲染目标里是线性值，直接被当成 sRGB 显示）。

`EffectComposer` 内部用 `WebGLRenderTarget` 存中间结果，所以：

- 窗口变化时 `composer.setSize()` 必须跟着调，否则拉伸或模糊。
- 需要 MSAA 时给 render target 设 `samples`（WebGL2），否则边缘锯齿。
- 每个 pass 都是一次全屏绘制，吃填充率；移动端最多留 1–2 个 pass。

## Bloom 要有 HDR 输入

Bloom 靠"超过阈值"的亮度触发。想让灯带发光，材质要给大于 1 的亮度：

```js
const material = new THREE.MeshStandardMaterial({
  color: 0x000000,
  emissive: new THREE.Color(0x66ccff),
  emissiveIntensity: 4,      // 关键：>1 才会被 bloom 抓到
})
```

配合 `toneMapping` 才不会糊成一片白。

## 常见坑

- 用了 composer 又保留 `renderer.render()`：画面被覆盖一次，后处理白做。
- 忘了 `OutputPass`：颜色发灰、对比度低。
- `renderer.toneMapping` 开着，`OutputPass` 又做一次：画面过曝。要么交给 OutputPass，要么关掉 renderer 上的。
- resize 只改了 renderer，没改 composer：画面拉伸。
- 颜色贴图没标 sRGB：怎么调 bloom 都脏。
- 每帧 `new UnrealBloomPass()`：显存与 program 疯涨。

## 自检

- 为什么光照必须在"线性空间"里算？
- `OutputPass` 到底做了什么，去掉会怎样？
- 一块黑色材质怎么才能被 bloom 抓到？
- composer 与 renderer 的尺寸为什么要同时更新？
