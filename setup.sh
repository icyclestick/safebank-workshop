#!/bin/bash
# ============================================================
# Network Security Workshop — Lab Setup Script
# ============================================================
# Run this AFTER 'docker compose up -d' to connect your
# Kali machine to the same network as the lab containers.
# This gives you a Layer 2 presence on the lab network so
# you can sniff traffic, ARP spoof, and DNS spoof.
#
# Usage: sudo ./setup.sh
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║   Network Security Workshop — Lab Setup          ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[✗] Please run as root: sudo ./setup.sh${NC}"
    exit 1
fi

# Check if docker compose is running
if ! docker compose ps --status running 2>/dev/null | grep -q "lab-"; then
    echo -e "${RED}[✗] Lab containers are not running.${NC}"
    echo -e "    Run ${YELLOW}docker compose up -d${NC} first."
    exit 1
fi

# Find the Docker bridge interface for our lab network
NETWORK_ID=$(docker network ls --filter name=lab_net -q 2>/dev/null | head -1)
if [ -z "$NETWORK_ID" ]; then
    echo -e "${RED}[✗] Could not find lab_net network.${NC}"
    exit 1
fi

# The bridge interface name is br-<first 12 chars of network ID>
BRIDGE="br-${NETWORK_ID:0:12}"

# Verify the bridge exists
if ! ip link show "$BRIDGE" &>/dev/null; then
    echo -e "${RED}[✗] Bridge interface $BRIDGE not found.${NC}"
    echo -e "    Try: ip link show type bridge"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Found lab bridge: ${CYAN}$BRIDGE${NC}"

# Assign attacker IP to the bridge (10.0.0.10)
ATTACKER_IP="10.0.0.10"
if ip addr show "$BRIDGE" | grep -q "$ATTACKER_IP"; then
    echo -e "${YELLOW}[~]${NC} IP $ATTACKER_IP already assigned to $BRIDGE"
else
    ip addr add ${ATTACKER_IP}/24 dev "$BRIDGE" 2>/dev/null || true
    echo -e "${GREEN}[✓]${NC} Assigned ${CYAN}$ATTACKER_IP${NC} to $BRIDGE"
fi

# Enable IP forwarding (required for MitM/ARP spoofing)
sysctl -w net.ipv4.ip_forward=1 > /dev/null 2>&1
echo -e "${GREEN}[✓]${NC} IP forwarding enabled"

# Verify connectivity
echo ""
echo -e "${CYAN}[*] Testing connectivity...${NC}"
if ping -c 1 -W 2 10.0.0.20 &>/dev/null; then
    echo -e "${GREEN}[✓]${NC} Server (10.0.0.20) reachable"
else
    echo -e "${RED}[✗]${NC} Server (10.0.0.20) unreachable"
fi

if ping -c 1 -W 2 10.0.0.15 &>/dev/null; then
    echo -e "${GREEN}[✓]${NC} Victim (10.0.0.15) reachable"
else
    echo -e "${RED}[✗]${NC} Victim (10.0.0.15) unreachable"
fi

if ping -c 1 -W 2 10.0.0.30 &>/dev/null; then
    echo -e "${GREEN}[✓]${NC} DNS    (10.0.0.30) reachable"
else
    echo -e "${RED}[✗]${NC} DNS    (10.0.0.30) unreachable"
fi

# Print summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   LAB NETWORK READY                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Your IP (Attacker):${NC}  10.0.0.10"
echo -e "  ${CYAN}Victim:${NC}              10.0.0.15"
echo -e "  ${CYAN}Server:${NC}              10.0.0.20"
echo -e "  ${CYAN}DNS:${NC}                 10.0.0.30"
echo -e "  ${CYAN}Bridge Interface:${NC}    $BRIDGE"
echo ""
echo -e "  ${YELLOW}Quick start:${NC}"
echo -e "  Sniff traffic:    ${CYAN}tcpdump -i $BRIDGE -A host 10.0.0.15${NC}"
echo -e "  Test server:      ${CYAN}curl http://10.0.0.20/login${NC}"
echo -e "  DNS lookup:       ${CYAN}nslookup workshop.lab 10.0.0.30${NC}"
echo ""
