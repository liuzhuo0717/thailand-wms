// ============================================================
// data.js – localStorage data management + seed data
// ============================================================

const DB = {
  USERS: 'wms_users',
  INVENTORY: 'wms_inventory',
  INBOUND: 'wms_inbound',
  REQUESTS: 'wms_requests',
  REGIONS: 'wms_regions',
  OFFICE: 'wms_office',
  INVENTORY_CHECK: 'wms_inventory_check',
  INITIALIZED: 'wms_initialized',
};

// ---- Region definitions ----
const REGIONS = [
  'BKK East', 'BKK West', 'Central East', 'Central West',
  'Upper North', 'Lower North', 'Upper Northeast', 'Lower Northeast',
  'Upper South', 'Lower South',
];

// ---- Users ----
const USERS = [
  { username: 'admin', password: 'thailand2026', role: 'admin', region: null, displayName: 'Warehouse Admin' },
  ...REGIONS.map(r => ({
    username: 'rrm-' + r.toLowerCase().replace(/\s+/g, '-'),
    password: 'rrm2026',
    role: 'rrm',
    region: r,
    displayName: 'RRM ' + r,
  })),
];

// ---- Helpers ----
function getStore(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function genId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(d1, d2) {
  if (!d1) return 0;
  const a = new Date(d1), b = d2 ? new Date(d2) : new Date();
  return Math.floor((b - a) / 86400000);
}

// ---- Seed Data ----
function seedAll() {
  // INVENTORY
  const inventory = [
    { materialCode:'MRP0000833', code:'EV202202090003', description:'Popcorn + Stand', nickName:'-', type:'Event', part:'Phone', goodInv:3, damagedInv:0, packageType:'PCS', incomingDate:'2024-03-15', agingByHQ:800, dimW:60, dimL:60, dimH:180, weightPcs:12, costUnit:7800, currency:'THB' },
    { materialCode:'MRP0000845', code:'FG202203091001', description:'Mi Smart Standing Fan 2 EU', nickName:'-', type:'Free gift', part:'Phone', goodInv:48, damagedInv:0, packageType:'PCS', incomingDate:'2024-05-10', agingByHQ:600, dimW:40, dimL:40, dimH:90, weightPcs:5, costUnit:2590, currency:'THB' },
    { materialCode:'MRP0000861', code:'FI202201272001', description:'Traffic counter', nickName:'-', type:'Furniture', part:'Shop con', goodInv:17, damagedInv:0, packageType:'PCS', incomingDate:'2024-01-20', agingByHQ:900, dimW:15, dimL:10, dimH:5, weightPcs:0.3, costUnit:35, currency:'THB' },
    { materialCode:'MRP0000864', code:'FI202207152002', description:'Step IOT 20', nickName:'AIOT', type:'Furniture', part:'Shop con', goodInv:9, damagedInv:0, packageType:'PCS', incomingDate:'2024-07-20', agingByHQ:500, dimW:120, dimL:60, dimH:20, weightPcs:8, costUnit:3000, currency:'THB' },
    { materialCode:'MHP0000279', code:'PO202203094006', description:'Acrylic spec card for AIOT', nickName:'-', type:'POSM', part:'AIOT', goodInv:2047, damagedInv:0, packageType:'PCS', incomingDate:'2024-02-10', agingByHQ:850, dimW:10, dimL:15, dimH:0.5, weightPcs:0.02, costUnit:2.60, currency:'THB' },
    { materialCode:'MRP0000888', code:'PO202205204035', description:'Shunzao Vacuum Cleaner Floor Stand Holder', nickName:'-', type:'Props', part:'AIOT', goodInv:51, damagedInv:0, packageType:'PCS', incomingDate:'2024-05-20', agingByHQ:600, dimW:30, dimL:30, dimH:120, weightPcs:3, costUnit:990, currency:'THB' },
    { materialCode:'MRP0000905', code:'SE202110304126', description:'Battery R2032/3V', nickName:'-', type:'Security', part:'Shop con', goodInv:255, damagedInv:0, packageType:'PCS', incomingDate:'2023-10-30', agingByHQ:1000, dimW:2, dimL:2, dimH:0.3, weightPcs:0.01, costUnit:50, currency:'THB' },
    { materialCode:'MRP0013122', code:'XMDP25040088', description:'Projector Display', nickName:'-', type:'Display Tray', part:'AIOT', goodInv:6, damagedInv:0, packageType:'PCS', incomingDate:'2025-04-01', agingByHQ:200, dimW:50, dimL:50, dimH:30, weightPcs:4, costUnit:2990, currency:'THB' },
    { materialCode:'MRP0002654', code:'XMFG23120901', description:'Redmi Note 13 series - Premium Gift (Bluetooth speaker)', nickName:'-', type:'Free gift', part:'Phone', goodInv:1920, damagedInv:0, packageType:'PCS', incomingDate:'2024-12-09', agingByHQ:300, dimW:10, dimL:10, dimH:8, weightPcs:0.4, costUnit:0, currency:'THB' },
    { materialCode:'MRP0005732', code:'XMFG24060028', description:'Xiaomi 8th anniversary gift box', nickName:'-', type:'Free gift', part:'Phone', goodInv:4303, damagedInv:0, packageType:'PCS', incomingDate:'2025-01-15', agingByHQ:250, dimW:25, dimL:25, dimH:10, weightPcs:0.6, costUnit:0, currency:'THB' },
    // Additional items
    { materialCode:'MRP0015001', code:'PO202401014001', description:'Xiaomi Latex Balloon (Red)', nickName:'-', type:'POSM', part:'POSM General', goodInv:5000, damagedInv:0, packageType:'PCS', incomingDate:'2025-02-01', agingByHQ:180, dimW:20, dimL:20, dimH:0.1, weightPcs:0.005, costUnit:1.50, currency:'THB' },
    { materialCode:'MRP0015002', code:'PO202401014002', description:'Xiaomi Brand Sticker Sheet', nickName:'-', type:'POSM', part:'POSM General', goodInv:10000, damagedInv:0, packageType:'PCS', incomingDate:'2025-02-01', agingByHQ:180, dimW:15, dimL:21, dimH:0.1, weightPcs:0.01, costUnit:0.80, currency:'THB' },
    { materialCode:'MRP0015003', code:'PO202401014003', description:'Non-woven Shopping Bag (Xiaomi)', nickName:'-', type:'POSM', part:'POSM General', goodInv:3000, damagedInv:0, packageType:'PCS', incomingDate:'2025-03-10', agingByHQ:150, dimW:35, dimL:40, dimH:0.5, weightPcs:0.05, costUnit:5.00, currency:'THB' },
    { materialCode:'MRP0015004', code:'PO202401014004', description:'A2 Promotional Poster (Redmi Note 14)', nickName:'-', type:'POSM', part:'Phone', goodInv:800, damagedInv:0, packageType:'PCS', incomingDate:'2025-01-20', agingByHQ:200, dimW:42, dimL:59.4, dimH:0.2, weightPcs:0.1, costUnit:12.00, currency:'THB' },
    { materialCode:'MRP0015005', code:'PO202401014005', description:'Counter Display Stand (Phone)', nickName:'-', type:'Display Tray', part:'Phone', goodInv:120, damagedInv:0, packageType:'PCS', incomingDate:'2024-11-15', agingByHQ:350, dimW:40, dimL:30, dimH:50, weightPcs:2.5, costUnit:450, currency:'THB' },
    { materialCode:'MRP0015006', code:'PO202401014006', description:'Acrylic Price Tag Holder', nickName:'-', type:'POSM', part:'POSM General', goodInv:1500, damagedInv:0, packageType:'PCS', incomingDate:'2025-03-01', agingByHQ:160, dimW:8, dimL:12, dimH:3, weightPcs:0.05, costUnit:8.00, currency:'THB' },
    { materialCode:'MRP0015007', code:'PO202401014007', description:'Roll-up Banner Stand (Xiaomi 15)', nickName:'-', type:'Event', part:'Phone', goodInv:25, damagedInv:0, packageType:'PCS', incomingDate:'2025-04-15', agingByHQ:100, dimW:85, dimL:200, dimH:10, weightPcs:5, costUnit:1200, currency:'THB' },
    { materialCode:'MRP0015008', code:'PO202401014008', description:'Table Standee (AIOT)', nickName:'-', type:'POSM', part:'AIOT', goodInv:200, damagedInv:0, packageType:'PCS', incomingDate:'2025-02-20', agingByHQ:170, dimW:15, dimL:20, dimH:0.5, weightPcs:0.08, costUnit:6.00, currency:'THB' },
    { materialCode:'MRP0015009', code:'SE202401014009', description:'Security Tag (Anti-theft)', nickName:'-', type:'Security', part:'Shop con', goodInv:500, damagedInv:0, packageType:'PCS', incomingDate:'2025-01-10', agingByHQ:220, dimW:4, dimL:4, dimH:1, weightPcs:0.02, costUnit:25.00, currency:'THB' },
    { materialCode:'MRP0015010', code:'FG202401014010', description:'Mi Portable Bluetooth Speaker', nickName:'-', type:'Free gift', part:'Phone', goodInv:600, damagedInv:0, packageType:'PCS', incomingDate:'2025-05-01', agingByHQ:80, dimW:10, dimL:10, dimH:8, weightPcs:0.35, costUnit:890, currency:'THB' },
    { materialCode:'MRP0015011', code:'PO202401014011', description:'Floor Graphic Sticker (Xiaomi)', nickName:'-', type:'POSM', part:'POSM General', goodInv:400, damagedInv:0, packageType:'PCS', incomingDate:'2025-03-15', agingByHQ:140, dimW:60, dimL:60, dimH:0.1, weightPcs:0.15, costUnit:35.00, currency:'THB' },
    { materialCode:'MRP0015012', code:'PO202401014012', description:'Acrylic Leaflet Holder', nickName:'-', type:'POSM', part:'POSM General', goodInv:300, damagedInv:0, packageType:'PCS', incomingDate:'2025-04-01', agingByHQ:120, dimW:22, dimL:10, dimH:25, weightPcs:0.4, costUnit:45.00, currency:'THB' },
    { materialCode:'MRP0015013', code:'EV202401014013', description:'Pop-up Display Booth (3x3m)', nickName:'-', type:'Event', part:'Phone', goodInv:4, damagedInv:0, packageType:'PCS', incomingDate:'2025-05-20', agingByHQ:60, dimW:300, dimL:300, dimH:250, weightPcs:45, costUnit:15000, currency:'THB' },
    { materialCode:'MRP0015014', code:'FI202401014014', description:'Smart Shelf Label (ESL)', nickName:'-', type:'Furniture', part:'Shop con', goodInv:80, damagedInv:0, packageType:'PCS', incomingDate:'2025-06-01', agingByHQ:40, dimW:10, dimL:6, dimH:1.5, weightPcs:0.08, costUnit:120, currency:'THB' },
  ];

  // INBOUND
  const inbound = [
    { inboundNo:'IB202601001', materialCode:'MRP0000833', description:'Popcorn + Stand', qty:10, incomingDate:'2026-01-05', poNumber:'PO-TH-2026-0001' },
    { inboundNo:'IB202601002', materialCode:'MRP0000845', description:'Mi Smart Standing Fan 2 EU', qty:100, incomingDate:'2026-01-08', poNumber:'PO-TH-2026-0002' },
    { inboundNo:'IB202602001', materialCode:'MHP0000279', description:'Acrylic spec card for AIOT', qty:5000, incomingDate:'2026-02-10', poNumber:'PO-TH-2026-0015' },
    { inboundNo:'IB202602002', materialCode:'MRP0015001', description:'Xiaomi Latex Balloon (Red)', qty:2000, incomingDate:'2026-02-15', poNumber:'PO-TH-2026-0018' },
    { inboundNo:'IB202603001', materialCode:'MRP0015003', description:'Non-woven Shopping Bag (Xiaomi)', qty:1000, incomingDate:'2026-03-01', poNumber:'PO-TH-2026-0022' },
    { inboundNo:'IB202603002', materialCode:'MRP0002654', description:'Redmi Note 13 series - Premium Gift (Bluetooth speaker)', qty:500, incomingDate:'2026-03-05', poNumber:'PO-TH-2026-0025' },
    { inboundNo:'IB202604001', materialCode:'MRP0013122', description:'Projector Display', qty:10, incomingDate:'2026-04-01', poNumber:'PO-TH-2026-0030' },
    { inboundNo:'IB202604002', materialCode:'MRP0005732', description:'Xiaomi 8th anniversary gift box', qty:2000, incomingDate:'2026-04-10', poNumber:'PO-TH-2026-0033' },
    { inboundNo:'IB202605001', materialCode:'MRP0015010', description:'Mi Portable Bluetooth Speaker', qty:300, incomingDate:'2026-05-01', poNumber:'PO-TH-2026-0040' },
    { inboundNo:'IB202606001', materialCode:'MRP0015014', description:'Smart Shelf Label (ESL)', qty:50, incomingDate:'2026-06-10', poNumber:'PO-TH-2026-0045' },
  ];

  // REQUESTS
  const requests = [
    {
      requestId:'REQ20260601001', requestedDate:'2026-06-01', region:'BKK East', channelName:'Power Buy',
      shopCode:'PB-BKK-001', shopName:'Power Buy Mega Bangna', province:'Samut Prakan',
      shoppingMall:'Mega Bangna', address:'39 Moo 6, Bangna-Trad Rd., Bangkaew, Bangplee, Samut Prakan 10540',
      rmName:'Somchai Prasert', receiverName:'Nattapong W.', contactNumber:'081-234-5678',
      code:'PO202203094006', itemName:'Acrylic spec card for AIOT', qty:50, support:'POSM',
      part:'AIOT', aiotApproval:'APPROVED', retailApproval:'APPROVED', shopConApproval:'APPROVED',
      status:'DONE', doneDate:'2026-06-10'
    },
    {
      requestId:'REQ20260601002', requestedDate:'2026-06-02', region:'BKK East', channelName:'TRUE',
      shopCode:'TR-BKK-015', shopName:'TRUE Shop Seacon Square', province:'Bangkok',
      shoppingMall:'Seacon Square', address:'99 Srinakarin Rd., Nongbon, Prawet, Bangkok 10250',
      rmName:'Somchai Prasert', receiverName:'Waraporn K.', contactNumber:'089-876-5432',
      code:'XMFG23120901', itemName:'Redmi Note 13 series - Premium Gift (Bluetooth speaker)', qty:100, support:'Free gift',
      part:'Phone', aiotApproval:'APPROVED', retailApproval:'APPROVED', shopConApproval:'APPROVED',
      status:'DONE', doneDate:'2026-06-12'
    },
    {
      requestId:'REQ20260602001', requestedDate:'2026-06-05', region:'BKK West', channelName:'Power Buy',
      shopCode:'PB-BKK-008', shopName:'Power Buy Central Westgate', province:'Nonthaburi',
      shoppingMall:'Central Westgate', address:'199 Moo 6, Bang Bua Thong, Nonthaburi 11110',
      rmName:'Wichai Thongdee', receiverName:'Pranee S.', contactNumber:'082-345-6789',
      code:'PO202401014004', itemName:'A2 Promotional Poster (Redmi Note 14)', qty:20, support:'POSM',
      part:'Phone', aiotApproval:'APPROVED', retailApproval:'PENDING', shopConApproval:'-',
      status:'PENDING', doneDate:null
    },
    {
      requestId:'REQ20260602002', requestedDate:'2026-06-06', region:'Central East', channelName:'TRUE',
      shopCode:'TR-CE-003', shopName:'TRUE Shop Central Pattaya', province:'Chonburi',
      shoppingMall:'Central Pattaya Beach', address:'333/99 Moo 9, Nongprue, Banglamung, Chonburi 20150',
      rmName:'Kittipong M.', receiverName:'Siriporn L.', contactNumber:'086-789-0123',
      code:'PO202205204035', itemName:'Shunzao Vacuum Cleaner Floor Stand Holder', qty:10, support:'Props',
      part:'AIOT', aiotApproval:'PENDING', retailApproval:'-', shopConApproval:'-',
      status:'PENDING', doneDate:null
    },
    {
      requestId:'REQ20260603001', requestedDate:'2026-06-08', region:'Upper North', channelName:'JMart',
      shopCode:'JM-UN-002', shopName:'JMart Central Chiangmai Airport', province:'Chiang Mai',
      shoppingMall:'Central Chiangmai Airport', address:'2 Mahidol Rd., Pa Daet, Mueang Chiang Mai, Chiang Mai 50100',
      rmName:'Arisa P.', receiverName:'Natchanon K.', contactNumber:'095-123-4567',
      code:'XMFG24060028', itemName:'Xiaomi 8th anniversary gift box', qty:200, support:'Free gift',
      part:'Phone', aiotApproval:'-', retailApproval:'PENDING', shopConApproval:'-',
      status:'PENDING', doneDate:null
    },
    {
      requestId:'REQ20260603002', requestedDate:'2026-06-09', region:'Lower South', channelName:'Authorized Store',
      shopCode:'AS-LS-005', shopName:'Xiaomi Authorized Store Hatyai', province:'Songkhla',
      shoppingMall:'Central Festival Hatyai', address:'1518 Kanjanavanich Rd., Hat Yai, Songkhla 90110',
      rmName:'Peerapat S.', receiverName:'Jiraporn T.', contactNumber:'087-456-7890',
      code:'PO202401014005', itemName:'Counter Display Stand (Phone)', qty:5, support:'Display Tray',
      part:'Phone', aiotApproval:'-', retailApproval:'APPROVED', shopConApproval:'APPROVED',
      status:'PENDING', doneDate:null
    },
    {
      requestId:'REQ20260604001', requestedDate:'2026-06-10', region:'BKK East', channelName:'Xiaomi Store',
      shopCode:'XS-BKK-001', shopName:'Xiaomi Store Central World', province:'Bangkok',
      shoppingMall:'Central World', address:'999/9 Rama I Rd., Pathum Wan, Bangkok 10330',
      rmName:'Somchai Prasert', receiverName:'Thanawat R.', contactNumber:'080-111-2222',
      code:'PO202401014001', itemName:'Xiaomi Latex Balloon (Red)', qty:500, support:'POSM',
      part:'POSM General', aiotApproval:'-', retailApproval:'-', shopConApproval:'PENDING',
      status:'PENDING', doneDate:null
    },
  ];

  // OFFICE
  const office = [
    { id:'OFC20260601001', statusDelivery:'DONE', requestedDate:'2026-06-01', team:'Admin', contactPerson:'Malee S.', contactNumber:'02-123-4567', code:'OFC-A4-001', itemName:'A4 Copy Paper (Box)', qty:5, support:'Office' },
    { id:'OFC20260602001', statusDelivery:'PENDING', requestedDate:'2026-06-05', team:'HR', contactPerson:'Sunisa W.', contactNumber:'02-234-5678', code:'OFC-PEN-002', itemName:'Ballpoint Pen (Black)', qty:50, support:'Office' },
    { id:'OFC20260603001', statusDelivery:'PENDING', requestedDate:'2026-06-08', team:'Finance', contactPerson:'Anan K.', contactNumber:'02-345-6789', code:'OFC-FILE-003', itemName:'Document Folder (Plastic)', qty:30, support:'Office' },
  ];

  // INVENTORY CHECK
  const invCheck = [
    { id:'CHK20260601001', checkDate:'2026-06-01', materialCode:'MRP0000833', description:'Popcorn + Stand', systemQty:3, actualQty:3, difference:0, remark:'OK' },
    { id:'CHK20260601002', checkDate:'2026-06-01', materialCode:'MRP0000845', description:'Mi Smart Standing Fan 2 EU', systemQty:48, actualQty:47, difference:-1, remark:'1 unit missing – investigate' },
    { id:'CHK20260601003', checkDate:'2026-06-01', materialCode:'MHP0000279', description:'Acrylic spec card for AIOT', systemQty:2047, actualQty:2047, difference:0, remark:'OK' },
  ];

  // REGION distribution (populated when requests go DONE)
  const regions = {};
  REGIONS.forEach(r => { regions[r] = []; });
  // Seed BKK East with DONE requests
  regions['BKK East'].push(
    { requestId:'REQ20260601001', doneDate:'2026-06-10', channelName:'Power Buy', shopCode:'PB-BKK-001', shopName:'Power Buy Mega Bangna', province:'Samut Prakan', code:'PO202203094006', itemName:'Acrylic spec card for AIOT', qty:50, part:'AIOT', receiverName:'Nattapong W.' },
    { requestId:'REQ20260601002', doneDate:'2026-06-12', channelName:'TRUE', shopCode:'TR-BKK-015', shopName:'TRUE Shop Seacon Square', province:'Bangkok', code:'XMFG23120901', itemName:'Redmi Note 13 series - Premium Gift (Bluetooth speaker)', qty:100, part:'Phone', receiverName:'Waraporn K.' },
  );

  // XIAOMI STORE & NEW RETAIL (empty initially, gets populated when store-channel requests are DONE)
  const xiaomiStore = [
    { requestId:'REQ20260501001', doneDate:'2026-05-15', channelName:'Xiaomi Store', shopCode:'XS-BKK-001', shopName:'Xiaomi Store Central World', province:'Bangkok', code:'PO202401014001', itemName:'Xiaomi Latex Balloon (Red)', qty:200, part:'POSM General', receiverName:'Thanawat R.' },
  ];

  // AIOT (AIOT-specific requests)
  const aiot = [
    { requestId:'REQ20260502001', doneDate:'2026-05-20', channelName:'Power Buy', shopCode:'PB-BKK-001', shopName:'Power Buy Mega Bangna', province:'Samut Prakan', code:'FI202207152002', description:'Step IOT 20', qty:2, part:'Shop con', receiverName:'Nattapong W.' },
  ];

  setStore(DB.INVENTORY, inventory);
  setStore(DB.INBOUND, inbound);
  setStore(DB.REQUESTS, requests);
  setStore(DB.OFFICE, office);
  setStore(DB.INVENTORY_CHECK, invCheck);
  setStore(DB.REGIONS, regions);
  localStorage.setItem('wms_xiaomi_store', JSON.stringify(xiaomiStore));
  localStorage.setItem('wms_aiot', JSON.stringify(aiot));
  localStorage.setItem(DB.INITIALIZED, '1');
}

function ensureInitialized() {
  if (!localStorage.getItem(DB.INITIALIZED)) {
    seedAll();
  }
}

// Initialize on load
ensureInitialized();
