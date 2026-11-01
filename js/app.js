/**
 * Cisco Packet Tracer Web - Full Interactive Controller
 * Optimized Fluid Drag & Drop (Zero extra clicks)
 */

import { NetworkTopology } from './engine.js';
import { CiscoIOSCLI } from './ios-cli.js';

const DEVICE_LOGICAL_ASSETS = {
  'router': 'assets/logical/iRouter@2x.png',
  'switch': 'assets/logical/iSwitch@2x.png',
  'switch3560': 'assets/logical/iSwitch3560@2x.png',
  'pc': 'assets/logical/iWorkstation@2x.png',
  'laptop': 'assets/logical/iLaptop@2x.png',
  'server': 'assets/logical/iServer@2x.png',
  'printer': 'assets/logical/iPrinter@2x.png',
  'cloud': 'assets/logical/iCloud@2x.png',
  'wireless_router': 'assets/logical/iHomeRouter@2x.png',
  'wlc': 'assets/logical/iWLC@2x.png',
  'ap': 'assets/logical/iAccessPoint@2x.png',
  'lap': 'assets/logical/iLightWeightAccessPoint@2x.png',
  'home_gateway': 'assets/logical/iHomeGateway@2x.png',
  'cell_tower': 'assets/logical/iCellTower@2x.png',
  'co_server': 'assets/logical/iServerCO@2x.png',
  'dsl': 'assets/logical/iModem@2x.png',
  'cable_modem': 'assets/logical/iModem@2x.png'
};

const COMPONENT_PALETTES = {
  'network-devices': {
    name: 'Network Devices',
    subs: [
      { id: 'routers', name: 'Routers', icon: 'assets/components/Router25x25.png' },
      { id: 'switches', name: 'Switches', icon: 'assets/components/Specific2960_40x40.png' },
      { id: 'hubs', name: 'Hubs', icon: 'assets/components/Hub25x25.png' },
      { id: 'wireless', name: 'Wireless Devices', icon: 'assets/components/Wireless25x25.png' },
      { id: 'security', name: 'Security', icon: 'assets/components/ASA.png' },
      { id: 'wan', name: 'WAN Emulation', icon: 'assets/logical/iCloud@2x.png' }
    ],
    items: {
      'routers': [
        { type: 'router', model: '4331', name: '4331', fullName: 'Cisco 4331 Integrated Services Router', icon: 'assets/components/Specific4331_40x40.png' },
        { type: 'router', model: '4321', name: '4321', fullName: 'Cisco 4321 Integrated Services Router', icon: 'assets/components/Specific4321_40x40.png' },
        { type: 'router', model: '1941', name: '1941', fullName: 'Cisco 1941 Integrated Services Router', icon: 'assets/components/Specific1941_40x40.png' },
        { type: 'router', model: '2901', name: '2901', fullName: 'Cisco 2901 Integrated Services Router', icon: 'assets/components/Specific2901_40x40.png' },
        { type: 'router', model: '2911', name: '2911', fullName: 'Cisco 2911 Integrated Services Router', icon: 'assets/components/Specific2911_40x40.png' },
        { type: 'router', model: '2620XM', name: '2620XM', fullName: 'Cisco 2620XM Modular Router', icon: 'assets/components/Specific2620XM_40x40.png' },
        { type: 'router', model: '2621XM', name: '2621XM', fullName: 'Cisco 2621XM Modular Router', icon: 'assets/components/Specific2621XM_40x40.png' },
        { type: 'router', model: '2811', name: '2811', fullName: 'Cisco 2811 Integrated Services Router', icon: 'assets/components/Specific2811_40x40.png' },
        { type: 'router', model: 'Router-PT', name: 'PT-Router', fullName: 'Generic Router-PT', icon: 'assets/components/SpecificArtificialRouter_40x40.png' },
        { type: 'router', model: 'Router-Empty', name: 'PT-Empty', fullName: 'Router-PT-Empty Modular', icon: 'assets/components/SpecificArtificialRouterEmpty_40x40.png' }
      ],
      'switches': [
        { type: 'switch', model: '2960', name: '2960-24TT', fullName: 'Cisco Catalyst 2960-24TT Switch', icon: 'assets/components/Specific2960_40x40.png' },
        { type: 'switch', model: '3560-24PS', name: '3560-24PS', fullName: 'Cisco Catalyst 3560-24PS Multilayer Switch', icon: 'assets/components/Specific3560_24PS_40x40.png' },
        { type: 'switch', model: '2950-24', name: '2950-24', fullName: 'Cisco Catalyst 2950-24 Switch', icon: 'assets/components/Specific2950-24_40x40.png' },
        { type: 'switch', model: '2950T', name: '2950T-24', fullName: 'Cisco Catalyst 2950T Switch', icon: 'assets/components/Specific2950T_40x40.png' },
        { type: 'switch', model: 'Switch-PT', name: 'PT-Switch', fullName: 'Generic Switch-PT', icon: 'assets/components/SpecificArtificialSwitch_40x40.png' },
        { type: 'switch', model: 'Switch-Empty', name: 'PT-Empty', fullName: 'Switch-PT-Empty', icon: 'assets/components/SpecificArtificialSwitchEmpty_40x40.png' }
      ],
      'hubs': [
        { type: 'switch', model: 'Hub-PT', name: 'PT-Hub', fullName: 'Generic Hub-PT', icon: 'assets/components/SpecificArtificialHub_40x40.png' },
        { type: 'switch', model: 'Repeater-PT', name: 'PT-Repeater', fullName: 'Generic Repeater-PT', icon: 'assets/components/SpecificArtificialRepeater_40x40.png' }
      ],
      'wireless': [
        { type: 'wireless_router', model: 'HomeRouter-PT-AC', name: 'HomeRouter-PT-AC', fullName: 'HomeRouter-PT-AC Wireless Router', icon: 'assets/components/SpecificHomeRouter_40x40.png' },
        { type: 'wireless_router', model: 'HomeRouter', name: 'Home Router', fullName: 'Linksys WRT300N Wireless Home Router', icon: 'assets/components/SpecificHomeRouter_40x40.png' },
        { type: 'router', model: '3504', name: 'WLC 3504', fullName: 'Cisco 3504 Wireless LAN Controller', icon: 'assets/components/Specific3504_40x40.png' },
        { type: 'router', model: '2504', name: 'WLC 2504', fullName: 'Cisco 2504 Wireless LAN Controller', icon: 'assets/components/Specific2504_40x40.png' },
        { type: 'switch', model: 'AP-PT', name: 'AP-PT', fullName: 'Generic Access Point AP-PT', icon: 'assets/components/SpecificArtificialAccessPoint_40x40.png' },
        { type: 'switch', model: 'LAP-PT', name: 'LAP-PT', fullName: 'Lightweight Access Point LAP-PT', icon: 'assets/components/LAP-PT.png' },
        { type: 'switch', model: 'AP-PT-A', name: 'AP-PT-A', fullName: 'Access Point 802.11a AP-PT-A', icon: 'assets/components/SpecificArtificialAccessPoint_40x40.png' },
        { type: 'switch', model: 'AP-PT-AC', name: 'AP-PT-AC', fullName: 'Access Point 802.11ac AP-PT-AC', icon: 'assets/components/SpecificArtificialAccessPoint_40x40.png' },
        { type: 'switch', model: 'AP-PT-N', name: 'AP-PT-N', fullName: 'Access Point 802.11n AP-PT-N', icon: 'assets/components/SpecificArtificialAccessPoint_40x40.png' },
        { type: 'pc', model: 'HomeGateway', name: 'Home Gateway', fullName: 'IoT Home Gateway', icon: 'assets/components/SpecificHomeGateway_40x40.png' },
        { type: 'router', model: 'CellTower', name: 'Cell Tower', fullName: 'Cellular Base Station Tower', icon: 'assets/components/SpecificCellTower_40x40.png' },
        { type: 'server', model: 'CO-Server', name: 'CO Server', fullName: 'Central Office Server', icon: 'assets/components/SpecificServerCO _40x40.png' }
      ],
      'security': [
        { type: 'router', model: 'ASA5505', name: 'ASA 5505', fullName: 'Cisco ASA 5505 Adaptive Security Appliance', icon: 'assets/components/SpecificASA5505.png' },
        { type: 'router', model: 'ASA5506', name: 'ASA 5506-X', fullName: 'Cisco ASA 5506-X Next-Gen Firewall', icon: 'assets/components/SpecificASA5506.png' }
      ],
      'wan': [
        { type: 'cloud', model: 'Cloud-PT', name: 'Cloud-PT', fullName: 'Generic Multiuser Cloud-PT', icon: 'assets/components/SpecificArtificialCloud_40x40.png' },
        { type: 'cloud', model: 'Cloud-Empty', name: 'PT-Empty', fullName: 'Cloud-PT-Empty Modular', icon: 'assets/components/SpecificArtificialCloudEmpty_40x40.png' },
        { type: 'router', model: 'DSL-Modem', name: 'DSL-Modem', fullName: 'Modem DSL-PT', icon: 'assets/components/SpecificDSL-Modem_40x40.png' },
        { type: 'router', model: 'Cable-Modem', name: 'Cable-Modem', fullName: 'Modem Cable-PT', icon: 'assets/components/SpecificCable-Modem_40x40.png' }
      ]
    }
  },
  'end-devices': {
    name: 'End Devices',
    subs: [
      { id: 'end-devices', name: 'End Devices', icon: 'assets/components/EndTypes25x25.png' },
      { id: 'home', name: 'Home Devices', icon: 'assets/components/SpecificHomeGateway_40x40.png' }
    ],
    items: {
      'end-devices': [
        { type: 'pc', model: 'PC-PT', name: 'PC', fullName: 'PC-PT Personal Computer', icon: 'assets/components/SpecificArtificialWorkstation_40x40.png' },
        { type: 'laptop', model: 'Laptop-PT', name: 'Laptop', fullName: 'Laptop-PT Portable Computer', icon: 'assets/components/SpecificArtificialLaptop_40x40.png' },
        { type: 'server', model: 'Server-PT', name: 'Server', fullName: 'Server-PT Standalone Server', icon: 'assets/components/SpecificArtificialServer_40x40.png' },
        { type: 'server', model: 'MerakiServer', name: 'Meraki Server', fullName: 'Cisco Meraki Cloud Server', icon: 'assets/components/SpecificServerCO _40x40.png' },
        { type: 'printer', model: 'Printer-PT', name: 'Printer', fullName: 'Printer-PT Network Printer', icon: 'assets/components/SpecificArtificialPrinter_40x40.png' },
        { type: 'pc', model: 'IPPhone-PT', name: 'IP Phone', fullName: 'Cisco IP Phone 7960', icon: 'assets/components/SpecificIPPhone_40x40.png' },
        { type: 'pc', model: 'VoIP-PT', name: 'VoIP Device', fullName: 'Home VoIP Terminal Adapter', icon: 'assets/components/SpecificHomeVoip_40x40.png' },
        { type: 'pc', model: 'Phone-PT', name: 'Phone', fullName: 'Analog Telephone RJ-11', icon: 'assets/components/SpecificAnalogPhone_40x40.png' },
        { type: 'pc', model: 'TV-PT', name: 'TV', fullName: 'TV-PT Network TV', icon: 'assets/components/SpecificArtificialTV_40x40.png' },
        { type: 'pc', model: 'Tablet-PT', name: 'Tablet', fullName: 'Tablet PC Wireless', icon: 'assets/components/SpecificArtificialTabletPC_40x40.png' },
        { type: 'pc', model: 'SmartPhone-PT', name: 'Smart Phone', fullName: 'Smart Phone Mobile PDA', icon: 'assets/components/SpecificArtificialPda_40x40.png' },
        { type: 'pc', model: 'Wireless-EndDevice', name: 'Generic Wireless', fullName: 'Generic Wireless End Device', icon: 'assets/components/SpecificArtificialWirelessEndDevice_40x40.png' },
        { type: 'pc', model: 'Wired-EndDevice', name: 'Generic Wired', fullName: 'Generic Wired End Device', icon: 'assets/components/SpecificArtificialWiredEndDevice_40x40.png' },
        { type: 'pc', model: 'Sniffer-PT', name: 'Sniffer', fullName: 'Network Packet Sniffer Analyzer', icon: 'assets/components/Sniffer_Specific40x40.png' }
      ],
      'home': [
        { type: 'pc', model: 'HomeGateway', name: 'Home Gateway', fullName: 'IoT Home Gateway', icon: 'assets/components/SpecificHomeGateway_40x40.png' }
      ]
    }
  },
  'connections': {
    name: 'Connections',
    subs: [
      { id: 'cables', name: 'Connections', icon: 'assets/components/Connections25x25.png' }
    ],
    items: {
      'cables': [
        { type: 'cable_auto', model: 'auto', name: 'Auto', fullName: 'Automatically Choose Connection Type', icon: 'assets/components/SpecificAutoConnect_40x40.png' },
        { type: 'cable_console', model: 'console', name: 'Console', fullName: 'Console Cable (Rollover)', icon: 'assets/components/SpecificConsole_40x40.png' },
        { type: 'cable_straight', model: 'straight', name: 'Copper Straight', fullName: 'Copper Straight-Through (Cat 6)', icon: 'assets/components/SpecificCopperStraight_40x40.png' },
        { type: 'cable_crossover', model: 'crossover', name: 'Copper Cross', fullName: 'Copper Cross-Over', icon: 'assets/components/SpecificCrossConnect_40x40.png' },
        { type: 'cable_fiber', model: 'fiber', name: 'Fiber', fullName: 'Fiber Optic Cable', icon: 'assets/components/SpecificFiber_40x40.png' },
        { type: 'cable_phone', model: 'phone', name: 'Phone', fullName: 'Telephone Line (RJ-11)', icon: 'assets/components/SpecificPhone_40x40.png' },
        { type: 'cable_coaxial', model: 'coaxial', name: 'Coaxial', fullName: 'Coaxial Cable', icon: 'assets/components/SpecificCoaxial_40x40.png' },
        { type: 'cable_serial_dce', model: 'serial', name: 'Serial DCE', fullName: 'Serial DCE Cable (Clock rate provider)', icon: 'assets/components/SpecificSerialDCE_40x40.png' },
        { type: 'cable_serial_dte', model: 'serial', name: 'Serial DTE', fullName: 'Serial DTE Cable', icon: 'assets/components/SpecificSerialDTE_40x40.png' }
      ]
    }
  }
};

class AppController {
  constructor() {
    this.topology = new NetworkTopology();
    this.currentTool = 'select';
    this.activeCategory = 'network-devices';
    this.activeSub = 'routers';
    this.pendingPlacement = null;
    this.connectingDevA = null;
    this.connectingIfaceA = null;
    this.pduSource = null;
    this.clis = new Map();
    this.simSeconds = 0;
    this.shapes = [];
    this.notes = [];
    this.selectedShape = null;
    this.isDrawingShape = false;
    this.drawStart = { x: 0, y: 0 };

    this.initDOM();
    this.initTimer();
    this.initEvents();
    this.renderCategoryTiers();
    this.topology.loadAuthenticLab();
  }

  initDOM() {
    this.viewport = document.getElementById('canvas-container');
    this.svg = document.getElementById('network-svg');
    this.svgShapesLayer = document.getElementById('svg-shapes-layer');
    this.svgCablesLayer = document.getElementById('svg-cables-layer');
    this.svgPacketsLayer = document.getElementById('svg-packets-layer');
    this.devicesScrollStrip = document.getElementById('devices-scroll-strip');
    this.catSubRow = document.getElementById('cat-sub-row');
    this.currentCatNameLabel = document.getElementById('current-cat-name-label');
    this.deviceHoverLabel = document.getElementById('device-hover-label');
    this.pduFullTableBody = document.getElementById('pdu-full-table-body');
    this.portPicker = document.getElementById('port-picker');
    this.portPickerList = document.getElementById('port-picker-list');
    this.modal = document.getElementById('pt-device-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalIcon = document.getElementById('modal-icon');
    this.modalTabs = document.getElementById('modal-tabs');
    this.modalContent = document.getElementById('modal-content');
    this.coordTracker = document.getElementById('coord-tracker');
    this.dockTimerText = document.getElementById('dock-timer-text');
  }

  initTimer() {
    setInterval(() => {
      this.simSeconds++;
      const hrs = String(Math.floor(this.simSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((this.simSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(this.simSeconds % 60).padStart(2, '0');
      this.dockTimerText.innerText = `${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  initEvents() {
    // 1. Mouse coordinate tracking
    this.viewport.addEventListener('mousemove', (e) => {
      const rect = this.viewport.getBoundingClientRect();
      const x = Math.max(0, Math.round(e.clientX - rect.left));
      const y = Math.max(0, Math.round(e.clientY - rect.top));
      this.coordTracker.innerText = `x: ${x}, y: ${y}`;
    });

    // 2. Direct Drag-and-Drop from Palette onto Canvas
    this.viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const item = JSON.parse(raw);
        const rect = this.viewport.getBoundingClientRect();
        const x = Math.max(30, Math.round(e.clientX - rect.left));
        const y = Math.max(30, Math.round(e.clientY - rect.top));

        this.topology.addDevice(item.type, null, item.model, x, y);
        this.deviceHoverLabel.innerText = '';
        this.setTool('select', 'tool-select');
      } catch (err) {
        console.error(err);
      }
    });

    // 3. Preset Lab loader
    document.getElementById('tb-load-lab').addEventListener('click', () => {
      this.topology.loadAuthenticLab();
      this.renderCanvas();
    });

    // 4. Clear / New Lab
    document.getElementById('tb-new').addEventListener('click', () => {
      if (confirm('¿Desea crear un nuevo archivo y vaciar la topología?')) {
        this.topology.devices.clear();
        this.topology.cables = [];
        this.topology.pduList = [];
        this.shapes = [];
        this.notes = [];
        this.topology.emit('topology-changed');
      }
    });

    // 5. Secondary Action Toolbar Buttons
    const toolMap = {
      'tool-select': 'select',
      'tool-inspect': 'inspect',
      'tool-delete': 'delete',
      'tool-resize': 'resize',
      'tool-note': 'note',
      'tool-draw-line': 'draw_line',
      'tool-draw-rect': 'draw_rect',
      'tool-draw-ellipse': 'draw_ellipse',
      'tool-draw-polygon': 'draw_polygon',
      'tool-pdu-simple': 'pdu_simple',
      'tool-pdu-complex': 'pdu_complex'
    };

    Object.entries(toolMap).forEach(([btnId, toolName]) => {
      document.getElementById(btnId).addEventListener('click', () => {
        this.setTool(toolName, btnId);
      });
    });

    // 6. Logical / Physical pill buttons
    document.getElementById('btn-view-logical').addEventListener('click', () => {
      document.getElementById('btn-view-logical').classList.add('active');
      document.getElementById('btn-view-physical').classList.remove('active');
    });

    document.getElementById('btn-view-physical').addEventListener('click', () => {
      document.getElementById('btn-view-physical').classList.add('active');
      document.getElementById('btn-view-logical').classList.remove('active');
    });

    // 7. Realtime / Simulation Tabs
    document.getElementById('tab-realtime').addEventListener('click', () => {
      document.getElementById('tab-realtime').classList.add('active');
      document.getElementById('tab-simulation').classList.remove('active');
      this.topology.isSimulationMode = false;
    });

    document.getElementById('tab-simulation').addEventListener('click', () => {
      document.getElementById('tab-simulation').classList.add('active');
      document.getElementById('tab-realtime').classList.remove('active');
      this.topology.isSimulationMode = true;
    });

    // 8. Reset and Fast-forward
    document.getElementById('btn-sim-reset').addEventListener('click', () => {
      this.simSeconds = 0;
      this.dockTimerText.innerText = '00:00:00';
      this.topology.activeSimEvents = [];
      this.topology.emit('animation-frame');
    });

    let ffwActive = false;
    document.getElementById('btn-sim-ffw').addEventListener('click', () => {
      ffwActive = !ffwActive;
      this.topology.simSpeed = ffwActive ? 3.0 : 1.0;
      document.getElementById('btn-sim-ffw').style.background = ffwActive ? '#0284c7' : 'transparent';
    });

    // 9. Category Tiers (Top Row of 6 Category Icons)
    document.querySelectorAll('.cat-btn-square').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn-square').forEach(b => {
          b.classList.remove('active');
          const cat = b.dataset.cat;
          const img = b.querySelector('img');
          if (cat === 'network-devices') img.src = 'assets/components/group0.png';
          if (cat === 'end-devices') img.src = 'assets/components/group1.png';
          if (cat === 'components') img.src = 'assets/components/group2.png';
          if (cat === 'connections') img.src = 'assets/components/group3.png';
          if (cat === 'misc') img.src = 'assets/components/group4.png';
          if (cat === 'multiuser') img.src = 'assets/components/group5.png';
        });

        btn.classList.add('active');
        const cat = btn.dataset.cat;
        const img = btn.querySelector('img');
        if (cat === 'network-devices') img.src = 'assets/components/group0_on.png';
        if (cat === 'end-devices') img.src = 'assets/components/group1_on.png';
        if (cat === 'components') img.src = 'assets/components/group2_on.png';
        if (cat === 'connections') img.src = 'assets/components/group3_on.png';
        if (cat === 'misc') img.src = 'assets/components/group4_on.png';
        if (cat === 'multiuser') img.src = 'assets/components/group5_on.png';

        this.activeCategory = cat;
        this.renderCategoryTiers();
      });
    });

    // 10. Modal close
    document.getElementById('modal-close').addEventListener('click', () => {
      this.modal.style.display = 'none';
    });

    // 11. Topology listener
    this.topology.on((name) => {
      if (name === 'topology-changed' || name === 'animation-frame') {
        this.renderCanvas();
      } else if (name === 'pdu-list-changed') {
        this.renderPDUTable();
      }
    });

    // 12. Canvas Drawing & Note Interaction
    this.viewport.addEventListener('mousedown', (e) => {
      const rect = this.viewport.getBoundingClientRect();
      const clickX = Math.round(e.clientX - rect.left);
      const clickY = Math.round(e.clientY - rect.top);

      if (e.target === this.viewport || e.target === this.svg) {
        this.portPicker.style.display = 'none';

        // Direct note creation at exact click location (No prompt popup!)
        if (this.currentTool === 'note') {
          const newNote = {
            id: 'note_' + Date.now(),
            text: '',
            x: clickX,
            y: clickY
          };
          this.notes.push(newNote);
          this.renderNotes();
          this.setTool('select', 'tool-select');

          // Auto-focus the newly created note's textarea immediately
          setTimeout(() => {
            const textarea = this.viewport.querySelector(`[data-note-id="${newNote.id}"] textarea`);
            if (textarea) textarea.focus();
          }, 50);
          return;
        }

        // Interactive shape drawing with mouse drag
        if (['draw_rect', 'draw_ellipse', 'draw_line', 'draw_polygon'].includes(this.currentTool)) {
          this.isDrawingShape = true;
          this.drawStart = { x: clickX, y: clickY };

          let newShape = null;
          if (this.currentTool === 'draw_rect') {
            newShape = { id: Date.now(), type: 'rect', x: clickX, y: clickY, w: 10, h: 10 };
          } else if (this.currentTool === 'draw_ellipse') {
            newShape = { id: Date.now(), type: 'ellipse', cx: clickX, cy: clickY, rx: 10, ry: 10 };
          } else if (this.currentTool === 'draw_line') {
            newShape = { id: Date.now(), type: 'line', x1: clickX, y1: clickY, x2: clickX + 10, y2: clickY + 10 };
          } else if (this.currentTool === 'draw_polygon') {
            newShape = { id: Date.now(), type: 'polygon', cx: clickX, cy: clickY, size: 40 };
          }

          if (newShape) {
            this.shapes.push(newShape);
            this.selectedShape = newShape;
            this.renderShapes();

            const onDrawMove = (me) => {
              if (!this.isDrawingShape) return;
              const curX = Math.round(me.clientX - rect.left);
              const curY = Math.round(me.clientY - rect.top);

              if (newShape.type === 'rect') {
                newShape.x = Math.min(this.drawStart.x, curX);
                newShape.y = Math.min(this.drawStart.y, curY);
                newShape.w = Math.max(15, Math.abs(curX - this.drawStart.x));
                newShape.h = Math.max(15, Math.abs(curY - this.drawStart.y));
              } else if (newShape.type === 'ellipse') {
                newShape.cx = Math.round((this.drawStart.x + curX) / 2);
                newShape.cy = Math.round((this.drawStart.y + curY) / 2);
                newShape.rx = Math.max(15, Math.round(Math.abs(curX - this.drawStart.x) / 2));
                newShape.ry = Math.max(15, Math.round(Math.abs(curY - this.drawStart.y) / 2));
              } else if (newShape.type === 'line') {
                newShape.x2 = curX;
                newShape.y2 = curY;
              }
              this.renderShapes();
            };

            const onDrawUp = () => {
              this.isDrawingShape = false;
              window.removeEventListener('mousemove', onDrawMove);
              window.removeEventListener('mouseup', onDrawUp);
              this.setTool('select', 'tool-select');
            };

            window.addEventListener('mousemove', onDrawMove);
            window.addEventListener('mouseup', onDrawUp);
          }
          return;
        }

        // Clicking empty canvas deselects any selected shape
        if (this.currentTool === 'select' || this.currentTool === 'resize') {
          if (this.selectedShape) {
            this.selectedShape = null;
            this.renderShapes();
          }
        }
      }
    });

    // 13. Canvas click handler (Click-to-place device fallback)
    this.viewport.addEventListener('click', (e) => {
      if (e.target === this.viewport || e.target === this.svg) {
        const rect = this.viewport.getBoundingClientRect();
        const clickX = Math.round(e.clientX - rect.left);
        const clickY = Math.round(e.clientY - rect.top);

        if (this.pendingPlacement) {
          this.topology.addDevice(
            this.pendingPlacement.type,
            null,
            this.pendingPlacement.model,
            clickX,
            clickY
          );
          this.pendingPlacement = null;
          this.setTool('select', 'tool-select');
        }
      }
    });
  }

  setTool(toolName, btnId = null) {
    this.currentTool = toolName;
    this.connectingDevA = null;
    this.connectingIfaceA = null;
    this.pduSource = null;
    this.portPicker.style.display = 'none';

    document.querySelectorAll('.sec-tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dev-tray-btn').forEach(b => b.classList.remove('active'));

    if (btnId) {
      document.getElementById(btnId)?.classList.add('active');
    }

    this.viewport.className = 'pt-canvas-container';
    if (toolName === 'delete') this.viewport.classList.add('tool-delete');
    if (toolName === 'pdu_simple' || toolName === 'pdu_complex') this.viewport.classList.add('tool-pdu');
    if (toolName.startsWith('cable_')) this.viewport.classList.add('tool-cable');
    if (toolName.startsWith('draw_') || toolName === 'note') this.viewport.classList.add('tool-draw');
  }

  renderCategoryTiers() {
    this.catSubRow.innerHTML = '';
    this.devicesScrollStrip.innerHTML = '';

    const catData = COMPONENT_PALETTES[this.activeCategory] || COMPONENT_PALETTES['network-devices'];
    const subs = catData.subs || [];

    if (!subs.some(s => s.id === this.activeSub)) {
      this.activeSub = subs[0]?.id || '';
    }

    const currentSubObj = subs.find(s => s.id === this.activeSub);
    this.currentCatNameLabel.innerText = currentSubObj ? currentSubObj.name : catData.name;

    subs.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = 'cat-sub-square' + (sub.id === this.activeSub ? ' active' : '');
      btn.title = sub.name;
      btn.innerHTML = `<img src="${sub.icon}" alt="${sub.name}">`;
      btn.addEventListener('click', () => {
        this.activeSub = sub.id;
        document.querySelectorAll('.cat-sub-square').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCatNameLabel.innerText = sub.name;
        this.renderDevicesStrip(catData.items[sub.id] || []);
      });
      this.catSubRow.appendChild(btn);
    });

    this.renderDevicesStrip(catData.items[this.activeSub] || []);
  }

  renderDevicesStrip(items) {
    this.devicesScrollStrip.innerHTML = '';
    items.forEach(item => {
      const btn = document.createElement('div');
      btn.className = 'dev-tray-btn';
      btn.innerHTML = `<img src="${item.icon}" alt="${item.name}"><span>${item.name}</span>`;

      // Enable HTML5 Drag & Drop directly from tray to canvas (Zero extra clicks!)
      if (!item.type.startsWith('cable_')) {
        btn.setAttribute('draggable', 'true');
        btn.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('application/json', JSON.stringify({
            type: item.type,
            model: item.model,
            fullName: item.fullName || item.name
          }));
          e.dataTransfer.effectAllowed = 'copy';
        });
      }

      // Hover displays full model name
      btn.addEventListener('mouseenter', () => {
        this.deviceHoverLabel.innerText = item.fullName || item.name;
      });
      btn.addEventListener('mouseleave', () => {
        this.deviceHoverLabel.innerText = '';
      });

      // Click-to-place fallback
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dev-tray-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (item.type.startsWith('cable_')) {
          this.setTool(item.type);
        } else {
          this.pendingPlacement = item;
        }
      });

      this.devicesScrollStrip.appendChild(btn);
    });
  }

  renderCablesOnly() {
    let svgHtml = '';
    for (const cable of this.topology.cables) {
      const devA = cable.ifaceA.device;
      const devB = cable.ifaceB.device;
      const cableClass = cable.type === 'crossover' ? 'crossover' : (cable.type === 'serial' ? 'serial' : 'straight');

      svgHtml += `<line class="pt-cable-svg ${cableClass}" x1="${devA.x}" y1="${devA.y}" x2="${devB.x}" y2="${devB.y}" data-cable-id="${cable.id}"/>`;

      const dx = devB.x - devA.x;
      const dy = devB.y - devA.y;
      const dist = Math.hypot(dx, dy) || 1;
      const offset = 32;

      const ax = devA.x + (dx / dist) * offset;
      const ay = devA.y + (dy / dist) * offset;
      const bx = devB.x - (dx / dist) * offset;
      const by = devB.y - (dy / dist) * offset;

      const stateA = cable.ifaceA.isPhysicalUp ? 'up' : 'down';
      const stateB = cable.ifaceB.isPhysicalUp ? 'up' : 'down';

      const angle = Math.atan2(dy, dx);
      svgHtml += this.createTriangleLED(ax, ay, angle, stateA);
      svgHtml += this.createTriangleLED(bx, by, angle + Math.PI, stateB);
    }
    this.svgCablesLayer.innerHTML = svgHtml;
  }

  renderCanvas() {
    this.renderCablesOnly();

    // 1. Cable deletion listeners
    this.svgCablesLayer.querySelectorAll('.pt-cable-svg').forEach(line => {
      line.addEventListener('click', () => {
        if (this.currentTool === 'delete') {
          this.topology.removeCable(line.getAttribute('data-cable-id'));
        }
      });
    });

    // 2. Animated In-flight Packets
    let packetsHtml = '';
    for (const sim of this.topology.activeSimEvents) {
      const from = sim.fromDev;
      const to = sim.toDev;
      const px = from.x + (to.x - from.x) * sim.progress;
      const py = from.y + (to.y - from.y) * sim.progress;

      packetsHtml += `
        <g transform="translate(${px - 10}, ${py - 10})" filter="url(#packet-glow)">
          <rect width="20" height="13" rx="2" fill="${sim.color}" stroke="#ffffff" stroke-width="1.5"/>
          <path d="M0 0l10 7 10-7" fill="none" stroke="#ffffff" stroke-width="1.5"/>
        </g>
      `;
    }
    this.svgPacketsLayer.innerHTML = packetsHtml;

    // 3. Render Devices DOM Nodes
    const existing = new Set();
    this.viewport.querySelectorAll('.pt-device-node').forEach(el => {
      const id = el.dataset.id;
      if (this.topology.devices.has(id)) {
        existing.add(id);
        const dev = this.topology.devices.get(id);
        el.style.left = `${dev.x}px`;
        el.style.top = `${dev.y}px`;
        el.querySelector('.device-name-badge').innerText = dev.name;
        const ipBadge = el.querySelector('.device-ip-badge');
        if (ipBadge) {
          ipBadge.innerText = dev.ip || (dev.type === 'router' ? 'Multi-IF' : '');
        }
      } else {
        el.remove();
      }
    });

    for (const dev of this.topology.devices.values()) {
      if (!existing.has(dev.id)) {
        const node = this.createDeviceNode(dev);
        this.viewport.appendChild(node);
      }
    }

    this.renderShapes();
    this.renderNotes();
  }

  createTriangleLED(cx, cy, rad, state) {
    const size = 6.5;
    const p1x = cx + Math.cos(rad) * size;
    const p1y = cy + Math.sin(rad) * size;
    const p2x = cx + Math.cos(rad + (2 * Math.PI) / 3) * size;
    const p2y = cy + Math.sin(rad + (2 * Math.PI) / 3) * size;
    const p3x = cx + Math.cos(rad - (2 * Math.PI) / 3) * size;
    const p3y = cy + Math.sin(rad - (2 * Math.PI) / 3) * size;

    return `
      <g class="cable-led-marker ${state}">
        <polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}" />
      </g>
    `;
  }

  createDeviceNode(dev) {
    const el = document.createElement('div');
    el.className = 'pt-device-node';
    el.dataset.id = dev.id;
    el.style.left = `${dev.x}px`;
    el.style.top = `${dev.y}px`;

    const iconSrc = DEVICE_LOGICAL_ASSETS[dev.type] || DEVICE_LOGICAL_ASSETS['pc'];
    const ipText = dev.ip || (dev.type === 'router' ? 'Multi-IF' : '');

    el.innerHTML = `
      <div class="device-icon-wrapper">
        <img src="${iconSrc}" alt="${dev.name}">
      </div>
      <div class="device-name-badge">${dev.name}</div>
      <div class="device-ip-badge">${ipText}</div>
    `;

    // Seamless Dragging: Completely separates Drag from Click
    let isDragging = false;
    let hasDragged = false;
    let startX = 0, startY = 0, origX = 0, origY = 0;

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (this.currentTool !== 'select') return;

      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      origX = dev.x;
      origY = dev.y;

      const onMove = (me) => {
        if (!isDragging) return;
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;

        if (Math.hypot(dx, dy) > 3) {
          hasDragged = true;
        }

        if (hasDragged) {
          dev.x = Math.max(30, origX + dx);
          dev.y = Math.max(30, origY + dy);
          el.style.left = `${dev.x}px`;
          el.style.top = `${dev.y}px`;
          this.renderCablesOnly();
        }
      };

      const onUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        if (hasDragged) {
          this.renderCanvas();
          // Keep hasDragged true briefly to absorb the subsequent synthetic click
          setTimeout(() => {
            hasDragged = false;
          }, 80);
        }
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    // Click handler: Only triggers if user DID NOT drag!
    el.addEventListener('click', (e) => {
      e.stopPropagation();

      // If user was dragging the node, NEVER trigger click or open modal!
      if (hasDragged) {
        return;
      }

      if (this.currentTool === 'delete') {
        this.topology.removeDevice(dev.id);
        return;
      }

      if (this.currentTool.startsWith('cable_')) {
        this.handleCableClick(dev, e);
        return;
      }

      if (this.currentTool === 'pdu_simple' || this.currentTool === 'pdu_complex') {
        this.handlePDUClick(dev);
        return;
      }

      // Single click selects device or inspects
      if (this.currentTool === 'inspect') {
        this.openDeviceModal(dev);
      }
    });

    // Double-click opens the configuration window (Authentic Cisco Packet Tracer behavior)
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.openDeviceModal(dev);
    });

    return el;
  }

  handleCableClick(dev, mouseEvent) {
    const cableType = this.currentTool === 'cable_crossover' ? 'crossover' : (this.currentTool === 'cable_serial_dce' || this.currentTool === 'cable_serial_dte' ? 'serial' : 'straight');

    if (!this.connectingDevA) {
      this.showPortPicker(dev, mouseEvent.clientX, mouseEvent.clientY, (iface) => {
        this.connectingDevA = dev;
        this.connectingIfaceA = iface;
      });
    } else {
      const devA = this.connectingDevA;
      const ifaceA = this.connectingIfaceA;
      if (dev.id === devA.id) {
        this.portPicker.style.display = 'none';
        return;
      }

      this.showPortPicker(dev, mouseEvent.clientX, mouseEvent.clientY, (ifaceB) => {
        this.topology.connect(devA.id, ifaceA.name, dev.id, ifaceB.name, cableType);
        this.connectingDevA = null;
        this.connectingIfaceA = null;
      });
    }
  }

  showPortPicker(dev, clientX, clientY, onSelect) {
    this.portPickerList.innerHTML = '';
    const rect = this.viewport.getBoundingClientRect();

    dev.interfaces.forEach(iface => {
      const opt = document.createElement('div');
      const inUse = iface.connectedCable !== null;
      opt.className = 'port-item' + (inUse ? ' disabled' : '');
      opt.innerHTML = `<span>${iface.name}</span> <span style="font-size: 9px; opacity: 0.7;">${inUse ? '(En uso)' : 'Libre'}</span>`;

      if (!inUse) {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          this.portPicker.style.display = 'none';
          onSelect(iface);
        });
      }
      this.portPickerList.appendChild(opt);
    });

    this.portPicker.style.left = `${clientX - rect.left + 8}px`;
    this.portPicker.style.top = `${clientY - rect.top + 8}px`;
    this.portPicker.style.display = 'block';
  }

  handlePDUClick(dev) {
    if (!this.pduSource) {
      this.pduSource = dev;
    } else {
      const src = this.pduSource;
      const dst = dev;
      this.pduSource = null;
      this.setTool('select', 'tool-select');

      if (src.id === dst.id) return;
      this.topology.sendSimplePDU(src.id, dst.id);
    }
  }

  renderPDUTable() {
    this.pduFullTableBody.innerHTML = '';
    this.topology.pduList.forEach((pdu, idx) => {
      const tr = document.createElement('tr');
      const badgeClass = pdu.status === 'Successful' ? 'status-badge-ok' : (pdu.status === 'Failed' ? 'status-badge-fail' : 'status-badge-prog');

      tr.innerHTML = `
        <td style="text-align: center; cursor: pointer;" title="Fire PDU" class="btn-fire-pdu">🔥</td>
        <td class="${badgeClass}">${pdu.status}</td>
        <td>${pdu.source}</td>
        <td>${pdu.dest}</td>
        <td>${pdu.type}</td>
        <td><div style="width: 12px; height: 12px; background: ${pdu.color}; border: 1px solid #444;"></div></td>
        <td>${pdu.time}</td>
        <td>N</td>
        <td>${idx}</td>
        <td style="cursor: pointer; color: #0078d7;">(edit)</td>
        <td style="cursor: pointer; color: #dc2626;" class="btn-del-pdu">delete</td>
      `;

      tr.querySelector('.btn-fire-pdu').addEventListener('click', () => {
        const srcDev = Array.from(this.topology.devices.values()).find(d => d.name === pdu.source);
        const dstDev = Array.from(this.topology.devices.values()).find(d => d.name === pdu.dest);
        if (srcDev && dstDev) {
          this.topology.sendSimplePDU(srcDev.id, dstDev.id);
        }
      });

      tr.querySelector('.btn-del-pdu').addEventListener('click', () => {
        const pIdx = this.topology.pduList.indexOf(pdu);
        if (pIdx !== -1) {
          this.topology.pduList.splice(pIdx, 1);
          this.renderPDUTable();
        }
      });

      this.pduFullTableBody.appendChild(tr);
    });
  }

  renderShapes() {
    let html = '';
    const HANDLE_SIZE = 7;

    this.shapes.forEach((s, idx) => {
      const isSelected = (this.selectedShape && this.selectedShape.id === s.id);
      const selClass = isSelected ? 'selected' : '';

      html += `<g class="shape-group" data-shape-idx="${idx}">`;

      if (s.type === 'rect') {
        html += `<rect class="canvas-drawn-shape ${selClass}" data-shape-idx="${idx}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="4" fill="rgba(186, 230, 253, 0.35)" stroke="#0284c7" stroke-width="2"/>`;

        if (isSelected) {
          // Corner & edge resize handles
          html += `
            <rect class="shape-resize-handle" data-handle="nw" data-shape-idx="${idx}" x="${s.x - HANDLE_SIZE/2}" y="${s.y - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: nwse-resize;"/>
            <rect class="shape-resize-handle" data-handle="ne" data-shape-idx="${idx}" x="${s.x + s.w - HANDLE_SIZE/2}" y="${s.y - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: nesw-resize;"/>
            <rect class="shape-resize-handle" data-handle="se" data-shape-idx="${idx}" x="${s.x + s.w - HANDLE_SIZE/2}" y="${s.y + s.h - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: nwse-resize;"/>
            <rect class="shape-resize-handle" data-handle="sw" data-shape-idx="${idx}" x="${s.x - HANDLE_SIZE/2}" y="${s.y + s.h - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: nesw-resize;"/>
            <rect class="shape-resize-handle" data-handle="e" data-shape-idx="${idx}" x="${s.x + s.w - HANDLE_SIZE/2}" y="${s.y + s.h/2 - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: ew-resize;"/>
            <rect class="shape-resize-handle" data-handle="s" data-shape-idx="${idx}" x="${s.x + s.w/2 - HANDLE_SIZE/2}" y="${s.y + s.h - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: ns-resize;"/>
          `;
        }
      } else if (s.type === 'ellipse') {
        html += `<ellipse class="canvas-drawn-shape ${selClass}" data-shape-idx="${idx}" cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="rgba(254, 240, 138, 0.35)" stroke="#ca8a04" stroke-width="2"/>`;

        if (isSelected) {
          html += `
            <rect class="shape-resize-handle" data-handle="el-e" data-shape-idx="${idx}" x="${s.cx + s.rx - HANDLE_SIZE/2}" y="${s.cy - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: ew-resize;"/>
            <rect class="shape-resize-handle" data-handle="el-s" data-shape-idx="${idx}" x="${s.cx - HANDLE_SIZE/2}" y="${s.cy + s.ry - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: ns-resize;"/>
            <rect class="shape-resize-handle" data-handle="el-se" data-shape-idx="${idx}" x="${s.cx + s.rx*0.707 - HANDLE_SIZE/2}" y="${s.cy + s.ry*0.707 - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: nwse-resize;"/>
          `;
        }
      } else if (s.type === 'line') {
        html += `<line class="canvas-drawn-shape ${selClass}" data-shape-idx="${idx}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#475569" stroke-width="2.5" stroke-dasharray="4,4"/>`;

        if (isSelected) {
          html += `
            <rect class="shape-resize-handle" data-handle="line-p1" data-shape-idx="${idx}" x="${s.x1 - HANDLE_SIZE/2}" y="${s.y1 - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: crosshair;"/>
            <rect class="shape-resize-handle" data-handle="line-p2" data-shape-idx="${idx}" x="${s.x2 - HANDLE_SIZE/2}" y="${s.y2 - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: crosshair;"/>
          `;
        }
      } else if (s.type === 'polygon') {
        const sz = s.size || 40;
        const pts = `${s.cx},${s.cy-sz} ${s.cx+sz*1.2},${s.cy} ${s.cx+sz*0.7},${s.cy+sz} ${s.cx-sz*0.7},${s.cy+sz} ${s.cx-sz*1.2},${s.cy}`;
        html += `<polygon class="canvas-drawn-shape ${selClass}" data-shape-idx="${idx}" points="${pts}" fill="rgba(220, 252, 231, 0.4)" stroke="#16a34a" stroke-width="2"/>`;

        if (isSelected) {
          html += `
            <rect class="shape-resize-handle" data-handle="poly-sz" data-shape-idx="${idx}" x="${s.cx + sz*1.2 - HANDLE_SIZE/2}" y="${s.cy - HANDLE_SIZE/2}" width="${HANDLE_SIZE}" height="${HANDLE_SIZE}" style="cursor: ew-resize;"/>
          `;
        }
      }

      html += `</g>`;
    });

    this.svgShapesLayer.innerHTML = html;

    // Attach Moving to Shape Bodies
    this.svgShapesLayer.querySelectorAll('.canvas-drawn-shape').forEach(el => {
      const idx = parseInt(el.getAttribute('data-shape-idx'), 10);
      const shape = this.shapes[idx];
      if (!shape) return;

      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;

        if (this.currentTool === 'delete') {
          this.shapes.splice(idx, 1);
          this.selectedShape = null;
          this.renderShapes();
          return;
        }

        e.stopPropagation();
        this.selectedShape = shape;
        this.renderShapes();

        // Move shape
        const startX = e.clientX;
        const startY = e.clientY;
        const orig = { ...shape };

        const onMoveShape = (me) => {
          const dx = me.clientX - startX;
          const dy = me.clientY - startY;

          if (shape.type === 'rect') {
            shape.x = Math.max(0, orig.x + dx);
            shape.y = Math.max(0, orig.y + dy);
          } else if (shape.type === 'ellipse') {
            shape.cx = Math.max(20, orig.cx + dx);
            shape.cy = Math.max(20, orig.cy + dy);
          } else if (shape.type === 'line') {
            shape.x1 = orig.x1 + dx;
            shape.y1 = orig.y1 + dy;
            shape.x2 = orig.x2 + dx;
            shape.y2 = orig.y2 + dy;
          } else if (shape.type === 'polygon') {
            shape.cx = Math.max(20, orig.cx + dx);
            shape.cy = Math.max(20, orig.cy + dy);
          }
          this.renderShapes();
        };

        const onUpShape = () => {
          window.removeEventListener('mousemove', onMoveShape);
          window.removeEventListener('mouseup', onUpShape);
        };

        window.addEventListener('mousemove', onMoveShape);
        window.addEventListener('mouseup', onUpShape);
      });
    });

    // Attach Resizing to Resize Handles
    this.svgShapesLayer.querySelectorAll('.shape-resize-handle').forEach(handleEl => {
      const idx = parseInt(handleEl.getAttribute('data-shape-idx'), 10);
      const handleType = handleEl.getAttribute('data-handle');
      const shape = this.shapes[idx];
      if (!shape) return;

      handleEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const orig = { ...shape };

        const onResize = (me) => {
          const dx = me.clientX - startX;
          const dy = me.clientY - startY;

          if (shape.type === 'rect') {
            if (handleType === 'se') {
              shape.w = Math.max(20, orig.w + dx);
              shape.h = Math.max(20, orig.h + dy);
            } else if (handleType === 'e') {
              shape.w = Math.max(20, orig.w + dx);
            } else if (handleType === 's') {
              shape.h = Math.max(20, orig.h + dy);
            } else if (handleType === 'ne') {
              shape.w = Math.max(20, orig.w + dx);
              shape.y = orig.y + Math.min(dy, orig.h - 20);
              shape.h = Math.max(20, orig.h - dy);
            } else if (handleType === 'sw') {
              shape.x = orig.x + Math.min(dx, orig.w - 20);
              shape.w = Math.max(20, orig.w - dx);
              shape.h = Math.max(20, orig.h + dy);
            } else if (handleType === 'nw') {
              shape.x = orig.x + Math.min(dx, orig.w - 20);
              shape.y = orig.y + Math.min(dy, orig.h - 20);
              shape.w = Math.max(20, orig.w - dx);
              shape.h = Math.max(20, orig.h - dy);
            }
          } else if (shape.type === 'ellipse') {
            if (handleType === 'el-e') {
              shape.rx = Math.max(15, orig.rx + dx);
            } else if (handleType === 'el-s') {
              shape.ry = Math.max(15, orig.ry + dy);
            } else if (handleType === 'el-se') {
              shape.rx = Math.max(15, orig.rx + dx);
              shape.ry = Math.max(15, orig.ry + dy);
            }
          } else if (shape.type === 'line') {
            if (handleType === 'line-p1') {
              shape.x1 = orig.x1 + dx;
              shape.y1 = orig.y1 + dy;
            } else if (handleType === 'line-p2') {
              shape.x2 = orig.x2 + dx;
              shape.y2 = orig.y2 + dy;
            }
          } else if (shape.type === 'polygon') {
            if (handleType === 'poly-sz') {
              shape.size = Math.max(15, (orig.size || 40) + dx);
            }
          }
          this.renderShapes();
        };

        const onResizeUp = () => {
          window.removeEventListener('mousemove', onResize);
          window.removeEventListener('mouseup', onResizeUp);
        };

        window.addEventListener('mousemove', onResize);
        window.addEventListener('mouseup', onResizeUp);
      });
    });
  }

  renderNotes() {
    this.viewport.querySelectorAll('.canvas-note-box').forEach(n => n.remove());

    this.notes.forEach(note => {
      const el = document.createElement('div');
      el.className = 'canvas-note-box';
      el.dataset.noteId = note.id;
      el.style.left = `${note.x}px`;
      el.style.top = `${note.y}px`;

      el.innerHTML = `
        <div class="note-header-bar">
          <div class="note-pin-icon"></div>
          <button class="note-del-btn" title="Eliminar nota">&times;</button>
        </div>
        <textarea class="note-textarea" placeholder="Escriba su nota aquí...">${note.text || ''}</textarea>
      `;

      const headerBar = el.querySelector('.note-header-bar');
      const delBtn = el.querySelector('.note-del-btn');
      const textarea = el.querySelector('.note-textarea');

      // Update text in memory as user types
      textarea.addEventListener('input', () => {
        note.text = textarea.value;
      });

      // Delete button
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = this.notes.indexOf(note);
        if (idx !== -1) {
          this.notes.splice(idx, 1);
          el.remove();
        }
      });

      // Drag Note from anywhere on header or note box (without blurring textarea on simple click)
      let isDragging = false;
      let startX = 0, startY = 0, origX = 0, origY = 0;

      headerBar.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        origX = note.x;
        origY = note.y;

        const onMoveNote = (me) => {
          if (!isDragging) return;
          const dx = me.clientX - startX;
          const dy = me.clientY - startY;
          note.x = Math.max(10, origX + dx);
          note.y = Math.max(10, origY + dy);
          el.style.left = `${note.x}px`;
          el.style.top = `${note.y}px`;
        };

        const onUpNote = () => {
          isDragging = false;
          window.removeEventListener('mousemove', onMoveNote);
          window.removeEventListener('mouseup', onUpNote);
        };

        window.addEventListener('mousemove', onMoveNote);
        window.addEventListener('mouseup', onUpNote);
      });

      // In Delete tool mode, clicking the note deletes it
      el.addEventListener('click', (e) => {
        if (this.currentTool === 'delete') {
          e.stopPropagation();
          const idx = this.notes.indexOf(note);
          if (idx !== -1) {
            this.notes.splice(idx, 1);
            el.remove();
          }
        }
      });

      this.viewport.appendChild(el);
    });
  }

  openDeviceModal(dev) {
    this.modalTitle.innerText = `${dev.name} (${dev.model || dev.type.toUpperCase()})`;
    this.modalIcon.src = DEVICE_LOGICAL_ASSETS[dev.type] || DEVICE_LOGICAL_ASSETS['pc'];
    this.modalTabs.innerHTML = '';
    this.modalContent.innerHTML = '';

    dev._activeCfgView = dev._activeCfgView || 'settings';
    dev._activeCfgIface = dev._activeCfgIface || (dev.interfaces[0] ? dev.interfaces[0].name : null);
    if (!dev._iosCommandsLog) {
      dev._iosCommandsLog = 'Press RETURN to get started!\n\n';
    }

    let tabs;
    let defaultTab = 'Config';

    if (dev.type === 'wireless_router') {
      // Screenshot 1: Physical | Config | GUI | Attributes
      tabs = ['Physical', 'Config', 'GUI', 'Attributes'];
      defaultTab = 'Config';
    } else if (dev.type === 'cloud') {
      // Screenshot 2: Physical | Config | Attributes
      tabs = ['Physical', 'Config', 'Attributes'];
      defaultTab = 'Physical';
    } else if (dev.type === 'pc' || dev.type === 'laptop' || dev.type === 'server' || dev.type === 'printer') {
      // Screenshot 3: Physical | Config | Desktop | Programming | Attributes
      tabs = ['Physical', 'Config', 'Desktop', 'Programming', 'Attributes'];
      defaultTab = 'Config';
    } else {
      // Cisco Router or Switch: Physical | Config | CLI | Attributes
      tabs = ['Physical', 'Config', 'CLI', 'Attributes'];
      defaultTab = 'Config';
    }

    tabs.forEach((tabName) => {
      const btn = document.createElement('button');
      btn.className = 'm-tab-btn' + (tabName === defaultTab ? ' active' : '');
      btn.innerText = tabName;
      btn.addEventListener('click', () => {
        this.modalTabs.querySelectorAll('.m-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (tabName === 'CLI') this.renderCLITab(dev);
        else if (tabName === 'Desktop') this.renderDesktopTab(dev);
        else if (tabName === 'Config') this.renderConfigTab(dev);
        else if (tabName === 'Physical') this.renderPhysicalTab(dev);
        else if (tabName === 'GUI') this.renderGUITab(dev);
        else if (tabName === 'Programming') this.renderProgrammingTab(dev);
        else this.renderAttributesTab(dev);
      });
      this.modalTabs.appendChild(btn);
    });

    if (defaultTab === 'Config') {
      this.renderConfigTab(dev);
    } else if (defaultTab === 'Physical') {
      this.renderPhysicalTab(dev);
    } else if (defaultTab === 'Desktop') {
      this.renderDesktopTab(dev);
    }

    this.modal.style.display = 'flex';
  }

  renderCLITab(dev) {
    if (!this.clis.has(dev.id)) {
      this.clis.set(dev.id, new CiscoIOSCLI(dev, this.topology));
    }
    const cli = this.clis.get(dev.id);

    this.modalContent.innerHTML = `
      <div class="cli-viewport" id="cli-viewport-container" style="flex:1; display:flex; flex-direction:column; background:#000000; padding:10px; border-radius:3px; overflow:hidden;">
        <div class="cli-scroll" id="cli-scroll" style="flex:1; overflow-y:auto; color:#22c55e; font-family:'Consolas','Courier New',monospace; font-size:12px; white-space:pre-wrap; line-height:1.4;">${cli.getBanner()}</div>
        <div class="cli-input-box" style="display:flex; align-items:center; gap:4px; margin-top:6px; background:#000000;">
          <span class="cli-prompt-text" id="cli-prompt" style="color:#22c55e; font-family:'Consolas','Courier New',monospace; font-size:12px; font-weight:700;">${cli.getPrompt()}</span>
          <input type="text" class="cli-cmd-input" id="cli-cmd-input" autofocus autocomplete="off" spellcheck="false" style="flex:1; background:transparent; border:none; outline:none; color:#ffffff; font-family:'Consolas','Courier New',monospace; font-size:12px;">
        </div>
      </div>
    `;

    const container = document.getElementById('cli-viewport-container');
    const scroll = document.getElementById('cli-scroll');
    const prompt = document.getElementById('cli-prompt');
    const input = document.getElementById('cli-cmd-input');

    container.addEventListener('click', () => {
      input.focus();
    });

    input.focus();

    input.addEventListener('keydown', (e) => {
      // 1. Exact Tab Completion
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const res = cli.handleTabCompletion(input.value);
        if (res.completedText !== input.value) {
          input.value = res.completedText;
        } else if (res.candidates && res.candidates.length > 0) {
          scroll.innerText += `\n${prompt.innerText} ${input.value}\n${res.candidates.join('  ')}\n`;
          prompt.innerText = cli.getPrompt();
          scroll.scrollTop = scroll.scrollHeight;
        }
        return;
      }

      // 2. Exact Contextual Help '?'
      if (e.key === '?') {
        e.preventDefault();
        e.stopPropagation();
        const res = cli.handleContextualHelp(input.value);
        scroll.innerText += `\n${prompt.innerText} ${input.value}?\n${res.helpText}\n`;
        prompt.innerText = cli.getPrompt();
        scroll.scrollTop = scroll.scrollHeight;
        return;
      }

      // 3. Command History Navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (cli.history.length > 0) {
          if (cli.historyIndex > 0) {
            cli.historyIndex--;
          }
          input.value = cli.history[cli.historyIndex] || '';
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (cli.history.length > 0) {
          if (cli.historyIndex < cli.history.length - 1) {
            cli.historyIndex++;
            input.value = cli.history[cli.historyIndex] || '';
          } else {
            cli.historyIndex = cli.history.length;
            input.value = '';
          }
        }
        return;
      }

      // 4. Ctrl+C Cancel
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        scroll.innerText += `\n${prompt.innerText} ${input.value}^C\n`;
        input.value = '';
        scroll.scrollTop = scroll.scrollHeight;
        return;
      }

      // 5. Ctrl+Z Exit to Privileged EXEC
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        scroll.innerText += `\n${prompt.innerText} ${input.value}^Z\n`;
        cli.mode = 'PRIVILEGED';
        prompt.innerText = cli.getPrompt();
        input.value = '';
        scroll.scrollTop = scroll.scrollHeight;
        return;
      }

      // 6. Enter Execution
      if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        scroll.innerText += `\n${prompt.innerText} ${val}\n`;
        const res = cli.execute(val);
        if (res) scroll.innerText += `${res}\n`;
        prompt.innerText = cli.getPrompt();
        scroll.scrollTop = scroll.scrollHeight;
      }
    });
  }

  renderConfigTab(dev) {
    const isRouter = (dev.type === 'router');
    const isSwitch = (dev.type === 'switch');
    const isWireless = (dev.type === 'wireless_router');
    const isPC = (dev.type === 'pc' || dev.type === 'laptop' || dev.type === 'server' || dev.type === 'printer');
    const isCloud = (dev.type === 'cloud');

    const activeView = dev._activeCfgView || 'settings';
    const activeIfaceName = dev._activeCfgIface || (dev.interfaces[0] ? dev.interfaces[0].name : '');

    // Build sidebar tree items
    let sidebarTreeHtml = `
      <div class="cfg-tree-header">GLOBAL</div>
      <div class="cfg-tree-item ${activeView === 'settings' ? 'active' : ''}" data-view="settings">Settings</div>
      <div class="cfg-tree-item ${activeView === 'algo' ? 'active' : ''}" data-view="algo">Algorithm Settings</div>
    `;

    if (isRouter) {
      sidebarTreeHtml += `
        <div class="cfg-tree-header">ROUTING</div>
        <div class="cfg-tree-item ${activeView === 'static' ? 'active' : ''}" data-view="static">Static</div>
        <div class="cfg-tree-item ${activeView === 'rip' ? 'active' : ''}" data-view="rip">RIP</div>
      `;
    }

    if (isSwitch || isRouter) {
      sidebarTreeHtml += `
        <div class="cfg-tree-header">SWITCHING</div>
        <div class="cfg-tree-item ${activeView === 'vlan' ? 'active' : ''}" data-view="vlan">VLAN Database</div>
      `;
    }

    sidebarTreeHtml += `<div class="cfg-tree-header">INTERFACE</div>`;
    dev.interfaces.forEach(i => {
      const isSel = (activeView === 'interface' && activeIfaceName === i.name);
      sidebarTreeHtml += `<div class="cfg-tree-item ${isSel ? 'active' : ''}" data-view="interface" data-iface="${i.name}">${i.name}</div>`;
    });

    // Build right panel view
    let mainPanelHtml = '';

    if (isWireless) {
      // Screenshot 1: Wireless Router Config Tab
      if (activeView === 'settings') {
        mainPanelHtml = `
          <div class="cfg-panel-title">Global Settings</div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Display Name</span>
            <input type="text" id="cfg-in-display-name" class="cfg-input-text" value="${dev.name}">
          </div>
        `;
      } else if (activeView === 'algo') {
        mainPanelHtml = `
          <div class="cfg-panel-title">Global Algorithm Settings</div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Half Duplex</span>
            <label style="font-size: 11px;"><input type="checkbox" checked> Collision Simulation Enabled</label>
          </div>
        `;
      } else if (activeView === 'interface') {
        const iface = dev.getInterface(activeIfaceName) || dev.interfaces[0];
        if (iface.name === 'Internet') {
          mainPanelHtml = `
            <div class="cfg-panel-title">Internet</div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Connection Type</span>
              <select class="cfg-input-text" id="cfg-wl-inet-type">
                <option value="DHCP" ${dev.internetType === 'DHCP' ? 'selected' : ''}>DHCP</option>
                <option value="Static" ${dev.internetType === 'Static' ? 'selected' : ''}>Static</option>
              </select>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">IP Address</span>
              <input type="text" class="cfg-input-text" id="cfg-wl-inet-ip" value="${iface.ip || '10.0.0.1'}">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Subnet Mask</span>
              <input type="text" class="cfg-input-text" id="cfg-wl-inet-mask" value="${iface.mask || '255.0.0.0'}">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Default Gateway</span>
              <input type="text" class="cfg-input-text" id="cfg-wl-inet-gw" value="${dev.gateway || '10.0.0.254'}">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">DNS Server</span>
              <input type="text" class="cfg-input-text" id="cfg-wl-inet-dns" value="${dev.dns || '0.0.0.0'}">
            </div>
          `;
        } else if (iface.name === 'LAN') {
          mainPanelHtml = `
            <div class="cfg-panel-title">LAN</div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">IP Address</span>
              <input type="text" class="cfg-input-text" id="cfg-wl-lan-ip" value="${dev.routerIP || '192.168.0.1'}">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Subnet Mask</span>
              <input type="text" class="cfg-input-text" id="cfg-wl-lan-mask" value="${dev.subnetMask || '255.255.255.0'}">
            </div>
          `;
        } else {
          mainPanelHtml = `
            <div class="cfg-panel-title">${iface.name}</div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Port Status</span>
              <label style="font-size: 11px; display:flex; align-items:center; gap:5px;"><input type="checkbox" checked> On</label>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">SSID</span>
              <input type="text" class="cfg-input-text" id="cfg-wl-ssid" value="${dev.ssid || 'Default'}">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Channel</span>
              <select class="cfg-input-text">
                <option>1 - 2.412GHz</option>
                <option selected>6 - 2.437GHz</option>
                <option>11 - 2.462GHz</option>
              </select>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Authentication</span>
              <select class="cfg-input-text">
                <option>Disabled</option>
                <option selected>WPA2-PSK</option>
              </select>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Passphrase</span>
              <input type="password" class="cfg-input-text" value="${dev.passphrase || 'cisco123'}">
            </div>
          `;
        }
      }
    } else if (isPC) {
      // Screenshot 3: PC / End Device Config Tab
      if (activeView === 'settings') {
        const isDhcp = (dev.ipType === 'dhcp');
        const isAuto6 = (dev.ipv6Type === 'auto');

        mainPanelHtml = `
          <div class="cfg-panel-title">Global Settings</div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Display Name</span>
            <input type="text" id="cfg-in-display-name" class="cfg-input-text" value="${dev.name}">
          </div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Interfaces</span>
            <select class="cfg-input-text" id="cfg-pc-iface-select">
              ${dev.interfaces.map(i => `<option value="${i.name}" ${activeIfaceName === i.name ? 'selected' : ''}>${i.name}</option>`).join('')}
            </select>
          </div>
          <div class="cfg-box-group">
            <div class="cfg-box-title">Gateway/DNS IPv4</div>
            <div class="cfg-radio-group">
              <label class="cfg-radio-label"><input type="radio" name="pc-ip4-mode" id="pc-ip4-dhcp" ${isDhcp ? 'checked' : ''}> DHCP</label>
              <label class="cfg-radio-label"><input type="radio" name="pc-ip4-mode" id="pc-ip4-static" ${!isDhcp ? 'checked' : ''}> Static</label>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Default Gateway</span>
              <input type="text" id="cfg-pc-gw" class="cfg-input-text" value="${dev.gateway || ''}" placeholder="192.168.1.1">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">DNS Server</span>
              <input type="text" id="cfg-pc-dns" class="cfg-input-text" value="${dev.dns || '0.0.0.0'}">
            </div>
          </div>
          <div class="cfg-box-group">
            <div class="cfg-box-title">Gateway/DNS IPv6</div>
            <div class="cfg-radio-group">
              <label class="cfg-radio-label"><input type="radio" name="pc-ip6-mode" id="pc-ip6-auto" ${isAuto6 ? 'checked' : ''}> Automatic</label>
              <label class="cfg-radio-label"><input type="radio" name="pc-ip6-mode" id="pc-ip6-static" ${!isAuto6 ? 'checked' : ''}> Static</label>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Default Gateway</span>
              <input type="text" id="cfg-pc-gw6" class="cfg-input-text" value="${dev.ipv6Gateway || ''}">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">DNS Server</span>
              <input type="text" id="cfg-pc-dns6" class="cfg-input-text" value="${dev.ipv6Dns || ''}">
            </div>
          </div>
        `;
      } else if (activeView === 'algo') {
        mainPanelHtml = `
          <div class="cfg-panel-title">Global Algorithm Settings</div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Half Duplex</span>
            <label style="font-size: 11px;"><input type="checkbox" checked> Collision Simulation Enabled</label>
          </div>
        `;
      } else if (activeView === 'interface') {
        const iface = dev.getInterface(activeIfaceName) || dev.interfaces[0];
        if (iface.name === 'Bluetooth') {
          mainPanelHtml = `
            <div class="cfg-panel-title">Bluetooth</div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Port Status</span>
              <label style="font-size: 11px; display:flex; align-items:center; gap:5px;"><input type="checkbox" checked> On</label>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">MAC Address</span>
              <input type="text" class="cfg-input-text" readonly value="${dev.mac}" style="background:#f1f5f9;">
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Discoverable</span>
              <label style="font-size: 11px; display:flex; align-items:center; gap:5px;"><input type="checkbox" checked> On</label>
            </div>
          `;
        } else {
          const isDhcp = (dev.ipType === 'dhcp');
          mainPanelHtml = `
            <div class="cfg-panel-title">${iface.name}</div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Port Status</span>
              <label style="font-size: 11px; display:flex; align-items:center; gap:5px;"><input type="checkbox" ${iface.isUp ? 'checked' : ''} id="cfg-iface-power-chk"> On</label>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Bandwidth</span>
              <span style="font-size: 11px; color:#475569;">Auto (100 Mbps)</span>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Duplex</span>
              <span style="font-size: 11px; color:#475569;">Auto (Full Duplex)</span>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">MAC Address</span>
              <input type="text" class="cfg-input-text" readonly value="${iface.mac}" style="background:#f1f5f9;">
            </div>
            <div class="cfg-box-group">
              <div class="cfg-box-title">IP Configuration</div>
              <div class="cfg-radio-group">
                <label class="cfg-radio-label"><input type="radio" name="iface-ip-mode" ${isDhcp ? 'checked' : ''}> DHCP</label>
                <label class="cfg-radio-label"><input type="radio" name="iface-ip-mode" ${!isDhcp ? 'checked' : ''}> Static</label>
              </div>
              <div class="cfg-row-flex">
                <span class="cfg-label-fixed">IP Address</span>
                <input type="text" id="cfg-iface-ip-val" class="cfg-input-text" value="${iface.ip || ''}" placeholder="192.168.1.10">
              </div>
              <div class="cfg-row-flex">
                <span class="cfg-label-fixed">Subnet Mask</span>
                <input type="text" id="cfg-iface-mask-val" class="cfg-input-text" value="${iface.mask || '255.255.255.0'}">
              </div>
            </div>
          `;
        }
      }
    } else {
      // Standard Cisco Router / Switch / Cloud Config Tab
      if (activeView === 'settings') {
        mainPanelHtml = `
          <div class="cfg-panel-title">Global Settings</div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Display Name</span>
            <input type="text" id="cfg-in-display-name" class="cfg-input-text" value="${dev.name}">
          </div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Hostname</span>
            <input type="text" id="cfg-in-hostname" class="cfg-input-text" value="${dev.hostname || dev.name}">
          </div>
          <div class="cfg-row-flex" style="margin-top: 10px;">
            <span class="cfg-label-fixed">NVRAM</span>
            <div class="cfg-btn-grid">
              <button id="cfg-btn-nvram-erase" class="cfg-action-button">Erase</button>
              <button id="cfg-btn-nvram-save" class="cfg-action-button">Save</button>
            </div>
          </div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Startup Config</span>
            <div class="cfg-btn-grid">
              <button id="cfg-btn-startup-load" class="cfg-action-button">Load...</button>
              <button id="cfg-btn-startup-export" class="cfg-action-button">Export...</button>
            </div>
          </div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Running Config</span>
            <div class="cfg-btn-grid">
              <button id="cfg-btn-running-export" class="cfg-action-button">Export...</button>
              <button id="cfg-btn-running-merge" class="cfg-action-button">Merge...</button>
            </div>
          </div>
        `;
      } else if (activeView === 'algo') {
        mainPanelHtml = `
          <div class="cfg-panel-title">Global Algorithm Settings</div>
          <div class="cfg-row-flex">
            <span class="cfg-label-fixed">Half Duplex</span>
            <label style="font-size: 11px;"><input type="checkbox" checked> Collision Simulation Enabled</label>
          </div>
        `;
      } else if (activeView === 'static') {
        const routes = dev.routingTable || [];
        let routesRows = '';
        routes.forEach((r, idx) => {
          routesRows += `<tr data-route-idx="${idx}"><td>${r.destination}</td><td>${r.mask}</td><td>${r.nextHop}</td></tr>`;
        });
        mainPanelHtml = `
          <div class="cfg-panel-title">Static Routes</div>
          <div class="cfg-row-flex">
            <span style="font-size:11px; width:65px;">Network:</span>
            <input type="text" id="cfg-static-net" class="cfg-input-text" placeholder="192.168.2.0">
            <span style="font-size:11px; width:45px; margin-left:10px;">Mask:</span>
            <input type="text" id="cfg-static-mask" class="cfg-input-text" value="255.255.255.0">
          </div>
          <div class="cfg-row-flex">
            <span style="font-size:11px; width:65px;">Next Hop:</span>
            <input type="text" id="cfg-static-hop" class="cfg-input-text" placeholder="192.168.1.2">
            <div style="display:flex; gap:6px; margin-left:10px;">
              <button id="cfg-btn-route-add" class="cfg-action-button" style="padding:3px 14px;">Add</button>
              <button id="cfg-btn-route-del" class="cfg-action-button" style="padding:3px 14px;">Remove</button>
            </div>
          </div>
          <table class="cfg-table" id="cfg-static-table">
            <thead>
              <tr><th>Network</th><th>Mask</th><th>Next Hop</th></tr>
            </thead>
            <tbody>
              ${routesRows || '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No static routes configured</td></tr>'}
            </tbody>
          </table>
        `;
      } else if (activeView === 'rip') {
        const ripNets = dev.ripNetworks || [];
        let ripRows = '';
        ripNets.forEach((net, idx) => {
          ripRows += `<tr data-rip-idx="${idx}"><td>${net}</td></tr>`;
        });
        mainPanelHtml = `
          <div class="cfg-panel-title">RIP Routing</div>
          <div class="cfg-row-flex">
            <span style="font-size:11px; width:65px;">Network:</span>
            <input type="text" id="cfg-rip-net" class="cfg-input-text" placeholder="192.168.1.0">
            <div style="display:flex; gap:6px; margin-left:10px;">
              <button id="cfg-btn-rip-add" class="cfg-action-button" style="padding:3px 14px;">Add</button>
              <button id="cfg-btn-rip-del" class="cfg-action-button" style="padding:3px 14px;">Remove</button>
            </div>
          </div>
          <table class="cfg-table" id="cfg-rip-table">
            <thead><tr><th>Network Address</th></tr></thead>
            <tbody>${ripRows || '<tr><td style="text-align:center; color:#94a3b8;">No RIP networks configured</td></tr>'}</tbody>
          </table>
        `;
      } else if (activeView === 'vlan') {
        const vlans = dev.vlans || [{ id: 1, name: 'default', status: 'active' }];
        let vlanRows = '';
        vlans.forEach((v, idx) => {
          vlanRows += `<tr data-vlan-idx="${idx}"><td>${v.id}</td><td>${v.name}</td><td>${v.status}</td></tr>`;
        });
        mainPanelHtml = `
          <div class="cfg-panel-title">VLAN Database</div>
          <div class="cfg-row-flex">
            <span style="font-size:11px; width:75px;">VLAN Number:</span>
            <input type="number" id="cfg-vlan-id" class="cfg-input-text" placeholder="10" style="max-width:80px;">
            <span style="font-size:11px; width:75px; margin-left:10px;">VLAN Name:</span>
            <input type="text" id="cfg-vlan-name" class="cfg-input-text" placeholder="VLAN0010">
            <div style="display:flex; gap:6px; margin-left:10px;">
              <button id="cfg-btn-vlan-add" class="cfg-action-button" style="padding:3px 14px;">Add</button>
              <button id="cfg-btn-vlan-del" class="cfg-action-button" style="padding:3px 14px;">Remove</button>
            </div>
          </div>
          <table class="cfg-table" id="cfg-vlan-table">
            <thead><tr><th>VLAN ID</th><th>VLAN Name</th><th>Status</th></tr></thead>
            <tbody>${vlanRows}</tbody>
          </table>
        `;
      } else if (activeView === 'interface') {
        const iface = dev.getInterface(activeIfaceName) || dev.interfaces[0];
        if (iface) {
          mainPanelHtml = `
            <div class="cfg-panel-title">${iface.name}</div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Port Status</span>
              <label style="font-size: 11px; display:flex; align-items:center; gap:5px;"><input type="checkbox" id="cfg-iface-power-chk" ${iface.isUp ? 'checked' : ''}> On</label>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Bandwidth</span>
              <span style="font-size: 11px; color:#475569;">Auto (1000 Mbps)</span>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">Duplex</span>
              <span style="font-size: 11px; color:#475569;">Auto (Full Duplex)</span>
            </div>
            <div class="cfg-row-flex">
              <span class="cfg-label-fixed">MAC Address</span>
              <input type="text" class="cfg-input-text" readonly value="${iface.mac}" style="background:#f1f5f9; color:#475569;">
            </div>
            <div style="margin-top: 14px; padding: 10px; border: 1px solid #d1d5db; border-radius: 3px; background: #fafafa;">
              <div style="font-weight: 600; font-size: 11px; margin-bottom: 8px; color: #1e293b;">IP Configuration</div>
              <div class="cfg-row-flex">
                <span class="cfg-label-fixed">IP Address</span>
                <input type="text" id="cfg-iface-ip-val" class="cfg-input-text" value="${iface.ip || ''}" placeholder="Sin asignar">
              </div>
              <div class="cfg-row-flex">
                <span class="cfg-label-fixed">Subnet Mask</span>
                <input type="text" id="cfg-iface-mask-val" class="cfg-input-text" value="${iface.mask || '255.255.255.0'}">
              </div>
            </div>
          `;
        }
      }
    }

    // Assemble the complete Qt Packet Tracer window layout matching user screenshots
    const showIosBox = (isRouter || isSwitch);

    this.modalContent.innerHTML = `
      <div class="config-tab-container">
        <div class="config-split-view">
          <div class="config-sidebar-tree" id="cfg-sidebar-tree">${sidebarTreeHtml}</div>
          <div class="config-main-panel" id="cfg-main-panel">${mainPanelHtml}</div>
        </div>
        ${showIosBox ? `
          <div class="config-ios-commands-section">
            <div class="config-ios-commands-title">Equivalent IOS Commands</div>
            <div class="config-ios-commands-box" id="cfg-ios-commands-box">${dev._iosCommandsLog}</div>
          </div>
        ` : `
          <div style="height: 120px; background: #ffffff; border: 1px solid #a0a0a0; margin-top: 4px;"></div>
        `}
        <div class="config-bottom-checkbox-bar">
          <label style="cursor: pointer;"><input type="checkbox"> Top</label>
        </div>
      </div>
    `;

    const iosBox = document.getElementById('cfg-ios-commands-box');
    if (iosBox) iosBox.scrollTop = iosBox.scrollHeight;

    const appendIosCmd = (cmdStr) => {
      dev._iosCommandsLog += `${cmdStr}\n`;
      if (iosBox) {
        iosBox.innerText = dev._iosCommandsLog;
        iosBox.scrollTop = iosBox.scrollHeight;
      }
    };

    // Attach tree navigation clicks
    document.querySelectorAll('#cfg-sidebar-tree .cfg-tree-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        dev._activeCfgView = view;
        if (view === 'interface') {
          dev._activeCfgIface = item.getAttribute('data-iface');
        }
        this.renderConfigTab(dev);
      });
    });

    // Handle Global Settings inputs & buttons
    const inDisplayName = document.getElementById('cfg-in-display-name');
    const inHostname = document.getElementById('cfg-in-hostname');

    if (inDisplayName) {
      inDisplayName.addEventListener('change', (e) => {
        dev.name = e.target.value.trim();
        this.modalTitle.innerText = `${dev.name} (${dev.model || dev.type.toUpperCase()})`;
        this.topology.emit('topology-changed');
      });
    }

    if (inHostname) {
      inHostname.addEventListener('change', (e) => {
        const oldName = dev.hostname || dev.name;
        const newName = e.target.value.trim();
        dev.hostname = newName;
        appendIosCmd(`${oldName}(config)#hostname ${newName}`);
        dev.name = newName;
        this.modalTitle.innerText = `${dev.name} (${dev.model || dev.type.toUpperCase()})`;
        this.topology.emit('topology-changed');
      });
    }

    // PC Global Settings Handlers
    const pcGw = document.getElementById('cfg-pc-gw');
    const pcDns = document.getElementById('cfg-pc-dns');
    const pcIfaceSel = document.getElementById('cfg-pc-iface-select');

    if (pcGw) {
      pcGw.addEventListener('change', (e) => {
        dev.gateway = e.target.value.trim();
        this.topology.emit('topology-changed');
      });
    }
    if (pcDns) {
      pcDns.addEventListener('change', (e) => {
        dev.dns = e.target.value.trim();
        this.topology.emit('topology-changed');
      });
    }
    if (pcIfaceSel) {
      pcIfaceSel.addEventListener('change', (e) => {
        dev._activeCfgView = 'interface';
        dev._activeCfgIface = e.target.value;
        this.renderConfigTab(dev);
      });
    }

    const radDhcp = document.getElementById('pc-ip4-dhcp');
    const radStatic = document.getElementById('pc-ip4-static');
    if (radDhcp && radStatic) {
      radDhcp.addEventListener('change', () => {
        if (radDhcp.checked) {
          dev.ipType = 'dhcp';
          dev.ip = '192.168.0.' + (Math.floor(Math.random() * 50) + 100);
          dev.mask = '255.255.255.0';
          dev.gateway = '192.168.0.1';
          dev.dns = '0.0.0.0';
          this.topology.emit('topology-changed');
          this.renderConfigTab(dev);
        }
      });
      radStatic.addEventListener('change', () => {
        if (radStatic.checked) {
          dev.ipType = 'static';
          this.topology.emit('topology-changed');
        }
      });
    }

    const btnNvramSave = document.getElementById('cfg-btn-nvram-save');
    if (btnNvramSave) {
      btnNvramSave.addEventListener('click', () => {
        appendIosCmd(`${dev.name}#copy running-config startup-config\nDestination filename [startup-config]?\nBuilding configuration...\n[OK]`);
      });
    }

    const btnNvramErase = document.getElementById('cfg-btn-nvram-erase');
    if (btnNvramErase) {
      btnNvramErase.addEventListener('click', () => {
        appendIosCmd(`${dev.name}#write erase\nErasing the nvram filesystem will remove all configuration files! Continue? [confirm]\n[OK]\nErase of nvram: complete`);
      });
    }

    // Handle Static Routes
    const btnRouteAdd = document.getElementById('cfg-btn-route-add');
    if (btnRouteAdd) {
      btnRouteAdd.addEventListener('click', () => {
        const net = (document.getElementById('cfg-static-net').value || '').trim();
        const mask = (document.getElementById('cfg-static-mask').value || '').trim();
        const hop = (document.getElementById('cfg-static-hop').value || '').trim();
        if (net && mask && hop) {
          dev.routingTable = dev.routingTable || [];
          dev.addRoute(net, mask, hop);
          appendIosCmd(`${dev.name}(config)#ip route ${net} ${mask} ${hop}`);
          this.topology.emit('topology-changed');
          this.renderConfigTab(dev);
        }
      });
    }

    const btnRouteDel = document.getElementById('cfg-btn-route-del');
    if (btnRouteDel) {
      btnRouteDel.addEventListener('click', () => {
        const net = (document.getElementById('cfg-static-net').value || '').trim();
        const hop = (document.getElementById('cfg-static-hop').value || '').trim();
        if (net && hop && dev.routingTable) {
          const idx = dev.routingTable.findIndex(r => r.destination === net && r.nextHop === hop);
          if (idx !== -1) {
            dev.routingTable.splice(idx, 1);
            appendIosCmd(`${dev.name}(config)#no ip route ${net} 255.255.255.0 ${hop}`);
            this.topology.emit('topology-changed');
            this.renderConfigTab(dev);
          }
        }
      });
    }

    // Handle RIP Routing
    const btnRipAdd = document.getElementById('cfg-btn-rip-add');
    if (btnRipAdd) {
      btnRipAdd.addEventListener('click', () => {
        const net = (document.getElementById('cfg-rip-net').value || '').trim();
        if (net) {
          dev.ripNetworks = dev.ripNetworks || [];
          if (!dev.ripNetworks.includes(net)) {
            dev.ripNetworks.push(net);
            appendIosCmd(`${dev.name}(config)#router rip\n${dev.name}(config-router)#network ${net}`);
            this.topology.emit('topology-changed');
            this.renderConfigTab(dev);
          }
        }
      });
    }

    const btnRipDel = document.getElementById('cfg-btn-rip-del');
    if (btnRipDel) {
      btnRipDel.addEventListener('click', () => {
        const net = (document.getElementById('cfg-rip-net').value || '').trim();
        if (net && dev.ripNetworks) {
          const idx = dev.ripNetworks.indexOf(net);
          if (idx !== -1) {
            dev.ripNetworks.splice(idx, 1);
            appendIosCmd(`${dev.name}(config)#router rip\n${dev.name}(config-router)#no network ${net}`);
            this.topology.emit('topology-changed');
            this.renderConfigTab(dev);
          }
        }
      });
    }

    // Handle VLANs
    const btnVlanAdd = document.getElementById('cfg-btn-vlan-add');
    if (btnVlanAdd) {
      btnVlanAdd.addEventListener('click', () => {
        const vId = parseInt(document.getElementById('cfg-vlan-id').value, 10);
        const vName = (document.getElementById('cfg-vlan-name').value || `VLAN${vId}`).trim();
        if (vId >= 1 && vId <= 4094) {
          dev.vlans = dev.vlans || [{ id: 1, name: 'default', status: 'active' }];
          let v = dev.vlans.find(x => x.id === vId);
          if (!v) {
            v = { id: vId, name: vName, status: 'active' };
            dev.vlans.push(v);
          } else {
            v.name = vName;
          }
          appendIosCmd(`${dev.name}(config)#vlan ${vId}\n${dev.name}(config-vlan)#name ${vName}`);
          this.topology.emit('topology-changed');
          this.renderConfigTab(dev);
        }
      });
    }

    // Handle Interface view controls
    const chkPower = document.getElementById('cfg-iface-power-chk');
    const inIfaceIp = document.getElementById('cfg-iface-ip-val');
    const inIfaceMask = document.getElementById('cfg-iface-mask-val');

    if (chkPower) {
      chkPower.addEventListener('change', (e) => {
        const iface = dev.getInterface(activeIfaceName);
        if (iface) {
          iface.isUp = e.target.checked;
          if (showIosBox) {
            appendIosCmd(`${dev.name}(config)#interface ${iface.name}\n${dev.name}(config-if)#${iface.isUp ? 'no shutdown' : 'shutdown'}`);
          }
          this.topology.emit('topology-changed');
        }
      });
    }

    if (inIfaceIp && inIfaceMask) {
      const saveIpChange = () => {
        const iface = dev.getInterface(activeIfaceName);
        if (iface) {
          const ipVal = inIfaceIp.value.trim();
          const maskVal = inIfaceMask.value.trim() || '255.255.255.0';
          if (ipVal !== iface.ip || maskVal !== iface.mask) {
            iface.ip = ipVal;
            iface.mask = maskVal;
            if (showIosBox) {
              if (ipVal) {
                appendIosCmd(`${dev.name}(config)#interface ${iface.name}\n${dev.name}(config-if)#ip address ${ipVal} ${maskVal}`);
              } else {
                appendIosCmd(`${dev.name}(config)#interface ${iface.name}\n${dev.name}(config-if)#no ip address`);
              }
            }
            this.topology.emit('topology-changed');
          }
        }
      };

      inIfaceIp.addEventListener('change', saveIpChange);
      inIfaceMask.addEventListener('change', saveIpChange);
    }
  }

  renderGUITab(dev) {
    dev._guiTab = dev._guiTab || 'setup';

    const renderContent = () => {
      let bodyHtml = '';
      if (dev._guiTab === 'setup') {
        bodyHtml = `
          <div class="linksys-sec-title">Internet Setup</div>
          <div class="linksys-row">
            <label>Internet Connection Type</label>
            <select class="linksys-input" id="gui-inet-type">
              <option value="DHCP" ${dev.internetType === 'DHCP' ? 'selected' : ''}>Automatic Configuration - DHCP</option>
              <option value="Static" ${dev.internetType === 'Static' ? 'selected' : ''}>Static IP</option>
            </select>
          </div>
          <div class="linksys-sec-title" style="margin-top: 14px;">Network Setup</div>
          <div class="linksys-row">
            <label>Router IP</label>
            <input type="text" class="linksys-input" id="gui-router-ip" value="${dev.routerIP || '192.168.0.1'}">
          </div>
          <div class="linksys-row">
            <label>Subnet Mask</label>
            <input type="text" class="linksys-input" id="gui-subnet-mask" value="${dev.subnetMask || '255.255.255.0'}">
          </div>
          <div class="linksys-row">
            <label>DHCP Server</label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="gui-dhcp" value="1" ${dev.dhcpEnabled !== false ? 'checked' : ''}> Enabled
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; margin-left: 15px;">
              <input type="radio" name="gui-dhcp" value="0" ${dev.dhcpEnabled === false ? 'checked' : ''}> Disabled
            </label>
          </div>
          <div class="linksys-row">
            <label>Start IP Address</label>
            <span>192.168.0. </span>
            <input type="number" class="linksys-input" style="width: 60px; margin-left: 4px;" id="gui-start-ip" value="${dev.dhcpStartIP || '100'}">
          </div>
          <div class="linksys-row">
            <label>Maximum Number of Users</label>
            <input type="number" class="linksys-input" style="width: 60px;" id="gui-max-users" value="${dev.dhcpMaxUsers || '50'}">
          </div>
          <div class="linksys-row">
            <label>Client Lease Time</label>
            <span>0 minutes (0 means 1 day)</span>
          </div>
          <div class="linksys-row">
            <label>Static DNS 1</label>
            <input type="text" class="linksys-input" value="0.0.0.0">
          </div>
        `;
      } else if (dev._guiTab === 'wireless') {
        bodyHtml = `
          <div class="linksys-sec-title">Basic Wireless Settings</div>
          <div class="linksys-row">
            <label>Network Mode</label>
            <select class="linksys-input">
              <option selected>Mixed</option>
              <option>Wireless-N Only</option>
              <option>Wireless-AC Only</option>
            </select>
          </div>
          <div class="linksys-row">
            <label>Network Name (SSID)</label>
            <input type="text" class="linksys-input" id="gui-ssid" value="${dev.ssid || 'Default'}">
          </div>
          <div class="linksys-row">
            <label>Radio Band</label>
            <select class="linksys-input">
              <option selected>Auto (20MHz or 40MHz)</option>
              <option>Standard - 20MHz channel</option>
            </select>
          </div>
          <div class="linksys-row">
            <label>Standard Channel</label>
            <select class="linksys-input" id="gui-channel">
              <option>1 - 2.412GHz</option>
              <option selected>6 - 2.437GHz</option>
              <option>11 - 2.462GHz</option>
            </select>
          </div>
          <div class="linksys-row">
            <label>SSID Broadcast</label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="radio" name="gui-bcast" checked> Enabled</label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; margin-left: 15px;"><input type="radio" name="gui-bcast"> Disabled</label>
          </div>
          <div class="linksys-sec-title" style="margin-top: 14px;">Wireless Security</div>
          <div class="linksys-row">
            <label>Security Mode</label>
            <select class="linksys-input" id="gui-sec-mode">
              <option value="Disabled">Disabled</option>
              <option value="WPA2-Personal" selected>WPA2 Personal</option>
            </select>
          </div>
          <div class="linksys-row">
            <label>Passphrase</label>
            <input type="text" class="linksys-input" id="gui-passphrase" value="${dev.passphrase || 'cisco123'}">
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="linksys-sec-title">${dev._guiTab.toUpperCase()} Settings</div>
          <div style="font-size: 11px; color: #475569; padding: 10px;">
            Status: Operational.<br>Firmware Version: v1.0.01 build 002 (Cisco Home Router Engine).
          </div>
        `;
      }

      this.modalContent.innerHTML = `
        <div class="linksys-gui-container">
          <div class="linksys-header">
            <div class="linksys-logo">CISCO</div>
            <div class="linksys-model-label">Wireless-AC Broadband Router (${dev.name})</div>
          </div>
          <div class="linksys-top-tabs">
            <button class="linksys-tab-btn ${dev._guiTab === 'setup' ? 'active' : ''}" data-gtab="setup">Setup</button>
            <button class="linksys-tab-btn ${dev._guiTab === 'wireless' ? 'active' : ''}" data-gtab="wireless">Wireless</button>
            <button class="linksys-tab-btn ${dev._guiTab === 'security' ? 'active' : ''}" data-gtab="security">Security</button>
            <button class="linksys-tab-btn ${dev._guiTab === 'apps' ? 'active' : ''}" data-gtab="apps">Applications & Gaming</button>
            <button class="linksys-tab-btn ${dev._guiTab === 'admin' ? 'active' : ''}" data-gtab="admin">Administration</button>
            <button class="linksys-tab-btn ${dev._guiTab === 'status' ? 'active' : ''}" data-gtab="status">Status</button>
          </div>
          <div class="linksys-sub-nav">
            <span class="active">Basic Setup</span>
            <span>DDNS</span>
            <span>MAC Address Clone</span>
            <span>Advanced Routing</span>
          </div>
          <div class="linksys-content-body">
            ${bodyHtml}
          </div>
          <div class="linksys-footer-bar">
            <button class="linksys-btn-save" id="btn-linksys-save">Save Settings</button>
            <button class="linksys-btn-cancel" id="btn-linksys-cancel">Cancel Changes</button>
          </div>
        </div>
      `;

      this.modalContent.querySelectorAll('.linksys-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          dev._guiTab = btn.getAttribute('data-gtab');
          renderContent();
        });
      });

      const btnSave = document.getElementById('btn-linksys-save');
      if (btnSave) {
        btnSave.addEventListener('click', () => {
          const rIp = document.getElementById('gui-router-ip');
          const sMask = document.getElementById('gui-subnet-mask');
          const ssid = document.getElementById('gui-ssid');
          const pass = document.getElementById('gui-passphrase');
          if (rIp) dev.routerIP = rIp.value.trim();
          if (sMask) dev.subnetMask = sMask.value.trim();
          if (ssid) dev.ssid = ssid.value.trim();
          if (pass) dev.passphrase = pass.value.trim();
          this.topology.emit('topology-changed');
          alert('Configuración del Router Inalámbrico guardada exitosamente.');
        });
      }

      const btnCancel = document.getElementById('btn-linksys-cancel');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          renderContent();
        });
      }
    };

    renderContent();
  }

  renderPhysicalTab(dev) {
    const isRouter = (dev.type === 'router');
    const isSwitch = (dev.type === 'switch');
    const isWireless = (dev.type === 'wireless_router');
    const isCloud = (dev.type === 'cloud');
    const isServer = (dev.type === 'server');

    if (isCloud) {
      // Screenshot 2: Cloud Physical Device View with Modules
      dev._activeCloudMod = dev._activeCloudMod || 'PT-CLOUD-NM-1AM';
      dev._cloudZoom = dev._cloudZoom || 1.0;

      const modulesList = [
        { id: 'PT-CLOUD-NM-1AM', thumb: 'assets/physical/gPTCloudNM-1AM.png', desc: 'The PT-CLOUD-NM-1AM card features dual RJ-11 connectors, which are used for basic telephone service connections. The WIC-1AM uses one port for connection to a standard telephone line, and the other port can be connected to a basic analog telephone for use when the modem is idle.' },
        { id: 'PT-CLOUD-NM-1CE', thumb: 'assets/physical/gPTCloudNM-1CE.png', desc: 'The PT-CLOUD-NM-1CE card provides one 10Base-T Ethernet connector for network cloud and LAN connectivity.' },
        { id: 'PT-CLOUD-NM-1CFE', thumb: 'assets/physical/gPTCloudNM-1CFE.png', desc: 'The PT-CLOUD-NM-1CFE card provides one 100Base-TX FastEthernet connector for multi-user broadband WAN connections.' },
        { id: 'PT-CLOUD-NM-1CGE', thumb: 'assets/physical/gPTCloudNM-1CGE.png', desc: 'The PT-CLOUD-NM-1CGE network module features one GigabitEthernet port for high-speed uplink to provider backbones.' },
        { id: 'PT-CLOUD-NM-1CX', thumb: 'assets/physical/gPTCloudNM-1CX.png', desc: 'The PT-CLOUD-NM-1CX card features a standard F-connector coaxial port for cable distribution networks.' },
        { id: 'PT-CLOUD-NM-1FFE', thumb: 'assets/physical/gPTCloudNM-1FFE.png', desc: 'The PT-CLOUD-NM-1FFE optical card provides one 100Base-FX FastEthernet optical transceiver port.' },
        { id: 'PT-CLOUD-NM-1FGE', thumb: 'assets/physical/gPTCloudNM-1FGE.png', desc: 'The PT-CLOUD-NM-1FGE optical card provides one 1000Base-SX Gigabit optical fiber transceiver port.' },
        { id: 'PT-CLOUD-NM-1S', thumb: 'assets/physical/gPTCloudNM-1S.png', desc: 'The PT-CLOUD-NM-1S card features one high-speed synchronous Serial WAN interface port for Frame Relay and Point-to-Point links.' }
      ];

      const curMod = modulesList.find(m => m.id === dev._activeCloudMod) || modulesList[0];

      this.modalContent.innerHTML = `
        <div class="cloud-modular-container">
          <div class="cloud-modules-sidebar">
            <div class="cloud-modules-header">MODULES</div>
            ${modulesList.map(m => `
              <div class="cloud-mod-item ${m.id === dev._activeCloudMod ? 'active' : ''}" data-mod-id="${m.id}">${m.id}</div>
            `).join('')}
          </div>
          <div class="cloud-main-display">
            <div class="cloud-zoom-bar">
              <button class="cloud-tool-btn" id="btn-cloud-zoom-in">Zoom In</button>
              <button class="cloud-tool-btn" id="btn-cloud-zoom-orig">Original Size</button>
              <button class="cloud-tool-btn" id="btn-cloud-zoom-out">Zoom Out</button>
            </div>
            <div class="cloud-chassis-stage">
              <img src="assets/physical/iPTRealCloud.png" alt="Cloud Chassis" class="cloud-chassis-img" id="cloud-chassis-img" style="transform: scale(${dev._cloudZoom});">
            </div>
            <div class="cloud-cust-icons-bar">
              <button class="cloud-cust-btn">
                <span>Customize Icon in Physical View</span>
                <img src="assets/logical/iCloud@2x.png" width="18" height="18">
              </button>
              <button class="cloud-cust-btn">
                <span>Customize Icon in Logical View</span>
                <img src="assets/logical/iCloud@2x.png" width="18" height="18">
              </button>
            </div>
            <div class="cloud-desc-box">
              <div style="flex: 1;">${curMod.desc}</div>
              <img src="${curMod.thumb}" alt="${curMod.id}" class="cloud-desc-thumb">
            </div>
          </div>
        </div>
      `;

      this.modalContent.querySelectorAll('.cloud-mod-item').forEach(item => {
        item.addEventListener('click', () => {
          dev._activeCloudMod = item.getAttribute('data-mod-id');
          this.renderPhysicalTab(dev);
        });
      });

      document.getElementById('btn-cloud-zoom-in').addEventListener('click', () => {
        dev._cloudZoom = Math.min(2.0, (dev._cloudZoom || 1.0) + 0.2);
        document.getElementById('cloud-chassis-img').style.transform = `scale(${dev._cloudZoom})`;
      });

      document.getElementById('btn-cloud-zoom-orig').addEventListener('click', () => {
        dev._cloudZoom = 1.0;
        document.getElementById('cloud-chassis-img').style.transform = `scale(1.0)`;
      });

      document.getElementById('btn-cloud-zoom-out').addEventListener('click', () => {
        dev._cloudZoom = Math.max(0.6, (dev._cloudZoom || 1.0) - 0.2);
        document.getElementById('cloud-chassis-img').style.transform = `scale(${dev._cloudZoom})`;
      });

      return;
    }

    let chassisImg = 'assets/physical/iRealRouter2911Back.png';
    if (isWireless) {
      chassisImg = 'assets/physical/iRealHomeRouter.png';
    } else if (isRouter) {
      chassisImg = (dev.model === '4331' || dev.model === '4321') 
        ? 'assets/physical/iRealRouter4331Back.png' 
        : 'assets/physical/iRealRouter2911Back.png';
    } else if (isSwitch) {
      chassisImg = (dev.model === '3560-24PS') 
        ? 'assets/physical/iRealSwitch3560Front.png' 
        : 'assets/physical/iRealSwitch2960_24TTFront.png';
    } else if (isServer) {
      chassisImg = dev.isPoweredOff ? 'assets/physical/PowerOffServer.png' : 'assets/physical/PowerOnServer.png';
    } else {
      chassisImg = 'assets/physical/iRealWorkstation.png';
    }

    const isOff = !!dev.isPoweredOff;

    let portBadgesHtml = '';
    dev.interfaces.forEach(i => {
      const isUp = (!isOff && i.isPhysicalUp);
      const isCable = i.connectedCable !== null;
      const statusText = isUp ? 'UP' : (isCable ? 'DOWN (Adm)' : 'NO CABLE');
      const ledClass = isUp ? 'up' : (isCable ? 'down' : '');
      const remoteInfo = i.connectedRemoteInterface ? ` -> ${i.connectedRemoteInterface.device.name}:${i.connectedRemoteInterface.name}` : '';

      portBadgesHtml += `
        <div class="chassis-port-badge" title="${i.name}${remoteInfo}">
          <div class="port-led-dot ${ledClass}"></div>
          <span>${i.name} [${statusText}]</span>
        </div>
      `;
    });

    this.modalContent.innerHTML = `
      <div class="chassis-container">
        <div class="chassis-image-box">
          <img src="${chassisImg}" alt="Hardware Chassis" class="chassis-image">
        </div>
        <div class="chassis-controls">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-weight:700; color:#e2e8f0;">POWER:</span>
            <div class="power-rocker-btn ${isOff ? 'off' : 'on'}" id="chassis-power-switch" title="Toggle Power">
              ${isOff ? 'OFF' : 'ON'}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="power-led-indicator ${isOff ? 'off' : 'on'}" id="chassis-power-led"></div>
            <span style="font-size:11px; color:#cbd5e1;">PWR LED</span>
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-left:10px;">
            Puertos: ${dev.interfaces.length} | Conectados: ${dev.interfaces.filter(i => i.connectedCable).length}
          </div>
        </div>
        <div class="chassis-port-badge-list">
          ${portBadgesHtml}
        </div>
      </div>
    `;

    document.getElementById('chassis-power-switch').addEventListener('click', () => {
      dev.isPoweredOff = !dev.isPoweredOff;
      if (!this.clis.has(dev.id)) {
        this.clis.set(dev.id, new CiscoIOSCLI(dev, this.topology));
      }
      const cli = this.clis.get(dev.id);

      if (dev.isPoweredOff) {
        dev._iosCommandsLog = (dev._iosCommandsLog || '') + `\n% System shut down. Power off.\n`;
      } else {
        dev._iosCommandsLog = (dev._iosCommandsLog || '') + cli.getBootOutput();
      }

      this.topology.emit('topology-changed');
      this.renderPhysicalTab(dev);
    });
  }

  renderProgrammingTab(dev) {
    dev._progCode = dev._progCode || `# Python IoT Device Controller\nfrom time import *\n\ndef setup():\n    print("[IoT] ${dev.name} initialized.")\n\ndef loop():\n    print("[IoT] Reading network telemetry: OK")\n    sleep(2)\n\nif __name__ == "__main__":\n    setup()\n    for i in range(3):\n        loop()\n    print("[IoT] Finished.")\n`;

    this.modalContent.innerHTML = `
      <div class="prog-editor-container">
        <div class="prog-editor-toolbar">
          <button class="prog-btn" id="btn-prog-run" style="background:#15803d; border-color:#22c55e;">▶ Run</button>
          <button class="prog-btn" id="btn-prog-stop">⏹ Stop</button>
          <button class="prog-btn" id="btn-prog-clear">Clear Output</button>
          <span style="font-size:11px; color:#94a3b8; margin-left:auto;">main.py (Python 3.8)</span>
        </div>
        <textarea class="prog-code-area" id="prog-code-in" spellcheck="false">${dev._progCode}</textarea>
        <div class="prog-output-area" id="prog-out-scroll">Ready. Click 'Run' to execute IoT script.</div>
      </div>
    `;

    const codeIn = document.getElementById('prog-code-in');
    const outScroll = document.getElementById('prog-out-scroll');

    codeIn.addEventListener('input', () => {
      dev._progCode = codeIn.value;
    });

    document.getElementById('btn-prog-run').addEventListener('click', () => {
      outScroll.innerText = `Starting execution of main.py on ${dev.name}...\n`;
      setTimeout(() => {
        outScroll.innerText += `[IoT] ${dev.name} initialized.\n[IoT] IP: ${dev.ip || '192.168.1.10'} | MAC: ${dev.mac}\n[IoT] Reading network telemetry: OK\n[IoT] Network packets sent: 12\n[IoT] Finished.\n>>> `;
        outScroll.scrollTop = outScroll.scrollHeight;
      }, 300);
    });

    document.getElementById('btn-prog-stop').addEventListener('click', () => {
      outScroll.innerText += `\n[Program stopped by user]\n>>> `;
      outScroll.scrollTop = outScroll.scrollHeight;
    });

    document.getElementById('btn-prog-clear').addEventListener('click', () => {
      outScroll.innerText = `Ready.`;
    });
  }

  renderAttributesTab(dev) {
    this.modalContent.innerHTML = `
      <div style="padding: 20px; font-size: 12px; color: #334155;">
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">${dev.name} Hardware Attributes</h4>
        <div style="display: grid; grid-template-columns: 160px 1fr; row-gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 4px;">
          <strong>Device Type:</strong> <span>${dev.type.toUpperCase()}</span>
          <strong>Model Number:</strong> <span>Cisco ${dev.model || 'Catalyst / ISR'}</span>
          <strong>MAC Address:</strong> <span style="font-family: monospace;">${dev.mac || (dev.interfaces[0] ? dev.interfaces[0].mac : 'N/A')}</span>
          <strong>Interfaces:</strong> <span>${dev.interfaces.length} ports configured</span>
          <strong>Power Consumption:</strong> <span>60 Watts (AC 100-240V)</span>
          <strong>MTBF:</strong> <span>180,000 hours</span>
          <strong>Physical Slot:</strong> <span>Rack 0, Shelf Unit 1</span>
        </div>
      </div>
    `;
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  window.ptApp = new AppController();
});
