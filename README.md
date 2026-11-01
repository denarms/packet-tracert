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

1. **Topología Interactiva:**
   - Arrastre fluido de nodos con recálculo en tiempo real de cables y luces de enlace.
   - **Indicadores de Enlace Triangulares Reales:** Luces de enlace verdes triangulares que apuntan hacia el exterior en ambos extremos del cable cuando el puerto y la interfaz remota están activas y encendidas; rojas cuando están apagadas/shutdown.
   - Conexión interactiva con selector de puertos libres (`GigabitEthernet0/0`, `FastEthernet0/1`, `Serial0/0/0`, etc.).

2. **Cisco IOS CLI Auténtico:**
   - Banner oficial de Cisco IOS C2900 Software Release 15.1(4)M4.
   - Prompts de Cisco IOS: `Router>`, `Router#` (Privileged EXEC), `Router(config)#` (Global Config), `Router(config-if)#` (Interface Config).
   - Comandos compatibles:
     - `enable` / `disable`
     - `configure terminal` / `conf t`
     - `hostname <name>`
     - `interface <id>` (`int g0/0`, `interface FastEthernet0/1`, etc.)
     - `ip address <ip> <máscara>`
     - `no shutdown` / `shutdown`
     - `show ip interface brief`
     - `show ip route`
     - `show mac-address-table`
     - `show running-config`
     - `write memory` / `copy run start`
     - `ping <ip>`
     - Historial de comandos con flechas Arriba/Abajo y tecla Enter.

3. **Escritorio de Clientes (PC / Laptop):**
   - **IP Configuration:** Modificación de IPv4, Máscara de subred, Default Gateway y DNS Server.
   - **Command Prompt:** Terminal de comandos con `ipconfig`, `ping <ip>` (con animación de paquetes por los cables y reporte de bytes, tiempo, TTL y pérdida de paquetes), `cls` y `help`.

4. **Herramienta Simple PDU (Sobre de Ping rápido):**
   - Activa el cursor de sobre PDU. Haz clic en el dispositivo de origen y luego en el de destino.
   - Añade el paquete a la tabla inferior de PDUs con animación del sobre en vuelo sobre los cables y actualiza el estado a `Successful` o `Failed`.

---

## 🚀 Cómo Ejecutar

Desde la terminal en `c:\Users\denar\Documents\REA`:

```powershell
node cisco-packet-tracer-web/server.js
```

Abre en tu navegador web:
👉 **`http://localhost:3000`**

