const whatsapp = require("./whatsapp.js");

const PORT = process.env.PORT || 3000;
const phone_number = process.env.NUMBER;
if (!phone_number) {
  console.error("> Número de telefone não definido no .env");
  process.exit(1);
}

whatsapp.startWhatsApp(phone_number);