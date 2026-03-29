from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_demo_chat_mock_flow() -> None:
    sender = "demo-video-user"

    def send(text: str, reset_session: bool = False) -> dict:
        response = client.post(
            "/demo/chat",
            json={
                "mode": "mock",
                "sender": sender,
                "text": text,
                "reset_session": reset_session,
            },
        )

        assert response.status_code == 200
        return response.json()

    assert "1 - Abrir demanda" in send("oi", reset_session=True)["reply"]
    assert "nome completo" in send("1")["reply"]
    assert "titulo curto" in send("Maria Silva")["reply"]
    assert "explique um pouco melhor" in send("Falta de atendimento")["reply"]
    assert "Informe o nome da cidade" in send(
        "Preciso de ajuda com atendimento de saude no meu bairro."
    )["reply"]
    assert "Cidade selecionada" in send("Belo Horizonte")["reply"]
    confirmation = send(
        "Prefeitura de Belo Horizonte"
    )["reply"]
    assert "A definir pelo gestor" in confirmation
    assert "Status inicial: Em analise" in confirmation

    final_response = send("1")

    assert "Demanda aberta com sucesso" in final_response["reply"]
    assert final_response["state"] == "menu"
