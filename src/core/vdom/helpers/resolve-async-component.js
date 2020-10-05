/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'
import { currentRenderingInstance } from 'core/instance/render'

function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>
): Class<Component> | void {
  /**
   * zrefrain
   * 注意看 error、resolved、loading 这几个判断的顺序
   */
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  /**
   * zrefrain
   * resolveAsyncComponent 这个函数改变了，少了个 context 参数，用来传递当前实例的
   * context 变成了 currentRenderingInstance，在 _render 方法中赋值和 export 出来
   * owner 和 owners 相关的逻辑，就是之前 context 和 contexts 的逻辑
   */
  const owner = currentRenderingInstance
  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    factory.owners.push(owner)
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (owner && !isDef(factory.owners)) {
    const owners = factory.owners = [owner]
    let sync = true
    let timerLoading = null
    let timerTimeout = null

    ;(owner: any).$on('hook:destroyed', () => remove(owners, owner))

    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = owners.length; i < l; i++) {
        (owners[i]: any).$forceUpdate()
      }

      if (renderCompleted) {
        owners.length = 0
        if (timerLoading !== null) {
          clearTimeout(timerLoading)
          timerLoading = null
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout)
          timerTimeout = null
        }
      }
    }

    /**
     * zrefrain
     * once 中有用到 this，回顾下箭头函数 this 的绑定规则，箭头函数根据外层（函数/全局）作用域来决定，不受其他影响
     * once 的作用：保护 resolve 方法，如果多次调用只执行一次
     */
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      /**
       * zrefrain
       * 接收到异步组件，把其转化为组件构造函数并缓存，在 forceRender 中调用 $forceUpdate
       * 然后会执行 vm._update 再一次进入 createComponent，进入到本方法内，然后取 factory.resolved 缓存的构造函数
       */
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        forceRender(true)
      } else {
        owners.length = 0
      }
    })

    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    /**
     * 注意 factory 是异步函数，所以下面的同步代码会先执行
     * 当 factory 为工厂函数，res 为 undefined
     * 当 factory 为 import() 函数，import() 函数返回一个 Promise 对象，res 为一个对象
     */
    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (isPromise(res)) {
        /**
         * zrefrain
         * import() 方法时进入该判断，在 then 中调用 resolve 去解析 import() 回的对象（跟工厂函数 require 返回的一样）
         */
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) {
        /**
         * zrefrain
         * 异步组件工厂函数高级用法
         * 首先把传入的 error、loading 转化为组件构造函数绑定到 factory 属性上，然后设置相对应到 setTimeout 函数
         * 然后到设置的时间，执行定时器内的 forceRender 函数，再执行函数最上面的判断去决定是渲染 loading 还是 error or resolve
         */
        res.component.then(resolve, reject)

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            timerLoading = setTimeout(() => {
              timerLoading = null
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          timerTimeout = setTimeout(() => {
            timerTimeout = null
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
