import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
//这里定义了一个vue class
// this._init()方法是在 src/core/instance/init.js中定义
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
//调用了一系列init、mixin这样的方法来初始化一些功能
//导出了一个 Vue 功能类

//定义了一个_init方法挂载在Vue.prototype上
initMixin(Vue) 

stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
