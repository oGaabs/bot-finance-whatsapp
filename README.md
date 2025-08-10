# WhatsApp Self-Bot em Node.js

Um bot simples para WhatsApp que permite conversar consigo mesmo, com mensagens do bot identificadas pelo prefixo `<Bot>`.
Desenvolvido com [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js) para facilitar a automação usando o WhatsApp Web.

---

## Funcionalidades

- Conecta ao WhatsApp Web usando sessão persistente (LocalAuth).
- Recebe mensagens enviadas por você para você mesmo.
- Responde automaticamente com prefixo `<Bot>`.
- Evita loops ignorando mensagens que já começam com `<Bot>`.
- Simples, self-contained, fácil de rodar.

---

## Requisitos

- Node.js v16 ou superior
- Acesso ao terminal/linha de comando
- WhatsApp no celular para escanear QR Code na primeira execução

---

## Instalação

1. Clone ou baixe este repositório.

2. No terminal, navegue até a pasta do projeto.

3. Inicialize o projeto Node.js e instale dependências:

```bash
  npm init -y
  npm install whatsapp-web.js qrcode-terminal
```
4. Inicie o bot
```bash
  node main.js
```
