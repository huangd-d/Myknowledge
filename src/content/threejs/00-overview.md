---
title: 概念地图：Three.js 在解决什么问题
description: 把 Three.js 拆成数据、变换、呈现三条主线，以及推荐的学习顺序。
order: 0
---

# 概念地图：Three.js 在解决什么问题

> 一句话：Three.js 是把「几何 + 材质 + 变换 + 相机 + 光照」翻译成 GPU 指令的那一层，你写的是描述，它负责每次绘制。

## 三条主线

| 主线 | 你提供什么 | 对应概念 |
| --- | --- | --- |
| 数据 | 形状、表面、贴图 | 几何体、材质、纹理、光照 |
| 变换 | 物体在哪、多大、朝哪 | 场景图、坐标系、矩阵 |
| 呈现 | 从哪看、画到哪、画多快 | 相机、渲染器、渲染循环、后处理 |

渲染一帧的本质：**遍历场景图 → 剔除不可见 → 按材质排序 → 逐个 draw call 提交给 GPU**。后面所有性能问题，最终都落在"这一帧提交了多少次、每次多重"。

## 十五个概念

| # | 概念 | 一句话 |
| --- | --- | --- |
| 01 | 渲染循环 | `renderer.render(scene, camera)` 每帧调用一次，其余一切都是为它准备数据 |
| 02 | 场景图与变换 | 物体是树，局部矩阵逐级相乘得到世界矩阵 |
| 03 | 坐标系与单位 | 右手系、Y 轴向上、相机看向 -Z，1 单位 = 1 米是团队约定 |
| 04 | 相机 | 决定"看见什么"，透视/正交只差一个投影矩阵 |
| 05 | 几何体 | 顶点数据 + 索引，`BufferGeometry` 是唯一真正的几何类型 |
| 06 | 材质 | 决定"看起来是什么"，从不受光的 Basic 到 PBR 的 Standard |
| 07 | 光照 | 没有灯，Standard 材质就是黑的；光的强度单位与衰减规则 |
| 08 | 纹理 | UV 采样；颜色空间搞错，画面就"发灰" |
| 09 | 阴影 | 从光源视角再渲染一遍深度图，贵且有锯齿 |
| 10 | 动画 | 时间驱动的状态更新；用 delta 保证帧率无关 |
| 11 | 交互拾取 | 屏幕坐标 → 归一化设备坐标 → 射线 → 与物体求交 |
| 12 | 资源加载与释放 | GLTF 是容器，纹理/几何/材质都要手动 `dispose()` |
| 13 | 性能与内存 | draw call、实例化、剔除、像素比、GPU 内存 |
| 14 | 后处理与颜色管理 | 先渲染到贴图再合成；输出前必须做色彩空间转换 |

## 推荐顺序

1. **先跑通一帧**：渲染器 + 场景 + 相机 + 一个立方体（01）
2. **建立空间感**：坐标系、场景图、相机（02、03、04）
3. **学会造东西**：几何体、材质（05、06）
4. **让它好看**：光照、纹理、阴影（07、08、09）
5. **让它能动**：动画、交互（10、11）
6. **让它能上线**：加载与释放、性能、后处理（12、13、14）

不要一上来学后处理。前四步没打通时，后处理只会让黑屏变得更花。

## 最小可运行骨架

```html
<canvas id="app"></canvas>
<script type="module">
  import * as THREE from 'three'

  const canvas = document.querySelector('#app')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1117)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(2, 2, 3)
  camera.lookAt(0, 0, 0)

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x8b93ff, roughness: 0.35 }),
  )
  scene.add(mesh)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2))
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(3, 5, 2)
  scene.add(key)

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas
    renderer.setSize(width, height, false)
    camera.aspect = width / height || 1
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  renderer.setAnimationLoop((time) => {
    mesh.rotation.y = time * 0.0006
    renderer.render(scene, camera)
  })
</script>
```

## 黑屏排查顺序

1. 画布有尺寸吗？（`clientWidth` 为 0 是最常见原因）
2. 相机在物体外面吗？`near/far` 包住了物体吗？
3. 材质要不要灯？`MeshStandardMaterial` 没灯就是黑的，先换 `MeshBasicMaterial` 验证。
4. 物体被裁剪了吗？（`camera.near` 太大 / 物体在相机背后）
5. 控制台有没有 WebGL 上下文丢失或着色器编译报错？
6. 打开 `renderer.info.render.calls`，是 0 还是非 0？0 说明根本没进渲染管线。
