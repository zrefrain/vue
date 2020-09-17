/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

/*
 * zrefrain
 * 视频和配套文档上说 createPatchFunction 是一种函数柯里化，不懂...
 */
export const patch: Function = createPatchFunction({ nodeOps, modules })
