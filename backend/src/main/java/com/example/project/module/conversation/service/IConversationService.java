package com.example.project.module.conversation.service;

import com.example.project.module.agent.service.IAgentService;
import com.example.project.module.conversation.dto.CreateConversationDto;
import com.example.project.module.conversation.entity.Conversation;
import com.example.project.module.conversation.vo.ConversationListVO;
import com.example.project.module.conversation.vo.ConversationVO;
import com.example.project.module.conversation.vo.CreateConversationVO;

public interface IConversationService {

    /**
     * 根据id获取会话实体
     */
    ConversationVO get_conversation(Long conversationId);

    /**
     * 创建会话
     */
    CreateConversationVO create_conversation(CreateConversationDto dto);

    /**
     * 根据id删除会话
     */
    void delete_conversation(Long conversationId);

    /**
     * 获取会话列表
     */
    ConversationListVO getConversationList(int page, int limit, Long agentId);
}
