"""
Serviço de integração com a OpenAI para agentes de IA.
"""
import logging
from typing import Optional, List, Dict, Any

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class OpenAIAgentService:
    """Gerencia interações com a API da OpenAI para os agentes."""

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    async def create_chat_completion(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = 1024,
    ) -> Dict[str, Any]:
        """
        Cria uma resposta de chat usando o modelo configurado.
        
        Args:
            system_prompt: Prompt do sistema que define o comportamento do agente
            messages: Lista de mensagens no formato [{"role": "user", "content": "..."}]
            model: Modelo a usar (gpt-4, gpt-4o-mini, etc)
            temperature: Temperatura para geração (0.0 - 2.0)
            max_tokens: Máximo de tokens na resposta
        
        Returns:
            Dict com 'response', 'tokens_used', 'model'
        """
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        try:
            completion = await self.client.chat.completions.create(
                model=model,
                messages=full_messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            response_text = completion.choices[0].message.content or ""
            tokens_used = completion.usage.total_tokens if completion.usage else None

            return {
                "response": response_text,
                "tokens_used": tokens_used,
                "model": model,
            }

        except Exception as e:
            logger.error(f"Erro ao chamar OpenAI: {e}")
            raise

    async def process_webhook_message(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, str]],
        new_message: str,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = 1024,
    ) -> Dict[str, Any]:
        """
        Processa uma mensagem recebida via webhook e gera resposta do agente.
        
        Args:
            system_prompt: Prompt do sistema do agente
            conversation_history: Histórico de mensagens anteriores
            new_message: Nova mensagem recebida
            model: Modelo a usar
            temperature: Temperatura
            max_tokens: Máximo de tokens
        
        Returns:
            Dict com 'response', 'tokens_used', 'model'
        """
        messages = conversation_history + [{"role": "user", "content": new_message}]

        return await self.create_chat_completion(
            system_prompt=system_prompt,
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
