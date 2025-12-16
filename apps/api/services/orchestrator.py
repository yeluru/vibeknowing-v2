from typing import Dict, Optional, Any
from fastapi import BackgroundTasks
from .agent_base import AgentBase, AgentStatus

class AgentOrchestrator:
    """
    Manages the lifecycle and execution of agents.
    Currently uses in-memory storage and FastAPI BackgroundTasks.
    """
    _instance = None
    _active_agents: Dict[str, AgentBase] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentOrchestrator, cls).__new__(cls)
        return cls._instance

    @classmethod
    def register_agent(cls, agent: AgentBase):
        """Register an agent instance to track its state."""
        cls._active_agents[agent.agent_id] = agent

    @classmethod
    def get_agent(cls, agent_id: str) -> Optional[AgentBase]:
        return cls._active_agents.get(agent_id)

    @classmethod
    async def _run_wrapper(cls, agent: AgentBase, input_data: Any):
        """Wrapper to run agent and handle cleanup/logging."""
        try:
            await agent.run(input_data)
        except Exception as e:
            # Error is already handled/set in agent.run(), but we can do global logging here
            print(f"Orchestrator caught error for {agent.agent_id}: {e}")

    @classmethod
    def dispatch(cls, agent: AgentBase, input_data: Any, background_tasks: BackgroundTasks):
        """
        Start an agent in the background.
        """
        cls.register_agent(agent)
        background_tasks.add_task(cls._run_wrapper, agent, input_data)
        return agent.agent_id

    @classmethod
    def list_agents(cls):
        return [agent.to_dict() for agent in cls._active_agents.values()]

    @classmethod
    def clear_completed(cls):
        """Remove completed or failed agents to free memory."""
        to_remove = [
            aid for aid, agent in cls._active_agents.items() 
            if agent.state.status in [AgentStatus.COMPLETED, AgentStatus.FAILED]
        ]
        for aid in to_remove:
            del cls._active_agents[aid]
