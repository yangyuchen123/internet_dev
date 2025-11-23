package com.example.project.module.agent.controller;

import com.example.project.common.api.ApiResponse;
import com.example.project.module.agent.dto.CreateAgentDto;
import com.example.project.module.agent.dto.UpdateAgentDto;
import com.example.project.module.agent.service.IAgentService;
import com.example.project.common.utils.TokenContext;
import com.example.project.module.agent.vo.AgentListVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 智能体控制器
 */
@Tag(name = "智能体管理")
@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentController {

    private final IAgentService agentService;

    @Operation(summary = "创建智能体")
    @PostMapping("/create_agent")
    public ApiResponse<Void> create_agent(@Validated @RequestBody CreateAgentDto dto) {
        String token = TokenContext.getToken();
        agentService.create_agent(dto, token);
        return ApiResponse.ok();
    }

    @Operation(summary = "更新智能体")
    @PutMapping("/update_agent/{agentId}")
    public ApiResponse<Void> update_agent(@Validated @RequestBody UpdateAgentDto dto, @PathVariable("agentId") Long agentId) {
        agentService.update_agent(dto, agentId);
        return ApiResponse.ok();
    }

    @Operation(summary = "删除智能体")
    @DeleteMapping("/delete_agent/{agentId}")
    public ApiResponse<Void> delete_agent(@PathVariable("agentId") Long agentId) {
        agentService.delete_agent(agentId);
        return ApiResponse.ok();
    }

    @Operation(summary = "获取所有智能体列表")
    @GetMapping("/get_agent_list")
    public ApiResponse<AgentListVO> list_agents(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "search", required = false) String search
    ) {
        AgentListVO vo = agentService.getAgentList(page, limit, category, search);
        return ApiResponse.ok("获取智能体列表成功", vo);
    }

}
