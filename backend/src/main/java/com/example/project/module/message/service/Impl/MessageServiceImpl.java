package com.example.project.module.message.service.Impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.project.module.conversation.entity.Conversation;
import com.example.project.module.conversation.mapper.ConversationMapper;
import com.example.project.module.message.dto.SendMessageDto;
import com.example.project.module.message.entity.Message;
import com.example.project.module.message.mapper.MessageMapper;
import com.example.project.module.message.service.IMessageService;
import com.example.project.module.message.vo.MessageHistoryVO;
import com.example.project.module.message.vo.MessageVO;
import com.example.project.module.message.vo.SendMessageVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 消息服务实现类
 */
@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements IMessageService {

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;

    public SendMessageVO sendMessage(Long conversationId, SendMessageDto dto) {
        Conversation existConversation = conversationMapper.getConversationById(conversationId);

        if (existConversation == null) {
            throw new RuntimeException("会话不存在");
        }

        // 保存到数据库中的用户消息
        Message userMessage = Message.builder()
                .conversationId(conversationId)
                .role("user")
                .content(dto.getContent())
                .type(dto.getType())
                .metadata(dto.getMetadata())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        messageMapper.insertMessage(userMessage);
        Long userMessageId = userMessage.getId();

        // 返回前端的用户消息
        MessageVO userMessageVO = MessageVO.builder()
                .id(userMessageId)
                .conversationId(conversationId)
                .content(dto.getContent())
                .type(dto.getType())
                .role("user")
                .createdAt(userMessage.getCreatedAt())
                .build();


        // 保存到数据库中的智能助手回复(后续接入实际AI接口)
        Message agentMessage = Message.builder()
                .conversationId(conversationId)
                .role("assistant")
                .content("您好！我是智能助手，很高兴为您服务。")
                .type("text")
                .metadata(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        messageMapper.insertMessage(agentMessage);
        Long agentMessageId = agentMessage.getId();

        // 返回前端的智能助手回复(后续接入实际AI接口)
        MessageVO agentMessageVO = MessageVO.builder()
                .id(agentMessageId)
                .conversationId(conversationId)
                .content("您好！我是智能助手，很高兴为您服务。")
                .type("text")
                .role("assistant")
                .createdAt(agentMessage.getCreatedAt())
                .build();

        return SendMessageVO.builder()
                .userMessageVO(userMessageVO)
                .agentMessageVO(agentMessageVO)
                .build();

    }

    @Override
    public MessageHistoryVO getMessageHistory(Long conversationId, int page, int limit, LocalDateTime before) {

        Conversation existConversation = conversationMapper.getConversationById(conversationId);

        if (existConversation == null) {
            throw new RuntimeException("会话不存在");
        }

        Page<Message> pageParam = new Page<>(page, limit);

        // 2. 构建查询条件
        QueryWrapper<Message> query = new QueryWrapper<>();
        query.eq("conversation_id", conversationId);

        if (before != null) {
            query.lt("created_at", before);
        }

        query.orderByAsc("created_at");

        // 分页查询
        Page<Message> resultPage = messageMapper.selectPage(pageParam, query);

        List<Message> messages = resultPage.getRecords();

        // 组装SendMessageVO，每两条合成一组
        List<SendMessageVO> history = new ArrayList<>();

        for (int i = 0; i < messages.size(); i += 2) {
            Message user = messages.get(i);
            Message assistant = (i + 1 < messages.size()) ? messages.get(i + 1) : null;

            history.add(
                    SendMessageVO.builder()
                            .userMessageVO(toMessageVO(user))
                            .agentMessageVO(assistant != null ? toMessageVO(assistant) : null)
                            .build()
            );
        }

        MessageHistoryVO.Pagination pagination = MessageHistoryVO.Pagination.builder()
                .page(page)
                .limit(limit)
                .total(resultPage.getTotal())
                .pages((int) resultPage.getPages())
                .build();

        return MessageHistoryVO.builder()
                .history(history)
                .pagination(pagination)
                .build();
    }

    private MessageVO toMessageVO(Message msg) {
        return MessageVO.builder()
                .id(msg.getId())
                .conversationId(msg.getConversationId())
                .role(msg.getRole())
                .type(msg.getType())
                .content(msg.getContent())
                .createdAt(msg.getCreatedAt())
                .build();
    }

}
