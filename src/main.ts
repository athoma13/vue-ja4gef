import { GesturePlugin } from '@vueuse/gesture'
import { createApp } from 'vue'
import App from './App.vue'
import './index.css'

const app = createApp(App);
app.use(GesturePlugin);
app.mount('#app')
