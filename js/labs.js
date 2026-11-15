/**
 * Sample labs. Network devices are configured by running real IOS commands
 * through the CLI, so every lab doubles as a regression check of the parser.
 */

import { CiscoIOSCLI } from './ios-cli.js';

export const SAMPLE_LABS = [
  { id: 'basic', name: 'Router 2911 + 2 subredes', builtin: true },
  {
    id: 'roas',
    name: 'VLANs + Router-on-a-Stick + DHCP',
    devices: [
      { key: 'R0', type: 'router', model: '2911', name: 'Router0', x: 470, y: 90 },
      { key: 'S0', type: 'switch', model: '2960', name: 'Switch0', x: 470, y: 230 },
      { key: 'P0', type: 'pc', name: 'PC0', x: 250, y: 390, dhcp: true },
      { key: 'P1', type: 'pc', name: 'PC1', x: 400, y: 390, dhcp: true },
      { key: 'P2', type: 'pc', name: 'PC2', x: 560, y: 390, dhcp: true },
      { key: 'P3', type: 'laptop', name: 'Laptop0', x: 710, y: 390, dhcp: true }
    ],
    cables: [
      ['R0', 'GigabitEthernet0/0', 'S0', 'GigabitEthernet0/1', 'straight'],
      ['S0', 'FastEthernet0/1', 'P0', 'FastEthernet0', 'straight'],
      ['S0', 'FastEthernet0/2', 'P1', 'FastEthernet0', 'straight'],
      ['S0', 'FastEthernet0/11', 'P2', 'FastEthernet0', 'straight'],
      ['S0', 'FastEthernet0/12', 'P3', 'FastEthernet0', 'straight']
    ],
    ios: {
      S0: [
        'hostname S1',
        'vlan 10', 'name VENTAS', 'vlan 20', 'name SOPORTE', 'exit',
        'interface range fa0/1 - 10', 'switchport mode access', 'switchport access vlan 10', 'exit',
        'interface range fa0/11 - 20', 'switchport mode access', 'switchport access vlan 20', 'exit',
        'interface g0/1', 'switchport mode trunk', 'exit',
        'interface vlan 1', 'ip address 192.168.1.2 255.255.255.0', 'no shutdown', 'exit',
        'ip default-gateway 192.168.1.1',
        'end'
      ],
      R0: [
        'hostname R1',
        'interface g0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'exit',
        'interface g0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0', 'exit',
        'interface g0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.20.1 255.255.255.0', 'exit',
        'ip dhcp excluded-address 192.168.10.1 192.168.10.9',
        'ip dhcp excluded-address 192.168.20.1 192.168.20.9',
        'ip dhcp pool VENTAS', 'network 192.168.10.0 255.255.255.0', 'default-router 192.168.10.1', 'dns-server 8.8.8.8', 'exit',
        'ip dhcp pool SOPORTE', 'network 192.168.20.0 255.255.255.0', 'default-router 192.168.20.1', 'dns-server 8.8.8.8', 'exit',
        'end'
      ]
    },
    notes: [{ x: 30, y: 60, w: 280, text: 'VLAN 10 (Fa0/1-10) y VLAN 20 (Fa0/11-20).\nR1 enruta entre VLANs con subinterfaces g0/0.10 y g0/0.20 y entrega IPs por DHCP.\nPrueba: ping de PC0 a PC2.' }]
  },
  {
    id: 'ospf',
    name: 'OSPF área 0 con 3 routers',
    devices: [
      { key: 'R1', type: 'router', model: '2911', name: 'R1', x: 260, y: 110 },
      { key: 'R2', type: 'router', model: '2911', name: 'R2', x: 680, y: 110 },
      { key: 'R3', type: 'router', model: '2911', name: 'R3', x: 470, y: 270 },
      { key: 'S1', type: 'switch', model: '2960', name: 'Switch1', x: 120, y: 240 },
      { key: 'S2', type: 'switch', model: '2960', name: 'Switch2', x: 820, y: 240 },
      { key: 'S3', type: 'switch', model: '2960', name: 'Switch3', x: 470, y: 400 },
      { key: 'P1', type: 'pc', name: 'PC1', x: 120, y: 380, ip: '10.1.1.10', mask: '255.255.255.0', gw: '10.1.1.1' },
      { key: 'P2', type: 'pc', name: 'PC2', x: 820, y: 380, ip: '10.2.2.10', mask: '255.255.255.0', gw: '10.2.2.1' },
      { key: 'P3', type: 'server', name: 'Server3', x: 640, y: 450, ip: '10.3.3.100', mask: '255.255.255.0', gw: '10.3.3.1' }
    ],
    cables: [
      ['R1', 'Serial0/0/0', 'R2', 'Serial0/0/0', 'serial'],
      ['R1', 'GigabitEthernet0/1', 'R3', 'GigabitEthernet0/1', 'crossover'],
      ['R2', 'GigabitEthernet0/1', 'R3', 'GigabitEthernet0/2', 'crossover'],
      ['R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1', 'straight'],
      ['R2', 'GigabitEthernet0/0', 'S2', 'GigabitEthernet0/1', 'straight'],
      ['R3', 'GigabitEthernet0/0', 'S3', 'GigabitEthernet0/1', 'straight'],
      ['S1', 'FastEthernet0/1', 'P1', 'FastEthernet0', 'straight'],
      ['S2', 'FastEthernet0/1', 'P2', 'FastEthernet0', 'straight'],
      ['S3', 'FastEthernet0/1', 'P3', 'FastEthernet0', 'straight']
    ],
    ios: {
      R1: [
        'hostname R1', 'no ip domain-lookup',
        'interface g0/0', 'ip address 10.1.1.1 255.255.255.0', 'no shutdown',
        'interface s0/0/0', 'ip address 10.0.12.1 255.255.255.252', 'no shutdown',
        'interface g0/1', 'ip address 10.0.13.1 255.255.255.252', 'no shutdown', 'exit',
        'router ospf 1', 'router-id 1.1.1.1', 'network 10.1.1.0 0.0.0.255 area 0', 'network 10.0.12.0 0.0.0.3 area 0', 'network 10.0.13.0 0.0.0.3 area 0', 'passive-interface g0/0',
        'end'
      ],
      R2: [
        'hostname R2', 'no ip domain-lookup',
        'interface g0/0', 'ip address 10.2.2.1 255.255.255.0', 'no shutdown',
        'interface s0/0/0', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown',
        'interface g0/1', 'ip address 10.0.23.1 255.255.255.252', 'no shutdown', 'exit',
        'router ospf 1', 'router-id 2.2.2.2', 'network 10.2.2.0 0.0.0.255 area 0', 'network 10.0.12.0 0.0.0.3 area 0', 'network 10.0.23.0 0.0.0.3 area 0', 'passive-interface g0/0',
        'end'
      ],
      R3: [
        'hostname R3', 'no ip domain-lookup',
        'interface g0/0', 'ip address 10.3.3.1 255.255.255.0', 'no shutdown',
        'interface g0/1', 'ip address 10.0.13.2 255.255.255.252', 'no shutdown',
        'interface g0/2', 'ip address 10.0.23.2 255.255.255.252', 'no shutdown', 'exit',
        'router ospf 1', 'router-id 3.3.3.3', 'network 10.0.0.0 0.255.255.255 area 0', 'passive-interface g0/0',
        'end'
      ]
    },
    notes: [{ x: 30, y: 60, w: 280, text: 'OSPF área 0. El enlace serie R1-R2 tiene coste 64, así que R1 llega a 10.2.2.0/24 por R3 (coste 3).\nPrueba: show ip route y show ip ospf neighbor en R1; tracert desde PC1 a PC2.' }]
  }
];

export async function buildLab(topology, lab) {
  if (lab.builtin) {
    topology.loadAuthenticLab();
    return;
  }
  topology.clear();
  const map = {};
  for (const d of lab.devices) {
    const dev = topology.addDevice(d.type, d.name, d.model || null, d.x, d.y);
    map[d.key] = dev;
    if (d.ip) Object.assign(dev, { ip: d.ip, mask: d.mask, gateway: d.gw || '' });
  }
  for (const [a, ia, b, ib, type] of lab.cables) topology.connect(map[a].id, ia, map[b].id, ib, type);
  for (const [key, lines] of Object.entries(lab.ios || {})) {
    const cli = new CiscoIOSCLI(map[key], topology);
    cli.state = 'ready';
    cli.mode = 'PRIVILEGED';
    await cli.execute('configure terminal');
    for (const line of lines) {
      const out = await cli.execute(line);
      if (out && /^%\s*(Invalid|Incomplete|Ambiguous)/m.test(out)) console.warn(`[lab ${lab.id}] ${key}: "${line}" -> ${out}`);
    }
  }
  for (const d of lab.devices) {
    if (d.dhcp) {
      const dev = map[d.key];
      dev.ipType = 'dhcp';
      const lease = topology._dhcpLookup(dev, dev.interfaces[0], []);
      if (lease) Object.assign(dev, { ip: lease.ip, mask: lease.mask, gateway: lease.gateway, dns: lease.dns });
    }
  }
  topology.emit('topology-changed');
}
