import Vue from 'vue'
import Vuex from 'vuex'
import loadjs from 'loadjs'
import fetch from 'unfetch'
import marked from './utils/marked'
import highlight from './utils/highlight'
import {getFilenameByPath} from './utils'
import markedRenderer from './utils/markedRenderer'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    html: '',
    originalConfig: {},
    page: {
      title: null,
      headings: null
    },
    showSidebar: false,
    fetchingFile: true
  },

  mutations: {
    SET_HTML(state, html) {
      state.html = html
    },

    SET_ORIGINAL_CONFIG(state, config) {
      state.originalConfig = config
    },

    SET_PAGE_TITLE(state, title) {
      state.page.title = title
    },

    SET_PAGE_HEADINGS(state, headings) {
      state.page.headings = headings
    },

    TOGGLE_SIDEBAR(state, show) {
      state.showSidebar = typeof show === 'boolean' ? show : !state.showSidebar
    },

    SET_FETCHING(state, fetching) {
      state.fetchingFile = fetching
    }
  },

  actions: {
    async fetchFile({commit, getters, dispatch}, path) {
      commit('TOGGLE_SIDEBAR', false)
      commit('SET_FETCHING', true)
      const file = getFilenameByPath(getters.config.sourcePath, path)
      const [text] = await Promise.all([
        fetch(file).then(res => res.text()),
        dispatch('fetchPrismLanguages')
      ])

      const env = {}
      commit(
        'SET_HTML',
        marked(text, {
          renderer: markedRenderer(env),
          highlight
        })
      )
      commit('SET_PAGE_TITLE', env.title)
      commit('SET_PAGE_HEADINGS', env.headings)
      commit('SET_FETCHING', false)
    },

    fetchPrismLanguages({getters}) {
      const ID = 'prism-languages'

      if (!getters.config.highlight || loadjs.isDefined(ID)) {
        return Promise.resolve()
      }

      return new Promise(resolve => {
        loadjs(
          getters.config.highlight.map(lang => {
            return `https://cdn.jsdelivr.net/npm/prismjs/components/prism-${lang}.min.js`
          }),
          ID,
          {
            success: resolve,
            error(err) {
              console.error('Failed to load', err)
              resolve()
            }
          }
        )
      })
    }
  },

  getters: {
    currentLocalePath({originalConfig, route}) {
      const {locales} = originalConfig

      if (locales) {
        // Is it a locale?
        for (const localePath of Object.keys(locales)) {
          if (localePath !== '/') {
            const RE = new RegExp(`^${localePath}`)
            if (RE.test(route.path)) {
              return localePath
            }
          }
        }
      }

      return '/'
    },

    config({originalConfig}, {currentLocalePath}) {
      const {locales} = originalConfig
      return locales
        ? {
            ...originalConfig,
            ...locales[currentLocalePath]
          }
        : originalConfig
    },

    homePaths({originalConfig}) {
      const localePaths = originalConfig.locales
        ? Object.keys(originalConfig.locales)
        : []
      return [...localePaths, '/']
    }
  }
})

if (process.env.NODE_ENV === 'development') {
  window.store = store
}

export default store