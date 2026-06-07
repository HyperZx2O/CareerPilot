import os
from chromadb import HttpClient
from chromadb.config import Settings


def get_chroma_client():
    """Create and return a ChromaDB HttpClient.

    Reads ``CHROMA_HOST`` environment variable, defaults to ``http://localhost:8001``.
    The client is configured with ``Settings`` to avoid experimental warnings.
    """
    host = os.getenv("CHROMA_HOST", "http://localhost:8001")
    # Ensure trailing slash removed for HttpClient compatibility
    host = host.rstrip('/')
    return HttpClient(host=host, settings=Settings(allow_reset=False))


def get_collection(name: str):
    """Return a Chroma collection with the given ``name``.

    If the collection does not exist it will be created.
    """
    client = get_chroma_client()
    # ``get_or_create_collection`` ensures a collection exists
    return client.get_collection(name=name)
