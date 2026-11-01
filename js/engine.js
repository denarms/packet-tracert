/**
 * Cisco Packet Tracer Web - Network Simulation Engine (Layer 2 & Layer 3)
 */

export class IPUtils {
  static parseIP(ipStr) {
    if (!ipStr || typeof ipStr !== 'string') return 0;
    const parts = ipStr.trim().split('.');
    if (parts.length !== 4) return 0;
    return parts.reduce((acc, octet) => (acc << 8) + (parseInt(octet, 10) & 255), 0) >>> 0;
  }

  static formatIP(ipNum) {
    return [
      (ipNum >>> 24) & 255,
      (ipNum >>> 16) & 255,
      (ipNum >>> 8) & 255,
      ipNum & 255
    ].join('.');
  }

  static isSameSubnet(ip1, ip2, mask) {
    if (!ip1 || !ip2 || !mask) return false;
    const n1 = this.parseIP(ip1);
    const n2 = this.parseIP(ip2);
    const m = this.parseIP(mask);
    return (n1 & m) === (n2 & m);
  }

  static isValidIP(ipStr) {
    if (!ipStr || typeof ipStr !== 'string') return false;
    const parts = ipStr.trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const n = parseInt(p, 10);
      return !isNaN(n) && n >= 0 && n <= 255 && p === n.toString();
    });
  }

  static generateMAC() {
    const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return `00${hex()}.${hex()}${hex()}.${hex()}${hex()}`.toUpperCase();
  }
}

export class DeviceInterface {
  constructor(name, type = 'FastEthernet', device = null) {
    this.name = name; // e.g. "GigabitEthernet0/0", "FastEthernet0/1"
    this.type = type;
    this.device = device;
    this.mac = IPUtils.generateMAC();
    this.ip = '';
    this.mask = '255.255.255.0';
    this.isUp = true; // administratively enabled
    this.connectedCable = null;
    this.connectedRemoteInterface = null;
  }

  get isPhysicalUp() {
    return (
      this.isUp &&
      this.connectedCable !== null &&
      this.connectedRemoteInterface !== null &&
      this.connectedRemoteInterface.isUp
    );
  }
}

export class NetworkCable {
  constructor(id, type, ifaceA, ifaceB) {
    this.id = id;
    this.type = type; // 'straight', 'crossover', 'serial', 'fiber', 'console'
    this.ifaceA = ifaceA;
    this.ifaceB = ifaceB;
    ifaceA.connectedCable = this;
    ifaceA.connectedRemoteInterface = ifaceB;
    ifaceB.connectedCable = this;
    ifaceB.connectedRemoteInterface = ifaceA;
  }

  disconnect() {
    if (this.ifaceA) {
      this.ifaceA.connectedCable = null;
      this.ifaceA.connectedRemoteInterface = null;
    }
    if (this.ifaceB) {
      this.ifaceB.connectedCable = null;
      this.ifaceB.connectedRemoteInterface = null;
    }
  }
}

export class BaseDevice {
  constructor(id, name, type, model, x, y) {
    this.id = id;
    this.name = name;
    this.type = type; // 'router', 'switch', 'pc', 'laptop', 'server', 'printer'
    this.model = model;
    this.x = x;
    this.y = y;
    this.interfaces = [];
    this.arpTable = new Map(); // IP -> MAC
  }

  getInterface(name) {
    const q = name.toLowerCase().replace(/\s+/g, '');
    for (const iface of this.interfaces) {
      const n = iface.name.toLowerCase().replace(/\s+/g, '');
      if (n === q) return iface;
      if (q.startsWith('fa') && n.startsWith('fastethernet') && n.endsWith(q.replace('fa', ''))) return iface;
      if (q.startsWith('gi') && n.startsWith('gigabitethernet') && n.endsWith(q.replace('gi', ''))) return iface;
      if (q.startsWith('g') && n.startsWith('gigabitethernet') && n.endsWith(q.replace('g', ''))) return iface;
      if (q.startsWith('se') && n.startsWith('serial') && n.endsWith(q.replace('se', ''))) return iface;
    }
    return null;
  }
}

export class EndDevice extends BaseDevice {
  constructor(id, name, type = 'pc', model = 'PC-PT', x = 100, y = 100) {
    super(id, name, type, model, x, y);
    this.gateway = '';
    this.dns = '0.0.0.0';
    this.ipType = 'static'; // 'static' or 'dhcp'
    this.ipv6Type = 'static'; // 'static' or 'auto'
    this.ipv6Gateway = '';
    this.ipv6Dns = '';

    // Primary interfaces matching Cisco Packet Tracer (Screenshot 3):
    this.interfaces.push(new DeviceInterface('FastEthernet0', 'FastEthernet', this));
    this.interfaces.push(new DeviceInterface('Bluetooth', 'Wireless', this));
  }

  get ip() {
    return this.interfaces[0].ip;
  }

  set ip(v) {
    this.interfaces[0].ip = v;
  }

  get mask() {
    return this.interfaces[0].mask;
  }

  set mask(v) {
    this.interfaces[0].mask = v;
  }

  get mac() {
    return this.interfaces[0].mac;
  }
}

export class WirelessRouterDevice extends BaseDevice {
  constructor(id, name, model = 'HomeRouter-PT-AC', x = 100, y = 100) {
    super(id, name, 'wireless_router', model, x, y);
    this.hostname = name;
    this.internetType = 'DHCP'; // 'DHCP' or 'Static'
    this.routerIP = '192.168.0.1';
    this.subnetMask = '255.255.255.0';
    this.dhcpEnabled = true;
    this.dhcpStartIP = '100';
    this.dhcpMaxUsers = '50';
    this.ssid = 'Default';
    this.channel = '6 - 2.437GHz';
    this.securityMode = 'Disabled';
    this.passphrase = '';

    // Interfaces matching Screenshot 1:
    this.interfaces.push(new DeviceInterface('Internet', 'FastEthernet', this));
    this.interfaces.push(new DeviceInterface('LAN', 'FastEthernet', this));
    this.interfaces.push(new DeviceInterface('Wireless 2.4G', 'Wireless', this));
    this.interfaces.push(new DeviceInterface('Wireless 5G(1)', 'Wireless', this));
    this.interfaces.push(new DeviceInterface('Wireless 5G(2)', 'Wireless', this));
    this.interfaces.push(new DeviceInterface('Wireless Guest 2.4G', 'Wireless', this));
    this.interfaces.push(new DeviceInterface('Wireless Guest 5G(1)', 'Wireless', this));
    this.interfaces.push(new DeviceInterface('Wireless Guest 5G(2)', 'Wireless', this));
  }
}

export class CloudDevice extends BaseDevice {
  constructor(id, name, model = 'Cloud-PT', x = 100, y = 100) {
    super(id, name, 'cloud', model, x, y);
    // Interfaces matching Screenshot 2:
    this.interfaces.push(new DeviceInterface('Ethernet6', 'Ethernet', this));
    this.interfaces.push(new DeviceInterface('Ethernet7', 'Ethernet', this));
    this.interfaces.push(new DeviceInterface('Serial0', 'Serial', this));
    this.interfaces.push(new DeviceInterface('Serial1', 'Serial', this));
    this.interfaces.push(new DeviceInterface('Modem4', 'Phone', this));
    this.interfaces.push(new DeviceInterface('Modem5', 'Phone', this));
    this.interfaces.push(new DeviceInterface('Coaxial7', 'Coaxial', this));
    this.interfaces.push(new DeviceInterface('Coaxial8', 'Coaxial', this));
    this.installedModules = ['PT-CLOUD-NM-1AM', 'PT-CLOUD-NM-1CFE', 'PT-CLOUD-NM-1CX', 'PT-CLOUD-NM-1S'];
  }
}

export class SwitchDevice extends BaseDevice {
  constructor(id, name, model = '2960', x = 100, y = 100) {
    super(id, name, 'switch', model, x, y);
    this.macTable = new Map(); // MAC -> { port, timestamp }

    // 24 FastEthernet ports
    for (let i = 1; i <= 24; i++) {
      this.interfaces.push(new DeviceInterface(`FastEthernet0/${i}`, 'FastEthernet', this));
    }
    // 2 GigabitEthernet uplink ports
    this.interfaces.push(new DeviceInterface('GigabitEthernet0/1', 'GigabitEthernet', this));
    this.interfaces.push(new DeviceInterface('GigabitEthernet0/2', 'GigabitEthernet', this));
  }

  learnMAC(mac, portName) {
    this.macTable.set(mac, { port: portName, learnedAt: Date.now() });
  }
}

export class RouterDevice extends BaseDevice {
  constructor(id, name, model = '2911', x = 100, y = 100) {
    super(id, name, 'router', model, x, y);
    this.routingTable = []; // [{ destination, mask, nextHop, interfaceName }]

    // Cisco 2911 has 3 GigabitEthernet ports (default administratively down)
    const g0 = new DeviceInterface('GigabitEthernet0/0', 'GigabitEthernet', this);
    const g1 = new DeviceInterface('GigabitEthernet0/1', 'GigabitEthernet', this);
    const g2 = new DeviceInterface('GigabitEthernet0/2', 'GigabitEthernet', this);
    g0.isUp = false;
    g1.isUp = false;
    g2.isUp = false;
    this.interfaces.push(g0, g1, g2);

    // Also add 2 Serial interfaces for WAN connection labs
    const s0 = new DeviceInterface('Serial0/0/0', 'Serial', this);
    const s1 = new DeviceInterface('Serial0/0/1', 'Serial', this);
    s0.isUp = false;
    s1.isUp = false;
    this.interfaces.push(s0, s1);
  }

  addRoute(destination, mask, nextHop, interfaceName = null) {
    this.routingTable.push({ destination, mask, nextHop, interfaceName });
  }

  lookupRoute(dstIP) {
    // 1. Direct connected interfaces
    for (const iface of this.interfaces) {
      if (iface.isPhysicalUp && iface.ip && iface.mask) {
        if (IPUtils.isSameSubnet(dstIP, iface.ip, iface.mask)) {
          return { type: 'DIRECT', iface, nextHop: dstIP };
        }
      }
    }

    // 2. Static / Dynamic routes
    for (const route of this.routingTable) {
      if (IPUtils.isSameSubnet(dstIP, route.destination, route.mask)) {
        let iface = this.getInterface(route.interfaceName || '');
        if (!iface) {
          // Find which interface reaches nextHop
          for (const cand of this.interfaces) {
            if (cand.isPhysicalUp && cand.ip && cand.mask && IPUtils.isSameSubnet(route.nextHop, cand.ip, cand.mask)) {
              iface = cand;
              break;
            }
          }
        }
        if (iface && iface.isPhysicalUp) {
          return { type: 'GATEWAY', iface, nextHop: route.nextHop };
        }
      }
    }

    return null;
  }
}

export class NetworkTopology {
  constructor() {
    this.devices = new Map();
    this.cables = [];
    this.nextId = 1;
    this.eventLog = [];
    this.pduList = []; // user-created PDUs
    this.activeSimEvents = [];
    this.isSimulationMode = false;
    this.simSpeed = 1.0;
    this.listeners = new Set();
  }

  on(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(name, data) {
    for (const cb of this.listeners) {
      cb(name, data);
    }
  }

  addDevice(type, name = null, model = null, x = 200, y = 200) {
    const id = 'dev_' + (this.nextId++);
    let dev;
    if (type === 'wireless_router' || model === 'HomeRouter-PT-AC' || model === 'HomeRouter' || model === 'WRT300N') {
      const defName = name || `Wireless Router${this.countType('wireless_router')}`;
      dev = new WirelessRouterDevice(id, defName, model || 'HomeRouter-PT-AC', x, y);
    } else if (type === 'cloud' || model === 'Cloud-PT' || model === 'Cloud-Empty') {
      const defName = name || `Cloud${this.countType('cloud')}`;
      dev = new CloudDevice(id, defName, model || 'Cloud-PT', x, y);
    } else if (type === 'router') {
      const m = model || '2911';
      const defName = name || `Router${this.countType('router')}`;
      dev = new RouterDevice(id, defName, m, x, y);
    } else if (type === 'switch') {
      const m = model || '2960';
      const defName = name || `Switch${this.countType('switch')}`;
      dev = new SwitchDevice(id, defName, m, x, y);
    } else if (type === 'laptop') {
      const defName = name || `Laptop${this.countType('laptop')}`;
      dev = new EndDevice(id, defName, 'laptop', 'Laptop-PT', x, y);
    } else if (type === 'server') {
      const defName = name || `Server${this.countType('server')}`;
      dev = new EndDevice(id, defName, 'server', 'Server-PT', x, y);
    } else if (type === 'printer') {
      const defName = name || `Printer${this.countType('printer')}`;
      dev = new EndDevice(id, defName, 'printer', 'Printer-PT', x, y);
    } else {
      const defName = name || `PC${this.countType('pc')}`;
      dev = new EndDevice(id, defName, type || 'pc', model || 'PC-PT', x, y);
    }

    this.devices.set(id, dev);
    this.emit('topology-changed');
    return dev;
  }

  countType(type) {
    let count = 0;
    for (const d of this.devices.values()) {
      if (d.type === type) count++;
    }
    return count;
  }

  removeDevice(id) {
    const dev = this.devices.get(id);
    if (!dev) return;

    const toRemove = this.cables.filter(c => c.ifaceA.device.id === id || c.ifaceB.device.id === id);
    for (const c of toRemove) {
      this.removeCable(c.id);
    }
    this.devices.delete(id);
    this.emit('topology-changed');
  }

  connect(devAId, ifaceAName, devBId, ifaceBName, cableType = 'straight') {
    const devA = this.devices.get(devAId);
    const devB = this.devices.get(devBId);
    if (!devA || !devB || devAId === devBId) return null;

    const ifA = devA.getInterface(ifaceAName);
    const ifB = devB.getInterface(ifaceBName);
    if (!ifA || !ifB) return null;
    if (ifA.connectedCable || ifB.connectedCable) return null;

    const cableId = 'cable_' + (this.nextId++);
    const cable = new NetworkCable(cableId, cableType, ifA, ifB);
    this.cables.push(cable);
    this.emit('topology-changed');
    return cable;
  }

  removeCable(cableId) {
    const idx = this.cables.findIndex(c => c.id === cableId);
    if (idx !== -1) {
      const cable = this.cables[idx];
      cable.disconnect();
      this.cables.splice(idx, 1);
      this.emit('topology-changed');
    }
  }

  log(devName, protocol, detail, status = 'info') {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      device: devName,
      protocol: protocol,
      detail: detail,
      status: status
    };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 100) this.eventLog.pop();
    this.emit('log', entry);
  }

  async sendSimplePDU(srcDevId, dstDevId) {
    const srcDev = this.devices.get(srcDevId);
    const dstDev = this.devices.get(dstDevId);
    if (!srcDev || !dstDev) return;

    const pdu = {
      id: 'pdu_' + (this.nextId++),
      source: srcDev.name,
      dest: dstDev.name,
      type: 'ICMP',
      color: '#0284c7',
      time: '0.000s',
      status: 'In Progress'
    };
    this.pduList.unshift(pdu);
    this.emit('pdu-list-changed');

    if (!dstDev.ip) {
      pdu.status = 'Failed';
      this.log(srcDev.name, 'ICMP', `Fallo de ping a ${dstDev.name}: sin dirección IP configurada.`, 'error');
      this.emit('pdu-list-changed');
      return;
    }

    const res = await this.simulatePing(srcDevId, dstDev.ip);
    pdu.status = res.success ? 'Successful' : 'Failed';
    this.emit('pdu-list-changed');
  }

  async simulatePing(srcDevId, targetIPStr) {
    const srcDev = this.devices.get(srcDevId);
    if (!srcDev) return { success: false, output: 'Dispositivo no encontrado.' };

    const targetIP = targetIPStr.trim();
    if (!IPUtils.isValidIP(targetIP)) {
      return { success: false, output: `IP inválida: ${targetIP}` };
    }

    if (!srcDev.ip || !srcDev.mask) {
      return { success: false, output: `No se puede alcanzar ${targetIP}. Interfaz local sin IP configurada.` };
    }

    this.log(srcDev.name, 'ICMP', `Pinging ${targetIP} with 32 bytes of data:`);
    let sent = 0;
    let received = 0;
    const details = [];

    for (let seq = 1; seq <= 4; seq++) {
      sent++;
      const res = await this._sendSingleEcho(srcDev, targetIP, seq);
      details.push(res);
      if (res.success) {
        received++;
        this.log(srcDev.name, 'ICMP', `Reply from ${targetIP}: bytes=32 time=${res.time}ms TTL=${res.ttl}`, 'success');
      } else {
        this.log(srcDev.name, 'ICMP', res.reason || 'Request timed out.', 'error');
      }
      await new Promise(r => setTimeout(r, 200 / this.simSpeed));
    }

    const loss = Math.round(((sent - received) / sent) * 100);
    const summary = [
      `Pinging ${targetIP} with 32 bytes of data:`,
      ...details.map(d => d.success ? `Reply from ${targetIP}: bytes=32 time=${d.time}ms TTL=${d.ttl}` : (d.reason || 'Request timed out.')),
      ``,
      `Ping statistics for ${targetIP}:`,
      `    Packets: Sent = ${sent}, Received = ${received}, Lost = ${sent - received} (${loss}% loss)`
    ].join('\n');

    return { success: received > 0, output: summary };
  }

  async _sendSingleEcho(srcDev, targetIP, seq) {
    const srcIface = srcDev.interfaces[0];
    if (!srcIface.isPhysicalUp) {
      return { success: false, reason: 'Destination host unreachable (Cable disconnected or interface down).' };
    }

    const inLocalSubnet = IPUtils.isSameSubnet(srcDev.ip, targetIP, srcDev.mask);
    const nextHopIP = inLocalSubnet ? targetIP : srcDev.gateway;

    if (!inLocalSubnet && !srcDev.gateway) {
      return { success: false, reason: 'Destination host unreachable. No default gateway configured.' };
    }

    // Find forward path
    const path = this._findPath(srcDev, nextHopIP);
    if (!path || path.length === 0) {
      return { success: false, reason: 'Request timed out.' };
    }

    // Animate forward
    await this._animatePath(path, 'ICMP Echo Request', '#0284c7');

    const targetDev = this.getDeviceByIP(targetIP);
    if (!targetDev) {
      return { success: false, reason: 'Request timed out.' };
    }

    // Find return path
    const replyPath = this._findPath(targetDev, srcDev.ip);
    if (!replyPath || replyPath.length === 0) {
      return { success: false, reason: 'Request timed out (No return path).' };
    }

    // Animate reply
    await this._animatePath(replyPath, 'ICMP Echo Reply', '#16a34a');

    return {
      success: true,
      time: Math.floor(Math.random() * 4) + 1,
      ttl: targetDev.type === 'router' ? 255 : 128
    };
  }

  getDeviceByIP(ip) {
    for (const dev of this.devices.values()) {
      for (const iface of dev.interfaces) {
        if (iface.ip === ip && iface.isPhysicalUp) return dev;
      }
    }
    return null;
  }

  _findPath(srcDev, dstIP) {
    const visited = new Set();
    const queue = [[srcDev, []]];
    visited.add(srcDev.id);

    while (queue.length > 0) {
      const [curr, path] = queue.shift();

      for (const iface of curr.interfaces) {
        if (iface.ip === dstIP && iface.isPhysicalUp) {
          return path;
        }
      }

      if (curr.type === 'router' && curr.id !== srcDev.id) {
        const route = curr.lookupRoute(dstIP);
        if (route) {
          const outIface = route.iface;
          if (outIface && outIface.connectedCable && outIface.connectedRemoteInterface) {
            const nextDev = outIface.connectedRemoteInterface.device;
            if (!visited.has(nextDev.id)) {
              visited.add(nextDev.id);
              queue.push([nextDev, [...path, { cable: outIface.connectedCable, from: curr, to: nextDev }]]);
            }
          }
        }
        continue;
      }

      for (const iface of curr.interfaces) {
        if (iface.isPhysicalUp && iface.connectedCable && iface.connectedRemoteInterface) {
          const remoteDev = iface.connectedRemoteInterface.device;
          if (!visited.has(remoteDev.id)) {
            visited.add(remoteDev.id);
            queue.push([remoteDev, [...path, { cable: iface.connectedCable, from: curr, to: remoteDev }]]);
          }
        }
      }
    }

    return null;
  }

  async _animatePath(hopPath, label, color = '#0284c7') {
    for (const hop of hopPath) {
      const simEvent = {
        id: Math.random(),
        cable: hop.cable,
        fromDev: hop.from,
        toDev: hop.to,
        label: label,
        color: color,
        progress: 0
      };
      this.activeSimEvents.push(simEvent);
      this.emit('animation-frame');

      const steps = 16;
      for (let i = 1; i <= steps; i++) {
        simEvent.progress = i / steps;
        this.emit('animation-frame');
        await new Promise(r => setTimeout(r, 22 / this.simSpeed));
      }

      const idx = this.activeSimEvents.indexOf(simEvent);
      if (idx !== -1) this.activeSimEvents.splice(idx, 1);
      this.emit('animation-frame');
    }
  }

  loadAuthenticLab() {
    this.devices.clear();
    this.cables = [];
    this.eventLog = [];
    this.pduList = [];
    this.nextId = 1;

    // Topology:
    // Router0 (2911)
    //   g0/0 (192.168.1.1) -> Switch0 (2960) -> PC0 (192.168.1.10) & PC1 (192.168.1.11)
    //   g0/1 (192.168.2.1) -> Switch1 (2960) -> Laptop0 (192.168.2.10) & Server0 (192.168.2.100)

    const r0 = this.addDevice('router', 'Router0', '2911', 460, 110);
    const sw0 = this.addDevice('switch', 'Switch0', '2960', 250, 240);
    const sw1 = this.addDevice('switch', 'Switch1', '2960', 670, 240);
    const pc0 = this.addDevice('pc', 'PC0', 'PC-PT', 150, 390);
    const pc1 = this.addDevice('pc', 'PC1', 'PC-PT', 330, 390);
    const lap0 = this.addDevice('laptop', 'Laptop0', 'Laptop-PT', 580, 390);
    const srv0 = this.addDevice('server', 'Server0', 'Server-PT', 770, 390);

    pc0.ip = '192.168.1.10';
    pc0.mask = '255.255.255.0';
    pc0.gateway = '192.168.1.1';

    pc1.ip = '192.168.1.11';
    pc1.mask = '255.255.255.0';
    pc1.gateway = '192.168.1.1';

    lap0.ip = '192.168.2.10';
    lap0.mask = '255.255.255.0';
    lap0.gateway = '192.168.2.1';

    srv0.ip = '192.168.2.100';
    srv0.mask = '255.255.255.0';
    srv0.gateway = '192.168.2.1';

    // Enable router ports and assign IPs
    const rg0 = r0.getInterface('GigabitEthernet0/0');
    rg0.ip = '192.168.1.1';
    rg0.mask = '255.255.255.0';
    rg0.isUp = true;

    const rg1 = r0.getInterface('GigabitEthernet0/1');
    rg1.ip = '192.168.2.1';
    rg1.mask = '255.255.255.0';
    rg1.isUp = true;

    // Cables
    this.connect(r0.id, 'GigabitEthernet0/0', sw0.id, 'GigabitEthernet0/1', 'straight');
    this.connect(r0.id, 'GigabitEthernet0/1', sw1.id, 'GigabitEthernet0/1', 'straight');

    this.connect(sw0.id, 'FastEthernet0/1', pc0.id, 'FastEthernet0', 'straight');
    this.connect(sw0.id, 'FastEthernet0/2', pc1.id, 'FastEthernet0', 'straight');

    this.connect(sw1.id, 'FastEthernet0/1', lap0.id, 'FastEthernet0', 'straight');
    this.connect(sw1.id, 'FastEthernet0/2', srv0.id, 'FastEthernet0', 'straight');

    this.log('System', 'Topology', 'Laboratorio oficial cargado: Router 2911 enrutando 2 subredes (192.168.1.0/24 y 192.168.2.0/24).');
    this.emit('topology-changed');
  }
}

