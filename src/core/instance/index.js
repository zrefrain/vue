import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  /*
   * zrefrain
   * process.env.NODE_ENV 在 Vue 文档上的介绍，可以通过设置改字段的值来丢弃仅供开发环境的代码块，以减少最终文件尺寸
   * process.env.NODE_ENV 值设置的代码位置在 scripts/config 第 256 行
   * 参考链接：
   * 1. https://zhuanlan.zhihu.com/p/141437178（先看到知乎上的解答，才意识到去看文档）
   * 2. https://cn.vuejs.org/v2/guide/installation.html#%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83-vs-%E7%94%9F%E4%BA%A7%E7%8E%AF%E5%A2%83%E6%A8%A1%E5%BC%8F
   * 3. https://vue-loader-v14.vuejs.org/zh-cn/workflow/production.html
   */

  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
