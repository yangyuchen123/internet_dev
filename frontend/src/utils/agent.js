// 导入必要的工具函数和请求方法
import { get, post, del } from './user.js'

/**
 * 智能体相关API
 */
export const agentAPI = {
  /**
   * 获取公开智能体列表
   */
  async getPublicAgentList() {
    try {
      const response = await get('/plugin/agent/public')
      return response
    } catch (error) {
      console.error('获取公开智能体列表失败:', error)
      throw error
    }
  },
  
  /**
   * 获取用户关联智能体列表
   */
  async getUserAgentList(userId, params = {}) {
    try {
      const response = await get('/plugin/agent/list', {
        userId,
        ...params
      })
      return response
    } catch (error) {
      console.error('获取用户关联智能体列表失败:', error)
      throw error
    }
  },
  
  /**
   * 创建智能体
   */
  async createAgent(data) {
    try {
      const response = await post('/plugin/agent/create', data)
      return response
    } catch (error) {
      console.error('创建智能体失败:', error)
      throw error
    }
  },
  
  /**
   * 删除智能体
   */
  async deleteAgent(agentId, userId) {
    try {
      const response = await del('/plugin/agent/delete', {
        agentId,
        userId
      })
      return response
    } catch (error) {
      console.error('删除智能体失败:', error)
      throw error
    }
  },
  
  /**
   * 标记智能体已测试
   */
  async testAgent(agentId, userId, isTested = true) {
    try {
      const response = await post('/plugin/agent/test', {
        agentId,
        userId,
        isTested
      })
      return response
    } catch (error) {
      console.error('标记智能体已测试失败:', error)
      throw error
    }
  },
  
  /**
   * 发布/下架智能体
   */
  async publishAgent(agentId, userId, isPublic = true) {
    try {
      const response = await post('/plugin/agent/publish', {
        agentId,
        userId,
        isPublic
      })
      return response
    } catch (error) {
      console.error('发布/下架智能体失败:', error)
      throw error
    }
  },
  
  /**
   * 收藏智能体
   */
  async favoriteAgent(agentId, userId, note = '') {
    try {
      const response = await post('/plugin/agent/favorite', {
        agentId,
        userId,
        note
      })
      return response
    } catch (error) {
      console.error('收藏智能体失败:', error)
      throw error
    }
  },
  
  /**
   * 取消收藏智能体
   */
  async unfavoriteAgent(agentId, userId) {
    try {
      const response = await del('/plugin/agent/favorite', {
        agentId,
        userId
      })
      return response
    } catch (error) {
      console.error('取消收藏智能体失败:', error)
      throw error
    }
  }
}