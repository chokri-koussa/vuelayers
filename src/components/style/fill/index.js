/**
 * @module components/style/fill
 */
import Style from './style.vue'

export default {
  Style,
  install (Vue) {
    Vue.component(Style.name, Style)
  }
}
