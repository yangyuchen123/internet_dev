package com.example.project.module.message.vo;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MessageHistoryVO {

    private List<SendMessageVO> history;

    private Pagination pagination;

    @Data
    @Builder
    public static class Pagination {
        private int page;
        private int limit;
        private long total;
        private int pages;
    }
}
