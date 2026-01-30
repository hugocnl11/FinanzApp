import { prisma } from "@/lib/prisma";
import { decryptToken } from "./encryption";
import {
  getAllNotionPages,
  getDatabasePropertyNameToId,
  getPagePropertyByExpectedName,
  extractNotionPropertyValue,
  parseNotionAmount,
  parseNotionDate,
  type NotionDatabasePage,
} from "./client";
import type { MovementType, CategoryType } from "@prisma/client";

// Mapeo de campos de Notion a campos de Movement
const NOTION_FIELD_MAPPING = {
  concept: "Nombre",
  type: "Movimiento",
  amount: "Cantidad",
  date: "Fecha del gasto",
  paymentMethod: "Método de pago",
  category: "Categoría",
} as const;

// Nombres alternativos para la columna de fecha (la tabla puede llamarse distinto)
const DATE_PROPERTY_NAMES = [
  "Fecha del movimiento",
  "Fecha del gasto",
  "Fecha",
  "Date",
  "Fecha de gasto",
  "Gasto fecha",
] as const;

// Mapeo de valores de tipo de movimiento
const NOTION_TYPE_MAPPING: Record<string, MovementType> = {
  Gasto: "EXPENSE",
  Ingreso: "INCOME",
  Inversión: "INVESTMENT",
} as const;

// Mapeo especial de categorías
const NOTION_CATEGORY_MAPPING: Record<string, string> = {
  Sueldo: "Nomina",
} as const;

// Iconos y colores por defecto según el tipo de categoría
const DEFAULT_CATEGORY_CONFIG: Record<
  CategoryType,
  { icon: string; color: string }
> = {
  EXPENSE: { icon: "Wallet", color: "#64748b" },
  INCOME: { icon: "Briefcase", color: "#16a34a" },
  INVESTMENT: { icon: "LineChart", color: "#22c55e" },
  SAVINGS: { icon: "PiggyBank", color: "#8b5cf6" },
};

interface SyncResult {
  created: number;
  skipped: number;
  skippedDuplicates: number;
  skippedMissingFields: number;
  /** Cuántas filas se omitieron por faltar cada campo (para diagnóstico) */
  skippedMissingByField: { concept: number; type: number; amount: number; date: number; category: number };
  errors: string[];
}

/**
 * Obtiene o crea una categoría para el usuario
 */
async function getOrCreateCategory(
  userId: string,
  categoryName: string,
  movementType: MovementType
): Promise<string> {
  // Aplicar mapeo especial de categorías
  const mappedName = NOTION_CATEGORY_MAPPING[categoryName] || categoryName;

  // Buscar categoría existente
  let category = await prisma.category.findFirst({
    where: {
      userId,
      name: mappedName,
    },
  });

  // Si no existe, determinar el tipo de categoría según el tipo de movimiento
  let categoryType: CategoryType;
  switch (movementType) {
    case "EXPENSE":
      categoryType = "EXPENSE";
      break;
    case "INCOME":
      categoryType = "INCOME";
      break;
    case "INVESTMENT":
    case "SAVINGS":
      categoryType = "INVESTMENT";
      break;
    default:
      categoryType = "EXPENSE";
  }

  // Si no existe, crearla
  if (!category) {
    const defaultConfig = DEFAULT_CATEGORY_CONFIG[categoryType];
    category = await prisma.category.create({
      data: {
        userId,
        name: mappedName,
        type: categoryType,
        icon: defaultConfig.icon,
        color: defaultConfig.color,
        active: true,
      },
    });
  }

  return category.id;
}

/**
 * Extrae los datos de un movimiento desde una página de Notion.
 * Usa búsqueda flexible por nombre (incl. "Fecha del gasto" con cualquier grafía).
 * Si no hay propiedad de fecha, usa created_time de la página como fallback.
 */
function extractMovementFromNotionPage(
  page: NotionDatabasePage,
  nameToId: Record<string, string> | null
): {
  concept: string | null;
  type: MovementType | null;
  amount: number | null;
  date: Date | null;
  paymentMethod: string | null;
  category: string | null;
} {
  const properties = page.properties;

  const concept = extractNotionPropertyValue(
    getPagePropertyByExpectedName(properties, NOTION_FIELD_MAPPING.concept, nameToId) as any,
    NOTION_FIELD_MAPPING.concept
  ) as string | null;

  const typeStr = extractNotionPropertyValue(
    getPagePropertyByExpectedName(properties, NOTION_FIELD_MAPPING.type, nameToId) as any,
    NOTION_FIELD_MAPPING.type
  ) as string | null;
  const type = typeStr ? NOTION_TYPE_MAPPING[typeStr] || null : null;

  const amountRaw = extractNotionPropertyValue(
    getPagePropertyByExpectedName(properties, NOTION_FIELD_MAPPING.amount, nameToId) as any,
    NOTION_FIELD_MAPPING.amount
  );
  const amount = parseNotionAmount(amountRaw);

  // Buscar fecha en la tabla: probar varios nombres de columna y usar la primera fecha válida (no created_time)
  let date: Date | null = null;
  for (const datePropName of DATE_PROPERTY_NAMES) {
    const dateProp = getPagePropertyByExpectedName(properties, datePropName, nameToId);
    if (dateProp === undefined) continue;
    const dateRaw = extractNotionPropertyValue(dateProp as any, datePropName);
    if (dateRaw instanceof Date && !Number.isNaN(dateRaw.getTime())) {
      date = dateRaw;
    } else {
      const toParse: string | number | null | undefined =
        dateRaw instanceof Date ? undefined : dateRaw ?? undefined;
      date = parseNotionDate(toParse);
    }
    if (date) break;
  }

  const paymentMethod = extractNotionPropertyValue(
    getPagePropertyByExpectedName(properties, NOTION_FIELD_MAPPING.paymentMethod, nameToId) as any,
    NOTION_FIELD_MAPPING.paymentMethod
  ) as string | null;

  const category = extractNotionPropertyValue(
    getPagePropertyByExpectedName(properties, NOTION_FIELD_MAPPING.category, nameToId) as any,
    NOTION_FIELD_MAPPING.category
  ) as string | null;

  return { concept, type, amount, date, paymentMethod, category };
}

/**
 * Genera un hash único para detectar duplicados
 */
function generateMovementHash(
  concept: string,
  date: Date,
  amount: number
): string {
  const dateStr = date.toISOString().split("T")[0];
  return `${dateStr}_${concept}_${amount}`;
}

/**
 * Sincroniza movimientos desde Notion hacia FinanzApp
 */
export async function syncNotionMovements(
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    skipped: 0,
    skippedDuplicates: 0,
    skippedMissingFields: 0,
    skippedMissingByField: { concept: 0, type: 0, amount: 0, date: 0, category: 0 },
    errors: [],
  };

  try {
    // Obtener configuración de integración
    const integration = await prisma.notionIntegration.findUnique({
      where: { userId },
    });

    if (!integration || !integration.enabled) {
      throw new Error("Notion integration not found or disabled");
    }

    // Desencriptar token
    const token = decryptToken(integration.integrationToken);

    // Resolver nombres de propiedades → id (la API a veces devuelve claves por id)
    let nameToId: Record<string, string> | null = null;
    try {
      nameToId = await getDatabasePropertyNameToId(integration.databaseId, token);
    } catch {
      // Si falla (ej. API antigua), usamos nombres directamente
    }

    // Obtener todas las páginas de la base de datos
    const pages = await getAllNotionPages(integration.databaseId, token);

    // Obtener movimientos existentes del usuario para detectar duplicados
    const existingMovements = await prisma.movement.findMany({
      where: { userId },
      select: {
        concept: true,
        date: true,
        amount: true,
      },
    });

    // Crear set de hashes existentes para detección rápida de duplicados
    const existingHashes = new Set(
      existingMovements.map((m) =>
        generateMovementHash(m.concept, m.date, Number(m.amount))
      )
    );

    let usedPaymentMethodFallback = false;
    // Procesar cada página
    for (const page of pages) {
      try {
        const movementData = extractMovementFromNotionPage(page, nameToId);

        // Validar que todos los campos requeridos estén presentes
        const missingConcept = !movementData.concept;
        const missingType = !movementData.type;
        const missingAmount = movementData.amount === null;
        const missingDate = !movementData.date;
        const missingCategory = !movementData.category;
        if (missingConcept || missingType || missingAmount || missingDate || missingCategory) {
          result.skipped++;
          result.skippedMissingFields++;
          if (missingConcept) result.skippedMissingByField.concept++;
          if (missingType) result.skippedMissingByField.type++;
          if (missingAmount) result.skippedMissingByField.amount++;
          if (missingDate) result.skippedMissingByField.date++;
          if (missingCategory) result.skippedMissingByField.category++;
          continue;
        }

        // Hash con cantidad normalizada (igual que en DB) para detectar duplicados
        const normalizedAmountForHash =
          movementData.type === "EXPENSE"
            ? -Math.abs(movementData.amount)
            : Math.abs(movementData.amount);
        const hash = generateMovementHash(
          movementData.concept,
          movementData.date,
          normalizedAmountForHash
        );

        if (existingHashes.has(hash)) {
          result.skipped++;
          result.skippedDuplicates++;
          continue;
        }

        // Obtener o crear categoría
        const categoryId = await getOrCreateCategory(
          userId,
          movementData.category,
          movementData.type
        );

        // Normalizar cantidad según el tipo
        const normalizedAmount =
          movementData.type === "EXPENSE"
            ? -Math.abs(movementData.amount)
            : Math.abs(movementData.amount);

        // Crear movimiento (incluir paymentMethod si el esquema lo tiene)
        const createData = {
          userId,
          categoryId,
          date: movementData.date,
          concept: movementData.concept,
          type: movementData.type,
          amount: normalizedAmount,
          paymentMethod: movementData.paymentMethod?.trim() || null,
        };
        try {
          await prisma.movement.create({ data: createData });
        } catch (createError) {
          const msg = createError instanceof Error ? createError.message : String(createError);
          if (msg.includes("Unknown argument `paymentMethod`")) {
            usedPaymentMethodFallback = true;
            const { paymentMethod: _pm, ...dataWithoutPaymentMethod } = createData;
            await prisma.movement.create({ data: dataWithoutPaymentMethod });
          } else {
            throw createError;
          }
        }

        result.created++;
        existingHashes.add(hash);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push(`Error processing page ${page.id}: ${errorMessage}`);
      }
    }

    if (usedPaymentMethodFallback) {
      result.errors.push(
        "Para guardar «Método de pago»: en la carpeta del proyecto ejecuta 'npx prisma generate' y 'npx prisma migrate deploy', luego vuelve a desplegar o reiniciar la app."
      );
    }
    // Actualizar lastSyncAt
    await prisma.notionIntegration.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });
  } catch (error: unknown) {
    // Extraer mensaje: Notion SDK puede usar .body?.message o .message
    const raw = error as { message?: string; body?: { message?: string } };
    const errorMessage =
      typeof raw?.body?.message === "string"
        ? raw.body.message
        : error instanceof Error
          ? error.message
          : String(error);
    const isDbNotShared =
      /could not find database/i.test(errorMessage) ||
      /shared with your integration/i.test(errorMessage);
    if (isDbNotShared) {
      result.errors.push(
        "La base de datos no está compartida con tu integración. En Notion: abre la base de datos Tracker → clic en «…» (arriba derecha) → Añadir conexiones / Conectar con → selecciona tu integración."
      );
    } else {
      result.errors.push(`Sync failed: ${errorMessage}`);
    }
  }

  return result;
}
