package com.example.project.module.agent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateAgentDto {

    @NotBlank(message = "智能体名不能为空")
    private String name;

    private String description;

    private String avatar;

    private String category;

    private String model;

    private String systemPrompt;

    private BigDecimal temperature;

    private Integer maxTokens;

    private Boolean isPublic;

}
