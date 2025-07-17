# Stellar Swap MCP Server 🌟

A comprehensive Model Context Protocol (MCP) server providing seamless integration with Soroswap and DeFindex protocols on the Stellar blockchain. Built for the Stellar/Soroswap hackathon.

## 🚀 Features

### Soroswap Integration
- **Token Pair Discovery**: Find available trading pairs and their liquidity
- **Swap Quotes**: Get real-time swap quotes with slippage calculations
- **Liquidity Pool Data**: Access pool reserves, APR, and volume information
- **Token Pricing**: Fetch current token prices and 24h changes
- **User Position Management**: Track user liquidity positions

### DeFindex Integration
- **Yield Vault Discovery**: Browse available yield-generating vaults
- **Vault Analytics**: Detailed performance metrics and historical data
- **Portfolio Optimization**: AI-powered allocation recommendations
- **Risk Assessment**: Comprehensive risk analysis across positions
- **Yield Strategy Analysis**: Compare different yield farming strategies

### Combined Features
- **Unified Portfolio View**: Single interface for both protocols
- **Cross-Protocol Analytics**: Comprehensive position analysis
- **Optimization Recommendations**: Smart suggestions for yield maximization
- **Risk Management**: Portfolio-wide risk assessment

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd stellarswap

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## 🛠️ Usage

### Development Mode
```bash
pnpm dev
```

### Production Mode
```bash
pnpm start
```

### Individual Server Usage
```bash
# Run Soroswap server only
tsx src/soroswap-server.ts

# Run DeFindex server only
tsx src/defindex-server.ts

# Run combined server (recommended)
tsx src/index.ts
```

## 🔧 MCP Integration

Add this server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "stellar-swap": {
      "command": "node",
      "args": ["/path/to/stellarswap/dist/index.js"],
      "cwd": "/path/to/stellarswap"
    }
  }
}
```

## 🛠️ Available Tools

### Soroswap Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `soroswap_get_token_pairs` | Get available trading pairs | `token` (optional) |
| `soroswap_get_swap_quote` | Get swap quote with slippage | `tokenIn`, `tokenOut`, `amountIn`, `slippage` |
| `soroswap_get_liquidity_pools` | Get pool information | `pairAddress` (optional) |
| `soroswap_get_token_price` | Get token price data | `tokenAddress`, `baseCurrency` |

### DeFindex Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `defindex_get_vaults` | Get available yield vaults | `riskLevel`, `minApy` (optional) |
| `defindex_get_vault_details` | Get detailed vault information | `vaultAddress` |
| `defindex_optimize_allocation` | Get optimal allocation strategy | `totalAmount`, `riskTolerance`, `timeHorizon` |

### Combined Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `combined_portfolio_analysis` | Comprehensive portfolio analysis | `userAddress`, `includeRecommendations` |

## 📊 Example Usage

### Get Soroswap Trading Pairs
```typescript
// Get all available pairs
soroswap_get_token_pairs()

// Get pairs for specific token
soroswap_get_token_pairs({ token: "XLM" })
```

### Get Swap Quote
```typescript
soroswap_get_swap_quote({
  tokenIn: "XLM",
  tokenOut: "USDC",
  amountIn: "1000",
  slippage: "0.5"
})
```

### Optimize DeFindex Allocation
```typescript
defindex_optimize_allocation({
  totalAmount: "10000",
  riskTolerance: "moderate",
  timeHorizon: "1y"
})
```

### Combined Portfolio Analysis
```typescript
combined_portfolio_analysis({
  userAddress: "GABC123...",
  includeRecommendations: true
})
```

## 🔑 API Keys & Configuration

The server now integrates with real APIs and falls back to mock data when APIs are unavailable.

### API Integration Status
- **Soroswap API**: ✅ Integrated with `https://api.soroswap.finance` (with mock fallback)
- **DeFindex API**: ✅ Integrated with client SDK (with mock fallback)
- **Stellar Horizon**: ✅ Integrated for blockchain data access

### Configuration
Create a `.env` file in the root directory:
```env
# Network Configuration
STELLAR_NETWORK=testnet          # or mainnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# API Keys (Optional - will use mock data if not provided)
SOROSWAP_API_KEY=your_soroswap_api_key_here
DEFINDEX_API_KEY=your_defindex_api_key_here

# Development Settings
DEV_MODE=true
LOG_LEVEL=info
```

### Real Data Sources
- **Soroswap**: Uses official Soroswap API at `api.soroswap.finance` for quotes, pairs, and liquidity data
- **DeFindex**: Uses DeFindex SDK and Horizon API for vault data and positions
- **Stellar Horizon**: For account balances, transactions, and asset information
- **Fallback**: Comprehensive mock data when real APIs are unavailable

## 🏗️ Development

### Project Structure
```
src/
├── index.ts              # Combined MCP server
├── soroswap-server.ts    # Soroswap-specific server
└── defindex-server.ts    # DeFindex-specific server
```

### Adding New Tools
1. Define the tool in the `ListToolsRequestSchema` handler
2. Implement the tool logic in the `CallToolRequestSchema` handler
3. Add proper error handling and validation

### Real Data Integration
The implementation now includes real API integration with graceful fallbacks:

1. **Soroswap Integration**: 
   - Real API calls to `https://api.soroswap.finance`
   - Horizon API for liquidity pool data
   - Mock fallback when APIs are unavailable

2. **DeFindex Integration**:
   - SDK-based vault interactions
   - Horizon API for position tracking
   - Mock fallback for demonstration

3. **Error Handling**:
   - Comprehensive error handling with detailed messages
   - Graceful fallback to mock data
   - Network timeout and retry logic

## 🎯 Hackathon Features

This MCP server is designed specifically for the Stellar/Soroswap hackathon with:

- **Rapid Integration**: Easy setup with Claude Desktop
- **Comprehensive Coverage**: Both Soroswap and DeFindex functionality
- **Mock Data Ready**: Works immediately without API keys
- **Extensible Design**: Easy to add new protocols and features
- **Production Ready**: Structured for real API integration

## 🚀 Future Enhancements

- [ ] Real-time WebSocket connections for live data
- [ ] Advanced yield optimization algorithms
- [ ] Cross-chain bridge integration
- [ ] Enhanced risk analytics
- [ ] Historical performance tracking
- [ ] Multi-language support
- [ ] Advanced portfolio rebalancing

## 📝 License

MIT License - feel free to use this for your hackathon projects!

## 🤝 Contributing

This project was built for the Stellar/Soroswap hackathon. Feel free to fork and extend for your own use cases!

## 🎉 Hackathon Submission

Built with ❤️ for the Stellar/Soroswap hackathon. This MCP server demonstrates the power of combining multiple DeFi protocols into a unified, AI-accessible interface.

---

## ✨ Real Data Integration

This MCP server now includes **real API integration** with graceful fallbacks:

### 🔗 Live Data Sources
- **Soroswap API**: Real-time quotes, pairs, and liquidity data from `api.soroswap.finance`
- **DeFindex SDK**: Vault data and portfolio optimization using DeFindex SDK
- **Stellar Horizon**: Account balances, transactions, and asset information
- **Graceful Fallbacks**: Comprehensive mock data when APIs are unavailable

### 🛡️ Error Handling
- Detailed error messages with fallback information
- Network timeout handling (10 second default)
- Automatic retry logic with exponential backoff
- Comprehensive logging for debugging

### 📊 Data Quality
- Real-time price feeds from multiple sources
- Actual liquidity pool data from Stellar blockchain
- Live vault performance metrics
- User position tracking across protocols

**Ready for real demo with live data! 🚀**

---

**Happy Hacking! 🌟**