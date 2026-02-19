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
    const [{ data: types }, { data: manufacturers }, { data: categories }, { data: sitesData }] = await Promise.all([
      supabase.from('asset_types').select('id, name'),
      supabase.from('manufacturers').select('id, name'),
      supabase.from('asset_categories').select('id, name'),
      supabase.from('sites').select('id'),
    ]);
    const typeArr = (types || []).map(function(t: any) { return { name: t.name.toLowerCase(), id: t.id }; });
    const mfgArr = (manufacturers || []).map(function(m: any) { return { name: m.name.toLowerCase(), id: m.id }; });
    const catArr = (categories || []).map(function(c: any) { return { name: c.name.toLowerCase(), id: c.id }; });
    const validSites: string[] = (sitesData || []).map(function(s: any) { return s.id; });

    const errors: Array<{ row: number; message: string }> = [];
    const validAssets: any[] = [];

    for (var i = 0; i < assets.length; i++) {
      var row = assets[i];
      var rowNum = i + 2;
      var siteId = (row.site_id || row.site || '').toUpperCase().trim();
      if (!siteId) { errors.push({ row: rowNum, message: 'Missing site_id' }); continue; }
      if (validSites.indexOf(siteId) === -1) { errors.push({ row: rowNum, message: 'Invalid site: ' + siteId }); continue; }

      var typeStr = (row.asset_type || row.type || '').toLowerCase().trim();
      var typeId: any = null;
      for (var ti = 0; ti < typeArr.length; ti++) {
        if (typeArr[ti].name === typeStr) { typeId = typeArr[ti].id; break; }
      }
      if (typeStr && !typeId) {
        for (var ti2 = 0; ti2 < typeArr.length; ti2++) {
          if (typeArr[ti2].name.indexOf(typeStr) !== -1 || typeStr.indexOf(typeArr[ti2].name) !== -1) { typeId = typeArr[ti2].id; break; }
        }
      }

      var mfgStr = (row.manufacturer || '').toLowerCase().trim();
      var mfgId: any = null;
      for (var mi = 0; mi < mfgArr.length; mi++) {
        if (mfgArr[mi].name === mfgStr) { mfgId = mfgArr[mi].id; break; }
      }
      if (mfgStr && !mfgId) {
        for (var mi2 = 0; mi2 < mfgArr.length; mi2++) {
          if (mfgArr[mi2].name.indexOf(mfgStr) !== -1 || mfgStr.indexOf(mfgArr[mi2].name) !== -1) { mfgId = mfgArr[mi2].id; break; }
        }
      }

      var catStr = (row.category || '').toLowerCase().trim();
      var catId: any = null;
      for (var ci = 0; ci < catArr.length; ci++) {
        if (catArr[ci].name === catStr) { catId = catArr[ci].id; break; }
      }
      if (catStr && !catId) {
        for (var ci2 = 0; ci2 < catArr.length; ci2++) {
          if (catArr[ci2].name.indexOf(catStr) !== -1 || catStr.indexOf(catArr[ci2].name) !== -1) { catId = catArr[ci2].id; break; }
        }
      }

      var purchaseValue = 0;
      var rawVal = String(row.purchase_value || row.value || row.price || '0');
      purchaseValue = parseFloat(rawVal.replace(/[$,\s]/g, '')) || 0;

      var rawStatus = (row.status || 'active').toLowerCase().trim();
      var validStatuses = ['active', 'in_store', 'in_repair', 'in_transit', 'disposed'];
      var status = validStatuses.indexOf(rawStatus) !== -1 ? rawStatus : 'active';

      var rawCondition = (row.condition || 'good').toLowerCase().trim();
      var validConditions = ['new', 'good', 'fair', 'poor'];
      var condition = validConditions.indexOf(rawCondition) !== -1 ? rawCondition : 'good';

      var purchaseDate = row.purchase_date || null;
      var warrantyExp = row.warranty_expiration || row.warranty || null;

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
        purchase_date: purchaseDate,
        purchase_value: purchaseValue,
        warranty_expiration: warrantyExp,
        status: status,
        condition: condition,
        notes: row.notes || null,
      });
    }

    var inserted = 0;
    var insertErrors: string[] = [];
    for (var b = 0; b < validAssets.length; b += 50) {
      var batch = validAssets.slice(b, b + 50);
      var result = await supabase.from('assets').insert(batch).select('id');
      if (result.error) {
        insertErrors.push('Batch ' + (Math.floor(b / 50) + 1) + ': ' + result.error.message);
      } else {
        inserted += (result.data?.length || 0);
      }
    }

    return NextResponse.json({
      success: true,
      total_rows: assets.length,
      inserted: inserted,
      skipped: errors.length,
      row_errors: errors.slice(0, 20),
      insert_errors: insertErrors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  var template = 'site_id,asset_type,manufacturer,model,serial_number,hostname,ip_address,category,custodian_name,purchase_date,purchase_value,warranty_expiration,status,condition,specifications,notes\nMM,Laptop,Dell,Latitude 5540,SN-001,MM-LPT-001,10.0.1.10,Hardware,John Smith,2024-01-15,1450,2027-01-15,active,good,16GB RAM 512GB SSD,Floor 2';
  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="asset-upload-template.csv"',
    },
  });
}
