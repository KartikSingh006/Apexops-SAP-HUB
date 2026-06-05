import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useContext,
  type ReactNode,
} from "react";

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

/** Context value shape */
export interface SapContextType {
  materials: SAPMaterial[];
  workOrders: WorkOrder[];
  salesOrders: SalesOrder[];
  odataLogs: ODataLogEntry[];
  telemetry: TelemetryEvent[];
  odataDebuggerEnabled: boolean;
  metrics: SapMetrics;

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
   3. Pre-populated Mock Data
   ================================================================ */

const FUNCTIONAL_CODES_POOL: string[] = [
  "HYD-ERR-01",
  "HYD-ERR-02",
  "ELEC-FAIL-01",
  "ELEC-FAIL-02",
  "ELEC-FAIL-03",
  "ELEC-FAIL-04",
  "MECH-WEAR-01",
  "MECH-WEAR-02",
  "THERM-OVR-01",
  "THERM-OVR-02",
  "PNEU-LEAK-01",
  "CTRL-SYS-01",
];

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
    reorderPoint: 80,
    safetyStock: 30,
    valuationClass: "3000",
    batchNumber: "BATCH-DEL1-0002",
    lastGoodsReceipt: d("2026-05-08T10:00:00"),
    lastGoodsIssue: d("2026-05-20T09:45:00"),
  },
  {
    materialId: "MAT-4410",
    description: "Carbon Steel Flange DN150 PN40",
    materialType: "HALB",
    plantId: "PLNT-MUM2",
    storageLocation: "SLoc-01",
    baseUnit: "EA",
    stockQuantity: 900,
    reorderPoint: 200,
    safetyStock: 100,
    valuationClass: "3100",
    batchNumber: "BATCH-MUM2-0010",
    lastGoodsReceipt: d("2026-04-28T07:00:00"),
    lastGoodsIssue: d("2026-05-15T11:30:00"),
  },
  {
    materialId: "MAT-4411",
    description: "Stainless Steel Flange DN200 PN16",
    materialType: "HALB",
    plantId: "PLNT-MUM2",
    storageLocation: "SLoc-01",
    baseUnit: "EA",
    stockQuantity: 60,
    reorderPoint: 150,
    safetyStock: 75,
    valuationClass: "3100",
    batchNumber: "BATCH-MUM2-0011",
    lastGoodsReceipt: d("2026-04-20T06:30:00"),
    lastGoodsIssue: d("2026-05-22T16:00:00"),
  },
  {
    materialId: "MAT-5530",
    description: "Industrial Lubricant ISO VG 68 – 200L Drum",
    materialType: "ROH",
    plantId: "PLNT-BLR3",
    storageLocation: "SLoc-RM02",
    baseUnit: "L",
    stockQuantity: 4800,
    reorderPoint: 1000,
    safetyStock: 500,
    valuationClass: "3200",
    batchNumber: "BATCH-BLR3-0020",
    lastGoodsReceipt: d("2026-05-01T09:15:00"),
    lastGoodsIssue: d("2026-05-19T13:00:00"),
  },
  {
    materialId: "MAT-5531",
    description: "Synthetic Gear Oil ISO VG 220 – 200L Drum",
    materialType: "ROH",
    plantId: "PLNT-BLR3",
    storageLocation: "SLoc-RM02",
    baseUnit: "L",
    stockQuantity: 2200,
    reorderPoint: 800,
    safetyStock: 400,
    valuationClass: "3200",
    batchNumber: "BATCH-BLR3-0021",
    lastGoodsReceipt: d("2026-04-15T11:00:00"),
    lastGoodsIssue: d("2026-05-21T10:30:00"),
  },
  {
    materialId: "MAT-7700",
    description: "PLC Control Module Siemens S7-1500",
    materialType: "FERT",
    plantId: "PLNT-HYD4",
    storageLocation: "SLoc-02",
    baseUnit: "EA",
    stockQuantity: 45,
    reorderPoint: 20,
    safetyStock: 10,
    valuationClass: "7000",
    batchNumber: "BATCH-HYD4-0030",
    lastGoodsReceipt: d("2026-05-05T08:00:00"),
    lastGoodsIssue: d("2026-05-17T15:45:00"),
  },
  {
    materialId: "MAT-7701",
    description: "HMI Touch Panel 15″ – IP65 Rated",
    materialType: "FERT",
    plantId: "PLNT-HYD4",
    storageLocation: "SLoc-02",
    baseUnit: "EA",
    stockQuantity: 18,
    reorderPoint: 25,
    safetyStock: 12,
    valuationClass: "7000",
    batchNumber: "BATCH-HYD4-0031",
    lastGoodsReceipt: d("2026-04-22T09:30:00"),
    lastGoodsIssue: d("2026-05-16T12:00:00"),
  },
  {
    materialId: "MAT-8801",
    description: "High-Temp Ceramic Bearing 6210-2Z",
    materialType: "HIBE",
    plantId: "PLNT-DEL1",
    storageLocation: "SLoc-03",
    baseUnit: "EA",
    stockQuantity: 520,
    reorderPoint: 150,
    safetyStock: 75,
    valuationClass: "4000",
    batchNumber: "BATCH-DEL1-0040",
    lastGoodsReceipt: d("2026-05-12T07:15:00"),
    lastGoodsIssue: d("2026-05-23T08:30:00"),
  },
  {
    materialId: "MAT-8802",
    description: "Self-Aligning Ball Bearing 2208 ETN9",
    materialType: "HIBE",
    plantId: "PLNT-DEL1",
    storageLocation: "SLoc-03",
    baseUnit: "EA",
    stockQuantity: 30,
    reorderPoint: 100,
    safetyStock: 40,
    valuationClass: "4000",
    batchNumber: "BATCH-DEL1-0041",
    lastGoodsReceipt: d("2026-04-30T06:00:00"),
    lastGoodsIssue: d("2026-05-25T10:00:00"),
  },
  {
    materialId: "MAT-3301",
    description: "Pneumatic Cylinder DNC-80-200-PPV-A",
    materialType: "HALB",
    plantId: "PLNT-MUM2",
    storageLocation: "SLoc-02",
    baseUnit: "EA",
    stockQuantity: 210,
    reorderPoint: 50,
    safetyStock: 25,
    valuationClass: "3100",
    batchNumber: "BATCH-MUM2-0050",
    lastGoodsReceipt: d("2026-05-03T10:30:00"),
    lastGoodsIssue: d("2026-05-20T14:00:00"),
  },
  {
    materialId: "MAT-3302",
    description: "Solenoid Valve 5/2 Way – 24VDC",
    materialType: "HALB",
    plantId: "PLNT-BLR3",
    storageLocation: "SLoc-01",
    baseUnit: "EA",
    stockQuantity: 380,
    reorderPoint: 120,
    safetyStock: 60,
    valuationClass: "3100",
    batchNumber: "BATCH-BLR3-0051",
    lastGoodsReceipt: d("2026-05-09T08:45:00"),
    lastGoodsIssue: d("2026-05-24T16:30:00"),
  },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    workOrderId: "WO-8801",
    description: "Overhaul hydraulic power pack – Press Line 3",
    functionalLocation: "PLNT-DEL1-PL03-HYD",
    equipmentId: "EQ-HPP-3001",
    priority: "HIGH",
    status: "IN_PROGRESS",
    orderType: "PM01",
    maintenanceActivityType: "Corrective Maintenance",
    plannedStartDate: d("2026-05-20T06:00:00"),
    plannedEndDate: d("2026-05-25T18:00:00"),
    actualStartDate: d("2026-05-20T07:30:00"),
    responsiblePerson: "Rajan Mehta",
    estimatedCost: 185000,
    functionalCodes: ["HYD-ERR-01", "HYD-ERR-02"],
    notes:
      "Pump seals degraded; full overhaul of HPP-3001 including accumulator recharge. Spare parts pre-staged in SLoc-03.",
  },
  {
    workOrderId: "WO-8802",
    description: "Replace VFD on Cooling Tower Fan CT-02",
    functionalLocation: "PLNT-MUM2-UT01-CT02",
    equipmentId: "EQ-VFD-2045",
    priority: "HIGH",
    status: "OPEN",
    orderType: "PM01",
    maintenanceActivityType: "Corrective Maintenance",
    plannedStartDate: d("2026-05-28T06:00:00"),
    plannedEndDate: d("2026-05-29T18:00:00"),
    responsiblePerson: "Amit Kulkarni",
    estimatedCost: 72000,
    functionalCodes: ["ELEC-FAIL-01", "ELEC-FAIL-02"],
    notes:
      "VFD fault code F0003 – over-current trip. Replacement unit ABB ACS580-01 available in warehouse.",
  },
  {
    workOrderId: "WO-8803",
    description: "Quarterly lubrication – CNC Machining Center MC-07",
    functionalLocation: "PLNT-BLR3-MC07-LUB",
    equipmentId: "EQ-CNC-7010",
    priority: "MEDIUM",
    status: "OPEN",
    orderType: "PM02",
    maintenanceActivityType: "Preventive Maintenance",
    plannedStartDate: d("2026-06-01T06:00:00"),
    plannedEndDate: d("2026-06-01T14:00:00"),
    responsiblePerson: "Venkatesh Rao",
    estimatedCost: 12500,
    functionalCodes: ["MECH-WEAR-01"],
    notes:
      "Standard quarterly PM – check spindle bearings, way-lube reservoir, hydraulic chuck pressure.",
  },
  {
    workOrderId: "WO-8804",
    description: "Thermal camera inspection – Electrical Panel Board EPB-12",
    functionalLocation: "PLNT-HYD4-EP12",
    equipmentId: "EQ-EPB-1200",
    priority: "LOW",
    status: "COMPLETED",
    orderType: "PM03",
    maintenanceActivityType: "Predictive Maintenance",
    plannedStartDate: d("2026-05-10T08:00:00"),
    plannedEndDate: d("2026-05-10T12:00:00"),
    actualStartDate: d("2026-05-10T08:15:00"),
    actualEndDate: d("2026-05-10T11:40:00"),
    responsiblePerson: "Priya Sharma",
    estimatedCost: 8500,
    functionalCodes: ["THERM-OVR-01", "THERM-OVR-02"],
    notes:
      "Hotspot detected on MCCB feeder #4 (87°C). Recommend tightening torque check within 30 days.",
  },
  {
    workOrderId: "WO-8805",
    description: "Replace worn conveyor belt – Packaging Line PK-01",
    functionalLocation: "PLNT-DEL1-PK01-CONV",
    equipmentId: "EQ-CONV-1005",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    orderType: "PM01",
    maintenanceActivityType: "Corrective Maintenance",
    plannedStartDate: d("2026-05-22T06:00:00"),
    plannedEndDate: d("2026-05-24T18:00:00"),
    actualStartDate: d("2026-05-22T06:45:00"),
    responsiblePerson: "Suresh Patel",
    estimatedCost: 45000,
    functionalCodes: ["MECH-WEAR-01", "MECH-WEAR-02"],
    notes:
      "Belt surface cracking observed. New Habasit belt (2200mm x 15m) staged. Tension rollers to be inspected.",
  },
  {
    workOrderId: "WO-8806",
    description: "Annual calibration – Pressure Transmitters Area A",
    functionalLocation: "PLNT-MUM2-PROC-A",
    equipmentId: "EQ-PT-AREA-A",
    priority: "LOW",
    status: "CLOSED",
    orderType: "PM02",
    maintenanceActivityType: "Preventive Maintenance",
    plannedStartDate: d("2026-04-15T06:00:00"),
    plannedEndDate: d("2026-04-17T18:00:00"),
    actualStartDate: d("2026-04-15T07:00:00"),
    actualEndDate: d("2026-04-16T16:00:00"),
    responsiblePerson: "Kavitha Nair",
    estimatedCost: 22000,
    functionalCodes: ["CTRL-SYS-01"],
    notes:
      "12 transmitters calibrated using Fluke 754. All within ±0.1% FS. Certificates uploaded to DMS.",
  },
  {
    workOrderId: "WO-8807",
    description: "Pneumatic leak audit – Assembly Shop",
    functionalLocation: "PLNT-BLR3-ASSY",
    equipmentId: "EQ-PNEU-ASSY",
    priority: "MEDIUM",
    status: "OPEN",
    orderType: "PM03",
    maintenanceActivityType: "Predictive Maintenance",
    plannedStartDate: d("2026-06-05T06:00:00"),
    plannedEndDate: d("2026-06-06T18:00:00"),
    responsiblePerson: "Deepak Joshi",
    estimatedCost: 15000,
    functionalCodes: ["PNEU-LEAK-01"],
    notes:
      "Ultrasonic leak detection sweep. Previous audit found 14 leak points; verify repairs and identify new leaks.",
  },
  {
    workOrderId: "WO-8808",
    description: "Emergency repair – Boiler feed-water pump BFP-02",
    functionalLocation: "PLNT-HYD4-UT02-BFP02",
    equipmentId: "EQ-BFP-2002",
    priority: "HIGH",
    status: "COMPLETED",
    orderType: "PM01",
    maintenanceActivityType: "Corrective Maintenance",
    plannedStartDate: d("2026-05-14T00:00:00"),
    plannedEndDate: d("2026-05-15T12:00:00"),
    actualStartDate: d("2026-05-14T01:30:00"),
    actualEndDate: d("2026-05-15T09:00:00"),
    responsiblePerson: "Rajan Mehta",
    estimatedCost: 135000,
    functionalCodes: ["HYD-ERR-01", "MECH-WEAR-02", "THERM-OVR-01"],
    notes:
      "Mechanical seal failure caused by thermal shock. Replaced seal cartridge and impeller. Vibration baseline recorded.",
  },
];

const INITIAL_SALES_ORDERS: SalesOrder[] = [
  {
    salesOrderId: "SO-10001",
    customerName: "Tata Steel Ltd.",
    customerCode: "CUST-TSL-001",
    orderDate: d("2026-04-10T10:00:00"),
    deliveryDate: d("2026-05-05T10:00:00"),
    netValue: 2450000,
    currency: "INR",
    status: "DELIVERED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9921",
        description: "Hydraulic Pump Assembly – 250bar",
        quantity: 5,
        unitPrice: 490000,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10002",
    customerName: "Larsen & Toubro",
    customerCode: "CUST-LNT-002",
    orderDate: d("2026-04-18T09:30:00"),
    deliveryDate: d("2026-05-12T09:30:00"),
    netValue: 1080000,
    currency: "INR",
    status: "DELIVERED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-4410",
        description: "Carbon Steel Flange DN150 PN40",
        quantity: 200,
        unitPrice: 3400,
      },
      {
        itemId: "20",
        materialId: "MAT-4411",
        description: "Stainless Steel Flange DN200 PN16",
        quantity: 50,
        unitPrice: 8000,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10003",
    customerName: "Bharat Heavy Electricals",
    customerCode: "CUST-BHEL-003",
    orderDate: d("2026-04-25T11:00:00"),
    deliveryDate: d("2026-06-01T11:00:00"),
    netValue: 975000,
    currency: "INR",
    status: "CONFIRMED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-7700",
        description: "PLC Control Module Siemens S7-1500",
        quantity: 10,
        unitPrice: 65000,
      },
      {
        itemId: "20",
        materialId: "MAT-7701",
        description: "HMI Touch Panel 15″ – IP65 Rated",
        quantity: 5,
        unitPrice: 45000,
      },
    ],
    salesOrg: "2000",
    distributionChannel: "20",
  },
  {
    salesOrderId: "SO-10004",
    customerName: "Hindalco Industries",
    customerCode: "CUST-HIN-004",
    orderDate: d("2026-05-02T08:00:00"),
    deliveryDate: d("2026-05-28T08:00:00"),
    netValue: 640000,
    currency: "INR",
    status: "SHIPPED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-5530",
        description: "Industrial Lubricant ISO VG 68 – 200L Drum",
        quantity: 800,
        unitPrice: 400,
      },
      {
        itemId: "20",
        materialId: "MAT-5531",
        description: "Synthetic Gear Oil ISO VG 220 – 200L Drum",
        quantity: 400,
        unitPrice: 800,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10005",
    customerName: "JSW Steel",
    customerCode: "CUST-JSW-005",
    orderDate: d("2026-05-06T14:00:00"),
    deliveryDate: d("2026-06-10T14:00:00"),
    netValue: 1560000,
    currency: "INR",
    status: "PENDING",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9922",
        description: "Hydraulic Pump Assembly – 400bar",
        quantity: 3,
        unitPrice: 520000,
      },
    ],
    salesOrg: "2000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10006",
    customerName: "Adani Ports & SEZ",
    customerCode: "CUST-ADA-006",
    orderDate: d("2026-05-08T10:30:00"),
    deliveryDate: d("2026-06-05T10:30:00"),
    netValue: 345000,
    currency: "INR",
    status: "CONFIRMED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-8801",
        description: "High-Temp Ceramic Bearing 6210-2Z",
        quantity: 100,
        unitPrice: 1200,
      },
      {
        itemId: "20",
        materialId: "MAT-8802",
        description: "Self-Aligning Ball Bearing 2208 ETN9",
        quantity: 150,
        unitPrice: 1500,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "20",
  },
  {
    salesOrderId: "SO-10007",
    customerName: "Mahindra & Mahindra",
    customerCode: "CUST-MAH-007",
    orderDate: d("2026-05-12T09:00:00"),
    deliveryDate: d("2026-06-08T09:00:00"),
    netValue: 472500,
    currency: "INR",
    status: "PENDING",
    items: [
      {
        itemId: "10",
        materialId: "MAT-3301",
        description: "Pneumatic Cylinder DNC-80-200-PPV-A",
        quantity: 50,
        unitPrice: 5500,
      },
      {
        itemId: "20",
        materialId: "MAT-3302",
        description: "Solenoid Valve 5/2 Way – 24VDC",
        quantity: 75,
        unitPrice: 2700,
      },
    ],
    salesOrg: "2000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10008",
    customerName: "Reliance Industries",
    customerCode: "CUST-RIL-008",
    orderDate: d("2026-04-05T07:00:00"),
    deliveryDate: d("2026-04-28T07:00:00"),
    netValue: 3200000,
    currency: "INR",
    status: "DELIVERED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9921",
        description: "Hydraulic Pump Assembly – 250bar",
        quantity: 4,
        unitPrice: 490000,
      },
      {
        itemId: "20",
        materialId: "MAT-7700",
        description: "PLC Control Module Siemens S7-1500",
        quantity: 12,
        unitPrice: 65000,
      },
      {
        itemId: "30",
        materialId: "MAT-5530",
        description: "Industrial Lubricant ISO VG 68 – 200L Drum",
        quantity: 1000,
        unitPrice: 420,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
  {
    salesOrderId: "SO-10009",
    customerName: "UltraTech Cement",
    customerCode: "CUST-UTC-009",
    orderDate: d("2026-05-15T12:00:00"),
    deliveryDate: d("2026-06-15T12:00:00"),
    netValue: 890000,
    currency: "INR",
    status: "PENDING",
    items: [
      {
        itemId: "10",
        materialId: "MAT-9922",
        description: "Hydraulic Pump Assembly – 400bar",
        quantity: 1,
        unitPrice: 520000,
      },
      {
        itemId: "20",
        materialId: "MAT-3301",
        description: "Pneumatic Cylinder DNC-80-200-PPV-A",
        quantity: 30,
        unitPrice: 5500,
      },
      {
        itemId: "30",
        materialId: "MAT-8801",
        description: "High-Temp Ceramic Bearing 6210-2Z",
        quantity: 100,
        unitPrice: 2050,
      },
    ],
    salesOrg: "2000",
    distributionChannel: "20",
  },
  {
    salesOrderId: "SO-10010",
    customerName: "Godrej & Boyce",
    customerCode: "CUST-GNB-010",
    orderDate: d("2026-05-18T15:30:00"),
    deliveryDate: d("2026-06-20T15:30:00"),
    netValue: 162000,
    currency: "INR",
    status: "CANCELLED",
    items: [
      {
        itemId: "10",
        materialId: "MAT-4410",
        description: "Carbon Steel Flange DN150 PN40",
        quantity: 30,
        unitPrice: 3400,
      },
      {
        itemId: "20",
        materialId: "MAT-4411",
        description: "Stainless Steel Flange DN200 PN16",
        quantity: 10,
        unitPrice: 6000,
      },
    ],
    salesOrg: "1000",
    distributionChannel: "10",
  },
];

/* ================================================================
   4. Context Creation
   ================================================================ */

const SapContext = createContext<SapContextType | undefined>(undefined);

/* ================================================================
   5. Provider Component
   ================================================================ */

export const SapProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [materials, setMaterials] =
    useState<SAPMaterial[]>(INITIAL_MATERIALS);
  const [workOrders, setWorkOrders] =
    useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [salesOrders, setSalesOrders] =
    useState<SalesOrder[]>(INITIAL_SALES_ORDERS);
  const [odataLogs, setOdataLogs] = useState<ODataLogEntry[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [odataDebuggerEnabled, setOdataDebuggerEnabled] =
    useState<boolean>(false);

  /* ---------- internal helpers --------------------------------- */

  const pushODataLog = useCallback(
    (
      method: ODataLogEntry["method"],
      endpoint: string,
      payload: unknown,
      statusCode: number,
    ) => {
      const entry: ODataLogEntry = {
        id: uuid(),
        timestamp: new Date(),
        method,
        endpoint,
        payload,
        statusCode,
        duration: randomDuration(),
        correlationId: uuid(),
      };
      setOdataLogs((prev) => [...prev, entry]);
      return entry;
    },
    [],
  );

  const pushTelemetry = useCallback(
    (
      action: string,
      component: string,
      details: Record<string, unknown>,
      debugEnabled: boolean,
    ) => {
      const evt: TelemetryEvent = {
        id: uuid(),
        timestamp: new Date(),
        action,
        component,
        details,
      };
      setTelemetry((prev) => [...prev, evt]);

      if (debugEnabled) {
        const debugLog: ODataLogEntry = {
          id: uuid(),
          timestamp: new Date(),
          method: "POST",
          endpoint:
            "/sap/opu/odata4/sap/API_TELEMETRY/A_TelemetryEvent",
          payload: evt,
          statusCode: 201,
          duration: randomDuration(),
          correlationId: uuid(),
        };
        setOdataLogs((prev) => [...prev, debugLog]);
      }
    },
    [],
  );

  /* ---------- updateStock -------------------------------------- */

  const updateStock = useCallback(
    (materialId: string, newQuantity: number) => {
      setMaterials((prev) =>
        prev.map((m) =>
          m.materialId === materialId
            ? { ...m, stockQuantity: newQuantity }
            : m,
        ),
      );

      pushODataLog(
        "PATCH",
        `/sap/opu/odata4/sap/API_MATERIAL_STOCK/A_MaterialStock('${materialId}')`,
        {
          d: {
            Material: materialId,
            MatlWrhsStkQtyInMatlBaseUnit: newQuantity.toString(),
            MaterialBaseUnit: "EA",
          },
        },
        200,
      );

      pushTelemetry(
        "STOCK_UPDATED",
        "MaterialManagement",
        { materialId, newQuantity },
        odataDebuggerEnabled,
      );
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled],
  );

  /* ---------- createWorkOrder ---------------------------------- */

  const createWorkOrder = useCallback(
    (fields: Partial<WorkOrder>) => {
      const nextId = `WO-${String(
        Math.floor(Math.random() * 9000) + 1000,
      )}`;
      const now = new Date();

      const newWO: WorkOrder = {
        workOrderId: fields.workOrderId ?? nextId,
        description: fields.description ?? "New Maintenance Order",
        functionalLocation:
          fields.functionalLocation ?? "PLNT-DEL1-GEN",
        equipmentId: fields.equipmentId ?? "EQ-GEN-0000",
        priority: fields.priority ?? "MEDIUM",
        status: fields.status ?? "OPEN",
        orderType: fields.orderType ?? "PM01",
        maintenanceActivityType:
          fields.maintenanceActivityType ?? "Corrective Maintenance",
        plannedStartDate: fields.plannedStartDate ?? now,
        plannedEndDate:
          fields.plannedEndDate ??
          new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        actualStartDate: fields.actualStartDate,
        actualEndDate: fields.actualEndDate,
        responsiblePerson:
          fields.responsiblePerson ?? "Unassigned",
        estimatedCost: fields.estimatedCost ?? 0,
        functionalCodes: fields.functionalCodes ?? [],
        notes: fields.notes ?? "",
      };

      setWorkOrders((prev) => [...prev, newWO]);

      pushODataLog(
        "POST",
        "/sap/opu/odata4/sap/API_MAINTORDER/A_MaintenanceOrder",
        {
          d: {
            MaintenanceOrder: newWO.workOrderId,
            MaintenanceOrderDesc: newWO.description,
            FunctionalLocation: newWO.functionalLocation,
            Equipment: newWO.equipmentId,
            MaintPriority: newWO.priority === "HIGH" ? "1" : newWO.priority === "MEDIUM" ? "2" : "3",
            OrderType: newWO.orderType,
            MaintActivityType: newWO.maintenanceActivityType,
            MaintOrdBasicStartDate: newWO.plannedStartDate.toISOString(),
            MaintOrdBasicEndDate: newWO.plannedEndDate.toISOString(),
            PersonResponsible: newWO.responsiblePerson,
            EstimatedCost: newWO.estimatedCost.toString(),
          },
        },
        201,
      );

      pushTelemetry(
        "WORK_ORDER_CREATED",
        "PlantMaintenance",
        {
          workOrderId: newWO.workOrderId,
          orderType: newWO.orderType,
          priority: newWO.priority,
        },
        odataDebuggerEnabled,
      );
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled],
  );

  /* ---------- createSalesOrder --------------------------------- */

  const createSalesOrder = useCallback(
    (fields: Partial<SalesOrder>) => {
      const nextId = `SO-${String(
        Math.floor(Math.random() * 90000) + 10000,
      )}`;
      const now = new Date();

      const newSO: SalesOrder = {
        salesOrderId: fields.salesOrderId ?? nextId,
        customerName: fields.customerName ?? "New Customer",
        customerCode: fields.customerCode ?? "CUST-NEW-000",
        orderDate: fields.orderDate ?? now,
        deliveryDate:
          fields.deliveryDate ??
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        netValue: fields.netValue ?? 0,
        currency: fields.currency ?? "INR",
        status: fields.status ?? "PENDING",
        items: fields.items ?? [],
        salesOrg: fields.salesOrg ?? "1000",
        distributionChannel: fields.distributionChannel ?? "10",
      };

      setSalesOrders((prev) => [...prev, newSO]);

      pushODataLog(
        "POST",
        "/sap/opu/odata4/sap/API_SALES_ORDER/A_SalesOrder",
        {
          d: {
            SalesOrder: newSO.salesOrderId,
            SoldToParty: newSO.customerCode,
            SalesOrganization: newSO.salesOrg,
            DistributionChannel: newSO.distributionChannel,
            RequestedDeliveryDate:
              newSO.deliveryDate.toISOString(),
            TransactionCurrency: newSO.currency,
            to_Item: newSO.items.map((item) => ({
              SalesOrderItem: item.itemId,
              Material: item.materialId,
              RequestedQuantity: item.quantity.toString(),
              NetAmount: (
                item.quantity * item.unitPrice
              ).toString(),
            })),
          },
        },
        201,
      );

      pushTelemetry(
        "SALES_ORDER_CREATED",
        "SalesDistribution",
        {
          salesOrderId: newSO.salesOrderId,
          customerCode: newSO.customerCode,
          netValue: newSO.netValue,
        },
        odataDebuggerEnabled,
      );
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled],
  );

  /* ---------- updateWorkOrderStatus ---------------------------- */

  const updateWorkOrderStatus = useCallback(
    (workOrderId: string, status: WorkOrder["status"]) => {
      const now = new Date();

      setWorkOrders((prev) =>
        prev.map((wo) => {
          if (wo.workOrderId !== workOrderId) return wo;

          const updates: Partial<WorkOrder> = { status };
          if (
            status === "IN_PROGRESS" &&
            wo.actualStartDate === undefined
          ) {
            updates.actualStartDate = now;
          }
          if (
            (status === "COMPLETED" || status === "CLOSED") &&
            wo.actualEndDate === undefined
          ) {
            updates.actualEndDate = now;
          }
          return { ...wo, ...updates };
        }),
      );

      const sapStatus =
        status === "OPEN"
          ? "I0001"
          : status === "IN_PROGRESS"
            ? "I0002"
            : status === "COMPLETED"
              ? "I0009"
              : "I0046";

      pushODataLog(
        "PATCH",
        `/sap/opu/odata4/sap/API_MAINTORDER/A_MaintenanceOrder('${workOrderId}')`,
        {
          d: {
            MaintenanceOrder: workOrderId,
            MaintOrdOperationStatusCode: sapStatus,
            MaintenanceOrderStatusText: status,
          },
        },
        200,
      );

      pushTelemetry(
        "WORK_ORDER_STATUS_CHANGED",
        "PlantMaintenance",
        { workOrderId, newStatus: status },
        odataDebuggerEnabled,
      );
    },
    [pushODataLog, pushTelemetry, odataDebuggerEnabled],
  );

  /* ---------- toggleODataDebugger ------------------------------ */

  const toggleODataDebugger = useCallback(() => {
    setOdataDebuggerEnabled((prev) => !prev);
  }, []);

  /* ---------- emitTelemetry ------------------------------------ */

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

  /* ---------- searchAll ---------------------------------------- */

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

  /* ---------- metrics (useMemo) -------------------------------- */

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
