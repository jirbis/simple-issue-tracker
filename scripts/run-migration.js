#!/usr/bin/env node

/**
 * Migration Runner Script
 *
 * This script runs pending SQL migrations against your Supabase database.
 * Usage: node scripts/run-migration.js <migration-file>
 * Example: node scripts/run-migration.js supabase/migrations/002_fix_rls_infinite_recursion.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runMigration(migrationPath) {
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase configuration');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  // Read migration file
  const fullPath = path.resolve(migrationPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Error: Migration file not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`📂 Reading migration: ${path.basename(migrationPath)}`);
  console.log(`📄 SQL length: ${sql.length} characters\n`);

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Applying migration...\n');

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      if (error.message?.includes('exec_sql')) {
        console.log('⚠️  exec_sql function not found, trying direct query...\n');

        // For PostgreSQL, we need to execute statements one by one
        // Split by semicolon but be careful with function bodies
        const statements = splitSqlStatements(sql);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (statement) {
            console.log(`   Executing statement ${i + 1}/${statements.length}...`);
            const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
            if (stmtError) {
              throw stmtError;
            }
          }
        }

        console.log('\n✅ Migration applied successfully!');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Migration applied successfully!');
      if (data) {
        console.log('📊 Result:', data);
      }
    }
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error('\n💡 You can also apply this migration manually:');
    console.error('   1. Go to your Supabase Dashboard');
    console.error('   2. Navigate to SQL Editor');
    console.error('   3. Copy and paste the contents of:');
    console.error(`      ${migrationPath}`);
    console.error('   4. Click "Run"');
    process.exit(1);
  }
}

/**
 * Split SQL into statements, being careful with function bodies
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inFunction = false;
  let dollarQuoteTag = null;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('--')) {
      continue;
    }

    // Check for dollar-quoted strings (used in functions)
    const dollarMatch = trimmed.match(/\$\$|\$[a-zA-Z_][a-zA-Z0-9_]*\$/);
    if (dollarMatch) {
      if (!inFunction) {
        inFunction = true;
        dollarQuoteTag = dollarMatch[0];
      } else if (trimmed.includes(dollarQuoteTag)) {
        inFunction = false;
        dollarQuoteTag = null;
      }
    }

    current += line + '\n';

    // Only split on semicolon if we're not inside a function
    if (!inFunction && trimmed.endsWith(';')) {
      statements.push(current);
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current);
  }

  return statements;
}

// Main execution
const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error('❌ Error: Please specify a migration file');
  console.error('Usage: node scripts/run-migration.js <migration-file>');
  console.error('Example: node scripts/run-migration.js supabase/migrations/002_fix_rls_infinite_recursion.sql');
  process.exit(1);
}

runMigration(migrationPath);
