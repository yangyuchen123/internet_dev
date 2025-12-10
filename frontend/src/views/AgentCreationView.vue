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
          <div class="form-header">
            <h2>创建智能体</h2>
            <p class="form-subtitle">填写智能体的基本信息，创建属于您的智能体</p>
          </div>

          <form @submit.prevent="handleSubmit" class="agent-form">
            <!-- 智能体名称（只读显示） -->
            <div class="form-group">
              <label class="form-label">智能体名称 <span class="required">*</span></label>
              <input
                type="text"
                v-model="formData.name"
                class="form-input"
                readonly
                disabled
                placeholder="智能体名称"
              />
              <p class="form-hint">此名称已在主页设置</p>
            </div>

            <!-- 描述 -->
            <div class="form-group">
              <label class="form-label">描述 <span class="required">*</span></label>
              <textarea
                v-model="formData.description"
                class="form-textarea"
                rows="3"
                placeholder="请输入智能体的描述信息..."
                required
              ></textarea>
              <p class="form-hint">简要描述智能体的功能和用途</p>
            </div>

            <!-- 系统提示词 -->
            <div class="form-group">
              <label class="form-label">系统提示词 <span class="required">*</span></label>
              <textarea
                v-model="formData.systemPrompt"
                class="form-textarea large"
                rows="6"
                placeholder="请输入系统提示词，用于指导智能体的行为和回答风格..."
                required
              ></textarea>
              <p class="form-hint">系统提示词将指导智能体的行为和回答风格</p>
            </div>

            <!-- 分类 -->
            <div class="form-group">
              <label class="form-label">分类</label>
              <input
                type="text"
                v-model="formData.category"
                class="form-input"
                placeholder="例如：助手、客服、教育等"
              />
              <p class="form-hint">为智能体设置分类标签，便于管理</p>
            </div>

            <!-- 模型 -->
            <div class="form-group">
              <label class="form-label">模型</label>
              <input
                type="text"
                v-model="formData.model"
                class="form-input"
                placeholder="例如：gpt-3.5-turbo、gpt-4等"
              />
              <p class="form-hint">指定智能体使用的AI模型</p>
            </div>

            <!-- 温度和最大Token数 -->
            <div class="form-row">
              <div class="form-group half">
                <label class="form-label">温度 (Temperature)</label>
                <input
                  type="number"
                  v-model.number="formData.temperature"
                  class="form-input"
                  min="0"
                  max="2"
                  step="0.1"
                  placeholder="0.7"
                />
                <p class="form-hint">控制回答的随机性（0-2）</p>
              </div>
              <div class="form-group half">
                <label class="form-label">最大Token数</label>
                <input
                  type="number"
                  v-model.number="formData.maxTokens"
                  class="form-input"
                  min="1"
                  step="1"
                  placeholder="4096"
                />
                <p class="form-hint">单次回答的最大长度</p>
              </div>
            </div>

            <!-- 头像URL（可选） -->
            <div class="form-group">
              <label class="form-label">头像URL</label>
              <input
                type="text"
                v-model="formData.avatar"
                class="form-input"
                placeholder="https://example.com/avatar.jpg（可选）"
              />
              <p class="form-hint">智能体的头像图片链接，留空则使用默认头像</p>
            </div>

            <!-- 是否公开 -->
            <div class="form-group">
              <label class="form-label checkbox-label">
                <input
                  type="checkbox"
                  v-model="formData.isPublic"
                  class="form-checkbox"
                />
                <span>公开智能体</span>
              </label>
              <p class="form-hint">公开的智能体可以被其他用户查看和使用</p>
            </div>

            <!-- 按钮组 -->
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="loading"
              >
                取消
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="loading || !isFormValid"
              >
                <span v-if="loading">创建中...</span>
                <span v-else>创建智能体</span>
              </button>
            </div>

            <!-- 错误提示 -->
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>
          </form>
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
      agentName: '',
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
    // 表单验证
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
    // 获取用户信息
    this.getUserInfo()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 获取URL参数中的智能体名称
    const nameFromQuery = this.$route.query.name || ''
    this.agentName = nameFromQuery
    this.formData.name = nameFromQuery
    
    // 如果没有名称，提示并返回
    if (!nameFromQuery) {
      this.errorMessage = '缺少智能体名称，请返回主页重新创建'
    }
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
    
    // 处理表单提交
    async handleSubmit() {
      // 验证表单
      if (!this.isFormValid) {
        this.errorMessage = '请填写所有必填字段'
        return
      }
      
      // 验证温度范围
      if (this.formData.temperature < 0 || this.formData.temperature > 2) {
        this.errorMessage = '温度值必须在0-2之间'
        return
      }
      
      // 验证最大Token数
      if (this.formData.maxTokens && this.formData.maxTokens < 1) {
        this.errorMessage = '最大Token数必须大于0'
        return
      }
      
      this.loading = true
      this.errorMessage = ''
      
      try {
        // 准备请求数据
        const requestData = {
          name: this.formData.name.trim(),
          description: this.formData.description.trim(),
          systemPrompt: this.formData.systemPrompt.trim(),
          category: this.formData.category.trim() || 'default',
          model: this.formData.model.trim() || 'default-model',
          temperature: this.formData.temperature || 0.7,
          maxTokens: this.formData.maxTokens || 4096,
          avatar: this.formData.avatar.trim() || '',
          isPublic: this.formData.isPublic || false
        }
        
        // 调用创建智能体API
        await api.agent.createAgent(requestData)
        
        // 创建成功，跳转回主页
        this.$router.push('/home').catch(err => {
          // 如果路由跳转失败（比如已经跳转了），忽略错误
          if (err.name !== 'NavigationDuplicated') {
            console.error('跳转失败:', err)
          }
        })
      } catch (error) {
        console.error('创建智能体失败:', error)
        this.errorMessage = error.message || '创建智能体失败，请稍后重试'
      } finally {
        this.loading = false
      }
    },
    
    // 处理取消
    handleCancel() {
      // 确认是否取消
      if (confirm('确定要取消创建吗？未保存的信息将丢失。')) {
        this.$router.push('/home')
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
  max-width: 800px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 32px;
  text-align: center;
}

.form-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #2d3748;
}

.form-subtitle {
  margin: 0;
  font-size: 14px;
  color: #718096;
}

/* 表单样式 */
.agent-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
}

.form-label .required {
  color: #e53e3e;
  margin-left: 4px;
}

.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  color: #2d3748;
  background-color: #fff;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:disabled {
  background-color: #f7fafc;
  color: #718096;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-textarea.large {
  min-height: 150px;
}

.form-hint {
  font-size: 12px;
  color: #718096;
  margin: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}

/* 按钮组 */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-secondary {
  background-color: #edf2f7;
  color: #4a5568;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e2e8f0;
}

/* 错误提示 */
.error-message {
  padding: 12px 16px;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .creation-section {
    padding: 24px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 24px;
  }
  
  .form-group.half {
    flex: 1;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .btn {
    width: 100%;
  }
}
</style>