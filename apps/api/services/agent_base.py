import abc
import json
from typing import List, Dict, Any, Optional, Callable
from enum import Enum
from pydantic import BaseModel, Field

class AgentStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING = "waiting"

class AgentState(BaseModel):
    """
    Represents the current state of an agent.
    Serializable for persistence.
    """
    status: AgentStatus = AgentStatus.IDLE
    memory: List[Dict[str, Any]] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    current_step: int = 0
    error: Optional[str] = None

class AgentBase(abc.ABC):
    """
    Abstract Base Class for all VibeKnowing Agents.
    
    Responsibilities:
    1. Manage Agent Sate (Status, Memory, Context)
    2. Define Tool Registry
    3. Execute logic loop
    """

    def __init__(self, agent_id: str, initial_context: Dict[str, Any] = None):
        self.agent_id = agent_id
        self.state = AgentState(context=initial_context or {})
        self.tools: Dict[str, Callable] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        """Register tools common to all agents."""
        pass

    def register_tool(self, name: str, func: Callable, description: str):
        """Register a tool available to the agent."""
        self.tools[name] = func
        # In a real implementation, we would also store the schema/description for the LLM

    @abc.abstractmethod
    async def process(self, input_data: Any) -> Any:
        """
        Main logic for the agent. Must be implemented by subclasses.
        """
        pass

    async def run(self, input_data: Any) -> Any:
        """
        Public entry point to start the agent.
        """
        self.state.status = AgentStatus.RUNNING
        self.state.current_step = 0
        self.state.error = None
        
        try:
            result = await self.process(input_data)
            self.state.status = AgentStatus.COMPLETED
            return result
        except Exception as e:
            self.state.status = AgentStatus.FAILED
            self.state.error = str(e)
            # Log error
            print(f"Agent {self.agent_id} failed: {e}")
            raise e

    def add_memory(self, role: str, content: str):
        """Add a message to the agent's memory."""
        self.state.memory.append({"role": role, "content": content})

    def get_context(self, key: str) -> Any:
        return self.state.context.get(key)
    
    def set_context(self, key: str, value: Any):
        self.state.context[key] = value

    def to_dict(self) -> Dict:
        """Serialize agent state."""
        return {
            "agent_id": self.agent_id,
            "state": self.state.model_dump()
        }
