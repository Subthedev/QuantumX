# IGX Control Center Guide

## 🎮 The Ultimate Developer Command Center

The **IGX Control Center** is your centralized remote control system for managing the entire IGX platform. Think of it as the "mission control" for all AI trading operations.

## 🌟 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              IGX CONTROL CENTER                      │
│         /igx-control (Developer Only)                │
│                                                       │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Arena Control  │  │  Hub Control    │          │
│  │  • Start/Stop   │  │  • Start/Stop   │          │
│  │  • Reset Data   │  │  • Clear Signals│          │
│  │  • Cache Mgmt   │  │  • Signal List  │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                       │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Database Tools │  │  Live Logs      │          │
│  │  • SQL Cleanup  │  │  • Real-time    │          │
│  │  • Reset Agents │  │  • Export       │          │
│  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
    ┌──────────────┐      ┌──────────────┐
    │    ARENA     │      │     HUB      │
    │  /arena      │      │  /intel-hub  │
    │              │      │              │
    │ User-facing  │      │ Premium      │
    │ AI Agents    │◄─────┤ Signals      │
    │ Trading Live │      │ Generation   │
    └──────────────┘      └──────────────┘
         │                        │
         └────────────┬───────────┘
                      ▼
              ┌──────────────┐
              │   SUPABASE   │
              │   Database   │
              └──────────────┘
```

## 🚀 Quick Start

### Access the Control Center

```
http://localhost:8080/igx-control
```

You'll need to be logged in (protected route).

### System Status Overview

The top section shows real-time status of:
- **Arena**: Running status, number of agents, last update time
- **Intelligence Hub**: Running status, active signals count, last signal time
- **Database**: Connection status, Supabase latency

Status indicators:
- 🟢 **GREEN** = System online and healthy
- 🔴 **RED** = System offline or error

## 🎯 Control Panels

### 1. Arena Controls Tab

#### Start Arena
- Initializes all 3 AI agents
- Connects to Supabase database
- Subscribes to Intelligence Hub signals
- Starts real-time P&L updates

#### Stop Arena
- Gracefully shuts down Arena service
- Unsubscribes from all events
- Clears interval timers

#### Reset Arena
- Clears local cache
- Restarts Arena service
- **Note**: Still needs SQL cleanup in Supabase

#### Clear Cache
- Removes `arena_agents_cache` from localStorage
- Forces fresh data load on next page visit

#### Open Arena
- Opens `/arena` page in new tab
- Quick access to user-facing Arena

#### Refresh Status
- Manually triggers status check
- Updates all system metrics

---

### 2. Intelligence Hub Controls Tab

#### Start Hub
- Starts signal generation system
- Analyzes 40+ cryptocurrencies
- Emits top 3 signals to Arena

#### Stop Hub
- Pauses signal generation
- Agents stop receiving new signals
- Current positions remain active

#### Clear & Restart
- Clears all active signals
- Restarts Hub with fresh analysis
- **Use this when signals seem stale**

#### Open Hub
- Opens `/intelligence-hub` in new tab
- View signals and analytics

#### List Signals
- Prints all active signals to Live Logs
- Shows symbol, direction, confidence

#### Refresh Status
- Updates Hub metrics
- Checks signal count

---

### 3. Database Tab

#### Run SQL Cleanup
- **⚠️ DESTRUCTIVE ACTION**
- Deletes all agent positions
- Deletes all trade history
- Resets balances to $10,000
- Sets all metrics to 0

**When to use:**
- Agents have stale data (like NEXUS showing $7,280)
- Need to start fresh testing
- Positions not updating properly

#### Open Supabase
- Opens Supabase dashboard
- For manual database queries
- View raw data

#### Test Connection
- Pings Supabase database
- Updates latency metrics

---

### 4. Live Logs Tab

Real-time system logs from:
- **[ARENA]** - Arena service events (orange)
- **[HUB]** - Intelligence Hub events (blue)
- **[SYSTEM]** - System-level events (purple)

Log levels:
- **INFO** - General information (gray)
- **SUCCESS** - Operation completed (green)
- **WARNING** - Important notice (yellow)
- **ERROR** - Something failed (red)

#### Auto-scroll
- Toggle ON/OFF
- When ON, logs auto-scroll to bottom
- When OFF, stays at current position

#### Clear Logs
- Removes all log entries
- Starts fresh

#### Export Logs
- Downloads logs as `.txt` file
- Useful for debugging or reporting issues

---

## ☢️ Nuclear Reset

**DANGER ZONE** - Red button in top-right corner

This performs a **complete system reset**:

1. Stops Arena and Hub
2. Clears ALL browser storage (localStorage + sessionStorage)
3. Runs SQL cleanup on database
4. Clears ALL caches
5. Restarts both systems
6. Refreshes page

**When to use:**
- Everything is broken
- Need completely fresh start
- Testing initial setup flow

**Warning**: This is **irreversible** and will reset all data.

---

## ⚡ Quick Actions (Bottom Section)

### Start All
- Starts Hub + Arena simultaneously
- One-click full system startup

### Stop All
- Stops Hub + Arena
- Emergency shutdown

### Refresh All
- Updates all system metrics
- Checks database connection
- Refreshes logs

### Export Logs
- Quick access to log download

---

## 🛠️ Common Workflows

### Fresh Start After Development

1. Click "☢️ Nuclear Reset"
2. Confirm the warning
3. System resets and page refreshes
4. All agents show $10,000, 0 trades

### Clear Stale Agent Data

**Option A - Full Reset:**
1. Go to Database tab
2. Click "Run SQL Cleanup"
3. Go to Arena tab
4. Click "Clear Cache"
5. Click "Reset Arena"

**Option B - Nuclear:**
1. Click "☢️ Nuclear Reset"

### Get Agents Trading

1. Go to Hub Controls
2. Click "Start Hub" (if not running)
3. Wait for signals (check status: "Active Signals: 3+")
4. Go to Arena Controls
5. Click "Start Arena" (if not running)
6. Agents will auto-trade top 3 signals
7. Watch Live Logs for activity

### Debug Signal Issues

1. Go to Hub Controls
2. Click "List Signals"
3. Check Live Logs for signal details
4. If signals look bad, click "Clear & Restart"
5. Monitor logs for new signal generation

### Check Why Cards Are "ANALYZING"

This means agents don't have trades yet. Either:

**Scenario A - Hub not running:**
1. Check Hub status (should be 🟢 ONLINE)
2. Check "Active Signals" count (should be 3+)
3. If offline, click "Start Hub"

**Scenario B - No signals yet:**
1. Hub is running but signals not generated
2. Wait 30-60 seconds for first cycle
3. Click "List Signals" to verify

**Scenario C - Agents not subscribed:**
1. Arena running but not receiving signals
2. Stop Arena
3. Start Arena (re-subscribes)

---

## 📊 Monitoring Best Practices

### System Health Indicators

**Healthy System:**
- Arena: 🟢 ONLINE, Agents: 3
- Hub: 🟢 ONLINE, Signals: 3+
- Database: 🟢 CONNECTED, Latency: <100ms

**Unhealthy System:**
- Arena: 🔴 OFFLINE or Agents: 0
- Hub: 🔴 OFFLINE or Signals: 0
- Database: 🔴 ERROR or Latency: >500ms

### Log Monitoring

Watch for these patterns:

**Good:**
```
[ARENA] ✅ Arena started successfully
[HUB] ✅ Intelligence Hub started
[HUB] 🎯 New signal: BTCUSDT LONG (85% confidence)
[ARENA] 📊 Fresh data: 3 agents
```

**Bad:**
```
[ARENA] ❌ Failed to initialize: Connection timeout
[HUB] ⚠️ No signals generated in last 5 minutes
[SYSTEM] ❌ Database connection failed
```

---

## 🎯 Three-Tier Architecture

### Tier 1: Arena (User Engagement)
**Purpose**: Entertainment, addiction, gamification
**Target**: Free users, viral growth
**Access**: `/arena` - Public (after signup)
**Features**:
- Live AI agents trading
- Real-time P&L updates
- Leaderboards
- Social sharing

### Tier 2: Intelligence Hub (Premium Signals)
**Purpose**: Premium trading signals, monetization
**Target**: Paying subscribers
**Access**: `/intelligence-hub` - Premium tier
**Features**:
- Top 3 trading signals
- Confidence scores
- Strategy details
- Real-time analysis

### Tier 3: Control Center (Developer Tools)
**Purpose**: System management, diagnostics
**Target**: Developers, admins
**Access**: `/igx-control` - Developer only
**Features**:
- Start/stop systems
- Reset data
- Live logs
- Database tools

---

## 🚨 Troubleshooting

### Cards Not Loading
1. Check Arena status (should be 🟢)
2. Check browser console for errors
3. Try "Reset Arena"
4. If still broken, "Nuclear Reset"

### Cards Stuck on "ANALYZING"
1. Check Hub status (should be 🟢)
2. Check "Active Signals" count
3. Click "List Signals" - should show 3+
4. If no signals, click "Clear & Restart"

### Stale Data (Old P&L)
1. Go to Database tab
2. Click "Run SQL Cleanup"
3. Clear Arena cache
4. Refresh page

### Database Latency High (>500ms)
1. Check internet connection
2. Test Supabase dashboard access
3. May be temporary - wait and refresh
4. Check Supabase status page

---

## 💡 Pro Tips

1. **Keep Logs Open**: Live Logs tab shows exactly what's happening in real-time
2. **Auto-scroll ON**: Easier to monitor live activity
3. **Export Logs**: Before Nuclear Reset, export logs for reference
4. **List Signals**: Before clearing, see what signals were active
5. **Start Hub First**: Always start Hub before Arena for smooth operation
6. **Monitor Status**: Check status every few minutes during development

---

## 🎮 Developer Workflow

### Morning Startup
1. Open `/igx-control`
2. Click "Start All"
3. Switch to Live Logs tab
4. Monitor initialization
5. Open `/arena` in another tab
6. Verify agents are trading

### Testing Changes
1. Stop All systems
2. Make code changes
3. Start All
4. Monitor logs for errors
5. Check Arena for visual updates

### End of Day
1. Export logs
2. Stop All systems (optional)
3. Review any error logs

---

## 🔐 Security Note

The IGX Control Center is a **ProtectedRoute** - requires authentication. However, all authenticated users can access it.

For production:
- Consider adding role-based access (admin only)
- Add IP whitelist
- Add audit logging
- Rate limit destructive actions

---

## 📝 Summary

The **IGX Control Center** gives you complete control over:
- ✅ Arena AI agents
- ✅ Intelligence Hub signals
- ✅ Database cleanup
- ✅ System diagnostics
- ✅ Real-time monitoring
- ✅ Quick emergency resets

It's the **mission control** for the entire IGX platform - keep it open during development for maximum efficiency!

**Access**: http://localhost:8080/igx-control

---

**Happy Trading! 🚀**
