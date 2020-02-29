/*!
 * Vue.js v2.6.10
 * (c) 2014-2019 Evan You
 * Released under the MIT License.
 */
Vue.config.performance = true;

Vue.component('modal', {
  template: '#modal-template'
});

var Profile = Vue.extend({
  template: '<p>{{firstName}} {{lastName}} aka {{alias}}</p>'
})
Vue.mixin({ data: function () {
 return {
   firstName: 'Walter',
   lastName: 'White',
   alias: 'Heisenberg',
 }
}})
new Profile().$mount('#app1');

// start app
new Vue({
  el: '#app',
  performance: true,
  data: {
    showModal: false
  }
})
