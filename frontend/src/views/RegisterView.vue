<template>
  <div class="register-container">
    <div class="register-form-wrapper">
      <div class="register-header">
        <h2 class="register-title">注册账号</h2>
        <p class="register-subtitle">创建新账号，开始使用系统</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="register-form">
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
          <label for="email" class="form-label">邮箱</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            class="form-input"
            placeholder="请输入邮箱地址"
            :class="{ 'input-error': errors.email }"
            @blur="validateField('email')"
          />
          <div v-if="errors.email" class="error-message">{{ errors.email }}</div>
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
        
        <div class="form-group">
          <label for="confirmPassword" class="form-label">确认密码</label>
          <input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            type="password"
            class="form-input"
            placeholder="请再次输入密码"
            :class="{ 'input-error': errors.confirmPassword }"
            @blur="validateField('confirmPassword')"
          />
          <div v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</div>
        </div>
        
        <div v-if="registerError" class="register-error-message">{{ registerError }}</div>
        <div v-if="registerSuccess" class="register-success-message">{{ registerSuccess }}</div>
        
        <div class="form-actions">
          <button type="submit" class="btn-register" :disabled="isLoading">
            {{ isLoading ? '注册中...' : '注册' }}
          </button>
          <button type="button" class="btn-login" @click="goToLogin">
            已有账号，去登录
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'RegisterView',
  data() {
      return {
        formData: {
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        },
        errors: {
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        },
        registerError: '',
        registerSuccess: '',
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
      
      if (field === 'email') {
        if (!this.formData.email) {
          this.errors.email = '邮箱不能为空'
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(this.formData.email)) {
            this.errors.email = '请输入有效的邮箱地址'
          }
        }
      }
      
      if (field === 'password') {
        if (!this.formData.password) {
          this.errors.password = '密码不能为空'
        } else if (this.formData.password.length < 3 || this.formData.password.length > 20) {
          this.errors.password = '密码长度应为3-20个字符'
        }
      }
      
      if (field === 'confirmPassword') {
        if (!this.formData.confirmPassword) {
          this.errors.confirmPassword = '请确认密码'
        } else if (this.formData.confirmPassword !== this.formData.password) {
          this.errors.confirmPassword = '两次输入的密码不一致'
        }
      }
    },
    
    // 验证整个表单
    validateForm() {
      this.validateField('username')
      this.validateField('email')
      this.validateField('password')
      this.validateField('confirmPassword')
      
      // 检查是否有任何错误
      return this.errors.username === '' && 
             this.errors.email === '' && 
             this.errors.password === '' && 
             this.errors.confirmPassword === ''
    },
    
    // 处理注册
    async handleRegister() {
      if (!this.validateForm()) {
        return
      }
      
      this.isLoading = true
      this.registerError = ''
      this.registerSuccess = ''
      
      // 重置错误信息
      this.errors = {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      }
      
      try {
        // 使用API工具调用注册接口，传递三个单独参数
        await api.auth.register(this.formData.username, this.formData.password, this.formData.email)
        
        this.registerSuccess = '注册成功，请登录'
        // 延迟跳转到登录页
        setTimeout(() => {
          this.$router.push('/login')
        }, 2000)
        
      } catch (error) {
        this.registerError = error.message || '注册失败，请稍后重试'
        console.error('注册失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    // 跳转到登录页
    goToLogin() {
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.register-form-wrapper {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  backdrop-filter: blur(10px);
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-title {
  font-size: 24px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.register-subtitle {
  color: #718096;
  font-size: 14px;
}

.register-form {
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

.register-error-message {
  background-color: #fed7d7;
  color: #c53030;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.register-success-message {
  background-color: #c6f6d5;
  color: #22543d;
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

.btn-register {
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

.btn-register:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-register:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.btn-login {
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

.btn-login:hover {
  background-color: #f7fafc;
  border-color: #5a67d8;
  color: #5a67d8;
}

@media (max-width: 480px) {
  .register-form-wrapper {
    padding: 30px 20px;
  }
  
  .register-title {
    font-size: 20px;
  }
  
  .btn-register,
  .btn-login {
    padding: 12px;
    font-size: 14px;
  }
}
</style>