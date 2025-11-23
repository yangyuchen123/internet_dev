package com.example.project.module.agent.service;

import com.example.project.module.agent.dto.CreateAgentDto;
import com.example.project.module.agent.dto.UpdateAgentDto;
import com.example.project.module.agent.vo.AgentListVO;

public interface IAgentService {

    /**
     * 创建智能体
     */
    void create_agent(CreateAgentDto dto, String token);

    /**
     * 更新智能体
     */
    void update_agent(UpdateAgentDto dto, Long id);

    /**
     * 删除智能体
     */
    void delete_agent(Long agentId);

    /**
     * 获取智能体列表
     */
    AgentListVO getAgentList(int page, int limit, String category, String search);
}

