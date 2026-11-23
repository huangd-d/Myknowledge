---
title: 场景图与变换
description: 物体是一棵树，世界矩阵是祖先矩阵连乘的结果，理解它才能算对位置。
order: 2
---

# 场景图与变换

> 一句话：每个 `Object3D` 有一个局部矩阵，最终位置 = 父级世界矩阵 × 自己的局部矩阵。

## 三个属性，一个矩阵

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `position` | `Vector3` | 相对父级的位移 |
| `quaternion` | `Quaternion` | 相对父级的旋转，内部真正存的是它 |
| `rotation` | `Euler` | 给人类用的旋转，改它会同步到 quaternion |
| `scale` | `Vector3` | 相对父级的缩放，会传给子级 |
| `matrix` | `Matrix4` | 上面三者合成的局部矩阵（缓存） |
| `matrixWorld` | `Matrix4` | 局部矩阵 × 父级世界矩阵（每帧算一次） |

```js
const group = new THREE.Group()
const mesh = new THREE.Mesh(geometry, material)
mesh.position.set(1, 0, 0)
group.add(mesh)
group.rotation.y = Math.PI / 2
scene.add(group)

mesh.getWorldPosition(new THREE.Vector3()) // 世界坐标已经不是 (1,0,0) 了
```

父级转 90°，子级的"世界方向"跟着转，但 `mesh.position` 仍是 `(1,0,0)`——**局部坐标不变，世界坐标变了**。这个区分是所有"位置算错"的根源。

## 何时需要手动更新矩阵

默认 `matrixAutoUpdate = true`，每次渲染前会根据 position/rotation/scale 重算局部矩阵，再向上传播。批量改几千个物体时会有开销，可以关掉：

```js
mesh.matrixAutoUpdate = false
mesh.position.set(1, 2, 3)
mesh.updateMatrix()        // 手动算一次局部矩阵

// 注意：还需要让世界矩阵失效
mesh.matrixWorldNeedsUpdate = true
```

静态场景（不动的建筑、地面）关掉是常见优化；动的物体别关。

## 常用方法

```js
scene.add(mesh)                 // 加到场景（会自动从原父级移除）
parent.remove(mesh)             // 移出
scene.attach(mesh)              // 加到场景，但保持世界变换不变（add 会改变世界变换）
scene.traverse((obj) => {       // 深度优先遍历，包含自己
  if (obj.isMesh) obj.material.wireframe = true
})
mesh.getWorldQuaternion(q)      // 世界旋转
mesh.lookAt(0, 0, 0)            // 让物体 +Z 朝向目标（相机是 -Z，见下）
```

`lookAt` 对相机是让 -Z 指向目标，对其他物体是让 +Z 指向目标——同一个方法，两个朝向，很容易看错。

## 分组是组织手段，不是性能手段

`Group` 只承担"一起变换"和"逻辑分组"两个职责，**不会合并 draw call**。以为套个 Group 就能变快是最常见的误解；减少 draw call 要看向 `InstancedMesh` 和几何体合并。

## 常见坑

- **改完矩阵不刷新**：设了 `matrixAutoUpdate = false` 却忘了 `updateMatrix()`，物体停在原地。
- **scale 影响子级**：父级 `scale.set(0.1, 0.1, 0.1)`，子级所有尺寸和位置一起缩，光照法线也会被影响。
- **负缩放翻面**：`scale.x = -1` 会翻转法线，配合单面材质（`side: FrontSide`）直接看不见。
- **旋转顺序**：欧拉角默认 `XYZ`，先绕 X 转再绕 Y 转和反过来结果不同。需要可重复的朝向就用 `quaternion.setFromUnitVectors` 或 `lookAt`。
- **add 会改变世界变换**：跨父级搬物体又想保持视觉位置，用 `attach()` 而不是 `add()`。

## 自检

- 父级旋转 90° 后，子级的世界坐标怎么算？
- `add` 和 `attach` 的区别是什么？
- 为什么 `Group` 不能减少 draw call？
- `matrixWorld` 是谁在什么时候更新的？
