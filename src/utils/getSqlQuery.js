import { tables } from "constants/tables";
import { databases } from "constants/databases";
import { columnsMapping } from "constants/mappings";

const DUMMY = "AIzaSyDRDwy3euAQuwn8s12oKM5RcfEIs-fgKVM"; // test api key

// Auto detect foreign keys based on *_id naming
const detectForeignKeys = (tableName, columns) => {
  const foreignKeys = [];

  columns.forEach((col) => {
    if (col.accessorKey.endsWith("_id") && col.accessorKey !== "id") {
      const referencedTable = col.accessorKey
        .replace("_id", "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      foreignKeys.push(
        `${col.accessorKey} references ${referencedTable}.id`
      );
    }
  });

  return foreignKeys;
};

const buildSchemaContext = () => {
  let schemaText = "DATABASE SCHEMA:\n\n";

  databases.forEach((db) => {
    schemaText += `Database: ${db.name}\n`;

    const dbTables = tables[db.id] || [];

    dbTables.forEach((table) => {
      schemaText += `  Table: ${table.name}\n`;

      const columns = columnsMapping[table.id] || [];

      schemaText += `    Columns:\n`;
      columns.forEach((col) => {
        schemaText += `      - ${col.accessorKey}\n`;
      });

      const foreignKeys = detectForeignKeys(
        table.name,
        columns
      );

      if (foreignKeys.length) {
        schemaText += `    Foreign Keys:\n`;
        foreignKeys.forEach((fk) => {
          schemaText += `      - ${fk}\n`;
        });
      }

      schemaText += "\n";
    });

    schemaText += "\n";
  });

  return schemaText;
};

export const getSQLQueryFromGemini = async (
  userInput,
  setLoading
) => {
  try {
    setLoading(true);

    const schemaContext = buildSchemaContext();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${DUMMY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are an expert SQL generator.

STRICT RULES:
- Use ONLY tables and columns from the schema below.
- Use foreign keys for JOIN conditions.
- Do NOT invent columns.
- Do NOT invent tables.
- Always use proper SQL JOIN syntax.
- Return ONLY raw SQL.
- No markdown.
- No explanation.

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

    if (!response.ok) {
      throw new Error("Failed to fetch SQL query");
    }

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
