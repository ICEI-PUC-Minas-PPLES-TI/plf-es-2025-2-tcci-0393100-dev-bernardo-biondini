from pydantic import BaseModel


class IncomingWhatsAppMessage(BaseModel):
    sender: str
    message_id: str
    text: str
