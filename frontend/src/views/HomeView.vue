<template>
  <div class="home-container">
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
            <li class="menu-item">
              <router-link to="/conversation" class="menu-link" active-class="active">
                <span class="menu-icon">💬</span>
                <span class="menu-text">会话管理</span>
              </router-link>
            </li>
          </ul>
        </nav>
      </aside>
      
      <!-- 主页内容 -->
      <main class="content">
        <div class="welcome-section">
          <h2>欢迎回来，{{ user?.nickname || user?.username || '用户' }}！</h2>
          <p class="welcome-message">这是智能体管理系统的首页。</p>
        </div>
        
        <!-- 智能体列表 -->
        <div class="agents-section">
          <h3>我的智能体</h3>
          <div class="agents-grid">
            <!-- 智能体avatar -->
            <div 
              v-for="agent in agents" 
              :key="agent.id" 
              class="agent-card"
            >
              <div class="avatar-container">
                <img 
                  :src="agent.avatar || 'https://via.placeholder.com/100'" 
                  :alt="agent.name" 
                  class="avatar-img hand"
                  @click="handleAgentChat(agent)"
                />
                <div class="agent-name hand" @click="handleAgentChat(agent)">{{ agent.name }}</div>
              </div>
              <div class="agent-actions">
                <button 
                  class="btn-action btn-update" 
                  @click.stop="handleUpdateAgent(agent)"
                  title="更新智能体"
                >
                  更新
                </button>
                <button 
                  class="btn-action btn-delete" 
                  @click.stop="handleDeleteAgent(agent)"
                  title="删除智能体"
                >
                  删除
                </button>
              </div>
            </div>
            
            <!-- 添加智能体按钮 -->
            <div class="agent-card add-agent" @click="showCreateModal = true">
              <div class="avatar-container">
                <div class="add-icon">+</div>
                <div class="agent-name">添加智能体</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    
    <!-- 创建智能体弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建智能体</h3>
          <button class="modal-close" @click="showCreateModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="agentName">智能体名称</label>
            <input 
              type="text" 
              id="agentName" 
              v-model="newAgentName" 
              placeholder="请输入智能体名称"
              class="form-input"
              @keyup.enter="handleCreateAgent"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateModal = false">取消</button>
          <button class="btn-confirm" @click="handleCreateAgent" :disabled="!newAgentName.trim()">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'HomeView',
  data() {
    return {
      user: null,
      agents: [],
      showCreateModal: false,
      newAgentName: '',
      deletingAgentId: null
    }
  },
  mounted() {
    // 获取用户信息
    this.getUserInfo()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 获取智能体列表
    this.getAgentsList()
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
    },
    
    // 获取智能体列表
    async getAgentsList() {
      // 新增：如果没有token，直接跳转登录
      const token = this.$root.$options.api?.getAccessToken ? this.$root.$options.api.getAccessToken() : (this.$api?.getAccessToken?.() || localStorage.getItem('access_token'))
      if (!token) {
        this.$router.push('/login')
        return
      }
      try {
        const response = await api.agent.getUserAgentList(this.user.id)
        // API返回格式: { agents: [...], pagination: {...} }
        this.agents = response.agents || []
      } catch (error) {
        console.error('获取智能体列表失败:', error)
        this.agents = []
      }
    },
    
    // 处理创建智能体
    handleCreateAgent() {
      if (this.newAgentName.trim()) {
        // 跳转到创建智能体页面
        this.$router.push({
          path: '/agents/creation',
          query: { name: this.newAgentName.trim() }
        })
        
        // 重置表单
        this.newAgentName = ''
        this.showCreateModal = false
      }
    },
    
    // 处理更新智能体
    handleUpdateAgent(agent) {
      // 将智能体数据编码后通过query传递
      this.$router.push({
        path: `/agents/${agent.id}/edit`,
        query: {
          agentData: JSON.stringify(agent)
        }
      })
    },
    
    // 处理删除智能体
    async handleDeleteAgent(agent) {
      if (confirm(`确定要删除智能体"${agent.name}"吗？此操作不可恢复。`)) {
        this.deletingAgentId = agent.id
        try {
          await api.agent.deleteAgent(agent.id)
          // 删除成功后刷新列表
          await this.getAgentsList()
        } catch (error) {
          console.error('删除智能体失败:', error)
          alert('删除智能体失败，请稍后重试')
        } finally {
          this.deletingAgentId = null
        }
      }
    },

    handleAgentChat(agent) {
      this.$router.push({
        path: '/agents',
        query: {
          agent_id: agent.id
        }
      });
    }
  }
}
</script>

<style scoped>
.home-container {
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

/* 欢迎区域样式 */
.welcome-section {
  background-color: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  margin-bottom: 24px;
}

.welcome-section h2 {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 600;
  color: #2d3748;
}

.welcome-message {
  margin: 0;
  font-size: 16px;
  color: #718096;
}

/* 智能体区域样式 */
.agents-section {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.agents-section h3 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
}

/* 智能体网格样式 */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 24px;
  justify-items: center;
}

/* 智能体卡片样式 */
.agent-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background-color: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 150px;
}

.agent-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.agent-card.add-agent {
  cursor: pointer;
  border: 2px dashed #cbd5e0;
}

.agent-card.add-agent:hover {
  border-color: #667eea;
  background-color: #f7fafc;
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 12px;
}

.avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e2e8f0;
  margin-bottom: 8px;
}

.add-agent .avatar-container {
  justify-content: center;
  margin-bottom: 0;
}

.add-icon {
  font-size: 32px;
  color: #a0aec0;
  font-weight: 300;
  margin-bottom: 8px;
}

.agent-name {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
  text-align: center;
  word-break: break-word;
  line-height: 1.4;
}

/* 操作按钮样式 */
.agent-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
}

.btn-action {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-update {
  background-color: #667eea;
  color: white;
}

.btn-update:hover {
  background-color: #5a67d8;
}

.btn-delete {
  background-color: #fc8181;
  color: white;
}

.btn-delete:hover {
  background-color: #f56565;
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #a0aec0;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: #f7fafc;
  color: #4a5568;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #2d3748;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-cancel {
  background-color: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover {
  background-color: #edf2f7;
}

.btn-confirm {
  background-color: #667eea;
  color: white;
}

.btn-confirm:hover {
  background-color: #5a67d8;
}

.btn-confirm:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.6;
}
.hand { cursor:pointer; }
</style>