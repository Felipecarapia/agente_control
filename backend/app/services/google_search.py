"""
Serviço de busca no Google Places API para prospecção de leads.
"""
import logging
from typing import Optional, List, Dict, Any

import httpx

logger = logging.getLogger(__name__)

GOOGLE_PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place"


class GoogleSearchService:
    """Busca negócios no Google Places API para prospecção."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search_businesses(
        self,
        city: str,
        activity: str,
        state: Optional[str] = None,
        max_results: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Busca negócios no Google Places por cidade e tipo de atividade.
        
        Args:
            city: Nome da cidade
            activity: Tipo de atividade/negócio (ex: "restaurante", "dentista")
            state: Estado (opcional, para refinar)
            max_results: Número máximo de resultados
        
        Returns:
            Lista de negócios encontrados com informações básicas
        """
        location_query = f"{activity} em {city}"
        if state:
            location_query += f", {state}"

        results = []
        next_page_token = None

        logger.info(f"[GOOGLE] Buscando: query='{location_query}', max_results={max_results}")

        async with httpx.AsyncClient(timeout=30) as client:
            while len(results) < max_results:
                params: Dict[str, Any] = {
                    "query": location_query,
                    "key": self.api_key,
                    "language": "pt-BR",
                }
                if next_page_token:
                    params["pagetoken"] = next_page_token

                response = await client.get(
                    f"{GOOGLE_PLACES_BASE_URL}/textsearch/json",
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

                logger.info(f"[GOOGLE] Resposta text search: status={data.get('status')}, resultados={len(data.get('results', []))}")
                if data.get("status") != "OK":
                    logger.warning(f"[GOOGLE] API retornou status={data.get('status')}: {data.get('error_message', '')}")
                    break

                for place in data.get("results", []):
                    if len(results) >= max_results:
                        break
                    results.append({
                        "place_id": place.get("place_id"),
                        "business_name": place.get("name", ""),
                        "address": place.get("formatted_address", ""),
                        "rating": place.get("rating"),
                        "user_ratings_total": place.get("user_ratings_total"),
                        "types": place.get("types", []),
                        "location": place.get("geometry", {}).get("location"),
                    })

                next_page_token = data.get("next_page_token")
                if not next_page_token:
                    break

                # Google exige um delay antes de usar o next_page_token
                import asyncio
                await asyncio.sleep(2)

        logger.info(f"[GOOGLE] Text search finalizado: {len(results)} negócios encontrados")
        return results

    async def extract_business_info(self, place_id: str) -> Dict[str, Any]:
        """
        Extrai informações detalhadas de um negócio pelo place_id.
        
        Args:
            place_id: ID do local no Google Places
        
        Returns:
            Dict com telefone, website, endereço completo, etc.
        """
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{GOOGLE_PLACES_BASE_URL}/details/json",
                params={
                    "place_id": place_id,
                    "fields": "name,formatted_phone_number,international_phone_number,website,formatted_address,address_components,rating,user_ratings_total,types,opening_hours,url",
                    "key": self.api_key,
                    "language": "pt-BR",
                },
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") != "OK":
                logger.warning(f"Google Places Details API status: {data.get('status')}")
                return {}

            result = data.get("result", {})
            
            # Extrair cidade e estado dos address_components
            city = ""
            state = ""
            for component in result.get("address_components", []):
                types = component.get("types", [])
                if "administrative_area_level_2" in types:
                    city = component.get("long_name", "")
                elif "administrative_area_level_1" in types:
                    state = component.get("short_name", "")

            return {
                "business_name": result.get("name", ""),
                "phone": result.get("international_phone_number") or result.get("formatted_phone_number"),
                "website": result.get("website"),
                "address": result.get("formatted_address", ""),
                "city": city,
                "state": state,
                "rating": result.get("rating"),
                "category": ", ".join(result.get("types", [])[:3]),
                "google_maps_url": result.get("url"),
                "place_id": place_id,
            }

    async def run_prospecting(
        self,
        city: str,
        activity: str,
        state: Optional[str] = None,
        max_results: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Executa prospecção completa: busca negócios e extrai informações detalhadas.
        
        Args:
            city: Cidade
            activity: Tipo de atividade
            state: Estado
            max_results: Máximo de resultados
        
        Returns:
            Lista de leads com informações completas
        """
        logger.info(f"[GOOGLE] Iniciando prospecção completa: {activity} em {city} ({state or 'sem estado'}), max={max_results}")
        
        # Primeiro busca os negócios
        businesses = await self.search_businesses(
            city=city,
            activity=activity,
            state=state,
            max_results=max_results,
        )

        logger.info(f"[GOOGLE] Busca inicial retornou {len(businesses)} negócios. Extraindo detalhes...")
        
        # Depois extrai detalhes de cada um
        leads = []
        for business in businesses:
            place_id = business.get("place_id")
            if not place_id:
                continue

            try:
                details = await self.extract_business_info(place_id)
                if details:
                    leads.append(details)
                    logger.info(f"[GOOGLE]   -> {details.get('business_name')} | tel={details.get('phone')} | {details.get('city')}")
            except Exception as e:
                logger.error(f"[GOOGLE] Erro ao extrair detalhes do place_id={place_id}: {e}")
                # Adiciona com info básica mesmo sem detalhes
                leads.append({
                    "business_name": business.get("business_name", ""),
                    "address": business.get("address", ""),
                    "rating": business.get("rating"),
                    "place_id": place_id,
                })

        logger.info(f"[GOOGLE] Prospecção completa: {len(leads)} leads com detalhes extraídos")
        return leads
