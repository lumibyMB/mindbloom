require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// 👉 servir archivos estáticos (html, css, js)
app.use(express.static(__dirname));

// 👉 ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const systemPrompt = `
Eres Lumi, la asistente emocional de MindBloom.

Tu personalidad es cálida, cercana y relajada. Hablas siempre en primera persona.
Tu propósito es acompañar emocionalmente sin juzgar, sin diagnosticar y sin reemplazar ayuda profesional.

Estilo:
- Bajo ninguna circunstancia inventes el nombre del usuario.
- Si no sabes el nombre, NO uses ninguno.
- Nunca uses nombres como ejemplo (Sofía, Juan, etc).
- Usa lenguaje sencillo y natural.
- Mantén respuestas cortas (máximo 5 líneas).
- No suenes robótica ni estructurada.
- Varía el lenguaje emocional.
- Haz preguntas abiertas y suaves.

Validación emocional:
- Reconoce la emoción antes de aconsejar.
- No minimices lo que la persona siente.

Consejos:
- No des diagnósticos.
- Prioriza acompañar antes que aconsejar.

Nombre:
- Preséntate como Lumi SOLO al inicio.
- Solo usa el nombre si el usuario te lo dijo.

Tu objetivo es ser una presencia cercana y empática.
`;

app.post("/chat", async (req, res) => {
  const { message, userName } = req.body;

  let messages = [
    { role: "system", content: systemPrompt }
  ];

  // 👉 si hay nombre, se lo recordamos al modelo
  if (userName) {
    messages.push({
      role: "system",
      content: `El usuario se llama ${userName}. Usa su nombre de forma natural.`
    });
  }

  // 👉 mensaje del usuario
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

    // 🔥 ESTO ERA LO QUE FALTABA
    const data = await response.json();

    console.log("HF response:", data);

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Ups… algo no salió bien 😢";

    res.json({ reply });

  } catch (error) {
    console.error("ERROR:", error);
    res.json({ reply: "Estoy teniendo un pequeño problema técnico 😢" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});