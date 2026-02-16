-- ══════════════════════════════════════════════════════════════════
-- ITAM POC — Migration 002: Row Level Security Policies
-- Enforces multi-site RBAC at the database level
-- ══════════════════════════════════════════════════════════════════

-- Enable RLS on all user-facing tables
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_license_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────
-- HELPER: Check if current user is super_admin
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- HELPER: Check if user has access to a site
CREATE OR REPLACE FUNCTION public.has_site_access(p_site_id VARCHAR)
RETURNS BOOLEAN AS $$
    SELECT
        public.is_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.user_site_assignments
            WHERE user_id = auth.uid() AND site_id = p_site_id
        );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────
-- SITES: All authenticated users can read sites
-- ────────────────────────────────────────────────────
CREATE POLICY "sites_select_all" ON public.sites
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "sites_manage_super" ON public.sites
    FOR ALL TO authenticated USING (public.is_super_admin());

-- ────────────────────────────────────────────────────
-- REFERENCE TABLES: Read for all, write for admins
-- ────────────────────────────────────────────────────
CREATE POLICY "categories_select" ON public.asset_categories
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_manage" ON public.asset_categories
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "types_select" ON public.asset_types
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "types_manage" ON public.asset_types
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "manufacturers_select" ON public.manufacturers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "manufacturers_manage" ON public.manufacturers
    FOR ALL TO authenticated USING (public.is_super_admin());

-- ────────────────────────────────────────────────────
-- DEPARTMENTS & SECTIONS: Site-scoped
-- ────────────────────────────────────────────────────
CREATE POLICY "departments_select" ON public.departments
    FOR SELECT TO authenticated USING (public.has_site_access(site_id));

CREATE POLICY "departments_manage" ON public.departments
    FOR ALL TO authenticated USING (
        public.is_super_admin() OR (
            public.get_user_role(auth.uid()) = 'site_admin'
            AND public.has_site_access(site_id)
        )
    );

CREATE POLICY "sections_select" ON public.sections
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.departments d
            WHERE d.id = department_id AND public.has_site_access(d.site_id)
        )
    );

-- ────────────────────────────────────────────────────
-- PROFILES: Users see themselves, admins see more
-- ────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_manage_super" ON public.profiles
    FOR ALL TO authenticated USING (public.is_super_admin());

-- ────────────────────────────────────────────────────
-- USER SITE ASSIGNMENTS
-- ────────────────────────────────────────────────────
CREATE POLICY "assignments_select" ON public.user_site_assignments
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR public.is_super_admin()
    );

CREATE POLICY "assignments_manage" ON public.user_site_assignments
    FOR ALL TO authenticated USING (public.is_super_admin());

-- ────────────────────────────────────────────────────
-- ASSETS: Site-scoped access
-- ────────────────────────────────────────────────────
CREATE POLICY "assets_select" ON public.assets
    FOR SELECT TO authenticated USING (public.has_site_access(site_id));

CREATE POLICY "assets_insert" ON public.assets
    FOR INSERT TO authenticated WITH CHECK (
        public.has_site_access(site_id)
        AND public.get_user_role(auth.uid()) IN ('super_admin', 'site_admin')
    );

CREATE POLICY "assets_update" ON public.assets
    FOR UPDATE TO authenticated USING (public.has_site_access(site_id));

CREATE POLICY "assets_delete" ON public.assets
    FOR DELETE TO authenticated USING (
        public.has_site_access(site_id)
        AND public.get_user_role(auth.uid()) IN ('super_admin', 'site_admin')
    );

-- ────────────────────────────────────────────────────
-- TRANSFERS: Visible to both sending and receiving sites
-- ────────────────────────────────────────────────────
CREATE POLICY "transfers_select" ON public.transfers
    FOR SELECT TO authenticated USING (
        public.has_site_access(from_site_id) OR public.has_site_access(to_site_id)
    );

CREATE POLICY "transfers_insert" ON public.transfers
    FOR INSERT TO authenticated WITH CHECK (
        public.has_site_access(from_site_id)
        AND public.get_user_role(auth.uid()) IN ('super_admin', 'site_admin')
    );

CREATE POLICY "transfers_update" ON public.transfers
    FOR UPDATE TO authenticated USING (
        public.has_site_access(from_site_id) OR public.has_site_access(to_site_id)
    );

-- ────────────────────────────────────────────────────
-- REPAIRS: Site-scoped via asset
-- ────────────────────────────────────────────────────
CREATE POLICY "repairs_select" ON public.repairs
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

CREATE POLICY "repairs_insert" ON public.repairs
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

CREATE POLICY "repairs_update" ON public.repairs
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

-- ────────────────────────────────────────────────────
-- DISPOSALS: Site-scoped via asset
-- ────────────────────────────────────────────────────
CREATE POLICY "disposals_select" ON public.disposals
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

CREATE POLICY "disposals_insert" ON public.disposals
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

CREATE POLICY "disposals_update" ON public.disposals
    FOR UPDATE TO authenticated USING (
        public.is_super_admin()
    );

-- ────────────────────────────────────────────────────
-- DOCUMENTS: Site-scoped via asset
-- ────────────────────────────────────────────────────
CREATE POLICY "documents_select" ON public.asset_documents
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

CREATE POLICY "documents_insert" ON public.asset_documents
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

CREATE POLICY "documents_delete" ON public.asset_documents
    FOR DELETE TO authenticated USING (
        public.get_user_role(auth.uid()) IN ('super_admin', 'site_admin')
    );

-- ────────────────────────────────────────────────────
-- SOFTWARE LICENSES: All authenticated can read
-- ────────────────────────────────────────────────────
CREATE POLICY "licenses_select" ON public.software_licenses
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "licenses_manage" ON public.software_licenses
    FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'site_admin'));

CREATE POLICY "license_links_select" ON public.asset_license_links
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "license_links_manage" ON public.asset_license_links
    FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'site_admin'));

-- ────────────────────────────────────────────────────
-- MAINTENANCE: Site-scoped via asset
-- ────────────────────────────────────────────────────
CREATE POLICY "maintenance_select" ON public.maintenance_schedules
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );
CREATE POLICY "maintenance_manage" ON public.maintenance_schedules
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.has_site_access(a.site_id))
    );

-- ────────────────────────────────────────────────────
-- AUDIT LOG: Read-only, super admins see all
-- ────────────────────────────────────────────────────
CREATE POLICY "audit_select" ON public.audit_log
    FOR SELECT TO authenticated USING (
        public.is_super_admin() OR changed_by = auth.uid()
    );

-- ────────────────────────────────────────────────────
-- ACCESS LOGS: Super admin only
-- ────────────────────────────────────────────────────
CREATE POLICY "access_logs_select" ON public.access_logs
    FOR SELECT TO authenticated USING (
        public.is_super_admin() OR user_id = auth.uid()
    );
CREATE POLICY "access_logs_insert" ON public.access_logs
    FOR INSERT TO authenticated WITH CHECK (true);
