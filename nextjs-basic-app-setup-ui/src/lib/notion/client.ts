import { Client } from "@notionhq/client";

export interface NotionDatabasePage {
  id: string;
  properties: {
    [key: string]: {
      type: string;
      [key: string]: any;
    };
  };
  created_time: string;
  last_edited_time: string;
}

export interface NotionQueryResult {
  results: NotionDatabasePage[];
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Valida que un token de Notion funcione correctamente
 */
export async function validateNotionToken(token: string): Promise<boolean> {
  try {
    const notion = new Client({ auth: token });
    // Intentar obtener información del usuario para validar el token
    await notion.users.me();
    return true;
  } catch (error: any) {
    console.error("Error validating Notion token:", error);
    // Si el error es específico de autenticación, lanzarlo para mostrar mensaje más claro
    if (error?.code === "unauthorized" || error?.status === 401) {
      throw new Error("Token de Notion inválido o sin permisos");
    }
    return false;
  }
}

/**
 * Consulta una base de datos de Notion
 */
export async function queryNotionDatabase(
  databaseId: string,
  token: string,
  filter?: any,
  sorts?: any[],
  startCursor?: string | null
): Promise<NotionQueryResult> {
  const notion = new Client({ auth: token });

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter,
      sorts: sorts || [
        {
          property: "Fecha del movimiento",
          direction: "descending",
        },
      ],
      ...(startCursor && { start_cursor: startCursor }),
    });

    return {
      results: response.results as NotionDatabasePage[],
      has_more: response.has_more,
      next_cursor: response.next_cursor,
    };
  } catch (error) {
    console.error("Error querying Notion database:", error);
    throw error;
  }
}

/** Normaliza nombre de propiedad para comparación (minúsculas, trim, espacios colapsados) */
function normalizePropName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Obtiene el mapa nombre de propiedad → id para una base de datos.
 * Incluye claves exactas y normalizadas para encontrar "Fecha del gasto" aunque varíe la grafía.
 */
export async function getDatabasePropertyNameToId(
  databaseId: string,
  token: string
): Promise<Record<string, string>> {
  const notion = new Client({ auth: token });
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const props = (db as { properties?: Record<string, { name?: string }> }).properties;
  if (!props) return {};
  const nameToId: Record<string, string> = {};
  for (const [id, schema] of Object.entries(props)) {
    const name = schema?.name;
    if (name) {
      nameToId[name] = id;
      nameToId[normalizePropName(name)] = id;
    }
  }
  return nameToId;
}

/**
 * Devuelve la propiedad de una página por nombre esperado.
 * Prueba: id (desde esquema), nombre exacto, y clave cuyo nombre normalizado coincida.
 */
export function getPagePropertyByExpectedName(
  properties: NotionDatabasePage["properties"],
  expectedName: string,
  nameToId: Record<string, string> | null
): unknown {
  const normalized = normalizePropName(expectedName);
  const byId = nameToId?.[expectedName] ?? nameToId?.[normalized];
  if (byId && properties[byId] !== undefined) return properties[byId];
  if (properties[expectedName] !== undefined) return properties[expectedName];
  for (const key of Object.keys(properties)) {
    if (normalizePropName(key) === normalized) return properties[key];
  }
  return undefined;
}

/**
 * Obtiene todas las páginas de una base de datos (maneja paginación)
 */
export async function getAllNotionPages(
  databaseId: string,
  token: string,
  filter?: any
): Promise<NotionDatabasePage[]> {
  const allPages: NotionDatabasePage[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const result = await queryNotionDatabase(
      databaseId,
      token,
      filter,
      [{ property: "Fecha del movimiento", direction: "descending" }],
      cursor
    );

    allPages.push(...result.results);
    hasMore = result.has_more;
    cursor = result.next_cursor;
  }

  return allPages;
}

/**
 * Parsea un valor de cantidad que puede venir como número o texto "10,00 €" / "1.234,56 €"
 */
export function parseNotionAmount(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

/**
 * Parsea una fecha como día local (sin cambiar de día por zona horaria).
 * Acepta: Date, ISO "2026-01-29" o "2026-01-29T...", día/mes/año (29/01/2026, 29-01-2026, 29.01.2026), mes/día/año (01/29/2026).
 */
function parseDateOnlyAsLocal(year: number, month: number, day: number): Date | null {
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseNotionDate(
  value: string | number | Date | null | undefined
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // ISO solo fecha (YYYY-MM-DD): interpretar como día local para no cambiar de día por timezone
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDateOnly) {
    const [, y, m, d] = isoDateOnly;
    return parseDateOnlyAsLocal(parseInt(y!, 10), parseInt(m!, 10), parseInt(d!, 10));
  }
  // ISO con hora: usar Date nativo
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Día/mes/año o mes/día/año: 29/01/2026, 29-01-2026, 29.01.2026, 01/29/2026
  const numNumYear = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (numNumYear) {
    const [, g1, g2, year] = numNumYear;
    const n1 = parseInt(g1!, 10);
    const n2 = parseInt(g2!, 10);
    const y = parseInt(year!, 10);
    if (n2 >= 1 && n2 <= 12) {
      const d = parseDateOnlyAsLocal(y, n2, n1);
      if (d) return d;
    }
    if (n1 >= 1 && n1 <= 12) {
      const d = parseDateOnlyAsLocal(y, n1, n2);
      if (d) return d;
    }
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Extrae el valor de una propiedad de Notion según su tipo
 */
export function extractNotionPropertyValue(
  property: any,
  propertyName: string
): string | number | Date | null {
  if (!property || !property.type) {
    return null;
  }

  switch (property.type) {
    case "title":
      return property.title?.[0]?.plain_text || null;
    case "rich_text":
      return property.rich_text?.[0]?.plain_text || null;
    case "number":
      return property.number ?? null;
    case "formula": {
      const f = property.formula;
      if (f?.number != null) return f.number;
      if (f?.date?.start) return parseNotionDate(f.date.start);
      if (typeof f?.string === "string") return f.string;
      return null;
    }
    case "date":
      return property.date?.start ? parseNotionDate(property.date.start) : null;
    case "created_time":
      return property.created_time ? new Date(property.created_time) : null;
    case "select":
      return property.select?.name || null;
    case "multi_select":
      return property.multi_select?.[0]?.name || null;
    default:
      console.warn(`Unknown property type: ${property.type} for ${propertyName}`);
      return null;
  }
}
