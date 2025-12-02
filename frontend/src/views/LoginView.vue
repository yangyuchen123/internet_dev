<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h2 class="login-title">登录系统</h2>
        <p class="login-subtitle">欢迎回来，请登录您的账号</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username" class="form-label">用户名</label>
          <input
            id="username"
            v-model="formData.username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            :class="{ 'input-error': errors.username }"
            @blur="validateField('username')"
          />
          <div v-if="errors.username" class="error-message">{{ errors.username }}</div>
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            :class="{ 'input-error': errors.password }"
            @blur="validateField('password')"
          />
          <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
        </div>
        
        <div v-if="loginError" class="login-error-message">{{ loginError }}</div>
        
        <div class="form-actions">
          <button type="submit" class="btn-login" :disabled="isLoading">
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
          <button type="button" class="btn-register" @click="goToRegister">
            注册账号
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'LoginView',
  data() {
    return {
      formData: {
        username: '',
        password: ''
      },
      errors: {},
      loginError: '',
      isLoading: false
    }
  },
  mounted() {
    // 如果已经登录，直接跳转到首页
    if (api.auth.isLoggedIn()) {
      this.$router.push('/home')
    }
  },
  methods: {
    // 验证单个字段
    validateField(field) {
      this.errors[field] = ''
      
      if (field === 'username') {
        if (!this.formData.username) {
          this.errors.username = '用户名不能为空'
        } else if (this.formData.username.length < 3 || this.formData.username.length > 20) {
          this.errors.username = '用户名长度应为3-20个字符'
        }
      }
      
      if (field === 'password') {
        if (!this.formData.password) {
          this.errors.password = '密码不能为空'
        } else if (this.formData.password.length < 3 || this.formData.password.length > 20) {
          this.errors.password = '密码长度应为3-20个字符'
        }
      }
    },
    
    // 验证整个表单
    validateForm() {
      this.validateField('username')
      this.validateField('password')
      
      // 检查是否有任何错误
      for (const key in this.errors) {
        if (this.errors[key] !== '') {
          return false
        }
      }
      return true
    },
    
    // 处理登录
    async handleLogin() {
      if (!this.validateForm()) {
        return
      }
      
      this.isLoading = true
      this.loginError = ''
      
      try {
        // 使用API工具调用登录接口
        await api.auth.login(this.formData.username, this.formData.password)
        
        // 登录成功，跳转到首页
        this.$router.push('/home')
      } catch (error) {
        this.loginError = '登录失败，请稍后重试'
        console.error('Login error:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    // 跳转到注册页
    goToRegister() {
      this.$router.push('/register')
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.login-form-wrapper {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.login-subtitle {
  color: #718096;
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.form-input {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
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

.login-error-message {
  background-color: #fed7d7;
  color: #c53030;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.btn-login {
  background-color: #667eea;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-login:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-login:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.btn-register {
  background-color: transparent;
  color: #667eea;
  border: 1px solid #667eea;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-register:hover {
  background-color: #f7fafc;
  border-color: #5a67d8;
  color: #5a67d8;
}

@media (max-width: 480px) {
  .login-form-wrapper {
    padding: 30px 20px;
  }
  
  .login-title {
    font-size: 20px;
  }
  
  .btn-login,
  .btn-register {
    padding: 12px;
    font-size: 14px;
  }
}
</style>