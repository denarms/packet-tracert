/**
 * Cisco Packet Tracer Web - Network Simulation Engine
 *
 * Models the data plane hop by hop:
 *  - Layer 1: cable type compatibility, admin state, power state.
 *  - Layer 2: ARP resolution, switch MAC learning, VLANs (access / 802.1Q trunk), hubs.
 *  - Layer 3: connected / static / RIP / OSPF routes, longest-prefix match,
 *             TTL, ICMP echo / unreachable / time-exceeded, numbered ACLs,
 *             router-on-a-stick sub-interfaces, switch SVIs, loopbacks.
 *  - Services: DHCP (router pools, server service, home router, ip helper-address relay).
 */

/* ========================================================================== */
/* IP helpers                                                                 */
/* ========================================================================== */

export class IPUtils {
  static parseIP(ipStr) {
    if (!ipStr || typeof ipStr !== 'string') return 0;
    const parts = ipStr.trim().split('.');
    if (parts.length !== 4) return 0;
    return parts.reduce((acc, octet) => ((acc << 8) + (parseInt(octet, 10) & 255)) >>> 0, 0) >>> 0;
  }

  static formatIP(ipNum) {
    return [(ipNum >>> 24) & 255, (ipNum >>> 16) & 255, (ipNum >>> 8) & 255, ipNum & 255].join('.');
  }

  static isValidIP(ipStr) {
    if (!ipStr || typeof ipStr !== 'string') return false;
    const parts = ipStr.trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => /^\d{1,3}$/.test(p) && parseInt(p, 10) <= 255);
  }

  static isValidMask(maskStr) {
    if (!this.isValidIP(maskStr)) return false;
    const m = this.parseIP(maskStr);
    const inv = (~m) >>> 0;
    return ((inv + 1) & inv) === 0;
  }

  static maskToPrefix(maskStr) {
    let m = this.parseIP(maskStr);
    let n = 0;
    while (m & 0x80000000) { n++; m = (m << 1) >>> 0; }
    return n;
  }

  static prefixToMask(prefix) {
    if (prefix <= 0) return '0.0.0.0';
    return this.formatIP((0xffffffff << (32 - prefix)) >>> 0);
  }

  static networkOf(ip, mask) {
    return this.formatIP((this.parseIP(ip) & this.parseIP(mask)) >>> 0);
  }

  static broadcastOf(ip, mask) {
    return this.formatIP(((this.parseIP(ip) & this.parseIP(mask)) | (~this.parseIP(mask) >>> 0)) >>> 0);
  }

  static isSameSubnet(ip1, ip2, mask) {
    if (!ip1 || !ip2 || !mask) return false;
    const m = this.parseIP(mask);
    return ((this.parseIP(ip1) & m) >>> 0) === ((this.parseIP(ip2) & m) >>> 0);
  }

  static inNetwork(ip, net, mask) {
    return this.isSameSubnet(ip, net, mask);
  }

  static classfulMask(ip) {
    const first = this.parseIP(ip) >>> 24;
    if (first < 128) return '255.0.0.0';
    if (first < 192) return '255.255.0.0';
    return '255.255.255.0';
  }

  static classfulNetwork(ip) {
    return this.networkOf(ip, this.classfulMask(ip));
  }

  static wildcardMatch(ip, net, wildcard) {
    const care = (~this.parseIP(wildcard)) >>> 0;
    return ((this.parseIP(ip) & care) >>> 0) === ((this.parseIP(net) & care) >>> 0);
  }

  static generateMAC() {
    const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return `00${hex()}.${hex()}${hex()}.${hex()}${hex()}`;
  }
}

/* ========================================================================== */
/* Interface naming                                                           */
/* ========================================================================== */

const IFACE_TYPES = ['FastEthernet', 'GigabitEthernet', 'Serial', 'Ethernet', 'Vlan', 'Loopback', 'Port'];

export function parseIfaceRef(str) {
  if (!str) return null;
  const s = String(str).replace(/\s+/g, '');
  const m = s.match(/^([a-zA-Z-]+)(\d[\d/.:]*)$/);
  if (!m) return null;
  const prefix = m[1].toLowerCase();
  const type = IFACE_TYPES.find(t => t.toLowerCase().startsWith(prefix));
  if (!type) return null;
  return { type, num: m[2], full: type + m[2] };
}

export function shortIfaceName(name) {
  return name
    .replace(/^GigabitEthernet/, 'Gig')
    .replace(/^FastEthernet/, 'Fa')
    .replace(/^Serial/, 'Se')
    .replace(/^Ethernet/, 'Eth')
    .replace(/^Loopback/, 'Lo');
}

export function abbrevIfaceName(name) {
  return name
    .replace(/^GigabitEthernet/, 'Gi')
    .replace(/^FastEthernet/, 'Fa')
    .replace(/^Serial/, 'Se')
    .replace(/^Ethernet/, 'Et')
    .replace(/^Loopback/, 'Lo')
    .replace(/^Vlan/, 'Vl');
}

const DEFAULT_BW = { FastEthernet: 100000, GigabitEthernet: 1000000, Serial: 1544, Ethernet: 10000, Loopback: 8000000, Vlan: 100000 };

/* ========================================================================== */
/* Interfaces, cables, devices                                                */
/* ========================================================================== */

export class DeviceInterface {
  constructor(name, type = 'FastEthernet', device = null) {
    this.name = name;
    this.type = type;
    this.device = device;
    this.mac = IPUtils.generateMAC();
    this.ip = '';
    this.mask = '255.255.255.0';
    this.isUp = true;
    this.description = '';
    this.bandwidth = DEFAULT_BW[type] || 100000;
    this.duplex = 'auto';
    this.speed = 'auto';
    // Switching
    this.mode = 'access';
    this.accessVlan = 1;
    this.nativeVlan = 1;
    this.allowedVlans = 'all';
    // Virtual interfaces
    this.isVirtual = false;
    this.parentName = null; // sub-interface parent
    this.encapVlan = null; // sub-interface dot1Q tag
    this.vlanId = null; // SVI
    // Services
    this.helperAddress = '';
    this.aclIn = null;
    this.aclOut = null;
    this.clockRate = null;
    this.ospfCost = null;
    // Runtime wiring
    this.connectedCable = null;
    this.connectedRemoteInterface = null;
  }

  get isCableable() {
    return !this.isVirtual && this.type !== 'Wireless';
  }

  /** Carries Ethernet/serial frames (excludes console and RS-232 management ports). */
  get isDataPort() {
    return this.isCableable && this.type !== 'Console' && this.type !== 'RS232';
  }

  get parent() {
    return this.parentName ? this.device.getInterface(this.parentName) : null;
  }

  isVlanAllowed(vlan) {
    if (this.allowedVlans === 'all' || !this.allowedVlans) return true;
    if (this.allowedVlans === 'none') return false;
    return String(this.allowedVlans).split(',').some(part => {
      const [a, b] = part.split('-').map(x => parseInt(x, 10));
      return b ? vlan >= a && vlan <= b : vlan === a;
    });
  }

  /** Layer 1 status ("up" in show ip interface brief Status column). */
  get isLinkUp() {
    const dev = this.device;
    if (!dev || dev.isPoweredOff || !this.isUp) return false;
    if (this.type === 'Loopback') return true;
    if (this.parentName) return !!this.parent && this.parent.isLinkUp;
    if (this.vlanId != null) return dev.hasVlan(this.vlanId) && dev.interfaces.some(p =>
      p.isDataPort && p.isPhysicalUp && (p.mode === 'trunk' ? p.isVlanAllowed(this.vlanId) : p.accessVlan === this.vlanId));
    const r = this.connectedRemoteInterface;
    return !!(this.connectedCable && r && r.isUp && !r.device.isPoweredOff && this.connectedCable.isCompatible);
  }

  /** Line protocol up. */
  get isPhysicalUp() {
    return this.isLinkUp;
  }
}

function deviceClass(dev) {
  if (dev.type === 'switch' || dev.type === 'wireless_router') return 'switch';
  return 'host';
}

export class NetworkCable {
  constructor(id, type, ifaceA, ifaceB) {
    this.id = id;
    this.type = type; // straight | crossover | serial | fiber | console | phone | coaxial
    this.ifaceA = ifaceA; // for serial: DCE end
    this.ifaceB = ifaceB;
    ifaceA.connectedCable = this;
    ifaceA.connectedRemoteInterface = ifaceB;
    ifaceB.connectedCable = this;
    ifaceB.connectedRemoteInterface = ifaceA;
    if (type === 'serial' && ifaceA.type === 'Serial' && !ifaceA.clockRate) ifaceA.clockRate = 2000000;
  }

  get isCompatible() {
    const a = this.ifaceA, b = this.ifaceB;
    const serialA = a.type === 'Serial', serialB = b.type === 'Serial';
    if (this.type === 'serial') return serialA && serialB;
    if (serialA || serialB) return false;
    const mgmt = (t) => t === 'Console' || t === 'RS232';
    if (this.type === 'console') return mgmt(a.type) && mgmt(b.type) && a.type !== b.type;
    if (mgmt(a.type) || mgmt(b.type)) return false;
    if (this.type === 'phone' || this.type === 'coaxial') {
      return a.type === b.type && (a.type === 'Phone' || a.type === 'Coaxial');
    }
    if (a.type === 'Phone' || a.type === 'Coaxial' || b.type === 'Phone' || b.type === 'Coaxial') return false;
    if (this.type === 'fiber') return true;
    // Hubs/repeaters/APs are auto-MDIX in PT; switches and hosts are not.
    if (a.device.isHub || b.device.isHub) return true;
    const same = deviceClass(a.device) === deviceClass(b.device);
    return this.type === 'crossover' ? same : !same;
  }

  disconnect() {
    for (const i of [this.ifaceA, this.ifaceB]) {
      if (i) {
        i.connectedCable = null;
        i.connectedRemoteInterface = null;
      }
    }
  }
}

/** Picks the cable PT's "Automatically Choose Connection Type" would choose. */
export function autoCableType(ifA, ifB) {
  if (ifA.type === 'Console' || ifA.type === 'RS232' || ifB.type === 'Console' || ifB.type === 'RS232') return 'console';
  if (ifA.type === 'Serial' && ifB.type === 'Serial') return 'serial';
  if (ifA.type === 'Phone' && ifB.type === 'Phone') return 'phone';
  if (ifA.type === 'Coaxial' && ifB.type === 'Coaxial') return 'coaxial';
  if (ifA.device.isHub || ifB.device.isHub) return 'straight';
  return deviceClass(ifA.device) === deviceClass(ifB.device) ? 'crossover' : 'straight';
}

export class BaseDevice {
  constructor(id, name, type, model, x, y) {
    this.id = id;
    this.name = name;
    this.hostname = name;
    this.type = type;
    this.model = model;
    this.x = x;
    this.y = y;
    this.interfaces = [];
    this.arpTable = new Map(); // ip -> { mac, iface, learnedAt }
    this.isPoweredOff = false;
  }

  addIface(name, type, up = true) {
    const i = new DeviceInterface(name, type, this);
    i.isUp = up;
    this.interfaces.push(i);
    return i;
  }

  getInterface(name) {
    if (!name) return null;
    const q = String(name).toLowerCase().replace(/\s+/g, '');
    const exact = this.interfaces.find(i => i.name.toLowerCase().replace(/\s+/g, '') === q);
    if (exact) return exact;
    const ref = parseIfaceRef(name);
    if (!ref) return null;
    return this.interfaces.find(i => i.name.toLowerCase() === ref.full.toLowerCase()) || null;
  }

  hasVlan() { return false; }

  ownsIP(ip) {
    return this.interfaces.some(i => i.ip === ip && i.isPhysicalUp);
  }

  get l3Interfaces() {
    return this.interfaces.filter(i => i.ip && i.isPhysicalUp);
  }
}

export class EndDevice extends BaseDevice {
  constructor(id, name, type = 'pc', model = 'PC-PT', x = 100, y = 100) {
    super(id, name, type, model, x, y);
    this.gateway = '';
    this.dns = '0.0.0.0';
    this.ipType = 'static';
    this.ipv6Type = 'static';
    this.ipv6Gateway = '';
    this.ipv6Dns = '';
    this.addIface('FastEthernet0', 'FastEthernet', true);
    this.addIface('Bluetooth', 'Wireless', true);
    if (type === 'pc' || type === 'laptop') this.addIface('RS 232', 'RS232', true);
    if (type === 'server') {
      this.services = {
        dhcp: { enabled: false, pools: [{ name: 'serverPool', defaultGateway: '0.0.0.0', dns: '0.0.0.0', startIP: '0.0.0.0', mask: '0.0.0.0', maxUsers: 512, leases: {} }] },
        http: { enabled: true },
        dns: { enabled: false, records: [] }
      };
    }
  }

  get ip() { return this.interfaces[0].ip; }
  set ip(v) { this.interfaces[0].ip = v; }
  get mask() { return this.interfaces[0].mask; }
  set mask(v) { this.interfaces[0].mask = v; }
  get mac() { return this.interfaces[0].mac; }
}

export class WirelessRouterDevice extends BaseDevice {
  constructor(id, name, model = 'HomeRouter-PT-AC', x = 100, y = 100) {
    super(id, name, 'wireless_router', model, x, y);
    this.internetType = 'DHCP';
    this.routerIP = '192.168.0.1';
    this.subnetMask = '255.255.255.0';
    this.dhcpEnabled = true;
    this.dhcpStartIP = '100';
    this.dhcpMaxUsers = '50';
    this.dhcpLeases = {};
    this.ssid = 'Default';
    this.channel = '6 - 2.437GHz';
    this.securityMode = 'Disabled';
    this.passphrase = '';
    this.addIface('Internet', 'FastEthernet', true);
    this.addIface('LAN', 'FastEthernet', true);
    for (const n of ['Wireless 2.4G', 'Wireless 5G(1)', 'Wireless 5G(2)', 'Wireless Guest 2.4G', 'Wireless Guest 5G(1)', 'Wireless Guest 5G(2)']) {
      this.addIface(n, 'Wireless', true);
    }
    this.syncLan();
  }

  syncLan() {
    const lan = this.getInterface('LAN');
    lan.ip = this.routerIP;
    lan.mask = this.subnetMask;
  }
}

export class CloudDevice extends BaseDevice {
  constructor(id, name, model = 'Cloud-PT', x = 100, y = 100) {
    super(id, name, 'cloud', model, x, y);
    this.addIface('Ethernet6', 'Ethernet');
    this.addIface('Ethernet7', 'Ethernet');
    this.addIface('Serial0', 'Serial');
    this.addIface('Serial1', 'Serial');
    this.addIface('Modem4', 'Phone');
    this.addIface('Modem5', 'Phone');
    this.addIface('Coaxial7', 'Coaxial');
    this.addIface('Coaxial8', 'Coaxial');
    this.installedModules = ['PT-CLOUD-NM-1AM', 'PT-CLOUD-NM-1CFE', 'PT-CLOUD-NM-1CX', 'PT-CLOUD-NM-1S'];
  }
}

const SWITCH_PORTS = {
  '2960': () => [...range(1, 24).map(i => [`FastEthernet0/${i}`, 'FastEthernet']), ['GigabitEthernet0/1', 'GigabitEthernet'], ['GigabitEthernet0/2', 'GigabitEthernet']],
  '2950-24': () => range(1, 24).map(i => [`FastEthernet0/${i}`, 'FastEthernet']),
  '2950T': () => [...range(1, 24).map(i => [`FastEthernet0/${i}`, 'FastEthernet']), ['GigabitEthernet0/1', 'GigabitEthernet'], ['GigabitEthernet0/2', 'GigabitEthernet']],
  '3560-24PS': () => [...range(1, 24).map(i => [`FastEthernet0/${i}`, 'FastEthernet']), ['GigabitEthernet0/1', 'GigabitEthernet'], ['GigabitEthernet0/2', 'GigabitEthernet']],
  'Switch-PT': () => range(0, 5).map(i => [`FastEthernet${i}/1`, 'FastEthernet']),
  'Switch-Empty': () => [],
  'Hub-PT': () => range(0, 5).map(i => [`Port ${i}`, 'FastEthernet']),
  'Repeater-PT': () => range(0, 1).map(i => [`Port ${i}`, 'FastEthernet']),
  'AP': () => [['Port 0', 'FastEthernet'], ['Port 1', 'Wireless']]
};

function range(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

export class SwitchDevice extends BaseDevice {
  constructor(id, name, model = '2960', x = 100, y = 100) {
    super(id, name, 'switch', model, x, y);
    this.hostname = 'Switch';
    this.isHub = /^(Hub|Repeater|AP|LAP)/.test(model);
    this.macTable = new Map(); // `${vlan}|${mac}` -> { vlan, mac, port, learnedAt }
    this.vlans = [{ id: 1, name: 'default', status: 'active' }];
    this.defaultGateway = '';
    const spec = SWITCH_PORTS[model] || (this.isHub && /^(AP|LAP)/.test(model) ? SWITCH_PORTS.AP : SWITCH_PORTS['2960']);
    for (const [n, t] of spec()) this.addIface(n, t, true);
    if (!this.isHub) {
      this.addIface('Console', 'Console', true);
      const svi = this.addIface('Vlan1', 'Vlan', false);
      svi.isVirtual = true;
      svi.vlanId = 1;
    } else {
      this.hostname = name;
    }
  }

  hasVlan(id) {
    return this.vlans.some(v => v.id === id);
  }

  ensureVlan(id, name) {
    let v = this.vlans.find(x => x.id === id);
    if (!v) {
      v = { id, name: name || `VLAN${String(id).padStart(4, '0')}`, status: 'active' };
      this.vlans.push(v);
      this.vlans.sort((a, b) => a.id - b.id);
    } else if (name) {
      v.name = name;
    }
    return v;
  }

  ensureSVI(vlanId) {
    let svi = this.getInterface(`Vlan${vlanId}`);
    if (!svi) {
      svi = this.addIface(`Vlan${vlanId}`, 'Vlan', true);
      svi.isVirtual = true;
      svi.vlanId = vlanId;
    }
    return svi;
  }

  learnMAC(mac, portName, vlan = 1) {
    this.macTable.set(`${vlan}|${mac}`, { vlan, mac, port: portName, learnedAt: Date.now() });
  }

  get managementIface() {
    return this.interfaces.find(i => i.vlanId != null && i.ip && i.isPhysicalUp) || null;
  }
}

const ROUTER_PORTS = {
  '1941': [['GigabitEthernet0/0', 'GigabitEthernet'], ['GigabitEthernet0/1', 'GigabitEthernet'], ['Serial0/0/0', 'Serial'], ['Serial0/0/1', 'Serial']],
  '2901': [['GigabitEthernet0/0', 'GigabitEthernet'], ['GigabitEthernet0/1', 'GigabitEthernet'], ['Serial0/0/0', 'Serial'], ['Serial0/0/1', 'Serial']],
  '2911': [['GigabitEthernet0/0', 'GigabitEthernet'], ['GigabitEthernet0/1', 'GigabitEthernet'], ['GigabitEthernet0/2', 'GigabitEthernet'], ['Serial0/0/0', 'Serial'], ['Serial0/0/1', 'Serial']],
  '4321': [['GigabitEthernet0/0/0', 'GigabitEthernet'], ['GigabitEthernet0/0/1', 'GigabitEthernet'], ['Serial0/1/0', 'Serial'], ['Serial0/1/1', 'Serial']],
  '4331': [['GigabitEthernet0/0/0', 'GigabitEthernet'], ['GigabitEthernet0/0/1', 'GigabitEthernet'], ['GigabitEthernet0/0/2', 'GigabitEthernet'], ['Serial0/1/0', 'Serial'], ['Serial0/1/1', 'Serial']],
  '2811': [['FastEthernet0/0', 'FastEthernet'], ['FastEthernet0/1', 'FastEthernet'], ['Serial0/0/0', 'Serial'], ['Serial0/0/1', 'Serial']],
  '2620XM': [['FastEthernet0/0', 'FastEthernet'], ['Serial0/0', 'Serial']],
  '2621XM': [['FastEthernet0/0', 'FastEthernet'], ['FastEthernet0/1', 'FastEthernet'], ['Serial0/0', 'Serial'], ['Serial0/1', 'Serial']],
  'Router-PT': [['FastEthernet0/0', 'FastEthernet'], ['FastEthernet1/0', 'FastEthernet'], ['Serial2/0', 'Serial'], ['Serial3/0', 'Serial'], ['FastEthernet4/0', 'FastEthernet'], ['FastEthernet5/0', 'FastEthernet']],
  'Router-Empty': []
};

export class RouterDevice extends BaseDevice {
  constructor(id, name, model = '2911', x = 100, y = 100) {
    super(id, name, 'router', model, x, y);
    this.hostname = 'Router';
    this.routingTable = []; // static routes: { destination, mask, nextHop, interfaceName, ad }
    this.ripNetworks = [];
    this.ripVersion = 1;
    this.ripAutoSummary = true;
    this.ripEnabled = false;
    this.ripDefaultOriginate = false;
    this.ospf = null; // { processId, routerId, networks: [{ network, wildcard, area }], defaultOriginate }
    this.dhcpPools = []; // { name, network, mask, defaultRouter, dns, leases: { mac: ip } }
    this.dhcpExcluded = []; // { start, end }
    this.acls = {}; // number -> [{ action, proto, src, srcWc, dst, dstWc }]
    for (const [n, t] of (ROUTER_PORTS[model] || ROUTER_PORTS['2911'])) this.addIface(n, t, false);
    this.addIface('Console', 'Console', true);
  }

  addRoute(destination, mask, nextHop, interfaceName = null, ad = 1) {
    const exists = this.routingTable.find(r => r.destination === destination && r.mask === mask && r.nextHop === nextHop && (r.interfaceName || null) === (interfaceName || null));
    if (!exists) this.routingTable.push({ destination, mask, nextHop, interfaceName, ad });
  }

  createSubinterface(name) {
    const ref = parseIfaceRef(name);
    if (!ref || !ref.num.includes('.')) return null;
    const parentName = ref.type + ref.num.split('.')[0];
    const parent = this.getInterface(parentName);
    if (!parent || parent.isVirtual) return null;
    let sub = this.getInterface(ref.full);
    if (!sub) {
      sub = this.addIface(ref.full, parent.type, true);
      sub.isVirtual = true;
      sub.parentName = parent.name;
      sub.mac = parent.mac;
    }
    return sub;
  }

  createLoopback(num) {
    let lo = this.getInterface(`Loopback${num}`);
    if (!lo) {
      lo = this.addIface(`Loopback${num}`, 'Loopback', true);
      lo.isVirtual = true;
    }
    return lo;
  }

  /** Builds the full RIB (connected + local + static + dynamic) choosing the lowest AD per prefix. */
  getRoutes(topology) {
    const routes = [];
    for (const i of this.interfaces) {
      if (i.ip && i.isPhysicalUp) {
        routes.push({ code: 'C', network: IPUtils.networkOf(i.ip, i.mask), mask: i.mask, ad: 0, metric: 0, iface: i.name });
        routes.push({ code: 'L', network: i.ip, mask: '255.255.255.255', ad: 0, metric: 0, iface: i.name });
      }
    }
    const connected = routes.slice();
    for (const s of this.routingTable) {
      const ad = s.ad || 1;
      const isDefault = s.destination === '0.0.0.0' && s.mask === '0.0.0.0';
      const code = isDefault ? 'S*' : 'S';
      if (s.interfaceName) {
        const i = this.getInterface(s.interfaceName);
        if (i && i.isPhysicalUp) routes.push({ code, network: s.destination, mask: s.mask, ad, metric: 0, iface: i.name, nextHop: s.nextHop && IPUtils.isValidIP(s.nextHop) ? s.nextHop : null, static: true });
      } else if (s.nextHop) {
        const via = connected.find(r => r.code === 'C' && IPUtils.inNetwork(s.nextHop, r.network, r.mask));
        const viaDyn = !via && topology ? topology.getDynamicRoutes(this).find(r => IPUtils.inNetwork(s.nextHop, r.network, r.mask)) : null;
        if (via || viaDyn) routes.push({ code, network: s.destination, mask: s.mask, ad, metric: 0, nextHop: s.nextHop, static: true });
      }
    }
    if (topology) routes.push(...topology.getDynamicRoutes(this));

    // Lowest AD wins per prefix
    const best = new Map();
    for (const r of routes) {
      const key = `${r.network}/${r.mask}|${r.code === 'L' ? 'L' : ''}`;
      const cur = best.get(key);
      if (!cur || r.ad < cur.ad || (r.ad === cur.ad && r.metric < cur.metric)) best.set(key, r);
    }
    return [...best.values()];
  }

  /** Longest prefix match. Returns { iface, nextHop, route } or null. */
  lookupRoute(dstIP, topology, depth = 0) {
    const routes = this.getRoutes(topology).filter(r => r.code !== 'L' && IPUtils.inNetwork(dstIP, r.network, r.mask));
    if (!routes.length) return null;
    routes.sort((a, b) => IPUtils.maskToPrefix(b.mask) - IPUtils.maskToPrefix(a.mask) || a.ad - b.ad);
    const r = routes[0];
    if (r.iface) {
      const iface = this.getInterface(r.iface);
      return { iface, nextHop: r.nextHop || dstIP, route: r };
    }
    if (r.nextHop && depth < 4) {
      const inner = this.lookupRoute(r.nextHop, topology, depth + 1);
      if (inner) return { iface: inner.iface, nextHop: inner.route.code === 'C' ? r.nextHop : inner.nextHop, route: r };
    }
    return null;
  }

  get defaultRoute() {
    return this.routingTable.find(r => r.destination === '0.0.0.0' && r.mask === '0.0.0.0');
  }
}

/* ========================================================================== */
/* ACL evaluation                                                             */
/* ========================================================================== */

export function aclPermits(rules, pkt) {
  if (!rules || !rules.length) return true;
  for (const r of rules) {
    if (r.remark) continue;
    if (!matchAddr(pkt.src, r.src, r.srcWc)) continue;
    if (r.extended) {
      if (!matchAddr(pkt.dst, r.dst, r.dstWc)) continue;
      if (r.proto !== 'ip' && r.proto !== pkt.proto) continue;
    }
    r.matches = (r.matches || 0) + 1;
    return r.action === 'permit';
  }
  return false; // implicit deny
}

function matchAddr(ip, addr, wc) {
  if (addr === 'any') return true;
  return IPUtils.wildcardMatch(ip, addr, wc || '0.0.0.0');
}

/* ========================================================================== */
/* Topology                                                                   */
/* ========================================================================== */

const COLORS = { ICMP: '#d946ef', 'ICMP Reply': '#16a34a', ARP: '#eab308', DHCP: '#0ea5e9', TTL: '#f97316' };

export class NetworkTopology {
  constructor() {
    this.devices = new Map();
    this.cables = [];
    this.nextId = 1;
    this.eventLog = [];
    this.pduList = [];
    this.activeSimEvents = [];
    this.isSimulationMode = false;
    this.simSpeed = 1.0;
    this.simPlaying = false;
    this.simEventList = [];
    this.simClock = 0;
    this.simFilters = { ICMP: true, ARP: true, DHCP: true };
    this._stepWaiters = [];
    this.listeners = new Set();
    this.version = 0;
    this._dynCache = null;
  }

  on(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(name, data) {
    if (name === 'topology-changed') {
      this.version++;
      this._dynCache = null;
    }
    for (const cb of this.listeners) cb(name, data);
  }

  /* ----------------------------- Devices ---------------------------------- */

  _buildDevice(type, name, model, x, y, id) {
    if (type === 'wireless_router' || model === 'HomeRouter-PT-AC' || model === 'HomeRouter' || model === 'WRT300N') {
      return new WirelessRouterDevice(id, name || `Wireless Router${this.countType('wireless_router')}`, model || 'HomeRouter-PT-AC', x, y);
    }
    if (type === 'cloud' || model === 'Cloud-PT' || model === 'Cloud-Empty') {
      return new CloudDevice(id, name || `Cloud${this.countType('cloud')}`, model || 'Cloud-PT', x, y);
    }
    if (type === 'router') return new RouterDevice(id, name || `Router${this.countType('router')}`, model || '2911', x, y);
    if (type === 'switch') {
      const m = model || '2960';
      const base = /^Hub/.test(m) ? 'Hub' : /^Repeater/.test(m) ? 'Repeater' : /^(AP|LAP)/.test(m) ? 'Access Point' : 'Switch';
      const count = [...this.devices.values()].filter(d => d.type === 'switch' && d.name.startsWith(base)).length;
      return new SwitchDevice(id, name || `${base}${count}`, m, x, y);
    }
    if (type === 'laptop') return new EndDevice(id, name || `Laptop${this.countType('laptop')}`, 'laptop', model || 'Laptop-PT', x, y);
    if (type === 'server') return new EndDevice(id, name || `Server${this.countType('server')}`, 'server', model || 'Server-PT', x, y);
    if (type === 'printer') return new EndDevice(id, name || `Printer${this.countType('printer')}`, 'printer', model || 'Printer-PT', x, y);
    return new EndDevice(id, name || `PC${this.countType('pc')}`, type || 'pc', model || 'PC-PT', x, y);
  }

  addDevice(type, name = null, model = null, x = 200, y = 200) {
    const id = 'dev_' + (this.nextId++);
    const dev = this._buildDevice(type, name, model, x, y, id);
    this.devices.set(id, dev);
    this.emit('topology-changed');
    return dev;
  }

  countType(type) {
    let count = 0;
    for (const d of this.devices.values()) if (d.type === type) count++;
    return count;
  }

  removeDevice(id) {
    const dev = this.devices.get(id);
    if (!dev) return;
    for (const c of this.cables.filter(c => c.ifaceA.device.id === id || c.ifaceB.device.id === id)) this.removeCable(c.id, true);
    this.devices.delete(id);
    this.emit('topology-changed');
  }

  connect(devAId, ifaceAName, devBId, ifaceBName, cableType = 'straight') {
    const devA = this.devices.get(devAId);
    const devB = this.devices.get(devBId);
    if (!devA || !devB || devAId === devBId) return null;
    const ifA = devA.getInterface(ifaceAName);
    const ifB = devB.getInterface(ifaceBName);
    if (!ifA || !ifB || !ifA.isCableable || !ifB.isCableable) return null;
    if (ifA.connectedCable || ifB.connectedCable) return null;
    if (cableType === 'auto') cableType = autoCableType(ifA, ifB);
    const cable = new NetworkCable('cable_' + (this.nextId++), cableType, ifA, ifB);
    this.cables.push(cable);
    this.emit('topology-changed');
    return cable;
  }

  removeCable(cableId, silent = false) {
    const idx = this.cables.findIndex(c => c.id === cableId);
    if (idx === -1) return;
    const cable = this.cables[idx];
    for (const i of [cable.ifaceA, cable.ifaceB]) this._flushPort(i);
    cable.disconnect();
    this.cables.splice(idx, 1);
    if (!silent) this.emit('topology-changed');
  }

  _flushPort(iface) {
    const dev = iface.device;
    if (dev.macTable) for (const [k, v] of dev.macTable) if (v.port === iface.name) dev.macTable.delete(k);
    for (const [k, v] of dev.arpTable) if (v.iface === iface.name) dev.arpTable.delete(k);
  }

  log(devName, protocol, detail, status = 'info') {
    const entry = { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), device: devName, protocol, detail, status };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 100) this.eventLog.pop();
    this.emit('log', entry);
  }

  getDeviceByIP(ip) {
    for (const dev of this.devices.values()) {
      if (dev.interfaces.some(i => i.ip === ip && i.isPhysicalUp)) return dev;
    }
    return null;
  }

  /* ----------------------------- Layer 2 ---------------------------------- */

  /**
   * Explores the broadcast domain reached by sending a frame out of `egress`.
   * Returns [{ iface, path }] for every Layer 3 endpoint reached, where path is
   * a list of hops { cable, from, to, fromIface, toIface, vlan }.
   */
  _l2Explore(egress) {
    const results = [];
    const visited = new Set();
    const dev = egress.device;
    if (!egress.isPhysicalUp) return results;

    const queue = [];
    const sendOut = (port, tag, path) => {
      if (!port.isPhysicalUp) return;
      const remote = port.connectedRemoteInterface;
      const hop = { cable: port.connectedCable, from: port.device, to: remote.device, fromIface: port, toIface: remote, vlan: tag };
      queue.push({ dev: remote.device, inIf: remote, tag, path: [...path, hop] });
    };

    if (egress.vlanId != null) {
      // Switch SVI: frame enters the switch fabric in that VLAN
      this._switchFlood(dev, null, egress.vlanId, [], visited, results, sendOut, egress);
    } else if (egress.parentName) {
      sendOut(egress.parent, egress.encapVlan, []);
    } else {
      sendOut(egress, null, []);
    }

    while (queue.length) {
      const { dev: d, inIf, tag, path } = queue.shift();
      if (d.type === 'switch' && !d.isHub) {
        let vlan;
        if (inIf.mode === 'trunk') {
          vlan = tag == null ? inIf.nativeVlan : tag;
          if (!inIf.isVlanAllowed(vlan)) continue;
        } else {
          if (tag != null && tag !== inIf.accessVlan) continue;
          vlan = inIf.accessVlan;
        }
        if (!d.hasVlan(vlan)) continue;
        this._switchFlood(d, inIf, vlan, path, visited, results, sendOut, null);
      } else if (d.isHub) {
        const key = d.id;
        if (visited.has(key)) continue;
        visited.add(key);
        for (const p of d.interfaces) if (p !== inIf && p.isDataPort) sendOut(p, tag, path);
      } else if (d.type === 'wireless_router') {
        if (inIf.name === 'LAN' && tag == null) {
          d.syncLan();
          results.push({ iface: inIf, path });
        } else if (inIf.ip && tag == null) {
          results.push({ iface: inIf, path });
        }
      } else {
        // Router / end device: terminates the broadcast domain
        let target = null;
        if (tag == null) {
          target = inIf;
        } else if (d.type === 'router') {
          target = d.interfaces.find(s => s.parentName === inIf.name && s.encapVlan === tag && s.isUp) || null;
        }
        if (target) results.push({ iface: target, path });
      }
    }
    return results;
  }

  _switchFlood(sw, inIf, vlan, path, visited, results, sendOut, originSvi) {
    const key = `${sw.id}|${vlan}`;
    if (visited.has(key)) return;
    visited.add(key);
    const svi = sw.interfaces.find(i => i.vlanId === vlan && i.isUp);
    if (svi && svi !== originSvi && svi.ip) results.push({ iface: svi, path });
    for (const p of sw.interfaces) {
      if (p === inIf || !p.isDataPort) continue;
      if (p.mode === 'trunk') {
        if (p.isVlanAllowed(vlan)) sendOut(p, vlan === p.nativeVlan ? null : vlan, path);
      } else if (p.accessVlan === vlan) {
        sendOut(p, null, path);
      }
    }
  }

  _learnAlongPath(path, srcMac, dstMac) {
    for (let k = 0; k < path.length; k++) {
      const hop = path[k];
      const sw = hop.to;
      if (sw.type === 'switch' && !sw.isHub && hop.toIface) {
        const vlan = hop.toIface.mode === 'trunk' ? (hop.vlan == null ? hop.toIface.nativeVlan : hop.vlan) : hop.toIface.accessVlan;
        sw.learnMAC(srcMac, hop.toIface.name, vlan);
        const next = path[k + 1];
        if (next && dstMac) sw.learnMAC(dstMac, next.fromIface.name, vlan);
      }
    }
  }

  /**
   * ARP: resolves `targetIP` out of `egress`. Returns { iface, path, miss } or null.
   * Populates ARP caches on both ends and switch MAC tables along the way.
   */
  _arpResolve(egress, targetIP, anim) {
    const dev = egress.device;
    const cached = dev.arpTable.get(targetIP);
    const found = this._l2Explore(egress).find(e => e.iface.ip === targetIP && e.iface.isPhysicalUp && !e.iface.device.isPoweredOff);
    if (!found) {
      if (anim) anim.push({ type: 'ARP', hops: this._firstBranch(egress), info: { arpTarget: targetIP, srcIP: egress.ip, srcMac: egress.mac, dstMac: 'FFFF.FFFF.FFFF' } });
      return null;
    }
    const miss = !cached || cached.mac !== found.iface.mac;
    if (miss && anim) {
      anim.push({ type: 'ARP', hops: found.path, info: { arpTarget: targetIP, srcIP: egress.ip, dstIP: targetIP, srcMac: egress.mac, dstMac: 'FFFF.FFFF.FFFF' } });
      anim.push({ type: 'ARP', hops: reversePath(found.path), info: { arpReply: true, srcIP: targetIP, dstIP: egress.ip, srcMac: found.iface.mac, dstMac: egress.mac } });
    }
    dev.arpTable.set(targetIP, { mac: found.iface.mac, iface: egress.name, learnedAt: Date.now() });
    if (egress.ip) found.iface.device.arpTable.set(egress.ip, { mac: egress.mac, iface: found.iface.name, learnedAt: Date.now() });
    this._learnAlongPath(found.path, egress.mac, found.iface.mac);
    return { iface: found.iface, path: found.path, miss };
  }

  _firstBranch(egress) {
    const port = egress.parentName ? egress.parent : egress;
    if (!port || !port.isPhysicalUp || egress.vlanId != null) return [];
    const r = port.connectedRemoteInterface;
    return [{ cable: port.connectedCable, from: port.device, to: r.device, fromIface: port, toIface: r }];
  }

  /* ----------------------------- Layer 3 ---------------------------------- */

  /** Source interface + next hop selection for a locally originated packet. */
  _egressFor(dev, dstIP) {
    if (dev.type === 'router') {
      const r = dev.lookupRoute(dstIP, this);
      return r ? { iface: r.iface, nextHop: r.nextHop } : null;
    }
    if (dev.type === 'switch') {
      const m = dev.managementIface;
      if (!m) return null;
      if (IPUtils.isSameSubnet(m.ip, dstIP, m.mask)) return { iface: m, nextHop: dstIP };
      return dev.defaultGateway ? { iface: m, nextHop: dev.defaultGateway } : null;
    }
    if (dev.type === 'wireless_router') {
      dev.syncLan();
      const lan = dev.getInterface('LAN');
      return IPUtils.isSameSubnet(lan.ip, dstIP, lan.mask) ? { iface: lan, nextHop: dstIP } : null;
    }
    const i = dev.interfaces[0];
    if (!i || !i.ip || !i.isPhysicalUp) return null;
    if (IPUtils.isSameSubnet(i.ip, dstIP, i.mask)) return { iface: i, nextHop: dstIP };
    if (dev.gateway && IPUtils.isValidIP(dev.gateway)) return { iface: i, nextHop: dev.gateway };
    return null;
  }

  sourceIPFor(dev, dstIP) {
    const e = this._egressFor(dev, dstIP);
    return e && e.iface.ip ? e.iface.ip : null;
  }

  /**
   * Routes a single IP packet hop by hop.
   * Returns { status: 'delivered'|'unreachable'|'timeout'|'ttl', at, replyFrom, ttlLeft, routerArpMiss, routers }.
   */
  _routePacket(srcDev, srcIP, dstIP, ttl, proto, anim, kind = 'ICMP') {
    let cur = srcDev;
    let inIface = null;
    let routerArpMiss = false;
    let routers = 0;
    for (let guard = 0; guard < 64; guard++) {
      if (cur.ownsIP(dstIP)) return { status: 'delivered', at: cur, ttlLeft: ttl, routerArpMiss, routers };

      let egress;
      if (cur === srcDev) {
        egress = this._egressFor(cur, dstIP);
        if (!egress) return { status: cur.type === 'router' ? 'timeout' : 'timeout', at: cur, routerArpMiss, routers, reason: 'no-route' };
      } else {
        // Transit router
        const r = cur.lookupRoute(dstIP, this);
        if (!r) return { status: 'unreachable', at: cur, replyFrom: inIface.ip, routerArpMiss, routers };
        egress = { iface: r.iface, nextHop: r.nextHop };
      }

      if (cur.type === 'router' && egress.iface.aclOut != null) {
        if (!aclPermits(cur.acls[egress.iface.aclOut], { src: srcIP, dst: dstIP, proto })) {
          return { status: 'unreachable', at: cur, replyFrom: (inIface || egress.iface).ip, routerArpMiss, routers, acl: true };
        }
      }

      const arp = this._arpResolve(egress.iface, egress.nextHop, anim);
      if (!arp) return { status: 'timeout', at: cur, routerArpMiss, routers, reason: 'arp' };
      if (arp.miss && cur.type === 'router') routerArpMiss = true;

      if (anim) {
        anim.push({ type: kind, hops: arp.path, info: { srcIP, dstIP, ttl, srcMac: egress.iface.mac, dstMac: arp.iface.mac, proto } });
      }

      const next = arp.iface.device;
      const nextIn = arp.iface;
      if (next.type === 'router') {
        if (nextIn.aclIn != null && !aclPermits(next.acls[nextIn.aclIn], { src: srcIP, dst: dstIP, proto })) {
          return { status: 'unreachable', at: next, replyFrom: nextIn.ip, routerArpMiss, routers, acl: true };
        }
        if (!next.ownsIP(dstIP)) {
          ttl -= 1;
          routers++;
          if (ttl <= 0) return { status: 'ttl', at: next, replyFrom: nextIn.ip, routerArpMiss, routers };
        }
      } else if (!next.ownsIP(dstIP)) {
        return { status: 'timeout', at: next, routerArpMiss, routers, reason: 'not-for-me' };
      }
      cur = next;
      inIface = nextIn;
    }
    return { status: 'timeout', at: cur, routerArpMiss, routers };
  }

  /** Sends one ICMP echo and its reply. */
  echo(srcDev, dstIP, { ttl = srcDev.type === 'router' ? 255 : 128, anim = [] } = {}) {
    const srcIP = this.sourceIPFor(srcDev, dstIP);
    if (!srcIP) return { result: 'timeout', anim };
    const fwd = this._routePacket(srcDev, srcIP, dstIP, ttl, 'icmp', anim, 'ICMP');
    if (fwd.status === 'delivered') {
      const replier = fwd.at;
      const replyTTL = replier.type === 'router' ? 255 : 128;
      const back = this._routePacket(replier, dstIP, srcIP, replyTTL, 'icmp', anim, 'ICMP Reply');
      if (back.status !== 'delivered') return { result: 'timeout', anim };
      if (fwd.routerArpMiss || back.routerArpMiss) return { result: 'timeout', anim, arpLoss: true };
      return { result: 'reply', ttl: back.ttlLeft, from: dstIP, anim };
    }
    if (fwd.status === 'unreachable' || fwd.status === 'ttl') {
      const router = fwd.at;
      const from = fwd.replyFrom || this.sourceIPFor(router, srcIP);
      const back = this._routePacket(router, from, srcIP, 255, 'icmp', anim, 'ICMP Reply');
      if (back.status !== 'delivered') return { result: 'timeout', anim };
      if (fwd.routerArpMiss) return { result: 'timeout', anim, arpLoss: true };
      return { result: fwd.status === 'ttl' ? 'ttl' : 'unreachable', from, anim };
    }
    return { result: 'timeout', anim };
  }

  /* --------------------------- Dynamic routing ---------------------------- */

  getDynamicRoutes(router) {
    if (!this._dynCache) this._dynCache = this._computeDynamicRoutes();
    return this._dynCache.get(router.id) || [];
  }

  _ripIfaces(r) {
    if (!r.ripEnabled && !(r.ripNetworks && r.ripNetworks.length)) return [];
    const nets = (r.ripNetworks || []).map(n => IPUtils.classfulNetwork(n));
    return r.interfaces.filter(i => i.ip && i.isPhysicalUp && nets.includes(IPUtils.classfulNetwork(i.ip)));
  }

  _ospfIfaces(r) {
    if (!r.ospf) return [];
    return r.interfaces.filter(i => i.ip && i.isPhysicalUp && r.ospf.networks.some(n => IPUtils.wildcardMatch(i.ip, n.network, n.wildcard)));
  }

  _ospfCost(i) {
    if (i.ospfCost) return i.ospfCost;
    return Math.max(1, Math.floor(100000 / (i.bandwidth || 100000)));
  }

  /** Neighbours of router `r` for protocol (rip|ospf): [{ router, outIface, nbrIface }]. */
  getNeighbors(r, proto) {
    const ifaces = proto === 'rip' ? this._ripIfaces(r) : this._ospfIfaces(r);
    const out = [];
    for (const i of ifaces) {
      if (proto === 'rip' && (r.ripPassive || []).includes(i.name)) continue;
      if (proto === 'ospf' && (r.ospf.passive || []).includes(i.name)) continue;
      for (const ep of this._l2Explore(i)) {
        const n = ep.iface;
        const nd = n.device;
        if (nd === r || nd.type !== 'router' || !IPUtils.isSameSubnet(i.ip, n.ip, i.mask)) continue;
        const nIfaces = proto === 'rip' ? this._ripIfaces(nd) : this._ospfIfaces(nd);
        if (!nIfaces.includes(n)) continue;
        if (proto === 'rip' && (nd.ripPassive || []).includes(n.name)) continue;
        if (proto === 'ospf' && (nd.ospf.passive || []).includes(n.name)) continue;
        if (proto === 'ospf') {
          const a1 = r.ospf.networks.find(x => IPUtils.wildcardMatch(i.ip, x.network, x.wildcard));
          const a2 = nd.ospf.networks.find(x => IPUtils.wildcardMatch(n.ip, x.network, x.wildcard));
          if (!a1 || !a2 || String(a1.area) !== String(a2.area)) continue;
        }
        out.push({ router: nd, outIface: i, nbrIface: n });
      }
    }
    return out;
  }

  ospfRouterId(r) {
    if (!r.ospf) return null;
    if (r.ospf.routerId) return r.ospf.routerId;
    const los = r.interfaces.filter(i => i.type === 'Loopback' && i.ip && i.isPhysicalUp).map(i => i.ip);
    const pool = los.length ? los : r.interfaces.filter(i => i.ip && i.isPhysicalUp).map(i => i.ip);
    if (!pool.length) return '0.0.0.0';
    return pool.sort((a, b) => IPUtils.parseIP(b) - IPUtils.parseIP(a))[0];
  }

  _computeDynamicRoutes() {
    const result = new Map();
    const routers = [...this.devices.values()].filter(d => d.type === 'router' && !d.isPoweredOff);
    for (const proto of ['rip', 'ospf']) {
      const adj = new Map();
      for (const r of routers) adj.set(r.id, this.getNeighbors(r, proto));
      const advertised = new Map();
      for (const r of routers) {
        const ifs = proto === 'rip' ? this._ripIfaces(r) : this._ospfIfaces(r);
        const nets = ifs.map(i => ({ network: IPUtils.networkOf(i.ip, i.mask), mask: i.mask, cost: proto === 'ospf' ? this._ospfCost(i) : 0 }));
        const originate = proto === 'rip' ? r.ripDefaultOriginate : r.ospf && r.ospf.defaultOriginate;
        if (originate && r.defaultRoute && ifs.length) nets.push({ network: '0.0.0.0', mask: '0.0.0.0', cost: 1, external: true });
        advertised.set(r.id, nets);
      }

      for (const r of routers) {
        if (!adj.get(r.id).length) continue;
        // Dijkstra from r
        const dist = new Map([[r.id, 0]]);
        const first = new Map();
        const done = new Set();
        while (true) {
          let u = null, best = Infinity;
          for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; u = id; }
          if (u == null) break;
          done.add(u);
          for (const e of adj.get(u) || []) {
            const w = proto === 'rip' ? 1 : this._ospfCost(e.outIface);
            const nd = best + w;
            if (!dist.has(e.router.id) || nd < dist.get(e.router.id)) {
              dist.set(e.router.id, nd);
              first.set(e.router.id, u === r.id ? e : first.get(u));
            }
          }
        }
        const connected = r.interfaces.filter(i => i.ip && i.isPhysicalUp).map(i => `${IPUtils.networkOf(i.ip, i.mask)}/${i.mask}`);
        const chosen = new Map();
        for (const [id, d] of dist) {
          if (id === r.id) continue;
          for (const n of advertised.get(id) || []) {
            const key = `${n.network}/${n.mask}`;
            if (connected.includes(key)) continue;
            const metric = proto === 'rip' ? d : d + (n.external ? 20 - d : n.cost);
            if (proto === 'rip' && metric > 15) continue;
            const cur = chosen.get(key);
            if (!cur || metric < cur.metric) chosen.set(key, { ...n, metric, via: first.get(id) });
          }
        }
        const list = result.get(r.id) || [];
        for (const c of chosen.values()) {
          const isDefault = c.network === '0.0.0.0';
          const code = proto === 'rip' ? (isDefault ? 'R*' : 'R') : (isDefault ? 'O*E2' : 'O');
          list.push({ code, network: c.network, mask: c.mask, ad: proto === 'rip' ? 120 : 110, metric: c.metric, nextHop: c.via.nbrIface.ip, iface: c.via.outIface.name, dynamic: true });
        }
        result.set(r.id, list);
      }
    }
    return result;
  }

  /* ------------------------------- DHCP ----------------------------------- */

  /** DHCP DORA from an end device. Returns lease or null (and animates in sim mode). */
  async requestDHCP(dev) {
    const iface = dev.interfaces[0];
    const anim = [];
    const lease = this._dhcpLookup(dev, iface, anim);
    await this._animate(anim, 'DHCP');
    if (lease) {
      iface.ip = lease.ip;
      iface.mask = lease.mask;
      dev.gateway = lease.gateway || '';
      dev.dns = lease.dns || '0.0.0.0';
      dev.arpTable.clear();
      this.log(dev.name, 'DHCP', `Lease ${lease.ip}/${IPUtils.maskToPrefix(lease.mask)} from ${lease.server}`, 'success');
    }
    this.emit('topology-changed');
    return lease;
  }

  _dhcpLookup(dev, iface, anim) {
    if (!iface.isPhysicalUp) return null;
    const mac = iface.mac;
    const endpoints = this._l2Explore(iface);
    for (const ep of endpoints) {
      const e = ep.iface;
      const d = e.device;
      let lease = null;
      if (d.type === 'router' && e.ip) {
        lease = this._allocRouterPool(d, e, mac);
        if (!lease && e.helperAddress) {
          const res = this._routePacket(d, e.ip, e.helperAddress, 255, 'udp', null);
          if (res.status === 'delivered' && res.at.services && res.at.services.dhcp.enabled) {
            lease = this._allocServerPool(res.at, mac, e);
            if (lease) lease.gateway = lease.gateway === '0.0.0.0' ? e.ip : lease.gateway;
          }
        }
      } else if (d.services && d.services.dhcp && d.services.dhcp.enabled) {
        lease = this._allocServerPool(d, mac, null);
      } else if (d.type === 'wireless_router' && d.dhcpEnabled && e.name === 'LAN') {
        lease = this._allocHomeRouter(d, mac);
      }
      if (lease) {
        this._learnAlongPath(ep.path, mac, e.mac);
        anim.push({ type: 'DHCP', hops: ep.path, info: { srcIP: '0.0.0.0', dstIP: '255.255.255.255', srcMac: mac, dstMac: 'FFFF.FFFF.FFFF', dhcp: 'DISCOVER' } });
        anim.push({ type: 'DHCP', hops: reversePath(ep.path), info: { srcIP: e.ip, dstIP: lease.ip, srcMac: e.mac, dstMac: mac, dhcp: 'OFFER' } });
        return lease;
      }
    }
    const first = this._firstBranch(iface);
    if (first.length) anim.push({ type: 'DHCP', hops: first, info: { srcIP: '0.0.0.0', dstIP: '255.255.255.255', srcMac: mac, dstMac: 'FFFF.FFFF.FFFF', dhcp: 'DISCOVER' } });
    return null;
  }

  _ipInUse(ip) {
    for (const d of this.devices.values()) if (d.interfaces.some(i => i.ip === ip)) return true;
    return false;
  }

  _allocRouterPool(router, recvIface, mac) {
    const pool = router.dhcpPools.find(p => p.network && p.mask && IPUtils.inNetwork(recvIface.ip, p.network, p.mask));
    if (!pool) return null;
    pool.leases = pool.leases || {};
    const mk = (ip) => ({ ip, mask: pool.mask, gateway: pool.defaultRouter || '', dns: pool.dns || '0.0.0.0', server: recvIface.ip });
    if (pool.leases[mac]) return mk(pool.leases[mac]);
    const net = IPUtils.parseIP(pool.network);
    const size = (~IPUtils.parseIP(pool.mask)) >>> 0;
    const leased = new Set(Object.values(pool.leases));
    for (let h = 1; h < size; h++) {
      const ip = IPUtils.formatIP((net + h) >>> 0);
      if (leased.has(ip) || this._ipInUse(ip)) continue;
      if (router.dhcpExcluded.some(x => IPUtils.parseIP(ip) >= IPUtils.parseIP(x.start) && IPUtils.parseIP(ip) <= IPUtils.parseIP(x.end || x.start))) continue;
      pool.leases[mac] = ip;
      return mk(ip);
    }
    return null;
  }

  _allocServerPool(server, mac, relayIface) {
    const pools = server.services.dhcp.pools;
    const pool = (relayIface && pools.find(p => p.startIP && IPUtils.isSameSubnet(p.startIP, relayIface.ip, p.mask))) ||
      pools.find(p => p.startIP && server.ip && IPUtils.isSameSubnet(p.startIP, server.ip, p.mask)) || pools[0];
    if (!pool || !IPUtils.isValidIP(pool.startIP) || pool.startIP === '0.0.0.0') return null;
    pool.leases = pool.leases || {};
    const mk = (ip) => ({ ip, mask: pool.mask, gateway: pool.defaultGateway, dns: pool.dns, server: server.ip });
    if (pool.leases[mac]) return mk(pool.leases[mac]);
    const start = IPUtils.parseIP(pool.startIP);
    const leased = new Set(Object.values(pool.leases));
    for (let h = 0; h < (parseInt(pool.maxUsers, 10) || 256); h++) {
      const ip = IPUtils.formatIP((start + h) >>> 0);
      if (leased.has(ip) || this._ipInUse(ip)) continue;
      pool.leases[mac] = ip;
      return mk(ip);
    }
    return null;
  }

  _allocHomeRouter(wr, mac) {
    wr.syncLan();
    wr.dhcpLeases = wr.dhcpLeases || {};
    const mk = (ip) => ({ ip, mask: wr.subnetMask, gateway: wr.routerIP, dns: wr.routerIP, server: wr.routerIP });
    if (wr.dhcpLeases[mac]) return mk(wr.dhcpLeases[mac]);
    const base = IPUtils.parseIP(IPUtils.networkOf(wr.routerIP, wr.subnetMask));
    const start = parseInt(wr.dhcpStartIP, 10) || 100;
    const leased = new Set(Object.values(wr.dhcpLeases));
    for (let h = 0; h < (parseInt(wr.dhcpMaxUsers, 10) || 50); h++) {
      const ip = IPUtils.formatIP((base + start + h) >>> 0);
      if (leased.has(ip) || this._ipInUse(ip)) continue;
      wr.dhcpLeases[mac] = ip;
      return mk(ip);
    }
    return null;
  }

  /* --------------------------- Ping / trace API --------------------------- */

  /**
   * Async ping used by both PC prompt and IOS. Calls onResult(i, res) per echo.
   */
  async ping(srcDev, dstIP, count, onResult, opts = {}) {
    const results = [];
    for (let n = 0; n < count; n++) {
      if (opts.signal && opts.signal.aborted) break;
      const res = this.echo(srcDev, dstIP);
      await this._animate(res.anim, 'ICMP');
      results.push(res);
      if (onResult) await onResult(n, res);
    }
    return results;
  }

  async traceroute(srcDev, dstIP, onHop, maxHops = 30) {
    for (let ttl = 1; ttl <= maxHops; ttl++) {
      const probes = [];
      for (let p = 0; p < 3; p++) {
        const res = this.echo(srcDev, dstIP, { ttl });
        if (p === 0) await this._animate(res.anim, 'ICMP');
        probes.push(res);
      }
      const ok = probes.find(r => r.result !== 'timeout');
      onHop(ttl, probes, ok ? ok.from : null);
      if (ok && (ok.result === 'reply' || ok.result === 'unreachable')) return true;
      if (!ok && ttl >= 4 && probes.every(r => r.result === 'timeout')) {
        // Keep going like Windows does but stop early once clearly black-holed
        if (ttl >= 6) return false;
      }
    }
    return false;
  }

  /** Simple PDU: a single ICMP echo between two devices. */
  async sendSimplePDU(srcDevId, dstDevId) {
    const srcDev = this.devices.get(srcDevId);
    const dstDev = this.devices.get(dstDevId);
    if (!srcDev || !dstDev) return;
    const pdu = { id: 'pdu_' + (this.nextId++), srcId: srcDevId, dstId: dstDevId, source: srcDev.name, dest: dstDev.name, type: 'ICMP', color: randomPduColor(), time: (this.simClock || 0).toFixed(3), status: 'In Progress' };
    this.pduList.unshift(pdu);
    this.emit('pdu-list-changed');
    await this.firePDU(pdu);
  }

  async firePDU(pdu) {
    const srcDev = this.devices.get(pdu.srcId);
    const dstDev = this.devices.get(pdu.dstId);
    if (!srcDev || !dstDev) return;
    pdu.status = 'In Progress';
    this.emit('pdu-list-changed');
    const dstIP = this.pickTargetIP(srcDev, dstDev);
    if (!dstIP) {
      pdu.status = 'Failed';
      this.emit('pdu-list-changed');
      return;
    }
    const res = this.echo(srcDev, dstIP);
    await this._animate(res.anim, 'ICMP', pdu.color);
    pdu.status = res.result === 'reply' ? 'Successful' : 'Failed';
    this.emit('pdu-list-changed');
  }

  pickTargetIP(srcDev, dstDev) {
    const cands = dstDev.interfaces.filter(i => i.ip && i.isPhysicalUp);
    if (!cands.length) return null;
    const srcIfs = srcDev.interfaces.filter(i => i.ip);
    const same = cands.find(c => srcIfs.some(s => IPUtils.isSameSubnet(s.ip, c.ip, c.mask)));
    if (same) return same.ip;
    if (srcDev.gateway) {
      const gw = cands.find(c => c.ip === srcDev.gateway);
      if (gw) return gw.ip;
    }
    return cands[0].ip;
  }

  /* ----------------------------- Animation -------------------------------- */

  stepForward() {
    const w = this._stepWaiters.shift();
    if (w) w();
  }

  setSimPlaying(on) {
    this.simPlaying = on;
    if (on) while (this._stepWaiters.length) this._stepWaiters.shift()();
    this.emit('sim-state');
  }

  resetSimulation() {
    this.simEventList = [];
    this.simClock = 0;
    this.activeSimEvents = [];
    while (this._stepWaiters.length) this._stepWaiters.shift()();
    this.emit('sim-events-changed');
    this.emit('animation-frame');
  }

  _waitStep() {
    if (!this.isSimulationMode || this.simPlaying) return Promise.resolve();
    const p = new Promise(res => this._stepWaiters.push(() => { res(); this.emit('sim-state'); }));
    this.emit('sim-state');
    return p;
  }

  async _animate(segments, defaultType, color) {
    for (const seg of segments) {
      const sim = this.isSimulationMode;
      if (!sim && seg.type === 'ARP') continue; // realtime mode: ARP is invisible like in PT
      if (sim && this.simFilters[baseType(seg.type)] === false) continue;
      // A PDU's own colour applies to its ICMP packets; ARP/DHCP keep their protocol colour
      const segColor = (seg.type === 'ARP' || seg.type === 'DHCP') ? COLORS[seg.type] : (color || COLORS[seg.type] || COLORS.ICMP);
      for (const hop of seg.hops) {
        if (!hop.cable) continue;
        if (sim) {
          await this._waitStep();
          this.simClock += 0.001 + Math.random() * 0.002;
          this.simEventList.push({
            id: this.simEventList.length + 1,
            time: this.simClock.toFixed(3),
            last: hop.from.name,
            at: hop.to.name,
            type: baseType(seg.type),
            color: segColor,
            info: { ...seg.info, inPort: hop.toIface ? hop.toIface.name : '', outPort: hop.fromIface ? hop.fromIface.name : '', vlan: hop.vlan, at: hop.to.name, last: hop.from.name, kind: seg.type }
          });
          this.emit('sim-events-changed');
        }
        await this._animateHop(hop, seg.type, segColor, sim);
      }
    }
  }

  async _animateHop(hop, label, color, sim) {
    const ev = { id: Math.random(), cable: hop.cable, fromDev: hop.from, toDev: hop.to, label, color, progress: 0 };
    this.activeSimEvents.push(ev);
    const steps = sim ? 24 : 10;
    const delay = sim ? 28 : 16;
    for (let i = 1; i <= steps; i++) {
      ev.progress = i / steps;
      this.emit('animation-frame');
      await new Promise(r => setTimeout(r, delay / this.simSpeed));
    }
    const idx = this.activeSimEvents.indexOf(ev);
    if (idx !== -1) this.activeSimEvents.splice(idx, 1);
    this.emit('animation-frame');
  }

  /* --------------------------- Persistence -------------------------------- */

  static deviceConfig(dev) {
    const o = {};
    for (const [k, v] of Object.entries(dev)) {
      if (['interfaces', 'arpTable', 'macTable', 'startupConfig'].includes(k)) continue;
      if (k.startsWith('_') && !['_savedText', '_progCode'].includes(k)) continue;
      if (typeof v === 'function') continue;
      o[k] = v;
    }
    o.interfaces = dev.interfaces.map(i => {
      const io = {};
      for (const [k, v] of Object.entries(i)) {
        if (['device', 'connectedCable', 'connectedRemoteInterface'].includes(k)) continue;
        io[k] = v;
      }
      return io;
    });
    return JSON.parse(JSON.stringify(o));
  }

  static applyDeviceConfig(dev, cfg, { keepIdentity = true } = {}) {
    const skip = keepIdentity ? ['id', 'type', 'model', 'x', 'y', 'name', 'interfaces', 'isPoweredOff', 'startupConfig'] : ['interfaces'];
    for (const [k, v] of Object.entries(cfg)) {
      if (skip.includes(k)) continue;
      dev[k] = JSON.parse(JSON.stringify(v));
    }
    // Drop virtual interfaces absent from config
    const names = new Set(cfg.interfaces.map(i => i.name));
    dev.interfaces = dev.interfaces.filter(i => !i.isVirtual || names.has(i.name));
    for (const ic of cfg.interfaces) {
      let i = dev.getInterface(ic.name);
      if (!i) {
        i = new DeviceInterface(ic.name, ic.type, dev);
        dev.interfaces.push(i);
      }
      for (const [k, v] of Object.entries(ic)) {
        if (keepIdentity && k === 'mac') continue;
        i[k] = v;
      }
    }
    if (dev.arpTable) dev.arpTable.clear();
    if (dev.macTable) dev.macTable.clear();
  }

  factoryConfig(dev) {
    const fresh = this._buildDevice(dev.type, dev.name, dev.model, dev.x, dev.y, dev.id);
    return NetworkTopology.deviceConfig(fresh);
  }

  /** Reload: running-config replaced by startup-config (or factory defaults). */
  reloadDevice(dev) {
    const cfg = dev.startupConfig ? dev.startupConfig.config : this.factoryConfig(dev);
    NetworkTopology.applyDeviceConfig(dev, cfg);
    this.emit('topology-changed');
  }

  saveStartup(dev, text) {
    dev.startupConfig = { config: NetworkTopology.deviceConfig(dev), text };
  }

  serialize(extra = {}) {
    return {
      format: 'pt-web',
      version: 2,
      nextId: this.nextId,
      devices: [...this.devices.values()].map(d => ({
        id: d.id, type: d.type, model: d.model, name: d.name, x: d.x, y: d.y,
        config: NetworkTopology.deviceConfig(d),
        startupConfig: d.startupConfig || null
      })),
      cables: this.cables.map(c => ({ id: c.id, type: c.type, a: { dev: c.ifaceA.device.id, iface: c.ifaceA.name }, b: { dev: c.ifaceB.device.id, iface: c.ifaceB.name } })),
      pdus: this.pduList.map(p => ({ ...p })),
      ...extra
    };
  }

  load(data) {
    if (!data || data.format !== 'pt-web') throw new Error('Formato de archivo no reconocido');
    this.devices.clear();
    this.cables = [];
    this.pduList = [];
    this.resetSimulation();
    for (const d of data.devices) {
      const dev = this._buildDevice(d.type, d.name, d.model, d.x, d.y, d.id);
      NetworkTopology.applyDeviceConfig(dev, d.config, { keepIdentity: false });
      dev.id = d.id; dev.x = d.x; dev.y = d.y; dev.name = d.name;
      dev.startupConfig = d.startupConfig || null;
      this.devices.set(dev.id, dev);
    }
    for (const c of data.cables) {
      const a = this.devices.get(c.a.dev), b = this.devices.get(c.b.dev);
      if (!a || !b) continue;
      const ia = a.getInterface(c.a.iface), ib = b.getInterface(c.b.iface);
      if (!ia || !ib || ia.connectedCable || ib.connectedCable) continue;
      this.cables.push(new NetworkCable(c.id, c.type, ia, ib));
    }
    this.pduList = (data.pdus || []).map(p => ({ ...p, status: p.status === 'In Progress' ? '' : p.status }));
    const maxId = Math.max(0, ...[...this.devices.keys(), ...this.cables.map(c => c.id)].map(s => parseInt(String(s).split('_')[1], 10) || 0));
    this.nextId = Math.max(data.nextId || 1, maxId + 1);
    this.emit('topology-changed');
    this.emit('pdu-list-changed');
  }

  clear() {
    this.devices.clear();
    this.cables = [];
    this.pduList = [];
    this.nextId = 1;
    this.resetSimulation();
    this.emit('topology-changed');
    this.emit('pdu-list-changed');
  }

  /* ----------------------------- Sample lab ------------------------------- */

  loadAuthenticLab() {
    this.devices.clear();
    this.cables = [];
    this.eventLog = [];
    this.pduList = [];
    this.nextId = 1;
    this.resetSimulation();

    const r0 = this.addDevice('router', 'Router0', '2911', 460, 110);
    const sw0 = this.addDevice('switch', 'Switch0', '2960', 250, 240);
    const sw1 = this.addDevice('switch', 'Switch1', '2960', 670, 240);
    const pc0 = this.addDevice('pc', 'PC0', 'PC-PT', 150, 390);
    const pc1 = this.addDevice('pc', 'PC1', 'PC-PT', 330, 390);
    const lap0 = this.addDevice('laptop', 'Laptop0', 'Laptop-PT', 580, 390);
    const srv0 = this.addDevice('server', 'Server0', 'Server-PT', 770, 390);

    Object.assign(pc0, { ip: '192.168.1.10', mask: '255.255.255.0', gateway: '192.168.1.1' });
    Object.assign(pc1, { ip: '192.168.1.11', mask: '255.255.255.0', gateway: '192.168.1.1' });
    Object.assign(lap0, { ip: '192.168.2.10', mask: '255.255.255.0', gateway: '192.168.2.1' });
    Object.assign(srv0, { ip: '192.168.2.100', mask: '255.255.255.0', gateway: '192.168.2.1' });

    const rg0 = r0.getInterface('GigabitEthernet0/0');
    Object.assign(rg0, { ip: '192.168.1.1', mask: '255.255.255.0', isUp: true });
    const rg1 = r0.getInterface('GigabitEthernet0/1');
    Object.assign(rg1, { ip: '192.168.2.1', mask: '255.255.255.0', isUp: true });

    this.connect(r0.id, 'GigabitEthernet0/0', sw0.id, 'GigabitEthernet0/1', 'straight');
    this.connect(r0.id, 'GigabitEthernet0/1', sw1.id, 'GigabitEthernet0/1', 'straight');
    this.connect(sw0.id, 'FastEthernet0/1', pc0.id, 'FastEthernet0', 'straight');
    this.connect(sw0.id, 'FastEthernet0/2', pc1.id, 'FastEthernet0', 'straight');
    this.connect(sw1.id, 'FastEthernet0/1', lap0.id, 'FastEthernet0', 'straight');
    this.connect(sw1.id, 'FastEthernet0/2', srv0.id, 'FastEthernet0', 'straight');

    this.log('System', 'Topology', 'Laboratorio cargado: Router 2911 enrutando 192.168.1.0/24 y 192.168.2.0/24.');
    this.emit('topology-changed');
    this.emit('pdu-list-changed');
  }
}

function baseType(t) {
  if (t === 'ICMP Reply') return 'ICMP';
  return t;
}

export function reversePath(path) {
  return path.slice().reverse().map(h => ({ cable: h.cable, from: h.to, to: h.from, fromIface: h.toIface, toIface: h.fromIface, vlan: h.vlan }));
}

const PDU_COLORS = ['#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6'];
function randomPduColor() {
  return PDU_COLORS[Math.floor(Math.random() * PDU_COLORS.length)];
}
