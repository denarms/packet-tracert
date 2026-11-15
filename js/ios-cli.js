/**
 * Cisco IOS command line interpreter.
 *
 * Grammar-driven: every mode has a command tree of keywords and typed arguments,
 * which gives IOS-accurate abbreviation matching, '?' help, Tab completion and
 * error reporting ("% Invalid input detected at '^' marker.", "% Ambiguous command",
 * "% Incomplete command."). Configuration commands mutate the device model in
 * engine.js so the simulation reflects them immediately.
 */

import { IPUtils, parseIfaceRef, shortIfaceName, abbrevIfaceName, NetworkTopology, isRouting } from './engine.js';

/* ========================================================================== */
/* Grammar helpers                                                            */
/* ========================================================================== */

const kw = (word, desc, children = [], run = null, when = null) => ({ word, desc, children, run, when });
const arg = (type, label, desc, children = [], run = null, extra = {}) => ({ arg: type, label, desc, children, run, ...extra });

function matchArg(node, tokens, i) {
  const t = tokens[i];
  switch (node.arg) {
    case 'ip':
      return IPUtils.isValidIP(t) ? { n: 1, value: t } : null;
    case 'num': {
      if (!/^\d+$/.test(t)) return null;
      const v = parseInt(t, 10);
      if (node.min != null && v < node.min) return null;
      if (node.max != null && v > node.max) return null;
      return { n: 1, value: v };
    }
    case 'word':
      return { n: 1, value: t };
    case 'line':
      return { n: tokens.length - i, value: tokens.slice(i).join(' ') };
    case 'iface': {
      if (parseIfaceRef(t)) return { n: 1, value: t };
      if (/^[a-zA-Z-]+$/.test(t) && tokens[i + 1] && /^\d/.test(tokens[i + 1]) && parseIfaceRef(t + tokens[i + 1])) {
        return { n: 2, value: t + tokens[i + 1] };
      }
      return null;
    }
    default:
      return null;
  }
}

/* ========================================================================== */
/* Cisco password helpers                                                     */
/* ========================================================================== */

const TYPE7_KEY = 'dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87';

function type7(pw) {
  const seed = Math.floor(Math.random() * 15) + 1;
  let out = String(seed).padStart(2, '0');
  for (let i = 0; i < pw.length; i++) {
    out += (pw.charCodeAt(i) ^ TYPE7_KEY.charCodeAt((seed + i) % TYPE7_KEY.length)).toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

function md5ish(pw) {
  const chars = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let h = 2166136261;
  let out = '';
  for (let k = 0; k < 22; k++) {
    for (let i = 0; i < pw.length; i++) h = Math.imul(h ^ pw.charCodeAt(i) ^ k, 16777619) >>> 0;
    out += chars[h % 64];
  }
  return `$1$mERr$${out}`;
}

/* ========================================================================== */
/* Version strings                                                            */
/* ========================================================================== */

function iosImage(dev) {
  const m = String(dev.model);
  if (dev.type === 'switch') {
    if (m.startsWith('3650')) return { family: 'CAT3K_CAA', img: 'CAT3K_CAA-UNIVERSALK9-M', ver: '16.3.2', file: 'cat3k_caa-universalk9.16.03.02.SPA.bin', proc: 'WS-C3650-24PS', mem: '4194304K' };
    if (m.startsWith('IE')) return { family: 'IE2000', img: 'IE2000-UNIVERSALK9-M', ver: '15.2(4)EA', file: 'ie2000-universalk9-mz.152-4.EA.bin', proc: 'IE-2000-8TC-G-B', mem: '262144K' };
    if (m.startsWith('2960')) return { family: 'C2960', img: 'C2960-LANBASEK9-M', ver: '15.0(2)SE4', file: 'c2960-lanbasek9-mz.150-2.SE4.bin', proc: 'WS-C2960-24TT-L', mem: '65536K' };
    if (m.startsWith('3560')) return { family: 'C3560', img: 'C3560-IPSERVICESK9-M', ver: '12.2(37)SE1', file: 'c3560-ipservicesk9-mz.122-37.SE1.bin', proc: 'WS-C3560-24PS', mem: '122880K' };
    if (m.startsWith('2950')) return { family: 'C2950', img: 'C2950-I6Q4L2-M', ver: '12.1(22)EA4', file: 'c2950-i6q4l2-mz.121-22.EA4.bin', proc: 'WS-C2950-24', mem: '19911K' };
    return { family: 'PT3000', img: 'PT3000-I6Q4L2-M', ver: '12.1(22)EA4', file: 'pt3000-i6q4l2-mz.121-22.EA4.bin', proc: 'PT3000', mem: '19911K' };
  }
  if (m.startsWith('19')) return { family: 'C1900', img: 'C1900-UNIVERSALK9-M', ver: '15.1(4)M4', file: 'c1900-universalk9-mz.SPA.151-1.M4.bin', proc: `CISCO${m}/K9`, mem: '491520K/32768K' };
  if (m.startsWith('29')) return { family: 'C2900', img: 'C2900-UNIVERSALK9-M', ver: '15.1(4)M4', file: 'c2900-universalk9-mz.SPA.151-4.M4.bin', proc: `CISCO${m}/K9`, mem: '491520K/32768K' };
  if (m === '1841') return { family: '1841', img: 'C1841-ADVIPSERVICESK9-M', ver: '12.4(15)T1', file: 'c1841-advipservicesk9-mz.124-15.T1.bin', proc: 'Cisco 1841', mem: '114688K/16384K' };
  if (m.startsWith('28')) return { family: 'C2800', img: 'C2800NM-ADVIPSERVICESK9-M', ver: '12.4(15)T1', file: 'c2800nm-advipservicesk9-mz.124-15.T1.bin', proc: `Cisco ${m}`, mem: '249856K/12288K' };
  if (m.startsWith('26')) return { family: 'C2600', img: 'C2600-I-M', ver: '12.2(28)', file: 'c2600-i-mz.122-28.bin', proc: `Cisco ${m}`, mem: '60416K/5120K' };
  if (m.startsWith('43')) return { family: 'ISR4300', img: 'X86_64_LINUX_IOSD-UNIVERSALK9-M', ver: '16.9.4', file: 'isr4300-universalk9.16.09.04.SPA.bin', proc: `ISR${m}/K9`, mem: '1795979K/6147K' };
  return { family: 'PT1000', img: 'PT1000-I-M', ver: '12.2(28)', file: 'pt1000-i-mz.122-28.bin', proc: 'PT 1001 (PTSC2005)', mem: '60416K/5120K' };
}

/* ========================================================================== */
/* CLI                                                                        */
/* ========================================================================== */

const MODE_PROMPTS = {
  USER: '>', PRIVILEGED: '#', CONFIG: '(config)#', CONFIG_IF: '(config-if)#', CONFIG_SUBIF: '(config-subif)#',
  CONFIG_IF_RANGE: '(config-if-range)#', CONFIG_ROUTER: '(config-router)#', CONFIG_VLAN: '(config-vlan)#',
  CONFIG_LINE: '(config-line)#', CONFIG_DHCP: '(dhcp-config)#'
};

export class CiscoIOSCLI {
  constructor(device, topology, opts = {}) {
    this.device = device;
    this.topology = topology;
    this.mode = 'USER';
    this.state = 'press-return'; // press-return | login-user | login | enable-password | confirm | busy | ready
    this.ctx = {};
    this.history = [];
    this.historyIndex = 0;
    this.transcript = '';
    this.onOutput = null;
    this.onClose = null;
    this.pending = null;
    this.vty = !!opts.vty;
    this.lineKey = this.vty ? 'lineVty' : 'lineCon';
    if (!this.vty) this.print(this.getBootOutput());
    this.initTrees();
  }

  /** Telnet session start. Returns false if the line refuses the connection. */
  startVty() {
    const l = this.device.lineVty;
    if (l && l.login === false) {
      this.state = 'ready';
      return true;
    }
    if (!l || (!l.password && !l.loginLocal)) {
      this.print('\n\nUser Access Verification\n\nPassword required, but none set\n');
      return false;
    }
    if (l.motd !== false && this.device.bannerMotd) this.print(`${this.device.bannerMotd}\n`);
    this.print('\nUser Access Verification\n\n');
    this.ctx = { tries: 0 };
    this.state = l.loginLocal ? 'login-user' : 'login';
    return true;
  }

  /* ------------------------------ Output ---------------------------------- */

  print(text) {
    this.transcript += text;
    if (this.transcript.length > 200000) this.transcript = this.transcript.slice(-150000);
    if (this.onOutput) this.onOutput();
  }

  get dev() { return this.device; }
  get isRouter() { return this.device.type === 'router'; }
  get isSwitch() { return this.device.type === 'switch'; }
  get isL3() { return this.isRouter || this.device.isMultilayer === true; }

  getBanner() { return this.transcript; }

  getBootOutput() {
    const im = iosImage(this.device);
    if (this.isSwitch) {
      return `C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)
Cisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.
2960-24TT starting...
Base ethernet MAC Address: ${this.device.interfaces[0].mac.toUpperCase()}
Xmodem file system is available.
Initializing Flash...
flashfs[0]: 2 files, 0 directories
Loading "flash:/${im.file}"...
########################################################################## [OK]

              Restricted Rights Legend

Cisco IOS Software, ${im.family} Software (${im.img}), Version ${im.ver}, RELEASE SOFTWARE (fc1)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 1986-2013 by Cisco Systems, Inc.

${this.device.interfaces.filter(i => i.type === 'FastEthernet').length} FastEthernet/IEEE 802.3 interface(s)

Press RETURN to get started!

`;
    }
    return `System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 2010 by cisco Systems, Inc.
Total memory size = 512 MB - On-board = 512 MB, DIMM0 = 0 MB
CISCO${this.device.model}/K9 platform with 524288 Kbytes of main memory
Main memory is configured to 72/-1(On-board/DIMM0) bit mode with ECC disabled

Readonly ROMMON initialized
program load complete, entry point: 0x80803000, size: 0x1b340
program load complete, entry point: 0x80803000, size: 0x1b340

IOS Image Load Test
___________________
Digitally Signed Release Software
program load complete, entry point: 0x81000000, size: 0x3bcd3d8
Self decompressing the image :
########################################################################## [OK]

Cisco IOS Software, ${im.family} Software (${im.img}), Version ${im.ver}, RELEASE SOFTWARE (fc2)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 1986-2012 by Cisco Systems, Inc.
Compiled Thu 26-Jul-12 20:54 by prod_rel_team

Cisco ${im.proc} (revision 1.0) with ${im.mem} bytes of memory.
${this.device.interfaces.filter(i => i.type === 'GigabitEthernet' && !i.isVirtual).length} Gigabit Ethernet interfaces
${this.device.interfaces.filter(i => i.type === 'Serial').length} Low-speed serial(sync/async) network interface(s)
DRAM configuration is 64 bits wide with parity disabled.
255K bytes of non-volatile configuration memory.
249856K bytes of ATA System CompactFlash 0 (Read/Write)


         --- System Configuration Dialog ---

Would you like to enter the initial configuration dialog? [yes/no]: no


Press RETURN to get started!

`;
  }

  getPrompt() {
    if (this.device.isPoweredOff) return '';
    if (this.state === 'press-return' || this.state === 'busy' || this.state === 'closed') return '';
    if (this.state === 'login-user') return 'Username: ';
    if (this.state === 'login' || this.state === 'enable-password') return 'Password: ';
    if (this.state === 'confirm') return this.pending.prompt;
    return (this.device.hostname || 'Router') + MODE_PROMPTS[this.mode];
  }

  get isPasswordInput() {
    return this.state === 'login' || this.state === 'enable-password';
  }

  /* ------------------------------ Input ----------------------------------- */

  async handleLine(raw) {
    const dev = this.device;
    if (dev.isPoweredOff) return;
    const prompt = this.getPrompt();

    if (this.state === 'busy') return;

    if (this.state === 'press-return') {
      this.print('\n');
      this._startSession();
      return;
    }

    if (this.state === 'login-user') {
      this.print(`Username: ${raw}\n`);
      this.ctx.user = raw.trim();
      this.state = 'login';
      return;
    }

    if (this.state === 'login') {
      this.print('\n');
      const line = dev[this.lineKey] || {};
      const ok = line.loginLocal
        ? (dev.users || []).some(u => u.name === this.ctx.user && u.password === raw)
        : raw === line.password;
      if (ok) {
        this.state = 'ready';
        this.mode = 'USER';
        this.print('\n');
      } else if (++this.ctx.tries >= 3) {
        this.print(line.loginLocal ? '% Login invalid\n\n' : '% Bad passwords\n\n');
        if (this.vty) { this.state = 'closed'; if (this.onClose) this.onClose(); return; }
        this.state = 'press-return';
        this.print('\nPress RETURN to get started.\n');
      } else {
        this.print(line.loginLocal ? '% Login invalid\n\n' : '\n');
        if (line.loginLocal) this.state = 'login-user';
      }
      return;
    }

    if (this.state === 'enable-password') {
      this.print('\n');
      const ok = dev.enableSecret ? raw === dev.enableSecret : raw === dev.enablePassword;
      if (ok) {
        this.state = 'ready';
        this.mode = 'PRIVILEGED';
      } else if (++this.ctx.tries >= 3) {
        this.state = 'ready';
        this.print('% Bad secrets\n\n');
      }
      return;
    }

    if (this.state === 'confirm') {
      this.print(`${prompt}${raw}\n`);
      const p = this.pending;
      this.pending = null;
      this.state = 'ready';
      await p.onAnswer(raw.trim());
      return;
    }

    this.print(`${prompt}${raw}\n`);
    const line = raw.trim();
    if (!line) return;
    this.history.push(line);
    if (this.history.length > 20) this.history.shift();
    this.historyIndex = this.history.length;

    this.state = 'busy';
    try {
      const before = this.isRouter ? this._ospfNbrKeys() : null;
      const out = await this.execute(line, raw);
      if (out) this.print(out.endsWith('\n') ? out : out + '\n');
      if (before) this._reportAdjacency(before);
    } catch (e) {
      console.error(e);
      this.print(`% Internal error: ${e.message}\n`);
    } finally {
      if (this.state === 'busy') this.state = 'ready';
    }
  }

  _startSession() {
    const dev = this.device;
    if (dev.bannerMotd) this.print(`${dev.bannerMotd}\n`);
    if (dev.lineCon && dev.lineCon.login && dev.lineCon.password) {
      this.print('\nUser Access Verification\n\n');
      this.state = 'login';
      this.ctx = { tries: 0 };
      return;
    }
    this.state = 'ready';
    this.mode = 'USER';
  }

  ctrlZ() {
    if (this.state !== 'ready') return;
    if (this.mode !== 'USER' && this.mode !== 'PRIVILEGED') {
      this.print(`${this.getPrompt()}^Z\n`);
      this.mode = 'PRIVILEGED';
      this.ctx = {};
      this.print('%SYS-5-CONFIG_I: Configured from console by console\n\n');
    }
  }

  ctrlC(current) {
    this.print(`${this.getPrompt()}${current}^C\n`);
    if (this.state === 'confirm') {
      this.pending = null;
      this.state = 'ready';
    }
  }

  ask(prompt, onAnswer) {
    this.pending = { prompt, onAnswer };
    this.state = 'confirm';
  }

  /* ------------------------------ Parsing --------------------------------- */

  treeFor(mode) {
    if (mode === 'CONFIG_SUBIF' || mode === 'CONFIG_IF_RANGE') return this.trees.CONFIG_IF;
    if (mode === 'CONFIG_ROUTER') return this.ctx.proto === 'ospf' ? this.trees.CONFIG_OSPF : this.trees.CONFIG_RIP;
    return this.trees[mode];
  }

  _visible(children) {
    return children.filter(c => !c.when || c.when(this));
  }

  parse(tokens, tree) {
    let node = { children: tree };
    const values = [];
    for (let i = 0; i < tokens.length;) {
      const tok = tokens[i];
      const kids = this._visible(node.children);
      const lower = tok.toLowerCase();
      const exact = kids.find(c => c.word && c.word.toLowerCase() === lower);
      const kwMatches = exact ? [exact] : kids.filter(c => c.word && c.word.toLowerCase().startsWith(lower));
      if (kwMatches.length === 1) {
        node = kwMatches[0];
        i++;
        continue;
      }
      let matched = false;
      for (const a of kids.filter(c => c.arg)) {
        const m = matchArg(a, tokens, i);
        if (m) {
          values.push(m.value);
          node = a;
          i += m.n;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      if (kwMatches.length > 1) return { error: 'ambiguous', at: i };
      return { error: 'invalid', at: i };
    }
    if (!node.run) return { error: 'incomplete' };
    return { node, values };
  }

  _caret(raw, tokenIndex) {
    const re = /\S+/g;
    let m, k = 0, pos = 0;
    while ((m = re.exec(raw))) {
      if (k === tokenIndex) { pos = m.index; break; }
      k++;
    }
    return ' '.repeat(this.getPrompt().length + pos) + '^\n% Invalid input detected at \'^\' marker.\n';
  }

  async execute(line, raw = line, modeOverride = null) {
    const tokens = line.split(/\s+/).filter(Boolean);
    const mode = modeOverride || this.mode;
    let res = this.parse(tokens, this.treeFor(mode));

    // Sub-config modes fall back to global configuration (IOS behaviour)
    if (res.error && !modeOverride && !['USER', 'PRIVILEGED', 'CONFIG'].includes(mode) && (res.error !== 'incomplete' || tokens.length)) {
      const g = this.parse(tokens, this.trees.CONFIG);
      if (!g.error) {
        this.mode = 'CONFIG';
        this.ctx = {};
        res = g;
      } else if (res.error === 'invalid' && res.at === 0 && g.error !== 'invalid') {
        res = g;
      }
    }

    if (res.error === 'ambiguous') return `% Ambiguous command: "${line}"`;
    if (res.error === 'incomplete') return '% Incomplete command.';
    if (res.error === 'invalid') {
      if ((mode === 'USER' || mode === 'PRIVILEGED') && res.at === 0 && tokens.length === 1) {
        const lookup = this.device.noDomainLookup ? '' : '...domain server (255.255.255.255)';
        this.print(`Translating "${tokens[0]}"${lookup}\n`);
        if (!this.device.noDomainLookup) await sleep(900);
        return '% Unknown command or computer name, or unable to find computer address';
      }
      return this._caret(raw, res.at);
    }
    return await res.node.run.call(this, res.values, tokens);
  }

  /* ------------------------------ Help / Tab ------------------------------ */

  _walk(tokens) {
    let node = { children: this.treeFor(this.mode) };
    for (let i = 0; i < tokens.length;) {
      const kids = this._visible(node.children);
      const lower = tokens[i].toLowerCase();
      const exact = kids.find(c => c.word && c.word.toLowerCase() === lower);
      const kwm = exact ? [exact] : kids.filter(c => c.word && c.word.toLowerCase().startsWith(lower));
      if (kwm.length === 1) { node = kwm[0]; i++; continue; }
      let ok = false;
      for (const a of kids.filter(c => c.arg)) {
        const m = matchArg(a, tokens, i);
        if (m && a.arg !== 'line') { node = a; i += m.n; ok = true; break; }
        if (m && a.arg === 'line') return a;
      }
      if (!ok) return null;
    }
    return node;
  }

  help(input) {
    const endsWithSpace = /\s$/.test(input) || input === '';
    const tokens = input.split(/\s+/).filter(Boolean);
    let out = '';
    if (!endsWithSpace) {
      const partial = tokens.pop();
      const node = this._walk(tokens);
      if (!node) {
        out = '% Unrecognized command\n';
      } else {
        const words = this._visible(node.children || []).filter(c => c.word && c.word.toLowerCase().startsWith(partial.toLowerCase())).map(c => c.word);
        out = words.length ? words.join('  ') + '\n' : '% Unrecognized command\n';
      }
    } else {
      const node = this._walk(tokens);
      if (!node) {
        out = '% Unrecognized command\n';
      } else {
        const kids = this._visible(node.children || []).slice().sort((a, b) => (a.word || a.label).localeCompare(b.word || b.label));
        const width = Math.max(16, ...kids.map(k => (k.word || k.label).length + 2));
        for (const k of kids) out += `  ${(k.word || k.label).padEnd(width)} ${k.desc || ''}\n`;
        if (node.run) out += '  <cr>\n';
      }
    }
    this.print(`${this.getPrompt()}${input}?\n${out}`);
  }

  complete(input) {
    const endsWithSpace = /\s$/.test(input);
    const tokens = input.split(/\s+/).filter(Boolean);
    if (endsWithSpace || !tokens.length) return input;
    const partial = tokens.pop();
    const node = this._walk(tokens);
    if (!node) return input;
    const words = this._visible(node.children || []).filter(c => c.word && c.word.toLowerCase().startsWith(partial.toLowerCase()));
    if (words.length === 1) return [...tokens, words[0].word].join(' ') + ' ';
    // Interface name completion
    const ifaceNode = (node.children || []).find(c => c.arg === 'iface');
    if (ifaceNode) {
      const ref = parseIfaceRef(partial + '0');
      if (ref) {
        const typed = partial.match(/^[a-zA-Z]+/)[0];
        if (!/\d/.test(partial)) return [...tokens, ref.type].join(' ');
        return [...tokens, ref.type + partial.slice(typed.length)].join(' ') + ' ';
      }
    }
    return input;
  }

  // Compatibility shims for older UI code
  handleTabCompletion(input) { return { completedText: this.complete(input) }; }

  /* ------------------------------ Helpers --------------------------------- */

  _ifaceList() {
    return this.ctx.ifaces || [];
  }

  _resolveIface(name, create = true) {
    const dev = this.device;
    let i = dev.getInterface(name);
    if (i) return i;
    if (!create) return null;
    const ref = parseIfaceRef(name);
    if (!ref) return null;
    if (this.isRouter && ref.num.includes('.')) return dev.createSubinterface(ref.full);
    if (this.isRouter && ref.type === 'Loopback') return dev.createLoopback(ref.num);
    if (this.isSwitch && ref.type === 'Vlan') {
      const id = parseInt(ref.num, 10);
      if (id >= 1 && id <= 4094) return dev.ensureSVI(id);
    }
    return null;
  }

  _changed() {
    this.topology.emit('topology-changed');
  }

  _ospfNbrKeys() {
    if (!this.device.ospf) return new Set();
    return new Set(this.topology.getNeighbors(this.device, 'ospf').map(n => `${this.topology.ospfRouterId(n.router)}|${n.outIface.name}`));
  }

  _reportAdjacency(before) {
    const after = this._ospfNbrKeys();
    const pid = this.device.ospf ? this.device.ospf.processId : 1;
    for (const k of after) {
      if (!before.has(k)) {
        const [rid, ifn] = k.split('|');
        this.print(`\n%OSPF-5-ADJCHG: Process ${pid}, Nbr ${rid} on ${ifn} from LOADING to FULL, Loading Done\n`);
      }
    }
    for (const k of before) {
      if (!after.has(k)) {
        const [rid, ifn] = k.split('|');
        this.print(`\n%OSPF-5-ADJCHG: Process ${pid}, Nbr ${rid} on ${ifn} from FULL to DOWN, Neighbor Down: Interface down or detached\n`);
      }
    }
  }

  _linkMessages(iface, wasUp) {
    const now = iface.isPhysicalUp;
    if (!iface.isUp) {
      let s = `%LINK-5-CHANGED: Interface ${iface.name}, changed state to administratively down\n`;
      if (wasUp) s += `\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${iface.name}, changed state to down\n`;
      return s;
    }
    if (now && !wasUp) {
      return `%LINK-5-CHANGED: Interface ${iface.name}, changed state to up\n\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${iface.name}, changed state to up\n`;
    }
    return '';
  }

  /* ========================================================================== */
  /* Command trees                                                              */
  /* ========================================================================== */

  initTrees() {
    const isR = (c) => c.isRouter;
    const isS = (c) => c.isSwitch;
    const isL3 = (c) => c.isL3;
    const isML = (c) => c.isSwitch && c.device.isMultilayer === true;

    /* ---------------------------- show ---------------------------------- */
    const showTree = (priv) => {
      const t = [
        kw('access-lists', 'List access lists', [], function () { return this.showAccessLists(); }, isL3),
        kw('arp', 'Arp table', [], function () { return this.showArp(); }),
        kw('cdp', 'CDP information', [
          kw('neighbors', 'CDP neighbor entries', [kw('detail', 'Show detailed information', [], function () { return this.showCdp(true); })], function () { return this.showCdp(false); })
        ]),
        kw('clock', 'Display the system clock', [], function () { return '*' + new Date().toUTCString().replace('GMT', 'UTC'); }),
        kw('flash:', 'display information about flash: file system', [], function () { return this.showFlash(); }),
        kw('history', 'Display the session command history', [], function () { return this.history.map(h => `  ${h}`).join('\n'); }),
        kw('interfaces', 'Interface status and configuration', [
          arg('iface', 'Ethernet', 'IEEE 802.3', [], function (v) { return this.showInterfaces(v[0]); }),
          kw('trunk', 'Show interface trunk information', [], function () { return this.showTrunk(); }, isS),
          kw('status', 'Show interface line status', [], function () { return this.showIntStatus(); }, isS)
        ], function () { return this.showInterfaces(); }),
        kw('ip', 'IP information', [
          kw('interface', 'IP interface status and configuration', [
            kw('brief', 'Brief summary of IP status and configuration', [], function () { return this.showIpIntBrief(); })
          ], function () { return this.showIpIntBrief(); }),
          kw('route', 'IP routing table', [], function () { return this.showIpRoute(); }, isL3),
          kw('protocols', 'IP routing protocol process parameters and statistics', [], function () { return this.showIpProtocols(); }, isL3),
          kw('dhcp', 'Show items in the DHCP database', [
            kw('binding', 'DHCP address bindings', [], function () { return this.showDhcpBinding(); }),
            kw('pool', 'DHCP pools information', [], function () { return this.showDhcpPool(); })
          ], null, isL3),
          kw('ospf', 'OSPF information', [
            kw('neighbor', 'Neighbor list', [], function () { return this.showOspfNeighbor(); })
          ], function () { return this.showOspf(); }, isL3),
          kw('rip', 'IP RIP show commands', [kw('database', 'IP RIP database', [], function () { return this.showRipDb(); })], null, isL3)
        ]),
        kw('mac-address-table', 'MAC forwarding table', [], function () { return this.showMac(); }, isS),
        kw('mac', 'MAC configuration', [kw('address-table', 'MAC forwarding table', [], function () { return this.showMac(); })], null, isS),
        kw('version', 'System hardware and software status', [], function () { return this.showVersion(); }),
        kw('vlan', 'VTP VLAN status', [kw('brief', 'VTP all VLAN status in brief', [], function () { return this.showVlanBrief(); })], function () { return this.showVlan(); }, isS)
      ];
      if (priv) {
        t.push(
          kw('running-config', 'Current operating configuration', [], function () { return this.runningConfig(); }),
          kw('startup-config', 'Contents of startup configuration', [], function () {
            return this.device.startupConfig ? `Using ${this.device.startupConfig.text.length} bytes\n${this.device.startupConfig.text.replace(/^Building configuration...\n\nCurrent configuration : \d+ bytes\n/, '')}` : 'startup-config is not present';
          })
        );
      }
      return t.sort((a, b) => (a.word || '').localeCompare(b.word || ''));
    };

    const pingNode = kw('ping', 'Send echo messages', [
      arg('ip', 'WORD', 'Ping destination address or hostname', [], function (v) { return this.cmdPing(v[0]); }),
      arg('word', 'WORD', 'Ping destination address or hostname', [], function () { return '% Unrecognized host or address, or protocol not running.'; })
    ]);
    const traceNode = kw('traceroute', 'Trace route to destination', [
      arg('ip', 'WORD', 'Trace route to destination address or hostname', [], function (v) { return this.cmdTrace(v[0]); })
    ]);
    const exitExec = function () {
      this.mode = 'USER';
      if (this.vty) {
        this.state = 'closed';
        if (this.onClose) this.onClose();
        return '';
      }
      this.state = 'press-return';
      return `\n${this.device.hostname} con0 is now available\n\n\n\n\n\nPress RETURN to get started.\n`;
    };
    const terminal = kw('terminal', 'Set terminal line parameters', [
      kw('length', 'Set number of lines on a screen', [arg('num', '<0-512>', 'Number of lines on screen (0 for no pausing)', [], () => '')]),
      kw('no', 'Negate a command', [kw('monitor', 'Copy debug output', [], () => '')]),
      kw('monitor', 'Copy debug output to the current terminal line', [], () => '')
    ]);

    const USER = [
      kw('connect', 'Open a terminal connection', [arg('word', 'WORD', 'IP address or hostname', [], () => '% Connection refused by remote host')]),
      kw('disable', 'Turn off privileged commands', [], function () { return ''; }),
      kw('enable', 'Turn on privileged commands', [], function () { return this.cmdEnable(); }),
      kw('exit', 'Exit from the EXEC', [], exitExec),
      kw('logout', 'Exit from the EXEC', [], exitExec),
      pingNode,
      kw('show', 'Show running system information', showTree(false)),
      kw('telnet', 'Open a telnet connection', [arg('ip', 'WORD', 'IP address or hostname of a remote system', [], function (v) { return `Trying ${v[0]} ...\n% Connection timed out; remote host not responding`; })]),
      terminal,
      traceNode
    ];

    const PRIVILEGED = [
      kw('clear', 'Reset functions', [
        kw('arp-cache', 'Clear the entire ARP cache', [], function () { this.device.arpTable.clear(); return ''; }),
        kw('ip', 'IP', [
          kw('route', 'Delete route table entries', [kw('*', 'Delete all routes', [], function () { this._changed(); return ''; })]),
          kw('dhcp', 'Delete items from the DHCP database', [kw('binding', 'DHCP bindings', [kw('*', 'Clear all automatic bindings', [], function () { for (const p of this.device.dhcpPools) p.leases = {}; return ''; })])])
        ], null, isL3),
        kw('mac-address-table', 'MAC forwarding table', [kw('dynamic', 'dynamic entry type', [], function () { this.device.macTable.clear(); return ''; })], function () { this.device.macTable.clear(); return ''; }, isS),
        kw('access-list', 'Clear access list statistical information', [kw('counters', 'Clear access list counters', [], function () { for (const r of Object.values(this.device.acls || {}).flat()) r.matches = 0; return ''; })], null, isL3)
      ]),
      kw('clock', 'Manage the system clock', [kw('set', 'Set the time and date', [arg('line', 'hh:mm:ss', 'Current Time', [], () => '')])]),
      kw('configure', 'Enter configuration mode', [
        kw('terminal', 'Configure from the terminal', [], function () { return this.cmdConfigT(); }),
        kw('memory', 'Configure from NV memory', [], function () { return this.cmdCopyStartRun(); })
      ], function () {
        this.ask('Configuring from terminal, memory, or network [terminal]? ', (a) => {
          if (!a || 'terminal'.startsWith(a.toLowerCase())) this.print(this.cmdConfigT() + '\n');
          else this.print('?Must be "terminal", "memory" or "network"\n');
        });
        return '';
      }),
      kw('copy', 'Copy from one file to another', [
        kw('running-config', 'Copy from current system configuration', [
          kw('startup-config', 'Copy to startup configuration', [], function () {
            this.ask('Destination filename [startup-config]? ', () => this.print(this.cmdWrite()));
            return '';
          })
        ]),
        kw('startup-config', 'Copy from startup configuration', [
          kw('running-config', 'Update (merge with) current system configuration', [], function () {
            this.ask('Destination filename [running-config]? ', () => this.print(this.cmdCopyStartRun() + '\n'));
            return '';
          })
        ])
      ]),
      kw('delete', 'Delete a file', [arg('word', 'flash:', 'Delete a file from flash', [], function (v) {
        const f = v[0].replace(/^flash:\/?/, '');
        this.ask(`Delete filename [${f}]?`, () => {
          this.ask(`Delete flash:/${f}? [confirm]`, () => {
            if (f === 'vlan.dat') this.device._vlanDatDeleted = true;
            this.print(f === 'vlan.dat' && this.isSwitch ? '' : `%Error deleting flash:/${f} (No such file or directory)\n`);
          });
        });
        return '';
      })]),
      kw('disable', 'Turn off privileged commands', [], function () { this.mode = 'USER'; return ''; }),
      kw('enable', 'Turn on privileged commands', [], () => ''),
      kw('erase', 'Erase a filesystem', [
        kw('startup-config', 'Erase contents of configuration memory', [], function () { return this.cmdErase(); }),
        kw('nvram:', 'nvram: filesystem', [], function () { return this.cmdErase(); })
      ]),
      kw('exit', 'Exit from the EXEC', [], exitExec),
      kw('logout', 'Exit from the EXEC', [], exitExec),
      pingNode,
      kw('reload', 'Halt and perform a cold restart', [], function () { return this.cmdReload(); }),
      kw('show', 'Show running system information', showTree(true)),
      kw('telnet', 'Open a telnet connection', [arg('ip', 'WORD', 'IP address or hostname of a remote system', [], function (v) { return `Trying ${v[0]} ...\n% Connection timed out; remote host not responding`; })]),
      terminal,
      traceNode,
      kw('write', 'Write running configuration to memory, network, or terminal', [
        kw('memory', 'Write to NV memory', [], function () { return this.cmdWrite(); }),
        kw('erase', 'Erase NV memory', [], function () { return this.cmdErase(); }),
        kw('terminal', 'Write to terminal', [], function () { return this.runningConfig(); })
      ], function () { return this.cmdWrite(); })
    ];

    const doNode = kw('do', 'To run exec commands in config mode', [arg('line', 'LINE', 'Exec Command', [], function (v) { return this.execute(v[0], v[0], 'PRIVILEGED'); })]);
    const endNode = kw('end', 'Exit from configure mode', [], function () {
      this.mode = 'PRIVILEGED';
      this.ctx = {};
      return '%SYS-5-CONFIG_I: Configured from console by console';
    });

    /* ---------------------------- global config -------------------------- */
    const aclArgs = (negate) => arg('num', '<1-199>', 'IP access list number', negate ? [] : [
      kw('permit', 'Specify packets to forward', [arg('line', 'LINE', 'Source / protocol', [], function (v) { return this.cmdAcl(v[0], 'permit', v[1]); })]),
      kw('deny', 'Specify packets to reject', [arg('line', 'LINE', 'Source / protocol', [], function (v) { return this.cmdAcl(v[0], 'deny', v[1]); })]),
      kw('remark', 'Access list entry comment', [arg('line', 'LINE', 'Comment up to 100 characters long', [], function (v) { return this.cmdAcl(v[0], 'remark', v[1]); })])
    ], negate ? function (v) { delete this.device.acls[v[0]]; return ''; } : null, { min: 1, max: 199 });

    const CONFIG = [
      kw('access-list', 'Add an access list entry', [aclArgs(false)], null, isL3),
      kw('banner', 'Define a login banner', [kw('motd', 'Set Message of the Day banner', [arg('line', 'LINE', 'c banner-text c, where c is a delimiting character', [], function (v) {
        const s = v[0];
        const d = s[0];
        const end = s.indexOf(d, 1);
        this.device.bannerMotd = end > 0 ? s.slice(1, end) : s.slice(1);
        return '';
      })])]),
      kw('cdp', 'Global CDP configuration subcommands', [kw('run', 'Enable CDP', [], () => '')]),
      doNode,
      kw('enable', 'Modify enable password parameters', [
        kw('password', 'Assign the privileged level password', [arg('line', 'LINE', 'The UNENCRYPTED (cleartext) \'enable\' password', [], function (v) { this.device.enablePassword = v[0]; return ''; })]),
        kw('secret', 'Assign the privileged level secret', [arg('line', 'LINE', 'The UNENCRYPTED (cleartext) \'enable\' secret', [], function (v) {
          if (this.device.enablePassword === v[0]) return 'The enable secret you have chosen is the same as your enable password.\nThis is not recommended.  Re-enter the enable secret.';
          this.device.enableSecret = v[0];
          return '';
        })])
      ]),
      endNode,
      kw('exit', 'Exit from configure mode', [], function () { this.mode = 'PRIVILEGED'; this.ctx = {}; return '%SYS-5-CONFIG_I: Configured from console by console'; }),
      kw('hostname', 'Set system\'s network name', [arg('word', 'WORD', 'This system\'s network name', [], function (v) {
        if (!/^[a-zA-Z]/.test(v[0])) return '% Hostname contains one or more illegal characters.';
        this.device.hostname = v[0];
        this._changed();
        return '';
      })]),
      kw('interface', 'Select an interface to configure', [
        kw('range', 'interface range command', [arg('line', 'LINE', 'interface range', [], function (v) { return this.cmdIfRange(v[0]); })]),
        arg('iface', 'Ethernet', 'IEEE 802.3', [], function (v) { return this.cmdInterface(v[0]); })
      ]),
      kw('ip', 'Global IP configuration subcommands', [
        kw('default-gateway', 'Specify default gateway (if not routing IP)', [arg('ip', 'A.B.C.D', 'IP address of default gateway', [], function (v) { this.device.defaultGateway = v[0]; this._changed(); return ''; })], null, isS),
        kw('dhcp', 'Configure DHCP server and relay parameters', [
          kw('excluded-address', 'Prevent DHCP from assigning certain addresses', [arg('ip', 'A.B.C.D', 'Low IP address', [
            arg('ip', 'A.B.C.D', 'High IP address', [], function (v) { this.device.dhcpExcluded.push({ start: v[0], end: v[1] }); return ''; })
          ], function (v) { this.device.dhcpExcluded.push({ start: v[0], end: v[0] }); return ''; })]),
          kw('pool', 'Configure DHCP address pools', [arg('word', 'WORD', 'Pool name', [], function (v) {
            let p = this.device.dhcpPools.find(x => x.name === v[0]);
            if (!p) { p = { name: v[0], network: '', mask: '', defaultRouter: '', dns: '', leases: {} }; this.device.dhcpPools.push(p); }
            this.mode = 'CONFIG_DHCP';
            this.ctx = { pool: p };
            return '';
          })])
        ], null, isL3),
        kw('domain-lookup', 'Enable IP Domain Name System hostname translation', [], function () { this.device.noDomainLookup = false; return ''; }),
        kw('domain-name', 'Define the default domain name', [arg('word', 'WORD', 'Default domain name', [], function (v) { this.device.domainName = v[0]; return ''; })]),
        kw('route', 'Establish static routes', [arg('ip', 'A.B.C.D', 'Destination prefix', [arg('ip', 'A.B.C.D', 'Destination prefix mask', [
          arg('ip', 'A.B.C.D', 'Forwarding router\'s address', [arg('num', '<1-255>', 'Distance metric for this route', [], function (v) { return this.cmdIpRoute(v[0], v[1], v[2], null, v[3]); }, { min: 1, max: 255 })], function (v) { return this.cmdIpRoute(v[0], v[1], v[2], null); }),
          arg('iface', 'Interface', 'Forwarding interface', [arg('ip', 'A.B.C.D', 'Forwarding router\'s address', [], function (v) { return this.cmdIpRoute(v[0], v[1], v[3], v[2]); })], function (v) { return this.cmdIpRoute(v[0], v[1], null, v[2]); })
        ])])], null, isL3),
        kw('routing', 'Enable IP routing', [], function () {
          if (!this.isSwitch) return '';
          if (!this.device.isMultilayer) return '% Invalid input detected at \'^\' marker.';
          this.device.ipRouting = true;
          this._changed();
          return '';
        })
      ]),
      kw('line', 'Configure a terminal line', [
        kw('console', 'Primary terminal line', [arg('num', '<0-0>', 'First Line number', [], function () { this.mode = 'CONFIG_LINE'; this.ctx = { line: 'lineCon' }; return ''; }, { min: 0, max: 0 })]),
        kw('vty', 'Virtual terminal', [arg('num', '<0-15>', 'First Line number', [arg('num', '<1-15>', 'Last Line number', [], function () { this.mode = 'CONFIG_LINE'; this.ctx = { line: 'lineVty' }; return ''; }, { min: 1, max: 15 })], function () { this.mode = 'CONFIG_LINE'; this.ctx = { line: 'lineVty' }; return ''; }, { min: 0, max: 15 })]),
        kw('aux', 'Auxiliary line', [arg('num', '<0-0>', 'First Line number', [], function () { this.mode = 'CONFIG_LINE'; this.ctx = { line: 'lineAux' }; return ''; }, { min: 0, max: 0 })], null, isR)
      ]),
      kw('no', 'Negate a command or set its defaults', [
        kw('access-list', 'Add an access list entry', [aclArgs(true)], null, isL3),
        kw('banner', 'Define a login banner', [kw('motd', 'Set Message of the Day banner', [], function () { this.device.bannerMotd = ''; return ''; })]),
        kw('enable', 'Modify enable password parameters', [
          kw('password', 'Assign the privileged level password', [], function () { this.device.enablePassword = ''; return ''; }),
          kw('secret', 'Assign the privileged level secret', [], function () { this.device.enableSecret = ''; return ''; })
        ]),
        kw('hostname', 'Set system\'s network name', [], function () { this.device.hostname = this.isSwitch ? 'Switch' : 'Router'; this._changed(); return ''; }),
        kw('interface', 'Select an interface to configure', [arg('iface', 'Ethernet', 'IEEE 802.3', [], function (v) {
          const i = this.device.getInterface(v[0]);
          if (!i || !i.isVirtual) return '% Invalid input detected at \'^\' marker.';
          this.device.interfaces = this.device.interfaces.filter(x => x !== i);
          this._changed();
          return '';
        })]),
        kw('ip', 'Global IP configuration subcommands', [
          kw('default-gateway', 'Specify default gateway', [], function () { this.device.defaultGateway = ''; this._changed(); return ''; }, isS),
          kw('dhcp', 'Configure DHCP server and relay parameters', [
            kw('pool', 'Configure DHCP address pools', [arg('word', 'WORD', 'Pool name', [], function (v) { this.device.dhcpPools = this.device.dhcpPools.filter(p => p.name !== v[0]); return ''; })]),
            kw('excluded-address', 'Prevent DHCP from assigning certain addresses', [arg('ip', 'A.B.C.D', 'Low IP address', [arg('ip', 'A.B.C.D', 'High IP address', [], function (v) { this.device.dhcpExcluded = this.device.dhcpExcluded.filter(x => !(x.start === v[0] && x.end === v[1])); return ''; })], function (v) { this.device.dhcpExcluded = this.device.dhcpExcluded.filter(x => x.start !== v[0]); return ''; })])
          ], null, isL3),
          kw('domain-lookup', 'Enable IP Domain Name System hostname translation', [], function () { this.device.noDomainLookup = true; return ''; }),
          kw('routing', 'Enable IP routing', [], function () { this.device.ipRouting = false; this._changed(); return ''; }, isML),
          kw('route', 'Establish static routes', [arg('ip', 'A.B.C.D', 'Destination prefix', [arg('ip', 'A.B.C.D', 'Destination prefix mask', [
            arg('ip', 'A.B.C.D', 'Forwarding router\'s address', [], function (v) { return this.cmdNoIpRoute(v[0], v[1], v[2]); }),
            arg('iface', 'Interface', 'Forwarding interface', [], function (v) { return this.cmdNoIpRoute(v[0], v[1], v[2]); })
          ], function (v) { return this.cmdNoIpRoute(v[0], v[1], null); })])], null, isL3)
        ]),
        kw('router', 'Enable a routing process', [
          kw('rip', 'Routing Information Protocol (RIP)', [], function () { Object.assign(this.device, { ripEnabled: false, ripNetworks: [], ripVersion: 1, ripAutoSummary: true, ripPassive: [], ripDefaultOriginate: false }); this._changed(); return ''; }),
          kw('ospf', 'Open Shortest Path First (OSPF)', [arg('num', '<1-65535>', 'Process ID', [], function () { this.device.ospf = null; this._changed(); return ''; }, { min: 1, max: 65535 })])
        ], null, isL3),
        kw('service', 'Modify use of network based services', [kw('password-encryption', 'Encrypt system passwords', [], function () { this.device.servicePasswordEncryption = false; return ''; })]),
        kw('username', 'Establish User Name Authentication', [arg('word', 'WORD', 'User name', [], function (v) { this.device.users = (this.device.users || []).filter(u => u.name !== v[0]); return ''; })]),
        kw('vlan', 'Vlan commands', [arg('num', '<1-4094>', 'ISL VLAN IDs 1-1005', [], function (v) {
          if (v[0] === 1 || v[0] >= 1002 && v[0] <= 1005) return `Default VLAN ${v[0]} may not be deleted.`;
          this.device.vlans = this.device.vlans.filter(x => x.id !== v[0]);
          this._changed();
          return '';
        }, { min: 1, max: 4094 })], null, isS)
      ]),
      kw('router', 'Enable a routing process', [
        kw('ospf', 'Open Shortest Path First (OSPF)', [arg('num', '<1-65535>', 'Process ID', [], function (v) {
          if (!this.device.ospf) this.device.ospf = { processId: v[0], routerId: '', networks: [], passive: [], defaultOriginate: false };
          this.mode = 'CONFIG_ROUTER';
          this.ctx = { proto: 'ospf' };
          return '';
        }, { min: 1, max: 65535 })]),
        kw('rip', 'Routing Information Protocol (RIP)', [], function () {
          this.device.ripEnabled = true;
          this.device.ripPassive = this.device.ripPassive || [];
          this.mode = 'CONFIG_ROUTER';
          this.ctx = { proto: 'rip' };
          return '';
        })
      ], null, isL3),
      kw('service', 'Modify use of network based services', [kw('password-encryption', 'Encrypt system passwords', [], function () { this.device.servicePasswordEncryption = true; return ''; })]),
      kw('spanning-tree', 'Spanning Tree Subsystem', [kw('mode', 'Spanning tree operating mode', [
        kw('pvst', 'Per-Vlan spanning tree mode', [], () => ''),
        kw('rapid-pvst', 'Per-Vlan rapid spanning tree mode', [], () => '')
      ])], null, isS),
      kw('username', 'Establish User Name Authentication', [arg('word', 'WORD', 'User name', [
        kw('password', 'Specify the password for the user', [arg('line', 'LINE', 'The UNENCRYPTED (cleartext) user password', [], function (v) { return this.cmdUser(v[0], v[1], 'password'); })]),
        kw('secret', 'Specify the secret for the user', [arg('line', 'LINE', 'The UNENCRYPTED (cleartext) user secret', [], function (v) { return this.cmdUser(v[0], v[1], 'secret'); })])
      ])]),
      kw('vlan', 'Vlan commands', [arg('num', '<1-4094>', 'ISL VLAN IDs 1-1005', [], function (v) {
        this.device.ensureVlan(v[0]);
        this.mode = 'CONFIG_VLAN';
        this.ctx = { vlanId: v[0] };
        this._changed();
        return '';
      }, { min: 1, max: 4094 })], null, isS)
    ];

    /* ---------------------------- interface config ----------------------- */
    const forEachIf = (fn) => function (v) {
      let out = '';
      for (const i of this._ifaceList()) {
        const r = fn.call(this, i, v);
        if (r) out += r.endsWith('\n') ? r : r + '\n';
      }
      this._changed();
      return out.trimEnd();
    };
    const physSwitchPort = (c) => c.isSwitch && !c.device.isHub && c._ifaceList().every(i => i.isDataPort && !i.routed);
    const anySwitchPort = (c) => c.isSwitch && !c.device.isHub && c._ifaceList().every(i => i.isDataPort);
    const l3Capable = (c) => c.isRouter || c._ifaceList().every(i => i.vlanId != null || i.routed);
    const mlPort = (c) => isML(c) && c._ifaceList().every(i => i.isDataPort);
    const subIf = (c) => c.isRouter && c._ifaceList().some(i => i.parentName);

    const setIp = forEachIf(function (i, v) {
      if (!IPUtils.isValidMask(v[1])) return '% Inconsistent address and mask';
      const net = IPUtils.networkOf(v[0], v[1]);
      if (v[1] !== '255.255.255.255' && (v[0] === net || v[0] === IPUtils.broadcastOf(v[0], v[1]))) return '% Bad mask /' + IPUtils.maskToPrefix(v[1]) + ' for address ' + v[0];
      const overlap = this.device.interfaces.find(o => o !== i && o.ip && IPUtils.isSameSubnet(o.ip, v[0], o.mask) && IPUtils.isSameSubnet(o.ip, v[0], v[1]));
      if (overlap && this.isRouter) return `% ${IPUtils.networkOf(v[0], v[1])} overlaps with ${overlap.name}`;
      i.ip = v[0];
      i.mask = v[1];
      this.device.arpTable.clear();
      return '';
    });

    const swAccessVlan = forEachIf(function (i, v) {
      let msg = '';
      if (!this.device.hasVlan(v[0])) {
        this.device.ensureVlan(v[0]);
        msg = `% Access VLAN does not exist. Creating vlan ${v[0]}`;
      }
      i.accessVlan = v[0];
      return msg;
    });

    const allowed = forEachIf(function (i, v) {
      const s = v[0].trim().toLowerCase();
      const parts = s.split(/\s+/);
      const listToSet = (str) => {
        const set = new Set();
        for (const p of str.split(',')) {
          const [a, b] = p.split('-').map(x => parseInt(x, 10));
          if (isNaN(a)) continue;
          for (let n = a; n <= (b || a); n++) set.add(n);
        }
        return set;
      };
      const cur = i.allowedVlans === 'all' ? null : listToSet(i.allowedVlans || '');
      if (parts[0] === 'all') i.allowedVlans = 'all';
      else if (parts[0] === 'none') i.allowedVlans = 'none';
      else if (parts[0] === 'add' && parts[1]) {
        if (cur) { for (const n of listToSet(parts[1])) cur.add(n); i.allowedVlans = [...cur].sort((a, b) => a - b).join(','); }
      } else if (parts[0] === 'remove' && parts[1]) {
        const base = cur || listToSet('1-4094');
        for (const n of listToSet(parts[1])) base.delete(n);
        i.allowedVlans = compressList([...base].sort((a, b) => a - b));
      } else if (parts[0] === 'except' && parts[1]) {
        const base = listToSet('1-4094');
        for (const n of listToSet(parts[1])) base.delete(n);
        i.allowedVlans = compressList([...base].sort((a, b) => a - b));
      } else if (/^[\d,-]+$/.test(parts[0])) {
        i.allowedVlans = parts[0];
      } else return '% Invalid input detected at \'^\' marker.';
      return '';
    });

    const CONFIG_IF = [
      kw('bandwidth', 'Set bandwidth informational parameter', [arg('num', '<1-10000000>', 'Bandwidth in kilobits', [], forEachIf(function (i, v) { i.bandwidth = v[0]; }), { min: 1, max: 10000000 })]),
      kw('cdp', 'CDP interface subcommands', [kw('enable', 'Enable CDP on interface', [], () => '')]),
      kw('clock', 'Configure serial interface clock', [kw('rate', 'Configure serial interface clock speed', [arg('num', '<300-4000000>', 'Choose clockrate from list above', [], forEachIf(function (i, v) {
        if (i.type !== 'Serial') return '';
        i.clockRate = v[0];
        if (i.connectedCable && i.connectedCable.ifaceA !== i) return 'This command applies only to DCE interfaces';
        return '';
      }), { min: 300, max: 4000000 })])], null, isR),
      kw('description', 'Interface specific description', [arg('line', 'LINE', 'Up to 240 characters describing this interface', [], forEachIf(function (i, v) { i.description = v[0]; }))]),
      doNode,
      kw('duplex', 'Configure duplex operation.', [
        kw('auto', 'Enable AUTO duplex configuration', [], forEachIf(function (i) { i.duplex = 'auto'; })),
        kw('full', 'Force full duplex operation', [], forEachIf(function (i) { i.duplex = 'full'; })),
        kw('half', 'Force half-duplex operation', [], forEachIf(function (i) { i.duplex = 'half'; }))
      ]),
      kw('encapsulation', 'Set encapsulation type for an interface', [kw('dot1Q', 'IEEE 802.1Q Virtual LAN', [arg('num', '<1-4094>', 'IEEE 802.1Q VLAN ID required', [], forEachIf(function (i, v) {
        if (!i.parentName) return '% Configuring IEEE 802.1Q encapsulation on the main interface is not supported';
        i.encapVlan = v[0];
        return '';
      }), { min: 1, max: 4094 })])], null, subIf),
      endNode,
      kw('exit', 'Exit from interface configuration mode', [], function () { this.mode = 'CONFIG'; this.ctx = {}; return ''; }),
      kw('ip', 'Interface Internet Protocol config commands', [
        kw('access-group', 'Specify access control for packets', [arg('num', '<1-199>', 'IP access list (standard or extended)', [
          kw('in', 'inbound packets', [], forEachIf(function (i, v) { i.aclIn = v[0]; })),
          kw('out', 'outbound packets', [], forEachIf(function (i, v) { i.aclOut = v[0]; }))
        ], null, { min: 1, max: 199 })], null, isL3),
        kw('address', 'Set the IP address of an interface', [
          arg('ip', 'A.B.C.D', 'IP address', [arg('ip', 'A.B.C.D', 'IP subnet mask', [], setIp)]),
          kw('dhcp', 'IP Address negotiated via DHCP', [], forEachIf(function (i) {
            const lease = this.topology._dhcpLookup(this.device, i, []);
            if (!lease) return '';
            i.ip = lease.ip; i.mask = lease.mask; i.dhcpClient = true;
            return `%DHCP-6-ADDRESS_ASSIGN: Interface ${i.name} assigned DHCP address ${lease.ip}, mask ${lease.mask}, hostname ${this.device.hostname}`;
          }))
        ], null, l3Capable),
        kw('helper-address', 'Specify a destination address for UDP broadcasts', [arg('ip', 'A.B.C.D', 'IP destination address', [], forEachIf(function (i, v) { i.helperAddress = v[0]; }))], null, isL3),
        kw('ospf', 'OSPF interface commands', [kw('cost', 'Interface cost', [arg('num', '<1-65535>', 'Cost', [], forEachIf(function (i, v) { i.ospfCost = v[0]; }), { min: 1, max: 65535 })])], null, isL3)
      ]),
      kw('no', 'Negate a command or set its defaults', [
        kw('description', 'Interface specific description', [], forEachIf(function (i) { i.description = ''; })),
        kw('ip', 'Interface Internet Protocol config commands', [
          kw('access-group', 'Specify access control for packets', [arg('num', '<1-199>', 'IP access list', [
            kw('in', 'inbound packets', [], forEachIf(function (i) { i.aclIn = null; })),
            kw('out', 'outbound packets', [], forEachIf(function (i) { i.aclOut = null; }))
          ], null, { min: 1, max: 199 })], null, isL3),
          kw('address', 'Set the IP address of an interface', [], forEachIf(function (i) { i.ip = ''; i.dhcpClient = false; })),
          kw('helper-address', 'Specify a destination address for UDP broadcasts', [], forEachIf(function (i) { i.helperAddress = ''; }), isL3)
        ]),
        kw('shutdown', 'Shutdown the selected interface', [], forEachIf(function (i) {
          const was = i.isPhysicalUp;
          i.isUp = true;
          return this._linkMessages(i, was);
        })),
        kw('switchport', 'Set switching mode characteristics', [
          kw('access', 'Set access mode characteristics of the interface', [kw('vlan', 'Set VLAN when interface is in access mode', [], forEachIf(function (i) { i.accessVlan = 1; }))]),
          kw('mode', 'Set trunking mode of the interface', [], forEachIf(function (i) { i.mode = 'access'; })),
          kw('trunk', 'Set trunking characteristics of the interface', [
            kw('native', 'Set trunking native characteristics', [kw('vlan', 'Set native VLAN', [], forEachIf(function (i) { i.nativeVlan = 1; }))]),
            kw('allowed', 'Set allowed VLAN characteristics', [kw('vlan', 'Set allowed VLANs', [], forEachIf(function (i) { i.allowedVlans = 'all'; }))])
          ])
        ], forEachIf(function (i) {
          if (!this.device.isMultilayer) return '% Invalid input detected at \'^\' marker.';
          i.routed = true;
          i.mode = 'access';
          return '';
        }), anySwitchPort)
      ]),
      kw('shutdown', 'Shutdown the selected interface', [], forEachIf(function (i) {
        const was = i.isPhysicalUp;
        i.isUp = false;
        return this._linkMessages(i, was);
      })),
      kw('spanning-tree', 'Spanning Tree Subsystem', [kw('portfast', 'Enable an interface to move directly to forwarding on link up', [], forEachIf(function (i) {
        i.portfast = true;
        return `%Warning: portfast should only be enabled on ports connected to a single
 host. Connecting hubs, concentrators, switches, bridges, etc... to this
 interface  when portfast is enabled, can cause temporary bridging loops.
 Use with CAUTION

%Portfast has been configured on ${i.name} but will only
 have effect when the interface is in a non-trunking mode.`;
      }))], null, physSwitchPort),
      kw('speed', 'Configure speed operation.', [
        kw('10', 'Force 10 Mbps operation', [], forEachIf(function (i) { i.speed = '10'; })),
        kw('100', 'Force 100 Mbps operation', [], forEachIf(function (i) { i.speed = '100'; })),
        kw('1000', 'Force 1000 Mbps operation', [], forEachIf(function (i) { i.speed = '1000'; })),
        kw('auto', 'Enable AUTO speed configuration', [], forEachIf(function (i) { i.speed = 'auto'; }))
      ]),
      kw('switchport', 'Set switching mode characteristics', [
        kw('access', 'Set access mode characteristics of the interface', [kw('vlan', 'Set VLAN when interface is in access mode', [arg('num', '<1-4094>', 'VLAN ID of the VLAN when this port is in access mode', [], swAccessVlan, { min: 1, max: 4094 })])]),
        kw('mode', 'Set trunking mode of the interface', [
          kw('access', 'Set trunking mode to ACCESS unconditionally', [], forEachIf(function (i) { i.mode = 'access'; })),
          kw('dynamic', 'Set trunking mode to dynamically negotiate access or trunk mode', [
            kw('auto', 'Set trunking mode dynamic negotiation parameter to AUTO', [], forEachIf(function (i) { i.mode = 'access'; })),
            kw('desirable', 'Set trunking mode dynamic negotiation parameter to DESIRABLE', [], forEachIf(function (i) { i.mode = 'trunk'; }))
          ]),
          kw('trunk', 'Set trunking mode to TRUNK unconditionally', [], forEachIf(function (i) {
            if (String(this.device.model).startsWith('3560') && i.trunkEncap !== 'dot1q') {
              return 'Command rejected: An interface whose trunk encapsulation is "Auto" can not be configured to "trunk" mode.';
            }
            const was = i.mode;
            i.mode = 'trunk';
            if (was !== 'trunk' && i.isPhysicalUp) {
              return `\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${i.name}, changed state to down\n\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${i.name}, changed state to up`;
            }
            return '';
          }))
        ]),
        kw('nonegotiate', 'Device will not engage in negotiation protocol on this interface', [], () => ''),
        kw('port-security', 'Security related command', [], () => ''),
        kw('trunk', 'Set trunking characteristics of the interface', [
          kw('allowed', 'Set allowed VLAN characteristics when interface is in trunking mode', [kw('vlan', 'Set allowed VLANs when interface is in trunking mode', [arg('line', 'WORD', 'VLAN IDs of the allowed VLANs when this port is in trunking mode', [], allowed)])]),
          kw('encapsulation', 'Set trunking encapsulation when interface is in trunking mode', [kw('dot1q', 'Interface uses only 802.1q trunking encapsulation when trunking', [], forEachIf(function (i) { i.trunkEncap = 'dot1q'; }))], null, isML),
          kw('native', 'Set trunking native characteristics when interface is in trunking mode', [kw('vlan', 'Set native VLAN when interface is in trunking mode', [arg('num', '<1-4094>', 'VLAN ID of the native VLAN when this port is in trunking mode', [], forEachIf(function (i, v) { i.nativeVlan = v[0]; }), { min: 1, max: 4094 })])])
        ])
      ], function () {
        for (const i of this._ifaceList()) { i.routed = false; i.ip = ''; }
        this._changed();
        return '';
      }, anySwitchPort)
    ];

    /* ---------------------------- routing protocol ----------------------- */
    const routerCommon = [
      kw('default-information', 'Control distribution of default information', [kw('originate', 'Distribute a default route', [], function () {
        if (this.ctx.proto === 'rip') this.device.ripDefaultOriginate = true; else this.device.ospf.defaultOriginate = true;
        this._changed();
        return '';
      })]),
      doNode,
      endNode,
      kw('exit', 'Exit from routing protocol configuration mode', [], function () { this.mode = 'CONFIG'; this.ctx = {}; return ''; }),
      kw('passive-interface', 'Suppress routing updates on an interface', [arg('iface', 'Ethernet', 'IEEE 802.3', [], function (v) {
        const i = this.device.getInterface(v[0]);
        if (!i) return '% Invalid input detected at \'^\' marker.';
        const list = this.ctx.proto === 'rip' ? (this.device.ripPassive = this.device.ripPassive || []) : this.device.ospf.passive;
        if (!list.includes(i.name)) list.push(i.name);
        this._changed();
        return '';
      })])
    ];

    const CONFIG_RIP = [
      ...routerCommon,
      kw('auto-summary', 'Enable automatic network number summarization', [], function () { this.device.ripAutoSummary = true; return ''; }),
      kw('network', 'Enable routing on an IP network', [arg('ip', 'A.B.C.D', 'Network number', [], function (v) {
        const net = IPUtils.classfulNetwork(v[0]);
        if (!this.device.ripNetworks.includes(net)) this.device.ripNetworks.push(net);
        this._changed();
        return '';
      })]),
      kw('no', 'Negate a command or set its defaults', [
        kw('auto-summary', 'Enable automatic network number summarization', [], function () { this.device.ripAutoSummary = false; return ''; }),
        kw('default-information', 'Control distribution of default information', [kw('originate', 'Distribute a default route', [], function () { this.device.ripDefaultOriginate = false; this._changed(); return ''; })]),
        kw('network', 'Enable routing on an IP network', [arg('ip', 'A.B.C.D', 'Network number', [], function (v) {
          const net = IPUtils.classfulNetwork(v[0]);
          this.device.ripNetworks = this.device.ripNetworks.filter(n => n !== net);
          this._changed();
          return '';
        })]),
        kw('passive-interface', 'Suppress routing updates on an interface', [arg('iface', 'Ethernet', 'IEEE 802.3', [], function (v) {
          const i = this.device.getInterface(v[0]);
          this.device.ripPassive = (this.device.ripPassive || []).filter(n => !i || n !== i.name);
          this._changed();
          return '';
        })])
      ]),
      kw('redistribute', 'Redistribute information from another routing protocol', [kw('static', 'Static routes', [], () => ''), kw('connected', 'Connected', [], () => '')]),
      kw('version', 'Set routing protocol version', [arg('num', '<1-2>', 'version', [], function (v) { this.device.ripVersion = v[0]; return ''; }, { min: 1, max: 2 })])
    ];

    const CONFIG_OSPF = [
      ...routerCommon,
      kw('auto-cost', 'Calculate OSPF interface cost according to bandwidth', [kw('reference-bandwidth', 'Use reference bandwidth method to assign OSPF cost', [arg('num', '<1-4294967>', 'The reference bandwidth in terms of Mbits per second', [], () => '')])]),
      kw('log-adjacency-changes', 'Log changes in adjacency state', [], () => ''),
      kw('network', 'Enable routing on an IP network', [arg('ip', 'A.B.C.D', 'Network number', [arg('ip', 'A.B.C.D', 'OSPF wild card bits', [kw('area', 'Set the OSPF area ID', [arg('num', '<0-4294967295>', 'OSPF area ID as a decimal value', [], function (v) {
        const o = this.device.ospf;
        if (!o.networks.some(n => n.network === v[0] && n.wildcard === v[1])) o.networks.push({ network: v[0], wildcard: v[1], area: v[2] });
        this._changed();
        return '';
      })])])])]),
      kw('no', 'Negate a command or set its defaults', [
        kw('network', 'Enable routing on an IP network', [arg('ip', 'A.B.C.D', 'Network number', [arg('ip', 'A.B.C.D', 'OSPF wild card bits', [kw('area', 'Set the OSPF area ID', [arg('num', '<0-4294967295>', 'OSPF area ID', [], function (v) {
          this.device.ospf.networks = this.device.ospf.networks.filter(n => !(n.network === v[0] && n.wildcard === v[1]));
          this._changed();
          return '';
        })])])])]),
        kw('passive-interface', 'Suppress routing updates on an interface', [arg('iface', 'Ethernet', 'IEEE 802.3', [], function (v) {
          const i = this.device.getInterface(v[0]);
          this.device.ospf.passive = this.device.ospf.passive.filter(n => !i || n !== i.name);
          this._changed();
          return '';
        })]),
        kw('default-information', 'Control distribution of default information', [kw('originate', 'Distribute a default route', [], function () { this.device.ospf.defaultOriginate = false; this._changed(); return ''; })])
      ]),
      kw('router-id', 'router-id for this OSPF process', [arg('ip', 'A.B.C.D', 'OSPF router-id in IP address format', [], function (v) {
        this.device.ospf.routerId = v[0];
        this._changed();
        return 'Reload or use "clear ip ospf process" command, for this to take effect';
      })])
    ];

    const CONFIG_VLAN = [
      doNode,
      endNode,
      kw('exit', 'Apply changes, bump revision number, and exit mode', [], function () { this.mode = 'CONFIG'; this.ctx = {}; return ''; }),
      kw('name', 'Ascii name of the VLAN', [arg('word', 'WORD', 'The ascii name for the VLAN', [], function (v) {
        this.device.ensureVlan(this.ctx.vlanId, v[0]);
        this._changed();
        return '';
      })]),
      kw('no', 'Negate a command or set its defaults', [kw('name', 'Ascii name of the VLAN', [], function () {
        const vl = this.device.vlans.find(x => x.id === this.ctx.vlanId);
        if (vl) vl.name = `VLAN${String(vl.id).padStart(4, '0')}`;
        return '';
      })])
    ];

    const lineCfg = () => {
      const k = this.ctx.line;
      this.device[k] = this.device[k] || { password: '', login: false, loginLocal: false };
      return this.device[k];
    };
    const CONFIG_LINE = [
      doNode,
      endNode,
      kw('exec-timeout', 'Set the EXEC timeout', [arg('num', '<0-35791>', 'Timeout in minutes', [arg('num', '<0-2147483>', 'Timeout in seconds', [], () => '')], () => '')]),
      kw('exit', 'Exit from line configuration mode', [], function () { this.mode = 'CONFIG'; this.ctx = {}; return ''; }),
      kw('logging', 'Modify message logging facilities', [kw('synchronous', 'Synchronized message output', [], () => '')]),
      kw('login', 'Enable password checking', [
        kw('local', 'Local password checking', [], function () { const l = lineCfg(); l.login = true; l.loginLocal = true; return ''; })
      ], function () {
        const l = lineCfg();
        l.login = true;
        l.loginLocal = false;
        return l.password ? '' : '% Login disabled on line 0, until \'password\' is set';
      }),
      kw('no', 'Negate a command or set its defaults', [
        kw('login', 'Enable password checking', [], function () { lineCfg().login = false; return ''; }),
        kw('password', 'Set a password', [], function () { lineCfg().password = ''; return ''; })
      ]),
      kw('password', 'Set a password', [arg('line', 'LINE', 'The UNENCRYPTED (cleartext) line password', [], function (v) { lineCfg().password = v[0]; return ''; })]),
      kw('transport', 'Define transport protocols for line', [kw('input', 'Define which protocols to use when connecting to the terminal server', [arg('line', 'LINE', 'all | none | ssh | telnet', [], function (v) { lineCfg().transport = v[0]; return ''; })])])
    ];

    const CONFIG_DHCP = [
      kw('default-router', 'Default routers', [arg('ip', 'Hostname or A.B.C.D', 'Router\'s name or IP address', [], function (v) { this.ctx.pool.defaultRouter = v[0]; return ''; })]),
      kw('dns-server', 'DNS servers', [arg('ip', 'Hostname or A.B.C.D', 'Server\'s name or IP address', [], function (v) { this.ctx.pool.dns = v[0]; return ''; })]),
      doNode,
      endNode,
      kw('exit', 'Exit from DHCP pool configuration mode', [], function () { this.mode = 'CONFIG'; this.ctx = {}; return ''; }),
      kw('network', 'Network number and mask', [arg('ip', 'A.B.C.D', 'Network number in dotted-decimal notation', [arg('ip', 'A.B.C.D', 'Network mask', [], function (v) {
        this.ctx.pool.network = v[0];
        this.ctx.pool.mask = v[1];
        return '';
      })])])
    ];

    this.trees = { USER, PRIVILEGED, CONFIG, CONFIG_IF, CONFIG_RIP, CONFIG_OSPF, CONFIG_VLAN, CONFIG_LINE, CONFIG_DHCP };
  }

  /* ========================================================================== */
  /* Command implementations                                                    */
  /* ========================================================================== */

  cmdEnable() {
    const d = this.device;
    if (this.vty && !d.enableSecret && !d.enablePassword) return '% No password set';
    if (d.enableSecret || d.enablePassword) {
      this.state = 'enable-password';
      this.ctx = { tries: 0 };
      return '';
    }
    this.mode = 'PRIVILEGED';
    return '';
  }

  cmdConfigT() {
    this.mode = 'CONFIG';
    this.ctx = {};
    return 'Enter configuration commands, one per line.  End with CNTL/Z.';
  }

  cmdInterface(name) {
    const i = this._resolveIface(name);
    if (!i) return '%Invalid interface type and number';
    this.ctx = { ifaces: [i] };
    this.mode = i.parentName ? 'CONFIG_SUBIF' : 'CONFIG_IF';
    this._changed();
    return '';
  }

  cmdIfRange(spec) {
    const list = [];
    for (const part of spec.split(',')) {
      const m = part.trim().match(/^([a-zA-Z]+)\s*((?:\d+\/)*)(\d+)\s*(?:-\s*(\d+))?$/);
      if (!m) return '% Invalid input detected at \'^\' marker.';
      const [, t, prefix, a, b] = m;
      for (let n = parseInt(a, 10); n <= parseInt(b || a, 10); n++) {
        const i = this.device.getInterface(`${t}${prefix}${n}`);
        if (!i) return '% Command rejected: Bad interface range';
        list.push(i);
      }
    }
    this.ctx = { ifaces: list };
    this.mode = 'CONFIG_IF_RANGE';
    return '';
  }

  cmdIpRoute(net, mask, nextHop, ifaceName, ad = 1) {
    if (!IPUtils.isValidMask(mask)) return '%Inconsistent address and mask';
    if (IPUtils.networkOf(net, mask) !== net) return '%Inconsistent address and mask';
    let ifn = null;
    if (ifaceName) {
      const i = this.device.getInterface(ifaceName);
      if (!i) return '%Invalid interface type and number';
      ifn = i.name;
    }
    this.device.addRoute(net, mask, nextHop, ifn, ad);
    this._changed();
    return '';
  }

  cmdNoIpRoute(net, mask, via) {
    const d = this.device;
    const before = d.routingTable.length;
    d.routingTable = d.routingTable.filter(r => {
      if (r.destination !== net || r.mask !== mask) return true;
      if (!via) return false;
      if (r.nextHop === via) return false;
      const i = d.getInterface(via);
      return !(i && r.interfaceName === i.name);
    });
    if (before === d.routingTable.length) return '%No matching route to delete';
    this._changed();
    return '';
  }

  cmdUser(name, pw, kind) {
    const d = this.device;
    d.users = (d.users || []).filter(u => u.name !== name);
    d.users.push({ name, password: pw, kind });
    return '';
  }

  cmdAcl(num, action, rest) {
    const d = this.device;
    d.acls[num] = d.acls[num] || [];
    const list = d.acls[num];
    const seq = (list.length ? list[list.length - 1].seq : 0) + 10;
    if (action === 'remark') {
      list.push({ seq, remark: rest, text: `remark ${rest}` });
      return '';
    }
    const toks = rest.split(/\s+/);
    let k = 0;
    const addr = () => {
      const t = (toks[k] || '').toLowerCase();
      if (t === 'any') { k++; return { a: 'any', w: null, txt: 'any' }; }
      if (t === 'host' && IPUtils.isValidIP(toks[k + 1])) { const a = toks[k + 1]; k += 2; return { a, w: '0.0.0.0', txt: `host ${a}` }; }
      if (IPUtils.isValidIP(toks[k])) {
        const a = toks[k++];
        if (IPUtils.isValidIP(toks[k])) { const w = toks[k++]; return { a, w, txt: `${a} ${w}` }; }
        return { a, w: '0.0.0.0', txt: `host ${a}` };
      }
      return null;
    };
    if (num < 100) {
      const s = addr();
      if (!s || k < toks.length) return '% Invalid input detected at \'^\' marker.';
      list.push({ seq, action, extended: false, src: s.a, srcWc: s.w, text: `${action} ${s.txt}` });
      return '';
    }
    const proto = (toks[k++] || '').toLowerCase();
    if (!['ip', 'icmp', 'tcp', 'udp'].includes(proto)) return '% Invalid input detected at \'^\' marker.';
    const s = addr();
    if (!s) return '% Invalid input detected at \'^\' marker.';
    const dd = addr();
    if (!dd) return '% Invalid input detected at \'^\' marker.';
    const tail = toks.slice(k).join(' ');
    list.push({ seq, action, extended: true, proto, src: s.a, srcWc: s.w, dst: dd.a, dstWc: dd.w, text: `${action} ${proto} ${s.txt} ${dd.txt}${tail ? ' ' + tail : ''}` });
    return '';
  }

  cmdWrite() {
    const text = this.runningConfig();
    this.topology.saveStartup(this.device, text);
    return 'Building configuration...\n[OK]\n';
  }

  cmdErase() {
    this.ask('Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]', (a) => {
      if (a && !/^y/i.test(a)) return;
      this.device.startupConfig = null;
      this.print('[OK]\nErase of nvram: complete\n%SYS-7-NV_BLOCK_INIT: Initialized the geometry of nvram\n');
    });
    return '';
  }

  cmdCopyStartRun() {
    const d = this.device;
    if (!d.startupConfig) return '%Error opening nvram:/startup-config (No such file or directory)';
    NetworkTopology.applyDeviceConfig(d, d.startupConfig.config);
    this._changed();
    return `${d.startupConfig.text.length} bytes copied in 0.416 secs (${d.startupConfig.text.length * 2} bytes/sec)`;
  }

  cmdReload() {
    const doReload = async () => {
      const d = this.device;
      const vlans = d.vlans ? JSON.parse(JSON.stringify(d.vlans)) : null;
      this.state = 'busy';
      this.print('%SYS-5-RELOAD: Reload requested by console. Reload Reason: Reload Command.\n');
      await sleep(600);
      this.topology.reloadDevice(d);
      if (vlans && !d._vlanDatDeleted) d.vlans = vlans; // VLANs live in vlan.dat, not startup-config
      if (d._vlanDatDeleted) { d.vlans = [{ id: 1, name: 'default', status: 'active' }]; d._vlanDatDeleted = false; }
      this.topology.emit('topology-changed');
      this.mode = 'USER';
      this.ctx = {};
      this.print(this.getBootOutput());
      this.state = 'press-return';
    };
    const running = this.runningConfig();
    const saved = this.device.startupConfig ? this.device.startupConfig.text : null;
    if (saved !== running) {
      this.ask('System configuration has been modified. Save? [yes/no]:', (a) => {
        if (/^y/i.test(a)) this.print(this.cmdWrite());
        this.ask('Proceed with reload? [confirm]', (b) => { if (!b || /^y/i.test(b)) return doReload(); });
      });
    } else {
      this.ask('Proceed with reload? [confirm]', (b) => { if (!b || /^y/i.test(b)) return doReload(); });
    }
    return '';
  }

  async cmdPing(target) {
    const dev = this.device;
    this.print(`Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:\n`);
    let ok = 0;
    const times = [];
    await this.topology.ping(dev, target, 5, async (n, res) => {
      if (res.result === 'reply') { ok++; times.push(Math.floor(Math.random() * 2)); this.print('!'); }
      else if (res.result === 'unreachable') this.print('U');
      else { await sleep(350); this.print('.'); }
    });
    const pct = Math.round(ok / 5 * 100);
    let s = `\nSuccess rate is ${pct} percent (${ok}/5)`;
    if (ok) s += `, round-trip min/avg/max = ${Math.min(...times)}/${Math.round(times.reduce((a, b) => a + b, 0) / ok)}/${Math.max(...times)} ms`;
    return s + '\n';
  }

  async cmdTrace(target) {
    this.print(`Type escape sequence to abort.\nTracing the route to ${target}\n\n`);
    await this.topology.traceroute(this.device, target, (ttl, probes, from) => {
      const cols = probes.map(p => p.result === 'timeout' ? '*' : `${Math.floor(Math.random() * 2)} msec`);
      if (!from) this.print(`  ${String(ttl).padEnd(3)} ${'*'.padEnd(5)}${'*'.padEnd(5)}*\n`);
      else this.print(`  ${String(ttl).padEnd(3)} ${from.padEnd(15)} ${cols.map(c => c.padEnd(9)).join(' ')}\n`);
    });
    return '';
  }

  /* ========================================================================== */
  /* show commands                                                              */
  /* ========================================================================== */

  showVersion() {
    const d = this.device;
    const im = iosImage(d);
    const up = Math.floor(performance.now() / 60000);
    const reg = this.isSwitch ? '0xF' : '0x2102';
    return `Cisco IOS Software, ${im.family} Software (${im.img}), Version ${im.ver}, RELEASE SOFTWARE (fc1)
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 1986-2013 by Cisco Systems, Inc.
Compiled Thu 26-Jul-12 20:54 by prod_rel_team

ROM: System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)

${d.hostname} uptime is ${Math.floor(up / 60)} hours, ${up % 60} minutes
System returned to ROM by power-on
System image file is "flash:${im.file}"

This product contains cryptographic features and is subject to United
States and local country laws governing import, export, transfer and
use.

cisco ${im.proc} (revision 1.0) with ${im.mem} bytes of memory.
Processor board ID FTX152400KS
${d.interfaces.filter(i => !i.isVirtual && i.type === 'GigabitEthernet').length} Gigabit Ethernet interfaces
${d.interfaces.filter(i => !i.isVirtual && i.type === 'FastEthernet').length} FastEthernet interfaces
${d.interfaces.filter(i => i.type === 'Serial').length} Low-speed serial(sync/async) network interface(s)
DRAM configuration is 64 bits wide with parity disabled.
255K bytes of non-volatile configuration memory.
249856K bytes of ATA System CompactFlash 0 (Read/Write)

Configuration register is ${reg}`;
  }

  showFlash() {
    const im = iosImage(this.device);
    return `System flash directory:
File  Length   Name/status
  3   33591768 ${im.file}
  2   28282    sigdef-category.xml
  1   227537   sigdef-default.xml
[33847587 bytes used, 221896413 available, 255744000 total]
249856K bytes of processor board System flash (Read/Write)`;
  }

  _ifStatus(i) {
    const status = !i.isUp ? 'administratively down' : (i.isLinkUp ? 'up' : 'down');
    const proto = i.isPhysicalUp ? 'up' : 'down';
    return { status, proto };
  }

  showIpIntBrief() {
    let out = 'Interface              IP-Address      OK? Method Status                Protocol \n';
    const list = this.device.interfaces.filter(i => i.type !== 'Wireless' && i.type !== 'Console');
    const rows = this.isRouter && !list.some(i => i.vlanId != null) ? [...list, { name: 'Vlan1', ip: '', isUp: false, isLinkUp: false, isPhysicalUp: false }] : list;
    for (const i of rows) {
      const { status, proto } = this._ifStatus(i);
      out += `${i.name.padEnd(23)}${(i.ip || 'unassigned').padEnd(16)}YES ${(i.ip ? (i.dhcpClient ? 'DHCP' : 'manual') : 'unset').padEnd(7)}${status.padEnd(22)}${proto}\n`;
    }
    return out.trimEnd();
  }

  showInterfaces(name) {
    const list = name ? [this.device.getInterface(name)].filter(Boolean) : this.device.interfaces.filter(i => i.type !== 'Wireless' && i.type !== 'Console');
    if (!list.length) return '% Invalid input detected at \'^\' marker.';
    return list.map(i => {
      const { status, proto } = this._ifStatus(i);
      const hw = i.type === 'Serial' ? 'GT96K Serial' : i.vlanId != null ? 'CPU Interface' : i.type === 'Loopback' ? 'Loopback' : i.type === 'GigabitEthernet' ? 'CN Gigabit Ethernet' : 'Lance';
      const conn = this.isSwitch && i.vlanId == null ? (i.isPhysicalUp ? ' (connected)' : ' (disabled)') : '';
      let s = `${i.name} is ${status}, line protocol is ${proto}${conn}\n`;
      s += `  Hardware is ${hw}${i.type === 'Loopback' || i.type === 'Serial' ? '' : `, address is ${i.mac} (bia ${i.mac})`}\n`;
      if (i.description) s += `  Description: ${i.description}\n`;
      if (i.ip) s += `  Internet address is ${i.ip}/${IPUtils.maskToPrefix(i.mask)}\n`;
      const dly = i.type === 'Serial' ? 20000 : i.type === 'GigabitEthernet' ? 10 : 100;
      s += `  MTU 1500 bytes, BW ${i.bandwidth} Kbit, DLY ${dly} usec,\n     reliability 255/255, txload 1/255, rxload 1/255\n`;
      if (i.type === 'Serial') s += '  Encapsulation HDLC, loopback not set, keepalive set (10 sec)\n';
      else if (i.parentName) s += `  Encapsulation 802.1Q Virtual LAN, Vlan ID  ${i.encapVlan || 1}\n`;
      else s += '  Encapsulation ARPA, loopback not set\n';
      if (i.type !== 'Serial' && i.type !== 'Loopback' && i.vlanId == null && !i.parentName) {
        const sp = i.speed === 'auto' ? (i.type === 'GigabitEthernet' ? '1000Mb/s' : '100Mb/s') : `${i.speed}Mb/s`;
        s += `  Keepalive set (10 sec)\n  ${i.duplex === 'half' ? 'Half' : 'Full'}-duplex, ${sp}, media type is RJ45\n`;
      }
      s += `  ARP type: ARPA, ARP Timeout 04:00:00, \n  Last input 00:00:08, output 00:00:05, output hang never\n  Last clearing of "show interface" counters never\n  Input queue: 0/75/0 (size/max/drops); Total output drops: 0\n  5 minute input rate 0 bits/sec, 0 packets/sec\n  5 minute output rate 0 bits/sec, 0 packets/sec`;
      return s;
    }).join('\n');
  }

  showIntStatus() {
    let out = 'Port      Name               Status       Vlan       Duplex  Speed Type\n';
    for (const i of this.device.interfaces.filter(x => x.isDataPort)) {
      const st = !i.isUp ? 'disabled' : i.isPhysicalUp ? 'connected' : 'notconnect';
      const vl = i.mode === 'trunk' ? 'trunk' : String(i.accessVlan);
      const typ = i.type === 'GigabitEthernet' ? '10/100/1000BaseTX' : '10/100BaseTX';
      out += `${abbrevIfaceName(i.name).padEnd(10)}${(i.description || '').slice(0, 18).padEnd(19)}${st.padEnd(13)}${vl.padEnd(11)}${'auto'.padEnd(8)}${'auto'.padEnd(6)}${typ}\n`;
    }
    return out.trimEnd();
  }

  showIpRoute() {
    const d = this.device;
    if (this.isSwitch && !isRouting(d)) {
      return `Default gateway is ${d.defaultGateway || 'not set'}\n\nHost               Gateway           Last Use    Total Uses  Interface\nICMP redirect cache is empty`;
    }
    const routes = d.getRoutes(this.topology);
    const codes = `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP
       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area
       * - candidate default, U - per-user static route, o - ODR
       P - periodic downloaded static route
`;
    const def = routes.find(r => r.network === '0.0.0.0' && r.mask === '0.0.0.0');
    let gw = 'Gateway of last resort is not set';
    if (def) gw = def.nextHop ? `Gateway of last resort is ${def.nextHop} to network 0.0.0.0` : `Gateway of last resort is 0.0.0.0 to network 0.0.0.0`;

    const sortKey = (r) => IPUtils.parseIP(r.network) * 64 + IPUtils.maskToPrefix(r.mask);
    const nonDefault = routes.filter(r => r !== def).sort((a, b) => sortKey(a) - sortKey(b));
    const groups = new Map();
    for (const r of nonDefault) {
      const cn = IPUtils.classfulNetwork(r.network);
      if (!groups.has(cn)) groups.set(cn, []);
      groups.get(cn).push(r);
    }
    const age = () => `00:00:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}`;
    const fmt = (r, indent, withPrefix = true) => {
      const code = r.code.padEnd(indent ? 8 : 5);
      const dest = withPrefix ? `${r.network}/${IPUtils.maskToPrefix(r.mask)}` : r.network;
      if (r.code === 'C' || r.code === 'L') return `${code}${dest} is directly connected, ${r.iface}`;
      if (r.static) {
        if (r.iface && !r.nextHop) return `${code}${dest} is directly connected, ${r.iface}`;
        return `${code}${dest} [${r.ad}/0] via ${r.nextHop}${r.iface ? `, ${r.iface}` : ''}`;
      }
      return `${code}${dest} [${r.ad}/${r.metric}] via ${r.nextHop}, ${age()}, ${r.iface}`;
    };
    let body = '';
    for (const [cn, list] of groups) {
      const cmask = IPUtils.classfulMask(cn);
      if (list.length === 1 && list[0].mask === cmask) {
        body += fmt(list[0], false) + '\n';
        continue;
      }
      const masks = new Set(list.map(r => r.mask));
      if (masks.size > 1) {
        body += `     ${cn}/${IPUtils.maskToPrefix(cmask)} is variably subnetted, ${list.length} subnets, ${masks.size} masks\n`;
        for (const r of list) body += fmt(r, true) + '\n';
      } else {
        body += `     ${cn}/${IPUtils.maskToPrefix(list[0].mask)} is subnetted, ${list.length} subnets\n`;
        for (const r of list) body += fmt(r, true, false) + '\n';
      }
    }
    if (def) body += fmt(def, false).replace(/^(\S+)\s*/, (m, c) => c.padEnd(5)) + '\n';
    return `${codes}\n${gw}\n\n${body}`.trimEnd();
  }

  showIpProtocols() {
    const d = this.device;
    let out = '';
    if (d.ospf) {
      out += `\nRouting Protocol is "ospf ${d.ospf.processId}"\n  Outgoing update filter list for all interfaces is not set \n  Incoming update filter list for all interfaces is not set \n  Router ID ${this.topology.ospfRouterId(d)}\n  Number of areas in this router is 1. 1 normal 0 stub 0 nssa\n  Maximum path: 4\n  Routing for Networks:\n`;
      for (const n of d.ospf.networks) out += `    ${n.network} ${n.wildcard} area ${n.area}\n`;
      if (d.ospf.passive.length) out += `  Passive Interface(s): \n${d.ospf.passive.map(p => `    ${p}\n`).join('')}`;
      out += '  Routing Information Sources:  \n    Gateway         Distance      Last Update \n';
      for (const n of this.topology.getNeighbors(d, 'ospf')) out += `    ${this.topology.ospfRouterId(n.router).padEnd(16)}110           00:00:12\n`;
      out += '  Distance: (default is 110)\n';
    }
    if (d.ripEnabled || d.ripNetworks.length) {
      out += `\nRouting Protocol is "rip"\nSending updates every 30 seconds, next due in 12 seconds\nInvalid after 180 seconds, hold down 180, flushed after 240\nOutgoing update filter list for all interfaces is not set\nIncoming update filter list for all interfaces is not set\nRedistributing: rip\nDefault version control: send version ${d.ripVersion}, receive ${d.ripVersion === 2 ? '2' : 'any version'}\n  Interface             Send  Recv  Triggered RIP  Key-chain\n`;
      for (const i of this.topology._ripIfaces(d)) out += `  ${i.name.padEnd(22)}${String(d.ripVersion).padEnd(6)}${(d.ripVersion === 2 ? '2' : '2 1').padEnd(6)}\n`;
      out += `Automatic network summarization is ${d.ripAutoSummary ? 'in effect' : 'not in effect'}\nMaximum path: 4\nRouting for Networks:\n${d.ripNetworks.map(n => `\t${n}\n`).join('')}`;
      if ((d.ripPassive || []).length) out += `Passive Interface(s):\n${d.ripPassive.map(p => `\t${p}\n`).join('')}`;
      out += 'Routing Information Sources:\n\tGateway         Distance      Last Update\n';
      for (const n of this.topology.getNeighbors(d, 'rip')) out += `\t${n.nbrIface.ip.padEnd(16)}120           00:00:0${Math.floor(Math.random() * 9)}\n`;
      out += 'Distance: (default is 120)\n';
    }
    return out.trim() ? out.trimEnd() : '';
  }

  showOspf() {
    const d = this.device;
    if (!d.ospf) return '%OSPF: Router process not running';
    return ` Routing Process "ospf ${d.ospf.processId}" with ID ${this.topology.ospfRouterId(d)}\n Supports only single TOS(TOS0) routes\n Supports opaque LSA\n SPF schedule delay 5 secs, Hold time between two SPFs 10 secs\n Number of areas in this router is 1. 1 normal 0 stub 0 nssa`;
  }

  showOspfNeighbor() {
    const d = this.device;
    if (!d.ospf) return '';
    const myRid = this.topology.ospfRouterId(d);
    let out = '\n\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n';
    for (const n of this.topology.getNeighbors(d, 'ospf')) {
      const rid = this.topology.ospfRouterId(n.router);
      const state = n.outIface.type === 'Serial' ? 'FULL/  -' : (IPUtils.parseIP(rid) > IPUtils.parseIP(myRid) ? 'FULL/DR' : 'FULL/BDR');
      const pri = n.outIface.type === 'Serial' ? 0 : 1;
      out += `${rid.padEnd(16)}${String(pri).padStart(3)}   ${state.padEnd(16)}00:00:3${Math.floor(Math.random() * 9)}    ${n.nbrIface.ip.padEnd(16)}${n.outIface.name}\n`;
    }
    return out.trimEnd();
  }

  showRipDb() {
    const d = this.device;
    const routes = d.getRoutes(this.topology).filter(r => r.code.startsWith('R') || r.code === 'C');
    return routes.map(r => `${r.network}/${IPUtils.maskToPrefix(r.mask)}    ${r.code === 'C' ? 'directly connected, ' + r.iface : `\n    [${r.metric}] via ${r.nextHop}, 00:00:12, ${r.iface}`}`).join('\n');
  }

  showDhcpBinding() {
    let out = 'IP address       Client-ID/              Lease expiration        Type\n                 Hardware address\n';
    for (const p of this.device.dhcpPools) {
      for (const [mac, ip] of Object.entries(p.leases || {})) out += `${ip.padEnd(17)}${mac.toUpperCase().padEnd(24)}--                     Automatic\n`;
    }
    return out.trimEnd();
  }

  showDhcpPool() {
    return this.device.dhcpPools.map(p => {
      const leased = Object.keys(p.leases || {}).length;
      const size = p.mask ? ((~IPUtils.parseIP(p.mask)) >>> 0) - 1 : 0;
      return `\nPool ${p.name} :\n Utilization mark (high/low)    : 100 / 0\n Subnet size (first/next)       : 0 / 0 \n Total addresses                : ${size}\n Leased addresses               : ${leased}\n Excluded addresses             : ${this.device.dhcpExcluded.length}\n Pending event                  : none\n\n 1 subnet is currently in the pool\n Current index        IP address range                    Leased/Excluded/Total\n ${p.network || '0.0.0.0'}          ${p.network || '0.0.0.0'}       - ${p.network && p.mask ? IPUtils.broadcastOf(p.network, p.mask) : '0.0.0.0'}     ${leased}    / ${this.device.dhcpExcluded.length}     / ${size}`;
    }).join('\n');
  }

  showAccessLists() {
    let out = '';
    for (const [num, rules] of Object.entries(this.device.acls).sort((a, b) => a[0] - b[0])) {
      out += `${num < 100 ? 'Standard' : 'Extended'} IP access list ${num}\n`;
      for (const r of rules) if (!r.remark) out += `    ${r.seq} ${r.text}${r.matches ? ` (${r.matches} match(es))` : ''}\n`;
    }
    return out.trimEnd();
  }

  showArp() {
    const d = this.device;
    let out = 'Protocol  Address          Age (min)  Hardware Addr   Type   Interface\n';
    const rows = [];
    for (const i of d.interfaces) if (i.ip && i.isPhysicalUp) rows.push({ ip: i.ip, age: '-', mac: i.mac, iface: i.name });
    for (const [ip, e] of d.arpTable) rows.push({ ip, age: String(Math.floor((Date.now() - e.learnedAt) / 60000)), mac: e.mac, iface: e.iface });
    rows.sort((a, b) => IPUtils.parseIP(a.ip) - IPUtils.parseIP(b.ip));
    for (const r of rows) out += `Internet  ${r.ip.padEnd(17)}${r.age.padStart(9)}   ${r.mac.padEnd(16)}ARPA   ${r.iface}\n`;
    return out.trimEnd();
  }

  showMac() {
    let out = '          Mac Address Table\n-------------------------------------------\n\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n\n';
    const entries = [...this.device.macTable.values()].sort((a, b) => a.vlan - b.vlan || a.mac.localeCompare(b.mac));
    for (const e of entries) out += `${String(e.vlan).padStart(4)}    ${e.mac.padEnd(18)}DYNAMIC     ${shortIfaceName(e.port)}\n`;
    return out.trimEnd();
  }

  _vlanPorts(id) {
    return this.device.interfaces.filter(i => i.isDataPort && !i.routed && i.mode !== 'trunk' && i.accessVlan === id).map(i => shortIfaceName(i.name));
  }

  showVlanBrief() {
    const d = this.device;
    let out = '\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n';
    const all = [...d.vlans, ...[1002, 1003, 1004, 1005].map(id => ({ id, name: { 1002: 'fddi-default', 1003: 'token-ring-default', 1004: 'fddinet-default', 1005: 'trnet-default' }[id], status: 'active' }))];
    for (const v of all) {
      const ports = this._vlanPorts(v.id);
      const lines = [];
      for (let k = 0; k < ports.length; k += 4) lines.push(ports.slice(k, k + 4).join(', ') + (k + 4 < ports.length ? ',' : ''));
      out += `${String(v.id).padEnd(5)}${v.name.slice(0, 32).padEnd(33)}${(v.status || 'active').padEnd(10)}${lines[0] || ''}\n`;
      for (const l of lines.slice(1)) out += `${' '.repeat(48)}${l}\n`;
    }
    return out.trimEnd();
  }

  showVlan() {
    return this.showVlanBrief() + '\n\nVLAN Type  SAID       MTU   Parent RingNo BridgeNo Stp  BrdgMode Trans1 Trans2\n---- ----- ---------- ----- ------ ------ -------- ---- -------- ------ ------\n' +
      this.device.vlans.map(v => `${String(v.id).padEnd(5)}enet  ${String(100000 + v.id).padEnd(11)}1500  -      -      -        -    -        0      0`).join('\n');
  }

  showTrunk() {
    const trunks = this.device.interfaces.filter(i => i.isDataPort && i.mode === 'trunk' && i.isPhysicalUp);
    if (!trunks.length) return '';
    const act = (i) => this.device.vlans.filter(v => i.isVlanAllowed(v.id)).map(v => v.id).join(',');
    let out = 'Port        Mode         Encapsulation  Status        Native vlan\n';
    for (const i of trunks) out += `${shortIfaceName(i.name).padEnd(12)}on           802.1q         trunking      ${i.nativeVlan}\n`;
    out += '\nPort        Vlans allowed on trunk\n';
    for (const i of trunks) out += `${shortIfaceName(i.name).padEnd(12)}${i.allowedVlans === 'all' ? '1-1005' : i.allowedVlans}\n`;
    out += '\nPort        Vlans allowed and active in management domain\n';
    for (const i of trunks) out += `${shortIfaceName(i.name).padEnd(12)}${act(i)}\n`;
    out += '\nPort        Vlans in spanning tree forwarding state and not pruned\n';
    for (const i of trunks) out += `${shortIfaceName(i.name).padEnd(12)}${act(i)}\n`;
    return out.trimEnd();
  }

  showCdp(detail) {
    const d = this.device;
    const nbrs = [];
    for (const i of d.interfaces) {
      const r = i.connectedRemoteInterface;
      if (!r || !i.isPhysicalUp || !i.isDataPort) continue;
      const rd = r.device;
      if (rd.type !== 'router' && rd.type !== 'switch') continue;
      if (rd.isHub) continue;
      nbrs.push({ i, r, rd });
    }
    if (detail) {
      return nbrs.map(n => `\nDevice ID: ${n.rd.hostname}\nEntry address(es): \n${n.rd.interfaces.filter(x => x.ip).map(x => `  IP address : ${x.ip}\n`).join('')}Platform: cisco ${n.rd.model}, Capabilities: ${n.rd.type === 'router' ? 'Router' : 'Switch'}\nInterface: ${n.i.name}, Port ID (outgoing port): ${n.r.name}\nHoldtime: 171\n\nVersion :\n${iosImage(n.rd).family} Software, Version ${iosImage(n.rd).ver}\n\nadvertisement version: 2\nDuplex: full\n-------------------------`).join('\n');
    }
    let out = 'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone\nDevice ID    Local Intrfce   Holdtme    Capability   Platform    Port ID\n';
    const sp = (n) => n.replace(/^([A-Za-z]+)/, (m) => shortIfaceName(m + '0').replace(/0$/, '') + ' ');
    for (const n of nbrs) {
      out += `${n.rd.hostname.slice(0, 12).padEnd(13)}${sp(n.i.name).padEnd(16)}${String(150 + Math.floor(Math.random() * 30)).padEnd(11)}${(n.rd.type === 'router' ? 'R' : 'S').padStart(10).padEnd(13)}${String(n.rd.model).padEnd(12)}${sp(n.r.name)}\n`;
    }
    return out.trimEnd();
  }

  /* ========================================================================== */
  /* running-config                                                             */
  /* ========================================================================== */

  _pw(p) {
    return this.device.servicePasswordEncryption ? `7 ${type7(p)}` : p;
  }

  runningConfig() {
    const d = this.device;
    const L = [];
    const bang = () => L.push('!');
    if (this.isRouter) {
      L.push('version 15.1', 'no service timestamps log datetime msec', 'no service timestamps debug datetime msec');
    } else {
      L.push('version 15.0', 'no service pad', 'service timestamps log datetime msec', 'service timestamps debug datetime msec');
    }
    L.push(d.servicePasswordEncryption ? 'service password-encryption' : 'no service password-encryption');
    bang();
    L.push(`hostname ${d.hostname}`);
    bang();
    if (d.enableSecret) L.push(`enable secret 5 ${md5ish(d.enableSecret)}`);
    if (d.enablePassword) L.push(`enable password ${this._pw(d.enablePassword)}`);
    bang();
    if (this.isL3) {
      for (const x of d.dhcpExcluded) L.push(`ip dhcp excluded-address ${x.start}${x.end && x.end !== x.start ? ' ' + x.end : ''}`);
      if (d.dhcpExcluded.length) bang();
      for (const p of d.dhcpPools) {
        L.push(`ip dhcp pool ${p.name}`);
        if (p.network) L.push(` network ${p.network} ${p.mask}`);
        if (p.defaultRouter) L.push(` default-router ${p.defaultRouter}`);
        if (p.dns) L.push(` dns-server ${p.dns}`);
      }
      bang();
      bang();
      if (this.isRouter) L.push('ip cef', 'no ipv6 cef');
      else if (d.ipRouting) L.push('ip routing');
    }
    bang();
    if (d.noDomainLookup) L.push('no ip domain-lookup');
    if (d.domainName) L.push(`ip domain-name ${d.domainName}`);
    for (const u of d.users || []) L.push(u.kind === 'secret' ? `username ${u.name} secret 5 ${md5ish(u.password)}` : `username ${u.name} password ${this._pw(u.password)}`);
    bang();
    if (this.isRouter) {
      L.push(`license udi pid CISCO${d.model}/K9 sn FTX152400KS`);
      bang();
    }
    bang();
    L.push('spanning-tree mode pvst');
    if (this.isSwitch) L.push('spanning-tree extend system-id');
    bang();
    bang();

    const ifs = [...d.interfaces.filter(i => i.type !== 'Wireless' && i.type !== 'Console')].sort((a, b) => {
      const rank = (i) => i.type === 'Loopback' ? 0 : i.vlanId != null ? 2 : 1;
      return rank(a) - rank(b);
    });
    for (const i of ifs) {
      L.push(`interface ${i.name}`);
      if (i.description) L.push(` description ${i.description}`);
      if (i.parentName && i.encapVlan) L.push(` encapsulation dot1Q ${i.encapVlan}`);
      if (this.isSwitch && i.vlanId == null && i.routed) {
        L.push(' no switchport');
        if (i.ip) L.push(` ip address ${i.ip} ${i.mask}`);
        else L.push(' no ip address');
        if (i.helperAddress) L.push(` ip helper-address ${i.helperAddress}`);
        if (i.aclIn != null) L.push(` ip access-group ${i.aclIn} in`);
        if (i.aclOut != null) L.push(` ip access-group ${i.aclOut} out`);
      } else if (this.isSwitch && i.vlanId == null) {
        if (i.trunkEncap) L.push(' switchport trunk encapsulation dot1q');
        if (i.accessVlan !== 1 && i.mode !== 'trunk') L.push(` switchport access vlan ${i.accessVlan}`);
        if (i.nativeVlan !== 1) L.push(` switchport trunk native vlan ${i.nativeVlan}`);
        if (i.allowedVlans !== 'all') L.push(` switchport trunk allowed vlan ${i.allowedVlans}`);
        if (i.mode === 'trunk') L.push(' switchport mode trunk');
        else if (i.accessVlan !== 1 || i.portfast) L.push(' switchport mode access');
        if (i.portfast) L.push(' spanning-tree portfast');
      } else {
        if (i.ip) L.push(i.dhcpClient ? ' ip address dhcp' : ` ip address ${i.ip} ${i.mask}`);
        else L.push(' no ip address');
        if (i.helperAddress) L.push(` ip helper-address ${i.helperAddress}`);
        if (i.aclIn != null) L.push(` ip access-group ${i.aclIn} in`);
        if (i.aclOut != null) L.push(` ip access-group ${i.aclOut} out`);
        if (i.ospfCost) L.push(` ip ospf cost ${i.ospfCost}`);
      }
      if (i.type === 'Serial' && i.clockRate && i.connectedCable && i.connectedCable.ifaceA === i) L.push(` clock rate ${i.clockRate}`);
      if (this.isRouter && !i.isVirtual && i.type !== 'Serial') {
        if (i.bandwidth !== ({ FastEthernet: 100000, GigabitEthernet: 1000000 }[i.type] || i.bandwidth)) L.push(` bandwidth ${i.bandwidth}`);
        L.push(` duplex ${i.duplex}`, ` speed ${i.speed}`);
      }
      if (!i.isUp) L.push(' shutdown');
      bang();
    }
    if (this.isRouter) {
      L.push('interface Vlan1', ' no ip address', ' shutdown');
      bang();
    }
    if (this.isL3) {
      if (d.ospf) {
        L.push(`router ospf ${d.ospf.processId}`);
        if (d.ospf.routerId) L.push(` router-id ${d.ospf.routerId}`);
        L.push(' log-adjacency-changes');
        for (const p of d.ospf.passive) L.push(` passive-interface ${p}`);
        for (const n of d.ospf.networks) L.push(` network ${n.network} ${n.wildcard} area ${n.area}`);
        if (d.ospf.defaultOriginate) L.push(' default-information originate');
        bang();
      }
      if (d.ripEnabled || d.ripNetworks.length) {
        L.push('router rip');
        if (d.ripVersion === 2) L.push(' version 2');
        for (const p of d.ripPassive || []) L.push(` passive-interface ${p}`);
        for (const n of d.ripNetworks) L.push(` network ${n}`);
        if (d.ripDefaultOriginate) L.push(' default-information originate');
        if (!d.ripAutoSummary) L.push(' no auto-summary');
        bang();
      }
      L.push('ip classless');
      for (const r of d.routingTable) L.push(`ip route ${r.destination} ${r.mask} ${[r.interfaceName, r.nextHop].filter(Boolean).join(' ')}${r.ad && r.ad !== 1 ? ' ' + r.ad : ''}`);
      bang();
      L.push('ip flow-export version 9');
      bang();
      for (const [num, rules] of Object.entries(d.acls).sort((a, b) => a[0] - b[0])) for (const r of rules) L.push(`access-list ${num} ${r.text}`);
      bang();
    }
    if (this.isSwitch && d.defaultGateway) {
      L.push(`ip default-gateway ${d.defaultGateway}`);
      bang();
    }
    if (d.bannerMotd) L.push(`banner motd ^C${d.bannerMotd}^C`);
    bang();
    bang();
    const line = (hdr, cfg, defLogin) => {
      L.push(hdr);
      if (cfg && cfg.password) L.push(` password ${this._pw(cfg.password)}`);
      if (cfg && cfg.login) L.push(cfg.loginLocal ? ' login local' : ' login');
      else if (defLogin) L.push(' login');
      if (cfg && cfg.transport) L.push(` transport input ${cfg.transport}`);
    };
    line('line con 0', d.lineCon, false);
    bang();
    if (this.isRouter) { L.push('line aux 0'); bang(); }
    line('line vty 0 4', d.lineVty, true);
    if (this.isSwitch) line('line vty 5 15', d.lineVty, true);
    bang();
    bang();
    L.push('end');
    const body = L.join('\n');
    return `Building configuration...\n\nCurrent configuration : ${body.length + 1} bytes\n!\n${body}\n`;
  }

  // Legacy alias used by older UI code
  _showRunningConfig() { return this.runningConfig(); }
}

function compressList(nums) {
  const out = [];
  for (let k = 0; k < nums.length;) {
    let j = k;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j > k ? `${nums[k]}-${nums[j]}` : `${nums[k]}`);
    k = j + 1;
  }
  return out.join(',');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
