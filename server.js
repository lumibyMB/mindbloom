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


// 🧠 DETECTOR DE EMOCIÓN
function detectEmotion(text) {
  const t = text.toLowerCase();

  if (t.includes("triste") || t.includes("mal") || t.includes("llorar"))
    return "triste";

  if (t.includes("ansioso") || t.includes("estres") || t.includes("nervioso"))
    return "ansioso";

  if (t.includes("feliz") || t.includes("bien") || t.includes("contento"))
    return "feliz";

  if (t.includes("enojado") || t.includes("molesto") || t.includes("frustrado"))
    return "enojado";

  return "neutral";
}


// 🧠 LIMPIAR NOMBRE (TOLERANTE A ERRORES)
function cleanUserName(text) {
  let name = text.toLowerCase();

  name = name
    .replace(/me\s*y?a?m?o/i, "")   // me llamo / me yamo
    .replace(/soy/i, "")
    .replace(/soi/i, "")
    .replace(/mi\s*nombre\s*es/i, "")
    .trim();

  // quitar símbolos raros
  name = name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");

  // tomar primera palabra
  name = name.split(" ")[0];

  // capitalizar
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return name;
}


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
- No hagas preguntas en cada respuesta.
- Alterna entre:
  • escuchar
  • validar emociones
  • comentar de forma natural
  • y ocasionalmente hacer una pregunta
- Solo haz preguntas si realmente aportan a la conversación.
- A veces es mejor no preguntar y solo acompañar.

---

VALIDACIÓN EMOCIONAL:

- Primero reconoce lo que la persona siente.
- No minimices emociones.
- No juzgues.
- No culpes al usuario.
- No uses frases absolutas.
- No exageres ni dramatices.
- No conviertas la conversación en una entrevista.
- Evita repetir preguntas similares.
- Si ya hiciste una pregunta, deja espacio antes de hacer otra.
- A veces responde sin hacer preguntas, solo acompañando con una reflexión o comentario.

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
  let { message, userName } = req.body;

  // 🧠 limpiar nombre si viene sucio
  if (userName) {
    userName = cleanUserName(userName);
  }

  const emotion = detectEmotion(message);

  let messages = [
    { role: "system", content: systemPrompt }
  ];

  // 👉 nombre limpio
  if (userName) {
    messages.push({
      role: "system",
      content: `El usuario se llama ${userName}. No uses ningún otro nombre.`
    });
  }

  // 🎭 tono dinámico real
  if (emotion === "triste") {
    messages.push({
      role: "system",
      content: "Responde con mucha empatía, suavidad y apoyo emocional."
    });
  }

  if (emotion === "ansioso") {
    messages.push({
      role: "system",
      content: "Responde con calma, tranquilidad y ayuda a relajar."
    });
  }

  if (emotion === "feliz") {
    messages.push({
      role: "system",
      content: "Responde con energía positiva y entusiasmo."
    });
  }

  if (emotion === "enojado") {
    messages.push({
      role: "system",
      content: "Responde con paciencia y validación emocional."
    });
  }

  // 👉 mensaje usuario
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