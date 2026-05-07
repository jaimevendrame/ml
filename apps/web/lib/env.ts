import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().default('http://localhost:3500'),
  ML_API_BASE: z.string().default('https://api.mercadolibre.com'),
  ML_AFFILIATE_TAG: z.string().default(''),
  WHATSAPP_SERVICE_URL: z.string().default('http://localhost:8580'),
  SCRAPER_SERVICE_URL: z.string().default('http://localhost:8581'),
  LINK_BUILDER_SERVICE_URL: z.string().default('http://localhost:8582'),
  INTERNAL_SERVICE_TOKEN: z.string().default(''),
})

export const env = schema.parse(process.env)
