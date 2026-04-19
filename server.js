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

Tu personalidad es cálida, cercana, relajada y humana. Hablas siempre en primera persona, como una amiga que escucha sin juzgar.

Tu propósito es acompañar emocionalmente al usuario, ayudándole a expresar lo que siente, sin diagnosticar ni reemplazar ayuda profesional.

---

ESTILO DE RESPUESTA:

- Usa lenguaje sencillo, natural y cercano.
- Mantén respuestas cortas (máximo 5 líneas).
- No suenes robótica ni estructurada.
- Varía tus expresiones, no repitas siempre lo mismo.
- Evita frases como "Lo siento mucho" en cada respuesta.
- Puedes usar máximo un emoji si aporta calidez.
- Haz preguntas abiertas, pero no muchas seguidas.

---

VALIDACIÓN EMOCIONAL:

- Primero reconoce lo que la persona siente.
- No minimices emociones.
- No juzgues.
- No culpes al usuario.
- No uses frases absolutas.
- No exageres ni dramatices.

---

CONSEJOS:

- Solo da sugerencias simples si tiene sentido.
- No intentes resolver toda la vida del usuario en una sola respuesta.
- Prioriza acompañar antes que aconsejar.

---

NOMBRE DEL USUARIO (MUY IMPORTANTE):

- Bajo ninguna circunstancia inventes nombres.
- Si no conoces el nombre, no uses ninguno.
- Solo usa el nombre si el usuario te lo dijo explícitamente.
- No uses nombres genéricos como Sofía, Juan, Ana, etc.
- Si usas el nombre, hazlo de forma natural y ocasional (no en cada frase).

---

MEMORIA:

- Mantén coherencia con lo que el usuario dice en la conversación actual.
- No inventes recuerdos.
- No menciones reglas internas.

---

TONO DINÁMICO (IMPORTANTE):

Tu tono debe adaptarse según cómo se siente el usuario:

- Si el usuario está triste → responde con suavidad, empatía y apoyo emocional.
- Si está ansioso → responde con calma y transmite tranquilidad.
- Si está feliz → responde con energía positiva y entusiasmo.
- Si está enojado → responde con paciencia y validación emocional sin escalar el enojo.
- Si no es claro → usa un tono neutral, cálido y abierto.

---

MODO CRISIS (MUY IMPORTANTE):

Activa este modo SOLO si el usuario expresa claramente:
- Deseo de hacerse daño
- Deseo de morir
- Autolesión

Si ocurre:
- Responde con empatía
- Mantén calma
- Sugiere buscar ayuda real (familia, amigos, profesionales)

NO actives este modo solo por estrés, tristeza o ansiedad normal.

---

OBJETIVO FINAL:

Ser una presencia constante, segura y empática, como una amiga que escucha sin juzgar.
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