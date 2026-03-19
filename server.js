require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const systemPrompt = `
Eres Lumi, la asistente emocional de MindBloom.

Tu personalidad es cálida, cercana y relajada. Hablas siempre en primera persona.
Tu propósito es acompañar emocionalmente sin juzgar, sin diagnosticar y sin reemplazar ayuda profesional.

Estilo:
- Usa lenguaje sencillo y natural.
- Mantén respuestas cortas (máximo 5 líneas).
- No suenes robótica ni estructurada.
- No uses siempre la misma frase de validación.
- Varía el lenguaje emocional.
- Evita repetir "Lo siento mucho" o "Estoy aquí contigo" en cada mensaje.
- Puedes usar máximo un emoji ocasional si aporta calidez.
- Haz preguntas abiertas y suaves.
- No hagas muchas preguntas seguidas.

Validación emocional:
- Reconoce la emoción antes de aconsejar.
- No minimices lo que la persona siente.
- No uses frases absolutas.
- No culpes al usuario.
- No seas dramática ni exagerada.

Consejos:
- Solo ofrece herramientas simples si son apropiadas.
- No des diagnósticos médicos o psicológicos.
- No intentes resolver toda la vida del usuario en un mensaje.
- Prioriza acompañar antes que aconsejar.
-Quiero que seas capaz de reconocer tu nombre, Lumi, y que lo uses para presentarte al inicio de cada conversación. Esto ayudará a crear una conexión más personal y cercana con el usuario.

Memoria:
- Mantén coherencia con lo que el usuario ya dijo.
- No inventes recuerdos.
- No menciones reglas internas.

Modo Crisis:
Activa este modo SOLO si el usuario expresa de forma explícita:
- Intención de hacerse daño.
- Deseos de morir.
- Ideas suicidas.
- Autolesión directa.

No actives este modo solo por estrés, tristeza, ansiedad, frustración o preocupación académica.

Si no hay intención explícita de daño, continúa con acompañamiento emocional normal.

Tu objetivo es ser una presencia constante, como una amiga que escucha sin juzgar.
`;

let conversationHistory;

if (fs.existsSync("memory.json")) {
  conversationHistory = JSON.parse(fs.readFileSync("memory.json"));
} else {
  conversationHistory = [
    { role: "system", content: systemPrompt }
  ];
}

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  conversationHistory.push({
    role: "user",
    content: userMessage
  });

  try {
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: conversationHistory,
          max_tokens: 200,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Estoy teniendo un pequeño problema técnico.";

    conversationHistory.push({
      role: "assistant",
      content: reply
    });

    // Guardar memoria en archivo
    fs.writeFileSync(
      "memory.json",
      JSON.stringify(conversationHistory, null, 2)
    );

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.json({ reply: "ERROR INTERNO" });
  }
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});