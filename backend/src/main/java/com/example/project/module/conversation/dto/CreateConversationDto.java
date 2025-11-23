package com.example.project.module.conversation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class CreateConversationDto {

    @NotNull(message = "agent_id不能为空")
    @JsonProperty("agent_id")
    private Long agentId;

    private String title;

    private Map<String, Object> metadata;

}
