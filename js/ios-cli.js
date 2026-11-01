/**
 * Cisco IOS Command Line Interpreter (Advanced Realism)
 * Features:
 * - Exact Tab Autocompletion (matching Cisco IOS behavior)
 * - Exact Contextual Help with '?'
 * - Modes: User EXEC (>), Privileged EXEC (#), Global Config ((config)#),
 *   Interface Config ((config-if)#), Router Config ((config-router)#), VLAN Config ((config-vlan)#)
 * - Rich set of standard Cisco IOS commands
 */

import { IPUtils } from './engine.js';

export class CiscoIOSCLI {
  constructor(device, topology) {
    this.device = device;
    this.topology = topology;
    this.mode = 'USER'; // 'USER', 'PRIVILEGED', 'CONFIG', 'CONFIG_IF', 'CONFIG_ROUTER', 'CONFIG_VLAN'
    this.currentInterface = null;
    this.history = [];
    this.historyIndex = -1;

    this.initCommandTree();
  }

  getBanner() {
    if (this.device.isPoweredOff) {
      return `System shut down. Toggle power switch to start device.\n`;
    }
    const isRouter = this.device.type === 'router';
    const model = this.device.model || (isRouter ? '2911' : '2960');
    return `Cisco IOS Software, C${model} Software (C${model}-UNIVERSALK9-M), Version 15.1(4)M4, RELEASE SOFTWARE (fc2)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 1986-2024 by Cisco Systems, Inc.
Compiled Thu 05-Jan-12 15:41 by prod_rel_team

Press RETURN to get started!`;
  }

  getBootOutput() {
    const isRouter = this.device.type === 'router';
    const model = this.device.model || (isRouter ? '2911' : '2960');
    return `\nSystem Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 2012 by cisco Systems, Inc.

Total memory used: 536870912 bytes
Self-decompressing the image : #################################################################### [OK]
Smart Init is initializing memory.
Restoring NVRAM...
Reading configuration file...

Press RETURN to get started!\n`;
  }

  getPrompt() {
    if (this.device.isPoweredOff) return '';
    const name = this.device.hostname || this.device.name;
    switch (this.mode) {
      case 'USER':
        return `${name}>`;
      case 'PRIVILEGED':
        return `${name}#`;
      case 'CONFIG':
        return `${name}(config)#`;
      case 'CONFIG_IF':
        return `${name}(config-if)#`;
      case 'CONFIG_ROUTER':
        return `${name}(config-router)#`;
      case 'CONFIG_VLAN':
        return `${name}(config-vlan)#`;
      default:
        return `${name}>`;
    }
  }

  initCommandTree() {
    // Mode-specific command specifications with descriptions and subcommands
    this.commands = {
      USER: {
        'enable': { desc: 'Turn on privileged commands', next: {} },
        'exit': { desc: 'Exit from the EXEC', next: {} },
        'help': { desc: 'Description of the interactive help system', next: {} },
        'ping': { desc: 'Send echo messages', next: { '<ip>': { desc: 'IP destination address' } } },
        'show': {
          desc: 'Show running system information',
          next: {
            'clock': { desc: 'Manage the system clock' },
            'ip': {
              desc: 'IP information',
              next: {
                'interface': {
                  desc: 'IP interface status and configuration',
                  next: {
                    'brief': { desc: 'Brief summary of IP status and configuration' }
                  }
                }
              }
            },
            'version': { desc: 'System hardware and software status' }
          }
        },
        'traceroute': { desc: 'Trace route to destination', next: { '<ip>': { desc: 'IP destination address' } } }
      },

      PRIVILEGED: {
        'clear': {
          desc: 'Reset functions',
          next: {
            'arp-cache': { desc: 'Clear the entire ARP cache' },
            'mac-address-table': { desc: 'Clear dynamic MAC address table' }
          }
        },
        'clock': { desc: 'Manage the system clock', next: { 'set': { desc: 'Set time and date' } } },
        'configure': {
          desc: 'Enter configuration mode',
          next: {
            'terminal': { desc: 'Configure from the EXEC terminal' }
          }
        },
        'copy': {
          desc: 'Copy from one file to another',
          next: {
            'running-config': {
              desc: 'Current operating configuration',
              next: {
                'startup-config': { desc: 'Copy to NVRAM startup configuration' }
              }
            }
          }
        },
        'disable': { desc: 'Turn off privileged commands', next: {} },
        'erase': {
          desc: 'Erase a filesystem',
          next: {
            'startup-config': { desc: 'Erase NVRAM configuration' }
          }
        },
        'exit': { desc: 'Exit from the EXEC', next: {} },
        'help': { desc: 'Description of the interactive help system', next: {} },
        'ping': { desc: 'Send echo messages', next: { '<ip>': { desc: 'IP destination address' } } },
        'reload': { desc: 'Halt and perform a cold restart', next: {} },
        'show': {
          desc: 'Show running system information',
          next: {
            'arp': { desc: 'ARP table' },
            'clock': { desc: 'Manage the system clock' },
            'interfaces': { desc: 'Interface status and configuration' },
            'ip': {
              desc: 'IP information',
              next: {
                'interface': {
                  desc: 'IP interface status and configuration',
                  next: {
                    'brief': { desc: 'Brief summary of IP status and configuration' }
                  }
                },
                'route': { desc: 'IP routing table' }
              }
            },
            'mac-address-table': { desc: 'MAC forwarding table' },
            'running-config': { desc: 'Current operating configuration' },
            'startup-config': { desc: 'Contents of startup configuration' },
            'version': { desc: 'System hardware and software status' },
            'vlan': {
              desc: 'VTP VLAN status',
              next: {
                'brief': { desc: 'VTP VLAN summary' }
              }
            }
          }
        },
        'traceroute': { desc: 'Trace route to destination', next: { '<ip>': { desc: 'IP destination address' } } },
        'write': {
          desc: 'Write running configuration to memory, network, or terminal',
          next: {
            'memory': { desc: 'Write configuration to NVRAM' },
            'erase': { desc: 'Erase configuration NVRAM' }
          }
        }
      },

      CONFIG: {
        'do': { desc: 'Execute an EXEC-level command', next: {} },
        'end': { desc: 'Exit to privileged EXEC mode', next: {} },
        'exit': { desc: 'Exit from configure mode', next: {} },
        'hostname': { desc: 'Set system network name', next: { '<name>': { desc: 'Hostname string' } } },
        'interface': {
          desc: 'Select an interface to configure',
          next: {
            'FastEthernet': { desc: 'FastEthernet IEEE 802.3' },
            'GigabitEthernet': { desc: 'GigabitEthernet IEEE 802.3z' },
            'Serial': { desc: 'Serial interface' }
          }
        },
        'ip': {
          desc: 'Global IP configuration subcommands',
          next: {
            'route': {
              desc: 'Establish static routes',
              next: {
                '<network>': {
                  desc: 'Destination network prefix',
                  next: {
                    '<mask>': {
                      desc: 'Destination network mask',
                      next: {
                        '<next-hop>': { desc: 'Next hop IP address or interface' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        'no': { desc: 'Negate a command or set its defaults', next: {} },
        'router': {
          desc: 'Enable a routing process',
          next: {
            'rip': { desc: 'Routing Information Protocol (RIP)' },
            'ospf': { desc: 'Open Shortest Path First (OSPF)' }
          }
        },
        'vlan': { desc: 'VLAN configuration', next: { '<vlan-id>': { desc: 'VLAN ID (1-4094)' } } }
      },

      CONFIG_IF: {
        'bandwidth': { desc: 'Set bandwidth informational parameter', next: {} },
        'description': { desc: 'Interface specific description', next: {} },
        'do': { desc: 'Execute an EXEC-level command', next: {} },
        'duplex': {
          desc: 'Configure duplex operation',
          next: {
            'auto': { desc: 'Enable AUTO duplex configuration' },
            'full': { desc: 'Force full duplex operation' },
            'half': { desc: 'Force half-duplex operation' }
          }
        },
        'end': { desc: 'Exit to privileged EXEC mode', next: {} },
        'exit': { desc: 'Exit from interface configuration mode', next: {} },
        'ip': {
          desc: 'Interface Internet Protocol config commands',
          next: {
            'address': {
              desc: 'Set the IP address of an interface',
              next: {
                '<ip>': {
                  desc: 'IP address',
                  next: {
                    '<mask>': { desc: 'IP subnet mask' }
                  }
                }
              }
            }
          }
        },
        'no': {
          desc: 'Negate a command or set its defaults',
          next: {
            'ip': {
              desc: 'IP interface commands',
              next: {
                'address': { desc: 'Remove IP address' }
              }
            },
            'shutdown': { desc: 'Restart an interface' }
          }
        },
        'shutdown': { desc: 'Shut down the selected interface', next: {} },
        'speed': {
          desc: 'Configure speed operation',
          next: {
            'auto': { desc: 'Enable AUTO speed configuration' },
            '10': { desc: 'Force 10 Mbps operation' },
            '100': { desc: 'Force 100 Mbps operation' },
            '1000': { desc: 'Force 1000 Mbps operation' }
          }
        },
        'switchport': {
          desc: 'Set switching characteristics of the Layer 2 interface',
          next: {
            'access': {
              desc: 'Set access mode characteristics of the interface',
              next: {
                'vlan': { desc: 'Set VLAN when interface is in access mode' }
              }
            },
            'mode': {
              desc: 'Set trunking mode of the interface',
              next: {
                'access': { desc: 'Set trunking mode to ACCESS unconditionally' },
                'trunk': { desc: 'Set trunking mode to TRUNK unconditionally' }
              }
            }
          }
        }
      },

      CONFIG_ROUTER: {
        'auto-summary': { desc: 'Enable automatic network number summarization', next: {} },
        'do': { desc: 'Execute an EXEC-level command', next: {} },
        'end': { desc: 'Exit to privileged EXEC mode', next: {} },
        'exit': { desc: 'Exit from routing protocol configuration mode', next: {} },
        'network': { desc: 'Enable routing on an IP network', next: { '<network>': { desc: 'Network number' } } },
        'no': {
          desc: 'Negate a command or set its defaults',
          next: {
            'auto-summary': { desc: 'Disable automatic network number summarization' }
          }
        },
        'version': {
          desc: 'Set routing protocol version',
          next: {
            '1': { desc: 'RIP version 1' },
            '2': { desc: 'RIP version 2' }
          }
        }
      },

      CONFIG_VLAN: {
        'end': { desc: 'Exit to privileged EXEC mode', next: {} },
        'exit': { desc: 'Apply changes and exit from VLAN configuration mode', next: {} },
        'name': { desc: 'Ascii name of the VLAN', next: { '<name>': { desc: 'VLAN name' } } },
        'no': { desc: 'Negate a command or set its defaults', next: {} }
      }
    };
  }

  /**
   * Handles Tab Auto-completion
   * Returns: { completedText: string, candidates?: string[] }
   */
  handleTabCompletion(input) {
    const trimmed = input.trimStart();
    const endsWithSpace = input.endsWith(' ');
    const tokens = trimmed ? trimmed.split(/\s+/) : [];

    // Find candidate words in current command dictionary
    const tree = this.commands[this.mode] || this.commands.USER;

    if (tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)) {
      const prefix = tokens[0] || '';
      const matches = Object.keys(tree).filter(k => k.startsWith(prefix.toLowerCase()));
      if (matches.length === 1) {
        return { completedText: matches[0] + ' ' };
      }
      return { completedText: input, candidates: matches };
    }

    // Traverse command dictionary
    let currNode = tree;
    for (let i = 0; i < (endsWithSpace ? tokens.length : tokens.length - 1); i++) {
      const tok = tokens[i].toLowerCase();
      // Match exact or abbreviated
      const matchedKey = Object.keys(currNode).find(k => k.toLowerCase() === tok || k.toLowerCase().startsWith(tok));
      if (matchedKey && currNode[matchedKey]?.next) {
        currNode = currNode[matchedKey].next;
      } else {
        return { completedText: input };
      }
    }

    const lastToken = endsWithSpace ? '' : tokens[tokens.length - 1].toLowerCase();

    // If current node expects interface name, suggest available interfaces
    if (currNode['GigabitEthernet'] || currNode['FastEthernet']) {
      const ifacePrefix = lastToken;
      const ifaceMatches = [];
      this.device.interfaces.forEach(i => {
        if (i.name.toLowerCase().startsWith(ifacePrefix)) {
          ifaceMatches.push(i.name);
        }
      });
      if (ifaceMatches.length === 1) {
        const baseTokens = endsWithSpace ? tokens : tokens.slice(0, -1);
        return { completedText: [...baseTokens, ifaceMatches[0]].join(' ') + ' ' };
      }
      if (ifaceMatches.length > 1) {
        return { completedText: input, candidates: ifaceMatches };
      }
    }

    const matches = Object.keys(currNode).filter(k => !k.startsWith('<') && k.toLowerCase().startsWith(lastToken));
    if (matches.length === 1) {
      const baseTokens = endsWithSpace ? tokens : tokens.slice(0, -1);
      return { completedText: [...baseTokens, matches[0]].join(' ') + ' ' };
    }

    return { completedText: input, candidates: matches };
  }

  /**
   * Handles Contextual Help with '?'
   * Returns: { helpText: string, currentLine: string }
   */
  handleContextualHelp(input) {
    const trimmed = input.trimStart();
    const endsWithSpace = input.endsWith(' ');
    const tokens = trimmed ? trimmed.split(/\s+/) : [];

    const tree = this.commands[this.mode] || this.commands.USER;

    // 1. If line is empty or single word prefix without space
    if (tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)) {
      const prefix = tokens[0] || '';
      const list = Object.entries(tree).filter(([k]) => k.startsWith(prefix.toLowerCase()));
      if (list.length === 0) {
        return { helpText: '\n% Unrecognized command', currentLine: input };
      }
      let out = '\n';
      list.forEach(([k, v]) => {
        out += `  ${k.padEnd(20, ' ')} ${v.desc || ''}\n`;
      });
      return { helpText: out, currentLine: input };
    }

    // 2. Traverse tree to current token
    let currNode = tree;
    for (let i = 0; i < (endsWithSpace ? tokens.length : tokens.length - 1); i++) {
      const tok = tokens[i].toLowerCase();
      const matchedKey = Object.keys(currNode).find(k => k.toLowerCase() === tok || k.toLowerCase().startsWith(tok));
      if (matchedKey && currNode[matchedKey]?.next) {
        currNode = currNode[matchedKey].next;
      } else {
        return { helpText: '\n% Unrecognized command', currentLine: input };
      }
    }

    const lastToken = endsWithSpace ? '' : tokens[tokens.length - 1].toLowerCase();
    const list = Object.entries(currNode).filter(([k]) => k.startsWith('<') || k.toLowerCase().startsWith(lastToken));

    let out = '\n';
    if (Object.keys(currNode).length === 0 || list.length === 0) {
      out += `  <cr>                 <cr>\n`;
    } else {
      list.forEach(([k, v]) => {
        out += `  ${k.padEnd(20, ' ')} ${v.desc || ''}\n`;
      });
      out += `  <cr>                 <cr>\n`;
    }

    return { helpText: out, currentLine: input };
  }

  execute(rawInput) {
    if (this.device.isPoweredOff) {
      return '% Device is powered off. Toggle power switch in Physical tab to boot device.';
    }
    const raw = rawInput.trim();
    if (!raw) return '';

    this.history.push(raw);
    this.historyIndex = this.history.length;

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (this.mode) {
      case 'USER':
        return this._handleUser(cmd, args, raw);
      case 'PRIVILEGED':
        return this._handlePrivileged(cmd, args, raw);
      case 'CONFIG':
        return this._handleConfig(cmd, args, raw);
      case 'CONFIG_IF':
        return this._handleConfigIf(cmd, args, raw);
      case 'CONFIG_ROUTER':
        return this._handleConfigRouter(cmd, args, raw);
      case 'CONFIG_VLAN':
        return this._handleConfigVlan(cmd, args, raw);
      default:
        return '% Unknown mode';
    }
  }

  _handleUser(cmd, args, raw) {
    if (cmd === 'en' || cmd === 'enable') {
      this.mode = 'PRIVILEGED';
      return '';
    }
    if (cmd === 'ping') {
      return this._handlePing(args);
    }
    if (cmd === 'traceroute' || cmd === 'trace') {
      return this._handleTraceroute(args);
    }
    if (cmd === 'exit' || cmd === 'quit') {
      return '\n[Connection to device closed]';
    }
    if (cmd === 'show' || cmd === 'sh') {
      const s1 = (args[0] || '').toLowerCase();
      const s2 = (args[1] || '').toLowerCase();
      if (s1 === 'clock') {
        return new Date().toString();
      }
      if (s1 === 'version' || s1 === 'ver') {
        return this._showVersion();
      }
      if (s1 === 'ip' && (s2 === 'int' || s2 === 'interface')) {
        return this._showIpInterfaceBrief();
      }
      return '% Incomplete command.';
    }

    return `% Invalid input detected at '^' marker.\n${raw}\n^`;
  }

  _handlePrivileged(cmd, args, raw) {
    if (cmd === 'disable') {
      this.mode = 'USER';
      return '';
    }
    if (cmd === 'conf' || cmd === 'config' || cmd === 'configure') {
      if (!args[0] || args[0].toLowerCase() === 't' || args[0].toLowerCase() === 'terminal') {
        this.mode = 'CONFIG';
        return `Enter configuration commands, one per line. End with CNTL/Z.`;
      }
      return '% Incomplete command.';
    }
    if (cmd === 'ping') {
      return this._handlePing(args);
    }
    if (cmd === 'traceroute' || cmd === 'trace') {
      return this._handleTraceroute(args);
    }
    if (cmd === 'reload') {
      return `Proceed with reload? [confirm]\n\nSystem Bootstrap, Version 15.1(4)M4\nRebooting device...\n\n${this.getBanner()}`;
    }
    if (cmd === 'clear') {
      if (args[0] === 'arp-cache' || args[0] === 'arp') {
        this.device.arpTable.clear();
        return '';
      }
      if (args[0] === 'mac-address-table' && this.device.macTable) {
        this.device.macTable.clear();
        return '';
      }
    }
    if (cmd === 'show' || cmd === 'sh') {
      const s1 = (args[0] || '').toLowerCase();
      const s2 = (args[1] || '').toLowerCase();
      if (s1 === 'clock') {
        return new Date().toString();
      }
      if (s1 === 'version' || s1 === 'ver') {
        return this._showVersion();
      }
      if (s1 === 'ip' && (s2 === 'int' || s2 === 'interface')) {
        return this._showIpInterfaceBrief();
      }
      if (s1 === 'ip' && s2 === 'route') {
        return this._showIpRoute();
      }
      if (s1 === 'mac' || s1 === 'mac-address-table') {
        return this._showMacTable();
      }
      if (s1 === 'vlan' && (s2 === 'brief' || s2 === 'br')) {
        return this._showVlanBrief();
      }
      if (s1 === 'run' || s1 === 'running-config') {
        return this._showRunningConfig();
      }
      if (s1 === 'start' || s1 === 'startup-config') {
        return this._showRunningConfig();
      }
      if (s1 === 'arp') {
        return this._showArp();
      }
      return '% Incomplete command.';
    }
    if (cmd === 'wr' || cmd === 'write' || (cmd === 'copy' && args[0] === 'run' && args[1] === 'start')) {
      return `Building configuration...\n[OK]`;
    }
    if (cmd === 'exit' || cmd === 'quit') {
      this.mode = 'USER';
      return '';
    }

    return `% Invalid input detected at '^' marker.\n${raw}\n^`;
  }

  _handleConfig(cmd, args, raw) {
    if (cmd === 'exit' || cmd === 'end') {
      this.mode = 'PRIVILEGED';
      return '';
    }
    if (cmd === 'hostname') {
      if (args[0]) {
        this.device.name = args[0];
        this.topology.emit('topology-changed');
        return '';
      }
      return '% Incomplete command.';
    }
    if (cmd === 'int' || cmd === 'interface') {
      if (!args[0]) return '% Incomplete command.';
      const iface = this.device.getInterface(args.join(''));
      if (iface) {
        this.currentInterface = iface;
        this.mode = 'CONFIG_IF';
        return '';
      }
      return `% Invalid interface type or number.`;
    }
    if (cmd === 'ip' && args[0] === 'route') {
      if (args.length >= 4 && this.device.type === 'router') {
        this.device.addRoute(args[1], args[2], args[3]);
        this.topology.emit('topology-changed');
        return '';
      }
      return '% Incomplete command.';
    }
    if (cmd === 'router' && args[0] === 'rip') {
      this.mode = 'CONFIG_ROUTER';
      return '';
    }
    if (cmd === 'vlan' && args[0]) {
      this.mode = 'CONFIG_VLAN';
      return '';
    }
    if (cmd === 'do') {
      const rest = args.join(' ');
      const privCLI = new CiscoIOSCLI(this.device, this.topology);
      privCLI.mode = 'PRIVILEGED';
      return privCLI.execute(rest);
    }

    return `% Invalid input detected at '^' marker.\n${raw}\n^`;
  }

  _handleConfigIf(cmd, args, raw) {
    if (cmd === 'exit') {
      this.mode = 'CONFIG';
      this.currentInterface = null;
      return '';
    }
    if (cmd === 'end') {
      this.mode = 'PRIVILEGED';
      this.currentInterface = null;
      return '';
    }
    if (cmd === 'no') {
      if (args[0] === 'shut' || args[0] === 'shutdown') {
        if (this.currentInterface) {
          this.currentInterface.isUp = true;
          this.topology.emit('topology-changed');
          return `%LINK-5-CHANGED: Interface ${this.currentInterface.name}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentInterface.name}, changed state to up`;
        }
      }
      if (args[0] === 'ip' && (args[1] === 'add' || args[1] === 'address')) {
        if (this.currentInterface) {
          this.currentInterface.ip = '';
          this.topology.emit('topology-changed');
          return '';
        }
      }
      return '% Incomplete command.';
    }
    if (cmd === 'shut' || cmd === 'shutdown') {
      if (this.currentInterface) {
        this.currentInterface.isUp = false;
        this.topology.emit('topology-changed');
        return `%LINK-5-CHANGED: Interface ${this.currentInterface.name}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentInterface.name}, changed state to down`;
      }
    }
    if (cmd === 'ip' && (args[0] === 'add' || args[0] === 'address')) {
      const ip = args[1];
      const mask = args[2] || '255.255.255.0';
      if (IPUtils.isValidIP(ip) && IPUtils.isValidIP(mask)) {
        if (this.currentInterface) {
          this.currentInterface.ip = ip;
          this.currentInterface.mask = mask;
          this.topology.emit('topology-changed');
          return '';
        }
      }
      return '% Invalid input detected (bad IP address or subnet mask).';
    }
    if (cmd === 'description') {
      return '';
    }
    if (cmd === 'duplex' || cmd === 'speed') {
      return '';
    }
    if (cmd === 'switchport') {
      return '';
    }
    if (cmd === 'do') {
      const rest = args.join(' ');
      const privCLI = new CiscoIOSCLI(this.device, this.topology);
      privCLI.mode = 'PRIVILEGED';
      return privCLI.execute(rest);
    }

    return `% Invalid input detected at '^' marker.\n${raw}\n^`;
  }

  _handleConfigRouter(cmd, args, raw) {
    if (cmd === 'exit') {
      this.mode = 'CONFIG';
      return '';
    }
    if (cmd === 'end') {
      this.mode = 'PRIVILEGED';
      return '';
    }
    if (cmd === 'network') {
      if (args[0]) {
        this.device.ripNetworks = this.device.ripNetworks || [];
        if (!this.device.ripNetworks.includes(args[0])) {
          this.device.ripNetworks.push(args[0]);
          this.topology.emit('topology-changed');
        }
        return '';
      }
      return '% Incomplete command.';
    }
    if (cmd === 'no' && args[0] === 'network' && args[1]) {
      this.device.ripNetworks = this.device.ripNetworks || [];
      const idx = this.device.ripNetworks.indexOf(args[1]);
      if (idx !== -1) {
        this.device.ripNetworks.splice(idx, 1);
        this.topology.emit('topology-changed');
      }
      return '';
    }
    if (cmd === 'version') {
      return '';
    }
    if (cmd === 'no' && args[0] === 'auto-summary') {
      return '';
    }
    if (cmd === 'do') {
      const rest = args.join(' ');
      const privCLI = new CiscoIOSCLI(this.device, this.topology);
      privCLI.mode = 'PRIVILEGED';
      return privCLI.execute(rest);
    }

    return `% Invalid input detected at '^' marker.\n${raw}\n^`;
  }

  _handleConfigVlan(cmd, args, raw) {
    if (cmd === 'exit') {
      this.mode = 'CONFIG';
      this.currentVlan = null;
      return '';
    }
    if (cmd === 'end') {
      this.mode = 'PRIVILEGED';
      this.currentVlan = null;
      return '';
    }
    if (cmd === 'name') {
      if (args[0] && this.currentVlan) {
        this.currentVlan.name = args[0];
        this.topology.emit('topology-changed');
        return '';
      }
    }

    return `% Invalid input detected at '^' marker.\n${raw}\n^`;
  }

  _showVersion() {
    const isRouter = this.device.type === 'router';
    const model = this.device.model || (isRouter ? '2911' : '2960');
    return `Cisco IOS Software, C${model} Software (C${model}-UNIVERSALK9-M), Version 15.1(4)M4
ROM: System Bootstrap, Version 15.1(4)M4
${this.device.name} uptime is 42 minutes
System image file is "flash0:c${model}-universalk9-mz.SPA.151-4.M4.bin"

Cisco CISCO${model}/K9 processor with 514048K/10240K bytes of memory.
${this.device.interfaces.length} Interfaces
Configuration register is 0x2102`;
  }

  _showIpInterfaceBrief() {
    let out = 'Interface              IP-Address      OK? Method Status                Protocol\n';
    for (const iface of this.device.interfaces) {
      if (this.device.type === 'switch' && !iface.connectedCable && parseInt(iface.name.split('/')[1] || '0', 10) > 4) {
        continue;
      }
      const name = iface.name.padEnd(23, ' ');
      const ip = (iface.ip || 'unassigned').padEnd(16, ' ');
      const ok = 'YES'.padEnd(4, ' ');
      const method = (iface.ip ? 'manual' : 'unset').padEnd(7, ' ');
      const status = (iface.isUp ? (iface.isPhysicalUp ? 'up' : 'down') : 'administratively down').padEnd(22, ' ');
      const proto = iface.isPhysicalUp ? 'up' : 'down';
      out += `${name}${ip}${ok}${method}${status}${proto}\n`;
    }
    return out.trimEnd();
  }

  _showIpRoute() {
    let out = `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP\n\nGateway of last resort is not set\n\n`;
    for (const iface of this.device.interfaces) {
      if (iface.isPhysicalUp && iface.ip && iface.mask) {
        const net = IPUtils.formatIP(IPUtils.parseIP(iface.ip) & IPUtils.parseIP(iface.mask));
        out += `C    ${net}/24 is directly connected, ${iface.name}\n`;
        out += `L    ${iface.ip}/32 is directly connected, ${iface.name}\n`;
      }
    }
    if (this.device.routingTable) {
      for (const r of this.device.routingTable) {
        out += `S    ${r.destination}/24 [1/0] via ${r.nextHop}\n`;
      }
    }
    return out.trimEnd();
  }

  _showMacTable() {
    if (this.device.type !== 'switch') return '% Not a switch device.';
    let out = `          Mac Address Table\n-------------------------------------------\n\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n`;
    for (const [mac, info] of this.device.macTable.entries()) {
      out += `   1    ${mac}    DYNAMIC     ${info.port}\n`;
    }
    if (this.device.macTable.size === 0) {
      out += ` (No dynamic entries learned yet)\n`;
    }
    return out.trimEnd();
  }

  _showVlanBrief() {
    return `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/1, Fa0/2, Fa0/3, Fa0/4, Fa0/5
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup`;
  }

  _showArp() {
    let out = `Protocol  Address          Age (min)  Hardware Addr   Type   Interface\n`;
    for (const iface of this.device.interfaces) {
      if (iface.ip) {
        out += `Internet  ${iface.ip.padEnd(16, ' ')}         -   ${iface.mac}  ARPA   ${iface.name}\n`;
      }
    }
    return out.trimEnd();
  }

  _showRunningConfig() {
    let out = `Building configuration...\n\nCurrent configuration : 1150 bytes\n!\nversion 15.1\nno service password-encryption\n!\nhostname ${this.device.name}\n!\n`;
    for (const iface of this.device.interfaces) {
      if (iface.connectedCable || iface.ip || !iface.isUp) {
        out += `interface ${iface.name}\n`;
        if (iface.ip) {
          out += ` ip address ${iface.ip} ${iface.mask}\n`;
        } else {
          out += ` no ip address\n`;
        }
        if (!iface.isUp) {
          out += ` shutdown\n`;
        }
        out += ` duplex auto\n speed auto\n!\n`;
      }
    }
    if (this.device.routingTable && this.device.routingTable.length > 0) {
      this.device.routingTable.forEach(r => {
        out += `ip route ${r.destination} ${r.mask} ${r.nextHop}\n`;
      });
      out += `!\n`;
    }
    out += `end`;
    return out;
  }

  _handlePing(args) {
    if (!args[0]) return '% Incomplete command.';
    const target = args[0];
    if (!IPUtils.isValidIP(target)) {
      return `% Unrecognized host or address: ${target}`;
    }
    setTimeout(() => {
      this.topology.simulatePing(this.device.id, target);
    }, 50);
    return `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5)`;
  }

  _handleTraceroute(args) {
    if (!args[0]) return '% Incomplete command.';
    const target = args[0];
    return `Type escape sequence to abort.\nTracing the route to ${target}\n  1 ${target} 1 msec 1 msec 1 msec`;
  }
}
