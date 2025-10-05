/* Import (main) styles. */
import './assets/main.css'

/* Import modules. */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

/* Initialize application. */
const app = createApp(App)

/* Add plugins. */
app.use(createPinia())
app.use(router)

/* Mount application. */
app.mount('#app')
