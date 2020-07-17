/* @flow */

import { warn } from 'core/util/index'

/*
 * zrefrain
 * 这里 export 和 import 的复合写法
 * ES6：https://es6.ruanyifeng.com/#docs/module#export-%E4%B8%8E-import-%E7%9A%84%E5%A4%8D%E5%90%88%E5%86%99%E6%B3%95
 * 用意把 ./attrs、./class、./element 中的方法（变量等）整体接收后再整体输出，相当于转发，当前模块不能用其中的方法（变量等）
 */

export * from './attrs'
export * from './class'
export * from './element'

/**
 * Query an element selector if it's not an element already.
 */
export function query (el: string | Element): Element {
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}
