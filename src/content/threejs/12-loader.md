---
title: 资源加载与释放
description: GLTF 是容器不是文件，加载器只是第一步，dispose 才是闭环。
order: 12
---

# 资源加载与释放

> 一句话：模型加载进来只是"占用了显存"，不调用 `dispose()` 就永远不会还回去。

## GLTF 加载

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
const gltf = await loader.loadAsync('/models/robot.glb')

gltf.scene.scale.setScalar(1)          // glTF 规定 1 单位 = 1 米
gltf.scene.position.set(0, 0, 0)
scene.add(gltf.scene)

console.log(gltf.animations)           // 关键帧
```

`gltf.scene` 是一个 `Group`，里面是完整层级。按名字找节点：

```js
const head = gltf.scene.getObjectByName('Head')
const meshes = []
gltf.scene.traverse((obj) => {
  if (obj.isMesh) meshes.push(obj)
})
```

## 压缩扩展

真实项目里 glb 通常带 Draco 压缩、KTX2 纹理、Meshopt：

```js
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

const draco = new DRACOLoader().setDecoderPath('/draco/')
const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer)

const loader = new GLTFLoader()
  .setDRACOLoader(draco)
  .setKTX2Loader(ktx2)
  .setMeshoptDecoder(MeshoptDecoder)
```

三个 loader 的 wasm/js 文件要自己拷到 `public/` 对应目录，**路径写错的表现是加载卡住或静默失败**。

## LoadingManager：知道"全部加载完"

```js
const manager = new THREE.LoadingManager()
manager.onProgress = (url, loaded, total) => {
  progressBar.value = loaded / total
}
manager.onLoad = () => {
  scene.add(model)        // 全部就绪再显示，避免闪烁
}
manager.onError = (url) => console.error('加载失败', url)

const texLoader = new THREE.TextureLoader(manager)
const gltfLoader = new GLTFLoader(manager)
```

多个资源并行加载时，用 manager 统一收口比 `Promise.all` 更自然（它内部按 URL 去重）。

## 克隆带骨骼的模型

```js
import { clone } from 'three/addons/utils/SkeletonUtils.js'

const copy = clone(gltf.scene)     // 骨骼正确映射
```

普通 `object.clone()` 对 SkinnedMesh 会共用骨架，做出一堆"连体"角色。

## 释放：一个都不能少

```js
function disposeObject(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return
    obj.geometry?.dispose()

    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose()
      }
      material.dispose()
    }
  })
}

scene.remove(model)
disposeObject(model)
```

顺序很重要：**先 `remove` 再 `dispose`**，避免还在渲染队列里就被释放。

检查有没有漏：

```js
console.log(renderer.info.memory)   // { geometries, textures }
```

来回加载/卸载十次，这两个数字应该回到基线；持续上涨就是没释放干净。

## 缓存

```js
THREE.Cache.enabled = true
```

同一个 URL 只会真正请求一次，适合"同一张贴图被多个材质使用"的场景。缓存是全局的，释放纹理时要考虑其它引用者。

## 常见坑

- 路径写错（相对/绝对、base 配置）：404 或静默空白。
- Draco/KTX2 的 decoder 没部署：加载一直 pending。
- 每加载一次就 `new GLTFLoader()` 并重新解析：重复解析几 MB 的 glb。
- 只 `scene.remove()` 不 `dispose()`：显存泄漏。
- 对 SkinnedMesh 用 `clone()`：骨架共用，动一个全动。
- 在 `onLoad` 里假设 `gltf.scene` 已加进场景：没 `add` 就不会渲染。
- 模型的 `castShadow/receiveShadow` 默认 false：加载后要遍历开启。

## 自检

- glb 里的贴图什么时候进显存？
- `renderer.info.memory` 一直涨，你从哪里开始查？
- 为什么带骨骼的模型不能直接 `clone()`？
- 加载 3 个模型，怎么知道全部完成？
