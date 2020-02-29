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
  /**
   * 如果传递了el参数，
   * 那么就使用query函数获取到指定的DOM元素并重新赋值给el变量，
   * 这个元素我们称之为挂载点。
   */
  el = el && query(el)

  /* istanbul ignore if */
  /**
   * 接着是一段if语句块，
   * 检测了挂载点是不是<body>元素或者<html>元素，
   * 如果是的话那么在非生产环境下会打印警告信息，
   * 警告你不要挂载到<body>元素或者<html>元素。
   * 为什么不允许这么做呢？那是因为挂载点的本意是组件挂载的占位，
   * 它将会被组件自身的模板替换掉，
   * 而<body>元素和<html>元素是不能被替换掉的。
   */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  /**
   * 接下来的if语句检测是否包含render选项，即是否包含渲染函数。如果渲染函数存在那么直接调用运行时版$mount函数进行挂载工作（后续专门的篇幅来讲这块）。
   * 如果不存在：使用 template 或 el 选项构建渲染函数。
   */
  if (!options.render) {
    let template = options.template
    if (template) { //如果template选项存在
      if (typeof template === 'string') { //且template的类型是字符串
        if (template.charAt(0) === '#') { //第一个字符是 #，那么会把该字符串作为 css 选择符去选中对应的元素，并把该元素的 innerHTML 作为模板
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) { //第一个字符不是 #，那就用 template 自身的字符串值作为模板,则使用该元素的innerHTML作为模板

        template = template.innerHTML
      } else { //若template既不是字符串又不是元素节点，那么在非生产环境会提示开发者传递的template选项无效
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {//如果template选项不存在，那么使用el元素的outerHTML作为模板内容
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      /**
       * 通过源码定义找到createCompiler的出处:/src/compiler/index.js
       * shouldDecodeNewlines,shouldDecodeNewlinesForHref:
       * 这就会影响Vue的编译器在对模板进行编译后的结果，为了避免这些问题Vue需要知道什么时候要做兼容工作，
       * 如果 shouldDecodeNewlines 为 true，意味着 Vue 在编译模板的时候，要对属性值中的换行符或制表符做兼容处理。
       * 而shouldDecodeNewlinesForHref为true 意味着Vue在编译模板的时候，要对a标签的 href 属性值中的换行符或制表符做兼容处理。
       * options.delimiters & options.comments:两者都是当前Vue实例的$options属性，
       * 并且delimiters(改变纯文本插入符)和comments（设置为true时，会保留且渲染模板中html注释）都是 Vue 提供的选项。
       */
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines, //在我们innerHTML获取内容时，换行符和制表符分别被转换成了&#10和&#9。在IE中，不仅仅是 a 标签的 href 属性值，任何属性值都存在这个问题。
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
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
