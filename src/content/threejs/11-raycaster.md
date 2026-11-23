---
title: 交互拾取：Raycaster
description: 从屏幕点发一条射线打到 3D 空间里，难点全在坐标转换与性能。
order: 11
---

# 交互拾取：Raycaster

> 一句话：把鼠标的屏幕坐标转成 NDC，用相机生成射线，再看射线和哪些物体相交。

## 完整流程

```js
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1   // 注意负号

  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(scene.children, true)
  if (hits.length > 0) {
    const hit = hits[0]                     // 已按距离从近到远排序
    console.log(hit.object.name, hit.point, hit.distance)
  }
}
```

两个易错点：

1. **必须用 `getBoundingClientRect()`**，不能用 `window.innerWidth`。画布不在左上角、页面滚动了、旁边有侧栏，用窗口尺寸算出来的 NDC 全是错的。
2. **Y 轴要取反**：屏幕坐标 Y 向下，NDC 的 Y 向上。

## 命中的信息

| 字段 | 含义 |
| --- | --- |
| `object` | 命中的 `Mesh` / `Line` / `Points` |
| `point` | 世界坐标下的交点 |
| `distance` | 相机到交点的距离，结果按它升序 |
| `face` | 命中的三角形（`a/b/c` 顶点索引、`normal`） |
| `faceIndex` | 三角形序号，做逐面上色/贴花时有用 |
| `uv` | 交点的 UV（几何体有 uv 才有） |
| `instanceId` | 命中 `InstancedMesh` 时的实例编号 |

## 只测需要的物体

```js
const pickables = [ground, box, sphere]
const hits = raycaster.intersectObjects(pickables, false)  // false：不递归子级
```

`intersectObjects(scene.children, true)` 会遍历整棵场景树，物体上千时每次 `pointermove` 都扫一遍很贵。做法：

- 维护一个 `pickables` 数组，只放可交互物体；
- `recursive` 传 `false`；
- 用 `groups` 或 `Layers` 分组，让拾取只发生在某一层；
- `pointermove` 节流到每帧一次（记录坐标，循环里再算），不要每个事件都求交。

```js
// 每帧只算一次
renderer.setAnimationLoop(() => {
  if (pointerDirty) {
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(pickables, false)
    hovered = hits[0]?.object ?? null
    pointerDirty = false
  }
  renderer.render(scene, camera)
})
```

## 点击与悬停的语义

```js
canvas.addEventListener('pointerdown', (event) => { /* 记录起点 */ })
canvas.addEventListener('pointerup', (event) => {
  // 拖动超过 5px 就不算点击，避免和 OrbitControls 打架
  if (Math.hypot(event.clientX - startX, event.clientY - startY) > 5) return
  pick(event)
})
```

`OrbitControls` 也在监听 pointer 事件，直接 `click` 处理拖动结束会误触发。

## 与 InstancedMesh 配合

```js
const hits = raycaster.intersectObject(instancedMesh)
if (hits[0]) {
  const index = hits[0].instanceId
  instancedMesh.setColorAt(index, new THREE.Color('hotpink'))
  instancedMesh.instanceColor.needsUpdate = true
}
```

上千个重复物体用 `InstancedMesh` 时，拾取一次就能拿到 `instanceId`，不必给每个实例建单独 Mesh。

## 常见坑

- 用窗口尺寸算 NDC：画布偏移后全部点偏。
- 忘了 `camera.updateMatrixWorld()`：相机刚被移动、还没渲染就拾取，射线方向是旧的。
- `recursive` 传 true 又没限制范围：大场景每次移动都遍历几千个物体。
- 射线打到"看不见的物体"：`visible = false` 的物体是否参与拾取与版本/写法有关，稳妥做法是把它从待测数组或 `layers` 里排除。
- 相机 `near/far` 之外：射线照样能打到（Raycaster 不受视锥限制），远处的物体也会被点中。
- 变换后的物体坐标算错：`hit.point` 是世界坐标，加到局部父级下要先 `worldToLocal`。

## 自检

- 为什么 NDC 的 Y 要取反？
- `intersectObjects(a, false)` 与 `true` 的差别？
- 拖动旋转视角时为什么容易误触发点击？
- 上千个物体，你会怎么把拾取成本压下来？
