import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the database with the required schema and default data
 */
async function initializeDatabase() {
  try {
    console.log('🚀 Initializing Zypher Trading Database...');

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️  Statement ${i + 1} error:`, err);
        }
      }
    }

    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['candles', 'manual_control', 'trading_config']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return;
    }

    console.log('📊 Created tables:', tables?.map(t => t.table_name).join(', '));

    // Check if we have any existing candles
    const { count: candleCount, error: countError } = await supabase
      .from('candles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error checking candles count:', countError);
    } else {
      console.log(`📈 Existing candles in database: ${candleCount || 0}`);
    }

    // Check configuration
    const { data: config, error: configError } = await supabase
      .from('trading_config')
      .select('*');

    if (configError) {
      console.error('❌ Error checking configuration:', configError);
    } else {
      console.log('⚙️  Configuration entries:', config?.length || 0);
      config?.forEach(c => {
        console.log(`   - ${c.key}: ${c.value}`);
      });
    }

    console.log('✅ Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization script failed:', error);
      process.exit(1);
    });
}

export { initializeDatabase };
