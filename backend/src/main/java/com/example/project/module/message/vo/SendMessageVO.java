package com.example.project.module.message.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SendMessageVO {

    private MessageVO userMessageVO;

    private MessageVO agentMessageVO;

}
