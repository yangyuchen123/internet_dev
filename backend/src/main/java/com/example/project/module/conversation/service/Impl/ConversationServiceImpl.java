package com.example.project.module.conversation.service.Impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.project.common.exceptions.BusinessException;
import com.example.project.module.conversation.dto.CreateConversationDto;
import com.example.project.module.conversation.entity.Conversation;
import com.example.project.module.conversation.mapper.ConversationMapper;
import com.example.project.module.conversation.service.IConversationService;
import com.example.project.module.conversation.vo.ConversationListVO;
import com.example.project.module.conversation.vo.ConversationVO;
import com.example.project.module.conversation.vo.CreateConversationVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements IConversationService {

    private final ConversationMapper conversationMapper;

    @Override
    public CreateConversationVO create_conversation(CreateConversationDto dto) {

        Conversation conversation = new Conversation();
        conversation.setAgentId(dto.getAgentId());
        conversation.setTitle(dto.getTitle());
        conversation.setMetadata(dto.getMetadata());
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setUpdatedAt(LocalDateTime.now());

        conversationMapper.insertConversation(conversation);

        return CreateConversationVO.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .agentId(conversation.getAgentId())
                .createdAt(conversation.getCreatedAt().toString())
                .updatedAt(conversation.getUpdatedAt().toString())
                .build();
    }

    @Override
    public ConversationVO get_conversation(Long conversationId) {
        Conversation conversation = conversationMapper.getConversationById(conversationId);

        return ConversationVO.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .agentId(conversation.getAgentId())
                .metadata(conversation.getMetadata())
                .createdAt(conversation.getCreatedAt().toString())
                .updatedAt(conversation.getUpdatedAt().toString())
                .build();
    }

    @Override
    public void delete_conversation(Long conversationId) {
        Conversation conversation = conversationMapper.getConversationById(conversationId);
        if (conversation == null) {
            throw new BusinessException("该会话不存在");
        }
        conversationMapper.deleteConversationById(conversationId);
    }

    @Override
    public ConversationListVO getConversationList(int page, int limit, Long agentId) {
        Page<Conversation> pageParam = new Page<>(page, limit);
        QueryWrapper<Conversation> query = new QueryWrapper<>();

        if (agentId != null) {
            query.eq("agentId", agentId);
        }

        Page<Conversation> resultPage = conversationMapper.selectPage(pageParam, query);

        // 转换成 VO
        List<ConversationVO> conversationVOList = resultPage.getRecords().stream().map(conversation -> {
            ConversationVO vo = new ConversationVO();
            BeanUtils.copyProperties(conversation, vo);
            return vo;
        }).collect(Collectors.toList());

        // 构建分页信息
        ConversationListVO.Pagination pagination = new ConversationListVO.Pagination();
        pagination.setPage((int) resultPage.getCurrent());
        pagination.setLimit((int) resultPage.getSize());
        pagination.setTotal(resultPage.getTotal());
        pagination.setPages((int) resultPage.getPages());

        // 构建最终返回VO
        ConversationListVO listVO = new ConversationListVO();
        listVO.setConversations(conversationVOList);
        listVO.setPagination(pagination);

        return listVO;
    }

}
