// Typed calls to our Frappe app (adeel_traders.api.v1). Contracts mirror the Python
// docstrings in apps/adeel_traders/adeel_traders/api/v1/*.py.
import { get, getRaw, post } from "./frappe"

const V1 = "adeel_traders.api.v1"

/** What a user may do. Calculated by the server from real permissions (docs/PERMISSIONS.md). */
export type CapabilityName =
  | "products.view"
  | "products.create"
  | "products.edit"
  | "catalogue.manage"
  | "prices.edit"
  | "cost.view"
  | "stock.view"
  | "stock.move"
  | "stock.adjust"
  | "stock.backdate"
  | "stock.count"
  | "stock.count.post"
  | "barcode.generate_print"
  | "export.lists"
  | "reports.stock"
  | "audit.view"
  | "approvals.inbox"
  | "email.manage"
  | "integrations.view"
  | "units.manage"
  | "payments.manage"
  | "numbering.view"
  | "users.manage"
  | "roles.manage"
  | "company.manage"

export type ReportColumn = {
  key: string
  label: string
  type: "text" | "qty" | "money" | "date"
}

/** One page of an ERPNext report, with our filters (api/v1/reports.py). */
export type ReportResult = {
  key: string
  title: string
  description: string
  columns: ReportColumn[]
  filters: ("dates" | "branch" | "category" | "brand")[]
  options: { branches?: string[]; categories?: string[]; brands?: string[] }
  /** The dates actually used (this month when none were chosen). */
  applied: { from_date: string; to_date: string }
  rows: Record<string, string | number | null>[]
  total: number
  /** Totals of stock you can sell (damaged, returns and testers are not in them). */
  totals: Record<string, number>
  /** Damaged, returns and testers added up on their own; null when there are none. */
  not_for_sale_totals: Record<string, number> | null
}

export type ReportParams = {
  from_date?: string
  to_date?: string
  branch?: string
  category?: string
  brand?: string
  search?: string
  sort?: string
  hide_zero?: string
  start?: number
  page_length?: number
}

/** One thing that happened to a record, in words from the server (api/v1/history.py). */
export type HistoryEvent = {
  at: string
  user: string
  user_name: string
  kind:
    | "created"
    | "changed"
    | "submitted"
    | "cancelled"
    | "deleted"
    | "note"
    | "login"
    | "logout"
    | "login_failed"
    | string
  summary: string
  changes: { field: string; from: string; to: string; action?: string }[]
  doctype: string
  name: string
  /** The record in words, e.g. "Velvet Matte Lipstick · Wholesale price". */
  title: string
  /** The record that has a page in the app (a price links to its product). */
  link: { doctype: string; name: string }
  /** What the record is, for a sentence: "address", "person", "role" (empty for prices). */
  type_word: string
  /** Less important facts, shown on request: the network address of a login. */
  detail?: string | null
  area: string
}

export type HistoryPage = { events: HistoryEvent[]; has_more: boolean }

export type AuditLogPage = HistoryPage & {
  areas: string[]
  people: { name: string; full_name: string }[]
}

/** One row of the email templates list (Frappe's Email Template). */
export type EmailTemplateRow = {
  name: string
  subject: string
  modified: string
  /** What the email is for ("Sales Order"). Empty for ERPNext's built-in templates. */
  reference_doctype: string | null
  response: string | null
}

/** A field of a document type, from Frappe's own description of it. */
export type DocFieldInfo = {
  fieldname: string
  label: string | null
  fieldtype: string
  hidden?: 0 | 1
  options?: string | null
}

/** A document waiting for the current user's decision (api/v1/approvals.py). */
export type ApprovalItem = {
  doctype: string
  name: string
  title: string
  state: string
  amount: number | null
  asked_by: string
  asked_by_name: string
  since: string
  /** What this user may do now, e.g. ["Approve", "Reject"]. */
  actions: string[]
}

export type ApprovalState = {
  workflow: string | null
  state: string | null
  actions: string[]
  /** Roles that may move the document on from here. */
  waiting_for: string[]
  final: boolean
}

/** A bell notification (Frappe's Notification Log, only the user's own). */
export type AppNotification = {
  name: string
  subject: string
  document_type: string | null
  document_name: string | null
  /** A staff-app page to open, when the sender set one. */
  link: string | null
  read: 0 | 1
  creation: string
  from_user: string | null
}

/** Settings > Integrations (pk_integrations/base.py). */
export type IntegrationStatus = {
  services: {
    key: string
    label: string
    purpose: string
    phase: string
    connected: boolean
    last_call: string | null
    last_status: string | null
    failed_7_days: number
  }[]
  calls: {
    name: string
    service: string
    action: string
    status: "Queued" | "Completed" | "Failed" | string
    at: string
    attempt: number
    error: string
    reference: [string, string] | null
    can_retry: boolean
  }[]
  max_tries: number
}

/** A Settings list: units, payment methods (api/v1/masters.py). */
export type MasterKind = "units" | "payment-methods"
export type MasterItem = {
  name: string
  enabled: boolean
  used: number
  type: string | null
  /** Units only: */
  /** Counted in whole numbers (pieces, boxes) or can be split (kg, litres). */
  whole_number?: boolean
  /** Used by the app's own code: keeps its name. */
  core?: boolean
  /** The unit all stock is counted in (Piece). */
  base_unit?: boolean
  /** Usual number of Pieces in one of this unit, for products without a size of their own. */
  standard?: number | null
  can_delete?: boolean
}
export type MasterList = {
  kind: MasterKind
  title: string
  items: MasterItem[]
  /** Kinds to choose from (payment methods: Cash, Bank, General, Phone). */
  types: string[]
  /** Units only: the base unit all stock is counted in. */
  base?: string
  can_edit: boolean
}

export type Numbering = {
  documents: {
    doctype: string
    label: string
    series: { series: string; current: number | null; next: string | null }[]
  }[]
}

export type Session = {
  user: string
  full_name: string
  csrf_token: string
  company: string
  /** The person's role(s) in words, e.g. "Owner"; empty when they have none of ours. */
  role_label: string
  can_view_cost: boolean
  capabilities: Record<CapabilityName, boolean>
  /** Branches the user is limited to (empty = all branches). */
  branches: string[]
  /** Set after the owner gives a temporary password: the app asks for a new one first. */
  must_change_password: boolean
  /** An outgoing email account is set up; before that Frappe cannot send email. */
  email_ready: boolean
}

export type PersonRole = { key: string; label: string; built_in: boolean }
export type Person = {
  user: string
  name: string
  email: string
  enabled: boolean
  roles: PersonRole[]
  /** One branch, or empty = all branches. */
  branches: string[]
  last_login: string | null
  last_active: string | null
  must_change_password: boolean
  is_you: boolean
}
/** What the owner can act on: signed in now, usage, password state, wrong-password attempts. */
export type PersonAccess = {
  last_active: string | null
  last_login: string | null
  last_ip: string | null
  password_changed_on: string | null
  temporary_password: boolean
  /** Devices signed in right now. */
  sessions: { ip: string | null; last_active: string }[]
  failed_today: number
  failed_7_days: number
  /** Too many wrong passwords: cannot log in until locked_until (or the owner unlocks). */
  locked: boolean
  locked_until: string | null
  /** Successful logins per day, oldest first (7 days). */
  days: { date: string; logins: number }[]
}
export type PersonDetail = Person & {
  access: PersonAccess
  roles_available: PersonRole[]
  branches_available: string[]
}
export type PeopleList = {
  people: Person[]
  roles: PersonRole[]
  branches: string[]
  counts: { active: number; disabled: number; must_change_password: number }
}

export type PlaceAddress = {
  address_line1: string
  city: string
  phone: string
}
export type CompanyBranch = {
  name: string
  /** Stock locations of this branch. */
  warehouses: string[]
  /** Where this branch's sales and expenses are booked. */
  cost_center: string | null
  /** People limited to this branch (people working at all branches are not counted). */
  people: number
  address: PlaceAddress
}
export type CompanyPage = {
  details: {
    name: string
    /** Short code on accounts and locations ("Cash - AT"); never changes. */
    abbr: string
    tax_id: string
    phone_no: string
    email: string
    website: string
    currency: string
    country: string
  }
  address: PlaceAddress
  logo: string | null
  branches: CompanyBranch[]
  /** Locations of no branch (Damaged, Returns, Testers): anyone may use them. */
  shared_locations: string[]
}

export type ChannelPrice = {
  price_list: string
  rate: number | null
  margin: number | null
}

export type ProductRow = {
  item_code: string
  item_name: string
  item_group: string
  brand: string | null
  stock_uom: string
  image: string | null
  disabled: 0 | 1
  variant_of: string | null
  has_batch_no: 0 | 1
  barcode: string | null
  cost: number | null
  prices: ChannelPrice[]
  /** Sellable stock only (Damaged, Returns and Testers are left out). */
  stock_qty: number | null
  not_for_sale_qty: number | null
  reserved_qty: number | null
  is_stock_item: 0 | 1
  /** Sets that can be packed now (Product Bundles only). */
  bundle_available: number | null
  /** Calculated on the server from stock, reorder levels and batch expiry. */
  status: StockStatus | "bundle" | null
  expiring: boolean
  reorder_level: number | null
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock"
export type StatusFilter = "all" | StockStatus | "expiring" | "restock"
export type ProductSort = "name" | "stock_low" | "stock_high" | "newest"

export type ProductList = {
  items: ProductRow[]
  total: number
  counts: Record<StatusFilter, number>
  summary: {
    products: number
    units: number | null
    stock_value: number | null
    /** Damaged, to-check and tester stock: owned and on the books, but not sellable. */
    not_for_sale_units: number | null
    not_for_sale_value: number | null
    categories: number
    locations: number | null
    /** Quantity and value at cost per location (value null for non-cost viewers). */
    by_location:
      | {
          warehouse: string
          for_sale: boolean
          qty: number
          value: number | null
        }[]
      | null
  }
  /** Products at or below a reorder level that is set. Top few by shortfall. */
  restock: {
    count: number
    items: {
      item_code: string
      item_name: string
      on_hand: number
      reorder_level: number
    }[]
    /** Out of stock but no reorder level, so not counted above. */
    out_without_level: number
  }
  can_view_cost: boolean
}

export type ProductDetail = {
  item_code: string
  item_name: string
  item_group: string
  brand: string | null
  description: string | null
  image: string | null
  stock_uom: string
  disabled: 0 | 1
  variant_of: string | null
  attributes: { attribute: string; value: string }[]
  has_batch_no: 0 | 1
  is_stock_item: 0 | 1
  bundle: {
    sets_available: number
    /** Why sets_available is 0 (null when sets can be packed). */
    blocked_by:
      | {
          type: "part_out_of_stock"
          item_code: string
          item_name: string
          in_stock: number
        }
      | { type: "parts_in_different_locations" }
      | null
    parts: {
      item_code: string
      item_name: string
      qty_per_set: number
      in_stock: number
      /** Sets this part alone could make. */
      enough_for: number
      /** The part that limits how many sets can be packed. */
      limiting: boolean
    }[]
  } | null
  has_expiry_date: 0 | 1
  shelf_life_in_days: number | null
  barcodes: { barcode: string; type: string | null }[]
  uoms: { uom: string; conversion_factor: number }[]
  cost: number | null
  prices: ChannelPrice[]
  unit_prices: {
    price_list: string
    uom: string
    rate: number
    per_piece: number | null
    /** % cheaper per piece than the same number of single pieces. */
    discount: number | null
    margin: number | null
  }[]
  warehouses:
    | {
        warehouse: string
        /** false for Damaged, Returns and Testers: never counted as sellable. */
        for_sale: boolean
        qty: number
        reserved: number
        projected: number
        value: number | null
      }[]
    | null
  status: StockStatus | "bundle" | null
  reorder_level: number | null
  /** Reorder level and quantity of the Main Warehouse (what the edit screen changes). */
  reorder_main: { level: number; qty: number }
  /** Value at cost of the sellable stock (null if cost is hidden for this user). */
  stock_value: number | null
  /** Everything physically there: sellable plus not for sale. */
  physical_qty: number | null
  not_for_sale_qty: number | null
  not_for_sale_value: number | null
  batches: {
    batch_no: string
    warehouse: string
    qty: number
    expiry_date: string | null
  }[]
  can: {
    view_cost: boolean
    edit_prices: boolean
    move_stock: boolean
    generate_barcode: boolean
    edit_product: boolean
    add_shade: boolean
    add_variant: boolean
  }
}

export type FormOptions = {
  /** Locations the user may take stock from (own branch + shared locations). */
  warehouses: string[]
  /** Every active location: stock may be sent to any branch. */
  all_warehouses: string[]
  item_groups: string[]
  uoms: string[]
  price_lists: string[]
  adjustment_types: string[]
  brands: string[]
}

export type VariantAttribute = {
  attribute: string
  values: { value: string; abbr: string }[]
}

export type CatalogueCategory = {
  name: string
  parent: string | null
  is_group: 0 | 1
  products: number
}
export type Catalogue = {
  categories: CatalogueCategory[]
  brands: { name: string; products: number }[]
  can_edit: boolean
}

export type StockHistoryRow = {
  date: string
  time: string
  what: string
  document_type: string
  document: string
  location: string
  for_sale: boolean
  qty: number
  balance_here: number
  value: number | null
}

export type StockCountStatus = "Draft" | "Submitted" | "Cancelled"
export type StockCount = {
  name: string
  warehouse: string
  posting_date: string
  status: StockCountStatus
  stock_reconciliation: string | null
  /** Full count of the location: anything with stock that was not scanned counts as missing. */
  unscanned_as_zero: boolean
  /** System numbers are null for staff who cannot post the count (blind count, enforced by the server). */
  rows: {
    row: string
    item_code: string
    item_name: string
    batch_no: string | null
    /** A product with stock that nobody scanned, counted as zero (full count). */
    not_scanned: boolean
    counted: number
    system: number | null
    difference: number | null
    difference_value: number | null
  }[]
  unscanned: {
    item_code: string
    item_name: string
    system: number
    difference: number
    difference_value: number | null
  }[]
  totals: {
    counted: number
    difference: number | null
    difference_value: number | null
    rows: number
    rows_with_difference: number | null
  }
  can: { edit: boolean; submit: boolean; cancel: boolean; email: boolean }
}
export type NeedsBatch = {
  needs_batch: true
  item_code: string
  item_name: string
  batches: { batch_no: string; qty: number }[]
}
export type StockCountList = {
  counts: {
    name: string
    warehouse: string
    posting_date: string
    status: StockCountStatus
    counted: number
    /** null for open counts when you cannot post them (blind count). */
    difference: number | null
    by: string
  }[]
  can_create: boolean
  warehouses: string[]
}

/** One row of the permission grid. The server decides which areas and actions exist. */
export type RoleArea = {
  area: string
  label: string
  /** One word for table headings. */
  short: string
  help: string
  actions: { key: string; label: string }[]
  /** Ticking this area also needs these (area, action) pairs, e.g. stock needs products "view". */
  requires: { area: string; action: string }[]
  /** What the owner picks, from none to most. The server writes the sentences. */
  levels: {
    key: string
    label: string
    sentence: string
    actions: string[]
    rank: number
  }[]
}
export type RoleGrants = Record<string, string[]>
/** Yes/no switches of a role (see cost, export, change history, approvals): key -> on. */
export type RoleFlags = Record<string, boolean>
/** A switch as the server describes it (permission_areas.switches). */
export type RoleSwitch = {
  key: string
  title: string
  help: string
  private: boolean
}
export type RoleSummary = {
  name: string
  label: string
  built_in: boolean
  description: string
  users: number
  people: { user: string; name: string }[]
  areas: RoleGrants
  /** Level per area ("none", "see", "change", ... or "custom"). */
  levels: Record<string, string>
  flags: RoleFlags
  /** Plain-English lines written by the server. */
  summary: string[]
}
export type RoleDetail = RoleSummary & {
  registry: RoleArea[]
  switches: RoleSwitch[]
}

export type GiftSetPart = { item_code: string; qty: number }

export const api = {
  me: () => get<Session>(`${V1}.session.me`),
  listProducts: (params: {
    search?: string
    item_group?: string
    brand?: string
    status?: StatusFilter
    sort?: ProductSort
    start?: number
    page_length?: number
  }) => get<ProductList>(`${V1}.products.list_products`, params),
  getProduct: (item_code: string) =>
    get<ProductDetail>(`${V1}.products.get_product`, { item_code }),
  formOptions: () => get<FormOptions>(`${V1}.products.form_options`),
  setPrice: (body: {
    item_code: string
    price_list: string
    rate: number
    uom?: string
  }) =>
    post<{ price_list: string; uom: string; rate: number }>(
      `${V1}.products.set_price`,
      body
    ),
  createProduct: (body: {
    item_code: string
    item_name: string
    item_group: string
    stock_uom: string
    has_batch_no: boolean
    shelf_life_in_days: number
    prices: Record<string, number | null>
    /** Scanned barcode; empty means "generate one". */
    barcode?: string
    brand?: string | null
    description?: string
  }) => post<{ item_code: string }>(`${V1}.products.create_product`, body),
  transferStock: (body: {
    item_code: string
    from_warehouse: string
    to_warehouse: string
    qty: number
  }) => post<{ stock_entry: string }>(`${V1}.products.transfer_stock`, body),
  adjustStock: (body: {
    item_code: string
    warehouse: string
    qty: number
    adjustment_type: string
    reason: string
  }) => post<{ stock_entry: string }>(`${V1}.products.adjust_stock`, body),
  updateProduct: (body: {
    item_code: string
    item_name: string
    item_group: string
    reorder_level: number
    reorder_qty: number
    disabled: boolean
    brand: string | null
    description: string
  }) => post<{ item_code: string }>(`${V1}.products.update_product`, body),
  setProductImage: (item_code: string, file_url: string | null) =>
    post<{ image: string | null }>(`${V1}.products.set_product_image`, {
      item_code,
      file_url,
    }),
  variantAttributes: (item_code: string) =>
    get<VariantAttribute[]>(`${V1}.products.variant_attributes`, { item_code }),
  addVariant: (body: {
    item_code: string
    values: Record<string, { value: string; abbr?: string }>
  }) => post<{ item_code: string }>(`${V1}.products.add_variant`, body),
  createGiftSet: (body: {
    item_code: string
    item_name: string
    item_group?: string
    parts: GiftSetPart[]
    prices: Record<string, number | null>
    barcode?: string
  }) => post<{ item_code: string }>(`${V1}.products.create_gift_set`, body),
  updateGiftSetParts: (item_code: string, parts: GiftSetPart[]) =>
    post<{ item_code: string }>(`${V1}.products.update_gift_set_parts`, {
      item_code,
      parts,
    }),
  stockHistory: (item_code: string, start = 0) =>
    get<{ rows: StockHistoryRow[]; more: boolean }>(
      `${V1}.products.get_stock_history`,
      { item_code, start, page_length: 20 }
    ),
  catalogue: () => get<Catalogue>(`${V1}.catalogue.get_catalogue`),
  addCategory: (name: string, parent: string) =>
    post<{ name: string }>(`${V1}.catalogue.add_category`, { name, parent }),
  addBrand: (name: string) =>
    post<{ name: string }>(`${V1}.catalogue.add_brand`, { name }),
  renameCatalogue: (
    doctype: "Item Group" | "Brand",
    old_name: string,
    new_name: string
  ) =>
    post<{ name: string }>(`${V1}.catalogue.rename`, {
      doctype,
      old_name,
      new_name,
    }),
  deleteBrand: (name: string) =>
    post<{ deleted: string }>(`${V1}.catalogue.delete_brand`, { name }),
  stockCounts: () => get<StockCountList>(`${V1}.stock_count.list_counts`),
  startCount: (warehouse: string) =>
    post<StockCount>(`${V1}.stock_count.start_count`, { warehouse }),
  getCount: (name: string) =>
    get<StockCount>(`${V1}.stock_count.get_count`, { name }),
  scanCount: (body: {
    name: string
    code: string
    qty?: number
    batch_no?: string
  }) => post<StockCount | NeedsBatch>(`${V1}.stock_count.scan`, body),
  setCounted: (name: string, row: string, counted: number) =>
    post<StockCount>(`${V1}.stock_count.set_counted`, { name, row, counted }),
  removeCountRow: (name: string, row: string) =>
    post<StockCount>(`${V1}.stock_count.remove_row`, { name, row }),
  submitCount: (name: string) =>
    post<StockCount>(`${V1}.stock_count.submit_count`, { name }),
  setUnscannedAsZero: (name: string, value: boolean) =>
    post<StockCount>(`${V1}.stock_count.set_unscanned_as_zero`, {
      name,
      value,
    }),
  cancelCount: (name: string) =>
    post<StockCount>(`${V1}.stock_count.cancel_count`, { name }),
  deleteCount: (name: string) =>
    post<{ deleted: string }>(`${V1}.stock_count.delete_count`, { name }),
  roles: () =>
    get<{
      roles: RoleSummary[]
      registry: RoleArea[]
      switches: RoleSwitch[]
    }>(`${V1}.roles.list_roles`),
  role: (name: string) => get<RoleDetail>(`${V1}.roles.get_role`, { name }),
  createRole: (body: {
    name: string
    description?: string
    copy_from?: string
  }) => post<RoleSummary>(`${V1}.roles.create_role`, body),
  saveRole: (body: {
    name: string
    areas: RoleGrants
    /** Not called "flags": Frappe's HTTP layer drops an argument with that name. */
    switches: RoleFlags
    description?: string
  }) => post<RoleSummary>(`${V1}.roles.save_role`, body),
  deleteRole: (name: string) =>
    post<{ deleted: string }>(`${V1}.roles.delete_role`, { name }),
  people: () => get<PeopleList>(`${V1}.people.list_people`),
  person: (user: string) =>
    get<PersonDetail>(`${V1}.people.get_person`, { user }),
  addPerson: (body: {
    full_name: string
    email: string
    roles: string[]
    /** Empty = all branches. */
    branches: string[]
    confirm_owner?: 0 | 1
  }) =>
    post<{ user: string; temp_password: string }>(
      `${V1}.people.add_person`,
      body
    ),
  updatePerson: (body: {
    user: string
    roles?: string[]
    /** Leave out to keep them; empty list = all branches. */
    branches?: string[]
    enabled?: 0 | 1
    confirm_owner?: 0 | 1
  }) => post<Person>(`${V1}.people.update_person`, body),
  resetPassword: (user: string) =>
    post<{ temp_password: string }>(`${V1}.people.reset_password`, { user }),
  history: (doctype: string, name: string, start = 0) =>
    get<HistoryPage>(`${V1}.history.get_history`, {
      doctype,
      name,
      start,
      page_length: 15,
    }),
  auditLog: (params: {
    user?: string
    area?: string
    from_date?: string
    to_date?: string
    search?: string
    include_system?: string
    start?: number
    page_length?: number
  }) => get<AuditLogPage>(`${V1}.history.audit_log`, params),
  // Bell: Frappe's own notification calls (they only ever return the user's own notifications).
  notifications: () =>
    get<{
      notification_logs: AppNotification[]
      user_info: Record<string, { fullname?: string }>
    }>(
      "frappe.desk.doctype.notification_log.notification_log.get_notification_logs",
      { limit: 20 }
    ),
  unreadNotifications: () =>
    get<number>("frappe.client.get_count", {
      doctype: "Notification Log",
      filters: JSON.stringify({ read: 0 }),
    }),
  markNotificationRead: (docname: string) =>
    post("frappe.desk.doctype.notification_log.notification_log.mark_as_read", {
      docname,
    }),
  markAllNotificationsRead: () =>
    post(
      "frappe.desk.doctype.notification_log.notification_log.mark_all_as_read"
    ),
  // Settings > Email: Frappe's own permission-checked calls (owner only).
  emailAccounts: () =>
    get<
      {
        name: string
        email_id: string
        enable_outgoing: 0 | 1
        default_outgoing: 0 | 1
      }[]
    >("frappe.client.get_list", {
      doctype: "Email Account",
      fields: JSON.stringify([
        "name",
        "email_id",
        "enable_outgoing",
        "default_outgoing",
      ]),
      limit_page_length: 20,
    }),
  emailQueueCount: (filters: Record<string, unknown>) =>
    get<number>("frappe.client.get_count", {
      doctype: "Email Queue",
      filters: JSON.stringify(filters),
    }),
  emailTemplates: () =>
    get<EmailTemplateRow[]>("frappe.client.get_list", {
      doctype: "Email Template",
      fields: JSON.stringify([
        "name",
        "subject",
        "modified",
        "reference_doctype",
        "response",
      ]),
      order_by: "name asc",
      limit_page_length: 200,
    }),
  emailTemplate: (name: string) =>
    get<{
      name: string
      subject: string
      response: string | null
      response_html: string | null
      use_html: 0 | 1
      reference_doctype: string | null
    }>("frappe.client.get", { doctype: "Email Template", name }),
  /** The fields of a document type, as Frappe describes them (what a template may mention). */
  docFields: (doctype: string) =>
    getRaw<{ docs: { fields?: DocFieldInfo[] }[] }>(
      "frappe.desk.form.load.getdoctype",
      { doctype }
    ).then((r) => r.docs[0]?.fields ?? []),
  saveEmailTemplate: (
    name: string,
    values: { subject: string; body: string; reference_doctype?: string },
    isNew: boolean,
    /** The template keeps its HTML in its own field; saving must not move it to the text field. */
    useHtml = false
  ) => {
    const fields = {
      subject: values.subject,
      reference_doctype: values.reference_doctype || null,
      use_html: useHtml ? 1 : 0,
      ...(useHtml ? { response_html: values.body } : { response: values.body }),
    }
    return isNew
      ? post("frappe.client.insert", {
          doc: { doctype: "Email Template", name, ...fields },
        })
      : post("frappe.client.set_value", {
          doctype: "Email Template",
          name,
          fieldname: fields,
        })
  },
  shareLink: (doctype: string, name: string, print_format?: string) =>
    post<{ url: string; expires_on: string }>(`${V1}.printing.share_link`, {
      doctype,
      name,
      print_format,
    }),
  /** Frappe's own "email this document" (the PDF is attached; queued until sending is on). */
  emailDocument: (body: {
    doctype: string
    name: string
    recipients: string
    subject: string
    content: string
    print_format: string
    print_letterhead: boolean
    letterhead?: string
  }) =>
    post("frappe.core.doctype.communication.email.make", {
      ...body,
      send_email: 1,
      attach_document_print: 1,
    }),
  integrations: () => get<IntegrationStatus>("pk_integrations.base.status"),
  retryIntegration: (name: string) =>
    post<{ ok: boolean }>("pk_integrations.base.retry", { name }),
  masters: (kind: MasterKind) =>
    get<MasterList>(`${V1}.masters.list_masters`, { kind }),
  addMaster: (
    kind: MasterKind,
    name: string,
    extra: { type?: string; whole_number?: boolean; pieces?: number } = {}
  ) =>
    post<{ name: string }>(`${V1}.masters.add_master`, {
      kind,
      name,
      type: extra.type,
      whole_number: extra.whole_number === false ? 0 : 1,
      pieces: extra.pieces,
    }),
  /** Change the kind of a payment method (Frappe's own set_value; Frappe checks the permission). */
  setPaymentKind: (name: string, type: string) =>
    post("frappe.client.set_value", {
      doctype: "Mode of Payment",
      name,
      fieldname: "type",
      value: type,
    }),
  setStandardSize: (name: string, pieces: number | null) =>
    post<{ name: string; standard: number | null }>(
      `${V1}.masters.set_standard_size`,
      { name, pieces }
    ),
  renameMaster: (kind: MasterKind, old_name: string, new_name: string) =>
    post<{ name: string }>(`${V1}.masters.rename_master`, {
      kind,
      old_name,
      new_name,
    }),
  setMasterEnabled: (kind: MasterKind, name: string, enabled: boolean) =>
    post(`${V1}.masters.set_master_enabled`, {
      kind,
      name,
      enabled: enabled ? 1 : 0,
    }),
  deleteMaster: (kind: MasterKind, name: string) =>
    post(`${V1}.masters.delete_master`, { kind, name }),
  numbering: () => get<Numbering>(`${V1}.masters.numbering`),
  approvals: () =>
    get<{ items: ApprovalItem[]; count: number }>(`${V1}.approvals.my_pending`),
  approvalState: (doctype: string, name: string) =>
    get<ApprovalState>(`${V1}.approvals.get_state`, { doctype, name }),
  act: (body: {
    doctype: string
    name: string
    action: string
    comment?: string
  }) => post<ApprovalState>(`${V1}.approvals.act`, body),
  runReport: (report: string, params: ReportParams) =>
    get<ReportResult>(`${V1}.reports.run_report`, { report, ...params }),
  company: () => get<CompanyPage>(`${V1}.company.get_company`),
  updateCompany: (body: {
    company_name: string
    tax_id: string
    phone_no: string
    email: string
    website: string
    address_line1: string
    city: string
  }) => post<CompanyPage>(`${V1}.company.update_company`, body),
  setCompanyLogo: (file_url: string | null) =>
    post<{ logo: string | null }>(`${V1}.company.set_company_logo`, {
      file_url,
    }),
  addBranch: (body: {
    name: string
    address_line1?: string
    city?: string
    phone?: string
  }) => post<CompanyBranch>(`${V1}.company.add_branch`, body),
  updateBranch: (body: {
    branch: string
    new_name?: string
    address_line1?: string
    city?: string
    phone?: string
  }) => post<CompanyBranch>(`${V1}.company.update_branch`, body),
  logOutEverywhere: (user: string) =>
    post<{ signed_out: number }>(`${V1}.people.log_out_everywhere`, { user }),
  unlockLogin: (user: string) =>
    post<{ ok: true }>(`${V1}.people.unlock_login`, { user }),
  changeMyPassword: (old_password: string, new_password: string) =>
    post<{ ok: true }>(`${V1}.people.change_my_password`, {
      old_password,
      new_password,
    }),
  addUnit: (body: { item_code: string; uom: string; pieces: number }) =>
    post<{ uom: string; conversion_factor: number }>(
      `${V1}.products.add_unit`,
      body
    ),
  generateBarcode: (item_code: string) =>
    post<string>("adeel_traders.stock.barcode.generate_item_barcode", {
      item_code,
    }),
}
