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
    //this指向Vue
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    // 测试代码性能的，在这个时候相当于打了一个"标记点"来测试性能。
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // observe方法：/src/core/observer/index.js
    // 如果传入值的_isVue为ture时(即传入的值是Vue实例本身)不会新建observer实例(这里可以暂时理解新建observer实例就是让数据响应式)。
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      //mergeOptions主要分成两块，就是resolveConstructorOptions(vm.constructor)和options，mergeOptions这个函数的功能就是要把这两个合在一起。options是我们通过new Vue(options)实例化传入的
      /**
       * 当前Vue实例不是组件。而是实例化Vue对象时，调用mergeOptions方法。mergeOptions主要调用两个方法，resolveConstructorOptions和mergeOptions。
       * options:{
       *  el: '#app-2',
          data: {
            message: '页面加载于 ' + new Date().toLocaleString()
          }
        }
       */
      //vm.$options 用于当前 Vue 实例的初始化选项。需要在选项中包含自定义属性时会有用处：
      vm.$options = mergeOptions(
        //解析构造函数的options
        resolveConstructorOptions(vm.constructor),
        options || {}, //options是我们通过new Vue(options)实例化传入的
        vm
      )
    }
    /* istanbul ignore else */
    // 第二步： renderProxy
    if (process.env.NODE_ENV !== 'production') {
      //作用域代理，拦截组件内访问其它组件的数据。
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 第三步： vm的生命周期相关变量初始化,建立父子组件关系，在当前实例上添加一些属性和生命周期标识。如：$children、$refs、_isMounted等。
    // initLifeCycle方法用来初始化一些生命周期相关的属性，以及为parent,child等属性赋值
    initLifecycle(vm)
    // 第四步： vm的事件监听初始化,用来存放除(@hook:生命周期钩子名称="绑定的函数")事件的对象。如：$on、$emit等。
    
    initEvents(vm);
    // 第五步:用于初始化$slots、$attrs、$listeners
    // initRender函数主要是为我们的组件实例，初始化一些渲染属性，比如$slots和$createElement等。
    initRender(vm)
    callHook(vm, 'beforeCreate');
    /**
     * 第六步:初始化inject，一般用于更深层次的组件通信，相当于加强版的props。用于组件库开发较多。
     * 只要在上一层级的声明的provide，那么下一层级无论多深都能够通过inject来访问到provide的数据。这么做也是有明显的缺点：在任意层级都能访问，导致数据追踪比较困难，不知道是哪一个层级声明了这个或者不知道哪一层级或若干个层级使用。
     */
    initInjections(vm) // resolve injections before data/props
    // 第七步： vm的状态初始化，prop/data/computed/method/watch都在这里完成初始化，因此也是Vue实例create的关键。
    initState(vm)
    // 第八步：初始化provide
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    // 第六步：render & mount
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

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
//功能应该是解析构造函数的options
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // Ctor是基础Vue构造器
  let options = Ctor.options
  //使用Ctor.super判断是否为Vue的子类
  if (Ctor.super) {
    //根类的options
    /**
     * 首先递归调用resolveConstructorOptions方法，返回"父类"上的options并赋值给superOptions变量。然后把"自身"的options赋值给cachedSuperOptions变量。
     * 然后比较这两个变量的值,当这两个变量值不等时，说明"父类"的options改变过了。例如执行了Vue.mixin方法，这时候就需要把"自身"的superOptions属性替换成最新的。然后检查是否"自身"d的options是否发生变化。resolveModifiedOptions的功能就是这个。
     */
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions

    //当为Vue混入一些options时，superOptions会发生变化，此时于之前子类中存储的cachedSuperOptions已经不等，所以下面的操作主要就是更新sub.superOptions
    
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
  /**
   * Super.options:
   * _base:function Vue (options) { … }
    components:Object {KeepAlive: Object, Transition: Object, TransitionGroup: Object, …}
    directives:Object {model: Object, show: Object}
    filters:
   */
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
