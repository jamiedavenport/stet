import fs from 'node:fs';

import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { brand } from '@repo/brand';

import { contract } from '../src/contract.ts';

// Emits the OpenAPI document that documentation tooling consumes. Runs as
// part of `pnpm build`, so regenerate by building this package.
const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

const document = await generator.generate(contract, {
  info: {
    title: `${brand.name} API`,
    version: '1.0.0',
    description: `HTTP API for ${brand.name}. Authenticated endpoints require an organization API key passed in the \`x-api-key\` header.`,
  },
  servers: [{ url: `${brand.url}/api/v1` }],
  components: {
    securitySchemes: {
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Organization API key created through the Better Auth api-key endpoints.',
      },
    },
  },
});

const target = new URL('../openapi.json', import.meta.url);
fs.writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);

const pathCount = Object.keys(document.paths ?? {}).length;
console.log(`Generated openapi.json with ${pathCount} paths.`);
