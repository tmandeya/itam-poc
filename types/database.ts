// ══════════════════════════════════════════════════════
// ITAM POC — TypeScript Type Definitions
// ══════════════════════════════════════════════════════

export type UserRole = 'super_admin' | 'site_admin' | 'it_staff';
export type AssetStatus = 'active' | 'in_store' | 'in_repair' | 'in_transit' | 'disposed';
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor';
export type AntivirusStatus = 'protected' | 'expired' | 'not_applicable';
export type TransferStatus = 'pending_approval' | 'approved' | 'in_transit' | 'completed' | 'rejected' | 'cancelled';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type DisposalReason = 'end_of_life' | 'damaged_beyond_repair' | 'stolen' | 'sold' | 'donated' | 'recycled' | 'lost';
export type DisposalStatus = 'pending_approval' | 'approved' | 'completed' | 'rejected';
export type DocumentType = 'invoice' | 'warranty_card' | 'photo' | 'manual' | 'certificate' | 'other';

export interface Site {
  id: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  timezone: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  employee_id?: string;
  phone?: string;
  job_title?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSiteAssignment {
  id: number;
  user_id: string;
  site_id: string;
  assigned_at: string;
  assigned_by?: string;
}

export interface AssetCategory {
  id: number;
  name: string;
  description?: string;
  useful_life_years: number;
  is_active: boolean;
}

export interface AssetType {
  id: number;
  name: string;
  category_id?: number;
  icon?: string;
  is_active: boolean;
}

export interface Manufacturer {
  id: number;
  name: string;
  website?: string;
  support_phone?: string;
  support_email?: string;
  is_active: boolean;
}

export interface Asset {
  id: number;
  asset_tag: string;
  serial_number?: string;
  mac_address?: string;
  hostname?: string;
  ip_address?: string;
  manufacturer_id?: number;
  model?: string;
  specifications?: string;
  asset_type_id?: number;
  category_id?: number;
  site_id: string;
  department_id?: number;
  section_id?: number;
  custodian_id?: string;
  custodian_name?: string;
  previous_custodian_name?: string;
  purchase_date?: string;
  purchase_value: number;
  warranty_expiration?: string;
  status: AssetStatus;
  condition: AssetCondition;
  antivirus_status: AntivirusStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AssetWithValue extends Asset {
  manufacturer_name?: string;
  type_name?: string;
  category_name?: string;
  useful_life_years?: number;
  site_name?: string;
  site_city?: string;
  department_name?: string;
  current_value: number;
}

export interface Transfer {
  id: number;
  transfer_ref: string;
  asset_id: number;
  from_site_id: string;
  to_site_id: string;
  status: TransferStatus;
  reason?: string;
  initiated_by: string;
  approved_by?: string;
  received_by?: string;
  initiated_at: string;
  approved_at?: string;
  shipped_at?: string;
  received_at?: string;
  notes?: string;
  created_at: string;
}

export interface Repair {
  id: number;
  repair_ref: string;
  asset_id: number;
  vendor_name: string;
  vendor_contact?: string;
  issue_description: string;
  repair_cost: number;
  status: RepairStatus;
  sent_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  logged_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Disposal {
  id: number;
  disposal_ref: string;
  asset_id: number;
  reason: DisposalReason;
  status: DisposalStatus;
  reason_detail?: string;
  requested_by: string;
  approved_by?: string;
  requested_at: string;
  approved_at?: string;
  evidence_url?: string;
  notes?: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  changed_by?: string;
  changed_at: string;
  ip_address?: string;
}

export interface DashboardStats {
  total_assets: number;
  active_assets: number;
  in_repair_assets: number;
  in_transit_assets: number;
  disposed_assets: number;
  in_store_assets: number;
  total_purchase_value: number;
  total_current_value: number;
  warranty_expiring_soon: number;
}
