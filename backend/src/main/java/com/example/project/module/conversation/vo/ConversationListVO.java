package com.example.project.module.conversation.vo;

import lombok.Data;

import java.util.List;

@Data
public class ConversationListVO {

    private List<ConversationVO> conversations;

    private Pagination pagination;

    @Data
    public static class Pagination {
        private int page;
        private int limit;
        private long total;
        private int pages;
        private long agent_id;
    }
}
