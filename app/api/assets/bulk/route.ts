// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assets } = body;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json({ error: 'No assets provided' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load reference data for matching
    const [{ data: types }, { data: manufacturers }, { data: categories }, { data: sitesData }] = await Promise.all([
      supabase.from('asset_types').select('id, name'),
      supabase.from('manufacturers').select('id, name'),
      supabase.from('asset_categories').select('id, name'),
      supabase.from('sites').select('id'),
    ]);

    const typeMap = new Map((types || []).map(t => [t.name.toLowerCase(), t.id]));
    const mfgMap = new Map((manufacturers || []).map(m => [m.name.toLowerCase(), m.id]));
    const catMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c.id]));
    const validSites = new Set((sitesData || []).map(s => s.id));

    const errors: { row: number; message: string }[] = [];
    const validAssets: any[] = [];

    for (let i = 0; i < assets.length; i++) {
      const row = assets[i];
      const rowNum = i + 2; // +2 because row 1 is header, 0-indexed

      // Site is required
      const siteId = (row.site_id || row.site || '').toUpperCase().trim();
      if (!siteId) {
        errors.push({ row: rowNum, message: 'Missing site_id' });
        continue;
      }
      if (!validSites.has(siteId)) {
        errors.push({ row: rowNum, message: `Invalid site: ${siteId}. Valid: ${Array.from(validSites).join(', ')}` });
        continue;
      }

      // Match type (fuzzy)
      const typeStr = (row.asset_type || row.type || '').toLowerCase().trim();
      let typeId = typeMap.get(typeStr) || null;
      if (typeStr && !typeId) {
        typeMap.forEach((id, name) => {
          if (!typeId && (name.includes(typeStr) || typeStr.includes(name))) { typeId = id; }
        });
      }

      // Match manufacturer (fuzzy)
      const mfgStr = (row.manufacturer || '').toLowerCase().trim();
      let mfgId = mfgMap.get(mfgStr) || null;
      if (mfgStr && !mfgId) {
        mfgMap.forEach((id, name) => {
          if (!mfgId && (name.includes(mfgStr) || mfgStr.includes(name))) { mfgId = id; }
        });
      }

      // Match category (fuzzy)
      const catStr = (row.category || '').toLowerCase().trim();
      let catId = catMap.get(catStr) || null;
      if (catStr && !catId) {
        catMap.forEach((id, name) => {
          if (!catId && (name.includes(catStr) || catStr.includes(name))) { catId = id; }
        });
      }

      // Parse value — handle currency symbols and commas
      let purchaseValue = 0;
      const rawVal = String(row.purchase_value || row.value || row.price || '0');
      purchaseValue = parseFloat(rawVal.replace(/[$,£€\s]/g, '')) || 0;

      // Parse dates
      const parseDate = (d: string) => {
        if (!d || d.trim() === '') return null;
        const cleaned = d.trim();
        // Try ISO format first
        const iso = new Date(cleaned);
        if (!isNaN(iso.getTime())) return iso.toISOString().split('T')[0];
        // Try DD/MM/YYYY
        const parts = cleaned.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [a, b, c] = parts;
          if (parseInt(a) > 12) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
        }
        return null;
      };

      // Build status
      const rawStatus = (row.status || 'active').toLowerCase().trim();
      const validStatuses = ['active', 'in_store', 'in_repair', 'in_transit', 'disposed'];
      const status = validStatuses.includes(rawStatus) ? rawStatus : 'active';

      // Build condition
      const rawCondition = (row.condition || 'good').toLowerCase().trim();
      const validConditions = ['new', 'good', 'fair', 'poor'];
      const condition = validConditions.includes(rawCondition) ? rawCondition : 'good';

      validAssets.push({
        site_id: siteId,
        serial_number: row.serial_number || row.serial || null,
        hostname: row.hostname || null,
        ip_address: row.ip_address || row.ip || null,
        model: row.model || null,
        specifications: row.specifications || row.specs || null,
        manufacturer_id: mfgId,
        asset_type_id: typeId,
        category_id: catId,
        custodian_name: row.custodian_name || row.custodian || row.assigned_to || null,
        purchase_date: parseDate(row.purchase_date || ''),
        purchase_value: purchaseValue,
        warranty_expiration: parseDate(row.warranty_expiration || row.warranty || ''),
        status,
        condition,
        notes: row.notes || null,
      });
    }

    // Insert in batches of 50
    let inserted = 0;
    const insertErrors: string[] = [];

    for (let i = 0; i < validAssets.length; i += 50) {
      const batch = validAssets.slice(i, i + 50);
      const { data, error } = await supabase.from('assets').insert(batch).select('id');
      if (error) {
        insertErrors.push(`Batch ${Math.floor(i/50)+1}: ${error.message}`);
      } else {
        inserted += (data?.length || 0);
      }
    }

    return NextResponse.json({
      success: true,
      total_rows: assets.length,
      inserted,
      skipped: errors.length,
      row_errors: errors.slice(0, 20), // Cap at 20 errors returned
      insert_errors: insertErrors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// GET: Return CSV template
export async function GET() {
  const template = `site_id,asset_type,manufacturer,model,serial_number,hostname,ip_address,category,custodian_name,purchase_date,purchase_value,warranty_expiration,status,condition,specifications,notes
MM,Laptop,Dell,Latitude 5540,SN-001,MM-LPT-001,10.0.1.10,Hardware,John Smith,2024-01-15,1450,2027-01-15,active,good,"16GB RAM, 512GB SSD",Floor 2
ATL,Desktop,HP,EliteDesk 800 G9,SN-002,ATL-DT-001,10.1.1.20,Hardware,Jane Doe,2024-03-01,1890,2027-03-01,active,new,"32GB RAM, 1TB SSD",`;

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="asset-upload-template.csv"',
    },
  });
}
