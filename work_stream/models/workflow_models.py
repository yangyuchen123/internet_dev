from pydantic import BaseModel
from typing import List, Dict, Any


class NodeConfig(BaseModel):
    """节点配置模型"""
    id: str
    type: str


class EdgeConfig(BaseModel):
    """边配置模型"""
    source: str
    target: str
    is_condition: bool = False
    condition_type: str = None
    route_function: str = None
    path_map: Dict[str, str] = None


class WorkflowConfig(BaseModel):
    """工作流配置模型"""
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]


class WorkflowExecutionRequest(BaseModel):
    """工作流执行请求模型"""
    workflow_config: WorkflowConfig
    initial_state: Dict[str, Any]
