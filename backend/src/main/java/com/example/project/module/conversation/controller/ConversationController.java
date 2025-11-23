package com.example.project.module.conversation.controller;

import com.example.project.common.api.ApiResponse;
import com.example.project.module.conversation.dto.CreateConversationDto;
import com.example.project.module.conversation.service.IConversationService;
import com.example.project.module.conversation.vo.ConversationListVO;
import com.example.project.module.conversation.vo.ConversationVO;
import com.example.project.module.conversation.vo.CreateConversationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 会话控制器
 */
@Tag(name = "会话管理")
@RestController
@RequestMapping("/api/conversation")
@RequiredArgsConstructor
public class ConversationController {

    private final IConversationService conversationService;

    @Operation(summary = "创建会话")
    @PostMapping("/create_conversation")
    public ApiResponse<CreateConversationVO> create_conversation(@Validated @RequestBody CreateConversationDto dto) {
        CreateConversationVO createConversationVO = conversationService.create_conversation(dto);
        return ApiResponse.ok(createConversationVO);
    }

    @Operation(summary = "获取会话详情")
    @GetMapping("/get_conversation/{conversation_id}")
    public ApiResponse<ConversationVO> get_conversation(@PathVariable("conversation_id") Long conversationId) {
        ConversationVO conversationVO = conversationService.get_conversation(conversationId);
        return ApiResponse.ok(conversationVO);
    }

    @Operation(summary = "删除会话")
    @DeleteMapping("/delete_conversation/{conversation_id}")
    public ApiResponse<Void> delete_conversation(@PathVariable("conversation_id") Long conversationId) {
        conversationService.delete_conversation(conversationId);
        return ApiResponse.ok();
    }

    @Operation(summary = "获取所有会话列表")
    @GetMapping("/get_conversation_list")
    public ApiResponse<ConversationListVO> list_conversations(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @RequestParam(value = "agent_id", required = false) Long agentId
    ) {
        ConversationListVO vo = conversationService.getConversationList(page, limit, agentId);
        return ApiResponse.ok("获取会话列表成功", vo);
    }

}
