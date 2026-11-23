import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router'
import './app/styles/reset.css'
import './app/styles/tokens.css'
import './app/styles/vendor.css'
import './app/styles/utilities.css'

const app = createApp(App)

app.config.errorHandler = (error, _instance, info) => {
  console.error('[app] 未捕获错误', info, error)
}

app.use(router)
app.mount('#app')
