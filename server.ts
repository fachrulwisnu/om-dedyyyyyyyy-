import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping helper
function getPropertyValue(prop: any): any {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':
      return prop.title[0]?.plain_text || null;
    case 'rich_text':
      return prop.rich_text[0]?.plain_text || null;
    case 'select':
      return prop.select?.name || null;
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name).join(', ') || null;
    case 'number':
      return prop.number;
    case 'date':
      return prop.date?.start || null;
    case 'checkbox':
      return prop.checkbox;
    case 'status':
      return prop.status?.name || null;
    case 'people':
      return prop.people?.map((p: any) => p.name).join(', ') || null;
    case 'url':
      return prop.url;
    case 'email':
      return prop.email;
    case 'phone_number':
      return prop.phone_number;
    case 'formula':
      if (prop.formula.type === 'string') return prop.formula.string;
      if (prop.formula.type === 'number') return prop.formula.number;
      return null;
    default:
      return null;
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is alive!" });
});

app.post("/sync-notion", async (req, res) => {
  // CORS (redundant but requested)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const databaseId = process.env.NOTION_DATABASE_ID;
    const notionKey = process.env.NOTION_API_KEY;

    if (!databaseId || !notionKey) {
      return res.status(400).json({ 
        success: false, 
        error: "Notion credentials (API Key or Database ID) are not configured." 
      });
    }

    const logs: string[] = ["Initializing Notion Sync API via Direct Fetch..."];
    
    let allRecords: any[] = [];
    let hasMore = true;
    let cursor: string | undefined = undefined;

    while (hasMore) {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_cursor: cursor,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Notion API Error: ${errorData.message || response.statusText}`);
      }

      const data: any = await response.json();
      allRecords = [...allRecords, ...data.results];
      hasMore = data.has_more;
      cursor = data.next_cursor || undefined;
    }

    logs.push(`Found ${allRecords.length} records in Notion.`);

    const projectsToUpsert = allRecords.map((page: any) => {
      const props = page.properties;
      
      const ticket_id = getPropertyValue(props['Ticket']);
      const project_name = getPropertyValue(props['Name']) || getPropertyValue(props['Project Name']);
      
      if (!project_name) return null;

      const last_status = getPropertyValue(props['Last Status']) || 'On Queue';
      const pic_name = getPropertyValue(props['PIC Name']) || 'Unassigned';
      const owner_div = getPropertyValue(props['Owner Div']);
      const owner_name = getPropertyValue(props['Owner Name']);
      const project_type = getPropertyValue(props['Type Project']) || 'Uncategorized';
      const last_update_log = getPropertyValue(props['Last Update']) || getPropertyValue(props['(Dev) Progress Updated']) || getPropertyValue(props['(SIT) Progress Updated']);

      const statusLower = (last_status || '').toLowerCase();
      // Keep only active projects for the API view
      if (
        statusLower.includes('live') || 
        statusLower.includes('monitoring') || 
        statusLower.includes('done')
      ) {
        return null;
      }

      const raw_data: any = {};
      Object.keys(props).forEach(key => {
        raw_data[key] = getPropertyValue(props[key]);
      });

      return {
        ticket_id,
        project_name,
        last_status,
        pic_name,
        owner_div,
        owner_name,
        project_type,
        last_update_log,
        raw_data,
        updated_at: new Date().toISOString()
      };
    }).filter(Boolean);

    let updatedCount = 0;
    let insertedCount = 0;

    if (projectsToUpsert.length > 0) {
      // Individual upserts to track counts correctly
      for (const project of projectsToUpsert as any[]) {
        if (!project.ticket_id) {
          const { error } = await supabase.from('notion_api_projects').insert({
            ...project,
            created_at: new Date().toISOString()
          });
          if (!error) insertedCount++;
          continue;
        }

        const { data: existing } = await supabase
          .from('notion_api_projects')
          .select('id')
          .eq('ticket_id', project.ticket_id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('notion_api_projects')
            .update(project)
            .eq('id', existing.id);
          if (!error) updatedCount++;
        } else {
          const { error } = await supabase
            .from('notion_api_projects')
            .insert({
              ...project,
              created_at: new Date().toISOString()
            });
          if (!error) insertedCount++;
        }
      }
    }

    logs.push(`Sync Complete: ${updatedCount} records updated, ${insertedCount} new inserted.`);

    return res.json({
      success: true,
      message: `Sync Complete: ${updatedCount} records updated, ${insertedCount} new inserted.`,
      logs,
      updated: updatedCount,
      inserted: insertedCount
    });
  } catch (error: any) {
    console.error("Sync Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal Server Error",
      logs: [ `[ERROR] ${error.message}` ] 
    });
  }
});

async function startServer() {
  const appInstance = express();
  appInstance.use(express.json());
  
  // Routes go FIRST
  appInstance.use("/api", app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    appInstance.use(vite.middlewares);
  } else {
    appInstance.use(express.static(path.join(process.cwd(), "dist")));
    appInstance.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  appInstance.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
