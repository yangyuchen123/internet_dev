import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'
import AgentsView from '../views/AgentsView.vue'
import AgentUpdateView from '../views/AgentUpdateView.vue'

const routes = [
  {
    path: '/',
    redirect: '/login' // 默认重定向到登录页
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: {
      requiresAuth: false // 不需要登录即可访问
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
    meta: {
      requiresAuth: false // 不需要登录即可访问
    }
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeView,
    meta: {
      requiresAuth: true // 需要登录才能访问
    }
  },
  {
    path: '/agents',
    name: 'Agents',
    component: AgentsView,
    meta: {
      requiresAuth: true // 需要登录才能访问
    }
  },
  {
    path: '/agent/update/:id',
    name: 'AgentUpdate',
    component: AgentUpdateView,
    meta: {
      requiresAuth: true // 需要登录才能访问
    }
  },
  {
    // 捕获所有未匹配的路由
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫，检查是否需要登录
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('access_token') !== null
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  // 如果页面需要登录且用户未登录，则重定向到登录页
  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } 
  // 如果用户已登录且尝试访问登录页或注册页，则重定向到首页
  else if (isAuthenticated && (to.name === 'Login' || to.name === 'Register')) {
    next('/home')
  }
  // 其他情况正常访问
  else {
    next()
  }
})

export default router