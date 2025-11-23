package com.example.project.module.message.controller;

import com.example.project.common.api.ApiResponse;
import com.example.project.module.message.dto.SendMessageDto;
import com.example.project.module.message.service.IMessageService;
import com.example.project.module.message.vo.MessageHistoryVO;
import com.example.project.module.message.vo.SendMessageVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * 消息控制器
 */
@Tag(name = "消息管理")
@RestController
@RequestMapping("/api/message")
@RequiredArgsConstructor
public class MessageController {

    private final IMessageService messageService;

    @Operation(summary = "发送消息")
    @PostMapping("/{conversation_id}/send_message")
    public ApiResponse<SendMessageVO> sendMessage(@PathVariable("conversation_id") Long conversationId, @RequestBody SendMessageDto dto) {
        SendMessageVO vo = messageService.sendMessage(conversationId, dto);
        return ApiResponse.ok("消息发送成功", vo);
    }

    @Operation(summary = "获取消息历史")
    @GetMapping("/{conversation_id}/history")
    public ApiResponse<MessageHistoryVO> getMessageHistory(
            @PathVariable("conversation_id") Long conversationId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime before) {

        MessageHistoryVO vo = messageService.getMessageHistory(conversationId, page, limit, before);
        return ApiResponse.ok("获取消息历史成功", vo);
    }



}
