import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import http from './common/http.js'

const app = createApp(App)
app.use(ElementPlus)
// Keep the response shape expected by existing extensions without vue-resource.
app.config.globalProperties.$http = http
app.mount('#app')
