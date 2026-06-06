import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";


/* ================================================================
   1. TypeScript Interfaces
   ================================================================ */

/** SAP Material Master (MARA / MARD) */
export interface SAPMaterial {
  materialId: string;
  description: string;
  materialType: "FERT" | "HALB" | "ROH" | "HIBE";
  plantId: string;
  storageLocation: string;
  baseUnit: string;
  stockQuantity: number;
  reorderPoint: number;
  safetyStock: number;
  valuationClass: string;
  batchNumber: string;
  lastGoodsReceipt: Date;
  lastGoodsIssue: Date;
}

/** SAP Maintenance / Work Order (AUFK) */
export interface WorkOrder {
  workOrderId: string;
  description: string;
  functionalLocation: string;
  equipmentId: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  orderType: string;
  maintenanceActivityType: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  responsiblePerson: string;
  estimatedCost: number;
  functionalCodes: string[];
  notes: string;
}

/** SAP Sales Order (VBAK) */
export interface SalesOrderItem {
  itemId: string;
  materialId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrder {
  salesOrderId: string;
  customerName: string;
  customerCode: string;
  orderDate: Date;
  deliveryDate: Date;
  netValue: number;
  currency: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  items: SalesOrderItem[];
  salesOrg: string;
  distributionChannel: string;
}

/** OData v4 Debug Log Entry */
export interface ODataLogEntry {
  id: string;
  timestamp: Date;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  endpoint: string;
  payload: unknown;
  statusCode: number;
  duration: number;
  correlationId: string;
}

/** Telemetry Event */
export interface TelemetryEvent {
  id: string;
  timestamp: Date;
  action: string;
  component: string;
  details: Record<string, unknown>;
}

/** Aggregated dashboard metrics */
export interface SapMetrics {
  totalStock: number;
  openWorkOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  criticalAlerts: number;
  avgFulfillmentDays: number;
}

/** Search result bag */
export interface SearchResults {
  materials: SAPMaterial[];
  workOrders: WorkOrder[];
  salesOrders: SalesOrder[];
}

// Multi-tenant ERP Types
export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  role: "admin" | "employee" | "client";
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  unique_project_id: string;
  status: "active" | "completed";
  client_email: string;
  created_at: string;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  assigned_at: string;
}

export interface HelpTicket {
  id: string;
  project_id: string;
  client_id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface TransactionalEmail {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sent_at: string;
}

/** Context value shape */
export interface SapContextType {
  // SAP Mock States
  materials: SAPMaterial[];
  workOrders: WorkOrder[];
  salesOrders: SalesOrder[];
  odataLogs: ODataLogEntry[];
  telemetry: TelemetryEvent[];
  odataDebuggerEnabled: boolean;
  metrics: SapMetrics;

  // Live Multi-tenant DB States
  userProfile: Profile | null;
  projects: Project[];
  employees: Profile[];
  assignments: ProjectAssignment[];
  tickets: HelpTicket[];
  emails: TransactionalEmail[];
  notifications: Notification[];
  companyName: string;
  dbLoading: boolean;

  // SAP Actions
  updateStock: (materialId: string, newQuantity: number) => void;
  createWorkOrder: (fields: Partial<WorkOrder>) => void;
  createSalesOrder: (fields: Partial<SalesOrder>) => void;
  updateWorkOrderStatus: (
    workOrderId: string,
    status: WorkOrder["status"],
  ) => void;
  toggleODataDebugger: () => void;
  emitTelemetry: (
    action: string,
    component: string,
    details: Record<string, unknown>,
  ) => void;
  searchAll: (query: string) => SearchResults;

  // Multi-tenant ERP Actions
  createProject: (name: string, clientEmail: string) => Promise<Project>;
  renameProject: (id: string, name: string) => Promise<void>;
  assignEmployee: (projectId: string, employeeId: string) => Promise<void>;
  removeEmployee: (projectId: string, employeeId: string) => Promise<void>;
  toggleApexJoule: (projectId: string, enabled: boolean) => Promise<void>;
  createHelpTicket: (projectId: string, subject: string, description: string) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: HelpTicket["status"]) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  loadLiveDbData: () => Promise<void>;
  isJouleEnabledForProject: (projectId: string) => boolean;
  featureFlags: Record<string, boolean>;
}

/* ================================================================
   2. Helpers
   ================================================================ */

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomDuration(): number {
  return Math.floor(Math.random() * (350 - 45 + 1)) + 45;
}

function d(iso: string): Date {
  return new Date(iso);
}

/* ================================================================
   3. Pre-populated SAP Mock Data
   ================================================================ */

const INITIAL_MATERIALS: SAPMaterial[] = [
  {
    materialId: "MAT-9921",
    description: "Hydraulic Pump Assembly – 250bar",
    materialType: "FERT",
    plantId: "PLNT-DEL1",
    storageLocation: "SLoc-FG01",
    baseUnit: "EA",
    stockQuantity: 340,
    reorderPoint: 100,
    safetyStock: 50,
    valuationClass: "3000",
    batchNumber: "BATCH-DEL1-0001",
    lastGoodsReceipt: d("2026-05-10T08:30:00"),
    lastGoodsIssue: d("2026-05-18T14:12:00"),
  },
  {
    materialId: "MAT-9922",
    description: "Hydraulic Pump Assembly – 400bar",
    materialType: "FERT",
    plantId: "PLNT-DEL1",
    storageLocation: "SLoc-FG01",
    baseUnit: "EA",
    stockQuantity: 125,
    reorderPoint: 50,
    safetyStock: 20,
    valuationClass: "3000",
    batchNumber: "BATCH-DEL1-0002",
    lastGoodsReceipt: d("2026-05-12T09:15:00"),
    lastGoodsIssue: d("2026-05-20T11:45:00"),
  },
  {
    materialId: "MAT-4410",
    description: "Cast Iron Housing Frame - Size L",
    materialType: "HALB",
    plantId: "PLNT-MUM2",
    storageLocation: "SLoc-02",
    baseUnit: "EA",
    stockQuantity: 80,
    reorderPoint: 120,
    safetyStock: 40,
    valuationClass: "7920",
    batchNumber: "BATCH-MUM2-0402",
    lastGoodsReceipt: d("2026-04-20T16:00:00"),
    lastGoodsIssue: d("2026-05-15T10:10:00"),
  },
  {
    materialId: "MAT-4411",
    description: "Cast Iron Housing Frame - Size M",
    materialType: "HALB",
    plantId: "PLNT-MUM2",
    storageLocation: "SLoc-02",
    baseUnit: "EA",
    stockQuantity: 245,
    reorderPoint: 150,
    safetyStock: 50,
    valuationClass: "7920",
    batchNumber: "BATCH-MUM2-0403",
    lastGoodsReceipt: d("2026-05-01T11:00:00"),
    lastGoodsIssue: d("2026-05-16T09:20:00"),
  },
  {
    materialId: "MAT-5530",
    description: "Alloy Steel Rotor Shaft - 50mm",
    materialType: "ROH",
    plantId: "PLNT-BLR3",
    storageLocation: "SLoc-RM02",
    baseUnit: "EA",
    stockQuantity: 1450,
    reorderPoint: 800,
    safetyStock: 300,
    valuationClass: "3000",
    batchNumber: "BATCH-BLR3-9912",
    lastGoodsReceipt: d("2026-05-14T07:45:00"),
    lastGoodsIssue: d("2026-05-22T15:30:00"),
  },
  {
    materialId: "MAT-5531",
    description: "Stainless Steel Rotor Shaft - 75mm",
    materialType: "ROH",
    plantId: "PLNT-BLR3",
    storageLocation: "SLoc-RM02",
    baseUnit: "EA",
    stockQuantity: 410,
    reorderPoint: 500,
    safetyStock: 150,
    valuationClass: "3000",
    batchNumber: "BATCH-BLR3-9913",
    lastGoodsReceipt: d("2026-05-03T14:20:00"),
    lastGoodsIssue: d("2026-05-19T08:15:00"),
  },
  {
    materialId: "MAT-7700",
    description: "Heavy Duty Radial Bearing 80mm",
    materialType: "ROH",
    plantId: "PLNT-HYD4",
    storageLocation: "SLoc-01",
    baseUnit: "EA",
    stockQuantity: 730,
    reorderPoint: 400,
    safetyStock: 150,
    valuationClass: "3030",
    batchNumber: "BATCH-HYD4-771",
    lastGoodsReceipt: d("2026-05-18T10:00:00"),
    lastGoodsIssue: d("2026-05-24T16:40:00"),
  },
  {
    materialId: "MAT-7701",
    description: "Thrust Ball Bearing 120mm",
    materialType: "ROH",
    plantId: "PLNT-HYD4",
    storageLocation: "SLoc-01",
    baseUnit: "EA",
    stockQuantity: 89,
    reorderPoint: 150,
    safetyStock: 60,
    valuationClass: "3030",
    batchNumber: "BATCH-HYD4-772",
    lastGoodsReceipt: d("2026-05-15T09:00:00"),
    lastGoodsIssue: d("2026-05-23T11:20:00"),
  },
  {
    materialId: "MAT-8801",
    description: "High Temp Synthetic Sealant G2",
    materialType: "HIBE",
    plantId: "PLNT-DEL1",
    storageLocation: "SLoc-03",
    baseUnit: "L",
    stockQuantity: 120,
    reorderPoint: 100,
    safetyStock: 30,
    valuationClass: "3040",
    batchNumber: "BATCH-DEL1-S01",
    lastGoodsReceipt: d("2026-05-02T13:10:00"),
    lastGoodsIssue: d("2026-05-17T15:00:00"),
  },
  {
    materialId: "MAT-8802",
    description: "Fluorocarbon O-Ring Kit (100pc)",
    materialType: "HIBE",
    plantId: "PLNT-DEL1",
    storageLocation: "SLoc-03",
    baseUnit: "KT",
    stockQuantity: 45,
    reorderPoint: 80,
    safetyStock: 25,
    valuationClass: "3040",
    batchNumber: "BATCH-DEL1-S02",
    lastGoodsReceipt: d("2026-05-11T15:20:00"),
    lastGoodsIssue: d("2026-05-21T10:45:00"),
  },
  {
    materialId: "MAT-3301",
    description: "Monolithic Logic Board Controller",
    materialType: "FERT",
    plantId: "PLNT-BLR3",
    storageLocation: "SLoc-FG01",
    baseUnit: "EA",
    stockQuantity: 67,
    reorderPoint: 75,
    safetyStock: 20,
    valuationClass: "7900",
    batchNumber: "BATCH-BLR3-C09",
    lastGoodsReceipt: d("2026-05-08T08:00:00"),
    lastGoodsIssue: d("2026-05-22T14:10:00"),
  },
  {
    materialId: "MAT-3302",
    description: "Optocoupler Interface Module v2",
    materialType: "HALB",
    plantId: "PLNT-BLR3",
    storageLocation: "SLoc-02",
    baseUnit: "EA",
    stockQuantity: 890,
    reorderPoint: 400,
    safetyStock: 100,
    valuationClass: "7900",
    batchNumber: "BATCH-BLR3-C10",
    lastGoodsReceipt: d("2026-05-09T09:30:00"),
    lastGoodsIssue: d("2026-05-23T11:00:00"),
  },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    workOrderId: "WO-8801",
    description: "Repair hydraulic fluid leakage on High-Pressure Pump A",
    functionalLocation: "DEL1-PUMP-ROOM-A",
    equipmentId: "EQ-HYDPUMP-01",
    priority: "HIGH",
    status: "IN_PROGRESS",
    orderType: "PM01",
    maintenanceActivityType: "001",
    plannedStartDate: d("2026-06-01T08:00:00"),
    plannedEndDate: d("2026-06-02T17:00:00"),
    actualStartDate: d("2026-06-01T08:30:00"),
    responsiblePerson: "Vikram Malhotra",
    estimatedCost: 1200,
    functionalCodes: ["HYD-ERR-01", "PNEU-LEAK-01"],
    notes: "Main pressure seal degraded. Replaced with MAT-8802 O-ring.",
  },
  {
    workOrderId: "WO-8802",
    description: "Calibrate thermal sensor on Induction Furnace B",
    functionalLocation: "MUM2-FURNACE-B",
    equipmentId: "EQ-INDFURN-02",
    priority: "MEDIUM",
    status: "OPEN",
    orderType: "PM02",
    maintenanceActivityType: "003",
    plannedStartDate: d("2026-06-03T09:00:00"),
    plannedEndDate: d("2026-06-03T12:00:00"),
    responsiblePerson: "Priya Sharma",
    estimatedCost: 350,
    functionalCodes: ["THERM-OVR-02", "CTRL-SYS-01"],
    notes: "Sensor drifting +12C. Requires calibration loop check.",
  },
  {
    workOrderId: "WO-8803",
    description: "Replace degraded stator bearing in Conveyor Belt Motor",
    functionalLocation: "BLR3-CONVEYOR-04",
    equipmentId: "EQ-CONVMTR-04",
    priority: "HIGH",
    status: "COMPLETED",
    orderType: "PM01",
    maintenanceActivityType: "001",
    plannedStartDate: d("2026-05-25T08:00:00"),
    plannedEndDate: d("2026-05-26T16:00:00"),
    actualStartDate: d("2026-05-25T08:15:00"),
    actualEndDate: d("2026-05-26T14:30:00"),
    responsiblePerson: "Amit Patel",
    estimatedCost: 2400,
    functionalCodes: ["MECH-WEAR-01", "MECH-WEAR-02"],
    notes: "Replaced with MAT-7700 bearing. Vibrations returned to normal.",
  },
  {
    workOrderId: "WO-8804",
    description: "Annual preventive electrical inspection of Substations",
    functionalLocation: "BLR3-SUBSTATION-01",
    equipmentId: "EQ-SUBSTAT-01",
    priority: "LOW",
    status: "OPEN",
    orderType: "PM03",
    maintenanceActivityType: "005",
    plannedStartDate: d("2026-06-10T08:00:00"),
    plannedEndDate: d("2026-06-12T17:00:00"),
    responsiblePerson: "Amit Patel",
    estimatedCost: 1500,
    functionalCodes: ["ELEC-FAIL-02"],
    notes: "Standard insulation testing and transformer oil sampling.",
  },
  {
    workOrderId: "WO-8805",
    description: "Emergency fix for main PLC circuit board failures",
    functionalLocation: "HYD4-CONTROL-ROOM",
    equipmentId: "EQ-CTRLPLC-09",
    priority: "HIGH",
    status: "IN_PROGRESS",
    orderType: "PM01",
    maintenanceActivityType: "002",
    plannedStartDate: d("2026-06-02T14:00:00"),
    plannedEndDate: d("2026-06-03T18:00:00"),
    actualStartDate: d("2026-06-02T14:45:00"),
    responsiblePerson: "Rahul Verma",
    estimatedCost: 3200,
    functionalCodes: ["ELEC-FAIL-04", "CTRL-SYS-01"],
    notes: "Intermittent optocoupler faults. Using MAT-3302 modules.",
  },
  {
    workOrderId: "WO-8806",
    description: "Inspect pneumatic lines for air leakages",
    functionalLocation: "MUM2-PRESS-LINE",
    equipmentId: "EQ-PNEUPRESS-03",
    priority: "MEDIUM",
    status: "CLOSED",
    orderType: "PM02",
    maintenanceActivityType: "001",
    plannedStartDate: d("2026-05-10T09:00:00"),
    plannedEndDate: d("2026-05-10T13:00:00"),
    actualStartDate: d("2026-05-10T09:10:00"),
    actualEndDate: d("2026-05-10T12:00:00"),
    responsiblePerson: "Priya Sharma",
    estimatedCost: 200,
    functionalCodes: ["PNEU-LEAK-01"],
    notes: "Hose connector loose at joint 4B. Cleaned and tightened.",
  },
  {
    workOrderId: "WO-8807",
    description: "Replace drive motor cooling fans due to overheating",
    functionalLocation: "DEL1-DRIVE-BAY-03",
    equipmentId: "EQ-DRVMTR-03",
    priority: "HIGH",
    status: "COMPLETED",
    orderType: "PM01",
    maintenanceActivityType: "001",
    plannedStartDate: d("2026-05-28T10:00:00"),
    plannedEndDate: d("2026-05-28T15:00:00"),
    actualStartDate: d("2026-05-28T10:15:00"),
    actualEndDate: d("2026-05-28T14:45:00"),
    responsiblePerson: "Vikram Malhotra",
    estimatedCost: 650,
    functionalCodes: ["THERM-OVR-01", "THERM-OVR-02"],
    notes: "Fan motors short circuited. Swapped with new unit F-103.",
  },
  {
    workOrderId: "WO-8808",
    description: "Conduct mechanical alignment checks on Turbine Shaft B",
    functionalLocation: "HYD4-TURBINE-HALL",
    equipmentId: "EQ-STMTURB-02",
    priority: "MEDIUM",
    status: "OPEN",
    orderType: "PM02",
    maintenanceActivityType: "004",
    plannedStartDate: d("2026-06-08T08:00:00"),
    plannedEndDate: d("2026-06-09T17:00:00"),
    responsiblePerson: "Rahul Verma",
    estimatedCost: 1800,
    functionalCodes: ["MECH-WEAR-02"],
    notes: "Coupling runout check. Dial indicator measurements required.",
  },
];

const INITIAL_SALES_ORDERS: SalesOrder[] = [
  {
    salesOrderId: "SO-10001",
    customerName: "Tata Steel Logistics",
    customerCode: "CUST-TATA01",
    orderDate: d("2026-05-01"),
    deliveryDate: d("2026-05-05"),
    netValue: 12500,
    currency: "USD",
    status: "DELIVERED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9921",
        description: "Hydraulic Pump Assembly – 250bar",
        quantity: 5,
        unitPrice: 2500,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10002",
    customerName: "Reliance Industries Ltd",
    customerCode: "CUST-RELI02",
    orderDate: d("2026-05-03"),
    deliveryDate: d("2026-05-07"),
    netValue: 47500,
    currency: "USD",
    status: "DELIVERED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9922",
        description: "Hydraulic Pump Assembly – 400bar",
        quantity: 10,
        unitPrice: 4500,
      },
      {
        itemId: "20",
        materialId: "MAT-8801",
        description: "High Temp Synthetic Sealant G2",
        quantity: 25,
        unitPrice: 100,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10003",
    customerName: "Larsen & Toubro Ltd",
    customerCode: "CUST-LART03",
    orderDate: d("2026-05-10"),
    deliveryDate: d("2026-05-15"),
    netValue: 18000,
    currency: "USD",
    status: "SHIPPED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9921",
        description: "Hydraulic Pump Assembly – 250bar",
        quantity: 6,
        unitPrice: 2500,
      },
      {
        itemId: "20",
        materialId: "MAT-8802",
        description: "Fluorocarbon O-Ring Kit (100pc)",
        quantity: 40,
        unitPrice: 75,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10004",
    customerName: "Bharat Heavy Electricals",
    customerCode: "CUST-BHEL04",
    orderDate: d("2026-05-15"),
    deliveryDate: d("2026-05-20"),
    netValue: 9800,
    currency: "USD",
    status: "DELIVERED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-7700",
        description: "Heavy Duty Radial Bearing 80mm",
        quantity: 20,
        unitPrice: 400,
      },
      {
        itemId: "20",
        materialId: "MAT-7701",
        description: "Thrust Ball Bearing 120mm",
        quantity: 6,
        unitPrice: 300,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10005",
    customerName: "Mahindra Engineering Corp",
    customerCode: "CUST-MAHI05",
    orderDate: d("2026-05-20"),
    deliveryDate: d("2026-05-25"),
    netValue: 22000,
    currency: "USD",
    status: "CONFIRMED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-4411",
        description: "Cast Iron Housing Frame - Size M",
        quantity: 100,
        unitPrice: 220,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "12",
  },
  {
    salesOrderId: "SO-10006",
    customerName: "Infosys Campus Maintenance",
    customerCode: "CUST-INFO06",
    orderDate: d("2026-05-22"),
    deliveryDate: d("2026-05-28"),
    netValue: 14500,
    currency: "USD",
    status: "PENDING",
    items: [
      {
        itemId: "10",
        materialId: "MAT-3301",
        description: "Monolithic Logic Board Controller",
        quantity: 15,
        unitPrice: 800,
      },
      {
        itemId: "20",
        materialId: "MAT-3302",
        description: "Optocoupler Interface Module v2",
        quantity: 50,
        unitPrice: 50,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "12",
  },
  {
    salesOrderId: "SO-10007",
    customerName: "Adani Power Ltd",
    customerCode: "CUST-ADAN07",
    orderDate: d("2026-05-25"),
    deliveryDate: d("2026-05-30"),
    netValue: 34500,
    currency: "USD",
    status: "CONFIRMED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9922",
        description: "Hydraulic Pump Assembly – 400bar",
        quantity: 7,
        unitPrice: 4500,
      },
      {
        itemId: "20",
        materialId: "MAT-5531",
        description: "Stainless Steel Rotor Shaft - 75mm",
        quantity: 10,
        unitPrice: 300,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10008",
    customerName: "JSW Steel Works",
    customerCode: "CUST-JSWS08",
    orderDate: d("2026-05-26"),
    deliveryDate: d("2026-05-31"),
    netValue: 8600,
    currency: "USD",
    status: "PENDING",
    items: [
      {
        itemId: "10",
        materialId: "MAT-4410",
        description: "Cast Iron Housing Frame - Size L",
        quantity: 20,
        unitPrice: 430,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10009",
    customerName: "Wind Power India",
    customerCode: "CUST-WIND09",
    orderDate: d("2026-05-28"),
    deliveryDate: d("2026-06-02"),
    netValue: 12000,
    currency: "USD",
    status: "DELIVERED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-5530",
        description: "Alloy Steel Rotor Shaft - 50mm",
        quantity: 80,
        unitPrice: 150,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10010",
    customerName: "Godrej Manufacturing",
    customerCode: "CUST-GODR10",
    orderDate: d("2026-05-29"),
    deliveryDate: d("2026-06-03"),
    netValue: 17200,
    currency: "USD",
    status: "SHIPPED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9921",
        description: "Hydraulic Pump Assembly – 250bar",
        quantity: 5,
        unitPrice: 2500,
      },
      {
        itemId: "20",
        materialId: "MAT-8802",
        description: "Fluorocarbon O-Ring Kit (100pc)",
        quantity: 60,
        unitPrice: 75,
      },
      {
        itemId: "30",
        materialId: "MAT-8801",
        description: "High Temp Synthetic Sealant G2",
        quantity: 2,
        unitPrice: 100,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "12",
  },
];

/* ================================================================
   4. Context Definition
   ================================================================ */

const SapContext = createContext<SapContextType | undefined>(undefined);

/* ================================================================
   5. Provider Implementation
   ================================================================ */

interface SapProviderProps {
  children: ReactNode;
}

export const SapProvider: React.FC<SapProviderProps> = ({ children }) => {
  // SAP Mock States
  const [materials, setMaterials] = useState<SAPMaterial[]>(INITIAL_MATERIALS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(INITIAL_SALES_ORDERS);
  const [odataLogs, setOdataLogs] = useState<ODataLogEntry[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [odataDebuggerEnabled, setOdataDebuggerEnabled] = useState(false);

  // Live Multi-tenant DB States
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [emails, setEmails] = useState<TransactionalEmail[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [companyName, setCompanyName] = useState<string>("ApexOps SAP Headquarters");
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  /* ---------- OData Middleware Stream Logging ------------------ */

  const pushODataLog = useCallback(
    (
      method: ODataLogEntry["method"],
      endpoint: string,
      payload: unknown,
      statusCode: number,
      duration: number,
    ) => {
      const entry: ODataLogEntry = {
        id: uuid(),
        timestamp: new Date(),
        method,
        endpoint,
        payload,
        statusCode,
        duration,
        correlationId: uuid(),
      };
      setOdataLogs((prev) => [entry, ...prev].slice(0, 200));
    },
    [],
  );

  /* ---------- Telemetry Dispatching ---------------------------- */

  const pushTelemetry = useCallback(
    (
      action: string,
      component: string,
      details: Record<string, unknown>,
      debug: boolean,
    ) => {
      const event: TelemetryEvent = {
        id: uuid(),
        timestamp: new Date(),
        action,
        component,
        details,
      };
      setTelemetry((prev) => [event, ...prev]);

      if (debug) {
        pushODataLog(
          "POST",
          `/sap/opu/odata4/sap/API_TELEMETRY/A_TelemetryEvent`,
          event,
          201,
          randomDuration(),
        );
      }
    },
    [pushODataLog],
  );

  /* ---------- SAP Operations ----------------------------------- */

  const updateStock = useCallback(
    (materialId: string, newQuantity: number) => {
      let oldQty = 0;
      setMaterials((prev) =>
        prev.map((m) => {
          if (m.materialId === materialId) {
            oldQty = m.stockQuantity;
            return {
              ...m,
              stockQuantity: newQuantity,
              lastGoodsReceipt: newQuantity > oldQty ? new Date() : m.lastGoodsReceipt,
              lastGoodsIssue: newQuantity < oldQty ? new Date() : m.lastGoodsIssue,
            };
          }
          return m;
        }),
      );

      const delta = newQuantity - oldQty;
      const sapPayload = {
        Material: materialId,
        StockQuantity: newQuantity,
        Delta: delta,
        Plant: "PLNT-DEL1",
        StorageLocation: "SLoc-FG01",
      };

      const duration = randomDuration();
      pushODataLog(
        "PATCH",
        `/sap/opu/odata4/sap/API_MATERIAL_STOCK/A_MaterialStock('${materialId}')`,
        sapPayload,
        204,
        duration,
      );

      pushTelemetry(
        "STOCK_ADJUSTMENT",
        "WarehouseAuditHub",
        { materialId, oldQty, newQty: newQuantity, delta },
        odataDebuggerEnabled,
      );

      // Trigger Push Notification if stock drops below reorder point
      const matchedMaterial = materials.find(m => m.materialId === materialId);
      if (matchedMaterial && newQuantity < matchedMaterial.reorderPoint) {
        sendPushAlert(
          "Low Stock Warning",
          `Material ${materialId} (${matchedMaterial.description}) has fallen below reorder point. Current stock: ${newQuantity}`
        );
      }
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled, materials],
  );

  const createWorkOrder = useCallback(
    (fields: Partial<WorkOrder>) => {
      const generatedId = `WO-${Math.floor(1000 + Math.random() * 9000)}`;
      const newWO: WorkOrder = {
        workOrderId: generatedId,
        description: fields.description || "Unscheduled Maintenance Work Order",
        functionalLocation: fields.functionalLocation || "PLNT-GEN-LOC",
        equipmentId: fields.equipmentId || "EQ-GEN-01",
        priority: fields.priority || "MEDIUM",
        status: "OPEN",
        orderType: fields.orderType || "PM01",
        maintenanceActivityType: fields.maintenanceActivityType || "001",
        plannedStartDate: fields.plannedStartDate || new Date(),
        plannedEndDate: fields.plannedEndDate || new Date(Date.now() + 86400000),
        responsiblePerson: fields.responsiblePerson || "Maintenance Team",
        estimatedCost: fields.estimatedCost || 500,
        functionalCodes: fields.functionalCodes || [],
        notes: fields.notes || "",
      };

      setWorkOrders((prev) => [newWO, ...prev]);

      const duration = randomDuration();
      pushODataLog(
        "POST",
        `/sap/opu/odata4/sap/API_MAINTORDER/A_MaintenanceOrder`,
        newWO,
        201,
        duration,
      );

      pushTelemetry(
        "WORK_ORDER_CREATION",
        "MaintenanceHub",
        { workOrderId: generatedId, priority: newWO.priority, cost: newWO.estimatedCost },
        odataDebuggerEnabled,
      );

      sendPushAlert(
        "New Work Order Created",
        `Maintenance task ${generatedId} (${newWO.description}) has been created with priority ${newWO.priority}.`
      );
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled],
  );

  const createSalesOrder = useCallback(
    (fields: Partial<SalesOrder>) => {
      const generatedId = `SO-${Math.floor(10000 + Math.random() * 90000)}`;
      const newSO: SalesOrder = {
        salesOrderId: generatedId,
        customerName: fields.customerName || "Enterprise Customer",
        customerCode: fields.customerCode || "CUST-GEN01",
        orderDate: fields.orderDate || new Date(),
        deliveryDate: fields.deliveryDate || new Date(Date.now() + 86400000 * 5),
        netValue: fields.netValue || 0,
        currency: fields.currency || "USD",
        status: "PENDING",
        items: fields.items || [],
        salesOrg: fields.salesOrg || "1000",
        distributionChannel: fields.distributionChannel || "10",
      };

      setSalesOrders((prev) => [newSO, ...prev]);

      const duration = randomDuration();
      pushODataLog(
        "POST",
        `/sap/opu/odata4/sap/API_SALES_ORDER/A_SalesOrder`,
        newSO,
        201,
        duration,
      );

      pushTelemetry(
        "SALES_ORDER_CREATION",
        "AnalyticsHub",
        { salesOrderId: generatedId, value: newSO.netValue, customer: newSO.customerName },
        odataDebuggerEnabled,
      );
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled],
  );

  const updateWorkOrderStatus = useCallback(
    (workOrderId: string, status: WorkOrder["status"]) => {
      setWorkOrders((prev) =>
        prev.map((wo) => {
          if (wo.workOrderId === workOrderId) {
            const updates: Partial<WorkOrder> = { status };
            if (status === "IN_PROGRESS") {
              updates.actualStartDate = new Date();
            } else if (status === "COMPLETED" || status === "CLOSED") {
              updates.actualEndDate = new Date();
            }
            return { ...wo, ...updates };
          }
          return wo;
        }),
      );

      const sapPayload = {
        WorkOrder: workOrderId,
        Status: status,
        SystemStatusText: status,
      };

      const duration = randomDuration();
      pushODataLog(
        "PATCH",
        `/sap/opu/odata4/sap/API_MAINTORDER/A_MaintenanceOrder('${workOrderId}')`,
        sapPayload,
        204,
        duration,
      );

      pushTelemetry(
        "WORK_ORDER_STATUS_UPDATE",
        "MaintenanceHub",
        { workOrderId, status },
        odataDebuggerEnabled,
      );
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled],
  );

  const toggleODataDebugger = useCallback(() => {
    setOdataDebuggerEnabled((prev) => !prev);
  }, []);

  const emitTelemetry = useCallback(
    (
      action: string,
      component: string,
      details: Record<string, unknown>,
    ) => {
      pushTelemetry(action, component, details, odataDebuggerEnabled);
    },
    [pushTelemetry, odataDebuggerEnabled],
  );

  const searchAll = useCallback(
    (query: string): SearchResults => {
      const q = query.toLowerCase();

      const matchMaterial = (m: SAPMaterial): boolean => {
        return (
          m.materialId.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.materialType.toLowerCase().includes(q) ||
          m.plantId.toLowerCase().includes(q) ||
          m.storageLocation.toLowerCase().includes(q) ||
          m.batchNumber.toLowerCase().includes(q) ||
          m.valuationClass.toLowerCase().includes(q) ||
          m.baseUnit.toLowerCase().includes(q)
        );
      };

      const matchWorkOrder = (wo: WorkOrder): boolean => {
        return (
          wo.workOrderId.toLowerCase().includes(q) ||
          wo.description.toLowerCase().includes(q) ||
          wo.functionalLocation.toLowerCase().includes(q) ||
          wo.equipmentId.toLowerCase().includes(q) ||
          wo.priority.toLowerCase().includes(q) ||
          wo.status.toLowerCase().includes(q) ||
          wo.orderType.toLowerCase().includes(q) ||
          wo.maintenanceActivityType.toLowerCase().includes(q) ||
          wo.responsiblePerson.toLowerCase().includes(q) ||
          wo.notes.toLowerCase().includes(q) ||
          wo.functionalCodes.some((fc) =>
            fc.toLowerCase().includes(q),
          )
        );
      };

      const matchSalesOrder = (so: SalesOrder): boolean => {
        return (
          so.salesOrderId.toLowerCase().includes(q) ||
          so.customerName.toLowerCase().includes(q) ||
          so.customerCode.toLowerCase().includes(q) ||
          so.status.toLowerCase().includes(q) ||
          so.currency.toLowerCase().includes(q) ||
          so.salesOrg.toLowerCase().includes(q) ||
          so.distributionChannel.toLowerCase().includes(q) ||
          so.items.some(
            (item) =>
              item.itemId.toLowerCase().includes(q) ||
              item.materialId.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q),
          )
        );
      };

      return {
        materials: materials.filter(matchMaterial),
        workOrders: workOrders.filter(matchWorkOrder),
        salesOrders: salesOrders.filter(matchSalesOrder),
      };
    },
    [materials, workOrders, salesOrders],
  );

  const metrics: SapMetrics = useMemo(() => {
    const totalStock = materials.reduce(
      (sum, m) => sum + m.stockQuantity,
      0,
    );

    const openWorkOrders = workOrders.filter(
      (wo) =>
        wo.status === "OPEN" || wo.status === "IN_PROGRESS",
    ).length;

    const pendingOrders = salesOrders.filter(
      (so) => so.status === "PENDING",
    ).length;

    const deliveredOrders = salesOrders.filter(
      (so) => so.status === "DELIVERED",
    );
    const totalRevenue = deliveredOrders.reduce(
      (sum, so) => sum + so.netValue,
      0,
    );

    const criticalAlerts = materials.filter(
      (m) => m.stockQuantity < m.reorderPoint,
    ).length;

    let avgFulfillmentDays = 0;
    if (deliveredOrders.length > 0) {
      const totalDays = deliveredOrders.reduce((sum, so) => {
        const diffMs =
          so.deliveryDate.getTime() - so.orderDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }, 0);
      avgFulfillmentDays = Math.round(
        (totalDays / deliveredOrders.length) * 100,
      ) / 100;
    }

    return {
      totalStock,
      openWorkOrders,
      pendingOrders,
      totalRevenue,
      criticalAlerts,
      avgFulfillmentDays,
    };
  }, [materials, workOrders, salesOrders]);

  /* ================================================================
     6. Multi-tenant Live Database Actions & Loaders
     ================================================================ */

  // Load complete live multi-tenant sets from database.
  // The ONLY source of truth for a user's role is the `role` column in the
  // `profiles` table, looked up exclusively by the authenticated user's auth.uid().
  // No email-string overrides, no role inference from email patterns, no client-side
  // fallback profiles. If the profiles row does not exist, the user sees an error
  // screen and must contact their administrator — we never assign a role by guessing.
  const loadLiveDbData = useCallback(async () => {
    try {
      setDbLoading(true);

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        setUserProfile(null);
        setDbLoading(false);
        return;
      }

      const userId = session.user.id;

      // Authoritative single-row lookup: auth.uid() -> profiles.id -> role
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileErr || !profile) {
        // Profile row does not exist in the database.
        // This is a genuine configuration gap — the administrator must insert a profiles row
        // for this auth.uid() with the correct role before the user can access the platform.
        // We do NOT guess roles from email addresses, user_metadata, or any other heuristic.
        console.error(
          `[ApexOps] No profiles row found for auth.uid()=${userId}. ` +
          `An administrator must provision a profiles record with the correct role ` +
          `('admin' | 'employee' | 'client') for this user. ` +
          `Database error: ${profileErr?.message ?? "Row not found"}`
        );
        setUserProfile(null);
        setDbLoading(false);
        return;
      }

      // Role is read verbatim from the database — never derived from email patterns.
      setUserProfile(profile);
    } catch (error) {
      console.error("[ApexOps] Unexpected error during profile resolution:", error);
      setUserProfile(null);
    } finally {
      setDbLoading(false);
    }
  }, []);


  // Fetch live tables based on profile scope
  useEffect(() => {
    if (!userProfile) {
      setProjects([]);
      setEmployees([]);
      setAssignments([]);
      setTickets([]);
      setEmails([]);
      setNotifications([]);
      return;
    }

    const fetchCompanyAndModules = async () => {
      try {
        // Get company details
        const { data: comp } = await supabase
          .from("companies")
          .select("name")
          .eq("id", userProfile.company_id)
          .single();
        if (comp) setCompanyName(comp.name);

        // Fetch notifications scoped to this user
        const { data: notify } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userProfile.id)
          .order("created_at", { ascending: false });
        if (notify) setNotifications(notify);

        // --- Role-scoped project fetching ---
        if (userProfile.role === "admin") {
          // Admin: fetch ALL projects in company
          const { data: projList } = await supabase
            .from("projects")
            .select("*")
            .eq("company_id", userProfile.company_id)
            .order("created_at", { ascending: false });

          if (projList) {
            setProjects(projList);

            // Fetch feature flags for all loaded projects
            const projIds = projList.map((p) => p.id);
            if (projIds.length > 0) {
              const { data: flags } = await supabase
                .from("feature_flags")
                .select("*")
                .in("project_id", projIds);
              if (flags) {
                const flagsMap: Record<string, boolean> = {};
                flags.forEach((f) => { flagsMap[f.project_id] = f.apex_joule_enabled; });
                setFeatureFlags(flagsMap);
              }
            }
          }

          // Admin: fetch ALL assignments (but EXCLUDE any rows where employee_id === admin's own ID
          // to prevent cross-contamination when an admin email is also used as an assignee)
          const { data: allAssign } = await supabase
            .from("project_assignments")
            .select("*");
          if (allAssign) {
            setAssignments(allAssign.filter((a) => a.employee_id !== userProfile.id));
          }

          // Admin: fetch tickets for all projects
          const { data: tix } = await supabase
            .from("help_tickets")
            .select("*")
            .order("created_at", { ascending: false });
          if (tix) setTickets(tix);

          // Admin: fetch all employee & admin profiles
          const { data: profileList } = await supabase
            .from("profiles")
            .select("*")
            .eq("company_id", userProfile.company_id);
          if (profileList) {
            setEmployees(profileList.filter((p) => p.role === "employee" || p.role === "admin"));
          }

          // Admin: fetch transactional emails log
          const { data: emailLogs } = await supabase
            .from("transactional_emails")
            .select("*")
            .order("sent_at", { ascending: false });
          if (emailLogs) setEmails(emailLogs);

        } else if (userProfile.role === "employee") {
          // Employee: fetch ONLY projects they are explicitly assigned to
          const { data: myAssign } = await supabase
            .from("project_assignments")
            .select("*")
            .eq("employee_id", userProfile.id);

          if (myAssign && myAssign.length > 0) {
            setAssignments(myAssign);
            const assignedProjIds = myAssign.map((a) => a.project_id);
            const { data: assignedProjs } = await supabase
              .from("projects")
              .select("*")
              .in("id", assignedProjIds);
            if (assignedProjs) {
              setProjects(assignedProjs);

              // Fetch feature flags for assigned projects
              const { data: flags } = await supabase
                .from("feature_flags")
                .select("*")
                .in("project_id", assignedProjIds);
              if (flags) {
                const flagsMap: Record<string, boolean> = {};
                flags.forEach((f) => { flagsMap[f.project_id] = f.apex_joule_enabled; });
                setFeatureFlags(flagsMap);
              }

              // Fetch tickets for assigned projects only
              const { data: tix } = await supabase
                .from("help_tickets")
                .select("*")
                .in("project_id", assignedProjIds)
                .order("created_at", { ascending: false });
              if (tix) setTickets(tix);
            } else {
              setProjects([]);
              setTickets([]);
            }
          } else {
            setAssignments([]);
            setProjects([]);
            setTickets([]);
          }

          // Employee: fetch profiles list for context (company members)
          const { data: profileList } = await supabase
            .from("profiles")
            .select("*")
            .eq("company_id", userProfile.company_id);
          if (profileList) {
            setEmployees(profileList.filter((p) => p.role === "employee" || p.role === "admin"));
          }

        } else if (userProfile.role === "client") {
          // Client: fetch ONLY the single project matching their email address
          const { data: clientProjs } = await supabase
            .from("projects")
            .select("*")
            .eq("client_email", userProfile.email)
            .limit(1);

          if (clientProjs && clientProjs.length > 0) {
            const clientProj = clientProjs[0];
            setProjects([clientProj]);

            // Fetch feature flags for this specific project
            const { data: flags } = await supabase
              .from("feature_flags")
              .select("*")
              .eq("project_id", clientProj.id);
            if (flags) {
              const flagsMap: Record<string, boolean> = {};
              flags.forEach((f) => { flagsMap[f.project_id] = f.apex_joule_enabled; });
              setFeatureFlags(flagsMap);
            }

            // Fetch tickets filed by this client only
            const { data: tix } = await supabase
              .from("help_tickets")
              .select("*")
              .eq("client_id", userProfile.id)
              .order("created_at", { ascending: false });
            if (tix) setTickets(tix);

            // Fetch assignments for the client's project to identify specialist team
            const { data: projAssign } = await supabase
              .from("project_assignments")
              .select("*")
              .eq("project_id", clientProj.id);
            if (projAssign) {
              setAssignments(projAssign);

              // Fetch only the profiles of employees assigned to this project
              const empIds = projAssign.map((a) => a.employee_id);
              if (empIds.length > 0) {
                const { data: empProfiles } = await supabase
                  .from("profiles")
                  .select("*")
                  .in("id", empIds);
                if (empProfiles) setEmployees(empProfiles);
              } else {
                setEmployees([]);
              }
            } else {
              setAssignments([]);
              setEmployees([]);
            }
          } else {
            setProjects([]);
            setTickets([]);
            setAssignments([]);
            setEmployees([]);
          }
        }
      } catch (err) {
        console.error("Error loading multi-tenant data sets:", err);
      }
    };

    fetchCompanyAndModules();

    // Listen to real-time project updates, notifications, and assignments
    const channel = supabase
      .channel("live-db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => fetchCompanyAndModules())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchCompanyAndModules())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_assignments" }, () => fetchCompanyAndModules())
      .on("postgres_changes", { event: "*", schema: "public", table: "help_tickets" }, () => fetchCompanyAndModules())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchCompanyAndModules())
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => fetchCompanyAndModules())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  // Handle auth session state loading — scoped strictly to SIGNED_IN / SIGNED_OUT events.
  // This prevents cross-tab state bleeding: TOKEN_REFRESHED and INITIAL_SESSION events
  // from another tab's shared localStorage session will NOT trigger a full profile reload.
  useEffect(() => {
    loadLiveDbData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        // A new user signed into THIS tab context — reload profile for this instance.
        loadLiveDbData();
      } else if (event === 'SIGNED_OUT') {
        // Clear all role-scoped states on logout to prevent dirty state from bleeding.
        setUserProfile(null);
        setProjects([]);
        setEmployees([]);
        setAssignments([]);
        setTickets([]);
        setEmails([]);
        setNotifications([]);
        setFeatureFlags({});
        setDbLoading(false);
      }
      // TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED etc. are intentionally ignored.
      // They share the same localStorage token but do NOT indicate a user switch.
    });
    return () => subscription.unsubscribe();
  }, [loadLiveDbData]);

  // Project Actions
  const createProject = useCallback(async (name: string, clientEmail: string): Promise<Project> => {
    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only Administrators can perform project creation workflows.");
    }

    const uniqueId = `APEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create the project in the table
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        company_id: userProfile.company_id,
        name,
        unique_project_id: uniqueId,
        status: "active",
        client_email: clientEmail
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create default feature flags for the project
    await supabase.from("feature_flags").insert({
      project_id: project.id,
      apex_joule_enabled: false // Off by default
    });

    // 1. Register/invite the client email via Supabase Auth using an isolated client
    // (persistSession: false prevents this signUp from overwriting the admin's active session)
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL || "",
      import.meta.env.VITE_SUPABASE_ANON_KEY || "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storageKey: `apexops-temp-client-${Date.now()}`, // Isolated storage key prevents session contamination
        }
      }
    );

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: clientEmail,
      password: uniqueId,
      options: {
        data: {
          role: "client",
          company_id: userProfile.company_id
        }
      }
    });

    // Supabase signUp returns the existing user if the email is already registered
    // without throwing an error (returns identities: [] for existing confirmed accounts).
    // We treat both new registrations and existing accounts the same way.
    if (authError) {
      console.error("Client Auth registration failed:", authError);
      throw new Error(`Client Authentication registration failed: ${authError.message}`);
    }

    const clientUserId = authData.user?.id;
    if (!clientUserId) {
      throw new Error("Client registration failed: No user ID was returned from Auth.");
    }

    // 2. Upsert the profiles row — handles both new clients and re-linked existing accounts
    // without throwing a duplicate key error when the same client email is re-onboarded.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: clientUserId,
          company_id: userProfile.company_id,
          role: "client",
          email: clientEmail,
          full_name: "B2B Client"
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Client profile insertion failed:", profileError);
      throw new Error(`Client profile insertion failed: ${profileError.message}`);
    }

    // 3. Log welcome details in transactional_emails table
    const emailBody = `Welcome to the ApexOps enterprise portal! Your project has been established.

Unique Project ID: ${uniqueId}
Login Identity: ${clientEmail}

To sign in, please navigate to the Client Gateway on the Welcome Page and log in using your registered Email Address and your system-generated Unique Project ID.`;

    const { error: emailError } = await supabase.from("transactional_emails").insert({
      recipient: clientEmail,
      subject: "Welcome to ApexOps SAP Hub - Client Onboarding Details",
      body: emailBody,
    });

    if (emailError) {
      console.error("Failed to log welcome email:", emailError);
      throw new Error(`Failed to log welcome email: ${emailError.message}`);
    }

    sendPushAlert("Project Established", `Project ${name} (${uniqueId}) created. Client account established.`);

    return project;
  }, [userProfile]);

  const renameProject = useCallback(async (id: string, name: string): Promise<void> => {
    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only Administrators can manage project entities.");
    }

    const { error } = await supabase
      .from("projects")
      .update({ name })
      .eq("id", id);

    if (error) throw error;

    sendPushAlert("Project Parameters Modified", `Project description renamed to: ${name}.`);
  }, [userProfile]);

  // Employee Assignment & Limit Check (Trigger and context check)
  const assignEmployee = useCallback(async (projectId: string, employeeId: string): Promise<void> => {
    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only Administrators can assign employees to workspaces.");
    }

    // Resolve the actual employee UUID from the profiles table to bind the assignment correctly
    let targetUid = employeeId;
    const { data: lookupProfile, error: lookupErr } = await supabase
      .from("profiles")
      .select("id")
      .or(`id.eq.${employeeId},email.eq.${employeeId}`)
      .maybeSingle();

    if (lookupErr) {
      throw new Error(`Failed to verify employee profile: ${lookupErr.message}`);
    }
    if (lookupProfile) {
      targetUid = lookupProfile.id;
    } else {
      throw new Error(`Employee profile mapping for ${employeeId} not found.`);
    }

    // 1. Perform assignment limit check locally for direct UX response using targetUid
    const activeAssignments = assignments.filter(a => a.employee_id === targetUid);
    const activeProjectsCount = activeAssignments.filter(a => {
      const proj = projects.find(p => p.id === a.project_id);
      return proj && proj.status === "active";
    }).length;

    if (activeProjectsCount >= 3) {
      throw new Error("Employee cannot be assigned. Enforced limit is a maximum of 3 active project allocations.");
    }

    // 2. Perform database insert (triggers enforce_employee_project_limit on remote DB)
    const { error: dbError } = await supabase
      .from("project_assignments")
      .insert({
        project_id: projectId,
        employee_id: targetUid
      });

    if (dbError) {
      throw new Error(dbError.message || "Failed to establish employee assignment mapping.");
    }

    // 3. Dispatch transactional notification email
    try {
      const assignedProj = projects.find(p => p.id === projectId);
      const assignedEmp = employees.find(e => e.id === employeeId) || { email: "employee@apexops.com" };
      const emailBody = `Attention: You have been assigned to Project: ${assignedProj?.name || "Active ERP Module"}.

Please login to your ApexOps corporate workspace to review project requirements and collaboration channels.`;

      await supabase.from("transactional_emails").insert({
        recipient: assignedEmp.email,
        subject: "Notification: Project Allocation Confirmed",
        body: emailBody
      });

      // Insert notification
      await supabase.from("notifications").insert({
        user_id: targetUid,
        title: "New Project Assignment",
        message: `You have been allocated to project: ${assignedProj?.name || "Active Module"}.`
      });

      sendPushAlert("Work Allocation Registered", `Employee allocated to project. Task dispatch notification sent.`);
    } catch (e) {
      console.error("Assignment dispatch error:", e);
    }
  }, [userProfile, assignments, projects, employees]);

  const removeEmployee = useCallback(async (projectId: string, employeeId: string): Promise<void> => {
    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only Administrators can remove employee assignments.");
    }

    const { error } = await supabase
      .from("project_assignments")
      .delete()
      .eq("project_id", projectId)
      .eq("employee_id", employeeId);

    if (error) throw error;

    sendPushAlert("Work Allocation Revoked", `Employee assignment removed from project.`);
  }, [userProfile]);

  const toggleApexJoule = useCallback(async (projectId: string, enabled: boolean): Promise<void> => {
    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only Administrators can configure client custom add-ons.");
    }

    const { error } = await supabase
      .from("feature_flags")
      .upsert({
        project_id: projectId,
        apex_joule_enabled: enabled,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    sendPushAlert("Add-On Access Modified", `ApexJoule AI permissions ${enabled ? "granted" : "revoked"} for project.`);
  }, [userProfile]);

  const isJouleEnabledForProject = useCallback((projectId: string): boolean => {
    return !!featureFlags[projectId];
  }, [featureFlags]);

  // Support Ticketing Actions
  const createHelpTicket = useCallback(async (projectId: string, subject: string, description: string): Promise<void> => {
    if (!userProfile) throw new Error("Authenticated session is required to file support tickets.");

    const { error } = await supabase
      .from("help_tickets")
      .insert({
        project_id: projectId,
        client_id: userProfile.id,
        subject,
        description,
        status: "open"
      });

    if (error) throw error;

    // Send notification to assigned employees
    try {
      const assignedEmps = assignments.filter(a => a.project_id === projectId);
      for (const assignment of assignedEmps) {
        await supabase.from("notifications").insert({
          user_id: assignment.employee_id,
          title: "New Help Ticket Filed",
          message: `Ticket filed on assigned project: "${subject}".`
        });
      }
      sendPushAlert("Help Ticket Dispatched", `Support ticket registered. Assigned employees have been notified.`);
    } catch (e) {
      console.error("Ticket alert dispatch failed:", e);
    }
  }, [userProfile, assignments]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: HelpTicket["status"]): Promise<void> => {
    if (!userProfile || userProfile.role === "client") {
      throw new Error("Only Admins and Employees can resolve help tickets.");
    }

    const { error } = await supabase
      .from("help_tickets")
      .update({ status })
      .eq("id", ticketId);

    if (error) throw error;

    // Notify the client
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        await supabase.from("notifications").insert({
          user_id: ticket.client_id,
          title: "Ticket Status Updated",
          message: `Your help ticket "${ticket.subject}" has been marked as ${status}.`
        });
      }
    } catch (e) {
      console.error("Ticket status notification failed:", e);
    }
  }, [userProfile, tickets]);

  const markNotificationRead = useCallback(async (id: string): Promise<void> => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
  }, []);

  // System Push Alerts (In-app alerts + browser Push notifications API)
  const sendPushAlert = (title: string, message: string) => {
    // 1. Trigger browser Push notifications
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, {
            body: message
          });
        }
      });
    }

    // 2. Broadcast on global console stream (OData / Telemetry)
    pushTelemetry("PUSH_ALERT_DISPATCH", "SystemNotificationEngine", { title, message }, odataDebuggerEnabled);
  };

  /* ---------- context value ------------------------------------ */

  const value: SapContextType = useMemo(
    () => ({
      materials,
      workOrders,
      salesOrders,
      odataLogs,
      telemetry,
      odataDebuggerEnabled,
      metrics,
      updateStock,
      createWorkOrder,
      createSalesOrder,
      updateWorkOrderStatus,
      toggleODataDebugger,
      emitTelemetry,
      searchAll,

      // Multi-tenant live states
      userProfile,
      projects,
      employees,
      assignments,
      tickets,
      emails,
      notifications,
      companyName,
      dbLoading,
      featureFlags,

      // Multi-tenant actions
      createProject,
      renameProject,
      assignEmployee,
      removeEmployee,
      toggleApexJoule,
      createHelpTicket,
      updateTicketStatus,
      markNotificationRead,
      loadLiveDbData,
      isJouleEnabledForProject,
    }),
    [
      materials,
      workOrders,
      salesOrders,
      odataLogs,
      telemetry,
      odataDebuggerEnabled,
      metrics,
      updateStock,
      createWorkOrder,
      createSalesOrder,
      updateWorkOrderStatus,
      toggleODataDebugger,
      emitTelemetry,
      searchAll,

      userProfile,
      projects,
      employees,
      assignments,
      tickets,
      emails,
      notifications,
      companyName,
      dbLoading,
      featureFlags,

      createProject,
      renameProject,
      assignEmployee,
      removeEmployee,
      toggleApexJoule,
      createHelpTicket,
      updateTicketStatus,
      markNotificationRead,
      loadLiveDbData,
      isJouleEnabledForProject,
    ],
  );

  return (
    <SapContext.Provider value={value}>{children}</SapContext.Provider>
  );
};

/* ================================================================
   6. Consumer Hook
   ================================================================ */

export function useSap(): SapContextType {
  const ctx = useContext(SapContext);
  if (ctx === undefined) {
    throw new Error(
      "useSap() must be used within a <SapProvider>. " +
        "Wrap your component tree with <SapProvider> to access SAP context.",
    );
  }
  return ctx;
}

export default SapContext;
