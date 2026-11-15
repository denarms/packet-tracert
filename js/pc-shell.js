/**
 * Packet Tracer PC "Command Prompt" emulation backed by the simulation engine.
 */

import { IPUtils } from './engine.js';
import { CiscoIOSCLI } from './ios-cli.js';

const PROMPT = 'C:\\>';

export class PCShell {
  constructor(device, topology) {
    this.device = device;
    this.topology = topology;
    this.transcript = `\nCisco Packet Tracer PC Command Line 1.0\n`;
    this.history = [];
    this.historyIndex = 0;
    this.onOutput = null;
    this.busy = false;
    this.remote = null; // telnet session
    this.abort = null;
  }

  print(t) {
    this.transcript += t;
    if (this.transcript.length > 200000) this.transcript = this.transcript.slice(-150000);
    if (this.onOutput) this.onOutput();
  }

  getPrompt() {
    if (this.remote) return this.remote.getPrompt();
    return this.busy ? '' : PROMPT;
  }

  get isPasswordInput() {
    return !!(this.remote && this.remote.isPasswordInput);
  }

  clear() {
    this.transcript = '';
    if (this.onOutput) this.onOutput();
  }

  ctrlC(current = '') {
    if (this.abort) this.abort.aborted = true;
    if (this.remote) this.remote.ctrlC(current);
    else if (!this.busy) this.print(`${PROMPT}${current}^C\n`);
  }

  ctrlZ() {
    if (this.remote) this.remote.ctrlZ();
  }

  // '?' help and Tab completion only exist inside a telnet session
  get state() {
    return this.remote ? this.remote.state : 'shell';
  }

  help(input) {
    if (this.remote) this.remote.help(input);
  }

  complete(input) {
    return this.remote ? this.remote.complete(input) : input;
  }

  async handleLine(raw) {
    if (this.remote) {
      await this.remote.handleLine(raw);
      return;
    }
    if (this.busy) return;
    this.print(`${PROMPT}${raw}\n`);
    const line = raw.trim();
    if (line) {
      this.history.push(line);
      this.historyIndex = this.history.length;
    }
    this.busy = true;
    try {
      await this.run(line);
      if (!this.remote && line && line.toLowerCase() !== 'cls') this.print('\n');
    } catch (e) {
      console.error(e);
      this.print(`\nError: ${e.message}\n`);
    } finally {
      this.busy = false;
    }
  }

  async run(line) {
    if (!line) return;
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const dev = this.device;
    const iface = dev.interfaces[0];

    switch (cmd) {
      case '?':
      case 'help':
        this.print(`Available Commands:
?           Display the list of available commands
arp         Display the arp table
cls         Clear screen
dir         Display the list of files in C: directory
exit        Quits the CMD.EXE program (command interpreter)
ipconfig    Display network configuration
netstat     Displays protocol statistics and current TCP/IP network connections
nslookup    DNS Lookup
ping        Send echo messages
ssh         Ssh client
telnet      Telnet client
tracert     Trace route to destination
`);
        return;
      case 'cls':
        this.transcript = '';
        return;
      case 'dir':
        this.print(`\nVolume in drive C has no label.\nVolume Serial Number is 5E12-4AF3\nDirectory of C:\\\n\n1/1/1970   4:0 PM               ${(dev._savedText || '').length}          sampleFile.txt\n               ${(dev._savedText || '').length} bytes          1 File(s)\n`);
        return;
      case 'ipconfig':
        return this.ipconfig(parts.slice(1).map(p => p.toLowerCase()));
      case 'ping':
        return this.ping(parts.slice(1));
      case 'tracert':
        return this.tracert(parts[1]);
      case 'arp':
        if (parts[1] === '-a') {
          if (!dev.arpTable.size) {
            this.print('No ARP Entries Found\n');
            return;
          }
          this.print(`\n  Internet Address      Physical Address      Type\n`);
          for (const [ip, e] of dev.arpTable) this.print(`  ${ip.padEnd(22)}${e.mac.padEnd(22)}dynamic\n`);
          return;
        }
        if (parts[1] === '-d') {
          dev.arpTable.clear();
          return;
        }
        this.print('\nARP -a: display ARP table\nARP -d: clear ARP table\n');
        return;
      case 'netstat':
        this.print('\nActive Connections\n\n  Proto  Local Address          Foreign Address        State\n');
        return;
      case 'nslookup':
        this.print(`\nServer: [${dev.dns || '0.0.0.0'}]\nAddress:  ${dev.dns || '0.0.0.0'}\n\n*** UnKnown can't find ${parts[1] || ''}: Non-existent domain\n`);
        return;
      case 'telnet':
        return this.telnet(parts[1]);
      case 'ssh':
        if (parts[1] !== '-l' || !parts[3]) {
          this.print('\nUsage: SSH -l username target\n');
          return;
        }
        this.print(`\nTrying ${parts[3]} ...\n% Connection refused by remote host\n`);
        return;
      case 'exit':
        return;
      default:
        this.print(`Invalid Command.\n`);
    }
  }

  async ipconfig(args) {
    const dev = this.device;
    const iface = dev.interfaces[0];
    if (args[0] === '/release') {
      if (dev.ipType !== 'dhcp') {
        this.print('\nThe operation failed as no adapter is in the state permissible for\nthis operation.\n');
        return;
      }
      iface.ip = '';
      iface.mask = '0.0.0.0';
      dev.gateway = '';
      dev.dns = '0.0.0.0';
      this.topology.emit('topology-changed');
      this.print(`\n   IP Address......................: 0.0.0.0\n   Subnet Mask.....................: 0.0.0.0\n   Default Gateway.................: 0.0.0.0\n   DNS Server......................: 0.0.0.0\n`);
      return;
    }
    if (args[0] === '/renew') {
      if (dev.ipType !== 'dhcp') {
        this.print('\nThe operation failed as no adapter is in the state permissible for\nthis operation.\n');
        return;
      }
      const lease = await this.topology.requestDHCP(dev);
      if (!lease) {
        this.print('\nDHCP request failed. \n');
        return;
      }
      this.print(`\n   IP Address......................: ${iface.ip}\n   Subnet Mask.....................: ${iface.mask}\n   Default Gateway.................: ${dev.gateway || '0.0.0.0'}\n   DNS Server......................: ${dev.dns || '0.0.0.0'}\n`);
      return;
    }
    const all = args[0] === '/all';
    const ll = linkLocal(iface.mac);
    this.print(`\nFastEthernet0 Connection:(default port)\n\n`);
    if (all) {
      this.print(`   Connection-specific DNS Suffix..: \n   Physical Address................: ${iface.mac.toUpperCase()}\n   Link-local IPv6 Address.........: ${ll}\n   IPv6 Address....................: ::\n   IPv4 Address....................: ${iface.ip || '0.0.0.0'}\n   Subnet Mask.....................: ${iface.ip ? iface.mask : '0.0.0.0'}\n   Default Gateway.................: ::\n                                     ${dev.gateway || '0.0.0.0'}\n   DHCP Servers....................: 0.0.0.0\n   DHCPv6 IAID.....................: \n   DHCPv6 Client DUID..............: 00-01-00-01-${iface.mac.replace(/\./g, '').toUpperCase().match(/../g).join('-')}\n   DNS Servers.....................: ::\n                                     ${dev.dns || '0.0.0.0'}\n`);
    } else {
      this.print(`   Connection-specific DNS Suffix..: \n   Link-local IPv6 Address.........: ${ll}\n   IPv6 Address....................: ::\n   IPv4 Address....................: ${iface.ip || '0.0.0.0'}\n   Subnet Mask.....................: ${iface.ip ? iface.mask : '0.0.0.0'}\n   Default Gateway.................: ::\n                                     ${dev.gateway || '0.0.0.0'}\n`);
    }
    this.print(`\nBluetooth Connection:\n\n   Connection-specific DNS Suffix..: \n   Link-local IPv6 Address.........: ::\n   IPv6 Address....................: ::\n   IPv4 Address....................: 0.0.0.0\n   Subnet Mask.....................: 0.0.0.0\n   Default Gateway.................: ::\n                                     0.0.0.0\n`);
  }

  async ping(args) {
    let count = 4;
    let target = null;
    let forever = false;
    for (let k = 0; k < args.length; k++) {
      if (args[k] === '-n') count = parseInt(args[++k], 10) || 4;
      else if (args[k] === '-t') forever = true;
      else target = args[k];
    }
    if (!target) {
      this.print(`\nPacket Tracer PC Ping\n\nUsage: ping [-n count] [-t] target_name\n`);
      return;
    }
    if (!IPUtils.isValidIP(target)) {
      this.print(`Ping request could not find host ${target}. Please check the name and try again.\n`);
      return;
    }
    this.print(`\nPinging ${target} with 32 bytes of data:\n\n`);
    const signal = { aborted: false };
    this.abort = signal;
    let sent = 0, recv = 0;
    const times = [];
    await this.topology.ping(this.device, target, forever ? 1000 : count, async (n, res) => {
      sent++;
      if (res.result === 'reply') {
        recv++;
        const t = Math.floor(Math.random() * 2);
        times.push(t);
        this.print(`Reply from ${target}: bytes=32 time${t === 0 ? '<1' : '=' + t}ms TTL=${res.ttl}\n`);
      } else if (res.result === 'unreachable') {
        this.print(`Reply from ${res.from}: Destination host unreachable.\n`);
      } else if (res.result === 'ttl') {
        this.print(`Reply from ${res.from}: TTL expired in transit.\n`);
      } else {
        await sleep(500);
        this.print('Request timed out.\n');
      }
    }, { signal });
    this.abort = null;
    if (signal.aborted) this.print('Control-C\n^C\n');
    const lost = sent - recv;
    this.print(`\nPing statistics for ${target}:\n    Packets: Sent = ${sent}, Received = ${recv}, Lost = ${lost} (${sent ? Math.round(lost / sent * 100) : 0}% loss),\n`);
    if (recv) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      this.print(`Approximate round trip times in milli-seconds:\n    Minimum = ${Math.min(...times)}ms, Maximum = ${Math.max(...times)}ms, Average = ${avg}ms\n`);
    }
  }

  async tracert(target) {
    if (!target || !IPUtils.isValidIP(target)) {
      this.print(`\nUsage: tracert target_name\n`);
      return;
    }
    this.print(`\nTracing route to ${target} over a maximum of 30 hops: \n\n`);
    await this.topology.traceroute(this.device, target, (ttl, probes, from) => {
      const cols = probes.map(p => p.result === 'timeout' ? '*' : `${Math.floor(Math.random() * 2)} ms`);
      this.print(`  ${String(ttl).padEnd(4)}${cols.map(c => c.padEnd(10)).join('')}${from || 'Request timed out.'}\n`);
    });
    this.print('\nTrace complete.\n');
  }

  async telnet(target) {
    if (!target || !IPUtils.isValidIP(target)) {
      this.print('\nUsage: telnet target [port]\n');
      return;
    }
    this.print(`Trying ${target} ...`);
    const res = this.topology.echo(this.device, target);
    await this.topology._animate(res.anim, 'ICMP');
    const remoteDev = res.result === 'reply' ? this.topology.getDeviceByIP(target) : null;
    if (!remoteDev || (remoteDev.type !== 'router' && remoteDev.type !== 'switch') || remoteDev.isHub) {
      await sleep(600);
      this.print(`\n% Connection timed out; remote host not responding\n`);
      return;
    }
    this.print('Open');
    const cli = new CiscoIOSCLI(remoteDev, this.topology, { vty: true });
    cli.print = (t) => this.print(t);
    const close = () => {
      this.remote = null;
      this.print(`\n[Connection to ${target} closed by foreign host]\n\n`);
    };
    cli.onClose = close;
    if (!cli.startVty()) {
      this.print(`\n[Connection to ${target} closed by foreign host]\n`);
      return;
    }
    this.remote = cli;
  }
}

function linkLocal(mac) {
  const h = mac.replace(/\./g, '');
  const b = (parseInt(h.slice(0, 2), 16) ^ 2).toString(16).padStart(2, '0');
  const s = `${b}${h.slice(2, 6)}fffe${h.slice(6)}`;
  return `FE80::${parseInt(s.slice(0, 4), 16).toString(16)}:${parseInt(s.slice(4, 8), 16).toString(16)}:${parseInt(s.slice(8, 12), 16).toString(16)}:${parseInt(s.slice(12, 16), 16).toString(16)}`.toUpperCase();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
