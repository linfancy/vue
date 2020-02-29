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
      设置为 false 以阻止 vue 在启动时生成生产提示。
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
  // // 绑定全局API——Vue.set，Vue.delete，Vue.nextTick
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  /**
   * 随着组件的细化，就会遇到多组件状态共享的情况， Vuex当然可以解决这类问题，不过就像 Vuex官方文档所说的，如果应用不够大，为避免代码繁琐冗余，最好不要使用它
   * 让一个对象可响应。Vue 内部会用它来处理 data 函数返回的对象。
   * 返回的对象可以直接用于渲染函数和计算属性内，并且会在发生改变时触发相应的更新。也可以作为最小化的跨组件状态存储器，用于简单的场景：
   * observable()方法，用于设置监控属性，这样就可以监控viewModule中的属性值的变化，从而就可以动态的改变某个元素中的值，监控属性的类型不变量而是一个函数，通过返回一个函数给viewModule对象中的属性，从而来监控该属性。
   */
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }
  // ????????
  // 这个options和我们上面用来构造实例的options不一样。这个是Vue默认提供的资源（组件指令过滤器）。
  Vue.options = Object.create(null)
  /** 
  * const ASSET_TYPES = [
    'component',
    'directive',
    'filter'
  ]
  */

  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  /**
    * ?????????
    * 为什么要定义一个_base=Vue
    */
  Vue.options._base = Vue

  /** 
  * builtInComponents:keep-alive
  */
  extend(Vue.options.components, builtInComponents)
  // 定义全局方法
  
  /** Vue.use
    * 这个方法定义了Vue.use的使用，看懂了这个对我们之后直接写Vue插件很有帮助哦~这个方法为Vue.use定义了两种使用方法。第一种就是你写的插件（plugin参数）是一个对象，然后Vue.use会找到这个对象中的install方法作为入口调用，第二种就是你传来的参数就是一个函数，然后直接执行这个函数。当install方法被同一个插件多次调用，插件将只会被安装一次。
    * Vue.use(VueRouter)
  */
  initUse(Vue)
  /** Vue.mixin
    * 这个方法将你传来的参数对象和vue实例的选项实行合并策略。
    * 全局注册一个混入，影响注册之后所有创建的每个 Vue 实例。插件作者可以使用混入，向组件注入自定义的行为。不推荐在应用代码中使用。
    * Vue.mixin = function (mixin: Object) {}
    * 使用 mergeOptions 进行合并
  */
  initMixin(Vue)
  // Vue.cid = 0
  // Vue.extend = function (extendOptions: Object): Function {}
  initExtend(Vue)
  // Vue.component =
  // Vue.directive =
  // Vue.filter = function (
    // id: string,
    // definition: Function | Object
    // ): Function | Object | void {}
  initAssetRegisters(Vue)
}
