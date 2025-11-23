package com.example.project.module.agent.service.Impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.bean.copier.CopyOptions;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.project.common.exceptions.BusinessException;
import com.example.project.common.utils.JwtUtil;
import com.example.project.module.agent.dto.CreateAgentDto;
import com.example.project.module.agent.dto.UpdateAgentDto;
import com.example.project.module.agent.entity.Agent;
import com.example.project.module.agent.mapper.AgentMapper;
import com.example.project.module.agent.service.IAgentService;
import com.example.project.module.agent.vo.AgentListVO;
import com.example.project.module.agent.vo.AgentVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 智能体服务实现类
 */
@Service
@RequiredArgsConstructor
public class AgentServiceImpl implements IAgentService {

    private final AgentMapper agentMapper;
    private final JwtUtil jwtUtil;

    @Override
    public void create_agent(CreateAgentDto dto, String token) {
        // 检查智能体是否存在
        Agent existAgent = agentMapper.findAgentByName(dto.getName());

        if (existAgent != null) {
            throw new BusinessException("该智能体名已存在");
        }

        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", "")); // 去掉Bearer前缀

        // 创建智能体
        Agent agent = new Agent();
        agent.setName(dto.getName());
        agent.setDescription(dto.getDescription());
        agent.setAvatar(
                StringUtils.isNotBlank(dto.getAvatar())
                        ? dto.getAvatar()
                        : "https://example.com/avatar.jpg"
        );
        agent.setCategory(dto.getCategory());
        agent.setModel(dto.getModel());
        agent.setSystemPrompt(dto.getSystemPrompt());
        agent.setTemperature(dto.getTemperature());
        agent.setMaxTokens(dto.getMaxTokens());
        agent.setIsPublic(dto.getIsPublic());
        agent.setCreatorId(userId);

        agentMapper.insertAgent(agent);
    }

    @Override
    public void update_agent(UpdateAgentDto dto, Long id) {

        // 检查智能体是否存在
        Agent existAgent = agentMapper.findAgentById(id);
        if (existAgent == null) {
            throw new BusinessException("该智能体不存在");
        }

        Agent agent = new Agent();
        BeanUtil.copyProperties(dto, agent, CopyOptions.create().setIgnoreNullValue(true));
        agent.setId(id);

        agentMapper.updateAgent(agent);
    }

    @Override
    public void delete_agent(Long agentId) {
        // 检查智能体是否存在
        Agent existAgent = agentMapper.findAgentById(agentId);
        if (existAgent == null) {
            throw new BusinessException("该智能体不存在");
        }

        agentMapper.deleteAgentById(agentId);
    }

    @Override
    public AgentListVO getAgentList(int page, int limit, String category, String search) {

        Page<Agent> pageParam = new Page<>(page, limit);
        QueryWrapper<Agent> query = new QueryWrapper<>();

        if (category != null && !category.isEmpty()) {
            query.eq("category", category);
        }

        if (search != null && !search.isEmpty()) {
            query.like("name", search);
        }

        Page<Agent> resultPage = agentMapper.selectPage(pageParam, query);

        // 转换成 VO
        List<AgentVO> agentVOList = resultPage.getRecords().stream().map(agent -> {
            AgentVO vo = new AgentVO();
            BeanUtils.copyProperties(agent, vo);
            return vo;
        }).collect(Collectors.toList());

        // 构建分页信息
        AgentListVO.Pagination pagination = new AgentListVO.Pagination();
        pagination.setPage((int) resultPage.getCurrent());
        pagination.setLimit((int) resultPage.getSize());
        pagination.setTotal(resultPage.getTotal());
        pagination.setPages((int) resultPage.getPages());

        // 构建最终返回VO
        AgentListVO listVO = new AgentListVO();
        listVO.setAgents(agentVOList);
        listVO.setPagination(pagination);

        return listVO;
    }

}
