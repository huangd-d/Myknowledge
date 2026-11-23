---
title: 动画
description: 关键帧动画用 AnimationMixer，程序化动画用 delta 驱动，两者都不能忘记"每帧推进"。
order: 10
---

# 动画

> 一句话：动画是"用时间改属性"；关键帧交给 `AnimationMixer`，程序化交给 delta，唯一的共同点是每帧都要推进。

## 两条路线

| 路线 | 输入 | 适合 |
| --- | --- | --- |
| 关键帧（AnimationClip） | 美术在 Blender 里做好的动作 | 角色、机械臂、开合机构 |
| 程序化（手写） | 代码算出的位移/旋转/颜色 | 悬浮、呼吸、相机跟随、过渡 |

## 关键帧：AnimationMixer

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const gltf = await new GLTFLoader().loadAsync('/models/robot.glb')
scene.add(gltf.scene)

const mixer = new THREE.AnimationMixer(gltf.scene)
const actions = new Map()

for (const clip of gltf.animations) {
  actions.set(clip.name, mixer.clipAction(clip))
}

// 播放"走路"，循环
const walk = actions.get('Walk')
walk.setLoop(THREE.LoopRepeat, Infinity)
walk.play()

// 每帧推进（delta 单位是秒）
renderer.setAnimationLoop((time) => {
  const delta = Math.min((time - last) / 1000, 0.1)
  last = time
  mixer.update(delta)
  renderer.render(scene, camera)
})
```

`mixer.update()` 不能漏。漏了的结果是模型保持第一帧姿势，看起来像"动画没加载成功"，但 `gltf.animations.length` 明明是 1。

## 动作切换

```js
function play(name, fade = 0.25) {
  const next = actions.get(name)
  if (!next) return
  for (const action of actions.values()) {
    if (action !== next && action.isRunning()) action.fadeOut(fade)
  }
  next.reset().setEffectiveWeight(1).fadeIn(fade).play()
}
```

要点：
- `reset()` 把时间归零、权重归 1、解除上一次的 `stop` 状态，切换动作几乎总要调。
- 用 `fadeOut / fadeIn / crossFadeTo` 做过渡，直接 `stop()` 会瞬移。
- 一次性动作：`setLoop(THREE.LoopOnce)` + `clampWhenFinished = true`，否则播完会弹回第一帧。

```js
action.setLoop(THREE.LoopOnce)
action.clampWhenFinished = true
mixer.addEventListener('finished', (event) => {
  if (event.action === action) play('Idle')
})
```

## 程序化动画

```js
const target = new THREE.Vector3(2, 0, 0)

renderer.setAnimationLoop((time) => {
  const delta = Math.min((time - last) / 1000, 0.1)
  last = time

  // 指数插值：与帧率无关，不会过冲
  const alpha = 1 - Math.exp(-8 * delta)
  mesh.position.lerp(target, alpha)

  // 正弦呼吸
  mesh.scale.setScalar(1 + Math.sin(time * 0.002) * 0.05)

  renderer.render(scene, camera)
})
```

避免写成 `mesh.position.lerp(target, 0.1)`：那是"每帧移动剩余距离的 10%"，144Hz 下比 60Hz 快得多。

## 与外部状态同步

- 滚动驱动的动画：监听 `scroll` 拿到进度值，在渲染循环里把进度映射成属性，**不要在 scroll 回调里直接 render**。
- 状态机切换动作：`play()` 做成幂等（同名动作不重播），避免每帧调用 `reset()` 把动画卡在开头。
- 暂停：`mixer.timeScale = 0` 比 `stopAllAction()` 温和，恢复时不会丢进度。

## 清理

```js
mixer.stopAllAction()
mixer.uncacheRoot(gltf.scene)   // 释放绑定缓存，换模型前必须调
```

只 `remove()` 模型不 `uncacheRoot`，旧的绑定和 clip 会一直留在内存里。

## 常见坑

- 忘了 `mixer.update(delta)`。
- clip 名字用下标（`gltf.animations[0]`）：换一版模型顺序就变了。
- `LoopOnce` 忘了 `clampWhenFinished`：播完跳回第一帧。
- 每帧 `clipAction()`：每次都新建 action，内存涨、权重乱。
- `mixer` 建在 `gltf.scene` 上，却对子节点播放 clip：clip 的 track 必须能对应到 mixer 的根节点之下。
- 动画和手写旋转同时改同一个属性：后执行的赢，表现为"动画只动一半"。

## 自检

- `mixer.update()` 漏了会是什么现象？
- 切换动作时为什么几乎总要 `reset()`？
- 指数插值为什么比固定系数 `lerp` 好？
- 换模型前为什么必须 `uncacheRoot()`？
