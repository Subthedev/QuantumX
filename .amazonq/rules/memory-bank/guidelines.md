# Development Guidelines

## Code Quality Standards

### Formatting & Structure
- **TypeScript Strict Mode**: All code uses TypeScript with strict type checking enabled
- **Consistent Indentation**: 2-space indentation throughout the codebase
- **Line Length**: Generally kept under 120 characters for readability
- **File Organization**: Clear separation of concerns with dedicated sections marked by comment headers
- **Import Organization**: External imports first, then internal imports, grouped logically

### Naming Conventions
- **Classes**: PascalCase (e.g., `IGXDataEngineV4Enhanced`, `GlobalHubService`)
- **Interfaces/Types**: PascalCase (e.g., `ETFFlowData`, `HubMetrics`, `DataSource`)
- **Functions/Methods**: camelCase (e.g., `getETFFlows`, `processWebSocketData`, `updateTickerCache`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `CACHE_DURATION`, `CIRCUIT_BREAKER_THRESHOLD`, `MAX_HISTORY_SIZE`)
- **Private Members**: Prefixed with underscore (e.g., `_cacheKeys`, `_strategy`, `_sources`)
- **Boolean Variables**: Prefixed with `is`, `has`, `should` (e.g., `isRunning`, `hasCredits`, `shouldInclude`)

### Documentation Standards
- **File Headers**: Comprehensive documentation blocks at file start explaining purpose, architecture, and data types
- **Section Headers**: Clear ASCII art separators for major sections (e.g., `// ============================================================================`)
- **Inline Comments**: Descriptive comments for complex logic, especially in production-grade systems
- **TODO/FIXME**: Marked with emoji prefixes (e.g., `// ✅ CRITICAL:`, `// ⚠️ WARNING:`)
- **Console Logging**: Structured logging with prefixes (e.g., `[GlobalHub]`, `[Data Engine V4]`)

## Architectural Patterns

### Service Layer Pattern
- **Singleton Services**: Most services exported as singleton instances (e.g., `export const globalHubService = new GlobalHubService()`)
- **Service Initialization**: Services have explicit `start()` and `stop()` lifecycle methods
- **Service Communication**: Event-driven architecture using custom events and event emitters
- **State Management**: Services maintain internal state with getter methods for external access

### Event-Driven Architecture
- **Custom Events**: Extensive use of `window.dispatchEvent(new CustomEvent(...))` for cross-service communication
- **Event Emitters**: Custom `SimpleEventEmitter` class for service-level pub/sub
- **Event Types**: Strongly typed event names (e.g., `'metrics:update'`, `'signal:new'`, `'alpha-regime-update'`)
- **Event Payloads**: Detailed event data with timestamps and metadata

### Caching Strategy
- **Multi-Tier Caching**: L1 (hot cache), L2 (warm cache), L3 (cold cache) with different TTLs
- **Cache Keys**: Descriptive string keys with context (e.g., `flows-${startDate}-${endDate}-${assetClass}`)
- **Cache Invalidation**: Time-based expiration with configurable durations
- **Cache Validation**: Periodic consistency checks to detect stale or invalid data

### Error Handling
- **Try-Catch Blocks**: Comprehensive error handling with fallback strategies
- **Circuit Breaker Pattern**: Automatic failure detection and recovery for external services
- **Graceful Degradation**: Services continue operating with reduced functionality on errors
- **Error Logging**: Detailed error messages with context and stack traces

## Common Implementation Patterns

### Data Fetching Pattern
```typescript
// 1. Check cache first
const cached = this.cache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
  return cached.data;
}

// 2. Fetch fresh data
try {
  const data = await this.fetchData();
  this.cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
} catch (error) {
  console.error('Error fetching data:', error);
  return fallbackData;
}
```

### WebSocket Connection Pattern
```typescript
// 1. Create WebSocket connection
const ws = new WebSocket(url);

// 2. Set up event handlers
ws.onopen = () => {
  console.log('Connected');
  this.subscribe(ws);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  this.processData(data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  this.fallbackToREST();
};

ws.onclose = () => {
  console.log('Connection closed');
  this.reconnect();
};
```

### State Update Pattern
```typescript
// 1. Update internal state
this.state.metrics.totalSignals++;
this.state.metrics.lastUpdate = Date.now();

// 2. Persist to storage
this.saveMetrics();

// 3. Emit events for UI updates
this.emit('metrics:update', this.state.metrics);
this.emit('state:update', this.getState());
```

### Interval Management Pattern
```typescript
// 1. Store interval reference
private updateInterval: NodeJS.Timeout | null = null;

// 2. Start interval
this.updateInterval = setInterval(() => {
  this.updateStats();
}, UPDATE_INTERVAL);

// 3. Clean up on stop
if (this.updateInterval) {
  clearInterval(this.updateInterval);
  this.updateInterval = null;
}
```

## Internal API Usage

### Supabase Integration
```typescript
// Database queries
const { data, error } = await supabase
  .from('intelligence_signals')
  .select('*')
  .eq('status', 'ACTIVE')
  .order('created_at', { ascending: false })
  .limit(50);

// Database inserts
const { error } = await supabase
  .from('intelligence_signals')
  .insert({
    id: signal.id,
    symbol: signal.symbol,
    signal_type: signal.direction,
    confidence: signal.confidence,
    // ... other fields
  });

// Database updates
const { error } = await supabase
  .from('intelligence_signals')
  .update({
    status: 'SUCCESS',
    exit_price: exitPrice,
    completed_at: new Date().toISOString(),
  })
  .eq('id', signalId);
```

### React Query Integration
```typescript
// Query configuration
const { data, isLoading, error } = useQuery({
  queryKey: ['etf-flows', startDate, endDate],
  queryFn: () => etfDataService.getETFFlows(startDate, endDate),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchInterval: false,
  refetchOnWindowFocus: false,
  retry: 2
});
```

### LocalStorage Persistence
```typescript
// Save to localStorage
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

// Load from localStorage
const stored = localStorage.getItem(STORAGE_KEY);
const data = stored ? JSON.parse(stored) : defaultValue;

// Clear localStorage
localStorage.removeItem(STORAGE_KEY);
```

## Code Idioms

### Map Operations
```typescript
// Initialize with entries
const volumeDistribution = new Map<string, number>([
  ['binance', volume * 0.6],
  ['coinbase', volume * 0.4]
]);

// Iterate over entries
for (const [key, value] of this.cache.entries()) {
  // Process entry
}

// Filter map entries
const filtered = Array.from(this.sources.values()).filter(
  s => s.status === 'CONNECTED'
);
```

### Array Manipulation
```typescript
// Add to beginning
this.state.activeSignals.unshift(newSignal);

// Limit array size
if (this.state.activeSignals.length > 20) {
  this.state.activeSignals = this.state.activeSignals.slice(0, 20);
}

// Find and remove
const index = this.state.activeSignals.findIndex(s => s.id === signalId);
if (index !== -1) {
  this.state.activeSignals.splice(index, 1);
}
```

### Async/Await Patterns
```typescript
// Sequential async operations
const ticker = await this.fetchTicker(symbol);
const enrichedData = await dataEnrichmentService.enrichMarketData(ticker);
const signals = await multiStrategyEngine.analyzeWithAllStrategies(enrichedData);

// Parallel async operations
const [orderBook, fundingRate, sentiment] = await Promise.all([
  this.fetchOrderBookData(symbol),
  this.fetchFundingRateData(symbol),
  this.fetchSentimentData()
]);

// Error handling with async/await
try {
  const result = await this.riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return fallbackValue;
}
```

### Type Guards & Assertions
```typescript
// Type narrowing
if (typeof value === 'string') {
  return value.toUpperCase();
}

// Array type checking
if (Array.isArray(data)) {
  return data.map(item => processItem(item));
}

// Null/undefined checks
if (!ticker || ticker.price === 0) {
  console.warn('Invalid ticker data');
  return null;
}

// Optional chaining
const volume = ticker?.volume24h || 0;
const spread = orderbook?.spread ?? 0.001;
```

## Performance Optimizations

### Memory Management
- **Cache Cleanup**: Periodic removal of stale entries to prevent memory leaks
- **Map Size Limits**: Enforced maximum sizes for in-memory caches
- **Object Pooling**: Reuse of frequently created objects where applicable
- **Weak References**: Use of WeakMap for temporary associations

### Rate Limiting
- **Request Throttling**: Per-source rate limit tracking with automatic backoff
- **Batch Operations**: Grouping multiple operations to reduce API calls
- **Debouncing**: Delayed execution of frequent operations
- **Request Deduplication**: Prevention of concurrent duplicate requests

### Lazy Loading
- **On-Demand Initialization**: Services start only when needed
- **Conditional Imports**: Dynamic imports for large dependencies
- **Virtual Scrolling**: Rendering only visible items in large lists
- **Image Lazy Loading**: Deferred loading of images with IntersectionObserver

## Testing Considerations

### Mock Data Generation
- **Realistic Patterns**: Mock data follows real-world distributions and patterns
- **Time-Based Variation**: Data changes over time to simulate live markets
- **Edge Cases**: Mock data includes boundary conditions and error scenarios
- **Deterministic Randomness**: Seeded random generation for reproducible tests

### Logging & Debugging
- **Structured Logging**: Consistent log format with service prefixes
- **Log Levels**: Different verbosity levels (debug, info, warn, error)
- **Performance Metrics**: Timing information for critical operations
- **State Snapshots**: Periodic dumps of internal state for debugging

### Error Recovery
- **Automatic Retry**: Exponential backoff for transient failures
- **Fallback Strategies**: Alternative data sources when primary fails
- **Circuit Breakers**: Automatic service isolation on repeated failures
- **Health Checks**: Periodic validation of service health and connectivity
