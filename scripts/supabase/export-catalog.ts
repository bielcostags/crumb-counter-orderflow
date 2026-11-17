import { createCatalogImportManifest } from "../../src/services/backend/catalog-manifest";
// Review-only stdout. This command never connects to Supabase or reads browser storage.
console.info(JSON.stringify(createCatalogImportManifest(), null, 2));
