<template>
  <div class="agent-edit-container">
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
      
      <!-- 智能体更新页面内容 -->
      <main class="content">
        <div class="edit-section">
          <div class="form-header">
            <h2>更新智能体</h2>
            <p class="form-subtitle">修改智能体的基本信息</p>
          </div>

          <form @submit.prevent="handleSubmit" class="agent-form">
            <!-- 智能体名称 -->
            <div class="form-group">
              <label class="form-label">智能体名称 <span class="required">*</span></label>
              <input
                type="text"
                v-model="formData.name"
                class="form-input"
                placeholder="请输入智能体名称"
                required
              />
              <p class="form-hint">智能体的显示名称</p>
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

            <!-- 插件关联管理 -->
            <div class="form-group plugin-associations-section">
              <label class="form-label">插件关联</label>
              <div class="plugin-associations">
                <div class="associations-header">
                  <button
                    type="button"
                    class="btn-add-plugin"
                    @click="showPluginSelectModal = true"
                  >
                    + 添加插件
                  </button>
                </div>
                
                <div v-if="pluginAssociations.length === 0" class="empty-associations">
                  <p>暂无关联的插件</p>
                </div>
                
                <div v-else class="associations-list">
                  <div
                    v-for="assoc in pluginAssociations"
                    :key="assoc.id"
                    class="association-item"
                  >
                    <div class="association-info">
                      <span class="plugin-name">{{ assoc.plugin_name }}</span>
                      <div class="association-controls">
                        <label class="toggle-label">
                          <input
                            type="checkbox"
                            :checked="assoc.is_enabled === 1"
                            @change="handleTogglePluginAssociation(assoc)"
                          />
                          启用
                        </label>
                        <div class="priority-input">
                          <label>优先级:</label>
                          <input
                            type="number"
                            :value="assoc.priority"
                            @blur="handleUpdatePluginPriority(assoc, $event)"
                            min="0"
                            class="priority-field"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="btn-remove-association"
                      @click="handleRemovePluginAssociation(assoc)"
                      title="移除关联"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
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
                <span v-if="loading">更新中...</span>
                <span v-else>更新智能体</span>
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

    <!-- 插件选择弹窗 -->
    <div v-if="showPluginSelectModal" class="modal-overlay" @click.self="showPluginSelectModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>选择插件</h3>
          <button class="modal-close" @click="showPluginSelectModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="loadingPlugins" class="loading-state">
            <p>加载中...</p>
          </div>
          <div v-else-if="availablePlugins.length === 0" class="empty-state">
            <p>没有可用的插件</p>
          </div>
          <div v-else class="plugin-select-list">
            <div
              v-for="plugin in availablePlugins"
              :key="plugin.id"
              class="plugin-select-item"
              :class="{ disabled: isPluginAssociated(plugin.id) }"
              @click="!isPluginAssociated(plugin.id) && selectPluginForAssociation(plugin)"
            >
              <div class="plugin-select-info">
                <span class="plugin-select-name">{{ plugin.name }}</span>
                <span v-if="isPluginAssociated(plugin.id)" class="already-associated">已关联</span>
              </div>
              <p class="plugin-select-description">{{ plugin.description || '无描述' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 关联配置弹窗 -->
    <div v-if="showPluginConfigModal" class="modal-overlay" @click.self="showPluginConfigModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>配置关联</h3>
          <button class="modal-close" @click="showPluginConfigModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>插件:</label>
            <span class="config-value">{{ selectedPluginForAssociation?.name }}</span>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="pluginAssociationConfig.isEnabled"
              />
              启用
            </label>
          </div>
          <div class="form-group">
            <label for="pluginPriority">优先级:</label>
            <input
              type="number"
              id="pluginPriority"
              v-model.number="pluginAssociationConfig.priority"
              min="0"
              class="form-input"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showPluginConfigModal = false">取消</button>
          <button
            class="btn-confirm"
            @click="handleCreatePluginAssociation"
            :disabled="creatingPluginAssociation"
          >
            {{ creatingPluginAssociation ? '创建中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'AgentEditView',
  data() {
    return {
      user: null,
      agentId: null,
      loading: false,
      errorMessage: '',
      pluginAssociations: [],
      availablePlugins: [],
      loadingPlugins: false,
      showPluginSelectModal: false,
      showPluginConfigModal: false,
      selectedPluginForAssociation: null,
      pluginAssociationConfig: {
        isEnabled: true,
        priority: 0
      },
      creatingPluginAssociation: false,
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
    
    // 从路由参数获取智能体ID和数据
    this.agentId = this.$route.params.id
    const agentDataStr = this.$route.query.agentData
    
    if (!this.agentId) {
      this.errorMessage = '缺少智能体ID，请返回主页重新选择'
      return
    }
    
    if (agentDataStr) {
      try {
        const agentData = JSON.parse(agentDataStr)
        // 填充表单数据
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
        this.errorMessage = '无法加载智能体数据，请返回主页重新选择'
      }
    } else {
      this.errorMessage = '缺少智能体数据，请返回主页重新选择'
    }
    
    // 加载插件关联列表
    if (this.agentId) {
      this.loadPluginAssociations()
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
        
        // 调用更新智能体API
        await api.agent.updateAgent(this.agentId, requestData)
        
        // 更新成功，跳转到主页
        this.$router.push('/home')
      } catch (error) {
        console.error('更新智能体失败:', error)
        this.errorMessage = error.message || '更新智能体失败，请稍后重试'
      } finally {
        this.loading = false
      }
    },
    
    // 处理取消
    handleCancel() {
      // 确认是否取消
      if (confirm('确定要取消更新吗？未保存的修改将丢失。')) {
        this.$router.push('/home')
      }
    },
    
    // 加载插件关联列表
    async loadPluginAssociations() {
      if (!this.agentId) return
      
      try {
        const response = await api.plugin.getAgentPlugins(this.agentId)
        this.pluginAssociations = response.associations || []
      } catch (error) {
        console.error('获取插件关联列表失败:', error)
        this.pluginAssociations = []
      }
    },
    
    // 加载可用插件列表
    async loadAvailablePlugins() {
      this.loadingPlugins = true
      try {
        const response = await api.plugin.getPluginList({ page: 1, limit: 100 })
        this.availablePlugins = response.plugins || []
      } catch (error) {
        console.error('获取插件列表失败:', error)
        this.availablePlugins = []
      } finally {
        this.loadingPlugins = false
      }
    },
    
    // 检查插件是否已关联
    isPluginAssociated(pluginId) {
      return this.pluginAssociations.some(assoc => assoc.plugin_id === pluginId)
    },
    
    // 选择插件进行关联
    selectPluginForAssociation(plugin) {
      this.selectedPluginForAssociation = plugin
      this.pluginAssociationConfig = {
        isEnabled: true,
        priority: 0
      }
      this.showPluginSelectModal = false
      this.showPluginConfigModal = true
    },
    
    // 创建插件关联
    async handleCreatePluginAssociation() {
      if (!this.agentId || !this.selectedPluginForAssociation) {
        return
      }
      
      this.creatingPluginAssociation = true
      try {
        await api.plugin.createAgentPlugin(
          this.agentId,
          this.selectedPluginForAssociation.id,
          this.pluginAssociationConfig.isEnabled,
          this.pluginAssociationConfig.priority
        )
        
        this.showPluginConfigModal = false
        this.selectedPluginForAssociation = null
        await this.loadPluginAssociations()
      } catch (error) {
        console.error('创建关联失败:', error)
        alert('创建关联失败，请稍后重试')
      } finally {
        this.creatingPluginAssociation = false
      }
    },
    
    // 切换插件关联启用状态
    async handleTogglePluginAssociation(assoc) {
      try {
        await api.plugin.updateAgentPlugin(
          this.agentId,
          assoc.id,
          !assoc.is_enabled,
          assoc.priority
        )
        await this.loadPluginAssociations()
      } catch (error) {
        console.error('更新关联失败:', error)
        alert('更新关联失败，请稍后重试')
      }
    },
    
    // 更新插件优先级
    async handleUpdatePluginPriority(assoc, event) {
      const newPriority = parseInt(event.target.value) || 0
      if (newPriority === assoc.priority) {
        return
      }
      
      try {
        await api.plugin.updateAgentPlugin(
          this.agentId,
          assoc.id,
          assoc.is_enabled === 1,
          newPriority
        )
        await this.loadPluginAssociations()
      } catch (error) {
        console.error('更新优先级失败:', error)
        alert('更新优先级失败，请稍后重试')
        event.target.value = assoc.priority
      }
    },
    
    // 移除插件关联
    async handleRemovePluginAssociation(assoc) {
      if (confirm(`确定要移除与"${assoc.plugin_name}"的关联吗？`)) {
        try {
          await api.plugin.deleteAgentPlugin(this.agentId, assoc.id)
          await this.loadPluginAssociations()
        } catch (error) {
          console.error('删除关联失败:', error)
          alert('删除关联失败，请稍后重试')
        }
      }
    }
  },
  watch: {
    showPluginSelectModal(newVal) {
      if (newVal) {
        this.loadAvailablePlugins()
      }
    }
  }
}
</script>

<style scoped>
.agent-edit-container {
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

/* 更新智能体区域样式 */
.edit-section {
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

/* 插件关联样式 */
.plugin-associations-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 24px;
  margin-top: 24px;
}

.plugin-associations {
  margin-top: 12px;
}

.associations-header {
  margin-bottom: 16px;
}

.btn-add-plugin {
  padding: 8px 16px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-add-plugin:hover {
  background-color: #5a67d8;
}

.empty-associations {
  text-align: center;
  padding: 20px;
  color: #718096;
  font-size: 14px;
}

.associations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.association-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #f8fafc;
}

.association-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plugin-name {
  font-weight: 500;
  color: #2d3748;
  font-size: 14px;
}

.association-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
}

.priority-input {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.priority-input label {
  color: #4a5568;
}

.priority-field {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
}

.btn-remove-association {
  width: 24px;
  height: 24px;
  border: none;
  background-color: transparent;
  color: #718096;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-remove-association:hover {
  background-color: #fed7d7;
  color: #c53030;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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
  transition: all 0.2s;
}

.modal-close:hover {
  background-color: #f7fafc;
  color: #4a5568;
}

.modal-body {
  padding: 24px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #718096;
}

.plugin-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.plugin-select-item {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.plugin-select-item:hover:not(.disabled) {
  border-color: #667eea;
  background-color: #f7fafc;
}

.plugin-select-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plugin-select-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.plugin-select-name {
  font-weight: 500;
  color: #2d3748;
  font-size: 14px;
}

.already-associated {
  font-size: 12px;
  color: #718096;
}

.plugin-select-description {
  font-size: 12px;
  color: #718096;
  margin: 0;
}

.config-value {
  font-weight: 500;
  color: #2d3748;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
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

.btn-confirm:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-confirm:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .edit-section {
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

