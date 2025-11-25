// 从各个模块导入API
import { authAPI, getAccessToken, setAccessToken, removeAccessToken, saveUserInfo, getUserInfo, removeUserInfo } from './user.js'
import { agentAPI } from './agent.js'
import { conversationAPI } from './conversation.js'

// 创建默认导出对象，保持向后兼容
const api = {
  auth: authAPI,
  agent: agentAPI,
  conversation: conversationAPI,
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  saveUserInfo,
  getUserInfo,
  removeUserInfo
}

// 导出默认对象（保持向后兼容）
export default api

// 导出所有API作为命名导出
export {
  // 用户认证相关
  authAPI,
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  saveUserInfo,
  getUserInfo,
  removeUserInfo,
  
  // 智能体相关
  agentAPI,
  
  // 会话相关
  conversationAPI
}