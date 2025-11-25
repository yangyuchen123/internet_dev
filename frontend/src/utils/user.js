// API基础URL
const API_BASE_URL = 'http://localhost:8080/api' // 这将由开发服务器代理到后端

/**
 * 获取存储在localStorage中的访问令牌
 */
export function getAccessToken() {
  return localStorage.getItem('access_token')
}

/**
 * 设置访问令牌到localStorage
 */
export function setAccessToken(token) {
  localStorage.setItem('access_token', token)
}

/**
 * 从localStorage移除访问令牌
 */
export function removeAccessToken() {
  localStorage.removeItem('access_token')
}

/**
 * 保存用户信息到localStorage
 */
export function saveUserInfo(userInfo) {
  localStorage.setItem('user', JSON.stringify(userInfo))
}

/**
 * 从localStorage获取用户信息
 */
export function getUserInfo() {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

/**
 * 从localStorage移除用户信息
 */
export function removeUserInfo() {
  localStorage.removeItem('user')
}

/**
 * 通用fetch函数，处理API请求
 */
export async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  // 如果有访问令牌，则添加到请求头
  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const config = {
    ...options,
    headers
  }
  
  try {
    const response = await fetch(url, config)
    
    // 检查响应状态
    if (!response.ok) {
      // 尝试解析错误响应
      let errorData
      try {
        errorData = await response.json()
      } catch (e) {
        errorData = { message: '请求失败，请稍后重试' }
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }
    
    // 对于204 No Content响应，不尝试解析JSON
    if (response.status === 204) {
      return null
    }
    
    // 解析JSON响应
    const data = await response.json()
    
    // 根据后端实际返回的状态码调整，成功状态码为200
    if (data.code !== 200) {
      throw new Error(data.message || 'API返回错误')
    }
    
    return data.data
  } catch (error) {
    console.error('API请求错误:', error)
    throw error
  }
}

/**
 * GET请求
 */
export async function get(endpoint, params = {}) {
  // 构建查询字符串
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const url = queryString ? `${endpoint}?${queryString}` : endpoint
  
  return fetchAPI(url, {
    method: 'GET'
  })
}

/**
 * POST请求
 */
export async function post(endpoint, data = {}) {
  return fetchAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * PUT请求
 */
export async function put(endpoint, data = {}) {
  return fetchAPI(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * DELETE请求
 */
export async function del(endpoint) {
  return fetchAPI(endpoint, {
    method: 'DELETE'
  })
}

/**
 * 用户认证相关API
 */
export const authAPI = {
  /**
   * 检查用户是否已登录
   */
  isLoggedIn() {
    return !!localStorage.getItem('access_token')
  },
  
  /**
   * 用户登录
   */
  async login(username, password) {
    try {
      const response = await post('/user/login', {
        username,
        password
      })
      
      // 保存token和用户信息
      if (response && response.access_token) {
        setAccessToken(response.access_token)
        // 保存用户信息（用户信息直接包含在response对象中）
        saveUserInfo({
          id: response.id,
          username: response.username,
          nickname: response.nickname,
          email: response.email,
          avatar: response.avatar,
          lastLoginTime: response.lastLoginTime
        })
      }
      
      return response
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  },
  
  /**
   * 用户注册
   */
  async register(username, password, email) {
    try {
      const response = await post('/user/register', {
        username,
        password,
        email
      })
      return response
    } catch (error) {
      console.error('注册失败:', error)
      throw error
    }
  },
  
  /**
   * 刷新令牌
   */
  async refreshToken() {
    try {
      const response = await post('/user/refresh')
      if (response && response.access_token) {
        setAccessToken(response.access_token)
      }
      return response
    } catch (error) {
      console.error('刷新令牌失败:', error)
      // 刷新令牌失败，清除本地存储的token
      removeAccessToken()
      removeUserInfo()
      throw error
    }
  },
  
  /**
   * 退出登录
   */
  async logout() {
    try {
      // 调用退出登录API
      await post('/user/logout')
    } catch (error) {
      console.error('退出登录API调用失败:', error)
      // 即使API调用失败，也要清除本地存储
    } finally {
      // 清除本地存储的token和用户信息
      removeAccessToken()
      removeUserInfo()
    }
  },
  
  /**
   * 检查是否已登录
   */
  isLoggedIn() {
    return getAccessToken() !== null
  },
  
  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return getUserInfo()
  }
}