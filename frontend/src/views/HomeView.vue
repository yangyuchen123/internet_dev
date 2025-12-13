<template>
  <div class="home-container">
    <!-- 导航栏 (保持与知识库页面一致) -->
    <header class="navbar">
      <div class="navbar-brand">
        <div class="logo-icon">🤖</div>
        <h1 class="brand-name">智能体管理系统</h1>
      </div>

      <div class="navbar-user">
        <div class="user-info">
          <!-- 生成用户头像首字母 -->
          <span class="avatar">{{ user?.nickname?.[0] || user?.username?.[0] || 'U' }}</span>
          <span class="username">{{ user?.nickname || user?.username || '用户' }}</span>
        </div>
        <button class="btn-logout" @click="handleLogout" title="退出登录">
          <span class="icon">⏻</span>
        </button>
      </div>
    </header>

    <div class="main-content">
      <!-- 左侧菜单栏 (保持与知识库页面一致) -->
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
        <div class="content-wrapper">
          <!-- 欢迎区域 -->
          <div class="welcome-section">
            <div class="welcome-text">
              <h2>早安，<span class="highlight">{{ user?.nickname || user?.username || '用户' }}</span> 👋</h2>
              <p class="subtitle">准备好开始管理您的智能助手了吗？</p>
            </div>
            <div class="welcome-decoration">✨</div>
          </div>

          <!-- 智能体列表 -->
          <div class="agents-section">
            <div class="section-header">
              <h3>我的智能体</h3>
              <span class="badge">{{ agents.length }} 个活跃中</span>
            </div>
            
            <div class="agents-grid">
              <!-- 添加智能体按钮 (放在第一个，方便操作) -->
              <div class="agent-card add-card" @click="showCreateModal = true">
                <div class="add-content">
                  <div class="add-icon-circle">+</div>
                  <span class="add-text">创建新智能体</span>
                </div>
              </div>

              <!-- 智能体循环 -->
              <div
                v-for="agent in agents"
                :key="agent.id"
                class="agent-card agent-item"
                @click="handleAgentChat(agent)"
              >
                <div class="card-body">
                  <div class="avatar-wrapper">
                    <img
                      :src="agent.avatar || 'https://via.placeholder.com/100'"
                      :alt="agent.name"
                      class="avatar-img"
                    />
                    <div class="status-dot"></div>
                  </div>
                  <h4 class="agent-name" :title="agent.name">{{ agent.name }}</h4>
                  <p class="agent-desc">点击开始对话</p>
                </div>
                
                <div class="card-footer">
                  <button
                    class="btn-action btn-edit"
                    @click.stop="handleUpdateAgent(agent)"
                    title="配置"
                  >
                    ⚙️ 配置
                  </button>
                  <button
                    class="btn-action btn-del"
                    @click.stop="handleDeleteAgent(agent)"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 创建智能体弹窗 -->
    <transition name="modal-fade">
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
                placeholder="给您的助手起个名字..."
                class="form-input"
                @keyup.enter="handleCreateAgent"
                ref="nameInput"
              />
              <p class="form-hint">好的名字有助于识别智能体的功能。</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showCreateModal = false">取消</button>
            <button class="btn-confirm" @click="handleCreateAgent" :disabled="!newAgentName.trim()">立即创建</button>
          </div>
        </div>
      </div>
    </transition>
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
  watch: {
    // 自动聚焦输入框
    showCreateModal(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.nameInput?.focus()
        })
      }
    }
  },
  mounted() {
    this.getUserInfo()
    this.checkLoginStatus()
    this.getAgentsList()
  },
  methods: {
    getUserInfo() {
      this.user = api.auth.getCurrentUser()
    },
    checkLoginStatus() {
      if (!api.auth.isLoggedIn()) {
        this.$router.push('/login')
      }
    },
    async handleLogout() {
      try {
        await api.auth.logout()
      } catch (error) {
        console.error('退出登录失败:', error)
      } finally {
        this.$router.push('/login')
      }
    },
    async getAgentsList() {
      const token = this.$root.$options.api?.getAccessToken ? this.$root.$options.api.getAccessToken() : (this.$api?.getAccessToken?.() || localStorage.getItem('access_token'))
      if (!token) {
        this.$router.push('/login')
        return
      }
      try {
        const response = await api.agent.getUserAgentList(this.user.id)
        this.agents = response.agents || []
      } catch (error) {
        console.error('获取智能体列表失败:', error)
        this.agents = []
      }
    },
    handleCreateAgent() {
      if (this.newAgentName.trim()) {
        this.$router.push({
          path: '/agents/creation',
          query: { name: this.newAgentName.trim() }
        })
        this.newAgentName = ''
        this.showCreateModal = false
      }
    },
    handleUpdateAgent(agent) {
      this.$router.push({
        path: `/agents/${agent.id}/edit`,
        query: {
          agentData: JSON.stringify(agent)
        }
      })
    },
    async handleDeleteAgent(agent) {
      if (confirm(`确定要删除智能体"${agent.name}"吗？此操作不可恢复。`)) {
        this.deletingAgentId = agent.id
        try {
          await api.agent.deleteAgent(agent.id)
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
/* 引入全局变量风格 */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --secondary-color: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --danger-color: #ef4444;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

* { box-sizing: border-box; }

.home-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: var(--font-sans);
  background-color: #f9fafb;
  color: var(--text-primary);
}

/* ================== Navbar (统一风格) ================== */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  height: 70px;
  background-color: #ffffff;
  box-shadow: var(--shadow-sm);
  z-index: 50;
  border-bottom: 1px solid #e5e7eb;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.025em;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  background-color: #e0e7ff;
  color: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.btn-logout {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-logout:hover {
  background-color: #fef2f2;
  color: var(--danger-color);
  border-color: #fecaca;
}

/* ================== Layout & Sidebar (统一风格) ================== */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  padding: 24px 16px;
  flex-shrink: 0;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #4b5563;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
}

.menu-link:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.menu-link.active {
  background-color: #e0e7ff;
  color: var(--primary-color);
  font-weight: 600;
}

/* ================== Main Content Area ================== */
.content {
  flex: 1;
  padding: 40px;
  background-color: #f9fafb;
  overflow-y: auto;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

/* Welcome Section */
.welcome-section {
  background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
  border: 1px solid #e0e7ff;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: var(--shadow-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text h2 {
  font-size: 28px;
  margin: 0 0 8px 0;
  color: #1f2937;
  font-weight: 800;
}

.highlight {
  background: linear-gradient(120deg, #4f46e5 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

.welcome-decoration {
  font-size: 48px;
  opacity: 0.8;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

/* Agents Section */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.section-header .badge {
  background: #dcfce7;
  color: #166534;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* Agents Grid */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

/* Common Card Style */
.agent-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #f3f4f6;
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
  height: 260px; /* 固定高度确保整齐 */
}

.agent-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
  border-color: #e0e7ff;
}

/* Add Agent Card */
.add-card {
  border: 2px dashed #d1d5db;
  background: #f9fafb;
  box-shadow: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-card:hover {
  border-color: var(--primary-color);
  background: #eef2ff;
}

.add-content {
  text-align: center;
  color: #6b7280;
}

.add-icon-circle {
  width: 56px;
  height: 56px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--primary-color);
  margin: 0 auto 12px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s;
}

.add-card:hover .add-icon-circle {
  transform: scale(1.1);
  background: var(--primary-color);
  color: white;
}

.add-text { font-weight: 600; font-size: 15px; }

/* Agent Item Card */
.agent-item {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.card-body {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 0 0 1px #e5e7eb;
}

.status-dot {
  width: 14px;
  height: 14px;
  background-color: #10b981;
  border: 2px solid white;
  border-radius: 50%;
  position: absolute;
  bottom: 5px;
  right: 5px;
}

.agent-name {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-desc {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

/* Card Footer Actions */
.card-footer {
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
  background: #fdfdfd;
  display: flex;
  gap: 8px;
}

.btn-action {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  color: #4b5563;
  background: #f3f4f6;
}
.btn-edit:hover { background: #e5e7eb; color: #111827; }

.btn-del {
  color: #ef4444;
  background: #fef2f2;
  flex: 0 0 40px; /* 小一点的删除按钮 */
}
.btn-del:hover { background: #fee2e2; border-color: #fecaca; }

/* ================== Modern Modal ================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }

.modal-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}
.modal-close:hover { color: #4b5563; }

.modal-body { padding: 24px; }

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  transition: all 0.2s;
  background: #f9fafb;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: white;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-hint { font-size: 12px; color: #9ca3af; margin-top: 8px; }

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  padding: 10px 18px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover { background: #f9fafb; border-color: #d1d5db; }

.btn-confirm {
  padding: 10px 18px;
  border-radius: 8px;
  background: var(--primary-color);
  border: none;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-confirm:hover { background: var(--primary-hover); }
.btn-confirm:disabled { background: #a5b4fc; cursor: not-allowed; }

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.95); }
</style>