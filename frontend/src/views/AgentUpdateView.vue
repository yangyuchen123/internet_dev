<template>
  <div class="agent-update-container">
    <h1 class="page-title">更新智能体</h1>
    <form @submit.prevent="updateAgent" class="agent-form">
      <div class="form-group">
        <label for="name" class="form-label">智能体名称</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="form-input"
          placeholder="请输入智能体名称"
          :class="{ 'input-error': errors.name }"
          @blur="validateField('name')"
        />
        <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
      </div>
      
      <div class="form-group">
        <label for="description" class="form-label">智能体描述</label>
        <textarea
          id="description"
          v-model="formData.description"
          class="form-textarea"
          placeholder="请输入智能体描述"
          rows="3"
          :class="{ 'input-error': errors.description }"
          @blur="validateField('description')"
        ></textarea>
        <div v-if="errors.description" class="error-message">{{ errors.description }}</div>
      </div>
      
      <div class="form-group">
        <label for="avatar" class="form-label">智能体头像</label>
        <input
          id="avatar"
          v-model="formData.avatar"
          type="text"
          class="form-input"
          placeholder="请输入智能体头像URL"
        />
      </div>
      
      <div class="form-group">
        <label for="category" class="form-label">分类</label>
        <input
          id="category"
          v-model="formData.category"
          type="text"
          class="form-input"
          placeholder="请输入智能体分类"
          :class="{ 'input-error': errors.category }"
          @blur="validateField('category')"
        />
        <div v-if="errors.category" class="error-message">{{ errors.category }}</div>
      </div>
      
      <div class="form-group">
        <label for="model" class="form-label">模型</label>
        <input
          id="model"
          v-model="formData.model"
          type="text"
          class="form-input"
          placeholder="请输入智能体使用的模型"
          :class="{ 'input-error': errors.model }"
          @blur="validateField('model')"
        />
        <div v-if="errors.model" class="error-message">{{ errors.model }}</div>
      </div>
      
      <div class="form-group">
        <label for="systemPrompt" class="form-label">系统提示</label>
        <textarea
          id="systemPrompt"
          v-model="formData.systemPrompt"
          class="form-textarea"
          placeholder="请输入智能体系统提示"
          rows="5"
          :class="{ 'input-error': errors.systemPrompt }"
          @blur="validateField('systemPrompt')"
        ></textarea>
        <div v-if="errors.systemPrompt" class="error-message">{{ errors.systemPrompt }}</div>
      </div>
      
      <div class="form-group">
        <label for="temperature" class="form-label">温度</label>
        <input
          id="temperature"
          v-model.number="formData.temperature"
          type="number"
          class="form-input"
          placeholder="请输入温度值（0-2）"
          min="0"
          max="2"
          step="0.01"
          :class="{ 'input-error': errors.temperature }"
          @blur="validateField('temperature')"
        />
        <div v-if="errors.temperature" class="error-message">{{ errors.temperature }}</div>
      </div>
      
      <div class="form-group">
        <label for="maxTokens" class="form-label">最大 tokens</label>
        <input
          id="maxTokens"
          v-model.number="formData.maxTokens"
          type="number"
          class="form-input"
          placeholder="请输入最大 tokens 值"
          min="1"
          step="1"
          :class="{ 'input-error': errors.maxTokens }"
          @blur="validateField('maxTokens')"
        />
        <div v-if="errors.maxTokens" class="error-message">{{ errors.maxTokens }}</div>
      </div>
      
      <div class="form-group">
        <label for="isPublic" class="form-label">是否公开</label>
        <select
          id="isPublic"
          v-model="formData.isPublic"
          class="form-input"
        >
          <option :value="true">是</option>
          <option :value="false">否</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-update" :disabled="isLoading">
          {{ isLoading ? '更新中...' : '更新' }}
        </button>
        <button type="button" class="btn-cancel" @click="goBack">取消</button>
      </div>
    </form>
    <div v-if="isLoading" class="loading">加载中...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="success" class="success-message">{{ success }}</div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'AgentUpdateView',
  data() {
    return {
      formData: {
        name: '',
        description: '',
        avatar: '',
        category: '',
        model: '',
        systemPrompt: '',
        temperature: 0.8,
        maxTokens: 2048,
        isPublic: true
      },
      errors: {},
      isLoading: false,
      error: '',
      success: ''
    }
  },
  mounted() {
    // 从URL参数中获取智能体ID
    const agentId = this.$route.params.id
    // 加载智能体详情，这里暂时不实现，直接使用表单填写
  },
  methods: {
    // 验证单个字段
    validateField(field) {
      this.errors[field] = ''
      
      if (field === 'name') {
        if (!this.formData.name) {
          this.errors.name = '智能体名称不能为空'
        }
      }
      
      if (field === 'description') {
        if (!this.formData.description) {
          this.errors.description = '智能体描述不能为空'
        }
      }
      
      if (field === 'category') {
        if (!this.formData.category) {
          this.errors.category = '分类不能为空'
        }
      }
      
      if (field === 'model') {
        if (!this.formData.model) {
          this.errors.model = '模型不能为空'
        }
      }
      
      if (field === 'systemPrompt') {
        if (!this.formData.systemPrompt) {
          this.errors.systemPrompt = '系统提示不能为空'
        }
      }
      
      if (field === 'temperature') {
        if (this.formData.temperature < 0 || this.formData.temperature > 2) {
          this.errors.temperature = '温度值必须在0-2之间'
        }
      }
      
      if (field === 'maxTokens') {
        if (this.formData.maxTokens < 1) {
          this.errors.maxTokens = '最大tokens值必须大于0'
        }
      }
    },
    
    // 验证整个表单
    validateForm() {
      this.errors = {}
      
      this.validateField('name')
      this.validateField('description')
      this.validateField('category')
      this.validateField('model')
      this.validateField('systemPrompt')
      this.validateField('temperature')
      this.validateField('maxTokens')
      
      // 检查是否有任何错误
      for (const key in this.errors) {
        if (this.errors[key] !== '') {
          return false
        }
      }
      return true
    },
    
    async updateAgent() {
      if (!this.validateForm()) {
        return
      }
      
      this.isLoading = true
      this.error = ''
      this.success = ''
      
      try {
        const agentId = this.$route.params.id
        await api.agent.updateAgent(agentId, this.formData)
        this.success = '智能体更新成功'
        
        // 延迟返回智能体列表页
        setTimeout(() => {
          this.$router.push('/agents')
        }, 1500)
      } catch (error) {
        this.error = '更新智能体失败，请稍后重试'
        console.error('更新智能体失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    goBack() {
      this.$router.push('/agents')
    }
  }
}
</script>

<style scoped>
.agent-update-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #2d3748;
}

.agent-form {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-error {
  border-color: #e53e3e;
}

.error-message {
  font-size: 12px;
  color: #e53e3e;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.btn-update {
  background-color: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-update:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-update:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #e2e8f0;
  color: #4a5568;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background-color: #cbd5e0;
}

.loading {
  text-align: center;
  padding: 20px;
  font-size: 16px;
  color: #718096;
}

.error-message {
  text-align: center;
  padding: 12px;
  font-size: 14px;
  color: #e53e3e;
  background-color: #fed7d7;
  border-radius: 4px;
  margin-top: 10px;
}

.success-message {
  text-align: center;
  padding: 12px;
  font-size: 14px;
  color: #22543d;
  background-color: #c6f6d5;
  border-radius: 4px;
  margin-top: 10px;
}
</style>