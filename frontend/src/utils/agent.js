// 导入必要的工具函数和请求方法
import { get, post, put, del } from './user.js'

/**
 * 智能体相关API
 */
export const agentAPI = {
  /**
   * 获取智能体列表
   */
  async getAgentList(params = {}) {
    try {
      const response = await get('/agent/get_agent_list?pageNum=1&limit=20', params)
      return response
    } catch (error) {
      console.error('获取智能体列表失败:', error)
      throw error
    }
  },
  
  /**
   * 创建智能体
   */
  async createAgent(data) {
    try {
      const response = await post('/agent/create_agent', data)
      return response
    } catch (error) {
      console.error('创建智能体失败:', error)
      throw error
    }
  },
  
  /**
   * 更新智能体
   */
  async updateAgent(agentId, data) {
    try {
      const response = await put(`/agent/update_agent/${agentId}`, data)
      return response
    } catch (error) {
      console.error('更新智能体失败:', error)
      throw error
    }
  },
  
  /**
   * 删除智能体
   */
  async deleteAgent(agentId) {
    try {
      const response = await del(`/agent/delete_agent/${agentId}`)
      return response
    } catch (error) {
      console.error('删除智能体失败:', error)
      throw error
    }
  }
}