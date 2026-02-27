import { tables } from "constants/tables";
import { databases } from "constants/databases";

const GEMINI_API_KEY = "AIzaSyAsn9ejDD89roWq-9PfDQM4SUxYRqhNs84"; // test api key

// Convert schema into readable format for Gemini
const buildSchemaContext = () => {
  let schemaText = "Available Databases and Tables:\n\n";

  databases.forEach((db) => {
    schemaText += `Database: ${db.name}\n`;

    const dbTables = tables.filter((t) => t.databaseId === db.id);

    dbTables.forEach((table) => {
      schemaText += `  Table: ${table.name}\n`;

      table.columns.forEach((col) => {
        schemaText += `    - ${col.name} (${col.type})\n`;
      });

      schemaText += "\n";
    });

    schemaText += "\n";
  });

  return schemaText;
};

export const getSQLQueryFromGemini = async (userInput, setLoading) => {
  try {
    setLoading(true);

    const schemaContext = buildSchemaContext();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are an expert SQL generator.

IMPORTANT RULES:
- Only use tables and columns listed below.
- Generate proper JOIN conditions using matching foreign keys.
- Do NOT guess table names.
- Return ONLY raw SQL query.
- No explanation.
- No markdown.

${schemaContext}

User Request:
"${userInput}"
                  `,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to fetch SQL query");

    const data = await response.json();

    let sqlQuery =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Error generating SQL";

    sqlQuery = sqlQuery.replace(/```sql|```/g, "").trim();

    return sqlQuery;
  } catch (error) {
    console.error("Error generating SQL:", error);
    return "Error generating SQL";
  } finally {
    setLoading(false);
  }
};
