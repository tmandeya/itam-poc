import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, employee_id, role, site_ids } = body;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role key to create users (admin-level operation)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they can log in immediately
      user_metadata: { full_name, role },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Update the profile (the trigger auto-creates it, so we update)
    // Small delay to let the trigger fire
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        role,
        employee_id: employee_id || null,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // 3. Assign sites
    if (site_ids && site_ids.length > 0) {
      const assignments = site_ids.map((siteId: string) => ({
        user_id: userId,
        site_id: siteId,
      }));

      const { error: siteError } = await supabase
        .from('user_site_assignments')
        .insert(assignments);

      if (siteError) {
        console.error('Site assignment error:', siteError);
      }
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      message: `User ${full_name} created successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
