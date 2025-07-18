/**
 * Valida um JSON contra um schema usando a API do jsonschemavalidator.net.
 * @param {Object} json - Dados JSON a serem validados.
 * @param {Object} schema - Schema JSON para validação.
 * @returns {Promise<Object>} - Resposta da API com resultados da validação.
 */
// sem teste!!!!!!
export async function validateJsonWithSchema(json, schema) {
  const apiUrl = 'https://www.jsonschemavalidator.net/api/jsonschema/validate';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json, schema })
    });

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Falha na validação:', error);
    return { isValid: false, errors: [error.message] };
  }
}

// // Exemplo de uso:
// const exampleJson = { name: "Alice", age: 25 };
// const exampleSchema = {
//   type: "object",
//   properties: {
//     name: { type: "string" },
//     age: { type: "number" }
//   },
//   required: ["name", "age"]
// };

// validateJsonWithSchema(exampleJson, exampleSchema)
//   .then(result => {
//     if (result.isValid) {
//       console.log("✅ JSON válido!");
//     } else {
//       console.log("❌ Erros encontrados:", result.errors);
//     }
//   });