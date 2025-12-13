<template>
  <div class="app-container">
    <!-- 1. 全局顶部导航栏 -->
    <header class="navbar">
      <div class="navbar-brand">
        <div class="logo-icon">🤖</div>
        <h1 class="brand-name">智能体管理系统</h1>
      </div>
      
      <div class="navbar-user">
        <div class="user-info">
          <span class="avatar">{{ user?.nickname?.[0] || user?.username?.[0] || 'U' }}</span>
          <span class="username">{{ user?.nickname || user?.username || '用户' }}</span>
        </div>
        <button class="btn-logout" @click="handleLogout" title="退出登录">
          <span class="icon">⏻</span>
        </button>
      </div>
    </header>
    
    <div class="main-layout">
      <!-- 2. 左侧侧边栏 -->
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
      
      <!-- 3. 智能体更新页面内容 -->
      <main class="content">
        <div class="content-wrapper">
          <div class="edit-card">
            <div class="card-header">
              <div class="header-icon-bg">✏️</div>
              <div class="header-text">
                <h2>配置智能体</h2>
                <p class="subtitle">调整智能体的行为、人设及模型参数</p>
              </div>
            </div>

            <form @submit.prevent="handleSubmit" class="agent-form">
              <!-- 第一部分：基本信息 -->
              <div class="form-section">
                <h3 class="section-title">基本信息</h3>
                
                <div class="form-group">
                  <label class="form-label">智能体名称 <span class="required">*</span></label>
                  <input
                    type="text"
                    v-model="formData.name"
                    class="form-input"
                    placeholder="给您的助手起个名字"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">描述 <span class="required">*</span></label>
                  <textarea
                    v-model="formData.description"
                    class="form-textarea"
                    rows="2"
                    placeholder="简要描述它的功能..."
                    required
                  ></textarea>
                </div>
                
                 <div class="form-row">
                  <div class="form-group half">
                    <label class="form-label">分类</label>
                    <input
                      type="text"
                      v-model="formData.category"
                      class="form-input"
                      placeholder="例如：客服"
                    />
                  </div>
                   <div class="form-group half">
                    <label class="form-label">头像 URL</label>
                    <input
                      type="text"
                      v-model="formData.avatar"
                      class="form-input"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <!-- 第二部分：核心设定 -->
              <div class="form-section">
                <h3 class="section-title">核心设定</h3>
                <div class="form-group">
                  <label class="form-label">系统提示词 (System Prompt) <span class="required">*</span></label>
                  <div class="textarea-wrapper">
                    <textarea
                      v-model="formData.systemPrompt"
                      class="form-textarea large"
                      rows="6"
                      placeholder="你是谁？你的职责是什么？请详细描述..."
                      required
                    ></textarea>
                    <div class="prompt-tip">💡 提示词决定了智能体的人设和回复风格。</div>
                  </div>
                </div>
              </div>

              <!-- 第三部分：模型参数 -->
              <div class="form-section">
                <h3 class="section-title">模型参数</h3>
                
                <div class="form-group">
                  <label class="form-label">模型选择</label>
                  <div class="select-wrapper">
                    <input
                      type="text"
                      v-model="formData.model"
                      class="form-input"
                      placeholder="默认模型 (例如: gpt-3.5-turbo)"
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group half">
                    <label class="form-label">
                      随机性 (Temperature): {{ formData.temperature }}
                    </label>
                    <div class="range-container">
                      <input
                        type="range"
                        v-model.number="formData.temperature"
                        class="form-range"
                        min="0"
                        max="2"
                        step="0.1"
                      />
                      <div class="range-labels">
                        <span>0 (精确)</span>
                        <span>2 (创造性)</span>
                      </div>
                    </div>
                  </div>
                  <div class="form-group half">
                    <label class="form-label">最大 Token 数</label>
                    <input
                      type="number"
                      v-model.number="formData.maxTokens"
                      class="form-input"
                      min="1"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              <!-- 第四部分：可见性 (Toggle 开关) -->
              <div class="form-section last">
                <div class="toggle-group">
                  <div class="toggle-label">
                    <span class="main-text">公开智能体</span>
                    <span class="sub-text">开启后，其他用户可以在市场中看到此智能体</span>
                  </div>
                  <label class="switch">
                    <input type="checkbox" v-model="formData.isPublic">
                    <span class="slider round"></span>
                  </label>
                </div>
              </div>

              <!-- 底部按钮组 -->
              <div class="form-actions-sticky">
                <button
                  type="button"
                  class="btn-cancel"
                  @click="handleCancel"
                  :disabled="loading"
                >
                  取消
                </button>
                <button
                  type="submit"
                  class="btn-submit"
                  :disabled="loading || !isFormValid"
                >
                  <span v-if="loading" class="spinner-sm"></span>
                  <span v-else>保存配置</span>
                </button>
              </div>

              <!-- 错误提示 -->
              <transition name="fade">
                <div v-if="errorMessage" class="error-banner">
                  ⚠️ {{ errorMessage }}
                </div>
              </transition>
            </form>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
// Script 逻辑保持不变
import api from '../utils/api.js'

export default {
  name: 'AgentEditView',
  data() {
    return {
      user: null,
      agentId: null,
      loading: false,
      errorMessage: '',
      formData: {
        name: '',
        description: '',
        systemPrompt: '',
        category: '',
        model: '',
        temperature: 0.7,
        maxTokens: 4096,
        avatar: '',
        isPublic: false
      }
    }
  },
  computed: {
    isFormValid() {
      return (
        this.formData.name &&
        this.formData.name.trim() !== '' &&
        this.formData.description &&
        this.formData.description.trim() !== '' &&
        this.formData.systemPrompt &&
        this.formData.systemPrompt.trim() !== ''
      )
    }
  },
  mounted() {
    this.getUserInfo()
    this.checkLoginStatus()
    this.agentId = this.$route.params.id
    const agentDataStr = this.$route.query.agentData
    
    if (!this.agentId) {
      this.errorMessage = '缺少智能体ID，请返回主页重新选择'
      return
    }
    
    if (agentDataStr) {
      try {
        const agentData = JSON.parse(agentDataStr)
        this.formData = {
          name: agentData.name || '',
          description: agentData.description || '',
          systemPrompt: agentData.systemPrompt || '',
          category: agentData.category || '',
          model: agentData.model || '',
          temperature: agentData.temperature !== undefined ? agentData.temperature : 0.7,
          maxTokens: agentData.maxTokens !== undefined ? agentData.maxTokens : 4096,
          avatar: agentData.avatar || '',
          isPublic: agentData.isPublic !== undefined ? agentData.isPublic : false
        }
      } catch (error) {
        console.error('解析智能体数据失败:', error)
        this.errorMessage = '无法加载智能体数据'
      }
    }
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
        console.error(error)
      } finally {
        this.$router.push('/login')
      }
    },
    async handleSubmit() {
      if (!this.isFormValid) return
      
      this.loading = true
      this.errorMessage = ''
      
      try {
        const requestData = {
          name: this.formData.name.trim(),
          description: this.formData.description.trim(),
          systemPrompt: this.formData.systemPrompt.trim(),
          category: this.formData.category.trim() || 'default',
          model: this.formData.model.trim() || 'default-model',
          temperature: this.formData.temperature,
          maxTokens: this.formData.maxTokens,
          avatar: this.formData.avatar.trim() || '',
          isPublic: this.formData.isPublic
        }
        
        await api.agent.updateAgent(this.agentId, requestData)
        this.$router.push('/home')
      } catch (error) {
        console.error(error)
        this.errorMessage = error.message || '更新失败'
      } finally {
        this.loading = false
      }
    },
    handleCancel() {
      if (confirm('确定要取消更新吗？未保存的修改将丢失。')) {
        this.$router.push('/home')
      }
    }
  }
}
</script>

<style scoped>
/* ================== CSS 变量 (对比度优化版) ================== */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --bg-color: #f3f4f6; /* 略微加深背景色，突出白色卡片 */
  --white: #ffffff;
  
  /* 字体颜色加深 */
  --text-main: #111827; /* 纯黑偏蓝 */
  --text-sub: #4b5563; /* 深灰色，不再是浅灰 */
  
  /* 边框颜色加深 (关键修复点) */
  --border-color: #d1d5db; /* 之前是 #e5e7eb (太浅)，改为 slate-300 */
  --input-border: #9ca3af; /* 输入框边框加深至 slate-400，确保可见 */
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

* { box-sizing: border-box; }

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: var(--font-sans);
  background-color: var(--bg-color);
  color: var(--text-main);
}

/* ================== Navbar ================== */
.navbar {
  display: flex; justify-content: space-between; align-items: center; padding: 0 32px;
  height: 70px; background-color: var(--white); box-shadow: var(--shadow-sm);
  z-index: 50; border-bottom: 1px solid var(--border-color); flex-shrink: 0;
}
.navbar-brand { display: flex; align-items: center; gap: 12px; }
.logo-icon {
  width: 40px; height: 40px; background: var(--primary-color); color: white;
  border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.brand-name { font-size: 20px; font-weight: 700; color: var(--text-main); margin: 0; }
.navbar-user { display: flex; align-items: center; gap: 20px; }
.user-info { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 32px; height: 32px; background-color: #e0e7ff; color: var(--primary-color);
  border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600;
}
.username { font-size: 14px; font-weight: 500; color: var(--text-main); }
.btn-logout {
  width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border-color);
  background: white; color: var(--text-sub); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.btn-logout:hover { background-color: #fef2f2; color: #ef4444; border-color: #fecaca; }

/* ================== Layout & Sidebar ================== */
.main-layout { display: flex; flex: 1; overflow: hidden; }
.sidebar {
  width: 240px; background-color: var(--white); border-right: 1px solid var(--border-color);
  padding: 24px 16px; flex-shrink: 0;
}
.menu-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.menu-link {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  text-decoration: none; color: #4b5563; font-size: 15px; font-weight: 500;
  border-radius: 8px; transition: all 0.2s;
}
.menu-link:hover { background-color: #f3f4f6; color: var(--text-main); }
.menu-link.active { background-color: #e0e7ff; color: var(--primary-color); font-weight: 600; }

/* ================== Main Content ================== */
.content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-color);
  padding: 40px;
}

.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

/* Edit Card */
.edit-card {
  background: var(--white);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.card-header {
  padding: 32px 32px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
}

.header-icon-bg {
  width: 48px; height: 48px; background: #e0e7ff; color: var(--primary-color);
  border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.header-text h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-main); }
.subtitle { margin: 4px 0 0; font-size: 14px; color: var(--text-sub); }

/* Form Layout */
.agent-form {
  padding: 32px;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px dashed var(--border-color);
}
.form-section.last { border-bottom: none; margin-bottom: 16px; }

.section-title {
  font-size: 16px;
  font-weight: 700; /* 加粗 */
  color: var(--text-main);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}
.section-title::before {
  content: ''; display: block; width: 4px; height: 16px;
  background: var(--primary-color); border-radius: 2px; margin-right: 8px;
}

.form-group { margin-bottom: 20px; }
.form-row { display: flex; gap: 20px; }
.form-group.half { flex: 1; }

.form-label {
  display: block; font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 8px;
}
.required { color: #ef4444; margin-left: 2px; }

/* Inputs (加深边框，增强可见性) */
.form-input, .form-textarea {
  width: 100%; 
  padding: 10px 12px; 
  /* 强制设置明显的边框颜色 */
  border: 1px solid #9ca3af; 
  border-radius: 8px; 
  font-size: 14px; 
  color: #111827;
  background: #ffffff; 
  transition: all 0.2s;
}

/* 占位符颜色加深，防止看不清 */
.form-input::placeholder, .form-textarea::placeholder {
  color: #6b7280; 
}

.form-input:focus, .form-textarea:focus {
  outline: none; 
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-textarea { resize: vertical; line-height: 1.6; }
.prompt-tip { 
  font-size: 13px; color: #4f46e5; margin-top: 8px; 
  background: #eef2ff; padding: 6px 10px; border-radius: 6px; 
  display: inline-block; font-weight: 500;
}

/* Range Slider */
.range-container { padding: 0 4px; }
.form-range { width: 100%; cursor: pointer; accent-color: var(--primary-color); }
.range-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-sub); margin-top: 4px; font-weight: 500; }

/* Toggle Switch (美化 Checkbox) */
.toggle-group {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px; background: #f8fafc; border-radius: 12px;
  border: 1px solid var(--border-color); /* 增加外框 */
}
.toggle-label { display: flex; flex-direction: column; }
.main-text { font-size: 14px; font-weight: 600; color: var(--text-main); }
.sub-text { font-size: 13px; color: var(--text-sub); margin-top: 4px; }

.switch { position: relative; display: inline-block; width: 48px; height: 26px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
  background-color: #cbd5e1; transition: .4s; border-radius: 24px;
}
.slider:before {
  position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px;
  background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
input:checked + .slider { background-color: var(--primary-color); }
input:checked + .slider:before { transform: translateX(22px); }

/* Actions */
.form-actions-sticky {
  display: flex; justify-content: flex-end; gap: 12px;
  padding-top: 24px; border-top: 1px solid var(--border-color);
}

/* 取消按钮增强边框 */
.btn-cancel {
  padding: 10px 24px; 
  border-radius: 8px; 
  background: white;
  border: 1px solid #9ca3af; /* 明显的边框 */
  color: #374151; 
  font-weight: 600; 
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover { background: #f3f4f6; border-color: #6b7280; }

.btn-submit {
  padding: 10px 32px; border-radius: 8px; background: var(--primary-color);
  border: none; color: white; font-weight: 600; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);
}
.btn-submit:hover:not(:disabled) {
  background: var(--primary-hover); transform: translateY(-1px);
  box-shadow: 0 6px 10px -1px rgba(79, 70, 229, 0.4);
}
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.error-banner {
  margin-top: 16px; padding: 12px; background: #fef2f2; color: #b91c1c;
  border-radius: 8px; border: 1px solid #fecaca; font-size: 14px; text-align: center;
}

.spinner-sm {
  display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .content { padding: 20px; }
  .form-row { flex-direction: column; gap: 20px; }
  .navbar { padding: 0 16px; }
}
</style>