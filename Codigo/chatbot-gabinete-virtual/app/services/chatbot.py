import logging
import unicodedata
from dataclasses import dataclass, field
from difflib import get_close_matches
from typing import Any

from app.config import Settings
from app.models.whatsapp import IncomingWhatsAppMessage
from app.services.backend_api import BackendApiClient
from app.services.whatsapp import WhatsAppClient


logger = logging.getLogger(__name__)


@dataclass
class ConversationSession:
    state: str = "menu"
    data: dict[str, Any] = field(default_factory=dict)


class ChatbotService:
    def __init__(
        self,
        settings: Settings,
        whatsapp_client: WhatsAppClient,
        backend_api_client: BackendApiClient,
    ) -> None:
        self.settings = settings
        self.whatsapp_client = whatsapp_client
        self.backend_api_client = backend_api_client
        self.sessions: dict[str, ConversationSession] = {}
        self._demand_options_cache: dict[str, Any] | None = None

    async def handle_webhook(self, payload: dict[str, Any]) -> None:
        for message in self._extract_messages(payload):
            logger.info("Incoming WhatsApp message from %s", message.sender)

            if self.settings.whatsapp_echo_enabled:
                reply = await self.build_reply(message)
                await self.whatsapp_client.send_text_message(message.sender, reply)

    async def build_reply(self, message: IncomingWhatsAppMessage) -> str:
        normalized_text = self._normalize_text(message.text)
        sender_session = self.sessions.setdefault(message.sender, ConversationSession())

        if normalized_text in {"cancelar", "cancelar demanda", "sair", "menu"}:
            self.sessions[message.sender] = ConversationSession()
            return self._menu_message(
                "Fluxo reiniciado. Escolha a opcao desejada para continuar."
            )

        if sender_session.state == "menu":
            return self._handle_menu_selection(sender_session, normalized_text)

        if sender_session.state == "waiting_name":
            return self._handle_name_step(sender_session, message.text)

        if sender_session.state == "waiting_title":
            return self._handle_title_step(sender_session, message.text)

        if sender_session.state == "waiting_description":
            return self._handle_description_step(sender_session, message.text)

        if sender_session.state == "waiting_city":
            return await self._handle_city_step(sender_session, message.text)

        if sender_session.state == "waiting_city_choice":
            return self._handle_city_choice_step(sender_session, normalized_text)

        if sender_session.state == "waiting_institution":
            return await self._handle_institution_step(sender_session, message.text)

        if sender_session.state == "waiting_institution_choice":
            return self._handle_institution_choice_step(sender_session, normalized_text)

        if sender_session.state == "waiting_confirmation":
            return await self._handle_confirmation_step(
                sender_session,
                message.sender,
                normalized_text,
            )

        self.sessions[message.sender] = ConversationSession()
        return self._menu_message()

    def _handle_menu_selection(
        self,
        session: ConversationSession,
        normalized_text: str,
    ) -> str:
        if normalized_text in {"1", "abrir demanda", "demanda", "abrir"}:
            session.state = "waiting_name"
            session.data = {}
            return (
                "Perfeito. Vamos abrir sua demanda.\n"
                "Primeiro, me informe seu nome completo."
            )

        return self._menu_message()

    def _handle_name_step(self, session: ConversationSession, text: str) -> str:
        cleaned_text = text.strip()

        if len(cleaned_text) < 3:
            return "Preciso de um nome um pouco mais completo. Qual e o seu nome?"

        session.data["citizen_name"] = cleaned_text
        session.state = "waiting_title"

        return "Agora me diga um titulo curto para a demanda."

    def _handle_title_step(self, session: ConversationSession, text: str) -> str:
        cleaned_text = text.strip()

        if len(cleaned_text) < 4:
            return "O titulo ficou muito curto. Descreva o assunto em poucas palavras."

        session.data["title"] = cleaned_text
        session.state = "waiting_description"

        return (
            "Certo. Agora explique um pouco melhor a demanda.\n"
            "Quanto mais contexto voce der, melhor a equipe consegue analisar."
        )

    def _handle_description_step(self, session: ConversationSession, text: str) -> str:
        cleaned_text = text.strip()

        if len(cleaned_text) < 10:
            return "Preciso de uma descricao mais detalhada para registrar a demanda."

        session.data["description"] = cleaned_text
        session.state = "waiting_city"

        return "Informe o nome da cidade relacionada a essa demanda."

    async def _handle_city_step(self, session: ConversationSession, text: str) -> str:
        city_options = (await self._get_demand_options()).get("cities", [])
        return self._match_named_option(
            session=session,
            text=text,
            options=city_options,
            key="name",
            next_state="waiting_city_choice",
            storage_key="city_candidates",
            singular_label="cidade",
            success_callback=self._select_city,
        )

    def _handle_city_choice_step(
        self,
        session: ConversationSession,
        normalized_text: str,
    ) -> str:
        selection_message = self._resolve_numbered_choice(
            session=session,
            normalized_text=normalized_text,
            storage_key="city_candidates",
            singular_label="cidade",
            success_callback=self._select_city,
        )

        return selection_message

    async def _handle_institution_step(
        self,
        session: ConversationSession,
        text: str,
    ) -> str:
        selected_city_id = session.data.get("city_id")
        all_institutions = (await self._get_demand_options()).get("institutions", [])
        institutions = [
            institution
            for institution in all_institutions
            if institution.get("city_id") == selected_city_id
        ]

        if not institutions:
            session.state = "waiting_city"
            return (
                "Nao encontrei instituicoes cadastradas para essa cidade.\n"
                "Informe outra cidade para continuar."
            )

        return self._match_named_option(
            session=session,
            text=text,
            options=institutions,
            key="name",
            next_state="waiting_institution_choice",
            storage_key="institution_candidates",
            singular_label="instituicao",
            success_callback=self._select_institution,
        )

    def _handle_institution_choice_step(
        self,
        session: ConversationSession,
        normalized_text: str,
    ) -> str:
        return self._resolve_numbered_choice(
            session=session,
            normalized_text=normalized_text,
            storage_key="institution_candidates",
            singular_label="instituicao",
            success_callback=self._select_institution,
        )

    async def _handle_confirmation_step(
        self,
        session: ConversationSession,
        sender: str,
        normalized_text: str,
    ) -> str:
        if normalized_text not in {"1", "sim", "confirmar"}:
            if normalized_text in {"2", "nao", "não"}:
                session.state = "waiting_title"
                return (
                    "Tudo bem. Vamos ajustar.\n"
                    "Me envie novamente o titulo da demanda."
                )

            return (
                "Responda com 1 para confirmar a abertura da demanda ou 2 para editar."
            )

        try:
            demand = await self.backend_api_client.create_demand(
                {
                    "citizen_name": session.data["citizen_name"],
                    "phone": sender,
                    "title": session.data["title"],
                    "description": session.data["description"],
                    "priority": None,
                    "city_id": session.data["city_id"],
                    "institution_id": session.data["institution_id"],
                }
            )
        except Exception:
            logger.exception("Failed to create demand from WhatsApp flow.")
            return (
                "Nao consegui registrar sua demanda agora.\n"
                "Responda 1 para tentar novamente ou cancelar para encerrar."
            )

        session.state = "menu"
        session.data = {}

        return (
            "Demanda aberta com sucesso.\n"
            f"Protocolo interno: #{demand.get('id')}\n"
            "Ela foi registrada com status Em analise e sera atribuida para a equipe.\n"
            "Se quiser abrir outra demanda, responda 1."
        )

    def _match_named_option(
        self,
        session: ConversationSession,
        text: str,
        options: list[dict[str, Any]],
        key: str,
        next_state: str,
        storage_key: str,
        singular_label: str,
        success_callback: Any,
    ) -> str:
        query = self._normalize_text(text)

        if not query:
            return f"Informe o nome da {singular_label}."

        exact_matches = [
            option for option in options if self._normalize_text(str(option.get(key, ""))) == query
        ]

        if len(exact_matches) == 1:
            return success_callback(session, exact_matches[0])

        contains_matches = [
            option for option in options if query in self._normalize_text(str(option.get(key, "")))
        ]

        if len(contains_matches) == 1:
            return success_callback(session, contains_matches[0])

        candidates = contains_matches

        if not candidates:
            normalized_options = {
                self._normalize_text(str(option.get(key, ""))): option for option in options
            }
            close_matches = get_close_matches(
                query,
                list(normalized_options.keys()),
                n=5,
                cutoff=0.5,
            )
            candidates = [normalized_options[match] for match in close_matches]

        if not candidates:
            return (
                f"Nao encontrei nenhuma {singular_label} com esse nome.\n"
                f"Tente informar novamente a {singular_label}."
            )

        session.state = next_state
        session.data[storage_key] = candidates[:5]

        numbered_options = "\n".join(
            f"{index} - {candidate.get(key)}"
            for index, candidate in enumerate(session.data[storage_key], start=1)
        )

        return (
            f"Encontrei mais de uma {singular_label}. Escolha pelo numero:\n"
            f"{numbered_options}"
        )

    def _resolve_numbered_choice(
        self,
        session: ConversationSession,
        normalized_text: str,
        storage_key: str,
        singular_label: str,
        success_callback: Any,
    ) -> str:
        candidates = session.data.get(storage_key, [])

        if not normalized_text.isdigit():
            return f"Responda com o numero da {singular_label} desejada."

        selected_index = int(normalized_text) - 1

        if selected_index < 0 or selected_index >= len(candidates):
            return f"Escolha um numero valido para a {singular_label}."

        selected_option = candidates[selected_index]
        session.data.pop(storage_key, None)

        return success_callback(session, selected_option)

    def _select_city(self, session: ConversationSession, city: dict[str, Any]) -> str:
        session.data["city_id"] = city["id"]
        session.data["city_name"] = city["name"]
        session.state = "waiting_institution"

        return (
            f"Cidade selecionada: {city['name']}.\n"
            "Agora informe o nome da instituicao relacionada a demanda."
        )

    def _select_institution(
        self,
        session: ConversationSession,
        institution: dict[str, Any],
    ) -> str:
        session.data["institution_id"] = institution["id"]
        session.data["institution_name"] = institution["name"]
        session.data["priority"] = None
        session.state = "waiting_confirmation"

        return (
            f"Instituicao selecionada: {institution['name']}.\n"
            "A prioridade sera definida posteriormente pelo gestor responsavel.\n"
            f"{self._build_confirmation_message(session)}"
        )

    def _build_confirmation_message(self, session: ConversationSession) -> str:
        return (
            "Confirme os dados da demanda:\n"
            f"Nome: {session.data['citizen_name']}\n"
            f"Titulo: {session.data['title']}\n"
            f"Descricao: {session.data['description']}\n"
            f"Cidade: {session.data['city_name']}\n"
            f"Instituicao: {session.data['institution_name']}\n"
            "Prioridade: A definir pelo gestor\n"
            "Status inicial: Em analise\n\n"
            "Responda 1 para confirmar ou 2 para editar o titulo."
        )

    async def _get_demand_options(self) -> dict[str, Any]:
        if self._demand_options_cache is None:
            self._demand_options_cache = await self.backend_api_client.get_demand_options()

        return self._demand_options_cache

    def _menu_message(self, prefix: str | None = None) -> str:
        message = (
            "Ola! Sou o assistente do Gabinete Virtual.\n"
            "Posso te ajudar a registrar uma demanda para a equipe da deputada.\n\n"
            "1 - Abrir demanda\n"
            "Digite 1 para continuar ou cancelar para encerrar."
        )

        if prefix:
            return f"{prefix}\n\n{message}"

        return message

    def _normalize_text(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value)
        ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
        return " ".join(ascii_text.lower().strip().split())

    def _extract_messages(self, payload: dict[str, Any]) -> list[IncomingWhatsAppMessage]:
        messages: list[IncomingWhatsAppMessage] = []

        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                contacts = value.get("contacts", [])
                messages_payload = value.get("messages", [])
                sender = contacts[0]["wa_id"] if contacts else None

                for message in messages_payload:
                    if message.get("type") != "text":
                        continue

                    text_body = message.get("text", {}).get("body")
                    message_id = message.get("id")
                    sender_id = message.get("from") or sender

                    if not text_body or not message_id or not sender_id:
                        continue

                    messages.append(
                        IncomingWhatsAppMessage(
                            sender=sender_id,
                            message_id=message_id,
                            text=text_body,
                        )
                    )

        return messages
