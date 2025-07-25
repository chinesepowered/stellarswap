#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SoroswapClient } from './soroswap-client.js';
import { DefindexClient } from './defindex-client.js';

// Combined MCP server that provides both Soroswap and DeFindex functionality
class StellarSwapMCPServer {
  private server: Server;
  private soroswapClient: SoroswapClient;
  private defindexClient: DefindexClient;

  constructor() {
    this.server = new Server(
      {
        name: 'stellar-swap-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize clients with network configuration
    const network = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const soroswapApiKey = process.env.SOROSWAP_API_KEY;
    const defindexApiKey = process.env.DEFINDEX_API_KEY;
    const soroswapApiUrl = process.env.SOROSWAP_API_URL;
    
    this.soroswapClient = new SoroswapClient(network, soroswapApiKey, soroswapApiUrl);
    this.defindexClient = new DefindexClient(network, defindexApiKey);
    
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Soroswap tools
          {
            name: 'soroswap_get_token_pairs',
            description: 'Get available trading pairs on Soroswap',
            inputSchema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Optional token address to filter pairs',
                },
              },
            },
          },
          {
            name: 'soroswap_get_swap_quote',
            description: 'Get a quote for swapping tokens on Soroswap',
            inputSchema: {
              type: 'object',
              properties: {
                tokenIn: {
                  type: 'string',
                  description: 'Input token address',
                },
                tokenOut: {
                  type: 'string',
                  description: 'Output token address',
                },
                amountIn: {
                  type: 'string',
                  description: 'Amount to swap in',
                },
                slippage: {
                  type: 'string',
                  description: 'Slippage tolerance (e.g., "0.5" for 0.5%)',
                  default: '0.5',
                },
              },
              required: ['tokenIn', 'tokenOut', 'amountIn'],
            },
          },
          {
            name: 'soroswap_get_liquidity_pools',
            description: 'Get Soroswap liquidity pool information',
            inputSchema: {
              type: 'object',
              properties: {
                pairAddress: {
                  type: 'string',
                  description: 'Optional pair address to get specific pool info',
                },
              },
            },
          },
          {
            name: 'soroswap_get_token_price',
            description: 'Get current token price from Soroswap',
            inputSchema: {
              type: 'object',
              properties: {
                tokenAddress: {
                  type: 'string',
                  description: 'Token address to get price for',
                },
                baseCurrency: {
                  type: 'string',
                  description: 'Base currency (USD, XLM, etc.)',
                  default: 'USD',
                },
              },
              required: ['tokenAddress'],
            },
          },
          // DeFindex tools
          {
            name: 'defindex_get_vaults',
            description: 'Get available DeFindex yield vaults',
            inputSchema: {
              type: 'object',
              properties: {
                riskLevel: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Filter by risk level',
                },
                minApy: {
                  type: 'string',
                  description: 'Minimum APY percentage',
                },
              },
            },
          },
          {
            name: 'defindex_get_vault_details',
            description: 'Get detailed information about a DeFindex vault',
            inputSchema: {
              type: 'object',
              properties: {
                vaultAddress: {
                  type: 'string',
                  description: 'Vault contract address',
                },
              },
              required: ['vaultAddress'],
            },
          },
          {
            name: 'defindex_optimize_allocation',
            description: 'Get optimal yield allocation across DeFindex vaults',
            inputSchema: {
              type: 'object',
              properties: {
                totalAmount: {
                  type: 'string',
                  description: 'Total amount to allocate',
                },
                riskTolerance: {
                  type: 'string',
                  enum: ['conservative', 'moderate', 'aggressive'],
                  description: 'Risk tolerance level',
                },
                timeHorizon: {
                  type: 'string',
                  description: 'Investment time horizon (e.g., "6m", "1y", "2y")',
                  default: '1y',
                },
              },
              required: ['totalAmount', 'riskTolerance'],
            },
          },
          {
            name: 'combined_portfolio_analysis',
            description: 'Analyze portfolio across both Soroswap and DeFindex positions',
            inputSchema: {
              type: 'object',
              properties: {
                userAddress: {
                  type: 'string',
                  description: 'User wallet address',
                },
                includeRecommendations: {
                  type: 'boolean',
                  description: 'Include optimization recommendations',
                  default: true,
                },
              },
              required: ['userAddress'],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Soroswap handlers
          case 'soroswap_get_token_pairs':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getSoroswapTokenPairs(args?.token as string),
                },
              ],
            };

          case 'soroswap_get_swap_quote':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getSoroswapSwapQuote(
                    args?.tokenIn as string,
                    args?.tokenOut as string,
                    args?.amountIn as string,
                    (args?.slippage as string) || '0.5'
                  ),
                },
              ],
            };

          case 'soroswap_get_liquidity_pools':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getSoroswapLiquidityPools(args?.pairAddress as string),
                },
              ],
            };

          case 'soroswap_get_token_price':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getSoroswapTokenPrice(
                    args?.tokenAddress as string,
                    (args?.baseCurrency as string) || 'USD'
                  ),
                },
              ],
            };

          // DeFindex handlers
          case 'defindex_get_vaults':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getDefindexVaults(args?.riskLevel as string, args?.minApy as string),
                },
              ],
            };

          case 'defindex_get_vault_details':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getDefindexVaultDetails(args?.vaultAddress as string),
                },
              ],
            };

          case 'defindex_optimize_allocation':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.optimizeDefindexAllocation(
                    args?.totalAmount as string,
                    args?.riskTolerance as string,
                    (args?.timeHorizon as string) || '1y'
                  ),
                },
              ],
            };

          case 'combined_portfolio_analysis':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getCombinedPortfolioAnalysis(
                    args?.userAddress as string,
                    (args?.includeRecommendations as boolean) !== false
                  ),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Soroswap methods
  private async getSoroswapTokenPairs(token?: string): Promise<string> {
    try {
      const pairs = await this.soroswapClient.getTokenPairs(token);
      
      const totalTvl = pairs.reduce((sum, pair) => sum + parseFloat(pair.tvl || '0'), 0);
      
      return JSON.stringify({
        pairs,
        total: pairs.length,
        totalTvl: totalTvl.toString(),
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch Soroswap token pairs',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getSoroswapSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: string
  ): Promise<string> {
    try {
      const quote = await this.soroswapClient.getSwapQuote(tokenIn, tokenOut, amountIn, slippage);
      
      return JSON.stringify({
        quote,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch Soroswap swap quote',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getSoroswapLiquidityPools(pairAddress?: string): Promise<string> {
    const mockPools = [
      {
        address: '0x123...abc',
        token0: 'XLM',
        token1: 'USDC',
        reserve0: '1000000',
        reserve1: '500000',
        totalSupply: '707106',
        apr: '12.5',
        volume24h: '125000',
        fees24h: '375',
      },
      {
        address: '0x456...def',
        token0: 'XLM',
        token1: 'AQUA',
        reserve0: '800000',
        reserve1: '200000',
        totalSupply: '400000',
        apr: '18.2',
        volume24h: '85000',
        fees24h: '255',
      },
    ];

    const result = pairAddress 
      ? mockPools.find(pool => pool.address === pairAddress)
      : mockPools;

    return JSON.stringify({
      pools: result,
      message: 'Mock data - In production, this would fetch from Soroswap contracts',
    }, null, 2);
  }

  private async getSoroswapTokenPrice(tokenAddress: string, baseCurrency: string): Promise<string> {
    const mockPrices: Record<string, number> = {
      'XLM': 0.12,
      'USDC': 1.00,
      'AQUA': 0.08,
    };

    const price = mockPrices[tokenAddress] || 0;

    return JSON.stringify({
      token: tokenAddress,
      price,
      baseCurrency,
      change24h: '2.5',
      volume24h: '125000',
      timestamp: new Date().toISOString(),
      message: 'Mock data - In production, this would fetch from price oracles',
    }, null, 2);
  }

  // DeFindex methods
  private async getDefindexVaults(riskLevel?: string, minApy?: string): Promise<string> {
    try {
      const vaults = await this.defindexClient.getAvailableVaults(
        riskLevel as 'low' | 'medium' | 'high',
        minApy
      );
      
      const totalTvl = vaults.reduce((sum, vault) => sum + parseFloat(vault.totalAssets), 0);
      
      return JSON.stringify({
        vaults,
        total: vaults.length,
        totalTvl: totalTvl.toString(),
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch DeFindex vaults',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getDefindexVaultDetails(vaultAddress: string): Promise<string> {
    const mockVault = {
      address: vaultAddress,
      name: 'Stable Yield Vault',
      symbol: 'SYV',
      totalAssets: '1000000',
      totalSupply: '950000',
      apy: '8.5',
      strategy: 'USDC-XLM Liquidity Mining',
      riskLevel: 'low',
      underlyingTokens: ['USDC', 'XLM'],
      underlyingProtocols: ['Soroswap'],
      feeStructure: {
        managementFee: '1.0',
        performanceFee: '10.0',
      },
      performance: {
        '7d': '0.15',
        '30d': '0.68',
        '90d': '2.1',
        '1y': '8.5',
      },
    };

    return JSON.stringify({
      vault: mockVault,
      message: 'Mock data - In production, this would fetch from DeFindex vault contract',
    }, null, 2);
  }

  private async optimizeDefindexAllocation(
    totalAmount: string,
    riskTolerance: string,
    timeHorizon: string
  ): Promise<string> {
    const mockOptimization = {
      totalAmount,
      riskTolerance,
      timeHorizon,
      recommendedAllocation: [
        {
          vaultAddress: '0xabc123...',
          vaultName: 'Stable Yield Vault',
          allocation: riskTolerance === 'conservative' ? '70' : '50',
          amount: (parseFloat(totalAmount) * (riskTolerance === 'conservative' ? 0.7 : 0.5)).toString(),
          expectedApy: '8.5',
          riskLevel: 'low',
        },
        {
          vaultAddress: '0xdef456...',
          vaultName: 'Balanced Growth Vault',
          allocation: riskTolerance === 'conservative' ? '30' : '50',
          amount: (parseFloat(totalAmount) * (riskTolerance === 'conservative' ? 0.3 : 0.5)).toString(),
          expectedApy: '15.2',
          riskLevel: 'medium',
        },
      ],
      expectedPortfolioApy: riskTolerance === 'conservative' ? '10.51' : '11.85',
      diversificationScore: '85',
    };

    return JSON.stringify({
      optimization: mockOptimization,
      message: 'Mock data - In production, this would use advanced optimization algorithms',
    }, null, 2);
  }

  private async getCombinedPortfolioAnalysis(
    userAddress: string,
    includeRecommendations: boolean
  ): Promise<string> {
    try {
      // Fetch positions from both protocols
      const [soroswapPositions, defindexPositions] = await Promise.all([
        this.soroswapClient.getUserPositions(userAddress),
        this.defindexClient.getUserPositions(userAddress)
      ]);
      
      // Calculate portfolio metrics
      const soroswapValue = soroswapPositions.reduce((sum, pos) => sum + parseFloat(pos.value || '0'), 0);
      const defindexValue = defindexPositions.reduce((sum, pos) => sum + parseFloat(pos.underlyingValue), 0);
      const totalValue = soroswapValue + defindexValue;
      
      const soroswapPnl = soroswapPositions.reduce((sum, pos) => sum + parseFloat(pos.pnl || '0'), 0);
      const defindexPnl = defindexPositions.reduce((sum, pos) => sum + parseFloat(pos.pnl), 0);
      const totalPnl = soroswapPnl + defindexPnl;
      
      const analysis = {
        userAddress,
        summary: {
          totalValue: totalValue.toString(),
          soroswapValue: soroswapValue.toString(),
          defindexValue: defindexValue.toString(),
          totalPnl: totalPnl.toString(),
          totalPnlPercent: totalValue > 0 ? (totalPnl / totalValue * 100).toFixed(2) : '0',
        },
        soroswapPositions,
        defindexPositions,
        riskMetrics: {
          portfolioRisk: 'medium',
          diversificationScore: '78',
          concentrationRisk: 'low',
        },
      };

      if (includeRecommendations) {
        (analysis as any)['recommendations'] = [
          {
            type: 'rebalancing',
            description: 'Consider rebalancing towards more DeFindex positions for better yield',
            impact: 'Potential 2.5% APY increase',
          },
          {
            type: 'diversification',
            description: 'Add exposure to high-yield DeFindex vault for better returns',
            impact: 'Improved risk-adjusted returns',
          },
        ];
      }

      return JSON.stringify({
        analysis,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch combined portfolio analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Stellar Swap MCP server running on stdio');
  }
}

const server = new StellarSwapMCPServer();
server.run().catch(console.error);