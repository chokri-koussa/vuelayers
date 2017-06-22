/**
 * @module components/geom/multi-point
 */
import Geom from './geom.vue'

export default {
  Geom,
  install (Vue) {
    Vue.component(Geom.name, Geom)
  }
}
