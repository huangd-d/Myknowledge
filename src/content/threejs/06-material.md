---
title: 材质
description: 材质决定表面怎么和光交互，MeshStandardMaterial 覆盖 90% 场景，其余是特例。
order: 6
---

# 材质

> 一句话：材质是"表面如何响应光"的描述；它不产生光，没灯就是黑的。

## 材质谱系

| 材质 | 要灯吗 | 适用 |
| --- | --- | --- |
| `MeshBasicMaterial` | 不要 | 不参与光照的纯色/贴图，调试占位、UI 面板 |
| `MeshLambertMaterial` | 要 | 老式漫反射，便宜，无高光 |
| `MeshPhongMaterial` | 要 | 有高光的廉价方案，塑料感 |
| `MeshStandardMaterial` | 要 | **默认首选**，metalness/roughness 的 PBR |
| `MeshPhysicalMaterial` | 要 | 需要清漆、透射、折射、光泽时（更贵） |
| `MeshNormalMaterial` | 不要 | 调试法线朝向 |
| `ShaderMaterial` | 看写法 | 自定义着色器 |
| `PointsMaterial` / `LineBasicMaterial` | 不要 | 点云、线框 |

## Standard 的关键参数

```js
const material = new THREE.MeshStandardMaterial({
  color: 0x8b93ff,     // 基础色（非金属的反射色）
  metalness: 0,        // 0=绝缘体（木、塑料），1=金属
  roughness: 0.4,      // 0=镜面，1=完全漫反射
  map: colorTexture,   // 颜色贴图
  normalMap: normalTexture,
  roughnessMap: roughTexture,
  metalnessMap: metalTexture,
  aoMap: aoTexture,
  emissive: 0x000000,  // 自发光，不照亮别人
  envMapIntensity: 1,  // 环境反射强度
  side: THREE.FrontSide,
  transparent: false,
  opacity: 1,
  flatShading: false,  // true 出低多边形硬边
})
```

PBR 经验值：塑料 `metalness 0 / roughness 0.3–0.5`；金属 `metalness 1 / roughness 0.1–0.4`；布料 `metalness 0 / roughness 0.8+`。**metalness 只在 0 和 1 附近有意义**，0.5 是最容易做出"脏兮兮"效果的值。

## 透明

```js
new THREE.MeshStandardMaterial({
  transparent: true,
  opacity: 0.35,
  depthWrite: false,   // 半透明物体通常关掉深度写入，避免遮挡后面的自己
  side: THREE.DoubleSide,
})
```

透明是排序问题：不透明物体先画（从前到后），透明物体后画（从后到前）。同一物体内部的自重叠没法靠排序解决，只能用 `depthWrite: false` 或 alpha 测试（`alphaTest: 0.5` 走不透明通道）。

顺序相关的透明物体（头发、玻璃）建议用 `alphaTest` 模拟镂空，比真透明便宜且不会闪。

## 贴图与"重新编译"

材质在**第一次渲染时编译 shader**，编译的输入是"有哪些贴图、用不用阴影、有没有顶点色"等布尔组合。中途加贴图会让 shader 失效：

```js
material.map = newTexture
material.needsUpdate = true    // 关键：不加这句，贴图不生效
```

只改 `color`、`opacity` 这类 uniform 值不用 `needsUpdate`。

## 复用与释放

```js
const shared = new THREE.MeshStandardMaterial({ color: 0xffffff })
for (const geo of geometries) scene.add(new THREE.Mesh(geo, shared))

// 每个物体要独立颜色时：
const cloned = shared.clone()   // 共享贴图，独立参数

// 释放
shared.dispose()
```

`clone()` 是浅拷贝：贴图引用共享，改 `map` 不会影响原件，但 `dispose()` 任一方都会让贴图失效。**贴图的释放要跟着"最后一个使用者"走**。

## 常见坑

- 用了 `MeshStandardMaterial` 却没灯：纯黑。先用 `Basic` 确认几何体位置对，再上 PBR。
- `transparent: true` 却不关 `depthWrite`：透明物体互相遮挡出现"切片"。
- 每个物体 `new Material()`：100 个材质 = 100 次 shader 编译，首帧卡顿。
- 改材质属性后必须 `needsUpdate` 的却忘了：画面不变，怎么调都不对。
- `emissive` 当光源用：自发光不会照亮别的物体，只会让自己看起来亮。
- 忘记 `dispose()`：切换材质后旧 shader program 和贴图一直占显存。

## 自检

- `metalness` 为什么只在 0/1 附近有意义？
- 什么情况下必须 `needsUpdate = true`？
- 透明物体为什么需要排序，排序解决不了什么？
- 材质 clone 后 `dispose` 会影响原件吗？
