require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
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


// 🧠 DETECTOR DE GÉNERO
function detectGender(text) {
  const t = text.toLowerCase();

  if (
    t.includes("soy mujer") ||
    t.includes("soy chica") ||
    t.includes("soy femenina")
  ) return "femenino";

  if (
    t.includes("soy hombre") ||
    t.includes("soy chico") ||
    t.includes("soy masculino")
  ) return "masculino";

  return "neutral";
}


// 🧠 LIMPIAR NOMBRE (TOLERANTE A ERRORES)
function cleanUserName(text) {
  let name = text.toLowerCase();

  name = name
    .replace(/me\s*y?a?m?o/i, "")
    .replace(/soy/i, "")
    .replace(/soi/i, "")
    .replace(/mi\s*nombre\s*es/i, "")
    .trim();

  name = name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
  name = name.split(" ")[0];

  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return name;
}


// 💖 PROMPT COMPLETO
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

NOMBRE DEL USUARIO:

- Nunca inventes nombres.
- Solo usa el nombre si el usuario lo dijo.
- No uses nombres genéricos.

---

GÉNERO DEL USUARIO:

- No asumas el género.
- Solo usa género si el usuario lo indicó.
- Si no sabes, usa lenguaje neutral.

---

MEMORIA:

- Mantén coherencia con la conversación.
- No inventes recuerdos.

---

TONO DINÁMICO:

- Triste → empatía suave
- Ansioso → calma
- Feliz → energía positiva
- Enojado → paciencia
- Neutral → cálido

---

MODO CRISIS:

Activa solo si hay intención de daño.

---

OBJETIVO:

Ser una presencia emocional cercana y humana.
`;


// 💬 CHAT
app.post("/chat", async (req, res) => {
  let { message, userName } = req.body;

  // limpiar nombre si viene mal
  if (userName) {
    userName = cleanUserName(userName);
  }

  const emotion = detectEmotion(message);
  const gender = detectGender(message);

  let messages = [
    { role: "system", content: systemPrompt }
  ];

  // nombre
  if (userName) {
    messages.push({
      role: "system",
      content: `El usuario se llama ${userName}. No uses ningún otro nombre.`
    });
  }

  // género
  if (gender === "femenino") {
    messages.push({
      role: "system",
      content: "El usuario se identifica como mujer."
    });
  }

  if (gender === "masculino") {
    messages.push({
      role: "system",
      content: "El usuario se identifica como hombre."
    });
  }

  // tono emocional
  if (emotion === "triste") {
    messages.push({
      role: "system",
      content: "Responde con mucha empatía y suavidad."
    });
  }

  if (emotion === "ansioso") {
    messages.push({
      role: "system",
      content: "Responde con calma y tranquilidad."
    });
  }

  if (emotion === "feliz") {
    messages.push({
      role: "system",
      content: "Responde con entusiasmo positivo."
    });
  }

  if (emotion === "enojado") {
    messages.push({
      role: "system",
      content: "Responde con paciencia y validación emocional."
    });
  }

  // mensaje usuario
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
          messages,
          max_tokens: 200,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

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