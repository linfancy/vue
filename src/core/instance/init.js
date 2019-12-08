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
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 如果是Vue的实例，则不需要被observe
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      //mergeOptions主要分成两块，就是resolveConstructorOptions(vm.constructor)和options，mergeOptions这个函数的功能就是要把这两个合在一起。options是我们通过new Vue(options)实例化传入的
      //vm.$options 用于当前 Vue 实例的初始化选项。需要在选项中包含自定义属性时会有用处：
      vm.$options = mergeOptions(
        //解析构造函数的options
        resolveConstructorOptions(vm.constructor),
        options || {},
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
    initLifecycle(vm)
    // 第四步： vm的事件监听初始化,用来存放除(@hook:生命周期钩子名称="绑定的函数")事件的对象。如：$on、$emit等。
    initEvents(vm);
    // 第五步:用于初始化$slots、$attrs、$listeners
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
  let options = Ctor.options
  //使用Ctor.super判断是否为Vue的子类
  if (Ctor.super) {
    //根类的options
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
