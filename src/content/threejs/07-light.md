---
title: 光照
description: 灯的类型、强度单位、衰减规则，以及"每多一盏灯，shader 就多一段循环"这件事。
order: 7
---

# 光照

> 一句话：光照决定 PBR 材质长什么样；灯的数量直接进入 shader，是性能的硬约束。

## 五种灯

| 灯 | 有方向吗 | 有衰减吗 | 典型用途 |
| --- | --- | --- | --- |
| `AmbientLight` | 无 | 无 | 打底，消除纯黑阴影，会给所有物体均匀提亮 |
| `HemisphereLight` | 上下两色 | 无 | 户外天光，比 Ambient 自然得多 |
| `DirectionalLight` | 有（平行） | 无 | 太阳，配合阴影最常用 |
| `PointLight` | 全向 | 有（按距离平方） | 灯泡、火光 |
| `SpotLight` | 锥形 | 有 | 手电筒、舞台灯 |
| `RectAreaLight` | 面 | 无 | 柔光箱（只对 Standard/Physical 生效） |

```js
scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x223344, 1.2))

const sun = new THREE.DirectionalLight(0xfff2dd, 2.2)
sun.position.set(5, 8, 3)
sun.target.position.set(0, 0, 0)   // 默认目标是原点，移动了就要把 target 也加进场景
scene.add(sun, sun.target)

const bulb = new THREE.PointLight(0xffc27a, 12, 8, 2) // 颜色, 强度, 距离, 衰减
bulb.position.set(0, 2.4, 0)
scene.add(bulb)
```

## 强度单位（容易踩）

较新版本默认使用物理正确的光照（旧的 `useLegacyLights` 已移除），所以：

- `DirectionalLight` / `AmbientLight` / `HemisphereLight`：强度约等于"倍数"，常用 1–3。
- `PointLight` / `SpotLight`：强度是**坎德拉**，且默认 `decay = 2`（按距离平方衰减）。离物体 4 米时，要得到 1 的照度需要 `intensity ≈ 16`。所以点光强度普遍写成 10–50，不是 bug。

距离与衰减一起用：`new PointLight(color, intensity, distance, decay)`，`distance` 是硬截断半径（0 表示无限），`decay` 默认 2 就是物理正确。

## 灯光进入 shader 的代价

每种灯的数量会编译进 shader，三个点光会比一个点光多一段循环。灯越多：

- shader 编译越慢（首帧卡）；
- 每帧每个像素的计算越多；
- 阴影渲染 pass 越多（每个可投影灯一次）。

实践：**1 个平行光 + 1 个半球光**能覆盖大部分场景；需要"很多光点"的效果（霓虹、发光粒子）用自发光材质 + Bloom 后处理伪造，别真的放 20 个 PointLight。

## 环境光遮蔽与 IBL

真正的室内质感来自环境反射，而不是多加几盏灯：

```js
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

// 或者加载 HDR：
// const hdr = await new RGBELoader().loadAsync('/env/studio.hdr')
// scene.environment = pmrem.fromEquirectangular(hdr).texture
```

`scene.environment` 会被所有 PBR 材质用作 IBL（间接光），比堆灯光便宜且真实。它在**加载后**才有，所以常配合加载管理器。

## 常见坑

- 灯忘了 `add` 到场景：不生效。灯的 `target` 也要 `add`。
- 只有 `AmbientLight`：物体全是平的，没有体积感。
- 平行光位置当"方向"用：`DirectionalLight` 只关心 `position - target` 的方向，距离不影响强度。
- 点光太暗：以为坏了，其实是 `decay = 2` + 距离。
- 移动灯但没设 `light.target`：平行光方向还是指向原点。
- 每个物体一套灯：不存在这种写法，灯是场景级的。

## 自检

- 为什么移动平行光的位置会改变方向，但改变距离不影响亮度？
- 点光在 4 米处要亮，强度大约要给多少？
- 想让室内更真实，先加灯还是先加环境贴图？
- 一个场景 20 个点光，你会先改什么？
