"""
Serviço de Storage S3/MinIO para uploads de arquivos.
"""
from typing import Optional
import logging
import uuid

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Serviço para upload de arquivos no S3/MinIO."""

    def __init__(self):
        self.endpoint = settings.S3_ENDPOINT or ""
        self.region = settings.S3_REGION
        self.bucket = settings.S3_BUCKET or ""
        self.access_key = settings.S3_ACCESS_KEY or ""
        self.secret_key = settings.S3_SECRET_KEY or ""
        self.public_base_url = settings.S3_PUBLIC_BASE_URL or ""
        self.use_ssl = settings.S3_USE_SSL
        
        # Pasta base dentro do bucket para este projeto
        self.base_folder = "sistemaxi-crm"

        self._client = None
        
        # Log das configurações no init
        logger.info(f"[S3] StorageService inicializado")
        logger.info(f"[S3]   Endpoint: {self.endpoint}")
        logger.info(f"[S3]   Bucket: {self.bucket}")
        logger.info(f"[S3]   Configurado: {self.is_configured()}")

    @property
    def client(self):
        """Retorna cliente S3 (lazy initialization)."""
        if self._client is None:
            logger.info(f"[S3] Inicializando cliente S3...")
            logger.info(f"[S3] Endpoint: {self.endpoint}")
            logger.info(f"[S3] Bucket: {self.bucket}")
            logger.info(f"[S3] Region: {self.region}")
            logger.info(f"[S3] Use SSL: {self.use_ssl}")
            logger.info(f"[S3] Access Key: {self.access_key[:4]}***")
            
            if not all([self.endpoint, self.bucket, self.access_key, self.secret_key]):
                missing = []
                if not self.endpoint: missing.append("S3_ENDPOINT")
                if not self.bucket: missing.append("S3_BUCKET")
                if not self.access_key: missing.append("S3_ACCESS_KEY")
                if not self.secret_key: missing.append("S3_SECRET_KEY")
                logger.error(f"[S3] Configuração incompleta. Faltando: {missing}")
                raise ValueError(f"Configuração S3 incompleta. Faltando: {missing}")
            
            try:
                self._client = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint,
                    region_name=self.region,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    use_ssl=self.use_ssl,
                )
                logger.info("[S3] Cliente S3 criado com sucesso")
            except Exception as e:
                logger.error(f"[S3] Erro ao criar cliente: {e}")
                raise
        return self._client

    def is_configured(self) -> bool:
        """Verifica se o S3 está configurado."""
        return all([self.endpoint, self.bucket, self.access_key, self.secret_key])

    def upload_file(
        self,
        file_content: bytes,
        folder: str,
        filename: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Faz upload de um arquivo para o S3/MinIO.
        
        Args:
            file_content: Conteúdo do arquivo em bytes
            folder: Pasta dentro do bucket (ex: "propostas/123")
            filename: Nome do arquivo (ex: "imagem.png")
            content_type: MIME type do arquivo
            
        Returns:
            URL pública do arquivo
        """
        # Monta o path completo: sistemaxi-crm/propostas/123/imagem.png
        key = f"{self.base_folder}/{folder}/{filename}"
        
        logger.info(f"[S3] Upload iniciado:")
        logger.info(f"[S3]   Bucket: {self.bucket}")
        logger.info(f"[S3]   Key: {key}")
        logger.info(f"[S3]   Content-Type: {content_type}")
        logger.info(f"[S3]   Tamanho: {len(file_content)} bytes")
        
        try:
            # Tenta sem ACL primeiro (alguns MinIO não suportam)
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_content,
                ContentType=content_type,
            )
            logger.info(f"[S3] Upload concluído com sucesso!")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"[S3] Erro ClientError: {error_code} - {error_msg}")
            logger.error(f"[S3] Response: {e.response}")
            raise RuntimeError(f"Erro S3 ({error_code}): {error_msg}")
        except NoCredentialsError as e:
            logger.error(f"[S3] Erro de credenciais: {e}")
            raise RuntimeError(f"Credenciais S3 inválidas: {e}")
        except Exception as e:
            logger.error(f"[S3] Erro inesperado: {type(e).__name__}: {e}")
            raise RuntimeError(f"Erro inesperado no upload: {e}")

        # Retorna URL pública
        if self.public_base_url:
            url = f"{self.public_base_url}/{key}"
        else:
            url = f"{self.endpoint}/{self.bucket}/{key}"
        
        logger.info(f"[S3] URL gerada: {url}")
        return url

    def delete_file(self, file_url: str) -> bool:
        """
        Remove um arquivo do S3/MinIO.
        
        Args:
            file_url: URL completa do arquivo
            
        Returns:
            True se removido com sucesso
        """
        # Extrai a key da URL
        if self.public_base_url and file_url.startswith(self.public_base_url):
            key = file_url.replace(f"{self.public_base_url}/", "")
        elif file_url.startswith(f"{self.endpoint}/{self.bucket}/"):
            key = file_url.replace(f"{self.endpoint}/{self.bucket}/", "")
        else:
            return False

        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def generate_unique_filename(self, original_filename: str, allowed_extensions: Optional[set[str]] = None) -> str:
        """Gera um nome de arquivo único mantendo a extensão."""
        default_exts = {"jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "txt", "csv", "xlsx", "xls", "pptx", "md", "json"}
        allowed = allowed_extensions or default_exts
        ext = ""
        if original_filename and "." in original_filename:
            ext = original_filename.rsplit(".", 1)[-1].lower()
            if ext not in allowed:
                ext = "bin"
            ext = f".{ext}"
        else:
            ext = ".bin"
        return f"{uuid.uuid4().hex}{ext}"


# Instância global (singleton)
storage_service = StorageService()


def get_storage_service() -> StorageService:
    """Retorna a instância do serviço de storage."""
    return storage_service
