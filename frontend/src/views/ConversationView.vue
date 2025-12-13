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

      <!-- 3. 核心聊天内容区 -->
      <main class="chat-content">
        <!-- 聊天头部 -->
        <header class="chat-header">
          <div class="header-info">
            <h2>实时对话</h2>
            <p class="subtitle">与您的 AI 助手进行互动</p>
          </div>
          
          <div class="agent-selector-wrapper">
            <div class="selector-label">当前对话模型：</div>
            <div class="custom-select">
              <select
                id="agent-select"
                v-model="selectedAgentId"
                @change="handleAgentChange"
                class="agent-select"
              >
                <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                  🤖 {{ agent.name }}
                </option>
              </select>
              <span class="select-arrow">▼</span>
            </div>
          </div>
        </header>

        <!-- 消息列表区域 -->
        <div class="chat-viewport" ref="chatViewport">
          <div v-if="loading" class="state-container">
            <div class="spinner"></div>
            <p>正在连接智能体...</p>
          </div>
          
          <div v-else-if="messages.length === 0" class="state-container empty">
            <div class="empty-icon">👋</div>
            <h3>开始新对话</h3>
            <p>选择一个智能体并发送消息吧</p>
          </div>
          
          <div v-else class="messages-list">
            <div
              v-for="(message, index) in messages"
              :key="index"
              :class="['message-row', message.role]"
            >
              <div class="avatar-col">
                <img
                  :src="message.role === 'user' ? userAvatar : getAgentAvatar(message.role)"
                  class="chat-avatar"
                  :alt="message.role"
                />
              </div>
              <div class="bubble-col">
                <div class="message-meta">
                  <span class="sender-name">{{ message.role === 'user' ? '我' : getAgentName() }}</span>
                  <span class="time">{{ formatTime(message.createdAt) }}</span>
                </div>
                <div class="message-bubble">
                  {{ message.content }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部输入框 (CSS 已优化) -->
        <footer class="chat-input-area">
          <div class="input-wrapper" :class="{ 'sending': sending }">
            <input
              type="text"
              v-model="inputMessage"
              placeholder="输入消息，Enter 发送..."
              class="message-input"
              @keyup.enter="handleSendMessage"
              :disabled="sending"
            />
            <button
              class="btn-send"
              @click="handleSendMessage"
              :disabled="!inputMessage.trim() || sending"
            >
              <span v-if="sending" class="loading-dots">...</span>
              <span v-else>➤</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  </div>
</template>

<script>
// Script 逻辑保持不变
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
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    }
  },
  mounted() {
    this.checkLoginStatus()
    this.getUserInfo()
    this.getAgentsList()
  },
  updated() {
    this.scrollToBottom()
  },
  methods: {
    checkLoginStatus() {
      if (!api.auth.isLoggedIn()) this.$router.push('/login')
    },
    getUserInfo() {
      this.user = api.auth.getCurrentUser()
    },
    async handleLogout() {
      try { await api.auth.logout() } finally { this.$router.push('/login') }
    },
    async getAgentsList() {
      if (!this.user) return
      this.loading = true
      try {
        const response = await api.agent.getUserAgentList(this.user.id)
        this.agents = response.agents || []
        if (this.agents.length > 0) {
          this.selectedAgentId = this.agents[0].id
          this.createDefaultConversation()
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        this.loading = false
      }
    },
    async createDefaultConversation() {
      if (!this.user || !this.selectedAgentId) return
      this.loading = true
      try {
        const mainAgentId = Number(this.selectedAgentId)
        const agentIds = [2, 3]
        const response = await api.conversation.createConversation({
          userId: this.user.id,
          model: 'deepseek-chat',
          provider: 'deepseek',
          temperature: 0.7,
          maxTokens: 1024,
          mainAgent: mainAgentId,
          agentIds
        })
        this.currentConversation = response
        this.messages = []
      } catch (error) {
        console.error('Error:', error)
      } finally {
        this.loading = false
      }
    },
    async handleAgentChange() {
      await this.createDefaultConversation()
    },
    async handleSendMessage() {
      if (!this.inputMessage.trim() || !this.user || !this.currentConversation || this.sending) return
      
      const messageContent = this.inputMessage.trim()
      this.inputMessage = ''
      this.sending = true
      
      try {
        const userMessage = { role: 'user', content: messageContent, createdAt: new Date().toISOString() }
        this.messages.push(userMessage)
        
        const sendParams = {
          conversationId: this.currentConversation.id,
          userId: this.user.id,
          messages: [{ role: 'user', content: messageContent }]
        }
        
        const response = await api.conversation.sendMessage(sendParams)
        const responseMessages = this.extractAssistantMessages(response)
        
        if (responseMessages.length > 0) {
          this.messages.push(...responseMessages)
        } else {
          this.messages.push({
            role: 'assistant',
            content: (response && (response.content || response.message?.content)) || '处理中...',
            createdAt: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Error:', error)
        this.messages.pop()
      } finally {
        this.sending = false
      }
    },
    getAgentAvatar(role) {
      if (role === 'assistant' && this.selectedAgentId) {
        const agent = this.agents.find(a => a.id === this.selectedAgentId)
        return agent?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Agent'
      }
      return 'https://api.dicebear.com/7.x/bottts/svg?seed=Bot'
    },
    getAgentName() {
       const agent = this.agents.find(a => a.id === this.selectedAgentId)
       return agent ? agent.name : '智能体'
    },
    formatTime(timeString) {
      if (!timeString) return ''
      return new Date(timeString).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    },
    scrollToBottom() {
      const container = this.$refs.chatViewport
      if (container) container.scrollTop = container.scrollHeight
    },
    extractAssistantMessages(response) {
      const normalizeTimestamp = (value) => value ? new Date(value).toISOString() : new Date().toISOString()
      const collectMessages = () => {
        if (Array.isArray(response)) return response
        if (Array.isArray(response?.messages)) return response.messages
        if (response?.message) return [response.message]
        return []
      }
      return collectMessages()
        .filter(msg => msg && msg.role === 'assistant')
        .map(msg => ({
          role: 'assistant',
          content: msg.content || '',
          createdAt: normalizeTimestamp(msg.createdAt || msg.created_at || msg.timestamp)
        }))
    }
  }
}
</script>

<style scoped>
/* ================== CSS 变量 ================== */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --bg-color: #f9fafb;
  --white: #ffffff;
  --text-main: #111827;
  --text-sub: #6b7280;
  --border-color: #e5e7eb;
  --user-bubble: #4f46e5;
  --bot-bubble: #ffffff;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
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
.username { font-size: 14px; font-weight: 500; }
.btn-logout {
  width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border-color);
  background: white; color: var(--text-sub); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.btn-logout:hover { background-color: #fef2f2; color: #ef4444; border-color: #fecaca; }

/* ================== Sidebar ================== */
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

/* ================== Chat Content ================== */
.chat-content {
  flex: 1; display: flex; flex-direction: column;
  background-color: #f3f4f6; /* 对话背景色 */
  position: relative;
}

.chat-header {
  height: 70px; background-color: var(--white); border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center; padding: 0 32px;
  flex-shrink: 0;
}
.header-info h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; }
.header-info .subtitle { font-size: 12px; color: var(--text-sub); margin: 0; }

.agent-selector-wrapper { display: flex; align-items: center; gap: 12px; }
.selector-label { font-size: 13px; color: var(--text-sub); font-weight: 500; }
.custom-select { position: relative; width: 200px; }
.agent-select {
  width: 100%; appearance: none; padding: 8px 32px 8px 12px;
  border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;
  background: white; color: var(--text-main); cursor: pointer; outline: none; transition: all 0.2s;
}
.agent-select:hover { border-color: #d1d5db; }
.agent-select:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1); }
.select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; font-size: 10px; color: var(--text-sub); }

/* Chat Viewport */
.chat-viewport {
  flex: 1; overflow-y: auto; padding: 24px 32px;
  display: flex; flex-direction: column;
}
.chat-viewport::-webkit-scrollbar { width: 6px; }
.chat-viewport::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 10px; }

/* Messages */
.state-container { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-sub); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.spinner {
  width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: var(--primary-color);
  border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.messages-list { display: flex; flex-direction: column; gap: 24px; padding-bottom: 20px; }
.message-row { display: flex; gap: 16px; max-width: 80%; }
.message-row.user { align-self: flex-end; flex-direction: row-reverse; }
.message-row.assistant { align-self: flex-start; }

.chat-avatar {
  width: 40px; height: 40px; border-radius: 50%; object-fit: cover;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1); background: white;
}
.bubble-col { display: flex; flex-direction: column; gap: 4px; max-width: 100%; }
.message-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #9ca3af; }
.message-row.user .message-meta { justify-content: flex-end; }

.message-bubble {
  padding: 12px 16px; font-size: 15px; line-height: 1.6; word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.message-row.user .message-bubble {
  background-color: var(--user-bubble); color: black; border-radius: 18px 18px 4px 18px;
}
.message-row.assistant .message-bubble {
  background-color: var(--bot-bubble); color: var(--text-main);
  border: 1px solid var(--border-color); border-radius: 18px 18px 18px 4px;
}

/* ================== Chat Input Area (优化重点) ================== */
.chat-input-area {
  padding: 24px 32px;
  background-color: var(--white);
  border-top: 1px solid var(--border-color);
  /* 增加向上投影，分离输入区和内容区 */
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f9fafb; /* 保持浅灰背景 */
  /* 加深边框颜色，从 #e5e7eb 改为 #d1d5db，增加可见度 */
  border: 1px solid #d1d5db; 
  border-radius: 28px;
  padding: 6px 8px 6px 20px;
  /* 增加 Drop Shadow 而不是 Inset Shadow，提升立体感 */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
  background-color: var(--white);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15); /* 聚焦时阴影加重且带色 */
  transform: translateY(-1px); /* 聚焦时微微上浮 */
}

.message-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-main);
  padding: 10px 0;
  outline: none;
}

.message-input::placeholder {
  color: #9ca3af;
}

.btn-send {
  width: 44px; height: 44px; border-radius: 50%;
  background-color: var(--primary-color); color: white;
  border: none; font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0; margin-left: 12px;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3); /* 按钮增加投影 */
}

.btn-send:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.4);
}

.btn-send:disabled {
  background-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

.loading-dots { font-size: 20px; line-height: 10px; animation: pulse 1s infinite; }
@keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .chat-header, .chat-viewport, .chat-input-area { padding-left: 16px; padding-right: 16px; }
  .agent-selector-wrapper { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .selector-label { display: none; }
  .custom-select { width: 140px; }
}
</style>