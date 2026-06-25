import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gflmuGo1b3nX@ep-small-darkness-ajzzcgba-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

let isInitialized = false;

async function ensureTables() {
  if (isInitialized) return;
  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS tenant_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          requester_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          receiver_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(requester_id, receiver_id)
      );
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS shared_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          connection_id UUID REFERENCES tenant_connections(id) ON DELETE CASCADE,
          contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
          shared_by UUID REFERENCES tenants(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(connection_id, contact_id)
      );
    `);
    await sql.query(`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
    `);
    await sql.query(`
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
    `);
    await sql.query(`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS born_after_maghrib BOOLEAN DEFAULT false;
    `);
    await sql.query(`
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS born_after_maghrib BOOLEAN DEFAULT false;
    `);
    await sql.query(`
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    await sql.query(`
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          color VARCHAR(20) DEFAULT '#C4953A',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, name)
      );
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS contact_group_mappings (
          contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
          group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
          PRIMARY KEY (contact_id, group_id)
      );
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS group_share_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(group_id)
      );
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS family_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
          document_type VARCHAR(100) NOT NULL,
          document_number VARCHAR(100),
          issue_date DATE,
          expiry_date DATE,
          review_date DATE,
          notes TEXT,
          is_archived BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_family_documents_tenant ON family_documents(tenant_id);
    `);
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_family_documents_contact ON family_documents(contact_id);
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS document_attachments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID REFERENCES family_documents(id) ON DELETE CASCADE,
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_size INTEGER NOT NULL,
          storage_key VARCHAR(500) NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          uploaded_by UUID REFERENCES tenants(id) ON DELETE SET NULL,
          is_archived BOOLEAN DEFAULT false
      );
    `);
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_document_attachments_tenant ON document_attachments(tenant_id);
    `);
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_document_attachments_document ON document_attachments(document_id);
    `);
    await sql.query(`
      ALTER TABLE document_attachments ADD COLUMN IF NOT EXISTS file_content TEXT;
    `);
    await sql.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN DEFAULT true;
    `);
    await sql.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reminder_days_ahead INTEGER DEFAULT 7;
    `);
    await sql.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reminder_types VARCHAR(200) DEFAULT 'birthday_gregorian,birthday_hijri,anniversary,death_gregorian,death_hijri';
    `);
    await sql.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light';
    `);
    await sql.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ui_style VARCHAR(30) DEFAULT 'classic';
    `);
    await sql.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS share_announcements_enabled BOOLEAN DEFAULT false;
    `);
    await sql.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS additional_reminder_emails TEXT;
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS care_cards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
          token VARCHAR(100) UNIQUE NOT NULL,
          status VARCHAR(20) DEFAULT 'not_started',
          know_me_better_status VARCHAR(20) DEFAULT 'not_started',
          
          -- Care Card level 1
          appreciation_style VARCHAR(100),
          support_style VARCHAR(100),
          communication_preference VARCHAR(100),
          gift_preference VARCHAR(100),
          social_style VARCHAR(100),
          memory_priorities TEXT[],
          interests TEXT[],
          favourites JSONB DEFAULT '{}'::jsonb,
          current_focus TEXT[],
          dua_requests TEXT[],
          small_joy VARCHAR(255),
          
          -- Know Me Better level 2
          matters_most TEXT[],
          energy_sources TEXT[],
          energy_drains TEXT[],
          support_preferences TEXT[],
          hidden_traits TEXT[],
          friendship_manual TEXT[],
          life_season TEXT[],
          dreams TEXT[],
          care_expression TEXT[],
          shared_moments TEXT[],

          -- Privacy/Visibility
          privacy_settings JSONB DEFAULT '{}'::jsonb,
          ai_insights TEXT,

          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS care_card_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
          responses JSONB NOT NULL,
          submitted_by_ip VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await sql.query(`
      ALTER TABLE care_cards 
      ADD COLUMN IF NOT EXISTS connection_rhythm VARCHAR(100),
      ADD COLUMN IF NOT EXISTS relational_role VARCHAR(100),
      ADD COLUMN IF NOT EXISTS resolving_tension VARCHAR(100),
      ADD COLUMN IF NOT EXISTS relational_validation VARCHAR(100),
      ADD COLUMN IF NOT EXISTS confidence_boost VARCHAR(100);
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS ibaadat_tracker (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          logs JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, date)
      );
    `);
    isInitialized = true;
  } catch (err) {
    console.error("Auto-migration error:", err);
  }
}

// Helper to query the DB easily via HTTPS (bypasses port 5432 firewall blocks)
export async function query(text: string, params?: any[]) {
  await ensureTables();
  const rows = await sql.query(text, params);
  return { rows };
}
