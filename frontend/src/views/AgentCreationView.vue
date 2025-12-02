<template>
  <div class="agent-creation-container">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="navbar-brand">
        <h1 class="brand-name">智能体管理系统</h1>
      </div>
      
      <div class="navbar-user">
        <div class="user-info">
          <span class="username">{{ user?.nickname || user?.username || '用户' }}</span>
        </div>
        <button class="btn-logout" @click="handleLogout">
          <span>退出登录</span>
        </button>
      </div>
    </header>
    
    <div class="main-content">
      <!-- 左侧菜单栏 -->
      <aside class="sidebar">
        <nav class="menu">
          <ul class="menu-list">
            <li class="menu-item">
              <router-link to="/home" class="menu-link" active-class="active">
                <span class="menu-icon">🏠</span>
                <span class="menu-text">主页</span>
              </router-link>
            </li>
            <li class="menu-item">
              <router-link to="/plugins" class="menu-link" active-class="active">
                <span class="menu-icon">🔌</span>
                <span class="menu-text">插件</span>
              </router-link>
            </li>
            <li class="menu-item">
              <router-link to="/workflow" class="menu-link" active-class="active">
                <span class="menu-icon">🔄</span>
                <span class="menu-text">工作流</span>
              </router-link>
            </li>
            <li class="menu-item">
              <router-link to="/knowledge" class="menu-link" active-class="active">
                <span class="menu-icon">📚</span>
                <span class="menu-text">知识库</span>
              </router-link>
            </li>
          </ul>
        </nav>
      </aside>
      
      <!-- 智能体创建页面内容 -->
      <main class="content">
        <div class="creation-section">
          <h2>创建智能体</h2>
          <p class="creation-message">智能体创建页面正在开发中...</p>
          <p v-if="agentName" class="agent-name-info">智能体名称：{{ agentName }}</p>
          <button class="btn-back" @click="$router.push('/home')">返回主页</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'AgentCreationView',
  data() {
    return {
      user: null,
      agentName: ''
    }
  },
  mounted() {
    // 获取用户信息
    this.getUserInfo()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 获取URL参数中的智能体名称
    this.agentName = this.$route.query.name || ''
  },
  methods: {
    // 获取用户信息
    getUserInfo() {
      this.user = api.auth.getCurrentUser()
    },
    
    // 检查登录状态
    checkLoginStatus() {
      if (!api.auth.isLoggedIn()) {
        // 没有登录，跳转到登录页
        this.$router.push('/login')
      }
    },
    
    // 处理退出登录
    async handleLogout() {
      try {
        // 使用API工具调用退出登录接口
        await api.auth.logout()
      } catch (error) {
        console.error('退出登录失败:', error)
      } finally {
        // 无论如何都跳转到登录页
        this.$router.push('/login')
      }
    }
  }
}
</script>

<style scoped>
.agent-creation-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Arial', sans-serif;
}

/* 导航栏样式 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.navbar-brand .brand-name {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info .username {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-logout:hover {
  background-color: #5a67d8;
}

/* 主内容区样式 */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧菜单栏样式 */
.sidebar {
  width: 200px;
  background-color: #f7fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

/* 菜单样式 */
.menu {
  padding: 16px 0;
  flex: 1;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  margin-bottom: 4px;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #4a5568;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border-radius: 0 6px 6px 0;
}

.menu-link:hover {
  background-color: #edf2f7;
  color: #2d3748;
}

.menu-link.active {
  background-color: #667eea;
  color: white;
}

.menu-icon {
  font-size: 18px;
}

.menu-text {
  flex: 1;
}

/* 内容区样式 */
.content {
  flex: 1;
  padding: 24px;
  background-color: #f8fafc;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 创建智能体区域样式 */
.creation-section {
  background-color: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.creation-section h2 {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 600;
  color: #2d3748;
}

.creation-message {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #718096;
}

.agent-name-info {
  margin: 0 0 32px 0;
  font-size: 18px;
  color: #667eea;
  font-weight: 500;
}

.btn-back {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background-color: #667eea;
  color: white;
}

.btn-back:hover {
  background-color: #5a67d8;
}
</style>