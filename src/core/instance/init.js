/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      /**
       * zrefrain
       * 优化内部组件实例化，因为动态 options 合并比较慢，且内部组件 options 不需要特殊处理
       * 补充：create-component.js 中的 createComponentInstanceForVnode 函数调用可进入该判断，其设置了 options._isComponent 为 true
       */
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        /**
         * zrefrain
         * 这里 vm.constructor 中的 vm（也就是 this）
         * 在 new Vue(options) 时指向 instance/index.js Vue 函数中 this._init(options) 的 this
         * 而 this._init 中的 this 指向，也就是 new 操作时生成的新对象，等同于 new 操作生成的实例，如：v = new Vue(...) 中的实例 v
         * vm.construct 等于 v.__proto__.constructor，也等于 Vue.prototype.constructor
         * 而函数原型默认的 constructor 属性，引用的就是函数本身，Vue.prototype.constructor === Vue // true（可在 Vue 官网验证）
         * 传入 resolveConstructorOptions 中的 vm.constructor 也就是 Vue.prototype.constructor.options，也就是 Vue
         *
         * 具体参考 《你不知道的 JavaScript —— 上》 Page 91、149
         */
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    /**
     * zrefrain
     * initRender(vm) 的调用位置发生过变化，详细看下面的注释
     */
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    /**
     * zrefrain
     * 看的文章分析的是 2.1.7 版本的，但最新版本的源代码，把下面的代码从 initRender 提出来了
     * initRender 顺序也从 callHook(vm, 'created') 后面提取到了 callHook(vm, 'beforeCreate') 前，具体原因不理解
     * 参考资料：https://github.com/vuejs/vue/commit/7131bc48155fb5224f4d6f0fb1c4b7eed6a79db4
     *
     * 其他：这也就是为什么 new Vue({...}) 不传 el 需要手动 vm.$mount() 开启编译
     * 参考资料：https://cn.vuejs.org/v2/api/#el
     */
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  /**
   * zrefrain
   * vm.constructor 也就是 extend.js 中声明的 Sub 构造函数 VueComponent
   */
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  /**
   * zrefrain
   * parentVnode 在 create-component.js 的 createComponentInstanceForVnode 函数中可以找到定义
   * parentVnode.componentOptions 相关的定义也在 create-component.js 中，createComponent 函数中的 new VNode 处
   */
  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  /**
   * zrefrain
   * 也就是 Vue.options
   */
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
