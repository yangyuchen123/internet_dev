<template>
  <div class="agents-view-container">
    <!-- 智能体详情 -->
    <div class="agent-detail">
      <h1>智能体详情</h1>
      <p>当前智能体ID: {{ agentId }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AgentsView',
  data() {
    return {
      agentId: null // 当前智能体ID
    }
  },
  mounted() {
    // 从路由查询参数获取 agent_id
    this.agentId = this.$route.query.agent_id || this.$route.params.id || null
  }
}
</script>

<style scoped>
.agents-view-container {
  display: flex;
  height: 100vh;
  font-family: 'Arial', sans-serif;
  background-color: #f8fafc;
  align-items: center;
  justify-content: center;
}

.agent-detail {
  text-align: center;
  padding: 40px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.agent-detail h1 {
  color: #2d3748;
  margin-bottom: 20px;
}

.agent-detail p {
  color: #718096;
  font-size: 16px;
}
</style>
