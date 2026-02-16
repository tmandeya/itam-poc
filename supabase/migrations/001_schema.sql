-- ══════════════════════════════════════════════════════════════════
-- ITAM POC — Migration 001: Core Schema
-- PostgreSQL 15 (Supabase)
-- ══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM ('super_admin', 'site_admin', 'it_staff');
CREATE TYPE public.asset_status AS ENUM ('active', 'in_store', 'in_repair', 'in_transit', 'disposed');
CREATE TYPE public.asset_condition AS ENUM ('new', 'good', 'fair', 'poor');
CREATE TYPE public.antivirus_status AS ENUM ('protected', 'expired', 'not_applicable');
CREATE TYPE public.transfer_status AS ENUM ('pending_approval', 'approved', 'in_transit', 'completed', 'rejected', 'cancelled');
CREATE TYPE public.repair_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue', 'cancelled');
CREATE TYPE public.disposal_reason AS ENUM ('end_of_life', 'damaged_beyond_repair', 'stolen', 'sold', 'donated', 'recycled', 'lost');
CREATE TYPE public.disposal_status AS ENUM ('pending_approval', 'approved', 'completed', 'rejected');
CREATE TYPE public.document_type AS ENUM ('invoice', 'warranty_card', 'photo', 'manual', 'certificate', 'other');
CREATE TYPE public.license_type AS ENUM ('perpetual', 'subscription', 'oem', 'volume', 'freeware', 'open_source');
CREATE TYPE public.maintenance_type AS ENUM ('warranty_check', 'scheduled_service', 'calibration', 'inspection', 'software_update');
CREATE TYPE public.maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled');

-- ────────────────────────────────────────────────────
-- 2. ORGANISATION STRUCTURE
-- ────────────────────────────────────────────────────
CREATE TABLE public.sites (
    id              VARCHAR(10)     PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    city            VARCHAR(100)    NOT NULL,
    country         CHAR(2)         NOT NULL,
    address         TEXT,
    timezone        VARCHAR(50)     DEFAULT 'UTC',
    contact_name    VARCHAR(100),
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    is_active       BOOLEAN         DEFAULT TRUE,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE TABLE public.departments (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    site_id         VARCHAR(10)     NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    head_name       VARCHAR(100),
    is_active       BOOLEAN         DEFAULT TRUE,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    UNIQUE(name, site_id)
);

CREATE TABLE public.sections (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    department_id   INTEGER         NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    UNIQUE(name, department_id)
);

-- ────────────────────────────────────────────────────
-- 3. USER PROFILES (extends Supabase auth.users)
-- ────────────────────────────────────────────────────
CREATE TABLE public.profiles (
    id              UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       VARCHAR(150)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    role            public.user_role NOT NULL DEFAULT 'it_staff',
    employee_id     VARCHAR(20)     UNIQUE,
    phone           VARCHAR(30),
    job_title       VARCHAR(100),
    avatar_url      TEXT,
    is_active       BOOLEAN         DEFAULT TRUE,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE TABLE public.user_site_assignments (
    id              SERIAL          PRIMARY KEY,
    user_id         UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    site_id         VARCHAR(10)     NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ     DEFAULT NOW(),
    assigned_by     UUID            REFERENCES public.profiles(id),
    UNIQUE(user_id, site_id)
);

CREATE TABLE public.access_logs (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         UUID            REFERENCES public.profiles(id),
    action          VARCHAR(20)     NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user ON public.access_logs(user_id, created_at DESC);

-- ────────────────────────────────────────────────────
-- 4. ASSET CLASSIFICATION
-- ────────────────────────────────────────────────────
CREATE TABLE public.asset_categories (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    useful_life_years INTEGER       DEFAULT 5,
    is_active       BOOLEAN         DEFAULT TRUE
);

CREATE TABLE public.asset_types (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    category_id     INTEGER         REFERENCES public.asset_categories(id),
    icon            VARCHAR(50),
    is_active       BOOLEAN         DEFAULT TRUE
);

CREATE TABLE public.manufacturers (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    website         VARCHAR(255),
    support_phone   VARCHAR(30),
    support_email   VARCHAR(255),
    is_active       BOOLEAN         DEFAULT TRUE
);

-- ────────────────────────────────────────────────────
-- 5. ASSET REGISTER (CORE TABLE)
-- ────────────────────────────────────────────────────
CREATE SEQUENCE public.asset_tag_seq START 1;

CREATE TABLE public.assets (
    -- Identity
    id                      BIGSERIAL       PRIMARY KEY,
    asset_tag               VARCHAR(20)     NOT NULL UNIQUE,
    serial_number           VARCHAR(100),
    mac_address             MACADDR,
    hostname                VARCHAR(100),
    ip_address              INET,

    -- Specs
    manufacturer_id         INTEGER         REFERENCES public.manufacturers(id),
    model                   VARCHAR(200),
    specifications          TEXT,
    asset_type_id           INTEGER         REFERENCES public.asset_types(id),
    category_id             INTEGER         REFERENCES public.asset_categories(id),

    -- Location / Ownership
    site_id                 VARCHAR(10)     NOT NULL REFERENCES public.sites(id),
    department_id           INTEGER         REFERENCES public.departments(id),
    section_id              INTEGER         REFERENCES public.sections(id),
    custodian_id            UUID            REFERENCES public.profiles(id),
    custodian_name          VARCHAR(150),
    previous_custodian_name VARCHAR(150),

    -- Financial
    purchase_date           DATE,
    purchase_value          NUMERIC(12,2)   DEFAULT 0,
    warranty_expiration     DATE,

    -- State
    status                  public.asset_status     NOT NULL DEFAULT 'active',
    condition               public.asset_condition  NOT NULL DEFAULT 'new',
    antivirus_status        public.antivirus_status DEFAULT 'not_applicable',

    -- Meta
    notes                   TEXT,
    created_at              TIMESTAMPTZ     DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     DEFAULT NOW(),
    created_by              UUID            REFERENCES public.profiles(id)
);

CREATE INDEX idx_assets_site ON public.assets(site_id);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_type ON public.assets(asset_type_id);
CREATE INDEX idx_assets_tag ON public.assets(asset_tag);
CREATE INDEX idx_assets_serial ON public.assets(serial_number);

-- ────────────────────────────────────────────────────
-- 6. AUTO-ID TRIGGER: TAG-YYYY-XXXX
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_asset_tag()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.asset_tag IS NULL OR NEW.asset_tag = '' THEN
        NEW.asset_tag := 'TAG-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                         LPAD(NEXTVAL('public.asset_tag_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_tag_generate
    BEFORE INSERT ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_asset_tag();

-- ────────────────────────────────────────────────────
-- 7. DEPRECIATION FUNCTION (Straight-Line)
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_current_value(
    p_purchase_value NUMERIC,
    p_purchase_date DATE,
    p_useful_life_years INTEGER DEFAULT 5
)
RETURNS NUMERIC AS $$
DECLARE
    v_age_years NUMERIC;
    v_annual_depreciation NUMERIC;
    v_current_value NUMERIC;
BEGIN
    IF p_purchase_date IS NULL OR p_purchase_value IS NULL OR p_purchase_value <= 0 THEN
        RETURN 0;
    END IF;

    v_age_years := EXTRACT(EPOCH FROM (NOW() - p_purchase_date)) / (365.25 * 86400);
    v_annual_depreciation := p_purchase_value / GREATEST(p_useful_life_years, 1);
    v_current_value := p_purchase_value - (v_annual_depreciation * v_age_years);

    RETURN GREATEST(ROUND(v_current_value, 2), 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ────────────────────────────────────────────────────
-- 8. UPDATED_AT TRIGGER
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sites_updated_at
    BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────
-- 9. TRANSFERS (Chain of Custody)
-- ────────────────────────────────────────────────────
CREATE TABLE public.transfers (
    id              BIGSERIAL       PRIMARY KEY,
    transfer_ref    VARCHAR(20)     NOT NULL UNIQUE,
    asset_id        BIGINT          NOT NULL REFERENCES public.assets(id),
    from_site_id    VARCHAR(10)     NOT NULL REFERENCES public.sites(id),
    to_site_id      VARCHAR(10)     NOT NULL REFERENCES public.sites(id),
    status          public.transfer_status NOT NULL DEFAULT 'pending_approval',
    reason          TEXT,
    initiated_by    UUID            NOT NULL REFERENCES public.profiles(id),
    approved_by     UUID            REFERENCES public.profiles(id),
    received_by     UUID            REFERENCES public.profiles(id),
    initiated_at    TIMESTAMPTZ     DEFAULT NOW(),
    approved_at     TIMESTAMPTZ,
    shipped_at      TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_transfers_asset ON public.transfers(asset_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);
CREATE INDEX idx_transfers_from ON public.transfers(from_site_id);
CREATE INDEX idx_transfers_to ON public.transfers(to_site_id);

-- Transfer ref auto-generation
CREATE SEQUENCE public.transfer_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_transfer_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transfer_ref IS NULL OR NEW.transfer_ref = '' THEN
        NEW.transfer_ref := 'TRF-' || LPAD(NEXTVAL('public.transfer_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transfer_ref_generate
    BEFORE INSERT ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION public.generate_transfer_ref();

-- ────────────────────────────────────────────────────
-- 10. REPAIRS
-- ────────────────────────────────────────────────────
CREATE TABLE public.repairs (
    id              BIGSERIAL       PRIMARY KEY,
    repair_ref      VARCHAR(20)     NOT NULL UNIQUE,
    asset_id        BIGINT          NOT NULL REFERENCES public.assets(id),
    vendor_name     VARCHAR(200)    NOT NULL,
    vendor_contact  VARCHAR(255),
    issue_description TEXT          NOT NULL,
    repair_cost     NUMERIC(12,2)   DEFAULT 0,
    status          public.repair_status NOT NULL DEFAULT 'pending',
    sent_date       DATE            NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    logged_by       UUID            NOT NULL REFERENCES public.profiles(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE SEQUENCE public.repair_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_repair_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.repair_ref IS NULL OR NEW.repair_ref = '' THEN
        NEW.repair_ref := 'RPR-' || LPAD(NEXTVAL('public.repair_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_repair_ref_generate
    BEFORE INSERT ON public.repairs FOR EACH ROW EXECUTE FUNCTION public.generate_repair_ref();
CREATE TRIGGER trg_repairs_updated_at
    BEFORE UPDATE ON public.repairs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────
-- 11. DISPOSALS
-- ────────────────────────────────────────────────────
CREATE TABLE public.disposals (
    id              BIGSERIAL       PRIMARY KEY,
    disposal_ref    VARCHAR(20)     NOT NULL UNIQUE,
    asset_id        BIGINT          NOT NULL REFERENCES public.assets(id),
    reason          public.disposal_reason NOT NULL,
    status          public.disposal_status NOT NULL DEFAULT 'pending_approval',
    reason_detail   TEXT,
    requested_by    UUID            NOT NULL REFERENCES public.profiles(id),
    approved_by     UUID            REFERENCES public.profiles(id),
    requested_at    TIMESTAMPTZ     DEFAULT NOW(),
    approved_at     TIMESTAMPTZ,
    evidence_url    TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE SEQUENCE public.disposal_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_disposal_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.disposal_ref IS NULL OR NEW.disposal_ref = '' THEN
        NEW.disposal_ref := 'DSP-' || LPAD(NEXTVAL('public.disposal_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_disposal_ref_generate
    BEFORE INSERT ON public.disposals FOR EACH ROW EXECUTE FUNCTION public.generate_disposal_ref();

-- ────────────────────────────────────────────────────
-- 12. DOCUMENT VAULT
-- ────────────────────────────────────────────────────
CREATE TABLE public.asset_documents (
    id              BIGSERIAL       PRIMARY KEY,
    asset_id        BIGINT          NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    file_name       VARCHAR(255)    NOT NULL,
    file_type       public.document_type NOT NULL DEFAULT 'other',
    storage_path    TEXT            NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by     UUID            NOT NULL REFERENCES public.profiles(id),
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_documents_asset ON public.asset_documents(asset_id);

-- ────────────────────────────────────────────────────
-- 13. SOFTWARE LICENSES
-- ────────────────────────────────────────────────────
CREATE TABLE public.software_licenses (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    vendor          VARCHAR(200),
    license_key     TEXT,
    license_type    public.license_type NOT NULL DEFAULT 'perpetual',
    total_seats     INTEGER         DEFAULT 1,
    used_seats      INTEGER         DEFAULT 0,
    purchase_date   DATE,
    expiry_date     DATE,
    cost            NUMERIC(12,2)   DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE TABLE public.asset_license_links (
    id              SERIAL          PRIMARY KEY,
    asset_id        BIGINT          NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    license_id      INTEGER         NOT NULL REFERENCES public.software_licenses(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ     DEFAULT NOW(),
    UNIQUE(asset_id, license_id)
);

-- ────────────────────────────────────────────────────
-- 14. MAINTENANCE SCHEDULES
-- ────────────────────────────────────────────────────
CREATE TABLE public.maintenance_schedules (
    id              BIGSERIAL       PRIMARY KEY,
    asset_id        BIGINT          NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    maintenance_type public.maintenance_type NOT NULL,
    status          public.maintenance_status NOT NULL DEFAULT 'scheduled',
    scheduled_date  DATE            NOT NULL,
    completed_date  DATE,
    assigned_to     UUID            REFERENCES public.profiles(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

-- ────────────────────────────────────────────────────
-- 15. AUDIT LOG (IMMUTABLE)
-- ────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    table_name      VARCHAR(50)     NOT NULL,
    record_id       TEXT            NOT NULL,
    action          VARCHAR(20)     NOT NULL,
    old_data        JSONB,
    new_data        JSONB,
    changed_by      UUID,
    changed_at      TIMESTAMPTZ     DEFAULT NOW(),
    ip_address      INET
);

CREATE INDEX idx_audit_log_table ON public.audit_log(table_name, changed_at DESC);
CREATE INDEX idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(changed_by);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'created', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'deleted', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to core tables
CREATE TRIGGER trg_audit_assets
    AFTER INSERT OR UPDATE OR DELETE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER trg_audit_transfers
    AFTER INSERT OR UPDATE OR DELETE ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER trg_audit_repairs
    AFTER INSERT OR UPDATE OR DELETE ON public.repairs
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER trg_audit_disposals
    AFTER INSERT OR UPDATE OR DELETE ON public.disposals
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ────────────────────────────────────────────────────
-- 16. HELPER: Get user's assigned site IDs
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_site_ids(p_user_id UUID)
RETURNS VARCHAR(10)[] AS $$
    SELECT COALESCE(array_agg(site_id), ARRAY[]::VARCHAR(10)[])
    FROM public.user_site_assignments
    WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────
-- 17. HELPER: Get user's role
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles WHERE id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────
-- 18. VIEW: Assets with computed depreciation
-- ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.assets_with_value AS
SELECT
    a.*,
    m.name AS manufacturer_name,
    at.name AS type_name,
    ac.name AS category_name,
    ac.useful_life_years,
    s.name AS site_name,
    s.city AS site_city,
    d.name AS department_name,
    public.calculate_current_value(a.purchase_value, a.purchase_date, COALESCE(ac.useful_life_years, 5)) AS current_value
FROM public.assets a
LEFT JOIN public.manufacturers m ON a.manufacturer_id = m.id
LEFT JOIN public.asset_types at ON a.asset_type_id = at.id
LEFT JOIN public.asset_categories ac ON a.category_id = ac.id
LEFT JOIN public.sites s ON a.site_id = s.id
LEFT JOIN public.departments d ON a.department_id = d.id;

-- ────────────────────────────────────────────────────
-- 19. VIEW: Dashboard aggregates
-- ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
    COUNT(*)::INTEGER AS total_assets,
    COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS active_assets,
    COUNT(*) FILTER (WHERE status = 'in_repair')::INTEGER AS in_repair_assets,
    COUNT(*) FILTER (WHERE status = 'in_transit')::INTEGER AS in_transit_assets,
    COUNT(*) FILTER (WHERE status = 'disposed')::INTEGER AS disposed_assets,
    COUNT(*) FILTER (WHERE status = 'in_store')::INTEGER AS in_store_assets,
    COALESCE(SUM(purchase_value), 0)::NUMERIC AS total_purchase_value,
    COALESCE(SUM(public.calculate_current_value(purchase_value, purchase_date, 5)), 0)::NUMERIC AS total_current_value,
    COUNT(*) FILTER (WHERE warranty_expiration IS NOT NULL AND warranty_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days')::INTEGER AS warranty_expiring_soon
FROM public.assets
WHERE status != 'disposed';

-- ────────────────────────────────────────────────────
-- 20. FUNCTION: Profile auto-create on auth signup
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'it_staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
