// 导入必要的工具函数和请求方法
import { get, post, put, del } from './user.js'

/**
 * 会话管理相关API
 */
export const conversationAPI = {
  /**
   * 获取会话列表
   */
  async getConversationList(params = {}) {
    try {
      const response = await get('/conversation/get_conversation_list', params)
      return response
    } catch (error) {
      console.error('获取会话列表失败:', error)
      throw error
    }
  },
  
  /**
   * 创建会话
   */
  async createConversation(data) {
    try {
      const response = await post('/conversation/create_conversation', data)
      return response
    } catch (error) {
      console.error('创建会话失败:', error)
      throw error
    }
  },
  
  /**
   * 获取会话详情
   */
  async getConversationDetail(conversationId) {
    try {
      const response = await get(`/conversation/get_conversation_detail/${conversationId}`)
      return response
    } catch (error) {
      console.error('获取会话详情失败:', error)
      throw error
    }
  },
  
  /**
   * 更新会话
   */
  async updateConversation(conversationId, data) {
    try {
      const response = await put(`/conversation/update_conversation/${conversationId}`, data)
      return response
    } catch (error) {
      console.error('更新会话失败:', error)
      throw error
    }
  },
  
  /**
   * 删除会话
   */
  async deleteConversation(conversationId) {
    try {
      const response = await del(`/conversation/delete_conversation/${conversationId}`)
      return response
    } catch (error) {
      console.error('删除会话失败:', error)
      throw error
    }
  },
  
  /**
   * 获取会话消息历史
   */
  async getMessageHistory(conversationId, params = {}) {
    try {
      const response = await get(`/conversation/get_message_history/${conversationId}`, params)
      return response
    } catch (error) {
      console.error('获取消息历史失败:', error)
      throw error
    }
  },
  
  /**
   * 发送消息
   */
  async sendMessage(conversationId, data) {
    try {
      const response = await post(`/conversation/send_message/${conversationId}`, data)
      return response
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  },
  
  /**
   * 生成对话摘要
   */
  async generateSummary(conversationId, data) {
    try {
      const response = await post(`/conversation/generate_summary/${conversationId}`, data)
      return response
    } catch (error) {
      console.error('生成摘要失败:', error)
      throw error
    }
  },
  
  /**
   * 导出对话
   */
  async exportConversation(conversationId, format) {
    try {
      const response = await get(`/conversation/export_conversation/${conversationId}`, { format })
      return response
    } catch (error) {
      console.error('导出对话失败:', error)
      throw error
    }
  },
  
  /**
   * 删除消息
   */
  async deleteMessage(messageId) {
    try {
      const response = await del(`/conversation/delete_message/${messageId}`)
      return response
    } catch (error) {
      console.error('删除消息失败:', error)
      throw error
    }
  },
  
  /**
   * 更新消息
   */
  async updateMessage(messageId, data) {
    try {
      const response = await put(`/conversation/update_message/${messageId}`, data)
      return response
    } catch (error) {
      console.error('更新消息失败:', error)
      throw error
    }
  },
  
  /**
   * 获取对话统计
   */
  async getConversationStats(params = {}) {
    try {
      const response = await get('/conversation/get_conversation_stats', params)
      return response
    } catch (error) {
      console.error('获取对话统计失败:', error)
      throw error
    }
  }
}