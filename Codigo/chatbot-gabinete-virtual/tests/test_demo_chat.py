import asyncio

import httpx

from app.main import app


def test_demo_chat_mock_flow() -> None:
    sender = "demo-video-user"

    def send(text: str, reset_session: bool = False) -> dict:
        async def _send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://testserver",
            ) as client:
                return await client.post(
                    "/demo/chat",
                    json={
                        "mode": "mock",
                        "sender": sender,
                        "text": text,
                        "reset_session": reset_session,
                    },
                )

        response = asyncio.run(_send())

        assert response.status_code == 200
        return response.json()

    assert "1 - Abrir demanda" in send("oi", reset_session=True)["reply"]
    assert "nome completo" in send("1")["reply"]
    assert "receber atualizacoes" in send("Maria Silva")["reply"]
    assert "titulo curto" in send("1")["reply"]
    assert "explique um pouco melhor" in send("Falta de atendimento")["reply"]
    assert "primeiras 2 letras da cidade" in send(
        "Preciso de ajuda com atendimento de saude no meu bairro."
    )["reply"]
    city_choice = send("Be")["reply"]
    assert "Encontrei mais de uma cidade" in city_choice
    institution_choice = send("1")["reply"]
    assert "Cidade selecionada: Belo Horizonte" in institution_choice
    confirmation = send("1")["reply"]
    assert "A definir pelo gestor" in confirmation
    assert "Status inicial: Em analise" in confirmation

    final_response = send("1")

    assert "Demanda aberta com sucesso" in final_response["reply"]
    assert final_response["state"] == "menu"
