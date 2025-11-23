package com.example.project.module.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.project.module.agent.entity.Agent;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AgentMapper extends BaseMapper<Agent> {

    /**
     * 根据id查询智能体
     */
    Agent findAgentById(Long id);

    /**
     * 根据名称查询智能体
     */
    Agent findAgentByName(String name);

    /**
     * 插入智能体
     */
    void insertAgent(Agent agent);

    /**
     * 更新智能体
     */
    void updateAgent(Agent agent);

    /**
     * 删除智能体
     */
    void deleteAgentById(Long id);


}
