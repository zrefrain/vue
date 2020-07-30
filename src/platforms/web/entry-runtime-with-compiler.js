/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /*
   * zrefrain
   * 这里的注释 istanbul ignore if 是为了忽略 if 的代码，从而不计入代码覆盖率的计算中
   * 参考资料：http://www.ruanyifeng.com/blog/2015/06/istanbul.html
   */
  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  if (!options.render) {
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        /**
         * zrefrain
         * # 开始当作选择符，使用匹配元素的 innerHTML 作为模板
         * 参考资料：
         * 1. https://cn.vuejs.org/v2/api/#template
         * 2. https://cn.vuejs.org/v2/guide/components-edge-cases.html#X-Template
         */
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
        /*
         * zrefrain
         * template.nodeType？这是指什么？没搞懂这个判断，文档里 template 的类型描述是 string 啊
         */
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  /**
   * zrefrain
   * outerHTML DOM 接口获取当前元素及其后代的序列化 HTML，innerHTML 获取后代（不包括当前元素）
   * 参考链接：https://developer.mozilla.org/zh-CN/docs/Web/API/Element/outerHTML
   */
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

/**
 * zrefrain
 * 没搞明白 compile 具体用来干嘛
 * 相关 Vue 文档：
 * 1. https://cn.vuejs.org/v2/api/#Vue-compile
 * 2. https://cn.vuejs.org/v2/guide/render-function.html#%E6%A8%A1%E6%9D%BF%E7%BC%96%E8%AF%91
 */
Vue.compile = compileToFunctions

export default Vue
