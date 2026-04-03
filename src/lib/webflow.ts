import { WebflowClient } from "webflow-api";

interface WebflowCredentials {
  webflowApiToken: string;
  webflowSiteId: string;
  webflowBlogCollectionId?: string;
  webflowPageCollectionId?: string;
  webflowDomain?: string;
  webflowFieldMapping?: Record<string, string>;
}

interface ArticlePayload {
  title: string;
  slug: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  featureImage?: string;
  published?: boolean;
}

function getClient(apiToken: string): WebflowClient {
  return new WebflowClient({ accessToken: apiToken });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function testWebflowConnection(
  apiToken: string
): Promise<{
  success: boolean;
  error?: string;
  sites?: Array<{ id: string; displayName: string; shortName: string; defaultDomain: string; customDomains?: string[] }>;
}> {
  try {
    const client = getClient(apiToken);
    const response = await client.sites.list();
    const sites = (response.sites || []).map((s: any) => ({
      id: s.id,
      displayName: s.displayName || s.shortName || "",
      shortName: s.shortName || "",
      defaultDomain: s.defaultDomain || `${s.shortName}.webflow.io`,
      customDomains: s.customDomains?.map((d: any) => d.url) || [],
    }));
    return { success: true, sites };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: msg };
  }
}

export async function listWebflowCollections(
  apiToken: string,
  siteId: string
): Promise<Array<{ id: string; displayName: string; slug: string; fields: any[] }>> {
  const client = getClient(apiToken);
  const response = await client.collections.list(siteId);
  return (response.collections || []).map((c: any) => ({
    id: c.id,
    displayName: c.displayName || c.slug || "",
    slug: c.slug || "",
    fields: c.fields || [],
  }));
}

export async function getCollectionFields(
  apiToken: string,
  collectionId: string
): Promise<Array<{ id: string; slug: string; displayName: string; type: string; isRequired: boolean }>> {
  const client = getClient(apiToken);
  const collection = await client.collections.get(collectionId);
  return (collection.fields || []).map((f: any) => ({
    id: f.id || "",
    slug: f.slug || "",
    displayName: f.displayName || f.slug || "",
    type: f.type || "",
    isRequired: f.isRequired || false,
  }));
}

function buildFieldData(
  article: Partial<ArticlePayload>,
  fieldMapping?: Record<string, string>
): Record<string, any> {
  const mapping = fieldMapping || {
    title: "name",
    slug: "slug",
    body: "post-body",
    excerpt: "post-summary",
    image: "main-image",
  };

  const fieldData: Record<string, any> = {};
  if (article.title) fieldData.name = article.title;
  if (article.slug) fieldData.slug = article.slug;

  if (mapping.body && article.content) fieldData[mapping.body] = article.content;
  if (mapping.excerpt && article.metaDescription) fieldData[mapping.excerpt] = article.metaDescription;
  if (mapping.metaTitle && article.metaTitle) fieldData[mapping.metaTitle] = article.metaTitle;
  if (mapping.image && article.featureImage) fieldData[mapping.image] = { url: article.featureImage };

  return fieldData;
}

export async function publishBlogToWebflow(
  creds: WebflowCredentials,
  article: ArticlePayload
): Promise<{ success: boolean; itemId?: string; error?: string; response?: unknown }> {
  try {
    if (!creds.webflowBlogCollectionId) {
      return { success: false, error: "Blog collection not configured" };
    }

    const client = getClient(creds.webflowApiToken);
    const fieldData = buildFieldData(article, creds.webflowFieldMapping);

    const item = await client.collections.items.createItemLive(
      creds.webflowBlogCollectionId,
      { fieldData: fieldData as any }
    );

    return { success: true, itemId: item.id, response: item };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Webflow API error";
    return { success: false, error: msg };
  }
}

export async function updateBlogOnWebflow(
  creds: WebflowCredentials,
  webflowItemId: string,
  article: Partial<ArticlePayload>
): Promise<{ success: boolean; error?: string; response?: unknown }> {
  try {
    if (!creds.webflowBlogCollectionId) {
      return { success: false, error: "Blog collection not configured" };
    }

    const client = getClient(creds.webflowApiToken);
    const fieldData = buildFieldData(article, creds.webflowFieldMapping);

    const response = await client.collections.items.updateItemLive(
      creds.webflowBlogCollectionId!,
      webflowItemId,
      { fieldData: fieldData as any }
    );

    return { success: true, response };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Webflow API error";
    return { success: false, error: msg };
  }
}

export async function publishPageToWebflow(
  creds: WebflowCredentials,
  article: ArticlePayload
): Promise<{ success: boolean; itemId?: string; error?: string; response?: unknown }> {
  try {
    if (!creds.webflowPageCollectionId) {
      return { success: false, error: "Page collection not configured" };
    }

    const client = getClient(creds.webflowApiToken);
    const fieldData = buildFieldData(article, creds.webflowFieldMapping);

    const item = await client.collections.items.createItemLive(
      creds.webflowPageCollectionId,
      { fieldData: fieldData as any }
    );

    return { success: true, itemId: item.id, response: item };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Webflow API error";
    return { success: false, error: msg };
  }
}

export async function updatePageOnWebflow(
  creds: WebflowCredentials,
  webflowItemId: string,
  article: Partial<ArticlePayload>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!creds.webflowPageCollectionId) {
      return { success: false, error: "Page collection not configured" };
    }

    const client = getClient(creds.webflowApiToken);
    const fieldData = buildFieldData(article, creds.webflowFieldMapping);

    await client.collections.items.updateItemLive(
      creds.webflowPageCollectionId!,
      webflowItemId,
      { fieldData: fieldData as any }
    );

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Webflow API error";
    return { success: false, error: msg };
  }
}

export async function publishWebflowSite(
  apiToken: string,
  siteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient(apiToken);
    await client.sites.publish(siteId, { publishToWebflowSubdomain: true });
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to publish site";
    return { success: false, error: msg };
  }
}

export async function unpublishFromWebflow(
  apiToken: string,
  collectionId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient(apiToken);
    await client.collections.items.updateItem(collectionId, itemId, {
      isArchived: false,
      isDraft: true,
    });
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to unpublish";
    return { success: false, error: msg };
  }
}
