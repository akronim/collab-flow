import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { apiClient } from './http/apiClient'
import './assets/main.css'

const app = createApp(App)

apiClient.injectRouter(router)

const pinia = createPinia()

app.use(pinia)

app.use(router)

app.mount(`#app`)
