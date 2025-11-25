<template>
  <div class="agents-container">
    <h1 class="page-title">智能体管理</h1>
    <div class="agents-grid">
      <div v-for="agent in agents" :key="agent.id" class="agent-card">
        <div class="agent-avatar" @click="goToAgentDetail(agent.id)">
          <img v-if="agent.avatar" :src="agent.avatar" :alt="agent.name" />
          <div v-else class="avatar-placeholder">{{ agent.name.charAt(0) }}</div>
        </div>
        <h3 class="agent-name" @click="goToAgentDetail(agent.id)">{{ agent.name }}</h3>
        <p class="agent-description">{{ agent.description }}</p>
        <div class="agent-actions">
          <button class="btn-update" @click="goToUpdateAgent(agent.id)">更新</button>
          <button class="btn-delete" @click="deleteAgent(agent.id)">删除</button>
        </div>
      </div>
    </div>
    <div v-if="isLoading" class="loading">加载中...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'AgentsView',
  data() {
    return {
      agents: [],
      isLoading: false,
      error: ''
    }
  },
  mounted() {
    // 加载智能体列表
    this.loadAgents()
  },
  methods: {
    async loadAgents() {
      this.isLoading = true
      this.error = ''
      try {
        const response = await api.agent.getAgentList()
        this.agents = response.agents || []
      } catch (error) {
        this.error = '获取智能体列表失败，请稍后重试'
        console.error('获取智能体列表失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    goToAgentDetail(agentId) {
      // 跳转到智能体详情页，这里暂时跳转到更新页面，后续可以添加详情页
      this.$router.push(`/agents/${agentId}/update`)
    },
    
    goToUpdateAgent(agentId) {
      this.$router.push(`/agents/${agentId}/update`)
    },
    
    async deleteAgent(agentId) {
      if (confirm('确定要删除这个智能体吗？')) {
        try {
          await api.agent.deleteAgent(agentId)
          // 删除成功后刷新列表
          this.loadAgents()
        } catch (error) {
          this.error = '删除智能体失败，请稍后重试'
          console.error('删除智能体失败:', error)
        }
      }
    }
  }
}
</script>

<style scoped>
.agents-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #2d3748;
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.agent-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.agent-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.agent-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 15px;
  cursor: pointer;
  overflow: hidden;
}

.agent-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32px;
  font-weight: 600;
}

.agent-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2d3748;
  cursor: pointer;
  text-align: center;
}

.agent-description {
  font-size: 14px;
  color: #718096;
  margin-bottom: 15px;
  text-align: center;
  height: 40px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.agent-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.btn-update {
  flex: 1;
  background-color: #667eea;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-update:hover {
  background-color: #5a67d8;
}

.btn-delete {
  flex: 1;
  background-color: #e53e3e;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-delete:hover {
  background-color: #c53030;
}

.loading {
  text-align: center;
  padding: 20px;
  font-size: 16px;
  color: #718096;
}

.error-message {
  text-align: center;
  padding: 20px;
  font-size: 16px;
  color: #e53e3e;
  background-color: #fed7d7;
  border-radius: 4px;
  margin-top: 20px;
}
</style>