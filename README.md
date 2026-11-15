# Cisco Packet Tracer - Web Edition Clone

Una réplica web de alta fidelidad de **Cisco Packet Tracer 8.2.2**, utilizando los recursos gráficos y visuales oficiales extraídos de la instalación real del sistema.

---

## 🎨 Fidelidad Visual y Gráfica

- **Assets Oficiales Cisco Packet Tracer:**
  - Más de 370 iconos oficiales SVG y PNG extraídos de la instalación real de Cisco Packet Tracer en Windows (`art/ComponentBox`, `art/Toolbar`, `art/Workspace/Logical`, `art/Workstation`, etc.).
  - Íconos de chasis lógicos de dispositivos (`iRouter@2x.png`, `iSwitch@2x.png`, `iWorkstation@2x.png`, `iLaptop@2x.png`, `iServer@2x.png`, `iPrinter@2x.png`).
  - Barra de categorías de dos niveles (`group0` a `group5` con selector de subcategorías: Routers, Switches, Wireless, Security, End Devices, Connections).
  - Íconos de escritorio originales para estaciones de trabajo (`ipconfig.png`, `cmdprompt.png`, `browser.png`, `IPv4Firewall.png`).
  - Barra de herramientas superior flotante clásica de Packet Tracer (Select, Inspect, Delete, Place Note, Simple PDU, Complex PDU).

---

## ⚡ Capacidades de Simulación

El motor (`js/engine.js`) simula la red salto a salto; nada de la salida está "precocinada":

- **Capa 1:** compatibilidad de cables como en PT (directo vs. cruzado, serie DCE/DTE, consola), estado administrativo y encendido. Un cable incorrecto deja el enlace en rojo.
- **Capa 2:** ARP real (el primer ping entre subredes pierde un paquete, como en PT), aprendizaje de MAC en switches, **VLANs** (access / trunk 802.1Q, native y allowed VLANs), SVIs y hubs.
- **Capa 3:** rutas conectadas, estáticas (incl. ruta por defecto y AD), **RIP** y **OSPF** (Dijkstra con coste por ancho de banda, passive-interface, default-information originate), coincidencia de prefijo más largo, TTL, ICMP unreachable / time-exceeded, **router-on-a-stick** (subinterfaces dot1Q), loopbacks y **ACLs** numeradas estándar/extendidas.
- **DHCP:** pools en el router (`ip dhcp pool`, `excluded-address`), servicio DHCP del Server (pestaña *Services*), Home Router y relay con `ip helper-address`. Si falla, el PC usa APIPA como en PT.

### Equipos
- **Routers:** ISR 4331, ISR 4321, 1941, 2901, 2911, 1841, 2811, 2620XM, 2621XM, Router-PT (cada uno con sus puertos reales, p. ej. `Gi0/0/0` en los ISR 4000).
- **Switches:** Catalyst 2960-24TT, **3560-24PS y 3650-24PS multicapa** (`ip routing`, SVIs, `no switchport`, OSPF/RIP/DHCP/ACL; el 3560 exige `switchport trunk encapsulation dot1q` antes de `mode trunk`, como el real), IE-2000, 2950, Switch-PT, hubs y APs.

### Cisco IOS CLI (`js/ios-cli.js`)
Parser basado en gramática: abreviaturas (`sh ip int br`), ayuda `?`, Tab, `% Invalid input detected at '^' marker.`, `% Ambiguous command`, `% Incomplete command.`, `Translating "..."...domain server`, `do`, `interface range`, retorno automático a modo global, mensajes `%LINK-5-CHANGED` / `%OSPF-5-ADJCHG` / `%SYS-5-CONFIG_I`.
Incluye `enable secret`, `line console/vty` con `password`/`login [local]`, `username`, `banner motd`, `service password-encryption`, `copy run start` / `write`, `erase startup-config`, `reload` (vuelve a la startup-config; las VLAN persisten en vlan.dat) y `show running-config | startup-config | ip route | ip protocols | ip ospf neighbor | ip dhcp binding | access-lists | vlan brief | interfaces [trunk] | mac address-table | arp | cdp neighbors | version`. Ver *Help → Supported IOS / PC Commands*.

### PC
- **Command Prompt:** `ipconfig [/all|/release|/renew]`, `ping [-n N] [-t]`, `tracert`, `arp -a|-d`, `telnet` (sesión VTY real contra el router/switch).
- **Terminal:** consola RS-232 → puerto Console del router/switch con cable de consola.
- **IP Configuration:** estática o DHCP real.

### Interfaz
- Menús *File/Edit/Options/View/Tools/Help*, **Guardar/Abrir** topologías (`.ptw`, Ctrl+S / Ctrl+O), autoguardado local y laboratorios de ejemplo (VLAN + Router-on-a-Stick + DHCP, OSPF con 3 routers).
- **Modo Simulación** con *Event List*, Play / Capture-Forward, filtros ARP/ICMP/DHCP y ventana *PDU Information* por capas OSI.
- Herramienta **Inspect** (ARP, MAC, Routing, ACL, Port Status), tooltip de puertos al pasar el ratón, etiquetas de puertos, cable *Automatic* que elige puertos y tipo.

---

## 🚀 Cómo Ejecutar

Desde la terminal en `c:\Users\denar\Documents\REA`:

```powershell
node cisco-packet-tracer-web/server.js
```

Abre en tu navegador web:
👉 **`http://localhost:3000`**

