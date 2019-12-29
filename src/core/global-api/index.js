/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  /**
   * ?????????
   * config里面都是一些什么方法
   * _lifecycleHooks: 在shared/constants.js中定义了：
      export const LIFECYCLE_HOOKS = [
        'beforeCreate',
        'created',
        'beforeMount',
        'mounted',
        'beforeUpdate',
        'updated',
        'beforeDestroy',
        'destroyed',
        'activated',
        'deactivated',
        'errorCaptured',
        'serverPrefetch'
      ]
    async:true
    devtools:true 
      务必在加载 Vue 之后，立即同步设置以下内容Vue.config.devtools = true
      配置是否允许 vue-devtools 检查代码。开发版本默认为 true，生产版本默认为 false。生产版本设为 true 可以启用检查。
    errorHandler:null
      指定组件的渲染和观察期间未捕获错误的处理函数。这个处理函数被调用时，可获取错误信息和 Vue 实例。
      从 2.2.0 起，这个钩子也会捕获组件生命周期钩子里的错误。同样的，当这个钩子是 undefined 时，被捕获的错误会通过 console.error 输出而避免应用崩溃。
      从 2.4.0 起，这个钩子也会捕获 Vue 自定义事件处理函数内部的错误了。
      从 2.6.0 起，这个钩子也会捕获 v-on DOM 监听器内部抛出的错误。另外，如果任何被覆盖的钩子或处理函数返回一个 Promise 链 (例如 async 函数)，则来自其 Promise 链的错误也会被处理。
      Vue.config.errorHandler = function (err, vm, info) {
        // handle error
        // `info` 是 Vue 特定的错误信息，比如错误所在的生命周期钩子
        // 只在 2.2.0+ 可用
      }
    getTagNamespace:function noop (a, b, c) { … }
    ignoredElements:Array(0) []
      须使 Vue 忽略在 Vue 之外的自定义元素 (e.g. 使用了 Web Components APIs)。否则，它会假设你忘记注册全局组件或者拼错了组件名称，从而抛出一个关于 Unknown custom element 的警告。
      Vue.config.ignoredElements = [
        'my-custom-web-component',
        'another-web-component',
        // 用一个 `RegExp` 忽略所有“ion-”开头的元素
        // 仅在 2.5+ 支持
        /^ion-/
      ]
    isReservedAttr:function (a, b, c) { … }
    isReservedTag:function (a, b, c) { … }
    isUnknownElement:function (a, b, c) { … }
    keyCodes:Proxy {}
      给 v-on 自定义键位别名。
      Vue.config.keyCodes = {
        v: 86,
        f1: 112,
        // camelCase 不可用
        mediaPlayPause: 179,
        // 取而代之的是 kebab-case 且用双引号括起来
        "media-play-pause": 179,
        up: [38, 87]
      }
      <input type="text" @keyup.media-play-pause="method">
    mustUseProp:function (a, b, c) { … }
    optionMergeStrategies:
      定义Vue.$options中个别参数的合并策略
      Vue.config.optionMergeStrategies.myOption = function (toVal, fromVal) {// 返回合并后的值}
    parsePlatformTagName:function (_) { … }
    performance:false
      设置为 true 以在浏览器开发工具的性能/时间线面板中启用对组件初始化、编译、渲染和打补丁的性能追踪。只适用于开发模式和支持 performance.mark API 的浏览器上。
    productionTip:true
    silent:false
    warnHandler:null
      为 Vue 的运行时警告赋予一个自定义处理函数。注意这只会在开发者环境下生效，在生产环境下它会被忽略。
      Vue.config.warnHandler = function (msg, vm, trace) {
        // `trace` 是组件的继承关系追踪
      }
   */
  const configDef = {}
  configDef.get = () => config

  //这里劫持了Vue的config属性，使的无法对其进行修改。
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  /**
   * 这里定义了Vue.config是一个对象，包含 Vue 的全局配置
   * 这里可修改的全局配置有：
   * silent
      optionMergeStrategies
      devtools
      errorHandler
      warnHandler
      ignoredElements
      keyCodes
      performance
      productionTip
   */
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 这些工具方法不视作全局API的一部分，除非你已经意识到某些风险，否则不要去依赖他们

  Vue.util = {
    /**
     * 来自于 /src/core/util/debug.js
     * 用过Vue的warnHandler功能应该都知道，这是一个自定义警告处理函数
     * Vue.config.warnHandler = function(msg, vm, trace)
     * 这个方法只是在开发者环境下生效，在生产环境下它会被忽略
     */
    warn,
    extend, // /share/utils 作用就是将源对象的属性混入到目标对象。
    mergeOptions, //作用就是将源对象的属性混入到目标对象。 /core/util/options.js
    defineReactive
  }
  // 这里定义全局属性
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }
  // 这个options和我们上面用来构造实例的options不一样。这个是Vue默认提供的资源（组件指令过滤器）。
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)
  // 定义全局方法
  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
