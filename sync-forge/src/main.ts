import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

import { authPlugin } from './plugins/auth'
import { useAuthStore } from './stores'

const app = createApp(App)

const pinia = createPinia()

pinia.use(authPlugin)

app.use(pinia)

useAuthStore(pinia)

app.use(router)

app.mount('#app')