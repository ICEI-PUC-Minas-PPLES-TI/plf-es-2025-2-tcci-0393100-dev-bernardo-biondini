import logging
import unicodedata
from dataclasses import dataclass, field
from difflib import get_close_matches
from typing import Any

from app.config import Settings
from app.models.whatsapp import IncomingWhatsAppMessage
from app.services.backend_api import BackendApiClient
from app.services.demand_validation import DemandValidationException, DemandValidationService
from app.services.whatsapp import WhatsAppApiError, WhatsAppClient


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
        demand_validation_service: DemandValidationService | None = None,
    ) -> None:
        self.settings = settings
        self.whatsapp_client = whatsapp_client
        self.backend_api_client = backend_api_client
        self.demand_validation_service = demand_validation_service
        self.sessions: dict[str, ConversationSession] = {}

    async def handle_webhook(self, payload: dict[str, Any]) -> None:
        for message in self._extract_messages(payload):
            logger.info("Incoming WhatsApp message from %s", message.sender)

            if self.settings.whatsapp_echo_enabled:
                try:
                    reply = await self.build_reply(message)
                    await self.whatsapp_client.send_text_message(message.sender, reply)
                except WhatsAppApiError as exc:
                    logger.exception(
                        "Failed to send WhatsApp reply to %s. Meta response: %s",
                        message.sender,
                        exc.response_text,
                    )
                except Exception:
                    logger.exception(
                        "Failed to process WhatsApp message %s from %s.",
                        message.message_id,
                        message.sender,
                    )

    async def build_reply(self, message: IncomingWhatsAppMessage) -> str:
        normalized_text = self._normalize_text(message.text)
        sender_session = self.sessions.setdefault(message.sender, ConversationSession())

        if normalized_text in {"cancelar", "cancelar demanda", "sair", "menu"}:
            self.sessions[message.sender] = ConversationSession()
            return self._menu_message(
                "Fluxo reiniciado. Escolha a opcao desejada para continuar."
            )

        if sender_session.state == "menu":
            return await self._handle_menu_selection(
                sender_session,
                normalized_text,
                message.sender,
            )

        if sender_session.state == "waiting_name":
            return self._handle_name_step(sender_session, message.text)

        if sender_session.state == "waiting_updates_preference":
            return await self._handle_updates_preference_step(
                sender_session,
                normalized_text,
                message.sender,
            )

        if sender_session.state == "waiting_title":
            return self._handle_title_step(sender_session, message.text)

        if sender_session.state == "waiting_description":
            return self._handle_description_step(sender_session, message.text)

        if sender_session.state == "waiting_city":
            return await self._handle_city_step(sender_session, message.text)

        if sender_session.state == "waiting_city_choice":
            return await self._handle_city_choice_step(sender_session, normalized_text)

        if sender_session.state == "waiting_institution_choice":
            return self._handle_institution_choice_step(sender_session, normalized_text)

        if sender_session.state == "waiting_confirmation":
            return await self._handle_confirmation_step(
                sender_session,
                normalized_text,
            )

        self.sessions[message.sender] = ConversationSession()
        return self._menu_message()

    async def _handle_menu_selection(
        self,
        session: ConversationSession,
        normalized_text: str,
        sender: str,
    ) -> str:
        if normalized_text in {"1", "abrir demanda", "demanda", "abrir"}:
            session.data = {}
            return await self._start_demand_flow(session, sender)

        return self._menu_message()

    def _handle_name_step(self, session: ConversationSession, text: str) -> str:
        cleaned_text = text.strip()

        if len(cleaned_text) < 3:
            return "Preciso de um nome um pouco mais completo. Qual e o seu nome?"

        session.data["citizen_name"] = cleaned_text
        session.state = "waiting_updates_preference"

        return (
            "Voce deseja receber atualizacoes sobre suas demandas?\n"
            "Responda 1 para sim ou 2 para nao."
        )

    async def _handle_updates_preference_step(
        self,
        session: ConversationSession,
        normalized_text: str,
        sender: str,
    ) -> str:
        if normalized_text not in {"1", "2", "sim", "nao", "não"}:
            return (
                "Responda 1 para receber atualizacoes da demanda "
                "ou 2 para nao receber."
            )

        receive_demand_updates = normalized_text in {"1", "sim"}

        try:
            citizen = await self.backend_api_client.register_citizen(
                name=session.data["citizen_name"],
                phone=sender,
                receive_demand_updates=receive_demand_updates,
            )
        except Exception:
            logger.exception("Failed to register citizen by phone %s.", sender)
            return (
                "Nao consegui concluir seu cadastro agora.\n"
                "Responda 1 para tentar novamente ou cancelar para encerrar."
            )

        session.data["citizen_id"] = citizen["id"]
        session.data["citizen_name"] = citizen["name"]
        session.data["receive_demand_updates"] = citizen.get(
            "receive_demand_updates",
            receive_demand_updates,
        )
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

        return "Informe pelo menos as primeiras 2 letras da cidade relacionada a essa demanda."

    async def _handle_city_step(self, session: ConversationSession, text: str) -> str:
        query = text.strip()

        if len(query) < 2:
            return "Informe pelo menos as primeiras 2 letras da cidade."

        city_options = await self.backend_api_client.search_cities(query, limit=5)

        if not city_options:
            return (
                "Nao encontrei cidades com esse inicio.\n"
                "Tente digitar novamente as primeiras letras da cidade."
            )

        if len(city_options) == 1:
            return await self._select_city(session, city_options[0])

        session.state = "waiting_city_choice"
        session.data["city_candidates"] = city_options

        return self._build_numbered_options_message(
            singular_label="cidade",
            options=city_options,
            label_builder=lambda city: f"{city['name']} ({city.get('region', 'Sem regiao')})",
        )

    async def _handle_city_choice_step(
        self,
        session: ConversationSession,
        normalized_text: str,
    ) -> str:
        candidates = session.data.get("city_candidates", [])

        if not normalized_text.isdigit():
            return "Responda com o numero da cidade desejada."

        selected_index = int(normalized_text) - 1

        if selected_index < 0 or selected_index >= len(candidates):
            return "Escolha um numero valido para a cidade."

        selected_option = candidates[selected_index]
        session.data.pop("city_candidates", None)

        return await self._select_city(session, selected_option)

    def _handle_institution_choice_step(
        self,
        session: ConversationSession,
        normalized_text: str,
    ) -> str:
        if normalized_text in {"0", "nenhuma", "sem instituicao", "sem instituicao.", "em branco"}:
            return self._select_institution(session, None)

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

        demand_payload = self._build_demand_payload(session)

        try:
            demand, validation_error = await self._submit_demand(demand_payload)
        except Exception:
            logger.exception("Failed to create demand from WhatsApp flow.")
            return (
                "Nao consegui registrar sua demanda agora.\n"
                "Responda 1 para tentar novamente ou cancelar para encerrar."
            )

        session.state = "menu"
        session.data = {}

        if validation_error is not None:
            return (
                "Sua demanda foi registrada, mas marcada como descartada e nao seguira "
                "para o fluxo normal de aprovacao.\n"
                f"Motivo: {validation_error.reply_message}\n"
                f"Protocolo interno: #{demand.get('id')}\n"
                "Se quiser abrir outra demanda, responda 1."
            )

        return (
            "Demanda aberta com sucesso.\n"
            f"Protocolo interno: #{demand.get('id')}\n"
            "Ela foi registrada com status Em analise e sera atribuida para a equipe.\n"
            "Se quiser abrir outra demanda, responda 1."
        )

    def _build_demand_payload(
        self,
        session: ConversationSession,
    ) -> dict[str, Any]:
        return {
            "citizen_id": session.data["citizen_id"],
            "title": session.data["title"],
            "description": session.data["description"],
            "priority": None,
            "city_id": session.data["city_id"],
            "institution_id": session.data["institution_id"],
        }

    async def _submit_demand(
        self,
        demand_payload: dict[str, Any],
    ) -> tuple[dict[str, Any], DemandValidationException | None]:
        validation_error: DemandValidationException | None = None

        if self.demand_validation_service is not None:
            try:
                await self.demand_validation_service.validate(demand_payload)
            except DemandValidationException as exc:
                validation_error = exc

        demand = await self.backend_api_client.create_demand(
            {
                "can_create": validation_error is None,
                "reason": validation_error.reason if validation_error else None,
                "message": validation_error.backend_message if validation_error else None,
                "demanda": demand_payload,
            }
        )

        return demand, validation_error

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

    async def _select_city(self, session: ConversationSession, city: dict[str, Any]) -> str:
        session.data["city_id"] = city["id"]
        session.data["city_name"] = city["name"]
        institutions = await self.backend_api_client.get_city_institutions(city["id"])
        session.data["institution_candidates"] = institutions

        if not institutions:
            return self._select_institution(session, None)

        session.state = "waiting_institution_choice"

        numbered_options = "\n".join(
            f"{index} - {institution.get('name')}"
            for index, institution in enumerate(institutions, start=1)
        )

        return (
            f"Cidade selecionada: {city['name']}.\n"
            "Escolha a instituicao pelo numero ou responda 0 para deixar em branco:\n"
            f"0 - Nenhuma instituicao\n{numbered_options}"
        )

    def _select_institution(
        self,
        session: ConversationSession,
        institution: dict[str, Any] | None,
    ) -> str:
        session.data["institution_id"] = institution["id"] if institution else None
        session.data["institution_name"] = institution["name"] if institution else None
        session.data["priority"] = None
        session.data.pop("institution_candidates", None)
        session.state = "waiting_confirmation"

        institution_label = (
            f"Instituicao selecionada: {institution['name']}.\n"
            if institution
            else "Instituicao: nao informada.\n"
        )

        return (
            institution_label
            +
            "A prioridade sera definida posteriormente pelo gestor responsavel.\n"
            f"{self._build_confirmation_message(session)}"
        )

    def _build_confirmation_message(self, session: ConversationSession) -> str:
        return (
            "Confirme os dados da demanda:\n"
            f"Nome: {session.data['citizen_name']}\n"
            "Receber atualizacoes: "
            f"{'Sim' if session.data.get('receive_demand_updates') else 'Nao'}\n"
            f"Titulo: {session.data['title']}\n"
            f"Descricao: {session.data['description']}\n"
            f"Cidade: {session.data['city_name']}\n"
            f"Instituicao: {session.data.get('institution_name') or 'Nao informada'}\n"
            "Prioridade: A definir pelo gestor\n"
            "Status inicial: Em analise\n\n"
            "Responda 1 para confirmar ou 2 para editar o titulo."
        )

    async def _start_demand_flow(
        self,
        session: ConversationSession,
        sender: str,
    ) -> str:
        try:
            citizen = await self.backend_api_client.find_citizen_by_phone(sender)
        except Exception:
            logger.exception("Failed to lookup citizen by phone %s.", sender)
            return (
                "Nao consegui verificar seu cadastro agora.\n"
                "Responda 1 para tentar novamente ou cancelar para encerrar."
            )

        if citizen is None:
            session.state = "waiting_name"
            return (
                "Perfeito. Vamos abrir sua demanda.\n"
                "Primeiro, me informe seu nome completo."
            )

        session.data.update(
            {
                "citizen_id": citizen["id"],
                "citizen_name": citizen["name"],
                "receive_demand_updates": citizen.get("receive_demand_updates", False),
            }
        )
        session.state = "waiting_title"

        return (
            f"Identifiquei seu cadastro, {citizen['name']}.\n"
            "Vamos seguir com a abertura da demanda.\n"
            "Agora me diga um titulo curto para a demanda."
        )

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

    def _build_numbered_options_message(
        self,
        singular_label: str,
        options: list[dict[str, Any]],
        label_builder: Any,
    ) -> str:
        numbered_options = "\n".join(
            f"{index} - {label_builder(option)}"
            for index, option in enumerate(options, start=1)
        )

        return (
            f"Encontrei mais de uma {singular_label}. Escolha pelo numero:\n"
            f"{numbered_options}"
        )

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
