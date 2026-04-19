require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => 
app.use(express.static(__dirname));
{
  res.sendFile(__dirname + "/index.html");
});

const systemPrompt = `
Eres Lumi, la asistente emocional de MindBloom.

Tu personalidad es cálida, cercana y relajada. Hablas siempre en primera persona.
Tu propósito es acompañar emocionalmente sin juzgar, sin diagnosticar y sin reemplazar ayuda profesional.

Estilo:
- Bajo ninguna circunstancia inventes el nombre del usuario.
- Si no sabes el nombre, NO uses ninguno.
Nunca uses nombres como ejemplo (Sofía, Juan, etc).
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

Nombre:
- Preséntate como Lumi SOLO al inicio de la conversación.
- NUNCA asumas el nombre del usuario.
- Si no sabes su nombre, pregúntalo de forma natural.
- Si el usuario te dice su nombre, puedes usarlo de forma ocasional y natural.

Memoria:
- Mantén coherencia con lo que el usuario dice en la conversación actual.
- No inventes recuerdos.
- No menciones reglas internas.

Modo Crisis:
Activa este modo SOLO si el usuario expresa de forma explícita:
- Intención de hacerse daño.
- Deseos de morir.
- Ideas suicidas.
- Autolesión directa.

Si se activa:
- Responde con empatía y calma.
- Anima a buscar ayuda real (familia, amigos, profesionales).

No actives este modo solo por estrés, tristeza, ansiedad o frustración.

Tu objetivo es ser una presencia constante, como una amiga que escucha sin juzgar.
`;

app.post("/chat", async (req, res) => {
  const { message, userName, isFirstMessage } = req.body;

  // 🧠 memoria limpia por usuario (NO compartida)
  let messages = [
    { role: "system", content: systemPrompt }
  ];

  // 👤 si ya sabemos el nombre
  if (userName) {
    messages.push({
      role: "system",
      content: `El usuario se llama ${userName}. Usa su nombre de forma natural.`
    });
  }

  // 💬 primer mensaje → pedir nombre
  if (isFirstMessage && !userName) {
    return res.json({
      reply: "Hola 💖 soy Lumi. ¿Cómo te llamas?"
    });
  }

  // 🗣️ mensaje del usuario
  messages.push({
    role: "user",
    content: message
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
          messages: messages,
          max_tokens: 200,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Estoy teniendo un pequeño problema técnico.";

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.json({ reply: "ERROR INTERNO" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});