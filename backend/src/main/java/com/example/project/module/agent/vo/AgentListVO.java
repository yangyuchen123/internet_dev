package com.example.project.module.agent.vo;

import lombok.Data;

import java.util.List;

@Data
public class AgentListVO {

    private List<AgentVO> agents;

    private Pagination pagination;

    @Data
    public static class Pagination {
        private int page;
        private int limit;
        private long total;
        private int pages; // 总页数
    }
}
