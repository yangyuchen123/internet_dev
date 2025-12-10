<template>
  <div class="conversation-container">
    <!-- 页面头部 -->
    <header class="conversation-header">
      <h2>会话管理</h2>
      <div class="agent-select-container">
        <label for="agent-select">选择智能体：</label>
        <select 
          id="agent-select" 
          v-model="selectedAgentId" 
          @change="handleAgentChange"
          class="agent-select"
        >
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }}
          </option>
        </select>
      </div>
    </header>

    <!-- 消息区域 -->
    <main class="conversation-main">
      <!-- 消息列表 -->
      <div class="messages-container">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="messages.length === 0" class="empty-messages">
          <p>暂无消息，开始与智能体对话吧！</p>
        </div>
        <div v-else class="messages-list">
          <div 
            v-for="(message, index) in messages" 
            :key="index" 
            :class="['message-item', message.role]"
          >
            <div class="message-avatar">
              <img 
                :src="message.role === 'user' ? userAvatar : getAgentAvatar(message.role)" 
                :alt="message.role === 'user' ? '用户' : '智能体'"
              />
            </div>
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              <div class="message-time">{{ formatTime(message.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-container">
        <div class="input-wrapper">
          <input 
            type="text" 
            v-model="inputMessage" 
            placeholder="请输入消息..." 
            class="message-input"
            @keyup.enter="handleSendMessage"
          />
          <button 
            class="send-button" 
            @click="handleSendMessage"
            :disabled="!inputMessage.trim() || sending"
          >
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'ConversationView',
  data() {
    return {
      user: null,
      agents: [],
      selectedAgentId: null,
      currentConversation: null,
      messages: [],
      inputMessage: '',
      loading: false,
      sending: false,
      userAvatar: 'https://via.placeholder.com/40?text=U' // 默认用户头像
    }
  },
  mounted() {
    // 检查登录状态
    this.checkLoginStatus()
    // 获取用户信息
    this.getUserInfo()
    // 获取智能体列表
    this.getAgentsList()
  },
  methods: {
    // 检查登录状态
    checkLoginStatus() {
      if (!api.auth.isLoggedIn()) {
        // 没有登录，跳转到登录页
        this.$router.push('/login')
      }
    },

    // 获取用户信息
    getUserInfo() {
      this.user = api.auth.getCurrentUser()
    },

    // 获取智能体列表
    async getAgentsList() {
      if (!this.user) return
      
      this.loading = true
      try {
        const response = await api.agent.getUserAgentList(this.user.id)
        this.agents = response.agents || []
        
        // 如果有智能体，默认选择第一个作为主智能体
        if (this.agents.length > 0) {
          this.selectedAgentId = this.agents[0].id
          // 创建默认会话
          this.createDefaultConversation()
        }
      } catch (error) {
        console.error('获取智能体列表失败:', error)
        this.$message.error('获取智能体列表失败，请稍后重试')
      } finally {
        this.loading = false
      }
    },

    // 创建默认会话
    async createDefaultConversation() {
      if (!this.user || !this.selectedAgentId) return
      
      this.loading = true
      try {
        const response = await api.conversation.createConversation({
          userId: this.user.id,
          model: 'deepseek-chat', // 默认模型，可根据实际情况调整
          provider: 'deepseek',
          temperature: 0.7,
          maxTokens: 1024,
          mainAgent: this.selectedAgentId,
          agentIds: [this.selectedAgentId]
        })
        
        console.log('[调试] 创建会话返回:', response)
        this.currentConversation = response
        // 初始化空消息列表
        this.messages = []
      } catch (error) {
        console.error('创建会话失败:', error)
        this.$message.error('创建会话失败，请稍后重试')
      } finally {
        this.loading = false
      }
    },

    // 智能体选择变化处理
    async handleAgentChange() {
      // 创建新会话
      await this.createDefaultConversation()
    },

    // 发送消息
    async handleSendMessage() {
      if (!this.inputMessage.trim() || !this.user || !this.currentConversation || this.sending) return
      
      const messageContent = this.inputMessage.trim()
      this.inputMessage = ''
      this.sending = true
      
      try {
        // 先添加用户消息到列表
        const userMessage = {
          role: 'user',
          content: messageContent
        }
        this.messages.push(userMessage)
        
        // 调试：检查会话ID和发送参数
        console.log('[调试] 当前会话:', this.currentConversation)
        const sendParams = {
          conversationId: this.currentConversation.id,
          userId: this.user.id,
          messages: [{
            role: 'user',
            content: messageContent
          }]
        }
        console.log('[调试] 发送消息参数:', sendParams)
        
        // 调用API发送消息
        const response = await api.conversation.sendMessage(sendParams)
        
        // 处理响应，添加智能体消息
        if (response && response.messages) {
          const assistantMessage = response.messages.find(msg => msg.role === 'assistant')
          if (assistantMessage) {
            this.messages.push({
              role: 'assistant',
              content: assistantMessage.content,
              createdAt: new Date().toISOString()
            })
          }
        } else {
          // 如果响应中没有消息，添加一个默认的智能体消息
          this.messages.push({
            role: 'assistant',
            content: response.content || '收到消息，正在处理中...',
            createdAt: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        this.$message.error('发送消息失败，请稍后重试')
        // 移除刚才添加的用户消息
        this.messages.pop()
      } finally {
        this.sending = false
      }
    },

    // 获取智能体头像
    getAgentAvatar(role) {
      if (role === 'assistant' && this.selectedAgentId) {
        const agent = this.agents.find(a => a.id === this.selectedAgentId)
        return agent?.avatar || 'https://via.placeholder.com/40?text=A'
      }
      return 'https://via.placeholder.com/40?text=A'
    },

    // 格式化时间
    formatTime(timeString) {
      if (!timeString) return ''
      const date = new Date(timeString)
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.conversation-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Arial', sans-serif;
}

/* 页面头部样式 */
.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.conversation-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
}

.agent-select-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-select-container label {
  font-size: 14px;
  color: #4a5568;
}

.agent-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #2d3748;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.agent-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 主内容区样式 */
.conversation-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: #f8fafc;
  overflow: hidden;
}

/* 消息容器样式 */
.messages-container {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  font-size: 16px;
  color: #718096;
}

.empty-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 16px;
  color: #718096;
}

/* 消息列表样式 */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 消息项样式 */
.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 80%;
}

.message-item.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-item.assistant {
  align-self: flex-start;
}

/* 消息头像样式 */
.message-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

/* 消息内容样式 */
.message-content {
  flex: 1;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
}

.message-item.user .message-content {
  background-color: #667eea;
  color: white;
  border-bottom-right-radius: 4px;
}

.message-item.assistant .message-content {
  background-color: white;
  color: #2d3748;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 4px;
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
  text-align: right;
}

/* 输入区域样式 */
.input-container {
  padding: 20px 24px;
  background-color: white;
  border-top: 1px solid #e2e8f0;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  font-size: 14px;
  color: #2d3748;
  transition: all 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.send-button {
  padding: 12px 24px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #5a67d8;
}

.send-button:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}
</style>