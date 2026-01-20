import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/index.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/uploadImage',
      name: 'uploadImage',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/UploadImage.vue'),
    },
    {
      path: '/memoryWall',
      name: 'memoryWall',
      component: () => import('../views/MemoryWall.vue'),
    },
  ],
})

export default router
